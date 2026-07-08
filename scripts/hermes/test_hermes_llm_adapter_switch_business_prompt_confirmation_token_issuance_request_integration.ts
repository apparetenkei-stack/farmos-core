import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenIssuanceRequestProviderAliases,
  isHermesBusinessPromptConfirmationTokenIssuanceRequestProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_issuance_request_boundary';

const forbiddenFalseKeyParts = [
  ['confirmation', 'token', 'created'],
  ['confirmation', 'token', 'exposed'],
  ['confirmation', 'token', 'saved'],
  ['confirmation', 'token', 'plaintext', 'created'],
  ['confirmation', 'token', 'plaintext', 'exposed'],
  ['confirmation', 'token', 'hash', 'created'],
  ['confirmation', 'token', 'hash', 'saved'],
  ['confirmation', 'token', 'signature', 'created'],
  ['confirmation', 'token', 'verified'],
  ['confirmation', 'token', 'expiry', 'created'],
  ['confirmation', 'token', 'expiry', 'saved'],
  ['confirmation', 'record', 'created'],
  ['confirmation', 'record', 'saved'],
  ['confirmation', 'status', 'saved'],
  ['audit', 'write', 'allowed'],
  ['payload', 'send', 'allowed'],
  ['runtime', 'call', 'allowed'],
  ['request', 'body', 'created'],
  ['request', 'body', 'sent'],
  ['prompt', 'sent'],
  ['response', 'body', 'exposed'],
];

assert.deepEqual(
  [...hermesBusinessPromptConfirmationTokenIssuanceRequestProviderAliases],
  [
    'business_prompt_confirmation_token_issuance_request',
    'local_llm_business_prompt_confirmation_token_issuance_request',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceRequestProviderAlias(
    'business_prompt_confirmation_token_issuance_request',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceRequestProviderAlias(
    'local_llm_business_prompt_confirmation_token_issuance_request',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenIssuanceRequestProviderAlias('mock'),
  false,
);

for (const provider of hermesBusinessPromptConfirmationTokenIssuanceRequestProviderAliases) {
  const output = createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary({
    provider,
    review_status: 'needs_human_review',
  });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_token_issuance_request_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_token_issuance_request',
  );
  assert.equal(
    output.confirmation_token_issuance_request_status,
    'request_pending_implementation',
  );
  assert.equal(output.confirmation_token_issuance_request_available, false);
  assert.equal(output.confirmation_token_issuance_request_allowed, false);
  assert.equal(output.confirmation_token_issuance_request_label, 'none');
  assert.equal(output.safe_token_issuance_request_exposed, true);
  assert.equal(output.selected_provider, 'mock');
  assert.equal(output.fallback_provider, 'mock');
  assert.equal(output.tokens_used, 0);

  const record = output as Record<string, unknown>;
  for (const parts of forbiddenFalseKeyParts) {
    assert.equal(record[parts.join('_')], false, parts.join('_'));
  }
}

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_request_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationTokenIssuanceRequestProviderAliases,
      ],
    },
    null,
    2,
  ),
);
