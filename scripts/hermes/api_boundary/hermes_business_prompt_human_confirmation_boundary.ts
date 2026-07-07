import { runHermesBusinessPromptPayloadSchemaBoundary } from "./hermes_business_prompt_payload_schema_boundary";

type UpstreamPayloadSchemaResult = Awaited<
  ReturnType<typeof runHermesBusinessPromptPayloadSchemaBoundary>
>;

type HermesBusinessPromptHumanConfirmationProvider =
  | "business_prompt_human_confirmation"
  | "local_llm_business_prompt_human_confirmation";

type HermesBusinessPromptHumanConfirmationState =
  | "required"
  | "blocked"
  | "not_configured";

type HermesBusinessPromptHumanConfirmationResultStatus =
  | "not_confirmed"
  | "blocked"
  | "not_configured";

type HermesBusinessPromptHumanConfirmationPreview = {
  preview_kind: "safe_confirmation_metadata_only";
  raw_prompt_included: false;
  sanitized_prompt_included: false;
  business_context_included: false;
  proposal_body_included: false;
  restricted_domain_data_included: false;
  endpoint_value_included: false;
  model_value_included: false;
  credential_value_included: false;
  confirmation_token_included: false;
  payload: {
    schema_version: "hermes.business_prompt_confirmation.v0";
    payload_schema_version: "hermes.business_prompt_payload.v0";
    payload_kind: "business_prompt_candidate";
    payload_created: boolean;
    payload_send_allowed: false;
  };
  confirmation: {
    confirmation_required: true;
    human_confirmed: false;
    confirmation_state: HermesBusinessPromptHumanConfirmationState;
    confirmation_result: HermesBusinessPromptHumanConfirmationResultStatus;
    confirmation_token_created: false;
    confirmation_token_exposed: false;
    confirmation_record_created: false;
    confirmation_record_saved: false;
  };
  upstream: {
    payload_schema_checked: true;
    policy_gate_checked: true;
    upstream_payload_schema_mode: "dry_run_payload_schema_only";
    upstream_policy_gate_mode: "dry_run_policy_gate_only";
  };
};

export type HermesBusinessPromptHumanConfirmationStatus = {
  mode: "hermes_business_prompt_human_confirmation_boundary";
  runtime: "local_llm";
  confirmation_mode: "dry_run_human_confirmation_only";
  configured_provider: HermesBusinessPromptHumanConfirmationProvider;
  upstream_payload_schema_mode: "dry_run_payload_schema_only";
  upstream_policy_gate_mode: "dry_run_policy_gate_only";
  schema_version: "hermes.business_prompt_confirmation.v0";
  payload_schema_version: "hermes.business_prompt_payload.v0";
  payload_kind: "business_prompt_candidate";
  payload_created: boolean;
  payload_send_allowed: false;
  confirmation_required: true;
  human_confirmed: false;
  confirmation_state: HermesBusinessPromptHumanConfirmationState;
  confirmation_result: HermesBusinessPromptHumanConfirmationResultStatus;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  prompt_category: UpstreamPayloadSchemaResult["business_prompt_payload_schema"]["prompt_category"];
  prompt_risk_level: UpstreamPayloadSchemaResult["business_prompt_payload_schema"]["prompt_risk_level"];
  redaction_decision: UpstreamPayloadSchemaResult["business_prompt_payload_schema"]["redaction_decision"];
  source_prompt_included: false;
  sanitized_prompt_included: false;
  raw_prompt_exposed: false;
  confirmation_preview_exposed: "safe_confirmation_metadata_only";
  confirmation_preview: HermesBusinessPromptHumanConfirmationPreview;
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
  tokens_used: 0;
};

type HermesBusinessPromptHumanConfirmationBoundary = {
  writes_performed: false;
  chat_history_write_allowed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
  proposal_apply_allowed: false;
  confirmation_write_allowed: false;
  confirmation_record_saved: false;
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

export type HermesBusinessPromptHumanConfirmationResult = {
  result: "ok" | "blocked" | "bad_request";
  business_prompt_human_confirmation: HermesBusinessPromptHumanConfirmationStatus;
  business_prompt_payload_schema: UpstreamPayloadSchemaResult["business_prompt_payload_schema"];
  business_prompt_policy_gate: UpstreamPayloadSchemaResult["business_prompt_policy_gate"];
  business_prompt_contract: UpstreamPayloadSchemaResult["business_prompt_contract"];
  business_prompt_smoke: UpstreamPayloadSchemaResult["business_prompt_smoke"];
  boundary: HermesBusinessPromptHumanConfirmationBoundary;
};

type HermesBusinessPromptHumanConfirmationInput = {
  provider?: unknown;
  dryRun?: unknown;
  sample?: unknown;
  prompt?: unknown;
  userPrompt?: unknown;
  userMessage?: unknown;
};

const boundary: HermesBusinessPromptHumanConfirmationBoundary = {
  writes_performed: false,
  chat_history_write_allowed: false,
  app_schema_write_allowed: false,
  ai_proposal_write_allowed: false,
  audit_apply_event_write_allowed: false,
  proposal_apply_allowed: false,
  confirmation_write_allowed: false,
  confirmation_record_saved: false,
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

function normalizeProvider(provider: unknown):
  | {
      ok: true;
      requestedProvider: HermesBusinessPromptHumanConfirmationProvider;
    }
  | {
      ok: false;
      requestedProvider: "business_prompt_human_confirmation";
    } {
  if (provider === undefined || provider === null || provider === "") {
    return {
      ok: true,
      requestedProvider: "business_prompt_human_confirmation",
    };
  }

  if (typeof provider !== "string") {
    return {
      ok: false,
      requestedProvider: "business_prompt_human_confirmation",
    };
  }

  const normalized = provider.trim().toLowerCase();

  if (
    normalized === "business_prompt_human_confirmation" ||
    normalized === "local_llm_business_prompt_human_confirmation"
  ) {
    return {
      ok: true,
      requestedProvider: normalized,
    };
  }

  return {
    ok: false,
    requestedProvider: "business_prompt_human_confirmation",
  };
}

function resolveConfirmationState(
  payloadStatus: UpstreamPayloadSchemaResult["business_prompt_payload_schema"],
): {
  confirmationState: HermesBusinessPromptHumanConfirmationState;
  confirmationResult: HermesBusinessPromptHumanConfirmationResultStatus;
  result: "ok" | "blocked";
} {
  if (
    payloadStatus.payload_send_decision === "blocked" ||
    payloadStatus.prompt_risk_level === "blocked"
  ) {
    return {
      confirmationState: "blocked",
      confirmationResult: "blocked",
      result: "blocked",
    };
  }

  if (!payloadStatus.payload_created) {
    return {
      confirmationState: "not_configured",
      confirmationResult: "not_configured",
      result: "ok",
    };
  }

  return {
    confirmationState: "required",
    confirmationResult: "not_confirmed",
    result: "ok",
  };
}

function makePreview(input: {
  payloadCreated: boolean;
  confirmationState: HermesBusinessPromptHumanConfirmationState;
  confirmationResult: HermesBusinessPromptHumanConfirmationResultStatus;
}): HermesBusinessPromptHumanConfirmationPreview {
  return {
    preview_kind: "safe_confirmation_metadata_only",
    raw_prompt_included: false,
    sanitized_prompt_included: false,
    business_context_included: false,
    proposal_body_included: false,
    restricted_domain_data_included: false,
    endpoint_value_included: false,
    model_value_included: false,
    credential_value_included: false,
    confirmation_token_included: false,
    payload: {
      schema_version: "hermes.business_prompt_confirmation.v0",
      payload_schema_version: "hermes.business_prompt_payload.v0",
      payload_kind: "business_prompt_candidate",
      payload_created: input.payloadCreated,
      payload_send_allowed: false,
    },
    confirmation: {
      confirmation_required: true,
      human_confirmed: false,
      confirmation_state: input.confirmationState,
      confirmation_result: input.confirmationResult,
      confirmation_token_created: false,
      confirmation_token_exposed: false,
      confirmation_record_created: false,
      confirmation_record_saved: false,
    },
    upstream: {
      payload_schema_checked: true,
      policy_gate_checked: true,
      upstream_payload_schema_mode: "dry_run_payload_schema_only",
      upstream_policy_gate_mode: "dry_run_policy_gate_only",
    },
  };
}

function makeStatus(input: {
  configuredProvider: HermesBusinessPromptHumanConfirmationProvider;
  payloadStatus: UpstreamPayloadSchemaResult["business_prompt_payload_schema"];
  policyGateStatus: UpstreamPayloadSchemaResult["business_prompt_policy_gate"];
  confirmationState: HermesBusinessPromptHumanConfirmationState;
  confirmationResult: HermesBusinessPromptHumanConfirmationResultStatus;
}): HermesBusinessPromptHumanConfirmationStatus {
  return {
    mode: "hermes_business_prompt_human_confirmation_boundary",
    runtime: "local_llm",
    confirmation_mode: "dry_run_human_confirmation_only",
    configured_provider: input.configuredProvider,
    upstream_payload_schema_mode: input.payloadStatus.payload_schema_mode,
    upstream_policy_gate_mode: input.policyGateStatus.policy_gate_mode,
    schema_version: "hermes.business_prompt_confirmation.v0",
    payload_schema_version: input.payloadStatus.schema_version,
    payload_kind: input.payloadStatus.payload_kind,
    payload_created: input.payloadStatus.payload_created,
    payload_send_allowed: false,
    confirmation_required: true,
    human_confirmed: false,
    confirmation_state: input.confirmationState,
    confirmation_result: input.confirmationResult,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    prompt_category: input.payloadStatus.prompt_category,
    prompt_risk_level: input.payloadStatus.prompt_risk_level,
    redaction_decision: input.payloadStatus.redaction_decision,
    source_prompt_included: false,
    sanitized_prompt_included: false,
    raw_prompt_exposed: false,
    confirmation_preview_exposed: "safe_confirmation_metadata_only",
    confirmation_preview: makePreview({
      payloadCreated: input.payloadStatus.payload_created,
      confirmationState: input.confirmationState,
      confirmationResult: input.confirmationResult,
    }),
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
    tokens_used: 0,
  };
}

export async function runHermesBusinessPromptHumanConfirmationBoundary(
  input: HermesBusinessPromptHumanConfirmationInput = {},
): Promise<HermesBusinessPromptHumanConfirmationResult> {
  const provider = normalizeProvider(input.provider);

  const upstream = await runHermesBusinessPromptPayloadSchemaBoundary({
    provider: "business_prompt_payload_schema",
    dryRun: input.dryRun,
    sample: input.sample,
    prompt: input.prompt,
    userPrompt: input.userPrompt,
    userMessage: input.userMessage,
  });

  if (!provider.ok) {
    const status = makeStatus({
      configuredProvider: "business_prompt_human_confirmation",
      payloadStatus: upstream.business_prompt_payload_schema,
      policyGateStatus: upstream.business_prompt_policy_gate,
      confirmationState: "not_configured",
      confirmationResult: "not_configured",
    });

    return {
      result: "bad_request",
      business_prompt_human_confirmation: status,
      business_prompt_payload_schema: upstream.business_prompt_payload_schema,
      business_prompt_policy_gate: upstream.business_prompt_policy_gate,
      business_prompt_contract: upstream.business_prompt_contract,
      business_prompt_smoke: upstream.business_prompt_smoke,
      boundary,
    };
  }

  const confirmation = resolveConfirmationState(
    upstream.business_prompt_payload_schema,
  );

  const status = makeStatus({
    configuredProvider: provider.requestedProvider,
    payloadStatus: upstream.business_prompt_payload_schema,
    policyGateStatus: upstream.business_prompt_policy_gate,
    confirmationState: confirmation.confirmationState,
    confirmationResult: confirmation.confirmationResult,
  });

  return {
    result: confirmation.result,
    business_prompt_human_confirmation: status,
    business_prompt_payload_schema: upstream.business_prompt_payload_schema,
    business_prompt_policy_gate: upstream.business_prompt_policy_gate,
    business_prompt_contract: upstream.business_prompt_contract,
    business_prompt_smoke: upstream.business_prompt_smoke,
    boundary,
  };
}
