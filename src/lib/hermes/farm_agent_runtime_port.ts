export type FarmAgentRuntimeProfile = "operator" | "observer";

export type FarmAgentRuntimeTaskType =
  | "consultation"
  | "daily_brief_analysis"
  | "observation_draft"
  | "architecture_finding"
  | "skill_candidate"
  | "migration_readiness";

export type FarmAgentRuntimeRequest = {
  schema_version: "farmos.agent.runtime.v1";
  request_id: string;
  runtime_profile: FarmAgentRuntimeProfile;
  task_type: FarmAgentRuntimeTaskType;
  input_text: string;
  readonly_context: readonly unknown[];
  allowed_capabilities: readonly string[];
  timeout_ms: number;
  correlation_id: string;
};

export type FarmAgentRuntimeResult = {
  schema_version: "farmos.agent.runtime.result.v1";
  request_id: string;
  runtime_name: string;
  runtime_mode: "formal" | "shadow";
  result_state: "complete" | "incomplete" | "blocked" | "unavailable";
  output_kind:
    | "formal_native_result"
    | "observation_draft"
    | "attention_draft"
    | "architecture_finding_draft"
    | "skill_candidate_draft"
    | "migration_readiness_draft"
    | "blocked"
    | "unavailable";
  output: unknown;
  diagnostics: readonly string[];
  safety: {
    business_write_performed: false;
    review_decision_performed: false;
    proposal_apply_performed: false;
    external_execution_performed: false;
    formal_contract_created: boolean;
  };
  timing: { duration_ms: number; timed_out: boolean; cancelled: boolean };
};

export interface FarmAgentRuntimePort {
  getCapabilities(): readonly string[];
  health(): Promise<{ ready: boolean; runtime_name: string }>;
  execute(request: FarmAgentRuntimeRequest): Promise<FarmAgentRuntimeResult>;
  cancel(requestId: string): Promise<{ cancelled: boolean }>;
}
