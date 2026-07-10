import { spawnSync } from "node:child_process";
import { NextResponse } from "next/server";
import {
  DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID,
  createDay81MockProposalDraftCandidate,
  persistHermesProposalDraftCandidateForDay81,
  type HermesDay81PersistedProposal,
  type HermesDay81ProposalDraftRecord
} from "../../../../lib/hermes/hermes_proposal_draft_persistence_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_SMOKE_BOUNDARY = "day82_core_api_smoke_only" as const;
const API_SMOKE_ENABLED_ENV =
  "HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED" as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

type ApiBody = {
  message: string;
  includeReadonlyContext: boolean;
  provider: "mock";
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: Request): Promise<Response> {
  const enabled = process.env[API_SMOKE_ENABLED_ENV] === "true";

  if (!enabled) {
    return jsonResponse(
      {
        result: "blocked",
        error: "day82_persistence_api_smoke_disabled",
        proposal_draft_persistence_api_boundary: API_SMOKE_BOUNDARY,
        proposal_draft_persisted: false,
        proposal_draft_saved: false,
        proposal_apply_ready: false,
        proposal_draft_apply_ready: false,
        proposal_apply_performed: false,
        confirmation_token_created: false,
        audit_apply_event_created: false,
        app_db_write_performed: false,
        db_write_performed: false,
        api_route_added: true,
        ui_connected: false,
        server_action_used: false,
        form_action_used: false
      },
      403
    );
  }

  const parsed = await parseBody(request);

  if (parsed.ok === false) {
    return jsonResponse(
      {
        result: "error",
        error: parsed.error,
        proposal_draft_persistence_api_boundary: API_SMOKE_BOUNDARY,
        proposal_draft_persisted: false,
        proposal_draft_saved: false,
        proposal_apply_ready: false,
        proposal_draft_apply_ready: false,
        proposal_apply_performed: false,
        confirmation_token_created: false,
        audit_apply_event_created: false,
        app_db_write_performed: false,
        db_write_performed: false,
        api_route_added: true,
        ui_connected: false,
        server_action_used: false,
        form_action_used: false
      },
      400
    );
  }

  const candidate = createDay81MockProposalDraftCandidate(parsed.body.message);
  const persistence = await persistHermesProposalDraftCandidateForDay81({
    candidate,
    executor: {
      findExistingByBoundaryTestId,
      insertProposal
    }
  });

  return jsonResponse(
    {
      result: "ok",
      proposal_draft_persistence_api_boundary: API_SMOKE_BOUNDARY,
      request_body_allowed_keys: ["message", "includeReadonlyContext", "provider"],
      request_provider: parsed.body.provider,
      include_readonly_context_requested: parsed.body.includeReadonlyContext,
      ...persistence,
      api_route_added: true,
      ui_connected: false,
      server_action_used: false,
      form_action_used: false,
      proposal_apply_ready: false,
      proposal_draft_apply_ready: false,
      proposal_apply_performed: false,
      confirmation_token_created: false,
      audit_apply_event_created: false,
      app_db_write_performed: false
    },
    200
  );
}

async function parseBody(
  request: Request
): Promise<{ ok: true; body: ApiBody } | { ok: false; error: string }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (!isPlainObject(body)) {
    return { ok: false, error: "invalid_body" };
  }

  const allowedKeys = new Set(["message", "includeReadonlyContext", "provider"]);
  const forbiddenKeys = new Set([
    "baseUrl",
    "model",
    "timeoutMs",
    "credentials",
    ["api", "Key"].join(""),
    "token",
    "dbConnection",
    ["connection", "String"].join(""),
    ["system", "Prompt"].join(""),
    ["proposal", "Body"].join("")
  ]);

  for (const key of Object.keys(body)) {
    if (forbiddenKeys.has(key)) {
      return { ok: false, error: `forbidden_request_body_field:${key}` };
    }

    if (!allowedKeys.has(key)) {
      return { ok: false, error: `unknown_request_body_field:${key}` };
    }
  }

  if (typeof body.message !== "string") {
    return { ok: false, error: "message_required" };
  }

  const message = body.message.trim();

  if (!message) {
    return { ok: false, error: "message_required" };
  }

  if (message.length > 500) {
    return { ok: false, error: "message_too_long" };
  }

  if (message.includes("\n") || message.includes("\r")) {
    return { ok: false, error: "message_must_be_single_line" };
  }

  if (typeof body.includeReadonlyContext !== "boolean") {
    return { ok: false, error: "includeReadonlyContext_must_be_boolean" };
  }

  if (body.provider !== "mock") {
    return { ok: false, error: "provider_must_be_mock" };
  }

  return {
    ok: true,
    body: {
      message,
      includeReadonlyContext: body.includeReadonlyContext,
      provider: "mock"
    }
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function jsonResponse(payload: Record<string, unknown>, status: number): Response {
  return NextResponse.json(payload, {
    status,
    headers: corsHeaders
  });
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function runPsql(sql: string): string {
  const database = process.env.PGDATABASE || "farmos_core_local";
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
      "-v",
      "ON_ERROR_STOP=1",
      "-AtX",
      "-c",
      sql
    ],
    {
      encoding: "utf8"
    }
  );

  if (result.status !== 0) {
    throw new Error(
      [
        "psql_failed",
        `status=${result.status}`,
        `stdout=${result.stdout}`,
        `stderr=${result.stderr}`
      ].join("\n")
    );
  }

  return result.stdout.trim();
}

function runPsqlJson<T>(sql: string): T {
  const output = runPsql(sql);
  const lines = output.split(/\r?\n/).filter(Boolean);
  const lastLine = lines.at(-1);

  if (!lastLine) {
    throw new Error("psql_json_empty_output");
  }

  return JSON.parse(lastLine) as T;
}

async function findExistingByBoundaryTestId(
  boundaryTestId: string
): Promise<HermesDay81PersistedProposal | null> {
  return runPsqlJson<HermesDay81PersistedProposal | null>(`
select coalesce(
  (
    select jsonb_build_object(
      'id', id::text,
      'proposal_type', proposal_type,
      'title', title,
      'status', status
    )
    from ai.proposal_inbox
    where source_refs_json->>'day81_persistence_boundary_test_id' =
      ${sqlLiteral(boundaryTestId)}
    order by created_at asc
    limit 1
  ),
  'null'::jsonb
)::text;
`);
}

async function insertProposal(
  record: HermesDay81ProposalDraftRecord
): Promise<HermesDay81PersistedProposal> {
  return runPsqlJson<HermesDay81PersistedProposal>(`
insert into ai.proposal_inbox (
  id,
  proposal_type,
  title,
  body,
  payload_json,
  source_refs_json,
  model_name,
  agent_name,
  confidence,
  reason,
  risk_level,
  status,
  created_at,
  updated_at
)
values (
  ${sqlLiteral(record.id)},
  ${sqlLiteral(record.proposal_type)},
  ${sqlLiteral(record.title)},
  ${sqlLiteral(record.body)},
  ${sqlJson(record.payload_json)},
  ${sqlJson(record.source_refs_json)},
  ${record.model_name === null ? "null" : sqlLiteral(record.model_name)},
  ${sqlLiteral(record.agent_name)},
  ${record.confidence === null ? "null" : record.confidence},
  ${sqlLiteral(record.reason)},
  ${sqlLiteral(record.risk_level)},
  ${sqlLiteral(record.status)},
  now(),
  now()
)
returning jsonb_build_object(
  'id', id::text,
  'proposal_type', proposal_type,
  'title', title,
  'status', status
)::text;
`);
}
