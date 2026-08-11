import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  validateFarmOsProductionTargetExecutionApprovalLineage,
  validateFarmOsProductionTargetExecutionApprovalRevocationEvent,
} from "../../src/lib/hermes/farm_os_production_target_execution_approval_authority";
import { validateFarmOsProductionTargetExecutionCommand } from
  "../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import { parseFarmOsProductionTargetExecutionLifecycleRecord } from
  "../../src/lib/hermes/farm_os_production_target_execution_lifecycle";
import { validateFarmOsProductionTargetExecutionReceipt } from
  "../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";
import { parseFarmOsProductionTargetExecutionClockEvidence } from
  "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";

import {
  FARM_OS_PTE_C2A_SOURCE_COMMIT,
  FARM_OS_PTE_C2B_AUTHORIZATION_AUTHORITY,
  FARM_OS_PTE_C2B_AUTHORIZATION_OPERATION,
  FARM_OS_PTE_C2B_AUTHORIZATION_VERSION,
  FARM_OS_PTE_C2B_CASE_REGISTRY,
  FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY,
  FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
  FARM_OS_PTE_C2B_CONTRACT,
  FARM_OS_PTE_C2B_EVIDENCE_VERSION,
  FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY,
  FARM_OS_PTE_C2B_FAULT_POINTS,
  FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY,
  FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST,
  FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
  FARM_OS_PTE_C2B_RECEIPT_VERSION,
  buildFarmOsPteC2bEvidenceRelativePath,
  computeFarmOsPteC2bAuthorizationDigest,
  createFarmOsPteC2bCommitMarkerCandidate,
  createFarmOsPteC2bReceiptCandidateFromEvidence,
  deriveFarmOsPteC2bOwnedResources,
  digestFarmOsPteC2b,
  parseFarmOsPteC2bAuthorizationEnvelopeSyntax,
  parseFarmOsPteC2bCommitMarkerSyntax,
  parseFarmOsPteC2bEvidence,
  parseFarmOsPteC2bImageAuthority,
  parseFarmOsPteC2bReceiptSyntax,
  validateFarmOsPteC2bAcceptedQualificationChain,
  validateFarmOsPteC2bReceiptAgainstEvidence,
  type FarmOsPteC2bAuthorizationEnvelope,
  type FarmOsPteC2bCaseCategory,
  type FarmOsPteC2bCaseResult,
  type FarmOsPteC2bEvidence,
} from "./lib/farm_os_production_target_execution_postgres_qualification_contract";
import {
  FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL,
  FARM_OS_PTE_C2B_MIGRATION_HISTORY_ENTRY,
  FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE,
  createFarmOsPteC2bFixtureCredential,
} from "./lib/farm_os_production_target_execution_postgres_qualification_fixture";
import {
  FARM_OS_PTE_C2B_DOCKER_OPERATION_ALLOWLIST,
  buildFarmOsPteC2bDockerPlan,
  buildFarmOsPteC2bOwnedCleanupPlan,
  createFarmOsPteC2bFailClosedRealDockerBoundary,
  executeFarmOsPteC2bOwnedCleanupPlan,
  projectFarmOsPteC2bContainerInspect,
  projectFarmOsPteC2bNetworkInspect,
  projectFarmOsPteC2bVolumeInspect,
  validateFarmOsPteC2bRealExecutionCapability,
  validateFarmOsPteC2bDockerCommand,
} from "./lib/farm_os_production_target_execution_postgres_qualification_docker_adapter";
import {
  FARM_OS_PTE_C2B_EXECUTION_POLICY,
  FARM_OS_PTE_C2B_MIGRATION_PLAN,
  createFarmOsPteC2bSourceValidationIdentity,
  executeFarmOsPteC2bQualification,
  validateFarmOsPteC2bSourceWithFakeAdapter,
  type FarmOsPteC2bQualificationAdapter,
} from "./lib/farm_os_production_target_execution_postgres_qualification_executor";
import { parseFarmOsPteC2bQualificationCli } from
  "./run_farm_os_production_target_execution_postgres_qualification";
import { FARM_OS_DAY150_PHASE_C2B_ISOLATED_POSTGRES_ENTRY } from
  "./test_farm_os_day150_phase_c2b_isolated_postgres";

const NONCE = "0123456789abcdef01234567";
const SOURCE_COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPO_DIGEST = `sha256:${"a".repeat(64)}` as const;
const IMAGE_ID = `sha256:${"b".repeat(64)}` as const;
const runtimeReference = `docker.io/library/postgres@${REPO_DIGEST}` as const;
const image = parseFarmOsPteC2bImageAuthority({ repository: FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
  repository_digest: REPO_DIGEST, runtime_reference: runtimeReference });
assert.ok(image);

assert.equal(FARM_OS_PTE_C2A_SOURCE_COMMIT,
  "19889a78ae3a7d751c51f9b412f63c78bfc83a78");
assert.equal(FARM_OS_PTE_C2B_MIGRATION_PLAN.migration_id,
  "202608110001_production_target_execution_durability");
assert.equal(FARM_OS_PTE_C2B_MIGRATION_PLAN.apply_sha256,
  "sha256:f97eca5134c44c5a144523ea19b44b679051f3592f9fd28dbf38c441be7b8131");
assert.equal(FARM_OS_PTE_C2B_MIGRATION_PLAN.verify_sha256,
  "sha256:f5294d29b6407d6ed789e2c229c394e62be09b0d31407065d99ca620e2473036");
assert.equal(FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY,
  "farmos.production-target-execution-postgres-qualification-case-registry.v1");
assert.equal(FARM_OS_PTE_C2B_EVIDENCE_VERSION,
  "farmos.production-target-execution-postgres-isolated-qualification-evidence.v2");
assert.equal(FARM_OS_PTE_C2B_CASE_REGISTRY.length, 66);
assert.match(FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST, /^sha256:[a-f0-9]{64}$/u);
assert.equal(FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST, digestFarmOsPteC2b(
  FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY, FARM_OS_PTE_C2B_CASE_REGISTRY));
assert.equal(FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST, digestFarmOsPteC2b(
  FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY, FARM_OS_PTE_C2B_FAULT_POINTS));

const expectedCounts: Readonly<Record<FarmOsPteC2bCaseCategory, number>> = Object.freeze({
  MIG: 8, GRD: 5, SOT: 9, RSV: 4, REV: 2, ATT: 1, TERM: 5, CLK: 4,
  "FLT-RSV": 5, "FLT-ATT": 3, "FLT-FIN": 3, "FLT-RCP": 1,
  RST: 9, CLN: 4, SAF: 3,
});
const counts = Object.fromEntries(Object.keys(expectedCounts).map((key) => [key, 0])) as
  Record<FarmOsPteC2bCaseCategory, number>;
const seen = new Set<string>();
for (const definition of FARM_OS_PTE_C2B_CASE_REGISTRY) {
  assert.equal(seen.has(definition[0]), false);
  seen.add(definition[0]);
  counts[definition[1]] += 1;
  assert.match(definition[0], /^(?:MIG|GRD|SOT|RSV|REV|ATT|TERM|CLK|FLT-RSV|FLT-ATT|FLT-FIN|FLT-RCP|RST|CLN|SAF)-\d{3}$/u);
  assert.match(definition[2], /^[A-Z][A-Z0-9_]+$/u);
  assert.ok(definition[3] === null || definition[3] === 0 || definition[3] === 1);
}
assert.deepEqual(counts, expectedCounts);

for (const invalid of [
  "postgres:17", "postgres:latest", "postgres:17-alpine",
  `postgres@${REPO_DIGEST}`, `docker.io/library/postgres:${REPO_DIGEST}`,
  `docker.io/private/postgres@${REPO_DIGEST}`,
]) {
  assert.equal(parseFarmOsPteC2bImageAuthority({ repository: FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
    repository_digest: REPO_DIGEST, runtime_reference: invalid }), null);
}

const resources = deriveFarmOsPteC2bOwnedResources(NONCE);
assert.ok(resources);
assert.equal(resources.container_name, `farmos-pte-c2b-pg17-${NONCE}`);
assert.equal(resources.ownership_label, `farmos.day150.phase-c2b=${NONCE}`);
assert.equal(buildFarmOsPteC2bEvidenceRelativePath(NONCE),
  `reports/day150-phase-c2b-isolated-postgres/runs/${NONCE}/evidence.json`);
for (const invalid of ["../escape", "/absolute", "A".repeat(24), "0".repeat(23)]) {
  assert.equal(deriveFarmOsPteC2bOwnedResources(invalid), null);
  assert.equal(buildFarmOsPteC2bEvidenceRelativePath(invalid), null);
}

const credential = createFarmOsPteC2bFixtureCredential("c".repeat(64));
assert.ok(credential);
const dockerPlan = buildFarmOsPteC2bDockerPlan({ image, resources, credential });
assert.ok(dockerPlan);
for (const planned of Object.values(dockerPlan)) {
  assert.equal(validateFarmOsPteC2bDockerCommand(planned), true);
  assert.equal(planned.argv.includes("pull"), false);
  assert.equal(planned.argv.includes("--privileged"), false);
  assert.equal(planned.argv.includes("/bin/sh"), false);
}
assert.ok(dockerPlan.run_container.argv.includes("--pull=never"));
assert.ok(dockerPlan.run_container.argv.includes("--restart=no"));
assert.ok(dockerPlan.run_container.argv.includes("127.0.0.1::5432"));
assert.equal(dockerPlan.run_container.argv.at(-1), runtimeReference);
assert.deepEqual(Object.keys(dockerPlan.run_container.environment).sort(),
  ["PATH", "POSTGRES_DB", "POSTGRES_PASSWORD", "POSTGRES_USER"]);
assert.equal(validateFarmOsPteC2bDockerCommand({ ...dockerPlan.run_container,
  argv: [...dockerPlan.run_container.argv.slice(0, -1), "--privileged",
    dockerPlan.run_container.argv.at(-1) ?? ""] }), false);
const ownershipLabels = { "farmos.day150.phase-c2b": NONCE };
const secretPassword = `c2b_${"f".repeat(64)}`;
const containerRawInspect = JSON.stringify([{
  Id: "d".repeat(64), Name: `/${resources.container_name}`,
  Image: `sha256:${"e".repeat(64)}`,
  Config: { Labels: ownershipLabels, Env: [
    `POSTGRES_PASSWORD=${secretPassword}`, "POSTGRES_USER=farmos_pte_c2b_owner",
    "POSTGRES_DB=farmos_pte_c2b",
  ], UnknownNested: { token_fixture_not_real: "Bearer synthetic" } },
  State: { Status: "running", Running: true },
  NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "49152" }] } },
  HostConfig: { Binds: ["should-not-project"] }, Mounts: [{ Source: "should-not-project" }],
}]);
const networkRawInspect = JSON.stringify([{ Id: "a".repeat(64),
  Name: resources.network_name, Internal: true, Labels: ownershipLabels,
  UnknownNested: { password: secretPassword } }]);
const volumeRawInspect = JSON.stringify([{ Name: resources.volume_name,
  Labels: ownershipLabels, Mountpoint: `/private/${secretPassword}`,
  UnknownNested: { service_role: "synthetic" } }]);
const containerProjection = projectFarmOsPteC2bContainerInspect(containerRawInspect);
const networkProjection = projectFarmOsPteC2bNetworkInspect(networkRawInspect);
const volumeProjection = projectFarmOsPteC2bVolumeInspect(volumeRawInspect);
assert.ok(containerProjection);
assert.ok(networkProjection);
assert.ok(volumeProjection);
for (const projection of [containerProjection, networkProjection, volumeProjection]) {
  assert.doesNotMatch(JSON.stringify(projection),
    /POSTGRES_PASSWORD|c2b_[a-f0-9]{64}|service_role|Bearer|token_fixture/iu);
}
assert.equal(Object.hasOwn(containerProjection, "Config"), false);
const notCreated = { state: "NOT_CREATED" as const, projection: null };
const ownedContainer = { state: "CREATED_OWNED" as const, projection: containerProjection };
const ownedVolume = { state: "CREATED_OWNED" as const, projection: volumeProjection };
const ownedNetwork = { state: "CREATED_OWNED" as const, projection: networkProjection };
const allCleanup = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: ownedContainer, volume: ownedVolume, network: ownedNetwork });
assert.equal(allCleanup?.blocked, false);
assert.equal(allCleanup?.commands.length, 4);
const cleanupAttempts: readonly string[][] = [];
let cleanupAttemptIndex = 0;
const continuedCleanup = await executeFarmOsPteC2bOwnedCleanupPlan(allCleanup!, {
  async execute(cleanupCommand) {
    (cleanupAttempts as string[][]).push([...cleanupCommand.argv]);
    cleanupAttemptIndex += 1;
    return Object.freeze({ exit_code: cleanupAttemptIndex === 1 ? 1 : 0,
      projection: null, created_identity: null,
      failure: cleanupAttemptIndex === 1 ? "FAILED" as const : "NONE" as const });
  },
});
assert.deepEqual(continuedCleanup,
  { attempted: 4, failed: 1, completed_all_safe_commands: true });
assert.equal(cleanupAttempts.length, 4);
const networkOnlyCleanup = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: notCreated, volume: notCreated, network: ownedNetwork });
assert.deepEqual(networkOnlyCleanup?.commands.map((entry) => entry.argv.slice(2, 4)),
  [["network", "rm"]]);
const volumeAndNetworkCleanup = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: notCreated, volume: ownedVolume, network: ownedNetwork });
assert.deepEqual(volumeAndNetworkCleanup?.commands.map((entry) => entry.argv.slice(2, 4)),
  [["volume", "rm"], ["network", "rm"]]);
const volumeOnlyCleanup = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: notCreated, volume: ownedVolume, network: notCreated });
assert.equal(volumeOnlyCleanup?.commands.length, 1);
const unownedCollision = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: notCreated, volume: { state: "CREATED_UNOWNED_COLLISION", projection: null },
  network: notCreated });
assert.equal(unownedCollision?.blocked, true);
assert.equal(unownedCollision?.commands.length, 0);
const unownedNetworkCollision = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: notCreated, volume: notCreated,
  network: { state: "CREATED_UNOWNED_COLLISION", projection: null } });
assert.equal(unownedNetworkCollision?.blocked, true);
assert.equal(unownedNetworkCollision?.commands.length, 0);
const unknownOwnership = buildFarmOsPteC2bOwnedCleanupPlan({ resources,
  container: notCreated, volume: notCreated, network: { state: "UNKNOWN", projection: null } });
assert.equal(unknownOwnership?.blocked, true);
assert.equal(unknownOwnership?.commands.length, 0);
for (const forbidden of ["prune", "system prune", "volume prune", "network prune",
  "container prune", "pull postgres:17", "exec arbitrary-shell"]) {
  assert.equal(FARM_OS_PTE_C2B_DOCKER_OPERATION_ALLOWLIST.some((entry) =>
    entry.includes(forbidden)), false);
}

assert.equal(FARM_OS_PTE_C2B_MIGRATION_PLAN.migration_selection, "EXACT_ONLY");
assert.equal(FARM_OS_PTE_C2B_MIGRATION_PLAN.auto_migration, false);
assert.equal(FARM_OS_PTE_C2B_MIGRATION_PLAN.verify_mode, "READ_ONLY");
assert.equal(FARM_OS_PTE_C2B_EXECUTION_POLICY.automatic_retry, 0);
assert.equal(FARM_OS_PTE_C2B_EXECUTION_POLICY.ipc_socket_count, 0);
assert.equal(FARM_OS_PTE_C2B_CONTRACT.source_state,
  "QUALIFICATION_SOURCE_ARTIFACT_CREATED_CANDIDATE");
for (const state of ["isolated_migration_qualified", "durable_approval_sot_established",
  "durable_reservation_finalization_established", "storage_backed_concurrency_tested",
  "storage_backed_crash_semantics_tested", "storage_backed_restart_tested",
  "trusted_clock_established", "gate_2_authorized", "runtime_bound",
  "production_authorized"] as const) assert.equal(FARM_OS_PTE_C2B_CONTRACT[state], false);

assert.equal(FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.production_data_count, 0);
assert.equal(JSON.stringify(FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE).includes("supabase"), false);
assert.equal(parseFarmOsProductionTargetExecutionClockEvidence(
  FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.clock_evidence).accepted, true);
const fixtureClockFloor = FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.clock_evidence.observed_lower_bound;
assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
  proposal: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.proposal,
  approval: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.approval,
  approval_receipt: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.approval_receipt,
  clock_evidence: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.clock_evidence,
  persisted_clock_lower_bound: fixtureClockFloor,
}).accepted, true);
assert.equal(validateFarmOsProductionTargetExecutionApprovalRevocationEvent({
  event: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.revocation_event,
  approval: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.approval,
  approval_receipt: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.approval_receipt,
  clock_evidence: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.clock_evidence,
  persisted_clock_lower_bound: fixtureClockFloor,
}).accepted, true);
assert.equal(validateFarmOsProductionTargetExecutionCommand({
  command: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.command,
  proposal: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.proposal,
  approval: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.approval,
  approval_receipt: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.approval_receipt,
  clock_evidence: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.clock_evidence,
  persisted_clock_lower_bound: fixtureClockFloor,
}).accepted, true);
assert.equal(parseFarmOsProductionTargetExecutionLifecycleRecord(
  FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.lifecycle).accepted, true);
assert.equal(validateFarmOsProductionTargetExecutionReceipt({
  receipt: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.receipt,
  command: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.command,
  clock_evidence: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE.clock_evidence,
  persisted_clock_lower_bound: fixtureClockFloor,
}).accepted, true);
assert.equal(FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL.length, 3);
assert.equal(FARM_OS_PTE_C2B_MIGRATION_HISTORY_ENTRY.migration_id,
  FARM_OS_PTE_C2B_MIGRATION_PLAN.migration_id);
assert.equal(FARM_OS_PTE_C2B_MIGRATION_HISTORY_ENTRY.checksum,
  FARM_OS_PTE_C2B_MIGRATION_PLAN.apply_sha256);

const caseResults = Object.freeze(FARM_OS_PTE_C2B_CASE_REGISTRY.map((definition) =>
  Object.freeze({ case_id: definition[0], status: "PASS" as const,
    actual_result: definition[2], winner_count: definition[3],
    authoritative_row_count: definition[3],
    loser_results: Object.freeze(definition[4].length === 0 ? [] : [definition[4][0]]) })));
const cleanup = Object.freeze({ resources: Object.freeze([
  Object.freeze({ resource_type: "CONTAINER" as const,
    expected_name: resources.container_name, observed_identity: "d".repeat(64),
    state: "REMOVED" as const }),
  Object.freeze({ resource_type: "VOLUME" as const,
    expected_name: resources.volume_name, observed_identity: resources.volume_name,
    state: "REMOVED" as const }),
  Object.freeze({ resource_type: "NETWORK" as const,
    expected_name: resources.network_name, observed_identity: "a".repeat(64),
    state: "REMOVED" as const }),
]), owned_resources_created: 3, owned_resources_removed: 3,
  failed_removals: 0, residual_owned_count: 0, unrelated_touched_count: 0 as const,
  result: "PASS" as const });
const containerRemovalFailedCleanup = Object.freeze({ ...cleanup,
  resources: Object.freeze(cleanup.resources.map((entry) => entry.resource_type === "CONTAINER"
    ? Object.freeze({ ...entry, state: "REMOVE_FAILED" as const }) : entry)),
  owned_resources_removed: 2, failed_removals: 1, residual_owned_count: 1,
  result: "FAIL" as const });
const identityDigest = (label: string) => digestFarmOsPteC2b(`fixture.${label}`, label);
const authorizationMaterial = Object.freeze({
  schema_version: FARM_OS_PTE_C2B_AUTHORIZATION_VERSION,
  authorization_authority: FARM_OS_PTE_C2B_AUTHORIZATION_AUTHORITY,
  authorization_authority_revision: 1 as const,
  operation: FARM_OS_PTE_C2B_AUTHORIZATION_OPERATION,
  execution_nonce: NONCE,
  c2a_source_commit: FARM_OS_PTE_C2A_SOURCE_COMMIT,
  expected_c2b_source_commit: SOURCE_COMMIT,
  image_repository: FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
  image_repository_digest: REPO_DIGEST,
  case_registry_authority: FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY,
  case_registry_digest: FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
  fault_registry_authority: FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY,
  fault_registry_digest: FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST,
  migration_id: FARM_OS_PTE_C2B_MIGRATION_PLAN.migration_id,
  apply_sha256: FARM_OS_PTE_C2B_MIGRATION_PLAN.apply_sha256,
  verify_sha256: FARM_OS_PTE_C2B_MIGRATION_PLAN.verify_sha256,
  issued_at: "2026-08-10T23:59:00.000Z",
  expires_at: "2026-08-11T01:00:00.000Z",
  human_approval_reference_digest: identityDigest("human-approval"),
});
const authorization: FarmOsPteC2bAuthorizationEnvelope = Object.freeze({
  ...authorizationMaterial,
  authorization_digest: computeFarmOsPteC2bAuthorizationDigest(authorizationMaterial),
});
assert.ok(parseFarmOsPteC2bAuthorizationEnvelopeSyntax(authorization));
const evidence: FarmOsPteC2bEvidence = Object.freeze({
  schema_version: FARM_OS_PTE_C2B_EVIDENCE_VERSION,
  executor_authority: FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY,
  case_registry_authority: FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY,
  case_registry_digest: FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
  fault_registry_authority: FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY,
  fault_registry_digest: FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST,
  qualification_mode: "ISOLATED_POSTGRES_QUALIFICATION",
  execution_nonce: NONCE,
  c2a_source_commit: FARM_OS_PTE_C2A_SOURCE_COMMIT,
  expected_c2b_source_commit: SOURCE_COMMIT,
  observed_c2b_source_commit: SOURCE_COMMIT,
  authorization_digest: authorization.authorization_digest,
  migration_id: FARM_OS_PTE_C2B_MIGRATION_PLAN.migration_id,
  apply_sha256: FARM_OS_PTE_C2B_MIGRATION_PLAN.apply_sha256,
  verify_sha256: FARM_OS_PTE_C2B_MIGRATION_PLAN.verify_sha256,
  image_repository: FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
  approved_repository_digest: REPO_DIGEST,
  observed_image_id: IMAGE_ID,
  platform: "linux/amd64",
  server_version_num: 170010,
  server_version: "PostgreSQL 17.10 synthetic source validation",
  container_identity_digest: identityDigest("container"),
  network_identity_digest: identityDigest("network"),
  volume_identity_digest: identityDigest("volume"),
  database_identity_digest: identityDigest("database"),
  case_results: caseResults,
  cleanup,
  residual_resource_count: 0,
  production_operations: 0,
  external_network_operations: 0,
  automatic_retry_count: 0,
  fault_model: "APPLICATION_OBSERVATION_BOUNDARY_AND_CONTAINER_CRASH_BOUNDARY",
  started_at_metadata: "2026-08-11T00:00:00.000Z",
  ended_at_metadata: "2026-08-11T00:01:00.000Z",
  classification: "QUALIFIED",
});
assert.ok(parseFarmOsPteC2bEvidence(evidence));
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence, unexpected: true }), null);
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence, case_results: caseResults.slice(1) }), null);
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence, case_results: caseResults.map(
  (entry, index) => index === 0 ? { ...entry, actual_result: "WRONG_PASS" } : entry) }), null);
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence, cleanup: { ...cleanup,
  residual_owned_count: 1 } }), null);
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence, cleanup: containerRemovalFailedCleanup,
  residual_resource_count: 1 }), null);
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence,
  started_at_metadata: "postgres://fixture:secret@example.invalid/db" }), null);
assert.equal(parseFarmOsPteC2bEvidence({ ...evidence,
  server_version: "token_fixture_not_real" }), null);
const receipt = createFarmOsPteC2bReceiptCandidateFromEvidence(evidence);
assert.ok(receipt);
assert.equal(receipt.schema_version, FARM_OS_PTE_C2B_RECEIPT_VERSION);
assert.ok(parseFarmOsPteC2bReceiptSyntax(receipt));
assert.equal(parseFarmOsPteC2bReceiptSyntax({ ...receipt, unexpected: true }), null);
assert.ok(validateFarmOsPteC2bReceiptAgainstEvidence({ evidence, receipt }));
const orphanReceipt = Object.freeze({ ...receipt, evidence_digest: REPO_DIGEST });
assert.ok(parseFarmOsPteC2bReceiptSyntax(orphanReceipt));
assert.equal(validateFarmOsPteC2bReceiptAgainstEvidence({ evidence: null,
  receipt: orphanReceipt }), null);
assert.equal(validateFarmOsPteC2bReceiptAgainstEvidence({ evidence,
  receipt: orphanReceipt }), null);
const differentEvidence = Object.freeze({ ...evidence,
  ended_at_metadata: "2026-08-11T00:02:00.000Z" });
assert.ok(parseFarmOsPteC2bEvidence(differentEvidence));
assert.equal(validateFarmOsPteC2bReceiptAgainstEvidence({ evidence: differentEvidence,
  receipt }), null);
const commitMarker = createFarmOsPteC2bCommitMarkerCandidate(evidence, receipt);
assert.ok(commitMarker);
assert.equal(commitMarker.status, "ACCEPTED_QUALIFIED_CHAIN");
assert.ok(parseFarmOsPteC2bCommitMarkerSyntax(commitMarker));
assert.equal(validateFarmOsPteC2bAcceptedQualificationChain({ evidence: null, receipt,
  commit_marker: commitMarker, authorization }), false);
assert.equal(validateFarmOsPteC2bAcceptedQualificationChain({ evidence: differentEvidence,
  receipt, commit_marker: commitMarker, authorization }), false);
assert.equal(validateFarmOsPteC2bAcceptedQualificationChain({ evidence, receipt,
  commit_marker: commitMarker, authorization }), true);
assert.equal(validateFarmOsPteC2bAcceptedQualificationChain({ evidence, receipt,
  commit_marker: { ...commitMarker, receipt_digest: REPO_DIGEST }, authorization }), false);
assert.equal(validateFarmOsPteC2bAcceptedQualificationChain({ evidence, receipt,
  commit_marker: commitMarker, authorization: { ...authorization,
    authorization_digest: REPO_DIGEST } }), false);

const fakeEvents: string[] = [];
const fakeAdapter: FarmOsPteC2bQualificationAdapter = {
  async preflight() { throw new Error("source validation must not invoke preflight"); },
  async prepareFixture() { throw new Error("source validation must not invoke DB"); },
  async applyExactMigration() { throw new Error("source validation must not apply migration"); },
  async recordAndVerifyMigrationHistory() { throw new Error("source validation must not use DB"); },
  async executeExactReadOnlyVerifier() { throw new Error("source validation must not run SQL"); },
  async executeCase(definition) {
    fakeEvents.push(definition[0]);
    return Object.freeze({ case_id: definition[0], status: "PASS",
      actual_result: definition[2], winner_count: definition[3],
      authoritative_row_count: definition[3],
      loser_results: Object.freeze(definition[4].length === 0 ? [] : [definition[4][0]]) });
  },
  async cleanupExactOwnedResources() { return cleanup; },
};
const sourceValidation = await validateFarmOsPteC2bSourceWithFakeAdapter(fakeAdapter);
assert.deepEqual(sourceValidation, { status: "SOURCE_VALIDATION_PASS", executed_case_count: 66,
  docker_operations: 0, postgres_operations: 0, evidence_created: false });
assert.deepEqual(fakeEvents, FARM_OS_PTE_C2B_CASE_REGISTRY.map((entry) => entry[0]));

const failClosedRealBoundary = createFarmOsPteC2bFailClosedRealDockerBoundary();
assert.equal(Object.isFrozen(failClosedRealBoundary.adapter), true);
assert.equal(validateFarmOsPteC2bRealExecutionCapability(failClosedRealBoundary.adapter,
  failClosedRealBoundary.capability), true);
assert.equal(validateFarmOsPteC2bRealExecutionCapability(fakeAdapter,
  failClosedRealBoundary.capability), false);
const forgedAdapter = Object.freeze({ ...fakeAdapter,
  adapter_kind: "REAL_ISOLATED_DOCKER_B2_ONLY" as const });
let forgedAdapterOperations = 0;
const forgedBehavior = Object.freeze({ ...forgedAdapter,
  async preflight() { forgedAdapterOperations += 1;
    throw new Error("forged adapter must not be called"); } });
const pinnedResolver = Object.freeze({ async resolveExecutingSourceLineage() {
  return Object.freeze({ status: "PINNED_B1_COMMIT" as const, commit_sha: SOURCE_COMMIT });
} });
const baseExecutionInput = Object.freeze({ execution_nonce: NONCE, image_authority: image,
  started_at_metadata: "2026-08-11T00:00:00.000Z",
  ended_at_metadata: "2026-08-11T00:01:00.000Z", authorization,
  source_lineage_resolver: pinnedResolver });
const forgedQualification = await executeFarmOsPteC2bQualification({ ...baseExecutionInput,
  adapter: forgedBehavior, real_execution_capability: failClosedRealBoundary.capability });
assert.equal(forgedQualification.classification, "BLOCKED_ENVIRONMENT");
assert.equal(forgedQualification.failure_code, "REAL_CAPABILITY_INVALID");
assert.equal(forgedQualification.evidence, null);
assert.equal(forgedAdapterOperations, 0);
const booleanAuthorization = await executeFarmOsPteC2bQualification({ ...baseExecutionInput,
  adapter: forgedBehavior, real_execution_capability: true, authorization: true });
assert.equal(booleanAuthorization.failure_code, "AUTHORIZATION_INVALID");
assert.equal(forgedAdapterOperations, 0);
const authorizationWith = (overrides: Partial<Omit<FarmOsPteC2bAuthorizationEnvelope,
  "authorization_digest">>) => {
  const material: Omit<FarmOsPteC2bAuthorizationEnvelope, "authorization_digest"> =
    Object.freeze({ ...authorizationMaterial, ...overrides });
  return Object.freeze({ ...material,
    authorization_digest: computeFarmOsPteC2bAuthorizationDigest(material) });
};
const wrongImageAuthorization = authorizationWith({
  image_repository_digest: `sha256:${"9".repeat(64)}` });
const wrongImageResult = await executeFarmOsPteC2bQualification({ ...baseExecutionInput,
  adapter: forgedBehavior, real_execution_capability: failClosedRealBoundary.capability,
  authorization: wrongImageAuthorization });
assert.equal(wrongImageResult.failure_code, "INPUT_INVALID");
assert.equal(forgedAdapterOperations, 0);
const wrongSourceAuthorization = authorizationWith({
  expected_c2b_source_commit: "9".repeat(40) });
const wrongSourceResult = await executeFarmOsPteC2bQualification({ ...baseExecutionInput,
  adapter: forgedBehavior, real_execution_capability: failClosedRealBoundary.capability,
  authorization: wrongSourceAuthorization });
assert.equal(wrongSourceResult.failure_code, "SOURCE_IDENTITY_MISMATCH");
assert.equal(forgedAdapterOperations, 0);
const mismatchedResolver = Object.freeze({ async resolveExecutingSourceLineage() {
  return Object.freeze({ status: "PINNED_B1_COMMIT" as const, commit_sha: "8".repeat(40) });
} });
const lineageMismatchResult = await executeFarmOsPteC2bQualification({ ...baseExecutionInput,
  adapter: forgedBehavior, real_execution_capability: failClosedRealBoundary.capability,
  source_lineage_resolver: mismatchedResolver });
assert.equal(lineageMismatchResult.failure_code, "SOURCE_IDENTITY_MISMATCH");
assert.equal(forgedAdapterOperations, 0);

const cli = parseFarmOsPteC2bQualificationCli([
  "--execution-nonce", NONCE,
  "--image", runtimeReference, "--started-at-metadata", "2026-08-11T00:00:00.000Z",
  "--ended-at-metadata", "2026-08-11T00:01:00.000Z",
]);
assert.ok(cli);
assert.equal(parseFarmOsPteC2bQualificationCli(["--image", "postgres:17"]), null);
assert.equal(FARM_OS_DAY150_PHASE_C2B_ISOLATED_POSTGRES_ENTRY.b2_authorized, false);
assert.equal(FARM_OS_DAY150_PHASE_C2B_ISOLATED_POSTGRES_ENTRY.tsx_cli_required, false);

const sourcePaths = [
  "scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_contract.ts",
  "scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_fixture.ts",
  "scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_executor.ts",
  "scripts/hermes/lib/farm_os_production_target_execution_postgres_qualification_docker_adapter.ts",
  "scripts/hermes/run_farm_os_production_target_execution_postgres_qualification.ts",
  "scripts/hermes/test_farm_os_day150_phase_c2b_isolated_postgres.ts",
];
const sources = sourcePaths.map((path) => readFileSync(path, "utf8"));
assert.doesNotMatch(sources[2] ?? "", /node:child_process|\bdocker\b|\bpg\b/u);
assert.doesNotMatch(sources[4] ?? "", /process\.env|tsx\s|listen\s*\(|createServer\s*\(/u);
assert.doesNotMatch(sources.join("\n"), /\.env\.local|SUPABASE_SERVICE_ROLE|DATABASE_URL|docker\s+pull|system\s+prune|--force-with-lease/u);
for (const syntheticSecret of ["c2b_" + "f".repeat(64),
  "postgres://fixture:secret@example.invalid/db", "token_fixture_not_real"]) {
  assert.equal(JSON.stringify(evidence).includes(syntheticSecret), false);
}
assert.match(createFarmOsPteC2bSourceValidationIdentity().migration_plan_digest,
  /^sha256:[a-f0-9]{64}$/u);

console.log(JSON.stringify({
  test: "farm_os_day150_phase_c2b_qualification_source",
  status: "SOURCE_VALIDATION_PASS",
  case_count: 66,
  registry_digest: FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
  docker_operations: 0,
  postgres_operations: 0,
  ipc_operations: 0,
}));
