import assert from "node:assert/strict";
import { createHermesDailyFarmBrief } from "../../src/lib/hermes/hermes_daily_farm_brief_boundary";
import type {
  HermesOperationalInventoryRecord,
  HermesOperationalReadonlyClientResult,
  HermesOperationalWorkLogRecord,
} from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  HERMES_DAILY_FARM_BRIEF_POLICY,
  evaluateHermesDailyFarmFreshness,
  isHermesDailyFarmSourceTimestampInvalid,
} from "./brief_runtime/hermes_daily_farm_brief_policy";
import {
  createHermesDailyFarmSnapshot,
  parseHermesDailyFarmSnapshot,
} from "./brief_runtime/hermes_daily_farm_snapshot_adapter";
import {
  buildHermesDailyFarmBrief,
  parseHermesDailyFarmBrief,
  parseHermesDailyFarmBriefFact,
} from "./brief_runtime/hermes_daily_farm_brief_builder";

const NOW = "2026-07-14T09:00:00.000Z";

type SourceOptions = {
  generatedAt?: string | null;
  result?: "ok" | "error";
  available?: boolean;
};

function operationalSources(
  inventory: unknown[] = [],
  workLogs: unknown[] = [],
  options: {
    inventory?: SourceOptions;
    workLog?: SourceOptions;
  } = {},
): HermesOperationalReadonlyClientResult {
  const source = <T>(
    type: "inventory" | "work_log",
    records: T[],
    sourceOptions: SourceOptions = {},
  ) => {
    const result = sourceOptions.result ?? "ok";
    const available = sourceOptions.available ?? result === "ok";
    return {
      result,
      source_type: type,
      endpoint_path:
        type === "inventory"
          ? ("/api/farmos-core/inventory-summary" as const)
          : ("/api/farmos-core/recent-work-logs" as const),
      http_method: "GET" as const,
      fetch_performed: true,
      available,
      transaction_read_only: true as const,
      requested_limit: 100,
      http_status: result === "ok" ? 200 : null,
      response_source:
        type === "inventory"
          ? ("apparetenkei_inventory_readonly" as const)
          : ("apparetenkei_work_logs_readonly" as const),
      generated_at:
        sourceOptions.generatedAt === undefined
          ? "2026-07-14T08:00:00.000Z"
          : sourceOptions.generatedAt,
      record_count: records.length,
      records,
      has_more: false,
      error_code: result === "ok" ? null : ("network_unavailable" as const),
      write_performed: false as const,
      restricted_fields_exposed: false as const,
      credentials_exposed: false as const,
    };
  };

  return {
    result: "ok",
    checked: "hermes_operational_readonly_client",
    boundary: "day92_hermes_operational_readonly_client",
    inventory: source("inventory", inventory, options.inventory),
    work_log: source("work_log", workLogs, options.workLog),
    inventory_source_connected: true,
    work_log_source_connected: true,
    external_fetch_performed: true,
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
  } as HermesOperationalReadonlyClientResult;
}

function inventoryRecord(
  id: string | number,
  currentQuantity: string | number | null = 1,
  unit: string | null = "kg",
): HermesOperationalInventoryRecord {
  return {
    id,
    name: "input",
    baseType: "material",
    currentQuantity,
    unit,
  };
}

function workLog(
  id: string | number,
  startedAt: string | null = "2026-07-14T06:00:00.000Z",
): HermesOperationalWorkLogRecord {
  return {
    id,
    startedAt,
    fieldId: null,
    workTypeId: null,
    workTypeName: "harvest",
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

function memory(input: {
  cropCount?: number;
  noteCount?: number;
  cropGeneratedAt?: string | null;
  noteGeneratedAt?: string | null;
} = {}) {
  return {
    crop_cycles: Array.from({ length: input.cropCount ?? 1 }, (_, index) => ({
      id: `cycle-${index + 1}`,
      crop: "cabbage",
      status: "active",
    })),
    hermes_notes: Array.from({ length: input.noteCount ?? 1 }, (_, index) => ({
      id: `note-${index + 1}`,
      content: "review irrigation",
    })),
    crop_cycle_generated_at: input.cropGeneratedAt ?? null,
    hermes_note_generated_at: input.noteGeneratedAt ?? null,
  };
}

function createSnapshot(
  operational: unknown,
  id: string,
  memoryInput = memory(),
) {
  return createHermesDailyFarmSnapshot({
    operationalSources: operational,
    memory: memoryInput,
    nowIso: NOW,
    snapshotIdFactory: () => id,
  });
}

async function main(): Promise<void> {
  assert.equal(
    HERMES_DAILY_FARM_BRIEF_POLICY.schema_version,
    "hermes.daily_farm_brief.policy.v1",
  );
  assert.deepEqual(HERMES_DAILY_FARM_BRIEF_POLICY.required_sources, [
    "inventory",
    "work_log",
  ]);
  assert.deepEqual(HERMES_DAILY_FARM_BRIEF_POLICY.optional_sources, [
    "field",
    "crop_cycle",
    "hermes_note",
  ]);
  assert.equal(
    HERMES_DAILY_FARM_BRIEF_POLICY.safety.client_policy_override_allowed,
    false,
  );
  assert.equal(
    HERMES_DAILY_FARM_BRIEF_POLICY.safety.client_limit_override_allowed,
    false,
  );
  assert.equal(HERMES_DAILY_FARM_BRIEF_POLICY.safety.audit_write_allowed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_POLICY.safety.notification_allowed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_POLICY.safety.queue_operation_allowed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_POLICY.safety.worker_claim_allowed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_POLICY.safety.secret_access_allowed, false);

  const justFresh24h = "2026-07-13T09:00:00.001Z";
  const stale24h = "2026-07-13T09:00:00.000Z";
  const justFresh7d = "2026-07-07T09:00:00.001Z";
  const stale7d = "2026-07-07T09:00:00.000Z";
  assert.equal(
    evaluateHermesDailyFarmFreshness({
      sourceType: "inventory",
      generatedAt: justFresh24h,
      nowIso: NOW,
    }),
    "fresh",
  );
  assert.equal(
    evaluateHermesDailyFarmFreshness({
      sourceType: "work_log",
      generatedAt: stale24h,
      nowIso: NOW,
    }),
    "stale",
  );
  assert.equal(
    evaluateHermesDailyFarmFreshness({
      sourceType: "field",
      generatedAt: justFresh7d,
      nowIso: NOW,
    }),
    "fresh",
  );
  assert.equal(
    evaluateHermesDailyFarmFreshness({
      sourceType: "crop_cycle",
      generatedAt: stale7d,
      nowIso: NOW,
    }),
    "stale",
  );
  assert.equal(
    evaluateHermesDailyFarmFreshness({
      sourceType: "hermes_note",
      generatedAt: null,
      nowIso: NOW,
    }),
    "unknown",
  );
  assert.equal(
    isHermesDailyFarmSourceTimestampInvalid({
      generatedAt: "2026-07-14T09:00:00.001Z",
      nowIso: NOW,
    }),
    true,
  );

  const ready = createSnapshot(
    operationalSources([], [workLog("work-ready")]),
    "snapshot-ready",
  );
  assert.equal(ready.status, "ready");
  assert.equal(ready.sources.inventory.status, "empty");
  assert.equal(ready.sources.work_log.status, "available");
  assert.equal(ready.sources.field.status, "unavailable");
  assert.equal(ready.sources.crop_cycle.status, "available");
  assert.equal(ready.sources.crop_cycle.freshness, "unknown");
  assert.ok(parseHermesDailyFarmSnapshot(ready));

  const partial = createSnapshot(
    operationalSources([], [workLog("work-stale")], {
      workLog: { generatedAt: stale24h },
    }),
    "snapshot-partial",
  );
  assert.equal(partial.status, "partial");
  assert.equal(partial.sources.work_log.status, "available");
  assert.equal(partial.sources.work_log.freshness, "stale");

  const unavailableInput = operationalSources([], [workLog("work-invalid")]);
  (unavailableInput.inventory as unknown as { records: unknown }).records = null;
  let recordsNullThrew = false;
  let unavailable;
  try {
    unavailable = createSnapshot(unavailableInput, "snapshot-unavailable");
  } catch {
    recordsNullThrew = true;
  }
  assert.equal(recordsNullThrew, false);
  assert.equal(unavailable?.status, "unavailable");
  assert.equal(unavailable?.sources.inventory.status, "invalid");

  const malformedCount = operationalSources([], [workLog("work-count")]);
  malformedCount.work_log.record_count = -1;
  const invalidCount = createSnapshot(malformedCount, "snapshot-invalid-count");
  assert.equal(invalidCount.status, "unavailable");
  assert.equal(invalidCount.sources.work_log.status, "invalid");

  const mismatchedCount = operationalSources([], [workLog("work-mismatch")]);
  mismatchedCount.work_log.record_count = 2;
  const countMismatch = createSnapshot(
    mismatchedCount,
    "snapshot-count-mismatch",
  );
  assert.equal(countMismatch.sources.work_log.status, "invalid");

  const recordsObject = operationalSources([], [workLog("work-object")]);
  (recordsObject.inventory as unknown as { records: unknown }).records = {};
  const invalidRecordsObject = createSnapshot(
    recordsObject,
    "snapshot-records-object",
  );
  assert.equal(invalidRecordsObject.sources.inventory.status, "invalid");

  const inputSafetyTamper = operationalSources([], [workLog("work-safety")]);
  inputSafetyTamper.proposal_saved = true as false;
  const invalidInputSafety = createSnapshot(
    inputSafetyTamper,
    "snapshot-input-safety",
  );
  assert.equal(invalidInputSafety.status, "unavailable");

  const unknownRecordField = operationalSources(
    [{ ...inventoryRecord("inventory-unknown-field"), unexpected: true }],
    [workLog("work-unknown-field")],
  );
  const invalidUnknownRecord = createSnapshot(
    unknownRecordField,
    "snapshot-unknown-record-field",
  );
  assert.equal(invalidUnknownRecord.sources.inventory.status, "invalid");

  const future = operationalSources([], [workLog("work-future")], {
    inventory: { generatedAt: "2026-07-15T00:00:00.000Z" },
  });
  const futureSnapshot = createSnapshot(future, "snapshot-future");
  assert.equal(futureSnapshot.status, "unavailable");
  assert.equal(futureSnapshot.sources.inventory.status, "invalid");
  assert.equal(futureSnapshot.sources.inventory.freshness, "unknown");

  const inventoryMany = Array.from({ length: 25 }, (_, index) =>
    inventoryRecord(`inventory-${String(index).padStart(2, "0")}`),
  );
  const workMany = Array.from({ length: 15 }, (_, index) =>
    workLog(`work-${String(index).padStart(2, "0")}`),
  );
  const limited = createSnapshot(
    operationalSources(inventoryMany, workMany),
    "snapshot-limits",
    memory({ cropCount: 25, noteCount: 15 }),
  );
  assert.equal(limited.sources.inventory.records.length, 20);
  assert.equal(limited.sources.work_log.records.length, 10);
  assert.equal(limited.sources.field.records.length, 0);
  assert.equal(limited.sources.crop_cycle.records.length, 20);
  assert.equal(limited.sources.hermes_note.records.length, 10);
  assert.equal(limited.sources.inventory.truncated, true);
  assert.equal(limited.sources.work_log.truncated, true);

  const missingIdInventory = [
    {
      name: "seed",
      baseType: null,
      currentQuantity: null,
      unit: null,
    },
  ];
  const missingIdSnapshot = createSnapshot(
    operationalSources(missingIdInventory, [workLog("work-id")]),
    "snapshot-missing-id",
  );
  assert.equal(missingIdSnapshot.sources.inventory.records[0].id, null);
  assert.equal(
    JSON.stringify(missingIdSnapshot).includes("unknown-001"),
    false,
  );

  const attentionInventory = Array.from({ length: 20 }, (_, index) => ({
    id: `attention-${index}`,
    name: "input",
    baseType: null,
    currentQuantity: null,
    unit: null,
  }));
  const factSnapshot = createSnapshot(
    operationalSources(attentionInventory, [
      workLog("work-invalid", "not-a-time"),
      workLog("work-missing", null),
    ]),
    "snapshot-facts",
  );
  const built = buildHermesDailyFarmBrief({
    snapshot: factSnapshot,
    generatedAt: NOW,
    briefIdFactory: () => "brief-production",
    factIdFactory: (index) => `fact-${String(index).padStart(3, "0")}`,
  });
  assert.equal(built.brief.facts.length, 10);
  assert.ok(
    built.brief.facts.every(
      (fact) => fact.provenance.snapshot_id === factSnapshot.snapshot_id,
    ),
  );
  assert.ok(
    built.brief.facts
      .filter((fact) => fact.source_type === "inventory")
      .every((fact) => fact.source_record_id !== "unknown-001"),
  );
  assert.ok(parseHermesDailyFarmBrief(built.brief));
  assert.ok(parseHermesDailyFarmBriefFact(built.brief.facts[0]));

  const deterministic = buildHermesDailyFarmBrief({
    snapshot: factSnapshot,
    generatedAt: NOW,
    briefIdFactory: () => "brief-production",
    factIdFactory: (index) => `fact-${String(index).padStart(3, "0")}`,
  });
  assert.deepEqual(deterministic, built);

  const severityTamper = structuredClone(built.brief.facts[0]);
  severityTamper.severity = severityTamper.severity === "warning" ? "info" : "warning";
  assert.equal(parseHermesDailyFarmBriefFact(severityTamper), null);

  const inventoryFact = built.brief.facts.find(
    (fact) => fact.fact_code === "inventory_quantity_unknown",
  );
  assert.ok(inventoryFact);
  const categoryTamper = structuredClone(inventoryFact);
  categoryTamper.category = "source_state";
  assert.equal(parseHermesDailyFarmBriefFact(categoryTamper), null);

  const sourceTamper = structuredClone(inventoryFact);
  sourceTamper.source_type = "work_log";
  sourceTamper.provenance.source_type = "work_log";
  assert.equal(parseHermesDailyFarmBriefFact(sourceTamper), null);

  const duplicateFacts = structuredClone(built.brief);
  duplicateFacts.facts[1].fact_id = duplicateFacts.facts[0].fact_id;
  assert.equal(parseHermesDailyFarmBrief(duplicateFacts), null);

  const statusTamper = structuredClone(built.brief);
  statusTamper.status = statusTamper.status === "ready" ? "partial" : "ready";
  assert.equal(parseHermesDailyFarmBrief(statusTamper), null);

  const orderTamper = structuredClone(built.brief);
  orderTamper.facts = [...orderTamper.facts].reverse();
  assert.equal(parseHermesDailyFarmBrief(orderTamper), null);

  const unknownFieldTamper = structuredClone(built.brief.facts[0]) as Record<
    string,
    unknown
  >;
  unknownFieldTamper.unknown = true;
  assert.equal(parseHermesDailyFarmBriefFact(unknownFieldTamper), null);

  const snapshotSafetyTamper = structuredClone(factSnapshot);
  snapshotSafetyTamper.safety.database_write_performed = true as false;
  assert.equal(parseHermesDailyFarmSnapshot(snapshotSafetyTamper), null);

  const snapshotStatusTamper = structuredClone(ready);
  snapshotStatusTamper.sources.work_log.status = "empty";
  assert.equal(parseHermesDailyFarmSnapshot(snapshotStatusTamper), null);

  const snapshotFreshnessTamper = structuredClone(ready);
  snapshotFreshnessTamper.sources.work_log.freshness = "stale";
  assert.equal(parseHermesDailyFarmSnapshot(snapshotFreshnessTamper), null);

  const briefSafetyTamper = structuredClone(built.brief);
  briefSafetyTamper.safety.model_execution_performed = true as false;
  assert.equal(parseHermesDailyFarmBrief(briefSafetyTamper), null);

  const day90 = createHermesDailyFarmBrief({
    briefDate: "2026-07-14",
    context: {
      result: "ok",
      boundary: {
        mode: "hermes_memory_context_read_boundary",
        db_user: "test",
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
        proposal_context: {} as never,
        latest_hermes_notes: [],
        safe_app_context: {
          crop_cycles_summary: [],
          visible_domain_scope: ["crop_cycles"],
        },
        memory_policy: { read_only: true },
        redaction_policy: { restricted_fields_exposed: false },
        restricted_domain_data_exposed: false,
      },
    } as never,
    inventorySourceAvailable: false,
    workLogSourceAvailable: false,
    fieldTableAvailable: false,
  });
  assert.equal(day90.boundary, "day90_hermes_daily_farm_brief_boundary");
  assert.equal(day90.database_write_performed, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_daily_farm_brief_boundary",
        statuses: {
          ready: ready.status,
          partial: partial.status,
          unavailable: unavailable?.status,
        },
        source_limits: HERMES_DAILY_FARM_BRIEF_POLICY.source_record_limits,
        maximum_facts: HERMES_DAILY_FARM_BRIEF_POLICY.maximum_facts,
        freshness_boundaries: { hours_24: "ok", days_7: "ok" },
        records_null_fail_closed: true,
        missing_id_fabricated: false,
        parser_tamper_rejected: true,
        deterministic: true,
        day90_regression: "ok",
        external_fetch_performed: false,
        redis_connected: false,
        database_write_performed: false,
        proposal_write_performed: false,
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
