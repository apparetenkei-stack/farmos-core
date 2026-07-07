import assert from 'node:assert/strict';
import {
  hermesBusinessPromptConfirmationReviewUiMetadataProviderAliases,
  isHermesBusinessPromptConfirmationReviewUiMetadataProviderAlias,
} from './api_boundary/hermes_llm_adapter_switch_boundary';
import { createHermesBusinessPromptConfirmationReviewUiMetadataBoundary } from './api_boundary/hermes_business_prompt_confirmation_review_ui_metadata_boundary';

assert.deepEqual(
  [...hermesBusinessPromptConfirmationReviewUiMetadataProviderAliases],
  [
    'business_prompt_confirmation_review_ui_metadata',
    'local_llm_business_prompt_confirmation_review_ui_metadata',
  ],
);

assert.equal(
  isHermesBusinessPromptConfirmationReviewUiMetadataProviderAlias(
    'business_prompt_confirmation_review_ui_metadata',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationReviewUiMetadataProviderAlias(
    'local_llm_business_prompt_confirmation_review_ui_metadata',
  ),
  true,
);

assert.equal(
  isHermesBusinessPromptConfirmationReviewUiMetadataProviderAlias('mock'),
  false,
);

for (const provider of hermesBusinessPromptConfirmationReviewUiMetadataProviderAliases) {
  const output = createHermesBusinessPromptConfirmationReviewUiMetadataBoundary({
    provider,
    review_status: 'needs_human_review',
  });

  assert.equal(output.result, 'ok');
  assert.equal(
    output.mode,
    'hermes_business_prompt_confirmation_review_ui_metadata_boundary',
  );
  assert.equal(
    output.configured_provider,
    'business_prompt_confirmation_review_ui_metadata',
  );
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
        'hermes_llm_adapter_switch_business_prompt_confirmation_review_ui_metadata_integration',
      provider_aliases: [
        ...hermesBusinessPromptConfirmationReviewUiMetadataProviderAliases,
      ],
    },
    null,
    2,
  ),
);
