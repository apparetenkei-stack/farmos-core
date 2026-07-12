import { randomUUID } from "node:crypto";
import { isHermesWorkerHeartbeatStale } from "../worker_runtime/hermes_worker_protocol";
import { validateHermesRoutingWorkerSummary } from "../router_runtime/hermes_model_router";
import type { HermesRoutingDecisionSummary, HermesRoutingRequirement, HermesRoutingWorkerSummary } from "../router_runtime/hermes_model_router_contract";
import { type HermesRtxStartupCapability, type HermesRtxWorkerState, type HermesWorkerStartupEligibility,
  type HermesWorkerStartupPolicy, type HermesWorkerStartupRequirement, type HermesWorkerWakeRequest } from "./hermes_worker_startup_contract";

const SUPPORTED = new Set<string>(["heavy_reasoning", "large_context", "gpu_inference"]);
export const HERMES_WORKER_STARTUP_POLICY: HermesWorkerStartupPolicy = {
  schema_version: "hermes.worker.startup.policy.v1", wake_request_ttl_ms: 300000,
  cooldown_ms: 600000, maximum_active_request_count_per_worker: 1, source: "server_policy",
  safety: { client_override_allowed: false, automatic_wol_allowed: false, automatic_ssh_allowed: false, fail_closed: true },
};

function iso(value: string): { value: string; ms: number } {
  const ms = Date.parse(value); if (!Number.isFinite(ms)) throw new Error("startup_timestamp_invalid");
  return { value: new Date(ms).toISOString(), ms };
}

export function classifyHermesRtxWorkerState(worker: HermesRoutingWorkerSummary, nowIso: string): HermesRtxWorkerState {
  try {
    validateHermesRoutingWorkerSummary(worker);
    if (worker.worker_type !== "rtx") return "invalid";
    if (worker.health === "unhealthy" || worker.health === "unknown") return "unhealthy";
    if (worker.draining || worker.readiness === "draining") return "draining";
    if (worker.readiness === "offline" || isHermesWorkerHeartbeatStale(worker.last_heartbeat_at, nowIso)) return "offline";
    if (!worker.runtime_available) return "runtime_unavailable";
    if (worker.readiness !== "ready") return "not_ready";
    if (worker.active_job_count >= worker.max_concurrency) return "capacity_full";
    return "ready";
  } catch { return "invalid"; }
}

function denied(reason_code: HermesWorkerStartupEligibility["reason_code"], worker_state: HermesRtxWorkerState): HermesWorkerStartupEligibility {
  return { eligible: false, reason_code, worker_state, target_worker_id: null, startup_reason: null, fail_closed: true };
}

export function evaluateHermesWorkerStartupEligibility(input: {
  routingRequirement: HermesRoutingRequirement;
  routingDecision: HermesRoutingDecisionSummary;
  workers: HermesRoutingWorkerSummary[];
  existingActiveRequest?: boolean;
  cooldownActive?: boolean;
  nowIso: string;
}): HermesWorkerStartupEligibility {
  try { iso(input.nowIso); } catch { return denied("startup_record_invalid", "invalid"); }
  const requirement = input.routingRequirement; const decision = input.routingDecision;
  if (requirement?.schema_version !== "hermes.router.requirement.v1" || !decision) {
    return denied("startup_record_invalid", "invalid");
  }
  if (!SUPPORTED.has(requirement?.task_class) || !SUPPORTED.has(requirement?.required_capability) ||
    requirement?.preferred_worker_type !== "rtx" || requirement.allow_fallback !== false) {
    return denied("startup_task_not_supported", "missing");
  }
  if (decision.decision_id.length === 0 || decision.task_class !== requirement.task_class ||
    decision.required_capability !== requirement.required_capability) return denied("startup_record_invalid", "invalid");
  if (decision.status === "selected") return denied("startup_not_required", "ready");
  if (decision.status === "no_capacity") return denied("startup_worker_capacity_full", "capacity_full");
  if (decision.status !== "no_ready_worker" || decision.fallback_used || decision.selected_worker !== null) {
    return denied("startup_routing_status_not_allowed", "missing");
  }
  if (input.existingActiveRequest) return denied("startup_request_duplicate", "missing");
  if (input.cooldownActive) return denied("startup_cooldown_active", "missing");
  const rtxWorkers = input.workers.filter((worker) => worker.worker_type === "rtx");
  if (rtxWorkers.length === 0) return { eligible: true, reason_code: "startup_allowed", worker_state: "missing",
    target_worker_id: null, startup_reason: "required_worker_missing", fail_closed: true };
  const validated = rtxWorkers.map((worker) => {
    try { validateHermesRoutingWorkerSummary(worker); return { worker, valid: true as const }; }
    catch { return { worker, valid: false as const }; }
  });
  if (validated.some(({ valid }) => !valid)) return denied("startup_worker_record_invalid", "invalid");
  const capable = validated.map(({ worker }) => worker)
    .filter((worker) => worker.capabilities.includes(requirement.required_capability));
  if (capable.length === 0) return denied("startup_worker_capability_unavailable", "missing");
  const classified = capable.map((worker) => ({ worker, state: classifyHermesRtxWorkerState(worker, input.nowIso) }));
  if (classified.some(({ state }) => state === "ready")) return denied("startup_record_invalid", "ready");
  if (classified.some(({ state }) => state === "capacity_full")) return denied("startup_worker_capacity_full", "capacity_full");
  if (classified.some(({ state }) => state === "unhealthy")) return denied("startup_worker_unhealthy", "unhealthy");
  if (classified.some(({ state }) => state === "draining")) return denied("startup_worker_draining", "draining");
  const statePriority: Readonly<Record<string, number>> = { offline: 0, runtime_unavailable: 1, not_ready: 2 };
  const allowed = classified.filter(({ state }) => state in statePriority)
    .sort((a, b) => statePriority[a.state] - statePriority[b.state] || a.worker.worker_id.localeCompare(b.worker.worker_id))[0];
  if (allowed) {
    const startupReason = allowed.state === "offline" ? "required_worker_offline"
      : allowed.state === "runtime_unavailable" ? "required_worker_runtime_unavailable" : "required_worker_not_ready";
    return { eligible: true, reason_code: "startup_allowed", worker_state: allowed.state,
      target_worker_id: allowed.worker.worker_id, startup_reason: startupReason, fail_closed: true };
  }
  return denied("startup_worker_record_invalid", classified[0]?.state ?? "invalid");
}

export function createHermesWorkerStartupRequirement(input: { routingRequirement: HermesRoutingRequirement; routingDecision: HermesRoutingDecisionSummary; eligibility: HermesWorkerStartupEligibility }): HermesWorkerStartupRequirement {
  if (!input.eligibility.eligible || input.eligibility.startup_reason === null || !SUPPORTED.has(input.routingRequirement.required_capability)) throw new Error("startup_not_eligible");
  return { schema_version: "hermes.worker.startup.requirement.v1", worker_type: "rtx",
    required_capability: input.routingRequirement.required_capability as HermesRtxStartupCapability,
    routing_decision_id: input.routingDecision.decision_id, reason_code: input.eligibility.startup_reason,
    source: "server_policy", safety: { client_selected_host: false, client_selected_address: false,
      secret_stored: false, wol_packet_sent: false, ssh_connection_performed: false,
      worker_execution_performed: false, model_execution_performed: false, db_write_performed: false, fail_closed: true } };
}

export function createHermesWorkerWakeRequest(input: { requirement: HermesWorkerStartupRequirement; targetWorkerId: string | null; nowIso: string; wakeRequestIdFactory?: () => string }): HermesWorkerWakeRequest {
  const now = iso(input.nowIso); const wakeRequestId = (input.wakeRequestIdFactory ?? randomUUID)();
  if (!/^[0-9a-z]+(?:-[0-9a-z]+)*$/iu.test(wakeRequestId)) throw new Error("wake_request_id_invalid");
  return { schema_version: "hermes.worker.wake.request.v1", wake_request_id: wakeRequestId,
    worker_type: "rtx", target_worker_id: input.targetWorkerId,
    routing_decision_id: input.requirement.routing_decision_id,
    required_capability: input.requirement.required_capability, reason_code: input.requirement.reason_code,
    requested_at: now.value, expires_at: new Date(now.ms + HERMES_WORKER_STARTUP_POLICY.wake_request_ttl_ms).toISOString(),
    cooldown_until: new Date(now.ms + HERMES_WORKER_STARTUP_POLICY.cooldown_ms).toISOString(),
    status: "requested", requested_by: "server_policy",
    safety: { wol_packet_sent: false, ssh_connection_performed: false, gpu_detection_performed: false,
      worker_execution_performed: false, model_execution_performed: false, secret_stored: false,
      db_write_performed: false, fail_closed: true } };
}

export function createHermesWorkerWakeRequestSummary(request: HermesWorkerWakeRequest) { return structuredClone(request); }
