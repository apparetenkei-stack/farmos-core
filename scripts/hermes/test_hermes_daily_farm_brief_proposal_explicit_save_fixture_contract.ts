import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAY126_FIXTURE_SQL_PATH,
  applyHermesDay126Fixture,
  diagnoseHermesDay126FixtureReadiness,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_fixture_boundary";
import { HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, type HermesDailyFarmBriefIsolatedPostgresExecutor } from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";

const READY_AS_SCHEMA_OWNER = {
  database_matches: true, local_socket: true,
  ai_schema_owner_present: true, connection_is_ai_schema_owner: true, connection_has_ai_schema_create: false,
  runtime_role_present: true, runtime_role_non_superuser: true, runtime_role_non_bypassrls: true,
  ai_schema_present: true, records_present: true, commands_present: true, fixture_ready: false,
};
const READY_WITH_SCHEMA_CREATE = {
  ...READY_AS_SCHEMA_OWNER,
  connection_is_ai_schema_owner: false,
  connection_has_ai_schema_create: true,
};

class FakeExecutor implements HermesDailyFarmBriefIsolatedPostgresExecutor {
  calls: string[] = [];
  outputs: Array<{ ok: boolean; output: string }> = [];
  async executeSingleConnection(sql: string) { this.calls.push(sql); return this.outputs.shift() ?? { ok: false, output: "" }; }
}

export async function runDay126FixtureContractScenario() {
  let factoryCalls = 0;
  const missing = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: undefined, executorFactory: () => { factoryCalls += 1; return null; } });
  const invalid = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: "farmos_core_local", executorFactory: () => { factoryCalls += 1; return null; } });
  assert.deepEqual([missing.denial_reason, missing.transaction_call_count, invalid.denial_reason, invalid.transaction_call_count, factoryCalls], ["configuration_missing", 0, "database_target_invalid", 0, 0]);

  const uncreatedExecutor = new FakeExecutor(); uncreatedExecutor.outputs.push({ ok: true, output: JSON.stringify(READY_AS_SCHEMA_OWNER) });
  const uncreated = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => uncreatedExecutor });
  assert.equal(uncreated.state, "ready", "schema-owner bootstrap connections remain eligible regardless of their own superuser/BYPASSRLS attributes");
  assert.equal(uncreated.fixture_ready, false, "missing fixture must remain eligible for apply");

  const createAuthorityExecutor = new FakeExecutor(); createAuthorityExecutor.outputs.push({ ok: true, output: JSON.stringify(READY_WITH_SCHEMA_CREATE) });
  const createAuthority = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => createAuthorityExecutor });
  assert.equal(createAuthority.state, "ready", "explicit schema CREATE authority must satisfy preflight");

  const ownerMismatchExecutor = new FakeExecutor(); ownerMismatchExecutor.outputs.push({ ok: true, output: JSON.stringify({ ...READY_AS_SCHEMA_OWNER, fixture_ready: false }) });
  const ownerMismatch = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => ownerMismatchExecutor });
  assert.equal(ownerMismatch.state, "ready"); assert.equal(ownerMismatch.fixture_ready, false, "table owner/schema owner mismatch must not be fixture-ready");

  const noAuthorityExecutor = new FakeExecutor(); noAuthorityExecutor.outputs.push({ ok: true, output: JSON.stringify({ ...READY_AS_SCHEMA_OWNER, connection_is_ai_schema_owner: false }) });
  const noAuthority = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => noAuthorityExecutor });
  assert.equal(noAuthority.state, "denied"); assert.equal(noAuthority.denial_reason, "schema_ddl_authority_missing");

  const disabledExecutor = new FakeExecutor(); disabledExecutor.outputs.push({ ok: true, output: JSON.stringify(READY_AS_SCHEMA_OWNER) });
  const disabled = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: false, executorFactory: () => disabledExecutor });
  assert.equal(disabled.denial_reason, "explicit_apply_enable_required");
  assert.equal(disabledExecutor.calls.length, 1);

  const runtimeSuperuserExecutor = new FakeExecutor(); runtimeSuperuserExecutor.outputs.push({ ok: true, output: JSON.stringify({ ...READY_AS_SCHEMA_OWNER, runtime_role_non_superuser: false }) });
  const runtimeSuperuser = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: true, executorFactory: () => runtimeSuperuserExecutor });
  assert.equal(runtimeSuperuser.denial_reason, "runtime_role_unsafe"); assert.equal(runtimeSuperuserExecutor.calls.length, 1);

  const runtimeBypassExecutor = new FakeExecutor(); runtimeBypassExecutor.outputs.push({ ok: true, output: JSON.stringify({ ...READY_AS_SCHEMA_OWNER, runtime_role_non_bypassrls: false }) });
  const runtimeBypass = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: true, executorFactory: () => runtimeBypassExecutor });
  assert.equal(runtimeBypass.denial_reason, "runtime_role_unsafe"); assert.equal(runtimeBypassExecutor.calls.length, 1);

  const alreadyExecutor = new FakeExecutor(); alreadyExecutor.outputs.push({ ok: true, output: JSON.stringify({ ...READY_AS_SCHEMA_OWNER, fixture_ready: true }) });
  const already = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: true, executorFactory: () => alreadyExecutor });
  assert.equal(already.fixture_state, "already_ready"); assert.equal(alreadyExecutor.calls.length, 1);

  const fixtureSql = await readFile(HERMES_DAY126_FIXTURE_SQL_PATH, "utf8");
  const applyExecutor = new FakeExecutor();
  applyExecutor.outputs.push({ ok: true, output: JSON.stringify(READY_AS_SCHEMA_OWNER) }, { ok: true, output: JSON.stringify({ fixture_state: "applied", postcondition_verified: true }) });
  const applied = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: true, executorFactory: () => applyExecutor });
  assert.equal(applied.fixture_state, "applied"); assert.equal(applyExecutor.calls.length, 2);

  const failedExecutor = new FakeExecutor(); failedExecutor.outputs.push({ ok: true, output: JSON.stringify(READY_AS_SCHEMA_OWNER) }, { ok: false, output: "raw-sensitive-database-error" });
  const failed = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: true, executorFactory: () => failedExecutor });
  assert.equal(failed.fixture_state, "failed"); assert.equal(failed.denial_reason, "postcondition_failed"); assert(!JSON.stringify(failed).includes("raw-sensitive"));

  for (const output of [JSON.stringify({ fixture_state: "applied" }), JSON.stringify({ fixture_state: "applied", postcondition_verified: false }), JSON.stringify({ fixture_state: "applied", postcondition_verified: true, unknown: true }), "not-json"]) {
    const invalidReceiptExecutor = new FakeExecutor(); invalidReceiptExecutor.outputs.push({ ok: true, output: JSON.stringify(READY_AS_SCHEMA_OWNER) }, { ok: true, output });
    const invalidReceipt = await applyHermesDay126Fixture({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, applyEnabled: true, executorFactory: () => invalidReceiptExecutor });
    assert.equal(invalidReceipt.fixture_state, "failed"); assert.equal(invalidReceipt.denial_reason, "postcondition_failed");
  }

  const preflightSql = applyExecutor.calls[0];
  assert.match(preflightSql, /begin transaction read only/u);
  assert.match(preflightSql, /current_database\(\)='farmos_core_day114_test'/u);
  assert.match(preflightSql, /inet_server_addr\(\) is null/u);
  assert.match(preflightSql, /select not rolsuper from pg_catalog\.pg_roles where rolname='farmos_ai_proposal_local'/u);
  assert.match(preflightSql, /select not rolbypassrls from pg_catalog\.pg_roles where rolname='farmos_ai_proposal_local'/u);
  assert.match(preflightSql, /r\.oid=n\.nspowner/u);
  assert.match(preflightSql, /has_schema_privilege\(current_user,n\.oid,'CREATE'\)/u);
  assert.match(preflightSql, /\\if :day126_fixture_relation_present/u);
  assert.match(preflightSql, /count\(\*\)=19/u);
  assert.match(preflightSql, /contype='p'/u);
  assert.match(preflightSql, /proposal_inbox_status_check/u);
  assert.match(preflightSql, /c\.relowner=n\.nspowner/u);
  assert.match(preflightSql, /day81_core_internal_test_only_v1/u);
  assert.match(preflightSql, /has_schema_privilege\('farmos_ai_proposal_local','ai','USAGE'\)/u);
  assert.match(preflightSql, /not has_table_privilege\('farmos_ai_proposal_local','ai\.proposal_inbox','UPDATE'\)/u);
  assert.match(preflightSql, /not has_schema_privilege\('public','ai','USAGE'\)/u);
  assert.doesNotMatch(preflightSql, /knowledge\.|app\.crop_cycles|audit\.proposal_review_apply_events|audit\.set_updated_at/u);
  assert.match(fixtureSql, /begin isolation level read committed read write/u);
  assert.match(fixtureSql, /current_database\(\) <> 'farmos_core_day114_test'/u);
  assert.match(fixtureSql, /if inet_server_addr\(\) is not null/u);
  assert.match(fixtureSql, /create table if not exists ai\.proposal_inbox/u);
  assert.match(fixtureSql, /id uuid primary key default gen_random_uuid\(\)/u);
  assert.match(fixtureSql, /constraint proposal_inbox_status_check check \(status in \('pending','approved','rejected','needs_revision','applied','expired'\)\)/u);
  assert.match(fixtureSql, /constraint proposal_inbox_risk_level_check check \(risk_level in \('low','medium','high','critical'\)\)/u);
  assert.match(fixtureSql, /constraint proposal_inbox_confidence_check check \(confidence is null or \(confidence >= 0 and confidence <= 1\)\)/u);
  assert.match(fixtureSql, /r\.oid=n\.nspowner or has_schema_privilege\(current_user,n\.oid,'CREATE'\)/u);
  assert.match(fixtureSql, /c\.relowner=n\.nspowner/u);
  assert.match(fixtureSql, /grant select,insert on ai\.proposal_inbox to farmos_ai_proposal_local/u);
  assert.match(fixtureSql, /revoke update,delete,truncate on ai\.proposal_inbox from farmos_ai_proposal_local/u);
  assert.match(fixtureSql, /on conflict \(id\) do nothing/u);
  assert.match(fixtureSql, /day81_core_internal_test_only_v1/u);
  assert.match(fixtureSql, /raise exception 'postcondition|raise exception 'proposal_inbox_contract_invalid/u);
  assert.doesNotMatch(fixtureSql, /\bCREATE\s+ROLE\b|\bALTER\s+ROLE\b|\bPASSWORD\b|\bLOGIN\b/iu);
  assert.doesNotMatch(fixtureSql, /set\s+local\s+role\s+farmos_owner_local|alter\s+table\s+ai\.proposal_inbox\s+owner\s+to|alter\s+schema\s+ai\s+owner|grant\s+create\s+on\s+schema\s+ai/iu);
  assert.doesNotMatch(preflightSql, /connection_user_(?:unsafe|non_bypassrls)|connection_user_(?:superuser|bypassrls)/u);
  assert.doesNotMatch(fixtureSql, /connection_user_unsafe|rolname=current_user[^;]*rolbypassrls/iu);
  assert.doesNotMatch(fixtureSql, /knowledge\.|app\.crop_cycles|audit\.proposal_review_apply_events|audit\.set_updated_at/u);
  assert.doesNotMatch(fixtureSql, /(?:create table|grant|revoke)[^;]+(?:app\.|audit\.)/iu);
  assert.doesNotMatch(fixtureSql, /farmos_core_(?:local|production)/iu);
  assert.doesNotMatch(JSON.stringify([uncreated, createAuthority, ownerMismatch, noAuthority, runtimeSuperuser, runtimeBypass, applied]), /owner_role_name|current_user|connection_user_superuser|connection_user_bypassrls/u);
  assert.equal(applied.retry_count, 0); assert.equal(applied.production_database_connection_performed, false); assert.equal(applied.production_database_write_performed, false);

  return { result: "pass", boundary: "day126_explicit_save_fixture_contract", missing_target_connection_count: 0, invalid_target_connection_count: 0, apply_disabled_write_transaction_count: 0, fixed_target_guard: true, local_socket_guard: true, exact_proposal_inbox_contract: true, existing_roles_only: true, minimal_runtime_privileges: true, protected_fixture_rerunnable: true, raw_error_exposed: false, retry_count: 0 };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) console.log(JSON.stringify(await runDay126FixtureContractScenario()));
