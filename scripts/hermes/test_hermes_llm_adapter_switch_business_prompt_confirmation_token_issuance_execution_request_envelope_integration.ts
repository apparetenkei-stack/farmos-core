import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAliases,
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary';

assert.deepEqual(
  [
    ...hermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAliases,
  ],
  [
    'business_prompt_confirmation_token_issuance_execution_request_envelope',
    'local_llm_business_prompt_confirmation_token_issuance_execution_request_envelope',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAlias(
    'business_prompt_confirmation_token_issuance_execution_request_envelope',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAlias(
    'local_llm_business_prompt_confirmation_token_issuance_execution_request_envelope',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAlias(
    'mock',
  ),
  false,
);

for (const provider of hermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAliases) {
  const output =
    createHermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeBoundary({
      provider,
      review_status: 'needs_human_review',
    });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_token_issuance_execution_request_envelope_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_token_issuance_execution_request_envelope',
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
    output.confirmation_token_issuance_execution_request_envelope_body_created,
    false,
  );
  assert.equal(
    output.confirmation_token_issuance_execution_request_envelope_body_sent,
    false,
  );
  assert.equal(
    output.confirmation_token_issuance_execution_request_envelope_operation_created,
    false,
  );
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
  assert.equal(output.audit_write_allowed, false);
  assert.equal(output.runtime_call_allowed, false);
  assert.equal(output.payload_send_allowed, false);
  assert.equal(output.request_body_created, false);
  assert.equal(output.request_body_sent, false);
  assert.equal(output.prompt_sent, false);
  assert.equal(
    output.safe_token_issuance_execution_request_envelope_exposed,
    true,
  );
  assert.equal(output.selected_provider, 'mock');
  assert.equal(output.fallback_provider, 'mock');
  assert.equal(output.tokens_used, 0);
}

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_execution_request_envelope_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationTokenIssuanceExecutionRequestEnvelopeProviderAliases,
      ],
    },
    null,
    2,
  ),
);
