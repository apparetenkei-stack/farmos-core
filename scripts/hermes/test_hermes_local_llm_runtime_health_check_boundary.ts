import assert from "node:assert/strict";

import { runHermesLocalLlmRuntimeHealthCheckBoundary } from "./api_boundary/hermes_local_llm_runtime_health_check_boundary";

async function main() {
  const result = runHermesLocalLlmRuntimeHealthCheckBoundary({
    provider: "local_llm_disabled",
    dryRun: true,
  });

  assert.equal(result.result, "ok");
  assert.equal(
    result.health_check.mode,
    "hermes_local_llm_runtime_health_check_boundary",
  );
  assert.equal(result.health_check.runtime, "local_llm");
  assert.equal(result.health_check.health_check_mode, "dry_run_contract_only");
  assert.equal(result.health_check.configured_provider, "local_llm_disabled");
  assert.equal(
    result.health_check.endpoint_config_key,
    "HERMES_LOCAL_LLM_ENDPOINT",
  );
  assert.equal(result.health_check.model_config_key, "HERMES_LOCAL_LLM_MODEL");
  assert.equal(result.health_check.endpoint_value_exposed, false);
  assert.equal(result.health_check.model_value_exposed, false);
  assert.equal(result.health_check.credentials_required, false);
  assert.equal(result.health_check.credentials_exposed, false);
  assert.equal(result.health_check.runtime_reachable, "not_checked_by_day45");
  assert.equal(result.health_check.runtime_call_allowed, false);
  assert.equal(result.health_check.prompt_sent, false);

  assert.equal(result.health_check.timeout_policy.connect_timeout_ms, 1000);
  assert.equal(result.health_check.timeout_policy.total_timeout_ms, 3000);
  assert.equal(result.health_check.timeout_policy.on_timeout, "fallback_to_mock");

  assert.equal(result.health_check.fallback_policy.fallback_provider, "mock");
  assert.equal(
    result.health_check.fallback_policy.fallback_reason,
    "local_llm_runtime_not_enabled_by_day45",
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
  assert.equal(result.boundary.model_value_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.tokens_used, 0);

  const nonDryRun = runHermesLocalLlmRuntimeHealthCheckBoundary({
    provider: "local_llm_disabled",
    dryRun: false,
  });

  assert.equal(nonDryRun.result, "blocked");
  assert.equal(nonDryRun.boundary.llm_runtime_executed, false);
  assert.equal(nonDryRun.boundary.local_runtime_health_http_called, false);
  assert.equal(nonDryRun.boundary.prompt_sent_to_model, false);

  const badProvider = runHermesLocalLlmRuntimeHealthCheckBoundary({
    provider: "unknown",
    dryRun: true,
  });

  assert.equal(badProvider.result, "bad_request");
  assert.equal(badProvider.boundary.writes_performed, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_local_llm_runtime_health_check_boundary",
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
