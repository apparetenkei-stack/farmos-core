import {
  parseHermesDailyFarmBriefExecutionResult,
  type HermesDailyFarmBriefExecutionResult,
} from "./hermes_daily_farm_brief_execution_contract";
import {
  isCanonicalIso,
  isHermesDailyFarmBusinessDate,
  parseHermesDailyFarmBriefGenerationDecision,
  type HermesDailyFarmBriefGenerationDecision,
} from "./hermes_daily_farm_brief_generation_contract";
import {
  parseHermesDailyFarmBriefLatestReadSource,
  type HermesDailyFarmBriefLatestReadSource,
} from "./hermes_daily_farm_brief_latest_api_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  parseHermesDailyFarmBriefPersistedRecord,
  type HermesDailyFarmBriefPersistedRecord,
} from "./hermes_daily_farm_brief_persisted_record_contract";
import {
  fingerprintHermesDailyFarmBriefPersistenceCommandPayload,
  fingerprintHermesDailyFarmBriefProjectableSource,
} from "./hermes_daily_farm_brief_persistence_fingerprint";

export const HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY = {
  database_write_performed: false,
  app_db_write_performed: false,
  business_db_write_performed: false,
  migration_performed: false,
  rls_change_performed: false,
  proposal_created: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  audit_write_performed: false,
  notification_performed: false,
  queue_operation_performed: false,
  worker_claim_performed: false,
  model_execution_performed: false,
  scheduler_registration_performed: false,
  raw_database_row_exposed: false,
  secret_exposed: false,
  retry_performed: false,
  server_owned_command_enforced: true,
  persisted_record_parser_enforced: true,
  optimistic_concurrency_enforced: true,
  atomic_transaction_required: true,
  fail_closed: true,
} as const;

export const HERMES_DAILY_FARM_BRIEF_PERSISTENCE_TRANSACTION_POLICY = {
  mode: "atomic_canonical_transition",
  isolation: "serializable",
  repository_transaction_max_calls: 1,
  retry_limit: 0,
} as const;

export type HermesDailyFarmBriefPersistenceCommandType =
  | "persist_projectable_brief"
  | "persist_generation_state";

export type HermesDailyFarmBriefPersistenceCommand = {
  schema_version: "hermes.daily_farm_brief.persistence_command.v1";
  command_id: string;
  idempotency_key: string;
  command_type: HermesDailyFarmBriefPersistenceCommandType;
  business_date: string;
  expected_current_version: number | null;
  source_execution_reference: string;
  record: HermesDailyFarmBriefPersistedRecord;
  requested_at: string;
  requested_by: "server_daily_farm_brief_execution" | "server_daily_farm_brief_generation_state";
  transaction_policy: typeof HERMES_DAILY_FARM_BRIEF_PERSISTENCE_TRANSACTION_POLICY;
  safety: typeof HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY;
};

type JsonRecord = Record<string, unknown>;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const COMMAND_KEYS = [
  "schema_version", "command_id", "idempotency_key", "command_type", "business_date",
  "expected_current_version", "source_execution_reference", "record", "requested_at",
  "requested_by", "transaction_policy", "safety",
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function exactObject(value: unknown, expected: Record<string, unknown>): boolean {
  return isRecord(value) && hasExactKeys(value, Object.keys(expected)) &&
    Object.entries(expected).every(([key, expectedValue]) => value[key] === expectedValue);
}

function isExpectedVersion(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) > 0 && Number(value) < 1_000_000);
}

export function parseHermesDailyFarmBriefPersistenceCommand(
  value: unknown,
): HermesDailyFarmBriefPersistenceCommand | null {
  if (!isRecord(value) || !hasExactKeys(value, COMMAND_KEYS)) return null;
  if (
    value.schema_version !== "hermes.daily_farm_brief.persistence_command.v1" ||
    typeof value.command_id !== "string" || !IDENTIFIER_PATTERN.test(value.command_id) ||
    typeof value.idempotency_key !== "string" || !IDENTIFIER_PATTERN.test(value.idempotency_key) ||
    !["persist_projectable_brief", "persist_generation_state"].includes(String(value.command_type)) ||
    !isHermesDailyFarmBusinessDate(value.business_date) ||
    !isExpectedVersion(value.expected_current_version) ||
    typeof value.source_execution_reference !== "string" || !IDENTIFIER_PATTERN.test(value.source_execution_reference) ||
    !isCanonicalIso(value.requested_at) ||
    !["server_daily_farm_brief_execution", "server_daily_farm_brief_generation_state"].includes(String(value.requested_by)) ||
    !exactObject(value.transaction_policy, HERMES_DAILY_FARM_BRIEF_PERSISTENCE_TRANSACTION_POLICY) ||
    !exactObject(value.safety, HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY)
  ) return null;
  const record = parseHermesDailyFarmBriefPersistedRecord({ value: value.record, now: value.requested_at });
  if (record === null || record.business_date !== value.business_date || record.record_status !== "canonical") return null;
  const nextVersion = value.expected_current_version === null ? 1 : value.expected_current_version + 1;
  if (record.version !== nextVersion || record.created_at !== value.requested_at || record.updated_at !== value.requested_at) return null;
  if (
    (value.command_type === "persist_projectable_brief" && (record.record_kind !== "projectable_brief" || value.requested_by !== "server_daily_farm_brief_execution")) ||
    (value.command_type === "persist_generation_state" && (record.record_kind !== "generation_state" || value.requested_by !== "server_daily_farm_brief_generation_state"))
  ) return null;
  return {
    schema_version: "hermes.daily_farm_brief.persistence_command.v1",
    command_id: value.command_id,
    idempotency_key: value.idempotency_key,
    command_type: value.command_type,
    business_date: value.business_date,
    expected_current_version: value.expected_current_version,
    source_execution_reference: value.source_execution_reference,
    record,
    requested_at: value.requested_at,
    requested_by: value.requested_by,
    transaction_policy: HERMES_DAILY_FARM_BRIEF_PERSISTENCE_TRANSACTION_POLICY,
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY,
  } as HermesDailyFarmBriefPersistenceCommand;
}

type BuilderCommon = {
  expectedCurrentVersion: number | null;
  requestedAt: string;
  commandIdFactory: () => string;
  recordIdFactory: (businessDate: string, recordKind: HermesDailyFarmBriefPersistedRecord["record_kind"]) => string;
};

function serverOwnedIdempotencyKey(input: {
  commandType: HermesDailyFarmBriefPersistenceCommandType;
  businessDate: string;
  sourceExecutionReference: string;
}): string {
  const digest = fingerprintHermesDailyFarmBriefPersistenceCommandPayload({
    command_type: input.commandType,
    business_date: input.businessDate,
    source_execution_reference: input.sourceExecutionReference,
  });
  return `brief-persist:${digest.slice(0, 40)}`;
}

function command(input: {
  common: BuilderCommon;
  commandType: HermesDailyFarmBriefPersistenceCommandType;
  businessDate: string;
  sourceExecutionReference: string;
  record: HermesDailyFarmBriefPersistedRecord;
}): HermesDailyFarmBriefPersistenceCommand | null {
  let commandId: string;
  try {
    commandId = input.common.commandIdFactory();
  } catch {
    return null;
  }
  return parseHermesDailyFarmBriefPersistenceCommand({
    schema_version: "hermes.daily_farm_brief.persistence_command.v1",
    command_id: commandId,
    idempotency_key: serverOwnedIdempotencyKey({ commandType: input.commandType, businessDate: input.businessDate, sourceExecutionReference: input.sourceExecutionReference }),
    command_type: input.commandType,
    business_date: input.businessDate,
    expected_current_version: input.common.expectedCurrentVersion,
    source_execution_reference: input.sourceExecutionReference,
    record: input.record,
    requested_at: input.common.requestedAt,
    requested_by: input.commandType === "persist_projectable_brief"
      ? "server_daily_farm_brief_execution"
      : "server_daily_farm_brief_generation_state",
    transaction_policy: HERMES_DAILY_FARM_BRIEF_PERSISTENCE_TRANSACTION_POLICY,
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY,
  });
}

export function buildHermesDailyFarmBriefProjectablePersistenceCommand(input: BuilderCommon & {
  executionResult: unknown;
  latestSource: unknown;
}): HermesDailyFarmBriefPersistenceCommand | null {
  const execution: HermesDailyFarmBriefExecutionResult | null = parseHermesDailyFarmBriefExecutionResult(input.executionResult);
  const source: HermesDailyFarmBriefLatestReadSource | null = parseHermesDailyFarmBriefLatestReadSource(input.latestSource);
  if (
    execution === null || execution.status !== "completed" || execution.latest_candidate === null ||
    source === null || source.source_kind !== "projectable_brief" ||
    execution.business_date !== source.business_date ||
    execution.latest_candidate.business_date !== source.business_date ||
    execution.latest_candidate.generated_at !== source.snapshot.generated_at ||
    source.scope_index.generated_at !== source.snapshot.generated_at ||
    execution.persistence_source_fingerprint !== fingerprintHermesDailyFarmBriefProjectableSource({ snapshot: source.snapshot, scopeIndex: source.scope_index }) ||
    Date.parse(input.requestedAt) < Date.parse(execution.executed_at)
  ) return null;
  let recordId: string;
  try {
    recordId = input.recordIdFactory(source.business_date, "projectable_brief");
  } catch {
    return null;
  }
  const nextVersion = input.expectedCurrentVersion === null ? 1 : input.expectedCurrentVersion + 1;
  return command({
    common: input,
    commandType: "persist_projectable_brief",
    businessDate: source.business_date,
    sourceExecutionReference: execution.execution_id,
    record: {
      record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
      record_id: recordId,
      record_kind: "projectable_brief",
      business_date: source.business_date,
      generated_at: source.snapshot.generated_at,
      snapshot: source.snapshot,
      scope_index: source.scope_index,
      generation_status: "completed",
      record_status: "canonical",
      version: nextVersion,
      created_at: input.requestedAt,
      updated_at: input.requestedAt,
      safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
    },
  });
}

export function buildHermesDailyFarmBriefGenerationStatePersistenceCommand(input: BuilderCommon & {
  generationDecision: unknown;
  generationState: "in_progress" | "failed" | "unavailable";
  retryCount: number;
}): HermesDailyFarmBriefPersistenceCommand | null {
  const decision: HermesDailyFarmBriefGenerationDecision | null = parseHermesDailyFarmBriefGenerationDecision(input.generationDecision);
  if (decision === null || Date.parse(input.requestedAt) < Date.parse(decision.request.requested_at)) return null;
  let recordId: string;
  try {
    recordId = input.recordIdFactory(decision.request.business_date, "generation_state");
  } catch {
    return null;
  }
  const nextVersion = input.expectedCurrentVersion === null ? 1 : input.expectedCurrentVersion + 1;
  return command({
    common: input,
    commandType: "persist_generation_state",
    businessDate: decision.request.business_date,
    sourceExecutionReference: decision.request.request_id,
    record: {
      record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
      record_id: recordId,
      record_kind: "generation_state",
      business_date: decision.request.business_date,
      generation_state: input.generationState,
      retry_count: input.retryCount,
      record_status: "canonical",
      version: nextVersion,
      created_at: input.requestedAt,
      updated_at: input.requestedAt,
      safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
    },
  });
}
