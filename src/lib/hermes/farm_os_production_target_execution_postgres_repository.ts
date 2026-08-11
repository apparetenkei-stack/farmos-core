import type {
  FarmOsProductionTargetExecutionApprovalRevocationReadResult,
  FarmOsProductionTargetExecutionApprovalSotPort,
  FarmOsProductionTargetExecutionAtomicLifecyclePort,
  FarmOsProductionTargetExecutionAttemptStartResult,
  FarmOsProductionTargetExecutionCommandPort,
  FarmOsProductionTargetExecutionFinalizationResult,
  FarmOsProductionTargetExecutionPersistencePorts,
  FarmOsProductionTargetExecutionReservationReadback,
  FarmOsProductionTargetExecutionReservationReconciliationInput,
  FarmOsProductionTargetExecutionReservationReconciliationResult,
  FarmOsProductionTargetExecutionReservationResult,
  FarmOsProductionTargetExecutionStoreResult,
} from "./farm_os_production_target_execution_persistence_ports";
import {
  computeFarmOsProductionTargetExecutionReservationObservationDigest,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION,
  reservationReconciliationResolvedResultIsValid,
  validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence,
} from "./farm_os_production_target_execution_persistence_ports";
import type {
  FarmOsProductionTargetExecutionApprovalLineage,
  FarmOsProductionTargetExecutionApprovalRevocationState,
  FarmOsProductionTargetExecutionProposal,
} from "./farm_os_production_target_execution_approval_authority";
import type { FarmOsProductionTargetExecutionCommand } from
  "./farm_os_production_target_execution_command_authority";
import {
  parseFarmOsProductionTargetExecutionLifecycleRecord,
  type FarmOsProductionTargetExecutionLifecycleRecord,
} from "./farm_os_production_target_execution_lifecycle";
import {
  validateFarmOsProductionTargetExecutionReceiptLifecycleBinding,
  type FarmOsProductionTargetExecutionReceipt,
} from "./farm_os_production_target_execution_receipt_authority";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_TIMEOUT_MS,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ROLE,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_STATEMENT_TIMEOUT_MS,
  deriveFarmOsProductionTargetExecutionPostgresReservationIdentity,
  deriveFarmOsProductionTargetExecutionPostgresAttemptDigest,
  parseFarmOsProductionTargetExecutionPostgresSchemaIdentity,
  type FarmOsProductionTargetExecutionPostgresErrorCode,
} from "./farm_os_production_target_execution_postgres_contract";

type QueryResult<Row extends Record<string, unknown>> = Readonly<{
  rows: readonly Row[];
  rowCount: number | null;
}>;

export interface FarmOsProductionTargetExecutionPostgresClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  release(): void;
}

export interface FarmOsProductionTargetExecutionPostgresPool {
  connect(): Promise<FarmOsProductionTargetExecutionPostgresClient>;
}

export class FarmOsProductionTargetExecutionPostgresError extends Error {
  readonly code: FarmOsProductionTargetExecutionPostgresErrorCode;

  constructor(code: FarmOsProductionTargetExecutionPostgresErrorCode) {
    super(code);
    this.name = "FarmOsProductionTargetExecutionPostgresError";
    this.code = code;
  }
}

const WRITE_BEGIN = "begin isolation level serializable read write";
const READ_BEGIN = "begin isolation level serializable read only";
const SET_STATEMENT_TIMEOUT =
  `set local statement_timeout = '${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_STATEMENT_TIMEOUT_MS}ms'`;
const SET_LOCK_TIMEOUT =
  `set local lock_timeout = '${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_TIMEOUT_MS}ms'`;
const SET_ROLE = `set local role ${FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_ROLE}`;
const SCHEMA_IDENTITY_QUERY =
  "select ai.read_production_target_execution_schema_identity() as result";

const SQL = Object.freeze({
  appendProposal:
    "select ai.append_production_target_execution_proposal($1::jsonb) as result",
  appendApprovalAndReceipt:
    "select ai.append_production_target_execution_approval_and_receipt($1::jsonb) as result",
  readApprovalLineage:
    "select ai.read_production_target_execution_approval_lineage($1::jsonb) as result",
  appendRevocation:
    "select ai.append_production_target_execution_revocation_and_advance_head($1::jsonb) as result",
  readRevocation:
    "select ai.read_production_target_execution_revocation_state($1::jsonb) as result",
  appendCommand:
    "select ai.append_production_target_execution_command($1::jsonb) as result",
  readCommand:
    "select ai.read_production_target_execution_command($1::jsonb) as result",
  reserve:
    "select ai.reserve_production_target_execution($1::jsonb) as result",
  startAttempt:
    "select ai.start_production_target_execution_attempt($1::jsonb) as result",
  terminatePreStart:
    "select ai.terminate_production_target_execution_pre_start($1::jsonb) as result",
  finalize:
    "select ai.finalize_production_target_execution($1::jsonb) as result",
  readReservationReconciliation:
    "select ai.read_production_target_execution_reservation_reconciliation($1::jsonb) as result",
  resolveReservationAbsent:
    "select ai.resolve_production_target_execution_reservation_absent($1::jsonb) as result",
  resolveReservationPresent:
    "select ai.resolve_production_target_execution_reservation_present($1::jsonb) as result",
  readPostReservationAmbiguity:
    "select ai.read_production_target_execution_post_reservation_ambiguity($1::jsonb) as result",
  resolvePostReservationAmbiguity:
    "select ai.resolve_production_target_execution_post_reservation_ambiguity($1::jsonb) as result",
  readLifecycle:
    "select ai.read_production_target_execution_lifecycle($1::jsonb) as result",
  readReceipt:
    "select ai.read_production_target_execution_receipt($1::jsonb) as result",
});

type SqlName = keyof typeof SQL;
type UnknownRecord = Record<string, unknown>;

function record(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function driverCode(value: unknown): string {
  return record(value) && typeof value.code === "string" ? value.code : "";
}

function classifyError(value: unknown): FarmOsProductionTargetExecutionPostgresError {
  if (value instanceof FarmOsProductionTargetExecutionPostgresError) return value;
  const code = driverCode(value);
  if (code === "40001" || code === "40P01") {
    return new FarmOsProductionTargetExecutionPostgresError("SERIALIZATION_FAILURE");
  }
  if (code === "23505") {
    return new FarmOsProductionTargetExecutionPostgresError("CONFLICT");
  }
  if (code === "PTE01") {
    return new FarmOsProductionTargetExecutionPostgresError("SCHEMA_MISMATCH");
  }
  if (code === "PTE02") {
    return new FarmOsProductionTargetExecutionPostgresError("DIGEST_MISMATCH");
  }
  if (code === "PTE03") {
    return new FarmOsProductionTargetExecutionPostgresError("OBSERVATION_UNKNOWN");
  }
  if (code === "PTE04") {
    return new FarmOsProductionTargetExecutionPostgresError("CLOCK_REGRESSION");
  }
  if (code === "PTE05") {
    return new FarmOsProductionTargetExecutionPostgresError("STALE_EXPECTED_VERSION");
  }
  if (code === "PTE06") {
    return new FarmOsProductionTargetExecutionPostgresError("REVOCATION_CONFLICT");
  }
  if (code === "PTE07") {
    return new FarmOsProductionTargetExecutionPostgresError("APPROVAL_BOUND");
  }
  if (code === "PTE08") {
    return new FarmOsProductionTargetExecutionPostgresError("RECEIPT_CONFLICT");
  }
  if (code === "PTE09" || code === "22P02" || code === "23502" || code === "23514") {
    return new FarmOsProductionTargetExecutionPostgresError("INGRESS_CONTRACT_INVALID");
  }
  if (code === "PTE10") {
    return new FarmOsProductionTargetExecutionPostgresError("ALREADY_RESERVED");
  }
  if (code === "PTE11") {
    return new FarmOsProductionTargetExecutionPostgresError("ALREADY_STARTED");
  }
  if (code === "PTE12") {
    return new FarmOsProductionTargetExecutionPostgresError("ALREADY_FINALIZED");
  }
  if (code === "PTE13") {
    return new FarmOsProductionTargetExecutionPostgresError(
      "DEPENDENCY_REVALIDATION_FAILED",
    );
  }
  if (code === "23503") {
    return new FarmOsProductionTargetExecutionPostgresError(
      "DEPENDENCY_REVALIDATION_FAILED",
    );
  }
  if (code.startsWith("08") || ["57P01", "57P02", "57P03", "ECONNRESET",
    "ECONNREFUSED", "EPIPE", "57014", "55P03"].includes(code)) {
    return new FarmOsProductionTargetExecutionPostgresError("STORAGE_UNAVAILABLE");
  }
  if (code.startsWith("23")) {
    return new FarmOsProductionTargetExecutionPostgresError("CONFLICT");
  }
  return new FarmOsProductionTargetExecutionPostgresError("STORAGE_UNAVAILABLE");
}

function exactSingleResult(result: QueryResult<{ result: unknown }>): unknown {
  if (result.rows.length !== 1 || result.rowCount !== 1 ||
    !Object.hasOwn(result.rows[0] ?? {}, "result")) {
    throw new FarmOsProductionTargetExecutionPostgresError("DIGEST_MISMATCH");
  }
  return result.rows[0]!.result;
}

function portResult<T>(value: unknown): T {
  if (!record(value) || typeof value.status !== "string" || ![
    "STORED", "EXISTING_IDENTICAL", "CONFLICT", "WRITE_OUTCOME_UNKNOWN", "REJECTED",
    "RESERVED", "RESERVATION_OUTCOME_UNKNOWN", "ATTEMPT_STARTED",
    "ATTEMPT_START_OUTCOME_UNKNOWN", "FINALIZED", "FINALIZATION_OUTCOME_UNKNOWN",
    "EXACT_STATE_FOUND", "EXACT_STATE_ABSENT", "CONFIRMED_ABSENT_FINALIZED_OUTCOME_UNKNOWN",
    "CONFIRMED_PRESENT_CANCELLED_PRE_START", "STORAGE_OBSERVATION_UNKNOWN",
  ].includes(value.status)) {
    throw new FarmOsProductionTargetExecutionPostgresError("DIGEST_MISMATCH");
  }
  if (value.status === "RESERVED" || value.status === "ATTEMPT_STARTED") {
    const parsed = parseFarmOsProductionTargetExecutionLifecycleRecord(value.lifecycle);
    if (!parsed.accepted || !validateFarmOsProductionTargetExecutionRevocationRevalidationEvidence({
      evidence: value.revocation_revalidation,
      lifecycle: parsed.record,
      expected_transition: value.status === "RESERVED" ? "RESERVATION" : "ATTEMPT_START",
    })) {
      throw new FarmOsProductionTargetExecutionPostgresError("DIGEST_MISMATCH");
    }
  }
  if (value.status === "FINALIZED" || (value.status === "EXISTING_IDENTICAL" &&
    Object.hasOwn(value, "receipt"))) {
    const parsed = parseFarmOsProductionTargetExecutionLifecycleRecord(value.lifecycle);
    if (!parsed.accepted || !record(value.receipt) ||
      !validateFarmOsProductionTargetExecutionReceiptLifecycleBinding({
        receipt: value.receipt as unknown as FarmOsProductionTargetExecutionReceipt,
        lifecycle: parsed.record,
      })) {
      throw new FarmOsProductionTargetExecutionPostgresError("RECEIPT_CONFLICT");
    }
  }
  return value as T;
}

type PostReservationObservation =
  | Readonly<{ status: "TERMINAL_RECEIPT_EXACT";
    lifecycle: FarmOsProductionTargetExecutionLifecycleRecord;
    receipt: FarmOsProductionTargetExecutionReceipt }>
  | Readonly<{ status: "ATTEMPT_STARTED_EXACT" | "RESERVED_NOT_STARTED_EXACT" }>
  | Readonly<{ status: "OBSERVATION_UNKNOWN" }>;

export class FarmOsProductionTargetExecutionPostgresRepository
implements FarmOsProductionTargetExecutionApprovalSotPort,
  FarmOsProductionTargetExecutionCommandPort,
  FarmOsProductionTargetExecutionAtomicLifecyclePort {
  readonly port_version = FARM_OS_PRODUCTION_TARGET_EXECUTION_PERSISTENCE_PORT_VERSION;
  private readonly pool: FarmOsProductionTargetExecutionPostgresPool;

  constructor(input: Readonly<{ pool: FarmOsProductionTargetExecutionPostgresPool }>) {
    this.pool = input.pool;
  }

  private async setup(
    client: FarmOsProductionTargetExecutionPostgresClient,
    readOnly: boolean,
  ): Promise<void> {
    await client.query(readOnly ? READ_BEGIN : WRITE_BEGIN);
    await client.query(SET_STATEMENT_TIMEOUT);
    await client.query(SET_LOCK_TIMEOUT);
    await client.query(SET_ROLE);
    let identity: unknown;
    try {
      identity = exactSingleResult(await client.query<{ result: unknown }>(
        SCHEMA_IDENTITY_QUERY,
      ));
    } catch {
      throw new FarmOsProductionTargetExecutionPostgresError("SCHEMA_MISMATCH");
    }
    if (parseFarmOsProductionTargetExecutionPostgresSchemaIdentity(identity) === null) {
      throw new FarmOsProductionTargetExecutionPostgresError("SCHEMA_MISMATCH");
    }
  }

  private async rollback(client: FarmOsProductionTargetExecutionPostgresClient): Promise<void> {
    try {
      await client.query("rollback");
    } catch {
      // Fail closed; raw driver diagnostics are intentionally discarded.
    }
  }

  private async read(name: SqlName, input: unknown): Promise<unknown> {
    const client = await this.pool.connect().catch((error: unknown) => {
      throw classifyError(error);
    });
    try {
      await this.setup(client, true);
      const value = exactSingleResult(await client.query<{ result: unknown }>(
        SQL[name], [JSON.stringify(input)],
      ));
      await client.query("commit");
      return value;
    } catch (error) {
      await this.rollback(client);
      throw classifyError(error);
    } finally {
      client.release();
    }
  }

  private async write<T>(input: Readonly<{
    name: SqlName;
    value: unknown;
    commitUnknown: () => T;
  }>): Promise<T> {
    const client = await this.pool.connect().catch((error: unknown) => {
      throw classifyError(error);
    });
    let commitAttempted = false;
    try {
      await this.setup(client, false);
      const value = exactSingleResult(await client.query<{ result: unknown }>(
        SQL[input.name], [JSON.stringify(input.value)],
      ));
      const parsed = portResult<T>(value);
      commitAttempted = true;
      await client.query("commit");
      return parsed;
    } catch (error) {
      await this.rollback(client);
      if (commitAttempted) return input.commitUnknown();
      throw classifyError(error);
    } finally {
      client.release();
    }
  }

  appendProposal(input: Parameters<FarmOsProductionTargetExecutionApprovalSotPort["appendProposal"]>[0]) {
    return this.write<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionProposal>>({
      name: "appendProposal", value: input,
      commitUnknown: () => ({ status: "WRITE_OUTCOME_UNKNOWN", quarantine_required: true }),
    });
  }

  appendApprovalAndReceipt(
    input: Parameters<FarmOsProductionTargetExecutionApprovalSotPort["appendApprovalAndReceipt"]>[0],
  ) {
    return this.write<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionApprovalLineage>>({
      name: "appendApprovalAndReceipt", value: input,
      commitUnknown: () => ({ status: "WRITE_OUTCOME_UNKNOWN", quarantine_required: true }),
    });
  }

  async readApprovalLineage(
    input: Parameters<FarmOsProductionTargetExecutionApprovalSotPort["readApprovalLineage"]>[0],
  ): Promise<FarmOsProductionTargetExecutionApprovalLineage | null> {
    const value = await this.read("readApprovalLineage", input);
    return value === null || record(value)
      ? value as FarmOsProductionTargetExecutionApprovalLineage | null
      : null;
  }

  appendApprovalRevocationEventAndAdvanceHead(
    input: Parameters<FarmOsProductionTargetExecutionApprovalSotPort[
      "appendApprovalRevocationEventAndAdvanceHead"]>[0],
  ) {
    return this.write<FarmOsProductionTargetExecutionStoreResult<
      FarmOsProductionTargetExecutionApprovalRevocationState>>({
        name: "appendRevocation", value: input,
        commitUnknown: () => ({ status: "WRITE_OUTCOME_UNKNOWN", quarantine_required: true }),
      });
  }

  async readExactApprovalRevocationState(
    input: Parameters<FarmOsProductionTargetExecutionApprovalSotPort[
      "readExactApprovalRevocationState"]>[0],
  ): Promise<FarmOsProductionTargetExecutionApprovalRevocationReadResult> {
    return portResult(await this.read("readRevocation", input));
  }

  appendCommand(input: Parameters<FarmOsProductionTargetExecutionCommandPort["appendCommand"]>[0]) {
    return this.write<FarmOsProductionTargetExecutionStoreResult<FarmOsProductionTargetExecutionCommand>>({
      name: "appendCommand", value: input,
      commitUnknown: () => ({ status: "WRITE_OUTCOME_UNKNOWN", quarantine_required: true }),
    });
  }

  async readCommand(
    input: Parameters<FarmOsProductionTargetExecutionCommandPort["readCommand"]>[0],
  ): Promise<FarmOsProductionTargetExecutionCommand | null> {
    const value = await this.read("readCommand", input);
    return value === null || record(value)
      ? value as FarmOsProductionTargetExecutionCommand | null
      : null;
  }

  tryReserveWithApprovalRevalidation(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "tryReserveWithApprovalRevalidation"]>[0],
  ): Promise<FarmOsProductionTargetExecutionReservationResult> {
    const intendedReservation =
      deriveFarmOsProductionTargetExecutionPostgresReservationIdentity({
        command_id: input.command.command_id,
        execution_binding_digest: input.expected_execution_binding_digest,
        approval_id: input.expected_approval_id,
        approval_receipt_id: input.expected_approval_receipt_id,
        clock_evidence_id: input.clock_evidence.evidence_id,
        lifecycle_version: input.expected_lifecycle_version + 1,
      });
    return this.write({
      name: "reserve", value: Object.freeze({ ...input,
        intended_reservation_id: intendedReservation.reservation_id,
        intended_reservation_digest: intendedReservation.reservation_digest }),
      commitUnknown: () => ({ status: "RESERVATION_OUTCOME_UNKNOWN",
        quarantine_required: true, execution_allowed: false,
        reconciliation_required: true, command_id: input.command.command_id,
        execution_binding_digest: input.expected_execution_binding_digest }),
    });
  }

  tryMarkAttemptStarted(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "tryMarkAttemptStarted"]>[0],
  ): Promise<FarmOsProductionTargetExecutionAttemptStartResult> {
    if (input.attempt_digest !== deriveFarmOsProductionTargetExecutionPostgresAttemptDigest({
      attempt_id: input.attempt_id,
      reservation_id: input.reservation_id,
      reservation_digest: input.reservation_digest,
      command_id: input.command_id,
      execution_binding_digest: input.execution_binding_digest,
    })) {
      return Promise.resolve({ status: "REJECTED", reason: "INGRESS_CONTRACT_INVALID",
        execution_allowed: false });
    }
    return this.write({
      name: "startAttempt", value: input,
      commitUnknown: () => ({ status: "ATTEMPT_START_OUTCOME_UNKNOWN",
        quarantine_required: true, execution_allowed: false,
        reconciliation_required: true, command_id: input.command_id,
        execution_binding_digest: input.execution_binding_digest,
        attempt_id: input.attempt_id, attempt_digest: input.attempt_digest }),
    });
  }

  tryTerminatePreStartAndAppendReceipt(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "tryTerminatePreStartAndAppendReceipt"]>[0],
  ): Promise<FarmOsProductionTargetExecutionFinalizationResult> {
    return this.write({
      name: "terminatePreStart", value: input,
      commitUnknown: () => ({ status: "FINALIZATION_OUTCOME_UNKNOWN",
        quarantine_required: true, execution_allowed: false,
        reconciliation_required: true, command_id: input.command_id,
        execution_binding_digest: input.execution_binding_digest,
        intended_receipt_id: input.receipt.receipt_id,
        intended_receipt_digest: input.receipt.receipt_digest }),
    });
  }

  tryFinalizeAndAppendReceipt(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "tryFinalizeAndAppendReceipt"]>[0],
  ): Promise<FarmOsProductionTargetExecutionFinalizationResult> {
    return this.write({
      name: "finalize", value: input,
      commitUnknown: () => ({ status: "FINALIZATION_OUTCOME_UNKNOWN",
        quarantine_required: true, execution_allowed: false,
        reconciliation_required: true, command_id: input.command_id,
        execution_binding_digest: input.execution_binding_digest,
        intended_receipt_id: input.receipt.receipt_id,
        intended_receipt_digest: input.receipt.receipt_digest }),
    });
  }

  async reconcileReservationWriteAmbiguity(
    input: FarmOsProductionTargetExecutionReservationReconciliationInput,
  ): Promise<FarmOsProductionTargetExecutionReservationReconciliationResult> {
    let observation: FarmOsProductionTargetExecutionReservationReadback;
    try {
      const value = await this.read("readReservationReconciliation", input);
      if (!record(value) || !["RESERVATION_CONFIRMED_ABSENT",
        "RESERVATION_CONFIRMED_PRESENT", "RESERVATION_STORAGE_OBSERVATION_UNKNOWN"]
        .includes(String(value.result))) {
        throw new FarmOsProductionTargetExecutionPostgresError("OBSERVATION_UNKNOWN");
      }
      observation = value as unknown as FarmOsProductionTargetExecutionReservationReadback;
    } catch (error) {
      const classified = classifyError(error);
      const material = {
        result: "RESERVATION_STORAGE_OBSERVATION_UNKNOWN" as const,
        provenance: "PERSISTENCE_AUTHORITATIVE_READBACK_FAILED_CLOSED" as const,
        command_id: input.command_id,
        execution_binding_digest: input.execution_binding_digest,
        intended_reservation_id: input.intended_reservation_id,
        intended_reservation_digest: input.intended_reservation_digest,
        reason: classified.code === "SCHEMA_MISMATCH" ? "SCHEMA_MISMATCH" as const
          : "STORAGE_UNAVAILABLE" as const,
        state_mutation_prohibited: true as const,
        receipt_append_prohibited: true as const,
        automatic_retry: 0 as const,
        manual_review_required: true as const,
      };
      observation = Object.freeze({ ...material,
        observation_digest:
          computeFarmOsProductionTargetExecutionReservationObservationDigest(material) });
    }
    if (observation.result === "RESERVATION_STORAGE_OBSERVATION_UNKNOWN") {
      return Object.freeze({ status: "STORAGE_OBSERVATION_UNKNOWN",
        quarantine_required: true, observation, state_mutation_performed: false,
        receipt_appended: false, execution_allowed: false, automatic_retry: 0,
        manual_review_required: true });
    }
    const name = observation.result === "RESERVATION_CONFIRMED_ABSENT"
      ? "resolveReservationAbsent" : "resolveReservationPresent";
    const result = await this.write<FarmOsProductionTargetExecutionReservationReconciliationResult>({
      name, value: input,
      commitUnknown: () => ({ status: "REJECTED", reason: "STORAGE_READ_TIMEOUT_OUTCOME_UNKNOWN",
        execution_allowed: false }),
    });
    if ((result.status === "CONFIRMED_ABSENT_FINALIZED_OUTCOME_UNKNOWN" ||
      result.status === "CONFIRMED_PRESENT_CANCELLED_PRE_START" ||
      result.status === "STORAGE_OBSERVATION_UNKNOWN") &&
      !reservationReconciliationResolvedResultIsValid({ request: input, result })) {
      return Object.freeze({ status: "REJECTED", reason: "DIGEST_MISMATCH",
        execution_allowed: false });
    }
    return result;
  }

  async reconcilePostReservationAmbiguousWriteAndAppendReceipt(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "reconcilePostReservationAmbiguousWriteAndAppendReceipt"]>[0],
  ): Promise<FarmOsProductionTargetExecutionFinalizationResult> {
    let observation: PostReservationObservation;
    try {
      const value = await this.read("readPostReservationAmbiguity", input);
      observation = record(value) && typeof value.status === "string"
        ? value as PostReservationObservation
        : { status: "OBSERVATION_UNKNOWN" };
    } catch {
      observation = { status: "OBSERVATION_UNKNOWN" };
    }
    if (observation.status === "OBSERVATION_UNKNOWN") {
      return Object.freeze({ status: "FINALIZATION_OUTCOME_UNKNOWN",
        quarantine_required: true, execution_allowed: false,
        reconciliation_required: true, command_id: input.command_id,
        execution_binding_digest: input.execution_binding_digest,
        intended_receipt_id: input.outcome_unknown_receipt.receipt_id,
        intended_receipt_digest: input.outcome_unknown_receipt.receipt_digest });
    }
    if (observation.status === "TERMINAL_RECEIPT_EXACT") {
      return Object.freeze({ status: "EXISTING_IDENTICAL",
        lifecycle: observation.lifecycle, receipt: observation.receipt,
        execution_allowed: false });
    }
    return this.write({
      name: "resolvePostReservationAmbiguity", value: input,
      commitUnknown: () => ({ status: "FINALIZATION_OUTCOME_UNKNOWN",
        quarantine_required: true, execution_allowed: false,
        reconciliation_required: true, command_id: input.command_id,
        execution_binding_digest: input.execution_binding_digest,
        intended_receipt_id: input.outcome_unknown_receipt.receipt_id,
        intended_receipt_digest: input.outcome_unknown_receipt.receipt_digest }),
    });
  }

  async readLifecycle(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort["readLifecycle"]>[0],
  ): Promise<FarmOsProductionTargetExecutionLifecycleRecord | null> {
    const value = await this.read("readLifecycle", input);
    if (value === null) return null;
    const parsed = parseFarmOsProductionTargetExecutionLifecycleRecord(value);
    if (!parsed.accepted) {
      throw new FarmOsProductionTargetExecutionPostgresError("DIGEST_MISMATCH");
    }
    return parsed.record;
  }

  async readExecutionReceipt(
    input: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "readExecutionReceipt"]>[0],
  ): Promise<FarmOsProductionTargetExecutionReceipt | null> {
    const value = await this.read("readReceipt", input);
    return value === null || record(value)
      ? value as FarmOsProductionTargetExecutionReceipt | null
      : null;
  }

  asPorts(): FarmOsProductionTargetExecutionPersistencePorts {
    return Object.freeze({ approval_sot: this, command_store: this, atomic_lifecycle: this });
  }
}

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS = Object.freeze({
  WRITE_BEGIN, READ_BEGIN, SET_STATEMENT_TIMEOUT, SET_LOCK_TIMEOUT, SET_ROLE,
  SCHEMA_IDENTITY_QUERY, SQL,
  expected_schema_identity: FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY,
});
