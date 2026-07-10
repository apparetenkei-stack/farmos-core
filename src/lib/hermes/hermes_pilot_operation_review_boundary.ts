export const HERMES_PILOT_OPERATION_REVIEW_BOUNDARY =
  "day90_hermes_pilot_operation_review_boundary";

export type HermesPilotDecision =
  | "go"
  | "conditional_go"
  | "no_go";

export type HermesPilotOperationReviewInput = {
  daily_farm_brief_valid: boolean;
  field_crop_cycle_note_valid: boolean;
  inventory_work_log_boundary_valid: boolean;
  actual_inventory_source_connected: boolean;
  actual_work_log_source_connected: boolean;
  day86_audit_restore_valid: boolean;
  day87_readiness_valid: boolean;
  day88_readonly_session_valid: boolean;
  day89_stop_recovery_valid: boolean;
  protected_counts_unchanged: boolean;
  protected_records_unchanged: boolean;
  app_schema_write_detected: boolean;
  database_write_detected: boolean;
  build_valid: boolean;
};

export type HermesPilotOperationReviewResult = {
  result: HermesPilotDecision;
  checked:
    "hermes_pilot_operation_review_boundary";
  boundary:
    typeof HERMES_PILOT_OPERATION_REVIEW_BOUNDARY;
  core_safety_valid: boolean;
  operational_feature_boundary_valid: boolean;
  operational_data_sources_complete: boolean;
  daily_farm_brief_valid: boolean;
  field_crop_cycle_note_valid: boolean;
  inventory_work_log_boundary_valid: boolean;
  actual_inventory_source_connected: boolean;
  actual_work_log_source_connected: boolean;
  day86_audit_restore_valid: boolean;
  day87_readiness_valid: boolean;
  day88_readonly_session_valid: boolean;
  day89_stop_recovery_valid: boolean;
  protected_counts_unchanged: boolean;
  protected_records_unchanged: boolean;
  app_schema_write_detected: boolean;
  database_write_detected: boolean;
  build_valid: boolean;
  pilot_scope: string[];
  conditions: string[];
  blockers: string[];
};

export function evaluateHermesPilotOperationReview(
  input: HermesPilotOperationReviewInput
): HermesPilotOperationReviewResult {
  const blockers: string[] = [];
  const conditions: string[] = [];

  const coreSafetyValid =
    input.day86_audit_restore_valid &&
    input.day87_readiness_valid &&
    input.day88_readonly_session_valid &&
    input.day89_stop_recovery_valid &&
    input.protected_counts_unchanged &&
    input.protected_records_unchanged &&
    !input.app_schema_write_detected &&
    !input.database_write_detected &&
    input.build_valid;

  const operationalFeatureBoundaryValid =
    input.daily_farm_brief_valid &&
    input.field_crop_cycle_note_valid &&
    input.inventory_work_log_boundary_valid;

  const operationalDataSourcesComplete =
    input.actual_inventory_source_connected &&
    input.actual_work_log_source_connected;

  if (!input.daily_farm_brief_valid) {
    blockers.push("daily_farm_brief_invalid");
  }

  if (!input.field_crop_cycle_note_valid) {
    blockers.push("field_crop_cycle_note_invalid");
  }

  if (!input.inventory_work_log_boundary_valid) {
    blockers.push(
      "inventory_work_log_suggestion_boundary_invalid"
    );
  }

  if (!input.day86_audit_restore_valid) {
    blockers.push("day86_audit_restore_invalid");
  }

  if (!input.day87_readiness_valid) {
    blockers.push("day87_readiness_invalid");
  }

  if (!input.day88_readonly_session_valid) {
    blockers.push("day88_readonly_session_invalid");
  }

  if (!input.day89_stop_recovery_valid) {
    blockers.push("day89_stop_recovery_invalid");
  }

  if (!input.protected_counts_unchanged) {
    blockers.push("protected_counts_changed");
  }

  if (!input.protected_records_unchanged) {
    blockers.push("protected_records_changed");
  }

  if (input.app_schema_write_detected) {
    blockers.push("app_schema_write_detected");
  }

  if (input.database_write_detected) {
    blockers.push("database_write_detected");
  }

  if (!input.build_valid) {
    blockers.push("build_invalid");
  }

  if (!input.actual_inventory_source_connected) {
    conditions.push(
      "connect_inventory_readonly_source"
    );
  }

  if (!input.actual_work_log_source_connected) {
    conditions.push(
      "connect_work_log_readonly_source"
    );
  }

  const result: HermesPilotDecision =
    blockers.length > 0
      ? "no_go"
      : operationalDataSourcesComplete
        ? "go"
        : "conditional_go";

  return {
    result,
    checked:
      "hermes_pilot_operation_review_boundary",
    boundary:
      HERMES_PILOT_OPERATION_REVIEW_BOUNDARY,
    core_safety_valid: coreSafetyValid,
    operational_feature_boundary_valid:
      operationalFeatureBoundaryValid,
    operational_data_sources_complete:
      operationalDataSourcesComplete,
    daily_farm_brief_valid:
      input.daily_farm_brief_valid,
    field_crop_cycle_note_valid:
      input.field_crop_cycle_note_valid,
    inventory_work_log_boundary_valid:
      input.inventory_work_log_boundary_valid,
    actual_inventory_source_connected:
      input.actual_inventory_source_connected,
    actual_work_log_source_connected:
      input.actual_work_log_source_connected,
    day86_audit_restore_valid:
      input.day86_audit_restore_valid,
    day87_readiness_valid:
      input.day87_readiness_valid,
    day88_readonly_session_valid:
      input.day88_readonly_session_valid,
    day89_stop_recovery_valid:
      input.day89_stop_recovery_valid,
    protected_counts_unchanged:
      input.protected_counts_unchanged,
    protected_records_unchanged:
      input.protected_records_unchanged,
    app_schema_write_detected:
      input.app_schema_write_detected,
    database_write_detected:
      input.database_write_detected,
    build_valid:
      input.build_valid,
    pilot_scope:
      result === "no_go"
        ? []
        : [
            "daily_farm_brief_preview",
            "field_crop_cycle_note_preview",
            "inventory_work_log_data_gap_preview",
            "read_only_operator_pilot",
            "incident_stop_and_recovery"
          ],
    conditions,
    blockers
  };
}
