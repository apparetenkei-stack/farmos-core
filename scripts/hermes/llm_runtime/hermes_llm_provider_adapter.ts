import {
  HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT,
  runHermesLocalLlmRuntimeSmokeTest,
} from "./hermes_local_llm_runtime_smoke_test";

export const HERMES_LLM_PROVIDER_ADAPTER_SMOKE_PROMPT =
  HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT;

export type HermesLlmProviderName = "ollama" | "mock";

export type HermesLlmProviderStatus =
  | "disabled_by_env"
  | "ok"
  | "mock_fallback"
  | "runtime_error"
  | "timeout"
  | "bad_request"
  | "blocked";

export type HermesLlmProviderRequest = {
  provider?: unknown;
  prompt?: string;
  model?: unknown;
  baseUrl?: unknown;
  timeoutMs?: unknown;
  smokeTestEnabled: boolean;
  fetchImpl?: typeof fetch;
};

export type HermesLlmProviderResponse = {
  provider: HermesLlmProviderName;
  status: HermesLlmProviderStatus;
  runtime_call_allowed: boolean;
  llm_runtime_executed: boolean;
  runtime_reachable: boolean;
  prompt_sent: boolean;
  response_text: string | null;
  response_text_non_empty: boolean;
  tokens_used: number | null;
  base_url: string | null;
  model: string | null;
  timeout_ms: number;
  http_status: number | null;
  error_message: string | null;

  db_write_performed: false;
  proposal_created: false;
  proposal_saved: false;
  proposal_apply_performed: false;
  chat_history_saved: false;
  audit_record_saved: false;
  app_db_write_performed: false;
  route_added: false;
  server_action_added: false;
  form_action_added: false;
  ui_changed: false;
  credentials_required: false;
  credentials_exposed: false;
  external_api_called: false;
};

function normalizeProvider(provider: unknown): HermesLlmProviderName | null {
  if (provider === undefined || provider === null || provider === "") {
    return "ollama";
  }

  return provider === "ollama" || provider === "mock" ? provider : null;
}

function normalizeTimeoutMs(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30000;
  }

  return Math.min(Math.max(parsed, 1000), 120000);
}

function makeResponse(input: {
  provider: HermesLlmProviderName;
  status: HermesLlmProviderStatus;
  runtimeCallAllowed: boolean;
  runtimeExecuted: boolean;
  runtimeReachable: boolean;
  promptSent: boolean;
  responseText: string | null;
  tokensUsed: number | null;
  baseUrl: string | null;
  model: string | null;
  timeoutMs: number;
  httpStatus: number | null;
  errorMessage: string | null;
}): HermesLlmProviderResponse {
  return {
    provider: input.provider,
    status: input.status,
    runtime_call_allowed: input.runtimeCallAllowed,
    llm_runtime_executed: input.runtimeExecuted,
    runtime_reachable: input.runtimeReachable,
    prompt_sent: input.promptSent,
    response_text: input.responseText,
    response_text_non_empty:
      typeof input.responseText === "string" &&
      input.responseText.trim().length > 0,
    tokens_used: input.tokensUsed,
    base_url: input.baseUrl,
    model: input.model,
    timeout_ms: input.timeoutMs,
    http_status: input.httpStatus,
    error_message: input.errorMessage,

    db_write_performed: false,
    proposal_created: false,
    proposal_saved: false,
    proposal_apply_performed: false,
    chat_history_saved: false,
    audit_record_saved: false,
    app_db_write_performed: false,
    route_added: false,
    server_action_added: false,
    form_action_added: false,
    ui_changed: false,
    credentials_required: false,
    credentials_exposed: false,
    external_api_called: false,
  };
}

function mapStatus(status: string): HermesLlmProviderStatus {
  if (
    status === "disabled_by_env" ||
    status === "ok" ||
    status === "mock_fallback" ||
    status === "runtime_error" ||
    status === "timeout" ||
    status === "bad_request" ||
    status === "blocked"
  ) {
    return status;
  }

  return "runtime_error";
}

export async function runHermesLlmProviderAdapter(
  request: HermesLlmProviderRequest,
): Promise<HermesLlmProviderResponse> {
  const provider = normalizeProvider(request.provider);
  const timeoutMs = normalizeTimeoutMs(request.timeoutMs);

  if (!provider) {
    return makeResponse({
      provider: "mock",
      status: "bad_request",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: null,
      tokensUsed: null,
      baseUrl: null,
      model: null,
      timeoutMs,
      httpStatus: null,
      errorMessage: "unsupported_llm_provider",
    });
  }

  if (provider === "mock") {
    return makeResponse({
      provider: "mock",
      status: "mock_fallback",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: "hermes mock provider response",
      tokensUsed: 0,
      baseUrl: null,
      model: null,
      timeoutMs,
      httpStatus: null,
      errorMessage: null,
    });
  }

  const result = await runHermesLocalLlmRuntimeSmokeTest({
    smokeTestEnabled: request.smokeTestEnabled,
    provider: "ollama",
    baseUrl: request.baseUrl,
    model: request.model,
    timeoutMs: request.timeoutMs,
    fetchImpl: request.fetchImpl,
  });

  return makeResponse({
    provider: "ollama",
    status: mapStatus(result.status),
    runtimeCallAllowed: result.runtime_call_allowed,
    runtimeExecuted: result.llm_runtime_executed,
    runtimeReachable: result.runtime_reachable,
    promptSent: result.prompt_sent,
    responseText: result.response_text,
    tokensUsed: result.tokens_used,
    baseUrl: result.base_url,
    model: result.model,
    timeoutMs: result.timeout_ms,
    httpStatus: result.http_status,
    errorMessage: result.error_message,
  });
}

export async function runHermesLlmProviderAdapterFromEnv(): Promise<HermesLlmProviderResponse> {
  return runHermesLlmProviderAdapter({
    smokeTestEnabled: process.env.HERMES_LLM_SMOKE_TEST_ENABLED === "true",
    provider: process.env.HERMES_LLM_PROVIDER ?? "ollama",
    baseUrl: process.env.HERMES_OLLAMA_BASE_URL,
    model: process.env.HERMES_OLLAMA_MODEL,
    timeoutMs: process.env.HERMES_LLM_TIMEOUT_MS,
  });
}
