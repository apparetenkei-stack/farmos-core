import assert from "node:assert/strict";
import { POST } from "../../src/app/api/hermes/proposal-apply-dry-run/route";
import { DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID } from "../../src/lib/hermes/hermes_proposal_apply_dry_run_boundary";

async function callPost(body: unknown): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await POST(new Request("http://localhost/api/hermes/proposal-apply-dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  }));
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function main(): Promise<void> {
  const previous = process.env.HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED;
  try {
    process.env.HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED = "false";
    const disabled = await callPost({ proposalId: DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID });
    assert.equal(disabled.status, 403);
    assert.equal(disabled.body.result, "blocked");
    assert.equal(disabled.body.dry_run_event_persisted, false);

    process.env.HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED = "true";
    const invalidJson = await callPost("{");
    assert.equal(invalidJson.status, 400);
    assert.equal(invalidJson.body.error, "invalid_json");

    const forbiddenKey = ["proposal", "Body"].join("");
    const forbidden = await callPost({ proposalId: DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID, [forbiddenKey]: {} });
    assert.equal(forbidden.status, 400);
    assert.equal(forbidden.body.error, `forbidden_request_body_field:${forbiddenKey}`);

    const unknown = await callPost({ proposalId: DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID, decisionType: "request_revision" });
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.error, "unknown_request_body_field:decisionType");

    const enabled = await callPost({ proposalId: DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID });
    assert.equal(enabled.status, 200);
    assert.equal(enabled.body.result, "ok");
    assert.equal(enabled.body.dry_run_evaluated, true);
    assert.equal(enabled.body.dry_run_event_persisted, false);
    assert.equal(enabled.body.proposal_inbox_updated, false);
    assert.equal(enabled.body.proposal_apply_ready, false);
    assert.equal(enabled.body.proposal_apply_performed, false);
    assert.equal(enabled.body.committed_apply_event_created, false);
    assert.equal(enabled.body.confirmation_token_created, false);
    assert.equal(enabled.body.audit_apply_event_created, false);
    assert.equal(enabled.body.app_db_write_performed, false);
    assert.equal(enabled.body.app_schema_write_performed, false);
    assert.equal(enabled.body.api_route_added, true);
    assert.equal(enabled.body.ui_connected, false);

    console.log(JSON.stringify({
      result: "ok",
      checked: "hermes_proposal_apply_dry_run_api_boundary",
      disabled_boundary: "ok",
      invalid_json: "ok",
      forbidden_request_body_fields: "ok",
      unknown_request_body_field: "ok",
      enabled_apply_dry_run_smoke: "ok",
      dry_run_evaluated: enabled.body.dry_run_evaluated,
      dry_run_event_persisted: enabled.body.dry_run_event_persisted,
      proposal_inbox_updated: enabled.body.proposal_inbox_updated,
      proposal_apply_ready: enabled.body.proposal_apply_ready,
      proposal_apply_performed: enabled.body.proposal_apply_performed,
      committed_apply_event_created: enabled.body.committed_apply_event_created,
      confirmation_token_created: enabled.body.confirmation_token_created,
      audit_apply_event_created: enabled.body.audit_apply_event_created,
      app_db_write_performed: enabled.body.app_db_write_performed,
      app_schema_write_performed: enabled.body.app_schema_write_performed,
      api_route_added: enabled.body.api_route_added,
      ui_connected: enabled.body.ui_connected
    }, null, 2));
  } finally {
    if (previous === undefined) {
      delete process.env.HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED;
    } else {
      process.env.HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED = previous;
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
