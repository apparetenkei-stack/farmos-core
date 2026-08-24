import {
  FARM_OS_ENVIRONMENT_CLASSES,
  FARM_OS_ENVIRONMENT_IDS,
  FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES,
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
  type FarmOsEnvironmentClass,
  type FarmOsEnvironmentId,
} from "./farm_os_environment_identity_contract";

export const FARM_OS_ENVIRONMENT_RUNTIME_IDENTITY_EVIDENCE_SOURCE =
  "server_runtime" as const;

export type FarmOsEnvironmentRuntimeIdentityEvidence = Readonly<{
  evidence_source: typeof FARM_OS_ENVIRONMENT_RUNTIME_IDENTITY_EVIDENCE_SOURCE;
  environment_id: FarmOsEnvironmentId;
  environment_class: FarmOsEnvironmentClass;
  installation_id: string;
  farm_scope: string;
  business_timezone: string;
  core_endpoint_alias: string;
  database_bindings: Readonly<{
    app_business: Readonly<{
      resource_fingerprint: `sha256:${string}`;
      credential_class: string;
    }>;
    core_operational_memory: Readonly<{
      resource_fingerprint: `sha256:${string}`;
      credential_class: string;
    }>;
  }>;
  integration_identity_alias: string;
  manifest_digest: `sha256:${string}`;
}>;

export type FarmOsEnvironmentIdentityRuntimeComparison =
  | Readonly<{ result: "MATCH"; mismatch_fields: readonly [] }>
  | Readonly<{ result: "MISSING"; missing_fields: readonly string[] }>
  | Readonly<{ result: "UNKNOWN"; unknown_fields: readonly string[] }>
  | Readonly<{ result: "MISMATCH"; mismatch_fields: readonly string[] }>
  | Readonly<{ result: "INVALID"; invalid_fields: readonly string[] }>;

type JsonRecord = Record<string, unknown>;

const EVIDENCE_KEYS = Object.freeze([
  "business_timezone",
  "core_endpoint_alias",
  "database_bindings",
  "environment_class",
  "environment_id",
  "evidence_source",
  "farm_scope",
  "installation_id",
  "integration_identity_alias",
  "manifest_digest",
] as const);
const DATABASE_KEYS = Object.freeze([
  "app_business",
  "core_operational_memory",
] as const);
const OBSERVED_DATABASE_BINDING_KEYS = Object.freeze([
  "credential_class",
  "resource_fingerprint",
] as const);
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const ENDPOINT_ALIAS = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]);
}

function missingFields(value: JsonRecord, expected: readonly string[]): string[] {
  return expected.filter((key) => !Object.hasOwn(value, key) ||
    value[key] === null || value[key] === undefined || value[key] === "");
}

function knownEnvironmentClass(value: unknown): value is FarmOsEnvironmentClass {
  return typeof value === "string" &&
    FARM_OS_ENVIRONMENT_CLASSES.some((candidate) => candidate === value);
}

function knownEnvironmentId(value: unknown): value is FarmOsEnvironmentId {
  return typeof value === "string" &&
    Object.values(FARM_OS_ENVIRONMENT_IDS).some((candidate) => candidate === value);
}

function knownIntegrationAlias(value: unknown): boolean {
  return typeof value === "string" &&
    Object.values(FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES)
      .some((identity) => identity.identity_alias === value);
}

function invalidIdentifier(value: unknown): boolean {
  return typeof value !== "string" || !IDENTIFIER.test(value);
}

function parseObservedDatabaseBinding(value: unknown): Readonly<{
  resource_fingerprint: `sha256:${string}`;
  credential_class: string;
}> | null {
  if (!record(value) || !exact(value, OBSERVED_DATABASE_BINDING_KEYS) ||
    typeof value.resource_fingerprint !== "string" ||
    !DIGEST.test(value.resource_fingerprint) ||
    invalidIdentifier(value.credential_class)) return null;
  return Object.freeze({
    resource_fingerprint: value.resource_fingerprint as `sha256:${string}`,
    credential_class: value.credential_class as string,
  });
}

export function compareFarmOsEnvironmentIdentityRuntimeBinding(input: Readonly<{
  expected_manifest: unknown;
  observed_identity: unknown;
}>): FarmOsEnvironmentIdentityRuntimeComparison {
  const expected = parseFarmOsEnvironmentIdentityManifest(
    input.expected_manifest,
  );
  const expectedDigest = digestFarmOsEnvironmentIdentityManifest(
    input.expected_manifest,
  );
  if (expected === null || expectedDigest === null) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["expected_manifest"]),
    });
  }
  if (!record(input.observed_identity)) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["observed_identity"]),
    });
  }
  const observed = input.observed_identity;
  const missing = missingFields(observed, EVIDENCE_KEYS);
  if (missing.length > 0) {
    return Object.freeze({
      result: "MISSING",
      missing_fields: Object.freeze(missing),
    });
  }
  if (!exact(observed, EVIDENCE_KEYS)) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["observed_identity_schema"]),
    });
  }
  if (observed.evidence_source !==
      FARM_OS_ENVIRONMENT_RUNTIME_IDENTITY_EVIDENCE_SOURCE) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["evidence_source"]),
    });
  }

  const unknown: string[] = [];
  if (!knownEnvironmentClass(observed.environment_class)) {
    unknown.push("environment_class");
  }
  if (!knownEnvironmentId(observed.environment_id)) {
    unknown.push("environment_id");
  }
  if (!knownIntegrationAlias(observed.integration_identity_alias)) {
    unknown.push("integration_identity_alias");
  }
  if (unknown.length > 0) {
    return Object.freeze({
      result: "UNKNOWN",
      unknown_fields: Object.freeze(unknown),
    });
  }

  if (invalidIdentifier(observed.installation_id) ||
    invalidIdentifier(observed.farm_scope) ||
    typeof observed.business_timezone !== "string" ||
    observed.business_timezone.length < 1 ||
    observed.business_timezone.length > 64 ||
    typeof observed.core_endpoint_alias !== "string" ||
    !ENDPOINT_ALIAS.test(observed.core_endpoint_alias) ||
    /[*?]/u.test(observed.core_endpoint_alias) ||
    typeof observed.manifest_digest !== "string" ||
    !DIGEST.test(observed.manifest_digest) ||
    !record(observed.database_bindings)) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["observed_identity_value"]),
    });
  }
  const missingDatabase = missingFields(observed.database_bindings, DATABASE_KEYS);
  if (missingDatabase.length > 0) {
    return Object.freeze({
      result: "MISSING",
      missing_fields: Object.freeze(
        missingDatabase.map((field) => `database_bindings.${field}`),
      ),
    });
  }
  if (!exact(observed.database_bindings, DATABASE_KEYS)) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["database_bindings"]),
    });
  }
  const appBusiness = parseObservedDatabaseBinding(
    observed.database_bindings.app_business,
  );
  const coreOperationalMemory = parseObservedDatabaseBinding(
    observed.database_bindings.core_operational_memory,
  );
  if (appBusiness === null || coreOperationalMemory === null) {
    return Object.freeze({
      result: "INVALID",
      invalid_fields: Object.freeze(["database_binding_value"]),
    });
  }

  const mismatch: string[] = [];
  if (observed.environment_id !== expected.environment_id) {
    mismatch.push("environment_id");
  }
  if (observed.environment_class !== expected.environment_class) {
    mismatch.push("environment_class");
  }
  if (observed.installation_id !== expected.installation_id) {
    mismatch.push("installation_id");
  }
  if (observed.farm_scope !== expected.farm_scope) {
    mismatch.push("farm_scope");
  }
  if (observed.business_timezone !== expected.business_timezone) {
    mismatch.push("business_timezone");
  }
  if (observed.core_endpoint_alias !== expected.core_endpoint_alias) {
    mismatch.push("core_endpoint_alias");
  }
  if (appBusiness.resource_fingerprint !==
      expected.database_bindings.app_business.resource_fingerprint) {
    mismatch.push("database_bindings.app_business.resource_fingerprint");
  }
  if (appBusiness.credential_class !==
      expected.database_bindings.app_business.credential_class) {
    mismatch.push("database_bindings.app_business.credential_class");
  }
  if (coreOperationalMemory.resource_fingerprint !==
      expected.database_bindings.core_operational_memory.resource_fingerprint) {
    mismatch.push(
      "database_bindings.core_operational_memory.resource_fingerprint",
    );
  }
  if (coreOperationalMemory.credential_class !==
      expected.database_bindings.core_operational_memory.credential_class) {
    mismatch.push("database_bindings.core_operational_memory.credential_class");
  }
  if (observed.integration_identity_alias !==
      expected.integration_identities[0].identity_alias) {
    mismatch.push("integration_identity_alias");
  }
  if (observed.manifest_digest !== expectedDigest) {
    mismatch.push("manifest_digest");
  }
  return mismatch.length === 0
    ? Object.freeze({
      result: "MATCH",
      mismatch_fields: Object.freeze([] as const),
    })
    : Object.freeze({
      result: "MISMATCH",
      mismatch_fields: Object.freeze(mismatch),
    });
}
