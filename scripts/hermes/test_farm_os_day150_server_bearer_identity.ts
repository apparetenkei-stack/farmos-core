import assert from "node:assert/strict";

import {
  createFarmOsServerBearerIdentity,
} from "../../src/lib/hermes/farm_os_server_bearer_identity";
import {
  createHermesDailyFarmBriefPilotIdentityBoundary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_pilot_authentication";

const token = "fixture-token-day150-c";
const principal = "farm.owner@example.test";
const actor = Object.freeze({ principal_ref: principal, role: "fixture" });
const url = "http://localhost/internal";
let comparisons = 0;
const identity = createFarmOsServerBearerIdentity({
  token,
  principal_ref: principal,
  actor,
  compare_secrets: (left, right) => {
    comparisons += 1;
    return left === right;
  },
});
assert.equal(identity.state, "ready");

async function authenticate(authorization?: string) {
  const headers = new Headers();
  if (authorization !== undefined) headers.set("authorization", authorization);
  return identity.authenticationProvider.authenticateServerRequest(
    new Request(url, { headers }),
  );
}

const valid = await authenticate(`Bearer ${token}`);
assert.deepEqual(valid, {
  schema_version: "farmos.server_bearer_authentication.v1",
  status: "authenticated",
  principal_ref: principal,
});
assert.equal(comparisons, 1, "configured digest comparison seam is used");
assert.deepEqual(await identity.actorDirectory.resolvePrincipal(principal), actor);
assert.notEqual(await identity.actorDirectory.resolvePrincipal(principal), actor);
assert.equal(await identity.actorDirectory.resolvePrincipal("different"), null);

assert.equal((await authenticate()).status, "unauthenticated");
assert.equal((await authenticate(`Basic ${token}`)).status, "invalid");
assert.equal((await authenticate(`Bearer ${token}, Bearer ${token}`)).status, "invalid");
assert.equal((await authenticate("Bearer ")).status, "invalid");
assert.equal((await authenticate(`Bearer ${"x".repeat(513)}`)).status, "unauthenticated");
const invalid = await authenticate("Bearer different-fixture-token");
assert.equal(invalid.status, "unauthenticated");
assert.equal(comparisons, 2, "invalid safe tokens follow the same comparator path");

const unavailable = createFarmOsServerBearerIdentity({
  token: undefined,
  principal_ref: principal,
  actor,
});
assert.equal(unavailable.state, "denied");
assert.equal((await unavailable.authenticationProvider.authenticateServerRequest(
  new Request(url, { headers: { authorization: `Bearer ${token}` } }),
)).status, "unavailable");

const comparatorFailure = createFarmOsServerBearerIdentity({
  token,
  principal_ref: principal,
  actor,
  compare_secrets: () => { throw new Error("fixture-comparator-error"); },
});
assert.equal((await comparatorFailure.authenticationProvider
  .authenticateServerRequest(new Request(url, {
    headers: { authorization: `Bearer ${token}` },
  }))).status, "unauthenticated");

for (const result of [valid, invalid]) {
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(token), false);
  assert.equal(serialized.includes("fixture-comparator-error"), false);
}

const daily = createHermesDailyFarmBriefPilotIdentityBoundary({
  HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN: token,
  HERMES_DAILY_FARM_BRIEF_PILOT_PRINCIPAL_REF: principal,
  HERMES_DAILY_FARM_BRIEF_PILOT_ROLE: "administrator",
  HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "[]",
});
assert.equal(daily.state, "ready", "Daily Brief principals containing @ remain valid");
assert.equal((await daily.authenticationProvider.authenticateServerRequest(
  new Request(url, { headers: { authorization: `Bearer ${token}` } }),
) as { status: string }).status, "authenticated");

console.log("farm_os_day150_server_bearer_identity: PASS");
