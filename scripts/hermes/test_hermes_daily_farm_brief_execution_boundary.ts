import assert from "node:assert/strict";
import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  buildHermesDailyFarmBriefExecutionRoleProjection,
  buildHermesDailyFarmBriefExecutionScopeIndex,
  createHermesDailyFarmBriefExecutionRequest,
  executeHermesDailyFarmBriefGeneration,
  type HermesDailyFarmBriefExecutionDependencies,
} from "./brief_runtime/hermes_daily_farm_brief_execution_adapter";
import {
  HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY,
  parseHermesDailyFarmBriefExecutionRequest,
  parseHermesDailyFarmBriefExecutionResult,
  parseHermesDailyFarmBriefLatestCandidate,
  type HermesDailyFarmBriefExecutionRequest,
} from "./brief_runtime/hermes_daily_farm_brief_execution_contract";
import { readHermesDailyFarmBriefLatestCandidate } from "./brief_runtime/hermes_daily_farm_brief_latest_read_boundary";
import {
  integrateHermesDailyFarmBriefExecutionBundle,
  parseHermesDailyFarmBriefRealDataIntegrationResult,
} from "./brief_runtime/hermes_daily_farm_brief_integration";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import type { HermesDailyFarmBriefExistingState, HermesDailyFarmBriefGenerationDecision } from "./brief_runtime/hermes_daily_farm_brief_generation_contract";
import { createHermesDailyFarmBriefGenerationRequest, evaluateHermesDailyFarmBriefScheduledTrigger, orchestrateHermesDailyFarmBriefGeneration } from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";

const REQUESTED_AT = "2026-07-14T08:00:00.000Z";
const EXECUTION_REQUESTED_AT = "2026-07-14T08:30:00.000Z";
const GENERATED_AT = "2026-07-14T09:00:00.000Z";
const EXECUTED_AT = "2026-07-14T09:01:00.000Z";

function source<T>(type: "inventory" | "work_log", records: T[]) {
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

function operationalFixture(): HermesOperationalReadonlyClientResult {
  const logs = [
    { id: "work-sensitive-1", startedAt: "2026-07-14T07:00:00.000Z", fieldId: "field-sensitive-1", workTypeId: null, workTypeName: "private work body", durationMinutes: 30, targetCrop: "cabbage", cropCycleId: "cycle-sensitive-1", machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "work-sensitive-2", startedAt: "2026-07-14T07:10:00.000Z", fieldId: "field-sensitive-2", workTypeId: null, workTypeName: "private work body", durationMinutes: 20, targetCrop: "cabbage", cropCycleId: "cycle-missing-sensitive", machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
    { id: "work-sensitive-3", startedAt: "2026-07-14T07:20:00.000Z", fieldId: null, workTypeId: null, workTypeName: "private work body", durationMinutes: 10, targetCrop: null, cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null },
  ];
  return {
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
}

function memoryFixture() {
  return {
    result: "ok",
    boundary: { mode: "hermes_memory_context_read_boundary", db_user: "fixture-reader", transaction_read_only: true, writes_performed: false, commands_executed: false, hermes_runtime_executed: false, llm_runtime_executed: false, embeddings_executed: false, vector_search_executed: false, app_schema_write_allowed: false, ai_proposal_write_allowed: false, audit_apply_event_write_allowed: false },
    context: {
      scope: "hermes_memory_context_minimum",
      runtime: { hermes_runtime_executed: false, llm_runtime_executed: false, embeddings_executed: false, vector_search_executed: false },
      proposal_context: {},
      latest_hermes_notes: [],
      safe_app_context: { crop_cycles_summary: [{ id: "cycle-sensitive-1", crop: "cabbage", field_id: "field-sensitive-1", status: "active" }], visible_domain_scope: ["crop_cycles_minimum_summary"] },
      memory_policy: { read_only: true },
      redaction_policy: { restricted_fields_exposed: false },
      restricted_domain_data_exposed: false,
    },
  };
}

async function integrationFixture(now = GENERATED_AT, readerCounts?: { operational: number; memory: number }) {
  return integrateHermesDailyFarmBriefExecutionBundle({
    readOperationalSources: async () => { if (readerCounts) readerCounts.operational += 1; return operationalFixture(); },
    readMemoryContext: async () => { if (readerCounts) readerCounts.memory += 1; return memoryFixture(); },
    now: () => now,
    timezone: "Asia/Tokyo",
    snapshotIdFactory: () => "snapshot-day110",
    briefIdFactory: () => "brief-day110",
    factIdFactory: (index) => `fact-day110-${index}`,
  });
}

function existingState(status: "completed" | "failed" | "in_progress", businessDate = "2026-07-14"): HermesDailyFarmBriefExistingState {
  const completed = status === "completed";
  return {
    schema_version: "hermes.daily_farm_brief.existing_state.v1",
    business_date: businessDate,
    brief_id: completed ? "brief-existing" : null,
    generated_at: completed ? (businessDate === "2026-07-14" ? "2026-07-14T07:00:00.000Z" : "2026-07-13T07:00:00.000Z") : null,
    brief_status: completed ? "ready" : null,
    source_freshness: completed ? [
      { source_type: "inventory", freshness: "fresh" },
      { source_type: "work_log", freshness: "fresh" },
      { source_type: "field", freshness: "unknown" },
      { source_type: "crop_cycle", freshness: "unknown" },
      { source_type: "hermes_note", freshness: "unknown" },
    ] : null,
    generation_status: status,
    generation_request_id: "request-existing",
    generation_retry_count: status === "failed" ? 1 : 0,
  };
}

function generationDecision(kind: "generate" | "reuse" | "reject" | "wait" | "fail_closed" = "generate"): HermesDailyFarmBriefGenerationDecision {
  const scheduled = kind === "reuse" || kind === "fail_closed";
  const requestCreation = {
    triggerType: scheduled ? ("scheduled" as const) : ("manual" as const),
    requestedAt: scheduled ? "2026-07-13T20:10:00.000Z" : REQUESTED_AT,
    actorRole: scheduled ? ("system" as const) : ("administrator" as const),
    authorizationVerified: true,
    serverForceRegenerationAllowed: false,
    requestIdFactory: () => `generation-${kind}`,
  };
  const schedule = scheduled && kind !== "fail_closed" ? evaluateHermesDailyFarmBriefScheduledTrigger({ requestedAt: requestCreation.requestedAt, serverSchedule: { scheduled_local_time: "05:00", allowed_lateness_minutes: 30 } }) : undefined;
  const state = kind === "reuse" || kind === "reject" ? existingState("completed") : kind === "wait" ? existingState("in_progress") : null;
  const decision = orchestrateHermesDailyFarmBriefGeneration({ requestCreation, existingState: state, scheduleEvaluation: schedule });
  assert(decision);
  return decision;
}

function executionRequest(decision: HermesDailyFarmBriefGenerationDecision, role: "administrator" | "general_staff" = "administrator", allowedScopeKeys: string[] = [], order?: string[]): HermesDailyFarmBriefExecutionRequest {
  const request = createHermesDailyFarmBriefExecutionRequest({ generationDecision: decision, roleProjectionTarget: role, allowedScopeKeys, clock: () => { order?.push("request_clock"); return EXECUTION_REQUESTED_AT; }, executionIdFactory: () => `execution-${role}` });
  assert(request);
  return request;
}

type Counts = { integration: number; scope: number; projection: number; clock: number };

function dependencies(input: { integration: unknown | (() => Promise<unknown>); scopeThrow?: boolean; projectionThrow?: boolean; executedAt?: string; order?: string[] }) {
  const counts: Counts = { integration: 0, scope: 0, projection: 0, clock: 0 };
  const observed: { scopeIndex: ReturnType<typeof buildHermesDailyFarmBriefExecutionScopeIndex> | null } = { scopeIndex: null };
  return {
    counts,
    observed,
    dependencies: {
      integrate: async () => {
        counts.integration += 1;
        input.order?.push("integration");
        return typeof input.integration === "function" ? input.integration() : structuredClone(input.integration);
      },
      buildScopeIndex: (value) => {
        counts.scope += 1;
        input.order?.push("scope");
        if (input.scopeThrow) throw new Error("private scope failure");
        const scopeIndex = buildHermesDailyFarmBriefExecutionScopeIndex(value);
        observed.scopeIndex = scopeIndex;
        return scopeIndex;
      },
      buildRoleProjection: (value) => {
        counts.projection += 1;
        input.order?.push("projection");
        if (input.projectionThrow) throw new Error("private projection failure");
        return buildHermesDailyFarmBriefExecutionRoleProjection(value);
      },
      clock: () => {
        counts.clock += 1;
        input.order?.push("completion_clock");
        return input.executedAt ?? EXECUTED_AT;
      },
    },
  };
}

async function main(): Promise<void> {
  const canonicalIntegration = await integrationFixture();
  const generate = generationDecision();
  const order: string[] = [];
  const adminRequest = executionRequest(generate, "administrator", [], order);
  assert(parseHermesDailyFarmBriefExecutionRequest(adminRequest));

  const readerCounts = { operational: 0, memory: 0 };
  const adminDeps = dependencies({ integration: async () => integrationFixture(GENERATED_AT, readerCounts), order });
  const admin = await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: adminDeps.dependencies });
  assert(admin);
  assert.equal(admin.status, "completed");
  assert.equal(admin.role, "administrator");
  assert.equal(admin.snapshot_generated, true);
  assert.equal(admin.brief_generated, true);
  assert.equal(admin.scope_index_generated, true);
  assert.equal(admin.role_projection_generated, true);
  assert.deepEqual(adminDeps.counts, { integration: 1, scope: 1, projection: 1, clock: 1 });
  assert.deepEqual(readerCounts, { operational: 1, memory: 1 });
  assert.deepEqual(order, ["request_clock", "integration", "scope", "projection", "completion_clock"]);
  assert(parseHermesDailyFarmBriefExecutionResult(admin));

  const publicIntegration = canonicalIntegration.integration_result;
  assert(parseHermesDailyFarmBriefRealDataIntegrationResult(publicIntegration));
  assert.deepEqual(Object.keys(canonicalIntegration).sort(), ["integration_result", "scope_reference_input"]);
  assert.equal(Object.hasOwn(publicIntegration, "scope_reference_input"), false);
  assert.equal(parseHermesDailyFarmBriefRealDataIntegrationResult({ ...publicIntegration, scope_reference_input: canonicalIntegration.scope_reference_input }), null);
  assert.doesNotMatch(JSON.stringify(publicIntegration), /cycle-missing-sensitive/iu);
  assert.match(JSON.stringify(canonicalIntegration.scope_reference_input), /work-sensitive-1|field-sensitive-1|cycle-sensitive-1/iu);

  const directDay108Index = buildHermesDailyFarmBriefScopeIndex({ snapshot: publicIntegration.snapshot, brief: publicIntegration.brief, generatedAt: publicIntegration.brief.generated_at, timezone: "Asia/Tokyo", workLogs: canonicalIntegration.scope_reference_input.workLogs, cropCycles: canonicalIntegration.scope_reference_input.cropCycles });
  assert.deepEqual(adminDeps.observed.scopeIndex, directDay108Index);
  const matchedCycleScope = directDay108Index.scopes.find((scope) => scope.scope_type === "crop_cycle" && scope.work_log_count === 1 && scope.crop_cycle_count === 1);
  assert(matchedCycleScope);
  assert.equal(directDay108Index.summary.unresolved_crop_cycle_reference_count, 1);
  assert(directDay108Index.scopes.some((scope) => scope.scope_type === "field" && scope.display_label === "Field (redacted identifier)"));
  assert.doesNotMatch(JSON.stringify(directDay108Index), /unknown-001|synthetic|placeholder/iu);
  assert(directDay108Index.scopes.length > 0);
  const staffAllowed = [directDay108Index.scopes[0].scope_key];
  const staffDeps = dependencies({ integration: canonicalIntegration });
  const staff = await executeHermesDailyFarmBriefGeneration({ executionRequest: executionRequest(generate, "general_staff", staffAllowed), dependencies: staffDeps.dependencies });
  assert(staff);
  assert.equal(staff.status, "completed");
  assert.equal(staff.visible_scope_count, 1);
  const emptyStaffDeps = dependencies({ integration: canonicalIntegration });
  const emptyStaff = await executeHermesDailyFarmBriefGeneration({ executionRequest: executionRequest(generate, "general_staff", []), dependencies: emptyStaffDeps.dependencies });
  assert(emptyStaff);
  assert.equal(emptyStaff.visible_scope_count, 0);

  for (const kind of ["reuse", "reject", "wait", "fail_closed"] as const) {
    const skippedDeps = dependencies({ integration: canonicalIntegration });
    const skipped = await executeHermesDailyFarmBriefGeneration({ executionRequest: executionRequest(generationDecision(kind)), dependencies: skippedDeps.dependencies });
    assert(skipped);
    assert.equal(skipped.status, "skipped");
    assert.deepEqual(skippedDeps.counts, { integration: 0, scope: 0, projection: 0, clock: 1 });
  }

  const tamperedDecision = structuredClone(generate);
  tamperedDecision.should_execute_generation = false;
  const tamperedRequest = { ...adminRequest, generation_decision: tamperedDecision };
  const tamperedDeps = dependencies({ integration: canonicalIntegration });
  assert.equal(await executeHermesDailyFarmBriefGeneration({ executionRequest: tamperedRequest, dependencies: tamperedDeps.dependencies }), null);
  assert.deepEqual(tamperedDeps.counts, { integration: 0, scope: 0, projection: 0, clock: 0 });
  const reasonTamper = structuredClone(adminRequest);
  reasonTamper.generation_decision.reason_code = "same_day_completed_exists";
  assert.equal(parseHermesDailyFarmBriefExecutionRequest(reasonTamper), null);

  const thrownDeps = dependencies({ integration: async () => { throw new Error("private reader endpoint"); } });
  const thrown = await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: thrownDeps.dependencies });
  assert.equal(thrown?.failure_code, "integration_threw");
  assert.deepEqual(thrownDeps.counts, { integration: 1, scope: 0, projection: 0, clock: 1 });

  const shellInvalidDeps = dependencies({ integration: { ...canonicalIntegration, extra: true } });
  assert.equal((await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: shellInvalidDeps.dependencies }))?.failure_code, "integration_result_invalid");
  assert.deepEqual(shellInvalidDeps.counts, { integration: 1, scope: 0, projection: 0, clock: 1 });
  const snapshotInvalid = structuredClone(canonicalIntegration);
  snapshotInvalid.integration_result.snapshot.safety.database_write_performed = true as false;
  const snapshotDeps = dependencies({ integration: snapshotInvalid });
  assert.equal((await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: snapshotDeps.dependencies }))?.failure_code, "snapshot_invalid");
  const briefInvalid = structuredClone(canonicalIntegration);
  briefInvalid.integration_result.brief.safety.database_write_performed = true as false;
  const briefDeps = dependencies({ integration: briefInvalid });
  const briefFailure = await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: briefDeps.dependencies });
  assert.equal(briefFailure?.failure_code, "brief_invalid");
  assert.equal(briefFailure?.snapshot_generated, true);
  assert.equal(briefFailure?.brief_generated, false);

  const scopeDeps = dependencies({ integration: canonicalIntegration, scopeThrow: true });
  assert.equal((await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: scopeDeps.dependencies }))?.failure_code, "scope_index_invalid");
  assert.deepEqual(scopeDeps.counts, { integration: 1, scope: 1, projection: 0, clock: 1 });
  const projectionDeps = dependencies({ integration: canonicalIntegration, projectionThrow: true });
  assert.equal((await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: projectionDeps.dependencies }))?.failure_code, "role_projection_invalid");
  assert.deepEqual(projectionDeps.counts, { integration: 1, scope: 1, projection: 1, clock: 1 });

  const futureIntegration = await integrationFixture("2026-07-14T09:02:00.000Z");
  const futureDeps = dependencies({ integration: futureIntegration });
  assert.equal((await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: futureDeps.dependencies }))?.failure_code, "timestamp_invalid");

  assert.equal(parseHermesDailyFarmBriefExecutionResult({ ...admin, unknown: true }), null);
  assert.equal(parseHermesDailyFarmBriefExecutionResult({ ...admin, scope_index_generated: false }), null);
  assert.equal(parseHermesDailyFarmBriefExecutionResult({ ...admin, safety: { ...HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY, database_write_performed: true } }), null);
  assert.equal(parseHermesDailyFarmBriefExecutionResult({ ...admin, latest_candidate: { ...admin.latest_candidate!, generated_at: "2026-07-14T09:02:00.000Z" } }), null);

  const current = readHermesDailyFarmBriefLatestCandidate({ executionResult: admin, existingState: existingState("completed", "2026-07-13"), now: EXECUTED_AT, role: "administrator" });
  assert(current);
  assert.equal(current.display_state, "current");
  assert.equal(current.business_date, "2026-07-14");
  const previous = readHermesDailyFarmBriefLatestCandidate({ executionResult: null, existingState: existingState("completed", "2026-07-13"), now: EXECUTED_AT, role: "administrator" });
  assert(previous);
  assert.equal(previous.display_state, "stale");
  assert.ok(previous.stale_reason_codes.includes("previous_business_date"));
  const sameDayExisting = readHermesDailyFarmBriefLatestCandidate({ executionResult: null, existingState: existingState("completed"), now: EXECUTED_AT, role: "administrator" });
  assert.equal(sameDayExisting?.display_state, "current");
  assert.equal(readHermesDailyFarmBriefLatestCandidate({ executionResult: null, existingState: existingState("in_progress"), now: EXECUTED_AT, role: "administrator" })?.display_state, "generation_in_progress");
  assert.equal(readHermesDailyFarmBriefLatestCandidate({ executionResult: null, existingState: existingState("failed"), now: EXECUTED_AT, role: "administrator" })?.display_state, "generation_failed");
  assert.equal(readHermesDailyFarmBriefLatestCandidate({ executionResult: null, existingState: null, now: EXECUTED_AT, role: "administrator" })?.display_state, "unavailable");
  assert(parseHermesDailyFarmBriefLatestCandidate(previous));

  const repeatDeps = dependencies({ integration: canonicalIntegration });
  const repeat = await executeHermesDailyFarmBriefGeneration({ executionRequest: adminRequest, dependencies: repeatDeps.dependencies });
  assert.deepEqual(repeat, admin);
  const latestSerialized = JSON.stringify(admin.latest_candidate);
  assert.doesNotMatch(latestSerialized, /work-sensitive|field-sensitive|cycle-sensitive|private work body|https?:\/\/|bearer|token|credential|db_user/iu);
  assert.doesNotMatch(JSON.stringify(admin), /work-sensitive|field-sensitive|cycle-sensitive|private work body/iu);
  assert.doesNotMatch(JSON.stringify(current), /work-sensitive|field-sensitive|cycle-sensitive|private work body/iu);
  assert.equal(admin.safety.database_write_performed, false);
  assert.equal(admin.safety.notification_performed, false);
  assert.equal(admin.safety.queue_operation_performed, false);
  assert.equal(admin.safety.worker_claim_performed, false);
  assert.equal(admin.safety.model_execution_performed, false);
  assert.equal(admin.safety.external_fetch_added, false);
  assert.equal(admin.safety.generation_decision_enforced, true);

  console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_execution", completed: true, administrator_projection: true, general_staff_projection: true, dependency_call_counts: adminDeps.counts, latest_priority: true, deterministic: true, external_fetch_added: false, database_write_performed: false }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "day110_test_failed");
  process.exitCode = 1;
});
