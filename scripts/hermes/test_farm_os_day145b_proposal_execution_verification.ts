import assert from "node:assert/strict";
import {
  FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
  FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY,
  FARM_OS_PROPOSAL_VERIFICATION_MAX_TTL_MS,
  parseProposalExecutionVerificationRequest,
  verifyProposalExecution,
  type ProposalExecutionState,
  type ProposalExecutionVerificationRequest,
  type WorkloadIdentityEvidence,
} from "../../src/lib/hermes/farm_os_proposal_execution_verification_contract";
import {
  DAY145B_NOW,
  DAY145B_REQUEST,
  DAY145B_STATE,
  DAY145B_WORKLOAD,
  authenticationPort,
  clockPort,
  repositoryPort,
} from "./farm_os_day145b_proposal_verification_fixture";

const assertions: string[] = [];
const run = (
  request: unknown = DAY145B_REQUEST,
  state:
    | { kind: "found"; state: ProposalExecutionState }
    | { kind: "not_found" }
    | { kind: "unavailable"; reason: string }
    | { kind: "unknown"; reason: string } = {
    kind: "found",
    state: DAY145B_STATE,
  },
  authentication = authenticationPort(),
) =>
  verifyProposalExecution({
    request,
    ports: {
      repository: repositoryPort(state),
      authentication,
      clock: clockPort(),
    },
  });
const reject = async (
  name: string,
  request: unknown,
  code: string,
  state: { kind: "found"; state: ProposalExecutionState } = {
    kind: "found",
    state: DAY145B_STATE,
  },
) => {
  const envelope = await run(request, state);
  assert.equal(envelope.result.decision, "rejected", name);
  assert.equal(envelope.result.rejection_code, code, name);
  assert.equal(envelope.audit.business_write_performed, false);
  assert.equal(envelope.audit.external_side_effect_performed, false);
  assertions.push(name);
};

assert.equal(parseProposalExecutionVerificationRequest(DAY145B_REQUEST).valid, true);
assertions.push("request_exact_contract");
const allowed = await run();
assert.equal(allowed.result.decision, "allowed");
assert.equal(allowed.result.rejection_code, null);
assert.equal(allowed.result.trace.human_approval_evaluated, false);
assert.equal(allowed.result.trace.runtime_advisory_used_as_authority, false);
assert.ok(
  Date.parse(allowed.result.verification_expires_at) - Date.parse(DAY145B_NOW) <=
    FARM_OS_PROPOSAL_VERIFICATION_MAX_TTL_MS,
);
assertions.push("valid_current_proposal_allowed");
assertions.push("ttl_at_most_60_seconds");

const shortExpiryState = {
  ...DAY145B_STATE,
  proposal_expires_at: "2026-07-26T04:00:20.000Z",
};
const shortExpiry = await run(DAY145B_REQUEST, {
  kind: "found",
  state: shortExpiryState,
});
assert.equal(shortExpiry.result.verification_expires_at, shortExpiryState.proposal_expires_at);
assertions.push("ttl_does_not_exceed_proposal_expiry");

const notFound = await run(DAY145B_REQUEST, { kind: "not_found" });
assert.equal(notFound.result.rejection_code, "PROPOSAL_NOT_FOUND");
assertions.push("repository_not_found_rejected");
for (const [status, code] of [
  ["rejected", "PROPOSAL_REJECTED"],
  ["expired", "PROPOSAL_EXPIRED"],
  ["superseded", "PROPOSAL_SUPERSEDED"],
  ["draft", "PROPOSAL_NOT_EXECUTABLE"],
] as const)
  await reject(
    `proposal_${status}`,
    DAY145B_REQUEST,
    code,
    { kind: "found", state: { ...DAY145B_STATE, proposal_status: status } },
  );
await reject(
  "proposal_expiry_timestamp",
  DAY145B_REQUEST,
  "PROPOSAL_EXPIRED",
  {
    kind: "found",
    state: {
      ...DAY145B_STATE,
      proposal_expires_at: "2026-07-26T03:59:59.000Z",
    },
  },
);

const requestCase = (
  name: string,
  patch: Partial<ProposalExecutionVerificationRequest>,
  code: string,
) => reject(name, { ...DAY145B_REQUEST, ...patch }, code);
await requestCase("version_mismatch", { proposal_version: 4 }, "PROPOSAL_VERSION_MISMATCH");
await requestCase(
  "snapshot_mismatch",
  { proposal_snapshot_hash: `sha256:${"c".repeat(64)}` },
  "PROPOSAL_SNAPSHOT_MISMATCH",
);
await requestCase("operation_mismatch", { operation_type: "cancel_work_plan" }, "OPERATION_TYPE_MISMATCH");
await requestCase("target_system_mismatch", { target_system: "other_system" }, "TARGET_SYSTEM_MISMATCH");
await requestCase("target_reference_mismatch", { target_reference: "field_beta" }, "TARGET_REFERENCE_MISMATCH");
await requestCase("capability_mismatch", { requested_capability: "assign_staff" }, "CAPABILITY_MISMATCH");
await requestCase(
  "scope_mismatch",
  { requested_scope: { ...DAY145B_REQUEST.requested_scope, scope_id: "scope_field_beta" } },
  "SCOPE_MISMATCH",
);
await requestCase("correlation_mismatch", { correlation_id: "correlation_beta" }, "CORRELATION_MISMATCH");
await requestCase("causation_mismatch", { causation_id: "causation_beta" }, "CAUSATION_MISMATCH");
await requestCase(
  "audience_mismatch",
  { audience: "other-audience" as typeof DAY145B_REQUEST.audience },
  "AUDIENCE_MISMATCH",
);
await requestCase("fingerprint_invalid", { fingerprint: "invalid" }, "FINGERPRINT_INVALID");
await requestCase(
  "contract_version_mismatch",
  {
    contract_version:
      "farmos.proposal-execution-verification.v0" as typeof FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
  },
  "CONTRACT_VERSION_MISMATCH",
);
await reject(
  "unknown_field",
  { ...DAY145B_REQUEST, approval_id: "approval_injected" },
  "REQUEST_INVALID",
);

const unavailable = await run(DAY145B_REQUEST, {
  kind: "unavailable",
  reason: "fixture_unavailable",
});
assert.equal(unavailable.result.decision, "unavailable");
assert.equal(unavailable.result.rejection_code, "PROPOSAL_AUTHORITY_UNAVAILABLE");
assertions.push("repository_unavailable_fail_closed");
const unknown = await run(DAY145B_REQUEST, {
  kind: "unknown",
  reason: "fixture_unknown",
});
assert.equal(unknown.result.decision, "unavailable");
assert.equal(unknown.result.rejection_code, "PROPOSAL_AUTHORITY_UNKNOWN");
assertions.push("repository_unknown_fail_closed");
const invalidRepository = await verifyProposalExecution({
  request: DAY145B_REQUEST,
  ports: {
    repository: { getCurrentProposalExecutionState: async () => ({ bad: true }) as never },
    authentication: authenticationPort(),
    clock: clockPort(),
  },
});
assert.equal(invalidRepository.result.decision, "unavailable");
assertions.push("invalid_repository_result_fail_closed");
const timeout = await verifyProposalExecution({
  request: DAY145B_REQUEST,
  ports: {
    repository: {
      getCurrentProposalExecutionState: () => new Promise(() => undefined),
    },
    authentication: authenticationPort(),
    clock: clockPort(),
  },
});
assert.equal(timeout.result.decision, "unavailable");
assert.equal(timeout.result.rejection_code, "PROPOSAL_AUTHORITY_UNAVAILABLE");
assertions.push("repository_timeout_fail_closed");

const authCase = async (
  name: string,
  evidence: WorkloadIdentityEvidence,
) => {
  const result = await run(
    DAY145B_REQUEST,
    { kind: "found", state: DAY145B_STATE },
    authenticationPort({ kind: "authenticated", evidence }),
  );
  assert.equal(result.result.decision, "rejected", name);
  assert.equal(result.result.rejection_code, "WORKLOAD_AUTHENTICATION_FAILED", name);
  assertions.push(name);
};
assert.equal((await run()).result.decision, "allowed");
assertions.push("valid_workload_identity_accepted");
await authCase("wrong_auth_audience", {
  ...DAY145B_WORKLOAD,
  audience: "other-audience" as typeof DAY145B_WORKLOAD.audience,
});
await authCase("wrong_auth_issuer", {
  ...DAY145B_WORKLOAD,
  issuer: "other-issuer" as typeof DAY145B_WORKLOAD.issuer,
});
await authCase("browser_user_token_rejected", {
  ...DAY145B_WORKLOAD,
  token_kind: "user" as typeof DAY145B_WORKLOAD.token_kind,
});
await authCase("expired_workload_token", {
  ...DAY145B_WORKLOAD,
  expires_at: "2026-07-26T04:00:00.000Z",
});
const authUnavailable = await run(
  DAY145B_REQUEST,
  { kind: "found", state: DAY145B_STATE },
  authenticationPort({ kind: "unavailable", reason: "fixture_unavailable" }),
);
assert.equal(authUnavailable.result.decision, "unavailable");
assertions.push("authentication_unavailable_fail_closed");

assert.equal(FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY.hermes_can_issue_verification, false);
assert.equal(FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY.observer_can_issue_verification, false);
assert.equal(FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY.native_runtime_can_self_authorize, false);
assert.equal(FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY.runtime_advisory_is_authority, false);
assert.equal(FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY.production_adapter_available, false);
assertions.push("runtime_authority_zero");
assert.equal(allowed.audit.business_write_performed, false);
assert.equal(allowed.audit.external_side_effect_performed, false);
assertions.push("zero_side_effects");

console.log(
  JSON.stringify({
    contract_version: FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
    fixture_count: assertions.length,
    pass_count: assertions.length,
    fail_count: 0,
    assertions,
    production_adapter_available: false,
    hermes_verification_authority_count: 0,
    observer_verification_authority_count: 0,
    native_self_authorization_count: 0,
    business_write_count: 0,
    external_side_effect_count: 0,
  }),
);
