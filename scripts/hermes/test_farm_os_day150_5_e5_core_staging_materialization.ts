import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
  type FarmOsEnvironmentIdentityManifest,
} from "../../src/lib/hermes/farm_os_environment_identity_contract";
import {
  createFarmOsEnvironmentIdentityHandshakeMetadata,
  serializeFarmOsEnvironmentIdentityHandshakeHeaders,
} from "../../src/lib/hermes/farm_os_environment_identity_handshake";
import {
  FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS,
  FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD,
  FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS,
  FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD,
  FARM_OS_CORE_STAGING_ENVIRONMENT_ID,
  FARM_OS_CORE_STAGING_INSTALLATION_ID,
  FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT,
  FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
  FARM_OS_E4_RECONCILIATION_EVIDENCE_SHA256,
  FARM_OS_E4_RECONCILIATION_RUN,
  farmOsCoreEnvironmentIdentityRuntime,
  loadFarmOsCoreStagingEnvironmentIdentityRuntime,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";
import {
  createFarmOsDay1505ERuntimeIdentityFixture,
  createMutableFarmOsDay1505EEnvironmentManifestFixture,
} from "./lib/farm_os_day150_5_e_environment_identity_fixture";

assert.equal(farmOsCoreEnvironmentIdentityRuntime.state, "STARTUP_BLOCK");
assert.equal(FARM_OS_CORE_STAGING_ENVIRONMENT_ID,
  "apparetenkei-staging-primary");
assert.equal(FARM_OS_CORE_STAGING_INSTALLATION_ID,
  "apparetenkei-farmos-core-staging-01");
assert.equal(FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
  "farmos-core-staging-primary");
assert.equal(FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD, "20260807000000");
assert.equal(FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS,
  "app-business-staging-readonly");
assert.equal(FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS,
  "core-memory-staging-readonly");
assert.equal(FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD,
  "202608110001_production_target_execution_durability");
assert.equal(FARM_OS_E4_RECONCILIATION_RUN,
  "20260825T230921Z-2cf32bfc-a3c1-419d-bbfd-5862fb8ba4f1");
assert.equal(FARM_OS_E4_RECONCILIATION_EVIDENCE_SHA256,
  "sha256:d3fada060d010033c0cad527e25f8486532c5c821b82145fb2ae8ae86d099275");

const materializationBundle = JSON.parse(readFileSync(new URL(
  "../../artifacts/day150-5/e5/core-staging-materialization.bundle.json",
  import.meta.url,
), "utf8")) as Record<string, unknown>;
assert.equal(materializationBundle.status,
  "CORE_STAGING_LOCAL_MATERIALIZATION_PASS_EXTERNAL_ENDPOINT_REQUIRED");
const bundleIdentity = materializationBundle.canonical_identity as
  Record<string, unknown>;
assert.equal(bundleIdentity.installation_id,
  FARM_OS_CORE_STAGING_INSTALLATION_ID);
assert.match(String(bundleIdentity.environment_manifest_sha256),
  /^sha256:[0-9a-f]{64}$/u);
assert.equal(bundleIdentity.environment_manifest_sha256_status,
  "MATERIALIZED_EXTERNAL_PIN_VERIFIED");
const stagingDatabase = materializationBundle.staging_database as
  Record<string, unknown>;
const stagingBindings = stagingDatabase.bindings as Record<
  string,
  Record<string, unknown>
>;
assert.equal(stagingBindings.app_business.logical_name,
  "apparetenkei-staging-primary");
assert.equal(stagingBindings.app_business.credential_class,
  "app-business-staging-readonly");
assert.equal(stagingBindings.app_business.resource_fingerprint,
  "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69");
assert.equal(stagingBindings.core_operational_memory.resource_fingerprint,
  "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767");
assert.equal(stagingBindings.core_operational_memory.migration_head,
  FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD);
const schemaBootstrap = materializationBundle.core_memory_schema_bootstrap as
  Record<string, unknown>;
assert.equal(schemaBootstrap.committed_migration_count, 6);
assert.equal(schemaBootstrap.rollback_verified, true);
assert.equal(schemaBootstrap.status, "FRESH_BASELINE_REPLAY_VERIFIED");
const providerDiscovery = materializationBundle.provider_discovery as
  Record<string, Record<string, unknown>>;
assert.equal(
  providerDiscovery.production_app_business_deny.resource_fingerprint,
  "sha256:26783e0e593e7d714588d4cb2980be33b9ea21db24ae9dee788224769a54e48f",
);
assert.equal(
  String(stagingBindings.app_business.resource_fingerprint) ===
    String(providerDiscovery.production_app_business_deny.resource_fingerprint),
  false,
);

const manifestPath = "/server-owned/farmos-core-staging-manifest.json";
const pinPath = "/server-owned/farmos-core-staging-manifest.pin.json";
const runtimePath = "/server-owned/farmos-core-staging-runtime.json";
const environment = {
  [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.enabled]: "true",
  [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity]:
    FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
  [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_path]: manifestPath,
  [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_pin_path]: pinPath,
  [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity_path]: runtimePath,
};

function completeCandidate(): Record<string, unknown> {
  const candidate = createMutableFarmOsDay1505EEnvironmentManifestFixture(
    "staging",
  );
  candidate.installation_id = FARM_OS_CORE_STAGING_INSTALLATION_ID;
  const bindings = candidate.database_bindings as Record<string, unknown>;
  const appBusiness = bindings.app_business as Record<string, unknown>;
  appBusiness.migration_head = FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD;
  appBusiness.credential_class = FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS;
  const coreMemory = bindings.core_operational_memory as Record<string, unknown>;
  coreMemory.logical_name = "farmos_core_memory_staging";
  coreMemory.provider_class = "containerized_postgres";
  coreMemory.resource_fingerprint =
    "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767";
  coreMemory.migration_head = FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD;
  coreMemory.credential_class = FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS;
  appBusiness.logical_name = "apparetenkei-staging-primary";
  appBusiness.provider_class = "managed_postgres";
  appBusiness.resource_fingerprint =
    "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69";
  return candidate;
}

function loadCandidate(candidate: unknown, pinOverride?: string) {
  const parsed = parseFarmOsEnvironmentIdentityManifest(candidate);
  const digest = digestFarmOsEnvironmentIdentityManifest(candidate);
  const observed = parsed === null ? {} :
    createFarmOsDay1505ERuntimeIdentityFixture(parsed);
  const files = new Map<string, string>([
    [manifestPath, JSON.stringify(candidate)],
    [pinPath, JSON.stringify({ manifest_sha256: pinOverride ?? digest })],
    [runtimePath, JSON.stringify(observed)],
  ]);
  return loadFarmOsCoreStagingEnvironmentIdentityRuntime({
    environment,
    read_file: (path) => {
      const value = files.get(path);
      if (value === undefined) throw new Error("fixture_file_missing");
      return value;
    },
  });
}

let offlinePassed = 0;
const offline = (condition: boolean, message: string) => {
  assert.equal(condition, true, message);
  offlinePassed += 1;
};

const candidate = completeCandidate();
const manifest = parseFarmOsEnvironmentIdentityManifest(candidate);
offline(manifest !== null, "canonical complete staging payload schema PASS");
offline(manifest?.installation_id === FARM_OS_CORE_STAGING_INSTALLATION_ID,
  "Staging installation identity is exact");
const productionManifest = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "production",
);
offline(productionManifest.installation_id ===
  "apparetenkei-farmos-core-mac-01",
"Production installation identity remains unchanged");
const digestOne = digestFarmOsEnvironmentIdentityManifest(candidate);
const digestTwo = digestFarmOsEnvironmentIdentityManifest(
  structuredClone(candidate),
);
offline(digestOne !== null && digestOne === digestTwo,
  "canonical JSON hash is deterministic");
offline(loadCandidate(candidate).state === "READY",
  "complete payload starts only with matching external pin");
offline(loadCandidate(candidate,
  FARM_OS_E4_RECONCILIATION_EVIDENCE_SHA256).state === "STARTUP_BLOCK",
"E4 reconciliation Evidence SHA is denied as Environment Manifest pin");

const oldStagingInstallation = completeCandidate();
oldStagingInstallation.installation_id = "apparetenkei-farmos-core-mac-01";
offline(loadCandidate(oldStagingInstallation).state === "STARTUP_BLOCK",
  "cross-environment installation identity mismatch is denied");

const missingAppFingerprint = completeCandidate();
delete (((missingAppFingerprint.database_bindings as Record<string, unknown>)
  .app_business as Record<string, unknown>).resource_fingerprint);
offline(loadCandidate(missingAppFingerprint).state === "STARTUP_BLOCK",
  "missing app_business fingerprint blocks startup");

const missingMemoryFingerprint = completeCandidate();
delete (((missingMemoryFingerprint.database_bindings as Record<string, unknown>)
  .core_operational_memory as Record<string, unknown>).resource_fingerprint);
offline(loadCandidate(missingMemoryFingerprint).state === "STARTUP_BLOCK",
  "missing core_operational_memory fingerprint blocks startup");

const productionDatabase = completeCandidate();
(((productionDatabase.database_bindings as Record<string, unknown>)
  .app_business as Record<string, unknown>).logical_name) =
  "app_business_production";
offline(loadCandidate(productionDatabase).state === "STARTUP_BLOCK",
  "Production database identity is denied");

const reusedCredential = completeCandidate();
const reusedBindings = reusedCredential.database_bindings as
  Record<string, Record<string, unknown>>;
reusedBindings.core_operational_memory.credential_class =
  reusedBindings.app_business.credential_class;
offline(loadCandidate(reusedCredential).state === "STARTUP_BLOCK",
  "credential class reuse contrary to contract is denied");

const wrongCredentialClass = completeCandidate();
(((wrongCredentialClass.database_bindings as Record<string, unknown>)
  .core_operational_memory as Record<string, unknown>).credential_class) =
  "core-memory-development-readonly";
offline(loadCandidate(wrongCredentialClass).state === "STARTUP_BLOCK",
  "non-canonical Staging credential class is denied");

offline(loadCandidate(candidate, `sha256:${"0".repeat(64)}`).state ===
  "STARTUP_BLOCK", "payload SHA mismatch blocks startup");

const secretBearing = completeCandidate();
(secretBearing.database_bindings as Record<string, unknown>).password =
  "fixture-redacted";
offline(parseFarmOsEnvironmentIdentityManifest(secretBearing) === null &&
  loadCandidate(secretBearing).state === "STARTUP_BLOCK",
"secret field is denied");

const readyRuntime = loadCandidate(candidate);
const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(
  manifest as FarmOsEnvironmentIdentityManifest,
);
const headers = serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata);
assert.notEqual(headers, null);
const request = (value: Readonly<Record<string, string>>) =>
  new Request("https://staging-core.invalid/api/hermes/test", {
    headers: value,
  });
assert.equal(readyRuntime.verifyRequest({
  request: request(headers!),
  transport_authority: "authenticated_server_transport",
}).decision, "ALLOW");

const mismatchCases: Array<Record<string, string>> = [
  { ...headers!, "X-FarmOS-Environment-Id":
    "apparetenkei-production-primary" },
  { ...headers!, "X-FarmOS-Installation-Id": "wrong-installation" },
  { ...headers!, "X-Farm-Id": "wrong-farm" },
  { ...headers!, "X-FarmOS-Environment-Manifest-SHA256":
    `sha256:${"0".repeat(64)}` },
  { ...headers!, "X-FarmOS-Core-Endpoint-Alias":
    "farmos-core-production-primary" },
  { ...headers! },
];
delete mismatchCases[5]["X-FarmOS-Environment-Id"];
for (const mismatch of mismatchCases) {
  assert.notEqual(readyRuntime.verifyRequest({
    request: request(mismatch),
    transport_authority: "authenticated_server_transport",
  }).decision, "ALLOW");
}

let disabledReads = 0;
assert.equal(loadFarmOsCoreStagingEnvironmentIdentityRuntime({
  environment: { ...environment,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.enabled]: "false" },
  read_file: () => {
    disabledReads += 1;
    return "{}";
  },
}).state, "STARTUP_BLOCK");
assert.equal(disabledReads, 0);

console.log(JSON.stringify({
  test: "farm_os_day150_5_e5_core_staging_materialization",
  offline_passed: offlinePassed,
  offline_total: 14,
  fixture_staging_runtime_ready: true,
  handshake_happy_path: "PASS",
  mismatch_passed: mismatchCases.length,
  mismatch_total: mismatchCases.length,
  production_manifest_selectable: false,
  production_fallback_count: 0,
  external_network_calls: 0,
  assertions: "PASS",
}));
