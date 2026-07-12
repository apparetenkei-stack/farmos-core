import type { HermesRoutingDecisionSummary, HermesRoutingRequirement } from "../router_runtime/hermes_model_router_contract";

export type HermesRtxStartupCapability = "heavy_reasoning" | "large_context" | "gpu_inference";
export type HermesWorkerStartupReason = "required_worker_offline" | "required_worker_not_ready" | "required_worker_runtime_unavailable" | "required_worker_missing";
export type HermesRtxWorkerState = "ready" | "offline" | "not_ready" | "runtime_unavailable" | "draining" | "unhealthy" | "capacity_full" | "missing" | "invalid";

export type HermesWorkerStartupRequirement = {
  schema_version: "hermes.worker.startup.requirement.v1";
  worker_type: "rtx";
  required_capability: HermesRtxStartupCapability;
  routing_decision_id: string;
  reason_code: HermesWorkerStartupReason;
  source: "server_policy";
  safety: {
    client_selected_host: false; client_selected_address: false; secret_stored: false;
    wol_packet_sent: false; ssh_connection_performed: false; worker_execution_performed: false;
    model_execution_performed: false; db_write_performed: false; fail_closed: true;
  };
};

export type HermesWorkerStartupPolicy = {
  schema_version: "hermes.worker.startup.policy.v1";
  wake_request_ttl_ms: 300000;
  cooldown_ms: 600000;
  maximum_active_request_count_per_worker: 1;
  source: "server_policy";
  safety: { client_override_allowed: false; automatic_wol_allowed: false; automatic_ssh_allowed: false; fail_closed: true };
};

export type HermesWorkerStartupEligibilityReason =
  | "startup_allowed" | "startup_not_required" | "startup_task_not_supported"
  | "startup_worker_capacity_full" | "startup_worker_draining" | "startup_worker_unhealthy"
  | "startup_worker_capability_unavailable"
  | "startup_worker_record_invalid" | "startup_routing_status_not_allowed"
  | "startup_request_duplicate" | "startup_cooldown_active" | "startup_record_invalid";

export type HermesWorkerStartupEligibility = {
  eligible: boolean;
  reason_code: HermesWorkerStartupEligibilityReason;
  worker_state: HermesRtxWorkerState;
  target_worker_id: string | null;
  startup_reason: HermesWorkerStartupReason | null;
  fail_closed: true;
};

export type HermesWorkerWakeRequestStatus = "requested" | "acknowledged" | "expired" | "cancelled";
export type HermesWorkerWakeRequest = {
  schema_version: "hermes.worker.wake.request.v1";
  wake_request_id: string;
  worker_type: "rtx";
  target_worker_id: string | null;
  routing_decision_id: string;
  required_capability: HermesRtxStartupCapability;
  reason_code: HermesWorkerStartupReason;
  requested_at: string;
  expires_at: string;
  cooldown_until: string;
  status: HermesWorkerWakeRequestStatus;
  requested_by: "server_policy";
  safety: {
    wol_packet_sent: false; ssh_connection_performed: false; gpu_detection_performed: false;
    worker_execution_performed: false; model_execution_performed: false; secret_stored: false;
    db_write_performed: false; fail_closed: true;
  };
};

export type HermesWorkerWakeRequestSummary = Omit<HermesWorkerWakeRequest, "safety"> & { safety: HermesWorkerWakeRequest["safety"] };
export type HermesWorkerStartupKeys = {
  prefix: string;
  request: (wakeRequestId: string) => string;
  active: (target: string) => string;
  cooldown: (target: string) => string;
  decision: (routingDecisionId: string) => string;
};

export type HermesWorkerWakeRequestResult =
  | { ok: true; status: "requested" | "already_requested"; wake_request: HermesWorkerWakeRequest; startup_write_performed: true }
  | { ok: false; status: "disabled" | "not_ready" | "failed"; error_code: string; startup_write_performed: false; fail_closed: true };

export type HermesWorkerWakeStatusResult =
  | { ok: true; status: "found"; wake_request: HermesWorkerWakeRequestSummary }
  | { ok: true; status: "not_found"; wake_request: null }
  | Exclude<HermesWorkerWakeRequestResult, { ok: true }>;

export type HermesWorkerStartupInput = {
  routing_requirement: HermesRoutingRequirement;
  routing_decision: HermesRoutingDecisionSummary;
};
