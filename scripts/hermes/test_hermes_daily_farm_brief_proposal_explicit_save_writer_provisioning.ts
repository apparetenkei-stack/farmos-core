import assert from "node:assert/strict";

import { HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_privilege_administrator_executor";
import { HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_database_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV,
  applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning,
  diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning,
  hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid,
  parseHermesDailyFarmBriefProposalExplicitSaveWriterInspection,
  type HermesDailyFarmBriefProposalExplicitSaveWriterInspection,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning";
import { hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApplyRequested } from "./run_hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning_apply";

const admin = { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "server-admin", role: "administrator", allowed_scope_keys: [], authorization_verified: true };
const nonAdmin = { ...admin, role: "general_staff" };

function environment(overrides: Record<string, string | undefined> = {}) {
  const review = HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS;
  const privilege = HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV;
  return {
    [review.enabled]: "true", [review.host]: "localhost", [review.port]: "5432",
    [review.database]: "farmos_core_proposal_review", [review.user]: "review_runtime",
    [review.credential]: "review-credential", [review.ssl]: "disable", [review.connect]: "1000",
    [review.statement]: "5000", [review.lock]: "1000",
    [privilege.enabled]: "true", [privilege.host]: "localhost", [privilege.port]: "5432",
    [privilege.database]: "farmos_core_proposal_review", [privilege.user]: "provisioning_admin",
    [privilege.credential]: "admin-credential", [privilege.sslMode]: "disable", [privilege.connectTimeout]: "1000",
    [privilege.statementTimeout]: "5000", [privilege.lockTimeout]: "1000",
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.enabled]: "true",
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.confirmation]: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION,
    [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.credential]: "controlled-writer-credential-0123456789",
    ...overrides,
  };
}

function inspection(overrides: Partial<HermesDailyFarmBriefProposalExplicitSaveWriterInspection> = {}): HermesDailyFarmBriefProposalExplicitSaveWriterInspection {
  return {
    target_matches: true,
    administrator_safe: true,
    administrator_can_provision: true,
    schema_present: true,
    proposal_table_present: true,
    role_present: false,
    role_login: false,
    role_superuser: false,
    role_createdb: false,
    role_createrole: false,
    role_bypassrls: false,
    role_replication: false,
    role_attributes_valid: false,
    role_membership_absent: false,
    database_connect: false,
    database_create: false,
    schema_usage: false,
    schema_create: false,
    proposal_select: false,
    proposal_insert: false,
    proposal_update: false,
    proposal_delete: false,
    proposal_truncate: false,
    proposal_references: false,
    proposal_trigger: false,
    other_relation_write: false,
    audit_write: false,
    app_sales_write: false,
    object_ownership_present: false,
    ...overrides,
  };
}

const exact = inspection({
  role_present: true,
  role_login: true,
  role_attributes_valid: true,
  role_membership_absent: true,
  database_connect: true,
  schema_usage: true,
  proposal_select: true,
  proposal_insert: true,
});

function fake(input: {
  diagnose?: HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null;
  apply?: HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null;
  roleCreated?: boolean;
  committed?: boolean;
  rolledBack?: boolean;
} = {}) {
  let diagnoseCalls = 0;
  let applyCalls = 0;
  const executor: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor = {
    async diagnose() { diagnoseCalls += 1; return { inspection: input.diagnose === undefined ? inspection() : input.diagnose, rolledBack: input.rolledBack ?? true }; },
    async apply() { applyCalls += 1; return { inspection: input.apply === undefined ? exact : input.apply, roleCreated: input.roleCreated ?? true, mutationCount: input.roleCreated === false ? 0 : 5, committed: input.committed ?? true, rolledBack: input.rolledBack ?? false }; },
    async close() {},
  };
  return { executor, diagnoseCalls: () => diagnoseCalls, applyCalls: () => applyCalls };
}

async function diagnose(actorValue: unknown = admin, fixture = fake()) {
  return { result: await diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: environment(), actor: actorValue, executorFactory: () => fixture.executor }), fixture };
}

async function apply(overrides: { environment?: Record<string, string | undefined>; actor?: unknown; applyRequested?: boolean } = {}, fixture = fake()) {
  return { result: await applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning({ environment: overrides.environment ?? environment(), actor: overrides.actor ?? admin, applyRequested: overrides.applyRequested ?? true, executorFactory: () => fixture.executor }), fixture };
}

const noGate = await apply({ environment: environment({ [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.enabled]: undefined, [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.confirmation]: undefined }) });
assert.deepEqual([noGate.result.result, noGate.result.state, noGate.fixture.applyCalls()], ["denied", "disabled", 0]);
const wrongConfirmation = await apply({ environment: environment({ [HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.confirmation]: "wrong" }) });
assert.equal(wrongConfirmation.result.state, "disabled");
assert.equal((await apply({ actor: nonAdmin })).result.state, "unauthorized");

const ready = await diagnose();
assert.deepEqual([ready.result.result, ready.result.state, ready.result.evidence.rollback_performed, ready.result.evidence.database_mutation_performed], ["ready", "ready_to_apply", true, false]);
const already = await diagnose(admin, fake({ diagnose: exact }));
assert.deepEqual([already.result.result, already.result.state], ["already_applied", "already_applied"]);

for (const unsafe of [
  { proposal_update: true },
  { proposal_delete: true },
  { proposal_truncate: true },
  { schema_create: true },
  { other_relation_write: true },
  { role_superuser: true, role_attributes_valid: false },
  { role_createdb: true, role_attributes_valid: false },
  { role_createrole: true, role_attributes_valid: false },
  { role_bypassrls: true, role_attributes_valid: false },
]) {
  const denied = await diagnose(admin, fake({ diagnose: { ...exact, ...unsafe } }));
  assert.equal(denied.result.state, "writer_contract_mismatch");
  assert.equal(denied.result.evidence.database_mutation_performed, false);
}

const applied = await apply();
assert.deepEqual([applied.result.result, applied.result.state, applied.result.evidence.transaction_committed, applied.result.evidence.mutation_count], ["applied", "applied", true, 5]);
const duplicate = await apply({}, fake({ apply: exact, roleCreated: false, committed: false, rolledBack: true }));
assert.deepEqual([duplicate.result.result, duplicate.result.state, duplicate.result.evidence.database_mutation_performed], ["already_applied", "already_applied", false]);
const rollback = await apply({}, fake({ apply: null, roleCreated: false, committed: false, rolledBack: true }));
assert.deepEqual([rollback.result.result, rollback.result.state, rollback.result.evidence.rollback_performed], ["error", "rollback", true]);

assert.equal(parseHermesDailyFarmBriefProposalExplicitSaveWriterInspection({ ...exact, unknown: true }), null);
assert.equal(hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(exact), true);
assert.equal(hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid({ ...exact, proposal_references: true }), false);
assert.equal(hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApplyRequested(["node", "runner", "--apply"]), true);
assert.equal(hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningApplyRequested(["node", "runner", "--", "--apply"]), false);

for (const value of [noGate.result, ready.result, already.result, applied.result, duplicate.result, rollback.result]) {
  assert.equal(value.evidence.proposal_save_performed, false);
  assert.equal(value.evidence.review_post_performed, false);
  assert.equal(value.evidence.proposal_apply_performed, false);
  assert.equal(value.evidence.business_row_mutation_count, 0);
  assert.equal(value.evidence.retry_count, 0);
  assert.equal(value.evidence.credential_exposed, false);
  assert.equal(value.evidence.raw_identifier_exposed, false);
}

console.log(JSON.stringify({ result: "pass", boundary: "proposal_explicit_save_writer_provisioning", gate_cases: 2, administrator_only: true, diagnose_read_only: true, exact_privileges: true, unsafe_contract_cases: 9, apply_mutation_count: 5, duplicate_idempotent: true, rollback: true, proposal_save_performed: false, review_post_performed: false, proposal_apply_performed: false, retry_count: 0, credential_exposed: false, raw_identifier_exposed: false }));
