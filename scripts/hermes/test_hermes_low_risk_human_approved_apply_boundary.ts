import assert from "node:assert/strict";
import { Client, type ClientConfig } from "pg";
import { previewProposalReviewApplyPlan } from "../app/api_boundary/proposal_review_apply_plan_preview_read_api_boundary";
import {
  DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
  DAY85_LOW_RISK_APPLY_DECISION_ID,
  DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
  runDay85LowRiskHumanApprovedApplyBoundary,
  type Day85ApplyEvent,
  type Day85Counts,
  type Day85ProposalMarker
} from "../../src/lib/hermes/hermes_low_risk_human_approved_apply_boundary";

const candidate = {
  crop: "ブロッコリー",
  variety: "ピクセル",
  field_name: "A圃場",
  sowing_date_text: "9/20",
  transplant_date_text: "11/15"
};

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? "farmos_local_admin",
    password: process.env.PGPASSWORD,
    application_name: "farmos_day85_low_risk_human_approved_apply_boundary"
  };
  return new Client(config);
}

async function main(): Promise<void> {
  const result = await runDay85LowRiskHumanApprovedApplyBoundary({
    getCounts,
    ensureFixture,
    previewNoOpCandidate,
    commitNoOpApply,
    readDay85Proposal,
    readDay85ApplyEvent
  });

  assert.equal(result.result, "ok");
  assert.equal(result.preview_operation, "no_op_candidate");
  assert.equal(result.committed_apply_event_created, true);
  assert.equal(result.no_op_apply_committed, true);
  assert.equal(result.app_projection_apply_performed, false);
  assert.equal(result.app_schema_write_performed, false);
  assert.equal(result.app_crop_cycles_insert_performed, false);
  assert.equal(result.ai_proposal_apply_marker_updated, true);
  assert.equal(result.proposal_status_updated, false);
  assert.equal(result.confirmation_token_created, false);
  assert.equal(result.day81_proposal_changed, false);
  assert.equal(result.protected_proposal_changed, false);
  assert.equal(result.protected_crop_cycle_exists, true);
  assert.equal(result.counts_after.day85_proposal_count, 1);
  assert.equal(result.counts_after.day85_decision_count, 1);
  assert.equal(result.counts_after.day85_apply_count, 1);
  assert.equal(result.counts_after.app_crop_cycles_count, result.counts_before.app_crop_cycles_count);
  assert.equal(result.proposal.status, "approved");
  assert.equal(result.proposal.applied_by, "hayate");
  assert.notEqual(result.proposal.applied_at, null);
  assert.equal(result.apply_event.apply_operation, "no_op_candidate");
  assert.equal(result.apply_event.result, "applied");
  assert.equal(result.apply_event.dry_run, false);
  assert.equal(result.apply_event.committed, true);
  assert.equal(result.apply_event.app_projection_apply_performed, false);
  assert.equal(result.apply_event.ai_proposal_apply_marker_updated, true);
  assert.equal(result.apply_event.inserted_crop_cycle_id, null);
  assert.equal(result.apply_event.applied_by, "hayate");
  assert.equal(result.apply_event.applied_by_role, "owner");
  assert.equal(result.apply_event.apply_source, "day85_low_risk_human_approved_apply_boundary");

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_low_risk_human_approved_apply_boundary",
    proposal_id: result.proposal_id,
    proposal_created: result.proposal_created,
    decision_created: result.decision_created,
    preview_result: result.preview_result,
    preview_operation: result.preview_operation,
    apply_inserted: result.apply_inserted,
    marker_updated: result.marker_updated,
    committed_apply_event_created: result.committed_apply_event_created,
    no_op_apply_committed: result.no_op_apply_committed,
    app_projection_apply_performed: result.app_projection_apply_performed,
    app_schema_write_performed: result.app_schema_write_performed,
    app_crop_cycles_insert_performed: result.app_crop_cycles_insert_performed,
    app_crop_cycles_update_performed: result.app_crop_cycles_update_performed,
    app_crop_cycles_delete_performed: result.app_crop_cycles_delete_performed,
    ai_proposal_apply_marker_updated: result.ai_proposal_apply_marker_updated,
    proposal_status_updated: result.proposal_status_updated,
    confirmation_token_created: result.confirmation_token_created,
    day81_proposal_changed: result.day81_proposal_changed,
    protected_proposal_changed: result.protected_proposal_changed,
    protected_crop_cycle_exists: result.protected_crop_cycle_exists,
    proposal_count_before: result.counts_before.proposal_count,
    proposal_count_after: result.counts_after.proposal_count,
    decision_history_count_before: result.counts_before.decision_history_count,
    decision_history_count_after: result.counts_after.decision_history_count,
    apply_history_count_before: result.counts_before.apply_history_count,
    apply_history_count_after: result.counts_after.apply_history_count,
    day85_proposal_count_after: result.counts_after.day85_proposal_count,
    day85_decision_count_after: result.counts_after.day85_decision_count,
    day85_apply_count_after: result.counts_after.day85_apply_count,
    app_crop_cycles_count_before: result.counts_before.app_crop_cycles_count,
    app_crop_cycles_count_after: result.counts_after.app_crop_cycles_count,
    applied_by: result.proposal.applied_by,
    applied_at_present: result.proposal.applied_at !== null,
    apply_event: result.apply_event
  }, null, 2));
}

async function ensureFixture(): Promise<{ proposalCreated: boolean; decisionCreated: boolean }> {
  const client = createClient();
  await client.connect();
  try {
    await client.query("begin");

    const proposalResult = await client.query(
      `
        insert into ai.proposal_inbox (
          id,
          proposal_type,
          title,
          body,
          risk_level,
          status,
          payload_json,
          source_refs_json,
          reviewed_by,
          reviewed_at,
          review_note,
          applied_by,
          applied_at
        )
        values (
          $1,
          'day34_apply_command_test',
          'Day85 low-risk human approved no-op apply fixture',
          'Day85 low-risk human approved no-op apply fixture',
          'low',
          'approved',
          $2::jsonb,
          $3::jsonb,
          'hayate',
          now(),
          'Day85 fixture. Human approved low-risk no-op apply boundary.',
          null,
          null
        )
        on conflict (id) do nothing
        returning id
      `,
      [
        DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
        JSON.stringify({
          day: 85,
          fixture: true,
          candidate,
          apply_intent: "future_crop_cycle_projection_apply",
          target_table: "crop_cycles",
          target_schema: "app"
        }),
        JSON.stringify({
          day85_low_risk_apply_boundary_test_id: DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
          boundary: "day85_low_risk_human_approved_no_op_apply_boundary",
          fixture: true
        })
      ]
    );

    const decisionResult = await client.query(
      `
        insert into audit.proposal_review_decision_events (
          id,
          proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata
        )
        values (
          $1,
          $2,
          'approve_review',
          'Day85 human approval fixture for low-risk no-op apply boundary.',
          'hayate',
          'owner',
          'local_cli',
          $3::jsonb
        )
        on conflict (id) do nothing
        returning id
      `,
      [
        DAY85_LOW_RISK_APPLY_DECISION_ID,
        DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
        JSON.stringify({
          day85_low_risk_apply_boundary_test_id: DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
          boundary: "day85_low_risk_human_approved_no_op_apply_boundary",
          human_approved: true,
          apply_ready: true,
          apply_performed: false,
          app_db_write_performed: false
        })
      ]
    );

    await client.query("commit");
    return {
      proposalCreated: proposalResult.rowCount === 1,
      decisionCreated: decisionResult.rowCount === 1
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function previewNoOpCandidate(): Promise<{ operation: string; result: string }> {
  const preview = await previewProposalReviewApplyPlan({
    proposalId: DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
    allowPrivilegedReadOnlyCaller: true
  }) as { result?: string; preview?: { operation?: string } };

  return {
    result: String(preview.result ?? ""),
    operation: String(preview.preview?.operation ?? "")
  };
}

async function commitNoOpApply(): Promise<{ applyInserted: boolean; markerUpdated: boolean }> {
  const client = createClient();
  await client.connect();
  try {
    await client.query("begin");

    const existing = await client.query(
      `
        select id
        from audit.proposal_review_apply_events
        where proposal_id = $1
          and committed = true
        limit 1
      `,
      [DAY85_LOW_RISK_APPLY_PROPOSAL_ID]
    );

    if ((existing.rowCount ?? 0) > 0) {
      await client.query("commit");
      return { applyInserted: false, markerUpdated: false };
    }

    const marker = await client.query(
      `
        update ai.proposal_inbox
        set
          applied_by = 'hayate',
          applied_at = now()
        where id = $1
          and status = 'approved'
          and risk_level = 'low'
          and applied_by is null
          and applied_at is null
        returning id
      `,
      [DAY85_LOW_RISK_APPLY_PROPOSAL_ID]
    );

    if ((marker.rowCount ?? 0) !== 1) {
      await client.query("rollback");
      throw new Error("day85_apply_marker_update_failed");
    }

    const apply = await client.query(
      `
        insert into audit.proposal_review_apply_events (
          proposal_id,
          apply_operation,
          result,
          dry_run,
          committed,
          app_projection_apply_performed,
          ai_proposal_apply_marker_updated,
          inserted_crop_cycle_id,
          applied_by,
          applied_by_role,
          apply_source,
          event_metadata
        )
        values (
          $1,
          'no_op_candidate',
          'applied',
          false,
          true,
          false,
          true,
          null,
          'hayate',
          'owner',
          'day85_low_risk_human_approved_apply_boundary',
          $2::jsonb
        )
        returning id
      `,
      [
        DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
        JSON.stringify({
          day85_low_risk_apply_boundary_test_id: DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
          boundary: "day85_low_risk_human_approved_no_op_apply_boundary",
          human_approved: true,
          low_risk: true,
          no_op_apply: true,
          app_projection_apply_performed: false,
          app_schema_write_performed: false,
          app_crop_cycles_insert_performed: false,
          confirmation_token_created: false
        })
      ]
    );

    if ((apply.rowCount ?? 0) !== 1) {
      await client.query("rollback");
      throw new Error("day85_apply_event_insert_failed");
    }

    await client.query("commit");
    return { applyInserted: true, markerUpdated: true };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function getCounts(): Promise<Day85Counts> {
  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(`
      select
        (select count(*)::int from ai.proposal_inbox) as proposal_count,
        (select count(*)::int from audit.proposal_review_decision_events) as decision_history_count,
        (select count(*)::int from audit.proposal_review_apply_events) as apply_history_count,
        (select count(*)::int from ai.proposal_inbox
         where id = '${DAY85_LOW_RISK_APPLY_PROPOSAL_ID}'::uuid) as day85_proposal_count,
        (select count(*)::int from audit.proposal_review_decision_events
         where event_metadata->>'day85_low_risk_apply_boundary_test_id' = '${DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID}') as day85_decision_count,
        (select count(*)::int from audit.proposal_review_apply_events
         where event_metadata->>'day85_low_risk_apply_boundary_test_id' = '${DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID}') as day85_apply_count,
        (select count(*)::int from app.crop_cycles) as app_crop_cycles_count,
        exists (select 1 from app.crop_cycles where id = 2) as protected_crop_cycle_exists,
        (select status from ai.proposal_inbox where id = '14711111-88db-41fd-a048-1c37266fd9e0') as day81_status,
        (select applied_by from ai.proposal_inbox where id = '14711111-88db-41fd-a048-1c37266fd9e0') as day81_applied_by,
        (select applied_at::text from ai.proposal_inbox where id = '14711111-88db-41fd-a048-1c37266fd9e0') as day81_applied_at,
        (select status from ai.proposal_inbox where id = '24fc24ee-8efa-436b-8424-9703edeeb297') as protected_status,
        (select applied_by from ai.proposal_inbox where id = '24fc24ee-8efa-436b-8424-9703edeeb297') as protected_applied_by,
        (select applied_at::text from ai.proposal_inbox where id = '24fc24ee-8efa-436b-8424-9703edeeb297') as protected_applied_at
    `);
    return result.rows[0] as Day85Counts;
  } finally {
    await client.end();
  }
}

async function readDay85Proposal(): Promise<Day85ProposalMarker | null> {
  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(
      `
        select
          id::text,
          proposal_type,
          title,
          risk_level,
          status,
          reviewed_by,
          reviewed_at::text,
          applied_by,
          applied_at::text
        from ai.proposal_inbox
        where id = $1
      `,
      [DAY85_LOW_RISK_APPLY_PROPOSAL_ID]
    );
    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

async function readDay85ApplyEvent(): Promise<Day85ApplyEvent | null> {
  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(
      `
        select
          id::text,
          proposal_id::text,
          apply_operation,
          result,
          dry_run,
          committed,
          app_projection_apply_performed,
          ai_proposal_apply_marker_updated,
          inserted_crop_cycle_id,
          applied_by,
          applied_by_role,
          apply_source
        from audit.proposal_review_apply_events
        where event_metadata->>'day85_low_risk_apply_boundary_test_id' = $1
        order by created_at asc
        limit 1
      `,
      [DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID]
    );
    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
