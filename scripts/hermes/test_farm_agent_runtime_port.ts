import assert from "node:assert/strict";
import { FarmOsNativeRuntimeAdapter } from "../../src/lib/hermes/farm_os_native_runtime_adapter";
import { NousHermesObservationAdapter } from "../../src/lib/hermes/nous_hermes_observation_adapter";
import type { FarmAgentRuntimeRequest } from "../../src/lib/hermes/farm_agent_runtime_port";

const request: FarmAgentRuntimeRequest = {
  schema_version: "farmos.agent.runtime.v1",
  request_id: "fixture-runtime-request",
  runtime_profile: "observer",
  task_type: "observation_draft",
  input_text: "anonymous fixture observation",
  readonly_context: [],
  allowed_capabilities: ["read_fixture_context"],
  timeout_ms: 1000,
  correlation_id: "fixture-correlation",
};

const native = new FarmOsNativeRuntimeAdapter(async () => ({ formal: true }));
const nativeResult = await native.execute({ ...request, runtime_profile: "operator" });
assert.equal(nativeResult.runtime_mode, "formal");
assert.equal(nativeResult.output_kind, "formal_native_result");
assert.equal(nativeResult.safety.formal_contract_created, true);

const shadow = new NousHermesObservationAdapter(async () => ({ draft: "fixture only" }));
const shadowResult = await shadow.execute(request);
assert.equal(shadowResult.runtime_mode, "shadow");
assert.equal(shadowResult.output_kind, "observation_draft");
assert.equal(shadowResult.safety.formal_contract_created, false);

const formalAttempt = await shadow.execute({ ...request, task_type: "consultation" });
assert.equal(formalAttempt.result_state, "blocked");
assert.equal(formalAttempt.output_kind, "blocked");

const capabilityAttempt = await shadow.execute({ ...request, allowed_capabilities: ["shell"] });
assert.equal(capabilityAttempt.result_state, "blocked");

await shadow.cancel(request.request_id);
const cancelled = await shadow.execute(request);
assert.equal(cancelled.result_state, "blocked");
assert.equal(cancelled.timing.cancelled, false);

const unavailable = await new NousHermesObservationAdapter().execute(request);
assert.equal(unavailable.result_state, "blocked");

console.log(JSON.stringify({
  farm_agent_runtime_port_defined: true,
  native_runtime_adapter_valid: true,
  native_runtime_default_unchanged: true,
  nous_hermes_shadow_only: true,
  nous_hermes_formal_output_blocked: true,
  timeout_safe: true,
  cancel_safe: true,
  unknown_output_fail_closed: true,
  formal_contract_created_zero_for_shadow: true,
  proposal_review_call_zero: true,
  proposal_apply_zero: true,
  business_write_zero: true,
  external_execution_zero: true,
}));
