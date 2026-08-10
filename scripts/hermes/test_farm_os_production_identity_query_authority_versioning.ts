import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_SUPERSESSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE_SUPERSESSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE_SUPERSESSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE_SUPERSESSION,
  FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY,
  resolveFarmOsProductionIdentityQueryAuthority,
} from "../../src/lib/hermes/farm_os_stable_changes_migration_reconciliation";

const V1_ID = "farmos.production-target-identity-query.v1";
const V1_SHA256 =
  "sha256:dbfb404355fd7c09f6d712d5e143d4fa53f53b3bcfd040c063733ef134a14ce8";
const V2_ID = "farmos.production-target-identity-query.v2";
const V2_SHA256 =
  "sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95";
const V2_ARTIFACT_PATH = "scripts/sql/farm_os_production_identity_readonly_v2.sql";
const V3_ID = "farmos.production-target-identity-query.v3";
const V3_SHA256 =
  "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81";
const V3_ARTIFACT_PATH = "scripts/sql/farm_os_production_identity_readonly_v3.sql";
const V4_ID = "farmos.production-target-identity-query.v4";
const V4_SHA256 =
  "sha256:e83987c840cc941cf5e6dcff93d46345464db0019ea5beb5143b0222316e05ca";
const V4_ARTIFACT_PATH = "scripts/sql/farm_os_production_identity_readonly_v4.sql";
const V5_ID = "farmos.production-target-identity-query.v5";
const V5_SHA256 =
  "sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52";
const V5_ARTIFACT_PATH = "scripts/sql/farm_os_production_identity_readonly_v5.sql";
const REJECTED_SHA256 = [
  "sha256:9d0f2cc06474fb30a20be879001ac12a0d0e710927e870eaac611e0ff117dc1f",
  "sha256:e4b525a0e24a719f222536c8bf10f165f68b75ffeb2321a735119bfbd00fdc90",
  "sha256:cab18bb51b0abc6fe4face62c2adf00140c0a9ba9cbcf184d80465a799fcd68f",
] as const;

const v1 = resolveFarmOsProductionIdentityQueryAuthority(V1_ID);
const v2 = resolveFarmOsProductionIdentityQueryAuthority(V2_ID);
const v3 = resolveFarmOsProductionIdentityQueryAuthority(V3_ID);
const v4 = resolveFarmOsProductionIdentityQueryAuthority(V4_ID);
const v5 = resolveFarmOsProductionIdentityQueryAuthority(V5_ID);
assert.ok(v1);
assert.ok(v2);
assert.ok(v3);
assert.ok(v4);
assert.ok(v5);

assert.equal(v1.authority_id, V1_ID);
assert.equal(v1.query_sha256, V1_SHA256);
assert.equal(v1.purpose, "production_target_identity_collection");
assert.equal(v1.contract_version, "farmos.production-target-live-evidence.v1");
assert.equal(v1.tracked_preimage_available, false);
assert.equal(v1.historical_status, "LEGACY_UNMATERIALIZED_AUTHORITY");
assert.equal(v1.runtime_binding_status, "ACTIVE_RUNTIME_BINDING");

assert.equal(v2.authority_id, V2_ID);
assert.equal(v2.version, "v2");
assert.equal(v2.adoption_status, "ADOPTED");
assert.equal(v2.review_status, "APPROVED");
assert.equal(v2.query_sha256, V2_SHA256);
assert.equal(v2.supersedes, V1_ID);
assert.equal(v2.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.notEqual(v1.query_sha256, v2.query_sha256);

assert.equal(v3.authority_id, V3_ID);
assert.equal(v3.version, "v3");
assert.equal(v3.adoption_status, "NOT_ADOPTED");
assert.equal(v3.review_status, "CANDIDATE_FOR_APPROVAL");
assert.equal(v3.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.equal(v3.execution_enabled, false);
assert.equal(v3.automatic_latest_selection, false);
assert.equal(v3.query_sha256, V3_SHA256);
assert.equal(v3.supersedes, V2_ID);
assert.equal(v3.superseded_by, V4_ID);

assert.equal(v4.authority_id, V4_ID);
assert.equal(v4.version, "v4");
assert.equal(v4.adoption_status, "NOT_ADOPTED");
assert.equal(v4.review_status, "CANDIDATE_FOR_APPROVAL");
assert.equal(v4.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.equal(v4.execution_enabled, false);
assert.equal(v4.automatic_latest_selection, false);
assert.equal(v4.query_sha256, V4_SHA256);
assert.equal(v4.supersedes, V3_ID);
assert.equal(v4.superseded_by, V5_ID);

assert.equal(v5.authority_id, V5_ID);
assert.equal(v5.version, "v5");
assert.equal(v5.adoption_status, "NOT_ADOPTED");
assert.equal(v5.review_status, "CANDIDATE_FOR_APPROVAL");
assert.equal(v5.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.equal(v5.execution_enabled, false);
assert.equal(v5.automatic_latest_selection, false);
assert.equal(v5.query_sha256, V5_SHA256);
assert.equal(v5.supersedes, V4_ID);

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_SUPERSESSION, {
  predecessor_authority_id: V1_ID,
  successor_authority_id: V2_ID,
  relationship: "REPOSITORY_AUTHORITY_SUPERSESSION",
  runtime_binding_effect: "NONE",
});
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE_SUPERSESSION, {
  predecessor_authority_id: V2_ID,
  successor_candidate_id: V3_ID,
  relationship: "CANDIDATE_SUPERSESSION_PROPOSAL",
  runtime_binding_effect: "NONE",
  authority_transition_effect: "NONE",
});
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE_SUPERSESSION, {
  predecessor_candidate_id: V3_ID,
  successor_candidate_id: V4_ID,
  relationship: "CANDIDATE_SUPERSESSION_PROPOSAL",
  runtime_binding_effect: "NONE",
  authority_transition_effect: "NONE",
});
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE_SUPERSESSION, {
  predecessor_candidate_id: V4_ID,
  successor_candidate_id: V5_ID,
  relationship: "CANDIDATE_SUPERSESSION_PROPOSAL",
  runtime_binding_effect: "NONE",
  authority_transition_effect: "NONE",
});

const authorityIds = FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES.map(
  (authority) => authority.authority_id,
);
assert.equal(new Set(authorityIds).size, authorityIds.length);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES), true);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES.every(Object.isFrozen), true);

const artifactBytes = readFileSync(V2_ARTIFACT_PATH);
const artifactSha256 = `sha256:${createHash("sha256").update(artifactBytes).digest("hex")}`;
assert.equal(v2.query_artifact_path, V2_ARTIFACT_PATH);
assert.equal(artifactSha256, V2_SHA256);
assert.equal(v2.query_sha256, artifactSha256);
const v3ArtifactBytes = readFileSync(V3_ARTIFACT_PATH);
const v3ArtifactSha256 =
  `sha256:${createHash("sha256").update(v3ArtifactBytes).digest("hex")}`;
assert.equal(v3.query_artifact_path, V3_ARTIFACT_PATH);
assert.equal(v3ArtifactSha256, V3_SHA256);
assert.equal(v3.query_sha256, v3ArtifactSha256);
assert.notEqual(v3.query_sha256, v2.query_sha256);
const v4ArtifactBytes = readFileSync(V4_ARTIFACT_PATH);
const v4ArtifactSha256 =
  `sha256:${createHash("sha256").update(v4ArtifactBytes).digest("hex")}`;
assert.equal(v4.query_artifact_path, V4_ARTIFACT_PATH);
assert.equal(v4ArtifactSha256, V4_SHA256);
assert.equal(v4.query_sha256, v4ArtifactSha256);
assert.notEqual(v4.query_sha256, v3.query_sha256);
const v5ArtifactBytes = readFileSync(V5_ARTIFACT_PATH);
const v5ArtifactSha256 =
  `sha256:${createHash("sha256").update(v5ArtifactBytes).digest("hex")}`;
assert.equal(v5.query_artifact_path, V5_ARTIFACT_PATH);
assert.equal(v5ArtifactSha256, V5_SHA256);
assert.equal(v5.query_sha256, v5ArtifactSha256);
assert.notEqual(v5.query_sha256, v4.query_sha256);
for (const rejectedSha256 of REJECTED_SHA256) {
  assert.equal(
    FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES.some(
      (authority) => String(authority.query_sha256) === rejectedSha256,
    ),
    false,
  );
}

assert.equal(FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.query_authority_id, V1_ID);
assert.equal(FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.expected_query_sha256, V1_SHA256);
assert.equal(resolveFarmOsProductionIdentityQueryAuthority("farmos.production-target-identity-query.v0"), null);
assert.equal(resolveFarmOsProductionIdentityQueryAuthority("latest"), null);
assert.equal(resolveFarmOsProductionIdentityQueryAuthority("highest"), null);

console.log(JSON.stringify({
  result: "pass",
  repository_authority: V2_ID,
  candidate_authority: V5_ID,
  runtime_binding: V1_ID,
  production_operations: 0,
}));
