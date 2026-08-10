import { createHash } from "node:crypto";

export const FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID =
  "farmos.supabase-project-resource-fingerprint.v1" as const;
export const FARM_OS_SUPABASE_PROVIDER_NAMESPACE = "supabase.com" as const;
export const FARM_OS_SUPABASE_RESOURCE_TYPE = "project" as const;

export const FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  provider_class: "managed_postgres",
  provider_implementation_family: "Supabase Managed PostgreSQL",
  provider_namespace: FARM_OS_SUPABASE_PROVIDER_NAMESPACE,
  resource_type: FARM_OS_SUPABASE_RESOURCE_TYPE,
  value_grammar: "[A-Za-z0-9](?:[A-Za-z0-9_-]{0,126}[A-Za-z0-9])?",
  maximum_length_bytes: 128,
  encoding: "ASCII",
  case_sensitivity: "CASE_SENSITIVE",
  uniqueness_scope:
    "authority_id + provider_class + provider_namespace + resource_type + account_scope_id + resource_id",
  field_mapping: Object.freeze({
    account_scope_id: "Exact ASCII scope identifier or null when provider authority supplies no scope",
    resource_id: "Supabase project resource identifier",
  }),
  account_scope_id_schema: "string | null",
  canonical_serialization: "SORTED_KEY_CANONICAL_JSON_UTF8_NO_WHITESPACE_NO_LF",
  domain_separation: FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  digest: "SHA-256",
  output_grammar: "sha256:<64 lowercase hexadecimal characters>",
  implicit_trim: false,
  implicit_case_folding: false,
  implicit_unicode_normalization: false,
  fallback_mapping: false,
  raw_persistence: "FORBIDDEN",
} as const);

export type FarmOsSupabaseProjectResourceTuple = Readonly<{
  provider_namespace: string;
  resource_type: string;
  account_scope_id: string | null;
  resource_id: string;
}>;

export type FarmOsSupabaseProjectResourceFingerprintResult =
  | Readonly<{ accepted: true; fingerprint: `sha256:${string}` }>
  | Readonly<{
    accepted: false;
    reason:
      | "PROVIDER_NAMESPACE_MISMATCH"
      | "RESOURCE_TYPE_MISMATCH"
      | "ACCOUNT_SCOPE_ID_INVALID"
      | "RESOURCE_ID_INVALID"
      | "SECRET_LIKE_INPUT_REJECTED";
  }>;

const VALUE = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,126}[A-Za-z0-9])?$/u;
const SECRET_LIKE = /(?:^eyJ|jwt|token|secret|api[_-]?key|service[_-]?role|password|postgres(?:ql)?:\/\/|https?:\/\/|[.@:/\\])/iu;

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 &&
    Buffer.byteLength(value, "ascii") === value.length && VALUE.test(value);
}

function isSecretLike(value: unknown): boolean {
  return typeof value === "string" && SECRET_LIKE.test(value);
}

export function canonicalizeFarmOsSupabaseProjectResourceTuple(
  input: FarmOsSupabaseProjectResourceTuple,
): string | null {
  const accountScopeId: unknown = input.account_scope_id;
  if (input.provider_namespace !== FARM_OS_SUPABASE_PROVIDER_NAMESPACE ||
    input.resource_type !== FARM_OS_SUPABASE_RESOURCE_TYPE ||
    (accountScopeId !== null && !validIdentifier(accountScopeId)) ||
    !validIdentifier(input.resource_id) ||
    isSecretLike(accountScopeId) || isSecretLike(input.resource_id)) return null;
  return JSON.stringify({
    account_scope_id: accountScopeId,
    authority_id: FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
    provider_class: FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY.provider_class,
    provider_namespace: input.provider_namespace,
    resource_id: input.resource_id,
    resource_type: input.resource_type,
  });
}

export function fingerprintFarmOsSupabaseProjectResource(
  input: FarmOsSupabaseProjectResourceTuple,
): FarmOsSupabaseProjectResourceFingerprintResult {
  const accountScopeId: unknown = input.account_scope_id;
  if (input.provider_namespace !== FARM_OS_SUPABASE_PROVIDER_NAMESPACE) {
    return Object.freeze({ accepted: false, reason: "PROVIDER_NAMESPACE_MISMATCH" });
  }
  if (input.resource_type !== FARM_OS_SUPABASE_RESOURCE_TYPE) {
    return Object.freeze({ accepted: false, reason: "RESOURCE_TYPE_MISMATCH" });
  }
  if (isSecretLike(accountScopeId) || isSecretLike(input.resource_id)) {
    return Object.freeze({ accepted: false, reason: "SECRET_LIKE_INPUT_REJECTED" });
  }
  if (accountScopeId !== null && !validIdentifier(accountScopeId)) {
    return Object.freeze({ accepted: false, reason: "ACCOUNT_SCOPE_ID_INVALID" });
  }
  if (!validIdentifier(input.resource_id)) {
    return Object.freeze({ accepted: false, reason: "RESOURCE_ID_INVALID" });
  }
  const canonical = canonicalizeFarmOsSupabaseProjectResourceTuple(input);
  if (canonical === null) {
    return Object.freeze({ accepted: false, reason: "RESOURCE_ID_INVALID" });
  }
  return Object.freeze({
    accepted: true,
    fingerprint: `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
  });
}
