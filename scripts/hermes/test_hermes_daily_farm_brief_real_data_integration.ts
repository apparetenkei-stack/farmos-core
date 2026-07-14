import assert from "node:assert/strict";
import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  HERMES_DAILY_FARM_BRIEF_POLICY,
} from "./brief_runtime/hermes_daily_farm_brief_policy";
import {
  integrateHermesDailyFarmBriefRealData,
} from "./brief_runtime/hermes_daily_farm_brief_integration";
import {
  createHermesDailyFarmBriefIntegrationInput,
  parseHermesDailyFarmBriefIntegrationInput,
} from "./brief_runtime/hermes_daily_farm_brief_input";

const NOW = "2026-07-14T09:00:00.000Z";

type SourceMode = "ok" | "unavailable";

function inventoryRecord(index: number) {
  return {
    id: `inventory-${index}`,
    name: `private inventory body ${index}`,
    baseType: "material",
    currentQuantity: index,
    unit: "kg",
  };
}

function workLogRecord(index: number) {
  return {
    id: `work-${index}`,
    startedAt: "2026-07-14T06:00:00.000Z",
    fieldId: `field-${index}`,
    workTypeId: null,
    workTypeName: `private work body ${index}`,
    durationMinutes: 45,
    targetCrop: "cabbage",
    cropCycleId: null,
    machineId: null,
    implementId: null,
    yieldAmount: null,
    yieldUnit: null,
    appliedMaterials: null,
  };
}

function operationalFixture(input: {
  inventoryCount?: number;
  workLogCount?: number;
  inventoryMode?: SourceMode;
  workLogMode?: SourceMode;
  inventoryGeneratedAt?: string | null;
  workLogGeneratedAt?: string | null;
} = {}): HermesOperationalReadonlyClientResult {
  const inventoryMode = input.inventoryMode ?? "ok";
  const workLogMode = input.workLogMode ?? "ok";
  const source = <T>(options: {
    type: "inventory" | "work_log";
    mode: SourceMode;
    generatedAt: string | null;
    records: T[];
  }) => ({
    result: options.mode === "ok" ? ("ok" as const) : ("error" as const),
    source_type: options.type,
    endpoint_path:
      options.type === "inventory"
        ? ("/api/farmos-core/inventory-summary" as const)
        : ("/api/farmos-core/recent-work-logs" as const),
    http_method: "GET" as const,
    fetch_performed: options.mode === "ok",
    available: options.mode === "ok",
    transaction_read_only: true as const,
    requested_limit: 100,
    http_status: options.mode === "ok" ? 200 : null,
    response_source:
      options.mode === "ok"
        ? options.type === "inventory"
          ? ("apparetenkei_inventory_readonly" as const)
          : ("apparetenkei_work_logs_readonly" as const)
        : null,
    generated_at: options.mode === "ok" ? options.generatedAt : null,
    record_count: options.mode === "ok" ? options.records.length : 0,
    records: options.mode === "ok" ? options.records : [],
    has_more: false,
    error_code:
      options.mode === "ok" ? null : ("network_unavailable" as const),
    write_performed: false as const,
    restricted_fields_exposed: false as const,
    credentials_exposed: false as const,
  });
  const inventory = Array.from(
    { length: input.inventoryCount ?? 0 },
    (_, index) => inventoryRecord(index),
  );
  const workLogs = Array.from(
    { length: input.workLogCount ?? 2 },
    (_, index) => workLogRecord(index),
  );
  const successCount = Number(inventoryMode === "ok") + Number(workLogMode === "ok");

  return {
    result: successCount === 2 ? "ok" : successCount === 1 ? "partial" : "error",
    checked: "hermes_operational_readonly_client",
    boundary: "day92_hermes_operational_readonly_client",
    inventory: source({
      type: "inventory",
      mode: inventoryMode,
      generatedAt:
        input.inventoryGeneratedAt === undefined
          ? "2026-07-14T08:00:00.000Z"
          : input.inventoryGeneratedAt,
      records: inventory,
    }),
    work_log: source({
      type: "work_log",
      mode: workLogMode,
      generatedAt:
        input.workLogGeneratedAt === undefined
          ? "2026-07-14T08:00:00.000Z"
          : input.workLogGeneratedAt,
      records: workLogs,
    }),
    inventory_source_connected: inventoryMode === "ok",
    work_log_source_connected: workLogMode === "ok",
    external_fetch_performed: successCount > 0,
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

function memoryFixture(input: { cropCount?: number; noteCount?: number } = {}) {
  return {
    result: "ok",
    boundary: {
      mode: "hermes_memory_context_read_boundary",
      db_user: "fixture-reader",
      transaction_read_only: true,
      writes_performed: false,
      commands_executed: false,
      hermes_runtime_executed: false,
      llm_runtime_executed: false,
      embeddings_executed: false,
      vector_search_executed: false,
      app_schema_write_allowed: false,
      ai_proposal_write_allowed: false,
      audit_apply_event_write_allowed: false,
    },
    context: {
      scope: "hermes_memory_context_minimum",
      runtime: {
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
        embeddings_executed: false,
        vector_search_executed: false,
      },
      proposal_context: {},
      latest_hermes_notes: Array.from(
        { length: input.noteCount ?? 2 },
        (_, index) => ({
          id: `note-${index}`,
          content: `private note body ${index}`,
        }),
      ),
      safe_app_context: {
        crop_cycles_summary: Array.from(
          { length: input.cropCount ?? 2 },
          (_, index) => ({
            id: `cycle-${index}`,
            crop: `private crop body ${index}`,
            status: "active",
          }),
        ),
        visible_domain_scope: ["crop_cycles_minimum_summary"],
      },
      memory_policy: { read_only: true },
      redaction_policy: { restricted_fields_exposed: false },
      restricted_domain_data_exposed: false,
    },
  };
}

async function integrate(input: {
  operational?: () => Promise<unknown>;
  memory?: () => Promise<unknown>;
  snapshotId?: string;
  briefId?: string;
}) {
  return integrateHermesDailyFarmBriefRealData({
    readOperationalSources:
      input.operational ?? (async () => operationalFixture()),
    readMemoryContext: input.memory ?? (async () => memoryFixture()),
    now: () => NOW,
    timezone: "Asia/Tokyo",
    snapshotIdFactory: () => input.snapshotId ?? "snapshot-integration",
    briefIdFactory: () => input.briefId ?? "brief-integration",
    factIdFactory: (index) => `fact-integration-${index}`,
  });
}

async function main(): Promise<void> {
  let operationalCalls = 0;
  let memoryCalls = 0;
  const day91Fixture = await integrate({
    operational: async () => {
      operationalCalls += 1;
      return operationalFixture({ inventoryCount: 0, workLogCount: 2 });
    },
    memory: async () => {
      memoryCalls += 1;
      return memoryFixture();
    },
  });
  assert.equal(operationalCalls, 1);
  assert.equal(memoryCalls, 1);
  assert.equal(day91Fixture.result, "ready");
  assert.equal(day91Fixture.snapshot.sources.inventory.status, "empty");
  assert.equal(day91Fixture.snapshot.sources.inventory.record_count, 0);
  assert.equal(day91Fixture.snapshot.sources.work_log.record_count, 2);
  assert.equal(day91Fixture.safe_preview.timezone, "Asia/Tokyo");
  assert.ok(
    day91Fixture.safe_preview.limitations.includes(
      "today_work_candidate_source_unavailable",
    ),
  );

  const callOrder: string[] = [];
  let postReadOperationalCalls = 0;
  let postReadMemoryCalls = 0;
  let clockCalls = 0;
  const postReadTimestamp = await integrateHermesDailyFarmBriefRealData({
    readOperationalSources: async () => {
      postReadOperationalCalls += 1;
      callOrder.push("operational_started");
      await Promise.resolve();
      callOrder.push("operational_completed");
      return operationalFixture({
        inventoryCount: 0,
        workLogCount: 100,
        inventoryGeneratedAt: "2026-07-14T09:00:00.005Z",
        workLogGeneratedAt: "2026-07-14T09:00:00.005Z",
      });
    },
    readMemoryContext: async () => {
      postReadMemoryCalls += 1;
      callOrder.push("memory_started");
      await Promise.resolve();
      callOrder.push("memory_completed");
      return memoryFixture({ cropCount: 8, noteCount: 5 });
    },
    now: () => {
      clockCalls += 1;
      callOrder.push("now_called");
      return "2026-07-14T09:00:00.010Z";
    },
    timezone: "Asia/Tokyo",
    snapshotIdFactory: () => "snapshot-post-read-timestamp",
    briefIdFactory: () => "brief-post-read-timestamp",
    factIdFactory: (index) => `fact-post-read-${index}`,
  });
  assert.equal(postReadOperationalCalls, 1);
  assert.equal(postReadMemoryCalls, 1);
  assert.equal(clockCalls, 1);
  assert.ok(
    callOrder.indexOf("now_called") > callOrder.indexOf("operational_completed"),
  );
  assert.ok(callOrder.indexOf("now_called") > callOrder.indexOf("memory_completed"));
  assert.equal(postReadTimestamp.result, "ready");
  assert.equal(postReadTimestamp.snapshot.sources.inventory.status, "empty");
  assert.equal(postReadTimestamp.snapshot.sources.inventory.record_count, 0);
  assert.equal(postReadTimestamp.snapshot.sources.work_log.status, "available");
  assert.equal(postReadTimestamp.snapshot.sources.work_log.record_count, 100);
  assert.equal(postReadTimestamp.snapshot.sources.work_log.records.length, 10);
  assert.equal(
    postReadTimestamp.snapshot.sources.work_log.generated_at,
    "2026-07-14T09:00:00.005Z",
  );
  assert.equal(
    postReadTimestamp.snapshot.generated_at,
    "2026-07-14T09:00:00.010Z",
  );

  const stale = await integrate({
    operational: async () =>
      operationalFixture({
        workLogGeneratedAt: "2026-07-13T09:00:00.000Z",
      }),
  });
  assert.equal(stale.result, "partial");
  assert.equal(stale.snapshot.sources.work_log.status, "available");
  assert.equal(stale.snapshot.sources.work_log.freshness, "stale");

  const oneUnavailable = await integrate({
    operational: async () =>
      operationalFixture({ inventoryMode: "unavailable" }),
  });
  assert.equal(oneUnavailable.result, "partial");
  assert.equal(oneUnavailable.snapshot.sources.inventory.status, "unavailable");

  const bothUnavailable = await integrate({
    operational: async () =>
      operationalFixture({
        inventoryMode: "unavailable",
        workLogMode: "unavailable",
      }),
  });
  assert.equal(bothUnavailable.result, "unavailable");

  const memoryUnavailable = await integrate({
    memory: async () => ({ result: "error" }),
  });
  assert.equal(memoryUnavailable.result, "ready");
  assert.equal(
    memoryUnavailable.snapshot.sources.crop_cycle.status,
    "unavailable",
  );
  assert.equal(
    memoryUnavailable.snapshot.sources.hermes_note.status,
    "unavailable",
  );

  const operationalThrow = await integrate({
    operational: async () => {
      throw new Error("reader failure must be normalized");
    },
  });
  assert.equal(operationalThrow.result, "unavailable");
  assert.equal(
    operationalThrow.safe_preview.source_provenance.operational.reader_status,
    "failed",
  );

  const memoryThrow = await integrate({
    memory: async () => {
      throw new Error("memory failure must be normalized");
    },
  });
  assert.equal(memoryThrow.result, "ready");
  assert.equal(
    memoryThrow.safe_preview.source_provenance.memory.reader_status,
    "failed",
  );

  const safetyTamper = operationalFixture();
  safetyTamper.database_write_performed = true as false;
  const invalidSafety = await integrate({
    operational: async () => safetyTamper,
  });
  assert.equal(invalidSafety.result, "unavailable");
  assert.equal(invalidSafety.snapshot.sources.inventory.status, "invalid");

  const memorySafetyTamper = memoryFixture();
  memorySafetyTamper.boundary.writes_performed = true as false;
  const invalidMemorySafety = await integrate({
    memory: async () => memorySafetyTamper,
  });
  assert.equal(invalidMemorySafety.result, "unavailable");

  assert.equal(
    day91Fixture.snapshot.sources.crop_cycle.generated_at,
    null,
  );
  assert.equal(day91Fixture.snapshot.sources.hermes_note.generated_at, null);
  assert.equal(
    day91Fixture.snapshot.sources.crop_cycle.freshness,
    "unknown",
  );

  const future = await integrate({
    operational: async () =>
      operationalFixture({
        inventoryGeneratedAt: "2026-07-14T09:00:00.001Z",
      }),
  });
  assert.equal(future.result, "unavailable");
  assert.equal(future.snapshot.sources.inventory.status, "invalid");

  const limited = await integrate({
    operational: async () =>
      operationalFixture({ inventoryCount: 25, workLogCount: 15 }),
    memory: async () => memoryFixture({ cropCount: 25, noteCount: 15 }),
    snapshotId: "snapshot-limited",
    briefId: "brief-limited",
  });
  assert.equal(limited.snapshot.sources.inventory.records.length, 20);
  assert.equal(limited.snapshot.sources.work_log.records.length, 10);
  assert.equal(limited.snapshot.sources.crop_cycle.records.length, 20);
  assert.equal(limited.snapshot.sources.hermes_note.records.length, 10);
  assert.ok(
    limited.brief.facts.length <= HERMES_DAILY_FARM_BRIEF_POLICY.maximum_facts,
  );

  const deterministicA = await integrate({
    snapshotId: "snapshot-deterministic",
    briefId: "brief-deterministic",
  });
  const deterministicB = await integrate({
    snapshotId: "snapshot-deterministic",
    briefId: "brief-deterministic",
  });
  assert.deepEqual(deterministicA, deterministicB);

  const safeOutput = JSON.stringify(limited.safe_preview);
  assert.doesNotMatch(safeOutput, /private inventory body/u);
  assert.doesNotMatch(safeOutput, /private work body/u);
  assert.doesNotMatch(safeOutput, /private crop body/u);
  assert.doesNotMatch(safeOutput, /private note body/u);
  assert.doesNotMatch(safeOutput, /\/api\/farmos-core/u);
  assert.doesNotMatch(safeOutput, /authorization|credential|token/iu);

  const inputContract = createHermesDailyFarmBriefIntegrationInput({
    operationalResult: operationalFixture(),
    operationalReaderStatus: "returned",
    memoryContextResult: memoryFixture(),
    memoryReaderStatus: "returned",
    generatedAt: NOW,
    timezone: "Asia/Tokyo",
  });
  assert.ok(parseHermesDailyFarmBriefIntegrationInput(inputContract));
  const inputSafetyTamper = structuredClone(inputContract);
  inputSafetyTamper.safety.notification_performed = true as false;
  assert.equal(parseHermesDailyFarmBriefIntegrationInput(inputSafetyTamper), null);

  assert.equal(day91Fixture.safe_preview.safety.database_write_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.app_db_write_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.core_db_write_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.proposal_created, false);
  assert.equal(day91Fixture.safe_preview.safety.proposal_saved, false);
  assert.equal(day91Fixture.safe_preview.safety.audit_write_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.notification_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.queue_operation_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.worker_claim_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.model_execution_performed, false);
  assert.equal(day91Fixture.safe_preview.safety.secret_exposed, false);
  assert.equal(day91Fixture.safe_preview.safety.brief_persistence_performed, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_daily_farm_brief_real_data_integration",
        input_contract: "hermes.daily_farm_brief.input.v1",
        inventory_connected_empty: true,
        ready: day91Fixture.result,
        stale_required_source: stale.result,
        one_required_unavailable: oneUnavailable.result,
        both_required_unavailable: bothUnavailable.result,
        memory_unavailable_required_ready: memoryUnavailable.result,
        operational_throw_normalized: true,
        memory_throw_normalized: true,
        safety_tamper_fail_closed: true,
        timestamp_fabricated: false,
        future_timestamp_invalid: true,
        source_limits: "ok",
        deterministic: true,
        operational_reader_call_count: operationalCalls,
        memory_reader_call_count: memoryCalls,
        clock_called_after_readers: true,
        clock_call_count: clockCalls,
        real_shape_inventory_empty: true,
        real_shape_work_log_record_count: 100,
        real_shape_work_log_truncated_count: 10,
        safe_preview: "ok",
        timezone_fixture: "Asia/Tokyo",
        database_write_performed: false,
        proposal_saved: false,
        audit_write_performed: false,
        notification_performed: false,
        model_execution_performed: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
