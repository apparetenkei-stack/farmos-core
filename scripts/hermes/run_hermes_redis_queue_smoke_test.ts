import { randomUUID } from "node:crypto";

import { createHermesJobEnvelope } from "./job_runtime/hermes_job_envelope";
import {
  createHermesRedisQueueStore,
  readHermesRedisClientConfig,
} from "./queue_runtime/hermes_redis_client";
import { createHermesRedisQueueKeys } from "./queue_runtime/hermes_redis_queue_contract";
import {
  dequeueHermesJob,
  enqueueHermesJob,
  getHermesQueuedJobStatus,
  isolateHermesQueuedJob,
} from "./queue_runtime/hermes_redis_queue";

async function main(): Promise<void> {
  const env = { ...process.env };
  if (!env.HERMES_REDIS_URL && env.REDIS_PASSWORD) {
    env.HERMES_REDIS_URL =
      `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@127.0.0.1:6379`;
  }
  env.HERMES_REDIS_QUEUE_ENABLED = "true";
  const resolved = readHermesRedisClientConfig(env);
  if (!resolved.config) throw new Error("redis_smoke_configuration_unavailable");

  const testId = randomUUID();
  const prefix = `farmos:hermes:test:day98:${testId}`;
  const keys = createHermesRedisQueueKeys(prefix);
  const job = createHermesJobEnvelope({
    requestId: randomUUID(),
    jobIdFactory: randomUUID,
    payload: {
      message: "controlled Day98 Redis smoke payload",
      include_readonly_context: false,
    },
  });
  const context = {
    enabled: true,
    keys,
    storeFactory: () => createHermesRedisQueueStore(resolved.config!),
  };
  let cleanupPerformed = false;

  try {
    const enqueued = await enqueueHermesJob(job, context);
    const queuedStatus = await getHermesQueuedJobStatus(job.runtime.job_id, context);
    const duplicate = await enqueueHermesJob(job, context);
    const dequeued = await dequeueHermesJob(context);
    const processingStatus = await getHermesQueuedJobStatus(job.runtime.job_id, context);
    const isolated = await isolateHermesQueuedJob(
      job.runtime.job_id,
      "manual_isolation",
      context,
    );
    const deadLetterStatus = await getHermesQueuedJobStatus(
      job.runtime.job_id,
      context,
    );

    if (
      !enqueued.ok || enqueued.status !== "enqueued" ||
      !queuedStatus.ok || queuedStatus.status !== "found" ||
      !duplicate.ok || duplicate.status !== "duplicate" ||
      !dequeued.ok || dequeued.status !== "dequeued" ||
      !processingStatus.ok || processingStatus.status !== "found" ||
      !isolated.ok || isolated.status !== "isolated" ||
      !deadLetterStatus.ok || deadLetterStatus.status !== "found"
    ) {
      throw new Error("redis_smoke_boundary_failed");
    }

    console.log(JSON.stringify({
      result: "ok",
      checked: "hermes_redis_queue_smoke_test",
      request_id: job.runtime.request_id,
      job_id: job.runtime.job_id,
      message_length: job.payload.message.length,
      include_readonly_context: job.payload.include_readonly_context,
      enqueue_status: enqueued.status,
      duplicate_status: duplicate.status,
      dequeue_status: dequeued.status,
      processing_status: processingStatus.job?.queue_status,
      isolation_status: isolated.status,
      dead_letter_status: deadLetterStatus.job?.queue_status,
      db_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
    }, null, 2));
  } finally {
    const store = await createHermesRedisQueueStore(resolved.config);
    try {
      await store.deleteKeys([
        keys.pending,
        keys.processing,
        keys.deadLetter,
        keys.job(job.runtime.job_id),
        keys.dedupe(job.runtime.job_id),
      ]);
      cleanupPerformed = true;
    } finally {
      await store.disconnect();
    }
    console.log(JSON.stringify({
      cleanup_performed: cleanupPerformed,
      cleanup_scope: "unique_day98_test_prefix_only",
    }, null, 2));
  }
}

main().catch(() => {
  console.error("hermes_redis_queue_smoke_test_failed");
  process.exitCode = 1;
});
