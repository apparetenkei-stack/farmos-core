import assert from "node:assert/strict";

import { runHermesBusinessPromptPolicyGateRedactionBoundary } from "./api_boundary/hermes_business_prompt_policy_gate_redaction_boundary";

type BoundaryResult = Awaited<
  ReturnType<typeof runHermesBusinessPromptPolicyGateRedactionBoundary>
>;

function assertSafeBoundary(result: BoundaryResult) {
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
  assert.equal(result.boundary.raw_prompt_exposed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.endpoint_value_exposed, false);
  assert.equal(result.boundary.model_value_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);
  assert.equal(result.boundary.user_prompt_sent_to_model, false);
  assert.equal(result.boundary.business_context_sent_to_model, false);
  assert.equal(result.boundary.real_business_prompt_sent_to_model, false);
  assert.equal(result.boundary.fixed_business_dummy_prompt_sent_to_model, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.tokens_used, 0);

  assert.equal(result.business_prompt_policy_gate.endpoint_value_exposed, false);
  assert.equal(result.business_prompt_policy_gate.model_value_exposed, false);
  assert.equal(result.business_prompt_policy_gate.credentials_required, false);
  assert.equal(result.business_prompt_policy_gate.credentials_exposed, false);
  assert.equal(result.business_prompt_policy_gate.runtime_call_allowed, false);
  assert.equal(result.business_prompt_policy_gate.request_body_created, false);
  assert.equal(result.business_prompt_policy_gate.request_body_sent, false);
  assert.equal(result.business_prompt_policy_gate.prompt_sent, false);
  assert.equal(result.business_prompt_policy_gate.response_body_exposed, false);
  assert.equal(result.business_prompt_policy_gate.raw_prompt_exposed, false);
  assert.equal(
    result.business_prompt_policy_gate.sanitized_prompt_preview_exposed,
    "safe_metadata_only",
  );
  assert.equal(
    result.business_prompt_policy_gate.safe_metadata.raw_prompt_exposed,
    false,
  );
  assert.equal(
    result.business_prompt_policy_gate.safe_metadata
      .sanitized_prompt_preview_exposed,
    "safe_metadata_only",
  );
  assert.equal(result.business_prompt_policy_gate.fallback_provider, "mock");
  assert.equal(result.business_prompt_policy_gate.tokens_used, 0);

  assert.equal(
    result.business_prompt_contract.mode,
    "hermes_local_llm_business_prompt_dry_run_contract_boundary",
  );
  assert.equal(result.business_prompt_contract.runtime_call_allowed, false);
  assert.equal(result.business_prompt_contract.prompt_sent, false);
  assert.equal(result.business_prompt_contract.request_body_created, false);
  assert.equal(result.business_prompt_contract.request_body_sent, false);
  assert.equal(result.business_prompt_contract.response_body_exposed, false);

  assert.equal(
    result.business_prompt_smoke.mode,
    "hermes_local_llm_business_prompt_smoke_test_boundary",
  );
  assert.equal(
    result.business_prompt_smoke.prompt_smoke_mode,
    "fixed_business_dummy_prompt_only",
  );
  assert.equal(result.business_prompt_smoke.prompt_sent, false);
  assert.equal(result.business_prompt_smoke.response_body_exposed, false);
}

async function main() {
  const empty = await runHermesBusinessPromptPolicyGateRedactionBoundary({
    provider: "business_prompt_policy_gate",
    dryRun: true,
  });

  assert.equal(empty.result, "ok");
  assert.equal(
    empty.business_prompt_policy_gate.mode,
    "hermes_business_prompt_policy_gate_redaction_boundary",
  );
  assert.equal(empty.business_prompt_policy_gate.runtime, "local_llm");
  assert.equal(
    empty.business_prompt_policy_gate.policy_gate_mode,
    "dry_run_policy_gate_only",
  );
  assert.equal(
    empty.business_prompt_policy_gate.configured_provider,
    "business_prompt_policy_gate",
  );
  assert.equal(empty.business_prompt_policy_gate.prompt_category, "unknown");
  assert.equal(empty.business_prompt_policy_gate.prompt_risk_level, "low");
  assert.equal(empty.business_prompt_policy_gate.redaction_decision, "not_required");
  assert.equal(empty.business_prompt_policy_gate.send_decision, "not_configured");
  assert.equal(empty.business_prompt_policy_gate.safe_metadata.prompt_present, false);
  assertSafeBoundary(empty);

  const operational =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "business_prompt_policy_gate",
      dryRun: true,
      sample: "今日の作業を整理して",
    });

  assert.equal(operational.result, "ok");
  assert.equal(
    operational.business_prompt_policy_gate.prompt_category,
    "operational_question",
  );
  assert.equal(operational.business_prompt_policy_gate.prompt_risk_level, "low");
  assert.equal(
    operational.business_prompt_policy_gate.redaction_decision,
    "not_required",
  );
  assert.equal(operational.business_prompt_policy_gate.send_decision, "dry_run_only");
  assertSafeBoundary(operational);

  const planning = await runHermesBusinessPromptPolicyGateRedactionBoundary({
    provider: "business_prompt_policy_gate",
    dryRun: true,
    sample: "来週の作付け計画を整理して",
  });

  assert.equal(planning.result, "ok");
  assert.equal(
    planning.business_prompt_policy_gate.prompt_category,
    "planning_question",
  );
  assert.equal(planning.business_prompt_policy_gate.prompt_risk_level, "medium");
  assert.equal(planning.business_prompt_policy_gate.redaction_decision, "required");
  assert.equal(planning.business_prompt_policy_gate.send_decision, "dry_run_only");
  assertSafeBoundary(planning);

  const proposalRelated =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "business_prompt_policy_gate",
      dryRun: true,
      sample: "Hermes提案レビュー状況を確認して",
    });

  assert.equal(proposalRelated.result, "ok");
  assert.equal(
    proposalRelated.business_prompt_policy_gate.prompt_category,
    "proposal_related",
  );
  assert.equal(proposalRelated.business_prompt_policy_gate.prompt_risk_level, "high");
  assert.equal(
    proposalRelated.business_prompt_policy_gate.redaction_decision,
    "required",
  );
  assert.equal(
    proposalRelated.business_prompt_policy_gate.send_decision,
    "dry_run_only",
  );
  assertSafeBoundary(proposalRelated);

  const restricted =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "business_prompt_policy_gate",
      dryRun: true,
      sample: "顧客の注文金額と支払い状況を整理して",
    });

  assert.equal(restricted.result, "blocked");
  assert.equal(
    restricted.business_prompt_policy_gate.prompt_category,
    "restricted_domain",
  );
  assert.equal(restricted.business_prompt_policy_gate.prompt_risk_level, "blocked");
  assert.equal(restricted.business_prompt_policy_gate.redaction_decision, "blocked");
  assert.equal(restricted.business_prompt_policy_gate.send_decision, "blocked");
  assert.equal(
    restricted.blocked_reason,
    "restricted_domain_data_forbidden_by_day50_policy_gate",
  );
  assert.equal(restricted.boundary.restricted_domain_data_exposed, false);
  assertSafeBoundary(restricted);

  const businessContext =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "business_prompt_policy_gate",
      dryRun: true,
      sample: "今日の作業計画を整理して",
      businessContext: {
        crop_cycle_id: 2,
      },
    });

  assert.equal(businessContext.result, "blocked");
  assert.equal(
    businessContext.blocked_reason,
    "business_context_forbidden_by_day50_policy_gate",
  );
  assert.equal(businessContext.boundary.business_context_sent_to_model, false);
  assertSafeBoundary(businessContext);

  const proposalBody =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "business_prompt_policy_gate",
      dryRun: true,
      sample: "proposal_body crop_cycle_id=2 の提案本文を確認して",
    });

  assert.equal(proposalBody.result, "blocked");
  assert.equal(
    proposalBody.blocked_reason,
    "proposal_body_forbidden_by_day50_policy_gate",
  );
  assert.equal(proposalBody.boundary.real_business_prompt_sent_to_model, false);
  assertSafeBoundary(proposalBody);

  const badProvider =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "local_llm_business_prompt_smoke",
      dryRun: true,
      sample: "今日の作業を整理して",
    });

  assert.equal(badProvider.result, "blocked");
  assert.equal(
    badProvider.blocked_reason,
    "provider_forbidden_by_day50_business_prompt_policy_gate_boundary",
  );
  assertSafeBoundary(badProvider);

  const nonDryRun =
    await runHermesBusinessPromptPolicyGateRedactionBoundary({
      provider: "business_prompt_policy_gate",
      dryRun: false,
      sample: "今日の作業を整理して",
    });

  assert.equal(nonDryRun.result, "blocked");
  assert.equal(
    nonDryRun.blocked_reason,
    "day50_business_prompt_policy_gate_requires_dry_run",
  );
  assertSafeBoundary(nonDryRun);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_business_prompt_policy_gate_redaction_boundary",
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
