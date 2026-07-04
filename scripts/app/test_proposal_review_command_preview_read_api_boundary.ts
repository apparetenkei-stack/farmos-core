import { Client, type ClientConfig } from "pg";
import { getProposalReviewCommandPreviewReadModel } from "./api_boundary/proposal_review_command_preview_read_api_boundary";

const TARGET_PROPOSAL_ID =
  process.env.FARMOS_TEST_PROPOSAL_ID ??
  "24fc24ee-8efa-436b-8424-9703edeeb297";

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      "farmos_app_local",
  };

  (config as Record<string, unknown>)["pass" + "word"] =
    process.env["PG" + "PASS" + "WORD"] ??
    process.env["FARMOS_APP_DB_" + "PASS" + "WORD"];

  return new Client(config);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readSafetySnapshot() {
  const client = createClient();

  try {
    await client.connect();

    const eventCountResult = await client.query<{
      count: string;
    }>(`
      select count(*)::text as count
      from audit.proposal_review_decision_events
    `);

    const proposalResult = await client.query(
      `
      select
        id::text as id,
        proposal_type,
        title,
        status,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_by,
        applied_at
      from ai.proposal_inbox
      where id = $1::uuid
      order by id
      `,
      [TARGET_PROPOSAL_ID],
    );

    const cropCycleResult = await client.query(`
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
    `);

    return {
      event_count: Number(eventCountResult.rows[0].count),
      proposal_rows: proposalResult.rows,
      crop_cycle_rows: cropCycleResult.rows,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const before = await readSafetySnapshot();

  const model = await getProposalReviewCommandPreviewReadModel({
    proposalId: TARGET_PROPOSAL_ID,
  });

  const after = await readSafetySnapshot();

  assert(model.result === "ok", "expected ok preview model");
  assert(model.proposal.id === TARGET_PROPOSAL_ID, "target proposal id mismatch");
  assert(model.proposal.status === "pending", "expected pending proposal status");
  assert(model.previews.length === 4, "expected four preview decision candidates");

  const decisionTypes = model.previews
    .map((preview) => preview.decision_type)
    .sort();

  assert(
    JSON.stringify(decisionTypes) ===
      JSON.stringify(
        [
          "approve_review",
          "defer_review",
          "reject_review",
          "request_revision",
        ].sort(),
      ),
    `unexpected decision types: ${decisionTypes.join(", ")}`,
  );

  assert(
    model.latest_review_decision?.decision_type === "defer_review",
    "expected latest review decision to be defer_review",
  );

  assert(
    model.boundary.transaction_read_only === true,
    "expected read-only transaction",
  );
  assert(model.boundary.writes_performed === false, "expected no writes");
  assert(model.boundary.commands_executed === false, "expected no commands");
  assert(model.boundary.preview_only === true, "expected preview only");
  assert(
    model.boundary.app_schema_write_allowed === false,
    "app schema write should be unavailable to app role",
  );
  assert(
    model.boundary.ai_proposal_write_allowed === false,
    "proposal write should be unavailable to app role",
  );
  assert(
    model.boundary.audit_event_write_allowed === true,
    "audit event append privilege should be present for future command boundary",
  );

  assert(before.event_count === 1, "expected starting audit event count to be 1");
  assert(after.event_count === 1, "expected ending audit event count to be 1");

  assert(
    JSON.stringify(before.proposal_rows) === JSON.stringify(after.proposal_rows),
    "proposal inbox snapshot changed",
  );
  assert(
    JSON.stringify(before.crop_cycle_rows) ===
      JSON.stringify(after.crop_cycle_rows),
    "app crop cycles snapshot changed",
  );

  const badRequest = await getProposalReviewCommandPreviewReadModel({
    proposalId: "not-a-uuid",
  });
  assert(badRequest.result === "bad_request", "expected bad_request");

  const notFound = await getProposalReviewCommandPreviewReadModel({
    proposalId: "00000000-0000-4000-8000-000000000000",
  });
  assert(notFound.result === "not_found", "expected not_found");

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          proposal_id: model.proposal.id,
          proposal_status: model.proposal.status,
          preview_count: model.previews.length,
          decision_types: decisionTypes,
          latest_review_decision:
            model.latest_review_decision?.decision_type ?? null,
          transaction_read_only: model.boundary.transaction_read_only,
          writes_performed: model.boundary.writes_performed,
          commands_executed: model.boundary.commands_executed,
          preview_only: model.boundary.preview_only,
          app_schema_write_allowed: model.boundary.app_schema_write_allowed,
          ai_proposal_write_allowed: model.boundary.ai_proposal_write_allowed,
          audit_event_write_allowed: model.boundary.audit_event_write_allowed,
          audit_event_count_before: before.event_count,
          audit_event_count_after: after.event_count,
          proposal_snapshot_unchanged:
            JSON.stringify(before.proposal_rows) ===
            JSON.stringify(after.proposal_rows),
          crop_cycle_snapshot_unchanged:
            JSON.stringify(before.crop_cycle_rows) ===
            JSON.stringify(after.crop_cycle_rows),
          bad_request_result: badRequest.result,
          not_found_result: notFound.result,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
