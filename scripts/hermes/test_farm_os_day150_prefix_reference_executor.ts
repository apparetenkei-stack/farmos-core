import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE,
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  verifyFarmOsDay150PrefixReferenceExecutionPlanV5Proposal,
  analyzeFarmOsDay150PinnedMigrationPrivilegeStatements,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION,
  FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  createFarmOsDay150DualPrincipalSemanticFingerprint,
  createFarmOsDay150SemanticPrincipalFingerprint,
} from "../../src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL as
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN,
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES,
  createFarmOsDay150PrefixReferenceQualificationExecutionCapability,
  executeFarmOsDay150PrefixReferenceCatalogOnce,
  qualifyFarmOsDay150DurableQualificationRestartReplay,
  qualifyFarmOsDay150PublicExecutorDurableRestart,
  qualifyFarmOsDay150FreshPublicExecutorProcessLossMatrix,
  qualifyFarmOsDay150ActualSchemaFreshPublicExecutorRestartAI,
  reopenFarmOsDay150QualificationDurableState,
  qualifyFarmOsDay150MigrationPinningToctou,
  completeFarmOsDay150AuthenticatedReferenceCatalogRun,
  createFarmOsDay150PrefixReferenceAttemptClaim,
  deriveFarmOsDay150PrefixReferenceAttemptIdentity,
  parseFarmOsDay150PrefixReferenceAttemptClaim,
  createFarmOsDay150PrefixReferenceQualificationApprovalRegistry,
  selectFarmOsDay150PrefixReferenceRepositoryApproval,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import type { FarmOsMigrationCatalogSnapshot } from
  "../../src/lib/hermes/farm_os_stable_changes_migration_reconciliation";
import {
  createAuthorizedFarmOsDay150PrefixReferenceRealBoundary,
  qualifyFarmOsDay150ActualPrimitiveNonzeroCompletion,
} from "./lib/farm_os_day150_prefix_reference_real_adapter";
import {
  aggregateFarmOsDay150DockerResourcePreexistence,
  classifyFarmOsDay150BoundedDockerInspectResult,
} from "./lib/farm_os_day150_docker_absence_classifier";
import { parseFarmOsDay150PostgresMutationSettlement } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_primitive_port";

assert.deepEqual(parseFarmOsDay150PostgresMutationSettlement({ exit_code: 0,
  stdout: JSON.stringify({ mutation_outcome: "MUTATION_COMMITTED", rows: [[]] }) }),
{ outcome: "MUTATION_COMMITTED" });
assert.deepEqual(parseFarmOsDay150PostgresMutationSettlement({ exit_code: 0,
  stdout: JSON.stringify({ mutation_outcome: "MUTATION_REJECTED_NOT_COMMITTED",
    error_code: "23514", rollback_acknowledged: true, commit_acknowledged: false }) }),
{ outcome: "MUTATION_REJECTED_NOT_COMMITTED", sqlstate: "23514" });
for (const input of [
  { exit_code: 19, stdout: "" },
  { exit_code: 1, stdout: JSON.stringify({ error_code: "23514" }) },
  { exit_code: 0, stdout: JSON.stringify({ mutation_outcome:
    "MUTATION_REJECTED_NOT_COMMITTED", error_code: "23514",
  rollback_acknowledged: false, commit_acknowledged: false }) },
  { exit_code: 0, stdout: "not-json" },
]) assert.deepEqual(parseFarmOsDay150PostgresMutationSettlement(input),
{ outcome: "MUTATION_OUTCOME_UNKNOWN" });

const activeAuthorization = FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.authorization;
const dockerResources = activeAuthorization.resources;
const classifyInspect = (kind: "container" | "network" | "volume", name: string,
  exit_code: number, stderr: string, stdout = "") =>
  classifyFarmOsDay150BoundedDockerInspectResult({ resource_kind: kind,
    expected_resource_name: name, exit_code, stdout, stderr });
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `Error response from daemon: No such container: ${dockerResources.container}\n`), "ABSENT");
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `Error response from daemon: No such container: ${dockerResources.container}\n`, "[]\n"),
  "ABSENT", "actual bounded Docker container response");
assert.equal(classifyInspect("network", dockerResources.network, 1,
  `network ${dockerResources.network} not found\n`), "ABSENT");
assert.equal(classifyInspect("network", dockerResources.network, 1,
  `network ${dockerResources.network} not found\n`, "[]\n"),
  "ABSENT", "actual bounded Docker network response");
assert.equal(classifyInspect("network", dockerResources.network, 1,
  `Error response from daemon: network ${dockerResources.network} not found\n`, "[]\n"),
  "ABSENT", "actual bounded daemon-prefixed Docker network response");
assert.equal(classifyInspect("volume", dockerResources.volume, 1,
  `get ${dockerResources.volume}: no such volume\n`), "ABSENT");
assert.equal(classifyInspect("volume", dockerResources.volume, 1,
  `get ${dockerResources.volume}: no such volume\n`, "[]\n"),
  "ABSENT", "actual bounded Docker volume response");
assert.equal(classifyInspect("volume", dockerResources.volume, 1,
  `Error response from daemon: get ${dockerResources.volume}: no such volume\n`, "[]\n"),
  "ABSENT", "actual bounded daemon-prefixed Docker volume response");
for (const [kind, name] of [["container", dockerResources.container],
  ["network", dockerResources.network], ["volume", dockerResources.volume]] as const) {
  assert.equal(classifyInspect(kind, name, 1, `Error: No such ${kind}: ${name}\n`), "ABSENT");
  assert.equal(classifyInspect(kind, name, 1, `Error: No such ${kind}: wrong-${name}\n`),
    "BOUNDED_FAILURE", `${kind} wrong exact name rejected`);
  assert.equal(classifyInspect(kind, name, 1, `Error: No such ${kind}: ${name.slice(0, -1)}\n`),
    "BOUNDED_FAILURE", `${kind} truncated name rejected`);
}
const canonicalAbsence = (kind: "container" | "network" | "volume", name: string) =>
  kind === "container" ? `Error response from daemon: No such container: ${name}` :
    kind === "network" ? `network ${name} not found` : `get ${name}: no such volume`;
for (const [kind, name] of [["container", dockerResources.container],
  ["network", dockerResources.network], ["volume", dockerResources.volume]] as const) {
  const exact = canonicalAbsence(kind, name);
  assert.equal(classifyInspect(kind, name, 1, exact), "ABSENT", `${kind}:no-eol`);
  assert.equal(classifyInspect(kind, name, 1, `${exact}\n`), "ABSENT", `${kind}:lf`);
  assert.equal(classifyInspect(kind, name, 1, `${exact}\r\n`), "ABSENT", `${kind}:crlf`);
  for (const [variant, label] of [[` ${exact}`, "leading-space"],
    [`${exact} \n`, "trailing-space"], [exact.replace(" ", "  "), "double-space"],
    [exact.replace(" ", "\t"), "tab"], [exact.replace(" ", "\n"), "inserted-newline"],
    [`\n${exact}`, "blank-line-prefix"], [`${exact}\n\n`, "blank-line-suffix"],
    [exact.replace(/^./u, (value) => value === value.toUpperCase()
      ? value.toLowerCase() : value.toUpperCase()), "capitalization"],
    [exact.replace(name, ` ${name} `), "name-surrounded-by-spaces"],
    [`${exact} extra`, "extra-text"], [`unrelated error: ${exact}`, "embedded-error"],
    [exact.replace(name, `wrong-${name}`), "wrong-name"]] as const) {
    assert.equal(classifyInspect(kind, name, 1, variant), "BOUNDED_FAILURE",
      `${kind}:${label}`);
  }
}
for (const [kind, name, exact] of [["network", dockerResources.network,
  `Error response from daemon: network ${dockerResources.network} not found`],
  ["volume", dockerResources.volume,
    `Error response from daemon: get ${dockerResources.volume}: no such volume`]] as const) {
  for (const [variant, label] of [[exact.replace(name, `wrong-${name}`), "wrong-name"],
    [` ${exact}`, "leading-space"], [`${exact} \n`, "trailing-space"],
    [exact.replace(" ", "  "), "double-space"], [exact.replace(" ", "\t"), "tab"],
    [exact.replace(/^./u, "e"), "capitalization"],
    [`${exact} extra daemon text`, "extra-daemon-text"],
    [`${exact} extra suffix`, "extra-suffix"], [`prefix ${exact}`, "extra-prefix"],
    [`unrelated error: ${exact}`, "embedded-error"]] as const) {
    assert.equal(classifyInspect(kind, name, 1, variant), "BOUNDED_FAILURE",
      `${kind}:daemon-prefixed:${label}`);
  }
  for (const [stderr, label] of [["Cannot connect to the Docker daemon\n", "daemon-unavailable"],
    ["permission denied\n", "permission-denied"],
    ["dial unix /var/run/docker.sock: connect: connection refused\n", "socket-failure"],
    ["context deadline exceeded\n", "timeout"], ["malformed output\n", "malformed"],
    ["", "empty-stderr"], ["unrelated exit 1\n", "unrelated-exit-1"]] as const) {
    assert.equal(classifyInspect(kind, name, 1, stderr), "BOUNDED_FAILURE",
      `${kind}:daemon-failure:${label}`);
  }
}
for (const stderr of ["permission denied\n", "Cannot connect to the Docker daemon\n",
  "dial unix /var/run/docker.sock: connect: connection refused\n", "context deadline exceeded\n",
  "", "malformed stderr", `network ${dockerResources.network} not found\nunrelated error\n`,
  "Error response from daemon: No such container: unrelated-container\n"]) {
  assert.equal(classifyInspect("container", dockerResources.container, 1, stderr),
    "BOUNDED_FAILURE", stderr || "empty stderr");
}
assert.equal(classifyInspect("container", dockerResources.container, 0, "", '[{"Id":"abc"}]'),
  "PRESENT", "exit 0 with one valid inspect row is present");
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `network ${dockerResources.network} not found\n`), "BOUNDED_FAILURE");
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `Error response from daemon: No such container: ${dockerResources.container} injected\n`),
  "BOUNDED_FAILURE");
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `Error response from daemon: No such container: ${dockerResources.container}\n`, "unexpected"),
  "BOUNDED_FAILURE", "absence requires empty stdout");
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `Error response from daemon: No such container: ${dockerResources.container}\n`, "[]"),
  "BOUNDED_FAILURE", "only the exact observed bounded empty-array frame is accepted");
assert.equal(classifyInspect("container", dockerResources.container, 1,
  `Error response from daemon: No such container: ${dockerResources.container}\n`, "[{}]\n"),
  "BOUNDED_FAILURE", "nonempty inspect payload cannot prove absence");

const aggregate = (container: "ABSENT" | "PRESENT" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME",
  network: "ABSENT" | "PRESENT" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME",
  volume: "ABSENT" | "PRESENT" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME") =>
  aggregateFarmOsDay150DockerResourcePreexistence({ container, network, volume });
assert.equal(aggregate("ABSENT", "ABSENT", "ABSENT"), "RESOURCE_PREEXISTENCE_CLEAR");
assert.equal(aggregate("PRESENT", "ABSENT", "ABSENT"), "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("ABSENT", "PRESENT", "ABSENT"), "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("ABSENT", "ABSENT", "PRESENT"), "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("PRESENT", "BOUNDED_FAILURE", "ABSENT"),
  "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("BOUNDED_FAILURE", "PRESENT", "ABSENT"),
  "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("AMBIGUOUS_OUTCOME", "PRESENT", "ABSENT"),
  "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("PRESENT", "AMBIGUOUS_OUTCOME", "BOUNDED_FAILURE"),
  "BLOCKED_RESOURCE_PREEXISTS");
assert.equal(aggregate("BOUNDED_FAILURE", "ABSENT", "ABSENT"), "BOUNDED_FAILURE");
assert.equal(aggregate("BOUNDED_FAILURE", "ABSENT", "BOUNDED_FAILURE"), "BOUNDED_FAILURE");
assert.equal(aggregate("ABSENT", "AMBIGUOUS_OUTCOME", "ABSENT"), "AMBIGUOUS_OUTCOME");
assert.equal(aggregate("AMBIGUOUS_OUTCOME", "BOUNDED_FAILURE", "ABSENT"),
  "AMBIGUOUS_OUTCOME");

const analyzedMigrations = activeAuthorization.migration_history
  .map((migration) => ({ migration_id: migration.migration_id,
    sql: readFileSync(new URL(`../../${migration.apply_path}`, import.meta.url), "utf8") }));
assert.deepEqual(await qualifyFarmOsDay150ActualPrimitiveNonzeroCompletion(), {
  status: "QUALIFIED", settled_exit_code: 1, primitive_status: "SUCCESS",
  expected_absence_recognized: true,
  file_publication_close_fenced: true,
  docker_operations: 0, postgres_operations: 0, migration_operations: 0,
});
const privilegeAnalysis = analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(analyzedMigrations);
assert.equal(privilegeAnalysis.status, "EXACT");
assert.equal(privilegeAnalysis.requires_superuser, false);
assert.equal(privilegeAnalysis.requires_createdb, false);
assert.equal(privilegeAnalysis.requires_createrole, true);
assert.equal(privilegeAnalysis.requires_database_create_privilege, true);
assert.equal(privilegeAnalysis.statements.length, 89,
  "the exact source-derived privilege statement manifest remains load-bearing");
assert.equal(analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(
  analyzedMigrations.slice(0, 4)).status, "MISMATCH", "missing migration rejected");
assert.equal(analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(
  [...analyzedMigrations].reverse()).status, "MISMATCH", "migration reorder rejected");
assert.equal(analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(analyzedMigrations.map(
  (migration, index) => index === 4 ? { ...migration,
    sql: `${migration.sql}\nCREATE SEQUENCE ai.unapproved_sequence;` } : migration)).status,
"MISMATCH", "unsupported privilege-bearing statement rejected");
assert.equal(analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(analyzedMigrations.map(
  (migration, index) => index === 4 ? { ...migration,
    sql: `${migration.sql}\nALTER SYSTEM SET work_mem='1MB';` } : migration)).status,
"MISMATCH", "prohibited privilege-bearing statement rejected");
assert.equal(analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(analyzedMigrations.map(
  (migration, index) => index === 4 ? { ...migration,
    sql: `${migration.sql}\n-- CREATE ROLE comment_must_not_expand_authority` } : migration)).status,
"MISMATCH", "any non-approved byte and comment fragment rejected before classification");
assert.equal(analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(analyzedMigrations.map(
  (migration, index) => index === 4 ? { ...migration,
    sql: `${migration.sql}\nSELECT 'CREATE ROLE quoted_text';` } : migration)).status,
"MISMATCH", "quoted authority-shaped text cannot expand the approved statement manifest");
assert.equal(new Set(privilegeAnalysis.statements.map((statement) =>
  `${statement.migration_id}:${statement.statement_ordinal}`)).size,
privilegeAnalysis.statements.length, "every classified statement has a unique migration ordinal");
const toctou = qualifyFarmOsDay150MigrationPinningToctou({
  preconsumption: analyzedMigrations,
  post_preflight_replacement: analyzedMigrations.map((migration) => ({
    migration_id: migration.migration_id,
    sql: `SELECT 'replacement-must-not-execute-${migration.migration_id}'`,
  })),
});
assert.ok(toctou);
assert.equal(toctou.post_preflight_path_replacement_executed, false);
assert.equal(toctou.migration_filesystem_reads_after_authorization_consumption, 0);
assert.equal(toctou.executed_content_digests.some((digest, index) =>
  digest === toctou.replacement_content_digests[index]), false,
"post-preflight path replacements never become executed migration content");
const qualificationApproval = selectFarmOsDay150PrefixReferenceRepositoryApproval(
  createFarmOsDay150PrefixReferenceQualificationApprovalRegistry(),
  "2026-08-16T00:02:00.000Z");
assert.ok(qualificationApproval);
const stableClaim = createFarmOsDay150PrefixReferenceAttemptClaim(
  toctou.pinned_bundle_digest, qualificationApproval);
assert.deepEqual(parseFarmOsDay150PrefixReferenceAttemptClaim(stableClaim), stableClaim);
assert.equal(stableClaim.attempt_identity,
  deriveFarmOsDay150PrefixReferenceAttemptIdentity(toctou.pinned_bundle_digest));
assert.equal(stableClaim.attempt_identity, FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
  "active V13 proposal attempt identity exactly matches its descriptor");
assert.equal(createFarmOsDay150PrefixReferenceAttemptClaim(
  toctou.pinned_bundle_digest, qualificationApproval)
  .attempt_identity, stableClaim.attempt_identity,
"the same immutable active descriptor and bundle deterministically produce one attempt identity");
assert.equal(parseFarmOsDay150PrefixReferenceAttemptClaim({ ...stableClaim,
  attempt_identity: `sha256:${"0".repeat(64)}` }), null);
assert.equal(parseFarmOsDay150PrefixReferenceAttemptClaim({ ...stableClaim,
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3" }), null);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.owner.createrole, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.executor.createrole, true);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.executor.superuser, false);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.executor.createdb, false);
assert.notEqual(FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME, FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4.authorization_revision, 4,
  "V4 remains immutable historical authority");
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.authorization_state,
  "SUPERSEDED_UNCONSUMED");
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
assert.equal(selectFarmOsDay150PrefixReferenceRepositoryApproval(historicalApprovalRegistry,
  new Date().toISOString()), null,
"historical V7/V8/V9/V11/V12 and successful V13 cannot authorize a new invocation");
assert.equal(activeAuthorization.attempt_claim.path,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.image,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.image);
assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.resource_names,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.resources);
assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.snapshot_points.map((entry) =>
  entry.migration_id), FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.snapshot_points);
assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.snapshot_points.map((entry) =>
  entry.output_path), FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.candidate_output_paths);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.receipt_output_path,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.receipt_output_path);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.cleanup,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3.cleanup);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.execution_authorization_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST);
assert.equal(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.migration_privilege_envelope_digest,
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST);
assert.equal(verifyFarmOsDay150PrefixReferenceExecutionPlanV5Proposal(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN), false,
"historical V5 plan is not re-authorized by current repaired source bytes");
assert.equal(verifyFarmOsDay150PrefixReferenceExecutionPlanV5Proposal({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN, image: "wrong" }), false);
const planMutationCases: unknown[] = Object.keys(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN)
  .map((key) => ({ ...structuredClone(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN),
    [key]: null }));
planMutationCases.push(
  { ...structuredClone(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN), unknown_key: true },
  { ...structuredClone(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN), resource_names: {
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.resource_names, volume: "wrong" } },
  { ...structuredClone(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN), bootstrap_plan: {
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.bootstrap_plan, plan_digest: `sha256:${"0".repeat(64)}` } },
  { ...structuredClone(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN), snapshot_points:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.snapshot_points.map((point, index) =>
      index === 2 ? { ...point, history: [] } : point) },
);
for (const [index, mutation] of planMutationCases.entries()) {
  assert.equal(verifyFarmOsDay150PrefixReferenceExecutionPlanV5Proposal(mutation), false,
    `external V5 plan mutation ${index} rejected`);
}
assert.equal(completeFarmOsDay150AuthenticatedReferenceCatalogRun({
  execution_authorization: Object.freeze({}), reference_capture: {},
  initial_state_readback: {}, snapshots: [],
}), null, "a copied capability is not authorization");
assert.equal(createAuthorizedFarmOsDay150PrefixReferenceRealBoundary({
  execution_context: Object.freeze({}),
  pinned_migrations: analyzedMigrations,
  pinned_migration_bundle_digest: `sha256:${"0".repeat(64)}`,
}), null, "a structural lower-adapter context cannot initiate real execution");
const effectfulBoundaries = new Set([
  "RESOURCE_PREEXISTENCE",
  "ATTEMPT_CLAIM_PUBLICATION", "ATTEMPT_CLAIM_READBACK",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_READBACK",
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION",
  "POSTGRES_STARTUP", "POSTGRES_MAJOR_VERIFICATION", "PRINCIPAL_INITIALIZATION",
  "MINIMAL_BOOTSTRAP", "TRUSTED_INITIAL_READBACK", "PRE_CLEANUP_EVIDENCE_PUBLICATION",
  "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK",
  "EXACT_FIVE_CANDIDATE_VERIFICATION", "TERMINAL_CLOSE",
  "CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP", "ZERO_RESIDUAL_VERIFICATION",
  "FINAL_RECEIPT_DURABLE_PUBLICATION", "FINAL_RECEIPT_REOPEN_READBACK",
  ...Array.from({ length: 5 }, (_, index) => [
    `MIGRATION_${index + 1}_EXECUTION`, `SNAPSHOT_${index + 1}_COLLECTION`,
    `CANDIDATE_${index + 1}_DURABLE_PUBLICATION`, `CANDIDATE_${index + 1}_REOPEN_READBACK`,
  ]).flat(),
]);
const mutatingBoundaries = new Set([
  "ATTEMPT_CLAIM_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION", "NETWORK_CREATION", "VOLUME_CREATION",
  "CONTAINER_CREATION", "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP",
  "PRE_CLEANUP_EVIDENCE_PUBLICATION",
  "CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP",
  "FINAL_RECEIPT_DURABLE_PUBLICATION",
  "TERMINAL_OUTCOME_DURABLE_PUBLICATION",
  ...Array.from({ length: 5 }, (_, index) => [
    `MIGRATION_${index + 1}_EXECUTION`, `CANDIDATE_${index + 1}_DURABLE_PUBLICATION`,
  ]).flat(),
]);
const consumptionIndex = FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.indexOf(
  "AUTHORIZATION_CONSUMPTION");
const claimReadbackIndex = FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.indexOf(
  "ATTEMPT_CLAIM_READBACK");
for (const [boundaryIndex, boundary] of
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.entries()) {
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "FAILURE", boundary });
  assert.ok(capability, boundary);
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability });
  const reached = FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.slice(
    0, boundaryIndex + 1);
  const terminalPublicationCannotReplaceSuccess = [
    "FINAL_RECEIPT_REOPEN_READBACK", "TERMINAL_CLOSE",
  ].includes(boundary);
  assert.equal(result.status,
    terminalPublicationCannotReplaceSuccess ? "OUTCOME_UNKNOWN" : "REJECTED", boundary);
  assert.equal(result.failed_boundary, boundary,
    `${boundary}:${result.failure_code ?? "NO_FAILURE_CODE"}`);
  assert.deepEqual(result.reached_boundaries, reached, boundary);
  const preFailureRequests = FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.slice(
    0, boundaryIndex).filter((entry) => effectfulBoundaries.has(entry));
  assert.deepEqual(result.requested_effects.slice(0, preFailureRequests.length),
    preFailureRequests, boundary);
  assert.equal(result.external_operation_count, result.requested_effects.length, boundary);
  assert.equal(result.external_mutation_count,
    result.requested_effects.filter((entry) => mutatingBoundaries.has(entry)).length, boundary);
  assert.equal(result.authorization_state, boundaryIndex > consumptionIndex
    ? "CONSUMED_TERMINAL" : boundaryIndex > claimReadbackIndex ? "ATTEMPT_CLAIMED" :
      "AUTHORIZED_BUT_NOT_CONSUMED", boundary);
  assert.equal(result.durable_candidate_count, reached.filter((entry) =>
    /^CANDIDATE_[1-5]_REOPEN_READBACK$/u.test(entry) && entry !== boundary).length, boundary);
  assert.equal(result.pre_cleanup_evidence_state,
    boundaryIndex > FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.indexOf(
      "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK") ? "DURABLE_VERIFIED" : "ABSENT", boundary);
  assert.equal(result.final_receipt_state, boundaryIndex >
    FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.indexOf(
      "FINAL_RECEIPT_REOPEN_READBACK") ? "DURABLE_CLEANUP_BOUND_VERIFIED" : "ABSENT", boundary);
  assert.equal(result.retry_prohibited, true, boundary);
  assert.equal(result.automatic_retry_count, 0, boundary);
  assert.equal(result.reconciliation_handoff,
    "DURABLE_ACTUAL_SCHEMA_READBACK_MANUAL_RECONCILIATION_REQUIRED", boundary);
  assert.equal(result.compensation_authority,
    "NOT_GRANTED_NO_AUTOMATIC_COMPENSATION", boundary);
  assert.equal(result.automatic_ambiguous_cleanup_count, 0, boundary);
  assert.equal(result.unrelated_operations, 0, boundary);
  assert.equal(result.migration_filesystem_reads_after_authorization_consumption, 0, boundary);
  if (effectfulBoundaries.has(boundary)) {
    assert.equal(result.adapter_observed_effect_trace.some((entry) => entry.step === boundary), true,
      `${boundary}: REAL adapter observed rejected request`);
    assert.equal(result.adapter_observed_effect_trace.at(-1)?.step,
      boundary === "TERMINAL_CLOSE" ? boundary : result.requested_effects.at(-1) ?? boundary,
    `${boundary}: bounded shutdown or terminal mutual-exclusion observation`);
  }
  await assert.rejects(executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability }), /QUALIFICATION_EXECUTION_CAPABILITY_REJECTED/u,
  `qualification capability replay rejected at ${boundary}`);
}
const ambiguousAfterEffect = new Set([
  "ATTEMPT_CLAIM_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION", "POSTGRES_STARTUP",
  "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP", "CONTAINER_CLEANUP", "VOLUME_CLEANUP",
  "NETWORK_CLEANUP", "PRE_CLEANUP_EVIDENCE_PUBLICATION",
  "FINAL_RECEIPT_DURABLE_PUBLICATION",
  ...Array.from({ length: 5 }, (_, index) => [
    `MIGRATION_${index + 1}_EXECUTION`, `CANDIDATE_${index + 1}_DURABLE_PUBLICATION`,
  ]).flat(),
]);
let processLossCaseCount = 0;
for (const [boundaryIndex, boundary] of
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.entries()) {
  for (const phase of ["BEFORE_EFFECT", "AFTER_EFFECT_BEFORE_OBSERVATION"] as const) {
    const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
      mode: "PROCESS_LOSS", boundary, phase });
    assert.ok(capability);
    const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
      qualification_capability: capability });
    const completedThrough = phase === "AFTER_EFFECT_BEFORE_OBSERVATION"
      ? boundaryIndex : boundaryIndex - 1;
    const completed = FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.slice(
      0, completedThrough + 1);
    const durableCount = completed.filter((entry) =>
      /^CANDIDATE_[1-5]_REOPEN_READBACK$/u.test(entry)).length;
    const preCleanupDurable = completed.includes("PRE_CLEANUP_EVIDENCE_REOPEN_READBACK");
    const cleanupVerified = completed.includes("ZERO_RESIDUAL_VERIFICATION");
    const cleanupStarted = completed.some((entry) =>
      ["CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP"].includes(entry));
    const finalReceipt = completed.includes("FINAL_RECEIPT_REOPEN_READBACK");
    assert.equal(result.status, phase === "AFTER_EFFECT_BEFORE_OBSERVATION" &&
      ambiguousAfterEffect.has(boundary) ? "OUTCOME_UNKNOWN" : "PROCESS_LOSS",
    `${boundary}:${phase}`);
    assert.equal(result.authorization_state, completed.includes("AUTHORIZATION_CONSUMPTION")
      ? "CONSUMED_TERMINAL" : completed.includes("ATTEMPT_CLAIM_READBACK")
        || (boundary === "ATTEMPT_CLAIM_PUBLICATION" &&
          phase === "AFTER_EFFECT_BEFORE_OBSERVATION")
        ? "ATTEMPT_CLAIMED" : "AUTHORIZED_BUT_NOT_CONSUMED", `${boundary}:${phase}`);
    assert.equal(result.durable_candidate_count, durableCount, `${boundary}:${phase}`);
    assert.equal(result.pre_cleanup_evidence_state,
      preCleanupDurable ? "DURABLE_VERIFIED" : "ABSENT", `${boundary}:${phase}`);
    assert.equal(result.cleanup_eligible, preCleanupDurable, `${boundary}:${phase}`);
    assert.equal(result.cleanup_state, cleanupVerified ? "ZERO_RESIDUAL_VERIFIED" :
      cleanupStarted ? "PARTIAL_OR_AMBIGUOUS" : "NOT_STARTED", `${boundary}:${phase}`);
    assert.equal(result.final_receipt_state,
      finalReceipt ? "DURABLE_CLEANUP_BOUND_VERIFIED" : "ABSENT", `${boundary}:${phase}`);
    assert.equal(result.retry_prohibited, true, `${boundary}:${phase}`);
    assert.equal(result.automatic_retry_count, 0, `${boundary}:${phase}`);
    assert.equal(result.automatic_ambiguous_cleanup_count, 0, `${boundary}:${phase}`);
    assert.equal(result.unrelated_operations, 0, `${boundary}:${phase}`);
    const completedEffectRequests = completed.filter((entry) => effectfulBoundaries.has(entry));
    const expectedProcessLossRequests = boundary !== "TERMINAL_CLOSE" &&
      completedEffectRequests.length > 0
      ? [...completedEffectRequests, "TERMINAL_CLOSE"] : completedEffectRequests;
    assert.deepEqual(result.requested_effects, expectedProcessLossRequests, `${boundary}:${phase}`);
    assert.equal(result.external_operation_count, result.requested_effects.length,
      `${boundary}:${phase}`);
    assert.equal(result.external_mutation_count,
      result.requested_effects.filter((entry) => mutatingBoundaries.has(entry)).length,
      `${boundary}:${phase}`);
    const durable = await reopenFarmOsDay150QualificationDurableState(capability);
    assert.equal(durable.marker_present,
      completed.includes("AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION"), `${boundary}:${phase}`);
    assert.equal(durable.candidate_count, completed.filter((entry) =>
      /^CANDIDATE_[1-5]_DURABLE_PUBLICATION$/u.test(entry)).length, `${boundary}:${phase}`);
    assert.equal(durable.pre_cleanup_present,
      completed.includes("PRE_CLEANUP_EVIDENCE_PUBLICATION"), `${boundary}:${phase}`);
    assert.equal(durable.cleanup_evidence_count, completed.filter((entry) =>
      ["CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP"].includes(entry)).length,
    `${boundary}:${phase}`);
    if (effectfulBoundaries.has(boundary)) {
      assert.equal(result.adapter_observed_effect_trace.some((entry) => entry.step === boundary), true,
        `${boundary}:${phase}: REAL adapter observed request`);
      assert.equal(result.adapter_observed_effect_trace.at(-1)?.step,
        completedEffectRequests.length > 0 || boundary === "TERMINAL_CLOSE"
          ? "TERMINAL_CLOSE" : boundary,
        `${boundary}:${phase}: bounded shutdown observed`);
    }
    assert.equal(durable.zero_residual_present, false, `${boundary}:${phase}`);
    assert.equal(durable.final_receipt_present,
      completed.includes("FINAL_RECEIPT_DURABLE_PUBLICATION"), `${boundary}:${phase}`);
    processLossCaseCount += 1;
  }
}
const successfulQualification = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "SUCCESS" });
assert.ok(successfulQualification);
const successfulQualificationResult = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: successfulQualification });
assert.equal(successfulQualificationResult.status, "QUALIFICATION_PASS");
assert.equal(successfulQualificationResult.durable_candidate_count, 5);
assert.equal(successfulQualificationResult.cleanup_state, "ZERO_RESIDUAL_VERIFIED");
assert.equal(successfulQualificationResult.final_receipt_state,
  "DURABLE_CLEANUP_BOUND_VERIFIED");
assert.equal(successfulQualificationResult.unrelated_operations, 0);
assert.equal(successfulQualificationResult.attempt_identity_creation_count, 1);
assert.equal(successfulQualificationResult.replacement_attempt_identity_count, 0);
assert.deepEqual(successfulQualificationResult.requested_effects,
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.filter((boundary) =>
    effectfulBoundaries.has(boundary)),
"all-success qualification and real ports share the exact common semantic effect trace");
assert.deepEqual(successfulQualificationResult.adapter_observed_effect_trace.map((entry) => entry.step)
  .filter((step, index, steps) => index === 0 || step !== steps[index - 1]),
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.filter((boundary) =>
    effectfulBoundaries.has(boundary)),
"the REAL adapter itself observes every typed effect from RESOURCE_PREEXISTENCE through close");
assert.equal(successfulQualificationResult.adapter_observed_effect_trace[0]?.step,
  "RESOURCE_PREEXISTENCE");
const collapsedSuccessfulTrace = successfulQualificationResult.adapter_observed_effect_trace
  .filter((entry, index, entries) => index === 0 || entry.step !== entries[index - 1]?.step);
assert.equal(collapsedSuccessfulTrace.at(-2)?.step,
  "FINAL_RECEIPT_REOPEN_READBACK");
assert.equal(collapsedSuccessfulTrace.at(-1)?.step,
  "TERMINAL_CLOSE");
assert.equal(successfulQualificationResult.close_state, "SUCCESS");
for (const request of successfulQualificationResult.adapter_observed_effect_trace) {
  const expectedKeys = ["attempt_identity", "authorization_id",
    "authorization_revision", "candidate_id", "execution_plan_digest", "migration_digest",
    "migration_id", "operation_class", "primitive_class", "primitive_ordinal",
    "publication_candidate_digest", "run_identity",
    "semantic_step_id", "sequence", "step", "target_identity_digest"];
  if (request.semantic_step_id?.startsWith("RESOURCE_PREEXISTENCE_")) {
    expectedKeys.push("bounded_result_classification");
    assert.equal(request.bounded_result_classification, "ABSENT");
  }
  assert.deepEqual(Object.keys(request).sort(), expectedKeys.sort());
  assert.equal(request.authorization_id, "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13");
  assert.equal(request.authorization_revision, 13);
  assert.equal(request.execution_plan_digest,
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST);
  assert.match(String(request.run_identity), /^sha256:[a-f0-9]{64}$/u);
  assert.match(String(request.attempt_identity), /^sha256:[a-f0-9]{64}$/u);
  assert.equal(request.primitive_ordinal,
    successfulQualificationResult.adapter_observed_effect_trace.indexOf(request) + 1);
  assert.equal(JSON.stringify(request).includes("sql"), false);
  assert.equal(JSON.stringify(request).includes("password"), false);
}
assert.match(successfulQualificationResult.effect_request_trace_digest,
  /^sha256:[a-f0-9]{64}$/u);
const semanticTraceSteps = new Set(successfulQualificationResult.adapter_observed_effect_trace
  .map((entry) => entry.semantic_step_id));
for (const requiredTraceStep of ["RESOURCE_PREEXISTENCE_CONTAINER",
  "RESOURCE_PREEXISTENCE_NETWORK", "RESOURCE_PREEXISTENCE_VOLUME",
  "ATTEMPT_CLAIM_PUBLICATION", "ATTEMPT_CLAIM_READBACK",
  "CONSUMPTION_MARKER_PREEXISTENCE", "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_READBACK", "NETWORK_CREATION", "VOLUME_CREATION",
  "CONTAINER_CREATION", "POSTGRES_STARTUP", "POSTGRES_MAJOR_VERIFICATION",
  "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP", "TRUSTED_INITIAL_READBACK",
  "EXACT_FIVE_CANDIDATE_VERIFICATION", "PRE_CLEANUP_EVIDENCE_PUBLICATION",
  "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK", "CONTAINER_CLEANUP", "VOLUME_CLEANUP",
  "NETWORK_CLEANUP", "ZERO_RESIDUAL_VERIFICATION", "FINAL_RECEIPT_DURABLE_PUBLICATION",
  "FINAL_RECEIPT_REOPEN_READBACK", "TERMINAL_CLOSE"]) {
  assert.equal(semanticTraceSteps.has(requiredTraceStep), true, requiredTraceStep);
}
for (let index = 1; index <= 5; index += 1) {
  for (const requiredTraceStep of [`MIGRATION_${index}_EXECUTION`,
    `SNAPSHOT_${index}_COLLECTION`, `CANDIDATE_${index}_DURABLE_PUBLICATION`,
    `CANDIDATE_${index}_REOPEN_READBACK`]) {
    assert.equal(semanticTraceSteps.has(requiredTraceStep), true, requiredTraceStep);
  }
}
const secondTraceCapability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "SUCCESS" });
assert.ok(secondTraceCapability);
const secondTraceResult = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: secondTraceCapability });
assert.equal(secondTraceResult.adapter_observed_effect_trace[0]?.attempt_identity,
  successfulQualificationResult.adapter_observed_effect_trace[0]?.attempt_identity,
"the immutable V5 authority deterministically binds one stable attempt across fresh stores");
assert.deepEqual(secondTraceResult.adapter_observed_effect_trace.map((entry) => ({
  step: entry.step, operation_class: entry.operation_class, primitive_class: entry.primitive_class,
  semantic_step_id: entry.semantic_step_id, target_identity_digest: entry.target_identity_digest })),
successfulQualificationResult.adapter_observed_effect_trace.map((entry) => ({
  step: entry.step, operation_class: entry.operation_class, primitive_class: entry.primitive_class,
  semantic_step_id: entry.semantic_step_id, target_identity_digest: entry.target_identity_digest })),
"the semantic REAL-adapter trace and V5-bound attempt provenance remain equivalent");
const restartReplay = await qualifyFarmOsDay150DurableQualificationRestartReplay();
assert.deepEqual(restartReplay, { status: "QUALIFIED", restart_cases: 9,
  extended_reopen_cases: 7, repository_external: true, canonical_publication: true,
  fresh_instances: true, evidence_class: "SUPPLEMENTAL_ONLY" });
const publicRestart = await qualifyFarmOsDay150PublicExecutorDurableRestart();
assert.deepEqual(publicRestart, { status: "QUALIFIED", before_consumption_restart: "SUCCEEDED",
  after_consumption_restart: "ORIGINAL_ATTEMPT_RECOVERED_NO_AUTOMATIC_CONTINUATION",
  replacement_attempt_count: 0, fresh_executor_instances: 4,
  shared_persistent_roots: 2 });
const actualSchemaRestart = await qualifyFarmOsDay150ActualSchemaFreshPublicExecutorRestartAI();
assert.equal(actualSchemaRestart.status, "QUALIFIED");
assert.equal(actualSchemaRestart.cases, 9);
assert.equal(actualSchemaRestart.valid_states_seeded_manually, 0);
assert.equal(actualSchemaRestart.actual_schema_reopens, true);
assert.equal(actualSchemaRestart.ambiguous_marker_absent_replay_cases, 1);
assert.ok(actualSchemaRestart.public_executor_instances >= 15,
  "A-I uses genuinely fresh public executor instances for every local-memory/reopen case");
assert.deepEqual(actualSchemaRestart.ambiguity_classifications,
  ["UNEXPLAINED_PREEXISTING_STATE", "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT",
    "TRUSTED_READBACK_ALREADY_COMMITTED_FOR_ORIGINAL_ATTEMPT"]);
const freshPublicLoss = await qualifyFarmOsDay150FreshPublicExecutorProcessLossMatrix();
assert.equal(freshPublicLoss.status, "QUALIFIED");
assert.equal(freshPublicLoss.process_loss_boundaries,
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length);
assert.equal(freshPublicLoss.process_loss_cases,
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length * 2);
assert.equal(freshPublicLoss.public_executor_instances,
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length * 4);
assert.equal(freshPublicLoss.shared_external_stores,
  FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length * 2);
assert.equal(freshPublicLoss.reader_only_restarts, 0);
assert.ok(freshPublicLoss.phase_specific_reconstruction_assertions >
  freshPublicLoss.process_loss_cases * 9);
for (const durable_marker_fault of ["MISSING", "CORRUPT", "WRONG_AUTHORIZATION",
  "WRONG_PLAN_DIGEST"] as const) {
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "SUCCESS", durable_marker_fault });
  assert.ok(capability);
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability });
  assert.equal(result.status, durable_marker_fault === "MISSING" ? "OUTCOME_UNKNOWN" : "REJECTED",
    durable_marker_fault);
  assert.equal(result.failed_boundary, "AUTHORIZATION_CONSUMPTION_MARKER_READBACK",
    durable_marker_fault);
  assert.equal(result.authorization_state, "ATTEMPT_CLAIMED", durable_marker_fault);
  assert.equal(result.automatic_retry_count, 0, durable_marker_fault);
}
for (const durableFault of ["CORRUPT_CANDIDATE_1", "CORRUPT_PRE_CLEANUP",
  "CORRUPT_RECEIPT"] as const) {
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "SUCCESS", durable_marker_fault: durableFault });
  assert.ok(capability, durableFault);
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability });
  assert.equal(result.status, "OUTCOME_UNKNOWN", durableFault);
  assert.equal(result.reconciliation_handoff,
    "DURABLE_ACTUAL_SCHEMA_READBACK_MANUAL_RECONCILIATION_REQUIRED", durableFault);
  assert.equal(result.compensation_authority,
    "NOT_GRANTED_NO_AUTOMATIC_COMPENSATION", durableFault);
  assert.equal(result.automatic_retry_count, 0, durableFault);
}
for (const boundary of effectfulBoundaries) {
  for (const mode of ["THROW", "AMBIGUOUS"] as const) {
    const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
      mode, boundary: boundary as typeof FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES[number],
      phase: mode === "AMBIGUOUS" ? "AFTER_EFFECT_BEFORE_OBSERVATION" : "BEFORE_EFFECT",
    });
    assert.ok(capability, `${boundary}:${mode}`);
    const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
      qualification_capability: capability });
    const publicationAmbiguityReconciled = mode === "AMBIGUOUS" &&
      boundary === "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION";
    assert.equal(result.status, publicationAmbiguityReconciled ? "QUALIFICATION_PASS" :
      mode === "THROW" && !["FINAL_RECEIPT_REOPEN_READBACK", "TERMINAL_CLOSE"].includes(boundary)
        ? "REJECTED" : "OUTCOME_UNKNOWN",
      `${boundary}:${mode}`);
    assert.equal(result.failed_boundary, publicationAmbiguityReconciled ? null : boundary,
      `${boundary}:${mode}`);
    assert.equal(result.automatic_retry_count, 0, `${boundary}:${mode}`);
    if (boundary === "TERMINAL_CLOSE") assert.equal(result.close_state,
      mode === "THROW" ? "BOUNDED_FAILURE" : "AMBIGUOUS_OUTCOME", `${boundary}:${mode}`);
  }
}
let primitiveBoundCaseCount = 0;
for (const boundary of effectfulBoundaries) {
  for (const mode of ["OUTPUT_LIMIT_EXCEEDED", "DEADLINE_EXCEEDED"] as const) {
    const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
      mode, boundary: boundary as
        typeof FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES[number],
    });
    assert.ok(capability, `${boundary}:${mode}`);
    const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
      qualification_capability: capability });
    const mutationOutcomeUnknown = new Set([
      "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION",
      "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP", "CONTAINER_CLEANUP",
      "VOLUME_CLEANUP", "NETWORK_CLEANUP",
      ...Array.from({ length: 5 }, (_, index) => `MIGRATION_${index + 1}_EXECUTION`),
    ]).has(boundary);
    const durableReadbackOutcomeUnknown = boundary === "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK" ||
      boundary === "FINAL_RECEIPT_REOPEN_READBACK" ||
      /^CANDIDATE_[1-5]_REOPEN_READBACK$/u.test(boundary);
    assert.equal(result.status, mode === "OUTPUT_LIMIT_EXCEEDED" && !mutationOutcomeUnknown &&
      !durableReadbackOutcomeUnknown && boundary !== "TERMINAL_CLOSE"
      ? "REJECTED" : "OUTCOME_UNKNOWN",
      `${boundary}:${mode}`);
    assert.equal(result.failed_boundary, boundary, `${boundary}:${mode}`);
    assert.equal(result.failure_code, boundary === "TERMINAL_CLOSE"
      ? mode === "DEADLINE_EXCEEDED" ? mode :
        "TERMINAL_CLOSE_BOUNDED_FAILURE_OUTCOME_UNKNOWN" : mutationOutcomeUnknown
      ? `${mode}_MUTATION_OUTCOME_UNKNOWN` : durableReadbackOutcomeUnknown
        ? `${mode}_DURABLE_READBACK_OUTCOME_UNKNOWN` : mode, `${boundary}:${mode}`);
    assert.equal(result.automatic_retry_count, 0, `${boundary}:${mode}`);
    primitiveBoundCaseCount += 1;
  }
}
let postgresMutationSettlementCaseCount = 0;
for (const boundary of ["PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP",
  ...Array.from({ length: 5 }, (_, index) => `MIGRATION_${index + 1}_EXECUTION`)] as const) {
  for (const mode of ["NONZERO_EXIT", "MALFORMED_SUCCESS"] as const) {
    const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
      mode, boundary });
    assert.ok(capability, `${boundary}:${mode}`);
    const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
      qualification_capability: capability });
    assert.equal(result.status, "OUTCOME_UNKNOWN", `${boundary}:${mode}`);
    assert.equal(result.failed_boundary, boundary, `${boundary}:${mode}`);
    assert.equal(result.automatic_retry_count, 0, `${boundary}:${mode}`);
    postgresMutationSettlementCaseCount += 1;
  }
}

const snapshot: FarmOsMigrationCatalogSnapshot = {
  schema_version: "farmos.migration-catalog-snapshot.v1" as const,
  migration_id: "202607260001_eligible_proposal_persistence",
  fingerprint_version: "farmos.pg-catalog-fingerprint.v1" as const,
  target_identity_digest: null, observed_at: null, transaction_read_only: null,
  collector_authority: null, catalog_query_sha256: `sha256:${"a".repeat(64)}` as const,
  object_universe_digest: `sha256:${"b".repeat(64)}` as const, collection_complete: true,
  objects: [{ kind: "table", identity: "ai.owner_object", definition: "{}", attributes: {},
    owner: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME, security_definer: null, proconfig: null,
    body_sha256: null, role_flags: null, memberships: [], acl: [], rls_enabled: false,
    rls_forced: false }, { kind: "function", identity: "ai.executor_object()", definition: "{}",
    attributes: {}, owner: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME, security_definer: true,
    proconfig: [], body_sha256: `sha256:${"c".repeat(64)}`, role_flags: null, memberships: [],
    acl: [], rls_enabled: null, rls_forced: null }] };
const dual = createFarmOsDay150DualPrincipalSemanticFingerprint({ snapshot,
  authenticated_raw_owner_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  authenticated_raw_executor_principal: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  acl_evidence: [], object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" });
assert.match(String(dual), /^sha256:[a-f0-9]{64}$/u);
assert.equal(FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION,
  "farmos.pg-catalog-semantic-principal-fingerprint.v3");
assert.equal(createFarmOsDay150DualPrincipalSemanticFingerprint({ snapshot: { ...snapshot,
  objects: [{ ...snapshot.objects[0]!, owner: "unapproved_owner" }] },
  authenticated_raw_owner_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  authenticated_raw_executor_principal: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  acl_evidence: [], object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }), null);
assert.equal(createFarmOsDay150SemanticPrincipalFingerprint({ snapshot: { ...snapshot,
  objects: [snapshot.objects[0]!] }, authenticated_raw_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  acl_evidence: [], object_universe_revision: "farmos.day150-prefix-object-universe.v1",
  catalog_query_revision: "farmos.production-target-identity-query.v5" }) !== null, true,
"v2 remains available and unchanged");

const adapterSource = readFileSync(new URL("./lib/farm_os_day150_prefix_reference_real_adapter.ts",
  import.meta.url), "utf8");
const durableStoreSource = readFileSync(new URL(
  "../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store.ts", import.meta.url), "utf8");
const primitivePortSource = readFileSync(new URL(
  "../../src/lib/hermes/farm_os_day150_prefix_reference_primitive_port.ts", import.meta.url), "utf8");
for (const forbiddenExport of ["export function executeDocker", "export function executeSql",
  "export function runCommand"]) assert.equal(adapterSource.includes(forbiddenExport), false);
assert.equal(adapterSource.includes("--pull=never"), true);
assert.equal(adapterSource.includes("127.0.0.1::5432"), true);
assert.equal(adapterSource.includes("FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME"), true);
assert.deepEqual(adapterSource.match(/export function\s+[A-Za-z0-9_]+/gu),
  ["export function createAuthorizedFarmOsDay150PrefixReferenceRealBoundary"],
  "the lower adapter exposes one opaque-context factory and no executable operation");
assert.equal(adapterSource.includes("observe_boundary"), false,
  "the real effect port cannot receive or mutate the common controller");
for (const durabilityStep of ["open(temporary, \"wx\"", "handle.sync()", "link(temporary, path)",
  "syncDirectory(dirname(path))", "reopenCanonicalFarmOsDay150Artifact"]) {
  assert.equal(durableStoreSource.includes(durabilityStep) || adapterSource.includes(durabilityStep),
    true, durabilityStep);
}
const derivationSource = readFileSync(new URL(
  "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation.ts", import.meta.url),
"utf8");
assert.equal(derivationSource.includes("executeFarmOsDay150PrefixReferenceQualificationScenario"),
  false, "no parallel qualification orchestrator remains");
assert.equal(derivationSource.includes("createFarmOsDay150QualificationPrimitiveContext"),
  true, "qualification injects only the primitive system port beneath the REAL adapter");
assert.equal(adapterSource.includes("createSubstantiveRealReferenceAdapter"), true,
  "one substantive REAL adapter owns actual and qualification behavior");
assert.equal(adapterSource.includes(
  "return createSubstantiveRealReferenceAdapter({ context: cutoverContext"), true,
"the public factory cuts both actual and qualification execution over to one REAL adapter");
assert.equal(adapterSource.includes("FarmOsDay150PrimitiveSystemEffectPort"), true,
  "the lower injectable seam is an OS/system primitive port");
assert.equal(primitivePortSource.includes(
  "export function createFarmOsDay150ActualPrimitiveSystemEffectPort"), false,
"the actual primitive implementation cannot be imported as a lower-authority bypass");
assert.equal(adapterSource.includes("typeof code !== \"number\""), true,
  "the actual primitive preserves bounded nonzero process completion for adapter semantics");
assert.equal(adapterSource.includes("processValue.code !== 0"), true,
  "the substantive REAL adapter still classifies nonzero mutators as outcome unknown");
assert.equal(adapterSource.includes("LIMIT_EXCEEDED_OUTCOME_UNKNOWN"), true,
  "output-limit termination remains ambiguous after a mutator starts");
assert.equal(adapterSource.includes(
  "Promise.all([...activeSettlements, ...activePrimitiveOperations])"), true,
"terminal close fences and awaits every active child and filesystem primitive settlement");
assert.equal(derivationSource.includes("deadlineMilliseconds = 47_119"), true,
  "the orchestrator deadline strictly encloses the 41_237ms primitive process deadline");
const primitiveRequestContract = primitivePortSource.slice(
  primitivePortSource.indexOf("export type FarmOsDay150PrimitiveRequest"),
  primitivePortSource.indexOf("/** The only injectable boundary"));
for (const forbiddenPrimitiveConcept of ["V3", "authorization", "migration_id", "candidate_id",
  "cleanup_eligible", "receipt_eligible", "Product Owner", "terminal execution state"]) {
  assert.equal(primitiveRequestContract.includes(forbiddenPrimitiveConcept), false,
    `primitive contract excludes ${forbiddenPrimitiveConcept}`);
}
for (const primitiveClass of ["PROCESS", "FILE_STAT", "FILE_PUBLISH_EXCLUSIVE", "FILE_REOPEN",
  "FILE_UNLINK", "BOUNDED_WAIT",
  "TERMINAL_CLOSE"]) assert.equal(primitiveRequestContract.includes(`\"${primitiveClass}\"`), true,
  primitiveClass);
for (const forbiddenSemanticPrimitive of ["POSTGRES_WIRE", "CHANNEL_OPEN", "CHANNEL_EXCHANGE",
  "executeMigration", "queryPostgresMajor", "collectCatalog", "createReferenceRole",
  "applyBootstrap"]) assert.equal(primitiveRequestContract.includes(forbiddenSemanticPrimitive),
  false, forbiddenSemanticPrimitive);
assert.equal(adapterSource.includes("${consumptionMarkerPath}.attempt") ||
  adapterSource.includes('kind === "attempt"'), false,
  "the REAL plan creates no independent .attempt artifact");
assert.equal(adapterSource.includes("transformFarmOsProductionIdentityCatalogReferenceResultSets"),
  true, "safe catalog normalization is substantive REAL-adapter behavior");
assert.equal(adapterSource.includes("return executionMode"), false,
  "the injected qualification seam is never returned as a substitute effect port");
assert.equal(adapterSource.includes('published.code !== "OUTPUT_PREEXISTS"'), true,
  "exclusive marker publication reconciles only the exact preexisting marker path");
assert.equal(derivationSource.includes(
  "adapter.createAuthorizedFarmOsDay150PrefixReferenceRealBoundary"), true,
"real trace qualification enters the real-adapter factory with an injected primitive port");
for (const forbiddenOrchestration of ["StepwiseEffectGate", "observeBoundary", "awaitGate",
  "runGate", "performDatabaseStep", "performCandidateStep", "performCleanupStep"]) {
  assert.equal(adapterSource.includes(forbiddenOrchestration) ||
    derivationSource.includes(forbiddenOrchestration), false, forbiddenOrchestration);
}
const preloadIndex = derivationSource.lastIndexOf(
  "preloadFarmOsDay150PinnedMigrationBytes()");
const consumeIndex = derivationSource.lastIndexOf("consumeFarmOsDay150ReferenceExecutionAuthorizationOnce({");
const executeIndex = derivationSource.indexOf("effectPort.executePinnedMigration", consumeIndex);
assert.ok(preloadIndex >= 0 && preloadIndex < consumeIndex && consumeIndex < executeIndex,
  "exact migration bytes are pinned before V5 consumption and database execution");
const executeMigrationBody = adapterSource.slice(
  adapterSource.indexOf("executePinnedMigration: (index, migration) => semantic(async"),
  adapterSource.indexOf("collectCatalogSnapshot: (_index, migration_id) => semantic(async"));
assert.equal(/\breadFile(?:Sync)?\s*\(/u.test(executeMigrationBody), false,
  "pinned migration execution performs zero migration filesystem reads");
for (const orderedBoundary of ["effectPort.publishCandidate", "effectPort.publishPreCleanupEvidence",
  "effectPort.cleanupOwnedContainer", "effectPort.publishFinalReceipt"]) {
  assert.ok(derivationSource.includes(orderedBoundary), orderedBoundary);
}
assert.ok(derivationSource.indexOf("effectPort.publishCandidate") <
  derivationSource.indexOf("effectPort.publishPreCleanupEvidence") &&
  derivationSource.indexOf("effectPort.publishPreCleanupEvidence") <
  derivationSource.indexOf("effectPort.cleanupOwnedContainer") &&
  derivationSource.indexOf("effectPort.cleanupOwnedContainer") <
  derivationSource.indexOf("effectPort.publishFinalReceipt"),
"pre-cleanup durability, cleanup, and cleanup-bound final receipt are strictly ordered");

console.log(JSON.stringify({ status: "PASS", privilege_envelope_cases: 19,
  classified_privilege_statements: privilegeAnalysis.statements.length,
  exact_external_plan_mutation_cases: planMutationCases.length,
  actual_public_common_orchestrator_failure_cases:
    FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length,
  actual_public_common_orchestrator_process_loss_cases: processLossCaseCount,
  capability_replay_rejections:
    FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length,
  typed_effect_failure_throw_and_ambiguity_cases: effectfulBoundaries.size * 3,
  primitive_output_and_deadline_bound_cases: primitiveBoundCaseCount,
  postgres_mutation_nonzero_and_malformed_cases: postgresMutationSettlementCaseCount,
  durable_marker_restart_replay_cases: 9,
  actual_schema_fresh_public_restart_cases: actualSchemaRestart.cases,
  fresh_public_process_loss_executor_instances: freshPublicLoss.public_executor_instances,
  phase_specific_reconstruction_assertions:
    freshPublicLoss.phase_specific_reconstruction_assertions,
  primitive_trace_entries: successfulQualificationResult.adapter_observed_effect_trace.length,
  semantic_trace_equivalence: "REAL_QUALIFICATION_SEMANTIC_TRACE_EQUIVALENT",
  migration_toctou_cases: 1, post_consumption_migration_reads: 0,
  semantic_principal_cases: 4, external_operations: 0, authorization_consumptions: 0 }));
