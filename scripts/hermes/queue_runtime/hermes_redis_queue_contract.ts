import type { HermesJobEnvelope } from "../job_runtime/hermes_job_envelope";

export const HERMES_REDIS_KEY_PREFIX = "farmos:hermes";
export const HERMES_REDIS_PENDING_QUEUE_NAME = "farmos:hermes:queue:pending";
export const HERMES_REDIS_PROCESSING_QUEUE_NAME = "farmos:hermes:queue:processing";
export const HERMES_REDIS_DEAD_LETTER_QUEUE_NAME = "farmos:hermes:queue:dead-letter";
export const HERMES_QUEUE_MAX_RETRY_COUNT = 1;

export type HermesQueueRecordStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed"
  | "dead_letter";

export type HermesQueuedJobRecord = {
  schema_version: "hermes.queue.v1";
  job: HermesJobEnvelope;
  queue: {
    status: HermesQueueRecordStatus;
    retry_count: number;
    max_retry_count: number;
    enqueued_at: string;
    dequeued_at: string | null;
    completed_at: string | null;
    last_error_code: string | null;
  };
  safety: {
    db_write_performed: false;
    business_db_write_performed: false;
    proposal_write_performed: false;
    worker_execution_performed: false;
    model_execution_performed: false;
    fail_closed: true;
  };
};

export type HermesRedisQueueKeys = {
  prefix: string;
  pending: string;
  processing: string;
  deadLetter: string;
  job: (jobId: string) => string;
  dedupe: (jobId: string) => string;
};

export type HermesQueuedJobSummary = {
  schema_version: "hermes.queue.v1";
  request_id: string;
  job_id: string;
  job_status: HermesJobEnvelope["runtime"]["status"];
  queue_status: HermesQueueRecordStatus;
  retry_count: number;
  max_retry_count: number;
  enqueued_at: string;
  dequeued_at: string | null;
  completed_at: string | null;
  expires_at: string;
  message_length: number;
  include_readonly_context: boolean;
  safety: HermesQueuedJobRecord["safety"];
};

function assertSafeJobId(jobId: string): void {
  if (!/^[0-9a-z-]+$/iu.test(jobId)) throw new Error("queue_job_id_invalid");
}

export function createHermesRedisQueueKeys(
  prefix = HERMES_REDIS_KEY_PREFIX,
): HermesRedisQueueKeys {
  if (!/^[0-9a-z:-]+$/iu.test(prefix)) throw new Error("queue_prefix_invalid");
  return {
    prefix,
    pending: `${prefix}:queue:pending`,
    processing: `${prefix}:queue:processing`,
    deadLetter: `${prefix}:queue:dead-letter`,
    job: (jobId) => {
      assertSafeJobId(jobId);
      return `${prefix}:job:${jobId}`;
    },
    dedupe: (jobId) => {
      assertSafeJobId(jobId);
      return `${prefix}:dedupe:${jobId}`;
    },
  };
}

export function createHermesQueuedJobSummary(
  record: HermesQueuedJobRecord,
): HermesQueuedJobSummary {
  return {
    schema_version: record.schema_version,
    request_id: record.job.runtime.request_id,
    job_id: record.job.runtime.job_id,
    job_status: record.job.runtime.status,
    queue_status: record.queue.status,
    retry_count: record.queue.retry_count,
    max_retry_count: record.queue.max_retry_count,
    enqueued_at: record.queue.enqueued_at,
    dequeued_at: record.queue.dequeued_at,
    completed_at: record.queue.completed_at,
    expires_at: record.job.runtime.expires_at,
    message_length: record.job.payload.message.length,
    include_readonly_context: record.job.payload.include_readonly_context,
    safety: record.safety,
  };
}
