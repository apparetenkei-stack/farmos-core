import { isDeepStrictEqual } from "node:util";

import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "./farm_os_operational_memory_contract";
import {
  compileFarmOsDailyProjection,
  createFarmOsSnapshotId,
  type FarmOsDailyProjectionContent,
  type FarmOsProjectionLineageDraft,
  type FarmOsSnapshotStateEvent,
  type FarmOsSourceSnapshot,
} from "./farm_os_operational_memory_compiler";

export const FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT =
  "farmos.daily_operational_projection.input.v1" as const;
export const FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT =
  "farmos.daily_operational_projection.candidate.v1" as const;
export const FARM_OS_DAILY_PROJECTION_KIND = "daily_work_records" as const;
export const FARM_OS_DAILY_PROJECTION_TIMEZONE = "Asia/Tokyo" as const;
export const FARM_OS_DAILY_PROJECTION_SCHEMA_VERSION = 1 as const;
export const FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION = 1 as const;
export const FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY =
  "structural_latest_snapshot_lineage.v1" as const;

export type FarmOsDailyProjectionSourceSetStatus =
  | "current"
  | "stale"
  | "not_fetched"
  | "unavailable"
  | "invalid"
  | "ambiguous";

export type FarmOsDailyProjectionSourceSnapshot = FarmOsSourceSnapshot & {
  source_type: "work_record";
  schema_version: typeof FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION;
};

export type FarmOsDailyProjectionInput = {
  contract_version: typeof FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT;
  projection_kind: typeof FARM_OS_DAILY_PROJECTION_KIND;
  farm_scope: string;
  business_date: string;
  source_snapshot_schema_version:
    typeof FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION;
  compiler_id: typeof FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID;
  compiler_version: typeof FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION;
  freshness_policy: typeof FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY;
  source_set_status: FarmOsDailyProjectionSourceSetStatus;
  generated_at: string;
  snapshots: FarmOsDailyProjectionSourceSnapshot[];
};

export type FarmOsDailyProjectionCandidateLineage =
  FarmOsProjectionLineageDraft & {
    projection_id: string;
    source_record_version: number | null;
    included_fields: Array<
      "field_reference" | "crop_cycle_reference" | "work_type_reference"
    >;
  };

export type FarmOsDailyProjectionCandidateBundle = {
  contract_version: typeof FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT;
  projection: {
    projection_id: string;
    projection_type: typeof FARM_OS_DAILY_PROJECTION_KIND;
    projection_key: string;
    projection_schema_version: typeof FARM_OS_DAILY_PROJECTION_SCHEMA_VERSION;
    farm_scope: string;
    business_date: string;
    compiler_id: typeof FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID;
    compiler_version: typeof FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION;
    deterministic: true;
    llm_used: false;
    content: FarmOsDailyProjectionContent;
    content_hash: string;
    generated_at: string;
    freshness: "current";
    verification_state: "stable_change_contract_validated";
  };
  lineage: FarmOsDailyProjectionCandidateLineage[];
  state_events: [{
    event_id: string;
    projection_id: string;
    status: "candidate";
    sequence: 1;
    occurred_at: string;
  }];
  diagnostics: {
    source_snapshot_count: number;
    contributing_source_count: number;
    tombstone_count: number;
    warnings: [];
  };
};

export type FarmOsDailyProjectionContractResultCode =
  | "valid_candidate_bundle"
  | "source_missing"
  | "source_not_fetched"
  | "source_unavailable"
  | "source_stale"
  | "source_invalid"
  | "source_ambiguous"
  | "source_hash_mismatch"
  | "unsupported_source_schema"
  | "business_date_mismatch"
  | "duplicate_source_conflict"
  | "contract_invalid";

export type FarmOsDailyProjectionFailureSafety = {
  active_write: false;
  persistence: false;
  retry: false;
  production_operation: false;
  raw_secret_exposure: false;
};

export type FarmOsDailyProjectionContractResult =
  | {
    result: "valid_candidate_bundle";
    candidate_bundle: FarmOsDailyProjectionCandidateBundle;
    failure: null;
  }
  | {
    result: Exclude<
      FarmOsDailyProjectionContractResultCode,
      "valid_candidate_bundle"
    >;
    candidate_bundle: null;
    failure: FarmOsDailyProjectionFailureSafety;
  };

type JsonRecord = Record<string, unknown>;

const INPUT_KEYS = [
  "contract_version",
  "projection_kind",
  "farm_scope",
  "business_date",
  "source_snapshot_schema_version",
  "compiler_id",
  "compiler_version",
  "freshness_policy",
  "source_set_status",
  "generated_at",
  "snapshots",
] as const;
const SNAPSHOT_KEYS = [
  "snapshot_id",
  "contract_version",
  "source_system",
  "source_type",
  "source_record_id",
  "source_record_version",
  "source_content_hash",
  "operation",
  "business_date",
  "recorded_at",
  "source_updated_at",
  "deleted_at",
  "field_reference",
  "crop_cycle_reference",
  "work_type_reference",
  "safe_payload",
  "observed_at",
  "ingestion_sequence",
  "initial_state",
  "supersedes_snapshot_id",
  "rejection_code",
  "schema_version",
] as const;
const BUNDLE_KEYS = [
  "contract_version",
  "projection",
  "lineage",
  "state_events",
  "diagnostics",
] as const;
const PROJECTION_KEYS = [
  "projection_id",
  "projection_type",
  "projection_key",
  "projection_schema_version",
  "farm_scope",
  "business_date",
  "compiler_id",
  "compiler_version",
  "deterministic",
  "llm_used",
  "content",
  "content_hash",
  "generated_at",
  "freshness",
  "verification_state",
] as const;
const CONTENT_KEYS = [
  "business_date",
  "source_record_count",
  "active_record_count",
  "tombstone_count",
  "field_references",
  "crop_cycle_references",
  "work_type_references",
  "verification_status",
  "missing_data_status",
] as const;
const LINEAGE_KEYS = [
  "projection_id",
  "snapshot_id",
  "source_record_id",
  "source_record_version",
  "source_content_hash",
  "relation",
  "included_fields",
] as const;
const STATE_EVENT_KEYS = [
  "event_id",
  "projection_id",
  "status",
  "sequence",
  "occurred_at",
] as const;
const DIAGNOSTIC_KEYS = [
  "source_snapshot_count",
  "contributing_source_count",
  "tombstone_count",
  "warnings",
] as const;
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 &&
    day <= (days[month - 1] ?? 0);
}

function isUtcTimestamp(value: unknown): value is string {
  return typeof value === "string" && UTC_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value));
}

function isReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isNullableReference(value: unknown): value is string | null {
  return value === null || isReference(value);
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && HASH_PATTERN.test(value);
}

function failure(
  result: Exclude<FarmOsDailyProjectionContractResultCode, "valid_candidate_bundle">,
): FarmOsDailyProjectionContractResult {
  return {
    result,
    candidate_bundle: null,
    failure: {
      active_write: false,
      persistence: false,
      retry: false,
      production_operation: false,
      raw_secret_exposure: false,
    },
  };
}

function binaryCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sourceVersionOrder(value: number | null): number {
  return value ?? -1;
}

function canonicalSnapshotOrder(
  left: FarmOsDailyProjectionSourceSnapshot,
  right: FarmOsDailyProjectionSourceSnapshot,
): number {
  return binaryCompare(left.business_date, right.business_date) ||
    binaryCompare(left.source_system, right.source_system) ||
    binaryCompare(left.source_type, right.source_type) ||
    binaryCompare(left.source_record_id, right.source_record_id) ||
    sourceVersionOrder(left.source_record_version) -
      sourceVersionOrder(right.source_record_version) ||
    binaryCompare(left.snapshot_id, right.snapshot_id);
}

function parseSnapshotShape(
  value: unknown,
): FarmOsDailyProjectionSourceSnapshot | null {
  if (!isRecord(value) || !hasExactKeys(value, SNAPSHOT_KEYS)) return null;
  if (
    !isReference(value.snapshot_id) ||
    value.contract_version !== FARM_OS_STABLE_CHANGES_CONTRACT_ID ||
    value.source_system !== "farming_app" ||
    value.source_type !== "work_record" ||
    !isReference(value.source_record_id) ||
    !(
      value.source_record_version === null ||
      (Number.isSafeInteger(value.source_record_version) &&
        Number(value.source_record_version) >= 0)
    ) ||
    !(value.source_content_hash === null || isHash(value.source_content_hash)) ||
    (value.source_record_version === null && value.source_content_hash === null) ||
    (value.operation !== "upsert" && value.operation !== "tombstone") ||
    !isCalendarDate(value.business_date) ||
    !isUtcTimestamp(value.source_updated_at) ||
    !isUtcTimestamp(value.observed_at) ||
    !isNullableReference(value.field_reference) ||
    !isNullableReference(value.crop_cycle_reference) ||
    !isNullableReference(value.work_type_reference) ||
    !isRecord(value.safe_payload) ||
    Object.keys(value.safe_payload).length !== 0 ||
    !Number.isSafeInteger(value.ingestion_sequence) ||
    Number(value.ingestion_sequence) < 1 ||
    !isNullableReference(value.supersedes_snapshot_id) ||
    value.rejection_code !== null ||
    value.schema_version !== FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION
  ) {
    return null;
  }
  if (
    value.operation === "upsert"
      ? !isUtcTimestamp(value.recorded_at) || value.deleted_at !== null ||
        value.initial_state !== "active"
      : !(
        value.recorded_at === null || isUtcTimestamp(value.recorded_at)
      ) || !isUtcTimestamp(value.deleted_at) ||
        value.initial_state !== "tombstoned"
  ) {
    return null;
  }
  return value as FarmOsDailyProjectionSourceSnapshot;
}

function freshnessFailure(
  status: unknown,
): FarmOsDailyProjectionContractResult | null {
  if (status === "current") return null;
  if (status === "stale") return failure("source_stale");
  if (status === "not_fetched") return failure("source_not_fetched");
  if (status === "unavailable") return failure("source_unavailable");
  if (status === "invalid") return failure("source_invalid");
  if (status === "ambiguous") return failure("source_ambiguous");
  return failure("contract_invalid");
}

export function parseFarmOsDailyProjectionInput(
  value: unknown,
  authorizedFarmScope: string,
):
  | { valid: true; value: FarmOsDailyProjectionInput; failure: null }
  | { valid: false; value: null; failure: FarmOsDailyProjectionContractResult } {
  if (!isRecord(value) || !hasExactKeys(value, INPUT_KEYS)) {
    return { valid: false, value: null, failure: failure("contract_invalid") };
  }
  if (
    value.source_snapshot_schema_version !==
      FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION
  ) {
    return {
      valid: false,
      value: null,
      failure: failure("unsupported_source_schema"),
    };
  }
  const freshness = freshnessFailure(value.source_set_status);
  if (freshness !== null) {
    return { valid: false, value: null, failure: freshness };
  }
  if (
    value.contract_version !== FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT ||
    value.projection_kind !== FARM_OS_DAILY_PROJECTION_KIND ||
    !isReference(authorizedFarmScope) ||
    !isReference(value.farm_scope) ||
    value.farm_scope !== authorizedFarmScope ||
    !isCalendarDate(value.business_date) ||
    value.compiler_id !== FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID ||
    value.compiler_version !== FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION ||
    value.freshness_policy !== FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY ||
    !isUtcTimestamp(value.generated_at) ||
    !Array.isArray(value.snapshots)
  ) {
    return { valid: false, value: null, failure: failure("contract_invalid") };
  }
  if (value.snapshots.length === 0) {
    return { valid: false, value: null, failure: failure("source_missing") };
  }
  if (value.snapshots.length > 100) {
    return { valid: false, value: null, failure: failure("contract_invalid") };
  }

  const rawSnapshots = value.snapshots;
  for (const candidate of rawSnapshots) {
    if (isRecord(candidate) && candidate.source_type !== "work_record") {
      return { valid: false, value: null, failure: failure("source_invalid") };
    }
    if (
      isRecord(candidate) &&
      candidate.schema_version !== FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION
    ) {
      return {
        valid: false,
        value: null,
        failure: failure("unsupported_source_schema"),
      };
    }
  }
  const parsed = rawSnapshots.map(parseSnapshotShape);
  if (parsed.some((snapshot) => snapshot === null)) {
    return { valid: false, value: null, failure: failure("source_invalid") };
  }
  const snapshots = parsed as FarmOsDailyProjectionSourceSnapshot[];
  if (snapshots.some((snapshot) => snapshot.business_date !== value.business_date)) {
    return {
      valid: false,
      value: null,
      failure: failure("business_date_mismatch"),
    };
  }
  if (new Set(snapshots.map((snapshot) => snapshot.snapshot_id)).size !== snapshots.length) {
    return {
      valid: false,
      value: null,
      failure: failure("duplicate_source_conflict"),
    };
  }
  const recordVersions = new Map<string, string | null>();
  for (const snapshot of snapshots) {
    if (snapshot.source_record_version === null) continue;
    const versionKey = `${snapshot.source_system}:${snapshot.source_type}:` +
      `${snapshot.source_record_id}:${snapshot.source_record_version}`;
    if (recordVersions.has(versionKey)) {
      return {
        valid: false,
        value: null,
        failure: failure("duplicate_source_conflict"),
      };
    }
    recordVersions.set(versionKey, snapshot.source_content_hash);
  }
  const byRecord = new Map<string, FarmOsDailyProjectionSourceSnapshot[]>();
  for (const snapshot of snapshots) {
    const candidates = byRecord.get(snapshot.source_record_id) ?? [];
    candidates.push(snapshot);
    byRecord.set(snapshot.source_record_id, candidates);
  }
  if ([...byRecord.values()].some((entries) =>
    entries.length > 1 && entries.some((entry) => entry.source_record_version === null)
  )) {
    return { valid: false, value: null, failure: failure("source_ambiguous") };
  }
  for (const snapshot of snapshots) {
    const expectedSnapshotId = createFarmOsSnapshotId({
      source_record_id: snapshot.source_record_id,
      source_record_version: snapshot.source_record_version,
      source_content_hash: snapshot.source_content_hash,
      operation: snapshot.operation,
      business_date: snapshot.business_date,
    });
    if (snapshot.snapshot_id !== expectedSnapshotId) {
      return {
        valid: false,
        value: null,
        failure: failure("source_hash_mismatch"),
      };
    }
  }

  const normalizedSnapshots = snapshots
    .slice()
    .sort(canonicalSnapshotOrder)
    .map((snapshot, index) => ({ ...snapshot, ingestion_sequence: index + 1 }));
  return {
    valid: true,
    value: {
      contract_version: FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
      projection_kind: FARM_OS_DAILY_PROJECTION_KIND,
      farm_scope: value.farm_scope,
      business_date: value.business_date,
      source_snapshot_schema_version: FARM_OS_SOURCE_SNAPSHOT_SCHEMA_VERSION,
      compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
      compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
      freshness_policy: FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
      source_set_status: "current",
      generated_at: value.generated_at,
      snapshots: normalizedSnapshots,
    },
    failure: null,
  };
}

function snapshotEvents(
  snapshots: FarmOsDailyProjectionSourceSnapshot[],
): FarmOsSnapshotStateEvent[] {
  return snapshots.map((snapshot, index) => ({
    event_id: `${snapshot.snapshot_id}:initial`,
    snapshot_id: snapshot.snapshot_id,
    state: snapshot.operation === "tombstone" ? "tombstoned" : "active",
    sequence: index + 1,
    occurred_at: snapshot.observed_at,
  }));
}

function includedFields(
  snapshot: FarmOsDailyProjectionSourceSnapshot,
  relation: FarmOsProjectionLineageDraft["relation"],
): FarmOsDailyProjectionCandidateLineage["included_fields"] {
  if (relation !== "included") return [];
  const fields: FarmOsDailyProjectionCandidateLineage["included_fields"] = [];
  if (snapshot.field_reference !== null) fields.push("field_reference");
  if (snapshot.crop_cycle_reference !== null) fields.push("crop_cycle_reference");
  if (snapshot.work_type_reference !== null) fields.push("work_type_reference");
  return fields;
}

function materializeCandidateBundle(
  input: FarmOsDailyProjectionInput,
): FarmOsDailyProjectionCandidateBundle {
  const compiled = compileFarmOsDailyProjection({
    business_date: input.business_date,
    snapshots: input.snapshots,
    snapshot_state_events: snapshotEvents(input.snapshots),
  });
  const projectionId = `daily_candidate_${input.business_date}_` +
    compiled.content_hash.slice(0, 24);
  const projectionKey =
    `${input.farm_scope}:${FARM_OS_DAILY_PROJECTION_KIND}:${input.business_date}`;
  const snapshotById = new Map(
    input.snapshots.map((snapshot) => [snapshot.snapshot_id, snapshot]),
  );
  const lineage = compiled.lineage.map((entry) => {
    const snapshot = snapshotById.get(entry.snapshot_id)!;
    return {
      projection_id: projectionId,
      snapshot_id: entry.snapshot_id,
      source_record_id: entry.source_record_id,
      source_record_version: snapshot.source_record_version,
      source_content_hash: entry.source_content_hash,
      relation: entry.relation,
      included_fields: includedFields(snapshot, entry.relation),
    };
  });
  return {
    contract_version: FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT,
    projection: {
      projection_id: projectionId,
      projection_type: FARM_OS_DAILY_PROJECTION_KIND,
      projection_key: projectionKey,
      projection_schema_version: FARM_OS_DAILY_PROJECTION_SCHEMA_VERSION,
      farm_scope: input.farm_scope,
      business_date: input.business_date,
      compiler_id: compiled.compiler_id,
      compiler_version: compiled.compiler_version,
      deterministic: true,
      llm_used: false,
      content: compiled.content,
      content_hash: compiled.content_hash,
      generated_at: input.generated_at,
      freshness: "current",
      verification_state: "stable_change_contract_validated",
    },
    lineage,
    state_events: [{
      event_id: `${projectionId}:candidate:1`,
      projection_id: projectionId,
      status: "candidate",
      sequence: 1,
      occurred_at: input.generated_at,
    }],
    diagnostics: {
      source_snapshot_count: input.snapshots.length,
      contributing_source_count: compiled.content.source_record_count,
      tombstone_count: compiled.content.tombstone_count,
      warnings: [],
    },
  };
}

function validStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isReference) &&
    new Set(value).size === value.length;
}

function hasStrictCandidateBundleShape(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, BUNDLE_KEYS)) return false;
  const projection = value.projection;
  if (!isRecord(projection) || !hasExactKeys(projection, PROJECTION_KEYS)) {
    return false;
  }
  const content = projection.content;
  if (
    !isRecord(content) ||
    !hasExactKeys(content, CONTENT_KEYS) ||
    !isCalendarDate(content.business_date) ||
    !Number.isSafeInteger(content.source_record_count) ||
    Number(content.source_record_count) < 0 ||
    !Number.isSafeInteger(content.active_record_count) ||
    Number(content.active_record_count) < 0 ||
    !Number.isSafeInteger(content.tombstone_count) ||
    Number(content.tombstone_count) < 0 ||
    Number(content.source_record_count) !==
      Number(content.active_record_count) + Number(content.tombstone_count) ||
    !validStringArray(content.field_references) ||
    !validStringArray(content.crop_cycle_references) ||
    !validStringArray(content.work_type_references) ||
    content.verification_status !== "stable_change_contract_validated" ||
    (content.missing_data_status !== "complete_for_v1" &&
      content.missing_data_status !== "optional_references_missing")
  ) return false;
  if (
    value.contract_version !== FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT ||
    !isId(projection.projection_id) ||
    projection.projection_type !== FARM_OS_DAILY_PROJECTION_KIND ||
    typeof projection.projection_key !== "string" ||
    projection.projection_schema_version !==
      FARM_OS_DAILY_PROJECTION_SCHEMA_VERSION ||
    !isReference(projection.farm_scope) ||
    !isCalendarDate(projection.business_date) ||
    projection.compiler_id !== FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID ||
    projection.compiler_version !== FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION ||
    projection.deterministic !== true ||
    projection.llm_used !== false ||
    !isHash(projection.content_hash) ||
    !isUtcTimestamp(projection.generated_at) ||
    projection.freshness !== "current" ||
    projection.verification_state !== "stable_change_contract_validated" ||
    !Array.isArray(value.lineage) || value.lineage.length === 0 ||
    !Array.isArray(value.state_events) || value.state_events.length !== 1 ||
    !isRecord(value.diagnostics) ||
    !hasExactKeys(value.diagnostics, DIAGNOSTIC_KEYS)
  ) return false;
  const lineageIds = new Set<string>();
  for (const entry of value.lineage) {
    if (
      !isRecord(entry) || !hasExactKeys(entry, LINEAGE_KEYS) ||
      !isId(entry.projection_id) || !isId(entry.snapshot_id) ||
      !isReference(entry.source_record_id) ||
      !(entry.source_record_version === null ||
        (Number.isSafeInteger(entry.source_record_version) &&
          Number(entry.source_record_version) >= 0)) ||
      !(entry.source_content_hash === null || isHash(entry.source_content_hash)) ||
      (entry.relation !== "included" &&
        entry.relation !== "excluded_by_tombstone" &&
        entry.relation !== "superseded") ||
      !Array.isArray(entry.included_fields) ||
      entry.included_fields.some((field) =>
        field !== "field_reference" && field !== "crop_cycle_reference" &&
        field !== "work_type_reference"
      ) ||
      new Set(entry.included_fields).size !== entry.included_fields.length ||
      lineageIds.has(entry.snapshot_id)
    ) return false;
    lineageIds.add(entry.snapshot_id);
  }
  const event = value.state_events[0];
  return isRecord(event) && hasExactKeys(event, STATE_EVENT_KEYS) &&
    isId(event.event_id) && isId(event.projection_id) &&
    event.status === "candidate" && event.sequence === 1 &&
    isUtcTimestamp(event.occurred_at) &&
    Number.isSafeInteger(value.diagnostics.source_snapshot_count) &&
    Number(value.diagnostics.source_snapshot_count) >= 1 &&
    Number.isSafeInteger(value.diagnostics.contributing_source_count) &&
    Number(value.diagnostics.contributing_source_count) >= 0 &&
    Number.isSafeInteger(value.diagnostics.tombstone_count) &&
    Number(value.diagnostics.tombstone_count) >= 0 &&
    Array.isArray(value.diagnostics.warnings) &&
    value.diagnostics.warnings.length === 0;
}

export function createFarmOsDailyProjectionCandidateBundle(
  input: unknown,
  authorizedFarmScope: string,
): FarmOsDailyProjectionContractResult {
  const parsed = parseFarmOsDailyProjectionInput(input, authorizedFarmScope);
  if (!parsed.valid) return parsed.failure;
  return {
    result: "valid_candidate_bundle",
    candidate_bundle: materializeCandidateBundle(parsed.value),
    failure: null,
  };
}

export function parseFarmOsDailyProjectionCandidateBundle(
  value: unknown,
  sourceInput: unknown,
  authorizedFarmScope: string,
): FarmOsDailyProjectionContractResult {
  if (!hasStrictCandidateBundleShape(value)) return failure("contract_invalid");
  const expected = createFarmOsDailyProjectionCandidateBundle(
    sourceInput,
    authorizedFarmScope,
  );
  if (expected.result !== "valid_candidate_bundle") return expected;
  if (!isDeepStrictEqual(value, expected.candidate_bundle)) {
    return failure("contract_invalid");
  }
  return expected;
}
