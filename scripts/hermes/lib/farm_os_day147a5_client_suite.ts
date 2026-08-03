import { createHash } from "node:crypto";
import { Client, type ClientConfig } from "pg";
import {
  DAY147_A5_CASE_INTEGRATION_KEYS,
  DAY147_A5_ASSERTION_VALUE_CLASSES,
  DAY147_A5_READ_ADAPTER_ASSERTION_IDS,
  DAY147_A5_SHARED_CASE_REGISTRY,
  caseRegistryDigest,
  orderedCaseRegistryIds,
  runDay147A5SharedClientAdapter,
  type Day147A5SharedClientAdapterInput,
  type Day147A5SharedClientAdapterResult,
  type Day147A5CaseFailureNotification,
  type Day147A5CaseFailureOperation,
  type Day147A5CaseIntegrationKey,
  type Day147A5AssertionValueClass,
  type Day147A5ReadAdapterAssertionId,
  type Day147A5MigrationStage,
  type Day147A5PreMigrationExecutionPhase,
  type Day147A5PreMigrationOperationKey,
} from "../test_farm_os_day147a5_isolated_postgres";

export { DAY147_A5_CASE_INTEGRATION_KEYS };
export type { Day147A5CaseIntegrationKey };

export const DAY147_A5_EXPECTED_CASE_COUNT = 102 as const;
export const DAY147_A5_EXPECTED_REGISTRY_DIGEST =
  "16a9402d7c0b6696cded4ecb7282cce550dd9745c662d75edf5e1426eb819eaa" as const;

export const DAY147_A5_CLIENT_MIGRATION_ORDER = Object.freeze([
  "day146",
  "prepare_apply",
  "prepare_verify",
  "activate_apply",
  "activate_verify",
] as const);

export const DAY147_A5_CLIENT_CASE_REGISTRY = DAY147_A5_SHARED_CASE_REGISTRY;

export type Day147A5ClientSuiteInput = Day147A5SharedClientAdapterInput & Readonly<{
  bundleIntegrity: Readonly<{
    expectedSha256: string;
    observedSha256: string;
  }>;
  onDatabaseConnectionReady?: () => void;
}>;

export const DAY147_A5_DATABASE_CONNECTION_FAILURE_CLASSES = Object.freeze([
  "DB_DNS_LOOKUP_FAILED",
  "DB_CONNECTION_REFUSED",
  "DB_CONNECTION_RESET",
  "DB_CONNECTION_TIMEOUT",
  "DB_AUTHENTICATION_FAILED",
  "DB_DATABASE_NOT_FOUND",
  "DB_SSL_CONFIGURATION_FAILED",
  "DB_SERVER_STARTING",
  "DB_PROTOCOL_FAILED",
  "DB_UNKNOWN_CONNECTION_FAILURE",
] as const);

export type Day147A5DatabaseConnectionFailureClass =
  typeof DAY147_A5_DATABASE_CONNECTION_FAILURE_CLASSES[number];

export class Day147A5DatabaseConnectionError extends Error {
  readonly failureClass: Day147A5DatabaseConnectionFailureClass;

  constructor(failureClass: Day147A5DatabaseConnectionFailureClass) {
    super("RUNNER_DATABASE_CONNECTION_FAILED");
    this.name = "Day147A5DatabaseConnectionError";
    this.failureClass = failureClass;
    this.stack = `${this.name}: ${this.message}`;
  }
}

export function classifyDay147A5DatabaseConnectionError(
  error: unknown,
): Day147A5DatabaseConnectionFailureClass {
  const code = typeof error === "object" && error !== null &&
      "code" in error && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return "DB_DNS_LOOKUP_FAILED";
  }
  if (code === "ECONNREFUSED") return "DB_CONNECTION_REFUSED";
  if (code === "ECONNRESET" || code === "EPIPE") {
    return "DB_CONNECTION_RESET";
  }
  if (code === "ETIMEDOUT" || code === "ERR_SOCKET_CONNECTION_TIMEOUT") {
    return "DB_CONNECTION_TIMEOUT";
  }
  if (code === "28P01" || code === "28000") {
    return "DB_AUTHENTICATION_FAILED";
  }
  if (code === "3D000") return "DB_DATABASE_NOT_FOUND";
  if (code === "57P03") return "DB_SERVER_STARTING";
  if ([
    "ERR_SSL_WRONG_VERSION_NUMBER", "ERR_SSL_UNKNOWN_PROTOCOL",
    "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN",
    "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  ].includes(code) || code.startsWith("ERR_TLS_")) {
    return "DB_SSL_CONFIGURATION_FAILED";
  }
  if (["08P01", "EPROTO", "ERR_STREAM_PREMATURE_CLOSE"].includes(code)) {
    return "DB_PROTOCOL_FAILED";
  }
  return "DB_UNKNOWN_CONNECTION_FAILURE";
}

export const DAY147_A5_MIGRATION_FAILURE_CLASSES = Object.freeze([
  "MIGRATION_SYNTAX_ERROR",
  "MIGRATION_UNDEFINED_TABLE",
  "MIGRATION_UNDEFINED_COLUMN",
  "MIGRATION_DUPLICATE_OBJECT",
  "MIGRATION_INSUFFICIENT_PRIVILEGE",
  "MIGRATION_CHECK_VIOLATION",
  "MIGRATION_FOREIGN_KEY_VIOLATION",
  "MIGRATION_UNIQUE_VIOLATION",
  "MIGRATION_RAISED_EXCEPTION",
  "MIGRATION_CONNECTION_FAILURE",
  "MIGRATION_TRANSACTION_FAILURE",
  "MIGRATION_INTERNAL_DATABASE_ERROR",
  "MIGRATION_UNKNOWN_FAILURE",
] as const);

export type Day147A5MigrationFailureClass =
  typeof DAY147_A5_MIGRATION_FAILURE_CLASSES[number];

export type Day147A5MigrationFailureDiagnostic = Readonly<{
  stage: Day147A5MigrationStage;
  failureClass: Day147A5MigrationFailureClass;
  sqlstate: string | "NONE";
  fixedFailureCode:
    | "RUNNER_DAY146_MIGRATION_FAILED"
    | "RUNNER_PREPARE_MIGRATION_FAILED"
    | "RUNNER_ACTIVATE_MIGRATION_FAILED";
}>;

function migrationFailureCodeForStage(
  stage: Day147A5MigrationStage,
): Day147A5MigrationFailureDiagnostic["fixedFailureCode"] {
  if (stage.endsWith("_DAY146_APPLY")) {
    return "RUNNER_DAY146_MIGRATION_FAILED";
  }
  if (stage.includes("_PREPARE_")) {
    return "RUNNER_PREPARE_MIGRATION_FAILED";
  }
  return "RUNNER_ACTIVATE_MIGRATION_FAILED";
}

export function classifyDay147A5MigrationFailure(input: Readonly<{
  stage: Day147A5MigrationStage;
  error: unknown;
}>): Day147A5MigrationFailureDiagnostic {
  const code = typeof input.error === "object" && input.error !== null &&
      "code" in input.error &&
      typeof (input.error as { code?: unknown }).code === "string"
    ? (input.error as { code: string }).code
    : "";
  const sqlstate = /^[0-9A-Z]{5}$/.test(code) ? code : "NONE";
  let failureClass: Day147A5MigrationFailureClass;
  switch (code) {
    case "42601": failureClass = "MIGRATION_SYNTAX_ERROR"; break;
    case "42P01": failureClass = "MIGRATION_UNDEFINED_TABLE"; break;
    case "42703": failureClass = "MIGRATION_UNDEFINED_COLUMN"; break;
    case "42710": failureClass = "MIGRATION_DUPLICATE_OBJECT"; break;
    case "42501": failureClass = "MIGRATION_INSUFFICIENT_PRIVILEGE"; break;
    case "23514": failureClass = "MIGRATION_CHECK_VIOLATION"; break;
    case "23503": failureClass = "MIGRATION_FOREIGN_KEY_VIOLATION"; break;
    case "23505": failureClass = "MIGRATION_UNIQUE_VIOLATION"; break;
    case "P0001": failureClass = "MIGRATION_RAISED_EXCEPTION"; break;
    case "25P02": failureClass = "MIGRATION_TRANSACTION_FAILURE"; break;
    case "XX000": failureClass = "MIGRATION_INTERNAL_DATABASE_ERROR"; break;
    default:
      failureClass = /^08[0-9A-Z]{3}$/.test(code) || [
          "ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT",
          "ERR_SOCKET_CONNECTION_TIMEOUT",
        ].includes(code)
        ? "MIGRATION_CONNECTION_FAILURE"
        : "MIGRATION_UNKNOWN_FAILURE";
  }
  return Object.freeze({
    stage: input.stage,
    failureClass,
    sqlstate,
    fixedFailureCode: migrationFailureCodeForStage(input.stage),
  });
}

export const DAY147_A5_PRE_MIGRATION_FAILURE_CLASSES = Object.freeze([
  "PRE_MIGRATION_ADMIN_CONNECTION_FAILED",
  "PRE_MIGRATION_SERVER_VERSION_QUERY_FAILED",
  "PRE_MIGRATION_SERVER_VERSION_VALIDATION_FAILED",
  "PRE_MIGRATION_SESSION_CONFIGURATION_FAILED",
  "PRE_MIGRATION_DATABASE_CREATE_FAILED",
  "PRE_MIGRATION_UNKNOWN_FAILURE",
] as const);

export type Day147A5PreMigrationFailureClass =
  typeof DAY147_A5_PRE_MIGRATION_FAILURE_CLASSES[number];

export type Day147A5PreMigrationFailureDiagnostic = Readonly<{
  lastPhase: Day147A5PreMigrationExecutionPhase;
  operationKey: Day147A5PreMigrationOperationKey;
  failureClass: Day147A5PreMigrationFailureClass;
  nodeErrorCode: string | "NONE";
  sqlstate: string | "NONE";
  fixedFailureCode: "RUNNER_PRE_MIGRATION_SETUP_FAILED";
}>;

export function classifyDay147A5PreMigrationFailure(input: Readonly<{
  lastPhase: Day147A5PreMigrationExecutionPhase;
  operationKey: Day147A5PreMigrationOperationKey;
  error: unknown;
}>): Day147A5PreMigrationFailureDiagnostic {
  const code = typeof input.error === "object" && input.error !== null &&
      "code" in input.error &&
      typeof (input.error as { code?: unknown }).code === "string"
    ? (input.error as { code: string }).code
    : "";
  const sqlstate = /^[0-9A-Z]{5}$/.test(code) ? code : "NONE";
  const nodeErrorCode = [
    "ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT",
    "ERR_SOCKET_CONNECTION_TIMEOUT",
  ].includes(code) ? code : "NONE";
  let failureClass: Day147A5PreMigrationFailureClass;
  switch (input.operationKey) {
    case "ADMIN_CLIENT_CONNECT":
      failureClass = sqlstate === "22023"
        ? "PRE_MIGRATION_SESSION_CONFIGURATION_FAILED"
        : "PRE_MIGRATION_ADMIN_CONNECTION_FAILED";
      break;
    case "SERVER_VERSION_QUERY":
      failureClass = "PRE_MIGRATION_SERVER_VERSION_QUERY_FAILED";
      break;
    case "SERVER_VERSION_VALIDATE":
      failureClass = "PRE_MIGRATION_SERVER_VERSION_VALIDATION_FAILED";
      break;
    case "ISOLATED_DATABASES_CREATE":
      failureClass = "PRE_MIGRATION_DATABASE_CREATE_FAILED";
      break;
    case "ADMIN_CLIENT_CONSTRUCT":
    case "PRE_MIGRATION_UNKNOWN":
      failureClass = "PRE_MIGRATION_UNKNOWN_FAILURE";
  }
  return Object.freeze({
    lastPhase: input.lastPhase,
    operationKey: input.operationKey,
    failureClass,
    nodeErrorCode,
    sqlstate,
    fixedFailureCode: "RUNNER_PRE_MIGRATION_SETUP_FAILED",
  });
}

export const DAY147_A5_CASE_FAILURE_CLASSES = Object.freeze([
  "CASE_REGISTRY_CONTRACT_FAILED",
  "CASE_CLIENT_SETUP_FAILED",
  "CASE_SQL_EXECUTION_FAILED",
  "CASE_ASSERTION_FAILED",
  "CASE_EXPECTED_REJECTION_MISMATCH",
  "CASE_RESULT_AGGREGATION_FAILED",
  "CASE_CLEANUP_FAILED",
  "CASE_UNKNOWN_FAILURE",
] as const);

export type Day147A5CaseFailureClass =
  typeof DAY147_A5_CASE_FAILURE_CLASSES[number];

export type Day147A5CaseFailureDiagnostic = Readonly<{
  operation: Day147A5CaseFailureOperation;
  integrationKey: Day147A5CaseIntegrationKey;
  caseId: string | "NONE";
  completedCaseCount: number;
  initialCandidateCompleted: boolean;
  assertionId: Day147A5ReadAdapterAssertionId | "NONE";
  expectedClass: Day147A5AssertionValueClass | "NONE";
  actualClass: Day147A5AssertionValueClass | "NONE";
  failureClass: Day147A5CaseFailureClass;
  sqlstate: string | "NONE";
  fixedFailureCode: "RUNNER_CASE_SUITE_FAILED";
}>;

export function classifyDay147A5CaseFailure(
  input: Day147A5CaseFailureNotification,
): Day147A5CaseFailureDiagnostic {
  const completedCaseIds = [...input.completed_case_ids];
  const completedCaseIdSet = new Set(completedCaseIds);
  const registryCaseIds = new Set(
    DAY147_A5_CLIENT_CASE_REGISTRY.map(({ id }) => id),
  );
  const completedContractValid = Number.isSafeInteger(input.completed_case_count) &&
    input.completed_case_count >= 0 &&
    input.completed_case_count <= DAY147_A5_EXPECTED_CASE_COUNT &&
    completedCaseIds.length === input.completed_case_count &&
    completedCaseIdSet.size === completedCaseIds.length &&
    completedCaseIds.every((caseId) => registryCaseIds.has(caseId));
  const integrationKeyValid = DAY147_A5_CASE_INTEGRATION_KEYS.includes(
    input.integration_key,
  );
  const groupedIntegration = input.integration_key !== "NONE";
  const readAdapterCaseIds = new Set(
    DAY147_A5_CLIENT_CASE_REGISTRY
      .filter(({ category }) => category === "read_integration")
      .map(({ id }) => id),
  );
  const identityContractValid = input.operation === "CASE_REGISTRY_PRECHECK"
    ? !groupedIntegration && input.case_id === null &&
      input.completed_case_count === 0
    : input.operation === "CASE_EXECUTION"
    ? groupedIntegration
      ? input.integration_key === "READ_ADAPTER_INTEGRATION"
        ? input.case_id !== null && readAdapterCaseIds.has(input.case_id)
        : input.case_id === null
      : input.case_id !== null && registryCaseIds.has(input.case_id)
    : !groupedIntegration &&
      (input.case_id === null || registryCaseIds.has(input.case_id));
  if (!completedContractValid || !integrationKeyValid ||
      !identityContractValid) {
    throw new Error("DAY147_A5_CASE_FAILURE_NOTIFICATION_INVALID");
  }
  const code = typeof input.error === "object" && input.error !== null &&
      "code" in input.error &&
      typeof (input.error as { code?: unknown }).code === "string"
    ? (input.error as { code: string }).code : "";
  const sqlstate = /^[0-9A-Z]{5}$/.test(code) ? code : "NONE";
  const fixedMessage = input.error instanceof Error &&
      /^DAY147_A5_[A-Z0-9_]+$/.test(input.error.message)
    ? input.error.message : "";
  const registryCase = input.case_id === null ? undefined :
    DAY147_A5_CLIENT_CASE_REGISTRY.find(({ id }) => id === input.case_id);
  const assertionId = input.assertion_id ?? "NONE";
  const expectedClass = input.expected_class ?? "NONE";
  const actualClass = input.actual_class ?? "NONE";
  const assertionFieldsPresent = assertionId !== "NONE" ||
    expectedClass !== "NONE" || actualClass !== "NONE";
  const assertionContractValid = assertionFieldsPresent
    ? input.integration_key === "READ_ADAPTER_INTEGRATION" &&
      input.case_id !== null &&
      DAY147_A5_READ_ADAPTER_ASSERTION_IDS.includes(
        assertionId as Day147A5ReadAdapterAssertionId,
      ) && DAY147_A5_ASSERTION_VALUE_CLASSES.includes(
        expectedClass as Day147A5AssertionValueClass,
      ) && DAY147_A5_ASSERTION_VALUE_CLASSES.includes(
        actualClass as Day147A5AssertionValueClass,
      )
    : true;
  if (!assertionContractValid) {
    throw new Error("DAY147_A5_CASE_FAILURE_NOTIFICATION_INVALID");
  }
  let failureClass: Day147A5CaseFailureClass;
  if (input.operation === "CASE_REGISTRY_PRECHECK") {
    failureClass = "CASE_REGISTRY_CONTRACT_FAILED";
  } else if (input.operation === "CASE_RESULT_AGGREGATION") {
    failureClass = "CASE_RESULT_AGGREGATION_FAILED";
  } else if (fixedMessage.includes("CLEANUP")) {
    failureClass = "CASE_CLEANUP_FAILED";
  } else if (sqlstate !== "NONE") {
    failureClass = "CASE_SQL_EXECUTION_FAILED";
  } else if (input.error instanceof Error &&
      input.error.name === "AssertionError") {
    failureClass = registryCase?.expected_outcome === "reject"
      ? "CASE_EXPECTED_REJECTION_MISMATCH" : "CASE_ASSERTION_FAILED";
  } else if (fixedMessage === "DAY147_A5_DYNAMIC_CASE_ERROR_INVALID") {
    failureClass = "CASE_EXPECTED_REJECTION_MISMATCH";
  } else if (fixedMessage === "DAY147_A5_DYNAMIC_CASE_EXECUTOR_MISSING" ||
      ["ECONNREFUSED", "ECONNRESET", "EPIPE", "ETIMEDOUT"].includes(code)) {
    failureClass = "CASE_CLIENT_SETUP_FAILED";
  } else {
    failureClass = "CASE_UNKNOWN_FAILURE";
  }
  return Object.freeze({
    operation: input.operation,
    integrationKey: input.integration_key,
    caseId: input.case_id ?? "NONE",
    completedCaseCount: input.completed_case_count,
    initialCandidateCompleted: completedCaseIdSet.has("initial_candidate_valid"),
    assertionId,
    expectedClass,
    actualClass,
    failureClass,
    sqlstate,
    fixedFailureCode: "RUNNER_CASE_SUITE_FAILED",
  });
}

type Day147A5DatabaseConnectionClient = Readonly<{
  connect: () => Promise<unknown>;
  end: () => Promise<void>;
}>;

export type Day147A5DatabaseConnectionDependencies = Readonly<{
  createClient: (config: ClientConfig) => Day147A5DatabaseConnectionClient;
}>;

export async function verifyDay147A5RunnerDatabaseConnection(
  input: Day147A5ClientSuiteInput,
  dependencies: Day147A5DatabaseConnectionDependencies,
): Promise<void> {
  checkInput(input);
  const connectionTimeoutMillis = 5_000;
  const client = dependencies.createClient({
    host: input.databaseHost,
    port: input.databasePort,
    database: input.databaseName,
    user: input.databaseUser,
    password: input.databasePassword,
    ssl: false,
    connectionTimeoutMillis,
    application_name: `farmos_day147a5_${input.executionNonce}_main_owner`,
  });
  let connectionError: unknown = null;
  try {
    await client.connect();
  } catch (error) {
    connectionError = error;
  }
  try {
    await client.end();
  } catch (error) {
    connectionError ??= error;
  }
  if (connectionError !== null) {
    throw new Day147A5DatabaseConnectionError(
      classifyDay147A5DatabaseConnectionError(connectionError),
    );
  }
  input.onDatabaseConnectionReady?.();
}

type CheckStatus = "PASS" | "FAILED" | "NOT_COMPLETED" | "NOT_STARTED";
type CaseStatus = "PASS" | "FAIL";

export const DAY147_A5_RUNNER_PHASES = Object.freeze([
  "CLIENT_PROCESS_STARTED", "BUNDLE_INTEGRITY_VALID",
  "ENVIRONMENT_CONTRACT_VALID", "RESULT_PATH_VALID",
  "DATABASE_CONNECTION_START", "DATABASE_CONNECTION_READY",
  "SHARED_ADAPTER_START", "MIGRATION_ARTIFACTS_READY",
  "SHARED_DYNAMIC_SUITE_START", "ISOLATED_DATABASES_CREATE_START",
  "ISOLATED_DATABASES_CREATE_PASS",
  "DAY146_MIGRATION_START", "DAY146_MIGRATION_PASS",
  "PREPARE_MIGRATION_START", "PREPARE_MIGRATION_PASS",
  "ACTIVATE_MIGRATION_START", "ACTIVATE_MIGRATION_PASS",
  "CASE_SUITE_START", "CASE_SUITE_PASS", "STATE_INVARIANTS_PASS",
  "CLIENT_CLEANUP_PASS", "RESULT_SERIALIZATION_PASS", "RESULT_WRITE_PASS",
] as const);

export type Day147A5RunnerPhase = typeof DAY147_A5_RUNNER_PHASES[number];
export type Day147A5RunnerLastPhase = Day147A5RunnerPhase | "NONE";

export type Day147A5RunnerFailureCode =
  | "RUNNER_BUNDLE_SYNTAX_INVALID"
  | "RUNNER_PROCESS_START_FAILED"
  | "RUNNER_BUNDLE_INTEGRITY_FAILED"
  | "RUNNER_ENVIRONMENT_CONTRACT_INVALID"
  | "RUNNER_RESULT_PATH_INVALID"
  | "RUNNER_DATABASE_CONNECTION_FAILED"
  | "RUNNER_PRE_MIGRATION_SETUP_FAILED"
  | "RUNNER_DAY146_MIGRATION_FAILED"
  | "RUNNER_PREPARE_MIGRATION_FAILED"
  | "RUNNER_ACTIVATE_MIGRATION_FAILED"
  | "RUNNER_CASE_SUITE_FAILED"
  | "RUNNER_STATE_INVARIANT_FAILED"
  | "RUNNER_CLIENT_CLEANUP_FAILED"
  | "RUNNER_RESULT_SERIALIZATION_FAILED"
  | "RUNNER_RESULT_WRITE_FAILED"
  | "RUNNER_UNKNOWN_TOP_LEVEL_FAILURE";

export type Day147A5ClientResult = Readonly<{
  schema_version: 2;
  execution_nonce: string;
  result: "PASS" | "FAIL";
  postgres_version: string | null;
  migration_results: Readonly<Record<
    "day146" | "prepare_apply" | "prepare_verify" |
    "activate_apply" | "activate_verify",
    CheckStatus
  >>;
  bundle_integrity: Readonly<{
    expected_sha256: string;
    observed_sha256: string;
    matched: boolean;
  }>;
  case_registry: Readonly<{
    expected_count: 102;
    executed_count: number;
    expected_digest: typeof DAY147_A5_EXPECTED_REGISTRY_DIGEST;
    actual_digest: string | null;
    cases: readonly Readonly<{ case_id: string; status: CaseStatus }>[];
    exact_case_set: boolean;
    duplicate_count: number;
    missing_count: number;
    unknown_count: number;
    failed_count: number;
  }>;
  legacy_active: CheckStatus;
  legacy_superseded: CheckStatus;
  candidate_first: CheckStatus;
  transition_matrix: Readonly<{
    status: CheckStatus;
    states: 5;
    ordered_pairs: 25;
    allowed: 4;
    forbidden: 21;
  }>;
  sequence_identity: CheckStatus;
  lifecycle_uniqueness: CheckStatus;
  active_uniqueness: CheckStatus;
  deferred_trigger: CheckStatus;
  append_only: CheckStatus;
  privilege_matrix: CheckStatus;
  bundle_integration: CheckStatus;
  read_integration: CheckStatus;
  concurrency_forward: CheckStatus;
  concurrency_reverse: CheckStatus;
  atomicity: CheckStatus;
  concurrency_timeline: readonly unknown[];
  row_counts: Readonly<Record<
    "snapshots" | "projections" | "events" | "lineage",
    number
  >>;
  state_invariants: Readonly<{
    baseline_digest: string | null;
    final_digest: string | null;
    automatic_promotion_count: number | null;
    active_state_unchanged: boolean;
    comparison_complete: boolean;
  }>;
  client_cleanup: Readonly<{
    clients_created: number;
    close_attempted: number;
    close_completed: number;
    close_failed: number;
    open_clients_after_cleanup: number;
  }>;
  failure_code: string | null;
  last_completed_phase: Day147A5RunnerLastPhase;
}>;

export type Day147A5ClientSuiteDependencies = Readonly<{
  executeSharedSuite: (
    input: Day147A5ClientSuiteInput,
  ) => Promise<Day147A5SharedClientAdapterResult>;
}>;

const RESULT_KEYS = Object.freeze([
  "schema_version", "execution_nonce", "result", "postgres_version",
  "migration_results", "bundle_integrity", "case_registry", "legacy_active",
  "legacy_superseded", "candidate_first", "transition_matrix",
  "sequence_identity", "lifecycle_uniqueness", "active_uniqueness",
  "deferred_trigger", "append_only", "privilege_matrix",
  "bundle_integration", "read_integration", "concurrency_forward",
  "concurrency_reverse", "atomicity", "state_invariants",
  "concurrency_timeline", "row_counts",
  "client_cleanup", "failure_code",
  "last_completed_phase",
] as const);

const STATUS_KEYS = Object.freeze([
  "legacy_active", "legacy_superseded", "candidate_first",
  "sequence_identity", "lifecycle_uniqueness", "active_uniqueness",
  "deferred_trigger", "append_only", "privilege_matrix",
  "bundle_integration", "read_integration", "concurrency_forward",
  "concurrency_reverse", "atomicity",
] as const);

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function safeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function caseProof(
  results: readonly Readonly<{ id: string; status: CaseStatus }>[],
): Day147A5ClientResult["case_registry"] {
  const expectedIds = orderedCaseRegistryIds();
  const expected = new Set(expectedIds);
  const seen = new Set<string>();
  let duplicateCount = 0;
  let unknownCount = 0;
  for (const result of results) {
    if (seen.has(result.id)) duplicateCount += 1;
    seen.add(result.id);
    if (!expected.has(result.id)) unknownCount += 1;
  }
  const missingCount = expectedIds.filter((id) => !seen.has(id)).length;
  const ordered = results.length === expectedIds.length && results.every(
    (result, index) => result.id === expectedIds[index],
  );
  return Object.freeze({
    expected_count: DAY147_A5_EXPECTED_CASE_COUNT,
    executed_count: results.length,
    expected_digest: DAY147_A5_EXPECTED_REGISTRY_DIGEST,
    actual_digest: duplicateCount === 0 && unknownCount === 0
      ? createHash("sha256")
        .update("farmos-day147a5-case-registry-v1\0")
        .update(JSON.stringify(results.map(({ id }) => id))).digest("hex")
      : null,
    cases: Object.freeze(results.map(({ id, status }) =>
      Object.freeze({ case_id: id, status })
    )),
    exact_case_set: ordered && duplicateCount === 0 && missingCount === 0 &&
      unknownCount === 0,
    duplicate_count: duplicateCount,
    missing_count: missingCount,
    unknown_count: unknownCount,
    failed_count: results.filter(({ status }) => status === "FAIL").length,
  });
}

function cleanupResult(
  cleanup: Day147A5SharedClientAdapterResult["cleanup"],
): Day147A5ClientResult["client_cleanup"] {
  return Object.freeze({
    clients_created: cleanup.created_count,
    close_attempted: cleanup.close_attempted_count,
    close_completed: cleanup.close_completed_count,
    close_failed: cleanup.close_failed_count,
    open_clients_after_cleanup: cleanup.open_client_count_after_cleanup,
  });
}

function cleanupPassed(cleanup: Day147A5ClientResult["client_cleanup"]): boolean {
  return cleanup.clients_created > 0 &&
    cleanup.clients_created === cleanup.close_attempted &&
    cleanup.clients_created === cleanup.close_completed &&
    cleanup.close_failed === 0 && cleanup.open_clients_after_cleanup === 0;
}

function checkInput(input: Day147A5ClientSuiteInput): void {
  if (!/^[a-f0-9]{12}$/.test(input.executionNonce) ||
    input.databaseHost !== "postgres" || input.databasePort !== 5432 ||
    !/^[a-z][a-z0-9_]{2,62}$/.test(input.databaseUser) ||
    input.databasePassword.length < 32 ||
    !new RegExp(`^farmos_day147a5_${input.executionNonce}_main$`).test(
      input.databaseName,
    ) || !/^[a-f0-9]{64}$/.test(input.bundleIntegrity.expectedSha256) ||
    !/^[a-f0-9]{64}$/.test(input.bundleIntegrity.observedSha256) ||
    input.bundleIntegrity.expectedSha256 !== input.bundleIntegrity.observedSha256 ||
    Object.values({
      day146: input.migrationSql.day146,
      prepareApply: input.migrationSql.prepare.apply,
      prepareVerify: input.migrationSql.prepare.verify,
      activateApply: input.migrationSql.activate.apply,
      activateVerify: input.migrationSql.activate.verify,
    }).some((sql) => typeof sql !== "string" || sql.length === 0)) {
    throw new Error("DAY147_A5_MINIMAL_CLIENT_INPUT_INVALID");
  }
}

export async function runDay147A5ClientSuiteWithDependencies(
  input: Day147A5ClientSuiteInput,
  dependencies: Day147A5ClientSuiteDependencies,
): Promise<Day147A5ClientResult> {
  checkInput(input);
  let shared: Day147A5SharedClientAdapterResult;
  try {
    shared = await dependencies.executeSharedSuite(input);
  } catch (error) {
    const candidate = error instanceof Error ? error.message : "";
    shared = {
      postgres_version: null,
      test_results: [],
      concurrency_timeline: [],
      row_counts: {},
      cleanup: {
        created_count: 0, close_attempted_count: 0,
        close_completed_count: 0, close_failed_count: 0,
        open_client_count_after_cleanup: 0,
        duplicate_close_attempt_count: 0,
      },
      failure_code: /^DAY147_A5_[A-Z0-9_]+$/.test(candidate) ||
          candidate === "BLOCKED_CHECKSUM_MISMATCH"
        ? candidate : "DAY147_A5_MINIMAL_CLIENT_FAILED",
    };
  }
  const results = shared.test_results.map(({ id, status }) => ({ id, status }));
  const proof = caseProof(results);
  const cleanup = cleanupResult(shared.cleanup);
  const stateInvariants = shared.state_invariants ?? Object.freeze({
    baseline_digest: null,
    final_digest: null,
    automatic_promotion_count: null,
    active_state_unchanged: false,
    comparison_complete: false,
  });
  const pass = shared.failure_code === null &&
    typeof shared.postgres_version === "string" &&
    shared.postgres_version.length > 0 && proof.executed_count === 102 &&
    proof.actual_digest === DAY147_A5_EXPECTED_REGISTRY_DIGEST &&
    proof.exact_case_set && proof.duplicate_count === 0 &&
    proof.missing_count === 0 && proof.unknown_count === 0 &&
    proof.failed_count === 0 && cleanupPassed(cleanup) &&
    stateInvariants.comparison_complete &&
    stateInvariants.automatic_promotion_count === 0 &&
    stateInvariants.active_state_unchanged &&
    stateInvariants.baseline_digest === stateInvariants.final_digest;
  const status: CheckStatus = pass ? "PASS" :
    proof.failed_count > 0 ? "FAILED" : "NOT_COMPLETED";
  const fallbackMigrationStatus: CheckStatus = pass ? "PASS" :
    shared.failure_code === "DAY147_A5_MINIMAL_MIGRATION_FAILED" ||
        shared.failure_code === "BLOCKED_CHECKSUM_MISMATCH"
      ? "FAILED" : "NOT_COMPLETED";
  const migrationResults = shared.migration_results ?? Object.freeze({
    day146: fallbackMigrationStatus,
    prepare_apply: fallbackMigrationStatus,
    prepare_verify: fallbackMigrationStatus,
    activate_apply: fallbackMigrationStatus,
    activate_verify: fallbackMigrationStatus,
  });
  const result: Day147A5ClientResult = Object.freeze({
    schema_version: 2,
    execution_nonce: input.executionNonce,
    result: pass ? "PASS" : "FAIL",
    postgres_version: shared.postgres_version,
    migration_results: Object.freeze({
      day146: migrationResults.day146,
      prepare_apply: migrationResults.prepare_apply,
      prepare_verify: migrationResults.prepare_verify,
      activate_apply: migrationResults.activate_apply,
      activate_verify: migrationResults.activate_verify,
    }),
    bundle_integrity: Object.freeze({
      expected_sha256: input.bundleIntegrity.expectedSha256,
      observed_sha256: input.bundleIntegrity.observedSha256,
      matched: input.bundleIntegrity.expectedSha256 ===
        input.bundleIntegrity.observedSha256,
    }),
    case_registry: proof,
    legacy_active: status,
    legacy_superseded: status,
    candidate_first: status,
    transition_matrix: Object.freeze({ status, states: 5, ordered_pairs: 25,
      allowed: 4, forbidden: 21 }),
    sequence_identity: status,
    lifecycle_uniqueness: status,
    active_uniqueness: status,
    deferred_trigger: status,
    append_only: status,
    privilege_matrix: status,
    bundle_integration: status,
    read_integration: status,
    concurrency_forward: status,
    concurrency_reverse: status,
    atomicity: status,
    concurrency_timeline: Object.freeze([...shared.concurrency_timeline]),
    row_counts: Object.freeze({
      snapshots: shared.row_counts.snapshots ?? 0,
      projections: shared.row_counts.projections ?? 0,
      events: shared.row_counts.events ?? 0,
      lineage: shared.row_counts.lineage ?? 0,
    }),
    state_invariants: Object.freeze({ ...stateInvariants }),
    client_cleanup: cleanup,
    failure_code: pass ? null :
      shared.failure_code ?? (cleanupPassed(cleanup)
        ? "DAY147_A5_MINIMAL_DYNAMIC_VALIDATION_FAILED"
        : "DAY147_A5_MINIMAL_CLIENT_CLEANUP_FAILED"),
    last_completed_phase: pass ? "CLIENT_CLEANUP_PASS" : "NONE",
  });
  if (!validateDay147A5ClientResult(result, input.executionNonce)) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_CONTRACT_INVALID");
  }
  return result;
}

export async function runDay147A5ClientSuite(
  input: Day147A5ClientSuiteInput,
): Promise<Day147A5ClientResult> {
  await verifyDay147A5RunnerDatabaseConnection(input, {
    createClient(config) {
      return new Client(config);
    },
  });
  return runDay147A5ClientSuiteWithDependencies(input, {
    executeSharedSuite: runDay147A5SharedClientAdapter,
  });
}

export function validateDay147A5ClientResult(
  value: unknown,
  expectedNonce: string,
): value is Day147A5ClientResult {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    !/^[a-f0-9]{12}$/.test(expectedNonce) ||
    !exactKeys(value as Record<string, unknown>, RESULT_KEYS)) return false;
  const result = value as Record<string, unknown>;
  if (result.schema_version !== 2 || result.execution_nonce !== expectedNonce ||
    !["PASS", "FAIL"].includes(String(result.result)) ||
    !(result.postgres_version === null ||
      typeof result.postgres_version === "string") ||
    typeof result.migration_results !== "object" ||
    result.migration_results === null ||
    !exactKeys(result.migration_results as Record<string, unknown>,
      DAY147_A5_CLIENT_MIGRATION_ORDER) ||
    Object.values(result.migration_results).some((status) =>
      !["PASS", "FAILED", "NOT_COMPLETED", "NOT_STARTED"].includes(String(status))
    ) || typeof result.bundle_integrity !== "object" ||
    result.bundle_integrity === null ||
    !exactKeys(result.bundle_integrity as Record<string, unknown>, [
      "expected_sha256", "observed_sha256", "matched",
    ]) || typeof result.state_invariants !== "object" ||
    result.state_invariants === null ||
    !exactKeys(result.state_invariants as Record<string, unknown>, [
      "baseline_digest", "final_digest", "automatic_promotion_count",
      "active_state_unchanged", "comparison_complete",
    ]) || typeof result.transition_matrix !== "object" ||
    result.transition_matrix === null ||
    !exactKeys(result.transition_matrix as Record<string, unknown>, [
      "status", "states", "ordered_pairs", "allowed", "forbidden",
    ]) || JSON.stringify(result.transition_matrix) !== JSON.stringify({
      status: (result.transition_matrix as Record<string, unknown>).status,
      states: 5, ordered_pairs: 25, allowed: 4, forbidden: 21,
    }) || STATUS_KEYS.some((key) =>
      !["PASS", "FAILED", "NOT_COMPLETED", "NOT_STARTED"].includes(String(result[key]))
    ) || typeof result.case_registry !== "object" ||
    result.case_registry === null ||
    !exactKeys(result.case_registry as Record<string, unknown>, [
      "expected_count", "executed_count", "expected_digest", "actual_digest",
      "cases", "exact_case_set", "duplicate_count", "missing_count",
      "unknown_count", "failed_count",
    ]) || typeof result.client_cleanup !== "object" ||
    result.client_cleanup === null ||
    !exactKeys(result.client_cleanup as Record<string, unknown>, [
      "clients_created", "close_attempted", "close_completed", "close_failed",
      "open_clients_after_cleanup",
    ]) || !Array.isArray(result.concurrency_timeline) ||
    typeof result.row_counts !== "object" || result.row_counts === null ||
    !exactKeys(result.row_counts as Record<string, unknown>, [
      "snapshots", "projections", "events", "lineage",
    ]) || Object.values(result.row_counts).some((count) => !safeCount(count))) {
    return false;
  }
  const registry = result.case_registry as Record<string, unknown>;
  const cleanup = result.client_cleanup as Record<string, unknown>;
  const bundle = result.bundle_integrity as Record<string, unknown>;
  const invariants = result.state_invariants as Record<string, unknown>;
  if (registry.expected_count !== 102 ||
    registry.expected_digest !== DAY147_A5_EXPECTED_REGISTRY_DIGEST ||
    !safeCount(registry.executed_count) || !Array.isArray(registry.cases) ||
    registry.executed_count !== registry.cases.length ||
    !["boolean"].includes(typeof registry.exact_case_set) ||
    ["duplicate_count", "missing_count", "unknown_count", "failed_count"]
      .some((key) => !safeCount(registry[key])) ||
    Object.values(cleanup).some((count) => !safeCount(count)) ||
    !/^[a-f0-9]{64}$/.test(String(bundle.expected_sha256)) ||
    !/^[a-f0-9]{64}$/.test(String(bundle.observed_sha256)) ||
    typeof bundle.matched !== "boolean" ||
    !(invariants.baseline_digest === null ||
      /^[a-f0-9]{64}$/.test(String(invariants.baseline_digest))) ||
    !(invariants.final_digest === null ||
      /^[a-f0-9]{64}$/.test(String(invariants.final_digest))) ||
    !(invariants.automatic_promotion_count === null ||
      safeCount(invariants.automatic_promotion_count)) ||
    typeof invariants.active_state_unchanged !== "boolean" ||
    typeof invariants.comparison_complete !== "boolean" ||
    !(result.failure_code === null || typeof result.failure_code === "string" &&
      /^(?:DAY147_A5_[A-Z0-9_]+|BLOCKED_CHECKSUM_MISMATCH|RUNNER_[A-Z0-9_]+)$/.test(
        result.failure_code,
      )) || !["NONE", ...DAY147_A5_RUNNER_PHASES].includes(
        String(result.last_completed_phase) as Day147A5RunnerLastPhase,
      )) return false;
  const cases = registry.cases as unknown[];
  if (cases.some((item) => typeof item !== "object" || item === null ||
    Array.isArray(item) || !exactKeys(item as Record<string, unknown>, [
      "case_id", "status",
    ]) || typeof (item as Record<string, unknown>).case_id !== "string" ||
    !["PASS", "FAIL"].includes(String(
      (item as Record<string, unknown>).status,
    )))) return false;
  const caseIds = cases.map((item) =>
    String((item as Record<string, unknown>).case_id)
  );
  const observedFailedCount = cases.filter((item) =>
    (item as Record<string, unknown>).status === "FAIL"
  ).length;
  const observedDigest = createHash("sha256")
    .update("farmos-day147a5-case-registry-v1\0")
    .update(JSON.stringify(caseIds)).digest("hex");
  if (registry.failed_count !== observedFailedCount ||
    (cases.length > 0 && registry.actual_digest !== observedDigest) ||
    new Set(caseIds).size !== caseIds.length) return false;
  if (result.result === "PASS") {
    if (result.postgres_version === null || result.failure_code !== null ||
      registry.executed_count !== 102 || registry.actual_digest !==
        DAY147_A5_EXPECTED_REGISTRY_DIGEST ||
      registry.exact_case_set !== true || registry.duplicate_count !== 0 ||
      registry.missing_count !== 0 || registry.unknown_count !== 0 ||
      registry.failed_count !== 0 || bundle.matched !== true ||
      JSON.stringify(caseIds) !== JSON.stringify(orderedCaseRegistryIds()) ||
      bundle.expected_sha256 !== bundle.observed_sha256 ||
      invariants.comparison_complete !== true ||
      invariants.automatic_promotion_count !== 0 ||
      invariants.active_state_unchanged !== true ||
      invariants.baseline_digest !== invariants.final_digest ||
      Object.values(result.migration_results).some((status) => status !== "PASS") ||
      STATUS_KEYS.some((key) => result[key] !== "PASS") ||
      (result.transition_matrix as Record<string, unknown>).status !== "PASS" ||
      !cleanupPassed(cleanup as unknown as Day147A5ClientResult["client_cleanup"])) {
      return false;
    }
  } else if (typeof result.failure_code !== "string") return false;
  const serialized = JSON.stringify(result);
  return !/(?:password|connection[_ ]?url|container[_ ]?id|network[_ ]?id|\bpid\b|stack|environment[_ ]?dump|postgres(?:ql)?:\/\/|\/Users\/|\/private\/)/i
    .test(serialized);
}

export function createDay147A5RunnerFailureResult(input: Readonly<{
  executionNonce: string;
  expectedBundleSha256: string;
  observedBundleSha256?: string;
  failureCode: Day147A5RunnerFailureCode;
  lastCompletedPhase: Day147A5RunnerLastPhase;
}>): Day147A5ClientResult {
  const expectedSha256 = /^[a-f0-9]{64}$/.test(input.expectedBundleSha256)
    ? input.expectedBundleSha256 : "0".repeat(64);
  const observedSha256 = input.observedBundleSha256 !== undefined &&
      /^[a-f0-9]{64}$/.test(input.observedBundleSha256)
    ? input.observedBundleSha256 : "0".repeat(64);
  const notStarted = "NOT_STARTED" as const;
  const bundleValidated = input.lastCompletedPhase !== "NONE" &&
    DAY147_A5_RUNNER_PHASES.indexOf(
      input.lastCompletedPhase as Day147A5RunnerPhase,
    ) >= DAY147_A5_RUNNER_PHASES.indexOf("BUNDLE_INTEGRITY_VALID");
  const result: Day147A5ClientResult = Object.freeze({
    schema_version: 2, execution_nonce: input.executionNonce, result: "FAIL",
    postgres_version: null,
    migration_results: Object.freeze({ day146: notStarted,
      prepare_apply: notStarted, prepare_verify: notStarted,
      activate_apply: notStarted, activate_verify: notStarted }),
    bundle_integrity: Object.freeze({ expected_sha256: expectedSha256,
      observed_sha256: observedSha256,
      matched: bundleValidated && expectedSha256 === observedSha256 }),
    case_registry: Object.freeze({ expected_count: DAY147_A5_EXPECTED_CASE_COUNT,
      executed_count: 0, expected_digest: DAY147_A5_EXPECTED_REGISTRY_DIGEST,
      actual_digest: null, cases: Object.freeze([]), exact_case_set: false,
      duplicate_count: 0, missing_count: DAY147_A5_EXPECTED_CASE_COUNT,
      unknown_count: 0, failed_count: 0 }),
    legacy_active: notStarted, legacy_superseded: notStarted,
    candidate_first: notStarted,
    transition_matrix: Object.freeze({ status: notStarted, states: 5,
      ordered_pairs: 25, allowed: 4, forbidden: 21 }),
    sequence_identity: notStarted, lifecycle_uniqueness: notStarted,
    active_uniqueness: notStarted, deferred_trigger: notStarted,
    append_only: notStarted, privilege_matrix: notStarted,
    bundle_integration: notStarted, read_integration: notStarted,
    concurrency_forward: notStarted, concurrency_reverse: notStarted,
    atomicity: notStarted, concurrency_timeline: Object.freeze([]),
    row_counts: Object.freeze({ snapshots: 0, projections: 0, events: 0,
      lineage: 0 }),
    state_invariants: Object.freeze({ baseline_digest: null,
      final_digest: null, automatic_promotion_count: null,
      active_state_unchanged: false, comparison_complete: false }),
    client_cleanup: Object.freeze({ clients_created: 0, close_attempted: 0,
      close_completed: 0, close_failed: 0, open_clients_after_cleanup: 0 }),
    failure_code: input.failureCode,
    last_completed_phase: input.lastCompletedPhase,
  });
  if (!validateDay147A5ClientResult(result, input.executionNonce)) {
    throw new Error("DAY147_A5_MINIMAL_RESULT_CONTRACT_INVALID");
  }
  return result;
}

if (DAY147_A5_CLIENT_CASE_REGISTRY.length !== DAY147_A5_EXPECTED_CASE_COUNT ||
  caseRegistryDigest() !== DAY147_A5_EXPECTED_REGISTRY_DIGEST) {
  throw new Error("DAY147_A5_SHARED_REGISTRY_CONTRACT_INVALID");
}
