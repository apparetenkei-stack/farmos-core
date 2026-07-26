import {
  FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
  FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
  FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
  type ProposalExecutionState,
  type ProposalExecutionVerificationRequest,
  type ProposalExecutionVerificationRepositoryPort,
  type ProposalVerificationAuthenticationPort,
  type ProposalVerificationClockPort,
  type WorkloadIdentityEvidence,
} from "../../src/lib/hermes/farm_os_proposal_execution_verification_contract";

export const DAY145B_NOW = "2026-07-26T04:00:00.000Z";
export const DAY145B_SCOPE = {
  scope_type: "exact_target",
  scope_id: "scope_field_alpha",
  target_reference: "field_alpha",
} as const;
export const DAY145B_STATE: ProposalExecutionState = {
  proposal_id: "proposal_alpha",
  proposal_version: 3,
  proposal_snapshot_hash: `sha256:${"a".repeat(64)}`,
  proposal_status: "executable",
  operation_type: "create_work_plan_draft",
  target_system: "farming_app",
  target_reference: "field_alpha",
  required_capability: "edit_work_plan",
  scope_constraints: DAY145B_SCOPE,
  correlation_id: "correlation_alpha",
  causation_id: "causation_alpha",
  proposal_expires_at: "2026-07-26T04:10:00.000Z",
  repository_state_version: "proposal_state_v3",
};
export const DAY145B_REQUEST: ProposalExecutionVerificationRequest = {
  contract_version: FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
  verification_id: "verification_alpha",
  operation_id: "operation_alpha",
  proposal_id: DAY145B_STATE.proposal_id,
  proposal_version: DAY145B_STATE.proposal_version,
  proposal_snapshot_hash: DAY145B_STATE.proposal_snapshot_hash,
  operation_type: DAY145B_STATE.operation_type,
  target_system: DAY145B_STATE.target_system,
  target_reference: DAY145B_STATE.target_reference,
  requested_capability: DAY145B_STATE.required_capability,
  requested_scope: DAY145B_SCOPE,
  fingerprint: `sha256:${"b".repeat(64)}`,
  audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  correlation_id: DAY145B_STATE.correlation_id,
  causation_id: DAY145B_STATE.causation_id,
  requested_at: DAY145B_NOW,
};
export const DAY145B_WORKLOAD: WorkloadIdentityEvidence = {
  issuer: FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
  audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  subject: FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
  token_kind: "workload",
  signing_algorithm: "EdDSA",
  issued_at: "2026-07-26T03:59:30.000Z",
  expires_at: "2026-07-26T04:00:30.000Z",
};

export const repositoryPort = (
  result:
    | { kind: "found"; state: ProposalExecutionState }
    | { kind: "not_found" }
    | { kind: "unavailable"; reason: string }
    | { kind: "unknown"; reason: string } = {
    kind: "found",
    state: DAY145B_STATE,
  },
): ProposalExecutionVerificationRepositoryPort => ({
  getCurrentProposalExecutionState: async () => structuredClone(result),
});
export const authenticationPort = (
  result:
    | { kind: "authenticated"; evidence: WorkloadIdentityEvidence }
    | { kind: "rejected"; reason: string }
    | { kind: "unavailable"; reason: string } = {
    kind: "authenticated",
    evidence: DAY145B_WORKLOAD,
  },
): ProposalVerificationAuthenticationPort => ({
  authenticate: async () => structuredClone(result),
});
export const clockPort = (
  now = DAY145B_NOW,
): ProposalVerificationClockPort => ({ now: async () => now });
