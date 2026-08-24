import assert from "node:assert/strict";

import {
  appendFarmOsCoreObservedIdentityHeaders,
  createFarmOsCoreEnvironmentIdentityFixtureRuntime,
  loadFarmOsCoreEnvironmentIdentityRuntime,
  runFarmOsCoreEnvironmentIdentityProtectedHandler,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";
import {
  fetchFarmOsCoreEnvironmentIdentityBound,
} from "../../src/lib/hermes/farm_os_core_environment_identity_outbound";
import {
  serveFarmOsActiveProjectionRead,
  type FarmOsActiveProjectionReadServerDependencies,
} from "../../src/lib/hermes/farm_os_active_projection_read_server_boundary";
import {
  FARM_OS_HERMES_CHAT_ENVIRONMENT_HANDSHAKE_ACTIVATION,
} from "../../src/app/api/hermes/chat/route";
import {
  createFarmOsEnvironmentIdentityHandshakeMetadata,
  serializeFarmOsEnvironmentIdentityHandshakeHeaders,
} from "../../src/lib/hermes/farm_os_environment_identity_handshake";
import {
  createFarmOsDay1505EEnvironmentManifestFixture,
  createFarmOsDay1505ERuntimeIdentityFixture,
} from "./lib/farm_os_day150_5_e_environment_identity_fixture";

function fixture(environmentClass: "development" | "staging" | "production") {
  const manifest = createFarmOsDay1505EEnvironmentManifestFixture(environmentClass);
  const observed = createFarmOsDay1505ERuntimeIdentityFixture(manifest);
  const runtime = createFarmOsCoreEnvironmentIdentityFixtureRuntime({
    manifest,
    observed_identity: observed,
  });
  const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(manifest);
  const headers = serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata);
  assert.notEqual(headers, null);
  return { manifest, runtime, headers: headers! };
}

assert.equal(FARM_OS_HERMES_CHAT_ENVIRONMENT_HANDSHAKE_ACTIVATION,
  "DEFERRED_PENDING_AUTHENTICATED_SERVER_TRANSPORT");

function request(headers: Readonly<Record<string, string>>): Request {
  return new Request("https://core.invalid/api/hermes/test", { headers });
}

for (const environmentClass of ["development", "staging", "production"] as const) {
  const { runtime, headers } = fixture(environmentClass);
  assert.equal(runtime.state, "READY");
  assert.equal(runtime.verifyRequest({
    request: request(headers),
    transport_authority: "authenticated_server_transport",
  }).decision, "ALLOW");
}

assert.equal(loadFarmOsCoreEnvironmentIdentityRuntime({
  manifest_loader: () => null,
  observed_identity_loader: () => null,
}).state, "STARTUP_BLOCK");

{
  const { manifest } = fixture("development");
  const observed = createFarmOsDay1505ERuntimeIdentityFixture(manifest);
  const runtime = createFarmOsCoreEnvironmentIdentityFixtureRuntime({
    manifest,
    observed_identity: { ...observed, farm_scope: "wrong-farm" },
  });
  assert.equal(runtime.state, "STARTUP_BLOCK");
}

const development = fixture("development");
const deniedCases: Array<Readonly<Record<string, string>>> = [];
const missing = { ...development.headers };
delete missing["X-FarmOS-Environment-Id"];
deniedCases.push(missing);
deniedCases.push({ ...development.headers,
  "X-FarmOS-Environment-Id": "apparetenkei-unknown-primary" });
deniedCases.push({ ...development.headers,
  "X-FarmOS-Environment-Id": "apparetenkei-staging-primary" });
deniedCases.push({ ...development.headers,
  "X-FarmOS-Installation-Id": "wrong-installation" });
deniedCases.push({ ...development.headers, "X-Farm-Id": "wrong-farm" });
deniedCases.push({ ...development.headers,
  "X-FarmOS-Environment-Manifest-Version":
    "farmos.environment-identity-manifest.v2" });
deniedCases.push({ ...development.headers,
  "X-FarmOS-Environment-Manifest-SHA256": `sha256:${"0".repeat(64)}` });
deniedCases.push({ ...development.headers,
  "X-FarmOS-Core-Endpoint-Alias": "farmos-core-production-primary" });

for (const headers of deniedCases) {
  assert.notEqual(development.runtime.verifyRequest({
    request: request(headers),
    transport_authority: "authenticated_server_transport",
  }).decision, "ALLOW");
}
for (const source of ["browser", "hermes"] as const) {
  assert.deepEqual(development.runtime.verifyRequest({
    request: request(development.headers),
    transport_authority: source,
  }), { decision: "DENY", reason: "UNTRUSTED_TRANSPORT" });
}

for (const use of ["database", "provider", "integration"] as const) {
  let invoked = 0;
  const result = await runFarmOsCoreEnvironmentIdentityProtectedHandler({
    runtime: development.runtime,
    request: request(missing),
    transport_authority: "authenticated_server_transport",
    use,
    handler: async () => {
      invoked += 1;
      return "unreachable";
    },
  });
  assert.equal(result.decision.decision, "DENY");
  assert.equal(result.value, null);
  assert.equal(invoked, 0);
}

let allowedHandlerCalls = 0;
const allowedHandler = await runFarmOsCoreEnvironmentIdentityProtectedHandler({
  runtime: development.runtime,
  request: request(development.headers),
  transport_authority: "authenticated_server_transport",
  use: "provider",
  handler: async () => {
    allowedHandlerCalls += 1;
    return new Response("ok", { headers: { "X-Untrusted-Echo": "absent" } });
  },
});
assert.equal(allowedHandler.decision.decision, "ALLOW");
assert.equal(allowedHandlerCalls, 1);
assert.notEqual(allowedHandler.value, null);
const response = appendFarmOsCoreObservedIdentityHeaders(
  allowedHandler.value!,
  allowedHandler.decision,
);
assert.equal(response.headers.get("X-FarmOS-Environment-Id"),
  development.manifest.environment_id);
assert.equal(response.headers.get("X-Farm-Id"), development.manifest.farm_scope);

let outboundCalls = 0;
const rejectedOutbound = await fetchFarmOsCoreEnvironmentIdentityBound({
  runtime: development.runtime,
  target: {
    environment_id: development.manifest.environment_id,
    installation_id: development.manifest.installation_id,
    farm_scope: development.manifest.farm_scope,
    endpoint_alias: "unapproved-endpoint",
  },
  url: new URL("https://app.invalid/read"),
  init: { method: "GET" },
  fetchImpl: async () => {
    outboundCalls += 1;
    return new Response(null, { status: 200 });
  },
});
assert.deepEqual(rejectedOutbound, {
  result: "DENY",
  response: null,
  fetch_performed: false,
  reason: "TARGET_IDENTITY_REJECTED",
});
assert.equal(outboundCalls, 0);

const acceptedOutbound = await fetchFarmOsCoreEnvironmentIdentityBound({
  runtime: development.runtime,
  target: {
    environment_id: development.manifest.environment_id,
    installation_id: development.manifest.installation_id,
    farm_scope: development.manifest.farm_scope,
    endpoint_alias: development.manifest.core_endpoint_alias,
  },
  url: new URL("https://app.invalid/read"),
  init: { method: "GET", headers: { "X-Farm-Id": "browser-supplied" } },
  fetchImpl: async (_url, init) => {
    outboundCalls += 1;
    const sent = new Headers(init?.headers);
    assert.equal(sent.get("X-Farm-Id"), development.manifest.farm_scope);
    return new Response("ok", { status: 200, headers: development.headers });
  },
});
assert.equal(acceptedOutbound.result, "ALLOW");
assert.equal(outboundCalls, 1);

const rejectedResponseIdentity = await fetchFarmOsCoreEnvironmentIdentityBound({
  runtime: development.runtime,
  target: {
    environment_id: development.manifest.environment_id,
    installation_id: development.manifest.installation_id,
    farm_scope: development.manifest.farm_scope,
    endpoint_alias: development.manifest.core_endpoint_alias,
  },
  url: new URL("https://app.invalid/read"),
  init: { method: "GET" },
  fetchImpl: async () => new Response("untrusted", {
    status: 200,
    headers: { ...development.headers, "X-Farm-Id": "wrong-farm" },
  }),
});
assert.deepEqual(rejectedResponseIdentity, {
  result: "DENY",
  response: null,
  fetch_performed: true,
  reason: "RESPONSE_IDENTITY_REJECTED",
});

const production = fixture("production");
assert.equal(production.runtime.prepareOutboundRequest({
  target_environment_id: production.manifest.environment_id,
  target_installation_id: production.manifest.installation_id,
  target_farm_scope: production.manifest.farm_scope,
  target_endpoint_alias: production.manifest.core_endpoint_alias,
}).decision, "ALLOW");

{
  const calls: string[] = [];
  const principal = "e2-a-active-reader";
  const activeDependencies: FarmOsActiveProjectionReadServerDependencies = {
    authenticate: async () => {
      calls.push("authenticate");
      return { result: "authenticated", principal_ref: principal };
    },
    authorize: async () => {
      calls.push("authorize");
      return {
        result: "authorized",
        actor: {
          schema_version: "farmos.active_projection_read.actor_evidence.v1",
          principal_ref: principal,
          role: "administrator",
          allowed_scope_keys: ["active_projection_read"],
          authorization_verified: true,
          authentication_method: "bearer",
          server_owned: true,
        },
      };
    },
    installation_binding_loader: () => {
      calls.push("binding");
      return {
        installation_id: development.manifest.installation_id,
        farm_scope: development.manifest.farm_scope,
        timezone: "Asia/Tokyo",
      };
    },
    clock: () => "2026-08-24T00:00:00.000Z",
    read_service: async () => {
      calls.push("database");
      return {
        schema_version:
          "farmos.daily_operational_projection.active_read_response.v1",
        status: "missing",
        payload: null,
        generated_at: null,
      };
    },
    environment_identity: development.runtime,
  };
  const denied = await serveFarmOsActiveProjectionRead({
    request: new Request(
      "https://core.invalid/api/hermes/daily-operational-projection/active",
      { headers: missing },
    ),
    dependencies: activeDependencies,
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(calls, ["authenticate"]);

  calls.length = 0;
  const accepted = await serveFarmOsActiveProjectionRead({
    request: new Request(
      "https://core.invalid/api/hermes/daily-operational-projection/active",
      { headers: development.headers },
    ),
    dependencies: activeDependencies,
  });
  assert.equal(accepted.status, 200);
  assert.deepEqual(calls, ["authenticate", "authorize", "binding", "database"]);
  assert.equal(accepted.headers.get("X-FarmOS-Environment-Id"),
    development.manifest.environment_id);
  assert.equal(accepted.headers.get("X-Farm-Id"),
    development.manifest.farm_scope);
}

console.log("farm_os_day150_5_e2_a_core_runtime_identity: PASS");
