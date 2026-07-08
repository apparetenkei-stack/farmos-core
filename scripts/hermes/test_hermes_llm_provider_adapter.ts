import assert from "node:assert/strict";

import {
  HERMES_LLM_PROVIDER_ADAPTER_SMOKE_PROMPT,
  runHermesLlmProviderAdapter,
  runHermesLlmProviderAdapterFromEnv,
  type HermesLlmProviderResponse,
} from "./llm_runtime/hermes_llm_provider_adapter";

function assertNoSideEffects(result: HermesLlmProviderResponse): void {
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
}

async function assertDisabledMode(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLlmProviderAdapter({
    smokeTestEnabled: false,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response("{}");
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.provider, "ollama");
  assert.equal(result.status, "disabled_by_env");
  assert.equal(result.runtime_call_allowed, false);
  assert.equal(result.llm_runtime_executed, false);
  assert.equal(result.runtime_reachable, false);
  assert.equal(result.prompt_sent, false);
  assert.equal(result.response_text, null);
  assert.equal(result.response_text_non_empty, false);
  assertNoSideEffects(result);
}

async function assertMockProvider(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLlmProviderAdapter({
    smokeTestEnabled: true,
    provider: "mock",
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
  assert.equal(result.runtime_reachable, false);
  assert.equal(result.prompt_sent, false);
  assert.equal(result.response_text_non_empty, true);
  assert.equal(result.tokens_used, 0);
  assertNoSideEffects(result);
}

async function assertInjectedOllamaMode(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLlmProviderAdapter({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    timeoutMs: 5000,
    fetchImpl: async (input, init) => {
      fetchCalled = true;

      assert.equal(String(input), "http://127.0.0.1:11434/api/generate");
      assert.equal(init?.method, "POST");

      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.model, "qwen3.5:4b");
      assert.equal(body.prompt, HERMES_LLM_PROVIDER_ADAPTER_SMOKE_PROMPT);
      assert.equal(body.stream, false);

      return new Response(
        JSON.stringify({
          response: "hermes local llm smoke ok",
          prompt_eval_count: 7,
          eval_count: 5,
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
  assert.equal(result.response_text, "hermes local llm smoke ok");
  assert.equal(result.response_text_non_empty, true);
  assert.equal(result.tokens_used, 12);
  assertNoSideEffects(result);
}

async function assertBlockedNonLoopback(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLlmProviderAdapter({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "https://example.com",
    model: "qwen3.5:4b",
    fetchImpl: async () => {
      fetchCalled = true;
      return new Response("{}");
    },
  });

  assert.equal(fetchCalled, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.runtime_call_allowed, false);
  assert.equal(result.llm_runtime_executed, false);
  assert.equal(result.prompt_sent, false);
  assert.equal(result.error_message, "ollama_base_url_must_be_loopback_http");
  assertNoSideEffects(result);
}

async function assertRuntimeFailureMode(): Promise<void> {
  const result = await runHermesLlmProviderAdapter({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "missing-model",
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: "model not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
  });

  assert.equal(result.status, "runtime_error");
  assert.equal(result.runtime_call_allowed, true);
  assert.equal(result.llm_runtime_executed, true);
  assert.equal(result.runtime_reachable, false);
  assert.equal(result.prompt_sent, true);
  assert.equal(result.response_text, null);
  assertNoSideEffects(result);
}

async function assertEnvDisabledMode(): Promise<void> {
  const previousEnabled = process.env.HERMES_LLM_SMOKE_TEST_ENABLED;
  const previousProvider = process.env.HERMES_LLM_PROVIDER;
  const previousBaseUrl = process.env.HERMES_OLLAMA_BASE_URL;
  const previousModel = process.env.HERMES_OLLAMA_MODEL;
  const previousTimeout = process.env.HERMES_LLM_TIMEOUT_MS;

  process.env.HERMES_LLM_SMOKE_TEST_ENABLED = "false";
  process.env.HERMES_LLM_PROVIDER = "ollama";
  process.env.HERMES_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  process.env.HERMES_OLLAMA_MODEL = "qwen3.5:4b";
  process.env.HERMES_LLM_TIMEOUT_MS = "30000";

  try {
    const result = await runHermesLlmProviderAdapterFromEnv();
    assert.equal(result.status, "disabled_by_env");
    assert.equal(result.runtime_call_allowed, false);
    assert.equal(result.llm_runtime_executed, false);
    assertNoSideEffects(result);
  } finally {
    restoreEnv("HERMES_LLM_SMOKE_TEST_ENABLED", previousEnabled);
    restoreEnv("HERMES_LLM_PROVIDER", previousProvider);
    restoreEnv("HERMES_OLLAMA_BASE_URL", previousBaseUrl);
    restoreEnv("HERMES_OLLAMA_MODEL", previousModel);
    restoreEnv("HERMES_LLM_TIMEOUT_MS", previousTimeout);
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
  await assertMockProvider();
  await assertInjectedOllamaMode();
  await assertBlockedNonLoopback();
  await assertRuntimeFailureMode();
  await assertEnvDisabledMode();

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_llm_provider_adapter_minimal_unification",
        disabled_mode: "ok",
        mock_provider_mode: "ok",
        injected_ollama_mode: "ok",
        blocked_mode: "ok",
        runtime_failure_mode: "ok",
        env_disabled_mode: "ok",
        unit_test_network_dependency: false,
        no_db_write_assertion: "ok",
        no_route_or_action_assertion: "ok",
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
