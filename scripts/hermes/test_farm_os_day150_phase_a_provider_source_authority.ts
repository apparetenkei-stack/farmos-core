import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  canonicalizeFarmOsSupabaseProjectResourceTuple,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
} from "../../src/lib/hermes/farm_os_supabase_project_resource_fingerprint";
import {
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_OUTCOMES,
  mapFarmOsSupabaseSingleProjectResourceSource,
} from "../../src/lib/hermes/farm_os_supabase_project_resource_source_authority";

assert.equal(
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
  "farmos.supabase-project-resource-source-authority.v1",
);
assert.equal(
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.fingerprint_authority_reference,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
);
assert.deepEqual(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_OUTCOMES, [
  "PROVIDER_SOURCE_FEASIBLE",
  "ACCOUNT_SCOPE_MAPPING_FEASIBLE",
  "PROVIDER_SOURCE_FIELD_MISSING",
  "PROVIDER_SOURCE_FIELD_INVALID",
  "PROVIDER_RESOURCE_REF_MISMATCH",
  "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE",
  "PROVIDER_SOURCE_NOT_ESTABLISHED",
  "PROVIDER_SOURCE_UNAUTHORIZED",
  "PROVIDER_SOURCE_UNAVAILABLE",
  "PROVIDER_SOURCE_FETCH_FAILED",
  "PROVIDER_SOURCE_STALE",
]);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.endpoint_class,
  "GET_SINGLE_PROJECT");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.semantic_source,
  "GET /v1/projects/{ref}");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.required_provider_scope,
  "projects:read");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY
  .fine_grained_token_permission, "project_admin_read");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY
  .authorization_modes.OAUTH.required_scope, "projects:read");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY
  .authorization_modes.FINE_GRAINED_TOKEN.required_permission, "project_admin_read");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.maximum_provider_reads, 1);
assert.deepEqual(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.supported_operations,
  ["PINNED_GET_SINGLE_PROJECT"]);
for (const operation of [
  "LIST_PROJECTS", "SEARCH_PROJECTS", "LATEST_PROJECT", "FIRST_MATCH",
  "ORGANIZATION_WIDE_SCAN", "FALLBACK_PROJECT", "RESOURCE_AUTO_DISCOVERY",
]) {
  assert.ok(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.prohibited_operations
    .includes(operation as never));
}

const accepted = mapFarmOsSupabaseSingleProjectResourceSource("project_B2", {
  organization_id: "account_A1",
  ref: "project_B2",
  organization_slug: "must_be_ignored",
  name: "must_be_ignored",
  region: "must_be_ignored",
  status: "must_be_ignored",
  database: { host: "must_be_ignored" },
});
assert.equal(accepted.accepted, true);
if (!accepted.accepted) throw new Error("expected accepted source mapping");
assert.equal(accepted.provider_source_outcome, "PROVIDER_SOURCE_FEASIBLE");
assert.equal(accepted.account_scope_outcome, "ACCOUNT_SCOPE_MAPPING_FEASIBLE");
assert.deepEqual(accepted.fingerprint_input, {
  provider_namespace: "supabase.com",
  resource_type: "project",
  account_scope_id: "account_A1",
  resource_id: "project_B2",
});
assert.deepEqual(Object.keys(accepted.fingerprint_input).sort(), [
  "account_scope_id", "provider_namespace", "resource_id", "resource_type",
]);
assert.equal(accepted.fingerprint_computed, false);
assert.equal(accepted.persisted_raw_identifier_count, 0);
assert.equal(accepted.external_call_count, 0);

function rejection(
  requestedRef: unknown,
  response: unknown,
  outcome: string,
  secrets: readonly string[] = [],
): void {
  const result = mapFarmOsSupabaseSingleProjectResourceSource(requestedRef, response);
  assert.equal(result.accepted, false);
  if (result.accepted) throw new Error("expected rejected source mapping");
  assert.equal(result.outcome, outcome);
  assert.equal(result.persisted_raw_identifier_count, 0);
  assert.equal(result.fingerprint_computed, false);
  assert.equal(result.external_call_count, 0);
  const serialized = JSON.stringify(result);
  for (const secret of secrets) assert.equal(serialized.includes(secret), false);
}

rejection("project_B2", { ref: "project_B2" }, "PROVIDER_SOURCE_FIELD_MISSING");
rejection("project_B2", { organization_id: "account_A1" },
  "PROVIDER_SOURCE_FIELD_MISSING");
rejection("project_B2", { organization_id: null, ref: "project_B2" },
  "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE");
rejection("project_B2", { organization_id: 42, ref: "project_B2" },
  "PROVIDER_SOURCE_FIELD_INVALID");
rejection("project_B2", { organization_id: "account_A1", ref: null },
  "PROVIDER_SOURCE_FIELD_INVALID");
rejection("project_B2", { organization_id: "account_A1", ref: "project_WRONG" },
  "PROVIDER_RESOURCE_REF_MISMATCH", ["account_A1", "project_WRONG"]);
rejection("project_B2", { organization_id: "invalid scope", ref: "project_B2" },
  "PROVIDER_SOURCE_FIELD_INVALID", ["invalid scope", "project_B2"]);
rejection("project_B2", null, "PROVIDER_SOURCE_NOT_ESTABLISHED");

assert.notEqual(canonicalizeFarmOsSupabaseProjectResourceTuple({
  provider_namespace: "supabase.com",
  resource_type: "project",
  account_scope_id: null,
  resource_id: "project_B2",
}), null, "generic fingerprint authority must continue to support null account scope");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY
  .field_mapping.account_scope_id.nullable, false);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY
  .field_mapping.account_scope_id.fallback, false);

const source = readFileSync(new URL(
  "../../src/lib/hermes/farm_os_supabase_project_resource_source_authority.ts",
  import.meta.url,
), "utf8");
assert.doesNotMatch(source, /\b(?:fetch|axios|undici|https?|net)\b/u);
assert.doesNotMatch(source, /createHash|fingerprintFarmOsSupabaseProjectResource/u);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.actual_http_implementation, 0);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.credential_access, 0);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY.network_imports, 0);

console.log("Day150 Phase A provider source authority tests passed");
