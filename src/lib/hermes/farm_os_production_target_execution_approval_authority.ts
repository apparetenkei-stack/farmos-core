import {
  hashFarmOsProductionTargetExecutionContract,
  hasExactFarmOsProductionTargetExecutionKeys,
  isFarmOsProductionTargetExecutionDigest,
  isFarmOsProductionTargetExecutionIdentifier,
  isFarmOsProductionTargetExecutionRecord,
  isCanonicalFarmOsProductionTargetExecutionTimestamp,
  qualifyFarmOsProductionTargetExecutionClockEvidence,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "./farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID =
  "farmos.production-target-execution-proposal.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID =
  "farmos.production-target-execution-approval.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID =
  "farmos.production-target-execution-approval-receipt.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID =
  "farmos.production-target-execution-approval-revocation.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION =
  "farmos.production-target-execution-approval-revocation-event.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_HEAD_SCHEMA_VERSION =
  "farmos.production-target-execution-approval-revocation-head.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_OPERATION_SCOPES = Object.freeze([
  "ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE",
  "PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL",
] as const);
export type FarmOsProductionTargetExecutionOperationScope =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_OPERATION_SCOPES[number];

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_CONTRACT = Object.freeze({
  proposal_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID,
  approval_authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID,
  approval_receipt_authority_id:
    FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID,
  authority_revision: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_REVISION,
  server_owned_human_actor_provenance_required: true,
  client_role_or_boolean_is_authority: false,
  approval_reuse: "PROHIBITED",
  automatic_latest_selection: false,
  durable_approval_sot_established: true,
  implementation_status: "ISOLATED_STORAGE_QUALIFIED",
} as const);

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_REASONS = Object.freeze([
  "HUMAN_REVIEW_REVOKED",
  "GOVERNANCE_POLICY_REVOKED",
  "SECURITY_AUTHORITY_REVOKED",
] as const);
export type FarmOsProductionTargetExecutionApprovalRevocationReason =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_REASONS[number];

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_CONTRACT = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID,
  authority_revision: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_REVISION,
  append_only_events: true,
  approval_record_mutation: "PROHIBITED",
  approval_receipt_mutation: "PROHIBITED",
  command_binding_mutation: "PROHIBITED",
  exact_event_resolution_only: true,
  automatic_latest_event_resolution: false,
  monotonic_event_sequence_required: true,
  compare_and_set_head_required: true,
  trusted_clock_evidence_required: true,
  storage_implementation_status: "ISOLATED_STORAGE_QUALIFIED",
} as const);

export type FarmOsProductionTargetExecutionProposal = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID;
  authority_revision: 1;
  proposal_id: string;
  target_binding_digest: `sha256:${string}`;
  purpose: "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION";
  operation_scope: FarmOsProductionTargetExecutionOperationScope;
  requested_by_actor_reference_digest: `sha256:${string}`;
  proposed_at: string;
  expires_at: string;
  revoked: boolean;
  proposal_digest: `sha256:${string}`;
}>;

export type FarmOsProductionTargetExecutionHumanActorProvenance = Readonly<{
  actor_authority_id: "farmos.human-approval-actor-authority.v1";
  actor_authority_revision: 1;
  actor_reference_digest: `sha256:${string}`;
  authentication_context_digest: `sha256:${string}`;
  provenance_class: "SERVER_OWNED_AUTHENTICATED_HUMAN_REVIEW";
  server_owned_record: true;
}>;

export type FarmOsProductionTargetExecutionHumanApproval = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID;
  authority_revision: 1;
  approval_id: string;
  proposal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID;
  proposal_authority_revision: 1;
  proposal_id: string;
  proposal_digest: `sha256:${string}`;
  target_binding_digest: `sha256:${string}`;
  operation_scope: FarmOsProductionTargetExecutionOperationScope;
  decision: "APPROVED";
  actor_provenance: FarmOsProductionTargetExecutionHumanActorProvenance;
  approved_at: string;
  expires_at: string;
  revoked: boolean;
  approval_digest: `sha256:${string}`;
}>;

export type FarmOsProductionTargetExecutionApprovalReceipt = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID;
  authority_revision: 1;
  approval_receipt_id: string;
  proposal_id: string;
  proposal_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  target_binding_digest: `sha256:${string}`;
  operation_scope: FarmOsProductionTargetExecutionOperationScope;
  issued_at: string;
  expires_at: string;
  status: "ISSUED";
  server_owned_record: true;
  approval_receipt_digest: `sha256:${string}`;
}>;

export type FarmOsProductionTargetExecutionApprovalLineage = Readonly<{
  proposal: FarmOsProductionTargetExecutionProposal;
  approval: FarmOsProductionTargetExecutionHumanApproval;
  approval_receipt: FarmOsProductionTargetExecutionApprovalReceipt;
}>;

export type FarmOsProductionTargetExecutionApprovalRevocationEvent = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION;
  revocation_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID;
  revocation_authority_revision: 1;
  revocation_event_id: `approvalrev_${string}`;
  revocation_event_digest: `sha256:${string}`;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  target_binding_digest: `sha256:${string}`;
  operation_scope: FarmOsProductionTargetExecutionOperationScope;
  reason: FarmOsProductionTargetExecutionApprovalRevocationReason;
  trusted_clock_evidence_id: string;
  trusted_clock_evidence_digest: `sha256:${string}`;
  effective_at: string;
  event_sequence: number;
  previous_event_digest: `sha256:${string}` | null;
  server_owned_record: true;
  append_only: true;
}>;

export type FarmOsProductionTargetExecutionApprovalRevocationHead = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_HEAD_SCHEMA_VERSION;
  revocation_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID;
  revocation_authority_revision: 1;
  approval_id: string;
  approval_digest: `sha256:${string}`;
  approval_receipt_id: string;
  approval_receipt_digest: `sha256:${string}`;
  target_binding_digest: `sha256:${string}`;
  operation_scope: FarmOsProductionTargetExecutionOperationScope;
  status: "ACTIVE" | "REVOKED";
  head_version: number;
  latest_event_id: `approvalrev_${string}` | null;
  latest_event_digest: `sha256:${string}` | null;
  effective_revoked_at: string | null;
  head_digest: `sha256:${string}`;
}>;

export type FarmOsProductionTargetExecutionApprovalRevocationState = Readonly<{
  head: FarmOsProductionTargetExecutionApprovalRevocationHead;
  latest_event: FarmOsProductionTargetExecutionApprovalRevocationEvent | null;
}>;

export type FarmOsProductionTargetExecutionApprovalUsability =
  | Readonly<{ status: "ACTIVE"; head: FarmOsProductionTargetExecutionApprovalRevocationHead }>
  | Readonly<{ status: "REVOKED"; head: FarmOsProductionTargetExecutionApprovalRevocationHead;
    effective_revoked_at: string }>
  | Readonly<{ status: "EXPIRED"; head: FarmOsProductionTargetExecutionApprovalRevocationHead }>
  | Readonly<{ status: "INVALID"; reason:
    | "APPROVAL_SCHEMA_INVALID" | "APPROVAL_RECEIPT_SCHEMA_INVALID"
    | "REVOCATION_HEAD_REQUIRED" | "REVOCATION_HEAD_INVALID"
    | "REVOCATION_LINEAGE_MISMATCH" | "CLOCK_EVIDENCE_INVALID" }>;

export type FarmOsProductionTargetExecutionApprovalRevocationEventValidation =
  | Readonly<{ accepted: true; event: FarmOsProductionTargetExecutionApprovalRevocationEvent }>
  | Readonly<{ accepted: false; reason:
    | "REVOCATION_EVENT_SCHEMA_INVALID" | "REVOCATION_AUTHORITY_MISMATCH"
    | "REVOCATION_EVENT_DIGEST_MISMATCH" | "REVOCATION_EVENT_ID_MISMATCH"
    | "REVOCATION_LINEAGE_MISMATCH" | "CLOCK_EVIDENCE_INVALID"
    | "CLOCK_EVIDENCE_MISMATCH" }>;

export type FarmOsProductionTargetExecutionApprovalRevocationHeadAdvance =
  | Readonly<{ accepted: true; head: FarmOsProductionTargetExecutionApprovalRevocationHead }>
  | Readonly<{ accepted: false; reason:
    | "REVOCATION_HEAD_SCHEMA_INVALID" | "REVOCATION_HEAD_DIGEST_MISMATCH"
    | "REVOCATION_HEAD_CAS_MISMATCH" | "REVOCATION_SEQUENCE_REGRESSION"
    | "REVOCATION_EVENT_CONFLICT" | "REVOCATION_LINEAGE_MISMATCH"
    | "REVOCATION_ALREADY_EFFECTIVE" | "REVOCATION_EVENT_INVALID" }>;

export type FarmOsProductionTargetExecutionApprovalRevocationStateValidation =
  | Readonly<{ accepted: true; state: FarmOsProductionTargetExecutionApprovalRevocationState }>
  | Readonly<{ accepted: false; reason:
    | "REVOCATION_STATE_SCHEMA_INVALID" | "REVOCATION_STATE_INCOHERENT"
    | "REVOCATION_HEAD_INVALID" | "REVOCATION_EVENT_INVALID" }>;

export type FarmOsProductionTargetExecutionApprovalValidation =
  | Readonly<{ accepted: true; lineage: FarmOsProductionTargetExecutionApprovalLineage }>
  | Readonly<{ accepted: false; reason:
    | "PROPOSAL_SCHEMA_INVALID"
    | "PROPOSAL_DIGEST_MISMATCH"
    | "APPROVAL_SCHEMA_INVALID"
    | "APPROVAL_DIGEST_MISMATCH"
    | "APPROVAL_RECEIPT_SCHEMA_INVALID"
    | "APPROVAL_RECEIPT_DIGEST_MISMATCH"
    | "APPROVAL_LINEAGE_MISMATCH"
    | "APPROVAL_EXPIRED"
    | "APPROVAL_REVOKED"
    | "CLOCK_EVIDENCE_INVALID"
    | "DUPLICATE_EXACT_AUTHORITY_REVISION" }>;

export type FarmOsProductionTargetExecutionApprovalResolution =
  | Readonly<{ accepted: true; approval: FarmOsProductionTargetExecutionHumanApproval }>
  | Readonly<{ accepted: false; reason:
    | "APPROVAL_AUTHORITY_MISMATCH" | "APPROVAL_UNKNOWN" | "APPROVAL_SCHEMA_INVALID"
    | "APPROVAL_DIGEST_MISMATCH" | "APPROVAL_REVOKED" | "APPROVAL_EXPIRED"
    | "CLOCK_EVIDENCE_INVALID" | "DUPLICATE_EXACT_AUTHORITY_REVISION" }>;

const PROPOSAL_KEYS = [
  "authority_id", "authority_revision", "expires_at", "operation_scope", "proposal_digest",
  "proposal_id", "proposed_at", "purpose", "requested_by_actor_reference_digest", "revoked",
  "target_binding_digest",
] as const;
const ACTOR_KEYS = [
  "actor_authority_id", "actor_authority_revision", "actor_reference_digest",
  "authentication_context_digest", "provenance_class", "server_owned_record",
] as const;
const APPROVAL_KEYS = [
  "actor_provenance", "approval_digest", "approval_id", "approved_at", "authority_id",
  "authority_revision", "decision", "expires_at", "operation_scope", "proposal_authority_id",
  "proposal_authority_revision", "proposal_digest", "proposal_id", "revoked",
  "target_binding_digest",
] as const;
const RECEIPT_KEYS = [
  "approval_digest", "approval_id", "approval_receipt_digest", "approval_receipt_id",
  "authority_id", "authority_revision", "expires_at", "issued_at", "operation_scope",
  "proposal_digest", "proposal_id", "server_owned_record", "status", "target_binding_digest",
] as const;
const REVOCATION_EVENT_KEYS = [
  "append_only", "approval_digest", "approval_id", "approval_receipt_digest",
  "approval_receipt_id", "effective_at", "event_sequence", "operation_scope",
  "previous_event_digest", "reason", "revocation_authority_id",
  "revocation_authority_revision", "revocation_event_digest", "revocation_event_id",
  "schema_version", "server_owned_record", "target_binding_digest",
  "trusted_clock_evidence_digest", "trusted_clock_evidence_id",
] as const;
const REVOCATION_HEAD_KEYS = [
  "approval_digest", "approval_id", "approval_receipt_digest", "approval_receipt_id",
  "effective_revoked_at", "head_digest", "head_version", "latest_event_digest",
  "latest_event_id", "operation_scope", "revocation_authority_id",
  "revocation_authority_revision", "schema_version", "status", "target_binding_digest",
] as const;
const REVOCATION_EVENT_ID = /^approvalrev_[a-f0-9]{64}$/u;

function digestWithout<T extends Record<string, unknown>>(
  domain: string,
  value: T,
  digestKey: keyof T,
): `sha256:${string}` {
  const material = Object.fromEntries(Object.entries(value).filter(([key]) => key !== digestKey));
  return hashFarmOsProductionTargetExecutionContract(domain, material);
}

export function computeFarmOsProductionTargetExecutionProposalDigest(
  value: Omit<FarmOsProductionTargetExecutionProposal, "proposal_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-proposal.v1",
    value,
  );
}

export function computeFarmOsProductionTargetExecutionApprovalDigest(
  value: Omit<FarmOsProductionTargetExecutionHumanApproval, "approval_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-approval.v1",
    value,
  );
}

export function computeFarmOsProductionTargetExecutionApprovalReceiptDigest(
  value: Omit<FarmOsProductionTargetExecutionApprovalReceipt, "approval_receipt_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-approval-receipt.v1",
    value,
  );
}

function validOperation(value: unknown): value is FarmOsProductionTargetExecutionOperationScope {
  return FARM_OS_PRODUCTION_TARGET_EXECUTION_OPERATION_SCOPES.includes(
    value as FarmOsProductionTargetExecutionOperationScope,
  );
}

function parseProposal(value: unknown): FarmOsProductionTargetExecutionProposal | null {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, PROPOSAL_KEYS) ||
    value.authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID ||
    value.authority_revision !== 1 || !isFarmOsProductionTargetExecutionIdentifier(value.proposal_id) ||
    value.purpose !== "PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION" ||
    !validOperation(value.operation_scope) ||
    !isFarmOsProductionTargetExecutionDigest(value.target_binding_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.requested_by_actor_reference_digest) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.proposed_at) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.expires_at) ||
    Date.parse(value.expires_at) <= Date.parse(value.proposed_at) ||
    typeof value.revoked !== "boolean" ||
    !isFarmOsProductionTargetExecutionDigest(value.proposal_digest)) return null;
  return value as unknown as FarmOsProductionTargetExecutionProposal;
}

function parseApproval(value: unknown): FarmOsProductionTargetExecutionHumanApproval | null {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, APPROVAL_KEYS) ||
    value.authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID ||
    value.authority_revision !== 1 ||
    value.proposal_authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_PROPOSAL_AUTHORITY_ID ||
    value.proposal_authority_revision !== 1 ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.proposal_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.proposal_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.target_binding_digest) ||
    !validOperation(value.operation_scope) || value.decision !== "APPROVED" ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.approved_at) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.expires_at) ||
    Date.parse(value.expires_at) <= Date.parse(value.approved_at) ||
    typeof value.revoked !== "boolean" ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionRecord(value.actor_provenance) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value.actor_provenance, ACTOR_KEYS) ||
    value.actor_provenance.actor_authority_id !== "farmos.human-approval-actor-authority.v1" ||
    value.actor_provenance.actor_authority_revision !== 1 ||
    value.actor_provenance.provenance_class !== "SERVER_OWNED_AUTHENTICATED_HUMAN_REVIEW" ||
    value.actor_provenance.server_owned_record !== true ||
    !isFarmOsProductionTargetExecutionDigest(value.actor_provenance.actor_reference_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.actor_provenance.authentication_context_digest)) {
    return null;
  }
  return value as unknown as FarmOsProductionTargetExecutionHumanApproval;
}

function parseApprovalReceipt(
  value: unknown,
): FarmOsProductionTargetExecutionApprovalReceipt | null {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, RECEIPT_KEYS) ||
    value.authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_RECEIPT_AUTHORITY_ID ||
    value.authority_revision !== 1 ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_receipt_id) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.proposal_id) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.proposal_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.target_binding_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_receipt_digest) ||
    !validOperation(value.operation_scope) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.issued_at) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.expires_at) ||
    Date.parse(value.expires_at) <= Date.parse(value.issued_at) ||
    value.status !== "ISSUED" || value.server_owned_record !== true) return null;
  return value as unknown as FarmOsProductionTargetExecutionApprovalReceipt;
}

export function validateFarmOsProductionTargetExecutionApprovalLineage(input: Readonly<{
  proposal: unknown;
  approval: unknown;
  approval_receipt: unknown;
  clock_evidence: unknown;
  persisted_clock_lower_bound: string | null;
}>): FarmOsProductionTargetExecutionApprovalValidation {
  const proposal = parseProposal(input.proposal);
  if (!proposal) return Object.freeze({ accepted: false, reason: "PROPOSAL_SCHEMA_INVALID" });
  if (proposal.proposal_digest !== digestWithout(
    "farmos.production-target-execution-proposal.v1",
    proposal as unknown as Record<string, unknown>,
    "proposal_digest",
  )) return Object.freeze({ accepted: false, reason: "PROPOSAL_DIGEST_MISMATCH" });
  const approval = parseApproval(input.approval);
  if (!approval) return Object.freeze({ accepted: false, reason: "APPROVAL_SCHEMA_INVALID" });
  if (approval.approval_digest !== digestWithout(
    "farmos.production-target-execution-approval.v1",
    approval as unknown as Record<string, unknown>,
    "approval_digest",
  )) return Object.freeze({ accepted: false, reason: "APPROVAL_DIGEST_MISMATCH" });
  const approvalReceipt = parseApprovalReceipt(input.approval_receipt);
  if (!approvalReceipt) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_RECEIPT_SCHEMA_INVALID" });
  }
  if (approvalReceipt.approval_receipt_digest !== digestWithout(
    "farmos.production-target-execution-approval-receipt.v1",
    approvalReceipt as unknown as Record<string, unknown>,
    "approval_receipt_digest",
  )) return Object.freeze({ accepted: false, reason: "APPROVAL_RECEIPT_DIGEST_MISMATCH" });
  const lineageMatches = approval.proposal_id === proposal.proposal_id &&
    approval.proposal_digest === proposal.proposal_digest &&
    approval.target_binding_digest === proposal.target_binding_digest &&
    approval.operation_scope === proposal.operation_scope &&
    approvalReceipt.proposal_id === proposal.proposal_id &&
    approvalReceipt.proposal_digest === proposal.proposal_digest &&
    approvalReceipt.approval_id === approval.approval_id &&
    approvalReceipt.approval_digest === approval.approval_digest &&
    approvalReceipt.target_binding_digest === proposal.target_binding_digest &&
    approvalReceipt.operation_scope === proposal.operation_scope;
  if (!lineageMatches) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_LINEAGE_MISMATCH" });
  }
  if (Date.parse(approval.approved_at) < Date.parse(proposal.proposed_at) ||
    Date.parse(approvalReceipt.issued_at) < Date.parse(approval.approved_at) ||
    Date.parse(approval.expires_at) > Date.parse(proposal.expires_at) ||
    Date.parse(approvalReceipt.expires_at) > Date.parse(approval.expires_at)) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_LINEAGE_MISMATCH" });
  }
  if (proposal.revoked || approval.revoked) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_REVOKED" });
  }
  const clock = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: input.clock_evidence,
    persisted_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!clock.accepted) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_INVALID" });
  }
  if (clock.observed_at_epoch_ms < Date.parse(proposal.proposed_at) ||
    clock.observed_at_epoch_ms < Date.parse(approval.approved_at) ||
    clock.observed_at_epoch_ms < Date.parse(approvalReceipt.issued_at) ||
    clock.observed_at_epoch_ms >= Date.parse(proposal.expires_at) ||
    clock.observed_at_epoch_ms >= Date.parse(approval.expires_at) ||
    clock.observed_at_epoch_ms >= Date.parse(approvalReceipt.expires_at)) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_EXPIRED" });
  }
  return Object.freeze({
    accepted: true,
    lineage: Object.freeze({ proposal, approval, approval_receipt: approvalReceipt }),
  });
}

export function resolveExactFarmOsProductionTargetExecutionApproval(input: Readonly<{
  candidates: readonly unknown[];
  authority_id: string;
  authority_revision: number;
  approval_id: string;
  clock_evidence: FarmOsProductionTargetExecutionClockEvidence;
  persisted_clock_lower_bound: string | null;
}>): FarmOsProductionTargetExecutionApprovalResolution {
  if (input.authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_AUTHORITY_ID ||
    input.authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_AUTHORITY_MISMATCH" });
  }
  const matches = input.candidates.filter((candidate) =>
    isFarmOsProductionTargetExecutionRecord(candidate) &&
    candidate.authority_id === input.authority_id &&
    candidate.authority_revision === input.authority_revision &&
    candidate.approval_id === input.approval_id
  );
  if (matches.length !== 1) {
    return Object.freeze({ accepted: false, reason:
      matches.length > 1 ? "DUPLICATE_EXACT_AUTHORITY_REVISION" : "APPROVAL_UNKNOWN" });
  }
  const approval = parseApproval(matches[0]);
  if (!approval) return Object.freeze({ accepted: false, reason: "APPROVAL_SCHEMA_INVALID" });
  if (approval.approval_digest !== digestWithout(
    "farmos.production-target-execution-approval.v1",
    approval as unknown as Record<string, unknown>,
    "approval_digest",
  )) return Object.freeze({ accepted: false, reason: "APPROVAL_DIGEST_MISMATCH" });
  if (approval.revoked) return Object.freeze({ accepted: false, reason: "APPROVAL_REVOKED" });
  const clock = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: input.clock_evidence,
    persisted_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!clock.accepted) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_INVALID" });
  }
  if (clock.observed_at_epoch_ms < Date.parse(approval.approved_at) ||
    clock.observed_at_epoch_ms >= Date.parse(approval.expires_at)) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_EXPIRED" });
  }
  return Object.freeze({ accepted: true, approval });
}

function revocationEventMaterial(
  value: Omit<FarmOsProductionTargetExecutionApprovalRevocationEvent,
    "revocation_event_digest" | "revocation_event_id">,
): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

export function computeFarmOsProductionTargetExecutionApprovalRevocationEventDigest(
  value: Omit<FarmOsProductionTargetExecutionApprovalRevocationEvent,
    "revocation_event_digest" | "revocation_event_id">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-approval-revocation-event.v1",
    revocationEventMaterial(value),
  );
}

export function computeFarmOsProductionTargetExecutionApprovalRevocationEventId(
  digest: `sha256:${string}`,
): `approvalrev_${string}` {
  return `approvalrev_${digest.slice(7)}`;
}

export function computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest(
  value: Omit<FarmOsProductionTargetExecutionApprovalRevocationHead, "head_digest">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-approval-revocation-head.v1",
    value,
  );
}

export function createInitialFarmOsProductionTargetExecutionApprovalRevocationHead(
  lineage: FarmOsProductionTargetExecutionApprovalLineage,
): FarmOsProductionTargetExecutionApprovalRevocationHead {
  const base = {
    schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_HEAD_SCHEMA_VERSION,
    revocation_authority_id:
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID,
    revocation_authority_revision: 1 as const,
    approval_id: lineage.approval.approval_id,
    approval_digest: lineage.approval.approval_digest,
    approval_receipt_id: lineage.approval_receipt.approval_receipt_id,
    approval_receipt_digest: lineage.approval_receipt.approval_receipt_digest,
    target_binding_digest: lineage.approval.target_binding_digest,
    operation_scope: lineage.approval.operation_scope,
    status: "ACTIVE" as const,
    head_version: 0,
    latest_event_id: null,
    latest_event_digest: null,
    effective_revoked_at: null,
  };
  return Object.freeze({
    ...base,
    head_digest: computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest(base),
  });
}

export function parseFarmOsProductionTargetExecutionApprovalRevocationHead(
  value: unknown,
): FarmOsProductionTargetExecutionApprovalRevocationHeadAdvance {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, REVOCATION_HEAD_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_HEAD_SCHEMA_VERSION ||
    value.revocation_authority_id !==
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID ||
    value.revocation_authority_revision !== 1 ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_receipt_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_receipt_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.target_binding_digest) ||
    !validOperation(value.operation_scope) ||
    (value.status !== "ACTIVE" && value.status !== "REVOKED") ||
    !Number.isSafeInteger(value.head_version) || (value.head_version as number) < 0 ||
    !(value.latest_event_id === null ||
      (typeof value.latest_event_id === "string" && REVOCATION_EVENT_ID.test(value.latest_event_id))) ||
    !(value.latest_event_digest === null ||
      isFarmOsProductionTargetExecutionDigest(value.latest_event_digest)) ||
    !(value.effective_revoked_at === null ||
      isCanonicalFarmOsProductionTargetExecutionTimestamp(value.effective_revoked_at)) ||
    !isFarmOsProductionTargetExecutionDigest(value.head_digest)) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_HEAD_SCHEMA_INVALID" });
  }
  const activeShape = value.status === "ACTIVE" && value.head_version === 0 &&
    value.latest_event_id === null && value.latest_event_digest === null &&
    value.effective_revoked_at === null;
  const revokedShape = value.status === "REVOKED" && (value.head_version as number) >= 1 &&
    value.latest_event_id !== null && value.latest_event_digest !== null &&
    value.effective_revoked_at !== null;
  if (!activeShape && !revokedShape) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_HEAD_SCHEMA_INVALID" });
  }
  const head = value as unknown as FarmOsProductionTargetExecutionApprovalRevocationHead;
  const material = Object.fromEntries(
    Object.entries(head).filter(([key]) => key !== "head_digest"),
  ) as Omit<FarmOsProductionTargetExecutionApprovalRevocationHead, "head_digest">;
  if (head.head_digest !==
    computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest(material)) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_HEAD_DIGEST_MISMATCH" });
  }
  return Object.freeze({ accepted: true, head });
}

export function validateFarmOsProductionTargetExecutionApprovalRevocationEvent(
  input: Readonly<{
    event: unknown;
    approval: unknown;
    approval_receipt: unknown;
    clock_evidence: unknown;
    persisted_clock_lower_bound: string | null;
  }>,
): FarmOsProductionTargetExecutionApprovalRevocationEventValidation {
  const value = input.event;
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, REVOCATION_EVENT_KEYS)) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_EVENT_SCHEMA_INVALID" });
  }
  if (value.schema_version !==
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_EVENT_SCHEMA_VERSION ||
    value.revocation_authority_id !==
      FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_AUTHORITY_ID ||
    value.revocation_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_AUTHORITY_MISMATCH" });
  }
  if (typeof value.revocation_event_id !== "string" ||
    !REVOCATION_EVENT_ID.test(value.revocation_event_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.revocation_event_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_digest) ||
    !isFarmOsProductionTargetExecutionIdentifier(value.approval_receipt_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.approval_receipt_digest) ||
    !isFarmOsProductionTargetExecutionDigest(value.target_binding_digest) ||
    !validOperation(value.operation_scope) ||
    !FARM_OS_PRODUCTION_TARGET_EXECUTION_APPROVAL_REVOCATION_REASONS.includes(
      value.reason as FarmOsProductionTargetExecutionApprovalRevocationReason,
    ) || !isFarmOsProductionTargetExecutionIdentifier(value.trusted_clock_evidence_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.trusted_clock_evidence_digest) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.effective_at) ||
    !Number.isSafeInteger(value.event_sequence) || (value.event_sequence as number) < 1 ||
    !(value.previous_event_digest === null ||
      isFarmOsProductionTargetExecutionDigest(value.previous_event_digest)) ||
    value.server_owned_record !== true || value.append_only !== true) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_EVENT_SCHEMA_INVALID" });
  }
  const approval = parseApproval(input.approval);
  const receipt = parseApprovalReceipt(input.approval_receipt);
  if (!approval || !receipt ||
    approval.approval_digest !== digestWithout(
      "farmos.production-target-execution-approval.v1",
      approval as unknown as Record<string, unknown>, "approval_digest",
    ) || receipt.approval_receipt_digest !== digestWithout(
      "farmos.production-target-execution-approval-receipt.v1",
      receipt as unknown as Record<string, unknown>, "approval_receipt_digest",
    ) || value.approval_id !== approval.approval_id ||
    value.approval_digest !== approval.approval_digest ||
    value.approval_receipt_id !== receipt.approval_receipt_id ||
    value.approval_receipt_digest !== receipt.approval_receipt_digest ||
    value.target_binding_digest !== approval.target_binding_digest ||
    value.target_binding_digest !== receipt.target_binding_digest ||
    value.operation_scope !== approval.operation_scope ||
    value.operation_scope !== receipt.operation_scope ||
    value.effective_at < receipt.issued_at) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_LINEAGE_MISMATCH" });
  }
  const clock = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: input.clock_evidence,
    persisted_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!clock.accepted) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_INVALID" });
  }
  if (value.trusted_clock_evidence_id !== clock.evidence.evidence_id ||
    value.trusted_clock_evidence_digest !== clock.evidence.evidence_digest ||
    value.effective_at !== clock.evidence.observed_at) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_MISMATCH" });
  }
  const event = value as unknown as FarmOsProductionTargetExecutionApprovalRevocationEvent;
  const material = Object.fromEntries(Object.entries(event).filter(([key]) =>
    key !== "revocation_event_digest" && key !== "revocation_event_id")) as
    Omit<FarmOsProductionTargetExecutionApprovalRevocationEvent,
      "revocation_event_digest" | "revocation_event_id">;
  const digest = computeFarmOsProductionTargetExecutionApprovalRevocationEventDigest(material);
  if (event.revocation_event_digest !== digest) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_EVENT_DIGEST_MISMATCH" });
  }
  if (event.revocation_event_id !==
    computeFarmOsProductionTargetExecutionApprovalRevocationEventId(digest)) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_EVENT_ID_MISMATCH" });
  }
  return Object.freeze({ accepted: true, event });
}

export function compareFarmOsProductionTargetExecutionApprovalRevocationEventIdentity(
  existing: FarmOsProductionTargetExecutionApprovalRevocationEvent,
  candidate: FarmOsProductionTargetExecutionApprovalRevocationEvent,
): "MATCH" | "REVOCATION_EVENT_CONFLICT" {
  return existing.revocation_event_id === candidate.revocation_event_id &&
    existing.revocation_event_digest === candidate.revocation_event_digest
    ? "MATCH" : "REVOCATION_EVENT_CONFLICT";
}

export function advanceFarmOsProductionTargetExecutionApprovalRevocationHead(
  input: Readonly<{
    current_head: unknown;
    expected_head_version: number;
    expected_head_digest: `sha256:${string}`;
    event: unknown;
    approval: unknown;
    approval_receipt: unknown;
    clock_evidence: unknown;
    persisted_clock_lower_bound: string | null;
  }>,
): FarmOsProductionTargetExecutionApprovalRevocationHeadAdvance {
  const parsedHead = parseFarmOsProductionTargetExecutionApprovalRevocationHead(
    input.current_head,
  );
  if (!parsedHead.accepted) return parsedHead;
  if (parsedHead.head.head_version !== input.expected_head_version ||
    parsedHead.head.head_digest !== input.expected_head_digest) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_HEAD_CAS_MISMATCH" });
  }
  if (parsedHead.head.status !== "ACTIVE") {
    return Object.freeze({ accepted: false, reason: "REVOCATION_ALREADY_EFFECTIVE" });
  }
  const parsedEvent = validateFarmOsProductionTargetExecutionApprovalRevocationEvent({
    event: input.event,
    approval: input.approval,
    approval_receipt: input.approval_receipt,
    clock_evidence: input.clock_evidence,
    persisted_clock_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!parsedEvent.accepted) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_EVENT_INVALID" });
  }
  const { head } = parsedHead;
  const event = parsedEvent.event;
  if (event.approval_id !== head.approval_id || event.approval_digest !== head.approval_digest ||
    event.approval_receipt_id !== head.approval_receipt_id ||
    event.approval_receipt_digest !== head.approval_receipt_digest ||
    event.target_binding_digest !== head.target_binding_digest ||
    event.operation_scope !== head.operation_scope) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_LINEAGE_MISMATCH" });
  }
  if (event.event_sequence !== head.head_version + 1 ||
    event.previous_event_digest !== head.latest_event_digest) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_SEQUENCE_REGRESSION" });
  }
  const nextBase = {
    ...head,
    status: "REVOKED" as const,
    head_version: event.event_sequence,
    latest_event_id: event.revocation_event_id,
    latest_event_digest: event.revocation_event_digest,
    effective_revoked_at: event.effective_at,
  };
  const material = Object.fromEntries(Object.entries(nextBase).filter(([key]) =>
    key !== "head_digest")) as Omit<
      FarmOsProductionTargetExecutionApprovalRevocationHead, "head_digest">;
  return Object.freeze({ accepted: true, head: Object.freeze({
    ...material,
    head_digest: computeFarmOsProductionTargetExecutionApprovalRevocationHeadDigest(material),
  }) });
}

export function validateFarmOsProductionTargetExecutionApprovalRevocationState(
  input: Readonly<{
    state: unknown;
    approval: unknown;
    approval_receipt: unknown;
    clock_evidence: unknown;
    persisted_clock_lower_bound: string | null;
  }>,
): FarmOsProductionTargetExecutionApprovalRevocationStateValidation {
  if (!isFarmOsProductionTargetExecutionRecord(input.state) ||
    !hasExactFarmOsProductionTargetExecutionKeys(input.state, ["head", "latest_event"])) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_STATE_SCHEMA_INVALID" });
  }
  const approval = parseApproval(input.approval);
  const receipt = parseApprovalReceipt(input.approval_receipt);
  if (!approval || !receipt || approval.approval_digest !== digestWithout(
    "farmos.production-target-execution-approval.v1",
    approval as unknown as Record<string, unknown>, "approval_digest",
  ) || receipt.approval_receipt_digest !== digestWithout(
    "farmos.production-target-execution-approval-receipt.v1",
    receipt as unknown as Record<string, unknown>, "approval_receipt_digest",
  ) || receipt.approval_id !== approval.approval_id ||
    receipt.approval_digest !== approval.approval_digest ||
    receipt.proposal_id !== approval.proposal_id ||
    receipt.proposal_digest !== approval.proposal_digest ||
    receipt.target_binding_digest !== approval.target_binding_digest ||
    receipt.operation_scope !== approval.operation_scope ||
    receipt.issued_at < approval.approved_at ||
    receipt.expires_at > approval.expires_at) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_STATE_INCOHERENT" });
  }
  const parsedHead = parseFarmOsProductionTargetExecutionApprovalRevocationHead(input.state.head);
  if (!parsedHead.accepted) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_HEAD_INVALID" });
  }
  const head = parsedHead.head;
  if (head.approval_id !== approval.approval_id ||
    head.approval_digest !== approval.approval_digest ||
    head.approval_receipt_id !== receipt.approval_receipt_id ||
    head.approval_receipt_digest !== receipt.approval_receipt_digest ||
    head.target_binding_digest !== approval.target_binding_digest ||
    head.operation_scope !== approval.operation_scope) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_STATE_INCOHERENT" });
  }
  if (head.status === "ACTIVE") {
    if (head.head_version !== 0 || head.latest_event_id !== null ||
      head.latest_event_digest !== null || head.effective_revoked_at !== null ||
      input.state.latest_event !== null) {
      return Object.freeze({ accepted: false, reason: "REVOCATION_STATE_INCOHERENT" });
    }
    return Object.freeze({ accepted: true, state: Object.freeze({ head, latest_event: null }) });
  }
  const validatedEvent = validateFarmOsProductionTargetExecutionApprovalRevocationEvent({
    event: input.state.latest_event,
    approval,
    approval_receipt: receipt,
    clock_evidence: input.clock_evidence,
    persisted_clock_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!validatedEvent.accepted) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_EVENT_INVALID" });
  }
  if (head.head_version !== validatedEvent.event.event_sequence ||
    head.latest_event_id !== validatedEvent.event.revocation_event_id ||
    head.latest_event_digest !== validatedEvent.event.revocation_event_digest ||
    head.effective_revoked_at !== validatedEvent.event.effective_at) {
    return Object.freeze({ accepted: false, reason: "REVOCATION_STATE_INCOHERENT" });
  }
  return Object.freeze({ accepted: true, state: Object.freeze({
    head, latest_event: validatedEvent.event,
  }) });
}

export function evaluateFarmOsProductionTargetExecutionApprovalUsability(
  input: Readonly<{
    approval: unknown;
    approval_receipt: unknown;
    revocation_head: unknown;
    revocation_event: unknown;
    clock_evidence: unknown;
    persisted_clock_lower_bound: string | null;
  }>,
): FarmOsProductionTargetExecutionApprovalUsability {
  const approval = parseApproval(input.approval);
  if (!approval) return Object.freeze({ status: "INVALID", reason: "APPROVAL_SCHEMA_INVALID" });
  const receipt = parseApprovalReceipt(input.approval_receipt);
  if (!receipt) {
    return Object.freeze({ status: "INVALID", reason: "APPROVAL_RECEIPT_SCHEMA_INVALID" });
  }
  const approvalDigest = digestWithout(
    "farmos.production-target-execution-approval.v1",
    approval as unknown as Record<string, unknown>, "approval_digest",
  );
  const receiptDigest = digestWithout(
    "farmos.production-target-execution-approval-receipt.v1",
    receipt as unknown as Record<string, unknown>, "approval_receipt_digest",
  );
  if (approval.approval_digest !== approvalDigest ||
    receipt.approval_receipt_digest !== receiptDigest ||
    receipt.approval_id !== approval.approval_id ||
    receipt.approval_digest !== approval.approval_digest ||
    receipt.proposal_id !== approval.proposal_id ||
    receipt.proposal_digest !== approval.proposal_digest ||
    receipt.target_binding_digest !== approval.target_binding_digest ||
    receipt.operation_scope !== approval.operation_scope ||
    receipt.issued_at < approval.approved_at || receipt.expires_at > approval.expires_at) {
    return Object.freeze({ status: "INVALID", reason: "REVOCATION_LINEAGE_MISMATCH" });
  }
  if (input.revocation_head === null || input.revocation_head === undefined) {
    return Object.freeze({ status: "INVALID", reason: "REVOCATION_HEAD_REQUIRED" });
  }
  const revocationState = validateFarmOsProductionTargetExecutionApprovalRevocationState({
    state: { head: input.revocation_head, latest_event: input.revocation_event },
    approval,
    approval_receipt: receipt,
    clock_evidence: input.clock_evidence,
    persisted_clock_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!revocationState.accepted) {
    return Object.freeze({ status: "INVALID", reason: "REVOCATION_HEAD_INVALID" });
  }
  const head = revocationState.state.head;
  if (head.approval_id !== approval.approval_id || head.approval_digest !== approval.approval_digest ||
    head.approval_receipt_id !== receipt.approval_receipt_id ||
    head.approval_receipt_digest !== receipt.approval_receipt_digest ||
    head.target_binding_digest !== approval.target_binding_digest ||
    head.operation_scope !== approval.operation_scope) {
    return Object.freeze({ status: "INVALID", reason: "REVOCATION_LINEAGE_MISMATCH" });
  }
  const clock = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: input.clock_evidence,
    persisted_lower_bound: input.persisted_clock_lower_bound,
  });
  if (!clock.accepted) {
    return Object.freeze({ status: "INVALID", reason: "CLOCK_EVIDENCE_INVALID" });
  }
  if (approval.revoked) {
    return Object.freeze({ status: "INVALID", reason: "REVOCATION_LINEAGE_MISMATCH" });
  }
  if (head.status === "REVOKED") {
    return Object.freeze({ status: "REVOKED", head,
      effective_revoked_at: head.effective_revoked_at ?? approval.approved_at });
  }
  if (clock.observed_at_epoch_ms >= Date.parse(approval.expires_at) ||
    clock.observed_at_epoch_ms >= Date.parse(receipt.expires_at)) {
    return Object.freeze({ status: "EXPIRED", head });
  }
  return Object.freeze({ status: "ACTIVE", head });
}
