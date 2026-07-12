import assert from "node:assert/strict";
import { createHermesJobEnvelope, transitionHermesJobEnvelope } from "./job_runtime/hermes_job_envelope";
import type { HermesQueuedJobRecord } from "./queue_runtime/hermes_redis_queue_contract";
import {
  HERMES_NON_RETRYABLE_ERROR_CODES, HERMES_RETRYABLE_ERROR_CODES,
} from "./recovery_runtime/hermes_job_recovery_contract";
import {
  HERMES_RETRY_POLICY, calculateHermesRetryDelayMs, createHermesJobTimeoutPolicy,
  evaluateHermesRetryEligibility, isHermesJobTimedOut, isHermesRetryableErrorCode,
  transitionHermesJobToRetryScheduledForRecovery,
} from "./recovery_runtime/hermes_job_recovery_policy";
import {
  cancelHermesJob, createHermesRecoveryKeys, scheduleHermesJobRetry,
  type HermesJobRecoveryStore, type HermesRecoveryAtomicStatus,
} from "./recovery_runtime/hermes_job_recovery_store";

const NOW = "2026-07-12T00:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const PREFIX = "farmos:hermes:test:day101-unit";

function queuedRecord(jobId: string): HermesQueuedJobRecord {
  const job = createHermesJobEnvelope({ requestId: "00000000-0000-4000-8000-000000000101", jobIdFactory: () => jobId,
    nowIsoFactory: () => NOW, payload: { message: "controlled recovery fixture", include_readonly_context: false } });
  return { schema_version: "hermes.queue.v1", job, queue: { status: "queued", retry_count: 0, max_retry_count: 1,
    enqueued_at: NOW, dequeued_at: null, completed_at: null, last_error_code: null },
    safety: { db_write_performed: false, business_db_write_performed: false, proposal_write_performed: false,
      worker_execution_performed: false, model_execution_performed: false, fail_closed: true } };
}

function runningRecord(jobId: string): HermesQueuedJobRecord {
  const record = queuedRecord(jobId);
  return { ...record, job: transitionHermesJobEnvelope(record.job, "running", NOW),
    queue: { ...record.queue, status: "processing", dequeued_at: NOW } };
}

function failedRecord(jobId: string): HermesQueuedJobRecord {
  const record = runningRecord(jobId);
  return { ...record, job: transitionHermesJobEnvelope(record.job, "failed", NOW),
    queue: { ...record.queue, status: "failed", completed_at: NOW, last_error_code: "worker_timeout" } };
}

class FakeRecoveryStore implements HermesJobRecoveryStore {
  values = new Map<string, string>(); lists = new Map<string, string[]>(); absoluteExpiry = new Map<string, number>(); failAtomic = false; corruptCanonicalCancellation = false;
  async get(key: string) { return this.values.get(key) ?? null; }
  async getList(key: string) { return this.lists.get(key) ?? []; }
  async getPttl(key: string) { const expiry = this.absoluteExpiry.get(key); return expiry === undefined ? -1 : Math.max(-2, expiry - NOW_MS); }
  release(i: { claimKey: string; workerKey: string; jobId: string; expectedWorkerId: string; nowIso: string }): HermesRecoveryAtomicStatus | null {
    const claimJson = this.values.get(i.claimKey); if (!claimJson) return null;
    let claim: any; try { claim = JSON.parse(claimJson); } catch { return "claim_record_invalid"; }
    if (claim.schema_version !== "hermes.worker.claim.v1" || claim.job_id !== i.jobId || claim.worker_id !== i.expectedWorkerId || claim.claim_id !== i.expectedClaimId) return "claim_record_invalid";
    const workerJson = this.values.get(i.workerKey); if (!workerJson) return "worker_record_missing";
    let record: any; try { record = JSON.parse(workerJson); } catch { return "worker_record_invalid"; }
    if (record.schema_version !== "hermes.worker.registry.v1" || record.worker?.worker_id !== i.expectedWorkerId) return "worker_record_invalid";
    if (record.worker.current_job_id === i.jobId) { record.worker.current_job_id = null; record.worker.active_job_count = Math.max(0, record.worker.active_job_count - 1); record.registry.last_updated_at = i.nowIso; this.values.set(i.workerKey, JSON.stringify(record)); }
    this.values.delete(i.claimKey); return null;
  }
  async retryAtomic(i: any) {
    if (this.failAtomic) return { status: "atomic_transition_failed" as const, serializedJob: null };
    const before = new Map(this.values); const listsBefore = structuredClone([...this.lists]);
    const serialized = this.values.get(i.jobKey); if (!serialized) return { status: "job_record_missing" as const, serializedJob: null };
    if (this.values.has(i.retryKey)) return { status: "retry_duplicate" as const, serializedJob: null };
    const record = JSON.parse(serialized) as HermesQueuedJobRecord;
    if (record.queue.retry_count >= record.queue.max_retry_count) return { status: "retry_limit_reached" as const, serializedJob: null };
    if (record.job.runtime.status !== "running" && record.job.runtime.status !== "failed") return { status: "retry_job_status_not_allowed" as const, serializedJob: null };
    const jobExpiry = this.absoluteExpiry.get(i.jobKey) ?? -1;
    if (jobExpiry <= Date.parse(i.nowIso)) return { status: "retry_job_expired" as const, serializedJob: null };
    if (jobExpiry <= i.retryNotBeforeEpochMs) return { status: "retry_window_unavailable" as const, serializedJob: null };
    const released = this.release(i); if (released) { this.values = before; this.lists = new Map(listsBefore); return { status: released, serializedJob: null }; }
    record.job = transitionHermesJobToRetryScheduledForRecovery({ job: record.job,
      eligibility: evaluateHermesRetryEligibility({ job: record, errorCode: JSON.parse(i.serializedSchedule).retry_reason_code, nowIso: i.nowIso }), nowIso: i.nowIso });
    record.queue = { ...record.queue, status: "retry_scheduled", retry_count: record.queue.retry_count + 1, dequeued_at: null, completed_at: null,
      last_error_code: JSON.parse(i.serializedSchedule).retry_reason_code };
    const updated = JSON.stringify(record); this.values.set(i.jobKey, updated); this.values.set(i.retryKey, i.serializedSchedule); this.absoluteExpiry.set(i.retryKey, jobExpiry);
    for (const key of [i.pendingKey, i.processingKey, i.deadLetterKey]) this.lists.set(key, (this.lists.get(key) ?? []).filter((x) => x !== i.jobId));
    return { status: "retry_scheduled" as const, serializedJob: updated };
  }
  async cancelAtomic(i: any) {
    const serialized = this.values.get(i.jobKey); if (!serialized) return { status: "job_record_missing" as const, serializedJob: null, serializedCancellation: null };
    const existing = this.values.get(i.cancelKey); const record = JSON.parse(serialized) as HermesQueuedJobRecord;
    if (existing) {
      let saved: any; let requested: any;
      try { saved = JSON.parse(existing); requested = JSON.parse(i.serializedCancellation); } catch { return { status: "cancel_conflict" as const, serializedJob: null, serializedCancellation: null }; }
      return saved.schema_version === "hermes.cancel.request.v1" && record.job.runtime.status === "cancelled" &&
        saved.job_id === requested.job_id && saved.request_id === requested.request_id && saved.requested_by === requested.requested_by && saved.reason_code === requested.reason_code
        ? { status: "already_cancelled" as const, serializedJob: serialized, serializedCancellation: existing } : { status: "cancel_conflict" as const, serializedJob: null, serializedCancellation: null };
    }
    if (!["queued", "running", "retry_scheduled"].includes(record.job.runtime.status)) return { status: "cancel_not_allowed" as const, serializedJob: null, serializedCancellation: null };
    const released = this.release(i); if (released) return { status: released, serializedJob: null, serializedCancellation: null };
    record.job = transitionHermesJobEnvelope(record.job, "cancelled", i.nowIso); record.queue = { ...record.queue, status: "cancelled", completed_at: i.nowIso, last_error_code: "cancelled_by_user" };
    const updated = JSON.stringify(record); this.values.set(i.jobKey, updated); this.values.set(i.cancelKey, i.serializedCancellation); this.absoluteExpiry.set(i.cancelKey, this.absoluteExpiry.get(i.jobKey)!);
    if (record.queue.status === "cancelled") for (const retryKey of i.retryKeys) { this.values.delete(retryKey); this.absoluteExpiry.delete(retryKey); }
    for (const key of [i.pendingKey, i.processingKey, i.deadLetterKey]) this.lists.set(key, (this.lists.get(key) ?? []).filter((x) => x !== i.jobId));
    return { status: "cancelled" as const, serializedJob: updated, serializedCancellation: this.corruptCanonicalCancellation ? "{}" : i.serializedCancellation };
  }
  async deleteKeys(keys: string[]) { keys.forEach((k) => { this.values.delete(k); this.lists.delete(k); this.absoluteExpiry.delete(k); }); }
  async disconnect() {}
}

function workerRecord(workerId: string, jobId: string) { return { schema_version: "hermes.worker.registry.v1", worker: { worker_id: workerId,
  current_job_id: jobId, active_job_count: 1 }, registry: { last_updated_at: NOW }, safety: { redis_write_performed: true } }; }
function claim(workerId: string, jobId: string) { return { schema_version: "hermes.worker.claim.v1", claim_id: `claim-${jobId}`, request_id: "00000000-0000-4000-8000-000000000101",
  job_id: jobId, worker_id: workerId, required_capability: "lightweight_chat", claimed_at: NOW, claim_status: "claimed" }; }

async function main() {
  assert.deepEqual(["lightweight", "standard", "heavy"].map((x) => createHermesJobTimeoutPolicy(x as any).timeout_ms), [60000, 180000, 600000]);
  const timeout = createHermesJobTimeoutPolicy("lightweight"); assert.equal(timeout.source, "server_policy"); assert.equal(timeout.safety.client_timeout_override_allowed, false);
  assert.equal(isHermesJobTimedOut({ startedAtIso: NOW, nowIso: "2026-07-12T00:00:59.999Z", policy: timeout }), false);
  assert.equal(isHermesJobTimedOut({ startedAtIso: NOW, nowIso: "2026-07-12T00:01:00.000Z", policy: timeout }), true);
  assert.throws(() => isHermesJobTimedOut({ startedAtIso: "invalid", nowIso: NOW, policy: timeout }), /timestamp_invalid/u);
  for (const code of HERMES_RETRYABLE_ERROR_CODES) assert.equal(isHermesRetryableErrorCode(code), true);
  for (const code of HERMES_NON_RETRYABLE_ERROR_CODES) assert.equal(isHermesRetryableErrorCode(code), false);
  assert.equal(isHermesRetryableErrorCode("unknown_internal_exception"), false);
  assert.equal(calculateHermesRetryDelayMs(0), 5000); assert.equal(calculateHermesRetryDelayMs(1), 10000); assert.equal(calculateHermesRetryDelayMs(20), 60000);
  assert.throws(() => calculateHermesRetryDelayMs(-1)); assert.throws(() => calculateHermesRetryDelayMs(0.5));
  const base = runningRecord("job-eligibility"); assert.equal(evaluateHermesRetryEligibility({ job: base, errorCode: "worker_timeout", nowIso: NOW }).retryable, true);
  for (const terminal of ["succeeded", "cancelled", "expired"] as const) { const copy = structuredClone(base); copy.job.runtime.status = terminal; assert.equal(evaluateHermesRetryEligibility({ job: copy, errorCode: "worker_timeout", nowIso: NOW }).retryable, false); }
  const failed = structuredClone(base); failed.job.runtime.status = "failed"; assert.equal(evaluateHermesRetryEligibility({ job: failed, errorCode: "worker_timeout", nowIso: NOW }).retryable, true);
  assert.equal(evaluateHermesRetryEligibility({ job: failed, errorCode: "invalid_payload", nowIso: NOW }).reason_code, "retry_error_not_allowed");
  const failedLimited = structuredClone(failed); failedLimited.queue.retry_count = 1; assert.equal(evaluateHermesRetryEligibility({ job: failedLimited, errorCode: "worker_timeout", nowIso: NOW }).reason_code, "retry_limit_reached");
  const queued = structuredClone(base); queued.job.runtime.status = "queued"; queued.queue.status = "queued"; assert.equal(evaluateHermesRetryEligibility({ job: queued, errorCode: "worker_timeout", nowIso: NOW }).reason_code, "retry_job_status_not_allowed");
  const waiting = structuredClone(base); waiting.job.runtime.status = "retry_scheduled"; waiting.queue.status = "retry_scheduled"; assert.equal(evaluateHermesRetryEligibility({ job: waiting, errorCode: "worker_timeout", nowIso: NOW }).reason_code, "retry_job_status_not_allowed");
  const limited = structuredClone(base); limited.queue.retry_count = 1; assert.equal(evaluateHermesRetryEligibility({ job: limited, errorCode: "worker_timeout", nowIso: NOW }).reason_code, "retry_limit_reached");
  assert.equal(evaluateHermesRetryEligibility({ job: base, errorCode: "invalid_payload", nowIso: NOW }).reason_code, "retry_error_not_allowed");
  const short = structuredClone(base); short.job.runtime.expires_at = "2026-07-12T00:00:05.000Z"; assert.equal(evaluateHermesRetryEligibility({ job: short, errorCode: "worker_timeout", nowIso: NOW }).reason_code, "retry_window_unavailable");

  const keys = createHermesRecoveryKeys(PREFIX); const store = new FakeRecoveryStore(); const retryJob = failedRecord("retry-job"); const workerId = "worker-one";
  store.values.set(keys.job("retry-job"), JSON.stringify(retryJob)); store.values.set(keys.claim("retry-job"), JSON.stringify(claim(workerId, "retry-job")));
  store.values.set(keys.worker(workerId), JSON.stringify(workerRecord(workerId, "retry-job"))); store.absoluteExpiry.set(keys.job("retry-job"), NOW_MS + 300000); store.lists.set(keys.processing, ["retry-job"]);
  const context = { enabled: true, keys, storeFactory: async () => store, nowIsoFactory: () => NOW };
  const retried = await scheduleHermesJobRetry({ jobId: "retry-job", errorCode: "worker_timeout", context, retryIdFactory: () => "retry-one" });
  assert.equal(retried.ok, true); if (!retried.ok || retried.status !== "retry_scheduled") throw new Error("retry failed");
  assert.equal(retried.schedule.retry_not_before, "2026-07-12T00:00:05.000Z"); assert.equal(retried.job.queue.retry_count, 1); assert.equal(store.values.has(keys.claim("retry-job")), false);
  assert.equal(retried.job.job.runtime.status, "retry_scheduled"); assert.notEqual(retried.job.job.runtime.status, "running");
  const releasedWorker = JSON.parse(store.values.get(keys.worker(workerId))!); assert.equal(releasedWorker.worker.active_job_count, 0); assert.equal(releasedWorker.worker.current_job_id, null);
  assert.deepEqual(store.lists.get(keys.processing), []); assert.deepEqual(store.lists.get(keys.pending) ?? [], []); assert.deepEqual(store.lists.get(keys.deadLetter) ?? [], []);
  assert.equal(store.absoluteExpiry.get(keys.retry("retry-job", 1)), store.absoluteExpiry.get(keys.job("retry-job")));
  const duplicate = await scheduleHermesJobRetry({ jobId: "retry-job", errorCode: "worker_timeout", context }); assert.equal(duplicate.ok, false);
  const scheduledCancel = await cancelHermesJob({ jobId: "retry-job", requestId: retryJob.job.runtime.request_id, context });
  assert.equal(scheduledCancel.ok && scheduledCancel.status, "cancelled");
  if (!scheduledCancel.ok) throw new Error("retry scheduled cancellation failed");
  assert.equal(scheduledCancel.job.job.runtime.status, "cancelled"); assert.equal(scheduledCancel.job.queue.status, "cancelled");
  assert.equal(store.values.has(keys.retry("retry-job", 1)), false); assert.equal(store.values.has(keys.claim("retry-job")), false);
  assert.equal(JSON.parse(store.values.get(keys.worker(workerId))!).worker.active_job_count, 0);
  assert.deepEqual(store.lists.get(keys.pending) ?? [], []); assert.deepEqual(store.lists.get(keys.processing) ?? [], []); assert.deepEqual(store.lists.get(keys.deadLetter) ?? [], []);
  assert.equal(store.values.has(keys.cancel("retry-job")), true);
  const scheduledCanonical = scheduledCancel.cancellation;
  const scheduledCancelAgain = await cancelHermesJob({ jobId: "retry-job", requestId: retryJob.job.runtime.request_id, context });
  assert.equal(scheduledCancelAgain.ok && scheduledCancelAgain.status, "already_cancelled");
  if (!scheduledCancelAgain.ok) throw new Error("retry scheduled idempotent cancellation failed");
  assert.equal(scheduledCancelAgain.cancellation.cancellation_id, scheduledCanonical.cancellation_id);
  assert.equal(store.values.has(keys.retry("retry-job", 1)), false);
  assert.equal(JSON.parse(store.values.get(keys.worker(workerId))!).worker.active_job_count, 0);
  const queuedStore = new FakeRecoveryStore(); const queuedJob = queuedRecord("queued-retry"); queuedStore.values.set(keys.job("queued-retry"), JSON.stringify(queuedJob)); queuedStore.absoluteExpiry.set(keys.job("queued-retry"), NOW_MS + 300000);
  const queuedDenied = await scheduleHermesJobRetry({ jobId: "queued-retry", errorCode: "worker_timeout", context: { enabled: true, keys, storeFactory: async () => queuedStore, nowIsoFactory: () => NOW } });
  assert.equal(queuedDenied.ok, false); if (queuedDenied.ok) throw new Error("queued retry unexpectedly allowed"); assert.equal(queuedDenied.error_code, "retry_job_status_not_allowed");
  const queuedAtomic = await queuedStore.retryAtomic({ jobKey: keys.job("queued-retry"), retryKey: keys.retry("queued-retry", 1), claimKey: keys.claim("queued-retry"), workerKey: keys.worker("unclaimed"),
    pendingKey: keys.pending, processingKey: keys.processing, deadLetterKey: keys.deadLetter, jobId: "queued-retry", expectedWorkerId: "", expectedClaimId: "", nowIso: NOW,
    serializedSchedule: JSON.stringify({ retry_reason_code: "worker_timeout" }), expectedRetryCount: 0, retryNotBeforeEpochMs: NOW_MS + 5000 });
  assert.equal(queuedAtomic.status, "retry_job_status_not_allowed");

  for (const [jobId, running] of [["queued-cancel", false], ["running-cancel", true]] as const) {
    const s = new FakeRecoveryStore(); const record = running ? runningRecord(jobId) : queuedRecord(jobId); s.values.set(keys.job(jobId), JSON.stringify(record)); s.absoluteExpiry.set(keys.job(jobId), NOW_MS + 200000);
    s.lists.set(running ? keys.processing : keys.pending, [jobId]); if (running) { s.values.set(keys.claim(jobId), JSON.stringify(claim(workerId, jobId))); s.values.set(keys.worker(workerId), JSON.stringify(workerRecord(workerId, jobId))); }
    let cancelNow = NOW;
    const ctx = { enabled: true, keys, storeFactory: async () => s, nowIsoFactory: () => cancelNow };
    const cancelled = await cancelHermesJob({ jobId, requestId: record.job.runtime.request_id, context: ctx });
    assert.equal(cancelled.ok, true); assert.deepEqual(s.lists.get(keys.pending) ?? [], []); assert.deepEqual(s.lists.get(keys.processing) ?? [], []); assert.deepEqual(s.lists.get(keys.deadLetter) ?? [], []);
    if (!cancelled.ok) throw new Error("first cancellation failed");
    const storedAfterFirst = s.values.get(keys.cancel(jobId))!; const canonicalFirst = JSON.parse(storedAfterFirst);
    assert.equal(cancelled.cancellation.cancellation_id, canonicalFirst.cancellation_id);
    assert.equal(cancelled.cancellation.requested_at, canonicalFirst.requested_at);
    if (running) { assert.equal(s.values.has(keys.claim(jobId)), false); assert.equal(JSON.parse(s.values.get(keys.worker(workerId))!).worker.active_job_count, 0); }
    assert.equal(s.absoluteExpiry.get(keys.cancel(jobId)), s.absoluteExpiry.get(keys.job(jobId)));
    const jobExpiryBeforeReplay = s.absoluteExpiry.get(keys.job(jobId));
    cancelNow = "2026-07-12T00:00:01.000Z";
    const again = await cancelHermesJob({ jobId, requestId: record.job.runtime.request_id, context: ctx }); assert.equal(again.ok && again.status, "already_cancelled");
    if (!again.ok) throw new Error("idempotent cancellation failed");
    assert.equal(again.cancellation.cancellation_id, canonicalFirst.cancellation_id);
    assert.equal(again.cancellation.requested_at, canonicalFirst.requested_at);
    assert.equal(s.values.get(keys.cancel(jobId)), storedAfterFirst);
    assert.equal(s.absoluteExpiry.get(keys.job(jobId)), jobExpiryBeforeReplay);
    if (running) assert.equal(JSON.parse(s.values.get(keys.worker(workerId))!).worker.active_job_count, 0);
    const wrongRequest = await cancelHermesJob({ jobId, requestId: "different-request-id", context: ctx });
    assert.equal(wrongRequest.ok, false); if (wrongRequest.ok) throw new Error("different request cancel unexpectedly allowed"); assert.equal(wrongRequest.error_code, "job_record_invalid");
  }
  const other = new FakeRecoveryStore(); const otherJob = runningRecord("other-job"); other.values.set(keys.job("other-job"), JSON.stringify(otherJob)); other.absoluteExpiry.set(keys.job("other-job"), NOW_MS + 200000);
  other.values.set(keys.claim("other-job"), JSON.stringify(claim(workerId, "other-job"))); other.values.set(keys.worker(workerId), JSON.stringify(workerRecord(workerId, "different-job")));
  await cancelHermesJob({ jobId: "other-job", requestId: otherJob.job.runtime.request_id, context: { enabled: true, keys, storeFactory: async () => other, nowIsoFactory: () => NOW }, cancellationIdFactory: () => "cancel-other" });
  assert.equal(JSON.parse(other.values.get(keys.worker(workerId))!).worker.active_job_count, 1);
  const terminal = new FakeRecoveryStore(); const terminalJob = runningRecord("terminal-job"); terminalJob.job.runtime.status = "succeeded"; terminal.values.set(keys.job("terminal-job"), JSON.stringify(terminalJob)); terminal.absoluteExpiry.set(keys.job("terminal-job"), NOW_MS + 100000);
  const denied = await cancelHermesJob({ jobId: "terminal-job", requestId: terminalJob.job.runtime.request_id, context: { enabled: true, keys, storeFactory: async () => terminal, nowIsoFactory: () => NOW } }); assert.equal(denied.ok, false);
  const corrupt = new FakeRecoveryStore(); const corruptJob = queuedRecord("corrupt-cancel"); corrupt.values.set(keys.job("corrupt-cancel"), JSON.stringify(corruptJob)); corrupt.absoluteExpiry.set(keys.job("corrupt-cancel"), NOW_MS + 100000); corrupt.corruptCanonicalCancellation = true;
  const corruptResult = await cancelHermesJob({ jobId: "corrupt-cancel", requestId: corruptJob.job.runtime.request_id, context: { enabled: true, keys, storeFactory: async () => corrupt, nowIsoFactory: () => NOW } });
  assert.equal(corruptResult.ok, false); if (corruptResult.ok) throw new Error("invalid canonical cancel accepted"); assert.equal(corruptResult.error_code, "cancel_record_invalid");
  assert.equal(HERMES_RETRY_POLICY.safety.automatic_execution_performed, false);
  assert.doesNotMatch(JSON.stringify(retried.schedule), /controlled recovery fixture|prompt|redis_url|credential/iu);
  console.log(JSON.stringify({ result: "ok", checked: "hermes_job_recovery_boundary", timeout_policy: "ok", retry_policy: "ok", atomic_retry: "ok", atomic_cancel: "ok", ttl_extension_performed: false,
    public_api_added: false, db_write_performed: false, model_execution_performed: false, worker_signal_sent: false }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
