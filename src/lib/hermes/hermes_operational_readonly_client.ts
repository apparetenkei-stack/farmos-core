import { isHermesOperationalOpaqueReference } from "./hermes_operational_reference_contract";

export const HERMES_OPERATIONAL_READONLY_CLIENT =
  "day92_hermes_operational_readonly_client" as const;

export const APPARETENKEI_READONLY_API_BASE_URL_ENV =
  "APPARETENKEI_READONLY_API_BASE_URL" as const;
export const FARMOS_CORE_READONLY_TOKEN_ENV =
  "FARMOS_CORE_READONLY_TOKEN" as const;
export const APPARETENKEI_READONLY_API_TIMEOUT_MS_ENV =
  "APPARETENKEI_READONLY_API_TIMEOUT_MS" as const;

export const HERMES_OPERATIONAL_READONLY_DEFAULT_LIMIT = 100 as const;
export const HERMES_OPERATIONAL_READONLY_MAX_LIMIT = 100 as const;
export const HERMES_OPERATIONAL_READONLY_DEFAULT_TIMEOUT_MS = 5000 as const;
export const HERMES_OPERATIONAL_READONLY_MIN_TIMEOUT_MS = 100 as const;
export const HERMES_OPERATIONAL_READONLY_MAX_TIMEOUT_MS = 30000 as const;

const INVENTORY_ENDPOINT_PATH =
  "/api/farmos-core/inventory-summary" as const;
const WORK_LOG_ENDPOINT_PATH =
  "/api/farmos-core/recent-work-logs" as const;
const FIELD_ENDPOINT_PATH = "/api/farmos-core/fields" as const;
const CROP_CYCLE_ENDPOINT_PATH = "/api/farmos-core/crop-cycles" as const;
const MAX_RESPONSE_CHARS = 1_000_000;
const MAX_DISPLAY_TEXT_CHARS = 120;
const MAX_FIELD_REFERENCES = 100;

type EnvMap = Record<string, string | undefined>;
type JsonRecord = Record<string, unknown>;
type PrimitiveId = string | number;
type NullableQuantity = string | number | null;

export type HermesOperationalInventoryRecord = {
  id: PrimitiveId;
  name: string;
  baseType: string | null;
  currentQuantity: NullableQuantity;
  unit: string | null;
};

export type HermesOperationalAppliedMaterial = {
  materialId: PrimitiveId | null;
  materialName: string | null;
  quantity: NullableQuantity;
  unit: string | null;
};

export type HermesOperationalWorkLogRecord = {
  id: PrimitiveId;
  startedAt: string | null;
  fieldId: PrimitiveId | null;
  workTypeId: PrimitiveId | null;
  workTypeName: string | null;
  durationMinutes: NullableQuantity;
  targetCrop: string | null;
  cropCycleId: PrimitiveId | null;
  machineId: PrimitiveId | null;
  implementId: PrimitiveId | null;
  yieldAmount: NullableQuantity;
  yieldUnit: string | null;
  appliedMaterials: HermesOperationalAppliedMaterial[] | null;
};

export type HermesOperationalFieldRecord = {
  reference: string;
  display_name: string;
  active_state: "unknown";
  source_updated_at?: string | null;
  updated_at?: string | null;
};

export type HermesOperationalCropCycleRecord = {
  reference: string;
  field_references: string[];
  crop_display_name: string | null;
  cycle_state: "unknown";
  operational_start_date: string | null;
  source_updated_at?: string | null;
  updated_at?: string | null;
};

type HermesOperationalSourceType =
  | "inventory"
  | "work_log"
  | "field"
  | "crop_cycle";

type HermesOperationalRecord =
  | HermesOperationalInventoryRecord
  | HermesOperationalWorkLogRecord
  | HermesOperationalFieldRecord
  | HermesOperationalCropCycleRecord;

type HermesOperationalEndpointPath =
  | typeof INVENTORY_ENDPOINT_PATH
  | typeof WORK_LOG_ENDPOINT_PATH
  | typeof FIELD_ENDPOINT_PATH
  | typeof CROP_CYCLE_ENDPOINT_PATH;

type HermesOperationalResponseSource =
  | "apparetenkei_inventory_readonly"
  | "apparetenkei_work_logs_readonly"
  | "apparetenkei_fields_readonly"
  | "apparetenkei_crop_cycles_readonly";

export type HermesOperationalReadonlyErrorCode =
  | "configuration_unavailable"
  | "invalid_limit"
  | "timeout"
  | "network_unavailable"
  | "remote_http_error"
  | "invalid_response";

export type HermesOperationalResponseValidationFailureReason =
  | "invalid_top_level_keys"
  | "invalid_schema_version"
  | "invalid_result"
  | "invalid_available"
  | "invalid_response_source"
  | "invalid_generated_at"
  | "invalid_read_only"
  | "invalid_record_count"
  | "invalid_records"
  | "invalid_record_keys"
  | "invalid_record_reference"
  | "invalid_source_updated_at"
  | "invalid_pagination"
  | "invalid_safety_keys"
  | "invalid_safety_value";

export type HermesOperationalResponseContractDiagnostics = {
  top_level_keys: string[];
  top_level_types: Record<string, string>;
  safety_keys: string[];
  safety_types: Record<string, string>;
  first_record_keys: string[];
  first_record_types: Record<string, string>;
  validator_failure_reason: HermesOperationalResponseValidationFailureReason | null;
};

export type HermesOperationalReadonlySourceResult<TRecord> = {
  result: "ok" | "error";
  source_type: HermesOperationalSourceType;
  endpoint_path: HermesOperationalEndpointPath;
  http_method: "GET";
  fetch_performed: boolean;
  available: boolean;
  transaction_read_only: true;
  requested_limit: number;
  http_status: number | null;
  response_source: HermesOperationalResponseSource | null;
  observed_at: string | null;
  source_updated_at: string | null;
  /** @deprecated Use source_updated_at. Retained as a compatibility alias. */
  generated_at: string | null;
  record_count: number;
  records: TRecord[];
  has_more: boolean;
  error_code: HermesOperationalReadonlyErrorCode | null;
  response_contract_diagnostics?: HermesOperationalResponseContractDiagnostics;
  write_performed: false;
  restricted_fields_exposed: false;
  credentials_exposed: false;
};

/**
 * Fixture-compatible input shape. Production reads use the required four-source
 * subtype below; missing legacy field/crop-cycle inputs normalize to unavailable
 * at the Daily Farm Snapshot boundary.
 */
export type HermesOperationalReadonlyClientResult = {
  result: "ok" | "partial" | "error";
  checked: "hermes_operational_readonly_client";
  boundary: typeof HERMES_OPERATIONAL_READONLY_CLIENT;
  inventory: HermesOperationalReadonlySourceResult<HermesOperationalInventoryRecord>;
  work_log: HermesOperationalReadonlySourceResult<HermesOperationalWorkLogRecord>;
  field?: HermesOperationalReadonlySourceResult<HermesOperationalFieldRecord>;
  crop_cycle?: HermesOperationalReadonlySourceResult<HermesOperationalCropCycleRecord>;
  inventory_source_connected: boolean;
  work_log_source_connected: boolean;
  field_source_connected?: boolean;
  crop_cycle_source_connected?: boolean;
  external_fetch_performed: boolean;
  hermes_context_injection_performed: false;
  suggestion_generation_performed: false;
  proposal_created: false;
  proposal_saved: false;
  proposal_apply_performed: false;
  app_db_write_performed: false;
  core_db_write_performed: false;
  audit_write_performed: false;
  database_write_performed: false;
  credentials_exposed: false;
  arbitrary_endpoint_allowed: false;
  arbitrary_method_allowed: false;
};

export type HermesOperationalReadonlyFourSourceClientResult = Omit<
  HermesOperationalReadonlyClientResult,
  "field" | "crop_cycle" | "field_source_connected" | "crop_cycle_source_connected"
> & {
  field: HermesOperationalReadonlySourceResult<HermesOperationalFieldRecord>;
  crop_cycle: HermesOperationalReadonlySourceResult<HermesOperationalCropCycleRecord>;
  field_source_connected: boolean;
  crop_cycle_source_connected: boolean;
};

type ResolvedConfig =
  | {
      ok: true;
      baseUrl: string;
      token: string;
      timeoutMs: number;
      limit: number;
    }
  | {
      ok: false;
      errorCode: "configuration_unavailable" | "invalid_limit";
      limit: number;
    };

type ValidatedEnvelope<TRecord> = {
  source: HermesOperationalResponseSource;
  generatedAt: string;
  sourceUpdatedAt: string | null;
  recordCount: number;
  records: TRecord[];
  pagination: {
    limit: number;
    hasMore: boolean;
  };
};

const RESTRICTED_NORMALIZED_KEYS = new Set([
  "workername",
  "workerid",
  "memberid",
  "createdby",
  "priceperunit",
  "manufacturer",
  "email",
  "phonenumber",
  "phone",
  "address",
  "salary",
  "wage",
  "payroll",
  "session",
  "cookie",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "servicerole",
  "credential",
  "credentials",
  "details",
]);

const INVENTORY_ALLOWED_KEYS = new Set([
  "id",
  "name",
  "baseType",
  "currentQuantity",
  "unit",
]);

const WORK_LOG_ALLOWED_KEYS = new Set([
  "id",
  "startedAt",
  "fieldId",
  "workTypeId",
  "workTypeName",
  "durationMinutes",
  "targetCrop",
  "cropCycleId",
  "machineId",
  "implementId",
  "yieldAmount",
  "yieldUnit",
  "appliedMaterials",
]);

const APPLIED_MATERIAL_ALLOWED_KEYS = new Set([
  "materialId",
  "materialName",
  "quantity",
  "unit",
]);

const DAY122_ENVELOPE_KEYS = [
  "result",
  "schema_version",
  "source",
  "generated_at",
  "available",
  "readOnly",
  "record_count",
  "records",
  "pagination",
  "safety",
] as const;
const DAY122_PAGINATION_KEYS = ["limit", "hasMore"] as const;
const DAY122_SAFETY_KEYS = ["restrictedFieldsExposed", "writePerformed"] as const;
const FIELD_REQUIRED_RECORD_KEYS = ["reference", "display_name", "active_state"] as const;
const FIELD_ALLOWED_RECORD_KEYS = new Set([...FIELD_REQUIRED_RECORD_KEYS, "source_updated_at", "updated_at"]);
const CROP_CYCLE_REQUIRED_RECORD_KEYS = ["reference", "field_references", "crop_display_name", "cycle_state", "operational_start_date"] as const;
const CROP_CYCLE_ALLOWED_RECORD_KEYS = new Set([...CROP_CYCLE_REQUIRED_RECORD_KEYS, "source_updated_at", "updated_at"]);
const OPERATIONAL_SOURCE_RESULT_KEYS = [
  "result",
  "source_type",
  "endpoint_path",
  "http_method",
  "fetch_performed",
  "available",
  "transaction_read_only",
  "requested_limit",
  "http_status",
  "response_source",
  "generated_at",
  "record_count",
  "records",
  "has_more",
  "error_code",
  "write_performed",
  "restricted_fields_exposed",
  "credentials_exposed",
] as const;
const OPERATIONAL_SOURCE_RESULT_ALLOWED_KEYS = new Set([
  ...OPERATIONAL_SOURCE_RESULT_KEYS,
  "observed_at",
  "source_updated_at",
  "response_contract_diagnostics",
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: JsonRecord, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function hasRequiredKeys(value: JsonRecord, required: readonly string[]): boolean {
  return required.every((key) => Object.hasOwn(value, key));
}

function jsonTypeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function sortedShape(value: unknown): { keys: string[]; types: Record<string, string> } {
  if (!isRecord(value)) return { keys: [], types: {} };
  const keys = Object.keys(value).sort();
  return {
    keys,
    types: Object.fromEntries(keys.map((key) => [key, jsonTypeName(value[key])])),
  };
}

function responseContractDiagnostics(
  value: unknown,
  validatorFailureReason: HermesOperationalResponseValidationFailureReason | null,
): HermesOperationalResponseContractDiagnostics {
  const topLevel = sortedShape(value);
  const safety = sortedShape(isRecord(value) ? value.safety : undefined);
  const records = isRecord(value) && Array.isArray(value.records) ? value.records : [];
  const firstRecord = sortedShape(records[0]);
  return {
    top_level_keys: topLevel.keys,
    top_level_types: topLevel.types,
    safety_keys: safety.keys,
    safety_types: safety.types,
    first_record_keys: firstRecord.keys,
    first_record_types: firstRecord.types,
    validator_failure_reason: validatorFailureReason,
  };
}

function validateResponseContractDiagnostics(value: unknown): boolean {
  if (!isRecord(value) || !hasExactKeys(value, [
    "top_level_keys",
    "top_level_types",
    "safety_keys",
    "safety_types",
    "first_record_keys",
    "first_record_types",
    "validator_failure_reason",
  ])) return false;
  const validKeys = (keys: unknown): keys is string[] => Array.isArray(keys) && keys.every((key) => typeof key === "string") && [...keys].sort().every((key, index) => key === keys[index]);
  const validTypes = (types: unknown, keys: string[]): boolean => isRecord(types) && hasExactKeys(types, keys) && Object.values(types).every((type) => ["array", "bigint", "boolean", "function", "null", "number", "object", "string", "symbol", "undefined"].includes(String(type)));
  const reasons: readonly (HermesOperationalResponseValidationFailureReason | null)[] = [
    null, "invalid_top_level_keys", "invalid_schema_version", "invalid_result", "invalid_available",
    "invalid_response_source", "invalid_generated_at", "invalid_read_only", "invalid_record_count",
    "invalid_records", "invalid_record_keys", "invalid_record_reference", "invalid_source_updated_at",
    "invalid_pagination", "invalid_safety_keys", "invalid_safety_value",
  ];
  return validKeys(value.top_level_keys) && validTypes(value.top_level_types, value.top_level_keys) &&
    validKeys(value.safety_keys) && validTypes(value.safety_types, value.safety_keys) &&
    validKeys(value.first_record_keys) && validTypes(value.first_record_types, value.first_record_keys) &&
    reasons.includes(value.validator_failure_reason as HermesOperationalResponseValidationFailureReason | null);
}

function sourceUpdatedAt(value: JsonRecord): unknown {
  if (Object.hasOwn(value, "source_updated_at") && Object.hasOwn(value, "updated_at")) return undefined;
  return Object.hasOwn(value, "source_updated_at") ? value.source_updated_at : Object.hasOwn(value, "updated_at") ? value.updated_at : null;
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isCanonicalBusinessDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isBoundedPlainText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value);
}

function isReference(value: unknown): value is string {
  return isHermesOperationalOpaqueReference(value);
}

function isPrimitiveId(value: unknown): value is PrimitiveId {
  return typeof value === "string" || typeof value === "number";
}

function isNullablePrimitiveId(value: unknown): value is PrimitiveId | null {
  return value === null || isPrimitiveId(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableQuantity(value: unknown): value is NullableQuantity {
  return (
    value === null ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function containsRestrictedKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsRestrictedKey(item));
  }

  if (!isRecord(value)) {
    return false;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (RESTRICTED_NORMALIZED_KEYS.has(normalizeKey(key))) {
      return true;
    }

    if (containsRestrictedKey(nested)) {
      return true;
    }
  }

  return false;
}

function validateInventoryRecord(
  value: unknown,
): value is HermesOperationalInventoryRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, INVENTORY_ALLOWED_KEYS)) {
    return false;
  }

  return (
    isPrimitiveId(value.id) &&
    typeof value.name === "string" &&
    isNullableString(value.baseType) &&
    isNullableQuantity(value.currentQuantity) &&
    isNullableString(value.unit)
  );
}

function validateAppliedMaterial(
  value: unknown,
): value is HermesOperationalAppliedMaterial {
  if (!isRecord(value) || !hasOnlyKeys(value, APPLIED_MATERIAL_ALLOWED_KEYS)) {
    return false;
  }

  return (
    isNullablePrimitiveId(value.materialId) &&
    isNullableString(value.materialName) &&
    isNullableQuantity(value.quantity) &&
    isNullableString(value.unit)
  );
}

function validateWorkLogRecord(
  value: unknown,
): value is HermesOperationalWorkLogRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, WORK_LOG_ALLOWED_KEYS)) {
    return false;
  }

  const appliedMaterialsValid =
    value.appliedMaterials === null ||
    (
      Array.isArray(value.appliedMaterials) &&
      value.appliedMaterials.every((item) => validateAppliedMaterial(item))
    );

  return (
    isPrimitiveId(value.id) &&
    isNullableString(value.startedAt) &&
    isNullablePrimitiveId(value.fieldId) &&
    isNullablePrimitiveId(value.workTypeId) &&
    isNullableString(value.workTypeName) &&
    isNullableQuantity(value.durationMinutes) &&
    isNullableString(value.targetCrop) &&
    isNullablePrimitiveId(value.cropCycleId) &&
    isNullablePrimitiveId(value.machineId) &&
    isNullablePrimitiveId(value.implementId) &&
    isNullableQuantity(value.yieldAmount) &&
    isNullableString(value.yieldUnit) &&
    appliedMaterialsValid
  );
}

function validateFieldRecord(value: unknown): value is HermesOperationalFieldRecord {
  return validateFieldRecordKeys(value) && validateFieldRecordReference(value) && validateRecordSourceUpdatedAt(value) && validateFieldRecordValues(value);
}

function validateCropCycleRecord(value: unknown): value is HermesOperationalCropCycleRecord {
  return validateCropCycleRecordKeys(value) && validateCropCycleRecordReference(value) && validateRecordSourceUpdatedAt(value) && validateCropCycleRecordValues(value);
}

function validateFieldRecordKeys(value: unknown): value is JsonRecord {
  return isRecord(value) && hasOnlyKeys(value, FIELD_ALLOWED_RECORD_KEYS) && hasRequiredKeys(value, FIELD_REQUIRED_RECORD_KEYS);
}

function validateCropCycleRecordKeys(value: unknown): value is JsonRecord {
  return isRecord(value) && hasOnlyKeys(value, CROP_CYCLE_ALLOWED_RECORD_KEYS) && hasRequiredKeys(value, CROP_CYCLE_REQUIRED_RECORD_KEYS);
}

function validateFieldRecordReference(value: JsonRecord): boolean {
  return isReference(value.reference);
}

function validateCropCycleRecordReference(value: JsonRecord): boolean {
  return isReference(value.reference) && Array.isArray(value.field_references) && value.field_references.length <= MAX_FIELD_REFERENCES && value.field_references.every(isReference) && new Set(value.field_references).size === value.field_references.length;
}

function validateRecordSourceUpdatedAt(value: JsonRecord): boolean {
  const updatedAt = sourceUpdatedAt(value);
  return updatedAt === null || isCanonicalIso(updatedAt);
}

function validateFieldRecordValues(value: JsonRecord): boolean {
  return isBoundedPlainText(value.display_name, MAX_DISPLAY_TEXT_CHARS) && value.active_state === "unknown";
}

function validateCropCycleRecordValues(value: JsonRecord): boolean {
  return (value.crop_display_name === null || isBoundedPlainText(value.crop_display_name, MAX_DISPLAY_TEXT_CHARS)) && value.cycle_state === "unknown" && (value.operational_start_date === null || isCanonicalBusinessDate(value.operational_start_date));
}

export function parseHermesOperationalReadonlySourceResult(
  value: unknown,
  sourceType: HermesOperationalSourceType,
): HermesOperationalReadonlySourceResult<HermesOperationalRecord> | null {
  if (!isRecord(value) || !hasRequiredKeys(value, OPERATIONAL_SOURCE_RESULT_KEYS) || !hasOnlyKeys(value, OPERATIONAL_SOURCE_RESULT_ALLOWED_KEYS)) {
    return null;
  }

  const validateRecord = sourceType === "inventory"
    ? validateInventoryRecord
    : sourceType === "work_log"
      ? validateWorkLogRecord
      : sourceType === "field"
        ? validateFieldRecord
        : validateCropCycleRecord;
  const expectedEndpoint: Record<HermesOperationalSourceType, HermesOperationalEndpointPath> = {
    inventory: INVENTORY_ENDPOINT_PATH,
    work_log: WORK_LOG_ENDPOINT_PATH,
    field: FIELD_ENDPOINT_PATH,
    crop_cycle: CROP_CYCLE_ENDPOINT_PATH,
  };
  const expectedResponseSource: Record<HermesOperationalSourceType, HermesOperationalResponseSource> = {
    inventory: "apparetenkei_inventory_readonly",
    work_log: "apparetenkei_work_logs_readonly",
    field: "apparetenkei_fields_readonly",
    crop_cycle: "apparetenkei_crop_cycles_readonly",
  };
  const validErrorCodes: readonly HermesOperationalReadonlyErrorCode[] = [
    "configuration_unavailable",
    "invalid_limit",
    "timeout",
    "network_unavailable",
    "remote_http_error",
    "invalid_response",
  ];
  const observedAtPresent = Object.hasOwn(value, "observed_at");
  const sourceUpdatedAtPresent = Object.hasOwn(value, "source_updated_at");

  if (
    !["ok", "error"].includes(String(value.result)) ||
    value.source_type !== sourceType ||
    value.endpoint_path !== expectedEndpoint[sourceType] ||
    value.http_method !== "GET" ||
    typeof value.fetch_performed !== "boolean" ||
    typeof value.available !== "boolean" ||
    ((value.result === "ok" && value.available !== true) ||
      (value.result === "error" && value.available !== false)) ||
    value.transaction_read_only !== true ||
    !Number.isSafeInteger(value.requested_limit) ||
    Number(value.requested_limit) < 1 ||
    Number(value.requested_limit) > HERMES_OPERATIONAL_READONLY_MAX_LIMIT ||
    (value.http_status !== null &&
      (!Number.isSafeInteger(value.http_status) ||
        Number(value.http_status) < 100 ||
        Number(value.http_status) > 599)) ||
    (value.response_source !== null &&
      value.response_source !== expectedResponseSource[sourceType]) ||
    observedAtPresent !== sourceUpdatedAtPresent ||
    (observedAtPresent &&
      (value.result === "ok"
        ? !isCanonicalIso(value.observed_at)
        : value.observed_at !== null)) ||
    (value.observed_at !== undefined &&
      value.observed_at !== null &&
      !isCanonicalIso(value.observed_at)) ||
    (value.source_updated_at !== undefined &&
      value.source_updated_at !== null &&
      !isCanonicalIso(value.source_updated_at)) ||
    (value.source_updated_at !== undefined &&
      value.generated_at !== value.source_updated_at) ||
    (sourceUpdatedAtPresent &&
      value.result === "error" &&
      value.source_updated_at !== null) ||
    (value.generated_at !== null && !isCanonicalIso(value.generated_at)) ||
    !Number.isSafeInteger(value.record_count) ||
    Number(value.record_count) < 0 ||
    !Array.isArray(value.records) ||
    value.records.length !== value.record_count ||
    !value.records.every(validateRecord) ||
    typeof value.has_more !== "boolean" ||
    (value.error_code !== null &&
      !validErrorCodes.includes(value.error_code as HermesOperationalReadonlyErrorCode)) ||
    value.write_performed !== false ||
    value.restricted_fields_exposed !== false ||
    value.credentials_exposed !== false ||
    (value.response_contract_diagnostics !== undefined && !validateResponseContractDiagnostics(value.response_contract_diagnostics))
  ) {
    return null;
  }

  if (
    (sourceType === "field" || sourceType === "crop_cycle") &&
    new Set(value.records.map((record) => (record as { reference: string }).reference)).size !==
      value.records.length
  ) {
    return null;
  }

  return structuredClone(
    observedAtPresent
      ? value
      : {
          ...value,
          observed_at: null,
          source_updated_at: value.generated_at,
        },
  ) as HermesOperationalReadonlySourceResult<HermesOperationalRecord>;
}

function normalizeBaseUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    if (
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0 ||
      (parsed.pathname !== "" && parsed.pathname !== "/")
    ) {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeTimeoutMs(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return HERMES_OPERATIONAL_READONLY_DEFAULT_TIMEOUT_MS;
  }

  const normalized = String(value).trim();
  if (!/^[0-9]+$/u.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (
    !Number.isSafeInteger(parsed) ||
    parsed < HERMES_OPERATIONAL_READONLY_MIN_TIMEOUT_MS ||
    parsed > HERMES_OPERATIONAL_READONLY_MAX_TIMEOUT_MS
  ) {
    return null;
  }

  return parsed;
}

function normalizeLimit(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return HERMES_OPERATIONAL_READONLY_DEFAULT_LIMIT;
  }

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > HERMES_OPERATIONAL_READONLY_MAX_LIMIT
  ) {
    return null;
  }

  return value;
}

function resolveConfig(input: {
  env: EnvMap;
  limit?: unknown;
}): ResolvedConfig {
  const limit = normalizeLimit(input.limit);
  if (limit === null) {
    return {
      ok: false,
      errorCode: "invalid_limit",
      limit: HERMES_OPERATIONAL_READONLY_DEFAULT_LIMIT,
    };
  }

  const baseUrl = normalizeBaseUrl(
    input.env[APPARETENKEI_READONLY_API_BASE_URL_ENV],
  );
  const token =
    input.env[FARMOS_CORE_READONLY_TOKEN_ENV]?.trim() ?? "";
  const timeoutMs = normalizeTimeoutMs(
    input.env[APPARETENKEI_READONLY_API_TIMEOUT_MS_ENV],
  );

  if (baseUrl === null || token.length === 0 || timeoutMs === null) {
    return {
      ok: false,
      errorCode: "configuration_unavailable",
      limit,
    };
  }

  return {
    ok: true,
    baseUrl,
    token,
    timeoutMs,
    limit,
  };
}

function createErrorSource<TRecord>(input: {
  sourceType: HermesOperationalSourceType;
  endpointPath: HermesOperationalEndpointPath;
  limit: number;
  errorCode: HermesOperationalReadonlyErrorCode;
  fetchPerformed?: boolean;
  httpStatus?: number | null;
  responseContractDiagnostics?: HermesOperationalResponseContractDiagnostics;
}): HermesOperationalReadonlySourceResult<TRecord> {
  return {
    result: "error",
    source_type: input.sourceType,
    endpoint_path: input.endpointPath,
    http_method: "GET",
    fetch_performed: input.fetchPerformed ?? false,
    available: false,
    transaction_read_only: true,
    requested_limit: input.limit,
    http_status: input.httpStatus ?? null,
    response_source: null,
    observed_at: null,
    source_updated_at: null,
    generated_at: null,
    record_count: 0,
    records: [],
    has_more: false,
    error_code: input.errorCode,
    ...(input.responseContractDiagnostics === undefined ? {} : { response_contract_diagnostics: input.responseContractDiagnostics }),
    write_performed: false,
    restricted_fields_exposed: false,
    credentials_exposed: false,
  };
}

function validateEnvelope<TRecord>(input: {
  value: unknown;
  expectedSource:
    | "apparetenkei_inventory_readonly"
    | "apparetenkei_work_logs_readonly";
  requestedLimit: number;
  validateRecord: (value: unknown) => value is TRecord;
}): ValidatedEnvelope<TRecord> | null {
  if (!isRecord(input.value) || containsRestrictedKey(input.value)) {
    return null;
  }

  const camelUpdatedAtPresent = Object.hasOwn(input.value, "updatedAt");
  const snakeUpdatedAtPresent = Object.hasOwn(input.value, "updated_at");
  const sourceUpdatedAt = camelUpdatedAtPresent
    ? input.value.updatedAt
    : snakeUpdatedAtPresent
      ? input.value.updated_at
      : null;

  if (
    input.value.result !== "ok" ||
    input.value.source !== input.expectedSource ||
    typeof input.value.generatedAt !== "string" ||
    !isCanonicalIso(input.value.generatedAt) ||
    input.value.readOnly !== true ||
    !Number.isSafeInteger(input.value.recordCount) ||
    Number(input.value.recordCount) < 0 ||
    !Array.isArray(input.value.records) ||
    !isRecord(input.value.pagination) ||
    input.value.pagination.limit !== input.requestedLimit ||
    typeof input.value.pagination.hasMore !== "boolean" ||
    !isRecord(input.value.safety) ||
    input.value.safety.writePerformed !== false ||
    input.value.safety.restrictedFieldsExposed !== false ||
    (camelUpdatedAtPresent && snakeUpdatedAtPresent) ||
    (sourceUpdatedAt !== null && !isCanonicalIso(sourceUpdatedAt))
  ) {
    return null;
  }

  const records = input.value.records;
  if (
    records.length !== input.value.recordCount ||
    !records.every((record) => input.validateRecord(record))
  ) {
    return null;
  }

  return {
    source: input.expectedSource,
    generatedAt: input.value.generatedAt,
    sourceUpdatedAt: sourceUpdatedAt as string | null,
    recordCount: records.length,
    records,
    pagination: {
      limit: input.requestedLimit,
      hasMore: input.value.pagination.hasMore,
    },
  };
}

type Day122EnvelopeValidation<TRecord> = {
  envelope: ValidatedEnvelope<TRecord> | null;
  diagnostics: HermesOperationalResponseContractDiagnostics;
};

function validateDay122Envelope<TRecord>(input: {
  value: unknown;
  schemaVersion: "farmos.core.fields.read.v1" | "farmos.core.crop_cycles.read.v1";
  expectedSource: "apparetenkei_fields_readonly" | "apparetenkei_crop_cycles_readonly";
  requestedLimit: number;
  validateRecordKeys: (value: unknown) => value is JsonRecord;
  validateRecordReference: (value: JsonRecord) => boolean;
  validateRecordValues: (value: JsonRecord) => boolean;
  recordReference: (value: TRecord) => string;
}): Day122EnvelopeValidation<TRecord> {
  const rejected = (reason: HermesOperationalResponseValidationFailureReason): Day122EnvelopeValidation<TRecord> => ({
    envelope: null,
    diagnostics: responseContractDiagnostics(input.value, reason),
  });
  if (!isRecord(input.value) || !hasExactKeys(input.value, DAY122_ENVELOPE_KEYS)) return rejected("invalid_top_level_keys");
  if (input.value.schema_version !== input.schemaVersion) return rejected("invalid_schema_version");
  if (input.value.result !== "ok") return rejected("invalid_result");
  if (input.value.available !== true) return rejected("invalid_available");
  if (input.value.source !== input.expectedSource) return rejected("invalid_response_source");
  if (!isCanonicalIso(input.value.generated_at)) return rejected("invalid_generated_at");
  if (input.value.readOnly !== true) return rejected("invalid_read_only");
  if (!Number.isSafeInteger(input.value.record_count) || Number(input.value.record_count) < 0) return rejected("invalid_record_count");
  if (!Array.isArray(input.value.records)) return rejected("invalid_records");
  if (input.value.records.length !== input.value.record_count) return rejected("invalid_record_count");
  if (!isRecord(input.value.pagination) || !hasExactKeys(input.value.pagination, DAY122_PAGINATION_KEYS) || input.value.pagination.limit !== input.requestedLimit || !Number.isSafeInteger(input.value.pagination.limit) || Number(input.value.pagination.limit) < 1 || Number(input.value.pagination.limit) > HERMES_OPERATIONAL_READONLY_MAX_LIMIT || typeof input.value.pagination.hasMore !== "boolean") return rejected("invalid_pagination");
  if (!isRecord(input.value.safety) || !hasExactKeys(input.value.safety, DAY122_SAFETY_KEYS)) return rejected("invalid_safety_keys");
  if (input.value.safety.writePerformed !== false || input.value.safety.restrictedFieldsExposed !== false) return rejected("invalid_safety_value");
  if (!input.value.records.every(input.validateRecordKeys)) return rejected("invalid_record_keys");
  const recordsAsJson = input.value.records as JsonRecord[];
  if (!recordsAsJson.every(input.validateRecordReference)) return rejected("invalid_record_reference");
  if (!recordsAsJson.every(validateRecordSourceUpdatedAt)) return rejected("invalid_source_updated_at");
  if (!recordsAsJson.every(input.validateRecordValues)) return rejected("invalid_records");

  const records = input.value.records as TRecord[];
  if (new Set(records.map(input.recordReference)).size !== records.length) return rejected("invalid_record_reference");

  return {
    envelope: {
      source: input.expectedSource,
      generatedAt: input.value.generated_at,
      sourceUpdatedAt: input.value.records.reduce<string | null>((latest, record) => {
        const item = record as { source_updated_at?: unknown; updated_at?: unknown };
        const updatedAt = item.source_updated_at ?? item.updated_at;
        return typeof updatedAt === "string" && (latest === null || Date.parse(updatedAt) > Date.parse(latest)) ? updatedAt : latest;
      }, null),
      recordCount: input.value.records.length,
      records,
      pagination: {
        limit: input.requestedLimit,
        hasMore: input.value.pagination.hasMore,
      },
    },
    diagnostics: responseContractDiagnostics(input.value, null),
  };
}

async function readSource<TRecord>(input: {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  limit: number;
  sourceType: "inventory" | "work_log";
  endpointPath:
    | typeof INVENTORY_ENDPOINT_PATH
    | typeof WORK_LOG_ENDPOINT_PATH;
  expectedSource:
    | "apparetenkei_inventory_readonly"
    | "apparetenkei_work_logs_readonly";
  validateRecord: (value: unknown) => value is TRecord;
  fetchImpl: typeof fetch;
}): Promise<HermesOperationalReadonlySourceResult<TRecord>> {
  const url = new URL(input.endpointPath, input.baseUrl);
  url.searchParams.set("limit", String(input.limit));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await input.fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.token}`,
      },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      return createErrorSource({
        sourceType: input.sourceType,
        endpointPath: input.endpointPath,
        limit: input.limit,
        errorCode: "remote_http_error",
        fetchPerformed: true,
        httpStatus: response.status,
      });
    }

    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) {
      return createErrorSource({
        sourceType: input.sourceType,
        endpointPath: input.endpointPath,
        limit: input.limit,
        errorCode: "invalid_response",
        fetchPerformed: true,
        httpStatus: response.status,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return createErrorSource({
        sourceType: input.sourceType,
        endpointPath: input.endpointPath,
        limit: input.limit,
        errorCode: "invalid_response",
        fetchPerformed: true,
        httpStatus: response.status,
      });
    }

    const envelope = validateEnvelope({
      value: parsed,
      expectedSource: input.expectedSource,
      requestedLimit: input.limit,
      validateRecord: input.validateRecord,
    });

    if (!envelope) {
      return createErrorSource({
        sourceType: input.sourceType,
        endpointPath: input.endpointPath,
        limit: input.limit,
        errorCode: "invalid_response",
        fetchPerformed: true,
        httpStatus: response.status,
      });
    }

    return {
      result: "ok",
      source_type: input.sourceType,
      endpoint_path: input.endpointPath,
      http_method: "GET",
      fetch_performed: true,
      available: true,
      transaction_read_only: true,
      requested_limit: input.limit,
      http_status: response.status,
      response_source: envelope.source,
      observed_at: envelope.generatedAt,
      source_updated_at: envelope.sourceUpdatedAt,
      generated_at: envelope.sourceUpdatedAt,
      record_count: envelope.recordCount,
      records: envelope.records,
      has_more: envelope.pagination.hasMore,
      error_code: null,
      write_performed: false,
      restricted_fields_exposed: false,
      credentials_exposed: false,
    };
  } catch (error) {
    const timedOut =
      controller.signal.aborted ||
      (
        error instanceof DOMException &&
        error.name === "AbortError"
      );

    return createErrorSource({
      sourceType: input.sourceType,
      endpointPath: input.endpointPath,
      limit: input.limit,
      errorCode: timedOut ? "timeout" : "network_unavailable",
      fetchPerformed: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readDay122Source<TRecord>(input: {
  baseUrl: string;
  token: string;
  timeoutMs: number;
  limit: number;
  sourceType: "field" | "crop_cycle";
  endpointPath: typeof FIELD_ENDPOINT_PATH | typeof CROP_CYCLE_ENDPOINT_PATH;
  schemaVersion: "farmos.core.fields.read.v1" | "farmos.core.crop_cycles.read.v1";
  expectedSource: "apparetenkei_fields_readonly" | "apparetenkei_crop_cycles_readonly";
  validateRecordKeys: (value: unknown) => value is JsonRecord;
  validateRecordReference: (value: JsonRecord) => boolean;
  validateRecordValues: (value: JsonRecord) => boolean;
  recordReference: (value: TRecord) => string;
  fetchImpl: typeof fetch;
}): Promise<HermesOperationalReadonlySourceResult<TRecord>> {
  const url = new URL(input.endpointPath, input.baseUrl);
  url.searchParams.set("limit", String(input.limit));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await input.fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${input.token}` },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok || response.redirected) {
      return createErrorSource({ sourceType: input.sourceType, endpointPath: input.endpointPath, limit: input.limit, errorCode: "remote_http_error", fetchPerformed: true, httpStatus: response.status });
    }
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) {
      return createErrorSource({ sourceType: input.sourceType, endpointPath: input.endpointPath, limit: input.limit, errorCode: "invalid_response", fetchPerformed: true, httpStatus: response.status });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return createErrorSource({ sourceType: input.sourceType, endpointPath: input.endpointPath, limit: input.limit, errorCode: "invalid_response", fetchPerformed: true, httpStatus: response.status });
    }
    const validation = validateDay122Envelope({
      value: parsed,
      schemaVersion: input.schemaVersion,
      expectedSource: input.expectedSource,
      requestedLimit: input.limit,
      validateRecordKeys: input.validateRecordKeys,
      validateRecordReference: input.validateRecordReference,
      validateRecordValues: input.validateRecordValues,
      recordReference: input.recordReference,
    });
    if (validation.envelope === null) {
      return createErrorSource({ sourceType: input.sourceType, endpointPath: input.endpointPath, limit: input.limit, errorCode: "invalid_response", fetchPerformed: true, httpStatus: response.status, responseContractDiagnostics: validation.diagnostics });
    }
    const envelope = validation.envelope;
    return {
      result: "ok",
      source_type: input.sourceType,
      endpoint_path: input.endpointPath,
      http_method: "GET",
      fetch_performed: true,
      available: true,
      transaction_read_only: true,
      requested_limit: input.limit,
      http_status: response.status,
      response_source: envelope.source,
      observed_at: envelope.generatedAt,
      source_updated_at: envelope.sourceUpdatedAt,
      generated_at: envelope.sourceUpdatedAt,
      record_count: envelope.recordCount,
      records: envelope.records,
      has_more: envelope.pagination.hasMore,
      error_code: null,
      response_contract_diagnostics: validation.diagnostics,
      write_performed: false,
      restricted_fields_exposed: false,
      credentials_exposed: false,
    };
  } catch (error) {
    const timedOut = controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError");
    return createErrorSource({ sourceType: input.sourceType, endpointPath: input.endpointPath, limit: input.limit, errorCode: timedOut ? "timeout" : "network_unavailable", fetchPerformed: true });
  } finally {
    clearTimeout(timeout);
  }
}

function validateCropCycleFieldRelations(input: {
  field: HermesOperationalReadonlySourceResult<HermesOperationalFieldRecord>;
  cropCycle: HermesOperationalReadonlySourceResult<HermesOperationalCropCycleRecord>;
}): HermesOperationalReadonlySourceResult<HermesOperationalCropCycleRecord> {
  if (input.cropCycle.result !== "ok" || input.cropCycle.records.length === 0) return input.cropCycle;
  if (input.field.result !== "ok") return input.cropCycle;
  const fieldReferences = new Set(input.field.records.map((record) => record.reference));
  const orphanFound = input.cropCycle.records.some((record) => record.field_references.some((reference) => !fieldReferences.has(reference)));
  return orphanFound
    ? createErrorSource({
        sourceType: "crop_cycle",
        endpointPath: CROP_CYCLE_ENDPOINT_PATH,
        limit: input.cropCycle.requested_limit,
        errorCode: "invalid_response",
        fetchPerformed: input.cropCycle.fetch_performed,
        httpStatus: input.cropCycle.http_status,
        responseContractDiagnostics: input.cropCycle.response_contract_diagnostics === undefined
          ? undefined
          : { ...input.cropCycle.response_contract_diagnostics, validator_failure_reason: "invalid_record_reference" },
      })
    : input.cropCycle;
}

export async function readHermesOperationalReadonlySources(input?: {
  env?: EnvMap;
  limit?: unknown;
  fetchImpl?: typeof fetch;
}): Promise<HermesOperationalReadonlyFourSourceClientResult> {
  const env = input?.env ?? process.env;
  const config = resolveConfig({
    env,
    limit: input?.limit,
  });

  if (config.ok === false) {
    const inventory =
      createErrorSource<HermesOperationalInventoryRecord>({
        sourceType: "inventory",
        endpointPath: INVENTORY_ENDPOINT_PATH,
        limit: config.limit,
        errorCode: config.errorCode,
      });
    const workLog =
      createErrorSource<HermesOperationalWorkLogRecord>({
        sourceType: "work_log",
        endpointPath: WORK_LOG_ENDPOINT_PATH,
        limit: config.limit,
        errorCode: config.errorCode,
      });
    const field = createErrorSource<HermesOperationalFieldRecord>({
      sourceType: "field",
      endpointPath: FIELD_ENDPOINT_PATH,
      limit: config.limit,
      errorCode: config.errorCode,
    });
    const cropCycle = createErrorSource<HermesOperationalCropCycleRecord>({
      sourceType: "crop_cycle",
      endpointPath: CROP_CYCLE_ENDPOINT_PATH,
      limit: config.limit,
      errorCode: config.errorCode,
    });

    return {
      result: "error",
      checked: "hermes_operational_readonly_client",
      boundary: HERMES_OPERATIONAL_READONLY_CLIENT,
      inventory,
      work_log: workLog,
      field,
      crop_cycle: cropCycle,
      inventory_source_connected: false,
      work_log_source_connected: false,
      field_source_connected: false,
      crop_cycle_source_connected: false,
      external_fetch_performed: false,
      hermes_context_injection_performed: false,
      suggestion_generation_performed: false,
      proposal_created: false,
      proposal_saved: false,
      proposal_apply_performed: false,
      app_db_write_performed: false,
      core_db_write_performed: false,
      audit_write_performed: false,
      database_write_performed: false,
      credentials_exposed: false,
      arbitrary_endpoint_allowed: false,
      arbitrary_method_allowed: false,
    };
  }

  const fetchImpl = input?.fetchImpl ?? fetch;
  const [inventory, workLog, field, unvalidatedCropCycle] = await Promise.all([
    readSource<HermesOperationalInventoryRecord>({
      baseUrl: config.baseUrl,
      token: config.token,
      timeoutMs: config.timeoutMs,
      limit: config.limit,
      sourceType: "inventory",
      endpointPath: INVENTORY_ENDPOINT_PATH,
      expectedSource: "apparetenkei_inventory_readonly",
      validateRecord: validateInventoryRecord,
      fetchImpl,
    }),
    readSource<HermesOperationalWorkLogRecord>({
      baseUrl: config.baseUrl,
      token: config.token,
      timeoutMs: config.timeoutMs,
      limit: config.limit,
      sourceType: "work_log",
      endpointPath: WORK_LOG_ENDPOINT_PATH,
      expectedSource: "apparetenkei_work_logs_readonly",
      validateRecord: validateWorkLogRecord,
      fetchImpl,
    }),
    readDay122Source<HermesOperationalFieldRecord>({
      baseUrl: config.baseUrl,
      token: config.token,
      timeoutMs: config.timeoutMs,
      limit: config.limit,
      sourceType: "field",
      endpointPath: FIELD_ENDPOINT_PATH,
      schemaVersion: "farmos.core.fields.read.v1",
      expectedSource: "apparetenkei_fields_readonly",
      validateRecordKeys: validateFieldRecordKeys,
      validateRecordReference: validateFieldRecordReference,
      validateRecordValues: validateFieldRecordValues,
      recordReference: (record) => record.reference,
      fetchImpl,
    }),
    readDay122Source<HermesOperationalCropCycleRecord>({
      baseUrl: config.baseUrl,
      token: config.token,
      timeoutMs: config.timeoutMs,
      limit: config.limit,
      sourceType: "crop_cycle",
      endpointPath: CROP_CYCLE_ENDPOINT_PATH,
      schemaVersion: "farmos.core.crop_cycles.read.v1",
      expectedSource: "apparetenkei_crop_cycles_readonly",
      validateRecordKeys: validateCropCycleRecordKeys,
      validateRecordReference: validateCropCycleRecordReference,
      validateRecordValues: validateCropCycleRecordValues,
      recordReference: (record) => record.reference,
      fetchImpl,
    }),
  ]);
  const cropCycle = validateCropCycleFieldRelations({ field, cropCycle: unvalidatedCropCycle });

  const successCount =
    Number(inventory.result === "ok") +
    Number(workLog.result === "ok") +
    Number(field.result === "ok") +
    Number(cropCycle.result === "ok");

  return {
    result:
      successCount === 4
        ? "ok"
        : successCount > 0
          ? "partial"
          : "error",
    checked: "hermes_operational_readonly_client",
    boundary: HERMES_OPERATIONAL_READONLY_CLIENT,
    inventory,
    work_log: workLog,
    field,
    crop_cycle: cropCycle,
    inventory_source_connected: inventory.result === "ok",
    work_log_source_connected: workLog.result === "ok",
    field_source_connected: field.result === "ok",
    crop_cycle_source_connected: cropCycle.result === "ok",
    external_fetch_performed:
      inventory.fetch_performed || workLog.fetch_performed || field.fetch_performed || cropCycle.fetch_performed,
    hermes_context_injection_performed: false,
    suggestion_generation_performed: false,
    proposal_created: false,
    proposal_saved: false,
    proposal_apply_performed: false,
    app_db_write_performed: false,
    core_db_write_performed: false,
    audit_write_performed: false,
    database_write_performed: false,
    credentials_exposed: false,
    arbitrary_endpoint_allowed: false,
    arbitrary_method_allowed: false,
  };
}

export async function readHermesOperationalReadonlyFields(input?: {
  env?: EnvMap;
  limit?: unknown;
  fetchImpl?: typeof fetch;
}): Promise<
  HermesOperationalReadonlySourceResult<HermesOperationalFieldRecord>
> {
  const config = resolveConfig({
    env: input?.env ?? process.env,
    limit: input?.limit,
  });
  if (config.ok === false) {
    return createErrorSource<HermesOperationalFieldRecord>({
      sourceType: "field",
      endpointPath: FIELD_ENDPOINT_PATH,
      limit: config.limit,
      errorCode: config.errorCode,
    });
  }
  return readDay122Source<HermesOperationalFieldRecord>({
    baseUrl: config.baseUrl,
    token: config.token,
    timeoutMs: config.timeoutMs,
    limit: config.limit,
    sourceType: "field",
    endpointPath: FIELD_ENDPOINT_PATH,
    schemaVersion: "farmos.core.fields.read.v1",
    expectedSource: "apparetenkei_fields_readonly",
    validateRecordKeys: validateFieldRecordKeys,
    validateRecordReference: validateFieldRecordReference,
    validateRecordValues: validateFieldRecordValues,
    recordReference: (record) => record.reference,
    fetchImpl: input?.fetchImpl ?? fetch,
  });
}
