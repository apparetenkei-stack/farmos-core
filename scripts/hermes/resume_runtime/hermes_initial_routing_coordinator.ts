import { createHermesRoutingDecisionSummary, createHermesRoutingRequirement, routeHermesJob } from "../router_runtime/hermes_model_router";
import type { HermesRoutingTaskClass, HermesRoutingWorkerSummary } from "../router_runtime/hermes_model_router_contract";
import { parseHermesResumeQueuedJob, parseHermesCanonicalRoutingDecision } from "./hermes_routing_resume_policy";
import { createHermesRoutingResumeKeys } from "./hermes_routing_resume_store";
import type { HermesCanonicalRoutingContext } from "./hermes_canonical_routing_decision_store";

const fail=(error_code:string)=>({ok:false as const,error_code,write_performed:false,fail_closed:true as const});
export async function createCanonicalHermesInitialRouting(input:{jobId:string;taskClass:HermesRoutingTaskClass;workers:HermesRoutingWorkerSummary[];context:HermesCanonicalRoutingContext;decisionIdFactory?:()=>string}){
  if(!input.context.enabled)return fail("routing_resume_disabled");let store;
  try{
    store=await input.context.storeFactory();const keys=input.context.keys??createHermesRoutingResumeKeys();
    const jobRaw=await store.get(keys.job(input.jobId));if(!jobRaw)return fail("routing_resume_job_not_found");
    const job=parseHermesResumeQueuedJob(jobRaw);if(!job||job.job.runtime.job_id!==input.jobId)return fail("routing_resume_job_invalid");
    const now=(input.context.nowIsoFactory??(()=>new Date().toISOString()))(),nowMs=Date.parse(now),jobExpiry=Date.parse(job.job.runtime.expires_at);if(nowMs>=jobExpiry)return fail("routing_resume_job_expired");
    const requirement=createHermesRoutingRequirement({taskClass:input.taskClass});
    const decision=routeHermesJob({requirement,workers:input.workers,nowIso:now,decisionIdFactory:input.decisionIdFactory});
    if(decision.status!=="no_ready_worker")return fail("routing_resume_original_status_not_allowed");
    const record={schema_version:"hermes.router.decision.record.v1" as const,job_id:input.jobId,request_id:job.job.runtime.request_id,expires_at:job.job.runtime.expires_at,decision};
    const atomic=await store.persistAtomic({jobKey:keys.job(input.jobId),recordKey:keys.routingDecision(input.jobId),decisionIdKey:keys.routingDecisionId(decision.decision_id),decisionIdKeyPrefix:`${keys.prefix}:routing-decision-id:`,jobId:record.job_id,requestId:record.request_id,decisionId:decision.decision_id,serialized:JSON.stringify(record),expiresAtMs:jobExpiry,jobExpiresAt:job.job.runtime.expires_at});
    if(!["created","already_exists"].includes(atomic.status))return fail(atomic.status);
    const canonical=atomic.record?parseHermesCanonicalRoutingDecision(atomic.record):null;if(!canonical)return fail("routing_resume_record_invalid");
    return{ok:true as const,status:atomic.status as "created"|"already_exists",record:canonical,decision:createHermesRoutingDecisionSummary(canonical.decision),write_performed:atomic.status==="created"};
  }catch{return fail("routing_resume_store_unavailable")}finally{await store?.disconnect().catch(()=>undefined)}
}
