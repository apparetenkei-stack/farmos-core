import assert from "node:assert/strict";

import {
  FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS,
  compareFarmOsEnvironmentIdentityHandshake,
  createFarmOsEnvironmentIdentityHandshakeMetadata,
  parseFarmOsEnvironmentIdentityHandshakeHeaders,
  serializeFarmOsEnvironmentIdentityHandshakeHeaders,
} from "../../src/lib/hermes/farm_os_environment_identity_handshake";
import {
  createFarmOsDay1505EEnvironmentManifestFixture,
} from "./lib/farm_os_day150_5_e_environment_identity_fixture";

for (const environmentClass of ["development", "staging", "production"] as const) {
  const manifest = createFarmOsDay1505EEnvironmentManifestFixture(environmentClass);
  const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(manifest);
  assert.notEqual(metadata, null);
  const headers = serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata);
  assert.notEqual(headers, null);
  const parsed = parseFarmOsEnvironmentIdentityHandshakeHeaders({
    headers: headers!,
    source: "trusted_server_transport",
  });
  assert.equal(parsed.accepted, true);
  assert.equal(compareFarmOsEnvironmentIdentityHandshake({
    expected_manifest: manifest,
    metadata: parsed.accepted ? parsed.metadata : null,
  }).result, "MATCH");
}

const manifest = createFarmOsDay1505EEnvironmentManifestFixture("staging");
const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(manifest)!;
const headers = serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata)!;

const missing: Record<string, string> = { ...headers };
delete missing[FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.environment_id];
assert.deepEqual(parseFarmOsEnvironmentIdentityHandshakeHeaders({
  headers: missing,
  source: "trusted_server_transport",
}), { accepted: false, reason: "MISSING_HEADER", field: "environment_id" });

assert.equal(parseFarmOsEnvironmentIdentityHandshakeHeaders({
  headers: {
    ...headers,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.environment_id]:
      "apparetenkei-unknown-primary",
  },
  source: "trusted_server_transport",
}).accepted, false);

const wrongVersion = parseFarmOsEnvironmentIdentityHandshakeHeaders({
  headers: {
    ...headers,
    [FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_HEADERS.manifest_version]:
      "farmos.environment-identity-manifest.v2",
  },
  source: "trusted_server_transport",
});
assert.deepEqual(wrongVersion, {
  accepted: false,
  reason: "MANIFEST_VERSION_MISMATCH",
  field: "manifest_version",
});

assert.equal(compareFarmOsEnvironmentIdentityHandshake({
  expected_manifest: manifest,
  metadata: { ...metadata, manifest_sha256: `sha256:${"0".repeat(64)}` },
}).result, "MISMATCH");
assert.equal(compareFarmOsEnvironmentIdentityHandshake({
  expected_manifest: manifest,
  metadata: { ...metadata, core_endpoint_alias: "farmos-core-production-primary" },
}).result, "MISMATCH");
assert.equal(serializeFarmOsEnvironmentIdentityHandshakeHeaders({
  ...metadata,
  core_endpoint_alias: "farmos-core-*",
}), null);
assert.equal(serializeFarmOsEnvironmentIdentityHandshakeHeaders({
  ...metadata,
  additional_property: "synthetic",
}), null);

for (const source of ["browser", "hermes"] as const) {
  assert.deepEqual(parseFarmOsEnvironmentIdentityHandshakeHeaders({
    headers,
    source,
  }), {
    accepted: false,
    reason: "UNTRUSTED_IDENTITY_SOURCE",
    field: null,
  });
}

const lowerCaseHeaders = Object.fromEntries(
  Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
);
assert.equal(parseFarmOsEnvironmentIdentityHandshakeHeaders({
  headers: lowerCaseHeaders,
  source: "trusted_server_transport",
}).accepted, true);

console.log("farm_os_day150_5_e_environment_identity_handshake: PASS");
