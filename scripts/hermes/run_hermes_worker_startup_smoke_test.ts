import { randomUUID } from "node:crypto";
import { readHermesRedisClientConfig } from "./queue_runtime/hermes_redis_client";
import { createHermesRoutingRequirement } from "./router_runtime/hermes_model_router";
import type { HermesRoutingDecisionSummary, HermesRoutingWorkerSummary } from "./router_runtime/hermes_model_router_contract";
import { createHermesWorkerStartupKeys, createHermesWorkerStartupStore, requestHermesWorkerWake } from "./startup_runtime/hermes_worker_startup_store";

async function main() {
  const env = { ...process.env };
  if (!env.HERMES_REDIS_URL && env.REDIS_PASSWORD) env.HERMES_REDIS_URL = `redis://:${encodeURIComponent(env.REDIS_PASSWORD)}@127.0.0.1:6379`;
  env.HERMES_REDIS_QUEUE_ENABLED = "true"; const resolved = readHermesRedisClientConfig(env);
  if (!resolved.config) throw new Error("startup_smoke_configuration_unavailable");
  const id = randomUUID(); const prefix = `farmos:hermes:test:day102:${id}`; const keys = createHermesWorkerStartupKeys(prefix);
  const now = new Date().toISOString(); const requirement = createHermesRoutingRequirement({ taskClass: "heavy_reasoning" });
  const decision = (decisionId: string): HermesRoutingDecisionSummary => ({ decision_id: decisionId,
    task_class: "heavy_reasoning", required_capability: "heavy_reasoning", status: "no_ready_worker",
    selected_worker: null, considered_worker_count: 1, eligible_worker_count: 0, fallback_used: false,
    reason_code: "no_ready_worker_available", decided_at: now });
  const decisionA = decision(`decision-a-${id}`); const decisionB = decision(`decision-b-${id}`);
  const worker: HermesRoutingWorkerSummary = { worker_id: `rtx-${id}`, worker_type: "rtx",
    capabilities: ["heavy_reasoning", "large_context", "gpu_inference"], health: "healthy", readiness: "offline",
    runtime_available: true, draining: false, last_heartbeat_at: new Date(Date.parse(now) - 60000).toISOString(),
    current_job_id: null, active_job_count: 0, max_concurrency: 1 };
  const context = { enabled: true, keys, storeFactory: () => createHermesWorkerStartupStore(resolved.config!), nowIsoFactory: () => now };
  const target = worker.worker_id; const requestAId = `wake-a-${id}`; const requestBId = `wake-b-${id}`;
  const cleanupKeys = [keys.request(requestAId), keys.request(requestBId), keys.active(target), keys.cooldown(target),
    keys.decision(decisionA.decision_id), keys.decision(decisionB.decision_id)];
  let cleanupPerformed = false;
  try {
    const first = await requestHermesWorkerWake({ routingRequirement: requirement, routingDecision: decisionA, workers: [worker], context, wakeRequestIdFactory: () => requestAId });
    const replay = await requestHermesWorkerWake({ routingRequirement: requirement, routingDecision: decisionA, workers: [worker], context, wakeRequestIdFactory: () => `wake-unsaved-${id}` });
    const duplicate = await requestHermesWorkerWake({ routingRequirement: requirement, routingDecision: decisionB, workers: [worker], context, wakeRequestIdFactory: () => requestBId });
    if (!first.ok || !replay.ok || replay.status !== "already_requested" || duplicate.ok) throw new Error("startup_smoke_request_flow_failed");
    const verify = await createHermesWorkerStartupStore(resolved.config!); let stored: string | null;
    let requestPttl: number; let activePttl: number; let cooldownPttl: number; let decisionPttl: number;
    try {
      stored = await verify.get(keys.request(requestAId)); requestPttl = await verify.getPttl(keys.request(requestAId));
      activePttl = await verify.getPttl(keys.active(target)); decisionPttl = await verify.getPttl(keys.decision(decisionA.decision_id));
      cooldownPttl = await verify.getPttl(keys.cooldown(target));
    } finally { await verify.disconnect(); }
    const storedId = stored ? (JSON.parse(stored) as { wake_request_id: string }).wake_request_id : null;
    if (first.wake_request.wake_request_id !== replay.wake_request.wake_request_id || storedId !== first.wake_request.wake_request_id ||
      duplicate.error_code !== "startup_request_duplicate" || requestPttl <= 0 || activePttl <= 0 || activePttl > requestPttl ||
      decisionPttl <= 0 || decisionPttl > requestPttl || cooldownPttl <= requestPttl) {
      throw new Error("startup_smoke_verification_failed");
    }
    console.log(JSON.stringify({ result: "ok", checked: "hermes_worker_startup_smoke_test",
      first_status: first.status, replay_status: replay.status, canonical_wake_request_id_preserved: true,
      wake_request_record_overwritten: false, separate_decision_active_duplicate_rejected: true,
      request_ttl_positive: requestPttl > 0, active_ttl_lte_request_ttl: activePttl <= requestPttl,
      decision_ttl_lte_request_ttl: decisionPttl <= requestPttl,
      canonical_replay_within_active_window: replay.status === "already_requested",
      cooldown_ttl_gt_request_ttl: cooldownPttl > requestPttl, startup_signal_performed: false,
      remote_connection_performed: false, gpu_detection_performed: false, model_execution_performed: false,
      db_write_performed: false }, null, 2));
  } finally {
    const cleanup = await createHermesWorkerStartupStore(resolved.config!);
    try { await cleanup.deleteKeys(cleanupKeys); cleanupPerformed = true; } finally { await cleanup.disconnect(); }
    console.log(JSON.stringify({ cleanup_performed: cleanupPerformed, cleanup_scope: "unique_day102_prefix_known_keys_only", flush_performed: false }));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "startup_smoke_failed"); process.exitCode = 1; });
