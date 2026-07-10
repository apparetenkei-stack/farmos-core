import type {
  Day87ReadinessResult
} from "./hermes_pilot_readiness_operator_runbook_boundary";
import type {
  Day88PilotSessionResult
} from "./hermes_limited_readonly_pilot_session_boundary";

export const DAY89_INCIDENT_RECOVERY_BOUNDARY =
  "day89_hermes_pilot_incident_stop_recovery_drill_boundary";

export const DAY89_REQUIRED_BASE_COMMIT = "544089c";

export type Day89IncidentType =
  | "database_count_change"
  | "protected_proposal_change"
  | "required_service_stopped"
  | "app_schema_write_detected"
  | "operator_identity_uncertain";

export type Day89IncidentSignal = {
  type: Day89IncidentType;
  detected: boolean;
  detail: string;
};

export type Day89IncidentInput = {
  head: string;
  day88_commit_present: boolean;
  git_clean: boolean;
  active_session: Day88PilotSessionResult;
  incident_signals: Day89IncidentSignal[];
  operator_identity_confirmed: boolean;
};

export type Day89StopResult = {
  result: "stopped" | "no_incident";
  checked:
    "hermes_pilot_incident_stop_recovery_drill_boundary";
  boundary: typeof DAY89_INCIDENT_RECOVERY_BOUNDARY;
  head_valid: boolean;
  git_clean: boolean;
  session_was_valid: boolean;
  incident_detected: boolean;
  detected_incidents: Day89IncidentType[];
  operator_identity_confirmed: boolean;
  apply_blocked: boolean;
  proposal_write_blocked: boolean;
  app_schema_write_blocked: boolean;
  automatic_recovery_blocked: boolean;
  pilot_restart_allowed: boolean;
  stop_invariant_valid: boolean;
  blockers: string[];
};

export type Day89RecoveryInput = {
  stop_result: Day89StopResult;
  readiness_after_recovery: Day87ReadinessResult;
  session_after_recovery: Day88PilotSessionResult;
  local_restore_consistency_valid: boolean;
  database_counts_valid: boolean;
  protected_records_valid: boolean;
  required_services_running: boolean;
  operator_identity_confirmed: boolean;
};

export type Day89RecoveryResult = {
  result: "recovered" | "blocked";
  checked:
    "hermes_pilot_incident_stop_recovery_drill_boundary";
  boundary: typeof DAY89_INCIDENT_RECOVERY_BOUNDARY;
  stop_was_valid: boolean;
  readiness_valid: boolean;
  session_valid: boolean;
  local_restore_consistency_valid: boolean;
  database_counts_valid: boolean;
  protected_records_valid: boolean;
  required_services_running: boolean;
  operator_identity_confirmed: boolean;
  database_write_detected: boolean;
  pilot_restart_allowed: boolean;
  recovery_invariant_valid: boolean;
  blockers: string[];
};

function uniqueIncidentTypes(
  signals: Day89IncidentSignal[]
): Day89IncidentType[] {
  return [
    ...new Set(
      signals
        .filter((signal) => signal.detected)
        .map((signal) => signal.type)
    )
  ];
}

export function evaluateDay89IncidentStop(
  input: Day89IncidentInput
): Day89StopResult {
  const headValid =
    input.head.trim().length > 0 &&
    input.day88_commit_present === true;

  const sessionWasValid =
    input.active_session.result === "completed" &&
    input.active_session.session_invariant_valid === true &&
    input.active_session.database_write_detected === false &&
    input.active_session.blockers.length === 0;

  const detectedIncidents =
    uniqueIncidentTypes(input.incident_signals);

  if (!input.operator_identity_confirmed) {
    detectedIncidents.push("operator_identity_uncertain");
  }

  const normalizedIncidents =
    [...new Set(detectedIncidents)];

  const incidentDetected =
    normalizedIncidents.length > 0;

  const blockers: string[] = [];

  if (!headValid) blockers.push("unexpected_head");

  if (!input.git_clean) {
    blockers.push("git_working_tree_not_clean");
  }

  if (!sessionWasValid) {
    blockers.push("active_session_invalid");
  }

  if (!incidentDetected) {
    blockers.push("incident_not_detected");
  }

  if (!input.operator_identity_confirmed) {
    blockers.push("operator_identity_uncertain");
  }

  const stopInvariantValid =
    headValid &&
    input.git_clean &&
    sessionWasValid &&
    incidentDetected;

  return {
    result: incidentDetected ? "stopped" : "no_incident",
    checked:
      "hermes_pilot_incident_stop_recovery_drill_boundary",
    boundary: DAY89_INCIDENT_RECOVERY_BOUNDARY,
    head_valid: headValid,
    git_clean: input.git_clean,
    session_was_valid: sessionWasValid,
    incident_detected: incidentDetected,
    detected_incidents: normalizedIncidents,
    operator_identity_confirmed:
      input.operator_identity_confirmed,
    apply_blocked: incidentDetected,
    proposal_write_blocked: incidentDetected,
    app_schema_write_blocked: incidentDetected,
    automatic_recovery_blocked: incidentDetected,
    pilot_restart_allowed: false,
    stop_invariant_valid: stopInvariantValid,
    blockers
  };
}

export function evaluateDay89Recovery(
  input: Day89RecoveryInput
): Day89RecoveryResult {
  const stopWasValid =
    input.stop_result.result === "stopped" &&
    input.stop_result.incident_detected === true &&
    input.stop_result.apply_blocked === true &&
    input.stop_result.proposal_write_blocked === true &&
    input.stop_result.app_schema_write_blocked === true &&
    input.stop_result.automatic_recovery_blocked === true &&
    input.stop_result.pilot_restart_allowed === false &&
    input.stop_result.stop_invariant_valid === true;

  const readinessValid =
    input.readiness_after_recovery.result === "ready" &&
    input.readiness_after_recovery.pilot_readiness_valid === true &&
    input.readiness_after_recovery.blockers.length === 0;

  const sessionValid =
    input.session_after_recovery.result === "completed" &&
    input.session_after_recovery.session_invariant_valid === true &&
    input.session_after_recovery.database_write_detected === false &&
    input.session_after_recovery.blockers.length === 0;

  const databaseWriteDetected =
    !input.database_counts_valid ||
    !input.protected_records_valid ||
    input.session_after_recovery.database_write_detected;

  const blockers: string[] = [];

  if (!stopWasValid) blockers.push("incident_stop_invalid");
  if (!readinessValid) blockers.push("recovery_readiness_invalid");
  if (!sessionValid) blockers.push("recovery_session_invalid");

  if (!input.local_restore_consistency_valid) {
    blockers.push("local_restore_consistency_invalid");
  }

  if (!input.database_counts_valid) {
    blockers.push("database_counts_invalid");
  }

  if (!input.protected_records_valid) {
    blockers.push("protected_records_invalid");
  }

  if (!input.required_services_running) {
    blockers.push("required_service_not_running");
  }

  if (!input.operator_identity_confirmed) {
    blockers.push("operator_identity_uncertain");
  }

  if (databaseWriteDetected) {
    blockers.push("database_write_or_state_change_detected");
  }

  const recoveryInvariantValid =
    blockers.length === 0;

  return {
    result:
      recoveryInvariantValid ? "recovered" : "blocked",
    checked:
      "hermes_pilot_incident_stop_recovery_drill_boundary",
    boundary: DAY89_INCIDENT_RECOVERY_BOUNDARY,
    stop_was_valid: stopWasValid,
    readiness_valid: readinessValid,
    session_valid: sessionValid,
    local_restore_consistency_valid:
      input.local_restore_consistency_valid,
    database_counts_valid: input.database_counts_valid,
    protected_records_valid: input.protected_records_valid,
    required_services_running:
      input.required_services_running,
    operator_identity_confirmed:
      input.operator_identity_confirmed,
    database_write_detected: databaseWriteDetected,
    pilot_restart_allowed: recoveryInvariantValid,
    recovery_invariant_valid: recoveryInvariantValid,
    blockers
  };
}
