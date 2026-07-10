import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID,
  createDay81MockProposalDraftCandidate,
  createDay81ProposalDraftRecordFromCandidate,
  persistHermesProposalDraftCandidateForDay81,
  type HermesDay81PersistedProposal,
  type HermesDay81ProposalDraftRecord
} from "../../src/lib/hermes/hermes_proposal_draft_persistence_boundary";

type Snapshot = {
  proposal_count: number;
  day81_existing_count: number;
  apply_history_count: number;
  crop_cycles_count: number;
  protected_proposal_status: string | null;
  protected_proposal_applied_at: string | null;
  protected_proposal_applied_by: string | null;
  protected_crop_cycle_exists: boolean;
};

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function runPsql(sql: string): string {
  const database = process.env.PGDATABASE || "farmos_core_local";
  const result = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "farmos_local_admin",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-AtX",
      "-c",
      sql
    ],
    {
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        "psql_failed",
        `status=${result.status}`,
        `stdout=${result.stdout}`,
        `stderr=${result.stderr}`
      ].join("\n")
    );
  }

  return result.stdout.trim();
}

function runPsqlJson<T>(sql: string): T {
  const output = runPsql(sql);
  const lines = output.split(/\r?\n/).filter(Boolean);
  const lastLine = lines.at(-1);

  if (!lastLine) {
    throw new Error("psql_json_empty_output");
  }

  return JSON.parse(lastLine) as T;
}

function readSnapshot(): Snapshot {
  return runPsqlJson<Snapshot>(`
select jsonb_build_object(
  'proposal_count', (select count(*)::int from ai.proposal_inbox),
  'day81_existing_count', (
    select count(*)::int
    from ai.proposal_inbox
    where source_refs_json->>'day81_persistence_boundary_test_id' =
      ${sqlLiteral(DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID)}
  ),
  'apply_history_count', (
    select count(*)::int from audit.proposal_review_apply_events
  ),
  'crop_cycles_count', (select count(*)::int from app.crop_cycles),
  'protected_proposal_status', (
    select status
    from ai.proposal_inbox
    where id = '24fc24ee-8efa-436b-8424-9703edeeb297'
  ),
  'protected_proposal_applied_at', (
    select applied_at::text
    from ai.proposal_inbox
    where id = '24fc24ee-8efa-436b-8424-9703edeeb297'
  ),
  'protected_proposal_applied_by', (
    select applied_by
    from ai.proposal_inbox
    where id = '24fc24ee-8efa-436b-8424-9703edeeb297'
  ),
  'protected_crop_cycle_exists', (
    select exists (
      select 1
      from app.crop_cycles
      where id = 2
    )
  )
)::text;
`);
}

async function findExistingByBoundaryTestId(
  boundaryTestId: string
): Promise<HermesDay81PersistedProposal | null> {
  const row = runPsqlJson<HermesDay81PersistedProposal | null>(`
select coalesce(
  (
    select jsonb_build_object(
      'id', id::text,
      'proposal_type', proposal_type,
      'title', title,
      'status', status
    )
    from ai.proposal_inbox
    where source_refs_json->>'day81_persistence_boundary_test_id' =
      ${sqlLiteral(boundaryTestId)}
    order by created_at asc
    limit 1
  ),
  'null'::jsonb
)::text;
`);

  return row;
}

async function insertProposal(
  record: HermesDay81ProposalDraftRecord
): Promise<HermesDay81PersistedProposal> {
  return runPsqlJson<HermesDay81PersistedProposal>(`
insert into ai.proposal_inbox (
  id,
  proposal_type,
  title,
  body,
  payload_json,
  source_refs_json,
  model_name,
  agent_name,
  confidence,
  reason,
  risk_level,
  status,
  created_at,
  updated_at
)
values (
  ${sqlLiteral(record.id)},
  ${sqlLiteral(record.proposal_type)},
  ${sqlLiteral(record.title)},
  ${sqlLiteral(record.body)},
  ${sqlJson(record.payload_json)},
  ${sqlJson(record.source_refs_json)},
  ${record.model_name === null ? "null" : sqlLiteral(record.model_name)},
  ${sqlLiteral(record.agent_name)},
  ${record.confidence === null ? "null" : record.confidence},
  ${sqlLiteral(record.reason)},
  ${sqlLiteral(record.risk_level)},
  ${sqlLiteral(record.status)},
  now(),
  now()
)
returning jsonb_build_object(
  'id', id::text,
  'proposal_type', proposal_type,
  'title', title,
  'status', status
)::text;
`);
}

async function main(): Promise<void> {
  const before = readSnapshot();

  assert.equal(before.apply_history_count, 3);
  assert.equal(before.protected_proposal_status, "pending");
  assert.equal(before.protected_proposal_applied_at, null);
  assert.equal(before.protected_proposal_applied_by, null);
  assert.equal(before.protected_crop_cycle_exists, true);

  const candidate = createDay81MockProposalDraftCandidate(
    "day81 proposal draft persistence boundary smoke"
  );

  const record = createDay81ProposalDraftRecordFromCandidate(candidate);

  const forbiddenBodyKey = ["proposal", "Body"].join("");
  const forbiddenPromptKey = ["system", "Prompt"].join("");
  const serializedRecord = JSON.stringify(record);

  assert.equal(Object.prototype.hasOwnProperty.call(record, forbiddenBodyKey), false);
  assert.equal(Object.prototype.hasOwnProperty.call(record, forbiddenPromptKey), false);
  assert.equal(serializedRecord.includes(forbiddenBodyKey), false);
  assert.equal(serializedRecord.includes(forbiddenPromptKey), false);

  const result = await persistHermesProposalDraftCandidateForDay81({
    candidate,
    executor: {
      findExistingByBoundaryTestId,
      insertProposal
    }
  });

  const after = readSnapshot();
  const expectedIncrease = before.day81_existing_count === 0 ? 1 : 0;

  assert.equal(after.proposal_count, before.proposal_count + expectedIncrease);
  assert.equal(
    after.day81_existing_count,
    before.day81_existing_count + expectedIncrease
  );
  assert.equal(after.apply_history_count, before.apply_history_count);
  assert.equal(after.crop_cycles_count, before.crop_cycles_count);
  assert.equal(after.protected_proposal_status, "pending");
  assert.equal(after.protected_proposal_applied_at, null);
  assert.equal(after.protected_proposal_applied_by, null);
  assert.equal(after.protected_crop_cycle_exists, true);

  assert.equal(result.proposal_draft_persistence_boundary, "day81_core_internal_test_only");
  assert.equal(result.proposal_draft_candidate_source, "mock");
  assert.equal(result.proposal_draft_candidate_id, candidate.id);
  assert.equal(result.proposal_draft_persisted, true);
  assert.equal(result.proposal_draft_saved, true);
  assert.equal(result.proposal_apply_ready, false);
  assert.equal(result.proposal_draft_apply_ready, false);
  assert.equal(result.proposal_apply_performed, false);
  assert.equal(result.confirmation_token_created, false);
  assert.equal(result.audit_apply_event_created, false);
  assert.equal(result.app_db_write_performed, false);
  assert.equal(result.db_write_performed, expectedIncrease === 1);
  assert.equal(result.insert_target_schema, "ai");
  assert.equal(result.insert_target_table, "proposal_inbox");
  assert.equal(result.ui_connected, false);
  assert.equal(result.api_route_added, false);
  assert.equal(result.server_action_used, false);
  assert.equal(result.form_action_used, false);
  assert.equal(result.persisted_proposal_status, "pending");

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_proposal_draft_persistence_boundary",
        proposal_count_before: before.proposal_count,
        proposal_count_after: after.proposal_count,
        day81_existing_count_before: before.day81_existing_count,
        day81_existing_count_after: after.day81_existing_count,
        inserted_this_run: expectedIncrease === 1,
        persisted_proposal_id: result.persisted_proposal_id,
        proposal_draft_persisted: result.proposal_draft_persisted,
        proposal_draft_saved: result.proposal_draft_saved,
        proposal_apply_ready: result.proposal_apply_ready,
        proposal_draft_apply_ready: result.proposal_draft_apply_ready,
        proposal_apply_performed: result.proposal_apply_performed,
        confirmation_token_created: result.confirmation_token_created,
        audit_apply_event_created: result.audit_apply_event_created,
        app_db_write_performed: result.app_db_write_performed,
        apply_history_count_before: before.apply_history_count,
        apply_history_count_after: after.apply_history_count,
        protected_proposal_status: after.protected_proposal_status,
        protected_crop_cycle_exists: after.protected_crop_cycle_exists
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
