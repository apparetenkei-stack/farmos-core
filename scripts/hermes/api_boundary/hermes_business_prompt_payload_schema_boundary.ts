import {
  runHermesBusinessPromptPolicyGateRedactionBoundary,
  type HermesBusinessPromptPolicyGateStatus,
} from "./hermes_business_prompt_policy_gate_redaction_boundary";
import type { HermesLocalLlmBusinessPromptContractStatus } from "./hermes_local_llm_business_prompt_dry_run_contract_boundary";
import type { HermesLocalLlmBusinessPromptSmokeStatus } from "./hermes_local_llm_business_prompt_smoke_test_boundary";

type HermesBusinessPromptPayloadSchemaDecision =
  | "dry_run_only"
  | "blocked"
  | "not_configured";

type HermesBusinessPromptPayloadSchemaBlockedReason =
  | "provider_must_be_string"
  | "provider_forbidden_by_day51_business_prompt_payload_schema_boundary"
  | "day51_business_prompt_payload_schema_requires_dry_run"
  | "business_context_forbidden_by_day51_payload_schema"
  | "proposal_body_forbidden_by_day51_payload_schema"
  | "restricted_domain_data_forbidden_by_day51_payload_schema"
  | "upstream_policy_gate_blocked_by_day51_payload_schema";

type HermesBusinessPromptPayloadSchemaSourceKind =
  | "user_prompt_candidate"
  | "system_test_candidate"
  | "unknown";

type HermesBusinessPromptPayloadSchemaPreview = {
  schema_version: "hermes.business_prompt_payload.v0";
  payload_kind: "business_prompt_candidate";
  source: {
    source_kind: HermesBusinessPromptPayloadSchemaSourceKind;
    raw_prompt_included: false;
    sanitized_prompt_included: false;
  };
  schema: {
    message_roles_declared: readonly ["system", "user"];
    system_instruction_placeholder_declared: true;
    message_content_included: false;
  };
  safety: {
    policy_gate_checked: true;
    prompt_category: HermesBusinessPromptPolicyGateStatus["prompt_category"];
    prompt_risk_level: HermesBusinessPromptPolicyGateStatus["prompt_risk_level"];
    redaction_decision: HermesBusinessPromptPolicyGateStatus["redaction_decision"];
    send_decision: HermesBusinessPromptPolicyGateStatus["send_decision"];
    restricted_domain_data_included: false;
    business_context_included: false;
    proposal_body_included: false;
  };
  runtime: {
    target_runtime: "local_llm";
    selected_provider: "mock";
    fallback_provider: "mock";
    runtime_call_allowed: false;
  };
  transport: {
    request_body_created: false;
    request_body_sent: false;
    response_body_exposed: false;
  };
};

export type HermesBusinessPromptPayloadSchemaStatus = {
  mode: "hermes_business_prompt_payload_schema_boundary";
  runtime: "local_llm";
  payload_schema_mode: "dry_run_payload_schema_only";
  configured_provider: "business_prompt_payload_schema";
  upstream_policy_gate_mode: HermesBusinessPromptPolicyGateStatus["policy_gate_mode"];
  upstream_contract_mode: HermesLocalLlmBusinessPromptContractStatus["contract_mode"];
  upstream_smoke_mode: HermesLocalLlmBusinessPromptSmokeStatus["prompt_smoke_mode"];
  schema_version: "hermes.business_prompt_payload.v0";
  payload_kind: "business_prompt_candidate";
  payload_created: boolean;
  payload_send_allowed: false;
  payload_send_decision: HermesBusinessPromptPayloadSchemaDecision;
  payload_blocked_reason?: HermesBusinessPromptPayloadSchemaBlockedReason;
  prompt_category: HermesBusinessPromptPolicyGateStatus["prompt_category"];
  prompt_risk_level: HermesBusinessPromptPolicyGateStatus["prompt_risk_level"];
  redaction_decision: HermesBusinessPromptPolicyGateStatus["redaction_decision"];
  source_prompt_included: false;
  sanitized_prompt_included: false;
  raw_prompt_exposed: false;
  sanitized_prompt_preview_exposed: "safe_metadata_only";
  payload_preview_exposed: "safe_schema_metadata_only";
  system_instruction_included: false;
  business_context_included: false;
  proposal_body_included: false;
  restricted_domain_data_included: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_required: false;
  credentials_exposed: false;
  runtime_call_allowed: false;
  request_body_created: false;
  request_body_sent: false;
  prompt_sent: false;
  response_body_exposed: false;
  selected_provider: "mock";
  fallback_provider: "mock";
  payload_preview: HermesBusinessPromptPayloadSchemaPreview;
  tokens_used: 0;
};

type HermesBusinessPromptPayloadSchemaBoundary = {
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

export type HermesBusinessPromptPayloadSchemaResult = {
  result: "ok" | "blocked";
  business_prompt_payload_schema: HermesBusinessPromptPayloadSchemaStatus;
  business_prompt_policy_gate: HermesBusinessPromptPolicyGateStatus;
  business_prompt_contract: HermesLocalLlmBusinessPromptContractStatus;
  business_prompt_smoke: HermesLocalLlmBusinessPromptSmokeStatus;
  boundary: HermesBusinessPromptPayloadSchemaBoundary;
  blocked_reason?: HermesBusinessPromptPayloadSchemaBlockedReason;
  matched_policy?: string;
};

type HermesBusinessPromptPayloadSchemaInput = {
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

const boundary: HermesBusinessPromptPayloadSchemaBoundary = {
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

function resolvePromptText(input: HermesBusinessPromptPayloadSchemaInput): string {
  if (hasNonEmptyString(input.sample)) return input.sample.trim();
  if (hasNonEmptyString(input.prompt)) return input.prompt.trim();
  if (hasNonEmptyString(input.userPrompt)) return input.userPrompt.trim();
  if (hasNonEmptyString(input.userMessage)) return input.userMessage.trim();

  return "";
}

function resolveSourceKind(
  input: HermesBusinessPromptPayloadSchemaInput,
): HermesBusinessPromptPayloadSchemaSourceKind {
  if (hasNonEmptyString(input.sample)) return "system_test_candidate";
  if (
    hasNonEmptyString(input.prompt) ||
    hasNonEmptyString(input.userPrompt) ||
    hasNonEmptyString(input.userMessage)
  ) {
    return "user_prompt_candidate";
  }

  return "unknown";
}

function normalizeProvider(provider: unknown): {
  ok: boolean;
  blockedReason?: HermesBusinessPromptPayloadSchemaBlockedReason;
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
    normalized !== "business_prompt_payload_schema" &&
    normalized !== "local_llm_business_prompt_payload_schema"
  ) {
    return {
      ok: false,
      blockedReason:
        "provider_forbidden_by_day51_business_prompt_payload_schema_boundary",
    };
  }

  return { ok: true };
}

function mapUpstreamBlockedReason(
  policyGate: HermesBusinessPromptPolicyGateStatus,
): HermesBusinessPromptPayloadSchemaBlockedReason {
  if (policyGate.blocked_reason === "business_context_forbidden_by_day50_policy_gate") {
    return "business_context_forbidden_by_day51_payload_schema";
  }

  if (policyGate.blocked_reason === "proposal_body_forbidden_by_day50_policy_gate") {
    return "proposal_body_forbidden_by_day51_payload_schema";
  }

  if (
    policyGate.blocked_reason ===
    "restricted_domain_data_forbidden_by_day50_policy_gate"
  ) {
    return "restricted_domain_data_forbidden_by_day51_payload_schema";
  }

  return "upstream_policy_gate_blocked_by_day51_payload_schema";
}

function makePayloadPreview(input: {
  sourceKind: HermesBusinessPromptPayloadSchemaSourceKind;
  policyGate: HermesBusinessPromptPolicyGateStatus;
}): HermesBusinessPromptPayloadSchemaPreview {
  return {
    schema_version: "hermes.business_prompt_payload.v0",
    payload_kind: "business_prompt_candidate",
    source: {
      source_kind: input.sourceKind,
      raw_prompt_included: false,
      sanitized_prompt_included: false,
    },
    schema: {
      message_roles_declared: ["system", "user"],
      system_instruction_placeholder_declared: true,
      message_content_included: false,
    },
    safety: {
      policy_gate_checked: true,
      prompt_category: input.policyGate.prompt_category,
      prompt_risk_level: input.policyGate.prompt_risk_level,
      redaction_decision: input.policyGate.redaction_decision,
      send_decision: input.policyGate.send_decision,
      restricted_domain_data_included: false,
      business_context_included: false,
      proposal_body_included: false,
    },
    runtime: {
      target_runtime: "local_llm",
      selected_provider: "mock",
      fallback_provider: "mock",
      runtime_call_allowed: false,
    },
    transport: {
      request_body_created: false,
      request_body_sent: false,
      response_body_exposed: false,
    },
  };
}

function makeStatus(input: {
  policyGate: HermesBusinessPromptPolicyGateStatus;
  businessPromptContract: HermesLocalLlmBusinessPromptContractStatus;
  businessPromptSmoke: HermesLocalLlmBusinessPromptSmokeStatus;
  sourceKind: HermesBusinessPromptPayloadSchemaSourceKind;
  payloadCreated: boolean;
  payloadSendDecision: HermesBusinessPromptPayloadSchemaDecision;
  payloadBlockedReason?: HermesBusinessPromptPayloadSchemaBlockedReason;
}): HermesBusinessPromptPayloadSchemaStatus {
  return {
    mode: "hermes_business_prompt_payload_schema_boundary",
    runtime: "local_llm",
    payload_schema_mode: "dry_run_payload_schema_only",
    configured_provider: "business_prompt_payload_schema",
    upstream_policy_gate_mode: input.policyGate.policy_gate_mode,
    upstream_contract_mode: input.businessPromptContract.contract_mode,
    upstream_smoke_mode: input.businessPromptSmoke.prompt_smoke_mode,
    schema_version: "hermes.business_prompt_payload.v0",
    payload_kind: "business_prompt_candidate",
    payload_created: input.payloadCreated,
    payload_send_allowed: false,
    payload_send_decision: input.payloadSendDecision,
    payload_blocked_reason: input.payloadBlockedReason,
    prompt_category: input.policyGate.prompt_category,
    prompt_risk_level: input.policyGate.prompt_risk_level,
    redaction_decision: input.policyGate.redaction_decision,
    source_prompt_included: false,
    sanitized_prompt_included: false,
    raw_prompt_exposed: false,
    sanitized_prompt_preview_exposed: "safe_metadata_only",
    payload_preview_exposed: "safe_schema_metadata_only",
    system_instruction_included: false,
    business_context_included: false,
    proposal_body_included: false,
    restricted_domain_data_included: false,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_required: false,
    credentials_exposed: false,
    runtime_call_allowed: false,
    request_body_created: false,
    request_body_sent: false,
    prompt_sent: false,
    response_body_exposed: false,
    selected_provider: "mock",
    fallback_provider: "mock",
    payload_preview: makePayloadPreview({
      sourceKind: input.sourceKind,
      policyGate: input.policyGate,
    }),
    tokens_used: 0,
  };
}

export async function runHermesBusinessPromptPayloadSchemaBoundary(
  input: HermesBusinessPromptPayloadSchemaInput = {},
): Promise<HermesBusinessPromptPayloadSchemaResult> {
  const promptText = resolvePromptText(input);
  const sourceKind = resolveSourceKind(input);

  const upstream = await runHermesBusinessPromptPolicyGateRedactionBoundary({
    provider: "business_prompt_policy_gate",
    dryRun: true,
    sample: promptText,
    businessContext: input.businessContext,
    proposalBody: input.proposalBody,
  });

  const provider = normalizeProvider(input.provider);

  if (!provider.ok) {
    const status = makeStatus({
      policyGate: upstream.business_prompt_policy_gate,
      businessPromptContract: upstream.business_prompt_contract,
      businessPromptSmoke: upstream.business_prompt_smoke,
      sourceKind,
      payloadCreated: false,
      payloadSendDecision: "blocked",
      payloadBlockedReason: provider.blockedReason,
    });

    return {
      result: "blocked",
      business_prompt_payload_schema: status,
      business_prompt_policy_gate: upstream.business_prompt_policy_gate,
      business_prompt_contract: upstream.business_prompt_contract,
      business_prompt_smoke: upstream.business_prompt_smoke,
      boundary,
      blocked_reason: provider.blockedReason,
      matched_policy: "provider_validation",
    };
  }

  if (input.dryRun === false) {
    const status = makeStatus({
      policyGate: upstream.business_prompt_policy_gate,
      businessPromptContract: upstream.business_prompt_contract,
      businessPromptSmoke: upstream.business_prompt_smoke,
      sourceKind,
      payloadCreated: false,
      payloadSendDecision: "blocked",
      payloadBlockedReason:
        "day51_business_prompt_payload_schema_requires_dry_run",
    });

    return {
      result: "blocked",
      business_prompt_payload_schema: status,
      business_prompt_policy_gate: upstream.business_prompt_policy_gate,
      business_prompt_contract: upstream.business_prompt_contract,
      business_prompt_smoke: upstream.business_prompt_smoke,
      boundary,
      blocked_reason: "day51_business_prompt_payload_schema_requires_dry_run",
      matched_policy: "non_dry_run_blocked_by_day51_payload_schema",
    };
  }

  if (upstream.business_prompt_policy_gate.send_decision === "blocked") {
    const blockedReason = mapUpstreamBlockedReason(
      upstream.business_prompt_policy_gate,
    );

    const status = makeStatus({
      policyGate: upstream.business_prompt_policy_gate,
      businessPromptContract: upstream.business_prompt_contract,
      businessPromptSmoke: upstream.business_prompt_smoke,
      sourceKind,
      payloadCreated: false,
      payloadSendDecision: "blocked",
      payloadBlockedReason: blockedReason,
    });

    return {
      result: "blocked",
      business_prompt_payload_schema: status,
      business_prompt_policy_gate: upstream.business_prompt_policy_gate,
      business_prompt_contract: upstream.business_prompt_contract,
      business_prompt_smoke: upstream.business_prompt_smoke,
      boundary,
      blocked_reason: blockedReason,
      matched_policy: "upstream_policy_gate_blocked_by_day51_payload_schema",
    };
  }

  if (
    upstream.business_prompt_policy_gate.send_decision === "not_configured" ||
    !hasNonEmptyString(promptText)
  ) {
    const status = makeStatus({
      policyGate: upstream.business_prompt_policy_gate,
      businessPromptContract: upstream.business_prompt_contract,
      businessPromptSmoke: upstream.business_prompt_smoke,
      sourceKind,
      payloadCreated: false,
      payloadSendDecision: "not_configured",
    });

    return {
      result: "ok",
      business_prompt_payload_schema: status,
      business_prompt_policy_gate: upstream.business_prompt_policy_gate,
      business_prompt_contract: upstream.business_prompt_contract,
      business_prompt_smoke: upstream.business_prompt_smoke,
      boundary,
      matched_policy: "empty_prompt_not_configured_by_day51_payload_schema",
    };
  }

  const status = makeStatus({
    policyGate: upstream.business_prompt_policy_gate,
    businessPromptContract: upstream.business_prompt_contract,
    businessPromptSmoke: upstream.business_prompt_smoke,
    sourceKind,
    payloadCreated: true,
    payloadSendDecision: "dry_run_only",
  });

  return {
    result: "ok",
    business_prompt_payload_schema: status,
    business_prompt_policy_gate: upstream.business_prompt_policy_gate,
    business_prompt_contract: upstream.business_prompt_contract,
    business_prompt_smoke: upstream.business_prompt_smoke,
    boundary,
    matched_policy: "business_prompt_payload_schema_dry_run_only",
  };
}
