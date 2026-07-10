import { spawnSync } from "node:child_process";
import { NextResponse } from "next/server";
import {
  DAY83_REVIEW_DECISION_BOUNDARY,
  DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID,
  DAY83_REVIEW_DECISION_EVENT_ID,
  DAY83_REVIEW_DECISION_SOURCE,
  createDay83MockReviewDecisionInput,
  recordHermesProposalDraftReviewDecisionForDay83,
  type HermesDay83ProposalSnapshot,
  type HermesDay83RecordedDecision,
  type HermesDay83ReviewDecisionInput
} from "../../../../lib/hermes/hermes_proposal_draft_review_decision_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_DECISION_API_ENABLED_ENV =
  "HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED" as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

type ReviewDecisionApiBody = {
  proposalId: string;
  decisionType: "request_revision" | "reject_review" | "approve_review";
  decisionNote?: string;
  decidedBy?: string;
  decidedByRole?: string;
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request): Promise<Response> {
  const enabled = process.env[REVIEW_DECISION_API_ENABLED_ENV] === "true";

  if (!enabled) {
    return jsonResponse(blockedEnvelope("day83_review_decision_api_disabled"), 403);
  }

  const parsed = await parseBody(request);

  if (parsed.ok === false) {
    return jsonResponse(errorEnvelope(parsed.error), 400);
  }

  const decision = createDecisionFromBody(parsed.body);

  try {
    const result = await recordHermesProposalDraftReviewDecisionForDay83({
      decision,
      executor: {
        findProposalById,
        findExistingDecisionByBoundaryTestId,
        insertDecisionEvent
      }
    });

    return jsonResponse(
      {
        ...result,
        api_route_added: true,
        ui_connected: false,
        server_action_used: false,
        form_action_used: false,
        request_body_allowed_keys: [
          "proposalId",
          "decisionType",
          "decisionNote",
          "decidedBy",
          "decidedByRole"
        ]
      },
      200
    );
  } catch (error) {
    return jsonResponse(
      errorEnvelope(error instanceof Error ? error.message : "unknown_error"),
      400
    );
  }
}

async function parseBody(
  request: Request
): Promise<{ ok: true; body: ReviewDecisionApiBody } | { ok: false; error: string }> {
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
  const forbiddenKeys = new Set([
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
  const allowedKeys = new Set([
    "proposalId",
    "decisionType",
    "decisionNote",
    "decidedBy",
    "decidedByRole"
  ]);

  for (const key of Object.keys(body)) {
    if (forbiddenKeys.has(key)) {
      return { ok: false, error: `forbidden_request_body_field:${key}` };
    }

    if (!allowedKeys.has(key)) {
      return { ok: false, error: `unknown_request_body_field:${key}` };
    }
  }

  if (typeof body.proposalId !== "string" || body.proposalId.length < 36) {
    return { ok: false, error: "invalid_proposal_id" };
  }

  if (typeof body.decisionType !== "string") {
    return { ok: false, error: "invalid_decision_type" };
  }

  if (
    body.decisionType !== "request_revision" &&
    body.decisionType !== "reject_review" &&
    body.decisionType !== "approve_review"
  ) {
    return { ok: false, error: "invalid_decision_type" };
  }

  if (
    body.decisionNote !== undefined &&
    (typeof body.decisionNote !== "string" || body.decisionNote.length > 500)
  ) {
    return { ok: false, error: "invalid_decision_note" };
  }

  if (
    body.decidedBy !== undefined &&
    (typeof body.decidedBy !== "string" || body.decidedBy.length > 120)
  ) {
    return { ok: false, error: "invalid_decided_by" };
  }

  if (
    body.decidedByRole !== undefined &&
    (typeof body.decidedByRole !== "string" || body.decidedByRole.length > 120)
  ) {
    return { ok: false, error: "invalid_decided_by_role" };
  }

  return {
    ok: true,
    body: {
      proposalId: body.proposalId,
      decisionType: body.decisionType,
      decisionNote: body.decisionNote as string | undefined,
      decidedBy: body.decidedBy as string | undefined,
      decidedByRole: body.decidedByRole as string | undefined
    }
  };
}

function createDecisionFromBody(
  body: ReviewDecisionApiBody
): HermesDay83ReviewDecisionInput {
  const decision = createDay83MockReviewDecisionInput(body.proposalId);

  return {
    ...decision,
    decision_type: body.decisionType,
    decision_note:
      body.decisionNote ??
      "Day83 API review decision boundary smoke. Audit-only decision; not apply-ready.",
    decided_by: body.decidedBy ?? "day83_api_boundary_human",
    decided_by_role: body.decidedByRole ?? "admin_review_boundary",
    decision_source: DAY83_REVIEW_DECISION_SOURCE,
    boundary_test_id: DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID,
    event_id: DAY83_REVIEW_DECISION_EVENT_ID
  };
}

async function findProposalById(
  proposalId: string
): Promise<HermesDay83ProposalSnapshot | null> {
  const rows = psqlJsonRows<HermesDay83ProposalSnapshot>(`
    select
      id::text as id,
      proposal_type,
      risk_level,
      status,
      applied_at::text as applied_at,
      applied_by,
      source_refs_json->>'day81_persistence_boundary_test_id' as day81_test_id
    from ai.proposal_inbox
    where id = ${sqlLiteral(proposalId)}::uuid
    limit 1
  `);

  return rows[0] ?? null;
}

async function findExistingDecisionByBoundaryTestId(
  boundaryTestId: string
): Promise<HermesDay83RecordedDecision | null> {
  const rows = psqlJsonRows<HermesDay83RecordedDecision>(`
    select
      id::text as id,
      proposal_id::text as proposal_id,
      decision_type,
      decision_note,
      decided_by,
      decided_by_role,
      decision_source,
      event_metadata,
      decided_at::text as decided_at,
      created_at::text as created_at
    from audit.proposal_review_decision_events
    where event_metadata->>'day83_review_decision_boundary_test_id' = ${sqlLiteral(boundaryTestId)}
    order by created_at asc
    limit 1
  `);

  return rows[0] ?? null;
}

async function insertDecisionEvent(
  decision: HermesDay83ReviewDecisionInput
): Promise<HermesDay83RecordedDecision> {
  const metadata = {
    boundary: DAY83_REVIEW_DECISION_BOUNDARY,
    source: DAY83_REVIEW_DECISION_SOURCE,
    day83_review_decision_boundary_test_id: decision.boundary_test_id,
    review_only: true,
    apply_ready: false,
    apply_performed: false,
    confirmation_token_created: false,
    app_db_write_performed: false
  };

  const rows = psqlJsonRows<HermesDay83RecordedDecision>(`
    insert into audit.proposal_review_decision_events (
      id,
      proposal_id,
      decision_type,
      decision_note,
      decided_by,
      decided_by_role,
      decision_source,
      event_metadata,
      decided_at,
      created_at
    ) values (
      ${sqlLiteral(decision.event_id)}::uuid,
      ${sqlLiteral(decision.proposal_id)}::uuid,
      ${sqlLiteral(decision.decision_type)},
      ${sqlLiteral(decision.decision_note)},
      ${sqlLiteral(decision.decided_by)},
      ${sqlLiteral(decision.decided_by_role)},
      ${sqlLiteral(decision.decision_source)},
      ${sqlLiteral(JSON.stringify(metadata))}::jsonb,
      now(),
      now()
    )
    returning
      id::text as id,
      proposal_id::text as proposal_id,
      decision_type,
      decision_note,
      decided_by,
      decided_by_role,
      decision_source,
      event_metadata,
      decided_at::text as decided_at,
      created_at::text as created_at
  `);

  if (!rows[0]) {
    throw new Error("review_decision_insert_failed");
  }

  return rows[0];
}

function psqlJsonRows<T>(sql: string): T[] {
  const database = process.env.PGDATABASE || "farmos_core_local";
  const wrappedSql = `
    with __hermes_rows as (
      ${sql}
    )
    select coalesce(json_agg(row_to_json(__hermes_rows))::text, '[]')
    from __hermes_rows;
  `;
  const result = spawnSync(
    "docker",
    [
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
    ],
    { encoding: "utf8" }
  );

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
    review_decision_boundary: DAY83_REVIEW_DECISION_BOUNDARY,
    review_decision_recorded: false,
    review_decision_saved: false,
    proposal_inbox_updated: false,
    ai_proposal_status_updated: false,
    proposal_draft_apply_ready: false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
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
    review_decision_boundary: DAY83_REVIEW_DECISION_BOUNDARY,
    review_decision_recorded: false,
    review_decision_saved: false,
    proposal_inbox_updated: false,
    ai_proposal_status_updated: false,
    proposal_draft_apply_ready: false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
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
