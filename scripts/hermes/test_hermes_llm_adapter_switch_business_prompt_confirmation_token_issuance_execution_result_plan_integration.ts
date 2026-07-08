import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAliases,
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_result_plan_boundary';

assert.deepEqual(
  [...hermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAliases],
  [
    'business_prompt_confirmation_token_issuance_execution_result_plan',
    'local_llm_business_prompt_confirmation_token_issuance_execution_result_plan',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAlias(
    'business_prompt_confirmation_token_issuance_execution_result_plan',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAlias(
    'local_llm_business_prompt_confirmation_token_issuance_execution_result_plan',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAlias(
    'mock',
  ),
  false,
);

for (const provider of hermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAliases) {
  const output =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanBoundary({
      provider,
      review_status: 'needs_human_review',
    });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_token_issuance_execution_result_plan_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_token_issuance_execution_result_plan',
  );
  assert.equal(
    output.confirmation_token_issuance_execution_result_plan_status,
    'result_plan_pending_implementation',
  );
  assert.equal(output.confirmation_token_issuance_execution_result_plan_available, false);
  assert.equal(output.confirmation_token_issuance_execution_result_plan_allowed, false);
  assert.equal(output.confirmation_token_issuance_execution_result_created, false);
  assert.equal(output.confirmation_token_issuance_execution_result_saved, false);
  assert.equal(output.confirmation_token_issuance_execution_result_audit_record_created, false);
  assert.equal(output.confirmation_token_issuance_execution_result_audit_record_saved, false);
  assert.equal(output.confirmation_token_issuance_execution_status_saved, false);
  assert.equal(output.confirmation_token_issuance_mutation_gate_open, false);
  assert.equal(output.confirmation_token_issuance_runtime_gate_open, false);
  assert.equal(output.confirmation_token_issuance_persistence_gate_open, false);
  assert.equal(output.confirmation_token_issuance_audit_gate_open, false);
  assert.equal(output.confirmation_token_issuance_operation_created, false);
  assert.equal(output.confirmation_token_issuance_operation_queued, false);
  assert.equal(output.confirmation_token_issuance_operation_executed, false);
  assert.equal(output.confirmation_token_issuance_operation_result_saved, false);
  assert.equal(output.confirmation_token_created, false);
  assert.equal(output.confirmation_token_hash_created, false);
  assert.equal(output.confirmation_token_signature_created, false);
  assert.equal(output.confirmation_token_expiry_created, false);
  assert.equal(output.confirmation_record_created, false);
  assert.equal(output.confirmation_record_saved, false);
  assert.equal(output.confirmation_status_saved, false);
  assert.equal(output.audit_write_allowed, false);
  assert.equal(output.runtime_call_allowed, false);
  assert.equal(output.payload_send_allowed, false);
  assert.equal(output.request_body_created, false);
  assert.equal(output.request_body_sent, false);
  assert.equal(output.prompt_sent, false);
  assert.equal(output.safe_token_issuance_execution_result_plan_exposed, true);
  assert.equal(output.selected_provider, 'mock');
  assert.equal(output.fallback_provider, 'mock');
  assert.equal(output.tokens_used, 0);
}

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_execution_result_plan_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationTokenIssuanceExecutionResultPlanProviderAliases,
      ],
    },
    null,
    2,
  ),
);
