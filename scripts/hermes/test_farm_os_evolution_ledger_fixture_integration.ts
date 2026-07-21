import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { convertObservationToEvolutionLedgerCandidate, type ObservationDraft } from "../../src/lib/hermes/farm_os_evolution_ledger_candidate";

const safety = { formal_contract_created: false, production_change_requested: false, business_write_requested: false, review_decision_requested: false, proposal_apply_requested: false, external_execution_requested: false, secret_access_requested: false, automatic_adoption_requested: false } as const;
const meta = { source_runtime: "nous-hermes-observation", source_profile: "observer" as const, created_at: "2026-07-21T00:00:00Z" };
const evidence = (id: string) => [{ evidence_id: id, evidence_type: "fixture", reference: `fixture://day130.5-c/${id}`, content_hash: hash(id), observed_at: meta.created_at }];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const draft = (id: string, output_kind: ObservationDraft["output_kind"], candidate_kind: ObservationDraft["candidate_kind"]): ObservationDraft => ({ output_kind, candidate_kind, source_artifact: id, title: `${candidate_kind} fixture`, summary: `Read-only ${candidate_kind} observation.`, evidence: evidence(id), confidence: "medium", limitations: ["fixture-only", "human review required"], proposed_scope: "observer", safety });

const cases = [
  ["A", draft("a", "architecture_finding_draft", "architecture_finding")],
  ["B", draft("b", "skill_candidate_draft", "skill_candidate")],
  ["C", draft("c", "migration_readiness_draft", "migration_readiness")],
  ["D", draft("d", "observation_draft", "test_gap")],
] as const;
const results = cases.map(([id, input]) => {
  const serialized = JSON.stringify(input);
  const result = convertObservationToEvolutionLedgerCandidate(input, { ...meta, candidate_id: `fixture-${id}` });
  assert.equal(result.conversion_result, "created");
  if (result.conversion_result === "created") {
    assert.equal(result.candidate.review_state, "review_required");
    assert.equal(result.candidate.safety.automatic_adoption_requested, false);
  }
  return { test_case_id: id, input_hash: hash(serialized), output_hash: hash(JSON.stringify(result)), output_kind: input.output_kind, candidate_kind: input.candidate_kind, conversion_result: result.conversion_result, blocked_reasons: [], review_state: "review_required", safety_flags: input.safety, assertion_count: 3 };
});

const unsafe: ObservationDraft = { ...draft("e", "observation_draft", "policy_candidate"), safety: { ...safety, automatic_adoption_requested: true } };
const blocked = convertObservationToEvolutionLedgerCandidate(unsafe, { ...meta, candidate_id: "fixture-E" });
assert.equal(blocked.conversion_result, "blocked");
if (blocked.conversion_result === "blocked") assert.deepEqual(blocked.reasons, ["unsafe_request"]);
results.push({ test_case_id: "E", input_hash: hash(JSON.stringify(unsafe)), output_hash: hash(JSON.stringify(blocked)), output_kind: unsafe.output_kind, candidate_kind: unsafe.candidate_kind, conversion_result: blocked.conversion_result, blocked_reasons: blocked.conversion_result === "blocked" ? blocked.reasons : [], review_state: null, safety_flags: unsafe.safety, assertion_count: 2 });

console.log(JSON.stringify({ cases: results, policy_candidate_creation_allowed: true, policy_candidate_review_state: "review_required", policy_candidate_auto_accept: false, policy_adoption_count: 0, formal_proposal_count: 0, formal_daily_brief_count: 0, accepted_policy_count: 0, installed_skill_count: 0, migration_execution_count: 0, business_write_count: 0, review_post_count: 0, proposal_apply_count: 0, external_execution_count: 0 }));
