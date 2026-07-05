import assert from "node:assert/strict";

import { runHermesLlmAdapterSwitchBoundary } from "./api_boundary/hermes_llm_adapter_switch_boundary";

async function main() {
  const result = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今のHermes提案レビュー状況を教えて",
    provider: "mock",
    dryRun: true,
    safeContext: {
      hermes_note_count: 5,
      pending_hermes_note_count: 5,
      protected_proposal_status: "pending",
    },
  });

  assert.equal(result.result, "ok");
  assert.equal(result.switch.mode, "hermes_llm_adapter_switch_boundary");
  assert.equal(result.switch.requested_provider, "mock");
  assert.equal(result.switch.selected_provider, "mock");
  assert.equal(result.switch.fallback_provider, "mock");
  assert.equal(result.switch.provider_execution_mode, "dry_run_only");

  assert.equal(result.switch.provider_capabilities.mock.available, true);
  assert.equal(result.switch.provider_capabilities.mock.executable, true);
  assert.equal(result.switch.provider_capabilities.mock.runtime_call_allowed, false);

  assert.equal(result.switch.provider_capabilities.local_llm_disabled.available, false);
  assert.equal(result.switch.provider_capabilities.local_llm_disabled.executable, false);
  assert.equal(
    result.switch.provider_capabilities.local_llm_disabled.runtime_call_allowed,
    false,
  );

  assert.equal(result.switch.provider_capabilities.external_llm_disabled.available, false);
  assert.equal(result.switch.provider_capabilities.external_llm_disabled.executable, false);
  assert.equal(
    result.switch.provider_capabilities.external_llm_disabled.runtime_call_allowed,
    false,
  );

  assert.ok(result.switch.adapter_result);
  assert.equal(
    result.switch.adapter_result.adapter,
    "hermes_llm_adapter_mock_boundary",
  );
  assert.equal(
    result.switch.adapter_result.response_kind,
    "deterministic_mock_response",
  );
  assert.ok(result.switch.adapter_result.content.length > 0);
  assert.equal(result.switch.adapter_result.runtime.llm_runtime_executed, false);
  assert.equal(result.switch.adapter_result.runtime.external_api_called, false);
  assert.equal(result.switch.adapter_result.runtime.local_model_called, false);
  assert.equal(result.switch.adapter_result.runtime.tokens_used, 0);

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
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);

  const disabledLocal = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今のHermes提案レビュー状況を教えて",
    provider: "local_llm",
    dryRun: true,
  });

  assert.equal(disabledLocal.result, "blocked");
  assert.equal(disabledLocal.switch.requested_provider, "local_llm");
  assert.equal(disabledLocal.switch.selected_provider, "mock");
  assert.equal(disabledLocal.switch.fallback_provider, "mock");
  assert.equal(disabledLocal.switch.adapter_result, undefined);
  assert.equal(disabledLocal.boundary.llm_runtime_executed, false);
  assert.equal(disabledLocal.boundary.external_api_called, false);
  assert.equal(disabledLocal.boundary.local_model_called, false);
  assert.equal(disabledLocal.boundary.credentials_exposed, false);

  const disabledExternal = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今のHermes提案レビュー状況を教えて",
    provider: "external_llm",
    dryRun: true,
  });

  assert.equal(disabledExternal.result, "blocked");
  assert.equal(disabledExternal.switch.requested_provider, "external_llm");
  assert.equal(disabledExternal.switch.adapter_result, undefined);
  assert.equal(disabledExternal.boundary.llm_runtime_executed, false);
  assert.equal(disabledExternal.boundary.external_api_called, false);
  assert.equal(disabledExternal.boundary.local_model_called, false);
  assert.equal(disabledExternal.boundary.credentials_exposed, false);

  const nonDryRun = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "今のHermes提案レビュー状況を教えて",
    provider: "mock",
    dryRun: false,
  });

  assert.equal(nonDryRun.result, "blocked");
  assert.equal(nonDryRun.boundary.writes_performed, false);
  assert.equal(nonDryRun.boundary.llm_runtime_executed, false);

  const blockedRequest = await runHermesLlmAdapterSwitchBoundary({
    userMessage: "この提案をapplyして",
    provider: "mock",
    dryRun: true,
  });

  assert.equal(blockedRequest.result, "blocked");
  assert.equal(blockedRequest.switch.adapter_result, undefined);
  assert.equal(blockedRequest.boundary.proposal_apply_allowed, false);
  assert.equal(blockedRequest.boundary.llm_runtime_executed, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_llm_adapter_switch_boundary",
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
