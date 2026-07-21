import type {
  FarmAgentRuntimePort,
  FarmAgentRuntimeRequest,
  FarmAgentRuntimeResult,
} from "./farm_agent_runtime_port";

export type NativeRuntimeDelegate = (
  request: FarmAgentRuntimeRequest,
) => Promise<unknown>;

export class FarmOsNativeRuntimeAdapter implements FarmAgentRuntimePort {
  readonly runtime_name = "farmos-native-runtime";

  constructor(private readonly delegate: NativeRuntimeDelegate) {}

  getCapabilities(): readonly string[] {
    return ["formal_native_result", "consultation", "daily_brief_analysis"];
  }

  async health(): Promise<{ ready: boolean; runtime_name: string }> {
    return { ready: true, runtime_name: this.runtime_name };
  }

  async execute(request: FarmAgentRuntimeRequest): Promise<FarmAgentRuntimeResult> {
    const started = Date.now();
    try {
      const output = await this.delegate(request);
      return {
        schema_version: "farmos.agent.runtime.result.v1",
        request_id: request.request_id,
        runtime_name: this.runtime_name,
        runtime_mode: "formal",
        result_state: "complete",
        output_kind: "formal_native_result",
        output,
        diagnostics: [],
        safety: {
          business_write_performed: false,
          review_decision_performed: false,
          proposal_apply_performed: false,
          external_execution_performed: false,
          formal_contract_created: true,
        },
        timing: { duration_ms: Date.now() - started, timed_out: false, cancelled: false },
      };
    } catch {
      return {
        schema_version: "farmos.agent.runtime.result.v1",
        request_id: request.request_id,
        runtime_name: this.runtime_name,
        runtime_mode: "formal",
        result_state: "blocked",
        output_kind: "blocked",
        output: null,
        diagnostics: ["native_runtime_failure"],
        safety: {
          business_write_performed: false,
          review_decision_performed: false,
          proposal_apply_performed: false,
          external_execution_performed: false,
          formal_contract_created: false,
        },
        timing: { duration_ms: Date.now() - started, timed_out: false, cancelled: false },
      };
    }
  }

  async cancel(): Promise<{ cancelled: boolean }> {
    return { cancelled: false };
  }
}
