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
import type { HermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_contract";
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const source = (sourceType: "inventory" | "work_log") => ({
    result: "error" as const,
    source_type: sourceType,
    endpoint_path:
      sourceType === "inventory"
        ? ("/api/farmos-core/inventory-summary" as const)
        : ("/api/farmos-core/recent-work-logs" as const),
    http_method: "GET" as const,
    fetch_performed: false,
    available: false,
    transaction_read_only: true as const,
    requested_limit: 100,
    http_status: null,
    response_source: null,
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

export async function integrateHermesDailyFarmBriefRealData(input: {
  readOperationalSources: () => Promise<unknown>;
  readMemoryContext: () => Promise<unknown>;
  now?: () => string;
  timezone: string;
  snapshotIdFactory?: () => string;
  briefIdFactory?: () => string;
  factIdFactory?: (index: number) => string;
}): Promise<HermesDailyFarmBriefRealDataIntegrationResult> {
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

  return {
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
}
