import { randomUUID } from "node:crypto";
import { createHermesJobPayload, type HermesJobEnvelope } from "../job_runtime/hermes_job_envelope";
import type { HermesQueuedJobRecord } from "../queue_runtime/hermes_redis_queue_contract";
import { createHermesRoutingDecisionSummary, createHermesRoutingRequirement } from "../router_runtime/hermes_model_router";
import type { HermesRoutingDecision, HermesRoutingTaskClass } from "../router_runtime/hermes_model_router_contract";
import type { HermesWakeConfirmationRecord } from "../confirmation_runtime/hermes_wake_confirmation_contract";
import type { HermesWorkerWakeRequest } from "../startup_runtime/hermes_worker_startup_contract";
import type { HermesWakeExecutionRecord } from "../wake_runtime/hermes_wake_execution_contract";
import type { HermesCanonicalRoutingDecisionRecord, HermesRoutingResumePolicy, HermesRoutingResumeRecord, HermesRoutingResumeRequirement, HermesRoutingResumeSafety } from "./hermes_routing_resume_contract";

export const HERMES_ROUTING_RESUME_POLICY: HermesRoutingResumePolicy = {
  schema_version: "hermes.routing.resume.policy.v1", allowed_original_routing_status: "no_ready_worker",
  required_confirmation_status: "worker_ready", require_worker_boot_confirmed: true,
  require_worker_accepting_jobs: true, require_current_worker_revalidation: true,
  maximum_resume_count_per_job: 1, resume_ttl_ms: 60000, source: "server_policy",
  safety: { client_worker_override_allowed: false, automatic_queue_write_allowed: false,
    automatic_worker_claim_allowed: false, automatic_model_execution_allowed: false,
    automatic_fallback_override_allowed: false, db_write_allowed: false, fail_closed: true },
};
export const HERMES_ROUTING_RESUME_SAFETY: HermesRoutingResumeSafety = {
  queue_write_performed: false, worker_claim_performed: false, model_execution_performed: false,
  remote_connection_performed: false, db_write_performed: false, fail_closed: true,
};
const ID=/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu;
const HEAVY=["heavy_reasoning","large_context","gpu_inference"] as const;
const iso=(v:unknown):v is string=>typeof v==="string"&&Number.isFinite(Date.parse(v))&&new Date(Date.parse(v)).toISOString()===v;
const id=(v:unknown):v is string=>typeof v==="string"&&ID.test(v);

export function parseHermesResumeQueuedJob(value:string):HermesQueuedJobRecord|null {
  try { const r=JSON.parse(value) as HermesQueuedJobRecord, j=r?.job as HermesJobEnvelope;
    if(r?.schema_version!=="hermes.queue.v1"||j?.schema_version!=="hermes.job.v1"||j.job_type!=="hermes_chat"||!id(j.runtime?.job_id)||!id(j.runtime?.request_id)||
      j.runtime.task_type!=="interactive_chat"||j.runtime.execution_mode!=="queued"||j.runtime.execution_target!=="unassigned"||!iso(j.runtime.created_at)||!iso(j.runtime.updated_at)||!iso(j.runtime.expires_at)||
      !(["queued","running","succeeded","failed","retry_scheduled","cancelled","expired"] as unknown[]).includes(j.runtime.status)||
      r.queue?.status!=="queued"||!Number.isInteger(r.queue.retry_count)||!Number.isInteger(r.queue.max_retry_count)||!iso(r.queue.enqueued_at)||
      j.safety?.business_db_write_allowed!==false||j.safety.proposal_write_allowed!==false||j.safety.fail_closed!==true||r.safety?.db_write_performed!==false||r.safety.fail_closed!==true)return null;
    const payload=createHermesJobPayload(j.payload);if(payload.message!==j.payload.message||payload.include_readonly_context!==j.payload.include_readonly_context)return null;return r;
  } catch{return null}
}

export function parseHermesCanonicalRoutingDecision(value:string):HermesCanonicalRoutingDecisionRecord|null {
  try {const r=JSON.parse(value) as HermesCanonicalRoutingDecisionRecord,d=r?.decision;if(r?.schema_version!=="hermes.router.decision.record.v1"||!id(r.job_id)||!id(r.request_id)||!iso(r.expires_at)||
    d?.schema_version!=="hermes.router.decision.v1"||!id(d.decision_id)||!iso(d.decided_at)||d.status!=="no_ready_worker"||d.selected_worker!==null||d.fallback_used!==false||
    !Number.isInteger(d.considered_worker_count)||d.considered_worker_count<0||!Number.isInteger(d.eligible_worker_count)||d.eligible_worker_count<0||
    !HEAVY.includes(d.requirement?.task_class as typeof HEAVY[number])||d.requirement.required_capability!==d.requirement.task_class||d.requirement.preferred_worker_type!=="rtx"||d.requirement.allow_fallback!==false||
    d.safety?.worker_claim_performed!==false||d.safety.queue_write_performed!==false||d.safety.model_execution_performed!==false||d.safety.db_write_performed!==false||d.safety.fail_closed!==true)return null;
    const canonical=createHermesRoutingRequirement({taskClass:d.requirement.task_class as HermesRoutingTaskClass,priority:d.requirement.priority});
    if(JSON.stringify(canonical)!==JSON.stringify(d.requirement))return null;return r;
  }catch{return null}
}

export function createHermesRoutingResumeRequirement(input:{job:HermesQueuedJobRecord;routing:HermesCanonicalRoutingDecisionRecord;request:HermesWorkerWakeRequest;execution:HermesWakeExecutionRecord;confirmation:HermesWakeConfirmationRecord;nowIso:string;relatedExpiryMs:number;resumeIdFactory?:()=>string}):HermesRoutingResumeRequirement {
  const now=Date.parse(input.nowIso),jobExpiry=Date.parse(input.job.job.runtime.expires_at),expires=Math.min(now+HERMES_ROUTING_RESUME_POLICY.resume_ttl_ms,jobExpiry,Date.parse(input.routing.expires_at),Date.parse(input.request.expires_at),input.relatedExpiryMs);
  if(!Number.isFinite(now)||!Number.isFinite(expires)||expires<=now)throw new Error("routing_resume_expired");const resumeId=(input.resumeIdFactory??randomUUID)();if(!id(resumeId))throw new Error("routing_resume_record_invalid");
  return{schema_version:"hermes.routing.resume.requirement.v1",resume_id:resumeId,job_id:input.job.job.runtime.job_id,request_id:input.job.job.runtime.request_id,
    original_routing_decision_id:input.routing.decision.decision_id,wake_request_id:input.request.wake_request_id,wake_execution_id:input.execution.execution_id,
    wake_confirmation_id:input.confirmation.confirmation_id,target_worker_id:input.confirmation.target_worker_id,required_capability:input.confirmation.required_capability,
    created_at:new Date(now).toISOString(),expires_at:new Date(expires).toISOString(),source:"server_policy",safety:HERMES_ROUTING_RESUME_SAFETY};
}

export function createHermesRoutingResumeRecord(input:{requirement:HermesRoutingResumeRequirement;decision:HermesRoutingDecision}):HermesRoutingResumeRecord {
  const r=input.requirement;return{schema_version:"hermes.routing.resume.v1",resume_id:r.resume_id,job_id:r.job_id,request_id:r.request_id,
    original_routing_decision_id:r.original_routing_decision_id,resumed_routing_decision_id:input.decision.decision_id,wake_request_id:r.wake_request_id,
    resumed_routing_decision:createHermesRoutingDecisionSummary(input.decision),
    wake_execution_id:r.wake_execution_id,wake_confirmation_id:r.wake_confirmation_id,target_worker_id:r.target_worker_id,selected_worker_id:r.target_worker_id,
    required_capability:r.required_capability,status:"selected",reason_code:"routing_resume_selected",created_at:r.created_at,completed_at:r.created_at,expires_at:r.expires_at,
    worker_boot_confirmed:true,worker_accepting_jobs:true,queue_write_performed:false,worker_claim_performed:false,model_execution_performed:false,
    safety:{network_target_stored:false,credentials_stored:false,remote_connection_performed:false,db_write_performed:false,fail_closed:true}};
}

export function parseHermesRoutingResumeRecord(value:string):HermesRoutingResumeRecord|null {try{const r=JSON.parse(value) as HermesRoutingResumeRecord;if(r?.schema_version!=="hermes.routing.resume.v1"||![r.resume_id,r.job_id,r.request_id,r.original_routing_decision_id,r.resumed_routing_decision_id,r.wake_request_id,r.wake_execution_id,r.wake_confirmation_id,r.target_worker_id,r.selected_worker_id].every(id)||
  !HEAVY.includes(r.required_capability)||r.status!=="selected"||r.reason_code!=="routing_resume_selected"||!iso(r.created_at)||!iso(r.completed_at)||!iso(r.expires_at)||r.completed_at!==r.created_at||Date.parse(r.expires_at)<=Date.parse(r.created_at)||
  r.target_worker_id!==r.selected_worker_id||r.worker_boot_confirmed!==true||r.worker_accepting_jobs!==true||r.queue_write_performed!==false||r.worker_claim_performed!==false||r.model_execution_performed!==false||
  r.safety?.network_target_stored!==false||r.safety.credentials_stored!==false||r.safety.remote_connection_performed!==false||r.safety.db_write_performed!==false||r.safety.fail_closed!==true)return null;
  const d=r.resumed_routing_decision;if(!d||d.decision_id!==r.resumed_routing_decision_id||d.status!=="selected"||d.selected_worker?.worker_id!==r.target_worker_id||d.task_class!==r.required_capability||d.required_capability!==r.required_capability||d.fallback_used!==false||!iso(d.decided_at)||!Number.isInteger(d.considered_worker_count)||!Number.isInteger(d.eligible_worker_count))return null;return r}catch{return null}}

export const createHermesRoutingResumeSummary=(r:HermesRoutingResumeRecord)=>{const{safety:_s,...summary}=r;return summary};
