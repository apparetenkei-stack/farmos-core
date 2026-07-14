import type { HermesRoutingDecision, HermesRoutingDecisionSummary } from "../router_runtime/hermes_model_router_contract";
import type { HermesRtxStartupCapability } from "../startup_runtime/hermes_worker_startup_contract";

export type HermesCanonicalRoutingDecisionRecord = {
  schema_version: "hermes.router.decision.record.v1";
  job_id: string;
  request_id: string;
  expires_at: string;
  decision: HermesRoutingDecision;
};

export type HermesRoutingResumePolicy = {
  schema_version: "hermes.routing.resume.policy.v1";
  allowed_original_routing_status: "no_ready_worker";
  required_confirmation_status: "worker_ready";
  require_worker_boot_confirmed: true;
  require_worker_accepting_jobs: true;
  require_current_worker_revalidation: true;
  maximum_resume_count_per_job: 1;
  resume_ttl_ms: 60000;
  source: "server_policy";
  safety: {
    client_worker_override_allowed: false;
    automatic_queue_write_allowed: false;
    automatic_worker_claim_allowed: false;
    automatic_model_execution_allowed: false;
    automatic_fallback_override_allowed: false;
    db_write_allowed: false;
    fail_closed: true;
  };
};

export type HermesRoutingResumeRequirement = {
  schema_version: "hermes.routing.resume.requirement.v1";
  resume_id: string;
  job_id: string;
  request_id: string;
  original_routing_decision_id: string;
  wake_request_id: string;
  wake_execution_id: string;
  wake_confirmation_id: string;
  target_worker_id: string;
  required_capability: HermesRtxStartupCapability;
  created_at: string;
  expires_at: string;
  source: "server_policy";
  safety: HermesRoutingResumeSafety;
};

export type HermesRoutingResumeSafety = {
  queue_write_performed: false;
  worker_claim_performed: false;
  model_execution_performed: false;
  remote_connection_performed: false;
  db_write_performed: false;
  fail_closed: true;
};

export type HermesRoutingResumeRecord = {
  schema_version: "hermes.routing.resume.v1";
  resume_id: string;
  job_id: string;
  request_id: string;
  original_routing_decision_id: string;
  resumed_routing_decision_id: string;
  resumed_routing_decision: HermesRoutingDecisionSummary;
  wake_request_id: string;
  wake_execution_id: string;
  wake_confirmation_id: string;
  target_worker_id: string;
  selected_worker_id: string;
  required_capability: HermesRtxStartupCapability;
  status: "selected";
  reason_code: "routing_resume_selected";
  created_at: string;
  completed_at: string;
  expires_at: string;
  worker_boot_confirmed: true;
  worker_accepting_jobs: true;
  queue_write_performed: false;
  worker_claim_performed: false;
  model_execution_performed: false;
  safety: {
    network_target_stored: false;
    credentials_stored: false;
    remote_connection_performed: false;
    db_write_performed: false;
    fail_closed: true;
  };
};

export type HermesRoutingResumeKeys = {
  prefix: string;
  job: (id: string) => string;
  routingDecision: (jobId: string) => string;
  routingDecisionId: (decisionId: string) => string;
  wakeDecision: (decisionId: string) => string;
  wakeRequest: (id: string) => string;
  wakeExecution: (id: string) => string;
  wakeConfirmation: (id: string) => string;
  worker: (id: string) => string;
  resume: (jobId: string) => string;
  resumeId: (id: string) => string;
};

export type HermesRoutingResumeResult =
  | {
      ok: true;
      status: "created" | "already_exists";
      resume: HermesRoutingResumeRecord;
      resumed_routing_decision: HermesRoutingDecisionSummary;
      resume_write_performed: boolean;
      queue_write_performed: false;
      worker_claim_performed: false;
      model_execution_performed: false;
    }
  | {
      ok: false;
      status: "disabled" | "not_ready" | "failed";
      error_code: string;
      resume_write_performed: false;
      queue_write_performed: false;
      worker_claim_performed: false;
      model_execution_performed: false;
      fail_closed: true;
    };
