import assert from "node:assert/strict";

import {
  createFarmOsActiveProjectionReadAuthentication,
} from "../../src/lib/hermes/farm_os_active_projection_read_authentication";

const token = "active-read-fixture-token";
const principal = "active-reader@example.test";
const url = "http://localhost/api/hermes/daily-operational-projection/active";
const validEnvironment = {
  HERMES_ACTIVE_PROJECTION_READ_TOKEN: token,
  HERMES_ACTIVE_PROJECTION_READ_PRINCIPAL_REF: principal,
  HERMES_ACTIVE_PROJECTION_READ_ROLE: "administrator",
  HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS:
    JSON.stringify(["active_projection_read"]),
};

async function run(
  environment: Readonly<Record<string, string | undefined>>,
  authorization = `Bearer ${token}`,
  headers: HeadersInit = {},
) {
  const identity = createFarmOsActiveProjectionReadAuthentication({ environment });
  const requestHeaders = new Headers(headers);
  requestHeaders.set("authorization", authorization);
  const authentication = await identity.authenticate(
    new Request(url, { headers: requestHeaders }),
  );
  const authorizationResult = await identity.authorize(authentication);
  return { identity, authentication, authorization: authorizationResult };
}

const valid = await run(validEnvironment);
assert.equal(valid.identity.state, "ready");
assert.deepEqual(valid.authentication, { result: "authenticated", principal_ref: principal });
assert.equal(valid.authorization.result, "authorized");
assert(valid.authorization.result === "authorized");
assert.deepEqual(valid.authorization.actor.allowed_scope_keys, ["active_projection_read"]);
assert.equal(valid.authorization.actor.role, "administrator");
assert.equal(valid.authorization.actor.server_owned, true);

assert.equal((await run(validEnvironment, "Bearer wrong-token")).authentication.result, "unauthorized");
assert.equal((await run({ ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_PRINCIPAL_REF: "*" })).authentication.result, "unauthorized");

for (const environment of [
  { ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_ROLE: "general_staff" },
  { ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS: "[]" },
  { ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS: JSON.stringify(["active_projection_read", "other"]) },
  { ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS: JSON.stringify(["unknown"]) },
  { ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS: JSON.stringify(["*"]) },
  { ...validEnvironment, HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS: "not-json" },
]) {
  const result = await run(environment);
  assert.equal(result.authentication.result, "authenticated");
  assert.deepEqual(result.authorization, { result: "forbidden" });
}

const injected = await run(validEnvironment, `Bearer ${token}`, {
  "x-principal-ref": "browser-principal",
  "x-role": "general_staff",
  "x-allowed-scope-keys": "*",
});
assert.equal(injected.authorization.result, "authorized");
assert(injected.authorization.result === "authorized");
assert.equal(injected.authorization.actor.principal_ref, principal);

const dailyOnly = await run({
  HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN: token,
  HERMES_DAILY_FARM_BRIEF_PILOT_PRINCIPAL_REF: principal,
  HERMES_DAILY_FARM_BRIEF_PILOT_ROLE: "administrator",
  HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS: "[]",
});
assert.equal(dailyOnly.authentication.result, "unauthorized");

console.log("farm_os_day150_active_projection_read_authentication: PASS");
