import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_TARGET_ACCESS_AUTHORITY_SOURCE_STATE,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY,
  type FarmOsDatabaseCredentialBrokerPort,
  type FarmOsProviderCredentialBrokerPort,
} from "../../src/lib/hermes/farm_os_production_target_credential_broker_ports";
import {
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION,
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY,
} from "../../src/lib/hermes/farm_os_production_target_collector_authority";
import {
  FARM_OS_PRODUCTION_TARGET_APPROVED_NARROW_EXECUTE_ROLE,
  evaluateFarmOsProductionTargetPrincipalCapability,
} from "../../src/lib/hermes/farm_os_production_target_principal_capability_authority";
import {
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_POLICY,
} from "../../src/lib/hermes/farm_os_production_target_tls_attestation_authority";

const sourceFiles = [
  "farm_os_production_target_provider_credential_authority.ts",
  "farm_os_production_target_database_credential_authority.ts",
  "farm_os_production_target_connection_authority.ts",
  "farm_os_production_target_principal_capability_authority.ts",
  "farm_os_production_target_tls_attestation_authority.ts",
  "farm_os_production_target_credential_broker_ports.ts",
  "farm_os_production_target_collector_authority.ts",
  "farm_os_production_target_authority_lifecycle.ts",
] as const;
const sources = sourceFiles.map((file) => readFileSync(new URL(
  `../../src/lib/hermes/${file}`, import.meta.url,
), "utf8"));
const brokerSource = sources[5];

for (const source of sources) {
  assert.doesNotMatch(source, /\b(?:fetch|axios|undici|node:https|node:http|node:net|WebSocket)\b/u);
  assert.doesNotMatch(source, /\b(?:process\.env|Deno\.env|Bun\.env|getenv|dotenv)\b/u);
  assert.doesNotMatch(source, /\b(?:pg|postgres|postgresql|knex|prisma)\s*(?:Client|Pool|connect)\b/iu);
  assert.doesNotMatch(source, /\b(?:child_process|worker_threads|fork|spawn|execFile)\b/u);
  assert.doesNotMatch(source, /\b(?:ApprovalSot|ApprovalStore|ReservationStore|ReceiptStore|TrustedClock)\b/u);
  assert.doesNotMatch(source, /\b(?:runner|runtimeBinding|runtime_binding_enabled|Gate2Command)\b/u);
}

type ProviderReturn = Awaited<ReturnType<FarmOsProviderCredentialBrokerPort["acquireOpaqueCredentialHandle"]>>;
type DatabaseReturn = Awaited<ReturnType<FarmOsDatabaseCredentialBrokerPort["acquireOpaqueCredentialHandle"]>>;
const opaqueTypeChecks: readonly [ProviderReturn, DatabaseReturn] = [
  null,
  null,
];
assert.deepEqual(opaqueTypeChecks, [null, null]);
assert.doesNotMatch(brokerSource, /handle_reference\s*:\s*string/u);
assert.doesNotMatch(brokerSource, /opaque_request_context_(?:reference|value)\s*\??:\s*string/u);
assert.match(brokerSource, /handle_reference_digest:\s*`sha256:\$\{string\}`/u);
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY.implementation_count, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY.implementation_count, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY.fallback_broker, "PROHIBITED");
assert.equal(FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY.fallback_broker, "PROHIBITED");
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY
  .supported_operation_class, "GET_SINGLE_PROJECT");
assert.equal(FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY
  .supported_operation_class, "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY");
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY
  .automatic_latest_selection, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY
  .automatic_latest_selection, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY
  .handle_request_correlation, "ESTABLISHED_BY_CONTRACT");
assert.equal(FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY
  .handle_durable_single_use, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY.implementation_state,
  "SOURCE_IMPLEMENTED_TRUSTED_CAPABILITY_ONLY");
assert.equal(FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY.production_callable, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY.runtime_binding_state, "NOT_BOUND");
assert.match(brokerSource, /FarmOsProviderOpaqueCredentialHandle/u);
assert.match(brokerSource, /FarmOsDatabaseOpaqueCredentialHandle/u);
assert.doesNotMatch(brokerSource,
  /broker_authority_id:\s*\n?\s*\|\s*typeof FARM_OS_PRODUCTION_TARGET_PROVIDER/u);

assert.notEqual(
  FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_POLICY.transport_schema,
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY.transport_schema,
);
assert.notEqual(
  FARM_OS_PRODUCTION_TARGET_PROVIDER_TLS_ATTESTATION_POLICY.authority_id,
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY.authority_id,
);
assert.equal(FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY.configuration_claim_is_attestation, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY.sql_self_attestation_accepted, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY.actual_tls_handshake_count, 0);

const baseAttestation = Object.freeze({
  activates_at: "2026-08-09T00:00:00.000Z",
  expires_at: "2026-08-11T00:00:00.000Z",
  revoked: false,
  approved_target_resource_digest: `sha256:${"1".repeat(64)}` as const,
  collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  collector_authority_revision: 1,
  principal_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  attributes: Object.freeze({
    superuser: false, createdb: false, createrole: false,
    replication: false, bypassrls: false,
  }),
  role_memberships: Object.freeze([] as string[]),
  approved_narrow_role: null,
  current_user_matches_expected: true,
  session_user_matches_expected: true,
  current_user_equals_session_user: true,
  has_function_privilege: true,
  execute_provenance: "DIRECT_DEDICATED_PRINCIPAL",
  execute_grantable: false,
  connection_authority_id: "farmos.production-target-connection-authority.v1",
  connection_authority_revision: 1,
} as const);
const NOW = "2026-08-10T00:00:00.000Z";
const collector = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  revision: 1,
  approved_target_resource_digest: baseAttestation.approved_target_resource_digest,
  allowed_operation_class: FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION,
  v5_authority_id: "farmos.production-target-identity-query.v5",
  v5_artifact_sha256: "sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52",
  minimal_observation_authority_id: "farmos.production-target-identity-minimal-observation-query.v1",
  minimal_observation_artifact_sha256:
    "sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805",
  required_connection_authority_id: "farmos.production-target-connection-authority.v1",
  required_connection_authority_revision: 1,
  required_principal_authority_id: "farmos.production-target-principal-capability-authority.v1",
  required_principal_authority_revision: 1,
  required_postgres_tls_authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_POLICY.authority_id,
  required_postgres_tls_authority_revision: 1,
  activates_at: "2026-08-09T00:00:00.000Z",
  expires_at: "2026-08-11T00:00:00.000Z",
  revoked: false,
  execution_enabled: false,
  runtime_bound: false,
  production_callable: false,
  automatic_latest_selection: false,
  fallback: "PROHIBITED",
} as const);
const principalExpected = {
  approved_target_resource_digest: baseAttestation.approved_target_resource_digest,
  now: NOW,
} as const;
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  baseAttestation, collector, principalExpected).accepted, true);
for (const rejected of [
  { ...baseAttestation, execute_provenance: "PUBLIC" },
  { ...baseAttestation, execute_provenance: "UNAPPROVED_BROAD_ROLE" },
  { ...baseAttestation, execute_provenance: "MIXED_OR_AMBIGUOUS" },
  { ...baseAttestation, execute_provenance: "NOT_AVAILABLE" },
  { ...baseAttestation, execute_grantable: true },
  { ...baseAttestation, role_memberships: ["pg_monitor"] },
  { ...baseAttestation, role_memberships: ["pg_read_all_data"] },
  { ...baseAttestation, role_memberships: ["pg_write_all_data"] },
  { ...baseAttestation, role_memberships: ["arbitrary_inherited_role"] },
  { ...baseAttestation, attributes: {} },
  { ...baseAttestation, attributes: { ...baseAttestation.attributes, superuser: true } },
]) {
  assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
    rejected as Parameters<typeof evaluateFarmOsProductionTargetPrincipalCapability>[0],
    collector, principalExpected).accepted, false);
}
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability({
  ...baseAttestation,
  execute_provenance: "APPROVED_NARROW_ROLE",
  approved_narrow_role: FARM_OS_PRODUCTION_TARGET_APPROVED_NARROW_EXECUTE_ROLE,
  role_memberships: [FARM_OS_PRODUCTION_TARGET_APPROVED_NARROW_EXECUTE_ROLE],
}, collector, principalExpected).accepted, true);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability({
  ...baseAttestation,
  execute_provenance: "APPROVED_NARROW_ROLE",
  approved_narrow_role: "custom_admin",
  role_memberships: ["custom_admin"],
}, collector, principalExpected).accepted, false);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  { ...baseAttestation, collector_authority_id: "other" }, collector, principalExpected).accepted, false);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  { ...baseAttestation, collector_authority_revision: 2 }, collector, principalExpected).accepted, false);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  baseAttestation, { ...collector, revoked: true }, principalExpected).accepted, false);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  baseAttestation, { ...collector, expires_at: NOW }, principalExpected).accepted, false);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  { ...baseAttestation, expires_at: "2026-02-31T00:00:00.000Z" },
  collector, principalExpected).accepted, false);
assert.equal(evaluateFarmOsProductionTargetPrincipalCapability(
  baseAttestation, {
    ...collector, approved_target_resource_digest: `sha256:${"2".repeat(64)}`,
  }, principalExpected).accepted, false);

assert.deepEqual(FARM_OS_PRODUCTION_TARGET_ACCESS_AUTHORITY_SOURCE_STATE, {
  contracts: "DEFINED",
  actual_broker_implementation: "NONE",
  actual_credentials: "UNRESOLVED",
  actual_credential_material: "NONE",
  actual_connection: "UNRESOLVED",
  actual_tls: "UNATTESTED",
  actual_principal: "UNATTESTED",
  actual_collector: "NONE",
  collector_production_callable: false,
  handle_request_correlation: "ESTABLISHED_BY_CONTRACT",
  handle_durable_single_use: "NOT_ESTABLISHED",
  handle_atomic_redemption: "NOT_ESTABLISHED",
  handle_restart_replay_prevention: "NOT_ESTABLISHED",
  handle_cross_process_consumption: "NOT_ESTABLISHED",
  actual_provider_feasibility: "NOT_ESTABLISHED",
  actual_database_feasibility: "NOT_ESTABLISHED",
  external_capability_probe: "HOLD_EXTERNAL_CAPABILITY_PROBE",
  probe_use_state: "NOT_AUTHORIZED",
  probe_authorized: false,
  qualification_state: "NOT_ESTABLISHED",
  adoption_state: "NOT_ADOPTED",
  gate2: "NOT_AUTHORIZED",
  runtime: "NOT_BOUND",
  production_access: "NOT_AUTHORIZED",
  external_call_count: 0,
  database_connection_count: 0,
  credential_material_count: 0,
  phase_c_artifact_count: 0,
});

console.log("Day150 Phase B ownership boundary tests passed");
