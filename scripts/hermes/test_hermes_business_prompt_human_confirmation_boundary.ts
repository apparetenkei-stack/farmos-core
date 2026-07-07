import assert from "node:assert/strict";

import { runHermesBusinessPromptHumanConfirmationBoundary } from "./api_boundary/hermes_business_prompt_human_confirmation_boundary";

type BoundaryResult = Awaited<
  ReturnType<typeof runHermesBusinessPromptHumanConfirmationBoundary>
>;

function assertSafeBoundary(result: BoundaryResult) {
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.confirmation_write_allowed, false);
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

  assert.equal(
    result.business_prompt_human_confirmation.mode,
    "hermes_business_prompt_human_confirmation_boundary",
  );
  assert.equal(result.business_prompt_human_confirmation.runtime, "local_llm");
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_mode,
    "dry_run_human_confirmation_only",
  );
  assert.equal(
    result.business_prompt_human_confirmation.upstream_payload_schema_mode,
    "dry_run_payload_schema_only",
  );
  assert.equal(
    result.business_prompt_human_confirmation.upstream_policy_gate_mode,
    "dry_run_policy_gate_only",
  );
  assert.equal(
    result.business_prompt_human_confirmation.schema_version,
    "hermes.business_prompt_confirmation.v0",
  );
  assert.equal(
    result.business_prompt_human_confirmation.payload_schema_version,
    "hermes.business_prompt_payload.v0",
  );
  assert.equal(
    result.business_prompt_human_confirmation.payload_kind,
    "business_prompt_candidate",
  );
  assert.equal(result.business_prompt_human_confirmation.payload_send_allowed, false);
  assert.equal(result.business_prompt_human_confirmation.confirmation_required, true);
  assert.equal(result.business_prompt_human_confirmation.human_confirmed, false);
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_token_created,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_token_exposed,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_record_created,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_record_saved,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.source_prompt_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.sanitized_prompt_included,
    false,
  );
  assert.equal(result.business_prompt_human_confirmation.raw_prompt_exposed, false);
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview_exposed,
    "safe_confirmation_metadata_only",
  );
  assert.equal(
    result.business_prompt_human_confirmation.business_context_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.proposal_body_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.restricted_domain_data_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.endpoint_value_exposed,
    false,
  );
  assert.equal(result.business_prompt_human_confirmation.model_value_exposed, false);
  assert.equal(result.business_prompt_human_confirmation.credentials_required, false);
  assert.equal(result.business_prompt_human_confirmation.credentials_exposed, false);
  assert.equal(result.business_prompt_human_confirmation.runtime_call_allowed, false);
  assert.equal(result.business_prompt_human_confirmation.request_body_created, false);
  assert.equal(result.business_prompt_human_confirmation.request_body_sent, false);
  assert.equal(result.business_prompt_human_confirmation.prompt_sent, false);
  assert.equal(result.business_prompt_human_confirmation.response_body_exposed, false);
  assert.equal(result.business_prompt_human_confirmation.selected_provider, "mock");
  assert.equal(result.business_prompt_human_confirmation.fallback_provider, "mock");
  assert.equal(result.business_prompt_human_confirmation.tokens_used, 0);

  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.preview_kind,
    "safe_confirmation_metadata_only",
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.raw_prompt_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .sanitized_prompt_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .business_context_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .proposal_body_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .restricted_domain_data_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .endpoint_value_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .model_value_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .credential_value_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview
      .confirmation_token_included,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.confirmation
      .confirmation_required,
    true,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.confirmation
      .human_confirmed,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.confirmation
      .confirmation_token_created,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.confirmation
      .confirmation_token_exposed,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.confirmation
      .confirmation_record_created,
    false,
  );
  assert.equal(
    result.business_prompt_human_confirmation.confirmation_preview.confirmation
      .confirmation_record_saved,
    false,
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
  assert.equal(result.business_prompt_policy_gate.runtime_call_allowed, false);
  assert.equal(result.business_prompt_policy_gate.request_body_created, false);
  assert.equal(result.business_prompt_policy_gate.request_body_sent, false);
  assert.equal(result.business_prompt_policy_gate.prompt_sent, false);
  assert.equal(result.business_prompt_policy_gate.raw_prompt_exposed, false);
}

async function main() {
  const empty = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "business_prompt_human_confirmation",
    dryRun: true,
  });

  assert.equal(empty.result, "ok");
  assert.equal(empty.business_prompt_human_confirmation.payload_created, false);
  assert.equal(
    empty.business_prompt_human_confirmation.confirmation_state,
    "not_configured",
  );
  assert.equal(
    empty.business_prompt_human_confirmation.confirmation_result,
    "not_configured",
  );
  assert.equal(empty.business_prompt_human_confirmation.human_confirmed, false);
  assertSafeBoundary(empty);

  const operational = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "business_prompt_human_confirmation",
    dryRun: true,
    sample: "今日の作業を整理して",
  });

  assert.equal(operational.result, "ok");
  assert.equal(
    operational.business_prompt_human_confirmation.configured_provider,
    "business_prompt_human_confirmation",
  );
  assert.equal(
    operational.business_prompt_human_confirmation.payload_created,
    true,
  );
  assert.equal(
    operational.business_prompt_human_confirmation.confirmation_state,
    "required",
  );
  assert.equal(
    operational.business_prompt_human_confirmation.confirmation_result,
    "not_confirmed",
  );
  assert.equal(
    operational.business_prompt_human_confirmation.prompt_category,
    "operational_question",
  );
  assert.equal(
    operational.business_prompt_human_confirmation.prompt_risk_level,
    "low",
  );
  assert.equal(
    operational.business_prompt_human_confirmation.redaction_decision,
    "not_required",
  );
  assertSafeBoundary(operational);

  const planning = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "business_prompt_human_confirmation",
    dryRun: true,
    sample: "来週の作付け計画を整理して",
  });

  assert.equal(planning.result, "ok");
  assert.equal(
    planning.business_prompt_human_confirmation.confirmation_state,
    "required",
  );
  assert.equal(
    planning.business_prompt_human_confirmation.confirmation_result,
    "not_confirmed",
  );
  assert.equal(
    planning.business_prompt_human_confirmation.prompt_category,
    "planning_question",
  );
  assert.equal(
    planning.business_prompt_human_confirmation.prompt_risk_level,
    "medium",
  );
  assert.equal(
    planning.business_prompt_human_confirmation.redaction_decision,
    "required",
  );
  assertSafeBoundary(planning);

  const proposalRelated = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "business_prompt_human_confirmation",
    dryRun: true,
    sample: "Hermes提案レビュー状況を確認して",
  });

  assert.equal(proposalRelated.result, "ok");
  assert.equal(
    proposalRelated.business_prompt_human_confirmation.confirmation_state,
    "required",
  );
  assert.equal(
    proposalRelated.business_prompt_human_confirmation.confirmation_result,
    "not_confirmed",
  );
  assert.equal(
    proposalRelated.business_prompt_human_confirmation.prompt_category,
    "proposal_related",
  );
  assertSafeBoundary(proposalRelated);

  const restricted = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "business_prompt_human_confirmation",
    dryRun: true,
    sample: "顧客の注文金額を整理して",
  });

  assert.equal(restricted.result, "blocked");
  assert.equal(
    restricted.business_prompt_human_confirmation.confirmation_state,
    "blocked",
  );
  assert.equal(
    restricted.business_prompt_human_confirmation.confirmation_result,
    "blocked",
  );
  assert.equal(
    restricted.business_prompt_human_confirmation.prompt_category,
    "restricted_domain",
  );
  assert.equal(
    restricted.business_prompt_human_confirmation.prompt_risk_level,
    "blocked",
  );
  assertSafeBoundary(restricted);

  const localAlias = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "local_llm_business_prompt_human_confirmation",
    dryRun: true,
    sample: "今日の作業計画を整理して",
  });

  assert.equal(localAlias.result, "ok");
  assert.equal(
    localAlias.business_prompt_human_confirmation.configured_provider,
    "local_llm_business_prompt_human_confirmation",
  );
  assert.equal(
    localAlias.business_prompt_human_confirmation.selected_provider,
    "mock",
  );
  assert.equal(
    localAlias.business_prompt_human_confirmation.fallback_provider,
    "mock",
  );
  assertSafeBoundary(localAlias);

  const invalidProvider = await runHermesBusinessPromptHumanConfirmationBoundary({
    provider: "openai",
    dryRun: true,
    sample: "今日の作業計画を整理して",
  });

  assert.equal(invalidProvider.result, "bad_request");
  assert.equal(
    invalidProvider.business_prompt_human_confirmation.confirmation_state,
    "not_configured",
  );
  assert.equal(
    invalidProvider.business_prompt_human_confirmation.confirmation_result,
    "not_configured",
  );
  assertSafeBoundary(invalidProvider);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_business_prompt_human_confirmation_boundary",
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
