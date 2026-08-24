import assert from "node:assert/strict";

import {
  compareFarmOsEnvironmentIdentityRuntimeBinding,
} from "../../src/lib/hermes/farm_os_environment_identity_runtime_binding";
import {
  createFarmOsDay1505EEnvironmentManifestFixture,
  createFarmOsDay1505ERuntimeIdentityFixture,
} from "./lib/farm_os_day150_5_e_environment_identity_fixture";

const environments = ["development", "staging", "production"] as const;
for (const environmentClass of environments) {
  const manifest = createFarmOsDay1505EEnvironmentManifestFixture(environmentClass);
  const observed = createFarmOsDay1505ERuntimeIdentityFixture(manifest);
  assert.deepEqual(compareFarmOsEnvironmentIdentityRuntimeBinding({
    expected_manifest: manifest,
    observed_identity: observed,
  }), { result: "MATCH", mismatch_fields: [] });
}

const manifest = createFarmOsDay1505EEnvironmentManifestFixture("development");
const valid = createFarmOsDay1505ERuntimeIdentityFixture(manifest);
const compare = (override: Record<string, unknown>) =>
  compareFarmOsEnvironmentIdentityRuntimeBinding({
    expected_manifest: manifest,
    observed_identity: { ...structuredClone(valid), ...override },
  });

const missingEnvironment = structuredClone(valid) as Record<string, unknown>;
delete missingEnvironment.environment_id;
assert.equal(compareFarmOsEnvironmentIdentityRuntimeBinding({
  expected_manifest: manifest,
  observed_identity: missingEnvironment,
}).result, "MISSING");

assert.equal(compare({ environment_id: "apparetenkei-unknown-primary" }).result,
  "UNKNOWN");
assert.equal(compare({ environment_id: "apparetenkei-production-primary" }).result,
  "MISMATCH");
assert.equal(compare({ farm_scope: "another-farm" }).result, "MISMATCH");
assert.equal(compare({ business_timezone: "UTC" }).result, "MISMATCH");
assert.equal(compare({ core_endpoint_alias: "farmos-core-production-primary" }).result,
  "MISMATCH");
assert.equal(compare({ core_endpoint_alias: "farmos-core-*" }).result, "INVALID");
assert.equal(compare({ manifest_digest: `sha256:${"0".repeat(64)}` }).result,
  "MISMATCH");
assert.equal(compare({ integration_identity_alias: "slack-production-primary" }).result,
  "MISMATCH");

const databaseFingerprintMismatch = {
  ...structuredClone(valid),
  database_bindings: {
    ...valid.database_bindings,
    app_business: {
      ...valid.database_bindings.app_business,
      resource_fingerprint: `sha256:${"0".repeat(64)}`,
    },
  },
};
assert.equal(compareFarmOsEnvironmentIdentityRuntimeBinding({
  expected_manifest: manifest,
  observed_identity: databaseFingerprintMismatch,
}).result, "MISMATCH");

const credentialMismatch = {
  ...structuredClone(valid),
  database_bindings: {
    ...valid.database_bindings,
    core_operational_memory: {
      ...valid.database_bindings.core_operational_memory,
      credential_class: "core-memory-production-readonly",
    },
  },
};
assert.equal(compareFarmOsEnvironmentIdentityRuntimeBinding({
  expected_manifest: manifest,
  observed_identity: credentialMismatch,
}).result, "MISMATCH");

assert.equal(compare({ evidence_source: "browser" }).result, "INVALID");
assert.equal(compare({ evidence_source: "hermes" }).result, "INVALID");
assert.equal(compare({ additional_property: "synthetic" }).result, "INVALID");
assert.equal(compareFarmOsEnvironmentIdentityRuntimeBinding({
  expected_manifest: { ...manifest, manifest_version: "invalid" },
  observed_identity: valid,
}).result, "INVALID");

console.log("farm_os_day150_5_e_environment_identity_runtime_binding: PASS");
