import assert from "node:assert/strict";

import {
  executeFarmStatusTool,
  FARM_STATUS_ERROR_SCHEMA_VERSION,
  FARM_STATUS_MAX_NOTE_LENGTH,
  FARM_STATUS_MAX_RESPONSE_BYTES,
  FARM_STATUS_SCHEMA_VERSION,
  parseFarmStatusToolInput,
  serializeFarmStatusToolResult,
  validateFarmStatusToolResult,
} from "./mcp/farmos_readonly_observer/contract";

const fixedNow = new Date("2026-07-27T15:30:00.000Z");

function contextText(input?: {
  inventoryCount?: number;
  workLogCount?: number;
  note?: string;
  currentDate?: string;
  tomorrowDate?: string;
}): string {
  const inventoryCount = input?.inventoryCount ?? 1;
  const workLogCount = input?.workLogCount ?? 1;
  return JSON.stringify({
    source: "apparetenkei_operational_readonly",
    calendar_context: {
      current_date: input?.currentDate ?? "2026-07-28",
      tomorrow_date: input?.tomorrowDate ?? "2026-07-29",
      timezone: "Asia/Tokyo",
    },
    context_policy: {
      untrusted_data: true,
      prompt_instructions_allowed: false,
      human_review_required: true,
    },
    inventory: {
      connected: true,
      record_count: inventoryCount,
      connected_empty: false,
      has_more: false,
      records: Array.from({ length: inventoryCount }, (_, index) => ({
        name: `item-${index}`,
        baseType: "fertilizer",
        currentQuantity: index,
        unit: "kg",
      })),
    },
    work_log: {
      connected: true,
      record_count: workLogCount,
      connected_empty: false,
      has_more: false,
      records: Array.from({ length: workLogCount }, (_, index) => ({
        startedAt: `2026-07-28T0${index}:00:00.000Z`,
        workTypeName: `work-${index}`,
        durationMinutes: 30,
        targetCrop: "cabbage",
        appliedMaterialCount: 0,
        note: input?.note,
      })),
    },
    safety: {
      transaction_read_only: true,
      database_write_performed: false,
      proposal_created: false,
      proposal_saved: false,
      proposal_apply_performed: false,
      app_db_write_performed: false,
      core_db_write_performed: false,
      credentials_exposed: false,
    },
  });
}

function reader(text = contextText()) {
  return async () => ({
    result: "ok" as const,
    operational_context_included: true,
    context_text: text,
    inventory_source_connected: true,
    work_log_source_connected: true,
    error_message: null,
  });
}

assert.deepEqual(parseFarmStatusToolInput({
  operation: "get_farm_status",
  scope: "today",
}), {
  operation: "get_farm_status",
  scope: "today",
});
for (const invalid of [
  { operation: "unknown", scope: "today" },
  { operation: "get_farm_status", scope: "tomorrow" },
  { operation: "get_farm_status", scope: "today", extra: true },
  { operation: "get_farm_status", scope: "today", url: "http://example.test" },
  { operation: "get_farm_status", scope: "today", token: "not-a-secret" },
  { operation: "get_farm_status", scope: "today", sql: "select 1" },
  { operation: "get_farm_status", scope: "today", file: "/tmp/example" },
]) {
  assert.equal(parseFarmStatusToolInput(invalid), null);
}

const success = await executeFarmStatusTool(
  { operation: "get_farm_status", scope: "today" },
  { readOperationalContext: reader(), now: () => fixedNow },
);
assert.equal(success.schema_version, FARM_STATUS_SCHEMA_VERSION);
if (success.schema_version !== FARM_STATUS_SCHEMA_VERSION) {
  throw new Error("expected farm status response");
}
assert.equal(success.timezone, "Asia/Tokyo");
assert.equal(success.current_date, "2026-07-28");
assert.equal(success.tomorrow_date, "2026-07-29");
assert.equal(
  success.calendar_semantics.current_date_label_ja,
  "2026年7月28日",
);
assert.equal(
  success.calendar_semantics.tomorrow_date_label_ja,
  "2026年7月29日",
);
assert.equal(success.calendar_semantics.tomorrow_is_next_calendar_day, true);
assert.deepEqual(success.calendar_semantics.response_rules, [
  "use_verified_date_labels",
  "do_not_recalculate_calendar_dates",
  "do_not_expose_internal_field_names",
]);
assert.equal(
  success.presentation_ja.schema_version,
  "farmos.readonly_observer.presentation.ja.v1",
);
assert.equal(
  success.presentation_ja.date_statement,
  "基準日は2026年7月28日です。",
);
assert.equal(
  success.presentation_ja.confirmed_plan_statement,
  "2026年7月29日の確定予定は、この情報源から確認できません。",
);
assert.deepEqual(success.presentation_ja.rendering_rules, [
  "use_absolute_dates_only",
  "copy_presentation_text_without_date_recalculation",
  "do_not_expose_internal_field_names",
  "do_not_infer_completion",
  "do_not_infer_confirmed_plans",
  "do_not_infer_restock_requirement",
]);
const presentationText = [
  success.presentation_ja.date_statement,
  success.presentation_ja.work_log_heading,
  success.presentation_ja.work_status_caution,
  success.presentation_ja.confirmed_plan_statement,
  success.presentation_ja.inventory_caution,
].join("\n");
assert.doesNotMatch(
  presentationText,
  /今日|明日|明後日|翌日|昨日|completion_verified|record_state|planning_data_available|timestamp_semantics|calendar_semantics|work_log_semantics/u,
);
assert.equal(success.safety.read_only, true);
assert.equal(success.safety.database_write_performed, false);
assert.equal(success.safety.raw_internal_ids_exposed, false);
assert.deepEqual(
  success.recent_work_logs.map((record) => record.record_state),
  ["recorded"],
);
assert.deepEqual(
  success.recent_work_logs.map((record) => record.completion_verified),
  [false],
);
assert.deepEqual(
  success.recent_work_logs.map((record) => record.timestamp_semantics),
  ["source_timestamp_timezone_unverified"],
);
assert.equal(success.work_log_semantics.represents, "recent_recorded_work");
assert.equal(success.work_log_semantics.completed_work_only, false);
assert.equal(success.work_log_semantics.completion_status_available, false);
assert.equal(success.work_log_semantics.planning_data_available, false);
assert.deepEqual(success.work_log_semantics.interpretation_rules, [
  "recorded_does_not_mean_completed",
  "started_at_does_not_verify_completion",
  "work_log_does_not_mean_work_plan",
]);
assert.doesNotMatch(JSON.stringify(success), /(?:^|_)(?:id|token)(?:$|_)/iu);
assert.equal(validateFarmStatusToolResult(success), true);

for (const [currentDate, tomorrowDate, currentLabel, tomorrowLabel] of [
  ["2026-07-31", "2026-08-01", "2026年7月31日", "2026年8月1日"],
  ["2026-12-31", "2027-01-01", "2026年12月31日", "2027年1月1日"],
  ["2028-02-28", "2028-02-29", "2028年2月28日", "2028年2月29日"],
] as const) {
  const calendarResult = await executeFarmStatusTool(
    { operation: "get_farm_status", scope: "today" },
    {
      readOperationalContext: reader(contextText({
        currentDate,
        tomorrowDate,
      })),
      now: () => fixedNow,
    },
  );
  assert.equal(calendarResult.schema_version, FARM_STATUS_SCHEMA_VERSION);
  if (calendarResult.schema_version !== FARM_STATUS_SCHEMA_VERSION) {
    throw new Error("expected valid calendar response");
  }
  assert.equal(calendarResult.calendar_semantics.current_date_label_ja, currentLabel);
  assert.equal(
    calendarResult.calendar_semantics.tomorrow_date_label_ja,
    tomorrowLabel,
  );
  assert.equal(
    calendarResult.presentation_ja.date_statement,
    `基準日は${currentLabel}です。`,
  );
  assert.equal(
    calendarResult.presentation_ja.confirmed_plan_statement,
    `${tomorrowLabel}の確定予定は、この情報源から確認できません。`,
  );
}

for (const [currentDate, tomorrowDate] of [
  ["2026-02-29", "2026-03-01"],
  ["2026-07-28", "2026-07-28"],
  ["2026-07-28", "2026-07-30"],
  ["2026-07-28", "2026-07-27"],
  ["2026-7-28", "2026-07-29"],
  ["2026-07-28", "2026/07/29"],
] as const) {
  const calendarError = await executeFarmStatusTool(
    { operation: "get_farm_status", scope: "today" },
    {
      readOperationalContext: reader(contextText({
        currentDate,
        tomorrowDate,
      })),
      now: () => fixedNow,
    },
  );
  assert.equal(calendarError.schema_version, FARM_STATUS_ERROR_SCHEMA_VERSION);
  assert.equal(
    calendarError.schema_version === FARM_STATUS_ERROR_SCHEMA_VERSION
      ? calendarError.error_code
      : null,
    "SOURCE_INVALID_RESPONSE",
  );
}

assert.equal(
  validateFarmStatusToolResult({
    ...success,
    calendar_semantics: {
      ...success.calendar_semantics,
      unexpected: true,
    },
  }),
  false,
);
const missingCalendarSemantics = {
  ...success.calendar_semantics,
} as Record<string, unknown>;
delete missingCalendarSemantics.current_date_verified;
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    calendar_semantics: missingCalendarSemantics,
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    calendar_semantics: {
      ...success.calendar_semantics,
      response_rules: [
        "do_not_recalculate_calendar_dates",
        "use_verified_date_labels",
        "do_not_expose_internal_field_names",
      ],
    },
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    calendar_semantics: {
      ...success.calendar_semantics,
      tomorrow_date_label_ja: "2026年7月28日",
    },
  }),
  false,
);

assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: {
      ...success.presentation_ja,
      date_statement: "基準日は2026年7月29日です。",
    },
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: {
      ...success.presentation_ja,
      confirmed_plan_statement:
        "2026年7月28日の確定予定は、この情報源から確認できません。",
    },
  }),
  false,
);
for (const forbiddenText of [
  "今日は2026年7月28日です。",
  "明日の確定予定は確認できません。",
  "明後日の確定予定は確認できません。",
  "completion_verifiedを確認してください。",
]) {
  assert.equal(
    validateFarmStatusToolResult({
      ...success,
      presentation_ja: {
        ...success.presentation_ja,
        work_status_caution: forbiddenText,
      },
    }),
    false,
  );
}
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: {
      ...success.presentation_ja,
      unexpected: true,
    },
  }),
  false,
);
const missingPresentation = {
  ...success.presentation_ja,
} as Record<string, unknown>;
delete missingPresentation.inventory_caution;
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: missingPresentation,
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: {
      ...success.presentation_ja,
      rendering_rules: [
        ...success.presentation_ja.rendering_rules.slice(1),
        success.presentation_ja.rendering_rules[0],
      ],
    },
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: {
      ...success.presentation_ja,
      rendering_rules: [
        ...success.presentation_ja.rendering_rules,
        "unexpected",
      ],
    },
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    presentation_ja: {
      ...success.presentation_ja,
      rendering_rules: success.presentation_ja.rendering_rules.slice(0, -1),
    },
  }),
  false,
);

const firstWorkLog = success.recent_work_logs[0];
assert.ok(firstWorkLog);
for (const invalidWorkLog of [
  { ...firstWorkLog, record_state: "invalid" },
  {
    ...firstWorkLog,
    timestamp_semantics: "source_timestamp_timezone_guessed",
  },
  { ...firstWorkLog, completion_verified: true },
]) {
  assert.equal(
    validateFarmStatusToolResult({
      ...success,
      recent_work_logs: [invalidWorkLog],
    }),
    false,
  );
}
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    recent_work_logs: [{
      ...firstWorkLog,
      record_state: "completed",
      completion_verified: true,
    }],
    work_log_semantics: {
      ...success.work_log_semantics,
      completion_status_available: false,
    },
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    work_log_semantics: {
      ...success.work_log_semantics,
      unexpected: false,
    },
  }),
  false,
);
const missingWorkLogSemantics = {
  ...success.work_log_semantics,
} as Record<string, unknown>;
delete missingWorkLogSemantics.represents;
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    work_log_semantics: missingWorkLogSemantics,
  }),
  false,
);
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    work_log_semantics: {
      ...success.work_log_semantics,
      planning_data_available: true,
    },
  }),
  false,
);

const reorderedSafety = {
  raw_internal_ids_exposed: false,
  credentials_exposed: false,
  apply_performed: false,
  approval_performed: false,
  proposal_created: false,
  database_write_performed: false,
  read_only: true,
};
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    safety: reorderedSafety,
  }),
  true,
);

for (const [field, invalidValue] of [
  ["read_only", false],
  ["database_write_performed", true],
  ["proposal_created", true],
  ["approval_performed", true],
  ["apply_performed", true],
  ["credentials_exposed", true],
  ["raw_internal_ids_exposed", true],
] as const) {
  assert.equal(
    validateFarmStatusToolResult({
      ...success,
      safety: {
        ...success.safety,
        [field]: invalidValue,
      },
    }),
    false,
  );
}

assert.equal(
  validateFarmStatusToolResult({
    ...success,
    safety: {
      ...success.safety,
      unexpected: false,
    },
  }),
  false,
);
const missingSafetyField = { ...success.safety } as Record<string, boolean>;
delete missingSafetyField.raw_internal_ids_exposed;
assert.equal(
  validateFarmStatusToolResult({
    ...success,
    safety: missingSafetyField,
  }),
  false,
);

const bounded = await executeFarmStatusTool(
  { operation: "get_farm_status", scope: "today" },
  {
    readOperationalContext: reader(contextText({
      inventoryCount: 8,
      workLogCount: 8,
      note: "n".repeat(200),
    })),
    now: () => fixedNow,
  },
);
assert.equal(bounded.schema_version, FARM_STATUS_SCHEMA_VERSION);
if (bounded.schema_version !== FARM_STATUS_SCHEMA_VERSION) {
  throw new Error("expected bounded response");
}
assert.equal(bounded.inventory_summary.length, 5);
assert.equal(bounded.recent_work_logs.length, 5);
assert.equal(
  bounded.recent_work_logs[0]?.note?.length,
  FARM_STATUS_MAX_NOTE_LENGTH,
);
assert.ok(
  Buffer.byteLength(serializeFarmStatusToolResult(bounded), "utf8") <=
    FARM_STATUS_MAX_RESPONSE_BYTES,
);
const oversizedSerialized = serializeFarmStatusToolResult({
  ...bounded,
  data_gaps: ["x".repeat(FARM_STATUS_MAX_RESPONSE_BYTES)],
});
const oversizedResult = JSON.parse(oversizedSerialized) as {
  schema_version: string;
  error_code: string;
};
assert.equal(
  Buffer.byteLength(oversizedSerialized, "utf8") <=
    FARM_STATUS_MAX_RESPONSE_BYTES,
  true,
);
assert.equal(
  oversizedResult.schema_version,
  FARM_STATUS_ERROR_SCHEMA_VERSION,
);
assert.equal(oversizedResult.error_code, "OUTPUT_LIMIT_EXCEEDED");

const invalidInput = await executeFarmStatusTool(
  { operation: "get_farm_status", scope: "today", endpoint: "/private" },
  { readOperationalContext: reader(), now: () => fixedNow },
);
assert.equal(invalidInput.schema_version, FARM_STATUS_ERROR_SCHEMA_VERSION);

const timeout = await executeFarmStatusTool(
  { operation: "get_farm_status", scope: "today" },
  {
    readOperationalContext: async () => {
      throw new Error("source_timeout");
    },
    now: () => fixedNow,
  },
);
assert.equal(timeout.schema_version, FARM_STATUS_ERROR_SCHEMA_VERSION);
assert.equal(
  timeout.schema_version === FARM_STATUS_ERROR_SCHEMA_VERSION
    ? timeout.error_code
    : null,
  "SOURCE_TIMEOUT",
);

const invalidResponse = await executeFarmStatusTool(
  { operation: "get_farm_status", scope: "today" },
  { readOperationalContext: reader("{"), now: () => fixedNow },
);
assert.equal(invalidResponse.schema_version, FARM_STATUS_ERROR_SCHEMA_VERSION);
assert.equal(
  invalidResponse.schema_version === FARM_STATUS_ERROR_SCHEMA_VERSION
    ? invalidResponse.error_code
    : null,
  "SOURCE_INVALID_RESPONSE",
);

const invalidSourceIdentifier = await executeFarmStatusTool(
  { operation: "get_farm_status", scope: "today" },
  {
    readOperationalContext: reader(
      contextText().replace(
        "apparetenkei_operational_readonly",
        "unexpected_source",
      ),
    ),
    now: () => fixedNow,
  },
);
assert.equal(
  invalidSourceIdentifier.schema_version,
  FARM_STATUS_ERROR_SCHEMA_VERSION,
);
assert.equal(
  invalidSourceIdentifier.schema_version === FARM_STATUS_ERROR_SCHEMA_VERSION
    ? invalidSourceIdentifier.error_code
    : null,
  "SOURCE_INVALID_RESPONSE",
);

console.log("farmos_readonly_observer_mcp_contract: ok");
