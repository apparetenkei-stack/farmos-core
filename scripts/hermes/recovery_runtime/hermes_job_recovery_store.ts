import { createClient, type RedisClientType } from "redis";
import type { HermesRedisClientConfig } from "../queue_runtime/hermes_redis_client";
import type { HermesQueuedJobRecord } from "../queue_runtime/hermes_redis_queue_contract";
import type { HermesWorkerJobClaim } from "../worker_runtime/hermes_worker_protocol";
import {
  type HermesCancellationRequest, type HermesRecoveryKeys,
  type HermesRecoveryResult, type HermesRetrySchedule,
} from "./hermes_job_recovery_contract";
import {
  createHermesCancellationRequest, createHermesRetrySchedule,
  evaluateHermesRetryEligibility,
} from "./hermes_job_recovery_policy";

export type HermesRecoveryAtomicStatus =
  | "retry_scheduled" | "cancelled" | "already_cancelled"
  | "job_record_missing" | "job_record_invalid" | "claim_record_invalid"
  | "worker_record_missing" | "worker_record_invalid" | "retry_job_status_not_allowed"
  | "retry_error_not_allowed" | "retry_duplicate" | "retry_limit_reached" | "retry_job_expired" | "retry_window_unavailable"
  | "cancel_not_allowed" | "cancel_conflict" | "cancel_record_invalid" | "atomic_transition_failed";

export type HermesCancelAtomicResult = {
  status: HermesRecoveryAtomicStatus;
  serializedJob: string | null;
  serializedCancellation: string | null;
};

export type HermesJobRecoveryStore = {
  get: (key: string) => Promise<string | null>;
  getList: (key: string) => Promise<string[]>;
  getPttl: (key: string) => Promise<number>;
  retryAtomic: (input: AtomicCommon & { retryKey: string; serializedSchedule: string; expectedRetryCount: number; retryNotBeforeEpochMs: number }) => Promise<{ status: HermesRecoveryAtomicStatus; serializedJob: string | null }>;
  cancelAtomic: (input: AtomicCommon & { cancelKey: string; retryKeys: readonly string[]; serializedCancellation: string; cancellationId: string }) => Promise<HermesCancelAtomicResult>;
  deleteKeys: (keys: string[]) => Promise<void>;
  disconnect: () => Promise<void>;
};

type AtomicCommon = {
  jobKey: string; claimKey: string; workerKey: string; pendingKey: string;
  processingKey: string; deadLetterKey: string; jobId: string;
  expectedWorkerId: string; expectedClaimId: string; nowIso: string;
};

export type HermesRecoveryContext = {
  enabled: boolean;
  storeFactory: () => Promise<HermesJobRecoveryStore>;
  keys?: HermesRecoveryKeys;
  nowIsoFactory?: () => string;
};

function safeId(value: string, code: string): void {
  if (!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(value)) throw new Error(code);
}

export function createHermesRecoveryKeys(prefix = "farmos:hermes"): HermesRecoveryKeys {
  if (!/^[0-9a-z:-]+$/iu.test(prefix)) throw new Error("recovery_prefix_invalid");
  return { prefix, pending: `${prefix}:queue:pending`, processing: `${prefix}:queue:processing`,
    deadLetter: `${prefix}:queue:dead-letter`,
    job: (id) => { safeId(id, "recovery_job_id_invalid"); return `${prefix}:job:${id}`; },
    claim: (id) => { safeId(id, "recovery_job_id_invalid"); return `${prefix}:claim:${id}`; },
    worker: (id) => { safeId(id, "recovery_worker_id_invalid"); return `${prefix}:worker:${id}`; },
    retry: (id, count) => { safeId(id, "recovery_job_id_invalid"); if (!Number.isInteger(count) || count < 1) throw new Error("recovery_retry_count_invalid"); return `${prefix}:retry:${id}:${count}`; },
    cancel: (id) => { safeId(id, "recovery_job_id_invalid"); return `${prefix}:cancel:${id}`; } };
}

function failure(errorCode: string): HermesRecoveryResult {
  return { ok: false, status: errorCode === "recovery_disabled" ? "disabled" : errorCode === "recovery_store_unavailable" ? "not_ready" : "failed",
    error_code: errorCode, recovery_write_performed: false, fail_closed: true };
}

function parseJob(value: string): HermesQueuedJobRecord | null {
  try { const job = JSON.parse(value) as HermesQueuedJobRecord;
    return job?.schema_version === "hermes.queue.v1" && job.job?.schema_version === "hermes.job.v1" ? job : null;
  } catch { return null; }
}

function parseClaim(value: string | null, jobId: string): { claim: HermesWorkerJobClaim | null; workerId: string | null } | null {
  if (value === null) return { claim: null, workerId: null };
  try { const claim = JSON.parse(value) as HermesWorkerJobClaim;
    if (claim?.schema_version !== "hermes.worker.claim.v1" || claim.job_id !== jobId || typeof claim.worker_id !== "string" || typeof claim.claim_id !== "string") return null;
    safeId(claim.worker_id, "claim_record_invalid"); return { claim, workerId: claim.worker_id };
  } catch { return null; }
}

function parseCanonicalCancellation(value: string, job: HermesQueuedJobRecord): HermesCancellationRequest | null {
  try {
    const cancellation = JSON.parse(value) as HermesCancellationRequest;
    const requestedAtMs = Date.parse(cancellation?.requested_at);
    if (cancellation?.schema_version !== "hermes.cancel.request.v1" ||
      cancellation.job_id !== job.job.runtime.job_id || cancellation.request_id !== job.job.runtime.request_id ||
      cancellation.requested_by !== "user" || cancellation.reason_code !== "user_requested" ||
      typeof cancellation.cancellation_id !== "string" || !/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(cancellation.cancellation_id) ||
      !Number.isFinite(requestedAtMs) || new Date(requestedAtMs).toISOString() !== cancellation.requested_at ||
      cancellation.safety?.model_interrupt_performed !== false || cancellation.safety.worker_signal_sent !== false ||
      cancellation.safety.db_write_performed !== false || cancellation.safety.fail_closed !== true) return null;
    return cancellation;
  } catch { return null; }
}

async function useStore<T>(context: HermesRecoveryContext, operation: (store: HermesJobRecoveryStore, keys: HermesRecoveryKeys) => Promise<T>): Promise<T> {
  const store = await context.storeFactory();
  try { return await operation(store, context.keys ?? createHermesRecoveryKeys()); }
  finally { await store.disconnect().catch(() => undefined); }
}

export async function scheduleHermesJobRetry(input: { jobId: string; errorCode: string; context: HermesRecoveryContext; retryIdFactory?: () => string }): Promise<HermesRecoveryResult> {
  if (!input.context.enabled) return failure("recovery_disabled");
  const now = (input.context.nowIsoFactory ?? (() => new Date().toISOString()))();
  try { return await useStore(input.context, async (store, keys) => {
    const serialized = await store.get(keys.job(input.jobId));
    if (serialized === null) return failure("job_record_missing");
    const job = parseJob(serialized); if (!job) return failure("job_record_invalid");
    const eligibility = evaluateHermesRetryEligibility({ job, errorCode: input.errorCode, nowIso: now,
      retryAlreadyRegistered: (await store.get(keys.retry(input.jobId, job.queue.retry_count + 1))) !== null });
    if (!eligibility.retryable || eligibility.retry_delay_ms === null) return failure(eligibility.reason_code);
    const claimInfo = parseClaim(await store.get(keys.claim(input.jobId)), input.jobId);
    if (!claimInfo) return failure("claim_record_invalid");
    const schedule = createHermesRetrySchedule({ job, errorCode: input.errorCode, nowIso: now,
      previousClaimId: claimInfo.claim?.claim_id ?? null, retryIdFactory: input.retryIdFactory });
    const atomic = await store.retryAtomic({ jobKey: keys.job(input.jobId), retryKey: keys.retry(input.jobId, schedule.retry_count),
      claimKey: keys.claim(input.jobId), workerKey: claimInfo.workerId ? keys.worker(claimInfo.workerId) : keys.worker("unclaimed"),
      pendingKey: keys.pending, processingKey: keys.processing, deadLetterKey: keys.deadLetter,
      jobId: input.jobId, expectedWorkerId: claimInfo.workerId ?? "", expectedClaimId: claimInfo.claim?.claim_id ?? "", nowIso: now,
      serializedSchedule: JSON.stringify(schedule), expectedRetryCount: job.queue.retry_count,
      retryNotBeforeEpochMs: Date.parse(schedule.retry_not_before) });
    if (atomic.status !== "retry_scheduled" || atomic.serializedJob === null) return failure(atomic.status);
    const updated = parseJob(atomic.serializedJob); if (!updated) return failure("atomic_transition_failed");
    return { ok: true, status: "retry_scheduled", schedule, job: updated };
  }); } catch { return failure("recovery_store_unavailable"); }
}

export async function cancelHermesJob(input: { jobId: string; requestId: string; context: HermesRecoveryContext; cancellationIdFactory?: () => string }): Promise<HermesRecoveryResult> {
  if (!input.context.enabled) return failure("recovery_disabled");
  const now = (input.context.nowIsoFactory ?? (() => new Date().toISOString()))();
  try { return await useStore(input.context, async (store, keys) => {
    const serialized = await store.get(keys.job(input.jobId));
    if (serialized === null) return failure("job_record_missing");
    const job = parseJob(serialized); if (!job || job.job.runtime.request_id !== input.requestId) return failure("job_record_invalid");
    const claimInfo = parseClaim(await store.get(keys.claim(input.jobId)), input.jobId);
    if (!claimInfo) return failure("claim_record_invalid");
    const cancellation = createHermesCancellationRequest({ jobId: input.jobId, requestId: input.requestId,
      requestedAtIso: now, cancellationIdFactory: input.cancellationIdFactory });
    const atomic = await store.cancelAtomic({ jobKey: keys.job(input.jobId), cancelKey: keys.cancel(input.jobId),
      retryKeys: job.job.runtime.status === "retry_scheduled" && job.queue.retry_count > 0
        ? [keys.retry(input.jobId, job.queue.retry_count)] : [],
      claimKey: keys.claim(input.jobId), workerKey: claimInfo.workerId ? keys.worker(claimInfo.workerId) : keys.worker("unclaimed"),
      pendingKey: keys.pending, processingKey: keys.processing, deadLetterKey: keys.deadLetter,
      jobId: input.jobId, expectedWorkerId: claimInfo.workerId ?? "", expectedClaimId: claimInfo.claim?.claim_id ?? "", nowIso: now,
      serializedCancellation: JSON.stringify(cancellation), cancellationId: cancellation.cancellation_id });
    if (!(["cancelled", "already_cancelled"] as string[]).includes(atomic.status)) return failure(atomic.status);
    if (atomic.serializedJob === null || atomic.serializedCancellation === null) return failure("cancel_record_invalid");
    const updated = parseJob(atomic.serializedJob); if (!updated) return failure("atomic_transition_failed");
    const canonicalCancellation = parseCanonicalCancellation(atomic.serializedCancellation, updated);
    if (!canonicalCancellation) return failure("cancel_record_invalid");
    return { ok: true, status: atomic.status as "cancelled" | "already_cancelled", cancellation: canonicalCancellation, job: updated };
  }); } catch { return failure("recovery_store_unavailable"); }
}

const RELEASE_LUA = `
local claim_json = redis.call('GET', KEYS[3])
if claim_json then
  local cok, claim = pcall(cjson.decode, claim_json)
  if not cok or claim['schema_version'] ~= 'hermes.worker.claim.v1' or claim['job_id'] ~= ARGV[1] or claim['worker_id'] ~= ARGV[2] or claim['claim_id'] ~= ARGV[4] then return {'claim_record_invalid', ''} end
  local worker_json = redis.call('GET', KEYS[4])
  if not worker_json then return {'worker_record_missing', ''} end
  local wok, worker_record = pcall(cjson.decode, worker_json)
  if not wok or worker_record['schema_version'] ~= 'hermes.worker.registry.v1' or not worker_record['worker'] or worker_record['worker']['worker_id'] ~= ARGV[2] then return {'worker_record_invalid', ''} end
  local worker = worker_record['worker']
  if worker['current_job_id'] == ARGV[1] then
    worker['current_job_id'] = cjson.null
    local active = tonumber(worker['active_job_count'])
    if not active or active < 0 then return {'worker_record_invalid', ''} end
    if active > 0 then worker['active_job_count'] = active - 1 end
    worker_record['registry']['last_updated_at'] = ARGV[3]
    worker_record['safety']['redis_write_performed'] = true
    redis.call('SET', KEYS[4], cjson.encode(worker_record), 'KEEPTTL')
  end
  redis.call('DEL', KEYS[3])
elseif ARGV[4] ~= '' then
  return {'claim_record_invalid', ''}
end
`;

const RETRY_LUA = `
local job_json = redis.call('GET', KEYS[1])
if not job_json then return {'job_record_missing', ''} end
local ok, record = pcall(cjson.decode, job_json)
if not ok or record['schema_version'] ~= 'hermes.queue.v1' or not record['job'] or record['job']['schema_version'] ~= 'hermes.job.v1' or not record['queue'] then return {'job_record_invalid', ''} end
if redis.call('EXISTS', KEYS[2]) == 1 then return {'retry_duplicate', ''} end
local count = tonumber(record['queue']['retry_count'])
local maximum = tonumber(record['queue']['max_retry_count'])
if not count or not maximum or count ~= tonumber(ARGV[5]) then return {'atomic_transition_failed', ''} end
if count >= maximum then return {'retry_limit_reached', ''} end
local status = record['job']['runtime']['status']
if status ~= 'running' and status ~= 'failed' then return {'retry_job_status_not_allowed', ''} end
local retryable = {worker_unavailable=true, worker_offline=true, worker_heartbeat_stale=true, worker_runtime_unavailable=true, worker_timeout=true, model_timeout=true, model_temporarily_unavailable=true, provider_temporarily_unavailable=true, queue_temporarily_unavailable=true, worker_lost_claim=true}
local absolute_expiry = redis.call('PEXPIRETIME', KEYS[1])
if absolute_expiry <= tonumber(ARGV[6]) then return {'retry_job_expired', ''} end
if not retryable[ARGV[8]] then return {'retry_error_not_allowed', ''} end
local sok, schedule = pcall(cjson.decode, ARGV[9])
if not sok or schedule['schema_version'] ~= 'hermes.retry.schedule.v1' or schedule['job_id'] ~= ARGV[1] or schedule['retry_count'] ~= count + 1 or schedule['retry_reason_code'] ~= ARGV[8] then return {'job_record_invalid', ''} end
if absolute_expiry <= tonumber(ARGV[7]) then return {'retry_window_unavailable', ''} end
${RELEASE_LUA}
record['job']['runtime']['status'] = 'retry_scheduled'
record['job']['runtime']['updated_at'] = ARGV[3]
record['queue']['retry_count'] = count + 1
record['queue']['status'] = 'retry_scheduled'
record['queue']['dequeued_at'] = cjson.null
record['queue']['completed_at'] = cjson.null
record['queue']['last_error_code'] = ARGV[8]
local updated = cjson.encode(record)
redis.call('SET', KEYS[1], updated, 'KEEPTTL')
redis.call('SET', KEYS[2], ARGV[9], 'PXAT', absolute_expiry)
redis.call('LREM', KEYS[5], 0, ARGV[1])
redis.call('LREM', KEYS[6], 0, ARGV[1])
redis.call('LREM', KEYS[7], 0, ARGV[1])
return {'retry_scheduled', updated}
`;

const CANCEL_LUA = `
local job_json = redis.call('GET', KEYS[1])
if not job_json then return {'job_record_missing', ''} end
local ok, record = pcall(cjson.decode, job_json)
if not ok or record['schema_version'] ~= 'hermes.queue.v1' or not record['job'] or record['job']['schema_version'] ~= 'hermes.job.v1' or not record['queue'] then return {'job_record_invalid', ''} end
local existing = redis.call('GET', KEYS[2])
if existing then
  local eok, cancel = pcall(cjson.decode, existing)
  if not eok or cancel['schema_version'] ~= 'hermes.cancel.request.v1' then return {'cancel_conflict', ''} end
  local nok, requested = pcall(cjson.decode, ARGV[6])
  if not nok then return {'cancel_conflict', ''} end
  if record['job']['runtime']['status'] == 'cancelled' and cancel['job_id'] == requested['job_id'] and cancel['request_id'] == requested['request_id'] and cancel['requested_by'] == requested['requested_by'] and cancel['reason_code'] == requested['reason_code'] then return {'already_cancelled', job_json, existing} end
  return {'cancel_conflict', ''}
end
local status = record['job']['runtime']['status']
if status ~= 'queued' and status ~= 'running' and status ~= 'retry_scheduled' then return {'cancel_not_allowed', ''} end
local cok, cancellation = pcall(cjson.decode, ARGV[6])
if not cok or cancellation['schema_version'] ~= 'hermes.cancel.request.v1' or cancellation['job_id'] ~= ARGV[1] or cancellation['request_id'] ~= record['job']['runtime']['request_id'] or cancellation['cancellation_id'] ~= ARGV[5] then return {'job_record_invalid', ''} end
local absolute_expiry = redis.call('PEXPIRETIME', KEYS[1])
if absolute_expiry <= 0 then return {'cancel_not_allowed', ''} end
${RELEASE_LUA}
record['job']['runtime']['status'] = 'cancelled'
record['job']['runtime']['updated_at'] = ARGV[3]
record['queue']['status'] = 'cancelled'
record['queue']['completed_at'] = ARGV[3]
record['queue']['last_error_code'] = 'cancelled_by_user'
local updated = cjson.encode(record)
redis.call('SET', KEYS[1], updated, 'KEEPTTL')
redis.call('SET', KEYS[2], ARGV[6], 'PXAT', absolute_expiry)
if status == 'retry_scheduled' then
  for key_index = 8, #KEYS do redis.call('DEL', KEYS[key_index]) end
end
redis.call('LREM', KEYS[5], 0, ARGV[1])
redis.call('LREM', KEYS[6], 0, ARGV[1])
redis.call('LREM', KEYS[7], 0, ARGV[1])
return {'cancelled', updated, ARGV[6]}
`;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("recovery_store_timeout")), timeoutMs);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); }); });
}

export async function createHermesJobRecoveryStore(config: HermesRedisClientConfig): Promise<HermesJobRecoveryStore> {
  const client: RedisClientType = createClient({ url: config.url, socket: { connectTimeout: config.connectTimeoutMs } });
  client.on("error", () => undefined); await withTimeout(client.connect(), config.connectTimeoutMs);
  const command = <T>(p: Promise<T>) => withTimeout(p, config.commandTimeoutMs);
  const evalScript = async (script: string, keys: string[], args: string[]) => {
    const result = await command(client.eval(script, { keys, arguments: args })) as unknown[];
    return { status: String(result[0]) as HermesRecoveryAtomicStatus, serializedJob: String(result[1] ?? "") || null };
  };
  const evalCancelScript = async (keys: string[], args: string[]): Promise<HermesCancelAtomicResult> => {
    const result = await command(client.eval(CANCEL_LUA, { keys, arguments: args })) as unknown[];
    return { status: String(result[0]) as HermesRecoveryAtomicStatus,
      serializedJob: String(result[1] ?? "") || null,
      serializedCancellation: String(result[2] ?? "") || null };
  };
  return { get: (key) => command(client.get(key)), getList: (key) => command(client.lRange(key, 0, -1)), getPttl: (key) => command(client.pTTL(key)),
    retryAtomic: (i) => evalScript(RETRY_LUA, [i.jobKey, i.retryKey, i.claimKey, i.workerKey, i.pendingKey, i.processingKey, i.deadLetterKey],
      [i.jobId, i.expectedWorkerId, i.nowIso, i.expectedClaimId, String(i.expectedRetryCount), String(Date.parse(i.nowIso)), String(i.retryNotBeforeEpochMs), JSON.parse(i.serializedSchedule).retry_reason_code, i.serializedSchedule]),
    cancelAtomic: (i) => evalCancelScript([i.jobKey, i.cancelKey, i.claimKey, i.workerKey, i.pendingKey, i.processingKey, i.deadLetterKey, ...i.retryKeys],
      [i.jobId, i.expectedWorkerId, i.nowIso, i.expectedClaimId, i.cancellationId, i.serializedCancellation]),
    async deleteKeys(keys) { if (keys.length) await command(client.del(keys)); },
    async disconnect() { if (client.isOpen) await client.quit(); } };
}
