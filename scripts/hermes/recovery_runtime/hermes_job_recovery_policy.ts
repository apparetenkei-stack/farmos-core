import { randomUUID } from "node:crypto";
import { HERMES_QUEUE_MAX_RETRY_COUNT, type HermesQueuedJobRecord } from "../queue_runtime/hermes_redis_queue_contract";
import type { HermesJobEnvelope } from "../job_runtime/hermes_job_envelope";
import {
  HERMES_NON_RETRYABLE_ERROR_CODES, HERMES_RETRYABLE_ERROR_CODES,
  type HermesCancellationRequest, type HermesJobTimeoutClass,
  type HermesJobTimeoutPolicy, type HermesRetryEligibility,
  type HermesRetryPolicy, type HermesRetrySchedule,
} from "./hermes_job_recovery_contract";

const TIMEOUT_MS: Readonly<Record<HermesJobTimeoutClass, number>> = {
  lightweight: 60_000, standard: 180_000, heavy: 600_000,
};

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("recovery_timestamp_invalid");
  return parsed;
}

export const HERMES_RETRY_POLICY: HermesRetryPolicy = {
  schema_version: "hermes.retry.policy.v1",
  max_retry_count: HERMES_QUEUE_MAX_RETRY_COUNT,
  backoff_strategy: "exponential", base_delay_ms: 5000,
  max_delay_ms: 60000, jitter_enabled: false,
  retryable_error_codes: HERMES_RETRYABLE_ERROR_CODES,
  non_retryable_error_codes: HERMES_NON_RETRYABLE_ERROR_CODES,
  safety: {
    automatic_execution_performed: false, duplicate_retry_allowed: false,
    terminal_job_revival_allowed: false, model_execution_performed: false,
    db_write_performed: false, fail_closed: true,
  },
};

export function createHermesJobTimeoutPolicy(timeoutClass: HermesJobTimeoutClass): HermesJobTimeoutPolicy {
  if (!(timeoutClass in TIMEOUT_MS)) throw new Error("timeout_class_invalid");
  return {
    schema_version: "hermes.timeout.policy.v1", timeout_class: timeoutClass,
    timeout_ms: TIMEOUT_MS[timeoutClass], source: "server_policy",
    safety: { client_timeout_override_allowed: false, timeout_timer_started: false,
      model_execution_performed: false, db_write_performed: false, fail_closed: true },
  };
}

export function isHermesJobTimedOut(input: { startedAtIso: string; nowIso: string; policy: HermesJobTimeoutPolicy }): boolean {
  const started = timestamp(input.startedAtIso);
  const now = timestamp(input.nowIso);
  return now - started >= input.policy.timeout_ms;
}

export function isHermesRetryableErrorCode(errorCode: string): boolean {
  return (HERMES_RETRYABLE_ERROR_CODES as readonly string[]).includes(errorCode);
}

export function calculateHermesRetryDelayMs(retryCount: number): number {
  if (!Number.isInteger(retryCount) || retryCount < 0) throw new Error("retry_count_invalid");
  return Math.min(HERMES_RETRY_POLICY.base_delay_ms * (2 ** retryCount), HERMES_RETRY_POLICY.max_delay_ms);
}

function recordValid(job: HermesQueuedJobRecord): boolean {
  return job?.schema_version === "hermes.queue.v1" && job.job?.schema_version === "hermes.job.v1" &&
    Number.isInteger(job.queue?.retry_count) && job.queue.retry_count >= 0 &&
    job.queue.max_retry_count === HERMES_RETRY_POLICY.max_retry_count;
}

export function evaluateHermesRetryEligibility(input: {
  job: HermesQueuedJobRecord; errorCode: string; nowIso: string; retryAlreadyRegistered?: boolean;
}): HermesRetryEligibility {
  if (!recordValid(input.job)) return denied("retry_record_invalid");
  let now: number;
  let expires: number;
  try { now = timestamp(input.nowIso); expires = timestamp(input.job.job.runtime.expires_at); }
  catch { return denied("retry_record_invalid"); }
  const status = input.job.job.runtime.status;
  if (input.retryAlreadyRegistered) return denied("retry_duplicate");
  if (input.job.queue.retry_count >= input.job.queue.max_retry_count) return denied("retry_limit_reached");
  if (status !== "running" && status !== "failed") return denied("retry_job_status_not_allowed");
  if (now >= expires) return denied("retry_job_expired");
  if (!isHermesRetryableErrorCode(input.errorCode)) return denied("retry_error_not_allowed");
  const delay = calculateHermesRetryDelayMs(input.job.queue.retry_count);
  const notBefore = now + delay;
  if (notBefore >= expires) return denied("retry_window_unavailable");
  return { retryable: true, reason_code: "retry_allowed", retry_delay_ms: delay,
    retry_not_before: new Date(notBefore).toISOString(), fail_closed: true };
}

function denied(reason: HermesRetryEligibility["reason_code"]): HermesRetryEligibility {
  return { retryable: false, reason_code: reason, retry_delay_ms: null, retry_not_before: null, fail_closed: true };
}

export function transitionHermesJobToRetryScheduledForRecovery(input: {
  job: HermesJobEnvelope;
  eligibility: HermesRetryEligibility;
  nowIso: string;
}): HermesJobEnvelope {
  if (!input.eligibility.retryable || input.eligibility.reason_code !== "retry_allowed") {
    throw new Error("retry_eligibility_not_approved");
  }
  if (input.job.runtime.status !== "running" && input.job.runtime.status !== "failed") {
    throw new Error("retry_job_status_not_allowed");
  }
  const updatedAt = new Date(timestamp(input.nowIso)).toISOString();
  return { ...input.job, runtime: { ...input.job.runtime, status: "retry_scheduled", updated_at: updatedAt } };
}

export function createHermesRetrySchedule(input: { job: HermesQueuedJobRecord; errorCode: string; nowIso: string; previousClaimId: string | null; retryIdFactory?: () => string }): HermesRetrySchedule {
  const eligibility = evaluateHermesRetryEligibility({ job: input.job, errorCode: input.errorCode, nowIso: input.nowIso });
  if (!eligibility.retryable || eligibility.retry_not_before === null) throw new Error(eligibility.reason_code);
  return { schema_version: "hermes.retry.schedule.v1", retry_id: (input.retryIdFactory ?? randomUUID)(),
    job_id: input.job.job.runtime.job_id, request_id: input.job.job.runtime.request_id,
    previous_claim_id: input.previousClaimId, retry_count: input.job.queue.retry_count + 1,
    retry_reason_code: input.errorCode, scheduled_at: new Date(timestamp(input.nowIso)).toISOString(),
    retry_not_before: eligibility.retry_not_before, status: "scheduled",
    safety: { model_execution_performed: false, worker_execution_performed: false,
      queue_reenqueue_performed: false, db_write_performed: false, fail_closed: true } };
}

export function createHermesCancellationRequest(input: { jobId: string; requestId: string; requestedAtIso: string; cancellationIdFactory?: () => string }): HermesCancellationRequest {
  if (!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(input.jobId) || input.requestId.length === 0) throw new Error("cancel_request_invalid");
  return { schema_version: "hermes.cancel.request.v1", cancellation_id: (input.cancellationIdFactory ?? randomUUID)(),
    job_id: input.jobId, request_id: input.requestId, requested_by: "user",
    requested_at: new Date(timestamp(input.requestedAtIso)).toISOString(), reason_code: "user_requested",
    safety: { model_interrupt_performed: false, worker_signal_sent: false, db_write_performed: false, fail_closed: true } };
}
