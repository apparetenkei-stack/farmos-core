import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_ARTIFACT_PATH,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
  loadFarmOsProductionIdentityQueryV3Artifact,
  verifyFarmOsProductionIdentityQueryV3ArtifactBytes,
} from "../../src/lib/hermes/farm_os_production_identity_query_v3_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
} from "../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
  loadFarmOsProductionIdentityQueryV2Artifact,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_foundation";

const bytes = readFileSync(FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_ARTIFACT_PATH);
const computed = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
assert.equal(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256);
assert.notEqual(computed, FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256);

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE, {
  authority_id: "farmos.production-target-identity-query.v3",
  version: "v3",
  purpose: "production_target_identity_collection",
  result_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  supersedes: "farmos.production-target-identity-query.v2",
  adoption_status: "NOT_ADOPTED",
  review_status: "CANDIDATE_FOR_APPROVAL",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_enabled: false,
  automatic_latest_selection: false,
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_ARTIFACT_PATH,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
});

const v2 = loadFarmOsProductionIdentityQueryV2Artifact();
const v3 = loadFarmOsProductionIdentityQueryV3Artifact();
assert.equal(v2.status, "VERIFIED");
assert.equal(v3.status, "VERIFIED");
if (v2.status !== "VERIFIED" || v3.status !== "VERIFIED") {
  throw new Error("production_identity_query_artifact_not_verified");
}
assert.equal(v2.section_plan.length, 11);
assert.equal(v3.section_plan.length, 11);

const v2SectionA = v2.section_plan[0]!.statement_sql;
const v3SectionA = v3.section_plan[0]!.statement_sql;
assert.match(v2SectionA, /order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu);
assert.doesNotMatch(v3SectionA, /\border\s+by\b/iu);
assert.doesNotMatch(v3SectionA, /\b(?:from|with|union)\b/iu);
assert.equal((v3SectionA.match(/\bselect\b/giu) ?? []).length, 1);
assert.match(v3SectionA, /'A_TRANSACTION_SERVER_GATE'::text\s+as\s+section_id/iu);
assert.match(v3SectionA, /'server'::text\s+as\s+row_key/iu);
assert.match(v3SectionA, /jsonb_build_object\([\s\S]+\)\s+as\s+payload/iu);
assert.match(v3SectionA, /'SAFE_STRUCTURAL'::text\s+as\s+sanitization_class\s*;$/iu);
assert.deepEqual([...v3SectionA.matchAll(/\bas\s+([a-z_]+)/giu)].map((match) => match[1]),
  ["section_id", "row_key", "payload", "sanitization_class"]);
const expectedPayloadKeys = [
  "collection_status", "server_version_num", "database_logical_name",
  "operator_role", "transaction_read_only", "in_recovery",
] as const;
assert.deepEqual([...v3SectionA.matchAll(/^\s+'([^']+)',/gmu)].map((match) => match[1]),
  expectedPayloadKeys);

for (let index = 1; index < v2.section_plan.length; index += 1) {
  assert.equal(v3.section_plan[index]!.section_id, v2.section_plan[index]!.section_id);
  assert.equal(v3.section_plan[index]!.statement_sql, v2.section_plan[index]!.statement_sql);
  assert.match(v3.section_plan[index]!.statement_sql,
    /order\s+by\s+row_key\s+collate\s+"C"\s*;$/iu);
}

const executableTokens = Buffer.from(v3.raw_bytes).toString("utf8")
  .replace(/--[^\n]*/gu, " ").replace(/'(?:''|[^'])*'/gu, " ");
assert.doesNotMatch(executableTokens,
  /\b(?:insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|call|do|copy)\b/iu);
assert.doesNotMatch(executableTokens, /\bset\s+role\b|\bexecute\b/iu);
assert.doesNotMatch(Buffer.from(v3.raw_bytes).toString("utf8"),
  /\b(?:dblink|http|inet_server_addr|inet_server_port|inet_client_addr|inet_client_port)\b/iu);

const drifted = Buffer.from(v3.raw_bytes);
drifted[drifted.length - 1] = drifted[drifted.length - 1] === 10 ? 32 : 10;
const rejected = verifyFarmOsProductionIdentityQueryV3ArtifactBytes(drifted);
assert.equal(rejected.status, "BLOCKED");
assert.equal(rejected.status === "BLOCKED" && rejected.reason, "ARTIFACT_SHA_MISMATCH");

console.log(JSON.stringify({
  result: "pass",
  authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
  section_a_order_by_count: 0,
  preserved_downstream_section_count: 10,
  runtime_binding_changes: 0,
  production_operations: 0,
}));
