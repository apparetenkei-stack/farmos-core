import type { HermesLowRiskCandidateEnvelope } from "../../src/lib/hermes/farm_os_low_risk_candidate_contract";

const observedAt = "2026-07-23T00:00:00.000Z";
const ref = (reference_type: "proposal" | "crop_plan" | "field" | "evidence", reference_id: string) => ({
  reference_type, reference_id, reference_version: 1,
  source_system: reference_type === "crop_plan" ? "farming_app_read_model" as const : "farm_os_core" as const,
  observed_at: observedAt,
});
const base = {
  schema_version: "farmos.low-risk-candidate.v1" as const, proposal_ref: ref("proposal", "proposal-day136-1"), source_ref: ref("evidence", "source-day136-1"),
  created_at: observedAt, expires_at: "2026-07-25T00:00:00.000Z", risk_level: "l1_proposal_write" as const, status: "candidate" as const,
  evidence_refs: [ref("evidence", "evidence-day136-1")], assumptions: ["Source remains reviewable."], missing_information: ["Human confirmation is pending."],
  confidence: "medium" as const, correlation_id: "correlation-day136-1", agent_run_id: "agent-run-day136-1", audit_ref: "audit-day136-1",
};
const native = { source_type: "native" as const, generated_by: "native_builder" as const, runtime: "native_runtime" as const };
const hermes = { source_type: "hermes_candidate" as const, generated_by: "hermes" as const, runtime: "nous_hermes_operator" as const };
const envelope = (candidate_kind: HermesLowRiskCandidateEnvelope["candidate_kind"], payload: HermesLowRiskCandidateEnvelope["payload"], source: typeof native | typeof hermes, capability: HermesLowRiskCandidateEnvelope["requested_reviewer_capability"]): HermesLowRiskCandidateEnvelope => ({
  ...base, ...source, candidate_id: `candidate-${candidate_kind}-${source.generated_by}`, candidate_kind, title: `${candidate_kind} candidate`, summary: "Review-only candidate; no apply or execution is permitted.", payload, requested_reviewer_capability: capability,
});

export const DAY136_VALID_FIXTURES = {
  A: envelope("safe_metadata", { payload_kind: "safe_metadata", display_title: "Crop planning review", short_summary: "Metadata proposed for human review.", category: "crop_planning", priority_hint: "normal", tags: ["review"], freshness_note: "Observed today.", confidence_note: "Source-linked." }, native, "review_farm_metadata"),
  B: envelope("safe_metadata", { payload_kind: "safe_metadata", display_title: "Field condition", short_summary: "Hermes candidate for review.", category: "field_condition", priority_hint: "high", tags: ["field"], freshness_note: "Current observation.", confidence_note: "Medium confidence." }, hermes, "review_farm_metadata"),
  C: envelope("confirmation_task", { payload_kind: "confirmation_task", question: "Please confirm the planned date.", reason: "The source date requires human confirmation.", confirmation_type: "planned_date", target_reference: ref("field", "field-day136-1"), requested_by_date: "2026-07-24T00:00:00.000Z", blocking: true }, native, "review_operational_proposal"),
  D: envelope("administrative_memo", { payload_kind: "administrative_memo", memo_title: "Pending assumptions", memo_body: "Review the assumptions before any later approval workflow.", audience_hint: "farm_manager", sensitivity: "internal", related_references: [ref("field", "field-day136-1")] }, hermes, "review_administrative_memo"),
  E: envelope("crop_plan_review_request", { payload_kind: "crop_plan_review_request", crop_plan_ref: ref("crop_plan", "crop-plan-day136-1"), review_purpose: "Review plan assumptions without confirming the plan.", review_questions: ["Are the field assumptions current?"], evidence_refs: [ref("evidence", "crop-evidence-day136-1")], assumptions: ["Dates remain provisional."], missing_information: ["Reviewer decision."], risk_notes: ["No assignment or reservation is permitted."], requested_reviewer_capability: "review_crop_plan", requested_review_by: "2026-07-24T00:00:00.000Z" }, native, "review_crop_plan"),
  F: envelope("crop_plan_review_request", { payload_kind: "crop_plan_review_request", crop_plan_ref: ref("crop_plan", "crop-plan-day136-2"), review_purpose: "Request human review of provisional evidence.", review_questions: ["Is further evidence required?"], evidence_refs: [ref("evidence", "crop-evidence-day136-2")], assumptions: [], missing_information: ["Human review."], risk_notes: ["Candidate is not a confirmed plan."], requested_reviewer_capability: "review_crop_plan", requested_review_by: "2026-07-24T00:00:00.000Z" }, hermes, "review_crop_plan"),
};

const A = DAY136_VALID_FIXTURES.A;
export const DAY136_INVALID_FIXTURES: Record<string, unknown> = {
  H: { ...A, candidate_kind: "unknown" },
  I: { ...A, payload: { ...A.payload, unexpected: true } },
  J: { ...A, summary: "UPDATE inventory SET quantity=1" },
  K: { ...A, summary: "Run shell command now." },
  L: { ...A, summary: "Use https://untrusted.invalid endpoint." },
  M: { ...A, summary: "Authorization: Bearer example-value" },
  N: { ...A, expires_at: "2026-07-22T00:00:00.000Z" },
  O: { ...A, expires_at: "2026-08-20T00:00:00.000Z" },
  P: { ...A, risk_level: "l2_internal_apply" },
  Q: { ...DAY136_VALID_FIXTURES.E, payload: { ...DAY136_VALID_FIXTURES.E.payload, crop_plan_ref: ref("field", "wrong-kind") } },
  R: { ...A, payload: { ...A.payload, payload_kind: "administrative_memo" } },
  S: { ...DAY136_VALID_FIXTURES.D, payload: { ...DAY136_VALID_FIXTURES.D.payload, memo_body: "x".repeat(4001) } },
  T: JSON.parse(`{"schema_version":"farmos.low-risk-candidate.v1","__proto__":{"polluted":true}}`),
};
