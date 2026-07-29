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

type ModelRunner = (input: {
  job: FarmOsRtxBridgeLease["job"];
  config: FarmOsRtxWorkerConfig;
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
    const timeout = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function leaseValid(lease: FarmOsRtxBridgeLease, now: Date): boolean {
  return lease.workerId === FARM_OS_RTX_WORKER_ID &&
    Number.isFinite(Date.parse(lease.leaseExpiresAt)) &&
    now.getTime() < Date.parse(lease.leaseExpiresAt);
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
  }) {
    this.modelRunner = dependencies.modelRunner ??
      ((input) =>
        runFarmOsRtxRuntimeMode({
          mode: "night-two-pass",
          job: input.job,
          config: input.config,
        }) as Promise<FarmOsRtxNightTwoPassResult>);
    this.sleep = dependencies.sleep ?? defaultSleep;
    this.now = dependencies.now ?? (() => new Date());
  }

  async runOnce(signal?: AbortSignal): Promise<FarmOsRtxBridgeWorkerRuntimeResult> {
    if (signal?.aborted) return { status: "stopped" };
    const claimed = await this.dependencies.client.claim();
    if (claimed.result === "no_jobs") return { status: "no_jobs" };
    let lease = claimed.lease;
    if (!leaseValid(lease, this.now())) {
      throw new FarmOsRtxBridgeClientError("BRIDGE_RESPONSE_INVALID");
    }
    const heartbeatInterval = this.dependencies.heartbeatIntervalMs ??
      Math.floor(
        FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS * 1_000 / 2,
      );
    const work = this.modelRunner({
      job: lease.job,
      config: this.dependencies.modelConfig,
    });
    const completion = work.then(
      (value) => ({ completed: true as const, value }),
      () => ({ completed: true as const, value: null }),
    );
    let result: FarmOsRtxNightTwoPassResult | null = null;
    while (result === null) {
      const next = await Promise.race([
        completion,
        this.sleep(heartbeatInterval, signal).then(() => ({
          completed: false as const,
          value: null,
        })),
      ]);
      if (next.completed) {
        if (next.value === null) {
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
        result = next.value;
        break;
      }
      if (signal?.aborted) {
        work.catch(() => undefined);
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
      if (!leaseValid(lease, this.now())) {
        throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
      }
      lease = await this.dependencies.client.heartbeat(lease);
    }
    if (!leaseValid(lease, this.now())) {
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
