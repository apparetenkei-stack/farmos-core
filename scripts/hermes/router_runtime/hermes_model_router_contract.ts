import type {
  HermesWorkerCapability,
  HermesWorkerHealth,
  HermesWorkerReadiness,
  HermesWorkerType,
} from "../worker_runtime/hermes_worker_protocol";

export type HermesRoutingTaskClass =
  | "lightweight_chat"
  | "structured_summary"
  | "classification"
  | "readonly_context_analysis"
  | "heavy_reasoning"
  | "large_context"
  | "gpu_inference";

export type HermesRoutingPriority = "normal" | "high";

export type HermesRoutingRequirement = {
  schema_version: "hermes.router.requirement.v1";
  task_class: HermesRoutingTaskClass;
  required_capability: HermesWorkerCapability;
  preferred_worker_type: HermesWorkerType | null;
  allow_fallback: boolean;
  priority: HermesRoutingPriority;
  source: "server_policy";
  safety: {
    client_selected_worker: false;
    prompt_based_worker_selection: false;
    model_execution_performed: false;
    worker_claim_performed: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export type HermesRoutingWorkerSummary = {
  worker_id: string;
  worker_type: HermesWorkerType;
  capabilities: HermesWorkerCapability[];
  health: HermesWorkerHealth;
  readiness: HermesWorkerReadiness;
  runtime_available: boolean;
  draining: boolean;
  last_heartbeat_at: string;
  current_job_id: string | null;
  active_job_count: number;
  max_concurrency: number;
};

export type HermesWorkerExclusionReason =
  | "worker_offline"
  | "worker_not_ready"
  | "worker_draining"
  | "worker_unhealthy"
  | "worker_runtime_unavailable"
  | "worker_capacity_full"
  | "worker_capability_unavailable"
  | "worker_record_invalid";

export type HermesRoutingDecisionStatus =
  | "selected"
  | "no_ready_worker"
  | "no_capacity"
  | "capability_unavailable"
  | "routing_not_allowed";

export type HermesRoutingDecision = {
  schema_version: "hermes.router.decision.v1";
  decision_id: string;
  requirement: HermesRoutingRequirement;
  status: HermesRoutingDecisionStatus;
  selected_worker: {
    worker_id: string;
    worker_type: HermesWorkerType;
    matched_capability: HermesWorkerCapability;
    active_job_count: number;
    max_concurrency: number;
  } | null;
  considered_worker_count: number;
  eligible_worker_count: number;
  fallback_used: boolean;
  reason_code: string;
  decided_at: string;
  safety: {
    worker_claim_performed: false;
    queue_write_performed: false;
    worker_execution_performed: false;
    model_execution_performed: false;
    db_write_performed: false;
    proposal_write_performed: false;
    audit_write_performed: false;
    fail_closed: true;
  };
};

export type HermesRoutingDecisionSummary = Pick<
  HermesRoutingDecision,
  | "decision_id"
  | "status"
  | "selected_worker"
  | "considered_worker_count"
  | "eligible_worker_count"
  | "fallback_used"
  | "reason_code"
  | "decided_at"
> & {
  task_class: HermesRoutingTaskClass;
  required_capability: HermesWorkerCapability;
};

export const HERMES_ROUTING_TASK_POLICY: Readonly<
  Record<
    HermesRoutingTaskClass,
    {
      required_capability: HermesWorkerCapability;
      preferred_worker_type: HermesWorkerType;
      allow_fallback: boolean;
    }
  >
> = {
  lightweight_chat: {
    required_capability: "lightweight_chat",
    preferred_worker_type: "mac_mini",
    allow_fallback: true,
  },
  structured_summary: {
    required_capability: "structured_summary",
    preferred_worker_type: "mac_mini",
    allow_fallback: true,
  },
  classification: {
    required_capability: "classification",
    preferred_worker_type: "mac_mini",
    allow_fallback: true,
  },
  readonly_context_analysis: {
    required_capability: "readonly_context_analysis",
    preferred_worker_type: "mac_mini",
    allow_fallback: true,
  },
  heavy_reasoning: {
    required_capability: "heavy_reasoning",
    preferred_worker_type: "rtx",
    allow_fallback: false,
  },
  large_context: {
    required_capability: "large_context",
    preferred_worker_type: "rtx",
    allow_fallback: false,
  },
  gpu_inference: {
    required_capability: "gpu_inference",
    preferred_worker_type: "rtx",
    allow_fallback: false,
  },
};
