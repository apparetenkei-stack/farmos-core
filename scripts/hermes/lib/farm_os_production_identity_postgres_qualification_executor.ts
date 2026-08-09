import { randomBytes } from "node:crypto";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  sanitizeFarmOsProductionIdentityQueryV2ResultSets,
  transformFarmOsProductionIdentityQueryV2CandidateResultSets,
  validateFarmOsProductionIdentityQueryV2CandidateResultSets,
  validateFarmOsProductionIdentitySanitizedEvidenceCandidate,
  type FarmOsProductionIdentityCandidateResultSet,
  type FarmOsProductionIdentityQueryV2CandidateSection,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  createFarmOsProductionIdentityH2NotApplicableSentinel,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
  loadFarmOsProductionIdentityQueryV2Artifact,
} from "../../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  loadFarmOsProductionPostgresBootstrapQueryArtifact,
  parseFarmOsProductionPostgresBootstrapResultSet,
} from "../../../src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE,
  parseFarmOsProductionIdentityPostgresQualificationFailure,
  parseFarmOsProductionIdentityPostgresQualificationEvidence,
  type FarmOsProductionIdentityPostgresMajor,
  type FarmOsProductionIdentityPostgresQualificationFailure,
  type FarmOsProductionIdentityPostgresQualificationFailureCode,
  type FarmOsProductionIdentityPostgresQualificationFailurePhase,
  type FarmOsProductionIdentityPostgresQualificationEvidence,
} from "./farm_os_production_identity_postgres_qualification_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL,
  FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS,
  buildFarmOsProductionIdentitySyntheticFixture,
  type FarmOsProductionIdentityFixtureCase,
} from "./farm_os_production_identity_isolated_postgres_fixture";

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR =
  Object.freeze({
    authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1",
    purpose: "isolated_postgres_compatibility_qualification",
    allowed_postgres_majors: Object.freeze([14, 15, 16, 17] as const),
    production_target: "FORBIDDEN",
    production_credential: "FORBIDDEN",
    runtime_binding_required: false,
    automatic_query_retry: 0,
    evidence_persistence: "STDOUT_ONLY",
    caller_sql_count: 0,
    caller_host_count: 0,
    caller_image_count: 0,
  } as const);

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_ERRORS =
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES;

export type FarmOsProductionIdentityPostgresQualificationErrorCode =
  FarmOsProductionIdentityPostgresQualificationFailureCode;

type InternalFailureDiagnostic = Readonly<{
  primary_failure_code: FarmOsProductionIdentityPostgresQualificationErrorCode;
  terminal_failure_code: FarmOsProductionIdentityPostgresQualificationErrorCode;
  failure_phase: FarmOsProductionIdentityPostgresQualificationFailurePhase;
  section_id: FarmOsProductionIdentityQueryV2CandidateSection | null;
  statement_ordinal: number | null;
  completed_section_count: number;
  sqlstate: string | null;
  transaction_started: boolean;
  rollback_attempted: boolean;
  rollback_performed: boolean;
  rollback_status: "NOT_REQUIRED" | "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED";
  session_close_performed: boolean;
  cleanup_status: "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED";
  container_cleanup_performed: boolean;
}>;

export type FarmOsProductionIdentitySafeSectionQueryFailurePhase =
  "ADAPTER_ALLOWLIST" | "SECTION_QUERY" | "SECTION_RESULT_MATERIALIZATION";

export class FarmOsProductionIdentitySafeSectionQueryError extends Error {
  constructor(
    readonly failure_phase: FarmOsProductionIdentitySafeSectionQueryFailurePhase,
    readonly sqlstate: string | null,
  ) {
    super("SECTION_EXECUTION_FAILED");
    this.name = "FarmOsProductionIdentitySafeSectionQueryError";
  }
}

export class FarmOsProductionIdentityPostgresQualificationError extends Error {
  constructor(
    readonly code: FarmOsProductionIdentityPostgresQualificationErrorCode,
    readonly diagnostic: InternalFailureDiagnostic | null = null,
  ) {
    super(code);
    this.name = "FarmOsProductionIdentityPostgresQualificationError";
  }
}

function fail(
  code: FarmOsProductionIdentityPostgresQualificationErrorCode,
): never {
  throw new FarmOsProductionIdentityPostgresQualificationError(code);
}

function canonicalSqlstate(value: unknown): string | null {
  return typeof value === "string" && /^[0-9A-Z]{5}$/u.test(value) ? value : null;
}

function defaultFailureDiagnostic(
  code: FarmOsProductionIdentityPostgresQualificationErrorCode,
): InternalFailureDiagnostic {
  return Object.freeze({
    primary_failure_code: code,
    terminal_failure_code: code,
    failure_phase: code === "ROLLBACK_FAILED" ? "ROLLBACK" :
      code === "SESSION_CLOSE_FAILED" ? "SESSION_CLOSE" :
      code === "CLEANUP_FAILED" ? "CLEANUP" : "OTHER",
    section_id: null,
    statement_ordinal: null,
    completed_section_count: 0,
    sqlstate: null,
    transaction_started: false,
    rollback_attempted: false,
    rollback_performed: false,
    rollback_status: "NOT_REQUIRED",
    session_close_performed: false,
    cleanup_status: "NOT_ATTEMPTED",
    container_cleanup_performed: false,
  });
}

function diagnosticError(
  code: FarmOsProductionIdentityPostgresQualificationErrorCode,
  overrides: Partial<InternalFailureDiagnostic>,
): FarmOsProductionIdentityPostgresQualificationError {
  return new FarmOsProductionIdentityPostgresQualificationError(code, Object.freeze({
    ...defaultFailureDiagnostic(code),
    ...overrides,
    terminal_failure_code: overrides.terminal_failure_code ?? code,
  }));
}

function preservedDiagnosticError(
  error: unknown,
  terminalCode: FarmOsProductionIdentityPostgresQualificationErrorCode,
  overrides: Partial<InternalFailureDiagnostic>,
): FarmOsProductionIdentityPostgresQualificationError {
  const existing = error instanceof FarmOsProductionIdentityPostgresQualificationError
    ? error.diagnostic ?? defaultFailureDiagnostic(error.code)
    : defaultFailureDiagnostic("EVIDENCE_INVALID");
  return new FarmOsProductionIdentityPostgresQualificationError(terminalCode, Object.freeze({
    ...existing,
    ...overrides,
    terminal_failure_code: terminalCode,
  }));
}

export type FarmOsProductionIdentityImageAuthority = Readonly<{
  tag: `postgres:${FarmOsProductionIdentityPostgresMajor}`;
  image_id: `sha256:${string}`;
  repo_digest: `sha256:${string}`;
}>;

export type FarmOsProductionIdentityOwnedContainer = Readonly<{
  container_name: string;
  ownership_label: string;
  container_id: string;
  expected_image_id: `sha256:${string}`;
  host: "127.0.0.1";
  port: number;
}>;

export type FarmOsProductionIdentityFixtureCredential = Readonly<{
  admin_user: "postgres";
  qualification_user: "farmos_identity_qualification";
  database: "farmos_identity_qualification";
  password: string;
}>;

export interface FarmOsProductionIdentityQualificationSession {
  beginRepeatableReadOnly(): Promise<void>;
  setLocalTimeouts(): Promise<void>;
  query(statementSql: string): Promise<readonly Record<string, unknown>[]>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

export interface FarmOsProductionIdentityPostgresQualificationPlatform {
  inspectImage(
    major: FarmOsProductionIdentityPostgresMajor,
  ): Promise<FarmOsProductionIdentityImageAuthority | null>;
  pullImage(
    major: FarmOsProductionIdentityPostgresMajor,
  ): Promise<FarmOsProductionIdentityImageAuthority | null>;
  startContainer(input: Readonly<{
    major: FarmOsProductionIdentityPostgresMajor;
    image: FarmOsProductionIdentityImageAuthority;
    nonce: string;
    credential: FarmOsProductionIdentityFixtureCredential;
  }>): Promise<FarmOsProductionIdentityOwnedContainer>;
  verifyContainerOwnership(
    container: FarmOsProductionIdentityOwnedContainer,
  ): Promise<boolean>;
  waitUntilReady(input: Readonly<{
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    maximum_attempts: 30;
    interval_ms: 250;
  }>): Promise<boolean>;
  setupFixture(input: Readonly<{
    major: FarmOsProductionIdentityPostgresMajor;
    fixture_case: FarmOsProductionIdentityFixtureCase;
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    statements: readonly string[];
  }>): Promise<void>;
  openQualificationSession(input: Readonly<{
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
  }>): Promise<FarmOsProductionIdentityQualificationSession>;
  cleanupExactOwnedContainer(
    container: FarmOsProductionIdentityOwnedContainer,
  ): Promise<boolean>;
}

export type FarmOsProductionIdentityQualificationExecutorInput = Readonly<{
  git_commit: string;
  executor_source_sha256: `sha256:${string}`;
  allow_image_pull: boolean;
  platform: FarmOsProductionIdentityPostgresQualificationPlatform;
  now?: () => Date;
  random_bytes?: (size: number) => Buffer;
}>;

export type FarmOsProductionIdentityQualificationRunResult = Readonly<{
  lineage: Readonly<{
    schema_version:
      "farmos.production-identity-postgres-qualification-executor-lineage.v1";
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1";
    git_commit: string;
    executor_source_sha256: `sha256:${string}`;
    repository_source_gate: "TRACKED_CLEAN_REQUIRED";
    production_operations: 0;
    filesystem_persistence: 0;
  }>;
  evidence: readonly FarmOsProductionIdentityPostgresQualificationEvidence[];
  failures: readonly FarmOsProductionIdentityPostgresQualificationFailure[];
}>;

const FIXTURE_PASSWORD_PLACEHOLDER =
  "SYNTHETIC_FIXTURE_PASSWORD_NOT_A_CREDENTIAL";
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const GIT_COMMIT = /^[a-f0-9]{40}$/u;
const CAPABILITY_COLUMNS = ["inherit_option", "set_option"] as const;

export function createFarmOsProductionIdentityFixtureCredential(
  random: (size: number) => Buffer = randomBytes,
): FarmOsProductionIdentityFixtureCredential {
  const token = random(32).toString("hex");
  if (!/^[a-f0-9]{64}$/u.test(token)) fail("FIXTURE_SETUP_FAILED");
  return Object.freeze({
    admin_user: "postgres",
    qualification_user: "farmos_identity_qualification",
    database: "farmos_identity_qualification",
    password: `fq_${token}`,
  });
}

function replaceFixtureCredential(
  statements: readonly string[],
  credential: FarmOsProductionIdentityFixtureCredential,
): readonly string[] {
  return Object.freeze(statements.map((statement) =>
    statement.replace(FIXTURE_PASSWORD_PLACEHOLDER, credential.password)));
}

function minimalNegativeFixtureStatements(
  credential: FarmOsProductionIdentityFixtureCredential,
): readonly string[] {
  return Object.freeze([
    `CREATE ROLE farmos_identity_qualification LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${credential.password}';`,
    "GRANT pg_monitor TO farmos_identity_qualification;",
  ]);
}

export function buildFarmOsProductionIdentityRuntimeFixtureStatements(
  major: FarmOsProductionIdentityPostgresMajor,
  fixtureCase: FarmOsProductionIdentityFixtureCase,
  credential: FarmOsProductionIdentityFixtureCredential,
): readonly string[] {
  if (major === 14 || major === 15) {
    return minimalNegativeFixtureStatements(credential);
  }
  const sourceFixture = buildFarmOsProductionIdentitySyntheticFixture(
    major, fixtureCase);
  return replaceFixtureCredential(sourceFixture.setup_statements, credential);
}

function parseCapabilityColumns(
  rows: readonly Record<string, unknown>[],
): readonly (typeof CAPABILITY_COLUMNS[number])[] | null {
  if (!rows.every((row) => Object.keys(row).length === 1 &&
    CAPABILITY_COLUMNS.includes(row.column_name as typeof CAPABILITY_COLUMNS[number]))) {
    return null;
  }
  const values = rows.map((row) => row.column_name as typeof CAPABILITY_COLUMNS[number]);
  if (new Set(values).size !== values.length) return null;
  return Object.freeze(values);
}

function qualificationPrincipalPass(
  rows: readonly Record<string, unknown>[],
): boolean {
  if (rows.length !== 1) return false;
  const row = rows[0]!;
  return row.current_user === "farmos_identity_qualification" &&
    row.rolsuper === false && row.rolcreatedb === false &&
    row.rolcreaterole === false && row.rolinherit === true &&
    row.rolreplication === false &&
    row.rolbypassrls === false && row.pg_monitor_member === true;
}

export const FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL = [
  "SELECT current_user::text AS current_user, role.rolsuper, role.rolcreatedb,",
  "role.rolcreaterole, role.rolinherit, role.rolreplication, role.rolbypassrls,",
  "pg_catalog.pg_has_role(current_user, 'pg_monitor', 'MEMBER') AS pg_monitor_member",
  "FROM pg_catalog.pg_roles AS role WHERE role.rolname = current_user;",
].join("\n");

function h1State(
  rows: readonly Record<string, unknown>[],
): "absent" | "present" | null {
  if (rows.length !== 1) return null;
  const payload = rows[0]?.payload;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const state = (payload as Record<string, unknown>).state;
  return state === "absent" || state === "present" ? state : null;
}

function resultSet(
  section: FarmOsProductionIdentityQueryV2CandidateSection,
  rows: readonly Record<string, unknown>[],
): FarmOsProductionIdentityCandidateResultSet {
  return { section_id: section, rows: rows as never };
}

function rawFixtureSemanticsPass(
  resultSets: readonly FarmOsProductionIdentityCandidateResultSet[],
  fixtureCase: FarmOsProductionIdentityFixtureCase,
): boolean {
  const raw = JSON.stringify(resultSets);
  if (!FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS.slice(0, -1)
    .every((marker) => raw.includes(marker))) return false;
  const f = resultSets.find((set) => set.section_id === "F_ACL_PRINCIPAL_INVENTORY");
  const g = resultSets.find((set) => set.section_id === "G_MIGRATION_CATALOG_INVENTORY");
  if (f === undefined || g === undefined) return false;
  const fPayloads = f.rows.filter((row) => row.row_key !== "__collection_status__")
    .map((row) => row.payload);
  const aclClasses = new Set(fPayloads.map((payload) => payload.acl_default_class));
  const aclPass = ["r", "s", "f", "n"].every((value) => aclClasses.has(value)) &&
    fPayloads.some((payload) => payload.principal === "public") &&
    fPayloads.some((payload) => payload.grant_option === true) &&
    fPayloads.some((payload) => payload.row_kind === "role_membership" &&
      typeof payload.role_flags === "object" && payload.role_flags !== null &&
      Object.hasOwn(payload.role_flags, "inherit_option") &&
      Object.hasOwn(payload.role_flags, "set_option"));
  if (!aclPass) return false;
  const gPayloads = g.rows.filter((row) => row.row_key !== "__collection_status__")
    .map((row) => row.payload);
  const object = (kind: string, identity: string) => gPayloads.find((payload) =>
    payload.object_kind === kind && payload.object_identity === identity);
  const attributes = (payload: Record<string, unknown> | undefined) =>
    payload?.attributes as Record<string, unknown> | undefined;
  const disabled = attributes(object("table", "ai.proposal_inbox"));
  const enabledZero = attributes(object("rls_policy_inventory", "ai.proposal_creation_idempotency"));
  const enabledPolicies = attributes(object("rls_policy_inventory", "ai.proposal_execution_state"));
  const policies = gPayloads.filter((payload) => payload.object_kind === "rls_policy");
  const commands = new Set(policies.map((payload) =>
    attributes(payload)?.command));
  const modes = new Set(policies.map((payload) =>
    attributes(payload)?.permissive));
  const roleSets = policies.map((payload) => attributes(payload)?.roles)
    .filter(Array.isArray) as unknown as string[][];
  const policyRaw = policies.map((payload) =>
    payload.raw_sensitive_texts as Record<string, unknown>);
  const rlsPass = disabled?.rls_enabled === false &&
    enabledZero?.rls_enabled === true && enabledZero.policy_count === 0 &&
    enabledPolicies?.rls_enabled === true && enabledPolicies.policy_count === 5 &&
    ["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"].every((command) => commands.has(command)) &&
    modes.has(true) && modes.has(false) &&
    roleSets.some((roles) => roles.includes("public")) &&
    roleSets.some((roles) => roles.some((role) => role !== "public")) &&
    policyRaw.some((value) => value.qual !== null) &&
    policyRaw.some((value) => value.with_check !== null);
  const h2 = resultSets.find((set) =>
    set.section_id === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT");
  const h2Rows = h2?.rows.filter((row) => row.row_key !== "__collection_status__") ?? [];
  return rlsPass && h2Rows.length ===
    (fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 5 : 0);
}

function finalSanitationPass(
  sanitized: unknown,
  rawSystemIdentifier: string,
  credential: FarmOsProductionIdentityFixtureCredential,
): boolean {
  const serialized = JSON.stringify(sanitized);
  return !FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS.some((marker) =>
    serialized.includes(marker)) &&
    !serialized.includes(rawSystemIdentifier) &&
    !serialized.includes(credential.password) &&
    !/(?:connection_string|raw_catalog_definition|raw_cluster_identifier|raw_sensitive_texts|password)/iu
      .test(serialized) &&
    /_digest/u.test(serialized);
}

function systemIdentifier(
  resultSets: readonly FarmOsProductionIdentityCandidateResultSet[],
): string | null {
  const row = resultSets.find((set) =>
    set.section_id === "B_CLUSTER_IDENTITY_SOURCE")?.rows[0];
  const value = row?.payload.raw_cluster_identifier;
  return typeof value === "string" && /^[0-9]{1,20}$/u.test(value) ? value : null;
}

async function rollbackAndClose(
  session: FarmOsProductionIdentityQualificationSession,
  transactionStarted: boolean,
): Promise<Readonly<{
  rollback_attempted: boolean;
  rollback_performed: boolean;
  session_close_performed: boolean;
}>> {
  let rollbackPerformed = !transactionStarted;
  if (transactionStarted) {
    try {
      await session.rollback();
      rollbackPerformed = true;
    } catch {
      rollbackPerformed = false;
    }
  }
  let sessionClosePerformed = false;
  try {
    await session.close();
    sessionClosePerformed = true;
  } catch {
    sessionClosePerformed = false;
  }
  return Object.freeze({
    rollback_attempted: transactionStarted,
    rollback_performed: rollbackPerformed,
    session_close_performed: sessionClosePerformed,
  });
}

async function executeNegative(
  major: 14 | 15,
  session: FarmOsProductionIdentityQualificationSession,
  bootstrapSql: string,
): Promise<Readonly<{
  server_version_num: number;
  capability_columns: readonly [];
  assertion_count: number;
}>> {
  const principal = await session.query(FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL)
    .catch(() => fail("FIXTURE_SETUP_FAILED"));
  if (!qualificationPrincipalPass(principal)) fail("FIXTURE_SETUP_FAILED");
  const bootstrapRows = await session.query(bootstrapSql)
    .catch(() => fail("BOOTSTRAP_MISMATCH"));
  const bootstrap = parseFarmOsProductionPostgresBootstrapResultSet(bootstrapRows);
  if (bootstrap === null || bootstrap.postgres_major !== major) fail("BOOTSTRAP_MISMATCH");
  const capabilities = parseCapabilityColumns(
    await session.query(FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL)
      .catch(() => fail("CAPABILITY_MISMATCH")));
  if (capabilities === null || capabilities.length !== 0) fail("CAPABILITY_MISMATCH");
  return Object.freeze({
    server_version_num: bootstrap.server_version_num,
    capability_columns: Object.freeze([] as const),
    assertion_count: 8,
  });
}

async function executePositive(
  major: 16 | 17,
  fixtureCase: FarmOsProductionIdentityFixtureCase,
  session: FarmOsProductionIdentityQualificationSession,
  bootstrapSql: string,
  credential: FarmOsProductionIdentityFixtureCredential,
): Promise<Readonly<{
  server_version_num: number;
  executed_section_count: 10 | 11;
  h2_invocation_count: 0 | 1;
  h2_row_count: 0 | 5;
  assertion_count: number;
  rollback_performed: true;
  }>> {
  let transactionStarted = false;
  let assertionCount = 0;
  let completedSectionCount = 0;
  try {
    const principal = await session.query(FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL)
      .catch(() => fail("FIXTURE_SETUP_FAILED"));
    if (!qualificationPrincipalPass(principal)) fail("FIXTURE_SETUP_FAILED");
    assertionCount += 1;
    const bootstrapRows = await session.query(bootstrapSql)
      .catch(() => fail("BOOTSTRAP_MISMATCH"));
    const bootstrap = parseFarmOsProductionPostgresBootstrapResultSet(bootstrapRows);
    if (bootstrap === null || bootstrap.postgres_major !== major) fail("BOOTSTRAP_MISMATCH");
    assertionCount += 1;
    const capabilities = parseCapabilityColumns(
      await session.query(FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL)
        .catch(() => fail("CAPABILITY_MISMATCH")));
    if (capabilities === null || JSON.stringify(capabilities) !==
      JSON.stringify(CAPABILITY_COLUMNS)) fail("CAPABILITY_MISMATCH");
    assertionCount += 1;
    const artifact = loadFarmOsProductionIdentityQueryV2Artifact();
    if (artifact.status !== "VERIFIED" || artifact.section_plan.length !== 11) {
      fail("QUERY_ARTIFACT_DRIFT");
    }
    assertionCount += 1;
    try {
      await session.beginRepeatableReadOnly();
      transactionStarted = true;
      await session.setLocalTimeouts();
      assertionCount += 1;
    } catch (error) {
      if (error instanceof FarmOsProductionIdentityPostgresQualificationError) throw error;
      fail("TRANSACTION_READ_ONLY_FAILED");
    }
    const resultSets: FarmOsProductionIdentityCandidateResultSet[] = [];
    let observedH1: "absent" | "present" | null = null;
    let h2InvocationCount: 0 | 1 = 0;
    for (const section of artifact.section_plan) {
      if (section.section_id === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT" &&
        observedH1 === "absent") {
        const sentinel = createFarmOsProductionIdentityH2NotApplicableSentinel("absent");
        resultSets.push({ section_id: sentinel.section_id, rows: [...sentinel.rows] });
        assertionCount += 1;
        continue;
      }
      let rows: readonly Record<string, unknown>[];
      try {
        rows = await session.query(section.statement_sql);
      } catch (error) {
        const safe = error instanceof FarmOsProductionIdentitySafeSectionQueryError
          ? error : null;
        throw diagnosticError("SECTION_EXECUTION_FAILED", {
          failure_phase: safe?.failure_phase ?? "SECTION_QUERY",
          section_id: section.section_id,
          statement_ordinal: section.ordinal,
          completed_section_count: completedSectionCount,
          sqlstate: canonicalSqlstate(safe?.sqlstate),
          transaction_started: true,
          rollback_status: "NOT_ATTEMPTED",
        });
      }
      resultSets.push(resultSet(section.section_id, rows));
      completedSectionCount += 1;
      assertionCount += 1;
      if (section.section_id === "H1_MIGRATION_HISTORY_EXISTENCE") {
        observedH1 = h1State(rows);
        if (observedH1 === null || observedH1 !==
          (fixtureCase === "MIGRATION_HISTORY_PRESENT" ? "present" : "absent")) {
          throw diagnosticError("PARSER_FAILED", {
            failure_phase: "PARSER_HANDOFF",
            completed_section_count: completedSectionCount,
            transaction_started: true,
            rollback_status: "NOT_ATTEMPTED",
          });
        }
      }
      if (section.section_id === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT") {
        h2InvocationCount = 1;
      }
    }
    if (validateFarmOsProductionIdentityQueryV2CandidateResultSets(resultSets).valid !== true ||
      !rawFixtureSemanticsPass(resultSets, fixtureCase)) {
      throw diagnosticError("PARSER_FAILED", {
        failure_phase: "PARSER_HANDOFF",
        completed_section_count: completedSectionCount,
        transaction_started: true,
        rollback_status: "NOT_ATTEMPTED",
      });
    }
    assertionCount += 2;
    const transformed = transformFarmOsProductionIdentityQueryV2CandidateResultSets(resultSets);
    const sanitized = sanitizeFarmOsProductionIdentityQueryV2ResultSets(resultSets);
    const rawSystemIdentifier = systemIdentifier(resultSets);
    if (transformed === null || sanitized === null || rawSystemIdentifier === null ||
      !validateFarmOsProductionIdentitySanitizedEvidenceCandidate(transformed) ||
      !finalSanitationPass(transformed, rawSystemIdentifier, credential)) {
      throw diagnosticError("SANITIZATION_FAILED", {
        failure_phase: "SANITIZER_HANDOFF",
        completed_section_count: completedSectionCount,
        transaction_started: true,
        rollback_status: "NOT_ATTEMPTED",
      });
    }
    assertionCount += 4;
    const completion = await rollbackAndClose(session, transactionStarted);
    transactionStarted = false;
    if (!completion.rollback_performed) {
      throw diagnosticError("ROLLBACK_FAILED", {
        failure_phase: "ROLLBACK",
        completed_section_count: completedSectionCount,
        transaction_started: true,
        rollback_attempted: true,
        rollback_performed: false,
        rollback_status: "FAILED",
        session_close_performed: completion.session_close_performed,
      });
    }
    if (!completion.session_close_performed) {
      throw diagnosticError("SESSION_CLOSE_FAILED", {
        failure_phase: "SESSION_CLOSE",
        completed_section_count: completedSectionCount,
        transaction_started: true,
        rollback_attempted: true,
        rollback_performed: true,
        rollback_status: "SUCCEEDED",
        session_close_performed: false,
      });
    }
    assertionCount += 1;
    return Object.freeze({
      server_version_num: bootstrap.server_version_num,
      executed_section_count: fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 11 : 10,
      h2_invocation_count: h2InvocationCount,
      h2_row_count: fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 5 : 0,
      assertion_count: assertionCount,
      rollback_performed: true,
    });
  } catch (error) {
    if (error instanceof FarmOsProductionIdentityPostgresQualificationError &&
      error.diagnostic?.rollback_attempted) throw error;
    if (transactionStarted) {
      const outcome = await rollbackAndClose(session, true);
      if (!outcome.rollback_performed) {
        throw preservedDiagnosticError(error, "ROLLBACK_FAILED", {
          transaction_started: true,
          rollback_attempted: true,
          rollback_performed: false,
          rollback_status: "FAILED",
          session_close_performed: outcome.session_close_performed,
        });
      }
      if (!outcome.session_close_performed) {
        throw preservedDiagnosticError(error, "SESSION_CLOSE_FAILED", {
          transaction_started: true,
          rollback_attempted: true,
          rollback_performed: true,
          rollback_status: "SUCCEEDED",
          session_close_performed: false,
        });
      }
      throw preservedDiagnosticError(
        error,
        error instanceof FarmOsProductionIdentityPostgresQualificationError
          ? error.code : "EVIDENCE_INVALID",
        {
          transaction_started: true,
          rollback_attempted: true,
          rollback_performed: true,
          rollback_status: "SUCCEEDED",
          session_close_performed: true,
        },
      );
    } else {
      try {
        await session.close();
      } catch {
        throw preservedDiagnosticError(error, "SESSION_CLOSE_FAILED", {
          session_close_performed: false,
        });
      }
    }
    throw error;
  }
}

function failureEvidence(
  input: FarmOsProductionIdentityQualificationExecutorInput,
  major: FarmOsProductionIdentityPostgresMajor,
  fixtureCase: FarmOsProductionIdentityFixtureCase | "NEGATIVE_CAPABILITY_ONLY",
  error: unknown,
): FarmOsProductionIdentityPostgresQualificationFailure {
  const code = error instanceof FarmOsProductionIdentityPostgresQualificationError
    ? error.code
    : "EVIDENCE_INVALID";
  const diagnostic = error instanceof FarmOsProductionIdentityPostgresQualificationError
    ? error.diagnostic ?? defaultFailureDiagnostic(code)
    : defaultFailureDiagnostic(code);
  const failure: FarmOsProductionIdentityPostgresQualificationFailure = Object.freeze({
    schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION,
    failure_code: diagnostic.terminal_failure_code,
    failure_phase: diagnostic.failure_phase,
    section_id: diagnostic.section_id,
    statement_ordinal: diagnostic.statement_ordinal,
    completed_section_count: diagnostic.completed_section_count,
    sqlstate: canonicalSqlstate(diagnostic.sqlstate),
    postgres_major: major,
    fixture_case: fixtureCase,
    transaction_started: diagnostic.transaction_started,
    rollback_attempted: diagnostic.rollback_attempted,
    rollback_performed: diagnostic.rollback_performed,
    rollback_status: diagnostic.rollback_status,
    session_close_performed: diagnostic.session_close_performed,
    container_cleanup_performed: diagnostic.container_cleanup_performed,
    cleanup_status: diagnostic.cleanup_status,
    primary_failure_code: diagnostic.primary_failure_code,
    terminal_failure_code: diagnostic.terminal_failure_code,
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1",
    source_commit: input.git_commit,
    source_digest: input.executor_source_sha256,
    query_authority_id: "farmos.production-target-identity-query.v2",
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
    bootstrap_authority_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
    bootstrap_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
    production_operations: 0,
    secret_exposed: false,
    filesystem_persistence: 0,
  });
  if (parseFarmOsProductionIdentityPostgresQualificationFailure(failure) === null) {
    fail("EVIDENCE_INVALID");
  }
  return failure;
}

async function imageFor(
  input: FarmOsProductionIdentityQualificationExecutorInput,
  major: FarmOsProductionIdentityPostgresMajor,
): Promise<FarmOsProductionIdentityImageAuthority> {
  let image: FarmOsProductionIdentityImageAuthority | null = null;
  try {
    image = await input.platform.inspectImage(major);
  } catch {
    fail("DOCKER_UNAVAILABLE");
  }
  if (image === null && !input.allow_image_pull) fail("IMAGE_MISSING");
  if (image === null) {
    try {
      image = await input.platform.pullImage(major);
    } catch {
      fail("IMAGE_PULL_FAILED");
    }
    if (image === null) fail("IMAGE_PULL_FAILED");
  }
  if (image === null || image.tag !== `postgres:${major}` ||
    !DIGEST.test(image.image_id) || !DIGEST.test(image.repo_digest)) {
    fail("IMAGE_METADATA_INVALID");
  }
  return image;
}

async function runCase(
  input: FarmOsProductionIdentityQualificationExecutorInput,
  major: FarmOsProductionIdentityPostgresMajor,
  fixtureCase: FarmOsProductionIdentityFixtureCase | "NEGATIVE_CAPABILITY_ONLY",
  image: FarmOsProductionIdentityImageAuthority,
  bootstrapSql: string,
): Promise<FarmOsProductionIdentityPostgresQualificationEvidence> {
  const random = input.random_bytes ?? randomBytes;
  const credential = createFarmOsProductionIdentityFixtureCredential(random);
  const nonce = random(8).toString("hex");
  const sourceDigest = input.executor_source_sha256.slice(7);
  if (!/^[a-f0-9]{16}$/u.test(nonce)) fail("CONTAINER_START_FAILED");
  let container: FarmOsProductionIdentityOwnedContainer | null = null;
  let evidenceWithoutCleanup: Omit<FarmOsProductionIdentityPostgresQualificationEvidence,
    "container_cleanup_performed"> | null = null;
  let pendingError: unknown = null;
  let successfulCleanupFailure: FarmOsProductionIdentityPostgresQualificationError | null = null;
  try {
    try {
      container = await input.platform.startContainer({ major, image, nonce, credential });
    } catch (error) {
      if (error instanceof FarmOsProductionIdentityPostgresQualificationError) throw error;
      fail("CONTAINER_START_FAILED");
    }
    let ownershipPass = false;
    try {
      ownershipPass = await input.platform.verifyContainerOwnership(container);
    } catch {
      ownershipPass = false;
    }
    if (!ownershipPass || container.expected_image_id !== image.image_id) {
      fail("CONTAINER_OWNERSHIP_MISMATCH");
    }
    let readinessPass = false;
    try {
      readinessPass = await input.platform.waitUntilReady({
        container, credential, maximum_attempts: 30, interval_ms: 250,
      });
    } catch {
      readinessPass = false;
    }
    if (!readinessPass) fail("READINESS_FAILED");
    const sourceFixture = buildFarmOsProductionIdentitySyntheticFixture(
      major, fixtureCase === "NEGATIVE_CAPABILITY_ONLY"
        ? "MIGRATION_HISTORY_ABSENT" : fixtureCase);
    const statements = buildFarmOsProductionIdentityRuntimeFixtureStatements(
      major,
      fixtureCase === "NEGATIVE_CAPABILITY_ONLY"
        ? "MIGRATION_HISTORY_ABSENT" : fixtureCase,
      credential,
    );
    try {
      await input.platform.setupFixture({
        major,
        fixture_case: fixtureCase === "NEGATIVE_CAPABILITY_ONLY"
          ? "MIGRATION_HISTORY_ABSENT" : fixtureCase,
        container,
        credential,
        statements,
      });
    } catch {
      fail("FIXTURE_SETUP_FAILED");
    }
    const session = await input.platform.openQualificationSession({ container, credential })
      .catch(() => fail("FIXTURE_SETUP_FAILED"));
    if (major === 14 || major === 15) {
      const result = await executeNegative(major, session, bootstrapSql);
      try {
        await session.close();
      } catch {
        throw diagnosticError("SESSION_CLOSE_FAILED", {
          failure_phase: "SESSION_CLOSE",
          session_close_performed: false,
        });
      }
      successfulCleanupFailure = diagnosticError("CLEANUP_FAILED", {
        failure_phase: "CLEANUP",
        completed_section_count: 0,
        session_close_performed: true,
      });
      evidenceWithoutCleanup = {
        schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
        qualification_id: `pg${major}-${nonce}-src${sourceDigest}-negative`,
        git_commit: input.git_commit,
        observed_at: (input.now ?? (() => new Date()))().toISOString(),
        postgres_major: major,
        server_version_num: result.server_version_num,
        image_tag: image.tag,
        image_id: image.image_id,
        image_repo_digest: image.repo_digest,
        bootstrap_authority_candidate_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
        bootstrap_query_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
        v2_query_authority_id: "farmos.production-target-identity-query.v2",
        v2_query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
        runtime_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
        section_count: 11,
        catalog_capability_columns: result.capability_columns,
        full_v2_executor_call_count: 0,
        executed_section_count: 0,
        parser_pass: false,
        sanitizer_pass: false,
        sensitive_marker_occurrences: 0,
        cluster_identifier_exposure_count: 0,
        h1_h2_case: "NOT_RUN_INCOMPATIBLE",
        h2_invocation_count: 0,
        h2_row_count: 0,
        fixture_digest: sourceFixture.fixture_digest,
        assertion_count: result.assertion_count,
        classification: "NOT_ELIGIBLE",
        transaction_mode: "NOT_STARTED_INCOMPATIBLE",
        rollback_performed: false,
        production_operations: 0,
        secret_exposed: false,
      };
    } else {
      if (fixtureCase === "NEGATIVE_CAPABILITY_ONLY") fail("PG_NOT_ELIGIBLE");
      const positiveCase = fixtureCase;
      const result = await executePositive(
        major, positiveCase, session, bootstrapSql, credential);
      successfulCleanupFailure = diagnosticError("CLEANUP_FAILED", {
        failure_phase: "CLEANUP",
        completed_section_count: result.executed_section_count,
        transaction_started: true,
        rollback_attempted: true,
        rollback_performed: true,
        rollback_status: "SUCCEEDED",
        session_close_performed: true,
      });
      evidenceWithoutCleanup = {
        schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
        qualification_id: `pg${major}-${nonce}-src${sourceDigest}-${positiveCase.toLowerCase()}`,
        git_commit: input.git_commit,
        observed_at: (input.now ?? (() => new Date()))().toISOString(),
        postgres_major: major,
        server_version_num: result.server_version_num,
        image_tag: image.tag,
        image_id: image.image_id,
        image_repo_digest: image.repo_digest,
        bootstrap_authority_candidate_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
        bootstrap_query_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
        v2_query_authority_id: "farmos.production-target-identity-query.v2",
        v2_query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
        runtime_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
        section_count: 11,
        catalog_capability_columns: CAPABILITY_COLUMNS,
        full_v2_executor_call_count: 1,
        executed_section_count: result.executed_section_count,
        parser_pass: true,
        sanitizer_pass: true,
        sensitive_marker_occurrences: 0,
        cluster_identifier_exposure_count: 0,
        h1_h2_case: positiveCase,
        h2_invocation_count: result.h2_invocation_count,
        h2_row_count: result.h2_row_count,
        fixture_digest: sourceFixture.fixture_digest,
        assertion_count: result.assertion_count,
        classification: "QUALIFIED",
        transaction_mode: "REPEATABLE READ READ ONLY",
        rollback_performed: result.rollback_performed,
        production_operations: 0,
        secret_exposed: false,
      };
    }
  } catch (error) {
    pendingError = error;
  }
  if (container === null) throw pendingError ??
    new FarmOsProductionIdentityPostgresQualificationError("CONTAINER_START_FAILED");
  let cleanupPass = false;
  try {
    cleanupPass = await input.platform.cleanupExactOwnedContainer(container);
  } catch {
    cleanupPass = false;
  }
  if (!cleanupPass) {
    throw preservedDiagnosticError(
      pendingError ?? successfulCleanupFailure ??
        new FarmOsProductionIdentityPostgresQualificationError("CLEANUP_FAILED"),
      "CLEANUP_FAILED",
      { cleanup_status: "FAILED", container_cleanup_performed: false },
    );
  }
  if (pendingError !== null) {
    throw preservedDiagnosticError(
      pendingError,
      pendingError instanceof FarmOsProductionIdentityPostgresQualificationError
        ? pendingError.code : "EVIDENCE_INVALID",
      { cleanup_status: "SUCCEEDED", container_cleanup_performed: true },
    );
  }
  if (evidenceWithoutCleanup === null) fail("EVIDENCE_INVALID");
  const completedEvidence = evidenceWithoutCleanup;
  const evidence: FarmOsProductionIdentityPostgresQualificationEvidence = Object.freeze({
    ...completedEvidence,
    container_cleanup_performed: true,
  });
  if (parseFarmOsProductionIdentityPostgresQualificationEvidence(evidence) === null ||
    JSON.stringify(evidence).includes(credential.password)) fail("EVIDENCE_INVALID");
  return evidence;
}

export async function executeFarmOsProductionIdentityPostgresQualificationMatrix(
  input: FarmOsProductionIdentityQualificationExecutorInput,
): Promise<FarmOsProductionIdentityQualificationRunResult> {
  if (!GIT_COMMIT.test(input.git_commit) || !DIGEST.test(input.executor_source_sha256) ||
    FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.adoption_status !== "ADOPTED" ||
    FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.runtime_binding_status !== "NOT_RUNTIME_BOUND") {
    fail("EVIDENCE_INVALID");
  }
  const bootstrap = loadFarmOsProductionPostgresBootstrapQueryArtifact();
  if (bootstrap.status !== "VERIFIED") fail("BOOTSTRAP_MISMATCH");
  const bootstrapSql = Buffer.from(bootstrap.raw_bytes).toString("utf8");
  const evidence: FarmOsProductionIdentityPostgresQualificationEvidence[] = [];
  const failures: FarmOsProductionIdentityPostgresQualificationFailure[] = [];
  for (const major of FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR
    .allowed_postgres_majors) {
    const cases: readonly (FarmOsProductionIdentityFixtureCase | "NEGATIVE_CAPABILITY_ONLY")[] =
      major <= 15 ? ["NEGATIVE_CAPABILITY_ONLY"] :
        ["MIGRATION_HISTORY_ABSENT", "MIGRATION_HISTORY_PRESENT"];
    let image: FarmOsProductionIdentityImageAuthority;
    try {
      image = await imageFor(input, major);
    } catch (error) {
      for (const fixtureCase of cases) {
        failures.push(failureEvidence(input, major, fixtureCase, error));
      }
      continue;
    }
    for (const fixtureCase of cases) {
      try {
        evidence.push(await runCase(input, major, fixtureCase, image, bootstrapSql));
      } catch (error) {
        failures.push(failureEvidence(input, major, fixtureCase, error));
      }
    }
  }
  return Object.freeze({
    lineage: Object.freeze({
      schema_version:
        "farmos.production-identity-postgres-qualification-executor-lineage.v1",
      executor_authority_id:
        "farmos.production-identity-postgres-isolated-qualification-executor.v1",
      git_commit: input.git_commit,
      executor_source_sha256: input.executor_source_sha256,
      repository_source_gate: "TRACKED_CLEAN_REQUIRED",
      production_operations: 0,
      filesystem_persistence: 0,
    }),
    evidence: Object.freeze(evidence),
    failures: Object.freeze(failures),
  });
}

export function serializeFarmOsProductionIdentityQualificationStdout(
  result: FarmOsProductionIdentityQualificationRunResult,
): readonly string[] {
  if (!executorLineageValid(result.lineage) || result.evidence.some((evidence) =>
    parseFarmOsProductionIdentityExecutorBoundEvidence(evidence, result.lineage) === null) ||
    result.failures.some((failure) =>
      parseFarmOsProductionIdentityExecutorBoundFailure(failure, result.lineage) === null)) {
    fail("EVIDENCE_INVALID");
  }
  return Object.freeze([result.lineage, ...result.evidence, ...result.failures].map((entry) =>
    JSON.stringify(entry)));
}

function executorLineageValid(
  lineage: FarmOsProductionIdentityQualificationRunResult["lineage"],
): boolean {
  return lineage.schema_version ===
      "farmos.production-identity-postgres-qualification-executor-lineage.v1" &&
    lineage.executor_authority_id ===
      "farmos.production-identity-postgres-isolated-qualification-executor.v1" &&
    GIT_COMMIT.test(lineage.git_commit) && DIGEST.test(lineage.executor_source_sha256) &&
    lineage.repository_source_gate === "TRACKED_CLEAN_REQUIRED" &&
    lineage.production_operations === 0 && lineage.filesystem_persistence === 0;
}

export function parseFarmOsProductionIdentityExecutorBoundEvidence(
  value: unknown,
  lineage: FarmOsProductionIdentityQualificationRunResult["lineage"],
): FarmOsProductionIdentityPostgresQualificationEvidence | null {
  if (!executorLineageValid(lineage)) return null;
  const evidence = parseFarmOsProductionIdentityPostgresQualificationEvidence(value);
  if (evidence === null || evidence.git_commit !== lineage.git_commit) return null;
  const digest = lineage.executor_source_sha256.slice(7);
  return evidence.qualification_id.includes(`-src${digest}-`) ? evidence : null;
}

export function parseFarmOsProductionIdentityExecutorBoundFailure(
  value: unknown,
  lineage: FarmOsProductionIdentityQualificationRunResult["lineage"],
): FarmOsProductionIdentityPostgresQualificationFailure | null {
  if (!executorLineageValid(lineage)) return null;
  const failure = parseFarmOsProductionIdentityPostgresQualificationFailure(value);
  return failure !== null && failure.source_commit === lineage.git_commit &&
    failure.source_digest === lineage.executor_source_sha256 ? failure : null;
}

export function evaluateFarmOsProductionIdentityExecutorQualificationClosure(
  result: FarmOsProductionIdentityQualificationRunResult,
): Readonly<{
  technical_qualification_achieved: true;
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v1";
  executor_source_sha256: `sha256:${string}`;
  evidence_count: 6;
  production_operations: 0;
}> | null {
  if (!executorLineageValid(result.lineage) || result.failures.length !== 0 ||
    result.evidence.length !== 6) return null;
  const evidence = result.evidence.map((entry) =>
    parseFarmOsProductionIdentityExecutorBoundEvidence(entry, result.lineage));
  if (evidence.some((entry) => entry === null)) return null;
  const parsed = evidence.filter((entry) => entry !== null);
  const negativePass = ([14, 15] as const).every((major) => {
    const matches = parsed.filter((entry) => entry.postgres_major === major);
    return matches.length === 1 && matches[0]?.classification === "NOT_ELIGIBLE" &&
      matches[0].full_v2_executor_call_count === 0 &&
      matches[0].container_cleanup_performed;
  });
  const positivePass = ([16, 17] as const).every((major) => {
    const matches = parsed.filter((entry) => entry.postgres_major === major);
    const absent = matches.find((entry) =>
      entry.h1_h2_case === "MIGRATION_HISTORY_ABSENT");
    const present = matches.find((entry) =>
      entry.h1_h2_case === "MIGRATION_HISTORY_PRESENT");
    return matches.length === 2 && absent?.classification === "QUALIFIED" &&
      present?.classification === "QUALIFIED" && absent.executed_section_count === 10 &&
      absent.h2_invocation_count === 0 && present.executed_section_count === 11 &&
      present.h2_invocation_count === 1 && present.h2_row_count === 5 &&
      absent.server_version_num === present.server_version_num &&
      absent.image_tag === present.image_tag && absent.image_id === present.image_id &&
      absent.image_repo_digest === present.image_repo_digest &&
      absent.git_commit === present.git_commit &&
      [absent, present].every((entry) => entry.parser_pass && entry.sanitizer_pass &&
        entry.rollback_performed && entry.container_cleanup_performed);
  });
  if (!negativePass || !positivePass) return null;
  return Object.freeze({
    technical_qualification_achieved: true,
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1",
    executor_source_sha256: result.lineage.executor_source_sha256,
    evidence_count: 6,
    production_operations: 0,
  });
}

void FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS;
