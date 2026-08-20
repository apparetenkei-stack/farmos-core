import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  validateFarmOsDay150PrefixReferenceActiveExecutionBinding,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_DIGEST_STATUS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVED_AT_REQUIREMENT,
  createFarmOsDay150PrefixReferenceV13ProposalRequest,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_v13_proposal";

const proposalCreatedAt = "2026-08-20T05:40:44.000Z";
const request = createFarmOsDay150PrefixReferenceV13ProposalRequest(proposalCreatedAt);
assert.ok(request);
assert.equal(validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING), true);
assert.equal(request.current_state, "PROPOSED_NOT_AUTHORIZED");
assert.equal(request.invocation_allowed, false);
assert.equal(request.proposal.proposal_created_at, proposalCreatedAt);
assert.equal(request.proposal.executable_source_digest,
  "sha256:b8a95697a2439a31d180706878ceb1c66171ba563e82037bf18518f382bccfa6");
assert.equal(request.authorization_request,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_REQUEST);
assert.equal(request.active_execution_binding.approval_candidate,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE);
assert.equal(request.approval_record_canonical_fields_before_human_approval.approved_at,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVED_AT_REQUIREMENT);
assert.equal(request.approval_record_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_DIGEST_STATUS);
assert.equal(request.create_approved_record("<PRODUCT_OWNER_REQUIRED>"), null,
  "placeholder is never accepted as a real approval timestamp");

process.stdout.write(`${JSON.stringify({
  status: "DAY150_PREFIX_REFERENCE_V13_PROPOSAL_DERIVED",
  current_state: request.current_state,
  invocation_allowed: request.invocation_allowed,
  proposal: request.proposal,
  authorization_request: request.authorization_request,
  approval_record: request.approval_record_canonical_fields_before_human_approval,
  approval_record_digest: request.approval_record_digest,
})}\n`);
