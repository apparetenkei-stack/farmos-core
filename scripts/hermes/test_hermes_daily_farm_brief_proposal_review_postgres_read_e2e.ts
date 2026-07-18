import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";
import { diagnoseHermesDay127ProposalReviewPostgresReadiness } from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_postgres_readiness";
import {
  createHermesDailyFarmBriefProposalDetailResponse,
  createHermesDailyFarmBriefProposalListResponse,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_read_boundary";

const PROTECTED_FIXTURE_ID = "14711111-88db-41fd-a048-1c37266fd9e0";
const REQUEST = {
  schema_version: "hermes.daily_farm_brief.proposal_review_read_request.v1",
  requested_at: "2026-07-18T12:00:00.000Z",
} as const;
const ACTOR = {
  schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
  principal_ref: "day127-read-e2e-admin",
  role: "administrator",
  allowed_scope_keys: [],
  authorization_verified: true,
} as const;

const FORBIDDEN_PROJECTION_KEYS = new Set([
  "id",
  "candidate_id",
  "duplicate_signature",
  "idempotency_key",
  "reviewed_by",
  "applied_by",
  "principal_ref",
  "payload_json",
  "source_refs_json",
]);

type Stage =
  | "initialization"
  | "readiness"
  | "snapshot_before"
  | "repository_list"
  | "list_projection"
  | "list_redaction"
  | "repository_detail"
  | "detail_projection"
  | "detail_redaction"
  | "snapshot_after"
  | "immutability_check";

let stage: Stage = "initialization";

type Snapshot = {
  row_count: number;
  day126_count: number;
  protected_status: string | null;
  protected_applied_at: string | null;
  protected_applied_by: string | null;
  day126_rows: Array<{
    status: string;
    applied_at: string | null;
    applied_by: string | null;
  }>;
};

function lastJson(output: string): unknown {
  const line = output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).at(-1);
  return JSON.parse(line ?? "null") as unknown;
}

function containsForbiddenOwnKey(
  value: unknown,
  forbidden: ReadonlySet<string>,
): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenOwnKey(item, forbidden));
  }
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      forbidden.has(key) || containsForbiddenOwnKey(nested, forbidden),
  );
}

function rawForbiddenValues(rows: ReadonlyArray<unknown>): string[] {
  const values = new Set<string>([ACTOR.principal_ref]);
  for (const rawRow of rows) {
    if (typeof rawRow !== "object" || rawRow === null || Array.isArray(rawRow)) continue;
    const row = rawRow as Record<string, unknown>;
    if (typeof row.id === "string") values.add(row.id);
    if (typeof row.reviewed_by === "string") values.add(row.reviewed_by);
    if (typeof row.applied_by === "string") values.add(row.applied_by);
    const payload = row.payload_json;
    if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
      for (const key of ["candidate_id", "duplicate_signature", "idempotency_key"] as const) {
        const value = (payload as Record<string, unknown>)[key];
        if (typeof value === "string") values.add(value);
      }
    }
  }
  return [...values];
}

function parseSnapshot(value: unknown): Snapshot {
  assert(typeof value === "object" && value !== null && !Array.isArray(value));
  const record = value as Record<string, unknown>;
  assert.deepEqual(Object.keys(record).sort(), ["day126_count", "day126_rows", "protected_applied_at", "protected_applied_by", "protected_status", "row_count"].sort());
  assert(Number.isSafeInteger(record.row_count) && Number(record.row_count) >= 0);
  assert(Number.isSafeInteger(record.day126_count) && Number(record.day126_count) >= 0);
  assert(Array.isArray(record.day126_rows));
  for (const row of record.day126_rows) {
    assert(typeof row === "object" && row !== null && !Array.isArray(row));
    assert.deepEqual(Object.keys(row as object).sort(), ["applied_at", "applied_by", "status"].sort());
    assert(typeof (row as { status?: unknown }).status === "string");
  }
  return value as Snapshot;
}

async function snapshot(executor: HermesDailyFarmBriefIsolatedPostgresExecutor): Promise<Snapshot> {
  const result = await executor.executeSingleConnection(`begin transaction read only;
set local timezone = 'UTC';
set local role farmos_ai_proposal_local;
do $day127$ begin
  if current_database()<>'${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if current_user<>'farmos_ai_proposal_local' then raise exception 'identity_invalid'; end if;
  if current_setting('transaction_read_only')<>'on' then raise exception 'transaction_not_read_only'; end if;
end $day127$;
select jsonb_build_object(
  'row_count',(select count(*)::int from ai.proposal_inbox),
  'day126_count',(select count(*)::int from ai.proposal_inbox where proposal_type='work_log_follow_up' and payload_json->>'schema_version'='hermes.daily_farm_brief.proposal_inbox_record.v1' and payload_json->>'boundary'='day126_daily_farm_brief_explicit_save' and source_refs_json->>'source'='daily_farm_brief_attention' and source_refs_json->>'boundary'='day126_daily_farm_brief_explicit_save'),
  'protected_status',(select status from ai.proposal_inbox where id='${PROTECTED_FIXTURE_ID}'::uuid),
  'protected_applied_at',(select applied_at::text from ai.proposal_inbox where id='${PROTECTED_FIXTURE_ID}'::uuid),
  'protected_applied_by',(select applied_by from ai.proposal_inbox where id='${PROTECTED_FIXTURE_ID}'::uuid),
  'day126_rows',coalesce((select jsonb_agg(jsonb_build_object('status',status,'applied_at',applied_at::text,'applied_by',applied_by) order by created_at,id) from ai.proposal_inbox where proposal_type='work_log_follow_up' and payload_json->>'schema_version'='hermes.daily_farm_brief.proposal_inbox_record.v1' and payload_json->>'boundary'='day126_daily_farm_brief_explicit_save' and source_refs_json->>'source'='daily_farm_brief_attention' and source_refs_json->>'boundary'='day126_daily_farm_brief_explicit_save'),'[]'::jsonb)
)::text;
commit;`);
  assert(result.ok, "day127_snapshot_failed");
  return parseSnapshot(lastJson(result.output));
}

export async function runDay127ProposalReviewPostgresReadE2E() {
  stage = "initialization";
  const target = process.env[HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV];
  const baseExecutor = createHermesDailyFarmBriefDockerPostgresExecutor(
    HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  );
  assert(baseExecutor, "day127_executor_unavailable");
  let repositoryExecutorCalls = 0;
  const countedExecutor: HermesDailyFarmBriefIsolatedPostgresExecutor = {
    async executeSingleConnection(sql) {
      repositoryExecutorCalls += 1;
      return baseExecutor.executeSingleConnection(sql);
    },
  };
  stage = "readiness";
  const readiness = await diagnoseHermesDay127ProposalReviewPostgresReadiness({
    databaseTarget: target,
    executorFactory: () => countedExecutor,
  });
  assert.equal(readiness.state, "ready", `readiness_denied:${readiness.denial_reason}`);
  if (readiness.state !== "ready") throw new Error("day127_readiness_denied");

  stage = "snapshot_before";
  const before = await snapshot(baseExecutor);
  stage = "repository_list";
  const rows = await readiness.repository.listDailyBriefProposalRows(100);
  assert(rows.length > 0, "day127_proposal_not_found");
  assert(rows.every((row) => row.id !== PROTECTED_FIXTURE_ID), "protected_fixture_mixed_into_day127_list");
  stage = "list_projection";
  const list = createHermesDailyFarmBriefProposalListResponse({
    request: REQUEST,
    actor: ACTOR,
    rows,
  });
  assert.equal(list.result, "ok");
  if (list.result !== "ok") throw new Error("day127_list_projection_failed");
  assert(list.proposals.length > 0);
  stage = "list_redaction";
  const listJson = JSON.stringify(list);
  for (const forbiddenValue of rawForbiddenValues(rows)) {
    assert(!listJson.includes(forbiddenValue));
  }
  assert(!containsForbiddenOwnKey(list.proposals, FORBIDDEN_PROJECTION_KEYS));

  const firstReference = list.proposals[0].proposal_ref;
  stage = "repository_detail";
  const detailRow = await readiness.repository.findDailyBriefProposalRowBySafeReference(firstReference);
  assert(detailRow);
  stage = "detail_projection";
  const detail = createHermesDailyFarmBriefProposalDetailResponse({
    request: REQUEST,
    actor: ACTOR,
    proposalRef: firstReference,
    row: detailRow,
  });
  assert.equal(detail.result, "ok");
  if (detail.result !== "ok") throw new Error("day127_detail_projection_failed");
  assert(detail.proposal.target_display.length > 0);
  assert(detail.proposal.basis.length > 0);
  assert(detail.proposal.before.length > 0);
  assert(detail.proposal.after.length > 0);
  assert(detail.proposal.expires_at.length > 0);
  assert.equal(detail.proposal.proposal_apply_ready, false);
  assert.equal(detail.safety.database_write_performed, false);
  assert.equal(detail.safety.proposal_update_performed, false);
  assert.equal(detail.safety.proposal_apply_performed, false);
  stage = "detail_redaction";
  const detailJson = JSON.stringify(detail);
  for (const forbiddenValue of rawForbiddenValues(rows)) {
    assert(!detailJson.includes(forbiddenValue));
  }
  assert(!containsForbiddenOwnKey(detail.proposal, FORBIDDEN_PROJECTION_KEYS));

  stage = "snapshot_after";
  const after = await snapshot(baseExecutor);
  stage = "immutability_check";
  assert.deepEqual(after, before);
  assert.equal(repositoryExecutorCalls, 3, "readiness plus list/detail must use exactly three calls");

  return {
    result: "pass",
    readiness_state: readiness.state,
    list_count: list.proposals.length,
    detail_result: detail.result,
    protected_fixture_excluded: true,
    row_count_unchanged: after.row_count === before.row_count,
    day126_count_unchanged: after.day126_count === before.day126_count,
    protected_fixture_unchanged: after.protected_status === before.protected_status && after.protected_applied_at === before.protected_applied_at && after.protected_applied_by === before.protected_applied_by,
    day126_rows_unchanged: JSON.stringify(after.day126_rows) === JSON.stringify(before.day126_rows),
    raw_identifier_exposed: false,
    principal_ref_exposed: false,
    database_write_performed: false,
    proposal_update_performed: false,
    proposal_apply_performed: false,
    app_database_write_performed: false,
    audit_database_write_performed: false,
    production_connection_performed: false,
    retry_count: 0,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runDay127ProposalReviewPostgresReadE2E()
    .then((result) => console.log(JSON.stringify(result)))
    .catch(() => {
      console.error(JSON.stringify({
        result: "failed",
        stage,
        database_write_performed: false,
        production_connection_performed: false,
        retry_count: 0,
      }));
      process.exitCode = 1;
    });
}
