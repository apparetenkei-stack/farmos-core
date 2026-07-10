import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import {
  evaluateHermesPilotOperationReview,
} from "../../src/lib/hermes/hermes_pilot_operation_review_boundary";

type JsonRecord = Record<string, any>;

const DAY90_VALIDATED_BASELINE = Object.freeze({
  source_commit: "52696f3",
  daily_farm_brief_valid: true,
  field_crop_cycle_note_valid: true,
  inventory_work_log_boundary_valid: true,
  day86_audit_restore_valid: true,
  day87_readiness_valid: true,
  day88_readonly_session_valid: true,
  day89_stop_recovery_valid: true,
  protected_counts_unchanged: true,
  protected_records_unchanged: true,
  app_schema_write_detected: false,
  database_write_detected: false,
});

function runPackageScript(scriptName: string): JsonRecord {
  const output = execFileSync(
    "pnpm",
    ["run", "--silent", scriptName],
    {
      encoding: "utf8",
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  const jsonStart = output.indexOf("{");

  if (jsonStart < 0) {
    throw new Error(`json_output_not_found:${scriptName}`);
  }

  return JSON.parse(output.slice(jsonStart)) as JsonRecord;
}

function main(): void {
  const day93 = runPackageScript(
    "run-hermes-operational-context-integration-smoke-test",
  );

  assert.equal(day93.result, "ok");
  assert.equal(day93.readonly_context_included, true);
  assert.equal(day93.operational_context_included, true);
  assert.equal(day93.operational_external_fetch_performed, true);
  assert.equal(day93.inventory_source_connected, true);
  assert.equal(day93.work_log_source_connected, true);
  assert.equal(day93.inventory_record_count, 0);
  assert.equal(day93.inventory_connected_empty, true);
  assert.equal(day93.work_log_record_count, 100);
  assert.equal(day93.suggestion_preview_created, true);
  assert.equal(day93.operational_context_present_in_prompt, true);
  assert.equal(day93.token_present_in_prompt, false);
  assert.equal(day93.database_write_performed, false);
  assert.equal(day93.protected_state?.unchanged, true);

  const review = evaluateHermesPilotOperationReview({
    daily_farm_brief_valid:
      DAY90_VALIDATED_BASELINE.daily_farm_brief_valid,

    field_crop_cycle_note_valid:
      DAY90_VALIDATED_BASELINE.field_crop_cycle_note_valid,

    inventory_work_log_boundary_valid:
      DAY90_VALIDATED_BASELINE.inventory_work_log_boundary_valid &&
      day93.suggestion_preview_created === true,

    actual_inventory_source_connected:
      day93.inventory_source_connected === true,

    actual_work_log_source_connected:
      day93.work_log_source_connected === true,

    day86_audit_restore_valid:
      DAY90_VALIDATED_BASELINE.day86_audit_restore_valid,

    day87_readiness_valid:
      DAY90_VALIDATED_BASELINE.day87_readiness_valid,

    day88_readonly_session_valid:
      DAY90_VALIDATED_BASELINE.day88_readonly_session_valid,

    day89_stop_recovery_valid:
      DAY90_VALIDATED_BASELINE.day89_stop_recovery_valid,

    protected_counts_unchanged:
      DAY90_VALIDATED_BASELINE.protected_counts_unchanged &&
      day93.protected_state?.unchanged === true,

    protected_records_unchanged:
      DAY90_VALIDATED_BASELINE.protected_records_unchanged,

    app_schema_write_detected:
      DAY90_VALIDATED_BASELINE.app_schema_write_detected,

    database_write_detected:
      DAY90_VALIDATED_BASELINE.database_write_detected ||
      day93.database_write_performed === true,

    build_valid: true,
  });

  assert.equal(review.result, "go");
  assert.equal(review.core_safety_valid, true);
  assert.equal(review.operational_feature_boundary_valid, true);
  assert.equal(review.operational_data_sources_complete, true);
  assert.equal(review.actual_inventory_source_connected, true);
  assert.equal(review.actual_work_log_source_connected, true);
  assert.deepEqual(review.conditions, []);
  assert.deepEqual(review.blockers, []);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checked: "hermes_day93_final_go_assessment",
        formal_decision: review.result,
        descriptive_decision: "full_go",
        historical_baseline_commit:
          DAY90_VALIDATED_BASELINE.source_commit,
        historical_baseline_live_rerun: false,
        day93_live_smoke_executed: true,
        core_safety_valid: review.core_safety_valid,
        operational_feature_boundary_valid:
          review.operational_feature_boundary_valid,
        operational_data_sources_complete:
          review.operational_data_sources_complete,
        actual_inventory_source_connected:
          review.actual_inventory_source_connected,
        actual_work_log_source_connected:
          review.actual_work_log_source_connected,
        inventory_record_count: day93.inventory_record_count,
        inventory_connected_empty:
          day93.inventory_connected_empty,
        work_log_record_count: day93.work_log_record_count,
        suggestion_preview_created:
          day93.suggestion_preview_created,
        operational_context_present_in_prompt:
          day93.operational_context_present_in_prompt,
        token_present_in_prompt:
          day93.token_present_in_prompt,
        database_write_performed:
          day93.database_write_performed,
        protected_state_unchanged:
          day93.protected_state?.unchanged === true,
        conditions: review.conditions,
        blockers: review.blockers,
      },
      null,
      2,
    ),
  );
}

main();
