import type {
  FarmOsProductionTargetExecutionApprovalLineage,
  FarmOsProductionTargetExecutionApprovalReceipt,
  FarmOsProductionTargetExecutionHumanApproval,
  FarmOsProductionTargetExecutionProposal,
} from "./farm_os_production_target_execution_approval_authority";
import type { FarmOsProductionTargetExecutionCommand } from
  "./farm_os_production_target_execution_command_authority";
import type {
  FarmOsProductionTargetExecutionLifecycleRecord,
} from "./farm_os_production_target_execution_lifecycle";
import type { FarmOsProductionTargetExecutionReceipt } from
  "./farm_os_production_target_execution_receipt_authority";
import type { FarmOsProductionTargetExecutionClockEvidence } from
  "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION =
  "farmos.production-target-execution-persistence-port.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_CONTRACT = Object.freeze({
  port_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
  implementation_status: "NOT_ESTABLISHED",
  storage_backed_concurrency_tested: false,
  storage_backed_crash_semantics_tested: false,
  storage_backed_restart_tested: false,
  atomic_approval_revalidation_and_reservation_required: true,
  atomic_attempt_start_compare_and_set_required: true,
  atomic_terminal_state_and_append_only_receipt_required: true,
  store_owned_authoritative_revalidation_required: true,
  store_owned_clock_floor_compare_and_advance_required: true,
  approval_unbound_to_command_precondition_required: true,
  ambiguous_write_reconciliation_and_receipt_required: true,
  ambiguous_write_outcome_must_be_explicit: true,
  process_local_storage_is_durable_authority: false,
  external_execution_authorized: false,
} as const);

export type FarmOsProductionTargetExecutionPersistenceConflict =
  | "PROPOSAL_ID_CONFLICT" | "APPROVAL_ID_CONFLICT" | "APPROVAL_RECEIPT_ID_CONFLICT"
  | "APPROVAL_REUSE_CONFLICT" | "COMMAND_ID_CONFLICT" | "COMMAND_BINDING_CONFLICT"
  | "NONCE_REUSE_CONFLICT" | "RESERVATION_VERSION_CONFLICT" | "ATTEMPT_VERSION_CONFLICT"
  | "TERMINAL_STATE_CONFLICT" | "RECEIPT_APPEND_CONFLICT";

export type FarmOsProductionTargetExecutionStoreResult<T> =
  | Readonly<{ status: "STORED"; value: T }>
  | Readonly<{ status: "EXISTING_IDENTICAL"; value: T }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict }>
  | Readonly<{ status: "WRITE_OUTCOME_UNKNOWN"; quarantine_required: true }>
  | Readonly<{ status: "REJECTED"; reason: string }>;

export type FarmOsProductionTargetExecutionReservationResult =
  | Readonly<{ status: "RESERVED"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord }>
  | Readonly<{ status: "EXISTING_IDENTICAL"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    execution_allowed: false }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict;
    execution_allowed: false }>
  | Readonly<{ status: "RESERVATION_OUTCOME_UNKNOWN"; quarantine_required: true;
    execution_allowed: false; reconciliation_required: true; command_id: string;
    execution_binding_digest: `sha256:${string}` }>
  | Readonly<{ status: "REJECTED"; reason: string; execution_allowed: false }>;

export type FarmOsProductionTargetExecutionAttemptStartResult =
  | Readonly<{ status: "ATTEMPT_STARTED"; lifecycle: FarmOsProductionTargetExecutionLifecycleRecord }>
  | Readonly<{ status: "CONFLICT"; conflict: FarmOsProductionTargetExecutionPersistenceConflict;
    execution_allowed: false }>
  | Readonly<{ status: "ATTEMPT_START_OUTCOME_UNKNOWN"; quarantine_required: true;
    execution_allowed: false; reconciliation_required: true; command_id: string;
    execution_binding_digest: `sha256:${string}`; attempt_id: string;
    attempt_digest: `sha256:${string}` }>
  | Readonly<{ status: "REJECTED"; reason: string; execution_allowed: false }>;

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
  | Readonly<{ status: "REJECTED"; reason: string; execution_allowed: false }>;

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
    clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
    expected_persisted_clock_lower_bound: string | null;
    expected_clock_floor_version: number;
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true;
  }>): Promise<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionApprovalLineage>>;
  readApprovalLineage(input: Readonly<{
    approval_id: string;
    approval_receipt_id: string;
  }>): Promise<FarmOsProductionTargetExecutionApprovalLineage | null>;
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
  reconcileAmbiguousWriteAndAppendReceipt(input: Readonly<{
    command_id: string;
    execution_binding_digest: `sha256:${string}`;
    ambiguity_stage: "RESERVATION_WRITE" | "ATTEMPT_START_WRITE" | "FINALIZATION_WRITE";
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
