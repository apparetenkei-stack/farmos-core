import { createHash } from "node:crypto";

import {
  computeFarmOsProductionTargetExecutionApprovalDigest,
  computeFarmOsProductionTargetExecutionApprovalReceiptDigest,
  computeFarmOsProductionTargetExecutionApprovalRevocationEventDigest,
  computeFarmOsProductionTargetExecutionApprovalRevocationEventId,
  computeFarmOsProductionTargetExecutionProposalDigest,
  createInitialFarmOsProductionTargetExecutionApprovalRevocationHead,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
  type FarmOsProductionTargetExecutionApprovalReceipt,
  type FarmOsProductionTargetExecutionHumanApproval,
  type FarmOsProductionTargetExecutionProposal,
} from "../../../src/lib/hermes/farm_os_production_target_execution_approval_authority";
import {
  computeFarmOsProductionTargetExecutionBindingDigest,
  computeFarmOsProductionTargetExecutionCommandRecordDigest,
  computeFarmOsProductionTargetPhaseBAuthorityBundleDigest,
  deriveFarmOsProductionTargetNoncanonicalProbeCommandId,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION,
  FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
  FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
  type FarmOsProductionTargetExecutionCommand,
} from "../../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import {
  createInitialFarmOsProductionTargetExecutionLifecycleRecord,
} from "../../../src/lib/hermes/farm_os_production_target_execution_lifecycle";
import {
  computeFarmOsProductionTargetExecutionReceiptDigest,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION,
  type FarmOsProductionTargetExecutionReceipt,
} from "../../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";
import {
  computeFarmOsProductionTargetExecutionClockEvidenceDigest,
  computeFarmOsProductionTargetExecutionClockEvidenceId,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v5_authority";
import { FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID } from
  "../../../src/lib/hermes/farm_os_production_target_external_feasibility_policy";

import {
  FARM_OS_PTE_C2A_SOURCE_COMMIT,
  FARM_OS_PTE_C2B_APPLICATION_NAME,
  FARM_OS_PTE_C2B_DATABASE,
  digestFarmOsPteC2b,
} from "./farm_os_production_target_execution_postgres_qualification_contract";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  deriveFarmOsProductionTargetExecutionPostgresAttemptDigest,
  deriveFarmOsProductionTargetExecutionPostgresReservationIdentity,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_SEQUENCE,
} from "../../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";

export const FARM_OS_PTE_C2B_MIGRATION_OWNER = "farmos_pte_c2b_owner" as const;
export const FARM_OS_PTE_C2B_RUNTIME_USER = "farmos_pte_c2b_runtime" as const;
export const FARM_OS_PTE_C2B_ACL_ATTACKER = "farmos_pte_c2b_attacker" as const;
export const FARM_OS_PTE_C2B_FIXTURE_AUTHORITY =
  "farmos.production-target-execution-postgres-qualification-fixture.v1" as const;

const SECRET_HEX = /^[a-f0-9]{64}$/u;

export type FarmOsPteC2bFixtureCredential = Readonly<{
  migration_owner: typeof FARM_OS_PTE_C2B_MIGRATION_OWNER;
  runtime_user: typeof FARM_OS_PTE_C2B_RUNTIME_USER;
  attacker_user: typeof FARM_OS_PTE_C2B_ACL_ATTACKER;
  database: typeof FARM_OS_PTE_C2B_DATABASE;
  application_name: typeof FARM_OS_PTE_C2B_APPLICATION_NAME;
  password: `c2b_${string}`;
}>;

export function createFarmOsPteC2bFixtureCredential(
  fixtureSecretHex: string,
): FarmOsPteC2bFixtureCredential | null {
  if (!SECRET_HEX.test(fixtureSecretHex)) return null;
  return Object.freeze({
    migration_owner: FARM_OS_PTE_C2B_MIGRATION_OWNER,
    runtime_user: FARM_OS_PTE_C2B_RUNTIME_USER,
    attacker_user: FARM_OS_PTE_C2B_ACL_ATTACKER,
    database: FARM_OS_PTE_C2B_DATABASE,
    application_name: FARM_OS_PTE_C2B_APPLICATION_NAME,
    password: `c2b_${fixtureSecretHex}`,
  });
}

const D = (character: string) => `sha256:${character.repeat(64)}` as `sha256:${string}`;
const TIMES = Object.freeze({ proposed: "2026-08-11T00:00:00.000Z",
  approved: "2026-08-11T00:01:00.000Z", receipt: "2026-08-11T00:02:00.000Z",
  issued: "2026-08-11T00:03:00.000Z", observed: "2026-08-11T00:04:00.000Z",
  expires: "2026-08-12T00:00:00.000Z" });

function clock(): FarmOsProductionTargetExecutionClockEvidence {
  const material = { schema_version: "farmos.production-target-execution-clock-evidence.v1" as const,
    clock_authority_id: "farmos.production-target-execution-trusted-clock.v1" as const,
    clock_authority_revision: 1, provenance_class:
      "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK" as const,
    observed_at: TIMES.observed, observed_lower_bound: TIMES.proposed,
    recorded_at: TIMES.observed, status: "AVAILABLE" as const, server_owned_record: true as const };
  const evidence_digest = computeFarmOsProductionTargetExecutionClockEvidenceDigest(material);
  return Object.freeze({ ...material,
    evidence_id: computeFarmOsProductionTargetExecutionClockEvidenceId(evidence_digest),
    evidence_digest });
}

function approvalLineage() {
  const proposalMaterial = { authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
    authority_revision: 1 as const, proposal_id: "proposal.c2b-fixture-001",
    target_binding_digest: D("1"), purpose:
      "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION" as const,
    operation_scope: FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
    requested_by_actor_reference_digest: D("2"), proposed_at: TIMES.proposed,
    expires_at: TIMES.expires, revoked: false };
  const proposal: FarmOsProductionTargetExecutionProposal = Object.freeze({ ...proposalMaterial,
    proposal_digest: computeFarmOsProductionTargetExecutionProposalDigest(proposalMaterial) });
  const approvalMaterial = { authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
    authority_revision: 1 as const, approval_id: "approval.c2b-fixture-001",
    proposal_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
    proposal_authority_revision: 1 as const, proposal_id: proposal.proposal_id,
    proposal_digest: proposal.proposal_digest, target_binding_digest: proposal.target_binding_digest,
    operation_scope: proposal.operation_scope, decision: "APPROVED" as const,
    actor_provenance: { actor_authority_id: "farmos.human-approval-actor-authority.v1" as const,
      actor_authority_revision: 1 as const, actor_reference_digest: D("3"),
      authentication_context_digest: D("4"),
      provenance_class: "SERVER_OWNED_AUTHENTICATED_HUMAN_REVIEW" as const,
      server_owned_record: true as const }, approved_at: TIMES.approved,
    expires_at: TIMES.expires, revoked: false };
  const approval: FarmOsProductionTargetExecutionHumanApproval = Object.freeze({ ...approvalMaterial,
    approval_digest: computeFarmOsProductionTargetExecutionApprovalDigest(approvalMaterial) });
  const receiptMaterial = { authority_id:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID,
    authority_revision: 1 as const, approval_receipt_id: "approval-receipt.c2b-fixture-001",
    proposal_id: proposal.proposal_id, proposal_digest: proposal.proposal_digest,
    approval_id: approval.approval_id, approval_digest: approval.approval_digest,
    target_binding_digest: proposal.target_binding_digest, operation_scope: proposal.operation_scope,
    issued_at: TIMES.receipt, expires_at: TIMES.expires, status: "ISSUED" as const,
    server_owned_record: true as const };
  const approval_receipt: FarmOsProductionTargetExecutionApprovalReceipt = Object.freeze({
    ...receiptMaterial,
    approval_receipt_digest: computeFarmOsProductionTargetExecutionApprovalReceiptDigest(
      receiptMaterial) });
  return Object.freeze({ proposal, approval, approval_receipt });
}

function fixtureCommand(lineage: ReturnType<typeof approvalLineage>,
  clockEvidence: FarmOsProductionTargetExecutionClockEvidence): FarmOsProductionTargetExecutionCommand {
  const nonce = D("5");
  const operationArtifactSha = D("8");
  const commandId = deriveFarmOsProductionTargetNoncanonicalProbeCommandId({
    proposal_id: lineage.proposal.proposal_id, approval_id: lineage.approval.approval_id,
    approval_receipt_id: lineage.approval_receipt.approval_receipt_id, nonce_digest: nonce,
    target_binding_digest: lineage.proposal.target_binding_digest,
    operation_artifact_authority_id:
      FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID,
    operation_artifact_sha256: operationArtifactSha });
  const base = { schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_SCHEMA_VERSION,
    command_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_COMMAND_AUTHORITY_ID,
    command_authority_revision: 1 as const,
    identity_authority_id:
      FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_COMMAND_IDENTITY_AUTHORITY_ID,
    command_id: commandId, operation: FARM_OS_PRODUCTION_TARGET_NONCANONICAL_PROBE_OPERATION,
    target_manifest_id: "manifest.c2b-fixture-001",
    target_binding_digest: lineage.proposal.target_binding_digest,
    v5_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    v5_artifact_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
    operation_artifact_authority_id:
      FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID,
    operation_artifact_sha256: operationArtifactSha,
    phase_b_authority_bundle: FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
    phase_b_authority_bundle_digest:
      computeFarmOsProductionTargetPhaseBAuthorityBundleDigest(
        FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE),
    proposal_id: lineage.proposal.proposal_id, proposal_digest: lineage.proposal.proposal_digest,
    approval_id: lineage.approval.approval_id, approval_digest: lineage.approval.approval_digest,
    approval_receipt_id: lineage.approval_receipt.approval_receipt_id,
    approval_receipt_digest: lineage.approval_receipt.approval_receipt_digest,
    purpose: "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION" as const,
    scope_digest: D("7"), nonce_digest: nonce,
    limits: { maximum_provider_calls: 1 as const, maximum_database_connections: 1 as const,
      automatic_retry: 0 as const }, issued_at: TIMES.issued, expires_at: TIMES.expires,
    trusted_clock_evidence_id: clockEvidence.evidence_id,
    trusted_clock_evidence_digest: clockEvidence.evidence_digest,
    source_build_identity_digest: D("9"), noncanonical: true as const,
    result_reusable: false as const, formal_evidence_eligible: false as const,
    readiness_auto_promotion: false as const, manifest_effect: false as const,
    runtime_effect: false as const,
    production_evidence_receipt_created_by_phase_c: false as const,
    human_approval_required: true as const };
  const execution_binding_digest = computeFarmOsProductionTargetExecutionBindingDigest(base);
  const withBinding = { ...base, execution_binding_digest };
  return Object.freeze({ ...withBinding,
    command_record_digest: computeFarmOsProductionTargetExecutionCommandRecordDigest(withBinding) });
}

const lineage = approvalLineage();
const clockEvidence = clock();
const command = fixtureCommand(lineage, clockEvidence);
const revocationHead = createInitialFarmOsProductionTargetExecutionApprovalRevocationHead(lineage);
const revocationMaterial = { schema_version:
    FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION,
  revocation_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID,
  revocation_authority_revision: 1 as const, approval_id: lineage.approval.approval_id,
  approval_digest: lineage.approval.approval_digest,
  approval_receipt_id: lineage.approval_receipt.approval_receipt_id,
  approval_receipt_digest: lineage.approval_receipt.approval_receipt_digest,
  target_binding_digest: lineage.approval.target_binding_digest,
  operation_scope: lineage.approval.operation_scope, reason: "HUMAN_REVIEW_REVOKED" as const,
  trusted_clock_evidence_id: clockEvidence.evidence_id,
  trusted_clock_evidence_digest: clockEvidence.evidence_digest,
  effective_at: clockEvidence.observed_at, event_sequence: 1, previous_event_digest: null,
  server_owned_record: true as const, append_only: true as const };
const revocation_event_digest =
  computeFarmOsProductionTargetExecutionApprovalRevocationEventDigest(revocationMaterial);
const revocationEvent = Object.freeze({ ...revocationMaterial, revocation_event_digest,
  revocation_event_id:
    computeFarmOsProductionTargetExecutionApprovalRevocationEventId(revocation_event_digest) });
const lifecycle = createInitialFarmOsProductionTargetExecutionLifecycleRecord({ command });
const reservationIdentity = deriveFarmOsProductionTargetExecutionPostgresReservationIdentity({
  command_id: command.command_id, execution_binding_digest: command.execution_binding_digest,
  approval_id: command.approval_id, approval_receipt_id: command.approval_receipt_id,
  clock_evidence_id: clockEvidence.evidence_id, lifecycle_version: lifecycle.state_version + 1 });
const attemptId = "attempt.c2b-fixture-001";
const attemptDigest = deriveFarmOsProductionTargetExecutionPostgresAttemptDigest({
  attempt_id: attemptId, reservation_id: reservationIdentity.reservation_id,
  reservation_digest: reservationIdentity.reservation_digest, command_id: command.command_id,
  execution_binding_digest: command.execution_binding_digest });
const receiptMaterial = { schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION,
  receipt_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID,
  receipt_authority_revision: 1 as const, receipt_id: "execution-receipt.c2b-fixture-001",
  command_id: command.command_id, command_record_digest: command.command_record_digest,
  execution_binding_digest: command.execution_binding_digest,
  proposal_id: command.proposal_id, proposal_digest: command.proposal_digest,
  approval_id: command.approval_id, approval_digest: command.approval_digest,
  approval_receipt_id: command.approval_receipt_id,
  approval_receipt_digest: command.approval_receipt_digest,
  reservation_id: reservationIdentity.reservation_id,
  reservation_digest: reservationIdentity.reservation_digest,
  attempt_id: attemptId, attempt_digest: attemptDigest, terminal_state: "OUTCOME_UNKNOWN" as const,
  result_classification: "UNKNOWN" as const, unknown_stage: "POST_START" as const,
  result_evidence_reference_digest: null, trusted_clock_evidence_id: clockEvidence.evidence_id,
  trusted_clock_evidence_digest: clockEvidence.evidence_digest,
  recorded_at: clockEvidence.observed_at, supersedes_receipt_id: null,
  supersedes_receipt_digest: null, append_only: true as const,
  automatic_retry_prohibited: true as const, manual_review_required: true as const,
  production_evidence_receipt: false as const };
const executionReceipt: FarmOsProductionTargetExecutionReceipt = Object.freeze({
  ...receiptMaterial,
  receipt_digest: computeFarmOsProductionTargetExecutionReceiptDigest(receiptMaterial) });

function terminalReceipt(input: Readonly<{
  receipt_id: string;
  terminal_state: "CONSUMED_SUCCESS" | "CONSUMED_FAILURE";
  result_classification: "SUCCEEDED" | "FAILED";
  manual_review_required: boolean;
  result_evidence_reference_digest: `sha256:${string}`;
}>): FarmOsProductionTargetExecutionReceipt {
  const material = Object.freeze({ ...receiptMaterial,
    receipt_id: input.receipt_id,
    terminal_state: input.terminal_state,
    result_classification: input.result_classification,
    unknown_stage: "NONE" as const,
    result_evidence_reference_digest: input.result_evidence_reference_digest,
    manual_review_required: input.manual_review_required });
  return Object.freeze({ ...material,
    receipt_digest: computeFarmOsProductionTargetExecutionReceiptDigest(material) });
}

const successReceipt = terminalReceipt({
  receipt_id: "execution-receipt.c2b-fixture-success-001",
  terminal_state: "CONSUMED_SUCCESS",
  result_classification: "SUCCEEDED",
  manual_review_required: false,
  result_evidence_reference_digest: D("a"),
});
const failureReceipt = terminalReceipt({
  receipt_id: "execution-receipt.c2b-fixture-failure-001",
  terminal_state: "CONSUMED_FAILURE",
  result_classification: "FAILED",
  manual_review_required: true,
  result_evidence_reference_digest: D("b"),
});

export const FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE = Object.freeze({
  fixture_authority: FARM_OS_PTE_C2B_FIXTURE_AUTHORITY,
  c2a_source_commit: FARM_OS_PTE_C2A_SOURCE_COMMIT,
  production_data_count: 0,
  proposal: lineage.proposal,
  approval: lineage.approval,
  approval_receipt: lineage.approval_receipt,
  revocation_event: revocationEvent,
  revocation_head: revocationHead,
  command,
  lifecycle,
  reservation: reservationIdentity,
  attempt: Object.freeze({ attempt_id: attemptId, attempt_digest: attemptDigest,
    reservation_id: reservationIdentity.reservation_id,
    reservation_digest: reservationIdentity.reservation_digest }),
  receipt: executionReceipt,
  success_receipt: successReceipt,
  failure_receipt: failureReceipt,
  clock_evidence: clockEvidence,
  clock_floor: Object.freeze({ clock_authority_id: clockEvidence.clock_authority_id,
    clock_authority_revision: clockEvidence.clock_authority_revision, floor_version: 0,
    observed_lower_bound: clockEvidence.observed_lower_bound,
    floor_digest: digestFarmOsPteC2b("farmos.production-target-execution-clock-floor.v1",
      clockEvidence.observed_lower_bound) }),
  phase_b_authority_snapshot: FARM_OS_PRODUCTION_TARGET_PHASE_B_AUTHORITY_BUNDLE,
  target_binding: Object.freeze({ target_binding_digest: lineage.proposal.target_binding_digest,
    target_reference: "c2b.synthetic.target", production_target: false }),
  reconciliation: Object.freeze({ reconciliation_id: "reconciliation.c2b-fixture-001",
    reconciliation_digest: digestFarmOsPteC2b(
      "farmos.production-target-execution-reconciliation.v1", command.command_id),
    command_id: command.command_id, execution_binding_digest: command.execution_binding_digest }),
});

export const FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL = Object.freeze([
  "create schema ai",
  "create schema core_schema",
  `create table core_schema.migration_history (
    migration_id text primary key,
    sequence bigint not null unique check (sequence > 0),
    checksum text not null check (checksum ~ '^sha256:[0-9a-f]{64}$'),
    description text not null check (length(description) between 1 and 500),
    applied_at timestamptz not null,
    applied_by text not null check (length(applied_by) between 3 and 128),
    execution_id text not null unique check (length(execution_id) between 8 and 128)
  )`,
] as const);

export const FARM_OS_PTE_C2B_MIGRATION_HISTORY_ENTRY = Object.freeze({
  migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  sequence: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_SEQUENCE,
  checksum: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  description: "Day150 C2-B isolated source qualification fixture",
  applied_by: FARM_OS_PTE_C2B_MIGRATION_OWNER,
  execution_id_prefix: "day150-c2b-",
});

export const FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE_DIGEST =
  `sha256:${createHash("sha256").update(JSON.stringify(FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE),
    "utf8").digest("hex")}` as const;
