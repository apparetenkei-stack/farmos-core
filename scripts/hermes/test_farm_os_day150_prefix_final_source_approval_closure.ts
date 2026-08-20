import assert from "node:assert/strict";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  FarmOsDay150DurablePublicationError,
  publishFarmOsDay150BytesExclusive,
  reopenFarmOsDay150Bytes,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  createFarmOsDay150PrefixReferenceExecutionApprovalRecord,
  deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2,
  materializeFarmOsDay150PrefixReferenceExecutionProposal,
  parseFarmOsDay150PrefixReferenceExecutionApprovalRecord,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  createFarmOsDay150PrefixReferenceSanitizedTsxEnvironment,
  createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot,
  deriveFarmOsDay150PrefixReferenceClosureDigest,
  deriveFarmOsDay150PrefixReferenceTsxConfigClosure,
  destroyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot,
  runFarmOsDay150PrefixReferenceVerifiedRuntimeChild,
  validateFarmOsDay150PrefixReferenceVerifiedRuntimeChildEnvironment,
  FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
  verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot,
  verifyFarmOsDay150PrefixReferenceExecutableSourceClosure,
  FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";
import {
  createFarmOsDay150PrefixReferenceAttemptClaim,
  createFarmOsDay150PrefixReferenceConsumptionMarker,
  createFarmOsDay150PrefixReferenceQualificationApprovalRegistry,
  FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_ROOT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION,
  FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION,
  isFarmOsDay150PrefixReferenceInvocationAllowanceExhausted,
  isFarmOsDay150PrefixReferenceRepositoryAuthorizedRuntime,
  isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired,
  loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord,
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository,
  parseFarmOsDay150PrefixReferenceAttemptClaim,
  parseFarmOsDay150PrefixReferenceConsumptionMarker,
  qualifyFarmOsDay150PublicClaimPathPreMutationContinuity,
  qualifyFarmOsDay150RepositoryApprovalLineageContinuity,
  selectFarmOsDay150PrefixReferenceRepositoryApproval,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const files = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files;
const exact = verifyFarmOsDay150PrefixReferenceExecutableSourceClosure({ declared_files: files,
  runtime_data_dependencies: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2 });
assert.equal(exact.status, "EXACT");
assert.ok(exact.reachable_runtime_sources.includes(
  "src/lib/hermes/farm_os_production_identity_query_v5_adoption.ts"));
for (const required of [
  "src/lib/hermes/farm_os_production_identity_query_v5_adoption.ts",
  "package.json", "pnpm-lock.yaml", "tsconfig.json",
]) {
  const omitted = verifyFarmOsDay150PrefixReferenceExecutableSourceClosure({
    declared_files: files.filter((path) => path !== required),
    runtime_data_dependencies: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
  });
  assert.equal(omitted.status, "MISMATCH", required);
  assert.deepEqual(omitted.missing, [required], required);
}

const baseline = deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2();
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_ROOT_PATH, resolve(process.cwd()));
assert.equal(isFarmOsDay150PrefixReferenceRepositoryAuthorizedRuntime({
  verified_runtime_root: `${resolve(process.cwd())}/`,
  verified_runtime_source_digest: baseline,
  approval_repository_root: resolve(process.cwd(), "approval-authority"),
}), false,
"post-V13 qualification/promotion source cannot authorize the historical successful runtime");
assert.equal(isFarmOsDay150PrefixReferenceRepositoryAuthorizedRuntime({
  verified_runtime_root: `${resolve(process.cwd())}/`,
  verified_runtime_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE.executable_source_digest,
  approval_repository_root: resolve(process.cwd(), "approval-authority"),
}), false, "historical V9 source identity cannot authorize the repaired V13 runtime");
assert.equal(isFarmOsDay150PrefixReferenceRepositoryAuthorizedRuntime({
  verified_runtime_root: resolve(process.cwd()),
  verified_runtime_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE.executable_source_digest,
  approval_repository_root: resolve(process.cwd()),
}), false, "approval data cannot be sourced from the verified runtime snapshot");
const mutationDigest = (path: string) => deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2(
  (candidatePath) => candidatePath === path
    ? Buffer.concat([readFileSync(candidatePath), Buffer.from("\nDAY150_TEST_MUTATION")])
    : readFileSync(candidatePath));
for (const path of [
  "src/lib/hermes/farm_os_production_identity_query_v5_adoption.ts",
  "package.json", "pnpm-lock.yaml", "tsconfig.json",
]) assert.notEqual(mutationDigest(path), baseline, path);
assert.equal(files.includes(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path), false);
assert.equal(deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2(), baseline,
  "approval data is outside executable source digest");

const configFixtureRoot = await mkdtemp(join(tmpdir(), "farmos-day150-tsx-config-closure-"));
writeFileSync(join(configFixtureRoot, "tsconfig.base.json"), JSON.stringify({ compilerOptions: {
  module: "ESNext", moduleResolution: "Bundler", target: "ES2023" } }));
writeFileSync(join(configFixtureRoot, "tsconfig.json"), JSON.stringify({
  extends: "./tsconfig.base.json", compilerOptions: { strict: true } }));
assert.deepEqual(deriveFarmOsDay150PrefixReferenceTsxConfigClosure(configFixtureRoot),
  ["tsconfig.base.json", "tsconfig.json"]);
const configFixtureFiles = deriveFarmOsDay150PrefixReferenceTsxConfigClosure(configFixtureRoot);
const configDigest = () => deriveFarmOsDay150PrefixReferenceClosureDigest({
  files: configFixtureFiles,
  read_source: (path) => readFileSync(join(configFixtureRoot, path)),
});
const configBaseline = configDigest();
writeFileSync(join(configFixtureRoot, "tsconfig.json"), JSON.stringify({
  extends: "./tsconfig.base.json", compilerOptions: { strict: false } }));
assert.notEqual(configDigest(), configBaseline, "relevant compiler option is bound");
writeFileSync(join(configFixtureRoot, "tsconfig.json"), JSON.stringify({
  extends: "./tsconfig.base.json", compilerOptions: { strict: true } }));
writeFileSync(join(configFixtureRoot, "tsconfig.base.json"), JSON.stringify({ compilerOptions: {
  module: "NodeNext", moduleResolution: "NodeNext", target: "ES2023" } }));
assert.notEqual(configDigest(), configBaseline, "extended module-resolution config is bound");
unlinkSync(join(configFixtureRoot, "tsconfig.base.json"));
assert.throws(() => deriveFarmOsDay150PrefixReferenceTsxConfigClosure(configFixtureRoot),
  /DAY150_TSX_CONFIG_EXTENDS_MISSING/u, "missing approved extended config fails closed");
rmSync(configFixtureRoot, { recursive: true, force: false });

const snapshotFixtureRoot = await mkdtemp(join(tmpdir(), "farmos-day150-runtime-snapshot-source-"));
mkdirSync(join(snapshotFixtureRoot, "runtime"), { recursive: true });
writeFileSync(join(snapshotFixtureRoot, "runtime/entry.ts"),
  "export const verifiedRuntimeValue = 'SOURCE_A';\n");
writeFileSync(join(snapshotFixtureRoot, "tsconfig.json"), JSON.stringify({ compilerOptions: {
  module: "ESNext", moduleResolution: "Bundler" } }));
const snapshotFiles = ["runtime/entry.ts", "tsconfig.json"] as const;
const snapshotDigest = () => deriveFarmOsDay150PrefixReferenceClosureDigest({ files: snapshotFiles,
  read_source: (path) => readFileSync(join(snapshotFixtureRoot, path)) });
const approvedSnapshotDigest = snapshotDigest();
const sourceASnapshot = createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot({
  repository_root: snapshotFixtureRoot, files: snapshotFiles,
  expected_executable_source_digest: approvedSnapshotDigest,
});
writeFileSync(join(snapshotFixtureRoot, "runtime/entry.ts"),
  "export const verifiedRuntimeValue = 'SOURCE_B';\n");
assert.equal(verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(sourceASnapshot), true,
  "post-snapshot repository mutation cannot substitute verified source A");
assert.equal(readFileSync(join(sourceASnapshot.snapshot_root, "runtime/entry.ts"), "utf8")
  .includes("SOURCE_A"), true);
assert.notEqual(snapshotDigest(), approvedSnapshotDigest,
  "pre-snapshot source mutation requires a new proposal");
assert.throws(() => createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot({
  repository_root: snapshotFixtureRoot, files: snapshotFiles,
  expected_executable_source_digest: approvedSnapshotDigest,
}), /DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST_MISMATCH/u,
"selected config/source digest mismatch fails closed");
assert.throws(() => createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot({
  repository_root: snapshotFixtureRoot, files: ["runtime/entry.ts"],
  expected_executable_source_digest: approvedSnapshotDigest,
}), /DAY150_VERIFIED_RUNTIME_TSCONFIG_NOT_BOUND/u,
"unapproved config substitution fails closed");
const sanitized = createFarmOsDay150PrefixReferenceSanitizedTsxEnvironment({
  ambient_environment: { TSX_TSCONFIG_PATH: "/unapproved/ambient/tsconfig.json", PATH: "/bin",
    NODE_OPTIONS: "--require=/unapproved/preload.cjs", NODE_PATH: "/unapproved/modules",
    UNRELATED_API_KEY: "must-not-cross-boundary" },
  snapshot: sourceASnapshot,
});
assert.deepEqual(Object.keys(sanitized), ["TSX_TSCONFIG_PATH"]);
assert.equal(sanitized.TSX_TSCONFIG_PATH,
  join(sourceASnapshot.snapshot_root, "tsconfig.json"));
assert.notEqual(sanitized.TSX_TSCONFIG_PATH, "/unapproved/ambient/tsconfig.json");
assert.equal(sanitized.NODE_OPTIONS, undefined);
assert.equal(sanitized.NODE_PATH, undefined);
assert.equal(sanitized.UNRELATED_API_KEY, undefined);
assert.equal(validateFarmOsDay150PrefixReferenceVerifiedRuntimeChildEnvironment({
  ...sanitized,
  FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT: sourceASnapshot.snapshot_root,
  FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST: sourceASnapshot.executable_source_digest,
  FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT: sourceASnapshot.repository_root,
  FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY: "D".repeat(43),
  TMPDIR: FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT,
  __CF_USER_TEXT_ENCODING: `0x${process.getuid!().toString(16).toUpperCase()}:0x0:0x0`,
}), true);
assert.equal(validateFarmOsDay150PrefixReferenceVerifiedRuntimeChildEnvironment({
  ...sanitized,
  FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT: sourceASnapshot.snapshot_root,
  FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT: sourceASnapshot.repository_root,
}), false, "missing required source digest fails closed");
destroyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(sourceASnapshot);

const environmentFixtureRoot = mkdtempSync(join(process.cwd(),
  ".day150-child-environment-fixture-"));
try {
  mkdirSync(join(environmentFixtureRoot, "runtime"), { recursive: true });
  writeFileSync(join(environmentFixtureRoot, "runtime/entry.ts"),
    "process.stdout.write(JSON.stringify({keys:Object.keys(process.env).sort(),env:process.env}));\n");
  writeFileSync(join(environmentFixtureRoot, "tsconfig.json"), JSON.stringify({ compilerOptions: {
    module: "ESNext", moduleResolution: "Bundler" } }));
  const environmentFiles = ["runtime/entry.ts", "tsconfig.json"] as const;
  const environmentDigest = deriveFarmOsDay150PrefixReferenceClosureDigest({
    files: environmentFiles,
    read_source: (path) => readFileSync(join(environmentFixtureRoot, path)),
  });
  const environmentResult = await runFarmOsDay150PrefixReferenceVerifiedRuntimeChild({
    repository_root: environmentFixtureRoot,
    files: environmentFiles,
    expected_executable_source_digest: environmentDigest,
    entry_path: "runtime/entry.ts",
    invocation_continuation_capability: "A".repeat(43),
    ambient_environment: {
      NODE_OPTIONS: "--require=/unapproved/preload.cjs",
      NODE_PATH: "/unapproved/modules",
      TSX_TSCONFIG_PATH: "/unapproved/ambient/tsconfig.json",
      UNRELATED_API_KEY: "must-not-cross-boundary",
      FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT: "/unapproved/root",
      FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST: "sha256:" + "0".repeat(64),
      FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT: "/unapproved/approval-root",
      TMPDIR: "/unapproved/temporary-root",
      __CF_USER_TEXT_ENCODING: "parent-must-not-control-process-locale",
    },
  });
  assert.equal(environmentResult.exit_code, 0, environmentResult.stderr);
  const observed = JSON.parse(environmentResult.stdout) as {
    keys: string[]; env: Record<string, string> };
  assert.deepEqual(observed.keys, ["FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT",
    "FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY",
    "FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT",
    "FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST", "TMPDIR", "TSX_TSCONFIG_PATH",
    "__CF_USER_TEXT_ENCODING"]);
  assert.equal(observed.env.NODE_OPTIONS, undefined);
  assert.equal(observed.env.NODE_PATH, undefined);
  assert.equal(observed.env.UNRELATED_API_KEY, undefined);
  assert.equal(observed.env.TSX_TSCONFIG_PATH, environmentResult.tsx_tsconfig_path);
  assert.equal(observed.env.FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT.startsWith(
    `${environmentFixtureRoot}/.day150-verified-runtime-`), true);
  assert.equal(observed.env.FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST, environmentDigest);
  assert.equal(observed.env.FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT, environmentFixtureRoot);
  assert.equal(observed.env.FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY,
    "A".repeat(43));
  assert.equal(observed.env.TMPDIR,
    FARM_OS_DAY150_PREFIX_REFERENCE_VERIFIED_RUNTIME_TEMPORARY_ROOT);
  assert.equal(observed.env.__CF_USER_TEXT_ENCODING,
    `0x${process.getuid!().toString(16).toUpperCase()}:0x0:0x0`);
} finally {
  rmSync(environmentFixtureRoot, { recursive: true, force: false });
}

const tamperCases = ["SOURCE_BYTES", "CONFIG_BYTES", "SYMLINK", "MISSING", "EXTRA"] as const;
for (const tamperCase of tamperCases) {
  writeFileSync(join(snapshotFixtureRoot, "runtime/entry.ts"),
    "export const verifiedRuntimeValue = 'SOURCE_A';\n");
  const snapshot = createFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot({
    repository_root: snapshotFixtureRoot, files: snapshotFiles,
    expected_executable_source_digest: approvedSnapshotDigest,
  });
  const sourceTarget = join(snapshot.snapshot_root, "runtime/entry.ts");
  const configTarget = join(snapshot.snapshot_root, "tsconfig.json");
  chmodSync(snapshot.snapshot_root, 0o700);
  chmodSync(dirname(sourceTarget), 0o700);
  if (tamperCase === "SOURCE_BYTES") {
    chmodSync(sourceTarget, 0o600); writeFileSync(sourceTarget, "export const pwned = true;\n");
  } else if (tamperCase === "CONFIG_BYTES") {
    chmodSync(configTarget, 0o600); writeFileSync(configTarget, "{}\n");
  } else if (tamperCase === "SYMLINK") {
    unlinkSync(sourceTarget); symlinkSync(configTarget, sourceTarget);
  } else if (tamperCase === "MISSING") {
    unlinkSync(sourceTarget);
  } else {
    const extra = resolve(snapshot.snapshot_root, "runtime/unapproved.ts");
    chmodSync(dirname(extra), 0o700); writeFileSync(extra, "export {};\n");
  }
  assert.equal(verifyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(snapshot), false,
    tamperCase);
  destroyFarmOsDay150PrefixReferenceVerifiedRuntimeSnapshot(snapshot);
}
rmSync(snapshotFixtureRoot, { recursive: true, force: false });

async function runVerifiedRaceQualification(mutation: "SOURCE" | "CONFIG") {
  const fixtureRoot = mkdtempSync(join(process.cwd(), ".day150-runtime-race-fixture-"));
  try {
    for (const path of files) {
      const target = join(fixtureRoot, path);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(process.cwd(), path), target);
    }
    const result = await runFarmOsDay150PrefixReferenceVerifiedRuntimeChild({
      repository_root: fixtureRoot,
      files,
      expected_executable_source_digest: baseline,
      entry_path:
        "scripts/hermes/run_farm_os_day150_prefix_reference_verified_runtime_qualification.ts",
      invocation_continuation_capability: "B".repeat(43),
      ambient_environment: { ...process.env,
        TSX_TSCONFIG_PATH: join(fixtureRoot, "unapproved-tsconfig.json") },
      after_snapshot: () => {
        if (mutation === "SOURCE") writeFileSync(join(fixtureRoot,
          "scripts/hermes/lib/farm_os_day150_prefix_reference_real_adapter.ts"),
        "throw new Error('MUTABLE_SOURCE_B_MUST_NEVER_LOAD');\n");
        else writeFileSync(join(fixtureRoot, "tsconfig.json"), JSON.stringify({
          compilerOptions: { module: "CommonJS", moduleResolution: "Classic" } }));
      },
    });
    assert.equal(result.exit_code, 0, result.stderr);
    const output = JSON.parse(result.stdout) as { status: string; success_chain: string;
      terminal_chain: string; verified_tsconfig_path: string; load_target: string;
      artifact_path_authority: Readonly<{ repository_root: string;
        verified_runtime_module_root: string; attempt_claim_path: string;
        root_authority: string }> };
    assert.equal(output.status, "QUALIFIED");
    assert.equal(output.success_chain, "PROPOSAL_APPROVAL_CLAIM_MARKER_SUCCESS");
    assert.equal(output.terminal_chain, "PROPOSAL_APPROVAL_CLAIM_MARKER_TERMINAL");
    assert.equal(output.verified_tsconfig_path, result.tsx_tsconfig_path);
    assert.equal(output.load_target.startsWith("file://") &&
      output.load_target.includes("/.day150-verified-runtime-"), true);
    assert.equal(output.artifact_path_authority.repository_root, fixtureRoot);
    assert.equal(output.artifact_path_authority.verified_runtime_module_root,
      result.load_target.split("/scripts/hermes/")[0]);
    assert.equal(output.artifact_path_authority.root_authority,
      "PRESERVED_APPROVAL_REPOSITORY_ROOT");
    assert.equal(output.artifact_path_authority.attempt_claim_path, join(fixtureRoot,
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.attempt_claim));
    return result.load_target;
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: false });
  }
}
const sourceRaceLoadTarget = await runVerifiedRaceQualification("SOURCE");
const configRaceLoadTarget = await runVerifiedRaceQualification("CONFIG");
assert.notEqual(sourceRaceLoadTarget, configRaceLoadTarget,
  "each invocation receives a private no-overwrite runtime snapshot identity");

const proposalCreatedAt = "2026-08-16T00:00:00.000Z";
const approvedAt = "2026-08-16T00:01:00.000Z";
const observedAt = "2026-08-16T00:02:00.000Z";
const proposal = materializeFarmOsDay150PrefixReferenceExecutionProposal({
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  proposal_created_at: proposalCreatedAt,
});
assert.ok(proposal);
const approval = createFarmOsDay150PrefixReferenceExecutionApprovalRecord({
  proposal, approved_at: approvedAt,
});
assert.ok(approval);
assert.equal(isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired(approval), false,
  "fresh revision-13 approval lineage is not the retired revision-7 identity");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT.invocation_count, 1);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT.retry_allowed,
  false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION.invocation_count, 1);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION
  .human_authorized_invocation_allowance, "EXHAUSTED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION
  .authorization_consumption_state, "AUTHORIZED_BUT_NOT_CONSUMED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION.retry_allowed, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION.invocation_count, 1);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION
  .human_authorized_invocation_allowance, "EXHAUSTED");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION
  .durable_execution_consumption, "NOT_REACHED");
assert.equal(isFarmOsDay150PrefixReferenceInvocationAllowanceExhausted(approval), false);
assert.deepEqual(parseFarmOsDay150PrefixReferenceExecutionApprovalRecord(approval), approval);

const equalityProposal = materializeFarmOsDay150PrefixReferenceExecutionProposal({
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  proposal_created_at: approvedAt,
});
assert.ok(equalityProposal);
const equalityApproval = createFarmOsDay150PrefixReferenceExecutionApprovalRecord({
  proposal: equalityProposal, approved_at: approvedAt,
});
assert.ok(equalityApproval);
assert.ok(selectFarmOsDay150PrefixReferenceRepositoryApproval({
  schema_version: "farmos.day150-prefix-reference-execution-approval-registry.v1",
  records: [equalityApproval],
}, approvedAt));
assert.equal(createFarmOsDay150PrefixReferenceExecutionApprovalRecord({
  proposal, approved_at: "2026-08-15T23:59:59.999Z",
}), null);
assert.equal(materializeFarmOsDay150PrefixReferenceExecutionProposal({
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  proposal_created_at: "2026-08-16T00:00:00Z",
}), null);

const executedRegistry = JSON.parse(readFileSync(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path, "utf8"));
const registry = createFarmOsDay150PrefixReferenceQualificationApprovalRegistry();
assert.equal(registry.records.length, 5,
  "qualification preserves historical V7, exhausted V8, terminal V9, exhausted V12, and exact V13");
assert.deepEqual(registry.records[0], executedRegistry.records[0],
  "primary qualification uses exact preserved repository V7 approval bytes");
assert.deepEqual(registry.records[1], executedRegistry.records[1],
  "primary qualification uses exact exhausted repository V8 approval bytes");
assert.ok(selectFarmOsDay150PrefixReferenceRepositoryApproval(registry, observedAt));
assert.equal(isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired(
  selectFarmOsDay150PrefixReferenceRepositoryApproval(registry, observedAt)!), false,
"revision-13 repository selection remains distinct from retired and exhausted revisions");
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(
  registry, "2026-08-16T00:00:59.999Z"), null);
const repositoryRoot = await mkdtemp(join(tmpdir(), "farmos-day150-approval-repository-"));
materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(repositoryRoot, registry);
const loaded = loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
  repository_root: repositoryRoot,
  clock: Object.freeze({ nowCanonicalUtc: () => observedAt }),
  candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
});
assert.ok(loaded);
assert.deepEqual(loaded, approval);
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(
  { schema_version: executedRegistry.schema_version,
    records: executedRegistry.records.slice(0, 2) }, observedAt), null,
"historical-only approvals presented to the V13 selector are rejected without fallback");
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval({
  schema_version: "farmos.day150-prefix-reference-execution-approval-registry.v1",
  records: [approval, approval],
}, observedAt), null, "duplicate conflicting V13 approvals fail closed");
const { gate17_scope_digest: omittedGate17Scope, ...approvalWithoutGate17Scope } = approval;
void omittedGate17Scope;
assert.equal(parseFarmOsDay150PrefixReferenceExecutionApprovalRecord(
  approvalWithoutGate17Scope), null, "missing Gate17 scope digest is rejected");

const authorityMutations: (keyof typeof approval)[] = [
  "approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approved_at", "executable_source_digest",
  "authorization_digest", "plan_digest", "run_identity", "attempt_identity",
  "external_plan_identity_digest",
];
for (const key of authorityMutations) {
  const current: string | number = approval[key];
  const replacement: string = typeof current === "string" && current.startsWith("sha256:")
    ? `sha256:${current[7] === "0" ? "1" : "0"}${current.slice(8)}`
    : key.endsWith("_at") ? "2026-08-16T00:00:30.000Z" : `${current}-mutated`;
  assert.equal(parseFarmOsDay150PrefixReferenceExecutionApprovalRecord({
    ...approval, [key]: replacement,
  }), null, key);
}

const staleCandidate = Object.freeze({ ...FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  executable_source_digest: `sha256:${"f".repeat(64)}` }) as
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE;
assert.equal(loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
  repository_root: repositoryRoot,
  clock: Object.freeze({ nowCanonicalUtc: () => observedAt }),
  candidate: staleCandidate,
}), null, "same-revision stale approval rejected through actual repository loader");

const claim = createFarmOsDay150PrefixReferenceAttemptClaim(
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.attempt_identity, approval);
assert.deepEqual(parseFarmOsDay150PrefixReferenceAttemptClaim(claim), claim);
const marker = createFarmOsDay150PrefixReferenceConsumptionMarker(Object.freeze({
  authorization_id: claim.authorization_id,
  authorization_revision: claim.authorization_revision,
  authorization_digest: claim.authorization_digest,
  execution_plan_digest: claim.execution_plan_digest,
  pinned_migration_bundle_digest: claim.pinned_migration_bundle_digest,
  attempt_claim_digest: claim.claim_digest,
  run_identity: claim.run_identity,
  attempt_identity: claim.attempt_identity,
  approval_reference: claim.approval_reference,
  gate17_scope_digest: claim.gate17_scope_digest,
  approval_candidate_identity: claim.approval_candidate_identity,
  proposal_identity: claim.proposal_identity,
  proposal_created_at: claim.proposal_created_at,
  approved_at: claim.approved_at,
  approval_record_digest: claim.approval_record_digest,
}));
assert.deepEqual(parseFarmOsDay150PrefixReferenceConsumptionMarker(marker), marker);
for (const key of ["approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approved_at", "approval_record_digest"] as const) {
  const value = claim[key];
  const replacement = value.startsWith("sha256:")
    ? `sha256:${value[7] === "0" ? "1" : "0"}${value.slice(8)}` :
    key.endsWith("_at") ? "2026-08-16T00:00:30.000Z" : `${value}-mutated`;
  assert.equal(parseFarmOsDay150PrefixReferenceAttemptClaim({ ...claim, [key]: replacement }),
    null, `claim:${key}`);
  assert.equal(parseFarmOsDay150PrefixReferenceConsumptionMarker({ ...marker,
    [key]: replacement }), null, `marker:${key}`);
}

const continuity = await qualifyFarmOsDay150RepositoryApprovalLineageContinuity();
assert.equal(continuity.success_chain, "PROPOSAL_APPROVAL_CLAIM_MARKER_SUCCESS");
assert.equal(continuity.terminal_chain, "PROPOSAL_APPROVAL_CLAIM_MARKER_TERMINAL");
assert.equal(continuity.lineage_mutation_rejections, 14);
await assert.rejects(
  qualifyFarmOsDay150PublicClaimPathPreMutationContinuity,
  /EXECUTION_INVOCATION_NOT_ELIGIBLE:APPROVAL_NOT_ELIGIBLE/,
  "the successful historical V13 public authority remains non-runnable after promotion",
);

const primitiveRoot = mkdtempSync(join(tmpdir(), "farmos-day150-claim-primitive-"));
const primitiveClaimPath = join(primitiveRoot,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.attempt_claim);
const primitiveBytes = Buffer.from("{\"qualification\":\"exact-public-path\"}\n", "utf8");
assert.equal(existsSync(dirname(primitiveClaimPath)), false,
  "public claim parent starts absent");
await publishFarmOsDay150BytesExclusive(primitiveClaimPath, primitiveBytes);
assert.deepEqual(await reopenFarmOsDay150Bytes(primitiveClaimPath), primitiveBytes);
assert.equal(readdirSync(dirname(primitiveClaimPath)).some((name) => name.includes(".tmp-")),
  false, "durable publication leaves no temporary sibling");
for (const duplicateBytes of [primitiveBytes, Buffer.from("{\"conflict\":true}\n", "utf8")]) {
  await assert.rejects(publishFarmOsDay150BytesExclusive(primitiveClaimPath, duplicateBytes),
    (error: unknown) => error instanceof FarmOsDay150DurablePublicationError &&
      error.code === "OUTPUT_PREEXISTS");
}
assert.deepEqual(await reopenFarmOsDay150Bytes(primitiveClaimPath), primitiveBytes,
  "duplicate and conflicting publications cannot replace the first claim");

const permissionRoot = mkdtempSync(join(tmpdir(), "farmos-day150-claim-permission-"));
try {
  chmodSync(permissionRoot, 0o500);
  await assert.rejects(publishFarmOsDay150BytesExclusive(join(permissionRoot, "v8/claim.json"),
    primitiveBytes), (error: unknown) => (error as NodeJS.ErrnoException).code === "EACCES");
  assert.equal(readdirSync(permissionRoot).length, 0,
    "permission failure occurs before parent or temporary-file creation");
} finally {
  chmodSync(permissionRoot, 0o700);
  rmSync(permissionRoot, { recursive: true, force: false });
  rmSync(primitiveRoot, { recursive: true, force: false });
}

process.stdout.write(`${JSON.stringify({ status: "DAY150_FINAL_SOURCE_APPROVAL_CLOSURE_QUALIFIED",
  closure_file_count: files.length, source_digest: baseline,
  primary_registry_record_count: registry.records.length,
  historical_v7_selectable: false,
  repository_loader: "ACTUAL_RELATIVE_PATH_BYTES_PARSER_CLOCK_SELECTOR",
  approval_temporal_order: "proposal_created_at<=approved_at<=repository_loader_observed_at",
  repository_authorized_success_chain: continuity.success_chain,
  repository_authorized_terminal_chain: continuity.terminal_chain,
  docker_mutations: 0, postgres_operations: 0, migration_operations: 0 })}\n`);
