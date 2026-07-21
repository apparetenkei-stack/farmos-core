import {
  computeFarmOsProposalIntegrityHash, hashFarmOsContract, hasExactFarmOsKeys,
  isCanonicalFarmOsIso, isFarmOsDigest, isFarmOsIdentifier, isFarmOsRecord,
  parseFarmOsApprovedProposal, parseFarmOsDuplicateAwareJson, type FarmOsApprovedProposal, type FarmOsApprovalEvidence,
  type FarmOsContractParseResult,
} from "./farm_os_approved_proposal_contract";
import { evaluateFarmOsAgentPolicy } from "./farm_os_agent_policy_matrix";
import { resolveFarmOsCommandClass, type FarmOsCommandClass, type FarmOsCommandPayload, type FarmOsCommandTarget } from "./farm_os_command_registry";
import type { FarmOsRiskLevel, FarmOsRollbackClass } from "./farm_os_risk_taxonomy";

export const FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION="farmos.approved.command.v1" as const;
export const FARM_OS_COMMAND_BUILD_REQUEST_SCHEMA_VERSION="farmos.command.build.request.v1" as const;
export const FARM_OS_APPROVED_COMMAND_BUILDER_VERSION="1" as const;
export const FARM_OS_COMMAND_REJECTION_CODES=["PROPOSAL_NOT_APPROVED","PROPOSAL_TYPE_UNKNOWN","PROPOSAL_VERSION_UNSUPPORTED","PROPOSAL_HASH_INVALID","APPROVAL_EVIDENCE_MISSING","APPROVAL_EVIDENCE_INVALID","APPROVAL_SCOPE_MISMATCH","RISK_LEVEL_MISMATCH","REQUIRED_CAPABILITY_MISSING","OUTPUT_CLASS_NOT_APPROVED","COMMAND_CLASS_UNKNOWN","COMMAND_VERSION_UNSUPPORTED","COMMAND_TARGET_NOT_ALLOWED","COMMAND_SCHEMA_INVALID","TRACE_INVALID","AUDIT_CONTEXT_INVALID","ROLLBACK_CLASS_INVALID","REAUTHORIZATION_POLICY_INVALID","UNKNOWN_FIELD","DUPLICATE_FIELD","DUPLICATE_COMMAND"] as const;
export type FarmOsCommandRejectionCode=(typeof FARM_OS_COMMAND_REJECTION_CODES)[number];

export type FarmOsCommandBuildRequest={schema_version:typeof FARM_OS_COMMAND_BUILD_REQUEST_SCHEMA_VERSION;command_class:FarmOsCommandClass;command_version:1;execution_target:FarmOsCommandTarget;execution_payload:FarmOsCommandPayload;capabilities:readonly string[];built_at:string;correlation_id:string;known_command_hashes:readonly string[]};
export type FarmOsApprovedCommand={
  schema_version:typeof FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION;command_id:string;command_class:FarmOsCommandClass;command_version:1;
  proposal_reference:{proposal_id:string;proposal_type:string;proposal_version:number;proposal_hash:string;approval_id:string};
  risk_level:Extract<FarmOsRiskLevel,"l2_internal_apply"|"l3_external_execution">;required_capabilities:readonly string[];approval_evidence:FarmOsApprovalEvidence;
  reauthorization_required:true;rollback_class:FarmOsRollbackClass;execution_scope:{scope_kind:"approved_proposal_only";approved_output_class:string};
  execution_target:FarmOsCommandTarget;execution_payload:FarmOsCommandPayload;
  idempotency:{command_id:string;command_hash:string;proposal_hash:string;builder_version:typeof FARM_OS_APPROVED_COMMAND_BUILDER_VERSION;persisted:false};
  audit:{built_at:string;builder_id:"farm-os-approved-command-builder";review_audit_reference:string};trace:FarmOsApprovedProposal["trace"];
};
export type FarmOsApprovedCommandBuildResult={result:"success";command:FarmOsApprovedCommand;rejection:null;gateway_call_count:0;internal_execution_count:0;external_execution_count:0;business_write_count:0;proposal_apply_count:0}|{result:"rejected";command:null;rejection:{code:FarmOsCommandRejectionCode};gateway_call_count:0;internal_execution_count:0;external_execution_count:0;business_write_count:0;proposal_apply_count:0};

const BUILD_KEYS=["schema_version","command_class","command_version","execution_target","execution_payload","capabilities","built_at","correlation_id","known_command_hashes"] as const;
const COMMAND_KEYS=["schema_version","command_id","command_class","command_version","proposal_reference","risk_level","required_capabilities","approval_evidence","reauthorization_required","rollback_class","execution_scope","execution_target","execution_payload","idempotency","audit","trace"] as const;
const REF_KEYS=["proposal_id","proposal_type","proposal_version","proposal_hash","approval_id"] as const;
const IDEMPOTENCY_KEYS=["command_id","command_hash","proposal_hash","builder_version","persisted"] as const;
const AUDIT_KEYS=["built_at","builder_id","review_audit_reference"] as const;
const TRACE_KEYS=["request_id","correlation_id","source_event_hash"] as const;
const SCOPE_KEYS=["scope_kind","approved_output_class"] as const;
const APPROVAL_KEYS=["approval_id","decision","review_actor","review_timestamp","approved_capabilities","approved_output_classes","proposal_version","proposal_hash"] as const;
const exactSet=(value:unknown,expected:readonly string[])=>Array.isArray(value)&&value.length===expected.length&&value.every((item)=>typeof item==="string"&&expected.includes(item))&&new Set(value).size===value.length;
const payloadValid=(value:unknown,commandClass:FarmOsCommandClass,proposalId:string)=>{
  if(!isFarmOsRecord(value)||!hasExactFarmOsKeys(value,["schema_version","operation","proposal_id"]))return false;
  return value.proposal_id===proposalId&&(commandClass==="approved_internal_command"?value.schema_version==="farmos.command.payload.work_log_follow_up.v1"&&value.operation==="prepare_work_log_follow_up":value.schema_version==="farmos.command.payload.external_reservation.v1"&&value.operation==="reserve_external_execution_contract");
};
const reject=(code:FarmOsCommandRejectionCode):FarmOsApprovedCommandBuildResult=>({result:"rejected",command:null,rejection:{code},gateway_call_count:0,internal_execution_count:0,external_execution_count:0,business_write_count:0,proposal_apply_count:0});
const mapProposalReason=(reason:string):FarmOsCommandRejectionCode=>FARM_OS_COMMAND_REJECTION_CODES.includes(reason as FarmOsCommandRejectionCode)?reason as FarmOsCommandRejectionCode:"COMMAND_SCHEMA_INVALID";

export function parseFarmOsCommandBuildRequest(value:unknown):FarmOsContractParseResult<FarmOsCommandBuildRequest>{
  if(!isFarmOsRecord(value)||!hasExactFarmOsKeys(value,BUILD_KEYS))return{valid:false,value:null,blocked_reason:"UNKNOWN_FIELD"};
  if(value.schema_version!==FARM_OS_COMMAND_BUILD_REQUEST_SCHEMA_VERSION)return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  const registry=resolveFarmOsCommandClass(value.command_class);if(!registry)return{valid:false,value:null,blocked_reason:"COMMAND_CLASS_UNKNOWN"};
  if(value.command_version!==registry.command_version)return{valid:false,value:null,blocked_reason:"COMMAND_VERSION_UNSUPPORTED"};
  if(!registry.allowed_target_systems.includes(value.execution_target as FarmOsCommandTarget))return{valid:false,value:null,blocked_reason:"COMMAND_TARGET_NOT_ALLOWED"};
  if(!Array.isArray(value.capabilities)||value.capabilities.some((item)=>typeof item!=="string")||!isCanonicalFarmOsIso(value.built_at)||!isFarmOsIdentifier(value.correlation_id)||!Array.isArray(value.known_command_hashes)||value.known_command_hashes.some((item)=>!isFarmOsDigest(item)))return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  return{valid:true,value:value as FarmOsCommandBuildRequest,blocked_reason:null};
}
export function parseFarmOsCommandBuildRequestJson(text:unknown):FarmOsContractParseResult<FarmOsCommandBuildRequest>{const raw=parseFarmOsDuplicateAwareJson(text);if(!raw.valid)return{valid:false,value:null,blocked_reason:raw.blocked_reason};return parseFarmOsCommandBuildRequest(raw.value);}

export function parseFarmOsApprovedCommand(value:unknown):FarmOsContractParseResult<FarmOsApprovedCommand>{
  if(!isFarmOsRecord(value)||!hasExactFarmOsKeys(value,COMMAND_KEYS))return{valid:false,value:null,blocked_reason:"UNKNOWN_FIELD"};
  const registry=resolveFarmOsCommandClass(value.command_class);if(!registry)return{valid:false,value:null,blocked_reason:"COMMAND_CLASS_UNKNOWN"};
  if(value.schema_version!==FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION||value.command_version!==registry.command_version||!isFarmOsIdentifier(value.command_id))return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  if(value.risk_level!==registry.required_risk_level)return{valid:false,value:null,blocked_reason:"RISK_LEVEL_MISMATCH"};
  if(!exactSet(value.required_capabilities,registry.required_capabilities))return{valid:false,value:null,blocked_reason:"REQUIRED_CAPABILITY_MISSING"};
  if(value.reauthorization_required!==registry.reauthorization_required)return{valid:false,value:null,blocked_reason:"REAUTHORIZATION_POLICY_INVALID"};
  if(value.rollback_class!==registry.rollback_class)return{valid:false,value:null,blocked_reason:"ROLLBACK_CLASS_INVALID"};
  if(!isFarmOsRecord(value.proposal_reference)||!hasExactFarmOsKeys(value.proposal_reference,REF_KEYS)||!isFarmOsIdentifier(value.proposal_reference.proposal_id)||!registry.allowed_proposal_types.includes(value.proposal_reference.proposal_type as "work_log_follow_up")||!Number.isSafeInteger(value.proposal_reference.proposal_version)||!isFarmOsDigest(value.proposal_reference.proposal_hash)||!isFarmOsIdentifier(value.proposal_reference.approval_id))return{valid:false,value:null,blocked_reason:"PROPOSAL_HASH_INVALID"};
  if(!isFarmOsRecord(value.approval_evidence)||!hasExactFarmOsKeys(value.approval_evidence,APPROVAL_KEYS)||value.approval_evidence.approval_id!==value.proposal_reference.approval_id||value.approval_evidence.decision!=="approve"||value.approval_evidence.review_actor!=="human_reviewer"||!isCanonicalFarmOsIso(value.approval_evidence.review_timestamp)||value.approval_evidence.proposal_version!==value.proposal_reference.proposal_version||value.approval_evidence.proposal_hash!==value.proposal_reference.proposal_hash||!exactSet(value.approval_evidence.approved_capabilities,registry.required_capabilities)||!exactSet(value.approval_evidence.approved_output_classes,registry.allowed_output_classes))return{valid:false,value:null,blocked_reason:"APPROVAL_EVIDENCE_INVALID"};
  if(!isFarmOsRecord(value.execution_scope)||!hasExactFarmOsKeys(value.execution_scope,SCOPE_KEYS)||value.execution_scope.scope_kind!=="approved_proposal_only"||!registry.allowed_output_classes.includes(value.execution_scope.approved_output_class as never))return{valid:false,value:null,blocked_reason:"OUTPUT_CLASS_NOT_APPROVED"};
  if(!registry.allowed_target_systems.includes(value.execution_target as FarmOsCommandTarget))return{valid:false,value:null,blocked_reason:"COMMAND_TARGET_NOT_ALLOWED"};
  if(!payloadValid(value.execution_payload,registry.command_class,value.proposal_reference.proposal_id as string))return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  if(!isFarmOsRecord(value.idempotency)||!hasExactFarmOsKeys(value.idempotency,IDEMPOTENCY_KEYS)||value.idempotency.command_id!==value.command_id||!isFarmOsDigest(value.idempotency.command_hash)||value.idempotency.proposal_hash!==value.proposal_reference.proposal_hash||value.idempotency.builder_version!==FARM_OS_APPROVED_COMMAND_BUILDER_VERSION||value.idempotency.persisted!==false)return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  if(!isFarmOsRecord(value.audit)||!hasExactFarmOsKeys(value.audit,AUDIT_KEYS)||!isCanonicalFarmOsIso(value.audit.built_at)||value.audit.builder_id!=="farm-os-approved-command-builder"||!isFarmOsIdentifier(value.audit.review_audit_reference)||Date.parse(value.audit.built_at as string)<Date.parse(value.approval_evidence.review_timestamp as string))return{valid:false,value:null,blocked_reason:"AUDIT_CONTEXT_INVALID"};
  if(!isFarmOsRecord(value.trace)||!hasExactFarmOsKeys(value.trace,TRACE_KEYS)||!isFarmOsIdentifier(value.trace.request_id)||!isFarmOsIdentifier(value.trace.correlation_id)||!isFarmOsDigest(value.trace.source_event_hash))return{valid:false,value:null,blocked_reason:"TRACE_INVALID"};
  const expectedProposalHash=computeFarmOsProposalIntegrityHash({proposal_id:value.proposal_reference.proposal_id as string,proposal_type:value.proposal_reference.proposal_type as string,proposal_version:value.proposal_reference.proposal_version as number,source_runtime:"farmos-native-runtime",trace:value.trace as FarmOsApprovedProposal["trace"]});
  if(value.proposal_reference.proposal_hash!==expectedProposalHash)return{valid:false,value:null,blocked_reason:"PROPOSAL_HASH_INVALID"};
  const expectedCommandId=`command_${hashFarmOsContract({proposal_hash:value.proposal_reference.proposal_hash,approval_id:value.proposal_reference.approval_id,command_class:registry.command_class,builder_version:FARM_OS_APPROVED_COMMAND_BUILDER_VERSION}).slice(7,39)}`;
  if(value.command_id!==expectedCommandId)return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  const command=value as unknown as FarmOsApprovedCommand;const withoutHash={...command,idempotency:{...command.idempotency,command_hash:"pending"}};
  if(command.idempotency.command_hash!==hashFarmOsContract(withoutHash))return{valid:false,value:null,blocked_reason:"COMMAND_SCHEMA_INVALID"};
  return{valid:true,value:command,blocked_reason:null};
}

export function buildFarmOsApprovedCommand(input:{approved_proposal:unknown;build_request:unknown}):FarmOsApprovedCommandBuildResult{
  const proposalResult=parseFarmOsApprovedProposal(input.approved_proposal);if(!proposalResult.valid)return reject(mapProposalReason(proposalResult.blocked_reason));const proposal=proposalResult.value;
  const requestResult=parseFarmOsCommandBuildRequest(input.build_request);if(!requestResult.valid)return reject(mapProposalReason(requestResult.blocked_reason));const request=requestResult.value;
  const registry=resolveFarmOsCommandClass(request.command_class)!;
  if(!registry.allowed_proposal_types.includes(proposal.proposal_type as "work_log_follow_up"))return reject("PROPOSAL_TYPE_UNKNOWN");
  if(proposal.risk_level!==registry.required_risk_level)return reject("RISK_LEVEL_MISMATCH");
  if(!registry.allowed_output_classes.includes(proposal.approved_outputs[0] as never))return reject("OUTPUT_CLASS_NOT_APPROVED");
  if(!exactSet(proposal.approval_evidence.approved_capabilities,registry.required_capabilities)||registry.required_capabilities.some((capability)=>!request.capabilities.includes(capability)))return reject("REQUIRED_CAPABILITY_MISSING");
  if(proposal.approval_evidence.proposal_hash!==computeFarmOsProposalIntegrityHash(proposal))return reject("PROPOSAL_HASH_INVALID");
  if(request.correlation_id!==proposal.trace.correlation_id)return reject("TRACE_INVALID");
  if(!payloadValid(request.execution_payload,registry.command_class,proposal.proposal_id))return reject("COMMAND_SCHEMA_INVALID");
  const matrix=evaluateFarmOsAgentPolicy({actor:"approved_command_builder",action:"build_approved_command",risk_level:registry.required_risk_level,capabilities:request.capabilities,approved_proposal_evidence:proposal,approval_evidence:proposal.approval_evidence});
  if(!matrix.allowed)return reject(matrix.blocked_reason==="missing_required_capability"?"REQUIRED_CAPABILITY_MISSING":"APPROVAL_EVIDENCE_INVALID");
  if(Date.parse(request.built_at)<Date.parse(proposal.review_timestamp))return reject("AUDIT_CONTEXT_INVALID");
  const proposalHash=proposal.approval_evidence.proposal_hash;const commandId=`command_${hashFarmOsContract({proposal_hash:proposalHash,approval_id:proposal.approval_evidence.approval_id,command_class:registry.command_class,builder_version:FARM_OS_APPROVED_COMMAND_BUILDER_VERSION}).slice(7,39)}`;
  const draft:FarmOsApprovedCommand={schema_version:FARM_OS_APPROVED_COMMAND_SCHEMA_VERSION,command_id:commandId,command_class:registry.command_class,command_version:registry.command_version,proposal_reference:{proposal_id:proposal.proposal_id,proposal_type:proposal.proposal_type,proposal_version:proposal.proposal_version,proposal_hash:proposalHash,approval_id:proposal.approval_evidence.approval_id},risk_level:registry.required_risk_level,required_capabilities:registry.required_capabilities,approval_evidence:proposal.approval_evidence,reauthorization_required:registry.reauthorization_required,rollback_class:registry.rollback_class,execution_scope:{scope_kind:"approved_proposal_only",approved_output_class:proposal.approved_outputs[0]},execution_target:request.execution_target,execution_payload:request.execution_payload,idempotency:{command_id:commandId,command_hash:"pending",proposal_hash:proposalHash,builder_version:FARM_OS_APPROVED_COMMAND_BUILDER_VERSION,persisted:false},audit:{built_at:request.built_at,builder_id:"farm-os-approved-command-builder",review_audit_reference:proposal.audit.review_audit_reference},trace:proposal.trace};
  const commandHash=hashFarmOsContract(draft);if(request.known_command_hashes.includes(commandHash))return reject("DUPLICATE_COMMAND");const command={...draft,idempotency:{...draft.idempotency,command_hash:commandHash}};
  const parsed=parseFarmOsApprovedCommand(command);if(!parsed.valid)return reject(mapProposalReason(parsed.blocked_reason));return{result:"success",command:parsed.value,rejection:null,gateway_call_count:0,internal_execution_count:0,external_execution_count:0,business_write_count:0,proposal_apply_count:0};
}
