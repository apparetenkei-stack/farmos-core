import {
  FARM_OS_ENVIRONMENT_EGRESS_POLICY,
  FARM_OS_ENVIRONMENT_IDENTITY_BUSINESS_TIMEZONE,
  FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
  FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
  FARM_OS_ENVIRONMENT_IDS,
  FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES,
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
  type FarmOsEnvironmentClass,
  type FarmOsEnvironmentIdentityManifest,
} from "../../../src/lib/hermes/farm_os_environment_identity_contract";
import {
  FARM_OS_ENVIRONMENT_RUNTIME_IDENTITY_EVIDENCE_SOURCE,
  type FarmOsEnvironmentRuntimeIdentityEvidence,
} from "../../../src/lib/hermes/farm_os_environment_identity_runtime_binding";

const FINGERPRINT_CHARACTERS = Object.freeze({
  development: Object.freeze({ app_business: "a", core_operational_memory: "b" }),
  staging: Object.freeze({ app_business: "c", core_operational_memory: "d" }),
  production: Object.freeze({ app_business: "e", core_operational_memory: "f" }),
} as const);

export function createFarmOsDay1505EEnvironmentManifestFixture(
  environmentClass: FarmOsEnvironmentClass,
): FarmOsEnvironmentIdentityManifest {
  const fingerprint = FINGERPRINT_CHARACTERS[environmentClass];
  const candidate = {
    manifest_version: FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
    environment_id: FARM_OS_ENVIRONMENT_IDS[environmentClass],
    environment_class: environmentClass,
    installation_id: "apparetenkei-farmos-core-mac-01",
    farm_scope: "apparetenkei-primary-farm",
    business_timezone: FARM_OS_ENVIRONMENT_IDENTITY_BUSINESS_TIMEZONE,
    core_endpoint_alias: `farmos-core-${environmentClass}-primary`,
    allowed_endpoint_aliases: [
      `farmos-core-${environmentClass}-primary`,
      `farming-app-${environmentClass}-primary`,
    ],
    database_bindings: {
      app_business: {
        logical_name: `app_business_${environmentClass}`,
        provider_class: "managed_postgres",
        resource_fingerprint: `sha256:${fingerprint.app_business.repeat(64)}`,
        migration_head: `${environmentClass}-app-migration-head`,
        credential_class: `app-business-${environmentClass}-readonly`,
      },
      core_operational_memory: {
        logical_name: `core_operational_memory_${environmentClass}`,
        provider_class: "managed_postgres",
        resource_fingerprint:
          `sha256:${fingerprint.core_operational_memory.repeat(64)}`,
        migration_head: `${environmentClass}-core-migration-head`,
        credential_class: `core-memory-${environmentClass}-readonly`,
      },
    },
    integration_identities: [
      { ...FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES[environmentClass] },
    ],
    egress_environment_policy: { ...FARM_OS_ENVIRONMENT_EGRESS_POLICY },
    contract_versions: {
      environment_identity_handshake:
        FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    },
    provenance: {
      authority_id: "farmos.day150-5-e1.environment-identity-authority.v1",
      revision: 1,
      source_commit: "8bb663360e9a858074ce8497b6bf7c8b9b47a19a",
      source_path:
        "artifacts/day150-5/ef1-e/environment-identity-manifest.v1.schema.json",
    },
  };
  const parsed = parseFarmOsEnvironmentIdentityManifest(candidate);
  if (parsed === null) throw new Error("environment_identity_fixture_invalid");
  return parsed;
}

export function createMutableFarmOsDay1505EEnvironmentManifestFixture(
  environmentClass: FarmOsEnvironmentClass,
): Record<string, unknown> {
  return structuredClone(
    createFarmOsDay1505EEnvironmentManifestFixture(environmentClass),
  ) as unknown as Record<string, unknown>;
}

export function createFarmOsDay1505ERuntimeIdentityFixture(
  manifest: FarmOsEnvironmentIdentityManifest,
): FarmOsEnvironmentRuntimeIdentityEvidence {
  const manifestDigest = digestFarmOsEnvironmentIdentityManifest(manifest);
  if (manifestDigest === null) throw new Error("environment_identity_digest_invalid");
  return {
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
          manifest.database_bindings.core_operational_memory.resource_fingerprint,
        credential_class:
          manifest.database_bindings.core_operational_memory.credential_class,
      },
    },
    integration_identity_alias:
      manifest.integration_identities[0].identity_alias,
    manifest_digest: manifestDigest,
  };
}
