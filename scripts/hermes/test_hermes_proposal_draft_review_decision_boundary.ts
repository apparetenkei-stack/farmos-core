import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID,
  createDay83MockReviewDecisionInput,
  recordHermesProposalDraftReviewDecisionForDay83,
  type HermesDay83ProposalSnapshot,
  type HermesDay83RecordedDecision,
  type HermesDay83ReviewDecisionInput
} from "../../src/lib/hermes/hermes_proposal_draft_review_decision_boundary";

async function main(): Promise<void> {
  const proposalCountBefore = scalarInt("select count(*)::int from ai.proposal_inbox");
  const decisionCountBefore = scalarInt("select count(*)::int from audit.proposal_review_decision_events");
  const applyCountBefore = scalarInt("select count(*)::int from audit.proposal_review_apply_events");
  const existingDecisionCountBefore = scalarInt(
    `select count(*)::int
     from audit.proposal_review_decision_events
     where event_metadata->>'day83_review_decision_boundary_test_id' = ${sqlLiteral(DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID)}`
  );

  const result = await recordHermesProposalDraftReviewDecisionForDay83({
    decision: createDay83MockReviewDecisionInput(),
    executor: {
      findProposalById,
      findExistingDecisionByBoundaryTestId,
      insertDecisionEvent
    }
  });

  const proposalCountAfter = scalarInt("select count(*)::int from ai.proposal_inbox");
  const decisionCountAfter = scalarInt("select count(*)::int from audit.proposal_review_decision_events");
  const applyCountAfter = scalarInt("select count(*)::int from audit.proposal_review_apply_events");
  const existingDecisionCountAfter = scalarInt(
    `select count(*)::int
     from audit.proposal_review_decision_events
     where event_metadata->>'day83_review_decision_boundary_test_id' = ${sqlLiteral(DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID)}`
  );
  const protectedProposal = jsonRows<{ status: string; applied_at: string | null; applied_by: string | null }>(`
    select status, applied_at::text as applied_at, applied_by
    from ai.proposal_inbox
    where id = '24fc24ee-8efa-436b-8424-9703edeeb297'
  `)[0];
  const protectedCropCycleExists = scalarBool(
    "select exists (select 1 from app.crop_cycles where id = 2)"
  );

  assert.equal(result.result, "ok");
  assert.equal(result.review_decision_recorded, true);
  assert.equal(result.review_decision_saved, true);
  assert.equal(result.proposal_inbox_updated, false);
  assert.equal(result.ai_proposal_status_updated, false);
  assert.equal(result.proposal_draft_apply_ready, false);
  assert.equal(result.proposal_apply_ready, false);
  assert.equal(result.proposal_apply_performed, false);
  assert.equal(result.confirmation_token_created, false);
  assert.equal(result.audit_apply_event_created, false);
  assert.equal(result.app_db_write_performed, false);
  assert.equal(result.app_schema_write_performed, false);
  assert.equal(proposalCountAfter, proposalCountBefore);
  assert.equal(applyCountAfter, applyCountBefore);
  assert.equal(existingDecisionCountAfter, 1);

  if (existingDecisionCountBefore === 0) {
    assert.equal(decisionCountAfter, decisionCountBefore + 1);
    assert.equal(result.review_decision_inserted, true);
  } else {
    assert.equal(decisionCountAfter, decisionCountBefore);
    assert.equal(result.review_decision_inserted, false);
  }

  assert.equal(protectedProposal.status, "pending");
  assert.equal(protectedProposal.applied_at, null);
  assert.equal(protectedProposal.applied_by, null);
  assert.equal(protectedCropCycleExists, true);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_proposal_draft_review_decision_boundary",
    proposal_count_before: proposalCountBefore,
    proposal_count_after: proposalCountAfter,
    decision_history_count_before: decisionCountBefore,
    decision_history_count_after: decisionCountAfter,
    day83_existing_decision_count_before: existingDecisionCountBefore,
    day83_existing_decision_count_after: existingDecisionCountAfter,
    review_decision_inserted: result.review_decision_inserted,
    review_decision_recorded: result.review_decision_recorded,
    review_decision_saved: result.review_decision_saved,
    proposal_inbox_updated: result.proposal_inbox_updated,
    ai_proposal_status_updated: result.ai_proposal_status_updated,
    proposal_draft_apply_ready: result.proposal_draft_apply_ready,
    proposal_apply_ready: result.proposal_apply_ready,
    proposal_apply_performed: result.proposal_apply_performed,
    confirmation_token_created: result.confirmation_token_created,
    audit_apply_event_created: result.audit_apply_event_created,
    app_db_write_performed: result.app_db_write_performed,
    app_schema_write_performed: result.app_schema_write_performed,
    apply_history_count_before: applyCountBefore,
    apply_history_count_after: applyCountAfter,
    protected_proposal_status: protectedProposal.status,
    protected_crop_cycle_exists: protectedCropCycleExists
  }, null, 2));
}

async function findProposalById(proposalId: string): Promise<HermesDay83ProposalSnapshot | null> {
  return jsonRows<HermesDay83ProposalSnapshot>(`
    select
      id::text as id,
      proposal_type,
      risk_level,
      status,
      applied_at::text as applied_at,
      applied_by,
      source_refs_json->>'day81_persistence_boundary_test_id' as day81_test_id
    from ai.proposal_inbox
    where id = ${sqlLiteral(proposalId)}::uuid
    limit 1
  `)[0] ?? null;
}

async function findExistingDecisionByBoundaryTestId(
  boundaryTestId: string
): Promise<HermesDay83RecordedDecision | null> {
  return jsonRows<HermesDay83RecordedDecision>(`
    select
      id::text as id,
      proposal_id::text as proposal_id,
      decision_type,
      decision_note,
      decided_by,
      decided_by_role,
      decision_source,
      event_metadata,
      decided_at::text as decided_at,
      created_at::text as created_at
    from audit.proposal_review_decision_events
    where event_metadata->>'day83_review_decision_boundary_test_id' = ${sqlLiteral(boundaryTestId)}
    order by created_at asc
    limit 1
  `)[0] ?? null;
}

async function insertDecisionEvent(
  decision: HermesDay83ReviewDecisionInput
): Promise<HermesDay83RecordedDecision> {
  const metadata = {
    boundary: "day83_core_review_decision_audit_only",
    source: "day83_review_decision_boundary_test",
    day83_review_decision_boundary_test_id: decision.boundary_test_id,
    review_only: true,
    apply_ready: false,
    apply_performed: false,
    confirmation_token_created: false,
    app_db_write_performed: false
  };

  const inserted = jsonRows<HermesDay83RecordedDecision>(`
    insert into audit.proposal_review_decision_events (
      id,
      proposal_id,
      decision_type,
      decision_note,
      decided_by,
      decided_by_role,
      decision_source,
      event_metadata,
      decided_at,
      created_at
    ) values (
      ${sqlLiteral(decision.event_id)}::uuid,
      ${sqlLiteral(decision.proposal_id)}::uuid,
      ${sqlLiteral(decision.decision_type)},
      ${sqlLiteral(decision.decision_note)},
      ${sqlLiteral(decision.decided_by)},
      ${sqlLiteral(decision.decided_by_role)},
      ${sqlLiteral(decision.decision_source)},
      ${sqlLiteral(JSON.stringify(metadata))}::jsonb,
      now(),
      now()
    )
    returning
      id::text as id,
      proposal_id::text as proposal_id,
      decision_type,
      decision_note,
      decided_by,
      decided_by_role,
      decision_source,
      event_metadata,
      decided_at::text as decided_at,
      created_at::text as created_at
  `)[0];

  if (!inserted) {
    throw new Error("insert_failed");
  }

  return inserted;
}

function jsonRows<T>(sql: string): T[] {
  const database = process.env.PGDATABASE || "farmos_core_local";
  const wrappedSql = `
    with __hermes_rows as (
      ${sql}
    )
    select coalesce(json_agg(row_to_json(__hermes_rows))::text, '[]')
    from __hermes_rows;
  `;
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
      "-t",
      "-A",
      "-c",
      wrappedSql
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql_failed");
  }

  return JSON.parse(result.stdout.trim() || "[]") as T[];
}

function scalarInt(sql: string): number {
  const value = jsonRows<{ value: number }>(`select (${sql})::int as value`)[0]?.value;
  return Number(value);
}

function scalarBool(sql: string): boolean {
  const value = jsonRows<{ value: boolean }>(`select (${sql})::boolean as value`)[0]?.value;
  return Boolean(value);
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
