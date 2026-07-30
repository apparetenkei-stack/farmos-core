import {
  FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
  parseFarmOsProjectionFirstResponse,
  type FarmOsProjectionFirstResponse,
} from "./farm_os_projection_first_contract";

export type FarmOsProjectionFirstSlackBusinessDateDecision =
  | { result: "current_date"; business_date: string }
  | { result: "clarification_required"; business_date: string };

export type FarmOsProjectionFirstSlackMappedResponse = {
  status: FarmOsProjectionFirstResponse["result"];
  text: string;
};

const AMBIGUOUS_DATE_PATTERN =
  /(?:昨日|一昨日|明日|先週|先月|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}月\d{1,2}日)/u;

function tokyoCalendarDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function adaptFarmOsProjectionFirstSlackBusinessDate(input: {
  query: string;
  now: Date;
}): FarmOsProjectionFirstSlackBusinessDateDecision {
  const businessDate = tokyoCalendarDate(input.now);
  return AMBIGUOUS_DATE_PATTERN.test(input.query)
    ? { result: "clarification_required", business_date: businessDate }
    : { result: "current_date", business_date: businessDate };
}

export function createFarmOsProjectionFirstClarificationResponse(
  businessDate: string,
): FarmOsProjectionFirstResponse {
  return {
    contract_version: FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
    result: "clarification_required",
    mode_requested: "fast",
    mode_used: "none",
    answer: null,
    business_date: businessDate,
    projection_id: null,
    projection_status: "unavailable",
    as_of: null,
    grounding_refs: [],
    drilldown_used: false,
    response_guard: {
      status: "rejected",
      failure_codes: ["insufficient_grounding"],
    },
    writes_performed: false,
  };
}

export function mapFarmOsProjectionFirstResponseToSlack(
  value: unknown,
): FarmOsProjectionFirstSlackMappedResponse {
  const parsed = parseFarmOsProjectionFirstResponse(value);
  if (!parsed.valid) {
    return {
      status: "projection_unavailable",
      text: "農場情報を安全に取得できませんでした。",
    };
  }
  const response = parsed.value;
  if (
    response.result === "answered" &&
    response.response_guard.status === "passed" &&
    response.answer !== null
  ) {
    return { status: "answered", text: response.answer };
  }
  const text = response.result === "projection_missing"
    ? "指定日の確定済み農場Projectionがありません。"
    : response.result === "projection_stale"
    ? "指定日の農場情報は更新待ちのため回答できません。"
    : response.result === "clarification_required"
    ? "対象日または質問内容を明確にしてください。"
    : response.result === "deep_analysis_unavailable"
    ? "詳細分析機能は現在この経路では利用できません。"
    : response.result === "guard_rejected"
    ? "安全な根拠を確認できないため回答できません。"
    : "農場情報を安全に取得できませんでした。";
  return { status: response.result, text };
}
