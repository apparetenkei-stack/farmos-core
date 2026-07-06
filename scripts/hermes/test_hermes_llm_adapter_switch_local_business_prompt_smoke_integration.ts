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
  const previousBusinessSmokeEndpoint =
    process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT;
  const previousSmokeEndpoint = process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
  const previousChatEndpoint = process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  const previousHealthEndpoint = process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
  const previousModel = process.env.HERMES_LOCAL_LLM_MODEL;

  delete process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_MODEL;

  try {
    const result = await runHermesLlmAdapterSwitchBoundary({
      userMessage: "今日の作業計画を整理して",
      provider: "local_llm_business_prompt_smoke",
      dryRun: true,
    });

    assert.equal(result.result, "blocked");
    assert.equal(result.switch.mode, "hermes_llm_adapter_switch_boundary");
    assert.equal(
      result.switch.requested_provider,
      "local_llm_business_prompt_smoke",
    );
    assert.equal(result.switch.selected_provider, "mock");
    assert.equal(result.switch.fallback_provider, "mock");
    assert.equal(result.switch.provider_execution_mode, "dry_run_only");
    assert.equal(result.switch.adapter_result, undefined);
    assert.equal(
      result.switch.blocked_reason,
      "local_llm_provider_disabled_by_day49_business_prompt_smoke_boundary",
    );
    assert.equal(
      result.switch.matched_policy,
      "local_llm_fixed_business_dummy_prompt_smoke_only",
    );

    assert.ok(result.switch.health_check_status);
    assert.equal(
      result.switch.health_check_status.mode,
      "hermes_local_llm_runtime_health_check_boundary",
    );
    assert.equal(result.switch.health_check_status.runtime_call_allowed, false);
    assert.equal(result.switch.health_check_status.endpoint_value_exposed, false);
    assert.equal(result.switch.health_check_status.credentials_exposed, false);

    assert.ok(result.switch.health_probe_status);
    assert.equal(
      result.switch.health_probe_status.mode,
      "hermes_local_llm_runtime_health_probe_boundary",
    );
    assert.equal(result.switch.health_probe_status.prompt_sent, false);
    assert.equal(result.switch.health_probe_status.response_body_exposed, false);
    assert.equal(result.switch.health_probe_status.endpoint_value_exposed, false);
    assert.equal(result.switch.health_probe_status.credentials_exposed, false);

    assert.ok(result.switch.prompt_smoke_status);
    assert.equal(
      result.switch.prompt_smoke_status.mode,
      "hermes_local_llm_prompt_smoke_test_boundary",
    );
    assert.equal(
      result.switch.prompt_smoke_status.prompt_smoke_mode,
      "fixed_non_business_prompt_only",
    );
    assert.equal(result.switch.prompt_smoke_status.prompt_sent, false);
    assert.equal(result.switch.prompt_smoke_status.response_body_exposed, false);
    assert.equal(result.switch.prompt_smoke_status.endpoint_value_exposed, false);
    assert.equal(result.switch.prompt_smoke_status.model_value_exposed, false);
    assert.equal(result.switch.prompt_smoke_status.credentials_exposed, false);

    assert.ok(result.switch.business_prompt_contract_status);
    assert.equal(
      result.switch.business_prompt_contract_status.mode,
      "hermes_local_llm_business_prompt_dry_run_contract_boundary",
    );
    assert.equal(
      result.switch.business_prompt_contract_status.contract_mode,
      "business_prompt_dry_run_contract_only",
    );
    assert.equal(
      result.switch.business_prompt_contract_status.runtime_call_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.business_prompt_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.user_prompt_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.business_context_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.restricted_domain_data_allowed,
      false,
    );
    assert.equal(result.switch.business_prompt_contract_status.prompt_sent, false);
    assert.equal(
      result.switch.business_prompt_contract_status.request_body_created,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.request_body_sent,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.response_body_exposed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_contract_status.fallback_policy
        .fallback_provider,
      "mock",
    );
    assert.equal(result.switch.business_prompt_contract_status.tokens_used, 0);

    assert.ok(result.switch.business_prompt_smoke_status);
    assert.equal(
      result.switch.business_prompt_smoke_status.mode,
      "hermes_local_llm_business_prompt_smoke_test_boundary",
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.prompt_smoke_mode,
      "fixed_business_dummy_prompt_only",
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.configured_provider,
      "local_llm_business_prompt_smoke",
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.runtime_call_allowed,
      "true_for_fixed_business_dummy_prompt_only",
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.fixed_business_dummy_prompt_allowed,
      true,
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.real_business_prompt_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.user_prompt_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.business_context_allowed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.restricted_domain_data_allowed,
      false,
    );
    assert.equal(result.switch.business_prompt_smoke_status.prompt_sent, false);
    assert.equal(
      result.switch.business_prompt_smoke_status.response_body_exposed,
      false,
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.response_match_result,
      "not_configured",
    );
    assert.equal(
      result.switch.business_prompt_smoke_status.fallback_policy
        .fallback_provider,
      "mock",
    );
    assert.equal(result.switch.business_prompt_smoke_status.tokens_used, 0);

    assertSwitchBoundarySafe(result);

    const localLlmAlias = await runHermesLlmAdapterSwitchBoundary({
      userMessage: "今のHermes提案レビュー状況を教えて",
      provider: "local_llm",
      dryRun: true,
    });

    assert.equal(localLlmAlias.result, "blocked");
    assert.equal(localLlmAlias.switch.requested_provider, "local_llm");
    assert.ok(localLlmAlias.switch.health_check_status);
    assert.ok(localLlmAlias.switch.health_probe_status);
    assert.ok(localLlmAlias.switch.prompt_smoke_status);
    assert.ok(localLlmAlias.switch.business_prompt_contract_status);
    assert.ok(localLlmAlias.switch.business_prompt_smoke_status);
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
            "hermes_llm_adapter_switch_local_business_prompt_smoke_integration",
        },
        null,
        2,
      ),
    );
  } finally {
    if (previousBusinessSmokeEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT =
        previousBusinessSmokeEndpoint;
    }

    if (previousSmokeEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT = previousSmokeEndpoint;
    }

    if (previousChatEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT = previousChatEndpoint;
    }

    if (previousHealthEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT = previousHealthEndpoint;
    }

    if (previousModel === undefined) {
      delete process.env.HERMES_LOCAL_LLM_MODEL;
    } else {
      process.env.HERMES_LOCAL_LLM_MODEL = previousModel;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
