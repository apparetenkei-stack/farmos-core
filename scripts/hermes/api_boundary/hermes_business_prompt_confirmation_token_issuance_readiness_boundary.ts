import {
  createHermesBusinessPromptConfirmationTokenPreviewBoundary,
  type HermesBusinessPromptConfirmationTokenIssuanceDisabledReason,
  type HermesBusinessPromptConfirmationTokenIssuanceStatus,
  type HermesBusinessPromptConfirmationTokenPreviewDisabledReason,
  type HermesBusinessPromptConfirmationTokenPreviewStatus,
} from './hermes_business_prompt_confirmation_token_preview_boundary';
import type {
  HermesBusinessPromptConfirmationActionDisabledReason,
  HermesBusinessPromptConfirmationActionStatus,
} from './hermes_business_prompt_confirmation_action_readiness_boundary';
import type {
  HermesBusinessPromptConfirmationResult,
  HermesBusinessPromptConfirmationReviewStatus,
  HermesBusinessPromptConfirmationReviewUiStatus,
  HermesBusinessPromptConfirmationState,
} from './hermes_business_prompt_confirmation_review_ui_metadata_boundary';

export type HermesBusinessPromptConfirmationTokenIssuanceReadinessStatus =
  | 'readiness_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceReadinessDisabledReason =
  | 'token_issuance_readiness_not_enabled_by_day57'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceRequestStatus =
  | 'disabled_pending_readiness'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceRequestDisabledReason =
  | 'token_issuance_request_not_enabled_by_day57'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceReadinessInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationReviewStatus;
  confirmation_state?: HermesBusinessPromptConfirmationState;
  confirmation_result?: HermesBusinessPromptConfirmationResult;
  sample?: string;
};

export type HermesBusinessPromptConfirmationTokenIssuanceReadinessOutput = {
  result: 'ok';
  mode: 'hermes_business_prompt_confirmation_token_issuance_readiness_boundary';
  runtime: 'local_llm';
  confirmation_token_issuance_readiness_mode: 'dry_run_confirmation_token_issuance_readiness_only';
  configured_provider: 'business_prompt_confirmation_token_issuance_readiness';
  upstream_token_preview_mode: 'dry_run_confirmation_token_preview_only';
  upstream_action_readiness_mode: 'dry_run_confirmation_action_readiness_only';
  upstream_ui_metadata_mode: 'dry_run_confirmation_review_ui_metadata_only';
  upstream_review_mode: 'dry_run_confirmation_review_read_only';
  upstream_confirmation_mode: 'dry_run_human_confirmation_only';
  upstream_payload_schema_mode: 'dry_run_payload_schema_only';
  upstream_policy_gate_mode: 'dry_run_policy_gate_only';
  schema_version: 'hermes.business_prompt_confirmation_token_issuance_readiness.v0';
  source_schema_version: 'hermes.business_prompt_confirmation_token_preview.v0';
  source_action_readiness_schema_version: 'hermes.business_prompt_confirmation_action_readiness.v0';
  source_ui_metadata_schema_version: 'hermes.business_prompt_confirmation_review_ui_metadata.v0';
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
  confirmation_action_label: 'none';
  confirmation_action_disabled_reason: HermesBusinessPromptConfirmationActionDisabledReason;
  confirmation_token_required_for_future_action: boolean;
  confirmation_token_preview_status: HermesBusinessPromptConfirmationTokenPreviewStatus;
  confirmation_token_preview_available: false;
  confirmation_token_preview_label: 'none';
  confirmation_token_preview_disabled_reason: HermesBusinessPromptConfirmationTokenPreviewDisabledReason;
  confirmation_token_issuance_status: HermesBusinessPromptConfirmationTokenIssuanceStatus;
  confirmation_token_issuance_allowed: false;
  confirmation_token_issuance_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceDisabledReason;
  confirmation_token_required_precondition_met: boolean;
  confirmation_action_precondition_met: false;
  confirmation_token_issuance_readiness_status: HermesBusinessPromptConfirmationTokenIssuanceReadinessStatus;
  confirmation_token_issuance_readiness_available: false;
  confirmation_token_issuance_readiness_label: 'none';
  confirmation_token_issuance_readiness_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceReadinessDisabledReason;
  confirmation_token_issuance_request_status: HermesBusinessPromptConfirmationTokenIssuanceRequestStatus;
  confirmation_token_issuance_request_allowed: false;
  confirmation_token_issuance_request_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceRequestDisabledReason;
  confirmation_token_future_issuance_candidate: boolean;
  confirmation_token_issuance_precondition_met: boolean;
  confirmation_token_preview_precondition_met: false;
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_token_saved: false;
  confirmation_token_plaintext_created: false;
  confirmation_token_plaintext_exposed: false;
  confirmation_token_hash_created: false;
  confirmation_token_hash_saved: false;
  confirmation_token_signature_created: false;
  confirmation_token_verified: false;
  confirmation_token_expiry_created: false;
  confirmation_token_expiry_saved: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  confirmation_status_saved: false;
  audit_write_allowed: false;
  safe_token_issuance_readiness_exposed: true;
  safe_token_preview_exposed: true;
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

const TOKEN_ISSUANCE_READINESS_PROVIDER =
  'business_prompt_confirmation_token_issuance_readiness' as const;

export function mapHermesBusinessPromptConfirmationTokenPreviewStatusToIssuanceReadiness(
  previewStatus: HermesBusinessPromptConfirmationTokenPreviewStatus,
): Pick<
  HermesBusinessPromptConfirmationTokenIssuanceReadinessOutput,
  | 'confirmation_token_issuance_readiness_status'
  | 'confirmation_token_issuance_readiness_available'
  | 'confirmation_token_issuance_readiness_label'
  | 'confirmation_token_issuance_readiness_disabled_reason'
  | 'confirmation_token_issuance_request_status'
  | 'confirmation_token_issuance_request_allowed'
  | 'confirmation_token_issuance_request_disabled_reason'
  | 'confirmation_token_future_issuance_candidate'
  | 'confirmation_token_issuance_precondition_met'
  | 'confirmation_token_preview_precondition_met'
> {
  if (previewStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_readiness_status: 'blocked_by_policy',
      confirmation_token_issuance_readiness_available: false,
      confirmation_token_issuance_readiness_label: 'none',
      confirmation_token_issuance_readiness_disabled_reason: 'blocked_by_policy',
      confirmation_token_issuance_request_status: 'blocked_by_policy',
      confirmation_token_issuance_request_allowed: false,
      confirmation_token_issuance_request_disabled_reason: 'blocked_by_policy',
      confirmation_token_future_issuance_candidate: false,
      confirmation_token_issuance_precondition_met: false,
      confirmation_token_preview_precondition_met: false,
    };
  }

  if (previewStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_readiness_status: 'payload_not_ready',
      confirmation_token_issuance_readiness_available: false,
      confirmation_token_issuance_readiness_label: 'none',
      confirmation_token_issuance_readiness_disabled_reason: 'payload_not_ready',
      confirmation_token_issuance_request_status: 'payload_not_ready',
      confirmation_token_issuance_request_allowed: false,
      confirmation_token_issuance_request_disabled_reason: 'payload_not_ready',
      confirmation_token_future_issuance_candidate: false,
      confirmation_token_issuance_precondition_met: true,
      confirmation_token_preview_precondition_met: false,
    };
  }

  return {
    confirmation_token_issuance_readiness_status:
      'readiness_pending_implementation',
    confirmation_token_issuance_readiness_available: false,
    confirmation_token_issuance_readiness_label: 'none',
    confirmation_token_issuance_readiness_disabled_reason:
      'token_issuance_readiness_not_enabled_by_day57',
    confirmation_token_issuance_request_status: 'disabled_pending_readiness',
    confirmation_token_issuance_request_allowed: false,
    confirmation_token_issuance_request_disabled_reason:
      'token_issuance_request_not_enabled_by_day57',
    confirmation_token_future_issuance_candidate: true,
    confirmation_token_issuance_precondition_met: true,
    confirmation_token_preview_precondition_met: false,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceReadinessBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceReadinessInput = {},
): HermesBusinessPromptConfirmationTokenIssuanceReadinessOutput {
  const upstreamTokenPreview =
    createHermesBusinessPromptConfirmationTokenPreviewBoundary({
      provider: input.provider,
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const issuanceReadiness =
    mapHermesBusinessPromptConfirmationTokenPreviewStatusToIssuanceReadiness(
      upstreamTokenPreview.confirmation_token_preview_status,
    );

  return {
    result: 'ok',
    mode: 'hermes_business_prompt_confirmation_token_issuance_readiness_boundary',
    runtime: 'local_llm',
    confirmation_token_issuance_readiness_mode:
      'dry_run_confirmation_token_issuance_readiness_only',
    configured_provider: TOKEN_ISSUANCE_READINESS_PROVIDER,
    upstream_token_preview_mode:
      upstreamTokenPreview.confirmation_token_preview_mode,
    upstream_action_readiness_mode:
      upstreamTokenPreview.upstream_action_readiness_mode,
    upstream_ui_metadata_mode: upstreamTokenPreview.upstream_ui_metadata_mode,
    upstream_review_mode: upstreamTokenPreview.upstream_review_mode,
    upstream_confirmation_mode: upstreamTokenPreview.upstream_confirmation_mode,
    upstream_payload_schema_mode: upstreamTokenPreview.upstream_payload_schema_mode,
    upstream_policy_gate_mode: upstreamTokenPreview.upstream_policy_gate_mode,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_readiness.v0',
    source_schema_version: upstreamTokenPreview.schema_version,
    source_action_readiness_schema_version:
      upstreamTokenPreview.source_schema_version,
    source_ui_metadata_schema_version:
      upstreamTokenPreview.source_ui_metadata_schema_version,
    source_review_schema_version: upstreamTokenPreview.source_review_schema_version,
    confirmation_required: upstreamTokenPreview.confirmation_required,
    human_confirmed: upstreamTokenPreview.human_confirmed,
    confirmation_state: upstreamTokenPreview.confirmation_state,
    confirmation_result: upstreamTokenPreview.confirmation_result,
    review_status: upstreamTokenPreview.review_status,
    ui_status: upstreamTokenPreview.ui_status,
    ui_action_available: upstreamTokenPreview.ui_action_available,
    ui_action_label: upstreamTokenPreview.ui_action_label,
    confirmation_action_status: upstreamTokenPreview.confirmation_action_status,
    confirmation_action_enabled: upstreamTokenPreview.confirmation_action_enabled,
    confirmation_action_visible: upstreamTokenPreview.confirmation_action_visible,
    confirmation_action_label: upstreamTokenPreview.confirmation_action_label,
    confirmation_action_disabled_reason:
      upstreamTokenPreview.confirmation_action_disabled_reason,
    confirmation_token_required_for_future_action:
      upstreamTokenPreview.confirmation_token_required_for_future_action,
    confirmation_token_preview_status:
      upstreamTokenPreview.confirmation_token_preview_status,
    confirmation_token_preview_available:
      upstreamTokenPreview.confirmation_token_preview_available,
    confirmation_token_preview_label:
      upstreamTokenPreview.confirmation_token_preview_label,
    confirmation_token_preview_disabled_reason:
      upstreamTokenPreview.confirmation_token_preview_disabled_reason,
    confirmation_token_issuance_status:
      upstreamTokenPreview.confirmation_token_issuance_status,
    confirmation_token_issuance_allowed:
      upstreamTokenPreview.confirmation_token_issuance_allowed,
    confirmation_token_issuance_disabled_reason:
      upstreamTokenPreview.confirmation_token_issuance_disabled_reason,
    confirmation_token_required_precondition_met:
      upstreamTokenPreview.confirmation_token_required_precondition_met,
    confirmation_action_precondition_met:
      upstreamTokenPreview.confirmation_action_precondition_met,
    ...issuanceReadiness,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_token_saved: false,
    confirmation_token_plaintext_created: false,
    confirmation_token_plaintext_exposed: false,
    confirmation_token_hash_created: false,
    confirmation_token_hash_saved: false,
    confirmation_token_signature_created: false,
    confirmation_token_verified: false,
    confirmation_token_expiry_created: false,
    confirmation_token_expiry_saved: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    confirmation_status_saved: false,
    audit_write_allowed: false,
    safe_token_issuance_readiness_exposed: true,
    safe_token_preview_exposed: upstreamTokenPreview.safe_token_preview_exposed,
    safe_action_readiness_exposed:
      upstreamTokenPreview.safe_action_readiness_exposed,
    safe_ui_metadata_exposed: upstreamTokenPreview.safe_ui_metadata_exposed,
    safe_review_summary_exposed:
      upstreamTokenPreview.safe_review_summary_exposed,
    raw_prompt_exposed: upstreamTokenPreview.raw_prompt_exposed,
    sanitized_prompt_included: upstreamTokenPreview.sanitized_prompt_included,
    business_context_included: upstreamTokenPreview.business_context_included,
    proposal_body_included: upstreamTokenPreview.proposal_body_included,
    restricted_domain_data_included:
      upstreamTokenPreview.restricted_domain_data_included,
    endpoint_value_exposed: upstreamTokenPreview.endpoint_value_exposed,
    model_value_exposed: upstreamTokenPreview.model_value_exposed,
    credentials_exposed: upstreamTokenPreview.credentials_exposed,
    payload_send_allowed: upstreamTokenPreview.payload_send_allowed,
    runtime_call_allowed: upstreamTokenPreview.runtime_call_allowed,
    request_body_created: upstreamTokenPreview.request_body_created,
    request_body_sent: upstreamTokenPreview.request_body_sent,
    prompt_sent: upstreamTokenPreview.prompt_sent,
    response_body_exposed: upstreamTokenPreview.response_body_exposed,
    selected_provider: upstreamTokenPreview.selected_provider,
    fallback_provider: upstreamTokenPreview.fallback_provider,
    tokens_used: upstreamTokenPreview.tokens_used,
  };
}
