import assert from "node:assert/strict";

import {
  FARM_STATUS_MAX_RESPONSE_BYTES,
  type FarmStatusResponse,
  validateFarmStatusToolResult,
} from "./mcp/farmos_readonly_observer/contract";
import {
  FARMOS_HERMES_GUARD_MAX_ANSWER_CHARS,
  guardFarmosHermesResponse,
  type FarmosHermesGuardViolationCode,
} from "./mcp/farmos_readonly_observer/response_guard";

const toolResult: FarmStatusResponse = {
  schema_version: "farmos.readonly_observer.farm_status.v1",
  generated_at: "2026-07-28T00:00:00.000Z",
  timezone: "Asia/Tokyo",
  current_date: "2026-07-28",
  tomorrow_date: "2026-07-29",
  calendar_semantics: {
    current_date_verified: true,
    tomorrow_date_verified: true,
    tomorrow_is_next_calendar_day: true,
    current_date_label_ja: "2026年7月28日",
    tomorrow_date_label_ja: "2026年7月29日",
    response_rules: [
      "use_verified_date_labels",
      "do_not_recalculate_calendar_dates",
      "do_not_expose_internal_field_names",
    ],
  },
  presentation_ja: {
    schema_version: "farmos.readonly_observer.presentation.ja.v1",
    date_statement: "基準日は2026年7月28日です。",
    work_log_heading: "最近記録された作業",
    work_status_caution:
      "これらの記録が完了済みであることは、この情報源だけでは確認できません。",
    confirmed_plan_statement:
      "2026年7月29日の確定予定は、この情報源から確認できません。",
    inventory_caution:
      "在庫数量が0でも、この情報だけで補充が必要とは判断できません。",
    rendering_rules: [
      "use_absolute_dates_only",
      "copy_presentation_text_without_date_recalculation",
      "do_not_expose_internal_field_names",
      "do_not_infer_completion",
      "do_not_infer_confirmed_plans",
      "do_not_infer_restock_requirement",
    ],
  },
  recent_work_logs: [
    {
      work_name: "作業A",
      crop_name: null,
      field_name: null,
      started_at: null,
      record_state: "recorded",
      completion_verified: false,
      timestamp_semantics: "source_timestamp_timezone_unverified",
      note: null,
    },
    {
      work_name: "作業B",
      crop_name: null,
      field_name: null,
      started_at: null,
      record_state: "recorded",
      completion_verified: false,
      timestamp_semantics: "source_timestamp_timezone_unverified",
      note: null,
    },
  ],
  work_log_semantics: {
    represents: "recent_recorded_work",
    completed_work_only: false,
    completion_status_available: false,
    planning_data_available: false,
    interpretation_rules: [
      "recorded_does_not_mean_completed",
      "started_at_does_not_verify_completion",
      "work_log_does_not_mean_work_plan",
    ],
  },
  inventory_summary: [
    {
      item_name: "資材A",
      quantity: 0,
      unit: "kg",
      stock_state: "zero",
    },
    {
      item_name: "資材B",
      quantity: 2,
      unit: null,
      stock_state: "positive",
    },
  ],
  data_gaps: [],
  safety: {
    read_only: true,
    database_write_performed: false,
    proposal_created: false,
    approval_performed: false,
    apply_performed: false,
    credentials_exposed: false,
    raw_internal_ids_exposed: false,
  },
};

assert.equal(validateFarmStatusToolResult(toolResult), true);

const validAnswer = [
  toolResult.presentation_ja.date_statement,
  toolResult.presentation_ja.work_log_heading,
  toolResult.presentation_ja.work_status_caution,
  toolResult.presentation_ja.inventory_caution,
  toolResult.presentation_ja.confirmed_plan_statement,
].join("\n");
const valid = guardFarmosHermesResponse({
  tool_result: toolResult,
  hermes_answer: validAnswer,
});
assert.deepEqual(valid, {
  result: "valid",
  final_text: validAnswer,
  fallback_used: false,
  violation_codes: [],
});
const safeRestockCaution = guardFarmosHermesResponse({
  tool_result: toolResult,
  hermes_answer: validAnswer.replace(
    toolResult.presentation_ja.inventory_caution,
    "在庫数量が0でも、補充が必要かどうかは判断できません。",
  ),
});
assert.equal(safeRestockCaution.result, "valid");

function assertFallback(
  answer: string,
  expectedCode: FarmosHermesGuardViolationCode,
): string {
  const result = guardFarmosHermesResponse({
    tool_result: toolResult,
    hermes_answer: answer,
  });
  assert.equal(result.result, "fallback");
  assert.equal(result.fallback_used, true);
  assert.ok(result.violation_codes.includes(expectedCode));
  return result.final_text;
}

assertFallback(`${validAnswer}\n今日の状況です。`, "RELATIVE_DATE_USED");
assertFallback(`${validAnswer}\n明日の状況です。`, "RELATIVE_DATE_USED");
assertFallback(
  validAnswer.replace("2026年7月28日", "2026年7月28"),
  "DATE_MISMATCH",
);
assertFallback(`${validAnswer}\n2026年7月30日`, "DATE_MISMATCH");
assertFallback(`${validAnswer}\n作業Aは完了済みです。`, "WORK_STATUS_INFERRED");
assertFallback(`${validAnswer}\n作業Aは実施中です。`, "WORK_STATUS_INFERRED");
assertFallback(`${validAnswer}\n確定予定はありません。`, "PLAN_STATUS_INFERRED");
assertFallback(`${validAnswer}\n資材Aは補充が必要です。`, "RESTOCK_REQUIREMENT_INFERRED");
assertFallback(`${validAnswer}\nquantityは0です。`, "RAW_CONTRACT_TERM_EXPOSED");
assertFallback(`${validAnswer}\nstock_stateはzeroです。`, "RAW_CONTRACT_TERM_EXPOSED");
assertFallback(`${validAnswer}\n<MCP__internal>`, "INTERNAL_MARKER_EXPOSED");
assertFallback("", "ANSWER_EMPTY");
assertFallback(
  validAnswer + "あ".repeat(FARMOS_HERMES_GUARD_MAX_ANSWER_CHARS),
  "ANSWER_TOO_LONG",
);

const phase34FailureAnswer = [
  "基準日は 2026 年 7 月 28 です。",
  "作業Aは今日午前開始の記録で、作業Bは実施中とされています。",
  "在庫は quantity:0 で stock_state は zero です。",
].join("\n");
const phase34Guarded = guardFarmosHermesResponse({
  tool_result: toolResult,
  hermes_answer: phase34FailureAnswer,
});
assert.equal(phase34Guarded.result, "fallback");
assert.deepEqual(phase34Guarded.violation_codes, [
  "RELATIVE_DATE_USED",
  "DATE_MISMATCH",
  "WORK_STATUS_INFERRED",
  "RAW_CONTRACT_TERM_EXPOSED",
]);

const fallbackOne = assertFallback(`${validAnswer}\n今日`, "RELATIVE_DATE_USED");
const fallbackTwo = assertFallback(`${validAnswer}\n今日`, "RELATIVE_DATE_USED");
assert.equal(fallbackOne, fallbackTwo);
assert.match(fallbackOne, /2026年7月28日/u);
assert.match(fallbackOne, /2026年7月29日/u);
assert.doesNotMatch(
  fallbackOne,
  /今日|明日|明後日|翌日|昨日|completion_verified|record_state|planning_data_available|timestamp_semantics|calendar_semantics|work_log_semantics|presentation_ja|quantity|stock_state|<MCP__|mcp__/u,
);
assert.equal(
  fallbackOne.split("\n").filter((line) => /^[123]\. /u.test(line)).length,
  3,
);
assert.equal(
  fallbackOne.split("\n").filter((line) => /^\s+・/u.test(line)).length <= 5,
  true,
);
assert.ok(Buffer.byteLength(fallbackOne, "utf8") <= FARM_STATUS_MAX_RESPONSE_BYTES);

console.log("farmos_readonly_observer_guard: ok");
