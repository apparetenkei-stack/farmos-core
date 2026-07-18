import assert from "node:assert/strict";

import { HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE } from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { createHermesDailyFarmBriefProposalCandidate } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";
import { prepareHermesDailyFarmBriefProposalExplicitSave } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import {
  prepareHermesDailyFarmBriefProposalReviewDecision,
  type ProposalReviewDecisionRepositoryCommand,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";
import {
  HERMES_DAY128_PROTECTED_PROPOSAL_ID,
  HERMES_DAY128_REVIEW_POSTGRES_SQL,
  createPostgresDailyFarmBriefProposalReviewDecisionRepository,
  type HermesDay128ReviewPostgresQueryResult,
  type HermesDay128ReviewPostgresTransaction,
  type HermesDay128ReviewPostgresTransactionDecision,
  type HermesDay128ReviewPostgresTransactionExecution,
  type HermesDay128ReviewPostgresTransactionExecutor,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_decision_postgres_repository";
import { createHermesDailyFarmBriefProposalSafeReference } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";

const RECORD_ID = "7b48f13a-e76b-4b19-a822-f66147566074";
const SECOND_ID = "c44bbcfd-7ec1-4c68-86f7-e67f52f86da2";
const PRINCIPAL = "day128-internal-administrator";

function fixture(decision: "approve" | "reject" | "request_revision" = "approve") {
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
  const saved = prepareHermesDailyFarmBriefProposalExplicitSave({
    request: { schema_version: "hermes.daily_farm_brief.proposal_explicit_save_request.v1", candidate_id: candidate.candidate_id, duplicate_signature: candidate.duplicate_signature, confirmation: "save_for_human_review", requested_at: "2026-07-18T04:00:00.000Z" },
    actor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: PRINCIPAL, role: "administrator", allowed_scope_keys: [], authorization_verified: true },
    candidate,
    idFactory: () => RECORD_ID,
  });
  assert.equal(saved.status, "ready");
  if (saved.status !== "ready") throw new Error("fixture rejected");
  const row = {
    ...saved.proposal_record,
    reviewed_by: null,
    reviewed_at: null,
    review_note: null,
    applied_at: null,
    applied_by: null,
    created_at: saved.proposal_record.payload_json.created_at,
    updated_at: saved.proposal_record.payload_json.created_at,
  };
  const proposalRef = createHermesDailyFarmBriefProposalSafeReference(row.source_refs_json.idempotency_key);
  const preparation = prepareHermesDailyFarmBriefProposalReviewDecision({
    request: { proposal_ref: proposalRef, decision, review_note: "内容を確認しました。", expected_status: "pending", expected_updated_at: row.updated_at },
    authentication: { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: PRINCIPAL },
    actor: { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: PRINCIPAL, role: "administrator", allowed_scope_keys: [], authorization_verified: true },
    currentState: { proposal_ref: proposalRef, current_status: "pending", current_updated_at: row.updated_at, expires_at: row.payload_json.expires_at, applied_at: null, applied_by: null, protected_fixture: false },
    clock: () => "2026-07-18T05:00:00.000Z",
  });
  assert.equal(preparation.status, "ready");
  if (preparation.status !== "ready") throw new Error("review fixture rejected");
  return { row, command: preparation.command, proposalRef };
}

type QueryStep = HermesDay128ReviewPostgresQueryResult | Error;
class FakeTransactionExecutor implements HermesDay128ReviewPostgresTransactionExecutor {
  beginSqls: string[] = [];
  databaseTargets: string[] = [];
  queries: Array<{ sql: string; parameters: readonly unknown[] }> = [];
  commits = 0;
  rollbacks = 0;
  releases = 0;
  constructor(private readonly steps: QueryStep[]) {}
  async executeSingleConnectionTransaction<T>(input: {
    databaseTarget: string;
    beginSql: string;
    operation: (transaction: HermesDay128ReviewPostgresTransaction) => Promise<HermesDay128ReviewPostgresTransactionDecision<T>>;
  }): Promise<HermesDay128ReviewPostgresTransactionExecution<T>> {
    this.databaseTargets.push(input.databaseTarget);
    this.beginSqls.push(input.beginSql);
    const transaction: HermesDay128ReviewPostgresTransaction = {
      query: async (sql, parameters = []) => {
        this.queries.push({ sql, parameters });
        const step = this.steps.shift();
        if (step instanceof Error) throw step;
        return step ?? { rowCount: 0, rows: [] };
      },
    };
    try {
      const decision = await input.operation(transaction);
      if (decision.commit) this.commits += 1;
      else this.rollbacks += 1;
      return { ok: true, committed: decision.commit, value: decision.value };
    } catch {
      this.rollbacks += 1;
      return { ok: false, committed: false };
    } finally {
      this.releases += 1;
    }
  }
}

function repository(executor: FakeTransactionExecutor) {
  return createPostgresDailyFarmBriefProposalReviewDecisionRepository({
    databaseTarget: HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
    executorFactory: () => executor,
  });
}
function stepsFor(row: ReturnType<typeof fixture>["row"], updateCount = 1, auditCount = 1): QueryStep[] {
  return [
    { rowCount: 1, rows: [row] },
    { rowCount: 1, rows: [row] },
    { rowCount: updateCount, rows: updateCount === 1 ? [{ status: "approved", updated_at: "2026-07-18T05:00:00.000Z" }] : [] },
    { rowCount: auditCount, rows: auditCount === 1 ? [{ id: "9b08ec58-aa17-4af5-b7f2-ecc1ae91c2f2" }] : [] },
  ];
}

async function executeWith(row: ReturnType<typeof fixture>["row"], command: ProposalReviewDecisionRepositoryCommand, steps = stepsFor(row)) {
  const executor = new FakeTransactionExecutor(steps);
  const result = await repository(executor).recordProposalReviewDecision(command);
  return { executor, result };
}

const base = fixture();
let invalidFactoryCalls = 0;
assert.throws(() => createPostgresDailyFarmBriefProposalReviewDecisionRepository({ databaseTarget: "production", executorFactory: () => { invalidFactoryCalls += 1; return null; } }), /day128_repository_input_invalid/u);
assert.equal(invalidFactoryCalls, 0);

const success = await executeWith(base.row, base.command);
assert.equal(success.result.result, "recorded");
assert.equal(success.executor.commits, 1);
assert.equal(success.executor.rollbacks, 0);
assert.equal(success.executor.releases, 1);
assert.deepEqual(success.executor.databaseTargets, [HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE]);
assert.match(success.executor.beginSqls[0], /begin isolation level read committed/u);
assert.match(success.executor.beginSqls[0], /set local timezone = 'UTC'/u);
assert.match(success.executor.beginSqls[0], /set local role farmos_ai_proposal_review_local/u);
assert.match(success.executor.beginSqls[0], /current_database\(\) <> 'farmos_core_day114_test'/u);
assert.match(success.executor.beginSqls[0], /inet_server_addr\(\) is not null/u);
assert.match(success.executor.queries[0].sql, /order by created_at desc,id asc/u);
assert.match(success.executor.queries[0].sql, /limit 100/u);
assert.doesNotMatch(success.executor.queries[0].sql, /for update/u);
assert.match(success.executor.queries[1].sql, /where id=\$1\s+for update/u);
assert.equal(success.executor.queries[1].parameters.length, 1);
assert.equal(success.executor.queries[2].sql, HERMES_DAY128_REVIEW_POSTGRES_SQL.update);
assert.equal(success.executor.queries[3].sql, HERMES_DAY128_REVIEW_POSTGRES_SQL.auditInsert);
assert.match(success.executor.queries[3].sql, /returning 1 as inserted/u);
assert.doesNotMatch(success.executor.queries[3].sql, /returning id/u);

for (const [decision, nextStatus, auditType] of [
  ["approve", "approved", "approve_review"],
  ["reject", "rejected", "reject_review"],
  ["request_revision", "needs_revision", "request_revision"],
] as const) {
  const mapped = fixture(decision);
  const executed = await executeWith(mapped.row, mapped.command);
  assert.equal(executed.result.result, "recorded");
  if (executed.result.result === "recorded") assert.equal(executed.result.nextStatus, nextStatus);
  assert.equal(executed.executor.queries[2].parameters[1], nextStatus);
  assert.equal(executed.executor.queries[3].parameters[1], auditType);
  assert.equal(executed.executor.commits, 1);
}

const zero = await executeWith(base.row, base.command, [{ rowCount: 0, rows: [] }]);
assert.equal(zero.result.result, "not_found"); assert.equal(zero.executor.rollbacks, 1);
const duplicateRow = { ...structuredClone(base.row), id: SECOND_ID };
const multiple = await executeWith(base.row, base.command, [{ rowCount: 2, rows: [base.row, duplicateRow] }]);
assert.equal(multiple.result.result, "atomic_write_failed"); assert.equal(multiple.executor.rollbacks, 1);

const protectedRow = { ...structuredClone(base.row), id: HERMES_DAY128_PROTECTED_PROPOSAL_ID };
const protectedResult = await executeWith(protectedRow, base.command, [{ rowCount: 1, rows: [protectedRow] }]);
assert.equal(protectedResult.result.result, "protected");

const expiredRow = structuredClone(base.row); expiredRow.payload_json.expires_at = "2026-07-18T04:59:59.999Z";
const expired = await executeWith(expiredRow, base.command, [{ rowCount: 1, rows: [expiredRow] }, { rowCount: 1, rows: [expiredRow] }]);
assert.equal(expired.result.result, "expired");
const approvedRow = { ...structuredClone(base.row), status: "approved" };
const nonPending = await executeWith(approvedRow, base.command, [{ rowCount: 1, rows: [approvedRow] }, { rowCount: 1, rows: [approvedRow] }]);
assert.equal(nonPending.result.result, "invalid_transition");
const appliedRow = { ...structuredClone(base.row), applied_at: "2026-07-18T04:30:00.000Z", applied_by: "internal-admin" };
const applied = await executeWith(appliedRow, base.command, [{ rowCount: 1, rows: [appliedRow] }, { rowCount: 1, rows: [appliedRow] }]);
assert.equal(applied.result.result, "invalid_transition");
const staleRow = { ...structuredClone(base.row), updated_at: "2026-07-18T04:30:00.000Z" };
const stale = await executeWith(staleRow, base.command, [{ rowCount: 1, rows: [base.row] }, { rowCount: 1, rows: [staleRow] }]);
assert.equal(stale.result.result, "stale");

for (const count of [0, 2]) {
  const updateFailure = await executeWith(base.row, base.command, stepsFor(base.row, count, 1));
  assert.equal(updateFailure.result.result, count === 0 ? "stale" : "atomic_write_failed");
  assert.equal(updateFailure.executor.rollbacks, 1);
  assert.equal(updateFailure.executor.queries.length, 3, "audit must not run after invalid update count");
}
for (const count of [0, 2]) {
  const auditFailure = await executeWith(base.row, base.command, stepsFor(base.row, 1, count));
  assert.equal(auditFailure.result.result, "atomic_write_failed");
  assert.equal(auditFailure.executor.rollbacks, 1, "Proposal update must roll back");
}
const exception = await executeWith(base.row, base.command, [
  { rowCount: 1, rows: [base.row] }, { rowCount: 1, rows: [base.row] },
  { rowCount: 1, rows: [{ status: "approved" }] }, new Error("raw-sensitive-database-error"),
]);
assert.equal(exception.result.result, "atomic_write_failed");
assert.equal(exception.executor.rollbacks, 1); assert.equal(exception.executor.releases, 1);

const serialized = JSON.stringify([success.result, zero.result, multiple.result, exception.result]);
assert(!serialized.includes(RECORD_ID));
assert(!serialized.includes(PRINCIPAL));
assert(!serialized.includes("raw-sensitive"));
assert.equal("insertProposal" in repository(success.executor), false);
assert.equal("deleteProposal" in repository(success.executor), false);
assert.equal("applyProposal" in repository(success.executor), false);
assert.equal("retry" in repository(success.executor), false);

console.log(JSON.stringify({
  result: "pass",
  boundary: "day128_review_decision_postgres_repository_contract",
  isolated_target_only: true,
  local_socket_guard: true,
  single_connection_transaction: true,
  candidate_limit: 100,
  target_row_lock_only: true,
  cas_update: true,
  audit_append_atomic: true,
  rollback_cases: 7,
  connection_released: true,
  raw_identifier_exposed: false,
  principal_ref_exposed: false,
  raw_error_exposed: false,
  proposal_apply_performed: false,
  app_database_write_performed: false,
  proposal_insert_performed: false,
  proposal_delete_performed: false,
  retry_count: 0,
}));
