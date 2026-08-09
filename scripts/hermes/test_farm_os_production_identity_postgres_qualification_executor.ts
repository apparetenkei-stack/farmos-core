import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { DatabaseError } from "pg";

import {
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_ERRORS,
  FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL,
  FarmOsProductionIdentityPostgresQualificationError,
  FarmOsProductionIdentitySafeSectionQueryError,
  createFarmOsProductionIdentityQueryV4AuthorityAgreementPlan,
  createFarmOsProductionIdentityFixtureCredential,
  evaluateFarmOsProductionIdentityExecutorQualificationClosure,
  executeFarmOsProductionIdentityPostgresQualificationMatrix,
  parseFarmOsProductionIdentityExecutorBoundFailure,
  serializeFarmOsProductionIdentityQualificationStdout,
  validateFarmOsProductionIdentityQueryV4AuthorityAgreementPlan,
  validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement,
  type FarmOsProductionIdentityFixtureCredential,
  type FarmOsProductionIdentityImageAuthority,
  type FarmOsProductionIdentityOwnedContainer,
  type FarmOsProductionIdentityPostgresQualificationPlatform,
  type FarmOsProductionIdentityQueryV4AuthorityAgreementPlan,
  type FarmOsProductionIdentityQueryV4StatementAuthorityAgreement,
  type FarmOsProductionIdentityQualificationSession,
} from "./lib/farm_os_production_identity_postgres_qualification_executor";
import {
  FarmOsProductionIdentityExactDockerCommandRunner,
  FarmOsProductionIdentityIsolatedPostgresPlatform,
  FarmOsProductionIdentityRealAdapterSectionAuthority,
  sanitizeFarmOsProductionIdentityPgSectionError,
  type FarmOsProductionIdentityDockerCommandRunner,
} from "./lib/farm_os_production_identity_postgres_qualification_docker_adapter";
import {
  createFarmOsProductionIdentityPostgresQualificationExecutorErrorV3,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V1_LINEAGE,
  parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2,
  parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV3,
  parseFarmOsProductionIdentityPostgresQualificationEvidence,
  parseFarmOsProductionIdentityPostgresQualificationFailure,
  parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1,
  parseFarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2,
  parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV2,
  parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV3,
  type FarmOsProductionIdentityPostgresMajor,
} from "./lib/farm_os_production_identity_postgres_qualification_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
  loadFarmOsProductionIdentityQueryV4Artifact,
} from "../../src/lib/hermes/farm_os_production_identity_query_v4_authority";
import {
  loadFarmOsProductionIdentityQueryV3Artifact,
} from "../../src/lib/hermes/farm_os_production_identity_query_v3_authority";
import {
  loadFarmOsProductionIdentityQueryV2Artifact,
} from "../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  validateFarmOsProductionIdentityQueryV2CandidateResultSets,
  type FarmOsProductionIdentityCandidateResultSet,
} from "../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  buildFarmOsProductionIdentityPositiveExecutorTestFixture,
} from "./lib/farm_os_production_identity_postgres_qualification_test_fixture";
import {
  parseFarmOsProductionIdentityQualificationCli,
  runFarmOsProductionIdentityPostgresQualificationCli,
} from "./run_farm_os_production_identity_postgres_qualification";

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR, {
  authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v3",
  purpose: "isolated_postgres_compatibility_qualification",
  allowed_postgres_majors: [14, 15, 16, 17],
  production_target: "FORBIDDEN",
  production_credential: "FORBIDDEN",
  runtime_binding_required: false,
  automatic_query_retry: 0,
  evidence_persistence: "STDOUT_ONLY",
  caller_sql_count: 0,
  caller_host_count: 0,
  caller_image_count: 0,
});
assert.equal(new Set(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_ERRORS).size,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_ERRORS.length);
for (const expected of [
  "DOCKER_UNAVAILABLE", "IMAGE_MISSING", "IMAGE_PULL_FAILED", "CONTAINER_START_FAILED",
  "READINESS_FAILED", "FIXTURE_SETUP_FAILED", "BOOTSTRAP_MISMATCH", "PG_NOT_ELIGIBLE",
  "CAPABILITY_MISMATCH", "QUERY_ARTIFACT_DRIFT", "TRANSACTION_READ_ONLY_FAILED",
  "SECTION_EXECUTION_FAILED", "PARSER_FAILED", "SANITIZATION_FAILED", "ROLLBACK_FAILED",
  "CLEANUP_FAILED", "EVIDENCE_INVALID",
]) assert.equal(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_ERRORS.includes(expected as never), true);

assert.deepEqual(parseFarmOsProductionIdentityQualificationCli([]), { allow_image_pull: false });
assert.deepEqual(parseFarmOsProductionIdentityQualificationCli(["--allow-image-pull"]),
  { allow_image_pull: true });
for (const rejected of [["--major", "16"], ["--host", "production"], ["--image", "latest"],
  ["--output", "evidence.json"], ["--allow-image-pull", "extra"]]) {
  assert.equal(parseFarmOsProductionIdentityQualificationCli(rejected), null);
}

const legacyExecutorErrorV1 = Object.freeze({
  schema_version:
    "farmos.production-identity-postgres-qualification-executor-error.v1",
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v1",
  postgres_major: 14,
  case: "NEGATIVE_CAPABILITY_ONLY",
  error_code: "EVIDENCE_INVALID",
  production_operations: 0,
  secret_exposed: false,
  filesystem_persistence: 0,
} as const);
assert.deepEqual(
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V1_LINEAGE,
  {
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1",
    query_authority_id: "farmos.production-target-identity-query.v2",
    query_sha256:
      "sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95",
  },
);
const legacyExecutorErrorV2 = Object.freeze({
  schema_version:
    "farmos.production-identity-postgres-qualification-executor-error.v2",
  ...FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE,
  postgres_major: 14,
  case: "NEGATIVE_CAPABILITY_ONLY",
  error_code: "EVIDENCE_INVALID",
  production_operations: 0,
  secret_exposed: false,
  filesystem_persistence: 0,
} as const);
const currentExecutorErrorV3 =
  createFarmOsProductionIdentityPostgresQualificationExecutorErrorV3();
assert.deepEqual(
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE,
  {
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v2",
    executor_lineage_version:
      "farmos.production-identity-postgres-qualification-executor-lineage.v2",
    query_authority_id: "farmos.production-target-identity-query.v3",
    query_sha256:
      "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81",
    bootstrap_authority_id:
      "farmos.production-postgres-version-bootstrap-query.v1",
    bootstrap_sha256:
      "sha256:18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a",
  },
);
assert.deepEqual(
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE,
  {
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v3",
    executor_lineage_version:
      "farmos.production-identity-postgres-qualification-executor-lineage.v3",
    query_authority_id: "farmos.production-target-identity-query.v4",
    query_sha256:
      "sha256:e83987c840cc941cf5e6dcff93d46345464db0019ea5beb5143b0222316e05ca",
    bootstrap_authority_id:
      "farmos.production-postgres-version-bootstrap-query.v1",
    bootstrap_sha256:
      "sha256:18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a",
  },
);
assert.equal(
  parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1(
    legacyExecutorErrorV1,
  ),
  legacyExecutorErrorV1,
);
assert.equal(
  parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2(
    legacyExecutorErrorV2,
  ),
  legacyExecutorErrorV2,
);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV3(
  currentExecutorErrorV3), currentExecutorErrorV3);
assert.equal(
  parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2(legacyExecutorErrorV1),
  null,
);
assert.equal(
  parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1(legacyExecutorErrorV2),
  null,
);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1({
  ...legacyExecutorErrorV1,
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v2",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1({
  ...legacyExecutorErrorV1,
  query_authority_id: "farmos.production-target-identity-query.v3",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2({
  ...legacyExecutorErrorV2,
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v1",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2({
  ...legacyExecutorErrorV2,
  query_authority_id: "farmos.production-target-identity-query.v2",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2({
  ...legacyExecutorErrorV2,
  query_sha256: `sha256:${"0".repeat(64)}`,
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2({
  ...legacyExecutorErrorV2,
  unexpected: true,
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2(
  currentExecutorErrorV3), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV3(
  legacyExecutorErrorV2), null);

const capturedCliStdout: string[] = [];
const originalStdoutWrite = process.stdout.write;
process.stdout.write = ((chunk: string | Uint8Array) => {
  capturedCliStdout.push(String(chunk));
  return true;
}) as typeof process.stdout.write;
try {
  assert.equal(await runFarmOsProductionIdentityPostgresQualificationCli(["--invalid"]), 2);
} finally {
  process.stdout.write = originalStdoutWrite;
}
assert.equal(capturedCliStdout.length, 1);
const emittedExecutorError = JSON.parse(capturedCliStdout[0]!) as unknown;
assert.ok(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV3(emittedExecutorError));
assert.equal(parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2(
  emittedExecutorError), null);
assert.equal(
  parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1(emittedExecutorError),
  null,
);
assert.equal(JSON.stringify(emittedExecutorError).includes("executor-error.v1"), false);
assert.equal(JSON.stringify(emittedExecutorError).includes("executor-error.v2"), false);
for (const forbiddenKey of [
  "message", "detail", "hint", "context", "sql", "credential", "connection_string",
  "host", "docker_log", "catalog_payload", "production_secret",
]) assert.equal(Object.hasOwn(emittedExecutorError as object, forbiddenKey), false);

const fixedRandom = (size: number): Buffer => Buffer.alloc(size, 0xab);
const TEST_SOURCE_DIGEST = `sha256:${"9".repeat(64)}` as const;
const credential = createFarmOsProductionIdentityFixtureCredential(fixedRandom);
assert.equal(credential.password, `fq_${"ab".repeat(32)}`);
assert.doesNotMatch(JSON.stringify({ ...credential, password: "[omitted]" }), /SYNTHETIC_FIXTURE_PASSWORD/u);

const artifact = loadFarmOsProductionIdentityQueryV4Artifact();
assert.equal(artifact.status, "VERIFIED");
if (artifact.status !== "VERIFIED") throw new Error("artifact_not_verified");
assert.doesNotMatch(artifact.section_plan[0]!.statement_sql, /\border\s+by\b/iu);
assert.match(artifact.section_plan[0]!.statement_sql, /'server'::text\s+as\s+row_key/iu);
const sectionAuthorityPlan =
  createFarmOsProductionIdentityQueryV4AuthorityAgreementPlan(artifact);
assert.ok(sectionAuthorityPlan);
assert.equal(validateFarmOsProductionIdentityQueryV4AuthorityAgreementPlan(
  sectionAuthorityPlan, artifact), true);
assert.equal(sectionAuthorityPlan.length, 11);
assert.equal(Object.isFrozen(sectionAuthorityPlan), true);
assert.equal(sectionAuthorityPlan.every(Object.isFrozen), true);
const v4SectionAAgreement = sectionAuthorityPlan[0]!;
const v4SectionBAgreement = sectionAuthorityPlan[1]!;
const historicalV3 = loadFarmOsProductionIdentityQueryV3Artifact();
assert.equal(historicalV3.status, "VERIFIED");
if (historicalV3.status !== "VERIFIED") throw new Error("v3_artifact_not_verified");
const historicalV2 = loadFarmOsProductionIdentityQueryV2Artifact();
assert.equal(historicalV2.status, "VERIFIED");
if (historicalV2.status !== "VERIFIED") throw new Error("v2_artifact_not_verified");
const historicalV2SectionA = historicalV2.section_plan[0]!.statement_sql;
assert.match(historicalV2SectionA, /order\s+by\s+row_key\s+collate\s+"C"/iu);
const testStatementSha256 = (statementSql: string): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(statementSql, "utf8").digest("hex")}`;

const agreementCandidate = (
  base: FarmOsProductionIdentityQueryV4StatementAuthorityAgreement,
  overrides: Readonly<Record<string, unknown>>,
): FarmOsProductionIdentityQueryV4StatementAuthorityAgreement => Object.freeze({
  ...base,
  ...overrides,
}) as FarmOsProductionIdentityQueryV4StatementAuthorityAgreement;

assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  v4SectionAAgreement, sectionAuthorityPlan), true);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    statement_sql: historicalV2SectionA,
    statement_sha256: testStatementSha256(historicalV2SectionA),
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  v4SectionBAgreement, sectionAuthorityPlan), true);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionBAgreement, {
    query_authority_id: "farmos.production-target-identity-query.v2",
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    statement_sql: `${v4SectionAAgreement.statement_sql} `,
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    statement_sha256: `sha256:${"f".repeat(64)}`,
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    query_sha256: `sha256:${"0".repeat(64)}`,
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    section_id: "B_CLUSTER_IDENTITY_SOURCE",
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    statement_sql: "SELECT 1;",
    statement_sha256: testStatementSha256("SELECT 1;"),
  }), sectionAuthorityPlan), false);
assert.equal(validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
  agreementCandidate(v4SectionAAgreement, {
    section_id: "UNKNOWN_SECTION",
  }), sectionAuthorityPlan), false);
assert.equal(sectionAuthorityPlan.every((agreement) =>
  validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
    agreement, sectionAuthorityPlan)), true);

const realAdapterAuthority =
  new FarmOsProductionIdentityRealAdapterSectionAuthority(sectionAuthorityPlan);
assert.equal(realAdapterAuthority.accepts(v4SectionAAgreement), true);
assert.equal(sectionAuthorityPlan.every((agreement) =>
  realAdapterAuthority.accepts(agreement)), true);
assert.equal(realAdapterAuthority.accepts(agreementCandidate(v4SectionAAgreement, {
  statement_sql: historicalV2SectionA,
  statement_sha256: testStatementSha256(historicalV2SectionA),
})), false);
const historicalV3SectionB = historicalV3.section_plan[1]!.statement_sql;
assert.equal(realAdapterAuthority.accepts(agreementCandidate(v4SectionBAgreement, {
  query_authority_id: "farmos.production-target-identity-query.v3",
  query_sha256:
    "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81",
  statement_sql: historicalV3SectionB,
  statement_sha256: testStatementSha256(historicalV3SectionB),
})), false);
const driftedPlan = Object.freeze(sectionAuthorityPlan.map((agreement, index) =>
  index === 0 ? agreementCandidate(agreement, {
    query_sha256: `sha256:${"0".repeat(64)}`,
  }) : agreement));
assert.throws(
  () => new FarmOsProductionIdentityRealAdapterSectionAuthority(driftedPlan),
  (error: unknown) => error instanceof FarmOsProductionIdentityPostgresQualificationError &&
    error.code === "QUERY_ARTIFACT_DRIFT",
);
const historicalV3Plan = Object.freeze(sectionAuthorityPlan.map((agreement, index) => {
  const historicalStatement = historicalV3.section_plan[index]!.statement_sql;
  return agreementCandidate(agreement, {
    query_authority_id: "farmos.production-target-identity-query.v3",
    query_sha256:
      "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81",
    statement_sha256: testStatementSha256(historicalStatement),
    statement_sql: historicalStatement,
  });
}));
assert.throws(
  () => new FarmOsProductionIdentityRealAdapterSectionAuthority(historicalV3Plan),
  (error: unknown) => error instanceof FarmOsProductionIdentityPostgresQualificationError &&
    error.code === "QUERY_ARTIFACT_DRIFT",
);
const sectionBySql = new Map(artifact.section_plan.map((entry) =>
  [entry.statement_sql, entry.section_id]));

type SessionTrace = {
  major: FarmOsProductionIdentityPostgresMajor;
  fixtureCase: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT";
  sectionCalls: string[];
  begin: number;
  timeout: number;
  rollback: number;
  close: number;
};

class FakeSession implements FarmOsProductionIdentityQualificationSession {
  constructor(
    private readonly trace: SessionTrace,
    private readonly positiveFixture: readonly FarmOsProductionIdentityCandidateResultSet[] | null,
    private readonly sectionFailure: Readonly<{
      section_id: string;
      phase: "ADAPTER_ALLOWLIST" | "SECTION_QUERY" | "SECTION_RESULT_MATERIALIZATION";
      sqlstate: string | null;
    }> | null,
    private readonly h1StateOverride: "absent" | "present" | "invalid" | null,
    private readonly authorityPlan: FarmOsProductionIdentityQueryV4AuthorityAgreementPlan,
  ) {}

  async beginRepeatableReadOnly(): Promise<void> {
    this.trace.begin += 1;
  }

  async setLocalTimeouts(): Promise<void> {
    this.trace.timeout += 1;
  }

  async query(sql: string): Promise<readonly Record<string, unknown>[]> {
    if (sql === FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL) return [{
      current_user: "farmos_identity_qualification",
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: true,
      rolreplication: false,
      rolbypassrls: false,
      pg_monitor_member: true,
    }];
    if (sql === "SELECT current_setting('server_version_num')::integer AS server_version_num;\n") {
      return [{ server_version_num: this.trace.major * 10_000 + 7 }];
    }
    if (sql.startsWith("SELECT column_name\nFROM information_schema.columns\n")) {
      return this.trace.major <= 15 ? [] :
        [{ column_name: "inherit_option" }, { column_name: "set_option" }];
    }
    throw new Error("unexpected_auxiliary_sql");
  }

  private async queryReviewedSection(
    sql: string,
  ): Promise<readonly Record<string, unknown>[]> {
    const section = sectionBySql.get(sql);
    if (section === undefined) throw new Error("unexpected_sql");
    if (this.sectionFailure?.section_id === section) {
      throw new FarmOsProductionIdentitySafeSectionQueryError(
        this.sectionFailure.phase, this.sectionFailure.sqlstate);
    }
    this.trace.sectionCalls.push(section);
    if (section === "H1_MIGRATION_HISTORY_EXISTENCE" && this.h1StateOverride !== null) {
      return [{
        section_id: section,
        row_key: "core_schema.migration_history",
        payload: {
          collection_status: "complete",
          relation: "core_schema.migration_history",
          state: this.h1StateOverride === "invalid" ? "unknown" : this.h1StateOverride,
        },
        sanitization_class: "SAFE_STRUCTURAL",
      }];
    }
    const positiveRows = this.positiveFixture?.find((candidate) =>
      candidate.section_id === section)?.rows;
    if (positiveRows !== undefined) {
      return structuredClone(positiveRows) as Record<string, unknown>[];
    }
    if (section === "H1_MIGRATION_HISTORY_EXISTENCE") return [{
      section_id: section,
      row_key: "core_schema.migration_history",
      payload: {
        collection_status: "complete",
        relation: "core_schema.migration_history",
        state: this.trace.fixtureCase === "MIGRATION_HISTORY_PRESENT" ? "present" : "absent",
      },
      sanitization_class: "SAFE_STRUCTURAL",
    }];
    if (section === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT") return [{
      section_id: section,
      row_key: "__collection_status__",
      payload: {
        collection_status: "complete", inventory_complete: true,
        queried_target_count: 5, row_count: 0, state: "applicable",
      },
      sanitization_class: "SAFE_STRUCTURAL",
    }];
    return [];
  }

  async querySection(
    agreement: FarmOsProductionIdentityQueryV4StatementAuthorityAgreement,
  ): Promise<readonly Record<string, unknown>[]> {
    if (!validateFarmOsProductionIdentityQueryV4StatementAuthorityAgreement(
      agreement, this.authorityPlan)) {
      throw new FarmOsProductionIdentitySafeSectionQueryError(
        "ADAPTER_ALLOWLIST", null);
    }
    return await this.queryReviewedSection(agreement.statement_sql);
  }

  async rollback(): Promise<void> {
    this.trace.rollback += 1;
  }

  async close(): Promise<void> {
    this.trace.close += 1;
  }
}

class FakePlatform implements FarmOsProductionIdentityPostgresQualificationPlatform {
  readonly traces: SessionTrace[] = [];
  readonly setupStatements: string[][] = [];
  inspectCount = 0;
  pullCount = 0;
  startCount = 0;
  cleanupCount = 0;
  readinessInputs: unknown[] = [];
  cleanupPass = true;
  rollbackPass = true;
  closePass = true;
  imagesPresent = true;
  positiveSuccess = false;
  sectionFailure: Readonly<{
    section_id: string;
    phase: "ADAPTER_ALLOWLIST" | "SECTION_QUERY" | "SECTION_RESULT_MATERIALIZATION";
    sqlstate: string | null;
  }> | null = null;
  h1StateOverride: "absent" | "present" | "invalid" | null = null;
  private currentFixtureCase: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT" =
    "MIGRATION_HISTORY_ABSENT";

  async inspectImage(major: FarmOsProductionIdentityPostgresMajor): Promise<FarmOsProductionIdentityImageAuthority | null> {
    this.inspectCount += 1;
    return this.imagesPresent ? image(major) : null;
  }

  async pullImage(major: FarmOsProductionIdentityPostgresMajor): Promise<FarmOsProductionIdentityImageAuthority | null> {
    this.pullCount += 1;
    return image(major);
  }

  async startContainer(input: Readonly<{
    major: FarmOsProductionIdentityPostgresMajor;
    image: FarmOsProductionIdentityImageAuthority;
    nonce: string;
    credential: FarmOsProductionIdentityFixtureCredential;
  }>): Promise<FarmOsProductionIdentityOwnedContainer> {
    this.startCount += 1;
    assert.match(input.credential.password, /^fq_[a-f0-9]{64}$/u);
    return {
      container_name: `farmos-prod-identity-pg${input.major}-${input.nonce}`,
      ownership_label: `farmos.production-identity-qualification=${input.major}-${input.nonce}`,
      container_id: "c".repeat(64),
      expected_image_id: input.image.image_id,
      host: "127.0.0.1",
      port: 20_000 + input.major,
    };
  }

  async verifyContainerOwnership(): Promise<boolean> {
    return true;
  }

  async waitUntilReady(input: Readonly<{
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    maximum_attempts: 30;
    interval_ms: 250;
  }>): Promise<boolean> {
    this.readinessInputs.push(input);
    return true;
  }

  async setupFixture(input: Readonly<{
    major: FarmOsProductionIdentityPostgresMajor;
    fixture_case: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT";
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    statements: readonly string[];
  }>): Promise<void> {
    this.currentFixtureCase = input.fixture_case;
    this.setupStatements.push([...input.statements]);
    assert.equal(input.statements.some((statement) =>
      statement.includes(input.credential.password)), true);
  }

  async openQualificationSession(input: Readonly<{
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    section_authority_plan: FarmOsProductionIdentityQueryV4AuthorityAgreementPlan;
  }>): Promise<FarmOsProductionIdentityQualificationSession> {
    const major = Number(input.container.container_name.match(/pg(14|15|16|17)-/u)?.[1]);
    assert.equal([14, 15, 16, 17].includes(major), true);
    const trace: SessionTrace = {
      major: major as FarmOsProductionIdentityPostgresMajor,
      fixtureCase: this.currentFixtureCase,
      sectionCalls: [], begin: 0, timeout: 0, rollback: 0, close: 0,
    };
    this.traces.push(trace);
    const positiveFixture = this.positiveSuccess && major >= 16
      ? buildFarmOsProductionIdentityPositiveExecutorTestFixture(
        major as 16 | 17, this.currentFixtureCase)
      : null;
    if (positiveFixture !== null) {
      assert.deepEqual(validateFarmOsProductionIdentityQueryV2CandidateResultSets(
        positiveFixture), { valid: true });
    }
    const session = new FakeSession(
      trace, positiveFixture, this.sectionFailure, this.h1StateOverride,
      input.section_authority_plan);
    if (!this.rollbackPass) {
      session.rollback = async () => {
        trace.rollback += 1;
        throw new Error("synthetic_rollback_failure");
      };
    }
    if (!this.closePass) {
      session.close = async () => {
        trace.close += 1;
        throw new Error("synthetic_close_failure");
      };
    }
    return session;
  }

  async cleanupExactOwnedContainer(): Promise<boolean> {
    this.cleanupCount += 1;
    return this.cleanupPass;
  }
}

function image(major: FarmOsProductionIdentityPostgresMajor): FarmOsProductionIdentityImageAuthority {
  return {
    tag: `postgres:${major}`,
    image_id: `sha256:${String(major).padStart(2, "0").repeat(32)}`,
    repo_digest: `sha256:${"d".repeat(64)}`,
  };
}

const platform = new FakePlatform();
const matrix = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "f".repeat(40),
  executor_source_sha256: TEST_SOURCE_DIGEST,
  allow_image_pull: false,
  platform,
  now: () => new Date("2026-08-09T00:00:00.000Z"),
  random_bytes: fixedRandom,
});
assert.equal(matrix.evidence.length, 2);
assert.deepEqual(matrix.evidence.map((entry) => entry.classification),
  ["NOT_ELIGIBLE", "NOT_ELIGIBLE"]);
assert.equal(matrix.failures.length, 4);
assert.equal(matrix.failures.every((entry) => entry.failure_code === "PARSER_FAILED"), true);
assert.equal(platform.startCount, 6);
assert.equal(platform.cleanupCount, 6);
assert.equal(platform.pullCount, 0);
assert.equal(platform.readinessInputs.every((input) =>
  (input as { maximum_attempts: number }).maximum_attempts === 30 &&
  (input as { interval_ms: number }).interval_ms === 250), true);
assert.equal(platform.setupStatements.some((statements) => statements.some((statement) =>
  statement.includes("SYNTHETIC_FIXTURE_PASSWORD_NOT_A_CREDENTIAL"))), false);
for (const trace of platform.traces.filter((candidate) => candidate.major >= 16)) {
  assert.equal(trace.begin, 1);
  assert.equal(trace.timeout, 1);
  assert.equal(trace.rollback, 1);
  assert.equal(trace.close, 1);
  assert.equal(trace.sectionCalls.length,
    trace.fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 11 : 10);
  assert.equal(trace.sectionCalls.includes("H2_MIGRATION_HISTORY_ROWS_IF_PRESENT"),
    trace.fixtureCase === "MIGRATION_HISTORY_PRESENT");
}
const stdoutLines = serializeFarmOsProductionIdentityQualificationStdout(matrix);
assert.equal(stdoutLines.length, 7);
assert.equal(JSON.parse(stdoutLines[0]!).repository_source_gate, "TRACKED_CLEAN_REQUIRED");
assert.equal(stdoutLines.every((line) => JSON.parse(line).production_operations === 0), true);
assert.equal(stdoutLines.some((line) => line.includes(`fq_${"ab".repeat(32)}`)), false);
assert.equal(stdoutLines.some((line) => /connection_string|password|raw_/iu.test(line)), false);

const positivePlatform = new FakePlatform();
positivePlatform.positiveSuccess = true;
const positiveMatrix = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "a".repeat(40),
  executor_source_sha256: TEST_SOURCE_DIGEST,
  allow_image_pull: false,
  platform: positivePlatform,
  now: () => new Date("2026-08-09T00:00:00.000Z"),
  random_bytes: fixedRandom,
});
assert.equal(positiveMatrix.failures.length, 0);
assert.equal(positiveMatrix.evidence.length, 6);
assert.equal(positiveMatrix.evidence.every((entry) =>
  entry.schema_version ===
    "farmos.production-identity-postgres-qualification-evidence.v3" &&
  entry.query_authority_id === FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id &&
  entry.query_sha256 === FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256), true);
const legacyEvidenceV2 = {
  ...positiveMatrix.evidence[0]!,
  schema_version: "farmos.production-identity-postgres-qualification-evidence.v2",
  query_authority_id: "farmos.production-target-identity-query.v3",
  query_sha256:
    "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81",
} as const;
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence(legacyEvidenceV2), null);
assert.deepEqual(
  parseFarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2(legacyEvidenceV2),
  legacyEvidenceV2,
);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2(
  positiveMatrix.evidence[0]), null);
assert.equal(JSON.stringify(positiveMatrix).includes("farmos.production-target-identity-query.v2"), false);
assert.equal(JSON.stringify(positiveMatrix).includes("farmos.production-target-identity-query.v3"), false);
assert.equal(positiveMatrix.lineage.schema_version,
  "farmos.production-identity-postgres-qualification-executor-lineage.v3");
assert.deepEqual(positiveMatrix.evidence.map((entry) => entry.classification),
  ["NOT_ELIGIBLE", "NOT_ELIGIBLE", "QUALIFIED", "QUALIFIED", "QUALIFIED", "QUALIFIED"]);
assert.equal(positiveMatrix.evidence.filter((entry) => entry.classification === "QUALIFIED")
  .every((entry) => entry.parser_pass && entry.sanitizer_pass &&
    entry.rollback_performed && entry.container_cleanup_performed), true);
assert.deepEqual(positiveMatrix.evidence.filter((entry) => entry.postgres_major >= 16)
  .map((entry) => [entry.postgres_major, entry.h1_h2_case,
    entry.executed_section_count, entry.h2_invocation_count, entry.h2_row_count]), [
  [16, "MIGRATION_HISTORY_ABSENT", 10, 0, 0],
  [16, "MIGRATION_HISTORY_PRESENT", 11, 1, 5],
  [17, "MIGRATION_HISTORY_ABSENT", 10, 0, 0],
  [17, "MIGRATION_HISTORY_PRESENT", 11, 1, 5],
]);
const positiveStdout = serializeFarmOsProductionIdentityQualificationStdout(positiveMatrix);
assert.equal(positiveStdout.length, 7);
assert.equal(positiveStdout.some((line) => /SYNTHETIC_SECRET_MARKER|raw_cluster_identifier|password/iu.test(line)), false);
assert.deepEqual(evaluateFarmOsProductionIdentityExecutorQualificationClosure(
  positiveMatrix), {
  technical_qualification_achieved: true,
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v3",
  executor_source_sha256: TEST_SOURCE_DIGEST,
  evidence_count: 6,
  production_operations: 0,
});
assert.equal(evaluateFarmOsProductionIdentityExecutorQualificationClosure({
  ...positiveMatrix,
  lineage: { ...positiveMatrix.lineage, executor_source_sha256: `sha256:${"8".repeat(64)}` },
}), null);

async function sectionFailureMatrix(input: Readonly<{
  section_id: string;
  phase?: "ADAPTER_ALLOWLIST" | "SECTION_QUERY" | "SECTION_RESULT_MATERIALIZATION";
  sqlstate?: string | null;
  rollback_pass?: boolean;
  cleanup_pass?: boolean;
}>) {
  const failurePlatform = new FakePlatform();
  failurePlatform.positiveSuccess = true;
  failurePlatform.sectionFailure = {
    section_id: input.section_id,
    phase: input.phase ?? "SECTION_QUERY",
    sqlstate: input.sqlstate ?? null,
  };
  failurePlatform.rollbackPass = input.rollback_pass ?? true;
  failurePlatform.cleanupPass = input.cleanup_pass ?? true;
  return await executeFarmOsProductionIdentityPostgresQualificationMatrix({
    git_commit: "6".repeat(40),
    executor_source_sha256: TEST_SOURCE_DIGEST,
    allow_image_pull: false,
    platform: failurePlatform,
    now: () => new Date("2026-08-09T00:00:00.000Z"),
    random_bytes: fixedRandom,
  });
}

const sectionCases = [
  ["A_TRANSACTION_SERVER_GATE", 1, 0],
  ["B_CLUSTER_IDENTITY_SOURCE", 2, 1],
  ["J_DATABASE_SIZE", 11, 10],
] as const;
for (const [sectionId, ordinal, completed] of sectionCases) {
  const failed = await sectionFailureMatrix({ section_id: sectionId, sqlstate: "42501" });
  const diagnostic = failed.failures.find((entry) => entry.postgres_major === 16 &&
    entry.fixture_case === "MIGRATION_HISTORY_PRESENT");
  assert.ok(diagnostic);
  assert.equal(diagnostic.section_id, sectionId);
  assert.equal(diagnostic.statement_ordinal, ordinal);
  assert.equal(diagnostic.completed_section_count, completed);
  assert.equal(diagnostic.sqlstate, "42501");
  assert.equal(diagnostic.primary_failure_code, "SECTION_EXECUTION_FAILED");
  assert.equal(diagnostic.terminal_failure_code, "SECTION_EXECUTION_FAILED");
  assert.equal(diagnostic.transaction_started, true);
  assert.equal(diagnostic.rollback_status, "SUCCEEDED");
  assert.equal(diagnostic.cleanup_status, "SUCCEEDED");
  assert.equal(diagnostic.query_authority_id,
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id);
  assert.equal(diagnostic.query_sha256, FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256);
  assert.equal(diagnostic.schema_version,
    "farmos.production-identity-postgres-qualification-failure.v4");
  assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure(diagnostic), diagnostic);
  assert.equal(parseFarmOsProductionIdentityExecutorBoundFailure(diagnostic, failed.lineage), diagnostic);
  if (sectionId === "J_DATABASE_SIZE") {
    const absent = failed.failures.find((entry) => entry.postgres_major === 16 &&
      entry.fixture_case === "MIGRATION_HISTORY_ABSENT");
    assert.equal(absent?.completed_section_count, 9);
  }
}

const h2Failed = await sectionFailureMatrix({
  section_id: "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT", sqlstate: "42703",
});
const h2PresentFailure = h2Failed.failures.find((entry) => entry.postgres_major === 16 &&
  entry.fixture_case === "MIGRATION_HISTORY_PRESENT");
assert.ok(h2PresentFailure);
assert.equal(h2PresentFailure.statement_ordinal, 9);
assert.equal(h2PresentFailure.completed_section_count, 8);
assert.equal(h2Failed.failures.some((entry) => entry.fixture_case ===
  "MIGRATION_HISTORY_ABSENT" && entry.section_id ===
  "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT"), false);
assert.equal(h2Failed.evidence.some((entry) => entry.postgres_major === 16 &&
  entry.h1_h2_case === "MIGRATION_HISTORY_ABSENT" && entry.classification === "QUALIFIED"), true);

for (const h1Override of ["invalid", "present", "absent"] as const) {
  const h1Platform = new FakePlatform();
  h1Platform.positiveSuccess = true;
  h1Platform.h1StateOverride = h1Override;
  const h1Matrix = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
    git_commit: "6".repeat(40), executor_source_sha256: TEST_SOURCE_DIGEST,
    allow_image_pull: false, platform: h1Platform, random_bytes: fixedRandom,
  });
  const expectedCases = h1Override === "invalid"
    ? ["MIGRATION_HISTORY_ABSENT", "MIGRATION_HISTORY_PRESENT"]
    : h1Override === "present" ? ["MIGRATION_HISTORY_ABSENT"]
      : ["MIGRATION_HISTORY_PRESENT"];
  for (const fixtureCase of expectedCases) {
    const diagnostic = h1Matrix.failures.find((entry) => entry.postgres_major === 16 &&
      entry.fixture_case === fixtureCase);
    assert.ok(diagnostic);
    assert.equal(diagnostic.primary_failure_code, "PARSER_FAILED");
    assert.equal(diagnostic.failure_phase, "PARSER_HANDOFF");
    assert.equal(diagnostic.completed_section_count, 8);
  }
}

for (const sqlstate of ["42501", "42703", "42883", "42601"] as const) {
  const pgError = new DatabaseError("SYNTHETIC_SECRET_MARKER_MESSAGE", 1, "error");
  pgError.code = sqlstate;
  pgError.detail = "SYNTHETIC_SECRET_MARKER_DETAIL";
  pgError.hint = "SYNTHETIC_SECRET_MARKER_HINT";
  pgError.where = "SYNTHETIC_SECRET_MARKER_CONTEXT";
  pgError.internalQuery = "SELECT SYNTHETIC_SECRET_MARKER_QUERY";
  const sanitizedError = sanitizeFarmOsProductionIdentityPgSectionError(pgError);
  assert.equal(sanitizedError.failure_phase, "SECTION_QUERY");
  assert.equal(sanitizedError.sqlstate, sqlstate);
  assert.doesNotMatch(JSON.stringify(sanitizedError), /SYNTHETIC_SECRET_MARKER|SELECT/u);
}
assert.equal(sanitizeFarmOsProductionIdentityPgSectionError({ code: "42501" }).sqlstate, null);
for (const malformed of ["4250", "425010", "42p01", "", null, 42501]) {
  const pgError = new DatabaseError("hidden", 1, "error");
  pgError.code = malformed as string | undefined;
  assert.equal(sanitizeFarmOsProductionIdentityPgSectionError(pgError).sqlstate, null);
}

const allowlistFailure = await sectionFailureMatrix({
  section_id: "A_TRANSACTION_SERVER_GATE", phase: "ADAPTER_ALLOWLIST", sqlstate: null,
});
assert.equal(allowlistFailure.failures.find((entry) => entry.postgres_major === 16)?.failure_phase,
  "ADAPTER_ALLOWLIST");
const materializationFailure = await sectionFailureMatrix({
  section_id: "C_SCHEMA_IDENTITY", phase: "SECTION_RESULT_MATERIALIZATION",
});
assert.equal(materializationFailure.failures.find((entry) => entry.postgres_major === 16)
  ?.failure_phase, "SECTION_RESULT_MATERIALIZATION");

const precedenceCases = [
  [true, true, "SECTION_EXECUTION_FAILED", "SUCCEEDED", "SUCCEEDED"],
  [false, true, "ROLLBACK_FAILED", "FAILED", "SUCCEEDED"],
  [true, false, "CLEANUP_FAILED", "SUCCEEDED", "FAILED"],
  [false, false, "CLEANUP_FAILED", "FAILED", "FAILED"],
] as const;
for (const [rollbackPass, cleanupPass, terminal, rollbackStatus, cleanupStatus] of
  precedenceCases) {
  const precedence = await sectionFailureMatrix({
    section_id: "B_CLUSTER_IDENTITY_SOURCE",
    sqlstate: "42501",
    rollback_pass: rollbackPass,
    cleanup_pass: cleanupPass,
  });
  const diagnostic = precedence.failures.find((entry) => entry.postgres_major === 16 &&
    entry.fixture_case === "MIGRATION_HISTORY_ABSENT");
  assert.ok(diagnostic);
  assert.equal(diagnostic.primary_failure_code, "SECTION_EXECUTION_FAILED");
  assert.equal(diagnostic.terminal_failure_code, terminal);
  assert.equal(diagnostic.failure_code, terminal);
  assert.equal(diagnostic.failure_phase, "SECTION_QUERY");
  assert.equal(diagnostic.section_id, "B_CLUSTER_IDENTITY_SOURCE");
  assert.equal(diagnostic.sqlstate, "42501");
  assert.equal(diagnostic.rollback_status, rollbackStatus);
  assert.equal(diagnostic.cleanup_status, cleanupStatus);
}

const successRollbackFailurePlatform = new FakePlatform();
successRollbackFailurePlatform.positiveSuccess = true;
successRollbackFailurePlatform.rollbackPass = false;
const successRollbackFailure = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "6".repeat(40), executor_source_sha256: TEST_SOURCE_DIGEST,
  allow_image_pull: false, platform: successRollbackFailurePlatform,
  random_bytes: fixedRandom,
});
const successRollbackDiagnostic = successRollbackFailure.failures.find((entry) =>
  entry.postgres_major === 16 && entry.fixture_case === "MIGRATION_HISTORY_ABSENT");
assert.ok(successRollbackDiagnostic);
assert.equal(successRollbackDiagnostic.primary_failure_code, "ROLLBACK_FAILED");
assert.equal(successRollbackDiagnostic.failure_phase, "ROLLBACK");
assert.equal(successRollbackDiagnostic.transaction_started, true);
assert.equal(successRollbackDiagnostic.rollback_attempted, true);
assert.equal(successRollbackDiagnostic.rollback_status, "FAILED");
assert.equal(successRollbackDiagnostic.session_close_performed, true);

const successCloseFailurePlatform = new FakePlatform();
successCloseFailurePlatform.positiveSuccess = true;
successCloseFailurePlatform.closePass = false;
const successCloseFailure = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "6".repeat(40), executor_source_sha256: TEST_SOURCE_DIGEST,
  allow_image_pull: false, platform: successCloseFailurePlatform,
  random_bytes: fixedRandom,
});
const successCloseDiagnostic = successCloseFailure.failures.find((entry) =>
  entry.postgres_major === 16 && entry.fixture_case === "MIGRATION_HISTORY_ABSENT");
assert.ok(successCloseDiagnostic);
assert.equal(successCloseDiagnostic.primary_failure_code, "SESSION_CLOSE_FAILED");
assert.equal(successCloseDiagnostic.failure_phase, "SESSION_CLOSE");
assert.equal(successCloseDiagnostic.transaction_started, true);
assert.equal(successCloseDiagnostic.rollback_status, "SUCCEEDED");
assert.equal(successCloseDiagnostic.session_close_performed, false);

const sectionAndCloseFailurePlatform = new FakePlatform();
sectionAndCloseFailurePlatform.positiveSuccess = true;
sectionAndCloseFailurePlatform.closePass = false;
sectionAndCloseFailurePlatform.sectionFailure = {
  section_id: "B_CLUSTER_IDENTITY_SOURCE", phase: "SECTION_QUERY", sqlstate: "42501",
};
const sectionAndCloseFailure = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "6".repeat(40), executor_source_sha256: TEST_SOURCE_DIGEST,
  allow_image_pull: false, platform: sectionAndCloseFailurePlatform,
  random_bytes: fixedRandom,
});
const sectionAndCloseDiagnostic = sectionAndCloseFailure.failures.find((entry) =>
  entry.postgres_major === 16 && entry.fixture_case === "MIGRATION_HISTORY_ABSENT");
assert.ok(sectionAndCloseDiagnostic);
assert.equal(sectionAndCloseDiagnostic.primary_failure_code, "SECTION_EXECUTION_FAILED");
assert.equal(sectionAndCloseDiagnostic.terminal_failure_code, "SESSION_CLOSE_FAILED");
assert.equal(sectionAndCloseDiagnostic.failure_phase, "SECTION_QUERY");
assert.equal(sectionAndCloseDiagnostic.section_id, "B_CLUSTER_IDENTITY_SOURCE");
assert.equal(sectionAndCloseDiagnostic.rollback_status, "SUCCEEDED");
assert.equal(sectionAndCloseDiagnostic.session_close_performed, false);

const lineageFailure = (await sectionFailureMatrix({
  section_id: "B_CLUSTER_IDENTITY_SOURCE", sqlstate: "42501",
})).failures[0]!;
const legacyFailureV2 = {
  ...lineageFailure,
  schema_version: "farmos.production-identity-postgres-qualification-failure.v2",
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v1",
  query_authority_id: "farmos.production-target-identity-query.v2",
  query_sha256:
    "sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95",
} as const;
const legacyFailureV3 = {
  ...lineageFailure,
  schema_version: "farmos.production-identity-postgres-qualification-failure.v3",
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v2",
  query_authority_id: "farmos.production-target-identity-query.v3",
  query_sha256:
    "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81",
} as const;
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure(legacyFailureV2), null);
assert.deepEqual(
  parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV2(legacyFailureV2),
  legacyFailureV2,
);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV2(lineageFailure), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure(legacyFailureV3), null);
assert.deepEqual(
  parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV3(legacyFailureV3),
  legacyFailureV3,
);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV3(lineageFailure), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure({
  ...lineageFailure, unexpected: true,
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure({
  ...lineageFailure, sqlstate: "42p01",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure({
  ...lineageFailure, section_id: "UNKNOWN",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure({
  ...lineageFailure, statement_ordinal: 3,
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure({
  ...lineageFailure, completed_section_count: 0,
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationFailure({
  ...h2PresentFailure, fixture_case: "MIGRATION_HISTORY_ABSENT",
}), null);
assert.equal(parseFarmOsProductionIdentityExecutorBoundFailure(lineageFailure, {
  schema_version: "farmos.production-identity-postgres-qualification-executor-lineage.v3",
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v3",
  git_commit: "6".repeat(40),
  executor_source_sha256: `sha256:${"8".repeat(64)}`,
  repository_source_gate: "TRACKED_CLEAN_REQUIRED",
  production_operations: 0,
  filesystem_persistence: 0,
}), null);
const mismatchedImageEvidence = positiveMatrix.evidence.map((entry) =>
  entry.postgres_major === 16 && entry.h1_h2_case === "MIGRATION_HISTORY_PRESENT"
    ? { ...entry, image_id: `sha256:${"7".repeat(64)}` }
    : entry);
assert.equal(evaluateFarmOsProductionIdentityExecutorQualificationClosure({
  ...positiveMatrix,
  evidence: mismatchedImageEvidence,
}), null);

const missingImages = new FakePlatform();
missingImages.imagesPresent = false;
const missingResult = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "e".repeat(40), allow_image_pull: false, platform: missingImages,
  executor_source_sha256: TEST_SOURCE_DIGEST,
  random_bytes: fixedRandom,
});
assert.equal(missingResult.evidence.length, 0);
assert.equal(missingResult.failures.length, 6);
assert.equal(missingResult.failures.every((entry) => entry.failure_code === "IMAGE_MISSING"), true);
assert.equal(missingImages.startCount, 0);
assert.equal(missingImages.pullCount, 0);

const pullAllowed = new FakePlatform();
pullAllowed.imagesPresent = false;
await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "d".repeat(40), allow_image_pull: true, platform: pullAllowed,
  executor_source_sha256: TEST_SOURCE_DIGEST,
  random_bytes: fixedRandom,
});
assert.equal(pullAllowed.pullCount, 4);

const cleanupFailure = new FakePlatform();
cleanupFailure.cleanupPass = false;
const cleanupResult = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "c".repeat(40), allow_image_pull: false, platform: cleanupFailure,
  executor_source_sha256: TEST_SOURCE_DIGEST,
  random_bytes: fixedRandom,
});
assert.equal(cleanupResult.evidence.length, 0);
assert.equal(cleanupResult.failures.every((entry) => entry.failure_code === "CLEANUP_FAILED"), true);

const successfulCleanupFailurePlatform = new FakePlatform();
successfulCleanupFailurePlatform.positiveSuccess = true;
successfulCleanupFailurePlatform.cleanupPass = false;
const successfulCleanupResult = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "c".repeat(40), allow_image_pull: false,
  platform: successfulCleanupFailurePlatform,
  executor_source_sha256: TEST_SOURCE_DIGEST,
  random_bytes: fixedRandom,
});
const negativeCleanupDiagnostic = successfulCleanupResult.failures.find((entry) =>
  entry.postgres_major === 14);
assert.ok(negativeCleanupDiagnostic);
assert.equal(negativeCleanupDiagnostic.completed_section_count, 0);
assert.equal(negativeCleanupDiagnostic.transaction_started, false);
assert.equal(negativeCleanupDiagnostic.rollback_status, "NOT_REQUIRED");
assert.equal(negativeCleanupDiagnostic.session_close_performed, true);
const absentCleanupDiagnostic = successfulCleanupResult.failures.find((entry) =>
  entry.postgres_major === 16 && entry.fixture_case === "MIGRATION_HISTORY_ABSENT");
assert.ok(absentCleanupDiagnostic);
assert.equal(absentCleanupDiagnostic.completed_section_count, 10);
assert.equal(absentCleanupDiagnostic.transaction_started, true);
assert.equal(absentCleanupDiagnostic.rollback_status, "SUCCEEDED");
assert.equal(absentCleanupDiagnostic.session_close_performed, true);
const presentCleanupDiagnostic = successfulCleanupResult.failures.find((entry) =>
  entry.postgres_major === 16 && entry.fixture_case === "MIGRATION_HISTORY_PRESENT");
assert.equal(presentCleanupDiagnostic?.completed_section_count, 11);

const rollbackFailure = new FakePlatform();
rollbackFailure.rollbackPass = false;
const rollbackResult = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
  git_commit: "b".repeat(40),
  executor_source_sha256: TEST_SOURCE_DIGEST,
  allow_image_pull: false,
  platform: rollbackFailure,
  random_bytes: fixedRandom,
});
assert.equal(rollbackResult.failures.filter((entry) => entry.postgres_major >= 16)
  .every((entry) => entry.failure_code === "ROLLBACK_FAILED"), true);
assert.equal(rollbackFailure.cleanupCount, 6);

type RecordedDockerCall = Readonly<{
  args: readonly string[];
  environment: Readonly<Record<string, string>>;
}>;
class RecordingDockerRunner implements FarmOsProductionIdentityDockerCommandRunner {
  readonly calls: RecordedDockerCall[] = [];
  constructor(private readonly results: Array<Readonly<{
    exit_code: number;
    stdout: string;
    failure_kind?: "NONE" | "NOT_FOUND" | "FAILED";
  }>>) {}
  async run(args: readonly string[], environment: Readonly<Record<string, string>>): Promise<Readonly<{
    exit_code: number;
    stdout: string;
    failure_kind: "NONE" | "NOT_FOUND" | "FAILED";
  }>> {
    this.calls.push({ args: [...args], environment: { ...environment } });
    const result = this.results.shift();
    if (result === undefined) throw new Error("missing_fake_result");
    return {
      ...result,
      failure_kind: result.failure_kind ??
        (result.exit_code === 0 ? "NONE" : "NOT_FOUND"),
    };
  }
}

const dockerImageId = `sha256:${"1".repeat(64)}` as const;
const dockerContainerId = "2".repeat(64);
const dockerInspect = JSON.stringify([{
  Id: dockerContainerId,
  Name: "/farmos-prod-identity-pg16-abababababababab",
  Image: dockerImageId,
  Config: { Labels: { "farmos.production-identity-qualification": "16-abababababababab" } },
  NetworkSettings: { Ports: { "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "25432" }] } },
}]);
const dockerRunner = new RecordingDockerRunner([
  { exit_code: 0, stdout: JSON.stringify([{
    Id: dockerImageId, RepoDigests: [`postgres@sha256:${"3".repeat(64)}`],
  }]) },
  { exit_code: 0, stdout: `${dockerContainerId}\n` },
  { exit_code: 0, stdout: dockerInspect },
  { exit_code: 0, stdout: dockerInspect },
  { exit_code: 0, stdout: dockerInspect },
  { exit_code: 0, stdout: `${dockerContainerId}\n` },
  { exit_code: 1, stdout: "" },
]);
const dockerPlatform = new FarmOsProductionIdentityIsolatedPostgresPlatform(dockerRunner);
const inspectedImage = await dockerPlatform.inspectImage(16);
assert.ok(inspectedImage);
const dockerCredential = createFarmOsProductionIdentityFixtureCredential(fixedRandom);
const owned = await dockerPlatform.startContainer({
  major: 16,
  image: inspectedImage,
  nonce: "abababababababab",
  credential: dockerCredential,
});
assert.equal(await dockerPlatform.verifyContainerOwnership(owned), true);
assert.equal(await dockerPlatform.cleanupExactOwnedContainer(owned), true);
assert.deepEqual(dockerRunner.calls.map((call) => call.args[2]),
  ["image", "run", "inspect", "inspect", "inspect", "rm", "inspect"]);
const rmCall = dockerRunner.calls.find((call) => call.args[2] === "rm");
assert.deepEqual(rmCall?.args, [
  "--host", "unix:///var/run/docker.sock", "rm", "--force", dockerContainerId,
]);
assert.equal(dockerRunner.calls.every((call) =>
  call.args[0] === "--host" && call.args[1] === "unix:///var/run/docker.sock"), true);
assert.equal(dockerRunner.calls.filter((call) => call.args[2] === "inspect")
  .every((call) => call.args.includes("--format") &&
    call.args.some((argument) => argument.includes('"Config":{"Labels"')) &&
    call.args.every((argument) => !argument.includes(".Config.Env"))), true);
assert.equal(dockerRunner.calls.some((call) => call.args.includes("latest")), false);
assert.equal(dockerRunner.calls.some((call) => call.args.includes("system") ||
  call.args.includes("prune") || call.args.includes("volume")), false);
const runCall = dockerRunner.calls.find((call) => call.args[2] === "run");
assert.deepEqual(Object.keys(runCall?.environment ?? {}).sort(),
  ["POSTGRES_DB", "POSTGRES_PASSWORD"]);
assert.equal(runCall?.args.some((argument) => argument.includes(dockerCredential.password)), false);

await assert.rejects(
  new FarmOsProductionIdentityExactDockerCommandRunner().run(
    ["--host", "tcp://production.invalid:2375", "system", "prune"], {}),
  (error: unknown) => error instanceof FarmOsProductionIdentityPostgresQualificationError &&
    error.code === "DOCKER_UNAVAILABLE",
);

const malformedStartRunner = new RecordingDockerRunner([
  { exit_code: 0, stdout: "malformed-id\n" },
  { exit_code: 0, stdout: dockerInspect },
  { exit_code: 0, stdout: `${dockerContainerId}\n` },
  { exit_code: 1, stdout: "", failure_kind: "NOT_FOUND" },
]);
const malformedStartPlatform = new FarmOsProductionIdentityIsolatedPostgresPlatform(
  malformedStartRunner);
await assert.rejects(malformedStartPlatform.startContainer({
  major: 16,
  image: inspectedImage,
  nonce: "abababababababab",
  credential: dockerCredential,
}), (error: unknown) => error instanceof FarmOsProductionIdentityPostgresQualificationError &&
  error.code === "CONTAINER_START_FAILED");
assert.deepEqual(malformedStartRunner.calls.map((call) => call.args[2]),
  ["run", "inspect", "rm", "inspect"]);

const inspectFailureRunner = new RecordingDockerRunner([
  { exit_code: 0, stdout: `${dockerContainerId}\n` },
  { exit_code: 1, stdout: "", failure_kind: "FAILED" },
  { exit_code: 0, stdout: dockerInspect },
  { exit_code: 0, stdout: `${dockerContainerId}\n` },
  { exit_code: 1, stdout: "", failure_kind: "NOT_FOUND" },
]);
await assert.rejects(new FarmOsProductionIdentityIsolatedPostgresPlatform(
  inspectFailureRunner).startContainer({
  major: 16,
  image: inspectedImage,
  nonce: "abababababababab",
  credential: dockerCredential,
}), (error: unknown) => error instanceof FarmOsProductionIdentityPostgresQualificationError &&
  error.code === "CONTAINER_OWNERSHIP_MISMATCH");
assert.deepEqual(inspectFailureRunner.calls.map((call) => call.args[2]),
  ["run", "inspect", "inspect", "rm", "inspect"]);

console.log(JSON.stringify({
  result: "pass",
  executor_authority:
    FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR.authority_id,
  fake_docker_calls: dockerRunner.calls.length,
  actual_docker_calls: 0,
  production_operations: 0,
}));
