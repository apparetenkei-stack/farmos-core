import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary } from './hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary';

type HermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary
  >;

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatus =
  | 'execution_policy_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyDisabledReason =
  | 'token_issuance_execution_policy_not_enabled_by_day61'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyInput =
  Parameters<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary
  >[0] & {
    provider?: string;
  };

const TOKEN_ISSUANCE_EXECUTION_POLICY_PROVIDER =
  'business_prompt_confirmation_token_issuance_execution_policy' as const;

export function mapHermesBusinessPromptConfirmationTokenIssuanceExecutionGateStatusToExecutionPolicy(
  executionGateStatus: HermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundaryOutput['confirmation_token_issuance_execution_gate_status'],
): {
  confirmation_token_issuance_execution_policy_status: HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatus;
  confirmation_token_issuance_execution_policy_available: false;
  confirmation_token_issuance_execution_policy_allowed: false;
  confirmation_token_issuance_execution_policy_label: 'none';
  confirmation_token_issuance_execution_policy_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyDisabledReason;
  confirmation_token_issuance_execution_policy_precondition_met: boolean;
  confirmation_token_issuance_execution_candidate: boolean;
} {
  if (executionGateStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_execution_policy_status: 'blocked_by_policy',
      confirmation_token_issuance_execution_policy_available: false,
      confirmation_token_issuance_execution_policy_allowed: false,
      confirmation_token_issuance_execution_policy_label: 'none',
      confirmation_token_issuance_execution_policy_disabled_reason:
        'blocked_by_policy',
      confirmation_token_issuance_execution_policy_precondition_met: false,
      confirmation_token_issuance_execution_candidate: false,
    };
  }

  if (executionGateStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_execution_policy_status: 'payload_not_ready',
      confirmation_token_issuance_execution_policy_available: false,
      confirmation_token_issuance_execution_policy_allowed: false,
      confirmation_token_issuance_execution_policy_label: 'none',
      confirmation_token_issuance_execution_policy_disabled_reason:
        'payload_not_ready',
      confirmation_token_issuance_execution_policy_precondition_met: true,
      confirmation_token_issuance_execution_candidate: false,
    };
  }

  return {
    confirmation_token_issuance_execution_policy_status:
      'execution_policy_pending_implementation',
    confirmation_token_issuance_execution_policy_available: false,
    confirmation_token_issuance_execution_policy_allowed: false,
    confirmation_token_issuance_execution_policy_label: 'none',
    confirmation_token_issuance_execution_policy_disabled_reason:
      'token_issuance_execution_policy_not_enabled_by_day61',
    confirmation_token_issuance_execution_policy_precondition_met: true,
    confirmation_token_issuance_execution_candidate: true,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyInput = {},
) {
  const upstreamExecutionGate =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary({
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const executionPolicy =
    mapHermesBusinessPromptConfirmationTokenIssuanceExecutionGateStatusToExecutionPolicy(
      upstreamExecutionGate.confirmation_token_issuance_execution_gate_status,
    );

  return {
    ...upstreamExecutionGate,
    result: 'ok' as const,
    mode: 'hermes_business_prompt_confirmation_token_issuance_execution_policy_boundary' as const,
    runtime: 'local_llm' as const,
    confirmation_token_issuance_execution_policy_mode:
      'dry_run_confirmation_token_issuance_execution_policy_only' as const,
    configured_provider: TOKEN_ISSUANCE_EXECUTION_POLICY_PROVIDER,
    upstream_execution_gate_mode:
      upstreamExecutionGate.confirmation_token_issuance_execution_gate_mode,
    upstream_execution_gate_configured_provider:
      upstreamExecutionGate.configured_provider,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_policy.v0' as const,
    source_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_gate.v0' as const,
    source_token_issuance_operation_plan_schema_version:
      upstreamExecutionGate.source_schema_version,
    source_token_issuance_request_schema_version:
      upstreamExecutionGate.source_token_issuance_request_schema_version,
    source_token_issuance_readiness_schema_version:
      upstreamExecutionGate.source_token_issuance_readiness_schema_version,
    source_token_preview_schema_version:
      upstreamExecutionGate.source_token_preview_schema_version,
    ...executionPolicy,
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
    safe_token_issuance_execution_policy_exposed: true as const,
    safe_token_issuance_execution_gate_exposed:
      upstreamExecutionGate.safe_token_issuance_execution_gate_exposed,
    safe_token_issuance_operation_plan_exposed:
      upstreamExecutionGate.safe_token_issuance_operation_plan_exposed,
    safe_token_issuance_request_exposed:
      upstreamExecutionGate.safe_token_issuance_request_exposed,
    safe_token_issuance_readiness_exposed:
      upstreamExecutionGate.safe_token_issuance_readiness_exposed,
    safe_token_preview_exposed:
      upstreamExecutionGate.safe_token_preview_exposed,
    safe_action_readiness_exposed:
      upstreamExecutionGate.safe_action_readiness_exposed,
    safe_ui_metadata_exposed: upstreamExecutionGate.safe_ui_metadata_exposed,
    safe_review_summary_exposed:
      upstreamExecutionGate.safe_review_summary_exposed,
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

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyBoundary
  >;
