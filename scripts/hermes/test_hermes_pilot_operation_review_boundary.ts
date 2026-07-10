import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  evaluateHermesPilotOperationReview
} from "../../src/lib/hermes/hermes_pilot_operation_review_boundary";

type JsonRecord = Record<string, any>;

function runPackageScript(
  scriptName: string
): JsonRecord {
  const output = execFileSync(
    "pnpm",
    ["run", "--silent", scriptName],
    {
      encoding: "utf8",
      env: process.env
    }
  );

  const jsonStart = output.indexOf("{");

  if (jsonStart < 0) {
    throw new Error(
      `json_output_not_found:${scriptName}`
    );
  }

  return JSON.parse(
    output.slice(jsonStart)
  ) as JsonRecord;
}

function main(): void {
  const dailyBrief = runPackageScript(
    "test-hermes-daily-farm-brief-boundary"
  );

  const fieldNote = runPackageScript(
    "test-hermes-field-crop-cycle-note-boundary"
  );

  const inventoryWorkLog = runPackageScript(
    "test-hermes-inventory-work-log-suggestion-boundary"
  );

  const day86 = runPackageScript(
    "test-hermes-apply-audit-restore-verification-boundary"
  );

  const day87 = runPackageScript(
    "test-hermes-pilot-readiness-operator-runbook-boundary"
  );

  const day88 = runPackageScript(
    "test-hermes-limited-readonly-pilot-session-boundary"
  );

  const day89 = runPackageScript(
    "test-hermes-pilot-incident-stop-recovery-drill-boundary"
  );

  const review =
    evaluateHermesPilotOperationReview({
      daily_farm_brief_valid:
        dailyBrief.result === "ok" &&
        dailyBrief.brief?.result === "preview" &&
        dailyBrief.brief?.database_write_performed === false &&
        dailyBrief.protected_state?.unchanged === true,

      field_crop_cycle_note_valid:
        fieldNote.result === "ok" &&
        fieldNote.crop_cycle_note?.result === "preview" &&
        fieldNote.field_note?.result === "preview" &&
        fieldNote.protected_state?.unchanged === true,

      inventory_work_log_boundary_valid:
        inventoryWorkLog.result === "ok" &&
        inventoryWorkLog.unavailable_sources?.result === "preview" &&
        inventoryWorkLog.unavailable_sources
          ?.database_write_performed === false &&
        inventoryWorkLog.protected_state?.unchanged === true,

      actual_inventory_source_connected:
        inventoryWorkLog.unavailable_sources
          ?.inventory_source_available === true,

      actual_work_log_source_connected:
        inventoryWorkLog.unavailable_sources
          ?.work_log_source_available === true,

      day86_audit_restore_valid:
        day86.result === "ok" &&
        day86.local_audit_valid === true &&
        day86.restore_audit_valid === true &&
        day86.restore_consistency_valid === true,

      day87_readiness_valid:
        day87.result === "ok" &&
        day87.ready?.pilot_readiness_valid === true &&
        day87.ready?.blockers?.length === 0,

      day88_readonly_session_valid:
        day88.result === "ok" &&
        day88.session?.session_invariant_valid === true &&
        day88.session?.database_write_detected === false,

      day89_stop_recovery_valid:
        day89.result === "ok" &&
        day89.recovery?.result === "recovered" &&
        day89.recovery?.recovery_invariant_valid === true &&
        day89.recovery?.database_write_detected === false,

      protected_counts_unchanged:
        dailyBrief.protected_state?.unchanged === true &&
        fieldNote.protected_state?.unchanged === true &&
        inventoryWorkLog.protected_state?.unchanged === true,

      protected_records_unchanged:
        day86.local?.protected_records_invariant_valid === true &&
        day86.restore?.protected_records_invariant_valid === true,

      app_schema_write_detected:
        day86.local?.app_schema_write_detected === true ||
        day86.restore?.app_schema_write_detected === true,

      database_write_detected:
        dailyBrief.brief?.database_write_performed === true ||
        fieldNote.crop_cycle_note
          ?.database_write_performed === true ||
        inventoryWorkLog.unavailable_sources
          ?.database_write_performed === true ||
        day88.session?.database_write_detected === true ||
        day89.recovery?.database_write_detected === true,

      build_valid: true
    });

  assert.equal(
    review.result,
    "conditional_go"
  );
  assert.equal(
    review.core_safety_valid,
    true
  );
  assert.equal(
    review.operational_feature_boundary_valid,
    true
  );
  assert.equal(
    review.operational_data_sources_complete,
    false
  );
  assert.equal(
    review.conditions.includes(
      "connect_inventory_readonly_source"
    ),
    true
  );
  assert.equal(
    review.conditions.includes(
      "connect_work_log_readonly_source"
    ),
    true
  );
  assert.deepEqual(review.blockers, []);

  const noGo =
    evaluateHermesPilotOperationReview({
      daily_farm_brief_valid: true,
      field_crop_cycle_note_valid: true,
      inventory_work_log_boundary_valid: true,
      actual_inventory_source_connected: false,
      actual_work_log_source_connected: false,
      day86_audit_restore_valid: true,
      day87_readiness_valid: true,
      day88_readonly_session_valid: true,
      day89_stop_recovery_valid: true,
      protected_counts_unchanged: false,
      protected_records_unchanged: true,
      app_schema_write_detected: false,
      database_write_detected: false,
      build_valid: true
    });

  assert.equal(noGo.result, "no_go");
  assert.equal(
    noGo.blockers.includes(
      "protected_counts_changed"
    ),
    true
  );

  console.log(JSON.stringify({
    result: "ok",
    checked:
      "hermes_pilot_operation_review_boundary",
    review,
    no_go_scenario: {
      result: noGo.result,
      blockers: noGo.blockers
    },
    evidence: {
      daily_farm_brief:
        dailyBrief.brief?.result,
      field_crop_cycle_note:
        fieldNote.crop_cycle_note?.result,
      inventory_work_log:
        inventoryWorkLog.unavailable_sources?.result,
      day86_restore_consistency:
        day86.restore_consistency_valid,
      day87_readiness:
        day87.ready?.pilot_readiness_valid,
      day88_session:
        day88.session?.session_invariant_valid,
      day89_recovery:
        day89.recovery?.recovery_invariant_valid
    }
  }, null, 2));
}

main();
