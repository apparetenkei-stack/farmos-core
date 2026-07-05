import { Client } from "pg";
import { readHermesProposalContext } from "../../hermes/api_boundary/hermes_context_read_api_boundary";

const PROTECTED_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";

type JsonObject = Record<string, unknown>;

export type HermesChatReadonlyUiPageMode =
  | "hermes_index"
  | "hermes_proposal_context";

export type HermesChatReadonlyUiInput = {
  proposalId?: string | null;
  latestLimit?: number | null;
};

export type HermesProposalNote = {
  id: string;
  proposal_type: string;
  title: string | null;
  body: string | null;
  status: string | null;
  reason: string | null;
  payload_json: unknown;
  source_refs_json: unknown;
  created_at: string | null;
};

export type HermesChatReadonlyBoundary = {
  mode: "hermes_chat_readonly_ui_boundary";
  db_user: string;
  transaction_read_only: true;
  writes_performed: false;
  commands_executed: false;
  hermes_runtime_executed: false;
  llm_runtime_executed: false;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_apply_event_write_allowed: boolean;
};

export type HermesChatReadonlyUiResult =
  | {
      result: "ok";
      view: {
        page_mode: HermesChatReadonlyUiPageMode;
        protected_proposal_id: string;
        hermes_status: {
          context_read_available: true;
          proposal_writer_available: true;
          hermes_runtime_executed: false;
          llm_runtime_executed: false;
          autonomous_apply_allowed: false;
          human_review_required: true;
        };
        proposal_context?: unknown;
        proposal_context_result?: string | null;
        proposal_context_scope?: string | null;
        proposal_status?: string | null;
        readiness_result?: string | null;
        preview_result?: string | null;
        apply_history_summary_count?: number | null;
        hermes_proposal_notes: HermesProposalNote[];
        safety_policy: {
          mode: "human_review_first";
          ui_write_allowed: false;
          proposal_creation_from_ui_allowed: false;
          proposal_apply_from_ui_allowed: false;
          autonomous_apply_allowed: false;
          chat_message_persistence_allowed: false;
          runtime_start_allowed: false;
          restricted_domain_data_exposed: false;
        };
        redaction_policy: {
          restricted_operational_data_exposed: false;
          restricted_domains: string[];
        };
      };
      boundary: HermesChatReadonlyBoundary;
    }
  | {
      result: "bad_request" | "error";
      error: string;
    };

function getDbConfig() {
  return {
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
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function asRecord(value: unknown): JsonObject | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonObject;
}

function getStringAt(value: unknown, path: string[]): string | null {
  let current: unknown = value;

  for (const segment of path) {
    const record = asRecord(current);
    if (!record || !(segment in record)) return null;
    current = record[segment];
  }

  return typeof current === "string" ? current : null;
}

function findStringByKey(value: unknown, targetKey: string): string | null {
  if (value === null || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, targetKey);
      if (found !== null) return found;
    }

    return null;
  }

  const record = value as JsonObject;

  if (typeof record[targetKey] === "string") {
    return record[targetKey] as string;
  }

  for (const child of Object.values(record)) {
    const found = findStringByKey(child, targetKey);
    if (found !== null) return found;
  }

  return null;
}

function findNumberByKey(value: unknown, targetKey: string): number | null {
  if (value === null || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumberByKey(item, targetKey);
      if (found !== null) return found;
    }

    return null;
  }

  const record = value as JsonObject;

  if (typeof record[targetKey] === "number") {
    return record[targetKey] as number;
  }

  for (const child of Object.values(record)) {
    const found = findNumberByKey(child, targetKey);
    if (found !== null) return found;
  }

  return null;
}

function getArrayLengthAt(value: unknown, path: string[]): number | null {
  let current: unknown = value;

  for (const segment of path) {
    const record = asRecord(current);
    if (!record || !(segment in record)) return null;
    current = record[segment];
  }

  return Array.isArray(current) ? current.length : null;
}

function normalizeLimit(value: number | null | undefined): number {
  if (!Number.isFinite(value ?? NaN)) return 10;

  const limit = Math.trunc(value ?? 10);
  if (limit < 1) return 1;
  if (limit > 25) return 25;

  return limit;
}

async function readLatestHermesProposalNotes(
  client: Client,
  limit: number,
): Promise<HermesProposalNote[]> {
  const result = await client.query(
    `
    select
      id::text,
      proposal_type,
      title,
      body,
      status,
      reason,
      payload_json,
      source_refs_json,
      created_at::text
    from ai.proposal_inbox
    where proposal_type = 'hermes_apply_blocker_explanation'
    order by created_at desc nulls last, id::text desc
    limit $1
    `,
    [limit],
  );

  return result.rows as HermesProposalNote[];
}

async function readRelatedHermesProposalNotes(
  client: Client,
  proposalId: string,
  limit: number,
): Promise<HermesProposalNote[]> {
  const result = await client.query(
    `
    select
      id::text,
      proposal_type,
      title,
      body,
      status,
      reason,
      payload_json,
      source_refs_json,
      created_at::text
    from ai.proposal_inbox
    where proposal_type = 'hermes_apply_blocker_explanation'
      and (
        payload_json::text like $2
        or source_refs_json::text like $2
        or coalesce(body, '') like $2
        or coalesce(reason, '') like $2
      )
    order by created_at desc nulls last, id::text desc
    limit $1
    `,
    [limit, `%${proposalId}%`],
  );

  return result.rows as HermesProposalNote[];
}

async function readBoundary(client: Client): Promise<HermesChatReadonlyBoundary> {
  const result = await client.query<{
    db_user: string;
    app_schema_write_allowed: boolean;
    ai_proposal_insert_allowed: boolean;
    ai_proposal_update_allowed: boolean;
    ai_proposal_delete_allowed: boolean;
    audit_apply_insert_allowed: boolean;
  }>(
    `
    select
      current_user::text as db_user,
      (
        has_table_privilege(current_user, 'app.crop_cycles', 'insert')
        or has_table_privilege(current_user, 'app.crop_cycles', 'update')
        or has_table_privilege(current_user, 'app.crop_cycles', 'delete')
      ) as app_schema_write_allowed,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'insert') as ai_proposal_insert_allowed,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'update') as ai_proposal_update_allowed,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'delete') as ai_proposal_delete_allowed,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'insert') as audit_apply_insert_allowed
    `,
  );

  const row = result.rows[0];

  return {
    mode: "hermes_chat_readonly_ui_boundary",
    db_user: row.db_user,
    transaction_read_only: true,
    writes_performed: false,
    commands_executed: false,
    hermes_runtime_executed: false,
    llm_runtime_executed: false,
    app_schema_write_allowed: row.app_schema_write_allowed,
    ai_proposal_write_allowed:
      row.ai_proposal_insert_allowed ||
      row.ai_proposal_update_allowed ||
      row.ai_proposal_delete_allowed,
    audit_apply_event_write_allowed: row.audit_apply_insert_allowed,
  };
}

function buildHermesStatus() {
  return {
    context_read_available: true,
    proposal_writer_available: true,
    hermes_runtime_executed: false,
    llm_runtime_executed: false,
    autonomous_apply_allowed: false,
    human_review_required: true,
  } as const;
}

function buildSafetyPolicy() {
  return {
    mode: "human_review_first",
    ui_write_allowed: false,
    proposal_creation_from_ui_allowed: false,
    proposal_apply_from_ui_allowed: false,
    autonomous_apply_allowed: false,
    chat_message_persistence_allowed: false,
    runtime_start_allowed: false,
    restricted_domain_data_exposed: false,
  } as const;
}

function buildRedactionPolicy(): {
  restricted_operational_data_exposed: false;
  restricted_domains: string[];
} {
  return {
    restricted_operational_data_exposed: false,
    restricted_domains: [
      "commercial_transaction_domain",
      "logistics_and_allocation_domain",
      "external_party_domain",
      "finance_domain",
      "workforce_sensitive_domain",
      "personal_assessment_domain",
      "private_runtime_configuration_domain",
      "credential_material_domain",
    ],
  };
}

export async function readHermesChatReadonlyUi(
  input: HermesChatReadonlyUiInput = {},
): Promise<HermesChatReadonlyUiResult> {
  const proposalId = input.proposalId?.trim() || null;
  const latestLimit = normalizeLimit(input.latestLimit);

  if (proposalId !== null && !isUuid(proposalId)) {
    return {
      result: "bad_request",
      error: "proposalId must be a UUID.",
    };
  }

  const client = new Client(getDbConfig());

  try {
    await client.connect();
    await client.query("begin read only");

    const boundary = await readBoundary(client);

    const pageMode: HermesChatReadonlyUiPageMode =
      proposalId === null ? "hermes_index" : "hermes_proposal_context";

    const notes =
      proposalId === null
        ? await readLatestHermesProposalNotes(client, latestLimit)
        : await readRelatedHermesProposalNotes(client, proposalId, latestLimit);

    let proposalContext: unknown | undefined;
    let proposalContextResult: string | null = null;
    let proposalContextScope: string | null = null;
    let proposalStatus: string | null = null;
    let readinessResult: string | null = null;
    let previewResult: string | null = null;
    let applyHistorySummaryCount: number | null = null;

    if (proposalId !== null) {
      proposalContext = await readHermesProposalContext({ proposalId });

      proposalContextResult = getStringAt(proposalContext, ["result"]);
      proposalContextScope =
        getStringAt(proposalContext, ["context", "scope"]) ??
        getStringAt(proposalContext, ["context", "context_scope"]) ??
        getStringAt(proposalContext, ["context_scope"]) ??
        findStringByKey(proposalContext, "context_scope");

      proposalStatus =
        getStringAt(proposalContext, ["context", "proposal", "status"]) ??
        getStringAt(proposalContext, ["proposal", "status"]) ??
        findStringByKey(proposalContext, "proposal_status");

      readinessResult =
        getStringAt(proposalContext, ["context", "apply_readiness", "result"]) ??
        getStringAt(proposalContext, ["context", "readiness", "result"]) ??
        getStringAt(proposalContext, ["readiness", "result"]) ??
        getStringAt(proposalContext, ["readiness_result"]) ??
        findStringByKey(proposalContext, "readiness_result");

      previewResult =
        getStringAt(proposalContext, ["context", "apply_plan_preview", "result"]) ??
        getStringAt(proposalContext, ["context", "preview", "result"]) ??
        getStringAt(proposalContext, ["preview", "result"]) ??
        getStringAt(proposalContext, ["preview_result"]) ??
        findStringByKey(proposalContext, "preview_result");

      applyHistorySummaryCount =
        findNumberByKey(proposalContext, "committed_apply_event_count") ??
        getArrayLengthAt(proposalContext, [
          "context",
          "apply_history_summary",
          "all_committed_event_ids",
        ]) ??
        getArrayLengthAt(proposalContext, [
          "context",
          "apply_history_summary",
        ]) ??
        getArrayLengthAt(proposalContext, ["apply_history_summary"]) ??
        findNumberByKey(proposalContext, "apply_history_summary_count");
    }

    await client.query("commit");

    return {
      result: "ok",
      view: {
        page_mode: pageMode,
        protected_proposal_id: PROTECTED_PROPOSAL_ID,
        hermes_status: buildHermesStatus(),
        proposal_context: proposalContext,
        proposal_context_result: proposalContextResult,
        proposal_context_scope: proposalContextScope,
        proposal_status: proposalStatus,
        readiness_result: readinessResult,
        preview_result: previewResult,
        apply_history_summary_count: applyHistorySummaryCount,
        hermes_proposal_notes: notes,
        safety_policy: buildSafetyPolicy(),
        redaction_policy: buildRedactionPolicy(),
      },
      boundary,
    };
  } catch (error: unknown) {
    try {
      await client.query("rollback");
    } catch {
      // rollback best effort only
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end();
  }
}
