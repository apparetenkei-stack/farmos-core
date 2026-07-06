type HermesLocalLlmBusinessPromptCategory =
  | "operational_question"
  | "planning_question"
  | "proposal_related"
  | "restricted_domain"
  | "unknown";

type HermesLocalLlmBusinessPromptRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "blocked";

type HermesLocalLlmBusinessPromptSendDecision =
  | "dry_run_only"
  | "blocked"
  | "not_configured";

type HermesLocalLlmBusinessPromptBlockedReason =
  | "day48_business_prompt_execution_not_enabled"
  | "restricted_domain_data_forbidden"
  | "user_prompt_execution_not_enabled"
  | "business_context_execution_not_enabled"
  | "provider_must_be_string"
  | "provider_forbidden_by_day48_business_prompt_contract_boundary";

export type HermesLocalLlmBusinessPromptContractStatus = {
  mode: "hermes_local_llm_business_prompt_dry_run_contract_boundary";
  runtime: "local_llm";
  contract_mode: "business_prompt_dry_run_contract_only";
  configured_provider: "local_llm_business_prompt_contract";
  endpoint_config_key: "HERMES_LOCAL_LLM_CHAT_ENDPOINT";
  model_config_key: "HERMES_LOCAL_LLM_MODEL";
  endpoint_configured: boolean;
  model_configured: boolean;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  runtime_call_allowed: false;
  business_prompt_allowed: false;
  user_prompt_allowed: false;
  business_context_allowed: false;
  restricted_domain_data_allowed: false;
  prompt_sent: false;
  request_body_created: false;
  request_body_sent: false;
  response_body_exposed: false;
  prompt_category: HermesLocalLlmBusinessPromptCategory;
  prompt_risk_level: HermesLocalLlmBusinessPromptRiskLevel;
  prompt_send_decision: HermesLocalLlmBusinessPromptSendDecision;
  blocked_reason?: HermesLocalLlmBusinessPromptBlockedReason;
  matched_policy: string;
  timeout_policy: {
    connect_timeout_ms: 0;
    total_timeout_ms: 0;
    on_timeout: "not_applicable_no_runtime_call";
  };
  fallback_policy: {
    fallback_provider: "mock";
  };
  tokens_used: 0;
};

type HermesLocalLlmBusinessPromptContractBoundary = {
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
  local_runtime_generate_http_called: false;
  prompt_sent_to_model: false;
  request_body_created: false;
  request_body_sent: false;
  response_body_exposed: false;
  embeddings_executed: false;
  vector_search_executed: false;
  restricted_domain_data_exposed: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  user_prompt_sent_to_model: false;
  business_context_sent_to_model: false;
  business_prompt_sent_to_model: false;
  tokens_used: 0;
};

export type HermesLocalLlmBusinessPromptDryRunContractResult = {
  result: "ok" | "blocked";
  business_prompt_contract: HermesLocalLlmBusinessPromptContractStatus;
  boundary: HermesLocalLlmBusinessPromptContractBoundary;
  blocked_reason?: HermesLocalLlmBusinessPromptBlockedReason;
  matched_policy?: string;
};

type HermesLocalLlmBusinessPromptDryRunContractInput = {
  provider?: unknown;
  dryRun?: boolean;
  sample?: unknown;
  prompt?: unknown;
  userPrompt?: unknown;
  userMessage?: unknown;
  businessContext?: unknown;
  endpoint?: unknown;
  model?: unknown;
  fetchImpl?: unknown;
};

const boundary: HermesLocalLlmBusinessPromptContractBoundary = {
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
  local_runtime_generate_http_called: false,
  prompt_sent_to_model: false,
  request_body_created: false,
  request_body_sent: false,
  response_body_exposed: false,
  embeddings_executed: false,
  vector_search_executed: false,
  restricted_domain_data_exposed: false,
  endpoint_value_exposed: false,
  model_value_exposed: false,
  credentials_exposed: false,
  user_prompt_sent_to_model: false,
  business_context_sent_to_model: false,
  business_prompt_sent_to_model: false,
  tokens_used: 0,
};

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function normalizeProvider(provider: unknown): {
  ok: boolean;
  blockedReason?: HermesLocalLlmBusinessPromptBlockedReason;
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

  if (provider.trim().toLowerCase() !== "local_llm_business_prompt_contract") {
    return {
      ok: false,
      blockedReason:
        "provider_forbidden_by_day48_business_prompt_contract_boundary",
    };
  }

  return { ok: true };
}

function resolvePromptLikeInput(
  input: HermesLocalLlmBusinessPromptDryRunContractInput,
): string {
  if (hasNonEmptyString(input.sample)) return input.sample.trim();
  if (hasNonEmptyString(input.prompt)) return input.prompt.trim();
  if (hasNonEmptyString(input.userPrompt)) return input.userPrompt.trim();
  if (hasNonEmptyString(input.userMessage)) return input.userMessage.trim();

  return "";
}

function containsAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function classifyPrompt(input: {
  promptText: string;
  businessContext: unknown;
}): {
  promptCategory: HermesLocalLlmBusinessPromptCategory;
  promptRiskLevel: HermesLocalLlmBusinessPromptRiskLevel;
  blockedReason?: HermesLocalLlmBusinessPromptBlockedReason;
  matchedPolicy: string;
} {
  const normalized = input.promptText.trim().toLowerCase();

  if (hasValue(input.businessContext)) {
    return {
      promptCategory: "restricted_domain",
      promptRiskLevel: "blocked",
      blockedReason: "business_context_execution_not_enabled",
      matchedPolicy: "business_context_forbidden_by_day48_contract",
    };
  }

  const restrictedPatterns = [
    /customer/i,
    /order/i,
    /shipping/i,
    /payment/i,
    /取引先/,
    /顧客/,
    /注文/,
    /出荷先/,
    /支払い/,
    /金額/,
    /給与/,
    /評価/,
    /個人/,
  ] as const;

  if (containsAny(normalized, restrictedPatterns)) {
    return {
      promptCategory: "restricted_domain",
      promptRiskLevel: "blocked",
      blockedReason: "restricted_domain_data_forbidden",
      matchedPolicy: "restricted_domain_data_forbidden_by_day48_contract",
    };
  }

  const proposalPatterns = [
    /proposal/i,
    /提案/,
    /レビュー/,
    /apply/i,
    /承認/,
    /却下/,
  ] as const;

  if (containsAny(normalized, proposalPatterns)) {
    return {
      promptCategory: "proposal_related",
      promptRiskLevel: "high",
      matchedPolicy: "proposal_related_prompt_dry_run_only",
    };
  }

  const planningPatterns = [
    /計画/,
    /作付け/,
    /schedule/i,
    /plan/i,
    /planting/i,
  ] as const;

  if (containsAny(normalized, planningPatterns)) {
    return {
      promptCategory: "planning_question",
      promptRiskLevel: "medium",
      matchedPolicy: "planning_prompt_dry_run_only",
    };
  }

  const operationalPatterns = [
    /作業/,
    /収穫/,
    /圃場/,
    /crop/i,
    /field/i,
    /work/i,
    /harvest/i,
  ] as const;

  if (containsAny(normalized, operationalPatterns)) {
    return {
      promptCategory: "operational_question",
      promptRiskLevel: "low",
      matchedPolicy: "operational_prompt_dry_run_only",
    };
  }

  return {
    promptCategory: "unknown",
    promptRiskLevel: "medium",
    matchedPolicy: "unknown_prompt_dry_run_only",
  };
}

function isEndpointConfigured(endpoint: unknown): boolean {
  if (hasNonEmptyString(endpoint)) return true;

  return hasNonEmptyString(process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT);
}

function isModelConfigured(model: unknown): boolean {
  if (hasNonEmptyString(model)) return true;

  return hasNonEmptyString(process.env.HERMES_LOCAL_LLM_MODEL);
}

function makeStatus(input: {
  endpointConfigured: boolean;
  modelConfigured: boolean;
  promptCategory: HermesLocalLlmBusinessPromptCategory;
  promptRiskLevel: HermesLocalLlmBusinessPromptRiskLevel;
  promptSendDecision: HermesLocalLlmBusinessPromptSendDecision;
  blockedReason?: HermesLocalLlmBusinessPromptBlockedReason;
  matchedPolicy: string;
}): HermesLocalLlmBusinessPromptContractStatus {
  return {
    mode: "hermes_local_llm_business_prompt_dry_run_contract_boundary",
    runtime: "local_llm",
    contract_mode: "business_prompt_dry_run_contract_only",
    configured_provider: "local_llm_business_prompt_contract",
    endpoint_config_key: "HERMES_LOCAL_LLM_CHAT_ENDPOINT",
    model_config_key: "HERMES_LOCAL_LLM_MODEL",
    endpoint_configured: input.endpointConfigured,
    model_configured: input.modelConfigured,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_required: false,
    credentials_exposed: false,
    runtime_call_allowed: false,
    business_prompt_allowed: false,
    user_prompt_allowed: false,
    business_context_allowed: false,
    restricted_domain_data_allowed: false,
    prompt_sent: false,
    request_body_created: false,
    request_body_sent: false,
    response_body_exposed: false,
    prompt_category: input.promptCategory,
    prompt_risk_level: input.promptRiskLevel,
    prompt_send_decision: input.promptSendDecision,
    blocked_reason: input.blockedReason,
    matched_policy: input.matchedPolicy,
    timeout_policy: {
      connect_timeout_ms: 0,
      total_timeout_ms: 0,
      on_timeout: "not_applicable_no_runtime_call",
    },
    fallback_policy: {
      fallback_provider: "mock",
    },
    tokens_used: 0,
  };
}

export function runHermesLocalLlmBusinessPromptDryRunContractBoundary(
  input: HermesLocalLlmBusinessPromptDryRunContractInput = {},
): HermesLocalLlmBusinessPromptDryRunContractResult {
  const endpointConfigured = isEndpointConfigured(input.endpoint);
  const modelConfigured = isModelConfigured(input.model);
  const promptText = resolvePromptLikeInput(input);
  const classification = classifyPrompt({
    promptText,
    businessContext: input.businessContext,
  });

  const provider = normalizeProvider(input.provider);

  if (!provider.ok) {
    const status = makeStatus({
      endpointConfigured,
      modelConfigured,
      promptCategory: "unknown",
      promptRiskLevel: "blocked",
      promptSendDecision: "blocked",
      blockedReason: provider.blockedReason,
      matchedPolicy: "provider_validation",
    });

    return {
      result: "blocked",
      business_prompt_contract: status,
      boundary,
      blocked_reason: provider.blockedReason,
      matched_policy: "provider_validation",
    };
  }

  if (input.dryRun === false) {
    const status = makeStatus({
      endpointConfigured,
      modelConfigured,
      promptCategory: classification.promptCategory,
      promptRiskLevel: "blocked",
      promptSendDecision: "blocked",
      blockedReason: "day48_business_prompt_execution_not_enabled",
      matchedPolicy: "business_prompt_execution_disabled_by_day48_contract",
    });

    return {
      result: "blocked",
      business_prompt_contract: status,
      boundary,
      blocked_reason: "day48_business_prompt_execution_not_enabled",
      matched_policy: "business_prompt_execution_disabled_by_day48_contract",
    };
  }

  if (classification.promptRiskLevel === "blocked") {
    const status = makeStatus({
      endpointConfigured,
      modelConfigured,
      promptCategory: classification.promptCategory,
      promptRiskLevel: classification.promptRiskLevel,
      promptSendDecision: "blocked",
      blockedReason: classification.blockedReason,
      matchedPolicy: classification.matchedPolicy,
    });

    return {
      result: "blocked",
      business_prompt_contract: status,
      boundary,
      blocked_reason: classification.blockedReason,
      matched_policy: classification.matchedPolicy,
    };
  }

  if (!endpointConfigured || !modelConfigured) {
    const status = makeStatus({
      endpointConfigured,
      modelConfigured,
      promptCategory: classification.promptCategory,
      promptRiskLevel: classification.promptRiskLevel,
      promptSendDecision: promptText.length > 0 ? "dry_run_only" : "not_configured",
      blockedReason:
        promptText.length > 0
          ? "day48_business_prompt_execution_not_enabled"
          : undefined,
      matchedPolicy:
        promptText.length > 0
          ? classification.matchedPolicy
          : "local_llm_business_prompt_contract_not_configured",
    });

    return {
      result: "ok",
      business_prompt_contract: status,
      boundary,
      blocked_reason: status.blocked_reason,
      matched_policy: status.matched_policy,
    };
  }

  const status = makeStatus({
    endpointConfigured,
    modelConfigured,
    promptCategory: classification.promptCategory,
    promptRiskLevel: classification.promptRiskLevel,
    promptSendDecision: "dry_run_only",
    blockedReason: "day48_business_prompt_execution_not_enabled",
    matchedPolicy: classification.matchedPolicy,
  });

  return {
    result: "ok",
    business_prompt_contract: status,
    boundary,
    blocked_reason: status.blocked_reason,
    matched_policy: status.matched_policy,
  };
}
