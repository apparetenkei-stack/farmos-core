import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary,
  mapHermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatusToExecutionGate,
} from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary';

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatusToExecutionGate(
    'operation_plan_pending_implementation',
  ),
  {
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
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatusToExecutionGate(
    'blocked_by_policy',
  ),
  {
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
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceOperationPlanStatusToExecutionGate(
    'payload_not_ready',
  ),
  {
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
  },
);

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary({
    provider: 'business_prompt_confirmation_token_issuance_execution_gate',
    review_status: 'needs_human_review',
    sample: '今日の作業計画を整理して',
  });

assert.equal(output.result, 'ok');
assert.equal(
  output.mode,
  'hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary',
);
assert.equal(output.runtime, 'local_llm');
assert.equal(
  output.confirmation_token_issuance_execution_gate_mode,
  'dry_run_confirmation_token_issuance_execution_gate_only',
);
assert.equal(
  output.configured_provider,
  'business_prompt_confirmation_token_issuance_execution_gate',
);
assert.equal(
  output.schema_version,
  'hermes.business_prompt_confirmation_token_issuance_execution_gate.v0',
);
assert.equal(
  output.source_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_operation_plan.v0',
);
assert.equal(
  output.source_token_issuance_request_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_request.v0',
);
assert.equal(
  output.source_token_issuance_readiness_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_readiness.v0',
);
assert.equal(
  output.source_token_preview_schema_version,
  'hermes.business_prompt_confirmation_token_preview.v0',
);
assert.equal(
  output.source_action_readiness_schema_version,
  'hermes.business_prompt_confirmation_action_readiness.v0',
);
assert.equal(
  output.source_ui_metadata_schema_version,
  'hermes.business_prompt_confirmation_review_ui_metadata.v0',
);
assert.equal(
  output.source_review_schema_version,
  'hermes.business_prompt_confirmation_review.v0',
);

assert.equal(
  output.confirmation_token_issuance_operation_plan_status,
  'operation_plan_pending_implementation',
);
assert.equal(
  output.confirmation_token_issuance_execution_gate_status,
  'execution_gate_pending_implementation',
);
assert.equal(output.confirmation_token_issuance_execution_gate_available, false);
assert.equal(output.confirmation_token_issuance_execution_gate_allowed, false);
assert.equal(output.confirmation_token_issuance_execution_gate_label, 'none');
assert.equal(
  output.confirmation_token_issuance_execution_gate_disabled_reason,
  'token_issuance_execution_gate_not_enabled_by_day60',
);
assert.equal(
  output.confirmation_token_issuance_execution_gate_precondition_met,
  true,
);
assert.equal(output.confirmation_token_issuance_execution_candidate, true);
assert.equal(
  output.confirmation_token_issuance_mutation_gate_open,
  false,
);
assert.equal(output.confirmation_token_issuance_runtime_gate_open, false);
assert.equal(output.confirmation_token_issuance_persistence_gate_open, false);
assert.equal(output.confirmation_token_issuance_audit_gate_open, false);
assert.equal(
  output.confirmation_token_issuance_operation_plan_precondition_met,
  true,
);
assert.equal(output.confirmation_token_issuance_request_precondition_met, true);
assert.equal(output.confirmation_token_future_issuance_candidate, true);
assert.equal(output.confirmation_token_issuance_precondition_met, true);
assert.equal(output.confirmation_token_preview_precondition_met, false);

const blocked =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary({
    review_status: 'blocked_by_policy',
  });

assert.equal(
  blocked.confirmation_token_issuance_execution_gate_status,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_execution_gate_disabled_reason,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_execution_gate_precondition_met,
  false,
);
assert.equal(blocked.confirmation_token_issuance_execution_candidate, false);

const notReady =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary({
    review_status: 'not_ready',
  });

assert.equal(
  notReady.confirmation_token_issuance_execution_gate_status,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_execution_gate_disabled_reason,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_execution_gate_precondition_met,
  true,
);
assert.equal(notReady.confirmation_token_issuance_execution_candidate, false);

const falseKeys = [
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
  'confirmation_token_issuance_request_operation_created',
  'confirmation_token_issuance_request_body_created',
  'confirmation_token_issuance_request_body_sent',
  'confirmation_token_issuance_operation_created',
  'confirmation_token_issuance_operation_queued',
  'confirmation_token_issuance_operation_executed',
  'confirmation_token_issuance_operation_result_saved',
  'confirmation_token_issuance_execution_gate_available',
  'confirmation_token_issuance_execution_gate_allowed',
  'confirmation_token_issuance_mutation_gate_open',
  'confirmation_token_issuance_runtime_gate_open',
  'confirmation_token_issuance_persistence_gate_open',
  'confirmation_token_issuance_audit_gate_open',
] as const;

for (const key of falseKeys) {
  assert.equal(
    (output as Record<string, unknown>)[key],
    false,
    `${key} must remain false`,
  );
}

assert.equal(output.safe_token_issuance_execution_gate_exposed, true);
assert.equal(output.safe_token_issuance_operation_plan_exposed, true);
assert.equal(output.safe_token_issuance_request_exposed, true);
assert.equal(output.safe_token_issuance_readiness_exposed, true);
assert.equal(output.safe_token_preview_exposed, true);
assert.equal(output.safe_action_readiness_exposed, true);
assert.equal(output.safe_ui_metadata_exposed, true);
assert.equal(output.safe_review_summary_exposed, true);
assert.equal(output.raw_prompt_exposed, false);
assert.equal(output.sanitized_prompt_included, false);
assert.equal(output.business_context_included, false);
assert.equal(output.proposal_body_included, false);
assert.equal(output.restricted_domain_data_included, false);
assert.equal(output.endpoint_value_exposed, false);
assert.equal(output.model_value_exposed, false);
assert.equal(output.credentials_exposed, false);
assert.equal(output.selected_provider, 'mock');
assert.equal(output.fallback_provider, 'mock');
assert.equal(output.tokens_used, 0);

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary',
      mappings: {
        operation_plan_pending_implementation:
          'execution_gate_pending_implementation',
        blocked_by_policy: 'blocked_by_policy',
        payload_not_ready: 'payload_not_ready',
      },
      confirmation_token_issuance_execution_gate_available:
        output.confirmation_token_issuance_execution_gate_available,
      confirmation_token_issuance_execution_gate_allowed:
        output.confirmation_token_issuance_execution_gate_allowed,
      confirmation_token_issuance_execution_candidate:
        output.confirmation_token_issuance_execution_candidate,
      confirmation_token_issuance_mutation_gate_open:
        output.confirmation_token_issuance_mutation_gate_open,
      confirmation_token_issuance_runtime_gate_open:
        output.confirmation_token_issuance_runtime_gate_open,
      confirmation_token_issuance_persistence_gate_open:
        output.confirmation_token_issuance_persistence_gate_open,
      confirmation_token_issuance_audit_gate_open:
        output.confirmation_token_issuance_audit_gate_open,
      confirmation_token_created: output.confirmation_token_created,
      confirmation_token_hash_created: output.confirmation_token_hash_created,
      confirmation_record_saved: output.confirmation_record_saved,
      audit_write_allowed: output.audit_write_allowed,
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
