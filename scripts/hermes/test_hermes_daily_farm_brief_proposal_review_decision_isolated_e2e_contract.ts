import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("./run_hermes_daily_farm_brief_proposal_review_decision_isolated_e2e.ts", import.meta.url),
  "utf8",
);

assert.match(source, /HERMES_DAY128_PROTECTED_PROPOSAL_ID/u);
assert.match(source, /assertReusableFixture/u);
assert.match(source, /baseline\.normal === null/u);
assert.match(source, /baseline\.rollback === null/u);
assert.match(source, /createdCount \+ reusedCount, 2/u);
assert.match(source, /baseline\.proposal_total \+ createdCount/u);
assert.match(source, /other_audit_events_fingerprint/u);
assert.match(source, /HERMES_DAY128_REVIEW_E2E_DIAGNOSTIC_ONLY/u);
assert.match(source, /result: "diagnostic_passed"/u);
assert.match(source, /completed_stage: stage/u);
assert.ok(source.indexOf("HERMES_DAY128_REVIEW_E2E_DIAGNOSTIC_ONLY") < source.indexOf("const normalCandidate"));
assert.match(source, /snapshot_core_counts/u);
assert.match(source, /snapshot_protected_state/u);
assert.match(source, /snapshot_other_proposals/u);
assert.match(source, /snapshot_other_audit_events/u);
assert.match(source, /snapshot_app_schema/u);
assert.match(source, /snapshot_normal_fixture/u);
assert.match(source, /snapshot_rollback_fixture/u);
assert.match(source, /snapshot_normal_audit/u);
assert.match(source, /snapshot_combined_contract/u);
assert.match(source, /type E2EStage/u);
assert.match(source, /baseline_snapshot_started/u);
assert.match(source, /postconditions_completed/u);
assert.match(source, /type E2EErrorClass/u);
assert.match(source, /snapshot_contract_invalid/u);
assert.match(source, /output_contract_invalid/u);
assert.match(source, /function parseSnapshot/u);
assert.match(source, /function parseProposalState/u);
assert.match(source, /!exact\(value, keys\)/u);
assert.match(source, /stderrObserved/u);
assert.match(source, /coalesce\(decision_note,''\)/u);
assert.doesNotMatch(source, /event_metadata->>'retry_count'\)::int/u);
assert.doesNotMatch(source, /event_metadata->>'proposal_apply_performed'\)::boolean/u);
assert.match(source, /app_schema_structure_fingerprint/u);
assert.match(source, /c\.relkind::text/u);
assert.doesNotMatch(source, /console\.(?:log|error)\([^)]*stderr/isu);
assert.match(source, /raw_error_exposed: false/u);
assert.match(source, /createPostgresDailyFarmBriefProposalReviewDecisionRepository/u);
assert.match(source, /prepareHermesDailyFarmBriefProposalReviewDecision/u);
assert.match(source, /failBeforeAuditInsert/u);
assert.match(source, /day128_controlled_audit_failure/u);
assert.match(source, /await session\.execute\("rollback;"\)/u);
assert.match(source, /assert\.deepEqual\(post\.rollback, pre\.rollback/u);
assert.match(source, /proposal_update_count/u);
assert.match(source, /audit_insert_count/u);
assert.match(source, /app_database_write_count: 0/u);
assert.match(source, /proposal_apply_count: 0/u);
assert.match(source, /production_connection_performed: false/u);
assert.match(source, /retry_count: 0/u);
assert.doesNotMatch(source, /delete\s+from|truncate\s+table|drop\s+(?:table|schema|role)/iu);
assert.doesNotMatch(source, /request_revision|decision:\s*"reject"/u);

console.log("Day128 isolated atomic review E2E contract tests passed");
