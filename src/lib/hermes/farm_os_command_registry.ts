import {
  FARM_OS_RISK_POLICIES,
  type FarmOsRiskLevel,
} from "./farm_os_risk_taxonomy";

export const FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION =
  "farmos.command.registry.v1" as const;
export const FARM_OS_COMMAND_REGISTRY_STATIC_VERSION = "1" as const;

export const FARM_OS_COMMAND_CLASSES = [
  "approved_internal_command",
  "approved_external_command",
] as const;
export type FarmOsCommandClass = (typeof FARM_OS_COMMAND_CLASSES)[number];

export type FarmOsCommandRegistryEntry = {
  schema_version: typeof FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION;
  command_class: FarmOsCommandClass;
  risk_level: Extract<FarmOsRiskLevel, "l2_internal_apply" | "l3_external_execution">;
  required_capabilities: readonly string[];
  reauthorization_required: true;
  external_execution: boolean;
  executable_in_day132: false;
  static_version: typeof FARM_OS_COMMAND_REGISTRY_STATIC_VERSION;
};

export const FARM_OS_COMMAND_REGISTRY: Readonly<
  Record<FarmOsCommandClass, FarmOsCommandRegistryEntry>
> = {
  approved_internal_command: {
    schema_version: FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION,
    command_class: "approved_internal_command",
    risk_level: "l2_internal_apply",
    required_capabilities:
      FARM_OS_RISK_POLICIES.l2_internal_apply.required_capabilities,
    reauthorization_required: true,
    external_execution: false,
    executable_in_day132: false,
    static_version: FARM_OS_COMMAND_REGISTRY_STATIC_VERSION,
  },
  approved_external_command: {
    schema_version: FARM_OS_COMMAND_REGISTRY_SCHEMA_VERSION,
    command_class: "approved_external_command",
    risk_level: "l3_external_execution",
    required_capabilities:
      FARM_OS_RISK_POLICIES.l3_external_execution.required_capabilities,
    reauthorization_required: true,
    external_execution: true,
    executable_in_day132: false,
    static_version: FARM_OS_COMMAND_REGISTRY_STATIC_VERSION,
  },
};

export function parseFarmOsCommandClass(value: unknown): FarmOsCommandClass | null {
  return typeof value === "string" &&
    FARM_OS_COMMAND_CLASSES.includes(value as FarmOsCommandClass)
    ? (value as FarmOsCommandClass)
    : null;
}

export function resolveFarmOsCommandClass(
  value: unknown,
): FarmOsCommandRegistryEntry | null {
  const commandClass = parseFarmOsCommandClass(value);
  return commandClass ? FARM_OS_COMMAND_REGISTRY[commandClass] : null;
}
