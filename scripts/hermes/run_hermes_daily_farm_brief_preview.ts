import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const now = "2026-07-14T09:00:00.000Z";

function source<T>(type: "inventory" | "work_log", records: T[]) {
  return {
    result: "ok" as const,
    source_type: type,
    endpoint_path:
      type === "inventory"
        ? ("/api/farmos-core/inventory-summary" as const)
        : ("/api/farmos-core/recent-work-logs" as const),
    http_method: "GET" as const,
    fetch_performed: false,
    available: true,
    transaction_read_only: true as const,
    requested_limit: 100,
    http_status: 200,
    response_source:
      type === "inventory"
        ? ("apparetenkei_inventory_readonly" as const)
        : ("apparetenkei_work_logs_readonly" as const),
    generated_at: "2026-07-14T08:00:00.000Z",
    record_count: records.length,
    records,
    has_more: false,
    error_code: null,
    write_performed: false as const,
    restricted_fields_exposed: false as const,
    credentials_exposed: false as const,
  };
}

const logs = [
  {
    id: "work-preview-1",
    startedAt: "2026-07-14T06:00:00.000Z",
    fieldId: "field-1",
    workTypeId: null,
    workTypeName: "harvest",
    durationMinutes: 45,
    targetCrop: "cabbage",
    cropCycleId: "cycle-1",
    machineId: null,
    implementId: null,
    yieldAmount: null,
    yieldUnit: null,
    appliedMaterials: null,
  },
  {
    id: "work-preview-2",
    startedAt: null,
    fieldId: null,
    workTypeId: null,
    workTypeName: null,
    durationMinutes: null,
    targetCrop: null,
    cropCycleId: null,
    machineId: null,
    implementId: null,
    yieldAmount: null,
    yieldUnit: null,
    appliedMaterials: null,
  },
];

const operationalSources: HermesOperationalReadonlyClientResult = {
  result: "ok",
  checked: "hermes_operational_readonly_client",
  boundary: "day92_hermes_operational_readonly_client",
  inventory: source("inventory", []),
  work_log: source("work_log", logs),
  inventory_source_connected: true,
  work_log_source_connected: true,
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

const snapshot = createHermesDailyFarmSnapshot({
  operationalSources,
  memory: {
    crop_cycles: [{ id: "cycle-1", crop: "cabbage", status: "active" }],
    hermes_notes: [{ id: "note-1", content: "review irrigation" }],
    crop_cycle_generated_at: null,
    hermes_note_generated_at: null,
  },
  nowIso: now,
  snapshotIdFactory: () => "snapshot-preview",
});
const result = buildHermesDailyFarmBrief({
  snapshot,
  generatedAt: now,
  briefIdFactory: () => "brief-preview",
  factIdFactory: (index) => `fact-preview-${index}`,
});

console.log(
  JSON.stringify(
    {
      preview: "hermes_daily_farm_brief",
      snapshot_status: snapshot.status,
      inventory_status: snapshot.sources.inventory.status,
      inventory_record_count: snapshot.sources.inventory.record_count,
      work_log_status: snapshot.sources.work_log.status,
      work_log_record_count: snapshot.sources.work_log.record_count,
      field_status: snapshot.sources.field.status,
      crop_cycle_status: snapshot.sources.crop_cycle.status,
      crop_cycle_freshness: snapshot.sources.crop_cycle.freshness,
      hermes_note_status: snapshot.sources.hermes_note.status,
      hermes_note_freshness: snapshot.sources.hermes_note.freshness,
      safe_summary: result.summary,
      facts: result.brief.facts.map((fact) => ({
        severity: fact.severity,
        fact_code: fact.fact_code,
        source_type: fact.source_type,
        source_record_id: fact.source_record_id,
      })),
      limitations: result.brief.limitations,
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
