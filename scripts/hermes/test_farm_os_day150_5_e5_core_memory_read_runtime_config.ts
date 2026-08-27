import assert from "node:assert/strict";

import {
  FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT,
  FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY,
  FarmOsCoreMemoryReadRuntimeConfigError,
  loadFarmOsCoreMemoryStagingReadPoolConfig,
} from "../../src/lib/hermes/farm_os_core_memory_read_runtime_config";
import {
  loadFarmOsProjectionFirstLocalPostgresConfig,
} from "../../src/lib/hermes/farm_os_projection_first_production_service";

const authority = FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY;
const runtimePath = "/server-owned/core-staging-runtime-config.json";
const password = "fixture-only-core-memory-password-0000000000000000";

function runtimeConfig() {
  return {
    schema_version: authority.schema_version,
    environment_id: authority.environment_id,
    runtime_identity: authority.runtime_identity,
    installation_id: authority.installation_id,
    farm_scope: authority.farm_scope,
    business_timezone: authority.business_timezone,
    application_listener: "127.0.0.1:3100",
    manifest_path: "/server-owned/manifest.json",
    manifest_pin_path: "/server-owned/manifest.pin.json",
    manifest_sha256: authority.manifest_sha256,
    observed_identity_path: "/server-owned/observed.json",
    app_business: {
      connection_identity_path: "/server-owned/app-business.json",
      keychain_service:
        "jp.apparetenkei.farmos-core-staging.app-business-readonly",
      credential_class: "app-business-staging-readonly",
    },
    core_operational_memory: {
      listener: `${authority.host}:${authority.port}`,
      logical_name: authority.database,
      database: authority.database,
      user: authority.user,
      provider_class: authority.provider_class,
      provider_scope: authority.provider_scope,
      resource_alias: authority.resource_alias,
      resource_fingerprint: authority.resource_fingerprint,
      postgres_major: authority.postgres_major,
      keychain_service: authority.keychain_service,
      keychain_account: authority.keychain_account,
      credential_class: authority.credential_class,
    },
    production_fallback: false,
  };
}

const environment: Record<string, string | undefined> = {
  [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.staging_enabled]: "true",
  [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.runtime_config_path]: runtimePath,
  [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.password]: password,
};
const load = (candidate: unknown, environmentOverride = environment) =>
  loadFarmOsCoreMemoryStagingReadPoolConfig({
    environment: environmentOverride,
    read_file: (path) => {
      assert.equal(path, runtimePath);
      return JSON.stringify(candidate);
    },
  });
const deny = (candidate: unknown, environmentOverride = environment) =>
  assert.throws(() => load(candidate, environmentOverride),
    FarmOsCoreMemoryReadRuntimeConfigError);

const exact = load(runtimeConfig());
assert.equal(exact.host, "127.0.0.1");
assert.equal(exact.port, 55432);
assert.equal(exact.database, "farmos_core_memory_staging");
assert.equal(exact.user, "farmos_core_memory_staging_readonly");
assert.equal(exact.password, password);
assert.equal(exact.ssl, false);

for (const key of ["listener", "database", "user"] as const) {
  const candidate = runtimeConfig();
  delete (candidate.core_operational_memory as Record<string, unknown>)[key];
  deny(candidate);
}
for (const listener of ["127.0.0.1:5432", "127.0.0.1:",
  "0.0.0.0:55432", "production-db:5432"]) {
  const candidate = runtimeConfig();
  candidate.core_operational_memory.listener = listener;
  deny(candidate);
}
for (const [field, value] of [
  ["credential_class", "app-business-staging-readonly"],
  ["resource_fingerprint",
    "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69"],
  ["resource_alias", "farmos-postgres"],
] as const) {
  const candidate = runtimeConfig();
  candidate.core_operational_memory[field] = value as never;
  deny(candidate);
}
for (const [field, value] of [
  ["environment_id", "apparetenkei-production-primary"],
  ["installation_id", "apparetenkei-farmos-core-mac-01"],
  ["farm_scope", "wrong-farm"],
  ["manifest_sha256", `sha256:${"0".repeat(64)}`],
] as const) {
  const candidate = runtimeConfig();
  candidate[field] = value as never;
  deny(candidate);
}
deny(runtimeConfig(), {
  ...environment,
  [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.password]: undefined,
});
deny(runtimeConfig(), {
  ...environment,
  [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.password]:
    "postgresql://forbidden.example/secret",
});

const production = loadFarmOsProjectionFirstLocalPostgresConfig({
  FARMOS_CORE_STAGING_RUNTIME_ENABLED: "false",
  FARMOS_CORE_STAGING_RUNTIME_CONFIG_PATH: runtimePath,
  FARMOS_CORE_MEMORY_READ_PASSWORD: password,
  PGHOST: "127.0.0.1",
  PGPORT: "5432",
  POSTGRES_DB: "production-compatible-fixture",
  POSTGRES_USER: "production-compatible-fixture",
  POSTGRES_PASSWORD: "production-compatible-fixture",
});
assert.equal(production.port, 5432);
assert.equal(production.database, "production-compatible-fixture");

console.log("farm_os_day150_5_e5_core_memory_read_runtime_config: PASS");
