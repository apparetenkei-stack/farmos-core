import type { FarmOsApprovedCommand } from "./farm_os_approved_command_contract";

export const FARM_OS_EXECUTION_GATEWAY_REQUEST_SCHEMA_VERSION =
  "farmos.execution.gateway.request.reservation.v1" as const;
export const FARM_OS_EXECUTION_GATEWAY_RESULT_SCHEMA_VERSION =
  "farmos.execution.gateway.result.reservation.v1" as const;

export type FarmOsExecutionGatewayRequest = {
  schema_version: typeof FARM_OS_EXECUTION_GATEWAY_REQUEST_SCHEMA_VERSION;
  command: FarmOsApprovedCommand;
  execution_requested: false;
  dry_run_only: true;
};

export type FarmOsExecutionGatewayResult = {
  schema_version: typeof FARM_OS_EXECUTION_GATEWAY_RESULT_SCHEMA_VERSION;
  command_id: string;
  result_state: "blocked" | "unavailable";
  blocked_reason: "gateway_not_implemented_day132";
  gateway_call_performed: false;
  internal_execution_performed: false;
  external_execution_performed: false;
};

export function createFarmOsExecutionGatewayReservation(
  command: FarmOsApprovedCommand,
): { request: FarmOsExecutionGatewayRequest; result: FarmOsExecutionGatewayResult } {
  return {
    request: {
      schema_version: FARM_OS_EXECUTION_GATEWAY_REQUEST_SCHEMA_VERSION,
      command,
      execution_requested: false,
      dry_run_only: true,
    },
    result: {
      schema_version: FARM_OS_EXECUTION_GATEWAY_RESULT_SCHEMA_VERSION,
      command_id: command.command_id,
      result_state: "blocked",
      blocked_reason: "gateway_not_implemented_day132",
      gateway_call_performed: false,
      internal_execution_performed: false,
      external_execution_performed: false,
    },
  };
}
