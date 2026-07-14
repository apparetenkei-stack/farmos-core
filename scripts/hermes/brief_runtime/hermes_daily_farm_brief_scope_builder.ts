import { createHash } from "node:crypto";
import type { HermesDailyFarmBrief } from "./hermes_daily_farm_brief_contract";
import { parseHermesDailyFarmBrief } from "./hermes_daily_farm_brief_builder";
import { HERMES_DAILY_FARM_SOURCE_ORDER } from "./hermes_daily_farm_brief_policy";
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";
import {
  HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY,
  HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS,
  HERMES_DAILY_FARM_SCOPE_TYPE_ORDER,
  parseHermesDailyFarmBriefScopeIndex,
  type HermesDailyFarmBriefScope,
  type HermesDailyFarmBriefScopeIndex,
  type HermesDailyFarmBriefScopeType,
} from "./hermes_daily_farm_brief_scope_contract";
import { isSupportedHermesDailyFarmBriefTimezone } from "./hermes_daily_farm_brief_input";

export type HermesDailyFarmBriefScopeWorkLogInput = {
  id: string | number | null;
  field_id: string | number | null;
  target_crop: string | null;
  crop_cycle_id: string | number | null;
};

export type HermesDailyFarmBriefScopeCropCycleInput = {
  id: string | number | null;
  crop: string | null;
  field_id: string | number | null;
};

type MutableScope = {
  scope_type: HermesDailyFarmBriefScopeType;
  scope_key: string;
  display_label: string;
  source_refs: Set<"work_log" | "crop_cycle">;
  work_log_count: number;
  crop_cycle_count: number;
  work_log_ids: Set<string>;
  limitations: Set<string>;
  data_gaps: Set<string>;
};

const ID_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._:-]{0,127}$/u;

function canonicalIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function normalizeHermesDailyFarmBriefScopeId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  return ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeHermesDailyFarmBriefScopeCrop(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.text_chars && !/[\u0000-\u001f\u007f]/u.test(normalized) ? normalized : null;
}

function scopeKey(type: HermesDailyFarmBriefScopeType, explicitValue: string): string {
  return `${type}:${createHash("sha256").update(`${type}\0${explicitValue}`, "utf8").digest("hex").slice(0, 24)}`;
}

function validateWorkLog(value: unknown): value is HermesDailyFarmBriefScopeWorkLogInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 4 && ["id", "field_id", "target_crop", "crop_cycle_id"].every((key) => Object.hasOwn(record, key)) && (record.id === null || normalizeHermesDailyFarmBriefScopeId(record.id) !== null) && (record.field_id === null || normalizeHermesDailyFarmBriefScopeId(record.field_id) !== null) && (record.target_crop === null || typeof record.target_crop === "string") && (record.crop_cycle_id === null || normalizeHermesDailyFarmBriefScopeId(record.crop_cycle_id) !== null);
}

function validateCropCycle(value: unknown): value is HermesDailyFarmBriefScopeCropCycleInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 3 && ["id", "crop", "field_id"].every((key) => Object.hasOwn(record, key)) && (record.id === null || normalizeHermesDailyFarmBriefScopeId(record.id) !== null) && (record.crop === null || typeof record.crop === "string") && (record.field_id === null || normalizeHermesDailyFarmBriefScopeId(record.field_id) !== null);
}

function addScope(map: Map<string, MutableScope>, input: { type: HermesDailyFarmBriefScopeType; explicitValue: string; source: "work_log" | "crop_cycle"; recordId: string | null }): MutableScope {
  const key = scopeKey(input.type, input.explicitValue);
  let scope = map.get(key);
  if (!scope) {
    scope = {
      scope_type: input.type,
      scope_key: key,
      display_label: input.type === "crop" ? input.explicitValue : input.type === "field" ? "Field (redacted identifier)" : "Crop cycle (redacted identifier)",
      source_refs: new Set(),
      work_log_count: 0,
      crop_cycle_count: 0,
      work_log_ids: new Set(),
      limitations: new Set(),
      data_gaps: new Set(),
    };
    map.set(key, scope);
  }
  scope.source_refs.add(input.source);
  if (input.source === "work_log") {
    scope.work_log_count += 1;
    if (input.recordId !== null) scope.work_log_ids.add(input.recordId);
  } else {
    scope.crop_cycle_count += 1;
  }
  return scope;
}

function scopeLimit(type: HermesDailyFarmBriefScopeType): number {
  return type === "crop" ? HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.crop_scopes : type === "field" ? HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.field_scopes : HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.crop_cycle_scopes;
}

export function buildHermesDailyFarmBriefScopeIndex(input: {
  snapshot: HermesDailyFarmSnapshot;
  brief: HermesDailyFarmBrief;
  generatedAt: string;
  timezone: string;
  workLogs: HermesDailyFarmBriefScopeWorkLogInput[];
  cropCycles: HermesDailyFarmBriefScopeCropCycleInput[];
}): HermesDailyFarmBriefScopeIndex {
  const snapshot = parseHermesDailyFarmSnapshot(input.snapshot);
  const brief = parseHermesDailyFarmBrief(input.brief);
  if (!snapshot || !brief || brief.snapshot_id !== snapshot.snapshot_id || brief.status !== snapshot.status || !canonicalIso(input.generatedAt) || input.generatedAt !== brief.generated_at || !isSupportedHermesDailyFarmBriefTimezone(input.timezone) || !Array.isArray(input.workLogs) || input.workLogs.length > 1_000 || !input.workLogs.every(validateWorkLog) || !Array.isArray(input.cropCycles) || input.cropCycles.length > 1_000 || !input.cropCycles.every(validateCropCycle)) throw new Error("daily_farm_brief_scope_input_invalid");

  const scopes = new Map<string, MutableScope>();
  const cycleIds = new Set(input.cropCycles.map((record) => normalizeHermesDailyFarmBriefScopeId(record.id)).filter((value): value is string => value !== null));
  let unscopedWorkLogs = 0;
  let unscopedCropCycles = 0;
  let unresolvedFields = 0;
  let unresolvedCycles = 0;

  for (const record of input.workLogs) {
    const recordId = normalizeHermesDailyFarmBriefScopeId(record.id);
    const crop = normalizeHermesDailyFarmBriefScopeCrop(record.target_crop);
    const fieldId = normalizeHermesDailyFarmBriefScopeId(record.field_id);
    const cycleId = normalizeHermesDailyFarmBriefScopeId(record.crop_cycle_id);
    if (crop === null || fieldId === null || cycleId === null) unscopedWorkLogs += 1;
    const derived: MutableScope[] = [];
    if (crop !== null) derived.push(addScope(scopes, { type: "crop", explicitValue: crop, source: "work_log", recordId }));
    if (fieldId !== null) {
      unresolvedFields += 1;
      const scope = addScope(scopes, { type: "field", explicitValue: fieldId, source: "work_log", recordId });
      scope.limitations.add("independent_field_source_unavailable");
      derived.push(scope);
    }
    if (cycleId !== null) {
      if (cycleIds.has(cycleId)) derived.push(addScope(scopes, { type: "crop_cycle", explicitValue: cycleId, source: "work_log", recordId }));
      else {
        unresolvedCycles += 1;
        for (const scope of derived) scope.data_gaps.add("crop_cycle_reference_unresolved");
      }
    }
  }

  for (const record of input.cropCycles) {
    const recordId = normalizeHermesDailyFarmBriefScopeId(record.id);
    const crop = normalizeHermesDailyFarmBriefScopeCrop(record.crop);
    const fieldId = normalizeHermesDailyFarmBriefScopeId(record.field_id);
    if (recordId === null || crop === null || fieldId === null) unscopedCropCycles += 1;
    if (crop !== null) addScope(scopes, { type: "crop", explicitValue: crop, source: "crop_cycle", recordId });
    if (fieldId !== null) {
      unresolvedFields += 1;
      addScope(scopes, { type: "field", explicitValue: fieldId, source: "crop_cycle", recordId }).limitations.add("independent_field_source_unavailable");
    }
    if (recordId !== null) addScope(scopes, { type: "crop_cycle", explicitValue: recordId, source: "crop_cycle", recordId });
  }

  for (const type of HERMES_DAILY_FARM_SCOPE_TYPE_ORDER) if ([...scopes.values()].filter((scope) => scope.scope_type === type).length > scopeLimit(type)) throw new Error("daily_farm_brief_scope_limit_exceeded");

  const factByRecord = new Map<string, HermesDailyFarmBrief["facts"]>();
  for (const fact of brief.facts) if (fact.source_type === "work_log" && fact.source_record_id !== null) factByRecord.set(fact.source_record_id, [...(factByRecord.get(fact.source_record_id) ?? []), fact]);
  const canonicalScopes: HermesDailyFarmBriefScope[] = [...scopes.values()].map((scope) => {
    const facts = [...scope.work_log_ids].flatMap((id) => factByRecord.get(id) ?? []).slice(0, HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.facts_per_scope);
    return {
      scope_type: scope.scope_type,
      scope_key: scope.scope_key,
      display_label: scope.display_label,
      source_refs: HERMES_DAILY_FARM_SOURCE_ORDER.filter((source): source is "work_log" | "crop_cycle" => scope.source_refs.has(source as "work_log" | "crop_cycle")),
      work_log_count: scope.work_log_count,
      crop_cycle_count: scope.crop_cycle_count,
      inventory_fact_count: 0,
      warning_count: facts.filter((fact) => fact.severity === "warning").length,
      info_count: facts.filter((fact) => fact.severity === "info").length,
      limitation_codes: [...scope.limitations].sort(),
      data_gap_codes: [...scope.data_gaps].sort(),
    };
  }).sort((left, right) => HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.indexOf(left.scope_type) - HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.indexOf(right.scope_type) || left.scope_key.localeCompare(right.scope_key));

  const result: HermesDailyFarmBriefScopeIndex = {
    schema_version: "hermes.daily_farm_brief.scope_index.v1",
    generated_at: brief.generated_at,
    timezone: input.timezone,
    brief_status: brief.status,
    scopes: canonicalScopes,
    summary: {
      scope_count: canonicalScopes.length,
      crop_scope_count: canonicalScopes.filter((scope) => scope.scope_type === "crop").length,
      field_scope_count: canonicalScopes.filter((scope) => scope.scope_type === "field").length,
      crop_cycle_scope_count: canonicalScopes.filter((scope) => scope.scope_type === "crop_cycle").length,
      warning_count: canonicalScopes.reduce((sum, scope) => sum + scope.warning_count, 0),
      info_count: canonicalScopes.reduce((sum, scope) => sum + scope.info_count, 0),
      unscoped_work_log_count: unscopedWorkLogs,
      unscoped_crop_cycle_count: unscopedCropCycles,
      unresolved_field_reference_count: unresolvedFields,
      unresolved_crop_cycle_reference_count: unresolvedCycles,
    },
    limitations: [...new Set([...brief.limitations, ...(snapshot.sources.field.status === "unavailable" ? ["independent_field_source_unavailable"] : [])])].sort().slice(0, 50),
    safety: { ...HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY },
  };
  if (!parseHermesDailyFarmBriefScopeIndex(result)) throw new Error("daily_farm_brief_scope_result_invalid");
  return result;
}
