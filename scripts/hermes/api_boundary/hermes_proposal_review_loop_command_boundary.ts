import { Client } from "pg";
import {
  HERMES_NOTE_PROPOSAL_TYPE,
  PROTECTED_PROPOSAL_ID,
} from "./hermes_proposal_review_loop_read_boundary";

const allowedActions = [
  "keep_pending",
  "request_more_context",
  "mark_reviewed",
  "dismiss_without_apply",
] as const;

const blockedActions = [
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

type AllowedAction = (typeof allowedActions)[number];

type CommandInput = {
  proposal_id: string;
  action: string;
  reviewed_by?: string;
  reason?: string;
  dry_run?: boolean;
  confirm_persistent_review_write?: boolean;
};

type SafetySnapshot = {
  proposal_count: number;
  hermes_note_count: number;
  pending_hermes_note_count: number;
  apply_history_count: number;
  protected_proposal: {
    id: string;
    status: string;
    applied_at: string | null;
    applied_by: string | null;
  } | null;
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

function isAllowedAction(action: string): action is AllowedAction {
  return (allowedActions as readonly string[]).includes(action);
}

function isBlockedAction(action: string): boolean {
  return (blockedActions as readonly string[]).includes(action);
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

function baseBoundary() {
  return {
    mode: "hermes_proposal_review_loop_command_boundary" as const,
    commands_executed: true,
    dry_run: true,
    transaction_read_only: true,
    writes_performed: false,
    app_schema_write_allowed: false,
    ai_proposal_write_allowed: false,
    audit_apply_event_write_allowed: false,
    proposal_apply_allowed: false,
    hermes_runtime_executed: false,
    llm_runtime_executed: false,
    embeddings_executed: false,
    vector_search_executed: false,
    restricted_domain_data_exposed: false,
  };
}

export async function reviewHermesProposalLoopCommand(input: CommandInput) {
  const action = String(input.action ?? "").trim();
  const proposalId = String(input.proposal_id ?? "").trim();
  const dryRun = input.dry_run !== false;

  if (!proposalId) {
    return {
      result: "bad_request" as const,
      error: "proposal_id is required",
      command: {
        mode: "hermes_proposal_review_loop_command_boundary" as const,
        dry_run: true,
        persistent_write_performed: false,
      },
      boundary: baseBoundary(),
    };
  }

  if (!action) {
    return {
      result: "bad_request" as const,
      error: "action is required",
      command: {
        mode: "hermes_proposal_review_loop_command_boundary" as const,
        dry_run: true,
        target_proposal_id: proposalId,
        persistent_write_performed: false,
      },
      boundary: baseBoundary(),
    };
  }

  if (isBlockedAction(action) || !isAllowedAction(action)) {
    return {
      result: "blocked" as const,
      error: `action is not allowed by Day42 review loop boundary: ${action}`,
      command: {
        mode: "hermes_proposal_review_loop_command_boundary" as const,
        dry_run: true,
        requested_action: action,
        target_proposal_id: proposalId,
        persistent_write_performed: false,
      },
      boundary: baseBoundary(),
    };
  }

  if (proposalId === PROTECTED_PROPOSAL_ID) {
    return {
      result: "blocked" as const,
      error: "protected proposal cannot be reviewed by Day42 command boundary",
      command: {
        mode: "hermes_proposal_review_loop_command_boundary" as const,
        dry_run: true,
        requested_action: action,
        target_proposal_id: proposalId,
        persistent_write_performed: false,
      },
      boundary: baseBoundary(),
    };
  }

  if (!dryRun || input.confirm_persistent_review_write === true) {
    return {
      result: "blocked" as const,
      error: "persistent review write is intentionally not implemented in Day42",
      command: {
        mode: "hermes_proposal_review_loop_command_boundary" as const,
        dry_run: true,
        requested_action: action,
        target_proposal_id: proposalId,
        persistent_write_performed: false,
      },
      boundary: baseBoundary(),
    };
  }

  try {
    return await withReadOnlyTransaction(async (client) => {
      const before = await readSafetySnapshot(client);

      const target = await client.query(
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
          where id = $1::uuid
          limit 1
        `,
        [proposalId],
      );

      if (target.rowCount !== 1) {
        const after = await readSafetySnapshot(client);

        return {
          result: "bad_request" as const,
          error: "target proposal was not found",
          command: {
            mode: "hermes_proposal_review_loop_command_boundary" as const,
            dry_run: true,
            requested_action: action,
            target_proposal_id: proposalId,
            persistent_write_performed: false,
          },
          safety_snapshot: {
            before,
            after,
            unchanged: snapshotUnchanged(before, after),
          },
          boundary: baseBoundary(),
        };
      }

      const note = target.rows[0];

      if (note.proposal_type !== HERMES_NOTE_PROPOSAL_TYPE) {
        const after = await readSafetySnapshot(client);

        return {
          result: "blocked" as const,
          error: "target proposal type is outside Day42 Hermes review loop scope",
          command: {
            mode: "hermes_proposal_review_loop_command_boundary" as const,
            dry_run: true,
            requested_action: action,
            target_proposal_id: proposalId,
            target_proposal_type: note.proposal_type,
            persistent_write_performed: false,
          },
          safety_snapshot: {
            before,
            after,
            unchanged: snapshotUnchanged(before, after),
          },
          boundary: baseBoundary(),
        };
      }

      const after = await readSafetySnapshot(client);

      return {
        result: "ok" as const,
        command: {
          mode: "hermes_proposal_review_loop_command_boundary" as const,
          dry_run: true,
          requested_action: action,
          target_proposal_id: proposalId,
          target_proposal_type: note.proposal_type,
          target_status: note.status,
          reviewed_by: input.reviewed_by ?? null,
          reason: input.reason ?? null,
          allowed_actions: [...allowedActions],
          proposed_effect: {
            persistent_state_change: "none_day42_dry_run",
            proposal_apply: false,
            app_schema_change: false,
            audit_apply_event_append: false,
          },
          persistent_write_performed: false,
          restricted_domain_data_exposed: false,
        },
        safety_snapshot: {
          before,
          after,
          unchanged: snapshotUnchanged(before, after),
        },
        boundary: baseBoundary(),
      };
    });
  } catch (error) {
    return {
      result: "error" as const,
      error: error instanceof Error ? error.message : String(error),
      command: {
        mode: "hermes_proposal_review_loop_command_boundary" as const,
        dry_run: true,
        requested_action: action,
        target_proposal_id: proposalId,
        persistent_write_performed: false,
      },
      boundary: baseBoundary(),
    };
  }
}
