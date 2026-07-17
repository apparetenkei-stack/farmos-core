import { parseHermesDailyFarmBriefLatestCandidate, type HermesDailyFarmBriefLatestCandidate } from "./hermes_daily_farm_brief_execution_contract";
import { HERMES_DAILY_FARM_SOURCE_ORDER, type HermesDailyFarmSourceType } from "./hermes_daily_farm_brief_policy";
import {
  HERMES_DAILY_FARM_SCOPE_TYPE_ORDER,
  parseHermesDailyFarmBriefRoleProjection,
  type HermesDailyFarmBriefProjectionSourceStatus,
  type HermesDailyFarmBriefRoleProjection,
} from "./hermes_daily_farm_brief_scope_contract";
import {
  HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS,
  HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY,
  HERMES_DAILY_FARM_BRIEF_DISPLAY_SOURCE_LABELS,
  parseHermesDailyFarmBriefDisplayProjection,
  type HermesDailyFarmBriefDisplayAttentionItem,
  type HermesDailyFarmBriefDisplayPriority,
  type HermesDailyFarmBriefDisplayProjection,
  type HermesDailyFarmBriefDisplaySourceAvailability,
  HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_V2_SAFETY,
  parseHermesDailyFarmBriefDisplayProjectionV2,
  type HermesDailyFarmBriefDisplayProjectionV2,
} from "./hermes_daily_farm_brief_display_projection_contract";
import { projectHermesDailyFarmBriefAttentionDetails } from "./hermes_daily_farm_brief_attention_detail_projection";
import {
  compareHermesDailyFarmBriefAttentionDetails,
  hermesDailyFarmBriefAttentionDetailSignature,
} from "./hermes_daily_farm_brief_attention_detail_contract";

const LIMITATION_MAP = {
  independent_field_source_unavailable: "圃場情報の一部を独立した情報源から確認できません。",
  scope_access_limited: "権限により表示範囲が制限されています。",
  previous_business_date: "前営業日の情報を表示しています。",
  required_source_stale: "必要なデータの一部が古い可能性があります。",
  generated_at_stale: "Daily Briefの生成時刻が古い可能性があります。",
} as const;
const LIMITATION_ORDER = Object.keys(LIMITATION_MAP) as Array<keyof typeof LIMITATION_MAP>;

function availability(status: HermesDailyFarmBriefProjectionSourceStatus["status"]): HermesDailyFarmBriefDisplaySourceAvailability {
  if (status === "available" || status === "empty" || status === "limited" || status === "unavailable") return status;
  return status === "invalid" ? "unavailable" : "unknown";
}

function priorities(projection: HermesDailyFarmBriefRoleProjection): HermesDailyFarmBriefDisplayPriority[] {
  type PriorityCandidate = HermesDailyFarmBriefDisplayPriority & { scopeType: (typeof HERMES_DAILY_FARM_SCOPE_TYPE_ORDER)[number] };
  const candidates = projection.scopes.flatMap<PriorityCandidate>((scope) => {
    if (scope.warning_count > 0) return [{ scopeType: scope.scope_type, label: scope.display_label, detail: `確認事項が${scope.warning_count}件あります。`, severity: "attention" as const }];
    if (scope.info_count > 0) return [{ scopeType: scope.scope_type, label: scope.display_label, detail: `参考情報が${scope.info_count}件あります。`, severity: "info" as const }];
    return [];
  }).sort((left, right) => (left.severity === right.severity ? 0 : left.severity === "attention" ? -1 : 1) || HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.indexOf(left.scopeType) - HERMES_DAILY_FARM_SCOPE_TYPE_ORDER.indexOf(right.scopeType) || left.label.localeCompare(right.label));
  const seen = new Set<string>();
  return candidates.filter((item) => { const signature = `${item.label}\0${item.detail}\0${item.severity}`; if (seen.has(signature)) return false; seen.add(signature); return true; }).slice(0, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.priorities).map(({ label, detail, severity }) => ({ label, detail, severity }));
}

function attentionItems(candidate: HermesDailyFarmBriefLatestCandidate, projection: HermesDailyFarmBriefRoleProjection): HermesDailyFarmBriefDisplayAttentionItem[] {
  const items: HermesDailyFarmBriefDisplayAttentionItem[] = [];
  for (const sourceType of HERMES_DAILY_FARM_SOURCE_ORDER) {
    const source = projection.summary.source_status.find((item) => item.source_type === sourceType);
    if (!source) continue;
    const label = HERMES_DAILY_FARM_BRIEF_DISPLAY_SOURCE_LABELS[sourceType];
    const state = availability(source.status);
    if (state === "unavailable") items.push({ label, detail: "対象データを現在参照できません。", severity: "attention" });
    if (state === "limited") items.push({ label, detail: "権限により表示できる情報が制限されています。", severity: "attention" });
    if (source.freshness === "stale") items.push({ label, detail: "対象データが古い可能性があります。", severity: "attention" });
    if (source.freshness === "unknown") items.push({ label, detail: "対象データの更新時刻を確認できません。", severity: "attention" });
  }
  const staleDetails = { previous_business_date: "前営業日の情報を表示しています。", required_source_stale: "必要なデータの一部が古い可能性があります。", generated_at_stale: "Daily Briefの生成時刻が古い可能性があります。" } as const;
  for (const code of candidate.stale_reason_codes) items.push({ label: "Daily Brief", detail: staleDetails[code], severity: "attention" });
  const seen = new Set<string>();
  return items.filter((item) => { const signature = `${item.label}\0${item.detail}\0${item.severity}`; if (seen.has(signature)) return false; seen.add(signature); return true; }).slice(0, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.attention_items);
}

function limitations(candidate: HermesDailyFarmBriefLatestCandidate, projection: HermesDailyFarmBriefRoleProjection): string[] {
  const codes = new Set<string>([...projection.limitations, ...candidate.limitations, ...candidate.stale_reason_codes]);
  const output: string[] = LIMITATION_ORDER.filter((code) => codes.has(code)).map((code) => LIMITATION_MAP[code]);
  if ([...codes].some((code) => !Object.hasOwn(LIMITATION_MAP, code))) output.push("一部の情報を表示できません。");
  return [...new Set(output)].slice(0, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.limitations);
}

function sourceStatusMatches(candidate: HermesDailyFarmBriefLatestCandidate, projection: HermesDailyFarmBriefRoleProjection): boolean {
  return candidate.source_status.length === projection.summary.source_status.length && candidate.source_status.every((source, index) => {
    const projected = projection.summary.source_status[index];
    return source.source_type === projected.source_type && source.status === projected.status && source.freshness === projected.freshness && source.record_count === projected.record_count;
  });
}

export function createHermesDailyFarmBriefDisplayProjection(input: { latestCandidate: unknown; roleProjection: unknown }): HermesDailyFarmBriefDisplayProjection | null {
  const candidate = parseHermesDailyFarmBriefLatestCandidate(input.latestCandidate);
  const projection = parseHermesDailyFarmBriefRoleProjection(input.roleProjection);
  if (candidate === null || projection === null || !["current", "stale"].includes(candidate.display_state) || candidate.generated_at === null || candidate.brief_status === null || candidate.role !== projection.role || candidate.generated_at !== projection.generated_at || candidate.brief_status !== projection.brief_status || candidate.visible_scope_count !== projection.visible_scope_count || !sourceStatusMatches(candidate, projection)) return null;
  const warningCount = projection.summary.warning_count;
  const infoCount = projection.summary.info_count;
  const baseSummary = warningCount > 0 ? "表示可能な範囲に確認事項があります。" : infoCount > 0 ? "表示可能な範囲に参考情報があります。" : "表示可能な範囲に確認事項はありません。";
  const value = {
    schema_version: "hermes.daily_farm_brief.display_projection.v1",
    business_date: candidate.business_date,
    generated_at: candidate.generated_at,
    display_state: candidate.display_state,
    title: "今日の農場状況",
    summary: candidate.display_state === "stale" ? `${baseSummary}この情報は最新でない可能性があります。` : baseSummary,
    priorities: priorities(projection),
    attention_items: attentionItems(candidate, projection),
    source_disclosure: HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType: HermesDailyFarmSourceType) => {
      const source = projection.summary.source_status.find((item) => item.source_type === sourceType) as HermesDailyFarmBriefProjectionSourceStatus;
      const coverage = projection.summary.source_coverage.find((item) => item.source_type === sourceType);
      if (!coverage) throw new Error("daily_farm_brief_display_coverage_missing");
      return {
        source_type: sourceType,
        availability: availability(source.status),
        freshness: source.freshness,
        source_record_count: coverage.source_record_count,
        input_record_count: coverage.input_record_count,
        selected_fact_count: coverage.selected_fact_count,
        attention_count: coverage.attention_count,
        available_but_no_selected_facts: coverage.available_but_no_selected_facts,
        available_but_no_attention: coverage.available_but_no_attention,
      };
    }),
    limitations: limitations(candidate, projection),
    safety: HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY,
  };
  return parseHermesDailyFarmBriefDisplayProjection(value);
}

export function createHermesDailyFarmBriefDisplayProjectionV2(input: {
  latestCandidate: unknown;
  roleProjection: unknown;
  snapshot: unknown;
}): HermesDailyFarmBriefDisplayProjectionV2 | null {
  const v1 = createHermesDailyFarmBriefDisplayProjection(input);
  const roleProjection = parseHermesDailyFarmBriefRoleProjection(input.roleProjection);
  const attentionProjection = projectHermesDailyFarmBriefAttentionDetails({
    snapshot: input.snapshot,
    roleProjection: input.roleProjection,
  });
  if (v1 === null || roleProjection === null || attentionProjection === null) return null;

  const prioritiesV2 = v1.priorities.map((priority) => {
    const matchingScopes = roleProjection.scopes.filter((scope) => {
      const severity = scope.warning_count > 0 ? "attention" : scope.info_count > 0 ? "info" : null;
      const detail = scope.warning_count > 0
        ? `確認事項が${scope.warning_count}件あります。`
        : scope.info_count > 0
          ? `参考情報が${scope.info_count}件あります。`
          : null;
      return scope.display_label === priority.label && severity === priority.severity && detail === priority.detail;
    });
    const details = matchingScopes
      .flatMap((scope) => attentionProjection.details_by_scope.get(scope.scope_key) ?? [])
      .sort(compareHermesDailyFarmBriefAttentionDetails);
    const unique = [...new Map(details.map((detail) => [hermesDailyFarmBriefAttentionDetailSignature(detail), detail])).values()];
    return { ...priority, attention_details: unique };
  });
  return parseHermesDailyFarmBriefDisplayProjectionV2({
    ...v1,
    schema_version: "hermes.daily_farm_brief.display_projection.v2",
    priorities: prioritiesV2,
    safety: HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_V2_SAFETY,
  });
}
