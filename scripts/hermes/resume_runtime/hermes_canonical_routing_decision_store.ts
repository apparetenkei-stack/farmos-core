import { createClient, type RedisClientType } from "redis";
import type { HermesRedisClientConfig } from "../queue_runtime/hermes_redis_client";
import type { HermesCanonicalRoutingDecisionRecord } from "./hermes_routing_resume_contract";
import { parseHermesCanonicalRoutingDecision } from "./hermes_routing_resume_policy";
import { createHermesRoutingResumeKeys, type HermesRoutingResumeContext } from "./hermes_routing_resume_store";

export type HermesCanonicalRoutingStore={get:(key:string)=>Promise<string|null>;persistAtomic:(input:{jobKey:string;recordKey:string;decisionIdKey:string;decisionIdKeyPrefix:string;jobId:string;requestId:string;decisionId:string;serialized:string;expiresAtMs:number;jobExpiresAt:string})=>Promise<{status:string;record:string|null}>;disconnect:()=>Promise<void>};
export type HermesCanonicalRoutingContext={enabled:boolean;storeFactory:()=>Promise<HermesCanonicalRoutingStore>;keys?:ReturnType<typeof createHermesRoutingResumeKeys>;nowIsoFactory?:()=>string};

const LUA=`
local function iso(v) if type(v)~='string' then return false end;local y,m,d,h,n,s=string.match(v,'^(%d%d%d%d)%-(%d%d)%-(%d%d)T(%d%d):(%d%d):(%d%d)%.%d%d%dZ$');y=tonumber(y);m=tonumber(m);d=tonumber(d);h=tonumber(h);n=tonumber(n);s=tonumber(s);if not y or m<1 or m>12 or h>23 or n>59 or s>59 then return false end;local days={31,28,31,30,31,30,31,31,30,31,30,31};if m==2 and (y%400==0 or (y%4==0 and y%100~=0)) then days[2]=29 end;return d>=1 and d<=days[m] end
local function integer(v) return type(v)=='number' and v>=0 and v==math.floor(v) end
local function heavy(v) return v=='heavy_reasoning' or v=='large_context' or v=='gpu_inference' end
local function valid_decision(d,expected)
  if type(d)~='table' or d['schema_version']~='hermes.router.decision.v1' or type(d['decision_id'])~='string' or (expected and d['decision_id']~=expected) or d['status']~='no_ready_worker' or d['selected_worker']~=cjson.null or d['fallback_used']~=false or not iso(d['decided_at']) or not integer(d['considered_worker_count']) or not integer(d['eligible_worker_count']) then return false end
  local q=d['requirement'];if type(q)~='table' or not heavy(q['required_capability']) or q['task_class']~=q['required_capability'] or q['preferred_worker_type']~='rtx' or q['allow_fallback']~=false then return false end
  local s=d['safety'];return type(s)=='table' and s['worker_claim_performed']==false and s['queue_write_performed']==false and s['model_execution_performed']==false and s['db_write_performed']==false and s['fail_closed']==true
end
local function valid_record(r,expected)
  return type(r)=='table' and r['schema_version']=='hermes.router.decision.record.v1' and r['job_id']==ARGV[1] and r['request_id']==ARGV[2] and r['expires_at']==ARGV[7] and iso(r['expires_at']) and valid_decision(r['decision'],expected)
end
local jv=redis.call('GET',KEYS[1]);if not jv then return {'routing_resume_job_not_found',''} end
local jok,j=pcall(cjson.decode,jv);local tm=redis.call('TIME');local nowms=tonumber(tm[1])*1000+math.floor(tonumber(tm[2])/1000);local expiry=tonumber(ARGV[5]);local jx=redis.call('PEXPIRETIME',KEYS[1])
if not jok or j['schema_version']~='hermes.queue.v1' or type(j['job'])~='table' or j['job']['schema_version']~='hermes.job.v1' or j['job']['runtime']['job_id']~=ARGV[1] or j['job']['runtime']['request_id']~=ARGV[2] or j['job']['runtime']['status']~='queued' or j['queue']['status']~='queued' or j['job']['runtime']['expires_at']~=ARGV[7] or not iso(j['job']['runtime']['expires_at']) then return {'routing_resume_job_invalid',''} end
if jx==-2 then return {'routing_resume_job_not_found',''} end;if jx==-1 or jx<=nowms or expiry<=nowms or expiry>jx then return {'routing_resume_expired',''} end
local old=redis.call('GET',KEYS[2]);if old then
  local ok,x=pcall(cjson.decode,old);if not ok or not valid_record(x,nil) then return {'routing_resume_record_invalid',''} end
  local ixkey=ARGV[6]..x['decision']['decision_id'];local idv=redis.call('GET',ixkey);local rx=redis.call('PEXPIRETIME',KEYS[2]);local ix=redis.call('PEXPIRETIME',ixkey)
  if not idv or idv~=ARGV[1] or rx==-1 or rx<=nowms or ix==-1 or ix<=nowms or ix~=rx then return {'routing_resume_record_invalid',''} end
  return {'already_exists',old}
end
local rok,r=pcall(cjson.decode,ARGV[4]);if not rok or not valid_record(r,ARGV[3]) then return {'routing_resume_original_decision_invalid',''} end
if redis.call('EXISTS',KEYS[3])~=0 then return {'routing_resume_conflict',''} end
redis.call('SET',KEYS[2],ARGV[4],'PXAT',ARGV[5]);redis.call('SET',KEYS[3],ARGV[1],'PXAT',ARGV[5]);return {'created',ARGV[4]}`;
const timeout=<T>(p:Promise<T>,ms:number)=>new Promise<T>((resolve,reject)=>{const t=setTimeout(()=>reject(new Error("routing_binding_store_timeout")),ms);p.then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)})});
export async function createHermesCanonicalRoutingStore(config:HermesRedisClientConfig):Promise<HermesCanonicalRoutingStore>{const client:RedisClientType=createClient({url:config.url,socket:{connectTimeout:config.connectTimeoutMs}});client.on("error",()=>undefined);await timeout(client.connect(),config.connectTimeoutMs);const cmd=<T>(p:Promise<T>)=>timeout(p,config.commandTimeoutMs);return{get:k=>cmd(client.get(k)),async persistAtomic(i){const x=await cmd(client.eval(LUA,{keys:[i.jobKey,i.recordKey,i.decisionIdKey],arguments:[i.jobId,i.requestId,i.decisionId,i.serialized,String(i.expiresAtMs),i.decisionIdKeyPrefix,i.jobExpiresAt]}))as unknown[];return{status:String(x[0]),record:String(x[1]??"")||null}},async disconnect(){if(client.isOpen)await client.quit()}}}
export function parseCanonicalRoutingAtomic(record:string|null):HermesCanonicalRoutingDecisionRecord|null{return record?parseHermesCanonicalRoutingDecision(record):null}
export const toResumeContext=(context:HermesCanonicalRoutingContext,storeFactory:HermesRoutingResumeContext["storeFactory"]):HermesRoutingResumeContext=>({enabled:context.enabled,keys:context.keys,nowIsoFactory:context.nowIsoFactory,storeFactory});
