import type {
  FarmOsDailyProjectionContent,
} from "./farm_os_operational_memory_compiler";
import {
  isFarmOsBusinessDate,
} from "./farm_os_business_date";

export const FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION =
  "farmos.daily_operational_projection.active_read_response.v1" as const;
export const FARM_OS_ACTIVE_PROJECTION_READ_STATUSES = [
  "current",
  "stale",
  "missing",
  "failed",
] as const;

export type FarmOsActiveProjectionReadStatus =
  typeof FARM_OS_ACTIVE_PROJECTION_READ_STATUSES[number];

type AvailableResponse = {
  schema_version: typeof FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION;
  status: "current" | "stale";
  payload: FarmOsDailyProjectionContent;
  generated_at: string;
};

type UnavailableResponse = {
  schema_version: typeof FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION;
  status: "missing" | "failed";
  payload: null;
  generated_at: null;
};

export type FarmOsActiveProjectionReadResponse =
  | AvailableResponse
  | UnavailableResponse;

export type FarmOsActiveProjectionReadResponseInput =
  | Omit<AvailableResponse, "schema_version">
  | Omit<UnavailableResponse, "schema_version">;

const RESPONSE_KEYS = ["schema_version", "status", "payload", "generated_at"] as const;
const PAYLOAD_KEYS = [
  "business_date",
  "source_record_count",
  "active_record_count",
  "tombstone_count",
  "field_references",
  "crop_cycle_references",
  "work_type_references",
  "verification_status",
  "missing_data_status",
] as const;
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const RFC3339_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/u;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isRfc3339(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = RFC3339_PATTERN.exec(value);
  if (match === null || !Number.isFinite(Date.parse(value))) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (
    !isFarmOsBusinessDate(`${match[1]}-${match[2]}-${match[3]}`) ||
    hour > 23 || minute > 59 || second > 59
  ) return false;
  if (match[8] !== "Z") {
    const offsetHour = Number(match[8]!.slice(1, 3));
    const offsetMinute = Number(match[8]!.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return month >= 1 && month <= 12 && day >= 1;
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 100;
}

function isReferenceArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 &&
    value.every((entry) => typeof entry === "string" && REFERENCE_PATTERN.test(entry)) &&
    new Set(value).size === value.length;
}

function parsePayload(value: unknown): FarmOsDailyProjectionContent | null {
  if (!isRecord(value) || !hasExactKeys(value, PAYLOAD_KEYS)) return null;
  if (
    !isFarmOsBusinessDate(value.business_date) ||
    !isCount(value.source_record_count) ||
    !isCount(value.active_record_count) ||
    !isCount(value.tombstone_count) ||
    value.source_record_count !== value.active_record_count + value.tombstone_count ||
    !isReferenceArray(value.field_references) ||
    !isReferenceArray(value.crop_cycle_references) ||
    !isReferenceArray(value.work_type_references) ||
    value.verification_status !== "stable_change_contract_validated" ||
    (value.missing_data_status !== "complete_for_v1" &&
      value.missing_data_status !== "optional_references_missing")
  ) return null;
  return structuredClone(value) as FarmOsDailyProjectionContent;
}

export function parseFarmOsActiveProjectionReadResponse(
  value: unknown,
): FarmOsActiveProjectionReadResponse | null {
  if (!isRecord(value) || !hasExactKeys(value, RESPONSE_KEYS) ||
    value.schema_version !== FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION ||
    !FARM_OS_ACTIVE_PROJECTION_READ_STATUSES.some((status) => status === value.status)) {
    return null;
  }
  if (value.status === "current" || value.status === "stale") {
    const payload = parsePayload(value.payload);
    return payload === null || !isRfc3339(value.generated_at)
      ? null
      : {
        schema_version: FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION,
        status: value.status,
        payload,
        generated_at: value.generated_at,
      };
  }
  return value.payload === null && value.generated_at === null
    ? {
      schema_version: FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION,
      status: value.status as "missing" | "failed",
      payload: null,
      generated_at: null,
    }
    : null;
}

export function isFarmOsActiveProjectionReadResponse(
  value: unknown,
): value is FarmOsActiveProjectionReadResponse {
  return parseFarmOsActiveProjectionReadResponse(value) !== null;
}

export class FarmOsActiveProjectionReadContractError extends Error {
  readonly code = "active_projection_read_contract_invalid" as const;

  constructor() {
    super("active_projection_read_contract_invalid");
    this.name = "FarmOsActiveProjectionReadContractError";
  }
}

export function assertFarmOsActiveProjectionReadResponse(
  value: unknown,
): asserts value is FarmOsActiveProjectionReadResponse {
  if (!isFarmOsActiveProjectionReadResponse(value)) {
    throw new FarmOsActiveProjectionReadContractError();
  }
}

export function createFarmOsActiveProjectionReadResponse(
  input: FarmOsActiveProjectionReadResponseInput,
): FarmOsActiveProjectionReadResponse {
  const response = {
    schema_version: FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION,
    ...input,
  };
  const parsed = parseFarmOsActiveProjectionReadResponse(response);
  if (parsed === null) throw new FarmOsActiveProjectionReadContractError();
  return parsed;
}
