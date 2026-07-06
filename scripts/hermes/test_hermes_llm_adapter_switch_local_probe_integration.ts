import assert from "node:assert/strict";

import { runHermesLlmAdapterSwitchBoundary } from "./api_boundary/hermes_llm_adapter_switch_boundary";

async function main() {
  const previousEndpoint = process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;

  try {
    const result = await runHermesLlmAdapterSwitchBoundary({
      userMessage: "今のHermes提案レビュー状況を教えて",
      provider: "local_llm",
      dryRun: true,
    });

    assert.equal(result.result, "blocked");
    assert.equal(result.switch.mode, "hermes_llm_adapter_switch_boundary");
    assert.equal(result.switch.requested_provider, "local_llm");
    assert.equal(result.switch.selected_provider, "mock");
    assert.equal(result.switch.fallback_provider, "mock");
    assert.equal(result.switch.provider_execution_mode, "dry_run_only");
    assert.equal(result.switch.adapter_result, undefined);

    assert.ok(result.switch.health_check_status);
    assert.equal(
      result.switch.health_check_status.mode,
      "hermes_local_llm_runtime_health_check_boundary",
    );
    assert.equal(
      result.switch.health_check_status.health_check_mode,
      "dry_run_contract_only",
    );
    assert.equal(result.switch.health_check_status.runtime_call_allowed, false);
    assert.equal(result.switch.health_check_status.endpoint_value_exposed, false);
    assert.equal(result.switch.health_check_status.credentials_exposed, false);

    assert.ok(result.switch.health_probe_status);
    assert.equal(
      result.switch.health_probe_status.mode,
      "hermes_local_llm_runtime_health_probe_boundary",
    );
    assert.equal(
      result.switch.health_probe_status.health_probe_mode,
      "minimal_runtime_reachability_probe",
    );
    assert.equal(
      result.switch.health_probe_status.configured_provider,
      "local_llm_probe",
    );
    assert.equal(
      result.switch.health_probe_status.endpoint_config_key,
      "HERMES_LOCAL_LLM_HEALTH_ENDPOINT",
    );
    assert.equal(
      result.switch.health_probe_status.model_config_key,
      "HERMES_LOCAL_LLM_MODEL",
    );
    assert.equal(result.switch.health_probe_status.endpoint_value_exposed, false);
    assert.equal(result.switch.health_probe_status.model_value_exposed, false);
    assert.equal(result.switch.health_probe_status.credentials_exposed, false);
    assert.equal(result.switch.health_probe_status.response_body_exposed, false);
    assert.equal(
      result.switch.health_probe_status.runtime_call_allowed,
      "true_for_health_probe_only",
    );
    assert.equal(result.switch.health_probe_status.prompt_sent, false);
    assert.equal(
      result.switch.health_probe_status.fallback_policy.fallback_provider,
      "mock",
    );

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
    assert.equal(result.boundary.prompt_sent_to_model, false);
    assert.equal(result.boundary.embeddings_executed, false);
    assert.equal(result.boundary.vector_search_executed, false);
    assert.equal(result.boundary.restricted_domain_data_exposed, false);
    assert.equal(result.boundary.endpoint_value_exposed, false);
    assert.equal(result.boundary.credentials_exposed, false);
    assert.equal(result.boundary.tokens_used, 0);

    const probeAlias = await runHermesLlmAdapterSwitchBoundary({
      userMessage: "今のHermes提案レビュー状況を教えて",
      provider: "local_llm_probe",
      dryRun: true,
    });

    assert.equal(probeAlias.result, "blocked");
    assert.equal(probeAlias.switch.requested_provider, "local_llm_probe");
    assert.ok(probeAlias.switch.health_probe_status);
    assert.equal(probeAlias.boundary.llm_runtime_executed, false);
    assert.equal(probeAlias.boundary.local_runtime_health_http_called, false);
    assert.equal(probeAlias.boundary.prompt_sent_to_model, false);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checked: "hermes_llm_adapter_switch_local_probe_integration",
        },
        null,
        2,
      ),
    );
  } finally {
    if (previousEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT = previousEndpoint;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
