import{createClient,type RedisClientType}from"redis";import type{HermesRedisClientConfig}from"../queue_runtime/hermes_redis_client";import{assertHermesWorkerId}from"../worker_runtime/hermes_worker_protocol";import type{HermesWakeConfirmationKeys}from"./hermes_wake_confirmation_contract";
const safe=(v:string)=>{if(!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(v))throw new Error("confirmation_key_invalid");return v};
export function createHermesWakeConfirmationKeys(prefix="farmos:hermes"):HermesWakeConfirmationKeys{if(!/^[0-9a-z:-]+$/iu.test(prefix))throw new Error("confirmation_prefix_invalid");return{prefix,request:id=>`${prefix}:wake-request:${safe(id)}`,execution:id=>`${prefix}:wake-execution:${safe(id)}`,worker:id=>{assertHermesWorkerId(id);return`${prefix}:worker:${id}`},confirmation:id=>`${prefix}:wake-confirmation:${safe(id)}`,confirmationId:id=>`${prefix}:wake-confirmation-id:${safe(id)}`}}
export type HermesWakeConfirmationStore={get:(key:string)=>Promise<string|null>;getExpiryTime:(key:string)=>Promise<number>;createAtomic:(i:{requestKey:string;executionKey:string;confirmationKey:string;newConfirmationIdKey:string;confirmationIdKeyPrefix:string;newConfirmationId:string;wakeRequestId:string;executionId:string;targetWorkerId:string;serialized:string;expiresAtMs:number})=>Promise<{status:string;record:string|null}>;updateAtomic:(i:{confirmationKey:string;confirmationId:string;wakeRequestId:string;executionId:string;targetWorkerId:string;serialized:string})=>Promise<{status:string;record:string|null}>;deleteKeys:(keys:string[])=>Promise<void>;disconnect:()=>Promise<void>};
export type HermesWakeConfirmationContext={enabled:boolean;storeFactory:()=>Promise<HermesWakeConfirmationStore>;keys?:HermesWakeConfirmationKeys;nowIsoFactory?:()=>string};
const CREATE=`
local rj=redis.call('GET',KEYS[1])
local ej=redis.call('GET',KEYS[2])
if not rj then return {'confirmation_request_invalid',''} end
if not ej then return {'confirmation_execution_invalid',''} end
local rok,r=pcall(cjson.decode,rj)
local eok,e=pcall(cjson.decode,ej)
local nok,n=pcall(cjson.decode,ARGV[1])
if not rok or r['schema_version']~='hermes.worker.wake.request.v1' or r['status']~='acknowledged' or r['worker_type']~='rtx' or r['wake_request_id']~=ARGV[2] then return {'confirmation_request_invalid',''} end
if not eok or e['schema_version']~='hermes.wake.execution.v1' or e['status']~='sent' or tonumber(e['bytes_sent'])~=102 or e['wake_request_id']~=ARGV[2] or e['execution_id']~=ARGV[3] or type(e['completed_at'])~='string' then return {'confirmation_execution_invalid',''} end
if r['target_worker_id']~=e['target_worker_id'] or r['target_worker_id']~=ARGV[4] then return {'confirmation_target_mismatch',''} end
if r['routing_decision_id']~=e['routing_decision_id'] then return {'confirmation_routing_mismatch',''} end
if not nok or n['schema_version']~='hermes.wake.confirmation.v1' or n['wake_request_id']~=ARGV[2] or n['execution_id']~=ARGV[3] or n['target_worker_id']~=ARGV[4] then return {'confirmation_record_invalid',''} end
local existing=redis.call('GET',KEYS[3])
if existing then
  local cok,c=pcall(cjson.decode,existing)
  if not cok or c['schema_version']~='hermes.wake.confirmation.v1' or type(c['confirmation_id'])~='string' then return {'confirmation_record_invalid',''} end
  if c['wake_request_id']~=r['wake_request_id'] or c['execution_id']~=e['execution_id'] or c['target_worker_id']~=r['target_worker_id'] or c['target_worker_id']~=e['target_worker_id'] or c['required_capability']~=r['required_capability'] or c['execution_completed_at']~=e['completed_at'] or c['deadline_at']~=n['deadline_at'] then return {'confirmation_conflict',''} end
  local canonical_id_key=ARGV[7]..c['confirmation_id']
  local id_value=redis.call('GET',canonical_id_key)
  if not id_value or id_value~=c['wake_request_id'] then return {'confirmation_record_invalid',''} end
  return {'already_exists',existing}
end
if n['confirmation_id']~=ARGV[6] or KEYS[4]~=ARGV[7]..ARGV[6] or redis.call('EXISTS',KEYS[4])~=0 then return {'confirmation_record_invalid',''} end
redis.call('SET',KEYS[3],ARGV[1],'PXAT',ARGV[5])
redis.call('SET',KEYS[4],ARGV[2],'PXAT',ARGV[5])
return {'created',ARGV[1]}`;
const UPDATE=`
local existing=redis.call('GET',KEYS[1])
if not existing then return {'confirmation_record_invalid',''} end
local eok,e=pcall(cjson.decode,existing)
local nok,n=pcall(cjson.decode,ARGV[1])
if not eok or not nok or
  e['schema_version']~='hermes.wake.confirmation.v1' or
  n['schema_version']~='hermes.wake.confirmation.v1' or
  e['confirmation_id']~=ARGV[2] or e['wake_request_id']~=ARGV[3] or
  e['execution_id']~=ARGV[4] or e['target_worker_id']~=ARGV[5] or
  n['confirmation_id']~=ARGV[2] or n['wake_request_id']~=ARGV[3] or
  n['execution_id']~=ARGV[4] or n['target_worker_id']~=ARGV[5]
then return {'confirmation_record_invalid',''} end
local terminal={worker_ready=true,worker_unhealthy=true,worker_draining=true,capability_unavailable=true,timed_out=true}
if terminal[e['status']] then return {'terminal_unchanged',existing} end
local status={waiting_for_heartbeat=true,worker_not_ready=true,runtime_unavailable=true,worker_ready=true,worker_unhealthy=true,worker_draining=true,capability_unavailable=true,timed_out=true}
local reason={confirmation_waiting_for_worker=true,confirmation_heartbeat_missing=true,confirmation_heartbeat_precedes_execution=true,confirmation_heartbeat_stale=true,confirmation_worker_unhealthy=true,confirmation_worker_draining=true,confirmation_capability_unavailable=true,confirmation_worker_not_ready=true,confirmation_runtime_unavailable=true,confirmation_worker_ready=true,confirmation_worker_ready_capacity_full=true,confirmation_timed_out=true}
if not status[n['status']] or not reason[n['reason_code']] then return {'confirmation_record_invalid',''} end
if n['started_at']~=e['started_at'] or n['deadline_at']~=e['deadline_at'] or n['execution_completed_at']~=e['execution_completed_at'] then return {'confirmation_record_invalid',''} end
if type(n['updated_at'])~='string' or type(e['updated_at'])~='string' or n['updated_at']<e['updated_at'] then return {'confirmation_record_invalid',''} end
if n['worker_accepting_jobs']==true and n['worker_boot_confirmed']~=true then return {'confirmation_record_invalid',''} end
redis.call('SET',KEYS[1],ARGV[1],'KEEPTTL')
return {'updated',ARGV[1]}`;
const timeout=<T>(p:Promise<T>,ms:number)=>new Promise<T>((resolve,reject)=>{const t=setTimeout(()=>reject(new Error("confirmation_store_timeout")),ms);p.then(v=>{clearTimeout(t);resolve(v)},e=>{clearTimeout(t);reject(e)})});
export async function createHermesWakeConfirmationStore(config:HermesRedisClientConfig):Promise<HermesWakeConfirmationStore>{const client:RedisClientType=createClient({url:config.url,socket:{connectTimeout:config.connectTimeoutMs}});client.on("error",()=>undefined);await timeout(client.connect(),config.connectTimeoutMs);const cmd=<T>(p:Promise<T>)=>timeout(p,config.commandTimeoutMs);return{get:k=>cmd(client.get(k)),getExpiryTime:k=>cmd(client.pExpireTime(k)),async createAtomic(i){const x=await cmd(client.eval(CREATE,{keys:[i.requestKey,i.executionKey,i.confirmationKey,i.newConfirmationIdKey],arguments:[i.serialized,i.wakeRequestId,i.executionId,i.targetWorkerId,String(i.expiresAtMs),i.newConfirmationId,i.confirmationIdKeyPrefix]}))as unknown[];return{status:String(x[0]),record:String(x[1]??"")||null}},async updateAtomic(i){const x=await cmd(client.eval(UPDATE,{keys:[i.confirmationKey],arguments:[i.serialized,i.confirmationId,i.wakeRequestId,i.executionId,i.targetWorkerId]}))as unknown[];return{status:String(x[0]),record:String(x[1]??"")||null}},async deleteKeys(keys){if(keys.length)await cmd(client.del(keys))},async disconnect(){if(client.isOpen)await client.quit()}}}
