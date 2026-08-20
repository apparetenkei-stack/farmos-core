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
    BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
    PRODUCTION_TARGET_MANIFEST_REQUIRED: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
    BLOCKED_CONNECTION_AUTHORITY: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
    EXECUTION_APPROVAL_LINEAGE_REQUIRED: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
    PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_REQUIRED:
      "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
    PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED: "RESOLVED_FOR_DAY150_SOURCE_CLOSURE",
    PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED:
      "RESOLVED_BY_DAY150_EXACT_FIVE_PRODUCT_OWNER_PROMOTION",
    basis: "EXACT_SIX_RECORD_QUALIFICATION_BASELINE",
  }),
  remaining_blockers: Object.freeze([
    "BLOCKED_PROVIDER_CAPACITY_DESIGN",
  ] as const),
  day150_closure_evidence: Object.freeze({
    authority: "farmos.day150-v5-blocker-source-closure-evidence.v1",
    target_manifest: "CONCRETE_SECRET_FREE_REVISION_1_RUNTIME_NOT_BOUND",
    connection: "SOURCE_IMPLEMENTED_NO_CREDENTIAL_RESOLUTION_NO_CONNECTION",
    approval_lineage: "C1_C2A_DURABLE_ATOMIC_RESERVATION_AND_RECEIPT",
    collector: "TRUSTED_CAPABILITY_ENTRYPOINT_SOURCE_ONLY",
    runtime_evidence: "RUNTIME_EVIDENCE_V2_AND_LIVE_EVIDENCE_V2_SOURCE_IMPLEMENTED",
    prefix_matrix:
      "EXACT_FIVE_APPROVED_EXPECTED_CATALOG_AUTHORITIES_ESTABLISHED_GATE17_PASS",
    consumer: "PROPOSAL_ONLY_DEFAULT_DISABLED_SOURCE_IMPLEMENTED",
    provider_capacity: "ACTIVE_DEFERRED_UNRESOLVED",
    gate13_durability: Object.freeze({
      qualification_state: "SOURCE_ISOLATED_QUALIFIED",
      production_canonical_activation_state: "NOT_EXECUTED_NOT_ACTIVATED",
      attempt_ordinal: 4,
      attempt_identity:
        "sha256:d0a46489ab3814edbc5ad03bd392b76c9722861e923854b16849c8f7d3542ed6",
      claim_digest:
        "sha256:dd8df3afb50c4bc7e3b4da6c540d1392d3ef0b39f84b8952e8dcfdac577e8695",
      terminal_digest:
        "sha256:3b6060348089faa98a7450676581b9f0ec5d624ae2cb2f9b02b860c0e0ba75db",
      qualification_result_digest:
        "sha256:3243ede481084c54b66c96891a4e8f032f281f7f0e8ff961daeadc4b231a0a29",
      evidence_digest:
        "sha256:eba44394a729a9682b9a3c1cf61b54d32236a48c1825ea15850359daa8e5f1db",
      source_set_digest:
        "sha256:4936553bd79b5e6bd4c02c8c226fbf792f9823531fc94d3f2b4c1801cee606bd",
      execution_snapshot_digest:
        "sha256:1442af5e2feb9065e290c1dc17fe530fb3dcd6059558a581b9f896e30b962ca2",
      durability_matrix: Object.freeze({ D1: "PASS", D2: "PASS", D3: "PASS",
        D4: "PASS", D5: "PASS" }),
      finite_cases: Object.freeze({ required: 18, executed: 18, validated: 18,
        evidence: 18 }),
      automatic_retry_count: 0,
      cleanup_zero_residual: true,
    }),
    production_operations: 0,
  }),
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
