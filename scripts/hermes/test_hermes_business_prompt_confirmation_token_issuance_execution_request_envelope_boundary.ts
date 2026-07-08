import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary,
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatusToExecutionRequestEnvelope,
} from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary';

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatusToExecutionRequestEnvelope(
    'execution_policy_pending_implementation',
  ),
  {
    confirmation_token_issuance_execution_request_envelope_status:
      'request_envelope_pending_implementation',
    confirmation_token_issuance_execution_request_envelope_available: false,
    confirmation_token_issuance_execution_request_envelope_allowed: false,
    confirmation_token_issuance_execution_request_envelope_label: 'none',
    confirmation_token_issuance_execution_request_envelope_disabled_reason:
      'token_issuance_execution_request_envelope_not_enabled_by_day62',
    confirmation_token_issuance_execution_request_envelope_precondition_met:
      true,
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatusToExecutionRequestEnvelope(
    'blocked_by_policy',
  ),
  {
    confirmation_token_issuance_execution_request_envelope_status:
      'blocked_by_policy',
    confirmation_token_issuance_execution_request_envelope_available: false,
    confirmation_token_issuance_execution_request_envelope_allowed: false,
    confirmation_token_issuance_execution_request_envelope_label: 'none',
    confirmation_token_issuance_execution_request_envelope_disabled_reason:
      'blocked_by_policy',
    confirmation_token_issuance_execution_request_envelope_precondition_met:
      false,
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceExecutionPolicyStatusToExecutionRequestEnvelope(
    'payload_not_ready',
  ),
  {
    confirmation_token_issuance_execution_request_envelope_status:
      'payload_not_ready',
    confirmation_token_issuance_execution_request_envelope_available: false,
    confirmation_token_issuance_execution_request_envelope_allowed: false,
    confirmation_token_issuance_execution_request_envelope_label: 'none',
    confirmation_token_issuance_execution_request_envelope_disabled_reason:
      'payload_not_ready',
    confirmation_token_issuance_execution_request_envelope_precondition_met:
      true,
  },
);

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary({
    provider:
      'business_prompt_confirmation_token_issuance_execution_request_envelope',
    review_status: 'needs_human_review',
  });

assert.equal(output.result, 'ok');
assert.equal(
  output.mode,
  'hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary',
);
assert.equal(output.runtime, 'local_llm');
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_mode,
  'dry_run_confirmation_token_issuance_execution_request_envelope_only',
);
assert.equal(
  output.configured_provider,
  'business_prompt_confirmation_token_issuance_execution_request_envelope',
);
assert.equal(
  output.upstream_execution_policy_mode,
  'dry_run_confirmation_token_issuance_execution_policy_only',
);
assert.equal(
  output.upstream_execution_policy_configured_provider,
  'business_prompt_confirmation_token_issuance_execution_policy',
);
assert.equal(
  output.schema_version,
  'hermes.business_prompt_confirmation_token_issuance_execution_request_envelope.v0',
);
assert.equal(
  output.source_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_execution_policy.v0',
);
assert.equal(
  output.source_token_issuance_execution_gate_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_execution_gate.v0',
);

assert.equal(
  output.confirmation_token_issuance_execution_policy_status,
  'execution_policy_pending_implementation',
);
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_status,
  'request_envelope_pending_implementation',
);
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_available,
  false,
);
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_allowed,
  false,
);
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_label,
  'none',
);
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_disabled_reason,
  'token_issuance_execution_request_envelope_not_enabled_by_day62',
);
assert.equal(
  output.confirmation_token_issuance_execution_request_envelope_precondition_met,
  true,
);

const blocked =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary({
    review_status: 'blocked_by_policy',
  });

assert.equal(
  blocked.confirmation_token_issuance_execution_request_envelope_status,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_execution_request_envelope_disabled_reason,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_execution_request_envelope_precondition_met,
  false,
);

const notReady =
  createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary({
    review_status: 'not_ready',
  });

assert.equal(
  notReady.confirmation_token_issuance_execution_request_envelope_status,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_execution_request_envelope_disabled_reason,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_execution_request_envelope_precondition_met,
  true,
);

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
  'confirmation_token_issuance_execution_policy_available',
  'confirmation_token_issuance_execution_policy_allowed',
  'confirmation_token_issuance_execution_request_envelope_available',
  'confirmation_token_issuance_execution_request_envelope_allowed',
  'confirmation_token_issuance_execution_request_envelope_body_created',
  'confirmation_token_issuance_execution_request_envelope_body_sent',
  'confirmation_token_issuance_execution_request_envelope_operation_created',
] as const;

for (const candidate of [output, blocked, notReady]) {
  for (const key of falseKeys) {
    assert.equal(
      (candidate as Record<string, unknown>)[key],
      false,
      `${key} must remain false`,
    );
  }

  assert.equal(
    candidate.safe_token_issuance_execution_request_envelope_exposed,
    true,
  );
  assert.equal(candidate.safe_token_issuance_execution_policy_exposed, true);
  assert.equal(candidate.safe_token_issuance_execution_gate_exposed, true);
  assert.equal(candidate.safe_token_issuance_operation_plan_exposed, true);
  assert.equal(candidate.safe_token_issuance_request_exposed, true);
  assert.equal(candidate.safe_token_issuance_readiness_exposed, true);
  assert.equal(candidate.safe_token_preview_exposed, true);
  assert.equal(candidate.safe_action_readiness_exposed, true);
  assert.equal(candidate.safe_ui_metadata_exposed, true);
  assert.equal(candidate.safe_review_summary_exposed, true);
  assert.equal(candidate.raw_prompt_exposed, false);
  assert.equal(candidate.sanitized_prompt_included, false);
  assert.equal(candidate.business_context_included, false);
  assert.equal(candidate.proposal_body_included, false);
  assert.equal(candidate.restricted_domain_data_included, false);
  assert.equal(candidate.endpoint_value_exposed, false);
  assert.equal(candidate.model_value_exposed, false);
  assert.equal(candidate.credentials_exposed, false);
  assert.equal(candidate.selected_provider, 'mock');
  assert.equal(candidate.fallback_provider, 'mock');
  assert.equal(candidate.tokens_used, 0);
}

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary',
      mappings: {
        pending:
          output.confirmation_token_issuance_execution_request_envelope_status,
        blocked_by_policy:
          blocked.confirmation_token_issuance_execution_request_envelope_status,
        payload_not_ready:
          notReady.confirmation_token_issuance_execution_request_envelope_status,
      },
      safe_token_issuance_execution_request_envelope_exposed:
        output.safe_token_issuance_execution_request_envelope_exposed,
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
