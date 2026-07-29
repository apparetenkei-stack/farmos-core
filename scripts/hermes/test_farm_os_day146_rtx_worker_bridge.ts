import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  FARM_OS_RTX_WORKER_ID,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_contract";
import {
  signFarmOsRtxBridgeRequest,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_auth";
import {
  FarmOsInMemoryRtxWorkerBridgeRepository,
  FarmOsRtxWorkerBridgeService,
} from "../../src/lib/hermes/farm_os_rtx_worker_bridge_service";
import {
  FarmOsInMemoryRtxStructuringQueue,
} from "../../src/lib/hermes/farm_os_rtx_structuring_queue";

type Fixture = {
  job: Record<string, unknown>;
  valid_candidate: Record<string, unknown>;
};
const fixture = JSON.parse(readFileSync(
  new URL("./farm_os_day146_rtx_structuring_fixture.json", import.meta.url),
  "utf8",
)) as Fixture;
const KEY = "fixture-only-hmac-key-32-characters-minimum";
const NOW = new Date("2026-07-28T13:00:00.000Z");
const PATHS = {
  claim: "/internal/rtx-worker/v1/claim",
  heartbeat: "/internal/rtx-worker/v1/heartbeat",
  candidate: "/internal/rtx-worker/v1/candidate",
  failure: "/internal/rtx-worker/v1/failure",
} as const;
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
const privateTransport = {
  source: "tailscale_private",
  public_request: false,
  ordinary_lan_request: false,
  tls_or_private_overlay_verified: true,
} as const;

function seeded() {
  const queue = new FarmOsInMemoryRtxStructuringQueue();
  assert.equal(queue.createFixtureJob(fixture.job).status, "created");
  return new FarmOsInMemoryRtxWorkerBridgeRepository({
    queue_state: queue.snapshot(),
    feature_enabled: true,
    receipt_factory: () =>
      "fixture_lease_receipt_abcdefghijklmnopqrstuvwxyz_0123456789",
  });
}
function service(
  repository: FarmOsInMemoryRtxWorkerBridgeRepository,
  now = NOW,
  enabled = true,
) {
  return new FarmOsRtxWorkerBridgeService({
    repository,
    hmac_key: KEY,
    environment: {
      FARMOS_RTX_WORKER_BRIDGE_ENABLED: enabled ? "true" : undefined,
    },
    clock: () => now,
  });
}
let nonceSequence = 0;
async function call(
  bridge: FarmOsRtxWorkerBridgeService,
  path: string,
  value: unknown,
  overrides: {
    nonce?: string;
    timestamp?: string;
    worker?: string;
    signature?: string;
    contentHash?: string;
  } = {},
) {
  const raw = JSON.stringify(value);
  const nonce = overrides.nonce ??
    `fixture_nonce_${String(++nonceSequence).padStart(4, "0")}`;
  const timestamp = overrides.timestamp ??
    String(Math.floor(NOW.getTime() / 1000));
  const headers = signFarmOsRtxBridgeRequest({
    hmac_key: KEY,
    method: "POST",
    path,
    worker_id: overrides.worker ?? FARM_OS_RTX_WORKER_ID,
    timestamp,
    nonce,
    raw_body: raw,
  });
  if (overrides.signature) {
    headers["x-farmos-signature"] = overrides.signature;
  }
  if (overrides.contentHash) {
    headers["x-farmos-content-sha256"] = overrides.contentHash;
  }
  return bridge.handle({
    method: "POST",
    path,
    headers,
    raw_body: raw,
    transport_context: privateTransport,
  });
}
const claimBody = {
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  worker_capabilities: { night_two_pass: true },
  maximum_jobs: 1,
};

const authRepository = seeded();
const authService = service(authRepository);
const claimed = await call(authService, PATHS.claim, claimBody);
assert.equal(claimed.http_status, 200);
assert.equal(claimed.body.result, "leased");
assert.equal((claimed.body.job as Record<string, unknown>).contract_version,
  "farmos.operational_memory.rtx_structuring_job.v1");
assert.equal(Object.hasOwn(claimed.body.job as object, "connection_string"), false);
const receipt = claimed.body.lease_receipt;
assert.equal(typeof receipt, "string");

const invalidSignature = await call(
  service(seeded()),
  PATHS.claim,
  claimBody,
  { signature: "0".repeat(64) },
);
assert.equal(invalidSignature.body.result, "unauthorized");
const expired = await call(service(seeded()), PATHS.claim, claimBody, {
  timestamp: String(Math.floor(NOW.getTime() / 1000) - 61),
});
assert.equal(expired.body.result, "unauthorized");
const unknownWorker = await call(service(seeded()), PATHS.claim, claimBody, {
  worker: "worker_unknown_01",
});
assert.equal(unknownWorker.body.result, "unauthorized");
const mismatchedBodyHash = await call(
  service(seeded()),
  PATHS.claim,
  claimBody,
  { contentHash: "f".repeat(64) },
);
assert.equal(mismatchedBodyHash.body.result, "unauthorized");

const replayRepository = seeded();
const replayService = service(replayRepository);
const replayNonce = "fixture_nonce_single_use_0001";
assert.equal((await call(
  replayService,
  PATHS.claim,
  claimBody,
  { nonce: replayNonce },
)).body.result, "leased");
assert.equal((await call(
  replayService,
  PATHS.claim,
  claimBody,
  { nonce: replayNonce },
)).body.result, "replay_rejected");

assert.equal((await call(
  service(seeded()),
  PATHS.claim,
  { ...claimBody, maximum_jobs: 2 },
)).body.result, "invalid_request");
assert.equal((await call(
  service(seeded()),
  PATHS.claim,
  { ...claimBody, job_ids: ["rtx_job_fixture_001"] },
)).body.result, "invalid_request");

const heartbeatBody = {
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  job_id: fixture.job.job_id,
  lease_receipt: receipt,
};
const heartbeat = await call(authService, PATHS.heartbeat, heartbeatBody);
assert.equal(heartbeat.body.result, "lease_extended");
assert.equal((await call(
  authService,
  PATHS.heartbeat,
  heartbeatBody,
)).body.result, "lease_extended");
assert.equal((await call(
  authService,
  PATHS.heartbeat,
  heartbeatBody,
)).body.failure_code, "HEARTBEAT_LIMIT_EXCEEDED");

const candidateRepository = seeded();
const candidateService = service(candidateRepository);
const candidateClaim = await call(candidateService, PATHS.claim, claimBody);
const candidateBody = {
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  job_id: fixture.job.job_id,
  lease_receipt: candidateClaim.body.lease_receipt,
  candidate: fixture.valid_candidate,
  worker_metrics: metrics,
};
assert.equal((await call(
  candidateService,
  PATHS.candidate,
  candidateBody,
)).body.result, "accepted");
assert.equal((await call(
  candidateService,
  PATHS.candidate,
  candidateBody,
)).body.result, "idempotent_replay");
const reorderedCandidate = Object.fromEntries(
  Object.entries(fixture.valid_candidate).reverse(),
);
assert.equal((await call(
  candidateService,
  PATHS.candidate,
  { ...candidateBody, candidate: reorderedCandidate },
)).body.result, "idempotent_replay");
assert.equal((await call(
  candidateService,
  PATHS.candidate,
  {
    ...candidateBody,
    candidate: { ...fixture.valid_candidate, confidence: 0.61 },
  },
)).body.result, "conflict");
const candidateState = candidateRepository.queueSnapshot();
assert.equal(candidateState.candidates.length, 1);
assert.equal(candidateState.candidates[0]?.automatically_promoted, false);
assert.equal(candidateState.candidates[0]?.projection_active_version, false);

const rejectedRepository = seeded();
const rejectedService = service(rejectedRepository);
const rejectedClaim = await call(rejectedService, PATHS.claim, claimBody);
const rejected = await call(rejectedService, PATHS.candidate, {
  ...candidateBody,
  lease_receipt: rejectedClaim.body.lease_receipt,
  candidate: {
    ...fixture.valid_candidate,
    summary: "sourceに存在しない確定事実",
  },
});
assert.equal(rejected.body.result, "rejected");
assert.equal(rejected.body.failure_code, "CANDIDATE_REJECTED");
assert.equal(rejectedRepository.queueSnapshot().candidates[0]?.state, "rejected");
const rejectedCount = rejectedRepository.queueSnapshot().candidates.length;
assert.equal((await call(rejectedService, PATHS.candidate, {
  ...candidateBody,
  lease_receipt: rejectedClaim.body.lease_receipt,
  candidate: {
    ...fixture.valid_candidate,
    summary: "sourceに存在しない確定事実",
  },
})).body.result, "idempotent_replay");
assert.equal(rejectedRepository.queueSnapshot().candidates.length,
  rejectedCount);

const crossJobQueue = new FarmOsInMemoryRtxStructuringQueue();
assert.equal(crossJobQueue.createFixtureJob(fixture.job).status, "created");
const secondJob = {
  ...structuredClone(fixture.job),
  job_id: "rtx_job_fixture_cross_002",
  source_snapshot_id: "snapshot_fixture_cross_002",
  source_record_id: "work_fixture_cross_002",
  source_content_hash: "b".repeat(64),
  created_at: "2026-07-28T21:01:00+09:00",
  not_before: "2026-07-28T22:00:00+09:00",
};
assert.equal(crossJobQueue.createFixtureJob(secondJob).status, "created");
const crossJobRepository = new FarmOsInMemoryRtxWorkerBridgeRepository({
  queue_state: crossJobQueue.snapshot(),
  receipt_factory: () =>
    "fixture_cross_job_receipt_abcdefghijklmnopqrstuvwxyz_012345",
  feature_enabled: true,
});
const crossJobService = service(crossJobRepository);
const crossJobClaim = await call(crossJobService, PATHS.claim, claimBody);
const crossJobBefore = crossJobRepository.queueSnapshot();
const crossJobCandidate = {
  ...structuredClone(fixture.valid_candidate),
  job_id: secondJob.job_id,
  source_snapshot_id: secondJob.source_snapshot_id,
  source_record_id: secondJob.source_record_id,
  source_content_hash: secondJob.source_content_hash,
};
const crossJobResult = await call(crossJobService, PATHS.candidate, {
  ...candidateBody,
  lease_receipt: crossJobClaim.body.lease_receipt,
  candidate: crossJobCandidate,
});
assert.equal(crossJobResult.body.result, "rejected");
assert.equal(crossJobResult.body.failure_code, "CANDIDATE_JOB_MISMATCH");
const crossJobAfter = crossJobRepository.queueSnapshot();
assert.equal(crossJobAfter.candidates.length, crossJobBefore.candidates.length);
assert.equal(crossJobAfter.events.length, crossJobBefore.events.length);

const failureRepository = seeded();
const failureService = service(failureRepository);
const failureClaim = await call(failureService, PATHS.claim, claimBody);
const failureBody = {
  contract_version: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  job_id: fixture.job.job_id,
  lease_receipt: failureClaim.body.lease_receipt,
  failure_code: "lm_studio_unavailable",
  retryable: true,
  safe_metrics: metrics,
};
assert.equal((await call(
  failureService,
  PATHS.failure,
  failureBody,
)).body.result, "failure_recorded");
assert.equal((await call(
  failureService,
  PATHS.failure,
  failureBody,
)).body.result, "idempotent_replay");
assert.equal(failureRepository.queueSnapshot().events.at(-1)?.status,
  "retry_pending");

const disabledRepository = seeded();
const disabledBefore = disabledRepository.queueSnapshot();
assert.equal((await call(
  service(disabledRepository, NOW, false),
  PATHS.claim,
  claimBody,
)).body.result, "unavailable");
assert.deepEqual(disabledRepository.queueSnapshot(), disabledBefore);
const repositoryDisabledQueue = new FarmOsInMemoryRtxStructuringQueue();
assert.equal(repositoryDisabledQueue.createFixtureJob(fixture.job).status,
  "created");
const repositoryDisabled = new FarmOsInMemoryRtxWorkerBridgeRepository({
  queue_state: repositoryDisabledQueue.snapshot(),
});
assert.equal((await call(
  service(repositoryDisabled),
  PATHS.claim,
  claimBody,
)).body.result, "unavailable");
assert.equal(repositoryDisabled.queueSnapshot().events.length, 1);

const oversized = "x".repeat(4097);
const oversizedHeaders = signFarmOsRtxBridgeRequest({
  hmac_key: KEY,
  method: "POST",
  path: PATHS.claim,
  worker_id: FARM_OS_RTX_WORKER_ID,
  timestamp: String(Math.floor(NOW.getTime() / 1000)),
  nonce: "fixture_nonce_oversized",
  raw_body: oversized,
});
assert.equal((await authService.handle({
  method: "POST",
  path: PATHS.claim,
  headers: oversizedHeaders,
  raw_body: oversized,
  transport_context: privateTransport,
})).body.result, "payload_too_large");
const publicTransportRaw = JSON.stringify(claimBody);
const publicTransportHeaders = signFarmOsRtxBridgeRequest({
  hmac_key: KEY,
  method: "POST",
  path: PATHS.claim,
  worker_id: FARM_OS_RTX_WORKER_ID,
  timestamp: String(Math.floor(NOW.getTime() / 1000)),
  nonce: "fixture_nonce_public_transport",
  raw_body: publicTransportRaw,
});
assert.equal((await authService.handle({
  method: "POST",
  path: PATHS.claim,
  headers: publicTransportHeaders,
  raw_body: publicTransportRaw,
  transport_context: {
    source: "tailscale_private",
    public_request: true,
    ordinary_lan_request: false,
    tls_or_private_overlay_verified: true,
  } as never,
})).body.result, "unauthorized");

const expiredLeaseRepository = seeded();
const expiredLeaseClaim = await call(
  service(expiredLeaseRepository),
  PATHS.claim,
  claimBody,
);
const afterExpiry = service(
  expiredLeaseRepository,
  new Date("2026-07-28T13:10:01.000Z"),
);
const expiredHeartbeatRaw = JSON.stringify({
  ...heartbeatBody,
  lease_receipt: expiredLeaseClaim.body.lease_receipt,
});
const expiredHeartbeatHeaders = signFarmOsRtxBridgeRequest({
  hmac_key: KEY,
  method: "POST",
  path: PATHS.heartbeat,
  worker_id: FARM_OS_RTX_WORKER_ID,
  timestamp: String(Math.floor(
    new Date("2026-07-28T13:10:01.000Z").getTime() / 1000,
  )),
  nonce: "fixture_nonce_expired_lease",
  raw_body: expiredHeartbeatRaw,
});
assert.equal((await afterExpiry.handle({
  method: "POST",
  path: PATHS.heartbeat,
  headers: expiredHeartbeatHeaders,
  raw_body: expiredHeartbeatRaw,
  transport_context: privateTransport,
})).body.failure_code, "LEASE_INVALID");

const serialized = JSON.stringify({
  contract: FARM_OS_RTX_WORKER_BRIDGE_CONTRACT,
  candidate_state: candidateState.candidates[0],
});
for (const forbidden of [
  "DATABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "FARMOS_RTX_BRIDGE_HMAC_KEY",
  "Authorization",
  "reasoning_content",
]) assert.equal(serialized.includes(forbidden), false);

console.log(JSON.stringify({
  test: "farm_os_day146_rtx_worker_bridge",
  assertions: "PASS",
  valid_signature: true,
  nonce_single_use: true,
  maximum_jobs: 1,
  heartbeat_bounded: true,
  candidate_grounding_rechecked: true,
  idempotent_replay: true,
  feature_flag_default_off: true,
  active_projection_modified: false,
  farming_app_write_performed: false,
}));
