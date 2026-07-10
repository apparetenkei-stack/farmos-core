import assert from "node:assert/strict";
import { Client, type ClientConfig } from "pg";
import {
  DAY86_DAY81_PROPOSAL_ID,
  DAY86_PROTECTED_CROP_CYCLE_ID,
  DAY86_PROTECTED_PROPOSAL_ID,
  compareDay86AuditResults,
  evaluateDay86AuditSnapshot,
  type Day86ApplyEventRecord,
  type Day86AuditResult,
  type Day86AuditSnapshot,
  type Day86DecisionRecord,
  type Day86ProposalRecord,
  type Day86ProtectedProposalRecord
} from "../../src/lib/hermes/hermes_apply_audit_restore_verification_boundary";
import {
  DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
  DAY85_LOW_RISK_APPLY_PROPOSAL_ID
} from "../../src/lib/hermes/hermes_low_risk_human_approved_apply_boundary";

type CountRow = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  app_crop_cycles_count: number;
  protected_crop_cycle_exists: boolean;
};

function createClient(database: string): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database,
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? "farmos_local_admin",
    password: process.env.PGPASSWORD,
    application_name: "farmos_day86_apply_audit_restore_verification_boundary"
  };
  return new Client(config);
}

function asMetadata(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  throw new Error("day86_invalid_timestamp");
}

function asNullableIso(value: unknown): string | null {
  return value === null ? null : asIso(value);
}

async function readAuditSnapshot(database: string): Promise<Day86AuditSnapshot> {
  const client = createClient(database);
  await client.connect();

  try {
    await client.query("begin transaction read only");

    const runtime = await client.query<{
      source_database: string;
      transaction_read_only: boolean;
    }>(`
      select
        current_database() as source_database,
        current_setting('transaction_read_only') = 'on' as transaction_read_only
    `);

    const counts = await client.query<CountRow>(`
      select
        (select count(*)::int from ai.proposal_inbox) as proposal_count,
        (select count(*)::int from audit.proposal_review_decision_events)
          as decision_history_count,
        (select count(*)::int from audit.proposal_review_apply_events)
          as apply_history_count,
        (select count(*)::int from app.crop_cycles) as app_crop_cycles_count,
        exists (
          select 1 from app.crop_cycles where id = $1
        ) as protected_crop_cycle_exists
    `, [DAY86_PROTECTED_CROP_CYCLE_ID]);

    const proposalRows = await client.query(`
      select
        id::text, risk_level, status, reviewed_by, reviewed_at,
        applied_by, applied_at, source_refs_json
      from ai.proposal_inbox
      where id = $1
    `, [DAY85_LOW_RISK_APPLY_PROPOSAL_ID]);

    const decisionRows = await client.query(`
      select
        id::text, proposal_id::text, decision_type, decision_source,
        decided_by, decided_by_role, decided_at, created_at, event_metadata
      from audit.proposal_review_decision_events
      where proposal_id = $1
        and event_metadata->>'day85_low_risk_apply_boundary_test_id' = $2
      order by created_at, id
    `, [
      DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
      DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID
    ]);

    const applyRows = await client.query(`
      select
        id::text, proposal_id::text, apply_operation, result, dry_run,
        committed, app_projection_apply_performed,
        ai_proposal_apply_marker_updated, inserted_crop_cycle_id,
        applied_by, applied_by_role, apply_source, created_at, event_metadata
      from audit.proposal_review_apply_events
      where proposal_id = $1
        and event_metadata->>'day85_low_risk_apply_boundary_test_id' = $2
      order by created_at, id
    `, [
      DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
      DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID
    ]);

    const protectedRows = await client.query(`
      select id::text, status, applied_by, applied_at
      from ai.proposal_inbox
      where id = any($1::uuid[])
      order by id
    `, [[DAY86_DAY81_PROPOSAL_ID, DAY86_PROTECTED_PROPOSAL_ID]]);

    const runtimeRow = runtime.rows[0];
    const countRow = counts.rows[0];
    if (!runtimeRow || !countRow) throw new Error("day86_snapshot_query_failed");

    const proposals: Day86ProposalRecord[] = proposalRows.rows.map((row) => ({
      id: String(row.id),
      risk_level: String(row.risk_level),
      status: String(row.status),
      reviewed_by: row.reviewed_by === null ? null : String(row.reviewed_by),
      reviewed_at: asNullableIso(row.reviewed_at),
      applied_by: row.applied_by === null ? null : String(row.applied_by),
      applied_at: asNullableIso(row.applied_at),
      source_refs_json: asMetadata(row.source_refs_json)
    }));

    const decisions: Day86DecisionRecord[] = decisionRows.rows.map((row) => ({
      id: String(row.id),
      proposal_id: String(row.proposal_id),
      decision_type: String(row.decision_type),
      decision_source: String(row.decision_source),
      decided_by: String(row.decided_by),
      decided_by_role: String(row.decided_by_role),
      decided_at: asIso(row.decided_at),
      created_at: asIso(row.created_at),
      event_metadata: asMetadata(row.event_metadata)
    }));

    const applyEvents: Day86ApplyEventRecord[] = applyRows.rows.map((row) => ({
      id: String(row.id),
      proposal_id: String(row.proposal_id),
      apply_operation: String(row.apply_operation),
      result: String(row.result),
      dry_run: Boolean(row.dry_run),
      committed: Boolean(row.committed),
      app_projection_apply_performed: Boolean(row.app_projection_apply_performed),
      ai_proposal_apply_marker_updated: Boolean(row.ai_proposal_apply_marker_updated),
      inserted_crop_cycle_id:
        row.inserted_crop_cycle_id === null ? null : Number(row.inserted_crop_cycle_id),
      applied_by: String(row.applied_by),
      applied_by_role: String(row.applied_by_role),
      apply_source: String(row.apply_source),
      created_at: asIso(row.created_at),
      event_metadata: asMetadata(row.event_metadata)
    }));

    const protectedProposals: Day86ProtectedProposalRecord[] =
      protectedRows.rows.map((row) => ({
        id: String(row.id),
        status: String(row.status),
        applied_by: row.applied_by === null ? null : String(row.applied_by),
        applied_at: asNullableIso(row.applied_at)
      }));

    await client.query("rollback");

    return {
      source_database: runtimeRow.source_database,
      transaction_read_only: runtimeRow.transaction_read_only,
      proposal_count: countRow.proposal_count,
      decision_history_count: countRow.decision_history_count,
      apply_history_count: countRow.apply_history_count,
      app_crop_cycles_count: countRow.app_crop_cycles_count,
      protected_crop_cycle_exists: countRow.protected_crop_cycle_exists,
      proposals,
      decisions,
      apply_events: applyEvents,
      day81_proposal:
        protectedProposals.find((row) => row.id === DAY86_DAY81_PROPOSAL_ID) ?? null,
      protected_proposal:
        protectedProposals.find((row) => row.id === DAY86_PROTECTED_PROPOSAL_ID) ?? null
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

function assertAuditResult(result: Day86AuditResult): void {
  assert.equal(result.result, "ok");
  assert.equal(result.transaction_read_only, true);
  assert.equal(result.proposal_found, true);
  assert.equal(result.decision_found, true);
  assert.equal(result.apply_event_found, true);
  assert.equal(result.proposal_decision_link_valid, true);
  assert.equal(result.proposal_apply_link_valid, true);
  assert.equal(result.human_approval_valid, true);
  assert.equal(result.committed_apply_valid, true);
  assert.equal(result.no_op_apply_valid, true);
  assert.equal(result.single_apply_event_valid, true);
  assert.equal(result.proposal_marker_valid, true);
  assert.equal(result.actor_consistency_valid, true);
  assert.equal(result.timestamp_order_valid, true);
  assert.equal(result.app_projection_apply_performed, false);
  assert.equal(result.app_schema_write_detected, false);
  assert.equal(result.app_crop_cycles_count, 8);
  assert.equal(result.protected_crop_cycle_exists, true);
  assert.equal(result.day81_proposal_changed, false);
  assert.equal(result.protected_proposal_changed, false);
  assert.equal(result.business_data_invariant_valid, true);
  assert.equal(result.protected_records_invariant_valid, true);
  assert.equal(result.audit_chain_valid, true);
}

async function main(): Promise<void> {
  const localDatabase =
    process.env.FARMOS_DAY86_LOCAL_DATABASE ?? "farmos_core_local";
  const restoreDatabase =
    process.env.FARMOS_DAY86_RESTORE_DATABASE ?? "farmos_core_restore_test";

  const localResult = evaluateDay86AuditSnapshot(
    await readAuditSnapshot(localDatabase)
  );
  const restoreResult = evaluateDay86AuditSnapshot(
    await readAuditSnapshot(restoreDatabase)
  );

  assertAuditResult(localResult);
  assertAuditResult(restoreResult);

  const restoreConsistencyValid =
    compareDay86AuditResults(localResult, restoreResult);
  assert.equal(restoreConsistencyValid, true);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_apply_audit_restore_verification_boundary",
    local: localResult,
    restore: restoreResult,
    local_audit_valid: localResult.audit_chain_valid,
    restore_audit_valid: restoreResult.audit_chain_valid,
    restore_consistency_valid: restoreConsistencyValid
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
