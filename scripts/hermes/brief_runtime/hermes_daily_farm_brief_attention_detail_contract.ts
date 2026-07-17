import { isHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";

export const HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON = {
  work_log_started_at_missing: "作業開始日時が入力されていません。",
  work_log_started_at_invalid: "作業開始日時の形式を確認してください。",
} as const;

export type HermesDailyFarmBriefAttentionReasonCode =
  keyof typeof HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON;

export type HermesDailyFarmBriefAttentionDetail = {
  reason_code: HermesDailyFarmBriefAttentionReasonCode;
  reason: (typeof HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON)[HermesDailyFarmBriefAttentionReasonCode];
  field_label: string | null;
  work_type_label: string | null;
  work_date: string | null;
  evidence_type: "work_log";
};

type JsonRecord = Record<string, unknown>;
const KEYS = [
  "reason_code",
  "reason",
  "field_label",
  "work_type_label",
  "work_date",
  "evidence_type",
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isSafeNullableLabel(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string" || value.length === 0 || value.length > 120 || /[\u0000-\u001f\u007f]/u.test(value)) return false;
  if (/<\/?[A-Za-z][^>]*>/u.test(value)) return false;
  const trimmed = value.trim();
  return !((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")));
}

export function hermesDailyFarmBriefAttentionDetailSignature(
  detail: HermesDailyFarmBriefAttentionDetail,
): string {
  return [
    detail.reason_code,
    detail.field_label ?? "",
    detail.work_type_label ?? "",
    detail.work_date ?? "",
    detail.evidence_type,
  ].join("\0");
}

export function compareHermesDailyFarmBriefAttentionDetails(
  left: HermesDailyFarmBriefAttentionDetail,
  right: HermesDailyFarmBriefAttentionDetail,
): number {
  return hermesDailyFarmBriefAttentionDetailSignature(left).localeCompare(
    hermesDailyFarmBriefAttentionDetailSignature(right),
  );
}

export function parseHermesDailyFarmBriefAttentionDetail(
  value: unknown,
): HermesDailyFarmBriefAttentionDetail | null {
  if (!isRecord(value) || !hasExactKeys(value, KEYS)) return null;
  if (!Object.hasOwn(HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON, String(value.reason_code))) return null;
  const reasonCode = value.reason_code as HermesDailyFarmBriefAttentionReasonCode;
  if (value.reason !== HERMES_DAILY_FARM_BRIEF_ATTENTION_REASON[reasonCode]) return null;
  if (!isSafeNullableLabel(value.field_label) || !isSafeNullableLabel(value.work_type_label)) return null;
  if (value.work_date !== null && !isHermesDailyFarmBusinessDate(value.work_date)) return null;
  if (value.evidence_type !== "work_log") return null;
  return value as HermesDailyFarmBriefAttentionDetail;
}

export function parseHermesDailyFarmBriefAttentionDetails(
  value: unknown,
): HermesDailyFarmBriefAttentionDetail[] | null {
  if (!Array.isArray(value) || value.length > 10) return null;
  const details = value.map(parseHermesDailyFarmBriefAttentionDetail);
  if (details.some((detail) => detail === null)) return null;
  const canonical = details as HermesDailyFarmBriefAttentionDetail[];
  if (new Set(canonical.map(hermesDailyFarmBriefAttentionDetailSignature)).size !== canonical.length) return null;
  if (canonical.some((detail, index) => index > 0 && compareHermesDailyFarmBriefAttentionDetails(canonical[index - 1], detail) >= 0)) return null;
  return canonical;
}
