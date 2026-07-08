import { createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary } from './hermes_business_prompt_confirmation_token_issuance_request_boundary';

type HermesBusinessPromptConfirmationTokenIssuanceRequestBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary
  >;

export type HermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatus =
  | 'operation_plan_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceOperationPlanDisabledReason =
  | 'token_issuance_operation_plan_not_enabled_by_day59'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceOperationPlanInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationTokenIssuanceRequestBoundaryOutput['review_status'];
  confirmation_state?: HermesBusinessPromptConfirmationTokenIssuanceRequestBoundaryOutput['confirmation_state'];
  confirmation_result?: HermesBusinessPromptConfirmationTokenIssuanceRequestBoundaryOutput['confirmation_result'];
  sample?: string;
};

const TOKEN_ISSUANCE_OPERATION_PLAN_PROVIDER =
  'business_prompt_confirmation_token_issuance_operation_plan' as const;

export function mapHermesBusinessPromptConfirmationTokenIssuanceRequestStatusToOperationPlan(
  requestStatus: HermesBusinessPromptConfirmationTokenIssuanceRequestBoundaryOutput['confirmation_token_issuance_request_status'],
): {
  confirmation_token_issuance_operation_plan_status: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatus;
  confirmation_token_issuance_operation_plan_available: false;
  confirmation_token_issuance_operation_plan_allowed: false;
  confirmation_token_issuance_operation_plan_label: 'none';
  confirmation_token_issuance_operation_plan_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanDisabledReason;
  confirmation_token_issuance_operation_plan_precondition_met: boolean;
  confirmation_token_issuance_operation_created: false;
  confirmation_token_issuance_operation_queued: false;
  confirmation_token_issuance_operation_executed: false;
  confirmation_token_issuance_operation_result_saved: false;
  confirmation_token_issuance_request_precondition_met: boolean;
  confirmation_token_future_issuance_candidate: boolean;
  confirmation_token_issuance_precondition_met: boolean;
  confirmation_token_preview_precondition_met: false;
} {
  if (requestStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_operation_plan_status: 'blocked_by_policy',
      confirmation_token_issuance_operation_plan_available: false,
      confirmation_token_issuance_operation_plan_allowed: false,
      confirmation_token_issuance_operation_plan_label: 'none',
      confirmation_token_issuance_operation_plan_disabled_reason:
        'blocked_by_policy',
      confirmation_token_issuance_operation_plan_precondition_met: false,
      confirmation_token_issuance_operation_created: false,
      confirmation_token_issuance_operation_queued: false,
      confirmation_token_issuance_operation_executed: false,
      confirmation_token_issuance_operation_result_saved: false,
      confirmation_token_issuance_request_precondition_met: false,
      confirmation_token_future_issuance_candidate: false,
      confirmation_token_issuance_precondition_met: false,
      confirmation_token_preview_precondition_met: false,
    };
  }

  if (requestStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_operation_plan_status: 'payload_not_ready',
      confirmation_token_issuance_operation_plan_available: false,
      confirmation_token_issuance_operation_plan_allowed: false,
      confirmation_token_issuance_operation_plan_label: 'none',
      confirmation_token_issuance_operation_plan_disabled_reason:
        'payload_not_ready',
      confirmation_token_issuance_operation_plan_precondition_met: true,
      confirmation_token_issuance_operation_created: false,
      confirmation_token_issuance_operation_queued: false,
      confirmation_token_issuance_operation_executed: false,
      confirmation_token_issuance_operation_result_saved: false,
      confirmation_token_issuance_request_precondition_met: true,
      confirmation_token_future_issuance_candidate: false,
      confirmation_token_issuance_precondition_met: true,
      confirmation_token_preview_precondition_met: false,
    };
  }

  return {
    confirmation_token_issuance_operation_plan_status:
      'operation_plan_pending_implementation',
    confirmation_token_issuance_operation_plan_available: false,
    confirmation_token_issuance_operation_plan_allowed: false,
    confirmation_token_issuance_operation_plan_label: 'none',
    confirmation_token_issuance_operation_plan_disabled_reason:
      'token_issuance_operation_plan_not_enabled_by_day59',
    confirmation_token_issuance_operation_plan_precondition_met: true,
    confirmation_token_issuance_operation_created: false,
    confirmation_token_issuance_operation_queued: false,
    confirmation_token_issuance_operation_executed: false,
    confirmation_token_issuance_operation_result_saved: false,
    confirmation_token_issuance_request_precondition_met: true,
    confirmation_token_future_issuance_candidate: true,
    confirmation_token_issuance_precondition_met: true,
    confirmation_token_preview_precondition_met: false,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanInput = {},
) {
  const upstreamRequest =
    createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary({
      provider: input.provider,
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const operationPlan =
    mapHermesBusinessPromptConfirmationTokenIssuanceRequestStatusToOperationPlan(
      upstreamRequest.confirmation_token_issuance_request_status,
    );

  return {
    ...upstreamRequest,
    result: 'ok' as const,
    mode: 'hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary' as const,
    runtime: 'local_llm' as const,
    confirmation_token_issuance_operation_plan_mode:
      'dry_run_confirmation_token_issuance_operation_plan_only' as const,
    configured_provider: TOKEN_ISSUANCE_OPERATION_PLAN_PROVIDER,
    upstream_token_issuance_request_mode:
      upstreamRequest.confirmation_token_issuance_request_mode,
    upstream_token_issuance_readiness_mode:
      upstreamRequest.upstream_token_issuance_readiness_mode,
    upstream_token_preview_mode: upstreamRequest.upstream_token_preview_mode,
    upstream_action_readiness_mode:
      upstreamRequest.upstream_action_readiness_mode,
    upstream_ui_metadata_mode: upstreamRequest.upstream_ui_metadata_mode,
    upstream_review_mode: upstreamRequest.upstream_review_mode,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_operation_plan.v0' as const,
    source_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_request.v0' as const,
    source_token_issuance_readiness_schema_version:
      upstreamRequest.source_schema_version,
    source_token_preview_schema_version:
      upstreamRequest.source_token_preview_schema_version,
    source_action_readiness_schema_version:
      upstreamRequest.source_action_readiness_schema_version,
    source_ui_metadata_schema_version:
      upstreamRequest.source_ui_metadata_schema_version,
    source_review_schema_version: upstreamRequest.source_review_schema_version,
    ...operationPlan,
    confirmation_token_created: false as const,
    confirmation_token_exposed: false as const,
    confirmation_token_saved: false as const,
    confirmation_token_plaintext_created: false as const,
    confirmation_token_plaintext_exposed: false as const,
    confirmation_token_hash_created: false as const,
    confirmation_token_hash_saved: false as const,
    confirmation_token_signature_created: false as const,
    confirmation_token_verified: false as const,
    confirmation_token_expiry_created: false as const,
    confirmation_token_expiry_saved: false as const,
    confirmation_record_created: false as const,
    confirmation_record_saved: false as const,
    confirmation_status_saved: false as const,
    audit_write_allowed: false as const,
    payload_send_allowed: false as const,
    runtime_call_allowed: false as const,
    request_body_created: false as const,
    request_body_sent: false as const,
    prompt_sent: false as const,
    response_body_exposed: false as const,
    confirmation_token_issuance_request_operation_created: false as const,
    confirmation_token_issuance_request_body_created: false as const,
    confirmation_token_issuance_request_body_sent: false as const,
    safe_token_issuance_operation_plan_exposed: true as const,
    safe_token_issuance_request_exposed: true as const,
    safe_token_issuance_readiness_exposed: true as const,
    safe_token_preview_exposed: true as const,
    safe_action_readiness_exposed: true as const,
    safe_ui_metadata_exposed: true as const,
    safe_review_summary_exposed: true as const,
    raw_prompt_exposed: false as const,
    sanitized_prompt_included: false as const,
    business_context_included: false as const,
    proposal_body_included: false as const,
    restricted_domain_data_included: false as const,
    endpoint_value_exposed: false as const,
    model_value_exposed: false as const,
    credentials_exposed: false as const,
    selected_provider: 'mock' as const,
    fallback_provider: 'mock' as const,
    tokens_used: 0 as const,
  };
}

export type HermesBusinessPromptConfirmationTokenIssuanceOperationPlanOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary
  >;
