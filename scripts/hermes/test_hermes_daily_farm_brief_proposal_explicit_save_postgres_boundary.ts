import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV,
  HermesDailyFarmBriefProposalExplicitSavePostgresRepository,
  diagnoseHermesDay126ProposalExplicitSavePostgresReadiness,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { executeHermesDailyFarmBriefProposalExplicitSave } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import { createHermesDailyFarmBriefProposalCandidate, type HermesDailyFarmBriefProposalCandidate } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";

type Snapshot = {
  proposal_count: number;
  target_count: number;
  protected_status: string | null;
  protected_applied_at: string | null;
  protected_applied_by: string | null;
  target_status: string | null;
  target_applied_at: string | null;
  target_applied_by: string | null;
};

const UUIDS = {
  mainA: "b187567d-f730-4a68-9ec2-d97cacba1933",
  mainB: "4340024d-9a6d-4665-9e77-e6820ee54d87",
  rollback: "0a7bc289-b2e8-4e18-a487-e5a73526e3b2",
  concurrentA: "ed8193ad-59dc-42a3-b4fe-21919bc24c77",
  concurrentB: "47630931-9a75-451a-b8ef-f6cd77859890",
  differentA: "96bd0084-43a0-40df-9d56-7caa9c8279d0",
  differentB: "5a0c6bcb-6e77-4a2a-8713-294821e24191",
} as const;

function executor(): HermesDailyFarmBriefIsolatedPostgresExecutor {
  const value = createHermesDailyFarmBriefDockerPostgresExecutor(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  assert(value);
  return value;
}

function candidate(field: string, reason: "work_log_started_at_missing" | "work_log_started_at_invalid" = "work_log_started_at_missing") {
  const value = createHermesDailyFarmBriefProposalCandidate({
    value: {
      schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1", proposal_type: "work_log_follow_up", suggestion_type: "work_log_attention",
      source: { business_date: "2026-07-18", generated_at: "2026-07-18T00:00:00.000Z", version: 2, display_state: "current" },
      attention: { reason_code: reason, reason: reason === "work_log_started_at_missing" ? "作業開始日時が入力されていません。" : "作業開始日時の形式を確認してください。", field_label: field, work_type_label: "収穫", work_date: null, evidence_type: "work_log" },
    }, expectedSourceVersion: 2, clock: () => "2026-07-18T03:00:00.000Z",
  });
  assert(value);
  return value;
}

function execution(candidateValue: HermesDailyFarmBriefProposalCandidate, id: string, repository: HermesDailyFarmBriefProposalExplicitSavePostgresRepository) {
  return executeHermesDailyFarmBriefProposalExplicitSave({
    request: { schema_version: "hermes.daily_farm_brief.proposal_explicit_save_request.v1", candidate_id: candidateValue.candidate_id, duplicate_signature: candidateValue.duplicate_signature, confirmation: "save_for_human_review", requested_at: "2026-07-18T04:00:00.000Z" },
    actor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day126-postgres-admin", role: "administrator", allowed_scope_keys: [], authorization_verified: true },
    candidate: candidateValue, idFactory: () => id, repository,
  });
}

function quote(value: string): string { return `'${value.replaceAll("'", "''")}'`; }

async function snapshot(pg: HermesDailyFarmBriefIsolatedPostgresExecutor, key: string): Promise<Snapshot> {
  const result = await pg.executeSingleConnection(`begin transaction read only;
do $day126$ begin if current_database()<>'${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'target rejected'; end if; end $day126$;
select jsonb_build_object(
 'proposal_count',(select count(*)::int from ai.proposal_inbox),
 'target_count',(select count(*)::int from ai.proposal_inbox where source_refs_json->>'idempotency_key'=${quote(key)}),
 'protected_status',(select status from ai.proposal_inbox where source_refs_json->>'day81_persistence_boundary_test_id'='day81_core_internal_test_only_v1' order by created_at,id limit 1),
 'protected_applied_at',(select applied_at::text from ai.proposal_inbox where source_refs_json->>'day81_persistence_boundary_test_id'='day81_core_internal_test_only_v1' order by created_at,id limit 1),
 'protected_applied_by',(select applied_by from ai.proposal_inbox where source_refs_json->>'day81_persistence_boundary_test_id'='day81_core_internal_test_only_v1' order by created_at,id limit 1),
 'target_status',(select status from ai.proposal_inbox where source_refs_json->>'idempotency_key'=${quote(key)} order by created_at,id limit 1),
 'target_applied_at',(select applied_at::text from ai.proposal_inbox where source_refs_json->>'idempotency_key'=${quote(key)} order by created_at,id limit 1),
 'target_applied_by',(select applied_by from ai.proposal_inbox where source_refs_json->>'idempotency_key'=${quote(key)} order by created_at,id limit 1)
)::text;
commit;`);
  assert(result.ok);
  return JSON.parse(result.output.split(/\r?\n/u).filter(Boolean).at(-1) ?? "null") as Snapshot;
}

function rollbackExecutor(base: HermesDailyFarmBriefIsolatedPostgresExecutor): HermesDailyFarmBriefIsolatedPostgresExecutor {
  return { executeSingleConnection(sql) {
    const controlled = sql.includes("prepare day126_insert") ? sql.replace("deallocate day126_insert;\ncommit;", "deallocate day126_insert;\nselect 1/0;\ncommit;") : sql;
    return base.executeSingleConnection(controlled);
  } };
}

export async function runDay126PostgresBoundaryScenario() {
  const target = process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV];
  const readiness = await diagnoseHermesDay126ProposalExplicitSavePostgresReadiness({ databaseTarget: target });
  assert.equal(readiness.state, "ready", `readiness denied: ${readiness.denial_reason}`);
  if (readiness.state !== "ready") throw new Error(`readiness_denied:${readiness.denial_reason}`);
  const pg = executor();

  const main = candidate("Day126 E2E main scope");
  const mainKey = `sha256:${main.duplicate_signature.slice(7)}`;
  const preparedKey = (await import("../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary")).createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(main.duplicate_signature);
  assert.notEqual(mainKey, preparedKey);
  const before = await snapshot(pg, preparedKey);
  const first = await execution(main, UUIDS.mainA, readiness.repository);
  assert(["saved", "already_saved"].includes(first.status));
  const afterFirst = await snapshot(pg, preparedKey);
  assert.equal(afterFirst.target_count, 1);
  assert.equal(afterFirst.proposal_count, before.proposal_count + (before.target_count === 0 ? 1 : 0));
  assert.deepEqual([afterFirst.protected_status, afterFirst.protected_applied_at, afterFirst.protected_applied_by], [before.protected_status, before.protected_applied_at, before.protected_applied_by]);
  assert.deepEqual([afterFirst.target_status, afterFirst.target_applied_at, afterFirst.target_applied_by], ["pending", null, null]);
  const second = await execution(main, UUIDS.mainA, readiness.repository);
  assert.equal(second.status, "already_saved");
  const afterSecond = await snapshot(pg, preparedKey);
  assert.equal(afterSecond.proposal_count, afterFirst.proposal_count); assert.equal(afterSecond.target_count, 1);
  const secondWithDifferentUuid = await execution(main, UUIDS.mainB, readiness.repository);
  assert.equal(secondWithDifferentUuid.status, "already_saved");
  const afterDifferentUuid = await snapshot(pg, preparedKey);
  assert.equal(afterDifferentUuid.proposal_count, afterSecond.proposal_count); assert.equal(afterDifferentUuid.target_count, 1);

  const rollbackCandidate = candidate("Day126 E2E rollback scope", "work_log_started_at_invalid");
  const rollbackKey = (await import("../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary")).createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(rollbackCandidate.duplicate_signature);
  const rollbackBefore = await snapshot(pg, rollbackKey);
  const rollback = await execution(rollbackCandidate, UUIDS.rollback, new HermesDailyFarmBriefProposalExplicitSavePostgresRepository(rollbackExecutor(pg)));
  assert.equal(rollback.status, rollbackBefore.target_count === 0 ? "failed" : "already_saved");
  const rollbackAfter = await snapshot(pg, rollbackKey);
  assert.deepEqual([rollbackAfter.proposal_count, rollbackAfter.target_count], [rollbackBefore.proposal_count, rollbackBefore.target_count]);

  const concurrentCandidate = candidate("Day126 E2E concurrent same scope");
  const concurrentKey = (await import("../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary")).createHermesDailyFarmBriefProposalExplicitSaveIdempotencyKey(concurrentCandidate.duplicate_signature);
  const concurrentBefore = await snapshot(pg, concurrentKey);
  const concurrentResults = await Promise.all([
    execution(concurrentCandidate, UUIDS.concurrentA, new HermesDailyFarmBriefProposalExplicitSavePostgresRepository(pg)),
    execution(concurrentCandidate, UUIDS.concurrentB, new HermesDailyFarmBriefProposalExplicitSavePostgresRepository(pg)),
  ]);
  const concurrentAfter = await snapshot(pg, concurrentKey);
  assert.equal(concurrentAfter.target_count, 1);
  assert.equal(concurrentAfter.proposal_count, concurrentBefore.proposal_count + (concurrentBefore.target_count === 0 ? 1 : 0));
  const savedCount = concurrentResults.filter((item) => item.status === "saved").length;
  const alreadySavedCount = concurrentResults.filter((item) => item.status === "already_saved").length;
  assert.equal(savedCount + alreadySavedCount, 2);
  if (concurrentBefore.target_count === 0) assert.deepEqual([savedCount, alreadySavedCount], [1, 1]);

  const differentA = candidate("Day126 E2E distinct scope A");
  const differentB = candidate("Day126 E2E distinct scope B", "work_log_started_at_invalid");
  assert.notEqual(differentA.duplicate_signature, differentB.duplicate_signature);
  const differentResults = await Promise.all([
    execution(differentA, UUIDS.differentA, new HermesDailyFarmBriefProposalExplicitSavePostgresRepository(pg)),
    execution(differentB, UUIDS.differentB, new HermesDailyFarmBriefProposalExplicitSavePostgresRepository(pg)),
  ]);
  assert(differentResults.every((item) => ["saved", "already_saved"].includes(item.status)));

  return {
    boundary: "day126_daily_farm_brief_explicit_save_postgres", database_target: "isolated_test", repository_state: "ready",
    first_status: first.status, second_status: second.status,
    concurrent: { saved_count: savedCount, already_saved_count: alreadySavedCount, persisted_count: concurrentAfter.target_count },
    rollback: { status: rollback.status, preserved: true }, proposal_status: afterSecond.target_status, applied_at: afterSecond.target_applied_at, applied_by: afterSecond.target_applied_by,
    app_database_write_performed: false, audit_database_write_performed: false, proposal_apply_performed: false, update_performed: false, delete_performed: false, retry_count: 0,
    production_database_connection_performed: false, production_database_write_performed: false, secret_exposed: false, raw_identifier_exposed: false,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runDay126PostgresBoundaryScenario().then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error instanceof Error && error.message.startsWith("readiness_denied:") ? error.message : "day126_postgres_boundary_failed"); process.exitCode = 1; });
}
