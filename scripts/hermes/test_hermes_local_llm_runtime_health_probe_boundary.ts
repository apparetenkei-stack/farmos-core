import assert from "node:assert/strict";

import { runHermesLocalLlmRuntimeHealthProbeBoundary } from "./api_boundary/hermes_local_llm_runtime_health_probe_boundary";

async function main() {
  const previousEndpoint = process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;

  try {
    const notConfigured = await runHermesLocalLlmRuntimeHealthProbeBoundary({
      provider: "local_llm_probe",
      dryRun: true,
    });

    assert.equal(notConfigured.result, "ok");
    assert.equal(
      notConfigured.health_probe.mode,
      "hermes_local_llm_runtime_health_probe_boundary",
    );
    assert.equal(notConfigured.health_probe.runtime, "local_llm");
    assert.equal(
      notConfigured.health_probe.health_probe_mode,
      "minimal_runtime_reachability_probe",
    );
    assert.equal(notConfigured.health_probe.configured_provider, "local_llm_probe");
    assert.equal(
      notConfigured.health_probe.endpoint_config_key,
      "HERMES_LOCAL_LLM_HEALTH_ENDPOINT",
    );
    assert.equal(
      notConfigured.health_probe.model_config_key,
      "HERMES_LOCAL_LLM_MODEL",
    );
    assert.equal(notConfigured.health_probe.endpoint_value_exposed, false);
    assert.equal(notConfigured.health_probe.model_value_exposed, false);
    assert.equal(notConfigured.health_probe.credentials_required, false);
    assert.equal(notConfigured.health_probe.credentials_exposed, false);
    assert.equal(
      notConfigured.health_probe.http_method_allowed,
      "GET_OR_HEAD_ONLY",
    );
    assert.equal(notConfigured.health_probe.request_body_sent, false);
    assert.equal(notConfigured.health_probe.response_body_exposed, false);
    assert.equal(notConfigured.health_probe.runtime_reachable, "not_configured");
    assert.equal(
      notConfigured.health_probe.runtime_call_allowed,
      "true_for_health_probe_only",
    );
    assert.equal(notConfigured.health_probe.prompt_sent, false);
    assert.equal(
      notConfigured.health_probe.fallback_policy.fallback_provider,
      "mock",
    );

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
    assert.equal(notConfigured.boundary.local_runtime_health_http_called, false);
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
    assert.equal(notConfigured.boundary.tokens_used, 0);

    const forbiddenEndpoints = [
      "http://127.0.0.1:11434/api/generate",
      "http://127.0.0.1:11434/api/chat",
      "http://127.0.0.1:1234/v1/chat/completions",
      "http://127.0.0.1:1234/v1/completions",
    ];

    for (const endpoint of forbiddenEndpoints) {
      const blocked = await runHermesLocalLlmRuntimeHealthProbeBoundary({
        provider: "local_llm_probe",
        endpoint,
        probe: true,
      });

      assert.equal(blocked.result, "blocked");
      assert.equal(blocked.health_probe.runtime_reachable, "blocked");
      assert.equal(
        blocked.blocked_reason,
        "local_llm_inference_endpoint_forbidden_by_day46_probe_boundary",
      );
      assert.equal(blocked.boundary.local_runtime_health_http_called, false);
      assert.equal(blocked.boundary.local_runtime_generate_http_called, false);
      assert.equal(blocked.boundary.prompt_sent_to_model, false);
      assert.equal(blocked.boundary.tokens_used, 0);
      assert.equal(blocked.boundary.endpoint_value_exposed, false);
      assert.equal(blocked.boundary.credentials_exposed, false);
    }

    const postBlocked = await runHermesLocalLlmRuntimeHealthProbeBoundary({
      provider: "local_llm_probe",
      endpoint: "http://127.0.0.1:11434/api/tags",
      httpMethod: "POST",
      probe: true,
    });

    assert.equal(postBlocked.result, "blocked");
    assert.equal(
      postBlocked.blocked_reason,
      "http_method_forbidden_by_day46_probe_boundary",
    );
    assert.equal(postBlocked.boundary.local_runtime_health_http_called, false);
    assert.equal(postBlocked.boundary.request_body_sent, false);
    assert.equal(postBlocked.boundary.response_body_exposed, false);

    const nonLoopbackBlocked = await runHermesLocalLlmRuntimeHealthProbeBoundary({
      provider: "local_llm_probe",
      endpoint: "https://api.openai.com/v1/models",
      httpMethod: "HEAD",
      probe: true,
    });

    assert.equal(nonLoopbackBlocked.result, "blocked");
    assert.equal(
      nonLoopbackBlocked.blocked_reason,
      "non_loopback_local_health_endpoint_forbidden_by_day46",
    );
    assert.equal(nonLoopbackBlocked.boundary.external_api_called, false);
    assert.equal(nonLoopbackBlocked.boundary.local_runtime_health_http_called, false);

    let fetchCalled = false;

    const reachable = await runHermesLocalLlmRuntimeHealthProbeBoundary({
      provider: "local_llm_probe",
      endpoint: "http://127.0.0.1:11434/api/tags",
      httpMethod: "HEAD",
      probe: true,
      fetchImpl: async (_input, init) => {
        fetchCalled = true;
        assert.equal(init?.method, "HEAD");
        assert.equal("body" in (init ?? {}), false);

        return new Response(null, {
          status: 200,
        });
      },
    });

    assert.equal(fetchCalled, true);
    assert.equal(reachable.result, "ok");
    assert.equal(reachable.health_probe.runtime_reachable, "reachable");
    assert.equal(reachable.boundary.local_runtime_health_http_called, true);
    assert.equal(reachable.boundary.local_runtime_generate_http_called, false);
    assert.equal(reachable.boundary.request_body_sent, false);
    assert.equal(reachable.boundary.response_body_exposed, false);
    assert.equal(reachable.boundary.prompt_sent_to_model, false);
    assert.equal(reachable.boundary.tokens_used, 0);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checked: "hermes_local_llm_runtime_health_probe_boundary",
        },
        null,
        2,
      ),
    );
  } finally {
    if (previousEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_HEALTH_ENDPOINT = previousEndpoint;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
