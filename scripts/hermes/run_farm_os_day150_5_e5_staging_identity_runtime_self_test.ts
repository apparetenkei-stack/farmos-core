import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createFarmOsEnvironmentIdentityHandshakeMetadata,
  serializeFarmOsEnvironmentIdentityHandshakeHeaders,
} from "../../src/lib/hermes/farm_os_environment_identity_handshake";
import { parseFarmOsEnvironmentIdentityManifest } from
  "../../src/lib/hermes/farm_os_environment_identity_contract";
import {
  FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT,
  FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
  loadFarmOsCoreStagingEnvironmentIdentityRuntime,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";

const directory = join(homedir(), "Library/Application Support/FarmOS/staging/e5");
const manifestPath = join(directory, "environment-identity-manifest.v1.json");
const pinPath = join(directory, "environment-identity-manifest.v1.pin.json");
const observedPath = join(directory, "core-staging-observed-identity.json");
const manifest = parseFarmOsEnvironmentIdentityManifest(JSON.parse(
  readFileSync(manifestPath, "utf8")));
if (manifest === null) throw new Error("CORE_STAGING_MANIFEST_SELF_TEST_INVALID");
const runtime = loadFarmOsCoreStagingEnvironmentIdentityRuntime({
  environment: {
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.enabled]: "true",
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity]:
      FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_path]: manifestPath,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_pin_path]: pinPath,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity_path]: observedPath,
  },
  read_file: (path) => readFileSync(path, "utf8"),
});
if (runtime.state !== "READY") throw new Error("CORE_STAGING_RUNTIME_STARTUP_BLOCKED");
const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(manifest);
const headers = serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata);
if (headers === null) throw new Error("CORE_STAGING_HANDSHAKE_METADATA_INVALID");
const request = (values: Record<string, string>) => new Request(
  "https://farmos-core-staging.invalid/identity-self-test", { headers: values });
if (runtime.verifyRequest({
  request: request(headers), transport_authority: "authenticated_server_transport",
}).decision !== "ALLOW") throw new Error("CORE_STAGING_HANDSHAKE_HAPPY_PATH_FAILED");
const mismatchFields = [
  ["X-FarmOS-Environment-Id", "apparetenkei-production-primary"],
  ["X-FarmOS-Installation-Id", "wrong-installation"],
  ["X-Farm-Id", "wrong-farm"],
  ["X-FarmOS-Environment-Manifest-SHA256", `sha256:${"0".repeat(64)}`],
  ["X-FarmOS-Core-Endpoint-Alias", "farmos-core-production-primary"],
] as const;
for (const [name, value] of mismatchFields) {
  if (runtime.verifyRequest({
    request: request({ ...headers, [name]: value }),
    transport_authority: "authenticated_server_transport",
  }).decision === "ALLOW") throw new Error(`CORE_STAGING_HANDSHAKE_MISMATCH_ALLOWED:${name}`);
}
console.log(JSON.stringify({
  status: "CORE_STAGING_IDENTITY_RUNTIME_SELF_TEST_PASS",
  runtime_state: runtime.state,
  handshake_happy_path: "PASS",
  mismatch_deny_count: mismatchFields.length,
  production_endpoint_deny: "PASS",
  external_network_calls: 0,
}));
