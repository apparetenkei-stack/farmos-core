import {
  canonicalizeFarmOsSupabaseProjectResourceTuple,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY,
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  FARM_OS_SUPABASE_PROVIDER_NAMESPACE,
  FARM_OS_SUPABASE_RESOURCE_TYPE,
  type FarmOsSupabaseProjectResourceTuple,
} from "./farm_os_supabase_project_resource_fingerprint";

export const FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID =
  "farmos.supabase-project-resource-source-authority.v1" as const;

export const FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_OUTCOMES = Object.freeze([
  "PROVIDER_SOURCE_FEASIBLE",
  "ACCOUNT_SCOPE_MAPPING_FEASIBLE",
  "PROVIDER_SOURCE_FIELD_MISSING",
  "PROVIDER_SOURCE_FIELD_INVALID",
  "PROVIDER_RESOURCE_REF_MISMATCH",
  "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE",
  "PROVIDER_SOURCE_NOT_ESTABLISHED",
  "PROVIDER_SOURCE_UNAUTHORIZED",
  "PROVIDER_SOURCE_UNAVAILABLE",
  "PROVIDER_SOURCE_FETCH_FAILED",
  "PROVIDER_SOURCE_STALE",
] as const);

export type FarmOsSupabaseProjectResourceSourceOutcome =
  typeof FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_OUTCOMES[number];

export const FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
  responsibility: "RAW_PROVIDER_TUPLE_SOURCE_AND_MAPPING_ONLY",
  fingerprint_authority_reference:
    FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  endpoint_class: "GET_SINGLE_PROJECT",
  semantic_source: "GET /v1/projects/{ref}",
  required_provider_scope: "projects:read",
  fine_grained_token_permission: "project_admin_read",
  authorization_modes: Object.freeze({
    OAUTH: Object.freeze({ required_scope: "projects:read" }),
    FINE_GRAINED_TOKEN: Object.freeze({ required_permission: "project_admin_read" }),
  }),
  maximum_provider_reads: 1,
  supported_operations: Object.freeze(["PINNED_GET_SINGLE_PROJECT"] as const),
  prohibited_operations: Object.freeze([
    "LIST_PROJECTS",
    "SEARCH_PROJECTS",
    "LATEST_PROJECT",
    "FIRST_MATCH",
    "ORGANIZATION_WIDE_SCAN",
    "FALLBACK_PROJECT",
    "WRITE",
    "UPDATE",
    "DELETE",
    "RESOURCE_AUTO_DISCOVERY",
  ] as const),
  field_mapping: Object.freeze({
    provider_namespace: Object.freeze({ fixed: FARM_OS_SUPABASE_PROVIDER_NAMESPACE }),
    resource_type: Object.freeze({ fixed: FARM_OS_SUPABASE_RESOURCE_TYPE }),
    provider_class: Object.freeze({
      fixed: FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY.provider_class,
    }),
    account_scope_id: Object.freeze({
      source: "organization_id",
      required: true,
      nullable: false,
      fallback: false,
    }),
    resource_id: Object.freeze({
      source: "ref",
      required: true,
      nullable: false,
      requested_ref_match_required: true,
      fallback: false,
    }),
  }),
  allowed_raw_provider_fields: Object.freeze(["organization_id", "ref"] as const),
  forbidden_raw_provider_fields: Object.freeze([
    "organization_slug",
    "name",
    "region",
    "host",
    "status",
    "created_at",
    "database_metadata",
    "endpoint",
    "url",
    "response_body",
  ] as const),
  raw_identifier_persistence: "FORBIDDEN",
  raw_identifier_error_embedding: "FORBIDDEN",
  compatibility_validation_owner:
    FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  fingerprint_computation: "NOT_OWNED",
  actual_http_implementation: 0,
  credential_access: 0,
  network_imports: 0,
  actual_source_status: "NOT_ESTABLISHED",
} as const);

export type FarmOsSupabaseProjectResourceSourceResult =
  | Readonly<{
    accepted: true;
    provider_source_outcome: "PROVIDER_SOURCE_FEASIBLE";
    account_scope_outcome: "ACCOUNT_SCOPE_MAPPING_FEASIBLE";
    fingerprint_input: FarmOsSupabaseProjectResourceTuple;
    persisted_raw_identifier_count: 0;
    fingerprint_computed: false;
    external_call_count: 0;
  }>
  | Readonly<{
    accepted: false;
    outcome: Exclude<
      FarmOsSupabaseProjectResourceSourceOutcome,
      "PROVIDER_SOURCE_FEASIBLE" | "ACCOUNT_SCOPE_MAPPING_FEASIBLE"
    >;
    persisted_raw_identifier_count: 0;
    fingerprint_computed: false;
    external_call_count: 0;
  }>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejected(
  outcome: Extract<FarmOsSupabaseProjectResourceSourceResult, { accepted: false }>["outcome"],
): FarmOsSupabaseProjectResourceSourceResult {
  return Object.freeze({
    accepted: false,
    outcome,
    persisted_raw_identifier_count: 0,
    fingerprint_computed: false,
    external_call_count: 0,
  });
}

export function mapFarmOsSupabaseSingleProjectResourceSource(
  requestedRef: unknown,
  providerResponse: unknown,
): FarmOsSupabaseProjectResourceSourceResult {
  if (!record(providerResponse)) return rejected("PROVIDER_SOURCE_NOT_ESTABLISHED");
  if (!("organization_id" in providerResponse) || !("ref" in providerResponse)) {
    return rejected("PROVIDER_SOURCE_FIELD_MISSING");
  }
  if (providerResponse.organization_id === null) {
    return rejected("PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE");
  }
  if (typeof requestedRef !== "string" ||
    typeof providerResponse.organization_id !== "string" ||
    typeof providerResponse.ref !== "string") {
    return rejected("PROVIDER_SOURCE_FIELD_INVALID");
  }
  if (providerResponse.ref !== requestedRef) {
    return rejected("PROVIDER_RESOURCE_REF_MISMATCH");
  }
  const fingerprintInput: FarmOsSupabaseProjectResourceTuple = Object.freeze({
    provider_namespace: FARM_OS_SUPABASE_PROVIDER_NAMESPACE,
    resource_type: FARM_OS_SUPABASE_RESOURCE_TYPE,
    account_scope_id: providerResponse.organization_id,
    resource_id: providerResponse.ref,
  });
  if (canonicalizeFarmOsSupabaseProjectResourceTuple(fingerprintInput) === null) {
    return rejected("PROVIDER_SOURCE_FIELD_INVALID");
  }
  return Object.freeze({
    accepted: true,
    provider_source_outcome: "PROVIDER_SOURCE_FEASIBLE",
    account_scope_outcome: "ACCOUNT_SCOPE_MAPPING_FEASIBLE",
    fingerprint_input: fingerprintInput,
    persisted_raw_identifier_count: 0,
    fingerprint_computed: false,
    external_call_count: 0,
  });
}
