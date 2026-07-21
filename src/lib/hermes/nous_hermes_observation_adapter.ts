import type {
  FarmAgentRuntimePort,
  FarmAgentRuntimeRequest,
  FarmAgentRuntimeResult,
} from "./farm_agent_runtime_port";

const OBSERVATION_TASKS = new Set([
  "observation_draft",
  "architecture_finding",
  "skill_candidate",
  "migration_readiness",
]);
const ALLOWED_CAPABILITIES = new Set([
  "read_fixture_context",
  "validate_candidate",
  "get_source_status",
]);

export type ObservationExecutor = (request: FarmAgentRuntimeRequest) => Promise<unknown>;

export class NousHermesObservationAdapter implements FarmAgentRuntimePort {
  readonly runtime_name = "nous-hermes-observation";
  private readonly cancelled = new Set<string>();

  constructor(private readonly executor?: ObservationExecutor) {}

  getCapabilities(): readonly string[] {
    return ["observation_draft", "architecture_finding_draft", "skill_candidate_draft", "migration_readiness_draft"];
  }

  async health(): Promise<{ ready: boolean; runtime_name: string }> {
    return { ready: Boolean(this.executor), runtime_name: this.runtime_name };
  }

  async execute(request: FarmAgentRuntimeRequest): Promise<FarmAgentRuntimeResult> {
    const started = Date.now();
    const blocked = (diagnostic: string): FarmAgentRuntimeResult => ({
      schema_version: "farmos.agent.runtime.result.v1",
      request_id: request.request_id,
      runtime_name: this.runtime_name,
      runtime_mode: "shadow",
      result_state: "blocked",
      output_kind: "blocked",
      output: null,
      diagnostics: [diagnostic],
      safety: {
        business_write_performed: false,
        review_decision_performed: false,
        proposal_apply_performed: false,
        external_execution_performed: false,
        formal_contract_created: false,
      },
      timing: { duration_ms: Date.now() - started, timed_out: false, cancelled: false },
    });

    if (!OBSERVATION_TASKS.has(request.task_type)) return blocked("task_type_not_allowed_for_shadow");
    if (request.allowed_capabilities.some((capability) => !ALLOWED_CAPABILITIES.has(capability))) {
      return blocked("capability_not_allowed_for_shadow");
    }
    if (!this.executor) return blocked("observation_runtime_unavailable");
    if (this.cancelled.has(request.request_id)) return blocked("request_cancelled");

    try {
      const output = await this.executor(request);
      return {
        schema_version: "farmos.agent.runtime.result.v1",
        request_id: request.request_id,
        runtime_name: this.runtime_name,
        runtime_mode: "shadow",
        result_state: "complete",
        output_kind: request.task_type === "observation_draft" ? "observation_draft" : `${request.task_type}_draft` as FarmAgentRuntimeResult["output_kind"],
        output,
        diagnostics: [],
        safety: {
          business_write_performed: false,
          review_decision_performed: false,
          proposal_apply_performed: false,
          external_execution_performed: false,
          formal_contract_created: false,
        },
        timing: { duration_ms: Date.now() - started, timed_out: false, cancelled: false },
      };
    } catch {
      return blocked("observation_executor_failure");
    }
  }

  async cancel(requestId: string): Promise<{ cancelled: boolean }> {
    this.cancelled.add(requestId);
    return { cancelled: true };
  }
}
