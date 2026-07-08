import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary,
  mapHermesBusinessPromptConfirmationTokenIssuanceRequestStatusToOperationPlan,
} from './api_boundary/hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary';

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceRequestStatusToOperationPlan(
    'request_pending_implementation',
  ),
  {
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
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceRequestStatusToOperationPlan(
    'blocked_by_policy',
  ),
  {
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
  },
);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationTokenIssuanceRequestStatusToOperationPlan(
    'payload_not_ready',
  ),
  {
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
  },
);

const output =
  createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary({
    provider: 'business_prompt_confirmation_token_issuance_operation_plan',
    review_status: 'needs_human_review',
    sample: '今日の作業計画を整理して',
  });

assert.equal(output.result, 'ok');
assert.equal(
  output.mode,
  'hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary',
);
assert.equal(output.runtime, 'local_llm');
assert.equal(
  output.confirmation_token_issuance_operation_plan_mode,
  'dry_run_confirmation_token_issuance_operation_plan_only',
);
assert.equal(
  output.configured_provider,
  'business_prompt_confirmation_token_issuance_operation_plan',
);
assert.equal(
  output.schema_version,
  'hermes.business_prompt_confirmation_token_issuance_operation_plan.v0',
);
assert.equal(
  output.source_schema_version,
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
  output.confirmation_token_issuance_request_status,
  'request_pending_implementation',
);
assert.equal(
  output.confirmation_token_issuance_operation_plan_status,
  'operation_plan_pending_implementation',
);
assert.equal(output.confirmation_token_issuance_operation_plan_available, false);
assert.equal(output.confirmation_token_issuance_operation_plan_allowed, false);
assert.equal(output.confirmation_token_issuance_operation_plan_label, 'none');
assert.equal(
  output.confirmation_token_issuance_operation_plan_disabled_reason,
  'token_issuance_operation_plan_not_enabled_by_day59',
);
assert.equal(
  output.confirmation_token_issuance_operation_plan_precondition_met,
  true,
);
assert.equal(output.confirmation_token_issuance_request_precondition_met, true);
assert.equal(output.confirmation_token_future_issuance_candidate, true);
assert.equal(output.confirmation_token_issuance_precondition_met, true);
assert.equal(output.confirmation_token_preview_precondition_met, false);

const blocked =
  createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary({
    review_status: 'blocked_by_policy',
  });

assert.equal(
  blocked.confirmation_token_issuance_operation_plan_status,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_operation_plan_disabled_reason,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_operation_plan_precondition_met,
  false,
);

const notReady =
  createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary({
    review_status: 'not_ready',
  });

assert.equal(
  notReady.confirmation_token_issuance_operation_plan_status,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_operation_plan_disabled_reason,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_operation_plan_precondition_met,
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
] as const;

for (const key of falseKeys) {
  assert.equal(
    (output as Record<string, unknown>)[key],
    false,
    `${key} must remain false`,
  );
}

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
        'hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary',
      mappings: {
        request_pending_implementation:
          'operation_plan_pending_implementation',
        blocked_by_policy: 'blocked_by_policy',
        payload_not_ready: 'payload_not_ready',
      },
      confirmation_token_issuance_operation_plan_available:
        output.confirmation_token_issuance_operation_plan_available,
      confirmation_token_issuance_operation_plan_allowed:
        output.confirmation_token_issuance_operation_plan_allowed,
      confirmation_token_issuance_operation_created:
        output.confirmation_token_issuance_operation_created,
      confirmation_token_issuance_operation_executed:
        output.confirmation_token_issuance_operation_executed,
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
