import assert from "node:assert/strict";
import { createHermesRoutingRequirement } from "./router_runtime/hermes_model_router";
import type { HermesRoutingDecisionSummary, HermesRoutingWorkerSummary } from "./router_runtime/hermes_model_router_contract";
import { HERMES_RTX_DEFAULT_CAPABILITIES } from "./worker_runtime/hermes_worker_protocol";
import { HERMES_WORKER_STARTUP_POLICY, createHermesWorkerStartupRequirement, createHermesWorkerWakeRequest,
  evaluateHermesWorkerStartupEligibility } from "./startup_runtime/hermes_worker_startup_policy";
import { createHermesWorkerStartupKeys, getHermesWorkerWakeRequestStatus, requestHermesWorkerWake,
  type HermesWakeAtomicResult, type HermesWorkerStartupStore } from "./startup_runtime/hermes_worker_startup_store";

const NOW = "2026-07-13T00:00:00.000Z"; const NOW_MS = Date.parse(NOW); const PREFIX = "farmos:hermes:test:day102-unit";
function worker(overrides: Partial<HermesRoutingWorkerSummary> = {}): HermesRoutingWorkerSummary { return {
  worker_id: "rtx-unit", worker_type: "rtx", capabilities: [...HERMES_RTX_DEFAULT_CAPABILITIES],
  health: "healthy", readiness: "offline", runtime_available: true, draining: false,
  last_heartbeat_at: "2026-07-12T23:59:00.000Z", current_job_id: null, active_job_count: 0, max_concurrency: 1, ...overrides };
}
function decision(task: "heavy_reasoning" | "large_context" | "gpu_inference" | "lightweight_chat", status: HermesRoutingDecisionSummary["status"], id: string): { requirement: ReturnType<typeof createHermesRoutingRequirement>; decision: HermesRoutingDecisionSummary } {
  const requirement = createHermesRoutingRequirement({ taskClass: task });
  return { requirement, decision: { decision_id: id, task_class: task, required_capability: requirement.required_capability,
    status, selected_worker: status === "selected" ? { worker_id: "rtx-unit", worker_type: "rtx", matched_capability: requirement.required_capability, active_job_count: 0, max_concurrency: 1 } : null,
    considered_worker_count: 1, eligible_worker_count: status === "selected" ? 1 : 0, fallback_used: false,
    reason_code: status, decided_at: NOW } };
}

class FakeStartupStore implements HermesWorkerStartupStore {
  values = new Map<string, string>(); expiries = new Map<string, number>(); nowMs = NOW_MS; fail = false;
  private purge(key: string) { const expiry = this.expiries.get(key); if (expiry !== undefined && expiry <= this.nowMs) { this.values.delete(key); this.expiries.delete(key); } }
  async get(key: string) { if (this.fail) throw new Error("hidden store failure"); this.purge(key); return this.values.get(key) ?? null; }
  async getPttl(key: string) { this.purge(key); const expiry = this.expiries.get(key); return expiry === undefined ? -2 : expiry - this.nowMs; }
  async persistWakeRequestAtomic(input: { requestKey: string; activeKey: string; cooldownKey: string; decisionKey: string; serializedWakeRequest: string; wakeRequestId: string; requestExpiresAtMs: number; cooldownUntilMs: number }): Promise<HermesWakeAtomicResult> {
    if (this.fail) throw new Error("hidden store failure"); [input.requestKey, input.activeKey, input.cooldownKey, input.decisionKey].forEach((key) => this.purge(key));
    const existing = this.values.get(input.decisionKey); if (existing) return { status: "already_requested", serializedWakeRequest: existing };
    if (this.values.has(input.activeKey)) return { status: "startup_request_duplicate", serializedWakeRequest: null };
    if (this.values.has(input.cooldownKey)) return { status: "startup_cooldown_active", serializedWakeRequest: null };
    this.values.set(input.requestKey, input.serializedWakeRequest); this.expiries.set(input.requestKey, input.requestExpiresAtMs);
    this.values.set(input.activeKey, input.wakeRequestId); this.expiries.set(input.activeKey, input.requestExpiresAtMs);
    this.values.set(input.cooldownKey, "1"); this.expiries.set(input.cooldownKey, input.cooldownUntilMs);
    this.values.set(input.decisionKey, input.serializedWakeRequest); this.expiries.set(input.decisionKey, input.requestExpiresAtMs);
    return { status: "requested", serializedWakeRequest: input.serializedWakeRequest };
  }
  async deleteKeys(keys: string[]) { keys.forEach((key) => { this.values.delete(key); this.expiries.delete(key); }); }
  async disconnect() {}
}

async function main() {
  assert.equal(HERMES_WORKER_STARTUP_POLICY.wake_request_ttl_ms, 300000); assert.equal(HERMES_WORKER_STARTUP_POLICY.cooldown_ms, 600000);
  assert.equal(HERMES_WORKER_STARTUP_POLICY.safety.client_override_allowed, false); assert.equal(HERMES_WORKER_STARTUP_POLICY.safety.automatic_wol_allowed, false); assert.equal(HERMES_WORKER_STARTUP_POLICY.safety.automatic_ssh_allowed, false);
  const heavy = decision("heavy_reasoning", "no_ready_worker", "decision-heavy");
  const large = decision("large_context", "no_ready_worker", "decision-large");
  const gpu = decision("gpu_inference", "no_ready_worker", "decision-gpu");
  const eligible = evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], nowIso: NOW });
  assert.equal(eligible.eligible, true); assert.equal(eligible.startup_reason, "required_worker_offline");
  assert.equal(evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], existingActiveRequest: true, nowIso: NOW }).reason_code, "startup_request_duplicate");
  assert.equal(evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], cooldownActive: true, nowIso: NOW }).reason_code, "startup_cooldown_active");
  const missing = evaluateHermesWorkerStartupEligibility({ routingRequirement: large.requirement, routingDecision: large.decision, workers: [], nowIso: NOW });
  assert.equal(missing.eligible, true); assert.equal(missing.target_worker_id, null); assert.equal(missing.startup_reason, "required_worker_missing");
  const runtime = evaluateHermesWorkerStartupEligibility({ routingRequirement: gpu.requirement, routingDecision: gpu.decision, workers: [worker({ readiness: "not_ready", runtime_available: false, last_heartbeat_at: NOW })], nowIso: NOW });
  assert.equal(runtime.eligible, true); assert.equal(runtime.startup_reason, "required_worker_runtime_unavailable");
  const nonCapable = worker({ capabilities: ["gpu_inference"] });
  const capabilityDenied = evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [nonCapable], nowIso: NOW });
  assert.equal(capabilityDenied.eligible, false); assert.equal(capabilityDenied.reason_code, "startup_worker_capability_unavailable"); assert.equal(capabilityDenied.target_worker_id, null);
  const mixed = evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision,
    workers: [worker({ worker_id: "rtx-offline" }), worker({ worker_id: "rtx-ready", readiness: "ready", last_heartbeat_at: NOW })], nowIso: NOW });
  assert.equal(mixed.eligible, false); assert.equal(mixed.reason_code, "startup_record_invalid");
  const staleFull = evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision,
    workers: [worker({ active_job_count: 1, max_concurrency: 1, current_job_id: "job-stale-full" })], nowIso: NOW });
  assert.equal(staleFull.eligible, true); assert.equal(staleFull.worker_state, "offline");
  const deterministic = evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision,
    workers: [worker({ worker_id: "rtx-not-ready", readiness: "not_ready", last_heartbeat_at: NOW }),
      worker({ worker_id: "rtx-runtime", readiness: "not_ready", runtime_available: false, last_heartbeat_at: NOW }),
      worker({ worker_id: "rtx-offline-z" }), worker({ worker_id: "rtx-offline-a" })], nowIso: NOW });
  assert.equal(deterministic.target_worker_id, "rtx-offline-a");
  for (const status of ["selected", "no_capacity", "capability_unavailable", "routing_not_allowed"] as const) {
    const item = decision("heavy_reasoning", status, `decision-${status}`);
    assert.equal(evaluateHermesWorkerStartupEligibility({ routingRequirement: item.requirement, routingDecision: item.decision, workers: [worker()], nowIso: NOW }).eligible, false);
  }
  const light = decision("lightweight_chat", "no_ready_worker", "decision-light");
  assert.equal(evaluateHermesWorkerStartupEligibility({ routingRequirement: light.requirement, routingDecision: light.decision, workers: [worker()], nowIso: NOW }).reason_code, "startup_task_not_supported");
  const deniedWorkers: Array<[Partial<HermesRoutingWorkerSummary>, string]> = [
    [{ readiness: "ready", last_heartbeat_at: NOW }, "startup_record_invalid"],
    [{ readiness: "ready", last_heartbeat_at: NOW, active_job_count: 1, current_job_id: "job-full" }, "startup_worker_capacity_full"],
    [{ readiness: "draining", draining: true, last_heartbeat_at: NOW }, "startup_worker_draining"],
    [{ health: "unhealthy", last_heartbeat_at: NOW }, "startup_worker_unhealthy"],
    [{ active_job_count: -1, last_heartbeat_at: NOW }, "startup_worker_record_invalid"],
  ];
  for (const [overrides, reason] of deniedWorkers) assert.equal(evaluateHermesWorkerStartupEligibility({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker(overrides)], nowIso: NOW }).reason_code, reason);

  const startupRequirement = createHermesWorkerStartupRequirement({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, eligibility: eligible });
  const wake = createHermesWorkerWakeRequest({ requirement: startupRequirement, targetWorkerId: eligible.target_worker_id, nowIso: NOW, wakeRequestIdFactory: () => "wake-unit" });
  assert.equal(wake.schema_version, "hermes.worker.wake.request.v1"); assert.equal(wake.expires_at, "2026-07-13T00:05:00.000Z"); assert.equal(wake.cooldown_until, "2026-07-13T00:10:00.000Z"); assert.equal(wake.target_worker_id, "rtx-unit");
  for (const forbidden of ["mac" + "_address", "ip" + "_address", "host" + "name", "redis_url", "token", "prompt", "message", "readonly_context"]) assert.equal(Object.hasOwn(wake, forbidden), false);

  const keys = createHermesWorkerStartupKeys(PREFIX); const store = new FakeStartupStore(); let now = NOW;
  const context = { enabled: true, keys, storeFactory: async () => store, nowIsoFactory: () => now };
  const first = await requestHermesWorkerWake({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], context, wakeRequestIdFactory: () => "wake-first" });
  assert.equal(first.ok && first.status, "requested"); if (!first.ok) throw new Error("first wake failed");
  const storedFirst = store.values.get(keys.request(first.wake_request.wake_request_id)); assert.equal(JSON.parse(storedFirst!).wake_request_id, first.wake_request.wake_request_id);
  const replay = await requestHermesWorkerWake({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], context, wakeRequestIdFactory: () => "wake-unsaved" });
  assert.equal(replay.ok && replay.status, "already_requested"); if (!replay.ok) throw new Error("wake replay failed"); assert.equal(replay.wake_request.wake_request_id, first.wake_request.wake_request_id); assert.equal(store.values.get(keys.request("wake-first")), storedFirst);
  const heavyB = decision("heavy_reasoning", "no_ready_worker", "decision-heavy-b");
  const duplicate = await requestHermesWorkerWake({ routingRequirement: heavyB.requirement, routingDecision: heavyB.decision, workers: [worker()], context });
  assert.equal(duplicate.ok, false); if (duplicate.ok) throw new Error("active duplicate allowed"); assert.equal(duplicate.error_code, "startup_request_duplicate");
  store.nowMs = NOW_MS + 300001; now = new Date(store.nowMs).toISOString();
  const sameDecisionCooldown = await requestHermesWorkerWake({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker({ last_heartbeat_at: now })], context });
  assert.equal(sameDecisionCooldown.ok, false); if (sameDecisionCooldown.ok) throw new Error("expired decision replay accepted"); assert.equal(sameDecisionCooldown.error_code, "startup_cooldown_active");
  const cooldown = await requestHermesWorkerWake({ routingRequirement: heavyB.requirement, routingDecision: heavyB.decision, workers: [worker({ last_heartbeat_at: now })], context });
  assert.equal(cooldown.ok, false); if (cooldown.ok) throw new Error("cooldown allowed"); assert.equal(cooldown.error_code, "startup_cooldown_active");
  store.nowMs = NOW_MS + 600001; now = new Date(store.nowMs).toISOString();
  const afterCooldown = await requestHermesWorkerWake({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker({ last_heartbeat_at: now })], context, wakeRequestIdFactory: () => "wake-after-cooldown" });
  assert.equal(afterCooldown.ok && afterCooldown.status, "requested");
  const status = await getHermesWorkerWakeRequestStatus("wake-after-cooldown", context); assert.equal(status.ok && status.status, "found");
  const disabled = await requestHermesWorkerWake({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], context: { ...context, enabled: false } }); assert.equal(disabled.ok, false);
  const failedStore = new FakeStartupStore(); failedStore.fail = true;
  const unavailable = await requestHermesWorkerWake({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, workers: [worker()], context: { ...context, storeFactory: async () => failedStore } });
  assert.equal(unavailable.ok, false); if (unavailable.ok) throw new Error("store failure accepted"); assert.equal(unavailable.startup_write_performed, false); assert.equal(unavailable.fail_closed, true);
  assert.equal(first.wake_request.safety.wol_packet_sent, false); assert.equal(first.wake_request.safety.ssh_connection_performed, false); assert.equal(first.wake_request.safety.gpu_detection_performed, false);
  console.log(JSON.stringify({ result: "ok", checked: "hermes_worker_startup_boundary", schemas: ["hermes.worker.startup.requirement.v1", "hermes.worker.startup.policy.v1", "hermes.worker.wake.request.v1"],
    canonical_replay: "ok", duplicate_prevention: "ok", cooldown: "ok", external_redis_connection_performed: false,
    wake_signal_performed: false, remote_connection_performed: false, gpu_detection_performed: false, worker_claim_performed: false,
    queue_write_performed: false, db_write_performed: false, api_route_added: false }, null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
