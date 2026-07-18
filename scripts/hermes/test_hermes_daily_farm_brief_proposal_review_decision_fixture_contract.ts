import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  HERMES_DAY128_FIXTURE_APPLY_SQL_PATH,
  HERMES_DAY128_FIXTURE_ROLLBACK_SQL_PATH,
  applyHermesDay128Fixture,
  diagnoseHermesDay128FixtureReadiness,
  rollbackHermesDay128Fixture,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_readiness";
import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";

const READY_TO_APPLY = {
  database_matches: true,
  local_socket: true,
  proposal_relation_present: true,
  schema_ddl_authority: true,
  role_ddl_authority: true,
  audit_table_compatible: true,
  runtime_role_safe: true,
  fixture_ready: false,
};

class FakeExecutor implements HermesDailyFarmBriefIsolatedPostgresExecutor {
  calls: string[] = [];
  constructor(readonly outputs: Array<{ ok: boolean; output: string }>) {}
  async executeSingleConnection(sql: string) {
    this.calls.push(sql);
    return this.outputs.shift() ?? { ok: false, output: "" };
  }
}

let factoryCalls = 0;
const missingApproval = await applyHermesDay128Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, approved: false, executorFactory: () => { factoryCalls += 1; return null; } });
const rollbackMissingApproval = await rollbackHermesDay128Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, approved: false, executorFactory: () => { factoryCalls += 1; return null; } });
assert.equal(missingApproval.denial_reason, "explicit_approval_required");
assert.equal(rollbackMissingApproval.denial_reason, "explicit_approval_required");
assert.equal(factoryCalls, 0, "approval must be checked before connection and fixture read");

const invalidTarget = await diagnoseHermesDay128FixtureReadiness({ databaseTarget: "farmos_core_local", executorFactory: () => { factoryCalls += 1; return null; } });
assert.equal(invalidTarget.denial_reason, "database_target_invalid");
assert.equal(factoryCalls, 0);

const preflightExecutor = new FakeExecutor([{ ok: true, output: JSON.stringify(READY_TO_APPLY) }]);
const preflight = await diagnoseHermesDay128FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => preflightExecutor });
assert.equal(preflight.state, "ready_to_apply");
assert.equal(preflight.database_write_performed, false);
assert.match(preflightExecutor.calls[0], /begin transaction read only/u);
assert.match(preflightExecutor.calls[0], /current_database\(\)='farmos_core_day114_test'/u);
assert.match(preflightExecutor.calls[0], /inet_server_addr\(\) is null/u);
assert.match(preflightExecutor.calls[0], /audit_table_compatible/u);

const alreadyExecutor = new FakeExecutor([{ ok: true, output: JSON.stringify({ ...READY_TO_APPLY, fixture_ready: true }) }]);
const already = await diagnoseHermesDay128FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => alreadyExecutor });
assert.equal(already.state, "already_ready");

for (const changed of [
  { local_socket: false },
  { schema_ddl_authority: false },
  { role_ddl_authority: false },
  { audit_table_compatible: false },
  { runtime_role_safe: false },
]) {
  const executor = new FakeExecutor([{ ok: true, output: JSON.stringify({ ...READY_TO_APPLY, ...changed }) }]);
  const result = await diagnoseHermesDay128FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => executor });
  assert.equal(result.state, "denied");
}

const applyExecutor = new FakeExecutor([
  { ok: true, output: JSON.stringify(READY_TO_APPLY) },
  { ok: true, output: JSON.stringify({ fixture_state: "applied", postcondition_verified: true, schema_created: true, table_created: true, role_created: true, privileges_configured: true }) },
]);
const applied = await applyHermesDay128Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, approved: true, executorFactory: () => applyExecutor });
assert.equal(applied.state, "applied");
assert.equal(applied.fixture_apply_performed, true);
assert.equal(applyExecutor.calls.length, 2);

const invalidReceiptExecutor = new FakeExecutor([
  { ok: true, output: JSON.stringify(READY_TO_APPLY) },
  { ok: true, output: JSON.stringify({ fixture_state: "applied", postcondition_verified: false }) },
]);
const invalidReceipt = await applyHermesDay128Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, approved: true, executorFactory: () => invalidReceiptExecutor });
assert.equal(invalidReceipt.state, "failed");
assert.equal(invalidReceipt.denial_reason, "receipt_invalid");

const rollbackExecutor = new FakeExecutor([{ ok: true, output: JSON.stringify({ fixture_state: "rolled_back", postcondition_verified: true, audit_table_preserved: true }) }]);
const rolledBack = await rollbackHermesDay128Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, approved: true, executorFactory: () => rollbackExecutor });
assert.equal(rolledBack.state, "rolled_back");
assert.equal(rolledBack.fixture_rollback_performed, true);

const applySql = await readFile(HERMES_DAY128_FIXTURE_APPLY_SQL_PATH, "utf8");
const rollbackSql = await readFile(HERMES_DAY128_FIXTURE_ROLLBACK_SQL_PATH, "utf8");
for (const marker of ["DAY128 ISOLATED FIXTURE", "EXPLICIT HUMAN APPROVAL REQUIRED", "DATABASE MUST EQUAL farmos_core_day114_test", "LOCAL SOCKET ONLY", "NO PRODUCTION TARGET"]) assert(applySql.includes(marker), `apply marker missing: ${marker}`);
assert.match(applySql, /current_database\(\) <> 'farmos_core_day114_test'/u);
assert.match(applySql, /inet_server_addr\(\) is not null/u);
assert.match(applySql, /create table if not exists audit\.proposal_review_decision_events/u);
assert.match(applySql, /references ai\.proposal_inbox\(id\).*on delete restrict/u);
assert.doesNotMatch(applySql, /on delete cascade/iu);
assert.match(applySql, /create role farmos_ai_proposal_review_local nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls/u);
assert.match(applySql, /elsif not coalesce/u, "existing role must be validated");
assert.doesNotMatch(applySql, /alter role/iu);
assert.match(applySql, /grant update\(status,reviewed_by,reviewed_at,review_note,updated_at\)/u);
assert.doesNotMatch(applySql, /grant update on ai\.proposal_inbox/iu);
assert.doesNotMatch(applySql, /grant insert on ai\.proposal_inbox/iu);
assert.match(applySql, /grant insert on audit\.proposal_review_decision_events/u);
assert.doesNotMatch(applySql, /grant (?:update|delete|truncate) on audit\.proposal_review_decision_events/iu);
assert.doesNotMatch(applySql, /grant[^;]+(?:on schema app|on app\.)/iu);
assert.doesNotMatch(applySql, /proposal_review_decision_events_day128_source_check/u, "shared Day24 contract must not be narrowed");
assert.match(applySql, /decision_note text,/u, "Day24 nullable column remains compatible");

for (const marker of ["EXPLICIT HUMAN ROLLBACK APPROVAL REQUIRED", "SHARED AUDIT EVENTS MUST NOT BE REMOVED"]) assert(rollbackSql.includes(marker), `rollback marker missing: ${marker}`);
assert.match(rollbackSql, /drop role farmos_ai_proposal_review_local/u);
assert.doesNotMatch(rollbackSql, /drop (?:table|schema)/iu);
assert.doesNotMatch(rollbackSql, /delete\s+from|truncate\s+table/iu);
assert.match(rollbackSql, /audit_table_preserved/u);

const safeResults = JSON.stringify([missingApproval, rollbackMissingApproval, preflight, applied, rolledBack]);
assert(!safeResults.includes("raw-sensitive"));
assert.equal(applied.production_connection_performed, false);
assert.equal(applied.app_database_write_performed, false);
assert.equal(applied.proposal_write_performed, false);
assert.equal(applied.retry_count, 0);

console.log(JSON.stringify({
  result: "pass",
  boundary: "day128_review_decision_fixture_contract",
  approval_before_connection: true,
  exact_isolated_target: true,
  local_socket_guard: true,
  day24_table_compatible: true,
  existing_role_fail_closed: true,
  dedicated_role_safe: true,
  five_column_update: true,
  audit_insert_only: true,
  rollback_preserves_audit: true,
  database_connection_performed: false,
  fixture_apply_performed: false,
  fixture_rollback_performed: false,
  retry_count: 0,
}));
