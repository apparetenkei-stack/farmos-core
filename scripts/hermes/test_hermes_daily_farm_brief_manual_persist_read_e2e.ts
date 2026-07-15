import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import {
  HermesDailyFarmBriefBusinessDateBoundedReadRepository,
  HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY,
  parseHermesDailyFarmBriefManualPersistReadE2EResult,
  runHermesDailyFarmBriefManualPersistReadE2E,
} from "./brief_runtime/hermes_daily_farm_brief_manual_persist_read_e2e";
import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  HermesDailyFarmBriefIsolatedPostgresReadRepository,
  HermesDailyFarmBriefIsolatedPostgresWriteRepository,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  createHermesDailyFarmBriefDockerPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { integrateHermesDailyFarmBriefExecutionBundle } from "./brief_runtime/hermes_daily_farm_brief_integration";
import { orchestrateHermesDailyFarmBriefGeneration } from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";
import {
  HermesDailyFarmBriefDenyByDefaultAuthenticationProvider,
  HermesDailyFarmBriefFixtureActorDirectory,
  HermesDailyFarmBriefFixtureAuthenticationProvider,
  classifyHermesDailyFarmBriefDatabaseTarget,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { createHermesDailyFarmBriefLatestServerDependencies } from "../../src/lib/hermes/hermes_daily_farm_brief_latest_server_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { parseHermesDailyFarmBriefLatestApiResponse } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { HermesDailyFarmBriefFixtureReadRepository } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";

const MAIN_DATE = "2026-07-13";
const ROLLBACK_DATE = "2026-07-12";
const PRINCIPAL = "day116-administrator";
const API_URL = "http://localhost/api/hermes/daily-farm-brief/latest";

function executor() {
  const value = createHermesDailyFarmBriefDockerPostgresExecutor(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  assert(value);
  return value;
}

async function isolationEvidence() {
  const result = await executor().executeSingleConnection("select jsonb_build_object('database',current_database(),'address',coalesce(inet_server_addr()::text,'local_socket'))::text;");
  if (!result.ok) return null;
  const value = JSON.parse(result.output) as { database: string; address: string };
  return { schema_version: "hermes.daily_farm_brief.day116_isolation_evidence.v1", database_target: value.database, local_docker_container: true, local_socket: value.address === "local_socket", production_candidate: classifyHermesDailyFarmBriefDatabaseTarget(value.database) === "production_candidate" };
}

function source<T>(type: "inventory" | "work_log", records: T[], generatedAt: string) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: generatedAt, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function operationalFixture(generatedAt: string, suffix: string): HermesOperationalReadonlyClientResult {
  const logs = [{ id: `day116-work-${suffix}`, startedAt: generatedAt, fieldId: `day116-field-${suffix}`, workTypeId: null, workTypeName: "manual fixture work", durationMinutes: 30, targetCrop: "cabbage", cropCycleId: `day116-cycle-${suffix}`, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null }];
  return { result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: source("inventory", [], generatedAt), work_log: source("work_log", logs, generatedAt), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false };
}

function memoryFixture(suffix: string) {
  return { result: "ok", boundary: { mode: "hermes_memory_context_read_boundary", db_user: "fixture-reader", transaction_read_only: true, writes_performed: false, commands_executed: false, hermes_runtime_executed: false, llm_runtime_executed: false, embeddings_executed: false, vector_search_executed: false, app_schema_write_allowed: false, ai_proposal_write_allowed: false, audit_apply_event_write_allowed: false }, context: { scope: "hermes_memory_context_minimum", runtime: { hermes_runtime_executed: false, llm_runtime_executed: false, embeddings_executed: false, vector_search_executed: false }, proposal_context: {}, latest_hermes_notes: [], safe_app_context: { crop_cycles_summary: [{ id: `day116-cycle-${suffix}`, crop: "cabbage", field_id: `day116-field-${suffix}`, status: "active" }], visible_domain_scope: ["crop_cycles_minimum_summary"] }, memory_policy: { read_only: true }, redaction_policy: { restricted_fields_exposed: false }, restricted_domain_data_exposed: false } };
}

function integration(generatedAt: string, suffix: string) {
  return integrateHermesDailyFarmBriefExecutionBundle({ readOperationalSources: async () => operationalFixture(generatedAt, suffix), readMemoryContext: async () => memoryFixture(suffix), now: () => generatedAt, timezone: "Asia/Tokyo", snapshotIdFactory: () => `day116-snapshot-${suffix}`, briefIdFactory: () => `day116-brief-${suffix}`, factIdFactory: (index) => `day116-fact-${suffix}-${index}` });
}

function actor(principal = PRINCIPAL, role: "administrator" | "general_staff" = "administrator") {
  return { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: principal, role, allowed_scope_keys: [], authorization_verified: true };
}
function authentication() { return { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status: "authenticated", principal_ref: PRINCIPAL }; }
function existingCompleted(businessDate: string, generatedAt: string) {
  return { schema_version: "hermes.daily_farm_brief.existing_state.v1", business_date: businessDate, brief_id: "day116-existing-brief", generated_at: generatedAt, brief_status: "ready", source_freshness: [{ source_type: "inventory", freshness: "fresh" }, { source_type: "work_log", freshness: "fresh" }, { source_type: "field", freshness: "unknown" }, { source_type: "crop_cycle", freshness: "unknown" }, { source_type: "hermes_note", freshness: "unknown" }], generation_status: "completed", generation_request_id: "day116-existing-request", generation_retry_count: 0 };
}

function runInput(input: { suffix: string; requestedAt: string; executionRequestedAt: string; generatedAt: string; executedAt: string; persistenceAt: string; latestAt?: string; expected: number | null; force?: boolean; existing?: unknown; write?: HermesDailyFarmBriefIsolatedPostgresWriteRepository; date: string }) {
  const rawRead = new HermesDailyFarmBriefIsolatedPostgresReadRepository(executor());
  const boundedRead = new HermesDailyFarmBriefBusinessDateBoundedReadRepository(rawRead, input.date);
  return { boundedRead, input: { databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, verifyIsolation: isolationEvidence, requestedAt: input.requestedAt, forceRegeneration: input.force ?? false, existingState: input.existing ?? null, requestIdFactory: () => `day116-request-${input.suffix}`, executionRequestedAt: input.executionRequestedAt, executionIdFactory: () => `day116-execution-${input.suffix}`, executedAt: input.executedAt, integrate: () => integration(input.generatedAt, input.suffix), expectedCurrentVersion: input.expected, persistenceRequestedAt: input.persistenceAt, persistenceClock: () => input.persistenceAt, latestClock: () => input.latestAt ?? input.persistenceAt, commandIdFactory: () => `day116-command-${input.suffix}`, recordIdFactory: (date: string) => `day116-daily-brief-${date}-projectable`, writeRepository: input.write ?? new HermesDailyFarmBriefIsolatedPostgresWriteRepository(executor()), readRepository: boundedRead, authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider(authentication()), actorDirectory: new HermesDailyFarmBriefFixtureActorDirectory({ [PRINCIPAL]: actor() }) } };
}

async function canonicalEvidence(date: string) {
  const result = await executor().executeSingleConnection(`select jsonb_build_object('canonical_count',count(*) filter (where record_status='canonical'),'version_count',count(*),'receipt_count',(select count(*) from ai.daily_farm_brief_persistence_commands where business_date='${date}'::date and command_type='persist_projectable_brief'))::text from ai.daily_farm_brief_records where business_date='${date}'::date and record_kind='projectable_brief';`);
  assert(result.ok);
  return JSON.parse(result.output) as { canonical_count: number; version_count: number; receipt_count: number };
}

async function negativeHttp(provider: HermesDailyFarmBriefDenyByDefaultAuthenticationProvider | HermesDailyFarmBriefFixtureAuthenticationProvider, directory: HermesDailyFarmBriefFixtureActorDirectory, request = new Request(API_URL)) {
  const read = new HermesDailyFarmBriefBusinessDateBoundedReadRepository(new HermesDailyFarmBriefIsolatedPostgresReadRepository(executor()), MAIN_DATE);
  const response = await serveHermesDailyFarmBriefLatestRead({ request, dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: provider, actorDirectory: directory, readRepository: read, clock: () => "2026-07-13T02:30:00.000Z" }) });
  return { response, body: await response.json(), reads: read.readCount };
}

export async function runDay116Scenario() {
  assert.deepEqual(classifyHermesDailyFarmBriefDay114DatabaseTarget(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE), { classification: "isolated_day114_test", allowed: true });
  for (const target of ["farmos_core_local", "farmos_core_restore_test", "postgres", "farmos_core_production"]) assert.equal(classifyHermesDailyFarmBriefDay114DatabaseTarget(target).allowed, false);
  assert.notEqual(classifyHermesDailyFarmBriefDatabaseTarget(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE), "production_candidate");
  assert(await isolationEvidence());
  const unauthorized = orchestrateHermesDailyFarmBriefGeneration({ requestCreation: { triggerType: "manual", requestedAt: "2026-07-12T16:00:00.000Z", actorRole: "general_staff", authorizationVerified: false, serverForceRegenerationAllowed: false, requestIdFactory: () => "day116-unauthorized" }, existingState: null });
  assert.equal(unauthorized?.decision, "reject_unauthorized");

  const firstFixture = runInput({ suffix: "main-v1", date: MAIN_DATE, requestedAt: "2026-07-12T16:00:00.000Z", executionRequestedAt: "2026-07-12T16:05:00.000Z", generatedAt: "2026-07-12T16:10:00.000Z", executedAt: "2026-07-12T16:11:00.000Z", persistenceAt: "2026-07-12T16:12:00.000Z", latestAt: "2026-07-12T18:00:00.000Z", expected: null });
  for (const target of ["farmos_core_local", "farmos_core_restore_test", "postgres", "farmos_core_production"]) {
    let probeCalls = 0;
    const rejected = await runHermesDailyFarmBriefManualPersistReadE2E({ ...firstFixture.input, databaseTarget: target, verifyIsolation: async () => { probeCalls += 1; return null; } });
    assert.equal(rejected.status, "rejected"); assert.equal(rejected.stage, "request"); assert.equal(probeCalls, 0); assert.equal(rejected.call_counts.persistence_transaction, 0); assert.equal(rejected.call_counts.repository_read, 0);
  }
  const first = await runHermesDailyFarmBriefManualPersistReadE2E(firstFixture.input);
  assert(parseHermesDailyFarmBriefManualPersistReadE2EResult(first));
  assert(["completed", "reused"].includes(first.status)); assert.equal(first.stage, "completed"); assert.equal(first.generation_decision, "generate"); assert.equal(first.execution_status, "completed"); assert.equal(first.http_status, 200); assert.equal(first.latest_display_state, "current"); assert.equal(first.latest_role, "administrator"); assert.deepEqual(first.call_counts, { integration: 1, scope: 1, projection: 1, persistence_transaction: 1, repository_read: 1 });
  const serialized = JSON.stringify(first); for (const forbidden of ["day116-daily-brief", "day116-execution-main-v1", "day116-snapshot-main-v1", "day116-field-main-v1", PRINCIPAL, HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE]) assert(!serialized.includes(forbidden));
  assert(!Object.hasOwn(first, "record_id")); assert(!Object.hasOwn(first, "snapshot")); assert(!Object.hasOwn(first, "scope_index")); assert(!Object.hasOwn(first, "principal_ref"));
  const afterFirst = await canonicalEvidence(MAIN_DATE); assert.equal(afterFirst.canonical_count, 1); assert([1, 2].includes(afterFirst.version_count));
  const replayFixture = runInput({ suffix: "main-v1", date: MAIN_DATE, requestedAt: "2026-07-12T16:00:00.000Z", executionRequestedAt: "2026-07-12T16:05:00.000Z", generatedAt: "2026-07-12T16:10:00.000Z", executedAt: "2026-07-12T16:11:00.000Z", persistenceAt: "2026-07-12T16:12:00.000Z", latestAt: "2026-07-12T18:00:00.000Z", expected: null });
  const replay = await runHermesDailyFarmBriefManualPersistReadE2E(replayFixture.input); assert.equal(replay.status, "reused");
  assert.deepEqual(await canonicalEvidence(MAIN_DATE), afterFirst);

  const rollbackV1Fixture = runInput({ suffix: "rollback-v1", date: ROLLBACK_DATE, requestedAt: "2026-07-11T16:00:00.000Z", executionRequestedAt: "2026-07-11T16:05:00.000Z", generatedAt: "2026-07-11T16:10:00.000Z", executedAt: "2026-07-11T16:11:00.000Z", persistenceAt: "2026-07-11T16:12:00.000Z", latestAt: "2026-07-11T18:00:00.000Z", expected: null });
  const rollbackV1 = await runHermesDailyFarmBriefManualPersistReadE2E(rollbackV1Fixture.input); assert(["completed", "reused"].includes(rollbackV1.status));
  const rollbackV2Fixture = runInput({ suffix: "rollback-v2", date: ROLLBACK_DATE, requestedAt: "2026-07-11T17:00:00.000Z", executionRequestedAt: "2026-07-11T17:05:00.000Z", generatedAt: "2026-07-11T17:10:00.000Z", executedAt: "2026-07-11T17:11:00.000Z", persistenceAt: "2026-07-11T17:12:00.000Z", latestAt: "2026-07-11T18:00:00.000Z", expected: 1, force: true, existing: existingCompleted(ROLLBACK_DATE, "2026-07-11T16:10:00.000Z"), write: new HermesDailyFarmBriefIsolatedPostgresWriteRepository(executor(), true) });
  const rollback = await runHermesDailyFarmBriefManualPersistReadE2E(rollbackV2Fixture.input); assert.equal(rollback.status, "failed_closed"); assert.equal(rollback.stage, "persistence"); assert.deepEqual(await canonicalEvidence(ROLLBACK_DATE), { canonical_count: 1, version_count: 1, receipt_count: 1 });
  const rollbackRead = new HermesDailyFarmBriefBusinessDateBoundedReadRepository(new HermesDailyFarmBriefIsolatedPostgresReadRepository(executor()), ROLLBACK_DATE);
  const rollbackLatest = await serveHermesDailyFarmBriefLatestRead({ request: new Request(API_URL), dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider(authentication()), actorDirectory: new HermesDailyFarmBriefFixtureActorDirectory({ [PRINCIPAL]: actor() }), readRepository: rollbackRead, clock: () => "2026-07-12T02:30:00.000Z" }) });
  assert.equal(rollbackLatest.status, 200); assert.equal(parseHermesDailyFarmBriefLatestApiResponse(await rollbackLatest.json())?.latest?.display_state, "current");

  const secondFixture = runInput({ suffix: "main-v2", date: MAIN_DATE, requestedAt: "2026-07-12T17:00:00.000Z", executionRequestedAt: "2026-07-12T17:05:00.000Z", generatedAt: "2026-07-12T17:10:00.000Z", executedAt: "2026-07-12T17:11:00.000Z", persistenceAt: "2026-07-12T17:12:00.000Z", latestAt: "2026-07-12T18:00:00.000Z", expected: 1, force: true, existing: existingCompleted(MAIN_DATE, "2026-07-12T16:10:00.000Z") });
  const second = await runHermesDailyFarmBriefManualPersistReadE2E(secondFixture.input); assert(["completed", "reused"].includes(second.status)); assert.deepEqual(await canonicalEvidence(MAIN_DATE), { canonical_count: 1, version_count: 2, receipt_count: 2 });

  const unauthenticated = await negativeHttp(new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(), new HermesDailyFarmBriefFixtureActorDirectory({})); assert.equal(unauthenticated.response.status, 401); assert.equal(unauthenticated.reads, 0);
  const unknown = await negativeHttp(new HermesDailyFarmBriefFixtureAuthenticationProvider(authentication()), new HermesDailyFarmBriefFixtureActorDirectory({})); assert.equal(unknown.response.status, 403); assert.equal(unknown.reads, 0);
  const mismatch = await negativeHttp(new HermesDailyFarmBriefFixtureAuthenticationProvider(authentication()), new HermesDailyFarmBriefFixtureActorDirectory({ [PRINCIPAL]: actor("other-principal") })); assert.equal(mismatch.response.status, 403); assert.equal(mismatch.reads, 0);
  const staff = await negativeHttp(new HermesDailyFarmBriefFixtureAuthenticationProvider(authentication()), new HermesDailyFarmBriefFixtureActorDirectory({ [PRINCIPAL]: actor(PRINCIPAL, "general_staff") })); assert.equal(staff.response.status, 200); assert.equal(parseHermesDailyFarmBriefLatestApiResponse(staff.body)?.latest?.visible_scope_count, 0);
  const query = await negativeHttp(new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(), new HermesDailyFarmBriefFixtureActorDirectory({}), new Request(`${API_URL}?role=administrator`)); assert.equal(query.response.status, 400); assert.equal(query.reads, 0);
  const post = await negativeHttp(new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(), new HermesDailyFarmBriefFixtureActorDirectory({}), new Request(API_URL, { method: "POST" })); assert.equal(post.response.status, 405); assert.equal(post.reads, 0);
  const invalidRead = new HermesDailyFarmBriefFixtureReadRepository({ schema_version: "invalid", records: [] });
  const invalidResponse = await serveHermesDailyFarmBriefLatestRead({ request: new Request(API_URL), dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider(authentication()), actorDirectory: new HermesDailyFarmBriefFixtureActorDirectory({ [PRINCIPAL]: actor() }), readRepository: invalidRead, clock: () => "2026-07-13T02:30:00.000Z" }) }); assert.equal(invalidResponse.status, 500);
  assert.equal(HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY.production_database_connection_performed, false); assert.equal(HERMES_DAILY_FARM_BRIEF_DAY116_SAFETY.retry_performed, false);
  return { database_target: "isolated_day114_test", manual_request_authorized: true, generation_decision: "generate", execution_status: "completed", persistence_status: second.persistence_status, authenticated_http_status: second.http_status, display_state: second.latest_display_state, role: second.latest_role, visible_scope_count: second.visible_scope_count, rollback_verified: true, canonical_uniqueness: true, retry_count: 0, production_database_connection_performed: false, production_database_write_performed: false, secret_exposed: false, day117_handoff: "farming_application_daily_brief_display" };
}

async function main() { console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_manual_persist_read_e2e", ...(await runDay116Scenario()) })); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error instanceof Error ? error.message : "day116_e2e_failed"); process.exitCode = 1; });
