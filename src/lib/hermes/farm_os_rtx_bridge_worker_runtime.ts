import {
  FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS,
  FARM_OS_RTX_WORKER_ID,
  type FarmOsRtxBridgeCandidateRequest,
  type FarmOsRtxBridgeFailureRequest,
} from "./farm_os_rtx_worker_bridge_contract";
import {
  FARM_OS_RTX_BRIDGE_MAXIMUM_BACKOFF_MS,
  FarmOsRtxBridgeClientError,
  type FarmOsRtxBridgeLease,
  type FarmOsRtxBridgeClaimResult,
  type FarmOsRtxBridgeWorkerClientConfig,
} from "./farm_os_rtx_bridge_worker_client";
import {
  parseFarmOsRtxStructuringCandidate,
  validateFarmOsRtxCandidateGrounding,
} from "./farm_os_rtx_structuring_contract";
import {
  type FarmOsRtxNightTwoPassResult,
  type FarmOsRtxWorkerConfig,
  runFarmOsRtxRuntimeMode,
} from "./farm_os_rtx_worker_runtime";

export type FarmOsRtxBridgeWorkerRuntimeResult =
  | { status: "no_jobs" }
  | { status: "candidate_submitted"; job_id: string }
  | { status: "failure_submitted"; job_id: string; failure_code: string }
  | { status: "stopped" };

export const FARM_OS_RTX_HEARTBEAT_SAFETY_MARGIN_MS = 30_000;
export const FARM_OS_RTX_HEARTBEAT_MINIMUM_DELAY_MS = 1_000;
export const FARM_OS_RTX_HEARTBEAT_DEFAULT_MAX_INTERVAL_MS = Math.floor(
  FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS * 1_000 / 2,
);
export const FARM_OS_RTX_BRIDGE_WORKER_EVENTS = [
  "RTX_BRIDGE_JOB_CLAIMED",
  "RTX_BRIDGE_HEARTBEAT_LOOP_STARTED",
  "RTX_BRIDGE_HEARTBEAT_ACCEPTED",
  "RTX_BRIDGE_INFERENCE_COMPLETED",
  "RTX_BRIDGE_CANDIDATE_SUBMITTED",
  "RTX_BRIDGE_HEARTBEAT_LOOP_FAILED",
  "RTX_BRIDGE_INFERENCE_FAILED",
  "RTX_BRIDGE_LEASE_EXPIRED",
  "RTX_BRIDGE_OPERATION_REJECTED",
] as const;
export type FarmOsRtxBridgeWorkerEvent =
  typeof FARM_OS_RTX_BRIDGE_WORKER_EVENTS[number];

type ModelRunner = (input: {
  job: FarmOsRtxBridgeLease["job"];
  config: FarmOsRtxWorkerConfig;
  signal?: AbortSignal;
}) => Promise<FarmOsRtxNightTwoPassResult>;
type Sleep = (milliseconds: number, signal?: AbortSignal) => Promise<void>;
type Now = () => Date;
type SafeMetrics = FarmOsRtxBridgeCandidateRequest["worker_metrics"];
export type FarmOsRtxBridgeWorkerClientPort = {
  config: FarmOsRtxBridgeWorkerClientConfig;
  claim(): Promise<FarmOsRtxBridgeClaimResult>;
  heartbeat(lease: FarmOsRtxBridgeLease): Promise<FarmOsRtxBridgeLease>;
  submitCandidate(
    lease: FarmOsRtxBridgeLease,
    candidate: FarmOsRtxBridgeCandidateRequest["candidate"],
    metrics: FarmOsRtxBridgeCandidateRequest["worker_metrics"],
  ): Promise<"accepted" | "idempotent_replay">;
  submitFailure(
    lease: FarmOsRtxBridgeLease,
    code: FarmOsRtxBridgeFailureRequest["failure_code"],
    retryable: boolean,
    metrics: FarmOsRtxBridgeFailureRequest["safe_metrics"],
  ): Promise<"failure_recorded" | "idempotent_replay">;
};

const EMPTY_METRICS: SafeMetrics = Object.freeze({
  pass_1_latency_ms: null,
  pass_2_latency_ms: null,
  completion_tokens: null,
  handoff_bytes: null,
  candidate_bytes: null,
  reasoning_present: false,
  gpu_utilization_percent: null,
  gpu_temperature_celsius: null,
});

function defaultSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timeout = setTimeout(finish, milliseconds);
    const abort = () => {
      clearTimeout(timeout);
      finish();
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function leaseValid(lease: FarmOsRtxBridgeLease, now: Date): boolean {
  return lease.workerId === FARM_OS_RTX_WORKER_ID &&
    Number.isFinite(Date.parse(lease.leaseExpiresAt)) &&
    now.getTime() < Date.parse(lease.leaseExpiresAt);
}

export function computeFarmOsRtxHeartbeatDelayMs(input: {
  leaseExpiresAt: string;
  now: Date;
  maximumIntervalMs?: number;
  safetyMarginMs?: number;
}): number | null {
  const expiry = Date.parse(input.leaseExpiresAt);
  const now = input.now.getTime();
  const maximumInterval = input.maximumIntervalMs ??
    FARM_OS_RTX_HEARTBEAT_DEFAULT_MAX_INTERVAL_MS;
  const safetyMargin = input.safetyMarginMs ??
    FARM_OS_RTX_HEARTBEAT_SAFETY_MARGIN_MS;
  if (
    !Number.isFinite(expiry) ||
    !Number.isFinite(now) ||
    !Number.isFinite(maximumInterval) ||
    maximumInterval < FARM_OS_RTX_HEARTBEAT_MINIMUM_DELAY_MS ||
    !Number.isFinite(safetyMargin) ||
    safetyMargin < 0
  ) {
    return null;
  }
  const remaining = expiry - now;
  if (
    remaining <
      safetyMargin +
        FARM_OS_RTX_HEARTBEAT_MINIMUM_DELAY_MS
  ) {
    return null;
  }
  const delay = Math.min(
    Math.floor(maximumInterval),
    Math.floor(remaining / 3),
    remaining - safetyMargin,
  );
  return delay >= FARM_OS_RTX_HEARTBEAT_MINIMUM_DELAY_MS ? delay : null;
}

function metrics(result: FarmOsRtxNightTwoPassResult): SafeMetrics {
  const pass1 = result.pass_1;
  const pass2 = result.pass_2;
  return {
    pass_1_latency_ms: pass1.latency_ms,
    pass_2_latency_ms: pass2?.latency_ms ?? null,
    completion_tokens:
      (pass1.completion_tokens ?? 0) + (pass2?.completion_tokens ?? 0) || null,
    handoff_bytes: result.handoff_utf8_bytes,
    candidate_bytes: result.candidate === null
      ? null
      : Buffer.byteLength(JSON.stringify(result.candidate), "utf8"),
    reasoning_present: pass1.reasoning_content_present ||
      (pass2?.reasoning_content_present ?? false),
    gpu_utilization_percent: null,
    gpu_temperature_celsius: null,
  };
}

function failureCode(
  result: FarmOsRtxNightTwoPassResult,
): FarmOsRtxBridgeFailureRequest["failure_code"] {
  if (result.status === "night_analysis_failed") {
    return result.errors.some((value) =>
        value === "RTX_HTTP_ERROR" || value === "RTX_REQUEST_FAILED"
      )
      ? "lm_studio_unavailable"
      : result.errors.some((value) => value === "RTX_REQUEST_TIMEOUT")
      ? "request_timeout"
      : "analysis_failed";
  }
  return "structured_emit_failed";
}

export class FarmOsRtxBridgeWorkerRuntime {
  private readonly modelRunner: ModelRunner;
  private readonly sleep: Sleep;
  private readonly now: Now;

  constructor(private readonly dependencies: {
    client: FarmOsRtxBridgeWorkerClientPort;
    modelConfig: FarmOsRtxWorkerConfig;
    modelRunner?: ModelRunner;
    sleep?: Sleep;
    now?: Now;
    heartbeatIntervalMs?: number;
    heartbeatSafetyMarginMs?: number;
    onEvent?: (event: FarmOsRtxBridgeWorkerEvent) => void;
  }) {
    this.modelRunner = dependencies.modelRunner ??
      ((input) =>
        runFarmOsRtxRuntimeMode({
          mode: "night-two-pass",
          job: input.job,
          config: input.config,
          signal: input.signal,
        }) as Promise<FarmOsRtxNightTwoPassResult>);
    this.sleep = dependencies.sleep ?? defaultSleep;
    this.now = dependencies.now ?? (() => new Date());
  }

  private emit(event: FarmOsRtxBridgeWorkerEvent): void {
    try {
      this.dependencies.onEvent?.(event);
    } catch {
      // Diagnostics cannot change worker behavior.
    }
  }

  private async runHeartbeatLoop(
    initialLease: FarmOsRtxBridgeLease,
    signal: AbortSignal,
  ): Promise<FarmOsRtxBridgeLease> {
    let lease = initialLease;
    this.emit("RTX_BRIDGE_HEARTBEAT_LOOP_STARTED");
    while (!signal.aborted) {
      const heartbeatDelay = computeFarmOsRtxHeartbeatDelayMs({
        leaseExpiresAt: lease.leaseExpiresAt,
        now: this.now(),
        maximumIntervalMs: this.dependencies.heartbeatIntervalMs,
        safetyMarginMs: this.dependencies.heartbeatSafetyMarginMs,
      });
      if (heartbeatDelay === null) {
        this.emit("RTX_BRIDGE_LEASE_EXPIRED");
        throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
      }
      await this.sleep(heartbeatDelay, signal);
      if (signal.aborted) return lease;
      if (!leaseValid(lease, this.now())) {
        this.emit("RTX_BRIDGE_LEASE_EXPIRED");
        throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
      }
      lease = await this.dependencies.client.heartbeat(lease);
      if (!leaseValid(lease, this.now())) {
        this.emit("RTX_BRIDGE_LEASE_EXPIRED");
        throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
      }
      this.emit("RTX_BRIDGE_HEARTBEAT_ACCEPTED");
    }
    return lease;
  }

  async runOnce(signal?: AbortSignal): Promise<FarmOsRtxBridgeWorkerRuntimeResult> {
    if (signal?.aborted) return { status: "stopped" };
    const claimed = await this.dependencies.client.claim();
    if (claimed.result === "no_jobs") return { status: "no_jobs" };
    let lease = claimed.lease;
    this.emit("RTX_BRIDGE_JOB_CLAIMED");
    if (!leaseValid(lease, this.now())) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
    }
    if (
      computeFarmOsRtxHeartbeatDelayMs({
        leaseExpiresAt: lease.leaseExpiresAt,
        now: this.now(),
        maximumIntervalMs: this.dependencies.heartbeatIntervalMs,
        safetyMarginMs: this.dependencies.heartbeatSafetyMarginMs,
      }) === null
    ) {
      this.emit("RTX_BRIDGE_LEASE_EXPIRED");
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    }
    const heartbeatController = new AbortController();
    const inferenceController = new AbortController();
    const abortBoth = () => {
      heartbeatController.abort();
      inferenceController.abort();
    };
    signal?.addEventListener("abort", abortBoth, { once: true });
    const heartbeatTask = this.runHeartbeatLoop(
      lease,
      heartbeatController.signal,
    );
    const heartbeatOutcome = heartbeatTask.then(
      (value) => ({ kind: "heartbeat_stopped" as const, lease: value }),
      (error: unknown) => ({ kind: "heartbeat_failed" as const, error }),
    );
    const inferenceTask = Promise.resolve().then(() =>
      this.modelRunner({
        job: lease.job,
        config: this.dependencies.modelConfig,
        signal: inferenceController.signal,
      })
    );
    const inferenceOutcome = inferenceTask.then(
      (value) => ({ kind: "inference_completed" as const, value }),
      (error: unknown) => ({ kind: "inference_failed" as const, error }),
    );
    const outcome = await Promise.race([heartbeatOutcome, inferenceOutcome]);
    if (outcome.kind === "heartbeat_failed") {
      inferenceController.abort();
      inferenceTask.catch(() => undefined);
      this.emit("RTX_BRIDGE_HEARTBEAT_LOOP_FAILED");
      this.emit("RTX_BRIDGE_OPERATION_REJECTED");
      signal?.removeEventListener("abort", abortBoth);
      throw outcome.error instanceof FarmOsRtxBridgeClientError
        ? outcome.error
        : new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    }
    if (outcome.kind === "heartbeat_stopped") {
      inferenceController.abort();
      inferenceTask.catch(() => undefined);
      lease = outcome.lease;
      signal?.removeEventListener("abort", abortBoth);
      if (leaseValid(lease, this.now())) {
        await this.dependencies.client.submitFailure(
          lease,
          "worker_unavailable",
          true,
          EMPTY_METRICS,
        );
      }
      return { status: "stopped" };
    }
    heartbeatController.abort();
    const heartbeatResult = await heartbeatOutcome;
    signal?.removeEventListener("abort", abortBoth);
    if (heartbeatResult.kind === "heartbeat_failed") {
      inferenceController.abort();
      this.emit("RTX_BRIDGE_HEARTBEAT_LOOP_FAILED");
      this.emit("RTX_BRIDGE_OPERATION_REJECTED");
      throw heartbeatResult.error instanceof FarmOsRtxBridgeClientError
        ? heartbeatResult.error
        : new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    }
    lease = heartbeatResult.lease;
    if (outcome.kind === "inference_failed") {
      this.emit("RTX_BRIDGE_INFERENCE_FAILED");
      if (!leaseValid(lease, this.now())) {
        this.emit("RTX_BRIDGE_LEASE_EXPIRED");
        throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
      }
      await this.dependencies.client.submitFailure(
        lease,
        "unexpected_worker_error",
        true,
        EMPTY_METRICS,
      );
      return {
        status: "failure_submitted",
        job_id: lease.job.job_id,
        failure_code: "unexpected_worker_error",
      };
    }
    const result = outcome.value;
    this.emit(
      result.status === "candidate_ready"
        ? "RTX_BRIDGE_INFERENCE_COMPLETED"
        : "RTX_BRIDGE_INFERENCE_FAILED",
    );
    if (signal?.aborted) return { status: "stopped" };
    if (!leaseValid(lease, this.now())) {
      this.emit("RTX_BRIDGE_LEASE_EXPIRED");
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    }
    const safeMetrics = metrics(result);
    if (result.status !== "candidate_ready") {
      const code = failureCode(result);
      await this.dependencies.client.submitFailure(
        lease,
        code,
        result.retryable,
        safeMetrics,
      );
      return {
        status: "failure_submitted",
        job_id: lease.job.job_id,
        failure_code: code,
      };
    }
    const parsed = parseFarmOsRtxStructuringCandidate(result.candidate);
    if (!parsed.valid) {
      await this.dependencies.client.submitFailure(
        lease,
        "candidate_rejected",
        false,
        safeMetrics,
      );
      return {
        status: "failure_submitted",
        job_id: lease.job.job_id,
        failure_code: "candidate_rejected",
      };
    }
    const grounded = validateFarmOsRtxCandidateGrounding({
      job: lease.job,
      candidate: parsed.value,
    });
    if (!grounded.valid) {
      await this.dependencies.client.submitFailure(
        lease,
        "candidate_rejected",
        false,
        safeMetrics,
      );
      return {
        status: "failure_submitted",
        job_id: lease.job.job_id,
        failure_code: "candidate_rejected",
      };
    }
    await this.dependencies.client.submitCandidate(
      lease,
      grounded.value,
      safeMetrics,
    );
    this.emit("RTX_BRIDGE_CANDIDATE_SUBMITTED");
    return { status: "candidate_submitted", job_id: lease.job.job_id };
  }

  async run(signal: AbortSignal): Promise<"stopped"> {
    let failures = 0;
    while (!signal.aborted) {
      try {
        const result = await this.runOnce(signal);
        failures = 0;
        if (result.status === "stopped") break;
        await this.sleep(this.dependencies.client.config.pollIntervalMs, signal);
      } catch (error) {
        if (
          !(error instanceof FarmOsRtxBridgeClientError) ||
          !error.retryable
        ) throw error;
        failures += 1;
        const backoff = Math.min(
          this.dependencies.client.config.pollIntervalMs * 2 ** (failures - 1),
          FARM_OS_RTX_BRIDGE_MAXIMUM_BACKOFF_MS,
        );
        await this.sleep(backoff, signal);
      }
    }
    return "stopped";
  }
}
