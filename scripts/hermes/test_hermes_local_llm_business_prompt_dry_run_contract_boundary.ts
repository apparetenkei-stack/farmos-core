import assert from "node:assert/strict";

import { runHermesLocalLlmBusinessPromptDryRunContractBoundary } from "./api_boundary/hermes_local_llm_business_prompt_dry_run_contract_boundary";

function assertNoRuntimeOrWrites(
  result: ReturnType<typeof runHermesLocalLlmBusinessPromptDryRunContractBoundary>,
) {
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.external_api_called, false);
  assert.equal(result.boundary.local_model_called, false);
  assert.equal(result.boundary.local_runtime_generate_http_called, false);
  assert.equal(result.boundary.prompt_sent_to_model, false);
  assert.equal(result.boundary.request_body_created, false);
  assert.equal(result.boundary.request_body_sent, false);
  assert.equal(result.boundary.response_body_exposed, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.endpoint_value_exposed, false);
  assert.equal(result.boundary.model_value_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.user_prompt_sent_to_model, false);
  assert.equal(result.boundary.business_context_sent_to_model, false);
  assert.equal(result.boundary.business_prompt_sent_to_model, false);
  assert.equal(result.boundary.tokens_used, 0);

  assert.equal(result.business_prompt_contract.endpoint_value_exposed, false);
  assert.equal(result.business_prompt_contract.model_value_exposed, false);
  assert.equal(result.business_prompt_contract.credentials_required, false);
  assert.equal(result.business_prompt_contract.credentials_exposed, false);
  assert.equal(result.business_prompt_contract.runtime_call_allowed, false);
  assert.equal(result.business_prompt_contract.business_prompt_allowed, false);
  assert.equal(result.business_prompt_contract.user_prompt_allowed, false);
  assert.equal(result.business_prompt_contract.business_context_allowed, false);
  assert.equal(
    result.business_prompt_contract.restricted_domain_data_allowed,
    false,
  );
  assert.equal(result.business_prompt_contract.prompt_sent, false);
  assert.equal(result.business_prompt_contract.request_body_created, false);
  assert.equal(result.business_prompt_contract.request_body_sent, false);
  assert.equal(result.business_prompt_contract.response_body_exposed, false);
  assert.equal(
    result.business_prompt_contract.fallback_policy.fallback_provider,
    "mock",
  );
  assert.equal(result.business_prompt_contract.tokens_used, 0);
}

async function main() {
  const previousEndpoint = process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  const previousModel = process.env.HERMES_LOCAL_LLM_MODEL;

  delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
  delete process.env.HERMES_LOCAL_LLM_MODEL;

  try {
    const notConfigured = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
    });

    assert.equal(notConfigured.result, "ok");
    assert.equal(
      notConfigured.business_prompt_contract.mode,
      "hermes_local_llm_business_prompt_dry_run_contract_boundary",
    );
    assert.equal(notConfigured.business_prompt_contract.runtime, "local_llm");
    assert.equal(
      notConfigured.business_prompt_contract.contract_mode,
      "business_prompt_dry_run_contract_only",
    );
    assert.equal(
      notConfigured.business_prompt_contract.configured_provider,
      "local_llm_business_prompt_contract",
    );
    assert.equal(
      notConfigured.business_prompt_contract.endpoint_config_key,
      "HERMES_LOCAL_LLM_CHAT_ENDPOINT",
    );
    assert.equal(
      notConfigured.business_prompt_contract.model_config_key,
      "HERMES_LOCAL_LLM_MODEL",
    );
    assert.equal(notConfigured.business_prompt_contract.endpoint_configured, false);
    assert.equal(notConfigured.business_prompt_contract.model_configured, false);
    assert.equal(notConfigured.business_prompt_contract.prompt_category, "unknown");
    assert.equal(notConfigured.business_prompt_contract.prompt_risk_level, "medium");
    assert.equal(
      notConfigured.business_prompt_contract.prompt_send_decision,
      "not_configured",
    );
    assert.equal(
      notConfigured.business_prompt_contract.matched_policy,
      "local_llm_business_prompt_contract_not_configured",
    );
    assertNoRuntimeOrWrites(notConfigured);

    const planning = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
      sample: "今日の作業計画を整理して",
    });

    assert.equal(planning.result, "ok");
    assert.equal(planning.business_prompt_contract.prompt_category, "planning_question");
    assert.equal(planning.business_prompt_contract.prompt_risk_level, "medium");
    assert.equal(
      planning.business_prompt_contract.prompt_send_decision,
      "dry_run_only",
    );
    assert.equal(
      planning.business_prompt_contract.blocked_reason,
      "day48_business_prompt_execution_not_enabled",
    );
    assertNoRuntimeOrWrites(planning);

    const proposal = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
      sample: "Hermes proposal のレビューと承認可否を確認して",
    });

    assert.equal(proposal.result, "ok");
    assert.equal(
      proposal.business_prompt_contract.prompt_category,
      "proposal_related",
    );
    assert.equal(proposal.business_prompt_contract.prompt_risk_level, "high");
    assert.equal(
      proposal.business_prompt_contract.prompt_send_decision,
      "dry_run_only",
    );
    assertNoRuntimeOrWrites(proposal);

    const operational = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
      sample: "圃場ごとの収穫作業を確認して",
    });

    assert.equal(operational.result, "ok");
    assert.equal(
      operational.business_prompt_contract.prompt_category,
      "operational_question",
    );
    assert.equal(operational.business_prompt_contract.prompt_risk_level, "low");
    assert.equal(
      operational.business_prompt_contract.prompt_send_decision,
      "dry_run_only",
    );
    assertNoRuntimeOrWrites(operational);

    const restricted = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
      sample: "顧客の注文金額と支払い状況を整理して",
    });

    assert.equal(restricted.result, "blocked");
    assert.equal(
      restricted.business_prompt_contract.prompt_category,
      "restricted_domain",
    );
    assert.equal(restricted.business_prompt_contract.prompt_risk_level, "blocked");
    assert.equal(restricted.business_prompt_contract.prompt_send_decision, "blocked");
    assert.equal(
      restricted.business_prompt_contract.blocked_reason,
      "restricted_domain_data_forbidden",
    );
    assert.equal(restricted.boundary.restricted_domain_data_exposed, false);
    assert.equal(restricted.boundary.business_prompt_sent_to_model, false);
    assertNoRuntimeOrWrites(restricted);

    const blockedBusinessContext =
      runHermesLocalLlmBusinessPromptDryRunContractBoundary({
        provider: "local_llm_business_prompt_contract",
        dryRun: true,
        sample: "作付け計画を整理して",
        businessContext: {
          crop_cycle_id: 2,
        },
      });

    assert.equal(blockedBusinessContext.result, "blocked");
    assert.equal(
      blockedBusinessContext.business_prompt_contract.prompt_category,
      "restricted_domain",
    );
    assert.equal(
      blockedBusinessContext.business_prompt_contract.blocked_reason,
      "business_context_execution_not_enabled",
    );
    assert.equal(
      blockedBusinessContext.boundary.business_context_sent_to_model,
      false,
    );
    assertNoRuntimeOrWrites(blockedBusinessContext);

    const executionAttempt =
      runHermesLocalLlmBusinessPromptDryRunContractBoundary({
        provider: "local_llm_business_prompt_contract",
        dryRun: false,
        sample: "今日の作業計画を整理して",
      });

    assert.equal(executionAttempt.result, "blocked");
    assert.equal(
      executionAttempt.business_prompt_contract.blocked_reason,
      "day48_business_prompt_execution_not_enabled",
    );
    assert.equal(executionAttempt.boundary.llm_runtime_executed, false);
    assert.equal(executionAttempt.boundary.prompt_sent_to_model, false);
    assert.equal(executionAttempt.boundary.request_body_created, false);
    assert.equal(executionAttempt.boundary.request_body_sent, false);
    assertNoRuntimeOrWrites(executionAttempt);

    let fetchCalled = false;

    const fetchSafety = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_business_prompt_contract",
      dryRun: true,
      sample: "収穫作業を確認して",
      fetchImpl: () => {
        fetchCalled = true;
      },
    });

    assert.equal(fetchSafety.result, "ok");
    assert.equal(fetchCalled, false);
    assert.equal(fetchSafety.boundary.request_body_created, false);
    assert.equal(fetchSafety.boundary.request_body_sent, false);
    assert.equal(fetchSafety.boundary.prompt_sent_to_model, false);
    assertNoRuntimeOrWrites(fetchSafety);

    const badProvider = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
      provider: "local_llm_prompt_smoke",
      dryRun: true,
      sample: "収穫作業を確認して",
    });

    assert.equal(badProvider.result, "blocked");
    assert.equal(
      badProvider.business_prompt_contract.blocked_reason,
      "provider_forbidden_by_day48_business_prompt_contract_boundary",
    );
    assertNoRuntimeOrWrites(badProvider);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checked: "hermes_local_llm_business_prompt_dry_run_contract_boundary",
        },
        null,
        2,
      ),
    );
  } finally {
    if (previousEndpoint === undefined) {
      delete process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT;
    } else {
      process.env.HERMES_LOCAL_LLM_CHAT_ENDPOINT = previousEndpoint;
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
