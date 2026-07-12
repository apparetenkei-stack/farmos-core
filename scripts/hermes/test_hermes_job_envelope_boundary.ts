import assert from "node:assert/strict";

import { createHermesRuntimeRequestId } from "./llm_runtime/hermes_runtime_contract";
import {
  HERMES_JOB_DEFAULT_TTL_MS,
  canTransitionHermesJobStatus,
  createHermesJobEnvelope,
  createHermesJobPayload,
  isHermesJobExpired,
  isHermesJobTerminalStatus,
  transitionHermesJobEnvelope,
  type HermesJobStatus,
} from "./job_runtime/hermes_job_envelope";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const REQUEST_ID = "00000000-0000-4000-8000-000000000001";
const CREATED_AT = "2026-07-11T06:00:00.000Z";

function createEnvelope() {
  return createHermesJobEnvelope({
    requestId: REQUEST_ID,
    payload: {
      message: "safe job payload",
      include_readonly_context: true,
    },
    nowIsoFactory: () => CREATED_AT,
  });
}

function assertSafety(envelope: ReturnType<typeof createEnvelope>): void {
  assert.deepEqual(envelope.safety, {
    secret_in_payload: false,
    credentials_in_payload: false,
    db_connection_in_payload: false,
    business_db_write_allowed: false,
    proposal_write_allowed: false,
    queue_write_performed: false,
    worker_execution_performed: false,
    fail_closed: true,
  });
}

function assertTransition(from: HermesJobStatus, to: HermesJobStatus): void {
  const queued = createEnvelope();
  const running = transitionHermesJobEnvelope(queued, "running", "2026-07-11T06:00:01.000Z");
  const source = from === "queued" ? queued
    : from === "failed" ? transitionHermesJobEnvelope(running, "failed", "2026-07-11T06:00:01.500Z")
    : from === "retry_scheduled" ? { ...running, runtime: { ...running.runtime, status: "retry_scheduled" as const } }
    : running;
  assert.equal(source.runtime.status, from);

  const before = structuredClone(source);
  const transitioned = transitionHermesJobEnvelope(
    source,
    to,
    "2026-07-11T06:00:02.000Z",
  );
  assert.equal(transitioned.runtime.status, to);
  assert.equal(transitioned.runtime.updated_at, "2026-07-11T06:00:02.000Z");
  assert.equal(transitioned.runtime.request_id, before.runtime.request_id);
  assert.equal(transitioned.runtime.job_id, before.runtime.job_id);
  assert.equal(transitioned.runtime.created_at, before.runtime.created_at);
  assert.deepEqual(transitioned.payload, before.payload);

  const expected = structuredClone(before);
  expected.runtime.status = to;
  expected.runtime.updated_at = "2026-07-11T06:00:02.000Z";
  assert.deepEqual(transitioned, expected);
}

function main(): void {
  const requestId = createHermesRuntimeRequestId();
  const first = createHermesJobEnvelope({
    requestId,
    payload: { message: "first job", include_readonly_context: false },
    nowIsoFactory: () => CREATED_AT,
  });
  const second = createHermesJobEnvelope({
    requestId,
    payload: { message: "second job", include_readonly_context: false },
    nowIsoFactory: () => CREATED_AT,
  });
  assert.match(first.runtime.job_id, UUID_PATTERN);
  assert.notEqual(requestId, first.runtime.job_id);
  assert.notEqual(first.runtime.job_id, second.runtime.job_id);
  assert.equal(first.runtime.request_id, second.runtime.request_id);

  const injected = createHermesJobEnvelope({
    requestId: REQUEST_ID,
    payload: { message: "injected identifiers", include_readonly_context: false },
    jobIdFactory: () => "injected-job-id",
    nowIsoFactory: () => CREATED_AT,
  });
  assert.equal(injected.runtime.job_id, "injected-job-id");
  assert.equal(injected.runtime.created_at, CREATED_AT);

  const envelope = createEnvelope();
  assert.equal(envelope.schema_version, "hermes.job.v1");
  assert.equal(envelope.job_type, "hermes_chat");
  assert.equal(envelope.runtime.status, "queued");
  assert.equal(envelope.runtime.execution_mode, "queued");
  assert.equal(envelope.runtime.execution_target, "unassigned");
  assert.equal(envelope.runtime.attempt, 0);
  assert.equal(envelope.runtime.max_attempts, 1);
  assert.equal(envelope.runtime.retry_enabled, false);
  assert.equal(envelope.runtime.queue_persisted, false);
  assert.equal(envelope.runtime.worker_assigned, false);
  assertSafety(envelope);

  const sanitized = createHermesJobPayload({
    message: "  safe normalized message  ",
    include_readonly_context: false,
    provider: "must-not-copy",
    model: "must-not-copy",
    timeout: 30000,
    timeout_ms: 30000,
    base_url: "must-not-copy",
    baseUrl: "must-not-copy",
    apiKey: "must-not-copy",
    token: "must-not-copy",
    credentials: "must-not-copy",
    authorization: "must-not-copy",
    cookie: "must-not-copy",
    dbConnection: "must-not-copy",
    connectionString: "must-not-copy",
    databaseUrl: "must-not-copy",
    serviceRole: "must-not-copy",
    systemPrompt: "must-not-copy",
    proposalBody: "must-not-copy",
    readonly_context: "must-not-copy",
    readonly_context_text: "must-not-copy",
    request_id: "must-not-copy",
    job_id: "must-not-copy",
    priority: "must-not-copy",
    model_class: "must-not-copy",
  });
  assert.deepEqual(sanitized, {
    message: "safe normalized message",
    include_readonly_context: false,
  });
  assert.deepEqual(Object.keys(sanitized).sort(), [
    "include_readonly_context",
    "message",
  ]);

  assert.throws(() => createHermesJobPayload({ message: "", include_readonly_context: false }));
  assert.throws(() => createHermesJobPayload({ message: "x".repeat(501), include_readonly_context: false }));
  assert.throws(() => createHermesJobPayload({ message: "two\nlines", include_readonly_context: false }));
  assert.throws(() => createHermesJobPayload({ message: "valid", include_readonly_context: "false" }));
  assert.throws(() => createHermesJobEnvelope({
    requestId: REQUEST_ID,
    payload: { message: "same id", include_readonly_context: false },
    jobIdFactory: () => REQUEST_ID,
  }));

  const allowedTransitions: ReadonlyArray<readonly [HermesJobStatus, HermesJobStatus]> = [
    ["queued", "running"],
    ["queued", "cancelled"],
    ["queued", "expired"],
    ["running", "succeeded"],
    ["running", "failed"],
    ["running", "cancelled"],
    ["running", "expired"],
    ["retry_scheduled", "cancelled"],
    ["retry_scheduled", "expired"],
  ];
  for (const [from, to] of allowedTransitions) {
    assert.equal(canTransitionHermesJobStatus(from, to), true);
    assertTransition(from, to);
  }

  const forbiddenTransitions: ReadonlyArray<readonly [HermesJobStatus, HermesJobStatus]> = [
    ["queued", "succeeded"],
    ["queued", "failed"],
    ["running", "queued"],
    ["succeeded", "running"],
    ["failed", "queued"],
    ["failed", "retry_scheduled"],
    ["retry_scheduled", "running"],
    ["retry_scheduled", "queued"],
    ["cancelled", "running"],
    ["expired", "queued"],
  ];
  for (const [from, to] of forbiddenTransitions) {
    assert.equal(canTransitionHermesJobStatus(from, to), false);
  }

  const statuses: readonly HermesJobStatus[] = [
    "queued",
    "running",
    "succeeded",
    "failed",
    "retry_scheduled",
    "cancelled",
    "expired",
  ];
  for (const from of statuses) {
    for (const to of statuses) {
      const expected = allowedTransitions.some(
        ([allowedFrom, allowedTo]) => allowedFrom === from && allowedTo === to,
      );
      assert.equal(canTransitionHermesJobStatus(from, to), expected);
    }
  }
  assert.equal(isHermesJobTerminalStatus("succeeded"), true);
  assert.equal(isHermesJobTerminalStatus("cancelled"), true);
  assert.equal(isHermesJobTerminalStatus("expired"), true);
  assert.equal(isHermesJobTerminalStatus("failed"), true);
  assert.equal(isHermesJobTerminalStatus("retry_scheduled"), false);

  const createdMs = Date.parse(envelope.runtime.created_at);
  const expiresMs = Date.parse(envelope.runtime.expires_at);
  assert.equal(expiresMs - createdMs, HERMES_JOB_DEFAULT_TTL_MS);
  assert.ok(expiresMs > createdMs);
  assert.equal(isHermesJobExpired(envelope, "2026-07-11T06:04:59.999Z"), false);
  assert.equal(isHermesJobExpired(envelope, "2026-07-11T06:05:00.000Z"), true);
  assert.equal(HERMES_JOB_DEFAULT_TTL_MS, 300000);

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_job_envelope_boundary",
    schema_version: envelope.schema_version,
    statuses_defined: 7,
    allowed_transitions_checked: allowedTransitions.length,
    terminal_statuses_fail_closed: true,
    redis_connection_performed: false,
    db_connection_performed: false,
    external_communication_performed: false,
    file_persistence_performed: false,
    proposal_changed: false,
    api_route_added: false,
  }, null, 2));
}

main();
