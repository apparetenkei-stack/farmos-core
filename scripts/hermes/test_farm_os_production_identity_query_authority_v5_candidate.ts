import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  loadFarmOsProductionIdentityQueryV5Artifact,
  verifyFarmOsProductionIdentityQueryV5ArtifactBytes,
} from "../../src/lib/hermes/farm_os_production_identity_query_v5_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION_RUNTIME_ASSERTIONS,
} from "../../src/lib/hermes/farm_os_production_identity_query_v5_adoption";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS,
} from "../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
  loadFarmOsProductionIdentityQueryV4Artifact,
} from "../../src/lib/hermes/farm_os_production_identity_query_v4_authority";

const bytes = readFileSync(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH);
const computed = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
assert.equal(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256);
assert.notEqual(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256);
assert.notEqual(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256);

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE, {
  authority_id: "farmos.production-target-identity-query.v5",
  version: "v5",
  purpose: "production_target_identity_collection",
  result_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  supersedes: "farmos.production-target-identity-query.v4",
  adoption_status: "NOT_ADOPTED",
  review_status: "CANDIDATE_FOR_APPROVAL",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_enabled: false,
  automatic_latest_selection: false,
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
});

const adoption = FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION;
assert.equal(adoption.authority_id, FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id);
assert.equal(adoption.version, "v5");
assert.equal(adoption.artifact_sha256, FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256);
assert.equal(adoption.review_status, "APPROVED");
assert.equal(adoption.adoption_status, "ADOPTED");
assert.equal(adoption.repository_status, "CURRENT_REPOSITORY_AUTHORITY");
assert.equal(adoption.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.equal(adoption.execution_enabled, false);
assert.equal(adoption.automatic_latest_selection, false);
assert.equal(adoption.runtime_effect, "NONE");
assert.equal(adoption.production_execution_effect, "NONE");
assert.equal(adoption.human_approval_status, "RECEIVED");

const qualification = adoption.qualification;
assert.equal(qualification.status, "ESTABLISHED");
assert.equal(
  qualification.qualification_source_commit,
  "4cfaa0455808b4197095cf2dc93f3940a8eb57c8",
);
assert.equal(
  qualification.executor_authority,
  "farmos.production-identity-postgres-isolated-qualification-executor.v4",
);
assert.equal(
  qualification.executor_lineage,
  "farmos.production-identity-postgres-qualification-executor-lineage.v4",
);
assert.equal(
  qualification.executor_source_sha256,
  "sha256:749888c7d82c587d274e270b43b0e82521064cadae3600798e8bf8b1aad96b74",
);
assert.equal(qualification.success_evidence_version, "v4");
assert.equal(
  qualification.bootstrap_authority,
  "farmos.production-postgres-version-bootstrap-query.v1",
);
assert.equal(qualification.query_authority, adoption.authority_id);
assert.equal(qualification.query_sha256, FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256);
assert.equal(qualification.six_record_count, 6);
assert.equal(qualification.failure_count, 0);
assert.equal(qualification.cleanup_success_count, 6);
assert.deepEqual(qualification.targeted_regressions, { passed: 10, total: 10, status: "PASS" });
assert.deepEqual(qualification.typechecks, { passed: 9, total: 9, status: "PASS" });
assert.equal(qualification.sol_technical_qualification, "GO");
assert.equal(qualification.scope, "EXACT_OBSERVED_BASELINE_ONLY");
assert.equal(qualification.future_pg16_patches_qualified, false);
assert.equal(qualification.future_pg17_patches_qualified, false);
assert.equal(qualification.future_image_bytes_qualified, false);
assert.equal(qualification.docker_tag_alone_sufficient, false);
assert.equal(qualification.postgres_18_plus_status, "UNREVIEWED");

assert.deepEqual(qualification.postgres_baselines, [
  {
    postgres_major: 14,
    server_version_num: 140023,
    status: "NOT_ELIGIBLE",
    image_tag: "postgres:14",
    image_id: "sha256:2f439458ab6a57a925825ae14f9d06910e4fe4a41c8d4a0ae06397e65b707e1b",
    image_repo_digest:
      "postgres@sha256:2f439458ab6a57a925825ae14f9d06910e4fe4a41c8d4a0ae06397e65b707e1b",
    evidence_record_count: 1,
  },
  {
    postgres_major: 15,
    server_version_num: 150018,
    status: "NOT_ELIGIBLE",
    image_tag: "postgres:15",
    image_id: "sha256:6eb0add3b77c081df18aa518ce43df58fdcc40f2e6d868a6fd08038dc7acd425",
    image_repo_digest:
      "postgres@sha256:6eb0add3b77c081df18aa518ce43df58fdcc40f2e6d868a6fd08038dc7acd425",
    evidence_record_count: 1,
  },
  {
    postgres_major: 16,
    server_version_num: 160014,
    status: "QUALIFIED_BASELINE",
    cases: ["absent", "present"],
    image_tag: "postgres:16",
    image_id: "sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b",
    image_repo_digest:
      "postgres@sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b",
    evidence_record_count: 2,
  },
  {
    postgres_major: 17,
    server_version_num: 170010,
    status: "QUALIFIED_BASELINE",
    cases: ["absent", "present"],
    image_tag: "postgres:17",
    image_id: "sha256:5c855ad7b85e68e48a62f34662853f38b57c1c1d80f3a927ab58034fd6d31c5e",
    image_repo_digest:
      "postgres@sha256:5c855ad7b85e68e48a62f34662853f38b57c1c1d80f3a927ab58034fd6d31c5e",
    evidence_record_count: 2,
  },
]);

assert.deepEqual(adoption.resolved_blockers, {
  BLOCKED_POSTGRES_COMPATIBILITY: "RESOLVED",
  BLOCKED_POSTGRES_QUALIFICATION_INTEGRITY: "RESOLVED",
  BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
  PRODUCTION_TARGET_MANIFEST_REQUIRED: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
  BLOCKED_CONNECTION_AUTHORITY: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
  EXECUTION_APPROVAL_LINEAGE_REQUIRED: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
  PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_REQUIRED:
    "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
  PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED:
    "RESOLVED_BY_DAY150_EXACT_FIVE_PRODUCT_OWNER_PROMOTION",
  PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
  basis: "EXACT_SIX_RECORD_QUALIFICATION_BASELINE",
});
assert.deepEqual(adoption.remaining_blockers, [
  "BLOCKED_PROVIDER_CAPACITY_DESIGN",
]);

assert.equal(
  adoption.requalification_policy.query_artifact_byte_or_sha_change,
  "NEW_AUTHORITY_AND_FULL_REQUALIFICATION",
);
assert.equal(
  adoption.requalification_policy.executor_parser_or_lineage_semantic_change,
  "BASELINE_STALE_AND_FULL_SIX_RECORD_REQUALIFICATION",
);
assert.equal(
  adoption.requalification_policy.fixture_grant_or_principal_semantic_change,
  "FULL_SIX_RECORD_REQUALIFICATION",
);
assert.equal(
  adoption.requalification_policy.digest_bound_source_change,
  "FULL_SIX_RECORD_REQUALIFICATION",
);
assert.equal(
  adoption.requalification_policy.new_postgres_major,
  "UNREVIEWED_QUALIFICATION_REQUIRED",
);
assert.equal(
  adoption.requalification_policy.image_id_or_repo_digest_change,
  "OUT_OF_BASELINE_REVIEW_REQUIRED",
);
assert.equal(
  adoption.requalification_policy.image_identity_change_automatically_revokes_repository_adoption,
  false,
);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION_RUNTIME_ASSERTIONS, {
  V5_AUTHORITY_ADOPTED: true,
  V5_RUNTIME_BOUND: false,
  V5_EXECUTION_ENABLED: false,
  automatic_latest: false,
  credential_resolver_calls: 0,
  connection_calls: 0,
  collector_calls: 0,
  production_database_operations: 0,
});
assert.equal(adoption.executor_boundary, "ISOLATED_TECHNICAL_QUALIFICATION_ONLY");
assert.equal(adoption.production_collector_authorized, false);
assert.equal(adoption.production_read_client_authorized, false);
assert.equal(adoption.fixture_privilege_semantics.history_absent.schema_usage_required, false);
assert.equal(adoption.fixture_privilege_semantics.history_absent.history_select_required, false);
assert.equal(adoption.fixture_privilege_semantics.history_present.schema_usage_required, true);
assert.equal(adoption.fixture_privilege_semantics.history_present.history_select_required, true);
assert.equal(adoption.fixture_privilege_semantics.automatic_production_provisioning, false);

const v4 = loadFarmOsProductionIdentityQueryV4Artifact();
const v5 = loadFarmOsProductionIdentityQueryV5Artifact();
assert.equal(v4.status, "VERIFIED");
assert.equal(v5.status, "VERIFIED");
if (v4.status !== "VERIFIED" || v5.status !== "VERIFIED") {
  throw new Error("production_identity_query_artifact_not_verified");
}
assert.equal(v4.section_plan.length, 11);
assert.equal(v5.section_plan.length, 11);

const v4BySection = new Map(v4.section_plan.map((entry) => [entry.section_id, entry.statement_sql]));
const v5BySection = new Map(v5.section_plan.map((entry) => [entry.section_id, entry.statement_sql]));
for (const section of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SECTIONS) {
  if (section !== "H1_MIGRATION_HISTORY_EXISTENCE") {
    assert.equal(v5BySection.get(section), v4BySection.get(section), section);
  }
}
const h1 = v5BySection.get("H1_MIGRATION_HISTORY_EXISTENCE")!;
assert.notEqual(h1, v4BySection.get("H1_MIGRATION_HISTORY_EXISTENCE"));
assert.doesNotMatch(h1, /\bto_regclass\b/iu);
assert.match(h1, /from\s+pg_catalog\.pg_namespace\s+as\s+namespace/iu);
assert.match(h1, /join\s+pg_catalog\.pg_class\s+as\s+class\s+on\s+class\.relnamespace\s*=\s*namespace\.oid/iu);
assert.match(h1, /namespace\.nspname\s*=\s*'core_schema'/iu);
assert.match(h1, /class\.relname\s*=\s*'migration_history'/iu);
assert.match(h1, /class\.relkind\s+in\s*\(\s*'r'\s*,\s*'p'\s*\)/iu);
assert.match(h1, /'state'\s*,\s*case\s+when\s+exists/iu);
assert.match(h1, /then\s+'present'\s+else\s+'absent'\s+end/iu);
assert.match(h1, /'collection_status'\s*,\s*'complete'/iu);
assert.match(h1, /'relation'\s*,\s*'core_schema\.migration_history'/iu);
assert.doesNotMatch(h1, /\bsearch_path\b|\bexecute\b|\bformat\s*\(/iu);

const executableTokens = Buffer.from(v5.raw_bytes).toString("utf8")
  .replace(/--[^\n]*/gu, " ").replace(/'(?:''|[^'])*'/gu, " ");
assert.doesNotMatch(executableTokens,
  /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|call|do|copy)\b/iu);
assert.doesNotMatch(executableTokens, /\bset\s+role\b|\bexecute\b/iu);
assert.doesNotMatch(Buffer.from(v5.raw_bytes).toString("utf8"),
  /\b(?:dblink|http|inet_server_addr|inet_server_port|inet_client_addr|inet_client_port)\b/iu);

const drifted = Buffer.from(v5.raw_bytes);
drifted[drifted.length - 1] = drifted[drifted.length - 1] === 10 ? 32 : 10;
const rejected = verifyFarmOsProductionIdentityQueryV5ArtifactBytes(drifted);
assert.equal(rejected.status, "BLOCKED");
assert.equal(rejected.status === "BLOCKED" && rejected.reason, "ARTIFACT_SHA_MISMATCH");

console.log(JSON.stringify({
  result: "pass",
  authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
  adoption_status: adoption.adoption_status,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  remediated_section_count: 1,
  preserved_section_count: 10,
  runtime_binding_changes: 0,
  production_operations: 0,
}));
