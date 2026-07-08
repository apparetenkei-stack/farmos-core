import { createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary } from './hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary';

type HermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary
  >;

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionGateStatus =
  | 'execution_gate_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionGateDisabledReason =
  | 'token_issuance_execution_gate_not_enabled_by_day60'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionGateInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundaryOutput['review_status'];
  confirmation_state?: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundaryOutput['confirmation_state'];
  confirmation_result?: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundaryOutput['confirmation_result'];
  sample?: string;
};

const TOKEN_ISSUANCE_EXECUTION_GATE_PROVIDER =
  'business_prompt_confirmation_token_issuance_execution_gate' as const;

export function mapHermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatusToExecutionGate(
  operationPlanStatus: HermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundaryOutput['confirmation_token_issuance_operation_plan_status'],
): {
  confirmation_token_issuance_execution_gate_status: HermesBusinessPromptConfirmationTokenIssuanceExecutionGateStatus;
  confirmation_token_issuance_execution_gate_available: false;
  confirmation_token_issuance_execution_gate_allowed: false;
  confirmation_token_issuance_execution_gate_label: 'none';
  confirmation_token_issuance_execution_gate_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceExecutionGateDisabledReason;
  confirmation_token_issuance_execution_gate_precondition_met: boolean;
  confirmation_token_issuance_execution_candidate: boolean;
  confirmation_token_issuance_mutation_gate_open: false;
  confirmation_token_issuance_runtime_gate_open: false;
  confirmation_token_issuance_persistence_gate_open: false;
  confirmation_token_issuance_audit_gate_open: false;
  confirmation_token_issuance_operation_plan_precondition_met: boolean;
  confirmation_token_issuance_request_precondition_met: boolean;
  confirmation_token_future_issuance_candidate: boolean;
  confirmation_token_issuance_precondition_met: boolean;
  confirmation_token_preview_precondition_met: false;
} {
  if (operationPlanStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_execution_gate_status: 'blocked_by_policy',
      confirmation_token_issuance_execution_gate_available: false,
      confirmation_token_issuance_execution_gate_allowed: false,
      confirmation_token_issuance_execution_gate_label: 'none',
      confirmation_token_issuance_execution_gate_disabled_reason:
        'blocked_by_policy',
      confirmation_token_issuance_execution_gate_precondition_met: false,
      confirmation_token_issuance_execution_candidate: false,
      confirmation_token_issuance_mutation_gate_open: false,
      confirmation_token_issuance_runtime_gate_open: false,
      confirmation_token_issuance_persistence_gate_open: false,
      confirmation_token_issuance_audit_gate_open: false,
      confirmation_token_issuance_operation_plan_precondition_met: false,
      confirmation_token_issuance_request_precondition_met: false,
      confirmation_token_future_issuance_candidate: false,
      confirmation_token_issuance_precondition_met: false,
      confirmation_token_preview_precondition_met: false,
    };
  }

  if (operationPlanStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_execution_gate_status: 'payload_not_ready',
      confirmation_token_issuance_execution_gate_available: false,
      confirmation_token_issuance_execution_gate_allowed: false,
      confirmation_token_issuance_execution_gate_label: 'none',
      confirmation_token_issuance_execution_gate_disabled_reason:
        'payload_not_ready',
      confirmation_token_issuance_execution_gate_precondition_met: true,
      confirmation_token_issuance_execution_candidate: false,
      confirmation_token_issuance_mutation_gate_open: false,
      confirmation_token_issuance_runtime_gate_open: false,
      confirmation_token_issuance_persistence_gate_open: false,
      confirmation_token_issuance_audit_gate_open: false,
      confirmation_token_issuance_operation_plan_precondition_met: true,
      confirmation_token_issuance_request_precondition_met: true,
      confirmation_token_future_issuance_candidate: false,
      confirmation_token_issuance_precondition_met: true,
      confirmation_token_preview_precondition_met: false,
    };
  }

  return {
    confirmation_token_issuance_execution_gate_status:
      'execution_gate_pending_implementation',
    confirmation_token_issuance_execution_gate_available: false,
    confirmation_token_issuance_execution_gate_allowed: false,
    confirmation_token_issuance_execution_gate_label: 'none',
    confirmation_token_issuance_execution_gate_disabled_reason:
      'token_issuance_execution_gate_not_enabled_by_day60',
    confirmation_token_issuance_execution_gate_precondition_met: true,
    confirmation_token_issuance_execution_candidate: true,
    confirmation_token_issuance_mutation_gate_open: false,
    confirmation_token_issuance_runtime_gate_open: false,
    confirmation_token_issuance_persistence_gate_open: false,
    confirmation_token_issuance_audit_gate_open: false,
    confirmation_token_issuance_operation_plan_precondition_met: true,
    confirmation_token_issuance_request_precondition_met: true,
    confirmation_token_future_issuance_candidate: true,
    confirmation_token_issuance_precondition_met: true,
    confirmation_token_preview_precondition_met: false,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceExecutionGateInput = {},
) {
  const upstreamOperationPlan =
    createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary({
      provider: input.provider,
      review_status: input.review_status,
      confirmation_state: input.confirmation_state,
      confirmation_result: input.confirmation_result,
      sample: input.sample,
    });

  const executionGate =
    mapHermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatusToExecutionGate(
      upstreamOperationPlan.confirmation_token_issuance_operation_plan_status,
    );

  return {
    ...upstreamOperationPlan,
    result: 'ok' as const,
    mode: 'hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary' as const,
    runtime: 'local_llm' as const,
    confirmation_token_issuance_execution_gate_mode:
      'dry_run_confirmation_token_issuance_execution_gate_only' as const,
    configured_provider: TOKEN_ISSUANCE_EXECUTION_GATE_PROVIDER,
    upstream_token_issuance_operation_plan_mode:
      upstreamOperationPlan.confirmation_token_issuance_operation_plan_mode,
    upstream_token_issuance_request_mode:
      upstreamOperationPlan.upstream_token_issuance_request_mode,
    upstream_token_issuance_readiness_mode:
      upstreamOperationPlan.upstream_token_issuance_readiness_mode,
    upstream_token_preview_mode:
      upstreamOperationPlan.upstream_token_preview_mode,
    upstream_action_readiness_mode:
      upstreamOperationPlan.upstream_action_readiness_mode,
    upstream_ui_metadata_mode: upstreamOperationPlan.upstream_ui_metadata_mode,
    upstream_review_mode: upstreamOperationPlan.upstream_review_mode,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_gate.v0' as const,
    source_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_operation_plan.v0' as const,
    source_token_issuance_request_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_request.v0' as const,
    source_token_issuance_readiness_schema_version:
      upstreamOperationPlan.source_token_issuance_readiness_schema_version,
    source_token_preview_schema_version:
      upstreamOperationPlan.source_token_preview_schema_version,
    source_action_readiness_schema_version:
      upstreamOperationPlan.source_action_readiness_schema_version,
    source_ui_metadata_schema_version:
      upstreamOperationPlan.source_ui_metadata_schema_version,
    source_review_schema_version:
      upstreamOperationPlan.source_review_schema_version,
    ...executionGate,
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
    safe_token_issuance_execution_gate_exposed: true as const,
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

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionGateOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary
  >;
