import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ADOPTION_LINEAGE,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_VERSION_POLICY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_AUTHORITY_BOUNDARY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_RESULT_CONTRACT_VERSION,
  loadFarmOsProductionPostgresBootstrapQueryArtifact,
  parseFarmOsProductionPostgresBootstrapQueryAuthority,
  parseFarmOsProductionPostgresBootstrapResult,
  parseFarmOsProductionPostgresBootstrapResultSet,
  resolveFarmOsProductionPostgresBootstrapQueryAuthority,
  verifyFarmOsProductionPostgresBootstrapQueryArtifactBytes,
} from "../../src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY,
} from "../../src/lib/hermes/farm_os_stable_changes_migration_reconciliation";
import {
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY as QUALIFICATION_BOOTSTRAP_AUTHORITY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE,
} from "./lib/farm_os_production_identity_postgres_qualification_contract";

const artifactBytes = readFileSync(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH);
const artifactSql = artifactBytes.toString("utf8");
const artifactSha = `sha256:${createHash("sha256").update(artifactBytes).digest("hex")}`;

assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  "farmos.production-postgres-version-bootstrap-query.v1");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.version, "v1");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.purpose, "postgres_compatibility_preflight");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.query_artifact_path,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.query_sha256,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.review_status, "APPROVED");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.adoption_status, "ADOPTED");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.execution_authorized, false);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.automatic_latest_selection, false);
assert.deepEqual(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.result_contract, {
  contract_version: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_RESULT_CONTRACT_VERSION,
  row_count: 1,
  column_count: 1,
  exact_columns: ["server_version_num"],
  column_type: "SAFE_NON_NEGATIVE_INTEGER",
  coercion_allowed: false,
  unknown_columns_allowed: false,
});

assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.status, "CANDIDATE_FOR_APPROVAL");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.authority_status, "REQUIRED_NOT_APPROVED");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.repository_authority_adopted, false);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.sha256,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.source_foundation_commit,
  "5713ecfa2cdbcecb2e14fa47946424bca7b353ff");
assert.deepEqual(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.source_foundation_sol_review, {
  result: "GO", p1: 0, p2: 0, p3: 1,
  evidence_class: "SESSION_REVIEW_FACT_NOT_ADOPTION_AUTHORITY",
});
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY);
assert.equal(QUALIFICATION_BOOTSTRAP_AUTHORITY, FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY);
assert.deepEqual(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ADOPTION_LINEAGE, {
  authority_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  candidate_status: "CANDIDATE_FOR_APPROVAL",
  candidate_authority_status: "REQUIRED_NOT_APPROVED",
  candidate_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256,
  review_status: "APPROVED",
  adoption_status: "ADOPTED",
  runtime_binding_effect: "NONE",
  execution_authorization_effect: "NONE",
  candidate_history_preserved: true,
});

assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES.length, 1);
assert.equal(new Set(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES.map(
  (authority) => authority.authority_id)).size, 1);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES), true);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY), true);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.result_contract), true);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.result_contract.exact_columns), true);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY), true);
assert.equal(Object.isFrozen(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY.source_foundation_sol_review), true);
assert.equal(resolveFarmOsProductionPostgresBootstrapQueryAuthority(
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID), FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY);
assert.equal(resolveFarmOsProductionPostgresBootstrapQueryAuthority(
  "farmos.production-postgres-version-bootstrap-query.v2"), null);
assert.equal(parseFarmOsProductionPostgresBootstrapQueryAuthority(
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY), FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY);
assert.equal(parseFarmOsProductionPostgresBootstrapQueryAuthority({
  ...FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
  query_sha256: `sha256:${"f".repeat(64)}`,
}), null);
assert.equal(parseFarmOsProductionPostgresBootstrapQueryAuthority({
  ...FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
  query_artifact_path: "scripts/sql/caller-supplied.sql",
}), null);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_VERSION_POLICY.same_version_digest_overwrite, "FORBIDDEN");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_VERSION_POLICY.changed_bytes_require_authority_version, "v2");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_VERSION_POLICY.automatic_latest_selection, false);
assert.deepEqual(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_AUTHORITY_BOUNDARY, {
  repository_authority_source_of_truth:
    "src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority.ts",
  runtime_foundation_compatibility_requirement_class: "DEFAULT_DISABLED_RUNTIME_SNAPSHOT",
  runtime_snapshot_may_decide_repository_adoption: false,
  repository_adoption_implies_runtime_binding: false,
  repository_adoption_implies_execution_authorization: false,
  technical_qualification_status: "NOT_RUN",
  blocked_postgres_compatibility: true,
});

assert.equal(artifactBytes.byteLength, 77);
assert.equal(artifactSql, "SELECT current_setting('server_version_num')::integer AS server_version_num;\n");
assert.equal(artifactSha, FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256);
assert.equal(artifactSql.includes("\r"), false);
assert.equal(artifactSql.endsWith("\n"), true);
assert.match(artifactSql, /^SELECT\b/u);
assert.doesNotMatch(artifactSql, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|EXECUTE|CALL|DO|COPY)\b/iu);
assert.doesNotMatch(artifactSql, /\b(?:FROM|JOIN|WHERE|inet_|pg_stat_activity|pg_roles|pg_authid|dblink|http)\b/iu);

const loaded = loadFarmOsProductionPostgresBootstrapQueryArtifact();
assert.equal(loadFarmOsProductionPostgresBootstrapQueryArtifact.length, 0);
assert.equal(loaded.status, "VERIFIED");
if (loaded.status !== "VERIFIED") throw new Error("formal_bootstrap_artifact_not_verified");
assert.equal(loaded.sha256, FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256);
assert.equal(loaded.byte_count, 77);
const callerSupplied = (loadFarmOsProductionPostgresBootstrapQueryArtifact as
  (...args: unknown[]) => ReturnType<typeof loadFarmOsProductionPostgresBootstrapQueryArtifact>)(artifactSql);
assert.deepEqual(callerSupplied, {
  status: "BLOCKED",
  reason: "CALLER_INPUT_FORBIDDEN",
  artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
  actual_sha256: null,
});
assert.deepEqual(verifyFarmOsProductionPostgresBootstrapQueryArtifactBytes(null), {
  status: "BLOCKED",
  reason: "ARTIFACT_MISSING",
  artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
  actual_sha256: null,
});
const modifiedBytes = Buffer.from(artifactBytes);
modifiedBytes[modifiedBytes.length - 1] = 32;
const modified = verifyFarmOsProductionPostgresBootstrapQueryArtifactBytes(modifiedBytes);
assert.equal(modified.status, "BLOCKED");
assert.equal(modified.status === "BLOCKED" && modified.reason, "ARTIFACT_SHA_MISMATCH");

assert.deepEqual(parseFarmOsProductionPostgresBootstrapResult({ server_version_num: 170004 }), {
  server_version_num: 170004,
  postgres_major: 17,
});
assert.deepEqual(parseFarmOsProductionPostgresBootstrapResultSet([{ server_version_num: 160012 }]), {
  server_version_num: 160012,
  postgres_major: 16,
});
for (const invalid of [
  [], [{ server_version_num: 160000 }, { server_version_num: 160000 }],
  {}, { server_version_num: "160000" }, { server_version_num: 160000, extra: true },
  { server_version_num: -1 }, { server_version_num: 1.5 }, { server_version_num: Number.NaN },
  { server_version_num: Number.POSITIVE_INFINITY }, { server_version_num: Number.MAX_SAFE_INTEGER + 1 },
]) assert.equal(Array.isArray(invalid)
  ? parseFarmOsProductionPostgresBootstrapResultSet(invalid)
  : parseFarmOsProductionPostgresBootstrapResult(invalid), null);

// This is an unchanged, default-disabled runtime-foundation snapshot, not the Repository Authority SOT.
assert.equal(FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.authority_status, "REQUIRED_NOT_APPROVED");
assert.equal(FARM_OS_PRODUCTION_IDENTITY_BOOTSTRAP_COMPATIBILITY_REQUIREMENT.authority_id, null);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.enabled, false);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.execution_state, "EXECUTION_DISABLED");
assert.equal(FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.query_authority_id,
  "farmos.production-target-identity-query.v1");

console.log(JSON.stringify({
  result: "pass",
  repository_authority: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  adoption_status: "ADOPTED",
  runtime_binding: "NOT_RUNTIME_BOUND",
  technical_qualification_status: "NOT_RUN",
  production_operations: 0,
}));
