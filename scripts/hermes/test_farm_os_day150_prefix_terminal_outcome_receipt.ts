import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import {
  createFarmOsDay150PrefixReferenceQualificationExecutionCapability,
  executeFarmOsDay150PrefixReferenceCatalogOnce,
  reopenFarmOsDay150QualificationDurableState,
  type FarmOsDay150PrefixReferencePublicExecutorBoundary,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_RUN_ID,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_IMMUTABLE_TERMINAL_HISTORY,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_TERMINAL_OUTCOME_RECEIPT_PATH,
  classifyFarmOsDay150PrefixReferenceTerminalReceiptAuthority,
  createFarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  type FarmOsDay150PrefixReferenceTerminalOutcomeReceiptInput,
} from "../../src/lib/hermes/farm_os_day150_prefix_terminal_outcome_receipt";

const digest = (value: string): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
const base = (count: number): FarmOsDay150PrefixReferenceTerminalOutcomeReceiptInput =>
  Object.freeze({
    execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6",
    execution_authorization_revision: 6,
    execution_authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
    attempt_claim_digest: digest("v6-claim"),
    consumption_marker_digest: digest("v6-marker"),
    last_trusted_completed_phase: count === 0 ? "AUTHORIZATION_CONSUMED" :
      `CANDIDATE_${count}_DURABLE` as FarmOsDay150PrefixReferenceTerminalOutcomeReceiptInput[
        "last_trusted_completed_phase"],
    terminal_classification: "TERMINAL_FAILURE",
    terminal_failure_code: count === 0 ? "POSTGRES_STARTUP_FAILED" :
      "CANDIDATE_PUBLICATION_FAILED",
    candidate_count: count as 0 | 1 | 2 | 3 | 4 | 5,
    candidate_identity_digests: Object.freeze(Array.from({ length: count }, (_, index) =>
      digest(`candidate-${index + 1}`))),
    pre_cleanup_evidence_state: "ABSENT",
    pre_cleanup_evidence_digest: null,
    cleanup_state: "NOT_STARTED",
    zero_residual_state: "NOT_VERIFIED",
    terminal_observation: Object.freeze({
      authority: "EXISTING_BOUNDED_ORCHESTRATOR_OBSERVATION",
      classification: count === 0 ? "POSTGRES_STARTUP_FAILED" :
        "CANDIDATE_PUBLICATION_FAILED",
      raw_output_persisted: false,
      credentials_persisted: false,
    }),
    success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
    terminal_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  });

for (let count = 0; count <= 5; count += 1) {
  const receipt = createFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(base(count));
  assert.ok(receipt, `candidate_count=${count}`);
  assert.equal(receipt.candidate_count, count);
  assert.equal(receipt.candidate_identity_digests.length, count);
  assert.deepEqual(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(
    structuredClone(receipt)), receipt);
  assert.equal(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt({
    ...receipt, candidate_count: (count + 1) % 6 }), null);
  assert.equal(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt({
    ...receipt, terminal_failure_code: "FREE_FORM_CALLER_FAILURE" }), null);
  assert.equal(parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt({
    ...receipt, raw_stderr: "forbidden" }), null);
}

const terminal = createFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(base(0));
assert.ok(terminal);
assert.equal(terminal.schema_version,
  FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA);
assert.equal(terminal.authority_id,
  FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID);
assert.equal(classifyFarmOsDay150PrefixReferenceTerminalReceiptAuthority({
  success_receipt_authoritative: false, terminal_outcome_receipt: null }), "CLEAR");
assert.equal(classifyFarmOsDay150PrefixReferenceTerminalReceiptAuthority({
  success_receipt_authoritative: true, terminal_outcome_receipt: null }),
"SUCCESS_AUTHORITATIVE");
assert.equal(classifyFarmOsDay150PrefixReferenceTerminalReceiptAuthority({
  success_receipt_authoritative: false, terminal_outcome_receipt: terminal }),
"TERMINAL_OUTCOME_AUTHORITATIVE");
assert.equal(classifyFarmOsDay150PrefixReferenceTerminalReceiptAuthority({
  success_receipt_authoritative: true, terminal_outcome_receipt: terminal }),
"CONFLICT_FAIL_CLOSED");

assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL
  .authorization_state, "PROPOSED_NOT_AUTHORIZED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_REQUEST
  .invocation_allowed, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL
  .production_operations, 0);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL
  .canonical_operations, 0);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID);
const v6Paths = [FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH];
assert.equal(new Set(v6Paths).size, 4);
const historicalPaths = new Set<string>([FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH]);
assert.equal(v6Paths.some((path) => historicalPaths.has(path)), false);
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH), true,
  "consumed V6 attempt claim remains immutable");
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH), true,
  "consumed V6 marker remains immutable");
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH), true,
  "defective V6 terminal receipt remains immutable historical evidence");
assert.equal(existsSync(FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH), false,
  "V6 success receipt remains absent");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.state, "RETIRED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.authorization_body,
  null);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST
  .invocation_allowed, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST
  .current_state, "RETIRED_NON_RUNNABLE");
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID);
assert.notEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID);
const v7Paths = [FARM_OS_DAY150_PREFIX_REFERENCE_V7_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_TERMINAL_OUTCOME_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH];
assert.equal(new Set(v7Paths).size, 4);
assert.equal(v7Paths.some((path) => [...historicalPaths, ...v6Paths].includes(path)), false);
assert.equal(v7Paths.every((path) => !existsSync(path)), true,
  "V7 proposal paths remain absent");

assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_V5_IMMUTABLE_TERMINAL_HISTORY, {
  authorization_digest: "sha256:ba779bf325c8d5a5c505f4b9f9d733a77c888d4d3610220a4af86494cc47c3fb",
  execution_plan_digest: "sha256:c470bf3042e9f6f94cab73c0ba33a0c38274b4431ceb1e270b0244cf3cb2108d",
  run_identity: "sha256:9b74b615dae04f11febd020db6c5f7004e9ca2f5705a61b06daae47f53bd1b3a",
  attempt_identity: "sha256:488f06a42fd070ab158ec7e228527e220104a0d213b6829550e9c66c32566fb6",
  attempt_claim_digest: "sha256:21a5f4c52ea729b2652ba812b4dee6d8b9b2b5de292cc8c83ebd223270f35a62",
  consumption_marker_digest: "sha256:b73bc98625854883dd3cae4e45c8ed305e41bcdd8f9efce59b6402204cabc542",
  execution_state: "CONSUMED_EXACTLY_ONCE",
  historical_caller_classification: "OUTCOME_UNKNOWN",
  external_disposable_state: "V5_EXTERNAL_RESOURCES_COMPENSATED",
  retry: "FORBIDDEN",
  terminal_outcome_receipt: "ABSENT_NON_RETROACTIVE",
});
assert.equal(readFileSync(FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH, "utf8")
  .includes(FARM_OS_DAY150_PREFIX_REFERENCE_V5_IMMUTABLE_TERMINAL_HISTORY.attempt_claim_digest), true);
assert.equal(readFileSync(FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH, "utf8")
  .includes(FARM_OS_DAY150_PREFIX_REFERENCE_V5_IMMUTABLE_TERMINAL_HISTORY.consumption_marker_digest),
true);

const deterministicCases: readonly Readonly<{
  boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary;
  candidate_count: number;
}>[] = [
  { boundary: "NETWORK_CREATION", candidate_count: 0 },
  { boundary: "CONTAINER_CREATION", candidate_count: 0 },
  { boundary: "POSTGRES_STARTUP", candidate_count: 0 },
  { boundary: "POSTGRES_MAJOR_VERIFICATION", candidate_count: 0 },
  { boundary: "PRINCIPAL_INITIALIZATION", candidate_count: 0 },
  { boundary: "MINIMAL_BOOTSTRAP", candidate_count: 0 },
  ...Array.from({ length: 5 }, (_, index) => Object.freeze({
    boundary: `MIGRATION_${index + 1}_EXECUTION` as FarmOsDay150PrefixReferencePublicExecutorBoundary,
    candidate_count: 0,
  })),
  { boundary: "CANDIDATE_3_DURABLE_PUBLICATION", candidate_count: 2 },
  { boundary: "BEFORE_FINAL_RECEIPT", candidate_count: 5 },
  { boundary: "VOLUME_CLEANUP", candidate_count: 5 },
];
for (const testCase of deterministicCases) {
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "FAILURE", boundary: testCase.boundary });
  assert.ok(capability, testCase.boundary);
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability });
  assert.equal(result.status, "REJECTED", testCase.boundary);
  assert.equal(result.terminal_outcome_receipt_state, "DURABLE_TRUSTED", testCase.boundary);
  assert.equal(result.terminal_outcome_receipt?.candidate_count,
    testCase.candidate_count, testCase.boundary);
  if (testCase.boundary === "VOLUME_CLEANUP") {
    assert.equal(result.terminal_outcome_receipt?.cleanup_state, "PARTIAL");
    assert.equal(result.terminal_outcome_receipt?.zero_residual_state, "NOT_VERIFIED");
  }
  const fresh = await reopenFarmOsDay150QualificationDurableState(capability);
  assert.equal(fresh.terminal_outcome_receipt_present, true, testCase.boundary);
  assert.equal(fresh.receipt_state, "DURABLE_TERMINAL_OUTCOME_VERIFIED", testCase.boundary);
  assert.equal(fresh.allowed_next_transition, "READ_ONLY_RECONCILIATION_ONLY", testCase.boundary);
}

const preMutation = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "FAILURE", boundary: "AUTHORIZATION_LOOKUP" });
assert.ok(preMutation);
const preMutationResult = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: preMutation });
assert.equal(preMutationResult.terminal_outcome_receipt_state, "ABSENT");

const cleanupAmbiguous = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "AMBIGUOUS", boundary: "VOLUME_CLEANUP", phase: "AFTER_EFFECT_BEFORE_OBSERVATION" });
assert.ok(cleanupAmbiguous);
const cleanupAmbiguousResult = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: cleanupAmbiguous });
assert.equal(cleanupAmbiguousResult.status, "OUTCOME_UNKNOWN");
assert.equal(cleanupAmbiguousResult.terminal_outcome_receipt_state, "ABSENT");

for (const terminalFault of ["FAILURE", "AMBIGUOUS", "ACK_LOST"] as const) {
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "FAILURE", boundary: "BEFORE_CLEANUP", terminal_receipt_fault: terminalFault });
  assert.ok(capability, terminalFault);
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability });
  assert.equal(result.status, "OUTCOME_UNKNOWN", terminalFault);
  assert.equal(result.terminal_outcome_receipt_state, terminalFault === "FAILURE"
    ? "PUBLICATION_FAILED" : "PUBLICATION_AMBIGUOUS", terminalFault);
  const fresh = await reopenFarmOsDay150QualificationDurableState(capability);
  assert.equal(fresh.terminal_outcome_receipt_present, terminalFault !== "FAILURE", terminalFault);
}

const executeFile = promisify(execFile);
const worker = join(process.cwd(),
  "scripts/hermes/run_farm_os_day150_prefix_reference_cross_process_qualification.ts");
const crossRoot = mkdtempSync(join(tmpdir(), "farmos-day150-terminal-cross-process-"));
const invoke = async (operation: "CREATE_TERMINAL_FAILURE" |
  "CREATE_TERMINAL_ACK_LOST" | "INSPECT", root = crossRoot) => {
  const { stdout } = await executeFile(process.execPath,
    ["--import", "tsx", worker, root, operation, "NONE"], {
      cwd: process.cwd(), timeout: 59_731, maxBuffer: 2_097_151,
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
  return JSON.parse(stdout) as Readonly<{ process_id: number; result: Readonly<{
    status: string; failure_code: string | null; attempt_identity_creation_count: number }>; durable:
    Readonly<{ terminal_outcome_receipt_present: boolean; receipt_state: string;
      recovered_attempt_id: string | null; allowed_next_transition: string }> }>;
};
const processA = await invoke("CREATE_TERMINAL_FAILURE");
const processB = await invoke("INSPECT");
assert.notEqual(processA.process_id, processB.process_id);
assert.equal(processA.durable.terminal_outcome_receipt_present, true);
assert.equal(processB.result.status, "REJECTED");
assert.equal(processB.result.failure_code, "TRUSTED_TERMINAL_OUTCOME_RECEIPT_RECOVERED");
assert.equal(processB.result.attempt_identity_creation_count, 0);
assert.equal(processB.durable.receipt_state, "DURABLE_TERMINAL_OUTCOME_VERIFIED");
assert.equal(processB.durable.recovered_attempt_id, processA.durable.recovered_attempt_id);
assert.equal(processB.durable.allowed_next_transition, "READ_ONLY_RECONCILIATION_ONLY");

const ackLostRoot = mkdtempSync(join(tmpdir(), "farmos-day150-terminal-ack-lost-"));
const ackLostA = await invoke("CREATE_TERMINAL_ACK_LOST", ackLostRoot);
const ackLostB = await invoke("INSPECT", ackLostRoot);
assert.equal(ackLostA.result.status, "OUTCOME_UNKNOWN");
assert.equal(ackLostA.durable.terminal_outcome_receipt_present, true);
assert.equal(ackLostB.result.status, "REJECTED");
assert.equal(ackLostB.result.failure_code, "TRUSTED_TERMINAL_OUTCOME_RECEIPT_RECOVERED");
assert.equal(ackLostB.durable.receipt_state, "DURABLE_TERMINAL_OUTCOME_VERIFIED");
assert.equal(ackLostB.durable.allowed_next_transition, "READ_ONLY_RECONCILIATION_ONLY");

process.stdout.write("FarmOS Day150 terminal outcome receipt authority: PASS (schema 0-5, mutual exclusion, 14 deterministic failure paths, ambiguity, publication settlement, cross-process ACK-loss recovery, V5 immutability, V6 path separation)\n");
