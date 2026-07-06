import assert from "node:assert/strict";

import {
  HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE,
  HERMES_LOCAL_LLM_FIXED_BUSINESS_SMOKE_PROMPT,
  runHermesLocalLlmBusinessPromptSmokeTestBoundary,
} from "./api_boundary/hermes_local_llm_business_prompt_smoke_test_boundary";

type BoundaryResult = Awaited<
  ReturnType<typeof runHermesLocalLlmBusinessPromptSmokeTestBoundary>
>;

function assertSafeBoundary(result: BoundaryResult) {
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.external_api_called, false);
  assert.equal(result.boundary.response_body_exposed, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.endpoint_value_exposed, false);
  assert.equal(result.boundary.model_value_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.user_prompt_sent_to_model, false);
  assert.equal(result.boundary.business_context_sent_to_model, false);
  assert.equal(result.boundary.real_business_prompt_sent_to_model, false);

  assert.equal(result.business_prompt_smoke.endpoint_value_exposed, false);
  assert.equal(result.business_prompt_smoke.model_value_exposed, false);
  assert.equal(result.business_prompt_smoke.credentials_required, false);
  assert.equal(result.business_prompt_smoke.credentials_exposed, false);
  assert.equal(result.business_prompt_smoke.response_body_exposed, false);
  assert.equal(result.business_prompt_smoke.fixed_business_dummy_prompt_allowed, true);
  assert.equal(result.business_prompt_smoke.real_business_prompt_allowed, false);
  assert.equal(result.business_prompt_smoke.user_prompt_allowed, false);
  assert.equal(result.business_prompt_smoke.business_context_allowed, false);
  assert.equal(
    result.business_prompt_smoke.restricted_domain_data_allowed,
    false,
  );
  assert.equal(result.business_prompt_smoke.fallback_policy.fallback_provider, "mock");

  assert.equal(
    result.business_prompt_contract.mode,
    "hermes_local_llm_business_prompt_dry_run_contract_boundary",
  );
  assert.equal(
    result.business_prompt_contract.contract_mode,
    "business_prompt_dry_run_contract_only",
  );
  assert.equal(result.business_prompt_contract.runtime_call_allowed, false);
  assert.equal(result.business_prompt_contract.business_prompt_allowed, false);
  assert.equal(result.business_prompt_contract.prompt_sent, false);
  assert.equal(result.business_prompt_contract.request_body_created, false);
  assert.equal(result.business_prompt_contract.request_body_sent, false);
  assert.equal(result.business_prompt_contract.response_body_exposed, false);
}

function assertNoRuntime(result: BoundaryResult) {
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.local_model_called, false);
  assert.equal(result.boundary.local_runtime_generate_http_called, false);
  assert.equal(result.boundary.prompt_sent_to_model, false);
  assert.equal(result.boundary.request_body_created, false);
  assert.equal(result.boundary.request_body_sent, false);
  assert.equal(result.boundary.fixed_business_dummy_prompt_sent_to_model, false);
}

function extractPromptFromRequestBody(body: unknown): string {
  const record = body as Record<string, unknown>;

  if (typeof record.prompt === "string") {
    return record.prompt;
  }

  const messages = record.messages;
  if (Array.isArray(messages)) {
    const first = messages[0] as Record<string, unknown> | undefined;
    if (typeof first?.content === "string") {
      return first.content;
    }
  }

  return "";
}

async function main() {
  const previousBusinessSmokeEndpoint =
    process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT;
  const previousChatEndpoint = process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  const previousSmokeEndpoint = process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
  const previousModel = process.env.HERMES_LOCAL_LLM_MODEL;

  delete process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_MODEL;

  try {
    const notConfigured =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        dryRun: true,
      });

    assert.equal(notConfigured.result, "ok");
    assert.equal(
      notConfigured.business_prompt_smoke.mode,
      "hermes_local_llm_business_prompt_smoke_test_boundary",
    );
    assert.equal(notConfigured.business_prompt_smoke.runtime, "local_llm");
    assert.equal(
      notConfigured.business_prompt_smoke.prompt_smoke_mode,
      "fixed_business_dummy_prompt_only",
    );
    assert.equal(
      notConfigured.business_prompt_smoke.configured_provider,
      "local_llm_business_prompt_smoke",
    );
    assert.equal(
      notConfigured.business_prompt_smoke.endpoint_config_key,
      "HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT",
    );
    assert.equal(
      notConfigured.business_prompt_smoke.model_config_key,
      "HERMES_LOCAL_LLM_MODEL",
    );
    assert.equal(
      notConfigured.business_prompt_smoke.runtime_call_allowed,
      "true_for_fixed_business_dummy_prompt_only",
    );
    assert.equal(notConfigured.business_prompt_smoke.prompt_sent, false);
    assert.equal(
      notConfigured.business_prompt_smoke.prompt_text_exposed,
      "safe_fixed_business_dummy_prompt_only",
    );
    assert.equal(
      notConfigured.business_prompt_smoke.expected_response,
      HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE,
    );
    assert.equal(
      notConfigured.business_prompt_smoke.response_match_result,
      "not_configured",
    );
    assert.equal(notConfigured.business_prompt_smoke.contract_status_checked, true);
    assert.equal(
      notConfigured.business_prompt_smoke.contract_mode,
      "business_prompt_dry_run_contract_only",
    );
    assert.equal(notConfigured.business_prompt_smoke.tokens_used, 0);
    assertNoRuntime(notConfigured);
    assertSafeBoundary(notConfigured);

    const blockedPrompt =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        dryRun: true,
        prompt: "今日の作業計画を整理して",
      });

    assert.equal(blockedPrompt.result, "blocked");
    assert.equal(
      blockedPrompt.blocked_reason,
      "user_prompt_or_business_context_forbidden_by_day49_business_smoke_boundary",
    );
    assert.equal(blockedPrompt.business_prompt_smoke.response_match_result, "blocked");
    assertNoRuntime(blockedPrompt);
    assertSafeBoundary(blockedPrompt);

    const blockedBusinessContext =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        dryRun: true,
        businessContext: {
          crop_cycle_id: 2,
        },
      });

    assert.equal(blockedBusinessContext.result, "blocked");
    assert.equal(
      blockedBusinessContext.blocked_reason,
      "user_prompt_or_business_context_forbidden_by_day49_business_smoke_boundary",
    );
    assert.equal(blockedBusinessContext.boundary.business_context_sent_to_model, false);
    assertNoRuntime(blockedBusinessContext);
    assertSafeBoundary(blockedBusinessContext);

    const blockedRestricted =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        dryRun: true,
        sample: "顧客の注文金額と支払い状況を整理して",
      });

    assert.equal(blockedRestricted.result, "blocked");
    assert.equal(
      blockedRestricted.blocked_reason,
      "restricted_domain_data_forbidden_by_day49_business_smoke_boundary",
    );
    assert.equal(blockedRestricted.boundary.restricted_domain_data_exposed, false);
    assertNoRuntime(blockedRestricted);
    assertSafeBoundary(blockedRestricted);

    const badProvider =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_contract",
        dryRun: true,
      });

    assert.equal(badProvider.result, "blocked");
    assert.equal(
      badProvider.blocked_reason,
      "provider_forbidden_by_day49_business_prompt_smoke_boundary",
    );
    assertNoRuntime(badProvider);
    assertSafeBoundary(badProvider);

    const externalEndpoint =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        endpoint: "https://api.openai.com/v1/chat/completions",
        model: "dummy-model",
        dryRun: true,
        smoke: true,
      });

    assert.equal(externalEndpoint.result, "blocked");
    assert.equal(
      externalEndpoint.blocked_reason,
      "external_llm_endpoint_forbidden_by_day49_business_smoke_boundary",
    );
    assert.equal(externalEndpoint.boundary.external_api_called, false);
    assert.equal(externalEndpoint.boundary.endpoint_value_exposed, false);
    assertNoRuntime(externalEndpoint);
    assertSafeBoundary(externalEndpoint);

    const smokeWithoutFlag =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        endpoint: "http://127.0.0.1:1234/v1/chat/completions",
        model: "dummy-model",
        dryRun: true,
        smoke: false,
      });

    assert.equal(smokeWithoutFlag.result, "ok");
    assert.equal(
      smokeWithoutFlag.business_prompt_smoke.response_match_result,
      "not_configured",
    );
    assert.equal(smokeWithoutFlag.business_prompt_smoke.prompt_sent, false);
    assertNoRuntime(smokeWithoutFlag);
    assertSafeBoundary(smokeWithoutFlag);

    let capturedEndpoint = "";
    let capturedRequestBody: Record<string, unknown> | undefined;

    const matched =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        endpoint: "http://127.0.0.1:1234/v1/chat/completions",
        model: "dummy-model",
        dryRun: true,
        smoke: true,
        fetchImpl: async (endpoint, init) => {
          capturedEndpoint = String(endpoint);
          capturedRequestBody = JSON.parse(String(init?.body ?? "{}")) as Record<
            string,
            unknown
          >;

          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: HERMES_LOCAL_LLM_EXPECTED_BUSINESS_SMOKE_RESPONSE,
                  },
                },
              ],
              usage: {
                total_tokens: 7,
              },
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

    assert.equal(matched.result, "ok");
    assert.equal(capturedEndpoint, "http://127.0.0.1:1234/v1/chat/completions");
    assert.ok(capturedRequestBody);
    assert.equal(
      extractPromptFromRequestBody(capturedRequestBody),
      HERMES_LOCAL_LLM_FIXED_BUSINESS_SMOKE_PROMPT,
    );
    assert.equal(
      extractPromptFromRequestBody(capturedRequestBody).includes("顧客"),
      false,
    );
    assert.equal(
      extractPromptFromRequestBody(capturedRequestBody).includes("注文"),
      false,
    );
    assert.equal(
      extractPromptFromRequestBody(capturedRequestBody).includes("金額"),
      false,
    );
    assert.equal(
      extractPromptFromRequestBody(capturedRequestBody).includes("給与"),
      false,
    );
    assert.equal(
      extractPromptFromRequestBody(capturedRequestBody).includes("proposal"),
      false,
    );
    assert.equal(matched.business_prompt_smoke.prompt_sent, true);
    assert.equal(matched.business_prompt_smoke.response_match_result, "matched");
    assert.equal(matched.business_prompt_smoke.response_body_exposed, false);
    assert.equal(matched.business_prompt_smoke.tokens_used, 7);
    assert.equal(matched.boundary.hermes_runtime_executed, true);
    assert.equal(matched.boundary.llm_runtime_executed, true);
    assert.equal(matched.boundary.local_model_called, true);
    assert.equal(matched.boundary.local_runtime_generate_http_called, true);
    assert.equal(matched.boundary.prompt_sent_to_model, true);
    assert.equal(matched.boundary.request_body_created, true);
    assert.equal(matched.boundary.request_body_sent, true);
    assert.equal(matched.boundary.fixed_business_dummy_prompt_sent_to_model, true);
    assert.equal(matched.boundary.real_business_prompt_sent_to_model, false);
    assert.equal(matched.boundary.user_prompt_sent_to_model, false);
    assert.equal(matched.boundary.business_context_sent_to_model, false);
    assert.equal(matched.boundary.response_body_exposed, false);
    assert.equal(matched.boundary.tokens_used, 7);
    assertSafeBoundary(matched);

    const unmatched =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        endpoint: "http://127.0.0.1:11434/api/generate",
        model: "dummy-model",
        dryRun: true,
        smoke: true,
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              response: "wrong_response",
              prompt_eval_count: 2,
              eval_count: 3,
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
              },
            },
          ),
      });

    assert.equal(unmatched.result, "ok");
    assert.equal(
      unmatched.business_prompt_smoke.response_match_result,
      "unmatched",
    );
    assert.equal(unmatched.business_prompt_smoke.response_body_exposed, false);
    assert.equal(unmatched.business_prompt_smoke.tokens_used, 5);
    assert.equal(unmatched.boundary.fixed_business_dummy_prompt_sent_to_model, true);
    assertSafeBoundary(unmatched);

    const timeout =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        endpoint: "http://127.0.0.1:11434/api/chat",
        model: "dummy-model",
        dryRun: true,
        smoke: true,
        fetchImpl: async () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          throw error;
        },
      });

    assert.equal(timeout.result, "timeout");
    assert.equal(timeout.business_prompt_smoke.response_match_result, "timeout");
    assert.equal(timeout.business_prompt_smoke.response_body_exposed, false);
    assert.equal(timeout.boundary.fixed_business_dummy_prompt_sent_to_model, true);
    assertSafeBoundary(timeout);

    const errored =
      await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
        provider: "local_llm_business_prompt_smoke",
        endpoint: "http://127.0.0.1:11434/api/chat",
        model: "dummy-model",
        dryRun: true,
        smoke: true,
        fetchImpl: async () => {
          throw new Error("connection refused with local detail");
        },
      });

    assert.equal(errored.result, "error");
    assert.equal(errored.business_prompt_smoke.response_match_result, "error");
    assert.equal(errored.error, "local_llm_business_prompt_smoke_error");
    assert.equal(errored.business_prompt_smoke.response_body_exposed, false);
    assert.equal(errored.boundary.fixed_business_dummy_prompt_sent_to_model, true);
    assertSafeBoundary(errored);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checked: "hermes_local_llm_business_prompt_smoke_test_boundary",
        },
        null,
        2,
      ),
    );
  } finally {
    if (previousBusinessSmokeEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_BUSINESS_SMOKE_ENDPOINT =
        previousBusinessSmokeEndpoint;
    }

    if (previousChatEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT = previousChatEndpoint;
    }

    if (previousSmokeEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT = previousSmokeEndpoint;
    }

    if (previousModel === undefined) {
      delete process.env.HERMES_LOCAL_LLM_MODEL;
    } else {
      process.env.HERMES_LOCAL_LLM_MODEL = previousModel;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
