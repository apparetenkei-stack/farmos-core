import assert from "node:assert/strict";

import { runHermesBusinessPromptConfirmationReviewReadBoundary } from "./api_boundary/hermes_business_prompt_confirmation_review_read_boundary";

type BoundaryResult = Awaited<
  ReturnType<typeof runHermesBusinessPromptConfirmationReviewReadBoundary>
>;

function assertSafeBoundary(result: BoundaryResult) {
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.confirmation_write_allowed, false);
  assert.equal(result.boundary.confirmation_token_created, false);
  assert.equal(result.boundary.confirmation_token_exposed, false);
  assert.equal(result.boundary.confirmation_record_created, false);
  assert.equal(result.boundary.confirmation_record_saved, false);
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.external_api_called, false);
  assert.equal(result.boundary.local_model_called, false);
  assert.equal(result.boundary.local_runtime_generate_http_called, false);
  assert.equal(result.boundary.prompt_sent_to_model, false);
  assert.equal(result.boundary.request_body_created, false);
  assert.equal(result.boundary.request_body_sent, false);
  assert.equal(result.boundary.response_body_exposed, false);
  assert.equal(result.boundary.raw_prompt_exposed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.endpoint_value_exposed, false);
  assert.equal(result.boundary.model_value_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.user_prompt_sent_to_model, false);
  assert.equal(result.boundary.business_context_sent_to_model, false);
  assert.equal(result.boundary.real_business_prompt_sent_to_model, false);
  assert.equal(result.boundary.fixed_business_dummy_prompt_sent_to_model, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.tokens_used, 0);

  const review = result.business_prompt_confirmation_review_read;

  assert.equal(
    review.mode,
    "hermes_business_prompt_confirmation_review_read_boundary",
  );
  assert.equal(review.runtime, "local_llm");
  assert.equal(review.review_mode, "dry_run_confirmation_review_read_only");
  assert.equal(
    review.upstream_confirmation_mode,
    "dry_run_human_confirmation_only",
  );
  assert.equal(
    review.upstream_payload_schema_mode,
    "dry_run_payload_schema_only",
  );
  assert.equal(review.upstream_policy_gate_mode, "dry_run_policy_gate_only");
  assert.equal(
    review.schema_version,
    "hermes.business_prompt_confirmation_review.v0",
  );
  assert.equal(review.confirmation_required, true);
  assert.equal(review.human_confirmed, false);
  assert.equal(review.review_action_available, false);
  assert.equal(review.review_action_label, "none");
  assert.equal(review.safe_review_summary_exposed, true);
  assert.equal(review.raw_prompt_exposed, false);
  assert.equal(review.sanitized_prompt_included, false);
  assert.equal(review.business_context_included, false);
  assert.equal(review.proposal_body_included, false);
  assert.equal(review.restricted_domain_data_included, false);
  assert.equal(review.endpoint_value_exposed, false);
  assert.equal(review.model_value_exposed, false);
  assert.equal(review.credentials_exposed, false);
  assert.equal(review.confirmation_token_created, false);
  assert.equal(review.confirmation_token_exposed, false);
  assert.equal(review.confirmation_record_created, false);
  assert.equal(review.confirmation_record_saved, false);
  assert.equal(review.payload_send_allowed, false);
  assert.equal(review.runtime_call_allowed, false);
  assert.equal(review.request_body_created, false);
  assert.equal(review.request_body_sent, false);
  assert.equal(review.prompt_sent, false);
  assert.equal(review.response_body_exposed, false);
  assert.equal(review.selected_provider, "mock");
  assert.equal(review.fallback_provider, "mock");
  assert.equal(review.tokens_used, 0);

  assert.equal(
    review.review_summary.summary_kind,
    "safe_confirmation_review_metadata_only",
  );
  assert.equal(
    review.review_summary.schema_version,
    "hermes.business_prompt_confirmation_review.v0",
  );
  assert.equal(review.review_summary.confirmation_required, true);
  assert.equal(review.review_summary.human_confirmed, false);
  assert.equal(review.review_summary.review_action_available, false);
  assert.equal(review.review_summary.review_action_label, "none");
  assert.equal(review.review_summary.payload_send_allowed, false);
  assert.equal(review.review_summary.confirmation_token_created, false);
  assert.equal(review.review_summary.confirmation_token_exposed, false);
  assert.equal(review.review_summary.confirmation_record_created, false);
  assert.equal(review.review_summary.confirmation_record_saved, false);
  assert.equal(review.review_summary.raw_prompt_included, false);
  assert.equal(review.review_summary.sanitized_prompt_included, false);
  assert.equal(review.review_summary.business_context_included, false);
  assert.equal(review.review_summary.proposal_body_included, false);
  assert.equal(review.review_summary.restricted_domain_data_included, false);
  assert.equal(review.review_summary.endpoint_value_included, false);
  assert.equal(review.review_summary.model_value_included, false);
  assert.equal(review.review_summary.credential_value_included, false);

  assert.equal(
    result.business_prompt_human_confirmation.mode,
    "hermes_business_prompt_human_confirmation_boundary",
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_mode,
    "dry_run_human_confirmation_only",
  );
  assert.equal(
    result.business_prompt_payload_schema.mode,
    "hermes_business_prompt_payload_schema_boundary",
  );
  assert.equal(
    result.business_prompt_payload_schema.payload_schema_mode,
    "dry_run_payload_schema_only",
  );
  assert.equal(
    result.business_prompt_policy_gate.mode,
    "hermes_business_prompt_policy_gate_redaction_boundary",
  );
  assert.equal(
    result.business_prompt_policy_gate.policy_gate_mode,
    "dry_run_policy_gate_only",
  );
}

async function main() {
  const empty = await runHermesBusinessPromptConfirmationReviewReadBoundary({
    provider: "business_prompt_confirmation_review_read",
    dryRun: true,
  });

  assert.equal(empty.result, "ok");
  assert.equal(
    empty.business_prompt_confirmation_review_read.configured_provider,
    "business_prompt_confirmation_review_read",
  );
  assert.equal(
    empty.business_prompt_confirmation_review_read.confirmation_state,
    "not_configured",
  );
  assert.equal(
    empty.business_prompt_confirmation_review_read.confirmation_result,
    "not_configured",
  );
  assert.equal(
    empty.business_prompt_confirmation_review_read.review_status,
    "not_ready",
  );
  assert.equal(
    empty.business_prompt_confirmation_review_read.review_summary.review_status,
    "not_ready",
  );
  assert.equal(empty.business_prompt_confirmation_review_read.payload_created, false);
  assertSafeBoundary(empty);

  const operational =
    await runHermesBusinessPromptConfirmationReviewReadBoundary({
      provider: "business_prompt_confirmation_review_read",
      dryRun: true,
      sample: "今日の作業計画を整理して",
    });

  assert.equal(operational.result, "ok");
  assert.equal(
    operational.business_prompt_confirmation_review_read.confirmation_state,
    "required",
  );
  assert.equal(
    operational.business_prompt_confirmation_review_read.confirmation_result,
    "not_confirmed",
  );
  assert.equal(
    operational.business_prompt_confirmation_review_read.review_status,
    "needs_human_review",
  );
  assert.equal(
    operational.business_prompt_confirmation_review_read.review_summary
      .review_status,
    "needs_human_review",
  );
  assert.equal(
    operational.business_prompt_confirmation_review_read.payload_created,
    true,
  );
  assertSafeBoundary(operational);

  const localAlias =
    await runHermesBusinessPromptConfirmationReviewReadBoundary({
      provider: "local_llm_business_prompt_confirmation_review_read",
      dryRun: true,
      sample: "今日の作業計画を整理して",
    });

  assert.equal(localAlias.result, "ok");
  assert.equal(
    localAlias.business_prompt_confirmation_review_read.configured_provider,
    "local_llm_business_prompt_confirmation_review_read",
  );
  assert.equal(
    localAlias.business_prompt_confirmation_review_read.review_status,
    "needs_human_review",
  );
  assert.equal(localAlias.business_prompt_confirmation_review_read.selected_provider, "mock");
  assert.equal(localAlias.business_prompt_confirmation_review_read.fallback_provider, "mock");
  assertSafeBoundary(localAlias);

  const blocked =
    await runHermesBusinessPromptConfirmationReviewReadBoundary({
      provider: "business_prompt_confirmation_review_read",
      dryRun: true,
      sample: "顧客の注文金額を整理して",
    });

  assert.equal(blocked.result, "blocked");
  assert.equal(
    blocked.business_prompt_confirmation_review_read.confirmation_state,
    "blocked",
  );
  assert.equal(
    blocked.business_prompt_confirmation_review_read.confirmation_result,
    "blocked",
  );
  assert.equal(
    blocked.business_prompt_confirmation_review_read.review_status,
    "blocked_by_policy",
  );
  assert.equal(
    blocked.business_prompt_confirmation_review_read.review_summary
      .review_status,
    "blocked_by_policy",
  );
  assertSafeBoundary(blocked);

  const invalid =
    await runHermesBusinessPromptConfirmationReviewReadBoundary({
      provider: "ollama",
      dryRun: true,
      sample: "今日の作業計画を整理して",
    });

  assert.equal(invalid.result, "bad_request");
  assert.equal(
    invalid.business_prompt_confirmation_review_read.configured_provider,
    "business_prompt_confirmation_review_read",
  );
  assert.equal(invalid.business_prompt_confirmation_review_read.selected_provider, "mock");
  assertSafeBoundary(invalid);

  const notDryRun =
    await runHermesBusinessPromptConfirmationReviewReadBoundary({
      provider: "business_prompt_confirmation_review_read",
      dryRun: false,
      sample: "今日の作業計画を整理して",
    });

  assert.equal(notDryRun.result, "bad_request");
  assert.equal(notDryRun.business_prompt_confirmation_review_read.selected_provider, "mock");
  assert.equal(notDryRun.boundary.llm_runtime_executed, false);
  assertSafeBoundary(notDryRun);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_business_prompt_confirmation_review_read_boundary",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
