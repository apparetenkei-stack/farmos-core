import assert from "node:assert/strict";

import {
  FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY,
  FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT,
  FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY,
  FarmOsCoreMemoryReadRuntimeConfigError,
  loadFarmOsCoreMemorySelectedReadPoolConfig,
  loadFarmOsCoreMemoryStagingReadPoolConfig,
} from "../../src/lib/hermes/farm_os_core_memory_read_runtime_config";
import {
  FARM_OS_PROJECTION_FIRST_DATABASE_CONFIGURATION_ERROR,
  loadFarmOsProjectionFirstLocalPostgresConfig,
} from "../../src/lib/hermes/farm_os_projection_first_production_service";

const password = "fixture-only-core-memory-password-0000000000000000";
type Authority = typeof FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY |
  typeof FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY;

function runtimeConfig(authority: Authority) {
  return {
    schema_version: authority.schema_version,
    environment_id: authority.environment_id,
    runtime_identity: authority.runtime_identity,
    installation_id: authority.installation_id,
    farm_scope: authority.farm_scope,
    business_timezone: authority.business_timezone,
    application_listener: authority.application_listener,
    manifest_path: "/server-owned/manifest.json",
    manifest_pin_path: "/server-owned/manifest.pin.json",
    manifest_sha256: authority.manifest_sha256,
    observed_identity_path: "/server-owned/observed.json",
    app_business: {
      connection_identity_path: "/server-owned/app-business.json",
      credential_class: `app-business-${authority.runtime_environment}-readonly`,
      runtime_connection_authority: "NOT_INJECTED",
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

function environment(authority: Authority) {
  return {
    [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.selector]:
      authority.runtime_environment,
    [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.staging_enabled]:
      authority.runtime_environment === "staging" ? "true" : undefined,
    [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT
      .staging_runtime_config_path]: authority.runtime_environment === "staging"
        ? "/server-owned/runtime.json"
        : undefined,
    [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT
      .production_runtime_config_path]:
        authority.runtime_environment === "production"
          ? "/server-owned/runtime.json"
          : undefined,
    [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.password]: password,
  };
}

function load(authority: Authority, candidate: unknown) {
  return loadFarmOsCoreMemorySelectedReadPoolConfig({
    environment: environment(authority),
    read_file: (path) => {
      assert.equal(path, "/server-owned/runtime.json");
      return JSON.stringify(candidate);
    },
  });
}
function deny(authority: Authority, candidate: unknown) {
  assert.throws(() => load(authority, candidate),
    FarmOsCoreMemoryReadRuntimeConfigError);
}

const staging = load(
  FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY,
  runtimeConfig(FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY),
);
assert.equal(staging.port, 55432);
assert.equal(staging.database, "farmos_core_memory_staging");
assert.equal(staging.options, "-c default_transaction_read_only=on");
assert.equal(loadFarmOsCoreMemoryStagingReadPoolConfig({
  environment: environment(FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY),
  read_file: () => JSON.stringify(runtimeConfig(
    FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY,
  )),
}).port, 55432);

const production = load(
  FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY,
  runtimeConfig(FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY),
);
assert.equal(production.host, "127.0.0.1");
assert.equal(production.port, 55433);
assert.equal(production.database, "farmos_core_prod");
assert.equal(production.password, password);
assert.equal(production.options, "-c default_transaction_read_only=on");

deny(FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY,
  runtimeConfig(FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY));
deny(FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY,
  runtimeConfig(FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY));
for (const [field, value] of [
  ["listener", "127.0.0.1:55432"],
  ["resource_fingerprint",
    FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY.resource_fingerprint],
  ["credential_class",
    FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY.credential_class],
] as const) {
  const candidate = runtimeConfig(FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY);
  candidate.core_operational_memory[field] = value as never;
  deny(FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY, candidate);
}
for (const selector of [undefined, "development", "unknown"] as const) {
  assert.throws(() => loadFarmOsCoreMemorySelectedReadPoolConfig({
    environment: {
      ...environment(FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY),
      [FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.selector]: selector,
    },
    read_file: () => JSON.stringify(runtimeConfig(
      FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY,
    )),
  }), FarmOsCoreMemoryReadRuntimeConfigError);
}
assert.throws(() => loadFarmOsProjectionFirstLocalPostgresConfig({
  PGHOST: "127.0.0.1",
  PGPORT: "5432",
  POSTGRES_DB: "legacy-fallback",
  POSTGRES_USER: "legacy-fallback",
  POSTGRES_PASSWORD: "legacy-fallback",
}), (error: unknown) => error instanceof Error &&
  error.message === FARM_OS_PROJECTION_FIRST_DATABASE_CONFIGURATION_ERROR);

console.log(JSON.stringify({
  test: "farm_os_day150_5_e5_core_memory_read_runtime_config",
  staging_profile: "PASS",
  production_profile: "PASS",
  cross_environment_denies: 2,
  wrong_binding_denies: 3,
  selector_fail_closed: 3,
  legacy_fallback: 0,
  assertions: "PASS",
}));
