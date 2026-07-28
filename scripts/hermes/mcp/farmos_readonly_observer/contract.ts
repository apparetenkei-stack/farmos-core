import {
  readHermesOperationalContextIntegration,
} from "../../../../src/lib/hermes/hermes_operational_context_integration";

export const FARMOS_READONLY_SERVER_NAME = "farmos_readonly" as const;
export const FARMOS_READONLY_TOOL_NAME =
  "farmos_readonly_observer" as const;
export const FARM_STATUS_SCHEMA_VERSION =
  "farmos.readonly_observer.farm_status.v1" as const;
export const FARM_STATUS_ERROR_SCHEMA_VERSION =
  "farmos.readonly_observer.error.v1" as const;
export const FARM_STATUS_TIMEZONE = "Asia/Tokyo" as const;
export const FARM_STATUS_MAX_WORK_LOGS = 5 as const;
export const FARM_STATUS_MAX_INVENTORY_ROWS = 5 as const;
export const FARM_STATUS_MAX_NOTE_LENGTH = 120 as const;
export const FARM_STATUS_MAX_RESPONSE_BYTES = 16 * 1024;
export const FARM_STATUS_TIMEOUT_MS = 10_000 as const;
export const FARM_STATUS_WORK_LOG_INTERPRETATION_RULES = [
  "recorded_does_not_mean_completed",
  "started_at_does_not_verify_completion",
  "work_log_does_not_mean_work_plan",
] as const;
export const FARM_STATUS_CALENDAR_RESPONSE_RULES = [
  "use_verified_date_labels",
  "do_not_recalculate_calendar_dates",
  "do_not_expose_internal_field_names",
] as const;
export const FARM_STATUS_PRESENTATION_SCHEMA_VERSION =
  "farmos.readonly_observer.presentation.ja.v1" as const;
export const FARM_STATUS_PRESENTATION_RENDERING_RULES = [
  "use_absolute_dates_only",
  "copy_presentation_text_without_date_recalculation",
  "do_not_expose_internal_field_names",
  "do_not_infer_completion",
  "do_not_infer_confirmed_plans",
  "do_not_infer_restock_requirement",
] as const;

export const FARMOS_READONLY_TOOL_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["operation", "scope"],
  properties: {
    operation: {
      type: "string",
      enum: ["get_farm_status"],
    },
    scope: {
      type: "string",
      enum: ["today"],
    },
  },
} as const;

export type FarmStatusToolInput = {
  operation: "get_farm_status";
  scope: "today";
};

export type FarmStatusResponse = {
  schema_version: typeof FARM_STATUS_SCHEMA_VERSION;
  generated_at: string;
  timezone: typeof FARM_STATUS_TIMEZONE;
  current_date: string;
  tomorrow_date: string;
  calendar_semantics: {
    current_date_verified: true;
    tomorrow_date_verified: true;
    tomorrow_is_next_calendar_day: true;
    current_date_label_ja: string;
    tomorrow_date_label_ja: string;
    response_rules: Array<
      (typeof FARM_STATUS_CALENDAR_RESPONSE_RULES)[number]
    >;
  };
  presentation_ja: {
    schema_version: typeof FARM_STATUS_PRESENTATION_SCHEMA_VERSION;
    date_statement: string;
    work_log_heading: string;
    work_status_caution: string;
    confirmed_plan_statement: string;
    inventory_caution: string;
    rendering_rules: Array<
      (typeof FARM_STATUS_PRESENTATION_RENDERING_RULES)[number]
    >;
  };
  recent_work_logs: Array<{
    work_name: string | null;
    crop_name: string | null;
    field_name: string | null;
    started_at: string | null;
    record_state: "completed" | "in_progress" | "recorded" | "unknown";
    completion_verified: boolean;
    timestamp_semantics:
      | "source_timestamp_timezone_unverified"
      | "source_timestamp_timezone_verified";
    note: string | null;
  }>;
  work_log_semantics: {
    represents: "recent_recorded_work";
    completed_work_only: false;
    completion_status_available: boolean;
    planning_data_available: false;
    interpretation_rules: Array<
      (typeof FARM_STATUS_WORK_LOG_INTERPRETATION_RULES)[number]
    >;
  };
  inventory_summary: Array<{
    item_name: string;
    quantity: number | null;
    unit: string | null;
    stock_state: "zero" | "positive" | "unknown";
  }>;
  data_gaps: string[];
  safety: {
    read_only: true;
    database_write_performed: false;
    proposal_created: false;
    approval_performed: false;
    apply_performed: false;
    credentials_exposed: false;
    raw_internal_ids_exposed: false;
  };
};

export type FarmStatusToolError = {
  schema_version: typeof FARM_STATUS_ERROR_SCHEMA_VERSION;
  error_code:
    | "SOURCE_UNAVAILABLE"
    | "SOURCE_UNAUTHORIZED"
    | "SOURCE_INVALID_RESPONSE"
    | "SOURCE_TIMEOUT"
    | "OUTPUT_LIMIT_EXCEEDED"
    | "INTERNAL_VALIDATION_FAILED";
  retryable: boolean;
  user_message: string;
  safety: {
    read_only: true;
    database_write_performed: false;
    credentials_exposed: false;
  };
};

type JsonRecord = Record<string, unknown>;

type OperationalContextResult = {
  result: "ok" | "partial" | "error";
  operational_context_included: boolean;
  context_text: string | null;
  inventory_source_connected: boolean;
  work_log_source_connected: boolean;
  error_message: string | null;
};

export type FarmStatusToolDependencies = {
  readOperationalContext?: () => Promise<OperationalContextResult>;
  now?: () => Date;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseCalendarDate(value: unknown): CalendarDate | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }
  return { year, month, day };
}

function formatCalendarDate(value: CalendarDate): string {
  return [
    String(value.year).padStart(4, "0"),
    String(value.month).padStart(2, "0"),
    String(value.day).padStart(2, "0"),
  ].join("-");
}

function nextCalendarDate(value: CalendarDate): CalendarDate {
  if (value.day < daysInMonth(value.year, value.month)) {
    return { ...value, day: value.day + 1 };
  }
  if (value.month < 12) {
    return { year: value.year, month: value.month + 1, day: 1 };
  }
  return { year: value.year + 1, month: 1, day: 1 };
}

function calendarLabelJa(value: CalendarDate): string {
  return `${value.year}年${value.month}月${value.day}日`;
}

function createCalendarSemantics(
  currentDateValue: unknown,
  tomorrowDateValue: unknown,
): FarmStatusResponse["calendar_semantics"] | null {
  const currentDate = parseCalendarDate(currentDateValue);
  const tomorrowDate = parseCalendarDate(tomorrowDateValue);
  if (
    currentDate === null ||
    tomorrowDate === null ||
    formatCalendarDate(nextCalendarDate(currentDate)) !== tomorrowDateValue
  ) {
    return null;
  }
  return {
    current_date_verified: true,
    tomorrow_date_verified: true,
    tomorrow_is_next_calendar_day: true,
    current_date_label_ja: calendarLabelJa(currentDate),
    tomorrow_date_label_ja: calendarLabelJa(tomorrowDate),
    response_rules: [...FARM_STATUS_CALENDAR_RESPONSE_RULES],
  };
}

const PRESENTATION_FORBIDDEN_TERMS = [
  "今日",
  "明日",
  "明後日",
  "翌日",
  "昨日",
  "completion_verified",
  "record_state",
  "planning_data_available",
  "timestamp_semantics",
  "calendar_semantics",
  "work_log_semantics",
] as const;

function createPresentationJa(
  calendar: FarmStatusResponse["calendar_semantics"],
): FarmStatusResponse["presentation_ja"] {
  return {
    schema_version: FARM_STATUS_PRESENTATION_SCHEMA_VERSION,
    date_statement: `基準日は${calendar.current_date_label_ja}です。`,
    work_log_heading: "最近記録された作業",
    work_status_caution:
      "これらの記録が完了済みであることは、この情報源だけでは確認できません。",
    confirmed_plan_statement:
      `${calendar.tomorrow_date_label_ja}の確定予定は、この情報源から確認できません。`,
    inventory_caution:
      "在庫数量が0でも、この情報だけで補充が必要とは判断できません。",
    rendering_rules: [...FARM_STATUS_PRESENTATION_RENDERING_RULES],
  };
}

function validatePresentationJa(
  value: unknown,
  calendar: JsonRecord,
): boolean {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "date_statement",
      "work_log_heading",
      "work_status_caution",
      "confirmed_plan_statement",
      "inventory_caution",
      "rendering_rules",
    ]) ||
    value.schema_version !== FARM_STATUS_PRESENTATION_SCHEMA_VERSION ||
    typeof calendar.current_date_label_ja !== "string" ||
    typeof calendar.tomorrow_date_label_ja !== "string"
  ) {
    return false;
  }
  const displayTextKeys = [
    "date_statement",
    "work_log_heading",
    "work_status_caution",
    "confirmed_plan_statement",
    "inventory_caution",
  ] as const;
  if (
    !displayTextKeys.every((key) => typeof value[key] === "string") ||
    PRESENTATION_FORBIDDEN_TERMS.some((term) =>
      displayTextKeys.some((key) => String(value[key]).includes(term))
    ) ||
    !String(value.date_statement).includes(
      calendar.current_date_label_ja,
    ) ||
    !String(value.confirmed_plan_statement).includes(
      calendar.tomorrow_date_label_ja,
    ) ||
    !Array.isArray(value.rendering_rules) ||
    value.rendering_rules.length !==
      FARM_STATUS_PRESENTATION_RENDERING_RULES.length ||
    !FARM_STATUS_PRESENTATION_RENDERING_RULES.every(
      (rule, index) => value.rendering_rules[index] === rule,
    )
  ) {
    return false;
  }
  const expected = createPresentationJa(
    calendar as FarmStatusResponse["calendar_semantics"],
  );
  return displayTextKeys.every((key) => value[key] === expected[key]);
}

function safeNullableText(value: unknown, maxLength = 120): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return normalized.slice(0, maxLength);
}

function safeQuantity(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }
  return null;
}

function stockState(
  quantity: number | null,
): "zero" | "positive" | "unknown" {
  if (quantity === 0) return "zero";
  if (quantity !== null && quantity > 0) return "positive";
  return "unknown";
}

export function parseFarmStatusToolInput(
  value: unknown,
): FarmStatusToolInput | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["operation", "scope"]) ||
    value.operation !== "get_farm_status" ||
    value.scope !== "today"
  ) {
    return null;
  }
  return {
    operation: "get_farm_status",
    scope: "today",
  };
}

function errorResponse(
  errorCode: FarmStatusToolError["error_code"],
): FarmStatusToolError {
  const messages: Record<FarmStatusToolError["error_code"], string> = {
    SOURCE_UNAVAILABLE: "農場データを現在取得できません。",
    SOURCE_UNAUTHORIZED: "農場データの参照権限を確認できません。",
    SOURCE_INVALID_RESPONSE: "農場データの応答形式を確認できません。",
    SOURCE_TIMEOUT: "農場データの取得がタイムアウトしました。",
    OUTPUT_LIMIT_EXCEEDED: "農場データの応答が上限を超えました。",
    INTERNAL_VALIDATION_FAILED: "農場データの安全な形式を確認できません。",
  };
  return {
    schema_version: FARM_STATUS_ERROR_SCHEMA_VERSION,
    error_code: errorCode,
    retryable:
      errorCode === "SOURCE_UNAVAILABLE" || errorCode === "SOURCE_TIMEOUT",
    user_message: messages[errorCode],
    safety: {
      read_only: true,
      database_write_performed: false,
      credentials_exposed: false,
    },
  };
}

function classifySourceError(value: unknown): FarmStatusToolError["error_code"] {
  const text = value instanceof Error ? value.message : String(value ?? "");
  if (/timeout|abort/iu.test(text)) return "SOURCE_TIMEOUT";
  if (/unauthori[sz]ed|forbidden|authentication|permission/iu.test(text)) {
    return "SOURCE_UNAUTHORIZED";
  }
  if (/invalid_response|invalid response|schema|parse/iu.test(text)) {
    return "SOURCE_INVALID_RESPONSE";
  }
  return "SOURCE_UNAVAILABLE";
}

function parseOperationalPayload(value: string): JsonRecord | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return null;
    if (
      parsed.source !== "apparetenkei_operational_readonly" ||
      !isRecord(parsed.calendar_context) ||
      !isRecord(parsed.inventory) ||
      !isRecord(parsed.work_log) ||
      !isRecord(parsed.safety) ||
      parsed.safety.database_write_performed !== false
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function createFarmStatusResponse(
  payload: JsonRecord,
  generatedAt: string,
): FarmStatusResponse | null {
  const calendar = payload.calendar_context;
  const inventory = payload.inventory;
  const workLog = payload.work_log;
  if (!isRecord(calendar) || !isRecord(inventory) || !isRecord(workLog)) {
    return null;
  }
  if (
    typeof calendar.current_date !== "string" ||
    typeof calendar.tomorrow_date !== "string" ||
    calendar.timezone !== FARM_STATUS_TIMEZONE ||
    !Array.isArray(inventory.records) ||
    !Array.isArray(workLog.records)
  ) {
    return null;
  }
  const calendarSemantics = createCalendarSemantics(
    calendar.current_date,
    calendar.tomorrow_date,
  );
  if (calendarSemantics === null) return null;

  const inventorySummary = inventory.records
    .slice(0, FARM_STATUS_MAX_INVENTORY_ROWS)
    .map((candidate) => {
      if (!isRecord(candidate)) return null;
      const itemName = safeNullableText(candidate.name);
      if (itemName === null || itemName === "") return null;
      const quantity = safeQuantity(candidate.currentQuantity);
      return {
        item_name: itemName,
        quantity,
        unit: safeNullableText(candidate.unit),
        stock_state: stockState(quantity),
      };
    });
  const recentWorkLogs = workLog.records
    .slice(0, FARM_STATUS_MAX_WORK_LOGS)
    .map((candidate) => {
      if (!isRecord(candidate)) return null;
      return {
        work_name: safeNullableText(candidate.workTypeName),
        crop_name: safeNullableText(candidate.targetCrop),
        field_name: safeNullableText(candidate.fieldName),
        started_at: safeNullableText(candidate.startedAt),
        record_state: "recorded" as const,
        completion_verified: false,
        timestamp_semantics:
          "source_timestamp_timezone_unverified" as const,
        note: safeNullableText(candidate.note, FARM_STATUS_MAX_NOTE_LENGTH),
      };
    });
  if (
    inventorySummary.some((record) => record === null) ||
    recentWorkLogs.some((record) => record === null)
  ) {
    return null;
  }

  const dataGaps: string[] = [];
  if (inventory.connected !== true) {
    dataGaps.push("在庫データは取得できていません。");
  }
  if (workLog.connected !== true) {
    dataGaps.push("作業記録は取得できていません。");
  }
  if (
    recentWorkLogs.some(
      (record) => record?.field_name === null,
    )
  ) {
    dataGaps.push("作業記録の圃場名は参照データに含まれていません。");
  }

  return {
    schema_version: FARM_STATUS_SCHEMA_VERSION,
    generated_at: generatedAt,
    timezone: FARM_STATUS_TIMEZONE,
    current_date: calendar.current_date,
    tomorrow_date: calendar.tomorrow_date,
    calendar_semantics: calendarSemantics,
    presentation_ja: createPresentationJa(calendarSemantics),
    recent_work_logs: recentWorkLogs as FarmStatusResponse["recent_work_logs"],
    work_log_semantics: {
      represents: "recent_recorded_work",
      completed_work_only: false,
      completion_status_available: false,
      planning_data_available: false,
      interpretation_rules: [...FARM_STATUS_WORK_LOG_INTERPRETATION_RULES],
    },
    inventory_summary:
      inventorySummary as FarmStatusResponse["inventory_summary"],
    data_gaps: dataGaps,
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
}

export function validateFarmStatusToolResult(
  value: unknown,
): value is FarmStatusResponse | FarmStatusToolError {
  if (!isRecord(value) || !isRecord(value.safety)) return false;
  if (value.schema_version === FARM_STATUS_ERROR_SCHEMA_VERSION) {
    return (
      hasExactKeys(value, [
        "schema_version",
        "error_code",
        "retryable",
        "user_message",
        "safety",
      ]) &&
      [
        "SOURCE_UNAVAILABLE",
        "SOURCE_UNAUTHORIZED",
        "SOURCE_INVALID_RESPONSE",
        "SOURCE_TIMEOUT",
        "OUTPUT_LIMIT_EXCEEDED",
        "INTERNAL_VALIDATION_FAILED",
      ].includes(String(value.error_code)) &&
      typeof value.retryable === "boolean" &&
      typeof value.user_message === "string" &&
      hasExactKeys(value.safety, [
        "read_only",
        "database_write_performed",
        "credentials_exposed",
      ]) &&
      value.safety.read_only === true &&
      value.safety.database_write_performed === false &&
      value.safety.credentials_exposed === false
    );
  }
  if (value.schema_version !== FARM_STATUS_SCHEMA_VERSION) return false;
  return (
    hasExactKeys(value, [
      "schema_version",
      "generated_at",
      "timezone",
      "current_date",
      "tomorrow_date",
      "calendar_semantics",
      "presentation_ja",
      "recent_work_logs",
      "work_log_semantics",
      "inventory_summary",
      "data_gaps",
      "safety",
    ]) &&
    typeof value.generated_at === "string" &&
    value.timezone === FARM_STATUS_TIMEZONE &&
    typeof value.current_date === "string" &&
    typeof value.tomorrow_date === "string" &&
    isRecord(value.calendar_semantics) &&
    hasExactKeys(value.calendar_semantics, [
      "current_date_verified",
      "tomorrow_date_verified",
      "tomorrow_is_next_calendar_day",
      "current_date_label_ja",
      "tomorrow_date_label_ja",
      "response_rules",
    ]) &&
    value.calendar_semantics.current_date_verified === true &&
    value.calendar_semantics.tomorrow_date_verified === true &&
    value.calendar_semantics.tomorrow_is_next_calendar_day === true &&
    Array.isArray(value.calendar_semantics.response_rules) &&
    value.calendar_semantics.response_rules.length ===
      FARM_STATUS_CALENDAR_RESPONSE_RULES.length &&
    FARM_STATUS_CALENDAR_RESPONSE_RULES.every(
      (rule, index) => value.calendar_semantics.response_rules[index] === rule,
    ) &&
    (() => {
      const semantics = createCalendarSemantics(
        value.current_date,
        value.tomorrow_date,
      );
      return (
        semantics !== null &&
        value.calendar_semantics.current_date_label_ja ===
          semantics.current_date_label_ja &&
        value.calendar_semantics.tomorrow_date_label_ja ===
          semantics.tomorrow_date_label_ja
      );
    })() &&
    validatePresentationJa(
      value.presentation_ja,
      value.calendar_semantics,
    ) &&
    Array.isArray(value.recent_work_logs) &&
    value.recent_work_logs.length <= FARM_STATUS_MAX_WORK_LOGS &&
    value.recent_work_logs.every(
      (record) =>
        isRecord(record) &&
        hasExactKeys(record, [
          "work_name",
          "crop_name",
          "field_name",
          "started_at",
          "record_state",
          "completion_verified",
          "timestamp_semantics",
          "note",
        ]) &&
        [record.work_name, record.crop_name, record.field_name, record.started_at]
          .every((item) => item === null || typeof item === "string") &&
        ["completed", "in_progress", "recorded", "unknown"].includes(
          String(record.record_state),
        ) &&
        typeof record.completion_verified === "boolean" &&
        (record.completion_verified !== true ||
          record.record_state === "completed") &&
        [
          "source_timestamp_timezone_unverified",
          "source_timestamp_timezone_verified",
        ].includes(String(record.timestamp_semantics)) &&
        (record.note === null ||
          (typeof record.note === "string" &&
            record.note.length <= FARM_STATUS_MAX_NOTE_LENGTH)),
    ) &&
    isRecord(value.work_log_semantics) &&
    hasExactKeys(value.work_log_semantics, [
      "represents",
      "completed_work_only",
      "completion_status_available",
      "planning_data_available",
      "interpretation_rules",
    ]) &&
    value.work_log_semantics.represents === "recent_recorded_work" &&
    value.work_log_semantics.completed_work_only === false &&
    typeof value.work_log_semantics.completion_status_available ===
      "boolean" &&
    value.work_log_semantics.planning_data_available === false &&
    Array.isArray(value.work_log_semantics.interpretation_rules) &&
    value.work_log_semantics.interpretation_rules.length ===
      FARM_STATUS_WORK_LOG_INTERPRETATION_RULES.length &&
    FARM_STATUS_WORK_LOG_INTERPRETATION_RULES.every(
      (rule, index) =>
        value.work_log_semantics.interpretation_rules[index] === rule,
    ) &&
    (value.work_log_semantics.completion_status_available === true ||
      value.recent_work_logs.every(
        (record) =>
          isRecord(record) && record.completion_verified === false,
      )) &&
    Array.isArray(value.inventory_summary) &&
    value.inventory_summary.length <= FARM_STATUS_MAX_INVENTORY_ROWS &&
    value.inventory_summary.every(
      (record) =>
        isRecord(record) &&
        hasExactKeys(record, [
          "item_name",
          "quantity",
          "unit",
          "stock_state",
        ]) &&
        typeof record.item_name === "string" &&
        (record.quantity === null ||
          (typeof record.quantity === "number" &&
            Number.isFinite(record.quantity))) &&
        (record.unit === null || typeof record.unit === "string") &&
        ["zero", "positive", "unknown"].includes(String(record.stock_state)),
    ) &&
    Array.isArray(value.data_gaps) &&
    value.data_gaps.every((gap) => typeof gap === "string") &&
    hasExactKeys(value.safety, [
      "read_only",
      "database_write_performed",
      "proposal_created",
      "approval_performed",
      "apply_performed",
      "credentials_exposed",
      "raw_internal_ids_exposed",
    ]) &&
    value.safety.read_only === true &&
    value.safety.database_write_performed === false &&
    value.safety.proposal_created === false &&
    value.safety.approval_performed === false &&
    value.safety.apply_performed === false &&
    value.safety.credentials_exposed === false &&
    value.safety.raw_internal_ids_exposed === false
  );
}

function withinResponseLimit(value: unknown): boolean {
  return (
    Buffer.byteLength(JSON.stringify(value), "utf8") <=
    FARM_STATUS_MAX_RESPONSE_BYTES
  );
}

export async function executeFarmStatusTool(
  input: unknown,
  dependencies: FarmStatusToolDependencies = {},
): Promise<FarmStatusResponse | FarmStatusToolError> {
  if (parseFarmStatusToolInput(input) === null) {
    return errorResponse("INTERNAL_VALIDATION_FAILED");
  }
  const now = dependencies.now?.() ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    return errorResponse("INTERNAL_VALIDATION_FAILED");
  }
  const readOperationalContext =
    dependencies.readOperationalContext ??
    (() => readHermesOperationalContextIntegration({ now }));

  let operational: OperationalContextResult;
  try {
    operational = await Promise.race([
      readOperationalContext(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("source_timeout")),
          FARM_STATUS_TIMEOUT_MS,
        ).unref();
      }),
    ]);
  } catch (error) {
    return errorResponse(classifySourceError(error));
  }
  if (
    operational.result === "error" ||
    !operational.operational_context_included ||
    operational.context_text === null
  ) {
    return errorResponse(classifySourceError(operational.error_message));
  }

  const payload = parseOperationalPayload(operational.context_text);
  if (payload === null) return errorResponse("SOURCE_INVALID_RESPONSE");
  const sourceCalendar = payload.calendar_context;
  if (
    !isRecord(sourceCalendar) ||
    createCalendarSemantics(
      sourceCalendar.current_date,
      sourceCalendar.tomorrow_date,
    ) === null
  ) {
    return errorResponse("SOURCE_INVALID_RESPONSE");
  }
  const response = createFarmStatusResponse(payload, now.toISOString());
  if (response === null || !validateFarmStatusToolResult(response)) {
    return errorResponse("INTERNAL_VALIDATION_FAILED");
  }
  if (!withinResponseLimit(response)) {
    return errorResponse("OUTPUT_LIMIT_EXCEEDED");
  }
  return response;
}

export function serializeFarmStatusToolResult(
  value: FarmStatusResponse | FarmStatusToolError,
): string {
  const validated = validateFarmStatusToolResult(value)
    ? value
    : errorResponse("INTERNAL_VALIDATION_FAILED");
  if (!withinResponseLimit(validated)) {
    return JSON.stringify(errorResponse("OUTPUT_LIMIT_EXCEEDED"));
  }
  return JSON.stringify(validated);
}
