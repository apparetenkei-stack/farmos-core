import {
  isCanonicalIso,
  isHermesDailyFarmBusinessDate,
} from "./hermes_daily_farm_brief_generation_contract";
import {
  HERMES_DAILY_FARM_SOURCE_ORDER,
  type HermesDailyFarmFreshness,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";

export const HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS = {
  title_chars: 120,
  summary_chars: 500,
  priority_label_chars: 120,
  priority_detail_chars: 300,
  attention_label_chars: 120,
  attention_detail_chars: 300,
  priorities: 10,
  attention_items: 10,
  source_disclosure: HERMES_DAILY_FARM_SOURCE_ORDER.length,
  limitations: 20,
  limitation_text_chars: 300,
} as const;

export const HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY = {
  server_owned_projection: true,
  role_filter_applied: true,
  scope_filter_applied: true,
  raw_identifier_exposed: false,
  raw_record_exposed: false,
  raw_fact_exposed: false,
  internal_code_exposed: false,
  credential_exposed: false,
  database_write_performed: false,
  proposal_write_performed: false,
  model_execution_performed: false,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefDisplaySeverity = "info" | "attention";
export type HermesDailyFarmBriefDisplaySourceAvailability = "available" | "empty" | "limited" | "unavailable" | "unknown";
export type HermesDailyFarmBriefDisplayPriority = { label: string; detail: string; severity: HermesDailyFarmBriefDisplaySeverity };
export type HermesDailyFarmBriefDisplayAttentionItem = { label: string; detail: string; severity: "attention" };
export type HermesDailyFarmBriefDisplaySourceDisclosure = { source_type: HermesDailyFarmSourceType; availability: HermesDailyFarmBriefDisplaySourceAvailability; freshness: HermesDailyFarmFreshness };
export type HermesDailyFarmBriefDisplayProjection = {
  schema_version: "hermes.daily_farm_brief.display_projection.v1";
  business_date: string;
  generated_at: string;
  display_state: "current" | "stale";
  title: string;
  summary: string;
  priorities: HermesDailyFarmBriefDisplayPriority[];
  attention_items: HermesDailyFarmBriefDisplayAttentionItem[];
  source_disclosure: HermesDailyFarmBriefDisplaySourceDisclosure[];
  limitations: string[];
  safety: typeof HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY;
};

type JsonRecord = Record<string, unknown>;
const SUMMARY_VALUES = [
  "表示可能な範囲に確認事項があります。",
  "表示可能な範囲に参考情報があります。",
  "表示可能な範囲に確認事項はありません。",
  "表示可能な範囲に確認事項があります。この情報は最新でない可能性があります。",
  "表示可能な範囲に参考情報があります。この情報は最新でない可能性があります。",
  "表示可能な範囲に確認事項はありません。この情報は最新でない可能性があります。",
] as const;
export const HERMES_DAILY_FARM_BRIEF_DISPLAY_ATTENTION_DETAILS = [
  "対象データを現在参照できません。",
  "権限により表示できる情報が制限されています。",
  "対象データが古い可能性があります。",
  "対象データの更新時刻を確認できません。",
  "前営業日の情報を表示しています。",
  "必要なデータの一部が古い可能性があります。",
  "Daily Briefの生成時刻が古い可能性があります。",
] as const;
export const HERMES_DAILY_FARM_BRIEF_DISPLAY_LIMITATION_TEXTS = [
  "圃場情報の一部を独立した情報源から確認できません。",
  "権限により表示範囲が制限されています。",
  "前営業日の情報を表示しています。",
  "必要なデータの一部が古い可能性があります。",
  "Daily Briefの生成時刻が古い可能性があります。",
  "一部の情報を表示できません。",
] as const;
export const HERMES_DAILY_FARM_BRIEF_DISPLAY_SOURCE_LABELS: Readonly<Record<HermesDailyFarmSourceType, string>> = {
  inventory: "在庫", work_log: "作業記録", field: "圃場", crop_cycle: "作付け", hermes_note: "Hermesメモ",
};

function isRecord(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: JsonRecord, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function safeText(value: unknown, maximum: number): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) return false;
  if (/<\/?[A-Za-z][^>]*>/u.test(value)) return false;
  const trimmed = value.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) return false;
  return true;
}
function countDetail(detail: string, severity: HermesDailyFarmBriefDisplaySeverity): boolean {
  const match = severity === "attention" ? /^確認事項が([1-9]\d{0,6})件あります。$/u.exec(detail) : /^参考情報が([1-9]\d{0,6})件あります。$/u.exec(detail);
  return match !== null && Number(match[1]) <= 1_000_000;
}
function duplicateFree<T>(items: T[], signature: (item: T) => string): boolean { return new Set(items.map(signature)).size === items.length; }

export function parseHermesDailyFarmBriefDisplayProjection(value: unknown): HermesDailyFarmBriefDisplayProjection | null {
  try {
    const projection = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(projection) || !exact(projection, ["schema_version", "business_date", "generated_at", "display_state", "title", "summary", "priorities", "attention_items", "source_disclosure", "limitations", "safety"]) || projection.schema_version !== "hermes.daily_farm_brief.display_projection.v1" || !isHermesDailyFarmBusinessDate(projection.business_date) || !isCanonicalIso(projection.generated_at) || !["current", "stale"].includes(String(projection.display_state)) || projection.title !== "今日の農場状況" || !safeText(projection.title, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.title_chars) || !safeText(projection.summary, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.summary_chars) || !SUMMARY_VALUES.includes(projection.summary as typeof SUMMARY_VALUES[number])) return null;
    if (!Array.isArray(projection.priorities) || projection.priorities.length > HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.priorities) return null;
    const priorities: HermesDailyFarmBriefDisplayPriority[] = [];
    for (const raw of projection.priorities) {
      if (!isRecord(raw) || !exact(raw, ["label", "detail", "severity"]) || !safeText(raw.label, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.priority_label_chars) || !safeText(raw.detail, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.priority_detail_chars) || !["attention", "info"].includes(String(raw.severity)) || !countDetail(raw.detail, raw.severity as HermesDailyFarmBriefDisplaySeverity)) return null;
      priorities.push(raw as HermesDailyFarmBriefDisplayPriority);
    }
    if (!duplicateFree(priorities, (item) => `${item.label}\0${item.detail}\0${item.severity}`) || priorities.some((item, index) => index > 0 && priorities[index - 1].severity === "info" && item.severity === "attention")) return null;
    if (!Array.isArray(projection.attention_items) || projection.attention_items.length > HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.attention_items) return null;
    const attentionItems: HermesDailyFarmBriefDisplayAttentionItem[] = [];
    for (const raw of projection.attention_items) {
      if (!isRecord(raw) || !exact(raw, ["label", "detail", "severity"]) || !safeText(raw.label, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.attention_label_chars) || ![...Object.values(HERMES_DAILY_FARM_BRIEF_DISPLAY_SOURCE_LABELS), "Daily Brief"].includes(raw.label as string) || !safeText(raw.detail, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.attention_detail_chars) || !HERMES_DAILY_FARM_BRIEF_DISPLAY_ATTENTION_DETAILS.includes(raw.detail as typeof HERMES_DAILY_FARM_BRIEF_DISPLAY_ATTENTION_DETAILS[number]) || raw.severity !== "attention") return null;
      attentionItems.push(raw as HermesDailyFarmBriefDisplayAttentionItem);
    }
    if (!duplicateFree(attentionItems, (item) => `${item.label}\0${item.detail}\0${item.severity}`)) return null;
    if (!Array.isArray(projection.source_disclosure) || projection.source_disclosure.length !== HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.source_disclosure) return null;
    const disclosure: HermesDailyFarmBriefDisplaySourceDisclosure[] = [];
    for (let index = 0; index < projection.source_disclosure.length; index += 1) {
      const raw = projection.source_disclosure[index];
      if (!isRecord(raw) || !exact(raw, ["source_type", "availability", "freshness"]) || raw.source_type !== HERMES_DAILY_FARM_SOURCE_ORDER[index] || !["available", "empty", "limited", "unavailable", "unknown"].includes(String(raw.availability)) || !["fresh", "stale", "unknown"].includes(String(raw.freshness))) return null;
      disclosure.push(raw as HermesDailyFarmBriefDisplaySourceDisclosure);
    }
    if (!duplicateFree(disclosure, (item) => item.source_type)) return null;
    if (!Array.isArray(projection.limitations) || projection.limitations.length > HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.limitations || projection.limitations.some((item) => !safeText(item, HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_LIMITS.limitation_text_chars) || !HERMES_DAILY_FARM_BRIEF_DISPLAY_LIMITATION_TEXTS.includes(item as typeof HERMES_DAILY_FARM_BRIEF_DISPLAY_LIMITATION_TEXTS[number])) || new Set(projection.limitations).size !== projection.limitations.length) return null;
    if (!isRecord(projection.safety) || !exact(projection.safety, Object.keys(HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY)) || !Object.entries(HERMES_DAILY_FARM_BRIEF_DISPLAY_PROJECTION_SAFETY).every(([key, expected]) => projection.safety[key] === expected)) return null;
    return { ...(projection as HermesDailyFarmBriefDisplayProjection), priorities, attention_items: attentionItems, source_disclosure: disclosure, limitations: [...projection.limitations] };
  } catch { return null; }
}
