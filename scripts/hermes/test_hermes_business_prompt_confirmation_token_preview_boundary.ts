import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationTokenPreviewBoundary,
  mapHermesBusinessPromptConfirmationActionStatusToTokenPreview,
} from './api_boundary/hermes_business_prompt_confirmation_token_preview_boundary';

const needsReview =
  createHermesBusinessPromptConfirmationTokenPreviewBoundary({
    review_status: 'needs_human_review',
  });

assert.equal(needsReview.result, 'ok');
assert.equal(
  needsReview.mode,
  'hermes_business_prompt_confirmation_token_preview_boundary',
);
assert.equal(needsReview.runtime, 'local_llm');
assert.equal(
  needsReview.confirmation_token_preview_mode,
  'dry_run_confirmation_token_preview_only',
);
assert.equal(
  needsReview.configured_provider,
  'business_prompt_confirmation_token_preview',
);
assert.equal(
  needsReview.upstream_action_readiness_mode,
  'dry_run_confirmation_action_readiness_only',
);
assert.equal(
  needsReview.upstream_ui_metadata_mode,
  'dry_run_confirmation_review_ui_metadata_only',
);
assert.equal(
  needsReview.upstream_review_mode,
  'dry_run_confirmation_review_read_only',
);
assert.equal(
  needsReview.upstream_confirmation_mode,
  'dry_run_human_confirmation_only',
);
assert.equal(
  needsReview.upstream_payload_schema_mode,
  'dry_run_payload_schema_only',
);
assert.equal(
  needsReview.upstream_policy_gate_mode,
  'dry_run_policy_gate_only',
);
assert.equal(
  needsReview.schema_version,
  'hermes.business_prompt_confirmation_token_preview.v0',
);
assert.equal(
  needsReview.source_schema_version,
  'hermes.business_prompt_confirmation_action_readiness.v0',
);
assert.equal(
  needsReview.source_ui_metadata_schema_version,
  'hermes.business_prompt_confirmation_review_ui_metadata.v0',
);
assert.equal(
  needsReview.source_review_schema_version,
  'hermes.business_prompt_confirmation_review.v0',
);
assert.equal(needsReview.confirmation_required, true);
assert.equal(needsReview.human_confirmed, false);
assert.equal(needsReview.confirmation_state, 'required');
assert.equal(needsReview.confirmation_result, 'not_confirmed');
assert.equal(needsReview.review_status, 'needs_human_review');
assert.equal(needsReview.ui_status, 'review_required');
assert.equal(needsReview.ui_action_available, false);
assert.equal(needsReview.ui_action_label, 'none');
assert.equal(
  needsReview.confirmation_action_status,
  'disabled_pending_implementation',
);
assert.equal(needsReview.confirmation_action_enabled, false);
assert.equal(needsReview.confirmation_action_visible, false);
assert.equal(needsReview.confirmation_action_label, 'none');
assert.equal(
  needsReview.confirmation_action_disabled_reason,
  'confirmation_action_not_enabled_by_day55',
);
assert.equal(needsReview.confirmation_token_required_for_future_action, true);
assert.equal(
  needsReview.confirmation_token_preview_status,
  'preview_only_pending_implementation',
);
assert.equal(needsReview.confirmation_token_preview_available, false);
assert.equal(needsReview.confirmation_token_preview_label, 'none');
assert.equal(
  needsReview.confirmation_token_preview_disabled_reason,
  'token_preview_not_enabled_by_day56',
);
assert.equal(
  needsReview.confirmation_token_issuance_status,
  'disabled_pending_preview',
);
assert.equal(needsReview.confirmation_token_issuance_allowed, false);
assert.equal(
  needsReview.confirmation_token_issuance_disabled_reason,
  'token_issuance_not_enabled_by_day56',
);
assert.equal(needsReview.confirmation_token_required_precondition_met, true);
assert.equal(needsReview.confirmation_action_precondition_met, false);

const blocked = createHermesBusinessPromptConfirmationTokenPreviewBoundary({
  review_status: 'blocked_by_policy',
});

assert.equal(blocked.confirmation_state, 'blocked');
assert.equal(blocked.confirmation_result, 'blocked');
assert.equal(blocked.review_status, 'blocked_by_policy');
assert.equal(blocked.ui_status, 'blocked');
assert.equal(blocked.confirmation_action_status, 'blocked_by_policy');
assert.equal(blocked.confirmation_token_required_for_future_action, false);
assert.equal(blocked.confirmation_token_preview_status, 'blocked_by_policy');
assert.equal(blocked.confirmation_token_preview_available, false);
assert.equal(blocked.confirmation_token_preview_disabled_reason, 'blocked_by_policy');
assert.equal(blocked.confirmation_token_issuance_status, 'blocked_by_policy');
assert.equal(blocked.confirmation_token_issuance_allowed, false);
assert.equal(blocked.confirmation_token_issuance_disabled_reason, 'blocked_by_policy');
assert.equal(blocked.confirmation_token_required_precondition_met, false);
assert.equal(blocked.confirmation_action_precondition_met, false);

const notReady = createHermesBusinessPromptConfirmationTokenPreviewBoundary({
  review_status: 'not_ready',
});

assert.equal(notReady.confirmation_state, 'not_configured');
assert.equal(notReady.confirmation_result, 'not_configured');
assert.equal(notReady.review_status, 'not_ready');
assert.equal(notReady.ui_status, 'not_ready');
assert.equal(notReady.confirmation_action_status, 'payload_not_ready');
assert.equal(notReady.confirmation_token_required_for_future_action, true);
assert.equal(notReady.confirmation_token_preview_status, 'payload_not_ready');
assert.equal(notReady.confirmation_token_preview_available, false);
assert.equal(notReady.confirmation_token_preview_disabled_reason, 'payload_not_ready');
assert.equal(notReady.confirmation_token_issuance_status, 'payload_not_ready');
assert.equal(notReady.confirmation_token_issuance_allowed, false);
assert.equal(notReady.confirmation_token_issuance_disabled_reason, 'payload_not_ready');
assert.equal(notReady.confirmation_token_required_precondition_met, true);
assert.equal(notReady.confirmation_action_precondition_met, false);

assert.deepEqual(
  mapHermesBusinessPromptConfirmationActionStatusToTokenPreview(
    'disabled_pending_implementation',
  ).confirmation_token_preview_status,
  'preview_only_pending_implementation',
);

for (const output of [needsReview, blocked, notReady]) {
  assert.equal(output.confirmation_action_enabled, false);
  assert.equal(output.confirmation_action_visible, false);
  assert.equal(output.confirmation_token_preview_available, false);
  assert.equal(output.confirmation_token_issuance_allowed, false);
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
        'hermes_business_prompt_confirmation_token_preview_boundary',
      mappings: {
        disabled_pending_implementation:
          needsReview.confirmation_token_preview_status,
        blocked_by_policy: blocked.confirmation_token_preview_status,
        payload_not_ready: notReady.confirmation_token_preview_status,
      },
      confirmation_token_preview_available:
        needsReview.confirmation_token_preview_available,
      confirmation_token_issuance_allowed:
        needsReview.confirmation_token_issuance_allowed,
      confirmation_token_created: needsReview.confirmation_token_created,
      confirmation_token_saved: needsReview.confirmation_token_saved,
      confirmation_token_hash_created:
        needsReview.confirmation_token_hash_created,
      confirmation_record_saved: needsReview.confirmation_record_saved,
      audit_write_allowed: needsReview.audit_write_allowed,
      runtime_call_allowed: needsReview.runtime_call_allowed,
      payload_send_allowed: needsReview.payload_send_allowed,
      request_body_created: needsReview.request_body_created,
      prompt_sent: needsReview.prompt_sent,
      tokens_used: needsReview.tokens_used,
    },
    null,
    2,
  ),
);
