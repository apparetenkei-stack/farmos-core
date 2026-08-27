import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";

export const FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT = Object.freeze({
  staging_enabled: "FARMOS_CORE_STAGING_RUNTIME_ENABLED",
  runtime_config_path: "FARMOS_CORE_STAGING_RUNTIME_CONFIG_PATH",
  password: "FARMOS_CORE_MEMORY_READ_PASSWORD",
} as const);

export const FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY = Object.freeze({
  schema_version: "farmos.core-staging-runtime-config.v1",
  environment_id: "apparetenkei-staging-primary",
  runtime_identity: "farmos-core-staging-primary",
  installation_id: "apparetenkei-farmos-core-staging-01",
  farm_scope: "apparetenkei-primary-farm",
  business_timezone: "Asia/Tokyo",
  manifest_sha256:
    "sha256:f150cc743e73bbe651068c55e48d5fbd94991c34bc3f4561a40714d920d56fbe",
  provider_class: "containerized_postgres",
  provider_scope: "customer_owned_staging",
  resource_alias: "farmos-core-memory-staging-postgres",
  resource_fingerprint:
    "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767",
  credential_class: "core-memory-staging-readonly",
  keychain_service:
    "jp.apparetenkei.farmos-core-staging.core-memory-readonly",
  keychain_account: "core-memory-staging-readonly",
  postgres_major: 17,
  host: "127.0.0.1",
  port: 55_432,
  database: "farmos_core_memory_staging",
  user: "farmos_core_memory_staging_readonly",
} as const);

type Environment = Readonly<Record<string, string | undefined>>;
type JsonRecord = Record<string, unknown>;

const TOP_LEVEL_KEYS = Object.freeze([
  "app_business",
  "application_listener",
  "business_timezone",
  "core_operational_memory",
  "environment_id",
  "farm_scope",
  "installation_id",
  "manifest_path",
  "manifest_pin_path",
  "manifest_sha256",
  "observed_identity_path",
  "production_fallback",
  "runtime_identity",
  "schema_version",
] as const);

const CORE_MEMORY_KEYS = Object.freeze([
  "credential_class",
  "database",
  "keychain_account",
  "keychain_service",
  "listener",
  "logical_name",
  "postgres_major",
  "provider_class",
  "provider_scope",
  "resource_alias",
  "resource_fingerprint",
  "user",
] as const);

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]);
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 32 &&
    value.length <= 8 * 1024 && !/[\u0000\r\n]/u.test(value) &&
    !/^[a-z][a-z0-9+.-]*:\/\//iu.test(value);
}

export class FarmOsCoreMemoryReadRuntimeConfigError extends Error {
  readonly code = "CORE_MEMORY_READ_RUNTIME_CONFIGURATION_UNAVAILABLE" as const;

  constructor() {
    super("CORE_MEMORY_READ_RUNTIME_CONFIGURATION_UNAVAILABLE");
    this.name = "FarmOsCoreMemoryReadRuntimeConfigError";
  }
}

export function loadFarmOsCoreMemoryStagingReadPoolConfig(input: Readonly<{
  environment: Environment;
  read_file?: (path: string) => string;
}>): PoolConfig {
  const authority = FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY;
  const path = input.environment[
    FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.runtime_config_path
  ];
  const password = input.environment[
    FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.password
  ];
  if (input.environment[
    FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.staging_enabled
  ] !== "true" || typeof path !== "string" || path.length === 0 ||
    !validPassword(password)) {
    throw new FarmOsCoreMemoryReadRuntimeConfigError();
  }

  let value: unknown;
  try {
    value = JSON.parse((input.read_file ?? ((filePath) =>
      readFileSync(filePath, "utf8")))(path));
  } catch {
    throw new FarmOsCoreMemoryReadRuntimeConfigError();
  }
  if (!record(value) || !exactKeys(value, TOP_LEVEL_KEYS) ||
    !record(value.core_operational_memory) ||
    !exactKeys(value.core_operational_memory, CORE_MEMORY_KEYS)) {
    throw new FarmOsCoreMemoryReadRuntimeConfigError();
  }
  const memory = value.core_operational_memory;
  if (value.schema_version !== authority.schema_version ||
    value.environment_id !== authority.environment_id ||
    value.runtime_identity !== authority.runtime_identity ||
    value.installation_id !== authority.installation_id ||
    value.farm_scope !== authority.farm_scope ||
    value.business_timezone !== authority.business_timezone ||
    value.manifest_sha256 !== authority.manifest_sha256 ||
    value.production_fallback !== false ||
    memory.provider_class !== authority.provider_class ||
    memory.provider_scope !== authority.provider_scope ||
    memory.logical_name !== authority.database ||
    memory.resource_alias !== authority.resource_alias ||
    memory.resource_fingerprint !== authority.resource_fingerprint ||
    memory.credential_class !== authority.credential_class ||
    memory.keychain_service !== authority.keychain_service ||
    memory.keychain_account !== authority.keychain_account ||
    memory.postgres_major !== authority.postgres_major ||
    memory.listener !== `${authority.host}:${authority.port}` ||
    memory.database !== authority.database || memory.user !== authority.user) {
    throw new FarmOsCoreMemoryReadRuntimeConfigError();
  }

  return Object.freeze({
    host: authority.host,
    port: authority.port,
    database: authority.database,
    user: authority.user,
    password,
    ssl: false,
    max: 2,
    connectionTimeoutMillis: 2_000,
    query_timeout: 10_000,
    statement_timeout: 10_000,
    application_name: "farmos-core-staging-active-projection-readonly",
  });
}
