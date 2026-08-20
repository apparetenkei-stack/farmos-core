import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FARM_OS_DAY150_SOURCE_QUALIFICATION_V1_REJECTED_CLASSIFICATION,
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V1_PATH,
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V2_PATH,
  compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates,
  createFarmOsDay150SourceQualifiedFiveRowMetricsEvidence,
  createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2,
  parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidence,
  parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2,
} from "../../src/lib/hermes/farm_os_day150_prefix_source_qualified_metrics_evidence";
import {
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_DIGEST,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS,
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS,
  createFarmOsDay150ApprovedExpectedCatalogBindingDigest,
  loadFarmOsDay150ApprovedExpectedCatalogExact,
  readFarmOsDay150ApprovedExpectedCatalog,
  validateFarmOsDay150ExactFiveRepositoryPromotion,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const fixture = {
  qualified_at: "2026-08-20T06:00:00.000Z",
  frozen_v13_executable_source_digest:
    "sha256:b8a95697a2439a31d180706878ceb1c66171ba563e82037bf18518f382bccfa6",
  gate17_scope_digest:
    "sha256:5ca2bf142fe5d22af62e6aecd1db3ce2296b531a36891c9ff7d7f48d704cec01",
  initial_catalog_authority_id: "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2",
  initial_catalog_digest:
    "sha256:da63dc34aeb3583a681df02dd46448a48e021d91e5110ff221e980a1fd22cce5",
  bootstrap_plan_digest:
    "sha256:024f2566ec005dfa4fdd1ef53e26aad17033b9f44cf2d5bd38bee266d754bc36",
  reference_postgres_major: 17,
  reference_image:
    "docker.io/library/postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317",
  metrics: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec, index) => ({
    migration_id: spec.migration_id, migration_sha256: spec.artifact_sha256,
    catalog_fingerprint: `sha256:${String(index + 1).repeat(64)}`,
    normalized_snapshot_digest: `sha256:${String(index + 5).repeat(64)}`,
    object_count: index + 1, object_universe_digest: spec.object_universe_digest,
    catalog_query_sha256: spec.catalog_query_sha256,
  })),
  cleanup: { container_name: "qualification-container", container_state: "ABSENT",
    volume_name: "qualification-volume", volume_state: "ABSENT",
    network_name: "qualification-network", network_state: "ABSENT",
    unrelated_resource_operations: 0 },
} as const;
const evidence = createFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(fixture);
assert.ok(evidence);
assert.deepEqual(parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(evidence), evidence);
assert.equal(parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidence({
  ...evidence, evidence_classification: "EXPECTED_CATALOG_CANDIDATE",
}), null);
assert.equal(createFarmOsDay150SourceQualifiedFiveRowMetricsEvidence({
  ...fixture, metrics: fixture.metrics.map((row, index) => index === 0
    ? { ...row, migration_sha256: `sha256:${"f".repeat(64)}` } : row),
}), null);
assert.equal(createFarmOsDay150SourceQualifiedFiveRowMetricsEvidence({
  ...fixture, cleanup: { ...fixture.cleanup, volume_state: "PRESENT" },
}), null);

const repositoryRoot = resolve(process.cwd());
const v1Path = resolve(repositoryRoot, FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V1_PATH);
const v1Bytes = readFileSync(v1Path);
assert.equal(`sha256:${createHash("sha256").update(v1Bytes).digest("hex")}`,
  "sha256:310c7d32e0e3d70037e565c28ddfe7a056ce923c011d045f1b143982218b61d0");
const v1 = parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidence(JSON.parse(v1Bytes.toString()));
assert.equal(v1?.evidence_digest,
  "sha256:e3eea2a7ddf2e035b8057fa16a90929a3e4bed002bb7602ee5cc6a019d531601");
assert.equal(FARM_OS_DAY150_SOURCE_QUALIFICATION_V1_REJECTED_CLASSIFICATION,
  "SOURCE_QUALIFICATION_EVIDENCE_V1_REJECTED_FINGERPRINT_SEMANTICS");

const expectedSnapshots = [
  ["sha256:2499ac357cb34cd834583f7e702c2e439e948d06c11d58baabaa7a22a3fc72d8", 199],
  ["sha256:f2d8c32395cf55b017b09f8f096a8f472332cb87e59e6b4b4cf12144e42b97b6", 16],
  ["sha256:3d973ed89bae6781f374270c1de700d23f983fa694979172e100ebae63bb821d", 52],
  ["sha256:0f5edbf290ba9a748bcabbe858dce62eda43a2187940a627ad6c0dcb142f03fa", 216],
  ["sha256:33ab1aac0e899b349d02480e614bb9b87d26610029bb79868db65ebdd082eac9", 133],
] as const;
const realFingerprints = [
  "sha256:030ffa1d430403194f73810cf81e235a038776e97cf042d969b403658db0c9f1",
  "sha256:43c4a74d8822a920917b695023c42df25e3d8539aa45117282893647cdf0fa20",
  "sha256:8f6c5e9cf9c93d19e2c000b86685ee695bdf170e6f362d54b158e095d0e534d0",
  "sha256:9a8231ae859c8564f72caa714bc3cc12b43ccd96aee1bb182de9d78987e693e9",
  "sha256:81ded4ed893bbfe1303e603bc5427e080b78bd957479d46200a728328661edba",
] as const;
const v2Fixture = {
  qualified_at: "2026-08-20T07:00:00.000Z",
  post_v13_qualification_tooling_source_digest: `sha256:${"a".repeat(64)}`,
  gate17_scope_digest: fixture.gate17_scope_digest,
  initial_catalog_authority_id: fixture.initial_catalog_authority_id,
  initial_catalog_digest: fixture.initial_catalog_digest,
  bootstrap_plan_digest: fixture.bootstrap_plan_digest,
  reference_postgres_major: fixture.reference_postgres_major,
  reference_image: fixture.reference_image,
  metrics: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec, index) => ({
    migration_id: spec.migration_id, migration_sha256: spec.artifact_sha256,
    catalog_fingerprint: realFingerprints[index]!,
    normalized_snapshot_digest: expectedSnapshots[index]![0],
    object_count: expectedSnapshots[index]![1],
    object_universe_digest: spec.object_universe_digest,
    catalog_query_sha256: spec.catalog_query_sha256,
  })), cleanup: fixture.cleanup,
} as const;
const v2 = createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(v2Fixture);
assert.ok(v2);
assert.deepEqual(parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(v2), v2);
assert.equal(createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2({
  ...v2Fixture, metrics: v2Fixture.metrics.map((row, index) => index === 0
    ? { ...row, object_count: row.object_count + 1 } : row),
}), null, "unexpected non-fingerprint qualification values stop v2 publication");
assert.equal(createFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2({
  ...v2Fixture, post_v13_qualification_tooling_source_digest:
    fixture.frozen_v13_executable_source_digest,
}), null, "historical V13 and post-V13 tooling source identities remain distinct");

const candidates = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) =>
  JSON.parse(readFileSync(resolve(repositoryRoot, spec.output_path), "utf8")) as unknown);
const successReceipt = JSON.parse(readFileSync(resolve(repositoryRoot,
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v13/" +
  "reference-catalog-run-receipt-candidate.json"), "utf8")) as unknown;
const comparison = compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates(
  v2, candidates, successReceipt);
assert.equal(comparison?.status, "MATCH_EXACTLY");
assert.equal(comparison?.candidate_set_digest,
  "sha256:658b3765e28dd8050da393a167f812364887887bbe40fac7860206d9ccecaab2");
assert.equal(compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates({
  ...v2, rows: v2.rows.map((row, index) => index === 0 ? {
    ...row, dual_principal_semantic_catalog_fingerprint: `sha256:${"f".repeat(64)}` } : row),
}, candidates, successReceipt), null);
const actualV2Bytes = readFileSync(resolve(repositoryRoot,
  FARM_OS_DAY150_SOURCE_QUALIFIED_FIVE_ROW_METRICS_V2_PATH));
const actualV2 = parseFarmOsDay150SourceQualifiedFiveRowMetricsEvidenceV2(
  JSON.parse(actualV2Bytes.toString()));
assert.equal(actualV2?.evidence_digest,
  "sha256:f34b2609279cfb801e732c535181a05828815dcfbd40ba89292b31f41dbdf382");
assert.equal(`sha256:${createHash("sha256").update(actualV2Bytes).digest("hex")}`,
  "sha256:0cc277243f175531ee1a5592f2a411815a9c61b258aed786e7aaa293bde9086a");
const actualComparison = compareFarmOsDay150SourceQualifiedEvidenceV2ToExactFiveCandidates(
  actualV2, candidates, successReceipt);
assert.equal(actualComparison?.status, "MATCH_EXACTLY");
assert.equal(actualComparison?.candidate_set_digest,
  "sha256:658b3765e28dd8050da393a167f812364887887bbe40fac7860206d9ccecaab2");
assert.equal((successReceipt as { receipt_digest?: string }).receipt_digest,
  "sha256:11f9730704ec3dcd3fd1014c8e2b9ddbf292c910c5f3e301826f3bdf29613826");
assert.equal(validateFarmOsDay150ExactFiveRepositoryPromotion(), true);
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_DIGEST,
  "sha256:22a7c11942868a58d2fa5e58bc17cf7a0cd6a6f0e1857f6b5427f2eed071dc48");
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
  "product-owner/day150/exact-five/" +
  "5b0424f24a16fd21931d2e6dfe83a69524755e04449e3d0f43f5b7c3cb729d1a");
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.v13_success_receipt_digest,
  (successReceipt as { receipt_digest?: string }).receipt_digest);
assert.equal(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.source_qualification_evidence_digest,
  actualV2?.evidence_digest);
const approvedBindingDigests = FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.candidates.map(
  (candidate, index) => {
    assert.equal(candidate.candidate_identity_digest,
      (candidates[index] as { candidate_identity_digest?: string }).candidate_identity_digest);
    const capability = loadFarmOsDay150ApprovedExpectedCatalogExact({
      authority_id: `farmos.expected-catalog-fingerprint.${candidate.migration_id}.v1`,
      authority_revision: 1, migration_id: candidate.migration_id,
    });
    assert.ok(capability);
    const binding = readFarmOsDay150ApprovedExpectedCatalog(capability);
    assert.ok(binding);
    assert.equal(binding.approval_reference, FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE);
    assert.equal(binding.approved_at, "2026-08-20T06:43:00.000Z");
    return createFarmOsDay150ApprovedExpectedCatalogBindingDigest(binding);
  });
assert.equal(approvedBindingDigests.every((digest) => digest !== null), true);
assert.equal(new Set(approvedBindingDigests).size, 5);
const replay = spawnSync(process.execPath, ["--import", "tsx",
  "scripts/hermes/run_farm_os_day150_source_qualified_five_row_evidence.ts"], {
  cwd: repositoryRoot, encoding: "utf8", timeout: 10_000,
});
assert.notEqual(replay.status, 0);
assert.equal(replay.stdout, "");
assert.match(replay.stderr, /DAY150_SOURCE_QUALIFICATION_EVIDENCE_V2_ALREADY_PUBLISHED/u,
  "durable v2 presence rejects replay before qualification resource creation");
const expectedCandidateRawDigests = [
  "sha256:2778e14cf992015c8766bc111ffde086b724b14d12781aee6028f62d31ce6e83",
  "sha256:ad68d7363c5b5dfffed9df31cbeb99a552462ce448e0f535027cda5b1dc44d78",
  "sha256:16fa7cd759caeead98e5c8f3a2aa49fa81bfe1dd3fcdc04a46a6ea252533e0a1",
  "sha256:9fc5315e94a316b7c1247cdbc6f143ec45a0bbc27521be325ff6701fcfcb12d8",
  "sha256:5983e9dd2602dac749aff38e99c0771969641db68fcce70e055dc754cce74a97",
];
assert.deepEqual(FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) =>
  `sha256:${createHash("sha256").update(readFileSync(resolve(repositoryRoot, spec.output_path)))
    .digest("hex")}`), expectedCandidateRawDigests);
const documentation = readFileSync(resolve(repositoryRoot,
  "docs/architecture/day150-prefix-expected-catalog-reference-derivation.md"), "utf8");
for (const statement of ["V13_APPROVED_EXECUTED_EXACTLY_ONCE_SUCCESSFUL_NON_RUNNABLE",
  "EXACT_FIVE_CANDIDATES_PROMOTED_APPROVED", "SUCCESS_VALID_PRESENT", "TERMINAL_ABSENT",
  "ZERO_RESIDUAL_TRUE", "GATE17_PASS", "EXACT_PREFIX_EXPECTED_CATALOG_AUTHORITY_APPROVED",
  "SOURCE_QUALIFICATION_EVIDENCE_V1_REJECTED_FINGERPRINT_SEMANTICS",
  "farmos.pg-catalog-semantic-principal-fingerprint.v3"]) assert.ok(
  documentation.includes(statement), `documentation missing ${statement}`);
assert.equal(documentation.includes("V13_PROPOSED_NOT_AUTHORIZED"), false);
process.stdout.write(`${JSON.stringify({ status: "PASS", schema_cases: 10,
  v1_evidence_digest: v1.evidence_digest, v2_fixture_digest: v2.evidence_digest,
  exact_five: comparison?.status, external_operations: 0 })}\n`);
