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
  durable_approval_sot_established: false,
  implementation_status: "SOURCE_ONLY_CONTRACT_CANDIDATE",
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
