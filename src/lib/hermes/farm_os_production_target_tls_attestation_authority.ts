import {
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  validateFarmOsProductionTargetCollectorAuthority,
  type FarmOsProductionTargetCollectorAuthority,
} from "./farm_os_production_target_collector_authority";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID =
  "farmos.production-target-provider-tls-attestation-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID =
  "farmos.production-target-postgres-tls-attestation-authority.v1" as const;

export type FarmOsSupabaseProviderTransportPolicy = Readonly<{
  transport_schema: "SUPABASE_PROVIDER_TRANSPORT";
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID;
  revision: 1;
  provider_family: "Supabase Managed PostgreSQL";
  endpoint_authority_reference: "farmos.supabase-project-resource-source-authority.v1";
  approved_target_resource_digest: `sha256:${string}`;
  endpoint_host_binding_digest: `sha256:${string}`;
  https_tls_required: true;
  downgrade: "PROHIBITED";
  activates_at: string;
  expires_at: string;
  revoked: boolean;
}>;

export type FarmOsPostgresDatabaseTransportPolicy = Readonly<{
  transport_schema: "POSTGRES_DATABASE_TRANSPORT";
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID;
  revision: 1;
  approved_target_resource_digest: `sha256:${string}`;
  endpoint_host_binding_digest: `sha256:${string}`;
  tls_mode: "verify-full";
  hostname_sni_authority_reference: string;
  trust_source_policy_authority_reference: string;
  connection_authority_id: "farmos.production-target-connection-authority.v1";
  connection_authority_revision: 1;
  collector_authority_id: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID;
  collector_authority_revision: 1;
  insecure_fallback: "PROHIBITED";
  activates_at: string;
  expires_at: string;
  revoked: boolean;
}>;

export const FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_POLICY = Object.freeze({
  transport_schema: "SUPABASE_PROVIDER_TRANSPORT",
  authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID,
  revision: 1,
  provider_family: "Supabase Managed PostgreSQL",
  endpoint_authority_reference: "farmos.supabase-project-resource-source-authority.v1",
  https_tls_required: true,
  expected_host_resource_authority: "EXACT_DIGEST_BINDING_REQUIRED",
  downgrade: "PROHIBITED",
  actual_tls_handshake_count: 0,
  actual_tls_state: "NOT_ESTABLISHED",
} as const);

export const FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY = Object.freeze({
  transport_schema: "POSTGRES_DATABASE_TRANSPORT",
  authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  revision: 1,
  tls_mode: "verify-full",
  hostname_sni_authority: "EXACT_REFERENCE_REQUIRED",
  trust_source_policy_authority: "EXACT_REFERENCE_REQUIRED",
  connection_authority_id: "farmos.production-target-connection-authority.v1",
  connection_authority_revision: 1,
  collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  collector_authority_revision: 1,
  insecure_fallback: "PROHIBITED",
  actual_tls_handshake_count: 0,
  actual_tls_state: "NOT_ESTABLISHED",
  sql_self_attestation_accepted: false,
  configuration_claim_is_attestation: false,
} as const);

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const REFERENCE = /^[a-z0-9][a-z0-9._:/#-]{0,199}$/u;
const PROVIDER_KEYS = Object.freeze([
  "activates_at", "approved_target_resource_digest", "authority_id", "downgrade",
  "endpoint_authority_reference", "endpoint_host_binding_digest",
  "expires_at", "https_tls_required", "provider_family", "revision", "revoked", "transport_schema",
] as const);
const POSTGRES_KEYS = Object.freeze([
  "activates_at", "approved_target_resource_digest", "authority_id", "collector_authority_id",
  "collector_authority_revision", "connection_authority_id",
  "connection_authority_revision", "endpoint_host_binding_digest",
  "expires_at", "hostname_sni_authority_reference", "insecure_fallback", "revision", "revoked",
  "tls_mode", "transport_schema", "trust_source_policy_authority_reference",
] as const);

function exactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

export function validateFarmOsSupabaseProviderTransportPolicy(
  input: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    endpoint_host_binding_digest: `sha256:${string}`;
  }>,
  now: string,
): boolean {
  if (!exactRecord(input, PROVIDER_KEYS)) return false;
  const value = input;
  return value.transport_schema === "SUPABASE_PROVIDER_TRANSPORT" &&
    value.authority_id === FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID &&
    value.revision === 1 && value.provider_family === "Supabase Managed PostgreSQL" &&
    value.endpoint_authority_reference === "farmos.supabase-project-resource-source-authority.v1" &&
    DIGEST.test(String(value.approved_target_resource_digest)) &&
    value.approved_target_resource_digest === expected.approved_target_resource_digest &&
    DIGEST.test(String(value.endpoint_host_binding_digest)) &&
    value.endpoint_host_binding_digest === expected.endpoint_host_binding_digest &&
    value.https_tls_required === true && value.downgrade === "PROHIBITED" &&
    evaluateFarmOsProductionTargetAuthorityLifecycle({
      activates_at: String(value.activates_at), expires_at: String(value.expires_at),
      revoked: value.revoked as boolean,
    }, now) === "ACTIVE";
}

export function validateFarmOsPostgresDatabaseTransportPolicy(
  input: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    endpoint_host_binding_digest: `sha256:${string}`;
    hostname_sni_authority_reference: string;
    trust_source_policy_authority_reference: string;
  }>,
  collectorAuthority: FarmOsProductionTargetCollectorAuthority,
  now: string,
): boolean {
  if (!exactRecord(input, POSTGRES_KEYS) ||
    evaluateFarmOsProductionTargetAuthorityLifecycle({
      activates_at: String(input.activates_at), expires_at: String(input.expires_at),
      revoked: input.revoked as boolean,
    }, now) !== "ACTIVE" ||
    !validateFarmOsProductionTargetCollectorAuthority(collectorAuthority, {
      approved_target_resource_digest: expected.approved_target_resource_digest,
      revision: collectorAuthority.revision,
      now,
    })) return false;
  const value = input;
  return value.transport_schema === "POSTGRES_DATABASE_TRANSPORT" &&
    value.authority_id === FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID &&
    value.revision === 1 && DIGEST.test(String(value.approved_target_resource_digest)) &&
    value.approved_target_resource_digest === expected.approved_target_resource_digest &&
    DIGEST.test(String(value.endpoint_host_binding_digest)) &&
    value.endpoint_host_binding_digest === expected.endpoint_host_binding_digest &&
    value.tls_mode === "verify-full" &&
    REFERENCE.test(String(value.hostname_sni_authority_reference)) &&
    value.hostname_sni_authority_reference === expected.hostname_sni_authority_reference &&
    REFERENCE.test(String(value.trust_source_policy_authority_reference)) &&
    value.trust_source_policy_authority_reference ===
      expected.trust_source_policy_authority_reference &&
    value.connection_authority_id === "farmos.production-target-connection-authority.v1" &&
    value.connection_authority_revision === 1 &&
    value.collector_authority_id === collectorAuthority.authority_id &&
    value.collector_authority_revision === collectorAuthority.revision &&
    value.insecure_fallback === "PROHIBITED";
}

export type FarmOsPostgresTlsHandshakeAttestation = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID;
  authority_revision: 1;
  connection_authority_id: "farmos.production-target-connection-authority.v1";
  connection_authority_revision: 1;
  collector_authority_id: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID;
  collector_authority_revision: 1;
  approved_target_resource_digest: `sha256:${string}`;
  endpoint_host_binding_digest: `sha256:${string}`;
  hostname_sni_authority_reference: string;
  trust_source_policy_authority_reference: string;
  attestation_evidence_provenance_reference: string;
  approved_endpoint_used: true;
  approved_hostname_sni_policy_used: true;
  approved_trust_source_used: true;
  downgrade_or_fallback_used: false;
  handshake_verified: true;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
}>;

export function attestFarmOsPostgresTlsHandshake(
  input: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    endpoint_host_binding_digest: `sha256:${string}`;
    hostname_sni_authority_reference: string;
    trust_source_policy_authority_reference: string;
    attestation_evidence_provenance_reference: string;
  }>,
  collectorAuthority: FarmOsProductionTargetCollectorAuthority,
  now: string,
): boolean {
  const keys = [
    "activates_at", "approved_endpoint_used", "approved_hostname_sni_policy_used",
    "approved_target_resource_digest", "approved_trust_source_used", "authority_id",
    "authority_revision", "attestation_evidence_provenance_reference",
    "collector_authority_id", "collector_authority_revision", "connection_authority_id",
    "connection_authority_revision", "expires_at",
    "downgrade_or_fallback_used", "endpoint_host_binding_digest", "handshake_verified",
    "hostname_sni_authority_reference", "revoked", "trust_source_policy_authority_reference",
  ].sort();
  if (!exactRecord(input, keys) ||
    evaluateFarmOsProductionTargetAuthorityLifecycle({
      activates_at: String(input.activates_at), expires_at: String(input.expires_at),
      revoked: input.revoked as boolean,
    }, now) !== "ACTIVE" ||
    !validateFarmOsProductionTargetCollectorAuthority(collectorAuthority, {
      approved_target_resource_digest: expected.approved_target_resource_digest,
      revision: collectorAuthority.revision,
      now,
    })) return false;
  const value = input;
  return value.authority_id === FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID &&
    value.authority_revision === 1 &&
    value.connection_authority_id === "farmos.production-target-connection-authority.v1" &&
    value.connection_authority_revision === 1 &&
    value.collector_authority_id === collectorAuthority.authority_id &&
    value.collector_authority_revision === collectorAuthority.revision &&
    DIGEST.test(String(value.approved_target_resource_digest)) &&
    value.approved_target_resource_digest === expected.approved_target_resource_digest &&
    DIGEST.test(String(value.endpoint_host_binding_digest)) &&
    value.endpoint_host_binding_digest === expected.endpoint_host_binding_digest &&
    REFERENCE.test(String(value.hostname_sni_authority_reference)) &&
    value.hostname_sni_authority_reference === expected.hostname_sni_authority_reference &&
    REFERENCE.test(String(value.trust_source_policy_authority_reference)) &&
    value.trust_source_policy_authority_reference === expected.trust_source_policy_authority_reference &&
    REFERENCE.test(String(value.attestation_evidence_provenance_reference)) &&
    value.attestation_evidence_provenance_reference ===
      expected.attestation_evidence_provenance_reference &&
    value.approved_endpoint_used === true &&
    value.approved_hostname_sni_policy_used === true &&
    value.approved_trust_source_used === true &&
    value.downgrade_or_fallback_used === false && value.handshake_verified === true;
}
