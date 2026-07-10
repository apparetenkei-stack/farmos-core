import assert from "node:assert/strict";
import { POST, OPTIONS } from "../../src/app/api/hermes/proposal-draft-persistence/route";

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function callPost(body: unknown): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const response = await POST(
    new Request("http://localhost/api/hermes/proposal-draft-persistence", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: typeof body === "string" ? body : JSON.stringify(body)
    })
  );

  return {
    status: response.status,
    body: await readJson(response)
  };
}

async function main(): Promise<void> {
  const previousEnabled =
    process.env.HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED;

  try {
    process.env.HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED = "false";

    const options = await OPTIONS();
    assert.equal(options.status, 204);

    const disabled = await callPost({
      message: "day82 disabled smoke",
      includeReadonlyContext: false,
      provider: "mock"
    });

    assert.equal(disabled.status, 403);
    assert.equal(disabled.body.result, "blocked");
    assert.equal(disabled.body.proposal_draft_persisted, false);
    assert.equal(disabled.body.proposal_draft_saved, false);
    assert.equal(disabled.body.proposal_apply_ready, false);
    assert.equal(disabled.body.proposal_draft_apply_ready, false);
    assert.equal(disabled.body.proposal_apply_performed, false);
    assert.equal(disabled.body.confirmation_token_created, false);
    assert.equal(disabled.body.audit_apply_event_created, false);
    assert.equal(disabled.body.app_db_write_performed, false);
    assert.equal(disabled.body.db_write_performed, false);

    process.env.HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED = "true";

    const invalidJson = await callPost("{");
    assert.equal(invalidJson.status, 400);
    assert.equal(invalidJson.body.error, "invalid_json");

    const forbiddenBodyKey = ["proposal", "Body"].join("");
    const forbiddenPromptKey = ["system", "Prompt"].join("");

    const forbiddenDraftBody = await callPost({
      message: "day82 forbidden smoke",
      includeReadonlyContext: false,
      provider: "mock",
      [forbiddenBodyKey]: {
        title: "must not be accepted"
      }
    });

    assert.equal(forbiddenDraftBody.status, 400);
    assert.equal(
      forbiddenDraftBody.body.error,
      `forbidden_request_body_field:${forbiddenBodyKey}`
    );

    const forbiddenPrompt = await callPost({
      message: "day82 forbidden prompt smoke",
      includeReadonlyContext: false,
      provider: "mock",
      [forbiddenPromptKey]: "must not be accepted"
    });

    assert.equal(forbiddenPrompt.status, 400);
    assert.equal(
      forbiddenPrompt.body.error,
      `forbidden_request_body_field:${forbiddenPromptKey}`
    );

    const unknownField = await callPost({
      message: "day82 unknown field smoke",
      includeReadonlyContext: false,
      provider: "mock",
      arbitrary: true
    });

    assert.equal(unknownField.status, 400);
    assert.equal(unknownField.body.error, "unknown_request_body_field:arbitrary");

    const nonMockProvider = await callPost({
      message: "day82 provider guard smoke",
      includeReadonlyContext: false,
      provider: "ollama"
    });

    assert.equal(nonMockProvider.status, 400);
    assert.equal(nonMockProvider.body.error, "provider_must_be_mock");

    const enabled = await callPost({
      message: "day82 api smoke persistence boundary",
      includeReadonlyContext: false,
      provider: "mock"
    });

    assert.equal(enabled.status, 200);
    assert.equal(enabled.body.result, "ok");
    assert.equal(
      enabled.body.proposal_draft_persistence_api_boundary,
      "day82_core_api_smoke_only"
    );
    assert.equal(enabled.body.proposal_draft_persisted, true);
    assert.equal(enabled.body.proposal_draft_saved, true);
    assert.equal(enabled.body.proposal_apply_ready, false);
    assert.equal(enabled.body.proposal_draft_apply_ready, false);
    assert.equal(enabled.body.proposal_apply_performed, false);
    assert.equal(enabled.body.confirmation_token_created, false);
    assert.equal(enabled.body.audit_apply_event_created, false);
    assert.equal(enabled.body.app_db_write_performed, false);
    assert.equal(enabled.body.api_route_added, true);
    assert.equal(enabled.body.ui_connected, false);
    assert.equal(enabled.body.server_action_used, false);
    assert.equal(enabled.body.form_action_used, false);
    assert.equal(enabled.body.insert_target_schema, "ai");
    assert.equal(enabled.body.insert_target_table, "proposal_inbox");
    assert.equal(enabled.body.request_provider, "mock");

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checked: "hermes_proposal_draft_persistence_api_smoke_boundary",
          disabled_boundary: "ok",
          invalid_json: "ok",
          forbidden_request_body_fields: "ok",
          unknown_request_body_field: "ok",
          provider_guard: "ok",
          enabled_mock_persistence_smoke: "ok",
          proposal_draft_persisted: enabled.body.proposal_draft_persisted,
          proposal_draft_saved: enabled.body.proposal_draft_saved,
          proposal_apply_ready: enabled.body.proposal_apply_ready,
          proposal_draft_apply_ready: enabled.body.proposal_draft_apply_ready,
          proposal_apply_performed: enabled.body.proposal_apply_performed,
          confirmation_token_created: enabled.body.confirmation_token_created,
          audit_apply_event_created: enabled.body.audit_apply_event_created,
          app_db_write_performed: enabled.body.app_db_write_performed,
          api_route_added: enabled.body.api_route_added,
          ui_connected: enabled.body.ui_connected
        },
        null,
        2
      )
    );
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED;
    } else {
      process.env.HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED =
        previousEnabled;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
