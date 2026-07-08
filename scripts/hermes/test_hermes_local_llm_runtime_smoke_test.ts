import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT,
  runHermesLocalLlmRuntimeSmokeTest,
  runHermesLocalLlmRuntimeSmokeTestFromEnv,
  type HermesLocalLlmRuntimeSmokeResult,
} from "./llm_runtime/hermes_local_llm_runtime_smoke_test";

function assertNoWrites(result: HermesLocalLlmRuntimeSmokeResult): void {
  assert.equal(result.boundary.cli_only, true);
  assert.equal(result.boundary.db_write_performed, false);
  assert.equal(result.boundary.proposal_created, false);
  assert.equal(result.boundary.proposal_saved, false);
  assert.equal(result.boundary.proposal_apply_performed, false);
  assert.equal(result.boundary.chat_history_saved, false);
  assert.equal(result.boundary.audit_record_saved, false);
  assert.equal(result.boundary.app_db_write_performed, false);
  assert.equal(result.boundary.route_added, false);
  assert.equal(result.boundary.server_action_added, false);
  assert.equal(result.boundary.form_action_added, false);
  assert.equal(result.boundary.ui_changed, false);
  assert.equal(result.boundary.credentials_required, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.external_api_called, false);
  assert.equal(result.boundary.user_business_context_sent, false);
}

async function assertDisabledMode(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLocalLlmRuntimeSmokeTest({
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
  assert.equal(result.result, "disabled");
  assert.equal(result.status, "disabled_by_env");
  assert.equal(result.runtime_call_allowed, false);
  assert.equal(result.llm_runtime_executed, false);
  assert.equal(result.runtime_reachable, false);
  assert.equal(result.prompt_sent, false);
  assert.equal(result.response_text, null);
  assert.equal(result.boundary.http_request_dispatched, false);
  assertNoWrites(result);
}

async function assertActualModeWithInjectedRuntime(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLocalLlmRuntimeSmokeTest({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3.5:4b",
    timeoutMs: 5000,
    fetchImpl: async (input, init) => {
      fetchCalled = true;

      assert.equal(String(input), "http://127.0.0.1:11434/api/generate");
      assert.equal(init?.method, "POST");
      assert.equal(
        (init?.headers as Record<string, string>)["Content-Type"],
        "application/json",
      );

      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.model, "qwen3.5:4b");
      assert.equal(body.prompt, HERMES_LOCAL_LLM_RUNTIME_SMOKE_PROMPT);
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
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
  });

  assert.equal(fetchCalled, true);
  assert.equal(result.result, "ok");
  assert.equal(result.status, "ok");
  assert.equal(result.provider, "ollama");
  assert.equal(result.runtime_call_allowed, true);
  assert.equal(result.llm_runtime_executed, true);
  assert.equal(result.runtime_reachable, true);
  assert.equal(result.prompt_sent, true);
  assert.equal(result.response_text, "hermes local llm smoke ok");
  assert.equal(result.response_text_non_empty, true);
  assert.equal(result.tokens_used, 12);
  assert.equal(result.boundary.http_request_dispatched, true);
  assert.equal(result.boundary.endpoint_value_exposed, true);
  assert.equal(result.boundary.model_value_exposed, true);
  assertNoWrites(result);
}

async function assertRuntimeFailureIsSafe(): Promise<void> {
  const result = await runHermesLocalLlmRuntimeSmokeTest({
    smokeTestEnabled: true,
    provider: "ollama",
    baseUrl: "http://127.0.0.1:11434",
    model: "missing-model",
    fetchImpl: async () =>
      new Response(JSON.stringify({ error: "model not found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      }),
  });

  assert.equal(result.result, "failed");
  assert.equal(result.status, "model_missing_or_endpoint_not_found");
  assert.equal(result.runtime_call_allowed, true);
  assert.equal(result.llm_runtime_executed, true);
  assert.equal(result.runtime_reachable, false);
  assert.equal(result.prompt_sent, true);
  assert.equal(result.response_text, null);
  assert.equal(result.error_message, "model not found");
  assertNoWrites(result);
}

async function assertBlockedNonLoopback(): Promise<void> {
  let fetchCalled = false;

  const result = await runHermesLocalLlmRuntimeSmokeTest({
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
  assert.equal(result.result, "blocked");
  assert.equal(result.status, "blocked");
  assert.equal(result.error_message, "ollama_base_url_must_be_loopback_http");
  assert.equal(result.llm_runtime_executed, false);
  assert.equal(result.prompt_sent, false);
  assertNoWrites(result);
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
    const result = await runHermesLocalLlmRuntimeSmokeTestFromEnv();

    assert.equal(result.result, "disabled");
    assert.equal(result.status, "disabled_by_env");
    assert.equal(result.runtime_call_allowed, false);
    assert.equal(result.llm_runtime_executed, false);
    assertNoWrites(result);
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

function assertGuardrailSourceScan(): void {
  const files = [
    "scripts/hermes/llm_runtime/hermes_local_llm_runtime_smoke_test.ts",
    "scripts/hermes/run_hermes_local_llm_runtime_smoke_test.ts",
    "scripts/hermes/test_hermes_local_llm_runtime_smoke_test.ts",
    "docs/day65-hermes-local-llm-runtime-actual-smoke-test.md",
  ];

  const forbiddenFragments = [
    ["export async function ", "POST"].join(""),
    ["export async function ", "PUT"].join(""),
    ["export async function ", "PATCH"].join(""),
    ["export async function ", "DELETE"].join(""),
    ["use", "server"].join(" "),
    ["insert ", "into"].join(""),
    ["delete ", "from"].join(""),
    [["proposal", "_", "inbox"].join(""), ".*", ["ins", "ert"].join("")].join(""),
    [["aud", "it"].join(""), ".*", ["ins", "ert"].join("")].join(""),
    ["confirmation", "_", "record", "_", "created", ":", " true"].join(""),
    ["confirmation", "_", "status", "_", "saved", ":", " true"].join(""),
    ["request", "_", "body", "_", "sent", ":", " true"].join(""),
  ];

  const forbiddenPatterns = [
    ...forbiddenFragments.map((fragment) => new RegExp(fragment, "i")),
    new RegExp(["update", "\\s+.*\\s+", "set"].join(""), "i"),
    new RegExp(["action", "\\s*="].join(""), "i"),
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");

    for (const pattern of forbiddenPatterns) {
      assert.equal(
        pattern.test(source),
        false,
        `${file} contains forbidden implementation marker ${pattern}`,
      );
    }
  }
}

async function main(): Promise<void> {
  await assertDisabledMode();
  await assertActualModeWithInjectedRuntime();
  await assertRuntimeFailureIsSafe();
  await assertBlockedNonLoopback();
  await assertEnvDisabledMode();
  assertGuardrailSourceScan();

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_local_llm_runtime_actual_smoke_test",
        disabled_mode: "ok",
        injected_actual_mode: "ok",
        runtime_failure_mode: "ok",
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
