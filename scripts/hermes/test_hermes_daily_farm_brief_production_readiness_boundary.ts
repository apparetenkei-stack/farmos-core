import assert from "node:assert/strict";

import {
  HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
} from "./brief_runtime/hermes_daily_farm_brief_persisted_record_contract";
import {
  HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY,
  HermesDailyFarmBriefDenyByDefaultAuthenticationProvider,
  HermesDailyFarmBriefFixtureActorDirectory,
  HermesDailyFarmBriefFixtureAuthenticationProvider,
  authenticateHermesDailyFarmBriefServerRequest,
  classifyHermesDailyFarmBriefDatabaseTarget,
  executeHermesDailyFarmBriefFarmingAppProxy,
  parseHermesDailyFarmBriefProductionEnvironment,
  parseHermesDailyFarmBriefServerAuthenticationProviderResult,
  resolveHermesDailyFarmBriefActorContext,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY,
  HermesDailyFarmBriefProductionPostgresReadRepository,
  createHermesDailyFarmBriefProductionReadRepository,
  type HermesDailyFarmBriefProductionReadExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_read_repository";
import { createHermesDailyFarmBriefLatestServerDependencies, createHermesDailyFarmBriefProductionLatestServerBoundary } from "../../src/lib/hermes/hermes_daily_farm_brief_latest_server_boundary";

const NOW = "2026-07-15T02:00:00.000Z";
const URL = "http://localhost/api/hermes/daily-farm-brief/latest";
const VALID_ENV = {
  HERMES_DAILY_BRIEF_DATABASE_ENABLED: "true", HERMES_DAILY_BRIEF_DATABASE_HOST: "db.internal", HERMES_DAILY_BRIEF_DATABASE_PORT: "5432", HERMES_DAILY_BRIEF_DATABASE_NAME: "farmos_core_production", HERMES_DAILY_BRIEF_DATABASE_USER: "hermes_reader", HERMES_DAILY_BRIEF_DATABASE_PASSWORD: "fixture-password-never-output", HERMES_DAILY_BRIEF_DATABASE_SSL_MODE: "verify-full", HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS: "1000", HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "3000", HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS: "500",
} as const;

function generationRecord() {
  return { record_schema_version: "hermes.daily_farm_brief.persisted_record.v1", record_id: "internal-record-day115", record_kind: "generation_state", business_date: "2026-07-15", record_status: "canonical", version: 1, created_at: "2026-07-15T01:00:00.000Z", updated_at: "2026-07-15T01:00:00.000Z", safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY, generation_state: "in_progress", retry_count: 0 };
}

function actor(principal = "principal-day115", role: "administrator" | "general_staff" = "administrator", scopes: string[] = []) {
  return { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: principal, role, allowed_scope_keys: scopes, authorization_verified: true };
}
function auth(status: "authenticated" | "unauthenticated" | "unavailable" | "invalid" = "authenticated") {
  return { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status, principal_ref: status === "authenticated" ? "principal-day115" : null };
}
function fixtureExecutor(input: Partial<Awaited<ReturnType<HermesDailyFarmBriefProductionReadExecutor["executeReadOnly"]>>> = {}) {
  const calls: string[] = [];
  const executor: HermesDailyFarmBriefProductionReadExecutor = { executeReadOnly: async (query) => { calls.push(query); return { database_matches: true, user_present: true, transaction_read_only: true, rows: [generationRecord()], ...input }; } };
  return { executor, calls };
}

async function main(): Promise<void> {
  const config = parseHermesDailyFarmBriefProductionEnvironment(VALID_ENV);
  assert(config);
  assert.equal(config.target_class, "production_candidate");
  assert.equal(classifyHermesDailyFarmBriefDatabaseTarget("farmos_core_day114_test"), "isolated_day114_test");
  assert.equal(classifyHermesDailyFarmBriefDatabaseTarget("farmos_core_local"), "rejected");
  assert.equal(parseHermesDailyFarmBriefProductionEnvironment({}), null);
  assert.equal(parseHermesDailyFarmBriefProductionEnvironment({ ...VALID_ENV, HERMES_DAILY_BRIEF_DATABASE_PORT: "x" }), null);
  assert.equal(parseHermesDailyFarmBriefProductionEnvironment({ ...VALID_ENV, HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "999999" }), null);
  const safeConfig = JSON.stringify(config);
  assert(!safeConfig.includes("password")); assert(!safeConfig.includes("connection")); assert(!safeConfig.includes(VALID_ENV.HERMES_DAILY_BRIEF_DATABASE_PASSWORD));
  assert.equal(createHermesDailyFarmBriefProductionReadRepository({ ...VALID_ENV, HERMES_DAILY_BRIEF_DATABASE_NAME: "farmos_core_day114_test" }).state, "denied");

  const fake = fixtureExecutor();
  const factory = createHermesDailyFarmBriefProductionReadRepository(VALID_ENV, fake.executor);
  assert.equal(factory.state, "ready");
  const repositoryResult = await factory.repository.readRecordCandidates();
  assert.equal(fake.calls.length, 1); assert.equal((repositoryResult as { transaction_read_only: boolean }).transaction_read_only, true);
  assert(!/select\s+\*/iu.test(HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY));
  assert.match(HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY, /limit 500/iu);
  assert.match(HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY, /generated_at <= clock_timestamp\(\)/u);
  const notReadOnly = fixtureExecutor({ transaction_read_only: false });
  assert.equal((await new HermesDailyFarmBriefProductionPostgresReadRepository(notReadOnly.executor).readRecordCandidates() as { status: string }).status, "unavailable");

  const request = new Request(URL);
  assert.equal((await authenticateHermesDailyFarmBriefServerRequest(new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(), request)).status, "unauthenticated");
  const authenticated = await authenticateHermesDailyFarmBriefServerRequest(new HermesDailyFarmBriefFixtureAuthenticationProvider(auth()), request);
  assert.equal(authenticated.status, "authenticated");
  assert.equal(parseHermesDailyFarmBriefServerAuthenticationProviderResult({ ...auth(), principal_ref: "*" }), null);
  assert(authenticated.status === "authenticated");
  const adminDirectory = new HermesDailyFarmBriefFixtureActorDirectory({ "principal-day115": actor() });
  assert.deepEqual((await resolveHermesDailyFarmBriefActorContext(adminDirectory, authenticated))?.allowed_scope_keys, []);
  const scope = "crop:0123456789abcdef01234567";
  const staffDirectory = new HermesDailyFarmBriefFixtureActorDirectory({ "principal-day115": actor("principal-day115", "general_staff", [scope]) });
  assert.deepEqual((await resolveHermesDailyFarmBriefActorContext(staffDirectory, authenticated))?.allowed_scope_keys, [scope]);
  assert.equal(await resolveHermesDailyFarmBriefActorContext(new HermesDailyFarmBriefFixtureActorDirectory({ "principal-day115": actor("different") }), authenticated), null);
  assert.equal(await resolveHermesDailyFarmBriefActorContext(new HermesDailyFarmBriefFixtureActorDirectory({ "principal-day115": actor("principal-day115", "general_staff", ["*"]) }), authenticated), null);

  const apiExecutor = fixtureExecutor();
  const productionBoundary = createHermesDailyFarmBriefProductionLatestServerBoundary({ environment: VALID_ENV, authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider(auth()), actorDirectory: adminDirectory, executor: apiExecutor.executor, clock: () => NOW });
  assert.equal(productionBoundary.repository_state, "ready");
  const dependencies = productionBoundary.dependencies;
  const ok = await serveHermesDailyFarmBriefLatestRead({ request, dependencies });
  assert.equal(ok.status, 200); assert.equal(ok.headers.get("cache-control"), "no-store");
  const okBody = await ok.json(); assert.equal((okBody as { latest: { display_state: string } }).latest.display_state, "generation_in_progress");
  assert(!JSON.stringify(okBody).includes("internal-record-day115")); assert(!JSON.stringify(okBody).includes('"version"'));
  const unauth = await serveHermesDailyFarmBriefLatestRead({ request, dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(), actorDirectory: adminDirectory, readRepository: factory.repository, clock: () => NOW }) });
  assert.equal(unauth.status, 401);
  const forbidden = await serveHermesDailyFarmBriefLatestRead({ request, dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider(auth()), actorDirectory: new HermesDailyFarmBriefFixtureActorDirectory({}), readRepository: factory.repository, clock: () => NOW }) });
  assert.equal(forbidden.status, 403);
  const invalidExecutor = fixtureExecutor({ rows: [{ invalid: true }] });
  const invalid = await serveHermesDailyFarmBriefLatestRead({ request, dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider(auth()), actorDirectory: adminDirectory, readRepository: new HermesDailyFarmBriefProductionPostgresReadRepository(invalidExecutor.executor), clock: () => NOW }) });
  assert.equal(invalid.status, 500);

  const proxyRequest = { schema_version: "hermes.daily_farm_brief.farming_app_proxy.v1", method: "GET", pathname: "/api/hermes/daily-farm-brief/latest", body_present: false, query_parameter_count: 0, server_credential_present: true, request_id: "request-day115", requested_at: NOW };
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  const validProxy = await executeHermesDailyFarmBriefFarmingAppProxy({ request: proxyRequest, baseUrl: "https://core.internal", serverCredential: "fixture-token", timeoutMs: 1000, maximumResponseBytes: 100_000, fetch: async (url, init) => { fetchCalls.push({ url, init }); return new Response(JSON.stringify(okBody), { status: 200, headers: { "Cache-Control": "no-store" } }); } });
  assert.equal(validProxy.status, "ok"); assert.equal(fetchCalls[0].url, "https://core.internal/api/hermes/daily-farm-brief/latest"); assert.equal(fetchCalls[0].init.redirect, "manual"); assert.equal(validProxy.retry_count, 0); assert(!JSON.stringify(validProxy).includes("fixture-token"));
  const proxy = (response: Response) => executeHermesDailyFarmBriefFarmingAppProxy({ request: proxyRequest, baseUrl: "https://core.internal", serverCredential: "token", timeoutMs: 1000, maximumResponseBytes: 1_024, fetch: async () => response });
  assert.equal((await proxy(new Response("", { status: 401 }))).status, "authentication_required");
  assert.equal((await proxy(new Response("not-json", { status: 200 }))).status, "invalid_upstream_response");
  assert.equal((await proxy(new Response("x".repeat(1_025), { status: 200 }))).status, "invalid_upstream_response");
  assert.equal((await proxy(new Response("", { status: 302 }))).status, "invalid_upstream_response");
  assert.equal((await proxy(new Response(JSON.stringify(okBody), { status: 200 }))).status, "invalid_upstream_response");
  const timed = await executeHermesDailyFarmBriefFarmingAppProxy({ request: proxyRequest, baseUrl: "https://core.internal", serverCredential: "token", timeoutMs: 100, maximumResponseBytes: 1_024, fetch: async (_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("timeout", "AbortError")))) });
  assert.equal(timed.status, "upstream_timeout");
  assert.equal((await executeHermesDailyFarmBriefFarmingAppProxy({ request: { ...proxyRequest, role: "administrator" }, baseUrl: "https://core.internal", serverCredential: "token", timeoutMs: 1000, maximumResponseBytes: 1_024, fetch: async () => new Response() })).status, "configuration_missing");
  assert.equal(HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.retry_performed, false);
  assert.equal(HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.production_database_connection_performed, false);
  console.log("Hermes Daily Farm Brief Day115 production readiness boundary: PASS");
}

await main();
