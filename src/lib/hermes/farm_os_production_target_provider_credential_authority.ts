import {
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
} from "./farm_os_supabase_project_resource_fingerprint";
import {
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
} from "./farm_os_supabase_project_resource_source_authority";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "./farm_os_production_target_identity_minimal_observation_authority";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
  isFarmOsProductionTargetAuthorityRevision,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID =
  "farmos.production-target-provider-credential-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID =
  "farmos.production-target-provider-credential-broker.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_POLICY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  revision: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_REVISION,
  credential_class: "SUPABASE_PROJECT_METADATA_READER",
  provider_class: "managed_postgres",
  provider_family: "Supabase Managed PostgreSQL",
  provider_source_authority_reference: FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
  provider_fingerprint_authority_reference:
    FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  minimal_observation_authority_reference:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  minimal_observation_artifact_sha256_reference:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  allowed_endpoint_class: "GET_SINGLE_PROJECT",
  allowed_method: "GET",
  allowed_provider_scope: "projects:read",
  maximum_calls: 1,
  expiry_policy: "ABSOLUTE_TIMESTAMP_REQUIRED",
  rotation_semantics: "NEW_OPAQUE_HANDLE_AND_NEW_AUTHORITY_REVISION_REQUIRED",
  revocation_semantics: "EXACT_REVISION_FAIL_CLOSED_HISTORICAL_REVISION_RETAINED",
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
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

export type FarmOsProductionTargetProviderCredentialAuthority = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID;
  revision: number;
  credential_class: "SUPABASE_PROJECT_METADATA_READER";
  provider_class: "managed_postgres";
  provider_family: "Supabase Managed PostgreSQL";
  approved_target_resource_digest: `sha256:${string}`;
  allowed_endpoint_class: "GET_SINGLE_PROJECT";
  allowed_method: "GET";
  allowed_provider_scope: "projects:read";
  maximum_calls: number;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID;
  broker_authority_revision: number;
  fallback: "PROHIBITED";
}>;

export type FarmOsProviderCredentialAuthorityValidation = Readonly<{
  accepted: boolean;
  reason: string;
}>;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const EXACT_KEYS = Object.freeze([
  "activates_at", "allowed_endpoint_class", "allowed_method", "allowed_provider_scope",
  "approved_target_resource_digest", "authority_id", "broker_authority_id",
  "broker_authority_revision", "credential_class", "expires_at", "fallback",
  "maximum_calls", "provider_class", "provider_family", "revision", "revoked",
] as const);
const MATERIAL_KEY = /^(?:api[_-]?key|connection[_-]?string|credential[_-]?value|database[_-]?url|dsn|env(?:ironment)?(?:[_-]?value)?|jwt|password|secret|token)$/iu;
const MATERIAL_VALUE = /(?:^eyJ|postgres(?:ql)?:\/\/|https?:\/\/|BEGIN (?:RSA )?PRIVATE KEY)/u;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function materialPresent(value: Record<string, unknown>): boolean {
  return Object.entries(value).some(([key, field]) =>
    MATERIAL_KEY.test(key) || (typeof field === "string" && MATERIAL_VALUE.test(field)));
}

export function validateFarmOsProductionTargetProviderCredentialAuthority(
  value: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): FarmOsProviderCredentialAuthorityValidation {
  if (!record(value) || materialPresent(value)) {
    return Object.freeze({ accepted: false, reason: "SECRET_MATERIAL_OR_SCHEMA_REJECTED" });
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== EXACT_KEYS.length ||
    !keys.every((key, index) => key === EXACT_KEYS[index])) {
    return Object.freeze({ accepted: false, reason: "AUTHORITY_SCHEMA_INVALID" });
  }
  if (!DIGEST.test(String(value.approved_target_resource_digest)) ||
    value.approved_target_resource_digest !== expected.approved_target_resource_digest) {
    return Object.freeze({ accepted: false, reason: "TARGET_RESOURCE_DIGEST_MISMATCH" });
  }
  if (value.authority_id !== FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID ||
    value.revision !== expected.revision || expected.revision !== 1 ||
    !isFarmOsProductionTargetAuthorityRevision(value.revision)) {
    return Object.freeze({ accepted: false, reason: "UNKNOWN_OR_INVALID_REVISION" });
  }
  if (value.credential_class !== "SUPABASE_PROJECT_METADATA_READER" ||
    value.provider_class !== "managed_postgres" ||
    value.provider_family !== "Supabase Managed PostgreSQL") {
    return Object.freeze({ accepted: false, reason: "PROVIDER_OR_CREDENTIAL_CLASS_MISMATCH" });
  }
  if (value.allowed_endpoint_class !== "GET_SINGLE_PROJECT" || value.allowed_method !== "GET" ||
    value.allowed_provider_scope !== "projects:read") {
    return Object.freeze({ accepted: false, reason: "OPERATION_OR_SCOPE_NOT_ALLOWED" });
  }
  if (value.maximum_calls !== 1) {
    return Object.freeze({ accepted: false, reason: "MAXIMUM_CALLS_EXCEEDED" });
  }
  if (value.broker_authority_id !== FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID ||
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

export function resolveFarmOsProductionTargetProviderCredentialAuthorityExact(
  authorities: readonly unknown[],
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): FarmOsProductionTargetProviderCredentialAuthority | null {
  if (expected.revision !== 1) return null;
  const matches = authorities.filter((candidate) =>
    validateFarmOsProductionTargetProviderCredentialAuthority(candidate, expected).accepted);
  return matches.length === 1 ? matches[0] as FarmOsProductionTargetProviderCredentialAuthority : null;
}
