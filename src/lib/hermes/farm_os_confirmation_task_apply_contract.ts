import { hashFarmOsContract, hasExactFarmOsKeys, isCanonicalFarmOsIso, isFarmOsDigest, isFarmOsIdentifier, isFarmOsRecord } from "./farm_os_approved_proposal_contract";
import { parseFarmOsLowRiskSafeReference, validateHermesLowRiskCandidate, type ConfirmationTaskPayload, type FarmOsLowRiskSafeReference, type HermesLowRiskCandidateEnvelope } from "./farm_os_low_risk_candidate_contract";

export const FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION = "farmos.confirmation-task-apply.v1" as const;
export const FARM_OS_CONFIRMATION_TASK_DRAFT_SCHEMA_VERSION = "farmos.confirmation-task-draft.v1" as const;
export const FARM_OS_CONFIRMATION_TASK_OPERATION_KIND = "confirmation_task_draft_apply" as const;
export const FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION = "confirmation-task-apply-policy.v1" as const;
export const FARM_OS_CONFIRMATION_TASK_REJECTION_CODES = ["unsupported_candidate_kind", "candidate_not_review_ready", "candidate_expired", "candidate_superseded", "candidate_rejected", "candidate_hash_mismatch", "approval_missing", "approval_not_approved", "approval_candidate_mismatch", "approval_hash_mismatch", "approval_expired", "reviewer_capability_invalid", "self_approval_not_allowed", "approval_authority_mismatch", "reauthorization_missing", "reauthorization_expired", "reauthorization_authority_mismatch", "actor_inactive", "capability_not_allowed", "scope_mismatch", "policy_version_stale", "audit_correlation_mismatch", "dry_run_required", "idempotency_conflict", "duplicate_apply_rejected", "task_draft_validation_failed", "business_write_attempt_detected", "external_side_effect_attempt_detected", "unknown_field"] as const;
export type ConfirmationTaskApplyRejectionCode = (typeof FARM_OS_CONFIRMATION_TASK_REJECTION_CODES)[number];

export const FARM_OS_CONFIRMATION_TASK_APPLY_REGISTRY = {
  operation_kind: FARM_OS_CONFIRMATION_TASK_OPERATION_KIND,
  source_candidate_kind: "confirmation_task",
  required_capability: "apply_confirmation_task",
  approval_required: true,
  reauthorization_required: true,
  idempotency_required: true,
  dry_run_only: true,
  business_write_allowed: false,
  external_side_effect_allowed: false,
  rollback_mode: "discard_draft",
} as const;

export type ConfirmationTaskApprovalEvidence = {
  approval_id: string; candidate_id: string; decision: "approved"; decided_by: string; decided_at: string; expires_at: string;
  decision_version: number; reviewer_capability: "review_operational_proposal"; candidate_snapshot_hash: string; reason: string;
};
export type ConfirmationTaskRuntimeContext = { actor_active: true; target_scope: string; current_policy_version: typeof FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION };
export type ConfirmationTaskReauthorizationEvidence = {
  actor_id: string; actor_type: "human"; capability: "apply_confirmation_task"; scope: string; actor_status: "active";
  authenticated_at: string; reauthorized_at: string; expires_at: string; policy_version: typeof FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION;
  authorization_result: "authorized"; temporary_exception_present: false;
};
export type ConfirmationTaskApplyRequest = {
  schema_version: typeof FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION; apply_request_id: string; candidate_id: string;
  candidate_schema_version: "farmos.low-risk-candidate.v1"; candidate_kind: "confirmation_task"; candidate_snapshot_hash: string;
  proposal_ref: FarmOsLowRiskSafeReference; approval_evidence: ConfirmationTaskApprovalEvidence; requested_by: string; requested_at: string;
  runtime_context: ConfirmationTaskRuntimeContext; reauthorization_evidence: ConfirmationTaskReauthorizationEvidence;
  idempotency_key: string; correlation_id: string; causation_id: string; agent_run_id: string; dry_run: true;
};
export type ConfirmationTaskDraft = {
  schema_version: typeof FARM_OS_CONFIRMATION_TASK_DRAFT_SCHEMA_VERSION; task_draft_id: string; source_candidate_id: string;
  task_type: "human_confirmation"; question: string; reason: string; confirmation_type: ConfirmationTaskPayload["confirmation_type"];
  target_reference: FarmOsLowRiskSafeReference; requested_by_date: string; blocking_hint: boolean; status: "draft";
  created_from_approval_id: string; created_by_actor: string; created_at: string; expires_at: string;
};
export type ConfirmationTaskApplyResult = {
  schema_version: typeof FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION; apply_request_id: string; candidate_id: string;
  result: "dry_run_ready" | "already_processed" | "rejected"; rejection_code: ConfirmationTaskApplyRejectionCode | null;
  task_draft_ref: string | null; idempotency_status: "created" | "replayed" | "rejected"; dry_run: true; audit_ref: string;
  correlation_id: string; processed_at: string; business_write_performed: false; external_side_effect_performed: false;
};
export type ConfirmationTaskApplyAuditEvidence = {
  apply_request_id: string; candidate_id: string; candidate_snapshot_hash: string; approval_id: string; approval_actor: string; request_actor: string;
  capability: string; scope: string; reauthorization_result: string; idempotency_key_hash: string; request_fingerprint: string;
  apply_result: ConfirmationTaskApplyResult["result"]; rejection_code: ConfirmationTaskApplyRejectionCode | null; task_draft_ref: string | null;
  dry_run: true; correlation_id: string; causation_id: string; processed_at: string;
  business_write_attempted: false; business_write_performed: false; external_side_effect_attempted: false; external_side_effect_performed: false;
};
export type ConfirmationTaskApplyEvolutionEvidence = {
  record_kind: "confirmation_task_apply_quality"; apply_result: ConfirmationTaskApplyResult["result"]; rejection_code: ConfirmationTaskApplyRejectionCode | null;
  idempotency_conflict: boolean; reauthorization_failure: boolean; approval_mismatch: boolean; candidate_expired: boolean;
  automatic_policy_adoption: false; automatic_skill_adoption: false; automatic_capability_expansion: false; automatic_risk_downgrade: false; automatic_production_enablement: false;
};
export type ConfirmationTaskApplyOutcome = { result: ConfirmationTaskApplyResult; task_draft: ConfirmationTaskDraft | null; audit: ConfirmationTaskApplyAuditEvidence; evolution: ConfirmationTaskApplyEvolutionEvidence };
export type ConfirmationTaskTrustedAuthority = {
  approval: ConfirmationTaskApprovalEvidence; reauthorization: ConfirmationTaskReauthorizationEvidence; runtime_context: ConfirmationTaskRuntimeContext;
  approval_actor_type: "human"; approval_source: "human_review_ledger";
};
export interface ConfirmationTaskAuthorityPort {
  getAuthority(input: { approval_id: string; candidate_id: string; actor_id: string }): Promise<ConfirmationTaskTrustedAuthority | { state: "not_found" | "unknown" }>;
}

const REQUEST_KEYS = ["schema_version", "apply_request_id", "candidate_id", "candidate_schema_version", "candidate_kind", "candidate_snapshot_hash", "proposal_ref", "approval_evidence", "requested_by", "requested_at", "runtime_context", "reauthorization_evidence", "idempotency_key", "correlation_id", "causation_id", "agent_run_id", "dry_run"] as const;
const APPROVAL_KEYS = ["approval_id", "candidate_id", "decision", "decided_by", "decided_at", "expires_at", "decision_version", "reviewer_capability", "candidate_snapshot_hash", "reason"] as const;
const RUNTIME_KEYS = ["actor_active", "target_scope", "current_policy_version"] as const;
const REAUTH_KEYS = ["actor_id", "actor_type", "capability", "scope", "actor_status", "authenticated_at", "reauthorized_at", "expires_at", "policy_version", "authorization_result", "temporary_exception_present"] as const;
const DRAFT_KEYS = ["schema_version", "task_draft_id", "source_candidate_id", "task_type", "question", "reason", "confirmation_type", "target_reference", "requested_by_date", "blocking_hint", "status", "created_from_approval_id", "created_by_actor", "created_at", "expires_at"] as const;
const safeText = (value: unknown, max = 500) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\u0000-\u001F\u007F<>]/u.test(value);
const targetScope = (candidate: HermesLowRiskCandidateEnvelope) => {
  const ref = (candidate.payload as ConfirmationTaskPayload).target_reference;
  return `${ref.source_system}:${ref.reference_type}:${ref.reference_id}:${ref.reference_version}`;
};
const proposalIdentity = (ref: unknown) => isFarmOsRecord(ref) ? `${ref.source_system}:${ref.reference_type}:${ref.reference_id}:${ref.reference_version}` : "";

export function computeConfirmationTaskCandidateSnapshotHash(candidate: HermesLowRiskCandidateEnvelope): string {
  return hashFarmOsContract({
    schema_version: candidate.schema_version, candidate_id: candidate.candidate_id, candidate_kind: candidate.candidate_kind,
    proposal_ref: candidate.proposal_ref, payload: candidate.payload, created_at: candidate.created_at, expires_at: candidate.expires_at,
    risk_level: candidate.risk_level, requested_reviewer_capability: candidate.requested_reviewer_capability, correlation_id: candidate.correlation_id,
  });
}
export function computeConfirmationTaskRequestFingerprint(request: ConfirmationTaskApplyRequest): string {
  return hashFarmOsContract({
    apply_request_id: request.apply_request_id, candidate_id: request.candidate_id, candidate_snapshot_hash: request.candidate_snapshot_hash,
    approval_id: request.approval_evidence.approval_id, actor_id: request.requested_by, operation_kind: FARM_OS_CONFIRMATION_TASK_OPERATION_KIND,
    approval_evidence: request.approval_evidence, reauthorization_evidence: request.reauthorization_evidence, runtime_context: request.runtime_context,
    scope: request.reauthorization_evidence.scope, correlation_id: request.correlation_id, causation_id: request.causation_id, agent_run_id: request.agent_run_id, requested_at: request.requested_at, dry_run: request.dry_run,
  });
}
export function parseConfirmationTaskDraft(value: unknown): ConfirmationTaskDraft | null {
  if (!isFarmOsRecord(value) || !hasExactFarmOsKeys(value, DRAFT_KEYS)) return null;
  if (value.schema_version !== FARM_OS_CONFIRMATION_TASK_DRAFT_SCHEMA_VERSION || ![value.task_draft_id, value.source_candidate_id, value.created_from_approval_id, value.created_by_actor].every(isFarmOsIdentifier)) return null;
  if (value.task_type !== "human_confirmation" || value.status !== "draft" || !safeText(value.question) || !safeText(value.reason) || !["field_condition", "planned_date", "responsible_person", "material_name", "crop_plan_assumption"].includes(String(value.confirmation_type))) return null;
  if (!parseFarmOsLowRiskSafeReference(value.target_reference) || typeof value.blocking_hint !== "boolean" || !isCanonicalFarmOsIso(value.requested_by_date) || !isCanonicalFarmOsIso(value.created_at) || !isCanonicalFarmOsIso(value.expires_at)) return null;
  return value as unknown as ConfirmationTaskDraft;
}

type StoredApply = { fingerprint: string; candidate_approval: string; result: ConfirmationTaskApplyResult; task_draft: ConfirmationTaskDraft };
export class InMemoryConfirmationTaskApplyStore {
  readonly #byKey = new Map<string, StoredApply>();
  readonly #byCandidateApproval = new Map<string, string>();
  readonly #byApproval = new Map<string, string>();
  inspect(key: string, fingerprint: string, candidateApproval: string, approvalId: string): "new" | "replay" | "conflict" | "duplicate" {
    const existing = this.#byKey.get(key);
    if (existing) return existing.fingerprint === fingerprint ? "replay" : "conflict";
    return this.#byCandidateApproval.has(candidateApproval) || this.#byApproval.has(approvalId) ? "duplicate" : "new";
  }
  read(key: string) { return this.#byKey.get(key) ?? null; }
  save(key: string, value: StoredApply, approvalId: string) { this.#byKey.set(key, value); this.#byCandidateApproval.set(value.candidate_approval, key); this.#byApproval.set(approvalId, key); }
}

function validateRequestShape(value: unknown): ConfirmationTaskApplyRejectionCode | null {
  if (isFarmOsRecord(value) && (value.business_write_attempt === true || value.task_insert_requested === true)) return "business_write_attempt_detected";
  if (isFarmOsRecord(value) && (value.external_side_effect_attempt === true || value.notification_send_requested === true)) return "external_side_effect_attempt_detected";
  if (!isFarmOsRecord(value) || !hasExactFarmOsKeys(value, REQUEST_KEYS)) return "unknown_field";
  if (value.schema_version !== FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION || ![value.apply_request_id, value.candidate_id, value.requested_by, value.idempotency_key, value.correlation_id, value.causation_id, value.agent_run_id].every(isFarmOsIdentifier)) return "unknown_field";
  if (value.candidate_schema_version !== "farmos.low-risk-candidate.v1" || value.candidate_kind !== "confirmation_task") return "unsupported_candidate_kind";
  if (!isFarmOsDigest(value.candidate_snapshot_hash) || !isCanonicalFarmOsIso(value.requested_at)) return "candidate_hash_mismatch";
  if (!parseFarmOsLowRiskSafeReference(value.proposal_ref, "proposal")) return "unknown_field";
  if (value.dry_run !== true) return "dry_run_required";
  if (!isFarmOsRecord(value.approval_evidence)) return "approval_missing";
  if (!hasExactFarmOsKeys(value.approval_evidence, APPROVAL_KEYS)) return "unknown_field";
  if (!isFarmOsRecord(value.runtime_context) || !hasExactFarmOsKeys(value.runtime_context, RUNTIME_KEYS)) return "unknown_field";
  if (!isFarmOsRecord(value.reauthorization_evidence)) return "reauthorization_missing";
  if (!hasExactFarmOsKeys(value.reauthorization_evidence, REAUTH_KEYS)) return "unknown_field";
  return null;
}
function reject(request: Partial<ConfirmationTaskApplyRequest>, code: ConfirmationTaskApplyRejectionCode, now: string, fingerprint = hashFarmOsContract({ invalid: true })): ConfirmationTaskApplyOutcome {
  const applyId = typeof request.apply_request_id === "string" ? request.apply_request_id : "apply_rejected";
  const candidateId = typeof request.candidate_id === "string" ? request.candidate_id : "candidate_rejected";
  const correlation = typeof request.correlation_id === "string" ? request.correlation_id : "correlation_rejected";
  const approval: Record<string, unknown> = isFarmOsRecord(request.approval_evidence) ? request.approval_evidence : {};
  const reauth: Record<string, unknown> = isFarmOsRecord(request.reauthorization_evidence) ? request.reauthorization_evidence : {};
  const result: ConfirmationTaskApplyResult = { schema_version: FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION, apply_request_id: applyId, candidate_id: candidateId, result: "rejected", rejection_code: code, task_draft_ref: null, idempotency_status: "rejected", dry_run: true, audit_ref: `audit_${applyId}`, correlation_id: correlation, processed_at: now, business_write_performed: false, external_side_effect_performed: false };
  const audit: ConfirmationTaskApplyAuditEvidence = { apply_request_id: applyId, candidate_id: candidateId, candidate_snapshot_hash: String(request.candidate_snapshot_hash ?? ""), approval_id: String(approval.approval_id ?? ""), approval_actor: String(approval.decided_by ?? ""), request_actor: String(request.requested_by ?? ""), capability: String(reauth.capability ?? ""), scope: String(reauth.scope ?? ""), reauthorization_result: String(reauth.authorization_result ?? "missing"), idempotency_key_hash: hashFarmOsContract({ idempotency_key: String(request.idempotency_key ?? "") }), request_fingerprint: fingerprint, apply_result: "rejected", rejection_code: code, task_draft_ref: null, dry_run: true, correlation_id: correlation, causation_id: String(request.causation_id ?? ""), processed_at: now, business_write_attempted: false, business_write_performed: false, external_side_effect_attempted: false, external_side_effect_performed: false };
  return { result, task_draft: null, audit, evolution: evolution(result) };
}
const evolution = (result: ConfirmationTaskApplyResult): ConfirmationTaskApplyEvolutionEvidence => ({ record_kind: "confirmation_task_apply_quality", apply_result: result.result, rejection_code: result.rejection_code, idempotency_conflict: result.rejection_code === "idempotency_conflict", reauthorization_failure: ["reauthorization_missing", "reauthorization_expired", "actor_inactive", "capability_not_allowed", "scope_mismatch", "policy_version_stale"].includes(String(result.rejection_code)), approval_mismatch: ["approval_candidate_mismatch", "approval_hash_mismatch"].includes(String(result.rejection_code)), candidate_expired: result.rejection_code === "candidate_expired", automatic_policy_adoption: false, automatic_skill_adoption: false, automatic_capability_expansion: false, automatic_risk_downgrade: false, automatic_production_enablement: false });

export async function applyConfirmationTaskDraftDryRun(input: { candidate: unknown; request: unknown; store: InMemoryConfirmationTaskApplyStore; authority_port: ConfirmationTaskAuthorityPort; now: string }): Promise<ConfirmationTaskApplyOutcome> {
  const request = isFarmOsRecord(input.request) ? input.request as Partial<ConfirmationTaskApplyRequest> : {};
  const shape = validateRequestShape(input.request); if (shape) return reject(request, shape, input.now);
  const typedRequest = input.request as ConfirmationTaskApplyRequest;
  if (Date.parse(typedRequest.requested_at) > Date.parse(input.now)) return reject(typedRequest, "reauthorization_expired", input.now);
  if (!isFarmOsRecord(input.candidate) || input.candidate.candidate_kind !== "confirmation_task") return reject(typedRequest, "unsupported_candidate_kind", input.now);
  if (input.candidate.status === "superseded") return reject(typedRequest, "candidate_superseded", input.now);
  if (input.candidate.status === "rejected") return reject(typedRequest, "candidate_rejected", input.now);
  if (input.candidate.status !== "review_ready") return reject(typedRequest, "candidate_not_review_ready", input.now);
  if (!isCanonicalFarmOsIso(input.now)) return reject(typedRequest, "reauthorization_expired", new Date().toISOString());
  if (isCanonicalFarmOsIso(input.candidate.expires_at) && Date.parse(input.candidate.expires_at) <= Date.parse(input.now)) return reject(typedRequest, "candidate_expired", input.now);
  const parsedCandidate = validateHermesLowRiskCandidate(input.candidate, new Date(input.now));
  if (!parsedCandidate.valid) return reject(typedRequest, "candidate_not_review_ready", input.now);
  const candidate = parsedCandidate.candidate;
  const snapshot = computeConfirmationTaskCandidateSnapshotHash(candidate);
  if (typedRequest.candidate_id !== candidate.candidate_id || typedRequest.candidate_schema_version !== candidate.schema_version || typedRequest.candidate_kind !== candidate.candidate_kind || proposalIdentity(typedRequest.proposal_ref) !== proposalIdentity(candidate.proposal_ref)) return reject(typedRequest, "approval_candidate_mismatch", input.now);
  if (typedRequest.correlation_id !== candidate.correlation_id || typedRequest.causation_id !== candidate.candidate_id || typedRequest.agent_run_id !== candidate.agent_run_id) return reject(typedRequest, "audit_correlation_mismatch", input.now);
  if (typedRequest.candidate_snapshot_hash !== snapshot) return reject(typedRequest, "candidate_hash_mismatch", input.now);
  const approval = typedRequest.approval_evidence;
  if (approval.decision !== "approved") return reject(typedRequest, "approval_not_approved", input.now);
  if (approval.candidate_id !== candidate.candidate_id) return reject(typedRequest, "approval_candidate_mismatch", input.now);
  if (approval.candidate_snapshot_hash !== snapshot) return reject(typedRequest, "approval_hash_mismatch", input.now);
  if (![approval.decided_at, approval.expires_at].every(isCanonicalFarmOsIso) || Date.parse(approval.decided_at) > Date.parse(typedRequest.requested_at) || Date.parse(approval.decided_at) > Date.parse(input.now) || Date.parse(approval.expires_at) <= Date.parse(input.now)) return reject(typedRequest, "approval_expired", input.now);
  if (approval.decided_by === "hermes" || approval.decided_by === "native_runtime") return reject(typedRequest, "self_approval_not_allowed", input.now);
  if (approval.reviewer_capability !== "review_operational_proposal" || !Number.isSafeInteger(approval.decision_version) || approval.decision_version < 1 || !safeText(approval.reason)) return reject(typedRequest, "reviewer_capability_invalid", input.now);
  if (approval.decided_by === typedRequest.requested_by) return reject(typedRequest, "self_approval_not_allowed", input.now);
  const reauth = typedRequest.reauthorization_evidence, scope = targetScope(candidate);
  if (reauth.authorization_result !== "authorized") return reject(typedRequest, "reauthorization_missing", input.now);
  if (reauth.actor_type !== "human" || reauth.actor_status !== "active" || typedRequest.runtime_context.actor_active !== true) return reject(typedRequest, "actor_inactive", input.now);
  if (reauth.actor_id !== typedRequest.requested_by || reauth.capability !== FARM_OS_CONFIRMATION_TASK_APPLY_REGISTRY.required_capability || reauth.temporary_exception_present !== false) return reject(typedRequest, "capability_not_allowed", input.now);
  if (reauth.scope !== scope || typedRequest.runtime_context.target_scope !== scope) return reject(typedRequest, "scope_mismatch", input.now);
  if (reauth.policy_version !== FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION || typedRequest.runtime_context.current_policy_version !== FARM_OS_CONFIRMATION_TASK_CURRENT_POLICY_VERSION) return reject(typedRequest, "policy_version_stale", input.now);
  if (![reauth.authenticated_at, reauth.reauthorized_at, reauth.expires_at].every(isCanonicalFarmOsIso) || Date.parse(reauth.authenticated_at) > Date.parse(reauth.reauthorized_at) || Date.parse(reauth.reauthorized_at) > Date.parse(typedRequest.requested_at) || Date.parse(reauth.reauthorized_at) > Date.parse(input.now) || Date.parse(reauth.expires_at) <= Date.parse(input.now)) return reject(typedRequest, "reauthorization_expired", input.now);
  let authority: ConfirmationTaskTrustedAuthority | { state: "not_found" | "unknown" };
  try { authority = await input.authority_port.getAuthority({ approval_id: approval.approval_id, candidate_id: candidate.candidate_id, actor_id: typedRequest.requested_by }); }
  catch { return reject(typedRequest, "approval_missing", input.now); }
  if (!("approval" in authority)) return reject(typedRequest, "approval_missing", input.now);
  if (authority.approval_actor_type !== "human" || authority.approval_source !== "human_review_ledger" || hashFarmOsContract(authority.approval) !== hashFarmOsContract(approval)) return reject(typedRequest, "approval_authority_mismatch", input.now);
  if (hashFarmOsContract(authority.reauthorization) !== hashFarmOsContract(reauth) || hashFarmOsContract(authority.runtime_context) !== hashFarmOsContract(typedRequest.runtime_context)) return reject(typedRequest, "reauthorization_authority_mismatch", input.now);
  const fingerprint = computeConfirmationTaskRequestFingerprint(typedRequest), candidateApproval = `${candidate.candidate_id}:${approval.approval_id}`;
  const idempotency = input.store.inspect(typedRequest.idempotency_key, fingerprint, candidateApproval, approval.approval_id);
  if (idempotency === "conflict") return reject(typedRequest, "idempotency_conflict", input.now, fingerprint);
  if (idempotency === "duplicate") return reject(typedRequest, "duplicate_apply_rejected", input.now, fingerprint);
  if (idempotency === "replay") {
    const existing = input.store.read(typedRequest.idempotency_key)!;
    const result = { ...existing.result, result: "already_processed" as const, idempotency_status: "replayed" as const, processed_at: input.now };
    const outcome = reject(typedRequest, "duplicate_apply_rejected", input.now, fingerprint);
    return { result: { ...result, rejection_code: null }, task_draft: existing.task_draft, audit: { ...outcome.audit, apply_result: "already_processed", rejection_code: null, task_draft_ref: existing.task_draft.task_draft_id }, evolution: evolution({ ...result, rejection_code: null }) };
  }
  const payload = candidate.payload as ConfirmationTaskPayload;
  const taskDraft: ConfirmationTaskDraft = { schema_version: FARM_OS_CONFIRMATION_TASK_DRAFT_SCHEMA_VERSION, task_draft_id: `draft_${typedRequest.apply_request_id}`, source_candidate_id: candidate.candidate_id, task_type: "human_confirmation", question: payload.question, reason: payload.reason, confirmation_type: payload.confirmation_type, target_reference: payload.target_reference, requested_by_date: payload.requested_by_date, blocking_hint: payload.blocking, status: "draft", created_from_approval_id: approval.approval_id, created_by_actor: typedRequest.requested_by, created_at: input.now, expires_at: candidate.expires_at };
  if (!parseConfirmationTaskDraft(taskDraft)) return reject(typedRequest, "task_draft_validation_failed", input.now, fingerprint);
  const result: ConfirmationTaskApplyResult = { schema_version: FARM_OS_CONFIRMATION_TASK_APPLY_SCHEMA_VERSION, apply_request_id: typedRequest.apply_request_id, candidate_id: candidate.candidate_id, result: "dry_run_ready", rejection_code: null, task_draft_ref: taskDraft.task_draft_id, idempotency_status: "created", dry_run: true, audit_ref: `audit_${typedRequest.apply_request_id}`, correlation_id: typedRequest.correlation_id, processed_at: input.now, business_write_performed: false, external_side_effect_performed: false };
  input.store.save(typedRequest.idempotency_key, { fingerprint, candidate_approval: candidateApproval, result, task_draft: taskDraft }, approval.approval_id);
  const base = reject(typedRequest, "duplicate_apply_rejected", input.now, fingerprint);
  return { result, task_draft: taskDraft, audit: { ...base.audit, apply_result: "dry_run_ready", rejection_code: null, task_draft_ref: taskDraft.task_draft_id }, evolution: evolution(result) };
}
