import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXTERNAL_PLAN_IDENTITY_DIGEST,
  validateFarmOsDay150PrefixReferenceExecutionDescriptor,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD,
  gateFarmOsDay150PrefixReferenceRepositoryInvocation,
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository,
  parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_HISTORICAL_STATUS,
  createFarmOsDay150PrefixReferenceV9ProposalRequest,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_v9_proposal";

const request = createFarmOsDay150PrefixReferenceV9ProposalRequest(
  "2026-08-17T03:42:27.000Z");
assert.equal(request.current_state, "TERMINAL_CONSUMED_NON_RUNNABLE");
assert.equal(request.invocation_allowed, false);
assert.equal(request.approval_materialization_allowed, false);
assert.equal(request.active_execution_binding, null);
assert.equal(request.proposal, null);
assert.equal(request.create_approved_record, null);
assert.equal(request.historical_status, FARM_OS_DAY150_PREFIX_REFERENCE_V9_HISTORICAL_STATUS);
assert.equal(request.historical_status.execution_descriptor,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V9);
assert.equal(request.historical_status.execution_descriptor_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST);
assert.equal(request.historical_status.external_plan_identity_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXTERNAL_PLAN_IDENTITY_DIGEST);
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(
  request.historical_status.execution_descriptor), true);

const registry = JSON.parse(readFileSync(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path, "utf8"));
assert.equal(registry.records.length, 3);
assert.deepEqual(registry.records[2],
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD);
assert.ok(parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(registry.records[2]));
assert.deepEqual(gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: process.cwd(),
  clock: Object.freeze({ nowCanonicalUtc: () => new Date().toISOString() }),
  requested_revision: 9,
}), {
  decision: "NOT_ELIGIBLE", reason: "TERMINAL_STATE_PRESENT",
  claim_state: "VALID", marker_state: "VALID",
  success_receipt_state: "ABSENT", terminal_receipt_state: "VALID",
  new_invocation_permitted: false,
});
const historicalOnlyRoot = mkdtempSync(join(tmpdir(), "farmos-day150-v9-no-durable-state-"));
materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(
  historicalOnlyRoot, registry);
assert.deepEqual(gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: historicalOnlyRoot,
  clock: Object.freeze({ nowCanonicalUtc: () => new Date().toISOString() }),
  requested_revision: 9,
}), {
  decision: "NOT_ELIGIBLE", reason: "HUMAN_INVOCATION_ALLOWANCE_EXHAUSTED",
  claim_state: "ABSENT", marker_state: "ABSENT",
  success_receipt_state: "ABSENT", terminal_receipt_state: "ABSENT",
  new_invocation_permitted: false,
});

process.stdout.write(`${JSON.stringify({
  status: "DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORY_QUALIFIED",
  authorization_revision: 9,
  approval_record_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD
      .approval_record_digest,
  invocation_allowed: false,
  retry_allowed: false,
  zero_residual: true,
  docker_mutations: 0, postgres_operations: 0, migration_operations: 0,
})}\n`);
