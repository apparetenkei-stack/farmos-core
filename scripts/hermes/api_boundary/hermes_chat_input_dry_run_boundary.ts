import { Client } from "pg";

import {
  detectHermesBlockedRequest,
  detectHermesRequestedIntent,
  normalizeHermesUserMessage,
  runHermesLlmAdapterMockBoundary,
  type HermesChatIntent,
} from "./hermes_llm_adapter_mock_boundary";

const PROTECTED_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";
const MAX_MESSAGE_LENGTH = 1000;

type SafetySnapshot = {
  proposal_count: number;
  hermes_note_count: number;
  pending_hermes_note_count: number;
  apply_history_count: number;
  protected_proposal_id: string;
  protected_proposal_status: string;
  protected_proposal_applied_at: string | null;
  protected_proposal_applied_by: string | null;
  crop_cycle_2_exists: boolean;
};

type BoundaryFlags = {
  mode: "hermes_chat_input_dry_run_boundary";
  transaction_read_only: true;
  writes_performed: false;
  commands_executed: false;
  chat_history_write_allowed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
  proposal_apply_allowed: false;
  hermes_runtime_executed: false;
  llm_runtime_executed: false;
  external_api_called: false;
  embeddings_executed: false;
  vector_search_executed: false;
  restricted_domain_data_exposed: false;
};

export type HermesChatInputDryRunResult = {
  result: "ok" | "bad_request" | "blocked" | "error";
  chat: {
    scope: "hermes_chat_input_dry_run_minimum";
    request: {
      user_message: string;
      normalized_user_message: string;
      message_length: number;
      requested_intent: HermesChatIntent;
      dry_run: true;
    };
    safe_context?: {
      memory_context_scope: "hermes_memory_context_minimum";
      review_loop_scope: "hermes_proposal_review_loop_minimum";
      proposal_count: number;
      hermes_note_count: number;
      pending_hermes_note_count: number;
      apply_history_count: number;
      protected_proposal_status: string;
      crop_cycle_2_exists: boolean;
    };
    mock_response?: {
      adapter: "hermes_llm_adapter_mock_boundary";
      response_kind: "deterministic_mock_response";
      content: string;
      would_call_llm: false;
      would_write_chat_history: false;
      would_create_proposal: false;
      would_apply_proposal: false;
    };
    redaction_policy: {
      restricted_domains_excluded: string[];
      source_values_exposed: "safe_aggregate_only";
      raw_business_records_exposed: false;
      credentials_exposed: false;
    };
    blocked_reason?: string;
    matched_policy?: string;
    safety_snapshot?: {
      before: SafetySnapshot;
      after: SafetySnapshot;
      unchanged: boolean;
    };
    restricted_domain_data_exposed: false;
  };
  boundary: BoundaryFlags;
  error?: string;
};

const boundary: BoundaryFlags = {
  mode: "hermes_chat_input_dry_run_boundary",
  transaction_read_only: true,
  writes_performed: false,
  commands_executed: false,
  chat_history_write_allowed: false,
  app_schema_write_allowed: false,
  ai_proposal_write_allowed: false,
  audit_apply_event_write_allowed: false,
  proposal_apply_allowed: false,
  hermes_runtime_executed: false,
  llm_runtime_executed: false,
  external_api_called: false,
  embeddings_executed: false,
  vector_search_executed: false,
  restricted_domain_data_exposed: false,
};

const redactionPolicy = {
  restricted_domains_excluded: [
    "orders",
    "shipping_allocation",
    "customers",
    "prices",
    "payments",
    "labor_sensitive_data",
    "personal_evaluation",
    "payroll",
    "private_runtime_config",
    "credentials",
    "administrator_only_unfinalized_domains",
  ],
  source_values_exposed: "safe_aggregate_only" as const,
  raw_business_records_exposed: false as const,
  credentials_exposed: false as const,
};

function makeRequest(input: {
  userMessage: string;
  normalizedUserMessage: string;
  requestedIntent: HermesChatIntent;
}) {
  return {
    user_message: input.userMessage,
    normalized_user_message: input.normalizedUserMessage,
    message_length: input.normalizedUserMessage.length,
    requested_intent: input.requestedIntent,
    dry_run: true as const,
  };
}

async function readSafetySnapshot(client: Client): Promise<SafetySnapshot> {
  const proposalCountResult = await client.query<{
    proposal_count: number;
  }>("select count(*)::int as proposal_count from ai.proposal_inbox;");

  const hermesNoteCountResult = await client.query<{
    hermes_note_count: number;
  }>(
    `
    select count(*)::int as hermes_note_count
    from ai.proposal_inbox
    where proposal_type = 'hermes_apply_blocker_explanation';
    `,
  );

  const pendingHermesNoteCountResult = await client.query<{
    pending_hermes_note_count: number;
  }>(
    `
    select count(*)::int as pending_hermes_note_count
    from ai.proposal_inbox
    where proposal_type = 'hermes_apply_blocker_explanation'
      and status = 'pending';
    `,
  );

  const applyHistoryCountResult = await client.query<{
    apply_history_count: number;
  }>(
    `
    select count(*)::int as apply_history_count
    from audit.proposal_review_apply_events;
    `,
  );

  const protectedProposalResult = await client.query<{
    id: string;
    status: string;
    applied_at: Date | null;
    applied_by: string | null;
  }>(
    `
    select
      id::text,
      status,
      applied_at,
      applied_by::text
    from ai.proposal_inbox
    where id = $1::uuid;
    `,
    [PROTECTED_PROPOSAL_ID],
  );

  const cropCycleResult = await client.query<{
    crop_cycle_2_exists: boolean;
  }>(
    `
    select exists(
      select 1
      from app.crop_cycles
      where id = 2
    ) as crop_cycle_2_exists;
    `,
  );

  const protectedProposal = protectedProposalResult.rows[0] ?? null;

  return {
    proposal_count: proposalCountResult.rows[0]?.proposal_count ?? 0,
    hermes_note_count: hermesNoteCountResult.rows[0]?.hermes_note_count ?? 0,
    pending_hermes_note_count:
      pendingHermesNoteCountResult.rows[0]?.pending_hermes_note_count ?? 0,
    apply_history_count:
      applyHistoryCountResult.rows[0]?.apply_history_count ?? 0,
    protected_proposal_id: PROTECTED_PROPOSAL_ID,
    protected_proposal_status: protectedProposal?.status ?? "missing",
    protected_proposal_applied_at: protectedProposal?.applied_at
      ? protectedProposal.applied_at.toISOString()
      : null,
    protected_proposal_applied_by: protectedProposal?.applied_by ?? null,
    crop_cycle_2_exists: Boolean(
      cropCycleResult.rows[0]?.crop_cycle_2_exists,
    ),
  };
}

function snapshotsUnchanged(before: SafetySnapshot, after: SafetySnapshot): boolean {
  return (
    before.proposal_count === after.proposal_count &&
    before.hermes_note_count === after.hermes_note_count &&
    before.pending_hermes_note_count === after.pending_hermes_note_count &&
    before.apply_history_count === after.apply_history_count &&
    before.protected_proposal_status === after.protected_proposal_status &&
    before.protected_proposal_applied_at === after.protected_proposal_applied_at &&
    before.protected_proposal_applied_by === after.protected_proposal_applied_by &&
    before.crop_cycle_2_exists === after.crop_cycle_2_exists
  );
}

export async function runHermesChatInputDryRunBoundary(input: {
  message?: unknown;
  dryRun?: boolean;
}): Promise<HermesChatInputDryRunResult> {
  const userMessage = typeof input.message === "string" ? input.message : "";
  const normalizedUserMessage = normalizeHermesUserMessage(userMessage);
  const requestedIntent = detectHermesRequestedIntent(normalizedUserMessage);

  const request = makeRequest({
    userMessage,
    normalizedUserMessage,
    requestedIntent,
  });

  if (input.dryRun === false) {
    return {
      result: "blocked",
      chat: {
        scope: "hermes_chat_input_dry_run_minimum",
        request,
        redaction_policy: redactionPolicy,
        blocked_reason: "day43_requires_dry_run",
        matched_policy: "non_dry_run_request",
        restricted_domain_data_exposed: false,
      },
      boundary,
    };
  }

  if (normalizedUserMessage.length === 0) {
    return {
      result: "bad_request",
      chat: {
        scope: "hermes_chat_input_dry_run_minimum",
        request,
        redaction_policy: redactionPolicy,
        blocked_reason: "empty_message",
        matched_policy: "input_validation",
        restricted_domain_data_exposed: false,
      },
      boundary,
    };
  }

  if (normalizedUserMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      result: "bad_request",
      chat: {
        scope: "hermes_chat_input_dry_run_minimum",
        request,
        redaction_policy: redactionPolicy,
        blocked_reason: "message_too_long",
        matched_policy: "input_validation",
        restricted_domain_data_exposed: false,
      },
      boundary,
    };
  }

  const blocked = detectHermesBlockedRequest(normalizedUserMessage);

  if (blocked.blocked) {
    return {
      result: "blocked",
      chat: {
        scope: "hermes_chat_input_dry_run_minimum",
        request,
        redaction_policy: redactionPolicy,
        blocked_reason: blocked.reason ?? "blocked",
        matched_policy: blocked.matched_policy ?? "unknown",
        restricted_domain_data_exposed: false,
      },
      boundary,
    };
  }

  const client = new Client();
  let transactionOpened = false;

  try {
    await client.connect();
    await client.query("begin read only;");
    transactionOpened = true;

    const before = await readSafetySnapshot(client);

    const safeContext = {
      memory_context_scope: "hermes_memory_context_minimum" as const,
      review_loop_scope: "hermes_proposal_review_loop_minimum" as const,
      proposal_count: before.proposal_count,
      hermes_note_count: before.hermes_note_count,
      pending_hermes_note_count: before.pending_hermes_note_count,
      apply_history_count: before.apply_history_count,
      protected_proposal_status: before.protected_proposal_status,
      crop_cycle_2_exists: before.crop_cycle_2_exists,
    };

    const adapterResult = await runHermesLlmAdapterMockBoundary({
      userMessage,
      normalizedUserMessage,
      requestedIntent,
      safeContext,
    });

    const after = await readSafetySnapshot(client);

    await client.query("rollback;");
    transactionOpened = false;

    if (adapterResult.result !== "ok") {
      return {
        result: adapterResult.result,
        chat: {
          scope: "hermes_chat_input_dry_run_minimum",
          request,
          safe_context: safeContext,
          redaction_policy: redactionPolicy,
          blocked_reason: adapterResult.blocked_reason,
          matched_policy: adapterResult.matched_policy,
          safety_snapshot: {
            before,
            after,
            unchanged: snapshotsUnchanged(before, after),
          },
          restricted_domain_data_exposed: false,
        },
        boundary,
      };
    }

    return {
      result: "ok",
      chat: {
        scope: "hermes_chat_input_dry_run_minimum",
        request,
        safe_context: safeContext,
        mock_response: {
          adapter: adapterResult.adapter.mode,
          response_kind: "deterministic_mock_response",
          content: adapterResult.adapter.output.content,
          would_call_llm: false,
          would_write_chat_history: false,
          would_create_proposal: false,
          would_apply_proposal: false,
        },
        redaction_policy: redactionPolicy,
        safety_snapshot: {
          before,
          after,
          unchanged: snapshotsUnchanged(before, after),
        },
        restricted_domain_data_exposed: false,
      },
      boundary,
    };
  } catch (error) {
    if (transactionOpened) {
      try {
        await client.query("rollback;");
      } catch {
        // Keep the original error response.
      }
    }

    return {
      result: "error",
      chat: {
        scope: "hermes_chat_input_dry_run_minimum",
        request,
        redaction_policy: redactionPolicy,
        restricted_domain_data_exposed: false,
      },
      boundary,
      error: error instanceof Error ? error.message : "unknown_error",
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
