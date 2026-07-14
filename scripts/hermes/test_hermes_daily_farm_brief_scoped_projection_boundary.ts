import assert from "node:assert/strict";
import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";
import {
  HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS,
  parseHermesDailyFarmBriefAllowedScopeKeys,
  parseHermesDailyFarmBriefRoleProjection,
  parseHermesDailyFarmBriefScopeIndex,
} from "./brief_runtime/hermes_daily_farm_brief_scope_contract";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { buildHermesDailyFarmBriefRoleProjection } from "./brief_runtime/hermes_daily_farm_brief_role_projection";

const NOW = "2026-07-14T09:00:00.000Z";

function source<T>(type: "inventory" | "work_log", records: T[]) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: "2026-07-14T08:00:00.000Z", record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function workLog(id: string, input: { crop?: string | null; field?: string | null; cycle?: string | null; startedAt?: string | null } = {}) {
  return { id, startedAt: input.startedAt === undefined ? "2026-07-14T06:00:00.000Z" : input.startedAt, fieldId: input.field === undefined ? "field-A-sensitive" : input.field, workTypeId: null, workTypeName: "harvest", durationMinutes: 30, targetCrop: input.crop === undefined ? "cabbage" : input.crop, cropCycleId: input.cycle === undefined ? "cycle-A-sensitive" : input.cycle, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null };
}

function fixture() {
  const logs = [
    workLog("work-A-sensitive", { startedAt: null }),
    workLog("work-B-sensitive", { crop: "キャベツ", field: "field-B-sensitive", cycle: "missing-cycle-sensitive" }),
    workLog("work-C-sensitive", { crop: null, field: null, cycle: null }),
  ];
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory", []), work_log: source("work_log", logs), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [{ id: "cycle-A-sensitive", crop: "cabbage", field_id: "field-A-sensitive", status: "active" }, { id: "cycle-B-sensitive", crop: "キャベツ", field_id: null, status: "active" }], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: NOW, snapshotIdFactory: () => "snapshot-day108" });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt: NOW, briefIdFactory: () => "brief-day108", factIdFactory: (index) => `fact-day108-${index}` }).brief;
  const workLogs = logs.map((record) => ({ id: record.id, field_id: record.fieldId, target_crop: record.targetCrop, crop_cycle_id: record.cropCycleId }));
  const cropCycles = [{ id: "cycle-A-sensitive", crop: "cabbage", field_id: "field-A-sensitive" }, { id: "cycle-B-sensitive", crop: "キャベツ", field_id: null }];
  const index = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs, cropCycles });
  return { snapshot, brief, workLogs, cropCycles, index };
}

function clone<T>(value: T): T { return structuredClone(value); }

async function main(): Promise<void> {
  const value = fixture();
  assert.equal(value.index.schema_version, "hermes.daily_farm_brief.scope_index.v1");
  assert.equal(value.index.summary.crop_scope_count, 2, "crop spelling variants must remain separate");
  assert.equal(value.index.summary.field_scope_count, 2);
  assert.equal(value.index.summary.crop_cycle_scope_count, 2, "only existing explicit crop-cycle ids create scopes");
  assert.equal(value.index.summary.unresolved_crop_cycle_reference_count, 1);
  assert.equal(value.index.summary.unscoped_work_log_count, 1);
  assert.equal(value.index.summary.unscoped_crop_cycle_count, 1);
  assert.equal(value.index.scopes.some((scope) => scope.scope_key.includes("unknown") || scope.scope_key.includes("001")), false);
  assert.equal(value.index.scopes.some((scope) => scope.scope_key.includes("field-A-sensitive") || scope.scope_key.includes("cycle-A-sensitive")), false);
  assert(value.index.scopes.filter((scope) => scope.scope_type === "field").every((scope) => scope.display_label === "Field (redacted identifier)" && scope.limitation_codes.includes("independent_field_source_unavailable")));
  const cycleScope = value.index.scopes.find((scope) => scope.scope_type === "crop_cycle" && scope.work_log_count === 1);
  assert(cycleScope, "matching Work Log.cropCycleId must associate by exact id");
  assert.equal(value.index.scopes.filter((scope) => scope.scope_type === "crop_cycle").some((scope) => scope.work_log_count > 0 && scope.crop_cycle_count === 0), false, "unresolved references must not invent a scope");
  assert(parseHermesDailyFarmBriefScopeIndex(value.index));

  const administrator = buildHermesDailyFarmBriefRoleProjection({ scopeIndex: value.index, snapshot: value.snapshot, role: "administrator", allowedScopeKeys: [] });
  assert.equal(administrator.visible_scope_count, value.index.scopes.length);
  assert.equal(administrator.summary.unresolved_crop_cycle_reference_count, 1);
  const allowed = [value.index.scopes[0].scope_key, value.index.scopes[2].scope_key, value.index.scopes[0].scope_key];
  const staff = buildHermesDailyFarmBriefRoleProjection({ scopeIndex: value.index, snapshot: value.snapshot, role: "general_staff", allowedScopeKeys: allowed });
  assert.equal(staff.visible_scope_count, 2);
  assert(staff.scopes.every((scope) => new Set(allowed).has(scope.scope_key)));
  assert.equal(staff.summary.unresolved_crop_cycle_reference_count, null);
  assert(staff.summary.source_status.every((source) => source.record_count === null));
  assert(parseHermesDailyFarmBriefRoleProjection(administrator));
  assert(parseHermesDailyFarmBriefRoleProjection(staff));
  for (const canonicalProjection of [administrator, staff]) {
    const duplicateInventoryStatus = clone(canonicalProjection);
    duplicateInventoryStatus.summary.source_status[1] = clone(
      duplicateInventoryStatus.summary.source_status[0],
    );
    assert.equal(
      parseHermesDailyFarmBriefRoleProjection(duplicateInventoryStatus),
      null,
    );

    const missingWorkLogStatus = clone(canonicalProjection);
    missingWorkLogStatus.summary.source_status[1] = clone(
      missingWorkLogStatus.summary.source_status[2],
    );
    assert.equal(
      parseHermesDailyFarmBriefRoleProjection(missingWorkLogStatus),
      null,
    );

    const reversedSourceStatus = clone(canonicalProjection);
    reversedSourceStatus.summary.source_status.reverse();
    assert.equal(
      parseHermesDailyFarmBriefRoleProjection(reversedSourceStatus),
      null,
    );
  }
  const emptyStaff = buildHermesDailyFarmBriefRoleProjection({ scopeIndex: value.index, snapshot: value.snapshot, role: "general_staff", allowedScopeKeys: [] });
  assert.equal(emptyStaff.visible_scope_count, 0);
  assert.equal(parseHermesDailyFarmBriefAllowedScopeKeys(["*"]), null);
  assert.equal(parseHermesDailyFarmBriefAllowedScopeKeys(Array.from({ length: HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.allowed_scope_keys + 1 }, (_, index) => `crop:${index.toString(16).padStart(24, "0")}`)), null);

  const roleTamper = clone(staff) as unknown as Record<string, unknown>; roleTamper.role = "administrator";
  assert.equal(parseHermesDailyFarmBriefRoleProjection(roleTamper), null);
  const safetyTamper = clone(staff); (safetyTamper.safety as { database_write_performed: boolean }).database_write_performed = true;
  assert.equal(parseHermesDailyFarmBriefRoleProjection(safetyTamper), null);
  const countTamper = clone(value.index); countTamper.summary.scope_count += 1;
  assert.equal(parseHermesDailyFarmBriefScopeIndex(countTamper), null);
  const rawBodyTamper = { ...clone(value.index), work_logs: [{ body: "raw work body" }] };
  assert.equal(parseHermesDailyFarmBriefScopeIndex(rawBodyTamper), null);
  const duplicate = clone(value.index); duplicate.scopes.push(clone(duplicate.scopes[0])); duplicate.summary.scope_count += 1; duplicate.summary.crop_scope_count += duplicate.scopes[0].scope_type === "crop" ? 1 : 0; duplicate.summary.field_scope_count += duplicate.scopes[0].scope_type === "field" ? 1 : 0; duplicate.summary.crop_cycle_scope_count += duplicate.scopes[0].scope_type === "crop_cycle" ? 1 : 0; duplicate.summary.warning_count += duplicate.scopes[0].warning_count; duplicate.summary.info_count += duplicate.scopes[0].info_count;
  assert.equal(parseHermesDailyFarmBriefScopeIndex(duplicate), null);
  const factLimit = clone(value.index); factLimit.scopes[0].warning_count = HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.facts_per_scope + 1; factLimit.summary.warning_count = factLimit.scopes.reduce((sum, scope) => sum + scope.warning_count, 0);
  assert.equal(parseHermesDailyFarmBriefScopeIndex(factLimit), null);

  const missingId = buildHermesDailyFarmBriefScopeIndex({ snapshot: value.snapshot, brief: value.brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: [{ id: null, field_id: null, target_crop: "lettuce", crop_cycle_id: null }], cropCycles: [] });
  assert.equal(missingId.scopes.length, 1);
  assert.equal(missingId.scopes[0].work_log_count, 1);
  assert.doesNotMatch(JSON.stringify(missingId), /unknown-001|synthetic|placeholder/iu);

  assert.equal(value.index.generated_at, value.brief.generated_at);
  assert.throws(
    () =>
      buildHermesDailyFarmBriefScopeIndex({
        snapshot: value.snapshot,
        brief: value.brief,
        generatedAt: "2026-07-14T09:00:00.001Z",
        timezone: "Asia/Tokyo",
        workLogs: value.workLogs,
        cropCycles: value.cropCycles,
      }),
    /daily_farm_brief_scope_input_invalid/u,
  );

  assert.throws(() => buildHermesDailyFarmBriefScopeIndex({ snapshot: value.snapshot, brief: value.brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: Array.from({ length: HERMES_DAILY_FARM_BRIEF_SCOPE_LIMITS.crop_scopes + 1 }, (_, index) => ({ id: `work-${index}`, field_id: null, target_crop: `crop-${index}`, crop_cycle_id: null })), cropCycles: [] }), /scope_limit_exceeded/u);
  const repeat = buildHermesDailyFarmBriefScopeIndex({ snapshot: value.snapshot, brief: value.brief, generatedAt: NOW, timezone: "Asia/Tokyo", workLogs: value.workLogs, cropCycles: value.cropCycles });
  assert.deepEqual(repeat, value.index, "fixed canonical inputs must be deterministic");
  assert.deepEqual(buildHermesDailyFarmBriefRoleProjection({ scopeIndex: repeat, snapshot: value.snapshot, role: "general_staff", allowedScopeKeys: allowed }), staff);

  const serialized = JSON.stringify({ administrator, staff });
  assert.doesNotMatch(serialized, /work-A-sensitive|field-A-sensitive|cycle-A-sensitive|raw work body|https?:\/\/|bearer\s|credential|db_user/iu);
  for (const flag of ["database_write_performed", "app_db_write_performed", "core_db_write_performed", "proposal_created", "proposal_saved", "proposal_apply_performed", "audit_write_performed", "notification_performed", "model_execution_performed"] as const) assert.equal(administrator.safety[flag], false);
  assert.equal(administrator.safety.client_role_override_allowed, false);
  assert.equal(administrator.safety.client_scope_override_allowed, false);
  assert.equal(administrator.safety.fail_closed, true);
  console.log(JSON.stringify({ result: "ok", checked: "hermes_daily_farm_brief_scoped_projection_boundary", scope_count: value.index.scopes.length, administrator_visible_scope_count: administrator.visible_scope_count, general_staff_visible_scope_count: staff.visible_scope_count, deterministic: true, safety: administrator.safety }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
