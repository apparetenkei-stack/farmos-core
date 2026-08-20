import { open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname } from "node:path";

import {
  FarmOsDay150DurablePublicationError,
  canonicalFarmOsDay150Json,
  publishFarmOsDay150BytesExclusive,
  reopenFarmOsDay150Bytes,
} from "./farm_os_day150_prefix_reference_durable_store";

export type FarmOsDay150PrimitiveResult = Readonly<{
  status: "SUCCESS";
  value: unknown;
}> | Readonly<{
  status: "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME";
  code: string;
}>;

type PrimitiveAuthority = Readonly<{
  deadline_milliseconds: number;
  operation_ref_digest: `sha256:${string}`;
}>;

export type FarmOsDay150PrimitiveRequest =
  Readonly<PrimitiveAuthority & { kind: "PROCESS"; executable: string; argv: readonly string[];
    environment: Readonly<Record<string, string>>; stdin_bytes: Uint8Array;
    max_stdin_bytes: number; max_stdout_bytes: number; max_stderr_bytes: number;
    max_process_results: 1 }> |
  Readonly<PrimitiveAuthority & { kind: "FILE_STAT"; path: string }> |
  Readonly<PrimitiveAuthority & { kind: "FILE_PUBLISH_EXCLUSIVE"; path: string;
    bytes: Uint8Array; max_write_bytes: number }> |
  Readonly<PrimitiveAuthority & { kind: "FILE_REOPEN"; path: string; max_bytes: number }> |
  Readonly<PrimitiveAuthority & { kind: "FILE_UNLINK"; path: string }> |
  Readonly<PrimitiveAuthority & { kind: "MONOTONIC_NOW" }> |
  Readonly<PrimitiveAuthority & { kind: "BOUNDED_WAIT"; milliseconds: number }> |
  Readonly<PrimitiveAuthority & { kind: "TERMINAL_CLOSE" }>;

/** The only injectable boundary below the REAL adapter. It has no FarmOS, Docker, or PostgreSQL vocabulary. */
export type FarmOsDay150PrimitiveSystemEffectPort = Readonly<{
  perform(request: FarmOsDay150PrimitiveRequest): Promise<FarmOsDay150PrimitiveResult>;
}>;

type QualificationFault = Readonly<{
  operation_ref_digest: `sha256:${string}`;
  mode: "FAILURE" | "PROCESS_LOSS" | "THROW" | "AMBIGUOUS" | "HANG" |
    "OUTPUT_LIMIT_EXCEEDED" | "DEADLINE_EXCEEDED" | "NONZERO_EXIT" |
    "MALFORMED_SUCCESS";
  phase: "BEFORE_EFFECT" | "AFTER_EFFECT_BEFORE_OBSERVATION";
  ambiguous_after_effect: boolean;
  match_ordinal: number;
}>;

const success = (value: unknown): FarmOsDay150PrimitiveResult =>
  Object.freeze({ status: "SUCCESS", value });
const bounded = (code: string): FarmOsDay150PrimitiveResult =>
  Object.freeze({ status: "BOUNDED_FAILURE", code });
const ambiguous = (code: string): FarmOsDay150PrimitiveResult =>
  Object.freeze({ status: "AMBIGUOUS_OUTCOME", code });

function exactProcessResult(value: unknown): Readonly<{
  code: number; stdout: Uint8Array; stderr: Uint8Array;
}> | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { code?: unknown; stdout?: unknown; stderr?: unknown };
  if (typeof candidate.code !== "number") return null;
  const bytes = (input: unknown): Uint8Array | null => typeof input === "string"
    ? Buffer.from(input, "utf8") : input instanceof Uint8Array ? input : null;
  const stdout = bytes(candidate.stdout);
  const stderr = bytes(candidate.stderr);
  return stdout && stderr ? Object.freeze({ code: candidate.code, stdout, stderr }) : null;
}

export function createFarmOsDay150QualificationPrimitiveEffectPort(input: Readonly<{
  process_results: readonly unknown[];
  fault: QualificationFault | null;
  persistent_effect_state_path?: string;
  reopen_mutation?: Readonly<{ path: string; kind: "MISSING" | "CORRUPT" |
    "WRONG_AUTHORIZATION" | "WRONG_PLAN_DIGEST" | "WRONG_BUNDLE_DIGEST" |
    "WRONG_RUN_ID" | "WRONG_ATTEMPT_ID" | "WRONG_CLAIM_DIGEST" }> | null;
}>): FarmOsDay150PrimitiveSystemEffectPort {
  const processResults = [...input.process_results];
  let monotonicMilliseconds = 0;
  let faultMatchOrdinal = 0;
  let reopenMutationApplied = false;
  type PersistentEffectState = Readonly<{ container: boolean; network: boolean; volume: boolean;
    container_cleanup_completed: boolean; network_cleanup_completed: boolean;
    volume_cleanup_completed: boolean }>;
  const emptyEffectState = Object.freeze({ container: false, network: false, volume: false,
    container_cleanup_completed: false, network_cleanup_completed: false,
    volume_cleanup_completed: false });
  const readEffectState = async (): Promise<PersistentEffectState> => {
    if (!input.persistent_effect_state_path) return emptyEffectState;
    try {
      const parsed = JSON.parse(await readFile(input.persistent_effect_state_path, "utf8")) as
        Partial<PersistentEffectState>;
      return Object.freeze({ container: parsed.container === true, network: parsed.network === true,
        volume: parsed.volume === true,
        container_cleanup_completed: parsed.container_cleanup_completed === true,
        network_cleanup_completed: parsed.network_cleanup_completed === true,
        volume_cleanup_completed: parsed.volume_cleanup_completed === true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyEffectState;
      throw error;
    }
  };
  const writeEffectState = async (state: PersistentEffectState): Promise<void> => {
    if (!input.persistent_effect_state_path) return;
    const target = input.persistent_effect_state_path;
    const temporary = `${target}.tmp-${process.pid}-${faultMatchOrdinal}`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(`${canonicalFarmOsDay150Json(state)}\n`, "utf8");
      await handle.sync();
    } finally { await handle.close(); }
    await rename(temporary, target);
    const directory = await open(dirname(target), "r");
    try { await directory.sync(); } finally { await directory.close(); }
  };
  const qualificationSystemProcess = async (request: Extract<FarmOsDay150PrimitiveRequest,
    Readonly<{ kind: "PROCESS" }>>): Promise<FarmOsDay150PrimitiveResult | null> => {
    if (request.executable !== "docker") return null;
    const argv = request.argv;
    const resourceKind = (["container", "network", "volume"] as const).find((kind) =>
      argv.includes(kind));
    const state = await readEffectState();
    if (resourceKind && argv.includes("inspect")) {
      if (!state[resourceKind]) {
        const name = argv.at(-1) ?? "";
        const stderr = resourceKind === "container"
          ? `Error response from daemon: No such container: ${name}\n`
          : resourceKind === "network" ? `network ${name} not found\n`
            : `get ${name}: no such volume\n`;
        return success(Object.freeze({ code: 1, stdout: Buffer.alloc(0),
          stderr: Buffer.from(stderr) }));
      }
      const stdout = resourceKind === "container" ? JSON.stringify([{ NetworkSettings: { Ports: {
        "5432/tcp": [{ HostIp: "127.0.0.1", HostPort: "55432" }] } } }]) : "[{}]";
      return success(Object.freeze({ code: 0, stdout: Buffer.from(stdout),
        stderr: Buffer.alloc(0) }));
    }
    if (resourceKind && argv.includes("create")) {
      await writeEffectState(Object.freeze({ ...state, [resourceKind]: true,
        [`${resourceKind}_cleanup_completed`]: false }));
      return success(Object.freeze({ code: 0, stdout: Buffer.from(`qualification-${resourceKind}\n`),
        stderr: Buffer.alloc(0) }));
    }
    if (argv.includes("run")) {
      await writeEffectState(Object.freeze({ ...state, container: true,
        container_cleanup_completed: false }));
      return success(Object.freeze({ code: 0, stdout: Buffer.from(`${"a".repeat(64)}\n`),
        stderr: Buffer.alloc(0) }));
    }
    if (resourceKind && argv.includes("rm")) {
      await writeEffectState(Object.freeze({ ...state, [resourceKind]: false,
        [`${resourceKind}_cleanup_completed`]: true }));
      return success(Object.freeze({ code: 0, stdout: Buffer.from(`qualification-${resourceKind}\n`),
        stderr: Buffer.alloc(0) }));
    }
    return null;
  };
  return Object.freeze({
    async perform(request): Promise<FarmOsDay150PrimitiveResult> {
      const matchingFault = input.fault?.operation_ref_digest === request.operation_ref_digest
        ? input.fault : null;
      if (matchingFault) faultMatchOrdinal += 1;
      const fault = matchingFault && faultMatchOrdinal === matchingFault.match_ordinal
        ? matchingFault : null;
      if (fault?.mode === "HANG") return new Promise(() => undefined);
      if (fault?.mode === "THROW") throw new Error("QUALIFICATION_PRIMITIVE_THROW");
      if (fault?.mode === "OUTPUT_LIMIT_EXCEEDED") return bounded("OUTPUT_LIMIT_EXCEEDED");
      if (fault?.mode === "DEADLINE_EXCEEDED") return ambiguous("DEADLINE_EXCEEDED");
      if (fault?.phase === "BEFORE_EFFECT" && fault.mode !== "NONZERO_EXIT" &&
        fault.mode !== "MALFORMED_SUCCESS") return fault.mode === "AMBIGUOUS"
        ? ambiguous("OUTCOME_UNKNOWN") : bounded(fault.mode === "PROCESS_LOSS"
          ? "PROCESS_LOSS_BEFORE_EFFECT" : "INJECTED_FAILURE");
      let settled: FarmOsDay150PrimitiveResult;
      try {
        switch (request.kind) {
          case "PROCESS": {
            if (request.stdin_bytes.byteLength > request.max_stdin_bytes) {
              settled = bounded("STDIN_LIMIT_EXCEEDED"); break;
            }
            const systemResult = await qualificationSystemProcess(request);
            if (systemResult) { settled = systemResult; break; }
            const value = exactProcessResult(processResults.shift() ?? null);
            if (!value) { settled = bounded("PROCESS_RESULT_REJECTED"); break; }
            if (value.stdout.byteLength > request.max_stdout_bytes) {
              settled = bounded("STDOUT_LIMIT_EXCEEDED"); break;
            }
            if (value.stderr.byteLength > request.max_stderr_bytes) {
              settled = bounded("STDERR_LIMIT_EXCEEDED"); break;
            }
            let qualifiedValue = value;
            try {
              const protocol = JSON.parse(Buffer.from(request.stdin_bytes).toString("utf8")) as {
                mode?: unknown };
              if (protocol.mode === "TRANSACTIONAL_MUTATION" && value.code === 0) {
                const payload = JSON.parse(Buffer.from(value.stdout).toString("utf8")) as {
                  rows?: unknown };
                if (Array.isArray(payload.rows)) qualifiedValue = Object.freeze({ ...value,
                  stdout: Buffer.from(JSON.stringify({ mutation_outcome: "MUTATION_COMMITTED",
                    rows: payload.rows })) });
              }
            } catch { /* malformed protocol remains load-bearing unknown */ }
            settled = success(qualifiedValue); break;
          }
          case "FILE_STAT": {
            const present = await stat(request.path).then(() => true, (error) => {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
              throw error;
            });
            settled = success(Object.freeze({ present })); break;
          }
          case "FILE_PUBLISH_EXCLUSIVE":
            if (request.bytes.byteLength > request.max_write_bytes) {
              settled = bounded("WRITE_LIMIT_EXCEEDED"); break;
            }
            await publishFarmOsDay150BytesExclusive(request.path, request.bytes);
            settled = success(null); break;
          case "FILE_REOPEN": {
            if (!reopenMutationApplied && input.reopen_mutation?.path === request.path) {
              reopenMutationApplied = true;
              const original = input.reopen_mutation.kind === "MISSING" ? null : JSON.parse(
                (await reopenFarmOsDay150Bytes(request.path)).toString("utf8")) as Record<string, unknown>;
              const mutatedValue = input.reopen_mutation.kind === "WRONG_AUTHORIZATION" ? {
                ...original, authorization_id: "WRONG" } :
                input.reopen_mutation.kind === "WRONG_PLAN_DIGEST" ? {
                  ...original, execution_plan_digest: `sha256:${"0".repeat(64)}` } :
                input.reopen_mutation.kind === "WRONG_BUNDLE_DIGEST" ? {
                  ...original, pinned_migration_bundle_digest: `sha256:${"1".repeat(64)}` } :
                input.reopen_mutation.kind === "WRONG_RUN_ID" ? {
                  ...original, run_identity: `sha256:${"2".repeat(64)}` } :
                input.reopen_mutation.kind === "WRONG_ATTEMPT_ID" ? {
                  ...original, attempt_identity: `sha256:${"3".repeat(64)}` } :
                input.reopen_mutation.kind === "WRONG_CLAIM_DIGEST" ? {
                  ...original, attempt_claim_digest: `sha256:${"4".repeat(64)}` } : null;
              const mutated = input.reopen_mutation.kind === "CORRUPT" ? Buffer.from("{corrupt\n") :
                mutatedValue ? Buffer.from(`${canonicalFarmOsDay150Json(mutatedValue)}\n`) : null;
              await unlink(request.path).catch(() => undefined);
              if (mutated) await publishFarmOsDay150BytesExclusive(request.path, mutated);
            }
            const bytes = await reopenFarmOsDay150Bytes(request.path);
            settled = bytes.byteLength <= request.max_bytes ? success(bytes) :
              bounded("OUTPUT_LIMIT_EXCEEDED"); break;
          }
          case "FILE_UNLINK": await unlink(request.path); settled = success(null); break;
          case "MONOTONIC_NOW": settled = success(monotonicMilliseconds); break;
          case "BOUNDED_WAIT": monotonicMilliseconds += request.milliseconds;
            settled = success(null); break;
          case "TERMINAL_CLOSE": settled = success(null); break;
        }
      } catch (error) {
        const code = error instanceof FarmOsDay150DurablePublicationError ? error.code :
          "PRIMITIVE_BOUNDED_FAILURE";
        settled = code === "OUTCOME_UNKNOWN" ? ambiguous(code) : bounded(code);
      }
      if (fault?.mode === "NONZERO_EXIT" && request.kind === "PROCESS") return success(
        Object.freeze({ code: 19, stdout: Buffer.alloc(0), stderr: Buffer.from("injected nonzero") }));
      if (fault?.mode === "MALFORMED_SUCCESS" && request.kind === "PROCESS") return success(
        Object.freeze({ code: 0, stdout: Buffer.from("not-canonical-json"), stderr: Buffer.alloc(0) }));
      if (!fault || fault.phase !== "AFTER_EFFECT_BEFORE_OBSERVATION") return settled;
      return fault.mode === "AMBIGUOUS" ||
        (fault.mode === "PROCESS_LOSS" && fault.ambiguous_after_effect)
        ? ambiguous(fault.mode === "PROCESS_LOSS" ? "PROCESS_LOSS" : "OUTCOME_UNKNOWN")
        : bounded(fault.mode === "PROCESS_LOSS" ? "PROCESS_LOSS" : "INJECTED_FAILURE");
    },
  });
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_TRANSIENT_CODES = Object.freeze([
  "ECONNREFUSED", "ECONNRESET", "EPIPE", "57P03",
  "PG_CLIENT_CONNECTION_TERMINATED_UNEXPECTEDLY",
] as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_MESSAGE =
  "Connection terminated unexpectedly" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_CODE =
  "PG_CLIENT_CONNECTION_TERMINATED_UNEXPECTEDLY" as const;

export function normalizeFarmOsDay150PrefixReferencePostgresProcessErrorCode(
  error: unknown,
): string | null {
  if (error && typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return error && typeof error === "object" &&
    (error as { message?: unknown }).message ===
      FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_MESSAGE
    ? FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_CODE : null;
}

export type FarmOsDay150PostgresMutationSettlement =
  | Readonly<{ outcome: "MUTATION_COMMITTED" }>
  | Readonly<{ outcome: "MUTATION_REJECTED_NOT_COMMITTED"; sqlstate: string }>
  | Readonly<{ outcome: "MUTATION_OUTCOME_UNKNOWN" }>;

export function parseFarmOsDay150PostgresMutationSettlement(input: Readonly<{
  exit_code: number; stdout: string;
}>): FarmOsDay150PostgresMutationSettlement {
  let value: unknown;
  try { value = JSON.parse(input.stdout); } catch {
    return Object.freeze({ outcome: "MUTATION_OUTCOME_UNKNOWN" as const });
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return Object.freeze({ outcome: "MUTATION_OUTCOME_UNKNOWN" as const });
  }
  const row = value as Record<string, unknown>;
  if (input.exit_code === 0 && row.mutation_outcome === "MUTATION_COMMITTED" &&
    Array.isArray(row.rows) && row.error_code === undefined) {
    return Object.freeze({ outcome: "MUTATION_COMMITTED" as const });
  }
  if (input.exit_code === 0 &&
    row.mutation_outcome === "MUTATION_REJECTED_NOT_COMMITTED" &&
    typeof row.error_code === "string" && /^[0-9A-Z]{5}$/u.test(row.error_code) &&
    row.rollback_acknowledged === true && row.commit_acknowledged === false &&
    row.rows === undefined) {
    return Object.freeze({ outcome: "MUTATION_REJECTED_NOT_COMMITTED" as const,
      sqlstate: row.error_code });
  }
  return Object.freeze({ outcome: "MUTATION_OUTCOME_UNKNOWN" as const });
}

export function renderFarmOsDay150PrefixReferencePostgresProcessProgram(
  applicationName: string,
): string {
  return `
import pg from "pg";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
if (!Array.isArray(request.statements) || request.statements.some((sql) => typeof sql !== "string") ||
  !["READ_ONLY_OR_NONTRANSACTIONAL", "TRANSACTIONAL_MUTATION"].includes(request.mode)) {
  throw new Error("BOUNDED_POSTGRES_REQUEST_REJECTED");
}
const mutation = request.mode === "TRANSACTIONAL_MUTATION";
const transactionEnvelopeExact = mutation && request.statements.length === 1 &&
  /^(?:\\s*--[^\\n]*(?:\\n|$))*\\s*begin\\s*;/iu.test(request.statements[0]) &&
  /commit\\s*;\\s*$/iu.test(request.statements[0]);
const client = new pg.Client({ host: process.env.PGHOST, port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE, user: process.env.PGUSER, password: process.env.PGPASSWORD,
  ssl: false, connectionTimeoutMillis: 7919, query_timeout: 41237, statement_timeout: 41237,
  application_name: ${JSON.stringify(applicationName)} });
try {
  await client.connect();
  const rows = [];
  for (const sql of request.statements) rows.push((await client.query(sql)).rows);
  process.stdout.write(JSON.stringify(mutation
    ? { mutation_outcome: "MUTATION_COMMITTED", rows }
    : { rows }));
} catch (error) {
  const errorCode = error && typeof error === "object" && typeof error.code === "string"
    ? error.code : error && typeof error === "object" &&
      error.message === ${JSON.stringify(
        FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_MESSAGE)}
      ? ${JSON.stringify(FARM_OS_DAY150_PREFIX_REFERENCE_PG_CLIENT_STARTUP_DISCONNECT_CODE)} : null;
  let rollbackAcknowledged = false;
  if (transactionEnvelopeExact && typeof errorCode === "string" && /^[0-9A-Z]{5}$/u.test(errorCode)) {
    try { await client.query("ROLLBACK"); rollbackAcknowledged = true; } catch { /* ambiguous */ }
  }
  if (rollbackAcknowledged) {
    process.stdout.write(JSON.stringify({
      mutation_outcome: "MUTATION_REJECTED_NOT_COMMITTED", error_code: errorCode,
      rollback_acknowledged: true, commit_acknowledged: false,
    }));
  } else {
    process.stdout.write(JSON.stringify({ error_code: errorCode }));
    process.exitCode = 1;
  }
} finally { await client.end().catch(() => undefined); }
`;
}
