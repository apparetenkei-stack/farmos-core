import { Client } from "pg";
import {
  getLatestProposalReviewDecisionReadModel,
  listProposalReviewDecisionEventsReadModel,
  proposalReviewDecisionReadTypes,
  type ProposalReviewDecisionEventReadModel,
  type ProposalReviewDecisionReadBoundary,
} from "./api_boundary/proposal_review_decision_read_api_boundary.ts";

const existingProposalId = "24fc24ee-8efa-436b-8424-9703edeeb297";

type SafetySnapshot = {
  auditEventCount: string;
  proposalInboxSnapshot: string;
  cropCyclesSnapshot: string;
};

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME,
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
    application_name: "farmos_test_proposal_review_decision_read_boundary",
    connectionTimeoutMillis: 5_000,
  });
}

async function readSafetySnapshot(): Promise<SafetySnapshot> {
  const client = createClient();

  try {
    await client.connect();

    const auditEventCountResult = await client.query<{ count: string }>(`
      select count(*)::text as count
      from audit.proposal_review_decision_events
    `);

    const proposalInboxResult = await client.query<{ snapshot: string }>(`
      select coalesce(
        jsonb_agg(
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
        ),
        '[]'::jsonb
      )::text as snapshot
      from ai.proposal_inbox
    `);

    const cropCyclesResult = await client.query<{ snapshot: string }>(`
      select coalesce(
        jsonb_agg(
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
        ),
        '[]'::jsonb
      )::text as snapshot
      from app.crop_cycles
    `);

    return {
      auditEventCount: auditEventCountResult.rows[0]?.count ?? "",
      proposalInboxSnapshot: proposalInboxResult.rows[0]?.snapshot ?? "",
      cropCyclesSnapshot: cropCyclesResult.rows[0]?.snapshot ?? "",
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

function isAllowedDecisionType(value: string): boolean {
  return proposalReviewDecisionReadTypes.some((type) => type === value);
}

function assertReadBoundary(boundary: ProposalReviewDecisionReadBoundary): void {
  assert(
    boundary.mode === "proposal_review_decision_read_boundary",
    "unexpected read boundary mode",
  );
  assert(boundary.db_user === "farmos_app_local", `unexpected db_user: ${boundary.db_user}`);
  assert(boundary.transaction_read_only === true, "transaction_read_only must be true");
  assert(boundary.writes_performed === false, "writes_performed must be false");
  assert(boundary.app_schema_write_allowed === false, "app_schema_write_allowed must be false");
  assert(boundary.ai_proposal_write_allowed === false, "ai_proposal_write_allowed must be false");
  assert(
    boundary.audit_event_write_allowed === true,
    "audit_event_write_allowed must remain true for the Day24 CLI append boundary",
  );
}

function assertEventBelongsToProposal(
  event: ProposalReviewDecisionEventReadModel,
  label: string,
): void {
  assert(event.id.length > 0, `${label} event id must be present`);
  assert(
    event.proposal_id === existingProposalId,
    `${label} proposal_id must match the requested proposal`,
  );
  assert(
    isAllowedDecisionType(event.decision_type),
    `${label} decision_type must be one of: ${proposalReviewDecisionReadTypes.join(", ")}`,
  );
  assert(event.decided_by.length > 0, `${label} decided_by must be present`);
  assert(event.decided_by_role.length > 0, `${label} decided_by_role must be present`);
  assert(event.decision_source.length > 0, `${label} decision_source must be present`);
  assert(event.decided_at.length > 0, `${label} decided_at must be present`);
  assert(event.created_at.length > 0, `${label} created_at must be present`);
}

async function main(): Promise<void> {
  const before = await readSafetySnapshot();

  const listResult = await listProposalReviewDecisionEventsReadModel({
    proposalId: existingProposalId,
  });

  console.log(
    JSON.stringify(
      {
        test: "listProposalReviewDecisionEventsReadModel existing proposal",
        proposal_id: existingProposalId,
        result: listResult.result,
        event_count: listResult.result === "ok" ? listResult.events.length : null,
        latest: listResult.result === "ok" ? listResult.latest : undefined,
        boundary: listResult.result === "ok" ? listResult.boundary : undefined,
        reason: listResult.result !== "ok" ? listResult.reason : undefined,
      },
      null,
      2,
    ),
  );

  assert(listResult.result === "ok", "list result must be ok");
  assert(listResult.proposalId === existingProposalId, "proposalId must round-trip");
  assert(listResult.events.length >= 0, "event count must be zero or greater");
  assertReadBoundary(listResult.boundary);

  if (listResult.events.length === 0) {
    assert(listResult.latest === null, "latest review decision must be null when no events exist");
  } else {
    assert(listResult.latest !== null, "latest review decision must exist when events exist");
    assertEventBelongsToProposal(listResult.latest, "list latest");

    const firstHistoryEvent = listResult.events[0];
    assertEventBelongsToProposal(firstHistoryEvent, "first history");

    assert(
      listResult.latest.id === firstHistoryEvent.id,
      "latest event must match the first history event",
    );
  }

  const latestResult = await getLatestProposalReviewDecisionReadModel({
    proposalId: existingProposalId,
  });

  console.log(
    JSON.stringify(
      {
        test: "getLatestProposalReviewDecisionReadModel existing proposal",
        proposal_id: existingProposalId,
        result: latestResult.result,
        latest: latestResult.result === "ok" ? latestResult.latest : undefined,
        boundary: latestResult.result === "ok" ? latestResult.boundary : undefined,
        reason: latestResult.result !== "ok" ? latestResult.reason : undefined,
      },
      null,
      2,
    ),
  );

  assert(latestResult.result === "ok", "latest result must be ok");
  assertReadBoundary(latestResult.boundary);

  if (listResult.events.length === 0) {
    assert(latestResult.latest === null, "latest result must be null when no events exist");
  } else {
    assert(latestResult.latest !== null, "latest result must exist when events exist");
    assertEventBelongsToProposal(latestResult.latest, "direct latest");

    assert(
      listResult.latest?.id === latestResult.latest.id,
      "list latest and direct latest must refer to the same event",
    );
  }

  const badRequestResult = await listProposalReviewDecisionEventsReadModel({
    proposalId: "not-a-uuid",
  });

  console.log(
    JSON.stringify(
      {
        test: "listProposalReviewDecisionEventsReadModel bad request",
        proposal_id: "not-a-uuid",
        result: badRequestResult.result,
        reason: badRequestResult.result === "bad_request" ? badRequestResult.reason : undefined,
      },
      null,
      2,
    ),
  );

  assert(badRequestResult.result === "bad_request", "invalid UUID must be bad_request");

  const after = await readSafetySnapshot();

  assert(
    after.auditEventCount === before.auditEventCount,
    "audit.proposal_review_decision_events count must not change",
  );
  assert(
    after.proposalInboxSnapshot === before.proposalInboxSnapshot,
    "ai.proposal_inbox review/apply/status snapshot must not change",
  );
  assert(
    after.cropCyclesSnapshot === before.cropCyclesSnapshot,
    "app.crop_cycles snapshot must not change",
  );

  console.log(
    JSON.stringify(
      {
        test: "safety snapshots",
        audit_event_count_before: before.auditEventCount,
        audit_event_count_after: after.auditEventCount,
        proposal_inbox_unchanged: after.proposalInboxSnapshot === before.proposalInboxSnapshot,
        crop_cycles_unchanged: after.cropCyclesSnapshot === before.cropCyclesSnapshot,
      },
      null,
      2,
    ),
  );

  console.log("proposal review decision read-only boundary tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
