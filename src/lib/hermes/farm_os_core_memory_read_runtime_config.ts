import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";

import { FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR } from
  "./farm_os_core_environment_identity_runtime";

export const FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT = Object.freeze({
  selector: FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR,
  staging_enabled: "FARMOS_CORE_STAGING_RUNTIME_ENABLED",
  staging_runtime_config_path: "FARMOS_CORE_STAGING_RUNTIME_CONFIG_PATH",
  production_runtime_config_path: "FARMOS_CORE_PRODUCTION_RUNTIME_CONFIG_PATH",
  password: "FARMOS_CORE_MEMORY_READ_PASSWORD",
} as const);

type CoreMemoryRuntimeAuthority = Readonly<{
  runtime_environment: "staging" | "production";
  schema_version: string;
  environment_id: string;
  runtime_identity: string;
  installation_id: string;
  farm_scope: string;
  business_timezone: string;
  application_listener: string;
  manifest_sha256: `sha256:${string}`;
  provider_class: "containerized_postgres";
  provider_scope: "customer_owned_staging" | "customer_owned_production";
  resource_alias: string;
  resource_fingerprint: `sha256:${string}`;
  credential_class: string;
  keychain_service: string;
  keychain_account: string;
  postgres_major: 17;
  host: "127.0.0.1";
  port: number;
  database: string;
  user: string;
}>;

export const FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY = Object.freeze({
  runtime_environment: "staging",
  schema_version: "farmos.core-staging-runtime-config.v1",
  environment_id: "apparetenkei-staging-primary",
  runtime_identity: "farmos-core-staging-primary",
  installation_id: "apparetenkei-farmos-core-staging-01",
  farm_scope: "apparetenkei-primary-farm",
  business_timezone: "Asia/Tokyo",
  application_listener: "127.0.0.1:3100",
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
} satisfies CoreMemoryRuntimeAuthority);

export const FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY = Object.freeze({
  runtime_environment: "production",
  schema_version: "farmos.core-production-runtime-config.v1",
  environment_id: "apparetenkei-production-primary",
  runtime_identity: "farmos-core-production-primary",
  installation_id: "apparetenkei-farmos-core-mac-01",
  farm_scope: "apparetenkei-primary-farm",
  business_timezone: "Asia/Tokyo",
  application_listener: "127.0.0.1:3000",
  manifest_sha256:
    "sha256:f8e050e87ed765632640cf987ee6d7ec613947f5ac14d79989f0604d0ba6d7ad",
  provider_class: "containerized_postgres",
  provider_scope: "customer_owned_production",
  resource_alias: "farmos-core-memory-production-postgres",
  resource_fingerprint:
    "sha256:4e9ce7978c3341b7cf2172e539be7e5d646b6fd8d30508b9477f541669cf553f",
  credential_class: "core-memory-production-readonly",
  keychain_service:
    "jp.apparetenkei.farmos-core-production.core-memory-readonly",
  keychain_account: "core-memory-production-readonly",
  postgres_major: 17,
  host: "127.0.0.1",
  port: 55_433,
  database: "farmos_core_prod",
  // The immutable E5 baseline owns this least-privilege login name in both
  // isolated resources. Resource, port, database, fingerprint, credential
  // class, and distinct Keychain secret enforce environment separation.
  user: "farmos_core_memory_staging_readonly",
} satisfies CoreMemoryRuntimeAuthority);

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

function selectedAuthority(environment: Environment): Readonly<{
  authority: CoreMemoryRuntimeAuthority;
  runtime_config_path_key: string;
}> | null {
  const selected = environment[FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR];
  if (selected === "staging" && environment[
    FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.staging_enabled
  ] === "true") {
    return Object.freeze({
      authority: FARM_OS_CORE_MEMORY_STAGING_READ_AUTHORITY,
      runtime_config_path_key:
        FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.staging_runtime_config_path,
    });
  }
  if (selected === "production") {
    return Object.freeze({
      authority: FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY,
      runtime_config_path_key:
        FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.production_runtime_config_path,
    });
  }
  return null;
}

export function loadFarmOsCoreMemorySelectedReadPoolConfig(input: Readonly<{
  environment: Environment;
  read_file?: (path: string) => string;
}>): PoolConfig {
  const selected = selectedAuthority(input.environment);
  const password = input.environment[
    FARM_OS_CORE_MEMORY_READ_RUNTIME_ENVIRONMENT.password
  ];
  if (selected === null || !validPassword(password)) {
    throw new FarmOsCoreMemoryReadRuntimeConfigError();
  }
  const { authority } = selected;
  const path = input.environment[selected.runtime_config_path_key];
  if (typeof path !== "string" || path.length === 0) {
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
    value.application_listener !== authority.application_listener ||
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
    options: "-c default_transaction_read_only=on",
    application_name:
      `farmos-core-${authority.runtime_environment}-active-projection-readonly`,
  });
}

export function loadFarmOsCoreMemoryStagingReadPoolConfig(input: Readonly<{
  environment: Environment;
  read_file?: (path: string) => string;
}>): PoolConfig {
  if (input.environment[FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR] !==
      "staging") {
    throw new FarmOsCoreMemoryReadRuntimeConfigError();
  }
  return loadFarmOsCoreMemorySelectedReadPoolConfig(input);
}
