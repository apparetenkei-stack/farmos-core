import assert from "node:assert/strict";

import {
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  resolveFarmOsProductionTargetDatabaseCredentialAuthorityExact,
  validateFarmOsProductionTargetDatabaseCredentialAuthority,
} from "../../src/lib/hermes/farm_os_production_target_database_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY,
  resolveFarmOsProductionTargetProviderCredentialAuthorityExact,
  validateFarmOsProductionTargetProviderCredentialAuthority,
} from "../../src/lib/hermes/farm_os_production_target_provider_credential_authority";
import {
  deriveFarmOsDatabaseCredentialBrokerRequestBinding,
  deriveFarmOsProviderCredentialBrokerRequestBinding,
  resolveFarmOsDatabaseCredentialBrokerAuthorityExact,
  resolveFarmOsProviderCredentialBrokerAuthorityExact,
  validateFarmOsDatabaseCredentialBrokerAuthority,
  validateFarmOsDatabaseOpaqueCredentialHandle,
  validateFarmOsProviderCredentialBrokerAuthority,
  validateFarmOsProviderOpaqueCredentialHandle,
} from "../../src/lib/hermes/farm_os_production_target_credential_broker_ports";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
  parseFarmOsProductionTargetCanonicalTimestamp,
} from "../../src/lib/hermes/farm_os_production_target_authority_lifecycle";

const TARGET = `sha256:${"1".repeat(64)}` as const;
const NOW = "2026-08-10T00:00:00.000Z";
const ACTIVATES = "2026-08-09T00:00:00.000Z";
const EXPIRES = "2026-08-11T00:00:00.000Z";
const expected = { approved_target_resource_digest: TARGET, revision: 1, now: NOW } as const;

const provider = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  revision: 1,
  credential_class: "SUPABASE_PROJECT_METADATA_READER",
  provider_class: "managed_postgres",
  provider_family: "Supabase Managed PostgreSQL",
  approved_target_resource_digest: TARGET,
  allowed_endpoint_class: "GET_SINGLE_PROJECT",
  allowed_method: "GET",
  allowed_provider_scope: "projects:read",
  maximum_calls: 1,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  fallback: "PROHIBITED",
} as const);

const database = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  revision: 1,
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  approved_target_resource_digest: TARGET,
  database_logical_name: "farmos_core_prod",
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  allowed_operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY",
  maximum_connections: 1,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  fallback: "PROHIBITED",
} as const);

assert.equal(validateFarmOsProductionTargetProviderCredentialAuthority(provider, expected).accepted, true);
assert.equal(validateFarmOsProductionTargetDatabaseCredentialAuthority(database, expected).accepted, true);

const providerBroker = Object.freeze({
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  revision: 1,
  supported_credential_class: "SUPABASE_PROJECT_METADATA_READER",
  supported_operation_class: "GET_SINGLE_PROJECT",
  supported_provider_scope: "projects:read",
  access_mode: "READ_ONLY_PROVIDER_METADATA",
  approved_target_resource_digest: TARGET,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
  fallback: "PROHIBITED",
} as const);
const databaseBroker = Object.freeze({
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  revision: 1,
  supported_credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  supported_operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY",
  database_logical_name: "farmos_core_prod",
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  approved_target_resource_digest: TARGET,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
  fallback: "PROHIBITED",
} as const);
const providerBrokerExpected = Object.freeze({
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  revision: 1,
  approved_target_resource_digest: TARGET,
  now: NOW,
} as const);
const databaseBrokerExpected = Object.freeze({
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  revision: 1,
  approved_target_resource_digest: TARGET,
  now: NOW,
} as const);
assert.equal(validateFarmOsProviderCredentialBrokerAuthority(
  providerBroker, providerBrokerExpected), true);
assert.equal(validateFarmOsDatabaseCredentialBrokerAuthority(
  databaseBroker, databaseBrokerExpected), true);

const providerRequest = Object.freeze({
  request_domain: "PROVIDER_CREDENTIAL_BROKER_REQUEST",
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  credential_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  credential_authority_revision: 1,
  credential_class: "SUPABASE_PROJECT_METADATA_READER",
  approved_target_resource_digest: TARGET,
  access_mode: "READ_ONLY_PROVIDER_METADATA",
  operation_class: "GET_SINGLE_PROJECT",
  provider_scope: "projects:read",
  opaque_request_context_digest: `sha256:${"5".repeat(64)}`,
} as const);
const databaseRequest = Object.freeze({
  request_domain: "DATABASE_CREDENTIAL_BROKER_REQUEST",
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  credential_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  credential_authority_revision: 1,
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  approved_target_resource_digest: TARGET,
  operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY",
  database_logical_name: "farmos_core_prod",
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  opaque_request_context_digest: `sha256:${"6".repeat(64)}`,
} as const);
const providerRequestBinding = deriveFarmOsProviderCredentialBrokerRequestBinding(providerRequest)!;
const databaseRequestBinding = deriveFarmOsDatabaseCredentialBrokerRequestBinding(databaseRequest)!;
assert.match(providerRequestBinding, /^sha256:[a-f0-9]{64}$/u);
assert.match(databaseRequestBinding, /^sha256:[a-f0-9]{64}$/u);

const { revision: _providerRevision, ...providerMissingRevision } = providerBroker;
const providerBrokerRejects: readonly unknown[] = [
  { ...providerBroker, broker_authority_id: "unknown.broker.v1" },
  { ...providerBroker, revision: 0 },
  { ...providerBroker, revision: -1 },
  { ...providerBroker, revision: 65_536 },
  { ...providerBroker, revision: "latest" },
  { ...providerBroker, revision: "highest" },
  { ...providerBroker, revision: "current" },
  providerMissingRevision,
  { ...providerBroker, revoked: true },
  { ...providerBroker, expires_at: NOW },
  { ...providerBroker, supported_operation_class: "GENERIC_API_ACCESS" },
  { ...providerBroker, supported_provider_scope: "projects:write" },
  { ...providerBroker, access_mode: "WRITE" },
  { ...providerBroker, supported_credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER" },
  { ...providerBroker, approved_target_resource_digest: `sha256:${"2".repeat(64)}` },
  { ...providerBroker, fallback: "ENABLED" },
  { ...providerBroker, token: "not-permitted" },
];
for (const invalid of providerBrokerRejects) {
  assert.equal(validateFarmOsProviderCredentialBrokerAuthority(
    invalid, providerBrokerExpected), false);
}

const { revision: _databaseRevision, ...databaseMissingRevision } = databaseBroker;
const databaseBrokerRejects: readonly unknown[] = [
  { ...databaseBroker, broker_authority_id: "unknown.broker.v1" },
  { ...databaseBroker, revision: 0 },
  { ...databaseBroker, revision: -1 },
  { ...databaseBroker, revision: 65_536 },
  { ...databaseBroker, revision: "latest" },
  { ...databaseBroker, revision: "highest" },
  { ...databaseBroker, revision: "current" },
  databaseMissingRevision,
  { ...databaseBroker, revoked: true },
  { ...databaseBroker, expires_at: NOW },
  { ...databaseBroker, supported_operation_class: "ARBITRARY_SQL" },
  { ...databaseBroker, supported_credential_class: "SUPABASE_PROJECT_METADATA_READER" },
  { ...databaseBroker, database_logical_name: "postgres" },
  { ...databaseBroker, expected_principal_authority_id: "other" },
  { ...databaseBroker, approved_target_resource_digest: `sha256:${"2".repeat(64)}` },
  { ...databaseBroker, fallback: "ENABLED" },
  { ...databaseBroker, password: "not-permitted" },
];
for (const invalid of databaseBrokerRejects) {
  assert.equal(validateFarmOsDatabaseCredentialBrokerAuthority(
    invalid, databaseBrokerExpected), false);
}

assert.equal(resolveFarmOsProviderCredentialBrokerAuthorityExact(
  [providerBroker], providerBrokerExpected), providerBroker);
assert.equal(resolveFarmOsDatabaseCredentialBrokerAuthorityExact(
  [databaseBroker], databaseBrokerExpected), databaseBroker);
assert.equal(resolveFarmOsProviderCredentialBrokerAuthorityExact(
  [providerBroker, { ...providerBroker }], providerBrokerExpected), null);
assert.equal(resolveFarmOsDatabaseCredentialBrokerAuthorityExact(
  [databaseBroker, { ...databaseBroker }], databaseBrokerExpected), null);
for (const alias of ["latest", "highest", "current", "active", "default", "fallback"]) {
  assert.equal(resolveFarmOsProviderCredentialBrokerAuthorityExact([providerBroker], {
    ...providerBrokerExpected, revision: alias as unknown as number,
  }), null);
  assert.equal(resolveFarmOsDatabaseCredentialBrokerAuthorityExact([databaseBroker], {
    ...databaseBrokerExpected, revision: alias as unknown as number,
  }), null);
}
assert.equal(resolveFarmOsProviderCredentialBrokerAuthorityExact([], providerBrokerExpected), null);
assert.equal(resolveFarmOsDatabaseCredentialBrokerAuthorityExact([], databaseBrokerExpected), null);

const providerHandle = Object.freeze({
  handle_class: "PROVIDER_CREDENTIAL_HANDLE",
  handle_reference_digest: `sha256:${"3".repeat(64)}`,
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  credential_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  credential_authority_revision: 1,
  credential_class: "SUPABASE_PROJECT_METADATA_READER",
  approved_target_resource_digest: TARGET,
  operation_class: "GET_SINGLE_PROJECT",
  provider_scope: "projects:read",
  request_binding_digest: providerRequestBinding,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
} as const);
const databaseHandle = Object.freeze({
  handle_class: "DATABASE_CREDENTIAL_HANDLE",
  handle_reference_digest: `sha256:${"4".repeat(64)}`,
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  credential_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  credential_authority_revision: 1,
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  approved_target_resource_digest: TARGET,
  operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY",
  database_logical_name: "farmos_core_prod",
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  request_binding_digest: databaseRequestBinding,
  activates_at: ACTIVATES,
  expires_at: EXPIRES,
  revoked: false,
} as const);
assert.equal(validateFarmOsProviderOpaqueCredentialHandle(
  providerHandle, providerRequest, providerBroker, provider, NOW), true);
assert.equal(validateFarmOsDatabaseOpaqueCredentialHandle(
  databaseHandle, databaseRequest, databaseBroker, database, NOW), true);

for (const invalid of [
  { ...providerHandle, broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID },
  { ...providerHandle, broker_authority_revision: 2 },
  { ...providerHandle, credential_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID },
  { ...providerHandle, credential_authority_revision: 2 },
  { ...providerHandle, credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER" },
  { ...providerHandle, approved_target_resource_digest: `sha256:${"2".repeat(64)}` },
  { ...providerHandle, operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY" },
  { ...providerHandle, provider_scope: "projects:write" },
  { ...providerHandle, request_binding_digest: `sha256:${"9".repeat(64)}` },
  { ...providerHandle, token: "not-permitted" },
  databaseHandle,
]) {
  assert.equal(validateFarmOsProviderOpaqueCredentialHandle(
    invalid, providerRequest, providerBroker, provider, NOW), false);
}
for (const invalid of [
  { ...databaseHandle, broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID },
  { ...databaseHandle, broker_authority_revision: 2 },
  { ...databaseHandle, credential_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID },
  { ...databaseHandle, credential_authority_revision: 2 },
  { ...databaseHandle, credential_class: "SUPABASE_PROJECT_METADATA_READER" },
  { ...databaseHandle, approved_target_resource_digest: `sha256:${"2".repeat(64)}` },
  { ...databaseHandle, operation_class: "ARBITRARY_SQL" },
  { ...databaseHandle, database_logical_name: "postgres" },
  { ...databaseHandle, expected_principal_authority_id: "other" },
  { ...databaseHandle, request_binding_digest: `sha256:${"9".repeat(64)}` },
  { ...databaseHandle, password: "not-permitted" },
  providerHandle,
]) {
  assert.equal(validateFarmOsDatabaseOpaqueCredentialHandle(
    invalid, databaseRequest, databaseBroker, database, NOW), false);
}

const providerRequestB = Object.freeze({
  ...providerRequest,
  opaque_request_context_digest: `sha256:${"7".repeat(64)}` as const,
});
const databaseRequestB = Object.freeze({
  ...databaseRequest,
  opaque_request_context_digest: `sha256:${"8".repeat(64)}` as const,
});
assert.notEqual(deriveFarmOsProviderCredentialBrokerRequestBinding(providerRequestB), providerRequestBinding);
assert.notEqual(deriveFarmOsDatabaseCredentialBrokerRequestBinding(databaseRequestB), databaseRequestBinding);
assert.equal(validateFarmOsProviderOpaqueCredentialHandle(
  providerHandle, providerRequestB, providerBroker, provider, NOW), false);
assert.equal(validateFarmOsDatabaseOpaqueCredentialHandle(
  databaseHandle, databaseRequestB, databaseBroker, database, NOW), false);
assert.equal(validateFarmOsProviderOpaqueCredentialHandle(
  providerHandle, databaseRequest as unknown as typeof providerRequest,
  providerBroker, provider, NOW), false);
assert.equal(validateFarmOsDatabaseOpaqueCredentialHandle(
  databaseHandle, providerRequest as unknown as typeof databaseRequest,
  databaseBroker, database, NOW), false);
assert.equal(validateFarmOsProviderOpaqueCredentialHandle(
  providerHandle, providerRequest, providerBroker, provider, NOW), true);
assert.equal(validateFarmOsProviderOpaqueCredentialHandle(
  providerHandle, providerRequest, providerBroker, provider, NOW), true);

for (const invalidTimestamp of [
  "2026-02-29T00:00:00.000Z", "2026-02-30T00:00:00.000Z",
  "2026-02-31T00:00:00.000Z", "2026-04-31T00:00:00.000Z",
  "2026-00-01T00:00:00.000Z", "2026-13-01T00:00:00.000Z",
  "2026-01-00T00:00:00.000Z", "2026-01-01T24:00:00.000Z",
  "2026-01-01T00:60:00.000Z", "2026-01-01T00:00:60.000Z",
  "2026-01-01T00:00:00Z", " 2026-01-01T00:00:00.000Z",
]) {
  assert.equal(parseFarmOsProductionTargetCanonicalTimestamp(invalidTimestamp), null);
  assert.equal(validateFarmOsProductionTargetProviderCredentialAuthority(
    { ...provider, expires_at: invalidTimestamp }, expected).accepted, false);
}
assert.notEqual(parseFarmOsProductionTargetCanonicalTimestamp("2028-02-29T00:00:00.000Z"), null);
assert.equal(evaluateFarmOsProductionTargetAuthorityLifecycle({
  activates_at: "2028-02-28T00:00:00.000Z",
  expires_at: "2028-03-01T00:00:00.000Z",
  revoked: false,
}, "2028-02-29T00:00:00.000Z"), "ACTIVE");

const providerRejects: readonly unknown[] = [
  { ...provider, approved_target_resource_digest: `sha256:${"2".repeat(64)}` },
  { ...provider, credential_class: "OTHER" },
  { ...provider, provider_class: "other" },
  { ...provider, provider_family: "Other" },
  { ...provider, allowed_endpoint_class: "LIST_PROJECTS" },
  { ...provider, allowed_method: "POST" },
  { ...provider, allowed_provider_scope: "projects:write" },
  { ...provider, maximum_calls: 2 },
  { ...provider, revoked: true },
  { ...provider, expires_at: NOW },
  { ...provider, expires_at: "2026-08-11 00:00:00" },
  { ...provider, fallback: "ENABLED" },
  { ...provider, revision: 2 },
  { ...provider, retry: 1 },
  { ...provider, token: "not-permitted" },
  { ...provider, arbitrary: "https://secret.invalid/value" },
];
for (const invalid of providerRejects) {
  assert.equal(validateFarmOsProductionTargetProviderCredentialAuthority(invalid, expected).accepted, false);
}

const databaseRejects: readonly unknown[] = [
  { ...database, approved_target_resource_digest: `sha256:${"2".repeat(64)}` },
  { ...database, credential_class: "OTHER" },
  { ...database, database_logical_name: "postgres" },
  { ...database, allowed_operation_class: "ARBITRARY_SQL" },
  { ...database, maximum_connections: 2 },
  { ...database, expected_principal_authority_id: "other" },
  { ...database, revoked: true },
  { ...database, expires_at: NOW },
  { ...database, expires_at: "2026-08-11 00:00:00" },
  { ...database, fallback: "GENERIC_DATABASE_URL" },
  { ...database, revision: 2 },
  { ...database, retry: 1 },
  { ...database, password: "not-permitted" },
  { ...database, database_url: "postgresql://not-permitted" },
];
for (const invalid of databaseRejects) {
  assert.equal(validateFarmOsProductionTargetDatabaseCredentialAuthority(invalid, expected).accepted, false);
}

assert.equal(resolveFarmOsProductionTargetProviderCredentialAuthorityExact([provider], expected), provider);
assert.equal(resolveFarmOsProductionTargetDatabaseCredentialAuthorityExact([database], expected), database);
assert.equal(resolveFarmOsProductionTargetProviderCredentialAuthorityExact([provider],
  { ...expected, revision: 2 }), null);
assert.equal(resolveFarmOsProductionTargetDatabaseCredentialAuthorityExact([database],
  { ...expected, revision: 2 }), null);
assert.equal(resolveFarmOsProductionTargetProviderCredentialAuthorityExact([provider, { ...provider }], expected), null);
assert.equal(resolveFarmOsProductionTargetDatabaseCredentialAuthorityExact([database, { ...database }], expected), null);
for (const latest of ["latest", "highest", "current"]) {
  assert.equal(resolveFarmOsProductionTargetProviderCredentialAuthorityExact([provider],
    { ...expected, revision: latest as unknown as number }), null);
}
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY.automatic_latest_selection, false);
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY.credential_material_storage, "FORBIDDEN");
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY.minimal_observation_authority_reference,
  "farmos.production-target-identity-minimal-observation-query.v1");
assert.equal(FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY.minimal_observation_artifact_sha256_reference,
  "sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805");

console.log("Day150 Phase B credential authority tests passed");
