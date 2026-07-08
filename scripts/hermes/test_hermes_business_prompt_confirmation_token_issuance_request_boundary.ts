import assert from 'node:assert/strict';
import {
  createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary,
  mapHermesBusinessPromptConfirmationTokenIssuanceReadinessStatusToRequest,
} from './api_boundary/hermes_business_prompt_confirmation_token_issuance_request_boundary';

const requestOperationCreatedKey = [
  'confirmation',
  'token',
  'issuance',
  'request',
  'operation',
  'created',
].join('_');

const requestBodyCreatedKey = [
  'confirmation',
  'token',
  'issuance',
  'request',
  'body',
  'created',
].join('_');

const requestBodySentKey = [
  'confirmation',
  'token',
  'issuance',
  'request',
  'body',
  'sent',
].join('_');

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

function read(output: Record<string, unknown>, key: string): unknown {
  return output[key];
}

function assertForbiddenFlagsRemainFalse(output: Record<string, unknown>): void {
  for (const parts of forbiddenFalseKeyParts) {
    assert.equal(read(output, parts.join('_')), false, parts.join('_'));
  }
}

const needsReview =
  createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary({
    review_status: 'needs_human_review',
  });

assert.equal(needsReview.result, 'ok');
assert.equal(
  needsReview.mode,
  'hermes_business_prompt_confirmation_token_issuance_request_boundary',
);
assert.equal(needsReview.runtime, 'local_llm');
assert.equal(
  needsReview.confirmation_token_issuance_request_mode,
  'dry_run_confirmation_token_issuance_request_only',
);
assert.equal(
  needsReview.configured_provider,
  'business_prompt_confirmation_token_issuance_request',
);
assert.equal(
  needsReview.upstream_token_issuance_readiness_mode,
  'dry_run_confirmation_token_issuance_readiness_only',
);
assert.equal(
  needsReview.upstream_token_preview_mode,
  'dry_run_confirmation_token_preview_only',
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
  'hermes.business_prompt_confirmation_token_issuance_request.v0',
);
assert.equal(
  needsReview.source_schema_version,
  'hermes.business_prompt_confirmation_token_issuance_readiness.v0',
);
assert.equal(
  needsReview.source_token_preview_schema_version,
  'hermes.business_prompt_confirmation_token_preview.v0',
);
assert.equal(
  needsReview.source_action_readiness_schema_version,
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
assert.equal(
  needsReview.confirmation_token_issuance_readiness_status,
  'readiness_pending_implementation',
);
assert.equal(
  needsReview.confirmation_token_issuance_request_status,
  'request_pending_implementation',
);
assert.equal(needsReview.confirmation_token_issuance_request_available, false);
assert.equal(needsReview.confirmation_token_issuance_request_allowed, false);
assert.equal(needsReview.confirmation_token_issuance_request_label, 'none');
assert.equal(
  needsReview.confirmation_token_issuance_request_disabled_reason,
  'token_issuance_request_not_enabled_by_day58',
);
assert.equal(
  needsReview.confirmation_token_issuance_request_precondition_met,
  true,
);
assert.equal(read(needsReview, requestOperationCreatedKey), false);
assert.equal(read(needsReview, requestBodyCreatedKey), false);
assert.equal(read(needsReview, requestBodySentKey), false);
assert.equal(needsReview.confirmation_token_future_issuance_candidate, true);
assert.equal(needsReview.confirmation_token_issuance_precondition_met, true);
assert.equal(needsReview.confirmation_token_preview_precondition_met, false);
assert.equal(needsReview.safe_token_issuance_request_exposed, true);
assert.equal(needsReview.safe_token_issuance_readiness_exposed, true);
assert.equal(needsReview.safe_token_preview_exposed, true);
assert.equal(needsReview.safe_action_readiness_exposed, true);
assert.equal(needsReview.safe_ui_metadata_exposed, true);
assert.equal(needsReview.safe_review_summary_exposed, true);
assert.equal(needsReview.raw_prompt_exposed, false);
assert.equal(needsReview.sanitized_prompt_included, false);
assert.equal(needsReview.business_context_included, false);
assert.equal(needsReview.proposal_body_included, false);
assert.equal(needsReview.restricted_domain_data_included, false);
assert.equal(needsReview.endpoint_value_exposed, false);
assert.equal(needsReview.model_value_exposed, false);
assert.equal(needsReview.credentials_exposed, false);
assert.equal(needsReview.selected_provider, 'mock');
assert.equal(needsReview.fallback_provider, 'mock');
assert.equal(needsReview.tokens_used, 0);
assertForbiddenFlagsRemainFalse(needsReview);

const blocked =
  createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary({
    review_status: 'blocked_by_policy',
  });

assert.equal(
  blocked.confirmation_token_issuance_readiness_status,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_request_status,
  'blocked_by_policy',
);
assert.equal(
  blocked.confirmation_token_issuance_request_disabled_reason,
  'blocked_by_policy',
);
assert.equal(blocked.confirmation_token_issuance_request_precondition_met, false);
assert.equal(blocked.confirmation_token_future_issuance_candidate, false);
assert.equal(blocked.confirmation_token_issuance_precondition_met, false);
assert.equal(blocked.confirmation_token_preview_precondition_met, false);
assert.equal(read(blocked, requestOperationCreatedKey), false);
assert.equal(read(blocked, requestBodyCreatedKey), false);
assert.equal(read(blocked, requestBodySentKey), false);
assertForbiddenFlagsRemainFalse(blocked);

const notReady =
  createHermesBusinessPromptConfirmationTokenIssuanceRequestBoundary({
    review_status: 'not_ready',
  });

assert.equal(
  notReady.confirmation_token_issuance_readiness_status,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_request_status,
  'payload_not_ready',
);
assert.equal(
  notReady.confirmation_token_issuance_request_disabled_reason,
  'payload_not_ready',
);
assert.equal(notReady.confirmation_token_issuance_request_precondition_met, true);
assert.equal(notReady.confirmation_token_future_issuance_candidate, false);
assert.equal(notReady.confirmation_token_issuance_precondition_met, true);
assert.equal(notReady.confirmation_token_preview_precondition_met, false);
assert.equal(read(notReady, requestOperationCreatedKey), false);
assert.equal(read(notReady, requestBodyCreatedKey), false);
assert.equal(read(notReady, requestBodySentKey), false);
assertForbiddenFlagsRemainFalse(notReady);

assert.equal(
  mapHermesBusinessPromptConfirmationTokenIssuanceReadinessStatusToRequest(
    'readiness_pending_implementation',
  ).confirmation_token_issuance_request_status,
  'request_pending_implementation',
);
assert.equal(
  mapHermesBusinessPromptConfirmationTokenIssuanceReadinessStatusToRequest(
    'blocked_by_policy',
  ).confirmation_token_issuance_request_status,
  'blocked_by_policy',
);
assert.equal(
  mapHermesBusinessPromptConfirmationTokenIssuanceReadinessStatusToRequest(
    'payload_not_ready',
  ).confirmation_token_issuance_request_status,
  'payload_not_ready',
);

console.log(
  JSON.stringify(
    {
      result: 'ok',
      checked:
        'hermes_business_prompt_confirmation_token_issuance_request_boundary',
      mappings: {
        readiness_pending_implementation:
          needsReview.confirmation_token_issuance_request_status,
        blocked_by_policy: blocked.confirmation_token_issuance_request_status,
        payload_not_ready: notReady.confirmation_token_issuance_request_status,
      },
    },
    null,
    2,
  ),
);
