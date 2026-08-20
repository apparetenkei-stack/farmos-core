import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS,
  compileFarmOsDay150QualificationCatalogMetrics,
  compileFarmOsDay150QualificationCatalogRepresentation,
  createFarmOsDay150QualificationOnlyReferenceCapability,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
  createFarmOsDay150DualPrincipalSemanticFingerprint,
  validateFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
  type FarmOsDay150SemanticAclEvidence,
} from "../../src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority";
import {
  parseFarmOsDay150PostgresMutationSettlement,
  renderFarmOsDay150PrefixReferencePostgresProcessProgram,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_primitive_port";
import { loadFarmOsProductionIdentityQueryV5Artifact } from
  "../../src/lib/hermes/farm_os_production_identity_query_v5_authority";

export const FARM_OS_DAY150_SOURCE_QUALIFICATION_IMAGE =
  "docker.io/library/postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317";
export const FARM_OS_DAY150_SOURCE_QUALIFICATION_CONTAINER =
  "farmos-day150-prefix-qualification-pg17-v12";
export const FARM_OS_DAY150_SOURCE_QUALIFICATION_NETWORK =
  "farmos-day150-prefix-qualification-network-v12";
export const FARM_OS_DAY150_SOURCE_QUALIFICATION_VOLUME =
  "farmos-day150-prefix-qualification-volume-v12";
const IMAGE = FARM_OS_DAY150_SOURCE_QUALIFICATION_IMAGE;
const CONTAINER = FARM_OS_DAY150_SOURCE_QUALIFICATION_CONTAINER;
const NETWORK = FARM_OS_DAY150_SOURCE_QUALIFICATION_NETWORK;
const VOLUME = FARM_OS_DAY150_SOURCE_QUALIFICATION_VOLUME;
const DATABASE = "farmos_day150_prefix_qualification_v12";
const WORKER = renderFarmOsDay150PrefixReferencePostgresProcessProgram(
  "farmos-day150-prefix-load-bearing-qualification-v12");

type ProcessResult = Readonly<{ code: number; stdout: string; stderr: string }>;
type WorkerResult = Readonly<{ code: number; stdout: string; stderr: string;
  value: Record<string, unknown> | null }>;

function run(executable: string, argv: readonly string[], environment = process.env,
  input?: string): ProcessResult {
  const result = spawnSync(executable, [...argv], { encoding: "utf8", env: environment,
    input, timeout: 60_000, maxBuffer: 16 * 1024 * 1024 });
  return Object.freeze({ code: result.status ?? 255, stdout: result.stdout ?? "",
    stderr: result.stderr ?? "" });
}

function docker(argv: readonly string[], environment = process.env): ProcessResult {
  return run("docker", argv, environment);
}

function requireSuccess(result: ProcessResult, code: string): string {
  if (result.code !== 0) throw new Error(code);
  return result.stdout.trim();
}

function exactAbsent(kind: "container" | "network" | "volume", name: string): boolean {
  const result = docker([kind, "inspect", name]);
  const expected = kind === "container" ? `Error response from daemon: No such container: ${name}` :
    kind === "network" ? `Error response from daemon: network ${name} not found` :
      `Error response from daemon: get ${name}: no such volume`;
  return result.code === 1 && ["", "[]"].includes(result.stdout.trim()) &&
    result.stderr.trim() === expected;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function qualificationAclEvidence(
  aclRows: readonly Record<string, unknown>[],
  snapshot: NonNullable<ReturnType<
    typeof compileFarmOsDay150QualificationCatalogRepresentation>>["snapshot"]["catalog_snapshot"],
): readonly FarmOsDay150SemanticAclEvidence[] | null {
  const identities = new Set(snapshot.objects.filter((object) =>
    ["schema_acl", "table_acl", "function_acl"].includes(object.kind))
    .map((object) => object.identity));
  const entries: FarmOsDay150SemanticAclEvidence[] = [];
  for (const row of aclRows) {
    if (row.row_key === "__collection_status__" || typeof row.payload !== "object" ||
      row.payload === null || Array.isArray(row.payload)) continue;
    const payload = row.payload as Record<string, unknown>;
    const kind = String(payload.row_kind);
    const objectIdentity = String(payload.object_identity);
    if (!["schema_acl", "relation_acl", "function_acl"].includes(kind) ||
      !identities.has(objectIdentity)) continue;
    if (typeof payload.principal !== "string" || typeof payload.privilege !== "string" ||
      typeof payload.grantor !== "string" || typeof payload.grant_option !== "boolean") return null;
    entries.push({ object_identity: objectIdentity, principal: payload.principal,
      privilege: payload.privilege, grant_option: payload.grant_option,
      grantor: payload.grantor });
  }
  entries.sort((left, right) => Buffer.compare(Buffer.from(JSON.stringify(left)),
    Buffer.from(JSON.stringify(right))));
  const expectedCount = snapshot.objects.filter((object) =>
    ["schema_acl", "table_acl", "function_acl"].includes(object.kind))
    .reduce((count, object) => count + object.acl.length, 0);
  return entries.length === expectedCount ? Object.freeze(entries) : null;
}

function worker(input: Readonly<{ port: number; user: string; password: string;
  statements: readonly string[];
  mode: "READ_ONLY_OR_NONTRANSACTIONAL" | "TRANSACTIONAL_MUTATION";
}>): WorkerResult {
  const result = run(process.execPath, ["--input-type=module", "--eval", WORKER], {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    NODE_ENV: "test", PGHOST: "127.0.0.1", PGPORT: String(input.port),
    PGDATABASE: DATABASE, PGUSER: input.user, PGPASSWORD: input.password,
  }, JSON.stringify({ statements: input.statements, mode: input.mode }));
  let value: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(result.stdout);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      value = parsed as Record<string, unknown>;
    }
  } catch { /* represented as an unknown settlement by the caller */ }
  return Object.freeze({ code: result.code, stdout: result.stdout, stderr: result.stderr, value });
}

function mutation(input: Parameters<typeof worker>[0]): "MUTATION_COMMITTED" |
  "MUTATION_REJECTED_NOT_COMMITTED" | "MUTATION_OUTCOME_UNKNOWN" {
  const result = worker({ ...input, mode: "TRANSACTIONAL_MUTATION" });
  return parseFarmOsDay150PostgresMutationSettlement({
    exit_code: result.code, stdout: result.stdout }).outcome;
}

function rows(input: Parameters<typeof worker>[0]): readonly Record<string, unknown>[][] {
  const result = worker({ ...input, mode: "READ_ONLY_OR_NONTRANSACTIONAL" });
  if (result.code !== 0 || !result.value || !Array.isArray(result.value.rows)) {
    throw new Error("DAY150_QUALIFICATION_READBACK_FAILED");
  }
  return result.value.rows as readonly Record<string, unknown>[][];
}

function waitForPostgres(port: number, password: string): void {
  let last = "NO_OBSERVATION";
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const result = worker({ port, user: "postgres", password,
      statements: ["SELECT 1 AS ready"], mode: "READ_ONLY_OR_NONTRANSACTIONAL" });
    if (result.code === 0 && Array.isArray(result.value?.rows) &&
      (result.value.rows as readonly Record<string, unknown>[][])[0]?.[0]?.ready === 1) return;
    last = `${result.code}:${String(result.value?.error_code ?? "NO_ERROR_CODE")}:` +
      result.stderr.trim().slice(0, 120);
    if (attempt < 120) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  throw new Error(`DAY150_QUALIFICATION_POSTGRES_READINESS_FAILED:${last}`);
}

function cleanup(): void {
  const container = docker(["container", "inspect", CONTAINER]);
  if (container.code === 0) requireSuccess(docker(["rm", "--force", CONTAINER]),
    "DAY150_QUALIFICATION_CONTAINER_CLEANUP_FAILED");
  const volume = docker(["volume", "inspect", VOLUME]);
  if (volume.code === 0) requireSuccess(docker(["volume", "rm", VOLUME]),
    "DAY150_QUALIFICATION_VOLUME_CLEANUP_FAILED");
  const network = docker(["network", "inspect", NETWORK]);
  if (network.code === 0) requireSuccess(docker(["network", "rm", NETWORK]),
    "DAY150_QUALIFICATION_NETWORK_CLEANUP_FAILED");
  if (!exactAbsent("container", CONTAINER) || !exactAbsent("volume", VOLUME) ||
    !exactAbsent("network", NETWORK)) throw new Error("DAY150_QUALIFICATION_ZERO_RESIDUAL_FAILED");
}

export function runFarmOsDay150PrefixLoadBearingQualification() {
  if (!exactAbsent("container", CONTAINER) || !exactAbsent("network", NETWORK) ||
    !exactAbsent("volume", VOLUME)) throw new Error("DAY150_QUALIFICATION_RESOURCE_PREEXISTS");
  const adminPassword = `d150q_${randomBytes(32).toString("hex")}`;
  const executorPassword = `d150qe_${randomBytes(32).toString("hex")}`;
  let cleanupRequired = false;
  try {
    requireSuccess(docker(["network", "create", NETWORK]),
      "DAY150_QUALIFICATION_NETWORK_CREATE_FAILED");
    cleanupRequired = true;
    requireSuccess(docker(["volume", "create", VOLUME]),
      "DAY150_QUALIFICATION_VOLUME_CREATE_FAILED");
    requireSuccess(docker(["run", "--detach", "--name", CONTAINER, "--network", NETWORK,
      "--mount", `source=${VOLUME},target=/var/lib/postgresql/data`,
      "--publish", "127.0.0.1::5432", "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_DB",
      "--restart", "no", "--platform", "linux/arm64/v8", IMAGE], {
      ...process.env, POSTGRES_PASSWORD: adminPassword, POSTGRES_DB: DATABASE,
    }), "DAY150_QUALIFICATION_CONTAINER_CREATE_FAILED");
    const portText = requireSuccess(docker(["inspect", "--format",
      "{{(index (index .NetworkSettings.Ports \"5432/tcp\") 0).HostPort}}", CONTAINER]),
    "DAY150_QUALIFICATION_PORT_READBACK_FAILED");
    const port = Number(portText);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(
      "DAY150_QUALIFICATION_PORT_INVALID");
    waitForPostgres(port, adminPassword);

    const bootstrap = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
    if (!validateFarmOsDay150ReferenceInitialCatalogV2Bootstrap(bootstrap)) throw new Error(
      "DAY150_QUALIFICATION_INITIAL_AUTHORITY_REJECTED");
    const principalSql = `BEGIN;\n${bootstrap.operations[1]!.sql}\n` +
      `CREATE ROLE ${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME} LOGIN CREATEROLE ` +
      `NOSUPERUSER NOCREATEDB NOREPLICATION NOBYPASSRLS PASSWORD ${sqlLiteral(executorPassword)};\n` +
      `GRANT ${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME} TO ` +
      `${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME} WITH INHERIT TRUE, SET TRUE;\n` +
      `REVOKE CONNECT, TEMPORARY ON DATABASE ${DATABASE} FROM PUBLIC;\n` +
      `GRANT CONNECT, CREATE ON DATABASE ${DATABASE} TO ` +
      `${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME};\nCOMMIT;`;
    if (mutation({ port, user: "postgres", password: adminPassword,
      statements: [principalSql], mode: "TRANSACTIONAL_MUTATION" }) !== "MUTATION_COMMITTED") {
      throw new Error("DAY150_QUALIFICATION_PRINCIPAL_SETTLEMENT_FAILED");
    }
    const bootstrapSql = bootstrap.operations.filter((operation) =>
      operation.sequence >= 3 && operation.sequence <= 8).map((operation) => operation.sql).join("\n");
    if (mutation({ port, user: "postgres", password: adminPassword,
      statements: [`BEGIN;\n${bootstrapSql}\nCOMMIT;`], mode: "TRANSACTIONAL_MUTATION" }) !==
      "MUTATION_COMMITTED") throw new Error("DAY150_QUALIFICATION_BOOTSTRAP_SETTLEMENT_FAILED");

    const beforeMutation = mutation({ port, user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
      password: executorPassword, statements: [
        "BEGIN; DO $q$ BEGIN RAISE EXCEPTION USING ERRCODE='23514', " +
        "MESSAGE='qualification_guard_failure'; END $q$; COMMIT;"],
      mode: "TRANSACTIONAL_MUTATION" });
    const afterDdl = mutation({ port, user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
      password: executorPassword, statements: [
        "BEGIN; CREATE TABLE ai.day150_settlement_rollback_probe(id integer); " +
        "DO $q$ BEGIN RAISE EXCEPTION USING ERRCODE='23514', " +
        "MESSAGE='qualification_after_ddl_failure'; END $q$; COMMIT;"],
      mode: "TRANSACTIONAL_MUTATION" });
    const rollbackRows = rows({ port, user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
      password: executorPassword,
      statements: ["SELECT to_regclass('ai.day150_settlement_rollback_probe') IS NULL AS absent"],
      mode: "READ_ONLY_OR_NONTRANSACTIONAL" });
    if (beforeMutation !== "MUTATION_REJECTED_NOT_COMMITTED" ||
      afterDdl !== "MUTATION_REJECTED_NOT_COMMITTED" || rollbackRows[0]?.[0]?.absent !== true) {
      throw new Error("DAY150_QUALIFICATION_DETERMINISTIC_REJECTION_FAILED");
    }

    const query = loadFarmOsProductionIdentityQueryV5Artifact();
    if (query.status !== "VERIFIED") throw new Error("DAY150_QUALIFICATION_QUERY_INVALID");
    const sections = ["F_ACL_PRINCIPAL_INVENTORY", "G_MIGRATION_CATALOG_INVENTORY"].map(
      (id) => query.section_plan.find((section) => section.section_id === id));
    if (sections.some((section) => !section)) throw new Error("DAY150_QUALIFICATION_QUERY_SECTION_MISSING");
    const metrics = [];
    for (const spec of FARM_OS_DAY150_PREFIX_REFERENCE_SPECS) {
      const sql = readFileSync(spec.apply_path, "utf8");
      const actual = `sha256:${createHash("sha256").update(sql).digest("hex")}`;
      if (actual !== spec.artifact_sha256) throw new Error("DAY150_QUALIFICATION_MIGRATION_SHA_MISMATCH");
      const migrationResult = worker({ port, user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
        password: executorPassword, statements: [sql], mode: "TRANSACTIONAL_MUTATION" });
      const outcome = parseFarmOsDay150PostgresMutationSettlement({
        exit_code: migrationResult.code, stdout: migrationResult.stdout }).outcome;
      if (outcome !== "MUTATION_COMMITTED") throw new Error(
        `DAY150_QUALIFICATION_MIGRATION_NOT_COMMITTED:${spec.migration_id}:${outcome}:` +
        `${migrationResult.code}:${String(migrationResult.value?.error_code ?? "NO_ERROR_CODE")}:` +
        migrationResult.stderr.trim().slice(0, 120));
      const resultSets = rows({ port, user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
        password: executorPassword,
        statements: ["BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
          sections[0]!.statement_sql, sections[1]!.statement_sql, "ROLLBACK"],
        mode: "READ_ONLY_OR_NONTRANSACTIONAL" });
      const capability = createFarmOsDay150QualificationOnlyReferenceCapability({
        acl_result_set: { section_id: sections[0]!.section_id, rows: resultSets[1] ?? [] },
        catalog_result_set: { section_id: sections[1]!.section_id, rows: resultSets[2] ?? [] },
      });
      const metric = capability ? compileFarmOsDay150QualificationCatalogMetrics({
        migration_id: spec.migration_id, qualification_capability: capability }) : null;
      const representation = capability ? compileFarmOsDay150QualificationCatalogRepresentation({
        migration_id: spec.migration_id, qualification_capability: capability }) : null;
      const aclEvidence = representation ? qualificationAclEvidence(
        resultSets[1] ?? [], representation.snapshot.catalog_snapshot) : null;
      const semanticFingerprint = representation && aclEvidence
        ? createFarmOsDay150DualPrincipalSemanticFingerprint({
          snapshot: representation.snapshot.catalog_snapshot,
          authenticated_raw_owner_principal: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
          authenticated_raw_executor_principal: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
          acl_evidence: aclEvidence,
          object_universe_revision: "farmos.day150-prefix-object-universe.v1",
          catalog_query_revision: "farmos.production-target-identity-query.v5",
        }) : null;
      if (!metric || !semanticFingerprint) throw new Error(
        `DAY150_QUALIFICATION_SNAPSHOT_REJECTED:${spec.migration_id}`);
      metrics.push(Object.freeze({ ...metric, catalog_fingerprint: semanticFingerprint }));
    }
    const history = rows({ port, user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
      password: executorPassword,
      statements: ["SELECT count(*)::int AS count FROM core_schema.migration_history"],
      mode: "READ_ONLY_OR_NONTRANSACTIONAL" });
    if (history[0]?.[0]?.count !== 0) throw new Error("DAY150_QUALIFICATION_HISTORY_ROWS_UNEXPECTED");
    return Object.freeze({
      status: "DAY150_PREFIX_LOAD_BEARING_QUALIFICATION_PASS" as const,
      initial_catalog_authority_id: bootstrap.authority_id,
      initial_catalog_digest: bootstrap.initial_catalog_digest,
      bootstrap_plan_digest: bootstrap.plan_digest,
      settlement_matrix: Object.freeze({ guard_failure: beforeMutation,
        transactional_ddl_failure: afterDdl, successful_commits: 5 as const,
        arbitrary_nonzero_without_protocol: "MUTATION_OUTCOME_UNKNOWN" as const }),
      migration_history: "SOURCE_DERIVED_REFERENCE_METADATA_DATABASE_ROWS_NOT_REQUIRED" as const,
      snapshots: Object.freeze(metrics),
      candidate_artifacts_written: 0 as const,
    });
  } finally {
    if (cleanupRequired) cleanup();
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify(runFarmOsDay150PrefixLoadBearingQualification())}\n`);
}
