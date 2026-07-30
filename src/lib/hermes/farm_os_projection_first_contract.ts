export const FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT =
  "farmos.hermes.projection_first_response.v1" as const;
export const FARM_OS_PROJECTION_FIRST_TIMEZONE = "Asia/Tokyo" as const;
export const FARM_OS_PROJECTION_FIRST_DEFAULT_DRILLDOWN_LIMIT = 20 as const;
export const FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT = 50 as const;

export type FarmOsProjectionFirstResponseMode = "fast" | "deep";
export type FarmOsProjectionFirstResult =
  | "answered"
  | "projection_missing"
  | "projection_stale"
  | "projection_unavailable"
  | "clarification_required"
  | "deep_analysis_unavailable"
  | "guard_rejected";
export type FarmOsProjectionFirstProjectionStatus =
  | "active"
  | "missing"
  | "stale"
  | "unavailable";
export type FarmOsProjectionFirstGuardFailureCode =
  | "projection_not_found"
  | "projection_stale"
  | "projection_contract_invalid"
  | "projection_lineage_invalid"
  | "unsupported_fact"
  | "insufficient_grounding"
  | "business_date_mismatch"
  | "authorization_failed"
  | "response_contract_invalid";

export type FarmOsProjectionFirstRequest = {
  contract_version: typeof FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT;
  query: string;
  business_date: string;
  response_mode: FarmOsProjectionFirstResponseMode;
  farm_scope: string;
  requested_at: string;
};

export type FarmOsProjectionFirstGroundingRef = {
  source_type: "projection" | "lineage_snapshot";
  reference_id: string;
  source_record_id: string | null;
  business_date: string;
};

export type FarmOsProjectionFirstGuardResult = {
  status: "passed" | "rejected";
  failure_codes: FarmOsProjectionFirstGuardFailureCode[];
};

export type FarmOsProjectionFirstResponse = {
  contract_version: typeof FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT;
  result: FarmOsProjectionFirstResult;
  mode_requested: FarmOsProjectionFirstResponseMode;
  mode_used: "fast" | "none";
  answer: string | null;
  business_date: string;
  projection_id: string | null;
  projection_status: FarmOsProjectionFirstProjectionStatus;
  as_of: string | null;
  grounding_refs: FarmOsProjectionFirstGroundingRef[];
  drilldown_used: boolean;
  response_guard: FarmOsProjectionFirstGuardResult;
  writes_performed: false;
};

export type FarmOsProjectionFirstParseResult<T> =
  | { valid: true; value: T; failure_code: null }
  | {
    valid: false;
    value: null;
    failure_code: "response_contract_invalid";
  };

type JsonRecord = Record<string, unknown>;

const REQUEST_KEYS = [
  "contract_version",
  "query",
  "business_date",
  "response_mode",
  "farm_scope",
  "requested_at",
] as const;
const RESPONSE_KEYS = [
  "contract_version",
  "result",
  "mode_requested",
  "mode_used",
  "answer",
  "business_date",
  "projection_id",
  "projection_status",
  "as_of",
  "grounding_refs",
  "drilldown_used",
  "response_guard",
  "writes_performed",
] as const;
const GROUNDING_REF_KEYS = [
  "source_type",
  "reference_id",
  "source_record_id",
  "business_date",
] as const;
const GUARD_KEYS = ["status", "failure_codes"] as const;
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const OFFSET_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;
const RESULTS: readonly FarmOsProjectionFirstResult[] = [
  "answered",
  "projection_missing",
  "projection_stale",
  "projection_unavailable",
  "clarification_required",
  "deep_analysis_unavailable",
  "guard_rejected",
];
const PROJECTION_STATUSES: readonly FarmOsProjectionFirstProjectionStatus[] = [
  "active",
  "missing",
  "stale",
  "unavailable",
];
const GUARD_FAILURE_CODES: readonly FarmOsProjectionFirstGuardFailureCode[] = [
  "projection_not_found",
  "projection_stale",
  "projection_contract_invalid",
  "projection_lineage_invalid",
  "unsupported_fact",
  "insufficient_grounding",
  "business_date_mismatch",
  "authorization_failed",
  "response_contract_invalid",
];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

export function isFarmOsProjectionFirstCalendarDate(
  value: unknown,
): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year >= 1 && month >= 1 && month <= 12 &&
    day >= 1 && day <= (days[month - 1] ?? 0);
}

export function isFarmOsProjectionFirstTimestamp(
  value: unknown,
): value is string {
  return typeof value === "string" &&
    OFFSET_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value));
}

function invalid<T>(): FarmOsProjectionFirstParseResult<T> {
  return {
    valid: false,
    value: null,
    failure_code: "response_contract_invalid",
  };
}

function isReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}

function parseGroundingRef(
  value: unknown,
): FarmOsProjectionFirstGroundingRef | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, GROUNDING_REF_KEYS) ||
    (value.source_type !== "projection" &&
      value.source_type !== "lineage_snapshot") ||
    !isReference(value.reference_id) ||
    !(value.source_record_id === null || isReference(value.source_record_id)) ||
    !isFarmOsProjectionFirstCalendarDate(value.business_date)
  ) {
    return null;
  }
  return {
    source_type: value.source_type,
    reference_id: value.reference_id,
    source_record_id: value.source_record_id,
    business_date: value.business_date,
  };
}

function parseGuardResult(
  value: unknown,
): FarmOsProjectionFirstGuardResult | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, GUARD_KEYS) ||
    (value.status !== "passed" && value.status !== "rejected") ||
    !Array.isArray(value.failure_codes) ||
    value.failure_codes.length > GUARD_FAILURE_CODES.length ||
    !value.failure_codes.every((code) =>
      typeof code === "string" &&
      GUARD_FAILURE_CODES.includes(code as FarmOsProjectionFirstGuardFailureCode)
    ) ||
    new Set(value.failure_codes).size !== value.failure_codes.length ||
    (value.status === "passed"
      ? value.failure_codes.length !== 0
      : value.failure_codes.length === 0)
  ) {
    return null;
  }
  return {
    status: value.status,
    failure_codes:
      value.failure_codes as FarmOsProjectionFirstGuardFailureCode[],
  };
}

export function parseFarmOsProjectionFirstRequest(
  value: unknown,
): FarmOsProjectionFirstParseResult<FarmOsProjectionFirstRequest> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, REQUEST_KEYS) ||
    value.contract_version !== FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT ||
    typeof value.query !== "string" ||
    value.query.trim().length === 0 ||
    value.query.length > 2_000 ||
    !isFarmOsProjectionFirstCalendarDate(value.business_date) ||
    (value.response_mode !== "fast" && value.response_mode !== "deep") ||
    !isReference(value.farm_scope) ||
    !isFarmOsProjectionFirstTimestamp(value.requested_at)
  ) {
    return invalid();
  }
  return {
    valid: true,
    value: {
      contract_version: FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
      query: value.query.trim(),
      business_date: value.business_date,
      response_mode: value.response_mode,
      farm_scope: value.farm_scope,
      requested_at: value.requested_at,
    },
    failure_code: null,
  };
}

export function createFarmOsProjectionFirstRequest(input: {
  query: string;
  business_date: string;
  farm_scope: string;
  requested_at: string;
  response_mode?: FarmOsProjectionFirstResponseMode;
}): FarmOsProjectionFirstRequest {
  const parsed = parseFarmOsProjectionFirstRequest({
    contract_version: FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
    query: input.query,
    business_date: input.business_date,
    response_mode: input.response_mode ?? "fast",
    farm_scope: input.farm_scope,
    requested_at: input.requested_at,
  });
  if (!parsed.valid) throw new Error("projection_first_request_invalid");
  return parsed.value;
}

export function parseFarmOsProjectionFirstResponse(
  value: unknown,
): FarmOsProjectionFirstParseResult<FarmOsProjectionFirstResponse> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, RESPONSE_KEYS) ||
    value.contract_version !== FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT ||
    !RESULTS.includes(value.result as FarmOsProjectionFirstResult) ||
    (value.mode_requested !== "fast" && value.mode_requested !== "deep") ||
    (value.mode_used !== "fast" && value.mode_used !== "none") ||
    !(value.answer === null ||
      (typeof value.answer === "string" && value.answer.length > 0 &&
        value.answer.length <= 4_000)) ||
    !isFarmOsProjectionFirstCalendarDate(value.business_date) ||
    !(value.projection_id === null || isReference(value.projection_id)) ||
    !PROJECTION_STATUSES.includes(
      value.projection_status as FarmOsProjectionFirstProjectionStatus,
    ) ||
    !(value.as_of === null || isFarmOsProjectionFirstTimestamp(value.as_of)) ||
    !Array.isArray(value.grounding_refs) ||
    value.grounding_refs.length > FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT ||
    typeof value.drilldown_used !== "boolean" ||
    value.writes_performed !== false
  ) {
    return invalid();
  }
  const groundingRefs = value.grounding_refs.map(parseGroundingRef);
  const guard = parseGuardResult(value.response_guard);
  const result = value.result as FarmOsProjectionFirstResult;
  const projectionStatus =
    value.projection_status as FarmOsProjectionFirstProjectionStatus;
  if (
    groundingRefs.some((reference) => reference === null) ||
    guard === null ||
    (result === "answered" &&
      (value.answer === null ||
        value.mode_used !== "fast" ||
        projectionStatus !== "active" ||
        guard.status !== "passed" ||
        groundingRefs.length === 0)) ||
    (result !== "answered" &&
      (value.answer !== null ||
        value.mode_used !== "none" ||
        groundingRefs.length !== 0)) ||
    (result === "guard_rejected" && guard.status !== "rejected") ||
    (result === "projection_missing" &&
      (projectionStatus !== "missing" ||
        !guard.failure_codes.includes("projection_not_found"))) ||
    (result === "projection_stale" &&
      (projectionStatus !== "stale" ||
        !guard.failure_codes.includes("projection_stale"))) ||
    (result === "projection_unavailable" &&
      projectionStatus !== "unavailable") ||
    (result === "clarification_required" &&
      !guard.failure_codes.includes("insufficient_grounding")) ||
    (result === "deep_analysis_unavailable" &&
      (value.mode_requested !== "deep" ||
        projectionStatus !== "unavailable" ||
        guard.status !== "passed"))
  ) {
    return invalid();
  }
  return {
    valid: true,
    value: {
      contract_version: FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
      result,
      mode_requested: value.mode_requested,
      mode_used: value.mode_used,
      answer: value.answer,
      business_date: value.business_date,
      projection_id: value.projection_id,
      projection_status: projectionStatus,
      as_of: value.as_of,
      grounding_refs:
        groundingRefs as FarmOsProjectionFirstGroundingRef[],
      drilldown_used: value.drilldown_used,
      response_guard: guard,
      writes_performed: false,
    },
    failure_code: null,
  };
}
