export const HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT =
  "Reply with exactly: hermes local llm smoke ok";

export type HermesLocalLlmProvider =
  | "ollama"
  | "lmstudio_openai_compatible"
  | "mock";

export type HermesLocalLlmRuntimeSmokeStatus =
  | "disabled_by_env"
  | "ok"
  | "mock_fallback"
  | "bad_request"
  | "blocked"
  | "runtime_error"
  | "timeout"
  | "model_missing_or_endpoint_not_found";

export type HermesLocalLlmRuntimeSmokeResult = {
  result: "ok" | "disabled" | "failed" | "blocked" | "bad_request";
  mode: "hermes_local_llm_runtime_actual_smoke_test";
  provider: HermesLocalLlmProvider;
  status: HermesLocalLlmRuntimeSmokeStatus;
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
  boundary: {
    cli_only: true;
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
    endpoint_value_exposed: boolean;
    model_value_exposed: boolean;
    http_request_dispatched: boolean;
    fixed_smoke_prompt_only: boolean;
    user_business_context_sent: false;
  };
};

export type HermesLocalLlmFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type HermesLocalLlmRuntimeSmokeInput = {
  smokeTestEnabled?: boolean;
  provider?: unknown;
  baseUrl?: unknown;
  model?: unknown;
  timeoutMs?: unknown;
  prompt?: unknown;
  fetchImpl?: HermesLocalLlmFetch;
};

function normalizeProvider(provider: unknown): HermesLocalLlmProvider | null {
  if (provider === undefined || provider === null || provider === "") {
    return "ollama";
  }

  if (provider === "ollama") {
    return "ollama";
  }

  if (
    provider === "lmstudio_openai_compatible" ||
    provider === "lmstudio-openai-compatible"
  ) {
    return "lmstudio_openai_compatible";
  }

  if (provider === "mock") {
    return "mock";
  }

  return null;
}

function normalizeBaseUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/\/+$/u, "");
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

function normalizeModel(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

function normalizePrompt(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

function normalizeTimeoutMs(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30000;
  }

  return Math.min(Math.max(parsed, 1000), 120000);
}

function isLoopbackHttpBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function makeResult(input: {
  result: HermesLocalLlmRuntimeSmokeResult["result"];
  provider: HermesLocalLlmProvider;
  status: HermesLocalLlmRuntimeSmokeStatus;
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
  httpRequestDispatched: boolean;
  endpointValueExposed: boolean;
  modelValueExposed: boolean;
  fixedSmokePromptOnly?: boolean;
}): HermesLocalLlmRuntimeSmokeResult {
  return {
    result: input.result,
    mode: "hermes_local_llm_runtime_actual_smoke_test",
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
    boundary: {
      cli_only: true,
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
      endpoint_value_exposed: input.endpointValueExposed,
      model_value_exposed: input.modelValueExposed,
      http_request_dispatched: input.httpRequestDispatched,
      fixed_smoke_prompt_only: input.fixedSmokePromptOnly ?? true,
      user_business_context_sent: false,
    },
  };
}

function readBooleanEnv(value: string | undefined): boolean {
  return value === "true";
}

function extractOllamaResponseText(payload: unknown): string | null {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.response === "string") {
      return record.response;
    }

    const message = record.message;
    if (message && typeof message === "object") {
      const messageRecord = message as Record<string, unknown>;
      if (typeof messageRecord.content === "string") {
        return messageRecord.content;
      }
    }
  }

  return null;
}

function extractTokensUsed(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const promptEvalCount =
    typeof record.prompt_eval_count === "number" ? record.prompt_eval_count : 0;
  const evalCount = typeof record.eval_count === "number" ? record.eval_count : 0;
  const total = promptEvalCount + evalCount;

  return total > 0 ? total : null;
}

function classifyError(error: unknown): {
  status: HermesLocalLlmRuntimeSmokeStatus;
  message: string;
} {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      status: "timeout",
      message: "local_llm_runtime_timeout",
    };
  }

  if (error instanceof Error) {
    return {
      status: "runtime_error",
      message: error.message,
    };
  }

  return {
    status: "runtime_error",
    message: "unknown_local_llm_runtime_error",
  };
}

async function readErrorPayload(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      if (typeof record.error === "string") {
        return record.error;
      }
    }
  } catch {
    return response.statusText || "local_llm_runtime_http_error";
  }

  return response.statusText || "local_llm_runtime_http_error";
}

export async function runHermesLocalLlmRuntimeSmokeTest(
  input: HermesLocalLlmRuntimeSmokeInput = {},
): Promise<HermesLocalLlmRuntimeSmokeResult> {
  const provider = normalizeProvider(input.provider);

  if (provider === null) {
    return makeResult({
      result: "bad_request",
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
      timeoutMs: normalizeTimeoutMs(input.timeoutMs),
      httpStatus: null,
      errorMessage: "unsupported_local_llm_provider",
      httpRequestDispatched: false,
      endpointValueExposed: false,
      modelValueExposed: false,
    });
  }

  const timeoutMs = normalizeTimeoutMs(input.timeoutMs);
  const baseUrl =
    normalizeBaseUrl(input.baseUrl) ??
    (provider === "ollama" ? "http://127.0.0.1:11434" : null);
  const model = normalizeModel(input.model);
  const prompt =
    normalizePrompt(input.prompt) ?? HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT;
  const fixedSmokePromptOnly =
    prompt === HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT;

  if (input.smokeTestEnabled !== true) {
    return makeResult({
      result: "disabled",
      provider,
      status: "disabled_by_env",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: null,
      tokensUsed: null,
      baseUrl,
      model,
      timeoutMs,
      httpStatus: null,
      errorMessage: null,
      httpRequestDispatched: false,
      endpointValueExposed: baseUrl !== null,
      modelValueExposed: model !== null,
    });
  }

  if (provider === "mock") {
    return makeResult({
      result: "ok",
      provider,
      status: "mock_fallback",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: "mock fallback: hermes local llm smoke ok",
      tokensUsed: 0,
      baseUrl,
      model,
      timeoutMs,
      httpStatus: null,
      errorMessage: null,
      httpRequestDispatched: false,
      endpointValueExposed: false,
      modelValueExposed: false,
    });
  }

  if (provider !== "ollama") {
    return makeResult({
      result: "blocked",
      provider,
      status: "blocked",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: null,
      tokensUsed: null,
      baseUrl,
      model,
      timeoutMs,
      httpStatus: null,
      errorMessage: "day65_only_ollama_actual_smoke_is_enabled",
      httpRequestDispatched: false,
      endpointValueExposed: baseUrl !== null,
      modelValueExposed: model !== null,
    });
  }

  if (baseUrl === null || !isLoopbackHttpBaseUrl(baseUrl)) {
    return makeResult({
      result: "blocked",
      provider,
      status: "blocked",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: null,
      tokensUsed: null,
      baseUrl,
      model,
      timeoutMs,
      httpStatus: null,
      errorMessage: "ollama_base_url_must_be_loopback_http",
      httpRequestDispatched: false,
      endpointValueExposed: baseUrl !== null,
      modelValueExposed: model !== null,
    });
  }

  if (model === null) {
    return makeResult({
      result: "bad_request",
      provider,
      status: "bad_request",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      responseText: null,
      tokensUsed: null,
      baseUrl,
      model,
      timeoutMs,
      httpStatus: null,
      errorMessage: "HERMES_OLLAMA_MODEL is required for actual smoke mode",
      httpRequestDispatched: false,
      endpointValueExposed: true,
      modelValueExposed: false,
    });
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${baseUrl}/api/generate`;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await readErrorPayload(response);
      return makeResult({
        result: "failed",
        provider,
        status:
          response.status === 404
            ? "model_missing_or_endpoint_not_found"
            : "runtime_error",
        runtimeCallAllowed: true,
        runtimeExecuted: true,
        runtimeReachable: false,
        promptSent: true,
        responseText: null,
        tokensUsed: null,
        baseUrl,
        model,
        timeoutMs,
        httpStatus: response.status,
        errorMessage: message,
        httpRequestDispatched: true,
      fixedSmokePromptOnly,
        endpointValueExposed: true,
        modelValueExposed: true,
      });
    }

    const payload = (await response.json()) as unknown;
    const responseText = extractOllamaResponseText(payload);

    return makeResult({
      result:
        responseText !== null && responseText.trim().length > 0 ? "ok" : "failed",
      provider,
      status:
        responseText !== null && responseText.trim().length > 0
          ? "ok"
          : "runtime_error",
      runtimeCallAllowed: true,
      runtimeExecuted: true,
      runtimeReachable: true,
      promptSent: true,
      responseText,
      tokensUsed: extractTokensUsed(payload),
      baseUrl,
      model,
      timeoutMs,
      httpStatus: response.status,
      errorMessage:
        responseText !== null && responseText.trim().length > 0
          ? null
          : "local_llm_response_text_empty",
      httpRequestDispatched: true,
      fixedSmokePromptOnly,
      endpointValueExposed: true,
      modelValueExposed: true,
    });
  } catch (error) {
    const classified = classifyError(error);

    return makeResult({
      result: "failed",
      provider,
      status: classified.status,
      runtimeCallAllowed: true,
      runtimeExecuted: true,
      runtimeReachable: false,
      promptSent: true,
      responseText: null,
      tokensUsed: null,
      baseUrl,
      model,
      timeoutMs,
      httpStatus: null,
      errorMessage: classified.message,
      httpRequestDispatched: true,
      fixedSmokePromptOnly,
      endpointValueExposed: true,
      modelValueExposed: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function runHermesLocalLlmRuntimeSmokeTestFromEnv(): Promise<HermesLocalLlmRuntimeSmokeResult> {
  return runHermesLocalLlmRuntimeSmokeTest({
    smokeTestEnabled: readBooleanEnv(process.env.HERMES_LLM_SMOKE_TEST_ENABLED),
    provider: process.env.HERMES_LLM_PROVIDER,
    baseUrl: process.env.HERMES_OLLAMA_BASE_URL,
    model: process.env.HERMES_OLLAMA_MODEL,
    timeoutMs: process.env.HERMES_LLM_TIMEOUT_MS,
  });
}
