import { classifyHermesDailyFarmBriefWorkLogAttention } from "./hermes_daily_farm_brief_builder";
import {
  HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON,
  compareHermesDailyFarmBriefAttentionDetails,
  hermesDailyFarmBriefAttentionDetailSignature,
  parseHermesDailyFarmBriefAttentionDetails,
  type HermesDailyFarmBriefAttentionDetail,
} from "./hermes_daily_farm_brief_attention_detail_contract";
import { createHermesDailyFarmBriefScopeKey } from "./hermes_daily_farm_brief_scope_builder";
import {
  parseHermesDailyFarmBriefRoleProjection,
} from "./hermes_daily_farm_brief_scope_contract";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";

export const HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY = {
  persisted_snapshot_only: true,
  visible_scope_filter_applied: true,
  repository_read_performed: false,
  database_write_performed: false,
  proposal_write_performed: false,
  model_execution_performed: false,
  retry_performed: false,
  raw_identifier_exposed: false,
  raw_timestamp_exposed: false,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefAttentionDetailProjection = {
  details_by_scope: ReadonlyMap<string, readonly HermesDailyFarmBriefAttentionDetail[]>;
  safety: typeof HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY;
};

export function projectHermesDailyFarmBriefAttentionDetails(input: {
  snapshot: unknown;
  roleProjection: unknown;
}): HermesDailyFarmBriefAttentionDetailProjection | null {
  const snapshot = parseHermesDailyFarmSnapshot(input.snapshot);
  const roleProjection = parseHermesDailyFarmBriefRoleProjection(input.roleProjection);
  if (snapshot === null || roleProjection === null || snapshot.generated_at !== roleProjection.generated_at) return null;

  const visibleFieldScopes = new Set(
    roleProjection.scopes
      .filter((scope) => scope.scope_type === "field")
      .map((scope) => scope.scope_key),
  );
  const fieldLabels = new Map(
    snapshot.sources.field.records
      .filter((record): record is typeof record & { id: string; label: string } => record.id !== null && record.label !== null)
      .map((record) => [record.id, record.label]),
  );
  const candidates = new Map<string, HermesDailyFarmBriefAttentionDetail[]>();

  for (const record of snapshot.sources.work_log.records) {
    const reasonCode = classifyHermesDailyFarmBriefWorkLogAttention(record);
    if (reasonCode === null || record.field_id === null) continue;
    const scopeKey = createHermesDailyFarmBriefScopeKey("field", record.field_id);
    if (!visibleFieldScopes.has(scopeKey)) continue;
    const detail: HermesDailyFarmBriefAttentionDetail = {
      reason_code: reasonCode,
      reason: HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON[reasonCode],
      field_label: fieldLabels.get(record.field_id) ?? null,
      work_type_label: record.work_type_name,
      work_date: null,
      evidence_type: "work_log",
    };
    candidates.set(scopeKey, [...(candidates.get(scopeKey) ?? []), detail]);
  }

  const detailsByScope = new Map<string, readonly HermesDailyFarmBriefAttentionDetail[]>();
  for (const [scopeKey, details] of candidates) {
    const unique = [...new Map(details.map((detail) => [hermesDailyFarmBriefAttentionDetailSignature(detail), detail])).values()]
      .sort(compareHermesDailyFarmBriefAttentionDetails);
    const parsed = parseHermesDailyFarmBriefAttentionDetails(unique);
    if (parsed === null) return null;
    detailsByScope.set(scopeKey, parsed);
  }
  return {
    details_by_scope: detailsByScope,
    safety: HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY,
  };
}
