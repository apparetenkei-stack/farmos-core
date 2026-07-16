import { HERMES_DAILY_FARM_SOURCE_ORDER } from "./hermes_daily_farm_brief_policy";
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";
import {
  HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY,
  parseHermesDailyFarmBriefAllowedScopeKeys,
  parseHermesDailyFarmBriefRoleProjection,
  parseHermesDailyFarmBriefScopeIndex,
  type HermesDailyFarmBriefRole,
  type HermesDailyFarmBriefRoleProjection,
  type HermesDailyFarmBriefScopeIndex,
} from "./hermes_daily_farm_brief_scope_contract";

export function buildHermesDailyFarmBriefRoleProjection(input: {
  scopeIndex: HermesDailyFarmBriefScopeIndex;
  snapshot: HermesDailyFarmSnapshot;
  role: HermesDailyFarmBriefRole;
  allowedScopeKeys: unknown;
}): HermesDailyFarmBriefRoleProjection {
  const scopeIndex = parseHermesDailyFarmBriefScopeIndex(input.scopeIndex);
  const snapshot = parseHermesDailyFarmSnapshot(input.snapshot);
  const allowedScopeKeys = parseHermesDailyFarmBriefAllowedScopeKeys(input.allowedScopeKeys);
  if (!scopeIndex || !snapshot || allowedScopeKeys === null || !["administrator", "general_staff"].includes(input.role) || snapshot.status !== scopeIndex.brief_status) throw new Error("daily_farm_brief_role_projection_input_invalid");

  const allowed = new Set(allowedScopeKeys);
  const scopes = input.role === "administrator" ? scopeIndex.scopes.map((scope) => structuredClone(scope)) : scopeIndex.scopes.filter((scope) => allowed.has(scope.scope_key)).map((scope) => structuredClone(scope));
  const administrator = input.role === "administrator";
  const limitations = administrator ? [...scopeIndex.limitations] : [...new Set([...(scopes.some((scope) => scope.limitation_codes.includes("independent_field_source_unavailable")) ? ["independent_field_source_unavailable"] : []), "scope_access_limited"])].sort();
  const projection: HermesDailyFarmBriefRoleProjection = {
    schema_version: "hermes.daily_farm_brief.role_projection.v1",
    role: input.role,
    generated_at: scopeIndex.generated_at,
    timezone: scopeIndex.timezone,
    brief_status: scopeIndex.brief_status,
    visible_scope_count: scopes.length,
    scopes,
    summary: {
      crop_scope_count: scopes.filter((scope) => scope.scope_type === "crop").length,
      field_scope_count: scopes.filter((scope) => scope.scope_type === "field").length,
      crop_cycle_scope_count: scopes.filter((scope) => scope.scope_type === "crop_cycle").length,
      warning_count: scopes.reduce((sum, scope) => sum + scope.warning_count, 0),
      info_count: scopes.reduce((sum, scope) => sum + scope.info_count, 0),
      source_status: HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType) => {
        const source = snapshot.sources[sourceType];
        return {
          source_type: sourceType,
          status: administrator ? source.status : source.status === "available" || source.status === "empty" ? source.status : "limited",
          freshness: source.freshness,
          record_count: administrator ? source.record_count : null,
        };
      }),
      unscoped_work_log_count: administrator ? scopeIndex.summary.unscoped_work_log_count : null,
      unscoped_crop_cycle_count: administrator ? scopeIndex.summary.unscoped_crop_cycle_count : null,
      unresolved_field_reference_count: administrator ? scopeIndex.summary.unresolved_field_reference_count : null,
      unresolved_crop_cycle_reference_count: administrator ? scopeIndex.summary.unresolved_crop_cycle_reference_count : null,
      source_coverage: HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType) => {
        const source = snapshot.sources[sourceType];
        const coverage = scopeIndex.summary.source_coverage?.find(
          (item) => item.source_type === sourceType,
        );
        if (coverage === undefined) {
          return {
            source_type: sourceType,
            status:
              administrator || source.status === "available" || source.status === "empty"
                ? source.status
                : "limited" as const,
            freshness: source.freshness,
            source_record_count: null,
            input_record_count: null,
            selected_fact_count: null,
            attention_count: null,
            available_but_no_selected_facts: null,
            available_but_no_attention: null,
          };
        }
        if (administrator) {
          const { schema_version: _schemaVersion, ...visibleCoverage } = coverage;
          return visibleCoverage;
        }
        return {
          source_type: coverage.source_type,
          status:
            source.status === "available" || source.status === "empty"
              ? source.status
              : "limited" as const,
          freshness: source.freshness,
          source_record_count: null,
          input_record_count: null,
          selected_fact_count: null,
          attention_count: null,
          available_but_no_selected_facts: null,
          available_but_no_attention: null,
        };
      }),
    },
    limitations,
    safety: { ...HERMES_DAILY_FARM_BRIEF_PROJECTION_SAFETY },
  };
  if (!parseHermesDailyFarmBriefRoleProjection(projection)) throw new Error("daily_farm_brief_role_projection_result_invalid");
  return projection;
}
