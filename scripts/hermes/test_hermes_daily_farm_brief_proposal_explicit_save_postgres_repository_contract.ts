import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  diagnoseHermesDay126ProposalExplicitSavePostgresReadiness,
  parseHermesDay126PersistedProposalSummary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import {
  executeHermesDailyFarmBriefProposalExplicitSave,
  prepareHermesDailyFarmBriefProposalExplicitSave,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import { createHermesDailyFarmBriefProposalCandidate } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";

const RECORD_ID = "7b48f13a-e76b-4b19-a822-f66147566074";
const EXISTING_ID = "c44bbcfd-7ec1-4c68-86f7-e67f52f86da2";

function freshCandidate() {
  const candidate = createHermesDailyFarmBriefProposalCandidate({
    value: {
      schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1",
      proposal_type: "work_log_follow_up",
      suggestion_type: "work_log_attention",
      source: { business_date: "2026-07-18", generated_at: "2026-07-18T00:00:00.000Z", version: 2, display_state: "current" },
      attention: { reason_code: "work_log_started_at_missing", reason: "作業開始日時が入力されていません。", field_label: "北側圃場", work_type_label: "収穫", work_date: null, evidence_type: "work_log" },
    },
    expectedSourceVersion: 2,
    clock: () => "2026-07-18T03:00:00.000Z",
  });
  assert(candidate);
  return candidate;
}

function record() {
  const candidate = freshCandidate();
  const preparation = prepareHermesDailyFarmBriefProposalExplicitSave({
    request: { schema_version: "hermes.daily_farm_brief.proposal_explicit_save_request.v1", candidate_id: candidate.candidate_id, duplicate_signature: candidate.duplicate_signature, confirmation: "save_for_human_review", requested_at: "2026-07-18T04:00:00.000Z" },
    actor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day126-static-admin", role: "administrator", allowed_scope_keys: [], authorization_verified: true },
    candidate,
    idFactory: () => RECORD_ID,
  });
  assert.equal(preparation.status, "ready");
  if (preparation.status !== "ready") throw new Error("fixture rejected");
  return preparation.proposal_record;
}

const READY = { database_matches: true, local_socket: true, transaction_read_only: false, relation_present: true, identity_valid: true, insert_privilege: true, update_privilege: false, delete_privilege: false, app_insert_privilege: false, audit_insert_privilege: false };

class FakeExecutor implements HermesDailyFarmBriefIsolatedPostgresExecutor {
  calls: string[] = [];
  outputs: Array<{ ok: boolean; output: string }> = [];
  async executeSingleConnection(sql: string) {
    this.calls.push(sql);
    return this.outputs.shift() ?? { ok: false, output: "" };
  }
}

export async function runDay126PostgresRepositoryContractScenario() {
  let factoryCalls = 0;
  const missing = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: undefined, executorFactory: () => { factoryCalls += 1; return null; } });
  assert.deepEqual({ state: missing.state, reason: missing.denial_reason, calls: missing.transaction_call_count }, { state: "denied", reason: "configuration_missing", calls: 0 });
  const invalid = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: "farmos_core_local", executorFactory: () => { factoryCalls += 1; return null; } });
  assert.deepEqual({ state: invalid.state, reason: invalid.denial_reason, calls: invalid.transaction_call_count }, { state: "denied", reason: "database_target_invalid", calls: 0 });
  assert.equal(factoryCalls, 0);

  for (const [field, reason] of [
    ["local_socket", "isolation_not_verified"], ["relation_present", "relation_missing"], ["identity_valid", "identity_invalid"], ["insert_privilege", "insert_privilege_missing"],
  ] as const) {
    const executor = new FakeExecutor(); executor.outputs.push({ ok: true, output: JSON.stringify({ ...READY, [field]: false }) });
    const result = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => executor });
    assert.equal(result.denial_reason, reason);
  }
  for (const [field, reason] of [["update_privilege", "update_privilege_present"], ["delete_privilege", "delete_privilege_present"], ["app_insert_privilege", "app_write_privilege_present"], ["audit_insert_privilege", "audit_write_privilege_present"]] as const) {
    const executor = new FakeExecutor(); executor.outputs.push({ ok: true, output: JSON.stringify({ ...READY, [field]: true }) });
    const result = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => executor });
    assert.equal(result.denial_reason, reason);
  }

  const executor = new FakeExecutor();
  const existingSummary = { id: RECORD_ID, proposal_type: "work_log_follow_up", title: "作業記録の確認が必要です", status: "pending" };
  executor.outputs.push(
    { ok: true, output: JSON.stringify(READY) },
    { ok: true, output: "null" },
    { ok: true, output: JSON.stringify({ summary: existingSummary, inserted: true }) },
    { ok: true, output: JSON.stringify(existingSummary) },
    { ok: true, output: JSON.stringify(existingSummary) },
    { ok: true, output: JSON.stringify({ summary: existingSummary, inserted: false }) },
    { ok: true, output: JSON.stringify({ summary: { ...existingSummary, id: EXISTING_ID }, inserted: false }) },
    { ok: true, output: JSON.stringify({ summary: { ...existingSummary, id: EXISTING_ID }, inserted: true }) },
  );
  const readiness = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => executor });
  assert.equal(readiness.state, "ready");
  if (readiness.state !== "ready") throw new Error("readiness rejected");
  const proposal = record();
  const candidate = freshCandidate();
  const execute = (id: string) => executeHermesDailyFarmBriefProposalExplicitSave({
    request: { schema_version: "hermes.daily_farm_brief.proposal_explicit_save_request.v1", candidate_id: candidate.candidate_id, duplicate_signature: candidate.duplicate_signature, confirmation: "save_for_human_review", requested_at: "2026-07-18T04:00:00.000Z" },
    actor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day126-static-admin", role: "administrator", allowed_scope_keys: [], authorization_verified: true },
    candidate,
    idFactory: () => id,
    repository: readiness.repository,
  });
  assert.equal((await execute(RECORD_ID)).status, "saved");
  assert.equal((await execute(RECORD_ID)).status, "already_saved", "same candidate and same deterministic UUID must reuse");
  assert.equal((await execute(EXISTING_ID)).status, "already_saved", "same candidate and different UUID must reuse");

  assert.equal((await readiness.repository.insertProposal(proposal)).id, RECORD_ID, "inserted=false with same ID must be accepted");
  assert.equal((await readiness.repository.insertProposal({ ...proposal, id: "0fc2d977-9608-4ac0-b0a7-6599a2a3589d" })).id, EXISTING_ID, "inserted=false with different ID must be accepted");
  await assert.rejects(() => readiness.repository.insertProposal(proposal), /day126_repository_contract_invalid/u, "inserted=true with a different summary ID must reject");

  const readinessSql = executor.calls[0];
  const findSql = executor.calls[1];
  const insertSql = executor.calls[2];
  assert.match(readinessSql, /begin isolation level read committed read write/u);
  assert.match(readinessSql, /rollback;/u);
  assert.match(readinessSql, /'local_socket',inet_server_addr\(\) is null/u);
  assert.doesNotMatch(readinessSql, /to_regclass\('(?:app\.crop_cycles|audit\.proposal_review_apply_events)'\)/u);
  assert.match(readinessSql, /pg_catalog\.pg_class c join pg_catalog\.pg_namespace n/u);
  assert.match(readinessSql, /n\.nspname='app' and c\.relname='crop_cycles'/u);
  assert.match(readinessSql, /n\.nspname='audit' and c\.relname='proposal_review_apply_events'/u);
  assert.match(findSql, /begin transaction read only/u);
  assert.match(findSql, /if inet_server_addr\(\) is not null then raise exception 'isolation_not_verified'/u);
  assert.match(findSql, /prepare day126_find\(text\)/u);
  assert.match(findSql, /source_refs_json->>'idempotency_key'=\$1/u);
  assert.doesNotMatch(findSql, /where[^;]+status\s*=/iu);
  assert.match(insertSql, /pg_advisory_xact_lock\(hashtextextended/u);
  assert.match(insertSql, /if inet_server_addr\(\) is not null then raise exception 'isolation_not_verified'/u);
  assert.doesNotMatch(insertSql, /to_regclass\('(?:app\.crop_cycles|audit\.proposal_review_apply_events)'\)/u);
  assert.match(insertSql, /pg_catalog\.pg_class c join pg_catalog\.pg_namespace n/u);
  assert.match(insertSql, /prepare day126_insert\(text,jsonb\)/u);
  assert.match(insertSql, /insert into ai\.proposal_inbox/u);
  assert.doesNotMatch(insertSql, /update\s+ai\./iu);
  assert.doesNotMatch(insertSql, /delete\s+from/iu);
  assert.doesNotMatch(insertSql, /insert\s+into\s+(?:app|audit)\./iu);

  assert(parseHermesDay126PersistedProposalSummary({ id: RECORD_ID, proposal_type: "work_log_follow_up", title: "作業記録の確認が必要です", status: "pending" }));
  assert.equal(parseHermesDay126PersistedProposalSummary({ id: RECORD_ID, proposal_type: "work_log_follow_up", title: "safe", status: "pending", unknown: true }), null);
  assert.equal(parseHermesDay126PersistedProposalSummary({ id: "not-uuid", proposal_type: "work_log_follow_up", title: "safe", status: "pending" }), null);

  const inaccessibleSchemaExecutor = new FakeExecutor(); inaccessibleSchemaExecutor.outputs.push({ ok: true, output: JSON.stringify({ ...READY, app_insert_privilege: false, audit_insert_privilege: false }) });
  const inaccessibleSchemaResult = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => inaccessibleSchemaExecutor });
  assert.equal(inaccessibleSchemaResult.state, "ready", "absent relations or inaccessible schemas must evaluate write privilege as false through catalog OIDs");
  const rawErrorExecutor = new FakeExecutor(); rawErrorExecutor.outputs.push({ ok: false, output: "raw-sensitive-database-error" });
  const rawErrorResult = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, executorFactory: () => rawErrorExecutor });
  assert.equal(rawErrorResult.denial_reason, "connection_unavailable"); assert(!JSON.stringify(rawErrorResult).includes("raw-sensitive"));

  return { result: "pass", boundary: "day126_postgres_repository_contract", configuration_missing_denied_without_connection: true, production_target_denied_without_connection: true, fixed_parameterized_sql: true, advisory_transaction_lock: true, all_status_duplicate_lookup: true, update_method_present: false, delete_method_present: false, retry_count: 0 };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) console.log(JSON.stringify(await runDay126PostgresRepositoryContractScenario()));
