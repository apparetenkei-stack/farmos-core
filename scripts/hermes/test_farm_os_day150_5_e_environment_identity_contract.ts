import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_ENVIRONMENT_EGRESS_POLICY,
  FARM_OS_ENVIRONMENT_IDS,
  canonicalizeFarmOsEnvironmentIdentityManifest,
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
} from "../../src/lib/hermes/farm_os_environment_identity_contract";
import {
  createFarmOsDay1505EEnvironmentManifestFixture,
  createMutableFarmOsDay1505EEnvironmentManifestFixture,
} from "./lib/farm_os_day150_5_e_environment_identity_fixture";

const environments = ["development", "staging", "production"] as const;
for (const environmentClass of environments) {
  const manifest = createFarmOsDay1505EEnvironmentManifestFixture(
    environmentClass,
  );
  assert.equal(manifest.environment_id, FARM_OS_ENVIRONMENT_IDS[environmentClass]);
  assert.notEqual(parseFarmOsEnvironmentIdentityManifest(manifest), null);
  assert.match(digestFarmOsEnvironmentIdentityManifest(manifest) ?? "",
    /^sha256:[a-f0-9]{64}$/u);
}

const idMismatch = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
idMismatch.environment_id = FARM_OS_ENVIRONMENT_IDS.production;
assert.equal(parseFarmOsEnvironmentIdentityManifest(idMismatch), null);

const unknownId = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
unknownId.environment_id = "apparetenkei-unknown-primary";
assert.equal(parseFarmOsEnvironmentIdentityManifest(unknownId), null);

const missingEnvironment = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
delete missingEnvironment.environment_id;
assert.equal(parseFarmOsEnvironmentIdentityManifest(missingEnvironment), null);

const missingInstallation = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
delete missingInstallation.installation_id;
assert.equal(parseFarmOsEnvironmentIdentityManifest(missingInstallation), null);

const wrongVersion = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "staging",
);
wrongVersion.manifest_version = "farmos.environment-identity-manifest.v2";
assert.equal(parseFarmOsEnvironmentIdentityManifest(wrongVersion), null);

const wildcardEndpoint = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "staging",
);
wildcardEndpoint.core_endpoint_alias = "farmos-core-*";
assert.equal(parseFarmOsEnvironmentIdentityManifest(wildcardEndpoint), null);

const endpointNotAllowed = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "staging",
);
endpointNotAllowed.core_endpoint_alias = "farmos-core-staging-secondary";
assert.equal(parseFarmOsEnvironmentIdentityManifest(endpointNotAllowed), null);

const secretLikeField = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "production",
);
(secretLikeField.database_bindings as Record<string, Record<string, unknown>>)
  .app_business.access_token = "synthetic-never-authority";
assert.equal(parseFarmOsEnvironmentIdentityManifest(secretLikeField), null);

const additionalProperty = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "production",
);
additionalProperty.unapproved_field = "synthetic";
assert.equal(parseFarmOsEnvironmentIdentityManifest(additionalProperty), null);

const rawUrl = createMutableFarmOsDay1505EEnvironmentManifestFixture("production");
rawUrl.core_endpoint_alias = "https://production.invalid";
assert.equal(parseFarmOsEnvironmentIdentityManifest(rawUrl), null);

const integrationMismatch = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
((integrationMismatch.integration_identities as Array<Record<string, unknown>>)[0])
  .identity_alias = "slack-production-primary";
assert.equal(parseFarmOsEnvironmentIdentityManifest(integrationMismatch), null);

const egressHashMismatch = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
(egressHashMismatch.egress_environment_policy as Record<string, unknown>)
  .policy_sha256 = `sha256:${"0".repeat(64)}`;
assert.equal(parseFarmOsEnvironmentIdentityManifest(egressHashMismatch), null);
assert.equal(FARM_OS_ENVIRONMENT_EGRESS_POLICY.policy_sha256,
  "sha256:c91586afcaeca130e7bcb4707cc066d07075b4b7d9d8d566644c5f041d7fb85f");

const sameDatabaseIdentity = createMutableFarmOsDay1505EEnvironmentManifestFixture(
  "development",
);
const sameBindings = sameDatabaseIdentity.database_bindings as Record<
  string,
  Record<string, unknown>
>;
sameBindings.core_operational_memory.resource_fingerprint =
  sameBindings.app_business.resource_fingerprint;
assert.equal(parseFarmOsEnvironmentIdentityManifest(sameDatabaseIdentity), null);

const ordered = createMutableFarmOsDay1505EEnvironmentManifestFixture("staging");
const permuted = Object.fromEntries(Object.entries(ordered).reverse());
assert.equal(canonicalizeFarmOsEnvironmentIdentityManifest(permuted),
  canonicalizeFarmOsEnvironmentIdentityManifest(ordered));
assert.equal(digestFarmOsEnvironmentIdentityManifest(permuted),
  digestFarmOsEnvironmentIdentityManifest(ordered));

const schema = JSON.parse(readFileSync(
  new URL("../../artifacts/day150-5/ef1-e/environment-identity-manifest.v1.schema.json",
    import.meta.url),
  "utf8",
)) as Record<string, unknown>;
assert.equal(schema.$id, "urn:farmos:environment-identity-manifest:v1");
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.required, [
  "manifest_version",
  "environment_id",
  "environment_class",
  "installation_id",
  "farm_scope",
  "business_timezone",
  "core_endpoint_alias",
  "allowed_endpoint_aliases",
  "database_bindings",
  "integration_identities",
  "egress_environment_policy",
  "contract_versions",
  "provenance",
]);
const schemaProperties = schema.properties as Record<
  string,
  Record<string, unknown>
>;
assert.deepEqual(schemaProperties.environment_class.enum, [
  "development",
  "staging",
  "production",
]);
assert.deepEqual(schemaProperties.environment_id.enum,
  Object.values(FARM_OS_ENVIRONMENT_IDS));
assert.equal(Object.hasOwn(schemaProperties, "manifest_hash"), false);
assert.equal(
  ((schemaProperties.egress_environment_policy.properties as Record<
    string,
    Record<string, unknown>
  >).policy_sha256).const,
  FARM_OS_ENVIRONMENT_EGRESS_POLICY.policy_sha256,
);

console.log("farm_os_day150_5_e_environment_identity_contract: PASS");
