import { randomUUID } from "node:crypto";
import type { HermesWorkerWakeRequest } from "../startup_runtime/hermes_worker_startup_contract";
import type { HermesWakeExecutionApproval, HermesWakeExecutionEligibility, HermesWakeExecutionPolicy, HermesWakeExecutionRecord } from "./hermes_wake_execution_contract";
export const HERMES_WAKE_EXECUTION_POLICY: HermesWakeExecutionPolicy = { schema_version: "hermes.wake.execution.policy.v1",
  approval_ttl_ms: 120000, maximum_execution_count_per_request: 1, allowed_worker_type: "rtx", allowed_transport: "udp_wol",
  default_port: 9, source: "server_policy", safety: { approval_required: true, automatic_execution_allowed: false,
    client_network_override_allowed: false, ssh_allowed: false, remote_command_allowed: false, model_execution_allowed: false, fail_closed: true } };
const ts=(v:string)=>{const n=Date.parse(v);if(!Number.isFinite(n))throw new Error("wake_timestamp_invalid");return n};
const id=(v:string)=>{if(!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(v))throw new Error("wake_id_invalid");return v};
export function createHermesWakeExecutionApproval(input:{request:HermesWorkerWakeRequest;nowIso:string;approvalIdFactory?:()=>string}):HermesWakeExecutionApproval{
  const now=ts(input.nowIso), expiry=ts(input.request.expires_at); if(input.request.status!=="requested"||input.request.worker_type!=="rtx"||input.request.target_worker_id===null||now>=expiry)throw new Error("wake_approval_not_allowed");
  return {schema_version:"hermes.wake.execution.approval.v1",approval_id:id((input.approvalIdFactory??randomUUID)()),wake_request_id:input.request.wake_request_id,
    routing_decision_id:input.request.routing_decision_id,target_worker_id:input.request.target_worker_id,approved_by:"operator",approved_at:new Date(now).toISOString(),
    expires_at:new Date(Math.min(now+120000,expiry)).toISOString(),decision:"approved",safety:{client_selected_network_target:false,network_target_stored:false,secret_stored:false,
      wake_signal_sent:false,ssh_connection_performed:false,model_execution_performed:false,db_write_performed:false,fail_closed:true}};
}
export function evaluateHermesWakeExecutionEligibility(input:{request:HermesWorkerWakeRequest|null;approval:HermesWakeExecutionApproval|null;nowIso:string;executionExists?:boolean}):HermesWakeExecutionEligibility{
  if(!input.request)return {eligible:false,reason_code:"wake_request_not_found",fail_closed:true}; const r=input.request; let now:number,rx:number;try{now=ts(input.nowIso);rx=ts(r.expires_at)}catch{return {eligible:false,reason_code:"wake_request_invalid",fail_closed:true}};
  if(r.schema_version!=="hermes.worker.wake.request.v1"||r.worker_type!=="rtx"||!["heavy_reasoning","large_context","gpu_inference"].includes(r.required_capability))return {eligible:false,reason_code:"wake_request_invalid",fail_closed:true};
  if(r.target_worker_id===null)return {eligible:false,reason_code:"wake_target_missing",fail_closed:true}; if(now>=rx)return {eligible:false,reason_code:"wake_request_expired",fail_closed:true};
  if(input.executionExists)return {eligible:false,reason_code:"wake_execution_duplicate",fail_closed:true}; if(r.status!=="requested")return {eligible:false,reason_code:"wake_request_status_not_allowed",fail_closed:true}; if(!input.approval)return {eligible:false,reason_code:"wake_approval_missing",fail_closed:true};
  const a=input.approval;let ax:number;try{ax=ts(a.expires_at)}catch{return {eligible:false,reason_code:"wake_approval_invalid",fail_closed:true}};
  if(a.schema_version!=="hermes.wake.execution.approval.v1"||a.decision!=="approved"||a.approved_by!=="operator")return {eligible:false,reason_code:"wake_approval_invalid",fail_closed:true};
  if(now>=ax)return {eligible:false,reason_code:"wake_approval_expired",fail_closed:true}; if(a.wake_request_id!==r.wake_request_id||a.routing_decision_id!==r.routing_decision_id||a.target_worker_id!==r.target_worker_id)return {eligible:false,reason_code:"wake_approval_mismatch",fail_closed:true};
  return {eligible:true,reason_code:"wake_execution_allowed",fail_closed:true};
}
export function createHermesWakeExecutionRecord(input:{request:HermesWorkerWakeRequest;approval:HermesWakeExecutionApproval;nowIso:string;executionIdFactory?:()=>string}):HermesWakeExecutionRecord{return{schema_version:"hermes.wake.execution.v1",execution_id:id((input.executionIdFactory??randomUUID)()),wake_request_id:input.request.wake_request_id,approval_id:input.approval.approval_id,routing_decision_id:input.request.routing_decision_id,target_worker_id:input.request.target_worker_id!,transport:"udp_wol",status:"reserved",reserved_at:new Date(ts(input.nowIso)).toISOString(),completed_at:null,error_code:null,bytes_sent:null,safety:{network_target_stored:false,mac_address_stored:false,broadcast_address_stored:false,credentials_stored:false,ssh_connection_performed:false,remote_command_performed:false,gpu_detection_performed:false,model_execution_performed:false,db_write_performed:false,fail_closed:true}}}
