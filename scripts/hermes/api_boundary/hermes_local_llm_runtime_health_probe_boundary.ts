export type HermesLocalLlmRuntimeHealthProbeReachability =
  | "reachable"
  | "unreachable"
  | "not_configured"
  | "blocked"
  | "timeout"
  | "error";

export type HermesLocalLlmRuntimeHealthProbeInput = {
  provider?: unknown;
  dryRun?: boolean;
  probe?: boolean;
  httpMethod?: unknown;
  endpoint?: unknown;
  fetchImpl?: typeof fetch;
};

export type HermesLocalLlmRuntimeHealthProbeStatus = {
  mode: "hermes_local_llm_runtime_health_probe_boundary";
  runtime: "local_llm";
  health_probe_mode: "minimal_runtime_reachability_probe";
  configured_provider: "local_llm_probe";
  endpoint_config_key: "HERMES_LOCAL_LLM_HEALTH_ENDPOINT";
  model_config_key: "HERMES_LOCAL_LLM_MODEL";
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  http_method_allowed: "GET_OR_HEAD_ONLY";
  request_body_sent: false;
  response_body_exposed: false;
  runtime_reachable: HermesLocalLlmRuntimeHealthProbeReachability;
  runtime_call_allowed: "true_for_health_probe_only";
  prompt_sent: false;
  timeout_policy: {
    connect_timeout_ms: 1000;
    total_timeout_ms: 3000;
    on_timeout: "fallback_to_mock";
  };
  fallback_policy: {
    fallback_provider: "mock";
    fallback_reason: "local_llm_health_probe_failed_or_not_enabled";
  };
};

export type HermesLocalLlmRuntimeHealthProbeBoundary = {
  writes_performed: false;
  chat_history_write_allowed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
  proposal_apply_allowed: false;
  hermes_runtime_executed: false;
  llm_runtime_executed: false;
  external_api_called: false;
  local_model_called: false;
  local_runtime_health_http_called: boolean;
  local_runtime_generate_http_called: false;
  prompt_sent_to_model: false;
  request_body_sent: false;
  response_body_exposed: false;
  embeddings_executed: false;
  vector_search_executed: false;
  restricted_domain_data_exposed: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  tokens_used: 0;
};

export type HermesLocalLlmRuntimeHealthProbeResult = {
  result: "ok" | "bad_request" | "blocked" | "timeout" | "error";
  health_probe: HermesLocalLlmRuntimeHealthProbeStatus;
  boundary: HermesLocalLlmRuntimeHealthProbeBoundary;
  blocked_reason?: string;
  matched_policy?: string;
  error?: string;
};

type NormalizedProvider = {
  accepted: boolean;
  badRequest: boolean;
  blockedReason?: string;
  matchedPolicy?: string;
};

type EndpointValidation =
  | {
      allowed: true;
      url: URL;
    }
  | {
      allowed: false;
      badRequest: boolean;
      blockedReason: string;
      matchedPolicy: string;
    };

const endpointConfigKey = "HERMES_LOCAL_LLM_HEALTH_ENDPOINT" as const;
const modelConfigKey = "HERMES_LOCAL_LLM_MODEL" as const;

const timeoutPolicy = {
  connect_timeout_ms: 1000,
  total_timeout_ms: 3000,
  on_timeout: "fallback_to_mock",
} as const;

const fallbackPolicy = {
  fallback_provider: "mock",
  fallback_reason: "local_llm_health_probe_failed_or_not_enabled",
} as const;

const forbiddenInferencePaths = [
  "/api/generate",
  "/api/chat",
  "/v1/chat/completions",
  "/v1/completions",
  "/chat/completions",
  "/completions",
] as const;

const allowedHealthPaths = ["/", "/health", "/api/tags", "/v1/models"] as const;

function makeHealthProbeStatus(
  runtimeReachable: HermesLocalLlmRuntimeHealthProbeReachability,
): HermesLocalLlmRuntimeHealthProbeStatus {
  return {
    mode: "hermes_local_llm_runtime_health_probe_boundary",
    runtime: "local_llm",
    health_probe_mode: "minimal_runtime_reachability_probe",
    configured_provider: "local_llm_probe",
    endpoint_config_key: endpointConfigKey,
    model_config_key: modelConfigKey,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_required: false,
    credentials_exposed: false,
    http_method_allowed: "GET_OR_HEAD_ONLY",
    request_body_sent: false,
    response_body_exposed: false,
    runtime_reachable: runtimeReachable,
    runtime_call_allowed: "true_for_health_probe_only",
    prompt_sent: false,
    timeout_policy: timeoutPolicy,
    fallback_policy: fallbackPolicy,
  };
}

function makeBoundary(
  localRuntimeHealthHttpCalled: boolean,
): HermesLocalLlmRuntimeHealthProbeBoundary {
  return {
    writes_performed: false,
    chat_history_write_allowed: false,
    app_schema_write_allowed: false,
    ai_proposal_write_allowed: false,
    audit_apply_event_write_allowed: false,
    proposal_apply_allowed: false,
    hermes_runtime_executed: false,
    llm_runtime_executed: false,
    external_api_called: false,
    local_model_called: false,
    local_runtime_health_http_called: localRuntimeHealthHttpCalled,
    local_runtime_generate_http_called: false,
    prompt_sent_to_model: false,
    request_body_sent: false,
    response_body_exposed: false,
    embeddings_executed: false,
    vector_search_executed: false,
    restricted_domain_data_exposed: false,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_exposed: false,
    tokens_used: 0,
  };
}

function normalizeProbeProvider(provider: unknown): NormalizedProvider {
  if (provider === undefined || provider === null || provider === "") {
    return {
      accepted: true,
      badRequest: false,
    };
  }

  if (typeof provider !== "string") {
    return {
      accepted: false,
      badRequest: true,
      blockedReason: "provider_must_be_string",
      matchedPolicy: "provider_input_validation",
    };
  }

  const raw = provider.trim().toLowerCase();

  if (
    raw === "local_llm_probe" ||
    raw === "local_llm" ||
    raw === "local_llm_disabled"
  ) {
    return {
      accepted: true,
      badRequest: false,
    };
  }

  return {
    accepted: false,
    badRequest: true,
    blockedReason: "unsupported_local_health_probe_provider",
    matchedPolicy: "local_health_probe_provider_input_validation",
  };
}

function normalizeHttpMethod(method: unknown): {
  method: "GET" | "HEAD";
  allowed: boolean;
  badRequest: boolean;
  blockedReason?: string;
  matchedPolicy?: string;
} {
  if (method === undefined || method === null || method === "") {
    return {
      method: "HEAD",
      allowed: true,
      badRequest: false,
    };
  }

  if (typeof method !== "string") {
    return {
      method: "HEAD",
      allowed: false,
      badRequest: true,
      blockedReason: "http_method_must_be_string",
      matchedPolicy: "http_method_input_validation",
    };
  }

  const raw = method.trim().toUpperCase();

  if (raw === "GET" || raw === "HEAD") {
    return {
      method: raw,
      allowed: true,
      badRequest: false,
    };
  }

  return {
    method: "HEAD",
    allowed: false,
    badRequest: false,
    blockedReason: "http_method_forbidden_by_day46_probe_boundary",
    matchedPolicy: "get_or_head_only",
  };
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

function normalizePath(pathname: string): string {
  if (pathname.length === 0) {
    return "/";
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1).toLowerCase();
  }

  return pathname.toLowerCase();
}

function validateEndpoint(rawEndpoint: string): EndpointValidation {
  let url: URL;

  try {
    url = new URL(rawEndpoint);
  } catch {
    return {
      allowed: false,
      badRequest: true,
      blockedReason: "local_llm_health_endpoint_must_be_valid_url",
      matchedPolicy: "endpoint_url_validation",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      allowed: false,
      badRequest: false,
      blockedReason: "local_llm_health_endpoint_protocol_forbidden_by_day46",
      matchedPolicy: "http_or_https_only",
    };
  }

  if (!isLoopbackHost(url.hostname)) {
    return {
      allowed: false,
      badRequest: false,
      blockedReason: "non_loopback_local_health_endpoint_forbidden_by_day46",
      matchedPolicy: "loopback_local_runtime_only",
    };
  }

  const path = normalizePath(url.pathname);

  if (forbiddenInferencePaths.includes(path as (typeof forbiddenInferencePaths)[number])) {
    return {
      allowed: false,
      badRequest: false,
      blockedReason: "local_llm_inference_endpoint_forbidden_by_day46_probe_boundary",
      matchedPolicy: "generate_chat_completions_endpoint_forbidden",
    };
  }

  if (!allowedHealthPaths.includes(path as (typeof allowedHealthPaths)[number])) {
    return {
      allowed: false,
      badRequest: false,
      blockedReason: "local_llm_health_endpoint_not_in_day46_safe_allowlist",
      matchedPolicy: "safe_health_endpoint_allowlist",
    };
  }

  return {
    allowed: true,
    url,
  };
}

function getEndpointInput(input: HermesLocalLlmRuntimeHealthProbeInput): string | null {
  if (typeof input.endpoint === "string") {
    return input.endpoint.trim().length > 0 ? input.endpoint.trim() : null;
  }

  const configured = process.env[endpointConfigKey];

  if (typeof configured === "string" && configured.trim().length > 0) {
    return configured.trim();
  }

  return null;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    error.message.toLowerCase().includes("timeout")
  );
}

export async function runHermesLocalLlmRuntimeHealthProbeBoundary(
  input: HermesLocalLlmRuntimeHealthProbeInput = {},
): Promise<HermesLocalLlmRuntimeHealthProbeResult> {
  const provider = normalizeProbeProvider(input.provider);

  if (!provider.accepted) {
    return {
      result: provider.badRequest ? "bad_request" : "blocked",
      health_probe: makeHealthProbeStatus("blocked"),
      boundary: makeBoundary(false),
      blocked_reason: provider.blockedReason,
      matched_policy: provider.matchedPolicy,
    };
  }

  const httpMethod = normalizeHttpMethod(input.httpMethod);

  if (!httpMethod.allowed) {
    return {
      result: httpMethod.badRequest ? "bad_request" : "blocked",
      health_probe: makeHealthProbeStatus("blocked"),
      boundary: makeBoundary(false),
      blocked_reason: httpMethod.blockedReason,
      matched_policy: httpMethod.matchedPolicy,
    };
  }

  const endpoint = getEndpointInput(input);

  if (endpoint === null) {
    return {
      result: "ok",
      health_probe: makeHealthProbeStatus("not_configured"),
      boundary: makeBoundary(false),
    };
  }

  const endpointValidation = validateEndpoint(endpoint);

  if (!endpointValidation.allowed) {
    return {
      result: endpointValidation.badRequest ? "bad_request" : "blocked",
      health_probe: makeHealthProbeStatus("blocked"),
      boundary: makeBoundary(false),
      blocked_reason: endpointValidation.blockedReason,
      matched_policy: endpointValidation.matchedPolicy,
    };
  }

  if (input.probe !== true) {
    return {
      result: "ok",
      health_probe: makeHealthProbeStatus("not_configured"),
      boundary: makeBoundary(false),
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutPolicy.total_timeout_ms);

  try {
    const response = await fetchImpl(endpointValidation.url, {
      method: httpMethod.method,
      signal: controller.signal,
      redirect: "manual",
    });

    clearTimeout(timeout);

    const runtimeReachable =
      response.status >= 200 && response.status < 400
        ? "reachable"
        : "unreachable";

    return {
      result: "ok",
      health_probe: makeHealthProbeStatus(runtimeReachable),
      boundary: makeBoundary(true),
    };
  } catch (error) {
    clearTimeout(timeout);

    if (isTimeoutError(error)) {
      return {
        result: "timeout",
        health_probe: makeHealthProbeStatus("timeout"),
        boundary: makeBoundary(true),
        error: "local_llm_health_probe_timeout",
      };
    }

    return {
      result: "error",
      health_probe: makeHealthProbeStatus("error"),
      boundary: makeBoundary(true),
      error: "local_llm_health_probe_error",
    };
  }
}
