import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationActionReadinessProviderAliases,
  isHermesBusinessPromptConfirmationActionReadinessProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationActionReadinessBoundary } from './api_boundary/hermes_business_prompt_confirmation_action_readiness_boundary';

assert.deepEqual(
  [...hermesBusinessPromptConfirmationActionReadinessProviderAliases],
  [
    'business_prompt_confirmation_action_readiness',
    'local_llm_business_prompt_confirmation_action_readiness',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationActionReadinessProviderAlias(
    'business_prompt_confirmation_action_readiness',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationActionReadinessProviderAlias(
    'local_llm_business_prompt_confirmation_action_readiness',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationActionReadinessProviderAlias('mock'),
  false,
);

for (const provider of hermesBusinessPromptConfirmationActionReadinessProviderAliases) {
  const output = createHermesBusinessPromptConfirmationActionReadinessBoundary({
    provider,
    review_status: 'needs_human_review',
  });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_action_readiness_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_action_readiness',
  );
  assert.equal(
    output.confirmation_action_status,
    'disabled_pending_implementation',
  );
  assert.equal(output.confirmation_action_enabled, false);
  assert.equal(output.confirmation_action_visible, false);
  assert.equal(output.confirmation_token_created, false);
  assert.equal(output.confirmation_token_saved, false);
  assert.equal(output.confirmation_record_created, false);
  assert.equal(output.confirmation_record_saved, false);
  assert.equal(output.confirmation_status_saved, false);
  assert.equal(output.audit_write_allowed, false);
  assert.equal(output.selected_provider, 'mock');
  assert.equal(output.fallback_provider, 'mock');
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
        'hermes_llm_adapter_switch_business_prompt_confirmation_action_readiness_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationActionReadinessProviderAliases,
      ],
    },
    null,
    2,
  ),
);
