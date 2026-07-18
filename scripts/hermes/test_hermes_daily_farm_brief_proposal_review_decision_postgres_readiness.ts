import assert from "node:assert/strict";

import {
  diagnoseHermesDay128ReviewPostgresReadiness,
  hermesDay128ReviewReadinessSql,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_readiness";
import type { HermesDay128ReviewPostgresTransactionExecutor } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_repository";
import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";

const READY = {
  database_matches: true, local_socket: true,
  audit_schema_present: true, audit_table_present: true,
  audit_columns_valid: true, audit_foreign_key_valid: true,
  audit_decision_constraint_valid: true, uuid_function_present: true,
  runtime_role_present: true, runtime_role_safe: true, runtime_role_nologin: true,
  ai_schema_usage: true, proposal_select: true,
  update_status: true, update_reviewed_by: true, update_reviewed_at: true,
  update_review_note: true, update_updated_at: true,
  proposal_insert: false, proposal_delete: false, proposal_truncate: false,
  proposal_table_update: false, update_applied_at: false, update_applied_by: false,
  update_payload_json: false, update_source_refs_json: false,
  audit_schema_usage: true, audit_insert: true, audit_update: false,
  audit_delete: false, audit_truncate: false, app_write: false,
};

class FakeMetadataExecutor implements HermesDailyFarmBriefIsolatedPostgresExecutor {
  calls: string[] = [];
  constructor(private readonly output: { ok: boolean; output: string }) {}
  async executeSingleConnection(sql: string) { this.calls.push(sql); return this.output; }
}
const transactionExecutor: HermesDay128ReviewPostgresTransactionExecutor = {
  executeSingleConnectionTransaction: async () => ({ ok: false, committed: false }),
};

let factoryCalls = 0;
const invalid = await diagnoseHermesDay128ReviewPostgresReadiness({ databaseTarget: "production", metadataExecutorFactory: () => { factoryCalls += 1; return null; } });
assert.equal(invalid.state, "invalid_database_target");
assert.equal(invalid.transaction_call_count, 0);
assert.equal(factoryCalls, 0);

async function diagnose(evidence: unknown, transaction = transactionExecutor) {
  const executor = new FakeMetadataExecutor({ ok: true, output: JSON.stringify(evidence) });
  const result = await diagnoseHermesDay128ReviewPostgresReadiness({
    databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
    metadataExecutorFactory: () => executor,
    transactionExecutorFactory: () => transaction,
  });
  return { result, executor };
}

for (const [change, state] of [
  [{ database_matches: false }, "invalid_database_target"],
  [{ local_socket: false }, "invalid_database_target"],
  [{ audit_schema_present: false }, "schema_missing"],
  [{ audit_table_present: false }, "schema_missing"],
  [{ audit_columns_valid: false }, "schema_missing"],
  [{ audit_foreign_key_valid: false }, "schema_missing"],
  [{ audit_decision_constraint_valid: false }, "schema_missing"],
  [{ uuid_function_present: false }, "schema_missing"],
  [{ runtime_role_present: false }, "role_missing"],
  [{ runtime_role_safe: false }, "role_missing"],
  [{ runtime_role_nologin: false }, "role_missing"],
  [{ proposal_select: false }, "required_privilege_missing"],
  [{ update_status: false }, "required_privilege_missing"],
  [{ update_reviewed_by: false }, "required_privilege_missing"],
  [{ update_reviewed_at: false }, "required_privilege_missing"],
  [{ update_review_note: false }, "required_privilege_missing"],
  [{ update_updated_at: false }, "required_privilege_missing"],
  [{ audit_insert: false }, "required_privilege_missing"],
  [{ proposal_insert: true }, "forbidden_privilege_present"],
  [{ proposal_delete: true }, "forbidden_privilege_present"],
  [{ proposal_truncate: true }, "forbidden_privilege_present"],
  [{ proposal_table_update: true }, "forbidden_privilege_present"],
  [{ update_applied_at: true }, "forbidden_privilege_present"],
  [{ update_applied_by: true }, "forbidden_privilege_present"],
  [{ update_payload_json: true }, "forbidden_privilege_present"],
  [{ update_source_refs_json: true }, "forbidden_privilege_present"],
  [{ audit_update: true }, "forbidden_privilege_present"],
  [{ audit_delete: true }, "forbidden_privilege_present"],
  [{ audit_truncate: true }, "forbidden_privilege_present"],
  [{ app_write: true }, "forbidden_privilege_present"],
] as const) {
  const checked = await diagnose({ ...READY, ...change });
  assert.equal(checked.result.state, state);
  assert.equal(checked.result.database_write_performed, false);
  assert.equal(checked.result.retry_count, 0);
}

const malformed = await diagnose({ ...READY, unknown: true });
assert.equal(malformed.result.state, "unavailable");
const noTransactionAdapter = await diagnoseHermesDay128ReviewPostgresReadiness({
  databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  metadataExecutorFactory: () => new FakeMetadataExecutor({ ok: true, output: JSON.stringify(READY) }),
});
assert.equal(noTransactionAdapter.state, "unavailable");
const ready = await diagnose(READY);
assert.equal(ready.result.state, "ready");
assert(ready.result.repository);
assert.equal(ready.result.required_privileges_present, true);
assert.equal(ready.result.forbidden_privileges_absent, true);

const sql = hermesDay128ReviewReadinessSql();
assert.match(sql, /begin transaction read only/u);
assert.match(sql, /set local timezone = 'UTC'/u);
assert.match(sql, /current_database\(\)='farmos_core_day114_test'/u);
assert.match(sql, /inet_server_addr\(\) is null/u);
assert.match(sql, /gen_random_uuid\(\)/u);
assert.match(sql, /'update_status'.*has_column_privilege.*'status','UPDATE'/u);
assert.match(sql, /'audit_insert'.*has_table_privilege.*to_regclass\('audit\.proposal_review_decision_events'\).*'INSERT'/u);
assert.match(sql, /rollback;/u);
assert.doesNotMatch(sql, /insert\s+into|update\s+ai\.|delete\s+from|truncate\s+table/iu);
assert.doesNotMatch(sql, /farmos_core_(?:local|production)/iu);

const safe = JSON.stringify(ready.result);
assert(!safe.includes("raw-sensitive"));
assert(!safe.includes("credential"));
assert.equal(ready.result.production_connection_performed, false);
assert.equal(ready.result.app_database_write_privilege_present, false);

console.log(JSON.stringify({
  result: "pass",
  boundary: "day128_review_decision_postgres_readiness",
  states_verified: 7,
  exact_isolated_target: true,
  local_socket_required: true,
  read_only_transaction: true,
  exact_audit_contract: true,
  five_column_update_required: true,
  forbidden_privileges_fail_closed: true,
  app_write_forbidden: true,
  raw_error_exposed: false,
  database_write_performed: false,
  retry_count: 0,
}));
