import { NextResponse } from "next/server";

import {
  HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS,
  runHermesCliChatRuntime,
  type HermesCliChatResponseEnvelope,
} from "../../../../../scripts/hermes/llm_runtime/hermes_cli_chat_runtime";
import type {
  HermesLlmProviderName,
  HermesLlmProviderStatus,
} from "../../../../../scripts/hermes/llm_runtime/hermes_llm_provider_adapter";
import type {
  HermesFarmosReadonlyContextEnvelope,
} from "../../../../../scripts/hermes/llm_runtime/hermes_farmos_readonly_context";
import {
  createHermesRuntimeMetadata,
  createHermesRuntimeRequestId,
  readHermesRuntimeNowMs,
  type HermesRuntimeMetadata,
} from "../../../../../scripts/hermes/llm_runtime/hermes_runtime_contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BOUNDARY = "hermes_api_chat_minimal_boundary" as const;

const HERMES_API_CHAT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Vary": "Origin",
} as const;

const ALLOWED_BODY_FIELDS = new Set([
  "message",
  "includeReadonlyContext",
  "provider",
]);

const FORBIDDEN_BODY_FIELDS = [
  "baseUrl",
  "model",
  "timeoutMs",
  "credentials",
  "apiKey",
  "token",
  "dbConnection",
  "connectionString",
  "systemPrompt",
  "proposalBody",
  "requestId",
  "request_id",
  "taskType",
  "task_type",
  "priority",
  "modelClass",
  "model_class",
] as const;

type EnvMap = Record<string, string | undefined>;
type JsonRecord = Record<string, unknown>;

function runtimeErrorCode(
  envelope: HermesCliChatResponseEnvelope,
): string | null {
  if (envelope.status === "ok" || envelope.status === "mock_fallback") return null;
  if (envelope.status === "timeout") return "runtime_timeout";
  if (envelope.status === "runtime_error") return "runtime_error";
  if (envelope.status === "disabled_by_env") return "runtime_disabled";
  if (envelope.status === "blocked") return "runtime_blocked";
  return envelope.error_message;
}

type HermesProposalDraftCandidate = {
  id: "dry_run_day78_proposal_draft_candidate";
  status: "draft_preview_only";
  proposal_type: "hermes_chat_draft_preview";
  source: "mock";
  title: string;
  summary: string;
  persistence: "not_saved";
  requires_human_review: true;
  created_from_message: true;
};

function buildProposalDraftCandidate(message: string): HermesProposalDraftCandidate {
  const normalized = message.trim();
  const shortMessage =
    normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;

  return {
    id: "dry_run_day78_proposal_draft_candidate",
    status: "draft_preview_only",
    proposal_type: "hermes_chat_draft_preview",
    source: "mock",
    title: "Hermes draft proposal preview",
    summary: `Mock draft candidate generated from validated message: ${shortMessage}`,
    persistence: "not_saved",
    requires_human_review: true,
    created_from_message: true,
  };
}

export type HermesApiChatMinimalBoundaryEnvelope =
  Omit<HermesCliChatResponseEnvelope, "route_added"> & {
    api_boundary: typeof API_BOUNDARY;
    api_boundary_enabled: boolean;
    route_added: true;
    api_route_added: true;
    ui_connected: false;
    server_action_used: false;
    form_action_used: false;
    request_body_received: boolean;
    request_body_valid: boolean;
    request_json_parse_error: boolean;
    response_envelope_normalized: true;
    production_chat_enabled: false;
    proposal_draft_candidate_enabled: boolean;
    proposal_draft_created: boolean;
    proposal_draft_saved: false;
    proposal_draft_persisted: false;
    proposal_draft_apply_ready: false;
    proposal_draft_candidate: HermesProposalDraftCandidate | null;
    runtime_metadata: HermesRuntimeMetadata;
  };

export type HermesApiChatMinimalBoundaryResult = {
  httpStatus: 200 | 400;
  body: HermesApiChatMinimalBoundaryEnvelope;
};

type ValidatedBody =
  | {
      ok: true;
      provider: HermesLlmProviderName;
      message: string;
      includeReadonlyContext: boolean;
    }
  | {
      ok: false;
      provider: HermesLlmProviderName;
      message: unknown;
      includeReadonlyContext: boolean;
      errorMessage: string;
    };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProvider(value: unknown): HermesLlmProviderName {
  return value === "mock" ? "mock" : "ollama";
}

function readProvider(value: unknown): HermesLlmProviderName | null {
  if (value === undefined || value === null || value === "") return null;
  if (value === "mock" || value === "ollama") return value;
  return null;
}

function validateBody(body: unknown, env: EnvMap): ValidatedBody {
  if (!isRecord(body)) {
    return {
      ok: false,
      provider: normalizeProvider(env.HERMES_LLM_PROVIDER),
      message: undefined,
      includeReadonlyContext: false,
      errorMessage: "api_request_body_must_be_json_object",
    };
  }

  const forbiddenField = FORBIDDEN_BODY_FIELDS.find((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (forbiddenField) {
    return {
      ok: false,
      provider: normalizeProvider(body.provider ?? env.HERMES_LLM_PROVIDER),
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: `forbidden_request_body_field:${forbiddenField}`,
    };
  }

  const unknownField = Object.keys(body).find(
    (field) => !ALLOWED_BODY_FIELDS.has(field),
  );

  if (unknownField) {
    return {
      ok: false,
      provider: normalizeProvider(body.provider ?? env.HERMES_LLM_PROVIDER),
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: `unknown_request_body_field:${unknownField}`,
    };
  }

  const provider = readProvider(body.provider ?? env.HERMES_LLM_PROVIDER ?? "ollama");
  if (!provider) {
    return {
      ok: false,
      provider: "ollama",
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: "unsupported_llm_provider",
    };
  }

  if (
    body.includeReadonlyContext !== undefined &&
    typeof body.includeReadonlyContext !== "boolean"
  ) {
    return {
      ok: false,
      provider,
      message: body.message,
      includeReadonlyContext: false,
      errorMessage: "include_readonly_context_must_be_boolean",
    };
  }

  if (typeof body.message !== "string") {
    return {
      ok: false,
      provider,
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: "api_chat_message_missing",
    };
  }

  if (body.message.trim().length === 0) {
    return {
      ok: false,
      provider,
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: "api_chat_message_empty",
    };
  }

  if (body.message.length > HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS) {
    return {
      ok: false,
      provider,
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: "api_chat_message_too_long",
    };
  }

  if (/[\r\n]/u.test(body.message)) {
    return {
      ok: false,
      provider,
      message: body.message,
      includeReadonlyContext: body.includeReadonlyContext === true,
      errorMessage: "api_chat_message_multiline_not_allowed",
    };
  }

  return {
    ok: true,
    provider,
    message: body.message,
    includeReadonlyContext: body.includeReadonlyContext === true,
  };
}

function normalizeEnvelope(input: {
  envelope: HermesCliChatResponseEnvelope;
  apiBoundaryEnabled: boolean;
  requestBodyReceived: boolean;
  requestBodyValid: boolean;
  requestJsonParseError: boolean;
  proposalDraftCandidate?: HermesProposalDraftCandidate | null;
  runtimeMetadata: HermesRuntimeMetadata;
}): HermesApiChatMinimalBoundaryEnvelope {
  return {
    ...input.envelope,
    route_added: true,
    server_action_added: false,
    form_action_added: false,
    ui_changed: false,
    context_write_allowed: false,
    db_write_performed: false,
    proposal_created: false,
    proposal_saved: false,
    proposal_apply_performed: false,
    chat_history_saved: false,
    audit_record_saved: false,
    app_db_write_performed: false,
    credentials_required: false,
    credentials_exposed: false,
    business_context_included: false,
    proposal_context_included: false,
    api_boundary: API_BOUNDARY,
    api_boundary_enabled: input.apiBoundaryEnabled,
    api_route_added: true,
    ui_connected: false,
    server_action_used: false,
    form_action_used: false,
    request_body_received: input.requestBodyReceived,
    request_body_valid: input.requestBodyValid,
    request_json_parse_error: input.requestJsonParseError,
    response_envelope_normalized: true,
    production_chat_enabled: false,
    proposal_draft_candidate_enabled: input.proposalDraftCandidate !== undefined,
    proposal_draft_created: input.proposalDraftCandidate !== undefined && input.proposalDraftCandidate !== null,
    proposal_draft_saved: false,
    proposal_draft_persisted: false,
    proposal_draft_apply_ready: false,
    proposal_draft_candidate: input.proposalDraftCandidate ?? null,
    runtime_metadata: input.runtimeMetadata,
  };
}

async function makeStoppedEnvelope(input: {
  env: EnvMap;
  provider: HermesLlmProviderName;
  message: unknown;
  includeReadonlyContext: boolean;
  status: HermesLlmProviderStatus;
  errorMessage: string;
  apiBoundaryEnabled: boolean;
  requestBodyReceived: boolean;
  requestBodyValid: boolean;
  requestJsonParseError: boolean;
  runtimeMetadataFor: (
    envelope: HermesCliChatResponseEnvelope,
  ) => HermesRuntimeMetadata;
}): Promise<HermesApiChatMinimalBoundaryEnvelope> {
  const seed = await runHermesCliChatRuntime({
    smokeTestEnabled: false,
    provider: input.provider,
    message: input.message,
    includeReadonlyContext: false,
    baseUrl: input.env.HERMES_OLLAMA_BASE_URL,
    model: input.env.HERMES_OLLAMA_MODEL,
    timeoutMs: input.env.HERMES_LLM_TIMEOUT_MS,
  });

  const envelope: HermesCliChatResponseEnvelope = {
      ...seed,
      status: input.status,
      runtime_call_allowed: false,
      llm_runtime_executed: false,
      runtime_reachable: false,
      prompt_sent: false,
      response_text: null,
      response_text_non_empty: false,
      tokens_used: null,
      http_status: null,
      error_message: input.errorMessage,
      readonly_context_requested: input.includeReadonlyContext,
      readonly_context_read_performed: false,
      readonly_context_included: false,
      readonly_context_non_empty: false,
      readonly_context_length: 0,
      readonly_context_truncated: false,
      context_write_allowed: false,
      db_read_performed: false,
      db_write_performed: false,
      farm_context_included: false,
      db_context_included: false,
  };

  return normalizeEnvelope({
    envelope,
    apiBoundaryEnabled: input.apiBoundaryEnabled,
    requestBodyReceived: input.requestBodyReceived,
    requestBodyValid: input.requestBodyValid,
    requestJsonParseError: input.requestJsonParseError,
    runtimeMetadata: input.runtimeMetadataFor(envelope),
  });
}

export async function runHermesApiChatMinimalBoundary(input: {
  body: unknown;
  requestJsonParseError?: boolean;
  env?: EnvMap;
  fetchImpl?: typeof fetch;
  readonlyContextReader?: () => Promise<HermesFarmosReadonlyContextEnvelope>;
  requestIdFactory?: () => string;
  nowMs?: () => number;
}): Promise<HermesApiChatMinimalBoundaryResult> {
  const env = input.env ?? process.env;
  const requestId = (input.requestIdFactory ?? createHermesRuntimeRequestId)();
  const nowMs = input.nowMs ?? readHermesRuntimeNowMs;
  const startedAtMs = nowMs();
  const apiBoundaryEnabled =
    env.HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED === "true";

  const runtimeMetadata = (envelope: HermesCliChatResponseEnvelope) =>
    createHermesRuntimeMetadata({
      requestId,
      providerStatus: envelope.status,
      runtimeReachable: envelope.runtime_reachable,
      timeoutMs: envelope.timeout_ms,
      startedAtMs,
      finishedAtMs: nowMs(),
      errorCode: runtimeErrorCode(envelope),
    });

  if (input.requestJsonParseError === true) {
    return {
      httpStatus: 400,
      body: await makeStoppedEnvelope({
        env,
        provider: normalizeProvider(env.HERMES_LLM_PROVIDER),
        message: undefined,
        includeReadonlyContext: false,
        status: "bad_request",
        errorMessage: "api_request_json_parse_error",
        apiBoundaryEnabled,
        requestBodyReceived: true,
        requestBodyValid: false,
        requestJsonParseError: true,
        runtimeMetadataFor: runtimeMetadata,
      }),
    };
  }

  const validation = validateBody(input.body, env);

  if (validation.ok === false) {
    return {
      httpStatus: 400,
      body: await makeStoppedEnvelope({
        env,
        provider: validation.provider,
        message: validation.message,
        includeReadonlyContext: validation.includeReadonlyContext,
        status: "bad_request",
        errorMessage: validation.errorMessage,
        apiBoundaryEnabled,
        requestBodyReceived: true,
        requestBodyValid: false,
        requestJsonParseError: false,
        runtimeMetadataFor: runtimeMetadata,
      }),
    };
  }

  if (!apiBoundaryEnabled) {
    return {
      httpStatus: 200,
      body: await makeStoppedEnvelope({
        env,
        provider: validation.provider,
        message: validation.message,
        includeReadonlyContext: validation.includeReadonlyContext,
        status: "blocked",
        errorMessage: "api_boundary_disabled_by_env",
        apiBoundaryEnabled: false,
        requestBodyReceived: true,
        requestBodyValid: true,
        requestJsonParseError: false,
        runtimeMetadataFor: runtimeMetadata,
      }),
    };
  }

  let runtimeEnvelope: HermesCliChatResponseEnvelope;
  try {
    runtimeEnvelope = await runHermesCliChatRuntime({
      smokeTestEnabled: env.HERMES_LLM_SMOKE_TEST_ENABLED === "true",
      provider: validation.provider,
      message: validation.message,
      includeReadonlyContext: validation.includeReadonlyContext,
      baseUrl: env.HERMES_OLLAMA_BASE_URL,
      model: env.HERMES_OLLAMA_MODEL,
      timeoutMs: env.HERMES_LLM_TIMEOUT_MS,
      fetchImpl: input.fetchImpl,
      readonlyContextReader: input.readonlyContextReader,
    });
  } catch {
    return {
      httpStatus: 200,
      body: await makeStoppedEnvelope({
        env,
        provider: validation.provider,
        message: validation.message,
        includeReadonlyContext: validation.includeReadonlyContext,
        status: "runtime_error",
        errorMessage: "api_runtime_execution_failed",
        apiBoundaryEnabled: true,
        requestBodyReceived: true,
        requestBodyValid: true,
        requestJsonParseError: false,
        runtimeMetadataFor: runtimeMetadata,
      }),
    };
  }

  return {
    httpStatus: runtimeEnvelope.status === "bad_request" ? 400 : 200,
    body: normalizeEnvelope({
      envelope: runtimeEnvelope,
      apiBoundaryEnabled: true,
      requestBodyReceived: true,
      requestBodyValid: runtimeEnvelope.status !== "bad_request",
      requestJsonParseError: false,
      runtimeMetadata: runtimeMetadata(runtimeEnvelope),
      proposalDraftCandidate:
        validation.provider === "mock" && runtimeEnvelope.status !== "bad_request"
          ? buildProposalDraftCandidate(validation.message)
          : null,
    }),
  };
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: HERMES_API_CHAT_CORS_HEADERS,
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  let requestJsonParseError = false;

  try {
    body = await request.json();
  } catch {
    requestJsonParseError = true;
  }

  const result = await runHermesApiChatMinimalBoundary({
    body,
    requestJsonParseError,
  });

  return NextResponse.json(result.body, {
    status: result.httpStatus,
    headers: HERMES_API_CHAT_CORS_HEADERS,
  });
}
