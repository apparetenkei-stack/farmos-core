import { resolveFarmOsCommandClass,type FarmOsCommandClass,type FarmOsCommandTarget } from "./farm_os_command_registry";
import type { FarmOsRiskLevel } from "./farm_os_risk_taxonomy";
export const FARM_OS_EXECUTION_ADAPTER_IDS=["fake_execution_adapter"] as const;
export type FarmOsExecutionAdapterId=(typeof FARM_OS_EXECUTION_ADAPTER_IDS)[number];
export type FarmOsExecutionAdapterRegistryEntry={adapter_id:FarmOsExecutionAdapterId;adapter_version:1;allowed_command_classes:readonly FarmOsCommandClass[];allowed_targets:readonly FarmOsCommandTarget[];allowed_payload_schemas:readonly string[];risk_levels:readonly Extract<FarmOsRiskLevel,"l2_internal_apply"|"l3_external_execution">[];fake_only:true;business_write_allowed:false;external_execution_allowed:false;deterministic:true;result_schema:"farmos.fake.adapter.result.v1"};
export const FARM_OS_EXECUTION_ADAPTER_REGISTRY:Readonly<Record<FarmOsExecutionAdapterId,FarmOsExecutionAdapterRegistryEntry>>={fake_execution_adapter:{adapter_id:"fake_execution_adapter",adapter_version:1,allowed_command_classes:["approved_internal_command","approved_external_command"],allowed_targets:["farmos_internal_contract","approved_external_contract"],allowed_payload_schemas:["farmos.command.payload.work_log_follow_up.v1","farmos.command.payload.external_reservation.v1"],risk_levels:["l2_internal_apply","l3_external_execution"],fake_only:true,business_write_allowed:false,external_execution_allowed:false,deterministic:true,result_schema:"farmos.fake.adapter.result.v1"}};
export function resolveFarmOsExecutionAdapter(input:{command_class:unknown;execution_target:unknown;payload_schema:unknown;risk_level:unknown}):FarmOsExecutionAdapterRegistryEntry|null{
  const command=resolveFarmOsCommandClass(input.command_class);if(!command)return null;
  const entry=FARM_OS_EXECUTION_ADAPTER_REGISTRY.fake_execution_adapter;
  const tupleValid=input.execution_target===command.allowed_target_systems[0]&&input.payload_schema===command.payload_schema&&input.risk_level===command.required_risk_level;
  return tupleValid&&entry.allowed_command_classes.includes(command.command_class)&&entry.allowed_targets.includes(input.execution_target as FarmOsCommandTarget)&&entry.allowed_payload_schemas.includes(String(input.payload_schema))&&entry.risk_levels.includes(input.risk_level as never)?entry:null;
}
