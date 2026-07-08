import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAliases,
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary';

assert.deepEqual(
  [...hermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAliases],
  [
    'business_prompt_confirmation_token_issuance_execution_gate',
    'local_llm_business_prompt_confirmation_token_issuance_execution_gate',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAlias(
    'business_prompt_confirmation_token_issuance_execution_gate',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAlias(
    'local_llm_business_prompt_confirmation_token_issuance_execution_gate',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAlias(
    'mock',
  ),
  false,
);

for (const provider of hermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAliases) {
  const output =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionGateBoundary({
      provider,
      review_status: 'needs_human_review',
    });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_token_issuance_execution_gate_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_token_issuance_execution_gate',
  );
  assert.equal(
    output.confirmation_token_issuance_execution_gate_status,
    'execution_gate_pending_implementation',
  );
  assert.equal(
    output.confirmation_token_issuance_execution_gate_available,
    false,
  );
  assert.equal(output.confirmation_token_issuance_execution_gate_allowed, false);
  assert.equal(output.confirmation_token_issuance_execution_candidate, true);
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
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_execution_gate_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationTokenIssuanceExecutionGateProviderAliases,
      ],
    },
    null,
    2,
  ),
);
