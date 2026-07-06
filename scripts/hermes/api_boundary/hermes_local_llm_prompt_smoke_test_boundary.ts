export const HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT =
  "Respond with exactly: hermes_local_llm_smoke_ok";

export const HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE =
  "hermes_local_llm_smoke_ok";

type FetchLike = typeof fetch;

type HermesLocalLlmPromptSmokeResponseMatchResult =
  | "matched"
  | "unmatched"
  | "not_configured"
  | "blocked"
  | "timeout"
  | "error";

type HermesLocalLlmPromptSmokeEndpointKind =
  | "ollama_generate"
  | "ollama_chat"
  | "openai_compatible_chat_completions";

export type HermesLocalLlmPromptSmokeStatus = {
  mode: "hermes_local_llm_prompt_smoke_test_boundary";
  runtime: "local_llm";
  prompt_smoke_mode: "fixed_non_business_prompt_only";
  configured_provider: "local_llm_prompt_smoke";
  endpoint_config_key:
    | "HERMES_LOCAL_LLM_SMOKE_ENDPOINT"
    | "HERMES_LOCAL_LLM_CHAT_ENDPOINT";
  model_config_key: "HERMES_LOCAL_LLM_MODEL";
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  runtime_call_allowed: "true_for_fixed_smoke_prompt_only";
  fixed_prompt_allowed: true;
  user_prompt_allowed: false;
  business_context_allowed: false;
  prompt_sent: boolean;
  prompt_text_exposed: "safe_fixed_prompt_only";
  expected_response: typeof HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE;
  response_body_exposed: false;
  response_match_result: HermesLocalLlmPromptSmokeResponseMatchResult;
  timeout_policy: {
    connect_timeout_ms: 1000;
    total_timeout_ms: 3000;
    on_timeout: "fallback_to_mock";
  };
  fallback_policy: {
    fallback_provider: "mock";
  };
  tokens_used: number;
};

type HermesLocalLlmPromptSmokeBoundary = {
  writes_performed: false;
  chat_history_write_allowed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
  proposal_apply_allowed: false;
  hermes_runtime_executed: boolean;
  llm_runtime_executed: boolean;
  external_api_called: false;
  local_model_called: boolean;
  local_runtime_generate_http_called: boolean;
  prompt_sent_to_model: boolean;
  request_body_sent: boolean;
  response_body_exposed: false;
  embeddings_executed: false;
  vector_search_executed: false;
  restricted_domain_data_exposed: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  user_prompt_sent_to_model: false;
  business_context_sent_to_model: false;
  fixed_smoke_prompt_sent_to_model: boolean;
  tokens_used: number;
};

export type HermesLocalLlmPromptSmokeTestResult = {
  result: "ok" | "blocked" | "timeout" | "error";
  prompt_smoke: HermesLocalLlmPromptSmokeStatus;
  boundary: HermesLocalLlmPromptSmokeBoundary;
  blocked_reason?: string;
  matched_policy?: string;
  error?: string;
};

type HermesLocalLlmPromptSmokeTestInput = {
  provider?: unknown;
  endpoint?: unknown;
  model?: unknown;
  dryRun?: boolean;
  smoke?: boolean;
  prompt?: unknown;
  userPrompt?: unknown;
  userMessage?: unknown;
  businessContext?: unknown;
  fetchImpl?: FetchLike;
};

const allowedEndpoints = new Map<
  string,
  HermesLocalLlmPromptSmokeEndpointKind
>([
  ["http://127.0.0.1:11434/api/generate", "ollama_generate"],
  ["http://127.0.0.1:11434/api/chat", "ollama_chat"],
  [
    "http://127.0.0.1:1234/v1/chat/completions",
    "openai_compatible_chat_completions",
  ],
  [
    "http://localhost:1234/v1/chat/completions",
    "openai_compatible_chat_completions",
  ],
]);

function makePromptSmokeStatus(
  partial: Partial<HermesLocalLlmPromptSmokeStatus> = {},
): HermesLocalLlmPromptSmokeStatus {
  return {
    mode: "hermes_local_llm_prompt_smoke_test_boundary",
    runtime: "local_llm",
    prompt_smoke_mode: "fixed_non_business_prompt_only",
    configured_provider: "local_llm_prompt_smoke",
    endpoint_config_key:
      partial.endpoint_config_key ?? "HERMES_LOCAL_LLM_SMOKE_ENDPOINT",
    model_config_key: "HERMES_LOCAL_LLM_MODEL",
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_required: false,
    credentials_exposed: false,
    runtime_call_allowed: "true_for_fixed_smoke_prompt_only",
    fixed_prompt_allowed: true,
    user_prompt_allowed: false,
    business_context_allowed: false,
    prompt_sent: partial.prompt_sent ?? false,
    prompt_text_exposed: "safe_fixed_prompt_only",
    expected_response: HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE,
    response_body_exposed: false,
    response_match_result: partial.response_match_result ?? "not_configured",
    timeout_policy: {
      connect_timeout_ms: 1000,
      total_timeout_ms: 3000,
      on_timeout: "fallback_to_mock",
    },
    fallback_policy: {
      fallback_provider: "mock",
    },
    tokens_used: partial.tokens_used ?? 0,
  };
}

function makeBoundary(
  partial: Partial<HermesLocalLlmPromptSmokeBoundary> = {},
): HermesLocalLlmPromptSmokeBoundary {
  const tokensUsed = partial.tokens_used ?? 0;

  return {
    writes_performed: false,
    chat_history_write_allowed: false,
    app_schema_write_allowed: false,
    ai_proposal_write_allowed: false,
    audit_apply_event_write_allowed: false,
    proposal_apply_allowed: false,
    hermes_runtime_executed: partial.hermes_runtime_executed ?? false,
    llm_runtime_executed: partial.llm_runtime_executed ?? false,
    external_api_called: false,
    local_model_called: partial.local_model_called ?? false,
    local_runtime_generate_http_called:
      partial.local_runtime_generate_http_called ?? false,
    prompt_sent_to_model: partial.prompt_sent_to_model ?? false,
    request_body_sent: partial.request_body_sent ?? false,
    response_body_exposed: false,
    embeddings_executed: false,
    vector_search_executed: false,
    restricted_domain_data_exposed: false,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_exposed: false,
    user_prompt_sent_to_model: false,
    business_context_sent_to_model: false,
    fixed_smoke_prompt_sent_to_model:
      partial.fixed_smoke_prompt_sent_to_model ?? false,
    tokens_used: tokensUsed,
  };
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasForbiddenPromptInput(
  input: HermesLocalLlmPromptSmokeTestInput,
): boolean {
  if (hasNonEmptyString(input.prompt)) return true;
  if (hasNonEmptyString(input.userPrompt)) return true;
  if (hasNonEmptyString(input.userMessage)) return true;
  if (input.businessContext !== undefined && input.businessContext !== null) {
    return true;
  }

  return false;
}

function normalizeProvider(provider: unknown): {
  ok: boolean;
  blockedReason?: string;
} {
  if (provider === undefined || provider === null || provider === "") {
    return { ok: true };
  }

  if (typeof provider !== "string") {
    return {
      ok: false,
      blockedReason: "provider_must_be_string",
    };
  }

  if (provider.trim().toLowerCase() !== "local_llm_prompt_smoke") {
    return {
      ok: false,
      blockedReason: "provider_forbidden_by_day47_prompt_smoke_boundary",
    };
  }

  return { ok: true };
}

function getConfiguredEndpoint(inputEndpoint: unknown): {
  endpoint?: string;
  endpointConfigKey:
    | "HERMES_LOCAL_LLM_SMOKE_ENDPOINT"
    | "HERMES_LOCAL_LLM_CHAT_ENDPOINT";
} {
  if (typeof inputEndpoint === "string" && inputEndpoint.trim().length > 0) {
    return {
      endpoint: inputEndpoint.trim(),
      endpointConfigKey: "HERMES_LOCAL_LLM_SMOKE_ENDPOINT",
    };
  }

  if (
    typeof process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT === "string" &&
    process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT.trim().length > 0
  ) {
    return {
      endpoint: process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT.trim(),
      endpointConfigKey: "HERMES_LOCAL_LLM_SMOKE_ENDPOINT",
    };
  }

  if (
    typeof process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT === "string" &&
    process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT.trim().length > 0
  ) {
    return {
      endpoint: process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT.trim(),
      endpointConfigKey: "HERMES_LOCAL_LLM_CHAT_ENDPOINT",
    };
  }

  return {
    endpointConfigKey: "HERMES_LOCAL_LLM_SMOKE_ENDPOINT",
  };
}

function getConfiguredModel(inputModel: unknown): string | undefined {
  if (typeof inputModel === "string" && inputModel.trim().length > 0) {
    return inputModel.trim();
  }

  if (
    typeof process.env.HERMES_LOCAL_LLM_MODEL === "string" &&
    process.env.HERMES_LOCAL_LLM_MODEL.trim().length > 0
  ) {
    return process.env.HERMES_LOCAL_LLM_MODEL.trim();
  }

  return undefined;
}

function validateEndpoint(endpoint: string): {
  ok: boolean;
  kind?: HermesLocalLlmPromptSmokeEndpointKind;
  blockedReason?: string;
  matchedPolicy?: string;
} {
  const kind = allowedEndpoints.get(endpoint);

  if (kind !== undefined) {
    return { ok: true, kind };
  }

  let parsed: URL;

  try {
    parsed = new URL(endpoint);
  } catch {
    return {
      ok: false,
      blockedReason: "invalid_endpoint_url_by_day47_prompt_smoke_boundary",
      matchedPolicy: "endpoint_validation",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopback =
    hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";

  if (!isLoopback) {
    return {
      ok: false,
      blockedReason: "external_llm_endpoint_forbidden_by_day47_smoke_boundary",
      matchedPolicy: "loopback_only",
    };
  }

  return {
    ok: false,
    blockedReason: "local_llm_prompt_smoke_endpoint_not_allowlisted_by_day47",
    matchedPolicy: "allowlisted_local_smoke_endpoint_only",
  };
}

function makeRequestBody(
  kind: HermesLocalLlmPromptSmokeEndpointKind,
  model: string,
): Record<string, unknown> {
  if (kind === "ollama_generate") {
    return {
      model,
      prompt: HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT,
      stream: false,
    };
  }

  if (kind === "ollama_chat") {
    return {
      model,
      messages: [
        {
          role: "user",
          content: HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT,
        },
      ],
      stream: false,
    };
  }

  return {
    model,
    messages: [
      {
        role: "user",
        content: HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT,
      },
    ],
    temperature: 0,
    stream: false,
  };
}

function extractContentFromResponseBody(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }

  const record = value as Record<string, unknown>;

  if (typeof record.response === "string") {
    return record.response;
  }

  const message = record.message;
  if (typeof message === "object" && message !== null) {
    const content = (message as Record<string, unknown>).content;
    if (typeof content === "string") {
      return content;
    }
  }

  const choices = record.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const firstMessage = first?.message;
    if (typeof firstMessage === "object" && firstMessage !== null) {
      const content = (firstMessage as Record<string, unknown>).content;
      if (typeof content === "string") {
        return content;
      }
    }
  }

  return "";
}

function extractTokensUsed(value: unknown): number {
  if (typeof value !== "object" || value === null) {
    return 0;
  }

  const record = value as Record<string, unknown>;
  const usage = record.usage;

  if (typeof usage === "object" && usage !== null) {
    const totalTokens = (usage as Record<string, unknown>).total_tokens;
    if (typeof totalTokens === "number" && Number.isFinite(totalTokens)) {
      return Math.max(0, Math.trunc(totalTokens));
    }
  }

  const promptEvalCount = record.prompt_eval_count;
  const evalCount = record.eval_count;

  const safePromptEvalCount =
    typeof promptEvalCount === "number" && Number.isFinite(promptEvalCount)
      ? Math.max(0, Math.trunc(promptEvalCount))
      : 0;

  const safeEvalCount =
    typeof evalCount === "number" && Number.isFinite(evalCount)
      ? Math.max(0, Math.trunc(evalCount))
      : 0;

  return safePromptEvalCount + safeEvalCount;
}

async function fetchWithTimeout(input: {
  endpoint: string;
  requestBody: Record<string, unknown>;
  fetchImpl: FetchLike;
}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    return await input.fetchImpl(input.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input.requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function runHermesLocalLlmPromptSmokeTestBoundary(
  input: HermesLocalLlmPromptSmokeTestInput = {},
): Promise<HermesLocalLlmPromptSmokeTestResult> {
  const provider = normalizeProvider(input.provider);

  if (!provider.ok) {
    return {
      result: "blocked",
      prompt_smoke: makePromptSmokeStatus({
        response_match_result: "blocked",
      }),
      boundary: makeBoundary(),
      blocked_reason: provider.blockedReason,
      matched_policy: "provider_validation",
    };
  }

  if (hasForbiddenPromptInput(input)) {
    return {
      result: "blocked",
      prompt_smoke: makePromptSmokeStatus({
        response_match_result: "blocked",
      }),
      boundary: makeBoundary(),
      blocked_reason:
        "user_prompt_or_business_context_forbidden_by_day47_smoke_boundary",
      matched_policy: "fixed_prompt_only",
    };
  }

  if (input.dryRun === false && input.smoke !== true) {
    return {
      result: "blocked",
      prompt_smoke: makePromptSmokeStatus({
        response_match_result: "blocked",
      }),
      boundary: makeBoundary(),
      blocked_reason: "day47_prompt_smoke_requires_explicit_smoke_flag",
      matched_policy: "explicit_opt_in_required",
    };
  }

  const configuredEndpoint = getConfiguredEndpoint(input.endpoint);
  const model = getConfiguredModel(input.model);

  const promptSmokeBase = makePromptSmokeStatus({
    endpoint_config_key: configuredEndpoint.endpointConfigKey,
  });

  if (!configuredEndpoint.endpoint || !model) {
    return {
      result: "ok",
      prompt_smoke: {
        ...promptSmokeBase,
        response_match_result: "not_configured",
      },
      boundary: makeBoundary(),
    };
  }

  const endpointValidation = validateEndpoint(configuredEndpoint.endpoint);

  if (!endpointValidation.ok || endpointValidation.kind === undefined) {
    return {
      result: "blocked",
      prompt_smoke: {
        ...promptSmokeBase,
        response_match_result: "blocked",
      },
      boundary: makeBoundary(),
      blocked_reason: endpointValidation.blockedReason,
      matched_policy: endpointValidation.matchedPolicy,
    };
  }

  if (input.smoke !== true) {
    return {
      result: "ok",
      prompt_smoke: {
        ...promptSmokeBase,
        response_match_result: "not_configured",
      },
      boundary: makeBoundary(),
    };
  }

  const fetchImpl = input.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    return {
      result: "error",
      prompt_smoke: {
        ...promptSmokeBase,
        response_match_result: "error",
      },
      boundary: makeBoundary(),
      error: "fetch_impl_unavailable",
    };
  }

  const requestBody = makeRequestBody(endpointValidation.kind, model);

  try {
    const response = await fetchWithTimeout({
      endpoint: configuredEndpoint.endpoint,
      requestBody,
      fetchImpl,
    });

    const responseJson = await response.json().catch(() => null);
    const content = extractContentFromResponseBody(responseJson).trim();
    const tokensUsed = extractTokensUsed(responseJson);
    const matched = content === HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE;

    return {
      result: "ok",
      prompt_smoke: {
        ...promptSmokeBase,
        prompt_sent: true,
        response_match_result: matched ? "matched" : "unmatched",
        tokens_used: tokensUsed,
      },
      boundary: makeBoundary({
        hermes_runtime_executed: true,
        llm_runtime_executed: true,
        local_model_called: true,
        local_runtime_generate_http_called: true,
        prompt_sent_to_model: true,
        request_body_sent: true,
        fixed_smoke_prompt_sent_to_model: true,
        tokens_used: tokensUsed,
      }),
    };
  } catch (error) {
    const isAbort =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"));

    if (isAbort) {
      return {
        result: "timeout",
        prompt_smoke: {
          ...promptSmokeBase,
          prompt_sent: true,
          response_match_result: "timeout",
        },
        boundary: makeBoundary({
          hermes_runtime_executed: true,
          llm_runtime_executed: true,
          local_model_called: true,
          local_runtime_generate_http_called: true,
          prompt_sent_to_model: true,
          request_body_sent: true,
          fixed_smoke_prompt_sent_to_model: true,
        }),
        error: "local_llm_prompt_smoke_timeout",
      };
    }

    return {
      result: "error",
      prompt_smoke: {
        ...promptSmokeBase,
        prompt_sent: true,
        response_match_result: "error",
      },
      boundary: makeBoundary({
        hermes_runtime_executed: true,
        llm_runtime_executed: true,
        local_model_called: true,
        local_runtime_generate_http_called: true,
        prompt_sent_to_model: true,
        request_body_sent: true,
        fixed_smoke_prompt_sent_to_model: true,
      }),
      error:
        error instanceof Error
          ? error.message
          : "local_llm_prompt_smoke_unknown_error",
    };
  }
}
