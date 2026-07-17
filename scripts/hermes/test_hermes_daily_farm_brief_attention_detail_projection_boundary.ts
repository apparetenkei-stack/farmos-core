import assert from "node:assert/strict";

import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  parseHermesDailyFarmBriefAttentionDetail,
  parseHermesDailyFarmBriefAttentionDetails,
} from "./brief_runtime/hermes_daily_farm_brief_attention_detail_contract";
import {
  HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY,
  projectHermesDailyFarmBriefAttentionDetails,
} from "./brief_runtime/hermes_daily_farm_brief_attention_detail_projection";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import { buildHermesDailyFarmBriefRoleProjection } from "./brief_runtime/hermes_daily_farm_brief_role_projection";
import {
  buildHermesDailyFarmBriefScopeIndex,
  createHermesDailyFarmBriefScopeKey,
} from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const NOW = "2026-07-17T00:00:00.000Z";
const FIELD_A = "550e8400-e29b-41d4-a716-446655440010";
const FIELD_B = "550e8400-e29b-41d4-a716-446655440011";
const FIELD_WITHOUT_SNAPSHOT = "550e8400-e29b-41d4-a716-446655440012";

function source<T>(type: "inventory" | "work_log", records: T[]) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: NOW, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function fieldSource(records: Array<{ reference: string; display_name: string }>) {
  return { result: "ok" as const, source_type: "field" as const, endpoint_path: "/api/farmos-core/fields" as const, http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: "apparetenkei_fields_readonly" as const, generated_at: NOW, record_count: records.length, records: records.map((record) => ({ ...record, active_state: "unknown" as const, source_updated_at: null })), has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function emptyCropCycleSource() {
  return { result: "ok" as const, source_type: "crop_cycle" as const, endpoint_path: "/api/farmos-core/crop-cycles" as const, http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: "apparetenkei_crop_cycles_readonly" as const, generated_at: NOW, record_count: 0, records: [], has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function fixture() {
  const logs = [
    { id: "work-attention-a-missing", startedAt: null, fieldId: FIELD_A, workTypeId: null, workTypeName: "収穫", durationMinutes: null, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "work-attention-a-invalid", startedAt: "invalid-started-at", fieldId: FIELD_A, workTypeId: null, workTypeName: "収穫", durationMinutes: null, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "work-attention-b-one", startedAt: null, fieldId: FIELD_B, workTypeId: null, workTypeName: "防除", durationMinutes: null, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "work-attention-b-two", startedAt: null, fieldId: FIELD_B, workTypeId: null, workTypeName: "防除", durationMinutes: null, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "work-attention-no-field-snapshot", startedAt: null, fieldId: FIELD_WITHOUT_SNAPSHOT, workTypeId: null, workTypeName: null, durationMinutes: null, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
  ];
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client",
    inventory: source("inventory", []), work_log: source("work_log", logs), field: fieldSource([{ reference: FIELD_A, display_name: "共同圃場" }, { reference: FIELD_B, display_name: "共同圃場" }]), crop_cycle: emptyCropCycleSource(),
    inventory_source_connected: true, work_log_source_connected: true, field_source_connected: true, crop_cycle_source_connected: true,
    external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: NOW, snapshotIdFactory: () => "snapshot-attention-boundary" });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt: NOW, briefIdFactory: () => "brief-attention-boundary", factIdFactory: (index) => `fact-attention-${index}` }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: logs.map((record) => ({ id: record.id, field_id: record.fieldId, target_crop: null, crop_cycle_id: null })), cropCycles: [] });
  const administrator = buildHermesDailyFarmBriefRoleProjection({ scopeIndex, snapshot, role: "administrator", allowedScopeKeys: [] });
  const allowedScope = createHermesDailyFarmBriefScopeKey("field", FIELD_A);
  const staff = buildHermesDailyFarmBriefRoleProjection({ scopeIndex, snapshot, role: "general_staff", allowedScopeKeys: [allowedScope] });
  return { snapshot, administrator, staff, allowedScope };
}

function flattened(projection: NonNullable<ReturnType<typeof projectHermesDailyFarmBriefAttentionDetails>>) {
  return [...projection.details_by_scope.values()].flat();
}

async function main(): Promise<void> {
  const value = fixture();
  const administrator = projectHermesDailyFarmBriefAttentionDetails({ snapshot: value.snapshot, roleProjection: value.administrator });
  assert(administrator);
  const details = flattened(administrator);
  assert.equal(details.length, 4, "complete duplicate details must collapse");
  assert(details.some((detail) => detail.reason_code === "work_log_started_at_missing" && detail.reason === "作業開始日時が入力されていません。"));
  assert(details.some((detail) => detail.reason_code === "work_log_started_at_invalid" && detail.reason === "作業開始日時の形式を確認してください。"));
  assert(details.some((detail) => detail.field_label === "共同圃場" && detail.work_type_label === "収穫"));
  assert(details.some((detail) => detail.field_label === null && detail.work_type_label === null));
  assert(details.every((detail) => detail.work_date === null && detail.evidence_type === "work_log"));
  assert.equal(details.filter((detail) => detail.field_label === "共同圃場" && detail.reason_code === "work_log_started_at_missing").length, 2, "different work types must remain distinct");
  assert.equal(details.filter((detail) => detail.field_label === "共同圃場" && detail.work_type_label === "収穫").length, 2, "different reasons must remain distinct");

  const staff = projectHermesDailyFarmBriefAttentionDetails({ snapshot: value.snapshot, roleProjection: value.staff });
  assert(staff);
  assert.deepEqual([...staff.details_by_scope.keys()], [value.allowedScope]);
  assert.equal(flattened(staff).length, 2);
  assert.deepEqual(projectHermesDailyFarmBriefAttentionDetails({ snapshot: value.snapshot, roleProjection: value.administrator }), administrator, "ordering must be stable");

  const valid = details[0];
  assert(valid && parseHermesDailyFarmBriefAttentionDetail(valid));
  assert.equal(parseHermesDailyFarmBriefAttentionDetail({ ...valid, unknown: true }), null);
  const missing = { ...valid } as Record<string, unknown>; delete missing.reason;
  assert.equal(parseHermesDailyFarmBriefAttentionDetail(missing), null);
  assert.equal(parseHermesDailyFarmBriefAttentionDetails([valid, valid]), null);
  assert.equal(projectHermesDailyFarmBriefAttentionDetails({ snapshot: { ...value.snapshot, generated_at: "2026-07-17T00:00:00.001Z" }, roleProjection: value.administrator }), null);

  const serialized = JSON.stringify(details);
  for (const forbidden of [FIELD_A, FIELD_B, FIELD_WITHOUT_SNAPSHOT, value.allowedScope, "work-attention", "invalid-started-at", "snapshot-attention-boundary", "fact-attention"]) assert(!serialized.includes(forbidden));
  for (const key of ["id", "field_id", "scope_key", "source_record_reference", "started_at", "raw_timestamp", "url"]) assert(!Object.hasOwn(valid, key));
  assert.equal(HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY.database_write_performed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY.model_execution_performed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_ATTENTION_DETAIL_PROJECTION_SAFETY.retry_performed, false);
  console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_attention_detail_projection", detail_count: details.length, general_staff_detail_count: flattened(staff).length, database_write_performed: false, model_execution_performed: false, retry_performed: false }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
