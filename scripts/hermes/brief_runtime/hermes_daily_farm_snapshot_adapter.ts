import { randomUUID } from "node:crypto";
import {
  HERMES_DAILY_FARM_BRIEF_POLICY,
  HERMES_DAILY_FARM_SOURCE_ORDER,
  evaluateHermesDailyFarmFreshness,
  isHermesDailyFarmSourceTimestampInvalid,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";
import type {
  HermesDailyFarmInventoryRecord,
  HermesDailyFarmMemoryRecord,
  HermesDailyFarmSnapshot,
  HermesDailyFarmSource,
  HermesDailyFarmSourceStatus,
  HermesDailyFarmWorkLogRecord,
} from "./hermes_daily_farm_snapshot_contract";

type JsonRecord = Record<string, unknown>;

export type HermesDailyFarmSnapshotMemoryInput = {
  crop_cycles: unknown[];
  hermes_notes: unknown[];
  crop_cycle_generated_at: string | null;
  hermes_note_generated_at: string | null;
  crop_cycle_available?: boolean;
  hermes_note_available?: boolean;
};

const ID_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._:-]{0,127}$/u;
const SOURCE_STATUSES: readonly HermesDailyFarmSourceStatus[] = [
  "available",
  "empty",
  "unavailable",
  "invalid",
];
const FRESHNESS_VALUES = ["fresh", "stale", "unknown"] as const;

const OPERATIONAL_TOP_LEVEL_KEYS = [
  "result",
  "checked",
  "boundary",
  "inventory",
  "work_log",
  "inventory_source_connected",
  "work_log_source_connected",
  "external_fetch_performed",
  "hermes_context_injection_performed",
  "suggestion_generation_performed",
  "proposal_created",
  "proposal_saved",
  "proposal_apply_performed",
  "app_db_write_performed",
  "core_db_write_performed",
  "audit_write_performed",
  "database_write_performed",
  "credentials_exposed",
  "arbitrary_endpoint_allowed",
  "arbitrary_method_allowed",
] as const;

const OPERATIONAL_SOURCE_KEYS = [
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

const INVENTORY_RECORD_KEYS = [
  "id",
  "name",
  "baseType",
  "currentQuantity",
  "unit",
] as const;

const WORK_LOG_RECORD_KEYS = [
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
] as const;

const APPLIED_MATERIAL_KEYS = [
  "materialId",
  "materialName",
  "quantity",
  "unit",
] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: JsonRecord, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

function isPrimitiveId(value: unknown): boolean {
  return typeof value === "string" || typeof value === "number";
}

function isNullablePrimitiveId(value: unknown): boolean {
  return value === null || isPrimitiveId(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === "string";
}

function isNullableQuantity(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "string"
  );
}

function safeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value)
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  return normalized.length > 0
    ? normalized.slice(0, HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars)
    : null;
}

function safeId(value: unknown): string | null {
  const normalized = safeText(value);
  return normalized !== null && ID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeQuantity(value: unknown): string | number | null {
  return isNullableQuantity(value) ? (value as string | number | null) : null;
}

function validateAppliedMaterial(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, APPLIED_MATERIAL_KEYS) &&
    isNullablePrimitiveId(value.materialId) &&
    isNullableString(value.materialName) &&
    isNullableQuantity(value.quantity) &&
    isNullableString(value.unit)
  );
}

function validateInventoryInputRecord(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, INVENTORY_RECORD_KEYS)) {
    return false;
  }

  return (
    (value.id === undefined || value.id === null || isPrimitiveId(value.id)) &&
    typeof value.name === "string" &&
    isNullableString(value.baseType) &&
    isNullableQuantity(value.currentQuantity) &&
    isNullableString(value.unit)
  );
}

function validateWorkLogInputRecord(value: unknown): boolean {
  if (!isRecord(value) || !hasOnlyKeys(value, WORK_LOG_RECORD_KEYS)) {
    return false;
  }

  return (
    (value.id === undefined || value.id === null || isPrimitiveId(value.id)) &&
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
    (value.appliedMaterials === null ||
      (Array.isArray(value.appliedMaterials) &&
        value.appliedMaterials.every(validateAppliedMaterial)))
  );
}

function validateOperationalTopLevel(value: unknown): value is JsonRecord {
  return (
    isRecord(value) &&
    hasExactKeys(value, OPERATIONAL_TOP_LEVEL_KEYS) &&
    ["ok", "partial", "error"].includes(String(value.result)) &&
    value.checked === "hermes_operational_readonly_client" &&
    value.boundary === "day92_hermes_operational_readonly_client" &&
    typeof value.inventory_source_connected === "boolean" &&
    typeof value.work_log_source_connected === "boolean" &&
    typeof value.external_fetch_performed === "boolean" &&
    value.hermes_context_injection_performed === false &&
    value.suggestion_generation_performed === false &&
    value.proposal_created === false &&
    value.proposal_saved === false &&
    value.proposal_apply_performed === false &&
    value.app_db_write_performed === false &&
    value.core_db_write_performed === false &&
    value.audit_write_performed === false &&
    value.database_write_performed === false &&
    value.credentials_exposed === false &&
    value.arbitrary_endpoint_allowed === false &&
    value.arbitrary_method_allowed === false
  );
}

function validateOperationalSource(
  value: unknown,
  sourceType: "inventory" | "work_log",
): value is JsonRecord & { records: unknown[] } {
  if (!isRecord(value) || !hasExactKeys(value, OPERATIONAL_SOURCE_KEYS)) {
    return false;
  }

  if (!Array.isArray(value.records)) {
    return false;
  }

  if (
    !Number.isInteger(value.record_count) ||
    Number(value.record_count) < 0 ||
    value.record_count !== value.records.length
  ) {
    return false;
  }

  const recordsValid =
    sourceType === "inventory"
      ? value.records.every(validateInventoryInputRecord)
      : value.records.every(validateWorkLogInputRecord);
  const expectedEndpoint =
    sourceType === "inventory"
      ? "/api/farmos-core/inventory-summary"
      : "/api/farmos-core/recent-work-logs";
  const expectedResponseSource =
    sourceType === "inventory"
      ? "apparetenkei_inventory_readonly"
      : "apparetenkei_work_logs_readonly";
  const validErrorCodes = [
    "configuration_unavailable",
    "invalid_limit",
    "timeout",
    "network_unavailable",
    "remote_http_error",
    "invalid_response",
  ];

  return (
    recordsValid &&
    ["ok", "error"].includes(String(value.result)) &&
    value.source_type === sourceType &&
    value.endpoint_path === expectedEndpoint &&
    value.http_method === "GET" &&
    typeof value.fetch_performed === "boolean" &&
    typeof value.available === "boolean" &&
    ((value.result === "ok" && value.available === true) ||
      (value.result === "error" && value.available === false)) &&
    value.transaction_read_only === true &&
    Number.isInteger(value.requested_limit) &&
    Number(value.requested_limit) >= 0 &&
    (value.http_status === null ||
      (Number.isInteger(value.http_status) &&
        Number(value.http_status) >= 100 &&
        Number(value.http_status) <= 599)) &&
    (value.response_source === null ||
      value.response_source === expectedResponseSource) &&
    (value.generated_at === null || isCanonicalIso(value.generated_at)) &&
    typeof value.has_more === "boolean" &&
    (value.error_code === null || validErrorCodes.includes(String(value.error_code))) &&
    value.write_performed === false &&
    value.restricted_fields_exposed === false &&
    value.credentials_exposed === false
  );
}

function sortNullableIds<T extends { id: string | null }>(values: T[]): T[] {
  return values.sort((left, right) => {
    if (left.id === null && right.id !== null) return 1;
    if (left.id !== null && right.id === null) return -1;
    if (left.id !== right.id) return (left.id ?? "").localeCompare(right.id ?? "");
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
}

function createSource<T>(input: {
  sourceType: HermesDailyFarmSourceType;
  available: boolean;
  generatedAt: string | null;
  records: T[];
  recordCount: number;
  limitations: string[];
  nowIso: string;
  invalid?: boolean;
}): HermesDailyFarmSource<T> {
  const timestampInvalid = isHermesDailyFarmSourceTimestampInvalid({
    generatedAt: input.generatedAt,
    nowIso: input.nowIso,
  });
  const invalid = input.invalid === true || timestampInvalid;
  const freshness = evaluateHermesDailyFarmFreshness({
    sourceType: input.sourceType,
    generatedAt: input.generatedAt,
    nowIso: input.nowIso,
  });
  const status: HermesDailyFarmSourceStatus = invalid
    ? "invalid"
    : !input.available
      ? "unavailable"
      : input.recordCount === 0
        ? "empty"
        : "available";

  return {
    source_type: input.sourceType,
    status,
    available: !invalid && input.available,
    generated_at: input.generatedAt,
    freshness,
    record_count: invalid ? 0 : input.recordCount,
    records: invalid ? [] : input.records,
    truncated: !invalid && input.recordCount > input.records.length,
    limitations: [...input.limitations].sort(),
  };
}

function invalidSource(
  sourceType: "inventory" | "work_log",
  nowIso: string,
): HermesDailyFarmSource<never> {
  return createSource<never>({
    sourceType,
    available: false,
    generatedAt: null,
    records: [],
    recordCount: 0,
    limitations: [`${sourceType}_source_invalid`],
    nowIso,
    invalid: true,
  });
}

function normalizeInventorySource(
  value: unknown,
  nowIso: string,
): HermesDailyFarmSource<HermesDailyFarmInventoryRecord> {
  if (!validateOperationalSource(value, "inventory")) {
    return invalidSource("inventory", nowIso);
  }

  const limit = HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits.inventory;
  const records = sortNullableIds(
    value.records.map((item) => {
      const record = item as JsonRecord;
      return {
        id: safeId(record.id),
        base_type: safeText(record.baseType),
        current_quantity: normalizeQuantity(record.currentQuantity),
        unit: safeText(record.unit),
      };
    }),
  ).slice(0, limit);

  return createSource({
    sourceType: "inventory",
    available: value.available === true && value.result === "ok",
    generatedAt: value.generated_at as string | null,
    records,
    recordCount: Number(value.record_count),
    limitations: [],
    nowIso,
  });
}

function normalizeWorkLogSource(
  value: unknown,
  nowIso: string,
): HermesDailyFarmSource<HermesDailyFarmWorkLogRecord> {
  if (!validateOperationalSource(value, "work_log")) {
    return invalidSource("work_log", nowIso);
  }

  const limit = HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits.work_log;
  const records = sortNullableIds(
    value.records.map((item) => {
      const record = item as JsonRecord;
      return {
        id: safeId(record.id),
        started_at: record.startedAt === null ? null : safeText(record.startedAt),
        field_id: safeId(record.fieldId),
        work_type_name: safeText(record.workTypeName),
        duration_minutes: normalizeQuantity(record.durationMinutes),
        target_crop: safeText(record.targetCrop),
      };
    }),
  ).slice(0, limit);

  return createSource({
    sourceType: "work_log",
    available: value.available === true && value.result === "ok",
    generatedAt: value.generated_at as string | null,
    records,
    recordCount: Number(value.record_count),
    limitations: [],
    nowIso,
  });
}

function validateMemoryArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.every(isRecord);
}

function normalizeMemoryRecords(
  values: unknown[],
  limit: number,
): HermesDailyFarmMemoryRecord[] {
  return sortNullableIds(
    values.map((value) => {
      const record = value as JsonRecord;
      return {
        id: safeId(record.id),
        label: safeText(
          record.name ?? record.crop ?? record.title ?? record.content,
        ),
        status: safeText(record.status),
        source_timestamp: isCanonicalIso(record.created_at)
          ? record.created_at
          : isCanonicalIso(record.updated_at)
            ? record.updated_at
            : null,
      };
    }),
  ).slice(0, limit);
}

type HermesDailyFarmSnapshotMemorySourceInput = {
  sourceType: "crop_cycle" | "hermes_note";
  values: unknown;
  generatedAt: unknown;
  available: boolean;
  nowIso: string;
};

function isValidatedMemorySourceInput(
  input: HermesDailyFarmSnapshotMemorySourceInput,
): input is HermesDailyFarmSnapshotMemorySourceInput & { values: unknown[]; generatedAt: string | null } {
  return validateMemoryArray(input.values) && (input.generatedAt === null || isCanonicalIso(input.generatedAt));
}

function normalizeMemorySource(input: HermesDailyFarmSnapshotMemorySourceInput): HermesDailyFarmSource<HermesDailyFarmMemoryRecord> {
  if (!isValidatedMemorySourceInput(input)) {
    return createSource({
      sourceType: input.sourceType,
      available: false,
      generatedAt: null,
      records: [],
      recordCount: 0,
      limitations: [`${input.sourceType}_source_invalid`],
      nowIso: input.nowIso,
      invalid: true,
    });
  }

  const limit =
    HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits[input.sourceType];
  return createSource({
    sourceType: input.sourceType,
    available: input.available,
    generatedAt: input.generatedAt,
    records: normalizeMemoryRecords(input.values, limit),
    recordCount: input.values.length,
    limitations:
      input.generatedAt === null ? ["source_timestamp_unknown"] : [],
    nowIso: input.nowIso,
  });
}

export function calculateHermesDailyFarmSnapshotStatus(
  sources: HermesDailyFarmSnapshot["sources"],
): HermesDailyFarmSnapshot["status"] {
  const ordered = HERMES_DAILY_FARM_SOURCE_ORDER.map(
    (sourceType) => sources[sourceType],
  );
  if (ordered.some((source) => source.status === "invalid")) {
    return "unavailable";
  }

  const required = HERMES_DAILY_FARM_BRIEF_POLICY.required_sources.map(
    (sourceType) => sources[sourceType],
  );
  const usableRequired = required.filter(
    (source) => source.status === "available" || source.status === "empty",
  );
  if (usableRequired.length === 0) {
    return "unavailable";
  }

  const allRequiredReady = required.every(
    (source) =>
      (source.status === "available" || source.status === "empty") &&
      source.freshness === "fresh",
  );
  return allRequiredReady ? "ready" : "partial";
}

export function createHermesDailyFarmSnapshot(input: {
  operationalSources: unknown;
  memory: HermesDailyFarmSnapshotMemoryInput;
  nowIso: string;
  snapshotIdFactory?: () => string;
}): HermesDailyFarmSnapshot {
  if (!isCanonicalIso(input.nowIso)) {
    throw new Error("daily_farm_snapshot_invalid");
  }

  const snapshotId = (input.snapshotIdFactory ?? randomUUID)();
  if (!ID_PATTERN.test(snapshotId)) {
    throw new Error("daily_farm_snapshot_invalid");
  }

  const operational = validateOperationalTopLevel(input.operationalSources)
    ? input.operationalSources
    : null;
  const inventory = operational
    ? normalizeInventorySource(operational.inventory, input.nowIso)
    : invalidSource("inventory", input.nowIso);
  const workLog = operational
    ? normalizeWorkLogSource(operational.work_log, input.nowIso)
    : invalidSource("work_log", input.nowIso);
  const field = createSource<never>({
    sourceType: "field",
    available: false,
    generatedAt: null,
    records: [],
    recordCount: 0,
    limitations: ["independent_field_source_not_implemented"],
    nowIso: input.nowIso,
  });
  const cropCycle = normalizeMemorySource({
    sourceType: "crop_cycle",
    values: input.memory?.crop_cycles,
    generatedAt: input.memory?.crop_cycle_generated_at,
    available: input.memory?.crop_cycle_available !== false,
    nowIso: input.nowIso,
  });
  const hermesNote = normalizeMemorySource({
    sourceType: "hermes_note",
    values: input.memory?.hermes_notes,
    generatedAt: input.memory?.hermes_note_generated_at,
    available: input.memory?.hermes_note_available !== false,
    nowIso: input.nowIso,
  });
  const sources: HermesDailyFarmSnapshot["sources"] = {
    inventory,
    work_log: workLog,
    field,
    crop_cycle: cropCycle,
    hermes_note: hermesNote,
  };
  const limitations = [
    ...new Set(
      HERMES_DAILY_FARM_SOURCE_ORDER.flatMap((sourceType) => {
        const source = sources[sourceType];
        const stateLimitations = [...source.limitations];
        if (source.status === "empty") {
          stateLimitations.push(`${sourceType}_empty`);
        }
        if (source.status === "unavailable") {
          stateLimitations.push(`${sourceType}_unavailable`);
        }
        if (source.status === "invalid") {
          stateLimitations.push(`${sourceType}_invalid`);
        }
        if (source.freshness === "stale") {
          stateLimitations.push(`${sourceType}_stale`);
        }
        if (source.freshness === "unknown") {
          stateLimitations.push(`${sourceType}_freshness_unknown`);
        }
        return stateLimitations;
      }),
    ),
  ]
    .sort()
    .slice(0, HERMES_DAILY_FARM_BRIEF_POLICY.maximum_limitations);

  return {
    schema_version: "hermes.daily_farm_snapshot.v1",
    snapshot_id: snapshotId,
    generated_at: input.nowIso,
    status: calculateHermesDailyFarmSnapshotStatus(sources),
    sources,
    limitations,
    safety: {
      transaction_read_only: true,
      external_fetch_performed: false,
      database_write_performed: false,
      proposal_write_performed: false,
      model_execution_performed: false,
      secret_exposed: false,
      fail_closed: true,
    },
  };
}

function isTextOrNull(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "string" &&
      value.length <= HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars)
  );
}

function isIdOrNull(value: unknown): boolean {
  return value === null || (typeof value === "string" && ID_PATTERN.test(value));
}

function isCanonicalQuantity(value: unknown): boolean {
  return (
    value === null ||
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" &&
      value.length <= HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars)
  );
}

function validateCanonicalInventoryRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["id", "base_type", "current_quantity", "unit"]) &&
    isIdOrNull(value.id) &&
    isTextOrNull(value.base_type) &&
    isCanonicalQuantity(value.current_quantity) &&
    isTextOrNull(value.unit)
  );
}

function validateCanonicalWorkLogRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      "id",
      "started_at",
      "field_id",
      "work_type_name",
      "duration_minutes",
      "target_crop",
    ]) &&
    isIdOrNull(value.id) &&
    isTextOrNull(value.started_at) &&
    isIdOrNull(value.field_id) &&
    isTextOrNull(value.work_type_name) &&
    isCanonicalQuantity(value.duration_minutes) &&
    isTextOrNull(value.target_crop)
  );
}

function validateCanonicalMemoryRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ["id", "label", "status", "source_timestamp"]) &&
    isIdOrNull(value.id) &&
    isTextOrNull(value.label) &&
    isTextOrNull(value.status) &&
    (value.source_timestamp === null || isCanonicalIso(value.source_timestamp))
  );
}

function validateCanonicalSource(
  value: unknown,
  sourceType: HermesDailyFarmSourceType,
  nowIso: string,
): value is HermesDailyFarmSource<unknown> {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "source_type",
      "status",
      "available",
      "generated_at",
      "freshness",
      "record_count",
      "records",
      "truncated",
      "limitations",
    ]) ||
    value.source_type !== sourceType ||
    !SOURCE_STATUSES.includes(value.status as HermesDailyFarmSourceStatus) ||
    typeof value.available !== "boolean" ||
    (value.generated_at !== null && !isCanonicalIso(value.generated_at)) ||
    !FRESHNESS_VALUES.includes(value.freshness as (typeof FRESHNESS_VALUES)[number]) ||
    !Number.isInteger(value.record_count) ||
    Number(value.record_count) < 0 ||
    !Array.isArray(value.records) ||
    value.records.length >
      HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits[sourceType] ||
    Number(value.record_count) < value.records.length ||
    value.truncated !== Number(value.record_count) > value.records.length ||
    !Array.isArray(value.limitations) ||
    value.limitations.length > HERMES_DAILY_FARM_BRIEF_POLICY.maximum_limitations ||
    !value.limitations.every(
      (item) =>
        typeof item === "string" &&
        item.length <= HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars,
    )
  ) {
    return false;
  }

  const timestampInvalid = isHermesDailyFarmSourceTimestampInvalid({
    generatedAt: value.generated_at as string | null,
    nowIso,
  });
  if (timestampInvalid && value.status !== "invalid") {
    return false;
  }

  const expectedFreshness = evaluateHermesDailyFarmFreshness({
    sourceType,
    generatedAt: value.generated_at as string | null,
    nowIso,
  });
  if (value.freshness !== expectedFreshness) {
    return false;
  }

  if (
    (value.status === "available" &&
      (value.available !== true || Number(value.record_count) === 0)) ||
    (value.status === "empty" &&
      (value.available !== true ||
        value.record_count !== 0 ||
        value.records.length !== 0)) ||
    (value.status === "unavailable" && value.available !== false) ||
    (value.status === "invalid" &&
      (value.available !== false ||
        value.record_count !== 0 ||
        value.records.length !== 0))
  ) {
    return false;
  }

  if (sourceType === "inventory") {
    return value.records.every(validateCanonicalInventoryRecord);
  }
  if (sourceType === "work_log") {
    return value.records.every(validateCanonicalWorkLogRecord);
  }
  if (sourceType === "field") {
    return value.records.length === 0;
  }
  return value.records.every(validateCanonicalMemoryRecord);
}

export function parseHermesDailyFarmSnapshot(
  value: unknown,
): HermesDailyFarmSnapshot | null {
  try {
    const snapshot = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !isRecord(snapshot) ||
      !hasExactKeys(snapshot, [
        "schema_version",
        "snapshot_id",
        "generated_at",
        "status",
        "sources",
        "limitations",
        "safety",
      ]) ||
      snapshot.schema_version !== "hermes.daily_farm_snapshot.v1" ||
      typeof snapshot.snapshot_id !== "string" ||
      !ID_PATTERN.test(snapshot.snapshot_id) ||
      !isCanonicalIso(snapshot.generated_at) ||
      !["ready", "partial", "unavailable"].includes(String(snapshot.status)) ||
      !isRecord(snapshot.sources) ||
      !hasExactKeys(snapshot.sources, HERMES_DAILY_FARM_SOURCE_ORDER) ||
      !HERMES_DAILY_FARM_SOURCE_ORDER.every((sourceType) =>
        validateCanonicalSource(
          snapshot.sources[sourceType],
          sourceType,
          snapshot.generated_at as string,
        ),
      ) ||
      !Array.isArray(snapshot.limitations) ||
      snapshot.limitations.length >
        HERMES_DAILY_FARM_BRIEF_POLICY.maximum_limitations ||
      !snapshot.limitations.every(
        (item) =>
          typeof item === "string" &&
          item.length <= HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars,
      ) ||
      !isRecord(snapshot.safety) ||
      !hasExactKeys(snapshot.safety, [
        "transaction_read_only",
        "external_fetch_performed",
        "database_write_performed",
        "proposal_write_performed",
        "model_execution_performed",
        "secret_exposed",
        "fail_closed",
      ]) ||
      snapshot.safety.transaction_read_only !== true ||
      snapshot.safety.external_fetch_performed !== false ||
      snapshot.safety.database_write_performed !== false ||
      snapshot.safety.proposal_write_performed !== false ||
      snapshot.safety.model_execution_performed !== false ||
      snapshot.safety.secret_exposed !== false ||
      snapshot.safety.fail_closed !== true
    ) {
      return null;
    }

    const canonical = snapshot as HermesDailyFarmSnapshot;
    if (canonical.status !== calculateHermesDailyFarmSnapshotStatus(canonical.sources)) {
      return null;
    }
    return canonical;
  } catch {
    return null;
  }
}
