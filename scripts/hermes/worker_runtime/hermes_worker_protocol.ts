import { randomUUID } from "node:crypto";

import type { HermesQueuedJobRecord } from "../queue_runtime/hermes_redis_queue_contract";

export const HERMES_WORKER_HEARTBEAT_INTERVAL_MS = 15_000;
export const HERMES_WORKER_HEARTBEAT_TIMEOUT_MS = 45_000;

export const HERMES_WORKER_CAPABILITIES = [
  "lightweight_chat",
  "structured_summary",
  "classification",
  "readonly_context_analysis",
  "heavy_reasoning",
  "large_context",
  "gpu_inference",
] as const;

export const HERMES_MAC_MINI_DEFAULT_CAPABILITIES = [
  "lightweight_chat",
  "structured_summary",
  "classification",
  "readonly_context_analysis",
] as const;

export const HERMES_RTX_DEFAULT_CAPABILITIES = [
  "heavy_reasoning",
  "large_context",
  "gpu_inference",
] as const;

export type HermesWorkerType = "mac_mini" | "rtx";
export type HermesWorkerHealth = "healthy" | "degraded" | "unhealthy" | "unknown";
export type HermesWorkerReadiness = "ready" | "not_ready" | "draining" | "offline";
export type HermesWorkerCapability = (typeof HERMES_WORKER_CAPABILITIES)[number];

export type HermesWorkerAdvertisement = {
  schema_version: "hermes.worker.v1";
  worker_id: string;
  worker_type: HermesWorkerType;
  capabilities: HermesWorkerCapability[];
  health: HermesWorkerHealth;
  readiness: HermesWorkerReadiness;
  runtime_available: boolean;
  draining: boolean;
  heartbeat_interval_ms: 15000;
  heartbeat_timeout_ms: 45000;
  registered_at: string;
  last_heartbeat_at: string;
  current_job_id: string | null;
  active_job_count: number;
  max_concurrency: number;
  safety: {
    secret_stored: false;
    credentials_stored: false;
    db_write_performed: false;
    worker_execution_performed: false;
    model_execution_performed: false;
    fail_closed: true;
  };
};

export type HermesWorkerJobClaim = {
  schema_version: "hermes.worker.claim.v1";
  claim_id: string;
  request_id: string;
  job_id: string;
  worker_id: string;
  required_capability: HermesWorkerCapability;
  claimed_at: string;
  claim_status: "claimed";
  safety: {
    worker_execution_performed: false;
    model_execution_performed: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export function assertHermesWorkerId(workerId: string): void {
  if (
    workerId.length === 0 ||
    workerId.length > 64 ||
    !/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(workerId) ||
    workerId.toLowerCase() === "localhost" ||
    /^\d{1,3}(?:[.-]\d{1,3}){3}$/u.test(workerId)
  ) {
    throw new Error("worker_id_invalid");
  }
}

export type HermesWorkerJobResult = {
  schema_version: "hermes.worker.result.v1";
  claim_id: string;
  request_id: string;
  job_id: string;
  worker_id: string;
  status: "succeeded" | "failed";
  error_code: "worker_protocol_dry_run_failed" | null;
  completed_at: string;
  output_persisted: false;
  safety: {
    worker_execution_performed: false;
    model_execution_performed: false;
    db_write_performed: false;
    proposal_write_performed: false;
    audit_write_performed: false;
    fail_closed: true;
  };
};

function parseIso(value: string): number {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new Error("worker_timestamp_invalid");
  return milliseconds;
}

function normalizeCapabilities(input: readonly string[]): HermesWorkerCapability[] {
  const allowed = new Set<string>(HERMES_WORKER_CAPABILITIES);
  if (input.length === 0 || input.some((capability) => !allowed.has(capability))) {
    throw new Error("worker_capability_invalid");
  }
  return [...new Set(input)] as HermesWorkerCapability[];
}

function assertCapacity(input: {
  currentJobId: string | null;
  activeJobCount: number;
  maxConcurrency: number;
}): void {
  if (
    !Number.isInteger(input.activeJobCount) ||
    input.activeJobCount < 0 ||
    !Number.isInteger(input.maxConcurrency) ||
    input.maxConcurrency < 1 ||
    input.activeJobCount > input.maxConcurrency ||
    (input.activeJobCount === 0 && input.currentJobId !== null) ||
    (input.activeJobCount > 0 && input.currentJobId === null)
  ) {
    throw new Error("worker_capacity_invalid");
  }
  if (input.currentJobId !== null) assertHermesWorkerId(input.currentJobId);
}

export function isHermesWorkerHeartbeatStale(
  lastHeartbeatAt: string,
  nowIso: string,
): boolean {
  return parseIso(nowIso) - parseIso(lastHeartbeatAt) >= HERMES_WORKER_HEARTBEAT_TIMEOUT_MS;
}

export function deriveHermesWorkerReadiness(input: {
  health: HermesWorkerHealth;
  runtimeAvailable: boolean;
  draining: boolean;
  lastHeartbeatAt: string;
  nowIso: string;
}): HermesWorkerReadiness {
  if (isHermesWorkerHeartbeatStale(input.lastHeartbeatAt, input.nowIso)) return "offline";
  if (input.draining) return "draining";
  if (!input.runtimeAvailable || input.health === "unhealthy") return "not_ready";
  return "ready";
}

export function createHermesWorkerAdvertisement(input: {
  workerId: string;
  workerType: HermesWorkerType;
  capabilities: readonly string[];
  health: HermesWorkerHealth;
  runtimeAvailable: boolean;
  draining: boolean;
  nowIso: string;
  currentJobId?: string | null;
  activeJobCount?: number;
  maxConcurrency?: number;
}): HermesWorkerAdvertisement {
  assertHermesWorkerId(input.workerId);
  const currentJobId = input.currentJobId ?? null;
  const activeJobCount = input.activeJobCount ?? 0;
  const maxConcurrency = input.maxConcurrency ?? 1;
  assertCapacity({ currentJobId, activeJobCount, maxConcurrency });
  const timestamp = new Date(parseIso(input.nowIso)).toISOString();
  return {
    schema_version: "hermes.worker.v1",
    worker_id: input.workerId,
    worker_type: input.workerType,
    capabilities: normalizeCapabilities(input.capabilities),
    health: input.health,
    readiness: deriveHermesWorkerReadiness({
      health: input.health,
      runtimeAvailable: input.runtimeAvailable,
      draining: input.draining,
      lastHeartbeatAt: timestamp,
      nowIso: timestamp,
    }),
    runtime_available: input.runtimeAvailable,
    draining: input.draining,
    heartbeat_interval_ms: HERMES_WORKER_HEARTBEAT_INTERVAL_MS,
    heartbeat_timeout_ms: HERMES_WORKER_HEARTBEAT_TIMEOUT_MS,
    registered_at: timestamp,
    last_heartbeat_at: timestamp,
    current_job_id: currentJobId,
    active_job_count: activeJobCount,
    max_concurrency: maxConcurrency,
    safety: {
      secret_stored: false,
      credentials_stored: false,
      db_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
      fail_closed: true,
    },
  };
}

export function applyHermesWorkerHeartbeat(
  worker: HermesWorkerAdvertisement,
  input: {
    health: HermesWorkerHealth;
    runtimeAvailable: boolean;
    draining: boolean;
    nowIso: string;
    currentJobId?: string | null;
    activeJobCount?: number;
    maxConcurrency?: number;
  },
): HermesWorkerAdvertisement {
  const timestamp = new Date(parseIso(input.nowIso)).toISOString();
  const currentJobId = input.currentJobId ?? worker.current_job_id;
  const activeJobCount = input.activeJobCount ?? worker.active_job_count;
  const maxConcurrency = input.maxConcurrency ?? worker.max_concurrency;
  assertCapacity({ currentJobId, activeJobCount, maxConcurrency });
  return {
    ...worker,
    health: input.health,
    readiness: deriveHermesWorkerReadiness({
      health: input.health,
      runtimeAvailable: input.runtimeAvailable,
      draining: input.draining,
      lastHeartbeatAt: timestamp,
      nowIso: timestamp,
    }),
    runtime_available: input.runtimeAvailable,
    draining: input.draining,
    last_heartbeat_at: timestamp,
    current_job_id: currentJobId,
    active_job_count: activeJobCount,
    max_concurrency: maxConcurrency,
  };
}

export function evaluateHermesWorkerAt(
  worker: HermesWorkerAdvertisement,
  nowIso: string,
): HermesWorkerAdvertisement {
  return {
    ...worker,
    readiness: deriveHermesWorkerReadiness({
      health: worker.health,
      runtimeAvailable: worker.runtime_available,
      draining: worker.draining,
      lastHeartbeatAt: worker.last_heartbeat_at,
      nowIso,
    }),
  };
}

export function createHermesWorkerJobClaim(input: {
  worker: HermesWorkerAdvertisement;
  job: HermesQueuedJobRecord;
  requiredCapability: HermesWorkerCapability;
  nowIso: string;
  claimIdFactory?: () => string;
}): HermesWorkerJobClaim {
  assertHermesWorkerId(input.worker.worker_id);
  const evaluatedWorker = evaluateHermesWorkerAt(input.worker, input.nowIso);
  if (evaluatedWorker.readiness !== "ready") throw new Error("worker_not_ready");
  if (evaluatedWorker.active_job_count >= evaluatedWorker.max_concurrency) {
    throw new Error("worker_capacity_full");
  }
  if (!evaluatedWorker.capabilities.includes(input.requiredCapability)) {
    throw new Error("worker_capability_unavailable");
  }
  if (input.job.queue.status !== "processing" || input.job.job.runtime.status !== "running") {
    throw new Error("worker_job_not_claimable");
  }
  return {
    schema_version: "hermes.worker.claim.v1",
    claim_id: (input.claimIdFactory ?? randomUUID)(),
    request_id: input.job.job.runtime.request_id,
    job_id: input.job.job.runtime.job_id,
    worker_id: input.worker.worker_id,
    required_capability: input.requiredCapability,
    claimed_at: new Date(parseIso(input.nowIso)).toISOString(),
    claim_status: "claimed",
    safety: {
      worker_execution_performed: false,
      model_execution_performed: false,
      db_write_performed: false,
      fail_closed: true,
    },
  };
}

export function createHermesWorkerJobResult(input: {
  claim: HermesWorkerJobClaim;
  status: "succeeded" | "failed";
  nowIso: string;
}): HermesWorkerJobResult {
  return {
    schema_version: "hermes.worker.result.v1",
    claim_id: input.claim.claim_id,
    request_id: input.claim.request_id,
    job_id: input.claim.job_id,
    worker_id: input.claim.worker_id,
    status: input.status,
    error_code: input.status === "failed" ? "worker_protocol_dry_run_failed" : null,
    completed_at: new Date(parseIso(input.nowIso)).toISOString(),
    output_persisted: false,
    safety: {
      worker_execution_performed: false,
      model_execution_performed: false,
      db_write_performed: false,
      proposal_write_performed: false,
      audit_write_performed: false,
      fail_closed: true,
    },
  };
}

export function assertHermesWorkerJobResultMatchesClaim(
  result: HermesWorkerJobResult,
  claim: HermesWorkerJobClaim,
): void {
  if (
    result.claim_id !== claim.claim_id ||
    result.job_id !== claim.job_id ||
    result.worker_id !== claim.worker_id ||
    result.request_id !== claim.request_id ||
    (result.status === "succeeded" && result.error_code !== null) ||
    (result.status === "failed" &&
      result.error_code !== "worker_protocol_dry_run_failed") ||
    Object.hasOwn(result, "output") ||
    Object.hasOwn(result, "response")
  ) {
    throw new Error("worker_result_contract_mismatch");
  }
}
