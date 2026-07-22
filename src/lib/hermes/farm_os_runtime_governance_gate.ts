import type { FarmOsApprovedCommand } from "./farm_os_approved_command_contract";
import { hasExactFarmOsKeys,isCanonicalFarmOsIso,isFarmOsRecord } from "./farm_os_approved_proposal_contract";
import {
  evaluateFarmOsRuntimeGovernance,
  parseFarmOsRuntimeReauthorizationRequest,
  type FarmOsApprovalState,
  type FarmOsCapabilityState,
  type FarmOsCurrentPolicy,
  type FarmOsMemberState,
  type FarmOsRuntimeGovernanceDecision,
  type FarmOsRuntimeGovernancePorts,
  type FarmOsRuntimeGovernanceRejectionCode,
  type FarmOsSessionState,
  type FarmOsTargetState,
} from "./farm_os_runtime_reauthorization";

export const FARM_OS_RUNTIME_SUBJECT_SEPARATION_EVIDENCE={proposal_approval_separation_verified:true,execution_requester_identity_available:false,execution_requester_separation_verified:false} as const;
export type FarmOsProposalRuntimeState={state:"active"|"expired"|"superseded";proposal_id:string;proposal_hash:string;proposal_type:string;risk_level:"l2_internal_apply"|"l3_external_execution";execution_target:"farmos_internal_contract"|"approved_external_contract";proposal_actor_id:string;state_version:string};
export interface FarmOsProposalStatePort{getProposal(input:{proposal_id:string}):Promise<FarmOsProposalRuntimeState|{state:"not_found"|"unknown"}>;}
export type FarmOsRuntimeGovernanceGatePorts=FarmOsRuntimeGovernancePorts&{proposal_state_port:FarmOsProposalStatePort};
const exact=(value:unknown,keys:readonly string[]):value is Record<string,unknown>=>isFarmOsRecord(value)&&hasExactFarmOsKeys(value,keys);
const strings=(value:unknown)=>Array.isArray(value)&&value.every((item)=>typeof item==="string");
const approvalValid=(value:unknown):value is FarmOsApprovalState=>exact(value,["status","approval_id","proposal_id","proposal_hash","command_id","command_hash","approver_id","scope","expires_at","consumed","proposal_status","proposal_type","risk_level","execution_target","state_version"])&&typeof value.status==="string"&&typeof value.approval_id==="string"&&typeof value.proposal_id==="string"&&typeof value.proposal_hash==="string"&&typeof value.command_id==="string"&&typeof value.command_hash==="string"&&typeof value.approver_id==="string"&&typeof value.scope==="string"&&isCanonicalFarmOsIso(value.expires_at)&&typeof value.consumed==="boolean"&&typeof value.proposal_status==="string"&&typeof value.proposal_type==="string"&&typeof value.risk_level==="string"&&typeof value.execution_target==="string"&&typeof value.state_version==="string";
const capabilityValid=(value:unknown):value is FarmOsCapabilityState=>exact(value,["capabilities","scope","valid_from","valid_until","suspended","revoked","state_version"])&&strings(value.capabilities)&&typeof value.scope==="string"&&isCanonicalFarmOsIso(value.valid_from)&&isCanonicalFarmOsIso(value.valid_until)&&typeof value.suspended==="boolean"&&typeof value.revoked==="boolean"&&typeof value.state_version==="string";
const memberValid=(value:unknown):value is FarmOsMemberState=>exact(value,["state","state_version"])&&typeof value.state==="string"&&typeof value.state_version==="string";
const sessionValid=(value:unknown):value is FarmOsSessionState=>exact(value,["principal_id","valid","expires_at","reauthenticated_at","state_version"])&&typeof value.principal_id==="string"&&typeof value.valid==="boolean"&&isCanonicalFarmOsIso(value.expires_at)&&(value.reauthenticated_at===null||isCanonicalFarmOsIso(value.reauthenticated_at))&&typeof value.state_version==="string";
const targetValid=(value:unknown):value is FarmOsTargetState=>exact(value,["exists","current_version","state","scope","command_id_executed","command_hash_executed","approval_consumed","target_changed","state_version"])&&typeof value.exists==="boolean"&&(value.current_version===null||Number.isSafeInteger(value.current_version))&&typeof value.state==="string"&&typeof value.scope==="string"&&typeof value.command_id_executed==="boolean"&&typeof value.command_hash_executed==="boolean"&&typeof value.approval_consumed==="boolean"&&typeof value.target_changed==="boolean"&&typeof value.state_version==="string";
const policyValid=(value:unknown):value is FarmOsCurrentPolicy=>exact(value,["policy_version","command_class_allowed","risk_level_allowed","target_allowed","required_capabilities","rollback_class","l3_reauthentication_required"])&&typeof value.policy_version==="string"&&typeof value.command_class_allowed==="boolean"&&typeof value.risk_level_allowed==="boolean"&&typeof value.target_allowed==="boolean"&&strings(value.required_capabilities)&&typeof value.rollback_class==="string"&&typeof value.l3_reauthentication_required==="boolean";
const proposalValid=(value:unknown):value is FarmOsProposalRuntimeState=>exact(value,["state","proposal_id","proposal_hash","proposal_type","risk_level","execution_target","proposal_actor_id","state_version"])&&typeof value.state==="string"&&typeof value.proposal_id==="string"&&typeof value.proposal_hash==="string"&&typeof value.proposal_type==="string"&&typeof value.risk_level==="string"&&typeof value.execution_target==="string"&&typeof value.proposal_actor_id==="string"&&typeof value.state_version==="string";
const safe=async<T>(read:()=>Promise<unknown>,valid:(value:unknown)=>value is T,allowNotFound=false):Promise<T|{state:"not_found"|"unknown"}>=>{try{const value=await read();if(valid(value))return value;if(exact(value,["state"])&&(value.state==="unknown"||(allowNotFound&&value.state==="not_found")))return value as {state:"not_found"|"unknown"};return{state:"unknown"};}catch{return{state:"unknown"};}};
const safeCorePorts=(ports:FarmOsRuntimeGovernancePorts,evaluatedAt:string|null):FarmOsRuntimeGovernancePorts=>({
  approval_state_port:{getApproval:(input)=>safe(()=>ports.approval_state_port.getApproval(input),approvalValid,true) as never},
  actor_capability_port:{getCapabilities:(async(input)=>{const value=await safe(()=>ports.actor_capability_port.getCapabilities(input),capabilityValid);if("state_version" in value&&evaluatedAt!==null&&Date.parse(value.valid_from)>Date.parse(evaluatedAt))return{state:"unknown"};return value;}) as never},
  member_state_port:{getMember:(input)=>safe(()=>ports.member_state_port.getMember(input),memberValid,true) as never},
  session_state_port:{getSession:(input)=>safe(()=>ports.session_state_port.getSession(input),sessionValid,true) as never},
  target_state_port:{getTarget:(input)=>safe(()=>ports.target_state_port.getTarget(input),targetValid) as never},
  current_policy_port:{getPolicy:(input)=>safe(()=>ports.current_policy_port.getPolicy(input),policyValid,true) as never},
});
const blocked=(base:Extract<FarmOsRuntimeGovernanceDecision,{decision:"authorized"}>,code:FarmOsRuntimeGovernanceRejectionCode):FarmOsRuntimeGovernanceDecision=>({decision:"blocked",decision_id:base.decision_id,evaluated_at:base.evaluated_at,blocked_reason:code,failed_checks:[{check:"runtime_proposal_and_separation",passed:false,rejection:code}],evidence_refs:[`runtime_governance:${code.toLowerCase()}`],trace:base.trace});
export async function evaluateFarmOsRuntimeGovernanceGate(input:{request:unknown;command:FarmOsApprovedCommand;ports:FarmOsRuntimeGovernanceGatePorts}):Promise<FarmOsRuntimeGovernanceDecision>{
  const earlyRequest=parseFarmOsRuntimeReauthorizationRequest(input.request);const base=await evaluateFarmOsRuntimeGovernance({...input,ports:safeCorePorts(input.ports,earlyRequest.valid?earlyRequest.value.evaluated_at:null)});if(base.decision!=="authorized")return base;
  const request=parseFarmOsRuntimeReauthorizationRequest(input.request);if(!request.valid)return blocked(base,"GOVERNANCE_REQUEST_INVALID");
  const proposal=await safe(()=>input.ports.proposal_state_port.getProposal({proposal_id:request.value.proposal_id}),proposalValid,true);if(!("state_version" in proposal))return blocked(base,proposal.state==="not_found"?"PROPOSAL_NOT_FOUND":"UNKNOWN_PORT_RESULT");
  if(proposal.state!=="active")return blocked(base,proposal.state==="expired"?"PROPOSAL_EXPIRED":"PROPOSAL_SUPERSEDED");
  if(proposal.proposal_hash!==request.value.proposal_hash)return blocked(base,"PROPOSAL_HASH_MISMATCH");if(proposal.proposal_type!==input.command.proposal_reference.proposal_type)return blocked(base,"PROPOSAL_TYPE_MISMATCH");if(proposal.risk_level!==input.command.risk_level)return blocked(base,"PROPOSAL_RISK_MISMATCH");if(proposal.execution_target!==input.command.execution_target)return blocked(base,"PROPOSAL_TARGET_MISMATCH");if(proposal.proposal_actor_id===request.value.approver_id)return blocked(base,"SELF_APPROVAL_FORBIDDEN");return base;
}
