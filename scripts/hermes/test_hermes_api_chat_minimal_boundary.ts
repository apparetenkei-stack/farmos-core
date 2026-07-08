import assert from "node:assert/strict";

import {
  runHermesApiChatMinimalBoundary,
  type HermesApiChatMinimalBoundaryEnvelope,
} from "../../src/app/api/hermes/chat/route";
import type {
  HermesFarmosReadonlyContextEnvelope,
} from "./llm_runtime/hermes_farmos_readonly_context";

const contextText = JSON.stringify({
  scope: "hermes_memory_context_minimum",
  safe_app_context: {
    crop_cycle_count: 1,
  },
  boundary: {
    transaction_read_only: true,
    writes_performed: false,
  },
});

function makeReadonlyContext(): HermesFarmosReadonlyContextEnvelope {
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

function baseEnv(
  overrides?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return {
    HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
    HERMES_LLM_SMOKE_TEST_ENABLED: "true",
    HERMES_LLM_PROVIDER: "mock",
    HERMES_OLLAMA_BASE_URL: "http://127.0.0.1:11434",
    HERMES_OLLAMA_MODEL: "qwen3.5:4b",
    HERMES_LLM_TIMEOUT_MS: "30000",
    ...overrides,
  };
}

function assertNoWrites(result: HermesApiChatMinimalBoundaryEnvelope): void {
  assert.equal(result.context_write_allowed, false);
  assert.equal(result.db_write_performed, false);
  assert.equal(result.proposal_created, false);
  assert.equal(result.proposal_saved, false);
  assert.equal(result.proposal_apply_performed, false);
  assert.equal(result.chat_history_saved, false);
  assert.equal(result.audit_record_saved, false);
  assert.equal(result.app_db_write_performed, false);
  assert.equal(result.production_chat_enabled, false);
  assert.equal(result.ui_connected, false);
  assert.equal(result.server_action_used, false);
  assert.equal(result.form_action_used, false);
  assert.equal(result.credentials_exposed, false);
  assert.equal(result.response_envelope_normalized, true);
  assert.equal(result.api_route_added, true);
  assert.equal(result.route_added, true);
}

async function main(): Promise<void> {
  const routeDisabled = await runHermesApiChatMinimalBoundary({
    env: baseEnv({
      HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "false",
      HERMES_LLM_PROVIDER: "ollama",
    }),
    body: {
      message: "hello hermes",
      includeReadonlyContext: true,
      provider: "ollama",
    },
    readonlyContextReader: async () => {
      throw new Error("readonly context must not be read when route is disabled");
    },
    fetchImpl: async () => {
      throw new Error("fetch must not run when route is disabled");
    },
  });

  assert.equal(routeDisabled.httpStatus, 200);
  assert.equal(routeDisabled.body.status, "blocked");
  assert.equal(routeDisabled.body.api_boundary_enabled, false);
  assert.equal(routeDisabled.body.runtime_call_allowed, false);
  assert.equal(routeDisabled.body.readonly_context_read_performed, false);
  assert.equal(routeDisabled.body.db_read_performed, false);
  assertNoWrites(routeDisabled.body);

  let mockReadCount = 0;
  const mockMode = await runHermesApiChatMinimalBoundary({
    env: baseEnv({ HERMES_LLM_PROVIDER: "mock" }),
    body: {
      message: "hello hermes",
      includeReadonlyContext: true,
      provider: "mock",
    },
    readonlyContextReader: async () => {
      mockReadCount += 1;
      return makeReadonlyContext();
    },
  });

  assert.equal(mockMode.httpStatus, 200);
  assert.equal(mockMode.body.status, "mock_fallback");
  assert.equal(mockMode.body.provider, "mock");
  assert.equal(mockMode.body.prompt_sent, false);
  assert.equal(mockReadCount, 1);
  assert.equal(mockMode.body.readonly_context_read_performed, true);
  assert.equal(mockMode.body.readonly_context_included, true);
  assert.equal(mockMode.body.db_read_performed, true);
  assertNoWrites(mockMode.body);

  const disabledRuntime = await runHermesApiChatMinimalBoundary({
    env: baseEnv({
      HERMES_LLM_PROVIDER: "ollama",
      HERMES_LLM_SMOKE_TEST_ENABLED: "false",
    }),
    body: {
      message: "hello hermes",
      includeReadonlyContext: true,
      provider: "ollama",
    },
    readonlyContextReader: async () => makeReadonlyContext(),
  });

  assert.equal(disabledRuntime.httpStatus, 200);
  assert.equal(disabledRuntime.body.status, "disabled_by_env");
  assert.equal(disabledRuntime.body.runtime_call_allowed, false);
  assert.equal(disabledRuntime.body.llm_runtime_executed, false);
  assert.equal(disabledRuntime.body.prompt_sent, false);
  assert.equal(disabledRuntime.body.db_read_performed, true);
  assertNoWrites(disabledRuntime.body);

  let capturedPromptBody = "";
  const injectedOllama = await runHermesApiChatMinimalBoundary({
    env: baseEnv({
      HERMES_LLM_PROVIDER: "ollama",
      HERMES_LLM_SMOKE_TEST_ENABLED: "true",
    }),
    body: {
      message: "Reply with exactly: hermes api chat ok",
      includeReadonlyContext: true,
      provider: "ollama",
    },
    readonlyContextReader: async () => makeReadonlyContext(),
    fetchImpl: async (_input, init) => {
      capturedPromptBody = String(init?.body ?? "");

      return new Response(
        JSON.stringify({
          response: "hermes api chat ok",
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
    },
  });

  assert.equal(injectedOllama.httpStatus, 200);
  assert.equal(injectedOllama.body.status, "ok");
  assert.equal(injectedOllama.body.runtime_call_allowed, true);
  assert.equal(injectedOllama.body.llm_runtime_executed, true);
  assert.equal(injectedOllama.body.prompt_sent, true);
  assert.equal(injectedOllama.body.response_text, "hermes api chat ok");
  assert.match(capturedPromptBody, /READ_ONLY_FARMOS_CONTEXT/u);
  assert.match(capturedPromptBody, /USER_MESSAGE/u);
  assertNoWrites(injectedOllama.body);

  const includeFalse = await runHermesApiChatMinimalBoundary({
    env: baseEnv({ HERMES_LLM_PROVIDER: "mock" }),
    body: {
      message: "hello hermes",
      includeReadonlyContext: false,
      provider: "mock",
    },
    readonlyContextReader: async () => {
      throw new Error("readonly context must not be read");
    },
  });

  assert.equal(includeFalse.httpStatus, 200);
  assert.equal(includeFalse.body.readonly_context_requested, false);
  assert.equal(includeFalse.body.readonly_context_read_performed, false);
  assert.equal(includeFalse.body.readonly_context_included, false);
  assert.equal(includeFalse.body.db_read_performed, false);
  assertNoWrites(includeFalse.body);

  const invalidJson = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: null,
    requestJsonParseError: true,
  });

  assert.equal(invalidJson.httpStatus, 400);
  assert.equal(invalidJson.body.status, "bad_request");
  assert.equal(invalidJson.body.request_json_parse_error, true);
  assert.equal(invalidJson.body.request_body_valid, false);
  assert.equal(invalidJson.body.prompt_sent, false);
  assert.equal(invalidJson.body.db_read_performed, false);
  assertNoWrites(invalidJson.body);

  const invalidMessage = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "",
      includeReadonlyContext: true,
      provider: "mock",
    },
  });

  assert.equal(invalidMessage.httpStatus, 400);
  assert.equal(invalidMessage.body.status, "bad_request");
  assert.equal(invalidMessage.body.request_body_valid, false);
  assert.equal(invalidMessage.body.prompt_sent, false);
  assert.equal(invalidMessage.body.readonly_context_read_performed, false);
  assert.equal(invalidMessage.body.db_read_performed, false);
  assertNoWrites(invalidMessage.body);

  const multilineMessage = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "hello\nhermes",
      includeReadonlyContext: true,
      provider: "mock",
    },
  });

  assert.equal(multilineMessage.httpStatus, 400);
  assert.equal(multilineMessage.body.input_message_multiline, true);
  assert.equal(multilineMessage.body.db_read_performed, false);
  assertNoWrites(multilineMessage.body);

  const tooLongMessage = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "x".repeat(501),
      includeReadonlyContext: true,
      provider: "mock",
    },
  });

  assert.equal(tooLongMessage.httpStatus, 400);
  assert.equal(tooLongMessage.body.input_message_too_long, true);
  assert.equal(tooLongMessage.body.db_read_performed, false);
  assertNoWrites(tooLongMessage.body);

  const forbiddenBaseUrl = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "hello hermes",
      includeReadonlyContext: true,
      provider: "mock",
      baseUrl: "http://malicious.local",
    },
  });

  assert.equal(forbiddenBaseUrl.httpStatus, 400);
  assert.equal(forbiddenBaseUrl.body.status, "bad_request");
  assert.match(
    forbiddenBaseUrl.body.error_message ?? "",
    /forbidden_request_body_field/u,
  );
  assert.equal(forbiddenBaseUrl.body.prompt_sent, false);
  assert.equal(forbiddenBaseUrl.body.db_read_performed, false);
  assertNoWrites(forbiddenBaseUrl.body);

  const forbiddenCredential = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "hello hermes",
      includeReadonlyContext: true,
      provider: "mock",
      apiKey: "must-not-be-accepted",
    },
  });

  assert.equal(forbiddenCredential.httpStatus, 400);
  assert.equal(forbiddenCredential.body.status, "bad_request");
  assert.equal(forbiddenCredential.body.credentials_exposed, false);
  assert.equal(forbiddenCredential.body.db_read_performed, false);
  assertNoWrites(forbiddenCredential.body);

  const unknownProvider = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "hello hermes",
      includeReadonlyContext: true,
      provider: "external_llm",
    },
  });

  assert.equal(unknownProvider.httpStatus, 400);
  assert.equal(unknownProvider.body.status, "bad_request");
  assert.match(unknownProvider.body.error_message ?? "", /unsupported_llm_provider/u);
  assert.equal(unknownProvider.body.prompt_sent, false);
  assert.equal(unknownProvider.body.db_read_performed, false);
  assertNoWrites(unknownProvider.body);

  const invalidReadonlyFlag = await runHermesApiChatMinimalBoundary({
    env: baseEnv(),
    body: {
      message: "hello hermes",
      includeReadonlyContext: "true",
      provider: "mock",
    },
  });

  assert.equal(invalidReadonlyFlag.httpStatus, 400);
  assert.equal(invalidReadonlyFlag.body.status, "bad_request");
  assert.equal(invalidReadonlyFlag.body.readonly_context_read_performed, false);
  assert.equal(invalidReadonlyFlag.body.db_read_performed, false);
  assertNoWrites(invalidReadonlyFlag.body);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_api_chat_minimal_boundary",
    route_disabled_mode: "ok",
    disabled_runtime_mode: "ok",
    mock_provider_mode: "ok",
    injected_ollama_mode: "ok",
    include_readonly_context_false: "ok",
    invalid_json: "ok",
    invalid_message: "ok",
    forbidden_body_fields: "ok",
    unknown_provider: "ok",
    unit_test_network_dependency: false,
    api_route_added: true,
    production_chat_enabled: false,
    db_write_performed: false,
    proposal_created: false,
    proposal_saved: false,
    proposal_apply_performed: false,
    chat_history_saved: false,
    audit_record_saved: false,
    app_db_write_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
