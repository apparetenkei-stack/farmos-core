import assert from "node:assert/strict";

import { createHermesDailyFarmBriefProposalCandidate } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_CONFIRMATION,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV,
  runHermesDailyFarmBriefProposalExplicitSaveProduction,
  type HermesDailyFarmBriefProposalExplicitSaveProductionExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_production_adapter";
import { hermesDailyFarmBriefProposalExplicitSaveProductionApplyRequested } from "./run_hermes_daily_farm_brief_proposal_explicit_save_production";

const NOW = "2026-07-18T04:00:00.000Z";
const ID = "847ff0cc-bf5c-4be7-8230-76d914e544b5";
const admin = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "server-admin", role: "administrator", allowed_scope_keys: [], authorization_verified: true };
const general = { ...admin, role: "general_staff" };

function candidate() {
  const value = createHermesDailyFarmBriefProposalCandidate({
    value: {
      schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1",
      proposal_type: "work_log_follow_up",
      suggestion_type: "work_log_attention",
      source: { business_date: "2026-07-18", generated_at: "2026-07-18T00:00:00.000Z", version: 1, display_state: "current" },
      attention: { reason_code: "work_log_started_at_missing", reason: "作業開始日時が入力されていません。", field_label: "Controlled scope", work_type_label: "確認", work_date: null, evidence_type: "work_log" },
    },
    expectedSourceVersion: 1,
    clock: () => NOW,
  });
  assert(value);
  return value;
}

function environment(overrides: Record<string, string | undefined> = {}) {
  return {
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.enabled]: "true",
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_CONFIRMATION,
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.user]: "proposal_writer",
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.credential]: "fixture-credential",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENABLED: "true",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_HOST: "localhost",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_PORT: "5432",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_NAME: "farmos_core_proposal_review",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_USER: "review_runtime",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_PASSWORD: "fixture-review-credential",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_SSL_MODE: "disable",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_CONNECT_TIMEOUT_MS: "1000",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_STATEMENT_TIMEOUT_MS: "1000",
    HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_LOCK_TIMEOUT_MS: "500",
    ...overrides,
  };
}

function fake(input: { existing?: boolean; fail?: boolean } = {}) {
  let inserted = 0;
  let committed = false;
  let mutationPerformed = false;
  const executor: HermesDailyFarmBriefProposalExplicitSaveProductionExecutor = {
    get lastMutationCommitted() { return committed; },
    lastMutationRolledBack: input.fail === true,
    get lastMutationPerformed() { return mutationPerformed; },
    async diagnoseReadiness() { return { result: "ok", evidence: { database_matches: true, user_matches: true, transaction_read_only: true, transaction_rolled_back: true, runtime_role_safe: true, relation_present: true, select_privilege: true, insert_privilege: true, update_privilege: false, delete_privilege: false, truncate_privilege: false, schema_create_privilege: false, forbidden_relation_write_privilege: false, forbidden_schema_create_privilege: false } }; },
    async findExistingByIdempotencyKey() { return input.existing ? { id: ID, proposal_type: "work_log_follow_up", title: "existing", status: "pending" } : null; },
    async insertProposal(record) { if (input.fail) throw new Error("fixture failure"); inserted += 1; committed = true; mutationPerformed = true; return { id: record.id, proposal_type: record.proposal_type, title: record.title, status: record.status }; },
    async close() {},
  };
  return { executor, inserted: () => inserted };
}

async function run(overrides: Partial<Parameters<typeof runHermesDailyFarmBriefProposalExplicitSaveProduction>[0]> = {}, fixture = fake()) {
  return { result: await runHermesDailyFarmBriefProposalExplicitSaveProduction({ environment: environment(), actor: admin, candidate: candidate(), requestedAt: NOW, applyRequested: false, executorFactory: () => fixture.executor, ...overrides }), fixture };
}

const noGate = await run({ environment: environment({ [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.enabled]: undefined, [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.confirmation]: undefined }) });
assert.deepEqual([noGate.result.result, noGate.result.state, noGate.result.evidence.mutation_count], ["denied", "disabled", 0]);
const enabledOnly = await run({ environment: environment({ [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.confirmation]: undefined }) });
assert.equal(enabledOnly.result.state, "disabled");
const wrongConfirmation = await run({ environment: environment({ [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.confirmation]: "wrong" }) });
assert.equal(wrongConfirmation.result.state, "disabled");
assert.equal((await run({ actor: general })).result.state, "unauthorized");
assert.equal((await run({ candidate: { invalid: true } })).result.state, "invalid_candidate");
assert.equal((await run({ candidate: [candidate(), candidate()] })).result.state, "invalid_candidate");
const candidateBeforeApplyTamper = candidate();
const appliedCandidate = {
  ...candidateBeforeApplyTamper,
  preview: { ...candidateBeforeApplyTamper.preview, proposal_apply_performed: true },
};
assert.equal((await run({ candidate: appliedCandidate })).result.state, "invalid_candidate");
assert.equal((await run({ requestedAt: "2026-07-20T00:00:00.000Z" })).result.state, "invalid_candidate");
const diagnose = await run();
assert.deepEqual([diagnose.result.result, diagnose.result.state, diagnose.result.evidence.mutation_count, diagnose.fixture.inserted()], ["ready", "ready_to_apply", 0, 0]);
const savedFixture = fake(); const saved = await run({ applyRequested: true }, savedFixture);
assert.deepEqual([saved.result.result, saved.result.state, saved.result.evidence.mutation_count, savedFixture.inserted()], ["applied", "applied", 1, 1]);
const duplicate = await run({ applyRequested: true }, fake({ existing: true }));
assert.deepEqual([duplicate.result.result, duplicate.result.state, duplicate.result.evidence.mutation_count], ["already_exists", "already_applied", 0]);
const failed = await run({ applyRequested: true }, fake({ fail: true }));
assert.deepEqual([failed.result.result, failed.result.state, failed.result.evidence.rollback_performed], ["error", "rollback", true]);
for (const value of [noGate.result, diagnose.result, saved.result, duplicate.result, failed.result]) {
  assert.equal(value.evidence.proposal_apply_performed, false);
  assert.equal(value.evidence.review_post_performed, false);
  assert.equal(value.evidence.business_row_mutation_count, 0);
  assert.equal(value.evidence.retry_count, 0);
  assert.equal(value.evidence.credential_exposed, false);
  assert.equal(value.evidence.raw_identifier_exposed, false);
}
assert.equal(hermesDailyFarmBriefProposalExplicitSaveProductionApplyRequested(["node", "runner"]), false);
assert.equal(hermesDailyFarmBriefProposalExplicitSaveProductionApplyRequested(["node", "runner", "--apply"]), true);
assert.equal(hermesDailyFarmBriefProposalExplicitSaveProductionApplyRequested(["node", "runner", "--", "--apply"]), false);
console.log(JSON.stringify({ result: "pass", gate_cases: 3, one_proposal_limit: true, administrator_only: true, diagnose_mutation_count: 0, fixture_insert_count: 1, duplicate_idempotent: true, rollback: true, review_post_performed: false, proposal_apply_performed: false, business_row_mutation_count: 0, retry_count: 0, credential_exposed: false, raw_identifier_exposed: false }));
