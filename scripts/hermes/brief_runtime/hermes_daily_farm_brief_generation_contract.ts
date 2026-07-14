import {
  HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY,
  HERMES_DAILY_FARM_BRIEF_TIMEZONE,
} from "./hermes_daily_farm_brief_generation_policy";
import {
  HERMES_DAILY_FARM_SOURCE_ORDER,
  type HermesDailyFarmFreshness,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";

export type HermesDailyFarmBriefGenerationTrigger = "scheduled" | "manual";
export type HermesDailyFarmBriefGenerationRole =
  | "system"
  | "administrator"
  | "general_staff";

export type HermesDailyFarmBriefGenerationRequest = {
  schema_version: "hermes.daily_farm_brief.generation_request.v1";
  trigger_type: HermesDailyFarmBriefGenerationTrigger;
  requested_at: string;
  timezone: typeof HERMES_DAILY_FARM_BRIEF_TIMEZONE;
  business_date: string;
  request_id: string;
  force_regeneration: boolean;
  requested_by_role: HermesDailyFarmBriefGenerationRole;
  authorization_verified: boolean;
};

export type HermesDailyFarmBriefExistingSourceFreshness = {
  source_type: HermesDailyFarmSourceType;
  freshness: HermesDailyFarmFreshness;
};

export type HermesDailyFarmBriefExistingState = {
  schema_version: "hermes.daily_farm_brief.existing_state.v1";
  business_date: string;
  brief_id: string | null;
  generated_at: string | null;
  brief_status: "ready" | "partial" | "unavailable" | null;
  source_freshness: HermesDailyFarmBriefExistingSourceFreshness[] | null;
  generation_status: "none" | "completed" | "failed" | "in_progress";
  generation_request_id: string | null;
  generation_retry_count: number;
};

export type HermesDailyFarmBriefScheduleEvaluation = {
  schema_version: "hermes.daily_farm_brief.schedule_evaluation.v1";
  configured: boolean;
  within_schedule_window: boolean;
  schedule_window_start: string | null;
  schedule_window_end: string | null;
  reason_code:
    | "schedule_not_configured"
    | "schedule_within_window"
    | "schedule_outside_window";
};

export const HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY = {
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
  external_fetch_performed: false,
  secret_exposed: false,
  client_business_date_override_allowed: false,
  client_role_override_allowed: false,
  client_force_override_allowed: false,
  duplicate_prevention_enforced: true,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefGenerationDecision = {
  schema_version: "hermes.daily_farm_brief.generation_decision.v1";
  decision:
    | "generate"
    | "reuse_existing"
    | "reject_duplicate"
    | "reject_unauthorized"
    | "reject_invalid_state"
    | "wait_in_progress"
    | "fail_closed";
  reason_code:
    | "scheduled_first_generation"
    | "manual_first_generation"
    | "same_day_completed_exists"
    | "same_day_generation_in_progress"
    | "manual_force_regeneration_allowed"
    | "manual_regeneration_not_authorized"
    | "scheduled_generation_not_authorized"
    | "existing_state_invalid"
    | "existing_brief_stale"
    | "previous_generation_failed"
    | "scheduled_retry_limit_reached"
    | "business_date_mismatch"
    | "schedule_not_configured"
    | "schedule_outside_window"
    | "generation_request_invalid";
  request: HermesDailyFarmBriefGenerationRequest;
  existing_state_summary: {
    business_date: string;
    generation_status: HermesDailyFarmBriefExistingState["generation_status"];
    brief_status: HermesDailyFarmBriefExistingState["brief_status"];
    has_brief: boolean;
    generation_retry_count: number;
  } | null;
  schedule: HermesDailyFarmBriefScheduleEvaluation | null;
  should_execute_generation: boolean;
  should_reuse_existing: boolean;
  should_show_stale: boolean;
  duplicate_prevented: boolean;
  stale_reason_codes: ("previous_business_date" | "required_source_stale" | "generated_at_stale")[];
  stale_reason_count: number;
  stale_age_days: number | null;
  stale_source_types: HermesDailyFarmSourceType[];
  safety: typeof HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY;
};

type JsonRecord = Record<string, unknown>;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function isHermesDailyFarmBusinessDate(value: unknown): value is string {
  if (typeof value !== "string" || !BUSINESS_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value;
}

export function deriveHermesDailyFarmBusinessDate(requestedAt: string): string | null {
  if (!isCanonicalIso(requestedAt)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HERMES_DAILY_FARM_BRIEF_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(requestedAt));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function parseHermesDailyFarmBriefGenerationRequest(
  value: unknown,
): HermesDailyFarmBriefGenerationRequest | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schema_version", "trigger_type", "requested_at", "timezone", "business_date",
    "request_id", "force_regeneration", "requested_by_role", "authorization_verified",
  ])) return null;
  if (
    value.schema_version !== "hermes.daily_farm_brief.generation_request.v1" ||
    !["scheduled", "manual"].includes(String(value.trigger_type)) ||
    !isCanonicalIso(value.requested_at) ||
    value.timezone !== HERMES_DAILY_FARM_BRIEF_TIMEZONE ||
    !isHermesDailyFarmBusinessDate(value.business_date) ||
    value.business_date !== deriveHermesDailyFarmBusinessDate(value.requested_at as string) ||
    typeof value.request_id !== "string" || !ID_PATTERN.test(value.request_id) ||
    typeof value.force_regeneration !== "boolean" ||
    !["system", "administrator", "general_staff"].includes(String(value.requested_by_role)) ||
    typeof value.authorization_verified !== "boolean"
  ) return null;
  if (value.trigger_type === "scheduled" && (value.requested_by_role !== "system" || value.force_regeneration !== false)) return null;
  if (value.trigger_type === "manual" && value.requested_by_role === "system") return null;
  if (value.force_regeneration && (value.trigger_type !== "manual" || value.requested_by_role !== "administrator" || value.authorization_verified !== true)) return null;
  return { ...(value as HermesDailyFarmBriefGenerationRequest) };
}

function parseFreshness(value: unknown): HermesDailyFarmBriefExistingSourceFreshness[] | null {
  if (!Array.isArray(value) || value.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length) return null;
  const parsed: HermesDailyFarmBriefExistingSourceFreshness[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (!isRecord(item) || !hasExactKeys(item, ["source_type", "freshness"]) || item.source_type !== HERMES_DAILY_FARM_SOURCE_ORDER[index] || !["fresh", "stale", "unknown"].includes(String(item.freshness))) return null;
    parsed.push({ source_type: item.source_type as HermesDailyFarmSourceType, freshness: item.freshness as HermesDailyFarmFreshness });
  }
  return parsed;
}

export function parseHermesDailyFarmBriefExistingState(
  value: unknown,
): HermesDailyFarmBriefExistingState | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "schema_version", "business_date", "brief_id", "generated_at", "brief_status",
    "source_freshness", "generation_status", "generation_request_id", "generation_retry_count",
  ])) return null;
  if (
    value.schema_version !== "hermes.daily_farm_brief.existing_state.v1" ||
    !isHermesDailyFarmBusinessDate(value.business_date) ||
    !["none", "completed", "failed", "in_progress"].includes(String(value.generation_status)) ||
    !Number.isInteger(value.generation_retry_count) || Number(value.generation_retry_count) < 0 || Number(value.generation_retry_count) > 100
  ) return null;
  const optionalId = (candidate: unknown) => candidate === null || (typeof candidate === "string" && ID_PATTERN.test(candidate));
  if (!optionalId(value.brief_id) || !optionalId(value.generation_request_id)) return null;
  const status = value.generation_status;
  if (status === "completed") {
    const freshness = parseFreshness(value.source_freshness);
    if (typeof value.brief_id !== "string" || !isCanonicalIso(value.generated_at) || !["ready", "partial", "unavailable"].includes(String(value.brief_status)) || freshness === null || typeof value.generation_request_id !== "string") return null;
    return { ...(value as HermesDailyFarmBriefExistingState), source_freshness: freshness };
  }
  if (value.brief_id !== null || value.generated_at !== null || value.brief_status !== null || value.source_freshness !== null) return null;
  if (status === "none") {
    if (value.generation_request_id !== null || value.generation_retry_count !== 0) return null;
  } else if (typeof value.generation_request_id !== "string") return null;
  return { ...(value as HermesDailyFarmBriefExistingState) };
}

export function parseHermesDailyFarmBriefScheduleEvaluation(
  value: unknown,
): HermesDailyFarmBriefScheduleEvaluation | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schema_version", "configured", "within_schedule_window", "schedule_window_start", "schedule_window_end", "reason_code"])) return null;
  if (value.schema_version !== "hermes.daily_farm_brief.schedule_evaluation.v1" || typeof value.configured !== "boolean" || typeof value.within_schedule_window !== "boolean" || !["schedule_not_configured", "schedule_within_window", "schedule_outside_window"].includes(String(value.reason_code))) return null;
  if (!value.configured) return value.within_schedule_window === false && value.schedule_window_start === null && value.schedule_window_end === null && value.reason_code === "schedule_not_configured" ? value as HermesDailyFarmBriefScheduleEvaluation : null;
  if (!isCanonicalIso(value.schedule_window_start) || !isCanonicalIso(value.schedule_window_end) || Date.parse(value.schedule_window_start) >= Date.parse(value.schedule_window_end)) return null;
  if ((value.within_schedule_window && value.reason_code !== "schedule_within_window") || (!value.within_schedule_window && value.reason_code !== "schedule_outside_window")) return null;
  return { ...(value as HermesDailyFarmBriefScheduleEvaluation) };
}

const DECISIONS = ["generate", "reuse_existing", "reject_duplicate", "reject_unauthorized", "reject_invalid_state", "wait_in_progress", "fail_closed"];
const REASONS = ["scheduled_first_generation", "manual_first_generation", "same_day_completed_exists", "same_day_generation_in_progress", "manual_force_regeneration_allowed", "manual_regeneration_not_authorized", "scheduled_generation_not_authorized", "existing_state_invalid", "existing_brief_stale", "previous_generation_failed", "scheduled_retry_limit_reached", "business_date_mismatch", "schedule_not_configured", "schedule_outside_window", "generation_request_invalid"];

export function parseHermesDailyFarmBriefGenerationDecision(value: unknown): HermesDailyFarmBriefGenerationDecision | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schema_version", "decision", "reason_code", "request", "existing_state_summary", "schedule", "should_execute_generation", "should_reuse_existing", "should_show_stale", "duplicate_prevented", "stale_reason_codes", "stale_reason_count", "stale_age_days", "stale_source_types", "safety"])) return null;
  const request = parseHermesDailyFarmBriefGenerationRequest(value.request);
  if (value.schema_version !== "hermes.daily_farm_brief.generation_decision.v1" || !DECISIONS.includes(String(value.decision)) || !REASONS.includes(String(value.reason_code)) || request === null) return null;
  if (![value.should_execute_generation, value.should_reuse_existing, value.should_show_stale, value.duplicate_prevented].every((item) => typeof item === "boolean") || (value.should_execute_generation && value.should_reuse_existing)) return null;
  if (!Array.isArray(value.stale_reason_codes) || value.stale_reason_codes.some((code) => !["previous_business_date", "required_source_stale", "generated_at_stale"].includes(String(code))) || new Set(value.stale_reason_codes).size !== value.stale_reason_codes.length || value.stale_reason_count !== value.stale_reason_codes.length) return null;
  const staleReasonOrder = ["previous_business_date", "required_source_stale", "generated_at_stale"];
  if (value.stale_reason_codes.some((code, index) => index > 0 && staleReasonOrder.indexOf(String(value.stale_reason_codes[index - 1])) >= staleReasonOrder.indexOf(String(code)))) return null;
  if (value.should_show_stale !== (value.stale_reason_codes.length > 0) || (value.stale_age_days !== null && (!Number.isInteger(value.stale_age_days) || Number(value.stale_age_days) < 0))) return null;
  if (!Array.isArray(value.stale_source_types) || value.stale_source_types.some((type) => !HERMES_DAILY_FARM_SOURCE_ORDER.includes(type as HermesDailyFarmSourceType)) || value.stale_source_types.some((type, index) => index > 0 && HERMES_DAILY_FARM_SOURCE_ORDER.indexOf(value.stale_source_types[index - 1] as HermesDailyFarmSourceType) >= HERMES_DAILY_FARM_SOURCE_ORDER.indexOf(type as HermesDailyFarmSourceType))) return null;
  if (value.schedule !== null && parseHermesDailyFarmBriefScheduleEvaluation(value.schedule) === null) return null;
  if (value.existing_state_summary !== null) {
    if (!isRecord(value.existing_state_summary) || !hasExactKeys(value.existing_state_summary, ["business_date", "generation_status", "brief_status", "has_brief", "generation_retry_count"]) || !isHermesDailyFarmBusinessDate(value.existing_state_summary.business_date) || !["none", "completed", "failed", "in_progress"].includes(String(value.existing_state_summary.generation_status)) || ![null, "ready", "partial", "unavailable"].includes(value.existing_state_summary.brief_status as null | string) || typeof value.existing_state_summary.has_brief !== "boolean" || !Number.isInteger(value.existing_state_summary.generation_retry_count)) return null;
    const completed = value.existing_state_summary.generation_status === "completed";
    if (value.existing_state_summary.has_brief !== completed || (completed ? value.existing_state_summary.brief_status === null : value.existing_state_summary.brief_status !== null)) return null;
  }
  if (!isRecord(value.safety) || !hasExactKeys(value.safety, Object.keys(HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY)) || !Object.entries(HERMES_DAILY_FARM_BRIEF_GENERATION_SAFETY).every(([key, expected]) => value.safety[key] === expected)) return null;
  const expectedDecisionFlags: Record<string, [boolean, boolean]> = {
    generate: [true, false], reuse_existing: [false, true], reject_duplicate: [false, false], reject_unauthorized: [false, false], reject_invalid_state: [false, false], wait_in_progress: [false, false], fail_closed: [false, false],
  };
  const [execute, reuse] = expectedDecisionFlags[String(value.decision)];
  if (value.should_execute_generation !== execute || value.should_reuse_existing !== reuse) return null;
  const allowedReasonsByDecision: Record<string, readonly string[]> = {
    generate: ["scheduled_first_generation", "manual_first_generation", "manual_force_regeneration_allowed", "previous_generation_failed"],
    reuse_existing: ["same_day_completed_exists", "existing_brief_stale"],
    reject_duplicate: ["same_day_completed_exists", "existing_brief_stale"],
    reject_unauthorized: ["manual_regeneration_not_authorized", "scheduled_generation_not_authorized"],
    reject_invalid_state: ["existing_state_invalid", "business_date_mismatch"],
    wait_in_progress: ["same_day_generation_in_progress"],
    fail_closed: ["scheduled_retry_limit_reached", "schedule_not_configured", "schedule_outside_window", "generation_request_invalid"],
  };
  if (!allowedReasonsByDecision[String(value.decision)].includes(String(value.reason_code))) return null;
  if ((request.trigger_type === "scheduled") !== (value.schedule !== null)) return null;
  const hasRequiredStaleReason = value.stale_reason_codes.includes("required_source_stale");
  if (hasRequiredStaleReason !== (value.stale_source_types.length > 0) || value.stale_source_types.some((type) => type !== "inventory" && type !== "work_log")) return null;
  const hasPreviousDayReason = value.stale_reason_codes.includes("previous_business_date");
  if (hasPreviousDayReason !== (value.stale_age_days !== null)) return null;
  const duplicateReasons = ["same_day_completed_exists", "existing_brief_stale", "same_day_generation_in_progress", "manual_force_regeneration_allowed", "previous_generation_failed", "scheduled_retry_limit_reached"];
  if (value.duplicate_prevented !== duplicateReasons.includes(String(value.reason_code))) return null;
  return { ...(value as HermesDailyFarmBriefGenerationDecision), request };
}

export const HERMES_DAILY_FARM_BRIEF_MAXIMUM_SCHEDULED_RETRY_COUNT =
  HERMES_DAILY_FARM_BRIEF_GENERATION_POLICY.maximum_scheduled_retry_count;
