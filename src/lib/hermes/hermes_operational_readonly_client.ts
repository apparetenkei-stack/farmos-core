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
const MAX_RESPONSE_CHARS = 1_000_000;

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

export type HermesOperationalReadonlyErrorCode =
  | "configuration_unavailable"
  | "invalid_limit"
  | "timeout"
  | "network_unavailable"
  | "remote_http_error"
  | "invalid_response";

export type HermesOperationalReadonlySourceResult<TRecord> = {
  result: "ok" | "error";
  source_type: "inventory" | "work_log";
  endpoint_path:
    | typeof INVENTORY_ENDPOINT_PATH
    | typeof WORK_LOG_ENDPOINT_PATH;
  http_method: "GET";
  fetch_performed: boolean;
  available: boolean;
  transaction_read_only: true;
  requested_limit: number;
  http_status: number | null;
  response_source:
    | "apparetenkei_inventory_readonly"
    | "apparetenkei_work_logs_readonly"
    | null;
  generated_at: string | null;
  record_count: number;
  records: TRecord[];
  has_more: boolean;
  error_code: HermesOperationalReadonlyErrorCode | null;
  write_performed: false;
  restricted_fields_exposed: false;
  credentials_exposed: false;
};

export type HermesOperationalReadonlyClientResult = {
  result: "ok" | "partial" | "error";
  checked: "hermes_operational_readonly_client";
  boundary: typeof HERMES_OPERATIONAL_READONLY_CLIENT;
  inventory: HermesOperationalReadonlySourceResult<HermesOperationalInventoryRecord>;
  work_log: HermesOperationalReadonlySourceResult<HermesOperationalWorkLogRecord>;
  inventory_source_connected: boolean;
  work_log_source_connected: boolean;
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
  source:
    | "apparetenkei_inventory_readonly"
    | "apparetenkei_work_logs_readonly";
  generatedAt: string;
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: JsonRecord, allowed: Set<string>): boolean {
  return Object.keys(value).every((key) => allowed.has(key));
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
  sourceType: "inventory" | "work_log";
  endpointPath:
    | typeof INVENTORY_ENDPOINT_PATH
    | typeof WORK_LOG_ENDPOINT_PATH;
  limit: number;
  errorCode: HermesOperationalReadonlyErrorCode;
  fetchPerformed?: boolean;
  httpStatus?: number | null;
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
    generated_at: null,
    record_count: 0,
    records: [],
    has_more: false,
    error_code: input.errorCode,
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

  if (
    input.value.result !== "ok" ||
    input.value.source !== input.expectedSource ||
    typeof input.value.generatedAt !== "string" ||
    Number.isNaN(Date.parse(input.value.generatedAt)) ||
    input.value.readOnly !== true ||
    !Number.isSafeInteger(input.value.recordCount) ||
    Number(input.value.recordCount) < 0 ||
    !Array.isArray(input.value.records) ||
    !isRecord(input.value.pagination) ||
    input.value.pagination.limit !== input.requestedLimit ||
    typeof input.value.pagination.hasMore !== "boolean" ||
    !isRecord(input.value.safety) ||
    input.value.safety.writePerformed !== false ||
    input.value.safety.restrictedFieldsExposed !== false
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
    recordCount: records.length,
    records,
    pagination: {
      limit: input.requestedLimit,
      hasMore: input.value.pagination.hasMore,
    },
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
      generated_at: envelope.generatedAt,
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

export async function readHermesOperationalReadonlySources(input?: {
  env?: EnvMap;
  limit?: unknown;
  fetchImpl?: typeof fetch;
}): Promise<HermesOperationalReadonlyClientResult> {
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

    return {
      result: "error",
      checked: "hermes_operational_readonly_client",
      boundary: HERMES_OPERATIONAL_READONLY_CLIENT,
      inventory,
      work_log: workLog,
      inventory_source_connected: false,
      work_log_source_connected: false,
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
  const [inventory, workLog] = await Promise.all([
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
  ]);

  const successCount =
    Number(inventory.result === "ok") +
    Number(workLog.result === "ok");

  return {
    result:
      successCount === 2
        ? "ok"
        : successCount === 1
          ? "partial"
          : "error",
    checked: "hermes_operational_readonly_client",
    boundary: HERMES_OPERATIONAL_READONLY_CLIENT,
    inventory,
    work_log: workLog,
    inventory_source_connected: inventory.result === "ok",
    work_log_source_connected: workLog.result === "ok",
    external_fetch_performed:
      inventory.fetch_performed || workLog.fetch_performed,
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
