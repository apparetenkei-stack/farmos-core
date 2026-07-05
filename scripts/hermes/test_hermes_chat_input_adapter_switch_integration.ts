import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { runHermesChatInputDryRunBoundary } from "./api_boundary/hermes_chat_input_dry_run_boundary";

async function main() {
  const source = readFileSync(
    "scripts/hermes/api_boundary/hermes_chat_input_dry_run_boundary.ts",
    "utf8",
  );

  assert.match(source, /runHermesLlmAdapterSwitchBoundary/);
  assert.doesNotMatch(source, /runHermesLlmAdapterMockBoundary\(/);

  const result = await runHermesChatInputDryRunBoundary({
    message: "今のHermes提案レビュー状況を教えて",
    dryRun: true,
  });

  assert.equal(result.result, "ok");
  assert.equal(result.chat.scope, "hermes_chat_input_dry_run_minimum");
  assert.equal(result.chat.request.dry_run, true);

  assert.ok(result.chat.mock_response);
  assert.equal(
    result.chat.mock_response.adapter,
    "hermes_llm_adapter_mock_boundary",
  );
  assert.equal(
    result.chat.mock_response.response_kind,
    "deterministic_mock_response",
  );
  assert.ok(result.chat.mock_response.content.length > 0);
  assert.equal(result.chat.mock_response.would_call_llm, false);
  assert.equal(result.chat.mock_response.would_write_chat_history, false);
  assert.equal(result.chat.mock_response.would_create_proposal, false);
  assert.equal(result.chat.mock_response.would_apply_proposal, false);

  assert.equal(result.boundary.transaction_read_only, true);
  assert.equal(result.boundary.writes_performed, false);
  assert.equal(result.boundary.commands_executed, false);
  assert.equal(result.boundary.chat_history_write_allowed, false);
  assert.equal(result.boundary.app_schema_write_allowed, false);
  assert.equal(result.boundary.ai_proposal_write_allowed, false);
  assert.equal(result.boundary.audit_apply_event_write_allowed, false);
  assert.equal(result.boundary.proposal_apply_allowed, false);
  assert.equal(result.boundary.hermes_runtime_executed, false);
  assert.equal(result.boundary.llm_runtime_executed, false);
  assert.equal(result.boundary.external_api_called, false);
  assert.equal(result.boundary.local_model_called, false);
  assert.equal(result.boundary.embeddings_executed, false);
  assert.equal(result.boundary.vector_search_executed, false);
  assert.equal(result.boundary.restricted_domain_data_exposed, false);
  assert.equal(result.boundary.credentials_exposed, false);

  assert.ok(result.chat.safety_snapshot);
  assert.equal(result.chat.safety_snapshot.unchanged, true);
  assert.equal(
    result.chat.safety_snapshot.before.proposal_count,
    result.chat.safety_snapshot.after.proposal_count,
  );
  assert.equal(
    result.chat.safety_snapshot.before.hermes_note_count,
    result.chat.safety_snapshot.after.hermes_note_count,
  );
  assert.equal(
    result.chat.safety_snapshot.before.pending_hermes_note_count,
    result.chat.safety_snapshot.after.pending_hermes_note_count,
  );
  assert.equal(
    result.chat.safety_snapshot.before.apply_history_count,
    result.chat.safety_snapshot.after.apply_history_count,
  );
  assert.equal(
    result.chat.safety_snapshot.before.protected_proposal_status,
    "pending",
  );
  assert.equal(result.chat.safety_snapshot.before.crop_cycle_2_exists, true);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_chat_input_adapter_switch_integration",
        proposal_count: result.chat.safety_snapshot.before.proposal_count,
        hermes_note_count: result.chat.safety_snapshot.before.hermes_note_count,
        pending_hermes_note_count:
          result.chat.safety_snapshot.before.pending_hermes_note_count,
        apply_history_count:
          result.chat.safety_snapshot.before.apply_history_count,
        protected_proposal_status:
          result.chat.safety_snapshot.before.protected_proposal_status,
        crop_cycle_2_exists:
          result.chat.safety_snapshot.before.crop_cycle_2_exists,
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
