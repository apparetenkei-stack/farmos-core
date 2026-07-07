import assert from "node:assert/strict";

import { runHermesLlmAdapterSwitchBoundary } from "./api_boundary/hermes_llm_adapter_switch_boundary";

function assertSwitchBoundarySafe(
  result: Awaited<ReturnType<typeof runHermesLlmAdapterSwitchBoundary>>,
) {
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.external_api_called, false);
  assert.equal(result.boundary.local_model_called, false);
  assert.equal(result.boundary.local_runtime_health_http_called, false);
  assert.equal(result.boundary.local_runtime_generate_http_called, false);
  assert.equal(result.boundary.prompt_sent_to_model, false);
  assert.equal(result.boundary.request_body_created, false);
  assert.equal(result.boundary.request_body_sent, false);
  assert.equal(result.boundary.response_body_exposed, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.endpoint_value_exposed, false);
  assert.equal(result.boundary.model_value_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.user_prompt_sent_to_model, false);
  assert.equal(result.boundary.business_context_sent_to_model, false);
  assert.equal(result.boundary.business_prompt_sent_to_model, false);
  assert.equal(result.boundary.fixed_smoke_prompt_sent_to_model, false);
  assert.equal(result.boundary.fixed_business_dummy_prompt_sent_to_model, false);
  assert.equal(result.boundary.tokens_used, 0);
}

async function main() {
  const result = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今日の作業計画を整理して",
    provider: "business_prompt_policy_gate",
    dryRun: true,
  });

  assert.equal(result.result, "blocked");
  assert.equal(result.switch.mode, "hermes_llm_adapter_switch_boundary");
  assert.equal(result.switch.requested_provider, "business_prompt_policy_gate");
  assert.equal(result.switch.selected_provider, "mock");
  assert.equal(result.switch.fallback_provider, "mock");
  assert.equal(result.switch.provider_execution_mode, "dry_run_only");
  assert.equal(result.switch.adapter_result, undefined);
  assert.equal(
    result.switch.blocked_reason,
    "local_llm_provider_disabled_by_day50_business_prompt_policy_gate_boundary",
  );
  assert.equal(
    result.switch.matched_policy,
    "business_prompt_policy_gate_dry_run_only",
  );

  assert.ok(result.switch.health_check_status);
  assert.ok(result.switch.health_probe_status);
  assert.ok(result.switch.prompt_smoke_status);
  assert.ok(result.switch.business_prompt_contract_status);
  assert.ok(result.switch.business_prompt_smoke_status);
  assert.ok(result.switch.business_prompt_policy_gate_status);

  assert.equal(
    result.switch.business_prompt_policy_gate_status.mode,
    "hermes_business_prompt_policy_gate_redaction_boundary",
  );
  assert.equal(
    result.switch.business_prompt_policy_gate_status.policy_gate_mode,
    "dry_run_policy_gate_only",
  );
  assert.equal(
    result.switch.business_prompt_policy_gate_status.runtime_call_allowed,
    false,
  );
  assert.equal(
    result.switch.business_prompt_policy_gate_status.request_body_created,
    false,
  );
  assert.equal(
    result.switch.business_prompt_policy_gate_status.request_body_sent,
    false,
  );
  assert.equal(result.switch.business_prompt_policy_gate_status.prompt_sent, false);
  assert.equal(
    result.switch.business_prompt_policy_gate_status.raw_prompt_exposed,
    false,
  );
  assert.equal(
    result.switch.business_prompt_policy_gate_status
      .sanitized_prompt_preview_exposed,
    "safe_metadata_only",
  );
  assert.equal(
    result.switch.business_prompt_policy_gate_status.fallback_provider,
    "mock",
  );
  assert.equal(result.switch.business_prompt_policy_gate_status.tokens_used, 0);

  assertSwitchBoundarySafe(result);

  const localAlias = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今日の作業計画を整理して",
    provider: "local_llm_business_prompt_policy_gate",
    dryRun: true,
  });

  assert.equal(localAlias.result, "blocked");
  assert.equal(
    localAlias.switch.requested_provider,
    "local_llm_business_prompt_policy_gate",
  );
  assert.ok(localAlias.switch.business_prompt_policy_gate_status);
  assert.equal(localAlias.switch.selected_provider, "mock");
  assert.equal(localAlias.boundary.llm_runtime_executed, false);
  assert.equal(localAlias.boundary.prompt_sent_to_model, false);
  assert.equal(localAlias.boundary.request_body_created, false);
  assert.equal(localAlias.boundary.request_body_sent, false);

  const localLlmAlias = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "Hermes提案レビュー状況を教えて",
    provider: "local_llm",
    dryRun: true,
  });

  assert.equal(localLlmAlias.result, "blocked");
  assert.equal(localLlmAlias.switch.requested_provider, "local_llm");
  assert.ok(localLlmAlias.switch.business_prompt_policy_gate_status);
  assert.equal(localLlmAlias.switch.selected_provider, "mock");
  assert.equal(localLlmAlias.boundary.llm_runtime_executed, false);
  assert.equal(localLlmAlias.boundary.prompt_sent_to_model, false);
  assert.equal(localLlmAlias.boundary.business_prompt_sent_to_model, false);
  assert.equal(localLlmAlias.boundary.fixed_business_dummy_prompt_sent_to_model, false);
  assert.equal(localLlmAlias.boundary.request_body_created, false);
  assert.equal(localLlmAlias.boundary.request_body_sent, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked:
          "hermes_llm_adapter_switch_business_prompt_policy_gate_integration",
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
