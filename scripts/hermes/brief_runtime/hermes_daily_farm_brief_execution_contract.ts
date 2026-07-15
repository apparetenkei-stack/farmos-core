import {
  isCanonicalIso,
  isHermesDailyFarmBusinessDate,
  parseHermesDailyFarmBriefGenerationDecision,
  type HermesDailyFarmBriefGenerationDecision,
} from "./hermes_daily_farm_brief_generation_contract";
import { HERMES_DAILY_FARM_SOURCE_ORDER, type HermesDailyFarmFreshness, type HermesDailyFarmSourceType } from "./hermes_daily_farm_brief_policy";
import { parseHermesDailyFarmBriefAllowedScopeKeys, type HermesDailyFarmBriefRole, type HermesDailyFarmBriefProjectionSourceStatus } from "./hermes_daily_farm_brief_scope_contract";

export const HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY = {
  database_write_performed: false,
  app_db_write_performed: false,
  core_db_write_performed: false,
  brief_persistence_performed: false,
  proposal_created: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  audit_write_performed: false,
  notification_performed: false,
  queue_operation_performed: false,
  worker_claim_performed: false,
  model_execution_performed: false,
  scheduler_registration_performed: false,
  external_fetch_added: false,
  secret_exposed: false,
  client_execution_override_allowed: false,
  client_role_override_allowed: false,
  client_scope_override_allowed: false,
  generation_decision_enforced: true,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefExecutionRequest = {
  schema_version: "hermes.daily_farm_brief.execution_request.v1";
  generation_decision: HermesDailyFarmBriefGenerationDecision;
  execution_id: string;
  execution_requested_at: string;
  timezone: "Asia/Tokyo";
  business_date: string;
  role_projection_target: HermesDailyFarmBriefRole;
  allowed_scope_keys: string[];
};

export type HermesDailyFarmBriefLatestSourceStatus = {
  source_type: HermesDailyFarmSourceType;
  status: HermesDailyFarmBriefProjectionSourceStatus["status"] | "unknown";
  freshness: HermesDailyFarmFreshness;
  record_count: number | null;
};

export type HermesDailyFarmBriefLatestCandidate = {
  schema_version: "hermes.daily_farm_brief.latest_candidate.v1";
  business_date: string;
  generated_at: string | null;
  brief_status: "ready" | "partial" | "unavailable" | null;
  role: HermesDailyFarmBriefRole;
  visible_scope_count: number;
  source_status: HermesDailyFarmBriefLatestSourceStatus[];
  stale: boolean;
  stale_reason_codes: ("previous_business_date" | "required_source_stale" | "generated_at_stale")[];
  limitations: string[];
  display_state: "current" | "stale" | "unavailable" | "generation_in_progress" | "generation_failed";
};

export type HermesDailyFarmBriefExecutionFailureCode =
  | "generation_decision_invalid"
  | "generation_not_authorized"
  | "execution_request_invalid"
  | "integration_threw"
  | "integration_result_invalid"
  | "snapshot_invalid"
  | "brief_invalid"
  | "scope_index_invalid"
  | "role_projection_invalid"
  | "timestamp_invalid"
  | "latest_candidate_invalid";

export type HermesDailyFarmBriefExecutionResult = {
  schema_version: "hermes.daily_farm_brief.execution_result.v1";
  execution_id: string;
  generation_request_id: string;
  business_date: string;
  execution_requested_at: string;
  executed_at: string;
  status: "completed" | "skipped" | "failed_closed";
  generation_decision: HermesDailyFarmBriefGenerationDecision;
  brief_status: "ready" | "partial" | "unavailable" | null;
  snapshot_generated: boolean;
  brief_generated: boolean;
  scope_index_generated: boolean;
  role_projection_generated: boolean;
  role: HermesDailyFarmBriefRole;
  visible_scope_count: number;
  source_status: HermesDailyFarmBriefLatestSourceStatus[];
  limitations: string[];
  failure_code: HermesDailyFarmBriefExecutionFailureCode | null;
  latest_candidate: HermesDailyFarmBriefLatestCandidate | null;
  persistence_source_fingerprint: string | null;
  safety: typeof HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY;
};

type JsonRecord = Record<string, unknown>;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const STATUS_VALUES = ["available", "empty", "unavailable", "invalid", "limited", "unknown"];
const FRESHNESS_VALUES = ["fresh", "stale", "unknown"];
const FAILURE_CODES: HermesDailyFarmBriefExecutionFailureCode[] = [
  "generation_decision_invalid", "generation_not_authorized", "execution_request_invalid",
  "integration_threw", "integration_result_invalid", "snapshot_invalid", "brief_invalid",
  "scope_index_invalid", "role_projection_invalid", "timestamp_invalid", "latest_candidate_invalid",
];
const STALE_REASON_ORDER = ["previous_business_date", "required_source_stale", "generated_at_stale"];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000;
}

function parseCodeArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50 || value.some((item) => typeof item !== "string" || !/^[a-z][a-z0-9_]{0,119}$/u.test(item)) || new Set(value).size !== value.length) return null;
  if (value.some((item, index) => index > 0 && String(value[index - 1]).localeCompare(String(item)) >= 0)) return null;
  return [...value] as string[];
}

function parseSourceStatus(value: unknown): HermesDailyFarmBriefLatestSourceStatus[] | null {
  if (!Array.isArray(value) || (value.length !== 0 && value.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length)) return null;
  const parsed: HermesDailyFarmBriefLatestSourceStatus[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isRecord(item) || !hasExactKeys(item, ["source_type", "status", "freshness", "record_count"]) || item.source_type !== HERMES_DAILY_FARM_SOURCE_ORDER[index] || !STATUS_VALUES.includes(String(item.status)) || !FRESHNESS_VALUES.includes(String(item.freshness)) || (item.record_count !== null && !isCount(item.record_count))) return null;
    parsed.push({ source_type: item.source_type as HermesDailyFarmSourceType, status: item.status as HermesDailyFarmBriefLatestSourceStatus["status"], freshness: item.freshness as HermesDailyFarmFreshness, record_count: item.record_count as number | null });
  }
  return parsed;
}

export function parseHermesDailyFarmBriefExecutionRequest(value: unknown): HermesDailyFarmBriefExecutionRequest | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schema_version", "generation_decision", "execution_id", "execution_requested_at", "timezone", "business_date", "role_projection_target", "allowed_scope_keys"])) return null;
  const decision = parseHermesDailyFarmBriefGenerationDecision(value.generation_decision);
  const allowed = parseHermesDailyFarmBriefAllowedScopeKeys(value.allowed_scope_keys);
  if (value.schema_version !== "hermes.daily_farm_brief.execution_request.v1" || decision === null || !isId(value.execution_id) || !isCanonicalIso(value.execution_requested_at) || value.timezone !== "Asia/Tokyo" || value.timezone !== decision.request.timezone || !isHermesDailyFarmBusinessDate(value.business_date) || value.business_date !== decision.request.business_date || !["administrator", "general_staff"].includes(String(value.role_projection_target)) || allowed === null || JSON.stringify(allowed) !== JSON.stringify(value.allowed_scope_keys) || Date.parse(value.execution_requested_at as string) < Date.parse(decision.request.requested_at)) return null;
  if (value.role_projection_target === "administrator" && allowed.length !== 0) return null;
  return { ...(value as HermesDailyFarmBriefExecutionRequest), generation_decision: decision, allowed_scope_keys: allowed };
}

export function parseHermesDailyFarmBriefLatestCandidate(value: unknown): HermesDailyFarmBriefLatestCandidate | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schema_version", "business_date", "generated_at", "brief_status", "role", "visible_scope_count", "source_status", "stale", "stale_reason_codes", "limitations", "display_state"])) return null;
  const sourceStatus = parseSourceStatus(value.source_status);
  const limitations = parseCodeArray(value.limitations);
  if (value.schema_version !== "hermes.daily_farm_brief.latest_candidate.v1" || !isHermesDailyFarmBusinessDate(value.business_date) || (value.generated_at !== null && !isCanonicalIso(value.generated_at)) || ![null, "ready", "partial", "unavailable"].includes(value.brief_status as null | string) || !["administrator", "general_staff"].includes(String(value.role)) || !isCount(value.visible_scope_count) || sourceStatus === null || typeof value.stale !== "boolean" || !Array.isArray(value.stale_reason_codes) || value.stale_reason_codes.some((reason) => !STALE_REASON_ORDER.includes(String(reason))) || new Set(value.stale_reason_codes).size !== value.stale_reason_codes.length || value.stale_reason_codes.some((reason, index) => index > 0 && STALE_REASON_ORDER.indexOf(String(value.stale_reason_codes[index - 1])) >= STALE_REASON_ORDER.indexOf(String(reason))) || limitations === null || !["current", "stale", "unavailable", "generation_in_progress", "generation_failed"].includes(String(value.display_state))) return null;
  const hasContent = value.display_state === "current" || value.display_state === "stale";
  if (hasContent ? (value.generated_at === null || value.brief_status === null || sourceStatus.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length) : (value.generated_at !== null || value.brief_status !== null || value.visible_scope_count !== 0 || sourceStatus.length !== 0)) return null;
  if (value.display_state === "current" && (value.stale || value.stale_reason_codes.length !== 0)) return null;
  if (value.display_state === "stale" && (!value.stale || value.stale_reason_codes.length === 0)) return null;
  if (!hasContent && (value.stale || value.stale_reason_codes.length !== 0)) return null;
  return { ...(value as HermesDailyFarmBriefLatestCandidate), source_status: sourceStatus, limitations };
}

export function parseHermesDailyFarmBriefExecutionResult(value: unknown): HermesDailyFarmBriefExecutionResult | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schema_version", "execution_id", "generation_request_id", "business_date", "execution_requested_at", "executed_at", "status", "generation_decision", "brief_status", "snapshot_generated", "brief_generated", "scope_index_generated", "role_projection_generated", "role", "visible_scope_count", "source_status", "limitations", "failure_code", "latest_candidate", "persistence_source_fingerprint", "safety"])) return null;
  const decision = parseHermesDailyFarmBriefGenerationDecision(value.generation_decision);
  const sourceStatus = parseSourceStatus(value.source_status);
  const limitations = parseCodeArray(value.limitations);
  const candidate = value.latest_candidate === null ? null : parseHermesDailyFarmBriefLatestCandidate(value.latest_candidate);
  if (value.schema_version !== "hermes.daily_farm_brief.execution_result.v1" || !isId(value.execution_id) || !isId(value.generation_request_id) || decision === null || value.generation_request_id !== decision.request.request_id || !isHermesDailyFarmBusinessDate(value.business_date) || value.business_date !== decision.request.business_date || !isCanonicalIso(value.execution_requested_at) || !isCanonicalIso(value.executed_at) || Date.parse(value.execution_requested_at as string) < Date.parse(decision.request.requested_at) || Date.parse(value.execution_requested_at as string) > Date.parse(value.executed_at as string) || !["completed", "skipped", "failed_closed"].includes(String(value.status)) || ![null, "ready", "partial", "unavailable"].includes(value.brief_status as null | string) || ![value.snapshot_generated, value.brief_generated, value.scope_index_generated, value.role_projection_generated].every((flag) => typeof flag === "boolean") || !["administrator", "general_staff"].includes(String(value.role)) || !isCount(value.visible_scope_count) || sourceStatus === null || limitations === null || (value.failure_code !== null && !FAILURE_CODES.includes(value.failure_code as HermesDailyFarmBriefExecutionFailureCode)) || (value.latest_candidate !== null && candidate === null) || (value.persistence_source_fingerprint !== null && (typeof value.persistence_source_fingerprint !== "string" || !/^[0-9a-f]{64}$/u.test(value.persistence_source_fingerprint)))) return null;
  if (!isRecord(value.safety) || !hasExactKeys(value.safety, Object.keys(HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY)) || !Object.entries(HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY).every(([key, expected]) => value.safety[key] === expected)) return null;
  if (value.role_projection_generated && !value.scope_index_generated || value.scope_index_generated && !value.brief_generated || value.brief_generated && !value.snapshot_generated) return null;
  if (value.status === "completed") {
    if (decision.decision !== "generate" || !decision.should_execute_generation || value.brief_status === null || !value.snapshot_generated || !value.brief_generated || !value.scope_index_generated || !value.role_projection_generated || value.failure_code !== null || candidate === null || candidate.generated_at === null || value.persistence_source_fingerprint === null || Date.parse(candidate.generated_at) < Date.parse(value.execution_requested_at as string) || Date.parse(candidate.generated_at) > Date.parse(value.executed_at as string) || value.brief_status !== candidate.brief_status || value.visible_scope_count !== candidate.visible_scope_count || value.business_date !== candidate.business_date || value.role !== candidate.role || JSON.stringify(sourceStatus) !== JSON.stringify(candidate.source_status) || JSON.stringify(limitations) !== JSON.stringify(candidate.limitations)) return null;
  } else if (value.status === "skipped") {
    if (decision.decision === "generate" || value.snapshot_generated || value.brief_generated || value.scope_index_generated || value.role_projection_generated || value.brief_status !== null || value.visible_scope_count !== 0 || sourceStatus.length !== 0 || limitations.length !== 0 || value.failure_code !== "generation_not_authorized" || candidate !== null || value.persistence_source_fingerprint !== null) return null;
  } else if (decision.decision !== "generate" || value.failure_code === null || candidate !== null || value.brief_status !== null || value.visible_scope_count !== 0 || sourceStatus.length !== 0 || limitations.length !== 0 || value.persistence_source_fingerprint !== null) return null;
  return { ...(value as HermesDailyFarmBriefExecutionResult), generation_decision: decision, source_status: sourceStatus, limitations, latest_candidate: candidate };
}
