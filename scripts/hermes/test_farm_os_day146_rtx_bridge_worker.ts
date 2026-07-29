import assert from "node:assert/strict";
import { authenticateFarmOsRtxBridgeRequest } from "../../src/lib/hermes/farm_os_rtx_worker_bridge_auth";
import {
  FARM_OS_RTX_BRIDGE_PATHS,
  FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  FARM_OS_RTX_WORKER_ID,
  parseFarmOsRtxBridgeRequest,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_contract";
import {
  FarmOsRtxBridgeClientError,
  FarmOsRtxBridgeWorkerClient,
  loadFarmOsRtxBridgeHmacKey,
  loadFarmOsRtxBridgeWorkerClientConfig,
  type FarmOsRtxBridgeClientEvent,
  type FarmOsRtxBridgeLease,
  type FarmOsRtxBridgeWorkerClientConfig,
} from "../../src/lib/hermes/farm_os_rtx_bridge_worker_client";
import {
  computeFarmOsRtxHeartbeatDelayMs,
  FARM_OS_RTX_HEARTBEAT_SAFETY_MARGIN_MS,
  FarmOsRtxBridgeWorkerRuntime,
  type FarmOsRtxBridgeWorkerClientPort,
} from "../../src/lib/hermes/farm_os_rtx_bridge_worker_runtime";
import type {
  FarmOsRtxNightTwoPassResult,
  FarmOsRtxWorkerConfig,
} from "../../src/lib/hermes/farm_os_rtx_worker_runtime";
import {
  parseFarmOsRtxStructuringCandidate,
  parseFarmOsRtxStructuringJob,
} from "../../src/lib/hermes/farm_os_rtx_structuring_contract";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Fixture = {
  job: unknown;
  valid_candidate: unknown;
};

const fixture = JSON.parse(
  readFileSync(
    new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
    "utf8",
  ),
) as Fixture;
const jobResult = parseFarmOsRtxStructuringJob(fixture.job);
const candidateResult = parseFarmOsRtxStructuringCandidate(
  fixture.valid_candidate,
);
assert.equal(jobResult.valid, true);
assert.equal(candidateResult.valid, true);
if (!jobResult.valid || !candidateResult.valid) throw new Error("FIXTURE");
const job = jobResult.value;
const candidate = candidateResult.value;
const now = new Date("2026-07-29T00:00:00.000Z");
const expiry = "2026-07-29T00:10:00.000Z";
const receipt = "r".repeat(43);
const secret = "fixture-only-hmac-key-value-with-more-than-32-characters";
const temporaryDirectory = mkdtempSync(join(tmpdir(), "farmos-rtx-bridge-"));
const secretFile = join(temporaryDirectory, "bridge.key");
writeFileSync(secretFile, `${secret}\n`, { mode: 0o600 });

const bridgeConfig: FarmOsRtxBridgeWorkerClientConfig = {
  bridgeUrl: "https://fixture-node.tail00000.ts.net:8443",
  hmacKeyFile: secretFile,
  workerId: FARM_OS_RTX_WORKER_ID,
  pollIntervalMs: 5_000,
  requestTimeoutMs: 15_000,
};
const modelConfig = {
  baseUrl: "http://127.0.0.1:1234",
  apiToken: "fixture-lm-token",
  modelId: "fixture-model",
  modelArtifactId: "fixture-artifact",
  quantization: "fixture-quantization",
  requestTimeoutMs: 120_000,
  workerMode: "fixture_only",
} satisfies FarmOsRtxWorkerConfig;

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function claimBody(overrides: Record<string, unknown> = {}): unknown {
  return {
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    result: "leased",
    job,
    lease_receipt: receipt,
    lease_expires_at: expiry,
    ...overrides,
  };
}

function clientWith(
  fetchImpl: typeof fetch,
  keyFile = secretFile,
  onEvent?: (event: FarmOsRtxBridgeClientEvent) => void,
): FarmOsRtxBridgeWorkerClient {
  return new FarmOsRtxBridgeWorkerClient(
    { ...bridgeConfig, hmacKeyFile: keyFile },
    {
      fetchImpl,
      now: () => now,
      nonceFactory: () => "n".repeat(32),
      onEvent,
    },
  );
}

async function rejectsCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) =>
    error instanceof FarmOsRtxBridgeClientError &&
    error.code === code &&
    !error.message.includes(secret)
  );
}

function diagnostics(latencyMs = 1) {
  return {
    latency_ms: latencyMs,
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

function candidateReady(
  value = candidate,
): FarmOsRtxNightTwoPassResult {
  return {
    status: "candidate_ready",
    candidate: value,
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

function unavailable(
  error = "RTX_HTTP_ERROR",
): FarmOsRtxNightTwoPassResult {
  return {
    status: "night_analysis_failed",
    candidate: null,
    retryable: true,
    errors: [error],
    safety: {
      candidate_saved: false,
      job_deleted: false,
      active_projection_modified: false,
      fallback_model_used: false,
    },
    pass_1: diagnostics(),
    pass_2: null,
    handoff_utf8_bytes: null,
  };
}

function lease(overrides: Partial<FarmOsRtxBridgeLease> = {}) {
  return {
    job,
    leaseReceipt: receipt,
    leaseExpiresAt: expiry,
    workerId: FARM_OS_RTX_WORKER_ID,
    ...overrides,
  } satisfies FarmOsRtxBridgeLease;
}

function fakePort(input: {
  claim?: FarmOsRtxBridgeWorkerClientPort["claim"];
  heartbeat?: FarmOsRtxBridgeWorkerClientPort["heartbeat"];
  submitCandidate?: FarmOsRtxBridgeWorkerClientPort["submitCandidate"];
  submitFailure?: FarmOsRtxBridgeWorkerClientPort["submitFailure"];
} = {}): FarmOsRtxBridgeWorkerClientPort & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    config: bridgeConfig,
    calls,
    claim: input.claim ?? (async () => {
      calls.push("claim");
      return { result: "leased", lease: lease() };
    }),
    heartbeat: input.heartbeat ?? (async (value) => {
      calls.push("heartbeat");
      return {
        ...value,
        leaseExpiresAt: "2026-07-29T00:20:00.000Z",
      };
    }),
    submitCandidate: input.submitCandidate ?? (async () => {
      calls.push("candidate");
      return "accepted";
    }),
    submitFailure: input.submitFailure ?? (async () => {
      calls.push("failure");
      return "failure_recorded";
    }),
  };
}

function waitUntilAbort(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    signal?.addEventListener("abort", () => resolve(), { once: true });
  });
}

async function run(): Promise<void> {
  const initialHeartbeatDelay = computeFarmOsRtxHeartbeatDelayMs({
    leaseExpiresAt: "2026-07-29T00:05:00.000Z",
    now,
  });
  assert.equal(initialHeartbeatDelay, 100_000);
  assert.ok(
    300_000 - initialHeartbeatDelay >=
      FARM_OS_RTX_HEARTBEAT_SAFETY_MARGIN_MS,
  );
  assert.equal(
    computeFarmOsRtxHeartbeatDelayMs({
      leaseExpiresAt: "2026-07-29T00:11:40.000Z",
      now: new Date("2026-07-29T00:01:40.000Z"),
    }),
    200_000,
  );
  assert.equal(
    computeFarmOsRtxHeartbeatDelayMs({
      leaseExpiresAt: "2026-07-29T00:00:29.999Z",
      now,
    }),
    null,
  );

  const loaded = loadFarmOsRtxBridgeWorkerClientConfig({
    FARMOS_RTX_BRIDGE_URL: bridgeConfig.bridgeUrl,
    FARMOS_RTX_BRIDGE_HMAC_KEY_FILE: secretFile,
    FARMOS_RTX_WORKER_ID: FARM_OS_RTX_WORKER_ID,
    FARMOS_RTX_WORKER_POLL_INTERVAL_MS: "5000",
    FARMOS_RTX_REQUEST_TIMEOUT_MS: "15000",
  });
  assert.deepEqual(loaded, bridgeConfig);
  assert.equal(loadFarmOsRtxBridgeHmacKey(secretFile), secret);
  assert.throws(
    () =>
      loadFarmOsRtxBridgeWorkerClientConfig({
        FARMOS_RTX_BRIDGE_HMAC_KEY_FILE: secretFile,
        FARMOS_RTX_WORKER_ID: FARM_OS_RTX_WORKER_ID,
      }),
    /BRIDGE_CONFIG_INVALID/u,
  );
  assert.throws(
    () =>
      loadFarmOsRtxBridgeWorkerClientConfig({
        FARMOS_RTX_BRIDGE_URL: bridgeConfig.bridgeUrl,
        FARMOS_RTX_BRIDGE_HMAC_KEY_FILE: secretFile,
        FARMOS_RTX_WORKER_ID: "other-worker",
      }),
    /BRIDGE_CONFIG_INVALID/u,
  );
  assert.throws(
    () => loadFarmOsRtxBridgeHmacKey(join(temporaryDirectory, "missing")),
    (error: unknown) =>
      error instanceof Error &&
      error.message === "BRIDGE_SECRET_FILE_INVALID" &&
      !error.message.includes(secret),
  );
  const emptyFile = join(temporaryDirectory, "empty.key");
  writeFileSync(emptyFile, "", { mode: 0o600 });
  assert.throws(
    () => loadFarmOsRtxBridgeHmacKey(emptyFile),
    /BRIDGE_SECRET_FILE_INVALID/u,
  );

  let signed = false;
  const validClient = clientWith(async (url, init) => {
    assert.equal(String(url), `${bridgeConfig.bridgeUrl}${FARM_OS_RTX_BRIDGE_PATHS.claim}`);
    const rawBody = String(init?.body);
    const headers = Object.fromEntries(
      Object.entries(init?.headers as Record<string, string>)
        .map(([key, value]) => [key.toLowerCase(), value]),
    );
    const auth = authenticateFarmOsRtxBridgeRequest({
      hmac_key: secret,
      method: "POST",
      path: FARM_OS_RTX_BRIDGE_PATHS.claim,
      headers,
      raw_body: rawBody,
      now_epoch_seconds: Math.floor(now.getTime() / 1_000),
    });
    signed = auth.authenticated;
    return response(claimBody());
  });
  const claimed = await validClient.claim();
  assert.equal(signed, true);
  assert.equal(claimed.result, "leased");
  if (claimed.result === "leased") {
    assert.equal(claimed.lease.job.job_id, job.job_id);
    assert.equal(claimed.lease.workerId, FARM_OS_RTX_WORKER_ID);
  }

  const noJobs = await clientWith(async () =>
    response({
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      result: "no_jobs",
    })).claim();
  assert.deepEqual(noJobs, { result: "no_jobs" });
  await rejectsCode(
    clientWith(async () =>
      response({
        contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
        result: "unauthorized",
      }, 401)).claim(),
    "BRIDGE_UNAUTHORIZED",
  );
  await rejectsCode(
    clientWith(async () => response({}, 403)).claim(),
    "BRIDGE_FORBIDDEN",
  );
  await rejectsCode(
    clientWith(async () => response({ result: "leased" })).claim(),
    "BRIDGE_RESPONSE_INVALID",
  );
  await rejectsCode(
    clientWith(async () =>
      response(claimBody({
        job: { ...job, job_id: "invalid job id" },
      }))).claim(),
    "BRIDGE_RESPONSE_INVALID",
  );

  const heartbeatClientEvents: string[] = [];
  const heartbeatClient = clientWith(async (url) => {
    assert.ok(String(url).endsWith(FARM_OS_RTX_BRIDGE_PATHS.heartbeat));
    return response({
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      result: "lease_extended",
      lease_expires_at: "2026-07-29T00:20:00.000Z",
    });
  }, secretFile, (event) => heartbeatClientEvents.push(event));
  assert.equal(
    (await heartbeatClient.heartbeat(lease())).leaseExpiresAt,
    "2026-07-29T00:20:00.000Z",
  );
  assert.deepEqual(heartbeatClientEvents, [
    "RTX_BRIDGE_HEARTBEAT_REQUEST_STARTED",
    "RTX_BRIDGE_HEARTBEAT_RESPONSE_RECEIVED",
  ]);
  const rejectedHeartbeatEvents: string[] = [];
  await rejectsCode(
    clientWith(async () =>
      response({
        contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
        result: "rejected",
      }), secretFile, (event) => rejectedHeartbeatEvents.push(event))
      .heartbeat(lease()),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.deepEqual(rejectedHeartbeatEvents, [
    "RTX_BRIDGE_HEARTBEAT_REQUEST_STARTED",
    "RTX_BRIDGE_HEARTBEAT_RESPONSE_RECEIVED",
    "RTX_BRIDGE_HEARTBEAT_RESPONSE_REJECTED",
  ]);
  const failedHeartbeatEvents: string[] = [];
  await rejectsCode(
    clientWith(
      async () => {
        throw new Error("FIXTURE_NETWORK_FAILURE");
      },
      secretFile,
      (event) => failedHeartbeatEvents.push(event),
    ).heartbeat(lease()),
    "BRIDGE_UNREACHABLE",
  );
  assert.deepEqual(failedHeartbeatEvents, [
    "RTX_BRIDGE_HEARTBEAT_REQUEST_STARTED",
    "RTX_BRIDGE_HEARTBEAT_REQUEST_FAILED",
  ]);

  const candidateClientEvents: string[] = [];
  const submitClient = clientWith(async (url) => {
    const path = new URL(String(url)).pathname;
    const result = path === FARM_OS_RTX_BRIDGE_PATHS.submit_candidate
      ? "accepted"
      : "failure_recorded";
    return response({
      contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
      result,
    });
  }, secretFile, (event) => candidateClientEvents.push(event));
  assert.equal(
    await submitClient.submitCandidate(lease(), candidate, {
      pass_1_latency_ms: null,
      pass_2_latency_ms: null,
      completion_tokens: null,
      handoff_bytes: null,
      candidate_bytes: null,
      reasoning_present: false,
      gpu_utilization_percent: null,
      gpu_temperature_celsius: null,
    }),
    "accepted",
  );
  assert.deepEqual(candidateClientEvents, [
    "RTX_BRIDGE_CANDIDATE_REQUEST_STARTED",
    "RTX_BRIDGE_CANDIDATE_RESPONSE_RECEIVED",
  ]);
  assert.equal(
    await submitClient.submitFailure(
      lease(),
      "lm_studio_unavailable",
      true,
      {
        pass_1_latency_ms: null,
        pass_2_latency_ms: null,
        completion_tokens: null,
        handoff_bytes: null,
        candidate_bytes: null,
        reasoning_present: false,
        gpu_utilization_percent: null,
        gpu_temperature_celsius: null,
      },
    ),
    "failure_recorded",
  );
  const rejectedCandidateEvents: string[] = [];
  await rejectsCode(
    clientWith(async () =>
      response({
        contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
        result: "rejected",
        failure_code: "LEASE_INVALID",
      }), secretFile, (event) => rejectedCandidateEvents.push(event))
      .submitCandidate(
        lease({ leaseReceipt: "x".repeat(43) }),
        candidate,
        {
          pass_1_latency_ms: null,
          pass_2_latency_ms: null,
          completion_tokens: null,
          handoff_bytes: null,
          candidate_bytes: null,
          reasoning_present: false,
          gpu_utilization_percent: null,
          gpu_temperature_celsius: null,
        },
    ),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.deepEqual(rejectedCandidateEvents, [
    "RTX_BRIDGE_CANDIDATE_REQUEST_STARTED",
    "RTX_BRIDGE_CANDIDATE_RESPONSE_RECEIVED",
    "RTX_BRIDGE_CANDIDATE_RESPONSE_REJECTED",
  ]);

  const successPort = fakePort();
  const successRuntime = new FarmOsRtxBridgeWorkerRuntime({
    client: successPort,
    modelConfig,
    modelRunner: async () => candidateReady(),
    now: () => now,
  });
  assert.deepEqual(await successRuntime.runOnce(), {
    status: "candidate_submitted",
    job_id: job.job_id,
  });
  assert.deepEqual(successPort.calls, ["claim", "candidate"]);

  let earlyHeartbeatCount = 0;
  let earlyCandidateCount = 0;
  let earlyNow = new Date("2026-07-29T00:00:00.000Z");
  const earlyCompletionEvents: string[] = [];
  const earlyCompletionPort = fakePort({
    claim: async () => ({
      result: "leased",
      lease: lease({ leaseExpiresAt: "2026-07-29T00:10:00.000Z" }),
    }),
    heartbeat: async (value) => {
      earlyHeartbeatCount += 1;
      return value;
    },
    submitCandidate: async (currentLease, value, workerMetrics) => {
      assert.equal(workerMetrics.pass_1_latency_ms, 1);
      assert.equal(workerMetrics.pass_2_latency_ms, 3);
      assert.notEqual(
        parseFarmOsRtxBridgeRequest("submit_candidate", {
          contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
          job_id: currentLease.job.job_id,
          lease_receipt: currentLease.leaseReceipt,
          candidate: value,
          worker_metrics: workerMetrics,
        }),
        null,
      );
      earlyCandidateCount += 1;
      return "accepted";
    },
  });
  const earlyCompletionResult = await new FarmOsRtxBridgeWorkerRuntime({
    client: earlyCompletionPort,
    modelConfig,
    modelRunner: async () => {
      earlyNow = new Date("2026-07-29T00:00:30.000Z");
      return {
        ...candidateReady(),
        pass_1: diagnostics(1.25),
        pass_2: diagnostics(2.75),
      };
    },
    sleep: (_milliseconds, signal) => waitUntilAbort(signal),
    now: () => earlyNow,
    onEvent: (event) => earlyCompletionEvents.push(event),
  }).runOnce();
  assert.equal(earlyCompletionResult.status, "candidate_submitted");
  assert.equal(earlyHeartbeatCount, 0);
  assert.equal(earlyCandidateCount, 1);
  assert.deepEqual(earlyCompletionEvents, [
    "RTX_BRIDGE_JOB_CLAIMED",
    "RTX_BRIDGE_HEARTBEAT_LOOP_STARTED",
    "RTX_BRIDGE_HEARTBEAT_DELAY_SCHEDULED",
    "RTX_BRIDGE_INFERENCE_COMPLETED",
    "RTX_BRIDGE_CANDIDATE_ELIGIBILITY_PASSED",
    "RTX_BRIDGE_CANDIDATE_SUBMITTED",
  ]);

  const candidateRejectionPort = fakePort({
    submitCandidate: async () => {
      candidateRejectionPort.calls.push("candidate");
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    },
  });
  const candidateRejectionEvents: string[] = [];
  await rejectsCode(
    new FarmOsRtxBridgeWorkerRuntime({
      client: candidateRejectionPort,
      modelConfig,
      modelRunner: async () => candidateReady(),
      sleep: (_milliseconds, signal) => waitUntilAbort(signal),
      now: () => now,
      onEvent: (event) => candidateRejectionEvents.push(event),
    }).runOnce(),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.deepEqual(candidateRejectionPort.calls, ["claim", "candidate"]);
  assert.ok(
    candidateRejectionEvents.includes(
      "RTX_BRIDGE_CANDIDATE_ELIGIBILITY_PASSED",
    ),
  );
  assert.equal(
    candidateRejectionEvents.includes("RTX_BRIDGE_CANDIDATE_SUBMITTED"),
    false,
  );

  const emptyQueuePort = fakePort({
    claim: async () => ({ result: "no_jobs" }),
  });
  assert.deepEqual(
    await new FarmOsRtxBridgeWorkerRuntime({
      client: emptyQueuePort,
      modelConfig,
      modelRunner: async () => {
        throw new Error("MODEL_MUST_NOT_RUN_WITHOUT_LEASE");
      },
      now: () => now,
    }).runOnce(),
    { status: "no_jobs" },
  );

  const unavailablePort = fakePort();
  const unavailableRuntime = new FarmOsRtxBridgeWorkerRuntime({
    client: unavailablePort,
    modelConfig,
    modelRunner: async () => unavailable(),
    now: () => now,
  });
  const unavailableResult = await unavailableRuntime.runOnce();
  assert.equal(unavailableResult.status, "failure_submitted");
  assert.deepEqual(unavailablePort.calls, ["claim", "failure"]);

  const timeoutPort = fakePort();
  const timeoutRuntime = new FarmOsRtxBridgeWorkerRuntime({
    client: timeoutPort,
    modelConfig,
    modelRunner: async () => unavailable("RTX_REQUEST_TIMEOUT"),
    now: () => now,
  });
  const timeoutResult = await timeoutRuntime.runOnce();
  assert.equal(
    timeoutResult.status === "failure_submitted"
      ? timeoutResult.failure_code
      : null,
    "request_timeout",
  );

  const malformedPort = fakePort();
  const malformedCandidate = { ...candidate, job_id: "wrong-job" };
  const malformedRuntime = new FarmOsRtxBridgeWorkerRuntime({
    client: malformedPort,
    modelConfig,
    modelRunner: async () =>
      candidateReady(malformedCandidate as typeof candidate),
    now: () => now,
  });
  const malformedResult = await malformedRuntime.runOnce();
  assert.equal(malformedResult.status, "failure_submitted");
  assert.deepEqual(malformedPort.calls, ["claim", "failure"]);

  const invalidOutputPort = fakePort();
  const invalidOutputRuntime = new FarmOsRtxBridgeWorkerRuntime({
    client: invalidOutputPort,
    modelConfig,
    modelRunner: async () =>
      candidateReady({
        ...candidate,
        unexpected_model_field: true,
      } as unknown as typeof candidate),
    now: () => now,
  });
  assert.equal(
    (await invalidOutputRuntime.runOnce()).status,
    "failure_submitted",
  );
  assert.deepEqual(invalidOutputPort.calls, ["claim", "failure"]);

  const expiredPort = fakePort({
    claim: async () => ({
      result: "leased",
      lease: lease({ leaseExpiresAt: "2026-07-28T23:59:59.000Z" }),
    }),
  });
  await rejectsCode(
    new FarmOsRtxBridgeWorkerRuntime({
      client: expiredPort,
      modelConfig,
      modelRunner: async () => candidateReady(),
      now: () => now,
    }).runOnce(),
    "BRIDGE_RESPONSE_INVALID",
  );

  let virtualNow = new Date("2026-07-29T00:00:00.000Z");
  let resolveWork!: (value: FarmOsRtxNightTwoPassResult) => void;
  let candidateLeaseExpiry: string | null = null;
  const heartbeatSleeps: number[] = [];
  let heartbeatCount = 0;
  const heartbeatPort = fakePort({
    claim: async () => {
      heartbeatPort.calls.push("claim");
      return {
        result: "leased",
        lease: lease({ leaseExpiresAt: "2026-07-29T00:05:00.000Z" }),
      };
    },
    heartbeat: async (value) => {
      heartbeatPort.calls.push("heartbeat");
      heartbeatCount += 1;
      if (heartbeatCount === 2) resolveWork(candidateReady());
      return {
        ...value,
        leaseExpiresAt: new Date(
          virtualNow.getTime() + 600_000,
        ).toISOString(),
      };
    },
    submitCandidate: async (value) => {
      heartbeatPort.calls.push("candidate");
      candidateLeaseExpiry = value.leaseExpiresAt;
      return "accepted";
    },
  });
  const heartbeatEvents: string[] = [];
  const heartbeatRuntime = new FarmOsRtxBridgeWorkerRuntime({
    client: heartbeatPort,
    modelConfig,
    modelRunner: () =>
      new Promise((resolve) => {
        resolveWork = resolve;
      }),
    sleep: (milliseconds, signal) => {
      if (heartbeatCount >= 2) return waitUntilAbort(signal);
      heartbeatSleeps.push(milliseconds);
      virtualNow = new Date(virtualNow.getTime() + milliseconds);
      return Promise.resolve();
    },
    now: () => virtualNow,
    onEvent: (event) => heartbeatEvents.push(event),
  });
  assert.equal((await heartbeatRuntime.runOnce()).status, "candidate_submitted");
  assert.deepEqual(heartbeatPort.calls, [
    "claim",
    "heartbeat",
    "heartbeat",
    "candidate",
  ]);
  assert.deepEqual(heartbeatSleeps, [100_000, 200_000]);
  assert.equal(candidateLeaseExpiry, "2026-07-29T00:15:00.000Z");
  assert.deepEqual(heartbeatEvents, [
    "RTX_BRIDGE_JOB_CLAIMED",
    "RTX_BRIDGE_HEARTBEAT_LOOP_STARTED",
    "RTX_BRIDGE_HEARTBEAT_DELAY_SCHEDULED",
    "RTX_BRIDGE_HEARTBEAT_DUE",
    "RTX_BRIDGE_HEARTBEAT_ACCEPTED",
    "RTX_BRIDGE_HEARTBEAT_DELAY_SCHEDULED",
    "RTX_BRIDGE_HEARTBEAT_DUE",
    "RTX_BRIDGE_HEARTBEAT_ACCEPTED",
    "RTX_BRIDGE_HEARTBEAT_DELAY_SCHEDULED",
    "RTX_BRIDGE_INFERENCE_COMPLETED",
    "RTX_BRIDGE_CANDIDATE_ELIGIBILITY_PASSED",
    "RTX_BRIDGE_CANDIDATE_SUBMITTED",
  ]);

  const heartbeatFailurePort = fakePort({
    heartbeat: async () => {
      throw new FarmOsRtxBridgeClientError("BRIDGE_OPERATION_REJECTED");
    },
  });
  await rejectsCode(
    new FarmOsRtxBridgeWorkerRuntime({
      client: heartbeatFailurePort,
      modelConfig,
      modelRunner: () => new Promise(() => undefined),
      sleep: async () => undefined,
      now: () => now,
    }).runOnce(),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.deepEqual(heartbeatFailurePort.calls, ["claim"]);

  let nearExpiryModelStarted = false;
  const nearExpiryPort = fakePort({
    claim: async () => ({
      result: "leased",
      lease: lease({ leaseExpiresAt: "2026-07-29T00:00:29.999Z" }),
    }),
  });
  await rejectsCode(
    new FarmOsRtxBridgeWorkerRuntime({
      client: nearExpiryPort,
      modelConfig,
      modelRunner: async () => {
        nearExpiryModelStarted = true;
        return candidateReady();
      },
      now: () => now,
    }).runOnce(),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.equal(nearExpiryModelStarted, false);
  assert.deepEqual(nearExpiryPort.calls, []);

  let completionNow = new Date("2026-07-29T00:00:00.000Z");
  const expiredCandidatePort = fakePort({
    claim: async () => {
      expiredCandidatePort.calls.push("claim");
      return {
        result: "leased",
        lease: lease({ leaseExpiresAt: "2026-07-29T00:05:00.000Z" }),
      };
    },
  });
  await rejectsCode(
    new FarmOsRtxBridgeWorkerRuntime({
      client: expiredCandidatePort,
      modelConfig,
      modelRunner: async () => {
        completionNow = new Date("2026-07-29T00:05:01.000Z");
        return candidateReady();
      },
      sleep: (_milliseconds, signal) => waitUntilAbort(signal),
      now: () => completionNow,
    }).runOnce(),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.deepEqual(expiredCandidatePort.calls, ["claim"]);

  completionNow = new Date("2026-07-29T00:00:00.000Z");
  const expiredFailurePort = fakePort({
    claim: async () => {
      expiredFailurePort.calls.push("claim");
      return {
        result: "leased",
        lease: lease({ leaseExpiresAt: "2026-07-29T00:05:00.000Z" }),
      };
    },
  });
  await rejectsCode(
    new FarmOsRtxBridgeWorkerRuntime({
      client: expiredFailurePort,
      modelConfig,
      modelRunner: async () => {
        completionNow = new Date("2026-07-29T00:05:01.000Z");
        return unavailable();
      },
      sleep: (_milliseconds, signal) => waitUntilAbort(signal),
      now: () => completionNow,
    }).runOnce(),
    "BRIDGE_OPERATION_REJECTED",
  );
  assert.deepEqual(expiredFailurePort.calls, ["claim"]);

  const synchronousFailurePort = fakePort();
  const synchronousFailureEvents: string[] = [];
  const synchronousFailureResult = await new FarmOsRtxBridgeWorkerRuntime({
    client: synchronousFailurePort,
    modelConfig,
    modelRunner: () => {
      throw new Error("SYNCHRONOUS_MODEL_FAILURE");
    },
    now: () => now,
    onEvent: (event) => synchronousFailureEvents.push(event),
  }).runOnce();
  assert.equal(synchronousFailureResult.status, "failure_submitted");
  assert.deepEqual(synchronousFailurePort.calls, ["claim", "failure"]);
  assert.ok(
    synchronousFailureEvents.includes("RTX_BRIDGE_HEARTBEAT_LOOP_STARTED"),
  );
  assert.ok(
    synchronousFailureEvents.includes("RTX_BRIDGE_INFERENCE_FAILED"),
  );

  let attempts = 0;
  const backoffSleeps: number[] = [];
  const abortBackoff = new AbortController();
  const backoffPort = fakePort({
    claim: async () => {
      attempts += 1;
      if (attempts <= 2) {
        throw new FarmOsRtxBridgeClientError("BRIDGE_UNREACHABLE", true);
      }
      return { result: "no_jobs" };
    },
  });
  await new FarmOsRtxBridgeWorkerRuntime({
    client: backoffPort,
    modelConfig,
    sleep: async (milliseconds) => {
      backoffSleeps.push(milliseconds);
      if (attempts === 3) abortBackoff.abort();
    },
    now: () => now,
  }).run(abortBackoff.signal);
  assert.deepEqual(backoffSleeps, [5_000, 10_000, 5_000]);

  const stopController = new AbortController();
  const stopPort = fakePort();
  const stopped = await new FarmOsRtxBridgeWorkerRuntime({
    client: stopPort,
    modelConfig,
    modelRunner: () => new Promise(() => undefined),
    sleep: async () => {
      stopController.abort();
    },
    now: () => now,
  }).runOnce(stopController.signal);
  assert.equal(stopped.status, "stopped");
  assert.deepEqual(stopPort.calls, ["claim", "failure"]);

  assert.equal(candidateReady().safety.active_projection_modified, false);
  assert.equal(candidateReady().safety.candidate_saved, false);
  assert.equal(candidateReady().safety.fallback_model_used, false);
  process.stdout.write(
    `${JSON.stringify({
      result: "PASS",
      config_valid: true,
      secret_file_fail_closed: true,
      secret_exposed: false,
      hmac_contract_reused: true,
      claim_and_no_jobs: true,
      unauthorized_and_forbidden_stop: true,
      lease_and_heartbeat: true,
      heartbeat_safety_margin: true,
      heartbeat_recalculated_after_extension: true,
      multiple_heartbeats_during_inference: true,
      heartbeat_task_independent: true,
      safe_events_only: true,
      synchronous_inference_failure_stops_heartbeat: true,
      near_expiry_fail_closed: true,
      expired_submission_zero: true,
      candidate_and_failure_submission: true,
      bounded_backoff: true,
      graceful_shutdown: true,
      production_queue_used: false,
      production_write: false,
      active_projection_modified: false,
      proposal_approval_apply: 0,
    })}\n`,
  );
}

run().finally(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "TEST_FAILED";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
