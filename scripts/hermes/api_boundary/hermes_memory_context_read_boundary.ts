import { Pool, type PoolClient } from "pg";

const DEFAULT_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";

type JsonRecord = Record<string, unknown>;

type ProposalContextSummary = {
  source: string;
  proposal_id: string;
  context_scope: string;
  proposal_status: string | null;
  readiness_result: string;
  preview_result: string;
  apply_history_summary_count: number;
};

type HermesMemoryContextResult = {
  result: "ok" | "bad_request" | "error";
  context?: {
    scope: "hermes_memory_context_minimum";
    runtime: {
      hermes_runtime_executed: false;
      llm_runtime_executed: false;
      embeddings_executed: false;
      vector_search_executed: false;
    };
    proposal_context: ProposalContextSummary;
    latest_hermes_notes: JsonRecord[];
    safe_app_context: {
      crop_cycles_summary: JsonRecord[];
      visible_domain_scope: string[];
    };
    memory_policy: JsonRecord;
    redaction_policy: JsonRecord;
    restricted_domain_data_exposed: false;
  };
  boundary: {
    mode: "hermes_memory_context_read_boundary";
    db_user: string;
    transaction_read_only: boolean;
    writes_performed: false;
    commands_executed: false;
    hermes_runtime_executed: false;
    llm_runtime_executed: false;
    embeddings_executed: false;
    vector_search_executed: false;
    app_schema_write_allowed: boolean;
    ai_proposal_write_allowed: boolean;
    audit_apply_event_write_allowed: boolean;
  };
  error?: string;
};

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER ?? "farmos_app_local",
  });
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function redactValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (typeof value === "object") {
    return redactRecord(value as JsonRecord);
  }

  if (typeof value !== "string") {
    return value;
  }

  const restrictedTerms = [
    "受発注",
    "出荷配分",
    "取引先",
    "金額",
    "労務",
    "給与",
    "評価",
    "customer",
    "buyer",
    "order",
    "shipping",
    "payment",
    "payroll",
    "credential",
  ];

  const lower = value.toLowerCase();
  if (restrictedTerms.some((term) => lower.includes(term.toLowerCase()))) {
    return "[redacted_by_day41_policy]";
  }

  return value;
}

function redactRecord(row: JsonRecord): JsonRecord {
  const restrictedKeyTerms = [
    "customer",
    "buyer",
    "order",
    "shipping",
    "payment",
    "payroll",
    "credential",
    "受発注",
    "出荷",
    "取引",
    "金額",
    "労務",
    "給与",
    "評価",
  ];

  const result: JsonRecord = {};

  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    const restrictedKey = restrictedKeyTerms.some((term) =>
      lowerKey.includes(term.toLowerCase()),
    );

    result[key] = restrictedKey ? "[redacted_by_day41_policy]" : redactValue(value);
  }

  return result;
}

async function tableExists(client: PoolClient, schemaName: string, tableName: string): Promise<boolean> {
  const result = await client.query(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = $1
          and table_name = $2
      ) as exists
    `,
    [schemaName, tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function getColumns(client: PoolClient, schemaName: string, tableName: string): Promise<string[]> {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = $1
        and table_name = $2
      order by ordinal_position
    `,
    [schemaName, tableName],
  );

  return result.rows.map((row) => String(row.column_name));
}

function pickColumns(existingColumns: string[], allowedColumns: string[]): string[] {
  const existing = new Set(existingColumns);
  return allowedColumns.filter((column) => existing.has(column));
}

async function getAnyWritePrivilege(
  client: PoolClient,
  schemaName: string,
  tableName: string,
): Promise<boolean> {
  const exists = await tableExists(client, schemaName, tableName);
  if (!exists) return false;

  const qualifiedName = `${schemaName}.${tableName}`;
  const result = await client.query(
    `
      select
        has_table_privilege(current_user, $1, 'INSERT') or
        has_table_privilege(current_user, $1, 'UPDATE') or
        has_table_privilege(current_user, $1, 'DELETE') as allowed
    `,
    [qualifiedName],
  );

  return Boolean(result.rows[0]?.allowed);
}

async function getApplyHistorySummaryCount(client: PoolClient, proposalId: string): Promise<number> {
  const exists = await tableExists(client, "audit", "proposal_review_apply_events");
  if (!exists) return 0;

  const columns = await getColumns(client, "audit", "proposal_review_apply_events");
  if (!columns.includes("proposal_id")) return 0;

  const result = await client.query(
    `
      select count(*)::int as count
      from audit.proposal_review_apply_events
      where proposal_id = $1::uuid
    `,
    [proposalId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

function findFirstDeep(value: unknown, keys: string[], maxDepth = 6): unknown {
  if (maxDepth < 0 || value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstDeep(item, keys, maxDepth - 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (typeof value !== "object") return undefined;

  const record = value as JsonRecord;

  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }

  for (const nestedValue of Object.values(record)) {
    const found = findFirstDeep(nestedValue, keys, maxDepth - 1);
    if (found !== undefined) return found;
  }

  return undefined;
}

function parseProposalContextFromDay38Response(value: unknown, proposalId: string): ProposalContextSummary | null {
  if (!value || typeof value !== "object") return null;

  const contextScope =
    findFirstDeep(value, ["context_scope", "scope"]) ??
    "proposal_review_apply_context";

  const proposalStatus =
    findFirstDeep(value, ["proposal_status", "status"]) ??
    null;

  const readinessResult =
    findFirstDeep(value, ["readiness_result"]) ??
    "unknown";

  const previewResult =
    findFirstDeep(value, ["preview_result"]) ??
    "unknown";

  const applyHistorySummaryCount =
    findFirstDeep(value, ["apply_history_summary_count"]) ??
    0;

  const resolvedProposalId =
    findFirstDeep(value, ["proposal_id"]) ??
    proposalId;

  return {
    source: "day38_hermes_context_read_boundary",
    proposal_id: String(resolvedProposalId),
    context_scope: String(contextScope),
    proposal_status: proposalStatus === null ? null : String(proposalStatus),
    readiness_result: String(readinessResult),
    preview_result: String(previewResult),
    apply_history_summary_count: Number(applyHistorySummaryCount),
  };
}

async function tryReadDay38ProposalContext(proposalId: string): Promise<ProposalContextSummary | null> {
  try {
    const module = await import("./hermes_context_read_api_boundary");

    const candidates = [
      "readHermesProposalContext",
      "readHermesContext",
      "readHermesContextReadApiBoundary",
    ];

    for (const name of candidates) {
      const maybeFunction = (module as JsonRecord)[name];
      if (typeof maybeFunction !== "function") continue;

      const argumentCandidates = [
        { proposalId },
        { proposal_id: proposalId },
        proposalId,
      ];

      for (const argument of argumentCandidates) {
        try {
          const response = await maybeFunction(argument);
          const parsed = parseProposalContextFromDay38Response(response, proposalId);
          if (parsed) return parsed;
        } catch {
          // Try the next compatible call shape.
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getFallbackProposalContext(
  client: PoolClient,
  proposalId: string,
): Promise<ProposalContextSummary> {
  const columns = await getColumns(client, "ai", "proposal_inbox");
  const selectedColumns = pickColumns(columns, ["id", "status"]);
  const selectList = selectedColumns.length > 0
    ? selectedColumns.map(quoteIdent).join(", ")
    : "id";

  const result = await client.query(
    `
      select ${selectList}
      from ai.proposal_inbox
      where id = $1::uuid
      limit 1
    `,
    [proposalId],
  );

  const row = result.rows[0] as JsonRecord | undefined;
  const applyHistorySummaryCount = await getApplyHistorySummaryCount(client, proposalId);

  return {
    source: "day41_fallback_read_only_projection",
    proposal_id: String(row?.id ?? proposalId),
    context_scope: "proposal_review_apply_context",
    proposal_status: row?.status === undefined ? null : String(row.status),
    readiness_result: "not_evaluated_by_day41_memory_context",
    preview_result: "not_evaluated_by_day41_memory_context",
    apply_history_summary_count: applyHistorySummaryCount,
  };
}

function mergeProposalContextWithFallback(
  primary: ProposalContextSummary | null,
  fallback: ProposalContextSummary,
): ProposalContextSummary {
  if (!primary) return fallback;

  return {
    source: primary.source,
    proposal_id: primary.proposal_id || fallback.proposal_id,
    context_scope: primary.context_scope || fallback.context_scope,
    proposal_status: primary.proposal_status ?? fallback.proposal_status,
    readiness_result:
      primary.readiness_result === "unknown"
        ? fallback.readiness_result
        : primary.readiness_result,
    preview_result:
      primary.preview_result === "unknown"
        ? fallback.preview_result
        : primary.preview_result,
    apply_history_summary_count:
      Number.isFinite(primary.apply_history_summary_count)
        ? primary.apply_history_summary_count
        : fallback.apply_history_summary_count,
  };
}

async function getLatestHermesNotes(client: PoolClient): Promise<JsonRecord[]> {
  const exists = await tableExists(client, "ai", "proposal_inbox");
  if (!exists) return [];

  const columns = await getColumns(client, "ai", "proposal_inbox");
  const selectedColumns = pickColumns(columns, [
    "id",
    "proposal_type",
    "status",
    "title",
    "summary",
    "reason",
    "rationale",
    "payload",
    "proposal_payload",
    "metadata",
    "generated_by",
    "created_at",
    "updated_at",
  ]);

  if (selectedColumns.length === 0 || !columns.includes("proposal_type")) {
    return [];
  }

  const orderColumn = columns.includes("created_at")
    ? "created_at"
    : columns.includes("updated_at")
      ? "updated_at"
      : "id";

  const result = await client.query(
    `
      select ${selectedColumns.map(quoteIdent).join(", ")}
      from ai.proposal_inbox
      where proposal_type = 'hermes_apply_blocker_explanation'
      order by ${quoteIdent(orderColumn)} desc
      limit 5
    `,
  );

  return result.rows.map((row) => redactRecord(row as JsonRecord));
}

async function getSafeCropCyclesSummary(client: PoolClient): Promise<JsonRecord[]> {
  const exists = await tableExists(client, "app", "crop_cycles");
  if (!exists) return [];

  const columns = await getColumns(client, "app", "crop_cycles");
  const selectedColumns = pickColumns(columns, [
    "id",
    "crop_name",
    "crop",
    "crop_type",
    "cycle_name",
    "name",
    "field_id",
    "field_name",
    "status",
    "season",
    "started_on",
    "start_date",
    "planned_start_date",
    "planting_date",
    "harvest_start_date",
    "created_at",
    "updated_at",
  ]);

  if (selectedColumns.length === 0) {
    return [];
  }

  const orderColumn = columns.includes("id") ? "id" : selectedColumns[0];

  const result = await client.query(
    `
      select ${selectedColumns.map(quoteIdent).join(", ")}
      from app.crop_cycles
      order by ${quoteIdent(orderColumn)} asc
      limit 10
    `,
  );

  return result.rows.map((row) => redactRecord(row as JsonRecord));
}

export async function readHermesMemoryContext(input?: {
  proposalId?: string;
}): Promise<HermesMemoryContextResult> {
  const proposalId = input?.proposalId ?? DEFAULT_PROPOSAL_ID;
  const pool = createPool();
  const client = await pool.connect();

  let transactionStarted = false;

  try {
    if (!proposalId || !/^[0-9a-fA-F-]{36}$/.test(proposalId)) {
      return {
        result: "bad_request",
        boundary: {
          mode: "hermes_memory_context_read_boundary",
          db_user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER ?? "unknown",
          transaction_read_only: false,
          writes_performed: false,
          commands_executed: false,
          hermes_runtime_executed: false,
          llm_runtime_executed: false,
          embeddings_executed: false,
          vector_search_executed: false,
          app_schema_write_allowed: false,
          ai_proposal_write_allowed: false,
          audit_apply_event_write_allowed: false,
        },
        error: "proposalId must be a UUID",
      };
    }

    await client.query("begin read only");
    transactionStarted = true;

    const runtimeResult = await client.query(
      `
        select
          current_user as db_user,
          current_setting('transaction_read_only') as transaction_read_only
      `,
    );

    const dbUser = String(runtimeResult.rows[0]?.db_user ?? "unknown");
    const transactionReadOnly = String(runtimeResult.rows[0]?.transaction_read_only) === "on";

    const day38ProposalContext = await tryReadDay38ProposalContext(proposalId);
    const fallbackProposalContext = await getFallbackProposalContext(client, proposalId);
    const proposalContext = mergeProposalContextWithFallback(
      day38ProposalContext,
      fallbackProposalContext,
    );

    const latestHermesNotes = await getLatestHermesNotes(client);
    const cropCyclesSummary = await getSafeCropCyclesSummary(client);

    const appSchemaWriteAllowed = await getAnyWritePrivilege(client, "app", "crop_cycles");
    const aiProposalWriteAllowed = await getAnyWritePrivilege(client, "ai", "proposal_inbox");
    const auditApplyEventWriteAllowed = await getAnyWritePrivilege(
      client,
      "audit",
      "proposal_review_apply_events",
    );

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      context: {
        scope: "hermes_memory_context_minimum",
        runtime: {
          hermes_runtime_executed: false,
          llm_runtime_executed: false,
          embeddings_executed: false,
          vector_search_executed: false,
        },
        proposal_context: proposalContext,
        latest_hermes_notes: latestHermesNotes,
        safe_app_context: {
          crop_cycles_summary: cropCyclesSummary,
          visible_domain_scope: [
            "proposal_review_summary",
            "hermes_apply_blocker_explanation_notes",
            "crop_cycles_minimum_summary",
          ],
        },
        memory_policy: {
          memory_kind: "read_only_context_pack",
          durable_memory_write_enabled: false,
          chat_history_write_enabled: false,
          proposal_write_enabled: false,
          app_write_enabled: false,
        },
        redaction_policy: {
          restricted_domain_redaction_enabled: true,
          expose_restricted_domain_data: false,
          allowed_app_context: "crop_cycles_minimum_summary",
        },
        restricted_domain_data_exposed: false,
      },
      boundary: {
        mode: "hermes_memory_context_read_boundary",
        db_user: dbUser,
        transaction_read_only: transactionReadOnly,
        writes_performed: false,
        commands_executed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
        embeddings_executed: false,
        vector_search_executed: false,
        app_schema_write_allowed: appSchemaWriteAllowed,
        ai_proposal_write_allowed: aiProposalWriteAllowed,
        audit_apply_event_write_allowed: auditApplyEventWriteAllowed,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("rollback");
      } catch {
        // Ignore rollback failure after the primary error.
      }
    }

    return {
      result: "error",
      boundary: {
        mode: "hermes_memory_context_read_boundary",
        db_user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER ?? "unknown",
        transaction_read_only: false,
        writes_performed: false,
        commands_executed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
        embeddings_executed: false,
        vector_search_executed: false,
        app_schema_write_allowed: false,
        ai_proposal_write_allowed: false,
        audit_apply_event_write_allowed: false,
      },
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    client.release();
    await pool.end();
  }
}
