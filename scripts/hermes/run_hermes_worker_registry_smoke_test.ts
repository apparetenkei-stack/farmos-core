import { randomUUID } from "node:crypto";

import {
  createHermesJobEnvelope,
  transitionHermesJobEnvelope,
} from "./job_runtime/hermes_job_envelope";
import type { HermesQueuedJobRecord } from "./queue_runtime/hermes_redis_queue_contract";
import {
  createHermesRedisQueueStore,
  readHermesRedisClientConfig,
} from "./queue_runtime/hermes_redis_client";
import {
  HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  HERMES_RTX_DEFAULT_CAPABILITIES,
  createHermesWorkerAdvertisement,
} from "./worker_runtime/hermes_worker_protocol";
import { createHermesWorkerRegistryKeys } from "./worker_runtime/hermes_worker_registry_contract";
import {
  createHermesWorkerRegistryStore,
  claimHermesJobForWorker,
  getHermesWorkerStatus,
  heartbeatHermesWorker,
  listHermesWorkers,
  registerHermesWorker,
} from "./worker_runtime/hermes_worker_registry";

async function main(): Promise<void> {
  const env = { ...process.env };
  if (!env.HERMES_REDIS_URL && env.REDIS_PASSWORD) {
    env.HERMES_REDIS_URL =
      `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@127.0.0.1:6379`;
  }
  env.HERMES_REDIS_QUEUE_ENABLED = "true";
  const resolved = readHermesRedisClientConfig(env);
  if (!resolved.config) throw new Error("worker_registry_smoke_configuration_unavailable");

  const testId = randomUUID();
  const keys = createHermesWorkerRegistryKeys(
    `farmos:hermes:test:day99:${testId}`,
  );
  const nowIso = new Date().toISOString();
  const mac = createHermesWorkerAdvertisement({
    workerId: `mac-mini-${testId}`,
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso,
  });
  const rtx = createHermesWorkerAdvertisement({
    workerId: `rtx-${testId}`,
    workerType: "rtx",
    capabilities: HERMES_RTX_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso,
  });
  const context = {
    enabled: true,
    keys,
    storeFactory: () => createHermesWorkerRegistryStore(resolved.config!),
  };
  let cleanupPerformed = false;
  const queuedJob = createHermesJobEnvelope({
    requestId: randomUUID(),
    jobIdFactory: randomUUID,
    nowIsoFactory: () => nowIso,
    payload: {
      message: "controlled Day99 claim smoke payload",
      include_readonly_context: false,
    },
  });
  const processingJob: HermesQueuedJobRecord = {
    schema_version: "hermes.queue.v1",
    job: transitionHermesJobEnvelope(queuedJob, "running", nowIso),
    queue: {
      status: "processing",
      retry_count: 0,
      max_retry_count: 1,
      enqueued_at: nowIso,
      dequeued_at: nowIso,
      completed_at: null,
      last_error_code: null,
    },
    safety: {
      db_write_performed: false,
      business_db_write_performed: false,
      proposal_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
      fail_closed: true,
    },
  };
  const queuedJobB = createHermesJobEnvelope({
    requestId: randomUUID(),
    jobIdFactory: randomUUID,
    nowIsoFactory: () => nowIso,
    payload: {
      message: "controlled Day99 second claim smoke payload",
      include_readonly_context: false,
    },
  });
  const processingJobB: HermesQueuedJobRecord = {
    ...processingJob,
    job: transitionHermesJobEnvelope(queuedJobB, "running", nowIso),
  };

  try {
    const registered = await registerHermesWorker(mac, context);
    const reRegistered = await registerHermesWorker(mac, context);
    const heartbeat = await heartbeatHermesWorker(mac.worker_id, {
      health: "degraded",
      runtimeAvailable: true,
      draining: false,
    }, context);
    const heartbeatTwo = await heartbeatHermesWorker(mac.worker_id, {
      health: "healthy",
      runtimeAvailable: true,
      draining: false,
    }, context);
    const rtxRegistered = await registerHermesWorker(rtx, context);
    const status = await getHermesWorkerStatus(mac.worker_id, context);
    const listed = await listHermesWorkers(context);
    const firstClaim = await claimHermesJobForWorker({
      worker: mac,
      job: processingJob,
      requiredCapability: "lightweight_chat",
      context,
    });
    const sameWorkerClaim = await claimHermesJobForWorker({
      worker: mac,
      job: processingJob,
      requiredCapability: "lightweight_chat",
      context,
    });
    const otherWorkerClaim = await claimHermesJobForWorker({
      worker: rtx,
      job: processingJob,
      requiredCapability: "heavy_reasoning",
      context,
    });
    const secondJobClaim = await claimHermesJobForWorker({
      worker: mac,
      job: processingJobB,
      requiredCapability: "lightweight_chat",
      context,
    });
    const workerAfterClaim = await getHermesWorkerStatus(mac.worker_id, context);
    const verificationStore = await createHermesWorkerRegistryStore(
      resolved.config,
    );
    let secondClaimRecord: string | null;
    try {
      secondClaimRecord = await verificationStore.get(
        keys.claim(processingJobB.job.runtime.job_id),
      );
    } finally {
      await verificationStore.disconnect();
    }
    if (
      !registered.ok || registered.status !== "registered" ||
      registered.worker.heartbeat_count !== 0 ||
      !reRegistered.ok || reRegistered.status !== "re_registered" ||
      !heartbeat.ok || heartbeat.status !== "heartbeat_recorded" ||
      heartbeat.worker.heartbeat_count !== 1 ||
      !heartbeatTwo.ok || heartbeatTwo.worker.heartbeat_count !== 2 ||
      !rtxRegistered.ok || !status.ok || status.status !== "found" ||
      !listed.ok || listed.workers.length !== 2 ||
      !firstClaim.ok || sameWorkerClaim.ok || otherWorkerClaim.ok ||
      secondJobClaim.ok || secondClaimRecord !== null ||
      !workerAfterClaim.ok || workerAfterClaim.status !== "found" ||
      workerAfterClaim.worker.active_job_count !== 1 ||
      workerAfterClaim.worker.current_job_id !== processingJob.job.runtime.job_id
    ) {
      throw new Error("worker_registry_smoke_boundary_failed");
    }

    console.log(JSON.stringify({
      result: "ok",
      checked: "hermes_worker_registry_smoke_test",
      registered_status: registered.status,
      heartbeat_count_after_register: registered.worker.heartbeat_count,
      re_registered_status: reRegistered.status,
      heartbeat_status: heartbeat.status,
      heartbeat_count_after_first: heartbeat.worker.heartbeat_count,
      heartbeat_count_after_second: heartbeatTwo.worker.heartbeat_count,
      worker_status: status.worker?.readiness,
      listed_worker_count: listed.workers.length,
      worker_types: listed.workers.map((worker) => worker.worker_type).sort(),
      first_claim_status: firstClaim.status,
      same_worker_claim_error_code:
        sameWorkerClaim.ok ? null : sameWorkerClaim.error_code,
      other_worker_claim_error_code:
        otherWorkerClaim.ok ? null : otherWorkerClaim.error_code,
      second_job_claim_error_code:
        secondJobClaim.ok ? null : secondJobClaim.error_code,
      second_job_claim_record_created: secondClaimRecord !== null,
      worker_current_job_id: workerAfterClaim.worker.current_job_id,
      worker_active_job_count: workerAfterClaim.worker.active_job_count,
      worker_max_concurrency: workerAfterClaim.worker.max_concurrency,
      db_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
    }, null, 2));
  } finally {
    const cleanupStore = await createHermesRedisQueueStore(resolved.config);
    try {
      await cleanupStore.deleteKeys([
        keys.workers,
        keys.worker(mac.worker_id),
        keys.worker(rtx.worker_id),
        keys.claim(processingJob.job.runtime.job_id),
      ]);
      cleanupPerformed = true;
    } finally {
      await cleanupStore.disconnect();
    }
    console.log(JSON.stringify({
      cleanup_performed: cleanupPerformed,
      cleanup_scope: "unique_day99_test_prefix_only",
    }, null, 2));
  }
}

main().catch(() => {
  console.error("hermes_worker_registry_smoke_test_failed");
  process.exitCode = 1;
});
