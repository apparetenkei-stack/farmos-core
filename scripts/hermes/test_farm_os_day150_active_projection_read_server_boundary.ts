import assert from "node:assert/strict";

import {
  serveFarmOsActiveProjectionRead,
  type FarmOsActiveProjectionReadServerDependencies,
} from "../../src/lib/hermes/farm_os_active_projection_read_server_boundary";

const URL = "http://localhost/api/hermes/daily-operational-projection/active";
const NOW = "2026-08-06T15:00:00.000Z";
const principal = "active-reader-day150-c";
const binding = Object.freeze({
  installation_id: "installation_fixture_1",
  farm_scope: "farm_fixture_1",
  timezone: "Asia/Tokyo" as const,
});
const actor = Object.freeze({
  schema_version: "farmos.active_projection_read.actor_evidence.v1" as const,
  principal_ref: principal,
  role: "administrator" as const,
  allowed_scope_keys: Object.freeze(["active_projection_read"] as const),
  authorization_verified: true as const,
  authentication_method: "bearer" as const,
  server_owned: true as const,
});
const payload = Object.freeze({
  business_date: "2026-08-07",
  source_record_count: 2,
  active_record_count: 1,
  tombstone_count: 1,
  field_references: ["field_1"],
  crop_cycle_references: ["cycle_1"],
  work_type_references: ["work_1"],
  verification_status: "stable_change_contract_validated",
  missing_data_status: "complete_for_v1",
});

function domain(status: "current" | "stale" | "missing" | "failed") {
  return status === "current" || status === "stale"
    ? {
      schema_version: "farmos.daily_operational_projection.active_read_response.v1",
      status,
      payload,
      generated_at: "2026-08-06T15:01:02.003Z",
    }
    : {
      schema_version: "farmos.daily_operational_projection.active_read_response.v1",
      status,
      payload: null,
      generated_at: null,
    };
}

function fixture(input: {
  authentication?: unknown;
  authorization?: unknown;
  service?: unknown | (() => unknown);
} = {}) {
  const calls: string[] = [];
  const dependencies: FarmOsActiveProjectionReadServerDependencies = {
    authenticate: async () => {
      calls.push("authenticate");
      return input.authentication ?? { result: "authenticated", principal_ref: principal };
    },
    authorize: async () => {
      calls.push("authorize");
      return input.authorization ?? { result: "authorized", actor };
    },
    installation_binding_loader: () => {
      calls.push("binding");
      return binding;
    },
    clock: () => {
      calls.push("clock");
      return NOW;
    },
    read_service: async (serviceInput) => {
      calls.push("service");
      assert.deepEqual(serviceInput.installation_binding, binding);
      assert.deepEqual(serviceInput.installation_scope, {
        installation_id: binding.installation_id,
        farm_scope: binding.farm_scope,
      });
      assert.equal(serviceInput.requested_at, NOW);
      return typeof input.service === "function"
        ? input.service()
        : input.service ?? domain("current");
    },
  };
  return { dependencies, calls };
}

async function invoke(input: Parameters<typeof fixture>[0] = {}, url = URL) {
  const configured = fixture(input);
  const response = await serveFarmOsActiveProjectionRead({
    request: new Request(url),
    dependencies: configured.dependencies,
  });
  const body = await response.json();
  assert.equal(response.headers.get("cache-control"), "no-store");
  return { response, body, calls: configured.calls };
}

const unauthorized = await invoke({ authentication: { result: "unauthorized" } });
assert.equal(unauthorized.response.status, 401);
assert.deepEqual(unauthorized.body, { error: "unauthorized" });
assert.deepEqual(unauthorized.calls, ["authenticate"]);

const forbidden = await invoke({ authorization: { result: "forbidden" } });
assert.equal(forbidden.response.status, 403);
assert.deepEqual(forbidden.body, { error: "forbidden" });
assert.deepEqual(forbidden.calls, ["authenticate", "authorize"]);

const invalidQuery = await invoke({}, `${URL}?business_date=2026-08-07`);
assert.equal(invalidQuery.response.status, 400);
assert.deepEqual(invalidQuery.body, { error: "invalid_request" });
assert.deepEqual(invalidQuery.calls, ["authenticate", "authorize"]);

for (const status of ["current", "stale", "missing", "failed"] as const) {
  const result = await invoke({ service: domain(status) });
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body, domain(status));
  assert.deepEqual(result.calls, ["authenticate", "authorize", "binding", "clock", "service"]);
}

const unexpected = await invoke({
  service: () => { throw new Error("raw-error-secret-table candidate_id"); },
});
assert.equal(unexpected.response.status, 500);
assert.deepEqual(unexpected.body, { error: "internal_error" });

const malformed = await invoke({ service: { ...domain("missing"), extra: true } });
assert.equal(malformed.response.status, 500);
assert.deepEqual(malformed.body, { error: "internal_error" });

for (const result of [unauthorized, forbidden, invalidQuery, unexpected, malformed]) {
  assert.deepEqual(Object.keys(result.body as object), ["error"]);
  const serialized = JSON.stringify(result.body);
  for (const forbiddenText of [
    "candidate_id", "candidate_count", "projection_id", "content_hash",
    "state_history", "raw-error-secret-table",
  ]) assert.equal(serialized.includes(forbiddenText), false);
}

console.log("farm_os_day150_active_projection_read_server_boundary: PASS");
