import type { HermesOperationalReadonlyClientResult } from "../../../src/lib/hermes/hermes_operational_readonly_client";
import {
  HERMES_DAILY_FARM_BRIEF_POLICY,
  HERMES_DAILY_FARM_SOURCE_ORDER,
} from "./hermes_daily_farm_brief_policy";
import type {
  HermesDailyFarmBrief,
  HermesDailyFarmBriefSafeSummary,
} from "./hermes_daily_farm_brief_contract";
import {
  buildHermesDailyFarmBrief,
  parseHermesDailyFarmBrief,
} from "./hermes_daily_farm_brief_builder";
import type {
  HermesDailyFarmBriefScopeCropCycleInput,
  HermesDailyFarmBriefScopeWorkLogInput,
} from "./hermes_daily_farm_brief_scope_builder";
import {
  normalizeHermesDailyFarmBriefScopeCrop,
  normalizeHermesDailyFarmBriefScopeId,
} from "./hermes_daily_farm_brief_scope_builder";
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";
import type { HermesDailyFarmBriefSourceSelectionCoverage } from "./hermes_daily_farm_brief_source_coverage_contract";
import {
  createHermesDailyFarmSnapshot,
  parseHermesDailyFarmSnapshot,
  type HermesDailyFarmSnapshotMemoryInput,
} from "./hermes_daily_farm_snapshot_adapter";
import {
  HERMES_DAILY_FARM_BRIEF_INTEGRATION_TIMEOUT_MS,
  createHermesDailyFarmBriefIntegrationInput,
  parseHermesDailyFarmBriefIntegrationInput,
  type HermesDailyFarmBriefIntegrationInput,
  type HermesDailyFarmBriefReaderStatus,
} from "./hermes_daily_farm_brief_input";

type JsonRecord = Record<string, unknown>;

type ReaderOutcome = {
  status: HermesDailyFarmBriefReaderStatus;
  value: unknown;
};

export type HermesDailyFarmBriefRealDataSafePreview = {
  schema_version: "hermes.daily_farm_brief.real_data.preview.v1";
  result: "ready" | "partial" | "unavailable";
  generated_at: string;
  timezone: string;
  sources: Array<{
    source_type: string;
    status: string;
    freshness: string;
    record_count: number;
  }>;
  source_coverage: HermesDailyFarmBriefSourceSelectionCoverage[];
  fact_count: number;
  warning_count: number;
  info_count: number;
  limitations: string[];
  source_provenance: HermesDailyFarmBriefIntegrationInput["source_provenance"];
  safety: HermesDailyFarmBriefIntegrationInput["safety"] & {
    brief_persistence_performed: false;
  };
};

export type HermesDailyFarmBriefRealDataIntegrationResult = {
  schema_version: "hermes.daily_farm_brief.real_data.integration.v1";
  result: "ready" | "partial" | "unavailable";
  snapshot: HermesDailyFarmSnapshot;
  brief: HermesDailyFarmBrief;
  brief_summary: HermesDailyFarmBriefSafeSummary;
  safe_preview: HermesDailyFarmBriefRealDataSafePreview;
};

export type HermesDailyFarmBriefScopeReferenceInput = {
  schema_version: "hermes.daily_farm_brief.scope_reference_input.v1";
  workLogs: HermesDailyFarmBriefScopeWorkLogInput[];
  cropCycles: HermesDailyFarmBriefScopeCropCycleInput[];
};

export type HermesDailyFarmBriefExecutionIntegrationBundle = {
  integration_result: HermesDailyFarmBriefRealDataIntegrationResult;
  scope_reference_input: HermesDailyFarmBriefScopeReferenceInput;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function parseHermesDailyFarmBriefScopeReferenceInput(
  value: unknown,
): HermesDailyFarmBriefScopeReferenceInput | null {
  if (!isRecord(value) || !hasExactKeys(value, ["schema_version", "workLogs", "cropCycles"]) || value.schema_version !== "hermes.daily_farm_brief.scope_reference_input.v1" || !Array.isArray(value.workLogs) || value.workLogs.length > 1_000 || !Array.isArray(value.cropCycles) || value.cropCycles.length > 1_000) return null;
  const validWorkLog = (item: unknown) => isRecord(item) && hasExactKeys(item, ["id", "field_id", "target_crop", "crop_cycle_id"]) && (item.id === null || normalizeHermesDailyFarmBriefScopeId(item.id) === item.id) && (item.field_id === null || normalizeHermesDailyFarmBriefScopeId(item.field_id) === item.field_id) && (item.target_crop === null || normalizeHermesDailyFarmBriefScopeCrop(item.target_crop) === item.target_crop) && (item.crop_cycle_id === null || normalizeHermesDailyFarmBriefScopeId(item.crop_cycle_id) === item.crop_cycle_id);
  const validCropCycle = (item: unknown) => isRecord(item) && hasExactKeys(item, ["id", "crop", "field_id"]) && (item.id === null || normalizeHermesDailyFarmBriefScopeId(item.id) === item.id) && (item.crop === null || normalizeHermesDailyFarmBriefScopeCrop(item.crop) === item.crop) && (item.field_id === null || normalizeHermesDailyFarmBriefScopeId(item.field_id) === item.field_id);
  if (!value.workLogs.every(validWorkLog) || !value.cropCycles.every(validCropCycle)) return null;
  return structuredClone(value) as HermesDailyFarmBriefScopeReferenceInput;
}

export function parseHermesDailyFarmBriefRealDataIntegrationResult(
  value: unknown,
): HermesDailyFarmBriefRealDataIntegrationResult | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schema_version",
      "result",
      "snapshot",
      "brief",
      "brief_summary",
      "safe_preview",
    ]) ||
    value.schema_version !== "hermes.daily_farm_brief.real_data.integration.v1" ||
    !["ready", "partial", "unavailable"].includes(String(value.result))
  ) {
    return null;
  }
  const snapshot = parseHermesDailyFarmSnapshot(value.snapshot);
  const brief = parseHermesDailyFarmBrief(value.brief);
  if (
    snapshot === null ||
    brief === null ||
    value.result !== snapshot.status ||
    brief.status !== snapshot.status ||
    brief.snapshot_id !== snapshot.snapshot_id ||
    brief.generated_at !== snapshot.generated_at ||
    !isRecord(value.brief_summary) ||
    !isRecord(value.safe_preview)
  ) {
    return null;
  }
  return structuredClone(value) as HermesDailyFarmBriefRealDataIntegrationResult;
}

export function parseHermesDailyFarmBriefExecutionIntegrationBundle(
  value: unknown,
): HermesDailyFarmBriefExecutionIntegrationBundle | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["integration_result", "scope_reference_input"])
  ) {
    return null;
  }
  const integrationResult = value.integration_result;
  const scopeReferenceInput = parseHermesDailyFarmBriefScopeReferenceInput(
    value.scope_reference_input,
  );
  if (
    !isRecord(integrationResult) ||
    !hasExactKeys(integrationResult, [
      "schema_version",
      "result",
      "snapshot",
      "brief",
      "brief_summary",
      "safe_preview",
    ]) ||
    integrationResult.schema_version !==
      "hermes.daily_farm_brief.real_data.integration.v1" ||
    !["ready", "partial", "unavailable"].includes(
      String(integrationResult.result),
    ) ||
    scopeReferenceInput === null
  ) {
    return null;
  }
  return {
    integration_result:
      structuredClone(integrationResult) as HermesDailyFarmBriefRealDataIntegrationResult,
    scope_reference_input: scopeReferenceInput,
  };
}

function createScopeReferenceInput(input: {
  operationalOutcome: ReaderOutcome;
  snapshot: HermesDailyFarmSnapshot;
}): HermesDailyFarmBriefScopeReferenceInput {
  const workLogs: HermesDailyFarmBriefScopeWorkLogInput[] = [];
  if ((input.snapshot.sources.work_log.status === "available" || input.snapshot.sources.work_log.status === "empty") && input.operationalOutcome.status === "returned" && isRecord(input.operationalOutcome.value) && isRecord(input.operationalOutcome.value.work_log) && Array.isArray(input.operationalOutcome.value.work_log.records)) {
    for (const item of input.operationalOutcome.value.work_log.records) {
      if (!isRecord(item)) continue;
      workLogs.push({
        id: normalizeHermesDailyFarmBriefScopeId(item.id),
        field_id: normalizeHermesDailyFarmBriefScopeId(item.fieldId),
        target_crop: normalizeHermesDailyFarmBriefScopeCrop(item.targetCrop),
        crop_cycle_id: normalizeHermesDailyFarmBriefScopeId(item.cropCycleId),
      });
    }
  }
  const cropCycles: HermesDailyFarmBriefScopeCropCycleInput[] = [];
  if ((input.snapshot.sources.crop_cycle.status === "available" || input.snapshot.sources.crop_cycle.status === "empty") && input.operationalOutcome.status === "returned" && isRecord(input.operationalOutcome.value) && isRecord(input.operationalOutcome.value.crop_cycle) && Array.isArray(input.operationalOutcome.value.crop_cycle.records)) {
    for (const item of input.operationalOutcome.value.crop_cycle.records) {
      if (!isRecord(item)) continue;
      const fieldReferences = Array.isArray(item.field_references) && item.field_references.length > 0 ? item.field_references : [null];
      for (const fieldReference of fieldReferences) {
        cropCycles.push({
          id: normalizeHermesDailyFarmBriefScopeId(item.reference),
          crop: normalizeHermesDailyFarmBriefScopeCrop(item.crop_display_name),
          field_id: normalizeHermesDailyFarmBriefScopeId(fieldReference),
        });
      }
    }
  }
  const references: HermesDailyFarmBriefScopeReferenceInput = {
    schema_version: "hermes.daily_farm_brief.scope_reference_input.v1",
    workLogs,
    cropCycles,
  };
  const parsed = parseHermesDailyFarmBriefScopeReferenceInput(references);
  if (parsed === null) throw new Error("daily_farm_brief_scope_reference_invalid");
  return parsed;
}

async function readOnce(
  reader: () => Promise<unknown>,
  timeoutMs: number,
): Promise<ReaderOutcome> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const value = await Promise.race([
      reader(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("daily_farm_brief_reader_timeout")),
          timeoutMs,
        );
      }),
    ]);
    return { status: "returned", value };
  } catch {
    return { status: "failed", value: null };
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

function createUnavailableOperationalResult(): HermesOperationalReadonlyClientResult {
  const source = (sourceType: "inventory" | "work_log" | "field" | "crop_cycle") => ({
    result: "error" as const,
    source_type: sourceType,
    endpoint_path:
      sourceType === "inventory" ? ("/api/farmos-core/inventory-summary" as const)
        : sourceType === "work_log" ? ("/api/farmos-core/recent-work-logs" as const)
          : sourceType === "field" ? ("/api/farmos-core/fields" as const)
            : ("/api/farmos-core/crop-cycles" as const),
    http_method: "GET" as const,
    fetch_performed: false,
    available: false,
    transaction_read_only: true as const,
    requested_limit: 100,
    http_status: null,
    response_source: null,
    observed_at: null,
    source_updated_at: null,
    generated_at: null,
    record_count: 0,
    records: [],
    has_more: false,
    error_code: "network_unavailable" as const,
    write_performed: false as const,
    restricted_fields_exposed: false as const,
    credentials_exposed: false as const,
  });

  return {
    result: "error",
    checked: "hermes_operational_readonly_client",
    boundary: "day92_hermes_operational_readonly_client",
    inventory: source("inventory"),
    work_log: source("work_log"),
    field: source("field"),
    crop_cycle: source("crop_cycle"),
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

function memorySafetyValid(value: JsonRecord): boolean {
  if (
    value.result !== "ok" ||
    !isRecord(value.boundary) ||
    !isRecord(value.context) ||
    !isRecord(value.context.runtime) ||
    !isRecord(value.context.safe_app_context)
  ) {
    return false;
  }

  return (
    value.boundary.mode === "hermes_memory_context_read_boundary" &&
    value.boundary.transaction_read_only === true &&
    value.boundary.writes_performed === false &&
    value.boundary.commands_executed === false &&
    value.boundary.hermes_runtime_executed === false &&
    value.boundary.llm_runtime_executed === false &&
    value.boundary.embeddings_executed === false &&
    value.boundary.vector_search_executed === false &&
    value.context.scope === "hermes_memory_context_minimum" &&
    value.context.runtime.hermes_runtime_executed === false &&
    value.context.runtime.llm_runtime_executed === false &&
    value.context.runtime.embeddings_executed === false &&
    value.context.runtime.vector_search_executed === false &&
    Array.isArray(value.context.latest_hermes_notes) &&
    Array.isArray(value.context.safe_app_context.crop_cycles_summary) &&
    value.context.restricted_domain_data_exposed === false
  );
}

function normalizeMemoryInput(outcome: ReaderOutcome): {
  memory: HermesDailyFarmSnapshotMemoryInput;
  invalid: boolean;
} {
  if (outcome.status === "failed") {
    return {
      memory: {
        crop_cycles: [],
        hermes_notes: [],
        crop_cycle_generated_at: null,
        hermes_note_generated_at: null,
        crop_cycle_available: false,
        hermes_note_available: false,
      },
      invalid: false,
    };
  }

  if (!isRecord(outcome.value) || outcome.value.result !== "ok") {
    return {
      memory: {
        crop_cycles: [],
        hermes_notes: [],
        crop_cycle_generated_at: null,
        hermes_note_generated_at: null,
        crop_cycle_available: false,
        hermes_note_available: false,
      },
      invalid: false,
    };
  }

  if (!memorySafetyValid(outcome.value)) {
    return {
      memory: {
        crop_cycles: null as unknown as unknown[],
        hermes_notes: null as unknown as unknown[],
        crop_cycle_generated_at: null,
        hermes_note_generated_at: null,
      },
      invalid: true,
    };
  }

  const context = outcome.value.context as JsonRecord;
  const safeAppContext = context.safe_app_context as JsonRecord;
  return {
    memory: {
      crop_cycles: safeAppContext.crop_cycles_summary as unknown[],
      hermes_notes: context.latest_hermes_notes as unknown[],
      crop_cycle_generated_at: null,
      hermes_note_generated_at: null,
      crop_cycle_available: true,
      hermes_note_available: true,
    },
    invalid: false,
  };
}

function addIntegrationLimitations(snapshot: HermesDailyFarmSnapshot): void {
  snapshot.limitations = [
    ...new Set([
      ...snapshot.limitations,
      "today_work_candidate_source_unavailable",
    ]),
  ]
    .sort()
    .slice(0, HERMES_DAILY_FARM_BRIEF_POLICY.maximum_limitations);
}

function createSafePreview(input: {
  integrationInput: HermesDailyFarmBriefIntegrationInput;
  snapshot: HermesDailyFarmSnapshot;
  brief: HermesDailyFarmBrief;
}): HermesDailyFarmBriefRealDataSafePreview {
  return {
    schema_version: "hermes.daily_farm_brief.real_data.preview.v1",
    result: input.snapshot.status,
    generated_at: input.integrationInput.generated_at,
    timezone: input.integrationInput.timezone,
    sources: HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType) => {
      const source = input.snapshot.sources[sourceType];
      return {
        source_type: sourceType,
        status: source.status,
        freshness: source.freshness,
        record_count: source.record_count,
      };
    }),
    source_coverage: input.brief.source_summary.map(
      ({ record_count: _recordCount, ...coverage }) => structuredClone(coverage),
    ),
    fact_count: input.brief.facts.length,
    warning_count: input.brief.facts.filter((fact) => fact.severity === "warning")
      .length,
    info_count: input.brief.facts.filter((fact) => fact.severity === "info").length,
    limitations: [...input.brief.limitations],
    source_provenance: structuredClone(
      input.integrationInput.source_provenance,
    ),
    safety: {
      ...input.integrationInput.safety,
      brief_persistence_performed: false,
    },
  };
}

type HermesDailyFarmBriefRealDataIntegrationOptions = {
  readOperationalSources: () => Promise<unknown>;
  readMemoryContext: () => Promise<unknown>;
  now?: () => string;
  timezone: string;
  snapshotIdFactory?: () => string;
  briefIdFactory?: () => string;
  factIdFactory?: (index: number) => string;
};

export async function integrateHermesDailyFarmBriefExecutionBundle(
  input: HermesDailyFarmBriefRealDataIntegrationOptions,
): Promise<HermesDailyFarmBriefExecutionIntegrationBundle> {
  const [operationalOutcome, memoryOutcome] = await Promise.all([
    readOnce(
      input.readOperationalSources,
      HERMES_DAILY_FARM_BRIEF_INTEGRATION_TIMEOUT_MS,
    ),
    readOnce(
      input.readMemoryContext,
      HERMES_DAILY_FARM_BRIEF_INTEGRATION_TIMEOUT_MS,
    ),
  ]);
  const generatedAt = (input.now ?? (() => new Date().toISOString()))();

  const integrationInput = createHermesDailyFarmBriefIntegrationInput({
    operationalResult: operationalOutcome.value,
    operationalReaderStatus: operationalOutcome.status,
    memoryContextResult: memoryOutcome.value,
    memoryReaderStatus: memoryOutcome.status,
    generatedAt,
    timezone: input.timezone,
  });
  if (!parseHermesDailyFarmBriefIntegrationInput(integrationInput)) {
    throw new Error("daily_farm_brief_integration_input_invalid");
  }

  const normalizedMemory = normalizeMemoryInput(memoryOutcome);
  const operationalResult =
    operationalOutcome.status === "failed"
      ? createUnavailableOperationalResult()
      : operationalOutcome.value;
  const snapshot = createHermesDailyFarmSnapshot({
    operationalSources: operationalResult,
    memory: normalizedMemory.memory,
    nowIso: generatedAt,
    snapshotIdFactory: input.snapshotIdFactory,
  });
  addIntegrationLimitations(snapshot);
  if (!parseHermesDailyFarmSnapshot(snapshot)) {
    throw new Error("daily_farm_brief_integration_snapshot_invalid");
  }

  const built = buildHermesDailyFarmBrief({
    snapshot,
    generatedAt,
    briefIdFactory: input.briefIdFactory,
    factIdFactory: input.factIdFactory,
  });
  if (!parseHermesDailyFarmBrief(built.brief)) {
    throw new Error("daily_farm_brief_integration_brief_invalid");
  }

  const scopeReferenceInput = createScopeReferenceInput({
    operationalOutcome,
    snapshot,
  });

  const integrationResult: HermesDailyFarmBriefRealDataIntegrationResult = {
    schema_version: "hermes.daily_farm_brief.real_data.integration.v1",
    result: snapshot.status,
    snapshot,
    brief: built.brief,
    brief_summary: built.summary,
    safe_preview: createSafePreview({
      integrationInput,
      snapshot,
      brief: built.brief,
    }),
  };
  const bundle = {
    integration_result: integrationResult,
    scope_reference_input: scopeReferenceInput,
  };
  const parsed = parseHermesDailyFarmBriefExecutionIntegrationBundle(bundle);
  if (parsed === null) {
    throw new Error("daily_farm_brief_execution_integration_bundle_invalid");
  }
  return parsed;
}

export async function integrateHermesDailyFarmBriefRealData(
  input: HermesDailyFarmBriefRealDataIntegrationOptions,
): Promise<HermesDailyFarmBriefRealDataIntegrationResult> {
  const bundle = await integrateHermesDailyFarmBriefExecutionBundle(input);
  return bundle.integration_result;
}
