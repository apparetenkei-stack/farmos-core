import type { Day86AuditResult } from "./hermes_apply_audit_restore_verification_boundary";

export const DAY87_PILOT_READINESS_BOUNDARY =
  "day87_pilot_readiness_operator_runbook_boundary";

export const DAY87_REQUIRED_BASE_COMMIT = "c2ced70";

export const DAY87_REQUIRED_SERVICES = [
  "postgres",
  "redis",
  "minio",
  "qdrant"
] as const;

export type Day87RequiredService =
  (typeof DAY87_REQUIRED_SERVICES)[number];

export type Day87ServiceState = {
  service: string;
  running: boolean;
};

export type Day87ReadinessInput = {
  head: string;
  day86_commit_present: boolean;
  git_clean: boolean;
  services: Day87ServiceState[];
  local_audit: Day86AuditResult;
  restore_audit: Day86AuditResult;
  restore_consistency_valid: boolean;
};

export type Day87ReadinessResult = {
  result: "ready" | "blocked";
  checked: "hermes_pilot_readiness_operator_runbook_boundary";
  boundary: typeof DAY87_PILOT_READINESS_BOUNDARY;
  pilot_mode: "limited_read_only_operator_pilot";
  head_valid: boolean;
  git_clean: boolean;
  required_services_running: boolean;
  missing_services: string[];
  local_audit_valid: boolean;
  restore_audit_valid: boolean;
  restore_consistency_valid: boolean;
  transaction_read_only_valid: boolean;
  day85_chain_valid: boolean;
  no_op_apply_valid: boolean;
  app_schema_write_detected: boolean;
  protected_records_valid: boolean;
  business_data_invariant_valid: boolean;
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  app_crop_cycles_count: number;
  pilot_readiness_valid: boolean;
  blockers: string[];
  operator_actions_allowed: string[];
  operator_actions_prohibited: string[];
  stop_conditions: string[];
};

function requiredServiceStatus(
  services: Day87ServiceState[]
): {
  required_services_running: boolean;
  missing_services: string[];
} {
  const runningServices = new Set(
    services
      .filter((service) => service.running)
      .map((service) => service.service)
  );

  const missingServices = DAY87_REQUIRED_SERVICES.filter(
    (service) => !runningServices.has(service)
  );

  return {
    required_services_running: missingServices.length === 0,
    missing_services: [...missingServices]
  };
}

export function evaluateDay87PilotReadiness(
  input: Day87ReadinessInput
): Day87ReadinessResult {
  const serviceStatus = requiredServiceStatus(input.services);

  const headValid =
    input.head.trim().length > 0 &&
    input.day86_commit_present === true;

  const localAuditValid =
    input.local_audit.result === "ok" &&
    input.local_audit.audit_chain_valid === true;

  const restoreAuditValid =
    input.restore_audit.result === "ok" &&
    input.restore_audit.audit_chain_valid === true;

  const transactionReadOnlyValid =
    input.local_audit.transaction_read_only === true &&
    input.restore_audit.transaction_read_only === true;

  const day85ChainValid =
    input.local_audit.proposal_found === true &&
    input.local_audit.decision_found === true &&
    input.local_audit.apply_event_found === true &&
    input.local_audit.proposal_decision_link_valid === true &&
    input.local_audit.proposal_apply_link_valid === true &&
    input.local_audit.single_apply_event_valid === true &&
    input.restore_audit.proposal_found === true &&
    input.restore_audit.decision_found === true &&
    input.restore_audit.apply_event_found === true &&
    input.restore_audit.proposal_decision_link_valid === true &&
    input.restore_audit.proposal_apply_link_valid === true &&
    input.restore_audit.single_apply_event_valid === true;

  const noOpApplyValid =
    input.local_audit.committed_apply_valid === true &&
    input.local_audit.no_op_apply_valid === true &&
    input.restore_audit.committed_apply_valid === true &&
    input.restore_audit.no_op_apply_valid === true;

  const appSchemaWriteDetected =
    input.local_audit.app_schema_write_detected === true ||
    input.restore_audit.app_schema_write_detected === true ||
    input.local_audit.app_projection_apply_performed === true ||
    input.restore_audit.app_projection_apply_performed === true;

  const protectedRecordsValid =
    input.local_audit.protected_records_invariant_valid === true &&
    input.restore_audit.protected_records_invariant_valid === true &&
    input.local_audit.day81_proposal_changed === false &&
    input.restore_audit.day81_proposal_changed === false &&
    input.local_audit.protected_proposal_changed === false &&
    input.restore_audit.protected_proposal_changed === false;

  const businessDataInvariantValid =
    input.local_audit.business_data_invariant_valid === true &&
    input.restore_audit.business_data_invariant_valid === true &&
    input.local_audit.app_crop_cycles_count === 8 &&
    input.restore_audit.app_crop_cycles_count === 8;

  const blockers: string[] = [];

  if (!headValid) blockers.push("unexpected_head");
  if (!input.git_clean) blockers.push("git_working_tree_not_clean");

  for (const service of serviceStatus.missing_services) {
    blockers.push(`required_service_not_running:${service}`);
  }

  if (!localAuditValid) blockers.push("local_audit_invalid");
  if (!restoreAuditValid) blockers.push("restore_audit_invalid");

  if (!input.restore_consistency_valid) {
    blockers.push("restore_consistency_invalid");
  }

  if (!transactionReadOnlyValid) {
    blockers.push("read_only_transaction_not_confirmed");
  }

  if (!day85ChainValid) blockers.push("day85_audit_chain_invalid");
  if (!noOpApplyValid) blockers.push("day85_no_op_apply_invalid");

  if (appSchemaWriteDetected) {
    blockers.push("unexpected_app_schema_write_detected");
  }

  if (!protectedRecordsValid) {
    blockers.push("protected_records_changed");
  }

  if (!businessDataInvariantValid) {
    blockers.push("business_data_invariant_invalid");
  }

  const pilotReadinessValid = blockers.length === 0;

  return {
    result: pilotReadinessValid ? "ready" : "blocked",
    checked: "hermes_pilot_readiness_operator_runbook_boundary",
    boundary: DAY87_PILOT_READINESS_BOUNDARY,
    pilot_mode: "limited_read_only_operator_pilot",
    head_valid: headValid,
    git_clean: input.git_clean,
    required_services_running:
      serviceStatus.required_services_running,
    missing_services: serviceStatus.missing_services,
    local_audit_valid: localAuditValid,
    restore_audit_valid: restoreAuditValid,
    restore_consistency_valid: input.restore_consistency_valid,
    transaction_read_only_valid: transactionReadOnlyValid,
    day85_chain_valid: day85ChainValid,
    no_op_apply_valid: noOpApplyValid,
    app_schema_write_detected: appSchemaWriteDetected,
    protected_records_valid: protectedRecordsValid,
    business_data_invariant_valid: businessDataInvariantValid,
    proposal_count: input.local_audit.proposal_count,
    decision_history_count:
      input.local_audit.decision_history_count,
    apply_history_count: input.local_audit.apply_history_count,
    app_crop_cycles_count:
      input.local_audit.app_crop_cycles_count,
    pilot_readiness_valid: pilotReadinessValid,
    blockers,
    operator_actions_allowed: [
      "run_read_only_audit",
      "inspect_proposal",
      "inspect_decision_history",
      "inspect_apply_history",
      "inspect_crop_cycle_count",
      "compare_local_and_restore",
      "stop_pilot"
    ],
    operator_actions_prohibited: [
      "create_proposal",
      "create_review_decision",
      "execute_apply",
      "update_proposal_marker",
      "write_app_schema",
      "run_migration",
      "expose_service_externally",
      "git_push"
    ],
    stop_conditions: [
      "audit_chain_invalid",
      "local_restore_mismatch",
      "unexpected_database_count_change",
      "protected_record_changed",
      "app_schema_write_detected",
      "required_service_stopped",
      "working_tree_not_clean",
      "operator_identity_uncertain"
    ]
  };
}
