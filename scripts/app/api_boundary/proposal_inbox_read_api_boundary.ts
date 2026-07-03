import { Client } from "pg";

export type ProposalInboxReadBoundary = {
  mode: "proposal_inbox_read_only_api_boundary";
  db_user: string;
  transaction_read_only: boolean;
  writes_performed: false;
  app_schema_write_allowed: boolean;
};

export type ProposalInboxListItem = {
  id: string;
  proposal_type: string;
  title: string;
  body: string;
  status: string;
  risk_level: string;
  confidence: string | null;
  model_name: string | null;
  agent_name: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProposalInboxDetail = ProposalInboxListItem & {
  payload_json: unknown;
  source_refs_json: unknown;
  reason: string | null;
  review_note: string | null;
};

export type ProposalInboxListResult =
  | {
      result: "ok";
      proposals: ProposalInboxListItem[];
      read_boundary: ProposalInboxReadBoundary;
    }
  | {
      result: "error";
      error: string;
      read_boundary?: ProposalInboxReadBoundary;
    };

export type ProposalInboxDetailResult =
  | {
      result: "ok";
      proposal: ProposalInboxDetail;
      read_boundary: ProposalInboxReadBoundary;
    }
  | {
      result: "not_found";
      proposal_id: string;
      read_boundary: ProposalInboxReadBoundary;
    }
  | {
      result: "bad_request";
      proposal_id: string;
      error: string;
      read_boundary?: ProposalInboxReadBoundary;
    }
  | {
      result: "error";
      proposal_id: string;
      error: string;
      read_boundary?: ProposalInboxReadBoundary;
    };

type DbReadBoundaryRow = {
  db_user: string;
  transaction_read_only: boolean;
  app_schema_write_allowed: boolean;
};

type ProposalInboxListRow = {
  id: string;
  proposal_type: string;
  title: string;
  body: string;
  status: string;
  risk_level: string;
  confidence: string | null;
  model_name: string | null;
  agent_name: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
  applied_by: string | null;
  applied_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProposalInboxDetailRow = ProposalInboxListRow & {
  payload_json: unknown;
  source_refs_json: unknown;
  reason: string | null;
  review_note: string | null;
};

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME,
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
    application_name: "farmos_proposal_inbox_read_only_boundary",
    connectionTimeoutMillis: 5_000,
  });
}

function toIsoString(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function mapListRow(row: ProposalInboxListRow): ProposalInboxListItem {
  return {
    id: row.id,
    proposal_type: row.proposal_type,
    title: row.title,
    body: row.body,
    status: row.status,
    risk_level: row.risk_level,
    confidence: row.confidence,
    model_name: row.model_name,
    agent_name: row.agent_name,
    reviewed_by: row.reviewed_by,
    reviewed_at: toIsoString(row.reviewed_at),
    applied_by: row.applied_by,
    applied_at: toIsoString(row.applied_at),
    created_at: toIsoString(row.created_at) ?? "",
    updated_at: toIsoString(row.updated_at) ?? "",
  };
}

function mapDetailRow(row: ProposalInboxDetailRow): ProposalInboxDetail {
  return {
    ...mapListRow(row),
    payload_json: row.payload_json,
    source_refs_json: row.source_refs_json,
    reason: row.reason,
    review_note: row.review_note,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function readBoundary(client: Client): Promise<ProposalInboxReadBoundary> {
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
      ) as app_schema_write_allowed
  `);

  const row = result.rows[0];

  return {
    mode: "proposal_inbox_read_only_api_boundary",
    db_user: row.db_user,
    transaction_read_only: row.transaction_read_only,
    writes_performed: false,
    app_schema_write_allowed: row.app_schema_write_allowed,
  };
}

export async function listProposalInboxReadModel(): Promise<ProposalInboxListResult> {
  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin read only");
    transactionStarted = true;

    const proposalsResult = await client.query<ProposalInboxListRow>(`
      select
        id::text as id,
        proposal_type,
        title,
        body,
        status,
        risk_level,
        confidence::text as confidence,
        model_name,
        agent_name,
        reviewed_by,
        reviewed_at,
        applied_by,
        applied_at,
        created_at,
        updated_at
      from ai.proposal_inbox
      order by created_at desc, id asc
      limit 100
    `);

    const boundary = await readBoundary(client);
    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      proposals: proposalsResult.rows.map(mapListRow),
      read_boundary: boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function showProposalInboxReadModel(input: {
  proposalId: string;
}): Promise<ProposalInboxDetailResult> {
  const proposalId = input.proposalId;

  if (!isUuid(proposalId)) {
    return {
      result: "bad_request",
      proposal_id: proposalId,
      error: "proposalId must be a UUID because ai.proposal_inbox.id is uuid",
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin read only");
    transactionStarted = true;

    const proposalResult = await client.query<ProposalInboxDetailRow>(
      `
      select
        id::text as id,
        proposal_type,
        title,
        body,
        payload_json,
        source_refs_json,
        model_name,
        agent_name,
        confidence::text as confidence,
        reason,
        risk_level,
        status,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_at,
        applied_by,
        created_at,
        updated_at
      from ai.proposal_inbox
      where id = $1::uuid
      limit 1
    `,
      [proposalId],
    );

    const boundary = await readBoundary(client);

    await client.query("commit");
    transactionStarted = false;

    if (proposalResult.rowCount === 0) {
      return {
        result: "not_found",
        proposal_id: proposalId,
        read_boundary: boundary,
      };
    }

    return {
      result: "ok",
      proposal: mapDetailRow(proposalResult.rows[0]),
      read_boundary: boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      proposal_id: proposalId,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
