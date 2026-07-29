import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_RTX_WORKER_ID,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_contract";
import {
  FarmOsRtxBridgeClientError,
  type FarmOsRtxBridgeLease,
  type FarmOsRtxBridgeWorkerClientConfig,
} from "../../src/lib/hermes/farm_os_rtx_bridge_worker_client";
import {
  FarmOsRtxBridgeWorkerRuntime,
  type FarmOsRtxBridgeWorkerClientPort,
} from "../../src/lib/hermes/farm_os_rtx_bridge_worker_runtime";
import {
  parseFarmOsRtxStructuringCandidate,
  parseFarmOsRtxStructuringJob,
} from "../../src/lib/hermes/farm_os_rtx_structuring_contract";
import type {
  FarmOsRtxNightTwoPassResult,
  FarmOsRtxWorkerConfig,
} from "../../src/lib/hermes/farm_os_rtx_worker_runtime";

const fixture = JSON.parse(
  readFileSync(
    new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
    "utf8",
  ),
) as { job: unknown; valid_candidate: unknown };
const parsedJob = parseFarmOsRtxStructuringJob(fixture.job);
const parsedCandidate = parseFarmOsRtxStructuringCandidate(
  fixture.valid_candidate,
);
assert.equal(parsedJob.valid, true);
assert.equal(parsedCandidate.valid, true);
if (!parsedJob.valid || !parsedCandidate.valid) throw new Error("FIXTURE");
const job = parsedJob.value;
const candidate = parsedCandidate.value;

const clientConfig: FarmOsRtxBridgeWorkerClientConfig = {
  bridgeUrl: "https://fixture-node.tail00000.ts.net:8443",
  hmacKeyFile: "C:\\fixture\\bridge.key",
  workerId: FARM_OS_RTX_WORKER_ID,
  pollIntervalMs: 5_000,
  requestTimeoutMs: 15_000,
};
const modelConfig = {
  baseUrl: "http://127.0.0.1:1234",
  apiToken: "fixture-token",
  modelId: "fixture-model",
  modelArtifactId: "fixture-artifact",
  quantization: "fixture-quantization",
  requestTimeoutMs: 120_000,
  workerMode: "fixture_only",
} satisfies FarmOsRtxWorkerConfig;

function diagnostics() {
  return {
    latency_ms: 1,
    prompt_tokens: 1,
    completion_tokens: 1,
    total_tokens: 2,
    tokens_per_second: 1,
    finish_reason: "stop",
    content_length: 1,
    content_utf8_bytes: 1,
    reasoning_content_present: false,
    tool_calls_present: false,
    think_tag_present: false,
    markdown_fence_present: false,
    trailing_text_present: false,
    invalid_json_reason: null,
  } as const;
}

function candidateReady(): FarmOsRtxNightTwoPassResult {
  return {
    status: "candidate_ready",
    candidate,
    retryable: false,
    errors: [],
    safety: {
      candidate_saved: false,
      job_deleted: false,
      active_projection_modified: false,
      fallback_model_used: false,
    },
    pass_1: diagnostics(),
    pass_2: diagnostics(),
    handoff_utf8_bytes: 10,
  };
}

function lease(): FarmOsRtxBridgeLease {
  return {
    job,
    leaseReceipt: "r".repeat(43),
    leaseExpiresAt: new Date(Date.now() + 10_000).toISOString(),
    workerId: FARM_OS_RTX_WORKER_ID,
  };
}

let activeHeartbeatTimers = 0;
function trackedRealSleep(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    activeHeartbeatTimers += 1;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      activeHeartbeatTimers -= 1;
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    const abort = () => finish();
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function pendingModel(
  milliseconds: number,
): (input: { signal?: AbortSignal }) => Promise<FarmOsRtxNightTwoPassResult> {
  return ({ signal }) =>
    new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(candidateReady()), milliseconds);
      const abort = () => {
        clearTimeout(timeout);
        reject(new Error("MODEL_ABORTED"));
      };
      if (signal?.aborted) return abort();
      signal?.addEventListener("abort", abort, { once: true });
    });
}

async function run(): Promise<void> {
  let heartbeatCount = 0;
  let candidateCount = 0;
  const events: string[] = [];
  const successPort: FarmOsRtxBridgeWorkerClientPort = {
    config: clientConfig,
    claim: async () => ({ result: "leased", lease: lease() }),
    heartbeat: async (current) => {
      heartbeatCount += 1;
      return {
        ...current,
        leaseExpiresAt: new Date(Date.now() + 10_000).toISOString(),
      };
    },
    submitCandidate: async () => {
      candidateCount += 1;
      return "accepted";
    },
    submitFailure: async () => "failure_recorded",
  };
  const startedAt = Date.now();
  const success = await new FarmOsRtxBridgeWorkerRuntime({
    client: successPort,
    modelConfig,
    modelRunner: pendingModel(8_000),
    sleep: trackedRealSleep,
    heartbeatIntervalMs: 3_000,
    heartbeatSafetyMarginMs: 1_000,
    onEvent: (event) => events.push(event),
  }).runOnce();
  const elapsedMs = Date.now() - startedAt;
  assert.equal(success.status, "candidate_submitted");
  assert.ok(elapsedMs >= 7_500);
  assert.ok(heartbeatCount >= 2);
  assert.equal(candidateCount, 1);
  assert.equal(activeHeartbeatTimers, 0);
  assert.ok(events.includes("RTX_BRIDGE_HEARTBEAT_LOOP_STARTED"));
  assert.ok(events.filter((event) =>
    event === "RTX_BRIDGE_HEARTBEAT_ACCEPTED"
  ).length >= 2);
  assert.ok(events.includes("RTX_BRIDGE_INFERENCE_COMPLETED"));
  assert.ok(events.includes("RTX_BRIDGE_CANDIDATE_SUBMITTED"));

  let rejectedCandidateCount = 0;
  let inferenceAborted = false;
  const rejectedPort: FarmOsRtxBridgeWorkerClientPort = {
    config: clientConfig,
    claim: async () => ({ result: "leased", lease: lease() }),
    heartbeat: async () => {
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    },
    submitCandidate: async () => {
      rejectedCandidateCount += 1;
      return "accepted";
    },
    submitFailure: async () => "failure_recorded",
  };
  await assert.rejects(
    new FarmOsRtxBridgeWorkerRuntime({
      client: rejectedPort,
      modelConfig,
      modelRunner: ({ signal }) =>
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve(candidateReady()), 8_000);
          const abort = () => {
            inferenceAborted = true;
            clearTimeout(timeout);
            reject(new Error("MODEL_ABORTED"));
          };
          signal?.addEventListener("abort", abort, { once: true });
        }),
      sleep: trackedRealSleep,
      heartbeatIntervalMs: 1_000,
      heartbeatSafetyMarginMs: 1_000,
    }).runOnce(),
    (error: unknown) =>
      error instanceof FarmOsRtxBridgeClientError &&
      error.code === "BRIDGE_OPERATION_REJECTED",
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rejectedCandidateCount, 0);
  assert.equal(inferenceAborted, true);
  assert.equal(activeHeartbeatTimers, 0);

  process.stdout.write(JSON.stringify({
    result: "PASS",
    lease_seconds: 10,
    heartbeat_interval_seconds: 3,
    inference_pending_seconds: 8,
    heartbeat_count: heartbeatCount,
    candidate_submitted: candidateCount === 1,
    heartbeat_task_stopped: activeHeartbeatTimers === 0,
    timer_residual_count: activeHeartbeatTimers,
    rejected_heartbeat_candidate_count: rejectedCandidateCount,
    inference_aborted_on_heartbeat_failure: inferenceAborted,
    production_write: false,
    active_projection_modified: false,
    proposal_approval_apply: 0,
  }) + "\n");
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "REALTIME_TEST_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
