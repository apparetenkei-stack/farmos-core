export const FARM_OS_STABLE_CHANGES_CONTRACT_ID =
  "farming_app.work_records.stable_changes.v1" as const;
export const FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID =
  "farmos.operational_memory.daily_work_records" as const;
export const FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION = 1 as const;

export type FarmOsStableChange = {
  change_sequence: string;
  operation: "upsert" | "tombstone";
  source_record_id: string;
  source_record_version: number | null;
  source_content_hash: string;
  business_date: string;
  recorded_at: string | null;
  source_updated_at: string;
  deleted_at: string | null;
  field_reference: string | null;
  crop_cycle_reference: null;
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
  | "ordering_regression"
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
  "change_sequence",
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
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/u;
const MAX_CHANGE_SEQUENCE = 9_223_372_036_854_775_807n;

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

function daysFromCivil(year: number, month: number, day: number): bigint {
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) + dayOfYear;
  return BigInt(era * 146097 + dayOfEra - 719468);
}

export function farmOsStableChangesTimestampMicros(
  value: unknown,
): bigint | null {
  if (typeof value !== "string") return null;
  const match = OFFSET_TIMESTAMP_PATTERN.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = (match[7] ?? "").padEnd(6, "0");
  const offsetHour = match[8] === "Z" ? 0 : Number(match[10]);
  const offsetMinute = match[8] === "Z" ? 0 : Number(match[11]);
  if (
    !isCalendarDate(`${match[1]}-${match[2]}-${match[3]}`) ||
    hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 23 || offsetMinute > 59
  ) return null;
  const offsetSign = match[8] === "Z" || match[9] === "+" ? 1n : -1n;
  const offsetSeconds = offsetSign * BigInt(offsetHour * 3600 + offsetMinute * 60);
  const localSeconds = daysFromCivil(year, month, day) * 86_400n +
    BigInt(hour * 3600 + minute * 60 + second);
  return (localSeconds - offsetSeconds) * 1_000_000n + BigInt(fraction || "0");
}

function isOffsetTimestamp(value: unknown): value is string {
  return farmOsStableChangesTimestampMicros(value) !== null;
}

export function parseFarmOsChangeSequence(value: unknown): string | null {
  if (typeof value !== "string" || !/^[1-9]\d{0,18}$/u.test(value)) {
    return null;
  }
  const parsed = BigInt(value);
  return parsed <= MAX_CHANGE_SEQUENCE ? value : null;
}

export function compareFarmOsStableChangeOrdering(
  left: Pick<FarmOsStableChange, "source_updated_at" | "change_sequence">,
  right: Pick<FarmOsStableChange, "source_updated_at" | "change_sequence">,
): -1 | 0 | 1 {
  const leftMicros = farmOsStableChangesTimestampMicros(left.source_updated_at);
  const rightMicros = farmOsStableChangesTimestampMicros(right.source_updated_at);
  if (leftMicros === null || rightMicros === null) {
    throw new Error("stable_changes_ordering_timestamp_invalid");
  }
  if (leftMicros < rightMicros) return -1;
  if (leftMicros > rightMicros) return 1;
  const leftSequence = BigInt(left.change_sequence);
  const rightSequence = BigInt(right.change_sequence);
  return leftSequence < rightSequence ? -1 : leftSequence > rightSequence ? 1 : 0;
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
    parseFarmOsChangeSequence(value.change_sequence) === null ||
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
  if (typeof value.source_content_hash !== "string" ||
    !HASH_PATTERN.test(value.source_content_hash)) {
    return invalid("invalid_hash");
  }
  if (!isOffsetTimestamp(value.source_updated_at)) {
    return invalid("invalid_timestamp");
  }
  if (
    !isReference(value.field_reference) ||
    value.crop_cycle_reference !== null ||
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
      change_sequence: value.change_sequence as string,
      operation: value.operation,
      source_record_id: value.source_record_id,
      source_record_version: value.source_record_version as number | null,
      source_content_hash: value.source_content_hash,
      business_date: value.business_date,
      recorded_at: value.recorded_at as string | null,
      source_updated_at: value.source_updated_at,
      deleted_at: value.deleted_at as string | null,
      field_reference: value.field_reference as string | null,
      crop_cycle_reference: null,
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
    if (!parsed.valid) {
      return invalid(parsed.failure_code);
    }
    changes.push(parsed.value);
  }
  for (let index = 1; index < changes.length; index += 1) {
    if (compareFarmOsStableChangeOrdering(changes[index - 1]!, changes[index]!) >= 0) {
      return invalid("ordering_regression");
    }
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
