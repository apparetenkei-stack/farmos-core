import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditBoundary,
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatusToResultAudit,
} from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_result_audit_boundary';

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatusToResultAudit(
    'result_plan_pending_implementation',
  ),
  {
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
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatusToResultAudit(
    'blocked_by_policy',
  ),
  {
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
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanStatusToResultAudit(
    'payload_not_ready',
  ),
  {
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
  },
);

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultAuditBoundary(
    {
      provider:
        'business_prompt_confirmation_token_issuance_execution_result_audit',
      sample: '今日の作業計画を整理して',
    },
  );

assert.equal(output.result, 'ok');
assert.equal(
  output.mode,
  'hermes_business_prompt_confirmation_token_issuance_execution_result_audit_boundary',
);
assert.equal(output.runtime, 'local_llm');
assert.equal(
  output.schema_version,
  'hermes.business_prompt_confirmation_token_issuance_execution_result_audit.v0',
);
assert.equal(
  output.source_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_execution_result_plan.v0',
);
assert.equal(
  output.confirmation_token_issuance_execution_result_audit_status,
  'result_audit_pending_implementation',
);
assert.equal(
  output.confirmation_token_issuance_execution_result_audit_available,
  false,
);
assert.equal(
  output.confirmation_token_issuance_execution_result_audit_allowed,
  false,
);
assert.equal(
  output.confirmation_token_issuance_execution_result_audit_disabled_reason,
  'token_issuance_execution_result_audit_not_enabled_by_day64',
);
assert.equal(
  output.confirmation_token_issuance_execution_result_audit_precondition_met,
  true,
);

const falseFlags = [
  'confirmation_token_created',
  'confirmation_token_exposed',
  'confirmation_token_saved',
  'confirmation_token_plaintext_created',
  'confirmation_token_plaintext_exposed',
  'confirmation_token_hash_created',
  'confirmation_token_hash_saved',
  'confirmation_token_signature_created',
  'confirmation_token_verified',
  'confirmation_token_expiry_created',
  'confirmation_token_expiry_saved',
  'confirmation_record_created',
  'confirmation_record_saved',
  'confirmation_status_saved',
  'audit_write_allowed',
  'payload_send_allowed',
  'runtime_call_allowed',
  'request_body_created',
  'request_body_sent',
  'prompt_sent',
  'response_body_exposed',
  'confirmation_token_issuance_execution_result_created',
  'confirmation_token_issuance_execution_result_saved',
  'confirmation_token_issuance_execution_result_audit_record_created',
  'confirmation_token_issuance_execution_result_audit_record_saved',
  'confirmation_token_issuance_execution_result_audit_write_allowed',
  'confirmation_token_issuance_execution_status_saved',
] as const;

for (const flag of falseFlags) {
  assert.equal(output[flag], false, `${flag} must remain false`);
}

const trueSafeFlags = [
  'safe_token_issuance_execution_result_audit_exposed',
  'safe_token_issuance_execution_result_plan_exposed',
  'safe_token_issuance_execution_request_envelope_exposed',
  'safe_token_issuance_execution_policy_exposed',
  'safe_token_issuance_execution_gate_exposed',
  'safe_token_issuance_operation_plan_exposed',
  'safe_token_issuance_request_exposed',
  'safe_token_issuance_readiness_exposed',
  'safe_token_preview_exposed',
  'safe_action_readiness_exposed',
  'safe_ui_metadata_exposed',
  'safe_review_summary_exposed',
] as const;

for (const flag of trueSafeFlags) {
  assert.equal(output[flag], true, `${flag} must remain true`);
}

assert.equal(output.selected_provider, 'mock');
assert.equal(output.fallback_provider, 'mock');
assert.equal(output.tokens_used, 0);
assert.equal(output.raw_prompt_exposed, false);
assert.equal(output.sanitized_prompt_included, false);
assert.equal(output.business_context_included, false);
assert.equal(output.proposal_body_included, false);
assert.equal(output.restricted_domain_data_included, false);
assert.equal(output.endpoint_value_exposed, false);
assert.equal(output.model_value_exposed, false);
assert.equal(output.credentials_exposed, false);

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_business_prompt_confirmation_token_issuance_execution_result_audit_boundary',
      mappings: {
        result_plan_pending_implementation:
          'result_audit_pending_implementation',
        blocked_by_policy: 'blocked_by_policy',
        payload_not_ready: 'payload_not_ready',
      },
      safe_token_issuance_execution_result_audit_exposed:
        output.safe_token_issuance_execution_result_audit_exposed,
      runtime_call_allowed: output.runtime_call_allowed,
      payload_send_allowed: output.payload_send_allowed,
      request_body_created: output.request_body_created,
      prompt_sent: output.prompt_sent,
      tokens_used: output.tokens_used,
    },
    null,
    2,
  ),
);
