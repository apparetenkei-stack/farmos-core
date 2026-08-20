import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING,
  validateFarmOsDay150PrefixReferenceExecutionDescriptor,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  gateFarmOsDay150PrefixReferenceRepositoryInvocation,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_REQUEST, {
  request: "STALE_PRE_INVOCATION_PROPOSAL",
  authorization: null,
  external_execution_plan: null,
  approval_record_candidate: null,
  current_state: "STALE_PRE_INVOCATION_NON_RUNNABLE",
  invocation_allowed: false,
  retry_allowed: false,
  approval_materialization_allowed: false,
});
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING
  .source_candidate_digest,
"sha256:786c8810f8c994eb5334d76310bf9bf500f5ee53384bf3c75d2af6eb50438278");
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V10), true);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_revision, 11);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V10);
const gate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: process.cwd(),
  clock: Object.freeze({ nowCanonicalUtc: () => "2026-08-17T06:00:00.000Z" }),
  requested_revision: 10,
});
assert.equal(gate.decision, "NOT_ELIGIBLE");
assert.equal(gate.new_invocation_permitted, false);
assert.equal(gate.claim_state, "ABSENT");
assert.equal(gate.marker_state, "ABSENT");

process.stdout.write(`${JSON.stringify({
  status: "DAY150_PREFIX_REFERENCE_V10_STALE_NON_RUNNABLE_QUALIFIED",
  invocation_count: 0,
  active_revision: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
    .authorization_revision,
})}\n`);
