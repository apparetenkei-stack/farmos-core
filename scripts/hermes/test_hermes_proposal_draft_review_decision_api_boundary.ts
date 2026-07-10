import assert from "node:assert/strict";
import {
  DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID
} from "../../src/lib/hermes/hermes_proposal_draft_review_decision_boundary";
import { OPTIONS, POST } from "../../src/app/api/hermes/proposal-draft-review-decision/route";

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function callPost(body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await POST(
    new Request("http://localhost/api/hermes/proposal-draft-review-decision", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: typeof body === "string" ? body : JSON.stringify(body)
    })
  );

  return { status: response.status, body: await readJson(response) };
}

async function main(): Promise<void> {
  const previousEnabled =
    process.env.HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED;

  try {
    process.env.HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED = "false";

    const options = await OPTIONS();
    assert.equal(options.status, 204);

    const disabled = await callPost({
      proposalId: DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID,
      decisionType: "request_revision"
    });

    assert.equal(disabled.status, 403);
    assert.equal(disabled.body.result, "blocked");
    assert.equal(disabled.body.review_decision_recorded, false);
    assert.equal(disabled.body.review_decision_saved, false);
    assert.equal(disabled.body.proposal_apply_performed, false);
    assert.equal(disabled.body.confirmation_token_created, false);
    assert.equal(disabled.body.audit_apply_event_created, false);
    assert.equal(disabled.body.app_db_write_performed, false);

    process.env.HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED = "true";

    const invalidJson = await callPost("{");
    assert.equal(invalidJson.status, 400);
    assert.equal(invalidJson.body.error, "invalid_json");

    const forbiddenBodyKey = ["proposal", "Body"].join("");
    const forbiddenPromptKey = ["system", "Prompt"].join("");

    const forbiddenBody = await callPost({
      proposalId: DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID,
      decisionType: "request_revision",
      [forbiddenBodyKey]: { title: "not allowed" }
    });
    assert.equal(forbiddenBody.status, 400);
    assert.equal(
      forbiddenBody.body.error,
      `forbidden_request_body_field:${forbiddenBodyKey}`
    );

    const forbiddenPrompt = await callPost({
      proposalId: DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID,
      decisionType: "request_revision",
      [forbiddenPromptKey]: "not allowed"
    });
    assert.equal(forbiddenPrompt.status, 400);
    assert.equal(
      forbiddenPrompt.body.error,
      `forbidden_request_body_field:${forbiddenPromptKey}`
    );

    const unknownField = await callPost({
      proposalId: DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID,
      decisionType: "request_revision",
      arbitrary: true
    });
    assert.equal(unknownField.status, 400);
    assert.equal(unknownField.body.error, "unknown_request_body_field:arbitrary");

    const invalidDecisionType = await callPost({
      proposalId: DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID,
      decisionType: "apply_now"
    });
    assert.equal(invalidDecisionType.status, 400);
    assert.equal(invalidDecisionType.body.error, "invalid_decision_type");

    const enabled = await callPost({
      proposalId: DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID,
      decisionType: "request_revision",
      decisionNote: "Day83 API boundary test. Review decision only; no apply.",
      decidedBy: "day83_api_boundary_human",
      decidedByRole: "admin_review_boundary"
    });

    assert.equal(enabled.status, 200);
    assert.equal(enabled.body.result, "ok");
    assert.equal(enabled.body.review_decision_recorded, true);
    assert.equal(enabled.body.review_decision_saved, true);
    assert.equal(enabled.body.proposal_inbox_updated, false);
    assert.equal(enabled.body.ai_proposal_status_updated, false);
    assert.equal(enabled.body.proposal_draft_apply_ready, false);
    assert.equal(enabled.body.proposal_apply_ready, false);
    assert.equal(enabled.body.proposal_apply_performed, false);
    assert.equal(enabled.body.confirmation_token_created, false);
    assert.equal(enabled.body.audit_apply_event_created, false);
    assert.equal(enabled.body.app_db_write_performed, false);
    assert.equal(enabled.body.app_schema_write_performed, false);
    assert.equal(enabled.body.api_route_added, true);
    assert.equal(enabled.body.ui_connected, false);
    assert.equal(enabled.body.server_action_used, false);
    assert.equal(enabled.body.form_action_used, false);

    console.log(JSON.stringify({
      result: "ok",
      checked: "hermes_proposal_draft_review_decision_api_boundary",
      disabled_boundary: "ok",
      invalid_json: "ok",
      forbidden_request_body_fields: "ok",
      unknown_request_body_field: "ok",
      invalid_decision_type: "ok",
      enabled_review_decision_smoke: "ok",
      review_decision_recorded: enabled.body.review_decision_recorded,
      review_decision_saved: enabled.body.review_decision_saved,
      proposal_inbox_updated: enabled.body.proposal_inbox_updated,
      ai_proposal_status_updated: enabled.body.ai_proposal_status_updated,
      proposal_draft_apply_ready: enabled.body.proposal_draft_apply_ready,
      proposal_apply_ready: enabled.body.proposal_apply_ready,
      proposal_apply_performed: enabled.body.proposal_apply_performed,
      confirmation_token_created: enabled.body.confirmation_token_created,
      audit_apply_event_created: enabled.body.audit_apply_event_created,
      app_db_write_performed: enabled.body.app_db_write_performed,
      app_schema_write_performed: enabled.body.app_schema_write_performed,
      api_route_added: enabled.body.api_route_added,
      ui_connected: enabled.body.ui_connected
    }, null, 2));
  } finally {
    if (previousEnabled === undefined) {
      delete process.env.HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED;
    } else {
      process.env.HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED = previousEnabled;
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
