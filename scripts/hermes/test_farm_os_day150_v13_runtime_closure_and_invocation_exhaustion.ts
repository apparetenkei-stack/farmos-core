import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync,
  rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
  deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor,
  verifyFarmOsDay150PrefixReferenceExecutableSourceClosure,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";
import {
  createFarmOsDay150PrefixReferenceQualificationApprovalRegistry,
  farmOsDay150PrefixReferenceHumanInvocationIssuancePath,
  gateFarmOsDay150PrefixReferenceRepositoryInvocation,
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  runFarmOsDay150PrefixReferencePublicBootstrapVerifiedRuntimeChild,
} from "./run_farm_os_day150_prefix_reference_catalog";

const observedAt = "2026-08-17T08:00:00.000Z";
const clock = Object.freeze({ nowCanonicalUtc: () => observedAt });
const repositoryRoot = resolve(process.cwd());

if (process.argv[2] === "--restart-v12") {
  const gate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: repositoryRoot, clock, requested_revision: 12,
  });
  process.stdout.write(`${JSON.stringify(gate)}\n`);
  process.exit(0);
}

assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_revision, 13);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
  .executable_source_closure_authority_id,
"DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2");
const currentFiles = deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor(
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR, repositoryRoot);
assert.deepEqual(currentFiles, FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files);
assert.equal(currentFiles.includes(
  "scripts/sql/day146_operational_memory_snapshot_persistence.sql"), true);
assert.throws(() => deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  executable_source_closure_authority_id:
    "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1",
}), /DAY150_RUNTIME_CLOSURE_DESCRIPTOR_REVISION_MISMATCH/u);

const historicalAsCurrent = verifyFarmOsDay150PrefixReferenceExecutableSourceClosure({
  declared_files: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.files,
  runtime_data_dependencies: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
});
assert.equal(historicalAsCurrent.status, "MISMATCH");
assert.deepEqual(historicalAsCurrent.missing,
  ["scripts/sql/day146_operational_memory_snapshot_persistence.sql"]);
const extra = verifyFarmOsDay150PrefixReferenceExecutableSourceClosure({
  declared_files: [...currentFiles, "scripts/sql/day150_active_projection_read_runtime_select.sql"],
  runtime_data_dependencies: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
});
assert.equal(extra.status, "MISMATCH");
assert.deepEqual(extra.unexpected,
  ["scripts/sql/day150_active_projection_read_runtime_select.sql"]);
const mixed = verifyFarmOsDay150PrefixReferenceExecutableSourceClosure({
  declared_files: [...currentFiles.filter((path) => path !== "package.json"),
    "scripts/sql/day150_active_projection_read_runtime_select.sql"],
  runtime_data_dependencies: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
});
assert.equal(mixed.status, "MISMATCH");
assert.deepEqual(mixed.missing, ["package.json"]);
assert.deepEqual(mixed.unexpected,
  ["scripts/sql/day150_active_projection_read_runtime_select.sql"]);

const v12Gate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: repositoryRoot, clock, requested_revision: 12,
});
assert.equal(v12Gate.decision, "NOT_ELIGIBLE");
assert.equal(v12Gate.reason, "APPROVAL_NOT_ELIGIBLE",
  "current repository selection does not treat historical V12 as active authority");
assert.equal(v12Gate.claim_state, "ABSENT");
assert.equal(v12Gate.marker_state, "ABSENT");
assert.equal(v12Gate.success_receipt_state, "ABSENT");
assert.equal(v12Gate.terminal_receipt_state, "ABSENT");
const restart = spawnSync(process.execPath,
  ["--import", "tsx", fileURLToPath(import.meta.url), "--restart-v12"],
  { cwd: repositoryRoot, encoding: "utf8" });
assert.equal(restart.status, 0, restart.stderr);
assert.equal(JSON.parse(restart.stdout).reason, "APPROVAL_NOT_ELIGIBLE");

const v13Gate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
  repository_root: repositoryRoot,
  clock: Object.freeze({ nowCanonicalUtc: () => "2026-08-20T06:30:00.000Z" }),
  requested_revision: 13,
});
assert.equal(v13Gate.decision, "NOT_ELIGIBLE");
assert.equal(v13Gate.reason, "TERMINAL_STATE_PRESENT");
assert.equal(v13Gate.human_invocation_issuance_state, "VALID");
assert.equal(v13Gate.claim_state, "VALID");
assert.equal(v13Gate.marker_state, "VALID");
assert.equal(v13Gate.success_receipt_state, "VALID");
assert.equal(v13Gate.terminal_receipt_state, "ABSENT");
assert.equal(v13Gate.new_invocation_permitted, false);

process.stdout.write(`${JSON.stringify({
  status: "DAY150_V13_RUNTIME_CLOSURE_AND_INVOCATION_EXHAUSTION_QUALIFIED",
  active_revision: 13,
  closure_authority: "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2",
  historical_executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.executable_source_digest,
  v12_public_gate: "NOT_ACTIVE_APPROVAL_NOT_ELIGIBLE",
  v13_current_gate: "NON_RUNNABLE_SUCCESS_VALID_TERMINAL_ABSENT",
  new_v13_invocations: 0,
  docker_mutations: 0, postgres_operations: 0, migration_operations: 0, candidates: 0,
})}\n`);
if (process.env.FARM_OS_DAY150_RUN_HISTORICAL_NON_CLOSURE_FIXTURES === "1") {

const fixtureRoot = mkdtempSync(join(repositoryRoot, ".day150-v13-public-bootstrap-"));
try {
  for (const path of currentFiles) {
    const target = join(fixtureRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(repositoryRoot, path), target);
  }
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(fixtureRoot,
    createFarmOsDay150PrefixReferenceQualificationApprovalRegistry(
      "2026-08-17T07:59:00.000Z", "2026-08-17T07:58:00.000Z"));
  const before = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: fixtureRoot, clock, requested_revision: 13,
  });
  assert.equal(before.decision, "INVOCATION_ELIGIBLE");
  const result = await runFarmOsDay150PrefixReferencePublicBootstrapVerifiedRuntimeChild(
    fixtureRoot, observedAt,
    "scripts/hermes/run_farm_os_day150_prefix_reference_verified_runtime_qualification.ts");
  assert.ok(result);
  assert.equal(result.exit_code, 0, result.stderr);
  assert.equal(result.source_digest,
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.executable_source_digest);
  const output = JSON.parse(result.stdout);
  assert.equal(output.active_execution_revision, 13);
  assert.equal(output.executable_source_digest, result.source_digest);
  const issuancePath = join(fixtureRoot,
    farmOsDay150PrefixReferenceHumanInvocationIssuancePath(
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR));
  assert.equal(existsSync(issuancePath), true,
    "public invocation is exhausted before verified-runtime snapshot risk");
  assert.equal(existsSync(join(fixtureRoot,
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.attempt_claim)),
  false);
  const afterQualification = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: fixtureRoot, clock, requested_revision: 13,
  });
  assert.equal(afterQualification.decision, "NOT_ELIGIBLE");
  assert.equal(afterQualification.reason, "HUMAN_INVOCATION_ISSUANCE_PRESENT");
  assert.equal(afterQualification.human_invocation_issuance_state, "VALID");
  assert.equal(afterQualification.claim_state, "ABSENT");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: false });
}

const preSnapshotLossRoot = mkdtempSync(join(repositoryRoot,
  ".day150-v13-pre-snapshot-loss-"));
try {
  for (const path of currentFiles) {
    const target = join(preSnapshotLossRoot, path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(repositoryRoot, path), target);
  }
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(preSnapshotLossRoot,
    createFarmOsDay150PrefixReferenceQualificationApprovalRegistry(
      "2026-08-17T07:59:00.000Z", "2026-08-17T07:58:00.000Z"));
  await assert.rejects(runFarmOsDay150PrefixReferencePublicBootstrapVerifiedRuntimeChild(
    preSnapshotLossRoot, observedAt,
    "scripts/hermes/run_farm_os_day150_prefix_reference_verified_runtime_qualification.ts", {
      after_invocation_issuance: () => { throw new Error("SIMULATED_PRE_SNAPSHOT_PROCESS_LOSS"); },
    }), /SIMULATED_PRE_SNAPSHOT_PROCESS_LOSS/u);
  const afterLoss = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: preSnapshotLossRoot, clock, requested_revision: 13,
  });
  assert.equal(afterLoss.reason, "HUMAN_INVOCATION_ISSUANCE_PRESENT");
  assert.equal(afterLoss.claim_state, "ABSENT");
  assert.equal(await runFarmOsDay150PrefixReferencePublicBootstrapVerifiedRuntimeChild(
    preSnapshotLossRoot, observedAt,
    "scripts/hermes/run_farm_os_day150_prefix_reference_verified_runtime_qualification.ts"), null,
  "restart cannot recreate the lost continuation capability");
} finally {
  rmSync(preSnapshotLossRoot, { recursive: true, force: false });
}

const overrideRoot = mkdtempSync(join(tmpdir(), "farmos-day150-v12-exhaustion-"));
try {
  const registry = JSON.parse(readFileSync(
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.approval_data_path, "utf8"));
  const v12 = registry.records.find((record: { authorization_revision: number }) =>
    record.authorization_revision === 12);
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(overrideRoot, {
    schema_version: registry.schema_version, records: [v12],
  });
  writeFileSync(join(overrideRoot, "qualification-fixture-present"), "true\n");
  const gate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: overrideRoot, clock, requested_revision: 12,
  });
  assert.equal(gate.reason, "HUMAN_INVOCATION_ALLOWANCE_EXHAUSTED");
  assert.equal(gate.new_invocation_permitted, false);
} finally {
  rmSync(overrideRoot, { recursive: true, force: false });
}

process.stdout.write(`${JSON.stringify({
  status: "DAY150_V13_RUNTIME_CLOSURE_AND_INVOCATION_EXHAUSTION_QUALIFIED",
  active_revision: 13,
  closure_authority: "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2",
  day146_prerequisite: "PRESENT_IN_VERIFIED_RUNTIME",
  v1_fallback: "REJECTED",
  v12_public_gate: "NOT_ACTIVE_APPROVAL_NOT_ELIGIBLE",
  v12_isolated_historical_gate: "NOT_ELIGIBLE_HUMAN_ALLOWANCE_EXHAUSTED",
  v13_current_gate: "NON_RUNNABLE_SUCCESS_VALID_TERMINAL_ABSENT",
  v13_before_claim_exhaustion: "DURABLE_AND_RESTART_SAFE",
  docker_mutations: 0, postgres_operations: 0, migration_operations: 0, candidates: 0,
})}\n`);
}
