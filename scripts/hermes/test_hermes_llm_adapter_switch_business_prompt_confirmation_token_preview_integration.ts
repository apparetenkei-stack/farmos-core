import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationTokenPreviewProviderAliases,
  isHermesBusinessPromptConfirmationTokenPreviewProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationTokenPreviewBoundary } from './api_boundary/hermes_business_prompt_confirmation_token_preview_boundary';

assert.deepEqual(
  [...hermesBusinessPromptConfirmationTokenPreviewProviderAliases],
  [
    'business_prompt_confirmation_token_preview',
    'local_llm_business_prompt_confirmation_token_preview',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenPreviewProviderAlias(
    'business_prompt_confirmation_token_preview',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenPreviewProviderAlias(
    'local_llm_business_prompt_confirmation_token_preview',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationTokenPreviewProviderAlias('mock'),
  false,
);

for (const provider of hermesBusinessPromptConfirmationTokenPreviewProviderAliases) {
  const output = createHermesBusinessPromptConfirmationTokenPreviewBoundary({
    provider,
    review_status: 'needs_human_review',
  });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_token_preview_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_token_preview',
  );
  assert.equal(
    output.confirmation_token_preview_status,
    'preview_only_pending_implementation',
  );
  assert.equal(output.confirmation_token_preview_available, false);
  assert.equal(output.confirmation_token_issuance_allowed, false);
  assert.equal(output.confirmation_action_enabled, false);
  assert.equal(output.confirmation_action_visible, false);
  assert.equal(output.confirmation_token_created, false);
  assert.equal(output.confirmation_token_exposed, false);
  assert.equal(output.confirmation_token_saved, false);
  assert.equal(output.confirmation_token_hash_created, false);
  assert.equal(output.confirmation_token_hash_saved, false);
  assert.equal(output.confirmation_token_signature_created, false);
  assert.equal(output.confirmation_token_verified, false);
  assert.equal(output.confirmation_token_expiry_saved, false);
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
        'hermes_llm_adapter_switch_business_prompt_confirmation_token_preview_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationTokenPreviewProviderAliases,
      ],
    },
    null,
    2,
  ),
);
