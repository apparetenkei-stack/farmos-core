export type HermesLocalLlmRuntimeHealthCheckInput = {
  provider?: unknown;
  dryRun?: boolean;
};

export type HermesLocalLlmRuntimeHealthCheckStatus = {
  mode: "hermes_local_llm_runtime_health_check_boundary";
  runtime: "local_llm";
  health_check_mode: "dry_run_contract_only";
  configured_provider: "local_llm_disabled";
  endpoint_config_key: "HERMES_LOCAL_LLM_ENDPOINT";
  model_config_key: "HERMES_LOCAL_LLM_MODEL";
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  runtime_reachable: "not_checked_by_day45";
  runtime_call_allowed: false;
  prompt_sent: false;
  timeout_policy: {
    connect_timeout_ms: 1000;
    total_timeout_ms: 3000;
    on_timeout: "fallback_to_mock";
  };
  fallback_policy: {
    fallback_provider: "mock";
    fallback_reason: "local_llm_runtime_not_enabled_by_day45";
  };
};

export type HermesLocalLlmRuntimeHealthCheckBoundary = {
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
  local_runtime_health_http_called: false;
  prompt_sent_to_model: false;
  embeddings_executed: false;
  vector_search_executed: false;
  restricted_domain_data_exposed: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  tokens_used: 0;
};

export type HermesLocalLlmRuntimeHealthCheckResult = {
  result: "ok" | "bad_request" | "blocked" | "error";
  health_check: HermesLocalLlmRuntimeHealthCheckStatus;
  boundary: HermesLocalLlmRuntimeHealthCheckBoundary;
  blocked_reason?: string;
  matched_policy?: string;
  error?: string;
};

const healthCheckStatus: HermesLocalLlmRuntimeHealthCheckStatus = {
  mode: "hermes_local_llm_runtime_health_check_boundary",
  runtime: "local_llm",
  health_check_mode: "dry_run_contract_only",
  configured_provider: "local_llm_disabled",
  endpoint_config_key: "HERMES_LOCAL_LLM_ENDPOINT",
  model_config_key: "HERMES_LOCAL_LLM_MODEL",
  endpoint_value_exposed: false,
  model_value_exposed: false,
  credentials_required: false,
  credentials_exposed: false,
  runtime_reachable: "not_checked_by_day45",
  runtime_call_allowed: false,
  prompt_sent: false,
  timeout_policy: {
    connect_timeout_ms: 1000,
    total_timeout_ms: 3000,
    on_timeout: "fallback_to_mock",
  },
  fallback_policy: {
    fallback_provider: "mock",
    fallback_reason: "local_llm_runtime_not_enabled_by_day45",
  },
};

const boundary: HermesLocalLlmRuntimeHealthCheckBoundary = {
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
  local_runtime_health_http_called: false,
  prompt_sent_to_model: false,
  embeddings_executed: false,
  vector_search_executed: false,
  restricted_domain_data_exposed: false,
  endpoint_value_exposed: false,
  model_value_exposed: false,
  credentials_exposed: false,
  tokens_used: 0,
};

function normalizeHealthProvider(provider: unknown): {
  accepted: boolean;
  badRequest: boolean;
  blockedReason?: string;
  matchedPolicy?: string;
} {
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

  if (raw === "local_llm" || raw === "local_llm_disabled") {
    return {
      accepted: true,
      badRequest: false,
    };
  }

  return {
    accepted: false,
    badRequest: true,
    blockedReason: "unsupported_local_health_provider",
    matchedPolicy: "local_health_provider_input_validation",
  };
}

export function runHermesLocalLlmRuntimeHealthCheckBoundary(
  input: HermesLocalLlmRuntimeHealthCheckInput = {},
): HermesLocalLlmRuntimeHealthCheckResult {
  const provider = normalizeHealthProvider(input.provider);

  if (input.dryRun === false) {
    return {
      result: "blocked",
      health_check: healthCheckStatus,
      boundary,
      blocked_reason: "day45_local_llm_runtime_health_check_requires_dry_run",
      matched_policy: "non_dry_run_request",
    };
  }

  if (!provider.accepted) {
    return {
      result: provider.badRequest ? "bad_request" : "blocked",
      health_check: healthCheckStatus,
      boundary,
      blocked_reason: provider.blockedReason,
      matched_policy: provider.matchedPolicy,
    };
  }

  return {
    result: "ok",
    health_check: healthCheckStatus,
    boundary,
  };
}
