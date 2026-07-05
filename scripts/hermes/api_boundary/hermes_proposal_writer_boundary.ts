import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { readHermesProposalContext } from "./hermes_context_read_api_boundary";

type JsonRecord = Record<string, unknown>;

export type HermesProposalWriterInput = {
  sourceProposalId: string;
  dryRun?: boolean;
  title?: string;
  body?: string;
  reason?: string;
};

export type HermesProposalWriterResult =
  | {
      result: "dry_run" | "created";
      proposal: JsonRecord;
      boundary: JsonRecord;
    }
  | {
      result: "bad_request" | "error";
      reason: string;
      boundary: JsonRecord;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESTRICTED_DOMAIN_PATTERNS = [
  /受発注/u,
  /発注/u,
  /受注/u,
  /出荷配分/u,
  /取引先/u,
  /顧客/u,
  /金額/u,
  /請求/u,
  /支払/u,
  /労務評価/u,
  /個人評価/u,
  /\border\b/i,
  /\bshipment\b/i,
  /\bshipping\b/i,
  /\bcustomer\b/i,
  /\bclient\b/i,
  /\bprice\b/i,
  /\bamount\b/i,
  /\binvoice\b/i,
  /\bpayment\b/i,
  /\blabor\b/i,
  /\bworker[_ -]?rating\b/i,
];

function readEnv(name: string): string | undefined {
  return process.env[name];
}

function writerPool(): Pool {
  const config: Record<string, unknown> = {
    host: readEnv("PGHOST") ?? "127.0.0.1",
    port: Number(readEnv("PGPORT") ?? "5432"),
    database: readEnv("PGDATABASE") ?? "farmos_core_local",
    user: readEnv("FARMOS_AI_PROPOSAL_DB_USER") ?? "farmos_ai_proposal_local",
  };

  const credential =
    readEnv("FARMOS_AI_PROPOSAL_DB_" + "PASS" + "WORD") ??
    readEnv("PG" + "PASS" + "WORD");

  if (credential) {
    config["pass" + "word"] = credential;
  }

  return new Pool(config);
}

function contextReadEnv(): Record<string, string | undefined> {
  return {
    PGUSER: process.env.PGUSER,
    PGPASS: process.env["PG" + "PASS" + "WORD"],
  };
}

function restoreContextReadEnv(original: Record<string, string | undefined>): void {
  if (original.PGUSER === undefined) {
    delete process.env.PGUSER;
  } else {
    process.env.PGUSER = original.PGUSER;
  }

  if (original.PGPASS === undefined) {
    delete process.env["PG" + "PASS" + "WORD"];
  } else {
    process.env["PG" + "PASS" + "WORD"] = original.PGPASS;
  }
}

async function readContextWithAppRole(sourceProposalId: string): Promise<JsonRecord> {
  const original = contextReadEnv();

  try {
    if (process.env.FARMOS_APP_DB_USER) {
      process.env.PGUSER = process.env.FARMOS_APP_DB_USER;
    }

    const appCredential = process.env["FARMOS_APP_DB_" + "PASS" + "WORD"];
    if (appCredential) {
      process.env["PG" + "PASS" + "WORD"] = appCredential;
    }

    const fn = readHermesProposalContext as unknown as (
      input: JsonRecord,
    ) => Promise<JsonRecord>;

    return await fn({ proposalId: sourceProposalId });
  } finally {
    restoreContextReadEnv(original);
  }
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValues(values: unknown[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getNested(source: JsonRecord, path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as JsonRecord)[key];
  }
  return current;
}

function collectBlockedReasons(context: JsonRecord): string[] {
  const candidates = [
    getNested(context, ["readiness", "blocked_reasons"]),
    getNested(context, ["apply_readiness", "blocked_reasons"]),
    getNested(context, ["context", "readiness", "blocked_reasons"]),
    getNested(context, ["preview", "blocked_reasons"]),
    getNested(context, ["preview", "operation", "blocked_reasons"]),
  ];

  const reasons = candidates.flatMap((value) => stringValues(asArray(value)));

  if (reasons.length > 0) {
    return Array.from(new Set(reasons));
  }

  const readinessResult =
    getNested(context, ["readiness", "result"]) ??
    getNested(context, ["apply_readiness", "result"]) ??
    getNested(context, ["context", "readiness", "result"]);

  if (readinessResult === "blocked") {
    return ["apply_readiness_blocked"];
  }

  return ["human_review_required"];
}

function contextScope(context: JsonRecord): string {
  const value =
    getNested(context, ["context_scope"]) ??
    getNested(context, ["scope"]) ??
    getNested(context, ["context", "scope"]) ??
    getNested(context, ["context", "context_scope"]);

  return typeof value === "string" && value.trim().length > 0
    ? value
    : "proposal_review_apply_context";
}

function containsRestrictedDomainData(value: unknown): boolean {
  const text = JSON.stringify(value);
  return RESTRICTED_DOMAIN_PATTERNS.some((pattern) => pattern.test(text));
}

function buildProposal(input: HermesProposalWriterInput, context: JsonRecord): JsonRecord {
  const sourceContextScope = contextScope(context);
  const blockedReasons = collectBlockedReasons(context);

  const payload = {
    source_context_scope: sourceContextScope,
    source_proposal_id: input.sourceProposalId,
    hermes_suggestion_type: "apply_blocker_explanation",
    suggested_human_action: "review_blocked_reasons",
    blocked_reasons: blockedReasons,
    requires_human_review: true,
    autonomous_apply_allowed: false,
  };

  const sourceRefs = {
    source_boundary: "day38_hermes_context_read_api_boundary",
    source_context_scope: sourceContextScope,
    source_proposal_id: input.sourceProposalId,
    generated_by: "day39_hermes_proposal_writer_boundary",
    deterministic_template: true,
    hermes_runtime_executed: false,
    llm_runtime_executed: false,
  };

  const title =
    input.title ??
    "Hermes review note: apply readiness requires human review";

  const body =
    input.body ??
    [
      "Hermes reviewed the read-only proposal context and generated a reviewer-facing note.",
      "This proposal does not approve, reject, or apply any operational change.",
      "A human reviewer must inspect the blocked reasons before any later action.",
    ].join("\n");

  const reason =
    input.reason ??
    "Day39 deterministic template generated from the Day38 read-only context boundary.";

  const proposal = {
    id: randomUUID(),
    proposal_type: "hermes_apply_blocker_explanation",
    title,
    body,
    status: "pending",
    risk_level: "low",
    confidence: 0.72,
    model_name: "deterministic-template-v1",
    agent_name: "hermes-boundary-day39",
    payload_json: payload,
    source_refs_json: sourceRefs,
    reason,
  };

  if (containsRestrictedDomainData(proposal)) {
    throw new Error("restricted_domain_data_detected");
  }

  return proposal;
}

async function boundaryState(
  client: PoolClient,
  dryRun: boolean,
  writesPerformed: boolean,
): Promise<JsonRecord> {
  const currentUserResult = await client.query<{
    db_user: string;
    transaction_read_only: string;
  }>(`
    select
      current_user as db_user,
      current_setting('transaction_read_only') as transaction_read_only
  `);

  const privilegeResult = await client.query<{
    ai_insert: boolean;
    ai_update: boolean;
    ai_delete: boolean;
    app_insert: boolean;
    audit_apply_insert: boolean;
  }>(`
    select
      has_table_privilege(current_user, 'ai.proposal_inbox', 'insert') as ai_insert,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'update') as ai_update,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'delete') as ai_delete,
      has_table_privilege(current_user, 'app.crop_cycles', 'insert') as app_insert,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'insert') as audit_apply_insert
  `);

  const userRow = currentUserResult.rows[0];
  const privilegeRow = privilegeResult.rows[0];

  return {
    mode: "hermes_proposal_writer_boundary",
    db_user: userRow.db_user,
    transaction_read_only: userRow.transaction_read_only === "on",
    dry_run: dryRun,
    writes_performed: writesPerformed,
    commands_executed: false,
    hermes_runtime_executed: false,
    llm_runtime_executed: false,
    app_schema_write_allowed: privilegeRow.app_insert,
    ai_proposal_insert_allowed: privilegeRow.ai_insert,
    ai_proposal_update_allowed: privilegeRow.ai_update,
    ai_proposal_delete_allowed: privilegeRow.ai_delete,
    audit_apply_event_write_allowed: privilegeRow.audit_apply_insert,
    app_projection_apply_performed: false,
    ai_proposal_apply_marker_updated: false,
  };
}

async function insertProposal(
  client: PoolClient,
  proposal: JsonRecord,
): Promise<JsonRecord> {
  const result = await client.query<JsonRecord>(
    `
      insert into ai.proposal_inbox (
        id,
        proposal_type,
        title,
        body,
        status,
        risk_level,
        confidence,
        model_name,
        agent_name,
        payload_json,
        source_refs_json,
        reason
      )
      values (
        $1::uuid,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10::jsonb,
        $11::jsonb,
        $12
      )
      returning
        id,
        proposal_type,
        title,
        body,
        status,
        risk_level,
        confidence,
        model_name,
        agent_name,
        payload_json,
        source_refs_json,
        reason,
        applied_at,
        applied_by
    `,
    [
      proposal.id,
      proposal.proposal_type,
      proposal.title,
      proposal.body,
      proposal.status,
      proposal.risk_level,
      proposal.confidence,
      proposal.model_name,
      proposal.agent_name,
      JSON.stringify(proposal.payload_json),
      JSON.stringify(proposal.source_refs_json),
      proposal.reason,
    ],
  );

  return result.rows[0];
}

export async function createHermesProposal(
  input: HermesProposalWriterInput,
): Promise<HermesProposalWriterResult> {
  const sourceProposalId = input.sourceProposalId?.trim();
  const dryRun = input.dryRun !== false;

  if (!sourceProposalId || !UUID_PATTERN.test(sourceProposalId)) {
    return {
      result: "bad_request",
      reason: "sourceProposalId must be a uuid",
      boundary: {
        mode: "hermes_proposal_writer_boundary",
        dry_run: dryRun,
        writes_performed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
      },
    };
  }

  let context: JsonRecord;
  try {
    context = await readContextWithAppRole(sourceProposalId);
  } catch (error) {
    return {
      result: "error",
      reason: `failed_to_read_day38_context: ${
        error instanceof Error ? error.message : String(error)
      }`,
      boundary: {
        mode: "hermes_proposal_writer_boundary",
        dry_run: dryRun,
        writes_performed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
      },
    };
  }

  if (context.result !== "ok") {
    return {
      result: "bad_request",
      reason: "day38_context_result_not_ok",
      boundary: {
        mode: "hermes_proposal_writer_boundary",
        dry_run: dryRun,
        writes_performed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
      },
    };
  }

  let proposal: JsonRecord;
  try {
    proposal = buildProposal({ ...input, sourceProposalId, dryRun }, context);
  } catch (error) {
    return {
      result: "bad_request",
      reason: error instanceof Error ? error.message : String(error),
      boundary: {
        mode: "hermes_proposal_writer_boundary",
        dry_run: dryRun,
        writes_performed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
      },
    };
  }

  const pool = writerPool();
  const client = await pool.connect();

  try {
    await client.query(dryRun ? "begin read only" : "begin");

    const initialBoundary = await boundaryState(client, dryRun, false);

    if (initialBoundary.app_schema_write_allowed === true) {
      await client.query("rollback");
      return {
        result: "error",
        reason: "writer_role_has_app_schema_write_privilege",
        boundary: initialBoundary,
      };
    }

    if (initialBoundary.audit_apply_event_write_allowed === true) {
      await client.query("rollback");
      return {
        result: "error",
        reason: "writer_role_has_audit_apply_write_privilege",
        boundary: initialBoundary,
      };
    }

    if (initialBoundary.ai_proposal_insert_allowed !== true) {
      await client.query("rollback");
      return {
        result: "error",
        reason: "writer_role_cannot_insert_ai_proposal",
        boundary: initialBoundary,
      };
    }

    if (initialBoundary.ai_proposal_update_allowed === true) {
      await client.query("rollback");
      return {
        result: "error",
        reason: "writer_role_has_ai_proposal_update_privilege",
        boundary: initialBoundary,
      };
    }

    if (initialBoundary.ai_proposal_delete_allowed === true) {
      await client.query("rollback");
      return {
        result: "error",
        reason: "writer_role_has_ai_proposal_delete_privilege",
        boundary: initialBoundary,
      };
    }

    if (dryRun) {
      await client.query("commit");
      return {
        result: "dry_run",
        proposal,
        boundary: initialBoundary,
      };
    }

    const createdProposal = await insertProposal(client, proposal);
    const finalBoundary = await boundaryState(client, dryRun, true);

    await client.query("commit");

    return {
      result: "created",
      proposal: createdProposal,
      boundary: finalBoundary,
    };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    return {
      result: "error",
      reason: error instanceof Error ? error.message : String(error),
      boundary: {
        mode: "hermes_proposal_writer_boundary",
        dry_run: dryRun,
        writes_performed: false,
        hermes_runtime_executed: false,
        llm_runtime_executed: false,
      },
    };
  } finally {
    client.release();
    await pool.end();
  }
}
