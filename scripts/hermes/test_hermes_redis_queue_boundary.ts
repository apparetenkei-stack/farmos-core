import assert from "node:assert/strict";

import { createHermesJobEnvelope } from "./job_runtime/hermes_job_envelope";
import type { HermesRedisQueueStore } from "./queue_runtime/hermes_redis_client";
import {
  createHermesRedisQueueKeys,
  type HermesQueueRecordStatus,
  type HermesRedisQueueKeys,
} from "./queue_runtime/hermes_redis_queue_contract";
import {
  dequeueHermesJob,
  enqueueHermesJob,
  getHermesQueuedJobStatus,
  incrementHermesJobRetryCount,
  isolateHermesQueuedJob,
} from "./queue_runtime/hermes_redis_queue";

const NOW = "2026-07-11T07:00:00.000Z";
const PREFIX = "farmos:hermes:test:day98-unit";

class FakeRedisStore implements HermesRedisQueueStore {
  readonly values = new Map<string, string>();
  readonly lists = new Map<string, string[]>();
  readonly ttlSeconds = new Map<string, number>();
  fail = false;
  keepTtlSetCount = 0;
  deleteBeforeKeepTtl = false;

  private assertReady(): void {
    if (this.fail) throw new Error("controlled redis failure with hidden detail");
  }

  async enqueueAtomic(input: {
    dedupeKey: string;
    jobKey: string;
    pendingKey: string;
    jobId: string;
    serializedRecord: string;
    ttlSeconds: number;
  }): Promise<"enqueued" | "duplicate"> {
    this.assertReady();
    if (this.values.has(input.dedupeKey)) return "duplicate";
    this.values.set(input.jobKey, input.serializedRecord);
    this.values.set(input.dedupeKey, "1");
    this.ttlSeconds.set(input.jobKey, input.ttlSeconds);
    this.ttlSeconds.set(input.dedupeKey, input.ttlSeconds);
    this.lists.set(input.pendingKey, [
      input.jobId,
      ...(this.lists.get(input.pendingKey) ?? []),
    ]);
    return "enqueued";
  }

  async movePendingToProcessing(pendingKey: string, processingKey: string) {
    this.assertReady();
    const pending = this.lists.get(pendingKey) ?? [];
    const jobId = pending.pop() ?? null;
    this.lists.set(pendingKey, pending);
    if (jobId !== null) {
      this.lists.set(processingKey, [
        jobId,
        ...(this.lists.get(processingKey) ?? []),
      ]);
    }
    return jobId;
  }

  async get(key: string) {
    this.assertReady();
    return this.values.get(key) ?? null;
  }

  async setWithTtl(key: string, value: string, ttlSeconds: number) {
    this.assertReady();
    this.values.set(key, value);
    this.ttlSeconds.set(key, ttlSeconds);
  }

  async setKeepingTtl(key: string, value: string) {
    this.assertReady();
    this.keepTtlSetCount += 1;
    if (this.deleteBeforeKeepTtl) {
      this.values.delete(key);
      this.ttlSeconds.delete(key);
      this.deleteBeforeKeepTtl = false;
    }
    if (!this.values.has(key)) return false;
    this.values.set(key, value);
    return true;
  }

  async removeFromList(key: string, value: string) {
    this.assertReady();
    this.lists.set(key, (this.lists.get(key) ?? []).filter((item) => item !== value));
  }

  async pushToList(key: string, value: string) {
    this.assertReady();
    this.lists.set(key, [value, ...(this.lists.get(key) ?? [])]);
  }

  async deleteKeys(keys: string[]) {
    for (const key of keys) {
      this.values.delete(key);
      this.lists.delete(key);
      this.ttlSeconds.delete(key);
    }
  }

  async disconnect() {}
}

function createJob(jobId: string, createdAt = NOW) {
  return createHermesJobEnvelope({
    requestId: "00000000-0000-4000-8000-000000000098",
    jobIdFactory: () => jobId,
    nowIsoFactory: () => createdAt,
    payload: {
      message: "controlled queue unit payload",
      include_readonly_context: false,
    },
  });
}

function context(store: FakeRedisStore, keys: HermesRedisQueueKeys, enabled = true) {
  return {
    enabled,
    keys,
    storeFactory: async () => store,
    nowIsoFactory: () => NOW,
  };
}

async function main(): Promise<void> {
  const day101QueueStatuses: readonly HermesQueueRecordStatus[] = ["retry_scheduled", "cancelled"];
  assert.deepEqual(day101QueueStatuses, ["retry_scheduled", "cancelled"]);
  const keys = createHermesRedisQueueKeys(PREFIX);
  assert.equal(keys.pending, `${PREFIX}:queue:pending`);
  assert.equal(keys.processing, `${PREFIX}:queue:processing`);
  assert.equal(keys.deadLetter, `${PREFIX}:queue:dead-letter`);

  let disabledFactoryCalls = 0;
  const disabled = await enqueueHermesJob(createJob("disabled-job"), {
    enabled: false,
    keys,
    storeFactory: async () => {
      disabledFactoryCalls += 1;
      return new FakeRedisStore();
    },
    nowIsoFactory: () => NOW,
  });
  assert.equal(disabled.ok, false);
  assert.equal(disabled.status, "disabled");
  assert.equal(disabledFactoryCalls, 0);

  const store = new FakeRedisStore();
  const job = createJob("00000000-0000-4000-8000-000000000198");
  const unsafeEnvelope = structuredClone(job) as typeof job & {
    payload: typeof job.payload & { provider: string; token: string };
  };
  unsafeEnvelope.payload.provider = "must-not-copy";
  unsafeEnvelope.payload.token = "must-not-copy";
  const unsafeResult = await enqueueHermesJob(
    unsafeEnvelope,
    context(store, keys),
  );
  assert.equal(unsafeResult.ok, false);
  assert.equal(store.values.size, 0);
  assert.deepEqual(store.lists.get(keys.pending), undefined);

  const enqueued = await enqueueHermesJob(job, context(store, keys));
  assert.equal(enqueued.ok, true);
  assert.equal(enqueued.status, "enqueued");
  if (!enqueued.ok) throw new Error("enqueue test failed");
  assert.equal(enqueued.queue_write_performed, true);
  assert.deepEqual(store.lists.get(keys.pending), [job.runtime.job_id]);

  const stored = JSON.parse(store.values.get(keys.job(job.runtime.job_id)) ?? "null");
  assert.equal(stored.schema_version, "hermes.queue.v1");
  assert.equal(stored.queue.status, "queued");
  assert.equal(stored.queue.retry_count, 0);
  assert.equal(stored.queue.max_retry_count, 1);
  assert.equal(stored.safety.db_write_performed, false);
  assert.equal(stored.safety.worker_execution_performed, false);
  assert.equal(stored.safety.model_execution_performed, false);
  assert.equal(store.ttlSeconds.get(keys.job(job.runtime.job_id)), 300);
  assert.equal(store.ttlSeconds.get(keys.dedupe(job.runtime.job_id)), 300);

  const duplicate = await enqueueHermesJob(job, context(store, keys));
  assert.equal(duplicate.ok, true);
  assert.equal(duplicate.status, "duplicate");
  if (!duplicate.ok) throw new Error("duplicate test failed");
  assert.equal(duplicate.queue_write_performed, false);
  assert.deepEqual(store.lists.get(keys.pending), [job.runtime.job_id]);

  const status = await getHermesQueuedJobStatus(job.runtime.job_id, context(store, keys));
  assert.equal(status.ok, true);
  assert.equal(status.status, "found");
  if (!status.ok || status.job === null) throw new Error("status test failed");
  assert.equal(status.job.message_length, job.payload.message.length);
  assert.equal(Object.hasOwn(status.job, "message"), false);
  assert.doesNotMatch(JSON.stringify(status.job), /controlled queue unit payload/u);

  const storedPayload = stored.job.payload as Record<string, unknown>;
  for (const forbidden of [
    "apiKey", "token", "credentials", "authorization", "cookie",
    "connectionString", "databaseUrl", "serviceRole", "systemPrompt",
    "readonly_context_text", "provider_endpoint", "model_path",
  ]) {
    assert.equal(Object.hasOwn(storedPayload, forbidden), false);
  }
  assert.doesNotMatch(JSON.stringify(storedPayload), /must-not-copy/u);

  const expired = createJob(
    "00000000-0000-4000-8000-000000000298",
    "2026-07-11T06:54:59.999Z",
  );
  const expiredResult = await enqueueHermesJob(expired, context(store, keys));
  assert.equal(expiredResult.ok, false);
  assert.equal(expiredResult.status, "failed");
  assert.equal(store.values.has(keys.job(expired.runtime.job_id)), false);

  const expiryStore = new FakeRedisStore();
  const expiryJob = createJob("00000000-0000-4000-8000-000000000299");
  const expiryEnqueue = await enqueueHermesJob(
    expiryJob,
    context(expiryStore, keys),
  );
  assert.equal(expiryEnqueue.ok, true);
  expiryStore.ttlSeconds.set(keys.job(expiryJob.runtime.job_id), 1);
  const expiryTtlBefore = expiryStore.ttlSeconds.get(
    keys.job(expiryJob.runtime.job_id),
  );
  const afterExpiryContext = {
    ...context(expiryStore, keys),
    nowIsoFactory: () => expiryJob.runtime.expires_at,
  };
  const expiryDequeue = await dequeueHermesJob(afterExpiryContext);
  assert.equal(expiryDequeue.ok, false);
  if (expiryDequeue.ok) throw new Error("expired dequeue test failed");
  assert.equal(expiryDequeue.error_code, "job_expired");
  assert.equal(expiryDequeue.fail_closed, true);
  assert.deepEqual(expiryStore.lists.get(keys.processing), []);
  assert.deepEqual(expiryStore.lists.get(keys.deadLetter), [
    expiryJob.runtime.job_id,
  ]);
  const expiredRecord = JSON.parse(
    expiryStore.values.get(keys.job(expiryJob.runtime.job_id)) ?? "null",
  );
  assert.equal(expiredRecord.job.runtime.status, "expired");
  assert.equal(expiredRecord.queue.status, "dead_letter");
  assert.equal(expiredRecord.queue.last_error_code, "job_expired");
  assert.equal(expiredRecord.queue.completed_at, expiryJob.runtime.expires_at);
  assert.equal(expiredRecord.safety.db_write_performed, false);
  assert.equal(expiredRecord.safety.worker_execution_performed, false);
  assert.equal(expiredRecord.safety.model_execution_performed, false);
  assert.equal(
    expiryStore.ttlSeconds.get(keys.job(expiryJob.runtime.job_id)),
    expiryTtlBefore,
  );
  assert.equal(expiryTtlBefore, 1);
  assert.equal(expiryStore.keepTtlSetCount, 1);

  const missingStore = new FakeRedisStore();
  const missingJob = createJob("00000000-0000-4000-8000-000000000300");
  const missingEnqueue = await enqueueHermesJob(
    missingJob,
    context(missingStore, keys),
  );
  assert.equal(missingEnqueue.ok, true);
  missingStore.ttlSeconds.set(keys.job(missingJob.runtime.job_id), 1);
  missingStore.deleteBeforeKeepTtl = true;
  const missingDequeue = await dequeueHermesJob({
    ...context(missingStore, keys),
    nowIsoFactory: () => missingJob.runtime.expires_at,
  });
  assert.equal(missingDequeue.ok, false);
  if (missingDequeue.ok) throw new Error("missing record test failed");
  assert.equal(missingDequeue.error_code, "queue_record_missing");
  assert.equal(missingDequeue.fail_closed, true);
  assert.equal(
    missingStore.values.has(keys.job(missingJob.runtime.job_id)),
    false,
  );
  assert.deepEqual(missingStore.lists.get(keys.processing), []);
  assert.deepEqual(missingStore.lists.get(keys.deadLetter), undefined);

  const dequeued = await dequeueHermesJob(context(store, keys));
  assert.equal(dequeued.ok, true);
  assert.equal(dequeued.status, "dequeued");
  if (!dequeued.ok || dequeued.job === null) throw new Error("dequeue test failed");
  assert.equal(dequeued.job.queue.status, "processing");
  assert.equal(dequeued.job.job.runtime.status, "running");
  assert.equal(dequeued.job.queue.dequeued_at, NOW);
  assert.deepEqual(store.lists.get(keys.processing), [job.runtime.job_id]);

  const empty = await dequeueHermesJob(context(store, keys));
  assert.deepEqual(empty, { ok: true, status: "empty", job: null });

  const incremented = await incrementHermesJobRetryCount(
    job.runtime.job_id,
    context(store, keys),
  );
  assert.equal(incremented.ok, true);
  if (!incremented.ok) throw new Error("retry count test failed");
  assert.equal(incremented.job.retry_count, 1);
  const retryBlocked = await incrementHermesJobRetryCount(
    job.runtime.job_id,
    context(store, keys),
  );
  assert.equal(retryBlocked.ok, false);
  if (retryBlocked.ok) throw new Error("retry max test failed");
  assert.equal(retryBlocked.error_code, "max_retry_count_reached");
  assert.deepEqual(store.lists.get(keys.pending), []);

  const isolated = await isolateHermesQueuedJob(
    job.runtime.job_id,
    "job_execution_failed",
    context(store, keys),
  );
  assert.equal(isolated.ok, true);
  if (!isolated.ok) throw new Error("isolation test failed");
  assert.equal(isolated.job.queue_status, "dead_letter");
  assert.deepEqual(store.lists.get(keys.processing), []);
  assert.deepEqual(store.lists.get(keys.deadLetter), [job.runtime.job_id]);
  const isolatedRecord = JSON.parse(
    store.values.get(keys.job(job.runtime.job_id)) ?? "null",
  );
  assert.equal(isolatedRecord.queue.last_error_code, "job_execution_failed");
  assert.equal(isolatedRecord.job.runtime.status, "failed");

  const failedStore = new FakeRedisStore();
  failedStore.fail = true;
  const redisFailure = await enqueueHermesJob(
    createJob("00000000-0000-4000-8000-000000000398"),
    context(failedStore, keys),
  );
  assert.equal(redisFailure.ok, false);
  assert.equal(redisFailure.status, "not_ready");
  if (redisFailure.ok) throw new Error("failure test failed");
  assert.equal(redisFailure.error_code, "redis_unavailable");
  assert.equal(redisFailure.fail_closed, true);
  assert.equal(redisFailure.queue_write_performed, false);
  assert.doesNotMatch(JSON.stringify(redisFailure), /hidden detail/u);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_redis_queue_boundary",
    schema_version: "hermes.queue.v1",
    enqueue: "ok",
    duplicate_suppression: "ok",
    dequeue: "ok",
    empty_queue: "ok",
    retry_count_manual_only: "ok",
    dead_letter_isolation: "ok",
    redis_failure_fail_closed: "ok",
    external_redis_connection_performed: false,
    db_write_performed: false,
    worker_execution_performed: false,
    model_execution_performed: false,
    api_route_added: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
