import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_ARTIFACT_PATH,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
  loadFarmOsProductionIdentityQueryV4Artifact,
  verifyFarmOsProductionIdentityQueryV4ArtifactBytes,
} from "../../src/lib/hermes/farm_os_production_identity_query_v4_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
} from "../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
  loadFarmOsProductionIdentityQueryV3Artifact,
} from "../../src/lib/hermes/farm_os_production_identity_query_v3_authority";

const bytes = readFileSync(FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_ARTIFACT_PATH);
const computed = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
assert.equal(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256);
assert.notEqual(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256);
assert.notEqual(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256);

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE, {
  authority_id: "farmos.production-target-identity-query.v4",
  version: "v4",
  purpose: "production_target_identity_collection",
  result_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  supersedes: "farmos.production-target-identity-query.v3",
  adoption_status: "NOT_ADOPTED",
  review_status: "CANDIDATE_FOR_APPROVAL",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_enabled: false,
  automatic_latest_selection: false,
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_ARTIFACT_PATH,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
});

const v3 = loadFarmOsProductionIdentityQueryV3Artifact();
const v4 = loadFarmOsProductionIdentityQueryV4Artifact();
assert.equal(v3.status, "VERIFIED");
assert.equal(v4.status, "VERIFIED");
if (v3.status !== "VERIFIED" || v4.status !== "VERIFIED") {
  throw new Error("production_identity_query_artifact_not_verified");
}
assert.equal(v3.section_plan.length, 11);
assert.equal(v4.section_plan.length, 11);

const bySection = new Map(v4.section_plan.map((entry) => [entry.section_id, entry.statement_sql]));
const v3BySection = new Map(v3.section_plan.map((entry) => [entry.section_id, entry.statement_sql]));
for (const section of ["A_TRANSACTION_SERVER_GATE", "F_ACL_PRINCIPAL_INVENTORY",
  "G_MIGRATION_CATALOG_INVENTORY", "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT"] as const) {
  assert.equal(bySection.get(section), v3BySection.get(section));
}
for (const section of ["B_CLUSTER_IDENTITY_SOURCE", "D_OPERATOR_AUTHORITY",
  "H1_MIGRATION_HISTORY_EXISTENCE", "I_ACTIVITY_LOCK_AGGREGATES",
  "J_DATABASE_SIZE"] as const) {
  const historical = v3BySection.get(section)!;
  assert.equal(bySection.get(section), historical.replace(
    /\norder\s+by\s+row_key\s+collate\s+"C"\s*;$/iu, ";"));
  assert.doesNotMatch(bySection.get(section)!,
    /order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu);
}
const sectionC = bySection.get("C_SCHEMA_IDENTITY")!;
assert.equal(sectionC, v3BySection.get("C_SCHEMA_IDENTITY")!.replace(
  /order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu,
  'order by expected.schema_name collate "C";'));
assert.match(sectionC, /expected\.schema_name\s+as\s+row_key/iu);
assert.match(sectionC, /order\s+by\s+expected\.schema_name\s+collate\s+"C"\s*;$/iu);
const sectionE = bySection.get("E_INSTALLATION_FARM_BINDING_AVAILABILITY")!;
assert.equal(sectionE, v3BySection.get("E_INSTALLATION_FARM_BINDING_AVAILABILITY")!.replace(
  /order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu,
  'order by expected.binding_name collate "C";'));
assert.match(sectionE, /expected\.binding_name\s+as\s+row_key/iu);
assert.match(sectionE, /order\s+by\s+expected\.binding_name\s+collate\s+"C"\s*;$/iu);
for (const section of ["B_CLUSTER_IDENTITY_SOURCE", "C_SCHEMA_IDENTITY",
  "D_OPERATOR_AUTHORITY", "E_INSTALLATION_FARM_BINDING_AVAILABILITY",
  "H1_MIGRATION_HISTORY_EXISTENCE", "I_ACTIVITY_LOCK_AGGREGATES",
  "J_DATABASE_SIZE"] as const) {
  assert.doesNotMatch(bySection.get(section)!, /order\s+by\s+row_key\s+collate\s+"C"/iu);
}
for (const section of ["F_ACL_PRINCIPAL_INVENTORY", "G_MIGRATION_CATALOG_INVENTORY",
  "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT"] as const) {
  assert.match(bySection.get(section)!, /order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu);
}

const executableTokens = Buffer.from(v4.raw_bytes).toString("utf8")
  .replace(/--[^\n]*/gu, " ").replace(/'(?:''|[^'])*'/gu, " ");
assert.doesNotMatch(executableTokens,
  /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|call|do|copy)\b/iu);
assert.doesNotMatch(executableTokens, /\bset\s+role\b|\bexecute\b/iu);
assert.doesNotMatch(Buffer.from(v4.raw_bytes).toString("utf8"),
  /\b(?:dblink|http|inet_server_addr|inet_server_port|inet_client_addr|inet_client_port)\b/iu);

const drifted = Buffer.from(v4.raw_bytes);
drifted[drifted.length - 1] = drifted[drifted.length - 1] === 10 ? 32 : 10;
const rejected = verifyFarmOsProductionIdentityQueryV4ArtifactBytes(drifted);
assert.equal(rejected.status, "BLOCKED");
assert.equal(rejected.status === "BLOCKED" && rejected.reason, "ARTIFACT_SHA_MISMATCH");

console.log(JSON.stringify({
  result: "pass",
  authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
  remediated_section_count: 7,
  preserved_section_count: 4,
  runtime_binding_changes: 0,
  production_operations: 0,
}));
