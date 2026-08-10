import assert from "node:assert/strict";

import {
  canonicalizeFarmOsProductionTargetEvidenceCommandIdentity,
  deriveFarmOsProductionTargetEvidenceCommandId,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
  isFarmOsProductionTargetEvidenceCommandId,
} from "../../src/lib/hermes/farm_os_production_target_evidence_command_identity";

const vector = {
  approval_id: "approval.g2a-001",
  approval_receipt_id: "approval-receipt:g2a-001",
  authority_id: FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
  nonce_digest: `sha256:${"1".repeat(64)}`,
  operation: FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
  proposal_id: "proposal.g2a-001",
  query_artifact_sha256:
    "sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805",
  target_binding_digest: `sha256:${"2".repeat(64)}`,
} as const;
const goldenCanonical =
  "{\"approval_id\":\"approval.g2a-001\",\"approval_receipt_id\":\"approval-receipt:g2a-001\",\"authority_id\":\"farmos.production-target-evidence-command-id.v1\",\"nonce_digest\":\"sha256:1111111111111111111111111111111111111111111111111111111111111111\",\"operation\":\"ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE\",\"proposal_id\":\"proposal.g2a-001\",\"query_artifact_sha256\":\"sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805\",\"target_binding_digest\":\"sha256:2222222222222222222222222222222222222222222222222222222222222222\"}";
const goldenCommandId =
  "g2cmd_b19c871ad434a16015c9939125cdab3abb4dcd513b9aa9c0128b7434e993ed75";

const golden = deriveFarmOsProductionTargetEvidenceCommandId(vector);
assert.deepEqual(golden, {
  accepted: true,
  command_id: goldenCommandId,
  canonical_preimage: goldenCanonical,
});
assert.equal(isFarmOsProductionTargetEvidenceCommandId(goldenCommandId), true);
assert.equal(Buffer.byteLength(goldenCommandId, "ascii"), 70);
assert.match(goldenCommandId, /^g2cmd_[a-f0-9]{64}$/u);
assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId(vector), golden);

const reordered = {
  target_binding_digest: vector.target_binding_digest,
  proposal_id: vector.proposal_id,
  operation: vector.operation,
  query_artifact_sha256: vector.query_artifact_sha256,
  nonce_digest: vector.nonce_digest,
  authority_id: vector.authority_id,
  approval_receipt_id: vector.approval_receipt_id,
  approval_id: vector.approval_id,
};
assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId(reordered), golden);

const maxApprovalId = `a${"z".repeat(127)}`;
const maximum = deriveFarmOsProductionTargetEvidenceCommandId({
  ...vector, approval_id: maxApprovalId,
});
assert.equal(Buffer.byteLength(maxApprovalId, "ascii"), 128);
assert.equal(maximum.accepted, true);
assert.ok(maximum.accepted);
assert.equal(Buffer.byteLength(maximum.command_id, "ascii"), 70);
assert.match(maximum.command_id, /^g2cmd_[a-f0-9]{64}$/u);

const mutations = [
  { ...vector, approval_id: "approval.g2a-002" },
  { ...vector, approval_receipt_id: "approval-receipt:g2a-002" },
  { ...vector, authority_id: "farmos.production-target-evidence-command-id.v2" },
  { ...vector, nonce_digest: `sha256:${"3".repeat(64)}` },
  { ...vector, operation: "OTHER_OPERATION" },
  { ...vector, proposal_id: "proposal.g2a-002" },
  { ...vector, query_artifact_sha256: `sha256:${"4".repeat(64)}` },
  { ...vector, target_binding_digest: `sha256:${"5".repeat(64)}` },
] as const;
for (const [index, mutation] of mutations.entries()) {
  const changed = deriveFarmOsProductionTargetEvidenceCommandId(mutation);
  if (index === 2) {
    assert.deepEqual(changed, { accepted: false, reason: "AUTHORITY_ID_MISMATCH" });
  } else if (index === 4) {
    assert.deepEqual(changed, { accepted: false, reason: "OPERATION_MISMATCH" });
  } else {
    assert.ok(changed.accepted);
    assert.notEqual(changed.command_id, goldenCommandId);
  }
}

assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId({
  ...vector, query_artifact_sha256: "sha256:not-a-digest",
}), { accepted: false, reason: "QUERY_ARTIFACT_SHA256_INVALID" });
assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId({
  ...vector, nonce_digest: `sha256:${"A".repeat(64)}`,
}), { accepted: false, reason: "NONCE_DIGEST_INVALID" });
assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId({
  ...vector, approval_id: "approval.Ｇ2a",
}), { accepted: false, reason: "APPROVAL_ID_INVALID" });
assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId({
  ...vector, approval_id: 42,
}), { accepted: false, reason: "APPROVAL_ID_INVALID" });
assert.deepEqual(deriveFarmOsProductionTargetEvidenceCommandId({
  ...vector, unknown: "x",
}), { accepted: false, reason: "PREIMAGE_SCHEMA_INVALID" });
const { proposal_id: _proposalId, ...missingProposalId } = vector;
assert.deepEqual(canonicalizeFarmOsProductionTargetEvidenceCommandIdentity(missingProposalId), {
  accepted: false, reason: "PREIMAGE_SCHEMA_INVALID",
});
assert.equal(isFarmOsProductionTargetEvidenceCommandId(`command:${maxApprovalId}`), false);
assert.equal(isFarmOsProductionTargetEvidenceCommandId("command:approval.g2a-001"), false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY.truncation, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY.coercion, false);
assert.equal(
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY.implicit_unicode_normalization,
  false,
);

console.log("farm_os_day150_phase_a_gate2_command_identity: PASS");
