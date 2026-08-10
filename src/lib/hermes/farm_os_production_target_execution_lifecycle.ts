import type { FarmOsProductionTargetExecutionCommand } from
  "./farm_os_production_target_execution_command_authority";
import {
  hashFarmOsProductionTargetExecutionContract,
  hasExactFarmOsProductionTargetExecutionKeys,
  isFarmOsProductionTargetExecutionDigest,
  isFarmOsProductionTargetExecutionIdentifier,
  isFarmOsProductionTargetExecutionRecord,
  isCanonicalFarmOsProductionTargetExecutionTimestamp,
  qualifyFarmOsProductionTargetExecutionClockEvidence,
} from "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_ID =
  "farmos.production-target-execution-lifecycle.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_SCHEMA_VERSION =
  "farmos.production-target-execution-lifecycle-record.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_AUTHORITY_ID =
  "farmos.production-target-execution-authoritative-revalidation.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_CONTRACT = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_AUTHORITY_ID,
  authority_revision: 1,
  required_provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION",
  caller_asserted_status_is_authority: false,
  standalone_digest_is_authority_proof: false,
  storage_implementation_status: "NOT_ESTABLISHED",
  external_execution_authorized: false,
} as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_STATES = Object.freeze([
  "UNRESERVED",
  "RESERVATION_OUTCOME_UNKNOWN",
  "RESERVED_NOT_STARTED",
  "ATTEMPT_STARTED",
  "CONSUMED_SUCCESS",
  "CONSUMED_FAILURE",
  "OUTCOME_UNKNOWN",
  "CANCELLED_PRE_START",
  "EXPIRED_PRE_START",
] as const);
export type FarmOsProductionTargetExecutionLifecycleState =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_STATES[number];

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_EVENTS = Object.freeze([
  "RESERVE_CONFIRMED", "RESERVATION_WRITE_AMBIGUOUS", "ATTEMPT_START_CONFIRMED",
  "ATTEMPT_START_WRITE_AMBIGUOUS", "FINALIZE_SUCCESS", "FINALIZE_FAILURE",
  "POST_START_OUTCOME_UNKNOWN", "FINALIZATION_WRITE_AMBIGUOUS", "CANCEL_BEFORE_START",
  "EXPIRE_BEFORE_START", "RESTART_RESERVED_CANCEL", "RESTART_STARTED_OUTCOME_UNKNOWN",
] as const);
export type FarmOsProductionTargetExecutionLifecycleEvent =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_EVENTS[number];

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_CRASH_WINDOW_POLICY = Object.freeze({
  BEFORE_DURABLE_RESERVATION: Object.freeze({ next_state: "UNRESERVED",
    old_approval_reusable: false, required_action: "NEW_HUMAN_APPROVAL_AND_NEW_COMMAND" }),
  RESERVATION_WRITE_OUTCOME_UNKNOWN: Object.freeze({ next_state: "RESERVATION_OUTCOME_UNKNOWN",
    old_approval_reusable: false, required_action: "QUARANTINE_AND_MANUAL_REVIEW" }),
  AFTER_RESERVATION_BEFORE_ATTEMPT_START: Object.freeze({ next_state: "CANCELLED_PRE_START",
    old_approval_reusable: false, required_action: "FINAL_RECEIPT_THEN_REAPPROVAL" }),
  ATTEMPT_START_WRITE_OUTCOME_UNKNOWN: Object.freeze({ next_state: "OUTCOME_UNKNOWN",
    old_approval_reusable: false, required_action: "QUARANTINE_AND_MANUAL_REVIEW" }),
  AFTER_ATTEMPT_STARTED_BEFORE_RESULT: Object.freeze({ next_state: "OUTCOME_UNKNOWN",
    old_approval_reusable: false, required_action: "QUARANTINE_AND_MANUAL_REVIEW" }),
  AFTER_RESULT_BEFORE_FINALIZATION: Object.freeze({ next_state: "OUTCOME_UNKNOWN",
    old_approval_reusable: false, required_action: "QUARANTINE_AND_MANUAL_REVIEW" }),
  FINALIZATION_WRITE_OUTCOME_UNKNOWN: Object.freeze({ next_state: "OUTCOME_UNKNOWN",
    old_approval_reusable: false, required_action: "READ_ONLY_RECONCILIATION_NO_RETRY" }),
  RESTART_WITH_RESERVED_COMMAND: Object.freeze({ next_state: "CANCELLED_PRE_START",
    old_approval_reusable: false, required_action: "FINAL_RECEIPT_THEN_REAPPROVAL" }),
  RESTART_WITH_STARTED_COMMAND: Object.freeze({ next_state: "OUTCOME_UNKNOWN",
    old_approval_reusable: false, required_action: "QUARANTINE_AND_MANUAL_REVIEW" }),
} as const);

export type FarmOsProductionTargetExecutionApprovalUseState =
  | "NEVER_RESERVED" | "RESERVED" | "POSSIBLY_RESERVED" | "CONSUMED"
  | "QUARANTINED" | "EXPIRED_OR_REVOKED";

export type FarmOsProductionTargetExecutionLifecycleRecord = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_SCHEMA_VERSION;
  lifecycle_authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_ID;
  lifecycle_authority_revision: 1;
  lifecycle_record_digest: `sha256:${string}`;
  command_id: string;
  command_record_digest: `sha256:${string}`;
  execution_binding_digest: `sha256:${string}`;
  proposal_id: string;
  proposal_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  state: FarmOsProductionTargetExecutionLifecycleState;
  state_version: number;
  approval_use_state: FarmOsProductionTargetExecutionApprovalUseState;
  reservation_id: string | null;
  reservation_digest: `sha256:${string}` | null;
  attempt_id: string | null;
  attempt_digest: `sha256:${string}` | null;
  terminal_receipt_id: string | null;
  terminal_receipt_digest: `sha256:${string}` | null;
  updated_clock_evidence_id: string;
  updated_clock_evidence_digest: `sha256:${string}`;
  automatic_retry: 0;
  external_execution_authorized: false;
}>;

export type FarmOsProductionTargetExecutionRevalidation = Readonly<{
  revalidation_authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_AUTHORITY_ID;
  revalidation_authority_revision: 1;
  provenance_class: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION";
  evaluated_at: string;
  clock_evidence_id: string;
  clock_evidence_digest: `sha256:${string}`;
  persisted_clock_lower_bound: string | null;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  command_id: string;
  command_record_digest: `sha256:${string}`;
  execution_binding_digest: `sha256:${string}`;
  approval_status: "ACTIVE" | "EXPIRED" | "REVOKED";
  command_status: "ACTIVE" | "EXPIRED" | "REVOKED";
  phase_b_dependencies_status: "ACTIVE_EXACT_REVISION" | "INVALID" | "EXPIRED" | "REVOKED";
  phase_b_authority_bundle_digest: `sha256:${string}`;
  target_binding_status: "MATCH" | "MISMATCH";
  target_binding_digest: `sha256:${string}`;
  clock_status: "AVAILABLE";
  revalidation_digest: `sha256:${string}`;
}>;

export type FarmOsProductionTargetExecutionTransitionResult =
  | Readonly<{ accepted: true; record: FarmOsProductionTargetExecutionLifecycleRecord }>
  | Readonly<{ accepted: false; reason:
    | "LIFECYCLE_SCHEMA_INVALID" | "LIFECYCLE_DIGEST_MISMATCH"
    | "STATE_VERSION_MISMATCH" | "INVALID_STATE_TRANSITION" | "TERMINAL_STATE_IMMUTABLE"
    | "REVALIDATION_SCHEMA_INVALID" | "REVALIDATION_DIGEST_MISMATCH"
    | "DEPENDENCY_REVALIDATION_FAILED" | "CLOCK_EVIDENCE_INVALID"
    | "CLOCK_EVIDENCE_MISMATCH" | "REFERENCE_MISMATCH" }>;

const RECORD_KEYS = [
  "approval_digest", "approval_id", "approval_receipt_digest", "approval_receipt_id",
  "approval_use_state", "attempt_digest", "attempt_id", "automatic_retry", "command_id",
  "command_record_digest", "execution_binding_digest", "external_execution_authorized",
  "lifecycle_authority_id", "lifecycle_authority_revision", "lifecycle_record_digest",
  "proposal_digest", "proposal_id", "reservation_digest", "reservation_id", "schema_version",
  "state", "state_version", "terminal_receipt_digest", "terminal_receipt_id",
  "updated_clock_evidence_digest", "updated_clock_evidence_id",
] as const;
const REVALIDATION_KEYS = [
  "approval_digest", "approval_id", "approval_receipt_digest", "approval_receipt_id",
  "approval_status", "clock_status", "command_id", "command_record_digest", "command_status",
  "execution_binding_digest", "phase_b_authority_bundle_digest", "phase_b_dependencies_status",
  "clock_evidence_digest", "clock_evidence_id", "evaluated_at", "persisted_clock_lower_bound",
  "provenance_class", "revalidation_authority_id", "revalidation_authority_revision",
  "revalidation_digest", "target_binding_digest", "target_binding_status",
] as const;
const TERMINAL: readonly FarmOsProductionTargetExecutionLifecycleState[] = Object.freeze([
  "RESERVATION_OUTCOME_UNKNOWN", "CONSUMED_SUCCESS", "CONSUMED_FAILURE", "OUTCOME_UNKNOWN",
  "CANCELLED_PRE_START", "EXPIRED_PRE_START",
]);

function withoutDigest(value: Record<string, unknown>, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));
}

export function computeFarmOsProductionTargetExecutionLifecycleRecordDigest(
  value: Omit<FarmOsProductionTargetExecutionLifecycleRecord, "lifecycle_record_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-lifecycle-record.v1",
    value,
  );
}

export function computeFarmOsProductionTargetExecutionRevalidationDigest(
  value: Omit<FarmOsProductionTargetExecutionRevalidation, "revalidation_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-revalidation.v1",
    value,
  );
}

function nullableId(value: unknown): value is string | null {
  return value === null || isFarmOsProductionTargetExecutionIdentifier(value);
}
function nullableDigest(value: unknown): value is `sha256:${string}` | null {
  return value === null || isFarmOsProductionTargetExecutionDigest(value);
}

function expectedApprovalUse(state: FarmOsProductionTargetExecutionLifecycleState):
  FarmOsProductionTargetExecutionApprovalUseState {
  if (state === "UNRESERVED") return "NEVER_RESERVED";
  if (state === "RESERVED_NOT_STARTED") return "RESERVED";
  if (state === "RESERVATION_OUTCOME_UNKNOWN") return "POSSIBLY_RESERVED";
  if (state === "ATTEMPT_STARTED" || state === "OUTCOME_UNKNOWN") return "QUARANTINED";
  if (state === "CANCELLED_PRE_START") return "QUARANTINED";
  if (state === "EXPIRED_PRE_START") return "EXPIRED_OR_REVOKED";
  return "CONSUMED";
}

export function parseFarmOsProductionTargetExecutionLifecycleRecord(
  value: unknown,
): FarmOsProductionTargetExecutionTransitionResult {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, RECORD_KEYS) ||
    value.schema_version !== FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_SCHEMA_VERSION ||
    value.lifecycle_authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_ID ||
    value.lifecycle_authority_revision !== 1 ||
    !isFarmOsProductionTargetExecutionDigest(value.lifecycle_record_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.command_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.command_record_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.execution_binding_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.proposal_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.proposal_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_receipt_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_receipt_digest) ||
    !FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_STATES.includes(
      value.state as FarmOsProductionTargetExecutionLifecycleState,
    ) || !Number.isSafeInteger(value.state_version) || (value.state_version as number) < 0 ||
    !nullableId(value.reservation_id) || !nullableDigest(value.reservation_digest) ||
    !nullableId(value.attempt_id) || !nullableDigest(value.attempt_digest) ||
    !nullableId(value.terminal_receipt_id) || !nullableDigest(value.terminal_receipt_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.updated_clock_evidence_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.updated_clock_evidence_digest) ||
    value.automatic_retry !== 0 || value.external_execution_authorized !== false) {
    return Object.freeze({ accepted: false, reason: "LIFECYCLE_SCHEMA_INVALID" });
  }
  const state = value.state as FarmOsProductionTargetExecutionLifecycleState;
  if (value.approval_use_state !== expectedApprovalUse(state) ||
    (value.reservation_id === null) !== (value.reservation_digest === null) ||
    (value.attempt_id === null) !== (value.attempt_digest === null) ||
    (value.terminal_receipt_id === null) !== (value.terminal_receipt_digest === null) ||
    (state === "UNRESERVED" && (value.state_version !== 0 || value.reservation_id !== null)) ||
    (state === "RESERVED_NOT_STARTED" && (value.reservation_id === null || value.attempt_id !== null)) ||
    (state === "ATTEMPT_STARTED" && (value.reservation_id === null || value.attempt_id === null)) ||
    (state === "RESERVATION_OUTCOME_UNKNOWN" && value.attempt_id !== null) ||
    (["CONSUMED_SUCCESS", "CONSUMED_FAILURE", "OUTCOME_UNKNOWN"].includes(state) &&
      (value.reservation_id === null || value.attempt_id === null)) ||
    (["CANCELLED_PRE_START", "EXPIRED_PRE_START"].includes(state) &&
      (value.reservation_id === null || value.attempt_id !== null)) ||
    (TERMINAL.includes(state) && value.terminal_receipt_id === null)) {
    return Object.freeze({ accepted: false, reason: "LIFECYCLE_SCHEMA_INVALID" });
  }
  const record = value as unknown as FarmOsProductionTargetExecutionLifecycleRecord;
  const expected = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-lifecycle-record.v1",
    withoutDigest(record as unknown as Record<string, unknown>, "lifecycle_record_digest"),
  );
  if (record.lifecycle_record_digest !== expected) {
    return Object.freeze({ accepted: false, reason: "LIFECYCLE_DIGEST_MISMATCH" });
  }
  return Object.freeze({ accepted: true, record });
}

export function createInitialFarmOsProductionTargetExecutionLifecycleRecord(input: Readonly<{
  command: FarmOsProductionTargetExecutionCommand;
}>): FarmOsProductionTargetExecutionLifecycleRecord {
  const base = {
    schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_SCHEMA_VERSION,
    lifecycle_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_LIFECYCLE_AUTHORITY_ID,
    lifecycle_authority_revision: 1 as const,
    command_id: input.command.command_id,
    command_record_digest: input.command.command_record_digest,
    execution_binding_digest: input.command.execution_binding_digest,
    proposal_id: input.command.proposal_id,
    proposal_digest: input.command.proposal_digest,
    approval_id: input.command.approval_id,
    approval_digest: input.command.approval_digest,
    approval_receipt_id: input.command.approval_receipt_id,
    approval_receipt_digest: input.command.approval_receipt_digest,
    state: "UNRESERVED" as const,
    state_version: 0,
    approval_use_state: "NEVER_RESERVED" as const,
    reservation_id: null,
    reservation_digest: null,
    attempt_id: null,
    attempt_digest: null,
    terminal_receipt_id: null,
    terminal_receipt_digest: null,
    updated_clock_evidence_id: input.command.trusted_clock_evidence_id,
    updated_clock_evidence_digest: input.command.trusted_clock_evidence_digest,
    automatic_retry: 0 as const,
    external_execution_authorized: false as const,
  };
  return Object.freeze({
    ...base,
    lifecycle_record_digest: computeFarmOsProductionTargetExecutionLifecycleRecordDigest(base),
  });
}

function parseRevalidation(
  value: unknown,
  command: FarmOsProductionTargetExecutionCommand,
): FarmOsProductionTargetExecutionRevalidation | null {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, REVALIDATION_KEYS) ||
    value.revalidation_authority_id !==
      FARM_OS_PRODUCTION_TARGET_EXECUTION_REVALIDATION_AUTHORITY_ID ||
    value.revalidation_authority_revision !== 1 ||
    value.provenance_class !== "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION" ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.evaluated_at) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.clock_evidence_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.clock_evidence_digest) ||
    (value.persisted_clock_lower_bound !== null &&
      !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.persisted_clock_lower_bound)) ||
    value.approval_id !== command.approval_id || value.approval_digest !== command.approval_digest ||
    value.approval_receipt_id !== command.approval_receipt_id ||
    value.approval_receipt_digest !== command.approval_receipt_digest ||
    value.command_id !== command.command_id || value.command_record_digest !== command.command_record_digest ||
    value.execution_binding_digest !== command.execution_binding_digest ||
    !["ACTIVE", "EXPIRED", "REVOKED"].includes(value.approval_status as string) ||
    !["ACTIVE", "EXPIRED", "REVOKED"].includes(value.command_status as string) ||
    !["ACTIVE_EXACT_REVISION", "INVALID", "EXPIRED", "REVOKED"].includes(
      value.phase_b_dependencies_status as string,
    ) || !isFarmOsProductionTargetExecutionDigest(value.phase_b_authority_bundle_digest) ||
    value.phase_b_authority_bundle_digest !== command.phase_b_authority_bundle_digest ||
    !["MATCH", "MISMATCH"].includes(value.target_binding_status as string) ||
    value.target_binding_digest !== command.target_binding_digest ||
    value.clock_status !== "AVAILABLE" ||
    !isFarmOsProductionTargetExecutionDigest(value.revalidation_digest)) return null;
  const parsed = value as unknown as FarmOsProductionTargetExecutionRevalidation;
  const expected = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-revalidation.v1",
    withoutDigest(parsed as unknown as Record<string, unknown>, "revalidation_digest"),
  );
  return expected === parsed.revalidation_digest ? parsed : null;
}

type TransitionRefs = Readonly<{
  reservation_id?: string | null;
  reservation_digest?: `sha256:${string}` | null;
  attempt_id?: string | null;
  attempt_digest?: `sha256:${string}` | null;
  terminal_receipt_id?: string | null;
  terminal_receipt_digest?: `sha256:${string}` | null;
}>;

const TRANSITIONS: Readonly<Record<FarmOsProductionTargetExecutionLifecycleEvent, Readonly<{
  from: FarmOsProductionTargetExecutionLifecycleState;
  to: FarmOsProductionTargetExecutionLifecycleState;
  requires_active_revalidation: boolean;
  terminal: boolean;
}>>> = Object.freeze({
  RESERVE_CONFIRMED: { from: "UNRESERVED", to: "RESERVED_NOT_STARTED",
    requires_active_revalidation: true, terminal: false },
  RESERVATION_WRITE_AMBIGUOUS: { from: "UNRESERVED", to: "RESERVATION_OUTCOME_UNKNOWN",
    requires_active_revalidation: false, terminal: true },
  ATTEMPT_START_CONFIRMED: { from: "RESERVED_NOT_STARTED", to: "ATTEMPT_STARTED",
    requires_active_revalidation: true, terminal: false },
  ATTEMPT_START_WRITE_AMBIGUOUS: { from: "RESERVED_NOT_STARTED", to: "OUTCOME_UNKNOWN",
    requires_active_revalidation: false, terminal: true },
  FINALIZE_SUCCESS: { from: "ATTEMPT_STARTED", to: "CONSUMED_SUCCESS",
    requires_active_revalidation: false, terminal: true },
  FINALIZE_FAILURE: { from: "ATTEMPT_STARTED", to: "CONSUMED_FAILURE",
    requires_active_revalidation: false, terminal: true },
  POST_START_OUTCOME_UNKNOWN: { from: "ATTEMPT_STARTED", to: "OUTCOME_UNKNOWN",
    requires_active_revalidation: false, terminal: true },
  FINALIZATION_WRITE_AMBIGUOUS: { from: "ATTEMPT_STARTED", to: "OUTCOME_UNKNOWN",
    requires_active_revalidation: false, terminal: true },
  CANCEL_BEFORE_START: { from: "RESERVED_NOT_STARTED", to: "CANCELLED_PRE_START",
    requires_active_revalidation: false, terminal: true },
  EXPIRE_BEFORE_START: { from: "RESERVED_NOT_STARTED", to: "EXPIRED_PRE_START",
    requires_active_revalidation: false, terminal: true },
  RESTART_RESERVED_CANCEL: { from: "RESERVED_NOT_STARTED", to: "CANCELLED_PRE_START",
    requires_active_revalidation: false, terminal: true },
  RESTART_STARTED_OUTCOME_UNKNOWN: { from: "ATTEMPT_STARTED", to: "OUTCOME_UNKNOWN",
    requires_active_revalidation: false, terminal: true },
});

export function transitionFarmOsProductionTargetExecutionLifecycle(input: Readonly<{
  record: unknown;
  command: FarmOsProductionTargetExecutionCommand;
  event: FarmOsProductionTargetExecutionLifecycleEvent;
  expected_state_version: number;
  revalidation: unknown;
  clock_evidence: unknown;
  persisted_clock_lower_bound: string | null;
  references?: TransitionRefs;
}>): FarmOsProductionTargetExecutionTransitionResult {
  const currentResult = parseFarmOsProductionTargetExecutionLifecycleRecord(input.record);
  if (!currentResult.accepted) return currentResult;
  const current = currentResult.record;
  if (TERMINAL.includes(current.state)) {
    return Object.freeze({ accepted: false, reason: "TERMINAL_STATE_IMMUTABLE" });
  }
  if (!Number.isSafeInteger(input.expected_state_version) ||
    current.state_version !== input.expected_state_version) {
    return Object.freeze({ accepted: false, reason: "STATE_VERSION_MISMATCH" });
  }
  if (current.command_id !== input.command.command_id ||
    current.command_record_digest !== input.command.command_record_digest ||
    current.execution_binding_digest !== input.command.execution_binding_digest) {
    return Object.freeze({ accepted: false, reason: "REFERENCE_MISMATCH" });
  }
  const rule = TRANSITIONS[input.event];
  if (!rule || rule.from !== current.state) {
    return Object.freeze({ accepted: false, reason: "INVALID_STATE_TRANSITION" });
  }
  const revalidation = parseRevalidation(input.revalidation, input.command);
  if (!revalidation) {
    return Object.freeze({ accepted: false, reason: "REVALIDATION_SCHEMA_INVALID" });
  }
  if (rule.requires_active_revalidation &&
    (revalidation.approval_status !== "ACTIVE" || revalidation.command_status !== "ACTIVE" ||
      revalidation.phase_b_dependencies_status !== "ACTIVE_EXACT_REVISION" ||
      revalidation.target_binding_status !== "MATCH")) {
    return Object.freeze({ accepted: false, reason: "DEPENDENCY_REVALIDATION_FAILED" });
  }
  if (input.event === "CANCEL_BEFORE_START" &&
    revalidation.approval_status !== "REVOKED" &&
    revalidation.command_status !== "REVOKED" &&
    revalidation.phase_b_dependencies_status !== "REVOKED") {
    return Object.freeze({ accepted: false, reason: "DEPENDENCY_REVALIDATION_FAILED" });
  }
  if (input.event === "EXPIRE_BEFORE_START" &&
    revalidation.approval_status !== "EXPIRED" &&
    revalidation.command_status !== "EXPIRED" &&
    revalidation.phase_b_dependencies_status !== "EXPIRED") {
    return Object.freeze({ accepted: false, reason: "DEPENDENCY_REVALIDATION_FAILED" });
  }
  const clock = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: input.clock_evidence,
    persisted_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!clock.accepted) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_INVALID" });
  }
  if (revalidation.evaluated_at !== clock.evidence.observed_at ||
    revalidation.clock_evidence_id !== clock.evidence.evidence_id ||
    revalidation.clock_evidence_digest !== clock.evidence.evidence_digest ||
    revalidation.persisted_clock_lower_bound !== input.persisted_clock_lower_bound) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_MISMATCH" });
  }
  const refs = input.references ?? {};
  const reservationId = refs.reservation_id === undefined ? current.reservation_id : refs.reservation_id;
  const reservationDigest = refs.reservation_digest === undefined
    ? current.reservation_digest : refs.reservation_digest;
  const attemptId = refs.attempt_id === undefined ? current.attempt_id : refs.attempt_id;
  const attemptDigest = refs.attempt_digest === undefined ? current.attempt_digest : refs.attempt_digest;
  const receiptId = refs.terminal_receipt_id === undefined
    ? current.terminal_receipt_id : refs.terminal_receipt_id;
  const receiptDigest = refs.terminal_receipt_digest === undefined
    ? current.terminal_receipt_digest : refs.terminal_receipt_digest;
  const reservationPreserved = reservationId === current.reservation_id &&
    reservationDigest === current.reservation_digest;
  const attemptPreserved = attemptId === current.attempt_id &&
    attemptDigest === current.attempt_digest;
  const eventReferencesValid =
    (input.event === "RESERVE_CONFIRMED" && reservationId !== null && attemptId === null &&
      receiptId === null) ||
    (input.event === "RESERVATION_WRITE_AMBIGUOUS" && attemptId === null && receiptId !== null) ||
    (input.event === "ATTEMPT_START_CONFIRMED" && reservationPreserved && attemptId !== null &&
      receiptId === null) ||
    (input.event === "ATTEMPT_START_WRITE_AMBIGUOUS" && reservationPreserved &&
      attemptId !== null && receiptId !== null) ||
    (["FINALIZE_SUCCESS", "FINALIZE_FAILURE", "POST_START_OUTCOME_UNKNOWN",
      "FINALIZATION_WRITE_AMBIGUOUS", "RESTART_STARTED_OUTCOME_UNKNOWN"].includes(input.event) && reservationPreserved &&
      attemptPreserved && receiptId !== null) ||
    (["CANCEL_BEFORE_START", "EXPIRE_BEFORE_START", "RESTART_RESERVED_CANCEL"].includes(input.event) &&
      reservationPreserved && attemptPreserved && receiptId !== null);
  if ((reservationId === null) !== (reservationDigest === null) ||
    (attemptId === null) !== (attemptDigest === null) ||
    (receiptId === null) !== (receiptDigest === null) ||
    (rule.to === "RESERVED_NOT_STARTED" && reservationId === null) ||
    (rule.to === "ATTEMPT_STARTED" && (reservationId === null || attemptId === null)) ||
    (rule.terminal && receiptId === null) || !eventReferencesValid) {
    return Object.freeze({ accepted: false, reason: "REFERENCE_MISMATCH" });
  }
  const nextBase = {
    ...current,
    state: rule.to,
    state_version: current.state_version + 1,
    approval_use_state: expectedApprovalUse(rule.to),
    reservation_id: reservationId,
    reservation_digest: reservationDigest,
    attempt_id: attemptId,
    attempt_digest: attemptDigest,
    terminal_receipt_id: receiptId,
    terminal_receipt_digest: receiptDigest,
    updated_clock_evidence_id: clock.evidence.evidence_id,
    updated_clock_evidence_digest: clock.evidence.evidence_digest,
  };
  const material = withoutDigest(
    nextBase as unknown as Record<string, unknown>,
    "lifecycle_record_digest",
  );
  const next = Object.freeze({
    ...nextBase,
    lifecycle_record_digest: hashFarmOsProductionTargetExecutionContract(
      "farmos.production-target-execution-lifecycle-record.v1",
      material,
    ),
  }) as FarmOsProductionTargetExecutionLifecycleRecord;
  return Object.freeze({ accepted: true, record: next });
}

export function classifyFarmOsProductionTargetExecutionReuse(input: Readonly<{
  existing: FarmOsProductionTargetExecutionLifecycleRecord;
  candidate: FarmOsProductionTargetExecutionCommand;
}>): "NO_CONFLICT" | "COMMAND_REUSE_PROHIBITED" | "APPROVAL_REUSE_PROHIBITED" |
  "COMMAND_BINDING_CONFLICT" {
  if (input.existing.command_id === input.candidate.command_id) {
    return input.existing.execution_binding_digest === input.candidate.execution_binding_digest &&
        input.existing.command_record_digest === input.candidate.command_record_digest
      ? "COMMAND_REUSE_PROHIBITED" : "COMMAND_BINDING_CONFLICT";
  }
  if (input.existing.approval_id === input.candidate.approval_id ||
    input.existing.approval_receipt_id === input.candidate.approval_receipt_id) {
    return "APPROVAL_REUSE_PROHIBITED";
  }
  return "NO_CONFLICT";
}
