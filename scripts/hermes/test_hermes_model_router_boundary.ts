import assert from "node:assert/strict";

import {
  HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  HERMES_RTX_DEFAULT_CAPABILITIES,
  createHermesWorkerAdvertisement,
  type HermesWorkerCapability,
  type HermesWorkerType,
} from "./worker_runtime/hermes_worker_protocol";
import {
  HERMES_ROUTING_TASK_POLICY,
  type HermesRoutingTaskClass,
  type HermesRoutingWorkerSummary,
} from "./router_runtime/hermes_model_router_contract";
import {
  createHermesRoutingDecisionSummary,
  createHermesRoutingRequirement,
  evaluateHermesWorkerEligibility,
  routeHermesJob,
  validateHermesRoutingWorkerSummary,
} from "./router_runtime/hermes_model_router";

const NOW = "2026-07-12T06:00:00.000Z";

function worker(input: {
  id: string;
  type: HermesWorkerType;
  capabilities: readonly HermesWorkerCapability[];
  heartbeat?: string;
  health?: "healthy" | "degraded" | "unhealthy" | "unknown";
  readiness?: "ready" | "not_ready" | "draining" | "offline";
  runtimeAvailable?: boolean;
  draining?: boolean;
  active?: number;
  max?: number;
}): HermesRoutingWorkerSummary {
  const active = input.active ?? 0;
  const advertisement = createHermesWorkerAdvertisement({
    workerId: input.id,
    workerType: input.type,
    capabilities: input.capabilities,
    health: input.health ?? "healthy",
    runtimeAvailable: input.runtimeAvailable ?? true,
    draining: input.draining ?? false,
    nowIso: input.heartbeat ?? NOW,
    currentJobId: active > 0 ? `job-${input.id}` : null,
    activeJobCount: active,
    maxConcurrency: input.max ?? 1,
  });
  return {
    worker_id: advertisement.worker_id,
    worker_type: advertisement.worker_type,
    capabilities: advertisement.capabilities,
    health: advertisement.health,
    readiness: input.readiness ?? advertisement.readiness,
    runtime_available: advertisement.runtime_available,
    draining: advertisement.draining,
    last_heartbeat_at: advertisement.last_heartbeat_at,
    current_job_id: advertisement.current_job_id,
    active_job_count: advertisement.active_job_count,
    max_concurrency: advertisement.max_concurrency,
  };
}

function route(
  taskClass: HermesRoutingTaskClass,
  workers: HermesRoutingWorkerSummary[],
) {
  return routeHermesJob({
    requirement: createHermesRoutingRequirement({ taskClass }),
    workers,
    nowIso: NOW,
    decisionIdFactory: () => `decision-${taskClass}`,
  });
}

function main(): void {
  const taskClasses = Object.keys(HERMES_ROUTING_TASK_POLICY) as HermesRoutingTaskClass[];
  for (const taskClass of taskClasses) {
    const requirement = createHermesRoutingRequirement({
      taskClass,
      priority: "high",
    });
    assert.equal(requirement.schema_version, "hermes.router.requirement.v1");
    assert.equal(requirement.required_capability, HERMES_ROUTING_TASK_POLICY[taskClass].required_capability);
    assert.equal(requirement.preferred_worker_type, HERMES_ROUTING_TASK_POLICY[taskClass].preferred_worker_type);
    assert.equal(requirement.allow_fallback, HERMES_ROUTING_TASK_POLICY[taskClass].allow_fallback);
    assert.equal(requirement.source, "server_policy");
  }
  assert.throws(() => createHermesRoutingRequirement({ taskClass: "unknown" }));
  assert.throws(() => createHermesRoutingRequirement({
    taskClass: "lightweight_chat",
    workerId: "client-selected-worker",
  }));

  const mac = worker({
    id: "mac-mini-01",
    type: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
  });
  const rtx = worker({
    id: "rtx-01",
    type: "rtx",
    capabilities: HERMES_RTX_DEFAULT_CAPABILITIES,
  });
  const lightRequirement = createHermesRoutingRequirement({ taskClass: "lightweight_chat" });

  const exclusionCases: Array<{
    candidate: HermesRoutingWorkerSummary;
    reason: string;
  }> = [
    {
      candidate: worker({
        id: "stale-worker",
        type: "mac_mini",
        capabilities: ["lightweight_chat"],
        heartbeat: "2026-07-12T05:59:15.000Z",
      }),
      reason: "worker_offline",
    },
    { candidate: { ...mac, readiness: "offline" }, reason: "worker_offline" },
    { candidate: { ...mac, readiness: "not_ready" }, reason: "worker_not_ready" },
    {
      candidate: worker({
        id: "draining-worker",
        type: "mac_mini",
        capabilities: ["lightweight_chat"],
        draining: true,
      }),
      reason: "worker_draining",
    },
    {
      candidate: worker({
        id: "unhealthy-worker",
        type: "mac_mini",
        capabilities: ["lightweight_chat"],
        health: "unhealthy",
      }),
      reason: "worker_unhealthy",
    },
    {
      candidate: worker({
        id: "runtime-unavailable",
        type: "mac_mini",
        capabilities: ["lightweight_chat"],
        runtimeAvailable: false,
      }),
      reason: "worker_runtime_unavailable",
    },
    {
      candidate: worker({
        id: "capacity-full",
        type: "mac_mini",
        capabilities: ["lightweight_chat"],
        active: 1,
        max: 1,
      }),
      reason: "worker_capacity_full",
    },
    { candidate: rtx, reason: "worker_capability_unavailable" },
  ];
  for (const { candidate, reason } of exclusionCases) {
    const result = evaluateHermesWorkerEligibility({
      worker: candidate,
      requirement: lightRequirement,
      nowIso: NOW,
    });
    assert.equal(result.eligible, false);
    assert.equal(result.reason, reason);
  }
  assert.equal(evaluateHermesWorkerEligibility({
    worker: mac,
    requirement: lightRequirement,
    nowIso: NOW,
  }).eligible, true);

  validateHermesRoutingWorkerSummary(mac);
  const invalidWorkers = [
    { ...mac, worker_type: "unknown_worker" },
    { ...mac, health: "unknown_health" },
    { ...mac, readiness: "unknown_readiness" },
    { ...mac, capabilities: ["unknown_capability"] },
    { ...mac, capabilities: ["lightweight_chat", "lightweight_chat"] },
    { ...mac, runtime_available: "true" },
    { ...mac, draining: "false" },
    { ...mac, last_heartbeat_at: "not-an-iso-timestamp" },
    { ...mac, active_job_count: -1 },
    { ...mac, max_concurrency: 0 },
    { ...mac, active_job_count: 2, max_concurrency: 1, current_job_id: "job-over-capacity" },
    { ...mac, active_job_count: 0, current_job_id: "job-should-be-null" },
    { ...mac, active_job_count: 1, current_job_id: null },
    { ...mac, active_job_count: 1, current_job_id: "invalid/job" },
  ] as unknown as HermesRoutingWorkerSummary[];
  for (const invalidWorker of invalidWorkers) {
    const eligibility = evaluateHermesWorkerEligibility({
      worker: invalidWorker,
      requirement: lightRequirement,
      nowIso: NOW,
    });
    assert.equal(eligibility.eligible, false);
    assert.equal(eligibility.reason, "worker_record_invalid");
  }

  const invalidFallbackWorker = {
    ...mac,
    worker_id: "unsafe-worker-value",
    worker_type: "invalid-fallback-type",
    capabilities: ["lightweight_chat"],
  } as unknown as HermesRoutingWorkerSummary;
  const validFallbackWorker = worker({
    id: "rtx-valid-fallback",
    type: "rtx",
    capabilities: ["lightweight_chat"],
  });
  const invalidFallbackDecision = routeHermesJob({
    requirement: lightRequirement,
    workers: [invalidFallbackWorker, validFallbackWorker],
    nowIso: NOW,
    decisionIdFactory: () => "decision-invalid-fallback",
  });
  assert.equal(invalidFallbackDecision.selected_worker?.worker_id, "rtx-valid-fallback");
  assert.doesNotMatch(
    JSON.stringify(invalidFallbackDecision),
    /unsafe-worker-value|invalid-fallback-type/u,
  );

  const invalidOnlyDecision = routeHermesJob({
    requirement: lightRequirement,
    workers: [invalidFallbackWorker],
    nowIso: NOW,
    decisionIdFactory: () => "decision-invalid-only",
  });
  assert.equal(invalidOnlyDecision.status, "no_ready_worker");
  assert.equal(invalidOnlyDecision.reason_code, "no_valid_worker_available");
  assert.equal(invalidOnlyDecision.selected_worker, null);
  assert.doesNotMatch(
    JSON.stringify(invalidOnlyDecision),
    /unsafe-worker-value|invalid-fallback-type/u,
  );

  const light = route("lightweight_chat", [rtx, mac]);
  assert.equal(light.status, "selected");
  assert.equal(light.selected_worker?.worker_id, mac.worker_id);
  assert.equal(light.fallback_used, false);

  const heavy = route("heavy_reasoning", [mac, rtx]);
  assert.equal(heavy.status, "selected");
  assert.equal(heavy.selected_worker?.worker_id, rtx.worker_id);

  const compatibleRtx = worker({
    id: "rtx-fallback",
    type: "rtx",
    capabilities: ["lightweight_chat", ...HERMES_RTX_DEFAULT_CAPABILITIES],
  });
  const fullMac = worker({
    id: "mac-full",
    type: "mac_mini",
    capabilities: HERMES_MAC_MINI_DEFAULT_CAPABILITIES,
    active: 1,
    max: 1,
  });
  const fallback = route("lightweight_chat", [fullMac, compatibleRtx]);
  assert.equal(fallback.selected_worker?.worker_id, compatibleRtx.worker_id);
  assert.equal(fallback.fallback_used, true);
  assert.equal(fallback.reason_code, "fallback_worker_selected");

  const offlineRtx = worker({
    id: "rtx-offline",
    type: "rtx",
    capabilities: ["heavy_reasoning"],
    heartbeat: "2026-07-12T05:59:15.000Z",
  });
  const noHeavyFallback = route("heavy_reasoning", [mac, offlineRtx]);
  assert.equal(noHeavyFallback.status, "no_ready_worker");
  assert.equal(noHeavyFallback.selected_worker, null);

  const lowerRatio = worker({
    id: "mac-lower-ratio",
    type: "mac_mini",
    capabilities: ["lightweight_chat"],
    active: 1,
    max: 4,
  });
  const higherRatio = worker({
    id: "mac-higher-ratio",
    type: "mac_mini",
    capabilities: ["lightweight_chat"],
    active: 1,
    max: 2,
  });
  assert.equal(route("lightweight_chat", [higherRatio, lowerRatio]).selected_worker?.worker_id, lowerRatio.worker_id);

  const older = worker({
    id: "mac-older",
    type: "mac_mini",
    capabilities: ["lightweight_chat"],
    heartbeat: "2026-07-12T05:59:50.000Z",
  });
  const newer = worker({
    id: "mac-newer",
    type: "mac_mini",
    capabilities: ["lightweight_chat"],
    heartbeat: "2026-07-12T05:59:55.000Z",
  });
  assert.equal(route("lightweight_chat", [older, newer]).selected_worker?.worker_id, newer.worker_id);
  const tieA = worker({ id: "mac-a", type: "mac_mini", capabilities: ["lightweight_chat"] });
  const tieB = worker({ id: "mac-b", type: "mac_mini", capabilities: ["lightweight_chat"] });
  assert.equal(route("lightweight_chat", [tieB, tieA]).selected_worker?.worker_id, "mac-a");

  assert.equal(route("gpu_inference", [mac]).status, "capability_unavailable");
  assert.equal(route("lightweight_chat", [fullMac]).status, "no_capacity");
  assert.equal(route("heavy_reasoning", [offlineRtx]).status, "no_ready_worker");
  const policyBlockedMac = worker({
    id: "mac-heavy-policy-blocked",
    type: "mac_mini",
    capabilities: ["heavy_reasoning"],
  });
  assert.equal(route("heavy_reasoning", [policyBlockedMac]).status, "routing_not_allowed");

  const summary = createHermesRoutingDecisionSummary(light);
  assert.equal(summary.decision_id, "decision-lightweight_chat");
  assert.equal(summary.task_class, "lightweight_chat");
  assert.equal(Object.hasOwn(summary, "requirement"), false);
  const safeOutput = { light, summary } as Record<string, unknown>;
  const collectKeys = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(collectKeys);
    if (typeof value !== "object" || value === null) return [];
    return Object.entries(value).flatMap(([key, nested]) => [key, ...collectKeys(nested)]);
  };
  const outputKeys = collectKeys(safeOutput);
  for (const forbidden of [
    "message", "prompt", "system_prompt", "redis_url", "credentials",
    "token", "hostname", "ip", "model_path", "model_endpoint",
  ]) {
    assert.equal(outputKeys.includes(forbidden), false);
  }
  assert.doesNotMatch(JSON.stringify(safeOutput), /qwen|ollama|specific model/u);
  assert.deepEqual(light.safety, {
    worker_claim_performed: false,
    queue_write_performed: false,
    worker_execution_performed: false,
    model_execution_performed: false,
    db_write_performed: false,
    proposal_write_performed: false,
    audit_write_performed: false,
    fail_closed: true,
  });

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_model_router_boundary",
    requirement_schema: "hermes.router.requirement.v1",
    decision_schema: "hermes.router.decision.v1",
    task_classes_checked: taskClasses.length,
    deterministic_ranking: "ok",
    fallback_policy: "ok",
    failure_classification: "ok",
    redis_connection_performed: false,
    worker_claim_performed: false,
    queue_write_performed: false,
    model_execution_performed: false,
    db_write_performed: false,
    api_route_added: false,
  }, null, 2));
}

main();
