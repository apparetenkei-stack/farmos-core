import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  evaluateFarmOsProductionTargetExternalFeasibility,
  FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_OUTCOMES,
  FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY,
  FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID,
  type FarmOsExternalFeasibilityFacts,
} from "../../src/lib/hermes/farm_os_production_target_external_feasibility_policy";

function facts(
  overrides: Partial<FarmOsExternalFeasibilityFacts> = {},
): FarmOsExternalFeasibilityFacts {
  return {
    provider_source_outcome: "PROVIDER_SOURCE_FEASIBLE",
    account_scope_mapping_feasible: true,
    pg_control_system_available: true,
    function_execute_available: true,
    execute_acl_provenance: {
      exact_dedicated_principal: true,
      explicitly_approved_narrow_role: false,
      public_execute: false,
      unapproved_role_execute: false,
      unapproved_broad_inheritance: false,
    },
    execute_grantable: false,
    expected_dedicated_principal: true,
    current_user_matches_expected: true,
    session_user_matches_expected: true,
    current_user_equals_session_user: true,
    role_attributes: {
      superuser: false,
      createdb: false,
      createrole: false,
      replication: false,
      bypassrls: false,
    },
    prohibited_role_memberships: {
      pg_monitor: false,
      pg_read_all_data: false,
      pg_write_all_data: false,
      unapproved_broad_custom_role: false,
    },
    ...overrides,
  };
}

assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID,
  "farmos.production-target-external-feasibility-policy.v1");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY.policy_status,
  "POLICY_DEFINED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .actual_provider_feasibility_status, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .actual_account_scope_feasibility_status, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .actual_db_capability_status, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .actual_session_principal_status, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY.actual_probe_status,
  "HOLD_EXTERNAL_CAPABILITY_PROBE");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY.gate_2_status,
  "NOT_AUTHORIZED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY.phase_b_status,
  "NOT_STARTED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .minimal_observation_authority_reference,
  "farmos.production-target-identity-minimal-observation-query.v1");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .minimal_observation_artifact_sha256_reference,
  "sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .tls_boundary.requirement, "TLS_ATTESTATION_REQUIRED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .tls_boundary.owner, "PHASE_B_CONNECTION_AUTHORITY");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .public_execute_establishes_dedicated_capability, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .function_execute_alone_establishes_least_privilege, false);

const positive = evaluateFarmOsProductionTargetExternalFeasibility(facts());
assert.equal(positive.provider_outcome, "PROVIDER_SOURCE_FEASIBLE");
assert.equal(positive.account_scope_outcome, "ACCOUNT_SCOPE_MAPPING_FEASIBLE");
assert.equal(positive.function_execute_outcome, "FUNCTION_EXECUTE_AVAILABLE");
assert.equal(positive.least_privilege_outcome,
  "DEDICATED_PRINCIPAL_CAPABILITY_ATTESTED");
assert.equal(positive.db_cluster_observation_outcome,
  "DB_CLUSTER_OBSERVATION_FEASIBLE");
assert.equal(positive.session_principal_outcome,
  "SESSION_PRINCIPAL_ATTESTATION_FEASIBLE");
assert.equal(positive.overall_outcome, "EXTERNAL_FEASIBILITY_PASS");
assert.equal(positive.actual_feasibility_status, "SYNTHETIC_EVALUATION_ONLY");
assert.equal(positive.canonical_evidence_created, false);
assert.equal(positive.gate_2_authorized, false);
assert.equal(positive.readiness_promoted, false);
assert.equal(positive.external_call_count, 0);

const publicExecute = evaluateFarmOsProductionTargetExternalFeasibility(facts({
  execute_acl_provenance: {
    ...facts().execute_acl_provenance,
    exact_dedicated_principal: false,
    public_execute: true,
  },
}));
assert.equal(publicExecute.function_execute_outcome, "FUNCTION_EXECUTE_AVAILABLE");
assert.equal(publicExecute.least_privilege_outcome,
  "DEDICATED_PRINCIPAL_CAPABILITY_NOT_ATTESTED");
assert.equal(publicExecute.db_cluster_observation_outcome,
  "DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD");
assert.equal(publicExecute.overall_outcome, "EXTERNAL_FEASIBILITY_HOLD");

const unresolvedPrincipal = evaluateFarmOsProductionTargetExternalFeasibility(facts({
  current_user_matches_expected: false,
}));
assert.equal(unresolvedPrincipal.db_cluster_observation_outcome,
  "DB_CLUSTER_OBSERVATION_FEASIBLE");
assert.equal(unresolvedPrincipal.session_principal_outcome,
  "SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED");
assert.equal(unresolvedPrincipal.least_privilege_outcome,
  "DEDICATED_PRINCIPAL_CAPABILITY_NOT_ATTESTED");
assert.equal(unresolvedPrincipal.overall_outcome, "EXTERNAL_FEASIBILITY_HOLD");

const unavailable = evaluateFarmOsProductionTargetExternalFeasibility(facts({
  pg_control_system_available: false,
  function_execute_available: false,
  execute_acl_provenance: {
    ...facts().execute_acl_provenance,
    exact_dedicated_principal: false,
  },
}));
assert.equal(unavailable.function_execute_outcome, "FUNCTION_EXECUTE_NOT_AVAILABLE");
assert.equal(unavailable.db_cluster_observation_outcome,
  "DB_CLUSTER_OBSERVATION_NOT_AVAILABLE");

function assertBroadAuthorityRejected(
  override: Partial<FarmOsExternalFeasibilityFacts>,
): void {
  const result = evaluateFarmOsProductionTargetExternalFeasibility(facts(override));
  assert.equal(result.least_privilege_outcome,
    "DEDICATED_PRINCIPAL_CAPABILITY_NOT_ATTESTED");
  assert.equal(result.db_cluster_observation_outcome,
    "DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD");
  assert.equal(result.overall_outcome, "EXTERNAL_FEASIBILITY_HOLD");
}

assertBroadAuthorityRejected({
  role_attributes: { ...facts().role_attributes, superuser: true },
});
assertBroadAuthorityRejected({
  prohibited_role_memberships: {
    ...facts().prohibited_role_memberships, pg_monitor: true,
  },
});
assertBroadAuthorityRejected({
  prohibited_role_memberships: {
    ...facts().prohibited_role_memberships, pg_read_all_data: true,
  },
});
assertBroadAuthorityRejected({
  prohibited_role_memberships: {
    ...facts().prohibited_role_memberships, pg_write_all_data: true,
  },
});
assertBroadAuthorityRejected({
  prohibited_role_memberships: {
    ...facts().prohibited_role_memberships, unapproved_broad_custom_role: true,
  },
});
assertBroadAuthorityRejected({
  execute_acl_provenance: {
    ...facts().execute_acl_provenance,
    exact_dedicated_principal: false,
    unapproved_role_execute: true,
  },
});
assertBroadAuthorityRejected({
  execute_acl_provenance: {
    ...facts().execute_acl_provenance,
    public_execute: true,
  },
});
assertBroadAuthorityRejected({
  execute_acl_provenance: {
    ...facts().execute_acl_provenance,
    unapproved_broad_inheritance: true,
  },
});
assertBroadAuthorityRejected({ execute_grantable: true });

for (const attribute of ["createdb", "createrole", "replication", "bypassrls"] as const) {
  assertBroadAuthorityRejected({
    role_attributes: { ...facts().role_attributes, [attribute]: true },
  });
}

const approvedNarrowRole = evaluateFarmOsProductionTargetExternalFeasibility(facts({
  execute_acl_provenance: {
    ...facts().execute_acl_provenance,
    exact_dedicated_principal: false,
    explicitly_approved_narrow_role: true,
  },
}));
assert.equal(approvedNarrowRole.least_privilege_outcome,
  "DEDICATED_PRINCIPAL_CAPABILITY_ATTESTED");
assert.equal(approvedNarrowRole.overall_outcome, "EXTERNAL_FEASIBILITY_PASS");

const providerNotEstablished = evaluateFarmOsProductionTargetExternalFeasibility(facts({
  provider_source_outcome: "PROVIDER_SOURCE_NOT_ESTABLISHED",
  account_scope_mapping_feasible: true,
}));
assert.equal(providerNotEstablished.overall_outcome, "EXTERNAL_FEASIBILITY_HOLD");
assert.equal(providerNotEstablished.account_scope_outcome,
  "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE");
assert.equal(providerNotEstablished.canonical_evidence_created, false);

for (const required of [
  "PROVIDER_SOURCE_FEASIBLE",
  "ACCOUNT_SCOPE_MAPPING_FEASIBLE",
  "DB_CLUSTER_OBSERVATION_FEASIBLE",
  "SESSION_PRINCIPAL_ATTESTATION_FEASIBLE",
  "DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD",
  "DB_CLUSTER_OBSERVATION_NOT_AVAILABLE",
  "SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED",
  "PROVIDER_SOURCE_UNAUTHORIZED",
  "PROVIDER_SOURCE_UNAVAILABLE",
  "PROVIDER_SOURCE_FETCH_FAILED",
  "PROVIDER_SOURCE_STALE",
]) {
  assert.ok(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_OUTCOMES
    .includes(required as never));
}

const policySource = readFileSync(new URL(
  "../../src/lib/hermes/farm_os_production_target_external_feasibility_policy.ts",
  import.meta.url,
), "utf8");
assert.doesNotMatch(policySource, /\b(?:fetch|axios|undici|https?|net|pg)\b/u);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY.external_calls, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY.execution_enabled, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .db_capability_probe.pg_control_system_execution, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .canonical_outputs.provider_resource_fingerprint, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .canonical_outputs.cluster_system_identifier_digest, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY
  .canonical_outputs.gate_2_durable_receipt, 0);

console.log("Day150 Phase A external feasibility policy tests passed");
