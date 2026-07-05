import assert from "node:assert/strict";

import { runHermesLlmAdapterMockBoundary } from "./api_boundary/hermes_llm_adapter_mock_boundary";

async function main() {
  const result = await runHermesLlmAdapterMockBoundary({
    userMessage: "今のHermes提案レビュー状況を教えて",
    safeContext: {
      hermes_note_count: 5,
      pending_hermes_note_count: 5,
      protected_proposal_status: "pending",
    },
  });

  assert.equal(result.result, "ok");
  assert.equal(result.adapter.mode, "hermes_llm_adapter_mock_boundary");
  assert.equal(result.adapter.provider, "mock");
  assert.equal(result.adapter.model, "deterministic_day43_mock");
  assert.equal(result.adapter.input_accepted, true);
  assert.equal(result.adapter.output.role, "assistant");
  assert.equal(typeof result.adapter.output.content, "string");
  assert.ok(result.adapter.output.content.length > 0);

  assert.equal(result.adapter.runtime.llm_runtime_executed, false);
  assert.equal(result.adapter.runtime.external_api_called, false);
  assert.equal(result.adapter.runtime.local_model_called, false);
  assert.equal(result.adapter.runtime.tokens_used, 0);

  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);

  const blocked = await runHermesLlmAdapterMockBoundary({
    userMessage: "この提案をapplyして",
  });

  assert.equal(blocked.result, "blocked");
  assert.equal(blocked.adapter.runtime.llm_runtime_executed, false);
  assert.equal(blocked.adapter.runtime.external_api_called, false);
  assert.equal(blocked.adapter.runtime.local_model_called, false);
  assert.equal(blocked.boundary.writes_performed, false);
  assert.equal(blocked.boundary.proposal_apply_allowed, false);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_llm_adapter_mock_boundary",
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
