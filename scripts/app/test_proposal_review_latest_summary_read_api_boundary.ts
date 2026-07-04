import { Client } from "pg";

import {
  listProposalReviewLatestSummariesReadModel,
  proposalReviewLatestSummaryReadTypes,
  type ProposalReviewLatestSummaryReadBoundary,
  type ProposalReviewLatestSummaryReadModel,
} from "./api_boundary/proposal_review_latest_summary_read_api_boundary.ts";

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME,
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  });
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}

async function queryScalar<T>(client: Client, sql: string): Promise<T> {
  const result = await client.query(sql);
  return result.rows[0].value as T;
}

async function readProposalSnapshot(client: Client): Promise<string> {
  const result = await client.query(`
    select jsonb_agg(
      jsonb_build_object(
        'id', id::text,
        'proposal_type', proposal_type,
        'title', title,
        'status', status,
        'reviewed_by', reviewed_by,
        'reviewed_at', reviewed_at,
        'review_note', review_note,
        'applied_by', applied_by,
        'applied_at', applied_at
      )
      order by created_at desc, id asc
    ) as value
    from ai.proposal_inbox
  `);

  return stableJson(result.rows[0]?.value ?? []);
}

async function readCropCycleSnapshot(client: Client): Promise<string> {
  const result = await client.query(`
    select jsonb_agg(
      jsonb_build_object(
        'id', id,
        'source_extracted_fact_ids', source_extracted_fact_ids,
        'crop', crop,
        'variety', variety,
        'field_name', field_name,
        'sowing_date_text', sowing_date_text,
        'transplant_date_text', transplant_date_text,
        'archived', archived
      )
      order by id
    ) as value
    from app.crop_cycles
  `);

  return stableJson(result.rows[0]?.value ?? []);
}

function assertReadBoundary(boundary: ProposalReviewLatestSummaryReadBoundary): void {
  assert(boundary.transaction_read_only === true, "transaction must be read only");
  assert(boundary.writes_performed === false, "writes_performed must be false");
  assert(boundary.app_schema_write_allowed === false, "app schema write must not be allowed");
  assert(boundary.ai_proposal_write_allowed === false, "ai proposal write must not be allowed");
  assert(
    boundary.audit_event_write_allowed === true,
    "audit event insert may remain allowed for the Day24 CLI boundary, but this Day27 boundary must not write",
  );
}

function assertTargetSummary(summary: ProposalReviewLatestSummaryReadModel): void {
  assert(
    summary.proposal_id === proposalReviewLatestSummaryReadTypes.targetProposalId,
    "target proposal id must match",
  );
  assert(summary.status === "pending", "target proposal status must remain pending");
  assert(
    typeof summary.latest_event_id === "string" && summary.latest_event_id.length > 0,
    "latest event id must exist",
  );
  assert(
    ["approve_review", "reject_review", "request_revision", "defer_review"].includes(
      summary.decision_type,
    ),
    "latest decision_type must be an allowed review decision type",
  );
  assert(summary.decided_by === "hayate", "decided_by must remain hayate");
  assert(summary.decided_by_role === "owner", "decided_by_role must remain owner");
  assert(summary.decision_source === "local_cli", "decision_source must remain local_cli");
  assert(
    summary.decision_note === null || typeof summary.decision_note === "string",
    "decision_note must be null or string",
  );
  assert(summary.event_metadata !== null, "event_metadata must exist");
}

async function main(): Promise<void> {
  const client = createClient();

  await client.connect();

  try {
    const eventCountBefore = await queryScalar<string>(
      client,
      "select count(*)::text as value from audit.proposal_review_decision_events",
    );
    const proposalSnapshotBefore = await readProposalSnapshot(client);
    const cropCycleSnapshotBefore = await readCropCycleSnapshot(client);

    const listResult = await listProposalReviewLatestSummariesReadModel();

    assert(listResult.result === "ok", "list result must be ok");

    if (listResult.result !== "ok") {
      throw new Error("unreachable");
    }

    assertReadBoundary(listResult.boundary);
    assert(listResult.proposals.length >= 1, "proposal_count must be at least 1");

    const targetSummary = listResult.proposals.find(
      (proposal) => proposal.proposal_id === proposalReviewLatestSummaryReadTypes.targetProposalId,
    );

    assert(targetSummary !== undefined, "target proposal must be included in list summary");
    assertTargetSummary(targetSummary);

    const eventCountAfter = await queryScalar<string>(
      client,
      "select count(*)::text as value from audit.proposal_review_decision_events",
    );
    const proposalSnapshotAfter = await readProposalSnapshot(client);
    const cropCycleSnapshotAfter = await readCropCycleSnapshot(client);

    assert(Number(eventCountBefore) >= 1, "audit event count before must be at least 1");
    assert(
      eventCountAfter === eventCountBefore,
      "audit event count must remain unchanged by read boundary",
    );
    assert(
      proposalSnapshotBefore === proposalSnapshotAfter,
      "ai.proposal_inbox snapshot must remain unchanged",
    );
    assert(
      cropCycleSnapshotBefore === cropCycleSnapshotAfter,
      "app.crop_cycles snapshot must remain unchanged",
    );

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checks: {
            proposal_count: listResult.proposals.length,
            target_proposal_id: targetSummary.proposal_id,
            latest_event_id: targetSummary.latest_event_id,
            latest_decision_type: targetSummary.decision_type,
            latest_decided_by: targetSummary.decided_by,
            latest_decision_source: targetSummary.decision_source,
            audit_event_count_before: eventCountBefore,
            audit_event_count_after: eventCountAfter,
            proposal_snapshot_unchanged: proposalSnapshotBefore === proposalSnapshotAfter,
            crop_cycle_snapshot_unchanged: cropCycleSnapshotBefore === cropCycleSnapshotAfter,
            writes_performed: listResult.boundary.writes_performed,
            transaction_read_only: listResult.boundary.transaction_read_only,
            app_schema_write_allowed: listResult.boundary.app_schema_write_allowed,
            ai_proposal_write_allowed: listResult.boundary.ai_proposal_write_allowed,
            audit_event_write_allowed: listResult.boundary.audit_event_write_allowed,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
