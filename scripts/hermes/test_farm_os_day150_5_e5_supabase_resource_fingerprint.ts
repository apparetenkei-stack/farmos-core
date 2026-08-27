import assert from "node:assert/strict";

import {
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS,
  fingerprintFarmOsE5SupabaseResource,
} from "../../src/lib/hermes/farm_os_e5_supabase_resource_fingerprint";

assert.equal(
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS.staging_app_business,
  "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69",
);
assert.equal(
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
    .production_app_business_deny,
  "sha256:26783e0e593e7d714588d4cb2980be33b9ea21db24ae9dee788224769a54e48f",
);
assert.notEqual(
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS.staging_app_business,
  FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS
    .production_app_business_deny,
);

const staging = {
  organization_id: "verified-org-internal-fixture",
  postgres_major: 17,
  project_name: "apparetenkei-staging-primary",
  project_ref: "stagingrefinternal01",
  provider: "supabase",
  provider_class: "managed_postgres",
  region: "ap-northeast-1",
};
const production = {
  ...staging,
  project_name: "Appare-app",
  project_ref: "productionrefinternal1",
};
const stagingResult = fingerprintFarmOsE5SupabaseResource(staging);
const productionResult = fingerprintFarmOsE5SupabaseResource(production);
assert.equal(stagingResult.accepted, true);
assert.equal(productionResult.accepted, true);
if (!stagingResult.accepted || !productionResult.accepted) {
  throw new Error("supabase_fingerprint_fixture_rejected");
}
assert.match(stagingResult.resource_fingerprint, /^sha256:[a-f0-9]{64}$/u);
assert.notEqual(stagingResult.resource_fingerprint,
  productionResult.resource_fingerprint);
assert.deepEqual(
  fingerprintFarmOsE5SupabaseResource(structuredClone(staging)),
  stagingResult,
);

for (const excludedVariants of [
  { project_status: "ACTIVE_HEALTHY" },
  { project_status: "PAUSED" },
  { db_patch_version: "17.4" },
  { db_patch_version: "17.5" },
  { db_host: "staging.internal.invalid" },
  { db_host: "changed.internal.invalid" },
  { created_at: "2026-01-01T00:00:00Z" },
]) {
  const result = fingerprintFarmOsE5SupabaseResource({
    ...staging,
    ...excludedVariants,
  });
  assert.equal(result.accepted, true);
  if (result.accepted) {
    assert.equal(result.resource_fingerprint,
      stagingResult.resource_fingerprint);
  }
}

assert.equal(fingerprintFarmOsE5SupabaseResource({
  ...staging,
  connection_uri: "synthetic-rejected",
}).accepted, false);
const safeSerialized = JSON.stringify(stagingResult);
assert.doesNotMatch(safeSerialized, /stagingrefinternal01/u);
assert.doesNotMatch(safeSerialized, /verified-org-internal-fixture/u);

console.log("farm_os_day150_5_e5_supabase_resource_fingerprint: PASS");
