import assert from "node:assert/strict";

import {
  runHermesCliChatRuntime,
} from "./llm_runtime/hermes_cli_chat_runtime";
import type {
  HermesFarmosReadonlyContextEnvelope,
} from "./llm_runtime/hermes_farmos_readonly_context";

const contextText = JSON.stringify({
  scope: "hermes_memory_context_minimum",
  proposal_context: {
    proposal_id: "24fc24ee-8efa-436b-8424-9703edeeb297",
    proposal_status: "pending",
  },
  safe_app_context: {
    crop_cycle_count: 2,
    recent_crop_cycles: [
      {
        id: 1,
        crop_name: "test crop",
        status: "active",
      },
    ],
  },
  boundary: {
    transaction_read_only: true,
    writes_performed: false,
  },
});

function makeIncludedReadonlyContext(): HermesFarmosReadonlyContextEnvelope {
  return {
    readonly_context_allowed: true,
    readonly_context_requested: true,
    readonly_context_read_performed: true,
    readonly_context_included: true,
    readonly_context_non_empty: true,
    readonly_context_length: contextText.length,
    readonly_context_truncated: false,
    readonly_context_source: "farmos_readonly",
    readonly_context_max_chars: 2000,
    context_write_allowed: false,
    db_read_performed: true,
    db_write_performed: false,
    context_text: contextText,
    error_message: null,
  };
}

function makeFailedReadonlyContext(): HermesFarmosReadonlyContextEnvelope {
  return {
    readonly_context_allowed: true,
    readonly_context_requested: true,
    readonly_context_read_performed: true,
    readonly_context_included: false,
    readonly_context_non_empty: false,
    readonly_context_length: 0,
    readonly_context_truncated: false,
    readonly_context_source: "farmos_readonly",
    readonly_context_max_chars: 2000,
    context_write_allowed: false,
    db_read_performed: true,
    db_write_performed: false,
    context_text: null,
    error_message: "simulated_read_failure",
  };
}

function assertNoWrites(result: Awaited<ReturnType<typeof runHermesCliChatRuntime>>): void {
  assert.equal(result.context_write_allowed, false);
  assert.equal(result.db_write_performed, false);
  assert.equal(result.proposal_created, false);
  assert.equal(result.proposal_saved, false);
  assert.equal(result.proposal_apply_performed, false);
  assert.equal(result.chat_history_saved, false);
  assert.equal(result.audit_record_saved, false);
  assert.equal(result.app_db_write_performed, false);
  assert.equal(result.route_added, false);
  assert.equal(result.server_action_added, false);
  assert.equal(result.form_action_added, false);
  assert.equal(result.ui_changed, false);
  assert.equal(result.credentials_exposed, false);
  assert.equal(result.business_context_included, false);
  assert.equal(result.proposal_context_included, false);
}

async function main(): Promise<void> {
  const notRequested = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "mock",
    message: "hello hermes",
    includeReadonlyContext: false,
  });

  assert.equal(notRequested.status, "mock_fallback");
  assert.equal(notRequested.readonly_context_allowed, true);
  assert.equal(notRequested.readonly_context_requested, false);
  assert.equal(notRequested.readonly_context_read_performed, false);
  assert.equal(notRequested.readonly_context_included, false);
  assert.equal(notRequested.db_read_performed, false);
  assert.equal(notRequested.farm_context_included, false);
  assert.equal(notRequested.db_context_included, false);
  assertNoWrites(notRequested);

  let disabledReadCount = 0;
  const disabledMode = await runHermesCliChatRuntime({
    smokeTestEnabled: false,
    provider: "ollama",
    message: "summarize read-only farmos context availability",
    includeReadonlyContext: true,
    readonlyContextReader: async () => {
      disabledReadCount += 1;
      return makeIncludedReadonlyContext();
    },
  });

  assert.equal(disabledReadCount, 1);
  assert.equal(disabledMode.status, "disabled_by_env");
  assert.equal(disabledMode.runtime_call_allowed, false);
  assert.equal(disabledMode.llm_runtime_executed, false);
  assert.equal(disabledMode.prompt_sent, false);
  assert.equal(disabledMode.readonly_context_requested, true);
  assert.equal(disabledMode.readonly_context_read_performed, true);
  assert.equal(disabledMode.readonly_context_included, true);
  assert.equal(disabledMode.readonly_context_non_empty, true);
  assert.equal(disabledMode.readonly_context_length, contextText.length);
  assert.equal(disabledMode.db_read_performed, true);
  assert.equal(disabledMode.farm_context_included, true);
  assert.equal(disabledMode.db_context_included, true);
  assertNoWrites(disabledMode);

  const mockMode = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "mock",
    message: "summarize read-only farmos context availability",
    includeReadonlyContext: true,
    readonlyContextReader: async () => makeIncludedReadonlyContext(),
  });

  assert.equal(mockMode.status, "mock_fallback");
  assert.equal(mockMode.response_text_non_empty, true);
  assert.equal(mockMode.readonly_context_included, true);
  assert.equal(mockMode.db_read_performed, true);
  assert.equal(mockMode.farm_context_included, true);
  assert.equal(mockMode.db_context_included, true);
  assertNoWrites(mockMode);

  let capturedPromptBody = "";
  const fakeFetch: typeof fetch = async (_input, init) => {
    capturedPromptBody = String(init?.body ?? "");

    return new Response(
      JSON.stringify({
        response: "hermes readonly context ok",
        done: true,
        prompt_eval_count: 0,
        eval_count: 0,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  };

  const injectedOllamaMode = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    timeoutMs: 30000,
    message: "Reply with exactly: hermes readonly context ok",
    includeReadonlyContext: true,
    readonlyContextReader: async () => makeIncludedReadonlyContext(),
    fetchImpl: fakeFetch,
  });

  assert.equal(injectedOllamaMode.status, "ok");
  assert.equal(injectedOllamaMode.runtime_call_allowed, true);
  assert.equal(injectedOllamaMode.llm_runtime_executed, true);
  assert.equal(injectedOllamaMode.runtime_reachable, true);
  assert.equal(injectedOllamaMode.prompt_sent, true);
  assert.equal(injectedOllamaMode.response_text, "hermes readonly context ok");
  assert.equal(injectedOllamaMode.response_text_non_empty, true);
  assert.equal(injectedOllamaMode.readonly_context_requested, true);
  assert.equal(injectedOllamaMode.readonly_context_read_performed, true);
  assert.equal(injectedOllamaMode.readonly_context_included, true);
  assert.equal(injectedOllamaMode.readonly_context_non_empty, true);
  assert.equal(injectedOllamaMode.readonly_context_source, "farmos_readonly");
  assert.equal(injectedOllamaMode.readonly_context_max_chars, 2000);
  assert.equal(injectedOllamaMode.context_write_allowed, false);
  assert.equal(injectedOllamaMode.db_read_performed, true);
  assert.equal(injectedOllamaMode.farm_context_included, true);
  assert.equal(injectedOllamaMode.db_context_included, true);
  assert.match(capturedPromptBody, /READ_ONLY_FARMOS_CONTEXT/u);
  assert.match(capturedPromptBody, /USER_MESSAGE/u);
  assert.match(capturedPromptBody, /hermes_memory_context_minimum/u);
  assert.match(capturedPromptBody, /Reply with exactly: hermes readonly context ok/u);
  assertNoWrites(injectedOllamaMode);

  let invalidReadCount = 0;
  const invalidMessage = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "mock",
    message: "",
    includeReadonlyContext: true,
    readonlyContextReader: async () => {
      invalidReadCount += 1;
      return makeIncludedReadonlyContext();
    },
  });

  assert.equal(invalidMessage.status, "bad_request");
  assert.equal(invalidReadCount, 0);
  assert.equal(invalidMessage.readonly_context_requested, true);
  assert.equal(invalidMessage.readonly_context_read_performed, false);
  assert.equal(invalidMessage.db_read_performed, false);
  assertNoWrites(invalidMessage);

  const failedContext = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "ollama",
    message: "hello hermes",
    includeReadonlyContext: true,
    readonlyContextReader: async () => makeFailedReadonlyContext(),
    fetchImpl: async () => {
      throw new Error("fetch must not run when context read fails");
    },
  });

  assert.equal(failedContext.status, "runtime_error");
  assert.equal(failedContext.runtime_call_allowed, false);
  assert.equal(failedContext.llm_runtime_executed, false);
  assert.equal(failedContext.prompt_sent, false);
  assert.equal(failedContext.readonly_context_requested, true);
  assert.equal(failedContext.readonly_context_read_performed, true);
  assert.equal(failedContext.readonly_context_included, false);
  assert.equal(failedContext.db_read_performed, true);
  assert.match(failedContext.error_message ?? "", /readonly_context_read_failed/u);
  assertNoWrites(failedContext);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_cli_chat_readonly_context_injection",
    disabled_mode: "ok",
    mock_provider_mode: "ok",
    injected_ollama_mode: "ok",
    input_validation: "ok",
    context_read_failure_mode: "ok",
    unit_test_network_dependency: false,
    readonly_context_requested: true,
    readonly_context_read_performed: true,
    readonly_context_included: true,
    db_read_performed: true,
    db_write_performed: false,
    no_db_write_assertion: "ok",
    no_route_or_action_assertion: "ok",
    business_context_included: false,
    farm_context_included: true,
    db_context_included: true,
    proposal_context_included: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
