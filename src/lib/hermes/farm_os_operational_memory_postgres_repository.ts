import { Pool, type PoolClient, type PoolConfig } from "pg";
import { isDeepStrictEqual } from "node:util";

import {
  parseFarmOsStableChangesPage,
  type FarmOsOperationalMemoryFailureCode,
} from "./farm_os_operational_memory_contract";
import type {
  FarmOsDailyProjectionContent,
  FarmOsSnapshotStateEvent,
  FarmOsSourceSnapshot,
} from "./farm_os_operational_memory_compiler";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  type FarmOsDailyProjection,
  type FarmOsOperationalMemoryIngestionResult,
  type FarmOsOperationalMemoryRejection,
  type FarmOsOperationalMemoryState,
  type FarmOsProjectionLineage,
  type FarmOsProjectionStateEvent,
} from "./farm_os_operational_memory_persistence";
import {
  canonicalJson,
  sha256Prefixed,
  validateFarmOsProjectionCommandResultPayload,
  type FarmOsProjectionCommandReceiptRecord,
  type FarmOsProjectionReviewDecisionRecord,
} from "./farm_os_projection_review_command_contract";
import type {
  FarmOsProjectionCommandRepositoryResult,
  FarmOsProjectionCommandRepositoryState,
} from "./farm_os_projection_promotion_service";

const LOCK_KEY = "farmos_operational_memory_v1";
const BEGIN_SQL = "begin isolation level read committed read write";
const LOCK_SQL = "select pg_advisory_xact_lock(hashtext($1::text))";
const BUNDLE_SQL =
  "select ai.persist_operational_memory_bundle($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb) as result";
const COMMAND_WRITER_SQL =
  "select ai.persist_operational_memory_projection_command($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb) as result";
const COMMAND_ROLE_SQL =
  "set local role farmos_core_projection_command_transaction";

export const FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES = [
  "pool_connect",
  "transaction_begin",
  "statement_timeout",
  "lock_timeout",
  "set_local_role",
  "advisory_lock",
  "receipt_lookup",
  "receipt_replay_validation",
  "state_read",
  "build_plan",
  "plan_identity_validation",
  "writer_call",
  "writer_result_validation",
  "receipt_readback",
  "state_readback",
  "exact_readback_validation",
  "deferred_constraint_probe",
  "transaction_commit",
  "transaction_rollback",
  "client_release",
] as const;

export type FarmOsProjectionCommandTransactionSubstage =
  typeof FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES[number];

export type FarmOsProjectionCommandTransactionObserver = (
  substage: FarmOsProjectionCommandTransactionSubstage,
) => void;

export type FarmOsProjectionCommandCommitDatabaseErrorClass =
  | "INTEGRITY_CONSTRAINT_ERROR"
  | "PLPGSQL_RAISED_ERROR"
  | "SYNTAX_OR_CATALOG_ERROR"
  | "INVALID_TRANSACTION_STATE"
  | "RESOURCE_OR_CONNECTION_ERROR"
  | "OTHER_DATABASE_ERROR";

export type FarmOsProjectionCommandResourceConnectionSubcategory =
  | "CONNECTION_EXCEPTION"
  | "INSUFFICIENT_RESOURCES"
  | "PROGRAM_LIMIT_EXCEEDED"
  | "LOCK_NOT_AVAILABLE"
  | "OBJECT_NOT_IN_PREREQUISITE_STATE"
  | "OBJECT_IN_USE"
  | "CANT_CHANGE_RUNTIME_PARAM"
  | "UNSAFE_NEW_ENUM_VALUE_USAGE"
  | "OTHER_OBJECT_STATE_ERROR"
  | "QUERY_CANCELED"
  | "ADMIN_OR_CRASH_SHUTDOWN"
  | "SYSTEM_ERROR"
  | "OTHER_RESOURCE_OR_CONNECTION_ERROR";

export type FarmOsProjectionCommandDeferredCheckIdentifier =
  | "RECEIPT_REVIEW_FK"
  | "REVIEW_RECEIPT_FK"
  | "RECEIPT_BINDING_TRIGGER"
  | "EVENT_RECEIPT_REQUIRED_TRIGGER"
  | "OTHER_INTEGRITY_CONSTRAINT";

export type FarmOsProjectionCommandCommitFailureDiagnostic = Readonly<{
  database_error_class: FarmOsProjectionCommandCommitDatabaseErrorClass;
  resource_connection_subcategory:
    FarmOsProjectionCommandResourceConnectionSubcategory | null;
  deferred_check_identifier:
    FarmOsProjectionCommandDeferredCheckIdentifier | null;
}>;

export type FarmOsProjectionCommandCommitFailureObserver = (
  diagnostic: FarmOsProjectionCommandCommitFailureDiagnostic,
) => void;

export const FARM_OS_PROJECTION_COMMAND_DEFERRED_PROBE_IDENTIFIERS = [
  "RECEIPT_REVIEW_FK_PROBE",
  "RECEIPT_BINDING_TRIGGER_PROBE",
  "EVENT_RECEIPT_REQUIRED_TRIGGER_PROBE",
  "FINAL_COMMIT_AFTER_ALL_PROBES",
] as const;

export type FarmOsProjectionCommandDeferredProbeIdentifier =
  typeof FARM_OS_PROJECTION_COMMAND_DEFERRED_PROBE_IDENTIFIERS[number];

export type FarmOsProjectionCommandDeferredProbeDiagnostic = Readonly<{
  probe_identifier: FarmOsProjectionCommandDeferredProbeIdentifier;
  database_error_class: FarmOsProjectionCommandCommitDatabaseErrorClass;
  resource_connection_subcategory:
    FarmOsProjectionCommandResourceConnectionSubcategory | null;
  deferred_check_identifier:
    FarmOsProjectionCommandDeferredCheckIdentifier | null;
}>;

export type FarmOsProjectionCommandDeferredProbeObserver = (
  diagnostic: FarmOsProjectionCommandDeferredProbeDiagnostic,
) => void;

export type FarmOsProjectionCommandDeferredProbeOptions = Readonly<{
  enabled: true;
  observer?: FarmOsProjectionCommandDeferredProbeObserver;
}>;

const DEFERRED_PROBES = Object.freeze([
  Object.freeze({
    identifier: "RECEIPT_REVIEW_FK_PROBE" as const,
    statement: `SET CONSTRAINTS
  ai.operational_memory_projection_command_receipts_review_fkey
IMMEDIATE`,
  }),
  Object.freeze({
    identifier: "RECEIPT_BINDING_TRIGGER_PROBE" as const,
    statement: `SET CONSTRAINTS
  ai.operational_memory_projection_command_receipt_binding_guard
IMMEDIATE`,
  }),
  Object.freeze({
    identifier: "EVENT_RECEIPT_REQUIRED_TRIGGER_PROBE" as const,
    statement: `SET CONSTRAINTS
  ai.operational_memory_projection_command_receipt_required
IMMEDIATE`,
  }),
]);

const RECEIPT_REVIEW_FK =
  "operational_memory_projection_command_receipts_review_fkey";
const REVIEW_RECEIPT_FK =
  "operational_memory_projection_review_decisions_receipt_fkey";
const RECEIPT_BINDING_TRIGGER_MESSAGES = new Set([
  "operational_memory_projection_receipt_event_binding_invalid",
  "operational_memory_projection_receipt_event_already_claimed",
  "operational_memory_projection_receipt_review_missing",
  "operational_memory_projection_receipt_review_stale",
  "operational_memory_projection_receipt_rejection_invalid",
  "operational_memory_projection_receipt_review_invalid",
  "operational_memory_projection_receipt_promotion_invalid",
  "operational_memory_projection_receipt_rebuild_invalid",
  "operational_memory_projection_receipt_command_invalid",
  "operational_memory_projection_receipt_payload_binding_invalid",
]);
const EVENT_RECEIPT_REQUIRED_TRIGGER_MESSAGE =
  "operational_memory_projection_command_receipt_required";

function readDatabaseErrorString(error: unknown, field: string): string | null {
  if (typeof error !== "object" || error === null) return null;
  try {
    const value = (error as Record<string, unknown>)[field];
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export function classifyFarmOsProjectionCommandCommitDatabaseError(
  error: unknown,
): FarmOsProjectionCommandCommitFailureDiagnostic {
  const code = readDatabaseErrorString(error, "code");
  const validCode = code !== null && /^[0-9A-Z]{5}$/.test(code) ? code : null;
  const sqlstateClass = validCode?.slice(0, 2) ?? null;
  const databaseErrorClass: FarmOsProjectionCommandCommitDatabaseErrorClass =
    sqlstateClass === "23"
      ? "INTEGRITY_CONSTRAINT_ERROR"
      : sqlstateClass === "P0"
      ? "PLPGSQL_RAISED_ERROR"
      : sqlstateClass === "42"
      ? "SYNTAX_OR_CATALOG_ERROR"
      : sqlstateClass === "25" || sqlstateClass === "40"
      ? "INVALID_TRANSACTION_STATE"
      : sqlstateClass !== null && [
        "08", "53", "54", "55", "57", "58",
      ].includes(sqlstateClass)
      ? "RESOURCE_OR_CONNECTION_ERROR"
      : "OTHER_DATABASE_ERROR";
  const resourceConnectionSubcategory:
    FarmOsProjectionCommandResourceConnectionSubcategory | null =
      databaseErrorClass !== "RESOURCE_OR_CONNECTION_ERROR"
        ? null
        : sqlstateClass === "08"
        ? "CONNECTION_EXCEPTION"
        : sqlstateClass === "53"
        ? "INSUFFICIENT_RESOURCES"
        : sqlstateClass === "54"
        ? "PROGRAM_LIMIT_EXCEEDED"
        : validCode === "55000"
        ? "OBJECT_NOT_IN_PREREQUISITE_STATE"
        : validCode === "55006"
        ? "OBJECT_IN_USE"
        : validCode === "55P02"
        ? "CANT_CHANGE_RUNTIME_PARAM"
        : validCode === "55P03"
        ? "LOCK_NOT_AVAILABLE"
        : validCode === "55P04"
        ? "UNSAFE_NEW_ENUM_VALUE_USAGE"
        : sqlstateClass === "55"
        ? "OTHER_OBJECT_STATE_ERROR"
        : validCode === "57014"
        ? "QUERY_CANCELED"
        : sqlstateClass === "57"
        ? "ADMIN_OR_CRASH_SHUTDOWN"
        : sqlstateClass === "58"
        ? "SYSTEM_ERROR"
        : "OTHER_RESOURCE_OR_CONNECTION_ERROR";

  let deferredCheckIdentifier:
    FarmOsProjectionCommandDeferredCheckIdentifier | null = null;
  if (databaseErrorClass === "INTEGRITY_CONSTRAINT_ERROR" ||
    databaseErrorClass === "PLPGSQL_RAISED_ERROR") {
    const constraint = readDatabaseErrorString(error, "constraint");
    const message = readDatabaseErrorString(error, "message");
    deferredCheckIdentifier = constraint === RECEIPT_REVIEW_FK
      ? "RECEIPT_REVIEW_FK"
      : constraint === REVIEW_RECEIPT_FK
      ? "REVIEW_RECEIPT_FK"
      : message !== null && RECEIPT_BINDING_TRIGGER_MESSAGES.has(message)
      ? "RECEIPT_BINDING_TRIGGER"
      : message === EVENT_RECEIPT_REQUIRED_TRIGGER_MESSAGE
      ? "EVENT_RECEIPT_REQUIRED_TRIGGER"
      : databaseErrorClass === "INTEGRITY_CONSTRAINT_ERROR"
      ? "OTHER_INTEGRITY_CONSTRAINT"
      : null;
  }
  return Object.freeze({
    database_error_class: databaseErrorClass,
    resource_connection_subcategory: resourceConnectionSubcategory,
    deferred_check_identifier: deferredCheckIdentifier,
  });
}

export function notifyFarmOsProjectionCommandTransactionObserver(
  observer: FarmOsProjectionCommandTransactionObserver | undefined,
  substage: FarmOsProjectionCommandTransactionSubstage,
): void {
  try {
    observer?.(substage);
  } catch {
    // Diagnostic observers cannot change command or transaction semantics.
  }
}

export function notifyFarmOsProjectionCommandCommitFailureObserver(
  observer: FarmOsProjectionCommandCommitFailureObserver | undefined,
  diagnostic: FarmOsProjectionCommandCommitFailureDiagnostic,
): void {
  try {
    observer?.(diagnostic);
  } catch {
    // Diagnostic observers cannot change command or transaction semantics.
  }
}

export function notifyFarmOsProjectionCommandDeferredProbeObserver(
  observer: FarmOsProjectionCommandDeferredProbeObserver | undefined,
  diagnostic: FarmOsProjectionCommandDeferredProbeDiagnostic,
): void {
  try {
    observer?.(diagnostic);
  } catch {
    // Diagnostic observers cannot change command or transaction semantics.
  }
}

export const FARM_OS_OPERATIONAL_MEMORY_POSTGRES_RUNTIME_SCOPE = Object.freeze({
  historical_backfill: {
    implemented: false,
    new_stable_changes_supported: true,
    verified_history_excluded: true,
    future_rebuild_from_retained_snapshots: true,
  },
  human_correction: {
    overwrite_prohibited_by_contract: true,
    persistence_store_implemented: false,
    future_overlay_hook: "reserved_not_connected",
  },
});

type PostgresRepositoryPool = {
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
};

type SnapshotRow = Omit<
  FarmOsSourceSnapshot,
  | "business_date"
  | "recorded_at"
  | "source_updated_at"
  | "deleted_at"
  | "observed_at"
  | "ingestion_sequence"
> & {
  business_date: string;
  recorded_at: Date | string | null;
  source_updated_at: Date | string;
  deleted_at: Date | string | null;
  observed_at: Date | string;
  ingestion_sequence: string | number;
};

type SnapshotEventRow = Omit<
  FarmOsSnapshotStateEvent,
  "sequence" | "occurred_at"
> & {
  sequence: string | number;
  occurred_at: Date | string;
};

type ProjectionRow = Omit<
  FarmOsDailyProjection,
  "content" | "generated_at"
> & {
  projection_content: FarmOsDailyProjectionContent;
  generated_at: Date | string;
};

type ProjectionEventRow = Omit<
  FarmOsProjectionStateEvent,
  "sequence" | "occurred_at"
> & {
  sequence: string | number;
  occurred_at: Date | string;
};

type RejectionRow = Omit<FarmOsOperationalMemoryRejection, "observed_at"> & {
  observed_at: Date | string;
};

type ReviewDecisionRow = Omit<
  FarmOsProjectionReviewDecisionRecord,
  "reviewed_at"
> & { reviewed_at: Date | string };

type CommandReceiptRow = Omit<
  FarmOsProjectionCommandReceiptRecord,
  "requested_at" | "committed_at" | "result_payload"
> & {
  requested_at: Date | string;
  committed_at: Date | string;
  result_payload: unknown;
};

export type FarmOsOperationalMemoryPostgresIngestionResult =
  FarmOsOperationalMemoryIngestionResult & {
    postgres_persistence: {
      transaction_committed: boolean;
      core_persistence_write_performed: boolean;
      farming_app_write_performed: false;
    };
  };

const READ_SNAPSHOTS_SQL = `
select snapshot_id, contract_version, source_system, source_record_id,
  source_record_version, source_content_hash, operation,
  business_date::text as business_date, recorded_at, source_updated_at,
  deleted_at, field_reference, crop_cycle_reference, work_type_reference,
  safe_payload, observed_at, ingestion_sequence, initial_state,
  supersedes_snapshot_id, rejection_code
from ai.operational_memory_source_snapshots
order by ingestion_sequence
`;
const READ_SNAPSHOT_EVENTS_SQL = `
select event_id, snapshot_id, state, event_sequence as sequence, occurred_at
from ai.operational_memory_snapshot_state_events
order by event_sequence
`;
const READ_PROJECTIONS_SQL = `
select projection_id, projection_type, projection_version,
  business_date::text as business_date, compiler_id, compiler_version,
  content_hash, projection_content, generated_at, supersedes_projection_id
from ai.operational_memory_daily_projections
order by business_date, projection_version
`;
const READ_PROJECTION_EVENTS_SQL = `
select event_id, projection_id, status, event_sequence as sequence, occurred_at
from ai.operational_memory_projection_state_events
order by event_sequence
`;
const READ_LINEAGE_SQL = `
select projection_id, snapshot_id, source_record_id, source_content_hash,
  relation
from ai.operational_memory_projection_lineage
order by projection_id, snapshot_id
`;
const READ_REJECTIONS_SQL = `
select rejection_id, source_record_id, failure_code, observed_at
from ai.operational_memory_ingestion_rejections
order by observed_at, rejection_id
`;
const READ_REVIEWS_SQL = `
select review_id, candidate_projection_id, candidate_projection_version,
  candidate_state_sequence, candidate_content_hash, review_sequence, decision,
  reason, reviewed_by, reviewed_at, command_id, canonical_payload_hash
from ai.operational_memory_projection_review_decisions
order by candidate_projection_id, candidate_projection_version, review_sequence
`;
const READ_COMMAND_RECEIPT_SQL = `
select receipt_schema_version, command_id, idempotency_key_hash, command_type,
  canonical_payload_hash, result_status, result_code, result_payload,
  result_payload_hash, requested_by, requested_at, committed_at,
  review_decision_id, affected_projection_id_1, committed_state_event_id_1,
  committed_state_event_sequence_1, affected_projection_id_2,
  committed_state_event_id_2, committed_state_event_sequence_2
from ai.operational_memory_projection_command_receipts
where command_id = $1 or idempotency_key_hash = $2
order by command_id
`;

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("operational_memory_database_timestamp_invalid");
  }
  return date.toISOString();
}

function integer(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("operational_memory_database_sequence_invalid");
  }
  return parsed;
}

function nullableInteger(value: string | number | null): number | null {
  return value === null ? null : integer(value);
}

async function readCommandState(
  client: PoolClient,
): Promise<FarmOsProjectionCommandRepositoryState> {
  const snapshotsResult = await client.query<SnapshotRow>(READ_SNAPSHOTS_SQL);
  const snapshotEventsResult = await client.query<SnapshotEventRow>(
    READ_SNAPSHOT_EVENTS_SQL,
  );
  const projectionsResult = await client.query<ProjectionRow>(
    READ_PROJECTIONS_SQL,
  );
  const projectionEventsResult = await client.query<ProjectionEventRow>(
    READ_PROJECTION_EVENTS_SQL,
  );
  const lineageResult = await client.query<FarmOsProjectionLineage>(
    READ_LINEAGE_SQL,
  );
  const reviews = await client.query<ReviewDecisionRow>(READ_REVIEWS_SQL);
  return {
    snapshots: snapshotsResult.rows.map((row) => ({
      ...row,
      source_record_version: row.source_record_version === null
        ? null
        : Number(row.source_record_version),
      recorded_at: row.recorded_at === null ? null : iso(row.recorded_at),
      source_updated_at: iso(row.source_updated_at),
      deleted_at: row.deleted_at === null ? null : iso(row.deleted_at),
      observed_at: iso(row.observed_at),
      ingestion_sequence: integer(row.ingestion_sequence),
    })),
    snapshot_state_events: snapshotEventsResult.rows.map((row) => ({
      ...row,
      sequence: integer(row.sequence),
      occurred_at: iso(row.occurred_at),
    })),
    projections: projectionsResult.rows.map(({ projection_content, ...row }) => ({
      ...row,
      projection_version: Number(row.projection_version),
      compiler_version: Number(row.compiler_version) as 1,
      content: structuredClone(projection_content),
      generated_at: iso(row.generated_at),
    })),
    projection_state_events: projectionEventsResult.rows.map((row) => ({
      ...row,
      sequence: integer(row.sequence),
      occurred_at: iso(row.occurred_at),
    })),
    lineage: lineageResult.rows.map((row) => structuredClone(row)),
    review_decisions: reviews.rows.map((row) => ({
      ...row,
      candidate_projection_version: Number(row.candidate_projection_version),
      candidate_state_sequence: integer(row.candidate_state_sequence),
      review_sequence: integer(row.review_sequence),
      reviewed_at: iso(row.reviewed_at),
    })),
  };
}

function parseReceipt(row: CommandReceiptRow): FarmOsProjectionCommandReceiptRecord {
  if (!validateFarmOsProjectionCommandResultPayload(row.result_payload)) {
    throw new Error("projection_command_receipt_invalid");
  }
  const parsed: FarmOsProjectionCommandReceiptRecord = {
    ...row,
    requested_at: iso(row.requested_at),
    committed_at: iso(row.committed_at),
    result_payload: row.result_payload,
    committed_state_event_sequence_1:
      nullableInteger(row.committed_state_event_sequence_1),
    committed_state_event_sequence_2:
      nullableInteger(row.committed_state_event_sequence_2),
  };
  if (parsed.result_payload_hash !==
    sha256Prefixed(canonicalJson(parsed.result_payload)) ||
    parsed.result_payload.command_id !== parsed.command_id ||
    parsed.result_payload.command_type !== parsed.command_type ||
    parsed.result_payload.outcome !== parsed.result_status ||
    parsed.result_payload.result_code !== parsed.result_code ||
    parsed.result_payload.review_decision_id !== parsed.review_decision_id) {
    throw new Error("projection_command_receipt_invalid");
  }
  return parsed;
}

function safeFailure(
  failureCode: FarmOsOperationalMemoryFailureCode,
): FarmOsOperationalMemoryPostgresIngestionResult {
  const result: FarmOsOperationalMemoryIngestionResult = {
    result: "rejected",
    outcomes: [{
      source_record_id: null,
      status: "rejected",
      failure_code: failureCode,
      snapshot_write_count: 0,
      projection_write_count: 0,
      lineage_write_count: 0,
      affected_business_dates: [],
    }],
    safety: {
      business_sot: "farming_app",
      source_snapshot_is_business_sot: false,
      daily_projection_is_business_sot: false,
      farming_app_write_performed: false,
      production_db_operation_performed: false,
      linked_db_operation_performed: false,
      llm_used: false,
      human_correction_overlay_write_performed: false,
    },
  };
  return {
    ...result,
    postgres_persistence: {
      transaction_committed: false,
      core_persistence_write_performed: false,
      farming_app_write_performed: false,
    },
  };
}

function withPersistenceEvidence(
  result: FarmOsOperationalMemoryIngestionResult,
  input: {
    transaction_committed: boolean;
    core_persistence_write_performed: boolean;
  },
): FarmOsOperationalMemoryPostgresIngestionResult {
  return {
    ...result,
    postgres_persistence: {
      ...input,
      farming_app_write_performed: false,
    },
  };
}

async function readState(client: PoolClient): Promise<FarmOsOperationalMemoryState> {
  const snapshotsResult = await client.query<SnapshotRow>(READ_SNAPSHOTS_SQL);
  const snapshotEventsResult = await client.query<SnapshotEventRow>(
    READ_SNAPSHOT_EVENTS_SQL,
  );
  const projectionsResult = await client.query<ProjectionRow>(
    READ_PROJECTIONS_SQL,
  );
  const projectionEventsResult = await client.query<ProjectionEventRow>(
    READ_PROJECTION_EVENTS_SQL,
  );
  const lineageResult = await client.query<FarmOsProjectionLineage>(
    READ_LINEAGE_SQL,
  );
  const rejectionsResult = await client.query<RejectionRow>(
    READ_REJECTIONS_SQL,
  );

  const snapshots: FarmOsSourceSnapshot[] = snapshotsResult.rows.map((row) => ({
    ...row,
    source_record_version: row.source_record_version === null
      ? null
      : Number(row.source_record_version),
    recorded_at: row.recorded_at === null ? null : iso(row.recorded_at),
    source_updated_at: iso(row.source_updated_at),
    deleted_at: row.deleted_at === null ? null : iso(row.deleted_at),
    observed_at: iso(row.observed_at),
    ingestion_sequence: integer(row.ingestion_sequence),
  }));
  const snapshotStateEvents: FarmOsSnapshotStateEvent[] =
    snapshotEventsResult.rows.map((row) => ({
      ...row,
      sequence: integer(row.sequence),
      occurred_at: iso(row.occurred_at),
    }));
  const projections: FarmOsDailyProjection[] = projectionsResult.rows.map(
    ({ projection_content, ...row }) => ({
      ...row,
      projection_version: Number(row.projection_version),
      compiler_version: Number(row.compiler_version) as 1,
      content: structuredClone(projection_content),
      generated_at: iso(row.generated_at),
    }),
  );
  const projectionStateEvents: FarmOsProjectionStateEvent[] =
    projectionEventsResult.rows.map((row) => ({
      ...row,
      sequence: integer(row.sequence),
      occurred_at: iso(row.occurred_at),
    }));
  const rejections: FarmOsOperationalMemoryRejection[] =
    rejectionsResult.rows.map((row) => ({
      ...row,
      observed_at: iso(row.observed_at),
    }));

  return {
    snapshots,
    snapshot_state_events: snapshotStateEvents,
    projections,
    projection_state_events: projectionStateEvents,
    lineage: lineageResult.rows.map((row) => structuredClone(row)),
    rejections,
    next_ingestion_sequence:
      Math.max(0, ...snapshots.map((snapshot) => snapshot.ingestion_sequence)) +
      1,
    next_event_sequence: Math.max(
      0,
      ...snapshotStateEvents.map((event) => event.sequence),
      ...projectionStateEvents.map((event) => event.sequence),
    ) + 1,
  };
}

function delta<T>(before: T[], after: T[]): T[] {
  if (after.length < before.length) {
    throw new Error("operational_memory_database_state_regressed");
  }
  return after.slice(before.length);
}

function readbackMismatch(): never {
  throw new Error("operational_memory_database_readback_mismatch");
}

function uniqueIndex<T>(
  rows: readonly T[],
  identity: (row: T) => string,
): Map<string, T> {
  const indexed = new Map<string, T>();
  for (const row of rows) {
    const key = identity(row);
    if (indexed.has(key)) readbackMismatch();
    indexed.set(key, row);
  }
  return indexed;
}

function verifyExactCollection<T>(
  expected: readonly T[],
  actual: readonly T[],
  identity: (row: T) => string,
  fieldsEqual: (expectedRow: T, actualRow: T) => boolean,
): void {
  const expectedByIdentity = uniqueIndex(expected, identity);
  const actualByIdentity = uniqueIndex(actual, identity);
  if (expectedByIdentity.size !== actualByIdentity.size) readbackMismatch();
  for (const [key, expectedRow] of expectedByIdentity) {
    const actualRow = actualByIdentity.get(key);
    if (actualRow === undefined || !fieldsEqual(expectedRow, actualRow)) {
      readbackMismatch();
    }
  }
}

function lineageIndex(
  rows: readonly FarmOsProjectionLineage[],
): Map<string, Map<string, FarmOsProjectionLineage>> {
  const indexed = new Map<string, Map<string, FarmOsProjectionLineage>>();
  for (const row of rows) {
    let bySnapshot = indexed.get(row.projection_id);
    if (bySnapshot === undefined) {
      bySnapshot = new Map<string, FarmOsProjectionLineage>();
      indexed.set(row.projection_id, bySnapshot);
    }
    if (bySnapshot.has(row.snapshot_id)) readbackMismatch();
    bySnapshot.set(row.snapshot_id, row);
  }
  return indexed;
}

function verifyExactLineage(
  expected: readonly FarmOsProjectionLineage[],
  actual: readonly FarmOsProjectionLineage[],
): void {
  if (expected.length !== actual.length) readbackMismatch();
  const expectedByIdentity = lineageIndex(expected);
  const actualByIdentity = lineageIndex(actual);
  if (expectedByIdentity.size !== actualByIdentity.size) readbackMismatch();
  for (const [projectionId, expectedBySnapshot] of expectedByIdentity) {
    const actualBySnapshot = actualByIdentity.get(projectionId);
    if (
      actualBySnapshot === undefined ||
      expectedBySnapshot.size !== actualBySnapshot.size
    ) {
      readbackMismatch();
    }
    for (const [snapshotId, expectedRow] of expectedBySnapshot) {
      const actualRow = actualBySnapshot.get(snapshotId);
      if (
        actualRow === undefined ||
        expectedRow.projection_id !== actualRow.projection_id ||
        expectedRow.snapshot_id !== actualRow.snapshot_id ||
        expectedRow.source_record_id !== actualRow.source_record_id ||
        expectedRow.source_content_hash !== actualRow.source_content_hash ||
        expectedRow.relation !== actualRow.relation
      ) {
        readbackMismatch();
      }
    }
  }
}

function verifyPersisted(
  before: FarmOsOperationalMemoryState,
  expected: FarmOsOperationalMemoryState,
  actual: FarmOsOperationalMemoryState,
): void {
  verifyExactCollection(
    expected.snapshots,
    actual.snapshots,
    (row) => row.snapshot_id,
    () => true,
  );
  verifyExactCollection(
    expected.snapshot_state_events,
    actual.snapshot_state_events,
    (row) => row.event_id,
    () => true,
  );
  verifyExactCollection(
    expected.projections,
    actual.projections,
    (row) => row.projection_id,
    (expectedRow, actualRow) =>
      expectedRow.projection_id === actualRow.projection_id &&
      expectedRow.projection_type === actualRow.projection_type &&
      expectedRow.projection_version === actualRow.projection_version &&
      expectedRow.business_date === actualRow.business_date &&
      expectedRow.compiler_id === actualRow.compiler_id &&
      expectedRow.compiler_version === actualRow.compiler_version &&
      expectedRow.content_hash === actualRow.content_hash &&
      iso(expectedRow.generated_at) === iso(actualRow.generated_at) &&
      expectedRow.supersedes_projection_id ===
        actualRow.supersedes_projection_id,
  );
  verifyExactCollection(
    expected.projection_state_events,
    actual.projection_state_events,
    (row) => row.event_id,
    (expectedRow, actualRow) =>
      expectedRow.event_id === actualRow.event_id &&
      expectedRow.projection_id === actualRow.projection_id &&
      expectedRow.status === actualRow.status &&
      expectedRow.sequence === actualRow.sequence &&
      iso(expectedRow.occurred_at) === iso(actualRow.occurred_at),
  );
  verifyExactLineage(expected.lineage, actual.lineage);
  verifyExactCollection(
    expected.rejections,
    actual.rejections,
    (row) => row.rejection_id,
    () => true,
  );

  const newProjections = delta(before.projections, expected.projections);
  const newProjectionById = uniqueIndex(
    newProjections,
    (row) => row.projection_id,
  );
  if (
    newProjections.some((row) => row.supersedes_projection_id !== null)
  ) {
    readbackMismatch();
  }
  const newProjectionEvents = delta(
    before.projection_state_events,
    expected.projection_state_events,
  );
  if (newProjectionEvents.length !== newProjections.length) {
    readbackMismatch();
  }
  if (
    newProjectionEvents.some((row) =>
      row.status !== "candidate" ||
      !newProjectionById.has(row.projection_id)
    )
  ) {
    readbackMismatch();
  }
  const newLineage = delta(before.lineage, expected.lineage);
  if (
    newLineage.some((row) => !newProjectionById.has(row.projection_id)) ||
    newProjections.some((projection) =>
      !newLineage.some((row) =>
        row.projection_id === projection.projection_id
      )
    )
  ) {
    readbackMismatch();
  }
}

function bundleValues(
  before: FarmOsOperationalMemoryState,
  after: FarmOsOperationalMemoryState,
): string[] {
  return [
    JSON.stringify(delta(before.snapshots, after.snapshots)),
    JSON.stringify(
      delta(before.snapshot_state_events, after.snapshot_state_events),
    ),
    JSON.stringify(delta(before.projections, after.projections).map(
      ({ content, ...projection }) => ({
        ...projection,
        projection_content: content,
      }),
    )),
    JSON.stringify(
      delta(before.projection_state_events, after.projection_state_events),
    ),
    JSON.stringify(delta(before.lineage, after.lineage)),
    JSON.stringify(delta(before.rejections, after.rejections)),
  ];
}

export class FarmOsOperationalMemoryPostgresRepository {
  private readonly pool: PostgresRepositoryPool;
  private readonly ownsPool: boolean;
  private readonly projectionCommandTransactionObserver:
    FarmOsProjectionCommandTransactionObserver | undefined;
  private readonly projectionCommandCommitFailureObserver:
    FarmOsProjectionCommandCommitFailureObserver | undefined;
  private readonly projectionCommandDeferredProbeOptions:
    FarmOsProjectionCommandDeferredProbeOptions | undefined;

  constructor(input: (
    { pool: PostgresRepositoryPool } | { poolConfig: PoolConfig }
  ) & {
    projectionCommandTransactionObserver?:
      FarmOsProjectionCommandTransactionObserver;
    projectionCommandCommitFailureObserver?:
      FarmOsProjectionCommandCommitFailureObserver;
    projectionCommandDeferredProbeOptions?:
      FarmOsProjectionCommandDeferredProbeOptions;
  }) {
    this.projectionCommandTransactionObserver =
      input.projectionCommandTransactionObserver;
    this.projectionCommandCommitFailureObserver =
      input.projectionCommandCommitFailureObserver;
    this.projectionCommandDeferredProbeOptions =
      input.projectionCommandDeferredProbeOptions;
    if ("pool" in input) {
      this.pool = input.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        ...input.poolConfig,
        application_name: "farmos-core-operational-memory",
        max: Math.min(input.poolConfig.max ?? 2, 4),
      });
      this.ownsPool = true;
    }
  }

  async ingest(input: {
    page: unknown;
    observed_at: string;
  }): Promise<FarmOsOperationalMemoryPostgresIngestionResult> {
    if (!parseFarmOsStableChangesPage(input.page).valid) {
      return withPersistenceEvidence(
        ingestFarmOsStableChanges({
          ...input,
          repository: new FarmOsInMemoryOperationalMemoryRepository(),
        }),
        {
          transaction_committed: false,
          core_persistence_write_performed: false,
        },
      );
    }
    const client = await this.pool.connect();
    let transactionStarted = false;
    try {
      await client.query(BEGIN_SQL);
      transactionStarted = true;
      await client.query("set local statement_timeout = '10000ms'");
      await client.query("set local lock_timeout = '10000ms'");
      await client.query(LOCK_SQL, [LOCK_KEY]);
      const before = await readState(client);
      const domainRepository =
        new FarmOsInMemoryOperationalMemoryRepository(before);
      const result = ingestFarmOsStableChanges({
        ...input,
        repository: domainRepository,
      });
      const after = domainRepository.snapshot();
      const values = bundleValues(before, after);
      const writePerformed = values.some((value) => value !== "[]");
      if (writePerformed) {
        const persisted = await client.query<{ result: unknown }>(
          BUNDLE_SQL,
          values,
        );
        if (persisted.rows.length !== 1) {
          throw new Error("operational_memory_database_bundle_invalid");
        }
      }
      const readback = await readState(client);
      verifyPersisted(before, after, readback);
      await client.query("commit");
      transactionStarted = false;
      return withPersistenceEvidence(result, {
        transaction_committed: true,
        core_persistence_write_performed: writePerformed,
      });
    } catch {
      if (transactionStarted) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed; never expose connection or input details.
        }
      }
      return safeFailure("unexpected_error");
    } finally {
      client.release();
    }
  }

  async executeProjectionCommand(input: Readonly<{
    command_id: string;
    idempotency_key_hash: string;
    command_type: FarmOsProjectionCommandReceiptRecord["command_type"];
    canonical_payload_hash: string;
    build_plan: (
      state: FarmOsProjectionCommandRepositoryState,
    ) => import("./farm_os_projection_review_command_contract").FarmOsProjectionCommandPersistencePlan;
  }>): Promise<FarmOsProjectionCommandRepositoryResult> {
    let transactionSubstage: FarmOsProjectionCommandTransactionSubstage =
      "pool_connect";
    const observe = (
      substage: FarmOsProjectionCommandTransactionSubstage,
    ): void => {
      transactionSubstage = substage;
      notifyFarmOsProjectionCommandTransactionObserver(
        this.projectionCommandTransactionObserver,
        substage,
      );
    };
    let client: PoolClient;
    observe("pool_connect");
    try {
      client = await this.pool.connect();
    } catch (error) {
      return { status: "rejected", failure_code: "repository_unavailable" };
    }
    let transactionStarted = false;
    let deferredProbeIdentifier:
      FarmOsProjectionCommandDeferredProbeIdentifier | null = null;
    try {
      observe("transaction_begin");
      await client.query(BEGIN_SQL);
      transactionStarted = true;
      observe("statement_timeout");
      await client.query("set local statement_timeout = '10000ms'");
      observe("lock_timeout");
      await client.query("set local lock_timeout = '10000ms'");
      observe("set_local_role");
      await client.query(COMMAND_ROLE_SQL);
      observe("advisory_lock");
      await client.query(LOCK_SQL, [LOCK_KEY]);

      observe("receipt_lookup");
      const existingResult = await client.query<CommandReceiptRow>(
        READ_COMMAND_RECEIPT_SQL,
        [input.command_id, input.idempotency_key_hash],
      );
      observe("receipt_replay_validation");
      if (existingResult.rows.length > 0) {
        if (existingResult.rows.length !== 1) {
          observe("transaction_rollback");
          await client.query("rollback");
          transactionStarted = false;
          return { status: "rejected", failure_code: "duplicate_command_conflict" };
        }
        const existing = parseReceipt(existingResult.rows[0]);
        if (existing.command_id !== input.command_id ||
          existing.idempotency_key_hash !== input.idempotency_key_hash ||
          existing.command_type !== input.command_type ||
          existing.canonical_payload_hash !== input.canonical_payload_hash) {
          observe("transaction_rollback");
          await client.query("rollback");
          transactionStarted = false;
          return { status: "rejected", failure_code: "duplicate_command_conflict" };
        }
        observe("transaction_commit");
        await client.query("commit");
        transactionStarted = false;
        return {
          status: "committed",
          result_payload: existing.result_payload,
          replayed: true,
        };
      }

      observe("state_read");
      const before = await readCommandState(client);
      observe("build_plan");
      const plan = input.build_plan(before);
      observe("plan_identity_validation");
      if (plan.receipt.command_id !== input.command_id ||
        plan.receipt.idempotency_key_hash !== input.idempotency_key_hash ||
        plan.receipt.command_type !== input.command_type ||
        plan.receipt.canonical_payload_hash !== input.canonical_payload_hash) {
        throw new Error("projection_command_plan_identity_invalid");
      }
      observe("writer_call");
      const write = await client.query<{ result: unknown }>(COMMAND_WRITER_SQL, [
        JSON.stringify(plan.receipt),
        JSON.stringify(plan.review_decision),
        JSON.stringify(plan.rebuild_projection),
        JSON.stringify(plan.projection_events),
        JSON.stringify(plan.rebuild_lineage),
      ]);
      observe("writer_result_validation");
      if (write.rows.length !== 1 ||
        !isDeepStrictEqual(write.rows[0]?.result, plan.receipt.result_payload)) {
        throw new Error("projection_command_writer_result_invalid");
      }

      observe("receipt_readback");
      const receiptResult = await client.query<CommandReceiptRow>(
        READ_COMMAND_RECEIPT_SQL,
        [input.command_id, input.idempotency_key_hash],
      );
      if (receiptResult.rows.length !== 1) {
        throw new Error("projection_command_receipt_readback_invalid");
      }
      const persistedReceipt = parseReceipt(receiptResult.rows[0]);
      if (!isDeepStrictEqual(persistedReceipt, plan.receipt)) {
        throw new Error("projection_command_receipt_readback_invalid");
      }
      observe("state_readback");
      const after = await readCommandState(client);
      const expectedAfter: FarmOsProjectionCommandRepositoryState = {
        snapshots: before.snapshots,
        snapshot_state_events: before.snapshot_state_events,
        projections: plan.rebuild_projection === null
          ? before.projections
          : [...before.projections, {
            projection_id: plan.rebuild_projection.projection_id,
            projection_type: plan.rebuild_projection.projection_type,
            projection_version: plan.rebuild_projection.projection_version,
            business_date: plan.rebuild_projection.business_date,
            compiler_id: plan.rebuild_projection.compiler_id,
            compiler_version: plan.rebuild_projection.compiler_version,
            content_hash: plan.rebuild_projection.content_hash,
            content: structuredClone(
              plan.rebuild_projection.projection_content,
            ) as FarmOsDailyProjection["content"],
            generated_at: plan.rebuild_projection.generated_at,
            supersedes_projection_id:
              plan.rebuild_projection.supersedes_projection_id,
          }],
        projection_state_events: [
          ...before.projection_state_events,
          ...plan.projection_events,
        ],
        lineage: [...before.lineage, ...plan.rebuild_lineage],
        review_decisions: plan.review_decision === null
          ? before.review_decisions
          : [...before.review_decisions, plan.review_decision],
      };
      observe("exact_readback_validation");
      try {
        verifyExactCollection(expectedAfter.snapshots, after.snapshots,
          (row) => row.snapshot_id,
          (expectedRow, actualRow) =>
            isDeepStrictEqual(expectedRow, actualRow));
        verifyExactCollection(
          expectedAfter.snapshot_state_events,
          after.snapshot_state_events,
          (row) => row.event_id,
          (expectedRow, actualRow) =>
            isDeepStrictEqual(expectedRow, actualRow),
        );
        verifyExactCollection(expectedAfter.projections, after.projections,
          (row) => row.projection_id,
          (expectedRow, actualRow) =>
            isDeepStrictEqual(expectedRow, actualRow));
        verifyExactCollection(
          expectedAfter.projection_state_events,
          after.projection_state_events,
          (row) => row.event_id,
          (expectedRow, actualRow) =>
            isDeepStrictEqual(expectedRow, actualRow),
        );
        verifyExactLineage(expectedAfter.lineage, after.lineage);
        verifyExactCollection(
          expectedAfter.review_decisions,
          after.review_decisions,
          (row) => row.review_id,
          (expectedRow, actualRow) =>
            isDeepStrictEqual(expectedRow, actualRow),
        );
      } catch {
        throw new Error("projection_command_exact_readback_invalid");
      }
      if (this.projectionCommandDeferredProbeOptions?.enabled === true) {
        for (const probe of DEFERRED_PROBES) {
          deferredProbeIdentifier = probe.identifier;
          observe("deferred_constraint_probe");
          await client.query(probe.statement);
        }
        deferredProbeIdentifier = "FINAL_COMMIT_AFTER_ALL_PROBES";
      }
      observe("transaction_commit");
      await client.query("commit");
      transactionStarted = false;
      return {
        status: "committed",
        result_payload: persistedReceipt.result_payload,
        replayed: false,
      };
    } catch (error) {
      const originalFailureSubstage = transactionSubstage as
        FarmOsProjectionCommandTransactionSubstage;
      if (originalFailureSubstage === "transaction_commit") {
        notifyFarmOsProjectionCommandCommitFailureObserver(
          this.projectionCommandCommitFailureObserver,
          classifyFarmOsProjectionCommandCommitDatabaseError(error),
        );
      }
      if (this.projectionCommandDeferredProbeOptions?.enabled === true &&
        deferredProbeIdentifier !== null &&
        (originalFailureSubstage === "deferred_constraint_probe" ||
          originalFailureSubstage === "transaction_commit")) {
        const classified = classifyFarmOsProjectionCommandCommitDatabaseError(error);
        notifyFarmOsProjectionCommandDeferredProbeObserver(
          this.projectionCommandDeferredProbeOptions.observer,
          Object.freeze({
            probe_identifier: deferredProbeIdentifier,
            database_error_class: classified.database_error_class,
            resource_connection_subcategory:
              classified.resource_connection_subcategory,
            deferred_check_identifier: classified.deferred_check_identifier,
          }),
        );
      }
      if (transactionStarted) {
        try {
          observe("transaction_rollback");
          await client.query("rollback");
        } catch {
          // Fail closed without exposing query or connection details.
        }
      }
      notifyFarmOsProjectionCommandTransactionObserver(
        this.projectionCommandTransactionObserver,
        originalFailureSubstage,
      );
      const fixedMessage = error instanceof Error ? error.message : "";
      const failureCode = originalFailureSubstage === "transaction_commit"
        ? "transaction_failed" as const
        : fixedMessage === "projection_command_receipt_invalid"
        ? "command_receipt_invalid" as const
        : fixedMessage.includes("readback_invalid")
        ? "readback_failed" as const
        : "transaction_failed" as const;
      return { status: "rejected", failure_code: failureCode };
    } finally {
      observe("client_release");
      client.release();
    }
  }

  async readState(): Promise<FarmOsOperationalMemoryState> {
    const client = await this.pool.connect();
    let transactionStarted = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      transactionStarted = true;
      const state = await readState(client);
      await client.query("commit");
      transactionStarted = false;
      return state;
    } catch {
      if (transactionStarted) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed.
        }
      }
      throw new Error("operational_memory_database_read_failed");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}
