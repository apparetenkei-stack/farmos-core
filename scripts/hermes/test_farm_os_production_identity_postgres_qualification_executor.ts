import assert from "node:assert/strict";

import {
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_ERRORS,
  FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL,
  FarmOsProductionIdentityPostgresQualificationError,
  createFarmOsProductionIdentityFixtureCredential,
  evaluateFarmOsProductionIdentityExecutorQualificationClosure,
  executeFarmOsProductionIdentityPostgresQualificationMatrix,
  serializeFarmOsProductionIdentityQualificationStdout,
  type FarmOsProductionIdentityFixtureCredential,
  type FarmOsProductionIdentityImageAuthority,
  type FarmOsProductionIdentityOwnedContainer,
  type FarmOsProductionIdentityPostgresQualificationPlatform,
  type FarmOsProductionIdentityQualificationSession,
} from "./lib/farm_os_production_identity_postgres_qualification_executor";
import {
  FarmOsProductionIdentityExactDockerCommandRunner,
  FarmOsProductionIdentityIsolatedPostgresPlatform,
  type FarmOsProductionIdentityDockerCommandRunner,
} from "./lib/farm_os_production_identity_postgres_qualification_docker_adapter";
import type {
  FarmOsProductionIdentityPostgresMajor,
} from "./lib/farm_os_production_identity_postgres_qualification_contract";
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
} from "./run_farm_os_production_identity_postgres_qualification";

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_ISOLATED_QUALIFICATION_EXECUTOR, {
  authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v1",
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

const fixedRandom = (size: number): Buffer => Buffer.alloc(size, 0xab);
const TEST_SOURCE_DIGEST = `sha256:${"9".repeat(64)}` as const;
const credential = createFarmOsProductionIdentityFixtureCredential(fixedRandom);
assert.equal(credential.password, `fq_${"ab".repeat(32)}`);
assert.doesNotMatch(JSON.stringify({ ...credential, password: "[omitted]" }), /SYNTHETIC_FIXTURE_PASSWORD/u);

const artifact = loadFarmOsProductionIdentityQueryV2Artifact();
assert.equal(artifact.status, "VERIFIED");
if (artifact.status !== "VERIFIED") throw new Error("artifact_not_verified");
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
    const section = sectionBySql.get(sql);
    if (section === undefined) throw new Error("unexpected_sql");
    this.trace.sectionCalls.push(section);
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
  imagesPresent = true;
  positiveSuccess = false;
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
    const session = new FakeSession(trace, positiveFixture);
    if (!this.rollbackPass) {
      session.rollback = async () => {
        trace.rollback += 1;
        throw new Error("synthetic_rollback_failure");
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
assert.equal(matrix.failures.every((entry) => entry.error_code === "PARSER_FAILED"), true);
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
    "farmos.production-identity-postgres-isolated-qualification-executor.v1",
  executor_source_sha256: TEST_SOURCE_DIGEST,
  evidence_count: 6,
  production_operations: 0,
});
assert.equal(evaluateFarmOsProductionIdentityExecutorQualificationClosure({
  ...positiveMatrix,
  lineage: { ...positiveMatrix.lineage, executor_source_sha256: `sha256:${"8".repeat(64)}` },
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
assert.equal(missingResult.failures.every((entry) => entry.error_code === "IMAGE_MISSING"), true);
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
assert.equal(cleanupResult.failures.every((entry) => entry.error_code === "CLEANUP_FAILED"), true);

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
  .every((entry) => entry.error_code === "ROLLBACK_FAILED"), true);
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
