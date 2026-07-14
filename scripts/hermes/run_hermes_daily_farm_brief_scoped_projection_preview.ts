import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { buildHermesDailyFarmBriefRoleProjection } from "./brief_runtime/hermes_daily_farm_brief_role_projection";

const generatedAt = "2026-07-14T09:00:00.000Z";
const logs = [
  { id: "fixture-work-1", startedAt: null, fieldId: "fixture-field-1", workTypeId: null, workTypeName: "harvest", durationMinutes: 30, targetCrop: "cabbage", cropCycleId: "fixture-cycle-1", machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
  { id: "fixture-work-2", startedAt: generatedAt, fieldId: null, workTypeId: null, workTypeName: null, durationMinutes: null, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
];
function source<T>(type: "inventory" | "work_log", records: T[]) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: "2026-07-14T08:00:00.000Z", record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}
const operational: HermesOperationalReadonlyClientResult = { result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory", []), work_log: source("work_log", logs), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false };
const cropCycles = [{ id: "fixture-cycle-1", crop: "cabbage", field_id: "fixture-field-1" }];
const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: cropCycles, hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: generatedAt, snapshotIdFactory: () => "snapshot-scoped-preview" });
const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt, briefIdFactory: () => "brief-scoped-preview", factIdFactory: (index) => `fact-scoped-preview-${index}` }).brief;
const index = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt, timezone: "Asia/Tokyo", workLogs: logs.map((record) => ({ id: record.id, field_id: record.fieldId, target_crop: record.targetCrop, crop_cycle_id: record.cropCycleId })), cropCycles });
const projection = buildHermesDailyFarmBriefRoleProjection({ scopeIndex: index, snapshot, role: "administrator", allowedScopeKeys: [] });

console.log(JSON.stringify({
  result: "ok",
  role: projection.role,
  visible_scope_count: projection.visible_scope_count,
  scope_type_counts: { crop: projection.summary.crop_scope_count, field: projection.summary.field_scope_count, crop_cycle: projection.summary.crop_cycle_scope_count },
  warning_count: projection.summary.warning_count,
  info_count: projection.summary.info_count,
  limitation_count: projection.limitations.length,
  unresolved_unscoped_counts: { unscoped_work_log: projection.summary.unscoped_work_log_count, unscoped_crop_cycle: projection.summary.unscoped_crop_cycle_count, unresolved_field_reference: projection.summary.unresolved_field_reference_count, unresolved_crop_cycle_reference: projection.summary.unresolved_crop_cycle_reference_count },
  safety: projection.safety,
}, null, 2));
