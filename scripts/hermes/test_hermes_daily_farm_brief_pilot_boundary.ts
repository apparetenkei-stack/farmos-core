import assert from "node:assert/strict";

import { HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY } from "./brief_runtime/hermes_daily_farm_brief_persisted_record_contract";
import {
  HermesDailyFarmBriefFixtureAuthenticationProvider,
  authenticateHermesDailyFarmBriefServerRequest,
  resolveHermesDailyFarmBriefActorContext,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { HermesDailyFarmBriefDenyByDefaultReadRepository } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { serveHermesDailyFarmBriefLatestDisplay } from "./brief_runtime/hermes_daily_farm_brief_latest_display_service";
import {
  createHermesDailyFarmBriefPilotIdentityBoundary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_pilot_authentication";
import {
  createHermesDailyFarmBriefLatestServerDependencies,
  createHermesDailyFarmBriefPilotLatestServerBoundary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_latest_server_boundary";
import type { HermesDailyFarmBriefProductionReadExecutor } from "../../src/lib/hermes/hermes_daily_farm_brief_production_read_repository";

const NOW = "2026-07-16T02:00:00.000Z";
const AUTH_VALUE = "test-value-a";
const WRONG_AUTH_VALUE = "test-value-b";
const DATABASE_CREDENTIAL_VALUE = "test-value-c";
const PRINCIPAL = "farm-owner-day120";
const DATABASE_ENV = {
  HERMES_DAILY_BRIEF_DATABASE_ENABLED: "true",
  HERMES_DAILY_BRIEF_DATABASE_HOST: "db.internal",
  HERMES_DAILY_BRIEF_DATABASE_PORT: "5432",
  HERMES_DAILY_BRIEF_DATABASE_NAME: "farmos_core_production",
  HERMES_DAILY_BRIEF_DATABASE_USER: "hermes_reader",
  HERMES_DAILY_BRIEF_DATABASE_PASSWORD: DATABASE_CREDENTIAL_VALUE,
  HERMES_DAILY_BRIEF_DATABASE_SSL_MODE: "verify-full",
  HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS: "1000",
  HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS: "3000",
  HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS: "500",
} as const;
const PILOT_ENV = {
  HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN: AUTH_VALUE,
  HERMES_DAILY_FARM_BRIEF_PILOT_PRINCIPAL_REF: PRINCIPAL,
  HERMES_DAILY_FARM_BRIEF_PILOT_ROLE: "administrator",
  HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "[]",
} as const;
const VALID_ENV = { ...DATABASE_ENV, ...PILOT_ENV };

function generationRecord() {
  return {
    record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
    record_id: "internal-record-day120",
    record_kind: "generation_state",
    business_date: "2026-07-16",
    record_status: "canonical",
    version: 1,
    created_at: "2026-07-16T01:00:00.000Z",
    updated_at: "2026-07-16T01:00:00.000Z",
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
    generation_state: "in_progress",
    retry_count: 0,
  };
}

function fixtureExecutor() {
  const calls: string[] = [];
  const executor: HermesDailyFarmBriefProductionReadExecutor = {
    executeReadOnly: async (query) => {
      calls.push(query);
      return { database_matches: true, user_present: true, transaction_read_only: true, rows: [generationRecord()] };
    },
  };
  return { executor, calls };
}

function request(path = "latest-display", authorization?: string, extraHeaders: HeadersInit = {}): Request {
  const headers = new Headers(extraHeaders);
  if (authorization !== undefined) headers.set("Authorization", authorization);
  return new Request(`http://localhost/api/hermes/daily-farm-brief/${path}`, { headers });
}

async function main(): Promise<void> {
  assert.equal(createHermesDailyFarmBriefPilotIdentityBoundary(VALID_ENV).state, "ready");
  for (const environment of [
    {},
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN: "" },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN: `test\u0000value-d` },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN: "x".repeat(513) },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_PRINCIPAL_REF: "*" },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_ROLE: "owner" },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "not-json" },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "[\"*\"]" },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "[\"crop:0123456789abcdef01234567\",\"crop:0123456789abcdef01234567\"]" },
    { ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_ROLE: "administrator", HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "[\"crop:0123456789abcdef01234567\"]" },
  ]) assert.equal(createHermesDailyFarmBriefPilotIdentityBoundary(environment).state, "denied");

  const identity = createHermesDailyFarmBriefPilotIdentityBoundary(VALID_ENV);
  assert.equal(identity.state, "ready");
  const authenticate = (value: Request) => authenticateHermesDailyFarmBriefServerRequest(identity.authenticationProvider, value);
  assert.equal((await identity.authenticationProvider.authenticateServerRequest(request("latest-display", "Basic abc")) as { status: string }).status, "invalid");
  assert.equal((await identity.authenticationProvider.authenticateServerRequest(request("latest-display", `Bearer ${AUTH_VALUE}, Bearer ${AUTH_VALUE}`)) as { status: string }).status, "invalid");
  for (const value of [request(), request("latest-display", "Basic abc"), request("latest-display", `Bearer ${WRONG_AUTH_VALUE}`), request("latest-display", "Bearer "), request("latest-display", `Bearer ${AUTH_VALUE}, Bearer ${AUTH_VALUE}`)]) {
    assert.equal((await authenticate(value)).status, "unauthenticated");
  }
  const authenticated = await authenticate(request("latest-display", `Bearer ${AUTH_VALUE}`));
  assert.equal(authenticated.status, "authenticated");
  assert(authenticated.status === "authenticated");
  assert.equal((await resolveHermesDailyFarmBriefActorContext(identity.actorDirectory, authenticated))?.principal_ref, PRINCIPAL);
  assert.equal(await identity.actorDirectory.resolvePrincipal("different-principal"), null);
  const injectedRequest = request("latest-display", `Bearer ${AUTH_VALUE}`, { "X-Hermes-Role": "general_staff", "X-Hermes-Allowed-Scope-Keys": "*" });
  const injectedAuthentication = await authenticate(injectedRequest);
  assert(injectedAuthentication.status === "authenticated");
  const injectedActor = await resolveHermesDailyFarmBriefActorContext(identity.actorDirectory, injectedAuthentication);
  assert.equal(injectedActor?.role, "administrator");
  assert.deepEqual(injectedActor?.allowed_scope_keys, []);
  assert.equal(injectedActor?.authorization_verified, true);

  const mismatchDependencies = createHermesDailyFarmBriefLatestServerDependencies({
    authenticationProvider: new HermesDailyFarmBriefFixtureAuthenticationProvider({ schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status: "authenticated", principal_ref: "different-principal" }),
    actorDirectory: identity.actorDirectory,
    readRepository: new HermesDailyFarmBriefDenyByDefaultReadRepository(),
    clock: () => NOW,
  });
  assert.equal((await serveHermesDailyFarmBriefLatestDisplay({ request: request(), dependencies: mismatchDependencies })).status, 403);

  const missingIdentity = createHermesDailyFarmBriefPilotLatestServerBoundary({ environment: DATABASE_ENV, clock: () => NOW });
  assert.equal((await serveHermesDailyFarmBriefLatestDisplay({ request: request("latest-display", `Bearer ${AUTH_VALUE}`), dependencies: missingIdentity.dependencies })).status, 401);

  const missingDatabase = createHermesDailyFarmBriefPilotLatestServerBoundary({ environment: PILOT_ENV, clock: () => NOW });
  assert.deepEqual([missingDatabase.authentication_state, missingDatabase.actor_directory_state, missingDatabase.repository_state], ["denied", "denied", "denied"]);
  assert.equal((await serveHermesDailyFarmBriefLatestDisplay({ request: request("latest-display", `Bearer ${AUTH_VALUE}`), dependencies: missingDatabase.dependencies })).status, 401);

  const fake = fixtureExecutor();
  const boundary = createHermesDailyFarmBriefPilotLatestServerBoundary({ environment: VALID_ENV, clock: () => NOW, executor: fake.executor });
  assert.deepEqual([boundary.authentication_state, boundary.actor_directory_state, boundary.repository_state], ["ready", "ready", "ready"]);
  const displayResponse = await serveHermesDailyFarmBriefLatestDisplay({
    request: injectedRequest,
    dependencies: boundary.dependencies,
  });
  assert.equal(displayResponse.status, 200);
  assert.equal(fake.calls.length, 1);
  const displayBody = await displayResponse.text();
  assert.equal(JSON.parse(displayBody).display_state, "generation_in_progress");
  for (const forbidden of [AUTH_VALUE, DATABASE_CREDENTIAL_VALUE, PRINCIPAL, "internal-record-day120", "X-Hermes-Role"]) assert(!displayBody.includes(forbidden));

  const latestFake = fixtureExecutor();
  const latestBoundary = createHermesDailyFarmBriefPilotLatestServerBoundary({ environment: VALID_ENV, clock: () => NOW, executor: latestFake.executor });
  const latestResponse = await serveHermesDailyFarmBriefLatestRead({ request: request("latest", `Bearer ${AUTH_VALUE}`), dependencies: latestBoundary.dependencies });
  assert.equal(latestResponse.status, 200);
  assert.equal(latestFake.calls.length, 1);
  const latestBody = await latestResponse.text();
  assert.equal(JSON.parse(latestBody).latest.display_state, "generation_in_progress");
  assert(!latestBody.includes(AUTH_VALUE));

  const missingAuthorization = await serveHermesDailyFarmBriefLatestDisplay({ request: request(), dependencies: boundary.dependencies });
  const wrongScheme = await serveHermesDailyFarmBriefLatestDisplay({ request: request("latest-display", "Basic abc"), dependencies: boundary.dependencies });
  const wrongToken = await serveHermesDailyFarmBriefLatestDisplay({ request: request("latest-display", `Bearer ${WRONG_AUTH_VALUE}`), dependencies: boundary.dependencies });
  assert.deepEqual([missingAuthorization.status, wrongScheme.status, wrongToken.status], [401, 401, 401]);
  for (const authorization of [
    `bearer ${AUTH_VALUE}`,
    `BEARER ${AUTH_VALUE}`,
    `BearerX ${AUTH_VALUE}`,
    `Bearer ${AUTH_VALUE} extra`,
    `Bearer  ${AUTH_VALUE}`,
  ]) {
    const response = await serveHermesDailyFarmBriefLatestDisplay({ request: request("latest-display", authorization), dependencies: boundary.dependencies });
    assert.equal(response.status, 401);
  }
  assert.equal(fake.calls.length, 1);
  for (const response of [missingAuthorization, wrongScheme, wrongToken]) assert(!JSON.stringify(await response.json()).includes(AUTH_VALUE));

  const staffScope = "crop:0123456789abcdef01234567";
  const staffIdentity = createHermesDailyFarmBriefPilotIdentityBoundary({ ...VALID_ENV, HERMES_DAILY_FARM_BRIEF_PILOT_ROLE: "general_staff", HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: JSON.stringify([staffScope]) });
  const staffAuthentication = await authenticateHermesDailyFarmBriefServerRequest(staffIdentity.authenticationProvider, request("latest-display", `Bearer ${AUTH_VALUE}`));
  assert(staffAuthentication.status === "authenticated");
  assert.deepEqual((await resolveHermesDailyFarmBriefActorContext(staffIdentity.actorDirectory, staffAuthentication))?.allowed_scope_keys, [staffScope]);

  console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_pilot", authentication: "bearer_server_owned", actor_directory: "environment_server_owned", repository: "production_read_only_ready", source_read_maximum: 1, database_write_performed: false, secret_exposed: false }));
}

await main();
