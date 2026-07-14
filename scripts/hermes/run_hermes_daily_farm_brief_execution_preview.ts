import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  buildHermesDailyFarmBriefExecutionRoleProjection,
  buildHermesDailyFarmBriefExecutionScopeIndex,
  createHermesDailyFarmBriefExecutionRequest,
  executeHermesDailyFarmBriefGeneration,
  type HermesDailyFarmBriefExecutionDependencies,
} from "./brief_runtime/hermes_daily_farm_brief_execution_adapter";
import { readHermesDailyFarmBriefLatestCandidate } from "./brief_runtime/hermes_daily_farm_brief_latest_read_boundary";
import { integrateHermesDailyFarmBriefExecutionBundle } from "./brief_runtime/hermes_daily_farm_brief_integration";
import type { HermesDailyFarmBriefExistingState, HermesDailyFarmBriefGenerationDecision } from "./brief_runtime/hermes_daily_farm_brief_generation_contract";
import { evaluateHermesDailyFarmBriefScheduledTrigger, orchestrateHermesDailyFarmBriefGeneration } from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";

const generatedAt = "2026-07-14T09:00:00.000Z";
const executedAt = "2026-07-14T09:01:00.000Z";

function operationalFixture(): HermesOperationalReadonlyClientResult {
  const source = (type: "inventory" | "work_log") => ({
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
    record_count: 0,
    records: [],
    has_more: false,
    error_code: null,
    write_performed: false as const,
    restricted_fields_exposed: false as const,
    credentials_exposed: false as const,
  });
  return { result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory"), work_log: source("work_log"), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false };
}

function memoryFixture() {
  return { result: "ok", boundary: { mode: "hermes_memory_context_read_boundary", db_user: "fixture", transaction_read_only: true, writes_performed: false, commands_executed: false, hermes_runtime_executed: false, llm_runtime_executed: false, embeddings_executed: false, vector_search_executed: false }, context: { scope: "hermes_memory_context_minimum", runtime: { hermes_runtime_executed: false, llm_runtime_executed: false, embeddings_executed: false, vector_search_executed: false }, latest_hermes_notes: [], safe_app_context: { crop_cycles_summary: [] }, restricted_domain_data_exposed: false } };
}

function existing(status: "completed" | "in_progress", date = "2026-07-14"): HermesDailyFarmBriefExistingState {
  const completed = status === "completed";
  return { schema_version: "hermes.daily_farm_brief.existing_state.v1", business_date: date, brief_id: completed ? "preview-existing" : null, generated_at: completed ? "2026-07-13T07:00:00.000Z" : null, brief_status: completed ? "ready" : null, source_freshness: completed ? [{ source_type: "inventory", freshness: "fresh" }, { source_type: "work_log", freshness: "fresh" }, { source_type: "field", freshness: "unknown" }, { source_type: "crop_cycle", freshness: "unknown" }, { source_type: "hermes_note", freshness: "unknown" }] : null, generation_status: status, generation_request_id: "preview-generation", generation_retry_count: 0 };
}

function decision(kind: "generate" | "reuse" | "wait"): HermesDailyFarmBriefGenerationDecision {
  const scheduled = kind !== "generate";
  const requestedAt = scheduled ? "2026-07-13T20:10:00.000Z" : "2026-07-14T08:00:00.000Z";
  const value = orchestrateHermesDailyFarmBriefGeneration({
    requestCreation: { triggerType: scheduled ? "scheduled" : "manual", requestedAt, actorRole: scheduled ? "system" : "administrator", authorizationVerified: true, serverForceRegenerationAllowed: false, requestIdFactory: () => `preview-${kind}` },
    existingState: kind === "reuse" ? existing("completed") : kind === "wait" ? existing("in_progress") : null,
    scheduleEvaluation: scheduled ? evaluateHermesDailyFarmBriefScheduledTrigger({ requestedAt, serverSchedule: { scheduled_local_time: "05:00", allowed_lateness_minutes: 30 } }) : undefined,
  });
  if (!value) throw new Error("preview_decision_invalid");
  return value;
}

function dependencies(integrate: () => Promise<unknown>) {
  const calls = { integration: 0, scope: 0, projection: 0 };
  const value: HermesDailyFarmBriefExecutionDependencies = {
    integrate: async () => { calls.integration += 1; return integrate(); },
    buildScopeIndex: (input) => { calls.scope += 1; return buildHermesDailyFarmBriefExecutionScopeIndex(input); },
    buildRoleProjection: (input) => { calls.projection += 1; return buildHermesDailyFarmBriefExecutionRoleProjection(input); },
    clock: () => executedAt,
  };
  return { value, calls };
}

async function runCase(input: { name: string; generationDecision: HermesDailyFarmBriefGenerationDecision; role?: "administrator" | "general_staff"; fail?: boolean }) {
  const request = createHermesDailyFarmBriefExecutionRequest({ generationDecision: input.generationDecision, roleProjectionTarget: input.role ?? "administrator", allowedScopeKeys: [], clock: () => "2026-07-14T08:30:00.000Z", executionIdFactory: () => `preview-execution-${input.name}` });
  if (!request) throw new Error("preview_request_invalid");
  const deps = dependencies(input.fail ? async () => { throw new Error("fixture_failure"); } : async () => integrateHermesDailyFarmBriefExecutionBundle({ readOperationalSources: async () => operationalFixture(), readMemoryContext: async () => memoryFixture(), now: () => generatedAt, timezone: "Asia/Tokyo", snapshotIdFactory: () => "preview-snapshot", briefIdFactory: () => "preview-brief", factIdFactory: (index) => `preview-fact-${index}` }));
  const result = await executeHermesDailyFarmBriefGeneration({ executionRequest: request, dependencies: deps.value });
  if (!result) throw new Error("preview_execution_invalid");
  return { case: input.name, execution_status: result.status, decision: result.generation_decision.decision, business_date: result.business_date, brief_status: result.brief_status, visible_scope_count: result.visible_scope_count, latest_display_state: result.latest_candidate?.display_state ?? null, generated_flags: { snapshot: result.snapshot_generated, brief: result.brief_generated, scope_index: result.scope_index_generated, role_projection: result.role_projection_generated }, failure_code: result.failure_code, dependency_call_counts: deps.calls, safety: result.safety };
}

const stale = readHermesDailyFarmBriefLatestCandidate({ executionResult: null, existingState: existing("completed", "2026-07-13"), now: executedAt, role: "administrator" });
const cases = [
  await runCase({ name: "successful_administrator", generationDecision: decision("generate") }),
  await runCase({ name: "successful_general_staff_limited", generationDecision: decision("generate"), role: "general_staff" }),
  await runCase({ name: "reuse_existing_skipped", generationDecision: decision("reuse") }),
  await runCase({ name: "wait_in_progress_skipped", generationDecision: decision("wait") }),
  await runCase({ name: "integration_failure", generationDecision: decision("generate"), fail: true }),
  { case: "stale_latest_candidate", execution_status: "not_executed", decision: "not_applicable", business_date: stale?.business_date ?? null, brief_status: stale?.brief_status ?? null, visible_scope_count: stale?.visible_scope_count ?? 0, latest_display_state: stale?.display_state ?? null, generated_flags: { snapshot: false, brief: false, scope_index: false, role_projection: false }, failure_code: null, dependency_call_counts: { integration: 0, scope: 0, projection: 0 }, safety: { external_connection_performed: false, raw_records_output: false } },
];

console.log(JSON.stringify({ boundary: "hermes_daily_farm_brief_execution_preview", fixture_only: true, cases, raw_facts_output: false, raw_records_output: false, raw_identifiers_output: false, external_connection_performed: false }));
