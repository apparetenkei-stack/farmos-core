import { Client } from "pg";

export type ProposalReviewLatestSummaryReadBoundary = {
  transaction_read_only: boolean;
  writes_performed: false;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
};

export type ProposalReviewLatestSummaryReadModel = {
  proposal_id: string;
  proposal_type: string;
  title: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  latest_event_id: string | null;
  decision_type: string | null;
  decision_note: string | null;
  decided_by: string | null;
  decided_by_role: string | null;
  decision_source: string | null;
  event_metadata: Record<string, unknown> | null;
  decided_at: Date | null;
  latest_event_created_at: Date | null;
};

export type ProposalReviewLatestSummaryReadResult =
  | {
      result: "ok";
      proposals: ProposalReviewLatestSummaryReadModel[];
      boundary: ProposalReviewLatestSummaryReadBoundary;
    }
  | {
      result: "error";
      message: string;
      boundary?: ProposalReviewLatestSummaryReadBoundary;
    };

export const proposalReviewLatestSummaryReadTypes = {
  targetProposalId: "24fc24ee-8efa-436b-8424-9703edeeb297",
  targetLatestEventId: "6d749f3c-6dbc-4ff9-995e-aefed3b0663b",
  targetDecisionType: "defer_review",
} as const;

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME,
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  });
}

function toBoundary(row: Record<string, unknown>): ProposalReviewLatestSummaryReadBoundary {
  return {
    transaction_read_only: row.transaction_read_only === "on" || row.transaction_read_only === true,
    writes_performed: false,
    app_schema_write_allowed: row.app_schema_write_allowed === true,
    ai_proposal_write_allowed: row.ai_proposal_write_allowed === true,
    audit_event_write_allowed: row.audit_event_write_allowed === true,
  };
}

export async function listProposalReviewLatestSummariesReadModel(): Promise<ProposalReviewLatestSummaryReadResult> {
  const client = createClient();

  try {
    await client.connect();
    await client.query("begin transaction read only");

    const boundaryResult = await client.query<Record<string, unknown>>(`
      select
        current_setting('transaction_read_only') as transaction_read_only,
        has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_schema_write_allowed,
        has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT') as ai_proposal_write_allowed,
        has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT') as audit_event_write_allowed
    `);

    const boundary = toBoundary(boundaryResult.rows[0] ?? {});

    const proposalResult = await client.query<ProposalReviewLatestSummaryReadModel>(`
      select
        p.id::text as proposal_id,
        p.proposal_type,
        p.title,
        p.status,
        p.created_at,
        p.updated_at,
        l.id::text as latest_event_id,
        l.decision_type,
        l.decision_note,
        l.decided_by,
        l.decided_by_role,
        l.decision_source,
        l.event_metadata,
        l.decided_at,
        l.created_at as latest_event_created_at
      from ai.proposal_inbox p
      left join audit.proposal_review_decision_latest l
        on l.proposal_id = p.id
      order by p.created_at desc, p.id asc
    `);

    await client.query("commit");

    return {
      result: "ok",
      proposals: proposalResult.rows,
      boundary,
    };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Ignore rollback errors so the original error is preserved.
    }

    return {
      result: "error",
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end();
  }
}
