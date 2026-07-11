import {
  HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  HERMES_RTX_DEFAULT_CAPABILITIES,
  createHermesWorkerAdvertisement,
  type HermesWorkerCapability,
  type HermesWorkerType,
} from "./worker_runtime/hermes_worker_protocol";
import type { HermesRoutingWorkerSummary } from "./router_runtime/hermes_model_router_contract";
import {
  createHermesRoutingDecisionSummary,
  createHermesRoutingRequirement,
  routeHermesJob,
} from "./router_runtime/hermes_model_router";

const nowIso = new Date().toISOString();

function worker(input: {
  id: string;
  type: HermesWorkerType;
  capabilities: readonly HermesWorkerCapability[];
  active?: number;
  heartbeat?: string;
}): HermesRoutingWorkerSummary {
  const active = input.active ?? 0;
  const advertisement = createHermesWorkerAdvertisement({
    workerId: input.id,
    workerType: input.type,
    capabilities: input.capabilities,
    health: "healthy",
    runtimeAvailable: true,
    draining: false,
    nowIso: input.heartbeat ?? nowIso,
    currentJobId: active > 0 ? `job-${input.id}` : null,
    activeJobCount: active,
    maxConcurrency: 1,
  });
  return {
    worker_id: advertisement.worker_id,
    worker_type: advertisement.worker_type,
    capabilities: advertisement.capabilities,
    health: advertisement.health,
    readiness: advertisement.readiness,
    runtime_available: advertisement.runtime_available,
    draining: advertisement.draining,
    last_heartbeat_at: advertisement.last_heartbeat_at,
    current_job_id: advertisement.current_job_id,
    active_job_count: advertisement.active_job_count,
    max_concurrency: advertisement.max_concurrency,
  };
}

const mac = worker({
  id: "mac-mini-preview",
  type: "mac_mini",
  capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
});
const rtx = worker({
  id: "rtx-preview",
  type: "rtx",
  capabilities: HERMES_RTX_DEFAULT_CAPABILITIES,
});
const fallbackRtx = worker({
  id: "rtx-compatible-preview",
  type: "rtx",
  capabilities: ["lightweight_chat", ...HERMES_RTX_DEFAULT_CAPABILITIES],
});
const fullMac = worker({
  id: "mac-mini-full-preview",
  type: "mac_mini",
  capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  active: 1,
});
const offlineRtx = worker({
  id: "rtx-offline-preview",
  type: "rtx",
  capabilities: HERMES_RTX_DEFAULT_CAPABILITIES,
  heartbeat: new Date(Date.parse(nowIso) - 45_000).toISOString(),
});

const examples = [
  ["lightweight_chat", [mac, rtx]],
  ["structured_summary", [mac, rtx]],
  ["heavy_reasoning", [mac, rtx]],
  ["lightweight_chat", [fullMac, fallbackRtx]],
  ["heavy_reasoning", [mac, offlineRtx]],
] as const;

const decisions = examples.map(([taskClass, workers], index) =>
  createHermesRoutingDecisionSummary(routeHermesJob({
    requirement: createHermesRoutingRequirement({ taskClass }),
    workers: [...workers],
    nowIso,
    decisionIdFactory: () => `router-preview-${index + 1}`,
  })),
);

console.log(JSON.stringify({
  preview: "hermes_model_router",
  decisions,
  redis_connection_performed: false,
  worker_claim_performed: false,
  queue_write_performed: false,
  model_execution_performed: false,
  db_write_performed: false,
}, null, 2));
