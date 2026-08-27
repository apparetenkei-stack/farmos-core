import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { accessSync, constants as fsConstants, realpathSync } from "node:fs";
import { mkdtemp, rmdir, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
} from "../../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";
import {
  parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution,
} from "../../../src/lib/hermes/farm_os_day150_prefix_terminal_outcome_receipt";
import {
  FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
} from "../../../src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority";
import {
  loadFarmOsProductionIdentityQueryV5Artifact,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v5_authority";
import {
  transformFarmOsProductionIdentityCatalogReferenceResultSets,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  claimFarmOsDay150RealExecutionContext,
  evaluateFarmOsDay150PrefixReferenceDurableArtifacts,
  farmOsDay150AttemptRunNonceDigest,
  parseFarmOsDay150PrefixReferenceConsumptionMarker,
  parseFarmOsDay150PrefixReferenceAttemptClaim,
  parseFarmOsDay150ExpectedCatalogCandidate,
  parseFarmOsDay150PreCleanupRunEvidenceCandidate,
  parseFarmOsDay150ReferenceCatalogRunReceiptCandidate,
  type FarmOsDay150PrefixReferencePublicExecutorBoundary,
  type FarmOsDay150PrefixReferenceConsumptionMarker,
  type FarmOsDay150PrefixReferenceAttemptClaim,
  type FarmOsDay150ReferenceEffectResult,
  type FarmOsDay150ReferenceExecutionEffectPort,
  type FarmOsDay150ReferenceExecutionEvidence,
  type FarmOsDay150ReferenceEffectRequest,
  type FarmOsDay150RealExecutionContextCapability,
  type FarmOsDay150PrefixReferenceDurableArtifactObservation,
} from "../../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FarmOsDay150DurablePublicationError,
  canonicalFarmOsDay150Json,
  publishFarmOsDay150BytesExclusive,
  reopenFarmOsDay150Bytes,
} from "../../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store";
import {
  resolveFarmOsDay150PrefixReferenceArtifactRepositoryRoot,
} from "../../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_TRANSIENT_CODES,
  parseFarmOsDay150PostgresMutationSettlement,
  renderFarmOsDay150PrefixReferencePostgresProcessProgram,
  type FarmOsDay150PrimitiveRequest,
  type FarmOsDay150PrimitiveResult,
  type FarmOsDay150PrimitiveSystemEffectPort,
} from "../../../src/lib/hermes/farm_os_day150_prefix_reference_primitive_port";
import {
  aggregateFarmOsDay150DockerResourcePreexistence,
  classifyFarmOsDay150BoundedDockerInspectResult,
  type FarmOsDay150DockerInspectClassification,
  type FarmOsDay150DockerResourceKind,
} from "./farm_os_day150_docker_absence_classifier";
const executionBinding = FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING;
const authority = executionBinding.external_execution_plan;
const activeDescriptor = executionBinding.descriptor;
const verifiedRuntimeModuleRoot = resolve(import.meta.dirname, "../../..");
const artifactPathAuthority = resolveFarmOsDay150PrefixReferenceArtifactRepositoryRoot({
  module_repository_root: verifiedRuntimeModuleRoot,
});
const repositoryRoot = artifactPathAuthority.repository_root;
const dockerPrefix = ["--host", "unix:///var/run/docker.sock"] as const;
const dockerEnvironment = {
  PATH: "/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin",
  NODE_ENV: "production",
} as const;

class FarmOsDay150PrefixReferenceExecutionError extends Error {
  constructor(public readonly code: "BLOCKED_RESOURCE_PREEXISTS" |
    "BLOCKED_OUTPUT_PREEXISTS" | "SOURCE_MISMATCH" | "SERVER_IDENTITY_MISMATCH" |
    "INITIAL_READBACK_MISMATCH" | "MIGRATION_FAILED" | "COLLECTION_FAILED" |
    "OUTPUT_MISMATCH" | "CLEANUP_FAILED" | "OUTCOME_UNKNOWN" |
    "ALREADY_CONSUMED" | "BLOCKED_PREEXISTING_MARKER" |
    "POSTGRES_READINESS_TIMEOUT" | "POSTGRES_READINESS_AUTHENTICATION_FAILURE" |
    "POSTGRES_READINESS_WRONG_DATABASE" | "POSTGRES_READINESS_PERMISSION_FAILURE" |
    "POSTGRES_READINESS_WRONG_ENDPOINT" | "POSTGRES_READINESS_MALFORMED_RESULT" |
    "POSTGRES_READINESS_PROCESS_FAILURE") {
    super(code); this.name = "FarmOsDay150PrefixReferenceExecutionError";
  }
}
function classifyFarmOsDay150PrefixReferencePostgresReadinessErrorCode(
  errorCode: unknown,
): "STARTUP_TRANSIENT" | "POSTGRES_READINESS_AUTHENTICATION_FAILURE" |
  "POSTGRES_READINESS_WRONG_DATABASE" | "POSTGRES_READINESS_PERMISSION_FAILURE" |
  "POSTGRES_READINESS_WRONG_ENDPOINT" | "POSTGRES_READINESS_PROCESS_FAILURE" {
  if (FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_TRANSIENT_CODES.includes(
    errorCode as typeof FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_TRANSIENT_CODES[number])) {
    return "STARTUP_TRANSIENT";
  }
  return errorCode === "28P01" ? "POSTGRES_READINESS_AUTHENTICATION_FAILURE" :
    errorCode === "3D000" ? "POSTGRES_READINESS_WRONG_DATABASE" :
      errorCode === "42501" ? "POSTGRES_READINESS_PERMISSION_FAILURE" :
        ["ENOTFOUND", "EHOSTUNREACH", "ENETUNREACH"].includes(String(errorCode))
          ? "POSTGRES_READINESS_WRONG_ENDPOINT" : "POSTGRES_READINESS_PROCESS_FAILURE";
}

const classifyDockerInspect = (result: PrimitiveProcessValue,
  kind: FarmOsDay150DockerResourceKind, name: string): FarmOsDay150DockerInspectClassification =>
  classifyFarmOsDay150BoundedDockerInspectResult({ resource_kind: kind,
    expected_resource_name: name, exit_code: result.code,
    stdout: result.stdout, stderr: result.stderr });
const receiptPath = resolve(repositoryRoot,
  activeDescriptor.durable_paths.success_receipt);
const terminalOutcomeReceiptPath = resolve(repositoryRoot,
  activeDescriptor.durable_paths
    .terminal_outcome_receipt!);
const consumptionMarkerPath = resolve(repositoryRoot,
  activeDescriptor.durable_paths.consumption_marker);
const preCleanupEvidencePath = `${receiptPath}.pre-cleanup`;
const attemptClaimPath = resolve(repositoryRoot,
  activeDescriptor.durable_paths.attempt_claim);

const sqlLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

function exactInitialFacts(rows: readonly Record<string, unknown>[]):
  FarmOsDay150ReferenceExecutionEvidence["initial_facts"] | null {
  const row = rows.length === 1 ? rows[0]! : null;
  if (!row || row.server_major !== 17 || row.database_name !== authority.database ||
    row.owner_role_exact !== true || row.executor_role_exact !== true ||
    row.membership_exact !== true || row.ai_schema_present !== true ||
    row.proposal_inbox_present !== true || Number(row.base_column_count) !== 19 ||
    Number(row.base_constraint_count) !== 4 || Number(row.base_index_count) !== 1 ||
    row.owner_only !== true || Number(row.explicit_application_grant_count) !== 0 ||
    Number(row.explicit_public_privilege_count) !== 0 || Number(row.unrelated_schema_count) !== 0 ||
    Number(row.preprefix_table_count) !== 6 || Number(row.preprefix_function_count) !== 2 ||
    Number(row.preprefix_append_only_trigger_count) !== 6) {
    return null;
  }
  return Object.freeze({ server_major: 17, database: authority.database,
    owner_role_exact: true, executor_role_exact: true, membership_exact: true,
    ai_schema_present: true, proposal_inbox_present: true, base_column_count: 19,
    base_constraint_count: 4, base_index_count: 1, owner_only: true,
    explicit_application_grant_count: 0, explicit_public_privilege_count: 0,
    unrelated_schema_count: 0, preprefix_table_count: 6, preprefix_function_count: 2,
    preprefix_append_only_trigger_count: 6 });
}

const initialReadbackSql = `
SELECT
  (current_setting('server_version_num')::int / 10000) AS server_major,
  current_database()::text AS database_name,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME}'
    AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolreplication AND NOT rolbypassrls) AS owner_role_exact,
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME}'
    AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND rolcreaterole
    AND NOT rolreplication AND NOT rolbypassrls) AS executor_role_exact,
  EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles granted ON granted.oid=m.roleid
    JOIN pg_roles member ON member.oid=m.member WHERE granted.rolname='${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME}'
    AND member.rolname='${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME}' AND m.admin_option=false
    AND m.inherit_option=true AND m.set_option=true) AS membership_exact,
  to_regnamespace('ai') IS NOT NULL AS ai_schema_present,
  to_regclass('ai.proposal_inbox') IS NOT NULL AS proposal_inbox_present,
  (SELECT count(*)::int FROM pg_attribute WHERE attrelid='ai.proposal_inbox'::regclass
    AND attnum > 0 AND NOT attisdropped) AS base_column_count,
  (SELECT count(*)::int FROM pg_constraint WHERE conrelid='ai.proposal_inbox'::regclass) AS base_constraint_count,
  (SELECT count(*)::int FROM pg_index WHERE indrelid='ai.proposal_inbox'::regclass) AS base_index_count,
  (SELECT pg_get_userbyid(relowner)='${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME}'
    FROM pg_class WHERE oid='ai.proposal_inbox'::regclass) AND
  (SELECT pg_get_userbyid(nspowner)='${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME}'
    FROM pg_namespace WHERE nspname='ai') AS owner_only,
  (SELECT count(*)::int FROM pg_class c CROSS JOIN LATERAL
    aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    WHERE c.oid='ai.proposal_inbox'::regclass AND acl.grantee NOT IN
    (0, (SELECT oid FROM pg_roles WHERE rolname='${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME}')))
    AS explicit_application_grant_count,
  ((SELECT count(*)::int FROM pg_class c CROSS JOIN LATERAL
    aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) acl
    WHERE c.oid='ai.proposal_inbox'::regclass AND acl.grantee=0) +
  (SELECT count(*)::int FROM pg_namespace n CROSS JOIN LATERAL
    aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) acl
    WHERE n.nspname='ai' AND acl.grantee=0)) AS explicit_public_privilege_count,
  (SELECT count(*)::int FROM pg_namespace WHERE nspname NOT IN
    ('ai','public','pg_catalog','information_schema') AND nspname NOT LIKE 'pg_toast%'
    AND nspname NOT LIKE 'pg_temp%') AS unrelated_schema_count,
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='ai' AND c.relkind='r' AND c.relname IN
    ('operational_memory_source_snapshots','operational_memory_snapshot_state_events',
     'operational_memory_daily_projections','operational_memory_projection_state_events',
     'operational_memory_projection_lineage','operational_memory_ingestion_rejections'))
    AS preprefix_table_count,
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='ai' AND p.proname IN
    ('reject_operational_memory_immutable_mutation','persist_operational_memory_bundle'))
    AS preprefix_function_count,
  (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ai' AND NOT t.tgisinternal
    AND t.tgname LIKE 'operational_memory_%_append_only')
    AS preprefix_append_only_trigger_count;`;

export type FarmOsDay150PinnedMigrationExecutionBundle = readonly Readonly<{
  migration_id: typeof authority.migration_history[number]["migration_id"]; sql: string;
}>[];
const effectFailure = (error: unknown): FarmOsDay150ReferenceEffectResult<never> => {
  const code = error instanceof FarmOsDay150PrefixReferenceExecutionError
    ? error.code : error instanceof FarmOsDay150DurablePublicationError
      ? error.code : "UNCLASSIFIED_EFFECT_FAILURE";
  return Object.freeze({ status: code === "OUTCOME_UNKNOWN"
    ? "AMBIGUOUS_OUTCOME" : "BOUNDED_FAILURE", code });
};

type PrimitiveContext = Readonly<{ primitive_port: FarmOsDay150PrimitiveSystemEffectPort;
  artifact_root: string;
  artifact_path_mode?: "QUALIFICATION_FLAT" | "PUBLIC_ACTIVE_REVISION" }>;
type PrimitiveRequestWithoutRef<T = FarmOsDay150PrimitiveRequest> = T extends unknown
  ? Omit<T, "operation_ref_digest"> : never;
type PrimitiveProcessValue = Readonly<{ code: number; stdout: string; stderr: string }>;
type PrimitiveProcessRawValue = Readonly<{ code: number; stdout: Uint8Array; stderr: Uint8Array }>;
type PrimitiveChannelValue = Readonly<{ rows: readonly Readonly<Record<string, unknown>>[][] }>;
const PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS = 41_237;
const PRIMITIVE_FILE_DEADLINE_MILLISECONDS = 7_913;
const PRIMITIVE_MAX_STDIN_BYTES = 8_388_608;
const PRIMITIVE_MAX_STDOUT_BYTES = 4_194_304;
const PRIMITIVE_MAX_STDERR_BYTES = 262_144;
const POSTGRES_PROCESS_PROGRAM = renderFarmOsDay150PrefixReferencePostgresProcessProgram(
  activeDescriptor.postgres_application_name,
);
const resolveExecutableIdentity = (executable: string,
  environment: Readonly<Record<string, string>>): string | null => {
  const candidates = executable.includes("/") ? [executable] :
    (environment.PATH ?? "").split(":").filter(Boolean).map((directory) => join(directory, executable));
  for (const candidate of candidates) {
    try { accessSync(candidate, fsConstants.X_OK); return realpathSync(candidate); } catch { continue; }
  }
  return null;
};

const normalizedDockerAbsenceDiagnostic = (kind: FarmOsDay150DockerResourceKind,
  name: string, stderr: string): string => {
  if (stderr.split(name).length !== 2) return "EXPECTED_NAME_NOT_EXACTLY_ONCE";
  const normalized = stderr.replace(name, "<EXACT_NAME>").replaceAll("\r\n", "\n").trimEnd();
  const forms = new Map<string, string>([
    [`Error: No such ${kind}: <EXACT_NAME>`, "LEGACY_EXACT_ABSENCE_FORM"],
    ["Error response from daemon: No such container: <EXACT_NAME>",
      "CONTAINER_DAEMON_EXACT_ABSENCE_FORM"],
    ["Error response from daemon: No such container:\n<EXACT_NAME>",
      "CONTAINER_DAEMON_LINEBREAK_EXACT_ABSENCE_FORM"],
    ["network <EXACT_NAME> not found", "NETWORK_EXACT_ABSENCE_FORM"],
    ["Error response from daemon: network <EXACT_NAME> not found",
      "NETWORK_DAEMON_PREFIXED_EXACT_ABSENCE_FORM"],
    ["get <EXACT_NAME>: no such volume", "VOLUME_EXACT_ABSENCE_FORM"],
    ["Error response from daemon: get <EXACT_NAME>: no such volume",
      "VOLUME_DAEMON_PREFIXED_EXACT_ABSENCE_FORM"],
  ]);
  return forms.get(normalized) ?? `UNAPPROVED_BOUNDED_FORM_${adapterDigest(
    "farmos.day150-docker-stderr-diagnostic.v1", normalized)}`;
};
const primitiveSuccess = <T>(value: T): FarmOsDay150ReferenceEffectResult<T> =>
  Object.freeze({ status: "SUCCESS", value });
const primitiveFailure = (result: Exclude<FarmOsDay150PrimitiveResult,
  Readonly<{ status: "SUCCESS"; value: unknown }>>): FarmOsDay150ReferenceEffectResult<never> =>
  Object.freeze({ status: result.status, code: result.code });
const parseCanonicalBytes = (value: unknown): unknown => {
  if (!(value instanceof Uint8Array)) throw new FarmOsDay150PrefixReferenceExecutionError(
    "OUTPUT_MISMATCH");
  const bytes = Buffer.from(value).toString("utf8");
  const parsed = JSON.parse(bytes) as unknown;
  if (`${canonicalFarmOsDay150Json(parsed)}\n` !== bytes) {
    throw new FarmOsDay150PrefixReferenceExecutionError("OUTPUT_MISMATCH");
  }
  return parsed;
};
const canonicalBytes = (value: unknown): Buffer =>
  Buffer.from(`${canonicalFarmOsDay150Json(value)}\n`, "utf8");
const adapterDigest = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${canonicalFarmOsDay150Json(value)}`)
    .digest("hex")}`;

function createActualPrimitivePort(): FarmOsDay150PrimitiveSystemEffectPort {
  const success = (value: unknown): FarmOsDay150PrimitiveResult =>
    Object.freeze({ status: "SUCCESS", value });
  const bounded = (code: string): FarmOsDay150PrimitiveResult =>
    Object.freeze({ status: "BOUNDED_FAILURE", code });
  const ambiguous = (code: string): FarmOsDay150PrimitiveResult =>
    Object.freeze({ status: "AMBIGUOUS_OUTCOME", code });
  const activeChildren = new Set<ChildProcessWithoutNullStreams>();
  const activeSettlements = new Set<Promise<void>>();
  const activePrimitiveOperations = new Set<Promise<void>>();
  return Object.freeze({
    async perform(request): Promise<FarmOsDay150PrimitiveResult> {
      const operation = (async (): Promise<FarmOsDay150PrimitiveResult> => {
        try {
          switch (request.kind) {
            case "PROCESS": return await new Promise((resolve) => {
              if (request.stdin_bytes.byteLength > request.max_stdin_bytes) {
                resolve(bounded("STDIN_LIMIT_EXCEEDED")); return;
              }
              const child = spawn(request.executable, [...request.argv], {
                env: request.environment as NodeJS.ProcessEnv,
                windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
              });
              activeChildren.add(child);
              let closeSettlementResolve: (() => void) | null = null;
              const closeSettlement = new Promise<void>((settled) => {
                closeSettlementResolve = settled;
              });
              activeSettlements.add(closeSettlement);
              const stdout: Buffer[] = [];
              const stderr: Buffer[] = [];
              let stdoutBytes = 0;
              let stderrBytes = 0;
              let settled = false;
              const finish = (value: FarmOsDay150PrimitiveResult) => {
                if (settled) return; settled = true; clearTimeout(timer); resolve(value);
              };
              const limit = (kind: "STDOUT" | "STDERR") => {
                child.kill("SIGKILL"); finish(ambiguous(`${kind}_LIMIT_EXCEEDED_OUTCOME_UNKNOWN`));
              };
              child.stdout.on("data", (chunk: Buffer) => {
                stdoutBytes += chunk.byteLength;
                if (stdoutBytes > request.max_stdout_bytes) limit("STDOUT"); else stdout.push(chunk);
              });
              child.stderr.on("data", (chunk: Buffer) => {
                stderrBytes += chunk.byteLength;
                if (stderrBytes > request.max_stderr_bytes) limit("STDERR"); else stderr.push(chunk);
              });
              child.once("error", () => finish(bounded("PROCESS_SPAWN_FAILED")));
              child.once("close", (code, signal) => {
                activeChildren.delete(child);
                activeSettlements.delete(closeSettlement);
                closeSettlementResolve?.();
                finish(signal || typeof code !== "number" ? ambiguous("PROCESS_ACK_AMBIGUOUS") :
                  success(Object.freeze({ code,
                    stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) })));
              });
              child.stdin.end(request.stdin_bytes);
              const timer = setTimeout(() => {
                child.kill("SIGKILL"); finish(ambiguous("DEADLINE_EXCEEDED"));
              }, request.deadline_milliseconds);
            });
            case "FILE_STAT": return success(Object.freeze({ present: await stat(request.path)
              .then(() => true, (error) => {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
                throw error;
              }) }));
            case "FILE_PUBLISH_EXCLUSIVE":
              if (request.bytes.byteLength > request.max_write_bytes) return bounded(
                "WRITE_LIMIT_EXCEEDED");
              await publishFarmOsDay150BytesExclusive(request.path, request.bytes);
              return success(null);
            case "FILE_REOPEN": {
              const bytes = await reopenFarmOsDay150Bytes(request.path);
              return bytes.byteLength <= request.max_bytes ? success(bytes) : bounded(
                "OUTPUT_LIMIT_EXCEEDED");
            }
            case "FILE_UNLINK": await unlink(request.path); return success(null);
            case "MONOTONIC_NOW": return success(performance.now());
            case "BOUNDED_WAIT": return await new Promise((resolve) => setTimeout(
              () => resolve(success(null)), request.milliseconds));
            case "TERMINAL_CLOSE": {
              for (const child of activeChildren) child.kill("SIGKILL");
              const fence = Promise.all([...activeSettlements, ...activePrimitiveOperations])
                .then(() => activeChildren.size === 0 && activePrimitiveOperations.size === 0
                  ? success(null) :
                  ambiguous("TERMINAL_CLOSE_CHILD_FENCE_FAILED"));
              let deadline: ReturnType<typeof setTimeout> | null = null;
              const boundedFence = new Promise<FarmOsDay150PrimitiveResult>((resolveFence) => {
                deadline = setTimeout(() => resolveFence(ambiguous(
                  "TERMINAL_CLOSE_CHILD_FENCE_DEADLINE_EXCEEDED")),
                request.deadline_milliseconds);
              });
              const result = await Promise.race([fence, boundedFence]);
              if (deadline) clearTimeout(deadline);
              return result;
            }
          }
        } catch (error) {
          const code = error instanceof FarmOsDay150DurablePublicationError ? error.code :
            "PRIMITIVE_BOUNDED_FAILURE";
          return code === "OUTCOME_UNKNOWN" ? ambiguous(code) : bounded(code);
        }
      })();
      if (request.kind === "TERMINAL_CLOSE") return operation;
      const primitiveSettlement = operation.then(() => undefined, () => undefined);
      activePrimitiveOperations.add(primitiveSettlement);
      void primitiveSettlement.finally(() => activePrimitiveOperations.delete(primitiveSettlement));
      return new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(ambiguous("DEADLINE_EXCEEDED")),
          request.deadline_milliseconds);
        operation.then((result) => { clearTimeout(timeout); resolve(result); }, () => {
          clearTimeout(timeout); resolve(bounded("PRIMITIVE_REJECTED"));
        });
      });
    },
  });
}

export async function qualifyFarmOsDay150ActualPrimitiveNonzeroCompletion(): Promise<Readonly<{
  status: "QUALIFIED"; settled_exit_code: 1; primitive_status: "SUCCESS";
  expected_absence_recognized: true;
  file_publication_close_fenced: true;
  docker_operations: 0; postgres_operations: 0; migration_operations: 0;
}>> {
  const absentName = authority.resources.container;
  const port = createActualPrimitivePort();
  const result = await port.perform(Object.freeze({
    kind: "PROCESS" as const, executable: process.execPath,
    argv: Object.freeze(["-e",
      `process.stderr.write(${JSON.stringify(`Error: No such container: ${absentName}\n`)});process.exit(1)`]),
    environment: dockerEnvironment,
    stdin_bytes: Buffer.alloc(0), max_stdin_bytes: 1_019,
    max_stdout_bytes: 2_047, max_stderr_bytes: 2_047, max_process_results: 1 as const,
    deadline_milliseconds: 5_113,
    operation_ref_digest: adapterDigest("farmos.day150-actual-primitive-nonzero-qualification.v1",
      "EXPECTED_BOUNDED_NONZERO_COMPLETION"),
  }));
  const raw = result.status === "SUCCESS" ? result.value as PrimitiveProcessRawValue : null;
  const settled = raw && typeof raw.code === "number" &&
    raw.stdout instanceof Uint8Array && raw.stderr instanceof Uint8Array
    ? Object.freeze({ code: raw.code, stdout: Buffer.from(raw.stdout).toString("utf8"),
      stderr: Buffer.from(raw.stderr).toString("utf8") }) : null;
  if (!settled || settled.code !== 1 || settled.stdout !== "" ||
    classifyDockerInspect(settled, "container", absentName) !== "ABSENT") {
    throw new Error("ACTUAL_PRIMITIVE_NONZERO_COMPLETION_QUALIFICATION_REJECTED");
  }
  const root = await mkdtemp(join(tmpdir(), "farmos-day150-actual-primitive-fence-"));
  const target = join(root, "bounded-publication.json");
  const publication = port.perform(Object.freeze({
    kind: "FILE_PUBLISH_EXCLUSIVE" as const, path: target,
    bytes: Buffer.from("{}\n"), max_write_bytes: 1_019, deadline_milliseconds: 5_113,
    operation_ref_digest: adapterDigest("farmos.day150-actual-primitive-file-fence.v1",
      "PUBLICATION"),
  }));
  const close = port.perform(Object.freeze({ kind: "TERMINAL_CLOSE" as const,
    deadline_milliseconds: 5_113,
    operation_ref_digest: adapterDigest("farmos.day150-actual-primitive-file-fence.v1", "CLOSE"),
  }));
  const [published, closed] = await Promise.all([publication, close]);
  const reopened = await reopenFarmOsDay150Bytes(target).catch(() => null);
  await unlink(target).catch(() => undefined);
  await rmdir(root).catch(() => undefined);
  if (published.status !== "SUCCESS" || closed.status !== "SUCCESS" ||
    reopened?.toString("utf8") !== "{}\n") {
    throw new Error("ACTUAL_PRIMITIVE_FILE_SETTLEMENT_FENCE_QUALIFICATION_REJECTED");
  }
  return Object.freeze({ status: "QUALIFIED", settled_exit_code: 1,
    primitive_status: "SUCCESS", expected_absence_recognized: true,
    file_publication_close_fenced: true,
    docker_operations: 0, postgres_operations: 0,
    migration_operations: 0 });
}

export async function diagnoseFarmOsDay150RealDockerInspectPrimitiveBoundary(): Promise<Readonly<{
  status: "DIAGNOSTIC_COMPLETE";
  records: readonly Readonly<{
    resource_kind: FarmOsDay150DockerResourceKind;
    expected_resource_name: string;
    requested_executable: "docker";
    resolved_executable_identity: string | null;
    spawn_result: "SPAWNED_AND_SETTLED" | "SPAWN_FAILED" | "OUTCOME_AMBIGUOUS";
    process_exit_status: number | null;
    termination_reason: "PROCESS_EXIT" | "SPAWN_FAILURE" | "DEADLINE_OR_SIGNAL_AMBIGUITY";
    deadline_result: "NOT_EXCEEDED" | "EXCEEDED_OR_AMBIGUOUS";
    stdout_byte_count: number;
    stderr_byte_count: number;
    stdout_limit_classification: "WITHIN_LIMIT" | "LIMIT_EXCEEDED_OR_AMBIGUOUS";
    stderr_limit_classification: "WITHIN_LIMIT" | "LIMIT_EXCEEDED_OR_AMBIGUOUS";
    primitive_result_discriminator: FarmOsDay150PrimitiveResult["status"];
    adapter_result_discriminator: "BOUNDED_PROCESS_COMPLETION" | "PRIMITIVE_FAILURE";
    absence_classifier_result_discriminator: FarmOsDay150DockerInspectClassification;
    normalized_stderr_classification: string;
  }>[];
  docker_inspect_operations: 3;
  docker_mutations: 0;
}>> {
  const port = createActualPrimitivePort();
  const resolvedExecutableIdentity = resolveExecutableIdentity("docker", dockerEnvironment);
  const records = [] as Array<Record<string, unknown>>;
  for (const [kind, name] of [["container", authority.resources.container],
    ["network", authority.resources.network], ["volume", authority.resources.volume]] as const) {
    const result = await port.perform(Object.freeze({ kind: "PROCESS" as const,
      executable: "docker", argv: Object.freeze([...dockerPrefix, kind, "inspect", name]),
      environment: dockerEnvironment, stdin_bytes: Buffer.alloc(0),
      max_stdin_bytes: PRIMITIVE_MAX_STDIN_BYTES, max_stdout_bytes: PRIMITIVE_MAX_STDOUT_BYTES,
      max_stderr_bytes: PRIMITIVE_MAX_STDERR_BYTES, max_process_results: 1 as const,
      deadline_milliseconds: PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS,
      operation_ref_digest: adapterDigest("farmos.day150-real-docker-inspect-diagnostic.v1",
        { kind, name }),
    }));
    const processValue = result.status === "SUCCESS" ? (() => {
      try {
        const raw = result.value as PrimitiveProcessRawValue;
        return typeof raw.code === "number" && raw.stdout instanceof Uint8Array &&
          raw.stderr instanceof Uint8Array ? Object.freeze({ code: raw.code,
            stdout: Buffer.from(raw.stdout).toString("utf8"),
            stderr: Buffer.from(raw.stderr).toString("utf8") }) : null;
      } catch { return null; }
    })() : null;
    const classifier = processValue ? classifyDockerInspect(processValue, kind, name)
      : result.status;
    records.push(Object.freeze({ resource_kind: kind, expected_resource_name: name,
      requested_executable: "docker" as const,
      resolved_executable_identity: resolvedExecutableIdentity,
      spawn_result: result.status === "SUCCESS" ? "SPAWNED_AND_SETTLED" as const :
        result.status === "BOUNDED_FAILURE" && result.code === "PROCESS_SPAWN_FAILED"
          ? "SPAWN_FAILED" as const : "OUTCOME_AMBIGUOUS" as const,
      process_exit_status: processValue?.code ?? null,
      termination_reason: result.status === "SUCCESS" ? "PROCESS_EXIT" as const :
        result.status === "BOUNDED_FAILURE" && result.code === "PROCESS_SPAWN_FAILED"
          ? "SPAWN_FAILURE" as const : "DEADLINE_OR_SIGNAL_AMBIGUITY" as const,
      deadline_result: result.status === "AMBIGUOUS_OUTCOME" &&
        result.code.includes("DEADLINE") ? "EXCEEDED_OR_AMBIGUOUS" as const : "NOT_EXCEEDED" as const,
      stdout_byte_count: processValue ? Buffer.byteLength(processValue.stdout) : 0,
      stderr_byte_count: processValue ? Buffer.byteLength(processValue.stderr) : 0,
      stdout_limit_classification: result.status === "AMBIGUOUS_OUTCOME" &&
        result.code.includes("STDOUT_LIMIT") ? "LIMIT_EXCEEDED_OR_AMBIGUOUS" as const :
          "WITHIN_LIMIT" as const,
      stderr_limit_classification: result.status === "AMBIGUOUS_OUTCOME" &&
        result.code.includes("STDERR_LIMIT") ? "LIMIT_EXCEEDED_OR_AMBIGUOUS" as const :
          "WITHIN_LIMIT" as const,
      primitive_result_discriminator: result.status,
      adapter_result_discriminator: processValue ? "BOUNDED_PROCESS_COMPLETION" as const :
        "PRIMITIVE_FAILURE" as const,
      absence_classifier_result_discriminator: classifier,
      normalized_stderr_classification: processValue
        ? normalizedDockerAbsenceDiagnostic(kind, name, processValue.stderr)
        : result.status === "SUCCESS" ? "MALFORMED_PRIMITIVE_SUCCESS" : result.code,
    }));
  }
  return Object.freeze({ status: "DIAGNOSTIC_COMPLETE", records: Object.freeze(records),
    docker_inspect_operations: 3, docker_mutations: 0 }) as Awaited<ReturnType<
      typeof diagnoseFarmOsDay150RealDockerInspectPrimitiveBoundary>>;
}

function createSubstantiveRealReferenceAdapter(input: Readonly<{
  context: PrimitiveContext;
  pinned_migrations: FarmOsDay150PinnedMigrationExecutionBundle;
  pinned_migration_bundle_digest: `sha256:${string}`;
  qualification: boolean;
}>): FarmOsDay150ReferenceExecutionEffectPort {
  const primitive = input.context.primitive_port;
  const trace: FarmOsDay150ReferenceEffectRequest[] = [];
  let staged: FarmOsDay150ReferenceEffectRequest | null = null;
  let postgresReady = false;
  let executorReady = false;
  let readinessObservation: Readonly<{ probe_count: number;
    time_to_ready_milliseconds: number }> | null = null;
  let provenance: Readonly<{ run_identity: `sha256:${string}`;
    attempt_identity: `sha256:${string}`; attempt_claim_digest: `sha256:${string}` }> | null = null;
  let activePublicationDigest: `sha256:${string}` | null = null;
  let port = 0;
  let sections: readonly Readonly<{ section_id: string; statement_sql: string }>[] = [];
  const adminPassword = input.qualification ? "qualification-secret-not-persisted" :
    `d150a_${randomBytes(32).toString("hex")}`;
  const executorPassword = input.qualification ? "qualification-secret-not-persisted" :
    `d150e_${randomBytes(32).toString("hex")}`;
  const path = (kind: "claim" | "marker" | "pre-cleanup" | "receipt" | "terminal-receipt" |
    `candidate-${number}`): string => {
    if (input.qualification && input.context.artifact_path_mode !== "PUBLIC_ACTIVE_REVISION") {
      return resolve(input.context.artifact_root, `${kind}.json`);
    }
    if (input.qualification) {
      if (kind === "claim") return resolve(input.context.artifact_root,
        activeDescriptor.durable_paths.attempt_claim);
      if (kind === "marker") return resolve(input.context.artifact_root,
        activeDescriptor.durable_paths.consumption_marker);
      if (kind === "receipt") return resolve(input.context.artifact_root,
        activeDescriptor.durable_paths.success_receipt);
      if (kind === "terminal-receipt") return resolve(input.context.artifact_root,
        activeDescriptor.durable_paths.terminal_outcome_receipt!);
      if (kind === "pre-cleanup") return `${resolve(input.context.artifact_root,
        activeDescriptor.durable_paths.success_receipt)}.pre-cleanup`;
      const qualificationIndex = Number(kind.slice("candidate-".length)) - 1;
      return resolve(input.context.artifact_root,
        authority.candidate_output_paths[qualificationIndex]!);
    }
    if (kind === "claim") return attemptClaimPath;
    if (kind === "marker") return consumptionMarkerPath;
    if (kind === "pre-cleanup") return preCleanupEvidencePath;
    if (kind === "receipt") return receiptPath;
    if (kind === "terminal-receipt") return terminalOutcomeReceiptPath;
    const index = Number(kind.slice("candidate-".length)) - 1;
    return resolve(repositoryRoot, authority.candidate_output_paths[index]!);
  };
  const requireStaged = (): FarmOsDay150ReferenceEffectRequest => {
    if (!staged) throw new Error("ADAPTER_REQUEST_NOT_STAGED");
    return staged;
  };
  const bindLatestReadbackDigest = (digest: `sha256:${string}`): void => {
    const index = trace.length - 1;
    const entry = trace[index];
    if (!entry || entry.primitive_class !== "FILE_REOPEN") throw new Error(
      "RECONCILIATION_TRACE_READBACK_BINDING_REJECTED");
    trace[index] = Object.freeze({ ...entry, publication_candidate_digest: digest });
  };
  const perform = async (request: PrimitiveRequestWithoutRef):
    Promise<FarmOsDay150PrimitiveResult> => {
    const semantic = requireStaged();
    const resourceKind = semantic.step === "RESOURCE_PREEXISTENCE" && request.kind === "PROCESS"
      ? request.argv[dockerPrefix.length] : null;
    const outputKind = request.kind === "FILE_STAT" || request.kind === "FILE_REOPEN"
      ? request.path === path("receipt") ? "FINAL_RECEIPT"
        : request.path === path("terminal-receipt") ? "TERMINAL_OUTCOME_RECEIPT"
        : request.path === path("pre-cleanup") ? "PRE_CLEANUP_EVIDENCE"
          : Array.from({ length: 5 }, (_, index) => path(`candidate-${index + 1}`))
            .includes(request.path) ? "CANDIDATE" : null
      : null;
    const semanticStepId = resourceKind === "container" || resourceKind === "network" ||
      resourceKind === "volume" ? `RESOURCE_PREEXISTENCE_${resourceKind.toUpperCase()}` :
      semantic.step === "RESOURCE_PREEXISTENCE" && request.kind === "FILE_STAT" &&
        request.path === path("marker") ? "CONSUMPTION_MARKER_PREEXISTENCE" :
        semantic.step === "RESOURCE_PREEXISTENCE" && request.kind === "FILE_REOPEN" &&
          request.path === path("marker") ? "CONSUMPTION_MARKER_RECOVERY_READBACK" :
          semantic.step === "RESOURCE_PREEXISTENCE" && outputKind ?
            `DURABLE_RECONCILIATION_${outputKind}_${request.kind === "FILE_STAT" ?
              "PREEXISTENCE" : "READBACK"}` :
          semantic.step;
    trace.push(Object.freeze({ ...semantic, primitive_ordinal: trace.length + 1,
      primitive_class: request.kind, semantic_step_id: semanticStepId,
      publication_candidate_digest: activePublicationDigest ??
        semantic.publication_candidate_digest }));
    const result = await primitive.perform(Object.freeze({ ...request,
      operation_ref_digest: semantic.target_identity_digest }) as FarmOsDay150PrimitiveRequest);
    if (resourceKind === "container" || resourceKind === "network" || resourceKind === "volume") {
      let boundedResultClassification: FarmOsDay150DockerInspectClassification =
        result.status === "SUCCESS" ? "AMBIGUOUS_OUTCOME" : result.status;
      if (result.status === "SUCCESS") {
        try { boundedResultClassification = classifyDockerInspect(exactProcess(result.value),
          resourceKind, request.kind === "PROCESS" ? request.argv.at(-1) ?? "" : ""); }
        catch { boundedResultClassification = "AMBIGUOUS_OUTCOME"; }
      }
      trace[trace.length - 1] = Object.freeze({ ...trace[trace.length - 1]!,
        bounded_result_classification: boundedResultClassification });
    }
    return result;
  };
  const settle = <T>(value: FarmOsDay150PrimitiveResult,
    parse: (raw: unknown) => T): FarmOsDay150ReferenceEffectResult<T> => {
    if (value.status !== "SUCCESS") return primitiveFailure(value);
    try { return primitiveSuccess(parse(value.value)); }
    catch (error) { return effectFailure(error); }
  };
  const settleMutation = <T>(value: FarmOsDay150PrimitiveResult,
    parse: (raw: unknown) => T): FarmOsDay150ReferenceEffectResult<T> => {
    if (value.status !== "SUCCESS") {
      if (value.status === "BOUNDED_FAILURE" && ["INJECTED_FAILURE", "PROCESS_LOSS_BEFORE_EFFECT",
        "STDIN_LIMIT_EXCEEDED", "PROCESS_SPAWN_FAILED"].includes(value.code)) {
        return primitiveFailure(value);
      }
      return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
        code: `${value.code}_MUTATION_OUTCOME_UNKNOWN` });
    }
    try {
      const processValue = exactProcess(value.value);
      if (processValue.code !== 0) throw new FarmOsDay150PrefixReferenceExecutionError(
        "OUTCOME_UNKNOWN");
      return primitiveSuccess(parse(value.value));
    } catch {
      return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
        code: "MUTATION_SETTLEMENT_OUTCOME_UNKNOWN" });
    }
  };
  const settlePostgresMutation = <T>(value: FarmOsDay150PrimitiveResult,
    parse: (raw: unknown) => T): FarmOsDay150ReferenceEffectResult<T> => {
    if (value.status !== "SUCCESS") {
      if (value.status === "BOUNDED_FAILURE" && ["INJECTED_FAILURE", "PROCESS_LOSS_BEFORE_EFFECT",
        "STDIN_LIMIT_EXCEEDED", "PROCESS_SPAWN_FAILED"].includes(value.code)) {
        return primitiveFailure(value);
      }
      return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
        code: `${value.code}_MUTATION_OUTCOME_UNKNOWN` });
    }
    try {
      const processValue = exactProcess(value.value);
      const settlement = parseFarmOsDay150PostgresMutationSettlement({
        exit_code: processValue.code, stdout: processValue.stdout });
      if (settlement.outcome === "MUTATION_REJECTED_NOT_COMMITTED") return Object.freeze({
        status: "BOUNDED_FAILURE" as const,
        code: "DETERMINISTIC_MUTATION_REJECTED_NOT_COMMITTED" });
      if (settlement.outcome !== "MUTATION_COMMITTED") throw new
        FarmOsDay150PrefixReferenceExecutionError("OUTCOME_UNKNOWN");
      return primitiveSuccess(parse(value.value));
    } catch {
      return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
        code: "MUTATION_SETTLEMENT_OUTCOME_UNKNOWN" });
    }
  };
  const settleDurablePostMutationReadback = <T>(value: FarmOsDay150PrimitiveResult,
    parse: (raw: unknown) => T): FarmOsDay150ReferenceEffectResult<T> => {
    if (value.status !== "SUCCESS") {
      if (value.status === "BOUNDED_FAILURE" && ["INJECTED_FAILURE",
        "PROCESS_LOSS_BEFORE_EFFECT", "PROCESS_LOSS"].includes(value.code)) {
        return primitiveFailure(value);
      }
      return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
        code: `${value.code}_DURABLE_READBACK_OUTCOME_UNKNOWN` });
    }
    try { return primitiveSuccess(parse(value.value)); }
    catch { return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
      code: "DURABLE_READBACK_VALIDATION_OUTCOME_UNKNOWN" }); }
  };
  const dockerProcess = async (argv: readonly string[], environment: Readonly<Record<string, string>> =
    dockerEnvironment): Promise<FarmOsDay150PrimitiveResult> => perform({ kind: "PROCESS",
      executable: "docker", argv: [...dockerPrefix, ...argv], environment,
      stdin_bytes: Buffer.alloc(0), max_stdin_bytes: PRIMITIVE_MAX_STDIN_BYTES,
      max_stdout_bytes: PRIMITIVE_MAX_STDOUT_BYTES,
      max_stderr_bytes: PRIMITIVE_MAX_STDERR_BYTES,
      max_process_results: 1, deadline_milliseconds: PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS });
  const postgres = async (user: string, password: string, statements: readonly string[],
    deadlineMilliseconds = PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS,
    mode: "READ_ONLY_OR_NONTRANSACTIONAL" | "TRANSACTIONAL_MUTATION" =
      "READ_ONLY_OR_NONTRANSACTIONAL") => perform({
    kind: "PROCESS", executable: process.execPath,
    argv: ["--input-type=module", "--eval", POSTGRES_PROCESS_PROGRAM],
    environment: { NODE_ENV: "production", PGHOST: "127.0.0.1", PGPORT: String(port),
      PGDATABASE: authority.database, PGUSER: user, PGPASSWORD: password },
    stdin_bytes: Buffer.from(JSON.stringify({ statements, mode }), "utf8"),
    max_stdin_bytes: PRIMITIVE_MAX_STDIN_BYTES, max_stdout_bytes: PRIMITIVE_MAX_STDOUT_BYTES,
    max_stderr_bytes: PRIMITIVE_MAX_STDERR_BYTES, max_process_results: 1,
    deadline_milliseconds: deadlineMilliseconds });
  const monotonicNow = async (): Promise<FarmOsDay150PrimitiveResult> => perform({
    kind: "MONOTONIC_NOW", deadline_milliseconds: PRIMITIVE_FILE_DEADLINE_MILLISECONDS });
  const boundedWait = async (milliseconds: number): Promise<FarmOsDay150PrimitiveResult> => perform({
    kind: "BOUNDED_WAIT", milliseconds,
    deadline_milliseconds: Math.max(PRIMITIVE_FILE_DEADLINE_MILLISECONDS, milliseconds + 1_019) });
  const publish = async (artifactPath: string, value: unknown) => perform({
    kind: "FILE_PUBLISH_EXCLUSIVE", path: artifactPath, bytes: canonicalBytes(value),
    max_write_bytes: 4_194_304, deadline_milliseconds: PRIMITIVE_FILE_DEADLINE_MILLISECONDS });
  const reopen = async (artifactPath: string) => perform({ kind: "FILE_REOPEN",
    path: artifactPath, max_bytes: 4_194_304,
    deadline_milliseconds: PRIMITIVE_FILE_DEADLINE_MILLISECONDS });
  const statPath = async (artifactPath: string) => perform({ kind: "FILE_STAT",
    path: artifactPath, deadline_milliseconds: PRIMITIVE_FILE_DEADLINE_MILLISECONDS });
  const exactProcess = (value: unknown): PrimitiveProcessValue => {
    const candidate = value as PrimitiveProcessRawValue;
    if (!candidate || typeof candidate.code !== "number" ||
      !(candidate.stdout instanceof Uint8Array) || !(candidate.stderr instanceof Uint8Array)) {
      throw new FarmOsDay150PrefixReferenceExecutionError(
        "OUTCOME_UNKNOWN");
    }
    return Object.freeze({ code: candidate.code,
      stdout: Buffer.from(candidate.stdout).toString("utf8"),
      stderr: Buffer.from(candidate.stderr).toString("utf8") });
  };
  const channelRows = (value: unknown): PrimitiveChannelValue => {
    const processValue = exactProcess(value);
    if (processValue.code !== 0) throw new FarmOsDay150PrefixReferenceExecutionError(
      "COLLECTION_FAILED");
    let candidate: PrimitiveChannelValue;
    try { candidate = JSON.parse(processValue.stdout) as PrimitiveChannelValue; }
    catch { throw new FarmOsDay150PrefixReferenceExecutionError("COLLECTION_FAILED"); }
    if (!candidate || !Array.isArray(candidate.rows)) throw new
      FarmOsDay150PrefixReferenceExecutionError("COLLECTION_FAILED");
    return candidate;
  };
  const clearStaged = <T>(result: FarmOsDay150ReferenceEffectResult<T>) => { staged = null;
    activePublicationDigest = null;
    return result; };
  const semantic = async <T>(operation: () => Promise<FarmOsDay150ReferenceEffectResult<T>>) => {
    try { return clearStaged(await operation()); }
    catch (error) { staged = null; activePublicationDigest = null; return effectFailure(error); }
  };
  const effectPort: FarmOsDay150ReferenceExecutionEffectPort = Object.freeze({
    readAttemptProvenance: () => provenance ? Object.freeze({ ...provenance }) : null,
    stageRequest(request) { if (staged && request.step !== "TERMINAL_CLOSE") {
      throw new Error("ADAPTER_REQUEST_ALREADY_STAGED");
    }
      staged = Object.freeze({ ...request }); },
    readTrace: () => Object.freeze(trace.map((request) => Object.freeze(provenance ? { ...request,
      authorization_id: activeDescriptor.authorization_id,
      authorization_revision:
        activeDescriptor.authorization_revision,
      execution_plan_digest:
        activeDescriptor.execution_plan_digest,
      run_identity: provenance.run_identity, attempt_identity: provenance.attempt_identity,
    } : { ...request }))),
    readReadinessObservation: () => readinessObservation ? Object.freeze({
      ...readinessObservation }) : null,
    readOnlyPreflight: () => semantic<Readonly<{ status: "READY" |
      "BLOCKED_RESOURCE_PREEXISTS" | "BLOCKED_OUTPUT_PREEXISTS" }>>(async () => {
      const image = await dockerProcess(["image", "inspect", authority.image]);
      if (image.status !== "SUCCESS") return primitiveFailure(image);
      const imageResult = exactProcess(image.value);
      let imageRows: unknown;
      try { imageRows = JSON.parse(imageResult.stdout); } catch {
        throw new FarmOsDay150PrefixReferenceExecutionError("SOURCE_MISMATCH");
      }
      const row = Array.isArray(imageRows) && imageRows.length === 1 ? imageRows[0] as
        { Architecture?: unknown; RepoDigests?: unknown } : null;
      if (imageResult.code !== 0 || row?.Architecture !== "arm64" ||
        !Array.isArray(row.RepoDigests) ||
        !row.RepoDigests.includes(authority.image.replace("docker.io/library/", ""))) {
        throw new FarmOsDay150PrefixReferenceExecutionError("SOURCE_MISMATCH");
      }
      const claimState = await statPath(path("claim"));
      if (claimState.status !== "SUCCESS") return primitiveFailure(claimState);
      const claimPresent = (claimState.value as { present?: unknown }).present === true;
      let claimObservation: FarmOsDay150PrefixReferenceDurableArtifactObservation =
        Object.freeze({ state: "ABSENT", value: null });
      let trustedClaim: FarmOsDay150PrefixReferenceAttemptClaim | null = null;
      if (claimPresent) {
        const claimBytes = await reopen(path("claim"));
        if (claimBytes.status !== "SUCCESS") return Object.freeze({
          status: "AMBIGUOUS_OUTCOME" as const, code: "ATTEMPT_CLAIM_READBACK_FAILED" });
        const claimValue = parseCanonicalBytes(claimBytes.value);
        claimObservation = Object.freeze({ state: "PRESENT", value: claimValue });
        trustedClaim = parseFarmOsDay150PrefixReferenceAttemptClaim(claimValue);
        if (!trustedClaim || trustedClaim.pinned_migration_bundle_digest !==
          input.pinned_migration_bundle_digest) return Object.freeze({
          status: "BOUNDED_FAILURE" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
        bindLatestReadbackDigest(trustedClaim.claim_digest);
        provenance = Object.freeze({ run_identity: trustedClaim.run_identity,
          attempt_identity: trustedClaim.attempt_identity,
          attempt_claim_digest: trustedClaim.claim_digest });
      }
      const markerState = await statPath(path("marker"));
      if (markerState.status !== "SUCCESS") return primitiveFailure(markerState);
      const markerPresent = (markerState.value as { present?: unknown }).present === true;
      let markerObservation: FarmOsDay150PrefixReferenceDurableArtifactObservation =
        Object.freeze({ state: "ABSENT", value: null });
      let trustedMarkerDigest: `sha256:${string}` | null = null;
      if (markerPresent && !trustedClaim) return Object.freeze({
        status: "BOUNDED_FAILURE" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
      if (markerPresent) {
        const markerBytes = await reopen(path("marker"));
        if (markerBytes.status !== "SUCCESS") return Object.freeze({
          status: "BOUNDED_FAILURE" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
        const markerValue = parseCanonicalBytes(markerBytes.value);
        markerObservation = Object.freeze({ state: "PRESENT", value: markerValue });
        const marker = parseFarmOsDay150PrefixReferenceConsumptionMarker(markerValue);
        if (!marker || !trustedClaim || marker.pinned_migration_bundle_digest !==
          input.pinned_migration_bundle_digest ||
          marker.attempt_claim_digest !== trustedClaim.claim_digest ||
          marker.run_identity !== trustedClaim.run_identity ||
          marker.attempt_identity !== trustedClaim.attempt_identity ||
          marker.approval_reference !== trustedClaim.approval_reference ||
          marker.approval_candidate_identity !== trustedClaim.approval_candidate_identity ||
          marker.proposal_identity !== trustedClaim.proposal_identity ||
          marker.proposal_created_at !== trustedClaim.proposal_created_at ||
          marker.approved_at !== trustedClaim.approved_at ||
          marker.approval_record_digest !== trustedClaim.approval_record_digest) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
          code: "UNEXPLAINED_PREEXISTING_STATE" });
        bindLatestReadbackDigest(marker.marker_digest);
        trustedMarkerDigest = marker.marker_digest;
        provenance = Object.freeze({ run_identity: marker.run_identity,
          attempt_identity: marker.attempt_identity,
          attempt_claim_digest: marker.attempt_claim_digest });
      }
      const successReceiptState = await statPath(path("receipt"));
      if (successReceiptState.status !== "SUCCESS") return primitiveFailure(successReceiptState);
      const terminalReceiptState = await statPath(path("terminal-receipt"));
      if (terminalReceiptState.status !== "SUCCESS") return primitiveFailure(terminalReceiptState);
      const successReceiptPresent =
        (successReceiptState.value as { present?: unknown }).present === true;
      const terminalReceiptPresent =
        (terminalReceiptState.value as { present?: unknown }).present === true;
      const readObservation = async (artifactPath: string, present: boolean): Promise<
        FarmOsDay150PrefixReferenceDurableArtifactObservation | null> => {
        if (!present) return Object.freeze({ state: "ABSENT", value: null });
        const bytes = await reopen(artifactPath);
        return bytes.status === "SUCCESS" ? Object.freeze({ state: "PRESENT" as const,
          value: parseCanonicalBytes(bytes.value) }) : null;
      };
      const successObservation = await readObservation(path("receipt"), successReceiptPresent);
      const terminalObservation = await readObservation(
        path("terminal-receipt"), terminalReceiptPresent);
      if (!successObservation || !terminalObservation) return Object.freeze({
        status: "AMBIGUOUS_OUTCOME" as const, code: "DURABLE_RECONSTRUCTION_READBACK_FAILED" });
      const canonicalDurable = evaluateFarmOsDay150PrefixReferenceDurableArtifacts({
        approval: null, descriptor: activeDescriptor, claim: claimObservation,
        marker: markerObservation, success_receipt: successObservation,
        terminal_receipt: terminalObservation,
      });
      const canonicalStates = [canonicalDurable.claim_state, canonicalDurable.marker_state,
        canonicalDurable.success_receipt_state, canonicalDurable.terminal_receipt_state] as const;
      if (canonicalStates.includes("AMBIGUOUS")) return Object.freeze({
        status: "AMBIGUOUS_OUTCOME" as const, code: "DURABLE_RECONSTRUCTION_READBACK_FAILED" });
      if (canonicalStates.includes("CONFLICT") || canonicalDurable.terminal_conflict) {
        return Object.freeze({ status: "BOUNDED_FAILURE" as const,
          code: canonicalDurable.terminal_conflict
            ? "TERMINAL_RECEIPT_AUTHORITY_CONFLICT_FAIL_CLOSED"
            : "DURABLE_RECONSTRUCTION_REJECTED" });
      }
      if (trustedClaim && !markerPresent) return Object.freeze({
        status: "AMBIGUOUS_OUTCOME" as const,
        code: "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" });
      if (terminalReceiptPresent) {
        const bytes = await reopen(path("terminal-receipt"));
        if (bytes.status !== "SUCCESS") return primitiveFailure(bytes);
        const trusted = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(
          parseCanonicalBytes(bytes.value),
          activeDescriptor);
        if (!trusted || !provenance || !trustedMarkerDigest ||
          trusted.run_identity !== provenance.run_identity ||
          trusted.attempt_identity !== provenance.attempt_identity ||
          trusted.attempt_claim_digest !== provenance.attempt_claim_digest ||
          !trustedClaim ||
          trusted.approval_reference !== trustedClaim.approval_reference ||
          trusted.gate17_scope_digest !== trustedClaim.gate17_scope_digest ||
          trusted.approval_candidate_identity !== trustedClaim.approval_candidate_identity ||
          trusted.proposal_identity !== trustedClaim.proposal_identity ||
          trusted.proposal_created_at !== trustedClaim.proposal_created_at ||
          trusted.approved_at !== trustedClaim.approved_at ||
          trusted.approval_record_digest !== trustedClaim.approval_record_digest ||
          trusted.consumption_marker_digest !== trustedMarkerDigest) return Object.freeze({
            status: "BOUNDED_FAILURE" as const, code: "DURABLE_RECONSTRUCTION_REJECTED" });
        bindLatestReadbackDigest(trusted.receipt_digest);
        for (let index = 0; index < 5; index += 1) {
          const candidateState = await statPath(path(`candidate-${index + 1}`));
          if (candidateState.status !== "SUCCESS") return primitiveFailure(candidateState);
          const present = (candidateState.value as { present?: unknown }).present === true;
          if (present !== (index < trusted.candidate_count)) return Object.freeze({
            status: "BOUNDED_FAILURE" as const, code: "DURABLE_RECONSTRUCTION_REJECTED" });
          if (present) {
            const candidateBytes = await reopen(path(`candidate-${index + 1}`));
            if (candidateBytes.status !== "SUCCESS") return primitiveFailure(candidateBytes);
            const candidate = parseFarmOsDay150ExpectedCatalogCandidate(
              parseCanonicalBytes(candidateBytes.value));
            if (!candidate || candidate.reference_capture.run_id !== provenance.run_identity ||
              candidate.reference_capture.run_nonce_digest !==
                farmOsDay150AttemptRunNonceDigest(provenance.attempt_identity) ||
              candidate.candidate_identity_digest !==
                trusted.candidate_identity_digests[index]) return Object.freeze({
                  status: "BOUNDED_FAILURE" as const,
                  code: "DURABLE_RECONSTRUCTION_REJECTED" });
            bindLatestReadbackDigest(candidate.candidate_identity_digest);
          }
        }
        const preCleanupState = await statPath(path("pre-cleanup"));
        if (preCleanupState.status !== "SUCCESS") return primitiveFailure(preCleanupState);
        const preCleanupPresent = (preCleanupState.value as { present?: unknown }).present === true;
        if (preCleanupPresent !== (trusted.pre_cleanup_evidence_state === "PRESENT")) {
          return Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "DURABLE_RECONSTRUCTION_REJECTED" });
        }
        if (preCleanupPresent) {
          const preCleanupBytes = await reopen(path("pre-cleanup"));
          if (preCleanupBytes.status !== "SUCCESS") return primitiveFailure(preCleanupBytes);
          const preCleanup = parseFarmOsDay150PreCleanupRunEvidenceCandidate(
            parseCanonicalBytes(preCleanupBytes.value));
          if (!preCleanup || preCleanup.pre_cleanup_run_evidence_digest !==
            trusted.pre_cleanup_evidence_digest) return Object.freeze({
              status: "BOUNDED_FAILURE" as const, code: "DURABLE_RECONSTRUCTION_REJECTED" });
          bindLatestReadbackDigest(preCleanup.pre_cleanup_run_evidence_digest);
        }
        return Object.freeze({ status: "BOUNDED_FAILURE" as const,
          code: "TRUSTED_TERMINAL_OUTCOME_RECEIPT_RECOVERED" });
      }
      const resourceClassifications: Partial<Record<FarmOsDay150DockerResourceKind,
        FarmOsDay150DockerInspectClassification>> = {};
      for (const [kind, name] of [["container", authority.resources.container],
        ["network", authority.resources.network], ["volume", authority.resources.volume]] as const) {
        const checked = await dockerProcess([kind, "inspect", name]);
        if (checked.status !== "SUCCESS") return primitiveFailure(checked);
        resourceClassifications[kind] = classifyDockerInspect(exactProcess(checked.value), kind, name);
      }
      const aggregate = aggregateFarmOsDay150DockerResourcePreexistence({
        container: resourceClassifications.container!, network: resourceClassifications.network!,
        volume: resourceClassifications.volume!,
      });
      if (aggregate === "BLOCKED_RESOURCE_PREEXISTS") return provenance
        ? Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
          code: "KNOWN_OUTCOME_UNKNOWN_FOR_ORIGINAL_ATTEMPT" })
        : primitiveSuccess(Object.freeze({ status: "BLOCKED_RESOURCE_PREEXISTS" as const }));
      if (aggregate !== "RESOURCE_PREEXISTENCE_CLEAR") return provenance
        ? Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
          code: "KNOWN_OUTCOME_UNKNOWN_FOR_ORIGINAL_ATTEMPT" })
        : Object.freeze({ status: "BOUNDED_FAILURE" as const,
          code: "UNEXPLAINED_PREEXISTING_STATE" });
      for (const output of [path("receipt"), path("terminal-receipt"), path("pre-cleanup"),
        ...Array.from({ length: 5 }, (_, index) => path(`candidate-${index + 1}`))]) {
        const checked = await statPath(output);
        if (checked.status !== "SUCCESS") return primitiveFailure(checked);
        if ((checked.value as { present?: unknown }).present === true) {
          const existing = await reopen(output);
          if (existing.status !== "SUCCESS") return primitiveFailure(existing);
          const parsed = parseCanonicalBytes(existing.value);
          let originalAttemptBound = false;
          if (output === path("receipt")) {
            const trusted = parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(parsed);
            if (!trusted) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
              code: "DURABLE_RECONSTRUCTION_REJECTED" });
            bindLatestReadbackDigest(trusted.receipt_digest);
            originalAttemptBound = provenance !== null && trusted.run_id ===
              provenance.run_identity && trusted.run_nonce_digest ===
              farmOsDay150AttemptRunNonceDigest(provenance.attempt_identity);
          } else if (output === path("terminal-receipt")) {
            const trusted = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(
              parsed, activeDescriptor);
            if (!trusted) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
              code: "DURABLE_RECONSTRUCTION_REJECTED" });
            bindLatestReadbackDigest(trusted.receipt_digest);
            originalAttemptBound = provenance !== null &&
              trusted.run_identity === provenance.run_identity &&
              trusted.attempt_identity === provenance.attempt_identity &&
              trusted.attempt_claim_digest === provenance.attempt_claim_digest;
          } else if (output === path("pre-cleanup")) {
            const trusted = parseFarmOsDay150PreCleanupRunEvidenceCandidate(parsed);
            if (!trusted || !provenance) return Object.freeze({
              status: "BOUNDED_FAILURE" as const, code: "DURABLE_RECONSTRUCTION_REJECTED" });
            bindLatestReadbackDigest(trusted.pre_cleanup_run_evidence_digest);
            const expectedNonce = farmOsDay150AttemptRunNonceDigest(provenance.attempt_identity);
            originalAttemptBound = true;
            for (let index = 0; index < 5; index += 1) {
              const candidateBytes = await reopen(path(`candidate-${index + 1}`));
              if (candidateBytes.status !== "SUCCESS") return primitiveFailure(candidateBytes);
              const candidate = parseFarmOsDay150ExpectedCatalogCandidate(
                parseCanonicalBytes(candidateBytes.value));
              if (!candidate || candidate.reference_capture.run_id !== provenance.run_identity ||
                candidate.reference_capture.run_nonce_digest !== expectedNonce ||
                trusted.candidate_artifact_digests[index] !== adapterDigest(
                  "farmos.day150-prefix-durable-candidate-artifact.v1", candidate)) {
                originalAttemptBound = false; break;
              }
              bindLatestReadbackDigest(adapterDigest(
                "farmos.day150-prefix-durable-candidate-artifact.v1", candidate));
            }
          } else {
            const trusted = parseFarmOsDay150ExpectedCatalogCandidate(parsed);
            if (!trusted) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
              code: "DURABLE_RECONSTRUCTION_REJECTED" });
            bindLatestReadbackDigest(adapterDigest(
              "farmos.day150-prefix-durable-candidate-artifact.v1", trusted));
            originalAttemptBound = provenance !== null && trusted.reference_capture.run_id ===
              provenance.run_identity && trusted.reference_capture.run_nonce_digest ===
              farmOsDay150AttemptRunNonceDigest(provenance.attempt_identity);
          }
          if (!originalAttemptBound) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "UNEXPLAINED_PREEXISTING_STATE" });
          return output === path("receipt") ? Object.freeze({
            status: "BOUNDED_FAILURE" as const,
            code: "TRUSTED_READBACK_ALREADY_COMMITTED_FOR_ORIGINAL_ATTEMPT" }) :
            output === path("terminal-receipt") ? Object.freeze({
              status: "BOUNDED_FAILURE" as const,
              code: "TRUSTED_TERMINAL_OUTCOME_RECEIPT_RECOVERED" }) : Object.freeze({
              status: "AMBIGUOUS_OUTCOME" as const,
              code: "KNOWN_OUTCOME_UNKNOWN_FOR_ORIGINAL_ATTEMPT" });
        }
      }
      return provenance ? Object.freeze({ status: "BOUNDED_FAILURE" as const,
        code: "TRUSTED_CONSUMPTION_MARKER_RECOVERED_ORIGINAL_ATTEMPT_NO_AUTOMATIC_CONTINUATION" }) :
        primitiveSuccess(Object.freeze({ status: "READY" as const }));
    }),
    persistAttemptClaim: (claim) => semantic(async () => {
      const parsed = parseFarmOsDay150PrefixReferenceAttemptClaim(claim);
      if (!parsed || parsed.pinned_migration_bundle_digest !==
        input.pinned_migration_bundle_digest) return Object.freeze({
        status: "BOUNDED_FAILURE" as const, code: "ATTEMPT_CLAIM_FACTORY_REJECTED" });
      const present = await statPath(path("claim"));
      if (present.status !== "SUCCESS") return primitiveFailure(present);
      if ((present.value as { present?: unknown }).present === true) {
        const existingBytes = await reopen(path("claim"));
        if (existingBytes.status !== "SUCCESS") return primitiveFailure(existingBytes);
        const existing = parseFarmOsDay150PrefixReferenceAttemptClaim(
          parseCanonicalBytes(existingBytes.value));
        if (!existing || canonicalFarmOsDay150Json(existing) !==
          canonicalFarmOsDay150Json(parsed)) return Object.freeze({
          status: "BOUNDED_FAILURE" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
        bindLatestReadbackDigest(existing.claim_digest);
        provenance = Object.freeze({ run_identity: existing.run_identity,
          attempt_identity: existing.attempt_identity,
          attempt_claim_digest: existing.claim_digest });
        return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
          code: "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" });
      }
      activePublicationDigest = parsed.claim_digest;
      const published = await publish(path("claim"), parsed);
      if (published.status !== "SUCCESS") {
        if (published.status !== "AMBIGUOUS_OUTCOME" &&
          published.code !== "OUTPUT_PREEXISTS") return primitiveFailure(published);
        const existingBytes = await reopen(path("claim"));
        if (existingBytes.status !== "SUCCESS") return published.status === "AMBIGUOUS_OUTCOME"
          ? Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
            code: "ATTEMPT_CLAIM_PUBLICATION_OUTCOME_UNKNOWN" })
          : Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "UNEXPLAINED_PREEXISTING_STATE" });
        const existing = parseFarmOsDay150PrefixReferenceAttemptClaim(
          parseCanonicalBytes(existingBytes.value));
        if (!existing || canonicalFarmOsDay150Json(existing) !==
          canonicalFarmOsDay150Json(parsed)) return Object.freeze({
          status: "BOUNDED_FAILURE" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
        bindLatestReadbackDigest(existing.claim_digest);
        provenance = Object.freeze({ run_identity: existing.run_identity,
          attempt_identity: existing.attempt_identity,
          attempt_claim_digest: existing.claim_digest });
        return Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
          code: "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" });
      }
      provenance = Object.freeze({ run_identity: parsed.run_identity,
        attempt_identity: parsed.attempt_identity, attempt_claim_digest: parsed.claim_digest });
      return primitiveSuccess(parsed);
    }),
    readAttemptClaim: () => semantic(async () => {
      const bytes = await reopen(path("claim"));
      if (bytes.status !== "SUCCESS") return primitiveFailure(bytes);
      const claim = parseFarmOsDay150PrefixReferenceAttemptClaim(parseCanonicalBytes(bytes.value));
      if (!claim || claim.pinned_migration_bundle_digest !== input.pinned_migration_bundle_digest ||
        (provenance !== null && (claim.run_identity !== provenance.run_identity ||
          claim.attempt_identity !== provenance.attempt_identity ||
          claim.claim_digest !== provenance.attempt_claim_digest))) return Object.freeze({
        status: "BOUNDED_FAILURE" as const, code: "ATTEMPT_CLAIM_READBACK_REJECTED" });
      bindLatestReadbackDigest(claim.claim_digest);
      provenance = Object.freeze({ run_identity: claim.run_identity,
        attempt_identity: claim.attempt_identity, attempt_claim_digest: claim.claim_digest });
      return primitiveSuccess(claim);
    }),
    persistConsumptionMarker: (request) => semantic(async () => {
      if (!provenance || request.base.attempt_claim_digest !== provenance.attempt_claim_digest ||
        request.base.run_identity !== provenance.run_identity ||
        request.base.attempt_identity !== provenance.attempt_identity) return Object.freeze({
        status: "BOUNDED_FAILURE" as const, code: "CONSUMPTION_MARKER_CLAIM_BINDING_REJECTED" });
      const markerState = await statPath(path("marker"));
      if (markerState.status !== "SUCCESS") return primitiveFailure(markerState);
      const markerPresent = (markerState.value as { present?: unknown }).present === true;
      if (markerPresent) {
        const existing = await reopen(path("marker"));
        if (existing.status !== "SUCCESS") return primitiveFailure(existing);
        const marker = parseFarmOsDay150PrefixReferenceConsumptionMarker(
          parseCanonicalBytes(existing.value));
        if (!marker || marker.authorization_id !== request.base.authorization_id ||
          marker.authorization_revision !== request.base.authorization_revision ||
          marker.authorization_digest !== request.base.authorization_digest ||
          marker.execution_plan_digest !== request.base.execution_plan_digest ||
          marker.pinned_migration_bundle_digest !== request.base.pinned_migration_bundle_digest ||
          marker.attempt_claim_digest !== request.base.attempt_claim_digest ||
          marker.run_identity !== request.base.run_identity ||
          marker.attempt_identity !== request.base.attempt_identity) {
          return Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "UNEXPLAINED_PREEXISTING_STATE" });
        }
        provenance = Object.freeze({ run_identity: marker.run_identity,
          attempt_identity: marker.attempt_identity,
          attempt_claim_digest: marker.attempt_claim_digest });
        return primitiveSuccess(marker);
      }
      const marker = request.createFreshMarker();
      const parsedMarker = parseFarmOsDay150PrefixReferenceConsumptionMarker(marker);
      if (!parsedMarker || parsedMarker.authorization_id !== request.base.authorization_id ||
        parsedMarker.authorization_revision !== request.base.authorization_revision ||
        parsedMarker.authorization_digest !== request.base.authorization_digest ||
        parsedMarker.execution_plan_digest !== request.base.execution_plan_digest ||
        parsedMarker.pinned_migration_bundle_digest !== request.base.pinned_migration_bundle_digest ||
        parsedMarker.attempt_claim_digest !== request.base.attempt_claim_digest ||
        parsedMarker.run_identity !== request.base.run_identity ||
        parsedMarker.attempt_identity !== request.base.attempt_identity) {
        return Object.freeze({ status: "BOUNDED_FAILURE" as const,
          code: "CONSUMPTION_MARKER_FACTORY_REJECTED" });
      }
      provenance = Object.freeze({ run_identity: parsedMarker.run_identity,
        attempt_identity: parsedMarker.attempt_identity,
        attempt_claim_digest: parsedMarker.attempt_claim_digest });
      activePublicationDigest = parsedMarker.marker_digest;
      const published = await publish(path("marker"), marker);
      if (published.status !== "SUCCESS") {
        if (published.status !== "AMBIGUOUS_OUTCOME" &&
          published.code !== "OUTPUT_PREEXISTS") return primitiveFailure(published);
        const existingMarker = await reopen(path("marker"));
        if (existingMarker.status !== "SUCCESS") return published.status === "AMBIGUOUS_OUTCOME"
          ? Object.freeze({ status: "AMBIGUOUS_OUTCOME" as const,
            code: "CONSUMPTION_MARKER_PUBLICATION_UNRECONCILED_ATTEMPT_FENCED" })
          : Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "UNEXPLAINED_PREEXISTING_STATE" });
        if (canonicalFarmOsDay150Json(parseCanonicalBytes(existingMarker.value)) !==
          canonicalFarmOsDay150Json(marker)) {
          return Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "UNEXPLAINED_PREEXISTING_STATE" });
        }
        const existing = parseFarmOsDay150PrefixReferenceConsumptionMarker(
          parseCanonicalBytes(existingMarker.value));
        if (!existing || existing.attempt_identity !== parsedMarker.attempt_identity ||
          existing.run_identity !== parsedMarker.run_identity ||
          existing.attempt_claim_digest !== parsedMarker.attempt_claim_digest) {
          return Object.freeze({ status: "BOUNDED_FAILURE" as const,
            code: "UNEXPLAINED_PREEXISTING_STATE" });
        }
        bindLatestReadbackDigest(existing.marker_digest);
        provenance = Object.freeze({ run_identity: existing.run_identity,
          attempt_identity: existing.attempt_identity,
          attempt_claim_digest: existing.attempt_claim_digest });
        if (published.status === "AMBIGUOUS_OUTCOME" && published.code === "PROCESS_LOSS") {
          return primitiveFailure(published);
        }
        return primitiveSuccess(existing);
      }
      return primitiveSuccess(parsedMarker);
    }),
    readConsumptionMarker: () => semantic(async () => {
      const markerBytes = await reopen(path("marker"));
      if (markerBytes.status !== "SUCCESS") return markerBytes.status === "AMBIGUOUS_OUTCOME" ||
        markerBytes.code !== "READBACK_FAILED" ? primitiveFailure(markerBytes) : Object.freeze({
          status: "AMBIGUOUS_OUTCOME" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
      const marker = parseFarmOsDay150PrefixReferenceConsumptionMarker(
        parseCanonicalBytes(markerBytes.value));
      if (!marker || !provenance || marker.run_identity !== provenance.run_identity ||
        marker.attempt_identity !== provenance.attempt_identity ||
        marker.attempt_claim_digest !== provenance.attempt_claim_digest) return Object.freeze({
          status: "BOUNDED_FAILURE" as const, code: "UNEXPLAINED_PREEXISTING_STATE" });
      provenance = Object.freeze({ run_identity: marker.run_identity,
        attempt_identity: marker.attempt_identity,
        attempt_claim_digest: marker.attempt_claim_digest });
      return primitiveSuccess(marker);
    }),
    createOwnedNetwork: () => semantic(async () => settleMutation(await dockerProcess(["network", "create",
      authority.resources.network]), (value) => exactProcess(value).code === 0 ? null : (() => {
        throw new FarmOsDay150PrefixReferenceExecutionError("OUTCOME_UNKNOWN"); })())),
    createOwnedVolume: () => semantic(async () => settleMutation(await dockerProcess(["volume", "create",
      authority.resources.volume]), (value) => exactProcess(value).code === 0 ? null : (() => {
        throw new FarmOsDay150PrefixReferenceExecutionError("OUTCOME_UNKNOWN"); })())),
    createOwnedContainer: () => semantic(async () => settleMutation(await dockerProcess(["run", "--detach",
      "--pull=never", "--restart=no", "--platform", authority.platform, "--name",
      authority.resources.container, "--network", authority.resources.network, "--mount",
      `type=volume,source=${authority.resources.volume},target=/var/lib/postgresql/data`,
      "--publish", "127.0.0.1::5432", "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_DB",
      authority.image], { ...dockerEnvironment, POSTGRES_PASSWORD: adminPassword,
        POSTGRES_DB: authority.database }), (value) => /^[a-f0-9]{64}\s*$/u.test(
          exactProcess(value).stdout) ? null : (() => { throw new
            FarmOsDay150PrefixReferenceExecutionError("OUTCOME_UNKNOWN"); })())),
    awaitPostgresReady: () => semantic(async () => {
      const inspected = await dockerProcess(["container", "inspect", authority.resources.container]);
      if (inspected.status !== "SUCCESS") return primitiveFailure(inspected);
      const dockerResult = exactProcess(inspected.value);
      const rows = JSON.parse(dockerResult.stdout) as Array<{ NetworkSettings?: { Ports?:
        Record<string, Array<{ HostIp?: string; HostPort?: string }>> } }>;
      const binding = rows[0]?.NetworkSettings?.Ports?.["5432/tcp"]?.[0];
      port = binding?.HostIp === "127.0.0.1" ? Number(binding.HostPort) : 0;
      if (rows.length !== 1 || !Number.isSafeInteger(port) || port < 1 || port > 65_535) throw new
        FarmOsDay150PrefixReferenceExecutionError("OUTCOME_UNKNOWN");
      const policy = FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY;
      const startedResult = await monotonicNow();
      if (startedResult.status !== "SUCCESS") return primitiveFailure(startedResult);
      if (typeof startedResult.value !== "number" ||
        !Number.isFinite(startedResult.value)) return Object.freeze({
          status: "BOUNDED_FAILURE" as const, code: "POSTGRES_READINESS_PRIMITIVE_CLOCK_FAILURE" });
      const started = startedResult.value;
      for (let attempt = 1; attempt <= policy.maximum_attempts; attempt += 1) {
        const beforeResult = await monotonicNow();
        if (beforeResult.status !== "SUCCESS") return primitiveFailure(beforeResult);
        if (typeof beforeResult.value !== "number" ||
          !Number.isFinite(beforeResult.value)) return Object.freeze({
            status: "BOUNDED_FAILURE" as const, code: "POSTGRES_READINESS_PRIMITIVE_CLOCK_FAILURE" });
        const elapsedBefore = beforeResult.value - started;
        if (elapsedBefore < 0 || elapsedBefore >= policy.maximum_observation_window_milliseconds) {
          return effectFailure(new FarmOsDay150PrefixReferenceExecutionError(
            "POSTGRES_READINESS_TIMEOUT"));
        }
        const remaining = policy.maximum_observation_window_milliseconds - elapsedBefore;
        const probe = await postgres("postgres", adminPassword, ["SELECT 1 AS ready"],
          Math.max(1, Math.min(PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS, Math.floor(remaining))));
        const afterResult = await monotonicNow();
        if (afterResult.status !== "SUCCESS") return primitiveFailure(afterResult);
        if (typeof afterResult.value !== "number" ||
          !Number.isFinite(afterResult.value)) return Object.freeze({
            status: "BOUNDED_FAILURE" as const, code: "POSTGRES_READINESS_PRIMITIVE_CLOCK_FAILURE" });
        const elapsedAfter = afterResult.value - started;
        if (elapsedAfter < 0 || elapsedAfter >= policy.maximum_observation_window_milliseconds) {
          return effectFailure(new FarmOsDay150PrefixReferenceExecutionError(
            "POSTGRES_READINESS_TIMEOUT"));
        }
        if (probe.status !== "SUCCESS") return Object.freeze({ status: probe.status,
          code: `POSTGRES_READINESS_PRIMITIVE_${probe.code}` });
        const processValue = exactProcess(probe.value);
        if (processValue.code === 0) {
          let ready: unknown;
          try { ready = JSON.parse(processValue.stdout) as unknown; } catch {
            return effectFailure(new FarmOsDay150PrefixReferenceExecutionError(
              "POSTGRES_READINESS_MALFORMED_RESULT"));
          }
          if ((ready as PrimitiveChannelValue | null)?.rows?.[0]?.[0]?.ready !== 1) {
            return effectFailure(new FarmOsDay150PrefixReferenceExecutionError(
              "POSTGRES_READINESS_MALFORMED_RESULT"));
          }
          postgresReady = true;
          readinessObservation = Object.freeze({ probe_count: attempt,
            time_to_ready_milliseconds: elapsedAfter });
          return primitiveSuccess(null);
        }
        let errorCode: unknown;
        try { errorCode = (JSON.parse(processValue.stdout) as { error_code?: unknown }).error_code; }
        catch { return effectFailure(new FarmOsDay150PrefixReferenceExecutionError(
          "POSTGRES_READINESS_PROCESS_FAILURE")); }
        const classification =
          classifyFarmOsDay150PrefixReferencePostgresReadinessErrorCode(errorCode);
        if (classification !== "STARTUP_TRANSIENT") return effectFailure(
          new FarmOsDay150PrefixReferenceExecutionError(classification));
        if (attempt === policy.maximum_attempts) return effectFailure(
          new FarmOsDay150PrefixReferenceExecutionError("POSTGRES_READINESS_TIMEOUT"));
        const remainingAfter = policy.maximum_observation_window_milliseconds - elapsedAfter;
        if (remainingAfter <= policy.minimum_probe_interval_milliseconds) return effectFailure(
          new FarmOsDay150PrefixReferenceExecutionError("POSTGRES_READINESS_TIMEOUT"));
        const waited = await boundedWait(policy.minimum_probe_interval_milliseconds);
        if (waited.status !== "SUCCESS") return Object.freeze({ status: waited.status,
          code: `POSTGRES_READINESS_PRIMITIVE_${waited.code}` });
      }
      return effectFailure(new FarmOsDay150PrefixReferenceExecutionError(
        "POSTGRES_READINESS_TIMEOUT"));
    }),
    readServerMajor: () => semantic(async () => {
      if (!postgresReady) throw new FarmOsDay150PrefixReferenceExecutionError(
        "SERVER_IDENTITY_MISMATCH");
      return settle(await postgres("postgres", adminPassword,
        ["SELECT current_database()::text database, (current_setting('server_version_num')::int/10000) major"]),
      (value) => { const row = channelRows(value).rows[0]?.[0];
        if (row?.database !== authority.database || row.major !== 17) throw new
          FarmOsDay150PrefixReferenceExecutionError("SERVER_IDENTITY_MISMATCH"); return 17 as const; });
    }),
    initializeReferencePrincipals: () => semantic(async () => {
      if (!postgresReady) throw new FarmOsDay150PrefixReferenceExecutionError("SERVER_IDENTITY_MISMATCH");
      const plan = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
      const sql = `BEGIN;\n${plan.operations[1]!.sql}\nCREATE ROLE ${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME}
        LOGIN CREATEROLE NOSUPERUSER NOCREATEDB NOREPLICATION NOBYPASSRLS PASSWORD ${sqlLiteral(executorPassword)};
        GRANT ${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME} TO ${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME}
          WITH INHERIT TRUE, SET TRUE; REVOKE CONNECT, TEMPORARY ON DATABASE ${authority.database} FROM PUBLIC;
        GRANT CONNECT, CREATE ON DATABASE ${authority.database} TO ${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME};
        REVOKE CONNECT ON DATABASE postgres FROM PUBLIC; REVOKE CONNECT ON DATABASE template1 FROM PUBLIC;
        COMMIT;`;
      return settlePostgresMutation(await postgres("postgres", adminPassword, [sql],
        PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS, "TRANSACTIONAL_MUTATION"), (value) => {
        channelRows(value); return null;
      });
    }),
    applyPinnedInitialBootstrap: () => semantic(async () => {
      if (!postgresReady) throw new FarmOsDay150PrefixReferenceExecutionError("SERVER_IDENTITY_MISMATCH");
      const sql = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap().operations
        .filter((operation) => operation.kind !== "TRANSACTION_CONTROL" &&
          operation.kind !== "CREATE_REFERENCE_ROLE")
        .map((operation) => operation.sql).join("\n");
      return settlePostgresMutation(await postgres("postgres", adminPassword, [`BEGIN;\n${sql}\nCOMMIT;`],
        PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS, "TRANSACTIONAL_MUTATION"),
        (value) => { channelRows(value); return null; });
    }),
    readInitialCatalog: () => semantic(async () => {
      if (!postgresReady) throw new FarmOsDay150PrefixReferenceExecutionError("INITIAL_READBACK_MISMATCH");
      const readback = await postgres("postgres", adminPassword,
        ["BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
        "SELECT current_setting('transaction_read_only')::text AS transaction_read_only",
        initialReadbackSql, "ROLLBACK"]);
      if (readback.status !== "SUCCESS") return primitiveFailure(readback);
      const results = channelRows(readback.value).rows;
      const facts = results[1]?.[0]?.transaction_read_only === "on" ?
        exactInitialFacts(results[2] ?? []) : null;
      if (!facts) throw new FarmOsDay150PrefixReferenceExecutionError("INITIAL_READBACK_MISMATCH");
      const principal = await postgres(FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
        executorPassword, [
        "SELECT current_user::text AS current_user, current_database()::text AS database"]);
      if (principal.status !== "SUCCESS") return primitiveFailure(principal);
      const principalRow = channelRows(principal.value).rows[0]?.[0];
      if (principalRow?.current_user !== FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME ||
        principalRow.database !== authority.database) throw new
          FarmOsDay150PrefixReferenceExecutionError("SERVER_IDENTITY_MISMATCH");
      const artifact = loadFarmOsProductionIdentityQueryV5Artifact();
      if (artifact.status !== "VERIFIED") throw new FarmOsDay150PrefixReferenceExecutionError(
        "SOURCE_MISMATCH");
      sections = artifact.section_plan.filter((section) =>
        section.section_id === "F_ACL_PRINCIPAL_INVENTORY" ||
        section.section_id === "G_MIGRATION_CATALOG_INVENTORY");
      if (sections.length !== 2) throw new FarmOsDay150PrefixReferenceExecutionError("SOURCE_MISMATCH");
      executorReady = true;
      return primitiveSuccess(facts);
    }),
    executePinnedMigration: (index, migration) => semantic(async () => {
      if (!executorReady || input.pinned_migrations[index]?.migration_id !== migration.migration_id ||
        input.pinned_migrations[index]?.sql !== migration.sql) throw new
          FarmOsDay150PrefixReferenceExecutionError("SOURCE_MISMATCH");
      return settlePostgresMutation(await postgres(FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
        executorPassword, [migration.sql], PRIMITIVE_PROCESS_DEADLINE_MILLISECONDS,
        "TRANSACTIONAL_MUTATION"), (value) => { channelRows(value); return null; });
    }),
    collectCatalogSnapshot: (_index, migration_id) => semantic(async () => {
      if (!executorReady || sections.length !== 2) throw new
        FarmOsDay150PrefixReferenceExecutionError("COLLECTION_FAILED");
      const queried = await postgres(FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
        executorPassword, [
        "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY", sections[0]!.statement_sql,
        sections[1]!.statement_sql, "ROLLBACK"]);
      return settle(queried, (value) => { const rows = channelRows(value).rows;
        const raw = Object.freeze({ acl: Object.freeze({
          section_id: "F_ACL_PRINCIPAL_INVENTORY", rows: rows[1] ?? [] }),
        catalog: Object.freeze({ section_id: "G_MIGRATION_CATALOG_INVENTORY",
          rows: rows[2] ?? [] }) });
        const safe = transformFarmOsProductionIdentityCatalogReferenceResultSets(raw);
        if (!safe) throw new FarmOsDay150PrefixReferenceExecutionError("COLLECTION_FAILED");
        return Object.freeze({ migration_id, acl_result_set: safe.acl,
          catalog_result_set: safe.catalog }); });
    }),
    publishCandidate: (index, value) => semantic(async () => settle(
      await publish(path(`candidate-${index + 1}`), value), () => null)),
    readBackCandidate: (index) => semantic(async () => settleDurablePostMutationReadback(
      await reopen(path(`candidate-${index + 1}`)), parseCanonicalBytes)),
    observeExactFiveCandidateVerification: () => semantic(async () => settle(await perform({
      kind: "BOUNDED_WAIT", milliseconds: 0,
      deadline_milliseconds: PRIMITIVE_FILE_DEADLINE_MILLISECONDS }), () => null)),
    publishPreCleanupEvidence: (value) => semantic(async () => settle(
      await publish(path("pre-cleanup"), value), () => null)),
    readBackPreCleanupEvidence: () => semantic(async () => settleDurablePostMutationReadback(
      await reopen(path("pre-cleanup")), parseCanonicalBytes)),
    cleanupOwnedContainer: () => semantic(async () => {
      const removed = await dockerProcess(["container", "rm", "--force", authority.resources.container]);
      return settleMutation(removed, () => null);
    }),
    cleanupOwnedVolume: () => semantic(async () => {
      const removed = await dockerProcess(["volume", "rm", authority.resources.volume]);
      return settleMutation(removed, () => null);
    }),
    cleanupOwnedNetwork: () => semantic(async () => {
      const removed = await dockerProcess(["network", "rm", authority.resources.network]);
      return settleMutation(removed, () => null);
    }),
    verifyZeroResidual: () => semantic(async () => {
      for (const [kind, name] of [["container", authority.resources.container],
        ["volume", authority.resources.volume], ["network", authority.resources.network]] as const) {
        const checked = await dockerProcess([kind, "inspect", name]);
        if (checked.status !== "SUCCESS") return primitiveFailure(checked);
        if (classifyDockerInspect(exactProcess(checked.value), kind, name) !== "ABSENT") throw new
          FarmOsDay150PrefixReferenceExecutionError("CLEANUP_FAILED");
      }
      const value = Object.freeze({ container_removed: true as const,
        volume_removed: true as const, network_removed: true as const,
        zero_residual_verified: true as const, unrelated_resource_operations: 0 as const,
        outcome_unknown: false as const });
      return primitiveSuccess(value);
    }),
    publishFinalReceipt: (value) => semantic(async () => {
      const other = await statPath(path("terminal-receipt"));
      if (other.status !== "SUCCESS") return primitiveFailure(other);
      if ((other.value as { present?: unknown }).present === true) return Object.freeze({
        status: "BOUNDED_FAILURE" as const,
        code: "TERMINAL_RECEIPT_MUTUAL_EXCLUSION_REJECTED" });
      return settle(await publish(path("receipt"), value), () => null);
    }),
    readBackFinalReceipt: () => semantic(async () => settleDurablePostMutationReadback(
      await reopen(path("receipt")), parseCanonicalBytes)),
    publishTerminalOutcomeReceipt: (value) => semantic(async () => {
      const parsed = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(value,
        activeDescriptor);
      if (!parsed) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
        code: "TERMINAL_OUTCOME_RECEIPT_FACTORY_REJECTED" });
      const other = await statPath(path("receipt"));
      if (other.status !== "SUCCESS") return primitiveFailure(other);
      if ((other.value as { present?: unknown }).present === true) return Object.freeze({
        status: "BOUNDED_FAILURE" as const,
        code: "TERMINAL_RECEIPT_MUTUAL_EXCLUSION_REJECTED" });
      activePublicationDigest = parsed.receipt_digest;
      return settle(await publish(path("terminal-receipt"), parsed), () => null);
    }),
    readBackTerminalOutcomeReceipt: () => semantic(async () => settleDurablePostMutationReadback(
      await reopen(path("terminal-receipt")), parseCanonicalBytes)),
    closeExecutionBoundary: () => semantic(async () => {
      postgresReady = false; executorReady = false;
      return settle(await perform({ kind: "TERMINAL_CLOSE",
        deadline_milliseconds: PRIMITIVE_FILE_DEADLINE_MILLISECONDS }), () => null);
    }),
  });
  return effectPort;
}
export function createAuthorizedFarmOsDay150PrefixReferenceRealBoundary(input: Readonly<{
  execution_context: FarmOsDay150RealExecutionContextCapability | unknown;
  pinned_migrations: FarmOsDay150PinnedMigrationExecutionBundle;
  pinned_migration_bundle_digest: `sha256:${string}`;
}>): FarmOsDay150ReferenceExecutionEffectPort | null {
  const executionMode = claimFarmOsDay150RealExecutionContext(input.execution_context);
  if (!executionMode ||
    input.pinned_migrations.length !== authority.migration_history.length ||
    input.pinned_migrations.some((entry, index) =>
      entry.migration_id !== authority.migration_history[index]?.migration_id ||
      typeof entry.sql !== "string" || entry.sql.length < 1)) return null;
  const cutoverContext: PrimitiveContext = executionMode === "REAL" ? Object.freeze({
    primitive_port: createActualPrimitivePort(), artifact_root: repositoryRoot,
  }) : executionMode;
  return createSubstantiveRealReferenceAdapter({ context: cutoverContext,
    pinned_migrations: input.pinned_migrations,
    pinned_migration_bundle_digest: input.pinned_migration_bundle_digest,
    qualification: executionMode !== "REAL" });
}
