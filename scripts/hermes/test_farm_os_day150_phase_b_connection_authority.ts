import assert from "node:assert/strict";

import {
  FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  resolveFarmOsProductionTargetConnectionAuthorityExact,
  validateFarmOsProductionTargetConnectionAuthority,
} from "../../src/lib/hermes/farm_os_production_target_connection_authority";
import {
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION,
  resolveFarmOsProductionTargetCollectorAuthorityExact,
  validateFarmOsProductionTargetCollectorAuthority,
} from "../../src/lib/hermes/farm_os_production_target_collector_authority";
import {
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
} from "../../src/lib/hermes/farm_os_production_target_database_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
} from "../../src/lib/hermes/farm_os_production_target_provider_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID,
  attestFarmOsPostgresTlsHandshake,
  validateFarmOsPostgresDatabaseTransportPolicy,
  validateFarmOsSupabaseProviderTransportPolicy,
} from "../../src/lib/hermes/farm_os_production_target_tls_attestation_authority";

const TARGET = `sha256:${"1".repeat(64)}` as const;
const HOST = `sha256:${"2".repeat(64)}` as const;
const NOW = "2026-08-10T00:00:00.000Z";
const ACTIVATES = "2026-08-09T00:00:00.000Z";
const EXPIRES = "2026-08-11T00:00:00.000Z";
const expected = {
  approved_target_resource_digest: TARGET,
  endpoint_host_binding_digest: HOST,
  hostname_sni_authority_reference: "farmos.production-target.hostname-sni.v1",
  trust_source_policy_authority_reference: "farmos.production-target.trust-source.v1",
  revision: 1,
  now: NOW,
} as const;
const collector = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  revision: 1,
  approved_target_resource_digest: TARGET,
  allowed_operation_class: FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION,
  v5_authority_id: "farmos.production-target-identity-query.v5",
  v5_artifact_sha256: "sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52",
  minimal_observation_authority_id: "farmos.production-target-identity-minimal-observation-query.v1",
  minimal_observation_artifact_sha256:
    "sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805",
  required_connection_authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  required_connection_authority_revision: 1,
  required_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  required_principal_authority_revision: 1,
  required_postgres_tls_authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  required_postgres_tls_authority_revision: 1,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
  execution_enabled: false,
  runtime_bound: false,
  production_callable: false,
  automatic_latest_selection: false,
  fallback: "PROHIBITED",
} as const);
const collectorExpected = { approved_target_resource_digest: TARGET, revision: 1, now: NOW } as const;
assert.equal(validateFarmOsProductionTargetCollectorAuthority(collector, collectorExpected), true);
assert.equal(resolveFarmOsProductionTargetCollectorAuthorityExact([collector], collectorExpected), collector);
assert.equal(resolveFarmOsProductionTargetCollectorAuthorityExact([collector, { ...collector }], collectorExpected), null);
assert.equal(resolveFarmOsProductionTargetCollectorAuthorityExact([collector], {
  ...collectorExpected, revision: 2,
}), null);
for (const alias of ["latest", "highest", "current", "active", "default", "fallback"]) {
  assert.equal(resolveFarmOsProductionTargetCollectorAuthorityExact([collector], {
    ...collectorExpected, revision: alias as unknown as number,
  }), null);
}
for (const invalid of [
  { ...collector, authority_id: "other" },
  { ...collector, revision: 2 },
  { ...collector, revoked: true },
  { ...collector, expires_at: NOW },
  { ...collector, approved_target_resource_digest: `sha256:${"9".repeat(64)}` },
  { ...collector, execution_enabled: true },
]) assert.equal(validateFarmOsProductionTargetCollectorAuthority(invalid, collectorExpected), false);
const connection = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  revision: 1,
  approved_target_resource_digest: TARGET,
  endpoint_host_binding_digest: HOST,
  database_logical_name: "farmos_core_prod",
  expected_postgres_major: 17,
  database_credential_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  database_credential_authority_revision: 1,
  database_credential_broker_authority_id:
    FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  database_credential_broker_authority_revision: 1,
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  tls_attestation_authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  tls_attestation_authority_revision: 1,
  collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  collector_authority_revision: 1,
  maximum_connections: 1,
  automatic_retry: 0,
  connect_timeout_ms: 5_000,
  query_timeout_ms: 10_000,
  transaction_isolation: "REPEATABLE READ",
  transaction_read_only: "REQUIRED",
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
  generic_fallback: "PROHIBITED",
} as const);
assert.equal(validateFarmOsProductionTargetConnectionAuthority(connection, expected).accepted, true);
assert.equal(resolveFarmOsProductionTargetConnectionAuthorityExact([connection], expected), connection);
assert.equal(resolveFarmOsProductionTargetConnectionAuthorityExact([connection, { ...connection }], expected), null);
assert.equal(resolveFarmOsProductionTargetConnectionAuthorityExact([connection],
  { ...expected, revision: 2 }), null);

const rejects: readonly unknown[] = [
  { ...connection, approved_target_resource_digest: `sha256:${"3".repeat(64)}` },
  { ...connection, endpoint_host_binding_digest: `sha256:${"3".repeat(64)}` },
  { ...connection, database_logical_name: "postgres" },
  { ...connection, expected_postgres_major: 16 },
  { ...connection, database_credential_authority_id: "other" },
  { ...connection, database_credential_authority_revision: 2 },
  { ...connection, database_credential_broker_authority_id:
      FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID },
  { ...connection, database_credential_broker_authority_revision: 2 },
  { ...connection, expected_principal_authority_id: "other" },
  { ...connection, expected_principal_authority_revision: 2 },
  { ...connection, tls_attestation_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID },
  { ...connection, tls_attestation_authority_revision: 2 },
  { ...connection, collector_authority_id: "other" },
  { ...connection, collector_authority_revision: 2 },
  { ...connection, maximum_connections: 2 },
  { ...connection, automatic_retry: 1 },
  { ...connection, connect_timeout_ms: 99 },
  { ...connection, connect_timeout_ms: 10_001 },
  { ...connection, query_timeout_ms: 30_001 },
  { ...connection, transaction_isolation: "READ COMMITTED" },
  { ...connection, transaction_read_only: "OPTIONAL" },
  { ...connection, generic_fallback: "DATABASE_URL" },
  { ...connection, revoked: true },
  { ...connection, expires_at: expected.now },
  { ...connection, expires_at: "2026-08-11 00:00:00" },
  { ...connection, password: "not-permitted" },
];
for (const invalid of rejects) {
  assert.equal(validateFarmOsProductionTargetConnectionAuthority(invalid, expected).accepted, false);
}

const postgresTls = Object.freeze({
  transport_schema: "POSTGRES_DATABASE_TRANSPORT",
  authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  revision: 1,
  approved_target_resource_digest: TARGET,
  endpoint_host_binding_digest: HOST,
  tls_mode: "verify-full",
  hostname_sni_authority_reference: "farmos.production-target.hostname-sni.v1",
  trust_source_policy_authority_reference: "farmos.production-target.trust-source.v1",
  connection_authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  connection_authority_revision: 1,
  collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  collector_authority_revision: 1,
  insecure_fallback: "PROHIBITED",
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
} as const);
const providerTls = Object.freeze({
  transport_schema: "SUPABASE_PROVIDER_TRANSPORT",
  authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_AUTHORITY_ID,
  revision: 1,
  provider_family: "Supabase Managed PostgreSQL",
  endpoint_authority_reference: "farmos.supabase-project-resource-source-authority.v1",
  approved_target_resource_digest: TARGET,
  endpoint_host_binding_digest: HOST,
  https_tls_required: true,
  downgrade: "PROHIBITED",
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
} as const);
assert.equal(validateFarmOsSupabaseProviderTransportPolicy(providerTls, expected, NOW), true);
assert.equal(validateFarmOsSupabaseProviderTransportPolicy(postgresTls, expected, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(providerTls, expected, collector, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(postgresTls, expected, collector, NOW), true);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  { ...postgresTls, tls_mode: "require" } as unknown as typeof postgresTls, expected, collector, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  { ...postgresTls, insecure_fallback: "ENABLED" } as unknown as typeof postgresTls,
  expected, collector, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  { ...postgresTls, hostname_sni_authority_reference: "farmos.other.sni.v1" },
  expected, collector, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  { ...postgresTls, extra: true }, expected, collector, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  { ...postgresTls, collector_authority_id: "other" }, expected, collector, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  postgresTls, expected, { ...collector, revoked: true }, NOW), false);
assert.equal(validateFarmOsPostgresDatabaseTransportPolicy(
  { ...postgresTls, expires_at: "2026-02-31T00:00:00.000Z" },
  expected, collector, NOW), false);
assert.equal(validateFarmOsSupabaseProviderTransportPolicy(
  { ...providerTls, collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID },
  expected, NOW), false);

const handshake = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  authority_revision: 1,
  connection_authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  connection_authority_revision: 1,
  collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  collector_authority_revision: 1,
  approved_target_resource_digest: TARGET,
  endpoint_host_binding_digest: HOST,
  hostname_sni_authority_reference: expected.hostname_sni_authority_reference,
  trust_source_policy_authority_reference: expected.trust_source_policy_authority_reference,
  attestation_evidence_provenance_reference: "farmos.probe-receipt.tls-attestation.fixture-001",
  approved_endpoint_used: true,
  approved_hostname_sni_policy_used: true,
  approved_trust_source_used: true,
  downgrade_or_fallback_used: false,
  handshake_verified: true,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
} as const);
const handshakeExpected = {
  ...expected,
  attestation_evidence_provenance_reference: handshake.attestation_evidence_provenance_reference,
};
assert.equal(attestFarmOsPostgresTlsHandshake(handshake, handshakeExpected, collector, NOW), true);
assert.equal(attestFarmOsPostgresTlsHandshake({ ...handshake,
  endpoint_host_binding_digest: `sha256:${"3".repeat(64)}` }, handshakeExpected, collector, NOW), false);
assert.equal(attestFarmOsPostgresTlsHandshake({ ...handshake,
  attestation_evidence_provenance_reference: "farmos.other.receipt" },
  handshakeExpected, collector, NOW), false);
assert.equal(attestFarmOsPostgresTlsHandshake(
  { ...handshake, collector_authority_revision: 2 }, handshakeExpected, collector, NOW), false);
assert.equal(attestFarmOsPostgresTlsHandshake(
  { ...handshake, revoked: true }, handshakeExpected, collector, NOW), false);
assert.equal(attestFarmOsPostgresTlsHandshake(
  { ...handshake, extra: true }, handshakeExpected, collector, NOW), false);

console.log("Day150 Phase B connection authority tests passed");
