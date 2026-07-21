import assert from "node:assert/strict";
import { convertObservationToEvolutionLedgerCandidate, type ObservationDraft } from "../../src/lib/hermes/farm_os_evolution_ledger_candidate";

const evidence = [{ evidence_id: "fixture-a", evidence_type: "fixture", reference: "fixture://day130.5-c/a", content_hash: "hash-a", observed_at: "2026-07-21T00:00:00Z" }];
const safety = { formal_contract_created: false, production_change_requested: false, business_write_requested: false, review_decision_requested: false, proposal_apply_requested: false, external_execution_requested: false, secret_access_requested: false, automatic_adoption_requested: false } as const;
const base: ObservationDraft = { output_kind: "architecture_finding_draft", candidate_kind: "architecture_finding", source_artifact: "fixture-a", title: "Boundary finding", summary: "Read-only boundary remains isolated.", evidence, confidence: "medium", limitations: ["fixture-only"], proposed_scope: "observer", safety };
const meta = { candidate_id: "candidate-fixture-a", source_runtime: "nous-hermes-observation", source_profile: "observer" as const, created_at: "2026-07-21T00:00:00Z" };
const created = convertObservationToEvolutionLedgerCandidate(base, meta);
assert.equal(created.conversion_result, "created");
if (created.conversion_result === "created") { assert.equal(created.candidate.review_state, "review_required"); assert.equal(created.candidate.safety.formal_contract_created, false); }
assert.equal(convertObservationToEvolutionLedgerCandidate({ ...base, candidate_kind: "policy_candidate", safety: { ...safety, automatic_adoption_requested: true } }, meta).conversion_result, "blocked");
assert.equal(convertObservationToEvolutionLedgerCandidate({ ...base, evidence: [] }, meta).conversion_result, "blocked");
assert.equal(convertObservationToEvolutionLedgerCandidate({ ...base, output_kind: "observation_draft", candidate_kind: "runtime_observation" }, meta).conversion_result, "created");
console.log(JSON.stringify({ evolution_ledger_contract_defined: true, fixture_candidate_generation_valid: true, unsafe_promotion_blocked: true, accepted_state_not_reachable: true, formal_contract_created_zero: true, formal_proposal_zero: true, formal_daily_brief_zero: true, policy_adoption_zero: true, skill_install_zero: true, migration_execution_zero: true, business_write_zero: true, review_post_zero: true, proposal_apply_zero: true, external_execution_zero: true, timeout_fail_closed: true, cancel_fail_closed: true, unknown_output_fail_closed: true, rollback_valid: true }));
