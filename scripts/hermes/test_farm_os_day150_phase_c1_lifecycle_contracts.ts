import assert from "node:assert/strict";
import {
  computeFarmOsProductionTargetExecutionClockEvidenceDigest,
  computeFarmOsProductionTargetExecutionClockEvidenceId,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import type { FarmOsProductionTargetExecutionCommand } from
  "../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import {
  classifyFarmOsProductionTargetExecutionReuse,
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
import type {
  FarmOsProductionTargetExecutionApprovalSotPort,
  FarmOsProductionTargetExecutionAtomicLifecyclePort,
} from
  "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";

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
  FarmOsProductionTargetExecutionAtomicLifecyclePort, "reconcileAmbiguousWriteAndAppendReceipt">>;
type ApprovalAppendInput = Parameters<
  FarmOsProductionTargetExecutionApprovalSotPort["appendApprovalAndReceipt"]
>[0];
type _ApprovalAppendHasClockFloorVersion = Expect<HasKey<
  ApprovalAppendInput, "expected_clock_floor_version">>;
type _ApprovalAppendAdvancesClockFloor = Expect<HasKey<
  ApprovalAppendInput, "advance_persisted_clock_lower_bound_to_evidence_observed_at">>;

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
