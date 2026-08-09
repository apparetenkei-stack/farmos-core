import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { Client, type ClientConfig } from "pg";

import {
  FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL,
  FarmOsProductionIdentityPostgresQualificationError,
  buildFarmOsProductionIdentityRuntimeFixtureStatements,
  type FarmOsProductionIdentityFixtureCredential,
  type FarmOsProductionIdentityImageAuthority,
  type FarmOsProductionIdentityOwnedContainer,
  type FarmOsProductionIdentityPostgresQualificationPlatform,
  type FarmOsProductionIdentityQualificationSession,
} from "./farm_os_production_identity_postgres_qualification_executor";
import {
  FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL,
} from "./farm_os_production_identity_isolated_postgres_fixture";
import {
  loadFarmOsProductionIdentityQueryV2Artifact,
} from "../../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  loadFarmOsProductionPostgresBootstrapQueryArtifact,
} from "../../../src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority";
import type { FarmOsProductionIdentityPostgresMajor } from
  "./farm_os_production_identity_postgres_qualification_contract";

const execFileAsync = promisify(execFile);
const IMAGE_ID = /^sha256:[a-f0-9]{64}$/u;
const CONTAINER_ID = /^[a-f0-9]{64}$/u;
const SAFE_NAME = /^farmos-prod-identity-pg(?:14|15|16|17)-[a-f0-9]{16}$/u;
const SAFE_LABEL = /^farmos\.production-identity-qualification=(?:14|15|16|17)-[a-f0-9]{16}$/u;
const ALLOWED_IMAGE = /^postgres:(?:14|15|16|17)$/u;
const LOCAL_DOCKER_PREFIX = Object.freeze([
  "--host", "unix:///var/run/docker.sock",
] as const);
const SAFE_CONTAINER_INSPECT_FORMAT =
  '[{"Id":{{json .Id}},"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Labels":{{json .Config.Labels}}},"NetworkSettings":{"Ports":{{json .NetworkSettings.Ports}}}}]' as const;
const DOCKER_ENV = Object.freeze({
  PATH: "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
});

type DockerResult = Readonly<{
  exit_code: number;
  stdout: string;
  failure_kind: "NONE" | "NOT_FOUND" | "FAILED";
}>;

export interface FarmOsProductionIdentityDockerCommandRunner {
  run(
    args: readonly string[],
    commandEnvironment: Readonly<Record<string, string>>,
  ): Promise<DockerResult>;
}

function redact(value: string, secrets: readonly string[]): string {
  return secrets.reduce((current, secret) =>
    secret.length === 0 ? current : current.split(secret).join("[REDACTED]"), value);
}

export class FarmOsProductionIdentityExactDockerCommandRunner
implements FarmOsProductionIdentityDockerCommandRunner {
  async run(
    args: readonly string[],
    commandEnvironment: Readonly<Record<string, string>>,
  ): Promise<DockerResult> {
    if (!validateDockerInvocation(args, commandEnvironment)) {
      throw new FarmOsProductionIdentityPostgresQualificationError("DOCKER_UNAVAILABLE");
    }
    const secretValues = Object.values(commandEnvironment);
    try {
      const result = await execFileAsync("docker", [...args], {
        env: { ...DOCKER_ENV, ...commandEnvironment },
        timeout: 30_000,
        maxBuffer: 1_048_576,
        encoding: "utf8",
        windowsHide: true,
      });
      const stdout = redact(String(result.stdout), secretValues);
      if (stdout.includes("[REDACTED]")) {
        throw new FarmOsProductionIdentityPostgresQualificationError("EVIDENCE_INVALID");
      }
      return Object.freeze({ exit_code: 0, stdout, failure_kind: "NONE" });
    } catch (error) {
      if (error instanceof FarmOsProductionIdentityPostgresQualificationError) throw error;
      const candidate = error as Readonly<{
        code?: unknown;
        stdout?: unknown;
        stderr?: unknown;
      }>;
      const exitCode = typeof candidate.code === "number" ? candidate.code : 127;
      const stdout = redact(typeof candidate.stdout === "string" ? candidate.stdout : "", secretValues);
      const stderr = redact(typeof candidate.stderr === "string" ? candidate.stderr : "", secretValues);
      const failureKind = /(?:No such image|No such object|No such container)/iu.test(stderr)
        ? "NOT_FOUND" as const : "FAILED" as const;
      return Object.freeze({ exit_code: exitCode, stdout, failure_kind: failureKind });
    }
  }
}

function validateDockerInvocation(
  args: readonly string[],
  commandEnvironment: Readonly<Record<string, string>>,
): boolean {
  if (args.some((argument) => argument.includes("\0")) ||
    args[0] !== LOCAL_DOCKER_PREFIX[0] || args[1] !== LOCAL_DOCKER_PREFIX[1]) return false;
  const operation = args.slice(2);
  const environmentKeys = Object.keys(commandEnvironment).sort();
  if (operation[0] === "image" && operation[1] === "inspect" &&
    operation.length === 3 && ALLOWED_IMAGE.test(operation[2] ?? "")) {
    return environmentKeys.length === 0;
  }
  if (operation[0] === "pull" && operation.length === 2 &&
    ALLOWED_IMAGE.test(operation[1] ?? "")) return environmentKeys.length === 0;
  if (operation[0] === "inspect" && operation[1] === "--type" &&
    operation[2] === "container" && operation[3] === "--format" &&
    operation[4] === SAFE_CONTAINER_INSPECT_FORMAT && operation.length === 6 &&
    (CONTAINER_ID.test(operation[5] ?? "") || SAFE_NAME.test(operation[5] ?? ""))) {
    return environmentKeys.length === 0;
  }
  if (operation[0] === "rm" && operation[1] === "--force" &&
    operation.length === 3 && CONTAINER_ID.test(operation[2] ?? "")) {
    return environmentKeys.length === 0;
  }
  if (operation.length !== 17 || operation[0] !== "run" ||
    JSON.stringify(operation.slice(1, 4)) !==
      JSON.stringify(["--detach", "--pull=never", "--restart=no"]) ||
    operation[4] !== "--name" || !SAFE_NAME.test(operation[5] ?? "") ||
    operation[6] !== "--label" || !SAFE_LABEL.test(operation[7] ?? "") ||
    operation[8] !== "--publish" || operation[9] !== "127.0.0.1::5432" ||
    operation[10] !== "--tmpfs" ||
    operation[11] !== "/var/lib/postgresql/data:rw,noexec,nosuid,size=512m" ||
    operation[12] !== "--env" || operation[13] !== "POSTGRES_PASSWORD" ||
    operation[14] !== "--env" || operation[15] !== "POSTGRES_DB" ||
    !ALLOWED_IMAGE.test(operation[16] ?? "")) return false;
  return JSON.stringify(environmentKeys) ===
      JSON.stringify(["POSTGRES_DB", "POSTGRES_PASSWORD"]) &&
    /^fq_[a-f0-9]{64}$/u.test(commandEnvironment.POSTGRES_PASSWORD ?? "") &&
    commandEnvironment.POSTGRES_DB === "farmos_identity_qualification";
}

type DockerImageInspect = Readonly<{
  Id?: unknown;
  RepoDigests?: unknown;
}>;

type DockerContainerInspect = Readonly<{
  Id?: unknown;
  Name?: unknown;
  Image?: unknown;
  Config?: Readonly<{ Labels?: unknown }>;
  NetworkSettings?: Readonly<{ Ports?: unknown }>;
}>;

function parseJsonArray(value: string): readonly unknown[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseImage(
  major: FarmOsProductionIdentityPostgresMajor,
  stdout: string,
): FarmOsProductionIdentityImageAuthority | null {
  const array = parseJsonArray(stdout);
  if (array?.length !== 1 || typeof array[0] !== "object" || array[0] === null) return null;
  const image = array[0] as DockerImageInspect;
  if (typeof image.Id !== "string" || !IMAGE_ID.test(image.Id) ||
    !Array.isArray(image.RepoDigests)) return null;
  const digestPrefix = "postgres@";
  const digest = image.RepoDigests.find((value) =>
    typeof value === "string" && value.startsWith(digestPrefix) &&
    IMAGE_ID.test(value.slice(digestPrefix.length)));
  if (typeof digest !== "string") return null;
  return Object.freeze({
    tag: `postgres:${major}`,
    image_id: image.Id as `sha256:${string}`,
    repo_digest: digest.slice(digestPrefix.length) as `sha256:${string}`,
  });
}

function containerInspect(
  stdout: string,
): DockerContainerInspect | null {
  const array = parseJsonArray(stdout);
  return array?.length === 1 && typeof array[0] === "object" && array[0] !== null
    ? array[0] as DockerContainerInspect
    : null;
}

function parsePort(inspect: DockerContainerInspect): number | null {
  const ports = inspect.NetworkSettings?.Ports;
  if (typeof ports !== "object" || ports === null || Array.isArray(ports)) return null;
  const binding = (ports as Record<string, unknown>)["5432/tcp"];
  if (!Array.isArray(binding) || binding.length !== 1 ||
    typeof binding[0] !== "object" || binding[0] === null) return null;
  const record = binding[0] as Record<string, unknown>;
  const port = Number(record.HostPort);
  return record.HostIp === "127.0.0.1" && Number.isSafeInteger(port) && port > 0 && port <= 65_535
    ? port : null;
}

function bindingMatches(
  inspect: DockerContainerInspect,
  container: FarmOsProductionIdentityOwnedContainer,
): boolean {
  const labels = inspect.Config?.Labels;
  const labelRecord = typeof labels === "object" && labels !== null && !Array.isArray(labels)
    ? labels as Record<string, unknown> : null;
  const labelValue = labelRecord?.["farmos.production-identity-qualification"];
  const expectedLabelValue = container.ownership_label.slice(
    container.ownership_label.indexOf("=") + 1);
  return inspect.Id === container.container_id && inspect.Name === `/${container.container_name}` &&
    inspect.Image === container.expected_image_id && labelValue === expectedLabelValue &&
    parsePort(inspect) === container.port;
}

function identityMatches(
  inspect: DockerContainerInspect,
  input: Readonly<{
    container_id: string;
    container_name: string;
    ownership_label: string;
    expected_image_id: `sha256:${string}`;
  }>,
): boolean {
  const labels = inspect.Config?.Labels;
  const labelRecord = typeof labels === "object" && labels !== null && !Array.isArray(labels)
    ? labels as Record<string, unknown> : null;
  return inspect.Id === input.container_id && inspect.Name === `/${input.container_name}` &&
    inspect.Image === input.expected_image_id &&
    labelRecord?.["farmos.production-identity-qualification"] ===
      input.ownership_label.slice(input.ownership_label.indexOf("=") + 1);
}

function clientConfig(
  container: FarmOsProductionIdentityOwnedContainer,
  credential: FarmOsProductionIdentityFixtureCredential,
  user: "postgres" | "farmos_identity_qualification",
): ClientConfig {
  return {
    host: "127.0.0.1",
    port: container.port,
    database: credential.database,
    user,
    password: credential.password,
    ssl: false,
    connectionTimeoutMillis: 2_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    application_name: "farmos-isolated-postgres-qualification",
  };
}

class PgQualificationSession implements FarmOsProductionIdentityQualificationSession {
  private readonly allowedSql: ReadonlySet<string>;

  constructor(private readonly client: Client) {
    const bootstrap = loadFarmOsProductionPostgresBootstrapQueryArtifact();
    const v2 = loadFarmOsProductionIdentityQueryV2Artifact();
    if (bootstrap.status !== "VERIFIED" || v2.status !== "VERIFIED") {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "QUERY_ARTIFACT_DRIFT");
    }
    this.allowedSql = new Set([
      Buffer.from(bootstrap.raw_bytes).toString("utf8"),
      FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL,
      FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_PRINCIPAL_SQL,
      ...v2.section_plan.map((entry) => entry.statement_sql),
    ]);
  }

  async beginRepeatableReadOnly(): Promise<void> {
    await this.client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  }

  async setLocalTimeouts(): Promise<void> {
    await this.client.query("SET LOCAL statement_timeout = '15s'");
    await this.client.query("SET LOCAL lock_timeout = '2s'");
    await this.client.query("SET LOCAL idle_in_transaction_session_timeout = '20s'");
    const result = await this.client.query(
      "SELECT current_setting('transaction_read_only')::text AS transaction_read_only");
    if (result.rows.length !== 1 || result.rows[0]?.transaction_read_only !== "on") {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "TRANSACTION_READ_ONLY_FAILED");
    }
  }

  async query(statementSql: string): Promise<readonly Record<string, unknown>[]> {
    if (!this.allowedSql.has(statementSql)) {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "SECTION_EXECUTION_FAILED");
    }
    const result = await this.client.query(statementSql);
    return Object.freeze(result.rows.map((row) => Object.freeze({ ...row })));
  }

  async rollback(): Promise<void> {
    await this.client.query("ROLLBACK");
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}

export class FarmOsProductionIdentityIsolatedPostgresPlatform
implements FarmOsProductionIdentityPostgresQualificationPlatform {
  constructor(
    private readonly docker: FarmOsProductionIdentityDockerCommandRunner =
      new FarmOsProductionIdentityExactDockerCommandRunner(),
  ) {}

  private async runDocker(
    args: readonly string[],
    commandEnvironment: Readonly<Record<string, string>> = {},
  ): Promise<DockerResult> {
    return await this.docker.run(
      [...LOCAL_DOCKER_PREFIX, ...args], commandEnvironment);
  }

  private inspectContainerArgs(target: string): readonly string[] {
    return Object.freeze([
      "inspect", "--type", "container", "--format",
      SAFE_CONTAINER_INSPECT_FORMAT, target,
    ]);
  }

  private async recoverOrProveAbsent(input: Readonly<{
    container_name: string;
    ownership_label: string;
    expected_image_id: `sha256:${string}`;
  }>): Promise<boolean> {
    const resolved = await this.runDocker(
      this.inspectContainerArgs(input.container_name));
    if (resolved.failure_kind === "NOT_FOUND") return true;
    const inspect = resolved.exit_code === 0 ? containerInspect(resolved.stdout) : null;
    const containerId = typeof inspect?.Id === "string" ? inspect.Id : "";
    if (inspect === null || !CONTAINER_ID.test(containerId) ||
      !identityMatches(inspect, { ...input, container_id: containerId })) return false;
    const removed = await this.runDocker(["rm", "--force", containerId]);
    if (removed.exit_code !== 0 || removed.stdout.trim() !== containerId) return false;
    const absent = await this.runDocker(
      this.inspectContainerArgs(containerId));
    return absent.failure_kind === "NOT_FOUND";
  }

  async inspectImage(
    major: FarmOsProductionIdentityPostgresMajor,
  ): Promise<FarmOsProductionIdentityImageAuthority | null> {
    const result = await this.runDocker(
      ["image", "inspect", `postgres:${major}`]);
    if (result.failure_kind === "NOT_FOUND") return null;
    if (result.exit_code !== 0) {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "DOCKER_UNAVAILABLE");
    }
    return parseImage(major, result.stdout);
  }

  async pullImage(
    major: FarmOsProductionIdentityPostgresMajor,
  ): Promise<FarmOsProductionIdentityImageAuthority | null> {
    const pull = await this.runDocker(["pull", `postgres:${major}`]);
    if (pull.exit_code !== 0) return null;
    return await this.inspectImage(major);
  }

  async startContainer(input: Readonly<{
    major: FarmOsProductionIdentityPostgresMajor;
    image: FarmOsProductionIdentityImageAuthority;
    nonce: string;
    credential: FarmOsProductionIdentityFixtureCredential;
  }>): Promise<FarmOsProductionIdentityOwnedContainer> {
    const containerName = `farmos-prod-identity-pg${input.major}-${input.nonce}`;
    const ownershipLabel =
      `farmos.production-identity-qualification=${input.major}-${input.nonce}`;
    if (!SAFE_NAME.test(containerName) || !SAFE_LABEL.test(ownershipLabel)) {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "CONTAINER_START_FAILED");
    }
    const run = await this.runDocker([
      "run", "--detach", "--pull=never", "--restart=no",
      "--name", containerName,
      "--label", ownershipLabel,
      "--publish", "127.0.0.1::5432",
      "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=512m",
      "--env", "POSTGRES_PASSWORD",
      "--env", "POSTGRES_DB",
      input.image.tag,
    ], {
      POSTGRES_PASSWORD: input.credential.password,
      POSTGRES_DB: input.credential.database,
    });
    const containerId = run.stdout.trim();
    if (run.exit_code !== 0 || !CONTAINER_ID.test(containerId)) {
      if (!await this.recoverOrProveAbsent({
        container_name: containerName,
        ownership_label: ownershipLabel,
        expected_image_id: input.image.image_id,
      })) {
        throw new FarmOsProductionIdentityPostgresQualificationError(
          "CLEANUP_FAILED");
      }
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "CONTAINER_START_FAILED");
    }
    const inspectResult = await this.runDocker(
      this.inspectContainerArgs(containerId));
    const inspect = inspectResult.exit_code === 0
      ? containerInspect(inspectResult.stdout) : null;
    const port = inspect === null ? null : parsePort(inspect);
    if (inspect === null || port === null || !identityMatches(inspect, {
      container_id: containerId,
      container_name: containerName,
      ownership_label: ownershipLabel,
      expected_image_id: input.image.image_id,
    })) {
      if (!await this.recoverOrProveAbsent({
        container_name: containerName,
        ownership_label: ownershipLabel,
        expected_image_id: input.image.image_id,
      })) throw new FarmOsProductionIdentityPostgresQualificationError(
        "CLEANUP_FAILED");
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "CONTAINER_OWNERSHIP_MISMATCH");
    }
    const container = Object.freeze({
      container_name: containerName,
      ownership_label: ownershipLabel,
      container_id: containerId,
      expected_image_id: input.image.image_id,
      host: "127.0.0.1" as const,
      port,
    });
    if (!bindingMatches(inspect, container)) {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "CONTAINER_OWNERSHIP_MISMATCH");
    }
    return container;
  }

  async verifyContainerOwnership(
    container: FarmOsProductionIdentityOwnedContainer,
  ): Promise<boolean> {
    const inspectResult = await this.runDocker(
      this.inspectContainerArgs(container.container_id));
    const inspect = inspectResult.exit_code === 0
      ? containerInspect(inspectResult.stdout) : null;
    return inspect !== null && bindingMatches(inspect, container);
  }

  async waitUntilReady(input: Readonly<{
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    maximum_attempts: 30;
    interval_ms: 250;
  }>): Promise<boolean> {
    for (let attempt = 1; attempt <= input.maximum_attempts; attempt += 1) {
      const client = new Client(clientConfig(
        input.container, input.credential, input.credential.admin_user));
      try {
        await client.connect();
        const result = await client.query("SELECT 1 AS ready");
        await client.end();
        if (result.rows.length === 1 && result.rows[0]?.ready === 1) return true;
      } catch {
        try {
          await client.end();
        } catch {
          // The readiness connection may not have opened.
        }
      }
      if (attempt < input.maximum_attempts) {
        await new Promise<void>((resolve) => setTimeout(resolve, input.interval_ms));
      }
    }
    return false;
  }

  async setupFixture(input: Readonly<{
    major: FarmOsProductionIdentityPostgresMajor;
    fixture_case: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT";
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
    statements: readonly string[];
  }>): Promise<void> {
    const expectedStatements = buildFarmOsProductionIdentityRuntimeFixtureStatements(
      input.major, input.fixture_case, input.credential);
    if (input.statements.length !== expectedStatements.length ||
      !input.statements.every((statement, index) =>
        statement === expectedStatements[index])) {
      throw new FarmOsProductionIdentityPostgresQualificationError(
        "FIXTURE_SETUP_FAILED");
    }
    const client = new Client(clientConfig(
      input.container, input.credential, input.credential.admin_user));
    try {
      await client.connect();
      for (const statement of input.statements) await client.query(statement);
    } finally {
      await client.end();
    }
  }

  async openQualificationSession(input: Readonly<{
    container: FarmOsProductionIdentityOwnedContainer;
    credential: FarmOsProductionIdentityFixtureCredential;
  }>): Promise<FarmOsProductionIdentityQualificationSession> {
    const client = new Client(clientConfig(
      input.container, input.credential, input.credential.qualification_user));
    const session = new PgQualificationSession(client);
    try {
      await client.connect();
      return session;
    } catch (error) {
      try {
        await client.end();
      } catch {
        // The isolated qualification connection may not have opened.
      }
      throw error;
    }
  }

  async cleanupExactOwnedContainer(
    container: FarmOsProductionIdentityOwnedContainer,
  ): Promise<boolean> {
    if (!CONTAINER_ID.test(container.container_id) ||
      !SAFE_NAME.test(container.container_name) ||
      !SAFE_LABEL.test(container.ownership_label) ||
      !IMAGE_ID.test(container.expected_image_id)) return false;
    if (!await this.verifyContainerOwnership(container)) return false;
    const removed = await this.runDocker(
      ["rm", "--force", container.container_id]);
    if (removed.exit_code !== 0 || removed.stdout.trim() !== container.container_id) return false;
    const absent = await this.runDocker(
      this.inspectContainerArgs(container.container_id));
    return absent.failure_kind === "NOT_FOUND";
  }
}

export const FARM_OS_PRODUCTION_IDENTITY_DOCKER_OPERATION_ALLOWLIST =
  Object.freeze([
    "image inspect postgres:<fixed-major>",
    "pull postgres:<fixed-major>",
    "run fixed-isolated-container",
    "inspect exact-container-id",
    "rm --force exact-owned-container-id",
  ] as const);
