import type { FarmOsApprovedCommand } from "./farm_os_approved_command_contract";
export const FARM_OS_EXECUTION_GATEWAY_REQUEST_SCHEMA_VERSION="farmos.execution.gateway.request.v1" as const;
export const FARM_OS_EXECUTION_GATEWAY_RESULT_SCHEMA_VERSION="farmos.execution.gateway.result.v1" as const;
export type FarmOsExecutionGatewayRequest={schema_version:typeof FARM_OS_EXECUTION_GATEWAY_REQUEST_SCHEMA_VERSION;request_id:string;approved_command:FarmOsApprovedCommand;requested_at:string;request_actor:"execution_gateway";correlation_id:string};
export type FarmOsExecutionGatewayResult={schema_version:typeof FARM_OS_EXECUTION_GATEWAY_RESULT_SCHEMA_VERSION;request_id:string;command_id:string;result:"blocked"|"unavailable";error:string;gateway_version:"not_implemented_day132";audit:{recorded_at:string};trace:{correlation_id:string}};
// Contract only: Day132 intentionally exports no gateway implementation, adapter, dispatcher, or state machine.
