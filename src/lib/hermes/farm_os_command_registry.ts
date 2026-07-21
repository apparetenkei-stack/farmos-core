import {
  FARM_OS_RISK_POLICIES,
  type FarmOsRiskLevel,
  type FarmOsRollbackClass,
} from "./farm_os_risk_taxonomy";

export const FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION = "farmos.command.registry.v1" as const;
export const FARM_OS_COMMAND_REGISTRY_STATIC_VERSION = "1" as const;
export const FARM_OS_COMMAND_CLASSES = ["approved_internal_command", "approved_external_command"] as const;
export type FarmOsCommandClass = (typeof FARM_OS_COMMAND_CLASSES)[number];
export const FARM_OS_APPROVED_OUTPUT_CLASSES = ["approved_internal_command_candidate", "approved_external_command_candidate"] as const;
export type FarmOsApprovedOutputClass = (typeof FARM_OS_APPROVED_OUTPUT_CLASSES)[number];
export const FARM_OS_COMMAND_TARGETS = ["farmos_internal_contract", "approved_external_contract"] as const;
export type FarmOsCommandTarget = (typeof FARM_OS_COMMAND_TARGETS)[number];

export type FarmOsInternalCommandPayload = {
  schema_version: "farmos.command.payload.work_log_follow_up.v1";
  operation: "prepare_work_log_follow_up";
  proposal_id: string;
};
export type FarmOsExternalCommandPayload = {
  schema_version: "farmos.command.payload.external_reservation.v1";
  operation: "reserve_external_execution_contract";
  proposal_id: string;
};
export type FarmOsCommandPayload = FarmOsInternalCommandPayload | FarmOsExternalCommandPayload;

export type FarmOsCommandRegistryEntry = {
  schema_version: typeof FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION;
  command_class: FarmOsCommandClass;
  command_version: 1;
  allowed_proposal_types: readonly ["work_log_follow_up"];
  required_risk_level: Extract<FarmOsRiskLevel, "l2_internal_apply" | "l3_external_execution">;
  required_capabilities: readonly string[];
  allowed_output_classes: readonly [FarmOsApprovedOutputClass];
  allowed_target_systems: readonly [FarmOsCommandTarget];
  rollback_class: FarmOsRollbackClass;
  reauthorization_required: true;
  external_execution: boolean;
  payload_schema: FarmOsCommandPayload["schema_version"];
  executable_in_day132: false;
  static_version: typeof FARM_OS_COMMAND_REGISTRY_STATIC_VERSION;
};

export const FARM_OS_COMMAND_REGISTRY: Readonly<Record<FarmOsCommandClass, FarmOsCommandRegistryEntry>> = {
  approved_internal_command: {
    schema_version: FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION,
    command_class: "approved_internal_command", command_version: 1,
    allowed_proposal_types: ["work_log_follow_up"], required_risk_level: "l2_internal_apply",
    required_capabilities: FARM_OS_RISK_POLICIES.l2_internal_apply.required_capabilities,
    allowed_output_classes: ["approved_internal_command_candidate"],
    allowed_target_systems: ["farmos_internal_contract"], rollback_class: "reversible_internal",
    reauthorization_required: true, external_execution: false,
    payload_schema: "farmos.command.payload.work_log_follow_up.v1",
    executable_in_day132: false, static_version: FARM_OS_COMMAND_REGISTRY_STATIC_VERSION,
  },
  approved_external_command: {
    schema_version: FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION,
    command_class: "approved_external_command", command_version: 1,
    allowed_proposal_types: ["work_log_follow_up"], required_risk_level: "l3_external_execution",
    required_capabilities: FARM_OS_RISK_POLICIES.l3_external_execution.required_capabilities,
    allowed_output_classes: ["approved_external_command_candidate"],
    allowed_target_systems: ["approved_external_contract"], rollback_class: "cancellation_or_correction",
    reauthorization_required: true, external_execution: true,
    payload_schema: "farmos.command.payload.external_reservation.v1",
    executable_in_day132: false, static_version: FARM_OS_COMMAND_REGISTRY_STATIC_VERSION,
  },
};

export const parseFarmOsCommandClass = (value: unknown): FarmOsCommandClass | null =>
  typeof value === "string" && FARM_OS_COMMAND_CLASSES.includes(value as FarmOsCommandClass) ? value as FarmOsCommandClass : null;
export const resolveFarmOsCommandClass = (value: unknown): FarmOsCommandRegistryEntry | null => {
  const commandClass = parseFarmOsCommandClass(value);
  return commandClass ? FARM_OS_COMMAND_REGISTRY[commandClass] : null;
};
