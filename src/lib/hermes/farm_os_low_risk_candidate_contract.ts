import type { FarmOsRiskLevel } from "./farm_os_risk_taxonomy";

export const FARM_OS_LOW_RISK_CANDIDATE_SCHEMA_VERSION = "farmos.low-risk-candidate.v1" as const;
export const FARM_OS_LOW_RISK_CANDIDATE_KINDS = ["safe_metadata", "confirmation_task", "administrative_memo", "crop_plan_review_request"] as const;
export type HermesLowRiskCandidateKind = (typeof FARM_OS_LOW_RISK_CANDIDATE_KINDS)[number];
export const FARM_OS_LOW_RISK_CANDIDATE_STATUSES = ["candidate", "validation_failed", "review_ready", "expired", "superseded", "rejected"] as const;
export type HermesLowRiskCandidateStatus = (typeof FARM_OS_LOW_RISK_CANDIDATE_STATUSES)[number];
export const FARM_OS_LOW_RISK_REJECTION_CODES = ["unsupported_candidate_kind", "unknown_payload_field", "missing_required_field", "invalid_reference", "invalid_expiry", "expiry_too_long", "risk_level_mismatch", "capability_not_allowed", "unsafe_metadata", "execution_intent_detected", "business_write_intent_detected", "arbitrary_url_rejected", "secret_like_value_rejected", "candidate_payload_too_large", "invalid_evidence_reference", "invalid_crop_plan_reference", "hermes_output_invalid", "native_fallback_failed"] as const;
export type HermesLowRiskRejectionCode = (typeof FARM_OS_LOW_RISK_REJECTION_CODES)[number];

export const FARM_OS_LOW_RISK_SOURCE_SYSTEMS = ["farm_os_core", "farming_app_read_model", "hermes_observation"] as const;
export const FARM_OS_LOW_RISK_REFERENCE_TYPES = ["proposal", "crop_plan", "field", "crop_cycle", "material", "member", "evidence", "policy"] as const;
export type FarmOsLowRiskSafeReference = {
  reference_type: (typeof FARM_OS_LOW_RISK_REFERENCE_TYPES)[number];
  reference_id: string;
  reference_version: number;
  source_system: (typeof FARM_OS_LOW_RISK_SOURCE_SYSTEMS)[number];
  observed_at: string;
};

export const FARM_OS_LOW_RISK_REVIEWER_CAPABILITIES = ["review_operational_proposal", "review_crop_plan", "review_farm_metadata", "review_administrative_memo"] as const;
type ReviewerCapability = (typeof FARM_OS_LOW_RISK_REVIEWER_CAPABILITIES)[number];
type Runtime = "native_runtime" | "nous_hermes_operator";
type Confidence = "low" | "medium" | "high";

export type SafeMetadataPayload = {
  payload_kind: "safe_metadata";
  display_title: string;
  short_summary: string;
  category: "crop_planning" | "field_condition" | "materials" | "workforce" | "general";
  priority_hint: "low" | "normal" | "high";
  tags: readonly string[];
  freshness_note: string;
  confidence_note: string;
};
export type ConfirmationTaskPayload = {
  payload_kind: "confirmation_task";
  question: string;
  reason: string;
  confirmation_type: "field_condition" | "planned_date" | "responsible_person" | "material_name" | "crop_plan_assumption";
  target_reference: FarmOsLowRiskSafeReference;
  requested_by_date: string;
  blocking: boolean;
};
export type AdministrativeMemoPayload = {
  payload_kind: "administrative_memo";
  memo_title: string;
  memo_body: string;
  audience_hint: "administrator" | "farm_manager" | "reviewers";
  sensitivity: "internal" | "manager_only" | "restricted";
  related_references: readonly FarmOsLowRiskSafeReference[];
};
export type CropPlanReviewRequestPayload = {
  payload_kind: "crop_plan_review_request";
  crop_plan_ref: FarmOsLowRiskSafeReference;
  review_purpose: string;
  review_questions: readonly string[];
  evidence_refs: readonly FarmOsLowRiskSafeReference[];
  assumptions: readonly string[];
  missing_information: readonly string[];
  risk_notes: readonly string[];
  requested_reviewer_capability: "review_crop_plan";
  requested_review_by: string;
};
export type HermesLowRiskCandidatePayload = SafeMetadataPayload | ConfirmationTaskPayload | AdministrativeMemoPayload | CropPlanReviewRequestPayload;

export type HermesLowRiskCandidateEnvelope = {
  schema_version: typeof FARM_OS_LOW_RISK_CANDIDATE_SCHEMA_VERSION;
  candidate_id: string;
  candidate_kind: HermesLowRiskCandidateKind;
  proposal_ref: FarmOsLowRiskSafeReference;
  source_type: "native" | "hermes_candidate";
  source_ref: FarmOsLowRiskSafeReference;
  created_at: string;
  expires_at: string;
  generated_by: "native_builder" | "hermes";
  runtime: Runtime;
  risk_level: Extract<FarmOsRiskLevel, "l0_read_only" | "l1_proposal_write">;
  status: HermesLowRiskCandidateStatus;
  title: string;
  summary: string;
  payload: HermesLowRiskCandidatePayload;
  evidence_refs: readonly FarmOsLowRiskSafeReference[];
  assumptions: readonly string[];
  missing_information: readonly string[];
  confidence: Confidence;
  requested_reviewer_capability: ReviewerCapability;
  correlation_id: string;
  agent_run_id: string;
  audit_ref: string;
};

export type HermesLowRiskCandidateRegistryEntry = {
  candidate_kind: HermesLowRiskCandidateKind;
  risk_level: Extract<FarmOsRiskLevel, "l1_proposal_write">;
  allowed_runtime: readonly Runtime[];
  required_capability: ReviewerCapability;
  approval_required: true;
  command_conversion_allowed: false;
  business_write_allowed: false;
  external_side_effect_allowed: false;
  expiry_policy: { maximum_hours: 168 };
  supersede_policy: "explicit_review_only";
};
export const FARM_OS_LOW_RISK_CANDIDATE_REGISTRY: Readonly<Record<HermesLowRiskCandidateKind, HermesLowRiskCandidateRegistryEntry>> = {
  safe_metadata: entry("safe_metadata", "review_farm_metadata"),
  confirmation_task: entry("confirmation_task", "review_operational_proposal"),
  administrative_memo: entry("administrative_memo", "review_administrative_memo"),
  crop_plan_review_request: entry("crop_plan_review_request", "review_crop_plan"),
};
function entry(candidate_kind: HermesLowRiskCandidateKind, required_capability: ReviewerCapability): HermesLowRiskCandidateRegistryEntry {
  return { candidate_kind, risk_level: "l1_proposal_write", allowed_runtime: ["native_runtime", "nous_hermes_operator"], required_capability, approval_required: true, command_conversion_allowed: false, business_write_allowed: false, external_side_effect_allowed: false, expiry_policy: { maximum_hours: 168 }, supersede_policy: "explicit_review_only" };
}

export type LowRiskValidation = { valid: true; candidate: HermesLowRiskCandidateEnvelope } | { valid: false; rejection_code: HermesLowRiskRejectionCode };
const ENVELOPE_KEYS = ["schema_version", "candidate_id", "candidate_kind", "proposal_ref", "source_type", "source_ref", "created_at", "expires_at", "generated_by", "runtime", "risk_level", "status", "title", "summary", "payload", "evidence_refs", "assumptions", "missing_information", "confidence", "requested_reviewer_capability", "correlation_id", "agent_run_id", "audit_ref"] as const;
const PAYLOAD_KEYS = {
  safe_metadata: ["payload_kind", "display_title", "short_summary", "category", "priority_hint", "tags", "freshness_note", "confidence_note"],
  confirmation_task: ["payload_kind", "question", "reason", "confirmation_type", "target_reference", "requested_by_date", "blocking"],
  administrative_memo: ["payload_kind", "memo_title", "memo_body", "audience_hint", "sensitivity", "related_references"],
  crop_plan_review_request: ["payload_kind", "crop_plan_ref", "review_purpose", "review_questions", "evidence_refs", "assumptions", "missing_information", "risk_notes", "requested_reviewer_capability", "requested_review_by"],
} as const;
const REFERENCE_KEYS = ["reference_type", "reference_id", "reference_version", "source_system", "observed_at"] as const;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const URL = /(?:https?:\/\/|www\.|[a-z][a-z0-9+.-]*:\/\/)/iu;
const HTML = /<\s*\/?\s*(?:script|iframe|object|embed|html|body|a)\b|javascript:/iu;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const SECRET = /(?:\b(?:password|passwd|secret)\b|service[\s_-]*role|authorization\s*:|bearer\s+[a-z0-9._-]+|database[\s_-]*url|connection[\s_-]*string|private[\s_-]*key|-----BEGIN)/iu;
const EXECUTION = /(?:\b(?:execute|run|invoke|dispatch)\b.{0,24}\b(?:command|gateway|shell|script)\b|\b(?:curl|wget|bash|sh|zsh|powershell|cmd\.exe|rm|chmod|chown|sudo|node|python)\b\s+(?:-[^\s]+\s+)?[^\s]|(?:GET|POST|PUT|PATCH|DELETE)\s+\/|実行(?:して|する|せよ)|コマンド|シェルスクリプト)/iu;
const BUSINESS_WRITE = /(?:\b(?:insert\s+into|update\s+\S+\s+set|delete\s+from|drop\s+(?:table|database)|truncate\s+(?:table\s+)?|alter\s+table)\b|(?:crop plan|inventory|task|work result|member status|field assignment|material reservation)\b.{0,32}\b(?:approve|apply|assign|reserve|finali[sz]e|update|create)\b|\b(?:approve|apply|assign|reserve|finali[sz]e|create)\b.{0,32}\b(?:crop plan|inventory|task|work result|member status|field assignment|material reservation)\b|(?:在庫(?:数量)?|作付計画|タスク|担当者|圃場割当|資材引当).{0,24}(?:更新|承認|確定|割当|引当|予約)(?:して|する|せよ)?)/iu;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const validIso = (value: unknown): value is string => typeof value === "string" && ISO.test(value) && new Date(value).toISOString() === value;
const safeText = (value: unknown, min: number, max: number) => typeof value === "string" && value.length >= min && value.length <= max && !CONTROL.test(value) && !HTML.test(value);
const safeTextArray = (value: unknown, maxItems: number, maxLength: number) => Array.isArray(value) && value.length <= maxItems && value.every((item) => safeText(item, 1, maxLength));
const unsafeTextCode = (value: unknown): HermesLowRiskRejectionCode | null => {
  const text = JSON.stringify(value);
  if (text.length > 32_000) return "candidate_payload_too_large";
  if (URL.test(text)) return "arbitrary_url_rejected";
  if (SECRET.test(text)) return "secret_like_value_rejected";
  if (EXECUTION.test(text)) return "execution_intent_detected";
  if (BUSINESS_WRITE.test(text)) return "business_write_intent_detected";
  if (HTML.test(text) || CONTROL.test(text)) return "unsafe_metadata";
  return null;
};
const enumValue = <T extends string>(value: unknown, values: readonly T[]): value is T => typeof value === "string" && values.includes(value as T);

export function parseFarmOsLowRiskSafeReference(value: unknown, expected?: FarmOsLowRiskSafeReference["reference_type"]): FarmOsLowRiskSafeReference | null {
  if (!isRecord(value) || !hasExactKeys(value, REFERENCE_KEYS)) return null;
  if (!enumValue(value.reference_type, FARM_OS_LOW_RISK_REFERENCE_TYPES) || (expected && value.reference_type !== expected)) return null;
  if (!ID.test(String(value.reference_id)) || !Number.isSafeInteger(value.reference_version) || Number(value.reference_version) < 1) return null;
  if (!enumValue(value.source_system, FARM_OS_LOW_RISK_SOURCE_SYSTEMS) || !validIso(value.observed_at)) return null;
  if (value.reference_type === "crop_plan" && value.source_system !== "farming_app_read_model") return null;
  return value as FarmOsLowRiskSafeReference;
}

function validatePayload(kind: HermesLowRiskCandidateKind, payload: unknown): HermesLowRiskRejectionCode | null {
  if (!isRecord(payload)) return "missing_required_field";
  const keys = PAYLOAD_KEYS[kind];
  if (!hasExactKeys(payload, keys)) return keys.some((key) => !Object.hasOwn(payload, key)) ? "missing_required_field" : "unknown_payload_field";
  if (payload.payload_kind !== kind) return "unsupported_candidate_kind";
  if (kind === "safe_metadata") {
    if (!safeText(payload.display_title, 1, 120) || !safeText(payload.short_summary, 1, 500) || !enumValue(payload.category, ["crop_planning", "field_condition", "materials", "workforce", "general"]) || !enumValue(payload.priority_hint, ["low", "normal", "high"]) || !safeTextArray(payload.tags, 12, 40) || !safeText(payload.freshness_note, 1, 240) || !safeText(payload.confidence_note, 1, 240)) return "unsafe_metadata";
  } else if (kind === "confirmation_task") {
    if (!safeText(payload.question, 1, 500) || !safeText(payload.reason, 1, 500) || !enumValue(payload.confirmation_type, ["field_condition", "planned_date", "responsible_person", "material_name", "crop_plan_assumption"]) || !parseFarmOsLowRiskSafeReference(payload.target_reference) || !validIso(payload.requested_by_date) || typeof payload.blocking !== "boolean") return "invalid_reference";
  } else if (kind === "administrative_memo") {
    if (!safeText(payload.memo_title, 1, 120) || !safeText(payload.memo_body, 1, 4000) || !enumValue(payload.audience_hint, ["administrator", "farm_manager", "reviewers"]) || !enumValue(payload.sensitivity, ["internal", "manager_only", "restricted"]) || !Array.isArray(payload.related_references) || payload.related_references.length > 20 || payload.related_references.some((item) => !parseFarmOsLowRiskSafeReference(item))) return payload.memo_body && String(payload.memo_body).length > 4000 ? "candidate_payload_too_large" : "invalid_reference";
  } else {
    if (!parseFarmOsLowRiskSafeReference(payload.crop_plan_ref, "crop_plan")) return "invalid_crop_plan_reference";
    if (!safeText(payload.review_purpose, 1, 500) || !safeTextArray(payload.review_questions, 12, 500) || !safeTextArray(payload.assumptions, 20, 500) || !safeTextArray(payload.missing_information, 20, 500) || !safeTextArray(payload.risk_notes, 20, 500) || !Array.isArray(payload.evidence_refs) || payload.evidence_refs.length > 20 || payload.evidence_refs.some((item) => !parseFarmOsLowRiskSafeReference(item, "evidence")) || payload.requested_reviewer_capability !== "review_crop_plan" || !validIso(payload.requested_review_by)) return "invalid_evidence_reference";
  }
  return unsafeTextCode(payload);
}

export function validateHermesLowRiskCandidate(value: unknown, now = new Date()): LowRiskValidation {
  if (!isRecord(value)) return { valid: false, rejection_code: "missing_required_field" };
  if (!hasExactKeys(value, ENVELOPE_KEYS)) return { valid: false, rejection_code: ENVELOPE_KEYS.some((key) => !Object.hasOwn(value, key)) ? "missing_required_field" : "unknown_payload_field" };
  if (value.schema_version !== FARM_OS_LOW_RISK_CANDIDATE_SCHEMA_VERSION || !enumValue(value.candidate_kind, FARM_OS_LOW_RISK_CANDIDATE_KINDS)) return { valid: false, rejection_code: "unsupported_candidate_kind" };
  const registry = FARM_OS_LOW_RISK_CANDIDATE_REGISTRY[value.candidate_kind];
  if (!isRecord(value.payload) || value.payload.payload_kind !== value.candidate_kind) return { valid: false, rejection_code: "unsupported_candidate_kind" };
  if (!ID.test(String(value.candidate_id)) || !ID.test(String(value.correlation_id)) || !ID.test(String(value.agent_run_id)) || !ID.test(String(value.audit_ref))) return { valid: false, rejection_code: "invalid_reference" };
  if (!parseFarmOsLowRiskSafeReference(value.proposal_ref, "proposal") || !parseFarmOsLowRiskSafeReference(value.source_ref)) return { valid: false, rejection_code: "invalid_reference" };
  if (!validIso(value.created_at) || !validIso(value.expires_at)) return { valid: false, rejection_code: "invalid_expiry" };
  const created = Date.parse(value.created_at), expires = Date.parse(value.expires_at);
  if (expires <= created || expires <= now.getTime()) return { valid: false, rejection_code: "invalid_expiry" };
  if (expires - created > registry.expiry_policy.maximum_hours * 3_600_000) return { valid: false, rejection_code: "expiry_too_long" };
  if (value.risk_level !== registry.risk_level) return { valid: false, rejection_code: "risk_level_mismatch" };
  if (!enumValue(value.runtime, registry.allowed_runtime) || !enumValue(value.status, FARM_OS_LOW_RISK_CANDIDATE_STATUSES) || !["candidate", "review_ready"].includes(String(value.status))) return { valid: false, rejection_code: "hermes_output_invalid" };
  if (value.requested_reviewer_capability !== registry.required_capability) return { valid: false, rejection_code: "capability_not_allowed" };
  if ((value.source_type === "native" && (value.generated_by !== "native_builder" || value.runtime !== "native_runtime")) || (value.source_type === "hermes_candidate" && (value.generated_by !== "hermes" || value.runtime !== "nous_hermes_operator"))) return { valid: false, rejection_code: "hermes_output_invalid" };
  if (!safeText(value.title, 1, 120) || !safeText(value.summary, 1, 1000) || !enumValue(value.confidence, ["low", "medium", "high"]) || !safeTextArray(value.assumptions, 20, 500) || !safeTextArray(value.missing_information, 20, 500) || !Array.isArray(value.evidence_refs) || value.evidence_refs.length > 20 || value.evidence_refs.some((item) => !parseFarmOsLowRiskSafeReference(item, "evidence"))) return { valid: false, rejection_code: "invalid_evidence_reference" };
  const unsafe = unsafeTextCode(value);
  if (unsafe) return { valid: false, rejection_code: unsafe };
  const payloadResult = validatePayload(value.candidate_kind, value.payload);
  if (payloadResult) return { valid: false, rejection_code: payloadResult };
  return { valid: true, candidate: value as unknown as HermesLowRiskCandidateEnvelope };
}

export type LowRiskCandidateAuditEvidence = {
  candidate_id: string; candidate_kind: HermesLowRiskCandidateKind; proposal_ref: string; runtime: Runtime; generated_by: "native_builder" | "hermes";
  validation_result: "valid" | "rejected"; rejection_code: HermesLowRiskRejectionCode | null; upstream_rejection_code: HermesLowRiskRejectionCode | null; risk_level: "l1_proposal_write"; correlation_id: string; agent_run_id: string;
  created_at: string; expires_at: string; evidence_count: number; assumption_count: number; missing_information_count: number; native_fallback_used: boolean;
  business_write_attempted: false; business_write_performed: false; execution_attempted: false; execution_performed: false;
};
export function createLowRiskCandidateAuditEvidence(value: unknown, result: LowRiskValidation, native_fallback_used: boolean, upstream_rejection_code: HermesLowRiskRejectionCode | null = null): LowRiskCandidateAuditEvidence | null {
  if (!isRecord(value) || !enumValue(value.candidate_kind, FARM_OS_LOW_RISK_CANDIDATE_KINDS)) return null;
  const rejectionCode = "rejection_code" in result ? result.rejection_code : null;
  return {
    candidate_id: String(value.candidate_id), candidate_kind: value.candidate_kind, proposal_ref: isRecord(value.proposal_ref) ? String(value.proposal_ref.reference_id) : "invalid",
    runtime: value.runtime === "nous_hermes_operator" ? value.runtime : "native_runtime", generated_by: value.generated_by === "hermes" ? "hermes" : "native_builder",
    validation_result: result.valid ? "valid" : "rejected", rejection_code: rejectionCode, upstream_rejection_code, risk_level: "l1_proposal_write",
    correlation_id: String(value.correlation_id), agent_run_id: String(value.agent_run_id), created_at: String(value.created_at), expires_at: String(value.expires_at),
    evidence_count: Array.isArray(value.evidence_refs) ? value.evidence_refs.length : 0, assumption_count: Array.isArray(value.assumptions) ? value.assumptions.length : 0,
    missing_information_count: Array.isArray(value.missing_information) ? value.missing_information.length : 0, native_fallback_used,
    business_write_attempted: false, business_write_performed: false, execution_attempted: false, execution_performed: false,
  };
}

export type LowRiskCandidateBuildResult = { outcome: "review_ready"; candidate: HermesLowRiskCandidateEnvelope; audit: LowRiskCandidateAuditEvidence; native_fallback_used: boolean } | { outcome: "rejected"; rejection_code: HermesLowRiskRejectionCode; audit: LowRiskCandidateAuditEvidence | null; native_fallback_used: boolean };
export function buildLowRiskCandidate(input: { hermes_output?: unknown; native_candidate: () => unknown; now?: Date }): LowRiskCandidateBuildResult {
  const now = input.now ?? new Date();
  let hermesResult: LowRiskValidation | null = null;
  if (input.hermes_output !== undefined) {
    hermesResult = validateHermesLowRiskCandidate(input.hermes_output, now);
    if (hermesResult.valid) return { outcome: "review_ready", candidate: hermesResult.candidate, audit: createLowRiskCandidateAuditEvidence(input.hermes_output, hermesResult, false)!, native_fallback_used: false };
  }
  let native: unknown;
  try { native = input.native_candidate(); } catch {
    const upstreamRejection = hermesResult && "rejection_code" in hermesResult ? hermesResult.rejection_code : null;
    const fallbackFailure: LowRiskValidation = { valid: false, rejection_code: "native_fallback_failed" };
    const audit = input.hermes_output !== undefined ? createLowRiskCandidateAuditEvidence(input.hermes_output, fallbackFailure, true, upstreamRejection) : null;
    return { outcome: "rejected", rejection_code: "native_fallback_failed", audit, native_fallback_used: true };
  }
  const result = validateHermesLowRiskCandidate(native, now);
  const upstreamRejection = hermesResult && "rejection_code" in hermesResult ? hermesResult.rejection_code : null;
  if (input.hermes_output !== undefined && isRecord(input.hermes_output) && isRecord(native)) {
    const hermesProposal = isRecord(input.hermes_output.proposal_ref) ? input.hermes_output.proposal_ref.reference_id : null;
    const nativeProposal = isRecord(native.proposal_ref) ? native.proposal_ref.reference_id : null;
    if (input.hermes_output.correlation_id !== native.correlation_id || input.hermes_output.agent_run_id !== native.agent_run_id || hermesProposal !== nativeProposal) {
      const mismatch: LowRiskValidation = { valid: false, rejection_code: "hermes_output_invalid" };
      return { outcome: "rejected", rejection_code: "native_fallback_failed", audit: createLowRiskCandidateAuditEvidence(native, mismatch, true, upstreamRejection), native_fallback_used: true };
    }
  }
  const audit = createLowRiskCandidateAuditEvidence(native, result, input.hermes_output !== undefined, upstreamRejection);
  if (result.valid) return { outcome: "review_ready", candidate: result.candidate, audit: audit!, native_fallback_used: input.hermes_output !== undefined };
  const rejectionCode = "rejection_code" in result ? result.rejection_code : "hermes_output_invalid";
  return { outcome: "rejected", rejection_code: input.hermes_output !== undefined ? "native_fallback_failed" : rejectionCode, audit, native_fallback_used: input.hermes_output !== undefined };
}

export type LowRiskEvolutionEvidence = { record_kind: "low_risk_candidate_quality"; candidate_id: string; validation_result: "valid" | "rejected"; rejection_code: HermesLowRiskRejectionCode | null; upstream_rejection_code: HermesLowRiskRejectionCode | null; native_fallback_used: boolean; automatic_policy_adoption: false; automatic_skill_adoption: false };
export function toLowRiskEvolutionEvidence(audit: LowRiskCandidateAuditEvidence): LowRiskEvolutionEvidence {
  return { record_kind: "low_risk_candidate_quality", candidate_id: audit.candidate_id, validation_result: audit.validation_result, rejection_code: audit.rejection_code, upstream_rejection_code: audit.upstream_rejection_code, native_fallback_used: audit.native_fallback_used, automatic_policy_adoption: false, automatic_skill_adoption: false };
}
