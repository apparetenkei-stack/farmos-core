import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";

import type { HermesLlmProviderStatus } from "./hermes_llm_provider_adapter";

export type HermesRuntimeNormalizedStatus =
  | "succeeded"
  | "rejected"
  | "blocked"
  | "timed_out"
  | "failed";

export type HermesRuntimeReadiness = "ready" | "not_ready" | "not_checked";

export type HermesRuntimeMetadata = {
  schema_version: "hermes.runtime.v1";
  request_id: string;
  task_type: "interactive_chat";
  priority: "interactive";
  execution_mode: "synchronous";
  model_class: "lightweight";
  status: HermesRuntimeNormalizedStatus;
  provider_status: HermesLlmProviderStatus;
  timeout_ms: number;
  duration_ms: number;
  readiness: HermesRuntimeReadiness;
  fail_closed: true;
  fallback_used: false;
  queue_used: false;
  error_code: string | null;
};

export function createHermesRuntimeRequestId(): string {
  return randomUUID();
}

export function readHermesRuntimeNowMs(): number {
  return performance.now();
}

export function normalizeHermesRuntimeDurationMs(
  startedAtMs: number,
  finishedAtMs: number,
): number {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) return 0;
  return Math.max(0, Math.floor(finishedAtMs - startedAtMs));
}

export function mapHermesRuntimeStatus(
  providerStatus: HermesLlmProviderStatus | string,
): HermesRuntimeNormalizedStatus {
  if (providerStatus === "ok" || providerStatus === "mock_fallback") {
    return "succeeded";
  }
  if (providerStatus === "bad_request") return "rejected";
  if (providerStatus === "blocked" || providerStatus === "disabled_by_env") {
    return "blocked";
  }
  if (providerStatus === "timeout") return "timed_out";
  return "failed";
}

export function mapHermesRuntimeReadiness(input: {
  providerStatus: HermesLlmProviderStatus;
  runtimeReachable: boolean;
}): HermesRuntimeReadiness {
  if (input.providerStatus === "ok" && input.runtimeReachable) return "ready";
  if (
    input.providerStatus === "timeout" ||
    input.providerStatus === "runtime_error"
  ) {
    return "not_ready";
  }
  return "not_checked";
}

export function createHermesRuntimeMetadata(input: {
  requestId: string;
  providerStatus: HermesLlmProviderStatus;
  runtimeReachable: boolean;
  timeoutMs: number;
  startedAtMs: number;
  finishedAtMs: number;
  errorCode: string | null;
}): HermesRuntimeMetadata {
  return {
    schema_version: "hermes.runtime.v1",
    request_id: input.requestId,
    task_type: "interactive_chat",
    priority: "interactive",
    execution_mode: "synchronous",
    model_class: "lightweight",
    status: mapHermesRuntimeStatus(input.providerStatus),
    provider_status: input.providerStatus,
    timeout_ms: input.timeoutMs,
    duration_ms: normalizeHermesRuntimeDurationMs(
      input.startedAtMs,
      input.finishedAtMs,
    ),
    readiness: mapHermesRuntimeReadiness({
      providerStatus: input.providerStatus,
      runtimeReachable: input.runtimeReachable,
    }),
    fail_closed: true,
    fallback_used: false,
    queue_used: false,
    error_code: input.errorCode,
  };
}
