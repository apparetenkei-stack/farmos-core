import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING,
  validateFarmOsProductionTargetIdentityProductionEvidenceLineage,
} from "../../src/lib/hermes/farm_os_production_target_identity_formal_evidence";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_ARTIFACT_PATH,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "../../src/lib/hermes/farm_os_production_target_identity_minimal_observation_authority";
import {
  acquireFarmOsProductionTargetIdentityEvidence,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION,
  InMemoryFarmOsProductionTargetEvidenceCommandReservationStore,
  validateFarmOsProductionTargetEvidenceFixtureReceipt,
  validateFarmOsProductionTargetEvidenceProductionReceipt,
  validateFarmOsProductionTargetEvidenceStructuralReceipt,
  type FarmOsProductionTargetEvidenceApproval,
  type FarmOsProductionTargetEvidenceApprovalAuthority,
  type FarmOsProductionTargetEvidenceClock,
  type FarmOsProductionTargetEvidenceCommandReservationStore,
  type FarmOsProductionTargetEvidenceIsolatedAdapter,
  type FarmOsProductionTargetEvidenceProposal,
} from "./lib/farm_os_production_target_evidence_acquisition";

const NOW = "2026-08-10T01:00:00.000Z";
const RAW_PROVIDER_MARKER = "RawProviderMarker_A100";
const RAW_CLUSTER_MARKER = "18446744073709551614";
const artifact = readFileSync(FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_ARTIFACT_PATH);
const proposal: FarmOsProductionTargetEvidenceProposal = Object.freeze({
  schema_version: "farmos.production-target-evidence-acquisition-proposal.v1",
  proposal_id: "proposal:day150-phase-a-gate1-fixture",
  operation: FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_OPERATION,
  target_binding: FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING,
  query_authority_id: FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  query_artifact_sha256: FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  nonce: "day150_phase_a_nonce_0001",
  created_at: "2026-08-10T00:00:00.000Z",
  expires_at: "2026-08-10T02:00:00.000Z",
});
const approval: FarmOsProductionTargetEvidenceApproval = Object.freeze({
  schema_version: "farmos.production-target-evidence-acquisition-approval.v1",
  approval_id: "approval:day150-phase-a-gate1-fixture",
  proposal_id: proposal.proposal_id,
  approved_operation: proposal.operation,
  approved_target_binding: proposal.target_binding,
  approved_query_authority_id: proposal.query_authority_id,
  approved_query_artifact_sha256: proposal.query_artifact_sha256,
  approved_nonce: proposal.nonce,
  approved_at: "2026-08-10T00:30:00.000Z",
  expires_at: "2026-08-10T01:30:00.000Z",
  human_approval_reference: "fixture:phase-a-evidence-execution-approval:r1",
});

const clockAt = (value: string): FarmOsProductionTargetEvidenceClock => ({
  trust_class: "FIXTURE_CLOCK",
  now: () => value,
});
const approvalAuthority: FarmOsProductionTargetEvidenceApprovalAuthority = {
  trust_class: "FIXTURE_APPROVAL_AUTHORITY",
  async verify() {
    return {
      verified: true,
      approval_authority_id: "fixture.approval-authority",
      approval_receipt_id: "fixture.approval-receipt",
    };
  },
};

let adapterCalls: number = 0;
const adapter: FarmOsProductionTargetEvidenceIsolatedAdapter = {
  async observe(input) {
    adapterCalls += 1;
    assert.equal(input.connection_maximum, 1);
    assert.equal(input.transaction_count, 1);
    assert.equal(input.isolation_level, "REPEATABLE READ");
    assert.equal(input.transaction_access_mode, "READ ONLY");
    assert.equal(input.automatic_retry, 0);
    assert.equal(input.fallback, 0);
    assert.equal(input.commit, 0);
    assert.equal(input.rollback, "REQUIRED");
    assert.equal(input.connection_close, "REQUIRED");
    return {
      provider_resource_tuple: {
        provider_namespace: "supabase.com",
        resource_type: "project",
        account_scope_id: "FixtureAccount_A100",
        resource_id: RAW_PROVIDER_MARKER,
      },
      postgres_row: {
        transaction_read_only: "on",
        database_logical_name: "farmos_core_prod",
        postgres_major: 17,
        cluster_system_identifier_internal: RAW_CLUSTER_MARKER,
      },
      target_association: {
        schema_version: "farmos.production-target-evidence-target-association.v1",
        command_id: input.command_binding.command_id,
        nonce: input.command_binding.nonce,
        target_binding: input.command_binding.target_binding,
        provider_and_postgres_same_reserved_target: true,
      },
    };
  },
};

const noCallStore = () => new InMemoryFarmOsProductionTargetEvidenceCommandReservationStore();
const productionModeAttempt = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "PRODUCTION" as never,
  proposal,
  approval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: noCallStore(),
  isolated_adapter: adapter,
});
assert.deepEqual(productionModeAttempt, {
  accepted: false,
  reason: "EXECUTION_MODE_NOT_AUTHORIZED",
  external_call_count: 0,
});
assert.equal(adapterCalls, 0);
for (const [name, changedProposal, changedApproval, evaluatedAt, changedArtifact] of [
  ["expired", proposal, approval, "2026-08-10T01:30:00.000Z", artifact],
  ["future_approval", proposal, { ...approval, approved_at: "2026-08-10T01:15:00.000Z" },
    NOW, artifact],
  ["wrong_target", proposal, { ...approval, approved_target_binding: {
    ...approval.approved_target_binding, environment_id: "wrong-environment",
  } }, NOW, artifact],
  ["wrong_query_sha", { ...proposal, query_artifact_sha256: `sha256:${"0".repeat(64)}` },
    approval, NOW, artifact],
  ["wrong_artifact_bytes", proposal, approval, NOW, Buffer.from("wrong")],
] as const) {
  const before: number = adapterCalls;
  const result = await acquireFarmOsProductionTargetIdentityEvidence({
    execution_mode: "ISOLATED_FAKE_TEST",
    proposal: changedProposal,
    approval: changedApproval,
    clock: clockAt(evaluatedAt),
    approval_authority: approvalAuthority,
    query_artifact_bytes: changedArtifact,
    reservation_store: noCallStore(),
    isolated_adapter: adapter,
  });
  assert.equal(result.accepted, false, name);
  assert.equal(adapterCalls, before, `${name}: external calls before approval`);
  if (!result.accepted) assert.equal(result.external_call_count, 0);
}

const untrustedApproval = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal,
  approval,
  clock: clockAt(NOW),
  approval_authority: {
    trust_class: "FIXTURE_APPROVAL_AUTHORITY",
    async verify() { return { verified: false }; },
  },
  query_artifact_bytes: artifact,
  reservation_store: noCallStore(),
  isolated_adapter: adapter,
});
assert.deepEqual(untrustedApproval, {
  accepted: false,
  reason: "APPROVAL_AUTHORITY_REJECTED",
  external_call_count: 0,
});
assert.equal(adapterCalls, 0);

const reservationUnknown = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal,
  approval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: {
    durability: "PROCESS_LOCAL_TEST_ONLY",
    async reserve() { throw new Error("fixture_reservation_unknown"); },
    async finalizeConsumedReceipt() { return "OUTCOME_UNKNOWN"; },
  },
  isolated_adapter: adapter,
});
assert.deepEqual(reservationUnknown, {
  accepted: false,
  reason: "COMMAND_RESERVATION_OUTCOME_UNKNOWN",
  external_call_count: 0,
});
assert.equal(adapterCalls, 0);

const store = noCallStore();
const success = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal,
  approval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: store,
  isolated_adapter: adapter,
});
assert.equal(success.accepted, true);
assert.equal(adapterCalls, 1);
assert.ok(success.accepted);
assert.equal(success.receipt.status, "CONSUMED_SUCCESS");
assert.equal(success.receipt.execution_count, 1);
assert.equal(success.receipt.automatic_retry_count, 0);
assert.equal(success.receipt.secret_exposed, false);
assert.equal(success.receipt.production_writes, 0);
assert.equal(success.receipt.receipt_class, "NON_PRODUCTION_FIXTURE");
assert.equal(success.receipt.approval_authority_id, "fixture.approval-authority");
assert.equal(success.receipt.approval_receipt_id, "fixture.approval-receipt");
assert.match(success.receipt.target_association_digest!, /^sha256:[a-f0-9]{64}$/u);
const expectedReceiptLineage = {
  approval_authority_id: "fixture.approval-authority",
  approval_id: success.receipt.approval_id,
  approval_receipt_id: "fixture.approval-receipt",
  command_id: success.receipt.command_id,
  nonce: success.receipt.nonce,
  proposal_id: success.receipt.proposal_id,
  status: "CONSUMED_SUCCESS" as const,
  reason_code: "EVIDENCE_CREATED" as const,
  target_association_digest: success.receipt.target_association_digest,
};
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(success.receipt), true);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt(
  success.receipt, expectedReceiptLineage,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceProductionReceipt(
  success.receipt, expectedReceiptLineage,
), false);
assert.equal(validateFarmOsProductionTargetIdentityProductionEvidenceLineage(
  success.receipt.evidence,
  {
    approval_authority_id: expectedReceiptLineage.approval_authority_id,
    approval_receipt_id: expectedReceiptLineage.approval_receipt_id,
    command_id: expectedReceiptLineage.command_id,
    target_association_digest: success.receipt.target_association_digest!,
  },
), false);
const classificationOnlyTamper = {
  ...success.receipt,
  receipt_class: "PRODUCTION_RECEIPT",
};
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(
  classificationOnlyTamper,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt(
  classificationOnlyTamper, expectedReceiptLineage,
), false);
assert.equal(validateFarmOsProductionTargetEvidenceProductionReceipt(
  classificationOnlyTamper, expectedReceiptLineage,
), false);
const evidenceClassificationMismatch = {
  ...success.receipt,
  evidence: { ...success.receipt.evidence!, evidence_class: "PRODUCTION_FORMAL_EVIDENCE" },
};
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(
  evidenceClassificationMismatch,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt(
  evidenceClassificationMismatch, expectedReceiptLineage,
), false);
assert.equal(validateFarmOsProductionTargetEvidenceProductionReceipt(
  evidenceClassificationMismatch, expectedReceiptLineage,
), false);
const coordinatedProductionTamper = {
  ...success.receipt,
  receipt_class: "PRODUCTION_RECEIPT",
  approval_authority_id: "production.approval-authority",
  approval_receipt_id: "production.approval-receipt",
  evidence: {
    ...success.receipt.evidence!,
    evidence_class: "PRODUCTION_FORMAL_EVIDENCE",
    evidence_acquisition_approval_authority_id: "production.approval-authority",
    evidence_acquisition_approval_receipt_id: "production.approval-receipt",
  },
};
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(
  coordinatedProductionTamper,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceProductionReceipt(
  coordinatedProductionTamper,
  {
    ...expectedReceiptLineage,
    approval_authority_id: "production.approval-authority",
    approval_receipt_id: "production.approval-receipt",
  },
), false);
const wrongFixtureAuthorityBinding = {
  ...success.receipt,
  approval_authority_id: "fixture.other-approval-authority",
};
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(
  wrongFixtureAuthorityBinding,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt(
  wrongFixtureAuthorityBinding, expectedReceiptLineage,
), false);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt({
  ...success.receipt,
  approval_receipt_id: "fixture.other-receipt",
}, expectedReceiptLineage), false);
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt({
  ...success.receipt,
  reason_code: "RAW_PROVIDER_INPUT_REJECTED",
}), false);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt({
  ...success.receipt,
  approval_id: "approval:tampered",
  command_id: "command:approval:tampered",
}, expectedReceiptLineage), false);
const coordinatedDigest = `sha256:${"f".repeat(64)}` as const;
const coordinatedDigestTamper = {
  ...success.receipt,
  target_association_digest: coordinatedDigest,
  evidence: { ...success.receipt.evidence!, target_association_digest: coordinatedDigest },
};
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(
  coordinatedDigestTamper,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt(
  coordinatedDigestTamper,
  { ...expectedReceiptLineage, target_association_digest: coordinatedDigest },
), false);
const serialized = JSON.stringify(success);
assert.equal(serialized.includes(RAW_PROVIDER_MARKER), false);
assert.equal(serialized.includes(RAW_CLUSTER_MARKER), false);
assert.equal(serialized.includes("provider_resource_tuple"), false);
assert.equal(serialized.includes("cluster_system_identifier_internal"), false);

const replay = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal,
  approval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: store,
  isolated_adapter: adapter,
});
assert.deepEqual(replay, { accepted: false, reason: "REPLAY_REJECTED", external_call_count: 0 });
assert.equal(adapterCalls, 1);

const mutableArtifactBytes = Uint8Array.from(artifact);
const mutationProposal = {
  ...proposal,
  proposal_id: "proposal:day150-artifact-snapshot-fixture",
  nonce: "day150_phase_a_nonce_0005",
};
const mutationApproval = {
  ...approval,
  approval_id: "approval:day150-artifact-snapshot-fixture",
  proposal_id: mutationProposal.proposal_id,
  approved_nonce: mutationProposal.nonce,
};
const mutationResult = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal: mutationProposal,
  approval: mutationApproval,
  clock: clockAt(NOW),
  approval_authority: {
    trust_class: "FIXTURE_APPROVAL_AUTHORITY",
    async verify() {
      mutableArtifactBytes[0] ^= 0xff;
      return {
        verified: true,
        approval_authority_id: "fixture.approval-authority",
        approval_receipt_id: "fixture.approval-receipt",
      };
    },
  },
  query_artifact_bytes: mutableArtifactBytes,
  reservation_store: noCallStore(),
  isolated_adapter: {
    async observe(input) {
      assert.equal(Buffer.compare(Buffer.from(input.query_artifact_bytes), artifact), 0);
      return adapter.observe(input);
    },
  },
});
assert.equal(mutationResult.accepted, true);

const rawExtraProposal = { ...proposal, proposal_id: "proposal:day150-raw-extra-fixture",
  nonce: "day150_phase_a_nonce_0003" };
const rawExtraApproval = { ...approval, approval_id: "approval:day150-raw-extra-fixture",
  proposal_id: rawExtraProposal.proposal_id, approved_nonce: rawExtraProposal.nonce };
const rawExtra = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal: rawExtraProposal,
  approval: rawExtraApproval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: noCallStore(),
  isolated_adapter: {
    async observe(input) {
      return {
        provider_resource_tuple: {
          provider_namespace: "supabase.com",
          resource_type: "project",
          account_scope_id: "FixtureAccount_A100",
          resource_id: RAW_PROVIDER_MARKER,
          credential: "RawCredentialMarker_A100",
        },
        postgres_row: {
          transaction_read_only: "on",
          database_logical_name: "farmos_core_prod",
          postgres_major: 17,
          cluster_system_identifier_internal: RAW_CLUSTER_MARKER,
        },
        target_association: {
          schema_version: "farmos.production-target-evidence-target-association.v1",
          command_id: input.command_binding.command_id,
          nonce: input.command_binding.nonce,
          target_binding: input.command_binding.target_binding,
          provider_and_postgres_same_reserved_target: true,
        },
      } as never;
    },
  },
});
assert.ok(rawExtra.accepted);
assert.equal(rawExtra.receipt.status, "CONSUMED_FAILURE");
assert.equal(rawExtra.receipt.reason_code, "RAW_OBSERVATION_REJECTED");
assert.equal(JSON.stringify(rawExtra).includes("RawCredentialMarker_A100"), false);

let failureCalls = 0;
const throwingAdapter: FarmOsProductionTargetEvidenceIsolatedAdapter = {
  async observe() {
    failureCalls += 1;
    throw new Error(`${RAW_PROVIDER_MARKER}:${RAW_CLUSTER_MARKER}`);
  },
};
const failureProposal = { ...proposal, proposal_id: "proposal:day150-failure-fixture",
  nonce: "day150_phase_a_nonce_0002" };
const failureApproval = { ...approval, approval_id: "approval:day150-failure-fixture",
  proposal_id: failureProposal.proposal_id, approved_nonce: failureProposal.nonce };
const failure = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal: failureProposal,
  approval: failureApproval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: noCallStore(),
  isolated_adapter: throwingAdapter,
});
assert.equal(failure.accepted, true);
assert.ok(failure.accepted);
assert.equal(failure.receipt.status, "CONSUMED_FAILURE");
assert.equal(failure.receipt.reason_code, "ISOLATED_ADAPTER_FAILURE");
const failureExpectedLineage = {
  approval_authority_id: "fixture.approval-authority",
  approval_id: failure.receipt.approval_id,
  approval_receipt_id: "fixture.approval-receipt",
  command_id: failure.receipt.command_id,
  nonce: failure.receipt.nonce,
  proposal_id: failure.receipt.proposal_id,
  status: "CONSUMED_FAILURE",
  reason_code: "ISOLATED_ADAPTER_FAILURE",
  target_association_digest: null,
} as const;
assert.equal(validateFarmOsProductionTargetEvidenceStructuralReceipt(failure.receipt), true);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt(
  failure.receipt, failureExpectedLineage,
), true);
assert.equal(validateFarmOsProductionTargetEvidenceProductionReceipt(
  failure.receipt, failureExpectedLineage,
), false);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt({
  ...failure.receipt,
  nonce: "x",
}, { ...failureExpectedLineage, nonce: "x" }), false);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt({
  ...failure.receipt,
  approval_authority_id: "https://example.invalid",
}, { ...failureExpectedLineage, approval_authority_id: "https://example.invalid" }), false);
assert.equal(validateFarmOsProductionTargetEvidenceFixtureReceipt({
  ...failure.receipt,
  approval_receipt_id: "secret-token-marker",
}, { ...failureExpectedLineage, approval_receipt_id: "secret-token-marker" }), false);
assert.equal(JSON.stringify(failure).includes(RAW_PROVIDER_MARKER), false);
assert.equal(JSON.stringify(failure).includes(RAW_CLUSTER_MARKER), false);
assert.equal(failureCalls, 1);

const outcomeUnknownBase = noCallStore();
const outcomeUnknownStore: FarmOsProductionTargetEvidenceCommandReservationStore = {
  durability: "PROCESS_LOCAL_TEST_ONLY",
  reserve: (command) => outcomeUnknownBase.reserve(command),
  async finalizeConsumedReceipt() { return "OUTCOME_UNKNOWN"; },
};
const unknownProposal = { ...proposal, proposal_id: "proposal:day150-outcome-unknown",
  nonce: "day150_phase_a_nonce_0004" };
const unknownApproval = { ...approval, approval_id: "approval:day150-outcome-unknown",
  proposal_id: unknownProposal.proposal_id, approved_nonce: unknownProposal.nonce };
const unknownOutcome = await acquireFarmOsProductionTargetIdentityEvidence({
  execution_mode: "ISOLATED_FAKE_TEST",
  proposal: unknownProposal,
  approval: unknownApproval,
  clock: clockAt(NOW),
  approval_authority: approvalAuthority,
  query_artifact_bytes: artifact,
  reservation_store: outcomeUnknownStore,
  isolated_adapter: adapter,
});
assert.deepEqual(unknownOutcome, {
  accepted: false,
  reason: "COMMAND_OUTCOME_UNKNOWN",
  external_call_count: 1,
});

assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.maximum_execution, 1);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.automatic_retry, 0);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.generic_runtime_authority,
  false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.production_adapter_implemented,
  false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.process_local_reservation_production_durability,
  false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.production_receipt_authority_status,
  "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_ACQUISITION_BOUNDARY.production_receipt_issuance,
  "NOT_ESTABLISHED");
assert.equal(store.durability, "PROCESS_LOCAL_TEST_ONLY");

console.log("farm_os_day150_phase_a_evidence_acquisition_boundary: PASS");
