import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "./farm_os_production_target_identity_minimal_observation_authority";
import {
  FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
} from "./farm_os_supabase_project_resource_source_authority";

export const FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID =
  "farmos.production-target-external-feasibility-policy.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_OUTCOMES = Object.freeze([
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
  "DB_CLUSTER_OBSERVATION_FEASIBLE",
  "DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD",
  "DB_CLUSTER_OBSERVATION_NOT_AVAILABLE",
  "SESSION_PRINCIPAL_ATTESTATION_FEASIBLE",
  "SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED",
  "FUNCTION_EXECUTE_AVAILABLE",
  "FUNCTION_EXECUTE_NOT_AVAILABLE",
  "DEDICATED_PRINCIPAL_CAPABILITY_ATTESTED",
  "DEDICATED_PRINCIPAL_CAPABILITY_NOT_ATTESTED",
  "EXTERNAL_FEASIBILITY_PASS",
  "EXTERNAL_FEASIBILITY_HOLD",
] as const);

export type FarmOsProviderFeasibilityOutcome =
  | "PROVIDER_SOURCE_FEASIBLE"
  | "PROVIDER_SOURCE_FIELD_MISSING"
  | "PROVIDER_SOURCE_FIELD_INVALID"
  | "PROVIDER_RESOURCE_REF_MISMATCH"
  | "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE"
  | "PROVIDER_SOURCE_NOT_ESTABLISHED"
  | "PROVIDER_SOURCE_UNAUTHORIZED"
  | "PROVIDER_SOURCE_UNAVAILABLE"
  | "PROVIDER_SOURCE_FETCH_FAILED"
  | "PROVIDER_SOURCE_STALE";

export type FarmOsExternalFeasibilityFacts = Readonly<{
  provider_source_outcome: FarmOsProviderFeasibilityOutcome;
  account_scope_mapping_feasible: boolean;
  pg_control_system_available: boolean;
  function_execute_available: boolean;
  execute_acl_provenance: Readonly<{
    exact_dedicated_principal: boolean;
    explicitly_approved_narrow_role: boolean;
    public_execute: boolean;
    unapproved_role_execute: boolean;
    unapproved_broad_inheritance: boolean;
  }>;
  execute_grantable: boolean;
  expected_dedicated_principal: boolean;
  current_user_matches_expected: boolean;
  session_user_matches_expected: boolean;
  current_user_equals_session_user: boolean;
  role_attributes: Readonly<{
    superuser: boolean;
    createdb: boolean;
    createrole: boolean;
    replication: boolean;
    bypassrls: boolean;
  }>;
  prohibited_role_memberships: Readonly<{
    pg_monitor: boolean;
    pg_read_all_data: boolean;
    pg_write_all_data: boolean;
    unapproved_broad_custom_role: boolean;
  }>;
}>;

export type FarmOsExternalFeasibilityResult = Readonly<{
  provider_outcome: FarmOsProviderFeasibilityOutcome;
  account_scope_outcome:
    | "ACCOUNT_SCOPE_MAPPING_FEASIBLE"
    | "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE";
  function_execute_outcome:
    | "FUNCTION_EXECUTE_AVAILABLE"
    | "FUNCTION_EXECUTE_NOT_AVAILABLE";
  least_privilege_outcome:
    | "DEDICATED_PRINCIPAL_CAPABILITY_ATTESTED"
    | "DEDICATED_PRINCIPAL_CAPABILITY_NOT_ATTESTED";
  db_cluster_observation_outcome:
    | "DB_CLUSTER_OBSERVATION_FEASIBLE"
    | "DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD"
    | "DB_CLUSTER_OBSERVATION_NOT_AVAILABLE";
  session_principal_outcome:
    | "SESSION_PRINCIPAL_ATTESTATION_FEASIBLE"
    | "SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED";
  overall_outcome: "EXTERNAL_FEASIBILITY_PASS" | "EXTERNAL_FEASIBILITY_HOLD";
  policy_status: "POLICY_DEFINED";
  actual_feasibility_status: "SYNTHETIC_EVALUATION_ONLY";
  canonical_evidence_created: false;
  gate_2_authorized: false;
  readiness_promoted: false;
  external_call_count: 0;
}>;

export const FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EXTERNAL_FEASIBILITY_POLICY_AUTHORITY_ID,
  provider_source_authority_reference:
    FARM_OS_SUPABASE_PROJECT_RESOURCE_SOURCE_AUTHORITY_ID,
  minimal_observation_authority_reference:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  minimal_observation_artifact_sha256_reference:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  intended_cluster_identity_source: "pg_control_system().system_identifier",
  policy_status: "POLICY_DEFINED",
  actual_provider_feasibility_status: "NOT_ESTABLISHED",
  actual_account_scope_feasibility_status: "NOT_ESTABLISHED",
  actual_db_capability_status: "NOT_ESTABLISHED",
  actual_session_principal_status: "NOT_ESTABLISHED",
  actual_probe_status: "HOLD_EXTERNAL_CAPABILITY_PROBE",
  gate_2_status: "NOT_AUTHORIZED",
  phase_b_status: "NOT_STARTED",
  production_access_status: "NOT_AUTHORIZED",
  tls_boundary: Object.freeze({
    requirement: "TLS_ATTESTATION_REQUIRED",
    owner: "PHASE_B_CONNECTION_AUTHORITY",
    sql_inference: "PROHIBITED",
  }),
  provider_probe: Object.freeze({
    endpoint_class: "GET_SINGLE_PROJECT",
    semantic_source: "GET /v1/projects/{ref}",
    pinned_get_maximum: 1,
    list_or_search: 0,
    writes: 0,
    automatic_retry: 0,
    authorization: Object.freeze({
      oauth_scope: "projects:read",
      fine_grained_token_permission: "project_admin_read",
    }),
    checks: Object.freeze([
      "REQUESTED_REF_EQUALS_RETURNED_REF",
      "ORGANIZATION_ID_NON_NULL",
      "REF_NON_NULL",
      "FINGERPRINT_INPUT_COMPATIBILITY_PASS",
    ] as const),
    raw_provider_values: "DISCARD_REQUIRED",
    result_reusability: "NONCANONICAL_NON_REUSABLE",
    readiness_promotion: false,
    implementation_status: "NOT_IMPLEMENTED_SOURCE_POLICY_ONLY",
  }),
  db_capability_probe: Object.freeze({
    connection_maximum: 1,
    transaction: "REPEATABLE READ READ ONLY",
    automatic_retry: 0,
    commit: 0,
    rollback: "REQUIRED",
    connection_close: "REQUIRED",
    business_or_application_rows: 0,
    pg_control_system_execution: 0,
    canonical_cluster_digest_generation: 0,
    allowed_inspection_facts: Object.freeze([
      "current_user",
      "session_user",
      "current_database()",
      "current_setting('server_version_num')",
      "current_setting('transaction_read_only')",
      "to_regprocedure('pg_catalog.pg_control_system()')",
      "has_function_privilege(current_user, function_oid, 'EXECUTE')",
      "OWN_PRINCIPAL_ROW_FROM_PG_CATALOG_PG_ROLES_ONLY",
      "TARGET_FUNCTION_OID_FROM_PG_CATALOG_PG_PROC_ONLY",
      "aclexplode(COALESCE(proacl, acldefault('f', proowner)))",
      "pg_has_role_FOR_EXPLICITLY_PROHIBITED_BROAD_ROLES_ONLY",
    ] as const),
    implementation_status: "NOT_IMPLEMENTED_SOURCE_POLICY_ONLY",
  }),
  accepted_execute_provenance: Object.freeze([
    "EXACT_DEDICATED_PRINCIPAL",
    "EXPLICITLY_APPROVED_NARROW_ROLE",
  ] as const),
  execute_grantable_required: false,
  prohibited_broad_roles: Object.freeze([
    "SUPERUSER",
    "pg_monitor",
    "pg_read_all_data",
    "pg_write_all_data",
    "UNAPPROVED_BROAD_PREDEFINED_OR_CUSTOM_ROLE",
  ] as const),
  public_execute_establishes_dedicated_capability: false,
  function_execute_alone_establishes_least_privilege: false,
  principal_attestation: Object.freeze({
    current_user: "REQUIRED",
    session_user: "REQUIRED",
    expected_principal_reference: "REQUIRED",
    phase_b_connection_authority_principal_match: "REQUIRED",
    unresolved_outcome: "SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED",
    minimal_query_mutation: "PROHIBITED",
  }),
  feasibility_is_formal_evidence: false,
  canonical_outputs: Object.freeze({
    provider_resource_fingerprint: 0,
    cluster_system_identifier_digest: 0,
    manifest_revision: 0,
    gate_2_durable_receipt: 0,
    execution_approval: 0,
    readiness_auto_transition: 0,
  }),
  alternative_hold_paths_for_separate_review: Object.freeze([
    "PROVIDER_ATTESTED_IMMUTABLE_DB_OR_CLUSTER_IDENTITY",
    "VERSIONED_ALTERNATIVE_MINIMAL_OBSERVATION_AUTHORITY",
    "EXPLICIT_PRIVILEGED_ONE_SHOT_BOOTSTRAP_OBSERVATION",
  ] as const),
  prohibited_identity_inference: Object.freeze([
    "HOSTNAME_SUBSTRING",
    "PROJECT_REF_SUBSTRING",
    "SAME_CREDENTIAL",
    "DATABASE_LOGICAL_NAME_ALONE",
    "REGION",
    "CONNECTION_ENDPOINT",
  ] as const),
  phase_ownership: Object.freeze({
    PHASE_A: Object.freeze([
      "PROVIDER_SOURCE_POLICY",
      "MINIMAL_OBSERVATION_SEMANTICS",
      "SAME_TARGET_EVIDENCE_REQUIREMENTS",
    ] as const),
    PHASE_B: Object.freeze([
      "CREDENTIAL_AUTHORITY",
      "CONNECTION_AUTHORITY",
      "TLS_PRINCIPAL_GRANT_PROVENANCE",
    ] as const),
    PHASE_C: Object.freeze([
      "APPROVAL_SOT",
      "TRUSTED_CLOCK",
      "DURABLE_EXECUTION_LIFECYCLE",
    ] as const),
  }),
  external_calls: 0,
  execution_enabled: false,
  runtime_binding_authorized: false,
} as const);

function hasExcessAuthority(facts: FarmOsExternalFeasibilityFacts): boolean {
  return facts.role_attributes.superuser || facts.role_attributes.createdb ||
    facts.role_attributes.createrole || facts.role_attributes.replication ||
    facts.role_attributes.bypassrls ||
    facts.prohibited_role_memberships.pg_monitor ||
    facts.prohibited_role_memberships.pg_read_all_data ||
    facts.prohibited_role_memberships.pg_write_all_data ||
    facts.prohibited_role_memberships.unapproved_broad_custom_role;
}

function acceptedExecuteProvenanceCount(
  facts: FarmOsExternalFeasibilityFacts,
): number {
  return Number(facts.execute_acl_provenance.exact_dedicated_principal) +
    Number(facts.execute_acl_provenance.explicitly_approved_narrow_role);
}

function hasForbiddenExecuteProvenance(
  facts: FarmOsExternalFeasibilityFacts,
): boolean {
  return facts.execute_acl_provenance.public_execute ||
    facts.execute_acl_provenance.unapproved_role_execute ||
    facts.execute_acl_provenance.unapproved_broad_inheritance;
}

export function evaluateFarmOsProductionTargetExternalFeasibility(
  facts: FarmOsExternalFeasibilityFacts,
): FarmOsExternalFeasibilityResult {
  const sessionAttested = facts.expected_dedicated_principal &&
    facts.current_user_matches_expected && facts.session_user_matches_expected &&
    facts.current_user_equals_session_user;
  const acceptedProvenanceCount = acceptedExecuteProvenanceCount(facts);
  const forbiddenProvenance = hasForbiddenExecuteProvenance(facts);
  const exactNarrowCapability = facts.pg_control_system_available &&
    facts.function_execute_available && acceptedProvenanceCount === 1 &&
    !forbiddenProvenance && !facts.execute_grantable && !hasExcessAuthority(facts);
  const leastPrivilegeAttested = exactNarrowCapability && sessionAttested;
  const privilegeTooBroad = facts.function_execute_available &&
    (acceptedProvenanceCount > 1 || forbiddenProvenance ||
      facts.execute_grantable || hasExcessAuthority(facts));
  const dbOutcome = !facts.pg_control_system_available ||
      !facts.function_execute_available
    ? "DB_CLUSTER_OBSERVATION_NOT_AVAILABLE"
    : privilegeTooBroad
    ? "DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD"
    : exactNarrowCapability
    ? "DB_CLUSTER_OBSERVATION_FEASIBLE"
    : "DB_CLUSTER_OBSERVATION_NOT_AVAILABLE";
  const providerFeasible = facts.provider_source_outcome ===
    "PROVIDER_SOURCE_FEASIBLE";
  const accountScopeFeasible = providerFeasible &&
    facts.account_scope_mapping_feasible;
  const overallPass = accountScopeFeasible &&
    dbOutcome === "DB_CLUSTER_OBSERVATION_FEASIBLE" && sessionAttested;

  return Object.freeze({
    provider_outcome: facts.provider_source_outcome,
    account_scope_outcome: accountScopeFeasible
      ? "ACCOUNT_SCOPE_MAPPING_FEASIBLE"
      : "PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE",
    function_execute_outcome: facts.function_execute_available
      ? "FUNCTION_EXECUTE_AVAILABLE"
      : "FUNCTION_EXECUTE_NOT_AVAILABLE",
    least_privilege_outcome: leastPrivilegeAttested
      ? "DEDICATED_PRINCIPAL_CAPABILITY_ATTESTED"
      : "DEDICATED_PRINCIPAL_CAPABILITY_NOT_ATTESTED",
    db_cluster_observation_outcome: dbOutcome,
    session_principal_outcome: sessionAttested
      ? "SESSION_PRINCIPAL_ATTESTATION_FEASIBLE"
      : "SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED",
    overall_outcome: overallPass
      ? "EXTERNAL_FEASIBILITY_PASS"
      : "EXTERNAL_FEASIBILITY_HOLD",
    policy_status: "POLICY_DEFINED",
    actual_feasibility_status: "SYNTHETIC_EVALUATION_ONLY",
    canonical_evidence_created: false,
    gate_2_authorized: false,
    readiness_promoted: false,
    external_call_count: 0,
  });
}
