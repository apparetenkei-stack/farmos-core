import { createHermesJobEnvelope, transitionHermesJobEnvelope } from "./job_runtime/hermes_job_envelope";
import type { HermesQueuedJobRecord } from "./queue_runtime/hermes_redis_queue_contract";
import { calculateHermesRetryDelayMs, createHermesJobTimeoutPolicy, evaluateHermesRetryEligibility } from "./recovery_runtime/hermes_job_recovery_policy";
const now = "2026-07-12T00:00:00.000Z";
const envelope = createHermesJobEnvelope({ requestId: "00000000-0000-4000-8000-000000000101", jobIdFactory: () => "day101-preview-job", nowIsoFactory: () => now,
  payload: { message: "controlled preview input", include_readonly_context: false } });
const job: HermesQueuedJobRecord = { schema_version: "hermes.queue.v1", job: transitionHermesJobEnvelope(envelope, "running", now), queue: { status: "processing", retry_count: 0, max_retry_count: 1, enqueued_at: now, dequeued_at: now, completed_at: null, last_error_code: null },
  safety: { db_write_performed: false, business_db_write_performed: false, proposal_write_performed: false, worker_execution_performed: false, model_execution_performed: false, fail_closed: true } };
const limit = structuredClone(job); limit.queue.retry_count = 1;
const failed = structuredClone(job); failed.job = transitionHermesJobEnvelope(failed.job, "failed", now); failed.queue.status = "failed";
const queued = structuredClone(job); queued.job = envelope; queued.queue.status = "queued"; queued.queue.dequeued_at = null;
console.log(JSON.stringify({ schema_version: "hermes.recovery.preview.v1",
  worker_timeout: evaluateHermesRetryEligibility({ job, errorCode: "worker_timeout", nowIso: now }),
  failed_worker_timeout: evaluateHermesRetryEligibility({ job: failed, errorCode: "worker_timeout", nowIso: now }),
  queued_worker_timeout: evaluateHermesRetryEligibility({ job: queued, errorCode: "worker_timeout", nowIso: now }),
  invalid_payload: evaluateHermesRetryEligibility({ job, errorCode: "invalid_payload", nowIso: now }),
  retry_count_zero_delay_ms: calculateHermesRetryDelayMs(0),
  retry_limit: evaluateHermesRetryEligibility({ job: limit, errorCode: "worker_timeout", nowIso: now }),
  queued_cancellation: { eligible: true, worker_signal_sent: false }, running_cancellation: { eligible: true, model_interrupt_performed: false },
  timeout_policies: ["lightweight", "standard", "heavy"].map((x) => createHermesJobTimeoutPolicy(x as "lightweight" | "standard" | "heavy")),
  external_redis_connection_performed: false, db_write_performed: false, model_execution_performed: false }, null, 2));
