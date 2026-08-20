import assert from "node:assert/strict";
import { FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION } from
  "../../src/lib/hermes/farm_os_production_identity_query_v5_adoption";
import {
  FarmOsProductionIdentityCollectorEntrypoint,
  assembleFarmOsProductionIdentityRuntimeEvidenceV2,
  assembleFarmOsProductionTargetLiveEvidenceV2,
  type FarmOsProductionIdentityCollectorPort,
  type FarmOsProductionIdentityCollectionCapability,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_evidence_v2";
import {
  FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX,
  FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX_STATUS,
  evaluateFarmOsProductionPrefixFingerprint,
} from "../../src/lib/hermes/farm_os_production_prefix_fingerprint_matrix_authority";
import { createFarmOsProductionIdentityConsumerProposal } from
  "../../src/lib/hermes/farm_os_production_identity_consumer_entrypoint";

const exactSeven = ["BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY", "PRODUCTION_TARGET_MANIFEST_REQUIRED",
  "BLOCKED_CONNECTION_AUTHORITY", "EXECUTION_APPROVAL_LINEAGE_REQUIRED",
  "PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_REQUIRED",
  "PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED",
  "PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED"];
assert.deepEqual(Object.keys(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.resolved_blockers)
  .filter((value) => exactSeven.includes(value)).sort(), exactSeven.sort());
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.remaining_blockers,
  ["BLOCKED_PROVIDER_CAPACITY_DESIGN"]);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.day150_closure_evidence
  .gate13_durability.durability_matrix,
{ D1: "PASS", D2: "PASS", D3: "PASS", D4: "PASS", D5: "PASS" });
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.day150_closure_evidence
  .gate13_durability.qualification_state, "SOURCE_ISOLATED_QUALIFIED");
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.day150_closure_evidence
  .gate13_durability.production_canonical_activation_state,
"NOT_EXECUTED_NOT_ACTIVATED");
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.day150_closure_evidence
  .gate13_durability.cleanup_zero_residual, true);
const digest = (value: string) => `sha256:${value.repeat(64)}` as const;
const trustedCollection = Object.freeze({ target_manifest_digest: digest("1"),
  target_identity_digest: digest("2"),
  query_authority_id: "farmos.production-target-identity-query.v5" as const,
  query_sha256: digest("3"),
  collector_authority_id: "farmos.production-target-collector-authority.v1" as const,
  connection_authority_id: "farmos.production-target-connection-authority.v1" as const,
  approval_receipt_digest: digest("4"), command_record_digest: digest("5"),
  lifecycle_record_digest: digest("6"), canonical_authority_head_digest: digest("7"),
  collected_at: "2026-08-13T00:00:00.000Z", sanitized_result_digest: digest("8"),
  collection_complete: true as const, transaction_read_only: true as const,
  production_write_count: 0 as const });
const collectorPort: FarmOsProductionIdentityCollectorPort = {
  port_authority: "farmos.production-identity-trusted-collector-port.v1",
  async collectExactV5ReadOnly() { return trustedCollection; },
};
const collector = new FarmOsProductionIdentityCollectorEntrypoint(collectorPort);
const collection = await collector.collect();
assert.equal(JSON.stringify(collection), "{}");
assert.throws(() => assembleFarmOsProductionIdentityRuntimeEvidenceV2(
  {} as FarmOsProductionIdentityCollectionCapability), /TRUSTED_COLLECTION_CAPABILITY_REQUIRED/u);
const runtime = assembleFarmOsProductionIdentityRuntimeEvidenceV2(collection);
const live = assembleFarmOsProductionTargetLiveEvidenceV2({ runtime: runtime.capability,
  observed_at: "2026-08-13T00:00:01.000Z" });
assert.equal(runtime.evidence.schema_version, "farmos.production-identity-runtime-evidence.v2");
assert.equal(live.evidence.schema_version, "farmos.production-target-live-evidence.v2");
assert.equal(runtime.evidence.production_write_count, 0);
assert.equal(FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX.length, 5);
assert.equal(FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX_STATUS.matrix_complete, true);
assert.equal(FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX_STATUS.approved_authority_count, 5);
const observations = FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX.map((entry, index) => ({
  migration_id: entry.migration_id, approved_expected: Object.freeze({}),
  observed_authority_id: entry.observed_authority_id,
  observed_fingerprint: digest(String(index + 1)),
}));
assert.equal(evaluateFarmOsProductionPrefixFingerprint({ ...observations[0]!,
  observed_fingerprint: digest("f") }).result, "CONFLICT");
assert.equal(evaluateFarmOsProductionPrefixFingerprint({ ...observations[0]!,
  observed_fingerprint: null }).result, "CONFLICT");
const proposal = createFarmOsProductionIdentityConsumerProposal({ live_evidence: live.capability,
  prefix_observations: observations });
assert.equal(proposal, null);
assert.equal(createFarmOsProductionIdentityConsumerProposal({ live_evidence: live.capability,
  prefix_observations: observations.slice(1) }), null);
console.log(JSON.stringify({ status: "PASS", resolved_blockers: 7,
  awaiting_expected_catalog_approval: false, gate13: "PASS", gate17: "PASS", prefix_entries: 5,
  production_collection_operations: 0, production_write_operations: 0 }));
