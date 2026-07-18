import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  createHermesDailyFarmBriefProposalReviewPostgresRepository,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_repository";
import {
  prepareHermesDailyFarmBriefProposalExplicitSave,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import {
  createHermesDailyFarmBriefProposalCandidate,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";
import {
  createHermesDailyFarmBriefProposalSafeReference,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";

const RECORD_ID = "7b48f13a-e76b-4b19-a822-f66147566074";
const SECOND_ID = "c44bbcfd-7ec1-4c68-86f7-e67f52f86da2";

function rawRow() {
  const candidate = createHermesDailyFarmBriefProposalCandidate({
    value: {
      schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1",
      proposal_type: "work_log_follow_up",
      suggestion_type: "work_log_attention",
      source: {
        business_date: "2026-07-18",
        generated_at: "2026-07-18T00:00:00.000Z",
        version: 2,
        display_state: "current",
      },
      attention: {
        reason_code: "work_log_started_at_missing",
        reason: "作業開始日時が入力されていません。",
        field_label: "北側圃場",
        work_type_label: "収穫",
        work_date: null,
        evidence_type: "work_log",
      },
    },
    expectedSourceVersion: 2,
    clock: () => "2026-07-18T03:00:00.000Z",
  });
  assert(candidate);
  const preparation = prepareHermesDailyFarmBriefProposalExplicitSave({
    request: {
      schema_version:
        "hermes.daily_farm_brief.proposal_explicit_save_request.v1",
      candidate_id: candidate.candidate_id,
      duplicate_signature: candidate.duplicate_signature,
      confirmation: "save_for_human_review",
      requested_at: "2026-07-18T04:00:00.000Z",
    },
    actor: {
      schema_version:
        "hermes.daily_farm_brief.authenticated_actor_context.v1",
      principal_ref: "day127-static-admin",
      role: "administrator",
      allowed_scope_keys: [],
      authorization_verified: true,
    },
    candidate,
    idFactory: () => RECORD_ID,
  });
  assert.equal(preparation.status, "ready");
  if (preparation.status !== "ready") throw new Error("fixture rejected");
  return {
    ...preparation.proposal_record,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    applied_at: null,
    applied_by: null,
    created_at: preparation.proposal_record.payload_json.created_at,
    updated_at: preparation.proposal_record.payload_json.created_at,
  };
}

class FakeExecutor implements HermesDailyFarmBriefIsolatedPostgresExecutor {
  calls: string[] = [];
  outputs: Array<{ ok: boolean; output: string }> = [];
  async executeSingleConnection(sql: string) {
    this.calls.push(sql);
    return this.outputs.shift() ?? { ok: false, output: "" };
  }
}

export async function runDay127ProposalReviewPostgresRepositoryContract() {
  let invalidFactoryCalls = 0;
  assert.throws(
    () =>
      createHermesDailyFarmBriefProposalReviewPostgresRepository({
        databaseTarget: "farmos_core_local",
        executorFactory: () => {
          invalidFactoryCalls += 1;
          return null;
        },
      }),
    /day127_repository_input_invalid/u,
  );
  assert.equal(invalidFactoryCalls, 0, "invalid target must not create executor");

  const row = rawRow();
  const safeReference = createHermesDailyFarmBriefProposalSafeReference(
    row.source_refs_json.idempotency_key,
  );
  const differentReference = createHermesDailyFarmBriefProposalSafeReference(
    "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  );
  const unknownSchema = structuredClone(row);
  unknownSchema.payload_json.schema_version =
    "hermes.daily_farm_brief.proposal_inbox_record.v2";
  const duplicateRow = { ...structuredClone(row), id: SECOND_ID };

  const executor = new FakeExecutor();
  executor.outputs.push(
    { ok: true, output: JSON.stringify([row]) },
    { ok: true, output: JSON.stringify([row]) },
    { ok: true, output: JSON.stringify([row]) },
    { ok: true, output: "not-json" },
    { ok: true, output: JSON.stringify([unknownSchema]) },
    { ok: true, output: JSON.stringify([row, duplicateRow]) },
    { ok: false, output: "raw-sensitive-database-error" },
  );
  const repository =
    createHermesDailyFarmBriefProposalReviewPostgresRepository({
      databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
      executorFactory: () => executor,
    });

  const rows = await repository.listDailyBriefProposalRows(5);
  assert.equal(rows.length, 1);
  assert.equal(
    (await repository.findDailyBriefProposalRowBySafeReference(safeReference))
      ?.id,
    RECORD_ID,
  );
  assert.equal(
    await repository.findDailyBriefProposalRowBySafeReference(
      differentReference,
    ),
    null,
  );

  const callsBeforeMalformedReference = executor.calls.length;
  await assert.rejects(
    () =>
      repository.findDailyBriefProposalRowBySafeReference(RECORD_ID),
    /day127_repository_input_invalid/u,
  );
  assert.equal(executor.calls.length, callsBeforeMalformedReference);
  await assert.rejects(
    () => repository.listDailyBriefProposalRows(0),
    /day127_repository_input_invalid/u,
  );
  await assert.rejects(
    () => repository.listDailyBriefProposalRows(101),
    /day127_repository_input_invalid/u,
  );
  assert.equal(executor.calls.length, callsBeforeMalformedReference);

  await assert.rejects(
    () => repository.listDailyBriefProposalRows(10),
    /day127_repository_contract_invalid/u,
  );
  await assert.rejects(
    () => repository.listDailyBriefProposalRows(10),
    /day127_repository_contract_invalid/u,
    "unknown schema row must fail closed",
  );
  await assert.rejects(
    () => repository.findDailyBriefProposalRowBySafeReference(safeReference),
    /day127_repository_contract_invalid/u,
    "duplicate safe reference must fail closed",
  );
  let unavailableMessage = "";
  try {
    await repository.listDailyBriefProposalRows(10);
  } catch (error) {
    unavailableMessage = error instanceof Error ? error.message : "";
  }
  assert.equal(unavailableMessage, "day127_repository_unavailable");
  assert(!unavailableMessage.includes("raw-sensitive"));

  const listSql = executor.calls[0];
  const detailSql = executor.calls[1];
  for (const sql of [listSql, detailSql]) {
    assert.match(sql, /begin transaction read only/u);
    assert.match(sql, /set local timezone = 'UTC'/u);
    assert.match(sql, /set local role farmos_ai_proposal_local/u);
    assert.match(
      sql,
      /current_database\(\) <> 'farmos_core_day114_test'/u,
    );
    assert.match(sql, /if inet_server_addr\(\) is not null/u);
    assert.match(sql, /to_regclass\('ai\.proposal_inbox'\) is null/u);
    assert.match(sql, /current_setting\('transaction_read_only'\) <> 'on'/u);
    assert.match(sql, /has_table_privilege\(current_user,'ai\.proposal_inbox','SELECT'\)/u);
    assert.match(sql, /proposal_type='work_log_follow_up'/u);
    assert.match(
      sql,
      /payload_json->>'schema_version'='hermes\.daily_farm_brief\.proposal_inbox_record\.v1'/u,
    );
    assert.match(
      sql,
      /payload_json->>'boundary'='day126_daily_farm_brief_explicit_save'/u,
    );
    assert.match(
      sql,
      /source_refs_json->>'source'='daily_farm_brief_attention'/u,
    );
    assert.match(sql, /order by created_at desc,id asc/u);
    assert.match(sql, /commit;/u);
    assert.doesNotMatch(sql, /insert\s+into|update\s+ai\.|delete\s+from|truncate\s+table/iu);
    assert.doesNotMatch(sql, /farmos_core_(?:local|production)/iu);
  }
  assert.match(listSql, /limit 5/u);
  assert.match(detailSql, /limit 100/u);
  assert.equal(executor.calls.length, 7);
  assert.equal("insertProposal" in repository, false);
  assert.equal("updateProposal" in repository, false);
  assert.equal("deleteProposal" in repository, false);
  assert.equal("approveProposal" in repository, false);
  assert.equal("rejectProposal" in repository, false);
  assert.equal("applyProposal" in repository, false);

  return {
    result: "pass",
    boundary: "day127_proposal_review_postgres_repository_contract",
    select_only: true,
    transaction_read_only: true,
    isolated_target_only: true,
    strict_row_parser_reused: true,
    duplicate_safe_reference_fail_closed: true,
    raw_error_exposed: false,
    retry_count: 0,
    executor_call_count: executor.calls.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(
    JSON.stringify(
      await runDay127ProposalReviewPostgresRepositoryContract(),
    ),
  );
}
