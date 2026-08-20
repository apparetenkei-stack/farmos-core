import { createHash } from "node:crypto";
import { posix as pathPosix } from "node:path";

import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256,
} from "../../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";

export const FARM_OS_PTE_C2A_SOURCE_COMMIT =
  "19889a78ae3a7d751c51f9b412f63c78bfc83a78" as const;
export const FARM_OS_PTE_C2B_QUALIFICATION_CONTRACT_VERSION =
  "farmos.production-target-execution-postgres-qualification-contract.v2" as const;
export const FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY =
  "farmos.production-target-execution-postgres-isolated-qualification-executor.v2" as const;
export const FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY =
  "farmos.production-target-execution-postgres-qualification-case-registry.v1" as const;
export const FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY =
  "farmos.production-target-execution-postgres-qualification-fault-registry.v1" as const;
export const FARM_OS_PTE_C2B_EVIDENCE_VERSION =
  "farmos.production-target-execution-postgres-isolated-qualification-evidence.v2" as const;
export const FARM_OS_PTE_C2B_HISTORICAL_EVIDENCE_VERSION =
  "farmos.production-target-execution-postgres-isolated-qualification-evidence.v1" as const;
export const FARM_OS_PTE_C2B_EVIDENCE_AUTHORITY_STATE = "V2_SOURCE_CANDIDATE" as const;
export const FARM_OS_PTE_C2B_RECEIPT_VERSION =
  "farmos.production-target-execution-postgres-isolated-qualification-receipt.v2" as const;
export const FARM_OS_PTE_C2B_COMMIT_VERSION =
  "farmos.production-target-execution-postgres-isolated-qualification-commit.v2" as const;
export const FARM_OS_PTE_C2B_AUTHORIZATION_VERSION =
  "farmos.production-target-execution-postgres-isolated-qualification-authorization.v1" as const;
export const FARM_OS_PTE_C2B_AUTHORIZATION_AUTHORITY =
  "farmos.human-approved-isolated-postgres-qualification-authorization.v1" as const;
export const FARM_OS_PTE_C2B_AUTHORIZATION_OPERATION =
  "ISOLATED_POSTGRES_DURABILITY_QUALIFICATION" as const;

export const FARM_OS_PTE_C2B_IMAGE_REPOSITORY = "docker.io/library/postgres" as const;
export const FARM_OS_PTE_C2B_POSTGRES_MAJOR = 17 as const;
export const FARM_OS_PTE_C2B_DATABASE = "farmos_pte_c2b" as const;
export const FARM_OS_PTE_C2B_APPLICATION_NAME =
  "farmos-day150-c2b-qualification" as const;
export const FARM_OS_PTE_C2B_AUTOMATIC_RETRY = 0 as const;
export const FARM_OS_PTE_C2B_SOURCE_STATE =
  "QUALIFICATION_SOURCE_ARTIFACT_CREATED" as const;

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const COMMIT = /^[a-f0-9]{40}$/u;
const NONCE = /^[a-f0-9]{24}$/u;
const SAFE_RESULT = /^[A-Z][A-Z0-9_]{0,63}$/u;
const IMAGE_REFERENCE =
  /^docker\.io\/library\/postgres@(sha256:[a-f0-9]{64})$/u;
const EXECUTION_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

export const FARM_OS_PTE_C2B_CLASSIFICATIONS = Object.freeze([
  "BLOCKED_ENVIRONMENT", "FAILED_EXECUTION", "QUALIFIED",
] as const);
export type FarmOsPteC2bClassification =
  typeof FARM_OS_PTE_C2B_CLASSIFICATIONS[number];

export type FarmOsPteC2bCaseCategory =
  | "MIG" | "GRD" | "SOT" | "RSV" | "REV" | "ATT" | "TERM" | "CLK"
  | "FLT-RSV" | "FLT-ATT" | "FLT-FIN" | "FLT-RCP" | "RST" | "CLN" | "SAF";
export type FarmOsPteC2bCaseDefinition = readonly [
  case_id: string,
  category: FarmOsPteC2bCaseCategory,
  expected_result_profile: string,
  expected_winner_count: 0 | 1 | null,
  allowed_loser_results: readonly string[],
];

const NO_LOSERS = Object.freeze([] as const);
const SERIALIZABLE_LOSERS = Object.freeze([
  "SERIALIZATION_FAILURE", "STALE_EXPECTED_VERSION", "CONFLICT",
] as const);

// This ordered tuple list is the authority. Tests execute it; runtime callers cannot add cases.
export const FARM_OS_PTE_C2B_CASE_REGISTRY = Object.freeze([
  ["MIG-001", "MIG", "C2A_SOURCE_LINEAGE_EXACT", null, NO_LOSERS],
  ["MIG-002", "MIG", "PG17_IMAGE_AND_SERVER_IDENTITY_EXACT", null, NO_LOSERS],
  ["MIG-003", "MIG", "FIXTURE_ISOLATION_EXACT", null, NO_LOSERS],
  ["MIG-004", "MIG", "EXACT_MIGRATION_BYTES_APPLIED", null, NO_LOSERS],
  ["MIG-005", "MIG", "MIGRATION_HISTORY_IDENTITY_EXACT", null, NO_LOSERS],
  ["MIG-006", "MIG", "EXACT_READ_ONLY_VERIFIER_PASS", null, NO_LOSERS],
  ["MIG-007", "MIG", "SCHEMA_AND_CATALOG_REGISTRY_EXACT", null, NO_LOSERS],
  ["MIG-008", "MIG", "ROLE_ACL_AND_OWNER_POSTURE_EXACT", null, NO_LOSERS],
  ["GRD-001", "GRD", "APPEND_ONLY_UPDATE_REJECTED", 0, ["INGRESS_CONTRACT_INVALID"]],
  ["GRD-002", "GRD", "APPEND_ONLY_DELETE_REJECTED", 0, ["INGRESS_CONTRACT_INVALID"]],
  ["GRD-003", "GRD", "APPEND_ONLY_TRUNCATE_REJECTED", 0, ["INGRESS_CONTRACT_INVALID"]],
  ["GRD-004", "GRD", "MUTABLE_DELETE_AND_TRUNCATE_REJECTED", 0, ["INGRESS_CONTRACT_INVALID"]],
  ["GRD-005", "GRD", "RUNTIME_DIRECT_DML_DENIED", 0, ["PRIVILEGE_DENIED"]],
  ["SOT-001", "SOT", "PROPOSAL_SURVIVES_RECONNECT", 1, NO_LOSERS],
  ["SOT-002", "SOT", "APPROVAL_AND_RECEIPT_SURVIVE_RECONNECT", 1, NO_LOSERS],
  ["SOT-003", "SOT", "APPROVAL_RECEIPT_UNIQUENESS", 1, ["CONFLICT", "RECEIPT_CONFLICT"]],
  ["SOT-004", "SOT", "SAME_ID_SAME_DIGEST_IDEMPOTENT", 1, ["EXISTING_IDENTICAL"]],
  ["SOT-005", "SOT", "SAME_ID_DIFFERENT_DIGEST_CONFLICT", 1, ["DIGEST_MISMATCH", "CONFLICT"]],
  ["SOT-006", "SOT", "REVOCATION_EVENT_APPEND_AND_HEAD_CAS", 1, ["STALE_EXPECTED_VERSION"]],
  ["SOT-007", "SOT", "REVOCATION_HISTORY_SURVIVES_RECONNECT", 1, NO_LOSERS],
  ["SOT-008", "SOT", "HISTORICAL_APPROVAL_DIGESTS_IMMUTABLE", 0, ["INGRESS_CONTRACT_INVALID"]],
  ["SOT-009", "SOT", "APPROVAL_SOT_SURVIVES_CONTAINER_RESTART", 1, NO_LOSERS],
  ["RSV-001", "RSV", "SAME_APPROVAL_SAME_COMMAND_ONE_WINNER", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_RESERVED"]],
  ["RSV-002", "RSV", "SAME_APPROVAL_DIFFERENT_COMMAND_ONE_WINNER", 1,
    [...SERIALIZABLE_LOSERS, "APPROVAL_BOUND"]],
  ["RSV-003", "RSV", "SAME_COMMAND_DIFFERENT_WORKER_ONE_WINNER", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_RESERVED"]],
  ["RSV-004", "RSV", "DUPLICATE_RESERVATION_ONE_ROW", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_RESERVED"]],
  ["REV-001", "REV", "REVOCATION_VS_RESERVATION_SERIAL_ORDER", 1,
    [...SERIALIZABLE_LOSERS, "REVOCATION_CONFLICT", "DEPENDENCY_REVALIDATION_FAILED"]],
  ["REV-002", "REV", "REVOCATION_VS_ATTEMPT_SERIAL_ORDER", 1,
    [...SERIALIZABLE_LOSERS, "REVOCATION_CONFLICT", "DEPENDENCY_REVALIDATION_FAILED"]],
  ["ATT-001", "ATT", "DOUBLE_ATTEMPT_START_ONE_WINNER", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_STARTED"]],
  ["TERM-001", "TERM", "SUCCESS_VS_FAILURE_ONE_TERMINAL", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_FINALIZED", "RECEIPT_CONFLICT"]],
  ["TERM-002", "TERM", "SUCCESS_VS_UNKNOWN_ONE_TERMINAL", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_FINALIZED", "RECEIPT_CONFLICT"]],
  ["TERM-003", "TERM", "DOUBLE_SUCCESS_ONE_RECEIPT", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_FINALIZED"]],
  ["TERM-004", "TERM", "DOUBLE_FAILURE_ONE_RECEIPT", 1,
    [...SERIALIZABLE_LOSERS, "ALREADY_FINALIZED"]],
  ["TERM-005", "TERM", "DUPLICATE_RECEIPT_CONFLICT", 1,
    [...SERIALIZABLE_LOSERS, "RECEIPT_CONFLICT"]],
  ["CLK-001", "CLK", "CONCURRENT_CLOCK_FLOOR_ONE_WINNER", 1,
    [...SERIALIZABLE_LOSERS, "CLOCK_REGRESSION"]],
  ["CLK-002", "CLK", "CLOCK_FLOOR_REGRESSION_REJECTED", 0, ["CLOCK_REGRESSION"]],
  ["CLK-003", "CLK", "WRONG_CLOCK_AUTHORITY_REJECTED", 0, ["INGRESS_CONTRACT_INVALID"]],
  ["CLK-004", "CLK", "STALE_CLOCK_EVIDENCE_REJECTED", 0, ["CLOCK_REGRESSION"]],
  ["FLT-RSV-001", "FLT-RSV", "RESERVATION_AFTER_BEGIN_ABORTS_ABSENT", 0, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-RSV-002", "FLT-RSV", "RESERVATION_BEFORE_INSERT_ABORTS_ABSENT", 0, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-RSV-003", "FLT-RSV", "RESERVATION_BEFORE_COMMIT_CONFIRMED_ABSENT", 0, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-RSV-004", "FLT-RSV", "RESERVATION_COMMITTED_ACK_UNOBSERVED_CONFIRMED_PRESENT", 1, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-RSV-005", "FLT-RSV", "RESERVATION_OBSERVATION_UNAVAILABLE_NO_MUTATION", 0, ["OBSERVATION_UNKNOWN"]],
  ["FLT-ATT-001", "FLT-ATT", "ATTEMPT_COMMIT_ABSENT_READS_RESERVED", 0, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-ATT-002", "FLT-ATT", "ATTEMPT_COMMIT_PRESENT_READS_EXACT", 1, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-ATT-003", "FLT-ATT", "ATTEMPT_OBSERVATION_UNAVAILABLE_QUARANTINES", 0, ["OBSERVATION_UNKNOWN"]],
  ["FLT-FIN-001", "FLT-FIN", "FINALIZATION_COMMIT_ABSENT_REMAINS_STARTED", 0, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-FIN-002", "FLT-FIN", "FINALIZATION_COMMIT_PRESENT_READS_TERMINAL_RECEIPT", 1, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["FLT-FIN-003", "FLT-FIN", "FINALIZATION_OBSERVATION_UNAVAILABLE_QUARANTINES", 0, ["OBSERVATION_UNKNOWN"]],
  ["FLT-RCP-001", "FLT-RCP", "RECEIPT_AND_TERMINAL_ATOMICITY_FAULT", 0, ["TRANSACTION_OUTCOME_UNKNOWN"]],
  ["RST-001", "RST", "PROPOSAL_APPROVAL_RECEIPT_SURVIVE_REOPEN", 1, NO_LOSERS],
  ["RST-002", "RST", "REVOCATION_HISTORY_AND_HEAD_SURVIVE_REOPEN", 1, NO_LOSERS],
  ["RST-003", "RST", "RESERVED_RESTART_CANCELS_PRE_START", 1, NO_LOSERS],
  ["RST-004", "RST", "ATTEMPT_STARTED_RESTART_OUTCOME_UNKNOWN", 1, NO_LOSERS],
  ["RST-005", "RST", "SUCCESS_TERMINAL_SURVIVES_IMMUTABLE", 1, NO_LOSERS],
  ["RST-006", "RST", "FAILURE_TERMINAL_SURVIVES_IMMUTABLE", 1, NO_LOSERS],
  ["RST-007", "RST", "UNKNOWN_TERMINAL_SURVIVES_IMMUTABLE", 1, NO_LOSERS],
  ["RST-008", "RST", "RECONCILIATION_AND_CLOCK_FLOOR_SURVIVE", 1, NO_LOSERS],
  ["RST-009", "RST", "REPLAY_AFTER_RESTART_REJECTED", 0,
    ["ALREADY_STARTED", "ALREADY_FINALIZED", "STALE_EXPECTED_VERSION"]],
  ["CLN-001", "CLN", "EXACT_OWNED_RESOURCES_REMOVED", null, NO_LOSERS],
  ["CLN-002", "CLN", "UNRELATED_RESOURCES_UNTOUCHED", null, NO_LOSERS],
  ["CLN-003", "CLN", "RESIDUAL_OWNED_RESOURCE_COUNT_ZERO", 0, NO_LOSERS],
  ["CLN-004", "CLN", "CLEANUP_FAILURE_PREVENTS_QUALIFICATION", 0, ["CLEANUP_FAILED"]],
  ["SAF-001", "SAF", "PRODUCTION_REFERENCE_AND_OPERATION_COUNT_ZERO", 0, NO_LOSERS],
  ["SAF-002", "SAF", "CREDENTIAL_DSN_AND_RAW_ERROR_SANITIZED", 0, NO_LOSERS],
  ["SAF-003", "SAF", "B1_STATE_CEILING_UNCHANGED", 0, NO_LOSERS],
] as const satisfies readonly FarmOsPteC2bCaseDefinition[]);

export const FARM_OS_PTE_C2B_FAULT_POINTS = Object.freeze([
  "RESERVATION_AFTER_BEGIN", "RESERVATION_BEFORE_INSERT",
  "RESERVATION_BEFORE_COMMIT", "RESERVATION_COMMIT_ACK_UNOBSERVED",
  "RESERVATION_OBSERVATION_UNAVAILABLE", "ATTEMPT_COMMIT_ABSENT",
  "ATTEMPT_COMMIT_ACK_UNOBSERVED", "ATTEMPT_OBSERVATION_UNAVAILABLE",
  "FINALIZATION_COMMIT_ABSENT", "FINALIZATION_COMMIT_ACK_UNOBSERVED",
  "FINALIZATION_OBSERVATION_UNAVAILABLE", "RECEIPT_ATOMICITY_FAULT",
  "CONTAINER_CRASH_AFTER_RESERVED", "CONTAINER_CRASH_AFTER_ATTEMPT_STARTED",
  "CONTAINER_RESTART_BEFORE_TERMINAL_READBACK",
] as const);

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entry]) => [key, canonicalValue(entry)]));
  }
  return value;
}

export function canonicalFarmOsPteC2bJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

export function digestFarmOsPteC2b(domain: string, value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(`${domain}\n${canonicalFarmOsPteC2bJson(value)}`,
    "utf8").digest("hex")}`;
}

export const FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST =
  "sha256:16fc72adccf770f05b8946866b5bd45af30f02d8bd885f79c1b56708c9e327a2" as const;
export const FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST =
  "sha256:e8f6883fde355d2c6b0e25ba4ce46e8572194e4b1edb02171a098a8021082636" as const;

export type FarmOsPteC2bImageAuthority = Readonly<{
  repository: typeof FARM_OS_PTE_C2B_IMAGE_REPOSITORY;
  repository_digest: `sha256:${string}`;
  runtime_reference: `docker.io/library/postgres@sha256:${string}`;
}>;

export type FarmOsPteC2bPlatform = Readonly<{
  os: "linux";
  architecture: "amd64" | "arm64";
  variant: null | "v8";
}>;

export function parseFarmOsPteC2bPlatform(value: unknown): FarmOsPteC2bPlatform | null {
  return exactObject(value, ["os", "architecture", "variant"]) && value.os === "linux" &&
      ["amd64", "arm64"].includes(String(value.architecture)) &&
      (value.variant === null || value.variant === "v8") &&
      (value.architecture === "arm64" || value.variant === null)
    ? Object.freeze(value as unknown as FarmOsPteC2bPlatform) : null;
}

export function farmOsPteC2bPlatformsEqual(expected: FarmOsPteC2bPlatform,
  observed: FarmOsPteC2bPlatform): boolean {
  return expected.os === observed.os && expected.architecture === observed.architecture &&
    expected.variant === observed.variant;
}

export function parseFarmOsPteC2bImageAuthority(value: unknown): FarmOsPteC2bImageAuthority | null {
  if (!exactObject(value, ["repository", "repository_digest", "runtime_reference"])) return null;
  const match = typeof value.runtime_reference === "string"
    ? IMAGE_REFERENCE.exec(value.runtime_reference) : null;
  return value.repository === FARM_OS_PTE_C2B_IMAGE_REPOSITORY &&
      typeof value.repository_digest === "string" && SHA256.test(value.repository_digest) &&
      match?.[1] === value.repository_digest
    ? Object.freeze(value as unknown as FarmOsPteC2bImageAuthority) : null;
}

export type FarmOsPteC2bSourceLineage =
  | Readonly<{ status: "UNPINNED_B1_SOURCE" }>
  | Readonly<{ status: "PINNED_B1_COMMIT"; commit_sha: string }>;

export type FarmOsPteC2bAuthorizationEnvelope = Readonly<{
  schema_version: typeof FARM_OS_PTE_C2B_AUTHORIZATION_VERSION;
  authorization_authority: typeof FARM_OS_PTE_C2B_AUTHORIZATION_AUTHORITY;
  authorization_authority_revision: 1;
  operation: typeof FARM_OS_PTE_C2B_AUTHORIZATION_OPERATION;
  execution_nonce: string;
  c2a_source_commit: typeof FARM_OS_PTE_C2A_SOURCE_COMMIT;
  expected_c2b_source_commit: string;
  image_repository: typeof FARM_OS_PTE_C2B_IMAGE_REPOSITORY;
  image_repository_digest: `sha256:${string}`;
  expected_platform: FarmOsPteC2bPlatform;
  case_registry_authority: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY;
  case_registry_digest: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST;
  fault_registry_authority: typeof FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY;
  fault_registry_digest: typeof FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST;
  migration_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID;
  apply_sha256: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256;
  verify_sha256: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256;
  issued_at: string;
  expires_at: string;
  human_approval_reference_digest: `sha256:${string}`;
  authorization_digest: `sha256:${string}`;
}>;

export type FarmOsPteC2bOwnedResources = Readonly<{
  execution_nonce: string;
  container_name: string;
  ownership_label: string;
  volume_name: string;
  network_name: string;
  database_name: typeof FARM_OS_PTE_C2B_DATABASE;
  application_name: typeof FARM_OS_PTE_C2B_APPLICATION_NAME;
}>;

export function deriveFarmOsPteC2bOwnedResources(nonce: string): FarmOsPteC2bOwnedResources | null {
  if (!NONCE.test(nonce)) return null;
  return Object.freeze({
    execution_nonce: nonce,
    container_name: `farmos-pte-c2b-pg17-${nonce}`,
    ownership_label: `farmos.day150.phase-c2b=${nonce}`,
    volume_name: `farmos-pte-c2b-data-${nonce}`,
    network_name: `farmos-pte-c2b-net-${nonce}`,
    database_name: FARM_OS_PTE_C2B_DATABASE,
    application_name: FARM_OS_PTE_C2B_APPLICATION_NAME,
  });
}

export function buildFarmOsPteC2bEvidenceRelativePath(nonce: string): string | null {
  if (!NONCE.test(nonce)) return null;
  const path = pathPosix.join("reports/day150-phase-c2b-isolated-postgres/runs", nonce,
    "evidence.json");
  return path.startsWith("reports/day150-phase-c2b-isolated-postgres/runs/") ? path : null;
}

export type FarmOsPteC2bCaseResult = Readonly<{
  case_id: string;
  status: "PASS" | "FAIL" | "NOT_EXECUTED";
  actual_result: string;
  winner_count: number | null;
  authoritative_row_count: number | null;
  loser_results: readonly string[];
}>;
export const FARM_OS_PTE_C2B_RESOURCE_TYPES = Object.freeze([
  "CONTAINER", "VOLUME", "NETWORK",
] as const);
export type FarmOsPteC2bResourceType = typeof FARM_OS_PTE_C2B_RESOURCE_TYPES[number];
export const FARM_OS_PTE_C2B_RESOURCE_STATES = Object.freeze([
  "NOT_CREATED", "CREATED_OWNED", "CREATED_UNOWNED_COLLISION", "UNKNOWN",
  "REMOVED", "REMOVE_FAILED",
] as const);
export type FarmOsPteC2bResourceState = typeof FARM_OS_PTE_C2B_RESOURCE_STATES[number];
export type FarmOsPteC2bResourceCleanupRecord = Readonly<{
  resource_type: FarmOsPteC2bResourceType;
  expected_name: string;
  observed_identity: string | null;
  state: FarmOsPteC2bResourceState;
}>;
export type FarmOsPteC2bCleanupResult = Readonly<{
  resources: readonly FarmOsPteC2bResourceCleanupRecord[];
  owned_resources_created: number;
  owned_resources_removed: number;
  failed_removals: number;
  residual_owned_count: number;
  unrelated_touched_count: 0;
  result: "PASS" | "FAIL";
}>;
export type FarmOsPteC2bEvidence = Readonly<{
  schema_version: typeof FARM_OS_PTE_C2B_EVIDENCE_VERSION;
  executor_authority: typeof FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY;
  case_registry_authority: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY;
  case_registry_digest: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST;
  fault_registry_authority: typeof FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY;
  fault_registry_digest: typeof FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST;
  qualification_mode: "ISOLATED_POSTGRES_QUALIFICATION";
  execution_nonce: string;
  c2a_source_commit: typeof FARM_OS_PTE_C2A_SOURCE_COMMIT;
  expected_c2b_source_commit: string;
  observed_c2b_source_commit: string;
  authorization_digest: `sha256:${string}`;
  migration_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID;
  apply_sha256: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256;
  verify_sha256: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256;
  approved_repository: typeof FARM_OS_PTE_C2B_IMAGE_REPOSITORY;
  approved_repository_digest: `sha256:${string}`;
  observed_repository_digest: `sha256:${string}` | null;
  expected_platform: FarmOsPteC2bPlatform;
  observed_platform: FarmOsPteC2bPlatform | null;
  observed_image_id: `sha256:${string}` | null;
  server_version_num: number | null;
  server_version: string | null;
  container_identity_digest: `sha256:${string}` | null;
  network_identity_digest: `sha256:${string}` | null;
  volume_identity_digest: `sha256:${string}` | null;
  database_identity_digest: `sha256:${string}` | null;
  case_results: readonly FarmOsPteC2bCaseResult[];
  cleanup: FarmOsPteC2bCleanupResult;
  residual_resource_count: number;
  production_operations: 0;
  external_network_operations: 0;
  automatic_retry_count: 0;
  fault_model: "APPLICATION_OBSERVATION_BOUNDARY_AND_CONTAINER_CRASH_BOUNDARY";
  started_at_metadata: string;
  ended_at_metadata: string;
  classification: FarmOsPteC2bClassification;
}>;

const EVIDENCE_KEYS = [
  "schema_version", "executor_authority", "case_registry_authority",
  "case_registry_digest", "fault_registry_authority", "fault_registry_digest",
  "qualification_mode", "execution_nonce", "c2a_source_commit", "expected_c2b_source_commit",
  "observed_c2b_source_commit", "authorization_digest", "migration_id",
  "apply_sha256", "verify_sha256", "approved_repository", "approved_repository_digest",
  "observed_repository_digest", "expected_platform", "observed_platform",
  "observed_image_id", "server_version_num", "server_version",
  "container_identity_digest", "network_identity_digest", "volume_identity_digest",
  "database_identity_digest", "case_results", "cleanup", "residual_resource_count",
  "production_operations", "external_network_operations", "automatic_retry_count",
  "fault_model", "started_at_metadata", "ended_at_metadata", "classification",
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return record(value) && Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}
function bounded(value: unknown, maximum = 256): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum &&
    !/[\u0000-\u001f]/u.test(value);
}

export function validateFarmOsPteC2bExecutionWindow(startedAt: unknown,
  endedAt: unknown): boolean {
  return typeof startedAt === "string" && typeof endedAt === "string" &&
    EXECUTION_TIMESTAMP.test(startedAt) && EXECUTION_TIMESTAMP.test(endedAt) &&
    Number.isFinite(Date.parse(startedAt)) && Number.isFinite(Date.parse(endedAt)) &&
    Date.parse(endedAt) >= Date.parse(startedAt);
}

const AUTHORIZATION_KEYS = [
  "schema_version", "authorization_authority", "authorization_authority_revision",
  "operation", "execution_nonce", "c2a_source_commit", "expected_c2b_source_commit",
  "image_repository", "image_repository_digest", "expected_platform", "case_registry_authority",
  "case_registry_digest", "fault_registry_authority", "fault_registry_digest", "migration_id",
  "apply_sha256", "verify_sha256", "issued_at", "expires_at",
  "human_approval_reference_digest", "authorization_digest",
] as const;

export function parseFarmOsPteC2bSourceLineage(value: unknown): FarmOsPteC2bSourceLineage | null {
  if (exactObject(value, ["status"]) && value.status === "UNPINNED_B1_SOURCE") {
    return Object.freeze({ status: "UNPINNED_B1_SOURCE" });
  }
  if (exactObject(value, ["status", "commit_sha"]) && value.status === "PINNED_B1_COMMIT" &&
    typeof value.commit_sha === "string" && COMMIT.test(value.commit_sha)) {
    return Object.freeze({ status: "PINNED_B1_COMMIT", commit_sha: value.commit_sha });
  }
  return null;
}

export function computeFarmOsPteC2bAuthorizationDigest(
  value: Omit<FarmOsPteC2bAuthorizationEnvelope, "authorization_digest">,
): `sha256:${string}` {
  return digestFarmOsPteC2b(FARM_OS_PTE_C2B_AUTHORIZATION_VERSION, value);
}

export function parseFarmOsPteC2bAuthorizationEnvelopeSyntax(
  value: unknown,
): FarmOsPteC2bAuthorizationEnvelope | null {
  if (!exactObject(value, AUTHORIZATION_KEYS) ||
    value.schema_version !== FARM_OS_PTE_C2B_AUTHORIZATION_VERSION ||
    value.authorization_authority !== FARM_OS_PTE_C2B_AUTHORIZATION_AUTHORITY ||
    value.authorization_authority_revision !== 1 ||
    value.operation !== FARM_OS_PTE_C2B_AUTHORIZATION_OPERATION ||
    typeof value.execution_nonce !== "string" || !NONCE.test(value.execution_nonce) ||
    value.c2a_source_commit !== FARM_OS_PTE_C2A_SOURCE_COMMIT ||
    typeof value.expected_c2b_source_commit !== "string" ||
      !COMMIT.test(value.expected_c2b_source_commit) ||
    value.image_repository !== FARM_OS_PTE_C2B_IMAGE_REPOSITORY ||
    typeof value.image_repository_digest !== "string" || !SHA256.test(value.image_repository_digest) ||
    parseFarmOsPteC2bPlatform(value.expected_platform) === null ||
    value.case_registry_authority !== FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY ||
    value.case_registry_digest !== FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST ||
    value.fault_registry_authority !== FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY ||
    value.fault_registry_digest !== FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST ||
    value.migration_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID ||
    value.apply_sha256 !== FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256 ||
    value.verify_sha256 !== FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256 ||
    typeof value.issued_at !== "string" || !EXECUTION_TIMESTAMP.test(value.issued_at) ||
    typeof value.expires_at !== "string" || !EXECUTION_TIMESTAMP.test(value.expires_at) ||
    !Number.isFinite(Date.parse(value.issued_at)) || !Number.isFinite(Date.parse(value.expires_at)) ||
    Date.parse(value.expires_at) <= Date.parse(value.issued_at) ||
    typeof value.human_approval_reference_digest !== "string" ||
      !SHA256.test(value.human_approval_reference_digest) ||
    typeof value.authorization_digest !== "string" || !SHA256.test(value.authorization_digest)) {
    return null;
  }
  const material = { ...value };
  delete material.authorization_digest;
  if (value.authorization_digest !== computeFarmOsPteC2bAuthorizationDigest(
    material as Omit<FarmOsPteC2bAuthorizationEnvelope, "authorization_digest">)) return null;
  return Object.freeze(value as unknown as FarmOsPteC2bAuthorizationEnvelope);
}

export function validateFarmOsPteC2bAuthorizationForExecution(input: Readonly<{
  authorization: unknown;
  execution_nonce: string;
  image: FarmOsPteC2bImageAuthority;
  observed_source_lineage: unknown;
  execution_started_at: string;
}>): FarmOsPteC2bAuthorizationEnvelope | null {
  const authorization = parseFarmOsPteC2bAuthorizationEnvelopeSyntax(input.authorization);
  const lineage = parseFarmOsPteC2bSourceLineage(input.observed_source_lineage);
  return authorization !== null && lineage?.status === "PINNED_B1_COMMIT" &&
      authorization.execution_nonce === input.execution_nonce &&
      authorization.image_repository_digest === input.image.repository_digest &&
      authorization.expected_c2b_source_commit === lineage.commit_sha &&
      EXECUTION_TIMESTAMP.test(input.execution_started_at) &&
      Date.parse(input.execution_started_at) >= Date.parse(authorization.issued_at) &&
      Date.parse(input.execution_started_at) < Date.parse(authorization.expires_at)
    ? authorization : null;
}

function parseCaseResults(value: unknown): readonly FarmOsPteC2bCaseResult[] | null {
  if (!Array.isArray(value) || value.length !== FARM_OS_PTE_C2B_CASE_REGISTRY.length) return null;
  const parsed: FarmOsPteC2bCaseResult[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const candidate = value[index];
    const expected = FARM_OS_PTE_C2B_CASE_REGISTRY[index];
    if (!exactObject(candidate,
      ["case_id", "status", "actual_result", "winner_count", "authoritative_row_count",
        "loser_results"]) ||
      candidate.case_id !== expected?.[0] ||
      !["PASS", "FAIL", "NOT_EXECUTED"].includes(String(candidate.status)) ||
      typeof candidate.actual_result !== "string" || !SAFE_RESULT.test(candidate.actual_result) ||
      !(candidate.winner_count === null || Number.isSafeInteger(candidate.winner_count)) ||
      !(candidate.authoritative_row_count === null ||
        Number.isSafeInteger(candidate.authoritative_row_count)) ||
      !Array.isArray(candidate.loser_results) ||
      !candidate.loser_results.every((entry) => typeof entry === "string" &&
        SAFE_RESULT.test(entry)) || new Set(candidate.loser_results).size !==
          candidate.loser_results.length) return null;
    const passExact = candidate.actual_result === expected[2] &&
      candidate.winner_count === expected[3] &&
      candidate.authoritative_row_count === expected[3] &&
      candidate.loser_results.every((entry) =>
        (expected[4] as readonly string[]).includes(String(entry))) &&
      (expected[4].length === 0 ? candidate.loser_results.length === 0
        : candidate.loser_results.length > 0);
    const notExecutedExact = candidate.status === "NOT_EXECUTED" &&
      candidate.actual_result === "NOT_EXECUTED" && candidate.winner_count === null &&
      candidate.authoritative_row_count === null && candidate.loser_results.length === 0;
    if ((candidate.status === "PASS" && !passExact) ||
      (candidate.status === "NOT_EXECUTED" && !notExecutedExact)) return null;
    parsed.push(candidate as unknown as FarmOsPteC2bCaseResult);
  }
  return Object.freeze(parsed);
}

function resourceNameMatches(type: FarmOsPteC2bResourceType, name: unknown): name is string {
  if (typeof name !== "string") return false;
  const suffix = "[a-f0-9]{24}";
  const expression = type === "CONTAINER" ? `^farmos-pte-c2b-pg17-${suffix}$` :
    type === "VOLUME" ? `^farmos-pte-c2b-data-${suffix}$` :
      `^farmos-pte-c2b-net-${suffix}$`;
  return new RegExp(expression, "u").test(name);
}

function parseCleanupResources(value: unknown): readonly FarmOsPteC2bResourceCleanupRecord[] | null {
  if (!Array.isArray(value) || value.length !== FARM_OS_PTE_C2B_RESOURCE_TYPES.length) return null;
  const parsed: FarmOsPteC2bResourceCleanupRecord[] = [];
  for (let index = 0; index < FARM_OS_PTE_C2B_RESOURCE_TYPES.length; index += 1) {
    const candidate = value[index];
    const expectedType = FARM_OS_PTE_C2B_RESOURCE_TYPES[index];
    if (!exactObject(candidate, ["resource_type", "expected_name", "observed_identity", "state"]) ||
      candidate.resource_type !== expectedType || !resourceNameMatches(expectedType, candidate.expected_name) ||
      !FARM_OS_PTE_C2B_RESOURCE_STATES.includes(candidate.state as FarmOsPteC2bResourceState) ||
      !(candidate.observed_identity === null || bounded(candidate.observed_identity, 128))) return null;
    const identityRequired = ["CREATED_OWNED", "REMOVED", "REMOVE_FAILED"].includes(
      String(candidate.state));
    if (identityRequired !== (candidate.observed_identity !== null)) return null;
    parsed.push(candidate as unknown as FarmOsPteC2bResourceCleanupRecord);
  }
  return Object.freeze(parsed);
}

export function parseFarmOsPteC2bCleanupResult(value: unknown): FarmOsPteC2bCleanupResult | null {
  if (!exactObject(value, ["resources", "owned_resources_created", "owned_resources_removed",
    "failed_removals", "residual_owned_count", "unrelated_touched_count", "result"])) return null;
  const resources = parseCleanupResources(value.resources);
  if (resources === null) return null;
  const counts = [value.owned_resources_created, value.owned_resources_removed,
    value.failed_removals, value.residual_owned_count, value.unrelated_touched_count];
  if (!counts.every((count) => Number.isSafeInteger(count) && Number(count) >= 0) ||
    value.unrelated_touched_count !== 0 || !["PASS", "FAIL"].includes(String(value.result))) {
    return null;
  }
  const created = resources.filter((entry) =>
    ["CREATED_OWNED", "REMOVED", "REMOVE_FAILED"].includes(entry.state)).length;
  const removed = resources.filter((entry) => entry.state === "REMOVED").length;
  const failed = resources.filter((entry) => entry.state === "REMOVE_FAILED").length;
  const residual = resources.filter((entry) =>
    ["CREATED_OWNED", "REMOVE_FAILED"].includes(entry.state)).length;
  if (value.owned_resources_created !== created || value.owned_resources_removed !== removed ||
    value.failed_removals !== failed || value.residual_owned_count !== residual) return null;
  const unsafeState = resources.some((entry) =>
    ["CREATED_UNOWNED_COLLISION", "UNKNOWN"].includes(entry.state));
  const isPass = !unsafeState && failed === 0 && residual === 0 && created === removed;
  return (value.result === "PASS") === isPass
    ? Object.freeze({ ...(value as unknown as FarmOsPteC2bCleanupResult), resources }) : null;
}

export function parseFarmOsPteC2bEvidence(value: unknown): FarmOsPteC2bEvidence | null {
  if (!exactObject(value, EVIDENCE_KEYS)) return null;
  const cases = parseCaseResults(value.case_results);
  const cleanup = parseFarmOsPteC2bCleanupResult(value.cleanup);
  if (value.schema_version !== FARM_OS_PTE_C2B_EVIDENCE_VERSION ||
    value.executor_authority !== FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY ||
    value.case_registry_authority !== FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY ||
    value.case_registry_digest !== FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST ||
    value.fault_registry_authority !== FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY ||
    value.fault_registry_digest !== FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST ||
    value.qualification_mode !== "ISOLATED_POSTGRES_QUALIFICATION" ||
    typeof value.execution_nonce !== "string" || !NONCE.test(value.execution_nonce) ||
    value.c2a_source_commit !== FARM_OS_PTE_C2A_SOURCE_COMMIT ||
    typeof value.expected_c2b_source_commit !== "string" ||
      !COMMIT.test(value.expected_c2b_source_commit) ||
    typeof value.observed_c2b_source_commit !== "string" ||
      !COMMIT.test(value.observed_c2b_source_commit) ||
    value.expected_c2b_source_commit !== value.observed_c2b_source_commit ||
    typeof value.authorization_digest !== "string" || !SHA256.test(value.authorization_digest) ||
    value.migration_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID ||
    value.apply_sha256 !== FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256 ||
    value.verify_sha256 !== FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256 ||
    value.approved_repository !== FARM_OS_PTE_C2B_IMAGE_REPOSITORY ||
    typeof value.approved_repository_digest !== "string" ||
      !SHA256.test(value.approved_repository_digest) ||
    parseFarmOsPteC2bPlatform(value.expected_platform) === null ||
    cases === null || cleanup === null ||
    !Number.isSafeInteger(value.residual_resource_count) || Number(value.residual_resource_count) < 0 ||
    value.production_operations !== 0 || value.external_network_operations !== 0 ||
    value.automatic_retry_count !== FARM_OS_PTE_C2B_AUTOMATIC_RETRY ||
    value.fault_model !== "APPLICATION_OBSERVATION_BOUNDARY_AND_CONTAINER_CRASH_BOUNDARY" ||
    !validateFarmOsPteC2bExecutionWindow(value.started_at_metadata,
      value.ended_at_metadata) ||
    !FARM_OS_PTE_C2B_CLASSIFICATIONS.includes(value.classification as FarmOsPteC2bClassification)) {
    return null;
  }
  const allPass = cases.every((entry) => entry.status === "PASS");
  const qualified = value.classification === "QUALIFIED";
  const observedFields = [value.observed_repository_digest, value.observed_platform,
    value.observed_image_id, value.server_version_num,
    value.server_version, value.container_identity_digest, value.network_identity_digest,
    value.volume_identity_digest, value.database_identity_digest];
  const observedAbsent = observedFields.every((entry) => entry === null);
  const observedRepositoryDigest = typeof value.observed_repository_digest === "string" &&
    SHA256.test(value.observed_repository_digest) ? value.observed_repository_digest : null;
  const expectedPlatform = parseFarmOsPteC2bPlatform(value.expected_platform);
  const observedPlatform = parseFarmOsPteC2bPlatform(value.observed_platform);
  const observedExact = observedRepositoryDigest !== null &&
    observedRepositoryDigest === value.approved_repository_digest && expectedPlatform !== null &&
    observedPlatform !== null && farmOsPteC2bPlatformsEqual(expectedPlatform, observedPlatform) &&
    typeof value.observed_image_id === "string" && SHA256.test(value.observed_image_id) &&
    Number.isSafeInteger(value.server_version_num) && Number(value.server_version_num) >= 170000 &&
    Number(value.server_version_num) < 180000 && typeof value.server_version === "string" &&
    /^PostgreSQL 17\.[0-9]+(?:[ .(][A-Za-z0-9_+.,() /:-]*)?$/u.test(value.server_version) &&
    [value.container_identity_digest, value.network_identity_digest,
      value.volume_identity_digest, value.database_identity_digest]
      .every((digest) => typeof digest === "string" && SHA256.test(digest));
  if (!observedAbsent && !observedExact) return null;
  if (qualified && !observedExact) return null;
  if (value.residual_resource_count !== cleanup.residual_owned_count) return null;
  if (qualified !== (allPass && cleanup.result === "PASS" &&
    cleanup.owned_resources_created === 3 && cleanup.owned_resources_removed === 3 &&
    value.residual_resource_count === 0 && observedExact)) return null;
  return Object.freeze({ ...(value as unknown as FarmOsPteC2bEvidence),
    case_results: cases, cleanup });
}

export type FarmOsPteC2bReceipt = Readonly<{
  schema_version: typeof FARM_OS_PTE_C2B_RECEIPT_VERSION;
  evidence_schema_version: typeof FARM_OS_PTE_C2B_EVIDENCE_VERSION;
  execution_nonce: string;
  evidence_relative_path: string;
  evidence_digest: `sha256:${string}`;
  expected_c2b_source_commit: string;
  observed_c2b_source_commit: string;
  case_registry_digest: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST;
  image_repository_digest: `sha256:${string}`;
  authorization_digest: `sha256:${string}`;
  classification: "QUALIFIED";
}>;
export type FarmOsPteC2bCommitMarker = Readonly<{
  schema_version: typeof FARM_OS_PTE_C2B_COMMIT_VERSION;
  evidence_schema_version: typeof FARM_OS_PTE_C2B_EVIDENCE_VERSION;
  receipt_schema_version: typeof FARM_OS_PTE_C2B_RECEIPT_VERSION;
  execution_nonce: string;
  evidence_digest: `sha256:${string}`;
  receipt_digest: `sha256:${string}`;
  chain_digest: `sha256:${string}`;
  expected_c2b_source_commit: string;
  observed_c2b_source_commit: string;
  case_registry_digest: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST;
  image_repository_digest: `sha256:${string}`;
  authorization_digest: `sha256:${string}`;
  qualification_classification: "QUALIFIED";
  status: "ACCEPTED_QUALIFIED_CHAIN";
}>;

export function parseFarmOsPteC2bReceiptSyntax(value: unknown): FarmOsPteC2bReceipt | null {
  if (!exactObject(value, ["schema_version", "evidence_schema_version", "execution_nonce",
    "evidence_relative_path",
    "evidence_digest", "expected_c2b_source_commit", "observed_c2b_source_commit",
    "case_registry_digest", "image_repository_digest", "authorization_digest",
    "classification"]) ||
    value.schema_version !== FARM_OS_PTE_C2B_RECEIPT_VERSION ||
    value.evidence_schema_version !== FARM_OS_PTE_C2B_EVIDENCE_VERSION ||
    typeof value.execution_nonce !== "string" || !NONCE.test(value.execution_nonce) ||
    value.evidence_relative_path !== buildFarmOsPteC2bEvidenceRelativePath(value.execution_nonce) ||
    typeof value.evidence_digest !== "string" || !SHA256.test(value.evidence_digest) ||
    typeof value.expected_c2b_source_commit !== "string" ||
      !COMMIT.test(value.expected_c2b_source_commit) ||
    value.observed_c2b_source_commit !== value.expected_c2b_source_commit ||
    value.case_registry_digest !== FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST ||
    typeof value.image_repository_digest !== "string" || !SHA256.test(value.image_repository_digest) ||
    typeof value.authorization_digest !== "string" || !SHA256.test(value.authorization_digest) ||
    value.classification !== "QUALIFIED") return null;
  return Object.freeze(value as unknown as FarmOsPteC2bReceipt);
}

export function validateFarmOsPteC2bReceiptAgainstEvidence(input: Readonly<{
  evidence: unknown;
  receipt: unknown;
}>): FarmOsPteC2bReceipt | null {
  const evidence = parseFarmOsPteC2bEvidence(input.evidence);
  const receipt = parseFarmOsPteC2bReceiptSyntax(input.receipt);
  return evidence !== null && evidence.classification === "QUALIFIED" && receipt !== null &&
      receipt.execution_nonce === evidence.execution_nonce &&
      receipt.evidence_digest === digestFarmOsPteC2b(FARM_OS_PTE_C2B_EVIDENCE_VERSION, evidence) &&
      receipt.expected_c2b_source_commit === evidence.expected_c2b_source_commit &&
      receipt.observed_c2b_source_commit === evidence.observed_c2b_source_commit &&
      receipt.case_registry_digest === evidence.case_registry_digest &&
      receipt.image_repository_digest === evidence.approved_repository_digest &&
      receipt.authorization_digest === evidence.authorization_digest
    ? receipt : null;
}

export function parseFarmOsPteC2bCommitMarkerSyntax(
  value: unknown,
): FarmOsPteC2bCommitMarker | null {
  if (!exactObject(value, ["schema_version", "evidence_schema_version", "receipt_schema_version",
    "execution_nonce", "evidence_digest",
    "receipt_digest", "chain_digest", "expected_c2b_source_commit",
    "observed_c2b_source_commit", "case_registry_digest", "image_repository_digest",
    "authorization_digest", "qualification_classification", "status"]) ||
    value.schema_version !== FARM_OS_PTE_C2B_COMMIT_VERSION ||
    value.evidence_schema_version !== FARM_OS_PTE_C2B_EVIDENCE_VERSION ||
    value.receipt_schema_version !== FARM_OS_PTE_C2B_RECEIPT_VERSION ||
    typeof value.execution_nonce !== "string" || !NONCE.test(value.execution_nonce) ||
    typeof value.evidence_digest !== "string" || !SHA256.test(value.evidence_digest) ||
    typeof value.receipt_digest !== "string" || !SHA256.test(value.receipt_digest) ||
    typeof value.chain_digest !== "string" || !SHA256.test(value.chain_digest) ||
    typeof value.expected_c2b_source_commit !== "string" ||
      !COMMIT.test(value.expected_c2b_source_commit) ||
    value.observed_c2b_source_commit !== value.expected_c2b_source_commit ||
    value.case_registry_digest !== FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST ||
    typeof value.image_repository_digest !== "string" || !SHA256.test(value.image_repository_digest) ||
    typeof value.authorization_digest !== "string" || !SHA256.test(value.authorization_digest) ||
    value.qualification_classification !== "QUALIFIED" ||
    value.status !== "ACCEPTED_QUALIFIED_CHAIN") return null;
  return Object.freeze(value as unknown as FarmOsPteC2bCommitMarker);
}

export function createFarmOsPteC2bReceiptCandidateFromEvidence(
  evidence: FarmOsPteC2bEvidence,
): FarmOsPteC2bReceipt | null {
  if (parseFarmOsPteC2bEvidence(evidence) === null || evidence.classification !== "QUALIFIED") {
    return null;
  }
  const path = buildFarmOsPteC2bEvidenceRelativePath(evidence.execution_nonce);
  return path === null ? null : Object.freeze({
    schema_version: FARM_OS_PTE_C2B_RECEIPT_VERSION,
    evidence_schema_version: FARM_OS_PTE_C2B_EVIDENCE_VERSION,
    execution_nonce: evidence.execution_nonce,
    evidence_relative_path: path,
    evidence_digest: digestFarmOsPteC2b(FARM_OS_PTE_C2B_EVIDENCE_VERSION, evidence),
    expected_c2b_source_commit: evidence.expected_c2b_source_commit,
    observed_c2b_source_commit: evidence.observed_c2b_source_commit,
    case_registry_digest: evidence.case_registry_digest,
    image_repository_digest: evidence.approved_repository_digest,
    authorization_digest: evidence.authorization_digest,
    classification: "QUALIFIED",
  });
}

function qualificationChainDigest(input: Readonly<{
  evidence_schema_version: typeof FARM_OS_PTE_C2B_EVIDENCE_VERSION;
  receipt_schema_version: typeof FARM_OS_PTE_C2B_RECEIPT_VERSION;
  evidence_digest: `sha256:${string}`;
  receipt_digest: `sha256:${string}`;
  execution_nonce: string;
  expected_c2b_source_commit: string;
  observed_c2b_source_commit: string;
  case_registry_digest: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST;
  image_repository_digest: `sha256:${string}`;
  authorization_digest: `sha256:${string}`;
}>): `sha256:${string}` {
  return digestFarmOsPteC2b("farmos.production-target-execution-postgres-qualified-chain.v2", input);
}

export function createFarmOsPteC2bCommitMarkerCandidate(
  evidence: unknown,
  receipt: unknown,
): FarmOsPteC2bCommitMarker | null {
  const parsedEvidence = parseFarmOsPteC2bEvidence(evidence);
  const parsedReceipt = validateFarmOsPteC2bReceiptAgainstEvidence({ evidence, receipt });
  if (parsedEvidence === null || parsedReceipt === null) return null;
  const evidenceDigest = parsedReceipt.evidence_digest;
  const receiptDigest = digestFarmOsPteC2b(FARM_OS_PTE_C2B_RECEIPT_VERSION, parsedReceipt);
  const chainMaterial = Object.freeze({
    evidence_schema_version: FARM_OS_PTE_C2B_EVIDENCE_VERSION,
    receipt_schema_version: FARM_OS_PTE_C2B_RECEIPT_VERSION,
    evidence_digest: evidenceDigest,
    receipt_digest: receiptDigest, execution_nonce: parsedEvidence.execution_nonce,
    expected_c2b_source_commit: parsedEvidence.expected_c2b_source_commit,
    observed_c2b_source_commit: parsedEvidence.observed_c2b_source_commit,
    case_registry_digest: parsedEvidence.case_registry_digest,
    image_repository_digest: parsedEvidence.approved_repository_digest,
    authorization_digest: parsedEvidence.authorization_digest });
  const marker = Object.freeze({
    schema_version: FARM_OS_PTE_C2B_COMMIT_VERSION,
    ...chainMaterial,
    chain_digest: qualificationChainDigest(chainMaterial),
    qualification_classification: "QUALIFIED",
    status: "ACCEPTED_QUALIFIED_CHAIN",
  } as const);
  return parseFarmOsPteC2bCommitMarkerSyntax(marker);
}

export function validateFarmOsPteC2bAcceptedQualificationChain(input: Readonly<{
  evidence: unknown;
  receipt: unknown;
  commit_marker: unknown;
  authorization: unknown;
}>): boolean {
  const evidence = parseFarmOsPteC2bEvidence(input.evidence);
  const receipt = validateFarmOsPteC2bReceiptAgainstEvidence(input);
  const marker = parseFarmOsPteC2bCommitMarkerSyntax(input.commit_marker);
  const authorization = parseFarmOsPteC2bAuthorizationEnvelopeSyntax(input.authorization);
  if (evidence === null || evidence.classification !== "QUALIFIED" || receipt === null ||
    marker === null || authorization === null) return false;
  const receiptDigest = digestFarmOsPteC2b(FARM_OS_PTE_C2B_RECEIPT_VERSION, receipt);
  const expectedChain = qualificationChainDigest({
    evidence_schema_version: FARM_OS_PTE_C2B_EVIDENCE_VERSION,
    receipt_schema_version: FARM_OS_PTE_C2B_RECEIPT_VERSION,
    evidence_digest: receipt.evidence_digest,
    receipt_digest: receiptDigest, execution_nonce: evidence.execution_nonce,
    expected_c2b_source_commit: evidence.expected_c2b_source_commit,
    observed_c2b_source_commit: evidence.observed_c2b_source_commit,
    case_registry_digest: evidence.case_registry_digest,
    image_repository_digest: evidence.approved_repository_digest,
    authorization_digest: evidence.authorization_digest });
  return authorization.authorization_digest === evidence.authorization_digest &&
    authorization.execution_nonce === evidence.execution_nonce &&
    authorization.expected_c2b_source_commit === evidence.expected_c2b_source_commit &&
    authorization.image_repository_digest === evidence.approved_repository_digest &&
    farmOsPteC2bPlatformsEqual(authorization.expected_platform, evidence.expected_platform) &&
    Date.parse(evidence.started_at_metadata) >= Date.parse(authorization.issued_at) &&
    Date.parse(evidence.started_at_metadata) < Date.parse(authorization.expires_at) &&
    marker.execution_nonce === evidence.execution_nonce &&
    marker.evidence_digest === receipt.evidence_digest && marker.receipt_digest === receiptDigest &&
    marker.chain_digest === expectedChain &&
    marker.expected_c2b_source_commit === evidence.expected_c2b_source_commit &&
    marker.observed_c2b_source_commit === evidence.observed_c2b_source_commit &&
    marker.case_registry_digest === evidence.case_registry_digest &&
    marker.image_repository_digest === evidence.approved_repository_digest &&
    marker.authorization_digest === evidence.authorization_digest;
}

export const FARM_OS_PTE_C2B_CONTRACT = Object.freeze({
  contract_version: FARM_OS_PTE_C2B_QUALIFICATION_CONTRACT_VERSION,
  source_state: FARM_OS_PTE_C2B_SOURCE_STATE,
  image_authority_state: "V2_SOURCE_CANDIDATE",
  evidence_authority_state: FARM_OS_PTE_C2B_EVIDENCE_AUTHORITY_STATE,
  c2a_source_commit: FARM_OS_PTE_C2A_SOURCE_COMMIT,
  migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  apply_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  verify_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256,
  postgres_major: FARM_OS_PTE_C2B_POSTGRES_MAJOR,
  image_digest_pinned: false,
  b2_authorization_envelope_established: false,
  docker_qualification_executed: false,
  isolated_migration_qualified: true,
  durable_approval_sot_established: true,
  durable_reservation_finalization_established: true,
  storage_backed_concurrency_tested: true,
  storage_backed_crash_semantics_tested: true,
  storage_backed_restart_tested: true,
  trusted_clock_established: false,
  gate_2_authorized: false,
  runtime_bound: false,
  production_authorized: false,
} as const);
