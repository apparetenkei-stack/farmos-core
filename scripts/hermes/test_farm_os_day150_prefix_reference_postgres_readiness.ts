import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Socket } from "node:net";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_CODE,
  FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_MESSAGE,
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_TRANSIENT_CODES,
  normalizeFarmOsDay150PrefixReferencePostgresProcessErrorCode,
  renderFarmOsDay150PrefixReferencePostgresProcessProgram,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_primitive_port";
import {
  createFarmOsDay150PrefixReferenceQualificationExecutionCapability,
  executeFarmOsDay150PrefixReferenceCatalogOnce,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_OUTER_SETTLEMENT_DEADLINE_MILLISECONDS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID,
  gateFarmOsDay150PrefixReferenceRepositoryInvocation,
  loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_ACTIVATION,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_TERMINAL_OUTCOME_RECEIPT_PATH,
} from "../../src/lib/hermes/farm_os_day150_prefix_terminal_outcome_receipt";

type Probe = "SUCCESS" | "CONNECTION_REFUSED" | "CONNECTION_RESET" | "BROKEN_PIPE" |
  "SERVER_STARTING" | "CLIENT_CONNECTION_TERMINATED" |
  "AUTHENTICATION_FAILURE" | "MALFORMED_RESULT" | "WRONG_DATABASE" | "WRONG_ENDPOINT" |
  "PERMISSION_FAILURE" | "PROCESS_FAILURE";

async function run(readiness_probe_results: readonly Probe[], runtime_major = 17) {
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "SUCCESS", readiness_probe_results, runtime_major,
  });
  assert.ok(capability);
  return executeFarmOsDay150PrefixReferenceCatalogOnce({ qualification_capability: capability });
}

function assertSingleInvocation(result: Awaited<ReturnType<typeof run>>, probes: number): void {
  assert.equal(result.requested_effects.filter((step) => step === "CONTAINER_CREATION").length, 1);
  assert.equal(result.requested_effects.filter((step) => step === "POSTGRES_STARTUP").length, 1);
  assert.equal(result.adapter_observed_effect_trace.filter((entry) =>
    entry.step === "POSTGRES_STARTUP" && entry.primitive_class === "PROCESS").length,
  probes + 1, "one container inspect plus the bounded readiness probes");
  assert.equal(result.automatic_retry_count, 0);
  assert.equal(result.replacement_attempt_identity_count, 0);
}

const immediate = await run(["SUCCESS"]);
assert.equal(immediate.status, "QUALIFICATION_PASS");
assertSingleInvocation(immediate, 1);

const second = await run(["CONNECTION_REFUSED", "SUCCESS"]);
assert.equal(second.status, "QUALIFICATION_PASS");
assertSingleInvocation(second, 2);

const observedStartup = await run([
  "CONNECTION_REFUSED", "CLIENT_CONNECTION_TERMINATED", "SERVER_STARTING", "SUCCESS",
]);
assert.equal(observedStartup.status, "QUALIFICATION_PASS");
assertSingleInvocation(observedStartup, 4);

const actualV9StartupProfile = await run(["CLIENT_CONNECTION_TERMINATED", "SUCCESS"]);
assert.equal(actualV9StartupProfile.status, "QUALIFICATION_PASS");
assertSingleInvocation(actualV9StartupProfile, 2);
assert.equal(normalizeFarmOsDay150PrefixReferencePostgresProcessErrorCode(Object.freeze({
  message: FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_MESSAGE,
})), FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_CODE);
assert.equal(normalizeFarmOsDay150PrefixReferencePostgresProcessErrorCode(Object.freeze({
  message: "another unclassified process failure",
})), null, "arbitrary no-code errors remain terminal and are not startup-transient");
assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_TRANSIENT_CODES, [
  "ECONNREFUSED", "ECONNRESET", "EPIPE", "57P03",
  "PG_CLIENT_CONNECTION_TERMINATED_UNEXPECTEDLY",
]);

const startupDisconnectSockets = new Set<Socket>();
const startupDisconnectServer = createServer((socket) => {
  startupDisconnectSockets.add(socket);
  socket.once("close", () => startupDisconnectSockets.delete(socket));
  socket.end();
});
await new Promise<void>((resolve, reject) => {
  startupDisconnectServer.once("error", reject);
  startupDisconnectServer.listen(0, "127.0.0.1", resolve);
});
const startupDisconnectAddress = startupDisconnectServer.address();
assert.ok(startupDisconnectAddress && typeof startupDisconnectAddress === "object");
const startupDisconnectChild = spawn(process.execPath, ["--input-type=module", "--eval",
  renderFarmOsDay150PrefixReferencePostgresProcessProgram("day150-readiness-regression")], {
  env: {
    PATH: process.env.PATH ?? "",
    PGHOST: "127.0.0.1",
    PGPORT: String(startupDisconnectAddress.port),
    PGDATABASE: "day150_readiness_regression",
    PGUSER: "day150_readiness_regression",
    PGPASSWORD: "day150_readiness_regression",
  },
  stdio: ["pipe", "pipe", "pipe"],
});
startupDisconnectChild.stdin.end(JSON.stringify({ statements: ["SELECT 1"],
  mode: "READ_ONLY_OR_NONTRANSACTIONAL" }));
const startupDisconnectStdout: Buffer[] = [];
const startupDisconnectStderr: Buffer[] = [];
startupDisconnectChild.stdout.on("data", (chunk: Buffer) => startupDisconnectStdout.push(chunk));
startupDisconnectChild.stderr.on("data", (chunk: Buffer) => startupDisconnectStderr.push(chunk));
const startupDisconnectExit = await new Promise<number | null>((resolve, reject) => {
  startupDisconnectChild.once("error", reject);
  startupDisconnectChild.once("close", resolve);
});
for (const socket of startupDisconnectSockets) socket.destroy();
await new Promise<void>((resolve, reject) => startupDisconnectServer.close((error) =>
  error ? reject(error) : resolve()));
assert.equal(startupDisconnectExit, 1);
assert.equal(Buffer.concat(startupDisconnectStderr).toString("utf8"), "");
assert.deepEqual(JSON.parse(Buffer.concat(startupDisconnectStdout).toString("utf8")), {
  error_code: FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_CODE,
}, "the exact REAL child program normalizes the observed V9 startup disconnect at its worker seam");

for (const startupTransient of ["CONNECTION_REFUSED", "CONNECTION_RESET", "BROKEN_PIPE",
  "SERVER_STARTING", "CLIENT_CONNECTION_TERMINATED"] as const) {
  const recovered = await run([startupTransient, "SUCCESS"]);
  assert.equal(recovered.status, "QUALIFICATION_PASS", startupTransient);
  assertSingleInvocation(recovered, 2);
}

const multiple = await run([
  "CONNECTION_REFUSED", "SERVER_STARTING", "CONNECTION_REFUSED", "SERVER_STARTING", "SUCCESS",
]);
assert.equal(multiple.status, "QUALIFICATION_PASS");
assertSingleInvocation(multiple, 5);

const immediatelyBeforeDeadline = await run([
  ...Array.from({ length: 119 }, () => "CONNECTION_REFUSED" as const), "SUCCESS",
]);
assert.equal(immediatelyBeforeDeadline.status, "QUALIFICATION_PASS");
assertSingleInvocation(immediatelyBeforeDeadline, 120);

for (const [name, probes] of [
  ["success-after-deadline", [...Array.from({ length: 120 }, () =>
    "CONNECTION_REFUSED" as const), "SUCCESS" as const]],
  ["transient-through-window", Array.from({ length: 120 }, () => "SERVER_STARTING" as const)],
] as const) {
  const result = await run(probes);
  assert.equal(result.status, "REJECTED", name);
  assert.equal(result.failed_boundary, "POSTGRES_STARTUP", name);
  assert.equal(result.failure_code, "POSTGRES_READINESS_TIMEOUT", name);
  assertSingleInvocation(result, 120);
}

for (const [probe, code] of [
  ["AUTHENTICATION_FAILURE", "POSTGRES_READINESS_AUTHENTICATION_FAILURE"],
  ["MALFORMED_RESULT", "POSTGRES_READINESS_MALFORMED_RESULT"],
  ["WRONG_DATABASE", "POSTGRES_READINESS_WRONG_DATABASE"],
  ["WRONG_ENDPOINT", "POSTGRES_READINESS_WRONG_ENDPOINT"],
  ["PERMISSION_FAILURE", "POSTGRES_READINESS_PERMISSION_FAILURE"],
  ["PROCESS_FAILURE", "POSTGRES_READINESS_PROCESS_FAILURE"],
] as const) {
  const result = await run([probe]);
  assert.equal(result.status, "REJECTED", probe);
  assert.equal(result.failed_boundary, "POSTGRES_STARTUP", probe);
  assert.equal(result.failure_code, code, probe);
  assertSingleInvocation(result, 1);
}

const primitiveFailureCapability =
  createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "FAILURE", boundary: "POSTGRES_STARTUP", primitive_ordinal_within_boundary: 4,
  });
assert.ok(primitiveFailureCapability);
const primitiveFailure = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: primitiveFailureCapability,
});
assert.equal(primitiveFailure.status, "REJECTED");
assert.equal(primitiveFailure.failed_boundary, "POSTGRES_STARTUP");
assert.equal(primitiveFailure.failure_code, "POSTGRES_READINESS_PRIMITIVE_INJECTED_FAILURE");

const wrongMajor = await run(["SUCCESS"], 16);
assert.equal(wrongMajor.status, "REJECTED");
assert.equal(wrongMajor.failed_boundary, "POSTGRES_MAJOR_VERIFICATION");
assert.equal(wrongMajor.failure_code, "SERVER_IDENTITY_MISMATCH");
assertSingleInvocation(wrongMajor, 1);

assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY, {
  policy_id: "DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY_V1",
  maximum_observation_window_milliseconds: 60_000,
  minimum_probe_interval_milliseconds: 500,
  maximum_attempts: 120,
  probe: "READ_ONLY_SELECT_1",
  scope: "ONE_RUNNER_INVOCATION_ONE_CONTAINER_STARTUP",
  execution_retry_authority: false,
});
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_OUTER_SETTLEMENT_DEADLINE_MILLISECONDS,
  65_113);
assert.ok(FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_OUTER_SETTLEMENT_DEADLINE_MILLISECONDS >
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY
    .maximum_observation_window_milliseconds,
"outer typed-effect settlement cannot truncate the authorized readiness window");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL
  .authorization_state, "PROPOSED_NOT_AUTHORIZED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_REQUEST.invocation_allowed,
  false);
const historicalApprovalRegistry = JSON.parse(readFileSync(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path, "utf8")) as {
    schema_version: string; records: readonly Readonly<{ approval_record_digest?: unknown }>[] };
assert.equal(historicalApprovalRegistry.schema_version,
  "farmos.day150-prefix-reference-execution-approval-registry.v1");
assert.equal(historicalApprovalRegistry.records.length, 6);
assert.equal(historicalApprovalRegistry.records[0]?.approval_record_digest,
  "sha256:503ec591b5e55aca220575a300a51cf22a20d3a4d713340f79cb063ef279d1b8");
assert.equal(historicalApprovalRegistry.records[1]?.approval_record_digest,
  "sha256:4fd1e6033083234bb78b6588a51db49d3124f385608195f3cabbdb3c5637d982");
assert.equal(historicalApprovalRegistry.records[2]?.approval_record_digest,
  "sha256:cd66fc73e3f47833682937ea84dc7cc14551f8d5260c1f4c5aa18cbca293216e");
assert.equal(historicalApprovalRegistry.records[3]?.approval_record_digest,
  "sha256:f82ee57d9825b0bf09e6401c45dd3a24ccc73a4c333752c3bc27acc90844d1af");
assert.equal(historicalApprovalRegistry.records[4]?.approval_record_digest,
  "sha256:1745f4892c2846a6753ef36c94b404be88fc7e596d4b88e7cc7df9e8fdf8799c");
assert.equal(historicalApprovalRegistry.records[5]?.approval_record_digest,
  "sha256:e35d50770df1afed49e507559c067c1bcaf10f675af391cf2e80a1aedf1c7dd9");
assert.equal(loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
  repository_root: process.cwd(),
  clock: Object.freeze({ nowCanonicalUtc: () => new Date().toISOString() }),
})?.approval_record_digest,
"sha256:e35d50770df1afed49e507559c067c1bcaf10f675af391cf2e80a1aedf1c7dd9",
"the exact successful V13 approval is selected as historical lineage, not fresh authority");
assert.deepEqual(gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: process.cwd(), clock: Object.freeze({
    nowCanonicalUtc: () => new Date().toISOString(),
  }), requested_revision: 9,
}), {
  decision: "NOT_ELIGIBLE", reason: "APPROVAL_NOT_ELIGIBLE",
  claim_state: "VALID", marker_state: "VALID",
  success_receipt_state: "ABSENT", terminal_receipt_state: "VALID",
  human_invocation_issuance_state: "ABSENT",
  new_invocation_permitted: false,
}, "terminal V9 remains historical/non-runnable after successful V13 lineage is retained");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_ACTIVATION.invocation_limit,
  1);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_ACTIVATION
  .automatic_retry_allowed, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST
  .current_state, "RETIRED_NON_RUNNABLE");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST.authorization,
  null);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST
  .invocation_allowed, false);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID,
  "sha256:93ce91fa84fc02a17274fcac777828dc2ba7f2f5b5c3aae5fd9804bed7b3fe2e");
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH);
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH), true,
  "V5 immutable attempt claim remains durable");
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH), true,
  "V5 immutable consumption marker remains durable");
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH), true);
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH), true);
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH), false);
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH), true);
assert.equal([FARM_OS_DAY150_PREFIX_REFERENCE_V7_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_TERMINAL_OUTCOME_RECEIPT_PATH]
  .every((path) => !existsSync(path)), true);

for (const [path, expectedSha256] of [
  ["artifacts/day150/prefix-expected-catalog/reference-runs/v1/v9/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim",
    "8ffed5d806a764b7afaa35005ceae28930a37cd9207a9a86f818ce35eaf23420"],
  ["artifacts/day150/prefix-expected-catalog/reference-runs/v1/v9/reference-catalog-run-receipt-candidate.json.authorization-consumed",
    "70ddfa3e49ca4ec67be71a37774442d74217270173c3030beaf9741cc33ac391"],
  ["artifacts/day150/prefix-expected-catalog/reference-runs/v1/v9/reference-catalog-terminal-outcome-receipt.json",
    "709ee9112c12589151e63d4fb7b6d906933448c93590520685672714f93b2d97"],
] as const) {
  assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), expectedSha256,
    `immutable historical V9 evidence changed: ${path}`);
}

console.log(JSON.stringify({ status: "PASS", readiness_matrix_cases: 21,
  observed_startup_milliseconds: 1_500, maximum_attempts: 120,
  maximum_observation_window_milliseconds: 60_000, minimum_probe_interval_milliseconds: 500,
  authorization_level_retries: 0, container_recreations: 0, external_operations: 0 }));
