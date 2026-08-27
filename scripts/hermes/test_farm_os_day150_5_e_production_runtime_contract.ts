import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_ENVIRONMENT_EGRESS_POLICY,
  FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
  FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
  FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES,
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
} from "../../src/lib/hermes/farm_os_environment_identity_contract";
import {
  createFarmOsEnvironmentIdentityHandshakeMetadata,
  serializeFarmOsEnvironmentIdentityHandshakeHeaders,
} from "../../src/lib/hermes/farm_os_environment_identity_handshake";
import {
  FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT,
  FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR,
  FARM_OS_CORE_RUNTIME_PROFILES,
  FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT,
  loadFarmOsCoreSelectedEnvironmentIdentityRuntime,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";
import { createFarmOsActiveProjectionReadAuthentication } from
  "../../src/lib/hermes/farm_os_active_projection_read_authentication";
import {
  createFarmOsDay1505ERuntimeIdentityFixture,
} from "./lib/farm_os_day150_5_e_environment_identity_fixture";
import { compileFarmOsCoreProductionRuntimeMaterialization } from
  "./run_farm_os_day150_5_e_production_environment_manifest_materialization";

type RuntimeEnvironment = "staging" | "production";
const PATHS = Object.freeze({
  manifest: "/server-owned/manifest.json",
  pin: "/server-owned/manifest.pin.json",
  observed: "/server-owned/observed.json",
});

function stagingManifest() {
  const profile = FARM_OS_CORE_RUNTIME_PROFILES.staging;
  const candidate = {
    manifest_version: FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
    environment_id: profile.environment_id,
    environment_class: profile.environment_class,
    installation_id: profile.installation_id,
    farm_scope: profile.farm_scope,
    business_timezone: profile.business_timezone,
    core_endpoint_alias: profile.runtime_identity,
    allowed_endpoint_aliases: [...profile.allowed_endpoint_aliases],
    database_bindings: {
      app_business: { ...profile.app_business },
      core_operational_memory: { ...profile.core_operational_memory },
    },
    integration_identities: [
      FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES.staging,
    ],
    egress_environment_policy: FARM_OS_ENVIRONMENT_EGRESS_POLICY,
    contract_versions: {
      environment_identity_handshake:
        FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    },
    provenance: {
      authority_id: "farmos.day150-5-e5.staging-environment-authority.v1",
      revision: 1,
      source_commit: "72ceaa6f779e875776d2f916c1fa003d08fb3528",
      source_path:
        "artifacts/day150-5/ef1-e/environment-identity-manifest.v1.schema.json",
    },
  };
  assert.equal(digestFarmOsEnvironmentIdentityManifest(candidate),
    profile.manifest_sha256);
  return candidate;
}

function productionManifest() {
  return structuredClone(
    compileFarmOsCoreProductionRuntimeMaterialization("/server-owned")
      .manifest,
  ) as unknown as Record<string, unknown>;
}

function environment(selected: RuntimeEnvironment) {
  return selected === "staging" ? {
    [FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR]: "staging",
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.enabled]: "true",
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity]:
      FARM_OS_CORE_RUNTIME_PROFILES.staging.runtime_identity,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_path]: PATHS.manifest,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_pin_path]: PATHS.pin,
    [FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity_path]:
      PATHS.observed,
  } : {
    [FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR]: "production",
    [FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT.runtime_identity]:
      FARM_OS_CORE_RUNTIME_PROFILES.production.runtime_identity,
    [FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT.manifest_path]: PATHS.manifest,
    [FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT.manifest_pin_path]: PATHS.pin,
    [FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT.runtime_identity_path]:
      PATHS.observed,
  };
}

function load(selected: RuntimeEnvironment, candidate: unknown,
  pinOverride?: string) {
  const parsed = parseFarmOsEnvironmentIdentityManifest(candidate);
  const digest = digestFarmOsEnvironmentIdentityManifest(candidate);
  const observed = parsed === null ? {} :
    createFarmOsDay1505ERuntimeIdentityFixture(parsed);
  const files = new Map<string, string>([
    [PATHS.manifest, JSON.stringify(candidate)],
    [PATHS.pin, JSON.stringify({ manifest_sha256: pinOverride ?? digest })],
    [PATHS.observed, JSON.stringify(observed)],
  ]);
  return loadFarmOsCoreSelectedEnvironmentIdentityRuntime({
    environment: environment(selected),
    read_file: (path) => {
      const value = files.get(path);
      if (value === undefined) throw new Error("fixture_file_missing");
      return value;
    },
  });
}

const staging = stagingManifest();
const production = productionManifest();
assert.equal(load("staging", staging).state, "READY");
assert.equal(load("production", production).state, "READY");
assert.equal(load("production", staging).state, "STARTUP_BLOCK");
assert.equal(load("staging", production).state, "STARTUP_BLOCK");

for (const selected of [undefined, "development", "unknown"] as const) {
  let reads = 0;
  assert.equal(loadFarmOsCoreSelectedEnvironmentIdentityRuntime({
    environment: {
      ...environment("production"),
      [FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR]: selected,
    },
    read_file: () => {
      reads += 1;
      return "{}";
    },
  }).state, "STARTUP_BLOCK");
  assert.equal(reads, 0);
}

for (const [field, value] of [
  ["installation_id", "wrong-installation"],
  ["farm_scope", "wrong-farm"],
  ["core_endpoint_alias", "farmos-core-staging-primary"],
] as const) {
  const candidate = structuredClone(production);
  candidate[field] = value;
  assert.equal(load("production", candidate).state, "STARTUP_BLOCK");
}
assert.equal(load("production", production,
  `sha256:${"0".repeat(64)}`).state, "STARTUP_BLOCK");

const productionParsed = parseFarmOsEnvironmentIdentityManifest(production);
assert.notEqual(productionParsed, null);
const productionRuntime = load("production", production);
assert.equal(productionRuntime.prepareOutboundRequest({
  target_environment_id: "apparetenkei-production-primary",
  target_installation_id: "apparetenkei-farmos-core-mac-01",
  target_farm_scope: "apparetenkei-primary-farm",
  target_endpoint_alias: "farmos-core-staging-primary",
}).decision, "DENY");
const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(
  productionParsed!,
);
const headers = serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata);
assert.notEqual(headers, null);
assert.equal(productionRuntime.verifyOutboundResponse(
  new Headers(headers!),
).decision, "ALLOW");

const authentication = createFarmOsActiveProjectionReadAuthentication({
  environment: {
    HERMES_ACTIVE_PROJECTION_READ_TOKEN:
      "fixture-production-token-00000000000000000000000000000000",
    HERMES_ACTIVE_PROJECTION_READ_PRINCIPAL_REF:
      "farmos-core-production-active-projection-reader",
    HERMES_ACTIVE_PROJECTION_READ_ROLE: "administrator",
    HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS:
      '["active_projection_read"]',
  },
});
assert.equal((await authentication.authenticate(new Request(
  "https://production-core.invalid/api/hermes/daily-operational-projection/active",
  { headers: headers! },
))).result, "unauthorized");

const wrapper = readFileSync(new URL(
  "./run_farm_os_day150_5_e_production_core.sh",
  import.meta.url,
), "utf8");
const launcher = readFileSync(new URL(
  "./run_farm_os_day150_5_e_production_core.mjs",
  import.meta.url,
), "utf8");
const plist = readFileSync(new URL(
  "../../artifacts/day150-5/e5/com.apparetenkei.farmos-core.production.plist.template",
  import.meta.url,
), "utf8");
assert.match(wrapper,
  /jp\.apparetenkei\.farmos-core-production\.core-memory-readonly/u);
assert.doesNotMatch(wrapper, /farmos-core-staging/u);
assert.match(launcher, /FARMOS_PRODUCTION_ACTIVE_PROJECTION_AUTHORITY_PATH/u);
assert.match(plist, /<string>com\.apparetenkei\.farmos-core<\/string>/u);
assert.match(plist, /<string>production<\/string>/u);
assert.doesNotMatch(plist, /<string>[^<]*(?:password|token)[^<]*<\/string>/iu);

console.log(JSON.stringify({
  test: "farm_os_day150_5_e_production_runtime_contract",
  staging_selector: "PASS",
  production_selector: "PASS",
  missing_unknown_selector_fail_closed: 3,
  reciprocal_manifest_denies: 2,
  production_identity_mismatch_denies: 4,
  production_endpoint_deny: "PASS",
  reciprocal_identity: "PASS",
  identity_headers_alone_authentication: "DENY",
  production_fallback_count: 0,
  assertions: "PASS",
}));
