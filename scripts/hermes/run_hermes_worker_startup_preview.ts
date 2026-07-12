import { createHermesRoutingRequirement } from "./router_runtime/hermes_model_router";
import type { HermesRoutingDecisionSummary, HermesRoutingWorkerSummary } from "./router_runtime/hermes_model_router_contract";
import { evaluateHermesWorkerStartupEligibility, createHermesWorkerStartupRequirement, createHermesWorkerWakeRequest } from "./startup_runtime/hermes_worker_startup_policy";
const now = "2026-07-13T00:00:00.000Z";
function fixture(task: "heavy_reasoning" | "large_context" | "lightweight_chat", status: HermesRoutingDecisionSummary["status"], workers: HermesRoutingWorkerSummary[]) {
  const requirement = createHermesRoutingRequirement({ taskClass: task });
  const decision: HermesRoutingDecisionSummary = { decision_id: `preview-${task}-${status}`, task_class: task,
    required_capability: requirement.required_capability, status, selected_worker: status === "selected" ? { worker_id: "rtx-preview", worker_type: "rtx", matched_capability: requirement.required_capability, active_job_count: 0, max_concurrency: 1 } : null,
    considered_worker_count: workers.length, eligible_worker_count: status === "selected" ? 1 : 0, fallback_used: false, reason_code: status, decided_at: now };
  return { requirement, decision, eligibility: evaluateHermesWorkerStartupEligibility({ routingRequirement: requirement, routingDecision: decision, workers, nowIso: now }) };
}
const base: HermesRoutingWorkerSummary = { worker_id: "rtx-preview", worker_type: "rtx", capabilities: ["heavy_reasoning", "large_context", "gpu_inference"], health: "healthy", readiness: "offline", runtime_available: true, draining: false, last_heartbeat_at: "2026-07-12T23:59:00.000Z", current_job_id: null, active_job_count: 0, max_concurrency: 1 };
const heavy = fixture("heavy_reasoning", "no_ready_worker", [base]); const missing = fixture("large_context", "no_ready_worker", []);
const ready = fixture("heavy_reasoning", "selected", [{ ...base, readiness: "ready", last_heartbeat_at: now }]);
const full = fixture("heavy_reasoning", "no_capacity", [{ ...base, readiness: "ready", last_heartbeat_at: now, active_job_count: 1, current_job_id: "job-full" }]);
const light = fixture("lightweight_chat", "no_ready_worker", [base]);
const capabilityMissing = fixture("heavy_reasoning", "no_ready_worker", [{ ...base, capabilities: ["gpu_inference"] }]);
const mixedReady = fixture("heavy_reasoning", "no_ready_worker", [base, { ...base, worker_id: "rtx-ready-preview", readiness: "ready", last_heartbeat_at: now }]);
const requirement = createHermesWorkerStartupRequirement({ routingRequirement: heavy.requirement, routingDecision: heavy.decision, eligibility: heavy.eligibility });
const request = createHermesWorkerWakeRequest({ requirement, targetWorkerId: heavy.eligibility.target_worker_id, nowIso: now, wakeRequestIdFactory: () => "wake-preview" });
console.log(JSON.stringify({ preview: "hermes_worker_startup", heavy_offline: heavy.eligibility, large_context_missing: missing.eligibility,
  rtx_ready: ready.eligibility, rtx_capacity_full: full.eligibility, lightweight: light.eligibility,
  capability_unavailable: capabilityMissing.eligibility, mixed_offline_ready: mixedReady.eligibility,
  wake_request_summary: request, external_redis_connection_performed: false, wake_signal_performed: false,
  remote_connection_performed: false, model_execution_performed: false, db_write_performed: false }, null, 2));
