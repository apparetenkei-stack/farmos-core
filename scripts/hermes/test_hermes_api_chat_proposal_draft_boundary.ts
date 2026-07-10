import assert from "node:assert/strict";

import { runHermesApiChatMinimalBoundary } from "../../src/app/api/hermes/chat/route";

function assertNoWrites(body: Awaited<ReturnType<typeof runHermesApiChatMinimalBoundary>>["body"]) {
  assert.equal(body.db_write_performed, false);
  assert.equal(body.proposal_created, false);
  assert.equal(body.proposal_saved, false);
  assert.equal(body.proposal_apply_performed, false);
  assert.equal(body.chat_history_saved, false);
  assert.equal(body.audit_record_saved, false);
  assert.equal(body.app_db_write_performed, false);
  assert.equal(body.proposal_draft_saved, false);
  assert.equal(body.proposal_draft_persisted, false);
  assert.equal(body.proposal_draft_apply_ready, false);
}

async function main() {
  const disabled = await runHermesApiChatMinimalBoundary({
    body: {
      message: "day78 disabled proposal draft smoke",
      includeReadonlyContext: false,
      provider: "mock",
    },
    env: {
      HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "false",
      HERMES_LLM_SMOKE_TEST_ENABLED: "true",
      HERMES_LLM_PROVIDER: "mock",
    },
  });

  assert.equal(disabled.httpStatus, 200);
  assert.equal(disabled.body.status, "blocked");
  assert.equal(disabled.body.api_boundary_enabled, false);
  assert.equal(disabled.body.proposal_draft_candidate_enabled, false);
  assert.equal(disabled.body.proposal_draft_created, false);
  assert.equal(disabled.body.proposal_draft_candidate, null);
  assertNoWrites(disabled.body);

  const mockEnabled = await runHermesApiChatMinimalBoundary({
    body: {
      message: "day78 mock proposal draft smoke",
      includeReadonlyContext: false,
      provider: "mock",
    },
    env: {
      HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
      HERMES_LLM_SMOKE_TEST_ENABLED: "true",
      HERMES_LLM_PROVIDER: "mock",
    },
  });

  assert.equal(mockEnabled.httpStatus, 200);
  assert.equal(mockEnabled.body.api_boundary_enabled, true);
  assert.equal(mockEnabled.body.provider, "mock");
  assert.equal(mockEnabled.body.proposal_draft_candidate_enabled, true);
  assert.equal(mockEnabled.body.proposal_draft_created, true);
  assert.ok(mockEnabled.body.proposal_draft_candidate);
  assert.equal(
    mockEnabled.body.proposal_draft_candidate.id,
    "dry_run_day78_proposal_draft_candidate",
  );
  assert.equal(mockEnabled.body.proposal_draft_candidate.status, "draft_preview_only");
  assert.equal(
    mockEnabled.body.proposal_draft_candidate.proposal_type,
    "hermes_chat_draft_preview",
  );
  assert.equal(mockEnabled.body.proposal_draft_candidate.source, "mock");
  assert.equal(mockEnabled.body.proposal_draft_candidate.persistence, "not_saved");
  assert.equal(mockEnabled.body.proposal_draft_candidate.requires_human_review, true);
  assert.equal(mockEnabled.body.proposal_draft_candidate.created_from_message, true);
  assert.match(
    mockEnabled.body.proposal_draft_candidate.summary,
    /day78 mock proposal draft smoke/,
  );
  assertNoWrites(mockEnabled.body);

  const ollamaDisabledRuntime = await runHermesApiChatMinimalBoundary({
    body: {
      message: "day78 ollama provider must not create proposal draft",
      includeReadonlyContext: false,
      provider: "ollama",
    },
    env: {
      HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
      HERMES_LLM_SMOKE_TEST_ENABLED: "false",
      HERMES_LLM_PROVIDER: "ollama",
    },
  });

  assert.equal(ollamaDisabledRuntime.httpStatus, 200);
  assert.equal(ollamaDisabledRuntime.body.provider, "ollama");
  assert.equal(ollamaDisabledRuntime.body.runtime_call_allowed, false);
  assert.equal(ollamaDisabledRuntime.body.proposal_draft_candidate_enabled, true);
  assert.equal(ollamaDisabledRuntime.body.proposal_draft_created, false);
  assert.equal(ollamaDisabledRuntime.body.proposal_draft_candidate, null);
  assertNoWrites(ollamaDisabledRuntime.body);

  const forbiddenProposalBody = await runHermesApiChatMinimalBoundary({
    body: {
      message: "day78 forbidden proposal body",
      includeReadonlyContext: false,
      provider: "mock",
      proposalBody: { title: "must not be accepted" },
    },
    env: {
      HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
      HERMES_LLM_SMOKE_TEST_ENABLED: "true",
      HERMES_LLM_PROVIDER: "mock",
    },
  });

  assert.equal(forbiddenProposalBody.httpStatus, 400);
  assert.equal(forbiddenProposalBody.body.status, "bad_request");
  assert.equal(
    forbiddenProposalBody.body.error_message,
    "forbidden_request_body_field:proposalBody",
  );
  assert.equal(forbiddenProposalBody.body.proposal_draft_candidate_enabled, false);
  assert.equal(forbiddenProposalBody.body.proposal_draft_created, false);
  assert.equal(forbiddenProposalBody.body.proposal_draft_candidate, null);
  assertNoWrites(forbiddenProposalBody.body);

  const forbiddenSystemPrompt = await runHermesApiChatMinimalBoundary({
    body: {
      message: "day78 forbidden system prompt",
      includeReadonlyContext: false,
      provider: "mock",
      systemPrompt: "must not be accepted",
    },
    env: {
      HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED: "true",
      HERMES_LLM_SMOKE_TEST_ENABLED: "true",
      HERMES_LLM_PROVIDER: "mock",
    },
  });

  assert.equal(forbiddenSystemPrompt.httpStatus, 400);
  assert.equal(forbiddenSystemPrompt.body.status, "bad_request");
  assert.equal(
    forbiddenSystemPrompt.body.error_message,
    "forbidden_request_body_field:systemPrompt",
  );
  assert.equal(forbiddenSystemPrompt.body.proposal_draft_candidate_enabled, false);
  assert.equal(forbiddenSystemPrompt.body.proposal_draft_created, false);
  assert.equal(forbiddenSystemPrompt.body.proposal_draft_candidate, null);
  assertNoWrites(forbiddenSystemPrompt.body);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_api_chat_proposal_draft_boundary",
    disabled_boundary_no_draft: "ok",
    mock_enabled_draft_candidate: "ok",
    ollama_no_draft_candidate: "ok",
    forbidden_proposal_body: "ok",
    forbidden_system_prompt: "ok",
    no_write_flags: "ok",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
