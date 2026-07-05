import { Client } from "pg";

export const HERMES_REVIEW_LOOP_SCOPE = "hermes_proposal_review_loop_minimum" as const;
export const HERMES_NOTE_PROPOSAL_TYPE = "hermes_apply_blocker_explanation" as const;
export const PROTECTED_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297" as const;

const allowedHumanActions = [
  "keep_pending",
  "request_more_context",
  "mark_reviewed",
  "dismiss_without_apply",
] as const;

const disallowedActions = [
  "approve",
  "apply",
  "auto_apply",
  "create_proposal",
  "run_llm",
  "run_hermes",
  "run_openclaw",
  "read_restricted_domain",
  "write_app_schema",
] as const;

type ReviewState = "pending_human_review" | "not_reviewable" | "already_reviewed";

type HermesNoteRow = {
  id: string;
  proposal_type: string;
  status: string;
  title: string | null;
  reason: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProtectedProposalState = {
  id: string;
  status: string;
  applied_at: string | null;
  applied_by: string | null;
} | null;

type SafetySnapshot = {
  proposal_count: number;
  hermes_note_count: number;
  pending_hermes_note_count: number;
  apply_history_count: number;
  protected_proposal: ProtectedProposalState;
  crop_cycle_2_exists: boolean;
};

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "farmos_core_local",
    user: process.env.PGUSER ?? "farmos_app_local",
  });
}

async function withReadOnlyTransaction<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = createClient();
  await client.connect();

  try {
    await client.query("begin read only");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function readSafetySnapshot(client: Client): Promise<SafetySnapshot> {
  const proposalCount = await client.query(`
    select count(*)::int as count
    from ai.proposal_inbox
  `);

  const hermesNoteCount = await client.query(
    `
      select count(*)::int as count
      from ai.proposal_inbox
      where proposal_type = $1
    `,
    [HERMES_NOTE_PROPOSAL_TYPE],
  );

  const pendingHermesNoteCount = await client.query(
    `
      select count(*)::int as count
      from ai.proposal_inbox
      where proposal_type = $1
        and status = 'pending'
    `,
    [HERMES_NOTE_PROPOSAL_TYPE],
  );

  const applyHistoryCount = await client.query(`
    select count(*)::int as count
    from audit.proposal_review_apply_events
  `);

  const protectedProposal = await client.query(
    `
      select
        id::text,
        status,
        applied_at::text,
        applied_by
      from ai.proposal_inbox
      where id = $1::uuid
      limit 1
    `,
    [PROTECTED_PROPOSAL_ID],
  );

  const cropCycle = await client.query(`
    select exists(select 1 from app.crop_cycles where id = 2) as exists
  `);

  return {
    proposal_count: Number(proposalCount.rows[0]?.count ?? 0),
    hermes_note_count: Number(hermesNoteCount.rows[0]?.count ?? 0),
    pending_hermes_note_count: Number(pendingHermesNoteCount.rows[0]?.count ?? 0),
    apply_history_count: Number(applyHistoryCount.rows[0]?.count ?? 0),
    protected_proposal: protectedProposal.rows[0] ?? null,
    crop_cycle_2_exists: cropCycle.rows[0]?.exists === true,
  };
}

async function readHermesNotes(client: Client, limit: number): Promise<HermesNoteRow[]> {
  const result = await client.query(
    `
      select
        id::text,
        proposal_type,
        status,
        title,
        reason,
        created_at::text,
        updated_at::text
      from ai.proposal_inbox
      where proposal_type = $1
      order by created_at desc nulls last, id
      limit $2
    `,
    [HERMES_NOTE_PROPOSAL_TYPE, limit],
  );

  return result.rows;
}

function reviewStateForStatus(status: string): ReviewState {
  if (status === "pending") {
    return "pending_human_review";
  }

  if (["approved", "rejected", "dismissed", "applied"].includes(status)) {
    return "already_reviewed";
  }

  return "not_reviewable";
}

function buildReviewItem(note: HermesNoteRow) {
  return {
    proposal_id: note.id,
    proposal_type: note.proposal_type,
    status: note.status,
    title: note.title ?? "(untitled Hermes proposal note)",
    reason: note.reason ?? "",
    created_at: note.created_at,
    updated_at: note.updated_at,
    review_state: reviewStateForStatus(note.status),
    allowed_human_actions: [...allowedHumanActions],
    disallowed_actions: [...disallowedActions],
    protected_from_day42_command: note.id === PROTECTED_PROPOSAL_ID,
    restricted_domain_data_exposed: false,
  };
}

async function readDay41MemoryContextSummary() {
  try {
    const mod = await import("./hermes_memory_context_read_boundary");
    const candidate = mod as Record<string, unknown>;
    const fn =
      candidate.readHermesMemoryContext ??
      candidate.readHermesMemoryContextBoundary ??
      candidate.default;

    if (typeof fn !== "function") {
      return {
        available: false,
        result: "not_available",
        context_scope: "hermes_memory_context_minimum",
        note: "Day41 module was found, but no compatible exported function was detected.",
      };
    }

    const value = await fn({ limit: 5 });
    const result = value as Record<string, unknown>;

    return {
      available: true,
      result: typeof result.result === "string" ? result.result : "unknown",
      context_scope:
        typeof result.context_scope === "string"
          ? result.context_scope
          : "hermes_memory_context_minimum",
      restricted_domain_data_exposed: false,
    };
  } catch (error) {
    return {
      available: false,
      result: "not_available",
      context_scope: "hermes_memory_context_minimum",
      error: error instanceof Error ? error.message : String(error),
      restricted_domain_data_exposed: false,
    };
  }
}

function snapshotUnchanged(before: SafetySnapshot, after: SafetySnapshot): boolean {
  return (
    before.proposal_count === after.proposal_count &&
    before.hermes_note_count === after.hermes_note_count &&
    before.pending_hermes_note_count === after.pending_hermes_note_count &&
    before.apply_history_count === after.apply_history_count &&
    before.crop_cycle_2_exists === after.crop_cycle_2_exists &&
    before.protected_proposal?.status === after.protected_proposal?.status &&
    before.protected_proposal?.applied_at === after.protected_proposal?.applied_at &&
    before.protected_proposal?.applied_by === after.protected_proposal?.applied_by
  );
}

export async function readHermesProposalReviewLoop(options: { limit?: number } = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit ?? 20), 50));

  try {
    return await withReadOnlyTransaction(async (client) => {
      const before = await readSafetySnapshot(client);
      const memoryContext = await readDay41MemoryContextSummary();
      const notes = await readHermesNotes(client, limit);
      const after = await readSafetySnapshot(client);

      const reviewQueue = notes.map(buildReviewItem);

      return {
        result: "ok" as const,
        loop: {
          scope: HERMES_REVIEW_LOOP_SCOPE,
          source_context: {
            memory_context_scope: "hermes_memory_context_minimum",
            memory_context_available: memoryContext.available,
            memory_context_result: memoryContext.result,
            proposal_id: reviewQueue[0]?.proposal_id ?? null,
            proposal_status: reviewQueue[0]?.status ?? null,
            hermes_note_count: after.hermes_note_count,
            pending_hermes_note_count: after.pending_hermes_note_count,
          },
          review_queue: reviewQueue,
          review_policy: {
            human_review_required: true,
            default_command_mode: "dry_run",
            persistent_review_write_allowed_by_day42: false,
            proposal_apply_allowed: false,
            protected_proposal_id: PROTECTED_PROPOSAL_ID,
          },
          redaction_policy: {
            restricted_domain_data_exposed: false,
            order_data_exposed: false,
            shipping_allocation_exposed: false,
            customer_data_exposed: false,
            payment_data_exposed: false,
            amount_data_exposed: false,
            sensitive_labor_data_exposed: false,
            credential_exposed: false,
          },
          restricted_domain_data_exposed: false,
          safety_snapshot: {
            before,
            after,
            unchanged: snapshotUnchanged(before, after),
          },
        },
        boundary: {
          mode: "hermes_proposal_review_loop_read_boundary" as const,
          transaction_read_only: true,
          writes_performed: false,
          commands_executed: false,
          app_schema_write_allowed: false,
          ai_proposal_write_allowed: false,
          audit_apply_event_write_allowed: false,
          proposal_apply_allowed: false,
          hermes_runtime_executed: false,
          llm_runtime_executed: false,
          embeddings_executed: false,
          vector_search_executed: false,
          restricted_domain_data_exposed: false,
        },
      };
    });
  } catch (error) {
    return {
      result: "error" as const,
      error: error instanceof Error ? error.message : String(error),
      loop: {
        scope: HERMES_REVIEW_LOOP_SCOPE,
        restricted_domain_data_exposed: false,
      },
      boundary: {
        mode: "hermes_proposal_review_loop_read_boundary" as const,
        transaction_read_only: true,
        writes_performed: false,
        commands_executed: false,
        app_schema_write_allowed: false,
        ai_proposal_write_allowed: false,
        audit_apply_event_write_allowed: false,
        proposal_apply_allowed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
        embeddings_executed: false,
        vector_search_executed: false,
        restricted_domain_data_exposed: false,
      },
    };
  }
}
