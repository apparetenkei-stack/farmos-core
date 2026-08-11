import assert from "node:assert/strict";
import {
  computeFarmOsProductionTargetExecutionClockEvidenceDigest,
  computeFarmOsProductionTargetExecutionClockEvidenceId,
  parseFarmOsProductionTargetExecutionClockEvidence,
  qualifyFarmOsProductionTargetExecutionClockEvidence,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  advanceFarmOsProductionTargetExecutionApprovalRevocationHead,
  compareFarmOsProductionTargetExecutionApprovalRevocationEventIdentity,
  computeFarmOsProductionTargetExecutionApprovalDigest,
  computeFarmOsProductionTargetExecutionApprovalReceiptDigest,
  computeFarmOsProductionTargetExecutionApprovalRevocationEventDigest,
  computeFarmOsProductionTargetExecutionApprovalRevocationEventId,
  computeFarmOsProductionTargetExecutionProposalDigest,
  createInitialFarmOsProductionTargetExecutionApprovalRevocationHead,
  evaluateFarmOsProductionTargetExecutionApprovalUsability,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
  resolveExactFarmOsProductionTargetExecutionApproval,
  validateFarmOsProductionTargetExecutionApprovalRevocationEvent,
  validateFarmOsProductionTargetExecutionApprovalRevocationState,
  validateFarmOsProductionTargetExecutionApprovalLineage,
  type FarmOsProductionTargetExecutionApprovalReceipt,
  type FarmOsProductionTargetExecutionApprovalRevocationEvent,
  type FarmOsProductionTargetExecutionHumanApproval,
  type FarmOsProductionTargetExecutionProposal,
} from "../../src/lib/hermes/farm_os_production_target_execution_approval_authority";
import {
  compareFarmOsProductionTargetExecutionCommandIdentity,
  computeFarmOsProductionTargetExecutionBindingDigest,
  computeFarmOsProductionTargetExecutionCommandRecordDigest,
  computeFarmOsProductionTargetPhaseBAuthorityBundleDigest,
  deriveFarmOsProductionTargetNoncanonicalProbeCommandId,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION,
  FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
  FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
  validateFarmOsProductionTargetExecutionCommand,
  type FarmOsProductionTargetExecutionCommand,
} from "../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import {
  computeFarmOsProductionTargetExecutionReceiptDigest,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION,
  validateFarmOsProductionTargetExecutionReceipt,
  validateFarmOsProductionTargetExecutionReceiptLifecycleBinding,
  type FarmOsProductionTargetExecutionReceipt,
} from "../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";
import type { FarmOsProductionTargetExecutionLifecycleRecord } from
  "../../src/lib/hermes/farm_os_production_target_execution_lifecycle";
import {
  deriveFarmOsProductionTargetEvidenceCommandId,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
} from "../../src/lib/hermes/farm_os_production_target_evidence_command_identity";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
} from "../../src/lib/hermes/farm_os_production_identity_query_v5_authority";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "../../src/lib/hermes/farm_os_production_target_identity_minimal_observation_authority";
import { FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID } from
  "../../src/lib/hermes/farm_os_production_target_external_feasibility_policy";
import { FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE } from
  "../../src/lib/hermes/farm_os_production_target_evidence_gate2_readiness";
import { FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT } from
  "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";

const D = (character: string) => `sha256:${character.repeat(64)}` as `sha256:${string}`;
const TIMES = Object.freeze({
  proposed: "2026-08-11T00:00:00.000Z",
  approved: "2026-08-11T00:01:00.000Z",
  receipt: "2026-08-11T00:02:00.000Z",
  issued: "2026-08-11T00:03:00.000Z",
  observed: "2026-08-11T00:04:00.000Z",
  expires: "2026-08-12T00:00:00.000Z",
});

function clock(status: FarmOsProductionTargetExecutionClockEvidence["status"] = "AVAILABLE",
  observed: string = TIMES.observed): FarmOsProductionTargetExecutionClockEvidence {
  const material = {
    schema_version: "farmos.production-target-execution-clock-evidence.v1" as const,
    clock_authority_id: "farmos.production-target-execution-trusted-clock.v1" as const,
    clock_authority_revision: 1,
    provenance_class: "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK" as const,
    observed_at: observed,
    observed_lower_bound: TIMES.proposed,
    recorded_at: observed,
    status,
    server_owned_record: true as const,
  };
  const evidence_digest = computeFarmOsProductionTargetExecutionClockEvidenceDigest(material);
  return Object.freeze({
    ...material,
    evidence_id: computeFarmOsProductionTargetExecutionClockEvidenceId(evidence_digest),
    evidence_digest,
  });
}

function lineage(operation:
  | typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION
  | typeof FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION) {
  const proposalMaterial = {
    authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
    authority_revision: 1 as const,
    proposal_id: operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION
      ? "proposal.c1-formal-001" : "proposal.c1-probe-001",
    target_binding_digest: D("1"),
    purpose: "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION" as const,
    operation_scope: operation,
    requested_by_actor_reference_digest: D("2"),
    proposed_at: TIMES.proposed,
    expires_at: TIMES.expires,
    revoked: false,
  };
  const proposal: FarmOsProductionTargetExecutionProposal = Object.freeze({
    ...proposalMaterial,
    proposal_digest: computeFarmOsProductionTargetExecutionProposalDigest(proposalMaterial),
  });
  const approvalMaterial = {
    authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
    authority_revision: 1 as const,
    approval_id: operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION
      ? "approval.c1-formal-001" : "approval.c1-probe-001",
    proposal_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
    proposal_authority_revision: 1 as const,
    proposal_id: proposal.proposal_id,
    proposal_digest: proposal.proposal_digest,
    target_binding_digest: proposal.target_binding_digest,
    operation_scope: operation,
    decision: "APPROVED" as const,
    actor_provenance: {
      actor_authority_id: "farmos.human-approval-actor-authority.v1" as const,
      actor_authority_revision: 1 as const,
      actor_reference_digest: D("3"),
      authentication_context_digest: D("4"),
      provenance_class: "SERVER_OWNED_AUTHENTICATED_HUMAN_REVIEW" as const,
      server_owned_record: true as const,
    },
    approved_at: TIMES.approved,
    expires_at: TIMES.expires,
    revoked: false,
  };
  const approval: FarmOsProductionTargetExecutionHumanApproval = Object.freeze({
    ...approvalMaterial,
    approval_digest: computeFarmOsProductionTargetExecutionApprovalDigest(approvalMaterial),
  });
  const receiptMaterial = {
    authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID,
    authority_revision: 1 as const,
    approval_receipt_id: operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION
      ? "approval-receipt.c1-formal-001" : "approval-receipt.c1-probe-001",
    proposal_id: proposal.proposal_id,
    proposal_digest: proposal.proposal_digest,
    approval_id: approval.approval_id,
    approval_digest: approval.approval_digest,
    target_binding_digest: proposal.target_binding_digest,
    operation_scope: operation,
    issued_at: TIMES.receipt,
    expires_at: TIMES.expires,
    status: "ISSUED" as const,
    server_owned_record: true as const,
  };
  const approval_receipt: FarmOsProductionTargetExecutionApprovalReceipt = Object.freeze({
    ...receiptMaterial,
    approval_receipt_digest:
      computeFarmOsProductionTargetExecutionApprovalReceiptDigest(receiptMaterial),
  });
  return { proposal, approval, approval_receipt };
}

function command(
  operation: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION |
    typeof FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
  approvalLineage = lineage(operation),
): FarmOsProductionTargetExecutionCommand {
  const currentClock = clock();
  const isFormal = operation === FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION;
  const operationArtifactAuthorityId = isFormal
    ? FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID
    : FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID;
  const operationArtifactSha = isFormal
    ? FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256 : D("8");
  const nonce = isFormal ? D("5") : D("6");
  const commandId = isFormal
    ? deriveFarmOsProductionTargetEvidenceCommandId({
      approval_id: approvalLineage.approval.approval_id,
      approval_receipt_id: approvalLineage.approval_receipt.approval_receipt_id,
      authority_id: FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
      nonce_digest: nonce,
      operation: FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
      proposal_id: approvalLineage.proposal.proposal_id,
      query_artifact_sha256: operationArtifactSha,
      target_binding_digest: approvalLineage.proposal.target_binding_digest,
    })
    : { accepted: true as const, command_id: deriveFarmOsProductionTargetNoncanonicalProbeCommandId({
      proposal_id: approvalLineage.proposal.proposal_id,
      approval_id: approvalLineage.approval.approval_id,
      approval_receipt_id: approvalLineage.approval_receipt.approval_receipt_id,
      nonce_digest: nonce,
      target_binding_digest: approvalLineage.proposal.target_binding_digest,
      operation_artifact_authority_id: operationArtifactAuthorityId,
      operation_artifact_sha256: operationArtifactSha,
    }) };
  assert.equal(commandId.accepted, true);
  if (!commandId.accepted) throw new Error("command identity rejected");
  const base = {
    schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION,
    command_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID,
    command_authority_revision: 1 as const,
    identity_authority_id: isFormal
      ? FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID
      : FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
    command_id: commandId.command_id,
    operation,
    target_manifest_id: "manifest.c1-primary-001",
    target_binding_digest: approvalLineage.proposal.target_binding_digest,
    v5_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    v5_artifact_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
    operation_artifact_authority_id: operationArtifactAuthorityId,
    operation_artifact_sha256: operationArtifactSha,
    phase_b_authority_bundle: FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
    phase_b_authority_bundle_digest: computeFarmOsProductionTargetPhaseBAuthorityBundleDigest(
      FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
    ),
    proposal_id: approvalLineage.proposal.proposal_id,
    proposal_digest: approvalLineage.proposal.proposal_digest,
    approval_id: approvalLineage.approval.approval_id,
    approval_digest: approvalLineage.approval.approval_digest,
    approval_receipt_id: approvalLineage.approval_receipt.approval_receipt_id,
    approval_receipt_digest: approvalLineage.approval_receipt.approval_receipt_digest,
    purpose: "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION" as const,
    scope_digest: D("7"),
    nonce_digest: nonce,
    limits: { maximum_provider_calls: 1 as const, maximum_database_connections: 1 as const,
      automatic_retry: 0 as const },
    issued_at: TIMES.issued,
    expires_at: TIMES.expires,
    trusted_clock_evidence_id: currentClock.evidence_id,
    trusted_clock_evidence_digest: currentClock.evidence_digest,
    source_build_identity_digest: D("9"),
    noncanonical: !isFormal,
    result_reusable: false as const,
    formal_evidence_eligible: isFormal,
    readiness_auto_promotion: false as const,
    manifest_effect: false as const,
    runtime_effect: false as const,
    production_evidence_receipt_created_by_phase_c: false as const,
    human_approval_required: true as const,
  };
  const execution_binding_digest = computeFarmOsProductionTargetExecutionBindingDigest(base);
  const withBinding = { ...base, execution_binding_digest };
  return Object.freeze({
    ...withBinding,
    command_record_digest: computeFarmOsProductionTargetExecutionCommandRecordDigest(withBinding),
  });
}

function validateCommand(value: unknown, operation: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION |
  typeof FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
  approvalLineage = lineage(operation)) {
  return validateFarmOsProductionTargetExecutionCommand({
    command: value,
    ...approvalLineage,
    clock_evidence: clock(),
    persisted_clock_lower_bound: TIMES.proposed,
  });
}

const availableClock = clock();
assert.equal(parseFarmOsProductionTargetExecutionClockEvidence(availableClock).accepted, true);
assert.equal(qualifyFarmOsProductionTargetExecutionClockEvidence({
  evidence: availableClock, persisted_lower_bound: TIMES.proposed,
}).accepted, true);
for (const status of ["UNAVAILABLE", "STALE", "REGRESSED", "INVALID"] as const) {
  assert.equal(parseFarmOsProductionTargetExecutionClockEvidence(clock(status)).accepted, false);
}
assert.equal(qualifyFarmOsProductionTargetExecutionClockEvidence({
  evidence: availableClock, persisted_lower_bound: "2026-08-11T00:05:00.000Z",
}).accepted, false);

const formalLineage = lineage(FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...formalLineage, clock_evidence: availableClock, persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);

const initialRevocationHead =
  createInitialFarmOsProductionTargetExecutionApprovalRevocationHead(formalLineage);
const approvalDigestBeforeRevocation = formalLineage.approval.approval_digest;
const approvalReceiptDigestBeforeRevocation =
  formalLineage.approval_receipt.approval_receipt_digest;
function revocationEvent(overrides: Partial<Omit<
  FarmOsProductionTargetExecutionApprovalRevocationEvent,
  "revocation_event_digest" | "revocation_event_id">> = {},
): FarmOsProductionTargetExecutionApprovalRevocationEvent {
  const material = {
    schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION,
    revocation_authority_id:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID,
    revocation_authority_revision: 1 as const,
    approval_id: formalLineage.approval.approval_id,
    approval_digest: formalLineage.approval.approval_digest,
    approval_receipt_id: formalLineage.approval_receipt.approval_receipt_id,
    approval_receipt_digest: formalLineage.approval_receipt.approval_receipt_digest,
    target_binding_digest: formalLineage.approval.target_binding_digest,
    operation_scope: formalLineage.approval.operation_scope,
    reason: "HUMAN_REVIEW_REVOKED" as const,
    trusted_clock_evidence_id: availableClock.evidence_id,
    trusted_clock_evidence_digest: availableClock.evidence_digest,
    effective_at: availableClock.observed_at,
    event_sequence: 1,
    previous_event_digest: null,
    server_owned_record: true as const,
    append_only: true as const,
    ...overrides,
  };
  const revocation_event_digest =
    computeFarmOsProductionTargetExecutionApprovalRevocationEventDigest(material);
  return Object.freeze({ ...material, revocation_event_digest,
    revocation_event_id:
      computeFarmOsProductionTargetExecutionApprovalRevocationEventId(
        revocation_event_digest,
      ) });
}
const validRevocationEvent = revocationEvent();
assert.equal(validateFarmOsProductionTargetExecutionApprovalRevocationEvent({
  event: validRevocationEvent,
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);
const revokedHeadResult = advanceFarmOsProductionTargetExecutionApprovalRevocationHead({
  current_head: initialRevocationHead,
  expected_head_version: initialRevocationHead.head_version,
  expected_head_digest: initialRevocationHead.head_digest,
  event: validRevocationEvent,
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
});
assert.equal(revokedHeadResult.accepted, true);
if (!revokedHeadResult.accepted) throw new Error("revocation head rejected");
assert.equal(evaluateFarmOsProductionTargetExecutionApprovalUsability({
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  revocation_head: revokedHeadResult.head,
  revocation_event: validRevocationEvent,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).status, "REVOKED");
assert.equal(formalLineage.approval.approval_digest, approvalDigestBeforeRevocation);
assert.equal(formalLineage.approval_receipt.approval_receipt_digest,
  approvalReceiptDigestBeforeRevocation);
for (const invalidEvent of [
  revocationEvent({ approval_id: "approval.c1-wrong-001" }),
  revocationEvent({ approval_digest: D("0") }),
  revocationEvent({ target_binding_digest: D("0") }),
  revocationEvent({ trusted_clock_evidence_digest: D("0") }),
  { ...validRevocationEvent, revocation_authority_id: "latest" },
  { ...validRevocationEvent, client_provided_authority_role: "admin" },
  { ...validRevocationEvent, credential: "secret-like-forbidden" },
]) {
  assert.equal(validateFarmOsProductionTargetExecutionApprovalRevocationEvent({
    event: invalidEvent,
    approval: formalLineage.approval,
    approval_receipt: formalLineage.approval_receipt,
    clock_evidence: availableClock,
    persisted_clock_lower_bound: TIMES.proposed,
  }).accepted, false);
}
assert.equal(advanceFarmOsProductionTargetExecutionApprovalRevocationHead({
  current_head: initialRevocationHead,
  expected_head_version: 1,
  expected_head_digest: initialRevocationHead.head_digest,
  event: validRevocationEvent,
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(advanceFarmOsProductionTargetExecutionApprovalRevocationHead({
  current_head: initialRevocationHead,
  expected_head_version: 0,
  expected_head_digest: initialRevocationHead.head_digest,
  event: revocationEvent({ event_sequence: 2 }),
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(compareFarmOsProductionTargetExecutionApprovalRevocationEventIdentity(
  validRevocationEvent,
  validRevocationEvent,
), "MATCH");
assert.equal(compareFarmOsProductionTargetExecutionApprovalRevocationEventIdentity(
  validRevocationEvent,
  { ...validRevocationEvent, revocation_event_digest: D("0") },
), "REVOCATION_EVENT_CONFLICT");
assert.equal(validateFarmOsProductionTargetExecutionApprovalRevocationState({
  state: { head: revokedHeadResult.head, latest_event: validRevocationEvent },
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);
assert.equal(validateFarmOsProductionTargetExecutionApprovalRevocationState({
  state: { head: initialRevocationHead, latest_event: validRevocationEvent },
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
const invalidChronologyReceiptMaterial = Object.freeze({
  ...formalLineage.approval_receipt,
  issued_at: TIMES.proposed,
});
const { approval_receipt_digest: _ignoredChronologyDigest,
  ...invalidChronologyReceiptWithoutDigest } = invalidChronologyReceiptMaterial;
const invalidChronologyReceipt = Object.freeze({
  ...invalidChronologyReceiptWithoutDigest,
  approval_receipt_digest: computeFarmOsProductionTargetExecutionApprovalReceiptDigest(
    invalidChronologyReceiptWithoutDigest,
  ),
});
const invalidChronologyHead =
  createInitialFarmOsProductionTargetExecutionApprovalRevocationHead({
    ...formalLineage,
    approval_receipt: invalidChronologyReceipt,
  });
assert.equal(validateFarmOsProductionTargetExecutionApprovalRevocationState({
  state: { head: invalidChronologyHead, latest_event: null },
  approval: formalLineage.approval,
  approval_receipt: invalidChronologyReceipt,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(evaluateFarmOsProductionTargetExecutionApprovalUsability({
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  revocation_head: initialRevocationHead,
  revocation_event: null,
  clock_evidence: clock("AVAILABLE", TIMES.expires),
  persisted_clock_lower_bound: TIMES.proposed,
}).status, "EXPIRED");
assert.equal(evaluateFarmOsProductionTargetExecutionApprovalUsability({
  approval: formalLineage.approval,
  approval_receipt: formalLineage.approval_receipt,
  revocation_head: null,
  revocation_event: null,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).status, "INVALID");
assert.equal(evaluateFarmOsProductionTargetExecutionApprovalUsability({
  approval: { ...formalLineage.approval, expires_at: "2026-08-13T00:00:00.000Z" },
  approval_receipt: formalLineage.approval_receipt,
  revocation_head: initialRevocationHead,
  revocation_event: null,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).status, "INVALID");

function replaceApprovalTiming(input: typeof formalLineage, approvedAt: string, expiresAt: string,
  receiptIssuedAt: string = input.approval_receipt.issued_at) {
  const approvalMaterial = {
    ...input.approval,
    approved_at: approvedAt,
    expires_at: expiresAt,
  };
  const { approval_digest: _oldApprovalDigest, ...approvalWithoutDigest } = approvalMaterial;
  const approval = Object.freeze({ ...approvalWithoutDigest,
    approval_digest: computeFarmOsProductionTargetExecutionApprovalDigest(approvalWithoutDigest) });
  const receiptMaterial = {
    ...input.approval_receipt,
    approval_digest: approval.approval_digest,
    issued_at: receiptIssuedAt,
    expires_at: expiresAt,
  };
  const { approval_receipt_digest: _oldReceiptDigest, ...receiptWithoutDigest } = receiptMaterial;
  const approval_receipt = Object.freeze({ ...receiptWithoutDigest,
    approval_receipt_digest:
      computeFarmOsProductionTargetExecutionApprovalReceiptDigest(receiptWithoutDigest) });
  return Object.freeze({ proposal: input.proposal, approval, approval_receipt });
}

const approvalBeforeProposal = replaceApprovalTiming(
  formalLineage, "2026-08-10T23:59:00.000Z", TIMES.expires,
);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...approvalBeforeProposal, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
const receiptBeforeApproval = replaceApprovalTiming(
  formalLineage, TIMES.approved, TIMES.expires, "2026-08-11T00:00:30.000Z",
);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...receiptBeforeApproval, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...formalLineage,
  approval: { ...formalLineage.approval, proposal_digest: D("a") },
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(resolveExactFarmOsProductionTargetExecutionApproval({
  candidates: [formalLineage.approval],
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
  authority_revision: 1,
  approval_id: formalLineage.approval.approval_id,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);
assert.equal(resolveExactFarmOsProductionTargetExecutionApproval({
  candidates: [formalLineage.approval],
  authority_id: "latest",
  authority_revision: 1,
  approval_id: formalLineage.approval.approval_id,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(resolveExactFarmOsProductionTargetExecutionApproval({
  candidates: [formalLineage.approval],
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
  authority_revision: 1,
  approval_id: "approval.c1-unknown-001",
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(resolveExactFarmOsProductionTargetExecutionApproval({
  candidates: [formalLineage.approval, structuredClone(formalLineage.approval)],
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
  authority_revision: 1,
  approval_id: formalLineage.approval.approval_id,
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...formalLineage,
  approval: { ...formalLineage.approval, actor_provenance: {
    ...formalLineage.approval.actor_provenance, server_owned_record: false,
  } },
  clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...formalLineage, approval: { ...formalLineage.approval, revoked: true },
  clock_evidence: availableClock, persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  ...formalLineage,
  clock_evidence: clock("AVAILABLE", "2026-08-12T00:00:00.000Z"),
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);

const formalCommand = command(FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage);
const formalCommandAfterRevocationSemantics = command(
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
  formalLineage,
);
assert.equal(formalCommandAfterRevocationSemantics.execution_binding_digest,
  formalCommand.execution_binding_digest);
assert.equal(formalCommandAfterRevocationSemantics.command_record_digest,
  formalCommand.command_record_digest);
const formalValidation = validateCommand(
  formalCommand, FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage,
);
assert.equal(formalValidation.accepted, true);
assert.match(formalCommand.command_id, /^g2cmd_[a-f0-9]{64}$/u);
assert.equal(formalCommand.identity_authority_id,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID);
const shorterApprovalLineage = replaceApprovalTiming(
  formalLineage, TIMES.approved, "2026-08-11T12:00:00.000Z",
);
const commandBeyondApprovalExpiry = command(
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, shorterApprovalLineage,
);
assert.equal(validateCommand(
  commandBeyondApprovalExpiry, FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION,
  shorterApprovalLineage,
).accepted, false);

const probeLineage = lineage(FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION);
const probeCommand = command(FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION, probeLineage);
assert.equal(validateCommand(
  probeCommand, FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION, probeLineage,
).accepted, true);
assert.match(probeCommand.command_id, /^probecmd_[a-f0-9]{64}$/u);
assert.doesNotMatch(probeCommand.command_id, /^g2cmd_/u);
assert.equal(probeCommand.noncanonical, true);
assert.equal(probeCommand.result_reusable, false);
assert.equal(probeCommand.formal_evidence_eligible, false);

assert.equal(validateCommand({
  ...formalCommand,
  identity_authority_id: FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
}, FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
assert.equal(validateCommand({
  ...formalCommand,
  phase_b_authority_bundle: {
    ...formalCommand.phase_b_authority_bundle,
    collector_policy_digest: D("0"),
  },
}, FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
assert.equal(validateCommand({ ...probeCommand, command_id: formalCommand.command_id },
  FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION, probeLineage).accepted, false);
assert.equal(validateCommand({
  ...formalCommand,
  phase_b_authority_bundle: {
    ...formalCommand.phase_b_authority_bundle,
    connection_authority_revision: 2,
  },
}, FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
const missingDependency = { ...formalCommand.phase_b_authority_bundle } as Record<string, unknown>;
delete missingDependency.collector_authority_id;
assert.equal(validateCommand({ ...formalCommand, phase_b_authority_bundle: missingDependency },
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
assert.equal(validateCommand({ ...formalCommand, token: "forbidden" },
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
assert.equal(validateCommand({ ...formalCommand, command_authority_revision: "latest" },
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
assert.equal(validateCommand({ ...formalCommand, execution_binding_digest: D("b") },
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION, formalLineage).accepted, false);
assert.equal(compareFarmOsProductionTargetExecutionCommandIdentity(
  formalCommand, { ...formalCommand, execution_binding_digest: D("c") },
), "COMMAND_IDENTITY_CONFLICT");

function executionReceipt(
  terminal: "CONSUMED_SUCCESS" | "OUTCOME_UNKNOWN",
): FarmOsProductionTargetExecutionReceipt {
  const unknown = terminal === "OUTCOME_UNKNOWN";
  const base = {
    schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION,
    receipt_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID,
    receipt_authority_revision: 1 as const,
    receipt_id: unknown ? "execution-receipt.c1-unknown-001" : "execution-receipt.c1-success-001",
    command_id: formalCommand.command_id,
    command_record_digest: formalCommand.command_record_digest,
    execution_binding_digest: formalCommand.execution_binding_digest,
    proposal_id: formalCommand.proposal_id,
    proposal_digest: formalCommand.proposal_digest,
    approval_id: formalCommand.approval_id,
    approval_digest: formalCommand.approval_digest,
    approval_receipt_id: formalCommand.approval_receipt_id,
    approval_receipt_digest: formalCommand.approval_receipt_digest,
    reservation_id: "reservation.c1-001",
    reservation_digest: D("d"),
    attempt_id: "attempt.c1-001",
    attempt_digest: D("e"),
    terminal_state: terminal,
    result_classification: unknown ? "UNKNOWN" as const : "SUCCEEDED" as const,
    unknown_stage: unknown ? "FINALIZATION_WRITE" as const : "NONE" as const,
    result_evidence_reference_digest: unknown ? null : D("f"),
    trusted_clock_evidence_id: availableClock.evidence_id,
    trusted_clock_evidence_digest: availableClock.evidence_digest,
    recorded_at: availableClock.observed_at,
    supersedes_receipt_id: null,
    supersedes_receipt_digest: null,
    append_only: true as const,
    automatic_retry_prohibited: true as const,
    manual_review_required: unknown,
    production_evidence_receipt: false as const,
  };
  return Object.freeze({ ...base,
    receipt_digest: computeFarmOsProductionTargetExecutionReceiptDigest(base) });
}

const successReceipt = executionReceipt("CONSUMED_SUCCESS");
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: successReceipt, command: formalCommand, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: { ...successReceipt, approval_digest: D("0") }, command: formalCommand,
  clock_evidence: availableClock, persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
const unknownReceipt = executionReceipt("OUTCOME_UNKNOWN");
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: unknownReceipt, command: formalCommand, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);
assert.equal(unknownReceipt.production_evidence_receipt, false);
assert.equal(unknownReceipt.manual_review_required, true);

function rebuildReceipt(value: FarmOsProductionTargetExecutionReceipt,
  changes: Partial<FarmOsProductionTargetExecutionReceipt>): FarmOsProductionTargetExecutionReceipt {
  const changed = { ...value, ...changes };
  const { receipt_digest: _oldDigest, ...withoutDigest } = changed;
  return Object.freeze({ ...withoutDigest,
    receipt_digest: computeFarmOsProductionTargetExecutionReceiptDigest(withoutDigest) });
}

const reservationUnknownReceipt = rebuildReceipt(unknownReceipt, {
  receipt_id: "execution-receipt.c1-reservation-unknown-001",
  reservation_id: null,
  reservation_digest: null,
  attempt_id: null,
  attempt_digest: null,
  terminal_state: "RESERVATION_OUTCOME_UNKNOWN",
  unknown_stage: "RESERVATION_WRITE",
});
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: reservationUnknownReceipt, command: formalCommand, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, true);
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: rebuildReceipt(unknownReceipt, { attempt_id: null, attempt_digest: null }),
  command: formalCommand, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: rebuildReceipt(reservationUnknownReceipt, {
    attempt_id: "attempt.c1-impossible-001", attempt_digest: D("0"),
  }),
  command: formalCommand, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: rebuildReceipt(successReceipt, {
    supersedes_receipt_id: "execution-receipt.c1-unresolved-old",
    supersedes_receipt_digest: D("0"),
  }),
  command: formalCommand, clock_evidence: availableClock,
  persisted_clock_lower_bound: TIMES.proposed,
}).accepted, false);
const lifecycleForSuccessReceipt = {
  ...successReceipt,
  state: successReceipt.terminal_state,
  terminal_receipt_id: successReceipt.receipt_id,
  terminal_receipt_digest: successReceipt.receipt_digest,
} as unknown as FarmOsProductionTargetExecutionLifecycleRecord;
assert.equal(validateFarmOsProductionTargetExecutionReceiptLifecycleBinding({
  receipt: successReceipt, lifecycle: lifecycleForSuccessReceipt,
}), true);
assert.equal(validateFarmOsProductionTargetExecutionReceiptLifecycleBinding({
  receipt: successReceipt,
  lifecycle: { ...lifecycleForSuccessReceipt, attempt_digest: D("0") },
}), false);

assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT.implementation_status,
  "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT.storage_backed_concurrency_tested,
  false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE
  .DURABLE_APPROVAL_SOT_ESTABLISHED, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE.TRUSTED_CLOCK_ESTABLISHED,
  "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE
  .DURABLE_RESERVATION_FINALIZATION_ESTABLISHED, "NOT_ESTABLISHED");

console.log("PASS Day150 Phase C1 authority contracts");
