import assert from "node:assert/strict";

import {
  createHermesJobEnvelope,
  transitionHermesJobEnvelope,
} from "./job_runtime/hermes_job_envelope";
import type { HermesQueuedJobRecord } from "./queue_runtime/hermes_redis_queue_contract";
import {
  HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  HERMES_RTX_DEFAULT_CAPABILITIES,
  HERMES_WORKER_HEARTBEAT_INTERVAL_MS,
  HERMES_WORKER_HEARTBEAT_TIMEOUT_MS,
  applyHermesWorkerHeartbeat,
  assertHermesWorkerId,
  assertHermesWorkerJobResultMatchesClaim,
  createHermesWorkerAdvertisement,
  createHermesWorkerJobClaim,
  createHermesWorkerJobResult,
  evaluateHermesWorkerAt,
} from "./worker_runtime/hermes_worker_protocol";
import {
  HERMES_WORKER_REGISTRY_TTL_SECONDS,
  createHermesWorkerRegistryKeys,
} from "./worker_runtime/hermes_worker_registry_contract";
import {
  getHermesWorkerStatus,
  heartbeatHermesWorker,
  claimHermesJobForWorker,
  listHermesWorkers,
  registerHermesWorker,
  type HermesWorkerRegistryStore,
} from "./worker_runtime/hermes_worker_registry";

const NOW = "2026-07-11T08:00:00.000Z";

class FakeWorkerRegistryStore implements HermesWorkerRegistryStore {
  readonly values = new Map<string, string>();
  readonly sets = new Map<string, Set<string>>();
  readonly ttlSeconds = new Map<string, number>();
  fail = false;
  failAtomicClaim = false;

  private ready() {
    if (this.fail) throw new Error("hidden redis detail");
  }

  async get(key: string) {
    this.ready();
    return this.values.get(key) ?? null;
  }
  async setWithTtl(key: string, value: string, ttlSeconds: number) {
    this.ready();
    this.values.set(key, value);
    this.ttlSeconds.set(key, ttlSeconds);
  }
  async setExistingWithTtl(key: string, value: string, ttlSeconds: number) {
    this.ready();
    if (!this.values.has(key)) return false;
    this.values.set(key, value);
    this.ttlSeconds.set(key, ttlSeconds);
    return true;
  }
  async setIfAbsentWithTtl(key: string, value: string, ttlSeconds: number) {
    this.ready();
    if (this.values.has(key)) return false;
    this.values.set(key, value);
    this.ttlSeconds.set(key, ttlSeconds);
    return true;
  }
  async claimJobAtomic(input: {
    workerKey: string;
    claimKey: string;
    expectedWorkerId: string;
    jobId: string;
    serializedClaim: string;
    claimTtlSeconds: number;
    workerRecordTtlSeconds: number;
    claimedAt: string;
  }) {
    this.ready();
    if (this.failAtomicClaim) throw new Error("controlled atomic failure");
    const serialized = this.values.get(input.workerKey);
    if (serialized === undefined) {
      return { status: "worker_missing" as const, serializedWorkerRecord: null };
    }
    if (this.values.has(input.claimKey)) {
      return { status: "claim_conflict" as const, serializedWorkerRecord: null };
    }
    const record = JSON.parse(serialized);
    if (
      record.schema_version !== "hermes.worker.registry.v1" ||
      record.worker?.worker_id !== input.expectedWorkerId
    ) {
      return { status: "worker_record_invalid" as const, serializedWorkerRecord: null };
    }
    if (
      record.worker.readiness !== "ready" ||
      record.worker.runtime_available !== true ||
      record.worker.draining !== false ||
      record.worker.health === "unhealthy"
    ) {
      return { status: "worker_not_ready" as const, serializedWorkerRecord: null };
    }
    if (record.worker.active_job_count >= record.worker.max_concurrency) {
      return { status: "worker_capacity_full" as const, serializedWorkerRecord: null };
    }
    const updated = structuredClone(record);
    updated.worker.current_job_id = input.jobId;
    updated.worker.active_job_count += 1;
    updated.registry.last_updated_at = input.claimedAt;
    updated.safety.redis_write_performed = true;
    const updatedJson = JSON.stringify(updated);
    this.values.set(input.claimKey, input.serializedClaim);
    this.ttlSeconds.set(input.claimKey, input.claimTtlSeconds);
    this.values.set(input.workerKey, updatedJson);
    this.ttlSeconds.set(input.workerKey, input.workerRecordTtlSeconds);
    return { status: "claimed" as const, serializedWorkerRecord: updatedJson };
  }
  async addToSet(key: string, value: string) {
    this.ready();
    const set = this.sets.get(key) ?? new Set<string>();
    set.add(value);
    this.sets.set(key, set);
  }
  async getSetMembers(key: string) {
    this.ready();
    return [...(this.sets.get(key) ?? [])];
  }
  async removeFromSet(key: string, value: string) {
    this.ready();
    this.sets.get(key)?.delete(value);
  }
  async deleteKeys(keys: string[]) {
    for (const key of keys) {
      this.values.delete(key);
      this.sets.delete(key);
      this.ttlSeconds.delete(key);
    }
  }
  async disconnect() {}
}

function processingJob(
  jobId = "00000000-0000-4000-8000-000000000199",
): HermesQueuedJobRecord {
  const queued = createHermesJobEnvelope({
    requestId: "00000000-0000-4000-8000-000000000099",
    jobIdFactory: () => jobId,
    nowIsoFactory: () => NOW,
    payload: { message: "worker protocol test", include_readonly_context: false },
  });
  return {
    schema_version: "hermes.queue.v1",
    job: transitionHermesJobEnvelope(queued, "running", NOW),
    queue: {
      status: "processing",
      retry_count: 0,
      max_retry_count: 1,
      enqueued_at: NOW,
      dequeued_at: NOW,
      completed_at: null,
      last_error_code: null,
    },
    safety: {
      db_write_performed: false,
      business_db_write_performed: false,
      proposal_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
      fail_closed: true,
    },
  };
}

async function main(): Promise<void> {
  const mac = createHermesWorkerAdvertisement({
    workerId: "mac-mini-01",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso: NOW,
  });
  const rtx = createHermesWorkerAdvertisement({
    workerId: "rtx-01",
    workerType: "rtx",
    capabilities: HERMES_RTX_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso: NOW,
  });
  assert.equal(mac.schema_version, "hermes.worker.v1");
  assert.equal(mac.worker_type, "mac_mini");
  assert.equal(rtx.worker_type, "rtx");
  assert.deepEqual(mac.capabilities, [...HERMES_MAC_MINI_DEFAULT_CAPABILITIES]);
  assert.deepEqual(rtx.capabilities, [...HERMES_RTX_DEFAULT_CAPABILITIES]);
  assert.equal(mac.health, "healthy");
  assert.equal(mac.readiness, "ready");
  assert.equal(mac.heartbeat_interval_ms, 15000);
  assert.equal(mac.heartbeat_timeout_ms, 45000);
  assert.equal(HERMES_WORKER_HEARTBEAT_INTERVAL_MS, 15000);
  assert.equal(HERMES_WORKER_HEARTBEAT_TIMEOUT_MS, 45000);
  assert.equal(mac.current_job_id, null);
  assert.equal(mac.active_job_count, 0);
  assert.equal(mac.max_concurrency, 1);
  for (const invalidId of ["", "bad worker", "bad:worker", "bad/worker", "127.0.0.1", "localhost"]) {
    assert.throws(() => assertHermesWorkerId(invalidId));
  }
  assert.throws(() => createHermesWorkerAdvertisement({
    workerId: "capacity-negative",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    activeJobCount: -1,
    nowIso: NOW,
  }));
  assert.throws(() => createHermesWorkerAdvertisement({
    workerId: "capacity-missing-job",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    activeJobCount: 1,
    maxConcurrency: 1,
    nowIso: NOW,
  }));
  assert.throws(() => createHermesWorkerAdvertisement({
    workerId: "bad-worker",
    workerType: "mac_mini",
    capabilities: ["model-name-derived-capability"],
    health: "unknown",
    runtimeAvailable: false,
    draining: false,
    nowIso: NOW,
  }));

  const runtimeUnavailable = applyHermesWorkerHeartbeat(mac, {
    health: "healthy",
    runtimeAvailable: false,
    draining: false,
    nowIso: "2026-07-11T08:00:15.000Z",
  });
  assert.equal(runtimeUnavailable.readiness, "not_ready");
  const draining = applyHermesWorkerHeartbeat(mac, {
    health: "healthy",
    runtimeAvailable: true,
    draining: true,
    nowIso: "2026-07-11T08:00:15.000Z",
  });
  assert.equal(draining.readiness, "draining");
  const stale = evaluateHermesWorkerAt(mac, "2026-07-11T08:00:45.000Z");
  assert.equal(stale.readiness, "offline");
  assert.equal(stale.health, "healthy");

  const fullWorker = createHermesWorkerAdvertisement({
    workerId: "mac-mini-full",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    currentJobId: "00000000-0000-4000-8000-000000000999",
    activeJobCount: 1,
    maxConcurrency: 1,
    nowIso: NOW,
  });
  assert.throws(
    () => createHermesWorkerJobClaim({
      worker: fullWorker,
      job: processingJob(),
      requiredCapability: "lightweight_chat",
      nowIso: NOW,
    }),
    /worker_capacity_full/u,
  );
  assert.throws(() => createHermesWorkerJobClaim({
    worker: stale,
    job: processingJob(),
    requiredCapability: "lightweight_chat",
    nowIso: "2026-07-11T08:01:00.000Z",
  }));
  for (const unavailableWorker of [runtimeUnavailable, draining]) {
    assert.throws(() => createHermesWorkerJobClaim({
      worker: unavailableWorker,
      job: processingJob(),
      requiredCapability: "lightweight_chat",
      nowIso: "2026-07-11T08:00:15.000Z",
    }));
  }

  const keys = createHermesWorkerRegistryKeys("farmos:hermes:test:day99-unit");
  const store = new FakeWorkerRegistryStore();
  const context = {
    enabled: true,
    keys,
    storeFactory: async () => store,
    nowIsoFactory: () => NOW,
  };
  let disabledCalls = 0;
  const disabled = await registerHermesWorker(mac, {
    ...context,
    enabled: false,
    storeFactory: async () => {
      disabledCalls += 1;
      return store;
    },
  });
  assert.equal(disabled.ok, false);
  assert.equal(disabledCalls, 0);

  const registered = await registerHermesWorker(mac, context);
  assert.equal(registered.ok, true);
  assert.equal(registered.status, "registered");
  const initialRegistryRecord = JSON.parse(
    store.values.get(keys.worker(mac.worker_id)) ?? "null",
  );
  assert.equal(initialRegistryRecord.schema_version, "hermes.worker.registry.v1");
  assert.equal(initialRegistryRecord.registry.heartbeat_count, 0);
  assert.equal(store.ttlSeconds.get(keys.worker(mac.worker_id)), HERMES_WORKER_REGISTRY_TTL_SECONDS);
  const reRegistered = await registerHermesWorker(
    { ...mac, health: "degraded" },
    context,
  );
  assert.equal(reRegistered.ok, true);
  assert.equal(reRegistered.status, "re_registered");
  if (!reRegistered.ok) throw new Error("re-register failed");
  assert.equal(reRegistered.worker.registry_schema_version, "hermes.worker.registry.v1");
  assert.equal(reRegistered.worker.heartbeat_count, 0);
  const typeChange = await registerHermesWorker(
    { ...mac, worker_type: "rtx" },
    context,
  );
  assert.equal(typeChange.ok, false);
  if (typeChange.ok) throw new Error("type change test failed");
  assert.equal(typeChange.error_code, "worker_type_change_not_allowed");
  const capabilityChange = await registerHermesWorker(
    { ...mac, capabilities: ["classification"] },
    context,
  );
  assert.equal(capabilityChange.ok, false);
  if (capabilityChange.ok) throw new Error("capability change test failed");
  assert.equal(
    capabilityChange.error_code,
    "worker_capability_change_not_allowed",
  );
  const immutableRegistryRecord = JSON.parse(
    store.values.get(keys.worker(mac.worker_id)) ?? "null",
  );
  assert.equal(immutableRegistryRecord.worker.worker_type, "mac_mini");
  assert.deepEqual(
    immutableRegistryRecord.worker.capabilities,
    [...HERMES_MAC_MINI_DEFAULT_CAPABILITIES],
  );

  const heartbeat = await heartbeatHermesWorker(mac.worker_id, {
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
  }, {
    ...context,
    nowIsoFactory: () => "2026-07-11T08:00:15.000Z",
  });
  assert.equal(heartbeat.ok, true);
  assert.equal(heartbeat.status, "heartbeat_recorded");
  if (!heartbeat.ok) throw new Error("heartbeat failed");
  assert.equal(heartbeat.worker.heartbeat_count, 1);
  const heartbeatTwo = await heartbeatHermesWorker(mac.worker_id, {
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
  }, {
    ...context,
    nowIsoFactory: () => "2026-07-11T08:00:30.000Z",
  });
  assert.equal(heartbeatTwo.ok, true);
  if (!heartbeatTwo.ok) throw new Error("second heartbeat failed");
  assert.equal(heartbeatTwo.worker.heartbeat_count, 2);

  await registerHermesWorker(rtx, context);
  const found = await getHermesWorkerStatus(mac.worker_id, context);
  assert.equal(found.ok, true);
  assert.equal(found.status, "found");
  const listed = await listHermesWorkers(context);
  assert.equal(listed.ok, true);
  if (!listed.ok) throw new Error("worker list failed");
  assert.equal(listed.workers.length, 2);
  assert.doesNotMatch(JSON.stringify(listed), /password|token|authorization/u);

  const staleStatus = await getHermesWorkerStatus(mac.worker_id, {
    ...context,
    nowIsoFactory: () => "2026-07-11T08:01:15.000Z",
  });
  assert.equal(staleStatus.ok, true);
  if (!staleStatus.ok || staleStatus.worker === null) throw new Error("stale status failed");
  assert.equal(staleStatus.worker.readiness, "offline");

  const claim = createHermesWorkerJobClaim({
    worker: mac,
    job: processingJob(),
    requiredCapability: "lightweight_chat",
    nowIso: NOW,
    claimIdFactory: () => "00000000-0000-4000-8000-000000000299",
  });
  assert.equal(claim.schema_version, "hermes.worker.claim.v1");
  assert.equal(claim.claim_status, "claimed");
  assert.equal(claim.safety.worker_execution_performed, false);
  assert.throws(() => createHermesWorkerJobClaim({
    worker: mac,
    job: processingJob(),
    requiredCapability: "gpu_inference",
    nowIso: NOW,
  }));
  const result = createHermesWorkerJobResult({
    claim,
    status: "succeeded",
    nowIso: "2026-07-11T08:00:01.000Z",
  });
  assert.equal(result.schema_version, "hermes.worker.result.v1");
  assert.equal(result.output_persisted, false);
  assert.equal(result.error_code, null);
  assert.equal(Object.hasOwn(result, "output"), false);
  assert.equal(result.safety.worker_execution_performed, false);
  assert.equal(result.safety.model_execution_performed, false);
  assert.equal(result.safety.db_write_performed, false);
  assertHermesWorkerJobResultMatchesClaim(result, claim);
  const failedResult = createHermesWorkerJobResult({
    claim,
    status: "failed",
    nowIso: "2026-07-11T08:00:02.000Z",
  });
  assert.equal(failedResult.error_code, "worker_protocol_dry_run_failed");
  assertHermesWorkerJobResultMatchesClaim(failedResult, claim);
  for (const mismatch of [
    { ...result, claim_id: "another-claim" },
    { ...result, job_id: "another-job" },
    { ...result, worker_id: "another-worker" },
  ]) {
    assert.throws(() => assertHermesWorkerJobResultMatchesClaim(mismatch, claim));
  }

  const claimStoreResult = await claimHermesJobForWorker({
    worker: mac,
    job: processingJob(),
    requiredCapability: "lightweight_chat",
    claimIdFactory: () => "00000000-0000-4000-8000-000000000399",
    context,
  });
  assert.equal(claimStoreResult.ok, true);
  if (!claimStoreResult.ok) throw new Error("claim store failed");
  assert.equal(claimStoreResult.claim_ttl_seconds, 300);
  assert.equal(claimStoreResult.worker.current_job_id, claimStoreResult.claim.job_id);
  assert.equal(claimStoreResult.worker.active_job_count, 1);
  assert.equal(claimStoreResult.worker.max_concurrency, 1);
  const claimedWorkerRecord = JSON.parse(
    store.values.get(keys.worker(mac.worker_id)) ?? "null",
  );
  assert.equal(
    claimedWorkerRecord.worker.current_job_id,
    claimStoreResult.claim.job_id,
  );
  assert.equal(claimedWorkerRecord.worker.active_job_count, 1);
  assert.equal(
    store.ttlSeconds.get(keys.claim(claimStoreResult.claim.job_id)),
    300,
  );
  const duplicateClaim = await claimHermesJobForWorker({
    worker: mac,
    job: processingJob(),
    requiredCapability: "lightweight_chat",
    context,
  });
  assert.equal(duplicateClaim.ok, false);
  if (duplicateClaim.ok) throw new Error("duplicate claim test failed");
  assert.equal(duplicateClaim.error_code, "worker_claim_conflict");

  const secondJob = processingJob(
    "00000000-0000-4000-8000-000000000200",
  );
  const capacityBlockedClaim = await claimHermesJobForWorker({
    worker: mac,
    job: secondJob,
    requiredCapability: "lightweight_chat",
    context,
  });
  assert.equal(capacityBlockedClaim.ok, false);
  if (capacityBlockedClaim.ok) throw new Error("capacity claim test failed");
  assert.equal(capacityBlockedClaim.error_code, "worker_capacity_full");
  assert.equal(store.values.has(keys.claim(secondJob.job.runtime.job_id)), false);

  const otherMac = createHermesWorkerAdvertisement({
    workerId: "mac-mini-02",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso: NOW,
  });
  await registerHermesWorker(otherMac, context);
  const conflictingWorkerClaim = await claimHermesJobForWorker({
    worker: otherMac,
    job: processingJob(),
    requiredCapability: "lightweight_chat",
    context,
  });
  assert.equal(conflictingWorkerClaim.ok, false);
  if (conflictingWorkerClaim.ok) throw new Error("worker conflict test failed");
  assert.equal(conflictingWorkerClaim.error_code, "worker_claim_conflict");

  const atomicStore = new FakeWorkerRegistryStore();
  const atomicContext = {
    ...context,
    storeFactory: async () => atomicStore,
  };
  const atomicWorker = createHermesWorkerAdvertisement({
    workerId: "mac-mini-atomic",
    workerType: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso: NOW,
  });
  await registerHermesWorker(atomicWorker, atomicContext);
  atomicStore.failAtomicClaim = true;
  const atomicJob = processingJob(
    "00000000-0000-4000-8000-000000000201",
  );
  const atomicFailure = await claimHermesJobForWorker({
    worker: atomicWorker,
    job: atomicJob,
    requiredCapability: "lightweight_chat",
    context: atomicContext,
  });
  assert.equal(atomicFailure.ok, false);
  assert.equal(
    atomicStore.values.has(keys.claim(atomicJob.job.runtime.job_id)),
    false,
  );
  const atomicWorkerAfter = JSON.parse(
    atomicStore.values.get(keys.worker(atomicWorker.worker_id)) ?? "null",
  );
  assert.equal(atomicWorkerAfter.worker.current_job_id, null);
  assert.equal(atomicWorkerAfter.worker.active_job_count, 0);

  const failedStore = new FakeWorkerRegistryStore();
  failedStore.fail = true;
  const unavailable = await registerHermesWorker(mac, {
    ...context,
    storeFactory: async () => failedStore,
  });
  assert.equal(unavailable.ok, false);
  if (unavailable.ok) throw new Error("registry failure test failed");
  assert.equal(unavailable.error_code, "worker_registry_unavailable");
  assert.equal(unavailable.fail_closed, true);
  assert.doesNotMatch(JSON.stringify(unavailable), /hidden redis detail/u);
  const claimUnavailable = await claimHermesJobForWorker({
    worker: mac,
    job: processingJob(),
    requiredCapability: "lightweight_chat",
    context: { ...context, storeFactory: async () => failedStore },
  });
  assert.equal(claimUnavailable.ok, false);
  if (claimUnavailable.ok) throw new Error("claim unavailable test failed");
  assert.equal(
    claimUnavailable.error_code,
    "worker_claim_registry_unavailable",
  );

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_worker_protocol_boundary",
    schema_version: "hermes.worker.v1",
    mac_mini: "ok",
    rtx: "ok",
    heartbeat_stale_offline: "ok",
    registry: "ok",
    claim_contract: "ok",
    result_contract: "ok",
    external_redis_connection_performed: false,
    db_write_performed: false,
    worker_execution_performed: false,
    model_execution_performed: false,
    api_route_added: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
