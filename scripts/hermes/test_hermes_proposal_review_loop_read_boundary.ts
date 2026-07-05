import assert from "node:assert/strict";
import { readHermesProposalReviewLoop } from "./api_boundary/hermes_proposal_review_loop_read_boundary";

async function main() {
  const result = await readHermesProposalReviewLoop({ limit: 20 });

  assert.equal(result.result, "ok");
  assert.equal(result.loop.scope, "hermes_proposal_review_loop_minimum");
  assert.equal(result.loop.source_context.memory_context_scope, "hermes_memory_context_minimum");

  assert.ok(Array.isArray(result.loop.review_queue));
  assert.ok(result.loop.review_queue.length >= 1, "review_queue must contain at least one Hermes note");

  const first = result.loop.review_queue[0];
  assert.equal(first.proposal_type, "hermes_apply_blocker_explanation");
  assert.ok(first.proposal_id);
  assert.ok(first.status);
  assert.ok(first.allowed_human_actions.includes("keep_pending"));
  assert.ok(first.allowed_human_actions.includes("request_more_context"));
  assert.ok(first.allowed_human_actions.includes("mark_reviewed"));
  assert.ok(first.allowed_human_actions.includes("dismiss_without_apply"));
  assert.ok(first.disallowed_actions.includes("auto_apply"));
  assert.ok(first.disallowed_actions.includes("write_app_schema"));
  assert.equal(first.restricted_domain_data_exposed, false);

  assert.equal(result.boundary.transaction_read_only, true);
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.commands_executed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);

  assert.equal(result.loop.restricted_domain_data_exposed, false);
  assert.equal(result.loop.redaction_policy.restricted_domain_data_exposed, false);
  assert.equal(result.loop.safety_snapshot.unchanged, true);

  assert.equal(
    result.loop.safety_snapshot.before.proposal_count,
    result.loop.safety_snapshot.after.proposal_count,
  );
  assert.equal(
    result.loop.safety_snapshot.before.hermes_note_count,
    result.loop.safety_snapshot.after.hermes_note_count,
  );
  assert.equal(
    result.loop.safety_snapshot.before.pending_hermes_note_count,
    result.loop.safety_snapshot.after.pending_hermes_note_count,
  );
  assert.equal(
    result.loop.safety_snapshot.before.apply_history_count,
    result.loop.safety_snapshot.after.apply_history_count,
  );
  assert.equal(result.loop.safety_snapshot.after.protected_proposal?.status, "pending");
  assert.equal(result.loop.safety_snapshot.after.crop_cycle_2_exists, true);

  console.log("Hermes proposal review loop read boundary test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
