import { createHash } from "node:crypto";

export const FARM_OS_DAY147A5_LEGACY_EVIDENCE_SCHEMA_VERSION = 3 as const;
export const FARM_OS_DAY147A5_LEGACY_READINESS_EVIDENCE_SCHEMA_VERSION = 4 as const;
export const FARM_OS_DAY147A5_LEGACY_FAILURE_ORIGIN_EVIDENCE_SCHEMA_VERSION = 5 as const;
export const FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION = 6 as const;
export const FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION = 7 as const;
export const FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION = 1 as const;
export const FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION = 1 as const;
export const FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH = "evidence.json" as const;
export const FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH = "receipt.json" as const;
export const FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH = "commit.json" as const;

export const FARM_OS_DAY147A5_EXECUTION_PHASES = [
  "INITIAL", "SAFETY_VALIDATED", "IMAGE_VERIFIED", "CONTAINER_STARTED",
  "POSTGRES_READY", "DATABASES_CREATED", "MIGRATIONS_APPLIED",
  "DYNAMIC_TESTS_COMPLETED", "FAILED", "CLEANUP_STARTED",
  "CLEANUP_COMPLETED", "CLEANUP_SKIPPED_NOT_STARTED", "CLEANUP_FAILED",
  "EVIDENCE_BLOCKED", "COMPLETE",
] as const;
export type FarmOsDay147A5ExecutionPhase = typeof FARM_OS_DAY147A5_EXECUTION_PHASES[number];
export type FarmOsDay147A5EvidenceResult = "PASS" | "FAILED" | "BLOCKED" | "EVIDENCE_FINALIZATION_PENDING";
export type FarmOsDay147A5EvidencePhase = "PROVISIONAL" | "FINALIZED";
export type FarmOsDay147A5EvidenceStatus = "PROVISIONAL" | "VALID" | "INVALID";
export const FARM_OS_DAY147A5_READINESS_FAILURE_CLASSES = [
  "CONNECTION_REFUSED", "CONNECTION_RESET", "AUTHENTICATION_FAILED",
  "DATABASE_NOT_FOUND", "USER_NOT_FOUND", "STARTING_UP",
  "CONTAINER_EXITED", "QUERY_FAILED", "PROTOCOL_ERROR", "TIMEOUT",
  "CLIENT_CLEANUP_FAILED", "OPERATION_CONVERGENCE_FAILED", "UNKNOWN",
] as const;
export type FarmOsDay147A5ReadinessFailureClass =
  typeof FARM_OS_DAY147A5_READINESS_FAILURE_CLASSES[number];
export const FARM_OS_DAY147A5_CONTAINER_RUNTIME_STATES = [
  "RUNNING", "RESTARTING", "EXITED", "DEAD", "UNKNOWN",
] as const;
export type FarmOsDay147A5ContainerRuntimeState =
  typeof FARM_OS_DAY147A5_CONTAINER_RUNTIME_STATES[number];
export const FARM_OS_DAY147A5_READINESS_FAILURE_STAGES = [
  "PRE_ATTEMPT", "CONNECT", "QUERY", "POST_QUERY_INSPECT", "CLIENT_CLOSE",
  "CONVERGENCE",
] as const;
export type FarmOsDay147A5ReadinessFailureStage =
  typeof FARM_OS_DAY147A5_READINESS_FAILURE_STAGES[number];
export const FARM_OS_DAY147A5_READINESS_FAILURE_ORIGINS = [
  "PROMISE_REJECTION", "CLIENT_ERROR_EVENT", "STREAM_ERROR_EVENT",
  "STREAM_CLOSE_EVENT", "STREAM_END_EVENT", "CONTAINER_STATE",
  "ADAPTER_VALIDATION", "DEADLINE", "UNKNOWN",
] as const;
export type FarmOsDay147A5ReadinessFailureOrigin =
  typeof FARM_OS_DAY147A5_READINESS_FAILURE_ORIGINS[number];
export const FARM_OS_DAY147A5_READINESS_SAFE_CODE_CLASSES = [
  "KNOWN_NODE_CODE", "KNOWN_POSTGRES_CODE", "CODE_ABSENT",
  "CODE_UNRECOGNIZED",
] as const;
export type FarmOsDay147A5ReadinessSafeCodeClass =
  typeof FARM_OS_DAY147A5_READINESS_SAFE_CODE_CLASSES[number];
export type FarmOsDay147A5ReadinessFailureOriginSummary = Readonly<{
  stage: FarmOsDay147A5ReadinessFailureStage;
  origin: FarmOsDay147A5ReadinessFailureOrigin;
  safe_code_class: FarmOsDay147A5ReadinessSafeCodeClass;
  connection_established: boolean;
  query_started: boolean;
  termination_initiated: boolean;
  promise_rejection_observed: boolean;
  client_error_observed: boolean;
  stream_error_observed: boolean;
  stream_close_observed: boolean;
  stream_end_observed: boolean;
  adapter_validation_failed: boolean;
  convergence_failed: boolean;
  deadline_reached: boolean;
}>;
export type FarmOsDay147A5ReadinessSummary = Readonly<{
  status: "NOT_STARTED" | "READY" | "FAILED";
  attempts: number;
  elapsed_ms: number;
  first_failure_class: FarmOsDay147A5ReadinessFailureClass | null;
  last_failure_class: FarmOsDay147A5ReadinessFailureClass | null;
  retryable_failure_count: number;
  non_retryable_failure_count: number;
  timeout_reached: boolean;
  container_exit_detected: boolean;
  container_state: FarmOsDay147A5ContainerRuntimeState;
  container_exit_code: number | null;
  container_restarting: boolean;
  container_oom_killed: boolean;
  startup_elapsed_ms: number;
  readiness_attempts_before_exit: number;
  failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary | null;
}>;


const durabilityBrand: unique symbol = Symbol("DAY147_A5_DURABILITY_ATTESTATION");
export type FarmOsDay147A5DurabilityAttestation = Readonly<{
  kind: "DAY147_A5_DURABILITY_ATTESTED";
  execution_nonce: string;
  evidence_sha256: string;
  receipt_sha256: string;
  marker_sha256: string;
  readonly [durabilityBrand]: true;
}>;

export type FarmOsDay147A5Checksums = Readonly<{
  day146: string;
  prepare_apply: string;
  prepare_verify: string;
  activation_apply: string;
  activation_verify: string;
}>;
export type FarmOsDay147A5Cleanup = Readonly<{
  phase: "CLEANUP_COMPLETED" | "CLEANUP_SKIPPED_NOT_STARTED" | "CLEANUP_FAILED";
  attempted: boolean;
  completed: boolean;
  post_cleanup_verified: boolean;
  container_absent: boolean;
  clients_closed: boolean;
  mapped_port_closed: boolean;
  persistent_volume_absent: boolean;
  failure_code: string | null;
}>;
export type FarmOsDay147A5Safety = Readonly<{
  local_only_gate_passed: boolean;
  docker_daemon_local: boolean;
  remote_endpoint_rejected: boolean;
  secrets_absent: boolean;
  production_operations: 0;
  docker_commands_expected: "isolated_only";
  database_connections_expected: "isolated_only";
}>;
export type FarmOsDay147A5TestResult = Readonly<{
  id: string;
  category: typeof CATEGORIES[number];
  status: "PASS";
}>;
export type FarmOsDay147A5ConcurrencyEvent = typeof CONCURRENCY_CASE[number];
export type FarmOsDay147A5HostLoopbackConnectionMetadata = Readonly<{
  topology: "HOST_LOOPBACK_MAPPED_PORT";
  transport: "TCP";
  host: "127.0.0.1";
  mapped_port: number;
  container_port: 5432;
  network_alias: null;
  network_nonce_bound: false;
  local_only_validated: true;
  remote_endpoint_rejected: true;
}>;
export type FarmOsDay147A5DockerNetworkConnectionMetadata = Readonly<{
  topology: "DOCKER_USER_DEFINED_NETWORK";
  transport: "TCP";
  host: null;
  mapped_port: null;
  container_port: 5432;
  network_alias: "postgres";
  network_nonce_bound: true;
  local_only_validated: true;
  remote_endpoint_rejected: true;
}>;
export type FarmOsDay147A5ConnectionMetadata =
  | FarmOsDay147A5HostLoopbackConnectionMetadata
  | FarmOsDay147A5DockerNetworkConnectionMetadata;
export type FarmOsDay147A5Evidence = Readonly<{
  schema_version: typeof FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION;
  execution_nonce: string;
  day: "147-A";
  process: "A5";
  result: FarmOsDay147A5EvidenceResult;
  phase_reached: FarmOsDay147A5ExecutionPhase;
  execution_phase: FarmOsDay147A5ExecutionPhase;
  evidence_phase: FarmOsDay147A5EvidencePhase;
  evidence_status: FarmOsDay147A5EvidenceStatus;
  durability_complete: boolean;
  success_claimed: boolean;
  receipt_required: true;
  receipt_relative_path: typeof FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH;
  artifact: Readonly<{ artifact_written: boolean; artifact_valid: boolean }>;
  readiness: FarmOsDay147A5ReadinessSummary;
  checksums: FarmOsDay147A5Checksums;
  postgres_version: string | null;
  image: "postgres:17";
  image_digest: string | null;
  connection_metadata: FarmOsDay147A5ConnectionMetadata | null;
  role_matrix: unknown;
  transition_matrix_summary: Readonly<{
    states: 5;
    ordered_pairs: 25;
    allowed: 4;
    forbidden: 21;
  }>;
  test_results: readonly FarmOsDay147A5TestResult[];
  concurrency_timeline: readonly FarmOsDay147A5ConcurrencyEvent[];
  row_counts: Readonly<{
    snapshots: number;
    projections: number;
    events: number;
    lineage: number;
  }>;
  failure_codes: Readonly<{
    primary: string | null;
    cleanup: string | null;
    evidence_writer: string | null;
  }>;
  cleanup: FarmOsDay147A5Cleanup;
  safety: FarmOsDay147A5Safety;
}>;

export type FarmOsDay147A5SemanticSuccessEvidence = Readonly<
  Omit<FarmOsDay147A5Evidence, "schema_version"> & {
    schema_version: typeof FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION;
    migrations: Readonly<Record<
      "day146" | "prepare_apply" | "prepare_verify" |
      "activate_apply" | "activate_verify", "PASS"
    >>;
    case_registry: Readonly<{
      expected_count: 102;
      executed_count: 102;
      failed_count: 0;
      unique_count: 102;
      exact_case_set: true;
      expected_digest: string;
      actual_digest: string;
      digest_match: true;
    }>;
    transition_provenance: Readonly<{
      raw_transition_count: 5;
      explicit_authorized_count: 5;
      unauthorized_count: 0;
      cleanup_leak_count: 0;
      unknown_count: 0;
      baseline_active_mutation_count: 0;
      comparison_complete: true;
      transitions: readonly Readonly<{
        case_id: string;
        database: "main";
        classification: "EXPLICIT_AUTHORIZED_TEST_TRANSITION";
        opaque_reference: string;
      }>[];
    }>;
    state_invariants: Readonly<{
      comparison_complete: true;
      automatic_promotion_count: 0;
      active_state_unchanged: true;
      baseline_active_mutation_count: 0;
      baseline_active_count: number;
      final_active_count: number;
      baseline_digest: string;
      final_digest: string;
    }>;
    result_transport: Readonly<{
      contract: "HOST_NONCE_RESULT_BIND";
      file_observed: true;
      regular_file: true;
      mode: "0600";
      link_count: 1;
      size: number;
      sha256: string;
      validator: "ACCEPTED";
    }>;
    client_cleanup: Readonly<{
      clients_created: number;
      close_attempted: number;
      close_completed: number;
      close_failed: 0;
      open_clients_after_cleanup: 0;
      result: "PASS";
    }>;
    resource_cleanup: Readonly<{
      runner: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      postgres: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      network: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      result_file: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      result_directory: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      temporary_bundle: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      temporary_root: "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
      residual_resources: 0;
      result: "PASS";
    }>;
  }
>;
export type FarmOsDay147A5Receipt = Readonly<{
  schema_version: typeof FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION;
  execution_nonce: string;
  evidence_relative_path: typeof FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH;
  evidence_sha256: string;
  evidence_schema_version: typeof FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION |
    typeof FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION;
  result: "PASS";
  execution_phase: "COMPLETE";
  receipt_status: "COMMITTED";
  durability_complete: true;
  success_claimed: true;
}>;
export type FarmOsDay147A5CommitMarker = Readonly<{
  schema_version: typeof FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION;
  execution_nonce: string;
  receipt_relative_path: typeof FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH;
  receipt_sha256: string;
  status: "COMMITTED";
}>;

export type FarmOsDay147A5ValidationReason =
  | "A5_EXPECTED_NONCE_INVALID" | "A5_EVIDENCE_MISSING"
  | "A5_RECEIPT_MISSING" | "A5_COMMIT_MARKER_MISSING"
  | "A5_EVIDENCE_JSON_INVALID" | "A5_RECEIPT_JSON_INVALID"
  | "A5_COMMIT_MARKER_JSON_INVALID" | "A5_EVIDENCE_CONTRACT_INVALID"
  | "A5_RECEIPT_CONTRACT_INVALID" | "A5_COMMIT_MARKER_CONTRACT_INVALID"
  | "A5_EXECUTION_NONCE_MISMATCH" | "A5_EVIDENCE_HASH_MISMATCH"
  | "A5_RECEIPT_HASH_MISMATCH" | "A5_DURABILITY_ATTESTATION_INVALID"
  | "A5_PROVISIONAL_CONTRACT_INVALID" | "A5_FAILURE_CONTRACT_INVALID";
type Rejected = Readonly<{ accepted: false; reason_code: FarmOsDay147A5ValidationReason }>;
export type FarmOsDay147A5FinalEvidenceStageResult =
  | Readonly<{ accepted: true; reason_code: "A5_FINAL_EVIDENCE_STAGE_VALID" }> | Rejected;
export type FarmOsDay147A5ReceiptStageResult =
  | Readonly<{ accepted: true; reason_code: "A5_RECEIPT_STAGE_VALID" }> | Rejected;
export type FarmOsDay147A5CommitMarkerStageResult =
  | Readonly<{ accepted: true; reason_code: "A5_COMMIT_MARKER_STAGE_VALID" }> | Rejected;
export type FarmOsDay147A5StateValidationResult =
  | Readonly<{ accepted: true; reason_code: "A5_STATE_CONTRACT_VALID" }> | Rejected;
export type FarmOsDay147A5CommittedArtifactChainResult =
  | Readonly<{ accepted: true; reason_code: "A5_COMMITTED_ARTIFACT_CHAIN_VALID" }> | Rejected;

const NONCE = /^[a-f0-9]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const PHASES = new Set<string>(FARM_OS_DAY147A5_EXECUTION_PHASES);
const EVIDENCE_KEYS = ["schema_version", "execution_nonce", "day", "process", "result", "phase_reached", "execution_phase", "evidence_phase", "evidence_status", "durability_complete", "success_claimed", "receipt_required", "receipt_relative_path", "artifact", "readiness", "checksums", "postgres_version", "image", "image_digest", "connection_metadata", "role_matrix", "transition_matrix_summary", "test_results", "concurrency_timeline", "row_counts", "failure_codes", "cleanup", "safety"] as const;
const SEMANTIC_EVIDENCE_KEYS = [...EVIDENCE_KEYS, "migrations",
  "case_registry", "transition_provenance", "state_invariants",
  "result_transport", "client_cleanup", "resource_cleanup"] as const;
const EXPECTED_CASE_REGISTRY_DIGEST =
  "16a9402d7c0b6696cded4ecb7282cce550dd9745c662d75edf5e1426eb819eaa";
const REQUIRED_PROVENANCE_CASE_IDS = [
  "bundle_supersedes_null_existing_active_unchanged",
  "read_active_plus_candidate_selects_active",
  "read_active_plus_multiple_candidates_selects_active",
  "concurrency_forward",
  "concurrency_reverse",
] as const;
const LEGACY_EVIDENCE_KEYS = EVIDENCE_KEYS.filter((key) => key !== "readiness");
const LEGACY_READINESS_KEYS = ["status", "attempts", "elapsed_ms", "first_failure_class", "last_failure_class", "retryable_failure_count", "non_retryable_failure_count", "timeout_reached", "container_exit_detected", "container_state", "container_exit_code", "container_restarting", "container_oom_killed", "startup_elapsed_ms", "readiness_attempts_before_exit"] as const;
const READINESS_KEYS = [...LEGACY_READINESS_KEYS, "failure_origin"] as const;
const FAILURE_ORIGIN_KEYS = [
  "stage", "origin", "safe_code_class", "connection_established",
  "query_started", "termination_initiated", "promise_rejection_observed",
  "client_error_observed", "stream_error_observed", "stream_close_observed",
  "stream_end_observed", "adapter_validation_failed", "convergence_failed",
  "deadline_reached",
] as const;
const CHECKSUM_KEYS = ["day146", "prepare_apply", "prepare_verify", "activation_apply", "activation_verify"] as const;
const ROW_COUNT_KEYS = ["snapshots", "projections", "events", "lineage"] as const;
const CONNECTION_METADATA_KEYS = [
  "topology", "transport", "host", "mapped_port", "container_port",
  "network_alias", "network_nonce_bound", "local_only_validated",
  "remote_endpoint_rejected",
] as const;
const CATEGORIES = ["legacy_compatibility", "initial_candidate", "transition_matrix", "sequence_identity", "lifecycle_uniqueness", "active_uniqueness", "deferred_trigger", "append_only", "privilege_matrix", "bundle_integration", "read_integration", "transaction_atomicity", "concurrency"] as const;
const REQUIRED_CASE_IDS = ["legacy_active_immutable", "legacy_superseded_immutable", "initial_candidate_valid", "initial_projection_without_event", "initial_active_rejected", "initial_rejected_rejected", "initial_failed_rejected", "initial_superseded_rejected", "initial_candidate_then_active_same_transaction", "sequence_zero_rejected", "sequence_negative_rejected", "sequence_duplicate_rejected", "sequence_lower_rejected", "sequence_equal_rejected", "sequence_strictly_higher_allowed", "identity_duplicate_event_id_rejected", "identity_nonexistent_projection_rejected", "lifecycle_three_candidates_same_scope_allowed", "active_scope_conflict_sequential", "active_supersede_then_activate_other", "active_different_business_dates_allowed", "privilege_bundle_runtime_fixture_bundle_success", "bundle_candidate_atomic_exact_readback", "bundle_repository_readback_failure_rolls_back", "read_candidate_only_missing", "read_active_plus_candidate_selects_active", "read_active_plus_multiple_candidates_selects_active", "read_legacy_active_selected", "read_legacy_superseded_missing", "concurrency_forward", "concurrency_reverse"] as const;
const CONCURRENCY_CASE = ["writer1_begin", "writer1_active_inserted", "writer2_begin", "writer2_insert_started", "observer_exact_lock_wait_confirmed", "writer1_committed", "writer2_duplicate_active_rejected", "writer2_rolled_back", "final_active_count_confirmed", "clients_closed"] as const;
const CONCURRENCY_TIMELINE = [...CONCURRENCY_CASE, ...CONCURRENCY_CASE];

function rejected(reason_code: FarmOsDay147A5ValidationReason): Rejected { return { accepted: false, reason_code }; }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean { const a = Object.keys(value).sort(); const b = [...keys].sort(); return a.length === b.length && a.every((key, i) => key === b[i]); }
function rawJson(bytes: Uint8Array): unknown | null { try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return null; } }
export function sha256FarmOsDay147A5RawBytes(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }
function exactRelative(value: unknown, expected: string): boolean { return value === expected; }

export function isFarmOsDay147A5ConnectionMetadata(
  value: unknown,
): value is FarmOsDay147A5ConnectionMetadata {
  if (!record(value) || !exact(value, CONNECTION_METADATA_KEYS) ||
    value.transport !== "TCP" || value.container_port !== 5432 ||
    value.local_only_validated !== true ||
    value.remote_endpoint_rejected !== true) return false;
  if (value.topology === "HOST_LOOPBACK_MAPPED_PORT") {
    return value.host === "127.0.0.1" &&
      Number.isInteger(value.mapped_port) &&
      (value.mapped_port as number) >= 1 &&
      (value.mapped_port as number) <= 65_535 &&
      value.network_alias === null && value.network_nonce_bound === false;
  }
  if (value.topology === "DOCKER_USER_DEFINED_NETWORK") {
    return value.host === null && value.mapped_port === null &&
      value.network_alias === "postgres" && value.network_nonce_bound === true;
  }
  return false;
}

export function isProvenFarmOsDay147A5CodeLessConnectClose(input: Readonly<{
  failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary;
  container_state: FarmOsDay147A5ContainerRuntimeState;
}>): boolean {
  const origin = input.failure_origin;
  return origin.stage === "CONNECT" && origin.safe_code_class === "CODE_ABSENT" &&
    origin.connection_established === false && origin.query_started === false &&
    origin.termination_initiated === false &&
    (origin.stream_close_observed || origin.stream_end_observed) &&
    ((origin.origin === "STREAM_CLOSE_EVENT" &&
      origin.stream_close_observed) ||
      (origin.origin === "STREAM_END_EVENT" &&
        origin.stream_end_observed && !origin.stream_close_observed)) &&
    origin.promise_rejection_observed === true &&
    input.container_state === "RUNNING" &&
    origin.client_error_observed === false &&
    origin.stream_error_observed === false &&
    origin.adapter_validation_failed === false &&
    origin.convergence_failed === false && origin.deadline_reached === false;
}

const failureOriginSet = (
  ...origins: FarmOsDay147A5ReadinessFailureOrigin[]
): ReadonlySet<FarmOsDay147A5ReadinessFailureOrigin> => new Set(origins);

const STAGE_ORIGINS: Readonly<Record<
  FarmOsDay147A5ReadinessFailureStage,
  ReadonlySet<FarmOsDay147A5ReadinessFailureOrigin>
>> = Object.freeze({
  PRE_ATTEMPT: failureOriginSet(
    "CONTAINER_STATE", "ADAPTER_VALIDATION", "DEADLINE", "UNKNOWN",
  ),
  CONNECT: failureOriginSet(
    "PROMISE_REJECTION", "CLIENT_ERROR_EVENT", "STREAM_ERROR_EVENT",
    "STREAM_CLOSE_EVENT", "STREAM_END_EVENT", "DEADLINE",
    "ADAPTER_VALIDATION", "UNKNOWN",
  ),
  QUERY: failureOriginSet(
    "PROMISE_REJECTION", "CLIENT_ERROR_EVENT", "STREAM_ERROR_EVENT",
    "STREAM_CLOSE_EVENT", "STREAM_END_EVENT", "DEADLINE",
    "ADAPTER_VALIDATION", "UNKNOWN",
  ),
  POST_QUERY_INSPECT: failureOriginSet(
    "CONTAINER_STATE", "DEADLINE", "ADAPTER_VALIDATION", "UNKNOWN",
  ),
  CLIENT_CLOSE: failureOriginSet(
    "PROMISE_REJECTION", "CLIENT_ERROR_EVENT", "STREAM_ERROR_EVENT",
    "STREAM_CLOSE_EVENT", "STREAM_END_EVENT", "DEADLINE", "UNKNOWN",
  ),
  CONVERGENCE: failureOriginSet(
    "CLIENT_ERROR_EVENT", "STREAM_ERROR_EVENT", "STREAM_CLOSE_EVENT",
    "STREAM_END_EVENT", "DEADLINE", "ADAPTER_VALIDATION", "UNKNOWN",
  ),
});

function stageAndOriginMatrixValid(
  summary: FarmOsDay147A5ReadinessFailureOriginSummary,
): boolean {
  if (!STAGE_ORIGINS[summary.stage].has(summary.origin)) return false;
  if ((summary.stage === "PRE_ATTEMPT" || summary.stage === "CONNECT") &&
    (summary.connection_established || summary.query_started)) return false;
  if (["QUERY", "POST_QUERY_INSPECT", "CLIENT_CLOSE"].includes(summary.stage) &&
    (!summary.connection_established || !summary.query_started)) return false;
  if (summary.stage === "CONVERGENCE" && !summary.termination_initiated) {
    return false;
  }
  return true;
}

function originObservationBindingValid(
  summary: FarmOsDay147A5ReadinessFailureOriginSummary,
): boolean {
  const closeOrEnd = summary.stream_close_observed || summary.stream_end_observed;
  const lifecycleSignalCount = [summary.adapter_validation_failed,
    summary.deadline_reached, summary.convergence_failed,
    summary.termination_initiated].filter(Boolean).length;
  const errorCompetition = (summary.client_error_observed &&
      (summary.stream_error_observed || closeOrEnd)) ||
    (summary.stream_error_observed && closeOrEnd);
  const stateCompetition = lifecycleSignalCount > 1 ||
    ((summary.adapter_validation_failed ||
      summary.deadline_reached || summary.convergence_failed ||
      summary.termination_initiated) &&
      (closeOrEnd || summary.client_error_observed ||
        summary.stream_error_observed));
  if ((errorCompetition || stateCompetition) && summary.origin !== "UNKNOWN") {
    return false;
  }
  switch (summary.origin) {
    case "PROMISE_REJECTION":
      return summary.promise_rejection_observed &&
        !summary.client_error_observed && !summary.stream_error_observed &&
        !closeOrEnd;
    case "CLIENT_ERROR_EVENT":
      return summary.client_error_observed && !summary.stream_error_observed &&
        !closeOrEnd;
    case "STREAM_ERROR_EVENT":
      return summary.stream_error_observed && !summary.client_error_observed &&
        !closeOrEnd;
    case "STREAM_CLOSE_EVENT":
      return summary.stream_close_observed && !summary.client_error_observed &&
        !summary.stream_error_observed;
    case "STREAM_END_EVENT":
      return summary.stream_end_observed && !summary.stream_close_observed &&
        !summary.client_error_observed && !summary.stream_error_observed;
    case "ADAPTER_VALIDATION":
      return summary.adapter_validation_failed && !closeOrEnd;
    case "DEADLINE":
      return summary.deadline_reached && !closeOrEnd;
    case "CONTAINER_STATE":
      return !summary.promise_rejection_observed &&
        !summary.client_error_observed && !summary.stream_error_observed &&
        !closeOrEnd;
    case "UNKNOWN":
      return true;
  }
}

function failureOriginShape(
  value: unknown,
): value is FarmOsDay147A5ReadinessFailureOriginSummary {
  if (!record(value) || !exact(value, FAILURE_ORIGIN_KEYS) ||
    !FARM_OS_DAY147A5_READINESS_FAILURE_STAGES.includes(
      value.stage as FarmOsDay147A5ReadinessFailureStage,
    ) || !FARM_OS_DAY147A5_READINESS_FAILURE_ORIGINS.includes(
      value.origin as FarmOsDay147A5ReadinessFailureOrigin,
    ) || !FARM_OS_DAY147A5_READINESS_SAFE_CODE_CLASSES.includes(
      value.safe_code_class as FarmOsDay147A5ReadinessSafeCodeClass,
    ) || FAILURE_ORIGIN_KEYS.slice(3).some((key) =>
      typeof value[key] !== "boolean"
    )) return false;
  const summary = value as FarmOsDay147A5ReadinessFailureOriginSummary;
  if (!stageAndOriginMatrixValid(summary) ||
    !originObservationBindingValid(summary)) return false;
  if (summary.origin === "STREAM_CLOSE_EVENT" &&
    !summary.stream_close_observed) return false;
  if (summary.origin === "STREAM_END_EVENT" &&
    !summary.stream_end_observed) return false;
  if (summary.origin === "CLIENT_ERROR_EVENT" &&
    !summary.client_error_observed) return false;
  if (summary.origin === "STREAM_ERROR_EVENT" &&
    !summary.stream_error_observed) return false;
  if (summary.origin === "PROMISE_REJECTION" &&
    !summary.promise_rejection_observed) return false;
  if (summary.origin === "ADAPTER_VALIDATION" &&
    !summary.adapter_validation_failed) return false;
  if (summary.origin === "DEADLINE" && !summary.deadline_reached) return false;
  if (summary.origin === "CONTAINER_STATE" && summary.stage !== "PRE_ATTEMPT" &&
    summary.stage !== "POST_QUERY_INSPECT") return false;
  return true;
}

export function farmOsDay147A5FailureOriginBindingValid(input: Readonly<{
  failure_class: FarmOsDay147A5ReadinessFailureClass;
  retryable: boolean;
  failure_origin: FarmOsDay147A5ReadinessFailureOriginSummary;
  container_state: FarmOsDay147A5ContainerRuntimeState;
}>): boolean {
  if (!failureOriginShape(input.failure_origin)) return false;
  const provenClose = isProvenFarmOsDay147A5CodeLessConnectClose({
    failure_origin: input.failure_origin,
    container_state: input.container_state,
  });
  if (input.failure_class === "CONNECTION_RESET" &&
    input.failure_origin.safe_code_class === "CODE_ABSENT") {
    return input.retryable && provenClose &&
      !input.failure_origin.termination_initiated &&
      input.container_state === "RUNNING";
  }
  if (input.failure_class === "CONTAINER_EXITED" &&
    ["EXITED", "DEAD", "RESTARTING"].includes(input.container_state) &&
    input.failure_origin.safe_code_class === "CODE_ABSENT" &&
    input.failure_origin.origin === "UNKNOWN" && !input.retryable) {
    return !provenClose;
  }
  if (input.failure_origin.safe_code_class === "CODE_ABSENT" &&
    input.failure_origin.origin === "PROMISE_REJECTION") {
    return input.failure_class === "UNKNOWN" && !input.retryable && !provenClose;
  }
  if (input.failure_origin.safe_code_class === "CODE_ABSENT" &&
    ["CLIENT_ERROR_EVENT", "STREAM_ERROR_EVENT"].includes(
      input.failure_origin.origin,
    )) return input.failure_class === "UNKNOWN" && !input.retryable;
  if (input.failure_origin.origin === "DEADLINE") {
    return input.failure_class === "TIMEOUT" && input.retryable;
  }
  if (input.failure_origin.origin === "CONTAINER_STATE") {
    return ["CONTAINER_EXITED", "UNKNOWN"].includes(input.failure_class) &&
      !input.retryable;
  }
  if (input.failure_origin.origin === "ADAPTER_VALIDATION") {
    return ["QUERY_FAILED", "UNKNOWN"].includes(input.failure_class) &&
      !input.retryable;
  }
  if (["KNOWN_NODE_CODE", "KNOWN_POSTGRES_CODE"].includes(
    input.failure_origin.safe_code_class,
  )) return input.failure_class !== "UNKNOWN";
  if (input.failure_origin.origin === "UNKNOWN") {
    if (input.failure_origin.convergence_failed) {
      return input.failure_class === "OPERATION_CONVERGENCE_FAILED" &&
        !input.retryable;
    }
    if (input.failure_origin.deadline_reached) {
      return input.failure_class === "TIMEOUT" && !input.retryable;
    }
    return input.failure_class === "UNKNOWN" && !input.retryable;
  }
  return true;
}

function readinessSummaryShape(
  value: unknown,
  legacyV4 = false,
): value is FarmOsDay147A5ReadinessSummary {
  if (!record(value) || !exact(value, legacyV4 ? LEGACY_READINESS_KEYS : READINESS_KEYS) ||
    typeof value.status !== "string" ||
    !["NOT_STARTED", "READY", "FAILED"].includes(value.status) ||
    !Number.isInteger(value.attempts) || (value.attempts as number) < 0 ||
    !Number.isInteger(value.elapsed_ms) || (value.elapsed_ms as number) < 0 ||
    !Number.isInteger(value.retryable_failure_count) ||
    (value.retryable_failure_count as number) < 0 ||
    !Number.isInteger(value.non_retryable_failure_count) ||
    (value.non_retryable_failure_count as number) < 0 ||
    typeof value.timeout_reached !== "boolean" ||
    typeof value.container_exit_detected !== "boolean" ||
    !(value.container_exit_code === null ||
      (Number.isSafeInteger(value.container_exit_code) &&
        (value.container_exit_code as number) >= 0 &&
        (value.container_exit_code as number) <= 255)) ||
    typeof value.container_restarting !== "boolean" ||
    typeof value.container_oom_killed !== "boolean" ||
    !Number.isInteger(value.startup_elapsed_ms) ||
    (value.startup_elapsed_ms as number) < 0 ||
    value.startup_elapsed_ms !== value.elapsed_ms ||
    !Number.isInteger(value.readiness_attempts_before_exit) ||
    (value.readiness_attempts_before_exit as number) < 0 ||
    !FARM_OS_DAY147A5_CONTAINER_RUNTIME_STATES.includes(
      value.container_state as FarmOsDay147A5ContainerRuntimeState,
    ) || (!legacyV4 && value.failure_origin !== null &&
      !failureOriginShape(value.failure_origin))) return false;
  const failureClass = (candidate: unknown) => candidate === null ||
    FARM_OS_DAY147A5_READINESS_FAILURE_CLASSES.includes(
      candidate as FarmOsDay147A5ReadinessFailureClass,
    );
  if (!failureClass(value.first_failure_class) ||
    !failureClass(value.last_failure_class)) return false;
  const firstFailure = value.first_failure_class as
    FarmOsDay147A5ReadinessFailureClass | null;
  const lastFailure = value.last_failure_class as
    FarmOsDay147A5ReadinessFailureClass | null;
  const attempts = value.attempts as number;
  const attemptsBeforeExit = value.readiness_attempts_before_exit as number;
  if (value.status === "NOT_STARTED") {
    return (legacyV4 || (value.failure_origin !== null &&
      (value.failure_origin as FarmOsDay147A5ReadinessFailureOriginSummary)
        .stage === "PRE_ATTEMPT")) && value.attempts === 0 && value.elapsed_ms === 0 &&
      value.first_failure_class === null && value.last_failure_class === null &&
      value.retryable_failure_count === 0 &&
      value.non_retryable_failure_count === 0 &&
      value.timeout_reached === false &&
      value.container_exit_detected === false &&
      value.container_state === "UNKNOWN" &&
      value.container_exit_code === null &&
      value.container_restarting === false &&
      value.container_oom_killed === false &&
      value.readiness_attempts_before_exit === 0;
  }
  if (value.status === "READY") {
    const retryable = new Set<FarmOsDay147A5ReadinessFailureClass>([
      "CONNECTION_REFUSED", "CONNECTION_RESET", "STARTING_UP", "TIMEOUT",
    ]);
    return (legacyV4 || value.failure_origin === null) &&
      (value.attempts as number) >= 1 &&
      (value.retryable_failure_count as number) +
          (value.non_retryable_failure_count as number) ===
        (value.attempts as number) - 1 &&
      value.non_retryable_failure_count === 0 &&
      value.timeout_reached === false &&
      value.container_exit_detected === false &&
      value.container_state === "RUNNING" &&
      value.container_exit_code === 0 &&
      value.container_restarting === false &&
      value.container_oom_killed === false &&
      value.readiness_attempts_before_exit === 0 &&
      ((firstFailure === null && lastFailure === null &&
        value.retryable_failure_count === 0) ||
        (firstFailure !== null && lastFailure !== null &&
          retryable.has(firstFailure) &&
          retryable.has(lastFailure) &&
          (value.retryable_failure_count as number) >= 1));
  }
  if (firstFailure === null || lastFailure === null) {
    return false;
  }
  if (!legacyV4 && value.failure_origin === null) return false;
  if (attempts === 0) {
    const zeroCounts = value.retryable_failure_count === 0 &&
      value.non_retryable_failure_count === 0 && attemptsBeforeExit === 0;
    if (!zeroCounts) return false;
    const zeroOriginBinding = legacyV4 ||
      farmOsDay147A5FailureOriginBindingValid({
        failure_class: lastFailure,
        retryable: new Set<FarmOsDay147A5ReadinessFailureClass>([
          "CONNECTION_REFUSED", "CONNECTION_RESET", "STARTING_UP", "TIMEOUT",
        ]).has(lastFailure),
        failure_origin: value.failure_origin as
          FarmOsDay147A5ReadinessFailureOriginSummary,
        container_state: value.container_state as
          FarmOsDay147A5ContainerRuntimeState,
      });
    if (!zeroOriginBinding) return false;
    if (lastFailure === "CONTAINER_EXITED") {
      return firstFailure === "CONTAINER_EXITED" &&
        value.container_exit_detected === true &&
        ["EXITED", "DEAD", "RESTARTING"].includes(value.container_state as string) &&
        value.timeout_reached === false &&
        (value.container_state === "RESTARTING"
          ? value.container_restarting === true
          : value.container_restarting === false) &&
        value.container_exit_code !== null;
    }
    if (lastFailure === "UNKNOWN") {
      return firstFailure === "UNKNOWN" &&
        value.container_state === "UNKNOWN" &&
        value.container_exit_code === null &&
        value.container_exit_detected === false &&
        value.container_restarting === false &&
        value.container_oom_killed === false &&
        value.timeout_reached === false;
    }
    if (lastFailure === "TIMEOUT") {
      const safeRuntime = value.container_state === "UNKNOWN"
        ? value.container_exit_code === null &&
          value.container_restarting === false &&
          value.container_oom_killed === false
        : value.container_state === "RUNNING"
        ? value.container_exit_code === 0 &&
          value.container_restarting === false &&
          value.container_oom_killed === false
        : false;
      return firstFailure === "TIMEOUT" && value.timeout_reached === true &&
        value.container_exit_detected === false && safeRuntime;
    }
    return false;
  }
  const retryable = new Set<FarmOsDay147A5ReadinessFailureClass>([
    "CONNECTION_REFUSED", "CONNECTION_RESET", "STARTING_UP", "TIMEOUT",
  ]);
  const attemptCountConsistent =
    (value.retryable_failure_count as number) +
      (value.non_retryable_failure_count as number) === value.attempts;
  const timeoutConsistent = value.timeout_reached ===
    (lastFailure === "TIMEOUT");
  const terminalClassConsistent = value.timeout_reached ||
    !retryable.has(lastFailure);
  const exitState = ["EXITED", "DEAD", "RESTARTING"].includes(
    value.container_state as string,
  );
  const exitConsistent = value.container_exit_detected ===
      (lastFailure === "CONTAINER_EXITED") &&
    value.container_exit_detected === exitState &&
    attemptsBeforeExit <= attempts;
  const runtimeMetadataConsistent = value.container_state === "RUNNING"
    ? value.container_exit_code === 0 &&
      value.container_restarting === false &&
      value.container_oom_killed === false
    : value.container_state === "UNKNOWN"
    ? value.container_exit_code === null &&
      value.container_restarting === false &&
      value.container_oom_killed === false
    : value.container_state === "RESTARTING"
    ? value.container_exit_code !== null && value.container_restarting === true
    : value.container_exit_code !== null && value.container_restarting === false;
  const originBindingConsistent = legacyV4 ||
    farmOsDay147A5FailureOriginBindingValid({
      failure_class: lastFailure,
      retryable: retryable.has(lastFailure),
      failure_origin: value.failure_origin as
        FarmOsDay147A5ReadinessFailureOriginSummary,
      container_state: value.container_state as FarmOsDay147A5ContainerRuntimeState,
    });
  return attemptCountConsistent && timeoutConsistent &&
    terminalClassConsistent && exitConsistent && runtimeMetadataConsistent &&
    originBindingConsistent;
}

function evidenceShape(value: unknown): value is Record<string, unknown> {
  return record(value) && exact(value, EVIDENCE_KEYS) &&
    value.schema_version === FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION &&
    typeof value.execution_nonce === "string" && NONCE.test(value.execution_nonce) &&
    value.day === "147-A" && value.process === "A5" &&
    typeof value.result === "string" && ["PASS", "FAILED", "BLOCKED", "EVIDENCE_FINALIZATION_PENDING"].includes(value.result) &&
    typeof value.phase_reached === "string" && PHASES.has(value.phase_reached) &&
    typeof value.execution_phase === "string" && PHASES.has(value.execution_phase) &&
    typeof value.evidence_phase === "string" &&
    ["PROVISIONAL", "FINALIZED"].includes(value.evidence_phase) &&
    typeof value.evidence_status === "string" &&
    ["PROVISIONAL", "VALID", "INVALID"].includes(value.evidence_status) &&
    typeof value.durability_complete === "boolean" && typeof value.success_claimed === "boolean" &&
    value.receipt_required === true && exactRelative(value.receipt_relative_path, FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH) &&
    record(value.artifact) && exact(value.artifact, ["artifact_written", "artifact_valid"]) &&
    typeof value.artifact.artifact_written === "boolean" && typeof value.artifact.artifact_valid === "boolean" &&
    readinessSummaryShape(value.readiness) &&
    (value.connection_metadata === null ||
      isFarmOsDay147A5ConnectionMetadata(value.connection_metadata)) &&
    Array.isArray(value.test_results) && Array.isArray(value.concurrency_timeline) && record(value.row_counts);
}
function legacyFailureEvidenceShape(value: unknown): value is Record<string, unknown> {
  if (!record(value) || !exact(value, LEGACY_EVIDENCE_KEYS) ||
    value.schema_version !== FARM_OS_DAY147A5_LEGACY_EVIDENCE_SCHEMA_VERSION) {
    return false;
  }
  return evidenceShape({
    ...value,
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    connection_metadata: null,
    readiness: {
      status: "NOT_STARTED", attempts: 0, elapsed_ms: 0,
      first_failure_class: null, last_failure_class: null,
      retryable_failure_count: 0, non_retryable_failure_count: 0,
      timeout_reached: false, container_exit_detected: false,
      container_state: "UNKNOWN",
      container_exit_code: null, container_restarting: false,
      container_oom_killed: false, startup_elapsed_ms: 0,
      readiness_attempts_before_exit: 0,
      failure_origin: {
        stage: "PRE_ATTEMPT", origin: "UNKNOWN", safe_code_class: "CODE_ABSENT",
        connection_established: false, query_started: false,
        termination_initiated: false, promise_rejection_observed: false,
        client_error_observed: false, stream_error_observed: false,
        stream_close_observed: false, stream_end_observed: false,
        adapter_validation_failed: false, convergence_failed: false,
        deadline_reached: false,
      },
    },
  });
}
function legacyReadinessFailureEvidenceShape(
  value: unknown,
): value is Record<string, unknown> {
  if (!record(value) || !exact(value, EVIDENCE_KEYS) ||
    value.schema_version !==
      FARM_OS_DAY147A5_LEGACY_READINESS_EVIDENCE_SCHEMA_VERSION ||
    !readinessSummaryShape(value.readiness, true)) return false;
  const readiness = value.readiness as Record<string, unknown>;
  const failureClass = readiness.last_failure_class as
    FarmOsDay147A5ReadinessFailureClass | null;
  const baseOrigin = {
    stage: "PRE_ATTEMPT" as FarmOsDay147A5ReadinessFailureStage,
    origin: "UNKNOWN" as FarmOsDay147A5ReadinessFailureOrigin,
    safe_code_class: "CODE_ABSENT" as FarmOsDay147A5ReadinessSafeCodeClass,
    connection_established: false, query_started: false,
    termination_initiated: false, promise_rejection_observed: false,
    client_error_observed: false, stream_error_observed: false,
    stream_close_observed: false, stream_end_observed: false,
    adapter_validation_failed: false, convergence_failed: false,
    deadline_reached: false,
  };
  const legacyOrigin: FarmOsDay147A5ReadinessFailureOriginSummary | null =
    readiness.status === "READY" ? null
    : failureClass === "TIMEOUT" ? {
      ...baseOrigin, origin: "DEADLINE", deadline_reached: true,
    }
    : failureClass === "CONTAINER_EXITED" ? {
      ...baseOrigin, origin: "CONTAINER_STATE",
    }
    : failureClass === "UNKNOWN" || failureClass === null ? baseOrigin
    : failureClass === "QUERY_FAILED" ? {
      ...baseOrigin, stage: "QUERY", origin: "ADAPTER_VALIDATION",
      connection_established: true, query_started: true,
      adapter_validation_failed: true,
    }
    : failureClass === "OPERATION_CONVERGENCE_FAILED" ? {
      ...baseOrigin, stage: "CONVERGENCE", termination_initiated: true,
      convergence_failed: true,
    }
    : {
      ...baseOrigin,
      stage: failureClass === "CLIENT_CLEANUP_FAILED" ? "CLIENT_CLOSE" : "CONNECT",
      origin: "PROMISE_REJECTION", safe_code_class: "KNOWN_POSTGRES_CODE",
      connection_established: failureClass === "CLIENT_CLEANUP_FAILED",
      query_started: failureClass === "CLIENT_CLEANUP_FAILED",
      promise_rejection_observed: true,
    };
  return evidenceShape({
    ...value,
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    connection_metadata: null,
    readiness: {
      ...readiness,
      failure_origin: legacyOrigin,
    },
  });
}
function legacyFailureOriginEvidenceShape(
  value: unknown,
): value is Record<string, unknown> {
  if (!record(value) || !exact(value, EVIDENCE_KEYS) ||
    value.schema_version !==
      FARM_OS_DAY147A5_LEGACY_FAILURE_ORIGIN_EVIDENCE_SCHEMA_VERSION ||
    !readinessSummaryShape(value.readiness)) return false;
  return evidenceShape({
    ...value,
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    connection_metadata: null,
  });
}
function checksumsValid(value: unknown): boolean { return record(value) && exact(value, CHECKSUM_KEYS) && CHECKSUM_KEYS.every((key) => typeof value[key] === "string" && SHA256.test(value[key] as string)); }
function cleanupShape(value: unknown): value is Record<string, unknown> { return record(value) && exact(value, ["phase", "attempted", "completed", "post_cleanup_verified", "container_absent", "clients_closed", "mapped_port_closed", "persistent_volume_absent", "failure_code"]) && typeof value.attempted === "boolean" && typeof value.completed === "boolean" && typeof value.post_cleanup_verified === "boolean" && typeof value.container_absent === "boolean" && typeof value.clients_closed === "boolean" && typeof value.mapped_port_closed === "boolean" && typeof value.persistent_volume_absent === "boolean" && (value.failure_code === null || typeof value.failure_code === "string") && typeof value.phase === "string" && ["CLEANUP_COMPLETED", "CLEANUP_SKIPPED_NOT_STARTED", "CLEANUP_FAILED"].includes(value.phase); }
function cleanupConsistent(value: unknown): boolean { if (!cleanupShape(value)) return false; if (value.phase === "CLEANUP_COMPLETED") return value.attempted === true && value.completed === true && value.post_cleanup_verified === true && value.container_absent === true && value.clients_closed === true && value.mapped_port_closed === true && value.persistent_volume_absent === true && value.failure_code === null; if (value.phase === "CLEANUP_SKIPPED_NOT_STARTED") return value.attempted === false && value.completed === false && value.post_cleanup_verified === false && value.container_absent === true && value.clients_closed === true && value.mapped_port_closed === true && value.persistent_volume_absent === true && value.failure_code === null; return value.attempted === true && value.completed === false && value.failure_code !== null; }
function failureCodes(value: unknown): value is Record<string, unknown> { return record(value) && exact(value, ["primary", "cleanup", "evidence_writer"]) && [value.primary, value.cleanup, value.evidence_writer].every((v) => v === null || typeof v === "string"); }
function safetyPass(value: unknown): boolean { return record(value) && exact(value, ["local_only_gate_passed", "docker_daemon_local", "remote_endpoint_rejected", "secrets_absent", "production_operations", "docker_commands_expected", "database_connections_expected"]) && value.local_only_gate_passed === true && value.docker_daemon_local === true && value.remote_endpoint_rejected === true && value.secrets_absent === true && value.production_operations === 0 && value.docker_commands_expected === "isolated_only" && value.database_connections_expected === "isolated_only"; }
function testResultsPass(value: unknown): boolean { if (!Array.isArray(value) || value.length === 0) return false; const ids = new Set<string>(); const categories = new Set<string>(); for (const item of value) { if (!record(item) || !exact(item, ["id", "category", "status"]) || typeof item.id !== "string" || item.id.length === 0 || typeof item.category !== "string" || !CATEGORIES.includes(item.category as typeof CATEGORIES[number]) || item.status !== "PASS" || ids.has(item.id)) return false; ids.add(item.id); categories.add(item.category); } return REQUIRED_CASE_IDS.every((id) => ids.has(id)) && CATEGORIES.every((category) => categories.has(category)); }
function timelinePass(value: unknown): boolean { return Array.isArray(value) && JSON.stringify(value) === JSON.stringify(CONCURRENCY_TIMELINE); }
function rowCountsPass(value: unknown): boolean { return record(value) && exact(value, ROW_COUNT_KEYS) && ROW_COUNT_KEYS.every((key) => Number.isInteger(value[key]) && (value[key] as number) >= 0) && (value.events as number) >= (value.projections as number); }
const ROLE_KEYS = ["name", "preexisting", "login", "superuser", "inherit", "bypassrls", "purpose", "schema_usage", "table_select", "table_insert", "table_update", "table_delete", "function_execute", "trigger_function_execute"] as const;
function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === "string"); }
function roleMatrixPass(value: unknown): boolean { if (!record(value) || !exact(value, ["migration_owner", "bundle_runtime_fixture", "anon", "authenticated", "attacker", "verification"])) return false; const expectedNames: Record<string, string> = { migration_owner: "day147a5_migration_owner", bundle_runtime_fixture: "day147a5_bundle_runtime_fixture", anon: "anon", authenticated: "authenticated", attacker: "day147a5_attacker", verification: "day147a5_verification" }; for (const [key, expectedName] of Object.entries(expectedNames)) { const role = value[key]; if (!record(role) || !exact(role, ROLE_KEYS) || role.name !== expectedName || typeof role.preexisting !== "boolean" || typeof role.login !== "boolean" || typeof role.superuser !== "boolean" || role.inherit !== false || role.bypassrls !== false || typeof role.purpose !== "string" || !stringArray(role.schema_usage) || !stringArray(role.table_select) || !stringArray(role.table_insert) || !stringArray(role.table_update) || !stringArray(role.table_delete) || !stringArray(role.function_execute) || role.trigger_function_execute !== false) return false; } const owner = value.migration_owner as Record<string, unknown>; const bundle = value.bundle_runtime_fixture as Record<string, unknown>; const anon = value.anon as Record<string, unknown>; const authenticated = value.authenticated as Record<string, unknown>; const attacker = value.attacker as Record<string, unknown>; const verification = value.verification as Record<string, unknown>; const tables = ["operational_memory_source_snapshots", "operational_memory_snapshot_state_events", "operational_memory_daily_projections", "operational_memory_projection_state_events", "operational_memory_projection_lineage", "operational_memory_ingestion_rejections"]; const same = (actual: unknown, expected: readonly string[]) => JSON.stringify(actual) === JSON.stringify(expected); const noPermissions = (role: Record<string, unknown>) => same(role.table_select, []) && same(role.table_insert, []) && same(role.table_update, []) && same(role.table_delete, []) && same(role.function_execute, []); return owner.preexisting === true && owner.login === true && owner.superuser === true && owner.purpose === "isolated migration and fixture provisioning only" && same(owner.schema_usage, ["ai"]) && noPermissions(owner) && bundle.preexisting === false && bundle.login === true && bundle.superuser === false && bundle.purpose === "isolated bundle caller; not production authority" && same(bundle.schema_usage, ["ai"]) && same(bundle.table_select, tables) && same(bundle.table_insert, tables) && same(bundle.table_update, []) && same(bundle.table_delete, []) && same(bundle.function_execute, ["ai.persist_operational_memory_bundle"]) && anon.preexisting === false && anon.login === false && anon.superuser === false && anon.purpose === "privilege denial assertion" && same(anon.schema_usage, ["ai"]) && noPermissions(anon) && authenticated.preexisting === false && authenticated.login === false && authenticated.superuser === false && authenticated.purpose === "privilege denial assertion" && same(authenticated.schema_usage, ["ai"]) && noPermissions(authenticated) && attacker.preexisting === false && attacker.login === true && attacker.superuser === false && attacker.purpose === "direct SQL denial assertion" && same(attacker.schema_usage, ["ai"]) && noPermissions(attacker) && verification.preexisting === false && verification.login === true && verification.superuser === false && verification.purpose === "read-only catalog and relation assertions" && same(verification.schema_usage, ["ai", "core_schema"]) && same(verification.table_select, tables) && same(verification.table_insert, []) && same(verification.table_update, []) && same(verification.table_delete, []) && same(verification.function_execute, []); }
function committed(value: unknown): value is Record<string, unknown> { return evidenceShape(value) && value.connection_metadata !== null && value.result === "PASS" && value.phase_reached === "COMPLETE" && value.execution_phase === "COMPLETE" && value.evidence_phase === "FINALIZED" && value.evidence_status === "VALID" && value.durability_complete === true && value.success_claimed === true && (value.artifact as Record<string, unknown>).artifact_written === true && (value.artifact as Record<string, unknown>).artifact_valid === true && (value.readiness as FarmOsDay147A5ReadinessSummary).status === "READY" && checksumsValid(value.checksums) && typeof value.postgres_version === "string" && value.postgres_version.length > 0 && value.image === "postgres:17" && typeof value.image_digest === "string" && DIGEST.test(value.image_digest) && roleMatrixPass(value.role_matrix) && record(value.transition_matrix_summary) && exact(value.transition_matrix_summary, ["states", "ordered_pairs", "allowed", "forbidden"]) && value.transition_matrix_summary.states === 5 && value.transition_matrix_summary.ordered_pairs === 25 && value.transition_matrix_summary.allowed === 4 && value.transition_matrix_summary.forbidden === 21 && testResultsPass(value.test_results) && timelinePass(value.concurrency_timeline) && rowCountsPass(value.row_counts) && failureCodes(value.failure_codes) && value.failure_codes.primary === null && value.failure_codes.cleanup === null && value.failure_codes.evidence_writer === null && cleanupConsistent(value.cleanup) && (value.cleanup as Record<string, unknown>).phase === "CLEANUP_COMPLETED" && safetyPass(value.safety); }

export function validateSemanticSuccessA5Evidence(
  value: unknown,
): FarmOsDay147A5StateValidationResult {
  if (!record(value) || !exact(value, SEMANTIC_EVIDENCE_KEYS) ||
    value.schema_version !== FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const legacyProjection = { ...value };
  for (const key of SEMANTIC_EVIDENCE_KEYS) {
    if (!EVIDENCE_KEYS.includes(key as typeof EVIDENCE_KEYS[number])) {
      delete legacyProjection[key];
    }
  }
  legacyProjection.schema_version = FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION;
  if (!committed(legacyProjection)) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const migrations = value.migrations;
  if (!record(migrations) || !exact(migrations, ["day146", "prepare_apply",
    "prepare_verify", "activate_apply", "activate_verify"]) ||
    Object.values(migrations).some((status) => status !== "PASS")) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const registry = value.case_registry;
  const testIds = (value.test_results as Record<string, unknown>[]).map(
    (item) => String(item.id),
  );
  const observedDigest = createHash("sha256")
    .update("farmos-day147a5-case-registry-v1\0")
    .update(JSON.stringify(testIds)).digest("hex");
  if (!record(registry) || !exact(registry, ["expected_count",
    "executed_count", "failed_count", "unique_count", "exact_case_set",
    "expected_digest", "actual_digest", "digest_match"]) ||
    registry.expected_count !== 102 || registry.executed_count !== 102 ||
    registry.failed_count !== 0 || registry.unique_count !== 102 ||
    registry.exact_case_set !== true || registry.digest_match !== true ||
    registry.expected_digest !== EXPECTED_CASE_REGISTRY_DIGEST ||
    registry.actual_digest !== EXPECTED_CASE_REGISTRY_DIGEST ||
    testIds.length !== 102 || new Set(testIds).size !== 102 ||
    observedDigest !== registry.actual_digest) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const provenance = value.transition_provenance;
  if (!record(provenance) || !exact(provenance, ["raw_transition_count",
    "explicit_authorized_count", "unauthorized_count", "cleanup_leak_count",
    "unknown_count", "baseline_active_mutation_count", "comparison_complete",
    "transitions"]) || provenance.raw_transition_count !== 5 ||
    provenance.explicit_authorized_count !== 5 ||
    provenance.unauthorized_count !== 0 || provenance.cleanup_leak_count !== 0 ||
    provenance.unknown_count !== 0 ||
    provenance.baseline_active_mutation_count !== 0 ||
    provenance.comparison_complete !== true ||
    provenance.raw_transition_count !== Number(provenance.explicit_authorized_count) +
      Number(provenance.unauthorized_count) + Number(provenance.unknown_count) ||
    !Array.isArray(provenance.transitions) || provenance.transitions.length !== 5) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const transitionCaseIds: string[] = [];
  const opaqueReferences = new Set<string>();
  for (const transition of provenance.transitions) {
    if (!record(transition) || !exact(transition, ["case_id", "database",
      "classification", "opaque_reference"]) ||
      typeof transition.case_id !== "string" || transition.database !== "main" ||
      transition.classification !== "EXPLICIT_AUTHORIZED_TEST_TRANSITION" ||
      typeof transition.opaque_reference !== "string" ||
      !/^[a-f0-9]{16}$/.test(transition.opaque_reference) ||
      opaqueReferences.has(transition.opaque_reference)) {
      return rejected("A5_EVIDENCE_CONTRACT_INVALID");
    }
    transitionCaseIds.push(transition.case_id);
    opaqueReferences.add(transition.opaque_reference);
  }
  if (JSON.stringify([...transitionCaseIds].sort()) !==
    JSON.stringify([...REQUIRED_PROVENANCE_CASE_IDS].sort())) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const invariants = value.state_invariants;
  if (!record(invariants) || !exact(invariants, ["comparison_complete",
    "automatic_promotion_count", "active_state_unchanged",
    "baseline_active_mutation_count", "baseline_active_count",
    "final_active_count", "baseline_digest", "final_digest"]) ||
    invariants.comparison_complete !== true ||
    invariants.automatic_promotion_count !== 0 ||
    invariants.active_state_unchanged !== true ||
    invariants.baseline_active_mutation_count !== 0 ||
    !Number.isSafeInteger(invariants.baseline_active_count) ||
    Number(invariants.baseline_active_count) < 0 ||
    !Number.isSafeInteger(invariants.final_active_count) ||
    Number(invariants.final_active_count) < Number(invariants.baseline_active_count) ||
    typeof invariants.baseline_digest !== "string" ||
    !SHA256.test(invariants.baseline_digest) ||
    invariants.final_digest !== invariants.baseline_digest) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const transport = value.result_transport;
  if (!record(transport) || !exact(transport, ["contract", "file_observed",
    "regular_file", "mode", "link_count", "size", "sha256", "validator"]) ||
    transport.contract !== "HOST_NONCE_RESULT_BIND" ||
    transport.file_observed !== true || transport.regular_file !== true ||
    transport.mode !== "0600" || transport.link_count !== 1 ||
    !Number.isSafeInteger(transport.size) || Number(transport.size) < 1 ||
    Number(transport.size) > 1_048_576 || typeof transport.sha256 !== "string" ||
    !SHA256.test(transport.sha256) || transport.validator !== "ACCEPTED") {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const client = value.client_cleanup;
  if (!record(client) || !exact(client, ["clients_created", "close_attempted",
    "close_completed", "close_failed", "open_clients_after_cleanup", "result"]) ||
    !Number.isSafeInteger(client.clients_created) ||
    Number(client.clients_created) < 1 ||
    client.close_attempted !== client.clients_created ||
    client.close_completed !== client.clients_created || client.close_failed !== 0 ||
    client.open_clients_after_cleanup !== 0 || client.result !== "PASS") {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const resources = value.resource_cleanup;
  const cleanupPass = new Set(["PASS_REMOVED", "PASS_ALREADY_ABSENT"]);
  if (!record(resources) || !exact(resources, ["runner", "postgres", "network",
    "result_file", "result_directory", "temporary_bundle", "temporary_root",
    "residual_resources", "result"]) ||
    [resources.runner, resources.postgres, resources.network,
      resources.result_file, resources.result_directory,
      resources.temporary_bundle, resources.temporary_root]
      .some((status) => !cleanupPass.has(String(status))) ||
    resources.residual_resources !== 0 || resources.result !== "PASS" ||
    (value.safety as Record<string, unknown>).production_operations !== 0) {
    return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  }
  const serialized = JSON.stringify({ provenance, invariants, transport,
    client, resources });
  if (/(?:password|postgres(?:ql)?:\/\/|\/Users\/|\/private\/|projection_id|business_date|content_hash|lineage)/i
    .test(serialized)) return rejected("A5_EVIDENCE_CONTRACT_INVALID");
  return { accepted: true, reason_code: "A5_STATE_CONTRACT_VALID" };
}

function semanticCommitted(value: unknown): value is Record<string, unknown> {
  return validateSemanticSuccessA5Evidence(value).accepted;
}
function receipt(value: unknown): value is FarmOsDay147A5Receipt { return record(value) && exact(value, ["schema_version", "execution_nonce", "evidence_relative_path", "evidence_sha256", "evidence_schema_version", "result", "execution_phase", "receipt_status", "durability_complete", "success_claimed"]) && value.schema_version === 1 && typeof value.execution_nonce === "string" && NONCE.test(value.execution_nonce) && value.evidence_relative_path === FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH && typeof value.evidence_sha256 === "string" && SHA256.test(value.evidence_sha256) && [FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION, FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION].includes(value.evidence_schema_version as 6 | 7) && value.result === "PASS" && value.execution_phase === "COMPLETE" && value.receipt_status === "COMMITTED" && value.durability_complete === true && value.success_claimed === true; }
function marker(value: unknown): value is FarmOsDay147A5CommitMarker { return record(value) && exact(value, ["schema_version", "execution_nonce", "receipt_relative_path", "receipt_sha256", "status"]) && value.schema_version === 1 && typeof value.execution_nonce === "string" && NONCE.test(value.execution_nonce) && value.receipt_relative_path === FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH && typeof value.receipt_sha256 === "string" && SHA256.test(value.receipt_sha256) && value.status === "COMMITTED"; }

export function validateFinalA5Evidence(input: Readonly<{ evidenceBytes: Uint8Array; expectedExecutionNonce: string }>): FarmOsDay147A5FinalEvidenceStageResult { if (!NONCE.test(input.expectedExecutionNonce)) return rejected("A5_EXPECTED_NONCE_INVALID"); const value = rawJson(input.evidenceBytes); if (value === null) return rejected("A5_EVIDENCE_JSON_INVALID"); if (!committed(value) && !semanticCommitted(value)) return rejected("A5_EVIDENCE_CONTRACT_INVALID"); if (value.execution_nonce !== input.expectedExecutionNonce) return rejected("A5_EXECUTION_NONCE_MISMATCH"); return { accepted: true, reason_code: "A5_FINAL_EVIDENCE_STAGE_VALID" }; }
export function validateA5ReceiptForEvidence(input: Readonly<{ evidenceBytes: Uint8Array; receiptBytes: Uint8Array; expectedExecutionNonce: string }>): FarmOsDay147A5ReceiptStageResult { const first = validateFinalA5Evidence(input); if (!first.accepted) return first; const evidence = rawJson(input.evidenceBytes); const value = rawJson(input.receiptBytes); if (value === null) return rejected("A5_RECEIPT_JSON_INVALID"); if (!record(evidence) || !receipt(value)) return rejected("A5_RECEIPT_CONTRACT_INVALID"); if (value.execution_nonce !== input.expectedExecutionNonce) return rejected("A5_EXECUTION_NONCE_MISMATCH"); if (value.evidence_schema_version !== evidence.schema_version) return rejected("A5_RECEIPT_CONTRACT_INVALID"); if (value.evidence_sha256 !== sha256FarmOsDay147A5RawBytes(input.evidenceBytes)) return rejected("A5_EVIDENCE_HASH_MISMATCH"); return { accepted: true, reason_code: "A5_RECEIPT_STAGE_VALID" }; }
export function validateA5CommitMarkerForReceipt(input: Readonly<{ receiptBytes: Uint8Array; markerBytes: Uint8Array; expectedExecutionNonce: string }>): FarmOsDay147A5CommitMarkerStageResult { if (!NONCE.test(input.expectedExecutionNonce)) return rejected("A5_EXPECTED_NONCE_INVALID"); const value = rawJson(input.markerBytes); if (value === null) return rejected("A5_COMMIT_MARKER_JSON_INVALID"); if (!marker(value)) return rejected("A5_COMMIT_MARKER_CONTRACT_INVALID"); if (value.execution_nonce !== input.expectedExecutionNonce) return rejected("A5_EXECUTION_NONCE_MISMATCH"); if (value.receipt_sha256 !== sha256FarmOsDay147A5RawBytes(input.receiptBytes)) return rejected("A5_RECEIPT_HASH_MISMATCH"); return { accepted: true, reason_code: "A5_COMMIT_MARKER_STAGE_VALID" }; }
export function validateCommittedA5ArtifactChain(input: Readonly<{ evidenceBytes?: Uint8Array | null; receiptBytes?: Uint8Array | null; markerBytes?: Uint8Array | null; expectedExecutionNonce: string }>): FarmOsDay147A5CommittedArtifactChainResult { if (!NONCE.test(input.expectedExecutionNonce)) return rejected("A5_EXPECTED_NONCE_INVALID"); if (!input.evidenceBytes) return rejected("A5_EVIDENCE_MISSING"); if (!input.receiptBytes) return rejected("A5_RECEIPT_MISSING"); if (!input.markerBytes) return rejected("A5_COMMIT_MARKER_MISSING"); const rv = validateA5ReceiptForEvidence({ evidenceBytes: input.evidenceBytes, receiptBytes: input.receiptBytes, expectedExecutionNonce: input.expectedExecutionNonce }); if (!rv.accepted) return rv; const r = rawJson(input.receiptBytes); const m = rawJson(input.markerBytes); if (m === null) return rejected("A5_COMMIT_MARKER_JSON_INVALID"); if (!receipt(r)) return rejected("A5_RECEIPT_CONTRACT_INVALID"); if (!marker(m)) return rejected("A5_COMMIT_MARKER_CONTRACT_INVALID"); if (m.execution_nonce !== input.expectedExecutionNonce) return rejected("A5_EXECUTION_NONCE_MISMATCH"); if (m.receipt_sha256 !== sha256FarmOsDay147A5RawBytes(input.receiptBytes)) return rejected("A5_RECEIPT_HASH_MISMATCH"); return { accepted: true, reason_code: "A5_COMMITTED_ARTIFACT_CHAIN_VALID" }; }

export function classifyCommittedA5ArtifactChain(input: Readonly<{
  evidenceBytes?: Uint8Array | null;
  receiptBytes?: Uint8Array | null;
  markerBytes?: Uint8Array | null;
  expectedExecutionNonce: string;
}>): "VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE" |
  "VALID_COMPLETE_SEMANTIC_SUCCESS_CHAIN" | "INVALID" {
  if (!validateCommittedA5ArtifactChain(input).accepted ||
    !input.evidenceBytes) return "INVALID";
  const evidence = rawJson(input.evidenceBytes);
  return record(evidence) && evidence.schema_version ===
      FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION &&
      validateSemanticSuccessA5Evidence(evidence).accepted
    ? "VALID_COMPLETE_SEMANTIC_SUCCESS_CHAIN"
    : "VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE";
}

function phaseCleanupConsistent(evidence: Record<string, unknown>): boolean { if (!cleanupConsistent(evidence.cleanup)) return false; const cleanup = evidence.cleanup as Record<string, unknown>; return evidence.execution_phase === cleanup.phase || evidence.execution_phase === "EVIDENCE_BLOCKED"; }
const READINESS_PRIMARY_CODES = new Set([
  "DAY147_A5_POSTGRES_READINESS_TIMEOUT",
  "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED",
  "DAY147_A5_POSTGRES_READINESS_DATABASE_NOT_FOUND",
  "DAY147_A5_POSTGRES_READINESS_USER_NOT_FOUND",
  "DAY147_A5_POSTGRES_CONTAINER_EXITED",
  "DAY147_A5_POSTGRES_READINESS_QUERY_FAILED",
  "DAY147_A5_POSTGRES_READINESS_PROTOCOL_ERROR",
  "DAY147_A5_POSTGRES_CLIENT_CLEANUP_FAILED",
  "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED",
  "DAY147_A5_POSTGRES_READINESS_UNKNOWN",
]);
function readinessPrimaryConsistent(evidence: Record<string, unknown>): boolean {
  if (evidence.schema_version === FARM_OS_DAY147A5_LEGACY_EVIDENCE_SCHEMA_VERSION) {
    return true;
  }
  const readiness = evidence.readiness as FarmOsDay147A5ReadinessSummary;
  const failure = evidence.failure_codes as Record<string, unknown>;
  const primary = failure.primary;
  if (typeof primary !== "string") return false;
  if (readiness.status !== "FAILED") {
    return !READINESS_PRIMARY_CODES.has(primary);
  }
  const expected = readiness.timeout_reached ||
      readiness.last_failure_class === "TIMEOUT"
    ? "DAY147_A5_POSTGRES_READINESS_TIMEOUT"
    : readiness.last_failure_class === "AUTHENTICATION_FAILED"
    ? "DAY147_A5_POSTGRES_READINESS_AUTHENTICATION_FAILED"
    : readiness.last_failure_class === "DATABASE_NOT_FOUND"
    ? "DAY147_A5_POSTGRES_READINESS_DATABASE_NOT_FOUND"
    : readiness.last_failure_class === "USER_NOT_FOUND"
    ? "DAY147_A5_POSTGRES_READINESS_USER_NOT_FOUND"
    : readiness.last_failure_class === "CONTAINER_EXITED"
    ? "DAY147_A5_POSTGRES_CONTAINER_EXITED"
    : readiness.last_failure_class === "QUERY_FAILED"
    ? "DAY147_A5_POSTGRES_READINESS_QUERY_FAILED"
    : readiness.last_failure_class === "PROTOCOL_ERROR"
    ? "DAY147_A5_POSTGRES_READINESS_PROTOCOL_ERROR"
    : readiness.last_failure_class === "CLIENT_CLEANUP_FAILED"
    ? "DAY147_A5_POSTGRES_CLIENT_CLEANUP_FAILED"
    : readiness.last_failure_class === "OPERATION_CONVERGENCE_FAILED"
    ? "DAY147_A5_POSTGRES_OPERATION_CONVERGENCE_FAILED"
    : "DAY147_A5_POSTGRES_READINESS_UNKNOWN";
  return primary === expected;
}
export function validateProvisionalA5Evidence(input: Readonly<{ evidence: unknown; receiptPresent: boolean; markerPresent: boolean }>): FarmOsDay147A5StateValidationResult { const e = input.evidence; if (!evidenceShape(e) || input.receiptPresent || input.markerPresent || e.phase_reached !== e.execution_phase || e.result !== "EVIDENCE_FINALIZATION_PENDING" || e.execution_phase === "COMPLETE" || e.evidence_phase !== "PROVISIONAL" || e.evidence_status !== "PROVISIONAL" || e.durability_complete !== false || e.success_claimed !== false || (e.artifact as Record<string, unknown>).artifact_written !== true || (e.artifact as Record<string, unknown>).artifact_valid !== false || !failureCodes(e.failure_codes) || e.failure_codes.primary !== null || e.failure_codes.cleanup !== null || e.failure_codes.evidence_writer !== null || !phaseCleanupConsistent(e)) return rejected("A5_PROVISIONAL_CONTRACT_INVALID"); return { accepted: true, reason_code: "A5_STATE_CONTRACT_VALID" }; }
export function validateFailureA5Evidence(input: Readonly<{ evidence: unknown; receiptPresent: boolean; markerPresent: boolean }>): FarmOsDay147A5StateValidationResult { const e = input.evidence; if ((!evidenceShape(e) && !legacyFailureEvidenceShape(e) && !legacyReadinessFailureEvidenceShape(e) && !legacyFailureOriginEvidenceShape(e)) || !record(e) || input.receiptPresent || input.markerPresent || e.phase_reached !== e.execution_phase || typeof e.result !== "string" || !["FAILED", "BLOCKED"].includes(e.result) || e.execution_phase === "COMPLETE" || e.evidence_phase !== "FINALIZED" || e.success_claimed !== false || (e.artifact as Record<string, unknown>).artifact_written !== true || !failureCodes(e.failure_codes) || typeof e.failure_codes.primary !== "string" || e.failure_codes.primary.length === 0 || !phaseCleanupConsistent(e) || !readinessPrimaryConsistent(e)) return rejected("A5_FAILURE_CONTRACT_INVALID"); const cleanup = e.cleanup as Record<string, unknown>; if (cleanup.failure_code !== e.failure_codes.cleanup) return rejected("A5_FAILURE_CONTRACT_INVALID"); const writerCodeKnown = e.failure_codes.evidence_writer === "DAY147_A5_EVIDENCE_DURABILITY_BLOCKED"; const writerPhaseConsistent = writerCodeKnown ? e.execution_phase === "EVIDENCE_BLOCKED" : e.execution_phase !== "EVIDENCE_BLOCKED"; const durable = e.evidence_status === "VALID" && e.durability_complete === true && (e.artifact as Record<string, unknown>).artifact_valid === true && (e.failure_codes.evidence_writer === null || writerCodeKnown) && writerPhaseConsistent; const writer = e.evidence_status === "INVALID" && e.durability_complete === false && (e.artifact as Record<string, unknown>).artifact_valid === false && writerCodeKnown && e.execution_phase === "EVIDENCE_BLOCKED"; if (!durable && !writer) return rejected("A5_FAILURE_CONTRACT_INVALID"); return { accepted: true, reason_code: "A5_STATE_CONTRACT_VALID" }; }
