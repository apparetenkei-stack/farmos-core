import { computeConfirmationTaskCandidateSnapshotHash, FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION, FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION, type ConfirmationTaskApplyRequest } from "../../src/lib/hermes/farm_os_confirmation_task_apply_contract";
import { DAY136_VALID_FIXTURES } from "./farm_os_day136_fixture";

export const DAY137_NOW = "2026-07-23T02:00:00.000Z";
export const DAY137_CANDIDATE = { ...DAY136_VALID_FIXTURES.C, status: "review_ready" as const };
export const DAY137_HERMES_CANDIDATE = {
  ...DAY137_CANDIDATE, candidate_id: "candidate-confirmation-task-hermes-day137", source_type: "hermes_candidate" as const,
  generated_by: "hermes" as const, runtime: "nous_hermes_operator" as const,
};
const scope = (candidate: typeof DAY137_CANDIDATE) => {
  const ref = candidate.payload.target_reference;
  return `${ref.source_system}:${ref.reference_type}:${ref.reference_id}:${ref.reference_version}`;
};
export const createDay137Request = (candidate = DAY137_CANDIDATE, overrides: Record<string, unknown> = {}): ConfirmationTaskApplyRequest => {
  const hash = computeConfirmationTaskCandidateSnapshotHash(candidate);
  const targetScope = scope(candidate);
  return {
    schema_version: FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION, apply_request_id: `apply-${candidate.candidate_id}`,
    candidate_id: candidate.candidate_id, candidate_schema_version: candidate.schema_version, candidate_kind: "confirmation_task",
    candidate_snapshot_hash: hash, proposal_ref: candidate.proposal_ref,
    approval_evidence: { approval_id: `approval-${candidate.candidate_id}`, candidate_id: candidate.candidate_id, decision: "approved", decided_by: "reviewer-day137", decided_at: "2026-07-23T01:00:00.000Z", expires_at: "2026-07-24T00:00:00.000Z", decision_version: 1, reviewer_capability: "review_operational_proposal", candidate_snapshot_hash: hash, reason: "Reviewed for dry-run draft creation." },
    requested_by: "actor-day137", requested_at: DAY137_NOW, runtime_context: { actor_active: true, target_scope: targetScope, current_policy_version: FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION },
    reauthorization_evidence: { actor_id: "actor-day137", actor_type: "human", capability: "apply_confirmation_task", scope: targetScope, actor_status: "active", authenticated_at: "2026-07-23T01:30:00.000Z", reauthorized_at: "2026-07-23T01:59:00.000Z", expires_at: "2026-07-23T02:10:00.000Z", policy_version: FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION, authorization_result: "authorized", temporary_exception_present: false },
    idempotency_key: `idempotency-${candidate.candidate_id}`, correlation_id: candidate.correlation_id, causation_id: candidate.candidate_id, agent_run_id: candidate.agent_run_id, dry_run: true,
    ...overrides,
  } as ConfirmationTaskApplyRequest;
};
