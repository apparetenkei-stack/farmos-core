import { Client } from "pg";

export const proposalReviewDecisionTypes = [
  "approve_review",
  "reject_review",
  "request_revision",
  "defer_review",
] as const;

export type ProposalReviewDecisionType =
  (typeof proposalReviewDecisionTypes)[number];

export type ProposalReviewDecisionEventInput = {
  proposalId: string;
  decisionType: ProposalReviewDecisionType;
  decisionNote?: string;
  decidedBy: string;
  decidedByRole: string;
  decisionSource?: "local_cli" | "test" | "manual";
  eventMetadata?: Record<string, unknown>;
  commit?: boolean;
};

export type ProposalReviewDecisionEvent = {
  id: string;
  proposal_id: string;
  decision_type: ProposalReviewDecisionType;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  event_metadata: Record<string, unknown>;
  decided_at: string;
  created_at: string;
};

type BoundaryState = {
  mode: "proposal_review_decision_event_boundary";
  db_user: string | null;
  transaction_read_only: false;
  writes_attempted: boolean;
  writes_committed: boolean;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
};

export type ProposalReviewDecisionEventResult =
  | {
      result: "ok";
      committed: boolean;
      event: ProposalReviewDecisionEvent;
      boundary: BoundaryState;
    }
  | {
      result: "bad_request" | "proposal_not_found" | "error";
      committed: false;
      reason: string;
      boundary?: Partial<BoundaryState>;
    };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function isAllowedDecisionType(
  value: string,
): value is ProposalReviewDecisionType {
  return proposalReviewDecisionTypes.includes(
    value as ProposalReviewDecisionType,
  );
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
}

async function readBoundaryState(
  client: Client,
  writesAttempted: boolean,
  writesCommitted: boolean,
): Promise<BoundaryState> {
  const result = await client.query<{
    db_user: string;
    app_can_insert: boolean;
    app_can_update: boolean;
    app_can_delete: boolean;
    app_can_truncate: boolean;
    ai_can_insert: boolean;
    ai_can_update: boolean;
    ai_can_delete: boolean;
    ai_can_truncate: boolean;
  }>(`
    select
      current_user as db_user,
      has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_can_insert,
      has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE') as app_can_update,
      has_table_privilege(current_user, 'app.crop_cycles', 'DELETE') as app_can_delete,
      has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE') as app_can_truncate,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT') as ai_can_insert,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE') as ai_can_update,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE') as ai_can_delete,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE') as ai_can_truncate
  `);

  const row = result.rows[0];

  return {
    mode: "proposal_review_decision_event_boundary",
    db_user: row?.db_user ?? null,
    transaction_read_only: false,
    writes_attempted: writesAttempted,
    writes_committed: writesCommitted,
    app_schema_write_allowed: Boolean(
      row?.app_can_insert ||
        row?.app_can_update ||
        row?.app_can_delete ||
        row?.app_can_truncate,
    ),
    ai_proposal_write_allowed: Boolean(
      row?.ai_can_insert ||
        row?.ai_can_update ||
        row?.ai_can_delete ||
        row?.ai_can_truncate,
    ),
  };
}

export async function recordProposalReviewDecisionEvent(
  input: ProposalReviewDecisionEventInput,
): Promise<ProposalReviewDecisionEventResult> {
  if (!isUuid(input.proposalId)) {
    return {
      result: "bad_request",
      committed: false,
      reason: "proposalId must be a UUID",
    };
  }

  if (!isAllowedDecisionType(input.decisionType)) {
    return {
      result: "bad_request",
      committed: false,
      reason: "decisionType is not allowed",
    };
  }

  if (!input.decidedBy?.trim()) {
    return {
      result: "bad_request",
      committed: false,
      reason: "decidedBy is required",
    };
  }

  if (!input.decidedByRole?.trim()) {
    return {
      result: "bad_request",
      committed: false,
      reason: "decidedByRole is required",
    };
  }

  const eventMetadata = input.eventMetadata ?? {};
  if (!isPlainJsonObject(eventMetadata)) {
    return {
      result: "bad_request",
      committed: false,
      reason: "eventMetadata must be a JSON object",
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin");
    transactionStarted = true;

    const proposal = await client.query<{ id: string }>(
      `
        select id
        from ai.proposal_inbox
        where id = $1
        limit 1
      `,
      [input.proposalId],
    );

    if (proposal.rowCount === 0) {
      await client.query("rollback");
      transactionStarted = false;
      const boundary = await readBoundaryState(client, false, false);

      return {
        result: "proposal_not_found",
        committed: false,
        reason: "proposal not found",
        boundary,
      };
    }

    const inserted = await client.query<ProposalReviewDecisionEvent>(
      `
        insert into audit.proposal_review_decision_events (
          proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb)
        returning
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
      `,
      [
        input.proposalId,
        input.decisionType,
        input.decisionNote ?? null,
        input.decidedBy.trim(),
        input.decidedByRole.trim(),
        input.decisionSource ?? "local_cli",
        JSON.stringify(eventMetadata),
      ],
    );

    const shouldCommit = input.commit === true;

    if (shouldCommit) {
      await client.query("commit");
      transactionStarted = false;
    } else {
      await client.query("rollback");
      transactionStarted = false;
    }

    const boundary = await readBoundaryState(client, true, shouldCommit);

    return {
      result: "ok",
      committed: shouldCommit,
      event: inserted.rows[0],
      boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("rollback");
      } catch {
        // Keep original error.
      }
    }

    return {
      result: "error",
      committed: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function listProposalReviewDecisionEventsReadModel(input: {
  proposalId: string;
}): Promise<
  | {
      result: "ok";
      proposalId: string;
      events: ProposalReviewDecisionEvent[];
    }
  | {
      result: "bad_request" | "error";
      reason: string;
    }
> {
  if (!isUuid(input.proposalId)) {
    return {
      result: "bad_request",
      reason: "proposalId must be a UUID",
    };
  }

  const client = createClient();

  try {
    await client.connect();

    const events = await client.query<ProposalReviewDecisionEvent>(
      `
        select
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
        from audit.proposal_review_decision_events
        where proposal_id = $1
        order by decided_at desc, created_at desc, id desc
      `,
      [input.proposalId],
    );

    return {
      result: "ok",
      proposalId: input.proposalId,
      events: events.rows,
    };
  } catch (error) {
    return {
      result: "error",
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
