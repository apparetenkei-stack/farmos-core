import { parseHermesWorkerWakeRequest } from "../startup_runtime/hermes_worker_startup_store";
import { parseExecution } from "../wake_runtime/hermes_wake_execution_store";
import type { HermesWakeConfirmationResult } from "./hermes_wake_confirmation_contract";
import {
  HERMES_WAKE_CONFIRMATION_POLICY,
  createHermesWakeConfirmationRecord,
  createHermesWakeConfirmationRequirement,
  createHermesWakeConfirmationSummary,
  evaluateHermesWakeConfirmation,
  parseHermesConfirmationWorkerRecord,
  parseHermesWakeConfirmationRecord,
} from "./hermes_wake_confirmation_policy";
import {
  createHermesWakeConfirmationKeys,
  type HermesWakeConfirmationContext,
} from "./hermes_wake_confirmation_store";

const fail = (code: string): HermesWakeConfirmationResult => ({
  ok: false,
  status:
    code === "confirmation_disabled"
      ? "disabled"
      : code === "confirmation_store_unavailable"
        ? "not_ready"
        : "failed",
  error_code: code,
  worker_boot_confirmed: false,
  worker_accepting_jobs: false,
  confirmation_write_performed: false,
  fail_closed: true,
});

const result = (
  status: "created" | "already_exists" | "checked",
  confirmation: NonNullable<ReturnType<typeof parseHermesWakeConfirmationRecord>>,
  write: boolean,
): HermesWakeConfirmationResult => ({
  ok: true,
  status,
  confirmation,
  worker_boot_confirmed: confirmation.worker_boot_confirmed,
  worker_accepting_jobs: confirmation.worker_accepting_jobs,
  confirmation_write_performed: write,
});

export async function createHermesWakeConfirmation(input: {
  wakeRequestId: string;
  context: HermesWakeConfirmationContext;
  confirmationIdFactory?: () => string;
}): Promise<HermesWakeConfirmationResult> {
  if (!input.context.enabled) return fail("confirmation_disabled");
  let store;
  try {
    store = await input.context.storeFactory();
    const keys = input.context.keys ?? createHermesWakeConfirmationKeys();
    const now = (input.context.nowIsoFactory ?? (() => new Date().toISOString()))();
    const requestRaw = await store.get(keys.request(input.wakeRequestId));
    const executionRaw = await store.get(keys.execution(input.wakeRequestId));
    if (!requestRaw) return fail("confirmation_request_invalid");
    if (!executionRaw) return fail("confirmation_execution_invalid");
    const request = parseHermesWorkerWakeRequest(requestRaw);
    const execution = parseExecution(executionRaw);
    if (!request) return fail("confirmation_request_invalid");
    if (!execution) return fail("confirmation_execution_invalid");
    if (
      request.wake_request_id !== input.wakeRequestId ||
      execution.wake_request_id !== input.wakeRequestId
    ) {
      return fail("confirmation_execution_invalid");
    }
    if (request.target_worker_id !== execution.target_worker_id) {
      return fail("confirmation_target_mismatch");
    }
    if (request.routing_decision_id !== execution.routing_decision_id) {
      return fail("confirmation_routing_mismatch");
    }

    let record;
    try {
      const requirement = createHermesWakeConfirmationRequirement({ request, execution, nowIso: now });
      record = createHermesWakeConfirmationRecord({
        requirement,
        nowIso: now,
        confirmationIdFactory: input.confirmationIdFactory,
      });
    } catch {
      return fail("confirmation_execution_invalid");
    }
    const atomic = await store.createAtomic({
      requestKey: keys.request(input.wakeRequestId),
      executionKey: keys.execution(input.wakeRequestId),
      confirmationKey: keys.confirmation(input.wakeRequestId),
      newConfirmationIdKey: keys.confirmationId(record.confirmation_id),
      confirmationIdKeyPrefix: `${keys.prefix}:wake-confirmation-id:`,
      newConfirmationId: record.confirmation_id,
      wakeRequestId: input.wakeRequestId,
      executionId: execution.execution_id,
      targetWorkerId: execution.target_worker_id,
      serialized: JSON.stringify(record),
      expiresAtMs:
        Date.parse(record.deadline_at) + HERMES_WAKE_CONFIRMATION_POLICY.record_retention_ms,
    });
    if (atomic.status !== "created" && atomic.status !== "already_exists") {
      return fail(atomic.status);
    }
    const canonical = atomic.record ? parseHermesWakeConfirmationRecord(atomic.record) : null;
    if (!canonical) return fail("confirmation_record_invalid");
    const expectedDeadline = new Date(
      Date.parse(execution.completed_at!) + HERMES_WAKE_CONFIRMATION_POLICY.confirmation_window_ms,
    ).toISOString();
    if (
      canonical.wake_request_id !== request.wake_request_id ||
      canonical.execution_id !== execution.execution_id ||
      canonical.target_worker_id !== request.target_worker_id ||
      canonical.target_worker_id !== execution.target_worker_id ||
      canonical.required_capability !== request.required_capability ||
      canonical.execution_completed_at !== execution.completed_at ||
      canonical.deadline_at !== expectedDeadline
    ) {
      return fail("confirmation_conflict");
    }
    if (
      (await store.get(keys.confirmationId(canonical.confirmation_id))) !==
      canonical.wake_request_id
    ) {
      return fail("confirmation_record_invalid");
    }
    return result(atomic.status, canonical, atomic.status === "created");
  } catch {
    return fail("confirmation_store_unavailable");
  } finally {
    await store?.disconnect().catch(() => undefined);
  }
}

export async function checkHermesWakeConfirmationOnce(input: {
  wakeRequestId: string;
  context: HermesWakeConfirmationContext;
}): Promise<HermesWakeConfirmationResult> {
  if (!input.context.enabled) return fail("confirmation_disabled");
  let store;
  try {
    store = await input.context.storeFactory();
    const keys = input.context.keys ?? createHermesWakeConfirmationKeys();
    const raw = await store.get(keys.confirmation(input.wakeRequestId));
    if (!raw) return fail("confirmation_record_invalid");
    const confirmation = parseHermesWakeConfirmationRecord(raw);
    if (!confirmation) return fail("confirmation_record_invalid");
    const workerRaw = await store.get(keys.worker(confirmation.target_worker_id));
    const workerRecord = workerRaw ? parseHermesConfirmationWorkerRecord(workerRaw) : null;
    if (workerRaw && !workerRecord) return fail("confirmation_worker_record_invalid");
    const now = (input.context.nowIsoFactory ?? (() => new Date().toISOString()))();
    const evaluated = evaluateHermesWakeConfirmation({
      confirmation,
      worker: workerRecord?.worker ?? null,
      nowIso: now,
    });
    if (evaluated.error_code || !evaluated.record) {
      return fail(evaluated.error_code ?? "confirmation_worker_record_invalid");
    }
    if (evaluated.record === confirmation) return result("checked", confirmation, false);
    const atomic = await store.updateAtomic({
      confirmationKey: keys.confirmation(input.wakeRequestId),
      confirmationId: confirmation.confirmation_id,
      wakeRequestId: confirmation.wake_request_id,
      executionId: confirmation.execution_id,
      targetWorkerId: confirmation.target_worker_id,
      serialized: JSON.stringify(evaluated.record),
    });
    if (!['updated', 'terminal_unchanged'].includes(atomic.status)) return fail(atomic.status);
    const canonical = atomic.record ? parseHermesWakeConfirmationRecord(atomic.record) : null;
    if (!canonical) return fail("confirmation_record_invalid");
    return result("checked", canonical, atomic.status === "updated");
  } catch {
    return fail("confirmation_store_unavailable");
  } finally {
    await store?.disconnect().catch(() => undefined);
  }
}

export async function getHermesWakeConfirmationStatus(
  wakeRequestId: string,
  context: HermesWakeConfirmationContext,
) {
  if (!context.enabled) return fail("confirmation_disabled");
  let store;
  try {
    store = await context.storeFactory();
    const raw = await store.get(
      (context.keys ?? createHermesWakeConfirmationKeys()).confirmation(wakeRequestId),
    );
    if (!raw) return { ok: true as const, status: "not_found" as const, confirmation: null };
    const record = parseHermesWakeConfirmationRecord(raw);
    if (!record) return fail("confirmation_record_invalid");
    return {
      ok: true as const,
      status: "found" as const,
      confirmation: createHermesWakeConfirmationSummary(record),
    };
  } catch {
    return fail("confirmation_store_unavailable");
  } finally {
    await store?.disconnect().catch(() => undefined);
  }
}
