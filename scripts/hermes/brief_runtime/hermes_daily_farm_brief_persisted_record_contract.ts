import {
  isCanonicalIso,
  isHermesDailyFarmBusinessDate,
  HERMES_DAILY_FARM_BRIEF_MAXIMUM_SCHEDULED_RETRY_COUNT,
} from "./hermes_daily_farm_brief_generation_contract";
import { parseHermesDailyFarmBriefScopeIndex, type HermesDailyFarmBriefScopeIndex } from "./hermes_daily_farm_brief_scope_contract";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";

export const HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY = {
  database_write_performed: false,
  app_db_write_performed: false,
  core_db_write_performed: false,
  brief_persistence_performed: false,
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
  raw_identifier_exposed: false,
  secret_exposed: false,
  retry_performed: false,
  transaction_read_only: true,
  persisted_record_parser_enforced: true,
  latest_selection_policy_enforced: true,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefPersistedRecordStatus = "canonical" | "superseded";

type PersistedBase = {
  record_schema_version: "hermes.daily_farm_brief.persisted_record.v1";
  record_id: string;
  business_date: string;
  record_status: HermesDailyFarmBriefPersistedRecordStatus;
  version: number;
  created_at: string;
  updated_at: string;
  safety: typeof HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY;
};

export type HermesDailyFarmBriefPersistedProjectableRecord = PersistedBase & {
  record_kind: "projectable_brief";
  generated_at: string;
  snapshot: HermesDailyFarmSnapshot;
  scope_index: HermesDailyFarmBriefScopeIndex;
  generation_status: "completed";
};

export type HermesDailyFarmBriefPersistedGenerationStateRecord = PersistedBase & {
  record_kind: "generation_state";
  generation_state: "in_progress" | "failed" | "unavailable";
  retry_count: number;
};

export type HermesDailyFarmBriefPersistedRecord =
  | HermesDailyFarmBriefPersistedProjectableRecord
  | HermesDailyFarmBriefPersistedGenerationStateRecord;

export type HermesDailyFarmBriefPersistedRepositoryResult = {
  schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1";
  status: "ok" | "unavailable";
  transaction_read_only: true;
  records: unknown[];
};

type JsonRecord = Record<string, unknown>;
const RECORD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const BASE_KEYS = ["record_schema_version", "record_id", "record_kind", "business_date", "record_status", "version", "created_at", "updated_at", "safety"] as const;
const PROJECTABLE_KEYS = [...BASE_KEYS, "generated_at", "snapshot", "scope_index", "generation_status"] as const;
const GENERATION_KEYS = [...BASE_KEYS, "generation_state", "retry_count"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isVersion(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 1_000_000;
}

function isRetryCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= HERMES_DAILY_FARM_BRIEF_MAXIMUM_SCHEDULED_RETRY_COUNT;
}

function isSafety(value: unknown): value is typeof HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY {
  return isRecord(value) &&
    hasExactKeys(value, Object.keys(HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY)) &&
    Object.entries(HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY).every(([key, expected]) => value[key] === expected);
}

function parseBase(value: JsonRecord, now: string): boolean {
  if (
    value.record_schema_version !== "hermes.daily_farm_brief.persisted_record.v1" ||
    typeof value.record_id !== "string" ||
    !RECORD_ID_PATTERN.test(value.record_id) ||
    !isHermesDailyFarmBusinessDate(value.business_date) ||
    !["canonical", "superseded"].includes(String(value.record_status)) ||
    !isVersion(value.version) ||
    !isCanonicalIso(value.created_at) ||
    !isCanonicalIso(value.updated_at) ||
    Date.parse(value.created_at) > Date.parse(now) ||
    Date.parse(value.updated_at) > Date.parse(now) ||
    Date.parse(value.updated_at) < Date.parse(value.created_at) ||
    !isSafety(value.safety)
  ) return false;
  return true;
}

export function parseHermesDailyFarmBriefPersistedRecord(input: {
  value: unknown;
  now: string;
}): HermesDailyFarmBriefPersistedRecord | null {
  const { value, now } = input;
  if (!isCanonicalIso(now) || !isRecord(value) || !["projectable_brief", "generation_state"].includes(String(value.record_kind))) return null;
  if (value.record_kind === "projectable_brief") {
    if (
      !hasExactKeys(value, PROJECTABLE_KEYS) ||
      !parseBase(value, now) ||
      value.generation_status !== "completed" ||
      !isCanonicalIso(value.generated_at) ||
      !isCanonicalIso(value.created_at) ||
      Date.parse(value.generated_at) > Date.parse(now) ||
      Date.parse(value.generated_at) > Date.parse(value.created_at)
    ) return null;
    const snapshot = parseHermesDailyFarmSnapshot(value.snapshot);
    const scopeIndex = parseHermesDailyFarmBriefScopeIndex(value.scope_index);
    if (snapshot === null || scopeIndex === null || snapshot.generated_at !== value.generated_at || scopeIndex.generated_at !== value.generated_at || scopeIndex.brief_status !== snapshot.status) return null;
    return { ...(value as HermesDailyFarmBriefPersistedProjectableRecord), snapshot, scope_index: scopeIndex };
  }
  if (!hasExactKeys(value, GENERATION_KEYS) || !parseBase(value, now) || !["in_progress", "failed", "unavailable"].includes(String(value.generation_state)) || !isRetryCount(value.retry_count)) return null;
  return value as HermesDailyFarmBriefPersistedGenerationStateRecord;
}

export function parseHermesDailyFarmBriefPersistedRepositoryResult(
  value: unknown,
): HermesDailyFarmBriefPersistedRepositoryResult | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schema_version", "status", "transaction_read_only", "records"]) ||
    value.schema_version !== "hermes.daily_farm_brief.persisted_repository_result.v1" ||
    !["ok", "unavailable"].includes(String(value.status)) ||
    value.transaction_read_only !== true ||
    !Array.isArray(value.records) ||
    value.records.length > 500 ||
    (value.status === "unavailable" && value.records.length !== 0)
  ) return null;
  return {
    schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1",
    status: value.status as "ok" | "unavailable",
    transaction_read_only: true,
    records: [...value.records],
  };
}
