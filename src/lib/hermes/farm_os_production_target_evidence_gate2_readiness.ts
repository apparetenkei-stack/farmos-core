import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "./farm_os_production_target_identity_minimal_observation_authority";
import { FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID } from
  "./farm_os_supabase_project_resource_fingerprint";

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY_ID =
  "farmos.production-target-evidence-gate2-readiness.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES = Object.freeze([
  "ACCOUNT_SCOPE_SEMANTICS_ESTABLISHED",
  "CONNECTION_AUTHORITY_ESTABLISHED",
  "DB_CREDENTIAL_AUTHORITY_ESTABLISHED",
  "DB_LEAST_PRIVILEGE_FEASIBILITY_ESTABLISHED",
  "DURABLE_APPROVAL_SOT_ESTABLISHED",
  "DURABLE_RESERVATION_FINALIZATION_ESTABLISHED",
  "ISOLATED_RUNNER_ESTABLISHED",
  "MINIMAL_OBSERVATION_QUERY_AUTHORITY_MATCH",
  "MINIMAL_OBSERVATION_QUERY_COMMITTED_AND_TRACKED",
  "MINIMAL_OBSERVATION_QUERY_SEMANTICS_STABLE",
  "MINIMAL_OBSERVATION_QUERY_SHA_MATCH",
  "PRODUCTION_EVIDENCE_AUTHORITY_ESTABLISHED",
  "PRODUCTION_RECEIPT_AUTHORITY_ESTABLISHED",
  "PROVIDER_CREDENTIAL_AUTHORITY_ESTABLISHED",
  "PROVIDER_SOURCE_AUTHORITY_ESTABLISHED",
  "ROLLBACK_CLOSE_INTEGRATION_ESTABLISHED",
  "SANITIZED_IPC_ESTABLISHED",
  "SESSION_PRINCIPAL_VERIFICATION_ESTABLISHED",
  "SOL_FINAL_GO",
  "SOL_L1_COMMAND_ID_REMEDIATED",
  "SOURCE_COMMITTED_AND_PUSHED",
  "STORAGE_BACKED_CONCURRENCY_TESTED",
  "STORAGE_BACKED_CRASH_SEMANTICS_TESTED",
  "STORAGE_BACKED_RESTART_TESTED",
  "TARGET_ASSOCIATION_AUTHORITY_ESTABLISHED",
  "TRUSTED_CLOCK_ESTABLISHED",
] as const);

export type FarmOsProductionTargetEvidenceGate2Prerequisite =
  typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES[number];
export type FarmOsProductionTargetEvidenceGate2PrerequisiteStatus =
  "ESTABLISHED" | "PASS" | "NOT_ESTABLISHED" | "FAIL";
export type FarmOsProductionTargetEvidenceGate2PrerequisiteEvidence = Readonly<
  Record<FarmOsProductionTargetEvidenceGate2Prerequisite,
    FarmOsProductionTargetEvidenceGate2PrerequisiteStatus>
>;

const PASS_PREREQUISITES = new Set<FarmOsProductionTargetEvidenceGate2Prerequisite>([
  "MINIMAL_OBSERVATION_QUERY_AUTHORITY_MATCH",
  "MINIMAL_OBSERVATION_QUERY_COMMITTED_AND_TRACKED",
  "MINIMAL_OBSERVATION_QUERY_SEMANTICS_STABLE",
  "MINIMAL_OBSERVATION_QUERY_SHA_MATCH",
  "SOL_FINAL_GO",
  "SOL_L1_COMMAND_ID_REMEDIATED",
  "SOURCE_COMMITTED_AND_PUSHED",
  "STORAGE_BACKED_CONCURRENCY_TESTED",
  "STORAGE_BACKED_CRASH_SEMANTICS_TESTED",
  "STORAGE_BACKED_RESTART_TESTED",
]);

export type FarmOsProductionTargetEvidenceGate2BlockerCode =
  `BLOCKED_${FarmOsProductionTargetEvidenceGate2Prerequisite}`;

export type FarmOsProductionTargetEvidenceGate2ReadinessResult =
  | Readonly<{
    accepted: true;
    readiness: "READY" | "NOT_READY";
    blockers: readonly FarmOsProductionTargetEvidenceGate2BlockerCode[];
    external_call_count: 0;
    execution_authorized: false;
  }>
  | Readonly<{
    accepted: false;
    reason: "PREREQUISITE_SCHEMA_INVALID" | "PREREQUISITE_STATUS_INVALID";
    external_call_count: 0;
    execution_authorized: false;
  }>;

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PHASE_OWNERSHIP = Object.freeze({
  PHASE_A: Object.freeze([
    "GATE_2_BOUNDED_OPERATION_PROFILE",
    "PROVIDER_EVIDENCE_SEMANTICS",
    "MINIMAL_OBSERVATION_BINDING",
    "TARGET_ASSOCIATION_AUTHORITY_REQUIREMENT",
    "ISOLATED_RUNNER_AND_IPC_REQUIREMENT",
    "PRODUCTION_EVIDENCE_AUTHORITY_REQUIREMENT",
    "MANIFEST_HANDOFF",
  ] as const),
  PHASE_B: Object.freeze([
    "PROVIDER_CREDENTIAL_AUTHORITY",
    "DB_CREDENTIAL_AUTHORITY",
    "CONNECTION_AUTHORITY",
    "TLS_TARGET_PRINCIPAL_CAPABILITY_METADATA",
  ] as const),
  PHASE_C: Object.freeze([
    "APPROVAL_SOT",
    "TRUSTED_GOVERNANCE_CLOCK",
    "PROPOSAL_APPROVAL_COMMAND_RECEIPT",
    "DURABLE_RESERVATION_FINALIZATION",
    "REPLAY_CONCURRENCY_CRASH_SEMANTICS",
  ] as const),
} as const);

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY_ID,
  purpose: "SOURCE_AND_RUNTIME_EXECUTION_READINESS_CANDIDATE_EVALUATION_ONLY",
  provider_fingerprint_authority_reference:
    FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
  minimal_observation_authority_reference:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  minimal_observation_artifact_sha256_reference:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  prerequisite_schema: FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES,
  phase_ownership: FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PHASE_OWNERSHIP,
  gate_2_parallel_approval_ledger: "PROHIBITED",
  required_phase_c_canonical_durable_primitives: true,
  process_local_gate_1_authority_for_production: false,
  day134_in_memory_reservation_authority_for_production: false,
  projection_command_ledger_direct_gate_2_authority: false,
  provider_credential_class_required: "SUPABASE_PROJECT_METADATA_READER",
  database_credential_class_required: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  execution_authorized: false,
  runtime_binding_authorized: false,
  automatic_phase_transition: false,
} as const);

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_EXTERNAL_FEASIBILITY = Object.freeze({
  classification: "EXTERNAL_FEASIBILITY_REQUIRED",
  provider_source_authority: "NOT_ESTABLISHED",
  account_scope_id_actual_semantics: "NOT_ESTABLISHED",
  pg_control_system_least_privilege_feasibility: "NOT_ESTABLISHED",
  actual_session_principal_verification_path: "NOT_ESTABLISHED",
} as const);

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CONNECTION_REQUIREMENTS = Object.freeze({
  exact_target_resource_binding: true,
  database_logical_name: "farmos_core_prod",
  expected_postgres_major: 17,
  tls_mode: "VERIFY_FULL",
  expected_principal_capability_attestation: true,
  maximum_connections: 1,
  automatic_retry: 0,
  timeout: "BOUNDED_AUTHORITY_REQUIRED",
  transaction_isolation: "REPEATABLE READ",
  transaction_access_mode: "READ ONLY",
  generic_database_url_fallback: 0,
  revocation_expiry_revision_semantics: "REQUIRED",
  implementation_status: "NOT_IMPLEMENTED_G2A_SOURCE_ONLY",
} as const);

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE:
  FarmOsProductionTargetEvidenceGate2PrerequisiteEvidence = Object.freeze({
    ACCOUNT_SCOPE_SEMANTICS_ESTABLISHED: "NOT_ESTABLISHED",
    CONNECTION_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    DB_CREDENTIAL_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    DB_LEAST_PRIVILEGE_FEASIBILITY_ESTABLISHED: "NOT_ESTABLISHED",
    DURABLE_APPROVAL_SOT_ESTABLISHED: "NOT_ESTABLISHED",
    DURABLE_RESERVATION_FINALIZATION_ESTABLISHED: "NOT_ESTABLISHED",
    ISOLATED_RUNNER_ESTABLISHED: "NOT_ESTABLISHED",
    MINIMAL_OBSERVATION_QUERY_AUTHORITY_MATCH: "PASS",
    MINIMAL_OBSERVATION_QUERY_COMMITTED_AND_TRACKED: "PASS",
    MINIMAL_OBSERVATION_QUERY_SEMANTICS_STABLE: "PASS",
    MINIMAL_OBSERVATION_QUERY_SHA_MATCH: "PASS",
    PRODUCTION_EVIDENCE_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    PRODUCTION_RECEIPT_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    PROVIDER_CREDENTIAL_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    PROVIDER_SOURCE_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    ROLLBACK_CLOSE_INTEGRATION_ESTABLISHED: "NOT_ESTABLISHED",
    SANITIZED_IPC_ESTABLISHED: "NOT_ESTABLISHED",
    SESSION_PRINCIPAL_VERIFICATION_ESTABLISHED: "NOT_ESTABLISHED",
    SOL_FINAL_GO: "FAIL",
    SOL_L1_COMMAND_ID_REMEDIATED: "PASS",
    SOURCE_COMMITTED_AND_PUSHED: "FAIL",
    STORAGE_BACKED_CONCURRENCY_TESTED: "FAIL",
    STORAGE_BACKED_CRASH_SEMANTICS_TESTED: "FAIL",
    STORAGE_BACKED_RESTART_TESTED: "FAIL",
    TARGET_ASSOCIATION_AUTHORITY_ESTABLISHED: "NOT_ESTABLISHED",
    TRUSTED_CLOCK_ESTABLISHED: "NOT_ESTABLISHED",
  });

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function evaluateFarmOsProductionTargetEvidenceGate2Readiness(
  evidence: unknown,
): FarmOsProductionTargetEvidenceGate2ReadinessResult {
  if (!record(evidence)) {
    return Object.freeze({ accepted: false, reason: "PREREQUISITE_SCHEMA_INVALID",
      external_call_count: 0, execution_authorized: false });
  }
  const keys = Object.keys(evidence).sort();
  if (keys.length !== FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES.length ||
    !keys.every((key, index) =>
      key === FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES[index])) {
    return Object.freeze({ accepted: false, reason: "PREREQUISITE_SCHEMA_INVALID",
      external_call_count: 0, execution_authorized: false });
  }
  const blockers: FarmOsProductionTargetEvidenceGate2BlockerCode[] = [];
  for (const prerequisite of FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES) {
    const status = evidence[prerequisite];
    if (status !== "ESTABLISHED" && status !== "PASS" &&
      status !== "NOT_ESTABLISHED" && status !== "FAIL") {
      return Object.freeze({ accepted: false, reason: "PREREQUISITE_STATUS_INVALID",
        external_call_count: 0, execution_authorized: false });
    }
    const satisfied = PASS_PREREQUISITES.has(prerequisite) ? status === "PASS" :
      status === "ESTABLISHED";
    if (!satisfied) blockers.push(`BLOCKED_${prerequisite}`);
  }
  return Object.freeze({
    accepted: true,
    readiness: blockers.length === 0 ? "READY" : "NOT_READY",
    blockers: Object.freeze(blockers),
    external_call_count: 0,
    execution_authorized: false,
  });
}
