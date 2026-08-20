import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  materializeFarmOsDay150PrefixReferenceExecutionProposal,
  validateFarmOsDay150PrefixReferenceActiveExecutionBinding,
  validateFarmOsDay150PrefixReferenceExecutionDescriptor,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  createFarmOsDay150PrefixReferenceQualificationApprovalRegistry,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMED_HISTORICAL_APPROVAL_RECORD,
  gateFarmOsDay150PrefixReferenceRepositoryInvocation,
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository,
  parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor,
  parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor,
  parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  createFarmOsDay150PrefixReferenceV11ProposalRequest,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_v11_proposal";

assert.equal(createFarmOsDay150PrefixReferenceV11ProposalRequest(
  "2026-08-17T06:00:00.000Z"), null);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_REQUEST.current_state,
  "TERMINAL_CONSUMED_NON_RUNNABLE");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_REQUEST.invocation_allowed,
  false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.descriptor.authorization_revision,
  12);
assert.equal(validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING), true);
assert.equal(validateFarmOsDay150PrefixReferenceExecutionDescriptor(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V11), true);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  "sha256:4b7f090caf8aff478ad01dc1b579b93123cbc2c549427df646e1b975e3a7a1c8");
assert.equal(materializeFarmOsDay150PrefixReferenceExecutionProposal({
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V11_APPROVAL_RECORD_CANDIDATE,
  proposal_created_at: "2026-08-17T06:00:00.000Z",
}), null, "historical V11 cannot be rematerialized as a fresh proposal");

const approvalRegistry = JSON.parse(readFileSync(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path,
  "utf8")) as { records: readonly unknown[] };
const v11Approval = approvalRegistry.records[3];
assert.deepEqual(v11Approval,
  FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMED_HISTORICAL_APPROVAL_RECORD);
assert.ok(parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(v11Approval));
const v11Descriptor = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V11;
const claimBytes = readFileSync(v11Descriptor.durable_paths.attempt_claim);
const markerBytes = readFileSync(v11Descriptor.durable_paths.consumption_marker);
assert.ok(parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
  JSON.parse(claimBytes.toString("utf8")), v11Descriptor));
assert.ok(parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor(
  JSON.parse(markerBytes.toString("utf8")), v11Descriptor));
assert.equal(createHash("sha256").update(claimBytes).digest("hex"),
  "b80dc754ab7286f819813a2a9ee3076d158d47a8942c8ea91550a808d28d8f91");
assert.equal(createHash("sha256").update(markerBytes).digest("hex"),
  "89d34f8d1576dc25a2d0240147496cabdf6632275af54782fbe58d49166f3575");

const repositoryRoot = mkdtempSync(join(tmpdir(), "farmos-day150-v11-nonrunnable-"));
materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(
  repositoryRoot, createFarmOsDay150PrefixReferenceQualificationApprovalRegistry());
const gate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: repositoryRoot,
  clock: Object.freeze({ nowCanonicalUtc: () => "2026-08-17T06:02:00.000Z" }),
  requested_revision: 11,
});
assert.equal(gate.decision, "NOT_ELIGIBLE");
assert.equal(gate.new_invocation_permitted, false);

console.log(JSON.stringify({
  status: "DAY150_PREFIX_REFERENCE_V11_HISTORICAL_NONRUNNABILITY_QUALIFIED",
  historical_result: "OUTCOME_UNKNOWN",
  active_revision: 12,
  v11_new_invocation_permitted: gate.new_invocation_permitted,
  external_operations: 0,
}));
