import { runHermesBusinessPromptHumanConfirmationBoundary } from "./hermes_business_prompt_human_confirmation_boundary";

type UpstreamHumanConfirmationResult = Awaited<
  ReturnType<typeof runHermesBusinessPromptHumanConfirmationBoundary>
>;

type HermesBusinessPromptConfirmationReviewReadProvider =
  | "business_prompt_confirmation_review_read"
  | "local_llm_business_prompt_confirmation_review_read";

type HermesBusinessPromptConfirmationReviewStatus =
  | "needs_human_review"
  | "blocked_by_policy"
  | "not_ready";

type HermesBusinessPromptConfirmationReviewActionLabel = "none";

type HermesBusinessPromptConfirmationReviewSummary = {
  summary_kind: "safe_confirmation_review_metadata_only";
  schema_version: "hermes.business_prompt_confirmation_review.v0";
  confirmation_required: true;
  human_confirmed: false;
  confirmation_state: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_state"];
  confirmation_result: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_result"];
  review_status: HermesBusinessPromptConfirmationReviewStatus;
  review_action_available: false;
  review_action_label: HermesBusinessPromptConfirmationReviewActionLabel;
  payload_created: boolean;
  payload_send_allowed: false;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  raw_prompt_included: false;
  sanitized_prompt_included: false;
  business_context_included: false;
  proposal_body_included: false;
  restricted_domain_data_included: false;
  endpoint_value_included: false;
  model_value_included: false;
  credential_value_included: false;
};

export type HermesBusinessPromptConfirmationReviewReadStatus = {
  mode: "hermes_business_prompt_confirmation_review_read_boundary";
  runtime: "local_llm";
  review_mode: "dry_run_confirmation_review_read_only";
  configured_provider: HermesBusinessPromptConfirmationReviewReadProvider;
  upstream_confirmation_mode: "dry_run_human_confirmation_only";
  upstream_payload_schema_mode: "dry_run_payload_schema_only";
  upstream_policy_gate_mode: "dry_run_policy_gate_only";
  schema_version: "hermes.business_prompt_confirmation_review.v0";
  confirmation_required: true;
  human_confirmed: false;
  confirmation_state: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_state"];
  confirmation_result: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_result"];
  review_status: HermesBusinessPromptConfirmationReviewStatus;
  review_action_available: false;
  review_action_label: HermesBusinessPromptConfirmationReviewActionLabel;
  safe_review_summary_exposed: true;
  raw_prompt_exposed: false;
  sanitized_prompt_included: false;
  business_context_included: false;
  proposal_body_included: false;
  restricted_domain_data_included: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  payload_created: boolean;
  payload_send_allowed: false;
  runtime_call_allowed: false;
  request_body_created: false;
  request_body_sent: false;
  prompt_sent: false;
  response_body_exposed: false;
  selected_provider: "mock";
  fallback_provider: "mock";
  tokens_used: 0;
  review_summary: HermesBusinessPromptConfirmationReviewSummary;
};

type HermesBusinessPromptConfirmationReviewReadBoundary = {
  writes_performed: false;
  chat_history_write_allowed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
  proposal_apply_allowed: false;
  confirmation_write_allowed: false;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_record_created: false;
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

export type HermesBusinessPromptConfirmationReviewReadResult = {
  result: "ok" | "blocked" | "bad_request";
  business_prompt_confirmation_review_read: HermesBusinessPromptConfirmationReviewReadStatus;
  business_prompt_human_confirmation: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"];
  business_prompt_payload_schema: UpstreamHumanConfirmationResult["business_prompt_payload_schema"];
  business_prompt_policy_gate: UpstreamHumanConfirmationResult["business_prompt_policy_gate"];
  business_prompt_contract: UpstreamHumanConfirmationResult["business_prompt_contract"];
  business_prompt_smoke: UpstreamHumanConfirmationResult["business_prompt_smoke"];
  boundary: HermesBusinessPromptConfirmationReviewReadBoundary;
};

type HermesBusinessPromptConfirmationReviewReadInput = {
  provider?: unknown;
  dryRun?: unknown;
  sample?: unknown;
  prompt?: unknown;
  userPrompt?: unknown;
  userMessage?: unknown;
};

const boundary: HermesBusinessPromptConfirmationReviewReadBoundary = {
  writes_performed: false,
  chat_history_write_allowed: false,
  app_schema_write_allowed: false,
  ai_proposal_write_allowed: false,
  audit_apply_event_write_allowed: false,
  proposal_apply_allowed: false,
  confirmation_write_allowed: false,
  confirmation_token_created: false,
  confirmation_token_exposed: false,
  confirmation_record_created: false,
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
      requestedProvider: HermesBusinessPromptConfirmationReviewReadProvider;
    }
  | {
      ok: false;
      requestedProvider: "business_prompt_confirmation_review_read";
    } {
  if (provider === undefined || provider === null || provider === "") {
    return {
      ok: true,
      requestedProvider: "business_prompt_confirmation_review_read",
    };
  }

  if (typeof provider !== "string") {
    return {
      ok: false,
      requestedProvider: "business_prompt_confirmation_review_read",
    };
  }

  const normalized = provider.trim().toLowerCase();

  if (
    normalized === "business_prompt_confirmation_review_read" ||
    normalized === "local_llm_business_prompt_confirmation_review_read"
  ) {
    return {
      ok: true,
      requestedProvider: normalized,
    };
  }

  return {
    ok: false,
    requestedProvider: "business_prompt_confirmation_review_read",
  };
}

function resolveReviewStatus(
  confirmationState: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_state"],
): HermesBusinessPromptConfirmationReviewStatus {
  if (confirmationState === "blocked") return "blocked_by_policy";
  if (confirmationState === "not_configured") return "not_ready";

  return "needs_human_review";
}

function makeReviewSummary(input: {
  payloadCreated: boolean;
  confirmationState: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_state"];
  confirmationResult: UpstreamHumanConfirmationResult["business_prompt_human_confirmation"]["confirmation_result"];
  reviewStatus: HermesBusinessPromptConfirmationReviewStatus;
}): HermesBusinessPromptConfirmationReviewSummary {
  return {
    summary_kind: "safe_confirmation_review_metadata_only",
    schema_version: "hermes.business_prompt_confirmation_review.v0",
    confirmation_required: true,
    human_confirmed: false,
    confirmation_state: input.confirmationState,
    confirmation_result: input.confirmationResult,
    review_status: input.reviewStatus,
    review_action_available: false,
    review_action_label: "none",
    payload_created: input.payloadCreated,
    payload_send_allowed: false,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    raw_prompt_included: false,
    sanitized_prompt_included: false,
    business_context_included: false,
    proposal_body_included: false,
    restricted_domain_data_included: false,
    endpoint_value_included: false,
    model_value_included: false,
    credential_value_included: false,
  };
}

function makeStatus(input: {
  provider: HermesBusinessPromptConfirmationReviewReadProvider;
  upstream: UpstreamHumanConfirmationResult;
}): HermesBusinessPromptConfirmationReviewReadStatus {
  const humanConfirmation = input.upstream.business_prompt_human_confirmation;
  const reviewStatus = resolveReviewStatus(humanConfirmation.confirmation_state);

  return {
    mode: "hermes_business_prompt_confirmation_review_read_boundary",
    runtime: "local_llm",
    review_mode: "dry_run_confirmation_review_read_only",
    configured_provider: input.provider,
    upstream_confirmation_mode: "dry_run_human_confirmation_only",
    upstream_payload_schema_mode: "dry_run_payload_schema_only",
    upstream_policy_gate_mode: "dry_run_policy_gate_only",
    schema_version: "hermes.business_prompt_confirmation_review.v0",
    confirmation_required: true,
    human_confirmed: false,
    confirmation_state: humanConfirmation.confirmation_state,
    confirmation_result: humanConfirmation.confirmation_result,
    review_status: reviewStatus,
    review_action_available: false,
    review_action_label: "none",
    safe_review_summary_exposed: true,
    raw_prompt_exposed: false,
    sanitized_prompt_included: false,
    business_context_included: false,
    proposal_body_included: false,
    restricted_domain_data_included: false,
    endpoint_value_exposed: false,
    model_value_exposed: false,
    credentials_exposed: false,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    payload_created: humanConfirmation.payload_created,
    payload_send_allowed: false,
    runtime_call_allowed: false,
    request_body_created: false,
    request_body_sent: false,
    prompt_sent: false,
    response_body_exposed: false,
    selected_provider: "mock",
    fallback_provider: "mock",
    tokens_used: 0,
    review_summary: makeReviewSummary({
      payloadCreated: humanConfirmation.payload_created,
      confirmationState: humanConfirmation.confirmation_state,
      confirmationResult: humanConfirmation.confirmation_result,
      reviewStatus,
    }),
  };
}

export async function runHermesBusinessPromptConfirmationReviewReadBoundary(
  input: HermesBusinessPromptConfirmationReviewReadInput = {},
): Promise<HermesBusinessPromptConfirmationReviewReadResult> {
  const provider = normalizeProvider(input.provider);

  const upstream = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "business_prompt_human_confirmation",
    dryRun: true,
    sample: input.sample,
    prompt: input.prompt,
    userPrompt: input.userPrompt,
    userMessage: input.userMessage,
  });

  const status = makeStatus({
    provider: provider.requestedProvider,
    upstream,
  });

  if (!provider.ok || input.dryRun !== true) {
    return {
      result: "bad_request",
      business_prompt_confirmation_review_read: status,
      business_prompt_human_confirmation:
        upstream.business_prompt_human_confirmation,
      business_prompt_payload_schema: upstream.business_prompt_payload_schema,
      business_prompt_policy_gate: upstream.business_prompt_policy_gate,
      business_prompt_contract: upstream.business_prompt_contract,
      business_prompt_smoke: upstream.business_prompt_smoke,
      boundary,
    };
  }

  return {
    result: upstream.result === "blocked" ? "blocked" : "ok",
    business_prompt_confirmation_review_read: status,
    business_prompt_human_confirmation: upstream.business_prompt_human_confirmation,
    business_prompt_payload_schema: upstream.business_prompt_payload_schema,
    business_prompt_policy_gate: upstream.business_prompt_policy_gate,
    business_prompt_contract: upstream.business_prompt_contract,
    business_prompt_smoke: upstream.business_prompt_smoke,
    boundary,
  };
}
