import {
  FARM_OS_PTE_C2A_SOURCE_COMMIT,
  FARM_OS_PTE_C2B_APPLICATION_NAME,
  FARM_OS_PTE_C2B_AUTOMATIC_RETRY,
  FARM_OS_PTE_C2B_CASE_REGISTRY,
  FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY,
  FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
  FARM_OS_PTE_C2B_DATABASE,
  FARM_OS_PTE_C2B_EVIDENCE_VERSION,
  FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY,
  FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY,
  FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST,
  FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
  FARM_OS_PTE_C2B_POSTGRES_MAJOR,
  deriveFarmOsPteC2bOwnedResources,
  digestFarmOsPteC2b,
  parseFarmOsPteC2bCleanupResult,
  parseFarmOsPteC2bEvidence,
  parseFarmOsPteC2bImageAuthority,
  parseFarmOsPteC2bAuthorizationEnvelopeSyntax,
  parseFarmOsPteC2bSourceLineage,
  validateFarmOsPteC2bAuthorizationForExecution,
  validateFarmOsPteC2bExecutionWindow,
  type FarmOsPteC2bAuthorizationEnvelope,
  type FarmOsPteC2bCaseDefinition,
  type FarmOsPteC2bCaseResult,
  type FarmOsPteC2bCleanupResult,
  type FarmOsPteC2bClassification,
  type FarmOsPteC2bEvidence,
  type FarmOsPteC2bImageAuthority,
  type FarmOsPteC2bOwnedResources,
  type FarmOsPteC2bResourceType,
  type FarmOsPteC2bSourceLineage,
} from "./farm_os_production_target_execution_postgres_qualification_contract";
import {
  FARM_OS_PTE_C2B_FIXTURE_AUTHORITY,
  FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE_DIGEST,
} from "./farm_os_production_target_execution_postgres_qualification_fixture";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256,
} from "../../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";
import {
  validateFarmOsPteC2bRealExecutionCapability,
  type FarmOsPteC2bRealExecutionCapability,
} from "./farm_os_production_target_execution_postgres_qualification_docker_adapter";

export const FARM_OS_PTE_C2B_EXECUTION_POLICY = Object.freeze({
  source_state: "QUALIFICATION_SOURCE_ARTIFACT_CREATED_CANDIDATE",
  production_target: "FORBIDDEN",
  production_credentials: "FORBIDDEN",
  docker_qualification_authorized: false,
  postgres_connection_authorized: false,
  migration_application_authorized: false,
  automatic_retry: FARM_OS_PTE_C2B_AUTOMATIC_RETRY,
  case_count: 66,
  process_model: "INDEPENDENT_CONNECTIONS_SINGLE_NODE_PROCESS",
  ipc_socket_count: 0,
  external_operation_count: 0,
} as const);

export const FARM_OS_PTE_C2B_MIGRATION_PLAN = Object.freeze({
  c2a_source_commit: FARM_OS_PTE_C2A_SOURCE_COMMIT,
  migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  apply_path: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH,
  apply_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  verify_path: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH,
  verify_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256,
  migration_selection: "EXACT_ONLY",
  auto_migration: false,
  verify_mode: "READ_ONLY",
} as const);

export const FARM_OS_PTE_C2B_EXECUTOR_FAILURE_CODES = Object.freeze([
  "INPUT_INVALID", "AUTHORIZATION_INVALID", "REAL_CAPABILITY_INVALID",
  "SOURCE_IDENTITY_MISMATCH", "IMAGE_AUTHORITY_INVALID",
  "BLOCKED_ENVIRONMENT", "OWNERSHIP_CONFLICT", "FIXTURE_SETUP_FAILED",
  "MIGRATION_APPLY_FAILED", "MIGRATION_HISTORY_MISMATCH", "VERIFY_FAILED",
  "CASE_RESULT_INVALID", "CASE_FAILED", "CLEANUP_FAILED", "EVIDENCE_INVALID",
  "EXECUTION_FAILED",
] as const);
export type FarmOsPteC2bExecutorFailureCode =
  typeof FARM_OS_PTE_C2B_EXECUTOR_FAILURE_CODES[number];

export class FarmOsPteC2bQualificationError extends Error {
  constructor(readonly code: FarmOsPteC2bExecutorFailureCode) {
    super(code);
    this.name = "FarmOsPteC2bQualificationError";
  }
}

export type FarmOsPteC2bObservedEnvironment = Readonly<{
  observed_image_id: `sha256:${string}`;
  platform: string;
  server_version_num: number;
  server_version: string;
  container_identity_digest: `sha256:${string}`;
  network_identity_digest: `sha256:${string}`;
  volume_identity_digest: `sha256:${string}`;
  database_identity_digest: `sha256:${string}`;
}>;

export interface FarmOsPteC2bQualificationAdapter {
  preflight(input: Readonly<{
    image: FarmOsPteC2bImageAuthority;
    resources: FarmOsPteC2bOwnedResources;
    postgres_major: 17;
    database: typeof FARM_OS_PTE_C2B_DATABASE;
    application_name: typeof FARM_OS_PTE_C2B_APPLICATION_NAME;
    record_resource_transition: (transition: FarmOsPteC2bResourceCreationTransition) => boolean;
  }>): Promise<Readonly<{
    status: "READY" | "BLOCKED_ENVIRONMENT";
    observed: FarmOsPteC2bObservedEnvironment | null;
  }>>;
  prepareFixture(input: Readonly<{
    resources: FarmOsPteC2bOwnedResources;
    fixture_authority: typeof FARM_OS_PTE_C2B_FIXTURE_AUTHORITY;
    fixture_digest: typeof FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE_DIGEST;
  }>): Promise<"PASS">;
  applyExactMigration(plan: typeof FARM_OS_PTE_C2B_MIGRATION_PLAN): Promise<"PASS">;
  recordAndVerifyMigrationHistory(plan: typeof FARM_OS_PTE_C2B_MIGRATION_PLAN): Promise<"PASS">;
  executeExactReadOnlyVerifier(plan: typeof FARM_OS_PTE_C2B_MIGRATION_PLAN): Promise<"PASS">;
  executeCase(testCase: FarmOsPteC2bCaseDefinition): Promise<FarmOsPteC2bCaseResult>;
  cleanupExactOwnedResources(input: Readonly<{ resources: FarmOsPteC2bOwnedResources;
    creation_ledger: readonly FarmOsPteC2bResourceCreationLedger[] }>):
    Promise<FarmOsPteC2bCleanupResult>;
}

export type FarmOsPteC2bResourceCreationTransition = Readonly<{
  resource_type: FarmOsPteC2bResourceType;
  state: "CREATED_OWNED" | "CREATED_UNOWNED_COLLISION" | "UNKNOWN";
  observed_identity: string | null;
}>;
export type FarmOsPteC2bResourceCreationLedger = Readonly<{
  resource_type: FarmOsPteC2bResourceType;
  expected_name: string;
  state: "NOT_CREATED" | "CREATED_OWNED" | "CREATED_UNOWNED_COLLISION" | "UNKNOWN";
  observed_identity: string | null;
}>;

export interface FarmOsPteC2bSourceLineageResolver {
  resolveExecutingSourceLineage(): Promise<FarmOsPteC2bSourceLineage>;
}

export type FarmOsPteC2bExecutorInput = Readonly<{
  execution_nonce: string;
  image_authority: FarmOsPteC2bImageAuthority;
  started_at_metadata: string;
  ended_at_metadata: string;
  adapter: FarmOsPteC2bQualificationAdapter;
  real_execution_capability: FarmOsPteC2bRealExecutionCapability | unknown;
  authorization: FarmOsPteC2bAuthorizationEnvelope | unknown;
  source_lineage_resolver: FarmOsPteC2bSourceLineageResolver;
}>;

export type FarmOsPteC2bRunResult = Readonly<{
  classification: FarmOsPteC2bClassification;
  failure_code: FarmOsPteC2bExecutorFailureCode | null;
  evidence: FarmOsPteC2bEvidence | null;
  cleanup: FarmOsPteC2bCleanupResult | null;
  automatic_retry_count: 0;
  raw_error_included: false;
}>;

function fail(code: FarmOsPteC2bExecutorFailureCode): never {
  throw new FarmOsPteC2bQualificationError(code);
}

function observedEnvironmentIsExact(value: FarmOsPteC2bObservedEnvironment): boolean {
  return /^sha256:[a-f0-9]{64}$/u.test(value.observed_image_id) &&
    /^linux\/(?:amd64|arm64)(?:\/v8)?$/u.test(value.platform) &&
    Number.isSafeInteger(value.server_version_num) && value.server_version_num >= 170000 &&
    value.server_version_num < 180000 &&
    /^PostgreSQL 17\.[0-9]+(?:[ .(][A-Za-z0-9_+.,() /:-]*)?$/u.test(value.server_version) &&
    [value.container_identity_digest, value.network_identity_digest,
      value.volume_identity_digest, value.database_identity_digest]
      .every((digest) => /^sha256:[a-f0-9]{64}$/u.test(digest));
}

function resultIsExact(
  result: FarmOsPteC2bCaseResult,
  testCase: FarmOsPteC2bCaseDefinition,
): boolean {
  return result.case_id === testCase[0] && result.status === "PASS" &&
    /^[A-Z][A-Z0-9_]{0,63}$/u.test(result.actual_result) &&
    result.actual_result === testCase[2] && result.winner_count === testCase[3] &&
    result.authoritative_row_count === testCase[3] && Array.isArray(result.loser_results) &&
    result.loser_results.every((entry) => testCase[4].includes(entry)) &&
    new Set(result.loser_results).size === result.loser_results.length &&
    (testCase[4].length === 0 ? result.loser_results.length === 0
      : result.loser_results.length > 0);
}

function createResourceLedger(resources: FarmOsPteC2bOwnedResources):
  FarmOsPteC2bResourceCreationLedger[] {
  return [
    { resource_type: "CONTAINER", expected_name: resources.container_name,
      state: "NOT_CREATED", observed_identity: null },
    { resource_type: "VOLUME", expected_name: resources.volume_name,
      state: "NOT_CREATED", observed_identity: null },
    { resource_type: "NETWORK", expected_name: resources.network_name,
      state: "NOT_CREATED", observed_identity: null },
  ];
}

function recordResourceTransition(ledger: FarmOsPteC2bResourceCreationLedger[],
  transition: FarmOsPteC2bResourceCreationTransition): boolean {
  const index = ledger.findIndex((entry) => entry.resource_type === transition.resource_type);
  const current = ledger[index];
  const identityValid = transition.state === "CREATED_OWNED"
    ? typeof transition.observed_identity === "string" &&
      /^[a-z0-9_.:-]{1,128}$/u.test(transition.observed_identity)
    : transition.observed_identity === null;
  if (index < 0 || current?.state !== "NOT_CREATED" || !identityValid) return false;
  ledger[index] = Object.freeze({ ...current, state: transition.state,
    observed_identity: transition.observed_identity });
  return true;
}

function cleanupMatchesLedger(cleanup: FarmOsPteC2bCleanupResult,
  ledger: readonly FarmOsPteC2bResourceCreationLedger[]): boolean {
  return cleanup.resources.every((resource, index) => {
    const created = ledger[index];
    if (created === undefined || resource.resource_type !== created.resource_type ||
      resource.expected_name !== created.expected_name) return false;
    if (created.state === "NOT_CREATED") return resource.state === "NOT_CREATED";
    if (created.state === "CREATED_UNOWNED_COLLISION") {
      return resource.state === "CREATED_UNOWNED_COLLISION";
    }
    if (created.state === "UNKNOWN") return resource.state === "UNKNOWN";
    return ["REMOVED", "REMOVE_FAILED", "CREATED_OWNED"].includes(resource.state) &&
      resource.observed_identity === created.observed_identity;
  });
}

function failedCleanupFromLedger(ledger: readonly FarmOsPteC2bResourceCreationLedger[]):
  FarmOsPteC2bCleanupResult {
  const hasKnownState = ledger.some((entry) => entry.state !== "NOT_CREATED");
  const resources = ledger.map((entry, index) => {
    if (!hasKnownState && index === 0) return Object.freeze({ ...entry, state: "UNKNOWN" as const });
    if (entry.state === "CREATED_OWNED") {
      return Object.freeze({ ...entry, state: "REMOVE_FAILED" as const });
    }
    return Object.freeze({ ...entry });
  });
  const created = resources.filter((entry) => entry.state === "REMOVE_FAILED").length;
  return Object.freeze({ resources: Object.freeze(resources), owned_resources_created: created,
    owned_resources_removed: 0, failed_removals: created, residual_owned_count: created,
    unrelated_touched_count: 0, result: "FAIL" });
}

function buildEvidence(input: Readonly<{
  executor: FarmOsPteC2bExecutorInput;
  authorization: FarmOsPteC2bAuthorizationEnvelope;
  source_lineage: Extract<FarmOsPteC2bSourceLineage, { status: "PINNED_B1_COMMIT" }>;
  observed: FarmOsPteC2bObservedEnvironment | null;
  results: readonly FarmOsPteC2bCaseResult[];
  cleanup: FarmOsPteC2bCleanupResult;
  classification: FarmOsPteC2bClassification;
}>): FarmOsPteC2bEvidence {
  const candidate: FarmOsPteC2bEvidence = Object.freeze({
    schema_version: FARM_OS_PTE_C2B_EVIDENCE_VERSION,
    executor_authority: FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY,
    case_registry_authority: FARM_OS_PTE_C2B_CASE_REGISTRY_AUTHORITY,
    case_registry_digest: FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
    fault_registry_authority: FARM_OS_PTE_C2B_FAULT_REGISTRY_AUTHORITY,
    fault_registry_digest: FARM_OS_PTE_C2B_FAULT_REGISTRY_DIGEST,
    qualification_mode: "ISOLATED_POSTGRES_QUALIFICATION",
    execution_nonce: input.executor.execution_nonce,
    c2a_source_commit: FARM_OS_PTE_C2A_SOURCE_COMMIT,
    expected_c2b_source_commit: input.authorization.expected_c2b_source_commit,
    observed_c2b_source_commit: input.source_lineage.commit_sha,
    authorization_digest: input.authorization.authorization_digest,
    migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
    apply_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
    verify_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_SHA256,
    image_repository: FARM_OS_PTE_C2B_IMAGE_REPOSITORY,
    approved_repository_digest: input.executor.image_authority.repository_digest,
    observed_image_id: input.observed?.observed_image_id ?? null,
    platform: input.observed?.platform ?? null,
    server_version_num: input.observed?.server_version_num ?? null,
    server_version: input.observed?.server_version ?? null,
    container_identity_digest: input.observed?.container_identity_digest ?? null,
    network_identity_digest: input.observed?.network_identity_digest ?? null,
    volume_identity_digest: input.observed?.volume_identity_digest ?? null,
    database_identity_digest: input.observed?.database_identity_digest ?? null,
    case_results: Object.freeze([...input.results]),
    cleanup: input.cleanup,
    residual_resource_count: input.cleanup.residual_owned_count,
    production_operations: 0,
    external_network_operations: 0,
    automatic_retry_count: 0,
    fault_model: "APPLICATION_OBSERVATION_BOUNDARY_AND_CONTAINER_CRASH_BOUNDARY",
    started_at_metadata: input.executor.started_at_metadata,
    ended_at_metadata: input.executor.ended_at_metadata,
    classification: input.classification,
  });
  return parseFarmOsPteC2bEvidence(candidate) ?? fail("EVIDENCE_INVALID");
}

export async function executeFarmOsPteC2bQualification(
  input: FarmOsPteC2bExecutorInput,
): Promise<FarmOsPteC2bRunResult> {
  const resources = deriveFarmOsPteC2bOwnedResources(input.execution_nonce);
  const image = parseFarmOsPteC2bImageAuthority(input.image_authority);
  const authorizationSyntax = parseFarmOsPteC2bAuthorizationEnvelopeSyntax(input.authorization);
  if (resources === null || image === null || authorizationSyntax === null ||
    !validateFarmOsPteC2bExecutionWindow(input.started_at_metadata,
      input.ended_at_metadata) || authorizationSyntax.execution_nonce !== input.execution_nonce ||
    authorizationSyntax.image_repository_digest !== image.repository_digest) {
    return Object.freeze({ classification: "BLOCKED_ENVIRONMENT",
      failure_code: authorizationSyntax === null ? "AUTHORIZATION_INVALID" : "INPUT_INVALID",
      evidence: null, cleanup: null,
      automatic_retry_count: 0, raw_error_included: false });
  }
  let sourceLineage: FarmOsPteC2bSourceLineage | null = null;
  try {
    sourceLineage = parseFarmOsPteC2bSourceLineage(
      await input.source_lineage_resolver.resolveExecutingSourceLineage());
  } catch {
    sourceLineage = null;
  }
  const authorization = validateFarmOsPteC2bAuthorizationForExecution({
    authorization: authorizationSyntax, execution_nonce: input.execution_nonce, image,
    observed_source_lineage: sourceLineage, execution_started_at: input.started_at_metadata,
  });
  if (authorization === null || sourceLineage?.status !== "PINNED_B1_COMMIT") {
    return Object.freeze({ classification: "BLOCKED_ENVIRONMENT",
      failure_code: "SOURCE_IDENTITY_MISMATCH", evidence: null, cleanup: null,
      automatic_retry_count: 0, raw_error_included: false });
  }
  if (!validateFarmOsPteC2bRealExecutionCapability(input.adapter,
    input.real_execution_capability)) {
    return Object.freeze({ classification: "BLOCKED_ENVIRONMENT",
      failure_code: "REAL_CAPABILITY_INVALID", evidence: null, cleanup: null,
      automatic_retry_count: 0, raw_error_included: false });
  }

  let observed: FarmOsPteC2bObservedEnvironment | null = null;
  let cleanup: FarmOsPteC2bCleanupResult | null = null;
  const results: FarmOsPteC2bCaseResult[] = [];
  const creationLedger = createResourceLedger(resources);
  let failure: FarmOsPteC2bExecutorFailureCode | null = null;
  try {
    const preflight = await input.adapter.preflight({
      image: input.image_authority,
      resources,
      postgres_major: FARM_OS_PTE_C2B_POSTGRES_MAJOR,
      database: FARM_OS_PTE_C2B_DATABASE,
      application_name: FARM_OS_PTE_C2B_APPLICATION_NAME,
      record_resource_transition: (transition) =>
        recordResourceTransition(creationLedger, transition),
    });
    if (preflight.status !== "READY" || preflight.observed === null ||
      !observedEnvironmentIsExact(preflight.observed)) {
      fail("BLOCKED_ENVIRONMENT");
    }
    observed = preflight.observed;
    if (await input.adapter.prepareFixture({ resources,
      fixture_authority: FARM_OS_PTE_C2B_FIXTURE_AUTHORITY,
      fixture_digest: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE_DIGEST }) !== "PASS") {
      fail("FIXTURE_SETUP_FAILED");
    }
    if (await input.adapter.applyExactMigration(FARM_OS_PTE_C2B_MIGRATION_PLAN) !== "PASS") {
      fail("MIGRATION_APPLY_FAILED");
    }
    if (await input.adapter.recordAndVerifyMigrationHistory(
      FARM_OS_PTE_C2B_MIGRATION_PLAN) !== "PASS") fail("MIGRATION_HISTORY_MISMATCH");
    if (await input.adapter.executeExactReadOnlyVerifier(
      FARM_OS_PTE_C2B_MIGRATION_PLAN) !== "PASS") fail("VERIFY_FAILED");
    for (const testCase of FARM_OS_PTE_C2B_CASE_REGISTRY) {
      const result = await input.adapter.executeCase(testCase);
      if (!resultIsExact(result, testCase)) fail("CASE_RESULT_INVALID");
      results.push(Object.freeze(result));
      if (result.status !== "PASS") fail("CASE_FAILED");
    }
  } catch (error) {
    failure = error instanceof FarmOsPteC2bQualificationError
      ? error.code : "EXECUTION_FAILED";
  } finally {
    try {
      const cleanupCandidate = await input.adapter.cleanupExactOwnedResources({ resources,
        creation_ledger: Object.freeze([...creationLedger]) });
      cleanup = parseFarmOsPteC2bCleanupResult(cleanupCandidate);
      if (cleanup === null || !cleanupMatchesLedger(cleanup, creationLedger) ||
        cleanup.result !== "PASS") {
        failure = "CLEANUP_FAILED";
        cleanup = cleanup !== null && cleanupMatchesLedger(cleanup, creationLedger)
          ? cleanup : null;
      }
    } catch {
      cleanup = null;
      failure = "CLEANUP_FAILED";
    }
  }

  if (failure !== null || observed === null || cleanup === null || results.length !== 66) {
    const completedResults = Object.freeze(FARM_OS_PTE_C2B_CASE_REGISTRY.map((testCase, index) =>
      results[index] ?? Object.freeze({ case_id: testCase[0], status: "NOT_EXECUTED" as const,
        actual_result: "NOT_EXECUTED", winner_count: null, authoritative_row_count: null,
        loser_results: Object.freeze([]) })));
    const boundedCleanup = cleanup ?? failedCleanupFromLedger(creationLedger);
    const classification = failure === "BLOCKED_ENVIRONMENT"
      ? "BLOCKED_ENVIRONMENT" as const : "FAILED_EXECUTION" as const;
    const evidence = observed === null && failure === "INPUT_INVALID" ? null : buildEvidence({
      executor: input, authorization, source_lineage: sourceLineage,
      observed, results: completedResults, cleanup: boundedCleanup, classification,
    });
    return Object.freeze({
      classification,
      failure_code: failure ?? "EVIDENCE_INVALID",
      evidence,
      cleanup: boundedCleanup,
      automatic_retry_count: 0,
      raw_error_included: false,
    });
  }
  const evidence = buildEvidence({ executor: input, authorization, source_lineage: sourceLineage,
    observed, results, cleanup,
    classification: "QUALIFIED" });
  return Object.freeze({ classification: "QUALIFIED", failure_code: null, evidence, cleanup,
    automatic_retry_count: 0, raw_error_included: false });
}

export function createFarmOsPteC2bSourceValidationIdentity(): Readonly<{
  executor_authority: typeof FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY;
  registry_digest: typeof FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST;
  fixture_digest: typeof FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE_DIGEST;
  migration_plan_digest: `sha256:${string}`;
}> {
  return Object.freeze({
    executor_authority: FARM_OS_PTE_C2B_EXECUTOR_AUTHORITY,
    registry_digest: FARM_OS_PTE_C2B_CASE_REGISTRY_DIGEST,
    fixture_digest: FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE_DIGEST,
    migration_plan_digest: digestFarmOsPteC2b(
      "farmos.production-target-execution-postgres-qualification-migration-plan.v1",
      FARM_OS_PTE_C2B_MIGRATION_PLAN),
  });
}

export async function validateFarmOsPteC2bSourceWithFakeAdapter(
  adapter: FarmOsPteC2bQualificationAdapter,
): Promise<Readonly<{
  status: "SOURCE_VALIDATION_PASS" | "SOURCE_VALIDATION_FAIL";
  executed_case_count: number;
  docker_operations: 0;
  postgres_operations: 0;
  evidence_created: false;
}>> {
  let count = 0;
  try {
    for (const testCase of FARM_OS_PTE_C2B_CASE_REGISTRY) {
      const result = await adapter.executeCase(testCase);
      if (!resultIsExact(result, testCase) || result.status !== "PASS") {
        return Object.freeze({ status: "SOURCE_VALIDATION_FAIL", executed_case_count: count,
          docker_operations: 0, postgres_operations: 0, evidence_created: false });
      }
      count += 1;
    }
  } catch {
    return Object.freeze({ status: "SOURCE_VALIDATION_FAIL", executed_case_count: count,
      docker_operations: 0, postgres_operations: 0, evidence_created: false });
  }
  return Object.freeze({ status: "SOURCE_VALIDATION_PASS", executed_case_count: count,
    docker_operations: 0, postgres_operations: 0, evidence_created: false });
}
