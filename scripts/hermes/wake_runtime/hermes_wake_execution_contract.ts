import type { HermesWorkerWakeRequest } from "../startup_runtime/hermes_worker_startup_contract";

export type HermesWakeExecutionApproval = {
  schema_version: "hermes.wake.execution.approval.v1"; approval_id: string; wake_request_id: string;
  routing_decision_id: string; target_worker_id: string; approved_by: "operator"; approved_at: string;
  expires_at: string; decision: "approved"; safety: { client_selected_network_target: false;
    network_target_stored: false; secret_stored: false; wake_signal_sent: false;
    ssh_connection_performed: false; model_execution_performed: false; db_write_performed: false; fail_closed: true };
};
export type HermesWakeExecutionPolicy = { schema_version: "hermes.wake.execution.policy.v1";
  approval_ttl_ms: 120000; maximum_execution_count_per_request: 1; allowed_worker_type: "rtx";
  allowed_transport: "udp_wol"; default_port: 9; source: "server_policy"; safety: {
    approval_required: true; automatic_execution_allowed: false; client_network_override_allowed: false;
    ssh_allowed: false; remote_command_allowed: false; model_execution_allowed: false; fail_closed: true } };
export type HermesWakeExecutionRecord = { schema_version: "hermes.wake.execution.v1"; execution_id: string;
  wake_request_id: string; approval_id: string; routing_decision_id: string; target_worker_id: string;
  transport: "udp_wol"; status: "reserved" | "sent" | "failed"; reserved_at: string;
  completed_at: string | null; error_code: string | null; bytes_sent: number | null; safety: {
    network_target_stored: false; mac_address_stored: false; broadcast_address_stored: false;
    credentials_stored: false; ssh_connection_performed: false; remote_command_performed: false;
    gpu_detection_performed: false; model_execution_performed: false; db_write_performed: false; fail_closed: true } };
export type HermesWakeExecutionEligibility = { eligible: boolean; reason_code: string; fail_closed: true };
export type HermesWakeTarget = { worker_id: string; normalized_mac: string; broadcast_address: string; port: number };
export type HermesWakeExecutionKeys = { prefix: string; request: (id: string) => string; approval: (id: string) => string;
  execution: (id: string) => string; executionId: (id: string) => string };
export type HermesWakeExecutionResult = | { ok: true; status: "sent" | "failed"; execution: HermesWakeExecutionRecord; wake_request: HermesWorkerWakeRequest }
  | { ok: false; status: "disabled" | "not_ready" | "failed"; error_code: string; wake_signal_sent: false; fail_closed: true };
export type HermesWakeApprovalPersistenceResult =
  | { ok: true; status: "stored" | "already_stored"; approval: HermesWakeExecutionApproval }
  | { ok: false; error_code: "wake_request_not_found" | "wake_request_invalid" | "wake_request_expired" |
    "wake_request_status_not_allowed" | "wake_target_missing" | "wake_approval_invalid" |
    "wake_approval_expired" | "wake_approval_mismatch" | "wake_execution_disabled" |
    "wake_execution_store_unavailable"; fail_closed: true };
