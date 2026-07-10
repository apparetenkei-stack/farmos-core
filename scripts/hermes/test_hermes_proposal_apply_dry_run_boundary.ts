import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID,
  evaluateHermesProposalApplyDryRunForDay84,
  type HermesDay84ApplyHistorySummary,
  type HermesDay84DecisionSnapshot,
  type HermesDay84ProposalSnapshot
} from "../../src/lib/hermes/hermes_proposal_apply_dry_run_boundary";

async function main(): Promise<void> {
  const result = await evaluateHermesProposalApplyDryRunForDay84({
    proposalId: DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID,
    executor: {
      findProposalById,
      findDay83DecisionForProposal,
      getApplyHistorySummary
    }
  });

  assert.equal(result.result, "ok");
  assert.equal(result.dry_run_evaluated, true);
  assert.equal(result.dry_run_event_persisted, false);
  assert.equal(result.dry_run_candidate.dry_run, true);
  assert.equal(result.dry_run_candidate.committed, false);
  assert.equal(result.dry_run_candidate.would_insert_audit_apply_event, false);
  assert.equal(result.dry_run_candidate.would_update_ai_proposal, false);
  assert.equal(result.dry_run_candidate.would_write_app_schema, false);
  assert.equal(result.apply_history_count_after, result.apply_history_count_before);
  assert.equal(result.day84_apply_dry_run_count_after, result.day84_apply_dry_run_count_before);
  assert.equal(result.day84_apply_dry_run_count_after, 0);
  assert.equal(result.proposal_inbox_updated, false);
  assert.equal(result.ai_proposal_status_updated, false);
  assert.equal(result.proposal_draft_apply_ready, false);
  assert.equal(result.proposal_apply_ready, false);
  assert.equal(result.proposal_apply_performed, false);
  assert.equal(result.committed_apply_event_created, false);
  assert.equal(result.confirmation_token_created, false);
  assert.equal(result.audit_apply_event_created, false);
  assert.equal(result.app_db_write_performed, false);
  assert.equal(result.app_schema_write_performed, false);
  assert.equal(result.protected_crop_cycle_exists, true);

  const finalState = await getApplyHistorySummary();
  assert.equal(finalState.apply_history_count, result.apply_history_count_before);
  assert.equal(finalState.day84_apply_dry_run_count, 0);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_proposal_apply_dry_run_boundary",
    dry_run_evaluated: result.dry_run_evaluated,
    dry_run_event_persisted: result.dry_run_event_persisted,
    dry_run_candidate: result.dry_run_candidate,
    apply_history_count_before: result.apply_history_count_before,
    apply_history_count_after: result.apply_history_count_after,
    day84_apply_dry_run_count_before: result.day84_apply_dry_run_count_before,
    day84_apply_dry_run_count_after: result.day84_apply_dry_run_count_after,
    proposal_inbox_updated: result.proposal_inbox_updated,
    ai_proposal_status_updated: result.ai_proposal_status_updated,
    proposal_draft_apply_ready: result.proposal_draft_apply_ready,
    proposal_apply_ready: result.proposal_apply_ready,
    proposal_apply_performed: result.proposal_apply_performed,
    committed_apply_event_created: result.committed_apply_event_created,
    confirmation_token_created: result.confirmation_token_created,
    audit_apply_event_created: result.audit_apply_event_created,
    app_db_write_performed: result.app_db_write_performed,
    app_schema_write_performed: result.app_schema_write_performed,
    protected_crop_cycle_exists: result.protected_crop_cycle_exists
  }, null, 2));
}

async function findProposalById(proposalId: string): Promise<HermesDay84ProposalSnapshot | null> {
  return jsonRows<HermesDay84ProposalSnapshot>(`
    select
      id::text as id,
      proposal_type,
      risk_level,
      status,
      reviewed_by,
      reviewed_at::text as reviewed_at,
      review_note,
      applied_at::text as applied_at,
      applied_by,
      source_refs_json->>'day81_persistence_boundary_test_id' as day81_test_id
    from ai.proposal_inbox
    where id = ${sqlLiteral(proposalId)}::uuid
    limit 1
  `)[0] ?? null;
}

async function findDay83DecisionForProposal(
  proposalId: string
): Promise<HermesDay84DecisionSnapshot | null> {
  return jsonRows<HermesDay84DecisionSnapshot>(`
    select
      id::text as id,
      proposal_id::text as proposal_id,
      decision_type,
      decision_source,
      event_metadata->>'review_only' as review_only,
      event_metadata->>'apply_ready' as apply_ready,
      event_metadata->>'apply_performed' as apply_performed,
      event_metadata->>'confirmation_token_created' as confirmation_token_created,
      event_metadata->>'app_db_write_performed' as app_db_write_performed
    from audit.proposal_review_decision_events
    where proposal_id = ${sqlLiteral(proposalId)}::uuid
      and event_metadata->>'day83_review_decision_boundary_test_id' = 'day83_review_decision_boundary_test_v1'
    order by created_at asc
    limit 1
  `)[0] ?? null;
}

async function getApplyHistorySummary(): Promise<HermesDay84ApplyHistorySummary> {
  return jsonRows<HermesDay84ApplyHistorySummary>(`
    select
      (select count(*)::int from ai.proposal_inbox) as proposal_count,
      (select count(*)::int from audit.proposal_review_decision_events) as decision_history_count,
      (select count(*)::int from audit.proposal_review_apply_events) as apply_history_count,
      (select count(*)::int from audit.proposal_review_decision_events
       where event_metadata->>'day83_review_decision_boundary_test_id' = 'day83_review_decision_boundary_test_v1') as day83_review_decision_count,
      (select count(*)::int from audit.proposal_review_apply_events
       where event_metadata->>'day84_apply_dry_run_boundary_test_id' = 'day84_apply_dry_run_boundary_test_v1') as day84_apply_dry_run_count,
      exists (select 1 from app.crop_cycles where id = 2) as protected_crop_cycle_exists
  `)[0];
}

function jsonRows<T>(sql: string): T[] {
  const database = process.env.PGDATABASE || "farmos_core_local";
  const wrappedSql = `select coalesce(json_agg(row_to_json(t))::text, '[]') from (${sql}) t;`;
  const result = spawnSync("docker", [
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
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql_failed");
  }

  return JSON.parse(result.stdout.trim() || "[]") as T[];
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
