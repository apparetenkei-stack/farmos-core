import assert from "node:assert/strict";
import { readHermesProposalReviewLoop } from "./api_boundary/hermes_proposal_review_loop_read_boundary";
import { reviewHermesProposalLoopCommand } from "./api_boundary/hermes_proposal_review_loop_command_boundary";

async function main() {
  const loop = await readHermesProposalReviewLoop({ limit: 20 });

  assert.equal(loop.result, "ok");
  assert.ok(loop.loop.review_queue.length >= 1, "review_queue must contain at least one Hermes note");

  const target = loop.loop.review_queue.find(
    (item) =>
      item.proposal_type === "hermes_apply_blocker_explanation" &&
      item.proposal_id !== "24fc24ee-8efa-436b-8424-9703edeeb297",
  );

  assert.ok(target, "non-protected Hermes note is required for Day42 dry-run command test");

  const result = await reviewHermesProposalLoopCommand({
    proposal_id: target.proposal_id,
    action: "keep_pending",
    reviewed_by: "hayate",
    reason: "Day42 dry-run review loop boundary test",
    dry_run: true,
  });

  assert.equal(result.result, "ok");
  assert.equal(result.command.mode, "hermes_proposal_review_loop_command_boundary");
  assert.equal(result.command.dry_run, true);
  assert.equal(result.command.requested_action, "keep_pending");
  assert.equal(result.command.target_proposal_id, target.proposal_id);
  assert.equal(result.command.target_proposal_type, "hermes_apply_blocker_explanation");
  assert.equal(result.command.persistent_write_performed, false);
  assert.equal(result.command.proposed_effect.proposal_apply, false);
  assert.equal(result.command.proposed_effect.app_schema_change, false);
  assert.equal(result.command.proposed_effect.audit_apply_event_append, false);
  assert.equal(result.command.restricted_domain_data_exposed, false);

  assert.equal(result.boundary.commands_executed, true);
  assert.equal(result.boundary.dry_run, true);
  assert.equal(result.boundary.transaction_read_only, true);
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);

  assert.equal(result.safety_snapshot.unchanged, true);
  assert.equal(
    result.safety_snapshot.before.proposal_count,
    result.safety_snapshot.after.proposal_count,
  );
  assert.equal(
    result.safety_snapshot.before.hermes_note_count,
    result.safety_snapshot.after.hermes_note_count,
  );
  assert.equal(
    result.safety_snapshot.before.pending_hermes_note_count,
    result.safety_snapshot.after.pending_hermes_note_count,
  );
  assert.equal(
    result.safety_snapshot.before.apply_history_count,
    result.safety_snapshot.after.apply_history_count,
  );
  assert.equal(result.safety_snapshot.after.protected_proposal?.status, "pending");
  assert.equal(result.safety_snapshot.after.crop_cycle_2_exists, true);

  const blocked = await reviewHermesProposalLoopCommand({
    proposal_id: target.proposal_id,
    action: "apply",
    reviewed_by: "hayate",
    reason: "blocked action check",
    dry_run: true,
  });

  assert.equal(blocked.result, "blocked");
  assert.equal(blocked.boundary.writes_performed, false);
  assert.equal(blocked.boundary.proposal_apply_allowed, false);

  console.log("Hermes proposal review loop command boundary test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
