export type EvolutionCandidateKind =
  | "architecture_finding"
  | "skill_candidate"
  | "policy_candidate"
  | "migration_readiness"
  | "runtime_observation"
  | "test_gap"
  | "documentation_gap";

export type EvolutionReviewState = "draft" | "review_required" | "accepted" | "rejected" | "superseded";

export type EvolutionEvidence = {
  evidence_id: string;
  evidence_type: string;
  reference: string;
  content_hash: string;
  observed_at: string;
};

export type EvolutionLedgerCandidate = {
  schema_version: "farmos.evolution.ledger.candidate.v1";
  candidate_id: string;
  candidate_kind: EvolutionCandidateKind;
  source_runtime: string;
  source_profile: "operator" | "observer";
  source_artifact: string;
  title: string;
  summary: string;
  evidence: readonly EvolutionEvidence[];
  confidence: "low" | "medium" | "high";
  limitations: readonly string[];
  proposed_scope: string;
  review_state: "draft" | "review_required";
  created_at: string;
  safety: {
    formal_contract_created: false;
    production_change_requested: false;
    business_write_requested: false;
    review_decision_requested: false;
    proposal_apply_requested: false;
    external_execution_requested: false;
    secret_access_requested: false;
    automatic_adoption_requested: false;
  };
};

export type ObservationDraft = {
  output_kind: "architecture_finding_draft" | "skill_candidate_draft" | "migration_readiness_draft" | "observation_draft";
  candidate_kind: EvolutionCandidateKind;
  source_artifact: string;
  title: string;
  summary: string;
  evidence: readonly EvolutionEvidence[];
  confidence: "low" | "medium" | "high";
  limitations: readonly string[];
  proposed_scope: string;
  safety: EvolutionLedgerCandidate["safety"];
};

export type LedgerConversion =
  | { conversion_result: "created"; ledger_candidate_created: true; candidate: EvolutionLedgerCandidate }
  | { conversion_result: "blocked"; ledger_candidate_created: false; reasons: readonly string[] };

const KINDS = new Set<EvolutionCandidateKind>([
  "architecture_finding", "skill_candidate", "policy_candidate", "migration_readiness",
  "runtime_observation", "test_gap", "documentation_gap",
]);
const OUTPUT_KINDS = new Set<ObservationDraft["output_kind"]>([
  "architecture_finding_draft", "skill_candidate_draft", "migration_readiness_draft", "observation_draft",
]);
const CAPABILITY = /^(read_fixture_context|validate_candidate|get_source_status)$/;

export function convertObservationToEvolutionLedgerCandidate(
  draft: ObservationDraft,
  metadata: { candidate_id: string; source_runtime: string; source_profile: "operator" | "observer"; created_at: string },
): LedgerConversion {
  const reasons: string[] = [];
  if (!OUTPUT_KINDS.has(draft.output_kind) || !KINDS.has(draft.candidate_kind)) reasons.push("unknown_kind");
  if (draft.source_artifact.length === 0 || draft.title.length === 0 || draft.summary.length === 0) reasons.push("required_text_missing");
  if (!draft.evidence.length) reasons.push("evidence_missing");
  if (draft.evidence.some((e) => !e.evidence_id || !e.reference || !e.content_hash || !e.observed_at)) reasons.push("invalid_evidence");
  if (draft.safety.formal_contract_created || draft.safety.production_change_requested || draft.safety.business_write_requested ||
      draft.safety.review_decision_requested || draft.safety.proposal_apply_requested || draft.safety.external_execution_requested ||
      draft.safety.secret_access_requested || draft.safety.automatic_adoption_requested) reasons.push("unsafe_request");
  if (reasons.length) return { conversion_result: "blocked", ledger_candidate_created: false, reasons };
  return {
    conversion_result: "created",
    ledger_candidate_created: true,
    candidate: {
      schema_version: "farmos.evolution.ledger.candidate.v1",
      candidate_id: metadata.candidate_id,
      candidate_kind: draft.candidate_kind,
      source_runtime: metadata.source_runtime,
      source_profile: metadata.source_profile,
      source_artifact: draft.source_artifact,
      title: draft.title,
      summary: draft.summary,
      evidence: draft.evidence,
      confidence: draft.confidence,
      limitations: draft.limitations,
      proposed_scope: draft.proposed_scope,
      review_state: "review_required",
      created_at: metadata.created_at,
      safety: {
        formal_contract_created: false, production_change_requested: false, business_write_requested: false,
        review_decision_requested: false, proposal_apply_requested: false, external_execution_requested: false,
        secret_access_requested: false, automatic_adoption_requested: false,
      },
    },
  };
}

export function isAllowedCapability(capability: string): boolean { return CAPABILITY.test(capability); }
