import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary } from './hermes_business_prompt_confirmation_token_issuance_execution_result_plan_boundary';

type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundaryOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary
  >;

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditStatus =
  | 'result_audit_pending_implementation'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditDisabledReason =
  | 'token_issuance_execution_result_audit_not_enabled_by_day64'
  | 'blocked_by_policy'
  | 'payload_not_ready';

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditInput = {
  provider?: string;
  review_status?: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundaryOutput['review_status'];
  confirmation_state?: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundaryOutput['confirmation_state'];
  confirmation_result?: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundaryOutput['confirmation_result'];
  sample?: string;
};

const TOKEN_ISSUANCE_EXECUTION_RESULT_AUDIT_PROVIDER =
  'business_prompt_confirmation_token_issuance_execution_result_audit' as const;

export function mapHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatusToResultAudit(
  resultPlanStatus: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundaryOutput['confirmation_token_issuance_execution_result_plan_status'],
): {
  confirmation_token_issuance_execution_result_audit_status: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditStatus;
  confirmation_token_issuance_execution_result_audit_available: false;
  confirmation_token_issuance_execution_result_audit_allowed: false;
  confirmation_token_issuance_execution_result_audit_label: 'none';
  confirmation_token_issuance_execution_result_audit_disabled_reason: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditDisabledReason;
  confirmation_token_issuance_execution_result_audit_precondition_met: boolean;
  confirmation_token_issuance_execution_result_audit_record_created: false;
  confirmation_token_issuance_execution_result_audit_record_saved: false;
  confirmation_token_issuance_execution_result_audit_write_allowed: false;
  confirmation_token_issuance_execution_status_saved: false;
} {
  if (resultPlanStatus === 'blocked_by_policy') {
    return {
      confirmation_token_issuance_execution_result_audit_status:
        'blocked_by_policy',
      confirmation_token_issuance_execution_result_audit_available: false,
      confirmation_token_issuance_execution_result_audit_allowed: false,
      confirmation_token_issuance_execution_result_audit_label: 'none',
      confirmation_token_issuance_execution_result_audit_disabled_reason:
        'blocked_by_policy',
      confirmation_token_issuance_execution_result_audit_precondition_met: false,
      confirmation_token_issuance_execution_result_audit_record_created: false,
      confirmation_token_issuance_execution_result_audit_record_saved: false,
      confirmation_token_issuance_execution_result_audit_write_allowed: false,
      confirmation_token_issuance_execution_status_saved: false,
    };
  }

  if (resultPlanStatus === 'payload_not_ready') {
    return {
      confirmation_token_issuance_execution_result_audit_status:
        'payload_not_ready',
      confirmation_token_issuance_execution_result_audit_available: false,
      confirmation_token_issuance_execution_result_audit_allowed: false,
      confirmation_token_issuance_execution_result_audit_label: 'none',
      confirmation_token_issuance_execution_result_audit_disabled_reason:
        'payload_not_ready',
      confirmation_token_issuance_execution_result_audit_precondition_met: true,
      confirmation_token_issuance_execution_result_audit_record_created: false,
      confirmation_token_issuance_execution_result_audit_record_saved: false,
      confirmation_token_issuance_execution_result_audit_write_allowed: false,
      confirmation_token_issuance_execution_status_saved: false,
    };
  }

  return {
    confirmation_token_issuance_execution_result_audit_status:
      'result_audit_pending_implementation',
    confirmation_token_issuance_execution_result_audit_available: false,
    confirmation_token_issuance_execution_result_audit_allowed: false,
    confirmation_token_issuance_execution_result_audit_label: 'none',
    confirmation_token_issuance_execution_result_audit_disabled_reason:
      'token_issuance_execution_result_audit_not_enabled_by_day64',
    confirmation_token_issuance_execution_result_audit_precondition_met: true,
    confirmation_token_issuance_execution_result_audit_record_created: false,
    confirmation_token_issuance_execution_result_audit_record_saved: false,
    confirmation_token_issuance_execution_result_audit_write_allowed: false,
    confirmation_token_issuance_execution_status_saved: false,
  };
}

export function createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditBoundary(
  input: HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditInput = {},
) {
  const upstreamResultPlan =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary(
      input,
    );

  const resultAudit =
    mapHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatusToResultAudit(
      upstreamResultPlan.confirmation_token_issuance_execution_result_plan_status,
    );

  return {
    ...upstreamResultPlan,
    result: 'ok',
    mode: 'hermes_business_prompt_confirmation_token_issuance_execution_result_audit_boundary',
    runtime: 'local_llm',
    confirmation_token_issuance_execution_result_audit_mode:
      'dry_run_confirmation_token_issuance_execution_result_audit_only',
    configured_provider: TOKEN_ISSUANCE_EXECUTION_RESULT_AUDIT_PROVIDER,
    upstream_execution_result_plan_mode: upstreamResultPlan.mode,
    schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_result_audit.v0',
    source_schema_version:
      'hermes.business_prompt_confirmation_token_issuance_execution_result_plan.v0',
    source_execution_result_plan_schema_version:
      upstreamResultPlan.schema_version,
    ...resultAudit,
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
    payload_send_allowed: false,
    runtime_call_allowed: false,
    request_body_created: false,
    request_body_sent: false,
    prompt_sent: false,
    response_body_exposed: false,
    confirmation_token_issuance_execution_result_created: false,
    confirmation_token_issuance_execution_result_saved: false,
    safe_token_issuance_execution_result_audit_exposed: true,
    safe_token_issuance_execution_result_plan_exposed:
      upstreamResultPlan.safe_token_issuance_execution_result_plan_exposed,
    safe_token_issuance_execution_request_envelope_exposed:
      upstreamResultPlan.safe_token_issuance_execution_request_envelope_exposed,
    safe_token_issuance_execution_policy_exposed:
      upstreamResultPlan.safe_token_issuance_execution_policy_exposed,
    safe_token_issuance_execution_gate_exposed:
      upstreamResultPlan.safe_token_issuance_execution_gate_exposed,
    safe_token_issuance_operation_plan_exposed:
      upstreamResultPlan.safe_token_issuance_operation_plan_exposed,
    safe_token_issuance_request_exposed:
      upstreamResultPlan.safe_token_issuance_request_exposed,
    safe_token_issuance_readiness_exposed:
      upstreamResultPlan.safe_token_issuance_readiness_exposed,
    safe_token_preview_exposed: upstreamResultPlan.safe_token_preview_exposed,
    safe_action_readiness_exposed:
      upstreamResultPlan.safe_action_readiness_exposed,
    safe_ui_metadata_exposed: upstreamResultPlan.safe_ui_metadata_exposed,
    safe_review_summary_exposed: upstreamResultPlan.safe_review_summary_exposed,
    selected_provider: 'mock' as const,
    fallback_provider: 'mock' as const,
    tokens_used: 0 as const,
  };
}

export type HermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditOutput =
  ReturnType<
    typeof createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditBoundary
  >;
