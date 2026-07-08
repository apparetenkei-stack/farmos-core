import assert from "node:assert/strict";

import {
  HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS,
  runHermesCliChatRuntime,
  runHermesCliChatRuntimeFromEnv,
  type HermesCliChatResponseEnvelope,
} from "./llm_runtime/hermes_cli_chat_runtime";

function assertNoSideEffects(result: HermesCliChatResponseEnvelope): void {
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
  assert.equal(result.credentials_required, false);
  assert.equal(result.credentials_exposed, false);
  assert.equal(result.external_api_called, false);
  assert.equal(result.business_context_included, false);
  assert.equal(result.farm_context_included, false);
  assert.equal(result.db_context_included, false);
  assert.equal(result.proposal_context_included, false);
}

function assertAcceptedInput(
  result: HermesCliChatResponseEnvelope,
  message: string,
): void {
  assert.equal(result.input_message_received, true);
  assert.equal(result.input_message_non_empty, true);
  assert.equal(result.input_message_length, message.length);
  assert.equal(result.input_message_too_long, false);
  assert.equal(result.input_message_multiline, false);
  assert.equal(result.max_input_message_chars, 500);
  assert.equal(result.multi_line_message_allowed, false);
  assert.equal(result.empty_message_allowed, false);
}

async function assertDisabledMode(): Promise<void> {
  let fetchCalled = false;
  const message = "hello hermes";

  const result = await runHermesCliChatRuntime({
    smokeTestEnabled: false,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    message,
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response("{}");
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.mode, "hermes_cli_chat_minimal_runtime");
  assert.equal(result.provider, "ollama");
  assert.equal(result.status, "disabled_by_env");
  assert.equal(result.runtime_call_allowed, false);
  assert.equal(result.llm_runtime_executed, false);
  assert.equal(result.runtime_reachable, false);
  assert.equal(result.prompt_sent, false);
  assert.equal(result.response_text, null);
  assertAcceptedInput(result, message);
  assertNoSideEffects(result);
}

async function assertMockProviderMode(): Promise<void> {
  let fetchCalled = false;
  const message = "hello hermes";

  const result = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "mock",
    message,
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response("{}");
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.provider, "mock");
  assert.equal(result.status, "mock_fallback");
  assert.equal(result.runtime_call_allowed, false);
  assert.equal(result.llm_runtime_executed, false);
  assert.equal(result.prompt_sent, false);
  assert.equal(result.response_text, "hermes mock provider response");
  assert.equal(result.response_text_non_empty, true);
  assert.equal(result.tokens_used, 0);
  assertAcceptedInput(result, message);
  assertNoSideEffects(result);
}

async function assertOllamaPromptPassThrough(): Promise<void> {
  let fetchCalled = false;
  const message = "hello from cli";

  const result = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    timeoutMs: 5000,
    message,
    fetchImpl: async (input, init) => {
      fetchCalled = true;
      assert.equal(String(input), "http://127.0.0.1:11434/api/generate");
      assert.equal(init?.method, "POST");

      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.model, "qwen3.5:4b");
      assert.equal(body.prompt, message);
      assert.equal(body.stream, false);

      return new Response(
        JSON.stringify({
          response: "hello from ollama",
          prompt_eval_count: 4,
          eval_count: 3,
          done: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  });

  assert.equal(fetchCalled, true);
  assert.equal(result.provider, "ollama");
  assert.equal(result.status, "ok");
  assert.equal(result.runtime_call_allowed, true);
  assert.equal(result.llm_runtime_executed, true);
  assert.equal(result.runtime_reachable, true);
  assert.equal(result.prompt_sent, true);
  assert.equal(result.response_text, "hello from ollama");
  assert.equal(result.response_text_non_empty, true);
  assert.equal(result.tokens_used, 7);
  assertAcceptedInput(result, message);
  assertNoSideEffects(result);
}

async function assertInvalidInputs(): Promise<void> {
  const cases: Array<{
    message?: string;
    error: string;
    tooLong?: boolean;
    multiline?: boolean;
    length: number;
  }> = [
    { error: "cli_chat_message_missing", length: 0 },
    { message: "   ", error: "cli_chat_message_empty", length: 3 },
    {
      message: "hello\nhermes",
      error: "cli_chat_message_multiline_not_allowed",
      multiline: true,
      length: "hello\nhermes".length,
    },
    {
      message: "x".repeat(HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS + 1),
      error: "cli_chat_message_too_long",
      tooLong: true,
      length: HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS + 1,
    },
  ];

  for (const testCase of cases) {
    let fetchCalled = false;
    const result = await runHermesCliChatRuntime({
      smokeTestEnabled: true,
      provider: "ollama",
      message: testCase.message,
      fetchImpl: async () => {
        fetchCalled = true;
        return new Response("{}");
      },
    });

    assert.equal(fetchCalled, false);
    assert.equal(result.status, "bad_request");
    assert.equal(result.error_message, testCase.error);
    assert.equal(result.input_message_length, testCase.length);
    assert.equal(result.input_message_too_long, testCase.tooLong ?? false);
    assert.equal(result.input_message_multiline, testCase.multiline ?? false);
    assert.equal(result.prompt_sent, false);
    assertNoSideEffects(result);
  }
}

async function assertUnsupportedProvider(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesCliChatRuntime({
    smokeTestEnabled: true,
    provider: "unknown",
    message: "hello hermes",
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response("{}");
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.status, "bad_request");
  assert.equal(result.error_message, "unsupported_llm_provider");
  assert.equal(result.prompt_sent, false);
  assertNoSideEffects(result);
}

async function assertEnvAndArgMessage(): Promise<void> {
  const previousMessage = process.env.HERMES_CLI_CHAT_MESSAGE;
  const previousEnabled = process.env.HERMES_LLM_SMOKE_TEST_ENABLED;
  const previousProvider = process.env.HERMES_LLM_PROVIDER;

  process.env.HERMES_CLI_CHAT_MESSAGE = "message from env";
  process.env.HERMES_LLM_SMOKE_TEST_ENABLED = "true";
  process.env.HERMES_LLM_PROVIDER = "mock";

  try {
    const envResult = await runHermesCliChatRuntimeFromEnv([]);
    assert.equal(envResult.status, "mock_fallback");
    assert.equal(envResult.input_message_length, "message from env".length);

    const argResult = await runHermesCliChatRuntimeFromEnv([
      "--message",
      "message from argv",
    ]);
    assert.equal(argResult.status, "mock_fallback");
    assert.equal(argResult.input_message_length, "message from argv".length);
  } finally {
    restoreEnv("HERMES_CLI_CHAT_MESSAGE", previousMessage);
    restoreEnv("HERMES_LLM_SMOKE_TEST_ENABLED", previousEnabled);
    restoreEnv("HERMES_LLM_PROVIDER", previousProvider);
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

async function main(): Promise<void> {
  await assertDisabledMode();
  await assertMockProviderMode();
  await assertOllamaPromptPassThrough();
  await assertInvalidInputs();
  await assertUnsupportedProvider();
  await assertEnvAndArgMessage();

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_cli_chat_minimal_runtime",
        disabled_mode: "ok",
        mock_provider_mode: "ok",
        injected_ollama_mode: "ok",
        input_validation: "ok",
        provider_adapter_used: true,
        unit_test_network_dependency: false,
        no_db_write_assertion: "ok",
        no_route_or_action_assertion: "ok",
        business_context_included: false,
        farm_context_included: false,
        db_context_included: false,
        proposal_context_included: false
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
