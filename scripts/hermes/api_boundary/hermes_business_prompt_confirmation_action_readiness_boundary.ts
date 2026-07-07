import {
  createHermesBusinessPromptConfirmationReviewUiMetadataBoundary,
  type HermesBusinessPromptConfirmationResult,
  type HermesBusinessPromptConfirmationReviewStatus,
  type HermesBusinessPromptConfirmationReviewUiStatus,
  type HermesBusinessPromptConfirmationState,
} from './hermes_business_prompt_confirmation_review_ui_metadata_boundary';

export type HermesBusinessPromptConfirmationActionStatus =
  | 'disabled_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationActionDisabledReason =
  | 'confirmation_action_not_enabled_by_day55'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationActionReadinessInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationReviewStatus;
  confirmation_state?: HermesBusinessPromptConfirmationState;
  confirmation_result?: HermesBusinessPromptConfirmationResult;
  sample?: string;
};

export type HermesBusinessPromptConfirmationActionReadinessOutput = {
  result: 'ok';
  mode: 'hermes_business_prompt_confirmation_action_readiness_boundary';
  runtime: 'local_llm';
  action_readiness_mode: 'dry_run_confirmation_action_readiness_only';
  configured_provider: 'business_prompt_confirmation_action_readiness';
  upstream_ui_metadata_mode: 'dry_run_confirmation_review_ui_metadata_only';
  upstream_review_mode: 'dry_run_confirmation_review_read_only';
  upstream_confirmation_mode: 'dry_run_human_confirmation_only';
  upstream_payload_schema_mode: 'dry_run_payload_schema_only';
  upstream_policy_gate_mode: 'dry_run_policy_gate_only';
  schema_version: 'hermes.business_prompt_confirmation_action_readiness.v0';
  source_schema_version: 'hermes.business_prompt_confirmation_review_ui_metadata.v0';
  source_review_schema_version: 'hermes.business_prompt_confirmation_review.v0';
  confirmation_required: true;
  human_confirmed: false;
  confirmation_state: HermesBusinessPromptConfirmationState;
  confirmation_result: HermesBusinessPromptConfirmationResult;
  review_status: HermesBusinessPromptConfirmationReviewStatus;
  ui_status: HermesBusinessPromptConfirmationReviewUiStatus;
  ui_action_available: false;
  ui_action_label: 'none';
  confirmation_action_status: HermesBusinessPromptConfirmationActionStatus;
  confirmation_action_enabled: false;
  confirmation_action_visible: false;
  future_confirmation_action_visible_candidate: boolean;
  confirmation_action_label: 'none';
  confirmation_action_disabled_reason: HermesBusinessPromptConfirmationActionDisabledReason;
  confirmation_token_required_for_future_action: boolean;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_token_saved: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  confirmation_status_saved: false;
  audit_write_allowed: false;
  safe_action_readiness_exposed: true;
  safe_ui_metadata_exposed: true;
  safe_review_summary_exposed: true;
  raw_prompt_exposed: false;
  sanitized_prompt_included: false;
  business_context_included: false;
  proposal_body_included: false;
  restricted_domain_data_included: false;
  endpoint_value_exposed: false;
  model_value_exposed: false;
  credentials_exposed: false;
  payload_send_allowed: false;
  runtime_call_allowed: false;
  request_body_created: false;
  request_body_sent: false;
  prompt_sent: false;
  response_body_exposed: false;
  selected_provider: 'mock';
  fallback_provider: 'mock';
  tokens_used: 0;
};

const ACTION_READINESS_PROVIDER =
  'business_prompt_confirmation_action_readiness' as const;

export function mapHermesBusinessPromptConfirmationUiStatusToActionReadiness(
  uiStatus: HermesBusinessPromptConfirmationReviewUiStatus,
): Pick<
  HermesBusinessPromptConfirmationActionReadinessOutput,
  | 'confirmation_action_status'
  | 'confirmation_action_enabled'
  | 'confirmation_action_visible'
  | 'future_confirmation_action_visible_candidate'
  | 'confirmation_action_label'
  | 'confirmation_action_disabled_reason'
  | 'confirmation_token_required_for_future_action'
> {
  if (uiStatus === 'blocked') {
    return {
      confirmation_action_status: 'blocked_by_policy',
      confirmation_action_enabled: false,
      confirmation_action_visible: false,
      future_confirmation_action_visible_candidate: false,
      confirmation_action_label: 'none',
      confirmation_action_disabled_reason: 'blocked_by_policy',
      confirmation_token_required_for_future_action: false,
    };
  }

  if (uiStatus === 'not_ready') {
    return {
      confirmation_action_status: 'payload_not_ready',
      confirmation_action_enabled: false,
      confirmation_action_visible: false,
      future_confirmation_action_visible_candidate: false,
      confirmation_action_label: 'none',
      confirmation_action_disabled_reason: 'payload_not_ready',
      confirmation_token_required_for_future_action: true,
    };
  }

  return {
    confirmation_action_status: 'disabled_pending_implementation',
    confirmation_action_enabled: false,
    confirmation_action_visible: false,
    future_confirmation_action_visible_candidate: true,
    confirmation_action_label: 'none',
    confirmation_action_disabled_reason:
      'confirmation_action_not_enabled_by_day55',
    confirmation_token_required_for_future_action: true,
  };
}

export function createHermesBusinessPromptConfirmationActionReadinessBoundary(
  input: HermesBusinessPromptConfirmationActionReadinessInput = {},
): HermesBusinessPromptConfirmationActionReadinessOutput {
  const upstreamUiMetadata =
    createHermesBusinessPromptConfirmationReviewUiMetadataBoundary({
      provider: input.provider,
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const actionReadiness =
    mapHermesBusinessPromptConfirmationUiStatusToActionReadiness(
      upstreamUiMetadata.ui_status,
    );

  return {
    result: 'ok',
    mode: 'hermes_business_prompt_confirmation_action_readiness_boundary',
    runtime: 'local_llm',
    action_readiness_mode: 'dry_run_confirmation_action_readiness_only',
    configured_provider: ACTION_READINESS_PROVIDER,
    upstream_ui_metadata_mode: upstreamUiMetadata.ui_metadata_mode,
    upstream_review_mode: upstreamUiMetadata.upstream_review_mode,
    upstream_confirmation_mode: upstreamUiMetadata.upstream_confirmation_mode,
    upstream_payload_schema_mode: upstreamUiMetadata.upstream_payload_schema_mode,
    upstream_policy_gate_mode: upstreamUiMetadata.upstream_policy_gate_mode,
    schema_version: 'hermes.business_prompt_confirmation_action_readiness.v0',
    source_schema_version:
      'hermes.business_prompt_confirmation_review_ui_metadata.v0',
    source_review_schema_version: upstreamUiMetadata.source_schema_version,
    confirmation_required: upstreamUiMetadata.confirmation_required,
    human_confirmed: upstreamUiMetadata.human_confirmed,
    confirmation_state: upstreamUiMetadata.confirmation_state,
    confirmation_result: upstreamUiMetadata.confirmation_result,
    review_status: upstreamUiMetadata.review_status,
    ui_status: upstreamUiMetadata.ui_status,
    ui_action_available: upstreamUiMetadata.ui_action_available,
    ui_action_label: upstreamUiMetadata.ui_action_label,
    ...actionReadiness,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_token_saved: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    confirmation_status_saved: false,
    audit_write_allowed: false,
    safe_action_readiness_exposed: true,
    safe_ui_metadata_exposed: upstreamUiMetadata.safe_ui_metadata_exposed,
    safe_review_summary_exposed: upstreamUiMetadata.safe_review_summary_exposed,
    raw_prompt_exposed: upstreamUiMetadata.raw_prompt_exposed,
    sanitized_prompt_included: upstreamUiMetadata.sanitized_prompt_included,
    business_context_included: upstreamUiMetadata.business_context_included,
    proposal_body_included: upstreamUiMetadata.proposal_body_included,
    restricted_domain_data_included:
      upstreamUiMetadata.restricted_domain_data_included,
    endpoint_value_exposed: upstreamUiMetadata.endpoint_value_exposed,
    model_value_exposed: upstreamUiMetadata.model_value_exposed,
    credentials_exposed: upstreamUiMetadata.credentials_exposed,
    payload_send_allowed: upstreamUiMetadata.payload_send_allowed,
    runtime_call_allowed: upstreamUiMetadata.runtime_call_allowed,
    request_body_created: upstreamUiMetadata.request_body_created,
    request_body_sent: upstreamUiMetadata.request_body_sent,
    prompt_sent: upstreamUiMetadata.prompt_sent,
    response_body_exposed: upstreamUiMetadata.response_body_exposed,
    selected_provider: upstreamUiMetadata.selected_provider,
    fallback_provider: upstreamUiMetadata.fallback_provider,
    tokens_used: upstreamUiMetadata.tokens_used,
  };
}

export const hermesBusinessPromptConfirmationActionReadinessBoundary = {
  provider: ACTION_READINESS_PROVIDER,
  localProviderAlias: 'local_llm_business_prompt_confirmation_action_readiness',
  mode: 'hermes_business_prompt_confirmation_action_readiness_boundary',
  actionReadinessMode: 'dry_run_confirmation_action_readiness_only',
  schemaVersion: 'hermes.business_prompt_confirmation_action_readiness.v0',
} as const;
