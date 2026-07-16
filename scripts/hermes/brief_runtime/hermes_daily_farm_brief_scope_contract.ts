import type { HermesDailyFarmBrief } from "./hermes_daily_farm_brief_contract";
import {
  HERMES_DAILY_FARM_SOURCE_ORDER,
  type HermesDailyFarmFreshness,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";
import type { HermesDailyFarmSourceStatus } from "./hermes_daily_farm_snapshot_contract";
import { isSupportedHermesDailyFarmBriefTimezone } from "./hermes_daily_farm_brief_input";
import {
  parseHermesDailyFarmBriefSourceSelectionCoverage,
  type HermesDailyFarmBriefSourceSelectionCoverage,
} from "./hermes_daily_farm_brief_source_coverage_contract";

export const HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS = {
  crop_scopes: 50,
  field_scopes: 100,
  crop_cycle_scopes: 100,
  facts_per_scope: 10,
  limitations_per_scope: 20,
  data_gaps_per_scope: 20,
  allowed_scope_keys: 200,
  text_chars: 120,
  scope_key_chars: 80,
} as const;

export const HERMES_DAILY_FARM_SCOPE_TYPE_ORDER = [
  "crop",
  "field",
  "crop_cycle",
] as const;

export type HermesDailyFarmBriefScopeType =
  (typeof HERMES_DAILY_FARM_SCOPE_TYPE_ORDER)[number];
export type HermesDailyFarmBriefRole = "administrator" | "general_staff";

export type HermesDailyFarmBriefScope = {
  scope_type: HermesDailyFarmBriefScopeType;
  scope_key: string;
  display_label: string;
  source_refs: HermesDailyFarmSourceType[];
  work_log_count: number;
  crop_cycle_count: number;
  inventory_fact_count: number;
  warning_count: number;
  info_count: number;
  limitation_codes: string[];
  data_gap_codes: string[];
};

export type HermesDailyFarmBriefScopeIndex = {
  schema_version: "hermes.daily_farm_brief.scope_index.v1";
  generated_at: string;
  timezone: string;
  brief_status: HermesDailyFarmBrief["status"];
  scopes: HermesDailyFarmBriefScope[];
  summary: {
    scope_count: number;
    crop_scope_count: number;
    field_scope_count: number;
    crop_cycle_scope_count: number;
    warning_count: number;
    info_count: number;
    unscoped_work_log_count: number;
    unscoped_crop_cycle_count: number;
    unresolved_field_reference_count: number;
    unresolved_crop_cycle_reference_count: number;
    source_coverage?: HermesDailyFarmBriefSourceSelectionCoverage[];
  };
  limitations: string[];
  safety: HermesDailyFarmBriefProjectionSafety;
};

export type HermesDailyFarmBriefProjectionSafety = {
  database_write_performed: false;
  app_db_write_performed: false;
  core_db_write_performed: false;
  proposal_created: false;
  proposal_saved: false;
  proposal_apply_performed: false;
  audit_write_performed: false;
  notification_performed: false;
  queue_operation_performed: false;
  worker_claim_performed: false;
  model_execution_performed: false;
  brief_persistence_performed: false;
  secret_exposed: false;
  client_role_override_allowed: false;
  client_scope_override_allowed: false;
  fail_closed: true;
};

export type HermesDailyFarmBriefProjectionSourceStatus = {
  source_type: HermesDailyFarmSourceType;
  status: HermesDailyFarmSourceStatus | "limited";
  freshness: HermesDailyFarmFreshness;
  record_count: number | null;
};

export type HermesDailyFarmBriefProjectionSourceCoverage = {
  source_type: HermesDailyFarmSourceType;
  status: HermesDailyFarmSourceStatus | "limited";
  freshness: HermesDailyFarmFreshness;
  source_record_count: number | null;
  input_record_count: number | null;
  selected_fact_count: number | null;
  attention_count: number | null;
  available_but_no_selected_facts: boolean | null;
  available_but_no_attention: boolean | null;
};

export type HermesDailyFarmBriefRoleProjection = {
  schema_version: "hermes.daily_farm_brief.role_projection.v1";
  role: HermesDailyFarmBriefRole;
  generated_at: string;
  timezone: string;
  brief_status: HermesDailyFarmBrief["status"];
  visible_scope_count: number;
  scopes: HermesDailyFarmBriefScope[];
  summary: {
    crop_scope_count: number;
    field_scope_count: number;
    crop_cycle_scope_count: number;
    warning_count: number;
    info_count: number;
    source_status: HermesDailyFarmBriefProjectionSourceStatus[];
    unscoped_work_log_count: number | null;
    unscoped_crop_cycle_count: number | null;
    unresolved_field_reference_count: number | null;
    unresolved_crop_cycle_reference_count: number | null;
    source_coverage: HermesDailyFarmBriefProjectionSourceCoverage[];
  };
  limitations: string[];
  safety: HermesDailyFarmBriefProjectionSafety;
};

type JsonRecord = Record<string, unknown>;

export const HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY = {
  database_write_performed: false,
  app_db_write_performed: false,
  core_db_write_performed: false,
  proposal_created: false,
  proposal_saved: false,
  proposal_apply_performed: false,
  audit_write_performed: false,
  notification_performed: false,
  queue_operation_performed: false,
  worker_claim_performed: false,
  model_execution_performed: false,
  brief_persistence_performed: false,
  secret_exposed: false,
  client_role_override_allowed: false,
  client_scope_override_allowed: false,
  fail_closed: true,
} as const satisfies HermesDailyFarmBriefProjectionSafety;

const SOURCE_STATUSES = ["available", "empty", "unavailable", "invalid", "limited"];
const FRESHNESS = ["fresh", "stale", "unknown"];
const CODE_PATTERN = /^[a-z][a-z0-9_]{0,119}$/u;
const SCOPE_KEY_PATTERN = /^(crop|field|crop_cycle):[a-f0-9]{24}$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isCount(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000;
}

function isCodeArray(value: unknown, limit: number): value is string[] {
  return Array.isArray(value) && value.length <= limit && value.every((item) => typeof item === "string" && CODE_PATTERN.test(item)) && new Set(value).size === value.length && value.every((item, index) => index === 0 || value[index - 1].localeCompare(item) < 0);
}

function compareScopes(left: HermesDailyFarmBriefScope, right: HermesDailyFarmBriefScope): number {
  return HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.indexOf(left.scope_type) - HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.indexOf(right.scope_type) || left.scope_key.localeCompare(right.scope_key);
}

export function parseHermesDailyFarmBriefScope(value: unknown): HermesDailyFarmBriefScope | null {
  if (!isRecord(value) || !hasExactKeys(value, ["scope_type", "scope_key", "display_label", "source_refs", "work_log_count", "crop_cycle_count", "inventory_fact_count", "warning_count", "info_count", "limitation_codes", "data_gap_codes"]) || !HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.includes(value.scope_type as HermesDailyFarmBriefScopeType) || typeof value.scope_key !== "string" || value.scope_key.length > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.scope_key_chars || !SCOPE_KEY_PATTERN.test(value.scope_key) || !value.scope_key.startsWith(`${String(value.scope_type)}:`) || typeof value.display_label !== "string" || value.display_label.length === 0 || value.display_label.length > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.text_chars || /[\u0000-\u001f\u007f]/u.test(value.display_label) || !Array.isArray(value.source_refs) || value.source_refs.length === 0 || value.source_refs.some((item) => !["inventory", "work_log", "crop_cycle"].includes(String(item))) || new Set(value.source_refs).size !== value.source_refs.length || !value.source_refs.every((item, index) => index === 0 || HERMES_DAILY_FARM_SOURCE_ORDER.indexOf(value.source_refs[index - 1] as HermesDailyFarmSourceType) < HERMES_DAILY_FARM_SOURCE_ORDER.indexOf(item as HermesDailyFarmSourceType)) || !isCount(value.work_log_count) || !isCount(value.crop_cycle_count) || !isCount(value.inventory_fact_count) || !isCount(value.warning_count) || !isCount(value.info_count) || Number(value.warning_count) + Number(value.info_count) > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.facts_per_scope || Number(value.inventory_fact_count) > Number(value.warning_count) + Number(value.info_count) || value.source_refs.includes("work_log") !== (Number(value.work_log_count) > 0) || value.source_refs.includes("crop_cycle") !== (Number(value.crop_cycle_count) > 0) || value.source_refs.includes("inventory") !== (Number(value.inventory_fact_count) > 0) || !isCodeArray(value.limitation_codes, HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.limitations_per_scope) || !isCodeArray(value.data_gap_codes, HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.data_gaps_per_scope)) return null;
  return value as HermesDailyFarmBriefScope;
}

function validateSafety(value: unknown): value is HermesDailyFarmBriefProjectionSafety {
  return isRecord(value) && hasExactKeys(value, Object.keys(HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY)) && Object.entries(HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY).every(([key, expected]) => value[key] === expected);
}

function validateScopeArray(value: unknown): value is HermesDailyFarmBriefScope[] {
  if (!Array.isArray(value) || value.length > 250) return false;
  const scopes = value.map(parseHermesDailyFarmBriefScope);
  if (scopes.some((scope) => scope === null)) return false;
  const canonical = scopes as HermesDailyFarmBriefScope[];
  if (new Set(canonical.map((scope) => scope.scope_key)).size !== canonical.length) return false;
  if (canonical.filter((scope) => scope.scope_type === "crop").length > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.crop_scopes || canonical.filter((scope) => scope.scope_type === "field").length > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.field_scopes || canonical.filter((scope) => scope.scope_type === "crop_cycle").length > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.crop_cycle_scopes) return false;
  return canonical.every((scope, index) => index === 0 || compareScopes(canonical[index - 1], scope) < 0);
}

export function parseHermesDailyFarmBriefScopeIndex(value: unknown): HermesDailyFarmBriefScopeIndex | null {
  try {
    const index = typeof value === "string" ? JSON.parse(value) : value;
    const summaryKeys = ["scope_count", "crop_scope_count", "field_scope_count", "crop_cycle_scope_count", "warning_count", "info_count", "unscoped_work_log_count", "unscoped_crop_cycle_count", "unresolved_field_reference_count", "unresolved_crop_cycle_reference_count"];
    if (!isRecord(index) || !hasExactKeys(index, ["schema_version", "generated_at", "timezone", "brief_status", "scopes", "summary", "limitations", "safety"]) || index.schema_version !== "hermes.daily_farm_brief.scope_index.v1" || !isCanonicalIso(index.generated_at) || !isSupportedHermesDailyFarmBriefTimezone(index.timezone) || !["ready", "partial", "unavailable"].includes(String(index.brief_status)) || !validateScopeArray(index.scopes) || !isRecord(index.summary) || !(hasExactKeys(index.summary, summaryKeys) || hasExactKeys(index.summary, [...summaryKeys, "source_coverage"])) || !summaryKeys.every((key) => isCount(index.summary[key])) || (Object.hasOwn(index.summary, "source_coverage") && !validateCanonicalSelectionCoverageArray(index.summary.source_coverage)) || !isCodeArray(index.limitations, 50) || !validateSafety(index.safety)) return null;
    const scopes = index.scopes as HermesDailyFarmBriefScope[];
    const summary = index.summary;
    if (summary.scope_count !== scopes.length || summary.crop_scope_count !== scopes.filter((scope) => scope.scope_type === "crop").length || summary.field_scope_count !== scopes.filter((scope) => scope.scope_type === "field").length || summary.crop_cycle_scope_count !== scopes.filter((scope) => scope.scope_type === "crop_cycle").length || summary.warning_count !== scopes.reduce((sum, scope) => sum + scope.warning_count, 0) || summary.info_count !== scopes.reduce((sum, scope) => sum + scope.info_count, 0)) return null;
    return index as HermesDailyFarmBriefScopeIndex;
  } catch { return null; }
}

export function parseHermesDailyFarmBriefAllowedScopeKeys(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.allowed_scope_keys || value.some((item) => typeof item !== "string" || item === "*" || !SCOPE_KEY_PATTERN.test(item))) return null;
  return [...new Set(value)].sort((left, right) => left.localeCompare(right));
}

function parseSourceStatus(value: unknown): HermesDailyFarmBriefProjectionSourceStatus | null {
  if (!isRecord(value) || !hasExactKeys(value, ["source_type", "status", "freshness", "record_count"]) || !HERMES_DAILY_FARM_SOURCE_ORDER.includes(value.source_type as HermesDailyFarmSourceType) || !SOURCE_STATUSES.includes(String(value.status)) || !FRESHNESS.includes(String(value.freshness)) || (value.record_count !== null && !isCount(value.record_count))) return null;
  return value as HermesDailyFarmBriefProjectionSourceStatus;
}

function validateCanonicalSourceStatusArray(
  value: unknown,
): value is HermesDailyFarmBriefProjectionSourceStatus[] {
  if (
    !Array.isArray(value) ||
    value.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length
  ) {
    return false;
  }

  const parsed = value.map(parseSourceStatus);
  if (parsed.some((item) => item === null)) {
    return false;
  }

  return parsed.every(
    (item, index) =>
      item?.source_type === HERMES_DAILY_FARM_SOURCE_ORDER[index],
  );
}

function validateCanonicalSelectionCoverageArray(
  value: unknown,
): value is HermesDailyFarmBriefSourceSelectionCoverage[] {
  if (!Array.isArray(value) || value.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length) return false;
  const parsed = value.map(parseHermesDailyFarmBriefSourceSelectionCoverage);
  return parsed.every(
    (item, index) => item?.source_type === HERMES_DAILY_FARM_SOURCE_ORDER[index],
  );
}

function parseProjectionSourceCoverage(
  value: unknown,
): HermesDailyFarmBriefProjectionSourceCoverage | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "source_type",
    "status",
    "freshness",
    "source_record_count",
    "input_record_count",
    "selected_fact_count",
    "attention_count",
    "available_but_no_selected_facts",
    "available_but_no_attention",
  ]) || !HERMES_DAILY_FARM_SOURCE_ORDER.includes(value.source_type as HermesDailyFarmSourceType) || !SOURCE_STATUSES.includes(String(value.status)) || !FRESHNESS.includes(String(value.freshness))) return null;
  const metrics = [value.source_record_count, value.input_record_count, value.selected_fact_count, value.attention_count];
  const flags = [value.available_but_no_selected_facts, value.available_but_no_attention];
  if (metrics.some((item) => item !== null && !isCount(item)) || flags.some((item) => item !== null && typeof item !== "boolean")) return null;
  if (metrics.every((item) => item !== null)) {
    const full = parseHermesDailyFarmBriefSourceSelectionCoverage({
      schema_version: "hermes.daily_farm_brief.source_selection_coverage.v1",
      ...value,
    });
    if (full === null) return null;
  } else if (!metrics.every((item) => item === null) || !flags.every((item) => item === null)) {
    return null;
  }
  return value as HermesDailyFarmBriefProjectionSourceCoverage;
}

function validateCanonicalProjectionCoverageArray(
  value: unknown,
): value is HermesDailyFarmBriefProjectionSourceCoverage[] {
  if (!Array.isArray(value) || value.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length) return false;
  const parsed = value.map(parseProjectionSourceCoverage);
  return parsed.every(
    (item, index) => item?.source_type === HERMES_DAILY_FARM_SOURCE_ORDER[index],
  );
}

export function parseHermesDailyFarmBriefRoleProjection(value: unknown): HermesDailyFarmBriefRoleProjection | null {
  try {
    const projection = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(projection) || !hasExactKeys(projection, ["schema_version", "role", "generated_at", "timezone", "brief_status", "visible_scope_count", "scopes", "summary", "limitations", "safety"]) || projection.schema_version !== "hermes.daily_farm_brief.role_projection.v1" || !["administrator", "general_staff"].includes(String(projection.role)) || !isCanonicalIso(projection.generated_at) || !isSupportedHermesDailyFarmBriefTimezone(projection.timezone) || !["ready", "partial", "unavailable"].includes(String(projection.brief_status)) || !isCount(projection.visible_scope_count) || !validateScopeArray(projection.scopes) || projection.visible_scope_count !== projection.scopes.length || !isRecord(projection.summary) || !hasExactKeys(projection.summary, ["crop_scope_count", "field_scope_count", "crop_cycle_scope_count", "warning_count", "info_count", "source_status", "unscoped_work_log_count", "unscoped_crop_cycle_count", "unresolved_field_reference_count", "unresolved_crop_cycle_reference_count", "source_coverage"]) || !validateCanonicalSourceStatusArray(projection.summary.source_status) || !validateCanonicalProjectionCoverageArray(projection.summary.source_coverage) || !isCodeArray(projection.limitations, 50) || !validateSafety(projection.safety)) return null;
    const scopes = projection.scopes as HermesDailyFarmBriefScope[];
    const summary = projection.summary;
    if (![summary.crop_scope_count, summary.field_scope_count, summary.crop_cycle_scope_count, summary.warning_count, summary.info_count].every(isCount) || summary.crop_scope_count !== scopes.filter((scope) => scope.scope_type === "crop").length || summary.field_scope_count !== scopes.filter((scope) => scope.scope_type === "field").length || summary.crop_cycle_scope_count !== scopes.filter((scope) => scope.scope_type === "crop_cycle").length || summary.warning_count !== scopes.reduce((sum, scope) => sum + scope.warning_count, 0) || summary.info_count !== scopes.reduce((sum, scope) => sum + scope.info_count, 0)) return null;
    const diagnostics = [summary.unscoped_work_log_count, summary.unscoped_crop_cycle_count, summary.unresolved_field_reference_count, summary.unresolved_crop_cycle_reference_count];
    if (projection.role === "administrator" ? diagnostics.some((item) => !isCount(item)) : diagnostics.some((item) => item !== null)) return null;
    const statuses = summary.source_status as HermesDailyFarmBriefProjectionSourceStatus[];
    if (projection.role === "administrator" ? statuses.some((item) => item.status === "limited" || item.record_count === null) : statuses.some((item) => item.record_count !== null || (item.status !== "available" && item.status !== "empty" && item.status !== "limited"))) return null;
    const coverage = summary.source_coverage as HermesDailyFarmBriefProjectionSourceCoverage[];
    if (projection.role === "administrator" ? coverage.some((item) => item.status === "limited") : coverage.some((item) => item.source_record_count !== null || !["available", "empty", "limited"].includes(item.status))) return null;
    if (coverage.some((item, index) => item.source_type !== statuses[index].source_type || item.status !== statuses[index].status || item.freshness !== statuses[index].freshness || (projection.role === "administrator" && item.source_record_count !== null && item.source_record_count !== statuses[index].record_count))) return null;
    return projection as HermesDailyFarmBriefRoleProjection;
  } catch { return null; }
}
