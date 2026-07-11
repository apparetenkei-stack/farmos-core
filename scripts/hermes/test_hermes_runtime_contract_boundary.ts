import assert from "node:assert/strict";

import { runHermesApiChatMinimalBoundary } from "../../src/app/api/hermes/chat/route";
import {
  createHermesRuntimeRequestId,
  mapHermesRuntimeStatus,
  normalizeHermesRuntimeDurationMs,
} from "./llm_runtime/hermes_runtime_contract";

const enabledEnv = {
  HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
  HERMES_LLM_SMOKE_TEST_ENABLED: "true",
  HERMES_LLM_PROVIDER: "mock",
  HERMES_LLM_TIMEOUT_MS: "30000",
  HERMES_OLLAMA_BASE_URL: "http://127.0.0.1:11434",
  HERMES_OLLAMA_MODEL: "day96-test-model",
};

function body(provider: "mock" | "ollama" = "mock") {
  return {
    message: "day96 runtime contract check",
    includeReadonlyContext: false,
    provider,
  };
}

function assertSafety(result: Awaited<ReturnType<typeof runHermesApiChatMinimalBoundary>>) {
  assert.equal(result.body.db_write_performed, false);
  assert.equal(result.body.proposal_created, false);
  assert.equal(result.body.proposal_saved, false);
  assert.equal(result.body.proposal_apply_performed, false);
  assert.equal(result.body.chat_history_saved, false);
  assert.equal(result.body.audit_record_saved, false);
  assert.equal(result.body.app_db_write_performed, false);
  assert.equal(result.body.credentials_exposed, false);
  assert.equal(result.body.runtime_metadata.fail_closed, true);
  assert.equal(result.body.runtime_metadata.queue_used, false);
  assert.equal(result.body.runtime_metadata.fallback_used, false);
}

async function main(): Promise<void> {
  assert.match(createHermesRuntimeRequestId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);

  const first = await runHermesApiChatMinimalBoundary({ body: body(), env: enabledEnv });
  const second = await runHermesApiChatMinimalBoundary({ body: body(), env: enabledEnv });
  assert.notEqual(first.body.runtime_metadata.request_id, second.body.runtime_metadata.request_id);
  assert.equal(first.body.runtime_metadata.status, "succeeded");
  assert.equal(first.body.runtime_metadata.readiness, "not_checked");
  assertSafety(first);

  const clockValues = [100.8, 145.9];
  const deterministic = await runHermesApiChatMinimalBoundary({
    body: body(),
    env: enabledEnv,
    requestIdFactory: () => "injected-request-id",
    nowMs: () => clockValues.shift() ?? 145.9,
  });
  assert.equal(deterministic.body.runtime_metadata.request_id, "injected-request-id");
  assert.equal(deterministic.body.runtime_metadata.duration_ms, 45);
  assert.equal(normalizeHermesRuntimeDurationMs(200, 100), 0);
  assert.equal(normalizeHermesRuntimeDurationMs(0, 1.9), 1);

  for (const field of ["request_id", "requestId"] as const) {
    const rejected = await runHermesApiChatMinimalBoundary({
      body: { ...body(), [field]: "client-controlled" },
      env: enabledEnv,
    });
    assert.equal(rejected.httpStatus, 400);
    assert.equal(rejected.body.runtime_metadata.status, "rejected");
    assert.equal(rejected.body.runtime_metadata.readiness, "not_checked");
    assert.match(rejected.body.error_message ?? "", /forbidden_request_body_field/u);
    assertSafety(rejected);
  }

  const parseError = await runHermesApiChatMinimalBoundary({
    body: null,
    requestJsonParseError: true,
    env: enabledEnv,
  });
  assert.equal(parseError.body.runtime_metadata.status, "rejected");
  assert.match(parseError.body.runtime_metadata.request_id, /^[0-9a-f-]{36}$/u);

  const disabled = await runHermesApiChatMinimalBoundary({
    body: body(),
    env: { ...enabledEnv, HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "false" },
  });
  assert.equal(disabled.body.runtime_metadata.status, "blocked");
  assert.equal(disabled.body.runtime_metadata.readiness, "not_checked");

  const ollamaSuccess = await runHermesApiChatMinimalBoundary({
    body: body("ollama"),
    env: { ...enabledEnv, HERMES_LLM_PROVIDER: "ollama" },
    fetchImpl: async () => new Response(JSON.stringify({ response: "ok", done: true }), { status: 200 }),
  });
  assert.equal(ollamaSuccess.body.runtime_metadata.status, "succeeded");
  assert.equal(ollamaSuccess.body.runtime_metadata.readiness, "ready");

  const timedOut = await runHermesApiChatMinimalBoundary({
    body: body("ollama"),
    env: { ...enabledEnv, HERMES_LLM_PROVIDER: "ollama" },
    fetchImpl: async () => { throw new DOMException("timed out", "AbortError"); },
  });
  assert.equal(timedOut.body.runtime_metadata.status, "timed_out");
  assert.equal(timedOut.body.runtime_metadata.readiness, "not_ready");

  const runtimeError = await runHermesApiChatMinimalBoundary({
    body: body("ollama"),
    env: { ...enabledEnv, HERMES_LLM_PROVIDER: "ollama" },
    fetchImpl: async () => { throw new Error("controlled runtime failure"); },
  });
  assert.equal(runtimeError.body.runtime_metadata.status, "failed");
  assert.equal(runtimeError.body.runtime_metadata.readiness, "not_ready");
  assert.equal(runtimeError.body.runtime_metadata.error_code, "runtime_error");
  assert.equal(mapHermesRuntimeStatus("future_unknown_status"), "failed");

  const readonlyContextFailure = await runHermesApiChatMinimalBoundary({
    body: { ...body("ollama"), includeReadonlyContext: true },
    env: { ...enabledEnv, HERMES_LLM_PROVIDER: "ollama" },
    readonlyContextReader: async () => { throw new Error("sensitive internal detail"); },
  });
  assert.equal(readonlyContextFailure.body.runtime_metadata.status, "failed");
  assert.equal(readonlyContextFailure.body.runtime_metadata.readiness, "not_ready");
  assert.equal(readonlyContextFailure.body.runtime_metadata.error_code, "runtime_error");
  assert.doesNotMatch(JSON.stringify(readonlyContextFailure.body), /sensitive internal detail/u);

  for (const result of [parseError, disabled, ollamaSuccess, timedOut, runtimeError, readonlyContextFailure]) {
    assert.ok(Number.isInteger(result.body.runtime_metadata.duration_ms));
    assert.ok(result.body.runtime_metadata.duration_ms >= 0);
    assertSafety(result);
  }

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_runtime_contract_boundary",
    schema_version: "hermes.runtime.v1",
    request_id_server_owned: true,
    deterministic_duration: true,
    fail_closed: true,
    db_write_performed: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
