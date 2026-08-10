import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import {
  canonicalizeFarmOsPostgresClusterSystemIdentifier,
  digestFarmOsPostgresClusterSystemIdentifier,
  FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY,
} from "../../src/lib/hermes/farm_os_postgres_cluster_system_identifier_digest";
import {
  canonicalizeFarmOsSupabaseProjectResourceTuple,
  fingerprintFarmOsSupabaseProjectResource,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY,
} from "../../src/lib/hermes/farm_os_supabase_project_resource_fingerprint";

const providerStringTuple = {
  provider_namespace: "supabase.com",
  resource_type: "project",
  account_scope_id: "account_A1",
  resource_id: "project_B2",
} as const;
const providerStringPreimage =
  "{\"account_scope_id\":\"account_A1\",\"authority_id\":\"farmos.supabase-project-resource-fingerprint.v1\",\"provider_class\":\"managed_postgres\",\"provider_namespace\":\"supabase.com\",\"resource_id\":\"project_B2\",\"resource_type\":\"project\"}";
const providerStringGolden = fingerprintFarmOsSupabaseProjectResource(providerStringTuple);
assert.deepEqual(providerStringGolden, {
  accepted: true,
  fingerprint: "sha256:de9538b21fb3e6995ca02a9aa88f7125f428faf98ab7b68685e193c7d42bce91",
});
assert.equal(
  canonicalizeFarmOsSupabaseProjectResourceTuple(providerStringTuple),
  providerStringPreimage,
);
const providerNullTuple = {
  provider_namespace: "supabase.com",
  resource_type: "project",
  account_scope_id: null,
  resource_id: "project_B2",
} as const;
const providerNullPreimage =
  "{\"account_scope_id\":null,\"authority_id\":\"farmos.supabase-project-resource-fingerprint.v1\",\"provider_class\":\"managed_postgres\",\"provider_namespace\":\"supabase.com\",\"resource_id\":\"project_B2\",\"resource_type\":\"project\"}";
const providerNullGolden = fingerprintFarmOsSupabaseProjectResource(providerNullTuple);
assert.deepEqual(providerNullGolden, {
  accepted: true,
  fingerprint: "sha256:5d09baea17d0fe61f252dff46b7642f146a5124ffa2b5305d2c34974de80ea45",
});
assert.equal(canonicalizeFarmOsSupabaseProjectResourceTuple(providerNullTuple),
  providerNullPreimage);
assert.ok(providerStringGolden.accepted && providerNullGolden.accepted);
assert.notEqual(providerStringGolden.fingerprint, providerNullGolden.fingerprint);
assert.notEqual(providerStringPreimage, providerNullPreimage);
const reorderedString = fingerprintFarmOsSupabaseProjectResource({
  resource_id: "project_B2",
  account_scope_id: "account_A1",
  resource_type: "project",
  provider_namespace: "supabase.com",
});
const reorderedNull = fingerprintFarmOsSupabaseProjectResource({
  resource_id: "project_B2",
  account_scope_id: null,
  resource_type: "project",
  provider_namespace: "supabase.com",
});
assert.deepEqual(reorderedString, providerStringGolden);
assert.deepEqual(reorderedNull, providerNullGolden);
const otherScope = fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple,
  account_scope_id: "account_A2",
});
assert.ok(providerStringGolden.accepted && otherScope.accepted);
assert.notEqual(providerStringGolden.fingerprint, otherScope.fingerprint);
const literalNullScope = fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple,
  account_scope_id: "null",
});
assert.ok(literalNullScope.accepted && providerNullGolden.accepted);
assert.notEqual(literalNullScope.fingerprint, providerNullGolden.fingerprint);
const caseMismatch = fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple,
  resource_id: "Project_B2",
});
assert.ok(caseMismatch.accepted && providerStringGolden.accepted);
assert.notEqual(caseMismatch.fingerprint, providerStringGolden.fingerprint);
assert.deepEqual(fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple, provider_namespace: "supabase",
}), { accepted: false, reason: "PROVIDER_NAMESPACE_MISMATCH" });
assert.deepEqual(fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple, resource_type: "database",
}), { accepted: false, reason: "RESOURCE_TYPE_MISMATCH" });
assert.deepEqual(fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple, resource_id: "bad value",
}), { accepted: false, reason: "RESOURCE_ID_INVALID" });
assert.deepEqual(fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple, resource_id: "project_é",
}), { accepted: false, reason: "RESOURCE_ID_INVALID" });
assert.deepEqual(fingerprintFarmOsSupabaseProjectResource({
  ...providerStringTuple, account_scope_id: "service_role_token",
}), { accepted: false, reason: "SECRET_LIKE_INPUT_REJECTED" });
for (const [name, account_scope_id] of [
  ["undefined", undefined],
  ["empty", ""],
  ["whitespace_only", " "],
  ["leading_whitespace", " account_A1"],
  ["trailing_whitespace", "account_A1 "],
  ["invalid_ascii", "account!A1"],
  ["unicode_confusable", "account_Ａ1"],
  ["number", 1],
  ["boolean", true],
  ["object", { value: "account_A1" }],
  ["array", ["account_A1"]],
] as const) {
  assert.deepEqual(fingerprintFarmOsSupabaseProjectResource({
    ...providerStringTuple,
    account_scope_id,
  } as never), { accepted: false, reason: "ACCOUNT_SCOPE_ID_INVALID" }, name);
}
const { account_scope_id: _accountScopeId, ...missingAccountScope } = providerStringTuple;
assert.deepEqual(fingerprintFarmOsSupabaseProjectResource(missingAccountScope as never), {
  accepted: false,
  reason: "ACCOUNT_SCOPE_ID_INVALID",
});
assert.equal(canonicalizeFarmOsSupabaseProjectResourceTuple(missingAccountScope as never), null);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY.account_scope_id_schema,
  "string | null");
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY.implicit_trim, false);
assert.equal(FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY.case_sensitivity,
  "CASE_SENSITIVE");

assert.deepEqual(digestFarmOsPostgresClusterSystemIdentifier("1"), {
  accepted: true,
  digest: "sha256:d7649bf78a3b139514024d34b2e5d9abeee9e80a3836a7c390f093229416f067",
});
const maxDigest = digestFarmOsPostgresClusterSystemIdentifier("18446744073709551615");
assert.deepEqual(maxDigest, {
  accepted: true,
  digest: "sha256:089beac62e53bc1d68c1a8b478e68737f0c60e1a1429f5f7b83ce46d1917a643",
});
assert.equal(
  canonicalizeFarmOsPostgresClusterSystemIdentifier("1"),
  "{\"authority_id\":\"farmos.postgres-cluster-system-identifier-digest.v1\",\"raw_cluster_system_identifier\":\"1\"}",
);
for (const invalid of ["", "0", "00", "01", "+1", " 1", "1 ", "1.0", "-1", "１"]) {
  assert.equal(digestFarmOsPostgresClusterSystemIdentifier(invalid).accepted, false, invalid);
}
assert.deepEqual(digestFarmOsPostgresClusterSystemIdentifier("18446744073709551616"), {
  accepted: false,
  reason: "DECIMAL_RANGE_INVALID",
});
assert.ok(maxDigest.accepted);
const legacyDigest = `sha256:${createHash("sha256").update("18446744073709551615").digest("hex")}`;
assert.notEqual(maxDigest.digest, legacyDigest);
assert.equal(
  FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY.javascript_string_zeroization_claim,
  false,
);

console.log("farm_os_day150_phase_a_fingerprint_and_cluster_authorities: PASS");
