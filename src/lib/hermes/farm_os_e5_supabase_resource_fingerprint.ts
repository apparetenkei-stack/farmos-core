import { createHash } from "node:crypto";

export const FARM_OS_E5_SUPABASE_RESOURCE_FINGERPRINT_AUTHORITY =
  Object.freeze({
    authority_id: "farmos.day150-5-e5.supabase-resource-fingerprint.v1",
    provider: "supabase",
    provider_class: "managed_postgres",
    canonicalization:
      "LEXICOGRAPHIC_KEYS_COMPACT_JSON_UTF8_NO_BOM_NO_TRAILING_NEWLINE",
    digest: "SHA-256",
    raw_project_ref_output: false,
  } as const);

export const FARM_OS_E5_SUPABASE_VERIFIED_RESOURCE_FINGERPRINTS =
  Object.freeze({
    staging_app_business:
      "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69",
    production_app_business_deny:
      "sha256:26783e0e593e7d714588d4cb2980be33b9ea21db24ae9dee788224769a54e48f",
  } as const);

export type FarmOsE5SupabaseResourceFingerprintResult =
  | Readonly<{
    accepted: true;
    resource_fingerprint: `sha256:${string}`;
    safe_metadata: Readonly<{
      provider: "supabase";
      provider_class: "managed_postgres";
      project_name: string;
      region: string;
      postgres_major: 17;
    }>;
  }>
  | Readonly<{
    accepted: false;
    reason: "INVALID_METADATA" | "SECRET_FIELD_REJECTED";
  }>;

const REQUIRED_KEYS = Object.freeze([
  "organization_id",
  "postgres_major",
  "project_name",
  "project_ref",
  "provider",
  "provider_class",
  "region",
] as const);
const EXCLUDED_KEYS = Object.freeze([
  "created_at",
  "db_host",
  "db_patch_version",
  "project_status",
] as const);
const SECRET_KEY = /(?:credential|password|connection_uri|api_key|token|secret)/iu;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const REGION = /^[a-z]{2}-[a-z]+-[0-9]$/u;
const PROJECT_REF = /^[a-z0-9]{8,64}$/u;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function fingerprintFarmOsE5SupabaseResource(
  value: unknown,
): FarmOsE5SupabaseResourceFingerprintResult {
  if (!record(value)) {
    return Object.freeze({ accepted: false, reason: "INVALID_METADATA" });
  }
  const keys = Object.keys(value);
  if (keys.some((key) => SECRET_KEY.test(key))) {
    return Object.freeze({ accepted: false, reason: "SECRET_FIELD_REJECTED" });
  }
  const allowed = new Set<string>([...REQUIRED_KEYS, ...EXCLUDED_KEYS]);
  if (keys.some((key) => !allowed.has(key)) ||
    REQUIRED_KEYS.some((key) => !Object.hasOwn(value, key)) ||
    value.provider !== "supabase" ||
    value.provider_class !== "managed_postgres" ||
    typeof value.organization_id !== "string" ||
    !IDENTIFIER.test(value.organization_id) ||
    typeof value.project_ref !== "string" ||
    !PROJECT_REF.test(value.project_ref) ||
    typeof value.project_name !== "string" ||
    !IDENTIFIER.test(value.project_name) ||
    typeof value.region !== "string" || !REGION.test(value.region) ||
    value.postgres_major !== 17) {
    return Object.freeze({ accepted: false, reason: "INVALID_METADATA" });
  }
  const canonical = JSON.stringify({
    organization_id: value.organization_id,
    postgres_major: value.postgres_major,
    project_name: value.project_name,
    project_ref: value.project_ref,
    provider: value.provider,
    provider_class: value.provider_class,
    region: value.region,
  });
  return Object.freeze({
    accepted: true,
    resource_fingerprint:
      `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
    safe_metadata: Object.freeze({
      provider: "supabase",
      provider_class: "managed_postgres",
      project_name: value.project_name,
      region: value.region,
      postgres_major: 17,
    }),
  });
}
