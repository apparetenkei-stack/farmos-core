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
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  remediated_section_count: 1,
  preserved_section_count: 10,
  runtime_binding_changes: 0,
  production_operations: 0,
}));
