import {
  createHermesBusinessPromptConfirmationActionReadinessBoundary,
  type HermesBusinessPromptConfirmationActionDisabledReason,
  type HermesBusinessPromptConfirmationActionStatus,
} from './hermes_business_prompt_confirmation_action_readiness_boundary';
import type {
  HermesBusinessPromptConfirmationResult,
  HermesBusinessPromptConfirmationReviewStatus,
  HermesBusinessPromptConfirmationReviewUiStatus,
  HermesBusinessPromptConfirmationState,
} from './hermes_business_prompt_confirmation_review_ui_metadata_boundary';

export type HermesBusinessPromptConfirmationTokenPreviewStatus =
  | 'preview_only_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenPreviewDisabledReason =
  | 'token_preview_not_enabled_by_day56'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceStatus =
  | 'disabled_pending_preview'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceDisabledReason =
  | 'token_issuance_not_enabled_by_day56'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenPreviewInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationReviewStatus;
  confirmation_state?: HermesBusinessPromptConfirmationState;
  confirmation_result?: HermesBusinessPromptConfirmationResult;
  sample?: string;
};

export type HermesBusinessPromptConfirmationTokenPreviewOutput = {
  result: 'ok';
  mode: 'hermes_business_prompt_confirmation_token_preview_boundary';
  runtime: 'local_llm';
  confirmation_token_preview_mode: 'dry_run_confirmation_token_preview_only';
  configured_provider: 'business_prompt_confirmation_token_preview';
  upstream_action_readiness_mode: 'dry_run_confirmation_action_readiness_only';
  upstream_ui_metadata_mode: 'dry_run_confirmation_review_ui_metadata_only';
  upstream_review_mode: 'dry_run_confirmation_review_read_only';
  upstream_confirmation_mode: 'dry_run_human_confirmation_only';
  upstream_payload_schema_mode: 'dry_run_payload_schema_only';
  upstream_policy_gate_mode: 'dry_run_policy_gate_only';
  schema_version: 'hermes.business_prompt_confirmation_token_preview.v0';
  source_schema_version: 'hermes.business_prompt_confirmation_action_readiness.v0';
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
  confirmation_token_created: false;
  confirmation_token_exposed: false;
  confirmation_token_saved: false;
  confirmation_token_hash_created: false;
  confirmation_token_hash_saved: false;
  confirmation_token_signature_created: false;
  confirmation_token_verified: false;
  confirmation_token_expiry_saved: false;
  confirmation_record_created: false;
  confirmation_record_saved: false;
  confirmation_status_saved: false;
  audit_write_allowed: false;
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

const TOKEN_PREVIEW_PROVIDER =
  'business_prompt_confirmation_token_preview' as const;

export function mapHermesBusinessPromptConfirmationActionStatusToTokenPreview(
  actionStatus: HermesBusinessPromptConfirmationActionStatus,
): Pick<
  HermesBusinessPromptConfirmationTokenPreviewOutput,
  | 'confirmation_token_preview_status'
  | 'confirmation_token_preview_available'
  | 'confirmation_token_preview_label'
  | 'confirmation_token_preview_disabled_reason'
  | 'confirmation_token_issuance_status'
  | 'confirmation_token_issuance_allowed'
  | 'confirmation_token_issuance_disabled_reason'
  | 'confirmation_token_required_precondition_met'
  | 'confirmation_action_precondition_met'
> {
  if (actionStatus === 'blocked_by_policy') {
    return {
      confirmation_token_preview_status: 'blocked_by_policy',
      confirmation_token_preview_available: false,
      confirmation_token_preview_label: 'none',
      confirmation_token_preview_disabled_reason: 'blocked_by_policy',
      confirmation_token_issuance_status: 'blocked_by_policy',
      confirmation_token_issuance_allowed: false,
      confirmation_token_issuance_disabled_reason: 'blocked_by_policy',
      confirmation_token_required_precondition_met: false,
      confirmation_action_precondition_met: false,
    };
  }

  if (actionStatus === 'payload_not_ready') {
    return {
      confirmation_token_preview_status: 'payload_not_ready',
      confirmation_token_preview_available: false,
      confirmation_token_preview_label: 'none',
      confirmation_token_preview_disabled_reason: 'payload_not_ready',
      confirmation_token_issuance_status: 'payload_not_ready',
      confirmation_token_issuance_allowed: false,
      confirmation_token_issuance_disabled_reason: 'payload_not_ready',
      confirmation_token_required_precondition_met: true,
      confirmation_action_precondition_met: false,
    };
  }

  return {
    confirmation_token_preview_status: 'preview_only_pending_implementation',
    confirmation_token_preview_available: false,
    confirmation_token_preview_label: 'none',
    confirmation_token_preview_disabled_reason:
      'token_preview_not_enabled_by_day56',
    confirmation_token_issuance_status: 'disabled_pending_preview',
    confirmation_token_issuance_allowed: false,
    confirmation_token_issuance_disabled_reason:
      'token_issuance_not_enabled_by_day56',
    confirmation_token_required_precondition_met: true,
    confirmation_action_precondition_met: false,
  };
}

export function createHermesBusinessPromptConfirmationTokenPreviewBoundary(
  input: HermesBusinessPromptConfirmationTokenPreviewInput = {},
): HermesBusinessPromptConfirmationTokenPreviewOutput {
  const upstreamActionReadiness =
    createHermesBusinessPromptConfirmationActionReadinessBoundary({
      provider: input.provider,
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const tokenPreview =
    mapHermesBusinessPromptConfirmationActionStatusToTokenPreview(
      upstreamActionReadiness.confirmation_action_status,
    );

  return {
    result: 'ok',
    mode: 'hermes_business_prompt_confirmation_token_preview_boundary',
    runtime: 'local_llm',
    confirmation_token_preview_mode:
      'dry_run_confirmation_token_preview_only',
    configured_provider: TOKEN_PREVIEW_PROVIDER,
    upstream_action_readiness_mode:
      upstreamActionReadiness.action_readiness_mode,
    upstream_ui_metadata_mode:
      upstreamActionReadiness.upstream_ui_metadata_mode,
    upstream_review_mode: upstreamActionReadiness.upstream_review_mode,
    upstream_confirmation_mode:
      upstreamActionReadiness.upstream_confirmation_mode,
    upstream_payload_schema_mode:
      upstreamActionReadiness.upstream_payload_schema_mode,
    upstream_policy_gate_mode:
      upstreamActionReadiness.upstream_policy_gate_mode,
    schema_version: 'hermes.business_prompt_confirmation_token_preview.v0',
    source_schema_version:
      'hermes.business_prompt_confirmation_action_readiness.v0',
    source_ui_metadata_schema_version:
      upstreamActionReadiness.source_schema_version,
    source_review_schema_version:
      upstreamActionReadiness.source_review_schema_version,
    confirmation_required: upstreamActionReadiness.confirmation_required,
    human_confirmed: upstreamActionReadiness.human_confirmed,
    confirmation_state: upstreamActionReadiness.confirmation_state,
    confirmation_result: upstreamActionReadiness.confirmation_result,
    review_status: upstreamActionReadiness.review_status,
    ui_status: upstreamActionReadiness.ui_status,
    ui_action_available: upstreamActionReadiness.ui_action_available,
    ui_action_label: upstreamActionReadiness.ui_action_label,
    confirmation_action_status:
      upstreamActionReadiness.confirmation_action_status,
    confirmation_action_enabled:
      upstreamActionReadiness.confirmation_action_enabled,
    confirmation_action_visible:
      upstreamActionReadiness.confirmation_action_visible,
    confirmation_action_label:
      upstreamActionReadiness.confirmation_action_label,
    confirmation_action_disabled_reason:
      upstreamActionReadiness.confirmation_action_disabled_reason,
    confirmation_token_required_for_future_action:
      upstreamActionReadiness.confirmation_token_required_for_future_action,
    ...tokenPreview,
    confirmation_token_created: false,
    confirmation_token_exposed: false,
    confirmation_token_saved: false,
    confirmation_token_hash_created: false,
    confirmation_token_hash_saved: false,
    confirmation_token_signature_created: false,
    confirmation_token_verified: false,
    confirmation_token_expiry_saved: false,
    confirmation_record_created: false,
    confirmation_record_saved: false,
    confirmation_status_saved: false,
    audit_write_allowed: false,
    safe_token_preview_exposed: true,
    safe_action_readiness_exposed:
      upstreamActionReadiness.safe_action_readiness_exposed,
    safe_ui_metadata_exposed:
      upstreamActionReadiness.safe_ui_metadata_exposed,
    safe_review_summary_exposed:
      upstreamActionReadiness.safe_review_summary_exposed,
    raw_prompt_exposed: upstreamActionReadiness.raw_prompt_exposed,
    sanitized_prompt_included:
      upstreamActionReadiness.sanitized_prompt_included,
    business_context_included:
      upstreamActionReadiness.business_context_included,
    proposal_body_included: upstreamActionReadiness.proposal_body_included,
    restricted_domain_data_included:
      upstreamActionReadiness.restricted_domain_data_included,
    endpoint_value_exposed: upstreamActionReadiness.endpoint_value_exposed,
    model_value_exposed: upstreamActionReadiness.model_value_exposed,
    credentials_exposed: upstreamActionReadiness.credentials_exposed,
    payload_send_allowed: upstreamActionReadiness.payload_send_allowed,
    runtime_call_allowed: upstreamActionReadiness.runtime_call_allowed,
    request_body_created: upstreamActionReadiness.request_body_created,
    request_body_sent: upstreamActionReadiness.request_body_sent,
    prompt_sent: upstreamActionReadiness.prompt_sent,
    response_body_exposed: upstreamActionReadiness.response_body_exposed,
    selected_provider: upstreamActionReadiness.selected_provider,
    fallback_provider: upstreamActionReadiness.fallback_provider,
    tokens_used: upstreamActionReadiness.tokens_used,
  };
}

export const hermesBusinessPromptConfirmationTokenPreviewBoundary = {
  provider: TOKEN_PREVIEW_PROVIDER,
  localProviderAlias: 'local_llm_business_prompt_confirmation_token_preview',
  mode: 'hermes_business_prompt_confirmation_token_preview_boundary',
  tokenPreviewMode: 'dry_run_confirmation_token_preview_only',
  schemaVersion: 'hermes.business_prompt_confirmation_token_preview.v0',
} as const;
