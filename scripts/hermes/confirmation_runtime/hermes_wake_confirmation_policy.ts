import { randomUUID } from "node:crypto";
import { HERMES_WORKER_CAPABILITIES, HERMES_WORKER_HEARTBEAT_TIMEOUT_MS, assertHermesWorkerId, type HermesWorkerAdvertisement } from "../worker_runtime/hermes_worker_protocol";
import type { HermesWorkerRegistryRecord } from "../worker_runtime/hermes_worker_registry_contract";
import type { HermesWorkerWakeRequest } from "../startup_runtime/hermes_worker_startup_contract";
import type { HermesWakeExecutionRecord } from "../wake_runtime/hermes_wake_execution_contract";
import type { HermesWakeConfirmationPolicy, HermesWakeConfirmationRecord, HermesWakeConfirmationRequirement, HermesWakeConfirmationSafety, HermesWakeConfirmationStatus } from "./hermes_wake_confirmation_contract";

export const HERMES_WAKE_CONFIRMATION_POLICY: HermesWakeConfirmationPolicy = { schema_version:"hermes.wake.confirmation.policy.v1", confirmation_window_ms:180000,
  heartbeat_freshness_ms:HERMES_WORKER_HEARTBEAT_TIMEOUT_MS, minimum_post_execution_heartbeat_delay_ms:0, required_worker_type:"rtx", required_execution_status:"sent",
  record_retention_ms:300000, source:"server_policy", safety:{client_timeout_override_allowed:false,automatic_remote_connection_allowed:false,
    automatic_model_execution_allowed:false,automatic_queue_resume_allowed:false,automatic_job_retry_allowed:false,fail_closed:true} };
export const HERMES_WAKE_CONFIRMATION_SAFETY: HermesWakeConfirmationSafety = { ssh_connection_performed:false,remote_command_performed:false,
  gpu_detection_performed:false,model_execution_performed:false,queue_write_performed:false,job_retry_performed:false,db_write_performed:false,fail_closed:true };
export const HERMES_WAKE_CONFIRMATION_STATUSES = ["waiting_for_heartbeat","worker_ready","worker_not_ready","runtime_unavailable","worker_unhealthy","worker_draining","capability_unavailable","timed_out"] as const;
export const HERMES_WAKE_CONFIRMATION_REASON_CODES = ["confirmation_waiting_for_worker","confirmation_heartbeat_missing","confirmation_heartbeat_precedes_execution",
  "confirmation_heartbeat_stale","confirmation_worker_unhealthy","confirmation_worker_draining","confirmation_capability_unavailable","confirmation_worker_not_ready",
  "confirmation_runtime_unavailable","confirmation_worker_ready","confirmation_worker_ready_capacity_full","confirmation_timed_out"] as const;
const canonicalIso=(v:unknown):v is string=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString()===v;
const iso=(v:string)=>{if(!canonicalIso(v))throw new Error("confirmation_timestamp_invalid");return Date.parse(v)};
const id=(v:string)=>{if(!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(v))throw new Error("confirmation_id_invalid");return v};
const capability=(v:unknown):v is HermesWakeConfirmationRequirement["required_capability"]=>["heavy_reasoning","large_context","gpu_inference"].includes(String(v));
export const isHermesWakeConfirmationTerminal=(s:HermesWakeConfirmationStatus)=>["worker_ready","worker_unhealthy","worker_draining","capability_unavailable","timed_out"].includes(s);

export function createHermesWakeConfirmationRequirement(input:{request:HermesWorkerWakeRequest;execution:HermesWakeExecutionRecord;nowIso:string}):HermesWakeConfirmationRequirement {
  const now=iso(input.nowIso), completed=input.execution.completed_at?iso(input.execution.completed_at):NaN;
  if(input.request.status!=="acknowledged"||input.request.target_worker_id===null||input.execution.status!=="sent"||input.execution.bytes_sent!==102||
    !Number.isFinite(completed)||input.execution.wake_request_id!==input.request.wake_request_id||input.execution.target_worker_id!==input.request.target_worker_id||
    input.execution.routing_decision_id!==input.request.routing_decision_id||completed>now||now>=completed+HERMES_WAKE_CONFIRMATION_POLICY.confirmation_window_ms) throw new Error("confirmation_not_allowed");
  return { schema_version:"hermes.wake.confirmation.requirement.v1",wake_request_id:input.request.wake_request_id,execution_id:input.execution.execution_id,
    target_worker_id:input.request.target_worker_id,required_capability:input.request.required_capability,execution_completed_at:input.execution.completed_at!,
    confirmation_deadline_at:new Date(completed+HERMES_WAKE_CONFIRMATION_POLICY.confirmation_window_ms).toISOString(),source:"server_policy",safety:HERMES_WAKE_CONFIRMATION_SAFETY };
}
export function createHermesWakeConfirmationRecord(input:{requirement:HermesWakeConfirmationRequirement;nowIso:string;confirmationIdFactory?:()=>string}):HermesWakeConfirmationRecord {
  const now=new Date(iso(input.nowIso)).toISOString(); return {schema_version:"hermes.wake.confirmation.v1",confirmation_id:id((input.confirmationIdFactory??randomUUID)()),
    wake_request_id:input.requirement.wake_request_id,execution_id:input.requirement.execution_id,target_worker_id:input.requirement.target_worker_id,
    required_capability:input.requirement.required_capability,status:"waiting_for_heartbeat",started_at:now,updated_at:now,deadline_at:input.requirement.confirmation_deadline_at,
    execution_completed_at:input.requirement.execution_completed_at,observed_worker_id:null,observed_heartbeat_at:null,observed_readiness:null,observed_health:null,
    observed_runtime_available:null,observed_draining:null,worker_boot_confirmed:false,worker_accepting_jobs:false,completed_at:null,
    reason_code:"confirmation_waiting_for_worker",safety:HERMES_WAKE_CONFIRMATION_SAFETY};
}
export function parseHermesWakeConfirmationRecord(value:string):HermesWakeConfirmationRecord|null {
  try { const r=JSON.parse(value) as HermesWakeConfirmationRecord; id(r.confirmation_id);id(r.wake_request_id);id(r.execution_id);id(r.target_worker_id);
    const started=iso(r.started_at),updated=iso(r.updated_at),deadline=iso(r.deadline_at),execution=iso(r.execution_completed_at);
    if(r.schema_version!=="hermes.wake.confirmation.v1"||!capability(r.required_capability)||!HERMES_WAKE_CONFIRMATION_STATUSES.includes(r.status)||
      updated<started||execution>started||deadline-execution!==HERMES_WAKE_CONFIRMATION_POLICY.confirmation_window_ms||
      (r.observed_worker_id!==null&&(()=>{try{assertHermesWorkerId(r.observed_worker_id!);return false}catch{return true}})())||
      (r.observed_heartbeat_at!==null&&!canonicalIso(r.observed_heartbeat_at))||
      (r.observed_readiness!==null&&!(["ready","not_ready","draining","offline"] as unknown[]).includes(r.observed_readiness))||
      (r.observed_health!==null&&!(["healthy","degraded","unhealthy","unknown"] as unknown[]).includes(r.observed_health))||
      !(r.observed_runtime_available===null||typeof r.observed_runtime_available==="boolean")||!(r.observed_draining===null||typeof r.observed_draining==="boolean")||
      !HERMES_WAKE_CONFIRMATION_REASON_CODES.includes(r.reason_code as typeof HERMES_WAKE_CONFIRMATION_REASON_CODES[number])||
      typeof r.worker_boot_confirmed!=="boolean"||typeof r.worker_accepting_jobs!=="boolean"||(r.worker_accepting_jobs&&!r.worker_boot_confirmed)||
      r.safety?.ssh_connection_performed!==false||r.safety.remote_command_performed!==false||r.safety.gpu_detection_performed!==false||
      r.safety.model_execution_performed!==false||r.safety.queue_write_performed!==false||r.safety.job_retry_performed!==false||r.safety.db_write_performed!==false||r.safety.fail_closed!==true) return null;
    const completed=r.completed_at===null?null:iso(r.completed_at); if(completed!==null&&completed<started)return null;
    if(r.status==="waiting_for_heartbeat"&&(completed!==null||r.worker_boot_confirmed||r.worker_accepting_jobs))return null;
    if((r.status==="worker_not_ready"||r.status==="runtime_unavailable")&&(completed!==null||!r.worker_boot_confirmed||r.worker_accepting_jobs))return null;
    if(r.status==="worker_ready"&&(completed===null||!r.worker_boot_confirmed))return null;
    if((["worker_unhealthy","worker_draining","capability_unavailable"] as unknown[]).includes(r.status)&&(completed===null||!r.worker_boot_confirmed||r.worker_accepting_jobs))return null;
    if(r.status==="timed_out"&&(completed===null||r.worker_boot_confirmed||r.worker_accepting_jobs))return null; return r;
  } catch { return null; }
}
export function parseHermesConfirmationWorkerRecord(value:string):HermesWorkerRegistryRecord|null {
  try {const r=JSON.parse(value)as HermesWorkerRegistryRecord,w=r?.worker;assertHermesWorkerId(w.worker_id);
    if(r.schema_version!=="hermes.worker.registry.v1"||w.schema_version!=="hermes.worker.v1"||w.worker_type!=="rtx"||!Array.isArray(w.capabilities)||w.capabilities.length===0||
      w.capabilities.some(c=>!HERMES_WORKER_CAPABILITIES.includes(c))||!["healthy","degraded","unhealthy","unknown"].includes(w.health)||!["ready","not_ready","draining","offline"].includes(w.readiness)||
      typeof w.runtime_available!=="boolean"||typeof w.draining!=="boolean"||w.heartbeat_interval_ms!==15000||w.heartbeat_timeout_ms!==45000||!canonicalIso(w.registered_at)||!canonicalIso(w.last_heartbeat_at)||
      !Number.isInteger(w.active_job_count)||w.active_job_count<0||!Number.isInteger(w.max_concurrency)||w.max_concurrency<1||w.active_job_count>w.max_concurrency||
      (w.active_job_count===0)!==(w.current_job_id===null)||w.safety?.secret_stored!==false||w.safety.credentials_stored!==false||w.safety.fail_closed!==true||
      r.registry?.registered!==true||!Number.isInteger(r.registry.heartbeat_count)||r.safety?.fail_closed!==true)return null;return r;}catch{return null}
}
type Evaluation={record:HermesWakeConfirmationRecord|null;error_code:string|null};
export function evaluateHermesWakeConfirmation(input:{confirmation:HermesWakeConfirmationRecord;worker:HermesWorkerAdvertisement|null;nowIso:string}):Evaluation {
  const r=input.confirmation,now=iso(input.nowIso);if(isHermesWakeConfirmationTerminal(r.status))return{record:r,error_code:null};
  if(now>=iso(r.deadline_at))return{record:update(r,input.nowIso,null,"timed_out","confirmation_timed_out",false,false,true),error_code:null};
  const w=input.worker;if(!w)return{record:update(r,input.nowIso,null,"waiting_for_heartbeat","confirmation_heartbeat_missing"),error_code:null};
  if(w.worker_id!==r.target_worker_id)return{record:null,error_code:"confirmation_target_mismatch"};const hb=iso(w.last_heartbeat_at);
  if(hb>now)return{record:null,error_code:"confirmation_worker_record_invalid"};if(hb<=iso(r.execution_completed_at))return{record:update(r,input.nowIso,w,"waiting_for_heartbeat","confirmation_heartbeat_precedes_execution"),error_code:null};
  if(now-hb>=HERMES_WAKE_CONFIRMATION_POLICY.heartbeat_freshness_ms)return{record:update(r,input.nowIso,w,"waiting_for_heartbeat","confirmation_heartbeat_stale"),error_code:null};
  if(w.health!=="healthy")return{record:update(r,input.nowIso,w,"worker_unhealthy","confirmation_worker_unhealthy",true,false,true),error_code:null};
  if(w.draining||w.readiness==="draining")return{record:update(r,input.nowIso,w,"worker_draining","confirmation_worker_draining",true,false,true),error_code:null};
  if(!w.capabilities.includes(r.required_capability))return{record:update(r,input.nowIso,w,"capability_unavailable","confirmation_capability_unavailable",true,false,true),error_code:null};
  if(w.readiness!=="ready"&&w.runtime_available)return{record:update(r,input.nowIso,w,"worker_not_ready","confirmation_worker_not_ready",true,false),error_code:null};
  if(!w.runtime_available)return{record:update(r,input.nowIso,w,"runtime_unavailable","confirmation_runtime_unavailable",true,false),error_code:null};
  const accepting=w.active_job_count<w.max_concurrency;return{record:update(r,input.nowIso,w,"worker_ready",accepting?"confirmation_worker_ready":"confirmation_worker_ready_capacity_full",true,accepting,true),error_code:null};
}
function update(r:HermesWakeConfirmationRecord,now:string,w:HermesWorkerAdvertisement|null,status:HermesWakeConfirmationStatus,reason:string,boot=false,accept=false,terminal=false):HermesWakeConfirmationRecord {
  const timestamp=new Date(iso(now)).toISOString();return{...r,status,updated_at:timestamp,observed_worker_id:w?.worker_id??null,observed_heartbeat_at:w?.last_heartbeat_at??null,
    observed_readiness:w?.readiness??null,observed_health:w?.health??null,observed_runtime_available:w?.runtime_available??null,observed_draining:w?.draining??null,
    worker_boot_confirmed:boot,worker_accepting_jobs:accept,completed_at:terminal?timestamp:null,reason_code:reason};
}
export const createHermesWakeConfirmationSummary=(r:HermesWakeConfirmationRecord)=>{const{safety:_s,...summary}=r;return summary};
