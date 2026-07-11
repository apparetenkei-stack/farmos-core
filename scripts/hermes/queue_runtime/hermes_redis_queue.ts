import {
  createHermesJobPayload,
  isHermesJobExpired,
  transitionHermesJobEnvelope,
  type HermesJobEnvelope,
} from "../job_runtime/hermes_job_envelope";
import type { HermesRedisQueueStore } from "./hermes_redis_client";
import {
  HERMES_QUEUE_MAX_RETRY_COUNT,
  createHermesQueuedJobSummary,
  createHermesRedisQueueKeys,
  type HermesQueuedJobRecord,
  type HermesQueuedJobSummary,
  type HermesRedisQueueKeys,
} from "./hermes_redis_queue_contract";

type QueueContext = {
  enabled: boolean;
  storeFactory: () => Promise<HermesRedisQueueStore>;
  keys?: HermesRedisQueueKeys;
  nowIsoFactory?: () => string;
};

type QueueFailure = {
  ok: false;
  status: "disabled" | "not_ready" | "failed";
  error_code: string;
  queue_write_performed: false;
  fail_closed: true;
};

export type HermesQueueEnqueueResult =
  | {
      ok: true;
      status: "enqueued" | "duplicate";
      request_id: string;
      job_id: string;
      duplicate: boolean;
      queue_name: string;
      queue_write_performed: boolean;
    }
  | QueueFailure;

export type HermesQueueDequeueResult =
  | { ok: true; status: "dequeued"; job: HermesQueuedJobRecord }
  | { ok: true; status: "empty"; job: null }
  | (QueueFailure & { job: null });

export type HermesQueueStatusResult =
  | { ok: true; status: "found"; job: HermesQueuedJobSummary }
  | { ok: true; status: "not_found"; job: null }
  | (QueueFailure & { job: null });

export type HermesQueueMutationResult =
  | { ok: true; status: "updated" | "isolated"; job: HermesQueuedJobSummary }
  | (QueueFailure & { job: null });

export type HermesIsolationErrorCode =
  | "job_execution_failed"
  | "max_retry_count_reached"
  | "job_expired"
  | "manual_isolation";

function failure(
  status: QueueFailure["status"],
  errorCode: string,
): QueueFailure {
  return {
    ok: false,
    status,
    error_code: errorCode,
    queue_write_performed: false,
    fail_closed: true,
  };
}

function nowIso(context: QueueContext): string {
  return (context.nowIsoFactory ?? (() => new Date().toISOString()))();
}

function remainingTtlSeconds(expiresAt: string, now: string): number {
  const remainingMs = Date.parse(expiresAt) - Date.parse(now);
  if (!Number.isFinite(remainingMs)) return 0;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function validateEnvelope(envelope: HermesJobEnvelope): boolean {
  try {
    const payload = createHermesJobPayload(envelope.payload);
    return (
      envelope.schema_version === "hermes.job.v1" &&
      envelope.job_type === "hermes_chat" &&
      envelope.runtime.status === "queued" &&
      envelope.runtime.execution_mode === "queued" &&
      envelope.runtime.queue_persisted === false &&
      envelope.runtime.worker_assigned === false &&
      envelope.runtime.retry_enabled === false &&
      envelope.runtime.attempt === 0 &&
      envelope.runtime.max_attempts === 1 &&
      Object.keys(envelope.payload).length === 2 &&
      payload.message === envelope.payload.message &&
      payload.include_readonly_context ===
        envelope.payload.include_readonly_context &&
      envelope.safety.secret_in_payload === false &&
      envelope.safety.credentials_in_payload === false &&
      envelope.safety.db_connection_in_payload === false &&
      envelope.safety.business_db_write_allowed === false &&
      envelope.safety.proposal_write_allowed === false &&
      envelope.safety.queue_write_performed === false &&
      envelope.safety.worker_execution_performed === false &&
      envelope.safety.fail_closed === true
    );
  } catch {
    return false;
  }
}

function createRecord(envelope: HermesJobEnvelope, now: string): HermesQueuedJobRecord {
  return {
    schema_version: "hermes.queue.v1",
    job: envelope,
    queue: {
      status: "queued",
      retry_count: 0,
      max_retry_count: HERMES_QUEUE_MAX_RETRY_COUNT,
      enqueued_at: now,
      dequeued_at: null,
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
}

function parseRecord(serialized: string): HermesQueuedJobRecord {
  const parsed = JSON.parse(serialized) as HermesQueuedJobRecord;
  if (
    parsed?.schema_version !== "hermes.queue.v1" ||
    !parsed.job ||
    !parsed.queue ||
    !Number.isInteger(parsed.queue.retry_count) ||
    parsed.queue.retry_count < 0 ||
    parsed.queue.max_retry_count !== HERMES_QUEUE_MAX_RETRY_COUNT ||
    parsed.safety?.fail_closed !== true
  ) {
    throw new Error("queue_record_invalid");
  }
  return parsed;
}

async function useStore<T>(
  context: QueueContext,
  operation: (store: HermesRedisQueueStore, keys: HermesRedisQueueKeys) => Promise<T>,
): Promise<T> {
  const store = await context.storeFactory();
  try {
    return await operation(store, context.keys ?? createHermesRedisQueueKeys());
  } finally {
    await store.disconnect().catch(() => undefined);
  }
}

async function moveRecordToDeadLetter(input: {
  store: HermesRedisQueueStore;
  keys: HermesRedisQueueKeys;
  record: HermesQueuedJobRecord;
  jobId: string;
  now: string;
  errorCode: HermesIsolationErrorCode;
  terminalStatus: "expired" | "failed" | null;
}): Promise<HermesQueuedJobRecord | null> {
  const job = input.terminalStatus === null
    ? input.record.job
    : transitionHermesJobEnvelope(
        input.record.job,
        input.terminalStatus,
        input.now,
      );
  const updated: HermesQueuedJobRecord = {
    ...input.record,
    job,
    queue: {
      ...input.record.queue,
      status: "dead_letter",
      completed_at: input.now,
      last_error_code: input.errorCode,
    },
  };

  const recordUpdated = await input.store.setKeepingTtl(
    input.keys.job(input.jobId),
    JSON.stringify(updated),
  );
  if (!recordUpdated) return null;

  await input.store.removeFromList(input.keys.pending, input.jobId);
  await input.store.removeFromList(input.keys.processing, input.jobId);
  await input.store.pushToList(input.keys.deadLetter, input.jobId);
  return updated;
}

export async function enqueueHermesJob(
  envelope: HermesJobEnvelope,
  context: QueueContext,
): Promise<HermesQueueEnqueueResult> {
  if (!context.enabled) return failure("disabled", "queue_disabled");
  if (!validateEnvelope(envelope)) return failure("failed", "job_envelope_invalid");

  const now = nowIso(context);
  if (isHermesJobExpired(envelope, now)) {
    return failure("failed", "job_expired");
  }
  const ttlSeconds = remainingTtlSeconds(envelope.runtime.expires_at, now);
  if (ttlSeconds <= 0) return failure("failed", "job_expired");
  const record = createRecord(envelope, now);

  try {
    return await useStore(context, async (store, keys) => {
      const status = await store.enqueueAtomic({
        dedupeKey: keys.dedupe(envelope.runtime.job_id),
        jobKey: keys.job(envelope.runtime.job_id),
        pendingKey: keys.pending,
        jobId: envelope.runtime.job_id,
        serializedRecord: JSON.stringify(record),
        ttlSeconds,
      });
      return {
        ok: true,
        status,
        request_id: envelope.runtime.request_id,
        job_id: envelope.runtime.job_id,
        duplicate: status === "duplicate",
        queue_name: keys.pending,
        queue_write_performed: status === "enqueued",
      };
    });
  } catch {
    return failure("not_ready", "redis_unavailable");
  }
}

export async function dequeueHermesJob(
  context: QueueContext,
): Promise<HermesQueueDequeueResult> {
  if (!context.enabled) return { ...failure("disabled", "queue_disabled"), job: null };
  const now = nowIso(context);

  try {
    return await useStore(context, async (store, keys) => {
      const jobId = await store.movePendingToProcessing(
        keys.pending,
        keys.processing,
      );
      if (jobId === null) return { ok: true, status: "empty", job: null };

      const serialized = await store.get(keys.job(jobId));
      if (serialized === null) {
        await store.removeFromList(keys.processing, jobId);
        return { ...failure("failed", "queue_record_missing"), job: null };
      }
      const record = parseRecord(serialized);
      if (isHermesJobExpired(record.job, now)) {
        const updated = await moveRecordToDeadLetter({
          store,
          keys,
          record,
          jobId,
          now,
          errorCode: "job_expired",
          terminalStatus: "expired",
        });
        if (updated === null) {
          await store.removeFromList(keys.processing, jobId);
          return { ...failure("failed", "queue_record_missing"), job: null };
        }
        return { ...failure("failed", "job_expired"), job: null };
      }

      const updated: HermesQueuedJobRecord = {
        ...record,
        job: transitionHermesJobEnvelope(record.job, "running", now),
        queue: {
          ...record.queue,
          status: "processing",
          dequeued_at: now,
        },
      };
      const recordUpdated = await store.setKeepingTtl(
        keys.job(jobId),
        JSON.stringify(updated),
      );
      if (!recordUpdated) {
        await store.removeFromList(keys.processing, jobId);
        return { ...failure("failed", "queue_record_missing"), job: null };
      }
      return { ok: true, status: "dequeued", job: updated };
    });
  } catch {
    return { ...failure("not_ready", "redis_unavailable"), job: null };
  }
}

export async function getHermesQueuedJobStatus(
  jobId: string,
  context: QueueContext,
): Promise<HermesQueueStatusResult> {
  if (!context.enabled) return { ...failure("disabled", "queue_disabled"), job: null };
  try {
    return await useStore(context, async (store, keys) => {
      const serialized = await store.get(keys.job(jobId));
      if (serialized === null) return { ok: true, status: "not_found", job: null };
      return {
        ok: true,
        status: "found",
        job: createHermesQueuedJobSummary(parseRecord(serialized)),
      };
    });
  } catch {
    return { ...failure("not_ready", "redis_unavailable"), job: null };
  }
}

export async function incrementHermesJobRetryCount(
  jobId: string,
  context: QueueContext,
): Promise<HermesQueueMutationResult> {
  if (!context.enabled) return { ...failure("disabled", "queue_disabled"), job: null };
  const now = nowIso(context);
  try {
    return await useStore(context, async (store, keys) => {
      const serialized = await store.get(keys.job(jobId));
      if (serialized === null) return { ...failure("failed", "queue_record_missing"), job: null };
      const record = parseRecord(serialized);
      if (record.queue.retry_count >= record.queue.max_retry_count) {
        return { ...failure("failed", "max_retry_count_reached"), job: null };
      }
      if (isHermesJobExpired(record.job, now)) {
        return { ...failure("failed", "job_expired"), job: null };
      }
      const updated: HermesQueuedJobRecord = {
        ...record,
        queue: { ...record.queue, retry_count: record.queue.retry_count + 1 },
      };
      const recordUpdated = await store.setKeepingTtl(
        keys.job(jobId),
        JSON.stringify(updated),
      );
      if (!recordUpdated) {
        return { ...failure("failed", "queue_record_missing"), job: null };
      }
      return { ok: true, status: "updated", job: createHermesQueuedJobSummary(updated) };
    });
  } catch {
    return { ...failure("not_ready", "redis_unavailable"), job: null };
  }
}

export async function isolateHermesQueuedJob(
  jobId: string,
  errorCode: HermesIsolationErrorCode,
  context: QueueContext,
): Promise<HermesQueueMutationResult> {
  if (!context.enabled) return { ...failure("disabled", "queue_disabled"), job: null };
  const now = nowIso(context);
  try {
    return await useStore(context, async (store, keys) => {
      const serialized = await store.get(keys.job(jobId));
      if (serialized === null) return { ...failure("failed", "queue_record_missing"), job: null };
      const record = parseRecord(serialized);
      if (record.queue.status !== "queued" && record.queue.status !== "processing") {
        return { ...failure("failed", "job_not_isolatable"), job: null };
      }
      if (isHermesJobExpired(record.job, now)) {
        return { ...failure("failed", "job_expired"), job: null };
      }
      const updated = await moveRecordToDeadLetter({
        store,
        keys,
        record,
        jobId,
        now,
        errorCode,
        terminalStatus: record.job.runtime.status === "running" ? "failed" : null,
      });
      if (updated === null) {
        return { ...failure("failed", "queue_record_missing"), job: null };
      }
      return { ok: true, status: "isolated", job: createHermesQueuedJobSummary(updated) };
    });
  } catch {
    return { ...failure("not_ready", "redis_unavailable"), job: null };
  }
}
