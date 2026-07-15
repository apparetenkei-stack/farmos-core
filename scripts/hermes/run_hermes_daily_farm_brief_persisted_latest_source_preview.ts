import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import {
  HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  type HermesDailyFarmBriefPersistedGenerationStateRecord,
  type HermesDailyFarmBriefPersistedProjectableRecord,
} from "./brief_runtime/hermes_daily_farm_brief_persisted_record_contract";
import {
  HermesDailyFarmBriefFixtureReadRepository,
  readHermesDailyFarmBriefPersistedLatestSource,
} from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const NOW = "2026-07-15T02:00:00.000Z";
const CURRENT_DATE = "2026-07-15";
const PREVIOUS_DATE = "2026-07-14";

function operationalSource<T>(type: "inventory" | "work_log", records: T[], generatedAt: string) {
  return {
    result: "ok" as const,
    source_type: type,
    endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const),
    http_method: "GET" as const,
    fetch_performed: false,
    available: true,
    transaction_read_only: true as const,
    requested_limit: 100,
    http_status: 200,
    response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const),
    generated_at: generatedAt,
    record_count: records.length,
    records,
    has_more: false,
    error_code: null,
    write_performed: false as const,
    restricted_fields_exposed: false as const,
    credentials_exposed: false as const,
  };
}

function projectableRecord(businessDate: string, generatedAt: string): HermesDailyFarmBriefPersistedProjectableRecord {
  const workLogs = [{ id: `preview-work-${businessDate}`, startedAt: generatedAt, fieldId: null, workTypeId: null, workTypeName: "preview", durationMinutes: 15, targetCrop: "cabbage", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null }];
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok",
    checked: "hermes_operational_readonly_client",
    boundary: "day92_hermes_operational_readonly_client",
    inventory: operationalSource("inventory", [], generatedAt),
    work_log: operationalSource("work_log", workLogs, generatedAt),
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
    operationalSources: operational,
    memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null },
    nowIso: generatedAt,
    snapshotIdFactory: () => `preview-snapshot-${businessDate}`,
  });
  const brief = buildHermesDailyFarmBrief({
    snapshot,
    generatedAt,
    briefIdFactory: () => `preview-brief-${businessDate}`,
    factIdFactory: (index) => `preview-fact-${businessDate}-${index}`,
  }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({
    snapshot,
    brief,
    generatedAt,
    timezone: "Asia/Tokyo",
    workLogs: workLogs.map((record) => ({ id: record.id, field_id: null, target_crop: record.targetCrop, crop_cycle_id: null })),
    cropCycles: [],
  });
  return {
    record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
    record_id: `preview-projectable-${businessDate}`,
    record_kind: "projectable_brief",
    business_date: businessDate,
    generated_at: generatedAt,
    snapshot,
    scope_index: scopeIndex,
    generation_status: "completed",
    record_status: "canonical",
    version: 1,
    created_at: generatedAt,
    updated_at: generatedAt,
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  };
}

function generationRecord(state: "in_progress" | "failed"): HermesDailyFarmBriefPersistedGenerationStateRecord {
  return {
    record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
    record_id: `preview-${state}`,
    record_kind: "generation_state",
    business_date: CURRENT_DATE,
    generation_state: state,
    retry_count: state === "failed" ? 1 : 0,
    record_status: "canonical",
    version: 1,
    created_at: "2026-07-15T00:30:00.000Z",
    updated_at: "2026-07-15T00:30:00.000Z",
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  };
}

async function select(records: unknown[]) {
  const repository = new HermesDailyFarmBriefFixtureReadRepository({
    schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1",
    status: "ok",
    transaction_read_only: true,
    records,
  });
  const selection = await readHermesDailyFarmBriefPersistedLatestSource({
    repository,
    requestedBusinessDate: CURRENT_DATE,
    now: NOW,
  });
  return { selection, repositoryReadCount: repository.readCount };
}

async function main(): Promise<void> {
  const cases = {
    current: await select([projectableRecord(CURRENT_DATE, "2026-07-15T01:00:00.000Z")]),
    stale: await select([projectableRecord(PREVIOUS_DATE, "2026-07-14T01:00:00.000Z")]),
    generation_in_progress: await select([generationRecord("in_progress")]),
    generation_failed: await select([generationRecord("failed")]),
    unavailable: await select([]),
    ambiguous_failure: await select([
      projectableRecord(CURRENT_DATE, "2026-07-15T01:00:00.000Z"),
      { ...projectableRecord(CURRENT_DATE, "2026-07-15T01:00:00.000Z"), record_id: "preview-projectable-second" },
    ]),
  };
  const safePreview = {
    preview: "hermes_daily_farm_brief_persisted_latest_source",
    states: Object.fromEntries(Object.entries(cases).map(([name, value]) => [name, {
      status: value.selection.status,
      source_kind: value.selection.source?.source_kind ?? null,
      business_date: value.selection.source?.business_date ?? null,
      generation_state: value.selection.source?.generation_state ?? null,
      error_code: value.selection.error_code,
    }])),
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
    repository_read_count: Object.fromEntries(Object.entries(cases).map(([name, value]) => [name, value.repositoryReadCount])),
    retry_count: 0,
  };
  console.log(JSON.stringify({
    ...safePreview,
    raw_identifier_exposed: /preview-projectable|preview-snapshot|preview-work|record_id/iu.test(JSON.stringify(safePreview)),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "day112_preview_failed");
  process.exitCode = 1;
});
