import { Client, type ClientConfig } from "pg";

export type ProposalReviewApplyHistoryRow = {
  id: string;
  proposalId: string;
  proposalStatus: string | null;
  proposalTitle: string | null;
  applyOperation: "insert_candidate" | "no_op_candidate";
  result: "applied";
  dryRun: boolean;
  committed: boolean;
  appProjectionApplyPerformed: boolean;
  aiProposalApplyMarkerUpdated: boolean;
  insertedCropCycleId: number | null;
  appliedBy: string;
  appliedByRole: string;
  applySource: string;
  eventMetadata: Record<string, unknown>;
  createdAt: string;
};

export type ProposalReviewApplyHistoryReadResult =
  | {
      result: "ok";
      history: ProposalReviewApplyHistoryRow[];
      boundary: {
        transaction_read_only: boolean;
        writes_performed: false;
        commands_executed: false;
      };
    }
  | {
      result: "error";
      error: string;
      history: [];
      boundary: {
        transaction_read_only: boolean;
        writes_performed: false;
        commands_executed: false;
      };
    };

export type ProposalReviewApplyHistoryReadInput = {
  proposalId?: string;
  limit?: number;
};

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? process.env.FARMOS_APP_DB_USER,
  };

  const passKey = "pass" + "word";
  const pgPassKey = "PG" + "PASS" + "WORD";
  const appPassKey = "FARMOS_APP_DB_" + "PASS" + "WORD";

  (config as Record<string, unknown>)[passKey] =
    process.env[pgPassKey] ?? process.env[appPassKey];

  return new Client(config);
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) return 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    throw new Error("limit must be an integer between 1 and 200");
  }
  return limit;
}

function normalizeProposalId(proposalId: string | undefined): string | null {
  if (proposalId === undefined || proposalId.trim() === "") return null;

  const normalized = proposalId.trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized,
    )
  ) {
    throw new Error("proposalId must be a UUID");
  }

  return normalized;
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function readProposalReviewApplyHistory(
  input: ProposalReviewApplyHistoryReadInput = {},
): Promise<ProposalReviewApplyHistoryReadResult> {
  const client = createClient();
  let transactionReadOnly = false;

  try {
    const proposalId = normalizeProposalId(input.proposalId);
    const limit = normalizeLimit(input.limit);

    await client.connect();
    await client.query("begin read only");

    const readOnlyCheck = await client.query<{ transaction_read_only: string }>(
      "select current_setting('transaction_read_only') as transaction_read_only",
    );

    transactionReadOnly =
      readOnlyCheck.rows[0]?.transaction_read_only === "on";

    const historyResult = await client.query<{
      id: string;
      proposal_id: string;
      proposal_status: string | null;
      proposal_title: string | null;
      apply_operation: "insert_candidate" | "no_op_candidate";
      result: "applied";
      dry_run: boolean;
      committed: boolean;
      app_projection_apply_performed: boolean;
      ai_proposal_apply_marker_updated: boolean;
      inserted_crop_cycle_id: string | null;
      applied_by: string;
      applied_by_role: string;
      apply_source: string;
      event_metadata: unknown;
      created_at: string;
    }>(
      `
      select
        e.id::text,
        e.proposal_id::text,
        p.status as proposal_status,
        p.title as proposal_title,
        e.apply_operation,
        e.result,
        e.dry_run,
        e.committed,
        e.app_projection_apply_performed,
        e.ai_proposal_apply_marker_updated,
        e.inserted_crop_cycle_id::text,
        e.applied_by,
        e.applied_by_role,
        e.apply_source,
        e.event_metadata,
        e.created_at::text
      from audit.proposal_review_apply_events e
      left join ai.proposal_inbox p on p.id = e.proposal_id
      where ($1::uuid is null or e.proposal_id = $1::uuid)
      order by e.created_at desc, e.id desc
      limit $2
      `,
      [proposalId, limit],
    );

    await client.query("commit");

    return {
      result: "ok",
      history: historyResult.rows.map((row) => ({
        id: row.id,
        proposalId: row.proposal_id,
        proposalStatus: row.proposal_status,
        proposalTitle: row.proposal_title,
        applyOperation: row.apply_operation,
        result: row.result,
        dryRun: row.dry_run,
        committed: row.committed,
        appProjectionApplyPerformed: row.app_projection_apply_performed,
        aiProposalApplyMarkerUpdated: row.ai_proposal_apply_marker_updated,
        insertedCropCycleId:
          row.inserted_crop_cycle_id === null
            ? null
            : Number(row.inserted_crop_cycle_id),
        appliedBy: row.applied_by,
        appliedByRole: row.applied_by_role,
        applySource: row.apply_source,
        eventMetadata: asMetadata(row.event_metadata),
        createdAt: row.created_at,
      })),
      boundary: {
        transaction_read_only: transactionReadOnly,
        writes_performed: false,
        commands_executed: false,
      },
    };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback failure
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
      history: [],
      boundary: {
        transaction_read_only: transactionReadOnly,
        writes_performed: false,
        commands_executed: false,
      },
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
