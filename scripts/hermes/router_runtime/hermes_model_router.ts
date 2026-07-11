import { randomUUID } from "node:crypto";

import {
  HERMES_WORKER_CAPABILITIES,
  assertHermesWorkerId,
  evaluateHermesWorkerAt,
  type HermesWorkerAdvertisement,
} from "../worker_runtime/hermes_worker_protocol";
import {
  HERMES_ROUTING_TASK_POLICY,
  type HermesRoutingDecision,
  type HermesRoutingDecisionStatus,
  type HermesRoutingDecisionSummary,
  type HermesRoutingPriority,
  type HermesRoutingRequirement,
  type HermesRoutingTaskClass,
  type HermesRoutingWorkerSummary,
  type HermesWorkerExclusionReason,
} from "./hermes_model_router_contract";

const TASK_CLASSES = new Set<string>(Object.keys(HERMES_ROUTING_TASK_POLICY));

export type HermesWorkerEligibility =
  | { eligible: true; worker: HermesRoutingWorkerSummary; reason: null }
  | {
      eligible: false;
      worker: HermesRoutingWorkerSummary;
      reason: HermesWorkerExclusionReason;
    };

export function validateHermesRoutingWorkerSummary(
  worker: HermesRoutingWorkerSummary,
): void {
  assertHermesWorkerId(worker.worker_id);
  if (worker.worker_type !== "mac_mini" && worker.worker_type !== "rtx") {
    throw new Error("router_worker_type_invalid");
  }
  if (!(["healthy", "degraded", "unhealthy", "unknown"] as unknown[]).includes(worker.health)) {
    throw new Error("router_worker_health_invalid");
  }
  if (!(["ready", "not_ready", "draining", "offline"] as unknown[]).includes(worker.readiness)) {
    throw new Error("router_worker_readiness_invalid");
  }
  if (!Array.isArray(worker.capabilities)) {
    throw new Error("router_worker_capabilities_invalid");
  }
  const allowedCapabilities = new Set<unknown>(HERMES_WORKER_CAPABILITIES);
  if (
    worker.capabilities.length === 0 ||
    worker.capabilities.some((capability) => !allowedCapabilities.has(capability)) ||
    new Set(worker.capabilities).size !== worker.capabilities.length
  ) {
    throw new Error("router_worker_capabilities_invalid");
  }
  if (typeof worker.runtime_available !== "boolean") {
    throw new Error("router_worker_runtime_available_invalid");
  }
  if (typeof worker.draining !== "boolean") {
    throw new Error("router_worker_draining_invalid");
  }
  const heartbeatMs = Date.parse(worker.last_heartbeat_at);
  if (
    !Number.isFinite(heartbeatMs) ||
    new Date(heartbeatMs).toISOString() !== worker.last_heartbeat_at
  ) {
    throw new Error("router_worker_heartbeat_invalid");
  }
  if (
    !Number.isInteger(worker.active_job_count) ||
    worker.active_job_count < 0 ||
    !Number.isInteger(worker.max_concurrency) ||
    worker.max_concurrency < 1 ||
    worker.active_job_count > worker.max_concurrency ||
    (worker.active_job_count === 0 && worker.current_job_id !== null) ||
    (worker.active_job_count > 0 && worker.current_job_id === null)
  ) {
    throw new Error("router_worker_capacity_invalid");
  }
  if (worker.current_job_id !== null) {
    assertHermesWorkerId(worker.current_job_id);
  }
}

export function createHermesRoutingRequirement(
  input: Record<string, unknown>,
): HermesRoutingRequirement {
  const unknownField = Object.keys(input).find(
    (field) => field !== "taskClass" && field !== "priority",
  );
  if (unknownField) throw new Error(`router_requirement_field_not_allowed:${unknownField}`);
  if (typeof input.taskClass !== "string" || !TASK_CLASSES.has(input.taskClass)) {
    throw new Error("router_task_class_invalid");
  }
  const priority = input.priority ?? "normal";
  if (priority !== "normal" && priority !== "high") {
    throw new Error("router_priority_invalid");
  }
  const taskClass = input.taskClass as HermesRoutingTaskClass;
  const policy = HERMES_ROUTING_TASK_POLICY[taskClass];
  return {
    schema_version: "hermes.router.requirement.v1",
    task_class: taskClass,
    required_capability: policy.required_capability,
    preferred_worker_type: policy.preferred_worker_type,
    allow_fallback: policy.allow_fallback,
    priority: priority as HermesRoutingPriority,
    source: "server_policy",
    safety: {
      client_selected_worker: false,
      prompt_based_worker_selection: false,
      model_execution_performed: false,
      worker_claim_performed: false,
      db_write_performed: false,
      fail_closed: true,
    },
  };
}

function asAdvertisement(
  worker: HermesRoutingWorkerSummary,
): HermesWorkerAdvertisement {
  return {
    schema_version: "hermes.worker.v1",
    ...worker,
    heartbeat_interval_ms: 15000,
    heartbeat_timeout_ms: 45000,
    registered_at: worker.last_heartbeat_at,
    safety: {
      secret_stored: false,
      credentials_stored: false,
      db_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
      fail_closed: true,
    },
  };
}

export function evaluateHermesWorkerEligibility(input: {
  worker: HermesRoutingWorkerSummary;
  requirement: HermesRoutingRequirement;
  nowIso: string;
}): HermesWorkerEligibility {
  const worker = input.worker;
  try {
    validateHermesRoutingWorkerSummary(worker);
    const effective = evaluateHermesWorkerAt(asAdvertisement(worker), input.nowIso);
    if (effective.readiness === "offline") {
      return { eligible: false, worker, reason: "worker_offline" };
    }
    if (worker.readiness === "offline") {
      return { eligible: false, worker, reason: "worker_offline" };
    }
    if (worker.health === "unhealthy") {
      return { eligible: false, worker, reason: "worker_unhealthy" };
    }
    if (worker.draining || effective.readiness === "draining") {
      return { eligible: false, worker, reason: "worker_draining" };
    }
    if (!worker.runtime_available) {
      return { eligible: false, worker, reason: "worker_runtime_unavailable" };
    }
    if (worker.readiness !== "ready" || effective.readiness !== "ready") {
      return { eligible: false, worker, reason: "worker_not_ready" };
    }
    if (worker.active_job_count >= worker.max_concurrency) {
      return { eligible: false, worker, reason: "worker_capacity_full" };
    }
    if (!worker.capabilities.includes(input.requirement.required_capability)) {
      return {
        eligible: false,
        worker,
        reason: "worker_capability_unavailable",
      };
    }
    return { eligible: true, worker: { ...worker, readiness: effective.readiness }, reason: null };
  } catch {
    return { eligible: false, worker, reason: "worker_record_invalid" };
  }
}

export function rankHermesWorkerCandidates(
  workers: HermesRoutingWorkerSummary[],
  requirement: HermesRoutingRequirement,
): HermesRoutingWorkerSummary[] {
  return [...workers].sort((left, right) => {
    const leftPreferred = left.worker_type === requirement.preferred_worker_type ? 0 : 1;
    const rightPreferred = right.worker_type === requirement.preferred_worker_type ? 0 : 1;
    if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred;
    const ratioDifference =
      left.active_job_count / left.max_concurrency -
      right.active_job_count / right.max_concurrency;
    if (ratioDifference !== 0) return ratioDifference;
    if (left.active_job_count !== right.active_job_count) {
      return left.active_job_count - right.active_job_count;
    }
    const heartbeatDifference =
      Date.parse(right.last_heartbeat_at) - Date.parse(left.last_heartbeat_at);
    if (heartbeatDifference !== 0) return heartbeatDifference;
    return left.worker_id.localeCompare(right.worker_id);
  });
}

function classifyNoSelection(input: {
  evaluations: HermesWorkerEligibility[];
  requirement: HermesRoutingRequirement;
}): { status: HermesRoutingDecisionStatus; reasonCode: string } {
  if (
    input.evaluations.length > 0 &&
    input.evaluations.every(({ reason }) => reason === "worker_record_invalid")
  ) {
    return { status: "no_ready_worker", reasonCode: "no_valid_worker_available" };
  }
  const capable = input.evaluations.filter(
    ({ worker, reason }) =>
      reason !== "worker_record_invalid" &&
      worker.capabilities.includes(input.requirement.required_capability),
  );
  if (capable.length === 0) {
    return { status: "capability_unavailable", reasonCode: "required_capability_unavailable" };
  }
  const policyEligible = capable.filter(({ worker }) =>
    worker.worker_type === input.requirement.preferred_worker_type ||
    input.requirement.allow_fallback,
  );
  if (policyEligible.length === 0) {
    return { status: "routing_not_allowed", reasonCode: "worker_type_fallback_not_allowed" };
  }
  if (policyEligible.every(({ reason }) => reason === "worker_capacity_full")) {
    return { status: "no_capacity", reasonCode: "all_capable_workers_at_capacity" };
  }
  return { status: "no_ready_worker", reasonCode: "no_ready_worker_available" };
}

export function routeHermesJob(input: {
  requirement: HermesRoutingRequirement;
  workers: HermesRoutingWorkerSummary[];
  nowIso: string;
  decisionIdFactory?: () => string;
}): HermesRoutingDecision {
  const decidedAt = new Date(Date.parse(input.nowIso)).toISOString();
  const evaluations = input.workers.map((worker) =>
    evaluateHermesWorkerEligibility({
      worker,
      requirement: input.requirement,
      nowIso: decidedAt,
    }),
  );
  const baseEligible = evaluations
    .filter((evaluation): evaluation is Extract<HermesWorkerEligibility, { eligible: true }> =>
      evaluation.eligible,
    )
    .map(({ worker }) => worker);
  const routable = baseEligible.filter((worker) =>
    worker.worker_type === input.requirement.preferred_worker_type ||
    input.requirement.allow_fallback,
  );
  const ranked = rankHermesWorkerCandidates(routable, input.requirement);
  const selected = ranked[0] ?? null;
  const fallbackUsed =
    selected !== null && selected.worker_type !== input.requirement.preferred_worker_type;
  const failure = selected === null
    ? classifyNoSelection({ evaluations, requirement: input.requirement })
    : null;

  return {
    schema_version: "hermes.router.decision.v1",
    decision_id: (input.decisionIdFactory ?? randomUUID)(),
    requirement: input.requirement,
    status: selected ? "selected" : failure!.status,
    selected_worker: selected
      ? {
          worker_id: selected.worker_id,
          worker_type: selected.worker_type,
          matched_capability: input.requirement.required_capability,
          active_job_count: selected.active_job_count,
          max_concurrency: selected.max_concurrency,
        }
      : null,
    considered_worker_count: input.workers.length,
    eligible_worker_count: routable.length,
    fallback_used: fallbackUsed,
    reason_code: selected
      ? fallbackUsed
        ? "fallback_worker_selected"
        : "preferred_worker_selected"
      : failure!.reasonCode,
    decided_at: decidedAt,
    safety: {
      worker_claim_performed: false,
      queue_write_performed: false,
      worker_execution_performed: false,
      model_execution_performed: false,
      db_write_performed: false,
      proposal_write_performed: false,
      audit_write_performed: false,
      fail_closed: true,
    },
  };
}

export function createHermesRoutingDecisionSummary(
  decision: HermesRoutingDecision,
): HermesRoutingDecisionSummary {
  return {
    decision_id: decision.decision_id,
    task_class: decision.requirement.task_class,
    required_capability: decision.requirement.required_capability,
    status: decision.status,
    selected_worker: decision.selected_worker,
    considered_worker_count: decision.considered_worker_count,
    eligible_worker_count: decision.eligible_worker_count,
    fallback_used: decision.fallback_used,
    reason_code: decision.reason_code,
    decided_at: decision.decided_at,
  };
}
