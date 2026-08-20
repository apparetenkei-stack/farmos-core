import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY,
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
} from "../../src/lib/hermes/farm_os_day150_gate17_scope_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  validateFarmOsDay150PrefixReferenceActiveExecutionBinding,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";

assert.equal(FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_state,
  "PRODUCT_OWNER_ADOPTED");
assert.equal(FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.closure_gate_count_unchanged, 22);
assert.deepEqual(FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.operation_limits,
  { production: 0, canonical: 0, b2: 0, formal_production_gate2: 0 });
assert.equal(FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.same_uid_hostile_mutation_threat,
  "FUTURE_UNASSIGNED_DEFENSE_IN_DEPTH");
assert.match(FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST, /^sha256:[a-f0-9]{64}$/u);
const active = FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING;
const descriptor = FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR;
assert.equal(validateFarmOsDay150PrefixReferenceActiveExecutionBinding(active), true);
assert.equal(descriptor.authorization_id,
  "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13");
assert.equal(descriptor.authorization_revision, 13);
assert.equal(active.authorization.source_candidate_binding.source_candidate_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.executable_source_digest);
assert.equal(active.authorization.gate17_scope_authority.authority_digest,
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST);
assert.equal(active.authorization.authorization_id, descriptor.authorization_id);
assert.equal(active.authorization.authorization_revision, descriptor.authorization_revision);
assert.equal(active.external_execution_plan.execution_authorization_digest,
  descriptor.authorization_digest);
assert.equal(active.external_execution_plan.execution_authorization_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.authorization_digest);
assert.equal(active.external_execution_plan.execution_authorization_revision,
  descriptor.authorization_revision);
assert.equal(active.external_execution_plan.stable_run_id, descriptor.run_identity);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.attempt_identity,
  descriptor.attempt_identity);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.plan_digest,
  descriptor.execution_plan_digest);
assert.deepEqual(active.external_execution_plan.gate17_scope_authority,
  active.authorization.gate17_scope_authority);
assert.equal(active.authorization.attempt_claim.path, descriptor.durable_paths.attempt_claim);
assert.equal(active.authorization.consumption_marker.path,
  descriptor.durable_paths.consumption_marker);
assert.equal(active.authorization.receipt_output_path, descriptor.durable_paths.success_receipt);
assert.equal(active.authorization.terminal_outcome_receipt.path,
  descriptor.durable_paths.terminal_outcome_receipt);
const mixedHistoricalPathBinding = Object.freeze({ ...active,
  authorization: Object.freeze({ ...active.authorization,
    attempt_claim: Object.freeze({ ...active.authorization.attempt_claim,
      path: active.authorization.attempt_claim.path.replace("/v13/", "/v12/") }) }) });
assert.equal(validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
  mixedHistoricalPathBinding as unknown as typeof active), false);

const files = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files;
assert.equal(files.includes(
  "src/lib/hermes/farm_os_day150_gate17_scope_authority.ts"), true);
for (const nonGatePath of [
  "src/lib/hermes/farm_os_day150_prefix_reference_fixed_runtime_authority.ts",
  "src/lib/hermes/farm_os_day150_prefix_reference_sealed_runtime_data.ts",
  "scripts/hermes/run_farm_os_day150_prefix_reference_sealed_bundle.ts",
  "scripts/hermes/lib/farm_os_day150_prefix_reference_postgres_worker.ts",
]) assert.equal(files.includes(nonGatePath), false, nonGatePath);

console.log(JSON.stringify({
  status: "PASS",
  authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  authority_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  active_closure_file_count: files.length,
  active_execution_revision: descriptor.authorization_revision,
  mixed_generation_rejections: 1,
  hostile_same_uid_gate: false,
  closure_gate_count: 22,
}));
