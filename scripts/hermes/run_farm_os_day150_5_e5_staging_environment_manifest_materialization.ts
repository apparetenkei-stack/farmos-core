import { chmodSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  FARM_OS_ENVIRONMENT_EGRESS_POLICY,
  FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
  FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
  FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES,
  canonicalizeFarmOsEnvironmentIdentityManifest,
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
} from "../../src/lib/hermes/farm_os_environment_identity_contract";
import { FARM_OS_ENVIRONMENT_RUNTIME_IDENTITY_EVIDENCE_SOURCE } from
  "../../src/lib/hermes/farm_os_environment_identity_runtime_binding";
import {
  FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS,
  FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD,
  FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS,
  FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD,
  FARM_OS_CORE_STAGING_ENVIRONMENT_ID,
  FARM_OS_CORE_STAGING_INSTALLATION_ID,
  FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";

const DIRECTORY = join(homedir(), "Library/Application Support/FarmOS/staging/e5");
const PATHS = Object.freeze({
  manifest: join(DIRECTORY, "environment-identity-manifest.v1.json"),
  pin: join(DIRECTORY, "environment-identity-manifest.v1.pin.json"),
  observed: join(DIRECTORY, "core-staging-observed-identity.json"),
  runtime: join(DIRECTORY, "core-staging-runtime-config.json"),
  app_business_identity: join(DIRECTORY, "app-business-connection-identity.json"),
});

const candidate = {
  manifest_version: FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
  environment_id: FARM_OS_CORE_STAGING_ENVIRONMENT_ID,
  environment_class: "staging",
  installation_id: FARM_OS_CORE_STAGING_INSTALLATION_ID,
  farm_scope: "apparetenkei-primary-farm",
  business_timezone: "Asia/Tokyo",
  core_endpoint_alias: FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
  allowed_endpoint_aliases: [
    FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
    "farming-app-staging-primary",
  ],
  database_bindings: {
    app_business: {
      logical_name: "apparetenkei-staging-primary",
      provider_class: "managed_postgres",
      resource_fingerprint:
        "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69",
      migration_head: FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD,
      credential_class: FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS,
    },
    core_operational_memory: {
      logical_name: "farmos_core_memory_staging",
      provider_class: "containerized_postgres",
      resource_fingerprint:
        "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767",
      migration_head: FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD,
      credential_class: FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS,
    },
  },
  integration_identities: [FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES.staging],
  egress_environment_policy: FARM_OS_ENVIRONMENT_EGRESS_POLICY,
  contract_versions: {
    environment_identity_handshake: FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
  },
  provenance: {
    authority_id: "farmos.day150-5-e5.staging-environment-authority.v1",
    revision: 1,
    source_commit: "72ceaa6f779e875776d2f916c1fa003d08fb3528",
    source_path:
      "artifacts/day150-5/ef1-e/environment-identity-manifest.v1.schema.json",
  },
};
const manifest = parseFarmOsEnvironmentIdentityManifest(candidate);
const canonical = canonicalizeFarmOsEnvironmentIdentityManifest(candidate);
const manifestDigest = digestFarmOsEnvironmentIdentityManifest(candidate);
if (manifest === null || canonical === null || manifestDigest === null) {
  throw new Error("CORE_STAGING_ENVIRONMENT_MANIFEST_INVALID");
}
const observed = {
  evidence_source: FARM_OS_ENVIRONMENT_RUNTIME_IDENTITY_EVIDENCE_SOURCE,
  environment_id: manifest.environment_id,
  environment_class: manifest.environment_class,
  installation_id: manifest.installation_id,
  farm_scope: manifest.farm_scope,
  business_timezone: manifest.business_timezone,
  core_endpoint_alias: manifest.core_endpoint_alias,
  database_bindings: {
    app_business: {
      resource_fingerprint: manifest.database_bindings.app_business.resource_fingerprint,
      credential_class: manifest.database_bindings.app_business.credential_class,
    },
    core_operational_memory: {
      resource_fingerprint:
        manifest.database_bindings.core_operational_memory.resource_fingerprint,
      credential_class:
        manifest.database_bindings.core_operational_memory.credential_class,
    },
  },
  integration_identity_alias: manifest.integration_identities[0].identity_alias,
  manifest_digest: manifestDigest,
};
const runtime = {
  schema_version: "farmos.core-staging-runtime-config.v1",
  environment_id: FARM_OS_CORE_STAGING_ENVIRONMENT_ID,
  runtime_identity: FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
  installation_id: FARM_OS_CORE_STAGING_INSTALLATION_ID,
  farm_scope: "apparetenkei-primary-farm",
  business_timezone: "Asia/Tokyo",
  application_listener: "127.0.0.1:3100",
  manifest_path: PATHS.manifest,
  manifest_pin_path: PATHS.pin,
  observed_identity_path: PATHS.observed,
  manifest_sha256: manifestDigest,
  app_business: {
    connection_identity_path: PATHS.app_business_identity,
    keychain_service: "jp.apparetenkei.farmos-core-staging.app-business-readonly",
    credential_class: FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS,
  },
  core_operational_memory: {
    listener: "127.0.0.1:55432",
    logical_name: "farmos_core_memory_staging",
    database: "farmos_core_memory_staging",
    user: "farmos_core_memory_staging_readonly",
    provider_class: "containerized_postgres",
    provider_scope: "customer_owned_staging",
    resource_alias: "farmos-core-memory-staging-postgres",
    resource_fingerprint:
      "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767",
    postgres_major: 17,
    keychain_service: "jp.apparetenkei.farmos-core-staging.core-memory-readonly",
    keychain_account: "core-memory-staging-readonly",
    credential_class: FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS,
  },
  production_fallback: false,
};

function atomicWrite(path: string, value: string): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, { mode: 0o600, flag: "wx" });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

mkdirSync(DIRECTORY, { recursive: true, mode: 0o700 });
chmodSync(DIRECTORY, 0o700);
atomicWrite(PATHS.manifest, canonical);
atomicWrite(PATHS.pin, JSON.stringify({ manifest_sha256: manifestDigest }));
atomicWrite(PATHS.observed, JSON.stringify(observed));
atomicWrite(PATHS.runtime, JSON.stringify(runtime));
console.log(JSON.stringify({
  result: "CORE_STAGING_ENVIRONMENT_MANIFEST_MATERIALIZATION_PASS",
  runtime_directory: DIRECTORY,
  manifest_path: PATHS.manifest,
  pin_path: PATHS.pin,
  observed_identity_path: PATHS.observed,
  runtime_config_path: PATHS.runtime,
  manifest_sha256: manifestDigest,
  schema_validation: "PASS",
  secret_count: 0,
}));
