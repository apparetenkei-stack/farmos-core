import type {
  FarmOsProductionTargetExecutionApprovalLineage,
  FarmOsProductionTargetExecutionApprovalReceipt,
  FarmOsProductionTargetExecutionApprovalRevocationEvent,
  FarmOsProductionTargetExecutionApprovalRevocationHead,
  FarmOsProductionTargetExecutionApprovalRevocationState,
  FarmOsProductionTargetExecutionHumanApproval,
  FarmOsProductionTargetExecutionProposal,
} from "./farm_os_production_target_execution_approval_authority";
import {
  parseFarmOsProductionTargetExecutionApprovalRevocationHead,
} from "./farm_os_production_target_execution_approval_authority";
import type { FarmOsProductionTargetExecutionCommand } from
  "./farm_os_production_target_execution_command_authority";
import {
  parseFarmOsProductionTargetExecutionLifecycleRecord,
  type
  FarmOsProductionTargetExecutionLifecycleRecord,
} from "./farm_os_production_target_execution_lifecycle";
import {
  validateFarmOsProductionTargetExecutionReceipt,
  validateFarmOsProductionTargetExecutionReceiptLifecycleBinding,
  type FarmOsProductionTargetExecutionReceipt,
} from "./farm_os_production_target_execution_receipt_authority";
import {
  hashFarmOsProductionTargetExecutionContract,
  hasExactFarmOsProductionTargetExecutionKeys,
  isFarmOsProductionTargetExecutionRecord,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION =
  "farmos.production-target-execution-persistence-port.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_REVOCATION_REVALIDATION_EVIDENCE_SCHEMA_VERSION =
  "farmos.production-target-execution-revocation-revalidation-evidence.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT = Object.freeze({
  port_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
  implementation_status: "ISOLATED_STORAGE_QUALIFIED",
  storage_backed_concurrency_tested: true,
  storage_backed_crash_semantics_tested: true,
  storage_backed_restart_tested: true,
  atomic_approval_revalidation_and_reservation_required: true,
  atomic_attempt_start_compare_and_set_required: true,
  atomic_terminal_state_and_append_only_receipt_required: true,
  store_owned_authoritative_revalidation_required: true,
  store_owned_clock_floor_compare_and_advance_required: true,
  approval_unbound_to_command_precondition_required: true,
  ambiguous_write_reconciliation_and_receipt_required: true,
  ambiguous_write_outcome_must_be_explicit: true,
  reservation_reconciliation_requires_authoritative_readback_branch: true,
  reservation_readback_owned_by_persistence_port: true,
  caller_supplied_reservation_observation_prohibited: true,
  reservation_observation_digest_is_audit_integrity_not_caller_authority: true,
  reservation_receipt_absence_cas_owned_by_persistence_port: true,
  blind_ambiguous_receipt_append_prohibited: true,
  append_only_approval_revocation_required: true,
  approval_revocation_head_compare_and_set_required: true,
  reservation_and_attempt_start_revocation_head_revalidation_required: true,
  process_local_storage_is_durable_authority: false,
  external_execution_authorized: false,
} as const);

export type FarmOsProductionTargetExecutionPersistenceConflict =
  | "PROPOSAL_ID_CONFLICT" | "APPROVAL_ID_CONFLICT" | "APPROVAL_RECEIPT_ID_CONFLICT"
  | "APPROVAL_REVOCATION_EVENT_CONFLICT" | "APPROVAL_REVOCATION_HEAD_VERSION_CONFLICT"
  | "APPROVAL_REUSE_CONFLICT" | "COMMAND_ID_CONFLICT" | "COMMAND_BINDING_CONFLICT"
  | "NONCE_REUSE_CONFLICT" | "RESERVATION_VERSION_CONFLICT" | "ATTEMPT_VERSION_CONFLICT"
  | "TERMINAL_STATE_CONFLICT" | "RECEIPT_APPEND_CONFLICT";

export type FarmOsProductionTargetExecutionPersistenceRejection =
  | "SCHEMA_MISMATCH" | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_TIMEOUT_OUTCOME_UNKNOWN" | "UNEXPECTED_DUPLICATE_RECORDS"
  | "DIGEST_MISMATCH" | "CLOCK_EVIDENCE_INVALID" | "APPROVAL_REVOKED"
  | "APPROVAL_EXPIRED" | "DEPENDENCY_REVALIDATION_FAILED"
  | "INGRESS_CONTRACT_INVALID";

export type FarmOsProductionTargetExecutionStoreResult<T> =
  | Readonly<{ status: "STORED"; value: T }>
  | Readonly<{ status: "EXISTING_IDENTICAL"; value: T }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict }>
  | Readonly<{ status: "WRITE_OUTCOME_UNKNOWN"; quarantine_required: true }>
  | Readonly<{ status: "REJECTED"; reason: FarmOsProductionTargetExecutionPersistenceRejection }>;

export type FarmOsProductionTargetExecutionReservationResult =
  | Readonly<{ status: "RESERVED"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    revocation_revalidation: FarmOsProductionTargetExecutionRevocationRevalidationEvidence }>
  | Readonly<{ status: "EXISTING_IDENTICAL"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    execution_allowed: false }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict;
    execution_allowed: false }>
  | Readonly<{ status: "RESERVATION_OUTCOME_UNKNOWN"; quarantine_required: true;
    execution_allowed: false; reconciliation_required: true; command_id: string;
    execution_binding_digest: `sha256:${string}` }>
  | Readonly<{ status: "REJECTED"; reason: FarmOsProductionTargetExecutionPersistenceRejection;
    execution_allowed: false }>;

export type FarmOsProductionTargetExecutionAttemptStartResult =
  | Readonly<{ status: "ATTEMPT_STARTED"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    revocation_revalidation: FarmOsProductionTargetExecutionRevocationRevalidationEvidence }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict;
    execution_allowed: false }>
  | Readonly<{ status: "ATTEMPT_START_OUTCOME_UNKNOWN"; quarantine_required: true;
    execution_allowed: false; reconciliation_required: true; command_id: string;
    execution_binding_digest: `sha256:${string}`; attempt_id: string;
    attempt_digest: `sha256:${string}` }>
  | Readonly<{ status: "REJECTED"; reason: FarmOsProductionTargetExecutionPersistenceRejection;
    execution_allowed: false }>;

export type FarmOsProductionTargetExecutionFinalizationResult =
  | Readonly<{ status: "FINALIZED"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    receipt: FarmOsProductionTargetExecutionReceipt }>
  | Readonly<{ status: "EXISTING_IDENTICAL"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    receipt: FarmOsProductionTargetExecutionReceipt; execution_allowed: false }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict;
    execution_allowed: false }>
  | Readonly<{ status: "FINALIZATION_OUTCOME_UNKNOWN"; quarantine_required: true;
    execution_allowed: false; reconciliation_required: true; command_id: string;
    execution_binding_digest: `sha256:${string}`; intended_receipt_id: string;
    intended_receipt_digest: `sha256:${string}` }>
  | Readonly<{ status: "REJECTED"; reason: FarmOsProductionTargetExecutionPersistenceRejection;
    execution_allowed: false }>;

export type FarmOsProductionTargetExecutionRevocationRevalidationEvidence = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_REVOCATION_REVALIDATION_EVIDENCE_SCHEMA_VERSION;
  provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION";
  transition: "RESERVATION" | "ATTEMPT_START";
  command_id: string;
  execution_binding_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  observed_head: FarmOsProductionTargetExecutionApprovalRevocationHead;
  observed_head_version: number;
  observed_head_digest: `sha256:${string}`;
  observed_latest_event_digest: `sha256:${string}` | null;
  observed_status: "ACTIVE";
  lifecycle_state: "RESERVED_NOT_STARTED" | "ATTEMPT_STARTED";
  lifecycle_version: number;
  lifecycle_record_digest: `sha256:${string}`;
  persisted_atomically_with_lifecycle_transition: true;
  observation_digest: `sha256:${string}`;
}>;

const REVOCATION_REVALIDATION_EVIDENCE_KEYS = Object.freeze([
  "approval_digest", "approval_id", "command_id", "execution_binding_digest",
  "lifecycle_record_digest", "lifecycle_state", "lifecycle_version",
  "observation_digest", "observed_head", "observed_head_digest",
  "observed_head_version", "observed_latest_event_digest", "observed_status",
  "persisted_atomically_with_lifecycle_transition", "provenance", "schema_version",
  "transition",
] as const);

export function computeFarmOsProductionTargetExecutionRevocationRevalidationEvidenceDigest(
  evidence: Omit<FarmOsProductionTargetExecutionRevocationRevalidationEvidence,
    "observation_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-revocation-revalidation-evidence.v1",
    evidence,
  );
}

export function validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence(
  input: Readonly<{
    evidence: unknown;
    lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    expected_transition: "RESERVATION" | "ATTEMPT_START";
  }>,
): boolean {
  if (!isFarmOsProductionTargetExecutionRecord(input.evidence) ||
    !hasExactFarmOsProductionTargetExecutionKeys(
      input.evidence, REVOCATION_REVALIDATION_EVIDENCE_KEYS,
    )) return false;
  const evidence = input.evidence as unknown as
    FarmOsProductionTargetExecutionRevocationRevalidationEvidence;
  const parsedLifecycle = parseFarmOsProductionTargetExecutionLifecycleRecord(input.lifecycle);
  if (!parsedLifecycle.accepted) return false;
  const parsedHead = parseFarmOsProductionTargetExecutionApprovalRevocationHead(
    evidence.observed_head,
  );
  if (!parsedHead.accepted || parsedHead.head.status !== "ACTIVE") return false;
  const material = Object.fromEntries(Object.entries(evidence).filter(
    ([key]) => key !== "observation_digest",
  )) as Omit<FarmOsProductionTargetExecutionRevocationRevalidationEvidence,
    "observation_digest">;
  return evidence.schema_version ===
      FARM_OS_PRODUCTION_TARGET_EXECUTION_REVOCATION_REVALIDATION_EVIDENCE_SCHEMA_VERSION &&
    evidence.provenance ===
      "PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION" &&
    evidence.transition === input.expected_transition &&
    ((evidence.transition === "RESERVATION" &&
      input.lifecycle.state === "RESERVED_NOT_STARTED") ||
      (evidence.transition === "ATTEMPT_START" &&
        input.lifecycle.state === "ATTEMPT_STARTED")) &&
    evidence.observed_head_version === parsedHead.head.head_version &&
    evidence.observed_head_digest === parsedHead.head.head_digest &&
    evidence.observed_latest_event_digest === parsedHead.head.latest_event_digest &&
    evidence.observed_status === parsedHead.head.status &&
    evidence.approval_id === parsedHead.head.approval_id &&
    evidence.approval_digest === parsedHead.head.approval_digest &&
    evidence.command_id === input.lifecycle.command_id &&
    evidence.execution_binding_digest === input.lifecycle.execution_binding_digest &&
    evidence.approval_id === input.lifecycle.approval_id &&
    evidence.approval_digest === input.lifecycle.approval_digest &&
    parsedHead.head.approval_receipt_id === input.lifecycle.approval_receipt_id &&
    parsedHead.head.approval_receipt_digest === input.lifecycle.approval_receipt_digest &&
    evidence.lifecycle_state === input.lifecycle.state &&
    evidence.lifecycle_version === input.lifecycle.state_version &&
    evidence.lifecycle_record_digest === input.lifecycle.lifecycle_record_digest &&
    evidence.persisted_atomically_with_lifecycle_transition === true &&
    evidence.observation_digest ===
      computeFarmOsProductionTargetExecutionRevocationRevalidationEvidenceDigest(material);
}

export type FarmOsProductionTargetExecutionApprovalRevocationReadResult =
  | Readonly<{ status: "EXACT_STATE_FOUND";
    state: FarmOsProductionTargetExecutionApprovalRevocationState }>
  | Readonly<{ status: "EXACT_STATE_ABSENT" }>
  | Readonly<{ status: "CONFLICT";
    conflict: FarmOsProductionTargetExecutionPersistenceConflict }>
  | Readonly<{ status: "REJECTED";
    reason: FarmOsProductionTargetExecutionPersistenceRejection }>;

export type FarmOsProductionTargetExecutionReservationReadback =
  | Readonly<{
    result: "RESERVATION_CONFIRMED_ABSENT";
    provenance: "PERSISTENCE_AUTHORITATIVE_EXACT_READBACK";
    command_id: string;
    command_record_digest: `sha256:${string}`;
    execution_binding_digest: `sha256:${string}`;
    approval_id: string;
    approval_digest: `sha256:${string}`;
    approval_receipt_id: string;
    approval_receipt_digest: `sha256:${string}`;
    lifecycle_state: "UNRESERVED";
    lifecycle_version: number;
    lifecycle_record_digest: `sha256:${string}`;
    observed_reservation_id: null;
    observed_reservation_digest: null;
    approval_bound_or_reserved: false;
    observation_digest: `sha256:${string}`;
  }>
  | Readonly<{
    result: "RESERVATION_CONFIRMED_PRESENT";
    provenance: "PERSISTENCE_AUTHORITATIVE_EXACT_READBACK";
    command_id: string;
    command_record_digest: `sha256:${string}`;
    execution_binding_digest: `sha256:${string}`;
    approval_id: string;
    approval_digest: `sha256:${string}`;
    approval_receipt_id: string;
    approval_receipt_digest: `sha256:${string}`;
    lifecycle_state: "RESERVED_NOT_STARTED";
    lifecycle_version: number;
    lifecycle_record_digest: `sha256:${string}`;
    observed_reservation_id: string;
    observed_reservation_digest: `sha256:${string}`;
    approval_bound_or_reserved: true;
    observation_digest: `sha256:${string}`;
  }>
  | Readonly<{
    result: "RESERVATION_STORAGE_OBSERVATION_UNKNOWN";
    provenance: "PERSISTENCE_AUTHORITATIVE_READBACK_FAILED_CLOSED";
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
    intended_reservation_id: string;
    intended_reservation_digest: `sha256:${string}`;
    reason: "STORAGE_UNAVAILABLE" | "SCHEMA_MISMATCH" |
      "STORAGE_READ_TIMEOUT_OUTCOME_UNKNOWN" | "UNEXPECTED_DUPLICATE_RECORDS" |
      "DIGEST_MISMATCH";
    state_mutation_prohibited: true;
    receipt_append_prohibited: true;
    automatic_retry: 0;
    manual_review_required: true;
    observation_digest: `sha256:${string}`;
  }>;

type FarmOsProductionTargetExecutionReservationReconciliationBase = Readonly<{
  command: FarmOsProductionTargetExecutionCommand;
  command_id: string;
  command_record_digest: `sha256:${string}`;
  execution_binding_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  intended_reservation_id: string;
  intended_reservation_digest: `sha256:${string}`;
  expected_unreserved_lifecycle_version: number;
  expected_unreserved_lifecycle_record_digest: `sha256:${string}`;
  expected_reserved_lifecycle_version: number;
  expected_reserved_lifecycle_record_digest: `sha256:${string}`;
  expected_revocation_head_version: number;
  expected_revocation_head_digest: `sha256:${string}`;
  clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
  expected_persisted_clock_lower_bound: string | null;
  expected_clock_floor_version: number;
  advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
}>;

export type FarmOsProductionTargetExecutionReservationReconciliationInput =
  FarmOsProductionTargetExecutionReservationReconciliationBase & Readonly<{
    required_authoritative_readback:
      "PERSISTENCE_PORT_INTERNAL_EXACT_RESERVATION_READBACK";
    confirmed_absent_receipt_candidate: FarmOsProductionTargetExecutionReceipt;
    confirmed_present_cancellation_receipt_candidate:
      FarmOsProductionTargetExecutionReceipt;
    required_confirmed_absent_lifecycle_event: "RESERVATION_WRITE_AMBIGUOUS";
    required_confirmed_present_lifecycle_event: "RESTART_RESERVED_CANCEL";
    expected_confirmed_absent_receipt_id_absent: string;
    expected_confirmed_present_receipt_id_absent: string;
  }>;

export type FarmOsProductionTargetExecutionReservationReconciliationResult =
  | Readonly<{ status: "CONFIRMED_ABSENT_FINALIZED_OUTCOME_UNKNOWN";
    observation: Extract<FarmOsProductionTargetExecutionReservationReadback,
      { result: "RESERVATION_CONFIRMED_ABSENT" }>;
    lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    receipt: FarmOsProductionTargetExecutionReceipt; execution_allowed: false }>
  | Readonly<{ status: "CONFIRMED_PRESENT_CANCELLED_PRE_START";
    observation: Extract<FarmOsProductionTargetExecutionReservationReadback,
      { result: "RESERVATION_CONFIRMED_PRESENT" }>;
    lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    receipt: FarmOsProductionTargetExecutionReceipt; execution_allowed: false }>
  | Readonly<{ status: "STORAGE_OBSERVATION_UNKNOWN"; quarantine_required: true;
    observation: Extract<FarmOsProductionTargetExecutionReservationReadback,
      { result: "RESERVATION_STORAGE_OBSERVATION_UNKNOWN" }>;
    state_mutation_performed: false; receipt_appended: false; execution_allowed: false;
    automatic_retry: 0; manual_review_required: true }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict;
    execution_allowed: false }>
  | Readonly<{ status: "REJECTED"; reason: FarmOsProductionTargetExecutionPersistenceRejection;
    execution_allowed: false }>;

export function computeFarmOsProductionTargetExecutionReservationObservationDigest(
  observation: Omit<FarmOsProductionTargetExecutionReservationReadback, "observation_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-reservation-authoritative-readback.v1",
    observation,
  );
}

type FarmOsProductionTargetExecutionResolvedReservationReconciliationResult = Exclude<
  FarmOsProductionTargetExecutionReservationReconciliationResult,
  { status: "CONFLICT" } | { status: "REJECTED" }
>;

export function reservationReconciliationResolvedResultIsValid(
  input: Readonly<{
    request: FarmOsProductionTargetExecutionReservationReconciliationInput;
    result: FarmOsProductionTargetExecutionResolvedReservationReconciliationResult;
  }>,
): boolean {
  const { request, result } = input;
  if (!("observation" in result)) return false;
  const observation = result.observation;
  const observationMaterial = Object.fromEntries(Object.entries(observation).filter(
    ([key]) => key !== "observation_digest",
  )) as Omit<FarmOsProductionTargetExecutionReservationReadback, "observation_digest">;
  if (observation.observation_digest !==
    computeFarmOsProductionTargetExecutionReservationObservationDigest(observationMaterial) ||
    observation.command_id !== request.command_id ||
    observation.execution_binding_digest !== request.execution_binding_digest) return false;
  if (observation.result === "RESERVATION_STORAGE_OBSERVATION_UNKNOWN") {
    return result.status === "STORAGE_OBSERVATION_UNKNOWN" &&
      observation.provenance === "PERSISTENCE_AUTHORITATIVE_READBACK_FAILED_CLOSED" &&
      observation.intended_reservation_id === request.intended_reservation_id &&
      observation.intended_reservation_digest === request.intended_reservation_digest &&
      observation.state_mutation_prohibited === true &&
      observation.receipt_append_prohibited === true && observation.automatic_retry === 0 &&
      result.state_mutation_performed === false && result.receipt_appended === false &&
      result.automatic_retry === 0 && result.manual_review_required === true;
  }
  if (observation.approval_id !== request.approval_id ||
    observation.approval_digest !== request.approval_digest ||
    observation.approval_receipt_id !== request.approval_receipt_id ||
    observation.approval_receipt_digest !== request.approval_receipt_digest ||
    observation.command_record_digest !== request.command_record_digest) return false;
  if (observation.result === "RESERVATION_CONFIRMED_ABSENT") {
    if (result.status !== "CONFIRMED_ABSENT_FINALIZED_OUTCOME_UNKNOWN") return false;
    const receipt = result.receipt;
    const receiptValidation = validateFarmOsProductionTargetExecutionReceipt({
      receipt, command: request.command, clock_evidence: request.clock_evidence,
      persisted_clock_lower_bound: request.expected_persisted_clock_lower_bound,
    });
    const lifecycleValidation = parseFarmOsProductionTargetExecutionLifecycleRecord(
      result.lifecycle,
    );
    return observation.provenance === "PERSISTENCE_AUTHORITATIVE_EXACT_READBACK" &&
      receiptValidation.accepted && lifecycleValidation.accepted &&
      validateFarmOsProductionTargetExecutionReceiptLifecycleBinding({
        receipt, lifecycle: result.lifecycle,
      }) && result.lifecycle.state === "RESERVATION_OUTCOME_UNKNOWN" &&
      result.lifecycle.state_version === observation.lifecycle_version + 1 &&
      receipt.receipt_id === request.expected_confirmed_absent_receipt_id_absent &&
      receipt.receipt_digest === request.confirmed_absent_receipt_candidate.receipt_digest &&
      observation.lifecycle_state === "UNRESERVED" &&
      observation.lifecycle_version === request.expected_unreserved_lifecycle_version &&
      observation.lifecycle_record_digest === request.expected_unreserved_lifecycle_record_digest &&
      observation.observed_reservation_id === null &&
      observation.observed_reservation_digest === null &&
      observation.approval_bound_or_reserved === false &&
      receipt.terminal_state === "RESERVATION_OUTCOME_UNKNOWN" &&
      receipt.reservation_id === null && receipt.reservation_digest === null &&
      receipt.attempt_id === null && receipt.attempt_digest === null &&
      receipt.command_id === request.command_id &&
      receipt.command_record_digest === request.command_record_digest &&
      receipt.execution_binding_digest === request.execution_binding_digest &&
      receipt.approval_id === request.approval_id &&
      receipt.approval_digest === request.approval_digest &&
      receipt.approval_receipt_id === request.approval_receipt_id &&
      receipt.approval_receipt_digest === request.approval_receipt_digest;
  }
  if (result.status !== "CONFIRMED_PRESENT_CANCELLED_PRE_START") return false;
  const receipt = result.receipt;
  const receiptValidation = validateFarmOsProductionTargetExecutionReceipt({
    receipt, command: request.command, clock_evidence: request.clock_evidence,
    persisted_clock_lower_bound: request.expected_persisted_clock_lower_bound,
  });
  const lifecycleValidation = parseFarmOsProductionTargetExecutionLifecycleRecord(
    result.lifecycle,
  );
  return observation.provenance === "PERSISTENCE_AUTHORITATIVE_EXACT_READBACK" &&
    receiptValidation.accepted && lifecycleValidation.accepted &&
    validateFarmOsProductionTargetExecutionReceiptLifecycleBinding({
      receipt, lifecycle: result.lifecycle,
    }) && result.lifecycle.state === "CANCELLED_PRE_START" &&
    result.lifecycle.state_version === observation.lifecycle_version + 1 &&
    receipt.receipt_id === request.expected_confirmed_present_receipt_id_absent &&
    receipt.receipt_digest === request.confirmed_present_cancellation_receipt_candidate.receipt_digest &&
    request.required_confirmed_present_lifecycle_event === "RESTART_RESERVED_CANCEL" &&
    observation.lifecycle_state === "RESERVED_NOT_STARTED" &&
    observation.lifecycle_version === request.expected_reserved_lifecycle_version &&
    observation.lifecycle_record_digest === request.expected_reserved_lifecycle_record_digest &&
    observation.observed_reservation_id === request.intended_reservation_id &&
    observation.observed_reservation_digest === request.intended_reservation_digest &&
    observation.approval_bound_or_reserved === true &&
    receipt.terminal_state === "CANCELLED_PRE_START" &&
    receipt.reservation_id === request.intended_reservation_id &&
    receipt.reservation_digest === request.intended_reservation_digest &&
    receipt.attempt_id === null && receipt.attempt_digest === null &&
    receipt.command_id === request.command_id &&
    receipt.command_record_digest === request.command_record_digest &&
    receipt.execution_binding_digest === request.execution_binding_digest &&
    receipt.approval_id === request.approval_id &&
    receipt.approval_digest === request.approval_digest &&
    receipt.approval_receipt_id === request.approval_receipt_id &&
    receipt.approval_receipt_digest === request.approval_receipt_digest;
}

export function approvalRevocationExpectationMatches(input: Readonly<{
  expected_head_version: number;
  expected_head_digest: `sha256:${string}`;
  expected_latest_event_digest: `sha256:${string}` | null;
  observed_head: FarmOsProductionTargetExecutionApprovalRevocationHead;
}>): boolean {
  return input.observed_head.status === "ACTIVE" &&
    input.observed_head.head_version === input.expected_head_version &&
    input.observed_head.head_digest === input.expected_head_digest &&
    input.observed_head.latest_event_digest === input.expected_latest_event_digest;
}

export interface FarmOsProductionTargetExecutionApprovalSotPort {
  readonly port_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION;
  appendProposal(input: Readonly<{
    proposal: FarmOsProductionTargetExecutionProposal;
    expected_absent_proposal_id: string;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
  }>): Promise<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionProposal>>;
  appendApprovalAndReceipt(input: Readonly<{
    proposal_id: string;
    expected_proposal_digest: `sha256:${string}`;
    expected_proposal_revision: 1;
    approval: FarmOsProductionTargetExecutionHumanApproval;
    approval_receipt: FarmOsProductionTargetExecutionApprovalReceipt;
    initial_revocation_head: FarmOsProductionTargetExecutionApprovalRevocationHead;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
  }>): Promise<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionApprovalLineage>>;
  readApprovalLineage(input: Readonly<{
    approval_id: string;
    approval_receipt_id: string;
  }>): Promise<FarmOsProductionTargetExecutionApprovalLineage | null>;
  appendApprovalRevocationEventAndAdvanceHead(input: Readonly<{
    event: FarmOsProductionTargetExecutionApprovalRevocationEvent;
    expected_approval_id: string;
    expected_approval_digest: `sha256:${string}`;
    expected_approval_receipt_id: string;
    expected_approval_receipt_digest: `sha256:${string}`;
    expected_target_binding_digest: `sha256:${string}`;
    expected_operation_scope:
      FarmOsProductionTargetExecutionHumanApproval["operation_scope"];
    expected_head_version: number;
    expected_head_digest: `sha256:${string}`;
    expected_latest_event_id: string | null;
    expected_latest_event_digest: `sha256:${string}` | null;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
  }>): Promise<FarmOsProductionTargetExecutionStoreResult<
    FarmOsProductionTargetExecutionApprovalRevocationState>>;
  readExactApprovalRevocationState(input: Readonly<{
    approval_id: string;
    approval_digest: `sha256:${string}`;
    approval_receipt_id: string;
    approval_receipt_digest: `sha256:${string}`;
    expected_head_version: number;
    expected_head_digest: `sha256:${string}`;
    exact_latest_event_id: string | null;
    exact_latest_event_digest: `sha256:${string}` | null;
  }>): Promise<FarmOsProductionTargetExecutionApprovalRevocationReadResult>;
}

export interface FarmOsProductionTargetExecutionCommandPort {
  readonly port_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION;
  appendCommand(input: Readonly<{
    command: FarmOsProductionTargetExecutionCommand;
    expected_approval_id: string;
    expected_approval_digest: `sha256:${string}`;
    expected_approval_receipt_id: string;
    expected_approval_receipt_digest: `sha256:${string}`;
    expected_nonce_absent: `sha256:${string}`;
  }>): Promise<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionCommand>>;
  readCommand(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
  }>): Promise<FarmOsProductionTargetExecutionCommand | null>;
}

export interface FarmOsProductionTargetExecutionAtomicLifecyclePort {
  readonly port_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION;
  tryReserveWithApprovalRevalidation(input: Readonly<{
    command: FarmOsProductionTargetExecutionCommand;
    expected_command_record_digest: `sha256:${string}`;
    expected_execution_binding_digest: `sha256:${string}`;
    expected_approval_id: string;
    expected_approval_digest: `sha256:${string}`;
    expected_approval_receipt_id: string;
    expected_approval_receipt_digest: `sha256:${string}`;
    expected_approval_revocation_head_version: number;
    expected_approval_revocation_head_digest: `sha256:${string}`;
    expected_approval_revocation_latest_event_digest: `sha256:${string}` | null;
    expected_approval_unbound_to_any_command: true;
    expected_phase_b_authority_bundle_digest: `sha256:${string}`;
    expected_target_binding_digest: `sha256:${string}`;
    expected_lifecycle_state: "UNRESERVED";
    expected_lifecycle_version: 0;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
    required_revalidation_provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION";
  }>): Promise<FarmOsProductionTargetExecutionReservationResult>;
  tryMarkAttemptStarted(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
    reservation_id: string;
    reservation_digest: `sha256:${string}`;
    attempt_id: string;
    attempt_digest: `sha256:${string}`;
    expected_lifecycle_state: "RESERVED_NOT_STARTED";
    expected_lifecycle_version: number;
    expected_approval_digest: `sha256:${string}`;
    expected_approval_revocation_head_version: number;
    expected_approval_revocation_head_digest: `sha256:${string}`;
    expected_approval_revocation_latest_event_digest: `sha256:${string}` | null;
    expected_command_record_digest: `sha256:${string}`;
    expected_phase_b_authority_bundle_digest: `sha256:${string}`;
    expected_target_binding_digest: `sha256:${string}`;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
    required_revalidation_provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION";
  }>): Promise<FarmOsProductionTargetExecutionAttemptStartResult>;
  tryTerminatePreStartAndAppendReceipt(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
    reservation_id: string;
    reservation_digest: `sha256:${string}`;
    expected_lifecycle_state: "RESERVED_NOT_STARTED";
    expected_lifecycle_version: number;
    terminal_event: "CANCEL_BEFORE_START" | "EXPIRE_BEFORE_START" |
      "RESTART_RESERVED_CANCEL";
    receipt: FarmOsProductionTargetExecutionReceipt;
    expected_receipt_absent: string;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
    required_revalidation_provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION";
  }>): Promise<FarmOsProductionTargetExecutionFinalizationResult>;
  tryFinalizeAndAppendReceipt(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
    reservation_id: string;
    reservation_digest: `sha256:${string}`;
    attempt_id: string;
    attempt_digest: `sha256:${string}`;
    expected_lifecycle_state: "ATTEMPT_STARTED";
    expected_lifecycle_version: number;
    receipt: FarmOsProductionTargetExecutionReceipt;
    expected_receipt_absent: string;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
  }>): Promise<FarmOsProductionTargetExecutionFinalizationResult>;
  reconcileReservationWriteAmbiguity(
    input: FarmOsProductionTargetExecutionReservationReconciliationInput,
  ): Promise<FarmOsProductionTargetExecutionReservationReconciliationResult>;
  reconcilePostReservationAmbiguousWriteAndAppendReceipt(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
    ambiguity_stage: "ATTEMPT_START_WRITE" | "FINALIZATION_WRITE";
    expected_state_version: number;
    intended_reservation_id: string | null;
    intended_reservation_digest: `sha256:${string}` | null;
    intended_attempt_id: string | null;
    intended_attempt_digest: `sha256:${string}` | null;
    outcome_unknown_receipt: FarmOsProductionTargetExecutionReceipt;
    expected_receipt_absent: string;
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
  }>): Promise<FarmOsProductionTargetExecutionFinalizationResult>;
  readLifecycle(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
  }>): Promise<FarmOsProductionTargetExecutionLifecycleRecord | null>;
  readExecutionReceipt(input: Readonly<{
    receipt_id: string;
    receipt_digest: `sha256:${string}`;
  }>): Promise<FarmOsProductionTargetExecutionReceipt | null>;
}

export type FarmOsProductionTargetExecutionPersistencePorts = Readonly<{
  approval_sot: FarmOsProductionTargetExecutionApprovalSotPort;
  command_store: FarmOsProductionTargetExecutionCommandPort;
  atomic_lifecycle: FarmOsProductionTargetExecutionAtomicLifecyclePort;
}>;
