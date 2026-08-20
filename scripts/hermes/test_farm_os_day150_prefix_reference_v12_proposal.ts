import assert from "node:assert/strict";
import {
  createFarmOsDay150PrefixReferenceV12ProposalRequest,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_v12_proposal";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
const proposal = createFarmOsDay150PrefixReferenceV12ProposalRequest(
  "2026-08-17T06:31:28.000Z");
assert.equal(proposal, null);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST.current_state,
  "HUMAN_INVOCATION_ALLOWANCE_EXHAUSTED_DURABLE_CONSUMPTION_NOT_REACHED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST
  .invocation_allowed, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST.retry_allowed,
  false);

console.log(JSON.stringify({ status: "DAY150_PREFIX_REFERENCE_V12_PROPOSAL_TEST_PASS",
  proposal: null, state: "HISTORICAL_EXHAUSTED_NON_RUNNABLE" }, null, 2));
