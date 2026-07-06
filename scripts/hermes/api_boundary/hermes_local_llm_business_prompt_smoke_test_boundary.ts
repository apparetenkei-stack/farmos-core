import {
  runHermesLocalLlmBusinessPromptDryRunContractBoundary,
  type HermesLocalLlmBusinessPromptContractStatus,
} from "./hermes_local_llm_business_prompt_dry_run_contract_boundary";

export const HERMES_LOCAL_LLM_FIXED_BUSINESS_SMOKE_PROMPT =
  "You are Hermes in a smoke test. This is dummy farm-planning text with no real farm data. Respond with exactly: hermes_business_prompt_smoke_ok";

export const HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE =
  "hermes_business_prompt_smoke_ok";

type FetchLike = typeof fetch;

type HermesLocalLlmBusinessPromptSmokeResponseMatchResult =
  | "matched"
  | "unmatched"
  | "not_configured"
  | "blocked"
  | "timeout"
  | "error";

type HermesLocalLlmBusinessPromptSmokeEndpointKind =
  | "ollama_generate"
  | "ollama_chat"
  | "openai_compatible_chat_completions";

type HermesLocalLlmBusinessPromptSmokeBlockedReason =
  | "provider_must_be_string"
  | "provider_forbidden_by_day49_business_prompt_smoke_boundary"
  | "user_prompt_or_business_context_forbidden_by_day49_business_smoke_boundary"
  | "restricted_domain_data_forbidden_by_day49_business_smoke_boundary"
  | "day49_business_prompt_smoke_requires_explicit_smoke_flag"
  | "invalid_endpoint_url_by_day49_business_smoke_boundary"
  | "external_llm_endpoint_forbidden_by_day49_business_smoke_boundary"
  | "local_llm_business_smoke_endpoint_not_allowlisted_by_day49"
  | "fetch_impl_unavailable";

export type HermesLocalLlmBusinessPromptSmokeStatus = {
  mode: "hermes_local_llm_business_prompt_smoke_test_boundary";
  runtime: "local_llm";
  prompt_smoke_mode: "fixed_business_dummy_prompt_only";
  configured_provider: "local_llm_business_prompt_smoke";
  endpoint_config_key:
    | "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT"
    | "HERMES_LOCAL_LLM_CHAT_ENDPOINT";
  model_config_key: "HERMES_LOCAL_LLM_MODEL";
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  runtime_call_allowed: "true_for_fixed_business_dummy_prompt_only";
  fixed_business_dummy_prompt_allowed: true;
  real_business_prompt_allowed: false;
  user_prompt_allowed: false;
  business_context_allowed: false;
  restricted_domain_data_allowed: false;
  prompt_sent: boolean;
  prompt_text_exposed: "safe_fixed_business_dummy_prompt_only";
  expected_response: typeof HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE;
  response_body_exposed: false;
  response_match_result: HermesLocalLlmBusinessPromptSmokeResponseMatchResult;
  contract_status_checked: true;
  contract_mode: HermesLocalLlmBusinessPromptContractStatus["contract_mode"];
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

type HermesLocalLlmBusinessPromptSmokeBoundary = {
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
  request_body_created: boolean;
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
  real_business_prompt_sent_to_model: false;
  fixed_business_dummy_prompt_sent_to_model: boolean;
  tokens_used: number;
};

export type HermesLocalLlmBusinessPromptSmokeTestResult = {
  result: "ok" | "blocked" | "timeout" | "error";
  business_prompt_smoke: HermesLocalLlmBusinessPromptSmokeStatus;
  business_prompt_contract: HermesLocalLlmBusinessPromptContractStatus;
  boundary: HermesLocalLlmBusinessPromptSmokeBoundary;
  blocked_reason?: HermesLocalLlmBusinessPromptSmokeBlockedReason;
  matched_policy?: string;
  error?: string;
};

type HermesLocalLlmBusinessPromptSmokeTestInput = {
  provider?: unknown;
  endpoint?: unknown;
  model?: unknown;
  dryRun?: boolean;
  smoke?: boolean;
  sample?: unknown;
  prompt?: unknown;
  userPrompt?: unknown;
  userMessage?: unknown;
  businessContext?: unknown;
  fetchImpl?: FetchLike;
};

const allowedEndpoints = new Map<
  string,
  HermesLocalLlmBusinessPromptSmokeEndpointKind
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

function makeContractStatus(): HermesLocalLlmBusinessPromptContractStatus {
  return runHermesLocalLlmBusinessPromptDryRunContractBoundary({
    provider: "local_llm_business_prompt_contract",
    dryRun: true,
  }).business_prompt_contract;
}

function makeBusinessPromptSmokeStatus(
  input: {
    endpointConfigKey?:
      | "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT"
      | "HERMES_LOCAL_LLM_CHAT_ENDPOINT";
    promptSent?: boolean;
    responseMatchResult?: HermesLocalLlmBusinessPromptSmokeResponseMatchResult;
    tokensUsed?: number;
  } = {},
): HermesLocalLlmBusinessPromptSmokeStatus {
  return {
    mode: "hermes_local_llm_business_prompt_smoke_test_boundary",
    runtime: "local_llm",
    prompt_smoke_mode: "fixed_business_dummy_prompt_only",
    configured_provider: "local_llm_business_prompt_smoke",
    endpoint_config_key:
      input.endpointConfigKey ?? "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT",
    model_config_key: "HERMES_LOCAL_LLM_MODEL",
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_required: false,
    credentials_exposed: false,
    runtime_call_allowed: "true_for_fixed_business_dummy_prompt_only",
    fixed_business_dummy_prompt_allowed: true,
    real_business_prompt_allowed: false,
    user_prompt_allowed: false,
    business_context_allowed: false,
    restricted_domain_data_allowed: false,
    prompt_sent: input.promptSent ?? false,
    prompt_text_exposed: "safe_fixed_business_dummy_prompt_only",
    expected_response: HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE,
    response_body_exposed: false,
    response_match_result: input.responseMatchResult ?? "not_configured",
    contract_status_checked: true,
    contract_mode: "business_prompt_dry_run_contract_only",
    timeout_policy: {
      connect_timeout_ms: 1000,
      total_timeout_ms: 3000,
      on_timeout: "fallback_to_mock",
    },
    fallback_policy: {
      fallback_provider: "mock",
    },
    tokens_used: input.tokensUsed ?? 0,
  };
}

function makeBoundary(
  input: Partial<HermesLocalLlmBusinessPromptSmokeBoundary> = {},
): HermesLocalLlmBusinessPromptSmokeBoundary {
  const tokensUsed = input.tokens_used ?? 0;

  return {
    writes_performed: false,
    chat_history_write_allowed: false,
    app_schema_write_allowed: false,
    ai_proposal_write_allowed: false,
    audit_apply_event_write_allowed: false,
    proposal_apply_allowed: false,
    hermes_runtime_executed: input.hermes_runtime_executed ?? false,
    llm_runtime_executed: input.llm_runtime_executed ?? false,
    external_api_called: false,
    local_model_called: input.local_model_called ?? false,
    local_runtime_generate_http_called:
      input.local_runtime_generate_http_called ?? false,
    prompt_sent_to_model: input.prompt_sent_to_model ?? false,
    request_body_created: input.request_body_created ?? false,
    request_body_sent: input.request_body_sent ?? false,
    response_body_exposed: false,
    embeddings_executed: false,
    vector_search_executed: false,
    restricted_domain_data_exposed: false,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_exposed: false,
    user_prompt_sent_to_model: false,
    business_context_sent_to_model: false,
    real_business_prompt_sent_to_model: false,
    fixed_business_dummy_prompt_sent_to_model:
      input.fixed_business_dummy_prompt_sent_to_model ?? false,
    tokens_used: tokensUsed,
  };
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeProvider(provider: unknown): {
  ok: boolean;
  blockedReason?: HermesLocalLlmBusinessPromptSmokeBlockedReason;
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

  if (provider.trim().toLowerCase() !== "local_llm_business_prompt_smoke") {
    return {
      ok: false,
      blockedReason:
        "provider_forbidden_by_day49_business_prompt_smoke_boundary",
    };
  }

  return { ok: true };
}

function collectPromptLikeValues(
  input: HermesLocalLlmBusinessPromptSmokeTestInput,
): string {
  return [
    input.sample,
    input.prompt,
    input.userPrompt,
    input.userMessage,
  ]
    .filter(hasNonEmptyString)
    .map((value) => value.trim())
    .join("\n");
}

function hasPromptLikeInput(
  input: HermesLocalLlmBusinessPromptSmokeTestInput,
): boolean {
  return collectPromptLikeValues(input).length > 0;
}

function containsRestrictedDomainData(value: string): boolean {
  const patterns = [
    /customer/i,
    /order/i,
    /shipping/i,
    /payment/i,
    /payroll/i,
    /salary/i,
    /evaluation/i,
    /personal/i,
    /proposal/i,
    /crop_cycle/i,
    /取引先/,
    /顧客/,
    /注文/,
    /出荷先/,
    /支払い/,
    /金額/,
    /給与/,
    /評価/,
    /個人/,
    /提案本文/,
  ] as const;

  return patterns.some((pattern) => pattern.test(value));
}

function getConfiguredEndpoint(inputEndpoint: unknown): {
  endpoint?: string;
  endpointConfigKey:
    | "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT"
    | "HERMES_LOCAL_LLM_CHAT_ENDPOINT";
} {
  if (hasNonEmptyString(inputEndpoint)) {
    return {
      endpoint: inputEndpoint.trim(),
      endpointConfigKey: "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT",
    };
  }

  if (hasNonEmptyString(process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT)) {
    return {
      endpoint: process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT.trim(),
      endpointConfigKey: "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT",
    };
  }

  if (hasNonEmptyString(process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT)) {
    return {
      endpoint: process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT.trim(),
      endpointConfigKey: "HERMES_LOCAL_LLM_CHAT_ENDPOINT",
    };
  }

  return {
    endpointConfigKey: "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT",
  };
}

function getConfiguredModel(inputModel: unknown): string | undefined {
  if (hasNonEmptyString(inputModel)) {
    return inputModel.trim();
  }

  if (hasNonEmptyString(process.env.HERMES_LOCAL_LLM_MODEL)) {
    return process.env.HERMES_LOCAL_LLM_MODEL.trim();
  }

  return undefined;
}

function validateEndpoint(endpoint: string): {
  ok: boolean;
  kind?: HermesLocalLlmBusinessPromptSmokeEndpointKind;
  blockedReason?: HermesLocalLlmBusinessPromptSmokeBlockedReason;
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
      blockedReason: "invalid_endpoint_url_by_day49_business_smoke_boundary",
      matchedPolicy: "endpoint_validation",
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLoopback =
    hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";

  if (!isLoopback) {
    return {
      ok: false,
      blockedReason:
        "external_llm_endpoint_forbidden_by_day49_business_smoke_boundary",
      matchedPolicy: "loopback_only",
    };
  }

  return {
    ok: false,
    blockedReason:
      "local_llm_business_smoke_endpoint_not_allowlisted_by_day49",
    matchedPolicy: "allowlisted_local_business_smoke_endpoint_only",
  };
}

function makeRequestBody(
  kind: HermesLocalLlmBusinessPromptSmokeEndpointKind,
  model: string,
): Record<string, unknown> {
  if (kind === "ollama_generate") {
    return {
      model,
      prompt: HERMES_LOCAL_LLM_FIXED_BUSINESS_SMOKE_PROMPT,
      stream: false,
    };
  }

  if (kind === "ollama_chat") {
    return {
      model,
      messages: [
        {
          role: "user",
          content: HERMES_LOCAL_LLM_FIXED_BUSINESS_SMOKE_PROMPT,
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
        content: HERMES_LOCAL_LLM_FIXED_BUSINESS_SMOKE_PROMPT,
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

export async function runHermesLocalLlmBusinessPromptSmokeTestBoundary(
  input: HermesLocalLlmBusinessPromptSmokeTestInput = {},
): Promise<HermesLocalLlmBusinessPromptSmokeTestResult> {
  const businessPromptContract = makeContractStatus();
  const provider = normalizeProvider(input.provider);

  if (!provider.ok) {
    return {
      result: "blocked",
      business_prompt_smoke: makeBusinessPromptSmokeStatus({
        responseMatchResult: "blocked",
      }),
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
      blocked_reason: provider.blockedReason,
      matched_policy: "provider_validation",
    };
  }

  const promptLikeValues = collectPromptLikeValues(input);

  if (containsRestrictedDomainData(promptLikeValues)) {
    return {
      result: "blocked",
      business_prompt_smoke: makeBusinessPromptSmokeStatus({
        responseMatchResult: "blocked",
      }),
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
      blocked_reason:
        "restricted_domain_data_forbidden_by_day49_business_smoke_boundary",
      matched_policy: "restricted_domain_data_forbidden",
    };
  }

  if (
    hasPromptLikeInput(input) ||
    (input.businessContext !== undefined && input.businessContext !== null)
  ) {
    return {
      result: "blocked",
      business_prompt_smoke: makeBusinessPromptSmokeStatus({
        responseMatchResult: "blocked",
      }),
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
      blocked_reason:
        "user_prompt_or_business_context_forbidden_by_day49_business_smoke_boundary",
      matched_policy: "fixed_business_dummy_prompt_only",
    };
  }

  if (input.dryRun === false && input.smoke !== true) {
    return {
      result: "blocked",
      business_prompt_smoke: makeBusinessPromptSmokeStatus({
        responseMatchResult: "blocked",
      }),
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
      blocked_reason: "day49_business_prompt_smoke_requires_explicit_smoke_flag",
      matched_policy: "explicit_opt_in_required",
    };
  }

  const configuredEndpoint = getConfiguredEndpoint(input.endpoint);
  const model = getConfiguredModel(input.model);

  const businessPromptSmokeBase = makeBusinessPromptSmokeStatus({
    endpointConfigKey: configuredEndpoint.endpointConfigKey,
  });

  if (!configuredEndpoint.endpoint || !model) {
    return {
      result: "ok",
      business_prompt_smoke: {
        ...businessPromptSmokeBase,
        response_match_result: "not_configured",
      },
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
    };
  }

  const endpointValidation = validateEndpoint(configuredEndpoint.endpoint);

  if (!endpointValidation.ok || endpointValidation.kind === undefined) {
    return {
      result: "blocked",
      business_prompt_smoke: {
        ...businessPromptSmokeBase,
        response_match_result: "blocked",
      },
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
      blocked_reason: endpointValidation.blockedReason,
      matched_policy: endpointValidation.matchedPolicy,
    };
  }

  if (input.smoke !== true) {
    return {
      result: "ok",
      business_prompt_smoke: {
        ...businessPromptSmokeBase,
        response_match_result: "not_configured",
      },
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
    };
  }

  const fetchImpl = input.fetchImpl ?? globalThis.fetch;

  if (typeof fetchImpl !== "function") {
    return {
      result: "error",
      business_prompt_smoke: {
        ...businessPromptSmokeBase,
        response_match_result: "error",
      },
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary(),
      blocked_reason: "fetch_impl_unavailable",
      matched_policy: "fetch_impl_required_for_explicit_smoke",
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
    const matched =
      content === HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE;

    return {
      result: "ok",
      business_prompt_smoke: {
        ...businessPromptSmokeBase,
        prompt_sent: true,
        response_match_result: matched ? "matched" : "unmatched",
        tokens_used: tokensUsed,
      },
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary({
        hermes_runtime_executed: true,
        llm_runtime_executed: true,
        local_model_called: true,
        local_runtime_generate_http_called: true,
        prompt_sent_to_model: true,
        request_body_created: true,
        request_body_sent: true,
        fixed_business_dummy_prompt_sent_to_model: true,
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
        business_prompt_smoke: {
          ...businessPromptSmokeBase,
          prompt_sent: true,
          response_match_result: "timeout",
        },
        business_prompt_contract: businessPromptContract,
        boundary: makeBoundary({
          hermes_runtime_executed: true,
          llm_runtime_executed: true,
          local_model_called: true,
          local_runtime_generate_http_called: true,
          prompt_sent_to_model: true,
          request_body_created: true,
          request_body_sent: true,
          fixed_business_dummy_prompt_sent_to_model: true,
        }),
        error: "local_llm_business_prompt_smoke_timeout",
      };
    }

    return {
      result: "error",
      business_prompt_smoke: {
        ...businessPromptSmokeBase,
        prompt_sent: true,
        response_match_result: "error",
      },
      business_prompt_contract: businessPromptContract,
      boundary: makeBoundary({
        hermes_runtime_executed: true,
        llm_runtime_executed: true,
        local_model_called: true,
        local_runtime_generate_http_called: true,
        prompt_sent_to_model: true,
        request_body_created: true,
        request_body_sent: true,
        fixed_business_dummy_prompt_sent_to_model: true,
      }),
      error: "local_llm_business_prompt_smoke_error",
    };
  }
}
