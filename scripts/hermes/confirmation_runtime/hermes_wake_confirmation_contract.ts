import type { HermesRtxStartupCapability } from "../startup_runtime/hermes_worker_startup_contract";

export type HermesWakeConfirmationStatus = "waiting_for_heartbeat" | "worker_ready" |
  "worker_not_ready" | "runtime_unavailable" | "worker_unhealthy" | "worker_draining" |
  "capability_unavailable" | "timed_out";
export type HermesWakeConfirmationPolicy = { schema_version:"hermes.wake.confirmation.policy.v1"; confirmation_window_ms:180000;
  heartbeat_freshness_ms:45000; minimum_post_execution_heartbeat_delay_ms:0; required_worker_type:"rtx"; required_execution_status:"sent";
  record_retention_ms:300000; source:"server_policy"; safety:{client_timeout_override_allowed:false;automatic_remote_connection_allowed:false;
    automatic_model_execution_allowed:false;automatic_queue_resume_allowed:false;automatic_job_retry_allowed:false;fail_closed:true} };
export type HermesWakeConfirmationRequirement = {schema_version:"hermes.wake.confirmation.requirement.v1";wake_request_id:string;execution_id:string;
  target_worker_id:string;required_capability:HermesRtxStartupCapability;execution_completed_at:string;confirmation_deadline_at:string;source:"server_policy";
  safety:HermesWakeConfirmationSafety};
export type HermesWakeConfirmationSafety={ssh_connection_performed:false;remote_command_performed:false;gpu_detection_performed:false;
  model_execution_performed:false;queue_write_performed:false;job_retry_performed:false;db_write_performed:false;fail_closed:true};
export type HermesWakeConfirmationRecord={schema_version:"hermes.wake.confirmation.v1";confirmation_id:string;wake_request_id:string;execution_id:string;
  target_worker_id:string;required_capability:HermesRtxStartupCapability;status:HermesWakeConfirmationStatus;started_at:string;updated_at:string;deadline_at:string;
  execution_completed_at:string;observed_worker_id:string|null;observed_heartbeat_at:string|null;observed_readiness:string|null;observed_health:string|null;
  observed_runtime_available:boolean|null;observed_draining:boolean|null;worker_boot_confirmed:boolean;worker_accepting_jobs:boolean;completed_at:string|null;
  reason_code:string;safety:HermesWakeConfirmationSafety};
export type HermesWakeConfirmationKeys={prefix:string;request:(id:string)=>string;execution:(id:string)=>string;worker:(id:string)=>string;
  confirmation:(id:string)=>string;confirmationId:(id:string)=>string};
export type HermesWakeConfirmationResult=|{ok:true;status:"created"|"already_exists"|"checked";confirmation:HermesWakeConfirmationRecord;
  worker_boot_confirmed:boolean;worker_accepting_jobs:boolean;confirmation_write_performed:boolean}|{ok:false;status:"disabled"|"not_ready"|"failed";
  error_code:string;worker_boot_confirmed:false;worker_accepting_jobs:false;confirmation_write_performed:false;fail_closed:true};
