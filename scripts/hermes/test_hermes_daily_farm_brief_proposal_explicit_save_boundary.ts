import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import * as explicitSaveBoundary from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION,
  executeHermesDailyFarmBriefProposalExplicitSave,
  parseHermesDailyFarmBriefProposalExplicitSaveRequest,
  parseHermesDailyFarmBriefProposalInboxRecord,
  prepareHermesDailyFarmBriefProposalExplicitSave,
  type ExplicitSaveRepository,
  type HermesDailyFarmBriefProposalInboxRecord,
  type PersistedProposalSummary,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_explicit_save_boundary";
import {
  createHermesDailyFarmBriefProposalCandidate,
  type HermesDailyFarmBriefProposalCandidate,
  type HermesDailyFarmBriefProposalCandidateInput,
} from "../../src/lib/hermes/hermes_daily_farm_brief_proposal_candidate_boundary";

const CREATED_AT = "2026-07-17T03:00:00.000Z";
const REQUESTED_AT = "2026-07-17T04:00:00.000Z";
const RECORD_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_RECORD_ID = "8b353f58-4f03-4cad-9af9-02936f81f8f6";
const RAW_PRINCIPAL = "day126-sensitive-principal";
const RAW_SCOPE = "field:0123456789abcdef01234567";

function candidateInput(overrides: { displayState?: "current" | "stale"; reason?: "work_log_started_at_missing" | "work_log_started_at_invalid"; field?: string } = {}): HermesDailyFarmBriefProposalCandidateInput {
  const reason = overrides.reason ?? "work_log_started_at_missing";
  return {
    schema_version: "hermes.proposal_candidate.work_log_follow_up_input.v1",
    proposal_type: "work_log_follow_up",
    suggestion_type: "work_log_attention",
    source: { business_date: "2026-07-17", generated_at: "2026-07-17T00:00:00.000Z", version: 2, display_state: overrides.displayState ?? "current" },
    attention: {
      reason_code: reason,
      reason: reason === "work_log_started_at_missing" ? "作業開始日時が入力されていません。" : "作業開始日時の形式を確認してください。",
      field_label: overrides.field ?? "北側圃場",
      work_type_label: "収穫",
      work_date: null,
      evidence_type: "work_log",
    },
  };
}

function candidate(overrides: Parameters<typeof candidateInput>[0] = {}): HermesDailyFarmBriefProposalCandidate {
  const value = createHermesDailyFarmBriefProposalCandidate({ value: candidateInput(overrides), expectedSourceVersion: 2, clock: () => CREATED_AT });
  assert(value);
  return value;
}

function actor(role: "administrator" | "general_staff" = "administrator", principal = RAW_PRINCIPAL) {
  return { schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: principal, role, allowed_scope_keys: role === "administrator" ? [] : [RAW_SCOPE], authorization_verified: true };
}

function request(value: HermesDailyFarmBriefProposalCandidate, requestedAt = REQUESTED_AT) {
  return { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION, candidate_id: value.candidate_id, duplicate_signature: value.duplicate_signature, confirmation: "save_for_human_review", requested_at: requestedAt };
}

function clone<T>(value: T): T { return structuredClone(value); }

function prepare(value = candidate(), requestedAt = REQUESTED_AT, actorValue: unknown = actor()) {
  return prepareHermesDailyFarmBriefProposalExplicitSave({ request: request(value, requestedAt), actor: actorValue, candidate: value, idFactory: () => RECORD_ID });
}

function execute(input: {
  value?: unknown;
  requestValue?: unknown;
  actorValue?: unknown;
  repository: ExplicitSaveRepository;
  idFactory?: () => string;
}) {
  const value = input.value ?? candidate();
  return executeHermesDailyFarmBriefProposalExplicitSave({
    request: input.requestValue ?? request(value as HermesDailyFarmBriefProposalCandidate),
    actor: input.actorValue ?? actor(),
    candidate: value,
    idFactory: input.idFactory ?? (() => RECORD_ID),
    repository: input.repository,
  });
}

class FakeRepository implements ExplicitSaveRepository {
  findCalls = 0;
  insertCalls = 0;
  existing: PersistedProposalSummary | null = null;
  throwFind = false;
  throwInsert = false;
  async findExistingByIdempotencyKey(): Promise<PersistedProposalSummary | null> {
    this.findCalls += 1;
    if (this.throwFind) throw new Error("fixture-sensitive-find-error");
    return this.existing;
  }
  async insertProposal(record: HermesDailyFarmBriefProposalInboxRecord): Promise<PersistedProposalSummary> {
    this.insertCalls += 1;
    if (this.throwInsert) throw new Error("fixture-sensitive-insert-error");
    const saved = { id: record.id, proposal_type: record.proposal_type, title: record.title, status: record.status };
    this.existing = saved;
    return saved;
  }
}

export async function runDay126ExplicitSaveScenario() {
  const fresh = candidate();
  const ready = prepare(fresh);
  assert.equal(ready.status, "ready", `unexpected safe rejection: ${ready.rejection_reason}`); // 1
  if (ready.status !== "ready") throw new Error("ready fixture rejected");
  assert(parseHermesDailyFarmBriefProposalExplicitSaveRequest(request(fresh)));
  assert(parseHermesDailyFarmBriefProposalInboxRecord({ value: ready.proposal_record, candidate: fresh }));

  assert.equal(prepare(fresh, REQUESTED_AT, actor("general_staff")).rejection_reason, "administrator_required"); // 2
  assert.equal(prepare(fresh, REQUESTED_AT, { ...actor(), authorization_verified: false }).rejection_reason, "actor_invalid"); // 3
  assert.equal(prepare(fresh, REQUESTED_AT, { ...actor(), role: "owner" }).rejection_reason, "actor_invalid"); // 4
  assert.equal(prepare(fresh, REQUESTED_AT, { ...actor(), unknown: true }).rejection_reason, "actor_invalid"); // 5
  assert.equal(prepare(fresh, REQUESTED_AT, { ...actor(), allowed_scope_keys: [RAW_SCOPE] }).rejection_reason, "actor_invalid"); // 6
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: request(fresh), actor: actor(), candidate: { invalid: true } }).rejection_reason, "candidate_invalid"); // 7
  assert.equal(prepare(candidate({ displayState: "stale" })).rejection_reason, "candidate_not_save_eligible"); // 8
  const eligibilityTamper = clone(fresh) as unknown as Record<string, unknown>; (eligibilityTamper.stale as Record<string, unknown>).future_explicit_save_eligible = false;
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: request(fresh), actor: actor(), candidate: eligibilityTamper }).status, "rejected"); // 9
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: { ...request(fresh), candidate_id: "proposal_candidate_000000000000000000000000" }, actor: actor(), candidate: fresh }).rejection_reason, "candidate_reference_mismatch"); // 10
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: { ...request(fresh), duplicate_signature: `sha256:${"0".repeat(64)}` }, actor: actor(), candidate: fresh }).rejection_reason, "candidate_reference_mismatch"); // 11
  assert.equal(prepare(fresh, "2026-07-18T15:00:00.000Z").rejection_reason, "candidate_expired_at_save_request"); // 12
  assert.equal(prepare(fresh, fresh.expires_at).status, "ready"); // 13
  assert.equal(prepare(fresh, "2026-07-17T02:59:59.999Z").rejection_reason, "save_request_before_candidate_creation"); // 14
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: { ...request(fresh), confirmation: "save" }, actor: actor(), candidate: fresh }).rejection_reason, "explicit_confirmation_required"); // 15
  const missingConfirmation = clone(request(fresh)) as unknown as Record<string, unknown>; delete missingConfirmation.confirmation;
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: missingConfirmation, actor: actor(), candidate: fresh }).rejection_reason, "invalid_save_request"); // 16
  assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: { ...request(fresh), unknown: true }, actor: actor(), candidate: fresh }).rejection_reason, "invalid_save_request"); // 17
  for (const key of ["role", "scope", "proposal_type", "target"] as const) {
    assert.equal(prepareHermesDailyFarmBriefProposalExplicitSave({ request: { ...request(fresh), [key]: "browser-value" }, actor: actor(), candidate: fresh }).rejection_reason, "invalid_save_request"); // 18-21
  }
  const rawCandidate = createHermesDailyFarmBriefProposalCandidate({ value: candidateInput({ field: RECORD_ID }), expectedSourceVersion: 2, clock: () => CREATED_AT });
  assert.equal(rawCandidate, null); // 22

  const repeatedReady = prepare(fresh);
  const laterRequestReady = prepare(fresh, "2026-07-17T05:00:00.000Z");
  const otherActorReady = prepare(fresh, REQUESTED_AT, actor("administrator", "different-principal"));
  assert.equal(repeatedReady.status, "ready"); assert.equal(repeatedReady.idempotency_key, ready.idempotency_key); // 23
  assert.equal(laterRequestReady.status, "ready"); assert.equal(laterRequestReady.idempotency_key, ready.idempotency_key); // 24
  assert.equal(otherActorReady.status, "ready"); assert.equal(otherActorReady.idempotency_key, ready.idempotency_key); // 25
  const different = prepare(candidate({ reason: "work_log_started_at_invalid" }));
  assert.equal(different.status, "ready");
  assert.notEqual(different.idempotency_key, ready.idempotency_key); // 26

  const record = ready.proposal_record;
  assert(parseHermesDailyFarmBriefProposalInboxRecord({ value: record, candidate: fresh })); // 27
  assert.equal(parseHermesDailyFarmBriefProposalInboxRecord({ value: { ...record, unknown: true }, candidate: fresh }), null); // 28
  assert.equal(parseHermesDailyFarmBriefProposalInboxRecord({ value: { ...record, status: "approved" }, candidate: fresh }), null); // 29
  assert.equal(parseHermesDailyFarmBriefProposalInboxRecord({ value: { ...record, proposal_type: "other" }, candidate: fresh }), null); // 30
  assert.equal(parseHermesDailyFarmBriefProposalInboxRecord({ value: { ...record, payload_json: { ...record.payload_json, idempotency_key: `sha256:${"0".repeat(64)}` } }, candidate: fresh }), null); // 31
  assert.equal(parseHermesDailyFarmBriefProposalInboxRecord({ value: { ...record, source_refs_json: { ...record.source_refs_json, source_version: 3 } }, candidate: fresh }), null); // 32

  assert.equal("persistHermesDailyFarmBriefProposalExplicitSave" in explicitSaveBoundary, false, "a forged ready preparation must not have a public persistence API");

  const invalidRequestRepository = new FakeRepository();
  const invalidRequestExecution = await execute({ value: fresh, requestValue: { invalid: true }, repository: invalidRequestRepository });
  assert.equal(invalidRequestExecution.status, "rejected");
  assert.deepEqual([invalidRequestRepository.findCalls, invalidRequestRepository.insertCalls], [0, 0]);
  assert.equal(invalidRequestExecution.safety.explicit_save_requested, false);
  assert.equal(invalidRequestExecution.safety.candidate_revalidated, false);

  const invalidActorRepository = new FakeRepository();
  const invalidActorExecution = await execute({ value: fresh, actorValue: { ...actor(), authorization_verified: false }, repository: invalidActorRepository });
  assert.equal(invalidActorExecution.status, "rejected");
  assert.deepEqual([invalidActorRepository.findCalls, invalidActorRepository.insertCalls], [0, 0]);
  assert.equal(invalidActorExecution.safety.explicit_save_requested, true);
  assert.equal(invalidActorExecution.safety.candidate_revalidated, false);

  const mismatchRepository = new FakeRepository();
  const mismatchExecution = await execute({ value: fresh, requestValue: { ...request(fresh), duplicate_signature: `sha256:${"0".repeat(64)}` }, repository: mismatchRepository });
  assert.equal(mismatchExecution.status, "rejected");
  assert.deepEqual([mismatchRepository.findCalls, mismatchRepository.insertCalls], [0, 0]);
  assert.equal(mismatchExecution.safety.candidate_revalidated, true);

  const repository = new FakeRepository();
  const first = await execute({ value: fresh, repository });
  assert.equal(first.status, "saved"); assert.equal(repository.findCalls, 1); assert.equal(repository.insertCalls, 1); assert.equal(first.database_write_performed, true); // 33
  const duplicateRepository = new FakeRepository();
  duplicateRepository.existing = { id: OTHER_RECORD_ID, proposal_type: "work_log_follow_up", title: "作業記録の確認が必要です", status: "pending" };
  const duplicate = await execute({ value: fresh, repository: duplicateRepository });
  assert.equal(duplicate.status, "already_saved"); assert.equal(duplicateRepository.findCalls, 1); assert.equal(duplicateRepository.insertCalls, 0); assert.equal(duplicate.deduplicated_existing_record, true); // 34

  const tamperedRepository = new FakeRepository();
  const unstableCandidate = clone(fresh) as HermesDailyFarmBriefProposalCandidate;
  let schemaVersionReads = 0;
  Object.defineProperty(unstableCandidate, "schema_version", {
    configurable: true,
    enumerable: true,
    get: () => {
      schemaVersionReads += 1;
      return schemaVersionReads <= 6 ? fresh.schema_version : "tampered-after-prepare";
    },
  });
  const tamperedExecution = await execute({ value: unstableCandidate, repository: tamperedRepository });
  assert.equal(tamperedExecution.status, "failed", `unexpected tamper phase after ${schemaVersionReads} schema reads`);
  assert.deepEqual([tamperedRepository.findCalls, tamperedRepository.insertCalls], [0, 0], "post-prepare runtime tamper must fail before repository access");

  const findFailureRepository = new FakeRepository(); findFailureRepository.throwFind = true;
  const findFailure = await execute({ value: fresh, repository: findFailureRepository });
  assert.equal(findFailure.status, "failed"); assert.equal(findFailure.retry_count, 0); assert.equal(findFailureRepository.insertCalls, 0); // 35
  const insertFailureRepository = new FakeRepository(); insertFailureRepository.throwInsert = true;
  const insertFailure = await execute({ value: fresh, repository: insertFailureRepository });
  assert.equal(insertFailure.status, "failed"); assert.equal(insertFailure.retry_count, 0); assert.equal(insertFailure.database_write_performed, false); // 36
  assert(!JSON.stringify({ findFailure, insertFailure }).includes("fixture-sensitive"), "raw repository errors must not cross the boundary");
  assert.equal("updateProposal" in repository, false); // 37
  assert.equal("deleteProposal" in repository, false); // 38

  const serialized = JSON.stringify({ ready, first, duplicate });
  assert(!serialized.includes(RAW_PRINCIPAL)); // 39
  assert(!serialized.includes(RAW_SCOPE)); // 40
  assert.equal(first.proposal_apply_ready, false); // 41
  assert.equal(first.proposal_apply_performed, false); // 42
  assert.equal(first.app_db_write_performed, false); assert.equal(first.audit_write_performed, false); // 43
  assert.equal(first.safety.model_execution_performed, false); assert.equal(first.safety.retry_performed, false); assert.equal(first.safety.migration_performed, false); // 44
  assert.equal(first.safety.raw_identifier_exposed, false);
  assert.equal(first.safety.principal_ref_exposed, false);
  assert.equal(first.retry_count, 0);

  const rejectedPersistenceRepository = new FakeRepository();
  const staleCandidate = candidate({ displayState: "stale" });
  const rejectedPersistence = await execute({ value: staleCandidate, requestValue: request(staleCandidate), repository: rejectedPersistenceRepository });
  assert.equal(rejectedPersistence.status, "rejected");
  assert.equal(rejectedPersistenceRepository.findCalls, 0);
  assert.equal(rejectedPersistenceRepository.insertCalls, 0);

  return {
    fresh_admin_ready: ready.status,
    general_staff_rejected: "rejected",
    expired_rejected: "rejected",
    first_save_saved: first.status,
    duplicate_save_already_saved: duplicate.status,
    database_write_count: repository.insertCalls,
    insert_call_count: repository.insertCalls,
    retry_count: first.retry_count + duplicate.retry_count + findFailure.retry_count + insertFailure.retry_count,
    proposal_apply_performed: false,
    app_db_write_performed: false,
    audit_write_performed: false,
    raw_identifier_exposed: false,
    principal_ref_exposed: false,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  console.log(JSON.stringify({ result: "pass", ...(await runDay126ExplicitSaveScenario()) }));
}
