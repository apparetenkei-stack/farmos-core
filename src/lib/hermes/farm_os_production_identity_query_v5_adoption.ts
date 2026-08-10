import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
} from "./farm_os_production_identity_query_v5_authority";

const qualificationImages = Object.freeze([
  Object.freeze({
    postgres_major: 14,
    server_version_num: 140023,
    status: "NOT_ELIGIBLE",
    image_tag: "postgres:14",
    image_id: "sha256:2f439458ab6a57a925825ae14f9d06910e4fe4a41c8d4a0ae06397e65b707e1b",
    image_repo_digest:
      "postgres@sha256:2f439458ab6a57a925825ae14f9d06910e4fe4a41c8d4a0ae06397e65b707e1b",
    evidence_record_count: 1,
  }),
  Object.freeze({
    postgres_major: 15,
    server_version_num: 150018,
    status: "NOT_ELIGIBLE",
    image_tag: "postgres:15",
    image_id: "sha256:6eb0add3b77c081df18aa518ce43df58fdcc40f2e6d868a6fd08038dc7acd425",
    image_repo_digest:
      "postgres@sha256:6eb0add3b77c081df18aa518ce43df58fdcc40f2e6d868a6fd08038dc7acd425",
    evidence_record_count: 1,
  }),
  Object.freeze({
    postgres_major: 16,
    server_version_num: 160014,
    status: "QUALIFIED_BASELINE",
    cases: Object.freeze(["absent", "present"] as const),
    image_tag: "postgres:16",
    image_id: "sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b",
    image_repo_digest:
      "postgres@sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b",
    evidence_record_count: 2,
  }),
  Object.freeze({
    postgres_major: 17,
    server_version_num: 170010,
    status: "QUALIFIED_BASELINE",
    cases: Object.freeze(["absent", "present"] as const),
    image_tag: "postgres:17",
    image_id: "sha256:5c855ad7b85e68e48a62f34662853f38b57c1c1d80f3a927ab58034fd6d31c5e",
    image_repo_digest:
      "postgres@sha256:5c855ad7b85e68e48a62f34662853f38b57c1c1d80f3a927ab58034fd6d31c5e",
    evidence_record_count: 2,
  }),
] as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION = Object.freeze({
  schema_version: "farmos.production-identity-query-repository-adoption.v1",
  authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
  version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.version,
  purpose: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.purpose,
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.query_artifact_path,
  artifact_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.query_sha256,
  review_status: "APPROVED",
  adoption_status: "ADOPTED",
  repository_status: "CURRENT_REPOSITORY_AUTHORITY",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_enabled: false,
  automatic_latest_selection: false,
  runtime_effect: "NONE",
  production_execution_effect: "NONE",
  human_approval_status: "RECEIVED",
  qualification: Object.freeze({
    status: "ESTABLISHED",
    qualification_source_commit: "4cfaa0455808b4197095cf2dc93f3940a8eb57c8",
    executor_authority:
      "farmos.production-identity-postgres-isolated-qualification-executor.v4",
    executor_lineage:
      "farmos.production-identity-postgres-qualification-executor-lineage.v4",
    executor_source_sha256:
      "sha256:749888c7d82c587d274e270b43b0e82521064cadae3600798e8bf8b1aad96b74",
    success_evidence_version: "v4",
    bootstrap_authority: "farmos.production-postgres-version-bootstrap-query.v1",
    query_authority: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.query_sha256,
    postgres_baselines: qualificationImages,
    postgres_18_plus_status: "UNREVIEWED",
    six_record_count: 6,
    failure_count: 0,
    cleanup_success_count: 6,
    targeted_regressions: Object.freeze({ passed: 10, total: 10, status: "PASS" }),
    typechecks: Object.freeze({ passed: 9, total: 9, status: "PASS" }),
    sol_technical_qualification: "GO",
    scope: "EXACT_OBSERVED_BASELINE_ONLY",
    future_pg16_patches_qualified: false,
    future_pg17_patches_qualified: false,
    future_image_bytes_qualified: false,
    docker_tag_alone_sufficient: false,
  }),
  requalification_policy: Object.freeze({
    query_artifact_byte_or_sha_change: "NEW_AUTHORITY_AND_FULL_REQUALIFICATION",
    executor_parser_or_lineage_semantic_change:
      "BASELINE_STALE_AND_FULL_SIX_RECORD_REQUALIFICATION",
    fixture_grant_or_principal_semantic_change: "FULL_SIX_RECORD_REQUALIFICATION",
    digest_bound_source_change: "FULL_SIX_RECORD_REQUALIFICATION",
    new_postgres_major: "UNREVIEWED_QUALIFICATION_REQUIRED",
    material_catalog_capability_drift: "REQUALIFICATION_REQUIRED",
    material_patch_behavior_drift: "REQUALIFICATION_REQUIRED",
    security_critical_dependency_change:
      "IMPACT_REVIEW_AND_FULL_QUALIFICATION_IF_RELEVANT",
    image_id_or_repo_digest_change: "OUT_OF_BASELINE_REVIEW_REQUIRED",
    image_identity_change_automatically_revokes_repository_adoption: false,
  }),
  repository_authority_supersession: Object.freeze({
    predecessor_authority_id: "farmos.production-target-identity-query.v2",
    successor_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    runtime_binding_effect: "NONE",
  }),
  candidate_artifact_lineage: Object.freeze([
    "farmos.production-target-identity-query.v3",
    "farmos.production-target-identity-query.v4",
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
  ] as const),
  resolved_blockers: Object.freeze({
    BLOCKED_POSTGRES_COMPATIBILITY: "RESOLVED",
    BLOCKED_POSTGRES_QUALIFICATION_INTEGRITY: "RESOLVED",
    basis: "EXACT_SIX_RECORD_QUALIFICATION_BASELINE",
  }),
  remaining_blockers: Object.freeze([
    "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY",
    "PRODUCTION_TARGET_MANIFEST_REQUIRED",
    "BLOCKED_CONNECTION_AUTHORITY",
    "EXECUTION_APPROVAL_LINEAGE_REQUIRED",
    "PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_REQUIRED",
    "BLOCKED_PROVIDER_CAPACITY_DESIGN",
    "PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED",
    "PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED",
  ] as const),
  executor_boundary: "ISOLATED_TECHNICAL_QUALIFICATION_ONLY",
  production_collector_authorized: false,
  production_read_client_authorized: false,
  fixture_privilege_semantics: Object.freeze({
    history_absent: Object.freeze({ schema_usage_required: false, history_select_required: false }),
    history_present: Object.freeze({
      schema_usage_required: true,
      history_select_required: true,
      schema: "core_schema",
      relation: "core_schema.migration_history",
    }),
    automatic_production_provisioning: false,
    production_requirement_owner: "FUTURE_PRODUCTION_CREDENTIAL_AUTHORITY",
  }),
  rollback_policy: Object.freeze({
    query_byte_defect: "NEW_V6_AUTHORITY",
    qualification_baseline_drift: "MARK_BASELINE_STALE_OR_OUT_OF_SCOPE_PRESERVE_V5_HISTORY",
    governance_problem: "EXPLICIT_REVOCATION_OR_SUPERSESSION_RECORD",
    mutate_historical_v5_bytes_or_history: false,
  }),
} as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION_RUNTIME_ASSERTIONS =
  Object.freeze({
    V5_AUTHORITY_ADOPTED: true,
    V5_RUNTIME_BOUND: false,
    V5_EXECUTION_ENABLED: false,
    automatic_latest: false,
    credential_resolver_calls: 0,
    connection_calls: 0,
    collector_calls: 0,
    production_database_operations: 0,
  } as const);
