import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary } from './hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary';

type HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary
  >;

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatus =
  | 'result_plan_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanDisabledReason =
  | 'token_issuance_execution_result_plan_not_enabled_by_day63'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanInput =
  Parameters<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary
  >[0] & {
    provider?: string;
  };

const TOKEN_ISSUANCE_EXECUTION_RESULT_PLAN_PROVIDER =
  'business_prompt_confirmation_token_issuance_execution_result_plan' as const;

export function mapHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeStatusToExecutionResultPlan(
  requestEnvelopeStatus: HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundaryOutput['confirmation_token_issuance_execution_request_envelope_status'],
): {
  confirmation_token_issuance_execution_result_plan_status: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatus;
  confirmation_token_issuance_execution_result_plan_available: false;
  confirmation_token_issuance_execution_result_plan_allowed: false;
  confirmation_token_issuance_execution_result_plan_label: 'none';
  confirmation_token_issuance_execution_result_plan_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanDisabledReason;
  confirmation_token_issuance_execution_result_plan_precondition_met: boolean;
} {
  if (requestEnvelopeStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_execution_result_plan_status:
        'blocked_by_policy',
      confirmation_token_issuance_execution_result_plan_available: false,
      confirmation_token_issuance_execution_result_plan_allowed: false,
      confirmation_token_issuance_execution_result_plan_label: 'none',
      confirmation_token_issuance_execution_result_plan_disabled_reason:
        'blocked_by_policy',
      confirmation_token_issuance_execution_result_plan_precondition_met:
        false,
    };
  }

  if (requestEnvelopeStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_execution_result_plan_status:
        'payload_not_ready',
      confirmation_token_issuance_execution_result_plan_available: false,
      confirmation_token_issuance_execution_result_plan_allowed: false,
      confirmation_token_issuance_execution_result_plan_label: 'none',
      confirmation_token_issuance_execution_result_plan_disabled_reason:
        'payload_not_ready',
      confirmation_token_issuance_execution_result_plan_precondition_met:
        true,
    };
  }

  return {
    confirmation_token_issuance_execution_result_plan_status:
      'result_plan_pending_implementation',
    confirmation_token_issuance_execution_result_plan_available: false,
    confirmation_token_issuance_execution_result_plan_allowed: false,
    confirmation_token_issuance_execution_result_plan_label: 'none',
    confirmation_token_issuance_execution_result_plan_disabled_reason:
      'token_issuance_execution_result_plan_not_enabled_by_day63',
    confirmation_token_issuance_execution_result_plan_precondition_met:
      true,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanInput = {},
) {
  const upstreamRequestEnvelope =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary({
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const resultPlan =
    mapHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeStatusToExecutionResultPlan(
      upstreamRequestEnvelope.confirmation_token_issuance_execution_request_envelope_status,
    );

  return {
    ...upstreamRequestEnvelope,
    result: 'ok' as const,
    mode: 'hermes_business_prompt_confirmation_token_issuance_execution_result_plan_boundary' as const,
    runtime: 'local_llm' as const,
    confirmation_token_issuance_execution_result_plan_mode:
      'dry_run_confirmation_token_issuance_execution_result_plan_only' as const,
    configured_provider: TOKEN_ISSUANCE_EXECUTION_RESULT_PLAN_PROVIDER,
    upstream_execution_request_envelope_mode:
      upstreamRequestEnvelope.confirmation_token_issuance_execution_request_envelope_mode,
    upstream_execution_request_envelope_configured_provider:
      upstreamRequestEnvelope.configured_provider,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_result_plan.v0' as const,
    source_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_request_envelope.v0' as const,
    source_token_issuance_execution_request_envelope_schema_version:
      upstreamRequestEnvelope.schema_version,
    source_token_issuance_execution_policy_schema_version:
      upstreamRequestEnvelope.source_schema_version,
    source_token_issuance_execution_gate_schema_version:
      upstreamRequestEnvelope.source_token_issuance_execution_gate_schema_version,
    source_token_issuance_operation_plan_schema_version:
      upstreamRequestEnvelope.source_token_issuance_operation_plan_schema_version,
    source_token_issuance_request_schema_version:
      upstreamRequestEnvelope.source_token_issuance_request_schema_version,
    source_token_issuance_readiness_schema_version:
      upstreamRequestEnvelope.source_token_issuance_readiness_schema_version,
    source_token_preview_schema_version:
      upstreamRequestEnvelope.source_token_preview_schema_version,
    ...resultPlan,
    confirmation_token_issuance_execution_result_created: false as const,
    confirmation_token_issuance_execution_result_saved: false as const,
    confirmation_token_issuance_execution_result_audit_record_created:
      false as const,
    confirmation_token_issuance_execution_result_audit_record_saved:
      false as const,
    confirmation_token_issuance_execution_status_saved: false as const,
    confirmation_token_issuance_execution_request_envelope_body_created:
      false as const,
    confirmation_token_issuance_execution_request_envelope_body_sent:
      false as const,
    confirmation_token_issuance_execution_request_envelope_operation_created:
      false as const,
    confirmation_token_issuance_mutation_gate_open: false as const,
    confirmation_token_issuance_runtime_gate_open: false as const,
    confirmation_token_issuance_persistence_gate_open: false as const,
    confirmation_token_issuance_audit_gate_open: false as const,
    confirmation_token_issuance_execution_gate_available: false as const,
    confirmation_token_issuance_execution_gate_allowed: false as const,
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
    confirmation_token_issuance_operation_created: false as const,
    confirmation_token_issuance_operation_queued: false as const,
    confirmation_token_issuance_operation_executed: false as const,
    confirmation_token_issuance_operation_result_saved: false as const,
    safe_token_issuance_execution_result_plan_exposed: true as const,
    safe_token_issuance_execution_request_envelope_exposed:
      upstreamRequestEnvelope.safe_token_issuance_execution_request_envelope_exposed,
    safe_token_issuance_execution_policy_exposed:
      upstreamRequestEnvelope.safe_token_issuance_execution_policy_exposed,
    safe_token_issuance_execution_gate_exposed:
      upstreamRequestEnvelope.safe_token_issuance_execution_gate_exposed,
    safe_token_issuance_operation_plan_exposed:
      upstreamRequestEnvelope.safe_token_issuance_operation_plan_exposed,
    safe_token_issuance_request_exposed:
      upstreamRequestEnvelope.safe_token_issuance_request_exposed,
    safe_token_issuance_readiness_exposed:
      upstreamRequestEnvelope.safe_token_issuance_readiness_exposed,
    safe_token_preview_exposed:
      upstreamRequestEnvelope.safe_token_preview_exposed,
    safe_action_readiness_exposed:
      upstreamRequestEnvelope.safe_action_readiness_exposed,
    safe_ui_metadata_exposed: upstreamRequestEnvelope.safe_ui_metadata_exposed,
    safe_review_summary_exposed:
      upstreamRequestEnvelope.safe_review_summary_exposed,
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

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary
  >;
