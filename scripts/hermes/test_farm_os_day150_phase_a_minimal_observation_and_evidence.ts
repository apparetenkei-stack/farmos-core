import assert from "node:assert/strict";

import {
  createFarmOsProductionTargetIdentityFixtureEvidence,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_PRODUCTION_EVIDENCE_AUTHORITY_STATUS,
  FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION,
  validateFarmOsProductionTargetIdentityFixtureEvidenceLineage,
  validateFarmOsProductionTargetIdentityProductionEvidenceLineage,
  validateFarmOsProductionTargetIdentityStructuralEvidence,
} from "../../src/lib/hermes/farm_os_production_target_identity_formal_evidence";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY,
  loadFarmOsProductionTargetIdentityMinimalObservationArtifact,
  parseFarmOsProductionTargetIdentityMinimalObservation,
  verifyFarmOsProductionTargetIdentityMinimalObservationArtifact,
} from "../../src/lib/hermes/farm_os_production_target_identity_minimal_observation_authority";

const bytes = loadFarmOsProductionTargetIdentityMinimalObservationArtifact();
assert.notEqual(bytes, null);
assert.equal(verifyFarmOsProductionTargetIdentityMinimalObservationArtifact(bytes).verified, true);
const sql = Buffer.from(bytes!).toString("utf8");
assert.match(sql, /^-- Authority: farmos\.production-target-identity-minimal-observation-query\.v1/mu);
assert.equal((sql.match(/\bselect\b/giu) ?? []).length, 1);
assert.doesNotMatch(sql, /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|commit)\b/iu);
assert.doesNotMatch(sql, /\b(?:ai|audit|core_schema)\s*\./iu);
assert.deepEqual(FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY.execution, {
  connection_maximum: 1,
  transaction_count: 1,
  isolation_level: "REPEATABLE READ",
  transaction_access_mode: "READ ONLY",
  automatic_retry: 0,
  fallback: 0,
  commit: 0,
  rollback: "REQUIRED",
  connection_close: "REQUIRED",
});
assert.equal(FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY.execution_enabled,
  false);

const row = {
  transaction_read_only: "on",
  database_logical_name: "farmos_core_prod",
  postgres_major: 17,
  cluster_system_identifier_internal: "18446744073709551614",
};
const parsed = parseFarmOsProductionTargetIdentityMinimalObservation(row, {
  database_logical_name: "farmos_core_prod",
  expected_postgres_major: 17,
});
assert.equal(parsed.accepted, true);
assert.equal(JSON.stringify(parsed).includes("18446744073709551614"), false);
assert.equal(parseFarmOsProductionTargetIdentityMinimalObservation({
  ...row, unexpected: true,
}, { database_logical_name: "farmos_core_prod", expected_postgres_major: 17 }).accepted, false);
assert.deepEqual(parseFarmOsProductionTargetIdentityMinimalObservation({
  ...row, transaction_read_only: "off",
}, { database_logical_name: "farmos_core_prod", expected_postgres_major: 17 }), {
  accepted: false, reason: "TRANSACTION_NOT_READ_ONLY",
});
assert.deepEqual(parseFarmOsProductionTargetIdentityMinimalObservation({
  ...row, database_logical_name: "observed_other_database",
}, { database_logical_name: "farmos_core_prod", expected_postgres_major: 17 }), {
  accepted: false, reason: "DATABASE_LOGICAL_NAME_MISMATCH",
});
assert.deepEqual(parseFarmOsProductionTargetIdentityMinimalObservation({
  ...row, postgres_major: 16,
}, { database_logical_name: "farmos_core_prod", expected_postgres_major: 17 }), {
  accepted: false, reason: "POSTGRES_MAJOR_MISMATCH",
});

assert.deepEqual(FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING, {
  installation_id: "apparetenkei-farmos-core-mac-01",
  farm_scope: "apparetenkei-primary-farm",
  environment_class: "production",
  environment_id: "apparetenkei-production-primary",
  database_logical_name: "farmos_core_prod",
  expected_postgres_major: 17,
  provider_class: "managed_postgres",
  provider_implementation_family: "Supabase Managed PostgreSQL",
});
assert.deepEqual(FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.approved_target_schema_scope,
  ["ai", "audit", "core_schema"]);
assert.equal(FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.concrete_manifest_revision_exists,
  false);
assert.equal(
  FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.production_target_manifest_required_resolved,
  false,
);
assert.equal(FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.execution_approval_effect, "NONE");

assert.ok(parsed.accepted);
const evidence = createFarmOsProductionTargetIdentityFixtureEvidence({
  provider_resource_fingerprint: `sha256:${"1".repeat(64)}`,
  provider_resource_fingerprint_provenance_reference: "fixture:provider-observation:r1",
  cluster_system_identifier_digest: parsed.observation.cluster_system_identifier_digest,
  cluster_system_identifier_digest_provenance_reference: "fixture:postgres-observation:r1",
  evidence_acquisition_approval_authority_id: "fixture.approval-authority",
  evidence_acquisition_approval_receipt_id: "fixture.approval-receipt",
  evidence_acquisition_command_id: "command:fixture",
  target_association_digest: `sha256:${"2".repeat(64)}`,
});
assert.notEqual(evidence, null);
const expectedEvidenceLineage = {
  approval_authority_id: "fixture.approval-authority",
  approval_receipt_id: "fixture.approval-receipt",
  command_id: "command:fixture",
  target_association_digest: `sha256:${"2".repeat(64)}` as const,
};
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence(evidence), true);
assert.equal(validateFarmOsProductionTargetIdentityFixtureEvidenceLineage(
  evidence, expectedEvidenceLineage,
), true);
assert.equal(evidence!.evidence_class, "NON_PRODUCTION_FIXTURE");
assert.equal(validateFarmOsProductionTargetIdentityProductionEvidenceLineage(
  evidence, expectedEvidenceLineage,
), false);
const evidenceClassificationOnlyTamper = {
  ...evidence!, evidence_class: "PRODUCTION_FORMAL_EVIDENCE",
};
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence(
  evidenceClassificationOnlyTamper,
), true);
assert.equal(validateFarmOsProductionTargetIdentityFixtureEvidenceLineage(
  evidenceClassificationOnlyTamper, expectedEvidenceLineage,
), false);
assert.equal(validateFarmOsProductionTargetIdentityProductionEvidenceLineage(
  evidenceClassificationOnlyTamper, expectedEvidenceLineage,
), false);
const coordinatedProductionEvidenceTamper = {
  ...evidenceClassificationOnlyTamper,
  evidence_acquisition_approval_authority_id: "production-looking.approval-authority",
  evidence_acquisition_approval_receipt_id: "production-looking.approval-receipt",
  evidence_acquisition_command_id: "production-looking.command",
  provider_resource_fingerprint_provenance_reference: "production-looking:provider:r1",
  cluster_system_identifier_digest_provenance_reference: "production-looking:cluster:r1",
};
const coordinatedProductionEvidenceLineage = {
  approval_authority_id: "production-looking.approval-authority",
  approval_receipt_id: "production-looking.approval-receipt",
  command_id: "production-looking.command",
  target_association_digest: expectedEvidenceLineage.target_association_digest,
};
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence(
  coordinatedProductionEvidenceTamper,
), true);
assert.equal(validateFarmOsProductionTargetIdentityProductionEvidenceLineage(
  coordinatedProductionEvidenceTamper, coordinatedProductionEvidenceLineage,
), false);
assert.equal(FARM_OS_PRODUCTION_TARGET_IDENTITY_PRODUCTION_EVIDENCE_AUTHORITY_STATUS,
  "NOT_ESTABLISHED");
assert.deepEqual(createFarmOsProductionTargetIdentityFixtureEvidence({
  provider_resource_fingerprint: `sha256:${"1".repeat(64)}`,
  provider_resource_fingerprint_provenance_reference: "fixture:provider-observation:r1",
  cluster_system_identifier_digest: parsed.observation.cluster_system_identifier_digest,
  cluster_system_identifier_digest_provenance_reference: "fixture:postgres-observation:r1",
  evidence_acquisition_approval_authority_id: "fixture.approval-authority",
  evidence_acquisition_approval_receipt_id: "fixture.approval-receipt",
  evidence_acquisition_command_id: "command:fixture",
  target_association_digest: `sha256:${"2".repeat(64)}`,
}), evidence);
for (const changed of [
  { ...evidence!, target_binding: { ...evidence!.target_binding, environment_id: "other" } },
  { ...evidence!, target_binding: { ...evidence!.target_binding, database_logical_name: "other" } },
  { ...evidence!, target_binding: { ...evidence!.target_binding, provider_class: "other" } },
  { ...evidence!, target_binding: {
    ...evidence!.target_binding, provider_implementation_family: "Other Managed PostgreSQL",
  } },
  { ...evidence!, target_binding: { ...evidence!.target_binding, expected_postgres_major: 16 } },
]) assert.equal(validateFarmOsProductionTargetIdentityFixtureEvidenceLineage(
  changed, expectedEvidenceLineage,
), false);
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence({ ...evidence!, raw_project_id: "x" }),
  false);
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence({ ...evidence!, token: "x" }), false);
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence({ ...evidence!, credential: "x" }),
  false);
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence({ ...evidence!, url: "x" }), false);
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence({
  ...evidence!, provider_resource_fingerprint_provenance_reference: "https://example.invalid/raw",
}), false);
const cyclic = { ...evidence! } as Record<string, unknown>;
cyclic.target_binding = cyclic;
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence(cyclic), false);
const { production_writes: _omitted, ...partial } = evidence!;
assert.equal(validateFarmOsProductionTargetIdentityStructuralEvidence(partial), false);
assert.equal(evidence!.secret_exposed, false);
assert.equal(evidence!.production_writes, 0);

console.log("farm_os_day150_phase_a_minimal_observation_and_evidence: PASS");
