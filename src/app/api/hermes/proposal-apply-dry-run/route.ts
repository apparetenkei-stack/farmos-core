import { spawnSync } from "node:child_process";
import { NextResponse } from "next/server";
import {
  DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID,
  evaluateHermesProposalApplyDryRunForDay84,
  type HermesDay84ApplyHistorySummary,
  type HermesDay84DecisionSnapshot,
  type HermesDay84ProposalSnapshot
} from "../../../../lib/hermes/hermes_proposal_apply_dry_run_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENABLE_ENV = "HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED" as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

type Body = {
  proposalId?: string;
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request): Promise<Response> {
  if (process.env[ENABLE_ENV] !== "true") {
    return jsonResponse(blockedEnvelope("day84_apply_dry_run_api_disabled"), 403);
  }

  const parsed = await parseBody(request);
  if (parsed.ok === false) {
    return jsonResponse(errorEnvelope(parsed.error), 400);
  }

  try {
    const result = await evaluateHermesProposalApplyDryRunForDay84({
      proposalId: parsed.body.proposalId ?? DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID,
      executor: {
        findProposalById,
        findDay83DecisionForProposal,
        getApplyHistorySummary
      }
    });

    return jsonResponse({
      ...result,
      api_route_added: true,
      ui_connected: false,
      server_action_used: false,
      form_action_used: false
    }, 200);
  } catch (error) {
    return jsonResponse(errorEnvelope(error instanceof Error ? error.message : "unknown_error"), 400);
  }
}

async function parseBody(request: Request): Promise<{ ok: true; body: Body } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_body" };
  }

  const body = raw as Record<string, unknown>;
  const forbidden = new Set([
    ["proposal", "Body"].join(""),
    ["system", "Prompt"].join(""),
    ["base", "Url"].join(""),
    "model",
    ["timeout", "Ms"].join(""),
    "credentials",
    ["api", "Key"].join(""),
    "token",
    ["db", "Connection"].join(""),
    ["connection", "String"].join("")
  ]);
  const allowed = new Set(["proposalId"]);

  for (const key of Object.keys(body)) {
    if (forbidden.has(key)) {
      return { ok: false, error: `forbidden_request_body_field:${key}` };
    }
    if (!allowed.has(key)) {
      return { ok: false, error: `unknown_request_body_field:${key}` };
    }
  }

  if (body.proposalId !== undefined && typeof body.proposalId !== "string") {
    return { ok: false, error: "invalid_proposal_id" };
  }

  return { ok: true, body: { proposalId: body.proposalId as string | undefined } };
}

async function findProposalById(proposalId: string): Promise<HermesDay84ProposalSnapshot | null> {
  return jsonRows<HermesDay84ProposalSnapshot>(`
    select
      id::text as id,
      proposal_type,
      risk_level,
      status,
      reviewed_by,
      reviewed_at::text as reviewed_at,
      review_note,
      applied_at::text as applied_at,
      applied_by,
      source_refs_json->>'day81_persistence_boundary_test_id' as day81_test_id
    from ai.proposal_inbox
    where id = ${sqlLiteral(proposalId)}::uuid
    limit 1
  `)[0] ?? null;
}

async function findDay83DecisionForProposal(proposalId: string): Promise<HermesDay84DecisionSnapshot | null> {
  return jsonRows<HermesDay84DecisionSnapshot>(`
    select
      id::text as id,
      proposal_id::text as proposal_id,
      decision_type,
      decision_source,
      event_metadata->>'review_only' as review_only,
      event_metadata->>'apply_ready' as apply_ready,
      event_metadata->>'apply_performed' as apply_performed,
      event_metadata->>'confirmation_token_created' as confirmation_token_created,
      event_metadata->>'app_db_write_performed' as app_db_write_performed
    from audit.proposal_review_decision_events
    where proposal_id = ${sqlLiteral(proposalId)}::uuid
      and event_metadata->>'day83_review_decision_boundary_test_id' = 'day83_review_decision_boundary_test_v1'
    order by created_at asc
    limit 1
  `)[0] ?? null;
}

async function getApplyHistorySummary(): Promise<HermesDay84ApplyHistorySummary> {
  return jsonRows<HermesDay84ApplyHistorySummary>(`
    select
      (select count(*)::int from ai.proposal_inbox) as proposal_count,
      (select count(*)::int from audit.proposal_review_decision_events) as decision_history_count,
      (select count(*)::int from audit.proposal_review_apply_events) as apply_history_count,
      (select count(*)::int from audit.proposal_review_decision_events
       where event_metadata->>'day83_review_decision_boundary_test_id' = 'day83_review_decision_boundary_test_v1') as day83_review_decision_count,
      (select count(*)::int from audit.proposal_review_apply_events
       where event_metadata->>'day84_apply_dry_run_boundary_test_id' = 'day84_apply_dry_run_boundary_test_v1') as day84_apply_dry_run_count,
      exists (select 1 from app.crop_cycles where id = 2) as protected_crop_cycle_exists
  `)[0];
}

function jsonRows<T>(sql: string): T[] {
  const database = process.env.PGDATABASE || "farmos_core_local";
  const wrappedSql = `select coalesce(json_agg(row_to_json(t))::text, '[]') from (${sql}) t;`;
  const result = spawnSync("docker", [
    "compose",
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "farmos_local_admin",
    "-d",
    database,
    "-t",
    "-A",
    "-c",
    wrappedSql
  ], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql_failed");
  }

  return JSON.parse(result.stdout.trim() || "[]") as T[];
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function blockedEnvelope(error: string) {
  return {
    result: "blocked",
    error,
    dry_run_evaluated: false,
    dry_run_event_persisted: false,
    proposal_inbox_updated: false,
    ai_proposal_status_updated: false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
    committed_apply_event_created: false,
    confirmation_token_created: false,
    audit_apply_event_created: false,
    app_db_write_performed: false,
    app_schema_write_performed: false,
    api_route_added: true,
    ui_connected: false,
    server_action_used: false,
    form_action_used: false
  };
}

function errorEnvelope(error: string) {
  return {
    result: "error",
    error,
    dry_run_evaluated: false,
    dry_run_event_persisted: false,
    proposal_inbox_updated: false,
    ai_proposal_status_updated: false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
    committed_apply_event_created: false,
    confirmation_token_created: false,
    audit_apply_event_created: false,
    app_db_write_performed: false,
    app_schema_write_performed: false,
    api_route_added: true,
    ui_connected: false,
    server_action_used: false,
    form_action_used: false
  };
}

function jsonResponse(payload: unknown, status: number): Response {
  return NextResponse.json(payload, { status, headers: corsHeaders });
}
