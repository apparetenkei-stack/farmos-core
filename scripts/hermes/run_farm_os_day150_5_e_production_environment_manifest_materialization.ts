import {
  chmodSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

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
  FARM_OS_CORE_PRODUCTION_MANIFEST_SHA256,
  FARM_OS_CORE_RUNTIME_PROFILES,
} from "../../src/lib/hermes/farm_os_core_environment_identity_runtime";
import { FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY } from
  "../../src/lib/hermes/farm_os_core_memory_read_runtime_config";

export const FARM_OS_CORE_PRODUCTION_RUNTIME_DIRECTORY = join(
  homedir(),
  "Library/Application Support/FarmOS/production/e5",
);

export function compileFarmOsCoreProductionRuntimeMaterialization(
  directory = FARM_OS_CORE_PRODUCTION_RUNTIME_DIRECTORY,
) {
  const profile = FARM_OS_CORE_RUNTIME_PROFILES.production;
  const memory = FARM_OS_CORE_MEMORY_PRODUCTION_READ_AUTHORITY;
  const paths = Object.freeze({
    manifest: join(directory, "environment-identity-manifest.v1.json"),
    pin: join(directory, "environment-identity-manifest.v1.pin.json"),
    observed: join(directory, "core-production-observed-identity.json"),
    runtime: join(directory, "core-production-runtime-config.json"),
    app_business_identity: join(
      directory,
      "app-business-connection-identity.json",
    ),
  });
  const candidate = {
    allowed_endpoint_aliases: [...profile.allowed_endpoint_aliases],
    business_timezone: profile.business_timezone,
    contract_versions: {
      environment_identity_handshake:
        FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    },
    core_endpoint_alias: profile.runtime_identity,
    database_bindings: {
      app_business: { ...profile.app_business },
      core_operational_memory: { ...profile.core_operational_memory },
    },
    egress_environment_policy: FARM_OS_ENVIRONMENT_EGRESS_POLICY,
    environment_class: profile.environment_class,
    environment_id: profile.environment_id,
    farm_scope: profile.farm_scope,
    installation_id: profile.installation_id,
    integration_identities: [
      FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES.production,
    ],
    manifest_version: FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
    provenance: {
      authority_id:
        "farmos.day150-5-e.production-environment-authority.v1",
      revision: 1,
      source_commit: "7f6f3f9406bba98b39e8e9ab70d73a02b52c46fd",
      source_path:
        "artifacts/day150-5/ef1-e/environment-identity-manifest.v1.schema.json",
    },
  };
  const manifest = parseFarmOsEnvironmentIdentityManifest(candidate);
  const canonical = canonicalizeFarmOsEnvironmentIdentityManifest(candidate);
  const manifestDigest = digestFarmOsEnvironmentIdentityManifest(candidate);
  if (manifest === null || canonical === null ||
    manifestDigest !== FARM_OS_CORE_PRODUCTION_MANIFEST_SHA256) {
    throw new Error("CORE_PRODUCTION_ENVIRONMENT_MANIFEST_INVALID");
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
        resource_fingerprint:
          manifest.database_bindings.app_business.resource_fingerprint,
        credential_class:
          manifest.database_bindings.app_business.credential_class,
      },
      core_operational_memory: {
        resource_fingerprint:
          manifest.database_bindings.core_operational_memory
            .resource_fingerprint,
        credential_class:
          manifest.database_bindings.core_operational_memory.credential_class,
      },
    },
    integration_identity_alias:
      manifest.integration_identities[0].identity_alias,
    manifest_digest: manifestDigest,
  };
  const appBusinessIdentity = {
    schema_version: "farmos.app-business-connection-identity.v1",
    environment_id: profile.environment_id,
    logical_name: profile.app_business.logical_name,
    provider_class: profile.app_business.provider_class,
    resource_fingerprint: profile.app_business.resource_fingerprint,
    migration_head: profile.app_business.migration_head,
    credential_class: profile.app_business.credential_class,
    runtime_connection_authority: "NOT_INJECTED",
  };
  const runtime = {
    schema_version: memory.schema_version,
    environment_id: memory.environment_id,
    runtime_identity: memory.runtime_identity,
    installation_id: memory.installation_id,
    farm_scope: memory.farm_scope,
    business_timezone: memory.business_timezone,
    application_listener: memory.application_listener,
    manifest_path: paths.manifest,
    manifest_pin_path: paths.pin,
    observed_identity_path: paths.observed,
    manifest_sha256: manifestDigest,
    app_business: {
      connection_identity_path: paths.app_business_identity,
      credential_class: profile.app_business.credential_class,
      runtime_connection_authority: "NOT_INJECTED",
    },
    core_operational_memory: {
      listener: `${memory.host}:${memory.port}`,
      logical_name: memory.database,
      database: memory.database,
      user: memory.user,
      provider_class: memory.provider_class,
      provider_scope: memory.provider_scope,
      resource_alias: memory.resource_alias,
      resource_fingerprint: memory.resource_fingerprint,
      postgres_major: memory.postgres_major,
      keychain_service: memory.keychain_service,
      keychain_account: memory.keychain_account,
      credential_class: memory.credential_class,
    },
    production_fallback: false,
  };
  return Object.freeze({
    directory,
    paths,
    manifest,
    manifest_canonical: canonical,
    manifest_digest: manifestDigest,
    pin: JSON.stringify({ manifest_sha256: manifestDigest }),
    observed: JSON.stringify(observed),
    runtime: JSON.stringify(runtime),
    app_business_identity: JSON.stringify(appBusinessIdentity),
  });
}

function atomicWrite(path: string, value: string): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, { mode: 0o600, flag: "wx" });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
  chmodSync(path, 0o600);
}

export function materializeFarmOsCoreProductionRuntimeAuthority(): void {
  const materialization = compileFarmOsCoreProductionRuntimeMaterialization();
  mkdirSync(materialization.directory, { recursive: true, mode: 0o700 });
  chmodSync(materialization.directory, 0o700);
  atomicWrite(
    materialization.paths.manifest,
    materialization.manifest_canonical,
  );
  atomicWrite(materialization.paths.pin, materialization.pin);
  atomicWrite(materialization.paths.observed, materialization.observed);
  atomicWrite(materialization.paths.runtime, materialization.runtime);
  atomicWrite(
    materialization.paths.app_business_identity,
    materialization.app_business_identity,
  );
  console.log(JSON.stringify({
    result: "CORE_PRODUCTION_ENVIRONMENT_MANIFEST_MATERIALIZATION_PASS",
    runtime_directory: materialization.directory,
    manifest_path: materialization.paths.manifest,
    pin_path: materialization.paths.pin,
    observed_identity_path: materialization.paths.observed,
    runtime_config_path: materialization.paths.runtime,
    manifest_sha256: materialization.manifest_digest,
    schema_validation: "PASS",
    secret_count: 0,
  }));
}

if (process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href) {
  materializeFarmOsCoreProductionRuntimeAuthority();
}
