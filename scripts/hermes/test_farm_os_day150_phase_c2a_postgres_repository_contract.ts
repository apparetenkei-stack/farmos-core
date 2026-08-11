import assert from "node:assert/strict";

import type {
  FarmOsProductionTargetExecutionReservationReconciliationInput,
} from "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";
import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTOMATIC_RETRY,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_ORDER,
  deriveFarmOsProductionTargetExecutionPostgresAttemptDigest,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";
import {
  FarmOsProductionTargetExecutionPostgresError,
  FarmOsProductionTargetExecutionPostgresRepository,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS,
  type FarmOsProductionTargetExecutionPostgresClient,
  type FarmOsProductionTargetExecutionPostgresPool,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_repository";

type Response = unknown | Error;

class FakePool implements FarmOsProductionTargetExecutionPostgresPool {
  readonly queries: string[] = [];
  readonly values: (readonly unknown[] | undefined)[] = [];
  readonly responses = new Map<string, Response[]>();
  connectCount = 0;
  commitFailures = 0;
  schemaIdentity: unknown = FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY;

  enqueue(fragment: string, ...responses: Response[]): void {
    this.responses.set(fragment, [...(this.responses.get(fragment) ?? []), ...responses]);
  }

  async connect(): Promise<FarmOsProductionTargetExecutionPostgresClient> {
    this.connectCount += 1;
    return {
      query: async <Row extends Record<string, unknown>>(text: string,
        values?: readonly unknown[]) => {
        this.queries.push(text);
        this.values.push(values);
        if (text === FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS
          .SCHEMA_IDENTITY_QUERY) {
          const identityRows = [{ result: this.schemaIdentity }];
          return { rows: identityRows as unknown as Row[], rowCount: 1 };
        }
        if (text === "commit" && this.commitFailures > 0) {
          this.commitFailures -= 1;
          throw Object.assign(new Error("sensitive driver detail"), { code: "ECONNRESET" });
        }
        const matched = [...this.responses.entries()].find(([fragment]) => text.includes(fragment));
        if (matched) {
          const response = matched[1].shift();
          if (response instanceof Error) throw response;
          return { rows: [{ result: response }] as unknown as Row[], rowCount: 1 };
        }
        return { rows: [] as Row[], rowCount: null };
      },
      release: () => undefined,
    };
  }
}

const rejected = Object.freeze({ status: "REJECTED", reason: "DIGEST_MISMATCH",
  execution_allowed: false });
const reserveInput = Object.freeze({
  command: { command_id: "probecmd_test" },
  expected_execution_binding_digest: "sha256:binding",
  expected_approval_id: "approval.test",
  expected_approval_receipt_id: "approval-receipt.test",
  expected_lifecycle_version: 0,
  clock_evidence: { evidence_id: "clock.test" },
});
const attemptMaterial = Object.freeze({ command_id: "probecmd_test",
  execution_binding_digest: "sha256:binding", attempt_id: "attempt.test",
  reservation_id: "reservation.test", reservation_digest: "sha256:reservation" });
const attemptInput = Object.freeze({ ...attemptMaterial,
  attempt_digest: deriveFarmOsProductionTargetExecutionPostgresAttemptDigest(
    attemptMaterial as never) });
const receipt = Object.freeze({ receipt_id: "receipt.test", receipt_digest: "sha256:receipt" });
const finalizationInput = Object.freeze({ command_id: "probecmd_test",
  execution_binding_digest: "sha256:binding", receipt });
const ambiguityInput = Object.freeze({
  command_id: "probecmd_test", execution_binding_digest: "sha256:binding",
  intended_reservation_id: "reservation.test",
  intended_reservation_digest: "sha256:reservation",
  confirmed_absent_receipt_candidate: receipt,
  confirmed_present_cancellation_receipt_candidate: receipt,
}) as unknown as FarmOsProductionTargetExecutionReservationReconciliationInput;
const postAmbiguityInput = Object.freeze({ command_id: "probecmd_test",
  execution_binding_digest: "sha256:binding", ambiguity_stage: "ATTEMPT_START",
  outcome_unknown_receipt: receipt });

const stored = Object.freeze({ status: "STORED", value: {} });
{
  const pool = new FakePool();
  pool.enqueue("append_production_target_execution_proposal", stored);
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  assert.equal((await repository.appendProposal({} as never)).status, "STORED");
  assert.deepEqual(pool.queries.slice(0, 5), [
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS.WRITE_BEGIN,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS.SET_STATEMENT_TIMEOUT,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS.SET_LOCK_TIMEOUT,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS.SET_ROLE,
    FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_TEST_CONSTANTS.SCHEMA_IDENTITY_QUERY,
  ]);
  assert.equal(pool.queries.at(-1), "commit");
}

{
  const pool = new FakePool();
  pool.enqueue("append_production_target_execution_proposal",
    Object.assign(new Error("raw sql must not escape"), { code: "40001" }));
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  await assert.rejects(repository.appendProposal({} as never), (error: unknown) => {
    assert.ok(error instanceof FarmOsProductionTargetExecutionPostgresError);
    assert.equal(error.code, "SERIALIZATION_FAILURE");
    assert.equal(error.message, "SERIALIZATION_FAILURE");
    return true;
  });
  assert.equal(pool.connectCount, 1);
  assert.equal(pool.queries.filter((query) => query.includes(
    "append_production_target_execution_proposal")).length, 1);
  assert.equal(pool.queries.at(-1), "rollback");
}

for (const [driverCode, expected] of [
  ["40P01", "SERIALIZATION_FAILURE"],
  ["23505", "CONFLICT"],
  ["23503", "DEPENDENCY_REVALIDATION_FAILED"],
  ["23514", "INGRESS_CONTRACT_INVALID"],
  ["23502", "INGRESS_CONTRACT_INVALID"],
  ["57014", "STORAGE_UNAVAILABLE"],
  ["55P03", "STORAGE_UNAVAILABLE"],
  ["PTE01", "SCHEMA_MISMATCH"],
  ["PTE02", "DIGEST_MISMATCH"],
  ["PTE03", "OBSERVATION_UNKNOWN"],
  ["PTE04", "CLOCK_REGRESSION"],
  ["PTE05", "STALE_EXPECTED_VERSION"],
  ["PTE06", "REVOCATION_CONFLICT"],
  ["PTE07", "APPROVAL_BOUND"],
  ["PTE08", "RECEIPT_CONFLICT"],
  ["PTE09", "INGRESS_CONTRACT_INVALID"],
  ["PTE10", "ALREADY_RESERVED"],
  ["PTE11", "ALREADY_STARTED"],
  ["PTE12", "ALREADY_FINALIZED"],
  ["PTE13", "DEPENDENCY_REVALIDATION_FAILED"],
] as const) {
  const pool = new FakePool();
  pool.enqueue("append_production_target_execution_proposal",
    Object.assign(new Error("redacted driver payload"), { code: driverCode }));
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  await assert.rejects(repository.appendProposal({} as never), (error: unknown) => {
    assert.ok(error instanceof FarmOsProductionTargetExecutionPostgresError);
    assert.equal(error.code, expected);
    assert.equal(error.message, expected);
    return true;
  });
  assert.equal(pool.connectCount, 1);
  assert.equal(pool.queries.filter((query) => query.includes(
    "append_production_target_execution_proposal")).length, 1);
}

{
  const pool = new FakePool();
  pool.schemaIdentity = { ...FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_EXPECTED_SCHEMA_IDENTITY,
    trigger_registry_digest: "sha256:wrong" };
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  await assert.rejects(repository.appendProposal({} as never),
    (error: unknown) => error instanceof FarmOsProductionTargetExecutionPostgresError &&
      error.code === "SCHEMA_MISMATCH");
  assert.equal(pool.queries.some((query) => query.includes(
    "append_production_target_execution_proposal")), false);
}

for (const [fragment, invoke] of [
  ["reserve_production_target_execution", (repository:
    FarmOsProductionTargetExecutionPostgresRepository) =>
    repository.tryReserveWithApprovalRevalidation(reserveInput as never)],
  ["start_production_target_execution_attempt", (repository:
    FarmOsProductionTargetExecutionPostgresRepository) =>
    repository.tryMarkAttemptStarted(attemptInput as never)],
] as const) {
  const pool = new FakePool();
  pool.enqueue(fragment, { status: fragment.startsWith("reserve") ? "RESERVED" :
    "ATTEMPT_STARTED", lifecycle: {}, revocation_revalidation: {} });
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  await assert.rejects(invoke(repository), (error: unknown) =>
    error instanceof FarmOsProductionTargetExecutionPostgresError &&
      error.code === "DIGEST_MISMATCH");
  assert.equal(pool.queries.at(-1), "rollback");
}

{
  const pool = new FakePool();
  pool.enqueue("reserve_production_target_execution", rejected);
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  const result = await repository.tryReserveWithApprovalRevalidation(reserveInput as never);
  assert.equal(result.status, "REJECTED");
  assert.ok(pool.queries.some((query) => query.includes("reserve_production_target_execution")));
  const serialized = String(pool.values[pool.queries.findIndex((query) =>
    query.includes("reserve_production_target_execution"))]?.[0]);
  assert.match(serialized, /"intended_reservation_id":"reservation\.[a-f0-9]{64}"/);
  assert.match(serialized, /"intended_reservation_digest":"sha256:[a-f0-9]{64}"/);
}

{
  const pool = new FakePool();
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  assert.equal((await repository.tryMarkAttemptStarted({ ...attemptInput,
    attempt_digest: "sha256:wrong" } as never)).status, "REJECTED");
  assert.equal(pool.connectCount, 0);
}

{
  const pool = new FakePool();
  pool.enqueue("reserve_production_target_execution", rejected);
  pool.commitFailures = 1;
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  const result = await repository.tryReserveWithApprovalRevalidation(reserveInput as never);
  assert.equal(result.status, "RESERVATION_OUTCOME_UNKNOWN");
  assert.equal(pool.connectCount, 1);
}

for (const branch of ["RESERVATION_CONFIRMED_ABSENT",
  "RESERVATION_CONFIRMED_PRESENT"] as const) {
  const pool = new FakePool();
  pool.enqueue("read_production_target_execution_reservation_reconciliation", {
    result: branch,
  });
  pool.enqueue(branch === "RESERVATION_CONFIRMED_ABSENT"
    ? "resolve_production_target_execution_reservation_absent"
    : "resolve_production_target_execution_reservation_present", rejected);
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  await repository.reconcileReservationWriteAmbiguity(ambiguityInput);
  assert.equal(pool.connectCount, 2);
  assert.ok(pool.queries.some((query) => query.includes(branch ===
    "RESERVATION_CONFIRMED_ABSENT" ? "reservation_absent" : "reservation_present")));
}

{
  const pool = new FakePool();
  pool.enqueue("read_production_target_execution_reservation_reconciliation", {
    result: "RESERVATION_STORAGE_OBSERVATION_UNKNOWN",
  });
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  const result = await repository.reconcileReservationWriteAmbiguity(ambiguityInput);
  assert.equal(result.status, "STORAGE_OBSERVATION_UNKNOWN");
  assert.equal(pool.connectCount, 1);
  assert.equal(pool.queries.filter((query) => query.includes("resolve_production")).length, 0);
}

{
  const pool = new FakePool();
  pool.enqueue("revocation_and_advance_head", { status: "CONFLICT" });
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  assert.equal((await repository.appendApprovalRevocationEventAndAdvanceHead({} as never)).status,
    "CONFLICT");
  assert.ok(pool.queries.some((query) => query.includes("revocation_and_advance_head")));
}

{
  const pool = new FakePool();
  pool.enqueue("start_production_target_execution_attempt", rejected);
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  assert.equal((await repository.tryMarkAttemptStarted(attemptInput as never)).status, "REJECTED");
  pool.enqueue("start_production_target_execution_attempt", rejected);
  pool.commitFailures = 1;
  assert.equal((await repository.tryMarkAttemptStarted(attemptInput as never)).status,
    "ATTEMPT_START_OUTCOME_UNKNOWN");
}

{
  const pool = new FakePool();
  pool.enqueue("finalize_production_target_execution", rejected);
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  assert.equal((await repository.tryFinalizeAndAppendReceipt(finalizationInput as never)).status,
    "REJECTED");
  assert.equal(pool.queries.filter((query) => query.includes(
    "finalize_production_target_execution")).length, 1);
}

for (const observation of ["ATTEMPT_STARTED_EXACT", "RESERVED_NOT_STARTED_EXACT"] as const) {
  const pool = new FakePool();
  pool.enqueue("read_production_target_execution_post_reservation_ambiguity",
    { status: observation });
  pool.enqueue("resolve_production_target_execution_post_reservation_ambiguity", rejected);
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  await repository.reconcilePostReservationAmbiguousWriteAndAppendReceipt(
    postAmbiguityInput as never);
  assert.equal(pool.connectCount, 2);
}
{
  const pool = new FakePool();
  pool.enqueue("read_production_target_execution_post_reservation_ambiguity",
    { status: "OBSERVATION_UNKNOWN" });
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({ pool });
  assert.equal((await repository.reconcilePostReservationAmbiguousWriteAndAppendReceipt(
    postAmbiguityInput as never)).status, "FINALIZATION_OUTCOME_UNKNOWN");
  assert.equal(pool.connectCount, 1);
}

assert.equal(FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_AUTOMATIC_RETRY, 0);
assert.deepEqual(FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_LOCK_ORDER, [
  "CLOCK_FLOOR", "PROPOSAL", "APPROVAL", "APPROVAL_RECEIPT", "REVOCATION_HEAD",
  "APPROVAL_USE", "COMMAND", "LIFECYCLE", "RESERVATION", "ATTEMPT",
  "EXECUTION_RECEIPT_OR_RECONCILIATION",
]);
console.log("farm_os_day150_phase_c2a_postgres_repository_contract: PASS");
