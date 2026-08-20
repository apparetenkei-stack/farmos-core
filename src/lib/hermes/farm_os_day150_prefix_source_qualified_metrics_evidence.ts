import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  canonicalFarmOsDay150Json,
  publishCanonicalFarmOsDay150ArtifactExclusive,
  reopenCanonicalFarmOsDay150Artifact,
} from "./farm_os_day150_prefix_reference_durable_store";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS,
  createFarmOsDay150ExpectedCatalogCandidateSetDigest,
  parseFarmOsDay150ExpectedCatalogCandidate,
  parseFarmOsDay150ReferenceCatalogRunReceiptCandidate,
  type FarmOsDay150ExpectedCatalogCandidateIdentity,
  type FarmOsExpectedCatalogFingerprintCandidate,
} from "./farm_os_day150_prefix_expected_catalog_derivation";

export const FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_PATH =
  "artifacts/day150/prefix-expected-catalog/qualification/v1/" +
  "source-qualified-five-row-metrics.json";

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const EXPECTED_SOURCE_DIGEST =
  "sha256:b8a95697a2439a31d180706878ceb1c66171ba563e82037bf18518f382bccfa6";
const EXPECTED_GATE17_SCOPE_DIGEST =
  "sha256:5ca2bf142fe5d22af62e6aecd1db3ce2296b531a36891c9ff7d7f48d704cec01";
const EXPECTED_INITIAL_CATALOG_DIGEST =
  "sha256:da63dc34aeb3583a681df02dd46448a48e021d91e5110ff221e980a1fd22cce5";
const EXPECTED_BOOTSTRAP_PLAN_DIGEST =
  "sha256:024f2566ec005dfa4fdd1ef53e26aad17033b9f44cf2d5bd38bee266d754bc36";
const EXPECTED_CATALOG_QUERY_DIGEST =
  "sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52";
const EXPECTED_IMAGE =
  "docker.io/library/postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317";
const SEMANTIC_FINGERPRINT_VERSION =
  "farmos.pg-catalog-semantic-principal-fingerprint.v3";

export type FarmOsDay150SourceQualifiedMetricRow = Readonly<{
  ordered_stage: 1 | 2 | 3 | 4 | 5;
  migration_id: string;
  migration_sha256: `sha256:${string}`;
  catalog_fingerprint: `sha256:${string}`;
  normalized_snapshot_digest: `sha256:${string}`;
  object_count: number;
  object_universe_digest: `sha256:${string}`;
  catalog_query_sha256: `sha256:${string}`;
  semantic_fingerprint_version: typeof SEMANTIC_FINGERPRINT_VERSION;
}>;

export type FarmOsDay150SourceQualifiedFiveRowMetricsEvidence = Readonly<{
  schema_version: "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v1";
  evidence_revision: 1;
  evidence_classification: "SOURCE_QUALIFICATION_EVIDENCE";
  qualified_at: string;
  frozen_v13_executable_source_digest: typeof EXPECTED_SOURCE_DIGEST;
  gate17_scope_digest: typeof EXPECTED_GATE17_SCOPE_DIGEST;
  initial_catalog_authority_id: "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2";
  initial_catalog_authority_revision: 2;
  initial_catalog_digest: typeof EXPECTED_INITIAL_CATALOG_DIGEST;
  bootstrap_plan_digest: typeof EXPECTED_BOOTSTRAP_PLAN_DIGEST;
  reference_postgres_major: 17;
  reference_image: typeof EXPECTED_IMAGE;
  catalog_query_sha256: typeof EXPECTED_CATALOG_QUERY_DIGEST;
  semantic_fingerprint_version: typeof SEMANTIC_FINGERPRINT_VERSION;
  ordered_migration_ids: readonly string[];
  ordered_migration_sha256: readonly `sha256:${string}`[];
  rows: readonly FarmOsDay150SourceQualifiedMetricRow[];
  qualification_cleanup: Readonly<{
    container_name: string; container_state: "ABSENT";
    volume_name: string; volume_state: "ABSENT";
    network_name: string; network_state: "ABSENT";
    unrelated_resource_operations: 0;
  }>;
  qualification_zero_residual: true;
  candidate_artifacts_written: 0;
  production_operations: 0;
  canonical_operations: 0;
  b2_operations: 0;
  gate2_operations: 0;
  evidence_digest: `sha256:${string}`;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}
function canonicalTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value;
}
function digest(domain: string, value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(`${domain}\n${canonicalFarmOsDay150Json(value)}`)
    .digest("hex")}`;
}

export function createFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(input: Readonly<{
  qualified_at: string;
  frozen_v13_executable_source_digest: string;
  gate17_scope_digest: string;
  initial_catalog_authority_id: string;
  initial_catalog_digest: string;
  bootstrap_plan_digest: string;
  reference_postgres_major: number;
  reference_image: string;
  metrics: readonly Readonly<{
    migration_id: string; catalog_fingerprint: string;
    normalized_snapshot_digest: string; object_count: number;
    object_universe_digest: string; catalog_query_sha256: string;
    migration_sha256: string;
  }>[];
  cleanup: Readonly<{
    container_name: string; container_state: string;
    volume_name: string; volume_state: string;
    network_name: string; network_state: string;
    unrelated_resource_operations: number;
  }>;
}>): FarmOsDay150SourceQualifiedFiveRowMetricsEvidence | null {
  if (!canonicalTime(input.qualified_at) ||
    input.frozen_v13_executable_source_digest !== EXPECTED_SOURCE_DIGEST ||
    input.gate17_scope_digest !== EXPECTED_GATE17_SCOPE_DIGEST ||
    input.initial_catalog_authority_id !== "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2" ||
    input.initial_catalog_digest !== EXPECTED_INITIAL_CATALOG_DIGEST ||
    input.bootstrap_plan_digest !== EXPECTED_BOOTSTRAP_PLAN_DIGEST ||
    input.reference_postgres_major !== 17 || input.reference_image !== EXPECTED_IMAGE ||
    input.metrics.length !== FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.length ||
    input.cleanup.container_state !== "ABSENT" || input.cleanup.volume_state !== "ABSENT" ||
    input.cleanup.network_state !== "ABSENT" ||
    input.cleanup.unrelated_resource_operations !== 0) return null;
  const rows = input.metrics.map((metric, index) => {
    const spec = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[index]!;
    if (metric.migration_id !== spec.migration_id ||
      metric.migration_sha256 !== spec.artifact_sha256 ||
      metric.object_universe_digest !== spec.object_universe_digest ||
      metric.catalog_query_sha256 !== EXPECTED_CATALOG_QUERY_DIGEST ||
      !DIGEST.test(metric.catalog_fingerprint) ||
      !DIGEST.test(metric.normalized_snapshot_digest) ||
      !Number.isSafeInteger(metric.object_count) || metric.object_count < 1) return null;
    return Object.freeze({ ordered_stage: (index + 1) as 1 | 2 | 3 | 4 | 5,
      migration_id: metric.migration_id,
      migration_sha256: metric.migration_sha256 as `sha256:${string}`,
      catalog_fingerprint: metric.catalog_fingerprint as `sha256:${string}`,
      normalized_snapshot_digest: metric.normalized_snapshot_digest as `sha256:${string}`,
      object_count: metric.object_count,
      object_universe_digest: metric.object_universe_digest as `sha256:${string}`,
      catalog_query_sha256: metric.catalog_query_sha256 as `sha256:${string}`,
      semantic_fingerprint_version: SEMANTIC_FINGERPRINT_VERSION });
  });
  if (rows.some((row) => row === null)) return null;
  const exactRows = rows as readonly FarmOsDay150SourceQualifiedMetricRow[];
  const body = Object.freeze({
    schema_version: "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v1" as const,
    evidence_revision: 1 as const,
    evidence_classification: "SOURCE_QUALIFICATION_EVIDENCE" as const,
    qualified_at: input.qualified_at,
    frozen_v13_executable_source_digest: EXPECTED_SOURCE_DIGEST,
    gate17_scope_digest: EXPECTED_GATE17_SCOPE_DIGEST,
    initial_catalog_authority_id: "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2" as const,
    initial_catalog_authority_revision: 2 as const,
    initial_catalog_digest: EXPECTED_INITIAL_CATALOG_DIGEST,
    bootstrap_plan_digest: EXPECTED_BOOTSTRAP_PLAN_DIGEST,
    reference_postgres_major: 17 as const, reference_image: EXPECTED_IMAGE,
    catalog_query_sha256: EXPECTED_CATALOG_QUERY_DIGEST,
    semantic_fingerprint_version: SEMANTIC_FINGERPRINT_VERSION,
    ordered_migration_ids: Object.freeze(exactRows.map((row) => row.migration_id)),
    ordered_migration_sha256: Object.freeze(exactRows.map((row) => row.migration_sha256)),
    rows: Object.freeze(exactRows),
    qualification_cleanup: Object.freeze({
      container_name: input.cleanup.container_name, container_state: "ABSENT" as const,
      volume_name: input.cleanup.volume_name, volume_state: "ABSENT" as const,
      network_name: input.cleanup.network_name, network_state: "ABSENT" as const,
      unrelated_resource_operations: 0 as const,
    }),
    qualification_zero_residual: true as const, candidate_artifacts_written: 0 as const,
    production_operations: 0 as const, canonical_operations: 0 as const,
    b2_operations: 0 as const, gate2_operations: 0 as const,
  });
  return Object.freeze({ ...body, evidence_digest: digest(
    "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v1", body) });
}

export function parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(
  value: unknown,
): FarmOsDay150SourceQualifiedFiveRowMetricsEvidence | null {
  if (!record(value) || !exact(value, ["schema_version", "evidence_revision",
    "evidence_classification", "qualified_at", "frozen_v13_executable_source_digest",
    "gate17_scope_digest", "initial_catalog_authority_id",
    "initial_catalog_authority_revision", "initial_catalog_digest", "bootstrap_plan_digest",
    "reference_postgres_major", "reference_image", "catalog_query_sha256",
    "semantic_fingerprint_version", "ordered_migration_ids", "ordered_migration_sha256",
    "rows", "qualification_cleanup", "qualification_zero_residual",
    "candidate_artifacts_written", "production_operations", "canonical_operations",
    "b2_operations", "gate2_operations", "evidence_digest"])) return null;
  const { evidence_digest: evidenceDigest, ...body } = value;
  if (typeof evidenceDigest !== "string" || !DIGEST.test(evidenceDigest) ||
    evidenceDigest !== digest(
      "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v1", body) ||
    !Array.isArray(value.rows) || !record(value.qualification_cleanup)) return null;
  const recreated = createFarmOsDay150SourceQualifiedFiveRowMetricsEvidence({
    qualified_at: String(value.qualified_at),
    frozen_v13_executable_source_digest: String(value.frozen_v13_executable_source_digest),
    gate17_scope_digest: String(value.gate17_scope_digest),
    initial_catalog_authority_id: String(value.initial_catalog_authority_id),
    initial_catalog_digest: String(value.initial_catalog_digest),
    bootstrap_plan_digest: String(value.bootstrap_plan_digest),
    reference_postgres_major: Number(value.reference_postgres_major),
    reference_image: String(value.reference_image),
    metrics: value.rows.map((row) => record(row) ? ({ migration_id: String(row.migration_id),
      migration_sha256: String(row.migration_sha256),
      catalog_fingerprint: String(row.catalog_fingerprint),
      normalized_snapshot_digest: String(row.normalized_snapshot_digest),
      object_count: Number(row.object_count),
      object_universe_digest: String(row.object_universe_digest),
      catalog_query_sha256: String(row.catalog_query_sha256) }) : ({} as never)),
    cleanup: { container_name: String(value.qualification_cleanup.container_name),
      container_state: String(value.qualification_cleanup.container_state),
      volume_name: String(value.qualification_cleanup.volume_name),
      volume_state: String(value.qualification_cleanup.volume_state),
      network_name: String(value.qualification_cleanup.network_name),
      network_state: String(value.qualification_cleanup.network_state),
      unrelated_resource_operations:
        Number(value.qualification_cleanup.unrelated_resource_operations) },
  });
  return recreated && canonicalFarmOsDay150Json(recreated) === canonicalFarmOsDay150Json(value)
    ? Object.freeze(value) as FarmOsDay150SourceQualifiedFiveRowMetricsEvidence : null;
}

export async function publishFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(
  repositoryRoot: string,
  evidence: FarmOsDay150SourceQualifiedFiveRowMetricsEvidence,
): Promise<string> {
  const path = resolve(repositoryRoot, FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_PATH);
  await publishCanonicalFarmOsDay150ArtifactExclusive(path, evidence);
  const readback = parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(
    await reopenCanonicalFarmOsDay150Artifact(path));
  if (!readback || readback.evidence_digest !== evidence.evidence_digest) {
    throw new Error("DAY150_SOURCE_QUALIFIED_EVIDENCE_READBACK_REJECTED");
  }
  return path;
}

export const FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V1_PATH =
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_PATH;
export const FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V2_PATH =
  "artifacts/day150/prefix-expected-catalog/qualification/v2/" +
  "source-qualified-five-row-metrics.json";
export const FARM_OS_DAY150_SOURCE_QUALIFICATION_V1_REJECTED_CLASSIFICATION =
  "SOURCE_QUALIFICATION_EVIDENCE_V1_REJECTED_FINGERPRINT_SEMANTICS" as const;
export const FARM_OS_DAY150_HISTORICAL_V13_EXECUTABLE_SOURCE_DIGEST = EXPECTED_SOURCE_DIGEST;
export const FARM_OS_DAY150_DUAL_PRINCIPAL_FINGERPRINT_AUTHORITY =
  "createFarmOsDay150DualPrincipalSemanticFingerprint" as const;
export const FARM_OS_DAY150_SEMANTIC_OWNER_AUTHORITY =
  "REFERENCE_MIGRATION_OWNER" as const;
export const FARM_OS_DAY150_SEMANTIC_EXECUTOR_AUTHORITY =
  "REFERENCE_MIGRATION_EXECUTOR" as const;
export const FARM_OS_DAY150_DUAL_PRINCIPAL_NORMALIZATION_AUTHORITY =
  "farmos.reference-migration-owner-executor-normalization.v2" as const;

const EXPECTED_QUALIFICATION_ROWS = Object.freeze([
  Object.freeze({ normalized_snapshot_digest:
    "sha256:2499ac357cb34cd834583f7e702c2e439e948d06c11d58baabaa7a22a3fc72d8",
  object_count: 199, object_universe_digest:
    "sha256:ca46fc1ab19a516be5b0542718f3097f780197410b82037f365048b3fcb1900d" }),
  Object.freeze({ normalized_snapshot_digest:
    "sha256:f2d8c32395cf55b017b09f8f096a8f472332cb87e59e6b4b4cf12144e42b97b6",
  object_count: 16, object_universe_digest:
    "sha256:371f1fd56af50ace292f38196744f99b7798129d77310de773b73daac52cc1be" }),
  Object.freeze({ normalized_snapshot_digest:
    "sha256:3d973ed89bae6781f374270c1de700d23f983fa694979172e100ebae63bb821d",
  object_count: 52, object_universe_digest:
    "sha256:60117f29752f98c39647571939ebda877b8178501112b67574ad8205e3218a7d" }),
  Object.freeze({ normalized_snapshot_digest:
    "sha256:0f5edbf290ba9a748bcabbe858dce62eda43a2187940a627ad6c0dcb142f03fa",
  object_count: 216, object_universe_digest:
    "sha256:7b9535e84924246b3175fc5ef87ada39b49f9fa3262be13a96bfd29f30e26d50" }),
  Object.freeze({ normalized_snapshot_digest:
    "sha256:33ab1aac0e899b349d02480e614bb9b87d26610029bb79868db65ebdd082eac9",
  object_count: 133, object_universe_digest:
    "sha256:b316f24bac4f3c0aa95dcd5dbcd5dd533349e3d83d6dc38c858c34d67531fe16" }),
]);

export type FarmOsDay150SourceQualifiedMetricRowV2 = Readonly<{
  ordered_stage: 1 | 2 | 3 | 4 | 5;
  migration_id: string;
  migration_sha256: `sha256:${string}`;
  dual_principal_semantic_catalog_fingerprint: `sha256:${string}`;
  normalized_snapshot_digest: `sha256:${string}`;
  object_count: number;
  object_universe_digest: `sha256:${string}`;
  catalog_query_sha256: typeof EXPECTED_CATALOG_QUERY_DIGEST;
  semantic_fingerprint_version: typeof SEMANTIC_FINGERPRINT_VERSION;
}>;

export type FarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2 = Readonly<{
  schema_version: "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v2";
  evidence_revision: 2;
  evidence_classification: "SOURCE_QUALIFICATION_EVIDENCE";
  qualified_at: string;
  historical_v13_executable_source_digest: typeof EXPECTED_SOURCE_DIGEST;
  post_v13_qualification_tooling_source_digest: `sha256:${string}`;
  gate17_scope_digest: typeof EXPECTED_GATE17_SCOPE_DIGEST;
  initial_catalog_authority_id: "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2";
  initial_catalog_authority_revision: 2;
  initial_catalog_digest: typeof EXPECTED_INITIAL_CATALOG_DIGEST;
  bootstrap_plan_digest: typeof EXPECTED_BOOTSTRAP_PLAN_DIGEST;
  reference_postgres_major: 17;
  reference_image: typeof EXPECTED_IMAGE;
  catalog_query_sha256: typeof EXPECTED_CATALOG_QUERY_DIGEST;
  semantic_fingerprint_authority: typeof FARM_OS_DAY150_DUAL_PRINCIPAL_FINGERPRINT_AUTHORITY;
  semantic_fingerprint_version: typeof SEMANTIC_FINGERPRINT_VERSION;
  semantic_owner_authority: typeof FARM_OS_DAY150_SEMANTIC_OWNER_AUTHORITY;
  semantic_executor_authority: typeof FARM_OS_DAY150_SEMANTIC_EXECUTOR_AUTHORITY;
  principal_normalization_authority: typeof FARM_OS_DAY150_DUAL_PRINCIPAL_NORMALIZATION_AUTHORITY;
  ordered_migration_ids: readonly string[];
  ordered_migration_sha256: readonly `sha256:${string}`[];
  rows: readonly FarmOsDay150SourceQualifiedMetricRowV2[];
  qualification_cleanup: FarmOsDay150SourceQualifiedFiveRowMetricsEvidence["qualification_cleanup"];
  qualification_zero_residual: true;
  candidate_artifacts_read_before_durable_publication: 0;
  candidate_artifacts_written: 0;
  production_operations: 0;
  canonical_operations: 0;
  b2_operations: 0;
  gate2_operations: 0;
  evidence_digest: `sha256:${string}`;
}>;

type V2Input = Readonly<{
  qualified_at: string;
  post_v13_qualification_tooling_source_digest: string;
  gate17_scope_digest: string;
  initial_catalog_authority_id: string;
  initial_catalog_digest: string;
  bootstrap_plan_digest: string;
  reference_postgres_major: number;
  reference_image: string;
  metrics: readonly Readonly<{ migration_id: string; migration_sha256: string;
    catalog_fingerprint: string; normalized_snapshot_digest: string; object_count: number;
    object_universe_digest: string; catalog_query_sha256: string }>[];
  cleanup: Readonly<{ container_name: string; container_state: string;
    volume_name: string; volume_state: string; network_name: string; network_state: string;
    unrelated_resource_operations: number }>;
}>;

export function createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
  input: V2Input,
): FarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2 | null {
  if (!canonicalTime(input.qualified_at) ||
    !DIGEST.test(input.post_v13_qualification_tooling_source_digest) ||
    input.post_v13_qualification_tooling_source_digest === EXPECTED_SOURCE_DIGEST ||
    input.gate17_scope_digest !== EXPECTED_GATE17_SCOPE_DIGEST ||
    input.initial_catalog_authority_id !== "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2" ||
    input.initial_catalog_digest !== EXPECTED_INITIAL_CATALOG_DIGEST ||
    input.bootstrap_plan_digest !== EXPECTED_BOOTSTRAP_PLAN_DIGEST ||
    input.reference_postgres_major !== 17 || input.reference_image !== EXPECTED_IMAGE ||
    input.metrics.length !== FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.length ||
    input.cleanup.container_state !== "ABSENT" || input.cleanup.volume_state !== "ABSENT" ||
    input.cleanup.network_state !== "ABSENT" || input.cleanup.unrelated_resource_operations !== 0) {
    return null;
  }
  const rows = input.metrics.map((metric, index) => {
    const spec = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[index]!;
    const expected = EXPECTED_QUALIFICATION_ROWS[index]!;
    if (metric.migration_id !== spec.migration_id ||
      metric.migration_sha256 !== spec.artifact_sha256 ||
      metric.normalized_snapshot_digest !== expected.normalized_snapshot_digest ||
      metric.object_count !== expected.object_count ||
      metric.object_universe_digest !== expected.object_universe_digest ||
      metric.catalog_query_sha256 !== EXPECTED_CATALOG_QUERY_DIGEST ||
      !DIGEST.test(metric.catalog_fingerprint)) return null;
    return Object.freeze({ ordered_stage: (index + 1) as 1 | 2 | 3 | 4 | 5,
      migration_id: metric.migration_id,
      migration_sha256: metric.migration_sha256 as `sha256:${string}`,
      dual_principal_semantic_catalog_fingerprint:
        metric.catalog_fingerprint as `sha256:${string}`,
      normalized_snapshot_digest: metric.normalized_snapshot_digest as `sha256:${string}`,
      object_count: metric.object_count,
      object_universe_digest: metric.object_universe_digest as `sha256:${string}`,
      catalog_query_sha256: EXPECTED_CATALOG_QUERY_DIGEST,
      semantic_fingerprint_version: SEMANTIC_FINGERPRINT_VERSION });
  });
  if (rows.some((row) => row === null)) return null;
  const exactRows = rows as readonly FarmOsDay150SourceQualifiedMetricRowV2[];
  const body = Object.freeze({
    schema_version: "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v2" as const,
    evidence_revision: 2 as const, evidence_classification: "SOURCE_QUALIFICATION_EVIDENCE" as const,
    qualified_at: input.qualified_at,
    historical_v13_executable_source_digest: EXPECTED_SOURCE_DIGEST,
    post_v13_qualification_tooling_source_digest:
      input.post_v13_qualification_tooling_source_digest as `sha256:${string}`,
    gate17_scope_digest: EXPECTED_GATE17_SCOPE_DIGEST,
    initial_catalog_authority_id: "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2" as const,
    initial_catalog_authority_revision: 2 as const,
    initial_catalog_digest: EXPECTED_INITIAL_CATALOG_DIGEST,
    bootstrap_plan_digest: EXPECTED_BOOTSTRAP_PLAN_DIGEST,
    reference_postgres_major: 17 as const, reference_image: EXPECTED_IMAGE,
    catalog_query_sha256: EXPECTED_CATALOG_QUERY_DIGEST,
    semantic_fingerprint_authority: FARM_OS_DAY150_DUAL_PRINCIPAL_FINGERPRINT_AUTHORITY,
    semantic_fingerprint_version: SEMANTIC_FINGERPRINT_VERSION,
    semantic_owner_authority: FARM_OS_DAY150_SEMANTIC_OWNER_AUTHORITY,
    semantic_executor_authority: FARM_OS_DAY150_SEMANTIC_EXECUTOR_AUTHORITY,
    principal_normalization_authority: FARM_OS_DAY150_DUAL_PRINCIPAL_NORMALIZATION_AUTHORITY,
    ordered_migration_ids: Object.freeze(exactRows.map((row) => row.migration_id)),
    ordered_migration_sha256: Object.freeze(exactRows.map((row) => row.migration_sha256)),
    rows: Object.freeze(exactRows),
    qualification_cleanup: Object.freeze({
      container_name: input.cleanup.container_name, container_state: "ABSENT" as const,
      volume_name: input.cleanup.volume_name, volume_state: "ABSENT" as const,
      network_name: input.cleanup.network_name, network_state: "ABSENT" as const,
      unrelated_resource_operations: 0 as const }),
    qualification_zero_residual: true as const,
    candidate_artifacts_read_before_durable_publication: 0 as const,
    candidate_artifacts_written: 0 as const, production_operations: 0 as const,
    canonical_operations: 0 as const, b2_operations: 0 as const, gate2_operations: 0 as const,
  });
  return Object.freeze({ ...body, evidence_digest: digest(
    "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v2", body) });
}

export function parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
  value: unknown,
): FarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2 | null {
  if (!record(value) || !Array.isArray(value.rows) || !record(value.qualification_cleanup)) return null;
  const { evidence_digest: evidenceDigest, ...body } = value;
  if (typeof evidenceDigest !== "string" || !DIGEST.test(evidenceDigest) || evidenceDigest !== digest(
    "farmos.day150-prefix-source-qualified-five-row-metrics-evidence.v2", body)) return null;
  const recreated = createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2({
    qualified_at: String(value.qualified_at),
    post_v13_qualification_tooling_source_digest:
      String(value.post_v13_qualification_tooling_source_digest),
    gate17_scope_digest: String(value.gate17_scope_digest),
    initial_catalog_authority_id: String(value.initial_catalog_authority_id),
    initial_catalog_digest: String(value.initial_catalog_digest),
    bootstrap_plan_digest: String(value.bootstrap_plan_digest),
    reference_postgres_major: Number(value.reference_postgres_major),
    reference_image: String(value.reference_image),
    metrics: value.rows.map((row) => record(row) ? ({
      migration_id: String(row.migration_id), migration_sha256: String(row.migration_sha256),
      catalog_fingerprint: String(row.dual_principal_semantic_catalog_fingerprint),
      normalized_snapshot_digest: String(row.normalized_snapshot_digest),
      object_count: Number(row.object_count),
      object_universe_digest: String(row.object_universe_digest),
      catalog_query_sha256: String(row.catalog_query_sha256) }) : ({} as never)),
    cleanup: { container_name: String(value.qualification_cleanup.container_name),
      container_state: String(value.qualification_cleanup.container_state),
      volume_name: String(value.qualification_cleanup.volume_name),
      volume_state: String(value.qualification_cleanup.volume_state),
      network_name: String(value.qualification_cleanup.network_name),
      network_state: String(value.qualification_cleanup.network_state),
      unrelated_resource_operations: Number(value.qualification_cleanup.unrelated_resource_operations) },
  });
  return recreated && canonicalFarmOsDay150Json(recreated) === canonicalFarmOsDay150Json(value)
    ? Object.freeze(value) as FarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2 : null;
}

export async function publishFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
  repositoryRoot: string,
  evidence: FarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2,
): Promise<string> {
  const path = resolve(repositoryRoot, FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V2_PATH);
  await publishCanonicalFarmOsDay150ArtifactExclusive(path, evidence);
  const readback = parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
    await reopenCanonicalFarmOsDay150Artifact(path));
  if (!readback || readback.evidence_digest !== evidence.evidence_digest) {
    throw new Error("DAY150_SOURCE_QUALIFIED_EVIDENCE_V2_READBACK_REJECTED");
  }
  return path;
}

function candidateIdentity(candidate: FarmOsExpectedCatalogFingerprintCandidate):
  FarmOsDay150ExpectedCatalogCandidateIdentity {
  return Object.freeze({ candidate_schema_version: candidate.schema_version,
    candidate_id: candidate.candidate_id, candidate_revision: 1,
    migration_id: candidate.migration_id,
    candidate_identity_digest: candidate.candidate_identity_digest,
    candidate_expected_fingerprint: candidate.candidate_expected_fingerprint,
    snapshot_digest: candidate.snapshot_digest, artifact_sha256: candidate.artifact_sha256,
    catalog_query_sha256: candidate.catalog_query_sha256,
    object_universe_digest: candidate.object_universe_digest,
    expected_object_count: candidate.expected_object_count, git_authority: candidate.git_authority,
    reference_run_provenance_digest: candidate.reference_run_provenance_digest,
    reference_capture_digest: candidate.reference_capture_digest });
}

export function compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates(
  evidenceValue: unknown,
  candidateValues: readonly unknown[],
  v13SuccessReceiptValue: unknown,
): Readonly<{ status: "MATCH_EXACTLY"; rows: readonly Readonly<{
  ordered_stage: number; migration_id: string; source_fingerprint: string;
  real_fingerprint: string; status: "MATCH_EXACTLY" }>[];
  candidate_identity_digests: readonly string[]; candidate_set_digest: string }> | null {
  const evidence = parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(evidenceValue);
  const candidates = candidateValues.map(parseFarmOsDay150ExpectedCatalogCandidate);
  const success = parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(v13SuccessReceiptValue);
  if (!evidence || !success || candidates.length !== 5 ||
    candidates.some((candidate) => candidate === null) ||
    success.initial_catalog_authority_id !== evidence.initial_catalog_authority_id ||
    success.initial_catalog_digest !== evidence.initial_catalog_digest ||
    success.catalog_query_sha256 !== evidence.catalog_query_sha256) return null;
  const exactCandidates = candidates as readonly FarmOsExpectedCatalogFingerprintCandidate[];
  const rows = evidence.rows.map((source, index) => {
    const candidate = exactCandidates[index]!;
    if (source.ordered_stage !== index + 1 || source.migration_id !== candidate.migration_id ||
      success.snapshot_points[index] !== source.migration_id ||
      source.migration_sha256 !== candidate.artifact_sha256 ||
      source.dual_principal_semantic_catalog_fingerprint !== candidate.candidate_expected_fingerprint ||
      source.normalized_snapshot_digest !== candidate.snapshot_digest ||
      source.object_count !== candidate.expected_object_count ||
      source.object_universe_digest !== candidate.object_universe_digest ||
      source.catalog_query_sha256 !== candidate.catalog_query_sha256 ||
      source.semantic_fingerprint_version !== candidate.fingerprint_version ||
      success.candidate_identity_digests[index] !== candidate.candidate_identity_digest) return null;
    return Object.freeze({ ordered_stage: index + 1, migration_id: source.migration_id,
      source_fingerprint: source.dual_principal_semantic_catalog_fingerprint,
      real_fingerprint: candidate.candidate_expected_fingerprint,
      status: "MATCH_EXACTLY" as const });
  });
  if (rows.some((row) => row === null)) return null;
  const identities = exactCandidates.map(candidateIdentity);
  const setDigest = createFarmOsDay150ExpectedCatalogCandidateSetDigest(identities);
  return setDigest ? Object.freeze({ status: "MATCH_EXACTLY" as const,
    rows: Object.freeze(rows as readonly Exclude<(typeof rows)[number], null>[]),
    candidate_identity_digests: Object.freeze(exactCandidates.map((candidate) =>
      candidate.candidate_identity_digest)), candidate_set_digest: setDigest }) : null;
}
