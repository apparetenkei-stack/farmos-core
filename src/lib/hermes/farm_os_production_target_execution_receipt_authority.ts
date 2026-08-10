import type { FarmOsProductionTargetExecutionCommand } from
  "./farm_os_production_target_execution_command_authority";
import type { FarmOsProductionTargetExecutionLifecycleRecord } from
  "./farm_os_production_target_execution_lifecycle";
import {
  hashFarmOsProductionTargetExecutionContract,
  hasExactFarmOsProductionTargetExecutionKeys,
  isFarmOsProductionTargetExecutionDigest,
  isFarmOsProductionTargetExecutionIdentifier,
  isFarmOsProductionTargetExecutionRecord,
  qualifyFarmOsProductionTargetExecutionClockEvidence,
} from "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID =
  "farmos.production-target-execution-receipt-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION =
  "farmos.production-target-execution-receipt.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_TERMINAL_STATES = Object.freeze([
  "RESERVATION_OUTCOME_UNKNOWN", "CONSUMED_SUCCESS", "CONSUMED_FAILURE", "OUTCOME_UNKNOWN",
  "CANCELLED_PRE_START", "EXPIRED_PRE_START",
] as const);
export type FarmOsProductionTargetExecutionTerminalState =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_TERMINAL_STATES[number];
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_UNKNOWN_STAGES = Object.freeze([
  "NONE", "RESERVATION_WRITE", "ATTEMPT_START_WRITE", "POST_START",
  "FINALIZATION_WRITE",
] as const);
export type FarmOsProductionTargetExecutionUnknownStage =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_UNKNOWN_STAGES[number];

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID,
  authority_revision: FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_REVISION,
  append_only: true,
  overwrite_mutation: "PROHIBITED",
  unknown_outcome_receipt_required: true,
  production_evidence_receipt_authority: false,
  establishes_gate2_production_receipt: false,
  implementation_status: "SOURCE_ONLY_CONTRACT_CANDIDATE",
} as const);

export type FarmOsProductionTargetExecutionReceipt = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION;
  receipt_authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID;
  receipt_authority_revision: 1;
  receipt_id: string;
  receipt_digest: `sha256:${string}`;
  command_id: string;
  command_record_digest: `sha256:${string}`;
  execution_binding_digest: `sha256:${string}`;
  proposal_id: string;
  proposal_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  reservation_id: string | null;
  reservation_digest: `sha256:${string}` | null;
  attempt_id: string | null;
  attempt_digest: `sha256:${string}` | null;
  terminal_state: FarmOsProductionTargetExecutionTerminalState;
  result_classification: "SUCCEEDED" | "FAILED" | "UNKNOWN" | "NOT_EXECUTED";
  unknown_stage: FarmOsProductionTargetExecutionUnknownStage;
  result_evidence_reference_digest: `sha256:${string}` | null;
  trusted_clock_evidence_id: string;
  trusted_clock_evidence_digest: `sha256:${string}`;
  recorded_at: string;
  supersedes_receipt_id: string | null;
  supersedes_receipt_digest: `sha256:${string}` | null;
  append_only: true;
  automatic_retry_prohibited: true;
  manual_review_required: boolean;
  production_evidence_receipt: false;
}>;

export type FarmOsProductionTargetExecutionReceiptValidation =
  | Readonly<{ accepted: true; receipt: FarmOsProductionTargetExecutionReceipt }>
  | Readonly<{ accepted: false; reason:
    | "RECEIPT_SCHEMA_INVALID" | "RECEIPT_DIGEST_MISMATCH"
    | "RECEIPT_LINEAGE_MISMATCH" | "RECEIPT_STATE_INVALID"
    | "CLOCK_EVIDENCE_INVALID" | "CLOCK_EVIDENCE_MISMATCH" }>;

const RECEIPT_KEYS = [
  "append_only", "approval_digest", "approval_id", "approval_receipt_digest",
  "approval_receipt_id", "attempt_digest", "attempt_id", "automatic_retry_prohibited",
  "command_id", "command_record_digest", "execution_binding_digest", "manual_review_required",
  "production_evidence_receipt", "proposal_digest", "proposal_id", "receipt_authority_id",
  "receipt_authority_revision", "receipt_digest", "receipt_id", "recorded_at",
  "reservation_digest", "reservation_id", "result_classification",
  "result_evidence_reference_digest", "schema_version", "supersedes_receipt_digest",
  "supersedes_receipt_id", "terminal_state", "trusted_clock_evidence_digest",
  "trusted_clock_evidence_id", "unknown_stage",
] as const;

export function computeFarmOsProductionTargetExecutionReceiptDigest(
  value: Omit<FarmOsProductionTargetExecutionReceipt, "receipt_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-receipt.v1",
    value,
  );
}

function nullableIdentifier(value: unknown): value is string | null {
  return value === null || isFarmOsProductionTargetExecutionIdentifier(value);
}

function nullableDigest(value: unknown): value is `sha256:${string}` | null {
  return value === null || isFarmOsProductionTargetExecutionDigest(value);
}

function stateSemanticsValid(value: FarmOsProductionTargetExecutionReceipt): boolean {
  const pairedReservation = (value.reservation_id === null) === (value.reservation_digest === null);
  const pairedAttempt = (value.attempt_id === null) === (value.attempt_digest === null);
  const pairedSupersession =
    (value.supersedes_receipt_id === null) === (value.supersedes_receipt_digest === null);
  if (!pairedReservation || !pairedAttempt || !pairedSupersession ||
    value.supersedes_receipt_id !== null) return false;
  if (value.terminal_state === "CONSUMED_SUCCESS") {
    return value.reservation_id !== null && value.attempt_id !== null &&
      value.result_classification === "SUCCEEDED" && value.unknown_stage === "NONE" &&
      value.result_evidence_reference_digest !== null && !value.manual_review_required;
  }
  if (value.terminal_state === "CONSUMED_FAILURE") {
    return value.reservation_id !== null && value.attempt_id !== null &&
      value.result_classification === "FAILED" && value.unknown_stage === "NONE" &&
      value.result_evidence_reference_digest !== null && value.manual_review_required;
  }
  if (value.terminal_state === "CANCELLED_PRE_START" ||
    value.terminal_state === "EXPIRED_PRE_START") {
    return value.reservation_id !== null && value.attempt_id === null &&
      value.result_classification === "NOT_EXECUTED" && value.unknown_stage === "NONE" &&
      value.result_evidence_reference_digest === null && value.manual_review_required;
  }
  if (value.terminal_state === "RESERVATION_OUTCOME_UNKNOWN") {
    return value.attempt_id === null && value.result_classification === "UNKNOWN" &&
      value.unknown_stage === "RESERVATION_WRITE" &&
      value.result_evidence_reference_digest === null && value.manual_review_required;
  }
  return value.reservation_id !== null && value.attempt_id !== null &&
    value.result_classification === "UNKNOWN" &&
    ["ATTEMPT_START_WRITE", "POST_START", "FINALIZATION_WRITE"].includes(
      value.unknown_stage,
    ) && value.result_evidence_reference_digest === null && value.manual_review_required;
}

export function validateFarmOsProductionTargetExecutionReceipt(input: Readonly<{
  receipt: unknown;
  command: FarmOsProductionTargetExecutionCommand;
  clock_evidence: unknown;
  persisted_clock_lower_bound: string | null;
}>): FarmOsProductionTargetExecutionReceiptValidation {
  const value = input.receipt;
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, RECEIPT_KEYS) ||
    value.schema_version !== FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_SCHEMA_VERSION ||
    value.receipt_authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_RECEIPT_AUTHORITY_ID ||
    value.receipt_authority_revision !== 1 ||
    !isFarmOsProductionTargetExecutionIdentifier(value.receipt_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.receipt_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.command_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.command_record_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.execution_binding_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.proposal_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.proposal_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_receipt_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_receipt_digest) ||
    !nullableIdentifier(value.reservation_id) || !nullableDigest(value.reservation_digest) ||
    !nullableIdentifier(value.attempt_id) || !nullableDigest(value.attempt_digest) ||
    !FARM_OS_PRODUCTION_TARGET_EXECUTION_TERMINAL_STATES.includes(
      value.terminal_state as FarmOsProductionTargetExecutionTerminalState,
    ) || !["SUCCEEDED", "FAILED", "UNKNOWN", "NOT_EXECUTED"].includes(
      value.result_classification as string,
    ) || !FARM_OS_PRODUCTION_TARGET_EXECUTION_UNKNOWN_STAGES.includes(
      value.unknown_stage as FarmOsProductionTargetExecutionUnknownStage,
    ) || !nullableDigest(value.result_evidence_reference_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.trusted_clock_evidence_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.trusted_clock_evidence_digest) ||
    typeof value.recorded_at !== "string" || !nullableIdentifier(value.supersedes_receipt_id) ||
    !nullableDigest(value.supersedes_receipt_digest) || value.append_only !== true ||
    value.automatic_retry_prohibited !== true || typeof value.manual_review_required !== "boolean" ||
    value.production_evidence_receipt !== false) {
    return Object.freeze({ accepted: false, reason: "RECEIPT_SCHEMA_INVALID" });
  }
  const receipt = value as unknown as FarmOsProductionTargetExecutionReceipt;
  if (!stateSemanticsValid(receipt)) {
    return Object.freeze({ accepted: false, reason: "RECEIPT_STATE_INVALID" });
  }
  const lineageMatches = receipt.command_id === input.command.command_id &&
    receipt.command_record_digest === input.command.command_record_digest &&
    receipt.execution_binding_digest === input.command.execution_binding_digest &&
    receipt.proposal_id === input.command.proposal_id &&
    receipt.proposal_digest === input.command.proposal_digest &&
    receipt.approval_id === input.command.approval_id &&
    receipt.approval_digest === input.command.approval_digest &&
    receipt.approval_receipt_id === input.command.approval_receipt_id &&
    receipt.approval_receipt_digest === input.command.approval_receipt_digest;
  if (!lineageMatches) {
    return Object.freeze({ accepted: false, reason: "RECEIPT_LINEAGE_MISMATCH" });
  }
  const clock = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: input.clock_evidence,
    persisted_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!clock.accepted || receipt.recorded_at !== clock.evidence.observed_at) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_INVALID" });
  }
  if (receipt.trusted_clock_evidence_id !== clock.evidence.evidence_id ||
    receipt.trusted_clock_evidence_digest !== clock.evidence.evidence_digest) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_MISMATCH" });
  }
  const material = Object.fromEntries(
    Object.entries(receipt).filter(([key]) => key !== "receipt_digest"),
  );
  const expected = hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-receipt.v1",
    material,
  );
  if (receipt.receipt_digest !== expected) {
    return Object.freeze({ accepted: false, reason: "RECEIPT_DIGEST_MISMATCH" });
  }
  return Object.freeze({ accepted: true, receipt });
}

export function validateFarmOsProductionTargetExecutionReceiptLifecycleBinding(input: Readonly<{
  receipt: FarmOsProductionTargetExecutionReceipt;
  lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
}>): boolean {
  const { receipt, lifecycle } = input;
  return receipt.receipt_id === lifecycle.terminal_receipt_id &&
    receipt.receipt_digest === lifecycle.terminal_receipt_digest &&
    receipt.command_id === lifecycle.command_id &&
    receipt.command_record_digest === lifecycle.command_record_digest &&
    receipt.execution_binding_digest === lifecycle.execution_binding_digest &&
    receipt.proposal_id === lifecycle.proposal_id &&
    receipt.proposal_digest === lifecycle.proposal_digest &&
    receipt.approval_id === lifecycle.approval_id &&
    receipt.approval_digest === lifecycle.approval_digest &&
    receipt.approval_receipt_id === lifecycle.approval_receipt_id &&
    receipt.approval_receipt_digest === lifecycle.approval_receipt_digest &&
    receipt.reservation_id === lifecycle.reservation_id &&
    receipt.reservation_digest === lifecycle.reservation_digest &&
    receipt.attempt_id === lifecycle.attempt_id &&
    receipt.attempt_digest === lifecycle.attempt_digest &&
    receipt.terminal_state === lifecycle.state;
}
