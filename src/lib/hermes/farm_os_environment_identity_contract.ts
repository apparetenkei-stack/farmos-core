import { createHash } from "node:crypto";

export const FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION =
  "farmos.environment-identity-manifest.v1" as const;
export const FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION =
  "farmos.environment-identity-handshake.v1" as const;
export const FARM_OS_ENVIRONMENT_IDENTITY_BUSINESS_TIMEZONE =
  "Asia/Tokyo" as const;

export const FARM_OS_ENVIRONMENT_CLASSES = Object.freeze([
  "development",
  "staging",
  "production",
] as const);
export type FarmOsEnvironmentClass =
  typeof FARM_OS_ENVIRONMENT_CLASSES[number];

export const FARM_OS_ENVIRONMENT_IDS = Object.freeze({
  development: "apparetenkei-development-primary",
  staging: "apparetenkei-staging-primary",
  production: "apparetenkei-production-primary",
} as const);
export type FarmOsEnvironmentId =
  typeof FARM_OS_ENVIRONMENT_IDS[FarmOsEnvironmentClass];

export const FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES = Object.freeze({
  development: Object.freeze({
    integration_class: "slack" as const,
    identity_alias: "slack-local-no-send" as const,
    delivery_mode: "NO_SEND" as const,
  }),
  staging: Object.freeze({
    integration_class: "slack" as const,
    identity_alias: "slack-test-primary" as const,
    delivery_mode: "TEST" as const,
  }),
  production: Object.freeze({
    integration_class: "slack" as const,
    identity_alias: "slack-production-primary" as const,
    delivery_mode: "PRODUCTION" as const,
  }),
} as const);

export const FARM_OS_ENVIRONMENT_EGRESS_POLICY = Object.freeze({
  policy_ref:
    "docs/roadmap/v5-r2-authority/Inference_Data_Egress_Policy_Core_Candidate_R2.yaml",
  policy_sha256:
    "sha256:c91586afcaeca130e7bcb4707cc066d07075b4b7d9d8d566644c5f041d7fb85f",
} as const);

export type FarmOsEnvironmentDatabaseBinding = Readonly<{
  logical_name: string;
  provider_class: string;
  resource_fingerprint: `sha256:${string}`;
  migration_head: string;
  credential_class: string;
}>;

export type FarmOsEnvironmentIntegrationIdentity =
  typeof FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES[FarmOsEnvironmentClass];

export type FarmOsEnvironmentIdentityManifest = Readonly<{
  manifest_version: typeof FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION;
  environment_id: FarmOsEnvironmentId;
  environment_class: FarmOsEnvironmentClass;
  installation_id: string;
  farm_scope: string;
  business_timezone: typeof FARM_OS_ENVIRONMENT_IDENTITY_BUSINESS_TIMEZONE;
  core_endpoint_alias: string;
  allowed_endpoint_aliases: readonly string[];
  database_bindings: Readonly<{
    app_business: FarmOsEnvironmentDatabaseBinding;
    core_operational_memory: FarmOsEnvironmentDatabaseBinding;
  }>;
  integration_identities: readonly [FarmOsEnvironmentIntegrationIdentity];
  egress_environment_policy: typeof FARM_OS_ENVIRONMENT_EGRESS_POLICY;
  contract_versions: Readonly<{
    environment_identity_handshake:
      typeof FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION;
  }>;
  provenance: Readonly<{
    authority_id: string;
    revision: number;
    source_commit: string;
    source_path: string;
  }>;
}>;

type JsonRecord = Record<string, unknown>;

const MANIFEST_KEYS = Object.freeze([
  "allowed_endpoint_aliases",
  "business_timezone",
  "contract_versions",
  "core_endpoint_alias",
  "database_bindings",
  "egress_environment_policy",
  "environment_class",
  "environment_id",
  "farm_scope",
  "installation_id",
  "integration_identities",
  "manifest_version",
  "provenance",
] as const);
const DATABASE_BINDINGS_KEYS = Object.freeze([
  "app_business",
  "core_operational_memory",
] as const);
const DATABASE_BINDING_KEYS = Object.freeze([
  "credential_class",
  "logical_name",
  "migration_head",
  "provider_class",
  "resource_fingerprint",
] as const);
const INTEGRATION_KEYS = Object.freeze([
  "delivery_mode",
  "identity_alias",
  "integration_class",
] as const);
const EGRESS_POLICY_KEYS = Object.freeze([
  "policy_ref",
  "policy_sha256",
] as const);
const CONTRACT_VERSION_KEYS = Object.freeze([
  "environment_identity_handshake",
] as const);
const PROVENANCE_KEYS = Object.freeze([
  "authority_id",
  "revision",
  "source_commit",
  "source_path",
] as const);

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/u;
const ENDPOINT_ALIAS = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const GIT_SHA = /^[a-f0-9]{40}$/u;
const FORBIDDEN_REFERENCE_VALUE = /(?:[a-z][a-z0-9+.-]*:\/\/|postgres(?:ql)?:|password|private[_-]?key|api[_-]?key|access[_-]?token|service[_-]?role[_-]?key)/iu;
const FORBIDDEN_KEY = /(?:^raw_|password|private[_-]?key|secret|api[_-]?key|access[_-]?token|connection[_-]?string|database[_-]?url|project[_-]?ref|host(?:name)?|url)$/iu;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length &&
    keys.every((key, index) => key === expected[index]);
}

function containsForbiddenKey(
  value: unknown,
  seen = new WeakSet<object>(),
): boolean {
  if (typeof value !== "object" || value === null) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenKey(item, seen));
  }
  if (!record(value)) return true;
  return Object.entries(value).some(([key, nested]) =>
    FORBIDDEN_KEY.test(key) || containsForbiddenKey(nested, seen)
  );
}

function boundedIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER.test(value) &&
    !FORBIDDEN_REFERENCE_VALUE.test(value);
}

function boundedReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE.test(value) &&
    !FORBIDDEN_REFERENCE_VALUE.test(value);
}

function endpointAlias(value: unknown): value is string {
  return typeof value === "string" && ENDPOINT_ALIAS.test(value) &&
    !/[*?]/u.test(value) && !FORBIDDEN_REFERENCE_VALUE.test(value);
}

function environmentClass(value: unknown): value is FarmOsEnvironmentClass {
  return typeof value === "string" &&
    FARM_OS_ENVIRONMENT_CLASSES.some((candidate) => candidate === value);
}

function parseDatabaseBinding(
  value: unknown,
): FarmOsEnvironmentDatabaseBinding | null {
  if (!record(value) || !exact(value, DATABASE_BINDING_KEYS) ||
    !boundedIdentifier(value.logical_name) ||
    !boundedIdentifier(value.provider_class) ||
    typeof value.resource_fingerprint !== "string" ||
    !DIGEST.test(value.resource_fingerprint) ||
    !boundedReference(value.migration_head) ||
    !boundedIdentifier(value.credential_class)) return null;
  return Object.freeze({
    logical_name: value.logical_name,
    provider_class: value.provider_class,
    resource_fingerprint: value.resource_fingerprint as `sha256:${string}`,
    migration_head: value.migration_head,
    credential_class: value.credential_class,
  });
}

function parseSourcePath(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 &&
    value.length <= 240 && !value.startsWith("/") &&
    !value.includes("//") && !value.split("/").includes("..") &&
    /^[A-Za-z0-9._/-]+$/u.test(value) &&
    !FORBIDDEN_REFERENCE_VALUE.test(value);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" ||
    typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("environment_identity_non_json");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (!record(value)) throw new Error("environment_identity_non_json");
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function parseFarmOsEnvironmentIdentityManifest(
  value: unknown,
): FarmOsEnvironmentIdentityManifest | null {
  if (!record(value) || containsForbiddenKey(value) ||
    !exact(value, MANIFEST_KEYS) ||
    value.manifest_version !== FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION ||
    !environmentClass(value.environment_class) ||
    value.environment_id !== FARM_OS_ENVIRONMENT_IDS[value.environment_class] ||
    !boundedIdentifier(value.installation_id) ||
    !boundedIdentifier(value.farm_scope) ||
    value.business_timezone !== FARM_OS_ENVIRONMENT_IDENTITY_BUSINESS_TIMEZONE ||
    !endpointAlias(value.core_endpoint_alias) ||
    !Array.isArray(value.allowed_endpoint_aliases) ||
    value.allowed_endpoint_aliases.length < 1 ||
    value.allowed_endpoint_aliases.length > 32 ||
    !value.allowed_endpoint_aliases.every(endpointAlias) ||
    new Set(value.allowed_endpoint_aliases).size !==
      value.allowed_endpoint_aliases.length ||
    !value.allowed_endpoint_aliases.includes(value.core_endpoint_alias) ||
    !record(value.database_bindings) ||
    !exact(value.database_bindings, DATABASE_BINDINGS_KEYS)) return null;

  const appBusiness = parseDatabaseBinding(value.database_bindings.app_business);
  const coreOperationalMemory = parseDatabaseBinding(
    value.database_bindings.core_operational_memory,
  );
  if (appBusiness === null || coreOperationalMemory === null ||
    appBusiness.logical_name === coreOperationalMemory.logical_name ||
    appBusiness.resource_fingerprint ===
      coreOperationalMemory.resource_fingerprint) return null;

  if (!Array.isArray(value.integration_identities) ||
    value.integration_identities.length !== 1 ||
    !record(value.integration_identities[0]) ||
    !exact(value.integration_identities[0], INTEGRATION_KEYS)) return null;
  const expectedIntegration =
    FARM_OS_ENVIRONMENT_INTEGRATION_IDENTITIES[value.environment_class];
  const integration = value.integration_identities[0];
  if (integration.integration_class !== expectedIntegration.integration_class ||
    integration.identity_alias !== expectedIntegration.identity_alias ||
    integration.delivery_mode !== expectedIntegration.delivery_mode) return null;

  if (!record(value.egress_environment_policy) ||
    !exact(value.egress_environment_policy, EGRESS_POLICY_KEYS) ||
    value.egress_environment_policy.policy_ref !==
      FARM_OS_ENVIRONMENT_EGRESS_POLICY.policy_ref ||
    value.egress_environment_policy.policy_sha256 !==
      FARM_OS_ENVIRONMENT_EGRESS_POLICY.policy_sha256 ||
    !record(value.contract_versions) ||
    !exact(value.contract_versions, CONTRACT_VERSION_KEYS) ||
    value.contract_versions.environment_identity_handshake !==
      FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION ||
    !record(value.provenance) ||
    !exact(value.provenance, PROVENANCE_KEYS) ||
    !boundedReference(value.provenance.authority_id) ||
    !Number.isSafeInteger(value.provenance.revision) ||
    Number(value.provenance.revision) < 1 ||
    Number(value.provenance.revision) > 2_147_483_647 ||
    typeof value.provenance.source_commit !== "string" ||
    !GIT_SHA.test(value.provenance.source_commit) ||
    !parseSourcePath(value.provenance.source_path)) return null;

  return Object.freeze({
    manifest_version: FARM_OS_ENVIRONMENT_IDENTITY_MANIFEST_VERSION,
    environment_id: FARM_OS_ENVIRONMENT_IDS[value.environment_class],
    environment_class: value.environment_class,
    installation_id: value.installation_id,
    farm_scope: value.farm_scope,
    business_timezone: FARM_OS_ENVIRONMENT_IDENTITY_BUSINESS_TIMEZONE,
    core_endpoint_alias: value.core_endpoint_alias,
    allowed_endpoint_aliases: Object.freeze(
      [...value.allowed_endpoint_aliases].sort(),
    ),
    database_bindings: Object.freeze({
      app_business: appBusiness,
      core_operational_memory: coreOperationalMemory,
    }),
    integration_identities: Object.freeze([
      Object.freeze({ ...expectedIntegration }),
    ]) as unknown as readonly [FarmOsEnvironmentIntegrationIdentity],
    egress_environment_policy: FARM_OS_ENVIRONMENT_EGRESS_POLICY,
    contract_versions: Object.freeze({
      environment_identity_handshake:
        FARM_OS_ENVIRONMENT_IDENTITY_HANDSHAKE_VERSION,
    }),
    provenance: Object.freeze({
      authority_id: value.provenance.authority_id,
      revision: value.provenance.revision as number,
      source_commit: value.provenance.source_commit,
      source_path: value.provenance.source_path,
    }),
  });
}

export function canonicalizeFarmOsEnvironmentIdentityManifest(
  value: unknown,
): string | null {
  const parsed = parseFarmOsEnvironmentIdentityManifest(value);
  return parsed === null ? null : canonicalJson(parsed);
}

export function digestFarmOsEnvironmentIdentityManifest(
  value: unknown,
): `sha256:${string}` | null {
  const canonical = canonicalizeFarmOsEnvironmentIdentityManifest(value);
  return canonical === null ? null :
    `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}
