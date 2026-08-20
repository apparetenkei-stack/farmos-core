import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V1_PATH,
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V2_PATH,
  compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates,
  createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2,
  parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2,
  publishFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2,
} from "../../src/lib/hermes/farm_os_day150_prefix_source_qualified_metrics_evidence";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  deriveFarmOsDay150PrefixReferenceClosureDigest,
  deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  FARM_OS_DAY150_SOURCE_QUALIFICATION_CONTAINER,
  FARM_OS_DAY150_SOURCE_QUALIFICATION_IMAGE,
  FARM_OS_DAY150_SOURCE_QUALIFICATION_NETWORK,
  FARM_OS_DAY150_SOURCE_QUALIFICATION_VOLUME,
  runFarmOsDay150PrefixLoadBearingQualification,
} from "./run_farm_os_day150_prefix_load_bearing_qualification";

const EXPECTED_SOURCE_DIGEST =
  "sha256:b8a95697a2439a31d180706878ceb1c66171ba563e82037bf18518f382bccfa6";
const EXPECTED_V1_RAW_SHA256 =
  "sha256:310c7d32e0e3d70037e565c28ddfe7a056ce923c011d045f1b143982218b61d0";
const POST_V13_QUALIFICATION_TOOLING_FILES = Object.freeze([
  "scripts/hermes/run_farm_os_day150_prefix_load_bearing_qualification.ts",
  "scripts/hermes/run_farm_os_day150_source_qualified_five_row_evidence.ts",
  "src/lib/hermes/farm_os_day150_prefix_source_qualified_metrics_evidence.ts",
]);

function rawDigest(path: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function exactAbsent(kind: "container" | "network" | "volume", name: string): boolean {
  const result = spawnSync("docker", [kind, "inspect", name], { encoding: "utf8" });
  const expected = kind === "container" ? `Error response from daemon: No such container: ${name}` :
    kind === "network" ? `Error response from daemon: network ${name} not found` :
      `Error response from daemon: get ${name}: no such volume`;
  return result.status === 1 && ["", "[]"].includes((result.stdout ?? "").trim()) &&
    (result.stderr ?? "").trim() === expected;
}

const repositoryRoot = resolve(process.cwd());
const v1Path = resolve(repositoryRoot, FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V1_PATH);
if (rawDigest(v1Path) !== EXPECTED_V1_RAW_SHA256) {
  throw new Error("DAY150_SOURCE_QUALIFICATION_EVIDENCE_V1_IMMUTABILITY_REJECTED");
}
if (existsSync(resolve(repositoryRoot,
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V2_PATH))) {
  throw new Error("DAY150_SOURCE_QUALIFICATION_EVIDENCE_V2_ALREADY_PUBLISHED");
}
const files = deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor(
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR, repositoryRoot);
const historicalV13ExecutableSourceDigest = deriveFarmOsDay150PrefixReferenceClosureDigest({ files,
  read_source: (path) => readFileSync(resolve(repositoryRoot, path)) });
if (historicalV13ExecutableSourceDigest !== EXPECTED_SOURCE_DIGEST) {
  throw new Error("HOLD_DAY150_HISTORICAL_V13_EXECUTABLE_SOURCE_MISMATCH");
}
const toolingRows = POST_V13_QUALIFICATION_TOOLING_FILES.map((relativePath) => ({
  path: relativePath, sha256: rawDigest(resolve(repositoryRoot, relativePath)),
}));
const postV13QualificationToolingSourceDigest = `sha256:${createHash("sha256").update(
  `farmos.day150-post-v13-qualification-tooling-source.v1\n${JSON.stringify(toolingRows)}`,
).digest("hex")}` as const;

const qualification = runFarmOsDay150PrefixLoadBearingQualification();
const cleanup = Object.freeze({
  container_name: FARM_OS_DAY150_SOURCE_QUALIFICATION_CONTAINER,
  container_state: exactAbsent("container", FARM_OS_DAY150_SOURCE_QUALIFICATION_CONTAINER)
    ? "ABSENT" as const : "NOT_PROVEN_ABSENT" as const,
  volume_name: FARM_OS_DAY150_SOURCE_QUALIFICATION_VOLUME,
  volume_state: exactAbsent("volume", FARM_OS_DAY150_SOURCE_QUALIFICATION_VOLUME)
    ? "ABSENT" as const : "NOT_PROVEN_ABSENT" as const,
  network_name: FARM_OS_DAY150_SOURCE_QUALIFICATION_NETWORK,
  network_state: exactAbsent("network", FARM_OS_DAY150_SOURCE_QUALIFICATION_NETWORK)
    ? "ABSENT" as const : "NOT_PROVEN_ABSENT" as const,
  unrelated_resource_operations: 0 as const,
});
if (cleanup.container_state !== "ABSENT" || cleanup.volume_state !== "ABSENT" ||
  cleanup.network_state !== "ABSENT") {
  throw new Error("DAY150_SOURCE_QUALIFICATION_CLEANUP_OUTCOME_UNKNOWN");
}
if (rawDigest(v1Path) !== EXPECTED_V1_RAW_SHA256) {
  throw new Error("DAY150_SOURCE_QUALIFICATION_EVIDENCE_V1_IMMUTABILITY_REJECTED");
}
const evidence = createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2({
  qualified_at: new Date().toISOString(),
  post_v13_qualification_tooling_source_digest: postV13QualificationToolingSourceDigest,
  gate17_scope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE.gate17_scope_digest,
  initial_catalog_authority_id: qualification.initial_catalog_authority_id,
  initial_catalog_digest: qualification.initial_catalog_digest,
  bootstrap_plan_digest: qualification.bootstrap_plan_digest,
  reference_postgres_major: 17,
  reference_image: FARM_OS_DAY150_SOURCE_QUALIFICATION_IMAGE,
  metrics: qualification.snapshots.map((row) => ({
    migration_id: row.migration_id, migration_sha256: row.migration_sha256,
    catalog_fingerprint: row.catalog_fingerprint,
    normalized_snapshot_digest: row.normalized_snapshot_digest,
    object_count: row.object_count, object_universe_digest: row.object_universe_digest,
    catalog_query_sha256: row.catalog_query_sha256,
  })), cleanup,
});
if (!evidence) throw new Error("DAY150_SOURCE_QUALIFIED_EVIDENCE_V2_REJECTED");
const path = await publishFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
  repositoryRoot, evidence);
const durableReadback = parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
  JSON.parse(readFileSync(path, "utf8")));
if (!durableReadback) throw new Error("DAY150_SOURCE_QUALIFIED_EVIDENCE_V2_READBACK_REJECTED");
const candidatePaths = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) =>
  resolve(repositoryRoot, spec.output_path));
const candidateValues = candidatePaths.map((candidatePath) =>
  JSON.parse(readFileSync(candidatePath, "utf8")) as unknown);
const successReceiptValue = JSON.parse(readFileSync(resolve(repositoryRoot,
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v13/" +
  "reference-catalog-run-receipt-candidate.json"), "utf8")) as unknown;
const comparison = compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates(
  durableReadback, candidateValues, successReceiptValue);
if (!comparison) throw new Error("DAY150_EXACT_FIVE_CANDIDATE_MISMATCH");
process.stdout.write(`${JSON.stringify({
  status: "DAY150_SOURCE_QUALIFIED_FIVE_ROW_EVIDENCE_PUBLISHED",
  path, evidence_digest: evidence.evidence_digest,
  historical_v13_executable_source_digest: EXPECTED_SOURCE_DIGEST,
  post_v13_qualification_tooling_source_digest: postV13QualificationToolingSourceDigest,
  rows: evidence.rows, comparison,
  candidate_raw_file_sha256: candidatePaths.map(rawDigest),
  qualification_zero_residual: evidence.qualification_zero_residual,
  candidate_artifacts_written: 0, production_operations: 0, canonical_operations: 0,
  b2_operations: 0, gate2_operations: 0,
})}\n`);
