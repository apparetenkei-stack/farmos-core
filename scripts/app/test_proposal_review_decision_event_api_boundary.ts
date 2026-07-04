import assert from "node:assert/strict";
import { Client } from "pg";
import {
  recordProposalReviewDecisionEvent,
} from "./api_boundary/proposal_review_decision_event_api_boundary";

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
}

async function readBaseline(client: Client) {
  const proposalCount = await client.query<{ count: string }>(
    "select count(*)::text as count from ai.proposal_inbox",
  );

  const proposal = await client.query<{
    id: string;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_note: string | null;
    applied_by: string | null;
    applied_at: string | null;
  }>(`
    select
      id,
      status,
      reviewed_by,
      reviewed_at,
      review_note,
      applied_by,
      applied_at
    from ai.proposal_inbox
    order by created_at desc, id asc
    limit 1
  `);

  const eventCount = await client.query<{ count: string }>(
    "select count(*)::text as count from audit.proposal_review_decision_events",
  );

  const cropCycles = await client.query<{ row_json: unknown }>(`
    select row_to_json(t) as row_json
    from (
      select
        id,
        source_extracted_fact_ids,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        archived
      from app.crop_cycles
      order by id
    ) t
  `);

  return {
    proposalCount: proposalCount.rows[0].count,
    proposal: proposal.rows[0],
    eventCount: eventCount.rows[0].count,
    cropCyclesJson: JSON.stringify(cropCycles.rows),
  };
}

async function main() {
  const client = createClient();
  await client.connect();

  try {
    const before = await readBaseline(client);

    assert.ok(before.proposal?.id, "expected at least one proposal");

    const validDryRun = await recordProposalReviewDecisionEvent({
      proposalId: before.proposal.id,
      decisionType: "approve_review",
      decisionNote: "Day24 dry-run boundary test. This must not be committed.",
      decidedBy: "day24-test",
      decidedByRole: "system_test",
      decisionSource: "test",
      eventMetadata: {
        test_name: "proposal_review_decision_event_boundary",
        dry_run: true,
      },
      commit: false,
    });

    assert.equal(validDryRun.result, "ok");
    assert.equal(validDryRun.committed, false);

    if (validDryRun.result === "ok") {
      assert.equal(validDryRun.boundary.writes_attempted, true);
      assert.equal(validDryRun.boundary.writes_committed, false);
      assert.equal(validDryRun.boundary.app_schema_write_allowed, false);
      assert.equal(validDryRun.boundary.ai_proposal_write_allowed, false);
    }

    const invalidUuid = await recordProposalReviewDecisionEvent({
      proposalId: "999999",
      decisionType: "approve_review",
      decidedBy: "day24-test",
      decidedByRole: "system_test",
      decisionSource: "test",
      commit: false,
    });

    assert.equal(invalidUuid.result, "bad_request");

    const invalidDecisionType = await recordProposalReviewDecisionEvent({
      proposalId: before.proposal.id,
      decisionType: "invalid_decision" as never,
      decidedBy: "day24-test",
      decidedByRole: "system_test",
      decisionSource: "test",
      commit: false,
    });

    assert.equal(invalidDecisionType.result, "bad_request");

    const missingProposal = await recordProposalReviewDecisionEvent({
      proposalId: "00000000-0000-4000-8000-000000000000",
      decisionType: "approve_review",
      decidedBy: "day24-test",
      decidedByRole: "system_test",
      decisionSource: "test",
      commit: false,
    });

    assert.equal(missingProposal.result, "proposal_not_found");

    const after = await readBaseline(client);

    assert.equal(after.proposalCount, before.proposalCount);
    assert.equal(after.eventCount, before.eventCount);
    assert.equal(after.cropCyclesJson, before.cropCyclesJson);

    assert.equal(after.proposal.id, before.proposal.id);
    assert.equal(after.proposal.status, before.proposal.status);
    assert.equal(after.proposal.reviewed_by, before.proposal.reviewed_by);
    assert.equal(after.proposal.reviewed_at, before.proposal.reviewed_at);
    assert.equal(after.proposal.review_note, before.proposal.review_note);
    assert.equal(after.proposal.applied_by, before.proposal.applied_by);
    assert.equal(after.proposal.applied_at, before.proposal.applied_at);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checks: {
            valid_dry_run_result: validDryRun.result,
            committed: validDryRun.committed,
            writes_attempted:
              validDryRun.result === "ok"
                ? validDryRun.boundary.writes_attempted
                : null,
            writes_committed:
              validDryRun.result === "ok"
                ? validDryRun.boundary.writes_committed
                : null,
            app_schema_write_allowed:
              validDryRun.result === "ok"
                ? validDryRun.boundary.app_schema_write_allowed
                : null,
            ai_proposal_write_allowed:
              validDryRun.result === "ok"
                ? validDryRun.boundary.ai_proposal_write_allowed
                : null,
            invalid_uuid_result: invalidUuid.result,
            invalid_decision_type_result: invalidDecisionType.result,
            missing_proposal_result: missingProposal.result,
            proposal_count_before: before.proposalCount,
            proposal_count_after: after.proposalCount,
            event_count_before: before.eventCount,
            event_count_after: after.eventCount,
            crop_cycles_unchanged: after.cropCyclesJson === before.cropCyclesJson,
            proposal_status_unchanged:
              after.proposal.status === before.proposal.status,
            proposal_review_fields_unchanged:
              after.proposal.reviewed_by === before.proposal.reviewed_by &&
              after.proposal.reviewed_at === before.proposal.reviewed_at &&
              after.proposal.review_note === before.proposal.review_note,
            proposal_apply_fields_unchanged:
              after.proposal.applied_by === before.proposal.applied_by &&
              after.proposal.applied_at === before.proposal.applied_at,
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
        reason: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
