import assert from "node:assert/strict";

import {
  HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE,
  HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT,
  runHermesLocalLlmPromptSmokeTestBoundary,
} from "./api_boundary/hermes_local_llm_prompt_smoke_test_boundary";

async function main() {
  const previousSmokeEndpoint = process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
  const previousChatEndpoint = process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  const previousModel = process.env.HERMES_LOCAL_LLM_MODEL;

  delete process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_MODEL;

  try {
    const notConfigured = await runHermesLocalLlmPromptSmokeTestBoundary({
      provider: "local_llm_prompt_smoke",
      dryRun: true,
    });

    assert.equal(notConfigured.result, "ok");
    assert.equal(
      notConfigured.prompt_smoke.mode,
      "hermes_local_llm_prompt_smoke_test_boundary",
    );
    assert.equal(notConfigured.prompt_smoke.runtime, "local_llm");
    assert.equal(
      notConfigured.prompt_smoke.prompt_smoke_mode,
      "fixed_non_business_prompt_only",
    );
    assert.equal(
      notConfigured.prompt_smoke.configured_provider,
      "local_llm_prompt_smoke",
    );
    assert.equal(
      notConfigured.prompt_smoke.endpoint_config_key,
      "HERMES_LOCAL_LLM_SMOKE_ENDPOINT",
    );
    assert.equal(
      notConfigured.prompt_smoke.model_config_key,
      "HERMES_LOCAL_LLM_MODEL",
    );
    assert.equal(notConfigured.prompt_smoke.endpoint_value_exposed, false);
    assert.equal(notConfigured.prompt_smoke.model_value_exposed, false);
    assert.equal(notConfigured.prompt_smoke.credentials_required, false);
    assert.equal(notConfigured.prompt_smoke.credentials_exposed, false);
    assert.equal(
      notConfigured.prompt_smoke.runtime_call_allowed,
      "true_for_fixed_smoke_prompt_only",
    );
    assert.equal(notConfigured.prompt_smoke.fixed_prompt_allowed, true);
    assert.equal(notConfigured.prompt_smoke.user_prompt_allowed, false);
    assert.equal(notConfigured.prompt_smoke.business_context_allowed, false);
    assert.equal(notConfigured.prompt_smoke.prompt_sent, false);
    assert.equal(
      notConfigured.prompt_smoke.prompt_text_exposed,
      "safe_fixed_prompt_only",
    );
    assert.equal(
      notConfigured.prompt_smoke.expected_response,
      HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE,
    );
    assert.equal(notConfigured.prompt_smoke.response_body_exposed, false);
    assert.equal(
      notConfigured.prompt_smoke.response_match_result,
      "not_configured",
    );
    assert.equal(
      notConfigured.prompt_smoke.fallback_policy.fallback_provider,
      "mock",
    );
    assert.equal(notConfigured.prompt_smoke.tokens_used, 0);

    assert.equal(notConfigured.boundary.writes_performed, false);
    assert.equal(notConfigured.boundary.chat_history_write_allowed, false);
    assert.equal(notConfigured.boundary.app_schema_write_allowed, false);
    assert.equal(notConfigured.boundary.ai_proposal_write_allowed, false);
    assert.equal(notConfigured.boundary.audit_apply_event_write_allowed, false);
    assert.equal(notConfigured.boundary.proposal_apply_allowed, false);
    assert.equal(notConfigured.boundary.hermes_runtime_executed, false);
    assert.equal(notConfigured.boundary.llm_runtime_executed, false);
    assert.equal(notConfigured.boundary.external_api_called, false);
    assert.equal(notConfigured.boundary.local_model_called, false);
    assert.equal(notConfigured.boundary.local_runtime_generate_http_called, false);
    assert.equal(notConfigured.boundary.prompt_sent_to_model, false);
    assert.equal(notConfigured.boundary.request_body_sent, false);
    assert.equal(notConfigured.boundary.response_body_exposed, false);
    assert.equal(notConfigured.boundary.embeddings_executed, false);
    assert.equal(notConfigured.boundary.vector_search_executed, false);
    assert.equal(notConfigured.boundary.restricted_domain_data_exposed, false);
    assert.equal(notConfigured.boundary.endpoint_value_exposed, false);
    assert.equal(notConfigured.boundary.model_value_exposed, false);
    assert.equal(notConfigured.boundary.credentials_exposed, false);
    assert.equal(notConfigured.boundary.user_prompt_sent_to_model, false);
    assert.equal(notConfigured.boundary.business_context_sent_to_model, false);
    assert.equal(notConfigured.boundary.fixed_smoke_prompt_sent_to_model, false);
    assert.equal(notConfigured.boundary.tokens_used, 0);

    const blockedUserPrompt = await runHermesLocalLlmPromptSmokeTestBoundary({
      provider: "local_llm_prompt_smoke",
      endpoint: "http://127.0.0.1:11434/api/generate",
      model: "safe-local-model",
      smoke: true,
      prompt: "作付け計画を作って",
    });

    assert.equal(blockedUserPrompt.result, "blocked");
    assert.equal(
      blockedUserPrompt.blocked_reason,
      "user_prompt_or_business_context_forbidden_by_day47_smoke_boundary",
    );
    assert.equal(blockedUserPrompt.boundary.user_prompt_sent_to_model, false);
    assert.equal(
      blockedUserPrompt.boundary.business_context_sent_to_model,
      false,
    );
    assert.equal(
      blockedUserPrompt.boundary.fixed_smoke_prompt_sent_to_model,
      false,
    );
    assert.equal(blockedUserPrompt.boundary.prompt_sent_to_model, false);

    const blockedBusinessContext =
      await runHermesLocalLlmPromptSmokeTestBoundary({
        provider: "local_llm_prompt_smoke",
        endpoint: "http://127.0.0.1:11434/api/generate",
        model: "safe-local-model",
        smoke: true,
        businessContext: {
          crop_cycle_id: 2,
        },
      });

    assert.equal(blockedBusinessContext.result, "blocked");
    assert.equal(
      blockedBusinessContext.blocked_reason,
      "user_prompt_or_business_context_forbidden_by_day47_smoke_boundary",
    );
    assert.equal(
      blockedBusinessContext.boundary.business_context_sent_to_model,
      false,
    );

    const externalEndpoints = [
      "https://api.openai.com/v1/chat/completions",
      "https://api.anthropic.com/v1/messages",
      "https://generativelanguage.googleapis.com/v1beta/models",
    ];

    for (const endpoint of externalEndpoints) {
      const blocked = await runHermesLocalLlmPromptSmokeTestBoundary({
        provider: "local_llm_prompt_smoke",
        endpoint,
        model: "safe-local-model",
        smoke: true,
      });

      assert.equal(blocked.result, "blocked");
      assert.equal(
        blocked.blocked_reason,
        "external_llm_endpoint_forbidden_by_day47_smoke_boundary",
      );
      assert.equal(blocked.prompt_smoke.response_match_result, "blocked");
      assert.equal(blocked.boundary.external_api_called, false);
      assert.equal(blocked.boundary.local_runtime_generate_http_called, false);
      assert.equal(blocked.boundary.prompt_sent_to_model, false);
      assert.equal(blocked.boundary.endpoint_value_exposed, false);
      assert.equal(blocked.boundary.credentials_exposed, false);
    }

    const notAllowlisted = await runHermesLocalLlmPromptSmokeTestBoundary({
      provider: "local_llm_prompt_smoke",
      endpoint: "http://127.0.0.1:11434/v1/completions",
      model: "safe-local-model",
      smoke: true,
    });

    assert.equal(notAllowlisted.result, "blocked");
    assert.equal(
      notAllowlisted.blocked_reason,
      "local_llm_prompt_smoke_endpoint_not_allowlisted_by_day47",
    );

    let fetchCalled = false;

    const matched = await runHermesLocalLlmPromptSmokeTestBoundary({
      provider: "local_llm_prompt_smoke",
      endpoint: "http://127.0.0.1:11434/api/generate",
      model: "safe-local-model",
      smoke: true,
      fetchImpl: async (_input, init) => {
        fetchCalled = true;

        assert.equal(init?.method, "POST");
        assert.equal(typeof init?.body, "string");

        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;

        assert.equal(body.model, "safe-local-model");
        assert.equal(body.prompt, HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT);
        assert.equal(body.stream, false);

        const bodyText = JSON.stringify(body);

        assert.equal(bodyText.includes("作付け"), false);
        assert.equal(bodyText.includes("crop_cycle"), false);
        assert.equal(bodyText.includes("proposal"), false);

        return new Response(
          JSON.stringify({
            response: HERMES_LOCAL_LLM_EXPECTED_SMOKE_RESPONSE,
            prompt_eval_count: 7,
            eval_count: 4,
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

    assert.equal(fetchCalled, true);
    assert.equal(matched.result, "ok");
    assert.equal(matched.prompt_smoke.prompt_sent, true);
    assert.equal(matched.prompt_smoke.response_match_result, "matched");
    assert.equal(matched.prompt_smoke.response_body_exposed, false);
    assert.equal(matched.prompt_smoke.endpoint_value_exposed, false);
    assert.equal(matched.prompt_smoke.model_value_exposed, false);
    assert.equal(matched.prompt_smoke.credentials_exposed, false);
    assert.equal(matched.prompt_smoke.tokens_used, 11);

    assert.equal(matched.boundary.writes_performed, false);
    assert.equal(matched.boundary.chat_history_write_allowed, false);
    assert.equal(matched.boundary.ai_proposal_write_allowed, false);
    assert.equal(matched.boundary.audit_apply_event_write_allowed, false);
    assert.equal(matched.boundary.proposal_apply_allowed, false);
    assert.equal(matched.boundary.hermes_runtime_executed, true);
    assert.equal(matched.boundary.llm_runtime_executed, true);
    assert.equal(matched.boundary.local_model_called, true);
    assert.equal(matched.boundary.local_runtime_generate_http_called, true);
    assert.equal(matched.boundary.prompt_sent_to_model, true);
    assert.equal(matched.boundary.request_body_sent, true);
    assert.equal(matched.boundary.response_body_exposed, false);
    assert.equal(matched.boundary.user_prompt_sent_to_model, false);
    assert.equal(matched.boundary.business_context_sent_to_model, false);
    assert.equal(matched.boundary.fixed_smoke_prompt_sent_to_model, true);
    assert.equal(matched.boundary.restricted_domain_data_exposed, false);
    assert.equal(matched.boundary.endpoint_value_exposed, false);
    assert.equal(matched.boundary.credentials_exposed, false);
    assert.equal(matched.boundary.tokens_used, 11);

    const unmatched = await runHermesLocalLlmPromptSmokeTestBoundary({
      provider: "local_llm_prompt_smoke",
      endpoint: "http://127.0.0.1:1234/v1/chat/completions",
      model: "safe-local-model",
      smoke: true,
      fetchImpl: async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        const bodyText = JSON.stringify(body);

        assert.equal(
          bodyText.includes(HERMES_LOCAL_LLM_FIXED_SMOKE_PROMPT),
          true,
        );
        assert.equal(bodyText.includes("crop_cycle"), false);

        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "wrong_response",
                },
              },
            ],
            usage: {
              total_tokens: 9,
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

    assert.equal(unmatched.result, "ok");
    assert.equal(unmatched.prompt_smoke.response_match_result, "unmatched");
    assert.equal(unmatched.prompt_smoke.response_body_exposed, false);
    assert.equal(unmatched.prompt_smoke.tokens_used, 9);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checked: "hermes_local_llm_prompt_smoke_test_boundary",
        },
        null,
        2,
      ),
    );
  } finally {
    if (previousSmokeEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_SMOKE_ENDPOINT = previousSmokeEndpoint;
    }

    if (previousChatEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT = previousChatEndpoint;
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
