import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";

import {
  signFarmOsRtxBridgeRequest,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_auth";
import {
  FARM_OS_RTX_BRIDGE_NETWORK_POLICY,
  FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  FARM_OS_RTX_WORKER_ID,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_contract";
import {
  FARM_OS_RTX_BRIDGE_HTTP_REQUEST_TIMEOUT_MS,
  FARM_OS_RTX_BRIDGE_PRIVATE_SERVE_DRY_RUN,
  FarmOsRtxWorkerBridgeHttpAdapter,
  listenFarmOsRtxWorkerBridgeLoopback,
  normalizeFarmOsRtxBridgeHeaders,
  readFarmOsRtxBridgeStartupEnvironment,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_http_adapter";
import {
  FarmOsRtxWorkerBridgePostgresRepository,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_postgres_repository";
import {
  FarmOsInMemoryRtxWorkerBridgeRepository,
  FarmOsRtxWorkerBridgeService,
  type FarmOsRtxWorkerBridgeRepository,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_service";
import {
  FarmOsInMemoryRtxStructuringQueue,
} from "../../src/lib/hermes/farm_os_rtx_structuring_queue";

type Fixture = {
  job: Record<string, unknown>;
  valid_candidate: Record<string, unknown>;
};
type HttpResult = { status: number; body: Record<string, unknown> };
const fixture = JSON.parse(readFileSync(
  new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
  "utf8",
)) as Fixture;
const KEY = "fixture-only-http-hmac-key-minimum-32";
const NOW = new Date("2026-07-29T13:00:00.000Z");
const timestamp = String(Math.floor(NOW.getTime() / 1000));
const metrics = {
  pass_1_latency_ms: 100,
  pass_2_latency_ms: 50,
  completion_tokens: 25,
  handoff_bytes: 500,
  candidate_bytes: 700,
  reasoning_present: true,
  gpu_utilization_percent: 80,
  gpu_temperature_celsius: 65,
};
let nonceSequence = 0;

function job(suffix: string, hash: string, minute: number) {
  return {
    ...structuredClone(fixture.job),
    job_id: `rtx_job_http_${suffix}`,
    source_snapshot_id: `snapshot_http_${suffix}`,
    source_record_id: `work_http_${suffix}`,
    source_content_hash: hash.repeat(64),
    created_at: `2026-07-28T21:${String(minute).padStart(2, "0")}:00+09:00`,
  };
}
function candidate(value: Record<string, unknown>) {
  return {
    ...structuredClone(fixture.valid_candidate),
    job_id: value.job_id,
    source_snapshot_id: value.source_snapshot_id,
    source_record_id: value.source_record_id,
    source_content_hash: value.source_content_hash,
  };
}
const jobs = [
  job("candidate", "b", 0),
  job("failure", "c", 1),
  job("rejected", "d", 2),
];
const queue = new FarmOsInMemoryRtxStructuringQueue();
for (const value of jobs) assert.equal(queue.createFixtureJob(value).status,
  "created");
const repository = new FarmOsInMemoryRtxWorkerBridgeRepository({
  queue_state: queue.snapshot(),
  receipt_factory: () =>
    `fixture_http_receipt_${String(++nonceSequence).padStart(40, "0")}`,
  feature_enabled: true,
});
const environment = {
  FARMOS_RTX_WORKER_BRIDGE_ENABLED: "true",
  FARMOS_RTX_BRIDGE_HMAC_KEY: KEY,
};
const adapter = new FarmOsRtxWorkerBridgeHttpAdapter({
  repository,
  environment,
  clock: () => NOW,
  transport_source: "loopback_private_proxy",
});

function signed(
  path: string,
  rawBody: string,
  overrides: {
    nonce?: string;
    timestamp?: string;
    signature?: string;
    contentHash?: string;
  } = {},
): Record<string, string> {
  const headers = signFarmOsRtxBridgeRequest({
    hmac_key: KEY,
    method: "POST",
    path,
    worker_id: FARM_OS_RTX_WORKER_ID,
    timestamp: overrides.timestamp ?? timestamp,
    nonce: overrides.nonce ??
      `fixture_http_nonce_${String(++nonceSequence).padStart(6, "0")}`,
    raw_body: rawBody,
  });
  if (overrides.signature !== undefined) {
    headers["x-farmos-signature"] = overrides.signature;
  }
  if (overrides.contentHash !== undefined) {
    headers["x-farmos-content-sha256"] = overrides.contentHash;
  }
  return headers;
}

async function httpCall(input: {
  path: string;
  raw_body: string;
  headers: Record<string, string>;
  method?: string;
}): Promise<HttpResult> {
  return await new Promise<HttpResult>((resolve, reject) => {
    const outgoing = request({
      host: FARM_OS_RTX_BRIDGE_NETWORK_POLICY.listener_host,
      port: FARM_OS_RTX_BRIDGE_NETWORK_POLICY.listener_port,
      path: input.path,
      method: input.method ?? "POST",
      headers: {
        ...input.headers,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(input.raw_body, "utf8"),
      },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        try {
          const text = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: response.statusCode ?? 0,
            body: JSON.parse(text) as Record<string, unknown>,
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    outgoing.on("error", reject);
    outgoing.end(input.raw_body);
  });
}

const startupDisabled = readFarmOsRtxBridgeStartupEnvironment({});
assert.deepEqual(startupDisabled, { enabled: false, hmac_key: null });
assert.equal(readFarmOsRtxBridgeStartupEnvironment({
  FARMOS_RTX_WORKER_BRIDGE_ENABLED: "true",
}), null);
assert.equal(readFarmOsRtxBridgeStartupEnvironment({
  FARMOS_RTX_WORKER_BRIDGE_ENABLED: "true",
  FARMOS_RTX_BRIDGE_HMAC_KEY: KEY,
})?.enabled, true);

const normalized = normalizeFarmOsRtxBridgeHeaders([
  "X-FARMOS-WORKER-ID",
  FARM_OS_RTX_WORKER_ID,
  "X-FARMOS-TIMESTAMP",
  timestamp,
]);
assert.equal(normalized?.["x-farmos-worker-id"], FARM_OS_RTX_WORKER_ID);
assert.equal(normalizeFarmOsRtxBridgeHeaders([
  "x-farmos-nonce",
  "fixture_nonce_duplicate_a",
  "X-FARMOS-NONCE",
  "fixture_nonce_duplicate_b",
]), null);

const disabledRepository = new FarmOsInMemoryRtxWorkerBridgeRepository({
  queue_state: queue.snapshot(),
});
const disabledAdapter = new FarmOsRtxWorkerBridgeHttpAdapter({
  repository: disabledRepository,
  environment: {},
  clock: () => NOW,
  transport_source: "loopback_private_proxy",
});
const disabledBefore = disabledRepository.queueSnapshot();
assert.equal(disabledAdapter.startupReady(), true);
assert.equal((await disabledAdapter.handle({
  method: "POST",
  path: "/internal/rtx-worker/v1/claim",
  raw_headers: [],
  raw_body: "{}",
})).status, 503);
assert.deepEqual(disabledRepository.queueSnapshot(), disabledBefore);
const missingKeyAdapter = new FarmOsRtxWorkerBridgeHttpAdapter({
  repository,
  environment: { FARMOS_RTX_WORKER_BRIDGE_ENABLED: "true" },
  clock: () => NOW,
  transport_source: "loopback_private_proxy",
});
assert.equal(missingKeyAdapter.startupReady(), false);
await assert.rejects(
  listenFarmOsRtxWorkerBridgeLoopback({ adapter: missingKeyAdapter }),
  /RTX_BRIDGE_STARTUP_UNAVAILABLE/u,
);
let hangRepositoryWrites = 0;
let hangAbortObserved = false;
const hangRepository: FarmOsRtxWorkerBridgeRepository = {
  execute: async (input) =>
    await new Promise((resolve) => {
      input.abort_signal?.addEventListener("abort", () => {
        hangAbortObserved = true;
        resolve({
          result: "rejected",
          failure_code: "BRIDGE_TRANSACTION_FAILED",
          safety: {
            business_sot_changed: false,
            active_projection_modified: false,
            candidate_auto_promoted: false,
            fallback_model_used: false,
            farming_app_write_performed: false,
          },
        });
      }, { once: true });
    }),
};
const hangAdapter = new FarmOsRtxWorkerBridgeHttpAdapter({
  repository: hangRepository,
  environment,
  clock: () => NOW,
  transport_source: "loopback_private_proxy",
});
const hangRaw = JSON.stringify({
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  worker_capabilities: { night_two_pass: true },
  maximum_jobs: 1,
});
const hangHeaders = Object.entries(
  signed("/internal/rtx-worker/v1/claim", hangRaw),
).flatMap(([name, value]) => [name, value]);
const hangStarted = Date.now();
const hangResponse = await hangAdapter.handle({
  method: "POST",
  path: "/internal/rtx-worker/v1/claim",
  raw_headers: hangHeaders,
  raw_body: hangRaw,
});
const hangElapsed = Date.now() - hangStarted;
assert.equal(hangResponse.status, 503);
assert.equal(hangAbortObserved, true);
assert.equal(hangRepositoryWrites, 0);
assert.ok(hangElapsed >= 11_500 && hangElapsed < 15_000);

let resolveBegin: (() => void) | undefined;
let beginEnteredResolve: (() => void) | undefined;
const beginEntered = new Promise<void>((resolve) => {
  beginEnteredResolve = resolve;
});
const transactionQueries: string[] = [];
let destroyReleaseCalled = false;
let normalReleaseCalled = false;
const transactionClient = {
  query: async (sql: string) => {
    transactionQueries.push(sql);
    if (sql.startsWith("begin")) {
      beginEnteredResolve?.();
      await new Promise<void>((resolve) => {
        resolveBegin = resolve;
      });
    }
    return { rowCount: 0, rows: [] };
  },
  release: (destroy?: boolean) => {
    if (destroy === true) destroyReleaseCalled = true;
    else normalReleaseCalled = true;
  },
};
const abortRaceRepository = new FarmOsRtxWorkerBridgePostgresRepository({
  pool: {
    connect: async () => transactionClient,
    end: async () => undefined,
  } as never,
  feature_enabled: true,
});
const abortRaceService = new FarmOsRtxWorkerBridgeService({
  repository: abortRaceRepository,
  hmac_key: KEY,
  environment,
  clock: () => NOW,
});
const abortRaceRaw = JSON.stringify({
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  worker_capabilities: { night_two_pass: true },
  maximum_jobs: 1,
});
const abortRaceController = new AbortController();
const abortRaceResponse = abortRaceService.handle({
  method: "POST",
  path: "/internal/rtx-worker/v1/claim",
  headers: signed("/internal/rtx-worker/v1/claim", abortRaceRaw),
  raw_body: abortRaceRaw,
  abort_signal: abortRaceController.signal,
  transport_context: {
    source: "loopback_private_proxy",
    public_request: false,
    ordinary_lan_request: false,
    tls_or_private_overlay_verified: true,
  },
});
await beginEntered;
abortRaceController.abort();
resolveBegin?.();
assert.equal((await abortRaceResponse).http_status, 503);
assert.equal(transactionQueries.length, 1);
assert.equal(destroyReleaseCalled, true);
assert.equal(normalReleaseCalled, false);

for (const unsafeTransport of ["public", "ordinary_lan"]) {
  const unsafe = new FarmOsRtxWorkerBridgeHttpAdapter({
    repository,
    environment,
    clock: () => NOW,
    transport_source: unsafeTransport as never,
  });
  assert.equal((await unsafe.handle({
    method: "POST",
    path: "/internal/rtx-worker/v1/claim",
    raw_headers: [],
    raw_body: "{}",
  })).status, 401);
}

const server = await listenFarmOsRtxWorkerBridgeLoopback({ adapter });
const address = server.address();
assert.ok(address !== null && typeof address !== "string");
assert.equal(address.address, "127.0.0.1");
assert.equal(address.port, 18746);
try {
  const claimBody = {
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    worker_capabilities: { night_two_pass: true },
    maximum_jobs: 1,
  };
  const rawClaim = `{\n  "contract_version": "${
    FARM_OS_RTX_WORKER_BRIDGE_CONTRACT
  }",\n  "worker_capabilities": {"night_two_pass": true},\n  "maximum_jobs": 1\n}`;
  const claimHeaders = signed("/internal/rtx-worker/v1/claim", rawClaim, {
    nonce: "fixture_http_nonce_claim_000001",
  });
  const claimed = await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: rawClaim,
    headers: claimHeaders,
  });
  assert.equal(claimed.status, 200);
  assert.equal(claimed.body.result, "leased");
  const receipt = claimed.body.lease_receipt;
  assert.equal(typeof receipt, "string");

  const alteredWhitespace = JSON.stringify(claimBody);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: alteredWhitespace,
    headers: claimHeaders,
  })).status, 401);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: rawClaim,
    headers: claimHeaders,
  })).body.result, "replay_rejected");

  const invalidSignatureRaw = JSON.stringify(claimBody);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: invalidSignatureRaw,
    headers: signed("/internal/rtx-worker/v1/claim", invalidSignatureRaw, {
      signature: "0".repeat(64),
    }),
  })).status, 401);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: invalidSignatureRaw,
    headers: signFarmOsRtxBridgeRequest({
      hmac_key: KEY,
      method: "POST",
      path: "/internal/rtx-worker/v1/claim",
      worker_id: FARM_OS_RTX_WORKER_ID,
      timestamp: String(Number(timestamp) - 61),
      nonce: "fixture_http_nonce_expired_timestamp",
      raw_body: invalidSignatureRaw,
    }),
  })).status, 401);
  assert.equal((await adapter.handle({
    method: "POST",
    path: "/internal/rtx-worker/v1/claim",
    raw_headers: [],
    raw_body: invalidSignatureRaw,
  })).status, 401);
  const duplicateHeaders = Object.entries(
    signed("/internal/rtx-worker/v1/claim", invalidSignatureRaw),
  ).flatMap(([name, value]) => [name, value]);
  duplicateHeaders.push(
    "X-FARMOS-NONCE",
    "fixture_http_nonce_duplicate_actual",
  );
  assert.equal((await adapter.handle({
    method: "POST",
    path: "/internal/rtx-worker/v1/claim",
    raw_headers: duplicateHeaders,
    raw_body: invalidSignatureRaw,
  })).status, 401);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: invalidSignatureRaw,
    headers: signed("/internal/rtx-worker/v1/claim", invalidSignatureRaw, {
      contentHash: "f".repeat(64),
    }),
  })).status, 401);

  const spoofRaw = JSON.stringify({
    ...claimBody,
    transport_context: {
      source: "tailscale_private",
      public_request: false,
    },
  });
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: spoofRaw,
    headers: signed("/internal/rtx-worker/v1/claim", spoofRaw),
  })).status, 400);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/unknown",
    raw_body: "{}",
    headers: {},
  })).status, 400);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    method: "GET",
    raw_body: "",
    headers: {},
  })).status, 400);

  const oversized = "x".repeat(4097);
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: oversized,
    headers: signed("/internal/rtx-worker/v1/claim", oversized),
  })).status, 413);
  assert.equal((await adapter.handle({
    method: "POST",
    path: "/internal/rtx-worker/v1/candidate",
    raw_headers: [],
    raw_body: "x".repeat(32769),
  })).status, 413);

  const heartbeatRaw = JSON.stringify({
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    job_id: jobs[0].job_id,
    lease_receipt: receipt,
  });
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/heartbeat",
    raw_body: heartbeatRaw,
    headers: signed("/internal/rtx-worker/v1/heartbeat", heartbeatRaw),
  })).body.result, "lease_extended");

  const candidateRaw = JSON.stringify({
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    job_id: jobs[0].job_id,
    lease_receipt: receipt,
    candidate: candidate(jobs[0]),
    worker_metrics: metrics,
  });
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/candidate",
    raw_body: candidateRaw,
    headers: signed("/internal/rtx-worker/v1/candidate", candidateRaw),
  })).body.result, "accepted");

  const secondClaimRaw = JSON.stringify(claimBody);
  const secondClaim = await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: secondClaimRaw,
    headers: signed("/internal/rtx-worker/v1/claim", secondClaimRaw),
  });
  const failureRaw = JSON.stringify({
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    job_id: jobs[1].job_id,
    lease_receipt: secondClaim.body.lease_receipt,
    failure_code: "request_timeout",
    retryable: true,
    safe_metrics: metrics,
  });
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/failure",
    raw_body: failureRaw,
    headers: signed("/internal/rtx-worker/v1/failure", failureRaw),
  })).body.result, "failure_recorded");

  const thirdClaimRaw = JSON.stringify(claimBody);
  const thirdClaim = await httpCall({
    path: "/internal/rtx-worker/v1/claim",
    raw_body: thirdClaimRaw,
    headers: signed("/internal/rtx-worker/v1/claim", thirdClaimRaw),
  });
  const rejectedRaw = JSON.stringify({
    contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
    job_id: jobs[2].job_id,
    lease_receipt: thirdClaim.body.lease_receipt,
    candidate: {
      ...candidate(jobs[2]),
      summary: "sourceに存在しない確定事実",
    },
    worker_metrics: metrics,
  });
  assert.equal((await httpCall({
    path: "/internal/rtx-worker/v1/candidate",
    raw_body: rejectedRaw,
    headers: signed("/internal/rtx-worker/v1/candidate", rejectedRaw),
  })).body.result, "rejected");

  const exposed = JSON.stringify([
    claimed.body,
    repository.queueSnapshot().candidates.map((value) => ({
      automatically_promoted: value.automatically_promoted,
      projection_active_version: value.projection_active_version,
    })),
  ]);
  for (const forbidden of [
    KEY,
    "x-farmos-signature",
    "DATABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "reasoning_content",
  ]) assert.equal(exposed.includes(forbidden), false);
} finally {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
}

const portProbe = createServer();
await new Promise<void>((resolve, reject) => {
  portProbe.once("error", reject);
  portProbe.listen(18746, "127.0.0.1", resolve);
});
await new Promise<void>((resolve, reject) =>
  portProbe.close((error) => error ? reject(error) : resolve())
);

assert.equal(FARM_OS_RTX_BRIDGE_NETWORK_POLICY.listener, "loopback_only");
assert.equal(FARM_OS_RTX_BRIDGE_NETWORK_POLICY.tailscale_funnel, "prohibited");
assert.equal(FARM_OS_RTX_BRIDGE_NETWORK_POLICY.ordinary_lan, "prohibited");
assert.equal(FARM_OS_RTX_BRIDGE_NETWORK_POLICY.public_internet, "prohibited");
assert.equal(FARM_OS_RTX_BRIDGE_PRIVATE_SERVE_DRY_RUN.includes("funnel"), false);
assert.equal(FARM_OS_RTX_BRIDGE_HTTP_REQUEST_TIMEOUT_MS, 15_000);

console.log(JSON.stringify({
  test: "farm_os_day146_rtx_worker_bridge_http",
  listener_host: "127.0.0.1",
  listener_port: 18746,
  raw_body_preserved: true,
  duplicate_headers_rejected: true,
  transport_context_server_generated: true,
  private_serve_port: 8443,
  existing_funnel_changed: false,
  windows_worker_connection: false,
  assertions: "PASS",
}));
