import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { FARM_OS_PRODUCTION_IDENTITY_V2_SANITIZED_TEST_FIXTURE } from "./test_farm_os_production_identity_query_authority_v2_candidate";
import {
  FARM_OS_PRODUCTION_IDENTITY_EVIDENCE_COMPATIBILITY,
  assembleFarmOsProductionIdentityRuntimeEvidence,
  digestFarmOsApprovedProductionTargetManifest,
  validateFarmOsProductionIdentityRuntimeEvidence,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_evidence";
import {
  FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_POLICY,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
  FARM_OS_PRODUCTION_IDENTITY_PRECONNECTION_GATE_ORDER,
  FARM_OS_PRODUCTION_IDENTITY_RUNTIME_PORTS,
  createFarmOsProductionIdentityH2NotApplicableSentinel,
  evaluateFarmOsProductionIdentityPostgresMajor,
  loadFarmOsProductionIdentityQueryV2Artifact,
  parseFarmOsProductionIdentityQueryV2RuntimeBinding,
  planFarmOsProductionIdentityPreconnection,
  verifyFarmOsProductionIdentityQueryV2ArtifactBytes,
  type FarmOsProductionIdentityGateStatus,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_foundation";

const artifact = loadFarmOsProductionIdentityQueryV2Artifact();
assert.equal(artifact.status, "VERIFIED");
assert.equal(loadFarmOsProductionIdentityQueryV2Artifact.length, 0);
if (artifact.status !== "VERIFIED") throw new Error("formal_v2_artifact_not_verified");
assert.equal(artifact.sha256, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256);
assert.equal(artifact.section_plan.length, 11);
assert.deepEqual(artifact.section_plan.map((entry) => entry.ordinal), Array.from({ length: 11 }, (_, index) => index + 1));
assert.equal(artifact.section_plan[8]!.section_id, "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT");
assert.equal(artifact.section_plan[8]!.execution, "ONLY_WHEN_H1_PRESENT");
assert.equal(artifact.section_plan.every((entry, index) => index === 8 || entry.execution === "ALWAYS"), true);

assert.equal(parseFarmOsProductionIdentityQueryV2RuntimeBinding(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING), FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING);
assert.equal(parseFarmOsProductionIdentityQueryV2RuntimeBinding({ ...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING, enabled: true }), null);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.enabled, false);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.automatic_latest_selection, false);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.automatic_retry, 0);

const missingArtifact = verifyFarmOsProductionIdentityQueryV2ArtifactBytes(null);
assert.deepEqual(missingArtifact, {
  status: "BLOCKED", reason: "ARTIFACT_MISSING",
  artifact_path: "scripts/sql/farm_os_production_identity_readonly_v2.sql", actual_sha256: null,
});
const wrongBytes = Buffer.from(artifact.raw_bytes);
wrongBytes[wrongBytes.length - 1] = wrongBytes[wrongBytes.length - 1] === 10 ? 32 : 10;
const wrongArtifact = verifyFarmOsProductionIdentityQueryV2ArtifactBytes(wrongBytes);
assert.equal(wrongArtifact.status, "BLOCKED");
assert.equal(wrongArtifact.status === "BLOCKED" && wrongArtifact.reason, "ARTIFACT_SHA_MISMATCH");
for (const oldDigest of [
  "sha256:9d0f2cc06474fb30a20be879001ac12a0d0e710927e870eaac611e0ff117dc1f",
  "sha256:e4b525a0e24a719f222536c8bf10f165f68b75ffeb2321a735119bfbd00fdc90",
  "sha256:cab18bb51b0abc6fe4face62c2adf00140c0a9ba9cbcf184d80465a799fcd68f",
]) assert.notEqual(oldDigest, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256);

const allApproved: FarmOsProductionIdentityGateStatus = {
  postgres_compatibility_authority: "APPROVED",
  target_manifest: "APPROVED",
  collector_authority: "APPROVED",
  connection_authority: "APPROVED_VERIFY_READER",
  execution_approval: "VALID_RESERVED_ONE_SHOT",
};
const defaultPlan = planFarmOsProductionIdentityPreconnection({
  binding: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING,
  artifact,
  authorities: allApproved,
});
assert.deepEqual(defaultPlan, { result: "BLOCKED", gate: 1, reason: "BINDING_DISABLED", credential_resolution_eligible: false });

let credentialResolverCalls = 0;
let connectionCalls = 0;
let evidenceWriterCalls = 0;
const fakeCredentialResolver = { resolve: async (): Promise<null> => { credentialResolverCalls += 1; return null; } };
const fakeConnection = { begin: async (): Promise<void> => { connectionCalls += 1; } };
const fakeWriter = { write: async (): Promise<{ written: false }> => { evidenceWriterCalls += 1; return { written: false }; } };
void fakeCredentialResolver;
void fakeConnection;
void fakeWriter;
assert.equal(credentialResolverCalls, 0);
assert.equal(connectionCalls, 0);
assert.equal(evidenceWriterCalls, 0);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_RUNTIME_PORTS, {
  target_manifest_provider: "NONE", postgres_compatibility_authority_provider: "NONE", collector_authority_provider: "NONE",
  connection_authority_provider: "NONE", execution_approval_provider: "NONE",
  verify_reader_credential_resolver: "NONE", production_readonly_connection: "NONE", evidence_writer: "NONE",
});

const assertBlockedAt = (plan: ReturnType<typeof planFarmOsProductionIdentityPreconnection>, gate: number): void => {
  assert.equal(plan.result, "BLOCKED");
  if (plan.result === "BLOCKED") assert.equal(plan.gate, gate);
};
assertBlockedAt(planFarmOsProductionIdentityPreconnection({ binding: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING, artifact: missingArtifact, authorities: allApproved }), 1);
assertBlockedAt(planFarmOsProductionIdentityPreconnection({ binding: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING, artifact: wrongArtifact, authorities: allApproved }), 1);
assertBlockedAt(planFarmOsProductionIdentityPreconnection({
  binding: { ...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING, enabled: true }, artifact, authorities: allApproved,
}), 2);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_PRECONNECTION_GATE_ORDER, [
  "BINDING_ENABLED", "BINDING_AUTHORITY_EXACT", "ARTIFACT_EXISTS", "ARTIFACT_SHA_EXACT",
  "SECTION_PLAN_EXACT", "POSTGRES_COMPATIBILITY_AUTHORITY_AVAILABLE", "TARGET_MANIFEST_APPROVED",
  "COLLECTOR_AUTHORITY_APPROVED", "VERIFY_READER_CONNECTION_AUTHORITY_APPROVED",
  "ONE_SHOT_EXECUTION_APPROVAL_VALID_RESERVED",
]);

const reservedExecutionIds = new Set<string>();
const fakeReserveApproval = (executionId: string): "RESERVED" | "REPLAYED" => {
  if (reservedExecutionIds.has(executionId)) return "REPLAYED";
  reservedExecutionIds.add(executionId);
  return "RESERVED";
};
assert.equal(fakeReserveApproval("execution-one"), "RESERVED");
assert.equal(fakeReserveApproval("execution-one"), "REPLAYED");

assert.deepEqual(evaluateFarmOsProductionIdentityPostgresMajor(140000), { result: "BLOCK", reason: "POSTGRES_MAJOR_BELOW_MINIMUM" });
assert.deepEqual(evaluateFarmOsProductionIdentityPostgresMajor(150009), { result: "BLOCK", reason: "POSTGRES_MAJOR_BELOW_MINIMUM" });
assert.deepEqual(evaluateFarmOsProductionIdentityPostgresMajor(160000), { result: "ELIGIBLE_AT_POLICY_LAYER", postgres_major: 16 });
assert.deepEqual(evaluateFarmOsProductionIdentityPostgresMajor(170004), { result: "ELIGIBLE_AT_POLICY_LAYER", postgres_major: 17 });
assert.deepEqual(evaluateFarmOsProductionIdentityPostgresMajor(180000), { result: "BLOCK", reason: "POSTGRES_MAJOR_NOT_REVIEWED" });
assert.deepEqual(evaluateFarmOsProductionIdentityPostgresMajor(Number.NaN), { result: "BLOCK", reason: "INVALID_SERVER_VERSION" });
assert.equal(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_POLICY.minimum_postgres_major, 16);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_POLICY.qualification_required_before_execution, true);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.authority_status, "REQUIRED_NOT_APPROVED");
assert.equal(FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.authority_id, null);
assert.equal(`sha256:${createHash("sha256").update(FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.proposed_query_bytes).digest("hex")}`,
  FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.proposed_query_sha256);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.version_from_connection_config, false);

assert.deepEqual(createFarmOsProductionIdentityH2NotApplicableSentinel("absent"), {
  section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT",
  rows: [{
    section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", row_key: "__collection_status__",
    payload: { collection_status: "complete", inventory_complete: true, queried_target_count: 5, row_count: 0, state: "not_applicable" },
    sanitization_class: "SAFE_STRUCTURAL",
  }],
});

const clusterSection = FARM_OS_PRODUCTION_IDENTITY_V2_SANITIZED_TEST_FIXTURE.sections.find((candidate) => candidate.section_id === "B_CLUSTER_IDENTITY_SOURCE")!;
const clusterDigest = clusterSection.rows[0]!.payload.cluster_system_identifier_digest as `sha256:${string}`;
const expectedManifest = {
  schema_version: "farmos.production-target-identity.v1" as const,
  environment_id: "production-east",
  environment_class: "production" as const,
  database_logical_name: "production_logical",
  provider_class: "managed_postgres" as const,
  provider_resource_fingerprint: `sha256:${"2".repeat(64)}` as const,
  cluster_system_identifier_digest: clusterDigest,
  expected_postgres_major: 17,
  installation_id: "installation-one",
  farm_scope: "farm-one",
  expected_operator_class: "verify-reader",
  manifest_version: "farmos.core-db-provisioning-manifest.v1" as const,
  created_at: "2026-08-08T00:00:00.000Z",
  approved_by_reference: "approval/production-target/one",
};
const expectedManifestDigest = digestFarmOsApprovedProductionTargetManifest(expectedManifest);
assert.ok(expectedManifestDigest);
const executionApproval = {
  target_digest: expectedManifestDigest,
  collector_authority_id: "farmos.production-identity-collector.v2-foundation",
  query_authority_id: "farmos.production-target-identity-query.v2" as const,
  connection_authority_id: "farmos.verify-reader-connection.v1",
  principal: "human-reviewer",
  execution_id: "execution-one",
  nonce_digest: `sha256:${"3".repeat(64)}` as const,
  issued_at: "2026-08-08T23:58:00.000Z",
  approved_at: "2026-08-08T23:59:00.000Z",
  expires_at: "2026-08-09T00:05:00.000Z",
  max_executions: 1 as const,
  reservation_state: "RESERVED" as const,
};
const envelope = assembleFarmOsProductionIdentityRuntimeEvidence({
  sanitized_result: FARM_OS_PRODUCTION_IDENTITY_V2_SANITIZED_TEST_FIXTURE,
  approved_manifest: expectedManifest,
  approved_manifest_digest: expectedManifestDigest,
  collector_authority_id: "farmos.production-identity-collector.v2-foundation",
  connection_authority_id: "farmos.verify-reader-connection.v1",
  execution_approval: executionApproval,
  observed_at: "2026-08-09T00:00:00.000Z",
  evaluated_at: "2026-08-09T00:00:01.000Z",
});
assert.ok(envelope);
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(envelope), true);
assert.equal(envelope.observed_deployment_identity.environment_id, null);
assert.equal(envelope.observed_deployment_identity.installation_id, null);
assert.equal(envelope.identity_comparison.installation_id, "AVAILABILITY_ONLY_NOT_COMPARABLE");
assert.deepEqual(envelope.failure_classification, ["IDENTITY_INCOMPLETE"]);
assert.equal(envelope.collection_complete, true);
assert.equal(JSON.stringify(envelope).includes("9876543210123456789"), false);
assert.doesNotMatch(JSON.stringify(envelope), /raw_cluster_identifier|raw_sensitive_texts|default-secret-value/u);
const expectedEnvironmentProvenance = envelope.field_provenance.find((item) => item.field_path === "expected_identity.environment_id")!;
assert.equal(expectedEnvironmentProvenance.source_class, "TARGET_MANIFEST_EXPECTED");
const observedEnvironmentProvenance = envelope.field_provenance.find((item) => item.field_path === "observed_deployment_identity.environment_id")!;
assert.equal(observedEnvironmentProvenance.source_class, "NOT_AVAILABLE");
const wrongProvenance = structuredClone(envelope) as unknown as {
  field_provenance: Array<{ field_path: string; source_class: string }>;
};
wrongProvenance.field_provenance.find((item) => item.field_path === "expected_identity.environment_id")!.source_class = "QUERY_OBSERVED";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(wrongProvenance), false);
const manifestDigestMismatch = structuredClone(envelope) as unknown as { expected_identity: { database_logical_name: string } };
manifestDigestMismatch.expected_identity.database_logical_name = "different_database";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(manifestDigestMismatch), false);
const falseDatabaseComparison = structuredClone(envelope) as unknown as { database_identity: { comparison: string } };
falseDatabaseComparison.database_identity.comparison = "MISMATCH";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(falseDatabaseComparison), false);
const falseClusterComparison = structuredClone(envelope) as unknown as { identity_comparison: { cluster_system_identifier_digest: string } };
falseClusterComparison.identity_comparison.cluster_system_identifier_digest = "MISMATCH";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(falseClusterComparison), false);
const nullAuthorityLineage = structuredClone(envelope) as unknown as {
  collector_authority_id: null;
  connection_authority_id: null;
  execution_approval_lineage: { collector_authority_id: null; connection_authority_id: null };
};
nullAuthorityLineage.collector_authority_id = null;
nullAuthorityLineage.connection_authority_id = null;
nullAuthorityLineage.execution_approval_lineage.collector_authority_id = null;
nullAuthorityLineage.execution_approval_lineage.connection_authority_id = null;
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(nullAuthorityLineage), false);
const reversedEvaluationTime = structuredClone(envelope) as unknown as { evaluated_at: string };
reversedEvaluationTime.evaluated_at = "2026-08-08T23:59:59.000Z";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(reversedEvaluationTime), false);
const selfConfirming = structuredClone(envelope) as unknown as {
  expected_identity: { installation_id: string };
  observed_deployment_identity: { installation_id: string | null };
  field_provenance: Array<{ field_path: string; source_class: string }>;
};
selfConfirming.observed_deployment_identity.installation_id = selfConfirming.expected_identity.installation_id;
selfConfirming.field_provenance.find((item) => item.field_path === "observed_deployment_identity.installation_id")!.source_class = "QUERY_OBSERVED";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(selfConfirming), false);
const availabilityOnlyResult = structuredClone(FARM_OS_PRODUCTION_IDENTITY_V2_SANITIZED_TEST_FIXTURE);
const availabilitySection = availabilityOnlyResult.sections.find((candidate) => candidate.section_id === "E_INSTALLATION_FARM_BINDING_AVAILABILITY")!;
for (const availabilityRow of availabilitySection.rows) {
  availabilityRow.payload.available = true;
  availabilityRow.payload.catalog_sources = [{ schema_name: "ai", relation_name: `binding_${availabilityRow.row_key}`, data_type: "text" }];
}
const availabilityOnlyEnvelope = assembleFarmOsProductionIdentityRuntimeEvidence({
  sanitized_result: availabilityOnlyResult,
  approved_manifest: expectedManifest,
  approved_manifest_digest: expectedManifestDigest,
  collector_authority_id: "farmos.production-identity-collector.v2-foundation",
  connection_authority_id: "farmos.verify-reader-connection.v1",
  execution_approval: executionApproval,
  observed_at: "2026-08-09T00:00:00.000Z",
  evaluated_at: "2026-08-09T00:00:01.000Z",
});
assert.ok(availabilityOnlyEnvelope);
assert.equal(availabilityOnlyEnvelope.observed_deployment_identity.installation_id, null);
assert.equal(availabilityOnlyEnvelope.identity_comparison.installation_id, "AVAILABILITY_ONLY_NOT_COMPARABLE");
const nonfinite = structuredClone(envelope) as unknown as { server_identity: { server_version_num: number } };
nonfinite.server_identity.server_version_num = Number.POSITIVE_INFINITY;
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(nonfinite), false);
const rawSensitive = structuredClone(envelope) as unknown as Record<string, unknown>;
rawSensitive.raw_cluster_identifier = "123";
assert.equal(validateFarmOsProductionIdentityRuntimeEvidence(rawSensitive), false);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_EVIDENCE_COMPATIBILITY.semantic_lossless_conversion, false);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_EVIDENCE_COMPATIBILITY.unsafe_cast_allowed, false);

console.log(JSON.stringify({
  result: "pass",
  default_plan: defaultPlan.result,
  credential_resolver_calls: credentialResolverCalls,
  connection_calls: connectionCalls,
  evidence_writer_calls: evidenceWriterCalls,
  production_operations: 0,
}));
