import assert from "node:assert/strict";

import { runHermesLlmAdapterSwitchBoundary } from "./api_boundary/hermes_llm_adapter_switch_boundary";

async function main() {
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
  assert.equal(result.switch.health_check_status.runtime, "local_llm");
  assert.equal(
    result.switch.health_check_status.health_check_mode,
    "dry_run_contract_only",
  );
  assert.equal(
    result.switch.health_check_status.configured_provider,
    "local_llm_disabled",
  );
  assert.equal(
    result.switch.health_check_status.runtime_reachable,
    "not_checked_by_day45",
  );
  assert.equal(result.switch.health_check_status.runtime_call_allowed, false);
  assert.equal(result.switch.health_check_status.prompt_sent, false);
  assert.equal(result.switch.health_check_status.endpoint_value_exposed, false);
  assert.equal(result.switch.health_check_status.model_value_exposed, false);
  assert.equal(result.switch.health_check_status.credentials_exposed, false);
  assert.equal(
    result.switch.health_check_status.fallback_policy.fallback_provider,
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

  const disabledAlias = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今のHermes提案レビュー状況を教えて",
    provider: "local_llm_disabled",
    dryRun: true,
  });

  assert.equal(disabledAlias.result, "blocked");
  assert.equal(disabledAlias.switch.requested_provider, "local_llm_disabled");
  assert.ok(disabledAlias.switch.health_check_status);
  assert.equal(disabledAlias.boundary.llm_runtime_executed, false);
  assert.equal(disabledAlias.boundary.local_runtime_health_http_called, false);
  assert.equal(disabledAlias.boundary.prompt_sent_to_model, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_llm_adapter_switch_local_health_integration",
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
