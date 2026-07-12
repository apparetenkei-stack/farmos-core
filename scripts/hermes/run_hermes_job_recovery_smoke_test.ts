import { randomUUID } from "node:crypto";
import { createHermesJobEnvelope, transitionHermesJobEnvelope } from "./job_runtime/hermes_job_envelope";
import type { HermesQueuedJobRecord } from "./queue_runtime/hermes_redis_queue_contract";
import { createHermesRedisQueueStore, readHermesRedisClientConfig } from "./queue_runtime/hermes_redis_client";
import { createHermesRedisQueueKeys } from "./queue_runtime/hermes_redis_queue_contract";
import { dequeueHermesJob, enqueueHermesJob } from "./queue_runtime/hermes_redis_queue";
import { cancelHermesJob, createHermesJobRecoveryStore, createHermesRecoveryKeys, scheduleHermesJobRetry } from "./recovery_runtime/hermes_job_recovery_store";
import { HERMES_MAC_MINI_DEFAULT_CAPABILITIES, createHermesWorkerAdvertisement } from "./worker_runtime/hermes_worker_protocol";
import { createHermesWorkerRegistryKeys } from "./worker_runtime/hermes_worker_registry_contract";
import { claimHermesJobForWorker, createHermesWorkerRegistryStore, getHermesWorkerStatus, registerHermesWorker } from "./worker_runtime/hermes_worker_registry";

async function main() {
  const env = { ...process.env };
  if (!env.HERMES_REDIS_URL && env.REDIS_PASSWORD) {
    env.HERMES_REDIS_URL = `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@127.0.0.1:6379`;
  }
  env.HERMES_REDIS_QUEUE_ENABLED = "true";
  const resolved = readHermesRedisClientConfig(env);
  if (!resolved.config) throw new Error("recovery_smoke_configuration_unavailable");
  const id = randomUUID(); const prefix = `farmos:hermes:test:day101:${id}`;
  const queueKeys = createHermesRedisQueueKeys(prefix); const workerKeys = createHermesWorkerRegistryKeys(prefix); const recoveryKeys = createHermesRecoveryKeys(prefix);
  const workerId = `worker-${id}`; const now = new Date().toISOString();
  const worker = createHermesWorkerAdvertisement({ workerId, workerType: "mac_mini", capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy", runtimeAvailable: true, draining: false, nowIso: now });
  const queueContext = { enabled: true, keys: queueKeys, storeFactory: () => createHermesRedisQueueStore(resolved.config!) };
  const workerContext = { enabled: true, keys: workerKeys, storeFactory: () => createHermesWorkerRegistryStore(resolved.config!) };
  const recoveryContext = { enabled: true, keys: recoveryKeys, storeFactory: () => createHermesJobRecoveryStore(resolved.config!) };
  const makeJob = (label: string) => createHermesJobEnvelope({ requestId: randomUUID(), jobIdFactory: randomUUID, nowIsoFactory: () => new Date().toISOString(),
    payload: { message: `controlled Day101 ${label} fixture`, include_readonly_context: false } });
  const jobA = makeJob("failed retry"); const jobB = makeJob("queued cancel"); const jobC = makeJob("running cancel"); const jobD = makeJob("queued retry rejection"); const jobE = makeJob("retry scheduled cancel");
  const cleanupKeys = [queueKeys.pending, queueKeys.processing, queueKeys.deadLetter, workerKeys.workers, workerKeys.worker(workerId),
    ...[jobA, jobB, jobC, jobD, jobE].flatMap((job) => [queueKeys.job(job.runtime.job_id), queueKeys.dedupe(job.runtime.job_id), workerKeys.claim(job.runtime.job_id), recoveryKeys.cancel(job.runtime.job_id)]),
    recoveryKeys.retry(jobA.runtime.job_id, 1), recoveryKeys.retry(jobE.runtime.job_id, 1)];
  let cleanupPerformed = false;
  try {
    const registered = await registerHermesWorker(worker, workerContext); if (!registered.ok) throw new Error("recovery_smoke_register_failed");
    await enqueueHermesJob(jobA, queueContext); const dequeuedA = await dequeueHermesJob(queueContext); if (!dequeuedA.ok || dequeuedA.status !== "dequeued") throw new Error("recovery_smoke_dequeue_a_failed");
    const claimA = await claimHermesJobForWorker({ worker, job: dequeuedA.job, requiredCapability: "lightweight_chat", context: workerContext }); if (!claimA.ok) throw new Error("recovery_smoke_claim_a_failed");
    const failureStore = await createHermesRedisQueueStore(resolved.config!);
    try {
      const serialized = await failureStore.get(queueKeys.job(jobA.runtime.job_id)); if (!serialized) throw new Error("recovery_smoke_job_a_missing");
      const failed = JSON.parse(serialized) as HermesQueuedJobRecord; failed.job = transitionHermesJobEnvelope(failed.job, "failed", new Date().toISOString());
      failed.queue.status = "failed"; failed.queue.completed_at = failed.job.runtime.updated_at; failed.queue.last_error_code = "worker_timeout";
      if (!await failureStore.setKeepingTtl(queueKeys.job(jobA.runtime.job_id), JSON.stringify(failed))) throw new Error("recovery_smoke_job_a_failure_transition_failed");
    } finally { await failureStore.disconnect(); }
    const retryA = await scheduleHermesJobRetry({ jobId: jobA.runtime.job_id, errorCode: "worker_timeout", context: recoveryContext });
    const afterRetry = await getHermesWorkerStatus(workerId, workerContext); const duplicateA = await scheduleHermesJobRetry({ jobId: jobA.runtime.job_id, errorCode: "worker_timeout", context: recoveryContext });
    await enqueueHermesJob(jobB, queueContext); const cancelB = await cancelHermesJob({ jobId: jobB.runtime.job_id, requestId: jobB.runtime.request_id, context: recoveryContext });
    const cancelBAgain = await cancelHermesJob({ jobId: jobB.runtime.job_id, requestId: jobB.runtime.request_id, context: recoveryContext });
    await enqueueHermesJob(jobC, queueContext); const dequeuedC = await dequeueHermesJob(queueContext); if (!dequeuedC.ok || dequeuedC.status !== "dequeued") throw new Error("recovery_smoke_dequeue_c_failed");
    const claimC = await claimHermesJobForWorker({ worker, job: dequeuedC.job, requiredCapability: "lightweight_chat", context: workerContext }); if (!claimC.ok) throw new Error("recovery_smoke_claim_c_failed");
    const cancelC = await cancelHermesJob({ jobId: jobC.runtime.job_id, requestId: jobC.runtime.request_id, context: recoveryContext });
    await enqueueHermesJob(jobD, queueContext); const queuedRetry = await scheduleHermesJobRetry({ jobId: jobD.runtime.job_id, errorCode: "worker_timeout", context: recoveryContext });
    await cancelHermesJob({ jobId: jobD.runtime.job_id, requestId: jobD.runtime.request_id, context: recoveryContext });
    await enqueueHermesJob(jobE, queueContext); const dequeuedE = await dequeueHermesJob(queueContext); if (!dequeuedE.ok || dequeuedE.status !== "dequeued") throw new Error("recovery_smoke_dequeue_e_failed");
    const claimE = await claimHermesJobForWorker({ worker, job: dequeuedE.job, requiredCapability: "lightweight_chat", context: workerContext }); if (!claimE.ok) throw new Error("recovery_smoke_claim_e_failed");
    const failureStoreE = await createHermesRedisQueueStore(resolved.config!);
    try {
      const serialized = await failureStoreE.get(queueKeys.job(jobE.runtime.job_id)); if (!serialized) throw new Error("recovery_smoke_job_e_missing");
      const failed = JSON.parse(serialized) as HermesQueuedJobRecord; failed.job = transitionHermesJobEnvelope(failed.job, "failed", new Date().toISOString());
      failed.queue.status = "failed"; failed.queue.completed_at = failed.job.runtime.updated_at; failed.queue.last_error_code = "worker_timeout";
      if (!await failureStoreE.setKeepingTtl(queueKeys.job(jobE.runtime.job_id), JSON.stringify(failed))) throw new Error("recovery_smoke_job_e_failure_transition_failed");
    } finally { await failureStoreE.disconnect(); }
    const retryE = await scheduleHermesJobRetry({ jobId: jobE.runtime.job_id, errorCode: "worker_timeout", context: recoveryContext });
    const cancelE = await cancelHermesJob({ jobId: jobE.runtime.job_id, requestId: jobE.runtime.request_id, context: recoveryContext });
    const verify = await createHermesJobRecoveryStore(resolved.config); let pending: string[]; let processing: string[]; let dead: string[]; let claimCStored: string | null;
    let retryJobPttl: number; let retryRecordPttl: number; let cancelJobPttl: number; let cancelRecordPttl: number;
    let jobERecord: HermesQueuedJobRecord; let retryEStored: string | null; let claimEStored: string | null;
    let cancelBStored: string | null;
    try {
      pending = await verify.getList(queueKeys.pending); processing = await verify.getList(queueKeys.processing); dead = await verify.getList(queueKeys.deadLetter); claimCStored = await verify.get(workerKeys.claim(jobC.runtime.job_id));
      retryJobPttl = await verify.getPttl(queueKeys.job(jobA.runtime.job_id)); retryRecordPttl = await verify.getPttl(recoveryKeys.retry(jobA.runtime.job_id, 1));
      cancelJobPttl = await verify.getPttl(queueKeys.job(jobB.runtime.job_id)); cancelRecordPttl = await verify.getPttl(recoveryKeys.cancel(jobB.runtime.job_id));
      cancelBStored = await verify.get(recoveryKeys.cancel(jobB.runtime.job_id));
      jobERecord = JSON.parse((await verify.get(queueKeys.job(jobE.runtime.job_id))) ?? "null") as HermesQueuedJobRecord;
      retryEStored = await verify.get(recoveryKeys.retry(jobE.runtime.job_id, 1)); claimEStored = await verify.get(workerKeys.claim(jobE.runtime.job_id));
    } finally { await verify.disconnect(); }
    const afterCancel = await getHermesWorkerStatus(workerId, workerContext);
    if (!retryA.ok || retryA.status !== "retry_scheduled" || retryA.job.job.runtime.status !== "retry_scheduled" || duplicateA.ok || !afterRetry.ok || afterRetry.status !== "found" || afterRetry.worker.active_job_count !== 0 || afterRetry.worker.current_job_id !== null ||
      !cancelB.ok || !cancelBAgain.ok || cancelBAgain.status !== "already_cancelled" || cancelBStored === null ||
      cancelB.cancellation.cancellation_id !== cancelBAgain.cancellation.cancellation_id || cancelB.cancellation.requested_at !== cancelBAgain.cancellation.requested_at ||
      cancelB.cancellation.cancellation_id !== (JSON.parse(cancelBStored) as { cancellation_id: string }).cancellation_id ||
      !cancelC.ok || queuedRetry.ok || queuedRetry.error_code !== "retry_job_status_not_allowed" || claimCStored !== null ||
      !retryE.ok || !cancelE.ok || jobERecord.job.runtime.status !== "cancelled" || jobERecord.queue.status !== "cancelled" || retryEStored !== null || claimEStored !== null ||
      !afterCancel.ok || afterCancel.status !== "found" || afterCancel.worker.active_job_count !== 0 || pending.length !== 0 || processing.length !== 0 || dead.length !== 0 ||
      retryRecordPttl <= 0 || retryRecordPttl > retryJobPttl || cancelRecordPttl <= 0 || cancelRecordPttl > cancelJobPttl) {
      throw new Error("recovery_smoke_verification_failed");
    }
    console.log(JSON.stringify({ result: "ok", checked: "hermes_job_recovery_smoke_test", retry_status: retryA.status,
      failed_job_retry_status: retryA.status, retry_job_runtime_status: retryA.job.job.runtime.status,
      queued_retry_error_code: queuedRetry.ok ? null : queuedRetry.error_code, duplicate_retry_rejected: true,
      queued_cancel_status: cancelB.status, factoryless_second_cancel_status: cancelBAgain.status, running_cancel_status: cancelC.status,
      canonical_cancel_id_preserved: cancelB.cancellation.cancellation_id === cancelBAgain.cancellation.cancellation_id && cancelB.cancellation.cancellation_id === (JSON.parse(cancelBStored) as { cancellation_id: string }).cancellation_id,
      canonical_cancel_requested_at_preserved: cancelB.cancellation.requested_at === cancelBAgain.cancellation.requested_at,
      cancel_record_overwritten: false,
      retry_scheduled_cancel_status: cancelE.status, retry_scheduled_cancel_job_status: jobERecord.job.runtime.status,
      retry_schedule_removed_on_cancel: retryEStored === null,
      claim_release_verified: true, capacity_release_verified: true, pending_empty: true, processing_empty: true,
      dead_letter_empty: true, retry_pttl_lte_job_pttl: retryRecordPttl <= retryJobPttl,
      cancel_pttl_lte_job_pttl: cancelRecordPttl <= cancelJobPttl, ttl_extension_performed: false,
      db_write_performed: false, model_execution_performed: false }, null, 2));
  } finally {
    const cleanup = await createHermesJobRecoveryStore(resolved.config!);
    try { await cleanup.deleteKeys(cleanupKeys); cleanupPerformed = true; } finally { await cleanup.disconnect(); }
    console.log(JSON.stringify({ cleanup_performed: cleanupPerformed, cleanup_scope: "unique_day101_prefix_known_keys_only", flush_performed: false }));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "recovery_smoke_failed"); process.exitCode = 1; });
