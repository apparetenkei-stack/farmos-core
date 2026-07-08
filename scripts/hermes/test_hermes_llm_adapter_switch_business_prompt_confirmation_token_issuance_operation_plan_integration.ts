import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAliases,
  isHermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary';

assert.deepEqual(
  [...hermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAliases],
  [
    'business_prompt_confirmation_token_issuance_operation_plan',
    'local_llm_business_prompt_confirmation_token_issuance_operation_plan',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAlias(
    'business_prompt_confirmation_token_issuance_operation_plan',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAlias(
    'local_llm_business_prompt_confirmation_token_issuance_operation_plan',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAlias(
    'mock',
  ),
  false,
);

for (const provider of hermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAliases) {
  const output =
    createHermesBusinessPromptConfirmationTokenIssuanceOperationPlanBoundary({
      provider,
      review_status: 'needs_human_review',
    });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_token_issuance_operation_plan',
  );
  assert.equal(
    output.confirmation_token_issuance_operation_plan_status,
    'operation_plan_pending_implementation',
  );
  assert.equal(
    output.confirmation_token_issuance_operation_plan_available,
    false,
  );
  assert.equal(output.confirmation_token_issuance_operation_plan_allowed, false);
  assert.equal(output.confirmation_token_issuance_operation_created, false);
  assert.equal(output.confirmation_token_issuance_operation_queued, false);
  assert.equal(output.confirmation_token_issuance_operation_executed, false);
  assert.equal(output.confirmation_token_issuance_operation_result_saved, false);
  assert.equal(output.confirmation_token_created, false);
  assert.equal(output.confirmation_token_hash_created, false);
  assert.equal(output.confirmation_record_saved, false);
  assert.equal(output.audit_write_allowed, false);
  assert.equal(output.runtime_call_allowed, false);
  assert.equal(output.payload_send_allowed, false);
  assert.equal(output.request_body_created, false);
  assert.equal(output.prompt_sent, false);
  assert.equal(output.tokens_used, 0);
}

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_operation_plan_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationTokenIssuanceOperationPlanProviderAliases,
      ],
    },
    null,
    2,
  ),
);
