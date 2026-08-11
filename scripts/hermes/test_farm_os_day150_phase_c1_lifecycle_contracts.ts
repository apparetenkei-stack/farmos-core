import assert from "node:assert/strict";
import {
  computeFarmOsProductionTargetExecutionClockEvidenceDigest,
  computeFarmOsProductionTargetExecutionClockEvidenceId,
  hashFarmOsProductionTargetExecutionContract,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import type { FarmOsProductionTargetExecutionCommand } from
  "../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import {
  classifyFarmOsProductionTargetExecutionReuse,
  computeFarmOsProductionTargetExecutionLifecycleRecordDigest,
  computeFarmOsProductionTargetExecutionRevalidationDigest,
  createInitialFarmOsProductionTargetExecutionLifecycleRecord,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_CRASH_WINDOW_POLICY,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_CONTRACT,
  parseFarmOsProductionTargetExecutionLifecycleRecord,
  transitionFarmOsProductionTargetExecutionLifecycle,
  type FarmOsProductionTargetExecutionLifecycleRecord,
  type FarmOsProductionTargetExecutionRevalidation,
} from "../../src/lib/hermes/farm_os_production_target_execution_lifecycle";
import { FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT } from
  "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";
import {
  approvalRevocationExpectationMatches,
  computeFarmOsProductionTargetExecutionReservationObservationDigest,
  computeFarmOsProductionTargetExecutionRevocationRevalidationEvidenceDigest,
  reservationReconciliationResolvedResultIsValid,
  validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence,
} from "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";
import type {
  FarmOsProductionTargetExecutionApprovalSotPort,
  FarmOsProductionTargetExecutionAtomicLifecyclePort,
  FarmOsProductionTargetExecutionReservationReconciliationInput,
  FarmOsProductionTargetExecutionReservationReconciliationResult,
} from
  "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";
import {
  computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest,
  type FarmOsProductionTargetExecutionApprovalRevocationHead,
} from "../../src/lib/hermes/farm_os_production_target_execution_approval_authority";
import type { FarmOsProductionTargetExecutionReceipt } from
  "../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";

type Expect<T extends true> = T;
type HasKey<T, K extends PropertyKey> = K extends keyof T ? true : false;
type ReserveInput = Parameters<
  FarmOsProductionTargetExecutionAtomicLifecyclePort["tryReserveWithApprovalRevalidation"]
>[0];
type _ReserveHasStoreProvenance = Expect<HasKey<ReserveInput, "required_revalidation_provenance">>;
type _ReserveHasClockFloorCas = Expect<HasKey<ReserveInput, "expected_persisted_clock_lower_bound">>;
type _ReserveRejectsCallerStatusRecord = Expect<
  HasKey<ReserveInput, "revalidation"> extends false ? true : false
>;
type _HasPreStartAtomicReceipt = Expect<HasKey<
  FarmOsProductionTargetExecutionAtomicLifecyclePort, "tryTerminatePreStartAndAppendReceipt">>;
type _HasAmbiguousReconciliationReceipt = Expect<HasKey<
  FarmOsProductionTargetExecutionAtomicLifecyclePort, "reconcileReservationWriteAmbiguity">>;
type _GenericReconciliationCannotOwnReservationWrite = Expect<
  "RESERVATION_WRITE" extends Parameters<
    FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "reconcilePostReservationAmbiguousWriteAndAppendReceipt"
    ]
  >[0]["ambiguity_stage"] ? false : true
>;
type ApprovalAppendInput = Parameters<
  FarmOsProductionTargetExecutionApprovalSotPort["appendApprovalAndReceipt"]
>[0];
type _ApprovalAppendHasClockFloorVersion = Expect<HasKey<
  ApprovalAppendInput, "expected_clock_floor_version">>;
type _ApprovalAppendAdvancesClockFloor = Expect<HasKey<
  ApprovalAppendInput, "advance_persisted_clock_lower_bound_to_evidence_observed_at">>;
type _ApprovalAppendCreatesRevocationHead = Expect<HasKey<
  ApprovalAppendInput, "initial_revocation_head">>;
type _ApprovalSotHasExactRevocationRead = Expect<HasKey<
  FarmOsProductionTargetExecutionApprovalSotPort, "readExactApprovalRevocationState">>;
type _ApprovalSotHasAtomicRevocationAppend = Expect<HasKey<
  FarmOsProductionTargetExecutionApprovalSotPort,
  "appendApprovalRevocationEventAndAdvanceHead">>;
type _ReserveBindsRevocationHead = Expect<HasKey<
  ReserveInput, "expected_approval_revocation_head_digest">>;
type AttemptInput = Parameters<
  FarmOsProductionTargetExecutionAtomicLifecyclePort["tryMarkAttemptStarted"]
>[0];
type _AttemptBindsRevocationHead = Expect<HasKey<
  AttemptInput, "expected_approval_revocation_head_digest">>;
type _ReconciliationRejectsCallerObservation = Expect<
  HasKey<FarmOsProductionTargetExecutionReservationReconciliationInput,
    "observation"> extends false ? true : false
>;
type ReservationSuccess = Extract<
  Awaited<ReturnType<
    FarmOsProductionTargetExecutionAtomicLifecyclePort["tryReserveWithApprovalRevalidation"]
  >>,
  { status: "RESERVED" }
>;
type AttemptSuccess = Extract<
  Awaited<ReturnType<
    FarmOsProductionTargetExecutionAtomicLifecyclePort["tryMarkAttemptStarted"]
  >>,
  { status: "ATTEMPT_STARTED" }
>;
type _ReservationPersistsRevocationAudit = Expect<HasKey<
  ReservationSuccess, "revocation_revalidation">>;
type _AttemptStartPersistsRevocationAudit = Expect<HasKey<
  AttemptSuccess, "revocation_revalidation">>;

const D = (character: string) => `sha256:${character.repeat(64)}` as `sha256:${string}`;
const observedAt = "2026-08-11T01:00:00.000Z";
const lowerBound = "2026-08-11T00:00:00.000Z";

function clock(): FarmOsProductionTargetExecutionClockEvidence {
  const material = {
    schema_version: "farmos.production-target-execution-clock-evidence.v1" as const,
    clock_authority_id: "farmos.production-target-execution-trusted-clock.v1" as const,
    clock_authority_revision: 1,
    provenance_class: "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK" as const,
    observed_at: observedAt,
    observed_lower_bound: lowerBound,
    recorded_at: observedAt,
    status: "AVAILABLE" as const,
    server_owned_record: true as const,
  };
  const evidence_digest = computeFarmOsProductionTargetExecutionClockEvidenceDigest(material);
  return Object.freeze({ ...material,
    evidence_id: computeFarmOsProductionTargetExecutionClockEvidenceId(evidence_digest),
    evidence_digest });
}

const clockEvidence = clock();
const command = Object.freeze({
  command_id: "probecmd_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  command_record_digest: D("1"),
  execution_binding_digest: D("2"),
  proposal_id: "proposal.c1-lifecycle-001",
  proposal_digest: D("3"),
  approval_id: "approval.c1-lifecycle-001",
  approval_digest: D("4"),
  approval_receipt_id: "approval-receipt.c1-lifecycle-001",
  approval_receipt_digest: D("5"),
  phase_b_authority_bundle_digest: D("6"),
  target_binding_digest: D("7"),
  trusted_clock_evidence_id: clockEvidence.evidence_id,
  trusted_clock_evidence_digest: clockEvidence.evidence_digest,
}) as unknown as FarmOsProductionTargetExecutionCommand;

function revalidation(overrides: Partial<Omit<FarmOsProductionTargetExecutionRevalidation,
  "revalidation_digest">> = {}): FarmOsProductionTargetExecutionRevalidation {
  const material = {
    revalidation_authority_id:
      "farmos.production-target-execution-authoritative-revalidation.v1" as const,
    revalidation_authority_revision: 1 as const,
    provenance_class: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION" as const,
    evaluated_at: clockEvidence.observed_at,
    clock_evidence_id: clockEvidence.evidence_id,
    clock_evidence_digest: clockEvidence.evidence_digest,
    persisted_clock_lower_bound: lowerBound,
    approval_id: command.approval_id,
    approval_digest: command.approval_digest,
    approval_receipt_id: command.approval_receipt_id,
    approval_receipt_digest: command.approval_receipt_digest,
    command_id: command.command_id,
    command_record_digest: command.command_record_digest,
    execution_binding_digest: command.execution_binding_digest,
    approval_status: "ACTIVE" as const,
    command_status: "ACTIVE" as const,
    phase_b_dependencies_status: "ACTIVE_EXACT_REVISION" as const,
    phase_b_authority_bundle_digest: command.phase_b_authority_bundle_digest,
    target_binding_status: "MATCH" as const,
    target_binding_digest: command.target_binding_digest,
    clock_status: "AVAILABLE" as const,
    ...overrides,
  };
  return Object.freeze({ ...material,
    revalidation_digest: computeFarmOsProductionTargetExecutionRevalidationDigest(material) });
}

const refs = Object.freeze({
  reservation_id: "reservation.c1-lifecycle-001",
  reservation_digest: D("8"),
  attempt_id: "attempt.c1-lifecycle-001",
  attempt_digest: D("9"),
  terminal_receipt_id: "execution-receipt.c1-lifecycle-001",
  terminal_receipt_digest: D("a"),
});

function transition(record: FarmOsProductionTargetExecutionLifecycleRecord,
  event: Parameters<typeof transitionFarmOsProductionTargetExecutionLifecycle>[0]["event"],
  references: Parameters<typeof transitionFarmOsProductionTargetExecutionLifecycle>[0]["references"],
  validation: FarmOsProductionTargetExecutionRevalidation = revalidation()) {
  return transitionFarmOsProductionTargetExecutionLifecycle({
    record,
    command,
    event,
    expected_state_version: record.state_version,
    revalidation: validation,
    clock_evidence: clockEvidence,
    persisted_clock_lower_bound: lowerBound,
    references,
  });
}

function reconciliationReceipt(input: Readonly<{
  terminal_state: "RESERVATION_OUTCOME_UNKNOWN" | "CANCELLED_PRE_START";
  reservation_id: string | null;
  reservation_digest: `sha256:${string}` | null;
}>): FarmOsProductionTargetExecutionReceipt {
  const unknown = input.terminal_state === "RESERVATION_OUTCOME_UNKNOWN";
  const material = {
    schema_version: "farmos.production-target-execution-receipt.v1",
    receipt_authority_id: "farmos.production-target-execution-receipt-authority.v1",
    receipt_authority_revision: 1,
    receipt_id: unknown ? "execution-receipt.c1-readback-absent-001" :
      "execution-receipt.c1-readback-present-001",
    command_id: command.command_id,
    command_record_digest: command.command_record_digest,
    execution_binding_digest: command.execution_binding_digest,
    proposal_id: command.proposal_id,
    proposal_digest: command.proposal_digest,
    approval_id: command.approval_id,
    approval_digest: command.approval_digest,
    approval_receipt_id: command.approval_receipt_id,
    approval_receipt_digest: command.approval_receipt_digest,
    reservation_id: input.reservation_id,
    reservation_digest: input.reservation_digest,
    attempt_id: null,
    attempt_digest: null,
    terminal_state: input.terminal_state,
    result_classification: unknown ? "UNKNOWN" : "NOT_EXECUTED",
    unknown_stage: unknown ? "RESERVATION_WRITE" : "NONE",
    result_evidence_reference_digest: null,
    trusted_clock_evidence_id: clockEvidence.evidence_id,
    trusted_clock_evidence_digest: clockEvidence.evidence_digest,
    recorded_at: clockEvidence.observed_at,
    supersedes_receipt_id: null,
    supersedes_receipt_digest: null,
    append_only: true,
    automatic_retry_prohibited: true,
    manual_review_required: true,
    production_evidence_receipt: false,
  } as const;
  return Object.freeze({ ...material,
    receipt_digest: hashFarmOsProductionTargetExecutionContract(
      "farmos.production-target-execution-receipt.v1",
      material,
    ),
  });
}

const activeRevocationHeadMaterial = Object.freeze({
  schema_version: "farmos.production-target-execution-approval-revocation-head.v1",
  revocation_authority_id: "farmos.production-target-execution-approval-revocation.v1",
  revocation_authority_revision: 1,
  approval_id: command.approval_id,
  approval_digest: command.approval_digest,
  approval_receipt_id: command.approval_receipt_id,
  approval_receipt_digest: command.approval_receipt_digest,
  target_binding_digest: command.target_binding_digest,
  operation_scope: "PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL",
  status: "ACTIVE",
  head_version: 0,
  latest_event_id: null,
  latest_event_digest: null,
  effective_revoked_at: null,
} as const);
const activeRevocationHead = Object.freeze({ ...activeRevocationHeadMaterial,
  head_digest: computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest(
    activeRevocationHeadMaterial,
  ),
}) satisfies FarmOsProductionTargetExecutionApprovalRevocationHead;

const initial = createInitialFarmOsProductionTargetExecutionLifecycleRecord({ command });
assert.equal(parseFarmOsProductionTargetExecutionLifecycleRecord(initial).accepted, true);
assert.equal(initial.state, "UNRESERVED");
assert.equal(initial.approval_use_state, "NEVER_RESERVED");

const reserved = transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: refs.reservation_id,
  reservation_digest: refs.reservation_digest,
});
assert.equal(reserved.accepted, true);
assert.equal(reserved.record.state, "RESERVED_NOT_STARTED");
assert.equal(reserved.record.approval_use_state, "RESERVED");

assert.equal(transition(reserved.record, "RESERVE_CONFIRMED", {
  reservation_id: refs.reservation_id,
  reservation_digest: refs.reservation_digest,
}).accepted, false);

const started = transition(reserved.record, "ATTEMPT_START_CONFIRMED", {
  attempt_id: refs.attempt_id,
  attempt_digest: refs.attempt_digest,
});
assert.equal(started.accepted, true);
assert.equal(started.record.state, "ATTEMPT_STARTED");

function revocationRevalidationEvidence(
  lifecycle: FarmOsProductionTargetExecutionLifecycleRecord,
  transitionKind: "RESERVATION" | "ATTEMPT_START",
) {
  const material = Object.freeze({
    schema_version:
      "farmos.production-target-execution-revocation-revalidation-evidence.v1" as const,
    provenance:
      "PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION" as const,
    transition: transitionKind,
    command_id: lifecycle.command_id,
    execution_binding_digest: lifecycle.execution_binding_digest,
    approval_id: lifecycle.approval_id,
    approval_digest: lifecycle.approval_digest,
    observed_head: activeRevocationHead,
    observed_head_version: activeRevocationHead.head_version,
    observed_head_digest: activeRevocationHead.head_digest,
    observed_latest_event_digest: activeRevocationHead.latest_event_digest,
    observed_status: "ACTIVE" as const,
    lifecycle_state: lifecycle.state as "RESERVED_NOT_STARTED" | "ATTEMPT_STARTED",
    lifecycle_version: lifecycle.state_version,
    lifecycle_record_digest: lifecycle.lifecycle_record_digest,
    persisted_atomically_with_lifecycle_transition: true as const,
  });
  return Object.freeze({ ...material,
    observation_digest:
      computeFarmOsProductionTargetExecutionRevocationRevalidationEvidenceDigest(material),
  });
}
const reservationRevocationEvidence = revocationRevalidationEvidence(
  reserved.record, "RESERVATION",
);
const attemptStartRevocationEvidence = revocationRevalidationEvidence(
  started.record, "ATTEMPT_START",
);
assert.equal(validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence({
  evidence: reservationRevocationEvidence,
  lifecycle: reserved.record,
  expected_transition: "RESERVATION",
}), true);
assert.equal(validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence({
  evidence: attemptStartRevocationEvidence,
  lifecycle: started.record,
  expected_transition: "ATTEMPT_START",
}), true);
assert.equal(validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence({
  evidence: { ...reservationRevocationEvidence, observation_digest: D("0") },
  lifecycle: reserved.record,
  expected_transition: "RESERVATION",
}), false);
const reservationLabelOnAttemptMaterial = Object.freeze({
  ...attemptStartRevocationEvidence,
  transition: "RESERVATION" as const,
});
const { observation_digest: _ignoredTransitionDigest, ...reservationLabelMaterial } =
  reservationLabelOnAttemptMaterial;
assert.equal(validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence({
  evidence: { ...reservationLabelMaterial,
    observation_digest:
      computeFarmOsProductionTargetExecutionRevocationRevalidationEvidenceDigest(
        reservationLabelMaterial,
      ) },
  lifecycle: started.record,
  expected_transition: "RESERVATION",
}), false);
const wrongReceiptHeadMaterial = Object.freeze({
  ...activeRevocationHeadMaterial,
  approval_receipt_id: "approval-receipt.c1-wrong-001",
});
const wrongReceiptHead = Object.freeze({ ...wrongReceiptHeadMaterial,
  head_digest: computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest(
    wrongReceiptHeadMaterial,
  ),
});
const wrongReceiptEvidenceMaterial = Object.freeze({
  ...reservationRevocationEvidence,
  observed_head: wrongReceiptHead,
  observed_head_digest: wrongReceiptHead.head_digest,
});
const { observation_digest: _ignoredReceiptDigest, ...wrongReceiptEvidenceWithoutDigest } =
  wrongReceiptEvidenceMaterial;
assert.equal(validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence({
  evidence: { ...wrongReceiptEvidenceWithoutDigest,
    observation_digest:
      computeFarmOsProductionTargetExecutionRevocationRevalidationEvidenceDigest(
        wrongReceiptEvidenceWithoutDigest,
      ) },
  lifecycle: reserved.record,
  expected_transition: "RESERVATION",
}), false);
assert.equal(started.record.approval_use_state, "QUARANTINED");
assert.equal(transition(started.record, "ATTEMPT_START_CONFIRMED", {
  attempt_id: refs.attempt_id,
  attempt_digest: refs.attempt_digest,
}).accepted, false);
assert.equal(transition(reserved.record, "ATTEMPT_START_CONFIRMED", {
  reservation_id: "reservation.c1-replacement-forbidden",
  reservation_digest: D("0"),
  attempt_id: refs.attempt_id,
  attempt_digest: refs.attempt_digest,
}).accepted, false);

const succeeded = transition(started.record, "FINALIZE_SUCCESS", {
  terminal_receipt_id: refs.terminal_receipt_id,
  terminal_receipt_digest: refs.terminal_receipt_digest,
});
assert.equal(succeeded.accepted, true);
assert.equal(succeeded.record.state, "CONSUMED_SUCCESS");
assert.equal(succeeded.record.approval_use_state, "CONSUMED");
assert.equal(transition(started.record, "FINALIZE_SUCCESS", {
  attempt_id: "attempt.c1-replacement-forbidden",
  attempt_digest: D("0"),
  terminal_receipt_id: refs.terminal_receipt_id,
  terminal_receipt_digest: refs.terminal_receipt_digest,
}).accepted, false);
assert.equal(transition(succeeded.record, "FINALIZE_FAILURE", {
  terminal_receipt_id: refs.terminal_receipt_id,
  terminal_receipt_digest: refs.terminal_receipt_digest,
}).accepted, false);

const reservedForFailure = transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: "reservation.c1-failure-001", reservation_digest: D("b"),
});
assert.equal(reservedForFailure.accepted, true);
const startedForFailure = transition(reservedForFailure.record, "ATTEMPT_START_CONFIRMED", {
  attempt_id: "attempt.c1-failure-001", attempt_digest: D("c"),
});
assert.equal(startedForFailure.accepted, true);
const failed = transition(startedForFailure.record, "FINALIZE_FAILURE", {
  terminal_receipt_id: "execution-receipt.c1-failure-001", terminal_receipt_digest: D("d"),
});
assert.equal(failed.accepted, true);
assert.equal(failed.record.state, "CONSUMED_FAILURE");

const reservationUnknown = transition(initial, "RESERVATION_WRITE_AMBIGUOUS", {
  terminal_receipt_id: "execution-receipt.c1-reservation-unknown-001",
  terminal_receipt_digest: D("e"),
});
assert.equal(reservationUnknown.accepted, true);
assert.equal(reservationUnknown.record.state, "RESERVATION_OUTCOME_UNKNOWN");
assert.equal(reservationUnknown.record.approval_use_state, "POSSIBLY_RESERVED");
assert.equal(transition(reservationUnknown.record, "RESERVE_CONFIRMED", {
  reservation_id: refs.reservation_id, reservation_digest: refs.reservation_digest,
}).accepted, false);
assert.equal(transition(initial, "RESERVATION_WRITE_AMBIGUOUS", {
  terminal_receipt_id: "execution-receipt.c1-delayed-reservation-unknown-001",
  terminal_receipt_digest: D("1"),
}, revalidation({ approval_status: "EXPIRED", command_status: "EXPIRED" })).accepted, true);

const reconciliationBase = Object.freeze({
  command_id: command.command_id,
  command_record_digest: command.command_record_digest,
  execution_binding_digest: command.execution_binding_digest,
  approval_id: command.approval_id,
  approval_digest: command.approval_digest,
  approval_receipt_id: command.approval_receipt_id,
  approval_receipt_digest: command.approval_receipt_digest,
  intended_reservation_id: refs.reservation_id,
  intended_reservation_digest: refs.reservation_digest,
  expected_revocation_head_version: activeRevocationHead.head_version,
  expected_revocation_head_digest: activeRevocationHead.head_digest,
  clock_evidence: clockEvidence,
  expected_persisted_clock_lower_bound: lowerBound,
  expected_clock_floor_version: 0,
  advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const,
});
const absentReceipt = reconciliationReceipt({
  terminal_state: "RESERVATION_OUTCOME_UNKNOWN",
  reservation_id: null,
  reservation_digest: null,
});
const cancellationReceipt = reconciliationReceipt({
  terminal_state: "CANCELLED_PRE_START",
  reservation_id: refs.reservation_id,
  reservation_digest: refs.reservation_digest,
});
const reconciliationRequest = Object.freeze({
  ...reconciliationBase,
  command,
  expected_unreserved_lifecycle_version: initial.state_version,
  expected_unreserved_lifecycle_record_digest: initial.lifecycle_record_digest,
  expected_reserved_lifecycle_version: reserved.record.state_version,
  expected_reserved_lifecycle_record_digest: reserved.record.lifecycle_record_digest,
  required_authoritative_readback:
    "PERSISTENCE_PORT_INTERNAL_EXACT_RESERVATION_READBACK" as const,
  confirmed_absent_receipt_candidate: absentReceipt,
  confirmed_present_cancellation_receipt_candidate: cancellationReceipt,
  required_confirmed_absent_lifecycle_event: "RESERVATION_WRITE_AMBIGUOUS" as const,
  required_confirmed_present_lifecycle_event: "RESTART_RESERVED_CANCEL" as const,
  expected_confirmed_absent_receipt_id_absent: absentReceipt.receipt_id,
  expected_confirmed_present_receipt_id_absent: cancellationReceipt.receipt_id,
}) satisfies FarmOsProductionTargetExecutionReservationReconciliationInput;
const absentReconciled = transition(initial, "RESERVATION_WRITE_AMBIGUOUS", {
  terminal_receipt_id: absentReceipt.receipt_id,
  terminal_receipt_digest: absentReceipt.receipt_digest,
});
assert.equal(absentReconciled.accepted, true);
const absentObservationMaterial = Object.freeze({
    result: "RESERVATION_CONFIRMED_ABSENT" as const,
    provenance: "PERSISTENCE_AUTHORITATIVE_EXACT_READBACK" as const,
    command_id: command.command_id,
    command_record_digest: command.command_record_digest,
    execution_binding_digest: command.execution_binding_digest,
    approval_id: command.approval_id,
    approval_digest: command.approval_digest,
    approval_receipt_id: command.approval_receipt_id,
    approval_receipt_digest: command.approval_receipt_digest,
    lifecycle_state: "UNRESERVED" as const,
    lifecycle_version: initial.state_version,
    lifecycle_record_digest: initial.lifecycle_record_digest,
    observed_reservation_id: null,
    observed_reservation_digest: null,
    approval_bound_or_reserved: false as const,
});
const confirmedAbsent = Object.freeze({
  status: "CONFIRMED_ABSENT_FINALIZED_OUTCOME_UNKNOWN" as const,
  observation: Object.freeze({ ...absentObservationMaterial,
    observation_digest:
      computeFarmOsProductionTargetExecutionReservationObservationDigest(
        absentObservationMaterial,
      ) }),
  lifecycle: absentReconciled.record,
  receipt: absentReceipt,
  execution_allowed: false as const,
}) satisfies FarmOsProductionTargetExecutionReservationReconciliationResult;
assert.equal(reservationReconciliationResolvedResultIsValid({
  request: reconciliationRequest, result: confirmedAbsent,
}), true);
assert.equal(absentReconciled.record.state, "RESERVATION_OUTCOME_UNKNOWN");

const presentCancelled = transition(reserved.record, "RESTART_RESERVED_CANCEL", {
  terminal_receipt_id: cancellationReceipt.receipt_id,
  terminal_receipt_digest: cancellationReceipt.receipt_digest,
});
assert.equal(presentCancelled.accepted, true);
const presentObservationMaterial = Object.freeze({
    result: "RESERVATION_CONFIRMED_PRESENT" as const,
    provenance: "PERSISTENCE_AUTHORITATIVE_EXACT_READBACK" as const,
    command_id: command.command_id,
    command_record_digest: command.command_record_digest,
    execution_binding_digest: command.execution_binding_digest,
    approval_id: command.approval_id,
    approval_digest: command.approval_digest,
    approval_receipt_id: command.approval_receipt_id,
    approval_receipt_digest: command.approval_receipt_digest,
    lifecycle_state: "RESERVED_NOT_STARTED" as const,
    lifecycle_version: reserved.record.state_version,
    lifecycle_record_digest: reserved.record.lifecycle_record_digest,
    observed_reservation_id: refs.reservation_id,
    observed_reservation_digest: refs.reservation_digest,
    approval_bound_or_reserved: true as const,
});
const confirmedPresent = Object.freeze({
  status: "CONFIRMED_PRESENT_CANCELLED_PRE_START" as const,
  observation: Object.freeze({ ...presentObservationMaterial,
    observation_digest:
      computeFarmOsProductionTargetExecutionReservationObservationDigest(
        presentObservationMaterial,
      ) }),
  lifecycle: presentCancelled.record,
  receipt: cancellationReceipt,
  execution_allowed: false as const,
}) satisfies FarmOsProductionTargetExecutionReservationReconciliationResult;
assert.equal(reservationReconciliationResolvedResultIsValid({
  request: reconciliationRequest, result: confirmedPresent,
}), true);
assert.equal(presentCancelled.record.state, "CANCELLED_PRE_START");

const unknownObservationMaterial = Object.freeze({
    result: "RESERVATION_STORAGE_OBSERVATION_UNKNOWN" as const,
    provenance: "PERSISTENCE_AUTHORITATIVE_READBACK_FAILED_CLOSED" as const,
    command_id: command.command_id,
    execution_binding_digest: command.execution_binding_digest,
    intended_reservation_id: refs.reservation_id,
    intended_reservation_digest: refs.reservation_digest,
    reason: "STORAGE_UNAVAILABLE" as const,
    state_mutation_prohibited: true as const,
    receipt_append_prohibited: true as const,
    automatic_retry: 0 as const,
    manual_review_required: true as const,
});
const observationUnknown = Object.freeze({
  status: "STORAGE_OBSERVATION_UNKNOWN" as const,
  quarantine_required: true as const,
  observation: Object.freeze({ ...unknownObservationMaterial,
    observation_digest:
      computeFarmOsProductionTargetExecutionReservationObservationDigest(
        unknownObservationMaterial,
      ) }),
  state_mutation_performed: false as const,
  receipt_appended: false as const,
  execution_allowed: false as const,
  automatic_retry: 0 as const,
  manual_review_required: true as const,
}) satisfies FarmOsProductionTargetExecutionReservationReconciliationResult;
assert.equal(reservationReconciliationResolvedResultIsValid({
  request: reconciliationRequest, result: observationUnknown,
}), true);
assert.equal(observationUnknown.observation.state_mutation_prohibited, true);
assert.equal(observationUnknown.observation.receipt_append_prohibited, true);
assert.equal(observationUnknown.observation.manual_review_required, true);
assert.equal(observationUnknown.observation.automatic_retry, 0);

const highVersionAbsentMaterial = Object.freeze({
  ...absentReconciled.record,
  state_version: absentReconciled.record.state_version + 2,
});
const { lifecycle_record_digest: _ignoredHighVersionDigest, ...highVersionWithoutDigest } =
  highVersionAbsentMaterial;
const digestValidButNonSuccessorLifecycle = Object.freeze({
  ...highVersionWithoutDigest,
  lifecycle_record_digest:
    computeFarmOsProductionTargetExecutionLifecycleRecordDigest(highVersionWithoutDigest),
});
assert.equal(reservationReconciliationResolvedResultIsValid({
  request: reconciliationRequest,
  result: { ...confirmedAbsent, lifecycle: digestValidButNonSuccessorLifecycle },
}), false);

for (const invalidResult of [
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, observed_reservation_id: "reservation.c1-wrong-001",
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, execution_binding_digest: D("0"),
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, command_record_digest: D("0"),
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, approval_digest: D("0"),
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, approval_receipt_digest: D("0"),
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, lifecycle_record_digest: D("0"),
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, observation_digest: D("0"),
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, provenance: "CALLER_ASSERTED_READBACK",
  } },
  { ...confirmedPresent, observation: {
    ...confirmedPresent.observation, lifecycle_state: "ATTEMPT_STARTED",
  } },
  { ...confirmedPresent, receipt: absentReceipt },
  { ...confirmedAbsent, receipt: cancellationReceipt },
] as unknown as Exclude<
  FarmOsProductionTargetExecutionReservationReconciliationResult,
  { status: "CONFLICT" } | { status: "REJECTED" }
>[]) {
  assert.equal(reservationReconciliationResolvedResultIsValid({
    request: reconciliationRequest, result: invalidResult,
  }), false);
}
assert.equal(classifyFarmOsProductionTargetExecutionReuse({
  existing: absentReconciled.record,
  candidate: { ...command, command_id:
    "probecmd_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
}), "APPROVAL_REUSE_PROHIBITED");
assert.equal(classifyFarmOsProductionTargetExecutionReuse({
  existing: presentCancelled.record,
  candidate: { ...command, command_id:
    "probecmd_cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" },
}), "APPROVAL_REUSE_PROHIBITED");
assert.equal(approvalRevocationExpectationMatches({
  expected_head_version: 0,
  expected_head_digest: activeRevocationHead.head_digest,
  expected_latest_event_digest: null,
  observed_head: activeRevocationHead,
}), true);
for (const changedHead of [
  { ...activeRevocationHead, head_version: 1, status: "REVOKED" as const,
    latest_event_id: "approvalrev_" + "a".repeat(64), latest_event_digest: D("a"),
    effective_revoked_at: observedAt },
  { ...activeRevocationHead, head_digest: D("0") },
]) {
  const reservationRevalidationAccepted = approvalRevocationExpectationMatches({
    expected_head_version: 0,
    expected_head_digest: activeRevocationHead.head_digest,
    expected_latest_event_digest: null,
    observed_head: changedHead as FarmOsProductionTargetExecutionApprovalRevocationHead,
  });
  const attemptStartRevalidationAccepted = approvalRevocationExpectationMatches({
    expected_head_version: 0,
    expected_head_digest: activeRevocationHead.head_digest,
    expected_latest_event_digest: null,
    observed_head: changedHead as FarmOsProductionTargetExecutionApprovalRevocationHead,
  });
  assert.equal(reservationRevalidationAccepted, false);
  assert.equal(attemptStartRevalidationAccepted, false);
}

const reservedForStartUnknown = transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: "reservation.c1-start-unknown-001", reservation_digest: D("f"),
});
assert.equal(reservedForStartUnknown.accepted, true);
const startUnknown = transition(reservedForStartUnknown.record,
  "ATTEMPT_START_WRITE_AMBIGUOUS", {
    attempt_id: "attempt.c1-start-unknown-001",
    attempt_digest: D("a"),
    terminal_receipt_id: "execution-receipt.c1-start-unknown-001",
    terminal_receipt_digest: D("0"),
  });
assert.equal(startUnknown.accepted, true);
assert.equal(startUnknown.record.state, "OUTCOME_UNKNOWN");
assert.equal(startUnknown.record.approval_use_state, "QUARANTINED");
assert.equal(transition(reservedForStartUnknown.record,
  "ATTEMPT_START_WRITE_AMBIGUOUS", {
    attempt_id: "attempt.c1-delayed-start-unknown-001",
    attempt_digest: D("2"),
    terminal_receipt_id: "execution-receipt.c1-delayed-start-unknown-001",
    terminal_receipt_digest: D("3"),
  }, revalidation({ approval_status: "REVOKED", command_status: "REVOKED",
    phase_b_dependencies_status: "REVOKED" })).accepted, true);

const reservedForPostStartUnknown = transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: "reservation.c1-post-start-001", reservation_digest: D("1"),
});
assert.equal(reservedForPostStartUnknown.accepted, true);
const startedForUnknown = transition(reservedForPostStartUnknown.record,
  "ATTEMPT_START_CONFIRMED", { attempt_id: "attempt.c1-post-start-001", attempt_digest: D("2") });
assert.equal(startedForUnknown.accepted, true);
const postStartUnknown = transition(startedForUnknown.record, "POST_START_OUTCOME_UNKNOWN", {
  terminal_receipt_id: "execution-receipt.c1-post-start-001", terminal_receipt_digest: D("3"),
});
assert.equal(postStartUnknown.accepted, true);
assert.equal(postStartUnknown.record.state, "OUTCOME_UNKNOWN");

const cancelled = transition(reserved.record, "CANCEL_BEFORE_START", {
  terminal_receipt_id: "execution-receipt.c1-cancelled-001", terminal_receipt_digest: D("4"),
}, revalidation({ approval_status: "REVOKED" }));
assert.equal(cancelled.accepted, true);
assert.equal(cancelled.record.state, "CANCELLED_PRE_START");

const restartCancelled = transition(reserved.record, "RESTART_RESERVED_CANCEL", {
  terminal_receipt_id: "execution-receipt.c1-restart-cancelled-001",
  terminal_receipt_digest: D("4"),
});
assert.equal(restartCancelled.accepted, true);
assert.equal(restartCancelled.record.state, "CANCELLED_PRE_START");
assert.equal(restartCancelled.record.approval_use_state, "QUARANTINED");

const restartStartedUnknown = transition(started.record, "RESTART_STARTED_OUTCOME_UNKNOWN", {
  terminal_receipt_id: "execution-receipt.c1-restart-started-unknown-001",
  terminal_receipt_digest: D("5"),
});
assert.equal(restartStartedUnknown.accepted, true);
assert.equal(restartStartedUnknown.record.state, "OUTCOME_UNKNOWN");

const expired = transition(reserved.record, "EXPIRE_BEFORE_START", {
  terminal_receipt_id: "execution-receipt.c1-expired-001", terminal_receipt_digest: D("5"),
}, revalidation({ command_status: "EXPIRED" }));
assert.equal(expired.accepted, true);
assert.equal(expired.record.state, "EXPIRED_PRE_START");

assert.equal(transitionFarmOsProductionTargetExecutionLifecycle({
  record: initial,
  command,
  event: "RESERVE_CONFIRMED",
  expected_state_version: 1,
  revalidation: revalidation(),
  clock_evidence: clockEvidence,
  persisted_clock_lower_bound: lowerBound,
  references: { reservation_id: refs.reservation_id, reservation_digest: refs.reservation_digest },
}).accepted, false);
assert.equal(transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: refs.reservation_id, reservation_digest: refs.reservation_digest,
}, revalidation({
  provenance_class: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION",
  evaluated_at: "2026-08-11T01:00:01.000Z",
})).accepted, false);
assert.equal(transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: refs.reservation_id, reservation_digest: refs.reservation_digest,
}, revalidation({ persisted_clock_lower_bound: null })).accepted, false);
assert.equal(transition(initial, "RESERVE_CONFIRMED", {
  reservation_id: refs.reservation_id, reservation_digest: refs.reservation_digest,
}, revalidation({ phase_b_dependencies_status: "REVOKED" })).accepted, false);
assert.equal(transitionFarmOsProductionTargetExecutionLifecycle({
  record: initial,
  command,
  event: "RESERVE_CONFIRMED",
  expected_state_version: 0,
  revalidation: { ...revalidation(), revalidation_digest: D("6") },
  clock_evidence: clockEvidence,
  persisted_clock_lower_bound: lowerBound,
  references: { reservation_id: refs.reservation_id, reservation_digest: refs.reservation_digest },
}).accepted, false);

assert.equal(classifyFarmOsProductionTargetExecutionReuse({ existing: succeeded.record,
  candidate: command }),
  "COMMAND_REUSE_PROHIBITED");
assert.equal(classifyFarmOsProductionTargetExecutionReuse({
  existing: succeeded.record,
  candidate: { ...command, command_id:
    "probecmd_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
}), "APPROVAL_REUSE_PROHIBITED");
assert.equal(classifyFarmOsProductionTargetExecutionReuse({
  existing: succeeded.record,
  candidate: { ...command, execution_binding_digest: D("7") },
}), "COMMAND_BINDING_CONFLICT");

for (const policy of Object.values(FARM_OS_PRODUCTION_TARGET_EXECUTION_CRASH_WINDOW_POLICY)) {
  assert.equal(policy.old_approval_reusable, false);
  assert.notEqual(policy.required_action, "RETRY");
}
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_CRASH_WINDOW_POLICY
  .RESTART_WITH_STARTED_COMMAND.next_state, "OUTCOME_UNKNOWN");
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .atomic_approval_revalidation_and_reservation_required, true);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .atomic_attempt_start_compare_and_set_required, true);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .atomic_terminal_state_and_append_only_receipt_required, true);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .store_owned_authoritative_revalidation_required, true);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .store_owned_clock_floor_compare_and_advance_required, true);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .ambiguous_write_reconciliation_and_receipt_required, true);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT
  .process_local_storage_is_durable_authority, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_CONTRACT
  .caller_asserted_status_is_authority, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_CONTRACT
  .standalone_digest_is_authority_proof, false);

console.log("PASS Day150 Phase C1 lifecycle contracts");
