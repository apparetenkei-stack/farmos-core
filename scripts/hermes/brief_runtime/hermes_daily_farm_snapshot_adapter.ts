import { randomUUID } from "node:crypto";
import { parseHermesOperationalReadonlySourceResult } from "../../../src/lib/hermes/hermes_operational_readonly_client";
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
  "field",
  "crop_cycle",
  "inventory_source_connected",
  "work_log_source_connected",
  "field_source_connected",
  "crop_cycle_source_connected",
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function validateOperationalTopLevel(value: unknown): value is JsonRecord {
  const legacyKeys = OPERATIONAL_TOP_LEVEL_KEYS.filter((key) => !["field", "crop_cycle", "field_source_connected", "crop_cycle_source_connected"].includes(key));
  return (
    isRecord(value) &&
    (hasExactKeys(value, OPERATIONAL_TOP_LEVEL_KEYS) || hasExactKeys(value, legacyKeys)) &&
    ["ok", "partial", "error"].includes(String(value.result)) &&
    value.checked === "hermes_operational_readonly_client" &&
    value.boundary === "day92_hermes_operational_readonly_client" &&
    typeof value.inventory_source_connected === "boolean" &&
    typeof value.work_log_source_connected === "boolean" &&
    (value.field_source_connected === undefined || typeof value.field_source_connected === "boolean") &&
    (value.crop_cycle_source_connected === undefined || typeof value.crop_cycle_source_connected === "boolean") &&
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
  sourceType: "inventory" | "work_log" | "field" | "crop_cycle",
  legacyMissingIdAllowed = false,
): value is JsonRecord & { records: unknown[] } {
  if (
    legacyMissingIdAllowed &&
    (sourceType === "inventory" || sourceType === "work_log") &&
    isRecord(value) &&
    Array.isArray(value.records)
  ) {
    const normalizedLegacyValue = {
      ...value,
      records: value.records.map((record) =>
        isRecord(record) && (record.id === undefined || record.id === null)
          ? { ...record, id: "legacy-missing-id" }
          : record,
      ),
    };
    return parseHermesOperationalReadonlySourceResult(
      normalizedLegacyValue,
      sourceType,
    ) !== null;
  }

  return parseHermesOperationalReadonlySourceResult(value, sourceType) !== null;
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
  const freshness = input.sourceType === "field" || input.sourceType === "crop_cycle"
    ? "unknown"
    : evaluateHermesDailyFarmFreshness({ sourceType: input.sourceType, generatedAt: input.generatedAt, nowIso: input.nowIso });
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
  sourceType: "inventory" | "work_log" | "field" | "crop_cycle",
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
  legacyMissingIdAllowed = false,
): HermesDailyFarmSource<HermesDailyFarmInventoryRecord> {
  if (!validateOperationalSource(value, "inventory", legacyMissingIdAllowed)) {
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
  legacyMissingIdAllowed = false,
): HermesDailyFarmSource<HermesDailyFarmWorkLogRecord> {
  if (!validateOperationalSource(value, "work_log", legacyMissingIdAllowed)) {
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

function normalizeFieldSource(value: unknown, nowIso: string): HermesDailyFarmSource<HermesDailyFarmMemoryRecord> {
  if (!validateOperationalSource(value, "field")) return invalidSource("field", nowIso);
  const records = sortNullableIds(value.records.map((item) => {
    const record = item as JsonRecord;
    return { id: safeId(record.reference), label: safeText(record.display_name), status: "unknown", source_timestamp: null };
  })).slice(0, HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits.field);
  return createSource({ sourceType: "field", available: value.available === true && value.result === "ok", generatedAt: value.generated_at as string | null, records, recordCount: Number(value.record_count), limitations: ["source_timestamp_observation_only"], nowIso });
}

function normalizeOperationalCropCycleSource(input: { value: unknown; fieldValue: unknown; nowIso: string }): HermesDailyFarmSource<HermesDailyFarmMemoryRecord> {
  if (!validateOperationalSource(input.value, "crop_cycle")) return invalidSource("crop_cycle", input.nowIso);
  if (!validateOperationalSource(input.fieldValue, "field")) {
    return input.value.result === "ok" && input.value.records.length > 0 ? invalidSource("crop_cycle", input.nowIso) : createSource({ sourceType: "crop_cycle", available: false, generatedAt: null, records: [], recordCount: 0, limitations: ["crop_cycle_source_unavailable"], nowIso: input.nowIso });
  }
  const fieldReferences = new Set(input.fieldValue.records.map((item) => (item as JsonRecord).reference));
  if (input.value.records.some((item) => (item as JsonRecord).field_references instanceof Array && ((item as JsonRecord).field_references as unknown[]).some((reference) => !fieldReferences.has(reference)))) return invalidSource("crop_cycle", input.nowIso);
  const records = sortNullableIds(input.value.records.map((item) => {
    const record = item as JsonRecord;
    return { id: safeId(record.reference), label: safeText(record.crop_display_name), status: "unknown", source_timestamp: null };
  })).slice(0, HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits.crop_cycle);
  return createSource({ sourceType: "crop_cycle", available: input.value.available === true && input.value.result === "ok", generatedAt: input.value.generated_at as string | null, records, recordCount: Number(input.value.record_count), limitations: ["source_timestamp_observation_only"], nowIso: input.nowIso });
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
  const legacyOperational = operational !== null &&
    !Object.hasOwn(operational, "field") &&
    !Object.hasOwn(operational, "crop_cycle");
  const inventory = operational
    ? normalizeInventorySource(
        operational.inventory,
        input.nowIso,
        legacyOperational,
      )
    : invalidSource("inventory", input.nowIso);
  const workLog = operational
    ? normalizeWorkLogSource(
        operational.work_log,
        input.nowIso,
        legacyOperational,
      )
    : invalidSource("work_log", input.nowIso);
  const field = operational?.field ? normalizeFieldSource(operational.field, input.nowIso) : createSource({ sourceType: "field", available: false, generatedAt: null, records: [], recordCount: 0, limitations: ["independent_field_source_unavailable"], nowIso: input.nowIso });
  const cropCycle = operational?.crop_cycle
    ? normalizeOperationalCropCycleSource({ value: operational.crop_cycle, fieldValue: operational.field, nowIso: input.nowIso })
    : createSource({ sourceType: "crop_cycle", available: false, generatedAt: null, records: [], recordCount: 0, limitations: ["crop_cycle_operational_source_unavailable"], nowIso: input.nowIso });
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

  const expectedFreshness = sourceType === "field" || sourceType === "crop_cycle"
    ? "unknown"
    : evaluateHermesDailyFarmFreshness({ sourceType, generatedAt: value.generated_at as string | null, nowIso });
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
  if (sourceType === "field" || sourceType === "crop_cycle" || sourceType === "hermes_note") return value.records.every(validateCanonicalMemoryRecord);
  return false;
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
