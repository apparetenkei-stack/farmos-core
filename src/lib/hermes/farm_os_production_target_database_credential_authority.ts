export const FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID =
  "farmos.production-target-database-credential-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID =
  "farmos.production-target-database-credential-broker.v1" as const;
import {
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
} from "./farm_os_production_target_principal_capability_authority";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
  isFarmOsProductionTargetAuthorityRevision,
} from "./farm_os_production_target_authority_lifecycle";

export { FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID };

export const FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_POLICY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  revision: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_REVISION,
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  database_logical_name: "farmos_core_prod",
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  allowed_operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY",
  maximum_connections: 1,
  prohibited_implicit_capabilities: Object.freeze([
    "DML_WRITE", "DDL", "MIGRATION", "GRANT", "REVOKE", "ROLE_MUTATION",
    "ARBITRARY_SQL", "GENERIC_DATABASE_URL",
  ] as const),
  expiry_policy: "ABSOLUTE_TIMESTAMP_REQUIRED",
  rotation_semantics: "NEW_OPAQUE_HANDLE_AND_NEW_AUTHORITY_REVISION_REQUIRED",
  revocation_semantics: "EXACT_REVISION_FAIL_CLOSED_HISTORICAL_REVISION_RETAINED",
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  broker_authority_revision: 1,
  fallback: "PROHIBITED",
  review_status: "CANDIDATE_FOR_APPROVAL",
  probe_use_state: "NOT_AUTHORIZED",
  qualification_state: "NOT_ESTABLISHED",
  adoption_state: "NOT_ADOPTED",
  runtime_binding_state: "NOT_RUNTIME_BOUND",
  automatic_latest_selection: false,
  credential_material_storage: "FORBIDDEN",
} as const);

export type FarmOsProductionTargetDatabaseCredentialAuthority = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID;
  revision: number;
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER";
  approved_target_resource_digest: `sha256:${string}`;
  database_logical_name: "farmos_core_prod";
  expected_principal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID;
  expected_principal_authority_revision: number;
  allowed_operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY";
  maximum_connections: number;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
  broker_authority_revision: number;
  fallback: "PROHIBITED";
}>;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const EXACT_KEYS = Object.freeze([
  "activates_at", "allowed_operation_class", "approved_target_resource_digest", "authority_id",
  "broker_authority_id", "broker_authority_revision", "credential_class",
  "database_logical_name", "expected_principal_authority_id",
  "expected_principal_authority_revision", "expires_at", "fallback",
  "maximum_connections", "revision", "revoked",
] as const);
const MATERIAL_KEY = /^(?:api[_-]?key|connection[_-]?string|credential[_-]?value|database[_-]?url|dsn|env(?:ironment)?(?:[_-]?value)?|jwt|password|secret|token)$/iu;
const MATERIAL_VALUE = /(?:^eyJ|postgres(?:ql)?:\/\/|https?:\/\/|BEGIN (?:RSA )?PRIVATE KEY)/u;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateFarmOsProductionTargetDatabaseCredentialAuthority(
  value: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): Readonly<{ accepted: boolean; reason: string }> {
  if (!record(value) || Object.entries(value).some(([key, field]) =>
    MATERIAL_KEY.test(key) || (typeof field === "string" && MATERIAL_VALUE.test(field)))) {
    return Object.freeze({ accepted: false, reason: "SECRET_MATERIAL_OR_SCHEMA_REJECTED" });
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== EXACT_KEYS.length || !keys.every((key, index) => key === EXACT_KEYS[index])) {
    return Object.freeze({ accepted: false, reason: "AUTHORITY_SCHEMA_INVALID" });
  }
  if (!DIGEST.test(String(value.approved_target_resource_digest)) ||
    value.approved_target_resource_digest !== expected.approved_target_resource_digest) {
    return Object.freeze({ accepted: false, reason: "TARGET_RESOURCE_DIGEST_MISMATCH" });
  }
  if (value.authority_id !== FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID ||
    value.revision !== expected.revision || expected.revision !== 1 ||
    !isFarmOsProductionTargetAuthorityRevision(value.revision)) {
    return Object.freeze({ accepted: false, reason: "UNKNOWN_OR_INVALID_REVISION" });
  }
  if (value.credential_class !== "POSTGRES_PRODUCTION_TARGET_VERIFY_READER" ||
    value.database_logical_name !== "farmos_core_prod" ||
    value.allowed_operation_class !== "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY") {
    return Object.freeze({ accepted: false, reason: "CLASS_DATABASE_OR_OPERATION_MISMATCH" });
  }
  if (value.expected_principal_authority_id !== FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID ||
    value.expected_principal_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "PRINCIPAL_AUTHORITY_MISMATCH" });
  }
  if (value.maximum_connections !== 1) {
    return Object.freeze({ accepted: false, reason: "MAXIMUM_CONNECTIONS_EXCEEDED" });
  }
  if (value.broker_authority_id !== FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID ||
    value.broker_authority_revision !== 1 || value.fallback !== "PROHIBITED") {
    return Object.freeze({ accepted: false, reason: "BROKER_OR_FALLBACK_INVALID" });
  }
  if (evaluateFarmOsProductionTargetAuthorityLifecycle({
    activates_at: String(value.activates_at),
    expires_at: String(value.expires_at),
    revoked: value.revoked as boolean,
  }, expected.now) !== "ACTIVE") {
    return Object.freeze({ accepted: false, reason: "AUTHORITY_REVOKED_OR_EXPIRED" });
  }
  return Object.freeze({ accepted: true, reason: "VALID" });
}

export function resolveFarmOsProductionTargetDatabaseCredentialAuthorityExact(
  authorities: readonly unknown[],
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): FarmOsProductionTargetDatabaseCredentialAuthority | null {
  if (expected.revision !== 1) return null;
  const matches = authorities.filter((candidate) =>
    validateFarmOsProductionTargetDatabaseCredentialAuthority(candidate, expected).accepted);
  return matches.length === 1 ? matches[0] as FarmOsProductionTargetDatabaseCredentialAuthority : null;
}
