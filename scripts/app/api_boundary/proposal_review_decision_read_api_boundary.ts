import { Client } from "pg";

export const proposalReviewDecisionReadTypes = [
  "approve_review",
  "reject_review",
  "request_revision",
  "defer_review",
] as const;

export type ProposalReviewDecisionReadType =
  (typeof proposalReviewDecisionReadTypes)[number];

export type ProposalReviewDecisionEventReadModel = {
  id: string;
  proposal_id: string;
  decision_type: ProposalReviewDecisionReadType;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  event_metadata: unknown;
  decided_at: string;
  created_at: string;
};

export type ProposalReviewDecisionReadBoundary = {
  mode: "proposal_review_decision_read_boundary";
  db_user: string;
  transaction_read_only: true;
  writes_performed: false;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
};

export type ProposalReviewDecisionReadResult =
  | {
      result: "ok";
      proposalId: string;
      events: ProposalReviewDecisionEventReadModel[];
      latest: ProposalReviewDecisionEventReadModel | null;
      boundary: ProposalReviewDecisionReadBoundary;
    }
  | {
      result: "bad_request";
      proposalId: string;
      reason: string;
    }
  | {
      result: "error";
      proposalId: string;
      reason: string;
      boundary?: Partial<ProposalReviewDecisionReadBoundary>;
    };

export type ProposalReviewDecisionLatestReadResult =
  | {
      result: "ok";
      proposalId: string;
      latest: ProposalReviewDecisionEventReadModel | null;
      boundary: ProposalReviewDecisionReadBoundary;
    }
  | {
      result: "bad_request";
      proposalId: string;
      reason: string;
    }
  | {
      result: "error";
      proposalId: string;
      reason: string;
      boundary?: Partial<ProposalReviewDecisionReadBoundary>;
    };

type DbReadBoundaryRow = {
  db_user: string;
  transaction_read_only: boolean;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
};

type ProposalReviewDecisionEventRow = {
  id: string;
  proposal_id: string;
  decision_type: ProposalReviewDecisionReadType;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  event_metadata: unknown;
  decided_at: Date | string;
  created_at: Date | string;
};

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME,
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
    application_name: "farmos_proposal_review_decision_read_boundary",
    connectionTimeoutMillis: 5_000,
  });
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapEventRow(row: ProposalReviewDecisionEventRow): ProposalReviewDecisionEventReadModel {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    decision_type: row.decision_type,
    decision_note: row.decision_note,
    decided_by: row.decided_by,
    decided_by_role: row.decided_by_role,
    decision_source: row.decision_source,
    event_metadata: row.event_metadata,
    decided_at: toIsoString(row.decided_at),
    created_at: toIsoString(row.created_at),
  };
}

async function readBoundary(client: Client): Promise<ProposalReviewDecisionReadBoundary> {
  const result = await client.query<DbReadBoundaryRow>(`
    select
      current_user as db_user,
      current_setting('transaction_read_only') = 'on' as transaction_read_only,
      exists (
        select 1
        from information_schema.tables t
        where t.table_schema = 'app'
          and t.table_type = 'BASE TABLE'
          and (
            has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'INSERT')
            or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'UPDATE')
            or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'DELETE')
            or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'TRUNCATE')
          )
      ) as app_schema_write_allowed,
      (
        has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE')
      ) as ai_proposal_write_allowed,
      has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT')
        as audit_event_write_allowed
  `);

  const row = result.rows[0];

  if (!row.transaction_read_only) {
    throw new Error("proposal review decision read boundary must run in a read-only transaction");
  }

  return {
    mode: "proposal_review_decision_read_boundary",
    db_user: row.db_user,
    transaction_read_only: true,
    writes_performed: false,
    app_schema_write_allowed: row.app_schema_write_allowed,
    ai_proposal_write_allowed: row.ai_proposal_write_allowed,
    audit_event_write_allowed: row.audit_event_write_allowed,
  };
}

export async function listProposalReviewDecisionEventsReadModel(input: {
  proposalId: string;
}): Promise<ProposalReviewDecisionReadResult> {
  const proposalId = input.proposalId;

  if (!isUuid(proposalId)) {
    return {
      result: "bad_request",
      proposalId,
      reason: "proposalId must be a UUID",
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin transaction read only");
    transactionStarted = true;

    const eventsResult = await client.query<ProposalReviewDecisionEventRow>(
      `
        select
          id::text as id,
          proposal_id::text as proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata,
          decided_at,
          created_at
        from audit.proposal_review_decision_events
        where proposal_id = $1::uuid
        order by decided_at desc, created_at desc, id desc
      `,
      [proposalId],
    );

    const latestResult = await client.query<ProposalReviewDecisionEventRow>(
      `
        select
          id::text as id,
          proposal_id::text as proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata,
          decided_at,
          created_at
        from audit.proposal_review_decision_latest
        where proposal_id = $1::uuid
        limit 1
      `,
      [proposalId],
    );

    const boundary = await readBoundary(client);

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      proposalId,
      events: eventsResult.rows.map(mapEventRow),
      latest: latestResult.rows[0] ? mapEventRow(latestResult.rows[0]) : null,
      boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      proposalId,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function getLatestProposalReviewDecisionReadModel(input: {
  proposalId: string;
}): Promise<ProposalReviewDecisionLatestReadResult> {
  const proposalId = input.proposalId;

  if (!isUuid(proposalId)) {
    return {
      result: "bad_request",
      proposalId,
      reason: "proposalId must be a UUID",
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin transaction read only");
    transactionStarted = true;

    const latestResult = await client.query<ProposalReviewDecisionEventRow>(
      `
        select
          id::text as id,
          proposal_id::text as proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata,
          decided_at,
          created_at
        from audit.proposal_review_decision_latest
        where proposal_id = $1::uuid
        limit 1
      `,
      [proposalId],
    );

    const boundary = await readBoundary(client);

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      proposalId,
      latest: latestResult.rows[0] ? mapEventRow(latestResult.rows[0]) : null,
      boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      proposalId,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
