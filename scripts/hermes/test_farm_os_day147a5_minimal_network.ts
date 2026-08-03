import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { compileFarmOsDailyProjection } from "../../src/lib/hermes/farm_os_operational_memory_compiler";

import {
  DAY147_A5_CLIENT_CASE_REGISTRY,
  DAY147_A5_CASE_INTEGRATION_KEYS,
  DAY147_A5_CASE_FAILURE_CLASSES,
  DAY147_A5_DATABASE_CONNECTION_FAILURE_CLASSES,
  DAY147_A5_EXPECTED_CASE_COUNT,
  DAY147_A5_EXPECTED_REGISTRY_DIGEST,
  DAY147_A5_MIGRATION_FAILURE_CLASSES,
  DAY147_A5_PRE_MIGRATION_FAILURE_CLASSES,
  DAY147_A5_RUNNER_PHASES,
  classifyDay147A5DatabaseConnectionError,
  classifyDay147A5CaseFailure,
  classifyDay147A5MigrationFailure,
  classifyDay147A5PreMigrationFailure,
  createDay147A5RunnerFailureResult,
  runDay147A5ClientSuiteWithDependencies,
  verifyDay147A5RunnerDatabaseConnection,
  validateDay147A5ClientResult,
  type Day147A5ClientResult,
  type Day147A5ClientSuiteInput,
  type Day147A5DatabaseConnectionFailureClass,
  type Day147A5CaseFailureClass,
  type Day147A5CaseIntegrationKey,
  type Day147A5MigrationFailureClass,
  type Day147A5MigrationFailureDiagnostic,
  type Day147A5PreMigrationFailureClass,
  type Day147A5RunnerFailureCode,
  type Day147A5RunnerLastPhase,
  type Day147A5RunnerPhase,
} from "./lib/farm_os_day147a5_client_suite";
import {
  DAY147_A5_ASSERTION_VALUE_CLASSES,
  DAY147_A5_MIGRATION_CHECKSUMS,
  DAY147_A5_CASE_FAILURE_OPERATIONS,
  DAY147_A5_MIGRATION_OPERATIONS,
  DAY147_A5_MIGRATION_TARGETS,
  DAY147_A5_PRE_MIGRATION_EXECUTION_PHASES,
  DAY147_A5_PRE_MIGRATION_OPERATION_KEYS,
  DAY147_A5_READ_ADAPTER_ASSERTION_IDS,
  DAY147_A5_ROLE_FIXTURES,
  analyzeStateTransitionProvenance,
  caseRegistryDigest,
  compareStateInvariants,
  executeDay147A5ReadAdapterCaseBoundary,
  isExactContainerNotFound,
  isExactNetworkNotFound,
  orderedCaseRegistryIds,
  validateDay147A5OrbStackProviderContract,
  type Day147A5OrbStackProviderProof,
  type Day147A5SharedClientAdapterResult,
  type Day147A5MigrationStage,
  type Day147A5CaseFailureOperation,
  type Day147A5AssertionValueClass,
  type Day147A5ReadAdapterAssertionId,
  type Day147A5PreMigrationExecutionPhase,
  type Day147A5PreMigrationOperationKey,
  type ExplicitTransitionAttribution,
  type StateInvariantCapture,
} from "./test_farm_os_day147a5_isolated_postgres";
import {
  FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH,
  FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION,
  FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
  FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
  FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION,
  FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
  FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION,
  sha256FarmOsDay147A5RawBytes,
  classifyCommittedA5ArtifactChain,
  validateA5CommitMarkerForReceipt,
  validateA5ReceiptForEvidence,
  validateCommittedA5ArtifactChain,
  validateFailureA5Evidence,
  validateFinalA5Evidence,
  validateSemanticSuccessA5Evidence,
  type FarmOsDay147A5CommitMarker,
  type FarmOsDay147A5Evidence,
  type FarmOsDay147A5SemanticSuccessEvidence,
  type FarmOsDay147A5Receipt,
} from "./lib/farm_os_day147a5_evidence_contract";

const ROOT = resolve(import.meta.dirname, "../..");
const AUTHORITY = "DAY147_A5_MINIMAL_NETWORK_EXECUTION" as const;
const DIAGNOSTIC_AUTHORITY =
  "DAY147_A5_MINIMAL_NETWORK_PREFLIGHT_DIAGNOSTIC" as const;
const EXPECTED_HEAD = "6b53b1c5b35590518bf73526f89cc7e5cf4f7f90" as const;
const NODE_IMAGE =
  "node@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7" as const;
const NODE_IMAGE_ID =
  "sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7" as const;
const POSTGRES_IMAGE = "postgres:17" as const;
const TEMP_ROOT_PARENT = "/private/tmp" as const;
const MAX_RESULT_BYTES = 1_048_576 as const;
const MAX_LOG_BYTES = 16_384 as const;
const MAX_LOG_LINES = 80 as const;
const POST_START_INSPECT_LIMIT = 10 as const;
const POST_START_INSPECT_INTERVAL_MS = 250 as const;
const MODULE_INITIALIZATION_STARTED_MARKER =
  "FARMOS_DAY147_A5_PHASE=CLIENT_MODULE_INITIALIZATION_STARTED" as const;
const MODULE_INITIALIZATION_OK_MARKER =
  "FARMOS_DAY147_A5_MODULE_INIT_OK" as const;
const A6_CLOSURE_DOCUMENT_PATH =
  "docs/roadmap/day147-a-final-evidence-and-closure.md" as const;
const A6_CLOSURE_DOCUMENT_XY = "??" as const;
const A6_CLOSURE_DOCUMENT_MAXIMUM_SIZE_BYTES = 262_144 as const;

const MIGRATION_FILES = Object.freeze({
  day146: "scripts/sql/day146_operational_memory_snapshot_persistence.sql",
  prepare_apply:
    "db/migrations/202607300001_daily_operational_projection_candidate_foundation.sql",
  prepare_verify:
    "db/migrations/202607300001_daily_operational_projection_candidate_foundation.verify.sql",
  activate_apply:
    "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql",
  activate_verify:
    "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql",
});

const REPOSITORY_BUNDLE_SOURCE_ALLOWLIST = new Set([
  "scripts/hermes/lib/farm_os_day147a5_client_suite.ts",
  "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts",
  "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts",
  "src/lib/hermes/farm_os_operational_memory_compiler.ts",
  "src/lib/hermes/farm_os_operational_memory_contract.ts",
  "src/lib/hermes/farm_os_operational_memory_persistence.ts",
  "src/lib/hermes/farm_os_operational_memory_postgres_repository.ts",
  "src/lib/hermes/farm_os_projection_first_contract.ts",
  "src/lib/hermes/farm_os_projection_first_installation_binding.ts",
  "src/lib/hermes/farm_os_projection_first_postgres_read_adapter.ts",
  "src/lib/hermes/farm_os_projection_first_response_guard.ts",
  "src/lib/hermes/farm_os_projection_first_runtime.ts",
  "src/lib/hermes/farm_os_projection_first_selector.ts",
  "src/lib/hermes/farm_os_projection_state_contract.ts",
]);

const EXACT_ENVIRONMENT_KEYS = Object.freeze([
  "FARMOS_A5_EXECUTION_NONCE",
  "FARMOS_DAY147_A5_BUNDLE_SHA256",
  "FARMOS_A5_CLIENT_RESULT_PATH",
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const);

type Mode = "static" | "execute-minimal-network" |
  "diagnose-minimal-network-preflight";
type ParsedArguments = Readonly<{ mode: Mode;
  authority: typeof AUTHORITY | typeof DIAGNOSTIC_AUTHORITY | null }>;
type CommandResult = Readonly<{
  status: number;
  stdout: string;
  stderr: string;
}>;
type CommandOptions = Readonly<{
  environment?: Readonly<Record<string, string>>;
  allowFailure?: boolean;
  structuredStdout?: boolean;
}>;
type CommandRunner = Readonly<{
  run(program: string, args: readonly string[], options?: CommandOptions): CommandResult;
}>;

type RepositoryEntryType = "tracked" | "untracked" | "rename" | "copy";
type RepositorySourceEntry = Readonly<{
  xy: string;
  relative_path: string;
  entry_type: RepositoryEntryType;
}>;
type RepositoryGateMode = "static" | "execute-minimal-network";
type ClosureDocumentObservation = Readonly<{
  regularFile: boolean;
  symbolicLink: boolean;
  linkCount: number;
  bytes: Uint8Array;
}>;
type ClosureDocumentEntry = Readonly<{
  classification: "A6_CLOSURE_DOCUMENT";
  relative_path: typeof A6_CLOSURE_DOCUMENT_PATH;
  xy: typeof A6_CLOSURE_DOCUMENT_XY;
}>;
type GeneratedArtifactEntry = Readonly<{
  relative_path: string;
  nonce: string;
  sha256: string;
  classification: "VALID_FAILURE_EVIDENCE" |
    "VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE" |
    "VALID_COMPLETE_SEMANTIC_SUCCESS_CHAIN";
}>;
type MinimalV2RepositoryGateFailureCode =
  | "BRANCH_MISMATCH"
  | "HEAD_MISMATCH"
  | "ORIGIN_HEAD_MISMATCH"
  | "AHEAD_BEHIND_MISMATCH"
  | "STAGED_FILE_PRESENT"
  | "SOURCE_PATH_UNEXPECTED"
  | "SOURCE_STATUS_UNEXPECTED"
  | "SOURCE_ENTRY_MALFORMED"
  | "CLOSURE_DOCUMENT_INVALID"
  | "GENERATED_ARTIFACT_INVALID"
  | "GENERATED_ARTIFACT_HASH_MISMATCH"
  | "PROTECTED_FILE_HASH_MISMATCH";
type MinimalV2RepositoryGateResult =
  | Readonly<{
      ok: true;
      sourceEntries: readonly RepositorySourceEntry[];
      generatedArtifacts: readonly GeneratedArtifactEntry[];
      closureDocument: ClosureDocumentEntry | null;
    }>
  | Readonly<{
      ok: false;
      failureCode: MinimalV2RepositoryGateFailureCode;
      expected: unknown;
      actual: unknown;
      relativePath?: string;
    }>;

type NetworkInspectClassification = "NOT_FOUND" | "PRESENT" |
  "PERMISSION_DENIED" | "PROVIDER_UNAVAILABLE" | "TIMEOUT" |
  "MALFORMED_RESPONSE" | "UNKNOWN_FAILURE";
type MinimalNetworkPreflightResult =
  | Readonly<{
      ok: true;
      networkName: string;
      providerIdentityMatched: true;
      absenceClassification: "NOT_FOUND";
    }>
  | Readonly<{
      ok: false;
      failureCode:
        | "NETWORK_NAME_INVALID"
        | "NETWORK_ALREADY_EXISTS"
        | "NETWORK_INSPECT_PERMISSION_DENIED"
        | "NETWORK_INSPECT_PROVIDER_UNAVAILABLE"
        | "NETWORK_INSPECT_TIMEOUT"
        | "NETWORK_INSPECT_MALFORMED"
        | "NETWORK_INSPECT_UNKNOWN_FAILURE"
        | "PROVIDER_IDENTITY_CHANGED";
      networkName?: string;
      inspectExitCode?: number;
      sanitizedStderr?: string;
      firstFailedPredicate: string;
      inspectClassification?: NetworkInspectClassification;
      providerIdentityMatched: boolean;
    }>;

const EXACT_SOURCE_XY = new Map<string, string>([
  ["db/migrations/202607310001_daily_operational_projection_candidate_activation.sql", " M"],
  ["db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql", " M"],
  ["db/provisioning/manifest.json", " M"],
  ["package.json", " M"],
  ["src/lib/hermes/farm_os_projection_first_selector.ts", " M"],
  ["scripts/hermes/lib/farm_os_day147a5_client_suite.ts", "??"],
  ["scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts", "??"],
  ["scripts/hermes/test_farm_os_day147a1_activate_migration_authority.ts", " M"],
  ["scripts/hermes/test_farm_os_day147a5_minimal_network.ts", "??"],
  ["scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts", "??"],
  ["tsconfig.tsbuildinfo", "??"],
]);

const PROTECTED_FILE_SHA256 = new Map<string, string>([
  ["src/lib/hermes/farm_os_projection_first_selector.ts",
    "78f5ad88ae56afe79f8190587a4d560fbcc393bc06738ef6bc8471bcecb8a84b"],
  ["scripts/hermes/lib/farm_os_day147a5_client_suite.ts",
    "dcbfba34ee8e2349253ea114ca5e698252f30bd40664ed7b23e7b07149c211ea"],
  ["scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts",
    "a6ac8bab22f95daed87fafb36e3e6334d1ffdbfaa3d73cf1fd5ecc78d80c73cb"],
  ["scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts",
    "0e14a07b63dbd11712b97e594f77501a5fc4a13a0798690d1dc94f6c0564b59f"],
  ["tsconfig.tsbuildinfo",
    "4ec54d59e72843bbf8f7fdf19c8dbd351738920457ff715979964637f3d35ccb"],
]);

type MinimalNames = Readonly<{
  network: string;
  postgres: string;
  runner: string;
  database: string;
  temporaryRoot: string;
  entry: string;
  bundle: string;
  metafile: string;
  resultDirectory: string;
  result: string;
}>;

type Receipt = Readonly<{
  resource: "runner" | "postgres" | "network";
  canonicalId: string;
  expectedName: string;
  nonce: string;
  preExisting: false;
}>;

type CleanupResult = Readonly<{
  attempted: readonly string[];
  completed: readonly string[];
  failures: readonly string[];
  resources: Readonly<Record<Receipt["resource"], ResourceCleanupReport>>;
  resultFileCleanup: PathCleanupReport;
  resultDirectoryCleanup: PathCleanupReport;
  bundleCleanup: PathCleanupReport;
  temporaryRootCleanup: PathCleanupReport;
  tempResult: "PASS_REMOVED" | "PASS_ALREADY_ABSENT" |
    "FAILED_ABSENCE_VERIFICATION";
  overallCleanupPass: boolean;
}>;

type PathCleanupReport = Readonly<{
  attempted: boolean;
  absent: boolean;
  result: "PASS_REMOVED" | "PASS_ALREADY_ABSENT" |
    "FAILED_ABSENCE_VERIFICATION";
}>;

type DockerInspectClassification =
  | Readonly<{ kind: "PRESENT"; value: unknown }>
  | Readonly<{ kind: "NOT_FOUND" }>
  | Readonly<{
      kind: "PERMISSION_DENIED" | "PROVIDER_UNAVAILABLE" | "TIMEOUT" |
        "MALFORMED_JSON" | "UNEXPECTED_SHAPE" | "IDENTITY_MISMATCH" |
        "UNKNOWN_FAILURE";
      exitCode: number | null;
      sanitizedStderr: string;
    }>;
type DockerInspectExpectedShape = "ARRAY" | "OBJECT";
type CleanupResultCode = "PASS_REMOVED" | "PASS_ALREADY_ABSENT" |
  "NOT_APPLICABLE_NOT_CREATED" | "FAILED_DELETE" |
  "FAILED_ABSENCE_VERIFICATION" | "FAILED_PROVIDER_IDENTITY" |
  "FAILED_PROVENANCE";
type ResourceCleanupReport = Readonly<{
  creation_receipt: boolean;
  delete_attempted: boolean;
  absence_classification: DockerInspectClassification["kind"] |
    "NOT_APPLICABLE";
  cleanup_result: CleanupResultCode;
}>;

function inspectFailure(kind: Exclude<DockerInspectClassification["kind"],
  "PRESENT" | "NOT_FOUND">, result: CommandResult): DockerInspectClassification {
  return Object.freeze({ kind, exitCode: result.status,
    sanitizedStderr: bounded(result.stderr) });
}

function isExactDockerInspectNotFound(input: Readonly<{
  resource: "container" | "network";
  result: CommandResult;
  canonicalId: string;
}>): boolean {
  if (input.result.status !== 1 ||
    !["", "[]"].includes(input.result.stdout.trim())) return false;
  const normalized = { exit_code: input.result.status, stdout: "",
    stderr: input.result.stderr };
  if (input.resource === "container"
    ? isExactContainerNotFound(normalized, input.canonicalId)
    : isExactNetworkNotFound(normalized, input.canonicalId)) return true;
  return input.result.stderr.trim() ===
    `error: no such object: ${input.canonicalId}`;
}

function classifyDockerInspect(input: Readonly<{
  resource: "container" | "network";
  result: CommandResult;
  canonicalId?: string;
  expectedShape: DockerInspectExpectedShape;
  providerIdentityMatched: boolean;
}>): DockerInspectClassification {
  if (!input.providerIdentityMatched) {
    return inspectFailure("IDENTITY_MISMATCH", input.result);
  }
  if (input.result.status === 0) {
    if (input.result.stdout.trim().length === 0) {
      return inspectFailure("MALFORMED_JSON", input.result);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.result.stdout);
    } catch { return inspectFailure("MALFORMED_JSON", input.result); }
    const value = input.expectedShape === "ARRAY"
      ? Array.isArray(parsed) && parsed.length === 1 &&
          typeof parsed[0] === "object" && parsed[0] !== null
        ? parsed[0] : undefined
      : !Array.isArray(parsed) && typeof parsed === "object" && parsed !== null
        ? parsed : undefined;
    if (value === undefined) {
      return inspectFailure("UNEXPECTED_SHAPE", input.result);
    }
    if (input.canonicalId !== undefined &&
      (value as Record<string, unknown>).Id !== input.canonicalId) {
      return inspectFailure("IDENTITY_MISMATCH", input.result);
    }
    return Object.freeze({ kind: "PRESENT", value });
  }
  const exactNotFound = input.canonicalId !== undefined &&
    isExactDockerInspectNotFound({ resource: input.resource,
      result: input.result, canonicalId: input.canonicalId });
  if (exactNotFound) return Object.freeze({ kind: "NOT_FOUND" });
  if (/permission denied|access denied/i.test(input.result.stderr)) {
    return inspectFailure("PERMISSION_DENIED", input.result);
  }
  if (/context deadline exceeded|timed? out|timeout/i.test(input.result.stderr)) {
    return inspectFailure("TIMEOUT", input.result);
  }
  if (/No such|not found/i.test(input.result.stderr)) {
    return inspectFailure("IDENTITY_MISMATCH", input.result);
  }
  if (/daemon|connection reset|cannot connect|socket/i.test(
    input.result.stderr,
  )) return inspectFailure("PROVIDER_UNAVAILABLE", input.result);
  return inspectFailure("UNKNOWN_FAILURE", input.result);
}

type BundleObservation = Readonly<{
  entryPath: string;
  bundlePath: string;
  resultPath: string;
  sha256: string;
  size: number;
  mode: number;
  command: readonly string[];
  repositoryInputs: readonly string[];
}>;

type ResultTransportObservation = Readonly<{
  result_file_observed: true;
  path_contract: "HOST_NONCE_RESULT_BIND";
  regular_file: true;
  mode: "0600";
  link_count: 1;
  size: number;
  sha256: string;
  result_validator: "ACCEPTED";
}>;

type ResultTransportReport = ResultTransportObservation | Readonly<{
  result_file_observed: boolean;
  path_contract: "HOST_NONCE_RESULT_BIND";
  regular_file: null;
  mode: null;
  link_count: null;
  size: null;
  sha256: null;
  result_validator: string;
}>;

type TransitionSemanticObservation = Readonly<{
  raw_transition_count: 5;
  explicit_authorized_count: 5;
  unauthorized_count: 0;
  cleanup_leak_count: 0;
  unknown_count: 0;
  baseline_active_mutation_count: 0;
  comparison_complete: true;
  baseline_active_count: number;
  final_active_count: number;
  transitions: readonly Readonly<{
    case_id: string;
    database: "main";
    classification: "EXPLICIT_AUTHORIZED_TEST_TRANSITION";
    opaque_reference: string;
  }>[];
}>;

const REQUIRED_TRANSITION_CASE_IDS = Object.freeze([
  "bundle_supersedes_null_existing_active_unchanged",
  "read_active_plus_candidate_selects_active",
  "read_active_plus_multiple_candidates_selects_active",
  "concurrency_forward",
  "concurrency_reverse",
] as const);

function rejectedResultTransport(
  resultFileObserved: boolean,
  validator: string,
): ResultTransportReport {
  return Object.freeze({ result_file_observed: resultFileObserved,
    path_contract: "HOST_NONCE_RESULT_BIND", regular_file: null, mode: null,
    link_count: null, size: null, sha256: null, result_validator: validator });
}

function isAcceptedResultTransport(
  value: ResultTransportReport,
): value is ResultTransportObservation {
  return value.result_validator === "ACCEPTED" &&
    value.result_file_observed === true && value.regular_file === true &&
    value.mode === "0600" && value.link_count === 1 &&
    typeof value.size === "number" && typeof value.sha256 === "string";
}

const STATE_INVARIANT_FAILURE_REASONS = Object.freeze([
  "STATE_INVARIANT_COMPARISON_INCOMPLETE",
  "STATE_INVARIANT_AUTOMATIC_PROMOTION_NONZERO",
  "STATE_INVARIANT_ACTIVE_STATE_CHANGED",
  "STATE_INVARIANT_MULTIPLE_FAILURES",
  "STATE_INVARIANT_MEASUREMENT_MISSING",
] as const);

type StateInvariantFailureReason =
  typeof STATE_INVARIANT_FAILURE_REASONS[number];

function stateInvariantFailureReason(value: unknown):
  StateInvariantFailureReason | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "STATE_INVARIANT_MEASUREMENT_MISSING";
  }
  const measurement = value as Record<string, unknown>;
  if (typeof measurement.comparison_complete !== "boolean" ||
    !Number.isSafeInteger(measurement.automatic_promotion_count) ||
    Number(measurement.automatic_promotion_count) < 0 ||
    typeof measurement.active_state_unchanged !== "boolean") {
    return "STATE_INVARIANT_MEASUREMENT_MISSING";
  }
  const failures = [
    measurement.comparison_complete === false
      ? "STATE_INVARIANT_COMPARISON_INCOMPLETE" : null,
    Number(measurement.automatic_promotion_count) > 0
      ? "STATE_INVARIANT_AUTOMATIC_PROMOTION_NONZERO" : null,
    measurement.active_state_unchanged === false
      ? "STATE_INVARIANT_ACTIVE_STATE_CHANGED" : null,
  ].filter((reason): reason is StateInvariantFailureReason => reason !== null);
  return failures.length === 0 ? null : failures.length === 1
    ? failures[0]! : "STATE_INVARIANT_MULTIPLE_FAILURES";
}

type RunnerFailureObservation = Readonly<{
  exit_code: number;
  state_error: string;
  oom_killed: boolean;
  last_completed_phase: Day147A5RunnerLastPhase;
  first_unreached_phase: Day147A5RunnerPhase | null;
  fixed_failure_code: Day147A5RunnerFailureCode | null;
  database_failure_class: Day147A5DatabaseConnectionFailureClass | null;
  pre_migration_operation: Day147A5PreMigrationOperationKey | null;
  pre_migration_failure_class: Day147A5PreMigrationFailureClass | null;
  pre_migration_sqlstate: string | "NONE" | null;
  admin_connection_passed: boolean | null;
  case_failure_operation: Day147A5CaseFailureOperation | null;
  case_integration_key: Day147A5CaseIntegrationKey | null;
  case_failure_class: Day147A5CaseFailureClass | null;
  case_id: string | "NONE" | null;
  assertion_id: Day147A5ReadAdapterAssertionId | "NONE" | null;
  expected_class: Day147A5AssertionValueClass | "NONE" | null;
  actual_class: Day147A5AssertionValueClass | "NONE" | null;
  case_sqlstate: string | "NONE" | null;
  completed_case_count: number | "NOT_OBSERVED";
  initial_candidate_completed: boolean | null;
  registry_digest_match: boolean;
  case_suite_executed_count: number | "NOT_OBSERVED";
  case_suite_failed_count: number | "NOT_OBSERVED";
  case_suite_digest_match: boolean | null;
  state_comparison_complete: boolean | null;
  automatic_promotion_count: number | null;
  active_state_unchanged: boolean | null;
  state_invariant_failure_reason: StateInvariantFailureReason | null;
  state_failure_marker_count: number;
  migration_failure_markers_present: boolean;
  failure_code_phase_mismatch: boolean;
  migration_started: boolean;
  migration_stage: Day147A5MigrationStage | null;
  migration_failure_class: Day147A5MigrationFailureClass | null;
  migration_sqlstate: string | "NONE" | null;
  raw_sql_exposed: boolean;
  credential_exposed: boolean;
  result_file_present: boolean;
  result_validator: "ACCEPTED" | "NOT_PRESENT" |
    "REJECTED_MARKER_SEQUENCE" | "REJECTED_FAILURE_CODE_MISMATCH" |
    "REJECTED_CASE_COUNT_MISMATCH" |
    "REJECTED_STATE_INVARIANT_DIAGNOSTIC" |
    "REJECTED_PRE_MIGRATION_DIAGNOSTIC" |
    "REJECTED_MIGRATION_DIAGNOSTIC" | "REJECTED_RESULT_CONTRACT";
  stdout: string;
  stderr: string;
}>;

function failureCodeAfterPhase(
  phase: Day147A5RunnerLastPhase,
): Day147A5RunnerFailureCode {
  if (phase === "NONE") return "RUNNER_PROCESS_START_FAILED";
  const index = DAY147_A5_RUNNER_PHASES.indexOf(phase);
  if (index === 0) return "RUNNER_BUNDLE_INTEGRITY_FAILED";
  if (index === 1) return "RUNNER_ENVIRONMENT_CONTRACT_INVALID";
  if (index === 2) return "RUNNER_RESULT_PATH_INVALID";
  if (index <= 4) return "RUNNER_DATABASE_CONNECTION_FAILED";
  if (index <= 10) return "RUNNER_PRE_MIGRATION_SETUP_FAILED";
  if (index <= 11) return "RUNNER_DAY146_MIGRATION_FAILED";
  if (index <= 13) return "RUNNER_PREPARE_MIGRATION_FAILED";
  if (index <= 15) return "RUNNER_ACTIVATE_MIGRATION_FAILED";
  if (index <= 17) return "RUNNER_CASE_SUITE_FAILED";
  if (index === 18) return "RUNNER_STATE_INVARIANT_FAILED";
  if (index === 19) return "RUNNER_CLIENT_CLEANUP_FAILED";
  if (index === 20) return "RUNNER_RESULT_SERIALIZATION_FAILED";
  if (index === 21) return "RUNNER_RESULT_WRITE_FAILED";
  return "RUNNER_UNKNOWN_TOP_LEVEL_FAILURE";
}

function classifyRunnerFailure(input: Readonly<{
  exitCode: number;
  stateError: string;
  oomKilled: boolean;
  stdout: string;
  stderr: string;
  resultFilePresent: boolean;
  result?: Day147A5ClientResult | null;
}>): RunnerFailureObservation {
  const stdout = boundedRunnerLog(input.stdout);
  const stderr = boundedRunnerLog(input.stderr);
  const allMarkers = stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_PHASE=([A-Z0-9_]+)$/.exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const moduleMarkerCount = allMarkers.filter((marker) =>
    marker === "CLIENT_MODULE_INITIALIZATION_STARTED").length;
  const markers = allMarkers.filter((marker) =>
    marker !== "CLIENT_MODULE_INITIALIZATION_STARTED");
  const moduleMarkerValid = moduleMarkerCount <= 1 &&
    (moduleMarkerCount === 0 ||
      allMarkers[0] === "CLIENT_MODULE_INITIALIZATION_STARTED");
  const markerSequenceValid = moduleMarkerValid && markers.every((marker, index) =>
    marker === DAY147_A5_RUNNER_PHASES[index]
  );
  const last = markerSequenceValid && markers.length > 0
    ? markers.at(-1)! as Day147A5RunnerPhase : "NONE";
  const firstUnreached = markerSequenceValid &&
      markers.length < DAY147_A5_RUNNER_PHASES.length
    ? DAY147_A5_RUNNER_PHASES[markers.length]! : null;
  const fixed = input.exitCode === 0 ? null : failureCodeAfterPhase(last);
  const clientCodes = stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_FAILURE=(RUNNER_[A-Z0-9_]+)$/.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1]!];
  });
  const clientCode = clientCodes.length === 1
    ? clientCodes[0] as Day147A5RunnerFailureCode : null;
  const databaseClasses = stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_DB_FAILURE_CLASS=(DB_[A-Z0-9_]+)$/.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1]!];
  });
  const databaseFailureClass = databaseClasses.length === 1 &&
      DAY147_A5_DATABASE_CONNECTION_FAILURE_CLASSES.includes(
        databaseClasses[0] as Day147A5DatabaseConnectionFailureClass,
      )
    ? databaseClasses[0] as Day147A5DatabaseConnectionFailureClass
    : null;
  const preMigrationClasses = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_PRE_MIGRATION_FAILURE_CLASS=(PRE_MIGRATION_[A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const preMigrationFailureClass = preMigrationClasses.length === 1 &&
      DAY147_A5_PRE_MIGRATION_FAILURE_CLASSES.includes(
        preMigrationClasses[0] as Day147A5PreMigrationFailureClass,
      )
    ? preMigrationClasses[0] as Day147A5PreMigrationFailureClass : null;
  const preMigrationOperations = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_PRE_MIGRATION_OPERATION=([A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const preMigrationOperation = preMigrationOperations.length === 1 &&
      DAY147_A5_PRE_MIGRATION_OPERATION_KEYS.includes(
        preMigrationOperations[0] as Day147A5PreMigrationOperationKey,
      )
    ? preMigrationOperations[0] as Day147A5PreMigrationOperationKey : null;
  const preMigrationSqlstates = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_PRE_MIGRATION_SQLSTATE=([0-9A-Z]{5}|NONE)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const preMigrationSqlstate = preMigrationSqlstates.length === 1
    ? preMigrationSqlstates[0]! : null;
  const adminConnectionPassed = preMigrationOperation === null ? null : [
      "SERVER_VERSION_QUERY", "SERVER_VERSION_VALIDATE",
      "ISOLATED_DATABASES_CREATE",
    ].includes(preMigrationOperation) ? true : [
      "ADMIN_CLIENT_CONSTRUCT", "ADMIN_CLIENT_CONNECT",
    ].includes(preMigrationOperation) ? false : null;
  const caseOperations = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_FAILURE_OPERATION=([A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const caseFailureOperation = caseOperations.length === 1 &&
      DAY147_A5_CASE_FAILURE_OPERATIONS.includes(
        caseOperations[0] as Day147A5CaseFailureOperation,
      ) ? caseOperations[0] as Day147A5CaseFailureOperation : null;
  const caseClasses = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_FAILURE_CLASS=(CASE_[A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const caseFailureClass = caseClasses.length === 1 &&
      DAY147_A5_CASE_FAILURE_CLASSES.includes(
        caseClasses[0] as Day147A5CaseFailureClass,
      ) ? caseClasses[0] as Day147A5CaseFailureClass : null;
  const caseIds = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_ID=([a-z0-9_]+|NONE)$/u.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1]!];
  });
  const caseId = caseIds.length === 1 && (caseIds[0] === "NONE" ||
      DAY147_A5_CLIENT_CASE_REGISTRY.some(({ id }) => id === caseIds[0]))
    ? caseIds[0] as string | "NONE" : null;
  const assertionIds = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_ASSERTION_ID=([A-Z0-9_]+|NONE)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const assertionId = assertionIds.length === 1 &&
      (assertionIds[0] === "NONE" || DAY147_A5_READ_ADAPTER_ASSERTION_IDS.includes(
        assertionIds[0] as Day147A5ReadAdapterAssertionId,
      ))
    ? assertionIds[0] as Day147A5ReadAdapterAssertionId | "NONE" : null;
  const expectedClasses = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_EXPECTED_CLASS=([A-Z0-9_]+|NONE)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const actualClasses = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_ACTUAL_CLASS=([A-Z0-9_]+|NONE)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const expectedClass = expectedClasses.length === 1 &&
      (expectedClasses[0] === "NONE" || DAY147_A5_ASSERTION_VALUE_CLASSES.includes(
        expectedClasses[0] as Day147A5AssertionValueClass,
      ))
    ? expectedClasses[0] as Day147A5AssertionValueClass | "NONE" : null;
  const actualClass = actualClasses.length === 1 &&
      (actualClasses[0] === "NONE" || DAY147_A5_ASSERTION_VALUE_CLASSES.includes(
        actualClasses[0] as Day147A5AssertionValueClass,
      ))
    ? actualClasses[0] as Day147A5AssertionValueClass | "NONE" : null;
  const caseSqlstates = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_SQLSTATE=([0-9A-Z]{5}|NONE)$/u.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1]!];
  });
  const caseSqlstate = caseSqlstates.length === 1 ? caseSqlstates[0]! : null;
  const caseIntegrationKeys = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_INTEGRATION_KEY=([A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const caseIntegrationKey = caseIntegrationKeys.length === 1 &&
      DAY147_A5_CASE_INTEGRATION_KEYS.includes(
        caseIntegrationKeys[0] as Day147A5CaseIntegrationKey,
      )
    ? caseIntegrationKeys[0] as Day147A5CaseIntegrationKey : null;
  const completedCaseCountMarkers = input.stderr.split(/\r?\n/u)
    .flatMap((line) => {
      const match = /^FARMOS_DAY147_A5_CASE_COMPLETED_COUNT=([0-9]+)$/u
        .exec(line.trim());
      return match === null ? [] : [match[1]!];
    });
  const parsedCompletedCaseCount = completedCaseCountMarkers.length === 1
    ? Number(completedCaseCountMarkers[0]) : Number.NaN;
  const callbackCompletedCaseCount = Number.isSafeInteger(
      parsedCompletedCaseCount,
    ) && parsedCompletedCaseCount >= 0 &&
      parsedCompletedCaseCount <= DAY147_A5_EXPECTED_CASE_COUNT
    ? parsedCompletedCaseCount : null;
  const initialCandidateMarkers = input.stderr.split(/\r?\n/u)
    .flatMap((line) => {
      const match = /^FARMOS_DAY147_A5_INITIAL_CANDIDATE_COMPLETED=(TRUE|FALSE)$/u
        .exec(line.trim());
      return match === null ? [] : [match[1]!];
    });
  const initialCandidateCompleted = initialCandidateMarkers.length === 1
    ? initialCandidateMarkers[0] === "TRUE" : null;
  const caseExecutedMarkers = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_EXECUTED_COUNT=([0-9]+)$/u.exec(
      line.trim(),
    );
    return match === null ? [] : [Number(match[1])];
  });
  const caseFailedMarkers = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_FAILED_COUNT=([0-9]+)$/u.exec(
      line.trim(),
    );
    return match === null ? [] : [Number(match[1])];
  });
  const caseDigestMarkers = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_CASE_DIGEST_MATCH=(TRUE|FALSE)$/u.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1] === "TRUE"];
  });
  const comparisonMarkers = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_STATE_COMPARISON_COMPLETE=(TRUE|FALSE)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1] === "TRUE"];
  });
  const promotionMarkers = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_AUTOMATIC_PROMOTION_COUNT=([0-9]+)$/u
      .exec(line.trim());
    return match === null ? [] : [Number(match[1])];
  });
  const activeUnchangedMarkers = input.stderr.split(/\r?\n/u)
    .flatMap((line) => {
      const match = /^FARMOS_DAY147_A5_ACTIVE_STATE_UNCHANGED=(TRUE|FALSE)$/u
        .exec(line.trim());
      return match === null ? [] : [match[1] === "TRUE"];
    });
  const stateFailureReasons = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_STATE_INVARIANT_FAILURE_REASON=([A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const stateFailureReason = stateFailureReasons.length === 1 &&
      STATE_INVARIANT_FAILURE_REASONS.includes(
        stateFailureReasons[0] as StateInvariantFailureReason,
      )
    ? stateFailureReasons[0] as StateInvariantFailureReason : null;
  const caseSuiteExecutedCount = caseExecutedMarkers.length === 1 &&
      Number.isSafeInteger(caseExecutedMarkers[0]) && caseExecutedMarkers[0]! >= 0
    ? caseExecutedMarkers[0]! : null;
  const caseSuiteFailedCount = caseFailedMarkers.length === 1 &&
      Number.isSafeInteger(caseFailedMarkers[0]) && caseFailedMarkers[0]! >= 0
    ? caseFailedMarkers[0]! : null;
  const caseSuiteDigestMatch = caseDigestMarkers.length === 1
    ? caseDigestMarkers[0]! : null;
  const stateComparisonComplete = comparisonMarkers.length === 1
    ? comparisonMarkers[0]! : null;
  const automaticPromotionCount = promotionMarkers.length === 1 &&
      Number.isSafeInteger(promotionMarkers[0]) && promotionMarkers[0]! >= 0
    ? promotionMarkers[0]! : null;
  const activeStateUnchanged = activeUnchangedMarkers.length === 1
    ? activeUnchangedMarkers[0]! : null;
  const phaseMismatchMarkers = input.stderr.split(/\r?\n/u).filter((line) =>
    line.trim() ===
      "FARMOS_DAY147_A5_DIAGNOSTIC=RUNNER_FAILURE_CODE_PHASE_MISMATCH"
  );
  const migrationStarted = markers.includes("DAY146_MIGRATION_START");
  const migrationStages = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_MIGRATION_STAGE=([A-Z0-9_]+)$/u.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1]!];
  });
  const validMigrationStages = new Set(DAY147_A5_MIGRATION_TARGETS.flatMap(
    (target) => DAY147_A5_MIGRATION_OPERATIONS.map(
      (operation) => `${target}_${operation}` as Day147A5MigrationStage,
    ),
  ));
  const migrationStage = migrationStages.length === 1 &&
      validMigrationStages.has(migrationStages[0] as Day147A5MigrationStage)
    ? migrationStages[0] as Day147A5MigrationStage : null;
  const migrationClasses = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_MIGRATION_FAILURE_CLASS=(MIGRATION_[A-Z0-9_]+)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const migrationFailureClass = migrationClasses.length === 1 &&
      DAY147_A5_MIGRATION_FAILURE_CLASSES.includes(
        migrationClasses[0] as Day147A5MigrationFailureClass,
      )
    ? migrationClasses[0] as Day147A5MigrationFailureClass : null;
  const migrationSqlstates = input.stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_MIGRATION_SQLSTATE=([0-9A-Z]{5}|NONE)$/u
      .exec(line.trim());
    return match === null ? [] : [match[1]!];
  });
  const migrationSqlstate = migrationSqlstates.length === 1
    ? migrationSqlstates[0]! : null;
  const rawSqlExposed = /\b(?:select|insert|update|delete|create|alter|drop)\s+/iu
    .test(input.stderr);
  const credentialExposed = /(?:postgres(?:ql)?:\/\/|PGPASSWORD=|password=|\/Users\/|\/private\/)/iu
    .test(input.stderr);
  const clientLastPhases = stderr.split(/\r?\n/u).flatMap((line) => {
    const match = /^FARMOS_DAY147_A5_LAST_PHASE=([A-Z0-9_]+)$/.exec(
      line.trim(),
    );
    return match === null ? [] : [match[1]!];
  });
  const clientLastPhase = clientLastPhases.length === 1
    ? clientLastPhases[0] : null;
  let resultValidator: RunnerFailureObservation["result_validator"] =
    input.resultFilePresent ? "REJECTED_RESULT_CONTRACT" : "NOT_PRESENT";
  const migrationFailureCode = clientCode !== null && [
    "RUNNER_DAY146_MIGRATION_FAILED",
    "RUNNER_PREPARE_MIGRATION_FAILED",
    "RUNNER_ACTIVATE_MIGRATION_FAILED",
  ].includes(clientCode);
  const preMigrationFailureCode =
    clientCode === "RUNNER_PRE_MIGRATION_SETUP_FAILED";
  const preMigrationOperationClassValid = (() => {
    switch (preMigrationOperation) {
      case "ADMIN_CLIENT_CONSTRUCT":
      case "PRE_MIGRATION_UNKNOWN":
        return preMigrationFailureClass === "PRE_MIGRATION_UNKNOWN_FAILURE";
      case "ADMIN_CLIENT_CONNECT":
        return preMigrationFailureClass ===
            "PRE_MIGRATION_ADMIN_CONNECTION_FAILED" ||
          preMigrationSqlstate === "22023" && preMigrationFailureClass ===
            "PRE_MIGRATION_SESSION_CONFIGURATION_FAILED";
      case "SERVER_VERSION_QUERY":
        return preMigrationFailureClass ===
          "PRE_MIGRATION_SERVER_VERSION_QUERY_FAILED";
      case "SERVER_VERSION_VALIDATE":
        return preMigrationSqlstate === "NONE" && preMigrationFailureClass ===
          "PRE_MIGRATION_SERVER_VERSION_VALIDATION_FAILED";
      case "ISOLATED_DATABASES_CREATE":
        return preMigrationFailureClass ===
          "PRE_MIGRATION_DATABASE_CREATE_FAILED";
      case null:
        return false;
    }
  })();
  const preMigrationOperationPhaseValid = preMigrationOperation ===
      "ISOLATED_DATABASES_CREATE"
    ? last === "ISOLATED_DATABASES_CREATE_START"
    : preMigrationOperation === "PRE_MIGRATION_UNKNOWN"
      ? DAY147_A5_PRE_MIGRATION_EXECUTION_PHASES.includes(
        last as Day147A5PreMigrationExecutionPhase,
      )
      : [
          "ADMIN_CLIENT_CONSTRUCT", "ADMIN_CLIENT_CONNECT",
          "SERVER_VERSION_QUERY", "SERVER_VERSION_VALIDATE",
        ].includes(preMigrationOperation ?? "")
        ? last === "SHARED_DYNAMIC_SUITE_START" : false;
  const preMigrationDiagnosticValid = preMigrationFailureCode
    ? preMigrationOperation !== null && preMigrationFailureClass !== null &&
      preMigrationSqlstate !== null && preMigrationOperations.length === 1 &&
      preMigrationClasses.length === 1 && preMigrationSqlstates.length === 1 &&
      preMigrationOperationClassValid && preMigrationOperationPhaseValid &&
      !migrationStarted && !rawSqlExposed && !credentialExposed
    : preMigrationOperations.length === 0 && preMigrationClasses.length === 0 &&
      preMigrationSqlstates.length === 0;
  const stageFailureCode = migrationStage?.includes("_DAY146_")
    ? "RUNNER_DAY146_MIGRATION_FAILED"
    : migrationStage?.includes("_PREPARE_")
      ? "RUNNER_PREPARE_MIGRATION_FAILED"
      : migrationStage?.includes("_ACTIVATE_")
        ? "RUNNER_ACTIVATE_MIGRATION_FAILED" : null;
  const effectiveFixed = migrationFailureCode && stageFailureCode !== null
    ? stageFailureCode as Day147A5RunnerFailureCode : fixed;
  const requiredStartPhase = stageFailureCode === "RUNNER_DAY146_MIGRATION_FAILED"
    ? "DAY146_MIGRATION_START"
    : stageFailureCode === "RUNNER_PREPARE_MIGRATION_FAILED"
      ? "PREPARE_MIGRATION_START"
      : stageFailureCode === "RUNNER_ACTIVATE_MIGRATION_FAILED"
        ? "ACTIVATE_MIGRATION_START" : null;
  const requiredStartReached = requiredStartPhase !== null &&
    markers.includes(requiredStartPhase);
  const migrationDiagnosticValid = migrationFailureCode
    ? migrationStage !== null && migrationFailureClass !== null &&
      migrationSqlstate !== null && stageFailureCode === clientCode &&
      requiredStartReached &&
      migrationStages.length === 1 && migrationClasses.length === 1 &&
      migrationSqlstates.length === 1 && !rawSqlExposed && !credentialExposed
    : migrationStages.length === 0 && migrationClasses.length === 0 &&
      migrationSqlstates.length === 0;
  const caseFailureCode = clientCode === "RUNNER_CASE_SUITE_FAILED";
  const groupedCaseFailure = caseIntegrationKey !== null &&
    caseIntegrationKey !== "NONE";
  const readAdapterCaseIds = new Set(DAY147_A5_CLIENT_CASE_REGISTRY
    .filter(({ category }) => category === "read_integration")
    .map(({ id }) => id));
  const caseIdentityValid = caseFailureOperation === "CASE_REGISTRY_PRECHECK"
    ? caseIntegrationKey === "NONE" && caseId === "NONE" &&
      callbackCompletedCaseCount === 0
    : caseFailureOperation === "CASE_EXECUTION"
    ? groupedCaseFailure
      ? caseIntegrationKey === "READ_ADAPTER_INTEGRATION"
        ? caseId !== null && caseId !== "NONE" && readAdapterCaseIds.has(caseId)
        : caseId === "NONE" :
      caseIntegrationKey === "NONE" && caseId !== null && caseId !== "NONE"
    : caseFailureOperation === "CASE_RESULT_AGGREGATION"
      ? caseIntegrationKey === "NONE" : false;
  const caseOperationClassValid = caseFailureOperation ===
      "CASE_REGISTRY_PRECHECK"
    ? caseFailureClass === "CASE_REGISTRY_CONTRACT_FAILED" && caseId === "NONE"
    : caseFailureOperation === "CASE_RESULT_AGGREGATION"
      ? caseFailureClass === "CASE_RESULT_AGGREGATION_FAILED"
      : caseFailureOperation === "CASE_EXECUTION"
        ? caseFailureClass !== null && ![
          "CASE_REGISTRY_CONTRACT_FAILED", "CASE_RESULT_AGGREGATION_FAILED",
        ].includes(caseFailureClass) : false;
  const caseSqlstateClassValid = caseFailureClass ===
      "CASE_SQL_EXECUTION_FAILED"
    ? caseSqlstate !== null && caseSqlstate !== "NONE"
    : caseSqlstate === "NONE";
  const assertionDiagnosticRequired = caseIntegrationKey ===
      "READ_ADAPTER_INTEGRATION" && caseFailureClass === "CASE_ASSERTION_FAILED";
  const assertionDiagnosticValid = assertionIds.length === 1 &&
    expectedClasses.length === 1 && actualClasses.length === 1 &&
    assertionId !== null && expectedClass !== null && actualClass !== null &&
    (assertionDiagnosticRequired
      ? assertionId !== "NONE" && expectedClass !== "NONE" &&
        actualClass !== "NONE"
      : assertionId === "NONE" && expectedClass === "NONE" &&
        actualClass === "NONE");
  const caseDiagnosticValid = caseFailureCode
    ? last === "CASE_SUITE_START" && caseFailureOperation !== null &&
      caseFailureClass !== null && caseId !== null && caseSqlstate !== null &&
      caseOperations.length === 1 && caseClasses.length === 1 &&
      caseIds.length === 1 && caseSqlstates.length === 1 &&
      caseIntegrationKeys.length === 1 && completedCaseCountMarkers.length === 1 &&
      initialCandidateMarkers.length === 1 && caseIntegrationKey !== null &&
      callbackCompletedCaseCount !== null && initialCandidateCompleted !== null &&
      caseIdentityValid && caseOperationClassValid && caseSqlstateClassValid &&
      assertionDiagnosticValid &&
      migrationStages.length === 0 && migrationClasses.length === 0 &&
      migrationSqlstates.length === 0 && !rawSqlExposed && !credentialExposed
    : caseOperations.length === 0 && caseClasses.length === 0 &&
      caseIds.length === 0 && caseSqlstates.length === 0 &&
      assertionIds.length === 0 && expectedClasses.length === 0 &&
      actualClasses.length === 0 &&
      caseIntegrationKeys.length === 0 && completedCaseCountMarkers.length === 0 &&
      initialCandidateMarkers.length === 0;
  const lastPhaseIndex = last === "NONE" ? -1 :
    DAY147_A5_RUNNER_PHASES.indexOf(last);
  const caseSuiteReached = lastPhaseIndex >=
    DAY147_A5_RUNNER_PHASES.indexOf("CASE_SUITE_PASS");
  const caseSuiteReportingValid = caseSuiteReached
    ? caseExecutedMarkers.length === 1 && caseFailedMarkers.length === 1 &&
      caseDigestMarkers.length === 1 &&
      caseSuiteExecutedCount === DAY147_A5_EXPECTED_CASE_COUNT &&
      caseSuiteFailedCount === 0 && caseSuiteDigestMatch === true
    : caseExecutedMarkers.length === 0 && caseFailedMarkers.length === 0 &&
      caseDigestMarkers.length === 0;
  const stateMarkerCounts = [comparisonMarkers.length, promotionMarkers.length,
    activeUnchangedMarkers.length];
  const stateMeasurementMissing = stateMarkerCounts.some((count) => count !== 1);
  const derivedStateFailureReason = stateInvariantFailureReason({
    comparison_complete: stateComparisonComplete,
    automatic_promotion_count: automaticPromotionCount,
    active_state_unchanged: activeStateUnchanged,
  });
  const stateInvariantFailure = effectiveFixed ===
    "RUNNER_STATE_INVARIANT_FAILED";
  const stateInvariantPassed = lastPhaseIndex >=
    DAY147_A5_RUNNER_PHASES.indexOf("STATE_INVARIANTS_PASS");
  const stateInvariantDiagnosticValid = stateInvariantFailure
    ? last === "CASE_SUITE_PASS" && stateFailureReasons.length === 1 &&
      stateFailureReason !== null &&
      stateFailureReason === derivedStateFailureReason &&
      (stateFailureReason === "STATE_INVARIANT_MEASUREMENT_MISSING"
        ? stateMeasurementMissing && stateMarkerCounts.every((count) => count <= 1)
        : !stateMeasurementMissing)
    : stateInvariantPassed
      ? stateMarkerCounts.every((count) => count === 1) &&
        stateFailureReasons.length === 0 && stateComparisonComplete === true &&
        automaticPromotionCount === 0 && activeStateUnchanged === true
      : stateMarkerCounts.every((count) => count === 0) &&
        stateFailureReasons.length === 0;
  const resultCompletedCaseCount = input.result?.case_registry.executed_count;
  const completedCaseCountMismatch = callbackCompletedCaseCount !== null &&
    resultCompletedCaseCount !== undefined &&
    callbackCompletedCaseCount !== resultCompletedCaseCount;
  const resultCompletedCaseIds = input.result?.case_registry.cases.map(
    ({ case_id: caseIdValue }) => caseIdValue,
  );
  const resultCompletedCaseIdSet = resultCompletedCaseIds === undefined
    ? null : new Set(resultCompletedCaseIds);
  const resultCompletedCaseSetValid = resultCompletedCaseIds === undefined ||
    resultCompletedCaseIdSet !== null &&
    resultCompletedCaseIdSet.size === resultCompletedCaseIds.length &&
    resultCompletedCaseIds.length === resultCompletedCaseCount &&
    resultCompletedCaseIds.every((caseIdValue) =>
      DAY147_A5_CLIENT_CASE_REGISTRY.some(({ id }) => id === caseIdValue)
    );
  const initialCandidateCompletionMismatch = initialCandidateCompleted !== null &&
    resultCompletedCaseIdSet !== null && initialCandidateCompleted !==
      resultCompletedCaseIdSet.has("initial_candidate_valid");
  if (!markerSequenceValid) resultValidator = "REJECTED_MARKER_SEQUENCE";
  else if (!preMigrationDiagnosticValid) {
    resultValidator = "REJECTED_PRE_MIGRATION_DIAGNOSTIC";
  }
  else if (!migrationDiagnosticValid) {
    resultValidator = "REJECTED_MIGRATION_DIAGNOSTIC";
  }
  else if (!caseDiagnosticValid) {
    resultValidator = "REJECTED_FAILURE_CODE_MISMATCH";
  }
  else if (!caseSuiteReportingValid || !stateInvariantDiagnosticValid) {
    resultValidator = "REJECTED_STATE_INVARIANT_DIAGNOSTIC";
  }
  else if (completedCaseCountMismatch || !resultCompletedCaseSetValid ||
      initialCandidateCompletionMismatch) {
    resultValidator = "REJECTED_CASE_COUNT_MISMATCH";
  }
  else if (effectiveFixed !== null && clientCode !== null &&
      clientCode !== effectiveFixed ||
    effectiveFixed === "RUNNER_DATABASE_CONNECTION_FAILED" &&
      databaseFailureClass === null ||
    effectiveFixed !== "RUNNER_DATABASE_CONNECTION_FAILED" &&
      databaseClasses.length !== 0 ||
    clientLastPhase !== null && clientLastPhase !== last ||
    input.result?.failure_code !== undefined && effectiveFixed !== null &&
      input.result.failure_code !== effectiveFixed) {
    resultValidator = "REJECTED_FAILURE_CODE_MISMATCH";
  } else if (input.resultFilePresent && input.result !== undefined &&
    input.result !== null) resultValidator = "ACCEPTED";
  return Object.freeze({ exit_code: input.exitCode,
    state_error: boundedRunnerLog(input.stateError),
    oom_killed: input.oomKilled, last_completed_phase: last,
    first_unreached_phase: firstUnreached, fixed_failure_code: effectiveFixed,
    database_failure_class: databaseFailureClass,
    pre_migration_operation: preMigrationOperation,
    pre_migration_failure_class: preMigrationFailureClass,
    pre_migration_sqlstate: preMigrationSqlstate,
    admin_connection_passed: adminConnectionPassed,
    case_failure_operation: caseFailureOperation,
    case_integration_key: caseIntegrationKey,
    case_failure_class: caseFailureClass,
    case_id: caseId,
    assertion_id: assertionId,
    expected_class: expectedClass,
    actual_class: actualClass,
    case_sqlstate: caseSqlstate,
    completed_case_count: callbackCompletedCaseCount ??
      resultCompletedCaseCount ?? "NOT_OBSERVED",
    initial_candidate_completed: initialCandidateCompleted,
    registry_digest_match: input.result?.case_registry.actual_digest ===
      DAY147_A5_EXPECTED_REGISTRY_DIGEST,
    case_suite_executed_count: caseSuiteExecutedCount ?? "NOT_OBSERVED",
    case_suite_failed_count: caseSuiteFailedCount ?? "NOT_OBSERVED",
    case_suite_digest_match: caseSuiteDigestMatch,
    state_comparison_complete: stateComparisonComplete,
    automatic_promotion_count: automaticPromotionCount,
    active_state_unchanged: activeStateUnchanged,
    state_invariant_failure_reason: stateFailureReason,
    state_failure_marker_count: stateFailureReasons.length,
    migration_failure_markers_present: migrationStages.length > 0 ||
      migrationClasses.length > 0 || migrationSqlstates.length > 0,
    failure_code_phase_mismatch: phaseMismatchMarkers.length === 1,
    migration_started: migrationStarted,
    migration_stage: migrationStage,
    migration_failure_class: migrationFailureClass,
    migration_sqlstate: migrationSqlstate,
    raw_sql_exposed: rawSqlExposed,
    credential_exposed: credentialExposed,
    result_file_present: input.resultFilePresent,
    result_validator: resultValidator, stdout, stderr });
}

type OperationCounters = {
  dockerCommands: number;
  imageBuilds: number;
  networksCreated: number;
  containersCreated: number;
  databaseConnections: number;
  migrations: number;
  dynamicCases: number;
  evidenceWrites: number;
};

class MinimalBundleError extends Error {
  constructor(readonly diagnostic: string) {
    super("BLOCKED_MINIMAL_V2_BUNDLE");
  }
}

const ZERO_COUNTERS = (): OperationCounters => ({
  dockerCommands: 0,
  imageBuilds: 0,
  networksCreated: 0,
  containersCreated: 0,
  databaseConnections: 0,
  migrations: 0,
  dynamicCases: 0,
  evidenceWrites: 0,
});

function parseArguments(argv: readonly string[]): ParsedArguments {
  if (argv.length === 0) return { mode: "static", authority: null };
  if (argv.length === 2 && argv[0] === "--mode=execute-minimal-network" &&
    argv[1] === `--authority=${AUTHORITY}`) {
    return { mode: "execute-minimal-network", authority: AUTHORITY };
  }
  if (argv.length === 2 &&
    argv[0] === "--mode=diagnose-minimal-network-preflight" &&
    argv[1] === `--authority=${DIAGNOSTIC_AUTHORITY}`) {
    return { mode: "diagnose-minimal-network-preflight",
      authority: DIAGNOSTIC_AUTHORITY };
  }
  throw new Error("DAY147_A5_MINIMAL_ARGUMENT_AUTHORITY_BLOCKED");
}

function networkNameForNonce(nonce: string): string {
  if (!/^[a-f0-9]{12}$/.test(nonce)) {
    throw new Error("DAY147_A5_MINIMAL_NETWORK_NAME_INVALID");
  }
  const name = `farmos-day147a5-minimal-${nonce}`;
  if (name.length === 0 || name.length > 63 ||
    !/^[a-z0-9][a-z0-9_.-]*$/.test(name)) {
    throw new Error("DAY147_A5_MINIMAL_NETWORK_NAME_INVALID");
  }
  return name;
}

function namesForNonce(nonce: string): MinimalNames {
  if (!/^[a-f0-9]{12}$/.test(nonce)) {
    throw new Error("DAY147_A5_MINIMAL_NONCE_INVALID");
  }
  const temporaryRoot = `${TEMP_ROOT_PARENT}/farmos-day147a5-minimal-${nonce}`;
  return Object.freeze({
    network: networkNameForNonce(nonce),
    postgres: `farmos_day147a5_minimal_${nonce}_postgres`,
    runner: `farmos_day147a5_minimal_${nonce}_runner`,
    database: `farmos_day147a5_${nonce}_main`,
    temporaryRoot,
    entry: `${temporaryRoot}/client-entry.ts`,
    bundle: `${temporaryRoot}/client.cjs`,
    metafile: `${temporaryRoot}/bundle-meta.json`,
    resultDirectory: `${temporaryRoot}/result`,
    result: `${temporaryRoot}/result/client-result.json`,
  });
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function bounded(value: string): string {
  return value.slice(0, MAX_LOG_BYTES)
    .replaceAll(ROOT, "[REPOSITORY_ROOT]")
    .replaceAll(TEMP_ROOT_PARENT, "[TEMP_ROOT]")
    .replaceAll(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .replaceAll(/PGPASSWORD=[^\s]+/g, "PGPASSWORD=[REDACTED]");
}

function boundedRunnerLog(value: string): string {
  return bounded(value).split(/\r?\n/u).slice(0, MAX_LOG_LINES).join("\n")
    .slice(0, MAX_LOG_BYTES);
}

function commandSucceeded(result: CommandResult, failureCode: string): CommandResult {
  if (result.status !== 0) throw new Error(failureCode);
  return result;
}

function productionRunner(counters: OperationCounters): CommandRunner {
  return Object.freeze({
    run(program, args, options = {}) {
      if (program === "docker") counters.dockerCommands += 1;
      const environment = options.environment === undefined
        ? process.env
        : { PATH: process.env.PATH ?? "", ...options.environment };
      const result = spawnSync(program, [...args], {
        cwd: ROOT,
        env: environment,
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const observation = {
        status: result.status ?? 1,
        stdout: options.structuredStdout
          ? result.stdout ?? "" : bounded(result.stdout ?? ""),
        stderr: bounded(result.stderr ?? ""),
      };
      if (!options.allowFailure && observation.status !== 0) {
        throw new Error("DAY147_A5_MINIMAL_COMMAND_FAILED");
      }
      return observation;
    },
  });
}

function docker(runner: CommandRunner, args: readonly string[],
  options?: CommandOptions): CommandResult {
  return runner.run("docker", args, options);
}

function dockerInspect(input: Readonly<{
  runner: CommandRunner;
  args: readonly string[];
  resource: "container" | "network";
  canonicalId?: string;
  expectedShape?: DockerInspectExpectedShape;
  providerIdentityMatched?: boolean;
}>): DockerInspectClassification {
  return classifyDockerInspect({ resource: input.resource,
    result: docker(input.runner, input.args,
      { allowFailure: true, structuredStdout: true }),
    canonicalId: input.canonicalId,
    expectedShape: input.expectedShape ?? "ARRAY",
    providerIdentityMatched: input.providerIdentityMatched ?? true });
}

function requirePresentInspect(
  classification: DockerInspectClassification,
  failureCode: string,
): Record<string, unknown> {
  if (classification.kind !== "PRESENT") throw new Error(failureCode);
  return classification.value as Record<string, unknown>;
}

function runnerInspectFailure(
  classification: Exclude<DockerInspectClassification, { kind: "PRESENT" }>,
): Error {
  const code = classification.kind === "MALFORMED_JSON"
    ? "DAY147_A5_MINIMAL_RUNNER_INSPECT_MALFORMED"
    : classification.kind === "UNEXPECTED_SHAPE"
      ? "DAY147_A5_MINIMAL_RUNNER_INSPECT_UNEXPECTED_SHAPE"
      : classification.kind === "PERMISSION_DENIED"
        ? "DAY147_A5_MINIMAL_RUNNER_INSPECT_PERMISSION_DENIED"
        : classification.kind === "PROVIDER_UNAVAILABLE"
          ? "DAY147_A5_MINIMAL_RUNNER_INSPECT_PROVIDER_UNAVAILABLE"
          : classification.kind === "IDENTITY_MISMATCH" ||
              classification.kind === "NOT_FOUND"
            ? "DAY147_A5_MINIMAL_RUNNER_IDENTITY_MISMATCH"
            : "DAY147_A5_MINIMAL_DOCKER_INSPECT_INVALID";
  return new Error(code);
}

function readMigrationSql(): Day147A5ClientSuiteInput["migrationSql"] {
  const entries = Object.fromEntries(Object.entries(MIGRATION_FILES).map(
    ([key, path]) => {
      const bytes = readFileSync(resolve(ROOT, path));
      const expected = DAY147_A5_MIGRATION_CHECKSUMS[
        key === "activate_apply" ? "activation_apply" :
        key === "activate_verify" ? "activation_verify" :
        key as keyof typeof DAY147_A5_MIGRATION_CHECKSUMS
      ];
      if (sha256(bytes) !== expected) {
        throw new Error("BLOCKED_CHECKSUM_MISMATCH");
      }
      return [key, bytes.toString("utf8")];
    },
  )) as Record<keyof typeof MIGRATION_FILES, string>;
  return Object.freeze({
    day146: entries.day146,
    prepare: Object.freeze({ apply: entries.prepare_apply,
      verify: entries.prepare_verify }),
    activate: Object.freeze({ apply: entries.activate_apply,
      verify: entries.activate_verify }),
  });
}

function clientEntrySource(input: Readonly<{
  migrationSql: Day147A5ClientSuiteInput["migrationSql"];
}>): string {
  const suitePath = resolve(ROOT,
    "scripts/hermes/lib/farm_os_day147a5_client_suite.ts");
  return [
    `import { lstat, readFile, realpath, writeFile } from ${JSON.stringify("node:fs/promises")};`,
    `import { createHash } from ${JSON.stringify("node:crypto")};`,
    `import { classifyDay147A5CaseFailure, classifyDay147A5MigrationFailure, classifyDay147A5PreMigrationFailure, createDay147A5RunnerFailureResult, runDay147A5ClientSuite } from ${JSON.stringify(suitePath)};`,
    `const migrationSql = ${JSON.stringify(input.migrationSql)};`,
    `const phases = ${JSON.stringify(DAY147_A5_RUNNER_PHASES)};`,
    `const expectedRegistryDigest = ${JSON.stringify(DAY147_A5_EXPECTED_REGISTRY_DIGEST)};`,
    `const exactEnvironmentKeys = ${JSON.stringify(EXACT_ENVIRONMENT_KEYS)};`,
    "let lastCompletedPhase = 'NONE'; let executionNonce = '';",
    "let expectedBundleSha256 = ''; let observedBundleSha256 = '';",
    "let resultPath = null; let pendingResult = null; let migrationFailure = null; let preMigrationFailure = null; let caseFailure = null; let failureCodePhaseMismatch = false;",
    "const runtimeArguments = process.argv.slice(2);",
    "const moduleInitCheck = runtimeArguments.length === 1 && runtimeArguments[0] === '--module-init-check';",
    "const phase = (value) => { const currentIndex = lastCompletedPhase === 'NONE' ? -1 : phases.indexOf(lastCompletedPhase); if (!phases.includes(value) || phases[currentIndex + 1] !== value) throw new Error('RUNNER_UNKNOWN_TOP_LEVEL_FAILURE'); lastCompletedPhase = value; console.error(`FARMOS_DAY147_A5_PHASE=${value}`); };",
    "const required = (name) => { const value = process.env[name]; if (typeof value !== 'string' || value.length === 0) throw new Error('RUNNER_ENVIRONMENT_CONTRACT_INVALID'); return value; };",
    "const phaseIndex = (value) => phases.indexOf(value);",
    "const phaseFailureCode = () => { const index = phaseIndex(lastCompletedPhase); if (index < 0) return 'RUNNER_PROCESS_START_FAILED'; if (index === 0) return 'RUNNER_BUNDLE_INTEGRITY_FAILED'; if (index === 1) return 'RUNNER_ENVIRONMENT_CONTRACT_INVALID'; if (index === 2) return 'RUNNER_RESULT_PATH_INVALID'; if (index <= 4) return 'RUNNER_DATABASE_CONNECTION_FAILED'; if (index <= 10) return 'RUNNER_PRE_MIGRATION_SETUP_FAILED'; if (index <= 11) return 'RUNNER_DAY146_MIGRATION_FAILED'; if (index <= 13) return 'RUNNER_PREPARE_MIGRATION_FAILED'; if (index <= 15) return 'RUNNER_ACTIVATE_MIGRATION_FAILED'; if (index <= 17) return 'RUNNER_CASE_SUITE_FAILED'; if (index === 18) return 'RUNNER_STATE_INVARIANT_FAILED'; if (index === 19) return 'RUNNER_CLIENT_CLEANUP_FAILED'; if (index === 20) return 'RUNNER_RESULT_SERIALIZATION_FAILED'; if (index === 21) return 'RUNNER_RESULT_WRITE_FAILED'; return 'RUNNER_UNKNOWN_TOP_LEVEL_FAILURE'; };",
    "const failureFor = (error) => { const expected = phaseFailureCode(); const callbackCode = migrationFailure?.fixedFailureCode ?? preMigrationFailure?.fixedFailureCode ?? caseFailure?.fixedFailureCode ?? null; const candidate = callbackCode ?? (error instanceof Error ? error.message : ''); if (/^RUNNER_[A-Z0-9_]+$/.test(candidate)) { if (candidate !== expected) failureCodePhaseMismatch = true; return expected; } if (error instanceof SyntaxError && expected === 'RUNNER_BUNDLE_INTEGRITY_FAILED') return 'RUNNER_BUNDLE_SYNTAX_INVALID'; return expected; };",
    `const dbFailureClasses = ${JSON.stringify(DAY147_A5_DATABASE_CONNECTION_FAILURE_CLASSES)};`,
    "const dbFailureClassFor = (error) => error instanceof Error && typeof error.failureClass === 'string' && dbFailureClasses.includes(error.failureClass) ? error.failureClass : 'DB_UNKNOWN_CONNECTION_FAILURE';",
    "const stateFailureReasonFor = (value) => { if (typeof value !== 'object' || value === null || Array.isArray(value) || typeof value.comparison_complete !== 'boolean' || !Number.isSafeInteger(value.automatic_promotion_count) || value.automatic_promotion_count < 0 || typeof value.active_state_unchanged !== 'boolean') return 'STATE_INVARIANT_MEASUREMENT_MISSING'; const failures = [value.comparison_complete === false ? 'STATE_INVARIANT_COMPARISON_INCOMPLETE' : null, value.automatic_promotion_count > 0 ? 'STATE_INVARIANT_AUTOMATIC_PROMOTION_NONZERO' : null, value.active_state_unchanged === false ? 'STATE_INVARIANT_ACTIVE_STATE_CHANGED' : null].filter((item) => item !== null); return failures.length === 0 ? null : failures.length === 1 ? failures[0] : 'STATE_INVARIANT_MULTIPLE_FAILURES'; };",
    "const emitCompletedResultPhases = (result) => { if (typeof result.postgres_version !== 'string' || result.postgres_version.length === 0 || result.migration_results.day146 !== 'PASS') throw new Error('RUNNER_DAY146_MIGRATION_FAILED'); if (result.migration_results.prepare_apply !== 'PASS' || result.migration_results.prepare_verify !== 'PASS') throw new Error('RUNNER_PREPARE_MIGRATION_FAILED'); if (result.migration_results.activate_apply !== 'PASS' || result.migration_results.activate_verify !== 'PASS') throw new Error('RUNNER_ACTIVATE_MIGRATION_FAILED'); const digestMatched = result.case_registry.actual_digest === expectedRegistryDigest && result.case_registry.expected_digest === expectedRegistryDigest; if (result.case_registry.executed_count !== 102 || result.case_registry.failed_count !== 0 || !result.case_registry.exact_case_set || !digestMatched) throw new Error('RUNNER_CASE_SUITE_FAILED'); console.error(`FARMOS_DAY147_A5_CASE_EXECUTED_COUNT=${result.case_registry.executed_count}`); console.error(`FARMOS_DAY147_A5_CASE_FAILED_COUNT=${result.case_registry.failed_count}`); console.error(`FARMOS_DAY147_A5_CASE_DIGEST_MATCH=${digestMatched ? 'TRUE' : 'FALSE'}`); phase('CASE_SUITE_PASS'); const invariants = result.state_invariants; const reason = stateFailureReasonFor(invariants); if (typeof invariants?.comparison_complete === 'boolean') console.error(`FARMOS_DAY147_A5_STATE_COMPARISON_COMPLETE=${invariants.comparison_complete ? 'TRUE' : 'FALSE'}`); if (Number.isSafeInteger(invariants?.automatic_promotion_count) && invariants.automatic_promotion_count >= 0) console.error(`FARMOS_DAY147_A5_AUTOMATIC_PROMOTION_COUNT=${invariants.automatic_promotion_count}`); if (typeof invariants?.active_state_unchanged === 'boolean') console.error(`FARMOS_DAY147_A5_ACTIVE_STATE_UNCHANGED=${invariants.active_state_unchanged ? 'TRUE' : 'FALSE'}`); if (reason !== null) console.error(`FARMOS_DAY147_A5_STATE_INVARIANT_FAILURE_REASON=${reason}`); if (reason !== null) throw new Error('RUNNER_STATE_INVARIANT_FAILED'); phase('STATE_INVARIANTS_PASS'); const cleanup = result.client_cleanup; if (cleanup.clients_created <= 0 || cleanup.clients_created !== cleanup.close_attempted || cleanup.clients_created !== cleanup.close_completed || cleanup.close_failed !== 0 || cleanup.open_clients_after_cleanup !== 0) throw new Error('RUNNER_CLIENT_CLEANUP_FAILED'); phase('CLIENT_CLEANUP_PASS'); };",
    "async function main() {",
    "  phase('CLIENT_PROCESS_STARTED');",
    "  expectedBundleSha256 = process.env.FARMOS_DAY147_A5_BUNDLE_SHA256 ?? ''; if (!/^[a-f0-9]{64}$/.test(expectedBundleSha256)) throw new Error('RUNNER_BUNDLE_INTEGRITY_FAILED');",
    "  const executingPath = __filename; const metadata = await lstat(executingPath); const canonicalPath = await realpath(executingPath); observedBundleSha256 = createHash('sha256').update(await readFile(executingPath)).digest('hex');",
    "  if (executingPath !== '/workspace/client.cjs' || canonicalPath !== '/workspace/client.cjs' || !metadata.isFile() || metadata.isSymbolicLink() || !/^[a-f0-9]{64}$/.test(expectedBundleSha256) || observedBundleSha256 !== expectedBundleSha256) throw new Error('RUNNER_BUNDLE_INTEGRITY_FAILED');",
    "  phase('BUNDLE_INTEGRITY_VALID');",
    "  executionNonce = required('FARMOS_A5_EXECUTION_NONCE'); const controlledKeys = Object.keys(process.env).filter((key) => key.startsWith('FARMOS_') || /^PG(?:HOST|PORT|USER|PASSWORD|DATABASE)$/.test(key)).sort(); if (JSON.stringify(controlledKeys) !== JSON.stringify([...exactEnvironmentKeys].sort()) || !/^[a-f0-9]{12}$/.test(executionNonce) || required('PGHOST') !== 'postgres' || required('PGPORT') !== '5432' || Object.keys(process.env).some((key) => /^(?:DATABASE_URL|DIRECT_URL|SUPABASE_URL|VERCEL_URL)$/.test(key))) throw new Error('RUNNER_ENVIRONMENT_CONTRACT_INVALID');",
    "  phase('ENVIRONMENT_CONTRACT_VALID'); resultPath = process.env.FARMOS_A5_CLIENT_RESULT_PATH ?? null; if (resultPath !== '/result/client-result.json') throw new Error('RUNNER_RESULT_PATH_INVALID'); phase('RESULT_PATH_VALID'); phase('DATABASE_CONNECTION_START');",
    "  pendingResult = await runDay147A5ClientSuite({ executionNonce, databaseHost: required('PGHOST'), databasePort: Number(required('PGPORT')), databaseUser: required('PGUSER'), databasePassword: required('PGPASSWORD'), databaseName: required('PGDATABASE'), migrationSql, bundleIntegrity: { expectedSha256: expectedBundleSha256, observedSha256: observedBundleSha256 }, onDatabaseConnectionReady: () => phase('DATABASE_CONNECTION_READY'), onExecutionPhase: (value) => { if (value === 'CASE_SUITE_START' && (migrationFailure !== null || preMigrationFailure !== null)) throw new Error('RUNNER_FAILURE_CODE_PHASE_MISMATCH'); phase(value); }, onPreMigrationFailure: (failure) => { if (preMigrationFailure !== null || migrationFailure !== null || caseFailure !== null) throw new Error('RUNNER_FAILURE_CODE_PHASE_MISMATCH'); preMigrationFailure = classifyDay147A5PreMigrationFailure({ lastPhase: failure.last_phase, operationKey: failure.operation_key, error: failure.error }); }, onMigrationFailure: (failure) => { if (migrationFailure !== null || preMigrationFailure !== null || caseFailure !== null || phaseIndex(lastCompletedPhase) >= phaseIndex('CASE_SUITE_START')) throw new Error('RUNNER_FAILURE_CODE_PHASE_MISMATCH'); migrationFailure = classifyDay147A5MigrationFailure(failure); }, onCaseFailure: (failure) => { if (caseFailure !== null || migrationFailure !== null || preMigrationFailure !== null || lastCompletedPhase !== 'CASE_SUITE_START') throw new Error('RUNNER_FAILURE_CODE_PHASE_MISMATCH'); caseFailure = classifyDay147A5CaseFailure(failure); } });",
    "  emitCompletedResultPhases(pendingResult); const serialized = `${JSON.stringify({ ...pendingResult, last_completed_phase: lastCompletedPhase })}\\n`; phase('RESULT_SERIALIZATION_PASS'); await writeFile(resultPath, serialized, { flag: 'wx', mode: 0o600 }); phase('RESULT_WRITE_PASS');",
    "}",
    "if (runtimeArguments.length !== 0 && !moduleInitCheck) { process.stderr.write('FARMOS_DAY147_A5_MODULE_INIT_ARGUMENT_INVALID\\n'); process.exitCode = 1; } else if (moduleInitCheck) { process.stderr.write('FARMOS_DAY147_A5_MODULE_INIT_OK\\n'); } else { void main().catch(async (error) => { const failureCode = failureFor(error); console.error(`FARMOS_DAY147_A5_FAILURE=${failureCode}`); if (failureCodePhaseMismatch) console.error('FARMOS_DAY147_A5_DIAGNOSTIC=RUNNER_FAILURE_CODE_PHASE_MISMATCH'); if (failureCode === 'RUNNER_DATABASE_CONNECTION_FAILED') console.error(`FARMOS_DAY147_A5_DB_FAILURE_CLASS=${dbFailureClassFor(error)}`); if (preMigrationFailure !== null) { console.error(`FARMOS_DAY147_A5_PRE_MIGRATION_OPERATION=${preMigrationFailure.operationKey}`); console.error(`FARMOS_DAY147_A5_PRE_MIGRATION_FAILURE_CLASS=${preMigrationFailure.failureClass}`); console.error(`FARMOS_DAY147_A5_PRE_MIGRATION_SQLSTATE=${preMigrationFailure.sqlstate}`); } if (migrationFailure !== null) { console.error(`FARMOS_DAY147_A5_MIGRATION_STAGE=${migrationFailure.stage}`); console.error(`FARMOS_DAY147_A5_MIGRATION_FAILURE_CLASS=${migrationFailure.failureClass}`); console.error(`FARMOS_DAY147_A5_MIGRATION_SQLSTATE=${migrationFailure.sqlstate}`); } if (caseFailure !== null) { console.error(`FARMOS_DAY147_A5_CASE_FAILURE_OPERATION=${caseFailure.operation}`); console.error(`FARMOS_DAY147_A5_CASE_INTEGRATION_KEY=${caseFailure.integrationKey}`); console.error(`FARMOS_DAY147_A5_CASE_COMPLETED_COUNT=${caseFailure.completedCaseCount}`); console.error(`FARMOS_DAY147_A5_INITIAL_CANDIDATE_COMPLETED=${caseFailure.initialCandidateCompleted ? 'TRUE' : 'FALSE'}`); console.error(`FARMOS_DAY147_A5_CASE_FAILURE_CLASS=${caseFailure.failureClass}`); console.error(`FARMOS_DAY147_A5_CASE_ID=${caseFailure.caseId}`); console.error(`FARMOS_DAY147_A5_CASE_ASSERTION_ID=${caseFailure.assertionId}`); console.error(`FARMOS_DAY147_A5_CASE_EXPECTED_CLASS=${caseFailure.expectedClass}`); console.error(`FARMOS_DAY147_A5_CASE_ACTUAL_CLASS=${caseFailure.actualClass}`); console.error(`FARMOS_DAY147_A5_CASE_SQLSTATE=${caseFailure.sqlstate}`); } console.error(`FARMOS_DAY147_A5_LAST_PHASE=${lastCompletedPhase}`); if (resultPath === '/result/client-result.json' && /^[a-f0-9]{12}$/.test(executionNonce)) { try { const failureResult = pendingResult === null ? createDay147A5RunnerFailureResult({ executionNonce, expectedBundleSha256, observedBundleSha256, failureCode, lastCompletedPhase }) : { ...pendingResult, result: 'FAIL', failure_code: failureCode, last_completed_phase: lastCompletedPhase }; await writeFile(resultPath, `${JSON.stringify(failureResult)}\\n`, { flag: 'wx', mode: 0o600 }); } catch {} } process.exitCode = 1; }); }",
  ].join("\n");
}

function resolveHostEsbuild(): string {
  const repositoryRequire = createRequire(import.meta.url);
  const requireFromTsx = createRequire(
    repositoryRequire.resolve("tsx/package.json"),
  );
  const binary = requireFromTsx.resolve("esbuild/bin/esbuild");
  const metadata = lstatSync(binary);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("BLOCKED_MINIMAL_V2_BUNDLE");
  }
  return binary;
}

function esbuildCommand(input: Readonly<{
  binary: string;
  names: MinimalNames;
}>): readonly string[] {
  return Object.freeze([
    input.binary,
    input.names.entry,
    "--bundle",
    "--platform=node",
    "--format=cjs",
    "--target=node24",
    `--banner:js=process.stderr.write(${JSON.stringify(
      `${MODULE_INITIALIZATION_STARTED_MARKER}\n`,
    )});`,
    "--define:import.meta.dirname=\"/workspace/scripts/hermes\"",
    "--define:process.env.FARMOS_A5_MINIMAL_CLIENT_BUNDLE=\"1\"",
    `--outfile=${input.names.bundle}`,
    `--metafile=${input.names.metafile}`,
  ]);
}

function validateBundleInputs(metafile: unknown, entryPath: string): readonly string[] {
  if (typeof metafile !== "object" || metafile === null ||
    !("inputs" in metafile) || typeof metafile.inputs !== "object" ||
    metafile.inputs === null) throw new MinimalBundleError("metafile shape invalid");
  const inputs = Object.keys(metafile.inputs as Record<string, unknown>);
  const repositoryInputs: string[] = [];
  for (const input of inputs) {
    const absolute = resolve(ROOT, input);
    if (absolute === entryPath) continue;
    if (absolute.startsWith(`${ROOT}/`)) {
      const path = relative(ROOT, absolute);
      if (path.startsWith("node_modules/")) continue;
      if (!REPOSITORY_BUNDLE_SOURCE_ALLOWLIST.has(path) ||
        path.startsWith("reports/") || path.includes("evidence.json")) {
        throw new MinimalBundleError(`repository source not allowlisted:${path}`);
      }
      repositoryInputs.push(path);
    }
  }
  return Object.freeze(repositoryInputs.sort());
}

function createClientBundle(input: Readonly<{
  runner: CommandRunner;
  names: MinimalNames;
  migrationSql: Day147A5ClientSuiteInput["migrationSql"];
}>): BundleObservation {
  mkdirSync(input.names.temporaryRoot, { recursive: false, mode: 0o700 });
  if (realpathSync(input.names.temporaryRoot) !== input.names.temporaryRoot) {
    throw new MinimalBundleError("bundle file provenance invalid");
  }
  writeFileSync(input.names.entry, clientEntrySource(input), {
    flag: "wx", mode: 0o600,
  });
  const binary = resolveHostEsbuild();
  const command = esbuildCommand({ binary, names: input.names });
  const build = input.runner.run(command[0]!, command.slice(1),
    { allowFailure: true });
  if (build.status !== 0) throw new MinimalBundleError(
    bounded(`${build.stdout}\n${build.stderr}`));
  chmodSync(input.names.bundle, 0o444);
  const metadata = lstatSync(input.names.bundle);
  if (!metadata.isFile() || metadata.isSymbolicLink() ||
    realpathSync(input.names.bundle) !== input.names.bundle ||
    dirname(input.names.bundle) !== input.names.temporaryRoot ||
    realpathSync(dirname(input.names.bundle)) !== input.names.temporaryRoot ||
    (metadata.mode & 0o777) !== 0o444) {
    throw new MinimalBundleError("forbidden legacy launcher token in bundle");
  }
  const bundleBytes = readFileSync(input.names.bundle);
  const bundleText = bundleBytes.toString("utf8");
  if (/(?:execute-network-isolated|execute-network-runner-(?:build|create|launcher)-only|corepack\s+enable|docker\.sock|NETWORK_RUNNER_PNPM_VERSION)/i
    .test(bundleText)) {
    const match = bundleText.match(
      /(?:execute-network-isolated|execute-network-runner-(?:build|create|launcher)-only|corepack\s+enable|docker\.sock|NETWORK_RUNNER_PNPM_VERSION)/i,
    );
    throw new MinimalBundleError(`forbidden bundle token:${match?.[0] ?? "unknown"}`);
  }
  const metafile = JSON.parse(readFileSync(input.names.metafile, "utf8"));
  const repositoryInputs = validateBundleInputs(metafile, input.names.entry);
  rmSync(input.names.metafile);
  return Object.freeze({
    entryPath: input.names.entry,
    bundlePath: input.names.bundle,
    resultPath: input.names.result,
    sha256: sha256(bundleBytes),
    size: metadata.size,
    mode: metadata.mode & 0o777,
    command,
    repositoryInputs,
  });
}

function validateResultPathContract(names: MinimalNames): void {
  if (names.resultDirectory !== `${names.temporaryRoot}/result` ||
    names.result !== `${names.resultDirectory}/client-result.json` ||
    dirname(names.resultDirectory) !== names.temporaryRoot ||
    dirname(names.result) !== names.resultDirectory ||
    basename(names.result) !== "client-result.json" ||
    relative(names.resultDirectory, names.result) !== "client-result.json") {
    throw new Error("DAY147_A5_MINIMAL_RESULT_PATH_CONTRACT_INVALID");
  }
}

function pathExistsNoFollow(path: string): boolean {
  try { lstatSync(path); return true; } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

function createResultDirectory(names: MinimalNames): void {
  try {
    validateResultPathContract(names);
    const root = lstatSync(names.temporaryRoot);
    if (!root.isDirectory() || root.isSymbolicLink() ||
      realpathSync(names.temporaryRoot) !== names.temporaryRoot ||
      pathExistsNoFollow(names.resultDirectory)) {
      throw new Error("DAY147_A5_MINIMAL_RESULT_DIRECTORY_CREATE_FAILED");
    }
    mkdirSync(names.resultDirectory, { recursive: false, mode: 0o700 });
    const directory = lstatSync(names.resultDirectory);
    const currentUid = typeof process.getuid === "function"
      ? process.getuid() : directory.uid;
    if (!directory.isDirectory() || directory.isSymbolicLink() ||
      realpathSync(names.resultDirectory) !== names.resultDirectory ||
      (directory.mode & 0o777) !== 0o700 || directory.uid !== currentUid ||
      readdirSync(names.resultDirectory).length !== 0) {
      throw new Error("DAY147_A5_MINIMAL_RESULT_DIRECTORY_CREATE_FAILED");
    }
    assertResultFileAbsent(names);
  } catch (error) {
    if (error instanceof Error &&
      /^DAY147_A5_MINIMAL_RESULT_[A-Z0-9_]+$/.test(error.message)) throw error;
    throw new Error("DAY147_A5_MINIMAL_RESULT_DIRECTORY_CREATE_FAILED");
  }
}

function assertResultFileAbsent(names: MinimalNames): void {
  validateResultPathContract(names);
  if (pathExistsNoFollow(names.result)) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_PREEXISTING");
  }
}

function validateHostBundleSyntax(input: Readonly<{
  runner: CommandRunner;
  bundle: BundleObservation;
}>): void {
  if (Number(process.versions.node.split(".")[0]) !== 24 ||
    !/^[a-f0-9]{64}$/.test(input.bundle.sha256) ||
    sha256(readFileSync(input.bundle.bundlePath)) !== input.bundle.sha256) {
    throw new Error("DAY147_A5_MINIMAL_BUNDLE_SYNTAX_INVALID");
  }
  const checked = input.runner.run("node", ["--check", input.bundle.bundlePath],
    { allowFailure: true });
  if (checked.status !== 0) {
    const diagnostic = boundedRunnerLog(`${checked.stdout}\n${checked.stderr}`);
    if (diagnostic.length > 0) console.error(JSON.stringify({
      day147_a5_minimal_bundle_syntax: "INVALID", diagnostic,
    }));
    throw new Error("DAY147_A5_MINIMAL_BUNDLE_SYNTAX_INVALID");
  }
}

function validateHostBundleModuleInitialization(input: Readonly<{
  runner: CommandRunner;
  bundle: BundleObservation;
}>): void {
  const checked = input.runner.run("node",
    [input.bundle.bundlePath, "--module-init-check"],
    { allowFailure: true, environment: {} });
  const markers = checked.stderr.trim().split(/\r?\n/u);
  if (checked.status !== 0 || checked.stdout !== "" ||
    JSON.stringify(markers) !== JSON.stringify([
      MODULE_INITIALIZATION_STARTED_MARKER,
      MODULE_INITIALIZATION_OK_MARKER,
    ]) || /Dynamic require of .* is not supported/u.test(checked.stderr)) {
    const diagnostic = boundedRunnerLog(`${checked.stdout}\n${checked.stderr}`);
    if (diagnostic.length > 0) console.error(JSON.stringify({
      day147_a5_minimal_bundle_module_init: "INVALID", diagnostic,
    }));
    throw new Error("DAY147_A5_MINIMAL_BUNDLE_MODULE_INIT_FAILED");
  }
}

function verifyBundleBeforeMount(
  bundle: BundleObservation,
  names: MinimalNames,
): void {
  try {
    const metadata = lstatSync(bundle.bundlePath);
    if (bundle.bundlePath !== names.bundle ||
      !metadata.isFile() || metadata.isSymbolicLink() ||
      realpathSync(bundle.bundlePath) !== bundle.bundlePath ||
      dirname(bundle.bundlePath) !== names.temporaryRoot ||
      metadata.size !== bundle.size || (metadata.mode & 0o777) !== bundle.mode ||
      sha256(readFileSync(bundle.bundlePath)) !== bundle.sha256) {
      throw new Error("DAY147_A5_MINIMAL_BUNDLE_HASH_CHANGED_BEFORE_MOUNT");
    }
  } catch (error) {
    if (error instanceof Error &&
      error.message === "DAY147_A5_MINIMAL_BUNDLE_HASH_CHANGED_BEFORE_MOUNT") {
      throw error;
    }
    throw new Error("DAY147_A5_MINIMAL_BUNDLE_HASH_CHANGED_BEFORE_MOUNT");
  }
}

function networkCreateArgs(names: MinimalNames, nonce: string): readonly string[] {
  return Object.freeze([
    "network", "create", "--driver=bridge", "--scope=local",
    `--label=farmos.day147a5.execution_nonce=${nonce}`,
    "--label=farmos.day147a5.resource_role=minimal_network",
    names.network,
  ]);
}

function postgresCreateArgs(input: Readonly<{
  names: MinimalNames;
  nonce: string;
}>): readonly string[] {
  return Object.freeze([
    "container", "run", "--detach", "--pull=never",
    `--name=${input.names.postgres}`,
    `--network=${input.names.network}`,
    "--network-alias=postgres",
    `--label=farmos.day147a5.execution_nonce=${input.nonce}`,
    "--label=farmos.day147a5.resource_role=minimal_postgres",
    "--tmpfs=/var/lib/postgresql/data:rw,noexec,nosuid,size=536870912",
    "--env=POSTGRES_DB", "--env=POSTGRES_USER", "--env=POSTGRES_PASSWORD",
    POSTGRES_IMAGE,
  ]);
}

function runnerCreateArgs(input: Readonly<{
  names: MinimalNames;
  nonce: string;
}>): readonly string[] {
  return Object.freeze([
    "container", "create",
    `--name=${input.names.runner}`,
    `--network=${input.names.network}`,
    "--user=node",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--read-only",
    "--tmpfs=/tmp:rw,noexec,nosuid,size=16777216",
    `--mount=type=bind,src=${input.names.bundle},dst=/workspace/client.cjs,readonly`,
    `--mount=type=bind,src=${input.names.resultDirectory},dst=/result`,
    `--label=farmos.day147a5.execution_nonce=${input.nonce}`,
    "--label=farmos.day147a5.resource_role=minimal_runner",
    ...EXACT_ENVIRONMENT_KEYS.map((key) => `--env=${key}`),
    NODE_IMAGE,
    "node", "/workspace/client.cjs",
  ]);
}

function exactContainerId(value: string, failureCode: string): string {
  const id = value.trim();
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error(failureCode);
  return id;
}

function exactNetworkId(value: string): string {
  return exactContainerId(value, "DAY147_A5_MINIMAL_NETWORK_ID_INVALID");
}

function inspectLabels(value: Record<string, unknown>): Record<string, unknown> {
  const config = value.Config;
  if (typeof config !== "object" || config === null) return {};
  const labels = (config as Record<string, unknown>).Labels;
  return typeof labels === "object" && labels !== null
    ? labels as Record<string, unknown> : {};
}

function validateContainerBinding(input: Readonly<{
  observation: Record<string, unknown>;
  receipt: Receipt;
  expectedRole: "minimal_runner" | "minimal_postgres";
}>): void {
  const labels = inspectLabels(input.observation);
  if (input.observation.Id !== input.receipt.canonicalId ||
    input.observation.Name !== `/${input.receipt.expectedName}` ||
    labels["farmos.day147a5.execution_nonce"] !== input.receipt.nonce ||
    labels["farmos.day147a5.resource_role"] !== input.expectedRole) {
    throw new Error("DAY147_A5_MINIMAL_RESOURCE_BINDING_INVALID");
  }
}

function validateRunnerSecurityObservation(input: Readonly<{
  observation: Record<string, unknown>;
  receipt: Receipt;
  names: MinimalNames;
}>): boolean {
  validateContainerBinding({ observation: input.observation,
    receipt: input.receipt, expectedRole: "minimal_runner" });
  const hostConfig = input.observation.HostConfig as Record<string, unknown> | undefined;
  const config = input.observation.Config as Record<string, unknown> | undefined;
  const mounts = Array.isArray(input.observation.Mounts)
    ? input.observation.Mounts as Record<string, unknown>[] : [];
  const network = (input.observation.NetworkSettings as Record<string, unknown> | undefined)
    ?.Networks as Record<string, unknown> | undefined;
  const capDrop = hostConfig?.CapDrop;
  const securityOpt = hostConfig?.SecurityOpt;
  const tmpfs = hostConfig?.Tmpfs as Record<string, unknown> | undefined;
  const command = config?.Cmd;
  const environment = config?.Env;
  return hostConfig?.Privileged === false && hostConfig?.ReadonlyRootfs === true &&
    hostConfig?.NetworkMode === input.names.network &&
    JSON.stringify(capDrop) === JSON.stringify(["ALL"]) &&
    Array.isArray(securityOpt) && securityOpt.includes("no-new-privileges") &&
    typeof tmpfs === "object" && tmpfs !== null && "/tmp" in tmpfs &&
    config?.User === "node" &&
    JSON.stringify(command) === JSON.stringify(["node", "/workspace/client.cjs"]) &&
    Array.isArray(environment) && EXACT_ENVIRONMENT_KEYS.every((key) =>
      environment.some((item) => String(item).startsWith(`${key}=`))
    ) && mounts.length === 2 && mounts.some((mount) => mount.Type === "bind" &&
      mount.Source === input.names.bundle &&
      mount.Destination === "/workspace/client.cjs" && mount.RW === false) &&
    mounts.some((mount) => mount.Type === "bind" &&
      mount.Source === input.names.resultDirectory &&
      mount.Destination === "/result" && mount.RW === true) &&
    !mounts.some((mount) => mount.Source === ROOT ||
      String(mount.Source ?? "").includes("docker.sock") ||
      String(mount.Destination ?? "").includes("docker.sock") ||
      String(mount.Source ?? "").includes("node_modules")) &&
    typeof network === "object" && network !== null &&
    Object.keys(network).length === 1 && input.names.network in network &&
    JSON.stringify(hostConfig?.PortBindings ?? {}) === "{}";
}

function runnerExitState(
  observation: Record<string, unknown>,
): Readonly<{ exitCode: number; stateError: string; oomKilled: boolean }> {
  const state = observation.State;
  if (typeof state !== "object" || state === null) {
    throw new Error("DAY147_A5_MINIMAL_RUNNER_INSPECT_UNEXPECTED_SHAPE");
  }
  const record = state as Record<string, unknown>;
  if (!Number.isSafeInteger(record.ExitCode) ||
    typeof record.Error !== "string" || typeof record.OOMKilled !== "boolean") {
    throw new Error("DAY147_A5_MINIMAL_RUNNER_INSPECT_UNEXPECTED_SHAPE");
  }
  return Object.freeze({ exitCode: Number(record.ExitCode),
    stateError: record.Error, oomKilled: record.OOMKilled });
}

function validateNetworkObservation(input: Readonly<{
  observation: Record<string, unknown>;
  receipt: Receipt;
}>): void {
  const labels = (input.observation.Labels ?? {}) as Record<string, unknown>;
  const containers = input.observation.Containers;
  if (input.observation.Id !== input.receipt.canonicalId ||
    input.observation.Name !== input.receipt.expectedName ||
    input.observation.Driver !== "bridge" || input.observation.Scope !== "local" ||
    labels["farmos.day147a5.execution_nonce"] !== input.receipt.nonce ||
    labels["farmos.day147a5.resource_role"] !== "minimal_network" ||
    typeof containers !== "object" || containers === null) {
    throw new Error("DAY147_A5_MINIMAL_NETWORK_BINDING_INVALID");
  }
}

function validateHostResultProof(
  result: Day147A5ClientResult,
  expectedBundleSha256: string,
): boolean {
  const expectedIds = DAY147_A5_CLIENT_CASE_REGISTRY.map(({ id }) => id);
  const cases = result.case_registry.cases;
  const actualIds = cases.map(({ case_id }) => case_id);
  const failedCount = cases.filter(({ status }) => status === "FAIL").length;
  const actualDigest = createHash("sha256")
    .update("farmos-day147a5-case-registry-v1\0")
    .update(JSON.stringify(actualIds)).digest("hex");
  const invariants = result.state_invariants;
  const cleanup = result.client_cleanup;
  return result.result === "PASS" &&
    result.migration_results.day146 === "PASS" &&
    result.migration_results.prepare_apply === "PASS" &&
    result.migration_results.prepare_verify === "PASS" &&
    result.migration_results.activate_apply === "PASS" &&
    result.migration_results.activate_verify === "PASS" &&
    result.case_registry.executed_count === 102 &&
    result.case_registry.exact_case_set === true && cases.length === 102 &&
    expectedIds.length === 102 &&
    JSON.stringify(actualIds) === JSON.stringify(expectedIds) &&
    new Set(actualIds).size === 102 &&
    cases.every(({ status }) => status === "PASS") &&
    failedCount === result.case_registry.failed_count && failedCount === 0 &&
    actualDigest === DAY147_A5_EXPECTED_REGISTRY_DIGEST &&
    result.case_registry.actual_digest === actualDigest &&
    result.case_registry.expected_digest === DAY147_A5_EXPECTED_REGISTRY_DIGEST &&
    result.bundle_integrity.expected_sha256 === expectedBundleSha256 &&
    result.bundle_integrity.observed_sha256 === expectedBundleSha256 &&
    result.bundle_integrity.matched === true &&
    invariants.comparison_complete === true &&
    invariants.automatic_promotion_count === 0 &&
    invariants.active_state_unchanged === true &&
    /^[a-f0-9]{64}$/.test(String(invariants.baseline_digest)) &&
    /^[a-f0-9]{64}$/.test(String(invariants.final_digest)) &&
    invariants.baseline_digest === invariants.final_digest &&
    cleanup.clients_created > 0 &&
    cleanup.clients_created === cleanup.close_attempted &&
    cleanup.clients_created === cleanup.close_completed &&
    cleanup.close_failed === 0 && cleanup.open_clients_after_cleanup === 0;
}

function validateResultFile(names: MinimalNames, nonce: string,
  expectedBundleSha256: string): Readonly<{
    result: Day147A5ClientResult;
    transport: ResultTransportObservation;
  }> {
  validateResultPathContract(names);
  let metadata: ReturnType<typeof lstatSync>;
  try { metadata = lstatSync(names.result); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_NOT_CREATED");
    }
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_READ_FAILED");
  }
  if (!metadata.isFile() || metadata.isSymbolicLink() ||
    realpathSync(names.result) !== names.result) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_NOT_REGULAR");
  }
  if ((metadata.mode & 0o777) !== 0o600) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_PERMISSION_INVALID");
  }
  if (metadata.nlink !== 1) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_LINK_COUNT_INVALID");
  }
  if (metadata.size < 1 || metadata.size > MAX_RESULT_BYTES) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_TOO_LARGE");
  }
  let bytes: Buffer;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(names.result, "r");
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.dev !== metadata.dev ||
      opened.ino !== metadata.ino || opened.nlink !== 1 ||
      (opened.mode & 0o777) !== 0o600 || opened.size !== metadata.size) {
      throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_NOT_REGULAR");
    }
    bytes = readFileSync(descriptor);
  } catch (error) {
    if (error instanceof Error &&
      /^DAY147_A5_MINIMAL_RESULT_[A-Z0-9_]+$/.test(error.message)) throw error;
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_READ_FAILED");
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
  let resultSha256: string;
  try { resultSha256 = sha256(bytes); } catch {
    throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_HASH_FAILED");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(bytes.toString("utf8")); } catch {
    throw new Error("DAY147_A5_MINIMAL_RESULT_JSON_INVALID");
  }
  if (!validateDay147A5ClientResult(parsed, nonce)) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_CONTRACT_INVALID");
  }
  if (parsed.result === "PASS" &&
    !validateHostResultProof(parsed, expectedBundleSha256)) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_CONTRACT_INVALID");
  }
  return Object.freeze({ result: parsed, transport: Object.freeze({
    result_file_observed: true,
    path_contract: "HOST_NONCE_RESULT_BIND",
    regular_file: true,
    mode: "0600",
    link_count: 1,
    size: bytes.byteLength,
    sha256: resultSha256,
    result_validator: "ACCEPTED",
  }) });
}

function parseTransitionSemanticObservation(
  stderr: string,
  result: Day147A5ClientResult,
): TransitionSemanticObservation {
  const parsedMarkers = (prefix: string): unknown[] => stderr
    .split(/\r?\n/u).flatMap((line) => {
      if (!line.startsWith(prefix)) return [];
      try { return [JSON.parse(line.slice(prefix.length))]; }
      catch { throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID"); }
    });
  const transitionValues = parsedMarkers(
    "FARMOS_DAY147_A5_TRANSITION_PROVENANCE=",
  );
  const summaryValues = parsedMarkers(
    "FARMOS_DAY147_A5_TRANSITION_PROVENANCE_SUMMARY=",
  );
  if (transitionValues.length !== 5 || summaryValues.length !== 1 ||
    typeof summaryValues[0] !== "object" || summaryValues[0] === null ||
    Array.isArray(summaryValues[0])) {
    throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
  }
  const summary = summaryValues[0] as Record<string, unknown>;
  const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) => {
    const actual = Object.keys(value).sort();
    const expected = [...keys].sort();
    return actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]);
  };
  if (!exactKeys(summary, ["raw_transition_count",
    "explicit_authorized_count", "unauthorized_count", "cleanup_leak_count",
    "unknown_count", "baseline_active_mutation_count", "baseline_active_count",
    "final_active_count"]) || summary.raw_transition_count !== 5 ||
    summary.explicit_authorized_count !== 5 || summary.unauthorized_count !== 0 ||
    summary.cleanup_leak_count !== 0 || summary.unknown_count !== 0 ||
    summary.baseline_active_mutation_count !== 0 ||
    !Number.isSafeInteger(summary.baseline_active_count) ||
    Number(summary.baseline_active_count) < 0 ||
    !Number.isSafeInteger(summary.final_active_count) ||
    Number(summary.final_active_count) < Number(summary.baseline_active_count) ||
    result.state_invariants.comparison_complete !== true) {
    throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
  }
  const transitions = transitionValues.map((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
    }
    const marker = value as Record<string, unknown>;
    if (!exactKeys(marker, ["database", "transition_identity_digest",
      "prior_status", "final_status", "event_sequence_class",
      "matching_case_id", "explicit_activation_action_present",
      "test_fixture_owned", "baseline_entity", "classification"]) ||
      marker.database !== "main" || typeof marker.matching_case_id !== "string" ||
      marker.classification !== "EXPLICIT_AUTHORIZED_TEST_TRANSITION" ||
      typeof marker.transition_identity_digest !== "string" ||
      !/^[a-f0-9]{16}$/.test(marker.transition_identity_digest)) {
      throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
    }
    return Object.freeze({ case_id: marker.matching_case_id,
      database: "main" as const,
      classification: "EXPLICIT_AUTHORIZED_TEST_TRANSITION" as const,
      opaque_reference: marker.transition_identity_digest });
  });
  const caseIds = transitions.map(({ case_id }) => case_id);
  if (JSON.stringify([...caseIds].sort()) !==
      JSON.stringify([...REQUIRED_TRANSITION_CASE_IDS].sort()) ||
    new Set(transitions.map(({ opaque_reference }) => opaque_reference)).size !== 5 ||
    !caseIds.every((caseId) => result.case_registry.cases.some(
      (entry) => entry.case_id === caseId && entry.status === "PASS",
    ))) {
    throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
  }
  return Object.freeze({ raw_transition_count: 5,
    explicit_authorized_count: 5, unauthorized_count: 0,
    cleanup_leak_count: 0, unknown_count: 0, baseline_active_mutation_count: 0,
    comparison_complete: true,
    baseline_active_count: Number(summary.baseline_active_count),
    final_active_count: Number(summary.final_active_count),
    transitions: Object.freeze(transitions) });
}

function cleanupStatus(value: CleanupResultCode):
  "PASS_REMOVED" | "PASS_ALREADY_ABSENT" {
  if (value !== "PASS_REMOVED" && value !== "PASS_ALREADY_ABSENT") {
    throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
  }
  return value;
}

function cleanupPathStatus(value: PathCleanupReport):
  "PASS_REMOVED" | "PASS_ALREADY_ABSENT" {
  if (!value.attempted || !value.absent) {
    throw new Error("DAY147_A5_MINIMAL_SEMANTIC_EVIDENCE_INVALID");
  }
  return cleanupStatus(value.result);
}

function successEvidence(input: Readonly<{
  nonce: string;
  result: Day147A5ClientResult;
  postgresImageId: string;
  readinessElapsedMs: number;
  transitionProvenance: TransitionSemanticObservation;
  resultTransport: ResultTransportObservation;
  cleanup: CleanupResult;
}>): FarmOsDay147A5SemanticSuccessEvidence {
  const categories = new Map(DAY147_A5_CLIENT_CASE_REGISTRY.map((testCase) =>
    [testCase.id, testCase.category] as const
  ));
  return Object.freeze({
    schema_version: FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION,
    execution_nonce: input.nonce,
    day: "147-A",
    process: "A5",
    result: "PASS",
    phase_reached: "COMPLETE",
    execution_phase: "COMPLETE",
    evidence_phase: "FINALIZED",
    evidence_status: "VALID",
    durability_complete: true,
    success_claimed: true,
    receipt_required: true,
    receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    artifact: { artifact_written: true, artifact_valid: true },
    readiness: {
      status: "READY", attempts: 1, elapsed_ms: input.readinessElapsedMs,
      first_failure_class: null, last_failure_class: null,
      retryable_failure_count: 0, non_retryable_failure_count: 0,
      timeout_reached: false, container_exit_detected: false,
      container_state: "RUNNING", container_exit_code: 0,
      container_restarting: false, container_oom_killed: false,
      startup_elapsed_ms: input.readinessElapsedMs,
      readiness_attempts_before_exit: 0, failure_origin: null,
    },
    checksums: DAY147_A5_MIGRATION_CHECKSUMS,
    postgres_version: input.result.postgres_version,
    image: POSTGRES_IMAGE,
    image_digest: input.postgresImageId,
    connection_metadata: {
      topology: "DOCKER_USER_DEFINED_NETWORK", transport: "TCP",
      host: null, mapped_port: null, container_port: 5432,
      network_alias: "postgres", network_nonce_bound: true,
      local_only_validated: true, remote_endpoint_rejected: true,
    },
    role_matrix: DAY147_A5_ROLE_FIXTURES,
    transition_matrix_summary: { states: 5, ordered_pairs: 25,
      allowed: 4, forbidden: 21 },
    test_results: input.result.case_registry.cases.map((testCase) => ({
      id: testCase.case_id,
      category: categories.get(testCase.case_id)!,
      status: testCase.status,
    })),
    concurrency_timeline: input.result.concurrency_timeline as
      FarmOsDay147A5Evidence["concurrency_timeline"],
    row_counts: input.result.row_counts,
    failure_codes: { primary: null, cleanup: null, evidence_writer: null },
    cleanup: { phase: "CLEANUP_COMPLETED", attempted: true, completed: true,
      post_cleanup_verified: true, container_absent: true, clients_closed: true,
      mapped_port_closed: true, persistent_volume_absent: true,
      failure_code: null },
    safety: { local_only_gate_passed: true, docker_daemon_local: true,
      remote_endpoint_rejected: true, secrets_absent: true,
      production_operations: 0, docker_commands_expected: "isolated_only",
      database_connections_expected: "isolated_only" },
    migrations: Object.freeze({
      day146: "PASS", prepare_apply: "PASS", prepare_verify: "PASS",
      activate_apply: "PASS", activate_verify: "PASS",
    }),
    case_registry: Object.freeze({ expected_count: 102,
      executed_count: 102, failed_count: 0,
      unique_count: new Set(input.result.case_registry.cases.map(
        ({ case_id }) => case_id,
      )).size as 102,
      exact_case_set: true,
      expected_digest: input.result.case_registry.expected_digest,
      actual_digest: input.result.case_registry.actual_digest!,
      digest_match: true }),
    transition_provenance: Object.freeze({
      raw_transition_count: input.transitionProvenance.raw_transition_count,
      explicit_authorized_count:
        input.transitionProvenance.explicit_authorized_count,
      unauthorized_count: input.transitionProvenance.unauthorized_count,
      cleanup_leak_count: input.transitionProvenance.cleanup_leak_count,
      unknown_count: input.transitionProvenance.unknown_count,
      baseline_active_mutation_count:
        input.transitionProvenance.baseline_active_mutation_count,
      comparison_complete: input.transitionProvenance.comparison_complete,
      transitions: input.transitionProvenance.transitions,
    }),
    state_invariants: Object.freeze({ comparison_complete: true,
      automatic_promotion_count: 0, active_state_unchanged: true,
      baseline_active_mutation_count: 0,
      baseline_active_count: input.transitionProvenance.baseline_active_count,
      final_active_count: input.transitionProvenance.final_active_count,
      baseline_digest: input.result.state_invariants.baseline_digest!,
      final_digest: input.result.state_invariants.final_digest! }),
    result_transport: Object.freeze({ contract: "HOST_NONCE_RESULT_BIND",
      file_observed: input.resultTransport.result_file_observed,
      regular_file: input.resultTransport.regular_file,
      mode: input.resultTransport.mode,
      link_count: input.resultTransport.link_count,
      size: input.resultTransport.size,
      sha256: input.resultTransport.sha256,
      validator: input.resultTransport.result_validator }),
    client_cleanup: Object.freeze({ ...input.result.client_cleanup,
      close_failed: 0 as const, open_clients_after_cleanup: 0 as const,
      result: "PASS" as const }),
    resource_cleanup: Object.freeze({
      runner: cleanupStatus(input.cleanup.resources.runner.cleanup_result),
      postgres: cleanupStatus(input.cleanup.resources.postgres.cleanup_result),
      network: cleanupStatus(input.cleanup.resources.network.cleanup_result),
      result_file: cleanupPathStatus(input.cleanup.resultFileCleanup),
      result_directory: cleanupPathStatus(input.cleanup.resultDirectoryCleanup),
      temporary_bundle: cleanupPathStatus(input.cleanup.bundleCleanup),
      temporary_root: cleanupPathStatus(input.cleanup.temporaryRootCleanup),
      residual_resources: 0 as const, result: "PASS" as const,
    }),
  } as FarmOsDay147A5SemanticSuccessEvidence);
}

function failureEvidence(input: Readonly<{
  nonce: string;
  primary: string;
  cleanup: CleanupResult;
  providerValidated?: boolean;
}>): FarmOsDay147A5Evidence {
  const cleanupPassed = input.cleanup.overallCleanupPass;
  return Object.freeze({
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
    execution_nonce: input.nonce, day: "147-A", process: "A5",
    result: "BLOCKED",
    phase_reached: cleanupPassed ? "CLEANUP_COMPLETED" : "CLEANUP_FAILED",
    execution_phase: cleanupPassed ? "CLEANUP_COMPLETED" : "CLEANUP_FAILED",
    evidence_phase: "FINALIZED", evidence_status: "VALID",
    durability_complete: true, success_claimed: false, receipt_required: true,
    receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    artifact: { artifact_written: true, artifact_valid: true },
    readiness: { status: "NOT_STARTED", attempts: 0, elapsed_ms: 0,
      first_failure_class: null, last_failure_class: null,
      retryable_failure_count: 0, non_retryable_failure_count: 0,
      timeout_reached: false, container_exit_detected: false,
      container_state: "UNKNOWN", container_exit_code: null,
      container_restarting: false, container_oom_killed: false,
      startup_elapsed_ms: 0, readiness_attempts_before_exit: 0,
      failure_origin: { stage: "PRE_ATTEMPT", origin: "UNKNOWN",
        safe_code_class: "CODE_ABSENT", connection_established: false,
        query_started: false, termination_initiated: false,
        promise_rejection_observed: false, client_error_observed: false,
        stream_error_observed: false, stream_close_observed: false,
        stream_end_observed: false, adapter_validation_failed: false,
        convergence_failed: false, deadline_reached: false },
    },
    checksums: DAY147_A5_MIGRATION_CHECKSUMS,
    postgres_version: null, image: POSTGRES_IMAGE, image_digest: null,
    connection_metadata: null, role_matrix: DAY147_A5_ROLE_FIXTURES,
    transition_matrix_summary: { states: 5, ordered_pairs: 25,
      allowed: 4, forbidden: 21 },
    test_results: [], concurrency_timeline: [],
    row_counts: { snapshots: 0, projections: 0, events: 0, lineage: 0 },
    failure_codes: { primary: input.primary,
      cleanup: cleanupPassed ? null : "DAY147_A5_MINIMAL_CLEANUP_FAILED",
      evidence_writer: null },
    cleanup: { phase: cleanupPassed ? "CLEANUP_COMPLETED" : "CLEANUP_FAILED",
      attempted: input.cleanup.attempted.length > 0,
      completed: cleanupPassed && input.cleanup.attempted.length > 0,
      post_cleanup_verified: cleanupPassed && input.cleanup.attempted.length > 0,
      container_absent: cleanupPassed, clients_closed: true,
      mapped_port_closed: true, persistent_volume_absent: true,
      failure_code: cleanupPassed ? null : "DAY147_A5_MINIMAL_CLEANUP_FAILED" },
    safety: { local_only_gate_passed: input.providerValidated === true,
      docker_daemon_local: input.providerValidated === true,
      remote_endpoint_rejected: input.providerValidated === true,
      secrets_absent: true,
      production_operations: 0, docker_commands_expected: "isolated_only",
      database_connections_expected: "isolated_only" },
  } as FarmOsDay147A5Evidence);
}

function serialize(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`);
}

function buildSuccessChain(evidence: FarmOsDay147A5Evidence |
  FarmOsDay147A5SemanticSuccessEvidence): Readonly<{
  evidenceBytes: Uint8Array;
  receiptBytes: Uint8Array;
  markerBytes: Uint8Array;
}> {
  const evidenceBytes = serialize(evidence);
  if (!validateFinalA5Evidence({ evidenceBytes,
    expectedExecutionNonce: evidence.execution_nonce }).accepted) {
    throw new Error("BLOCKED_MINIMAL_V2_EVIDENCE");
  }
  const receipt: FarmOsDay147A5Receipt = {
    schema_version: FARM_OS_DAY147A5_RECEIPT_SCHEMA_VERSION,
    execution_nonce: evidence.execution_nonce,
    evidence_relative_path: FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH,
    evidence_sha256: sha256FarmOsDay147A5RawBytes(evidenceBytes),
    evidence_schema_version: evidence.schema_version,
    result: "PASS", execution_phase: "COMPLETE",
    receipt_status: "COMMITTED", durability_complete: true,
    success_claimed: true,
  };
  const receiptBytes = serialize(receipt);
  if (!validateA5ReceiptForEvidence({ evidenceBytes, receiptBytes,
    expectedExecutionNonce: evidence.execution_nonce }).accepted) {
    throw new Error("BLOCKED_MINIMAL_V2_EVIDENCE");
  }
  const marker: FarmOsDay147A5CommitMarker = {
    schema_version: FARM_OS_DAY147A5_COMMIT_SCHEMA_VERSION,
    execution_nonce: evidence.execution_nonce,
    receipt_relative_path: FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH,
    receipt_sha256: sha256FarmOsDay147A5RawBytes(receiptBytes),
    status: "COMMITTED",
  };
  const markerBytes = serialize(marker);
  if (!validateA5CommitMarkerForReceipt({ receiptBytes, markerBytes,
    expectedExecutionNonce: evidence.execution_nonce }).accepted ||
    !validateCommittedA5ArtifactChain({ evidenceBytes, receiptBytes, markerBytes,
      expectedExecutionNonce: evidence.execution_nonce }).accepted) {
    throw new Error("BLOCKED_MINIMAL_V2_EVIDENCE");
  }
  return Object.freeze({ evidenceBytes, receiptBytes, markerBytes });
}

function validateFailureChain(evidence: FarmOsDay147A5Evidence): Uint8Array {
  if (!validateFailureA5Evidence({ evidence, receiptPresent: false,
    markerPresent: false }).accepted) {
    throw new Error("BLOCKED_MINIMAL_V2_EVIDENCE");
  }
  const bytes = serialize(evidence);
  if (validateCommittedA5ArtifactChain({ evidenceBytes: bytes,
    receiptBytes: null, markerBytes: null,
    expectedExecutionNonce: evidence.execution_nonce }).accepted) {
    throw new Error("BLOCKED_MINIMAL_V2_EVIDENCE");
  }
  return bytes;
}

type CleanupActions = Readonly<{
  removeResource: (receipt: Receipt) => ResourceCleanupReport;
  removeResult: () => "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
  removeResultDirectory: () => "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
  removeBundle: () => "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
  removeTemporaryRoot: () => "PASS_REMOVED" | "PASS_ALREADY_ABSENT";
}>;

const cleanupPassed = (result: CleanupResultCode): boolean =>
  result === "PASS_REMOVED" || result === "PASS_ALREADY_ABSENT" ||
  result === "NOT_APPLICABLE_NOT_CREATED";

function notCreatedCleanupReport(): ResourceCleanupReport {
  return Object.freeze({ creation_receipt: false, delete_attempted: false,
    absence_classification: "NOT_APPLICABLE",
    cleanup_result: "NOT_APPLICABLE_NOT_CREATED" });
}

function cleanupReportConsistent(report: ResourceCleanupReport): boolean {
  if (report.cleanup_result === "NOT_APPLICABLE_NOT_CREATED") {
    return !report.creation_receipt && !report.delete_attempted &&
      report.absence_classification === "NOT_APPLICABLE";
  }
  if (report.absence_classification === "NOT_FOUND") {
    return report.cleanup_result === "PASS_REMOVED" ||
      report.cleanup_result === "PASS_ALREADY_ABSENT";
  }
  return report.cleanup_result !== "PASS_REMOVED" &&
    report.cleanup_result !== "PASS_ALREADY_ABSENT";
}

function emptyCleanupResult(): CleanupResult {
  const resources = Object.freeze({ runner: notCreatedCleanupReport(),
    postgres: notCreatedCleanupReport(), network: notCreatedCleanupReport() });
  const absent = Object.freeze({ attempted: false, absent: true,
    result: "PASS_ALREADY_ABSENT" as const });
  return Object.freeze({ attempted: [], completed: [], failures: [], resources,
    resultFileCleanup: absent, resultDirectoryCleanup: absent,
    bundleCleanup: absent, temporaryRootCleanup: absent,
    tempResult: "PASS_ALREADY_ABSENT", overallCleanupPass: true });
}

function passingCleanupFixture(): CleanupResult {
  const phases = ["runner", "postgres", "network", "result_file",
    "result_directory", "client_bundle", "temporary_root"];
  const absent = (): ResourceCleanupReport => Object.freeze({
    creation_receipt: true, delete_attempted: false,
    absence_classification: "NOT_FOUND",
    cleanup_result: "PASS_ALREADY_ABSENT" });
  const absentPath = Object.freeze({ attempted: true, absent: true,
    result: "PASS_ALREADY_ABSENT" as const });
  return Object.freeze({ attempted: phases, completed: phases, failures: [],
    resources: Object.freeze({ runner: absent(), postgres: absent(),
      network: absent() }), resultFileCleanup: absentPath,
    resultDirectoryCleanup: absentPath, bundleCleanup: absentPath,
    temporaryRootCleanup: absentPath, tempResult: "PASS_ALREADY_ABSENT",
    overallCleanupPass: true });
}

function cleanupOperatorReport(cleanup: CleanupResult): Readonly<{
  runner: ResourceCleanupReport;
  postgres: ResourceCleanupReport;
  network: ResourceCleanupReport;
  result_file_cleanup: PathCleanupReport;
  result_directory_cleanup: PathCleanupReport;
  bundle_cleanup: PathCleanupReport;
  temporary_root_cleanup: PathCleanupReport;
  temp_result: CleanupResult["tempResult"];
  overall_cleanup_pass: boolean;
}> {
  return Object.freeze({ runner: cleanup.resources.runner,
    postgres: cleanup.resources.postgres, network: cleanup.resources.network,
    result_file_cleanup: cleanup.resultFileCleanup,
    result_directory_cleanup: cleanup.resultDirectoryCleanup,
    bundle_cleanup: cleanup.bundleCleanup,
    temporary_root_cleanup: cleanup.temporaryRootCleanup,
    temp_result: cleanup.tempResult,
    overall_cleanup_pass: cleanup.overallCleanupPass });
}

function cleanupExactResources(input: Readonly<{
  receipts: readonly Receipt[];
  actions: CleanupActions;
}>): CleanupResult {
  const attempted: string[] = [];
  const completed: string[] = [];
  const failures: string[] = [];
  const byResource = new Map(input.receipts.map((receipt) =>
    [receipt.resource, receipt] as const
  ));
  const resources = {} as Record<Receipt["resource"], ResourceCleanupReport>;
  const phases = ["runner", "postgres", "network"] as const;
  for (const phase of phases) {
    attempted.push(phase);
    const receipt = byResource.get(phase);
    if (receipt === undefined) {
      resources[phase] = notCreatedCleanupReport();
      completed.push(phase);
      continue;
    }
    try {
      resources[phase] = input.actions.removeResource(receipt);
    } catch {
      resources[phase] = Object.freeze({ creation_receipt: true,
        delete_attempted: false, absence_classification: "UNKNOWN_FAILURE",
        cleanup_result: "FAILED_ABSENCE_VERIFICATION" });
    }
    if (cleanupReportConsistent(resources[phase]) &&
      cleanupPassed(resources[phase].cleanup_result)) {
      completed.push(phase);
    } else {
      failures.push(`DAY147_A5_MINIMAL_CLEANUP_${phase.toUpperCase()}_FAILED`);
    }
  }
  let tempResult: CleanupResult["tempResult"] = "PASS_ALREADY_ABSENT";
  let resultFileCleanup: PathCleanupReport = Object.freeze({ attempted: false,
    absent: false, result: "FAILED_ABSENCE_VERIFICATION" });
  let resultDirectoryCleanup: PathCleanupReport = Object.freeze({
    attempted: false, absent: false, result: "FAILED_ABSENCE_VERIFICATION" });
  let bundleCleanup: PathCleanupReport = Object.freeze({ attempted: false,
    absent: false, result: "FAILED_ABSENCE_VERIFICATION" });
  let temporaryRootCleanup: PathCleanupReport = Object.freeze({ attempted: false,
    absent: false, result: "FAILED_ABSENCE_VERIFICATION" });
  for (const [phase, action] of [
    ["result_file", input.actions.removeResult],
    ["result_directory", input.actions.removeResultDirectory],
    ["client_bundle", input.actions.removeBundle],
    ["temporary_root", input.actions.removeTemporaryRoot],
  ] as const) {
    attempted.push(phase);
    try {
      const result = action();
      if (result === "PASS_REMOVED") tempResult = "PASS_REMOVED";
      const report = Object.freeze({ attempted: true, absent: true, result });
      if (phase === "result_file") resultFileCleanup = report;
      if (phase === "result_directory") resultDirectoryCleanup = report;
      if (phase === "client_bundle") bundleCleanup = report;
      if (phase === "temporary_root") temporaryRootCleanup = report;
      completed.push(phase);
    } catch {
      tempResult = "FAILED_ABSENCE_VERIFICATION";
      const report = Object.freeze({ attempted: true, absent: false,
        result: "FAILED_ABSENCE_VERIFICATION" as const });
      if (phase === "result_file") resultFileCleanup = report;
      if (phase === "result_directory") resultDirectoryCleanup = report;
      if (phase === "client_bundle") bundleCleanup = report;
      if (phase === "temporary_root") temporaryRootCleanup = report;
      failures.push(phase === "result_directory"
        ? "DAY147_A5_MINIMAL_RESULT_DIRECTORY_CLEANUP_FAILED"
        : `DAY147_A5_MINIMAL_CLEANUP_${phase.toUpperCase()}_FAILED`);
    }
  }
  const overallCleanupPass = phases.every((phase) =>
    cleanupReportConsistent(resources[phase]) &&
    cleanupPassed(resources[phase].cleanup_result)
  ) && resultFileCleanup.absent && resultDirectoryCleanup.absent &&
    bundleCleanup.absent && temporaryRootCleanup.absent &&
    tempResult !== "FAILED_ABSENCE_VERIFICATION";
  return Object.freeze({ attempted: Object.freeze(attempted),
    completed: Object.freeze(completed), failures: Object.freeze(failures),
    resources: Object.freeze(resources), resultFileCleanup,
    resultDirectoryCleanup, bundleCleanup, temporaryRootCleanup,
    tempResult, overallCleanupPass });
}

function sameProviderIdentity(
  initial: Day147A5OrbStackProviderProof | null,
  current: Day147A5OrbStackProviderProof,
): boolean {
  return initial !== null && initial.provider_identity_sha256 ===
    current.provider_identity_sha256 && initial.context === current.context &&
    initial.local_unix_socket_verified === current.local_unix_socket_verified;
}

function productionCleanupActions(input: Readonly<{
  runner: CommandRunner;
  names: MinimalNames;
  nonce: string;
  providerProof: Day147A5OrbStackProviderProof | null;
  providerValidator?: () => Day147A5OrbStackProviderProof;
}>): CleanupActions {
  const providerIdentityMatched = () => {
    try {
      const current = (input.providerValidator ??
        (() => validateProvider(input.runner)))();
      return sameProviderIdentity(input.providerProof, current);
    } catch { return false; }
  };
  const removeExactFile = (path: string) => {
    try {
      const metadata = lstatSync(path);
      if (!metadata.isFile() || metadata.isSymbolicLink() ||
        realpathSync(path) !== path ||
        !path.startsWith(`${input.names.temporaryRoot}/`)) {
        throw new Error("DAY147_A5_MINIMAL_TEMP_BINDING_INVALID");
      }
      rmSync(path);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    }
  };
  return Object.freeze({
    removeResource(receipt) {
      const report = (deleteAttempted: boolean,
        absence: ResourceCleanupReport["absence_classification"],
        result: CleanupResultCode): ResourceCleanupReport => Object.freeze({
        creation_receipt: true, delete_attempted: deleteAttempted,
        absence_classification: absence, cleanup_result: result,
      });
      if (receipt.preExisting !== false || receipt.nonce !== input.nonce ||
        !/^[a-f0-9]{64}$/.test(receipt.canonicalId)) {
        return report(false, "IDENTITY_MISMATCH", "FAILED_PROVENANCE");
      }
      if (!providerIdentityMatched()) {
        return report(false, "UNKNOWN_FAILURE", "FAILED_PROVIDER_IDENTITY");
      }
      const resourceType = receipt.resource === "network" ? "network" : "container";
      const inspectArgs = receipt.resource === "network"
        ? ["network", "inspect", receipt.canonicalId]
        : ["container", "inspect", receipt.canonicalId];
      const before = dockerInspect({ runner: input.runner, args: inspectArgs,
        resource: resourceType, canonicalId: receipt.canonicalId });
      if (before.kind === "NOT_FOUND") {
        return report(false, "NOT_FOUND", "PASS_ALREADY_ABSENT");
      }
      if (before.kind !== "PRESENT") {
        return report(false, before.kind, before.kind === "IDENTITY_MISMATCH"
          ? "FAILED_PROVENANCE" : "FAILED_ABSENCE_VERIFICATION");
      }
      try {
        if (receipt.resource === "network") {
          validateNetworkObservation({ observation:
            before.value as Record<string, unknown>, receipt });
        } else {
          validateContainerBinding({ observation:
            before.value as Record<string, unknown>, receipt,
          expectedRole: receipt.resource === "runner"
            ? "minimal_runner" : "minimal_postgres" });
        }
      } catch {
        return report(false, "IDENTITY_MISMATCH", "FAILED_PROVENANCE");
      }
      if (!providerIdentityMatched()) {
        return report(false, "UNKNOWN_FAILURE", "FAILED_PROVIDER_IDENTITY");
      }
      const remove = docker(input.runner, receipt.resource === "network"
        ? ["network", "rm", receipt.canonicalId]
        : ["container", "rm", "--force", receipt.canonicalId],
      { allowFailure: true });
      if (!providerIdentityMatched()) {
        return report(true, "UNKNOWN_FAILURE", "FAILED_PROVIDER_IDENTITY");
      }
      const after = dockerInspect({ runner: input.runner, args: inspectArgs,
        resource: resourceType, canonicalId: receipt.canonicalId });
      if (after.kind === "NOT_FOUND") {
        return report(true, "NOT_FOUND", "PASS_REMOVED");
      }
      if (remove.status !== 0) {
        return report(true, after.kind, "FAILED_DELETE");
      }
      return report(true, after.kind, "FAILED_ABSENCE_VERIFICATION");
    },
    removeResult() {
      return removeExactFile(input.names.result)
        ? "PASS_REMOVED" : "PASS_ALREADY_ABSENT";
    },
    removeResultDirectory() {
      try {
        const metadata = lstatSync(input.names.resultDirectory);
        if (!metadata.isDirectory() || metadata.isSymbolicLink() ||
          realpathSync(input.names.resultDirectory) !== input.names.resultDirectory ||
          dirname(input.names.resultDirectory) !== input.names.temporaryRoot ||
          readdirSync(input.names.resultDirectory).length !== 0) {
          throw new Error("DAY147_A5_MINIMAL_RESULT_DIRECTORY_CLEANUP_FAILED");
        }
        rmdirSync(input.names.resultDirectory);
        return "PASS_REMOVED";
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return "PASS_ALREADY_ABSENT";
        }
        throw error;
      }
    },
    removeBundle() {
      const removed = [input.names.bundle, input.names.entry,
        input.names.metafile].map(removeExactFile).some(Boolean);
      return removed ? "PASS_REMOVED" : "PASS_ALREADY_ABSENT";
    },
    removeTemporaryRoot() {
      try {
        const metadata = lstatSync(input.names.temporaryRoot);
        if (!metadata.isDirectory() || metadata.isSymbolicLink() ||
          realpathSync(input.names.temporaryRoot) !== input.names.temporaryRoot ||
          dirname(input.names.temporaryRoot) !== TEMP_ROOT_PARENT ||
          readdirSync(input.names.temporaryRoot).length !== 0) {
          throw new Error("DAY147_A5_MINIMAL_TEMP_BINDING_INVALID");
        }
        rmdirSync(input.names.temporaryRoot);
        return "PASS_REMOVED";
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return "PASS_ALREADY_ABSENT";
        }
        throw error;
      }
    },
  });
}

function repositoryGateFailure(
  failureCode: MinimalV2RepositoryGateFailureCode,
  expected: unknown,
  actual: unknown,
  relativePath?: string,
): MinimalV2RepositoryGateResult {
  return Object.freeze({ ok: false, failureCode, expected, actual,
    ...(relativePath === undefined ? {} : { relativePath }) });
}

function parsePorcelainV1Z(raw: string): MinimalV2RepositoryGateResult |
  readonly RepositorySourceEntry[] {
  if (raw === "") return Object.freeze([]);
  if (!raw.endsWith("\0")) return repositoryGateFailure(
    "SOURCE_ENTRY_MALFORMED", "NUL_TERMINATED", "MISSING_FINAL_NUL");
  const records = raw.split("\0");
  records.pop();
  const entries: RepositorySourceEntry[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    if (record.length < 4 || record[2] !== " " || record.slice(3).length === 0 ||
      !/^[ MADRCU?!]{2}$/.test(record.slice(0, 2)) ||
      record.slice(3).includes("\n") || record.slice(3).includes("\r")) {
      return repositoryGateFailure("SOURCE_ENTRY_MALFORMED",
        "XY SPACE RELATIVE_PATH NUL", "MALFORMED_ENTRY");
    }
    const xy = record.slice(0, 2);
    const relativePath = record.slice(3);
    const rename = xy.includes("R");
    const copy = xy.includes("C");
    if (rename || copy) {
      const originalPath = records[index + 1];
      if (originalPath === undefined || originalPath.length === 0 ||
        originalPath.includes("\n") || originalPath.includes("\r")) {
        return repositoryGateFailure("SOURCE_ENTRY_MALFORMED",
          "RENAME_OR_COPY_TWO_PATH_ENTRY", "MISSING_OR_MALFORMED_SECOND_PATH",
          relativePath);
      }
      index += 1;
    }
    entries.push(Object.freeze({ xy, relative_path: relativePath,
      entry_type: rename ? "rename" : copy ? "copy" :
        xy === "??" ? "untracked" : "tracked" }));
  }
  return Object.freeze(entries);
}

function exactGitLine(result: CommandResult): string | null {
  if (result.status !== 0 || result.stderr !== "" ||
    !/^[^\0\r\n]+\n?$/.test(result.stdout)) return null;
  return result.stdout.endsWith("\n") ? result.stdout.slice(0, -1) : result.stdout;
}

type GeneratedArtifactName = "evidence.json" | "receipt.json" | "commit.json";
type GeneratedArtifactFileObservation = Readonly<{
  regularFile: boolean;
  symbolicLink: boolean;
  linkCount: number;
  bytes: Uint8Array;
}>;
type GeneratedArtifactObservation = Readonly<{
  fileNames: readonly string[];
  files: Readonly<Partial<Record<GeneratedArtifactName,
    GeneratedArtifactFileObservation>>>;
}>;
type ProtectedFileObservation = Readonly<{
  regularFile: boolean;
  symbolicLink: boolean;
  bytes: Uint8Array;
}>;

function generatedArtifactCoordinates(relativePath: string): Readonly<{
  nonce: string;
  name: GeneratedArtifactName;
}> | null {
  const match = /^reports\/day147a5-isolated-postgres\/runs\/([a-f0-9]{12})\/(evidence\.json|receipt\.json|commit\.json)$/.exec(
    relativePath,
  );
  return match === null ? null : Object.freeze({ nonce: match[1]!,
    name: match[2]! as GeneratedArtifactName });
}

function validateGeneratedArtifact(input: Readonly<{
  entries: readonly RepositorySourceEntry[];
  nonce: string;
  observation: GeneratedArtifactObservation;
  expectedHashes?: ReadonlyMap<string, string>;
}>): MinimalV2RepositoryGateResult | GeneratedArtifactEntry {
  const evidencePath = `reports/day147a5-isolated-postgres/runs/${input.nonce}/evidence.json`;
  const entryNames = input.entries.map((entry) =>
    generatedArtifactCoordinates(entry.relative_path)?.name ?? "INVALID"
  ).sort();
  if (input.entries.some((entry) => entry.xy !== "??" ||
      entry.entry_type !== "untracked") ||
    JSON.stringify([...input.observation.fileNames].sort()) !==
      JSON.stringify(entryNames) ||
    !input.observation.fileNames.every((name) =>
      ["evidence.json", "receipt.json", "commit.json"].includes(name))) {
    return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
      "STRICT_NONCE_ARTIFACT_SET", "ARTIFACT_SHAPE_OR_STATUS_INVALID",
      evidencePath);
  }
  const evidenceFile = input.observation.files["evidence.json"];
  if (evidenceFile === undefined || !evidenceFile.regularFile ||
    evidenceFile.symbolicLink || evidenceFile.linkCount !== 1) {
    return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
      "REGULAR_SINGLE_LINK_EVIDENCE", "ARTIFACT_FILE_INVALID", evidencePath);
  }
  let evidence: unknown;
  try { evidence = JSON.parse(Buffer.from(evidenceFile.bytes).toString("utf8")); }
  catch { return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
    "VALID_JSON_EVIDENCE", "JSON_PARSE_FAILED", evidencePath); }
  if (!recordLike(evidence) || evidence.execution_nonce !== input.nonce) {
    return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
      "NONCE_BOUND_EVIDENCE", "NONCE_MISMATCH", evidencePath);
  }
  let classification: GeneratedArtifactEntry["classification"];
  if (entryNames.length === 1 && entryNames[0] === "evidence.json" &&
    evidence.success_claimed === false &&
    validateFailureA5Evidence({ evidence, receiptPresent: false,
      markerPresent: false }).accepted) {
    classification = "VALID_FAILURE_EVIDENCE";
  } else if (JSON.stringify(entryNames) === JSON.stringify(
      ["commit.json", "evidence.json", "receipt.json"])) {
    const receiptFile = input.observation.files["receipt.json"];
    const markerFile = input.observation.files["commit.json"];
    if (receiptFile === undefined || markerFile === undefined ||
      [receiptFile, markerFile].some((file) => !file.regularFile ||
        file.symbolicLink || file.linkCount !== 1)) {
      return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
        "REGULAR_SINGLE_LINK_SUCCESS_CHAIN", "ARTIFACT_FILE_INVALID",
        evidencePath);
    }
    const chainClass = classifyCommittedA5ArtifactChain({
      evidenceBytes: evidenceFile.bytes, receiptBytes: receiptFile.bytes,
      markerBytes: markerFile.bytes, expectedExecutionNonce: input.nonce,
    });
    if (chainClass === "INVALID") return repositoryGateFailure(
      "GENERATED_ARTIFACT_INVALID", "VALID_COMMITTED_SUCCESS_CHAIN",
      "COMMITTED_VALIDATOR_REJECTED", evidencePath);
    classification = chainClass;
  } else return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
    "FAILURE_EVIDENCE_OR_EXACT_COMMITTED_SUCCESS_CHAIN",
    "ARTIFACT_SET_INVALID", evidencePath);
  for (const entry of input.entries) {
    const coordinates = generatedArtifactCoordinates(entry.relative_path)!;
    const file = input.observation.files[coordinates.name]!;
    const digest = sha256(file.bytes);
    const expectedDigest = input.expectedHashes?.get(entry.relative_path);
    if (expectedDigest !== undefined && digest !== expectedDigest) {
      return repositoryGateFailure("GENERATED_ARTIFACT_HASH_MISMATCH",
        expectedDigest, digest, entry.relative_path);
    }
  }
  return Object.freeze({ relative_path: evidencePath, nonce: input.nonce,
    sha256: sha256(evidenceFile.bytes), classification });
}

function inspectGeneratedArtifact(relativePath: string): GeneratedArtifactObservation {
  const coordinates = generatedArtifactCoordinates(relativePath);
  if (coordinates === null) throw new Error("artifact path invalid");
  const runRoot = resolve(ROOT,
    `reports/day147a5-isolated-postgres/runs/${coordinates.nonce}`);
  const fileNames = readdirSync(runRoot).sort();
  const files: Partial<Record<GeneratedArtifactName,
    GeneratedArtifactFileObservation>> = {};
  for (const name of fileNames) {
    if (!["evidence.json", "receipt.json", "commit.json"].includes(name)) continue;
    const path = resolve(runRoot, name);
    const metadata = lstatSync(path);
    files[name as GeneratedArtifactName] = Object.freeze({
      regularFile: metadata.isFile(), symbolicLink: metadata.isSymbolicLink(),
      linkCount: metadata.nlink,
      bytes: metadata.isFile() && !metadata.isSymbolicLink()
        ? readFileSync(path) : new Uint8Array(),
    });
  }
  return Object.freeze({ fileNames: Object.freeze(fileNames),
    files: Object.freeze(files) });
}

function recordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactTextOccurrenceCount(text: string, value: string): number {
  return text.split(value).length - 1;
}

function validateClosureDocument(
  observation: ClosureDocumentObservation,
): MinimalV2RepositoryGateResult | ClosureDocumentEntry {
  if (!observation.regularFile || observation.symbolicLink ||
    observation.linkCount !== 1) {
    return repositoryGateFailure("CLOSURE_DOCUMENT_INVALID",
      "REGULAR_NON_SYMLINK_SINGLE_LINK_FILE", "FILESYSTEM_SHAPE_INVALID",
      A6_CLOSURE_DOCUMENT_PATH);
  }
  if (observation.bytes.length === 0 ||
    observation.bytes.length > A6_CLOSURE_DOCUMENT_MAXIMUM_SIZE_BYTES) {
    return repositoryGateFailure("CLOSURE_DOCUMENT_INVALID",
      `1..${A6_CLOSURE_DOCUMENT_MAXIMUM_SIZE_BYTES}_BYTES`,
      observation.bytes.length, A6_CLOSURE_DOCUMENT_PATH);
  }
  if (observation.bytes.includes(0)) return repositoryGateFailure(
    "CLOSURE_DOCUMENT_INVALID", "NO_NUL_BYTE", "NUL_BYTE_PRESENT",
    A6_CLOSURE_DOCUMENT_PATH);
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(observation.bytes); }
  catch { return repositoryGateFailure("CLOSURE_DOCUMENT_INVALID",
    "VALID_UTF8", "UTF8_DECODE_FAILED", A6_CLOSURE_DOCUMENT_PATH); }
  const requiredFragments = [
    "Day147-A",
    "813faed4c9ee",
    "21f29d2655db666852e7e1af183aaeb24336b7d1e2b7f417540eca41f301243b",
    "a7145d55ac4ac2f9ade781d8f0b2db647bc60144e3c7836b1842c5a4285d53df",
    "40100db8e4819d6fc9bd815959ff0e9d9248b68330983041b97eb2c5dfdcce02",
    "102",
    "automatic_promotion_count",
    "active_state_unchanged",
    "production_operations",
    "rollback",
    "Day147-B",
  ] as const;
  const exactSemanticFields = [
    "execution_nonce: 813faed4c9ee",
    "evidence_sha256: 21f29d2655db666852e7e1af183aaeb24336b7d1e2b7f417540eca41f301243b",
    "receipt_sha256: a7145d55ac4ac2f9ade781d8f0b2db647bc60144e3c7836b1842c5a4285d53df",
    "commit_artifact_sha256: 40100db8e4819d6fc9bd815959ff0e9d9248b68330983041b97eb2c5dfdcce02",
  ] as const;
  if (requiredFragments.some((fragment) => !text.includes(fragment)) ||
    exactSemanticFields.some((field) => exactTextOccurrenceCount(text, field) !== 1) ||
    !/^production_operations: 0$/m.test(text) ||
    !/^## Rollback procedure$/m.test(text) ||
    !/^production_database_rollback_required: false$/m.test(text) ||
    !/^  git_commit_required_before_day147_b: true$/m.test(text) ||
    !/^  push_required_before_day147_b: true$/m.test(text)) {
    return repositoryGateFailure("CLOSURE_DOCUMENT_INVALID",
      "BOUNDED_A6_CLOSURE_SEMANTICS", "SEMANTIC_REQUIREMENT_FAILED",
      A6_CLOSURE_DOCUMENT_PATH);
  }
  return Object.freeze({ classification: "A6_CLOSURE_DOCUMENT",
    relative_path: A6_CLOSURE_DOCUMENT_PATH, xy: A6_CLOSURE_DOCUMENT_XY });
}

function inspectClosureDocument(): ClosureDocumentObservation {
  const path = resolve(ROOT, A6_CLOSURE_DOCUMENT_PATH);
  const metadata = lstatSync(path);
  return Object.freeze({ regularFile: metadata.isFile(),
    symbolicLink: metadata.isSymbolicLink(), linkCount: metadata.nlink,
    bytes: metadata.isFile() && !metadata.isSymbolicLink()
      ? readFileSync(path) : new Uint8Array() });
}

function validateRepositoryEntries(input: Readonly<{
  entries: readonly RepositorySourceEntry[];
  mode: RepositoryGateMode;
  inspectArtifact: (relativePath: string) => GeneratedArtifactObservation;
  inspectClosure?: () => ClosureDocumentObservation;
  inspectProtected?: (relativePath: string) => ProtectedFileObservation;
  protectedHashes?: ReadonlyMap<string, string>;
  artifactHashes?: ReadonlyMap<string, string>;
}>): MinimalV2RepositoryGateResult {
  const sourceEntries: RepositorySourceEntry[] = [];
  const generatedArtifacts: GeneratedArtifactEntry[] = [];
  const observedSourcePaths = new Set<string>();
  const observedArtifactPaths = new Set<string>();
  const artifactEntries = new Map<string, RepositorySourceEntry[]>();
  let closureDocument: ClosureDocumentEntry | null = null;
  for (const entry of input.entries) {
    if (entry.xy[0] !== " " && entry.xy !== "??") return repositoryGateFailure(
      "STAGED_FILE_PRESENT", "NO_STAGED_STATE", entry.xy, entry.relative_path);
    if (entry.entry_type === "rename" || entry.entry_type === "copy" ||
      entry.xy.includes("D")) return repositoryGateFailure(
      "SOURCE_STATUS_UNEXPECTED", "NO_RENAME_COPY_DELETE", entry.xy,
      entry.relative_path);
    const expectedXy = EXACT_SOURCE_XY.get(entry.relative_path);
    if (expectedXy !== undefined) {
      if (entry.xy !== expectedXy) return repositoryGateFailure(
        "SOURCE_STATUS_UNEXPECTED", expectedXy, entry.xy, entry.relative_path);
      observedSourcePaths.add(entry.relative_path);
      sourceEntries.push(entry);
      continue;
    }
    if (entry.relative_path === A6_CLOSURE_DOCUMENT_PATH) {
      if (input.mode !== "static") return repositoryGateFailure(
        "SOURCE_PATH_UNEXPECTED", [...EXACT_SOURCE_XY.keys()],
        entry.relative_path, entry.relative_path);
      if (entry.xy !== A6_CLOSURE_DOCUMENT_XY ||
        entry.entry_type !== "untracked") return repositoryGateFailure(
        "SOURCE_STATUS_UNEXPECTED", A6_CLOSURE_DOCUMENT_XY, entry.xy,
        entry.relative_path);
      let observation: ClosureDocumentObservation;
      try { observation = input.inspectClosure?.() ?? inspectClosureDocument(); }
      catch { return repositoryGateFailure("CLOSURE_DOCUMENT_INVALID",
        "READABLE_A6_CLOSURE_DOCUMENT", "INSPECTION_FAILED",
        entry.relative_path); }
      const validated = validateClosureDocument(observation);
      if ("ok" in validated) return validated;
      closureDocument = validated;
      sourceEntries.push(entry);
      continue;
    }
    if (entry.relative_path.startsWith(
      "reports/day147a5-isolated-postgres/runs/")) {
      const coordinates = generatedArtifactCoordinates(entry.relative_path);
      if (coordinates === null) return repositoryGateFailure(
        "GENERATED_ARTIFACT_INVALID", "EXACT_NONCE_ARTIFACT_PATH",
        "ARTIFACT_PATH_INVALID", entry.relative_path);
      const grouped = artifactEntries.get(coordinates.nonce) ?? [];
      grouped.push(entry);
      artifactEntries.set(coordinates.nonce, grouped);
      observedArtifactPaths.add(entry.relative_path);
      continue;
    }
    return repositoryGateFailure("SOURCE_PATH_UNEXPECTED",
      [...EXACT_SOURCE_XY.keys()], entry.relative_path, entry.relative_path);
  }
  for (const [relativePath, expectedXy] of EXACT_SOURCE_XY) {
    if (!observedSourcePaths.has(relativePath)) return repositoryGateFailure(
      "SOURCE_STATUS_UNEXPECTED", expectedXy, "CLEAN_OR_MISSING",
      relativePath);
  }
  if (input.mode === "static" && closureDocument === null) {
    return repositoryGateFailure("CLOSURE_DOCUMENT_INVALID",
      "PRESENT_A6_CLOSURE_DOCUMENT", "MISSING", A6_CLOSURE_DOCUMENT_PATH);
  }
  for (const [nonce, entries] of artifactEntries) {
    let observation: GeneratedArtifactObservation;
    try { observation = input.inspectArtifact(entries[0]!.relative_path); }
    catch { return repositoryGateFailure("GENERATED_ARTIFACT_INVALID",
      "READABLE_STRICT_ARTIFACT_SET", "ARTIFACT_INSPECTION_FAILED",
      entries[0]!.relative_path); }
    const validated = validateGeneratedArtifact({ entries, nonce, observation,
      expectedHashes: input.artifactHashes });
    if ("ok" in validated) return validated;
    generatedArtifacts.push(validated);
  }
  for (const relativePath of input.artifactHashes?.keys() ?? []) {
    if (!observedArtifactPaths.has(relativePath)) return repositoryGateFailure(
      "GENERATED_ARTIFACT_HASH_MISMATCH", "PRESENT_WITH_BASELINE_HASH",
      "MISSING", relativePath);
  }
  for (const [relativePath, expectedDigest] of input.protectedHashes ?? []) {
    let actualDigest: string;
    try {
      const observation = input.inspectProtected?.(relativePath) ?? (() => {
        const metadata = lstatSync(resolve(ROOT, relativePath));
        return { regularFile: metadata.isFile(),
          symbolicLink: metadata.isSymbolicLink(),
          bytes: readFileSync(resolve(ROOT, relativePath)) };
      })();
      if (!observation.regularFile || observation.symbolicLink) {
        throw new Error("type");
      }
      actualDigest = sha256(observation.bytes);
    } catch { return repositoryGateFailure("PROTECTED_FILE_HASH_MISMATCH",
      expectedDigest, "UNREADABLE_OR_NON_REGULAR", relativePath); }
    if (actualDigest !== expectedDigest) return repositoryGateFailure(
      "PROTECTED_FILE_HASH_MISMATCH", expectedDigest, actualDigest, relativePath);
  }
  return Object.freeze({ ok: true,
    sourceEntries: Object.freeze(sourceEntries.sort((left, right) =>
      left.relative_path.localeCompare(right.relative_path))),
    generatedArtifacts: Object.freeze(generatedArtifacts.sort((left, right) =>
      left.relative_path.localeCompare(right.relative_path))),
    closureDocument });
}

function evaluateRepositoryGate(runner: CommandRunner,
  artifactManifest = existingFailureArtifactManifest(),
  mode: RepositoryGateMode = "static"):
  MinimalV2RepositoryGateResult {
  for (const predicate of [
    { code: "BRANCH_MISMATCH" as const, args: ["branch", "--show-current"],
      expected: "main" },
    { code: "HEAD_MISMATCH" as const, args: ["rev-parse", "HEAD"],
      expected: EXPECTED_HEAD },
    { code: "ORIGIN_HEAD_MISMATCH" as const,
      args: ["rev-parse", "origin/main"], expected: EXPECTED_HEAD },
    { code: "AHEAD_BEHIND_MISMATCH" as const,
      args: ["rev-list", "--left-right", "--count", "HEAD...origin/main"],
      expected: "0\t0" },
  ]) {
    const actual = exactGitLine(runner.run("git", predicate.args));
    if (actual !== predicate.expected) return repositoryGateFailure(
      predicate.code, predicate.expected, actual ?? "GIT_COMMAND_FAILED");
  }
  const status = runner.run("git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  if (status.status !== 0 || status.stderr !== "") return repositoryGateFailure(
    "SOURCE_ENTRY_MALFORMED", "SUCCESSFUL_PORCELAIN_V1_Z",
    "GIT_COMMAND_FAILED");
  const parsed = parsePorcelainV1Z(status.stdout);
  if ("ok" in parsed) return parsed;
  return validateRepositoryEntries({ entries: parsed, mode,
    inspectArtifact: inspectGeneratedArtifact,
    protectedHashes: PROTECTED_FILE_SHA256,
    artifactHashes: artifactManifest });
}

function reportRepositoryGate(result: MinimalV2RepositoryGateResult): void {
  console.log(JSON.stringify(result.ok ? {
    repository_gate_operator_report: "PASS",
    first_failed_predicate: null,
    expected: null,
    actual: null,
    source_entries: result.sourceEntries,
    generated_artifact_count: result.generatedArtifacts.length,
    closure_document_classification:
      result.closureDocument?.classification ?? null,
    protected_file_preserved: true,
  } : {
    repository_gate_operator_report: "FAIL",
    first_failed_predicate: result.failureCode,
    failure_code: result.failureCode,
    expected: result.expected,
    actual: result.actual,
    ...(result.relativePath === undefined ? {} :
      { relative_path: result.relativePath }),
  }));
}

function validateRepositoryGate(runner: CommandRunner,
  artifactManifest = existingFailureArtifactManifest(),
  mode: RepositoryGateMode = "static"):
  MinimalV2RepositoryGateResult {
  const result = evaluateRepositoryGate(runner, artifactManifest, mode);
  reportRepositoryGate(result);
  if (!result.ok) throw new Error("DAY147_A5_MINIMAL_SOURCE_SNAPSHOT_BLOCKED");
  return result;
}

function existingFailureArtifactManifest(): ReadonlyMap<string, string> {
  const root = resolve(ROOT, "reports/day147a5-isolated-postgres/runs");
  const manifest = new Map<string, string>();
  for (const nonce of readdirSync(root).sort()) {
    if (!/^[a-f0-9]{12}$/.test(nonce)) continue;
    for (const name of ["evidence.json", "receipt.json", "commit.json"] as const) {
      const path = resolve(root, nonce, name);
      try {
        const metadata = lstatSync(path);
        if (!metadata.isFile() || metadata.isSymbolicLink() ||
          metadata.nlink !== 1) continue;
        manifest.set(relative(ROOT, path), sha256(readFileSync(path)));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }
  return manifest;
}

function assertManifestPreserved(manifest: ReadonlyMap<string, string>): void {
  for (const [path, digest] of manifest) {
    if (sha256(readFileSync(resolve(ROOT, path))) !== digest) {
      throw new Error("DAY147_A5_MINIMAL_EXISTING_ARTIFACT_CHANGED");
    }
  }
}

function validateProvider(runner: CommandRunner, options: Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  socket_io?: Parameters<typeof validateDay147A5OrbStackProviderContract>[0]["socket_io"];
  current_user_identity?: Parameters<typeof validateDay147A5OrbStackProviderContract>[0]["current_user_identity"];
}> = {}): Day147A5OrbStackProviderProof {
  const environment = options.environment ?? process.env;
  if (environment.DOCKER_HOST !== undefined ||
    environment.DOCKER_CONTEXT !== undefined) {
    throw new Error("DAY147_A5_MINIMAL_PROVIDER_ENV_OVERRIDE");
  }
  const context = commandSucceeded(docker(runner, ["context", "show"]),
    "DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED").stdout.trim();
  const inspected = commandSucceeded(docker(runner,
    ["context", "inspect", context]),
  "DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED").stdout;
  try {
    const sharedProof = validateDay147A5OrbStackProviderContract({
      environment: {
        DOCKER_HOST: environment.DOCKER_HOST,
        DOCKER_CONTEXT: environment.DOCKER_CONTEXT,
        DOCKER_CONFIG: environment.DOCKER_CONFIG,
        HOME: environment.HOME,
        PATH: environment.PATH,
      },
      context_output: context,
      inspect_output: inspected,
      socket_io: options.socket_io,
      current_user_identity: options.current_user_identity,
    });
    const dockerInfo = commandSucceeded(docker(runner,
      ["info", "--format", "{{json .}}"]),
    "DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED").stdout;
    const info = JSON.parse(dockerInfo) as Record<string, unknown>;
    if (typeof info.ID !== "string" || info.ID.length < 1 ||
      info.OperatingSystem !== "OrbStack" ||
      typeof info.ServerVersion !== "string" || info.ServerVersion.length < 1) {
      throw new Error("DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED");
    }
    return Object.freeze({ ...sharedProof,
      provider_identity_sha256: sha256(
        `farmos-day147a5-provider-daemon-v1\0${sharedProof.provider_identity_sha256}\0${info.ID}`,
      ) });
  } catch {
    throw new Error("DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED");
  }
}

type NetworkPreflightEvaluation = Readonly<{
  result: MinimalNetworkPreflightResult;
  inspectExitCode: number | null;
  inspectClassification: NetworkInspectClassification | "NOT_EXECUTED";
  sanitizedStderr: string;
}>;

function sanitizeDockerStderr(stderr: string): string {
  return bounded(stderr).slice(0, 2_048)
    .replaceAll(/(?:unix:\/\/)?\/[\w./-]*docker\.sock/gi,
      "[REDACTED_SOCKET_PATH]")
    .replaceAll(/\b[a-f0-9]{64}\b/g, "[REDACTED_DOCKER_ID]");
}

function isExactMinimalNetworkNotFound(result: CommandResult,
  exactNetworkName: string): boolean {
  const sharedInput = { exit_code: result.status, stdout: result.stdout,
    stderr: result.stderr };
  if (isExactNetworkNotFound(sharedInput, exactNetworkName)) return true;
  if (!/^\[\]\r?\n?$/.test(result.stdout)) return false;
  return isExactNetworkNotFound({ ...sharedInput, stdout: "" },
    exactNetworkName);
}

function classifyNetworkInspect(input: Readonly<{
  result: CommandResult;
  exactNetworkName: string;
}>): NetworkInspectClassification {
  const { result, exactNetworkName } = input;
  if (result.status === 0) {
    if (result.stderr !== "") return "MALFORMED_RESPONSE";
    try {
      const parsed = JSON.parse(result.stdout);
      if (!Array.isArray(parsed) || parsed.length !== 1 ||
        typeof parsed[0] !== "object" || parsed[0] === null ||
        (parsed[0] as Record<string, unknown>).Name !== exactNetworkName ||
        !/^[a-f0-9]{64}$/.test(String(
          (parsed[0] as Record<string, unknown>).Id ?? ""))) {
        return "MALFORMED_RESPONSE";
      }
      return "PRESENT";
    } catch { return "MALFORMED_RESPONSE"; }
  }
  if (isExactMinimalNetworkNotFound(result, exactNetworkName)) {
    return "NOT_FOUND";
  }
  if (result.stdout.trim() !== "") return "MALFORMED_RESPONSE";
  if (/timeout|timed out|deadline exceeded/i.test(result.stderr)) {
    return "TIMEOUT";
  }
  if (/permission denied|access denied|operation not permitted/i.test(
    result.stderr,
  )) return "PERMISSION_DENIED";
  if (/cannot connect(?:.*docker daemon)?|docker daemon is not running|connection reset|context .*not found|socket (?:is )?unavailable|docker\.sock.*(?:no such|unavailable)/i.test(
    result.stderr,
  )) return "PROVIDER_UNAVAILABLE";
  if (result.stderr === "") return "UNKNOWN_FAILURE";
  return "UNKNOWN_FAILURE";
}

function preflightFailure(input: Readonly<{
  failureCode: Exclude<MinimalNetworkPreflightResult,
    { ok: true }>["failureCode"];
  firstFailedPredicate: string;
  networkName?: string;
  inspectExitCode?: number;
  sanitizedStderr?: string;
  inspectClassification?: NetworkInspectClassification;
  providerIdentityMatched: boolean;
}>): MinimalNetworkPreflightResult {
  return Object.freeze({ ok: false, ...input });
}

function evaluateNetworkPreflight(input: Readonly<{
  runner: CommandRunner;
  nonce: string;
  initialProviderProof: Day147A5OrbStackProviderProof;
  providerValidator: () => Day147A5OrbStackProviderProof;
}>): NetworkPreflightEvaluation {
  let networkName: string;
  try { networkName = networkNameForNonce(input.nonce); }
  catch {
    return Object.freeze({ result: preflightFailure({
      failureCode: "NETWORK_NAME_INVALID",
      firstFailedPredicate: "network_name_contract",
      inspectClassification: undefined,
      providerIdentityMatched: false,
    }), inspectExitCode: null, inspectClassification: "NOT_EXECUTED",
    sanitizedStderr: "" });
  }
  try {
    const before = input.providerValidator();
    if (!sameProviderIdentity(input.initialProviderProof, before)) throw new Error();
  } catch {
    return Object.freeze({ result: preflightFailure({
      failureCode: "PROVIDER_IDENTITY_CHANGED", networkName,
      firstFailedPredicate: "provider_identity_before_inspect",
      inspectClassification: undefined, providerIdentityMatched: false,
    }), inspectExitCode: null, inspectClassification: "NOT_EXECUTED",
    sanitizedStderr: "" });
  }
  const inspect = docker(input.runner,
    ["network", "inspect", networkName], { allowFailure: true });
  const classification = classifyNetworkInspect({ result: inspect,
    exactNetworkName: networkName });
  const sanitizedStderr = sanitizeDockerStderr(inspect.stderr);
  try {
    const after = input.providerValidator();
    if (!sameProviderIdentity(input.initialProviderProof, after)) throw new Error();
  } catch {
    return Object.freeze({ result: preflightFailure({
      failureCode: "PROVIDER_IDENTITY_CHANGED", networkName,
      inspectExitCode: inspect.status, sanitizedStderr,
      firstFailedPredicate: "provider_identity_after_inspect",
      inspectClassification: classification, providerIdentityMatched: false,
    }), inspectExitCode: inspect.status,
    inspectClassification: classification, sanitizedStderr });
  }
  if (classification === "NOT_FOUND") return Object.freeze({ result:
    Object.freeze({ ok: true, networkName, providerIdentityMatched: true,
      absenceClassification: "NOT_FOUND" }), inspectExitCode: inspect.status,
    inspectClassification: classification, sanitizedStderr });
  const failureCode = ({
    PRESENT: "NETWORK_ALREADY_EXISTS",
    PERMISSION_DENIED: "NETWORK_INSPECT_PERMISSION_DENIED",
    PROVIDER_UNAVAILABLE: "NETWORK_INSPECT_PROVIDER_UNAVAILABLE",
    TIMEOUT: "NETWORK_INSPECT_TIMEOUT",
    MALFORMED_RESPONSE: "NETWORK_INSPECT_MALFORMED",
    UNKNOWN_FAILURE: "NETWORK_INSPECT_UNKNOWN_FAILURE",
  } as const)[classification];
  return Object.freeze({ result: preflightFailure({ failureCode, networkName,
    inspectExitCode: inspect.status, sanitizedStderr,
    firstFailedPredicate: "network_absence_classification",
    inspectClassification: classification, providerIdentityMatched: true,
  }), inspectExitCode: inspect.status, inspectClassification: classification,
  sanitizedStderr });
}

function reportNetworkPreflight(evaluation: NetworkPreflightEvaluation): void {
  const result = evaluation.result;
  console.log(JSON.stringify({ network_preflight_diagnosis: {
    result: result.ok ? "PASS" : "FAIL",
    first_failed_predicate: result.ok ? null : result.firstFailedPredicate,
    failure_code: result.ok ? null : result.failureCode,
    network_name_format: result.ok || result.networkName !== undefined
      ? "VALID_NONCE_BOUND" : "INVALID",
    network_name: result.ok ? result.networkName : result.networkName ?? null,
    inspect_exit_code: evaluation.inspectExitCode,
    inspect_classification: evaluation.inspectClassification,
    provider_identity_matched: result.providerIdentityMatched,
    sanitized_stderr: evaluation.sanitizedStderr,
  } }));
}

function preflightFailureError(result: Exclude<MinimalNetworkPreflightResult,
  { ok: true }>): Error {
  const code = result.failureCode === "NETWORK_NAME_INVALID"
    ? "DAY147_A5_MINIMAL_NETWORK_NAME_INVALID"
    : result.failureCode === "NETWORK_ALREADY_EXISTS"
      ? "DAY147_A5_MINIMAL_NETWORK_ALREADY_EXISTS"
      : result.failureCode === "PROVIDER_IDENTITY_CHANGED"
        ? "DAY147_A5_MINIMAL_PROVIDER_IDENTITY_CHANGED"
        : `DAY147_A5_MINIMAL_${result.failureCode}`;
  return new Error(code);
}

function inspectRequiredImages(runner: CommandRunner): Readonly<{
  nodeImageId: string;
  postgresImageId: string;
}> {
  const node = requirePresentInspect(dockerInspect({ runner,
    args: ["image", "inspect", NODE_IMAGE], resource: "container" }),
  "DAY147_A5_MINIMAL_IMAGE_GATE_BLOCKED");
  const postgres = requirePresentInspect(dockerInspect({ runner,
    args: ["image", "inspect", POSTGRES_IMAGE], resource: "container" }),
  "DAY147_A5_MINIMAL_IMAGE_GATE_BLOCKED");
  if (node.Id !== NODE_IMAGE_ID || typeof postgres.Id !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(postgres.Id)) {
    throw new Error("DAY147_A5_MINIMAL_IMAGE_GATE_BLOCKED");
  }
  return Object.freeze({ nodeImageId: String(node.Id),
    postgresImageId: String(postgres.Id) });
}

function atomicWrite(path: string, bytes: Uint8Array): void {
  const temporary = `${path}.tmp-${randomBytes(6).toString("hex")}`;
  const descriptor = openSync(temporary, "wx", 0o600);
  try {
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
  } finally { closeSync(descriptor); }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), "r");
  try { fsyncSync(directory); } finally { closeSync(directory); }
}

type SuccessChainState = "NOT_STARTED" | "EVIDENCE_DURABLE" |
  "RECEIPT_DURABLE" | "MARKER_DURABLE" | "READBACK_VERIFIED" |
  "COMMITTED_ACCEPTED" | "INVALIDATING" | "INVALIDATED" |
  "INVALIDATION_FAILED";
type SuccessArtifactKind = "evidence" | "receipt" | "marker";
type SuccessChainIo = Readonly<{
  writeTemp: (kind: SuccessArtifactKind, path: string, bytes: Uint8Array) => void;
  fsyncFile: (kind: SuccessArtifactKind, path: string) => void;
  rename: (kind: SuccessArtifactKind, path: string) => void;
  fsyncParent: (kind: SuccessArtifactKind | "invalidation", path: string) => void;
  read: (kind: SuccessArtifactKind, path: string) => Uint8Array;
  remove: (kind: "receipt" | "marker", path: string) => void;
}>;

class SuccessChainDurabilityError extends Error {
  constructor(
    readonly primary: string,
    readonly state: SuccessChainState,
    readonly residualSuccessChainPossible: boolean,
  ) {
    super(residualSuccessChainPossible
      ? "DAY147_A5_SUCCESS_CHAIN_INVALIDATION_FAILED"
      : "DAY147_A5_SUCCESS_CHAIN_DURABILITY_FAILED");
  }
}

function productionSuccessChainIo(): SuccessChainIo {
  const temporaryPaths = new Map<SuccessArtifactKind, string>();
  return Object.freeze({
    writeTemp(kind, path, bytes) {
      const temporary = `${path}.tmp-${randomBytes(6).toString("hex")}`;
      writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
      temporaryPaths.set(kind, temporary);
    },
    fsyncFile(kind) {
      const temporary = temporaryPaths.get(kind);
      if (temporary === undefined) throw new Error("missing temporary file");
      const descriptor = openSync(temporary, "r");
      try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
    },
    rename(kind, path) {
      const temporary = temporaryPaths.get(kind);
      if (temporary === undefined) throw new Error("missing temporary file");
      renameSync(temporary, path);
      temporaryPaths.delete(kind);
    },
    fsyncParent(_kind, path) {
      const descriptor = openSync(dirname(path), "r");
      try { fsyncSync(descriptor); } finally { closeSync(descriptor); }
    },
    read(_kind, path) { return readFileSync(path); },
    remove(_kind, path) {
      try { rmSync(path); } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    },
  });
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength &&
    left.every((value, index) => value === right[index]);
}

function commitSuccessChain(input: Readonly<{
  runRoot: string;
  nonce: string;
  chain: ReturnType<typeof buildSuccessChain>;
  io: SuccessChainIo;
  committedValidator?: typeof validateCommittedA5ArtifactChain;
}>): SuccessChainState {
  const paths = {
    evidence: resolve(input.runRoot, FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH),
    receipt: resolve(input.runRoot, FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH),
    marker: resolve(input.runRoot, FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH),
  } as const;
  const bytes = { evidence: input.chain.evidenceBytes,
    receipt: input.chain.receiptBytes, marker: input.chain.markerBytes } as const;
  let state: SuccessChainState = "NOT_STARTED";
  let primary = "DAY147_A5_SUCCESS_CHAIN_DURABILITY_FAILED";
  try {
    for (const kind of ["evidence", "receipt", "marker"] as const) {
      input.io.writeTemp(kind, paths[kind], bytes[kind]);
      input.io.fsyncFile(kind, paths[kind]);
      input.io.rename(kind, paths[kind]);
      input.io.fsyncParent(kind, paths[kind]);
      state = kind === "evidence" ? "EVIDENCE_DURABLE" :
        kind === "receipt" ? "RECEIPT_DURABLE" : "MARKER_DURABLE";
      if (kind === "evidence") {
        primary = "DAY147_A5_SEMANTIC_EVIDENCE_VALIDATOR_REJECTED";
        const persistedEvidence = input.io.read("evidence", paths.evidence);
        const parsed = JSON.parse(Buffer.from(persistedEvidence).toString("utf8"));
        if (!bytesEqual(persistedEvidence, bytes.evidence) ||
          !validateFinalA5Evidence({ evidenceBytes: persistedEvidence,
            expectedExecutionNonce: input.nonce }).accepted ||
          (parsed.schema_version ===
              FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION &&
            !validateSemanticSuccessA5Evidence(parsed).accepted)) {
          throw new Error(primary);
        }
      }
      if (kind === "receipt") {
        const persistedEvidence = input.io.read("evidence", paths.evidence);
        const persistedReceipt = input.io.read("receipt", paths.receipt);
        if (!bytesEqual(persistedReceipt, bytes.receipt) ||
          !validateA5ReceiptForEvidence({ evidenceBytes: persistedEvidence,
            receiptBytes: persistedReceipt,
            expectedExecutionNonce: input.nonce }).accepted) {
          primary = "DAY147_A5_SUCCESS_CHAIN_RECEIPT_VALIDATOR_REJECTED";
          throw new Error(primary);
        }
      }
    }
    const evidenceBytes = input.io.read("evidence", paths.evidence);
    const receiptBytes = input.io.read("receipt", paths.receipt);
    const markerBytes = input.io.read("marker", paths.marker);
    if (!bytesEqual(evidenceBytes, bytes.evidence) ||
      !bytesEqual(receiptBytes, bytes.receipt) ||
      !bytesEqual(markerBytes, bytes.marker)) {
      primary = "DAY147_A5_SUCCESS_CHAIN_HASH_MISMATCH";
      throw new Error(primary);
    }
    state = "READBACK_VERIFIED";
    if (!(input.committedValidator ?? validateCommittedA5ArtifactChain)({ evidenceBytes, receiptBytes,
      markerBytes, expectedExecutionNonce: input.nonce }).accepted) {
      primary = "DAY147_A5_SUCCESS_CHAIN_COMMITTED_VALIDATOR_REJECTED";
      throw new Error(primary);
    }
    state = "COMMITTED_ACCEPTED";
    return state;
  } catch (error) {
    if (error instanceof Error && /^DAY147_A5_/.test(error.message)) {
      primary = error.message;
    }
    state = "INVALIDATING";
    let invalidationFailed = false;
    for (const kind of ["marker", "receipt"] as const) {
      try { input.io.remove(kind, paths[kind]); } catch {
        invalidationFailed = true;
      }
    }
    try { input.io.fsyncParent("invalidation", paths.marker); } catch {
      invalidationFailed = true;
    }
    let evidenceBytes: Uint8Array = new Uint8Array();
    let receiptBytes: Uint8Array | null = null;
    let markerBytes: Uint8Array | null = null;
    try { evidenceBytes = input.io.read("evidence", paths.evidence); } catch { /* absent */ }
    try { receiptBytes = input.io.read("receipt", paths.receipt); } catch { /* absent */ }
    try { markerBytes = input.io.read("marker", paths.marker); } catch { /* absent */ }
    let acceptedAfterInvalidation = false;
    try {
      acceptedAfterInvalidation = (input.committedValidator ??
        validateCommittedA5ArtifactChain)({
        evidenceBytes, receiptBytes, markerBytes,
        expectedExecutionNonce: input.nonce,
      }).accepted;
    } catch { invalidationFailed = true; }
    invalidationFailed ||= acceptedAfterInvalidation;
    state = invalidationFailed ? "INVALIDATION_FAILED" : "INVALIDATED";
    throw new SuccessChainDurabilityError(primary, state, invalidationFailed);
  }
}

function writeEvidence(input: Readonly<{
  nonce: string;
  success?: ReturnType<typeof buildSuccessChain>;
  failure?: Uint8Array;
  counters: OperationCounters;
}>): void {
  const runRoot = resolve(ROOT,
    `reports/day147a5-isolated-postgres/runs/${input.nonce}`);
  mkdirSync(runRoot, { recursive: false, mode: 0o700 });
  if (input.success !== undefined) {
    const state = commitSuccessChain({ runRoot, nonce: input.nonce,
      chain: input.success, io: productionSuccessChainIo() });
    if (state !== "COMMITTED_ACCEPTED") {
      throw new Error("DAY147_A5_SUCCESS_CHAIN_DURABILITY_FAILED");
    }
  } else if (input.failure !== undefined) {
    atomicWrite(resolve(runRoot, FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH),
      input.failure);
  } else throw new Error("BLOCKED_MINIMAL_V2_EVIDENCE");
  input.counters.evidenceWrites += 1;
}

function runnerEnvironment(input: Readonly<{
  nonce: string;
  password: string;
  names: MinimalNames;
  bundleSha256: string;
}>): Readonly<Record<string, string>> {
  return Object.freeze({
    FARMOS_A5_EXECUTION_NONCE: input.nonce,
    FARMOS_DAY147_A5_BUNDLE_SHA256: input.bundleSha256,
    FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
    PGHOST: "postgres", PGPORT: "5432",
    PGUSER: "day147a5_migration_owner",
    PGPASSWORD: input.password,
    PGDATABASE: input.names.database,
  });
}

function postgresEnvironment(input: Readonly<{
  password: string;
  names: MinimalNames;
}>): Readonly<Record<string, string>> {
  return Object.freeze({ POSTGRES_DB: input.names.database,
    POSTGRES_USER: "day147a5_migration_owner",
    POSTGRES_PASSWORD: input.password });
}

function delay(milliseconds: number): void {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, milliseconds);
}

function diagnoseMinimalNetworkPreflight(): void {
  const counters = ZERO_COUNTERS();
  const runner = productionRunner(counters);
  const initialManifest = existingFailureArtifactManifest();
  validateRepositoryGate(runner, initialManifest, "execute-minimal-network");
  const initialProviderProof = validateProvider(runner);
  const nonce = randomBytes(6).toString("hex");
  const evaluation = evaluateNetworkPreflight({ runner, nonce,
    initialProviderProof,
    providerValidator: () => validateProvider(runner) });
  reportNetworkPreflight(evaluation);
  assertManifestPreserved(initialManifest);
  const mutationCount = counters.imageBuilds + counters.networksCreated +
    counters.containersCreated + counters.databaseConnections +
    counters.migrations + counters.dynamicCases + counters.evidenceWrites;
  if (mutationCount !== 0) throw new Error(
    "DAY147_A5_MINIMAL_NETWORK_PREFLIGHT_DIAGNOSTIC_MUTATION");
  console.log(JSON.stringify({
    day147_a5_minimal_network_preflight_diagnostic:
      evaluation.result.ok ? "READY_FOR_MINIMAL_V2_EXECUTION" : "BLOCKED",
    execution_nonce: nonce,
    network_mutations: counters.networksCreated,
    postgres_create_attempts: counters.containersCreated,
    database_connection_attempts: counters.databaseConnections,
    migration_attempts: counters.migrations,
    case_registry_attempts: counters.dynamicCases,
    formal_evidence_writes: counters.evidenceWrites,
  }));
  if (!evaluation.result.ok) process.exitCode = 1;
}

function validatePostgresObservation(input: Readonly<{
  observation: Record<string, unknown>;
  receipt: Receipt;
  names: MinimalNames;
  expectedImageId: string;
}>): void {
  validateContainerBinding({ observation: input.observation,
    receipt: input.receipt, expectedRole: "minimal_postgres" });
  const hostConfig = input.observation.HostConfig as Record<string, unknown> | undefined;
  const network = (input.observation.NetworkSettings as Record<string, unknown> | undefined)
    ?.Networks as Record<string, unknown> | undefined;
  const bound = network?.[input.names.network] as Record<string, unknown> | undefined;
  const aliases = bound?.Aliases;
  if (input.observation.Image !== input.expectedImageId ||
    hostConfig?.NetworkMode !== input.names.network ||
    JSON.stringify(hostConfig?.PortBindings ?? {}) !== "{}" ||
    typeof hostConfig?.Tmpfs !== "object" || hostConfig.Tmpfs === null ||
    !("/var/lib/postgresql/data" in (hostConfig.Tmpfs as object)) ||
    !Array.isArray(aliases) || !aliases.includes("postgres") ||
    Array.isArray(input.observation.Mounts) &&
      (input.observation.Mounts as unknown[]).length !== 0) {
    throw new Error("DAY147_A5_MINIMAL_POSTGRES_BINDING_INVALID");
  }
}

function executeMinimalNetwork(): void {
  const counters = ZERO_COUNTERS();
  const runner = productionRunner(counters);
  const nonce = randomBytes(6).toString("hex");
  const names = namesForNonce(nonce);
  const initialManifest = existingFailureArtifactManifest();
  const tsbuildDigest = sha256(readFileSync(resolve(ROOT, "tsconfig.tsbuildinfo")));
  const receipts: Receipt[] = [];
  const password = randomBytes(32).toString("hex");
  let providerValidated = false;
  let providerProof: Day147A5OrbStackProviderProof | null = null;
  let postgresImageId = "";
  let readinessElapsedMs = 0;
  let result: Day147A5ClientResult | null = null;
  let bundleSha256 = "";
  let primaryFailure: string | null = null;
  let runnerFailure: RunnerFailureObservation | null = null;
  let resultTransport: ResultTransportReport = rejectedResultTransport(
    false, "NOT_OBSERVED");
  let transitionProvenance: TransitionSemanticObservation | null = null;
  let cleanup: CleanupResult = emptyCleanupResult();
  try {
    validateRepositoryGate(runner, initialManifest, "execute-minimal-network");
    const migrationSql = readMigrationSql();
    const bundle = createClientBundle({ runner, names, migrationSql });
    bundleSha256 = bundle.sha256;
    validateHostBundleSyntax({ runner, bundle });
    validateHostBundleModuleInitialization({ runner, bundle });
    verifyBundleBeforeMount(bundle, names);
    providerProof = validateProvider(runner);
    providerValidated = true;
    const images = inspectRequiredImages(runner);
    postgresImageId = images.postgresImageId;
    const preflight = evaluateNetworkPreflight({ runner, nonce,
      initialProviderProof: providerProof,
      providerValidator: () => validateProvider(runner) });
    reportNetworkPreflight(preflight);
    if (!preflight.result.ok) throw preflightFailureError(preflight.result);
    const networkId = exactNetworkId(commandSucceeded(docker(runner,
      networkCreateArgs(names, nonce)),
    "DAY147_A5_MINIMAL_NETWORK_CREATE_FAILED").stdout);
    counters.networksCreated += 1;
    const networkReceipt: Receipt = { resource: "network",
      canonicalId: networkId, expectedName: names.network, nonce,
      preExisting: false };
    receipts.push(networkReceipt);
    validateNetworkObservation({ observation: requirePresentInspect(
      dockerInspect({ runner, args: ["network", "inspect", networkId],
        resource: "network", canonicalId: networkId }),
      "DAY147_A5_MINIMAL_NETWORK_INSPECT_INVALID"), receipt: networkReceipt });

    const postgresId = exactContainerId(commandSucceeded(docker(runner,
      postgresCreateArgs({ names, nonce }), {
        environment: postgresEnvironment({ password, names }),
      }), "DAY147_A5_MINIMAL_POSTGRES_CREATE_FAILED").stdout,
    "DAY147_A5_MINIMAL_POSTGRES_ID_INVALID");
    counters.containersCreated += 1;
    const postgresReceipt: Receipt = { resource: "postgres",
      canonicalId: postgresId, expectedName: names.postgres, nonce,
      preExisting: false };
    receipts.push(postgresReceipt);
    validatePostgresObservation({ observation: requirePresentInspect(
      dockerInspect({ runner, args: ["container", "inspect", postgresId],
        resource: "container", canonicalId: postgresId }),
      "DAY147_A5_MINIMAL_POSTGRES_INSPECT_INVALID"), receipt: postgresReceipt,
      names, expectedImageId: postgresImageId });
    const readinessStarted = performance.now();
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const observation = docker(runner, ["container", "exec", postgresId,
        "pg_isready", "-h", "127.0.0.1", "-p", "5432",
        "-U", "day147a5_migration_owner", "-d", names.database],
      { allowFailure: true });
      if (observation.status === 0) { ready = true; break; }
      if (![1, 2].includes(observation.status)) {
        throw new Error("DAY147_A5_MINIMAL_POSTGRES_INTERNAL_READINESS_FAILED");
      }
      delay(250);
    }
    readinessElapsedMs = Math.floor(performance.now() - readinessStarted);
    if (!ready) throw new Error(
      "DAY147_A5_MINIMAL_POSTGRES_INTERNAL_READINESS_FAILED");

    verifyBundleBeforeMount(bundle, names);
    createResultDirectory(names);
    assertResultFileAbsent(names);
    const environment = runnerEnvironment({ nonce, password, names,
      bundleSha256: bundle.sha256 });
    const runnerCreate = docker(runner, runnerCreateArgs({ names, nonce }),
      { environment, allowFailure: true });
    if (runnerCreate.status !== 0) {
      throw new Error("DAY147_A5_MINIMAL_RESULT_BIND_MOUNT_FAILED");
    }
    const runnerId = exactContainerId(runnerCreate.stdout,
    "DAY147_A5_MINIMAL_RUNNER_ID_INVALID");
    counters.containersCreated += 1;
    const runnerReceipt: Receipt = { resource: "runner",
      canonicalId: runnerId, expectedName: names.runner, nonce,
      preExisting: false };
    receipts.push(runnerReceipt);
    commandSucceeded(docker(runner, ["container", "start", runnerId]),
      "DAY147_A5_MINIMAL_RUNNER_START_FAILED");
    let bindingPassed = false;
    for (let check = 0; check < POST_START_INSPECT_LIMIT; check += 1) {
      const classified = dockerInspect({ runner,
        args: ["container", "inspect", runnerId], resource: "container",
        canonicalId: runnerId });
      if (classified.kind !== "PRESENT") {
        throw runnerInspectFailure(classified);
      }
      const observation = classified.value as Record<string, unknown>;
      try {
        if (validateRunnerSecurityObservation({ observation,
          receipt: runnerReceipt, names })) { bindingPassed = true; break; }
      } catch {
        throw new Error("DAY147_A5_MINIMAL_RUNNER_IDENTITY_MISMATCH");
      }
      if (check + 1 < POST_START_INSPECT_LIMIT) {
        delay(POST_START_INSPECT_INTERVAL_MS);
      }
    }
    if (!bindingPassed) throw new Error(
      "DAY147_A5_MINIMAL_RUNNER_POST_START_BINDING_FAILED");
    const wait = commandSucceeded(docker(runner,
      ["container", "wait", runnerId]),
    "DAY147_A5_MINIMAL_RUNNER_WAIT_FAILED");
    const waitedExitCode = Number(wait.stdout.trim());
    const exitInspect = dockerInspect({ runner,
      args: ["container", "inspect", runnerId], resource: "container",
      canonicalId: runnerId });
    let inspectedState: ReturnType<typeof runnerExitState> | null = null;
    let inspectFailure: Error | null = null;
    if (exitInspect.kind === "PRESENT") {
      try {
        inspectedState = runnerExitState(
          exitInspect.value as Record<string, unknown>,
        );
      } catch (error) {
        inspectFailure = error instanceof Error ? error :
          new Error("DAY147_A5_MINIMAL_RUNNER_INSPECT_UNEXPECTED_SHAPE");
      }
    } else inspectFailure = runnerInspectFailure(exitInspect);
    const logs = docker(runner, ["container", "logs", runnerId],
      { allowFailure: true });
    const exitCode = inspectedState?.exitCode ?? waitedExitCode;
    if (inspectFailure !== null) throw inspectFailure;
    if (!Number.isSafeInteger(waitedExitCode) || waitedExitCode !== exitCode) {
      throw new Error("DAY147_A5_MINIMAL_RUNNER_EXIT_STATE_MISMATCH");
    }
    let observedResult: Day147A5ClientResult | null = null;
    let resultTransportFailure: Error | null = null;
    const resultFilePresent = pathExistsNoFollow(names.result);
    try {
      const validated = validateResultFile(names, nonce, bundle.sha256);
      observedResult = validated.result;
      resultTransport = validated.transport;
    } catch (error) {
      resultTransportFailure = error instanceof Error ? error :
        new Error("DAY147_A5_MINIMAL_RESULT_FILE_READ_FAILED");
      resultTransport = rejectedResultTransport(resultFilePresent,
        resultTransportFailure.message);
    }
    runnerFailure = classifyRunnerFailure({ exitCode,
      stateError: inspectedState?.stateError ?? "",
      oomKilled: inspectedState?.oomKilled ?? false,
      stdout: logs.stdout, stderr: logs.stderr, resultFilePresent,
      result: observedResult });
    if (exitCode !== 0) {
      if (runnerFailure.result_validator === "REJECTED_FAILURE_CODE_MISMATCH" ||
        runnerFailure.result_validator === "REJECTED_MARKER_SEQUENCE") {
        throw new Error("DAY147_A5_MINIMAL_RUNNER_FAILURE_CONTRACT_INVALID");
      }
      if (runnerFailure.fixed_failure_code ===
        "RUNNER_BUNDLE_INTEGRITY_FAILED") {
        throw new Error(
          "DAY147_A5_MINIMAL_BUNDLE_HASH_MISMATCH_IN_RUNNER",
        );
      }
      throw new Error("DAY147_A5_MINIMAL_RUNNER_FAILED");
    }
    if (resultTransportFailure !== null) throw resultTransportFailure;
    if (observedResult === null ||
      resultTransport.result_validator !== "ACCEPTED") {
      throw new Error("DAY147_A5_MINIMAL_RESULT_FILE_NOT_CREATED");
    }
    result = observedResult;
    transitionProvenance = parseTransitionSemanticObservation(
      logs.stderr, observedResult,
    );
    if (result.result !== "PASS") {
      throw new Error(result.failure_code ??
        "DAY147_A5_MINIMAL_DYNAMIC_VALIDATION_FAILED");
    }
    counters.databaseConnections = result.client_cleanup.clients_created;
    counters.migrations = 1;
    counters.dynamicCases = result.case_registry.executed_count;
  } catch (error) {
    const candidate = error instanceof Error ? error.message : "";
    primaryFailure = /^(?:DAY147_A5_[A-Z0-9_]+|BLOCKED_[A-Z0-9_]+)$/.test(candidate)
      ? candidate : "DAY147_A5_MINIMAL_EXECUTION_FAILED";
  } finally {
    cleanup = cleanupExactResources({ receipts,
      actions: productionCleanupActions({ runner, names, nonce,
        providerProof }) });
  }

  if (!cleanup.overallCleanupPass) {
    primaryFailure ??= "DAY147_A5_MINIMAL_CLEANUP_FAILED";
  }
  assertManifestPreserved(initialManifest);
  if (sha256(readFileSync(resolve(ROOT, "tsconfig.tsbuildinfo"))) !==
    tsbuildDigest) throw new Error("DAY147_A5_MINIMAL_TSCONFIG_PROTECTED");

  if (primaryFailure === null && result !== null &&
    transitionProvenance !== null &&
    isAcceptedResultTransport(resultTransport)) {
    const chain = buildSuccessChain(successEvidence({ nonce, result,
      postgresImageId, readinessElapsedMs, transitionProvenance,
      resultTransport, cleanup }));
    try {
      writeEvidence({ nonce, success: chain, counters });
    } catch (error) {
      const durability = error instanceof SuccessChainDurabilityError
        ? error : new SuccessChainDurabilityError(
          "DAY147_A5_SUCCESS_CHAIN_DURABILITY_FAILED",
          "INVALIDATION_FAILED", true,
        );
      console.error(JSON.stringify({
        day147_a5_minimal_network_execution: "FAILED_EVIDENCE",
        execution_nonce: nonce,
        primary_result: "DYNAMIC_PASS",
        evidence_writer_failure: durability.message,
        evidence_writer_primary: durability.primary,
        success_chain_state: durability.state,
        residual_success_chain_possible: durability.residualSuccessChainPossible,
        artifact_relative_root:
          `reports/day147a5-isolated-postgres/runs/${nonce}`,
      }));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ day147_a5_minimal_network_execution: "PASS",
      execution_nonce: nonce, bundle_sha256: bundleSha256,
      cases_executed: result.case_registry.executed_count, cleanup: "PASS",
      result_transport: resultTransport,
      semantic_evidence: {
        schema_version: FARM_OS_DAY147A5_SEMANTIC_EVIDENCE_SCHEMA_VERSION,
        validator: "ACCEPTED",
        evidence_sha256: sha256FarmOsDay147A5RawBytes(chain.evidenceBytes),
        receipt_sha256: sha256FarmOsDay147A5RawBytes(chain.receiptBytes),
        commit_sha256: sha256FarmOsDay147A5RawBytes(chain.markerBytes),
        committed_chain_validator: "ACCEPTED",
      },
      cleanup_resources: cleanupOperatorReport(cleanup), residual_resources: 0 }));
    return;
  }
  const failure = validateFailureChain(failureEvidence({ nonce,
    primary: primaryFailure ?? "DAY147_A5_MINIMAL_EXECUTION_FAILED",
    cleanup, providerValidated }));
  writeEvidence({ nonce, failure, counters });
  console.error(JSON.stringify({ day147_a5_minimal_network_execution: "FAILED",
    execution_nonce: nonce, primary_failure: primaryFailure,
    runner_failure: runnerFailure,
    result_transport: resultTransport,
    cleanup_failures: cleanup.failures,
    cleanup_resources: cleanupOperatorReport(cleanup),
    host_retry_executed: false }));
  process.exitCode = 1;
}

const CONCURRENCY_TIMELINE = Object.freeze([
  "writer1_begin", "writer1_active_inserted", "writer2_begin",
  "writer2_insert_started", "observer_exact_lock_wait_confirmed",
  "writer1_committed", "writer2_duplicate_active_rejected",
  "writer2_rolled_back", "final_active_count_confirmed", "clients_closed",
  "writer1_begin", "writer1_active_inserted", "writer2_begin",
  "writer2_insert_started", "observer_exact_lock_wait_confirmed",
  "writer1_committed", "writer2_duplicate_active_rejected",
  "writer2_rolled_back", "final_active_count_confirmed", "clients_closed",
]);

let staticBundleSha256: string | null = null;

function staticClientInput(nonce = "abcdef123456"): Day147A5ClientSuiteInput {
  return Object.freeze({
    executionNonce: nonce,
    databaseHost: "postgres",
    databasePort: 5432,
    databaseUser: "day147a5_migration_owner",
    databasePassword: "p".repeat(64),
    databaseName: `farmos_day147a5_${nonce}_main`,
    bundleIntegrity: Object.freeze({ expectedSha256: "a".repeat(64),
      observedSha256: "a".repeat(64) }),
    migrationSql: Object.freeze({
      day146: "-- day146 exact fixture",
      prepare: Object.freeze({ apply: "-- prepare apply exact fixture",
        verify: "-- prepare verify exact fixture" }),
      activate: Object.freeze({ apply: "-- activate apply exact fixture",
        verify: "-- activate verify exact fixture" }),
    }),
  });
}

function passingSharedResult(): Day147A5SharedClientAdapterResult {
  return Object.freeze({
    postgres_version: "17.5",
    test_results: Object.freeze(DAY147_A5_CLIENT_CASE_REGISTRY.map(
      ({ id, category }) => Object.freeze({ id, category,
        status: "PASS" as const }),
    )),
    concurrency_timeline: CONCURRENCY_TIMELINE,
    row_counts: Object.freeze({ snapshots: 4, projections: 8,
      events: 12, lineage: 4 }),
    state_invariants: Object.freeze({ baseline_digest: "b".repeat(64),
      final_digest: "b".repeat(64), automatic_promotion_count: 0,
      active_state_unchanged: true, comparison_complete: true }),
    migration_results: Object.freeze({
      day146: "PASS", prepare_apply: "PASS", prepare_verify: "PASS",
      activate_apply: "PASS", activate_verify: "PASS",
    }),
    cleanup: Object.freeze({ created_count: 12, close_attempted_count: 12,
      close_completed_count: 12, close_failed_count: 0,
      open_client_count_after_cleanup: 0, duplicate_close_attempt_count: 0 }),
    failure_code: null,
  });
}

async function runClientSuiteStaticTests(): Promise<Day147A5ClientResult> {
  assert.equal(DAY147_A5_CLIENT_CASE_REGISTRY.length, 102);
  assert.equal(new Set(DAY147_A5_CLIENT_CASE_REGISTRY.map(({ id }) => id)).size,
    102);
  assert.equal(caseRegistryDigest(), DAY147_A5_EXPECTED_REGISTRY_DIGEST);
  assert.deepEqual(DAY147_A5_CLIENT_CASE_REGISTRY.map(({ id }) => id),
    orderedCaseRegistryIds());
  const observedMigrationSql: string[] = [];
  const passing = await runDay147A5ClientSuiteWithDependencies(
    staticClientInput(), { async executeSharedSuite(input) {
      observedMigrationSql.push(input.migrationSql.day146);
      return passingSharedResult();
    } });
  assert.deepEqual(observedMigrationSql, ["-- day146 exact fixture"]);
  assert.equal(passing.result, "PASS");
  assert.equal(passing.case_registry.executed_count, 102);
  assert.equal(passing.case_registry.exact_case_set, true);
  assert.equal(passing.case_registry.duplicate_count, 0);
  assert.equal(passing.case_registry.missing_count, 0);
  assert.equal(passing.case_registry.unknown_count, 0);
  assert.equal(passing.case_registry.failed_count, 0);
  assert.equal(passing.state_invariants.automatic_promotion_count, 0);
  assert.equal(passing.state_invariants.active_state_unchanged, true);

  const migrationFailure = await runDay147A5ClientSuiteWithDependencies(
    staticClientInput("111111111111"), { async executeSharedSuite() {
      return { ...passingSharedResult(), postgres_version: null,
        test_results: [], concurrency_timeline: [], row_counts: {},
        migration_results: undefined,
        failure_code: "DAY147_A5_MINIMAL_MIGRATION_FAILED" };
    } });
  assert.equal(migrationFailure.result, "FAIL");
  assert.equal(migrationFailure.case_registry.executed_count, 0);
  assert.equal(migrationFailure.migration_results.day146, "FAILED");

  const failedCases = [...passingSharedResult().test_results];
  failedCases[0] = { ...failedCases[0]!, status: "FAIL" };
  const caseFailure = await runDay147A5ClientSuiteWithDependencies(
    staticClientInput("222222222222"), { async executeSharedSuite() {
      return { ...passingSharedResult(), test_results: failedCases };
    } });
  assert.equal(caseFailure.result, "FAIL");
  assert.equal(caseFailure.case_registry.failed_count, 1);

  const partialCaseFailure = await runDay147A5ClientSuiteWithDependencies(
    staticClientInput("444444444444"), { async executeSharedSuite() {
      return {
        ...passingSharedResult(),
        test_results: passingSharedResult().test_results.slice(0, 1),
        concurrency_timeline: [],
        row_counts: {},
        state_invariants: undefined,
        failure_code: "DAY147_A5_MINIMAL_CASE_SUITE_FAILED",
      };
    } });
  assert.equal(partialCaseFailure.result, "FAIL");
  assert.equal(partialCaseFailure.case_registry.executed_count, 1);
  assert.equal(partialCaseFailure.case_registry.missing_count, 101);
  assert.deepEqual(partialCaseFailure.migration_results, {
    day146: "PASS", prepare_apply: "PASS", prepare_verify: "PASS",
    activate_apply: "PASS", activate_verify: "PASS",
  });

  const cleanupFailure = await runDay147A5ClientSuiteWithDependencies(
    staticClientInput("333333333333"), { async executeSharedSuite() {
      return { ...passingSharedResult(), cleanup: {
        ...passingSharedResult().cleanup, close_completed_count: 11,
        close_failed_count: 1, open_client_count_after_cleanup: 1,
      } };
    } });
  assert.equal(cleanupFailure.result, "FAIL");
  assert.equal(cleanupFailure.client_cleanup.close_failed, 1);
  return passing;
}

async function runDatabaseConnectionStaticTests(): Promise<void> {
  const nonce = "abcdef123456";
  const names = namesForNonce(nonce);
  const postgresArgs = postgresCreateArgs({ names, nonce });
  const runnerArgs = runnerCreateArgs({ names, nonce });
  assert.equal(postgresArgs.includes(`--network=${names.network}`), true);
  assert.equal(postgresArgs.includes("--network-alias=postgres"), true);
  assert.equal(runnerArgs.includes(`--network=${names.network}`), true);
  assert.equal(postgresArgs.some((argument) =>
    argument === "--publish" || argument.startsWith("--publish=") ||
    argument === "-p"
  ), false);
  assert.equal(postgresArgs.some((argument) =>
    argument.includes("farmos-postgres") || argument.includes("compose") ||
    argument === "--network=host"
  ), false);
  assert.deepEqual(runnerEnvironment({ nonce, password: "p".repeat(64), names,
    bundleSha256: "a".repeat(64) }), {
    FARMOS_A5_EXECUTION_NONCE: nonce,
    FARMOS_DAY147_A5_BUNDLE_SHA256: "a".repeat(64),
    FARMOS_A5_CLIENT_RESULT_PATH: "/result/client-result.json",
    PGHOST: "postgres",
    PGPORT: "5432",
    PGUSER: "day147a5_migration_owner",
    PGPASSWORD: "p".repeat(64),
    PGDATABASE: names.database,
  });

  const postgresId = "b".repeat(64);
  const imageId = `sha256:${"d".repeat(64)}`;
  const receipt: Receipt = { resource: "postgres", canonicalId: postgresId,
    expectedName: names.postgres, nonce, preExisting: false };
  const postgresObservation = (aliases: readonly string[]) => ({
    Id: postgresId,
    Name: `/${names.postgres}`,
    Image: imageId,
    Config: { Labels: {
      "farmos.day147a5.execution_nonce": nonce,
      "farmos.day147a5.resource_role": "minimal_postgres",
    } },
    HostConfig: { NetworkMode: names.network, PortBindings: {},
      Tmpfs: { "/var/lib/postgresql/data": "rw" } },
    NetworkSettings: { Networks: { [names.network]: { Aliases: aliases } } },
    Mounts: [],
  });
  validatePostgresObservation({ observation: postgresObservation(["postgres"]),
    receipt, names, expectedImageId: imageId });
  for (const aliases of [[], ["database"], [names.postgres]]) {
    assert.throws(() => validatePostgresObservation({
      observation: postgresObservation(aliases), receipt, names,
      expectedImageId: imageId,
    }), /DAY147_A5_MINIMAL_POSTGRES_BINDING_INVALID/);
  }

  for (const [code, expected] of [
    ["ENOTFOUND", "DB_DNS_LOOKUP_FAILED"],
    ["ECONNREFUSED", "DB_CONNECTION_REFUSED"],
    ["ECONNRESET", "DB_CONNECTION_RESET"],
    ["ETIMEDOUT", "DB_CONNECTION_TIMEOUT"],
    ["28P01", "DB_AUTHENTICATION_FAILED"],
    ["3D000", "DB_DATABASE_NOT_FOUND"],
    ["57P03", "DB_SERVER_STARTING"],
    ["ERR_SSL_WRONG_VERSION_NUMBER", "DB_SSL_CONFIGURATION_FAILED"],
    ["08P01", "DB_PROTOCOL_FAILED"],
    ["UNCLASSIFIED", "DB_UNKNOWN_CONNECTION_FAILURE"],
  ] as const) {
    const raw = Object.assign(new Error(
      "password=forbidden postgresql://forbidden /Users/forbidden",
    ), { code });
    const classified = classifyDay147A5DatabaseConnectionError(raw);
    assert.equal(classified, expected, code);
    assert.doesNotMatch(JSON.stringify(classified),
      /(?:password|postgres(?:ql)?:\/\/|\/Users\/)/i);
  }

  let callbackCount = 0;
  let closeCount = 0;
  let capturedConfig: Record<string, unknown> | null = null;
  await verifyDay147A5RunnerDatabaseConnection({
    ...staticClientInput(nonce),
    onDatabaseConnectionReady() { callbackCount += 1; },
  }, {
    createClient(config) {
      capturedConfig = { ...config, password: "[REDACTED]" };
      return {
        async connect() {},
        async end() { closeCount += 1; },
      };
    },
  });
  assert.equal(callbackCount, 1);
  assert.equal(closeCount, 1);
  assert.deepEqual(capturedConfig, {
    host: "postgres", port: 5432, database: names.database,
    user: "day147a5_migration_owner", password: "[REDACTED]", ssl: false,
    connectionTimeoutMillis: 5_000,
    application_name: `farmos_day147a5_${nonce}_main_owner`,
  });

  let failedCloseCount = 0;
  await assert.rejects(verifyDay147A5RunnerDatabaseConnection(
    staticClientInput(nonce), {
      createClient() {
        return {
          async connect() {
            throw Object.assign(new Error(
              "password=forbidden postgresql://forbidden /Users/forbidden",
            ), { code: "ENOTFOUND" });
          },
          async end() { failedCloseCount += 1; },
        };
      },
    }),
  (error: unknown) => error instanceof Error &&
    error.message === "RUNNER_DATABASE_CONNECTION_FAILED" &&
    "failureClass" in error && error.failureClass === "DB_DNS_LOOKUP_FAILED" &&
    !/(?:password|postgres(?:ql)?:\/\/|\/Users\/)/i.test(
      JSON.stringify(error),
    ));
  assert.equal(failedCloseCount, 1);
}

function runMigrationDiagnosticStaticTests(): void {
  const cases = [
    ["42601", "MIGRATION_SYNTAX_ERROR"],
    ["42P01", "MIGRATION_UNDEFINED_TABLE"],
    ["42703", "MIGRATION_UNDEFINED_COLUMN"],
    ["42710", "MIGRATION_DUPLICATE_OBJECT"],
    ["42501", "MIGRATION_INSUFFICIENT_PRIVILEGE"],
    ["23514", "MIGRATION_CHECK_VIOLATION"],
    ["23503", "MIGRATION_FOREIGN_KEY_VIOLATION"],
    ["23505", "MIGRATION_UNIQUE_VIOLATION"],
    ["P0001", "MIGRATION_RAISED_EXCEPTION"],
    ["25P02", "MIGRATION_TRANSACTION_FAILURE"],
    ["XX000", "MIGRATION_INTERNAL_DATABASE_ERROR"],
    ["08006", "MIGRATION_CONNECTION_FAILURE"],
    ["ECONNRESET", "MIGRATION_CONNECTION_FAILURE"],
    ["ZZ999", "MIGRATION_UNKNOWN_FAILURE"],
  ] as const;
  for (const [code, expected] of cases) {
    const diagnostic = classifyDay147A5MigrationFailure({
      stage: "LEGACY_ACTIVE_DAY146_APPLY",
      error: Object.assign(new Error(
        "select forbidden password=forbidden postgresql://forbidden",
      ), { code }),
    });
    assert.equal(diagnostic.failureClass, expected, code);
    assert.equal(diagnostic.sqlstate,
      /^[0-9A-Z]{5}$/.test(code) ? code : "NONE");
    assert.equal(diagnostic.fixedFailureCode,
      "RUNNER_DAY146_MIGRATION_FAILED");
    assert.doesNotMatch(JSON.stringify(diagnostic),
      /(?:select|password|postgres(?:ql)?:\/\/|stack)/iu);
  }
  assert.equal(classifyDay147A5MigrationFailure({
    stage: "MAIN_PREPARE_VERIFY",
    error: Object.assign(new Error("hidden"), { code: "23514" }),
  }).fixedFailureCode, "RUNNER_PREPARE_MIGRATION_FAILED");
  assert.equal(classifyDay147A5MigrationFailure({
    stage: "MAIN_ACTIVATE_APPLY",
    error: Object.assign(new Error("hidden"), { code: "42501" }),
  }).fixedFailureCode, "RUNNER_ACTIVATE_MIGRATION_FAILED");

  const migrationFailure = (input: Readonly<{
    through: Day147A5RunnerPhase;
    code: Day147A5RunnerFailureCode;
    stage: Day147A5MigrationStage;
    failureClass: Day147A5MigrationFailureClass;
    sqlstate: string;
  }>): RunnerFailureObservation => {
    const markerCount = DAY147_A5_RUNNER_PHASES.indexOf(input.through) + 1;
    return classifyRunnerFailure({ exitCode: 1, stateError: "",
      oomKilled: false, stdout: "", resultFilePresent: false,
      stderr: [
        ...DAY147_A5_RUNNER_PHASES.slice(0, markerCount).map((phase) =>
          `FARMOS_DAY147_A5_PHASE=${phase}`
        ),
        `FARMOS_DAY147_A5_FAILURE=${input.code}`,
        `FARMOS_DAY147_A5_MIGRATION_STAGE=${input.stage}`,
        `FARMOS_DAY147_A5_MIGRATION_FAILURE_CLASS=${input.failureClass}`,
        `FARMOS_DAY147_A5_MIGRATION_SQLSTATE=${input.sqlstate}`,
        `FARMOS_DAY147_A5_LAST_PHASE=${input.through}`,
      ].join("\n") });
  };
  for (const fixture of [
    { through: "DAY146_MIGRATION_START",
      code: "RUNNER_DAY146_MIGRATION_FAILED",
      stage: "LEGACY_ACTIVE_DAY146_APPLY",
      failureClass: "MIGRATION_SYNTAX_ERROR", sqlstate: "42601" },
    { through: "PREPARE_MIGRATION_START",
      code: "RUNNER_PREPARE_MIGRATION_FAILED",
      stage: "LEGACY_ACTIVE_PREPARE_VERIFY",
      failureClass: "MIGRATION_RAISED_EXCEPTION", sqlstate: "P0001" },
    { through: "ACTIVATE_MIGRATION_START",
      code: "RUNNER_ACTIVATE_MIGRATION_FAILED",
      stage: "LEGACY_ACTIVE_ACTIVATE_APPLY",
      failureClass: "MIGRATION_CHECK_VIOLATION", sqlstate: "23514" },
  ] as const) {
    const observed = migrationFailure(fixture);
    assert.equal(observed.result_validator, "NOT_PRESENT");
    assert.equal(observed.fixed_failure_code, fixture.code);
    assert.equal(observed.migration_stage, fixture.stage);
    assert.equal(observed.migration_failure_class, fixture.failureClass);
    assert.equal(observed.migration_sqlstate, fixture.sqlstate);
    assert.equal(observed.raw_sql_exposed, false);
    assert.equal(observed.credential_exposed, false);
  }
  const mismatched = migrationFailure({
    through: "PREPARE_MIGRATION_START",
    code: "RUNNER_DAY146_MIGRATION_FAILED",
    stage: "LEGACY_ACTIVE_PREPARE_APPLY",
    failureClass: "MIGRATION_SYNTAX_ERROR",
    sqlstate: "42601",
  });
  assert.equal(mismatched.result_validator,
    "REJECTED_MIGRATION_DIAGNOSTIC");
}

function runPreMigrationDiagnosticStaticTests(): void {
  const fixtures = [
    ["SHARED_DYNAMIC_SUITE_START", "ADMIN_CLIENT_CONSTRUCT",
      new Error("unrestricted hidden error"),
      "PRE_MIGRATION_UNKNOWN_FAILURE"],
    ["SHARED_DYNAMIC_SUITE_START", "ADMIN_CLIENT_CONNECT",
      Object.assign(new Error("hidden password postgres://redacted"),
        { code: "ECONNREFUSED" }),
      "PRE_MIGRATION_ADMIN_CONNECTION_FAILED"],
    ["SHARED_DYNAMIC_SUITE_START", "ADMIN_CLIENT_CONNECT",
      Object.assign(new Error("hidden"), { code: "22023" }),
      "PRE_MIGRATION_SESSION_CONFIGURATION_FAILED"],
    ["SHARED_DYNAMIC_SUITE_START", "SERVER_VERSION_QUERY",
      Object.assign(new Error("hidden select secret"), { code: "22023" }),
      "PRE_MIGRATION_SERVER_VERSION_QUERY_FAILED"],
    ["SHARED_DYNAMIC_SUITE_START", "SERVER_VERSION_VALIDATE",
      new Error("DAY147_A5_POSTGRES_VERSION_INVALID"),
      "PRE_MIGRATION_SERVER_VERSION_VALIDATION_FAILED"],
    ["ISOLATED_DATABASES_CREATE_START", "ISOLATED_DATABASES_CREATE",
      Object.assign(new Error("hidden"), { code: "42P04" }),
      "PRE_MIGRATION_DATABASE_CREATE_FAILED"],
    ["MIGRATION_ARTIFACTS_READY", "PRE_MIGRATION_UNKNOWN",
      Object.assign(new Error("unrestricted hidden error"), { code: "42501" }),
      "PRE_MIGRATION_UNKNOWN_FAILURE"],
  ] as const;
  for (const [lastPhase, operationKey, error, expectedClass] of fixtures) {
    const diagnostic = classifyDay147A5PreMigrationFailure({
      lastPhase,
      operationKey,
      error,
    });
    assert.equal(diagnostic.operationKey, operationKey);
    assert.equal(diagnostic.failureClass, expectedClass);
    assert.equal(diagnostic.fixedFailureCode,
      "RUNNER_PRE_MIGRATION_SETUP_FAILED");
    assert.doesNotMatch(JSON.stringify(diagnostic),
      /(?:unrestricted|password|postgres(?:ql)?:\/\/|stack|select\s)/iu);
  }
  const adminConnection = classifyDay147A5PreMigrationFailure({
    lastPhase: "SHARED_DYNAMIC_SUITE_START",
    operationKey: "ADMIN_CLIENT_CONNECT",
    error: Object.assign(new Error("hidden"), { code: "08006" }),
  });
  assert.equal(adminConnection.nodeErrorCode, "NONE");
  assert.equal(adminConnection.sqlstate, "08006");

  const markerCount = DAY147_A5_RUNNER_PHASES.indexOf(
    "SHARED_DYNAMIC_SUITE_START",
  ) + 1;
  const valid = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: [
      ...DAY147_A5_RUNNER_PHASES.slice(0, markerCount).map((phase) =>
        `FARMOS_DAY147_A5_PHASE=${phase}`
      ),
      "FARMOS_DAY147_A5_FAILURE=RUNNER_PRE_MIGRATION_SETUP_FAILED",
      "FARMOS_DAY147_A5_PRE_MIGRATION_OPERATION=SERVER_VERSION_QUERY",
      "FARMOS_DAY147_A5_PRE_MIGRATION_FAILURE_CLASS=" +
        "PRE_MIGRATION_SERVER_VERSION_QUERY_FAILED",
      "FARMOS_DAY147_A5_PRE_MIGRATION_SQLSTATE=22023",
      "FARMOS_DAY147_A5_LAST_PHASE=SHARED_DYNAMIC_SUITE_START",
    ].join("\n") });
  assert.equal(valid.result_validator, "NOT_PRESENT");
  assert.equal(valid.pre_migration_operation, "SERVER_VERSION_QUERY");
  assert.equal(valid.pre_migration_failure_class,
    "PRE_MIGRATION_SERVER_VERSION_QUERY_FAILED");
  assert.equal(valid.pre_migration_sqlstate, "22023");
  assert.equal(valid.admin_connection_passed, true);
  assert.equal(valid.migration_started, false);
  assert.equal(valid.migration_stage, null);
  assert.equal(valid.raw_sql_exposed, false);
  assert.equal(valid.credential_exposed, false);

  const afterMigrationStart = classifyRunnerFailure({ exitCode: 1,
    stateError: "", oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: [
      ...DAY147_A5_RUNNER_PHASES.slice(0,
        DAY147_A5_RUNNER_PHASES.indexOf("DAY146_MIGRATION_START") + 1)
        .map((phase) => `FARMOS_DAY147_A5_PHASE=${phase}`),
      "FARMOS_DAY147_A5_FAILURE=RUNNER_PRE_MIGRATION_SETUP_FAILED",
      "FARMOS_DAY147_A5_PRE_MIGRATION_OPERATION=PRE_MIGRATION_UNKNOWN",
      "FARMOS_DAY147_A5_PRE_MIGRATION_FAILURE_CLASS=" +
        "PRE_MIGRATION_UNKNOWN_FAILURE",
      "FARMOS_DAY147_A5_PRE_MIGRATION_SQLSTATE=NONE",
      "FARMOS_DAY147_A5_LAST_PHASE=DAY146_MIGRATION_START",
    ].join("\n") });
  assert.equal(afterMigrationStart.result_validator,
    "REJECTED_PRE_MIGRATION_DIAGNOSTIC");

  const clientSource = readFileSync(resolve(ROOT,
    "scripts/hermes/lib/farm_os_day147a5_client_suite.ts"), "utf8");
  const sharedSource = readFileSync(resolve(ROOT,
    "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts"), "utf8");
  const runnerSource = clientEntrySource({
    migrationSql: staticClientInput().migrationSql,
  });
  assert.ok(runnerSource.includes("onPreMigrationFailure: (failure) =>"));
  assert.ok(clientSource.includes("executeSharedSuite(input)"));
  assert.ok(sharedSource.includes(
    "onPreMigrationFailure?: ("));
  assert.ok(sharedSource.includes(
    'operation_key: "ADMIN_CLIENT_CONNECT"'));
  assert.ok(sharedSource.includes(
    'operation_key: "SERVER_VERSION_QUERY"'));
  assert.ok(sharedSource.includes(
    'operation_key: "SERVER_VERSION_VALIDATE"'));
  assert.ok(sharedSource.includes(
    "on_execution_phase: emitExecutionPhase"));
  assert.ok(sharedSource.includes(
    "on_phase: input.on_execution_phase"));
  assert.ok(sharedSource.indexOf(
    'emitExecutionPhase("SHARED_DYNAMIC_SUITE_START")') <
    sharedSource.indexOf("runSharedA5DynamicDatabaseSuite({"));
  assert.ok(sharedSource.indexOf(
    'input.on_execution_phase?.("ISOLATED_DATABASES_CREATE_START")') <
    sharedSource.indexOf("createIsolatedDatabases(admin, input.names)"));
  assert.ok(sharedSource.indexOf(
    "createIsolatedDatabases(admin, input.names)") <
    sharedSource.indexOf(
      'input.on_execution_phase?.("ISOLATED_DATABASES_CREATE_PASS")'));

  const splitStartupOptions = (value: string): readonly string[] => {
    const tokens: string[] = [];
    let token = "";
    let escaped = false;
    for (const character of value) {
      if (escaped) {
        token += character;
        escaped = false;
      } else if (character === "\\") escaped = true;
      else if (/\s/u.test(character)) {
        if (token.length > 0) tokens.push(token);
        token = "";
      } else token += character;
    }
    assert.equal(escaped, false);
    if (token.length > 0) tokens.push(token);
    return Object.freeze(tokens);
  };
  const invalidOptions =
    "-c search_path=pg_catalog -c default_transaction_isolation=read committed";
  const correctedOptions =
    "-c search_path=pg_catalog -c default_transaction_isolation=read\\ committed";
  assert.deepEqual(splitStartupOptions(invalidOptions), [
    "-c", "search_path=pg_catalog", "-c",
    "default_transaction_isolation=read", "committed",
  ]);
  assert.deepEqual(splitStartupOptions(correctedOptions), [
    "-c", "search_path=pg_catalog", "-c",
    "default_transaction_isolation=read committed",
  ]);
  assert.ok(sharedSource.includes(
    'default_transaction_isolation=read\\\\ committed'));
  assert.equal(sharedSource.includes(
    'default_transaction_isolation=read committed'), false);
}

function runProviderStaticTests(): void {
  const identity = { uid: 501, gid: 20, home: "/Users/tester",
    username_classification: "OS_ACCOUNT" as const };
  const socketPath = "/Users/tester/.orbstack/run/docker.sock";
  const makeIo = (override: Readonly<{ symlink?: boolean;
    canonical?: string }> = {}) => ({
    lstat(path: string) {
      if (path === socketPath) return { kind: "socket" as const,
        uid: 501, gid: 20, mode: 0o755 };
      return { kind: "directory" as const, uid: 501, gid: 20, mode: 0o700 };
    },
    realpath(path: string) {
      return path === socketPath ? override.canonical ?? socketPath : path;
    },
    inspectComponents() { return { symlink_found: override.symlink ?? false }; },
    currentUserIdentity() { return identity; },
    orbStackApplicationIdentity() { return "SYSTEM_BUNDLE" as const; },
    orbStackProcessIdentity() { return true; },
  });
  const inspect = (input: Readonly<{ name?: string; description?: string;
    host?: string }> = {}) => JSON.stringify([{ Name: input.name ?? "orbstack",
    Metadata: { Description: input.description ?? "OrbStack" },
    Endpoints: { docker: { Host: input.host ?? `unix://${socketPath}`,
      SkipTLSVerify: false } }, TLSMaterial: {} }]);
  const environment = { HOME: identity.home, PATH: "/usr/bin" };
  const recordingRunner = (context: string, inspected: string,
    info = JSON.stringify({ ID: "orbstack-daemon-fixture",
      OperatingSystem: "OrbStack", ServerVersion: "fixture" })) => {
    const calls: readonly string[][] = [];
    const mutableCalls = calls as string[][];
    const runner: CommandRunner = { run(program, args) {
      mutableCalls.push([program, ...args]);
      if (args[0] === "context" && args[1] === "show") {
        return { status: 0, stdout: `${context}\n`, stderr: "" };
      }
      return { status: 0, stdout: args[0] === "info" ? info : inspected,
        stderr: "" };
    } };
    return { runner, calls };
  };
  const valid = recordingRunner("orbstack", inspect());
  const proof = validateProvider(valid.runner, { environment,
    socket_io: makeIo(), current_user_identity: identity });
  assert.equal(proof.context, "orbstack");
  assert.equal(proof.local_unix_socket_verified, true);
  assert.deepEqual(valid.calls.map((call) => call.slice(1, 3)), [
    ["context", "show"], ["context", "inspect"], ["info", "--format"],
  ]);
  assert.equal(valid.calls.some((call) =>
    ["create", "run", "start", "rm", "pull", "build"].includes(call[2] ?? "")),
  false);

  for (const rejected of [
    recordingRunner("default", inspect({ name: "default",
      description: "Docker Engine (system)", host: "unix:///var/run/docker.sock" })),
    recordingRunner("desktop-linux", inspect({ name: "desktop-linux",
      description: "Docker Desktop",
      host: "unix:///Users/tester/Library/Containers/com.docker.docker/Data/docker-cli.sock" })),
    recordingRunner("orbstack", inspect({ host: "ssh://remote.example" })),
    recordingRunner("orbstack", inspect({ host: "tcp://127.0.0.1:2375" })),
  ]) {
    assert.throws(() => validateProvider(rejected.runner, { environment,
      socket_io: makeIo(), current_user_identity: identity }),
    /DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED/);
    assert.equal(rejected.calls.some((call) => call[1] === "info"), false);
  }
  const malformedInfo = recordingRunner("orbstack", inspect(), "{}");
  assert.throws(() => validateProvider(malformedInfo.runner, { environment,
    socket_io: makeIo(), current_user_identity: identity }),
  /DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED/);
  assert.equal(malformedInfo.calls.some((call) => call[1] === "info"), true);

  for (const key of ["DOCKER_HOST", "DOCKER_CONTEXT"] as const) {
    for (const value of ["", "fixture"]) {
      const rejected = recordingRunner("orbstack", inspect());
      assert.throws(() => validateProvider(rejected.runner, {
        environment: { ...environment, [key]: value }, socket_io: makeIo(),
        current_user_identity: identity,
      }), /DAY147_A5_MINIMAL_PROVIDER_ENV_OVERRIDE/);
      assert.equal(rejected.calls.length, 0);
    }
  }
  for (const io of [makeIo({ symlink: true }),
    makeIo({ canonical: "/Users/tester/.orbstack/run/other.sock" })]) {
    const rejected = recordingRunner("orbstack", inspect());
    assert.throws(() => validateProvider(rejected.runner, { environment,
      socket_io: io, current_user_identity: identity }),
    /DAY147_A5_MINIMAL_PROVIDER_GATE_BLOCKED/);
    assert.equal(rejected.calls.some((call) => call[1] === "info"), false);
  }
}

function runNetworkPreflightStaticTests(): void {
  const nonce = "abcdef123456";
  const networkName = networkNameForNonce(nonce);
  assert.equal(networkName, `farmos-day147a5-minimal-${nonce}`);
  assert.ok(networkName.length <= 63);
  assert.match(networkName, /^[a-z0-9][a-z0-9_.-]*$/);
  for (const invalid of ["", "ABCDEF123456", "a".repeat(64),
    "abcdef12345/"]) assert.throws(() => networkNameForNonce(invalid),
  /DAY147_A5_MINIMAL_NETWORK_NAME_INVALID/);
  assert.throws(() => parseArguments([
    "--mode=diagnose-minimal-network-preflight",
    `--authority=${DIAGNOSTIC_AUTHORITY}`,
    "--network=caller-override",
  ]), /DAY147_A5_MINIMAL_ARGUMENT_AUTHORITY_BLOCKED/);
  assert.deepEqual(parseArguments([
    "--mode=diagnose-minimal-network-preflight",
    `--authority=${DIAGNOSTIC_AUTHORITY}`,
  ]), { mode: "diagnose-minimal-network-preflight",
    authority: DIAGNOSTIC_AUTHORITY });

  const result = (status: number, stdout = "", stderr = ""): CommandResult =>
    ({ status, stdout, stderr });
  const notFound = `Error response from daemon: network ${networkName} not found\n`;
  const existing = JSON.stringify([{ Id: "a".repeat(64), Name: networkName }]);
  for (const [observation, expected] of [
    [result(0, existing), "PRESENT"],
    [result(1, "", notFound), "NOT_FOUND"],
    [result(1, "[]\n", notFound), "NOT_FOUND"],
    [result(1, "", "Error response from daemon: network another not found\n"),
      "UNKNOWN_FAILURE"],
    [result(1, "", "permission denied\n"), "PERMISSION_DENIED"],
    [result(1, "", "Cannot connect to the Docker daemon\n"),
      "PROVIDER_UNAVAILABLE"],
    [result(1, "", "context orbstack not found\n"), "PROVIDER_UNAVAILABLE"],
    [result(1, "", "operation timed out\n"), "TIMEOUT"],
    [result(1), "UNKNOWN_FAILURE"],
    [result(1, "", "arbitrary failure\n"), "UNKNOWN_FAILURE"],
    [result(0, "not-json"), "MALFORMED_RESPONSE"],
    [result(1, "conflicting stdout", notFound), "MALFORMED_RESPONSE"],
    [result(0, existing, "conflicting stderr"), "MALFORMED_RESPONSE"],
  ] as const) assert.equal(classifyNetworkInspect({ result: observation,
    exactNetworkName: networkName }), expected);

  const proof: Day147A5OrbStackProviderProof = Object.freeze({
    context: "orbstack", provider_identity_sha256: "b".repeat(64),
    local_unix_socket_verified: true,
  });
  const changedSocketIdentity = Object.freeze({ ...proof,
    provider_identity_sha256: "c".repeat(64) });
  const evaluate = (inspectResult: CommandResult,
    proofs: readonly (Day147A5OrbStackProviderProof | Error)[] = [proof, proof]) => {
    const commands: string[][] = [];
    let proofIndex = 0;
    const evaluation = evaluateNetworkPreflight({ nonce,
      initialProviderProof: proof,
      providerValidator: () => {
        const candidate = proofs[proofIndex++] ?? proof;
        if (candidate instanceof Error) throw candidate;
        return candidate;
      },
      runner: { run(program, args) {
        commands.push([program, ...args]);
        return inspectResult;
      } },
    });
    return { evaluation, commands, proofCalls: proofIndex };
  };
  const absent = evaluate(result(1, "", notFound));
  assert.equal(absent.evaluation.result.ok, true);
  assert.equal(absent.evaluation.inspectClassification, "NOT_FOUND");
  assert.equal(absent.proofCalls, 2);
  assert.deepEqual(absent.commands, [["docker", "network", "inspect",
    networkName]]);
  const collision = evaluate(result(0, existing));
  assert.equal(collision.evaluation.result.ok, false);
  if (!collision.evaluation.result.ok) assert.equal(
    collision.evaluation.result.failureCode, "NETWORK_ALREADY_EXISTS");
  assert.equal(collision.commands.some((command) =>
    command.includes("create") || command.includes("rm")), false);
  const beforeChanged = evaluate(result(1, "", notFound),
    [new Error("context changed")]);
  assert.equal(beforeChanged.evaluation.result.ok, false);
  assert.equal(beforeChanged.commands.length, 0);
  const afterChanged = evaluate(result(1, "", notFound),
    [proof, changedSocketIdentity]);
  assert.equal(afterChanged.evaluation.result.ok, false);
  if (!afterChanged.evaluation.result.ok) assert.equal(
    afterChanged.evaluation.result.failureCode, "PROVIDER_IDENTITY_CHANGED");
  const counters = ZERO_COUNTERS();
  assert.equal(counters.networksCreated, 0);
  assert.equal(counters.containersCreated, 0);
  assert.equal(counters.evidenceWrites, 0);
}

async function runCaseSuiteDiagnosticStaticTests(): Promise<void> {
  const oneCompletedCase = Object.freeze(["initial_candidate_valid"]);
  const fixtures = [
    ["CASE_REGISTRY_PRECHECK", "NONE", null, Object.freeze([]),
      new Error("hidden select password"), "CASE_REGISTRY_CONTRACT_FAILED"],
    ["CASE_EXECUTION", "REPOSITORY_INTEGRATION", null, oneCompletedCase,
      Object.assign(new Error("hidden"), { code: "ECONNREFUSED" }),
      "CASE_CLIENT_SETUP_FAILED"],
    ["CASE_EXECUTION", "NONE", "initial_candidate_valid", oneCompletedCase,
      Object.assign(new Error("hidden"), { code: "23514" }),
      "CASE_SQL_EXECUTION_FAILED"],
    ["CASE_EXECUTION", "NONE", "initial_candidate_valid", oneCompletedCase,
      Object.assign(new Error("hidden"), { name: "AssertionError" }),
      "CASE_ASSERTION_FAILED"],
    ["CASE_EXECUTION", "NONE", "initial_active_rejected", oneCompletedCase,
      Object.assign(new Error("hidden"), { name: "AssertionError" }),
      "CASE_EXPECTED_REJECTION_MISMATCH"],
    ["CASE_RESULT_AGGREGATION", "NONE", "initial_candidate_valid",
      oneCompletedCase, new Error("hidden"),
      "CASE_RESULT_AGGREGATION_FAILED"],
    ["CASE_EXECUTION", "ATOMICITY_INTEGRATION", null, oneCompletedCase,
      new Error("DAY147_A5_NETWORK_CLIENT_CLEANUP_FAILED"),
      "CASE_CLEANUP_FAILED"],
    ["CASE_EXECUTION", "CONCURRENCY_INTEGRATION", null, oneCompletedCase,
      new Error("unrestricted hidden error"), "CASE_UNKNOWN_FAILURE"],
  ] as const;
  for (const [operation, integrationKey, caseId, completedCaseIds, error,
    expectedClass] of fixtures) {
    const diagnostic = classifyDay147A5CaseFailure({
      operation,
      integration_key: integrationKey,
      case_id: caseId,
      completed_case_count: completedCaseIds.length,
      completed_case_ids: completedCaseIds,
      error,
    });
    assert.equal(diagnostic.operation, operation);
    assert.equal(diagnostic.integrationKey, integrationKey);
    assert.equal(diagnostic.caseId, caseId ?? "NONE");
    assert.equal(diagnostic.failureClass, expectedClass);
    assert.equal(diagnostic.completedCaseCount, completedCaseIds.length);
    assert.equal(diagnostic.initialCandidateCompleted,
      completedCaseIds.length === 1);
    assert.equal(diagnostic.fixedFailureCode, "RUNNER_CASE_SUITE_FAILED");
    assert.doesNotMatch(JSON.stringify(diagnostic),
      /(?:hidden|password|postgres(?:ql)?:\/\/|select\s|stack)/iu);
  }
  const readAssertionError = Object.assign(new Error("hidden"), {
    name: "AssertionError",
  });
  const readDiagnostic = classifyDay147A5CaseFailure({
    operation: "CASE_EXECUTION",
    integration_key: "READ_ADAPTER_INTEGRATION",
    case_id: "read_active_plus_candidate_selects_active",
    completed_case_count: 1,
    completed_case_ids: oneCompletedCase,
    assertion_id: "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
    expected_class: "EXPECTED_IDENTITY",
    actual_class: "UNEXPECTED_IDENTITY",
    error: readAssertionError,
  });
  assert.equal(readDiagnostic.assertionId,
    "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED");
  assert.equal(readDiagnostic.expectedClass, "EXPECTED_IDENTITY");
  assert.equal(readDiagnostic.actualClass, "UNEXPECTED_IDENTITY");
  assert.throws(() => classifyDay147A5CaseFailure({
    operation: "CASE_EXECUTION",
    integration_key: "READ_ADAPTER_INTEGRATION",
    case_id: "read_active_plus_candidate_selects_active",
    completed_case_count: 1,
    completed_case_ids: oneCompletedCase,
    assertion_id: "UNKNOWN_ASSERTION" as "READ_CANDIDATE_ONLY_EXCLUDED",
    expected_class: "EXPECTED_IDENTITY",
    actual_class: "UNEXPECTED_IDENTITY",
    error: readAssertionError,
  }), { message: "DAY147_A5_CASE_FAILURE_NOTIFICATION_INVALID" });

  const throughCaseStart = DAY147_A5_RUNNER_PHASES.indexOf("CASE_SUITE_START") +
    1;
  const caseStderr = (input: Readonly<{
    caseId: string;
    integrationKey?: Day147A5CaseIntegrationKey;
    assertionId?: string;
    expectedClass?: string;
    actualClass?: string;
    completedCount?: number;
    initialCandidateCompleted?: "TRUE" | "FALSE";
    failureCode?: string;
  }>): string => [
      ...DAY147_A5_RUNNER_PHASES.slice(0, throughCaseStart).map((phase) =>
        `FARMOS_DAY147_A5_PHASE=${phase}`
      ),
      `FARMOS_DAY147_A5_FAILURE=${input.failureCode ??
        "RUNNER_CASE_SUITE_FAILED"}`,
      "FARMOS_DAY147_A5_CASE_FAILURE_OPERATION=CASE_EXECUTION",
      `FARMOS_DAY147_A5_CASE_INTEGRATION_KEY=${input.integrationKey ?? "NONE"}`,
      `FARMOS_DAY147_A5_CASE_COMPLETED_COUNT=${input.completedCount ?? 1}`,
      `FARMOS_DAY147_A5_INITIAL_CANDIDATE_COMPLETED=${
        input.initialCandidateCompleted ?? "TRUE"}`,
      "FARMOS_DAY147_A5_CASE_FAILURE_CLASS=CASE_ASSERTION_FAILED",
      `FARMOS_DAY147_A5_CASE_ID=${input.caseId}`,
      `FARMOS_DAY147_A5_CASE_ASSERTION_ID=${input.assertionId ?? "NONE"}`,
      `FARMOS_DAY147_A5_CASE_EXPECTED_CLASS=${input.expectedClass ?? "NONE"}`,
      `FARMOS_DAY147_A5_CASE_ACTUAL_CLASS=${input.actualClass ?? "NONE"}`,
      "FARMOS_DAY147_A5_CASE_SQLSTATE=NONE",
      "FARMOS_DAY147_A5_LAST_PHASE=CASE_SUITE_START",
    ].join("\n");
  const valid = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: caseStderr({ caseId: "initial_candidate_valid" }) });
  assert.equal(valid.result_validator, "NOT_PRESENT");
  assert.equal(valid.fixed_failure_code, "RUNNER_CASE_SUITE_FAILED");
  assert.equal(valid.case_failure_operation, "CASE_EXECUTION");
  assert.equal(valid.case_integration_key, "NONE");
  assert.equal(valid.case_failure_class, "CASE_ASSERTION_FAILED");
  assert.equal(valid.case_id, "initial_candidate_valid");
  assert.equal(valid.case_sqlstate, "NONE");
  assert.equal(valid.completed_case_count, 1);
  assert.equal(valid.initial_candidate_completed, true);
  assert.equal(valid.migration_failure_markers_present, false);

  for (const integrationKey of [
    "REPOSITORY_INTEGRATION", "ATOMICITY_INTEGRATION",
    "CONCURRENCY_INTEGRATION",
  ] as const) {
    const grouped = classifyRunnerFailure({ exitCode: 1, stateError: "",
      oomKilled: false, stdout: "", resultFilePresent: false,
      stderr: caseStderr({ caseId: "NONE", integrationKey }) });
    assert.equal(grouped.result_validator, "NOT_PRESENT");
    assert.equal(grouped.case_integration_key, integrationKey);
    assert.equal(grouped.case_id, "NONE");
    assert.equal(grouped.completed_case_count, 1);
  }
  const readAdapterFailure = classifyRunnerFailure({ exitCode: 1,
    stateError: "", oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: caseStderr({
      caseId: "read_active_plus_candidate_selects_active",
      integrationKey: "READ_ADAPTER_INTEGRATION",
      completedCount: 92,
      assertionId: "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
      expectedClass: "EXPECTED_IDENTITY",
      actualClass: "UNEXPECTED_IDENTITY",
    }) });
  assert.equal(readAdapterFailure.result_validator, "NOT_PRESENT");
  assert.equal(readAdapterFailure.case_id,
    "read_active_plus_candidate_selects_active");
  assert.equal(readAdapterFailure.completed_case_count, 92);
  assert.equal(readAdapterFailure.assertion_id,
    "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED");
  assert.equal(readAdapterFailure.expected_class, "EXPECTED_IDENTITY");
  assert.equal(readAdapterFailure.actual_class, "UNEXPECTED_IDENTITY");

  const completedBeforeReadAdapter = new Set(
    DAY147_A5_CLIENT_CASE_REGISTRY.filter(({ id, category }) =>
      category !== "read_integration" && category !== "concurrency" &&
      id !== "legacy_active_immutable" && id !== "legacy_superseded_immutable"
    ).map(({ id }) => id),
  );
  assert.equal(completedBeforeReadAdapter.size, 92);
  assert.equal(completedBeforeReadAdapter.has("initial_candidate_valid"), true);
  const boundaryFailures: string[] = [];
  await assert.rejects(executeDay147A5ReadAdapterCaseBoundary({
    case_id: "read_candidate_only_missing",
    assertion_id: "READ_CANDIDATE_ONLY_EXCLUDED",
    expected_class: "ROW_ABSENT",
    async operation() { return "ROW_PRESENT"; },
    on_failure: (failure) => boundaryFailures.push(failure.case_id),
  }));
  assert.deepEqual(boundaryFailures, ["read_candidate_only_missing"]);
  assert.equal(completedBeforeReadAdapter.size, 92);
  await executeDay147A5ReadAdapterCaseBoundary({
    case_id: "read_candidate_only_missing",
    assertion_id: "READ_CANDIDATE_ONLY_EXCLUDED",
    expected_class: "ROW_ABSENT",
    async operation() { return "ROW_ABSENT"; },
    on_completed: (caseId) => completedBeforeReadAdapter.add(caseId),
  });
  await assert.rejects(executeDay147A5ReadAdapterCaseBoundary({
    case_id: "read_active_plus_candidate_selects_active",
    assertion_id: "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
    expected_class: "EXPECTED_IDENTITY",
    async operation() { return "UNEXPECTED_IDENTITY"; },
    on_failure: (failure) => boundaryFailures.push(failure.case_id),
  }));
  assert.deepEqual(boundaryFailures, ["read_candidate_only_missing",
    "read_active_plus_candidate_selects_active"]);
  assert.equal(completedBeforeReadAdapter.size, 93);

  const emptyContent = {
    business_date: "2026-08-03", source_record_count: 0,
    active_record_count: 0, tombstone_count: 0, field_references: [],
    crop_cycle_references: [], work_type_references: [],
    verification_status: "stable_change_contract_validated" as const,
    missing_data_status: "complete_for_v1" as const,
  };
  const formalHash = compileFarmOsDailyProjection({
    business_date: "2026-08-03", snapshots: [], snapshot_state_events: [],
  }).content_hash;
  assert.notEqual(sha256(JSON.stringify(emptyContent)), formalHash);
  assert.match(formalHash, /^[a-f0-9]{64}$/u);
  const groupedAfter101 = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: caseStderr({ caseId: "NONE",
      integrationKey: "CONCURRENCY_INTEGRATION", completedCount: 101,
      initialCandidateCompleted: "TRUE" }) });
  assert.equal(groupedAfter101.result_validator, "NOT_PRESENT");
  assert.equal(groupedAfter101.completed_case_count, 101);

  for (const invalidStderr of [
    caseStderr({ caseId: "NONE", integrationKey: "NONE" }),
    caseStderr({ caseId: "initial_candidate_valid",
      integrationKey: "REPOSITORY_INTEGRATION" }),
    caseStderr({ caseId: "initial_candidate_valid", completedCount: -1 }),
    caseStderr({ caseId: "initial_candidate_valid", completedCount: 103 }),
    `${caseStderr({ caseId: "initial_candidate_valid" })}\n` +
      "FARMOS_DAY147_A5_CASE_COMPLETED_COUNT=1",
    caseStderr({ caseId: "initial_candidate_valid",
      initialCandidateCompleted: "INVALID" as "TRUE" }),
    caseStderr({ caseId: "initial_candidate_valid" }).replace(
      /FARMOS_DAY147_A5_INITIAL_CANDIDATE_COMPLETED=TRUE\n/u, ""),
    caseStderr({ caseId: "initial_candidate_valid",
      integrationKey: "UNKNOWN_INTEGRATION" as Day147A5CaseIntegrationKey }),
    caseStderr({ caseId: "read_active_plus_candidate_selects_active",
      integrationKey: "READ_ADAPTER_INTEGRATION",
      assertionId: "UNKNOWN_ASSERTION", expectedClass: "EXPECTED_IDENTITY",
      actualClass: "UNEXPECTED_IDENTITY" }),
    `${caseStderr({
      caseId: "read_active_plus_candidate_selects_active",
      integrationKey: "READ_ADAPTER_INTEGRATION",
      assertionId: "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
      expectedClass: "EXPECTED_IDENTITY",
      actualClass: "UNEXPECTED_IDENTITY",
    })}\nFARMOS_DAY147_A5_CASE_ASSERTION_ID=` +
      "READ_ACTIVE_SELECTED_CANDIDATE_EXCLUDED",
  ]) {
    const rejected = classifyRunnerFailure({ exitCode: 1, stateError: "",
      oomKilled: false, stdout: "", resultFilePresent: false,
      stderr: invalidStderr });
    assert.equal(rejected.result_validator, "REJECTED_FAILURE_CODE_MISMATCH");
  }

  const countMismatchResult = createDay147A5RunnerFailureResult({
    executionNonce: "abcdef123456",
    expectedBundleSha256: "a".repeat(64),
    observedBundleSha256: "a".repeat(64),
    failureCode: "RUNNER_CASE_SUITE_FAILED",
    lastCompletedPhase: "CASE_SUITE_START",
  });
  const countMismatch = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: true,
    stderr: caseStderr({ caseId: "initial_candidate_valid" }),
    result: countMismatchResult });
  assert.equal(countMismatch.result_validator, "REJECTED_CASE_COUNT_MISMATCH");

  const invalidCaseId = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: caseStderr({ caseId: "not_a_registry_case" }) });
  assert.equal(invalidCaseId.result_validator,
    "REJECTED_FAILURE_CODE_MISMATCH");
  const migrationRewrite = classifyRunnerFailure({ exitCode: 1,
    stateError: "", oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: caseStderr({ caseId: "initial_candidate_valid",
      failureCode: "RUNNER_DAY146_MIGRATION_FAILED" }) });
  assert.notEqual(migrationRewrite.result_validator, "NOT_PRESENT");

  const source = clientEntrySource({ migrationSql: staticClientInput().migrationSql });
  assert.ok(source.includes("classifyDay147A5CaseFailure"));
  assert.ok(source.includes("onCaseFailure: (failure) =>"));
  assert.ok(source.includes("RUNNER_FAILURE_CODE_PHASE_MISMATCH"));
  assert.ok(source.includes("FARMOS_DAY147_A5_CASE_FAILURE_OPERATION="));
  assert.ok(source.includes("FARMOS_DAY147_A5_CASE_INTEGRATION_KEY="));
  assert.ok(source.includes("FARMOS_DAY147_A5_CASE_COMPLETED_COUNT="));
  assert.ok(source.includes("FARMOS_DAY147_A5_INITIAL_CANDIDATE_COMPLETED="));
  assert.ok(source.includes("FARMOS_DAY147_A5_CASE_FAILURE_CLASS="));
  assert.ok(source.includes("FARMOS_DAY147_A5_CASE_ID="));
  assert.ok(source.includes("FARMOS_DAY147_A5_CASE_SQLSTATE="));
  const isolatedSource = readFileSync(resolve(ROOT,
    "scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts"), "utf8");
  for (const binding of [
    'observeIntegration("REPOSITORY_INTEGRATION"',
    'observeIntegration("ATOMICITY_INTEGRATION"',
    'executeDay147A5ReadAdapterCaseBoundary({',
    '"READ_ADAPTER_INTEGRATION",\n        failure.case_id',
    'reportCaseFailure("CASE_EXECUTION", "CONCURRENCY_INTEGRATION"',
  ]) assert.ok(isolatedSource.includes(binding));
}

function runBundleStaticTests(): void {
  const names = namesForNonce("abcdef123456");
  const command = esbuildCommand({ binary: "/host/esbuild", names });
  assert.deepEqual(command.slice(1), [
    names.entry, "--bundle", "--platform=node", "--format=cjs",
    "--target=node24",
    `--banner:js=process.stderr.write(${JSON.stringify(
      `${MODULE_INITIALIZATION_STARTED_MARKER}\n`,
    )});`,
    "--define:import.meta.dirname=\"/workspace/scripts/hermes\"",
    "--define:process.env.FARMOS_A5_MINIMAL_CLIENT_BUNDLE=\"1\"",
    `--outfile=${names.bundle}`, `--metafile=${names.metafile}`,
  ]);
  assert.equal(command.some((argument) => argument.startsWith("--sourcemap")),
    false);
  assert.equal(command.some((argument) => argument.startsWith("--minify")),
    false);
  const input = staticClientInput();
  const source = clientEntrySource({ migrationSql: input.migrationSql });
  assert.ok(source.includes(JSON.stringify(input.migrationSql)));
  assert.ok(source.includes("runDay147A5ClientSuite"));
  assert.ok(source.indexOf("observedBundleSha256") <
    source.indexOf("runDay147A5ClientSuite({"));
  assert.ok(source.includes("RUNNER_BUNDLE_INTEGRITY_FAILED"));
  assert.ok(source.includes("void main().catch(async (error)"));
  assert.ok(source.includes("FARMOS_DAY147_A5_FAILURE="));
  assert.ok(source.includes("FARMOS_DAY147_A5_LAST_PHASE="));
  assert.ok(source.includes("FARMOS_DAY147_A5_MIGRATION_STAGE="));
  assert.ok(source.includes("FARMOS_DAY147_A5_MIGRATION_FAILURE_CLASS="));
  assert.ok(source.includes("FARMOS_DAY147_A5_MIGRATION_SQLSTATE="));
  assert.ok(source.includes(
    "FARMOS_DAY147_A5_PRE_MIGRATION_OPERATION="));
  assert.ok(source.includes(
    "FARMOS_DAY147_A5_PRE_MIGRATION_FAILURE_CLASS="));
  assert.ok(source.includes("FARMOS_DAY147_A5_PRE_MIGRATION_SQLSTATE="));
  assert.ok(source.includes("onExecutionPhase: (value) => {"));
  assert.ok(source.includes("value === 'CASE_SUITE_START'"));
  assert.ok(source.includes("onMigrationFailure: (failure) =>"));
  assert.ok(source.includes("phases[currentIndex + 1] !== value"));
  for (const phase of DAY147_A5_RUNNER_PHASES) {
    assert.ok(source.includes(phase));
  }
  assert.ok(!/(?:error\.stack|error\.message.*writeFile|console\.error\(error)/u
    .test(source));
  assert.ok(source.includes("const executingPath = __filename"));
  assert.ok(source.includes("executingPath !== '/workspace/client.cjs'"));
  assert.ok(!source.includes("import.meta.url"));
  assert.ok(source.includes("--module-init-check"));
  assert.ok(source.includes(MODULE_INITIALIZATION_OK_MARKER));
  assert.ok(!/(?:pnpm|tsx|corepack|node_modules)/i.test(source));
  assert.ok(!source.includes("reports/"));
  const suitePath = resolve(ROOT,
    "scripts/hermes/lib/farm_os_day147a5_client_suite.ts");
  const repositoryInputs = validateBundleInputs({ inputs: {
    [names.entry]: {}, [suitePath]: {},
  } }, names.entry);
  assert.deepEqual(repositoryInputs,
    ["scripts/hermes/lib/farm_os_day147a5_client_suite.ts"]);
  assert.match(sha256("single-client.cjs"), /^[a-f0-9]{64}$/);

  const compileNonce = "0f0e0d0c0b0a";
  const compileNames = namesForNonce(compileNonce);
  try {
    lstatSync(compileNames.temporaryRoot);
    throw new Error("DAY147_A5_MINIMAL_STATIC_TEMP_PREEXISTING");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const compileCounters = ZERO_COUNTERS();
  try {
    const bundle = createClientBundle({ runner: productionRunner(compileCounters),
      names: compileNames, migrationSql: readMigrationSql() });
    staticBundleSha256 = bundle.sha256;
    assert.match(bundle.sha256, /^[a-f0-9]{64}$/);
    validateHostBundleSyntax({ runner: productionRunner(compileCounters),
      bundle });
    validateHostBundleModuleInitialization({
      runner: productionRunner(compileCounters), bundle,
    });
    verifyBundleBeforeMount(bundle, compileNames);
    const bundleText = readFileSync(bundle.bundlePath, "utf8");
    assert.ok(bundleText.includes(MODULE_INITIALIZATION_STARTED_MARKER));
    assert.ok(bundleText.includes("__filename"));
    assert.ok(!bundleText.includes("import.meta.url"));
    assert.match(bundleText, /require\(["']events["']\)/u);
    const unknownArgument = productionRunner(compileCounters).run("node",
      [bundle.bundlePath, "--unknown"],
      { allowFailure: true, environment: {} });
    assert.notEqual(unknownArgument.status, 0);
    assert.match(unknownArgument.stderr,
      /FARMOS_DAY147_A5_MODULE_INIT_ARGUMENT_INVALID/u);
    const duplicateArgument = productionRunner(compileCounters).run("node",
      [bundle.bundlePath, "--module-init-check", "--module-init-check"],
      { allowFailure: true, environment: {} });
    assert.notEqual(duplicateArgument.status, 0);
    assert.match(duplicateArgument.stderr,
      /FARMOS_DAY147_A5_MODULE_INIT_ARGUMENT_INVALID/u);
    const wrongRuntimePath = productionRunner(compileCounters).run("node",
      [bundle.bundlePath], { allowFailure: true,
        environment: { FARMOS_DAY147_A5_BUNDLE_SHA256: bundle.sha256 } });
    assert.notEqual(wrongRuntimePath.status, 0);
    assert.match(wrongRuntimePath.stderr, /RUNNER_BUNDLE_INTEGRITY_FAILED/u);
    assert.doesNotMatch(wrongRuntimePath.stderr, /DATABASE_CONNECTION_START/u);
    const invalidBundlePath = `${compileNames.temporaryRoot}/invalid-client.cjs`;
    writeFileSync(invalidBundlePath, "export const broken = ;\n", {
      flag: "wx", mode: 0o444,
    });
    const invalidBytes = readFileSync(invalidBundlePath);
    assert.throws(() => validateHostBundleSyntax({
      runner: productionRunner(compileCounters),
      bundle: { ...bundle, bundlePath: invalidBundlePath,
        sha256: sha256(invalidBytes), size: invalidBytes.byteLength },
    }), /DAY147_A5_MINIMAL_BUNDLE_SYNTAX_INVALID/);
    chmodSync(invalidBundlePath, 0o600);
    rmSync(invalidBundlePath);
    const syntaxCalls: string[][] = [];
    assert.throws(() => validateHostBundleSyntax({ runner: {
      run(program, args) {
        syntaxCalls.push([program, ...args]);
        return { status: 1, stdout: "", stderr: "SyntaxError: fixture" };
      },
    }, bundle }), /DAY147_A5_MINIMAL_BUNDLE_SYNTAX_INVALID/);
    assert.deepEqual(syntaxCalls, [["node", "--check", bundle.bundlePath]]);
    assert.equal(compileCounters.networksCreated, 0);
    assert.equal(compileCounters.containersCreated, 0);
    verifyBundleBeforeMount(bundle, compileNames);
    const original = readFileSync(bundle.bundlePath);
    chmodSync(bundle.bundlePath, 0o600);
    const changed = Uint8Array.from(original);
    changed[0] = (changed[0] ?? 0) ^ 1;
    writeFileSync(bundle.bundlePath, changed);
    chmodSync(bundle.bundlePath, 0o444);
    assert.throws(() => verifyBundleBeforeMount(bundle, compileNames),
      /DAY147_A5_MINIMAL_BUNDLE_HASH_CHANGED_BEFORE_MOUNT/);
    chmodSync(bundle.bundlePath, 0o600);
    writeFileSync(bundle.bundlePath, original);
    chmodSync(bundle.bundlePath, 0o444);
    verifyBundleBeforeMount(bundle, compileNames);
    const regularBackup = `${bundle.bundlePath}.regular`;
    renameSync(bundle.bundlePath, regularBackup);
    symlinkSync(regularBackup, bundle.bundlePath);
    assert.throws(() => verifyBundleBeforeMount(bundle, compileNames),
      /DAY147_A5_MINIMAL_BUNDLE_HASH_CHANGED_BEFORE_MOUNT/);
    rmSync(bundle.bundlePath);
    renameSync(regularBackup, bundle.bundlePath);
    verifyBundleBeforeMount(bundle, compileNames);
    assert.equal(bundle.repositoryInputs.includes(
      "scripts/hermes/lib/farm_os_day147a5_client_suite.ts"), true);
    assert.equal(compileCounters.dockerCommands, 0);
  } finally {
    const cleanup = cleanupExactResources({ receipts: [],
      actions: productionCleanupActions({ runner: productionRunner(compileCounters),
        names: compileNames, nonce: compileNonce, providerProof: null }) });
    assert.equal(cleanup.failures.length, 0);
  }
}

function runRunnerSecurityStaticTests(): void {
  const nonce = "abcdef123456";
  const names = namesForNonce(nonce);
  const args = runnerCreateArgs({ names, nonce });
  assert.deepEqual(args.slice(-3), [NODE_IMAGE, "node", "/workspace/client.cjs"]);
  assert.ok(args.includes("--user=node"));
  assert.ok(args.includes("--cap-drop=ALL"));
  assert.ok(args.includes("--security-opt=no-new-privileges"));
  assert.ok(args.includes("--read-only"));
  assert.ok(args.includes("--tmpfs=/tmp:rw,noexec,nosuid,size=16777216"));
  assert.ok(args.includes(
    `--mount=type=bind,src=${names.bundle},dst=/workspace/client.cjs,readonly`,
  ));
  assert.ok(args.includes(
    `--mount=type=bind,src=${names.resultDirectory},dst=/result`,
  ));
  assert.ok(!args.some((arg) => /(?:pnpm|tsx|docker\.sock|node_modules)/i.test(arg)));
  assert.ok(!args.some((arg) => arg.startsWith("--publish") || arg === "-p"));
  assert.ok(!args.some((arg) => arg.includes(ROOT)));
  assert.ok(EXACT_ENVIRONMENT_KEYS.every((key) => args.includes(`--env=${key}`)));
  const receipt: Receipt = { resource: "runner", canonicalId: "a".repeat(64),
    expectedName: names.runner, nonce, preExisting: false };
  const observation = {
    Id: receipt.canonicalId, Name: `/${names.runner}`,
    Config: { Labels: { "farmos.day147a5.execution_nonce": nonce,
      "farmos.day147a5.resource_role": "minimal_runner" }, User: "node",
      Cmd: ["node", "/workspace/client.cjs"],
      Env: EXACT_ENVIRONMENT_KEYS.map((key) => `${key}=fixture`) },
    HostConfig: { Privileged: false, ReadonlyRootfs: true,
      NetworkMode: names.network, CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"], Tmpfs: { "/tmp": "rw" },
      PortBindings: {} },
    Mounts: [{ Type: "bind", Source: names.bundle,
      Destination: "/workspace/client.cjs", RW: false },
    { Type: "bind", Source: names.resultDirectory,
      Destination: "/result", RW: true }],
    NetworkSettings: { Networks: { [names.network]: {} } },
  };
  assert.equal(validateRunnerSecurityObservation({ observation, receipt, names }),
    true);
  assert.equal(validateRunnerSecurityObservation({ observation: {
    ...observation, Mounts: [{ ...observation.Mounts[0],
      Destination: "/workspace/wrong.cjs" }, observation.Mounts[1]],
  }, receipt, names }), false);
}

function runRunnerFailureStaticTests(): void {
  const expectedByLast = new Map<Day147A5RunnerLastPhase,
    Day147A5RunnerFailureCode>([
      ["NONE", "RUNNER_PROCESS_START_FAILED"],
      ["CLIENT_PROCESS_STARTED", "RUNNER_BUNDLE_INTEGRITY_FAILED"],
      ["BUNDLE_INTEGRITY_VALID", "RUNNER_ENVIRONMENT_CONTRACT_INVALID"],
      ["ENVIRONMENT_CONTRACT_VALID", "RUNNER_RESULT_PATH_INVALID"],
      ["RESULT_PATH_VALID", "RUNNER_DATABASE_CONNECTION_FAILED"],
      ["DATABASE_CONNECTION_START", "RUNNER_DATABASE_CONNECTION_FAILED"],
      ["DATABASE_CONNECTION_READY", "RUNNER_PRE_MIGRATION_SETUP_FAILED"],
      ["SHARED_ADAPTER_START", "RUNNER_PRE_MIGRATION_SETUP_FAILED"],
      ["MIGRATION_ARTIFACTS_READY", "RUNNER_PRE_MIGRATION_SETUP_FAILED"],
      ["SHARED_DYNAMIC_SUITE_START", "RUNNER_PRE_MIGRATION_SETUP_FAILED"],
      ["ISOLATED_DATABASES_CREATE_START",
        "RUNNER_PRE_MIGRATION_SETUP_FAILED"],
      ["ISOLATED_DATABASES_CREATE_PASS",
        "RUNNER_PRE_MIGRATION_SETUP_FAILED"],
      ["DAY146_MIGRATION_START", "RUNNER_DAY146_MIGRATION_FAILED"],
      ["DAY146_MIGRATION_PASS", "RUNNER_PREPARE_MIGRATION_FAILED"],
      ["PREPARE_MIGRATION_START", "RUNNER_PREPARE_MIGRATION_FAILED"],
      ["PREPARE_MIGRATION_PASS", "RUNNER_ACTIVATE_MIGRATION_FAILED"],
      ["ACTIVATE_MIGRATION_START", "RUNNER_ACTIVATE_MIGRATION_FAILED"],
      ["ACTIVATE_MIGRATION_PASS", "RUNNER_CASE_SUITE_FAILED"],
      ["CASE_SUITE_START", "RUNNER_CASE_SUITE_FAILED"],
      ["CASE_SUITE_PASS", "RUNNER_STATE_INVARIANT_FAILED"],
      ["STATE_INVARIANTS_PASS", "RUNNER_CLIENT_CLEANUP_FAILED"],
      ["CLIENT_CLEANUP_PASS", "RUNNER_RESULT_SERIALIZATION_FAILED"],
      ["RESULT_SERIALIZATION_PASS", "RUNNER_RESULT_WRITE_FAILED"],
      ["RESULT_WRITE_PASS", "RUNNER_UNKNOWN_TOP_LEVEL_FAILURE"],
    ]);
  const migrationDiagnosticByCode = new Map<Day147A5RunnerFailureCode,
    readonly [Day147A5MigrationStage, Day147A5MigrationFailureClass, string]>([
      ["RUNNER_DAY146_MIGRATION_FAILED",
        ["LEGACY_ACTIVE_DAY146_APPLY", "MIGRATION_UNKNOWN_FAILURE", "NONE"]],
      ["RUNNER_PREPARE_MIGRATION_FAILED",
        ["LEGACY_ACTIVE_PREPARE_APPLY", "MIGRATION_UNKNOWN_FAILURE", "NONE"]],
      ["RUNNER_ACTIVATE_MIGRATION_FAILED",
        ["LEGACY_ACTIVE_ACTIVATE_APPLY", "MIGRATION_UNKNOWN_FAILURE", "NONE"]],
    ]);
  for (const [lastPhase, expectedCode] of expectedByLast) {
    const markerCount = lastPhase === "NONE" ? 0 :
      DAY147_A5_RUNNER_PHASES.indexOf(lastPhase) + 1;
    const caseSuiteReached = markerCount >
      DAY147_A5_RUNNER_PHASES.indexOf("CASE_SUITE_PASS");
    const stateInvariantPassed = markerCount >
      DAY147_A5_RUNNER_PHASES.indexOf("STATE_INVARIANTS_PASS");
    const stderr = [
      ...DAY147_A5_RUNNER_PHASES.slice(0, markerCount).map((phase) =>
        `FARMOS_DAY147_A5_PHASE=${phase}`
      ),
      ...(caseSuiteReached ? [
        "FARMOS_DAY147_A5_CASE_EXECUTED_COUNT=102",
        "FARMOS_DAY147_A5_CASE_FAILED_COUNT=0",
        "FARMOS_DAY147_A5_CASE_DIGEST_MATCH=TRUE",
      ] : []),
      ...(stateInvariantPassed ? [
        "FARMOS_DAY147_A5_STATE_COMPARISON_COMPLETE=TRUE",
        "FARMOS_DAY147_A5_AUTOMATIC_PROMOTION_COUNT=0",
        "FARMOS_DAY147_A5_ACTIVE_STATE_UNCHANGED=TRUE",
      ] : expectedCode === "RUNNER_STATE_INVARIANT_FAILED" ? [
        "FARMOS_DAY147_A5_STATE_COMPARISON_COMPLETE=FALSE",
        "FARMOS_DAY147_A5_AUTOMATIC_PROMOTION_COUNT=0",
        "FARMOS_DAY147_A5_ACTIVE_STATE_UNCHANGED=TRUE",
        "FARMOS_DAY147_A5_STATE_INVARIANT_FAILURE_REASON=" +
          "STATE_INVARIANT_COMPARISON_INCOMPLETE",
      ] : []),
      `FARMOS_DAY147_A5_FAILURE=${expectedCode}`,
      ...(expectedCode === "RUNNER_DATABASE_CONNECTION_FAILED"
        ? ["FARMOS_DAY147_A5_DB_FAILURE_CLASS=DB_DNS_LOOKUP_FAILED"]
        : []),
      ...(migrationDiagnosticByCode.get(expectedCode) === undefined ? [] : [
        `FARMOS_DAY147_A5_MIGRATION_STAGE=${
          migrationDiagnosticByCode.get(expectedCode)![0]}`,
        `FARMOS_DAY147_A5_MIGRATION_FAILURE_CLASS=${
          migrationDiagnosticByCode.get(expectedCode)![1]}`,
        `FARMOS_DAY147_A5_MIGRATION_SQLSTATE=${
          migrationDiagnosticByCode.get(expectedCode)![2]}`,
      ]),
      ...(expectedCode === "RUNNER_PRE_MIGRATION_SETUP_FAILED" &&
          lastPhase !== "DATABASE_CONNECTION_READY" ? [
          `FARMOS_DAY147_A5_PRE_MIGRATION_OPERATION=${
            lastPhase === "ISOLATED_DATABASES_CREATE_START"
              ? "ISOLATED_DATABASES_CREATE" : "PRE_MIGRATION_UNKNOWN"}`,
          "FARMOS_DAY147_A5_PRE_MIGRATION_FAILURE_CLASS=" +
            (lastPhase === "ISOLATED_DATABASES_CREATE_START"
              ? "PRE_MIGRATION_DATABASE_CREATE_FAILED"
              : "PRE_MIGRATION_UNKNOWN_FAILURE"),
          "FARMOS_DAY147_A5_PRE_MIGRATION_SQLSTATE=NONE",
        ] : []),
      ...(expectedCode === "RUNNER_CASE_SUITE_FAILED" &&
          lastPhase === "CASE_SUITE_START" ? [
          "FARMOS_DAY147_A5_CASE_FAILURE_OPERATION=CASE_REGISTRY_PRECHECK",
          "FARMOS_DAY147_A5_CASE_INTEGRATION_KEY=NONE",
          "FARMOS_DAY147_A5_CASE_COMPLETED_COUNT=0",
          "FARMOS_DAY147_A5_INITIAL_CANDIDATE_COMPLETED=FALSE",
          "FARMOS_DAY147_A5_CASE_FAILURE_CLASS=" +
            "CASE_REGISTRY_CONTRACT_FAILED",
          "FARMOS_DAY147_A5_CASE_ID=NONE",
          "FARMOS_DAY147_A5_CASE_ASSERTION_ID=NONE",
          "FARMOS_DAY147_A5_CASE_EXPECTED_CLASS=NONE",
          "FARMOS_DAY147_A5_CASE_ACTUAL_CLASS=NONE",
          "FARMOS_DAY147_A5_CASE_SQLSTATE=NONE",
        ] : []),
      `FARMOS_DAY147_A5_LAST_PHASE=${lastPhase}`,
    ].join("\n");
    const classified = classifyRunnerFailure({ exitCode: 1, stateError: "",
      oomKilled: false, stdout: "", stderr, resultFilePresent: false });
    assert.equal(classified.last_completed_phase, lastPhase);
    assert.equal(classified.fixed_failure_code, expectedCode);
    assert.equal(classified.database_failure_class,
      expectedCode === "RUNNER_DATABASE_CONNECTION_FAILED"
        ? "DB_DNS_LOOKUP_FAILED" : null);
    const migrationStartMissing = lastPhase === "DAY146_MIGRATION_PASS" ||
      lastPhase === "PREPARE_MIGRATION_PASS";
    const caseStartMissing = expectedCode === "RUNNER_CASE_SUITE_FAILED" &&
      lastPhase !== "CASE_SUITE_START";
    assert.equal(classified.result_validator,
      lastPhase === "DATABASE_CONNECTION_READY"
        ? "REJECTED_PRE_MIGRATION_DIAGNOSTIC"
        : migrationStartMissing ? "REJECTED_MIGRATION_DIAGNOSTIC"
        : caseStartMissing ? "REJECTED_FAILURE_CODE_MISMATCH"
        : "NOT_PRESENT");
  }
  const stateFailureStderr = (input: Readonly<{
    comparison?: "TRUE" | "FALSE";
    promotion?: string;
    active?: "TRUE" | "FALSE";
    reason?: StateInvariantFailureReason;
    executed?: string;
    failed?: string;
    digest?: "TRUE" | "FALSE";
    extra?: readonly string[];
  }>): string => [
    ...DAY147_A5_RUNNER_PHASES.slice(0,
      DAY147_A5_RUNNER_PHASES.indexOf("CASE_SUITE_PASS") + 1).map(
        (phase) => `FARMOS_DAY147_A5_PHASE=${phase}`,
      ),
    `FARMOS_DAY147_A5_CASE_EXECUTED_COUNT=${input.executed ?? "102"}`,
    `FARMOS_DAY147_A5_CASE_FAILED_COUNT=${input.failed ?? "0"}`,
    `FARMOS_DAY147_A5_CASE_DIGEST_MATCH=${input.digest ?? "TRUE"}`,
    ...(input.comparison === undefined ? [] : [
      `FARMOS_DAY147_A5_STATE_COMPARISON_COMPLETE=${input.comparison}`,
    ]),
    ...(input.promotion === undefined ? [] : [
      `FARMOS_DAY147_A5_AUTOMATIC_PROMOTION_COUNT=${input.promotion}`,
    ]),
    ...(input.active === undefined ? [] : [
      `FARMOS_DAY147_A5_ACTIVE_STATE_UNCHANGED=${input.active}`,
    ]),
    ...(input.reason === undefined ? [] : [
      `FARMOS_DAY147_A5_STATE_INVARIANT_FAILURE_REASON=${input.reason}`,
    ]),
    ...(input.extra ?? []),
    "FARMOS_DAY147_A5_FAILURE=RUNNER_STATE_INVARIANT_FAILED",
    "FARMOS_DAY147_A5_LAST_PHASE=CASE_SUITE_PASS",
  ].join("\n");
  const validStateFailures = [
    { comparison: "FALSE", promotion: "0", active: "TRUE",
      reason: "STATE_INVARIANT_COMPARISON_INCOMPLETE" },
    { comparison: "TRUE", promotion: "1", active: "TRUE",
      reason: "STATE_INVARIANT_AUTOMATIC_PROMOTION_NONZERO" },
    { comparison: "TRUE", promotion: "0", active: "FALSE",
      reason: "STATE_INVARIANT_ACTIVE_STATE_CHANGED" },
    { comparison: "FALSE", promotion: "1", active: "FALSE",
      reason: "STATE_INVARIANT_MULTIPLE_FAILURES" },
    { comparison: "TRUE", active: "TRUE",
      reason: "STATE_INVARIANT_MEASUREMENT_MISSING" },
  ] as const;
  for (const fixture of validStateFailures) {
    const classified = classifyRunnerFailure({ exitCode: 1, stateError: "",
      oomKilled: false, stdout: "", resultFilePresent: false,
      stderr: stateFailureStderr(fixture) });
    assert.equal(classified.result_validator, "NOT_PRESENT");
    assert.equal(classified.case_suite_executed_count, 102);
    assert.equal(classified.case_suite_failed_count, 0);
    assert.equal(classified.case_suite_digest_match, true);
    assert.equal(classified.state_invariant_failure_reason, fixture.reason);
    assert.equal(classified.state_failure_marker_count, 1);
  }
  for (const stderr of [
    stateFailureStderr({ comparison: "FALSE", promotion: "0", active: "TRUE" }),
    stateFailureStderr({ comparison: "FALSE", promotion: "0", active: "TRUE",
      reason: "STATE_INVARIANT_ACTIVE_STATE_CHANGED" }),
    stateFailureStderr({ comparison: "TRUE", promotion: "-1", active: "TRUE",
      reason: "STATE_INVARIANT_AUTOMATIC_PROMOTION_NONZERO" }),
    stateFailureStderr({ comparison: "FALSE", promotion: "0", active: "TRUE",
      reason: "STATE_INVARIANT_COMPARISON_INCOMPLETE", executed: "101" }),
    stateFailureStderr({ comparison: "FALSE", promotion: "0", active: "TRUE",
      reason: "STATE_INVARIANT_COMPARISON_INCOMPLETE", failed: "1" }),
    stateFailureStderr({ comparison: "FALSE", promotion: "0", active: "TRUE",
      reason: "STATE_INVARIANT_COMPARISON_INCOMPLETE", digest: "FALSE" }),
    stateFailureStderr({ comparison: "FALSE", promotion: "0", active: "TRUE",
      reason: "STATE_INVARIANT_COMPARISON_INCOMPLETE", extra: [
        "FARMOS_DAY147_A5_STATE_INVARIANT_FAILURE_REASON=" +
          "STATE_INVARIANT_COMPARISON_INCOMPLETE",
      ] }),
  ]) {
    assert.equal(classifyRunnerFailure({ exitCode: 1, stateError: "",
      oomKilled: false, stdout: "", resultFilePresent: false, stderr })
      .result_validator, "REJECTED_STATE_INVARIANT_DIAGNOSTIC");
  }
  const mismatch = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: ["FARMOS_DAY147_A5_PHASE=CLIENT_PROCESS_STARTED",
      "FARMOS_DAY147_A5_FAILURE=RUNNER_DATABASE_CONNECTION_FAILED",
      "FARMOS_DAY147_A5_DB_FAILURE_CLASS=DB_DNS_LOOKUP_FAILED"].join("\n") });
  assert.equal(mismatch.result_validator, "REJECTED_FAILURE_CODE_MISMATCH");
  const invalidOrder = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: "FARMOS_DAY147_A5_PHASE=DATABASE_CONNECTION_START" });
  assert.equal(invalidOrder.result_validator, "REJECTED_MARKER_SEQUENCE");
  const duplicatePhase = classifyRunnerFailure({ exitCode: 1, stateError: "",
    oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: [
      "FARMOS_DAY147_A5_PHASE=CLIENT_PROCESS_STARTED",
      "FARMOS_DAY147_A5_PHASE=CLIENT_PROCESS_STARTED",
    ].join("\n") });
  assert.equal(duplicatePhase.result_validator, "REJECTED_MARKER_SEQUENCE");
  const passWithoutStart = classifyRunnerFailure({ exitCode: 1,
    stateError: "", oomKilled: false, stdout: "", resultFilePresent: false,
    stderr: [
      ...DAY147_A5_RUNNER_PHASES.slice(0,
        DAY147_A5_RUNNER_PHASES.indexOf("DAY146_MIGRATION_START")),
      "DAY146_MIGRATION_PASS",
    ].map((phase) => `FARMOS_DAY147_A5_PHASE=${phase}`).join("\n") });
  assert.equal(passWithoutStart.result_validator, "REJECTED_MARKER_SEQUENCE");
  const nonce = "abcdef123456";
  const failure = createDay147A5RunnerFailureResult({ executionNonce: nonce,
    expectedBundleSha256: "a".repeat(64),
    observedBundleSha256: "a".repeat(64),
    failureCode: "RUNNER_DATABASE_CONNECTION_FAILED",
    lastCompletedPhase: "DATABASE_CONNECTION_START" });
  assert.equal(validateDay147A5ClientResult(failure, nonce), true);
  assert.ok(Object.values(failure.migration_results).every((status) =>
    status === "NOT_STARTED"));
  assert.equal(failure.case_registry.executed_count, 0);
  assert.equal(failure.client_cleanup.clients_created, 0);
  assert.doesNotMatch(JSON.stringify(failure),
    /(?:stack|password|postgres(?:ql)?:\/\/|\/Users\/|\/private\/)/i);
  assert.deepEqual(runnerExitState({ State: { ExitCode: 1, Error: "",
    OOMKilled: false } }), { exitCode: 1, stateError: "", oomKilled: false });
  const sanitized = boundedRunnerLog(`${ROOT}/secret\nPGPASSWORD=value\n` +
    "postgresql://user:password@example.invalid/db\n" +
    Array.from({ length: 100 }, (_, index) => `line-${index}`).join("\n"));
  assert.ok(sanitized.split("\n").length <= MAX_LOG_LINES);
  assert.ok(Buffer.byteLength(sanitized) <= MAX_LOG_BYTES);
  assert.doesNotMatch(sanitized, /(?:example\.invalid|PGPASSWORD=value|\/Users\/)/);
  const executionSource = readFileSync(resolve(ROOT,
    "scripts/hermes/test_farm_os_day147a5_minimal_network.ts"), "utf8");
  const finalInspectIndex = executionSource.indexOf("const exitInspect =");
  const logsIndex = executionSource.indexOf("const logs = docker(runner",
    finalInspectIndex);
  const resultReadIndex = executionSource.indexOf(
    "const resultFilePresent = pathExistsNoFollow(names.result)",
    logsIndex);
  const cleanupIndex = executionSource.indexOf("cleanup = cleanupExactResources",
    resultReadIndex);
  assert.ok(finalInspectIndex >= 0 && finalInspectIndex < logsIndex);
  assert.ok(logsIndex < resultReadIndex && resultReadIndex < cleanupIndex);
  assert.doesNotMatch(executeMinimalNetwork.toString(),
    /\["cp",[^\]]*client-result\.json/u);
}

function runResultContractStaticTests(passing: Day147A5ClientResult): void {
  assert.equal(validateDay147A5ClientResult(passing, passing.execution_nonce), true);
  assert.equal(validateDay147A5ClientResult(passing, "000000000000"), false);
  assert.equal(validateDay147A5ClientResult(null, passing.execution_nonce), false);
  assert.equal(validateDay147A5ClientResult({ ...passing, unknown: true },
    passing.execution_nonce), false);
  assert.equal(validateDay147A5ClientResult({ ...passing,
    password: "forbidden" }, passing.execution_nonce), false);
  assert.equal(validateHostResultProof(passing,
    passing.bundle_integrity.expected_sha256), true);
  const cases = [...passing.case_registry.cases];
  const proof = (changedCases: readonly unknown[], overrides = {}) => ({
    ...passing.case_registry,
    cases: changedCases,
    executed_count: changedCases.length,
    ...overrides,
  });
  const forged: unknown[] = [
    { ...passing, case_registry: proof([], { failed_count: 0,
      actual_digest: null }) },
    { ...passing, case_registry: proof(cases.slice(0, 101)) },
    { ...passing, case_registry: proof([...cases, cases[0]!]) },
    { ...passing, case_registry: proof([cases[0]!, ...cases.slice(0, 101)]) },
    { ...passing, case_registry: proof([...cases].reverse()) },
    { ...passing, case_registry: proof([{ ...cases[0], case_id: "unknown" },
      ...cases.slice(1)]) },
    { ...passing, case_registry: proof([{ ...cases[0], status: "FAIL" },
      ...cases.slice(1)], { failed_count: 1 }) },
    { ...passing, case_registry: proof([{ ...cases[0], status: "FAIL" },
      ...cases.slice(1)], { failed_count: 0 }) },
    { ...passing, case_registry: proof(cases, { actual_digest: "0".repeat(64) }) },
    { ...passing, case_registry: proof([{ ...cases[0], status: "UNKNOWN" },
      ...cases.slice(1)]) },
    { ...passing, bundle_integrity: { ...passing.bundle_integrity,
      observed_sha256: "0".repeat(64), matched: false } },
    { ...passing, bundle_integrity: { matched: true } },
    { ...passing, state_invariants: { ...passing.state_invariants,
      automatic_promotion_count: 1 } },
    { ...passing, state_invariants: { ...passing.state_invariants,
      final_digest: "c".repeat(64) } },
    { ...passing, state_invariants: { ...passing.state_invariants,
      comparison_complete: false } },
    { ...passing, state_invariants: { ...passing.state_invariants,
      baseline_digest: null } },
  ];
  for (const value of forged) {
    assert.equal(validateDay147A5ClientResult(value, passing.execution_nonce) &&
      validateHostResultProof(value,
        passing.bundle_integrity.expected_sha256), false);
  }
  assert.throws(() => JSON.parse("{"));
}

function runResultFilesystemStaticTests(passing: Day147A5ClientResult): void {
  const nonce = passing.execution_nonce;
  const names = namesForNonce(nonce);
  const otherDirectory = `${names.temporaryRoot}/other`;
  const target = `${names.resultDirectory}/target.json`;
  const hardlink = `${names.resultDirectory}/hardlink.json`;
  const removeIfPresent = (path: string) => {
    if (pathExistsNoFollow(path)) rmSync(path);
  };
  mkdirSync(names.temporaryRoot, { recursive: false, mode: 0o700 });
  try {
    validateResultPathContract(names);
    assert.throws(() => validateResultPathContract({ ...names,
      result: `${names.resultDirectory}/../client-result.json`,
    }), /DAY147_A5_MINIMAL_RESULT_PATH_CONTRACT_INVALID/);
    createResultDirectory(names);
    const directory = lstatSync(names.resultDirectory);
    assert.equal(directory.isDirectory(), true);
    assert.equal(directory.isSymbolicLink(), false);
    assert.equal(directory.mode & 0o777, 0o700);
    assertResultFileAbsent(names);

    const writeFixture = (value: unknown) => writeFileSync(names.result,
      `${JSON.stringify(value)}\n`, { flag: "wx", mode: 0o600 });
    writeFixture(passing);
    assert.throws(() => assertResultFileAbsent(names),
      /DAY147_A5_MINIMAL_RESULT_PREEXISTING/);
    const accepted = validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256);
    assert.equal(accepted.result.result, "PASS");
    assert.equal(accepted.transport.path_contract, "HOST_NONCE_RESULT_BIND");
    assert.equal(accepted.transport.mode, "0600");
    assert.equal(accepted.transport.link_count, 1);
    assert.equal(accepted.transport.result_validator, "ACCEPTED");
    assert.ok(accepted.transport.size > 0 &&
      accepted.transport.size <= MAX_RESULT_BYTES);
    assert.match(accepted.transport.sha256, /^[a-f0-9]{64}$/);

    chmodSync(names.result, 0o644);
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_FILE_PERMISSION_INVALID/);
    chmodSync(names.result, 0o600);
    linkSync(names.result, hardlink);
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_FILE_LINK_COUNT_INVALID/);
    rmSync(hardlink);
    rmSync(names.result);

    writeFileSync(target, "{}\n", { flag: "wx", mode: 0o600 });
    symlinkSync(target, names.result);
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_FILE_NOT_REGULAR/);
    rmSync(names.result);
    rmSync(target);

    writeFileSync(names.result, "{\n", { flag: "wx", mode: 0o600 });
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_JSON_INVALID/);
    rmSync(names.result);
    writeFixture({ ...passing, unknown: true });
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_CONTRACT_INVALID/);
    rmSync(names.result);

    const failure = createDay147A5RunnerFailureResult({ executionNonce: nonce,
      expectedBundleSha256: passing.bundle_integrity.expected_sha256,
      observedBundleSha256: passing.bundle_integrity.expected_sha256,
      failureCode: "RUNNER_DATABASE_CONNECTION_FAILED",
      lastCompletedPhase: "DATABASE_CONNECTION_START" });
    writeFixture(failure);
    assert.equal(validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256).result.result, "FAIL");
    rmSync(names.result);
    writeFileSync(names.result, "x", { flag: "wx", mode: 0o600 });
    truncateSync(names.result, MAX_RESULT_BYTES + 1);
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_FILE_TOO_LARGE/);
    rmSync(names.result);
    assert.throws(() => validateResultFile(names, nonce,
      passing.bundle_integrity.expected_sha256),
    /DAY147_A5_MINIMAL_RESULT_FILE_NOT_CREATED/);

    rmdirSync(names.resultDirectory);
    mkdirSync(otherDirectory, { mode: 0o700 });
    symlinkSync(otherDirectory, names.resultDirectory);
    assert.throws(() => createResultDirectory(names),
      /DAY147_A5_MINIMAL_RESULT_DIRECTORY_CREATE_FAILED/);
  } finally {
    removeIfPresent(names.result);
    removeIfPresent(target);
    removeIfPresent(hardlink);
    if (pathExistsNoFollow(names.resultDirectory)) {
      const metadata = lstatSync(names.resultDirectory);
      if (metadata.isSymbolicLink()) rmSync(names.resultDirectory);
      else rmdirSync(names.resultDirectory);
    }
    if (pathExistsNoFollow(otherDirectory)) rmdirSync(otherDirectory);
    rmdirSync(names.temporaryRoot);
  }
}

function runStateInvariantStaticTests(): void {
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const activeRow = (suffix: string, contentHash = hash(`content:${suffix}`)) =>
    Object.freeze({
    projection_id: `active-${suffix}`,
    lifecycle_state: "active" as const,
    content_hash: contentHash,
  });
  const entityRow = (suffix: string,
    lifecycleState: "candidate" | "active" | "rejected" | "failed" |
      "superseded" = "active",
    contentHash = hash(`content:${suffix}`)) => Object.freeze({
    projection_id: `active-${suffix}`,
    lifecycle_state: lifecycleState,
    content_hash: contentHash,
  });
  const transitionRow = (suffix: string, eventSequence = 2) => Object.freeze({
    projection_id: `active-${suffix}`,
    prior_status: "candidate" as const,
    final_status: "active" as const,
    event_sequence: eventSequence,
  });
  const capture = (suffix: string,
    overrides: Partial<StateInvariantCapture> = {}): StateInvariantCapture =>
    Object.freeze({
    digest: hash(`active:${suffix}`),
    active_rows: Object.freeze([activeRow(suffix)]),
    entity_rows: Object.freeze([entityRow(suffix)]),
    candidate_to_active_rows: Object.freeze([]),
    active_count: 1,
    candidate_count: 0,
    promotion_transition_count: 0,
    superseded_transition_count: 0,
    ...overrides,
  });
  const attribution = (suffix: string, caseId: string,
    cleanupExpectation: ExplicitTransitionAttribution["cleanup_expectation"] =
      "fixture_retained"): ExplicitTransitionAttribution => Object.freeze({
    database: "legacy_active",
    projection_id: `active-${suffix}`,
    case_id: caseId,
    explicit_activation_action_present: true,
    test_fixture_owned: true,
    cleanup_expectation: cleanupExpectation,
  });
  const baseline = Object.freeze([capture("a"), capture("b"), capture("c")]);
  const unchanged = compareStateInvariants(baseline, baseline);
  assert.equal(unchanged.comparison_complete, true);
  assert.equal(unchanged.automatic_promotion_count, 0);
  assert.equal(unchanged.active_state_unchanged, true);
  assert.equal(unchanged.baseline_digest, unchanged.final_digest);
  const candidateOnly = baseline.map((item) => ({ ...item,
    candidate_count: item.candidate_count + 1 }));
  const candidateOnlyResult = compareStateInvariants(baseline, candidateOnly);
  assert.equal(candidateOnlyResult.automatic_promotion_count, 0);
  assert.equal(candidateOnlyResult.active_state_unchanged, true);
  const orderBaseline = [capture("order", { active_count: 2,
    active_rows: [activeRow("z"), activeRow("a")],
    entity_rows: [entityRow("z"), entityRow("a")] }), ...baseline.slice(1)];
  const orderFinal = [capture("order", { active_count: 2,
    active_rows: [activeRow("a"), activeRow("z")],
    entity_rows: [entityRow("a"), entityRow("z")] }), ...baseline.slice(1)];
  assert.equal(compareStateInvariants(orderBaseline, orderFinal)
    .active_state_unchanged, true);
  const explicitFinal = [capture("a", { active_count: 2,
    active_rows: [activeRow("a"), activeRow("explicit")],
    entity_rows: [entityRow("a"), entityRow("explicit")],
    candidate_to_active_rows: [transitionRow("explicit")],
    promotion_transition_count: 1 }), ...baseline.slice(1)];
  const explicitAttribution = attribution(
    "explicit", "read_active_plus_candidate_selects_active",
  );
  const explicitResult = compareStateInvariants(
    baseline, explicitFinal, [explicitAttribution],
    new Set([explicitAttribution.case_id]),
  );
  assert.equal(explicitResult.automatic_promotion_count, 0);
  assert.equal(explicitResult.active_state_unchanged, true);
  assert.equal(explicitResult.baseline_digest, explicitResult.final_digest);
  const unauthorized = compareStateInvariants(baseline, explicitFinal);
  assert.equal(unauthorized.automatic_promotion_count, 1);
  assert.equal(unauthorized.comparison_complete, true);
  const explicitCases = [
    "bundle_supersedes_null_existing_active_unchanged",
    "read_active_plus_candidate_selects_active",
    "read_active_plus_multiple_candidates_selects_active",
    "concurrency_forward",
    "concurrency_reverse",
  ];
  const fiveTransitions = explicitCases.map((_, index) =>
    transitionRow(`explicit-${index}`)
  );
  const fiveAttributions = explicitCases.map((caseId, index) =>
    attribution(`explicit-${index}`, caseId)
  );
  const explicitFiveFinal = [capture("a", { active_count: 6,
    active_rows: [activeRow("a"), ...explicitCases.map((_, index) =>
      activeRow(`explicit-${index}`))],
    entity_rows: [entityRow("a"), ...explicitCases.map((_, index) =>
      entityRow(`explicit-${index}`))],
    candidate_to_active_rows: fiveTransitions,
    promotion_transition_count: 5 }), ...baseline.slice(1)];
  assert.equal(compareStateInvariants(baseline, explicitFiveFinal,
    fiveAttributions, new Set(explicitCases)).automatic_promotion_count, 0);
  const explicitFivePlusUnauthorized = [capture("a", { active_count: 7,
    active_rows: [...explicitFiveFinal[0]!.active_rows, activeRow("automatic")],
    entity_rows: [...explicitFiveFinal[0]!.entity_rows, entityRow("automatic")],
    candidate_to_active_rows: [...fiveTransitions, transitionRow("automatic")],
    promotion_transition_count: 6 }), ...baseline.slice(1)];
  assert.equal(compareStateInvariants(baseline, explicitFivePlusUnauthorized,
    fiveAttributions, new Set(explicitCases)).automatic_promotion_count, 1);
  const rejectedActivation = compareStateInvariants(baseline, baseline);
  assert.equal(rejectedActivation.automatic_promotion_count, 0);
  const baselineCandidate = [capture("a", { active_rows: [], active_count: 0,
    candidate_count: 1, entity_rows: [entityRow("candidate", "candidate")] }),
    ...baseline.slice(1)];
  const baselineCandidatePromoted = [capture("a", {
    active_rows: [activeRow("candidate")], active_count: 1,
    candidate_count: 0, entity_rows: [entityRow("candidate")],
    candidate_to_active_rows: [transitionRow("candidate")],
    promotion_transition_count: 1 }), ...baseline.slice(1)];
  const baselineCandidateAnalysis = analyzeStateTransitionProvenance(
    baselineCandidate, baselineCandidatePromoted, [], new Set(),
  );
  assert.equal(baselineCandidateAnalysis.unauthorized_count, 1);
  assert.equal(baselineCandidateAnalysis.entries[0]?.baseline_entity, true);
  const unknown = analyzeStateTransitionProvenance(
    baseline, explicitFinal, [explicitAttribution], new Set(),
  );
  assert.equal(unknown.unknown_count, 1);
  assert.equal(unknown.comparison_complete, false);
  const cleanupLeakAttribution = attribution("explicit",
    "read_active_plus_candidate_selects_active", "transaction_rollback");
  const cleanupLeak = analyzeStateTransitionProvenance(
    baseline, explicitFinal, [cleanupLeakAttribution],
    new Set([cleanupLeakAttribution.case_id]),
  );
  assert.equal(cleanupLeak.cleanup_leak_count, 1);
  assert.equal(cleanupLeak.comparison_complete, false);
  const removalBaseline = [capture("remove", { active_count: 2,
    active_rows: [activeRow("remove"), activeRow("removed")],
    entity_rows: [entityRow("remove"), entityRow("removed")] }),
    ...baseline.slice(1)];
  const removalFinal = [capture("remove", { active_count: 1,
    active_rows: [activeRow("remove")], entity_rows: [entityRow("remove")] }),
    ...baseline.slice(1)];
  assert.equal(compareStateInvariants(removalBaseline, removalFinal)
    .active_state_unchanged, false);
  for (const changed of [
    baseline.map((item, index) => index === 0 ? { ...item,
      active_rows: [], active_count: 0,
      entity_rows: [entityRow("a", "superseded")] } : item),
    baseline.map((item, index) => index === 0 ? { ...item,
      active_rows: [activeRow("a", hash("changed"))],
      entity_rows: [entityRow("a", "active", hash("changed"))] }
      : item),
  ]) assert.equal(compareStateInvariants(baseline, changed)
    .active_state_unchanged, false);
  const duplicate = baseline.map((item, index) => index === 0 ? { ...item,
    active_count: 2, active_rows: [activeRow("a"), activeRow("a")],
    entity_rows: [entityRow("a"), entityRow("a")] } : item);
  assert.equal(compareStateInvariants(baseline, duplicate)
    .comparison_complete, false);
  assert.equal(compareStateInvariants(baseline, baseline.slice(0, 2))
    .comparison_complete, false);
}

function runCleanupStaticTests(): void {
  const nonce = "abcdef123456";
  const receipts: Receipt[] = [
    { resource: "runner", canonicalId: "a".repeat(64),
      expectedName: "runner", nonce, preExisting: false },
    { resource: "postgres", canonicalId: "b".repeat(64),
      expectedName: "postgres", nonce, preExisting: false },
    { resource: "network", canonicalId: "c".repeat(64),
      expectedName: "network", nonce, preExisting: false },
  ];
  const pass = (result: "PASS_REMOVED" | "PASS_ALREADY_ABSENT",
    deleteAttempted = result === "PASS_REMOVED"): ResourceCleanupReport =>
    Object.freeze({ creation_receipt: true, delete_attempted: deleteAttempted,
      absence_classification: "NOT_FOUND", cleanup_result: result });
  const failed = (result: CleanupResultCode =
    "FAILED_ABSENCE_VERIFICATION"): ResourceCleanupReport => Object.freeze({
    creation_receipt: true, delete_attempted: false,
    absence_classification: result === "FAILED_PROVIDER_IDENTITY"
      ? "UNKNOWN_FAILURE" : "UNEXPECTED_SHAPE", cleanup_result: result });
  const events: string[] = [];
  const cleanup = cleanupExactResources({ receipts, actions: {
    removeResource(receipt) {
      events.push(receipt.resource);
      return receipt.resource === "runner" ? failed() :
        pass("PASS_ALREADY_ABSENT", false);
    },
    removeResult() { events.push("result_file"); return "PASS_ALREADY_ABSENT"; },
    removeResultDirectory() {
      events.push("result_directory"); return "PASS_ALREADY_ABSENT";
    },
    removeBundle() { events.push("client_bundle"); return "PASS_ALREADY_ABSENT"; },
    removeTemporaryRoot() {
      events.push("temporary_root"); return "PASS_ALREADY_ABSENT";
    },
  } });
  assert.deepEqual(cleanup.attempted, ["runner", "postgres", "network",
    "result_file", "result_directory", "client_bundle", "temporary_root"]);
  assert.deepEqual(events, cleanup.attempted);
  assert.equal(cleanup.failures.length, 1);
  assert.equal(cleanup.resources.runner.cleanup_result,
    "FAILED_ABSENCE_VERIFICATION");
  assert.equal(cleanup.resources.postgres.cleanup_result,
    "PASS_ALREADY_ABSENT");
  assert.equal(cleanup.resources.network.cleanup_result,
    "PASS_ALREADY_ABSENT");
  assert.equal(cleanup.overallCleanupPass, false);
  assert.ok(cleanup.completed.includes("postgres"));
  assert.ok(cleanup.completed.includes("network"));
  assert.equal(receipts.some(({ expectedName }) =>
    expectedName === "unrelated"), false);
  const containerId = "a".repeat(64);
  const networkId = "b".repeat(64);
  const classify = (input: Readonly<{ resource?: "container" | "network";
    canonicalId?: string; result: CommandResult;
    expectedShape?: DockerInspectExpectedShape;
    providerIdentityMatched?: boolean }>) => classifyDockerInspect({
    resource: input.resource ?? "container", canonicalId: input.canonicalId,
    result: input.result, expectedShape: input.expectedShape ?? "ARRAY",
    providerIdentityMatched: input.providerIdentityMatched ?? true }).kind;
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 0, stdout: JSON.stringify([{ Id: containerId }]),
      stderr: "" } }), "PRESENT");
  assert.equal(classify({ canonicalId: containerId, expectedShape: "OBJECT",
    result: { status: 0, stdout: JSON.stringify({ Id: containerId }),
      stderr: "" } }), "PRESENT");
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 0, stdout: "[]", stderr: "" } }), "UNEXPECTED_SHAPE");
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 0, stdout: JSON.stringify([
      { Id: containerId }, { Id: containerId }]), stderr: "" } }),
  "UNEXPECTED_SHAPE");
  assert.equal(classify({ canonicalId: containerId, expectedShape: "OBJECT",
    result: { status: 0, stdout: JSON.stringify([{ Id: containerId }]),
      stderr: "" } }), "UNEXPECTED_SHAPE");
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 0, stdout: "not-json", stderr: "" } }),
  "MALFORMED_JSON");
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 0, stdout: "", stderr: "" } }), "MALFORMED_JSON");
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 1, stdout: "",
      stderr: `Error response from daemon: No such container: ${containerId}` } }),
  "NOT_FOUND");
  assert.equal(classify({ canonicalId: containerId,
    result: { status: 1, stdout: "[]\n",
      stderr: `error: no such object: ${containerId}\n` } }), "NOT_FOUND");
  assert.equal(classify({ resource: "network",
    canonicalId: networkId, result: { status: 1, stdout: "",
      stderr: `Error response from daemon: network ${networkId} not found` } }),
  "NOT_FOUND");
  for (const [stderr, expected] of [
    ["permission denied", "PERMISSION_DENIED"],
    ["Cannot connect to the Docker daemon", "PROVIDER_UNAVAILABLE"],
    ["context deadline exceeded", "TIMEOUT"],
    ["arbitrary exit one", "UNKNOWN_FAILURE"],
  ] as const) assert.equal(classify({ resource: "container",
    canonicalId: containerId, result: { status: 1, stdout: "", stderr } }),
  expected);
  assert.equal(classify({ resource: "container",
    canonicalId: containerId, result: { status: 1, stdout: "",
      stderr: `Error response from daemon: No such container: ${"c".repeat(64)}` } }),
  "IDENTITY_MISMATCH");
  assert.equal(classify({ canonicalId: containerId, result: { status: 0,
    stdout: JSON.stringify([{ Id: "c".repeat(64) }]), stderr: "" } }),
  "IDENTITY_MISMATCH");
  assert.equal(classify({ canonicalId: containerId,
    providerIdentityMatched: false, result: { status: 1, stdout: "",
      stderr: `Error response from daemon: No such container: ${containerId}` } }),
  "IDENTITY_MISMATCH");
  const provider: Day147A5OrbStackProviderProof = { context: "orbstack",
    provider_identity_sha256: "d".repeat(64), local_unix_socket_verified: true };
  assert.equal(sameProviderIdentity(provider, provider), true);
  assert.equal(sameProviderIdentity(provider, { ...provider,
    provider_identity_sha256: "e".repeat(64) }), false);

  const names = namesForNonce(nonce);
  const networkReceipt: Receipt = { resource: "network",
    canonicalId: networkId, expectedName: names.network, nonce,
    preExisting: false };
  const order: string[] = [];
  let inspectCount = 0;
  const runner: CommandRunner = { run(program, args) {
    assert.equal(program, "docker");
    if (args[0] === "network" && args[1] === "inspect") {
      inspectCount += 1;
      order.push(inspectCount === 1 ? "inspect-present" : "inspect-absent");
      return inspectCount === 1
        ? { status: 0, stdout: JSON.stringify([{ Id: networkId,
          Name: names.network, Driver: "bridge", Scope: "local",
          Labels: { "farmos.day147a5.execution_nonce": nonce,
            "farmos.day147a5.resource_role": "minimal_network" },
          Containers: {} }]), stderr: "" }
        : { status: 1, stdout: "",
          stderr: `Error response from daemon: network ${networkId} not found` };
    }
    if (args[0] === "network" && args[1] === "rm") {
      order.push("remove");
      return { status: 0, stdout: `${networkId}\n`, stderr: "" };
    }
    throw new Error("unexpected command");
  } };
  const actions = productionCleanupActions({ runner, names, nonce,
    providerProof: provider, providerValidator() {
      order.push("provider");
      return provider;
    } });
  assert.equal(actions.removeResource(networkReceipt).cleanup_result,
    "PASS_REMOVED");
  assert.deepEqual(order, ["provider", "inspect-present", "provider", "remove",
    "provider", "inspect-absent"]);

  const removed = cleanupExactResources({ receipts, actions: {
    removeResource: () => pass("PASS_REMOVED"),
    removeResult: () => "PASS_REMOVED",
    removeResultDirectory: () => "PASS_REMOVED",
    removeBundle: () => "PASS_REMOVED",
    removeTemporaryRoot: () => "PASS_REMOVED",
  } });
  assert.equal(removed.overallCleanupPass, true);
  assert.ok(Object.values(removed.resources).every(({ cleanup_result }) =>
    cleanup_result === "PASS_REMOVED"));
  const runnerNotCreated = cleanupExactResources({ receipts: receipts.slice(1),
    actions: {
      removeResource: () => pass("PASS_ALREADY_ABSENT", false),
      removeResult: () => "PASS_ALREADY_ABSENT",
      removeResultDirectory: () => "PASS_ALREADY_ABSENT",
      removeBundle: () => "PASS_ALREADY_ABSENT",
      removeTemporaryRoot: () => "PASS_ALREADY_ABSENT",
    } });
  assert.equal(runnerNotCreated.resources.runner.cleanup_result,
    "NOT_APPLICABLE_NOT_CREATED");
  assert.equal(runnerNotCreated.overallCleanupPass, true);
  const providerChanged = cleanupExactResources({ receipts, actions: {
    removeResource: () => failed("FAILED_PROVIDER_IDENTITY"),
    removeResult: () => "PASS_ALREADY_ABSENT",
    removeResultDirectory: () => "PASS_ALREADY_ABSENT",
    removeBundle: () => "PASS_ALREADY_ABSENT",
    removeTemporaryRoot: () => "PASS_ALREADY_ABSENT",
  } });
  assert.equal(providerChanged.resources.runner.cleanup_result,
    "FAILED_PROVIDER_IDENTITY");
  assert.equal(providerChanged.overallCleanupPass, false);
  assert.equal(cleanupReportConsistent({ creation_receipt: true,
    delete_attempted: true, absence_classification: "NOT_FOUND",
    cleanup_result: "FAILED_DELETE" }), false);
  for (const protectedName of ["farmos-postgres", "farmos-redis",
    "farmos-qdrant", "farmos-minio", "farmos-core_farmos_internal",
    "bridge", "host", "none"]) {
    assert.equal(receipts.some(({ expectedName }) => expectedName === protectedName),
      false);
  }
}

function staticTransitionSemanticObservation(): TransitionSemanticObservation {
  return Object.freeze({ raw_transition_count: 5,
    explicit_authorized_count: 5, unauthorized_count: 0,
    cleanup_leak_count: 0, unknown_count: 0,
    baseline_active_mutation_count: 0, comparison_complete: true,
    baseline_active_count: 2, final_active_count: 7,
    transitions: Object.freeze(REQUIRED_TRANSITION_CASE_IDS.map(
      (caseId, index) => Object.freeze({ case_id: caseId, database: "main" as const,
        classification: "EXPLICIT_AUTHORIZED_TEST_TRANSITION" as const,
        opaque_reference: String(index + 1).padStart(16, "0") }),
    )),
  });
}

function staticResultTransport(): ResultTransportObservation {
  return Object.freeze({ result_file_observed: true,
    path_contract: "HOST_NONCE_RESULT_BIND", regular_file: true,
    mode: "0600", link_count: 1, size: 9_383, sha256: "f".repeat(64),
    result_validator: "ACCEPTED" });
}

function runEvidenceStaticTests(passing: Day147A5ClientResult): void {
  const cleanup = passingCleanupFixture();
  const success = successEvidence({ nonce: passing.execution_nonce,
    result: passing, postgresImageId: `sha256:${"d".repeat(64)}`,
    readinessElapsedMs: 100,
    transitionProvenance: staticTransitionSemanticObservation(),
    resultTransport: staticResultTransport(), cleanup });
  const chain = buildSuccessChain(success);
  assert.equal(validateSemanticSuccessA5Evidence(success).accepted, true);
  assert.doesNotMatch(JSON.stringify(success.transition_provenance),
    /(?:projection_id|business_date|content_hash|lineage|password|postgresql:\/\/)/i);
  const transitionFixture = staticTransitionSemanticObservation();
  const transitionLog = [
    ...transitionFixture.transitions.map((transition) =>
      `FARMOS_DAY147_A5_TRANSITION_PROVENANCE=${JSON.stringify({
        database: transition.database,
        transition_identity_digest: transition.opaque_reference,
        prior_status: "candidate", final_status: "active",
        event_sequence_class: "CANDIDATE_THEN_ACTIVE",
        matching_case_id: transition.case_id,
        explicit_activation_action_present: true, test_fixture_owned: true,
        baseline_entity: false, classification: transition.classification,
      })}`),
    `FARMOS_DAY147_A5_TRANSITION_PROVENANCE_SUMMARY=${JSON.stringify({
      raw_transition_count: 5, explicit_authorized_count: 5,
      unauthorized_count: 0, cleanup_leak_count: 0, unknown_count: 0,
      baseline_active_mutation_count: 0, baseline_active_count: 2,
      final_active_count: 7,
    })}`,
  ].join("\n");
  assert.deepEqual(parseTransitionSemanticObservation(transitionLog, passing),
    transitionFixture);
  assert.equal(classifyCommittedA5ArtifactChain({ ...chain,
    expectedExecutionNonce: passing.execution_nonce }),
  "VALID_COMPLETE_SEMANTIC_SUCCESS_CHAIN");
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    expectedExecutionNonce: passing.execution_nonce }).accepted, true);
  const rejectedSemanticEvidence = [
    { ...success, transition_provenance: { ...success.transition_provenance,
      explicit_authorized_count: 4, unauthorized_count: 1 } },
    { ...success, transition_provenance: { ...success.transition_provenance,
      explicit_authorized_count: 4, unknown_count: 1 } },
    { ...success, state_invariants: { ...success.state_invariants,
      automatic_promotion_count: 1 } },
    { ...success, state_invariants: { ...success.state_invariants,
      active_state_unchanged: false } },
    { ...success, case_registry: { ...success.case_registry,
      executed_count: 101, unique_count: 101 } },
    { ...success, case_registry: { ...success.case_registry,
      actual_digest: "0".repeat(64), digest_match: false } },
    (() => { const value = { ...success } as Record<string, unknown>;
      delete value.result_transport; return value; })(),
    { ...success, resource_cleanup: { ...success.resource_cleanup,
      residual_resources: 1 } },
    { ...success, password: "forbidden" },
  ];
  for (const invalid of rejectedSemanticEvidence) {
    assert.equal(validateSemanticSuccessA5Evidence(invalid).accepted, false);
  }
  const {
    migrations: _migrations, case_registry: _caseRegistry,
    transition_provenance: _provenance, state_invariants: _invariants,
    result_transport: _transport, client_cleanup: _clientCleanup,
    resource_cleanup: _resourceCleanup, ...legacyCommon
  } = success;
  const legacySuccess = Object.freeze({ ...legacyCommon,
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
  }) as FarmOsDay147A5Evidence;
  const legacyChain = buildSuccessChain(legacySuccess);
  assert.equal(classifyCommittedA5ArtifactChain({ ...legacyChain,
    expectedExecutionNonce: passing.execution_nonce }),
  "VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE");
  assert.equal(validateSemanticSuccessA5Evidence(legacySuccess).accepted, false);
  const mismatchedEvidence = Uint8Array.from(chain.evidenceBytes);
  mismatchedEvidence[mismatchedEvidence.length - 2] ^= 1;
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    evidenceBytes: mismatchedEvidence,
    expectedExecutionNonce: passing.execution_nonce }).accepted, false);
  const mismatchedReceipt = Uint8Array.from(chain.receiptBytes);
  mismatchedReceipt[mismatchedReceipt.length - 2] ^= 1;
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    receiptBytes: mismatchedReceipt,
    expectedExecutionNonce: passing.execution_nonce }).accepted, false);
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    expectedExecutionNonce: "000000000000" }).accepted, false);
  assert.equal(validateCommittedA5ArtifactChain({ evidenceBytes: chain.evidenceBytes,
    receiptBytes: null, markerBytes: chain.markerBytes,
    expectedExecutionNonce: passing.execution_nonce }).accepted, false);
  const receiptValue = JSON.parse(Buffer.from(chain.receiptBytes).toString("utf8"));
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    receiptBytes: serialize({ ...receiptValue, receipt_status: "PENDING" }),
    expectedExecutionNonce: passing.execution_nonce }).accepted, false);
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    receiptBytes: serialize({ ...receiptValue,
      evidence_schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION }),
    expectedExecutionNonce: passing.execution_nonce }).accepted, false);
  const markerValue = JSON.parse(Buffer.from(chain.markerBytes).toString("utf8"));
  assert.equal(validateCommittedA5ArtifactChain({ ...chain,
    markerBytes: serialize({ ...markerValue, receipt_sha256: "0".repeat(64) }),
    expectedExecutionNonce: passing.execution_nonce }).accepted, false);
  const failure = failureEvidence({ nonce: "444444444444",
    primary: "DAY147_A5_MINIMAL_RUNNER_FAILED", cleanup,
    providerValidated: true });
  const failureBytes = validateFailureChain(failure);
  assert.equal(validateFailureA5Evidence({ evidence: failure,
    receiptPresent: false, markerPresent: false }).accepted, true);
  assert.equal(validateCommittedA5ArtifactChain({ evidenceBytes: failureBytes,
    receiptBytes: null, markerBytes: null,
    expectedExecutionNonce: failure.execution_nonce }).accepted, false);
  assert.equal(failure.durability_complete, true);
}

function memorySuccessChainIo(input: Readonly<{
  fault?: string;
}> = {}): Readonly<{ io: SuccessChainIo; files: Map<string, Uint8Array> }> {
  const files = new Map<string, Uint8Array>();
  const temporary = new Map<SuccessArtifactKind, Uint8Array>();
  let readCount = 0;
  const fail = (step: string) => {
    if (input.fault === step) throw new Error(`fault:${step}`);
  };
  const io: SuccessChainIo = Object.freeze({
    writeTemp(kind, _path, bytes) {
      fail(`${kind}.write`);
      temporary.set(kind, Uint8Array.from(bytes));
    },
    fsyncFile(kind) { fail(`${kind}.file_fsync`); },
    rename(kind, path) {
      fail(`${kind}.rename`);
      const bytes = temporary.get(kind);
      if (bytes === undefined) throw new Error("missing temporary");
      files.set(path, bytes);
      temporary.delete(kind);
    },
    fsyncParent(kind) { fail(`${kind}.parent_fsync`); },
    read(_kind, path) {
      readCount += 1;
      if (input.fault === "readback" && readCount === 1) {
        throw new Error("fault:readback");
      }
      const bytes = files.get(path);
      if (bytes === undefined) throw new Error("absent");
      if (input.fault === "hash_mismatch" && readCount === 1) {
        const changed = Uint8Array.from(bytes);
        changed[0] = (changed[0] ?? 0) ^ 1;
        return changed;
      }
      return Uint8Array.from(bytes);
    },
    remove(kind, path) {
      fail(`${kind}.remove`);
      files.delete(path);
    },
  });
  return Object.freeze({ files, io });
}

function runSuccessDurabilityStaticTests(
  passing: Day147A5ClientResult,
): void {
  const nonce = passing.execution_nonce;
  const chain = buildSuccessChain(successEvidence({ nonce, result: passing,
    postgresImageId: `sha256:${"d".repeat(64)}`, readinessElapsedMs: 100,
    transitionProvenance: staticTransitionSemanticObservation(),
    resultTransport: staticResultTransport(), cleanup: passingCleanupFixture() }));
  const runRoot = "/virtual/day147a5";
  const successIo = memorySuccessChainIo();
  assert.equal(commitSuccessChain({ runRoot, nonce, chain, io: successIo.io }),
    "COMMITTED_ACCEPTED");

  const durabilityFaults = [
    "evidence.file_fsync", "evidence.rename", "evidence.parent_fsync",
    "receipt.file_fsync", "receipt.rename", "receipt.parent_fsync",
    "marker.file_fsync", "marker.rename", "marker.parent_fsync",
    "readback", "hash_mismatch",
  ] as const;
  for (const fault of durabilityFaults) {
    const observation = memorySuccessChainIo({ fault });
    assert.throws(() => commitSuccessChain({ runRoot, nonce, chain,
      io: observation.io }), (error: unknown) => {
      assert.ok(error instanceof SuccessChainDurabilityError, fault);
      assert.equal(error.state, "INVALIDATED", fault);
      assert.equal(error.residualSuccessChainPossible, false, fault);
      return true;
    });
    assert.equal([...observation.files.keys()].some((path) =>
      path.endsWith(FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH) ||
      path.endsWith(FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH)), false, fault);
  }

  const rejectedValidator = (() => ({ accepted: false, reason: "fixture" })) as
    unknown as typeof validateCommittedA5ArtifactChain;
  const validatorObservation = memorySuccessChainIo();
  assert.throws(() => commitSuccessChain({ runRoot, nonce, chain,
    io: validatorObservation.io, committedValidator: rejectedValidator }),
  (error: unknown) => error instanceof SuccessChainDurabilityError &&
    error.primary === "DAY147_A5_SUCCESS_CHAIN_COMMITTED_VALIDATOR_REJECTED" &&
    error.state === "INVALIDATED");

  for (const fault of ["marker.remove", "receipt.remove",
    "invalidation.parent_fsync"] as const) {
    const observation = memorySuccessChainIo({ fault });
    assert.throws(() => commitSuccessChain({ runRoot, nonce, chain,
      io: observation.io, committedValidator: rejectedValidator }),
    (error: unknown) => error instanceof SuccessChainDurabilityError &&
      error.primary === "DAY147_A5_SUCCESS_CHAIN_COMMITTED_VALIDATOR_REJECTED" &&
      error.state === "INVALIDATION_FAILED" &&
      error.residualSuccessChainPossible);
    const evidenceBytes = observation.files.get(resolve(runRoot,
      FARM_OS_DAY147A5_EVIDENCE_RELATIVE_PATH)) ?? null;
    const receiptBytes = observation.files.get(resolve(runRoot,
      FARM_OS_DAY147A5_RECEIPT_RELATIVE_PATH)) ?? null;
    const markerBytes = observation.files.get(resolve(runRoot,
      FARM_OS_DAY147A5_COMMIT_RELATIVE_PATH)) ?? null;
    assert.equal(evidenceBytes !== null && validateCommittedA5ArtifactChain({
      evidenceBytes, receiptBytes, markerBytes,
      expectedExecutionNonce: nonce,
    }).accepted, false, fault);
  }
}

function runRepositoryGateStaticTests(
  passing: Day147A5ClientResult,
): MinimalV2RepositoryGateResult {
  const parsed = parsePorcelainV1Z(
    " M package.json\0?? scripts/hermes/path with spaces.ts\0",
  );
  assert.ok(Array.isArray(parsed));
  assert.deepEqual(parsed, [
    { xy: " M", relative_path: "package.json", entry_type: "tracked" },
    { xy: "??", relative_path: "scripts/hermes/path with spaces.ts",
      entry_type: "untracked" },
  ]);
  const malformed = parsePorcelainV1Z(" M package.json");
  assert.equal(Array.isArray(malformed), false);
  assert.equal((malformed as Exclude<MinimalV2RepositoryGateResult,
    { ok: true }>).failureCode, "SOURCE_ENTRY_MALFORMED");
  const rename = parsePorcelainV1Z(" R renamed path.ts\0original path.ts\0");
  assert.ok(Array.isArray(rename));
  assert.equal(rename[0]?.entry_type, "rename");
  const copy = parsePorcelainV1Z(" C copied path.ts\0original path.ts\0");
  assert.ok(Array.isArray(copy));
  assert.equal(copy[0]?.entry_type, "copy");
  const malformedRename = parsePorcelainV1Z(" R renamed.ts\0");
  assert.equal(Array.isArray(malformedRename), false);

  const dynamicBaselineEntries = (): RepositorySourceEntry[] =>
    [...EXACT_SOURCE_XY].map(([relative_path, xy]) => Object.freeze({ xy,
      relative_path, entry_type: xy === "??" ? "untracked" as const :
        "tracked" as const }));
  const closureEntry: RepositorySourceEntry = Object.freeze({
    xy: A6_CLOSURE_DOCUMENT_XY, relative_path: A6_CLOSURE_DOCUMENT_PATH,
    entry_type: "untracked",
  });
  const baselineEntries = (): RepositorySourceEntry[] =>
    [...dynamicBaselineEntries(), closureEntry];
  const closureText = [
    "# Day147-A closure",
    "execution_nonce: 813faed4c9ee",
    "evidence_sha256: 21f29d2655db666852e7e1af183aaeb24336b7d1e2b7f417540eca41f301243b",
    "receipt_sha256: a7145d55ac4ac2f9ade781d8f0b2db647bc60144e3c7836b1842c5a4285d53df",
    "commit_artifact_sha256: 40100db8e4819d6fc9bd815959ff0e9d9248b68330983041b97eb2c5dfdcce02",
    "case_count: 102",
    "automatic_promotion_count: 0",
    "active_state_unchanged: true",
    "production_operations: 0",
    "## Rollback procedure",
    "rollback: documented",
    "production_database_rollback_required: false",
    "## Day147-B entry gate",
    "  git_commit_required_before_day147_b: true",
    "  push_required_before_day147_b: true",
    "",
  ].join("\n");
  const closureObservation = (bytes = new TextEncoder().encode(closureText)):
    ClosureDocumentObservation => Object.freeze({ regularFile: true,
      symbolicLink: false, linkCount: 1, bytes });
  const cleanup = passingCleanupFixture();
  const observedFile = (bytes: Uint8Array): GeneratedArtifactFileObservation =>
    Object.freeze({ regularFile: true, symbolicLink: false, linkCount: 1,
      bytes });
  const artifactObservation = (nonce: string): GeneratedArtifactObservation => {
    const evidence = failureEvidence({ nonce,
      primary: "DAY147_A5_MINIMAL_RUNNER_FAILED", cleanup,
      providerValidated: true });
    return Object.freeze({ fileNames: Object.freeze(["evidence.json"]),
      files: Object.freeze({
        "evidence.json": observedFile(validateFailureChain(evidence)),
      }) });
  };
  const completeEvidence = successEvidence({ nonce: passing.execution_nonce,
    result: passing, postgresImageId: `sha256:${"d".repeat(64)}`,
    readinessElapsedMs: 100,
    transitionProvenance: staticTransitionSemanticObservation(),
    resultTransport: staticResultTransport(), cleanup });
  const completeChain = buildSuccessChain(completeEvidence);
  const successObservation = (chain: ReturnType<typeof buildSuccessChain>) =>
    Object.freeze({ fileNames: Object.freeze([
      "commit.json", "evidence.json", "receipt.json",
    ]), files: Object.freeze({
      "evidence.json": observedFile(chain.evidenceBytes),
      "receipt.json": observedFile(chain.receiptBytes),
      "commit.json": observedFile(chain.markerBytes),
    }) }) satisfies GeneratedArtifactObservation;
  const protectedBytes = new TextEncoder().encode("protected baseline");
  const protectedPath =
    "scripts/hermes/lib/farm_os_day147a5_evidence_contract.ts";
  const evaluate = (entries: readonly RepositorySourceEntry[], options: Readonly<{
    mode?: RepositoryGateMode;
    artifact?: GeneratedArtifactObservation;
    closure?: ClosureDocumentObservation;
    protectedObservation?: ProtectedFileObservation;
    artifactHashes?: ReadonlyMap<string, string>;
    protectedHashes?: ReadonlyMap<string, string>;
  }> = {}) => validateRepositoryEntries({ entries,
    mode: options.mode ?? "static",
    inspectArtifact: () => options.artifact ?? artifactObservation("abcdef123456"),
    inspectClosure: () => options.closure ?? closureObservation(),
    artifactHashes: options.artifactHashes,
    protectedHashes: options.protectedHashes,
    inspectProtected: () => options.protectedObservation ?? {
      regularFile: true, symbolicLink: false, bytes: protectedBytes },
  });
  const expectFailure = (result: MinimalV2RepositoryGateResult,
    code: MinimalV2RepositoryGateFailureCode) => {
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.failureCode, code);
  };

  assert.equal(evaluate(baselineEntries()).ok, true);
  expectFailure(evaluate(dynamicBaselineEntries()), "CLOSURE_DOCUMENT_INVALID");
  for (const path of ["unknown.ts", "nested/package.json", "package.json.backup",
    "docs/roadmap/day147-a-other-closure.md", "docs/extra.md"]) {
    expectFailure(evaluate([...baselineEntries(),
      { xy: "??", relative_path: path, entry_type: "untracked" }]),
    "SOURCE_PATH_UNEXPECTED");
  }
  assert.equal(evaluate(dynamicBaselineEntries(), {
    mode: "execute-minimal-network",
  }).ok, true);
  expectFailure(evaluate(baselineEntries(), {
    mode: "execute-minimal-network",
  }), "SOURCE_PATH_UNEXPECTED");
  expectFailure(evaluate(baselineEntries(), { closure: {
    ...closureObservation(), symbolicLink: true,
  } }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: {
    ...closureObservation(), linkCount: 2,
  } }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: closureObservation(
    new Uint8Array(A6_CLOSURE_DOCUMENT_MAXIMUM_SIZE_BYTES + 1),
  ) }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: closureObservation(
    Uint8Array.from([...new TextEncoder().encode(closureText), 0]),
  ) }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: closureObservation(
    Uint8Array.from([0xc3, 0x28]),
  ) }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: closureObservation(
    new TextEncoder().encode(closureText.replace("Day147-B", "Day147-C")),
  ) }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: closureObservation(
    new TextEncoder().encode(`${closureText}execution_nonce: 813faed4c9ee\n`),
  ) }), "CLOSURE_DOCUMENT_INVALID");
  expectFailure(evaluate(baselineEntries(), { closure: closureObservation(
    new TextEncoder().encode(closureText.replace(
      "21f29d2655db666852e7e1af183aaeb24336b7d1e2b7f417540eca41f301243b",
      "0".repeat(64))),
  ) }), "CLOSURE_DOCUMENT_INVALID");
  for (const [xy, entry_type, code] of [
    ["M ", "tracked", "STAGED_FILE_PRESENT"],
    [" D", "tracked", "SOURCE_STATUS_UNEXPECTED"],
    [" R", "rename", "SOURCE_STATUS_UNEXPECTED"],
    [" C", "copy", "SOURCE_STATUS_UNEXPECTED"],
  ] as const) {
    const entries = baselineEntries().map((entry) => entry.relative_path ===
      protectedPath ? { ...entry, xy, entry_type } : entry);
    expectFailure(evaluate(entries), code);
  }

  const nonce = "abcdef123456";
  const artifactPath =
    `reports/day147a5-isolated-postgres/runs/${nonce}/evidence.json`;
  const artifactEntry: RepositorySourceEntry = { xy: "??",
    relative_path: artifactPath, entry_type: "untracked" };
  const validArtifact = artifactObservation(nonce);
  const validArtifacts = evaluate([...baselineEntries(), artifactEntry],
    { artifact: validArtifact });
  assert.equal(validArtifacts.ok, true);
  if (validArtifacts.ok) {
    assert.equal(validArtifacts.sourceEntries.length, EXACT_SOURCE_XY.size + 1);
    assert.equal(validArtifacts.closureDocument?.classification,
      "A6_CLOSURE_DOCUMENT");
    assert.equal(validArtifacts.generatedArtifacts.length, 1);
  }
  const futureNonce = "fedcba654321";
  const future = evaluate([...baselineEntries(), { ...artifactEntry,
    relative_path:
      `reports/day147a5-isolated-postgres/runs/${futureNonce}/evidence.json` }],
  { artifact: artifactObservation(futureNonce), artifactHashes: new Map() });
  assert.equal(future.ok, true);
  for (const relative_path of [
    "reports/day147a5-isolated-postgres/runs/not-a-nonce/evidence.json",
    `reports/day147a5-isolated-postgres/runs/${nonce}/evidence.json.backup`,
  ]) expectFailure(evaluate([...baselineEntries(), { ...artifactEntry,
    relative_path }], { artifact: validArtifact }), "GENERATED_ARTIFACT_INVALID");
  expectFailure(evaluate([...baselineEntries(), artifactEntry], {
    artifact: { ...validArtifact, files: { "evidence.json": {
      ...validArtifact.files["evidence.json"]!, symbolicLink: true,
    } } },
  }), "GENERATED_ARTIFACT_INVALID");
  expectFailure(evaluate([...baselineEntries(), artifactEntry], {
    artifact: { ...validArtifact, files: { "evidence.json": observedFile(
      new TextEncoder().encode("{}"),
    ) } },
  }), "GENERATED_ARTIFACT_INVALID");
  expectFailure(evaluate([...baselineEntries(), artifactEntry], {
    artifact: validArtifact,
    artifactHashes: new Map([[artifactPath, "0".repeat(64)]]) },
  ), "GENERATED_ARTIFACT_HASH_MISMATCH");

  const successEntries = (["evidence.json", "receipt.json", "commit.json"] as const)
    .map((name): RepositorySourceEntry => ({ xy: "??", entry_type: "untracked",
      relative_path: `reports/day147a5-isolated-postgres/runs/${nonce}/${name}` }));
  const completeGate = evaluate([...baselineEntries(), ...successEntries], {
    artifact: successObservation(completeChain),
  });
  assert.equal(completeGate.ok, true);
  if (completeGate.ok) assert.equal(
    completeGate.generatedArtifacts[0]?.classification,
    "VALID_COMPLETE_SEMANTIC_SUCCESS_CHAIN");
  const {
    migrations: _m, case_registry: _c, transition_provenance: _p,
    state_invariants: _s, result_transport: _t, client_cleanup: _cc,
    resource_cleanup: _rc, ...legacyCommon
  } = completeEvidence;
  const legacyChain = buildSuccessChain({ ...legacyCommon,
    schema_version: FARM_OS_DAY147A5_EVIDENCE_SCHEMA_VERSION,
  } as FarmOsDay147A5Evidence);
  const legacyGate = evaluate([...baselineEntries(), ...successEntries], {
    artifact: successObservation(legacyChain),
  });
  assert.equal(legacyGate.ok, true);
  if (legacyGate.ok) assert.equal(
    legacyGate.generatedArtifacts[0]?.classification,
    "VALID_LEGACY_SUCCESS_CHAIN_SEMANTICALLY_INCOMPLETE");
  for (const missingName of ["receipt.json", "commit.json"] as const) {
    expectFailure(evaluate([...baselineEntries(), ...successEntries.filter(
      ({ relative_path }) => !relative_path.endsWith(missingName),
    )], { artifact: successObservation(completeChain) }),
    "GENERATED_ARTIFACT_INVALID");
  }
  expectFailure(evaluate([...baselineEntries(), ...successEntries], {
    artifact: { ...successObservation(completeChain),
      fileNames: [...successObservation(completeChain).fileNames, "extra.json"] },
  }), "GENERATED_ARTIFACT_INVALID");
  const malformedSuccess = successObservation(completeChain);
  expectFailure(evaluate([...baselineEntries(), ...successEntries], {
    artifact: { ...malformedSuccess, files: { ...malformedSuccess.files,
      "receipt.json": observedFile(new TextEncoder().encode("{}")) } },
  }), "GENERATED_ARTIFACT_INVALID");

  const protectedHashes = new Map([[protectedPath, sha256(protectedBytes)]]);
  assert.equal(evaluate(baselineEntries(), { protectedHashes }).ok, true);
  expectFailure(evaluate(baselineEntries(), { protectedHashes,
    protectedObservation: { regularFile: true, symbolicLink: false,
      bytes: new TextEncoder().encode("changed") } }),
  "PROTECTED_FILE_HASH_MISMATCH");

  const production = evaluateRepositoryGate(productionRunner(ZERO_COUNTERS()));
  reportRepositoryGate(production);
  assert.equal(production.ok, true);
  return production;
}

async function runStaticTests(): Promise<void> {
  const counters = ZERO_COUNTERS();
  const canonicalLeft = {
    status: "active",
    content: { crop: "example", amount: 1 },
  };
  const canonicalRight = {
    content: { amount: 1, crop: "example" },
    status: "active",
  };
  assert.equal(isDeepStrictEqual(canonicalLeft, canonicalRight), true);
  assert.equal(isDeepStrictEqual(canonicalLeft, {
    status: "active", content: { crop: "example", amount: 2 },
  }), false);
  assert.equal(isDeepStrictEqual([1, 2], [2, 1]), false);
  assert.equal(isDeepStrictEqual({ value: null }, {}), false);
  assert.equal(isDeepStrictEqual({ value: 1 }, { value: "1" }), false);
  assert.equal(isDeepStrictEqual({ value: true }, { value: "true" }), false);
  const passing = await runClientSuiteStaticTests();
  const repositoryGate = runRepositoryGateStaticTests(passing);
  await runDatabaseConnectionStaticTests();
  runMigrationDiagnosticStaticTests();
  runPreMigrationDiagnosticStaticTests();
  await runCaseSuiteDiagnosticStaticTests();
  runProviderStaticTests();
  runNetworkPreflightStaticTests();
  runBundleStaticTests();
  runRunnerSecurityStaticTests();
  runRunnerFailureStaticTests();
  runResultContractStaticTests(passing);
  runResultFilesystemStaticTests(passing);
  runStateInvariantStaticTests();
  runCleanupStaticTests();
  runEvidenceStaticTests(passing);
  runSuccessDurabilityStaticTests(passing);
  assert.deepEqual(counters, ZERO_COUNTERS());
  console.log(JSON.stringify({
    day147_a5_minimal_network_static: "PASS",
    minimal_static: "PASS",
    state_invariant_reporting: "PASS",
    state_invariant_measurement: "PASS",
    case_suite_reporting: "PASS",
    targeted_diagnostics: 0,
    shared_registry_count: DAY147_A5_EXPECTED_CASE_COUNT,
    shared_registry_digest: DAY147_A5_EXPECTED_REGISTRY_DIGEST,
    duplicate_suite_created: false,
    host_esbuild: true,
    host_bundle_syntax_check: "PASS",
    runner_phase_markers: "PASS",
    runner_top_level_failure: "PASS",
    sanitized_failure_result: "PASS",
    host_failure_classifier: "PASS",
    logs_before_cleanup: "PASS",
    result_transport: "PASS",
    result_filesystem_safety: "PASS",
    result_contract: "PASS",
    semantic_evidence_contract: "PASS",
    success_chain_validator: "PASS",
    repository_success_artifact_gate: "PASS",
    bundle_sha256: staticBundleSha256,
    runner_image: NODE_IMAGE,
    runner_command: ["node", "/workspace/client.cjs"],
    docker_commands: counters.dockerCommands,
    image_builds: counters.imageBuilds,
    networks_created: counters.networksCreated,
    containers_created: counters.containersCreated,
    database_connections: counters.databaseConnections,
    migrations: counters.migrations,
    dynamic_cases: counters.dynamicCases,
    real_evidence_writes: counters.evidenceWrites,
    repository_gate: repositoryGate.ok ? "PASS" : "FAIL",
    porcelain_nul_parser: "PASS",
    exact_source_allowlist: "PASS",
    a6_closure_document_classification: "A6_CLOSURE_DOCUMENT",
    exact_closure_document: "PASS",
    unexpected_closure_document: "REJECTED",
    closure_document_symlink: "REJECTED",
    closure_document_hardlink: "REJECTED",
    closure_document_size_limit: "PASS",
    closure_document_nul_byte: "REJECTED",
    closure_document_utf8: "PASS",
    closure_document_semantics: "PASS",
    dynamic_mode_closure_document: "SOURCE_PATH_UNEXPECTED",
    generated_artifact_separation: "PASS",
    protected_file_validation: "PASS",
    network_name_contract: "PASS",
    network_inspect_classifier: "PASS",
    docker_inspect_structured_parser: "PASS",
    docker_inspect_array_shape: "PASS",
    docker_inspect_formatted_object_shape: "PASS",
    docker_inspect_exact_not_found: "PASS",
    docker_inspect_arbitrary_exit_one_rejected: "PASS",
    docker_inspect_identity_mismatch_rejected: "PASS",
    cleanup_independence: "PASS",
    cleanup_report_consistency: "PASS",
    resource_protection: "PASS",
    provider_identity_recheck: "PASS",
    preflight_mutations: 0,
    diagnostic_authority: "PASS",
  }));
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (arguments_.mode === "diagnose-minimal-network-preflight") {
    if (arguments_.authority !== DIAGNOSTIC_AUTHORITY) {
      throw new Error("DAY147_A5_MINIMAL_ARGUMENT_AUTHORITY_BLOCKED");
    }
    diagnoseMinimalNetworkPreflight();
    return;
  }
  if (arguments_.mode === "execute-minimal-network") {
    if (arguments_.authority !== AUTHORITY) {
      throw new Error("DAY147_A5_MINIMAL_ARGUMENT_AUTHORITY_BLOCKED");
    }
    executeMinimalNetwork();
    return;
  }
  await runStaticTests();
}

if (pathToFileURL(resolve(process.argv[1] ?? "")).href === import.meta.url) {
  void main().catch((error: unknown) => {
    const candidate = error instanceof Error ? error.message : "";
    const code = /^(?:DAY147_A5_[A-Z0-9_]+|BLOCKED_[A-Z0-9_]+)$/.test(candidate)
      ? candidate : "DAY147_A5_MINIMAL_STATIC_FAILED";
    console.error(JSON.stringify({ day147_a5_minimal_failed: code,
      diagnostic: error instanceof MinimalBundleError
        ? error.diagnostic : bounded(candidate) }));
    process.exitCode = 1;
  });
}
