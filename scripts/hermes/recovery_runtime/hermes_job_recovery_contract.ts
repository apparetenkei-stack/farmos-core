import type { HermesQueuedJobRecord } from "../queue_runtime/hermes_redis_queue_contract";

export const HERMES_RETRYABLE_ERROR_CODES = [
  "worker_unavailable", "worker_offline", "worker_heartbeat_stale",
  "worker_runtime_unavailable", "worker_timeout", "model_timeout",
  "model_temporarily_unavailable", "provider_temporarily_unavailable",
  "queue_temporarily_unavailable", "worker_lost_claim",
] as const;

export const HERMES_NON_RETRYABLE_ERROR_CODES = [
  "invalid_request", "invalid_payload", "message_too_long",
  "multiline_message_not_allowed", "capability_unavailable",
  "routing_not_allowed", "worker_capability_unavailable",
  "worker_record_invalid", "authorization_failed", "forbidden",
  "cancelled_by_user", "job_expired", "retry_limit_reached",
  "proposal_policy_blocked",
] as const;

export type HermesJobTimeoutClass = "lightweight" | "standard" | "heavy";
export type HermesJobTimeoutPolicy = {
  schema_version: "hermes.timeout.policy.v1";
  timeout_class: HermesJobTimeoutClass;
  timeout_ms: number;
  source: "server_policy";
  safety: {
    client_timeout_override_allowed: false;
    timeout_timer_started: false;
    model_execution_performed: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export type HermesRetryPolicy = {
  schema_version: "hermes.retry.policy.v1";
  max_retry_count: 1;
  backoff_strategy: "exponential";
  base_delay_ms: 5000;
  max_delay_ms: 60000;
  jitter_enabled: false;
  retryable_error_codes: typeof HERMES_RETRYABLE_ERROR_CODES;
  non_retryable_error_codes: typeof HERMES_NON_RETRYABLE_ERROR_CODES;
  safety: {
    automatic_execution_performed: false;
    duplicate_retry_allowed: false;
    terminal_job_revival_allowed: false;
    model_execution_performed: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export type HermesRetrySchedule = {
  schema_version: "hermes.retry.schedule.v1";
  retry_id: string;
  job_id: string;
  request_id: string;
  previous_claim_id: string | null;
  retry_count: number;
  retry_reason_code: string;
  scheduled_at: string;
  retry_not_before: string;
  status: "scheduled";
  safety: {
    model_execution_performed: false;
    worker_execution_performed: false;
    queue_reenqueue_performed: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export type HermesCancellationRequest = {
  schema_version: "hermes.cancel.request.v1";
  cancellation_id: string;
  job_id: string;
  request_id: string;
  requested_by: "user";
  requested_at: string;
  reason_code: "user_requested";
  safety: {
    model_interrupt_performed: false;
    worker_signal_sent: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export type HermesRetryEligibilityReason =
  | "retry_allowed" | "retry_error_not_allowed" | "retry_limit_reached"
  | "retry_job_status_not_allowed" | "retry_job_expired" | "retry_window_unavailable"
  | "retry_duplicate" | "retry_record_invalid";

export type HermesRetryEligibility = {
  retryable: boolean;
  reason_code: HermesRetryEligibilityReason;
  retry_delay_ms: number | null;
  retry_not_before: string | null;
  fail_closed: true;
};

export type HermesRecoveryKeys = {
  prefix: string;
  pending: string;
  processing: string;
  deadLetter: string;
  job: (jobId: string) => string;
  claim: (jobId: string) => string;
  worker: (workerId: string) => string;
  retry: (jobId: string, retryCount: number) => string;
  cancel: (jobId: string) => string;
};

export type HermesRecoveryResult =
  | { ok: true; status: "retry_scheduled"; schedule: HermesRetrySchedule; job: HermesQueuedJobRecord }
  | { ok: true; status: "cancelled" | "already_cancelled"; cancellation: HermesCancellationRequest; job: HermesQueuedJobRecord }
  | { ok: false; status: "disabled" | "not_ready" | "failed"; error_code: string; recovery_write_performed: false; fail_closed: true };
