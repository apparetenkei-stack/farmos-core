import assert from "node:assert/strict";

import {
  POST,
  type HermesApiChatMinimalBoundaryEnvelope,
} from "../../src/app/api/hermes/chat/route";

function readBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === "") return defaultValue;
  return value.trim().toLowerCase() === "true";
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
}

async function main(): Promise<void> {
  const provider = process.env.HERMES_LLM_PROVIDER === "mock" ? "mock" : "ollama";
  const includeReadonlyContext = readBooleanEnv(
    process.env.HERMES_API_CHAT_INCLUDE_READONLY_CONTEXT,
    true,
  );
  const message =
    process.env.HERMES_CLI_CHAT_MESSAGE ??
    process.env.HERMES_API_CHAT_MESSAGE ??
    "hello hermes";

  const request = new Request("http://localhost/api/hermes/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message,
      includeReadonlyContext,
      provider,
    }),
  });

  const response = await POST(request);
  const result = await response.json() as HermesApiChatMinimalBoundaryEnvelope;

  console.log(JSON.stringify({
    route_http_status: response.status,
    ...result,
  }, null, 2));

  assert.equal(result.api_boundary, "hermes_api_chat_minimal_boundary");
  assert.equal(result.api_route_added, true);
  assert.equal(result.request_body_received, true);
  assert.equal(result.response_envelope_normalized, true);
  assertNoWrites(result);

  if (process.env.HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED !== "true") {
    assert.equal(response.status, 200);
    assert.equal(result.status, "blocked");
    assert.equal(result.api_boundary_enabled, false);
    assert.equal(result.runtime_call_allowed, false);
    assert.equal(result.readonly_context_read_performed, false);
    assert.equal(result.db_read_performed, false);
    return;
  }

  assert.equal(result.api_boundary_enabled, true);

  if (!includeReadonlyContext) {
    assert.equal(result.readonly_context_requested, false);
    assert.equal(result.readonly_context_read_performed, false);
    assert.equal(result.readonly_context_included, false);
    assert.equal(result.db_read_performed, false);
  }

  if (provider === "mock") {
    assert.equal(response.status, 200);
    assert.equal(result.status, "mock_fallback");
    assert.equal(result.provider, "mock");
    assert.equal(result.runtime_call_allowed, false);
    assert.equal(result.llm_runtime_executed, false);
    assert.equal(result.prompt_sent, false);

    if (includeReadonlyContext) {
      assert.equal(result.readonly_context_read_performed, true);
      assert.equal(result.db_read_performed, true);
    }

    return;
  }

  if (process.env.HERMES_LLM_SMOKE_TEST_ENABLED !== "true") {
    assert.equal(response.status, 200);
    assert.equal(result.status, "disabled_by_env");
    assert.equal(result.runtime_call_allowed, false);
    assert.equal(result.llm_runtime_executed, false);
    assert.equal(result.prompt_sent, false);

    if (includeReadonlyContext) {
      assert.equal(result.readonly_context_read_performed, true);
      assert.equal(result.db_read_performed, true);
    }

    return;
  }

  assert.equal(response.status, 200);
  assert.equal(result.provider, "ollama");
  assert.equal(result.status, "ok");
  assert.equal(result.runtime_call_allowed, true);
  assert.equal(result.llm_runtime_executed, true);
  assert.equal(result.runtime_reachable, true);
  assert.equal(result.prompt_sent, true);
  assert.equal(result.response_text_non_empty, true);

  if (includeReadonlyContext) {
    assert.equal(result.readonly_context_read_performed, true);
    assert.equal(result.readonly_context_included, true);
    assert.equal(result.db_read_performed, true);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
