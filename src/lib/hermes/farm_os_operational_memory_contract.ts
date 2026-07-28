export const FARM_OS_STABLE_CHANGES_CONTRACT_ID =
  "farming_app.work_records.stable_changes.v1" as const;
export const FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID =
  "farmos.operational_memory.daily_work_records" as const;
export const FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION = 1 as const;

export type FarmOsStableChange = {
  operation: "upsert" | "tombstone";
  source_record_id: string;
  source_record_version: number | null;
  source_content_hash: string | null;
  business_date: string;
  recorded_at: string | null;
  source_updated_at: string;
  deleted_at: string | null;
  field_reference: string | null;
  crop_cycle_reference: string | null;
  work_type_reference: string | null;
  safe_payload: Record<string, never>;
};

export type FarmOsStableChangesPage = {
  contract_version: typeof FARM_OS_STABLE_CHANGES_CONTRACT_ID;
  result: "ok";
  next_cursor: string | null;
  has_more: boolean;
  changes: FarmOsStableChange[];
};

export type FarmOsOperationalMemoryFailureCode =
  | "invalid_contract"
  | "invalid_change"
  | "missing_business_date"
  | "invalid_timestamp"
  | "invalid_hash"
  | "source_version_hash_conflict"
  | "restricted_data_detected"
  | "projection_generation_failed"
  | "lineage_write_failed"
  | "unexpected_error";

export type FarmOsParseResult<T> =
  | { valid: true; value: T; failure_code: null }
  | { valid: false; value: null; failure_code: FarmOsOperationalMemoryFailureCode };

type JsonRecord = Record<string, unknown>;

const PAGE_KEYS = [
  "contract_version",
  "result",
  "next_cursor",
  "has_more",
  "changes",
] as const;
const CHANGE_KEYS = [
  "operation",
  "source_record_id",
  "source_record_version",
  "source_content_hash",
  "business_date",
  "recorded_at",
  "source_updated_at",
  "deleted_at",
  "field_reference",
  "crop_cycle_reference",
  "work_type_reference",
  "safe_payload",
] as const;
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const OFFSET_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= (monthDays[month - 1] ?? 0)
  );
}

function isOffsetTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !OFFSET_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

function isReference(value: unknown): value is string | null {
  return value === null ||
    (typeof value === "string" && REFERENCE_PATTERN.test(value));
}

function invalid<T>(
  failureCode: FarmOsOperationalMemoryFailureCode,
): FarmOsParseResult<T> {
  return { valid: false, value: null, failure_code: failureCode };
}

export function parseFarmOsStableChange(
  value: unknown,
): FarmOsParseResult<FarmOsStableChange> {
  if (!isRecord(value) || !hasExactKeys(value, CHANGE_KEYS)) {
    return invalid("invalid_change");
  }
  if (value.business_date === null) return invalid("missing_business_date");
  if (!isCalendarDate(value.business_date)) return invalid("invalid_change");
  if (
    value.operation !== "upsert" &&
    value.operation !== "tombstone"
  ) {
    return invalid("invalid_change");
  }
  if (
    typeof value.source_record_id !== "string" ||
    !REFERENCE_PATTERN.test(value.source_record_id) ||
    !(
      value.source_record_version === null ||
      (Number.isSafeInteger(value.source_record_version) &&
        Number(value.source_record_version) >= 0)
    )
  ) {
    return invalid("invalid_change");
  }
  if (
    value.source_content_hash !== null &&
    (typeof value.source_content_hash !== "string" ||
      !HASH_PATTERN.test(value.source_content_hash))
  ) {
    return invalid("invalid_hash");
  }
  if (
    value.source_record_version === null &&
    value.source_content_hash === null
  ) {
    return invalid("invalid_hash");
  }
  if (!isOffsetTimestamp(value.source_updated_at)) {
    return invalid("invalid_timestamp");
  }
  if (
    !isReference(value.field_reference) ||
    !isReference(value.crop_cycle_reference) ||
    !isReference(value.work_type_reference)
  ) {
    return invalid("restricted_data_detected");
  }
  if (!isRecord(value.safe_payload) || Object.keys(value.safe_payload).length !== 0) {
    return invalid("restricted_data_detected");
  }
  if (value.operation === "upsert") {
    if (
      !isOffsetTimestamp(value.recorded_at) ||
      value.deleted_at !== null
    ) {
      return invalid("invalid_timestamp");
    }
  } else if (
    !(
      value.recorded_at === null ||
      isOffsetTimestamp(value.recorded_at)
    ) ||
    !isOffsetTimestamp(value.deleted_at)
  ) {
    return invalid("invalid_timestamp");
  }
  return {
    valid: true,
    value: {
      operation: value.operation,
      source_record_id: value.source_record_id,
      source_record_version: value.source_record_version as number | null,
      source_content_hash: value.source_content_hash as string | null,
      business_date: value.business_date,
      recorded_at: value.recorded_at as string | null,
      source_updated_at: value.source_updated_at,
      deleted_at: value.deleted_at as string | null,
      field_reference: value.field_reference as string | null,
      crop_cycle_reference: value.crop_cycle_reference as string | null,
      work_type_reference: value.work_type_reference as string | null,
      safe_payload: {},
    },
    failure_code: null,
  };
}

export function parseFarmOsStableChangesPage(
  value: unknown,
): FarmOsParseResult<FarmOsStableChangesPage> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, PAGE_KEYS) ||
    value.contract_version !== FARM_OS_STABLE_CHANGES_CONTRACT_ID ||
    value.result !== "ok" ||
    typeof value.has_more !== "boolean" ||
    !(
      value.next_cursor === null ||
      (typeof value.next_cursor === "string" &&
        value.next_cursor.length > 0 &&
        value.next_cursor.length <= 512)
    ) ||
    (value.has_more ? value.next_cursor === null : value.next_cursor !== null) ||
    !Array.isArray(value.changes) ||
    value.changes.length > 100
  ) {
    return invalid("invalid_contract");
  }
  const changes: FarmOsStableChange[] = [];
  for (const candidate of value.changes) {
    const parsed = parseFarmOsStableChange(candidate);
    if (!parsed.valid) return parsed;
    changes.push(parsed.value);
  }
  return {
    valid: true,
    value: {
      contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
      result: "ok",
      next_cursor: value.next_cursor as string | null,
      has_more: value.has_more,
      changes,
    },
    failure_code: null,
  };
}
