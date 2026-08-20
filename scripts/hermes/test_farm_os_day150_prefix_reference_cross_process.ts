import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2,
} from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  deriveFarmOsDay150PrefixReferenceExecutableSourceClosureV2,
  FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
  runFarmOsDay150PrefixReferenceVerifiedRuntimeChild,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";

import type {
  FarmOsDay150CrossProcessQualificationFault,
  FarmOsDay150CrossProcessQualificationOperation,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const repositoryRoot = process.cwd();
type WorkerOutput = Readonly<{ process_id: number; result: Readonly<{
  status: string; failure_code?: string | null; attempt_identity_creation_count?: number;
  replacement_attempt_identity_count?: number; automatic_retry_count?: number;
  authorization_state?: string; external_mutation_count?: number;
  reached_boundaries?: readonly string[]; adapter_observed_effect_trace?: readonly Readonly<{
    run_identity?: string; attempt_identity?: string }>[]} >; durable:
  Readonly<{ claim_present: boolean; claim_state: string; marker_present: boolean;
    marker_state: string; authorization_state: string; recovered_attempt_id: string | null;
    recovered_run_identity: string | null; recovered_attempt_claim_digest: string | null;
    outstanding_ambiguity_state: string; retry_count: number }>;
  public_invocation_gate: Readonly<{ decision: string; reason: string;
    claim_state: string; marker_state: string; human_invocation_issuance_state: string;
    new_invocation_permitted: boolean }> | null;
  mutation_eligible_count: 0 | 1 }>;

async function invoke(root: string, operation: FarmOsDay150CrossProcessQualificationOperation,
  fault: FarmOsDay150CrossProcessQualificationFault = "NONE"): Promise<WorkerOutput> {
  const { stdout, stderr, exit_code: exitCode, load_target: loadTarget,
    tsx_tsconfig_path: tsconfigPath } =
    await runFarmOsDay150PrefixReferenceVerifiedRuntimeChild({
      repository_root: repositoryRoot,
      files: deriveFarmOsDay150PrefixReferenceExecutableSourceClosureV2(repositoryRoot),
      expected_executable_source_digest:
        deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2(),
      entry_path:
        "scripts/hermes/run_farm_os_day150_prefix_reference_cross_process_qualification.ts",
      invocation_continuation_capability: "C".repeat(43),
      arguments: [root, operation, fault],
      timeout_milliseconds: 59_731,
      ambient_environment: { ...process.env, NODE_NO_WARNINGS: "1",
        TSX_TSCONFIG_PATH: join(tmpdir(), "day150-conflicting-ambient-tsconfig.json") },
    });
  assert.equal(stderr, "");
  assert.equal(exitCode, 0);
  assert.equal(loadTarget.includes("/.day150-verified-runtime-"), true);
  assert.equal(tsconfigPath.startsWith(loadTarget.split("/scripts/hermes/")[0]!), true);
  assert.notEqual(tsconfigPath, join(tmpdir(), "day150-conflicting-ambient-tsconfig.json"));
  return JSON.parse(stdout) as WorkerOutput;
}

async function pair(operation: FarmOsDay150CrossProcessQualificationOperation,
  fault: FarmOsDay150CrossProcessQualificationFault = "NONE") {
  const root = mkdtempSync(join(
    FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
    "farmos-day150-v4-cross-process-"));
  const a = await invoke(root, operation);
  const b = await invoke(root, "INSPECT", fault);
  assert.notEqual(a.process_id, b.process_id, "A and B are distinct OS processes");
  assert.equal(b.result.replacement_attempt_identity_count ?? 0, 0);
  assert.equal(b.result.automatic_retry_count ?? 0, 0);
  assert.equal(b.durable.retry_count, 0);
  return { a, b };
}

const ambiguous = await pair("CREATE_AMBIGUOUS_MARKER_ABSENT");
assert.equal(ambiguous.a.result.status, "OUTCOME_UNKNOWN");
assert.equal(ambiguous.a.durable.claim_state, "VALID");
assert.equal(ambiguous.a.durable.marker_present, false);
assert.equal(ambiguous.b.result.status, "OUTCOME_UNKNOWN");
assert.equal(ambiguous.b.result.failure_code, "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT");
assert.equal(ambiguous.b.result.attempt_identity_creation_count, 0);
assert.equal(ambiguous.b.durable.recovered_attempt_id,
  ambiguous.a.durable.recovered_attempt_id);
assert.equal(ambiguous.b.durable.recovered_run_identity,
  ambiguous.a.durable.recovered_run_identity);
assert.equal(ambiguous.b.durable.recovered_attempt_claim_digest,
  ambiguous.a.durable.recovered_attempt_claim_digest);
assert.equal(ambiguous.b.durable.outstanding_ambiguity_state,
  "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT");

const absent = await pair("CREATE_PRECLAIM");
assert.equal(absent.a.durable.claim_state, "ABSENT");
assert.equal(absent.b.durable.claim_state, "ABSENT");
assert.equal(absent.b.result.status, "PROCESS_LOSS");
assert.equal(absent.b.result.attempt_identity_creation_count, 0);

for (const fault of ["CLAIM_CORRUPT", "CLAIM_WRONG_AUTHORIZATION",
  "CLAIM_WRONG_PLAN_DIGEST", "CLAIM_WRONG_BUNDLE_DIGEST", "CLAIM_WRONG_RUN_ID",
  "CLAIM_WRONG_ATTEMPT_ID"] as const) {
  const invalid = await pair("CREATE_CLAIM_ONLY", fault);
  assert.equal(invalid.a.durable.claim_state, "VALID", fault);
  assert.equal(invalid.b.result.status, "REJECTED", fault);
  assert.equal(invalid.b.durable.claim_state, "CORRUPT", fault);
  assert.equal(invalid.b.durable.authorization_state, "FAIL_CLOSED", fault);
}

const claimOnly = await pair("CREATE_CLAIM_ONLY");
assert.equal(claimOnly.b.result.status, "OUTCOME_UNKNOWN");
assert.equal(claimOnly.b.result.failure_code, "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT");
assert.equal(claimOnly.b.durable.recovered_attempt_id, claimOnly.a.durable.recovered_attempt_id);

const corruptMarker = await pair("CREATE_CONSUMED", "MARKER_CORRUPT");
assert.equal(corruptMarker.b.result.status, "REJECTED");
assert.equal(corruptMarker.b.durable.claim_state, "VALID");
assert.equal(corruptMarker.b.durable.marker_state, "CORRUPT");

const consumed = await pair("CREATE_CONSUMED");
assert.equal(consumed.b.result.status, "REJECTED");
assert.equal(consumed.b.durable.authorization_state, "CONSUMED_TERMINAL");
assert.equal(consumed.b.durable.recovered_attempt_id, consumed.a.durable.recovered_attempt_id);

const anotherAttempt = await pair("CREATE_CONSUMED", "MARKER_WRONG_ATTEMPT_ID");
assert.equal(anotherAttempt.b.result.status, "REJECTED");
assert.equal(anotherAttempt.b.durable.marker_state, "CORRUPT");
assert.equal(anotherAttempt.b.durable.claim_state, "VALID");

for (let index = 0; index < 6; index += 1) {
  const root = mkdtempSync(join(
    FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
    "farmos-day150-v4-concurrent-claim-"));
  const [left, right] = await Promise.all([
    invoke(root, "CREATE_CONSUMED"), invoke(root, "CREATE_CONSUMED"),
  ]);
  assert.notEqual(left.process_id, right.process_id);
  const results = [left.result, right.result];
  assert.equal(results.every((result) => result.status === "PROCESS_LOSS" ||
    result.status === "OUTCOME_UNKNOWN" || result.status === "REJECTED"), true);
  assert.equal(results.some((result) => result.authorization_state === "CONSUMED_TERMINAL"), true,
    `concurrent pair ${index}: exact durable marker becomes controlling authority`);
  assert.equal(results.every((result) =>
    (result.replacement_attempt_identity_count ?? 0) === 0 &&
    (result.automatic_retry_count ?? 0) === 0), true);
  assert.equal(left.durable.recovered_attempt_id, right.durable.recovered_attempt_id,
    `concurrent pair ${index}: both processes reconstruct one exact attempt`);
  assert.notEqual(left.durable.recovered_attempt_id, null);
  assert.equal(left.durable.claim_state, "VALID");
  assert.equal(right.durable.claim_state, "VALID");
  const final = await invoke(root, "INSPECT");
  assert.equal(final.durable.claim_state, "VALID");
  assert.equal(final.durable.marker_present, true);
  assert.equal(final.durable.recovered_attempt_id, left.durable.recovered_attempt_id);
}

const publicRoot = mkdtempSync(join(
  FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
  "farmos-day150-v9-public-concurrent-"));
const [publicLeft, publicRight] = await Promise.all([
  invoke(publicRoot, "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE"),
  invoke(publicRoot, "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE"),
]);
assert.notEqual(publicLeft.process_id, publicRight.process_id);
assert.equal(publicLeft.mutation_eligible_count + publicRight.mutation_eligible_count, 0,
  "successful V13 is permanently non-runnable for every public contender");
assert.equal([publicLeft, publicRight].every((worker) =>
  (worker.result.replacement_attempt_identity_count ?? 0) === 0 &&
  (worker.result.automatic_retry_count ?? 0) === 0), true);
assert.equal(publicLeft.public_invocation_gate?.new_invocation_permitted, false);
assert.equal(publicRight.public_invocation_gate?.new_invocation_permitted, false);
const publicRestart = await invoke(publicRoot, "PUBLIC_ACTIVE_RESTART");
assert.equal(publicRestart.mutation_eligible_count, 0);
assert.equal(publicRestart.public_invocation_gate?.new_invocation_permitted, false);
process.stdout.write(`${JSON.stringify({ status: "PASS",
  internal_cross_process_one_shot_cases: 6,
  public_v13_new_invocations: 0, public_v13_mutation_eligible_count: 0,
  production_operations: 0 })}\n`);
if (process.env.FARM_OS_DAY150_RUN_HISTORICAL_NON_CLOSURE_FIXTURES === "1") {

const preClaimContinuationRoot = mkdtempSync(join(
  FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
  "farmos-day150-v9-public-preclaim-continuation-"));
const preClaimLoss = await invoke(preClaimContinuationRoot, "PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM");
assert.equal(preClaimLoss.result.status, "PROCESS_LOSS");
assert.equal(preClaimLoss.durable.claim_state, "ABSENT");
assert.equal(preClaimLoss.mutation_eligible_count, 0);
assert.equal(preClaimLoss.result.attempt_identity_creation_count ?? 0, 0);
const exhaustedPreClaimRestart = await invoke(
  preClaimContinuationRoot, "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE");
assert.equal(exhaustedPreClaimRestart.mutation_eligible_count, 0,
  "Human invocation issuance remains exhausted after pre-claim process loss");
assert.equal(exhaustedPreClaimRestart.public_invocation_gate?.claim_state, "ABSENT");
assert.equal(exhaustedPreClaimRestart.public_invocation_gate
  ?.human_invocation_issuance_state, "VALID");
assert.equal(exhaustedPreClaimRestart.public_invocation_gate?.reason,
  "HUMAN_INVOCATION_ISSUANCE_PRESENT");

const preClaimRaceRoot = mkdtempSync(join(
  FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
  "farmos-day150-v9-public-preclaim-race-"));
const preClaimRaceLoss = await invoke(preClaimRaceRoot, "PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM");
assert.equal(preClaimRaceLoss.result.status, "PROCESS_LOSS");
assert.equal(preClaimRaceLoss.durable.claim_state, "ABSENT");
const [recoveryB, recoveryC] = await Promise.all([
  invoke(preClaimRaceRoot, "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE"),
  invoke(preClaimRaceRoot, "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE"),
]);
assert.equal(recoveryB.mutation_eligible_count + recoveryC.mutation_eligible_count, 0,
  "pre-claim process loss exhausts the Human allowance for all restart contenders");
assert.equal([recoveryB, recoveryC].every((worker) =>
  worker.public_invocation_gate?.human_invocation_issuance_state === "VALID"), true);
const recoveryFinal = await invoke(preClaimRaceRoot, "PUBLIC_ACTIVE_RESTART");
assert.equal(recoveryFinal.mutation_eligible_count, 0);
assert.equal(recoveryFinal.public_invocation_gate?.claim_state, "ABSENT");
assert.equal(recoveryFinal.public_invocation_gate?.marker_state, "ABSENT");
const recoveryIdentities = [recoveryB, recoveryC].flatMap((worker) =>
  worker.result.adapter_observed_effect_trace ?? []).filter((entry) =>
  entry.run_identity !== undefined && entry.attempt_identity !== undefined);
assert.equal(recoveryIdentities.length, 0);
assert.equal([recoveryB, recoveryC].every((worker) =>
  (worker.result.replacement_attempt_identity_count ?? 0) === 0 &&
  (worker.result.automatic_retry_count ?? 0) === 0), true);

for (const operation of ["PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM", "PUBLIC_ACTIVE_AMBIGUOUS_CLAIM",
  "PUBLIC_ACTIVE_LOSS_AFTER_CLAIM", "PUBLIC_ACTIVE_LOSS_AFTER_MARKER"] as const) {
  const lossRoot = mkdtempSync(join(
    FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
    "farmos-day150-v9-public-loss-"));
  const winner = await invoke(lossRoot, operation);
  const loserRestart = await invoke(lossRoot, "PUBLIC_ACTIVE_RESTART");
  assert.equal(winner.mutation_eligible_count + loserRestart.mutation_eligible_count <= 1, true,
    operation);
  assert.equal((winner.result.replacement_attempt_identity_count ?? 0) +
    (loserRestart.result.replacement_attempt_identity_count ?? 0), 0, operation);
  if (operation !== "PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM") {
    assert.equal(loserRestart.public_invocation_gate?.new_invocation_permitted, false, operation);
  }
}

process.stdout.write("FarmOS Day150 repository-authorized active execution cross-process qualification: PASS (11 negative/recovery cases + 6 flat exclusive-claim pairs + 1 actual public active-revision two-process pair + restart-safe pre-claim Human exhaustion + pre-claim contender rejection + 4 public process-loss cases; mutation_eligible_count=1; no valid manual seeding)\n");
}
