import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary } from './hermes_business_prompt_confirmation_token_issuance_execution_policy_boundary';

type HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary
  >;

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeStatus =
  | 'request_envelope_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeDisabledReason =
  | 'token_issuance_execution_request_envelope_not_enabled_by_day62'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeInput =
  Parameters<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary
  >[0] & {
    provider?: string;
  };

const TOKEN_ISSUANCE_EXECUTION_REQUEST_ENVELOPE_PROVIDER =
  'business_prompt_confirmation_token_issuance_execution_request_envelope' as const;

export function mapHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatusToExecutionRequestEnvelope(
  executionPolicyStatus: HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundaryOutput['confirmation_token_issuance_execution_policy_status'],
): {
  confirmation_token_issuance_execution_request_envelope_status: HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeStatus;
  confirmation_token_issuance_execution_request_envelope_available: false;
  confirmation_token_issuance_execution_request_envelope_allowed: false;
  confirmation_token_issuance_execution_request_envelope_label: 'none';
  confirmation_token_issuance_execution_request_envelope_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeDisabledReason;
  confirmation_token_issuance_execution_request_envelope_precondition_met: boolean;
} {
  if (executionPolicyStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_execution_request_envelope_status:
        'blocked_by_policy',
      confirmation_token_issuance_execution_request_envelope_available: false,
      confirmation_token_issuance_execution_request_envelope_allowed: false,
      confirmation_token_issuance_execution_request_envelope_label: 'none',
      confirmation_token_issuance_execution_request_envelope_disabled_reason:
        'blocked_by_policy',
      confirmation_token_issuance_execution_request_envelope_precondition_met:
        false,
    };
  }

  if (executionPolicyStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_execution_request_envelope_status:
        'payload_not_ready',
      confirmation_token_issuance_execution_request_envelope_available: false,
      confirmation_token_issuance_execution_request_envelope_allowed: false,
      confirmation_token_issuance_execution_request_envelope_label: 'none',
      confirmation_token_issuance_execution_request_envelope_disabled_reason:
        'payload_not_ready',
      confirmation_token_issuance_execution_request_envelope_precondition_met:
        true,
    };
  }

  return {
    confirmation_token_issuance_execution_request_envelope_status:
      'request_envelope_pending_implementation',
    confirmation_token_issuance_execution_request_envelope_available: false,
    confirmation_token_issuance_execution_request_envelope_allowed: false,
    confirmation_token_issuance_execution_request_envelope_label: 'none',
    confirmation_token_issuance_execution_request_envelope_disabled_reason:
      'token_issuance_execution_request_envelope_not_enabled_by_day62',
    confirmation_token_issuance_execution_request_envelope_precondition_met:
      true,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeInput = {},
) {
  const upstreamExecutionPolicy =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary({
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const requestEnvelope =
    mapHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatusToExecutionRequestEnvelope(
      upstreamExecutionPolicy.confirmation_token_issuance_execution_policy_status,
    );

  return {
    ...upstreamExecutionPolicy,
    result: 'ok' as const,
    mode: 'hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary' as const,
    runtime: 'local_llm' as const,
    confirmation_token_issuance_execution_request_envelope_mode:
      'dry_run_confirmation_token_issuance_execution_request_envelope_only' as const,
    configured_provider: TOKEN_ISSUANCE_EXECUTION_REQUEST_ENVELOPE_PROVIDER,
    upstream_execution_policy_mode:
      upstreamExecutionPolicy.confirmation_token_issuance_execution_policy_mode,
    upstream_execution_policy_configured_provider:
      upstreamExecutionPolicy.configured_provider,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_request_envelope.v0' as const,
    source_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_policy.v0' as const,
    source_token_issuance_execution_gate_schema_version:
      upstreamExecutionPolicy.source_schema_version,
    source_token_issuance_operation_plan_schema_version:
      upstreamExecutionPolicy.source_token_issuance_operation_plan_schema_version,
    source_token_issuance_request_schema_version:
      upstreamExecutionPolicy.source_token_issuance_request_schema_version,
    source_token_issuance_readiness_schema_version:
      upstreamExecutionPolicy.source_token_issuance_readiness_schema_version,
    source_token_preview_schema_version:
      upstreamExecutionPolicy.source_token_preview_schema_version,
    ...requestEnvelope,
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
    safe_token_issuance_execution_request_envelope_exposed: true as const,
    safe_token_issuance_execution_policy_exposed:
      upstreamExecutionPolicy.safe_token_issuance_execution_policy_exposed,
    safe_token_issuance_execution_gate_exposed:
      upstreamExecutionPolicy.safe_token_issuance_execution_gate_exposed,
    safe_token_issuance_operation_plan_exposed:
      upstreamExecutionPolicy.safe_token_issuance_operation_plan_exposed,
    safe_token_issuance_request_exposed:
      upstreamExecutionPolicy.safe_token_issuance_request_exposed,
    safe_token_issuance_readiness_exposed:
      upstreamExecutionPolicy.safe_token_issuance_readiness_exposed,
    safe_token_preview_exposed:
      upstreamExecutionPolicy.safe_token_preview_exposed,
    safe_action_readiness_exposed:
      upstreamExecutionPolicy.safe_action_readiness_exposed,
    safe_ui_metadata_exposed: upstreamExecutionPolicy.safe_ui_metadata_exposed,
    safe_review_summary_exposed:
      upstreamExecutionPolicy.safe_review_summary_exposed,
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

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary
  >;
