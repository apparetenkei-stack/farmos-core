import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { diagnoseHermesDay127ProposalReviewPostgresReadiness } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_readiness";

const READY = {
  database_matches: true,
  local_socket: true,
  identity_valid: true,
  transaction_read_only: true,
  relation_present: true,
  schema_contract_valid: true,
  select_privilege: true,
  update_privilege: false,
  delete_privilege: false,
  truncate_privilege: false,
  app_insert_privilege: false,
  audit_insert_privilege: false,
  runtime_role_safe: true,
  public_access_present: false,
};

class FakeExecutor implements HermesDailyFarmBriefIsolatedPostgresExecutor {
  calls: string[] = [];
  outputs: Array<{ ok: boolean; output: string }> = [];
  async executeSingleConnection(sql: string) {
    this.calls.push(sql);
    return this.outputs.shift() ?? { ok: false, output: "" };
  }
}

async function diagnoseEvidence(value: unknown) {
  const executor = new FakeExecutor();
  executor.outputs.push({ ok: true, output: JSON.stringify(value) });
  const result = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
    databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
    executorFactory: () => executor,
  });
  return { result, executor };
}

export async function runDay127ProposalReviewPostgresReadinessBoundary() {
  let factoryCalls = 0;
  const missing = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
    databaseTarget: undefined,
    executorFactory: () => { factoryCalls += 1; return null; },
  });
  const invalid = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
    databaseTarget: "farmos_core_local",
    executorFactory: () => { factoryCalls += 1; return null; },
  });
  assert.deepEqual(
    [missing.denial_reason, missing.transaction_call_count, invalid.denial_reason, invalid.transaction_call_count, factoryCalls],
    ["configuration_missing", 0, "database_target_invalid", 0, 0],
  );

  const unavailable = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
    databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
    executorFactory: () => null,
  });
  assert.equal(unavailable.denial_reason, "connection_unavailable");
  assert.equal(unavailable.transaction_call_count, 0);

  const malformed = await diagnoseEvidence({ ...READY, unknown: true });
  assert.equal(malformed.result.state, "denied");
  assert.equal(malformed.result.denial_reason, "identity_invalid");

  for (const [field, value, reason] of [
    ["database_matches", false, "database_target_invalid"],
    ["local_socket", false, "isolation_not_verified"],
    ["identity_valid", false, "identity_invalid"],
    ["transaction_read_only", false, "transaction_not_read_only"],
    ["relation_present", false, "relation_missing"],
    ["schema_contract_valid", false, "schema_contract_invalid"],
    ["select_privilege", false, "select_privilege_missing"],
    ["update_privilege", true, "update_privilege_present"],
    ["delete_privilege", true, "delete_privilege_present"],
    ["truncate_privilege", true, "truncate_privilege_present"],
    ["app_insert_privilege", true, "app_write_privilege_present"],
    ["audit_insert_privilege", true, "audit_write_privilege_present"],
    ["runtime_role_safe", false, "runtime_role_unsafe"],
    ["public_access_present", true, "public_access_present"],
  ] as const) {
    const checked = await diagnoseEvidence({ ...READY, [field]: value });
    assert.equal(checked.result.denial_reason, reason, field);
    assert.equal(checked.result.database_write_performed, false);
    assert.equal(checked.result.retry_count, 0);
  }

  const ready = await diagnoseEvidence(READY);
  assert.equal(ready.result.state, "ready");
  assert(ready.result.repository);
  assert.equal(ready.executor.calls.length, 1);
  const sql = ready.executor.calls[0];
  assert.match(sql, /begin transaction read only/u);
  assert.match(sql, /set local timezone = 'UTC'/u);
  assert.match(sql, /set local role farmos_ai_proposal_local/u);
  assert.match(sql, /current_database\(\)='farmos_core_day114_test'/u);
  assert.match(sql, /inet_server_addr\(\) is null/u);
  assert.match(sql, /current_user='farmos_ai_proposal_local'/u);
  assert.match(sql, /current_setting\('transaction_read_only'\)='on'/u);
  assert.match(sql, /count\(\*\)>=19/u);
  assert.match(sql, /not rolsuper and not rolbypassrls/u);
  assert.match(sql, /has_schema_privilege\('public','ai','USAGE'\)/u);
  assert.match(sql, /rollback;/u);
  assert.doesNotMatch(sql, /insert\s+into|update\s+ai\.|delete\s+from|truncate\s+table/iu);
  assert.doesNotMatch(sql, /farmos_core_(?:local|production)/iu);

  const rawErrorExecutor = new FakeExecutor();
  rawErrorExecutor.outputs.push({ ok: false, output: "raw-sensitive-database-error" });
  const rawError = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
    databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
    executorFactory: () => rawErrorExecutor,
  });
  assert.equal(rawError.denial_reason, "connection_unavailable");
  assert(!JSON.stringify(rawError).includes("raw-sensitive"));
  assert.equal(rawError.retry_count, 0);

  return {
    result: "pass",
    boundary: "day127_proposal_review_postgres_readiness_boundary",
    denied_without_connection: true,
    read_only_transaction: true,
    strict_evidence: true,
    safe_error_mapping: true,
    raw_error_exposed: false,
    database_write_performed: false,
    retry_count: 0,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(JSON.stringify(await runDay127ProposalReviewPostgresReadinessBoundary()));
}
