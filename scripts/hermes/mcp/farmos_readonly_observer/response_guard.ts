import {
  FARM_STATUS_MAX_RESPONSE_BYTES,
  FARM_STATUS_SCHEMA_VERSION,
  type FarmStatusResponse,
} from "./contract";

export const FARMOS_HERMES_GUARD_MAX_ANSWER_CHARS = 4_000 as const;

export type FarmosHermesGuardInput = {
  tool_result: FarmStatusResponse;
  hermes_answer: string;
};

export type FarmosHermesGuardViolationCode =
  | "DATE_MISMATCH"
  | "RELATIVE_DATE_USED"
  | "WORK_STATUS_INFERRED"
  | "PLAN_STATUS_INFERRED"
  | "RESTOCK_REQUIREMENT_INFERRED"
  | "RAW_CONTRACT_TERM_EXPOSED"
  | "INTERNAL_MARKER_EXPOSED"
  | "ANSWER_EMPTY"
  | "ANSWER_TOO_LONG";

export type FarmosHermesGuardResult =
  | {
      result: "valid";
      final_text: string;
      fallback_used: false;
      violation_codes: [];
    }
  | {
      result: "fallback";
      final_text: string;
      fallback_used: true;
      violation_codes: FarmosHermesGuardViolationCode[];
    };

const RELATIVE_DATE_TERMS = ["今日", "明日", "明後日", "翌日", "昨日"] as const;
const RAW_CONTRACT_TERMS = [
  "completion_verified",
  "record_state",
  "planning_data_available",
  "timestamp_semantics",
  "calendar_semantics",
  "work_log_semantics",
  "presentation_ja",
  "quantity",
  "stock_state",
] as const;
const WORK_STATUS_TERMS =
  /完了した|完了済み|終了した|実施中|進行中|作業中/u;
const PLAN_STATUS_TERMS =
  /予定があります|予定はありません|予定なし|実施予定|行う予定/u;
const RESTOCK_REQUIREMENT_TERMS =
  /補充が必要|購入が必要|発注が必要|不足している/u;
const JAPANESE_DATE_PATTERN = /\d{4}年\d{1,2}月\d{1,2}日/gu;

function withoutExactStatement(value: string, statement: string): string {
  return value.split(statement).join("");
}

function withoutSafeRestockCautions(
  value: string,
  exactStatement: string,
): string {
  return withoutExactStatement(value, exactStatement).replace(
    /補充が必要かどうかは判断できません[。.]?/gu,
    "",
  );
}

function extractJapaneseDates(value: string): string[] {
  return value.match(JAPANESE_DATE_PATTERN) ?? [];
}

function hasDateMismatch(
  answer: string,
  toolResult: FarmStatusResponse,
): boolean {
  const expected = [
    toolResult.calendar_semantics.current_date_label_ja,
    toolResult.calendar_semantics.tomorrow_date_label_ja,
  ];
  const actual = extractJapaneseDates(answer);
  return (
    expected.some((date) => !answer.includes(date)) ||
    actual.some((date) => !expected.includes(date))
  );
}

function includesAny(value: string, terms: readonly string[]): boolean {
  const lowerValue = value.toLocaleLowerCase("en-US");
  return terms.some((term) =>
    lowerValue.includes(term.toLocaleLowerCase("en-US"))
  );
}

function safeDisplayName(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.slice(0, 120);
  if (
    includesAny(normalized, [...RELATIVE_DATE_TERMS, ...RAW_CONTRACT_TERMS]) ||
    /<MCP__|mcp__/iu.test(normalized) ||
    WORK_STATUS_TERMS.test(normalized) ||
    PLAN_STATUS_TERMS.test(normalized) ||
    RESTOCK_REQUIREMENT_TERMS.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function deterministicFallback(toolResult: FarmStatusResponse): string {
  const workNames = toolResult.recent_work_logs
    .map((record) => safeDisplayName(record.work_name))
    .filter((name): name is string => name !== null)
    .slice(0, 5);
  const remainingItemCapacity = 5 - workNames.length;
  const inventoryRows = toolResult.inventory_summary
    .map((record) => {
      const name = safeDisplayName(record.item_name);
      if (name === null) return null;
      const amount =
        record.quantity === null ? "数量不明" : String(record.quantity);
      const unit = safeDisplayName(record.unit);
      return `   ・${name}：${amount}${unit === null ? "" : ` ${unit}`}`;
    })
    .filter((row): row is string => row !== null)
    .slice(0, remainingItemCapacity);

  const workItems =
    workNames.length === 0
      ? ["   参照できる作業名はありません。"]
      : workNames.map((name) => `   ・${name}`);
  const inventoryItems =
    inventoryRows.length === 0
      ? ["   参照できる在庫名はありません。"]
      : inventoryRows;

  const sections = [
    toolResult.presentation_ja.date_statement,
    [
      `1. ${toolResult.presentation_ja.work_log_heading}`,
      ...workItems,
      `   ${toolResult.presentation_ja.work_status_caution}`,
    ].join("\n"),
    [
      "2. 在庫",
      ...inventoryItems,
      `   ${toolResult.presentation_ja.inventory_caution}`,
    ].join("\n"),
    `3. ${toolResult.presentation_ja.confirmed_plan_statement}`,
  ];
  const result = sections.join("\n\n");
  if (Buffer.byteLength(result, "utf8") > FARM_STATUS_MAX_RESPONSE_BYTES) {
    throw new Error("deterministic fallback exceeded response limit");
  }
  return result;
}

export function guardFarmosHermesResponse(
  input: FarmosHermesGuardInput,
): FarmosHermesGuardResult {
  if (input.tool_result.schema_version !== FARM_STATUS_SCHEMA_VERSION) {
    throw new TypeError("FarmStatusResponse is required");
  }
  const answer = input.hermes_answer.trim();
  const fallback = () => deterministicFallback(input.tool_result);
  if (answer.length === 0) {
    return {
      result: "fallback",
      final_text: fallback(),
      fallback_used: true,
      violation_codes: ["ANSWER_EMPTY"],
    };
  }
  if (answer.length > FARMOS_HERMES_GUARD_MAX_ANSWER_CHARS) {
    return {
      result: "fallback",
      final_text: fallback(),
      fallback_used: true,
      violation_codes: ["ANSWER_TOO_LONG"],
    };
  }

  const violations: FarmosHermesGuardViolationCode[] = [];
  if (includesAny(answer, RELATIVE_DATE_TERMS)) {
    violations.push("RELATIVE_DATE_USED");
  }
  if (hasDateMismatch(answer, input.tool_result)) {
    violations.push("DATE_MISMATCH");
  }
  if (
    input.tool_result.work_log_semantics.completion_status_available === false &&
    WORK_STATUS_TERMS.test(
      withoutExactStatement(
        answer,
        input.tool_result.presentation_ja.work_status_caution,
      ),
    )
  ) {
    violations.push("WORK_STATUS_INFERRED");
  }
  if (
    input.tool_result.work_log_semantics.planning_data_available === false &&
    PLAN_STATUS_TERMS.test(
      withoutExactStatement(
        answer,
        input.tool_result.presentation_ja.confirmed_plan_statement,
      ),
    )
  ) {
    violations.push("PLAN_STATUS_INFERRED");
  }
  if (
    RESTOCK_REQUIREMENT_TERMS.test(
      withoutSafeRestockCautions(
        answer,
        input.tool_result.presentation_ja.inventory_caution,
      ),
    )
  ) {
    violations.push("RESTOCK_REQUIREMENT_INFERRED");
  }
  if (includesAny(answer, RAW_CONTRACT_TERMS)) {
    violations.push("RAW_CONTRACT_TERM_EXPOSED");
  }
  if (/<MCP__|mcp__/iu.test(answer)) {
    violations.push("INTERNAL_MARKER_EXPOSED");
  }

  if (violations.length === 0) {
    return {
      result: "valid",
      final_text: answer,
      fallback_used: false,
      violation_codes: [],
    };
  }
  return {
    result: "fallback",
    final_text: fallback(),
    fallback_used: true,
    violation_codes: violations,
  };
}
