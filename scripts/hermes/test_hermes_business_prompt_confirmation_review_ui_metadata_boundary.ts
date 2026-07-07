import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationReviewUiMetadataBoundary,
  mapHermesBusinessPromptConfirmationReviewStatusToUiMetadata,
} from './api_boundary/hermes_business_prompt_confirmation_review_ui_metadata_boundary';

const needsReview =
  createHermesBusinessPromptConfirmationReviewUiMetadataBoundary({
    review_status: 'needs_human_review',
  });

assert.equal(needsReview.result, 'ok');
assert.equal(
  needsReview.mode,
  'hermes_business_prompt_confirmation_review_ui_metadata_boundary',
);
assert.equal(needsReview.runtime, 'local_llm');
assert.equal(
  needsReview.ui_metadata_mode,
  'dry_run_confirmation_review_ui_metadata_only',
);
assert.equal(
  needsReview.configured_provider,
  'business_prompt_confirmation_review_ui_metadata',
);
assert.equal(
  needsReview.upstream_review_mode,
  'dry_run_confirmation_review_read_only',
);
assert.equal(
  needsReview.source_schema_version,
  'hermes.business_prompt_confirmation_review.v0',
);
assert.equal(
  needsReview.schema_version,
  'hermes.business_prompt_confirmation_review_ui_metadata.v0',
);
assert.equal(needsReview.confirmation_required, true);
assert.equal(needsReview.human_confirmed, false);
assert.equal(needsReview.confirmation_state, 'required');
assert.equal(needsReview.confirmation_result, 'not_confirmed');
assert.equal(needsReview.review_status, 'needs_human_review');
assert.equal(needsReview.ui_status, 'review_required');
assert.equal(needsReview.ui_severity, 'warning');
assert.equal(needsReview.ui_badge_label, '確認が必要');
assert.equal(needsReview.ui_action_available, false);
assert.equal(needsReview.ui_action_label, 'none');
assert.equal(
  needsReview.ui_disabled_reason,
  'confirmation_not_enabled_by_day54',
);

const blocked = createHermesBusinessPromptConfirmationReviewUiMetadataBoundary({
  review_status: 'blocked_by_policy',
});

assert.equal(blocked.confirmation_state, 'blocked');
assert.equal(blocked.confirmation_result, 'blocked');
assert.equal(blocked.ui_status, 'blocked');
assert.equal(blocked.ui_severity, 'danger');
assert.equal(blocked.ui_badge_label, '送信不可');
assert.equal(blocked.ui_disabled_reason, 'blocked_by_policy');

const notReady = createHermesBusinessPromptConfirmationReviewUiMetadataBoundary({
  review_status: 'not_ready',
});

assert.equal(notReady.confirmation_state, 'not_configured');
assert.equal(notReady.confirmation_result, 'not_configured');
assert.equal(notReady.ui_status, 'not_ready');
assert.equal(notReady.ui_severity, 'neutral');
assert.equal(notReady.ui_badge_label, '未準備');
assert.equal(notReady.ui_disabled_reason, 'payload_not_ready');

assert.deepEqual(
  mapHermesBusinessPromptConfirmationReviewStatusToUiMetadata(
    'needs_human_review',
  ).ui_status,
  'review_required',
);

for (const output of [needsReview, blocked, notReady]) {
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
  assert.equal(output.confirmation_token_created, false);
  assert.equal(output.confirmation_token_exposed, false);
  assert.equal(output.confirmation_record_created, false);
  assert.equal(output.confirmation_record_saved, false);
  assert.equal(output.payload_send_allowed, false);
  assert.equal(output.runtime_call_allowed, false);
  assert.equal(output.request_body_created, false);
  assert.equal(output.request_body_sent, false);
  assert.equal(output.prompt_sent, false);
  assert.equal(output.response_body_exposed, false);
  assert.equal(output.selected_provider, 'mock');
  assert.equal(output.fallback_provider, 'mock');
  assert.equal(output.tokens_used, 0);
}

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_business_prompt_confirmation_review_ui_metadata_boundary',
      mappings: {
        needs_human_review: needsReview.ui_status,
        blocked_by_policy: blocked.ui_status,
        not_ready: notReady.ui_status,
      },
      raw_prompt_exposed: needsReview.raw_prompt_exposed,
      runtime_call_allowed: needsReview.runtime_call_allowed,
      request_body_created: needsReview.request_body_created,
      prompt_sent: needsReview.prompt_sent,
      tokens_used: needsReview.tokens_used,
    },
    null,
    2,
  ),
);
