import { randomUUID } from "node:crypto";
import { readHermesRedisClientConfig } from "./queue_runtime/hermes_redis_client";
import type { HermesWorkerWakeRequest } from "./startup_runtime/hermes_worker_startup_contract";
import { createHermesWorkerStartupKeys, createHermesWorkerStartupStore } from "./startup_runtime/hermes_worker_startup_store";
import { createHermesWakeExecutionApproval } from "./wake_runtime/hermes_wake_execution_policy";
import { createHermesWakeExecutionKeys, createHermesWakeExecutionStore } from "./wake_runtime/hermes_wake_execution_store";
import { executeHermesApprovedWake, persistHermesWakeApproval } from "./wake_runtime/hermes_wake_execution_gateway";
import type { HermesWakeSignalSender } from "./wake_runtime/hermes_wake_sender";

async function main() {
  const env = { ...process.env };
  if (!env.HERMES_REDIS_URL && env.REDIS_PASSWORD) env.HERMES_REDIS_URL = `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@127.0.0.1:6379`;
  env.HERMES_REDIS_QUEUE_ENABLED = "true";
  const config = readHermesRedisClientConfig(env).config;
  if (!config) throw new Error("wake_smoke_configuration_unavailable");
  const id = randomUUID(), prefix = `farmos:hermes:test:day103:${id}`;
  const startupKeys = createHermesWorkerStartupKeys(prefix), wakeKeys = createHermesWakeExecutionKeys(prefix);
  const target = `rtx-${id}`;
  const context = { enabled: true, keys: wakeKeys, storeFactory: () => createHermesWakeExecutionStore(config) };
  const cleanupKeys: string[] = [];
  const createRequest = (suffix: string): HermesWorkerWakeRequest => {
    const now = new Date();
    return { schema_version: "hermes.worker.wake.request.v1", wake_request_id: `wake-${suffix}-${id}`, worker_type: "rtx", target_worker_id: target,
      routing_decision_id: `decision-${suffix}-${id}`, required_capability: "heavy_reasoning", reason_code: "required_worker_offline",
      requested_at: now.toISOString(), expires_at: new Date(now.getTime() + 300000).toISOString(), cooldown_until: new Date(now.getTime() + 600000).toISOString(),
      status: "requested", requested_by: "server_policy", safety: { wol_packet_sent: false, ssh_connection_performed: false,
        gpu_detection_performed: false, worker_execution_performed: false, model_execution_performed: false, secret_stored: false, db_write_performed: false, fail_closed: true } };
  };
  const seed = async (request: HermesWorkerWakeRequest) => {
    const store = await createHermesWorkerStartupStore(config);
    try { await store.persistWakeRequestAtomic({ requestKey: startupKeys.request(request.wake_request_id), activeKey: startupKeys.active(`${target}-${request.wake_request_id}`),
      cooldownKey: startupKeys.cooldown(`${target}-${request.wake_request_id}`), decisionKey: startupKeys.decision(request.routing_decision_id),
      serializedWakeRequest: JSON.stringify(request), wakeRequestId: request.wake_request_id, requestExpiresAtMs: Date.parse(request.expires_at), cooldownUntilMs: Date.parse(request.cooldown_until) }); }
    finally { await store.disconnect(); }
    const approval = createHermesWakeExecutionApproval({ request, nowIso: request.requested_at });
    const saved = await persistHermesWakeApproval({ wakeRequestId: request.wake_request_id, approval, context, nowIso: request.requested_at });
    if (!saved.ok) throw new Error("wake_approval_persistence_failed");
    const approvalStore = await createHermesWakeExecutionStore(config);
    let expiryBefore: number;
    try { expiryBefore = await approvalStore.getExpiryTime(wakeKeys.approval(request.wake_request_id)); }
    finally { await approvalStore.disconnect(); }
    const replay = await persistHermesWakeApproval({ wakeRequestId: request.wake_request_id, approval, context, nowIso: request.requested_at });
    const replayStore = await createHermesWakeExecutionStore(config);
    let expiryAfter: number, storedApproval: string | null;
    try { expiryAfter = await replayStore.getExpiryTime(wakeKeys.approval(request.wake_request_id)); storedApproval = await replayStore.get(wakeKeys.approval(request.wake_request_id)); }
    finally { await replayStore.disconnect(); }
    if (!replay.ok || replay.status !== "already_stored" || replay.approval.approval_id !== approval.approval_id ||
      storedApproval !== JSON.stringify(approval) || expiryAfter !== expiryBefore) throw new Error("wake_approval_replay_failed");
    cleanupKeys.push(startupKeys.request(request.wake_request_id), startupKeys.active(`${target}-${request.wake_request_id}`),
      startupKeys.cooldown(`${target}-${request.wake_request_id}`), startupKeys.decision(request.routing_decision_id),
      wakeKeys.approval(request.wake_request_id), wakeKeys.execution(request.wake_request_id));
  };
  const controlled = { HERMES_RTX_WAKE_ENABLED: "true", HERMES_RTX_WAKE_TARGET_WORKER_ID: target,
    HERMES_RTX_WAKE_MAC: "aabbccddeeff", HERMES_RTX_WAKE_BROADCAST: "255.255.255.255", HERMES_RTX_WAKE_PORT: "9" };
  try {
    const successRequest = createRequest("success"); await seed(successRequest);
    const successId = `execution-success-${id}`; cleanupKeys.push(wakeKeys.executionId(successId));
    const fakeSuccess: HermesWakeSignalSender = { send: async ({ packet }) => ({ bytes_sent: packet.length }) };
    const success = await executeHermesApprovedWake({ wakeRequestId: successRequest.wake_request_id, context,
      sender: fakeSuccess, env: controlled, executionIdFactory: () => successId });
    const successDuplicate = await executeHermesApprovedWake({ wakeRequestId: successRequest.wake_request_id, context, sender: fakeSuccess, env: controlled });
    const failedRequest = createRequest("failure"); await seed(failedRequest);
    const failedId = `execution-failure-${id}`; cleanupKeys.push(wakeKeys.executionId(failedId));
    const fakeFailure: HermesWakeSignalSender = { send: async () => { throw new Error("controlled failure"); } };
    const failed = await executeHermesApprovedWake({ wakeRequestId: failedRequest.wake_request_id, context, sender: fakeFailure, env: controlled, executionIdFactory: () => failedId });
    const failedDuplicate = await executeHermesApprovedWake({ wakeRequestId: failedRequest.wake_request_id, context, sender: fakeSuccess, env: controlled });
    if (!success.ok || success.status !== "sent" || success.wake_request.status !== "acknowledged" || successDuplicate.ok ||
      !failed.ok || failed.status !== "failed" || failed.execution.error_code !== "wake_signal_failed" || failed.execution.bytes_sent !== null ||
      failed.wake_request.status !== "requested" || failedDuplicate.ok) throw new Error("wake_smoke_failed");
    console.log(JSON.stringify({ result: "ok", checked: "hermes_wake_execution_smoke_test", execution_status: success.execution.status,
      wake_request_status: success.wake_request.status, bytes_sent: success.execution.bytes_sent, duplicate_execution_rejected: true,
      failed_execution_status: failed.execution.status, failed_request_status: failed.wake_request.status,
      failed_execution_duplicate_rejected: true, network_target_stored: false,
      approval_stored: true, approval_replay_status: "already_stored", approval_record_overwritten: false,
      approval_ttl_extended: false, real_wake_signal_test: "not_attempted", wake_signal_sent: false }, null, 2));
  } finally {
    const cleanup = await createHermesWakeExecutionStore(config);
    try { await cleanup.deleteKeys(cleanupKeys); } finally { await cleanup.disconnect(); }
    console.log(JSON.stringify({ cleanup_performed: true, cleanup_scope: "unique_day103_prefix_known_keys_only", flush_performed: false }));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "wake_smoke_failed"); process.exitCode = 1; });
