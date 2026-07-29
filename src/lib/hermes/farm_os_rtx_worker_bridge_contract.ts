import type {
  FarmOsRtxStructuringCandidate,
} from "./farm_os_rtx_structuring_contract";

export const FARM_OS_RTX_WORKER_BRIDGE_CONTRACT =
  "farmos.operational_memory.rtx_worker_bridge.v1" as const;
export const FARM_OS_RTX_WORKER_ID = "worker_windows_main_01" as const;
export const FARM_OS_RTX_BRIDGE_HMAC_KEY_ENV =
  "FARMOS_RTX_BRIDGE_HMAC_KEY" as const;
export const FARM_OS_RTX_BRIDGE_NETWORK_POLICY = {
  allowed_bind: ["loopback_behind_existing_private_proxy", "tailscale_interface"],
  public_access: false,
  ordinary_lan_access: false,
  tailscale_only: true,
  tls_or_private_overlay_required: true,
} as const;
export const FARM_OS_RTX_BRIDGE_PATHS = {
  claim: "/internal/rtx-worker/v1/claim",
  submit_candidate: "/internal/rtx-worker/v1/candidate",
  submit_failure: "/internal/rtx-worker/v1/failure",
  heartbeat: "/internal/rtx-worker/v1/heartbeat",
} as const;
export const FARM_OS_RTX_BRIDGE_REQUEST_LIMITS = {
  claim: 4096,
  heartbeat: 4096,
  submit_failure: 8192,
  submit_candidate: 32768,
} as const;
export const FARM_OS_RTX_BRIDGE_RESPONSE_LIMITS = {
  claim: 65536,
  ordinary: 8192,
} as const;
export const FARM_OS_RTX_BRIDGE_TIMESTAMP_TOLERANCE_SECONDS = 60 as const;
export const FARM_OS_RTX_BRIDGE_NONCE_RETENTION_SECONDS = 600 as const;
export const FARM_OS_RTX_BRIDGE_HEARTBEAT_EXTENSION_SECONDS = 600 as const;
export const FARM_OS_RTX_BRIDGE_MAXIMUM_EXTENSIONS = 2 as const;

export type FarmOsRtxBridgeOperation = keyof typeof FARM_OS_RTX_BRIDGE_PATHS;

export const FARM_OS_RTX_BRIDGE_FAILURE_CODES = [
  "worker_unavailable",
  "lm_studio_unavailable",
  "model_unavailable",
  "analysis_failed",
  "structured_emit_failed",
  "request_timeout",
  "candidate_rejected",
  "unexpected_worker_error",
] as const;

type SafeMetrics = {
  pass_1_latency_ms: number | null;
  pass_2_latency_ms: number | null;
  completion_tokens: number | null;
  handoff_bytes: number | null;
  candidate_bytes: number | null;
  reasoning_present: boolean;
  gpu_utilization_percent: number | null;
  gpu_temperature_celsius: number | null;
};

export type FarmOsRtxBridgeClaimRequest = {
  contract_version: typeof FARM_OS_RTX_WORKER_BRIDGE_CONTRACT;
  worker_capabilities: { night_two_pass: true };
  maximum_jobs: 1;
};
export type FarmOsRtxBridgeHeartbeatRequest = {
  contract_version: typeof FARM_OS_RTX_WORKER_BRIDGE_CONTRACT;
  job_id: string;
  lease_receipt: string;
};
export type FarmOsRtxBridgeCandidateRequest = {
  contract_version: typeof FARM_OS_RTX_WORKER_BRIDGE_CONTRACT;
  job_id: string;
  lease_receipt: string;
  candidate: FarmOsRtxStructuringCandidate;
  worker_metrics: SafeMetrics;
};
export type FarmOsRtxBridgeFailureRequest = {
  contract_version: typeof FARM_OS_RTX_WORKER_BRIDGE_CONTRACT;
  job_id: string;
  lease_receipt: string;
  failure_code: typeof FARM_OS_RTX_BRIDGE_FAILURE_CODES[number];
  retryable: boolean;
  safe_metrics: SafeMetrics;
};

export type FarmOsRtxBridgeRequest =
  | FarmOsRtxBridgeClaimRequest
  | FarmOsRtxBridgeHeartbeatRequest
  | FarmOsRtxBridgeCandidateRequest
  | FarmOsRtxBridgeFailureRequest;

type RecordValue = Record<string, unknown>;
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const RECEIPT = /^[A-Za-z0-9_-]{32,128}$/u;
const METRIC_KEYS = [
  "pass_1_latency_ms",
  "pass_2_latency_ms",
  "completion_tokens",
  "handoff_bytes",
  "candidate_bytes",
  "reasoning_present",
  "gpu_utilization_percent",
  "gpu_temperature_celsius",
] as const;

function record(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(value: RecordValue, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}
function boundedInteger(value: unknown, maximum: number): boolean {
  return value === null ||
    (Number.isSafeInteger(value) && Number(value) >= 0 &&
      Number(value) <= maximum);
}
function metrics(value: unknown): value is SafeMetrics {
  if (!record(value) || !exact(value, METRIC_KEYS)) return false;
  return boundedInteger(value.pass_1_latency_ms, 86_400_000) &&
    boundedInteger(value.pass_2_latency_ms, 86_400_000) &&
    boundedInteger(value.completion_tokens, 1_000_000) &&
    boundedInteger(value.handoff_bytes, 1_000_000) &&
    boundedInteger(value.candidate_bytes, 1_000_000) &&
    typeof value.reasoning_present === "boolean" &&
    (value.gpu_utilization_percent === null ||
      (typeof value.gpu_utilization_percent === "number" &&
        Number.isFinite(value.gpu_utilization_percent) &&
        value.gpu_utilization_percent >= 0 &&
        value.gpu_utilization_percent <= 100)) &&
    (value.gpu_temperature_celsius === null ||
      (typeof value.gpu_temperature_celsius === "number" &&
        Number.isFinite(value.gpu_temperature_celsius) &&
        value.gpu_temperature_celsius >= -50 &&
        value.gpu_temperature_celsius <= 150));
}

export function parseFarmOsRtxBridgeRequest(
  operation: FarmOsRtxBridgeOperation,
  value: unknown,
): FarmOsRtxBridgeRequest | null {
  if (!record(value) ||
    value.contract_version !== FARM_OS_RTX_WORKER_BRIDGE_CONTRACT) return null;
  if (operation === "claim") {
    if (!exact(value, [
      "contract_version",
      "worker_capabilities",
      "maximum_jobs",
    ]) || !record(value.worker_capabilities) ||
      !exact(value.worker_capabilities, ["night_two_pass"]) ||
      value.worker_capabilities.night_two_pass !== true ||
      value.maximum_jobs !== 1) return null;
    return structuredClone(value) as FarmOsRtxBridgeClaimRequest;
  }
  if (operation === "heartbeat") {
    if (!exact(value, ["contract_version", "job_id", "lease_receipt"]) ||
      typeof value.job_id !== "string" || !IDENTIFIER.test(value.job_id) ||
      typeof value.lease_receipt !== "string" ||
      !RECEIPT.test(value.lease_receipt)) return null;
    return structuredClone(value) as FarmOsRtxBridgeHeartbeatRequest;
  }
  if (operation === "submit_candidate") {
    if (!exact(value, [
      "contract_version",
      "job_id",
      "lease_receipt",
      "candidate",
      "worker_metrics",
    ]) || typeof value.job_id !== "string" || !IDENTIFIER.test(value.job_id) ||
      typeof value.lease_receipt !== "string" ||
      !RECEIPT.test(value.lease_receipt) || !metrics(value.worker_metrics)) {
      return null;
    }
    return structuredClone(value) as FarmOsRtxBridgeCandidateRequest;
  }
  if (!exact(value, [
    "contract_version",
    "job_id",
    "lease_receipt",
    "failure_code",
    "retryable",
    "safe_metrics",
  ]) || typeof value.job_id !== "string" || !IDENTIFIER.test(value.job_id) ||
    typeof value.lease_receipt !== "string" ||
    !RECEIPT.test(value.lease_receipt) ||
    !FARM_OS_RTX_BRIDGE_FAILURE_CODES.includes(value.failure_code as never) ||
    typeof value.retryable !== "boolean" || !metrics(value.safe_metrics)) {
    return null;
  }
  return structuredClone(value) as FarmOsRtxBridgeFailureRequest;
}

export function farmOsRtxBridgeOperationForPath(
  method: string,
  path: string,
): FarmOsRtxBridgeOperation | null {
  if (method !== "POST") return null;
  const entry = Object.entries(FARM_OS_RTX_BRIDGE_PATHS).find(([, value]) =>
    value === path
  );
  return entry?.[0] as FarmOsRtxBridgeOperation | undefined ?? null;
}

export function farmOsRtxWorkerBridgeEnabled(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return environment.FARMOS_RTX_WORKER_BRIDGE_ENABLED === "true";
}
