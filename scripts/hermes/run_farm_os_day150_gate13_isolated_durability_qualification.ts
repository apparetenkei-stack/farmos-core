import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { Pool, type PoolClient } from "pg";

import {
  computeFarmOsProductionTargetExecutionApprovalDigest,
  computeFarmOsProductionTargetExecutionApprovalReceiptDigest,
  createInitialFarmOsProductionTargetExecutionApprovalRevocationHead,
  validateFarmOsProductionTargetExecutionApprovalLineage,
} from "../../src/lib/hermes/farm_os_production_target_execution_approval_authority";
import {
  validateFarmOsProductionTargetExecutionCommand,
} from "../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import {
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY,
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH,
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION,
  FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH,
  FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS,
  computeFarmOsDay150Gate13DurabilityEvidenceDigest,
  computeFarmOsDay150Gate13ImplementationIdentityDigest,
  createFarmOsDay150Gate13QualificationCaseResults,
  createFarmOsDay150Gate13QualificationResult,
  deriveFarmOsDay150Gate13DurabilityMatrix,
  parseFarmOsDay150Gate13QualificationResult,
  parseFarmOsDay150Gate13DurabilityEvidence,
  publishFarmOsDay150Gate13DurabilityEvidence,
  publishFarmOsDay150Gate13QualificationResult,
  validateFarmOsDay150Gate13DurabilityEvidenceLineage,
  type FarmOsDay150Gate13DurabilityEvidence,
  type FarmOsDay150Gate13QualificationResult,
} from "../../src/lib/hermes/farm_os_day150_gate13_durability_qualification_evidence";
import {
  claimFarmOsDay150Gate13FourthAttempt,
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH,
  createFarmOsDay150Gate13FourthAttemptAuthority,
  acquireFarmOsDay150Gate13RecoveryOwnership,
  publishFarmOsDay150Gate13ThirdAttemptTerminal,
  reopenDurableFarmOsDay150Gate13ConsumedClaim,
  parseFarmOsDay150Gate13ThirdAttemptTerminal,
  parseFarmOsDay150Gate13FourthAttemptTerminal,
  publishFarmOsDay150Gate13FourthAttemptTerminal,
  reopenDurableFarmOsDay150Gate13FourthAttemptClaim,
  type FarmOsDay150Gate13FourthAttemptClaim,
  type FarmOsDay150Gate13FourthAttemptTerminal,
  type FarmOsDay150Gate13ThirdAttemptClaim,
  type FarmOsDay150Gate13ThirdAttemptTerminal,
} from "../../src/lib/hermes/farm_os_day150_gate13_third_attempt_authority";
import {
  reopenCanonicalFarmOsDay150Artifact,
  reconcileCanonicalFarmOsDay150ArtifactDurability,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store";
import {
  createFarmOsDay150Gate13FourthExecutionSnapshot,
  loadFarmOsDay150Gate13SourceSetManifest,
  publishFarmOsDay150Gate13FourthExecutionSnapshot,
} from "../../src/lib/hermes/farm_os_day150_gate13_qualification_source_set";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";
import {
  FarmOsProductionTargetExecutionPostgresRepository,
  type FarmOsProductionTargetExecutionPostgresClient,
  type FarmOsProductionTargetExecutionPostgresPool,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_repository";
import {
  validateFarmOsProductionTargetExecutionReceipt,
} from "../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
} from "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";
import {
  FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL,
  FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE,
} from "./lib/farm_os_production_target_execution_postgres_qualification_fixture";
import {
  FARM_OS_DAY150_GATE13_PERSISTED_CLOCK_EVIDENCE_READBACK_SQL,
  parseFarmOsDay150Gate13PersistedClockEvidenceReadback,
} from "./lib/farm_os_day150_gate13_persisted_clock_evidence";
import {
  qualifyFarmOsDay150Gate13FiniteAcceptance,
  type FarmOsDay150Gate13FiniteQualification,
} from "./lib/farm_os_day150_gate13_finite_acceptance_qualification";
import {
  decideFarmOsDay150Gate13Terminal,
  isFarmOsDay150Gate13ResidualRecoveryPermitted,
  reconcileFarmOsDay150Gate13ResidualFailure,
  type FarmOsDay150Gate13CleanupObservation,
  type FarmOsDay150Gate13ResultPublicationObservation,
} from "./lib/farm_os_day150_gate13_terminal_truthfulness";
import {
  FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST,
  FarmOsDay150Gate13EndpointLeaseAuthority,
  resolveFarmOsDay150Gate13PostStartPortTopology,
  validateFarmOsDay150Gate13RequestedPortTopology,
  type FarmOsDay150Gate13EndpointLease,
} from "./lib/farm_os_day150_gate13_ephemeral_port_topology";
import {
  FARM_OS_DAY150_GATE13_OWNED_RESOURCES,
  cleanupFarmOsDay150Gate13OwnedResources,
  reconcileFarmOsDay150Gate13OwnedResource,
  settleFarmOsDay150Gate13Creation,
  type FarmOsDay150Gate13DockerCommandResult,
  type FarmOsDay150Gate13MutationAcknowledgement,
  type FarmOsDay150Gate13OwnedResourceAdapter,
} from "./lib/farm_os_day150_gate13_owned_resource_reconciliation";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const IMAGE = "docker.io/library/postgres@sha256:" +
  "7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317";
const OWNER = "farmos.day150.gate13=isolated-qualification-v1";
const CONTAINER = FARM_OS_DAY150_GATE13_OWNED_RESOURCES.container;
const NETWORK = FARM_OS_DAY150_GATE13_OWNED_RESOURCES.network;
const VOLUME = FARM_OS_DAY150_GATE13_OWNED_RESOURCES.volume;
const DATABASES = Object.freeze([
  "farmos_day150_gate13_sot_v1",
  "farmos_day150_gate13_concurrency_v1",
  "farmos_day150_gate13_recovery_v1",
] as const);
const WORKER = resolve(ROOT,
  "scripts/hermes/run_farm_os_day150_gate13_durability_readback_worker.ts");
const EVIDENCE_PATH = resolve(ROOT, FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH);
const RESOURCE_IDENTITY_DIGEST = sha256Bytes(JSON.stringify({ owner: OWNER,
  container: CONTAINER, network: NETWORK, volume: VOLUME }));

type FaultMode = "BEFORE_TARGET_WRITE" | "AFTER_COMMIT_BEFORE_ACK";

function sha256Bytes(value: string | Buffer): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}
function sha256File(path: string): `sha256:${string}` {
  return sha256Bytes(readFileSync(path));
}
function boundedFailureBoundary(error: unknown): string {
  const message = error instanceof Error ? error.message : "UNKNOWN_QUALIFICATION_FAILURE";
  return /^[A-Z0-9_:.-]{1,160}$/u.test(message) ? message : "UNBOUNDED_QUALIFICATION_FAILURE";
}
function boundedError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code: "ECONNRESET" });
}

async function docker(argv: readonly string[], allowNotFound = false): Promise<string> {
  try {
    const result = await execFileAsync("docker", [...argv], {
      cwd: ROOT, encoding: "utf8", timeout: 30_000, maxBuffer: 512 * 1024,
    });
    return result.stdout;
  } catch (error) {
    const candidate = error as { code?: number | string; stderr?: string };
    if (allowNotFound && candidate.code === 1 &&
      /(?:No such object|No such container|No such volume|not found)/iu.test(
        String(candidate.stderr))) return "ABSENT";
    throw new Error("DAY150_GATE13_DOCKER_OPERATION_FAILED");
  }
}

async function dockerRaw(argv: readonly string[], timeout = 30_000): Promise<Readonly<{
  acknowledgement: FarmOsDay150Gate13MutationAcknowledgement;
  result: FarmOsDay150Gate13DockerCommandResult;
}>> {
  try {
    const result = await execFileAsync("docker", [...argv], {
      cwd: ROOT, encoding: "utf8", timeout, maxBuffer: 512 * 1024,
    });
    return Object.freeze({ acknowledgement: "ACKNOWLEDGED" as const,
      result: Object.freeze({ exit_code: 0, stdout: result.stdout, stderr: result.stderr }) });
  } catch (error) {
    const candidate = error as { code?: number | string; stdout?: string; stderr?: string };
    return Object.freeze({ acknowledgement: candidate.code === "ENOENT"
      ? "NOT_STARTED" as const : "OUTCOME_UNKNOWN" as const,
    result: Object.freeze({ exit_code: typeof candidate.code === "number" ? candidate.code : 125,
      stdout: String(candidate.stdout ?? ""), stderr: String(candidate.stderr ?? "") }) });
  }
}

const ownedResourceAdapter: FarmOsDay150Gate13OwnedResourceAdapter = Object.freeze({
  async inspect(kind: "container" | "network" | "volume", exactName: string) {
    return (await dockerRaw([kind, "inspect", exactName], 5_000)).result;
  },
  async stopExactContainer(exactName: string) {
    return (await dockerRaw(["container", "stop", exactName])).acknowledgement;
  },
  async removeExact(kind: "container" | "network" | "volume", exactName: string) {
    return (await dockerRaw([kind, "rm", exactName])).acknowledgement;
  },
});

type NormalAttemptClaim = Pick<FarmOsDay150Gate13ThirdAttemptClaim,
  "normal_execution_not_after">;

function assertNormalExecutionFence(claim: NormalAttemptClaim): void {
  if (Date.now() >= Date.parse(claim.normal_execution_not_after)) {
    throw new Error("GATE13_NORMAL_EXECUTION_LEASE_EXPIRED_RECOVERY_REQUIRED");
  }
}

function normalFencedOwnedResourceAdapter(
  claim: NormalAttemptClaim,
): FarmOsDay150Gate13OwnedResourceAdapter {
  return Object.freeze({
    inspect: ownedResourceAdapter.inspect.bind(ownedResourceAdapter),
    async stopExactContainer(exactName: string) {
      assertNormalExecutionFence(claim);
      return ownedResourceAdapter.stopExactContainer(exactName);
    },
    async removeExact(kind: "container" | "network" | "volume", exactName: string) {
      assertNormalExecutionFence(claim);
      return ownedResourceAdapter.removeExact(kind, exactName);
    },
  });
}

async function createAndReconcileOwnedResource(kind: "container" | "network" | "volume",
  argv: readonly string[], claim: NormalAttemptClaim): Promise<void> {
  assertNormalExecutionFence(claim);
  const command = await dockerRaw(argv);
  const settled = await settleFarmOsDay150Gate13Creation({ adapter: ownedResourceAdapter, kind,
    acknowledgement: command.acknowledgement });
  process.stdout.write(`${JSON.stringify({ event: "DAY150_GATE13_RESOURCE_CREATION_RECONCILIATION",
    resource_kind: kind, command_acknowledgement: command.acknowledgement,
    settlement: settled.outcome, resource_state: settled.resource.state })}\n`);
  if (settled.outcome !== "CREATED_ACKNOWLEDGED") {
    throw new Error(`DAY150_GATE13_${kind.toUpperCase()}_CREATION_${settled.outcome}`);
  }
}

function pgPool(endpointAuthority: FarmOsDay150Gate13EndpointLeaseAuthority,
  endpointLease: FarmOsDay150Gate13EndpointLease, database: string): Pool {
  const endpoint = endpointAuthority.endpointForConnection(endpointLease);
  return new Pool({ host: endpoint.host, port: endpoint.port, database, user: "postgres", max: 8,
    connectionTimeoutMillis: 5_000, idleTimeoutMillis: 1_000 });
}

async function waitForPostgres(endpointAuthority: FarmOsDay150Gate13EndpointLeaseAuthority,
  endpointLease: FarmOsDay150Gate13EndpointLease): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const pool = pgPool(endpointAuthority, endpointLease, "postgres");
    try {
      await pool.query("select 1 as ready");
      await pool.end();
      return;
    } catch {
      await pool.end().catch(() => undefined);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
    }
  }
  throw new Error("DAY150_GATE13_POSTGRES_READINESS_FAILED");
}

async function resolvePublishedPostgresEndpoint(
  endpointAuthority: FarmOsDay150Gate13EndpointLeaseAuthority,
): Promise<FarmOsDay150Gate13EndpointLease> {
  const requested = validateFarmOsDay150Gate13RequestedPortTopology(
    FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST);
  if (!requested.accepted) throw new Error("DAY150_GATE13_PORT_REQUEST_INVALID");
  const result = await resolveFarmOsDay150Gate13PostStartPortTopology({
    async read_inspect(timeout) {
      const raw = await dockerRaw(["container", "inspect", CONTAINER], timeout);
      if (raw.result.exit_code !== 0) throw new Error("CONTAINER_INSPECT_FAILED");
      return raw.result.stdout;
    },
    bounded_wait: async (milliseconds) => new Promise((resolvePromise) =>
      setTimeout(resolvePromise, milliseconds)),
    monotonic_now: () => performance.now(), maximum_elapsed_milliseconds: 10_000,
    maximum_attempts: 40,
  });
  process.stdout.write(`${JSON.stringify({
    event: result.accepted ? "DAY150_GATE13_BOUNDED_PORT_TOPOLOGY" :
      "DAY150_GATE13_BOUNDED_PORT_TOPOLOGY_FAILURE",
    requested_topology: requested,
    container_lifecycle: "DOCKER_RUN_DETACHED_CREATE_AND_START_COMPLETED",
    inspect_phase: "POST_START", inspect_attempt_count: result.attempt_count,
    first_inspect: result.first_evidence,
    final_inspect: result.accepted ? result.topology.evidence : result.final_evidence,
    reason: result.accepted ? null : result.reason,
  })}\n`);
  if (!result.accepted) {
    throw new Error(`DAY150_GATE13_PORT_READBACK_FAILED:${result.reason}`);
  }
  return endpointAuthority.issueFromFreshInspect(result.topology);
}

async function setupDatabase(endpointAuthority: FarmOsDay150Gate13EndpointLeaseAuthority,
  endpointLease: FarmOsDay150Gate13EndpointLease,
  database: string): Promise<Pool> {
  const admin = pgPool(endpointAuthority, endpointLease, "postgres");
  await admin.query(`create database ${database}`);
  await admin.end();
  const pool = pgPool(endpointAuthority, endpointLease, database);
  for (const ddl of FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL) await pool.query(ddl);
  await pool.query(readFileSync(resolve(ROOT,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH), "utf8"));
  await pool.query(`insert into core_schema.migration_history
    (migration_id, sequence, checksum, description, applied_at, applied_by, execution_id)
    values ($1, 202608110001, $2, 'Day150 Gate13 isolated qualification',
      pg_catalog.clock_timestamp(), 'day150_gate13_qualification', $3)`,
  [FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
    `day150-gate13-${database}`]);
  await pool.query(readFileSync(resolve(ROOT,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH), "utf8"));
  return pool;
}

class FaultInjectingPool implements FarmOsProductionTargetExecutionPostgresPool {
  constructor(private readonly pool: Pool, private readonly mode: FaultMode,
    private readonly target: string) {}
  async connect(): Promise<FarmOsProductionTargetExecutionPostgresClient> {
    const client = await this.pool.connect();
    let targetReached = false;
    return {
      query: async <Row extends Record<string, unknown>>(text: string,
        values?: readonly unknown[]) => {
        if (text.includes(this.target)) {
          if (this.mode === "BEFORE_TARGET_WRITE") throw boundedError("BEFORE_TARGET_WRITE");
          targetReached = true;
        }
        const result = await client.query(text, values as unknown[] | undefined);
        if (this.mode === "AFTER_COMMIT_BEFORE_ACK" && targetReached &&
          text.trim().toLowerCase() === "commit") throw boundedError("COMMIT_ACK_LOST");
        return result as unknown as Awaited<ReturnType<
          FarmOsProductionTargetExecutionPostgresClient["query"]>> as never;
      },
      release: () => client.release(),
    };
  }
}

function repository(pool: Pool | FarmOsProductionTargetExecutionPostgresPool) {
  return new FarmOsProductionTargetExecutionPostgresRepository({
    pool: pool as unknown as FarmOsProductionTargetExecutionPostgresPool,
  });
}

const fixture = FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE;
const clock = fixture.clock_evidence;
const storeClockFloor = clock.observed_at;

async function readPersistedClockEvidence(pool: Pool) {
  const rows = await pool.query<{ result: unknown }>(
    FARM_OS_DAY150_GATE13_PERSISTED_CLOCK_EVIDENCE_READBACK_SQL,
    [clock.evidence_id, clock.evidence_digest],
  );
  const readback = rows.rowCount === 1 ?
    parseFarmOsDay150Gate13PersistedClockEvidenceReadback({ value: rows.rows[0]?.result,
      expected_evidence_id: clock.evidence_id, expected_evidence_digest: clock.evidence_digest,
      required_lower_bound: clock.observed_lower_bound }) : null;
  if (!readback) throw new Error("CLOCK_EVIDENCE_INVALID");
  return readback;
}

async function seed(pool: Pool) {
  const store = repository(pool);
  assert.equal((await store.appendProposal({ proposal: fixture.proposal,
    expected_absent_proposal_id: fixture.proposal.proposal_id, clock_evidence: clock,
    expected_persisted_clock_lower_bound: null, expected_clock_floor_version: 0,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true })).status, "STORED");
  assert.equal((await store.appendApprovalAndReceipt({ proposal_id: fixture.proposal.proposal_id,
    expected_proposal_digest: fixture.proposal.proposal_digest, expected_proposal_revision: 1,
    approval: fixture.approval, approval_receipt: fixture.approval_receipt,
    initial_revocation_head: fixture.revocation_head, clock_evidence: clock,
    expected_persisted_clock_lower_bound: storeClockFloor, expected_clock_floor_version: 1,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true })).status, "STORED");
  assert.equal((await store.appendCommand({ command: fixture.command,
    expected_approval_id: fixture.approval.approval_id,
    expected_approval_digest: fixture.approval.approval_digest,
    expected_approval_receipt_id: fixture.approval_receipt.approval_receipt_id,
    expected_approval_receipt_digest: fixture.approval_receipt.approval_receipt_digest,
    expected_nonce_absent: fixture.command.nonce_digest })).status, "STORED");
  return store;
}

function reserveInput(clockFloorVersion: number) {
  return Object.freeze({ command: fixture.command,
    expected_command_record_digest: fixture.command.command_record_digest,
    expected_execution_binding_digest: fixture.command.execution_binding_digest,
    expected_approval_id: fixture.approval.approval_id,
    expected_approval_digest: fixture.approval.approval_digest,
    expected_approval_receipt_id: fixture.approval_receipt.approval_receipt_id,
    expected_approval_receipt_digest: fixture.approval_receipt.approval_receipt_digest,
    expected_approval_revocation_head_version: fixture.revocation_head.head_version,
    expected_approval_revocation_head_digest: fixture.revocation_head.head_digest,
    expected_approval_revocation_latest_event_digest: null,
    expected_approval_unbound_to_any_command: true as const,
    expected_phase_b_authority_bundle_digest: fixture.command.phase_b_authority_bundle_digest,
    expected_target_binding_digest: fixture.command.target_binding_digest,
    expected_lifecycle_state: "UNRESERVED" as const, expected_lifecycle_version: 0 as const,
    clock_evidence: clock, expected_persisted_clock_lower_bound: storeClockFloor,
    expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const,
    required_revalidation_provenance:
      "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION" as const });
}

function attemptInput(clockFloorVersion: number) {
  return Object.freeze({ command_id: fixture.command.command_id,
    execution_binding_digest: fixture.command.execution_binding_digest,
    reservation_id: fixture.reservation.reservation_id,
    reservation_digest: fixture.reservation.reservation_digest,
    attempt_id: fixture.attempt.attempt_id, attempt_digest: fixture.attempt.attempt_digest,
    expected_lifecycle_state: "RESERVED_NOT_STARTED" as const,
    expected_lifecycle_version: 1, expected_approval_digest: fixture.approval.approval_digest,
    expected_approval_revocation_head_version: 0,
    expected_approval_revocation_head_digest: fixture.revocation_head.head_digest,
    expected_approval_revocation_latest_event_digest: null,
    expected_command_record_digest: fixture.command.command_record_digest,
    expected_phase_b_authority_bundle_digest: fixture.command.phase_b_authority_bundle_digest,
    expected_target_binding_digest: fixture.command.target_binding_digest,
    clock_evidence: clock, expected_persisted_clock_lower_bound: storeClockFloor,
    expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const,
    required_revalidation_provenance:
      "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION" as const });
}

function finalizationInput(clockFloorVersion: number) {
  return Object.freeze({ command_id: fixture.command.command_id,
    execution_binding_digest: fixture.command.execution_binding_digest,
    reservation_id: fixture.reservation.reservation_id,
    reservation_digest: fixture.reservation.reservation_digest,
    attempt_id: fixture.attempt.attempt_id, attempt_digest: fixture.attempt.attempt_digest,
    expected_lifecycle_state: "ATTEMPT_STARTED" as const, expected_lifecycle_version: 2,
    receipt: fixture.receipt, expected_receipt_absent: fixture.receipt.receipt_id,
    clock_evidence: clock, expected_persisted_clock_lower_bound: storeClockFloor,
    expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const });
}

async function runWorker(endpointAuthority: FarmOsDay150Gate13EndpointLeaseAuthority,
  endpointLease: FarmOsDay150Gate13EndpointLease, database: string,
  revocation: Record<string, unknown> | null,
  receipt = false): Promise<Record<string, unknown>> {
  const endpoint = endpointAuthority.endpointForConnection(endpointLease);
  const input = JSON.stringify({ host: endpoint.host, port: endpoint.port, database,
    approval_id: fixture.approval.approval_id,
    approval_receipt_id: fixture.approval_receipt.approval_receipt_id,
    command_id: fixture.command.command_id,
    execution_binding_digest: fixture.command.execution_binding_digest,
    receipt_id: receipt ? fixture.receipt.receipt_id : null,
    receipt_digest: receipt ? fixture.receipt.receipt_digest : null,
    clock_evidence_id: clock.evidence_id, clock_evidence_digest: clock.evidence_digest,
    required_clock_lower_bound: clock.observed_lower_bound, revocation });
  const child = await new Promise<{ code: number | null; stdout: string }>((resolvePromise,
    rejectPromise) => {
    const spawned = execFile(process.execPath, ["--import", "tsx", WORKER], {
      cwd: ROOT, encoding: "utf8", timeout: 20_000, maxBuffer: 128 * 1024,
      env: { PATH: process.env.PATH ?? "", NODE_NO_WARNINGS: "1" },
    }, (error, stdoutValue) => error ? rejectPromise(new Error("READBACK_WORKER_FAILED")) :
      resolvePromise({ code: 0, stdout: stdoutValue }));
    spawned.stdin?.end(input);
  });
  if (child.code !== 0) throw new Error("READBACK_WORKER_FAILED");
  return JSON.parse(child.stdout) as Record<string, unknown>;
}

async function cleanup(input: Readonly<{
  mode: "NORMAL" | "RECOVERY";
  claim: NormalAttemptClaim;
}>) {
  const adapter = input.mode === "NORMAL"
    ? normalFencedOwnedResourceAdapter(input.claim) : ownedResourceAdapter;
  const result = await cleanupFarmOsDay150Gate13OwnedResources(adapter);
  process.stdout.write(`${JSON.stringify({ event: "DAY150_GATE13_RESOURCE_CLEANUP_RECONCILIATION",
    ...result })}\n`);
  return result;
}

function buildPassEvidence(input: Readonly<{
  claim: FarmOsDay150Gate13FourthAttemptClaim;
  terminal: FarmOsDay150Gate13FourthAttemptTerminal;
  result: FarmOsDay150Gate13QualificationResult;
}>): FarmOsDay150Gate13DurabilityEvidence {
  const currentSourceSet = loadFarmOsDay150Gate13SourceSetManifest(ROOT);
  if (currentSourceSet.qualification_source_set_digest !== input.claim.source_set_digest ||
    input.terminal.qualification_result !== "QUALIFICATION_SUCCESS" ||
    input.terminal.zero_residual !== true || input.result.cleanup_zero_residual !== true ||
    input.result.qualification_source_set_digest !== input.claim.source_set_digest ||
    input.result.qualification_result_digest !== input.terminal.qualification_result_digest) {
    throw new Error("GATE13_PASS_COMPLETION_DURABLE_LINEAGE_INVALID");
  }
  const implementation = Object.freeze({
    persistence_port_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
    postgres_schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION,
    migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
    migration_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
    repository_source_sha256: sha256File(resolve(ROOT,
      "src/lib/hermes/farm_os_production_target_execution_postgres_repository.ts")),
    qualification_source_sha256: sha256File(resolve(ROOT,
      "scripts/hermes/run_farm_os_day150_gate13_isolated_durability_qualification.ts")),
    postgres_major: 17 as const,
    image: IMAGE as `docker.io/library/postgres@sha256:${string}`,
    platform: input.result.platform,
  });
  if (computeFarmOsDay150Gate13ImplementationIdentityDigest(implementation) !==
    input.result.implementation_identity_digest) {
    throw new Error("GATE13_PASS_COMPLETION_IMPLEMENTATION_IDENTITY_MISMATCH");
  }
  const material = Object.freeze({
    schema_version: FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_SCHEMA_VERSION,
    authority_id: FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_AUTHORITY,
    authority_revision: 1 as const,
    evidence_classification: "DAY150_GATE13_ISOLATED_STORAGE_QUALIFICATION_EVIDENCE" as const,
    qualification_scope: "DAY150_GATE2_GATE13_ONLY" as const,
    qualification_source_set_digest: input.claim.source_set_digest,
    execution_snapshot_digest: input.claim.execution_snapshot_digest,
    qualification_result_digest: input.result.qualification_result_digest,
    case_results: input.result.case_results,
    finite_executed_case_results: input.result.finite_executed_case_results, implementation,
    case_counts: Object.freeze({ ...input.result.case_counts, evidence: 31 as const }),
    finite_case_counts: input.result.finite_case_counts,
    d5_recovery_result: input.result.d5_recovery_result,
    durability_matrix: deriveFarmOsDay150Gate13DurabilityMatrix({
      case_results: input.result.case_results,
      finite_executed_case_results: input.result.finite_executed_case_results,
      d5_recovery_result: input.result.d5_recovery_result,
    }) as FarmOsDay150Gate13DurabilityEvidence["durability_matrix"],
    isolated_storage: Object.freeze({ class: "DISPOSABLE_LOCAL_POSTGRESQL_VOLUME" as const,
      identity_digest: sha256Bytes(JSON.stringify({ container: CONTAINER, network: NETWORK,
        volume: VOLUME, databases: 21 })), database_count: 21 as const,
      production: false as const, canonical: false as const,
      authoritative_root_access: false as const }),
    attempt_authority: Object.freeze({ attempt_identity: input.claim.attempt_identity,
      claim_digest: input.claim.claim_digest, terminal_digest: input.terminal.terminal_digest,
      execution_snapshot_digest: input.claim.execution_snapshot_digest,
      attempt_consumed: true as const, attempt_ordinal: 4 as const,
      automatic_retry_count: 0 as const, fifth_attempt_authorized: false as const }),
    approval_sot: Object.freeze({ exact_write: "PASS" as const,
      exact_readback: "PASS" as const, canonical_parser: "PASS" as const,
      canonical_digest: "PASS" as const, duplicate_identical: "EXISTING_IDENTICAL" as const,
      conflicting_approval: "FAIL_CLOSED" as const,
      revocation_append_and_readback: "PASS" as const,
      fresh_process_reconstruction: "PASS" as const, process_memory_authority: false as const }),
    command_receipt_lineage: Object.freeze({ command_write_readback: "PASS" as const,
      reservation_lineage: "PASS" as const, attempt_lineage: "PASS" as const,
      terminal_receipt_lineage: "PASS" as const,
      fresh_process_reconstruction: "PASS" as const, automatic_retry_count: 0 as const }),
    concurrency: Object.freeze({ contenders: 2 as const, durable_winners: 1 as const,
      durable_reservation_rows: 1 as const, losing_contender: "FAIL_CLOSED" as const,
      replay_after_restart: "REJECTED" as const, split_brain: false as const }),
    crash_ack_loss_restart: Object.freeze({
      before_durable_write: "ABSENT_AFTER_TRUSTED_READBACK" as const,
      commit_ack_loss: "OUTCOME_UNKNOWN_PRESERVED" as const,
      after_durable_write_before_ack: "DURABLE_STATE_RECONSTRUCTED" as const,
      attempt_ack_loss: "OUTCOME_UNKNOWN_PRESERVED" as const,
      container_restart: "PASS" as const, fresh_process_restart: "PASS" as const,
      conflicting_state_after_restart: "FAIL_CLOSED" as const }),
    cleanup: Object.freeze({ container: "ABSENT" as const, network: "ABSENT" as const,
      volume: "ABSENT" as const, zero_residual: true as const,
      unrelated_resources_touched: 0 as const }),
    operation_counts: Object.freeze({ qualification_docker_runs: 1 as const,
      isolated_migration_applications: 21 as const, production: 0 as const,
      canonical: 0 as const, b2: 0 as const, formal_gate2: 0 as const }),
    started_at: input.result.started_at, completed_at: input.result.completed_at,
  });
  return Object.freeze({ ...material,
    evidence_digest: computeFarmOsDay150Gate13DurabilityEvidenceDigest(material) });
}

async function completePassEvidenceWithoutQualificationRerun(): Promise<void> {
  if (existsSync(EVIDENCE_PATH)) {
    const existing = await reopenCanonicalFarmOsDay150Artifact(EVIDENCE_PATH);
    const parsed = parseFarmOsDay150Gate13DurabilityEvidence(existing);
    if (!parsed || !await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
      repository_root: ROOT, evidence: parsed })) {
      throw new Error("DAY150_GATE13_EXISTING_EVIDENCE_INVALID");
    }
    await reconcileCanonicalFarmOsDay150ArtifactDurability(EVIDENCE_PATH, parsed);
    const trusted = await reopenCanonicalFarmOsDay150Artifact(EVIDENCE_PATH);
    if (!await validateFarmOsDay150Gate13DurabilityEvidenceLineage({
      repository_root: ROOT, evidence: trusted })) {
      throw new Error("DAY150_GATE13_EXISTING_EVIDENCE_TRUSTED_REOPEN_FAILED");
    }
    process.stdout.write(`${JSON.stringify({ status: "PASS_EVIDENCE_DURABILITY_RECONCILED",
      qualification_reruns: 0, docker_mutations: 0, evidence_digest: parsed.evidence_digest })}\n`);
    return;
  }
  const claim = await reopenDurableFarmOsDay150Gate13FourthAttemptClaim({ repository_root: ROOT });
  const terminal = parseFarmOsDay150Gate13FourthAttemptTerminal(
    await reopenCanonicalFarmOsDay150Artifact(resolve(ROOT,
      FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH)));
  const result = parseFarmOsDay150Gate13QualificationResult(
    await reopenCanonicalFarmOsDay150Artifact(resolve(ROOT,
      FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH)));
  if (!terminal || !result) throw new Error("GATE13_PASS_COMPLETION_RECORD_MISSING_OR_INVALID");
  const evidence = buildPassEvidence({ claim, terminal, result });
  await publishFarmOsDay150Gate13DurabilityEvidence({ repository_root: ROOT, evidence });
  process.stdout.write(`${JSON.stringify({ status: "PASS_EVIDENCE_COMPLETED_FROM_DURABLE_RECORDS",
    qualification_reruns: 0, docker_mutations: 0, evidence_digest: evidence.evidence_digest })}\n`);
}

async function recoverConsumedAttempt(): Promise<void> {
  const terminalPath = resolve(ROOT, FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH);
  const existingTerminal = existsSync(terminalPath)
    ? parseFarmOsDay150Gate13ThirdAttemptTerminal(
      await reopenCanonicalFarmOsDay150Artifact(terminalPath)) : null;
  if (existsSync(terminalPath) && (!existingTerminal ||
    !isFarmOsDay150Gate13ResidualRecoveryPermitted(existingTerminal))) {
    throw new Error("GATE13_RECOVERY_TERMINAL_NOT_RECOVERABLE");
  }
  const claim = await reopenDurableFarmOsDay150Gate13ConsumedClaim({ repository_root: ROOT });
  if (existingTerminal) {
    const recovered = await reconcileFarmOsDay150Gate13ResidualFailure({
      terminal: existingTerminal,
      acquire_recovery_ownership: async () => { await acquireFarmOsDay150Gate13RecoveryOwnership({
        repository_root: ROOT, claim, resource_identity_digest: RESOURCE_IDENTITY_DIGEST,
        acquired_at: new Date().toISOString() }); },
      reconcile_owned_resources: async () => cleanup({ mode: "RECOVERY", claim }),
    });
    process.stdout.write(`${JSON.stringify({ status: "RECOVERY_RECONCILED_EXISTING_TERMINAL",
      ...recovered, automatic_retries: 0 })}\n`);
    return;
  }
  await acquireFarmOsDay150Gate13RecoveryOwnership({ repository_root: ROOT, claim,
    resource_identity_digest: RESOURCE_IDENTITY_DIGEST, acquired_at: new Date().toISOString() });
  if (!existingTerminal && existsSync(terminalPath)) {
    throw new Error("GATE13_RECOVERY_TERMINAL_APPEARED_AFTER_OWNERSHIP");
  }
  let zeroResidual = false;
  let failureBoundary = "RECOVERY_TERMINALIZED_CONSUMED_ATTEMPT";
  try { zeroResidual = (await cleanup({ mode: "RECOVERY", claim })).zero_residual; }
  catch { failureBoundary = "RECOVERY_CLEANUP_OUTCOME_UNKNOWN"; }
  const resultDigest = sha256Bytes(JSON.stringify({ mode: "RECOVERY_NO_RERUN",
    claim_digest: claim.claim_digest, zero_residual: zeroResidual, failure_boundary: failureBoundary }));
  const terminal = await publishFarmOsDay150Gate13ThirdAttemptTerminal({
    repository_root: ROOT, claim, qualification_result: "QUALIFICATION_OUTCOME_UNKNOWN",
    qualification_result_digest: resultDigest, failure_boundary: failureBoundary,
    zero_residual: zeroResidual, completed_at: new Date().toISOString() });
  process.stdout.write(`${JSON.stringify({ status: "RECOVERY_TERMINALIZED",
    qualification_reruns: 0, automatic_retries: 0, terminal_digest: terminal.terminal_digest,
    terminal_history_rewrites: 0, original_terminal_preserved: false,
    recovery_zero_residual: zeroResidual, zero_residual: terminal.zero_residual })}\n`);
}

async function preflightD1ClockBinding(): Promise<void> {
  const preflight = await Promise.all((["container", "network", "volume"] as const)
    .map((kind) => reconcileFarmOsDay150Gate13OwnedResource(ownedResourceAdapter, kind)));
  if (!preflight.every((entry) => entry.state === "ABSENT")) {
    throw new Error("DAY150_GATE13_RESOURCE_PREEXISTENCE_CONFLICT");
  }
  const lease = Object.freeze({ normal_execution_not_after:
    new Date(Date.now() + 30 * 60 * 1000).toISOString() });
  const endpointAuthority = new FarmOsDay150Gate13EndpointLeaseAuthority();
  let pool: Pool | null = null;
  let zeroResidual = false;
  try {
    await createAndReconcileOwnedResource("network",
      ["network", "create", "--label", OWNER, NETWORK], lease);
    await createAndReconcileOwnedResource("volume",
      ["volume", "create", "--label", OWNER, VOLUME], lease);
    await createAndReconcileOwnedResource("container", ["run", "-d", "--name", CONTAINER,
      "--label", OWNER, "--network", NETWORK,
      "--mount", `source=${VOLUME},target=/var/lib/postgresql/data`,
      "-p", FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST,
      "-e", "POSTGRES_HOST_AUTH_METHOD=trust", IMAGE], lease);
    const endpointLease = await resolvePublishedPostgresEndpoint(endpointAuthority);
    await waitForPostgres(endpointAuthority, endpointLease);
    pool = await setupDatabase(endpointAuthority, endpointLease,
      "farmos_day150_gate13_d1_clock_preflight");
    const store = await seed(pool);
    const persistedClock = await readPersistedClockEvidence(pool);
    const lineage = await store.readApprovalLineage({ approval_id: fixture.approval.approval_id,
      approval_receipt_id: fixture.approval_receipt.approval_receipt_id });
    assert.ok(lineage);
    assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({ ...lineage,
      clock_evidence: persistedClock.evidence,
      persisted_clock_lower_bound: persistedClock.persisted_observed_lower_bound }).accepted, true);
    assert.equal((await store.tryReserveWithApprovalRevalidation(reserveInput(2))).status,
      "RESERVED");
    const reconstructed = await runWorker(endpointAuthority, endpointLease,
      "farmos_day150_gate13_d1_clock_preflight", null);
    assert.equal(reconstructed.approval_validated, true);
    assert.equal(reconstructed.command_validated, true);
    assert.equal(reconstructed.lifecycle_state, "RESERVED_NOT_STARTED");
    assert.equal(reconstructed.clock_evidence_validated, true);
    assert.equal(reconstructed.persisted_observed_lower_bound, clock.observed_lower_bound);
  } finally {
    await pool?.end().catch(() => undefined);
    zeroResidual = (await cleanupFarmOsDay150Gate13OwnedResources(
      normalFencedOwnedResourceAdapter(lease))).zero_residual;
  }
  if (!zeroResidual) throw new Error("DAY150_GATE13_D1_PREFLIGHT_ZERO_RESIDUAL_NOT_ESTABLISHED");
  process.stdout.write(`${JSON.stringify({ status: "PASS", mode: "D1_CLOCK_BINDING_PREFLIGHT",
    clock_evidence_invalid: "ABSENT", D1: "PASS", proposal: "PASS",
    human_approval: "PASS", durable_approval_readback: "PASS",
    persisted_clock_evidence_readback: "PASS", one_shot_reservation: "PASS",
    canonical_lineage: "PASS", fresh_process_reconstruction: "PASS",
    zero_residual: true, production: 0, canonical: 0, b2: 0, formal_gate2: 0 })}\n`);
}

async function main(): Promise<void> {
  if (existsSync(EVIDENCE_PATH)) throw new Error("DAY150_GATE13_EVIDENCE_ALREADY_EXISTS_NO_REPLAY");
  const preflight = await Promise.all((["container", "network", "volume"] as const)
    .map((kind) => reconcileFarmOsDay150Gate13OwnedResource(ownedResourceAdapter, kind)));
  if (!preflight.every((entry) => entry.state === "ABSENT")) {
    throw new Error("DAY150_GATE13_RESOURCE_PREEXISTENCE_CONFLICT");
  }
  const startedAt = new Date().toISOString();
  const pools: Pool[] = [];
  let qualificationPassed = false;
  let finiteQualification: FarmOsDay150Gate13FiniteQualification | null = null;
  const provenCases = new Set<typeof FARM_OS_DAY150_GATE13_REQUIRED_CASE_IDS[number]>();
  let cleanupAuthorityOwned = false;
  let attemptClaim: FarmOsDay150Gate13FourthAttemptClaim | null = null;
  let attemptTerminal: FarmOsDay150Gate13FourthAttemptTerminal | null = null;
  let qualificationFailure: unknown = null;
  let cleanupFailure: unknown = null;
  let zeroResidual = false;
  const endpointAuthority = new FarmOsDay150Gate13EndpointLeaseAuthority();
  let endpointLease: FarmOsDay150Gate13EndpointLease;
  let platform: "linux/arm64/v8" | "linux/amd64" = "linux/arm64/v8";
  try {
    const image = JSON.parse(await docker(["image", "inspect", IMAGE])) as
      readonly { Id?: string; Os?: string; Architecture?: string; Variant?: string }[];
    assert.equal(image.length, 1); assert.equal(image[0]?.Id, IMAGE.split("@")[1]);
    assert.equal(image[0]?.Os, "linux");
    if (image[0]?.Architecture === "amd64" && image[0]?.Variant === undefined) {
      platform = "linux/amd64";
    } else if (image[0]?.Architecture === "arm64" && image[0]?.Variant === "v8") {
      platform = "linux/arm64/v8";
    } else throw new Error("DAY150_GATE13_IMAGE_PLATFORM_UNSUPPORTED");
    const sourceSet = loadFarmOsDay150Gate13SourceSetManifest(ROOT);
    const executionSnapshot = await publishFarmOsDay150Gate13FourthExecutionSnapshot({
      repository_root: ROOT,
      snapshot: createFarmOsDay150Gate13FourthExecutionSnapshot(sourceSet),
    });
    const attemptAuthority = createFarmOsDay150Gate13FourthAttemptAuthority({
      source_set_digest: sourceSet.qualification_source_set_digest,
      execution_snapshot_digest: executionSnapshot.execution_snapshot_digest,
    });
    attemptClaim = await claimFarmOsDay150Gate13FourthAttempt({ repository_root: ROOT,
      authority: attemptAuthority, claimed_at: new Date().toISOString() });
    cleanupAuthorityOwned = true;
    process.stdout.write(`${JSON.stringify({ event: "DAY150_GATE13_FOURTH_ATTEMPT_CLAIMED",
      attempt_identity: attemptClaim.attempt_identity, claim_digest: attemptClaim.claim_digest,
      source_set_digest: attemptClaim.source_set_digest,
      execution_snapshot_digest: attemptClaim.execution_snapshot_digest, attempt_consumed: true,
      docker_mutations_before_claim: 0 })}\n`);
    await createAndReconcileOwnedResource("network",
      ["network", "create", "--label", OWNER, NETWORK], attemptClaim);
    await createAndReconcileOwnedResource("volume",
      ["volume", "create", "--label", OWNER, VOLUME], attemptClaim);
    await createAndReconcileOwnedResource("container", ["run", "-d", "--name", CONTAINER,
      "--label", OWNER,
      "--network", NETWORK, "--mount", `source=${VOLUME},target=/var/lib/postgresql/data`,
      "-p", FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST,
      "-e", "POSTGRES_HOST_AUTH_METHOD=trust", IMAGE], attemptClaim);
    endpointLease = await resolvePublishedPostgresEndpoint(endpointAuthority);
    await waitForPostgres(endpointAuthority, endpointLease);

    const sotPool = await setupDatabase(endpointAuthority, endpointLease, DATABASES[0]);
    pools.push(sotPool);
    const sot = await seed(sotPool);
    const lineage = await sot.readApprovalLineage({ approval_id: fixture.approval.approval_id,
      approval_receipt_id: fixture.approval_receipt.approval_receipt_id });
    const persistedClock = await readPersistedClockEvidence(sotPool);
    assert.ok(lineage); assert.equal(validateFarmOsProductionTargetExecutionApprovalLineage({
      ...lineage, clock_evidence: persistedClock.evidence,
      persisted_clock_lower_bound: persistedClock.persisted_observed_lower_bound }).accepted, true);
    provenCases.add("DURABLE_APPROVAL_WRITE_READBACK");
    assert.equal((await sot.appendApprovalAndReceipt({ proposal_id: fixture.proposal.proposal_id,
      expected_proposal_digest: fixture.proposal.proposal_digest, expected_proposal_revision: 1,
      approval: fixture.approval, approval_receipt: fixture.approval_receipt,
      initial_revocation_head: fixture.revocation_head, clock_evidence: clock,
      expected_persisted_clock_lower_bound: storeClockFloor, expected_clock_floor_version: 2,
      advance_persisted_clock_lower_bound_to_evidence_observed_at: true })).status,
    "EXISTING_IDENTICAL");
    const { approval_digest: ignoredApprovalDigest, ...approvalBase } = fixture.approval;
    void ignoredApprovalDigest;
    const conflictApprovalMaterial = { ...approvalBase, actor_provenance: {
      ...fixture.approval.actor_provenance, actor_reference_digest: sha256Bytes("conflict-actor") } };
    const conflictApproval = Object.freeze({ ...conflictApprovalMaterial,
      approval_digest: computeFarmOsProductionTargetExecutionApprovalDigest(
        conflictApprovalMaterial) });
    const { approval_receipt_digest: ignoredReceiptDigest, ...receiptBase } =
      fixture.approval_receipt;
    void ignoredReceiptDigest;
    const conflictReceiptMaterial = { ...receiptBase,
      approval_digest: conflictApproval.approval_digest };
    const conflictReceipt = Object.freeze({ ...conflictReceiptMaterial,
      approval_receipt_digest: computeFarmOsProductionTargetExecutionApprovalReceiptDigest(
        conflictReceiptMaterial) });
    const conflictHead = createInitialFarmOsProductionTargetExecutionApprovalRevocationHead({
      proposal: fixture.proposal, approval: conflictApproval,
      approval_receipt: conflictReceipt });
    const conflictResult = await sot.appendApprovalAndReceipt({
      proposal_id: fixture.proposal.proposal_id,
      expected_proposal_digest: fixture.proposal.proposal_digest, expected_proposal_revision: 1,
      approval: conflictApproval, approval_receipt: conflictReceipt,
      initial_revocation_head: conflictHead, clock_evidence: clock,
      expected_persisted_clock_lower_bound: storeClockFloor, expected_clock_floor_version: 3,
      advance_persisted_clock_lower_bound_to_evidence_observed_at: true });
    assert.equal(conflictResult.status, "CONFLICT");
    provenCases.add("DUPLICATE_AND_CONFLICT");
    const revoked = await sot.appendApprovalRevocationEventAndAdvanceHead({
      event: fixture.revocation_event, expected_approval_id: fixture.approval.approval_id,
      expected_approval_digest: fixture.approval.approval_digest,
      expected_approval_receipt_id: fixture.approval_receipt.approval_receipt_id,
      expected_approval_receipt_digest: fixture.approval_receipt.approval_receipt_digest,
      expected_target_binding_digest: fixture.approval.target_binding_digest,
      expected_operation_scope: fixture.approval.operation_scope, expected_head_version: 0,
      expected_head_digest: fixture.revocation_head.head_digest, expected_latest_event_id: null,
      expected_latest_event_digest: null, clock_evidence: clock,
      expected_persisted_clock_lower_bound: storeClockFloor, expected_clock_floor_version: 4,
      advance_persisted_clock_lower_bound_to_evidence_observed_at: true });
    assert.equal(revoked.status, "STORED");
    if (revoked.status !== "STORED") throw new Error("REVOCATION_NOT_STORED");

    const concurrencyPool = await setupDatabase(endpointAuthority, endpointLease, DATABASES[1]);
    pools.push(concurrencyPool);
    const concurrentStore = await seed(concurrencyPool);
    const contenders = await Promise.allSettled([
      concurrentStore.tryReserveWithApprovalRevalidation(reserveInput(2)),
      concurrentStore.tryReserveWithApprovalRevalidation(reserveInput(2)),
    ]);
    const winners = contenders.filter((entry) => entry.status === "fulfilled" &&
      entry.value.status === "RESERVED");
    assert.equal(winners.length, 1);
    const durableReservationCount = Number((await concurrencyPool.query(
      "select count(*)::integer as count from ai.production_target_execution_reservations"))
      .rows[0]?.count);
    assert.equal(durableReservationCount, 1);
    provenCases.add("STORAGE_BACKED_CONCURRENCY");

    const recoveryPool = await setupDatabase(endpointAuthority, endpointLease, DATABASES[2]);
    pools.push(recoveryPool);
    const recoveryStore = await seed(recoveryPool);
    const beforeWriteStore = repository(new FaultInjectingPool(recoveryPool,
      "BEFORE_TARGET_WRITE", "reserve_production_target_execution"));
    await assert.rejects(beforeWriteStore.tryReserveWithApprovalRevalidation(reserveInput(2)));
    assert.equal((await recoveryStore.readLifecycle({ command_id: fixture.command.command_id,
      execution_binding_digest: fixture.command.execution_binding_digest }))?.state, "UNRESERVED");
    provenCases.add("CRASH_BEFORE_WRITE");
    const ackLossStore = repository(new FaultInjectingPool(recoveryPool,
      "AFTER_COMMIT_BEFORE_ACK", "reserve_production_target_execution"));
    assert.equal((await ackLossStore.tryReserveWithApprovalRevalidation(reserveInput(2))).status,
      "RESERVATION_OUTCOME_UNKNOWN");
    const afterReserveReadback = await runWorker(endpointAuthority, endpointLease,
      DATABASES[2], null);
    assert.equal(afterReserveReadback.lifecycle_state, "RESERVED_NOT_STARTED");
    provenCases.add("AMBIGUOUS_PUBLICATION");
    const attemptAckLossStore = repository(new FaultInjectingPool(recoveryPool,
      "AFTER_COMMIT_BEFORE_ACK", "start_production_target_execution_attempt"));
    assert.equal((await attemptAckLossStore.tryMarkAttemptStarted(attemptInput(3))).status,
      "ATTEMPT_START_OUTCOME_UNKNOWN");
    const afterAttemptReadback = await runWorker(endpointAuthority, endpointLease,
      DATABASES[2], null);
    assert.equal(afterAttemptReadback.lifecycle_state, "ATTEMPT_STARTED");
    provenCases.add("ACK_LOSS");
    const finalized = await recoveryStore.tryFinalizeAndAppendReceipt(finalizationInput(4));
    assert.equal(finalized.status, "FINALIZED");
    const receipt = await recoveryStore.readExecutionReceipt({ receipt_id: fixture.receipt.receipt_id,
      receipt_digest: fixture.receipt.receipt_digest });
    assert.ok(receipt); assert.equal(validateFarmOsProductionTargetExecutionReceipt({ receipt,
      command: fixture.command, clock_evidence: clock,
      persisted_clock_lower_bound: persistedClock.persisted_observed_lower_bound }).accepted, true);
    provenCases.add("APPROVAL_COMMAND_RECEIPT_LINEAGE");

    for (const pool of pools.splice(0)) await pool.end();
    await docker(["container", "stop", CONTAINER]);
    endpointAuthority.invalidateForContainerRestart();
    await docker(["container", "start", CONTAINER]);
    endpointLease = await resolvePublishedPostgresEndpoint(endpointAuthority);
    provenCases.add("STALE_ENDPOINT_PREVENTION");
    await waitForPostgres(endpointAuthority, endpointLease);
    const revokedState = revoked.value;
    const sotRestart = await runWorker(endpointAuthority, endpointLease, DATABASES[0], {
      approval_digest: fixture.approval.approval_digest,
      approval_receipt_digest: fixture.approval_receipt.approval_receipt_digest,
      expected_head_version: revokedState.head.head_version,
      expected_head_digest: revokedState.head.head_digest,
      exact_latest_event_id: revokedState.head.latest_event_id,
      exact_latest_event_digest: revokedState.head.latest_event_digest,
    });
    assert.equal(sotRestart.approval_validated, true);
    assert.equal(sotRestart.revocation_status, "EXACT_STATE_FOUND");
    const concurrencyRestart = await runWorker(endpointAuthority, endpointLease,
      DATABASES[1], null);
    assert.equal(concurrencyRestart.lifecycle_state, "RESERVED_NOT_STARTED");
    const terminalRestart = await runWorker(endpointAuthority, endpointLease,
      DATABASES[2], null, true);
    assert.equal(terminalRestart.lifecycle_state, "OUTCOME_UNKNOWN");
    assert.equal(terminalRestart.receipt_validated, true);
    provenCases.add("RESTART");
    provenCases.add("PROCESS_LOSS_RECONSTRUCTION");
    const replayPool = pgPool(endpointAuthority, endpointLease, DATABASES[1]);
    pools.push(replayPool);
    const replay = await repository(replayPool).tryReserveWithApprovalRevalidation(reserveInput(3));
    assert.equal(replay.status === "CONFLICT" || replay.status === "REJECTED", true);
    provenCases.add("REPLAY_REJECTION");
    finiteQualification = await qualifyFarmOsDay150Gate13FiniteAcceptance({
      create_database: async (caseId) => setupDatabase(endpointAuthority, endpointLease,
        `farmos_day150_gate13_${caseId.toLowerCase()}`),
    });
    for (const caseId of finiteQualification.case_ids) provenCases.add(caseId);
    qualificationPassed = true;
  } catch (error) {
    qualificationFailure = error;
  } finally {
    for (const pool of pools.splice(0)) await pool.end().catch(() => undefined);
    if (cleanupAuthorityOwned) {
      try { zeroResidual = (await cleanup({ mode: "NORMAL", claim: attemptClaim! })).zero_residual; }
      catch (error) { cleanupFailure = error; }
      if (zeroResidual) {
        provenCases.add("EXACT_CLEANUP");
        provenCases.add("ZERO_RESIDUAL");
      }
    }
  }
  if (attemptClaim === null) {
    if (qualificationFailure instanceof Error) throw qualificationFailure;
    throw new Error("GATE13_FOURTH_ATTEMPT_CLAIM_NOT_ESTABLISHED");
  }
  const completedAt = new Date().toISOString();
  const implementationIdentityDigest = computeFarmOsDay150Gate13ImplementationIdentityDigest({
    persistence_port_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
    postgres_schema_version: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_SCHEMA_VERSION,
    migration_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
    migration_sha256: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
    repository_source_sha256: sha256File(resolve(ROOT,
      "src/lib/hermes/farm_os_production_target_execution_postgres_repository.ts")),
    qualification_source_sha256: sha256File(resolve(ROOT,
      "scripts/hermes/run_farm_os_day150_gate13_isolated_durability_qualification.ts")),
    postgres_major: 17, image: IMAGE as `docker.io/library/postgres@sha256:${string}`, platform,
  });
  let resultPublicationFailure: unknown = null;
  let durableResult: FarmOsDay150Gate13QualificationResult | null = null;
  let resultPublication: FarmOsDay150Gate13ResultPublicationObservation = "RESULT_NOT_REQUIRED";
  if (qualificationPassed && !cleanupFailure && zeroResidual) {
    try {
      if (!finiteQualification) throw new Error("GATE13_FINITE_QUALIFICATION_RESULT_ABSENT");
      const caseResults = createFarmOsDay150Gate13QualificationCaseResults([...provenCases]);
      durableResult = await publishFarmOsDay150Gate13QualificationResult({ repository_root: ROOT,
        result: createFarmOsDay150Gate13QualificationResult({
        attempt_identity: attemptClaim.attempt_identity, claim_digest: attemptClaim.claim_digest,
        qualification_source_set_digest: attemptClaim.source_set_digest,
        execution_snapshot_digest: attemptClaim.execution_snapshot_digest,
        implementation_identity_digest: implementationIdentityDigest, platform, case_results: caseResults,
        finite_executed_case_results: finiteQualification.executed_case_results,
        case_counts: Object.freeze({ required: 31 as const, executed: 31 as const,
          validated: 31 as const }),
        finite_case_counts: Object.freeze({ required: finiteQualification.required_case_count,
          executed: finiteQualification.executed_case_result_count,
          validated: finiteQualification.validated_case_result_count }),
        d5_recovery_result: finiteQualification.d5_recovery_result,
        cleanup_zero_residual: true, started_at: startedAt, completed_at: completedAt,
        }) });
      resultPublication = "DURABLE_RESULT_PUBLISHED";
    } catch (error) {
      resultPublicationFailure = error;
      resultPublication = "RESULT_PUBLICATION_OUTCOME_UNKNOWN";
    }
  }
  const cleanupObservation: FarmOsDay150Gate13CleanupObservation = cleanupFailure
    ? "CLEANUP_OUTCOME_UNKNOWN" : zeroResidual
      ? "ZERO_RESIDUAL_CONFIRMED" : "RESIDUAL_PRESENT_CONFIRMED";
  const terminalDecision = decideFarmOsDay150Gate13Terminal({
    semantic_qualification_passed: qualificationPassed,
    semantic_failure_boundary: qualificationPassed ? null : boundedFailureBoundary(
      qualificationFailure),
    cleanup_observation: cleanupObservation, result_publication: resultPublication,
  });
  const nonSuccessResultDigest = sha256Bytes(JSON.stringify({ claim_digest: attemptClaim.claim_digest,
    qualification_passed: qualificationPassed, cleanup_failure: cleanupFailure !== null,
    zero_residual: zeroResidual, qualification_result: terminalDecision.qualification_result,
    failure_boundary: terminalDecision.failure_boundary }));
  attemptTerminal = await publishFarmOsDay150Gate13FourthAttemptTerminal({ repository_root: ROOT,
    claim: attemptClaim, qualification_result: terminalDecision.qualification_result,
    qualification_result_digest: durableResult?.qualification_result_digest ?? nonSuccessResultDigest,
    failure_boundary: terminalDecision.failure_boundary,
    zero_residual: terminalDecision.zero_residual, completed_at: new Date().toISOString() });
  process.stdout.write(`${JSON.stringify({ event: "DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL",
    attempt_identity: attemptTerminal.attempt_identity,
    terminal_digest: attemptTerminal.terminal_digest,
    qualification_result: attemptTerminal.qualification_result,
    attempt_consumed: true, zero_residual: attemptTerminal.zero_residual })}\n`);
  if (cleanupFailure) throw new Error("DAY150_GATE13_QUALIFICATION_CLEANUP_OUTCOME_UNKNOWN");
  if (resultPublicationFailure) {
    throw new Error("DAY150_GATE13_QUALIFICATION_RESULT_PUBLICATION_OUTCOME_UNKNOWN");
  }
  if (qualificationFailure) throw qualificationFailure;
  if (!qualificationPassed) throw new Error("HOLD_DAY150_GATE13_DURABILITY_NOT_READY");
  if (attemptTerminal.qualification_result !== "QUALIFICATION_SUCCESS") {
    throw new Error("HOLD_DAY150_GATE13_DURABILITY_NOT_READY");
  }
  const evidence = buildPassEvidence({ claim: attemptClaim, terminal: attemptTerminal,
    result: durableResult! });
  assert.ok(parseFarmOsDay150Gate13DurabilityEvidence(evidence));
  const readback = await publishFarmOsDay150Gate13DurabilityEvidence({ repository_root: ROOT,
    evidence });
  assert.deepEqual(readback, evidence);
  process.stdout.write(`${JSON.stringify({ status: "PASS", evidence_path:
    FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH,
  evidence_digest: evidence.evidence_digest, zero_residual: true,
  production: 0, canonical: 0, b2: 0, formal_gate2: 0 })}\n`);
}

if (process.argv.includes("--preflight-d1-clock-binding")) await preflightD1ClockBinding();
else if (process.argv.includes("--recover-consumed-attempt")) await recoverConsumedAttempt();
else if (process.argv.includes("--complete-pass-evidence")) {
  await completePassEvidenceWithoutQualificationRerun();
}
else await main();
