import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import type { Pool } from "pg";

import {
  computeFarmOsProductionTargetExecutionClockEvidenceDigest,
  computeFarmOsProductionTargetExecutionClockEvidenceId,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  FarmOsProductionTargetExecutionPostgresRepository,
  type FarmOsProductionTargetExecutionPostgresClient,
  type FarmOsProductionTargetExecutionPostgresPool,
} from "../../../src/lib/hermes/farm_os_production_target_execution_postgres_repository";
import type { FarmOsProductionTargetExecutionReceipt } from
  "../../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";
import { FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE } from
  "./farm_os_production_target_execution_postgres_qualification_fixture";

export const FARM_OS_DAY150_GATE13_FINITE_DURABILITY_PROPERTIES = Object.freeze([
  "D1", "D2", "D3", "D4", "D5",
] as const);

export const FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS = Object.freeze([
  "D1_CANONICAL_DURABLE_LINEAGE",
  "D2_ONE_DURABLE_WINNER_REPLAY_REJECTED",
  "D3_RESERVATION_STALE_REJECTED",
  "D3_RESERVATION_EXPIRED_REJECTED",
  "D3_RESERVATION_REVOKED_REJECTED",
  "D3_ATTEMPT_START_STALE_REJECTED",
  "D3_ATTEMPT_START_EXPIRED_REJECTED",
  "D3_ATTEMPT_START_REVOKED_REJECTED",
  "D3_CLOCK_REGRESSION_REJECTED",
  "D3_DEPENDENCY_MISMATCH_REJECTED",
  "D4_SUCCESS_ATOMIC_RECEIPT",
  "D4_FAILURE_ATOMIC_RECEIPT",
  "D4_BEFORE_TERMINAL_WRITE_ROLLS_BACK",
  "D4_AFTER_MUTATION_BEFORE_COMMIT_ROLLS_BACK",
  "D4_RECEIPT_APPEND_FAILURE_ROLLS_BACK",
  "D4_COMMIT_ACK_AMBIGUITY_READBACK",
  "D4_OUTCOME_UNKNOWN_DISTINCT",
  "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK",
] as const);

export type FarmOsDay150Gate13FiniteCaseId =
  typeof FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS[number];
export type FarmOsDay150Gate13FiniteExecutedCaseResult = Readonly<{
  case_id: FarmOsDay150Gate13FiniteCaseId;
  accepted_result: "PASS";
  storage_identity_digest: `sha256:${string}`;
  result_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13D5RecoveryResult = Readonly<{
  schema_version: "farmos.day150-gate13-d5-history-recovery-result.v1";
  case_id: "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK";
  database_identity_digest: `sha256:${string}`;
  initial_durable_state: "ATTEMPT_STARTED";
  simulated_failure_recovery_boundary: "FINALIZATION_COMMIT_ACK_LOSS";
  authoritative_readback_result: "OUTCOME_UNKNOWN";
  recovery_action: "AUTHORITATIVE_READBACK_AND_REPLAY_REJECTION_NO_RERUN";
  recovery_result: "TERMINAL_HISTORY_PRESERVED";
  resulting_terminal_state: "OUTCOME_UNKNOWN";
  history_preserved: true;
  lifecycle_row_count: 1;
  receipt_row_count: 1;
  qualification_rerun_count: 0;
  result_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13FiniteQualification = Readonly<{
  matrix: Readonly<Record<typeof FARM_OS_DAY150_GATE13_FINITE_DURABILITY_PROPERTIES[number], "PASS">>;
  case_ids: readonly FarmOsDay150Gate13FiniteCaseId[];
  executed_case_results: readonly FarmOsDay150Gate13FiniteExecutedCaseResult[];
  required_case_count: 18;
  executed_case_result_count: 18;
  validated_case_result_count: 18;
  d5_recovery_result: FarmOsDay150Gate13D5RecoveryResult;
  production_operations: 0;
  canonical_operations: 0;
  b2_operations: 0;
  formal_gate2_operations: 0;
  automatic_retry_count: 0;
}>;

const fixture = FARM_OS_PTE_C2B_SYNTHETIC_FIXTURE;
const baseClock = fixture.clock_evidence;
const floor = baseClock.observed_at;

const repository = (pool: Pool | FarmOsProductionTargetExecutionPostgresPool) =>
  new FarmOsProductionTargetExecutionPostgresRepository({
    pool: pool as unknown as FarmOsProductionTargetExecutionPostgresPool,
  });

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, nested]) => `${JSON.stringify(key)}:${canonical(nested)}`).join(",")}}`;
};
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\0${canonical(value)}`).digest("hex")}`;

export function createFarmOsDay150Gate13FiniteExecutedCaseResult(input: Readonly<{
  case_id: FarmOsDay150Gate13FiniteCaseId;
  storage_identity_digest: `sha256:${string}`;
}>): FarmOsDay150Gate13FiniteExecutedCaseResult {
  const body = Object.freeze({ case_id: input.case_id, accepted_result: "PASS" as const,
    storage_identity_digest: input.storage_identity_digest });
  return Object.freeze({ ...body, result_digest: hash(
    "farmos.day150-gate13-finite-executed-case-result.v1", body) });
}

export function validateFarmOsDay150Gate13FiniteExecutedCaseResult(
  value: unknown,
): value is FarmOsDay150Gate13FiniteExecutedCaseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as FarmOsDay150Gate13FiniteExecutedCaseResult;
  const body = { case_id: candidate.case_id, accepted_result: candidate.accepted_result,
    storage_identity_digest: candidate.storage_identity_digest };
  return Object.keys(value).sort().join("\0") === ["accepted_result", "case_id", "result_digest",
    "storage_identity_digest"].sort().join("\0") &&
    FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS.includes(candidate.case_id) &&
    candidate.accepted_result === "PASS" && /^sha256:[a-f0-9]{64}$/u.test(
      candidate.storage_identity_digest) && candidate.result_digest === hash(
      "farmos.day150-gate13-finite-executed-case-result.v1", body);
}

export function deriveFarmOsDay150Gate13FiniteMatrix(
  values: readonly unknown[],
): Readonly<{ matrix: Readonly<Record<"D1" | "D2" | "D3" | "D4" | "D5", "PASS" | "FAIL">>;
  required_case_count: number; executed_case_result_count: number;
  validated_case_result_count: number }> {
  const validated = values.filter(validateFarmOsDay150Gate13FiniteExecutedCaseResult);
  const unique = new Set(validated.map((entry) => entry.case_id));
  const exact = validated.length === values.length && unique.size === validated.length;
  const matrix = Object.fromEntries(FARM_OS_DAY150_GATE13_FINITE_DURABILITY_PROPERTIES.map(
    (property) => [property, exact && FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS
      .filter((caseId) => caseId.startsWith(`${property}_`))
      .every((caseId) => unique.has(caseId)) ? "PASS" : "FAIL"],
  )) as Record<"D1" | "D2" | "D3" | "D4" | "D5", "PASS" | "FAIL">;
  return Object.freeze({ matrix: Object.freeze(matrix),
    required_case_count: FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS.length,
    executed_case_result_count: values.length, validated_case_result_count: validated.length });
}

function createD5RecoveryResult(input: Omit<FarmOsDay150Gate13D5RecoveryResult,
  "result_digest">): FarmOsDay150Gate13D5RecoveryResult {
  return Object.freeze({ ...input, result_digest: hash(
    "farmos.day150-gate13-d5-history-recovery-result.v1", input) });
}

export function validateFarmOsDay150Gate13D5RecoveryResult(
  value: unknown,
): value is FarmOsDay150Gate13D5RecoveryResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as FarmOsDay150Gate13D5RecoveryResult;
  const { result_digest: supplied, ...body } = candidate;
  return Object.keys(value).length === 14 && candidate.schema_version ===
    "farmos.day150-gate13-d5-history-recovery-result.v1" && candidate.case_id ===
    "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK" &&
    /^sha256:[a-f0-9]{64}$/u.test(candidate.database_identity_digest) &&
    candidate.initial_durable_state === "ATTEMPT_STARTED" &&
    candidate.simulated_failure_recovery_boundary === "FINALIZATION_COMMIT_ACK_LOSS" &&
    candidate.authoritative_readback_result === "OUTCOME_UNKNOWN" &&
    candidate.recovery_action === "AUTHORITATIVE_READBACK_AND_REPLAY_REJECTION_NO_RERUN" &&
    candidate.recovery_result === "TERMINAL_HISTORY_PRESERVED" &&
    candidate.resulting_terminal_state === "OUTCOME_UNKNOWN" && candidate.history_preserved === true &&
    candidate.lifecycle_row_count === 1 && candidate.receipt_row_count === 1 &&
    candidate.qualification_rerun_count === 0 && supplied === hash(
      "farmos.day150-gate13-d5-history-recovery-result.v1", body);
}

function clock(input: Readonly<{
  observed_at: string;
  observed_lower_bound?: string;
  status?: FarmOsProductionTargetExecutionClockEvidence["status"];
}>): FarmOsProductionTargetExecutionClockEvidence {
  const material = Object.freeze({
    schema_version: baseClock.schema_version,
    clock_authority_id: baseClock.clock_authority_id,
    clock_authority_revision: baseClock.clock_authority_revision,
    provenance_class: baseClock.provenance_class,
    observed_at: input.observed_at,
    observed_lower_bound: input.observed_lower_bound ?? floor,
    recorded_at: input.observed_at,
    status: input.status ?? "AVAILABLE",
    server_owned_record: true as const,
  });
  const evidence_digest = computeFarmOsProductionTargetExecutionClockEvidenceDigest(material);
  return Object.freeze({ ...material,
    evidence_id: computeFarmOsProductionTargetExecutionClockEvidenceId(evidence_digest),
    evidence_digest });
}

const staleClock = clock({ observed_at: "2026-08-11T00:05:00.000Z", status: "STALE" });
const expiredClock = clock({ observed_at: "2026-08-12T00:00:00.000Z" });
const regressedClock = clock({ observed_at: "2026-08-10T23:59:59.000Z",
  observed_lower_bound: "2026-08-10T23:59:59.000Z" });

async function seed(pool: Pool) {
  const store = repository(pool);
  assert.equal((await store.appendProposal({ proposal: fixture.proposal,
    expected_absent_proposal_id: fixture.proposal.proposal_id, clock_evidence: baseClock,
    expected_persisted_clock_lower_bound: null, expected_clock_floor_version: 0,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true })).status, "STORED");
  const approvalInput = { proposal_id: fixture.proposal.proposal_id,
    expected_proposal_digest: fixture.proposal.proposal_digest, expected_proposal_revision: 1 as const,
    approval: fixture.approval, approval_receipt: fixture.approval_receipt,
    initial_revocation_head: fixture.revocation_head, clock_evidence: baseClock,
    expected_persisted_clock_lower_bound: floor, expected_clock_floor_version: 1,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const };
  assert.equal((await store.appendApprovalAndReceipt(approvalInput)).status, "STORED");
  const sqlDigests = (await pool.query(`select
    ai.production_target_execution_digest('farmos.production-target-execution-command-envelope.v1',
      $1::jsonb - 'command_record_digest') command_digest,
    ai.production_target_execution_digest('farmos.production-target-execution-binding.v1',
      $1::jsonb - array['execution_binding_digest','command_record_digest']) binding_digest`,
  [JSON.stringify(fixture.command)])).rows[0];
  if (sqlDigests?.command_digest !== fixture.command.command_record_digest ||
    sqlDigests?.binding_digest !== fixture.command.execution_binding_digest) {
    throw new Error(`DAY150_GATE13_COMMAND_DIGEST_SQL_MISMATCH:${JSON.stringify({
      command: sqlDigests?.command_digest === fixture.command.command_record_digest,
      binding: sqlDigests?.binding_digest === fixture.command.execution_binding_digest })}`);
  }
  assert.equal((await store.appendCommand({ command: fixture.command,
    expected_approval_id: fixture.approval.approval_id,
    expected_approval_digest: fixture.approval.approval_digest,
    expected_approval_receipt_id: fixture.approval_receipt.approval_receipt_id,
    expected_approval_receipt_digest: fixture.approval_receipt.approval_receipt_digest,
    expected_nonce_absent: fixture.command.nonce_digest })).status, "STORED");
  return store;
}

function reserveInput(clockFloorVersion: number,
  clockEvidence: FarmOsProductionTargetExecutionClockEvidence = baseClock) {
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
    clock_evidence: clockEvidence, expected_persisted_clock_lower_bound: floor,
    expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const,
    required_revalidation_provenance:
      "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION" as const });
}

function attemptInput(clockFloorVersion: number,
  clockEvidence: FarmOsProductionTargetExecutionClockEvidence = baseClock) {
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
    clock_evidence: clockEvidence, expected_persisted_clock_lower_bound: floor,
    expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const,
    required_revalidation_provenance:
      "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION" as const });
}

function finalizationInput(receipt: FarmOsProductionTargetExecutionReceipt,
  clockFloorVersion = 4) {
  return Object.freeze({ command_id: fixture.command.command_id,
    execution_binding_digest: fixture.command.execution_binding_digest,
    reservation_id: fixture.reservation.reservation_id,
    reservation_digest: fixture.reservation.reservation_digest,
    attempt_id: fixture.attempt.attempt_id, attempt_digest: fixture.attempt.attempt_digest,
    expected_lifecycle_state: "ATTEMPT_STARTED" as const, expected_lifecycle_version: 2,
    receipt, expected_receipt_absent: receipt.receipt_id,
    clock_evidence: baseClock, expected_persisted_clock_lower_bound: floor,
    expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true as const });
}

async function revoke(store: ReturnType<typeof repository>, clockFloorVersion: number) {
  return store.appendApprovalRevocationEventAndAdvanceHead({
    event: fixture.revocation_event, expected_approval_id: fixture.approval.approval_id,
    expected_approval_digest: fixture.approval.approval_digest,
    expected_approval_receipt_id: fixture.approval_receipt.approval_receipt_id,
    expected_approval_receipt_digest: fixture.approval_receipt.approval_receipt_digest,
    expected_target_binding_digest: fixture.approval.target_binding_digest,
    expected_operation_scope: fixture.approval.operation_scope, expected_head_version: 0,
    expected_head_digest: fixture.revocation_head.head_digest, expected_latest_event_id: null,
    expected_latest_event_digest: null, clock_evidence: baseClock,
    expected_persisted_clock_lower_bound: floor, expected_clock_floor_version: clockFloorVersion,
    advance_persisted_clock_lower_bound_to_evidence_observed_at: true });
}

class FinalizationFaultPool implements FarmOsProductionTargetExecutionPostgresPool {
  constructor(private readonly pool: Pool,
    private readonly mode: "BEFORE_FUNCTION" | "BEFORE_COMMIT" | "AFTER_COMMIT_ACK_LOSS") {}
  async connect(): Promise<FarmOsProductionTargetExecutionPostgresClient> {
    const client = await this.pool.connect();
    let finalizationReached = false;
    return Object.freeze({
      query: async <Row extends Record<string, unknown>>(text: string,
        values?: readonly unknown[]) => {
        if (text.includes("finalize_production_target_execution")) {
          if (this.mode === "BEFORE_FUNCTION") throw Object.assign(new Error("FAULT"),
            { code: "ECONNRESET" });
          finalizationReached = true;
        }
        if (finalizationReached && text.trim().toLowerCase() === "commit" &&
          this.mode === "BEFORE_COMMIT") {
          throw Object.assign(new Error("FAULT"), { code: "ECONNRESET" });
        }
        const result = await client.query(text, values as unknown[] | undefined);
        if (finalizationReached && text.trim().toLowerCase() === "commit" &&
          this.mode === "AFTER_COMMIT_ACK_LOSS") {
          throw Object.assign(new Error("FAULT"), { code: "ECONNRESET" });
        }
        return result as never;
      },
      release: () => client.release(),
    });
  }
}

async function assertNoTerminalPair(pool: Pool): Promise<void> {
  const row = (await pool.query(`select lifecycle.state,
    (select count(*)::integer from ai.production_target_execution_execution_receipts) as receipts
    from ai.production_target_execution_lifecycles lifecycle`)).rows[0];
  assert.equal(row?.state, "ATTEMPT_STARTED");
  assert.equal(Number(row?.receipts), 0);
}

async function prepareStarted(pool: Pool) {
  const store = await seed(pool);
  assert.equal((await store.tryReserveWithApprovalRevalidation(reserveInput(2))).status, "RESERVED");
  assert.equal((await store.tryMarkAttemptStarted(attemptInput(3))).status, "ATTEMPT_STARTED");
  return store;
}

export async function qualifyFarmOsDay150Gate13FiniteAcceptance(input: Readonly<{
  create_database: (caseId: FarmOsDay150Gate13FiniteCaseId) => Promise<Pool>;
}>): Promise<FarmOsDay150Gate13FiniteQualification> {
  const executedCaseResults: FarmOsDay150Gate13FiniteExecutedCaseResult[] = [];
  let d5RecoveryResult: FarmOsDay150Gate13D5RecoveryResult | null = null;
  const use = async (caseId: FarmOsDay150Gate13FiniteCaseId,
    action: (pool: Pool, storageIdentityDigest: `sha256:${string}`) => Promise<void>) => {
    const pool = await input.create_database(caseId);
    try {
      const database = String((await pool.query("select current_database() as value")).rows[0]?.value);
      const storageIdentityDigest = hash("farmos.day150-gate13-finite-storage-identity.v1",
        { case_id: caseId, database });
      await action(pool, storageIdentityDigest);
      executedCaseResults.push(createFarmOsDay150Gate13FiniteExecutedCaseResult({
        case_id: caseId, storage_identity_digest: storageIdentityDigest }));
    } finally { await pool.end(); }
  };

  await use("D1_CANONICAL_DURABLE_LINEAGE", async (pool) => {
    const store = await seed(pool);
    const lineage = await store.readApprovalLineage({ approval_id: fixture.approval.approval_id,
      approval_receipt_id: fixture.approval_receipt.approval_receipt_id });
    const command = await store.readCommand({ command_id: fixture.command.command_id,
      execution_binding_digest: fixture.command.execution_binding_digest });
    assert.deepEqual(lineage, { proposal: fixture.proposal, approval: fixture.approval,
      approval_receipt: fixture.approval_receipt });
    assert.deepEqual(command, fixture.command);
    const counts = (await pool.query(`select
      (select count(*)::integer from ai.production_target_execution_proposals) proposals,
      (select count(*)::integer from ai.production_target_execution_approvals) approvals,
      (select count(*)::integer from ai.production_target_execution_approval_receipts) approval_receipts,
      (select count(*)::integer from ai.production_target_execution_commands) commands`)).rows[0];
    assert.deepEqual(Object.values(counts ?? {}).map(Number), [1, 1, 1, 1]);
  });

  await use("D2_ONE_DURABLE_WINNER_REPLAY_REJECTED", async (pool) => {
    const store = await seed(pool);
    const outcomes = await Promise.allSettled([
      store.tryReserveWithApprovalRevalidation(reserveInput(2)),
      store.tryReserveWithApprovalRevalidation(reserveInput(2)),
    ]);
    assert.equal(outcomes.filter((entry) => entry.status === "fulfilled" &&
      entry.value.status === "RESERVED").length, 1);
    const replay = await repository(pool).tryReserveWithApprovalRevalidation(reserveInput(3));
    assert.equal(replay.status === "CONFLICT" || replay.status === "REJECTED", true);
  });

  for (const [caseId, boundary] of [
    ["D3_RESERVATION_STALE_REJECTED", "RESERVATION"],
    ["D3_ATTEMPT_START_STALE_REJECTED", "ATTEMPT_START"],
  ] as const) await use(caseId, async (pool) => {
    const store = await seed(pool);
    if (boundary === "ATTEMPT_START") {
      assert.equal((await store.tryReserveWithApprovalRevalidation(reserveInput(2))).status,
        "RESERVED");
      await assert.rejects(store.tryMarkAttemptStarted(attemptInput(3, staleClock)));
      assert.equal((await store.readLifecycle({ command_id: fixture.command.command_id,
        execution_binding_digest: fixture.command.execution_binding_digest }))?.state,
      "RESERVED_NOT_STARTED");
    } else {
      await assert.rejects(store.tryReserveWithApprovalRevalidation(reserveInput(2, staleClock)));
      assert.equal((await store.readLifecycle({ command_id: fixture.command.command_id,
        execution_binding_digest: fixture.command.execution_binding_digest }))?.state, "UNRESERVED");
    }
  });

  for (const [caseId, boundary] of [
    ["D3_RESERVATION_EXPIRED_REJECTED", "RESERVATION"],
    ["D3_ATTEMPT_START_EXPIRED_REJECTED", "ATTEMPT_START"],
  ] as const) await use(caseId, async (pool) => {
    const store = await seed(pool);
    if (boundary === "ATTEMPT_START") {
      assert.equal((await store.tryReserveWithApprovalRevalidation(reserveInput(2))).status,
        "RESERVED");
      const result = await store.tryMarkAttemptStarted(attemptInput(3, expiredClock));
      assert.notEqual(result.status, "ATTEMPT_STARTED");
    } else {
      const result = await store.tryReserveWithApprovalRevalidation(reserveInput(2, expiredClock));
      assert.notEqual(result.status, "RESERVED");
    }
  });

  for (const [caseId, boundary] of [
    ["D3_RESERVATION_REVOKED_REJECTED", "RESERVATION"],
    ["D3_ATTEMPT_START_REVOKED_REJECTED", "ATTEMPT_START"],
  ] as const) await use(caseId, async (pool) => {
    const store = await seed(pool);
    if (boundary === "ATTEMPT_START") {
      assert.equal((await store.tryReserveWithApprovalRevalidation(reserveInput(2))).status,
        "RESERVED");
      assert.equal((await revoke(store, 3)).status, "STORED");
      const reconstructed = repository(pool);
      const result = await reconstructed.tryMarkAttemptStarted(attemptInput(4));
      assert.equal(result.status, "REJECTED");
    } else {
      assert.equal((await revoke(store, 2)).status, "STORED");
      const reconstructed = repository(pool);
      const result = await reconstructed.tryReserveWithApprovalRevalidation(reserveInput(3));
      assert.equal(result.status, "REJECTED");
    }
  });

  await use("D3_CLOCK_REGRESSION_REJECTED", async (pool) => {
    const store = await seed(pool);
    await assert.rejects(store.tryReserveWithApprovalRevalidation(reserveInput(2, regressedClock)));
  });
  await use("D3_DEPENDENCY_MISMATCH_REJECTED", async (pool) => {
    const store = await seed(pool);
    const result = await store.tryReserveWithApprovalRevalidation({ ...reserveInput(2),
      expected_target_binding_digest: `sha256:${"f".repeat(64)}` });
    assert.equal(result.status, "REJECTED");
  });

  for (const [caseId, receipt, state] of [
    ["D4_SUCCESS_ATOMIC_RECEIPT", fixture.success_receipt, "CONSUMED_SUCCESS"],
    ["D4_FAILURE_ATOMIC_RECEIPT", fixture.failure_receipt, "CONSUMED_FAILURE"],
    ["D4_OUTCOME_UNKNOWN_DISTINCT", fixture.receipt, "OUTCOME_UNKNOWN"],
  ] as const) await use(caseId, async (pool) => {
    const store = await prepareStarted(pool);
    const result = await store.tryFinalizeAndAppendReceipt(finalizationInput(receipt));
    assert.equal(result.status, "FINALIZED");
    const reconstructed = repository(pool);
    const lifecycle = await reconstructed.readLifecycle({ command_id: fixture.command.command_id,
      execution_binding_digest: fixture.command.execution_binding_digest });
    const readReceipt = await reconstructed.readExecutionReceipt({ receipt_id: receipt.receipt_id,
      receipt_digest: receipt.receipt_digest });
    assert.equal(lifecycle?.state, state);
    assert.deepEqual(readReceipt, receipt);
    assert.equal(lifecycle?.terminal_receipt_id, receipt.receipt_id);
    assert.equal(Number((await pool.query(
      "select count(*)::integer count from ai.production_target_execution_execution_receipts"))
      .rows[0]?.count), 1);
  });

  await use("D4_BEFORE_TERMINAL_WRITE_ROLLS_BACK", async (pool) => {
    await prepareStarted(pool);
    await assert.rejects(repository(new FinalizationFaultPool(pool, "BEFORE_FUNCTION"))
      .tryFinalizeAndAppendReceipt(finalizationInput(fixture.success_receipt)));
    await assertNoTerminalPair(pool);
  });
  await use("D4_AFTER_MUTATION_BEFORE_COMMIT_ROLLS_BACK", async (pool) => {
    await prepareStarted(pool);
    const result = await repository(new FinalizationFaultPool(pool, "BEFORE_COMMIT"))
      .tryFinalizeAndAppendReceipt(finalizationInput(fixture.success_receipt));
    assert.equal(result.status, "FINALIZATION_OUTCOME_UNKNOWN");
    await assertNoTerminalPair(pool);
  });
  await use("D4_RECEIPT_APPEND_FAILURE_ROLLS_BACK", async (pool) => {
    const store = await prepareStarted(pool);
    await assert.rejects(store.tryFinalizeAndAppendReceipt(finalizationInput({
      ...fixture.success_receipt, receipt_digest: fixture.failure_receipt.receipt_digest,
    })));
    await assertNoTerminalPair(pool);
  });
  await use("D4_COMMIT_ACK_AMBIGUITY_READBACK", async (pool) => {
    await prepareStarted(pool);
    const result = await repository(new FinalizationFaultPool(pool, "AFTER_COMMIT_ACK_LOSS"))
      .tryFinalizeAndAppendReceipt(finalizationInput(fixture.success_receipt));
    assert.equal(result.status, "FINALIZATION_OUTCOME_UNKNOWN");
    const lifecycle = await repository(pool).readLifecycle({ command_id: fixture.command.command_id,
      execution_binding_digest: fixture.command.execution_binding_digest });
    assert.equal(lifecycle?.state, "CONSUMED_SUCCESS");
    assert.ok(await repository(pool).readExecutionReceipt({
      receipt_id: fixture.success_receipt.receipt_id,
      receipt_digest: fixture.success_receipt.receipt_digest }));
  });
  await use("D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK",
    async (pool, storageIdentityDigest) => {
      await prepareStarted(pool);
      const before = await repository(pool).readLifecycle({ command_id: fixture.command.command_id,
        execution_binding_digest: fixture.command.execution_binding_digest });
      assert.equal(before?.state, "ATTEMPT_STARTED");
      const ambiguous = await repository(new FinalizationFaultPool(pool, "AFTER_COMMIT_ACK_LOSS"))
        .tryFinalizeAndAppendReceipt(finalizationInput(fixture.receipt));
      assert.equal(ambiguous.status, "FINALIZATION_OUTCOME_UNKNOWN");
      const reconstructed = repository(pool);
      const authoritative = await reconstructed.readLifecycle({
        command_id: fixture.command.command_id,
        execution_binding_digest: fixture.command.execution_binding_digest });
      const authoritativeReceipt = await reconstructed.readExecutionReceipt({
        receipt_id: fixture.receipt.receipt_id, receipt_digest: fixture.receipt.receipt_digest });
      assert.equal(authoritative?.state, "OUTCOME_UNKNOWN");
      assert.deepEqual(authoritativeReceipt, fixture.receipt);
      let replayRejected = false;
      try {
        const replay = await reconstructed.tryFinalizeAndAppendReceipt(
          finalizationInput(fixture.success_receipt, 5));
        replayRejected = replay.status !== "FINALIZED";
      } catch { replayRejected = true; }
      assert.equal(replayRejected, true);
      const afterRecovery = await reconstructed.readLifecycle({
        command_id: fixture.command.command_id,
        execution_binding_digest: fixture.command.execution_binding_digest });
      const counts = (await pool.query(`select
        (select count(*)::integer from ai.production_target_execution_lifecycles) lifecycles,
        (select count(*)::integer from ai.production_target_execution_execution_receipts) receipts`))
        .rows[0];
      assert.deepEqual(afterRecovery, authoritative);
      assert.equal(Number(counts?.lifecycles), 1);
      assert.equal(Number(counts?.receipts), 1);
      d5RecoveryResult = createD5RecoveryResult({
        schema_version: "farmos.day150-gate13-d5-history-recovery-result.v1",
        case_id: "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK",
        database_identity_digest: storageIdentityDigest,
        initial_durable_state: "ATTEMPT_STARTED",
        simulated_failure_recovery_boundary: "FINALIZATION_COMMIT_ACK_LOSS",
        authoritative_readback_result: "OUTCOME_UNKNOWN",
        recovery_action: "AUTHORITATIVE_READBACK_AND_REPLAY_REJECTION_NO_RERUN",
        recovery_result: "TERMINAL_HISTORY_PRESERVED",
        resulting_terminal_state: "OUTCOME_UNKNOWN", history_preserved: true,
        lifecycle_row_count: 1, receipt_row_count: 1, qualification_rerun_count: 0,
      });
    });

  const derived = deriveFarmOsDay150Gate13FiniteMatrix(executedCaseResults);
  assert.deepEqual(derived.matrix, { D1: "PASS", D2: "PASS", D3: "PASS", D4: "PASS",
    D5: "PASS" });
  assert.equal(derived.required_case_count, FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS.length);
  assert.equal(derived.executed_case_result_count, derived.required_case_count);
  assert.equal(derived.validated_case_result_count, derived.required_case_count);
  assert.ok(d5RecoveryResult && validateFarmOsDay150Gate13D5RecoveryResult(d5RecoveryResult));
  return Object.freeze({ matrix: derived.matrix as FarmOsDay150Gate13FiniteQualification["matrix"],
  case_ids: Object.freeze(executedCaseResults.map((entry) => entry.case_id)),
  executed_case_results: Object.freeze(executedCaseResults), required_case_count: 18,
  executed_case_result_count: 18, validated_case_result_count: 18,
  d5_recovery_result: d5RecoveryResult,
  production_operations: 0, canonical_operations: 0, b2_operations: 0,
  formal_gate2_operations: 0, automatic_retry_count: 0 });
}
