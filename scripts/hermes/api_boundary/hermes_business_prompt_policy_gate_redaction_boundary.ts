import {
  runHermesLocalLlmBusinessPromptDryRunContractBoundary,
  type HermesLocalLlmBusinessPromptContractStatus,
} from "./hermes_local_llm_business_prompt_dry_run_contract_boundary";
import {
  runHermesLocalLlmBusinessPromptSmokeTestBoundary,
  type HermesLocalLlmBusinessPromptSmokeStatus,
} from "./hermes_local_llm_business_prompt_smoke_test_boundary";

type HermesBusinessPromptPolicyGateCategory =
  | "operational_question"
  | "planning_question"
  | "proposal_related"
  | "restricted_domain"
  | "unknown";

type HermesBusinessPromptPolicyGateRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "blocked";

type HermesBusinessPromptPolicyGateRedactionDecision =
  | "not_required"
  | "required"
  | "impossible"
  | "blocked";

type HermesBusinessPromptPolicyGateSendDecision =
  | "dry_run_only"
  | "blocked"
  | "not_configured";

type HermesBusinessPromptPolicyGateBlockedReason =
  | "provider_must_be_string"
  | "provider_forbidden_by_day50_business_prompt_policy_gate_boundary"
  | "day50_business_prompt_policy_gate_requires_dry_run"
  | "business_context_forbidden_by_day50_policy_gate"
  | "proposal_body_forbidden_by_day50_policy_gate"
  | "restricted_domain_data_forbidden_by_day50_policy_gate";

type HermesBusinessPromptPolicyGateSafeMetadata = {
  prompt_present: boolean;
  prompt_length_bucket: "empty" | "short" | "medium" | "long";
  business_context_present: boolean;
  proposal_body_present: boolean;
  restricted_signal_count: number;
  proposal_signal_count: number;
  raw_prompt_exposed: false;
  sanitized_prompt_preview_exposed: "safe_metadata_only";
};

export type HermesBusinessPromptPolicyGateStatus = {
  mode: "hermes_business_prompt_policy_gate_redaction_boundary";
  runtime: "local_llm";
  policy_gate_mode: "dry_run_policy_gate_only";
  configured_provider: "business_prompt_policy_gate";
  upstream_contract_mode: HermesLocalLlmBusinessPromptContractStatus["contract_mode"];
  upstream_smoke_mode: HermesLocalLlmBusinessPromptSmokeStatus["prompt_smoke_mode"];
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  runtime_call_allowed: false;
  request_body_created: false;
  request_body_sent: false;
  prompt_sent: false;
  response_body_exposed: false;
  raw_prompt_exposed: false;
  sanitized_prompt_preview_exposed: "safe_metadata_only";
  prompt_category: HermesBusinessPromptPolicyGateCategory;
  prompt_risk_level: HermesBusinessPromptPolicyGateRiskLevel;
  redaction_decision: HermesBusinessPromptPolicyGateRedactionDecision;
  send_decision: HermesBusinessPromptPolicyGateSendDecision;
  blocked_reason?: HermesBusinessPromptPolicyGateBlockedReason;
  matched_policy: string;
  fallback_provider: "mock";
  safe_metadata: HermesBusinessPromptPolicyGateSafeMetadata;
  tokens_used: 0;
};

type HermesBusinessPromptPolicyGateBoundary = {
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
  raw_prompt_exposed: false;
  restricted_domain_data_exposed: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  user_prompt_sent_to_model: false;
  business_context_sent_to_model: false;
  real_business_prompt_sent_to_model: false;
  fixed_business_dummy_prompt_sent_to_model: false;
  embeddings_executed: false;
  vector_search_executed: false;
  tokens_used: 0;
};

export type HermesBusinessPromptPolicyGateResult = {
  result: "ok" | "blocked";
  business_prompt_policy_gate: HermesBusinessPromptPolicyGateStatus;
  business_prompt_contract: HermesLocalLlmBusinessPromptContractStatus;
  business_prompt_smoke: HermesLocalLlmBusinessPromptSmokeStatus;
  boundary: HermesBusinessPromptPolicyGateBoundary;
  blocked_reason?: HermesBusinessPromptPolicyGateBlockedReason;
  matched_policy?: string;
};

type HermesBusinessPromptPolicyGateInput = {
  provider?: unknown;
  dryRun?: boolean;
  sample?: unknown;
  prompt?: unknown;
  userPrompt?: unknown;
  userMessage?: unknown;
  businessContext?: unknown;
  proposalBody?: unknown;
  endpoint?: unknown;
  model?: unknown;
  fetchImpl?: unknown;
};

const boundary: HermesBusinessPromptPolicyGateBoundary = {
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
  raw_prompt_exposed: false,
  restricted_domain_data_exposed: false,
  endpoint_value_exposed: false,
  model_value_exposed: false,
  credentials_exposed: false,
  user_prompt_sent_to_model: false,
  business_context_sent_to_model: false,
  real_business_prompt_sent_to_model: false,
  fixed_business_dummy_prompt_sent_to_model: false,
  embeddings_executed: false,
  vector_search_executed: false,
  tokens_used: 0,
};

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function resolvePromptText(input: HermesBusinessPromptPolicyGateInput): string {
  if (hasNonEmptyString(input.sample)) return input.sample.trim();
  if (hasNonEmptyString(input.prompt)) return input.prompt.trim();
  if (hasNonEmptyString(input.userPrompt)) return input.userPrompt.trim();
  if (hasNonEmptyString(input.userMessage)) return input.userMessage.trim();

  return "";
}

function containsAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function countMatches(value: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

const restrictedPatterns = [
  /customer/i,
  /order/i,
  /shipping/i,
  /payment/i,
  /payroll/i,
  /salary/i,
  /evaluation/i,
  /personal/i,
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

const proposalBodyPatterns = [
  /proposal_body/i,
  /proposal body/i,
  /proposal_id/i,
  /ai\.proposal_inbox/i,
  /crop_cycle_id/i,
  /提案本文/,
] as const;

const proposalPatterns = [
  /proposal/i,
  /提案/,
  /レビュー/,
  /apply/i,
  /承認/,
  /却下/,
] as const;

const planningPatterns = [
  /計画/,
  /作付け/,
  /schedule/i,
  /plan/i,
  /planting/i,
] as const;

const operationalPatterns = [
  /作業/,
  /収穫/,
  /圃場/,
  /crop/i,
  /field/i,
  /work/i,
  /harvest/i,
] as const;

function normalizeProvider(provider: unknown): {
  ok: boolean;
  blockedReason?: HermesBusinessPromptPolicyGateBlockedReason;
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

  const normalized = provider.trim().toLowerCase();

  if (
    normalized !== "business_prompt_policy_gate" &&
    normalized !== "local_llm_business_prompt_policy_gate"
  ) {
    return {
      ok: false,
      blockedReason:
        "provider_forbidden_by_day50_business_prompt_policy_gate_boundary",
    };
  }

  return { ok: true };
}

function promptLengthBucket(promptText: string): HermesBusinessPromptPolicyGateSafeMetadata["prompt_length_bucket"] {
  const length = promptText.trim().length;

  if (length === 0) return "empty";
  if (length <= 80) return "short";
  if (length <= 400) return "medium";

  return "long";
}

function makeSafeMetadata(input: {
  promptText: string;
  businessContext: unknown;
  proposalBody: unknown;
}): HermesBusinessPromptPolicyGateSafeMetadata {
  return {
    prompt_present: input.promptText.trim().length > 0,
    prompt_length_bucket: promptLengthBucket(input.promptText),
    business_context_present: hasValue(input.businessContext),
    proposal_body_present: hasValue(input.proposalBody),
    restricted_signal_count: countMatches(input.promptText, restrictedPatterns),
    proposal_signal_count: countMatches(input.promptText, proposalPatterns),
    raw_prompt_exposed: false,
    sanitized_prompt_preview_exposed: "safe_metadata_only",
  };
}

function classifyPrompt(input: {
  promptText: string;
  businessContext: unknown;
  proposalBody: unknown;
}): {
  promptCategory: HermesBusinessPromptPolicyGateCategory;
  promptRiskLevel: HermesBusinessPromptPolicyGateRiskLevel;
  redactionDecision: HermesBusinessPromptPolicyGateRedactionDecision;
  sendDecision: HermesBusinessPromptPolicyGateSendDecision;
  blockedReason?: HermesBusinessPromptPolicyGateBlockedReason;
  matchedPolicy: string;
} {
  const normalized = input.promptText.trim();

  if (!hasNonEmptyString(normalized) && !hasValue(input.businessContext) && !hasValue(input.proposalBody)) {
    return {
      promptCategory: "unknown",
      promptRiskLevel: "low",
      redactionDecision: "not_required",
      sendDecision: "not_configured",
      matchedPolicy: "empty_prompt_not_configured_by_day50_policy_gate",
    };
  }

  if (hasValue(input.businessContext)) {
    return {
      promptCategory: "restricted_domain",
      promptRiskLevel: "blocked",
      redactionDecision: "blocked",
      sendDecision: "blocked",
      blockedReason: "business_context_forbidden_by_day50_policy_gate",
      matchedPolicy: "business_context_blocked_by_day50_policy_gate",
    };
  }

  if (hasValue(input.proposalBody) || containsAny(normalized, proposalBodyPatterns)) {
    return {
      promptCategory: "proposal_related",
      promptRiskLevel: "blocked",
      redactionDecision: "blocked",
      sendDecision: "blocked",
      blockedReason: "proposal_body_forbidden_by_day50_policy_gate",
      matchedPolicy: "proposal_body_blocked_by_day50_policy_gate",
    };
  }

  if (containsAny(normalized, restrictedPatterns)) {
    return {
      promptCategory: "restricted_domain",
      promptRiskLevel: "blocked",
      redactionDecision: "blocked",
      sendDecision: "blocked",
      blockedReason: "restricted_domain_data_forbidden_by_day50_policy_gate",
      matchedPolicy: "restricted_domain_data_blocked_by_day50_policy_gate",
    };
  }

  if (containsAny(normalized, proposalPatterns)) {
    return {
      promptCategory: "proposal_related",
      promptRiskLevel: "high",
      redactionDecision: "required",
      sendDecision: "dry_run_only",
      matchedPolicy: "proposal_related_prompt_redaction_required_by_day50_policy_gate",
    };
  }

  if (containsAny(normalized, planningPatterns)) {
    return {
      promptCategory: "planning_question",
      promptRiskLevel: "medium",
      redactionDecision: "required",
      sendDecision: "dry_run_only",
      matchedPolicy: "planning_prompt_redaction_required_by_day50_policy_gate",
    };
  }

  if (containsAny(normalized, operationalPatterns)) {
    return {
      promptCategory: "operational_question",
      promptRiskLevel: "low",
      redactionDecision: "not_required",
      sendDecision: "dry_run_only",
      matchedPolicy: "operational_prompt_dry_run_only_by_day50_policy_gate",
    };
  }

  return {
    promptCategory: "unknown",
    promptRiskLevel: "medium",
    redactionDecision: "required",
    sendDecision: "dry_run_only",
    matchedPolicy: "unknown_prompt_redaction_required_by_day50_policy_gate",
  };
}

function makeStatus(input: {
  businessPromptContract: HermesLocalLlmBusinessPromptContractStatus;
  businessPromptSmoke: HermesLocalLlmBusinessPromptSmokeStatus;
  promptCategory: HermesBusinessPromptPolicyGateCategory;
  promptRiskLevel: HermesBusinessPromptPolicyGateRiskLevel;
  redactionDecision: HermesBusinessPromptPolicyGateRedactionDecision;
  sendDecision: HermesBusinessPromptPolicyGateSendDecision;
  blockedReason?: HermesBusinessPromptPolicyGateBlockedReason;
  matchedPolicy: string;
  safeMetadata: HermesBusinessPromptPolicyGateSafeMetadata;
}): HermesBusinessPromptPolicyGateStatus {
  return {
    mode: "hermes_business_prompt_policy_gate_redaction_boundary",
    runtime: "local_llm",
    policy_gate_mode: "dry_run_policy_gate_only",
    configured_provider: "business_prompt_policy_gate",
    upstream_contract_mode: input.businessPromptContract.contract_mode,
    upstream_smoke_mode: input.businessPromptSmoke.prompt_smoke_mode,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_required: false,
    credentials_exposed: false,
    runtime_call_allowed: false,
    request_body_created: false,
    request_body_sent: false,
    prompt_sent: false,
    response_body_exposed: false,
    raw_prompt_exposed: false,
    sanitized_prompt_preview_exposed: "safe_metadata_only",
    prompt_category: input.promptCategory,
    prompt_risk_level: input.promptRiskLevel,
    redaction_decision: input.redactionDecision,
    send_decision: input.sendDecision,
    blocked_reason: input.blockedReason,
    matched_policy: input.matchedPolicy,
    fallback_provider: "mock",
    safe_metadata: input.safeMetadata,
    tokens_used: 0,
  };
}

export async function runHermesBusinessPromptPolicyGateRedactionBoundary(
  input: HermesBusinessPromptPolicyGateInput = {},
): Promise<HermesBusinessPromptPolicyGateResult> {
  const promptText = resolvePromptText(input);

  const businessPromptContract =
    runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
      sample: promptText,
      businessContext: input.businessContext,
    }).business_prompt_contract;

  const businessPromptSmoke =
    (
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        dryRun: true,
        smoke: false,
      })
    ).business_prompt_smoke;

  const safeMetadata = makeSafeMetadata({
    promptText,
    businessContext: input.businessContext,
    proposalBody: input.proposalBody,
  });

  const provider = normalizeProvider(input.provider);

  if (!provider.ok) {
    const status = makeStatus({
      businessPromptContract,
      businessPromptSmoke,
      promptCategory: "unknown",
      promptRiskLevel: "blocked",
      redactionDecision: "blocked",
      sendDecision: "blocked",
      blockedReason: provider.blockedReason,
      matchedPolicy: "provider_validation",
      safeMetadata,
    });

    return {
      result: "blocked",
      business_prompt_policy_gate: status,
      business_prompt_contract: businessPromptContract,
      business_prompt_smoke: businessPromptSmoke,
      boundary,
      blocked_reason: provider.blockedReason,
      matched_policy: "provider_validation",
    };
  }

  if (input.dryRun === false) {
    const status = makeStatus({
      businessPromptContract,
      businessPromptSmoke,
      promptCategory: "unknown",
      promptRiskLevel: "blocked",
      redactionDecision: "blocked",
      sendDecision: "blocked",
      blockedReason: "day50_business_prompt_policy_gate_requires_dry_run",
      matchedPolicy: "non_dry_run_blocked_by_day50_policy_gate",
      safeMetadata,
    });

    return {
      result: "blocked",
      business_prompt_policy_gate: status,
      business_prompt_contract: businessPromptContract,
      business_prompt_smoke: businessPromptSmoke,
      boundary,
      blocked_reason: "day50_business_prompt_policy_gate_requires_dry_run",
      matched_policy: "non_dry_run_blocked_by_day50_policy_gate",
    };
  }

  const classification = classifyPrompt({
    promptText,
    businessContext: input.businessContext,
    proposalBody: input.proposalBody,
  });

  const status = makeStatus({
    businessPromptContract,
    businessPromptSmoke,
    promptCategory: classification.promptCategory,
    promptRiskLevel: classification.promptRiskLevel,
    redactionDecision: classification.redactionDecision,
    sendDecision: classification.sendDecision,
    blockedReason: classification.blockedReason,
    matchedPolicy: classification.matchedPolicy,
    safeMetadata,
  });

  return {
    result: classification.sendDecision === "blocked" ? "blocked" : "ok",
    business_prompt_policy_gate: status,
    business_prompt_contract: businessPromptContract,
    business_prompt_smoke: businessPromptSmoke,
    boundary,
    blocked_reason: classification.blockedReason,
    matched_policy: classification.matchedPolicy,
  };
}
