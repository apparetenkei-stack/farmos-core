import assert, { AssertionError } from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { promisify } from "node:util";
import { Client } from "pg";

import {
  FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
  FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
  FARM_OS_DAILY_PROJECTION_KIND,
  type FarmOsDailyProjectionInput,
  type FarmOsDailyProjectionSourceSnapshot,
} from "../../src/lib/hermes/farm_os_daily_operational_projection_contract";
import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  compileFarmOsDailyProjection,
  createFarmOsSnapshotId,
  type FarmOsSnapshotStateEvent,
  type FarmOsSourceSnapshot,
} from
  "../../src/lib/hermes/farm_os_operational_memory_compiler";
import type {
  FarmOsDailyProjection,
  FarmOsProjectionLineage,
  FarmOsProjectionStateEvent,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES,
  FARM_OS_PROJECTION_COMMAND_DEFERRED_PROBE_IDENTIFIERS,
  FarmOsOperationalMemoryPostgresRepository,
  classifyFarmOsProjectionCommandCommitDatabaseError,
  notifyFarmOsProjectionCommandCommitFailureObserver,
  notifyFarmOsProjectionCommandDeferredProbeObserver,
  notifyFarmOsProjectionCommandTransactionObserver,
  type FarmOsProjectionCommandCommitFailureDiagnostic,
  type FarmOsProjectionCommandCommitFailureObserver,
  type FarmOsProjectionCommandDeferredProbeDiagnostic,
  type FarmOsProjectionCommandDeferredProbeObserver,
  type FarmOsProjectionCommandResourceConnectionSubcategory,
  type FarmOsProjectionCommandTransactionObserver,
  type FarmOsProjectionCommandTransactionSubstage,
} from "../../src/lib/hermes/farm_os_operational_memory_postgres_repository";
import {
  executeFarmOsProjectionCommand,
  type FarmOsProjectionCommandRepository,
  type FarmOsProjectionCommandRepositoryResult,
  type FarmOsProjectionCommandRepositoryState,
} from "../../src/lib/hermes/farm_os_projection_promotion_service";
import {
  canonicalJson,
  FARM_OS_PROJECTION_COMMAND_FAILURE_CODES,
  hashFarmOsProjectionCommand,
  hashFarmOsProjectionIdempotencyKey,
  parseFarmOsProjectionCommand,
  sha256Prefixed,
  validateFarmOsProjectionCommandResultPayload,
  type FarmOsExpectedProjectionVersion,
  type FarmOsProjectionCommand,
  type FarmOsProjectionCommandAuthority,
  type FarmOsProjectionCommandPersistencePlan,
  type FarmOsProjectionCommandReceiptRecord,
  type FarmOsProjectionReviewDecisionRecord,
} from "../../src/lib/hermes/farm_os_projection_review_command_contract";

const AUTHORITY = Object.freeze({
  actor_type: "authenticated_human",
  authenticated_principal_id: "human.operator@example.test",
  capabilities: Object.freeze([
    "farmos_projection_review", "farmos_projection_promote",
    "farmos_projection_reject", "farmos_projection_rebuild",
  ]),
  authorized_farm_scope: "farm_fixture_01",
}) satisfies FarmOsProjectionCommandAuthority;

const REQUESTED_AT = "2026-08-03T03:00:00.000Z";
const COMMITTED_AT = "2026-08-03T03:00:01.000Z";
const HASH_A = "a".repeat(64);
const execFileAsync = promisify(execFile);

const DAY149_EXECUTION_AUTHORITY = Object.freeze({
  token: "DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
  authoritative_run_count: 20,
  authoritative_run_number: 20,
  retry_number: 14,
  consumed: true,
});

const DAY149_RUN_20_HISTORICAL_RAW_SUCCESS_METADATA = Object.freeze({
  authoritative_run_count: 10,
  authoritative_run_number: 10,
  retry_number: 4,
  disposition: "SUPERSEDED_METADATA_ONLY",
});

const DAY149_RUN_20_EVIDENCE = Object.freeze({
  command:
    "pnpm exec tsx scripts/hermes/test_farm_os_day149_projection_command_boundary.ts --mode=execute-isolated --authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
  execution_count: 1,
  execution_nonce: "065e5d6c1582",
  functional_status: "PASS",
  stage: "complete",
  cleanup: "PASS",
  isolated_rerun_required: false,
});

function createDay149SuccessExecutionMetadata(executionNonce: string) {
  return Object.freeze({
    execution_nonce: executionNonce,
    authoritative_run_count:
      DAY149_EXECUTION_AUTHORITY.authoritative_run_count,
    authoritative_run_number:
      DAY149_EXECUTION_AUTHORITY.authoritative_run_number,
    retry_number: DAY149_EXECUTION_AUTHORITY.retry_number,
  });
}

type DurableFixture = {
  state: {
    snapshots: FarmOsSourceSnapshot[];
    snapshot_state_events: FarmOsSnapshotStateEvent[];
    projections: FarmOsDailyProjection[];
    projection_state_events: FarmOsProjectionStateEvent[];
    lineage: FarmOsProjectionLineage[];
    review_decisions: FarmOsProjectionReviewDecisionRecord[];
  };
  receipts: Map<string, FarmOsProjectionCommandReceiptRecord>;
  idempotency: Map<string, string>;
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function lineageFor(
  projectionId: string,
  businessDate = "2026-08-02",
): FarmOsProjectionLineage {
  const sourceRecordId = businessDate === "2026-08-02"
    ? "work_001"
    : `work_${businessDate.replaceAll("-", "")}`;
  return {
    projection_id: projectionId,
    snapshot_id: createFarmOsSnapshotId({
      source_record_id: sourceRecordId,
      source_record_version: 1,
      source_content_hash: HASH_A,
      operation: "upsert",
      business_date: businessDate,
    }),
    source_record_id: sourceRecordId,
    source_content_hash: HASH_A,
    relation: "included",
  };
}

function projection(id: string, version: number, businessDate: string): FarmOsDailyProjection {
  const content: FarmOsDailyProjection["content"] = {
    business_date: businessDate,
    source_record_count: 1,
    active_record_count: 1,
    tombstone_count: 0,
    field_references: ["field_01"],
    crop_cycle_references: ["cycle_01"],
    work_type_references: ["harvest"],
    verification_status: "stable_change_contract_validated",
    missing_data_status: "complete_for_v1",
  };
  const { projection_id: _projectionId, ...lineage } = lineageFor(id, businessDate);
  return {
    projection_id: id,
    projection_type: "daily_work_records",
    projection_version: version,
    business_date: businessDate,
    compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
    compiler_version: 1,
    content_hash: sha256Prefixed(canonicalJson({
      compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
      compiler_version: 1,
      content,
      lineage: [lineage],
    })).slice(7),
    content,
    generated_at: "2026-08-03T01:00:00.000Z",
    supersedes_projection_id: null,
  };
}

function fixture(input: { withActive?: boolean } = {}): DurableFixture {
  const candidate = projection("candidate_fixture_001", 2, "2026-08-02");
  const projections = [candidate];
  const events: FarmOsProjectionStateEvent[] = [{
    event_id: "candidate_event_fixture_001",
    projection_id: candidate.projection_id,
    status: "candidate",
    sequence: 2,
    occurred_at: "2026-08-03T01:00:00.000Z",
  }];
  if (input.withActive) {
    const active = projection("active_fixture_001", 1, "2026-08-02");
    projections.unshift(active);
    events.unshift({
      event_id: "active_event_fixture_001",
      projection_id: active.projection_id,
      status: "active",
      sequence: 1,
      occurred_at: "2026-08-02T01:00:00.000Z",
    });
  }
  const fixtureLineage = lineageFor(candidate.projection_id, candidate.business_date);
  return {
    state: {
      snapshots: [{
        snapshot_id: fixtureLineage.snapshot_id,
        contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
        source_system: "farming_app",
        source_record_id: fixtureLineage.source_record_id,
        source_record_version: 1,
        source_content_hash: HASH_A,
        operation: "upsert",
        business_date: "2026-08-02",
        recorded_at: "2026-08-03T00:10:00.000Z",
        source_updated_at: "2026-08-03T00:15:00.000Z",
        deleted_at: null,
        field_reference: "field_01",
        crop_cycle_reference: "cycle_01",
        work_type_reference: "harvest",
        safe_payload: {},
        observed_at: "2026-08-03T00:20:00.000Z",
        ingestion_sequence: 1,
        initial_state: "active",
        supersedes_snapshot_id: null,
        rejection_code: null,
      }],
      snapshot_state_events: [{
        event_id: "snapshot_event_fixture_001",
        snapshot_id: fixtureLineage.snapshot_id,
        state: "active",
        sequence: 1,
        occurred_at: "2026-08-03T00:20:00.000Z",
      }],
      projections,
      projection_state_events: events,
      lineage: projections.map((row) => lineageFor(
        row.projection_id,
        row.business_date,
      )),
      review_decisions: [],
    },
    receipts: new Map(),
    idempotency: new Map(),
  };
}

function multiLineageFixture(): DurableFixture {
  const durable = fixture();
  const first = durable.state.snapshots[0];
  assert.ok(first);
  const second: FarmOsSourceSnapshot = {
    ...clone(first),
    snapshot_id: "snapshot_a_ordered_second",
    source_record_id: "work_002",
    source_record_version: 1,
    source_content_hash: "b".repeat(64),
    field_reference: "field_02",
    ingestion_sequence: 2,
  };
  durable.state.snapshots = [
    { ...first, snapshot_id: "snapshot_z_ordered_first" },
    second,
  ];
  durable.state.snapshot_state_events = durable.state.snapshots.map(
    (snapshot, index) => ({
      event_id: `snapshot_event_multi_${index + 1}`,
      snapshot_id: snapshot.snapshot_id,
      state: "active" as const,
      sequence: index + 1,
      occurred_at: "2026-08-03T00:20:00.000Z",
    }),
  );
  const compiled = compileFarmOsDailyProjection({
    business_date: "2026-08-02",
    snapshots: durable.state.snapshots,
    snapshot_state_events: durable.state.snapshot_state_events,
  });
  const candidate = durable.state.projections[0];
  assert.ok(candidate);
  candidate.content = compiled.content;
  candidate.content_hash = compiled.content_hash;
  durable.state.lineage = compiled.lineage.map((row) => ({
    projection_id: candidate.projection_id,
    ...row,
  }));
  assert.deepEqual(
    compiled.lineage.map((row) => row.snapshot_id),
    ["snapshot_z_ordered_first", "snapshot_a_ordered_second"],
  );
  return durable;
}

class FixtureRepository implements FarmOsProjectionCommandRepository {
  failNext = false;
  constructor(readonly durable: DurableFixture) {}

  snapshot(): FarmOsProjectionCommandRepositoryState {
    return clone(this.durable.state);
  }

  async executeProjectionCommand(input: Readonly<{
    command_id: string;
    idempotency_key_hash: string;
    command_type: FarmOsProjectionCommand["command_type"];
    canonical_payload_hash: string;
    build_plan: (
      state: FarmOsProjectionCommandRepositoryState,
    ) => FarmOsProjectionCommandPersistencePlan;
  }>): Promise<FarmOsProjectionCommandRepositoryResult> {
    const byCommand = this.durable.receipts.get(input.command_id);
    const idempotentCommand = this.durable.idempotency.get(input.idempotency_key_hash);
    const byKey = idempotentCommand === undefined
      ? undefined
      : this.durable.receipts.get(idempotentCommand);
    if (byCommand !== undefined || byKey !== undefined) {
      if (byCommand === undefined || byKey === undefined || byCommand !== byKey ||
        byCommand.command_type !== input.command_type ||
        byCommand.canonical_payload_hash !== input.canonical_payload_hash) {
        return { status: "rejected", failure_code: "duplicate_command_conflict" };
      }
      return { status: "committed", result_payload: clone(byCommand.result_payload), replayed: true };
    }
    const plan = input.build_plan(this.snapshot());
    if (this.failNext) {
      this.failNext = false;
      return { status: "rejected", failure_code: "transaction_failed" };
    }
    const next = clone(this.durable.state);
    if (plan.review_decision !== null) next.review_decisions.push(clone(plan.review_decision));
    if (plan.rebuild_projection !== null) {
      next.projections.push({
        ...clone(plan.rebuild_projection),
        content: clone(plan.rebuild_projection.projection_content) as FarmOsDailyProjection["content"],
      });
    }
    next.projection_state_events.push(...clone(plan.projection_events));
    next.lineage.push(...clone(plan.rebuild_lineage));
    this.durable.state = next;
    this.durable.receipts.set(plan.receipt.command_id, clone(plan.receipt));
    this.durable.idempotency.set(plan.receipt.idempotency_key_hash, plan.receipt.command_id);
    return { status: "committed", result_payload: clone(plan.receipt.result_payload), replayed: false };
  }
}

function expectedCandidate(state: DurableFixture["state"]): FarmOsExpectedProjectionVersion {
  const row = state.projections.find((item) => item.projection_id === "candidate_fixture_001");
  assert.ok(row);
  const event = state.projection_state_events
    .filter((item) => item.projection_id === row.projection_id)
    .sort((a, b) => a.sequence - b.sequence).at(-1);
  assert.ok(event);
  return {
    projection_id: row.projection_id,
    projection_version: row.projection_version,
    state_sequence: event.sequence,
    content_hash: row.content_hash,
  };
}

function reviewCommand(input: Partial<Record<string, unknown>> = {}): unknown {
  const state = fixture().state;
  return {
    schema_version: "farmos.projection.review.command.v1",
    command_id: "review-command-0001",
    command_type: "review_projection_candidate",
    candidate_projection_id: "candidate_fixture_001",
    expected_candidate_version: expectedCandidate(state),
    decision: "approve",
    reason: "Human verified the deterministic candidate output.",
    requested_by: AUTHORITY.authenticated_principal_id,
    requested_at: REQUESTED_AT,
    reviewed_by: AUTHORITY.authenticated_principal_id,
    reviewed_at: REQUESTED_AT,
    expected_review_sequence: 0,
    idempotency_key: "review-idempotency-0001",
    ...input,
  };
}

async function execute(
  repository: FixtureRepository,
  command: unknown,
  authority: FarmOsProjectionCommandAuthority = AUTHORITY,
) {
  return await executeFarmOsProjectionCommand({
    command, authority, repository,
    server_clock: { now: () => COMMITTED_AT },
  });
}

async function approvedCandidate(repository: FixtureRepository) {
  const result = await execute(repository, reviewCommand({
    expected_candidate_version: expectedCandidate(repository.durable.state),
  }));
  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.equal(result.result_payload.result_code, "review_recorded");
  assert.ok(result.result_payload.review_decision_id);
  return result.result_payload.review_decision_id;
}

function promoteCommand(repository: FixtureRepository, reviewId: string): unknown {
  const expected = expectedCandidate(repository.durable.state);
  const active = repository.durable.state.projections.find((projection) =>
    projection.projection_id === "active_fixture_001"
  );
  const activeEvent = active === undefined ? undefined :
    repository.durable.state.projection_state_events.find((event) =>
      event.projection_id === active.projection_id && event.status === "active"
    );
  return {
    schema_version: "farmos.projection.promote.command.v1",
    command_id: "promote-command-0001",
    command_type: "promote_projection_candidate",
    candidate_projection_id: expected.projection_id,
    expected_candidate_version: expected,
    expected_active: active === undefined ? { presence: "absent" } : {
      presence: "present",
      projection_id: active.projection_id,
      projection_version: active.projection_version,
      state_sequence: activeEvent?.sequence,
      content_hash: active.content_hash,
    },
    review_decision_reference: { review_id: reviewId, review_sequence: 1 },
    requested_by: AUTHORITY.authenticated_principal_id,
    approved_by: AUTHORITY.authenticated_principal_id,
    idempotency_key: "promote-idempotency-0001",
    requested_at: REQUESTED_AT,
  };
}

function validSourceInput(businessDate = "2026-08-02"): FarmOsDailyProjectionInput {
  const sourceRecordId = businessDate === "2026-08-02"
    ? "work_001"
    : `work_${businessDate.replaceAll("-", "")}`;
  const snapshot: FarmOsDailyProjectionSourceSnapshot = {
    snapshot_id: createFarmOsSnapshotId({
      source_record_id: sourceRecordId, source_record_version: 1,
      source_content_hash: HASH_A, operation: "upsert", business_date: businessDate,
    }),
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    source_system: "farming_app",
    source_type: "work_record",
    source_record_id: sourceRecordId,
    source_record_version: 1,
    source_content_hash: HASH_A,
    operation: "upsert",
    business_date: businessDate,
    recorded_at: "2026-08-03T00:10:00.000Z",
    source_updated_at: "2026-08-03T00:15:00.000Z",
    deleted_at: null,
    field_reference: "field_01",
    crop_cycle_reference: "cycle_01",
    work_type_reference: "harvest",
    safe_payload: {},
    observed_at: "2026-08-03T00:20:00.000Z",
    ingestion_sequence: 1,
    initial_state: "active",
    supersedes_snapshot_id: null,
    rejection_code: null,
    schema_version: 1,
  };
  return {
    contract_version: FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
    projection_kind: FARM_OS_DAILY_PROJECTION_KIND,
    farm_scope: AUTHORITY.authorized_farm_scope,
    business_date: businessDate,
    source_snapshot_schema_version: 1,
    compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
    compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
    freshness_policy: FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
    source_set_status: "current",
    generated_at: "2026-08-03T02:00:00.000Z",
    snapshots: [snapshot],
  };
}

async function runStaticTests(): Promise<void> {
  assert.equal(parseFarmOsProjectionCommand(reviewCommand()).valid, true);
  assert.equal(parseFarmOsProjectionCommand(reviewCommand({ decision: "unknown" })).valid, false);
  assert.equal(parseFarmOsProjectionCommand(reviewCommand({ reviewed_by: "" })).valid, false);
  assert.equal(parseFarmOsProjectionCommand(reviewCommand({ reason: "" })).valid, false);
  assert.equal(parseFarmOsProjectionCommand(reviewCommand({ extra: true })).valid, false);

  const unauthorized = await execute(new FixtureRepository(fixture()), reviewCommand(), {
    ...AUTHORITY, capabilities: [],
  });
  assert.deepEqual(unauthorized, {
    ok: false, result_payload: null, failure_code: "authorization_denied",
    persistence_attempted: false,
  });
  const mismatch = await execute(new FixtureRepository(fixture()), reviewCommand(), {
    ...AUTHORITY, authenticated_principal_id: "another.human@example.test",
  });
  assert.equal(mismatch.ok, false);
  assert.equal(!mismatch.ok && mismatch.failure_code, "authorization_denied");

  const multiLineage = multiLineageFixture();
  const multiLineageRepository = new FixtureRepository(multiLineage);
  const multiLineageReview = await execute(
    multiLineageRepository,
    reviewCommand({
      expected_candidate_version: expectedCandidate(multiLineage.state),
    }),
  );
  assert.equal(multiLineageReview.ok, true);
  const tamperedContent = fixture();
  tamperedContent.state.projections[0]!.content_hash = "c".repeat(64);
  const tamperedContentResult = await execute(
    new FixtureRepository(tamperedContent),
    reviewCommand({
      expected_candidate_version: expectedCandidate(tamperedContent.state),
    }),
  );
  assert.equal(!tamperedContentResult.ok && tamperedContentResult.failure_code,
    "content_hash_invalid");
  const tamperedLineage = fixture();
  tamperedLineage.state.lineage[0]!.source_record_id = "tampered_source";
  const tamperedLineageResult = await execute(
    new FixtureRepository(tamperedLineage),
    reviewCommand(),
  );
  assert.equal(!tamperedLineageResult.ok && tamperedLineageResult.failure_code,
    "content_hash_invalid");

  const durable = fixture();
  const repository = new FixtureRepository(durable);
  const review = await execute(repository, reviewCommand());
  assert.equal(review.ok, true);
  assert.equal(durable.state.review_decisions.length, 1);
  assert.equal(durable.state.projection_state_events.length, 1);
  const replayRepository = new FixtureRepository(durable);
  const replay = await execute(replayRepository, reviewCommand());
  assert.equal(replay.ok, true);
  assert.ok(replay.ok);
  assert.equal(replay.replayed, true);
  assert.equal(durable.state.review_decisions.length, 1);

  const conflict = await execute(repository, reviewCommand({
    command_id: "review-command-0002",
    reason: "Different payload under the same replay key.",
  }));
  assert.equal(conflict.ok, false);
  assert.equal(!conflict.ok && conflict.failure_code, "duplicate_command_conflict");

  const firstPromotionRepo = new FixtureRepository(fixture());
  const firstReviewId = await approvedCandidate(firstPromotionRepo);
  const firstPromotionCommand = promoteCommand(firstPromotionRepo, firstReviewId);
  const firstPromotion = await execute(
    firstPromotionRepo,
    firstPromotionCommand,
  );
  assert.equal(firstPromotion.ok, true);
  assert.equal(firstPromotionRepo.durable.state.projection_state_events.at(-1)?.status, "active");
  const firstEventCount = firstPromotionRepo.durable.state.projection_state_events.length;
  const firstReplay = await execute(
    new FixtureRepository(firstPromotionRepo.durable),
    firstPromotionCommand,
  );
  assert.equal(firstReplay.ok, true);
  assert.ok(firstReplay.ok);
  assert.equal(firstReplay.replayed, true);
  assert.equal(firstPromotionRepo.durable.state.projection_state_events.length, firstEventCount);

  const approvalActorRepo = new FixtureRepository(fixture());
  const approvalActorReviewId = await approvedCandidate(approvalActorRepo);
  const approvalActorMismatch = await execute(approvalActorRepo, {
    ...(promoteCommand(
      approvalActorRepo,
      approvalActorReviewId,
    ) as Record<string, unknown>),
    approved_by: "different.human@example.test",
  });
  assert.equal(!approvalActorMismatch.ok && approvalActorMismatch.failure_code,
    "approval_invalid");

  const replacementRepo = new FixtureRepository(fixture({ withActive: true }));
  const replacementReviewId = await approvedCandidate(replacementRepo);
  const replacement = await execute(
    replacementRepo,
    promoteCommand(replacementRepo, replacementReviewId),
  );
  assert.equal(replacement.ok, true);
  const finalEvents = replacementRepo.durable.state.projection_state_events.slice(-2);
  assert.deepEqual(finalEvents.map((event) => event.status), ["superseded", "active"]);
  assert.ok(finalEvents[0].sequence < finalEvents[1].sequence);

  const rollbackRepo = new FixtureRepository(fixture({ withActive: true }));
  const rollbackReviewId = await approvedCandidate(rollbackRepo);
  const beforeFailure = rollbackRepo.snapshot();
  rollbackRepo.failNext = true;
  const failed = await execute(rollbackRepo, promoteCommand(rollbackRepo, rollbackReviewId));
  assert.equal(failed.ok, false);
  assert.equal(!failed.ok && failed.failure_code, "transaction_failed");
  assert.deepEqual(rollbackRepo.snapshot(), beforeFailure);

  const rejectionRepo = new FixtureRepository(fixture());
  const rejectReview = await execute(rejectionRepo, reviewCommand({
    decision: "reject", command_id: "review-command-reject-01",
    idempotency_key: "review-reject-key-0001",
  }));
  assert.ok(rejectReview.ok && rejectReview.result_payload.review_decision_id);
  const rejectCommand = {
    schema_version: "farmos.projection.reject.command.v1",
    command_id: "reject-command-0001",
    command_type: "reject_projection_candidate",
    candidate_projection_id: "candidate_fixture_001",
    expected_candidate_version: expectedCandidate(rejectionRepo.durable.state),
    review_decision_reference: {
      review_id: rejectReview.result_payload.review_decision_id,
      review_sequence: 1,
    },
    reason: "Human rejected this candidate version.",
    requested_by: AUTHORITY.authenticated_principal_id,
    idempotency_key: "reject-idempotency-0001",
    requested_at: REQUESTED_AT,
  };
  const rejected = await execute(rejectionRepo, rejectCommand);
  assert.equal(rejected.ok, true);
  assert.equal(rejectionRepo.durable.state.projection_state_events.at(-1)?.status, "rejected");
  const rejectedRebuildReview = await execute(rejectionRepo, reviewCommand({
    command_id: "review-command-rejected-rebuild-01",
    idempotency_key: "review-rejected-rebuild-key-0001",
    decision: "request_rebuild",
    expected_candidate_version: expectedCandidate(rejectionRepo.durable.state),
    expected_review_sequence: 1,
  }));
  assert.equal(rejectedRebuildReview.ok, true);

  const failedReviewFixture = fixture();
  failedReviewFixture.state.projection_state_events.push({
    event_id: "failed_event_fixture_001",
    projection_id: "candidate_fixture_001",
    status: "failed",
    sequence: 3,
    occurred_at: COMMITTED_AT,
  });
  const failedRebuildReview = await execute(
    new FixtureRepository(failedReviewFixture),
    reviewCommand({
      command_id: "review-command-failed-rebuild-01",
      idempotency_key: "review-failed-rebuild-key-0001",
      decision: "request_rebuild",
      expected_candidate_version: expectedCandidate(failedReviewFixture.state),
    }),
  );
  assert.equal(failedRebuildReview.ok, true);

  const staleRepo = new FixtureRepository(fixture());
  const approve = await execute(staleRepo, reviewCommand());
  assert.ok(approve.ok && approve.result_payload.review_decision_id);
  const negative = await execute(staleRepo, reviewCommand({
    command_id: "review-command-0002",
    idempotency_key: "review-idempotency-0002",
    decision: "request_rebuild",
    expected_review_sequence: 1,
  }));
  assert.equal(negative.ok, true);
  const stalePromotion = await execute(
    staleRepo,
    promoteCommand(staleRepo, approve.result_payload.review_decision_id),
  );
  assert.equal(stalePromotion.ok, false);
  assert.equal(!stalePromotion.ok && stalePromotion.failure_code, "review_decision_stale");

  const rebuildRepo = new FixtureRepository(fixture({ withActive: true }));
  const rebuildReview = await execute(rebuildRepo, reviewCommand({
    decision: "request_rebuild",
    command_id: "review-command-rebuild-01",
    idempotency_key: "review-rebuild-key-0001",
  }));
  assert.ok(rebuildReview.ok && rebuildReview.result_payload.review_decision_id);
  const sourceInput = validSourceInput();
  const rebuildCommand = {
    schema_version: "farmos.projection.rebuild.command.v1",
    command_id: "rebuild-command-0001",
    command_type: "rebuild_projection_candidate",
    candidate_projection_id: "candidate_fixture_001",
    expected_candidate_version: expectedCandidate(rebuildRepo.durable.state),
    review_decision_reference: {
      review_id: rebuildReview.result_payload.review_decision_id,
      review_sequence: 1,
    },
    source_input: sourceInput,
    source_input_hash: sha256Prefixed(canonicalJson(sourceInput)).slice(7),
    requested_by: AUTHORITY.authenticated_principal_id,
    idempotency_key: "rebuild-idempotency-0001",
    requested_at: REQUESTED_AT,
  };
  const activeBefore = rebuildRepo.durable.state.projection_state_events
    .filter((event) => event.status === "active").length;
  const rebuilt = await execute(rebuildRepo, rebuildCommand);
  assert.equal(rebuilt.ok, true);
  assert.equal(rebuildRepo.durable.state.projection_state_events.at(-1)?.status, "candidate");
  assert.equal(rebuildRepo.durable.state.projection_state_events
    .filter((event) => event.status === "active").length, activeBefore);

  const staleInput = { ...sourceInput, source_set_status: "stale" };
  const staleRebuild = await execute(new FixtureRepository(fixture()), {
    ...rebuildCommand,
    command_id: "rebuild-command-0002",
    idempotency_key: "rebuild-idempotency-0002",
    source_input: staleInput,
    source_input_hash: sha256Prefixed(canonicalJson(staleInput)).slice(7),
  });
  assert.equal(staleRebuild.ok, false);

  const parsed = parseFarmOsProjectionCommand(reviewCommand());
  assert.ok(parsed.valid);
  assert.match(hashFarmOsProjectionCommand(parsed.value), /^sha256:[0-9a-f]{64}$/);
  assert.equal(validateFarmOsProjectionCommandResultPayload({
    schema_version: "farmos.projection.command-result.v1",
    command_id: "review-command-0001",
    command_type: "review_projection_candidate",
    outcome: "succeeded",
    result_code: "review_recorded",
    review_decision_id: "projection_review_0123456789abcdef0123456789abcdef",
    affected_projection_ids: [],
    committed_state_event_sequences: [],
  }), true);
  assert.equal(validateFarmOsProjectionCommandResultPayload({
    schema_version: "farmos.projection.command-result.v1",
    command_id: "review-command-0001",
    command_type: "review_projection_candidate",
    outcome: "succeeded",
    result_code: "review_recorded",
    review_decision_id: null,
    affected_projection_ids: [],
    committed_state_event_sequences: [],
    raw_input: {},
  }), false);
  assert.equal(validateFarmOsProjectionCommandResultPayload({
    schema_version: "farmos.projection.command-result.v1",
    command_id: "promote-command-0001",
    command_type: "promote_projection_candidate",
    outcome: "rejected",
    result_code: "projection_promoted",
    review_decision_id: null,
    affected_projection_ids: [],
    committed_state_event_sequences: [],
  }), false);

  assert.equal(new Set(DAY149_ISOLATED_STAGES).size, DAY149_ISOLATED_STAGES.length);
  for (const stage of DAY149_ISOLATED_STAGES) {
    assert.equal(isDay149IsolatedFailurePayload(
      createDay149IsolatedFailurePayload({
        execution_nonce: "012345abcdef",
        stage,
        failure_class: "ASSERTION_FAILED",
        cleanup: "PASS",
      }),
    ), true);
  }
  const sanitizedFailure = createDay149IsolatedFailurePayload({
    execution_nonce: "012345abcdef",
    stage: "event_failure_rollback",
    failure_class: "EXPECTED_REJECTION_MISMATCH",
    cleanup: "FAILED",
  });
  assert.deepEqual(Object.keys(sanitizedFailure).sort(), [
    "cleanup", "execution_nonce", "failure_class", "result",
    "schema_version", "stage",
  ]);
  assert.equal(
    /password|connection_string|postgres:\/\/|stack|query|environment/i.test(
      JSON.stringify(sanitizedFailure),
    ),
    false,
  );
  assert.equal(isDay149IsolatedFailurePayload({
    ...sanitizedFailure,
    raw_error: "forbidden",
  }), false);
  assert.equal(isDay149IsolatedFailurePayload({
    ...sanitizedFailure,
    execution_nonce: "ABCDEF012345",
  }), false);

  assert.deepEqual(DAY149_REVIEW_SUBSTAGES, [
    "review_fixture_construction",
    "review_service_execution",
    "review_result_validation",
    "review_repository_close",
  ]);
  assert.deepEqual(DAY149_REVIEW_FAILURE_ORIGINS, [
    "FIXTURE_ASSERTION", "SERVICE_REJECTED", "SERVICE_THROW",
    "RESULT_ASSERTION", "REPOSITORY_CLOSE_THROW", "GENERIC_THROW",
  ]);
  assert.deepEqual(DAY149_REPOSITORY_FAILURE_CODES, [
    "duplicate_command_conflict", "command_receipt_invalid", "readback_failed",
    "repository_unavailable", "transaction_failed", "domain_rejection",
  ]);
  assert.deepEqual(DAY149_REVIEW_ASSERTION_CATEGORIES, [
    "FIXTURE_LOOKUP_FAILED", "SERVICE_EXPECTED_SUCCESS",
    "REVIEW_DECISION_ID_MISSING", "RESULT_PAYLOAD_MISMATCH",
    "REPLAY_EXPECTATION_MISMATCH", "UNKNOWN_ASSERTION",
  ]);
  const reviewDiagnostic = (
    reviewSubstage: Day149ReviewSubstage,
    error: unknown,
  ) => createDay149ReviewDurabilityFailurePayload({
    execution_nonce: "012345abcdef",
    review_substage: reviewSubstage,
    error,
    cleanup: "PASS",
  });
  for (const repositoryFailureCode of [
    "transaction_failed", "readback_failed", "command_receipt_invalid",
    "repository_unavailable", "duplicate_command_conflict",
  ] as const) {
    const payload = reviewDiagnostic(
      "review_service_execution",
      new Day149ReviewServiceRejected(repositoryFailureCode),
    );
    assert.equal(payload.failure_origin, "SERVICE_REJECTED");
    assert.equal(payload.repository_failure_code, repositoryFailureCode);
    assert.equal(payload.assertion_category, null);
    assert.equal(payload.failure_class, "REVIEW_DURABILITY_FAILED");
    assert.equal(isDay149ReviewDurabilityFailurePayload(payload), true);
  }
  const domainRejection = reviewDiagnostic(
    "review_service_execution",
    new Day149ReviewServiceRejected("candidate_not_found"),
  );
  assert.equal(domainRejection.failure_origin, "SERVICE_REJECTED");
  assert.equal(domainRejection.repository_failure_code, "domain_rejection");
  assert.equal(domainRejection.failure_class, "REVIEW_DURABILITY_FAILED");
  assert.equal(isDay149ReviewDurabilityFailurePayload(domainRejection), true);
  const fixtureAssertion = reviewDiagnostic(
    "review_fixture_construction",
    new AssertionError({ message: "raw-fixture-assertion-marker" }),
  );
  assert.equal(fixtureAssertion.failure_origin, "FIXTURE_ASSERTION");
  assert.equal(fixtureAssertion.assertion_category, "FIXTURE_LOOKUP_FAILED");
  const missingReviewId = reviewDiagnostic(
    "review_result_validation",
    new Day149ReviewAssertionFailure("REVIEW_DECISION_ID_MISSING"),
  );
  assert.equal(missingReviewId.failure_origin, "RESULT_ASSERTION");
  assert.equal(missingReviewId.assertion_category, "REVIEW_DECISION_ID_MISSING");
  assert.equal(missingReviewId.failure_class, "REVIEW_DURABILITY_FAILED");
  for (const assertionCategory of [
    "SERVICE_EXPECTED_SUCCESS", "RESULT_PAYLOAD_MISMATCH",
    "REPLAY_EXPECTATION_MISMATCH", "UNKNOWN_ASSERTION",
  ] as const) {
    const payload = reviewDiagnostic(
      "review_result_validation",
      new Day149ReviewAssertionFailure(assertionCategory),
    );
    assert.equal(payload.failure_origin, "RESULT_ASSERTION");
    assert.equal(payload.assertion_category, assertionCategory);
    assert.equal(isDay149ReviewDurabilityFailurePayload(payload), true);
  }
  const closeFailure = reviewDiagnostic(
    "review_repository_close",
    new Error("raw-close-error-marker"),
  );
  assert.equal(closeFailure.failure_origin, "REPOSITORY_CLOSE_THROW");
  assert.equal(closeFailure.repository_failure_code, null);
  assert.equal(closeFailure.failure_class, "REVIEW_DURABILITY_FAILED");
  const serviceThrow = reviewDiagnostic(
    "review_service_execution",
    new Error("raw-service-error-marker"),
  );
  assert.equal(serviceThrow.failure_origin, "SERVICE_THROW");
  const unknownFailureCode = reviewDiagnostic(
    "review_service_execution",
    new Day149ReviewServiceRejected("raw-unknown-failure-code-marker"),
  );
  assert.equal(unknownFailureCode.failure_origin, "GENERIC_THROW");
  assert.equal(unknownFailureCode.repository_failure_code, null);
  assert.deepEqual(Object.keys(unknownFailureCode).sort(), [
    "assertion_category", "cleanup", "execution_nonce", "failure_class",
    "failure_origin", "repository_failure_code", "result", "review_substage",
    "schema_version", "stage",
  ]);
  assert.equal(isDay149ReviewDurabilityFailurePayload(unknownFailureCode), true);
  assert.equal(isDay149ReviewDurabilityFailurePayload({
    ...unknownFailureCode,
    raw_error: "forbidden",
  }), false);
  assert.equal(isDay149ReviewDurabilityFailurePayload({
    ...domainRejection,
    repository_failure_code: null,
  }), false);
  const reviewDiagnosticJson = JSON.stringify([
    fixtureAssertion, missingReviewId, closeFailure, serviceThrow, unknownFailureCode,
  ]);
  assert.equal(reviewDiagnosticJson.includes("REPOSITORY_COMMAND_FAILED"), false);
  for (const rawMarker of [
    "raw-fixture-assertion-marker", "raw-close-error-marker",
    "raw-service-error-marker", "raw-unknown-failure-code-marker",
  ]) assert.equal(reviewDiagnosticJson.includes(rawMarker), false);
  assert.equal(
    /sqlstate|postgres|detail|hint|internalquery|routine|constraint|stack|query|password|credential/i
      .test(reviewDiagnosticJson),
    false,
  );

  const classifierSimulations = [
    [{ code: "23503", constraint:
      "operational_memory_projection_command_receipts_review_fkey" }, {
      database_error_class: "INTEGRITY_CONSTRAINT_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: "RECEIPT_REVIEW_FK",
    }],
    [{ code: "23503", constraint:
      "operational_memory_projection_review_decisions_receipt_fkey" }, {
      database_error_class: "INTEGRITY_CONSTRAINT_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: "REVIEW_RECEIPT_FK",
    }],
    [{ code: "P0001", message:
      "operational_memory_projection_receipt_event_binding_invalid" }, {
      database_error_class: "PLPGSQL_RAISED_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: "RECEIPT_BINDING_TRIGGER",
    }],
    [{ code: "P0001", message:
      "operational_memory_projection_command_receipt_required" }, {
      database_error_class: "PLPGSQL_RAISED_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: "EVENT_RECEIPT_REQUIRED_TRIGGER",
    }],
    [{ code: "23514", constraint: "raw-unknown-constraint-marker" }, {
      database_error_class: "INTEGRITY_CONSTRAINT_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: "OTHER_INTEGRITY_CONSTRAINT",
    }],
    [{ code: "42P01" }, {
      database_error_class: "SYNTAX_OR_CATALOG_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: null,
    }],
    [{ code: "25P02" }, {
      database_error_class: "INVALID_TRANSACTION_STATE",
      resource_connection_subcategory: null,
      deferred_check_identifier: null,
    }],
    [{ code: "08006" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "CONNECTION_EXCEPTION",
      deferred_check_identifier: null,
    }],
    [{ code: "53100" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "INSUFFICIENT_RESOURCES",
      deferred_check_identifier: null,
    }],
    [{ code: "54000" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "PROGRAM_LIMIT_EXCEEDED",
      deferred_check_identifier: null,
    }],
    [{ code: "55P03" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "LOCK_NOT_AVAILABLE",
      deferred_check_identifier: null,
    }],
    [{ code: "55000" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "OBJECT_NOT_IN_PREREQUISITE_STATE",
      deferred_check_identifier: null,
    }],
    [{ code: "55006" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "OBJECT_IN_USE",
      deferred_check_identifier: null,
    }],
    [{ code: "55P02" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "CANT_CHANGE_RUNTIME_PARAM",
      deferred_check_identifier: null,
    }],
    [{ code: "55P04" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "UNSAFE_NEW_ENUM_VALUE_USAGE",
      deferred_check_identifier: null,
    }],
    [{ code: "55ZZZ" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "OTHER_OBJECT_STATE_ERROR",
      deferred_check_identifier: null,
    }],
    [{ code: "57014" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "QUERY_CANCELED",
      deferred_check_identifier: null,
    }],
    [{ code: "57P01" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "ADMIN_OR_CRASH_SHUTDOWN",
      deferred_check_identifier: null,
    }],
    [{ code: "58030" }, {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "SYSTEM_ERROR",
      deferred_check_identifier: null,
    }],
    [{ message: "raw-missing-code-marker" }, {
      database_error_class: "OTHER_DATABASE_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: null,
    }],
    [{ code: "23!" }, {
      database_error_class: "OTHER_DATABASE_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: null,
    }],
  ] as const;
  const classifierDiagnostics = classifierSimulations.map(([error, expected]) => {
    const diagnostic = classifyFarmOsProjectionCommandCommitDatabaseError(error);
    assert.deepEqual(diagnostic, expected);
    assert.deepEqual(Object.keys(diagnostic).sort(), [
      "database_error_class", "deferred_check_identifier",
      "resource_connection_subcategory",
    ]);
    return diagnostic;
  });
  const classifierJson = JSON.stringify(classifierDiagnostics);
  for (const marker of [
    "23503", "P0001", "42P01", "25P02", "08006", "53100", "54000",
    "55P03", "55000", "55006", "55P02", "55P04", "55ZZZ",
    "57014", "57P01", "58030",
    "raw-unknown-constraint-marker", "raw-missing-code-marker",
  ]) assert.equal(classifierJson.includes(marker), false);

  assert.doesNotThrow(() => notifyFarmOsProjectionCommandCommitFailureObserver(
    undefined,
    classifierDiagnostics[0],
  ));
  let throwingCommitObserverInvocations = 0;
  assert.doesNotThrow(() => notifyFarmOsProjectionCommandCommitFailureObserver(
    () => {
      throwingCommitObserverInvocations += 1;
      throw new Error("raw-commit-observer-marker");
    },
    classifierDiagnostics[0],
  ));
  assert.equal(throwingCommitObserverInvocations, 1);

  assert.deepEqual(FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES, [
    "pool_connect", "transaction_begin", "statement_timeout", "lock_timeout",
    "set_local_role", "advisory_lock", "receipt_lookup",
    "receipt_replay_validation", "state_read", "build_plan",
    "plan_identity_validation", "writer_call", "writer_result_validation",
    "receipt_readback", "state_readback", "exact_readback_validation",
    "deferred_constraint_probe", "transaction_commit", "transaction_rollback",
    "client_release",
  ]);
  assert.equal(
    new Set(FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES).size,
    FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES.length,
  );
  const repositorySource = readFileSync(new URL(
    "../../src/lib/hermes/farm_os_operational_memory_postgres_repository.ts",
    import.meta.url,
  ), "utf8");
  for (const substage of FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES) {
    assert.equal(repositorySource.includes(`observe("${substage}")`), true);
  }
  const transactionDiagnostic = (
    transactionSubstage: unknown,
    error: unknown = new Day149ReviewServiceRejected("transaction_failed"),
  ) => createDay149ReviewDurabilityFailurePayloadV3({
    execution_nonce: "012345abcdef",
    review_substage: "review_service_execution",
    error,
    transaction_substage: transactionSubstage,
    cleanup: "PASS",
  });
  for (const substage of [
    "set_local_role", "advisory_lock", "state_read", "writer_call",
    "writer_result_validation", "receipt_readback", "state_readback",
    "transaction_commit",
  ] as const) {
    const observerState = createDay149TransactionObserverState();
    observerState.observer("pool_connect");
    observerState.observer(substage);
    observerState.observer("transaction_rollback");
    observerState.observer(substage);
    observerState.observer("client_release");
    const payload = transactionDiagnostic(
      observerState.transactionFailureSubstage(),
    );
    assert.equal(payload.failure_origin, "SERVICE_REJECTED");
    assert.equal(payload.repository_failure_code, "transaction_failed");
    assert.equal(payload.transaction_substage, substage);
    assert.equal(payload.assertion_category, null);
    assert.equal(payload.failure_class, "REVIEW_DURABILITY_FAILED");
    assert.equal(isDay149ReviewDurabilityFailurePayloadV3(payload), true);
    assert.deepEqual(Object.keys(payload).sort(), [
      "assertion_category", "cleanup", "execution_nonce", "failure_class",
      "failure_origin", "repository_failure_code", "result", "review_substage",
      "schema_version", "stage", "transaction_substage",
    ]);
  }
  const rollbackObserverState = createDay149TransactionObserverState();
  rollbackObserverState.observer("writer_call");
  rollbackObserverState.observer("transaction_rollback");
  rollbackObserverState.observer("writer_call");
  assert.equal(
    rollbackObserverState.transactionFailureSubstage(),
    "writer_call",
  );
  const releaseState = createDay149TransactionObserverState();
  releaseState.observer("pool_connect");
  releaseState.observer("client_release");
  const releasePayload = transactionDiagnostic(
    releaseState.serviceThrowSubstage(),
    new Error("raw-client-release-marker"),
  );
  assert.equal(releasePayload.failure_origin, "SERVICE_THROW");
  assert.equal(releasePayload.transaction_substage, "client_release");
  assert.equal(isDay149ReviewDurabilityFailurePayloadV3(releasePayload), true);
  assert.doesNotThrow(() =>
    notifyFarmOsProjectionCommandTransactionObserver(undefined, "writer_call")
  );
  let throwingObserverInvocations = 0;
  assert.doesNotThrow(() => notifyFarmOsProjectionCommandTransactionObserver(
    () => {
      throwingObserverInvocations += 1;
      throw new Error("raw-observer-error-marker");
    },
    "writer_call",
  ));
  assert.equal(throwingObserverInvocations, 1);
  const unavailablePool = Object.freeze({
    connect: async () => {
      throw new Error("raw-pool-connect-marker");
    },
    end: async () => undefined,
  });
  const unavailableCommandInput = Object.freeze({
    command_id: "observer-static-command",
    idempotency_key_hash: "observer-static-key-hash",
    command_type: "review_projection_candidate" as const,
    canonical_payload_hash: "observer-static-payload-hash",
    build_plan: () => {
      throw new Error("unreachable-static-build-plan");
    },
  });
  const resultWithoutObserver = await new FarmOsOperationalMemoryPostgresRepository({
    pool: unavailablePool as never,
  }).executeProjectionCommand(unavailableCommandInput);
  const resultWithThrowingObserver =
    await new FarmOsOperationalMemoryPostgresRepository({
      pool: unavailablePool as never,
      projectionCommandTransactionObserver: () => {
        throw new Error("raw-repository-observer-marker");
      },
    }).executeProjectionCommand(unavailableCommandInput);
  assert.deepEqual(resultWithoutObserver, {
    status: "rejected",
    failure_code: "repository_unavailable",
  });
  assert.deepEqual(resultWithThrowingObserver, resultWithoutObserver);

  const replayDurable = fixture();
  const replayFixtureRepository = new FixtureRepository(replayDurable);
  const replayReviewCommand = reviewCommand();
  const replayReviewResult = await execute(
    replayFixtureRepository,
    replayReviewCommand,
  );
  assert.equal(replayReviewResult.ok, true);
  const replayReceipt = [...replayDurable.receipts.values()][0];
  assert.ok(replayReceipt);
  const commitFailureCommandInput = Object.freeze({
    command_id: replayReceipt.command_id,
    idempotency_key_hash: replayReceipt.idempotency_key_hash,
    command_type: replayReceipt.command_type,
    canonical_payload_hash: replayReceipt.canonical_payload_hash,
    build_plan: () => {
      throw new Error("unreachable-commit-failure-build-plan");
    },
  });
  const executeSimulatedCommitFailure = async (input: Readonly<{
    observer?: FarmOsProjectionCommandCommitFailureObserver;
    rollbackThrows?: boolean;
    commitCode?: string;
    commitMessage?: string;
  }> = {}) => {
    let released = 0;
    const client = {
      query: async (query: string) => {
        if (query === "commit") {
          throw Object.assign(new Error(
            input.commitMessage ??
              "operational_memory_projection_command_receipt_required",
          ), { code: input.commitCode ?? "P0001" });
        }
        if (query === "rollback" && input.rollbackThrows) {
          throw new Error("raw-rollback-failure-marker");
        }
        if (query.includes(
          "from ai.operational_memory_projection_command_receipts",
        )) return { rows: [clone(replayReceipt)] };
        return { rows: [] };
      },
      release: () => {
        released += 1;
      },
    };
    const repository = new FarmOsOperationalMemoryPostgresRepository({
      pool: {
        connect: async () => client,
        end: async () => undefined,
      } as never,
      projectionCommandCommitFailureObserver: input.observer,
    });
    const result = await repository.executeProjectionCommand(
      commitFailureCommandInput,
    );
    assert.equal(released, 1);
    return result;
  };
  const commitDiagnostics: FarmOsProjectionCommandCommitFailureDiagnostic[] = [];
  const commitFailureWithoutObserver = await executeSimulatedCommitFailure();
  const commitFailureWithObserver = await executeSimulatedCommitFailure({
    observer: (diagnostic) => commitDiagnostics.push(diagnostic),
  });
  const commitFailureWithThrowingObserver = await executeSimulatedCommitFailure({
    observer: () => {
      throw new Error("raw-repository-commit-observer-marker");
    },
  });
  await executeSimulatedCommitFailure({
    observer: (diagnostic) => commitDiagnostics.push(diagnostic),
    rollbackThrows: true,
  });
  const resourceCommitDiagnostics: FarmOsProjectionCommandCommitFailureDiagnostic[] = [];
  assert.deepEqual(await executeSimulatedCommitFailure({
    observer: (diagnostic) => resourceCommitDiagnostics.push(diagnostic),
    commitCode: "57014",
  }), commitFailureWithoutObserver);
  assert.deepEqual(commitFailureWithoutObserver, {
    status: "rejected", failure_code: "transaction_failed",
  });
  assert.deepEqual(commitFailureWithObserver, commitFailureWithoutObserver);
  assert.deepEqual(commitFailureWithThrowingObserver, commitFailureWithoutObserver);
  assert.deepEqual(await executeSimulatedCommitFailure({
    commitMessage: "projection_command_receipt_invalid",
  }), commitFailureWithoutObserver);
  assert.deepEqual(await executeSimulatedCommitFailure({
    commitMessage: "projection_command_receipt_readback_invalid",
  }), commitFailureWithoutObserver);
  assert.equal(commitDiagnostics.length, 2);
  assert.deepEqual(commitDiagnostics[0], {
    database_error_class: "PLPGSQL_RAISED_ERROR",
    resource_connection_subcategory: null,
    deferred_check_identifier: "EVENT_RECEIPT_REQUIRED_TRIGGER",
  });
  assert.deepEqual(commitDiagnostics[1], commitDiagnostics[0]);
  assert.deepEqual(resourceCommitDiagnostics, [{
    database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
    resource_connection_subcategory: "QUERY_CANCELED",
    deferred_check_identifier: null,
  }]);

  let nonCommitObserverInvocations = 0;
  const nonCommitClient = {
    query: async () => {
      throw Object.assign(new Error("raw-non-commit-marker"), { code: "23514" });
    },
    release: () => undefined,
  };
  const nonCommitFailure = await new FarmOsOperationalMemoryPostgresRepository({
    pool: {
      connect: async () => nonCommitClient,
      end: async () => undefined,
    } as never,
    projectionCommandCommitFailureObserver: () => {
      nonCommitObserverInvocations += 1;
    },
  }).executeProjectionCommand(commitFailureCommandInput);
  assert.deepEqual(nonCommitFailure, {
    status: "rejected", failure_code: "transaction_failed",
  });
  assert.equal(nonCommitObserverInvocations, 0);

  const successiveCommitState = createDay149CommitFailureObserverState();
  successiveCommitState.observer(commitDiagnostics[0]);
  assert.deepEqual(successiveCommitState.latest(), commitDiagnostics[0]);
  successiveCommitState.reset();
  assert.equal(successiveCommitState.latest(), null);
  const probeStatementFragments = Object.freeze({
    RECEIPT_REVIEW_FK_PROBE:
      "ai.operational_memory_projection_command_receipts_review_fkey",
    RECEIPT_BINDING_TRIGGER_PROBE:
      "ai.operational_memory_projection_command_receipt_binding_guard",
    EVENT_RECEIPT_REQUIRED_TRIGGER_PROBE:
      "ai.operational_memory_projection_command_receipt_required",
  });
  const executeSimulatedDeferredProbe = async (input: Readonly<{
    enabled?: boolean;
    failingProbe?: keyof typeof probeStatementFragments;
    finalCommitFailure?: boolean;
    rollbackThrows?: boolean;
    observer?: FarmOsProjectionCommandDeferredProbeObserver;
  }> = {}) => {
    const queries: string[] = [];
    let receiptReads = 0;
    const client = {
      query: async (query: string) => {
        queries.push(query);
        if (query.includes(
          "from ai.operational_memory_projection_command_receipts",
        )) {
          receiptReads += 1;
          return { rows: receiptReads === 1 ? [] : [clone(replayReceipt)] };
        }
        if (query.includes(
          "select ai.persist_operational_memory_projection_command",
        )) return { rows: [{ result: clone(replayReceipt.result_payload) }] };
        if (query.startsWith("SET CONSTRAINTS")) {
          const failingFragment = input.failingProbe === undefined
            ? null
            : probeStatementFragments[input.failingProbe];
          if (failingFragment !== null && query.includes(failingFragment)) {
            throw Object.assign(new Error("raw-probe-failure-marker"), {
              code: "55000",
            });
          }
          return { rows: [] };
        }
        if (query === "commit" && input.finalCommitFailure) {
          throw Object.assign(new Error("raw-final-commit-marker"), {
            code: "55000",
          });
        }
        if (query === "rollback" && input.rollbackThrows) {
          throw new Error("raw-probe-rollback-marker");
        }
        return { rows: [] };
      },
      release: () => undefined,
    };
    const repository = new FarmOsOperationalMemoryPostgresRepository({
      pool: {
        connect: async () => client,
        end: async () => undefined,
      } as never,
      ...(input.enabled
        ? {
          projectionCommandDeferredProbeOptions: {
            enabled: true as const,
            observer: input.observer,
          },
        }
        : {}),
    });
    const result = await repository.executeProjectionCommand({
      command_id: replayReceipt.command_id,
      idempotency_key_hash: replayReceipt.idempotency_key_hash,
      command_type: replayReceipt.command_type,
      canonical_payload_hash: replayReceipt.canonical_payload_hash,
      build_plan: () => ({
        receipt: clone(replayReceipt),
        review_decision: null,
        rebuild_projection: null,
        projection_events: [],
        rebuild_lineage: [],
      }),
    });
    return { result, queries };
  };
  const defaultProbeSimulation = await executeSimulatedDeferredProbe();
  assert.equal(defaultProbeSimulation.queries.filter((query) =>
    query.startsWith("SET CONSTRAINTS")).length, 0);
  assert.equal(defaultProbeSimulation.result.status, "committed");
  for (const [failingProbe, expectedProbeCount] of [
    ["RECEIPT_REVIEW_FK_PROBE", 1],
    ["RECEIPT_BINDING_TRIGGER_PROBE", 2],
    ["EVENT_RECEIPT_REQUIRED_TRIGGER_PROBE", 3],
  ] as const) {
    const diagnostics: FarmOsProjectionCommandDeferredProbeDiagnostic[] = [];
    const simulation = await executeSimulatedDeferredProbe({
      enabled: true,
      failingProbe,
      observer: (diagnostic) => diagnostics.push(diagnostic),
    });
    assert.deepEqual(simulation.result, {
      status: "rejected", failure_code: "transaction_failed",
    });
    assert.equal(simulation.queries.filter((query) =>
      query.startsWith("SET CONSTRAINTS")).length, expectedProbeCount);
    assert.equal(simulation.queries.includes("commit"), false);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0]?.probe_identifier, failingProbe);
  }
  const allProbesPass = await executeSimulatedDeferredProbe({ enabled: true });
  assert.equal(allProbesPass.queries.filter((query) =>
    query.startsWith("SET CONSTRAINTS")).length, 3);
  assert.equal(allProbesPass.queries.includes("commit"), true);
  assert.equal(allProbesPass.result.status, "committed");
  const finalCommitDiagnostics: FarmOsProjectionCommandDeferredProbeDiagnostic[] = [];
  const finalCommitFailure = await executeSimulatedDeferredProbe({
    enabled: true,
    finalCommitFailure: true,
    observer: (diagnostic) => finalCommitDiagnostics.push(diagnostic),
  });
  assert.deepEqual(finalCommitFailure.result, {
    status: "rejected", failure_code: "transaction_failed",
  });
  assert.equal(finalCommitDiagnostics[0]?.probe_identifier,
    "FINAL_COMMIT_AFTER_ALL_PROBES");
  const rollbackProbeDiagnostics: FarmOsProjectionCommandDeferredProbeDiagnostic[] = [];
  await executeSimulatedDeferredProbe({
    enabled: true,
    failingProbe: "RECEIPT_BINDING_TRIGGER_PROBE",
    rollbackThrows: true,
    observer: (diagnostic) => rollbackProbeDiagnostics.push(diagnostic),
  });
  assert.equal(rollbackProbeDiagnostics[0]?.probe_identifier,
    "RECEIPT_BINDING_TRIGGER_PROBE");
  const observerAbsentProbe = await executeSimulatedDeferredProbe({
    enabled: true,
    failingProbe: "RECEIPT_REVIEW_FK_PROBE",
  });
  const observerThrowsProbe = await executeSimulatedDeferredProbe({
    enabled: true,
    failingProbe: "RECEIPT_REVIEW_FK_PROBE",
    observer: () => {
      throw new Error("raw-probe-observer-marker");
    },
  });
  assert.deepEqual(observerThrowsProbe.result, observerAbsentProbe.result);
  assert.doesNotThrow(() => notifyFarmOsProjectionCommandDeferredProbeObserver(
    undefined,
    finalCommitDiagnostics[0]!,
  ));
  const successiveProbeState = createDay149DeferredProbeObserverState();
  successiveProbeState.observer(finalCommitDiagnostics[0]!);
  assert.equal(successiveProbeState.latest()?.probe_identifier,
    "FINAL_COMMIT_AFTER_ALL_PROBES");
  successiveProbeState.reset();
  assert.equal(successiveProbeState.latest(), null);
  const nonTransactionPayload = transactionDiagnostic(
    "writer_call",
    new Day149ReviewServiceRejected("readback_failed"),
  );
  assert.equal(nonTransactionPayload.transaction_substage, null);
  const unknownSubstagePayload = transactionDiagnostic(
    "raw-unknown-substage-marker",
  );
  assert.equal(unknownSubstagePayload.failure_origin, "GENERIC_THROW");
  assert.equal(unknownSubstagePayload.repository_failure_code, null);
  assert.equal(unknownSubstagePayload.transaction_substage, null);
  assert.equal(isDay149ReviewDurabilityFailurePayloadV3(unknownSubstagePayload), true);
  const v3FixtureAssertion = createDay149ReviewDurabilityFailurePayloadV3({
    execution_nonce: "012345abcdef",
    review_substage: "review_fixture_construction",
    error: new AssertionError({ message: "raw-v3-fixture-marker" }),
    transaction_substage: "writer_call",
    cleanup: "PASS",
  });
  assert.equal(v3FixtureAssertion.transaction_substage, null);
  const transactionDiagnosticJson = JSON.stringify([
    releasePayload, nonTransactionPayload, unknownSubstagePayload,
    v3FixtureAssertion,
  ]);
  for (const rawMarker of [
    "raw-client-release-marker", "raw-observer-error-marker",
    "raw-unknown-substage-marker", "raw-v3-fixture-marker",
    "raw-pool-connect-marker", "raw-repository-observer-marker",
  ]) assert.equal(transactionDiagnosticJson.includes(rawMarker), false);
  assert.equal(
    /sqlstate|postgres|detail|hint|internalquery|routine|constraint|stack|query|password|credential|oid/i
      .test(transactionDiagnosticJson),
    false,
  );

  assert.deepEqual(DAY149_FIRST_PROMOTION_SUBSTAGES, [
    "first_service_execution", "first_result_validation",
    "replay_service_execution", "replay_result_validation",
  ]);
  assert.deepEqual(DAY149_FIRST_PROMOTION_FAILURE_ORIGINS, [
    "SERVICE_REJECTED", "SERVICE_THROW", "RESULT_ASSERTION", "GENERIC_THROW",
  ]);
  assert.deepEqual(DAY149_FIRST_PROMOTION_ASSERTION_CATEGORIES, [
    "FIRST_EXECUTION_EXPECTED_SUCCESS", "REPLAY_EXECUTION_EXPECTED_SUCCESS",
    "REPLAY_EXPECTED_TRUE", "UNKNOWN_ASSERTION",
  ]);
  assert.deepEqual(DAY149_RESOURCE_CONNECTION_SUBCATEGORIES, [
    "CONNECTION_EXCEPTION", "INSUFFICIENT_RESOURCES", "PROGRAM_LIMIT_EXCEEDED",
    "LOCK_NOT_AVAILABLE", "OBJECT_NOT_IN_PREREQUISITE_STATE", "OBJECT_IN_USE",
    "CANT_CHANGE_RUNTIME_PARAM", "UNSAFE_NEW_ENUM_VALUE_USAGE",
    "OTHER_OBJECT_STATE_ERROR", "QUERY_CANCELED", "ADMIN_OR_CRASH_SHUTDOWN",
    "SYSTEM_ERROR", "OTHER_RESOURCE_OR_CONNECTION_ERROR",
  ]);
  const harnessSource = readFileSync(new URL(import.meta.url), "utf8");
  const day149ApplySource = readFileSync(new URL(
    "../../db/migrations/202608030001_daily_operational_projection_command_ledger.sql",
    import.meta.url,
  ), "utf8");
  const receiptBindingMarker = "as $day149_receipt_binding$";
  const receiptBindingStart = day149ApplySource.indexOf(receiptBindingMarker);
  const receiptBindingEnd = day149ApplySource.indexOf(
    "$day149_receipt_binding$;",
    receiptBindingStart + receiptBindingMarker.length,
  );
  assert.ok(receiptBindingStart >= 0 && receiptBindingEnd > receiptBindingStart);
  const receiptBindingBody = day149ApplySource.slice(
    receiptBindingStart + receiptBindingMarker.length,
    receiptBindingEnd,
  );
  const promotionBranchStart = receiptBindingBody.indexOf(
    "elsif new.command_type = 'promote_projection_candidate' then",
  );
  const oneEventBranchStart = receiptBindingBody.indexOf(
    "if event_slot_count = 1 then",
    promotionBranchStart,
  );
  const twoEventBranchStart = receiptBindingBody.indexOf(
    "elsif event_slot_count = 2 then",
    oneEventBranchStart,
  );
  const promotionBranchEnd = receiptBindingBody.indexOf(
    "elsif new.command_type = 'reject_projection_candidate' then",
    twoEventBranchStart,
  );
  const payloadValidationStart = receiptBindingBody.indexOf(
    "if (new.result_payload -> 'review_decision_id')",
    promotionBranchEnd,
  );
  assert.ok(promotionBranchStart >= 0);
  assert.ok(oneEventBranchStart > promotionBranchStart);
  assert.ok(twoEventBranchStart > oneEventBranchStart);
  assert.ok(promotionBranchEnd > twoEventBranchStart);
  assert.ok(payloadValidationStart > promotionBranchEnd);
  const promotionCommonBranch = receiptBindingBody.slice(
    promotionBranchStart,
    oneEventBranchStart,
  );
  const oneEventPromotionBranch = receiptBindingBody.slice(
    oneEventBranchStart,
    twoEventBranchStart,
  );
  const twoEventPromotionBranch = receiptBindingBody.slice(
    twoEventBranchStart,
    promotionBranchEnd,
  );
  assert.match(promotionCommonBranch, /event_slot_count not in \(1, 2\)/);
  assert.match(promotionCommonBranch, /review_row\.decision <> 'approve'/);
  assert.match(oneEventPromotionBranch, /event_one\.status <> 'active'/);
  assert.match(
    oneEventPromotionBranch,
    /event_one\.projection_id <> review_row\.candidate_projection_id/,
  );
  assert.equal((oneEventPromotionBranch.match(/\bevent_two\b/g) ?? []).length, 0);
  assert.match(twoEventPromotionBranch, /event_two\.status <> 'active'/);
  assert.match(
    twoEventPromotionBranch,
    /event_two\.projection_id <> review_row\.candidate_projection_id/,
  );
  for (const branch of [
    promotionCommonBranch, oneEventPromotionBranch, twoEventPromotionBranch,
  ]) {
    assert.match(
      branch,
      /raise exception using errcode = '23514',[\s\S]*message = 'operational_memory_projection_receipt_promotion_invalid'/,
    );
  }
  const migrationApplyIndex = harnessSource.indexOf(
    'stage = "day149_migration_apply";',
  );
  const repositoryConnectionIndex = harnessSource.indexOf(
    'stage = "repository_connection";',
  );
  const firstPromotionStageIndex = harnessSource.indexOf(
    'stage = "first_promotion";',
  );
  assert.ok(migrationApplyIndex >= 0 && repositoryConnectionIndex > migrationApplyIndex &&
    firstPromotionStageIndex > repositoryConnectionIndex);
  assert.equal(/alter\s+type/i.test(repositorySource), false);
  assert.equal(/\b(drop|rename)\b/i.test(repositorySource), false);
  const commitStatements = repositorySource.match(
    /observe\("transaction_commit"\);\s*await client\.query\("commit"\);/g,
  ) ?? [];
  assert.equal(commitStatements.length, 2);
  assert.equal(commitStatements.some((statement) => /\bset\b/i.test(statement)), false);
  const probeIdentifiersInSource = [
    "RECEIPT_REVIEW_FK_PROBE", "RECEIPT_BINDING_TRIGGER_PROBE",
    "EVENT_RECEIPT_REQUIRED_TRIGGER_PROBE",
  ] as const;
  const probeIdentifierIndexes = probeIdentifiersInSource.map((identifier) =>
    repositorySource.indexOf(`identifier: "${identifier}"`)
  );
  assert.ok(probeIdentifierIndexes.every((index) => index >= 0));
  assert.ok(probeIdentifierIndexes[0]! < probeIdentifierIndexes[1]! &&
    probeIdentifierIndexes[1]! < probeIdentifierIndexes[2]!);
  const exactReadbackIndex = repositorySource.indexOf(
    'observe("exact_readback_validation")',
  );
  const probeLoopIndex = repositorySource.indexOf(
    "for (const probe of DEFERRED_PROBES)",
  );
  const finalCommitIndex = repositorySource.indexOf(
    'observe("transaction_commit")',
    probeLoopIndex,
  );
  assert.ok(exactReadbackIndex >= 0 && probeLoopIndex > exactReadbackIndex &&
    finalCommitIndex > probeLoopIndex);
  assert.equal((repositorySource.match(/SET CONSTRAINTS\n/g) ?? []).length, 3);
  assert.equal(/SET CONSTRAINTS\s+ALL\s+IMMEDIATE/i.test(repositorySource), false);
  for (const constraintName of [
    "ai.operational_memory_projection_command_receipts_review_fkey",
    "ai.operational_memory_projection_command_receipt_binding_guard",
    "ai.operational_memory_projection_command_receipt_required",
  ]) assert.equal(repositorySource.includes(constraintName), true);
  assert.ok(repositorySource.indexOf(
    "if (this.projectionCommandDeferredProbeOptions?.enabled === true)",
  ) < probeLoopIndex);
  const firstServiceStageIndex = harnessSource.indexOf(
    'promotionSubstage = "first_service_execution";',
  );
  const firstServiceRejectionIndex = harnessSource.indexOf(
    "throw new Day149FirstPromotionServiceRejected(firstPromote.failure_code);",
  );
  const firstResultStageIndex = harnessSource.indexOf(
    'promotionSubstage = "first_result_validation";',
  );
  const replayServiceStageIndex = harnessSource.indexOf(
    'promotionSubstage = "replay_service_execution";',
  );
  const replayServiceRejectionIndex = harnessSource.indexOf(
    "throw new Day149FirstPromotionServiceRejected(firstPromoteReplay.failure_code);",
  );
  const replayResultStageIndex = harnessSource.indexOf(
    'promotionSubstage = "replay_result_validation";',
  );
  assert.ok(firstServiceStageIndex >= 0 &&
    firstServiceStageIndex < firstServiceRejectionIndex &&
    firstServiceRejectionIndex < firstResultStageIndex &&
    firstResultStageIndex < replayServiceStageIndex &&
    replayServiceStageIndex < replayServiceRejectionIndex &&
    replayServiceRejectionIndex < replayResultStageIndex);
  const firstPromotionRoutingIndex = harnessSource.indexOf(
    'if (failedStage === "first_promotion")',
  );
  const genericRoutingIndex = harnessSource.indexOf(
    "return createDay149IsolatedFailurePayload({",
    firstPromotionRoutingIndex,
  );
  assert.ok(firstPromotionRoutingIndex >= 0 && genericRoutingIndex >= 0 &&
    firstPromotionRoutingIndex < genericRoutingIndex);
  const promotionDiagnostic = (
    promotionSubstage: Day149FirstPromotionSubstage,
    error: unknown,
    transactionSubstage: unknown = null,
    commitFailureDiagnostic:
      FarmOsProjectionCommandCommitFailureDiagnostic | null = null,
  ) => createDay149FirstPromotionFailurePayload({
    execution_nonce: "012345abcdef",
    promotion_substage: promotionSubstage,
    error,
    transaction_substage: transactionSubstage,
    commit_failure_diagnostic: commitFailureDiagnostic,
    cleanup: "PASS",
  });
  const firstTransactionFailure = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "writer_call",
  );
  assert.equal(firstTransactionFailure.failure_origin, "SERVICE_REJECTED");
  assert.equal(firstTransactionFailure.repository_failure_code, "transaction_failed");
  assert.equal(firstTransactionFailure.transaction_substage, "writer_call");
  assert.equal(firstTransactionFailure.commit_database_error_class, null);
  assert.equal(firstTransactionFailure.resource_connection_subcategory, null);
  assert.equal(firstTransactionFailure.deferred_check_identifier, null);
  assert.equal(firstTransactionFailure.failure_class, "FIRST_PROMOTION_FAILED");
  assert.equal(isDay149FirstPromotionFailurePayload(firstTransactionFailure), true);
  assert.deepEqual(Object.keys(firstTransactionFailure).sort(), [
    "assertion_category", "cleanup", "commit_database_error_class",
    "deferred_check_identifier", "execution_nonce", "failure_class", "failure_origin",
    "promotion_substage", "repository_failure_code", "resource_connection_subcategory",
    "result", "schema_version", "stage", "transaction_substage",
  ]);
  const firstReadbackFailure = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("readback_failed"),
    "writer_call",
  );
  assert.equal(firstReadbackFailure.repository_failure_code, "readback_failed");
  assert.equal(firstReadbackFailure.transaction_substage, null);
  const firstDomainRejection = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("approval_invalid"),
  );
  assert.equal(firstDomainRejection.repository_failure_code, "domain_rejection");
  assert.equal(firstDomainRejection.transaction_substage, null);
  const replayTransactionFailure = promotionDiagnostic(
    "replay_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "transaction_commit",
    {
      database_error_class: "INTEGRITY_CONSTRAINT_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: "RECEIPT_REVIEW_FK",
    },
  );
  assert.equal(replayTransactionFailure.transaction_substage, "transaction_commit");
  assert.equal(replayTransactionFailure.commit_database_error_class,
    "INTEGRITY_CONSTRAINT_ERROR");
  assert.equal(replayTransactionFailure.resource_connection_subcategory, null);
  assert.equal(replayTransactionFailure.deferred_check_identifier,
    "RECEIPT_REVIEW_FK");
  const missingCommitDiagnostic = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "transaction_commit",
  );
  assert.equal(missingCommitDiagnostic.failure_origin, "GENERIC_THROW");
  assert.equal(missingCommitDiagnostic.repository_failure_code, null);
  assert.equal(missingCommitDiagnostic.transaction_substage, null);
  assert.equal(missingCommitDiagnostic.commit_database_error_class, null);
  assert.equal(missingCommitDiagnostic.resource_connection_subcategory, null);
  assert.equal(missingCommitDiagnostic.deferred_check_identifier, null);
  const commitResourceFailure = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "transaction_commit",
    {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "QUERY_CANCELED",
      deferred_check_identifier: null,
    },
  );
  assert.equal(commitResourceFailure.failure_origin, "SERVICE_REJECTED");
  assert.equal(commitResourceFailure.resource_connection_subcategory,
    "QUERY_CANCELED");
  assert.equal(isDay149FirstPromotionFailurePayload(commitResourceFailure), true);
  const commitObjectStateFailure = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "transaction_commit",
    {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "OBJECT_NOT_IN_PREREQUISITE_STATE",
      deferred_check_identifier: null,
    },
  );
  assert.equal(commitObjectStateFailure.resource_connection_subcategory,
    "OBJECT_NOT_IN_PREREQUISITE_STATE");
  assert.equal(commitObjectStateFailure.schema_version,
    "farmos.day149.first-promotion-diagnostic.v4");
  assert.equal(isDay149FirstPromotionFailurePayload(commitObjectStateFailure), true);
  const missingResourceSubcategory = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "transaction_commit",
    {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: null,
      deferred_check_identifier: null,
    },
  );
  assert.equal(missingResourceSubcategory.failure_origin, "GENERIC_THROW");
  assert.equal(missingResourceSubcategory.repository_failure_code, null);
  assert.equal(missingResourceSubcategory.transaction_substage, null);
  assert.equal(missingResourceSubcategory.commit_database_error_class, null);
  assert.equal(missingResourceSubcategory.resource_connection_subcategory, null);
  assert.equal(missingResourceSubcategory.deferred_check_identifier, null);
  const invalidResourceSubcategory = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "transaction_commit",
    {
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "raw-resource-subcategory-marker" as
        FarmOsProjectionCommandResourceConnectionSubcategory,
      deferred_check_identifier: null,
    },
  );
  assert.equal(invalidResourceSubcategory.failure_origin, "GENERIC_THROW");
  assert.equal(invalidResourceSubcategory.repository_failure_code, null);
  assert.equal(invalidResourceSubcategory.transaction_substage, null);
  assert.equal(invalidResourceSubcategory.resource_connection_subcategory, null);
  const replayDuplicateConflict = promotionDiagnostic(
    "replay_service_execution",
    new Day149FirstPromotionServiceRejected("duplicate_command_conflict"),
    "receipt_lookup",
  );
  assert.equal(replayDuplicateConflict.repository_failure_code,
    "duplicate_command_conflict");
  assert.equal(replayDuplicateConflict.transaction_substage, null);
  for (const [promotionSubstage, assertionCategory] of [
    ["first_result_validation", "FIRST_EXECUTION_EXPECTED_SUCCESS"],
    ["replay_result_validation", "REPLAY_EXECUTION_EXPECTED_SUCCESS"],
    ["replay_result_validation", "REPLAY_EXPECTED_TRUE"],
  ] as const) {
    const payload = promotionDiagnostic(
      promotionSubstage,
      new Day149FirstPromotionAssertionFailure(assertionCategory),
      "writer_call",
    );
    assert.equal(payload.failure_origin, "RESULT_ASSERTION");
    assert.equal(payload.repository_failure_code, null);
    assert.equal(payload.transaction_substage, null);
    assert.equal(payload.assertion_category, assertionCategory);
    assert.equal(isDay149FirstPromotionFailurePayload(payload), true);
  }
  const promotionServiceThrow = promotionDiagnostic(
    "first_service_execution",
    new Error("raw-first-promotion-service-marker"),
    "client_release",
  );
  assert.equal(promotionServiceThrow.failure_origin, "SERVICE_THROW");
  assert.equal(promotionServiceThrow.transaction_substage, "client_release");
  const promotionServiceThrowWithoutSubstage = promotionDiagnostic(
    "replay_service_execution",
    new Error("raw-first-promotion-replay-marker"),
  );
  assert.equal(promotionServiceThrowWithoutSubstage.transaction_substage, null);
  const unknownPromotionFailureCode = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("raw-promotion-code-marker"),
    "writer_call",
  );
  assert.equal(unknownPromotionFailureCode.failure_origin, "GENERIC_THROW");
  assert.equal(unknownPromotionFailureCode.repository_failure_code, null);
  assert.equal(unknownPromotionFailureCode.transaction_substage, null);
  const invalidPromotionSubstage = promotionDiagnostic(
    "first_service_execution",
    new Day149FirstPromotionServiceRejected("transaction_failed"),
    "raw-promotion-substage-marker",
  );
  assert.equal(invalidPromotionSubstage.failure_origin, "GENERIC_THROW");
  assert.equal(invalidPromotionSubstage.repository_failure_code, null);
  assert.equal(invalidPromotionSubstage.transaction_substage, null);
  const promotionDiagnosticJson = JSON.stringify([
    firstTransactionFailure, firstReadbackFailure, firstDomainRejection,
    replayTransactionFailure, missingCommitDiagnostic, commitResourceFailure,
    commitObjectStateFailure, missingResourceSubcategory,
    invalidResourceSubcategory, replayDuplicateConflict,
    promotionServiceThrow,
    promotionServiceThrowWithoutSubstage, unknownPromotionFailureCode,
    invalidPromotionSubstage,
  ]);
  for (const rawMarker of [
    "raw-first-promotion-service-marker", "raw-first-promotion-replay-marker",
    "raw-promotion-code-marker", "raw-promotion-substage-marker",
    "raw-resource-subcategory-marker",
    "operational_memory_projection_command_receipts_review_fkey",
    "operational_memory_projection_review_decisions_receipt_fkey",
  ]) assert.equal(promotionDiagnosticJson.includes(rawMarker), false);
  assert.equal(promotionDiagnosticJson.includes("REPOSITORY_COMMAND_FAILED"), false);
  assert.equal(
    /sqlstate|postgres|detail|hint|internalquery|routine|stack|password|credential|oid/i
      .test(promotionDiagnosticJson),
    false,
  );
  assert.equal(isDay149FirstPromotionFailurePayload({
    ...firstTransactionFailure,
    raw_error: "forbidden",
  }), false);

  const probeFailurePayload = createDay149DeferredProbeFailurePayload({
    execution_nonce: "012345abcdef",
    transaction_substage: "deferred_constraint_probe",
    diagnostic: {
      probe_identifier: "RECEIPT_BINDING_TRIGGER_PROBE",
      database_error_class: "RESOURCE_OR_CONNECTION_ERROR",
      resource_connection_subcategory: "OBJECT_NOT_IN_PREREQUISITE_STATE",
      deferred_check_identifier: null,
    },
    cleanup: "PASS",
  });
  assert.equal(probeFailurePayload.repository_failure_code, "transaction_failed");
  assert.equal(probeFailurePayload.probe_identifier,
    "RECEIPT_BINDING_TRIGGER_PROBE");
  assert.equal(probeFailurePayload.transaction_substage,
    "deferred_constraint_probe");
  assert.equal(isDay149DeferredProbeFailurePayload(probeFailurePayload), true);
  assert.deepEqual(Object.keys(probeFailurePayload).sort(), [
    "cleanup", "database_error_class", "deferred_check_identifier",
    "execution_nonce", "failure_class", "probe_identifier",
    "repository_failure_code", "resource_connection_subcategory", "result",
    "schema_version", "stage", "transaction_substage",
  ]);
  const finalCommitProbePayload = createDay149DeferredProbeFailurePayload({
    execution_nonce: "012345abcdef",
    transaction_substage: "transaction_commit",
    diagnostic: finalCommitDiagnostics[0],
    cleanup: "PASS",
  });
  assert.equal(finalCommitProbePayload.probe_identifier,
    "FINAL_COMMIT_AFTER_ALL_PROBES");
  assert.equal(isDay149DeferredProbeFailurePayload(finalCommitProbePayload), true);
  for (const invalidProbeInput of [
    {
      transaction_substage: "transaction_commit",
      diagnostic: {
        ...probeFailurePayload,
        probe_identifier: "RECEIPT_BINDING_TRIGGER_PROBE",
      },
    },
    {
      transaction_substage: "deferred_constraint_probe",
      diagnostic: {
        ...probeFailurePayload,
        probe_identifier: "raw-probe-identifier-marker",
      },
    },
    {
      transaction_substage: "deferred_constraint_probe",
      diagnostic: {
        ...probeFailurePayload,
        resource_connection_subcategory: "raw-probe-subcategory-marker",
      },
    },
  ]) {
    const payload = createDay149DeferredProbeFailurePayload({
      execution_nonce: "012345abcdef",
      ...invalidProbeInput,
      cleanup: "PASS",
    });
    assert.equal(payload.probe_identifier, null);
    assert.equal(payload.repository_failure_code, null);
    assert.equal(payload.transaction_substage, null);
    assert.equal(payload.database_error_class, null);
    assert.equal(payload.resource_connection_subcategory, null);
    assert.equal(payload.deferred_check_identifier, null);
    assert.equal(isDay149DeferredProbeFailurePayload(payload), true);
  }
  const probeDiagnosticJson = JSON.stringify([
    probeFailurePayload, finalCommitProbePayload,
  ]);
  for (const marker of [
    "raw-probe-failure-marker", "raw-final-commit-marker",
    "raw-probe-rollback-marker", "raw-probe-observer-marker",
    "raw-probe-identifier-marker", "raw-probe-subcategory-marker",
    "operational_memory_projection_command_receipts_review_fkey",
    "operational_memory_projection_command_receipt_binding_guard",
    "operational_memory_projection_command_receipt_required",
  ]) assert.equal(probeDiagnosticJson.includes(marker), false);

  for (const predicate of DAY149_VERIFY_PREDICATES) {
    const payload = createDay149VerifyFailurePayload({
      execution_nonce: "012345abcdef",
      error: new Error(`day149_verify_failed:${predicate}`),
      cleanup: "PASS",
    });
    assert.equal(payload.error_kind, "FIXED_PREDICATE");
    assert.equal(payload.predicate, predicate);
    assert.equal(payload.database_error_class, "PLPGSQL_RAISED_ERROR");
    assert.equal(payload.syntax_catalog_subcategory, null);
    assert.equal(payload.schema_version, "farmos.day149.verify-diagnostic.v5");
    assert.equal(isDay149VerifyFailurePayload(payload), true);
  }
  const assertVerifyClassification = (
    error: unknown,
    errorKind: Day149VerifyErrorKind,
    predicate: Day149VerifyPredicate | null,
    databaseErrorClass: Day149DatabaseErrorClass | null,
    syntaxCatalogSubcategory: Day149SyntaxCatalogSubcategory | null = null,
  ) => {
    const payload = createDay149VerifyFailurePayload({
      execution_nonce: "012345abcdef",
      error,
      cleanup: "PASS",
    });
    assert.equal(payload.error_kind, errorKind);
    assert.equal(payload.predicate, predicate);
    assert.equal(payload.database_error_class, databaseErrorClass);
    assert.equal(payload.syntax_catalog_subcategory, syntaxCatalogSubcategory);
    assert.equal(isDay149VerifyFailurePayload(payload), true);
    return payload;
  };
  assertVerifyClassification(
    { message: "ERROR: day149_verify_failed:V001", code: "P0001" },
    "FIXED_PREDICATE", "V001", "PLPGSQL_RAISED_ERROR",
  );
  assertVerifyClassification(
    { message: '"day149_verify_failed:V002"', code: "P0001" },
    "FIXED_PREDICATE", "V002", "PLPGSQL_RAISED_ERROR",
  );
  assertVerifyClassification(
    { message: "day149_verify_failed:V003\n", code: "P0001" },
    "FIXED_PREDICATE", "V003", "PLPGSQL_RAISED_ERROR",
  );
  for (const [field, predicate] of [
    ["detail", "V004"],
    ["hint", "V005"],
    ["where", "V006"],
    ["internalQuery", "V007"],
  ] as const) {
    assertVerifyClassification({
      message: "database verification failed",
      code: "P0001",
      [field]: `context: day149_verify_failed:${predicate}`,
    }, "FIXED_PREDICATE", predicate, "PLPGSQL_RAISED_ERROR");
  }
  assertVerifyClassification({
    message: "outer database error",
    code: "P0001",
    cause: { message: "day149_verify_failed:V008", code: "P0001" },
  }, "FIXED_PREDICATE", "V008", "PLPGSQL_RAISED_ERROR");
  assertVerifyClassification({
    message: "outer database error",
    code: "P0001",
    cause: {
      message: "middle database error",
      code: "P0001",
      cause: { message: "day149_verify_failed:V009", code: "P0001" },
    },
  }, "FIXED_PREDICATE", "V009", "PLPGSQL_RAISED_ERROR");
  assertVerifyClassification({
    message: "outer database error",
    code: "P0001",
    cause: {
      message: "middle database error",
      code: "P0001",
      cause: {
        message: "inner database error",
        code: "P0001",
        cause: { message: "day149_verify_failed:V010", code: "P0001" },
      },
    },
  }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  assertVerifyClassification(
    "generic failure",
    "GENERIC_ERROR", null, null,
  );
  assertVerifyClassification({
    message: "database verification failed",
    code: "P0001",
  }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  const unknownVerifyFailure = assertVerifyClassification({
    message: "day149_verify_failed:V039",
    code: "P0001",
  }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  for (const rejectedToken of ["V000", "V999", "v001"]) {
    assertVerifyClassification({
      message: `day149_verify_failed:${rejectedToken}`,
      code: "P0001",
    }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  }
  assertVerifyClassification({
    message: "day149_verify_failed:V001_SUFFIX",
    code: "P0001",
  }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  const cyclicError: Record<string, unknown> = {
    message: "cyclic database error",
    code: "P0001",
  };
  cyclicError.cause = cyclicError;
  assertVerifyClassification(
    cyclicError,
    "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR",
  );
  assertVerifyClassification({
    message: `${"x".repeat(DAY149_VERIFY_SAFE_FIELD_LENGTH_MAX)}day149_verify_failed:V011`,
    code: "P0001",
  }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  const boundaryToken = "day149_verify_failed:V011";
  assertVerifyClassification({
    message: `${" ".repeat(
      DAY149_VERIFY_SAFE_FIELD_LENGTH_MAX - boundaryToken.length
    )}${boundaryToken}`,
    code: "P0001",
  }, "FIXED_PREDICATE", "V011", "PLPGSQL_RAISED_ERROR");
  assertVerifyClassification({
    message: `${" ".repeat(
      DAY149_VERIFY_SAFE_FIELD_LENGTH_MAX - boundaryToken.length
    )}${boundaryToken}_SUFFIX`,
    code: "P0001",
  }, "DATABASE_ERROR_WITHOUT_PREDICATE", null, "PLPGSQL_RAISED_ERROR");
  assertVerifyClassification({
    message: "database verification failed",
    code: "day149_verify_failed:V012",
    stack: "day149_verify_failed:V013",
    query: "day149_verify_failed:V014",
    credentials: "day149_verify_failed:V015",
  }, "GENERIC_ERROR", null, null);
  for (const [code, expectedClass, expectedSubcategory] of [
    ["42601", "SYNTAX_OR_CATALOG_ERROR", "SYNTAX_ERROR"],
    ["42883", "SYNTAX_OR_CATALOG_ERROR", "UNDEFINED_FUNCTION"],
    ["42P01", "SYNTAX_OR_CATALOG_ERROR", "UNDEFINED_TABLE"],
    ["42703", "SYNTAX_OR_CATALOG_ERROR", "UNDEFINED_COLUMN"],
    ["42704", "SYNTAX_OR_CATALOG_ERROR", "UNDEFINED_OBJECT"],
    ["42710", "SYNTAX_OR_CATALOG_ERROR", "DUPLICATE_OBJECT"],
    ["42804", "SYNTAX_OR_CATALOG_ERROR", "DATATYPE_MISMATCH"],
    ["42725", "SYNTAX_OR_CATALOG_ERROR", "AMBIGUOUS_FUNCTION"],
    ["42P02", "SYNTAX_OR_CATALOG_ERROR", "UNDEFINED_PARAMETER"],
    ["42P18", "SYNTAX_OR_CATALOG_ERROR", "INDETERMINATE_DATATYPE"],
    ["42999", "SYNTAX_OR_CATALOG_ERROR", "OTHER_SYNTAX_OR_CATALOG_ERROR"],
    ["42501", "INSUFFICIENT_PRIVILEGE", null],
    ["22023", "DATA_EXCEPTION", null],
    ["23514", "INTEGRITY_CONSTRAINT_ERROR", null],
    ["25006", "INVALID_TRANSACTION_STATE", null],
    ["40001", "INVALID_TRANSACTION_STATE", null],
    ["53300", "RESOURCE_OR_CONNECTION_ERROR", null],
    ["P0001", "PLPGSQL_RAISED_ERROR", null],
    ["ZZZZZ", "OTHER_DATABASE_ERROR", null],
  ] as const) {
    assertVerifyClassification(
      { message: "database verification failed", code },
      "DATABASE_ERROR_WITHOUT_PREDICATE", null, expectedClass,
      expectedSubcategory,
    );
  }
  const diagnosticV5SyntaxCatalogMappings = [
    ["42602", "INVALID_NAME"],
    ["42622", "NAME_TOO_LONG"],
    ["42701", "DUPLICATE_COLUMN"],
    ["42702", "AMBIGUOUS_COLUMN"],
    ["42712", "DUPLICATE_ALIAS"],
    ["42723", "DUPLICATE_FUNCTION"],
    ["42732", "INVALID_COLUMN_DEFINITION"],
    ["42803", "GROUPING_ERROR"],
    ["42809", "WRONG_OBJECT_TYPE"],
    ["42830", "INVALID_FOREIGN_KEY"],
    ["42846", "CANNOT_COERCE"],
    ["428C9", "GENERATED_ALWAYS"],
    ["42939", "RESERVED_NAME"],
    ["42P03", "DUPLICATE_CURSOR"],
    ["42P04", "DUPLICATE_DATABASE"],
    ["42P05", "DUPLICATE_PREPARED_STATEMENT"],
    ["42P06", "DUPLICATE_SCHEMA"],
    ["42P07", "DUPLICATE_TABLE"],
    ["42P08", "AMBIGUOUS_PARAMETER"],
    ["42P09", "AMBIGUOUS_ALIAS"],
    ["42P10", "INVALID_COLUMN_REFERENCE"],
    ["42P11", "INVALID_CURSOR_DEFINITION"],
    ["42P12", "INVALID_DATABASE_DEFINITION"],
    ["42P13", "INVALID_FUNCTION_DEFINITION"],
    ["42P14", "INVALID_PREPARED_STATEMENT_DEFINITION"],
    ["42P15", "INVALID_SCHEMA_DEFINITION"],
    ["42P16", "INVALID_TABLE_DEFINITION"],
    ["42P17", "INVALID_OBJECT_DEFINITION"],
    ["42P20", "WINDOWING_ERROR"],
    ["42P21", "COLLATION_MISMATCH"],
    ["42P22", "INDETERMINATE_COLLATION"],
  ] as const;
  for (const [code, expectedSubcategory] of
    diagnosticV5SyntaxCatalogMappings) {
    const payload = assertVerifyClassification(
      { message: "database verification failed", code },
      "DATABASE_ERROR_WITHOUT_PREDICATE", null,
      "SYNTAX_OR_CATALOG_ERROR", expectedSubcategory,
    );
    assert.equal(JSON.stringify(payload).includes(code), false);
  }
  const expectedExactSyntaxCatalogMappings = [
    ["42601", "SYNTAX_ERROR"],
    ["42883", "UNDEFINED_FUNCTION"],
    ["42P01", "UNDEFINED_TABLE"],
    ["42703", "UNDEFINED_COLUMN"],
    ["42704", "UNDEFINED_OBJECT"],
    ["42710", "DUPLICATE_OBJECT"],
    ["42804", "DATATYPE_MISMATCH"],
    ["42725", "AMBIGUOUS_FUNCTION"],
    ["42P02", "UNDEFINED_PARAMETER"],
    ["42P18", "INDETERMINATE_DATATYPE"],
    ...diagnosticV5SyntaxCatalogMappings,
  ] as const;
  assert.deepEqual(
    Object.entries(DAY149_SQLSTATE_SYNTAX_CATALOG_SUBCATEGORY_MAPPING)
      .sort(([left], [right]) => left.localeCompare(right)),
    [...expectedExactSyntaxCatalogMappings]
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  assertVerifyClassification(
    { message: "database verification failed" },
    "DATABASE_ERROR_WITHOUT_PREDICATE", null, "OTHER_DATABASE_ERROR",
  );
  for (const malformedCode of ["4260", "42p10", "42P1!", " 42P10"]) {
    assertVerifyClassification(
      { message: "database verification failed", code: malformedCode },
      "GENERIC_ERROR", null, null,
    );
  }
  const nonDisclosure = createDay149VerifyFailurePayload({
    execution_nonce: "012345abcdef",
    error: {
      message: "raw-message-marker",
      code: "42601",
      detail: "raw-detail-marker",
      hint: "raw-hint-marker",
      where: "raw-where-marker",
      internalQuery: "raw-query-marker",
      routine: "raw-routine-marker",
      file: "raw-file-marker",
      line: "raw-line-marker",
      position: "raw-position-marker",
      constraint: "raw-constraint-marker",
      schema: "raw-schema-marker",
      table: "raw-table-marker",
      column: "raw-column-marker",
      stack: "raw-stack-marker",
      credentials: "raw-credentials-marker",
    },
    cleanup: "PASS",
  });
  assert.equal(nonDisclosure.error_kind, "DATABASE_ERROR_WITHOUT_PREDICATE");
  assert.equal(nonDisclosure.predicate, null);
  assert.equal(nonDisclosure.database_error_class, "SYNTAX_OR_CATALOG_ERROR");
  assert.equal(nonDisclosure.syntax_catalog_subcategory, "SYNTAX_ERROR");
  assert.deepEqual(Object.keys(unknownVerifyFailure).sort(), [
    "cleanup", "database_error_class", "error_kind", "execution_nonce",
    "failure_class", "predicate", "result", "schema_version", "stage",
    "syntax_catalog_subcategory",
  ]);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    execution_nonce: "ABCDEF012345",
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    raw_error: "forbidden",
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    error_kind: "FIXED_PREDICATE",
    predicate: null,
    database_error_class: "PLPGSQL_RAISED_ERROR",
    syntax_catalog_subcategory: null,
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    error_kind: "GENERIC_ERROR",
    predicate: "V001",
    database_error_class: null,
    syntax_catalog_subcategory: null,
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    database_error_class: "42601",
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    database_error_class: "SYNTAX_OR_CATALOG_ERROR",
    syntax_catalog_subcategory: null,
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    database_error_class: "INSUFFICIENT_PRIVILEGE",
    syntax_catalog_subcategory: "SYNTAX_ERROR",
  }), false);
  assert.equal(isDay149VerifyFailurePayload({
    ...unknownVerifyFailure,
    syntax_catalog_subcategory: "42601",
  }), false);
  assert.equal(
    /raw-|sqlstate|password|connection_string|postgres:\/\/|stack|query|credential/i
      .test(JSON.stringify(nonDisclosure)),
    false,
  );
  assert.equal(JSON.stringify(nonDisclosure).includes("42601"), false);

  const rejectionCalls: string[] = [];
  const rollbackState = Object.freeze({
    projection_events: 10,
    command_receipts: 4,
    review_decisions: 3,
    candidate_status: "candidate",
    active_count: 1,
  });
  await verifySynchronousWriterRejection({
    snapshot: async () => {
      rejectionCalls.push("snapshot");
      return rollbackState;
    },
    writer: async () => {
      rejectionCalls.push("writer");
      throw new Error("sanitized_fixture_rejection");
    },
    rollback: async () => {
      rejectionCalls.push("rollback");
    },
  });
  assert.deepEqual(rejectionCalls, ["snapshot", "writer", "rollback", "snapshot"]);
  const mismatchCalls: string[] = [];
  await assert.rejects(verifySynchronousWriterRejection({
    snapshot: async () => {
      mismatchCalls.push("snapshot");
      return rollbackState;
    },
    writer: async () => {
      mismatchCalls.push("writer");
    },
    rollback: async () => {
      mismatchCalls.push("rollback");
    },
  }), (error) => error instanceof Day149IsolatedFixedFailure &&
    error.failureClass === "EXPECTED_REJECTION_MISMATCH");
  assert.deepEqual(mismatchCalls, ["snapshot", "writer", "rollback"]);

  const run20SuccessMetadata = createDay149SuccessExecutionMetadata(
    DAY149_RUN_20_EVIDENCE.execution_nonce,
  );
  assert.deepEqual(run20SuccessMetadata, {
    execution_nonce: "065e5d6c1582",
    authoritative_run_count: 20,
    authoritative_run_number: 20,
    retry_number: 14,
  });
  assert.notEqual(
    createDay149SuccessExecutionMetadata("fedcba654321").execution_nonce,
    run20SuccessMetadata.execution_nonce,
  );
  assert.deepEqual(DAY149_RUN_20_HISTORICAL_RAW_SUCCESS_METADATA, {
    authoritative_run_count: 10,
    authoritative_run_number: 10,
    retry_number: 4,
    disposition: "SUPERSEDED_METADATA_ONLY",
  });
  assert.deepEqual(DAY149_RUN_20_EVIDENCE, {
    command:
      "pnpm exec tsx scripts/hermes/test_farm_os_day149_projection_command_boundary.ts --mode=execute-isolated --authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
    execution_count: 1,
    execution_nonce: "065e5d6c1582",
    functional_status: "PASS",
    stage: "complete",
    cleanup: "PASS",
    isolated_rerun_required: false,
  });
  assert.equal(DAY149_EXECUTION_AUTHORITY.consumed, true);
  const successPayloadSourceStart = harnessSource.lastIndexOf(
    "const successExecutionMetadata = createDay149SuccessExecutionMetadata(nonce);",
  );
  const successPayloadSourceEnd = harnessSource.indexOf(
    "} catch (error)",
    successPayloadSourceStart,
  );
  assert.ok(successPayloadSourceStart >= 0 &&
    successPayloadSourceEnd > successPayloadSourceStart);
  const successPayloadSource = harnessSource.slice(
    successPayloadSourceStart,
    successPayloadSourceEnd,
  );
  assert.equal(/authoritative_run_count:\s*10/.test(successPayloadSource), false);
  assert.equal(/authoritative_run_number:\s*10/.test(successPayloadSource), false);
  assert.equal(/retry_number:\s*4/.test(successPayloadSource), false);
  assert.equal(successPayloadSource.includes(
    "execution_nonce: successExecutionMetadata.execution_nonce",
  ), true);
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_1",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_2",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_3",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_4",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_5",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_6",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_7",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_8",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_9",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_10",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_11",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_12",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_13",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_VERIFY_DIAGNOSTIC_1",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_13",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
    "--authority=DAY149_PROJECTION_COMMAND_VERIFY_DIAGNOSTIC_1",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14_SUFFIX",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=PREFIX_DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_14",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_UNKNOWN_DIAGNOSTIC_TOKEN",
  ]));
  assert.throws(() => parseMode([
    "--mode=execute-isolated",
    "--authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION_RETRY_15",
  ]));
}

type DockerInspect = {
  Id?: unknown;
  Image?: unknown;
  Name?: unknown;
  Config?: { Image?: unknown };
  State?: { Running?: unknown };
  Mounts?: unknown;
  HostConfig?: { Tmpfs?: unknown };
  NetworkSettings?: {
    Ports?: Record<string, Array<{ HostIp?: unknown; HostPort?: unknown }> | null>;
  };
};

const DAY149_ISOLATED_STAGES = [
  "docker_context_validation",
  "postgres_image_validation",
  "container_create",
  "container_start",
  "container_inspection",
  "mapped_port_resolution",
  "postgres_readiness",
  "admin_connection",
  "day146_fixture_apply",
  "day147_prepare_apply",
  "day147_prepare_verify",
  "day147_activate_apply",
  "day147_activate_verify",
  "seed_candidate_and_active_data",
  "day149_migration_apply",
  "day149_verify_sql",
  "repository_connection",
  "review_durability",
  "replay_after_reconnect",
  "first_promotion",
  "replacement_promotion",
  "reject_and_replay",
  "rebuild",
  "concurrent_single_winner",
  "cross_candidate_binding_denial",
  "receipt_failure_rollback",
  "event_failure_rollback",
  "writer_shape_denial",
  "direct_insert_denial",
  "acl_denial",
  "cleanup",
  "complete",
] as const;

type Day149IsolatedStage = typeof DAY149_ISOLATED_STAGES[number];

const DAY149_ISOLATED_FAILURE_CLASSES = [
  "ASSERTION_FAILED",
  "DOCKER_COMMAND_FAILED",
  "POSTGRES_READINESS_FAILED",
  "POSTGRES_CONNECTION_FAILED",
  "MIGRATION_APPLY_FAILED",
  "MIGRATION_VERIFY_FAILED",
  "REPOSITORY_COMMAND_FAILED",
  "EXPECTED_REJECTION_MISMATCH",
  "CLEANUP_FAILED",
  "UNKNOWN",
] as const;

type Day149IsolatedFailureClass =
  typeof DAY149_ISOLATED_FAILURE_CLASSES[number];

type Day149IsolatedFailurePayload = Readonly<{
  schema_version: "farmos.day149.isolated-failure.v1";
  result: "FAILED";
  execution_nonce: string;
  stage: Day149IsolatedStage;
  failure_class: Day149IsolatedFailureClass;
  cleanup: "PASS" | "FAILED";
}>;

const DAY149_REVIEW_SUBSTAGES = [
  "review_fixture_construction",
  "review_service_execution",
  "review_result_validation",
  "review_repository_close",
] as const;
type Day149ReviewSubstage = typeof DAY149_REVIEW_SUBSTAGES[number];

const DAY149_REVIEW_FAILURE_ORIGINS = [
  "FIXTURE_ASSERTION",
  "SERVICE_REJECTED",
  "SERVICE_THROW",
  "RESULT_ASSERTION",
  "REPOSITORY_CLOSE_THROW",
  "GENERIC_THROW",
] as const;
type Day149ReviewFailureOrigin = typeof DAY149_REVIEW_FAILURE_ORIGINS[number];

const DAY149_REPOSITORY_FAILURE_CODES = [
  "duplicate_command_conflict",
  "command_receipt_invalid",
  "readback_failed",
  "repository_unavailable",
  "transaction_failed",
  "domain_rejection",
] as const;
type Day149RepositoryFailureCode = typeof DAY149_REPOSITORY_FAILURE_CODES[number];

const DAY149_REVIEW_ASSERTION_CATEGORIES = [
  "FIXTURE_LOOKUP_FAILED",
  "SERVICE_EXPECTED_SUCCESS",
  "REVIEW_DECISION_ID_MISSING",
  "RESULT_PAYLOAD_MISMATCH",
  "REPLAY_EXPECTATION_MISMATCH",
  "UNKNOWN_ASSERTION",
] as const;
type Day149ReviewAssertionCategory =
  typeof DAY149_REVIEW_ASSERTION_CATEGORIES[number];

type Day149ReviewDurabilityFailurePayload = Readonly<{
  schema_version: "farmos.day149.review-durability-diagnostic.v2";
  result: "FAILED";
  execution_nonce: string;
  stage: "review_durability";
  review_substage: Day149ReviewSubstage;
  failure_origin: Day149ReviewFailureOrigin;
  repository_failure_code: Day149RepositoryFailureCode | null;
  assertion_category: Day149ReviewAssertionCategory | null;
  failure_class: "REVIEW_DURABILITY_FAILED";
  cleanup: "PASS" | "FAILED";
}>;

type Day149ReviewDurabilityFailurePayloadV3 = Readonly<{
  schema_version: "farmos.day149.review-durability-diagnostic.v3";
  result: "FAILED";
  execution_nonce: string;
  stage: "review_durability";
  review_substage: Day149ReviewSubstage;
  failure_origin: Day149ReviewFailureOrigin;
  repository_failure_code: Day149RepositoryFailureCode | null;
  transaction_substage: FarmOsProjectionCommandTransactionSubstage | null;
  assertion_category: Day149ReviewAssertionCategory | null;
  failure_class: "REVIEW_DURABILITY_FAILED";
  cleanup: "PASS" | "FAILED";
}>;

const DAY149_FIRST_PROMOTION_SUBSTAGES = [
  "first_service_execution",
  "first_result_validation",
  "replay_service_execution",
  "replay_result_validation",
] as const;
type Day149FirstPromotionSubstage =
  typeof DAY149_FIRST_PROMOTION_SUBSTAGES[number];

const DAY149_FIRST_PROMOTION_FAILURE_ORIGINS = [
  "SERVICE_REJECTED", "SERVICE_THROW", "RESULT_ASSERTION", "GENERIC_THROW",
] as const;
type Day149FirstPromotionFailureOrigin =
  typeof DAY149_FIRST_PROMOTION_FAILURE_ORIGINS[number];

const DAY149_FIRST_PROMOTION_ASSERTION_CATEGORIES = [
  "FIRST_EXECUTION_EXPECTED_SUCCESS",
  "REPLAY_EXECUTION_EXPECTED_SUCCESS",
  "REPLAY_EXPECTED_TRUE",
  "UNKNOWN_ASSERTION",
] as const;
type Day149FirstPromotionAssertionCategory =
  typeof DAY149_FIRST_PROMOTION_ASSERTION_CATEGORIES[number];

const DAY149_RESOURCE_CONNECTION_SUBCATEGORIES = [
  "CONNECTION_EXCEPTION", "INSUFFICIENT_RESOURCES", "PROGRAM_LIMIT_EXCEEDED",
  "LOCK_NOT_AVAILABLE", "OBJECT_NOT_IN_PREREQUISITE_STATE", "OBJECT_IN_USE",
  "CANT_CHANGE_RUNTIME_PARAM", "UNSAFE_NEW_ENUM_VALUE_USAGE",
  "OTHER_OBJECT_STATE_ERROR", "QUERY_CANCELED", "ADMIN_OR_CRASH_SHUTDOWN",
  "SYSTEM_ERROR", "OTHER_RESOURCE_OR_CONNECTION_ERROR",
] as const satisfies readonly FarmOsProjectionCommandResourceConnectionSubcategory[];

type Day149FirstPromotionFailurePayload = Readonly<{
  schema_version: "farmos.day149.first-promotion-diagnostic.v4";
  result: "FAILED";
  execution_nonce: string;
  stage: "first_promotion";
  promotion_substage: Day149FirstPromotionSubstage;
  failure_origin: Day149FirstPromotionFailureOrigin;
  repository_failure_code: Day149RepositoryFailureCode | null;
  transaction_substage: FarmOsProjectionCommandTransactionSubstage | null;
  commit_database_error_class:
    FarmOsProjectionCommandCommitFailureDiagnostic["database_error_class"] | null;
  resource_connection_subcategory:
    FarmOsProjectionCommandResourceConnectionSubcategory | null;
  deferred_check_identifier:
    FarmOsProjectionCommandCommitFailureDiagnostic["deferred_check_identifier"];
  assertion_category: Day149FirstPromotionAssertionCategory | null;
  failure_class: "FIRST_PROMOTION_FAILED";
  cleanup: "PASS" | "FAILED";
}>;

type Day149DeferredProbeFailurePayload = Readonly<{
  schema_version: "farmos.day149.deferred-probe-diagnostic.v1";
  result: "FAILED";
  execution_nonce: string;
  stage: "first_promotion";
  probe_identifier:
    FarmOsProjectionCommandDeferredProbeDiagnostic["probe_identifier"] | null;
  repository_failure_code: "transaction_failed" | null;
  transaction_substage:
    "deferred_constraint_probe" | "transaction_commit" | null;
  database_error_class:
    FarmOsProjectionCommandCommitFailureDiagnostic["database_error_class"] | null;
  resource_connection_subcategory:
    FarmOsProjectionCommandResourceConnectionSubcategory | null;
  deferred_check_identifier:
    FarmOsProjectionCommandCommitFailureDiagnostic["deferred_check_identifier"];
  failure_class: "FIRST_PROMOTION_DEFERRED_PROBE_FAILED";
  cleanup: "PASS" | "FAILED";
}>;

const DAY149_VERIFY_PREDICATES = Object.freeze(Array.from(
  { length: 38 },
  (_, index) => `V${String(index + 1).padStart(3, "0")}`,
));
const DAY149_VERIFY_PREDICATE_SET = new Set(DAY149_VERIFY_PREDICATES);
type Day149VerifyPredicate = string;

const DAY149_VERIFY_ERROR_KINDS = [
  "FIXED_PREDICATE",
  "DATABASE_ERROR_WITHOUT_PREDICATE",
  "GENERIC_ERROR",
] as const;
type Day149VerifyErrorKind = typeof DAY149_VERIFY_ERROR_KINDS[number];

const DAY149_DATABASE_ERROR_CLASSES = [
  "SYNTAX_OR_CATALOG_ERROR",
  "DATA_EXCEPTION",
  "INTEGRITY_CONSTRAINT_ERROR",
  "INVALID_TRANSACTION_STATE",
  "INSUFFICIENT_PRIVILEGE",
  "RESOURCE_OR_CONNECTION_ERROR",
  "PLPGSQL_RAISED_ERROR",
  "OTHER_DATABASE_ERROR",
] as const;
type Day149DatabaseErrorClass = typeof DAY149_DATABASE_ERROR_CLASSES[number];

const DAY149_SYNTAX_CATALOG_SUBCATEGORIES = [
  "SYNTAX_ERROR",
  "UNDEFINED_FUNCTION",
  "UNDEFINED_TABLE",
  "UNDEFINED_COLUMN",
  "UNDEFINED_OBJECT",
  "DUPLICATE_OBJECT",
  "DATATYPE_MISMATCH",
  "AMBIGUOUS_FUNCTION",
  "UNDEFINED_PARAMETER",
  "INDETERMINATE_DATATYPE",
  "INVALID_NAME",
  "NAME_TOO_LONG",
  "DUPLICATE_COLUMN",
  "AMBIGUOUS_COLUMN",
  "DUPLICATE_ALIAS",
  "DUPLICATE_FUNCTION",
  "INVALID_COLUMN_DEFINITION",
  "GROUPING_ERROR",
  "WRONG_OBJECT_TYPE",
  "INVALID_FOREIGN_KEY",
  "CANNOT_COERCE",
  "GENERATED_ALWAYS",
  "RESERVED_NAME",
  "DUPLICATE_CURSOR",
  "DUPLICATE_DATABASE",
  "DUPLICATE_PREPARED_STATEMENT",
  "DUPLICATE_SCHEMA",
  "DUPLICATE_TABLE",
  "AMBIGUOUS_PARAMETER",
  "AMBIGUOUS_ALIAS",
  "INVALID_COLUMN_REFERENCE",
  "INVALID_CURSOR_DEFINITION",
  "INVALID_DATABASE_DEFINITION",
  "INVALID_FUNCTION_DEFINITION",
  "INVALID_PREPARED_STATEMENT_DEFINITION",
  "INVALID_SCHEMA_DEFINITION",
  "INVALID_TABLE_DEFINITION",
  "INVALID_OBJECT_DEFINITION",
  "WINDOWING_ERROR",
  "COLLATION_MISMATCH",
  "INDETERMINATE_COLLATION",
  "OTHER_SYNTAX_OR_CATALOG_ERROR",
] as const;
type Day149SyntaxCatalogSubcategory =
  typeof DAY149_SYNTAX_CATALOG_SUBCATEGORIES[number];

const DAY149_SQLSTATE_SYNTAX_CATALOG_SUBCATEGORY_MAPPING = Object.freeze({
  "42601": "SYNTAX_ERROR",
  "42883": "UNDEFINED_FUNCTION",
  "42P01": "UNDEFINED_TABLE",
  "42703": "UNDEFINED_COLUMN",
  "42704": "UNDEFINED_OBJECT",
  "42710": "DUPLICATE_OBJECT",
  "42804": "DATATYPE_MISMATCH",
  "42725": "AMBIGUOUS_FUNCTION",
  "42P02": "UNDEFINED_PARAMETER",
  "42P18": "INDETERMINATE_DATATYPE",
  "42602": "INVALID_NAME",
  "42622": "NAME_TOO_LONG",
  "42701": "DUPLICATE_COLUMN",
  "42702": "AMBIGUOUS_COLUMN",
  "42712": "DUPLICATE_ALIAS",
  "42723": "DUPLICATE_FUNCTION",
  "42732": "INVALID_COLUMN_DEFINITION",
  "42803": "GROUPING_ERROR",
  "42809": "WRONG_OBJECT_TYPE",
  "42830": "INVALID_FOREIGN_KEY",
  "42846": "CANNOT_COERCE",
  "428C9": "GENERATED_ALWAYS",
  "42939": "RESERVED_NAME",
  "42P03": "DUPLICATE_CURSOR",
  "42P04": "DUPLICATE_DATABASE",
  "42P05": "DUPLICATE_PREPARED_STATEMENT",
  "42P06": "DUPLICATE_SCHEMA",
  "42P07": "DUPLICATE_TABLE",
  "42P08": "AMBIGUOUS_PARAMETER",
  "42P09": "AMBIGUOUS_ALIAS",
  "42P10": "INVALID_COLUMN_REFERENCE",
  "42P11": "INVALID_CURSOR_DEFINITION",
  "42P12": "INVALID_DATABASE_DEFINITION",
  "42P13": "INVALID_FUNCTION_DEFINITION",
  "42P14": "INVALID_PREPARED_STATEMENT_DEFINITION",
  "42P15": "INVALID_SCHEMA_DEFINITION",
  "42P16": "INVALID_TABLE_DEFINITION",
  "42P17": "INVALID_OBJECT_DEFINITION",
  "42P20": "WINDOWING_ERROR",
  "42P21": "COLLATION_MISMATCH",
  "42P22": "INDETERMINATE_COLLATION",
} satisfies Readonly<Record<string, Day149SyntaxCatalogSubcategory>>);

const DAY149_SQLSTATE_CLASS_MAPPING = Object.freeze({
  "08": "RESOURCE_OR_CONNECTION_ERROR",
  "22": "DATA_EXCEPTION",
  "23": "INTEGRITY_CONSTRAINT_ERROR",
  "25": "INVALID_TRANSACTION_STATE",
  "28": "INSUFFICIENT_PRIVILEGE",
  "40": "INVALID_TRANSACTION_STATE",
  "42": "SYNTAX_OR_CATALOG_ERROR",
  "53": "RESOURCE_OR_CONNECTION_ERROR",
  "54": "RESOURCE_OR_CONNECTION_ERROR",
  "55": "RESOURCE_OR_CONNECTION_ERROR",
  "57": "RESOURCE_OR_CONNECTION_ERROR",
  "58": "RESOURCE_OR_CONNECTION_ERROR",
  "P0": "PLPGSQL_RAISED_ERROR",
} satisfies Readonly<Record<string, Day149DatabaseErrorClass>>);

const DAY149_VERIFY_SAFE_FIELDS = [
  "message", "detail", "hint", "where", "internalQuery",
] as const;
const DAY149_VERIFY_SAFE_FIELD_LENGTH_MAX = 4096;
const DAY149_VERIFY_TOKEN_PATTERN =
  /(?<![A-Za-z0-9_])day149_verify_failed:(V\d{3})(?![A-Za-z0-9_])/g;

type Day149VerifyFailurePayload = Readonly<{
  schema_version: "farmos.day149.verify-diagnostic.v5";
  result: "FAILED";
  execution_nonce: string;
  stage: "day149_verify_sql";
  error_kind: Day149VerifyErrorKind;
  predicate: Day149VerifyPredicate | null;
  database_error_class: Day149DatabaseErrorClass | null;
  syntax_catalog_subcategory: Day149SyntaxCatalogSubcategory | null;
  failure_class: "MIGRATION_VERIFY_FAILED";
  cleanup: "PASS" | "FAILED";
}>;

class Day149IsolatedFixedFailure extends Error {
  constructor(readonly failureClass: Day149IsolatedFailureClass) {
    super(failureClass);
    this.name = "Day149IsolatedFixedFailure";
  }
}

class Day149ReviewServiceRejected extends Error {
  readonly repositoryFailureCode: Day149RepositoryFailureCode | null;

  constructor(failureCode: unknown) {
    super("DAY149_REVIEW_SERVICE_REJECTED");
    this.name = "Day149ReviewServiceRejected";
    this.repositoryFailureCode = mapDay149RepositoryFailureCode(failureCode);
  }
}

class Day149ReviewAssertionFailure extends Error {
  constructor(readonly assertionCategory: Day149ReviewAssertionCategory) {
    super("DAY149_REVIEW_ASSERTION_FAILED");
    this.name = "Day149ReviewAssertionFailure";
  }
}

class Day149FirstPromotionServiceRejected extends Error {
  readonly repositoryFailureCode: Day149RepositoryFailureCode | null;

  constructor(failureCode: unknown) {
    super("DAY149_FIRST_PROMOTION_SERVICE_REJECTED");
    this.name = "Day149FirstPromotionServiceRejected";
    this.repositoryFailureCode = mapDay149RepositoryFailureCode(failureCode);
  }
}

class Day149FirstPromotionAssertionFailure extends Error {
  constructor(readonly assertionCategory: Day149FirstPromotionAssertionCategory) {
    super("DAY149_FIRST_PROMOTION_ASSERTION_FAILED");
    this.name = "Day149FirstPromotionAssertionFailure";
  }
}

function mapDay149RepositoryFailureCode(
  failureCode: unknown,
): Day149RepositoryFailureCode | null {
  if (DAY149_REPOSITORY_FAILURE_CODES.slice(0, 5).includes(
    failureCode as typeof DAY149_REPOSITORY_FAILURE_CODES[number],
  )) {
    return failureCode as Day149RepositoryFailureCode;
  }
  return FARM_OS_PROJECTION_COMMAND_FAILURE_CODES.includes(
      failureCode as typeof FARM_OS_PROJECTION_COMMAND_FAILURE_CODES[number]
    )
    ? "domain_rejection"
    : null;
}

function classifyDay149ReviewDurabilityFailure(input: Readonly<{
  review_substage: Day149ReviewSubstage;
  error: unknown;
}>): Readonly<{
  failure_origin: Day149ReviewFailureOrigin;
  repository_failure_code: Day149RepositoryFailureCode | null;
  assertion_category: Day149ReviewAssertionCategory | null;
}> {
  if (input.error instanceof Day149ReviewServiceRejected) {
    return input.error.repositoryFailureCode === null
      ? {
        failure_origin: "GENERIC_THROW",
        repository_failure_code: null,
        assertion_category: null,
      }
      : {
        failure_origin: "SERVICE_REJECTED",
        repository_failure_code: input.error.repositoryFailureCode,
        assertion_category: null,
      };
  }
  if (input.error instanceof Day149ReviewAssertionFailure) {
    return {
      failure_origin: "RESULT_ASSERTION",
      repository_failure_code: null,
      assertion_category: input.error.assertionCategory,
    };
  }
  if (input.review_substage === "review_fixture_construction" &&
    input.error instanceof AssertionError) {
    return {
      failure_origin: "FIXTURE_ASSERTION",
      repository_failure_code: null,
      assertion_category: "FIXTURE_LOOKUP_FAILED",
    };
  }
  if (input.review_substage === "review_service_execution") {
    return {
      failure_origin: "SERVICE_THROW",
      repository_failure_code: null,
      assertion_category: null,
    };
  }
  if (input.review_substage === "review_result_validation" &&
    input.error instanceof AssertionError) {
    return {
      failure_origin: "RESULT_ASSERTION",
      repository_failure_code: null,
      assertion_category: "UNKNOWN_ASSERTION",
    };
  }
  if (input.review_substage === "review_repository_close") {
    return {
      failure_origin: "REPOSITORY_CLOSE_THROW",
      repository_failure_code: null,
      assertion_category: null,
    };
  }
  return {
    failure_origin: "GENERIC_THROW",
    repository_failure_code: null,
    assertion_category: null,
  };
}

function createDay149ReviewDurabilityFailurePayload(input: Readonly<{
  execution_nonce: string;
  review_substage: Day149ReviewSubstage;
  error: unknown;
  cleanup: "PASS" | "FAILED";
}>): Day149ReviewDurabilityFailurePayload {
  const classification = classifyDay149ReviewDurabilityFailure(input);
  return Object.freeze({
    schema_version: "farmos.day149.review-durability-diagnostic.v2",
    result: "FAILED",
    execution_nonce: input.execution_nonce,
    stage: "review_durability",
    review_substage: input.review_substage,
    failure_origin: classification.failure_origin,
    repository_failure_code: classification.repository_failure_code,
    assertion_category: classification.assertion_category,
    failure_class: "REVIEW_DURABILITY_FAILED",
    cleanup: input.cleanup,
  });
}

function isDay149ReviewDurabilityFailurePayload(
  value: unknown,
): value is Day149ReviewDurabilityFailurePayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 10 || !Object.keys(row).every((key) => [
    "schema_version", "result", "execution_nonce", "stage", "review_substage",
    "failure_origin", "repository_failure_code", "assertion_category",
    "failure_class", "cleanup",
  ].includes(key)) ||
    row.schema_version !== "farmos.day149.review-durability-diagnostic.v2" ||
    row.result !== "FAILED" || typeof row.execution_nonce !== "string" ||
    !/^[a-f0-9]{12}$/.test(row.execution_nonce) || row.stage !== "review_durability" ||
    !DAY149_REVIEW_SUBSTAGES.includes(row.review_substage as Day149ReviewSubstage) ||
    !DAY149_REVIEW_FAILURE_ORIGINS.includes(
      row.failure_origin as Day149ReviewFailureOrigin,
    ) || !(row.repository_failure_code === null ||
      DAY149_REPOSITORY_FAILURE_CODES.includes(
        row.repository_failure_code as Day149RepositoryFailureCode,
      )) || !(row.assertion_category === null ||
      DAY149_REVIEW_ASSERTION_CATEGORIES.includes(
        row.assertion_category as Day149ReviewAssertionCategory,
      )) || row.failure_class !== "REVIEW_DURABILITY_FAILED" ||
    (row.cleanup !== "PASS" && row.cleanup !== "FAILED")) return false;

  return (row.failure_origin === "SERVICE_REJECTED"
      ? row.review_substage === "review_service_execution" &&
        row.repository_failure_code !== null && row.assertion_category === null
      : row.failure_origin === "FIXTURE_ASSERTION"
      ? row.review_substage === "review_fixture_construction" &&
        row.repository_failure_code === null &&
        row.assertion_category === "FIXTURE_LOOKUP_FAILED"
      : row.failure_origin === "RESULT_ASSERTION"
      ? row.review_substage === "review_result_validation" &&
        row.repository_failure_code === null && row.assertion_category !== null
      : row.failure_origin === "REPOSITORY_CLOSE_THROW"
      ? row.review_substage === "review_repository_close" &&
        row.repository_failure_code === null && row.assertion_category === null
      : row.failure_origin === "SERVICE_THROW"
      ? row.review_substage === "review_service_execution" &&
        row.repository_failure_code === null && row.assertion_category === null
      : row.repository_failure_code === null && row.assertion_category === null);
}

function createDay149TransactionObserverState(): Readonly<{
  observer: FarmOsProjectionCommandTransactionObserver;
  transactionFailureSubstage():
    FarmOsProjectionCommandTransactionSubstage | null;
  serviceThrowSubstage(): FarmOsProjectionCommandTransactionSubstage | null;
}> {
  let latest: FarmOsProjectionCommandTransactionSubstage | null = null;
  let originalFailure: FarmOsProjectionCommandTransactionSubstage | null = null;
  let beforeClientRelease: FarmOsProjectionCommandTransactionSubstage | null = null;
  const observer: FarmOsProjectionCommandTransactionObserver = (substage) => {
    if (substage === "pool_connect") {
      latest = substage;
      originalFailure = null;
      beforeClientRelease = null;
      return;
    }
    if (substage === "transaction_rollback") {
      originalFailure ??= latest;
      latest = substage;
      return;
    }
    if (substage === "client_release") {
      beforeClientRelease = latest;
      latest = substage;
      return;
    }
    latest = substage;
  };
  return Object.freeze({
    observer,
    transactionFailureSubstage: () => originalFailure ?? beforeClientRelease ??
      (latest === "client_release" ? null : latest),
    serviceThrowSubstage: () => latest === "client_release"
      ? "client_release"
      : null,
  });
}

function createDay149CommitFailureObserverState(): Readonly<{
  observer: FarmOsProjectionCommandCommitFailureObserver;
  reset(): void;
  latest(): FarmOsProjectionCommandCommitFailureDiagnostic | null;
}> {
  let latest: FarmOsProjectionCommandCommitFailureDiagnostic | null = null;
  return Object.freeze({
    observer: (diagnostic) => {
      latest = diagnostic;
    },
    reset: () => {
      latest = null;
    },
    latest: () => latest,
  });
}

function createDay149DeferredProbeObserverState(): Readonly<{
  observer: FarmOsProjectionCommandDeferredProbeObserver;
  reset(): void;
  latest(): FarmOsProjectionCommandDeferredProbeDiagnostic | null;
}> {
  let latest: FarmOsProjectionCommandDeferredProbeDiagnostic | null = null;
  return Object.freeze({
    observer: (diagnostic) => {
      latest = diagnostic;
    },
    reset: () => {
      latest = null;
    },
    latest: () => latest,
  });
}

function sanitizeDay149TransactionSubstage(
  value: unknown,
): FarmOsProjectionCommandTransactionSubstage | null {
  return FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES.includes(
      value as FarmOsProjectionCommandTransactionSubstage
    )
    ? value as FarmOsProjectionCommandTransactionSubstage
    : null;
}

function createDay149ReviewDurabilityFailurePayloadV3(input: Readonly<{
  execution_nonce: string;
  review_substage: Day149ReviewSubstage;
  error: unknown;
  transaction_substage: unknown;
  cleanup: "PASS" | "FAILED";
}>): Day149ReviewDurabilityFailurePayloadV3 {
  const classification = classifyDay149ReviewDurabilityFailure(input);
  const sanitizedSubstage = sanitizeDay149TransactionSubstage(
    input.transaction_substage,
  );
  const invalidTransactionObservation =
    classification.failure_origin === "SERVICE_REJECTED" &&
    classification.repository_failure_code === "transaction_failed" &&
    sanitizedSubstage === null;
  const failureOrigin = invalidTransactionObservation
    ? "GENERIC_THROW" as const
    : classification.failure_origin;
  const repositoryFailureCode = invalidTransactionObservation
    ? null
    : classification.repository_failure_code;
  const transactionSubstage = failureOrigin === "SERVICE_REJECTED" &&
      repositoryFailureCode === "transaction_failed"
    ? sanitizedSubstage
    : failureOrigin === "SERVICE_THROW" && sanitizedSubstage === "client_release"
    ? sanitizedSubstage
    : null;
  return Object.freeze({
    schema_version: "farmos.day149.review-durability-diagnostic.v3",
    result: "FAILED",
    execution_nonce: input.execution_nonce,
    stage: "review_durability",
    review_substage: input.review_substage,
    failure_origin: failureOrigin,
    repository_failure_code: repositoryFailureCode,
    transaction_substage: transactionSubstage,
    assertion_category: invalidTransactionObservation
      ? null
      : classification.assertion_category,
    failure_class: "REVIEW_DURABILITY_FAILED",
    cleanup: input.cleanup,
  });
}

function isDay149ReviewDurabilityFailurePayloadV3(
  value: unknown,
): value is Day149ReviewDurabilityFailurePayloadV3 {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 11 || !Object.keys(row).every((key) => [
    "schema_version", "result", "execution_nonce", "stage", "review_substage",
    "failure_origin", "repository_failure_code", "transaction_substage",
    "assertion_category", "failure_class", "cleanup",
  ].includes(key)) ||
    row.schema_version !== "farmos.day149.review-durability-diagnostic.v3" ||
    row.result !== "FAILED" || typeof row.execution_nonce !== "string" ||
    !/^[a-f0-9]{12}$/.test(row.execution_nonce) || row.stage !== "review_durability" ||
    !DAY149_REVIEW_SUBSTAGES.includes(row.review_substage as Day149ReviewSubstage) ||
    !DAY149_REVIEW_FAILURE_ORIGINS.includes(
      row.failure_origin as Day149ReviewFailureOrigin,
    ) || !(row.repository_failure_code === null ||
      DAY149_REPOSITORY_FAILURE_CODES.includes(
        row.repository_failure_code as Day149RepositoryFailureCode,
      )) || !(row.transaction_substage === null ||
      FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES.includes(
        row.transaction_substage as FarmOsProjectionCommandTransactionSubstage,
      )) || !(row.assertion_category === null ||
      DAY149_REVIEW_ASSERTION_CATEGORIES.includes(
        row.assertion_category as Day149ReviewAssertionCategory,
      )) || row.failure_class !== "REVIEW_DURABILITY_FAILED" ||
    (row.cleanup !== "PASS" && row.cleanup !== "FAILED")) return false;

  return row.failure_origin === "SERVICE_REJECTED"
    ? row.review_substage === "review_service_execution" &&
      row.repository_failure_code !== null && row.assertion_category === null &&
      (row.repository_failure_code === "transaction_failed"
        ? row.transaction_substage !== null
        : row.transaction_substage === null)
    : row.failure_origin === "SERVICE_THROW"
    ? row.review_substage === "review_service_execution" &&
      row.repository_failure_code === null && row.assertion_category === null &&
      (row.transaction_substage === null ||
        row.transaction_substage === "client_release")
    : row.failure_origin === "FIXTURE_ASSERTION"
    ? row.review_substage === "review_fixture_construction" &&
      row.repository_failure_code === null && row.transaction_substage === null &&
      row.assertion_category === "FIXTURE_LOOKUP_FAILED"
    : row.failure_origin === "RESULT_ASSERTION"
    ? row.review_substage === "review_result_validation" &&
      row.repository_failure_code === null && row.transaction_substage === null &&
      row.assertion_category !== null
    : row.failure_origin === "REPOSITORY_CLOSE_THROW"
    ? row.review_substage === "review_repository_close" &&
      row.repository_failure_code === null && row.transaction_substage === null &&
      row.assertion_category === null
    : row.repository_failure_code === null && row.transaction_substage === null &&
      row.assertion_category === null;
}

function classifyDay149FirstPromotionFailure(input: Readonly<{
  promotion_substage: Day149FirstPromotionSubstage;
  error: unknown;
}>): Readonly<{
  failure_origin: Day149FirstPromotionFailureOrigin;
  repository_failure_code: Day149RepositoryFailureCode | null;
  assertion_category: Day149FirstPromotionAssertionCategory | null;
}> {
  if (input.error instanceof Day149FirstPromotionServiceRejected) {
    return input.error.repositoryFailureCode === null
      ? {
        failure_origin: "GENERIC_THROW",
        repository_failure_code: null,
        assertion_category: null,
      }
      : {
        failure_origin: "SERVICE_REJECTED",
        repository_failure_code: input.error.repositoryFailureCode,
        assertion_category: null,
      };
  }
  if (input.error instanceof Day149FirstPromotionAssertionFailure) {
    return {
      failure_origin: "RESULT_ASSERTION",
      repository_failure_code: null,
      assertion_category: input.error.assertionCategory,
    };
  }
  if (input.promotion_substage === "first_service_execution" ||
    input.promotion_substage === "replay_service_execution") {
    return {
      failure_origin: "SERVICE_THROW",
      repository_failure_code: null,
      assertion_category: null,
    };
  }
  if (input.error instanceof AssertionError) {
    return {
      failure_origin: "RESULT_ASSERTION",
      repository_failure_code: null,
      assertion_category: "UNKNOWN_ASSERTION",
    };
  }
  return {
    failure_origin: "GENERIC_THROW",
    repository_failure_code: null,
    assertion_category: null,
  };
}

function createDay149FirstPromotionFailurePayload(input: Readonly<{
  execution_nonce: string;
  promotion_substage: Day149FirstPromotionSubstage;
  error: unknown;
  transaction_substage: unknown;
  commit_failure_diagnostic?: FarmOsProjectionCommandCommitFailureDiagnostic | null;
  cleanup: "PASS" | "FAILED";
}>): Day149FirstPromotionFailurePayload {
  const classification = classifyDay149FirstPromotionFailure(input);
  const sanitizedSubstage = sanitizeDay149TransactionSubstage(
    input.transaction_substage,
  );
  const invalidTransactionObservation =
    classification.failure_origin === "SERVICE_REJECTED" &&
    classification.repository_failure_code === "transaction_failed" &&
    (sanitizedSubstage === null ||
      (sanitizedSubstage === "transaction_commit" &&
        input.commit_failure_diagnostic == null));
  const commitDiagnostic = sanitizedSubstage === "transaction_commit"
    ? input.commit_failure_diagnostic ?? null
    : null;
  const invalidResourceDiagnostic = commitDiagnostic !== null &&
    ((commitDiagnostic.database_error_class === "RESOURCE_OR_CONNECTION_ERROR" &&
      (commitDiagnostic.resource_connection_subcategory === null ||
        !DAY149_RESOURCE_CONNECTION_SUBCATEGORIES.includes(
          commitDiagnostic.resource_connection_subcategory,
        ))) ||
      (commitDiagnostic.database_error_class !== "RESOURCE_OR_CONNECTION_ERROR" &&
        commitDiagnostic.resource_connection_subcategory !== null));
  const invalidDiagnosticObservation = invalidTransactionObservation ||
    invalidResourceDiagnostic;
  const failureOrigin = invalidDiagnosticObservation
    ? "GENERIC_THROW" as const
    : classification.failure_origin;
  const repositoryFailureCode = invalidDiagnosticObservation
    ? null
    : classification.repository_failure_code;
  const transactionSubstage = failureOrigin === "SERVICE_REJECTED" &&
      repositoryFailureCode === "transaction_failed"
    ? sanitizedSubstage
    : failureOrigin === "SERVICE_THROW" && sanitizedSubstage === "client_release"
    ? sanitizedSubstage
    : null;
  const commitFailureDiagnostic = failureOrigin === "SERVICE_REJECTED" &&
      repositoryFailureCode === "transaction_failed" &&
      transactionSubstage === "transaction_commit"
    ? input.commit_failure_diagnostic ?? null
    : null;
  return Object.freeze({
    schema_version: "farmos.day149.first-promotion-diagnostic.v4",
    result: "FAILED",
    execution_nonce: input.execution_nonce,
    stage: "first_promotion",
    promotion_substage: input.promotion_substage,
    failure_origin: failureOrigin,
    repository_failure_code: repositoryFailureCode,
    transaction_substage: transactionSubstage,
    commit_database_error_class:
      commitFailureDiagnostic?.database_error_class ?? null,
    resource_connection_subcategory:
      commitFailureDiagnostic?.resource_connection_subcategory ?? null,
    deferred_check_identifier:
      commitFailureDiagnostic?.deferred_check_identifier ?? null,
    assertion_category: invalidDiagnosticObservation
      ? null
      : classification.assertion_category,
    failure_class: "FIRST_PROMOTION_FAILED",
    cleanup: input.cleanup,
  });
}

function isDay149FirstPromotionFailurePayload(
  value: unknown,
): value is Day149FirstPromotionFailurePayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 14 || !Object.keys(row).every((key) => [
    "schema_version", "result", "execution_nonce", "stage", "promotion_substage",
    "failure_origin", "repository_failure_code", "transaction_substage",
    "commit_database_error_class", "resource_connection_subcategory",
    "deferred_check_identifier",
    "assertion_category", "failure_class", "cleanup",
  ].includes(key)) ||
    row.schema_version !== "farmos.day149.first-promotion-diagnostic.v4" ||
    row.result !== "FAILED" || typeof row.execution_nonce !== "string" ||
    !/^[a-f0-9]{12}$/.test(row.execution_nonce) || row.stage !== "first_promotion" ||
    !DAY149_FIRST_PROMOTION_SUBSTAGES.includes(
      row.promotion_substage as Day149FirstPromotionSubstage,
    ) || !DAY149_FIRST_PROMOTION_FAILURE_ORIGINS.includes(
      row.failure_origin as Day149FirstPromotionFailureOrigin,
    ) || !(row.repository_failure_code === null ||
      DAY149_REPOSITORY_FAILURE_CODES.includes(
        row.repository_failure_code as Day149RepositoryFailureCode,
      )) || !(row.transaction_substage === null ||
      FARM_OS_PROJECTION_COMMAND_TRANSACTION_SUBSTAGES.includes(
        row.transaction_substage as FarmOsProjectionCommandTransactionSubstage,
      )) || !(row.commit_database_error_class === null || [
        "INTEGRITY_CONSTRAINT_ERROR", "PLPGSQL_RAISED_ERROR",
        "SYNTAX_OR_CATALOG_ERROR", "INVALID_TRANSACTION_STATE",
        "RESOURCE_OR_CONNECTION_ERROR", "OTHER_DATABASE_ERROR",
      ].includes(row.commit_database_error_class as string)) ||
    !(row.resource_connection_subcategory === null ||
      DAY149_RESOURCE_CONNECTION_SUBCATEGORIES.includes(
        row.resource_connection_subcategory as
          FarmOsProjectionCommandResourceConnectionSubcategory,
      )) ||
    !(row.deferred_check_identifier === null || [
      "RECEIPT_REVIEW_FK", "REVIEW_RECEIPT_FK", "RECEIPT_BINDING_TRIGGER",
      "EVENT_RECEIPT_REQUIRED_TRIGGER", "OTHER_INTEGRITY_CONSTRAINT",
    ].includes(row.deferred_check_identifier as string)) ||
    !(row.assertion_category === null ||
      DAY149_FIRST_PROMOTION_ASSERTION_CATEGORIES.includes(
        row.assertion_category as Day149FirstPromotionAssertionCategory,
      )) || row.failure_class !== "FIRST_PROMOTION_FAILED" ||
    (row.cleanup !== "PASS" && row.cleanup !== "FAILED")) return false;

  const serviceSubstage = row.promotion_substage === "first_service_execution" ||
    row.promotion_substage === "replay_service_execution";
  const resultSubstage = row.promotion_substage === "first_result_validation" ||
    row.promotion_substage === "replay_result_validation";
  const deferredIdentityAllowed = row.commit_database_error_class ===
      "INTEGRITY_CONSTRAINT_ERROR" ||
    row.commit_database_error_class === "PLPGSQL_RAISED_ERROR" ||
    row.deferred_check_identifier === null;
  if (!deferredIdentityAllowed) return false;
  const resourceSubcategoryAllowed = row.commit_database_error_class ===
      "RESOURCE_OR_CONNECTION_ERROR"
    ? row.resource_connection_subcategory !== null
    : row.resource_connection_subcategory === null;
  if (!resourceSubcategoryAllowed) return false;
  return row.failure_origin === "SERVICE_REJECTED"
    ? serviceSubstage && row.repository_failure_code !== null &&
      row.assertion_category === null &&
      (row.repository_failure_code === "transaction_failed"
        ? row.transaction_substage !== null &&
          (row.transaction_substage === "transaction_commit"
            ? row.commit_database_error_class !== null
            : row.commit_database_error_class === null &&
              row.resource_connection_subcategory === null &&
              row.deferred_check_identifier === null)
        : row.transaction_substage === null &&
          row.commit_database_error_class === null &&
          row.resource_connection_subcategory === null &&
          row.deferred_check_identifier === null)
    : row.failure_origin === "SERVICE_THROW"
    ? serviceSubstage && row.repository_failure_code === null &&
      row.assertion_category === null &&
      (row.transaction_substage === null || row.transaction_substage === "client_release") &&
      row.commit_database_error_class === null &&
      row.resource_connection_subcategory === null &&
      row.deferred_check_identifier === null
    : row.failure_origin === "RESULT_ASSERTION"
    ? resultSubstage && row.repository_failure_code === null &&
      row.transaction_substage === null && row.assertion_category !== null &&
      row.commit_database_error_class === null &&
      row.resource_connection_subcategory === null &&
      row.deferred_check_identifier === null &&
      (row.promotion_substage === "first_result_validation"
        ? row.assertion_category === "FIRST_EXECUTION_EXPECTED_SUCCESS" ||
          row.assertion_category === "UNKNOWN_ASSERTION"
        : row.assertion_category === "REPLAY_EXECUTION_EXPECTED_SUCCESS" ||
          row.assertion_category === "REPLAY_EXPECTED_TRUE" ||
          row.assertion_category === "UNKNOWN_ASSERTION")
    : row.repository_failure_code === null && row.transaction_substage === null &&
      row.commit_database_error_class === null &&
      row.resource_connection_subcategory === null &&
      row.deferred_check_identifier === null &&
      row.assertion_category === null;
}

function createDay149DeferredProbeFailurePayload(input: Readonly<{
  execution_nonce: string;
  transaction_substage: unknown;
  diagnostic: unknown;
  cleanup: "PASS" | "FAILED";
}>): Day149DeferredProbeFailurePayload {
  const diagnostic = typeof input.diagnostic === "object" &&
      input.diagnostic !== null && !Array.isArray(input.diagnostic)
    ? input.diagnostic as Record<string, unknown>
    : null;
  const probeIdentifier = diagnostic !== null &&
      FARM_OS_PROJECTION_COMMAND_DEFERRED_PROBE_IDENTIFIERS.includes(
        diagnostic.probe_identifier as
          FarmOsProjectionCommandDeferredProbeDiagnostic["probe_identifier"],
      )
    ? diagnostic.probe_identifier as
      FarmOsProjectionCommandDeferredProbeDiagnostic["probe_identifier"]
    : null;
  const transactionSubstage = input.transaction_substage ===
      "deferred_constraint_probe" || input.transaction_substage === "transaction_commit"
    ? input.transaction_substage
    : null;
  const databaseErrorClass = diagnostic !== null && [
      "INTEGRITY_CONSTRAINT_ERROR", "PLPGSQL_RAISED_ERROR",
      "SYNTAX_OR_CATALOG_ERROR", "INVALID_TRANSACTION_STATE",
      "RESOURCE_OR_CONNECTION_ERROR", "OTHER_DATABASE_ERROR",
    ].includes(diagnostic.database_error_class as string)
    ? diagnostic.database_error_class as
      FarmOsProjectionCommandCommitFailureDiagnostic["database_error_class"]
    : null;
  const resourceSubcategory = diagnostic?.resource_connection_subcategory === null
    ? null
    : DAY149_RESOURCE_CONNECTION_SUBCATEGORIES.includes(
        diagnostic?.resource_connection_subcategory as
          FarmOsProjectionCommandResourceConnectionSubcategory,
      )
    ? diagnostic?.resource_connection_subcategory as
      FarmOsProjectionCommandResourceConnectionSubcategory
    : undefined;
  const deferredIdentifier = diagnostic?.deferred_check_identifier === null
    ? null
    : [
        "RECEIPT_REVIEW_FK", "REVIEW_RECEIPT_FK", "RECEIPT_BINDING_TRIGGER",
        "EVENT_RECEIPT_REQUIRED_TRIGGER", "OTHER_INTEGRITY_CONSTRAINT",
      ].includes(diagnostic?.deferred_check_identifier as string)
    ? diagnostic?.deferred_check_identifier as
      FarmOsProjectionCommandCommitFailureDiagnostic["deferred_check_identifier"]
    : undefined;
  const probeMatchesSubstage = probeIdentifier === "FINAL_COMMIT_AFTER_ALL_PROBES"
    ? transactionSubstage === "transaction_commit"
    : probeIdentifier !== null && transactionSubstage === "deferred_constraint_probe";
  const resourceConsistent = databaseErrorClass === "RESOURCE_OR_CONNECTION_ERROR"
    ? resourceSubcategory !== null && resourceSubcategory !== undefined
    : resourceSubcategory === null;
  const deferredConsistent = databaseErrorClass === "INTEGRITY_CONSTRAINT_ERROR" ||
      databaseErrorClass === "PLPGSQL_RAISED_ERROR"
    ? deferredIdentifier !== undefined
    : deferredIdentifier === null;
  const valid = probeIdentifier !== null && transactionSubstage !== null &&
    databaseErrorClass !== null && probeMatchesSubstage && resourceConsistent &&
    deferredConsistent;
  return Object.freeze({
    schema_version: "farmos.day149.deferred-probe-diagnostic.v1",
    result: "FAILED",
    execution_nonce: input.execution_nonce,
    stage: "first_promotion",
    probe_identifier: valid ? probeIdentifier : null,
    repository_failure_code: valid ? "transaction_failed" : null,
    transaction_substage: valid ? transactionSubstage : null,
    database_error_class: valid ? databaseErrorClass : null,
    resource_connection_subcategory: valid ? resourceSubcategory ?? null : null,
    deferred_check_identifier: valid ? deferredIdentifier ?? null : null,
    failure_class: "FIRST_PROMOTION_DEFERRED_PROBE_FAILED",
    cleanup: input.cleanup,
  });
}

function isDay149DeferredProbeFailurePayload(
  value: unknown,
): value is Day149DeferredProbeFailurePayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== 12 || !Object.keys(row).every((key) => [
    "schema_version", "result", "execution_nonce", "stage", "probe_identifier",
    "repository_failure_code", "transaction_substage", "database_error_class",
    "resource_connection_subcategory", "deferred_check_identifier",
    "failure_class", "cleanup",
  ].includes(key)) ||
    row.schema_version !== "farmos.day149.deferred-probe-diagnostic.v1" ||
    row.result !== "FAILED" || typeof row.execution_nonce !== "string" ||
    !/^[a-f0-9]{12}$/.test(row.execution_nonce) || row.stage !== "first_promotion" ||
    row.failure_class !== "FIRST_PROMOTION_DEFERRED_PROBE_FAILED" ||
    (row.cleanup !== "PASS" && row.cleanup !== "FAILED")) return false;
  if (row.probe_identifier === null) {
    return row.repository_failure_code === null && row.transaction_substage === null &&
      row.database_error_class === null &&
      row.resource_connection_subcategory === null &&
      row.deferred_check_identifier === null;
  }
  return FARM_OS_PROJECTION_COMMAND_DEFERRED_PROBE_IDENTIFIERS.includes(
      row.probe_identifier as
        FarmOsProjectionCommandDeferredProbeDiagnostic["probe_identifier"],
    ) && row.repository_failure_code === "transaction_failed" &&
    (row.probe_identifier === "FINAL_COMMIT_AFTER_ALL_PROBES"
      ? row.transaction_substage === "transaction_commit"
      : row.transaction_substage === "deferred_constraint_probe") &&
    row.database_error_class !== null &&
    createDay149DeferredProbeFailurePayload({
      execution_nonce: row.execution_nonce as string,
      transaction_substage: row.transaction_substage,
      diagnostic: {
        probe_identifier: row.probe_identifier,
        database_error_class: row.database_error_class,
        resource_connection_subcategory: row.resource_connection_subcategory,
        deferred_check_identifier: row.deferred_check_identifier,
      },
      cleanup: row.cleanup as "PASS" | "FAILED",
    }).probe_identifier !== null;
}

function createDay149IsolatedFailurePayload(input: Readonly<{
  execution_nonce: string;
  stage: Day149IsolatedStage;
  failure_class: Day149IsolatedFailureClass;
  cleanup: "PASS" | "FAILED";
}>): Day149IsolatedFailurePayload {
  return Object.freeze({
    schema_version: "farmos.day149.isolated-failure.v1",
    result: "FAILED",
    execution_nonce: input.execution_nonce,
    stage: input.stage,
    failure_class: input.failure_class,
    cleanup: input.cleanup,
  });
}

function isDay149IsolatedFailurePayload(
  value: unknown,
): value is Day149IsolatedFailurePayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return Object.keys(row).length === 6 &&
    Object.keys(row).every((key) => [
      "schema_version", "result", "execution_nonce", "stage",
      "failure_class", "cleanup",
    ].includes(key)) &&
    row.schema_version === "farmos.day149.isolated-failure.v1" &&
    row.result === "FAILED" &&
    typeof row.execution_nonce === "string" &&
    /^[a-f0-9]{12}$/.test(row.execution_nonce) &&
    DAY149_ISOLATED_STAGES.includes(row.stage as Day149IsolatedStage) &&
    DAY149_ISOLATED_FAILURE_CLASSES.includes(
      row.failure_class as Day149IsolatedFailureClass,
    ) &&
    (row.cleanup === "PASS" || row.cleanup === "FAILED");
}

function readDay149VerifyProperty(
  value: object,
  field: string,
): unknown {
  try {
    return (value as Record<string, unknown>)[field];
  } catch {
    return undefined;
  }
}

function classifyDay149DatabaseErrorStructure(value: unknown): Readonly<{
  database_error_class: Day149DatabaseErrorClass;
  syntax_catalog_subcategory: Day149SyntaxCatalogSubcategory | null;
}> | null {
  if (typeof value !== "object" || value === null) return null;
  const message = readDay149VerifyProperty(value, "message");
  const code = readDay149VerifyProperty(value, "code");
  if (typeof message !== "string" ||
    (code !== undefined && (typeof code !== "string" || code.length !== 5))) {
    return null;
  }
  if (code === undefined) return Object.freeze({
    database_error_class: "OTHER_DATABASE_ERROR",
    syntax_catalog_subcategory: null,
  });
  if (!/^[0-9A-Z]{5}$/.test(code)) return null;
  if (code === "42501") return Object.freeze({
    database_error_class: "INSUFFICIENT_PRIVILEGE",
    syntax_catalog_subcategory: null,
  });
  const databaseErrorClass = DAY149_SQLSTATE_CLASS_MAPPING[
    code.slice(0, 2) as keyof typeof DAY149_SQLSTATE_CLASS_MAPPING
  ] ?? "OTHER_DATABASE_ERROR";
  return Object.freeze({
    database_error_class: databaseErrorClass,
    syntax_catalog_subcategory: databaseErrorClass === "SYNTAX_OR_CATALOG_ERROR"
      ? DAY149_SQLSTATE_SYNTAX_CATALOG_SUBCATEGORY_MAPPING[
        code as keyof typeof DAY149_SQLSTATE_SYNTAX_CATALOG_SUBCATEGORY_MAPPING
      ] ?? "OTHER_SYNTAX_OR_CATALOG_ERROR"
      : null,
  });
}

function extractDay149VerifyToken(fieldValue: string):
  Day149VerifyPredicate | null {
  if (fieldValue.length > DAY149_VERIFY_SAFE_FIELD_LENGTH_MAX) return null;
  DAY149_VERIFY_TOKEN_PATTERN.lastIndex = 0;
  for (const match of fieldValue.matchAll(DAY149_VERIFY_TOKEN_PATTERN)) {
    const predicate = match[1];
    if (predicate !== undefined && DAY149_VERIFY_PREDICATE_SET.has(predicate)) {
      return predicate;
    }
  }
  return null;
}

function classifyDay149VerifyError(error: unknown): Readonly<{
  error_kind: Day149VerifyErrorKind;
  predicate: Day149VerifyPredicate | null;
  database_error_class: Day149DatabaseErrorClass | null;
  syntax_catalog_subcategory: Day149SyntaxCatalogSubcategory | null;
}> {
  let current: unknown = error;
  let databaseError: ReturnType<typeof classifyDay149DatabaseErrorStructure> = null;
  const visited = new Set<object>();
  for (let depth = 0; depth <= 2; depth += 1) {
    if (typeof current !== "object" || current === null || visited.has(current)) {
      break;
    }
    visited.add(current);
    databaseError ??= classifyDay149DatabaseErrorStructure(current);
    for (const field of DAY149_VERIFY_SAFE_FIELDS) {
      const fieldValue = readDay149VerifyProperty(current, field);
      if (typeof fieldValue !== "string") continue;
      const predicate = extractDay149VerifyToken(fieldValue);
      if (predicate !== null) {
        return Object.freeze({
          error_kind: "FIXED_PREDICATE",
          predicate,
          database_error_class: "PLPGSQL_RAISED_ERROR",
          syntax_catalog_subcategory: null,
        });
      }
    }
    current = readDay149VerifyProperty(current, "cause");
  }
  return Object.freeze(databaseError !== null
    ? {
      error_kind: "DATABASE_ERROR_WITHOUT_PREDICATE",
      predicate: null,
      database_error_class: databaseError.database_error_class,
      syntax_catalog_subcategory: databaseError.syntax_catalog_subcategory,
    }
    : {
      error_kind: "GENERIC_ERROR",
      predicate: null,
      database_error_class: null,
      syntax_catalog_subcategory: null,
    });
}

function createDay149VerifyFailurePayload(input: Readonly<{
  execution_nonce: string;
  error: unknown;
  cleanup: "PASS" | "FAILED";
}>): Day149VerifyFailurePayload {
  const classification = classifyDay149VerifyError(input.error);
  return Object.freeze({
    schema_version: "farmos.day149.verify-diagnostic.v5",
    result: "FAILED",
    execution_nonce: input.execution_nonce,
    stage: "day149_verify_sql",
    error_kind: classification.error_kind,
    predicate: classification.predicate,
    database_error_class: classification.database_error_class,
    syntax_catalog_subcategory: classification.syntax_catalog_subcategory,
    failure_class: "MIGRATION_VERIFY_FAILED",
    cleanup: input.cleanup,
  });
}

function isDay149VerifyFailurePayload(
  value: unknown,
): value is Day149VerifyFailurePayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return Object.keys(row).length === 10 &&
    Object.keys(row).every((key) => [
      "schema_version", "result", "execution_nonce", "stage", "error_kind",
      "predicate", "database_error_class", "syntax_catalog_subcategory",
      "failure_class", "cleanup",
    ].includes(key)) &&
    row.schema_version === "farmos.day149.verify-diagnostic.v5" &&
    row.result === "FAILED" &&
    typeof row.execution_nonce === "string" &&
    /^[a-f0-9]{12}$/.test(row.execution_nonce) &&
    row.stage === "day149_verify_sql" &&
    DAY149_VERIFY_ERROR_KINDS.includes(row.error_kind as Day149VerifyErrorKind) &&
    ((row.error_kind === "FIXED_PREDICATE" &&
      typeof row.predicate === "string" &&
      DAY149_VERIFY_PREDICATE_SET.has(row.predicate) &&
      row.database_error_class === "PLPGSQL_RAISED_ERROR" &&
      row.syntax_catalog_subcategory === null) ||
      (row.error_kind === "DATABASE_ERROR_WITHOUT_PREDICATE" &&
        row.predicate === null &&
        DAY149_DATABASE_ERROR_CLASSES.includes(
          row.database_error_class as Day149DatabaseErrorClass,
        ) &&
        (row.database_error_class === "SYNTAX_OR_CATALOG_ERROR"
          ? DAY149_SYNTAX_CATALOG_SUBCATEGORIES.includes(
            row.syntax_catalog_subcategory as Day149SyntaxCatalogSubcategory,
          )
          : row.syntax_catalog_subcategory === null)) ||
      (row.error_kind === "GENERIC_ERROR" && row.predicate === null &&
        row.database_error_class === null &&
        row.syntax_catalog_subcategory === null)) &&
    row.failure_class === "MIGRATION_VERIFY_FAILED" &&
    (row.cleanup === "PASS" || row.cleanup === "FAILED");
}

const REPOSITORY_COMMAND_STAGES = new Set<Day149IsolatedStage>([
  "review_durability", "replay_after_reconnect", "first_promotion",
  "replacement_promotion", "reject_and_replay", "rebuild",
  "concurrent_single_winner",
]);

function classifyDay149IsolatedFailure(
  error: unknown,
  stage: Day149IsolatedStage,
): Day149IsolatedFailureClass {
  if (error instanceof Day149IsolatedFixedFailure) return error.failureClass;
  if (stage === "postgres_readiness") return "POSTGRES_READINESS_FAILED";
  if (stage === "admin_connection" || stage === "repository_connection") {
    return "POSTGRES_CONNECTION_FAILED";
  }
  if (stage.endsWith("_apply") || stage === "day146_fixture_apply") {
    return "MIGRATION_APPLY_FAILED";
  }
  if (stage.endsWith("_verify") || stage === "day149_verify_sql") {
    return "MIGRATION_VERIFY_FAILED";
  }
  if (REPOSITORY_COMMAND_STAGES.has(stage)) return "REPOSITORY_COMMAND_FAILED";
  if (error instanceof AssertionError) return "ASSERTION_FAILED";
  return "UNKNOWN";
}

async function verifySynchronousWriterRejection<T>(input: Readonly<{
  snapshot(): Promise<T>;
  writer(): Promise<unknown>;
  rollback(): Promise<unknown>;
}>): Promise<void> {
  const before = await input.snapshot();
  let rejected = false;
  try {
    await input.writer();
  } catch {
    rejected = true;
  }
  if (!rejected) {
    await input.rollback();
    throw new Day149IsolatedFixedFailure("EXPECTED_REJECTION_MISMATCH");
  }
  await input.rollback();
  assert.deepEqual(await input.snapshot(), before);
}

async function runIsolatedPostgres(): Promise<Record<string, unknown>> {
  const nonce = randomBytes(6).toString("hex");
  assert.match(nonce, /^[a-f0-9]{12}$/);
  let stage: Day149IsolatedStage = "docker_context_validation";
  let reviewSubstage: Day149ReviewSubstage = "review_fixture_construction";
  let promotionSubstage: Day149FirstPromotionSubstage = "first_service_execution";
  const transactionObserverState = createDay149TransactionObserverState();
  const commitFailureObserverState = createDay149CommitFailureObserverState();
  const deferredProbeObserverState = createDay149DeferredProbeObserverState();
  const containerName = `farmos-day149-${nonce}`;
  const database = `farmos_day149_${nonce}`;
  const adminUser = `day149_admin_${nonce}`;
  const runtimeUser = `day149_runtime_${nonce}`;
  const password = randomBytes(24).toString("hex");
  let dockerCommands = 0;
  let containerCreated = false;
  let mappedPort: number | null = null;
  let runtimeRepository: FarmOsOperationalMemoryPostgresRepository | null = null;
  let admin: Client | null = null;

  const docker = async (args: readonly string[]): Promise<string> => {
    dockerCommands += 1;
    try {
      const result = await execFileAsync("docker", [...args], {
        timeout: 30_000,
        maxBuffer: 4 * 1024 * 1024,
        encoding: "utf8",
      });
      return result.stdout.trim();
    } catch {
      throw new Day149IsolatedFixedFailure("DOCKER_COMMAND_FAILED");
    }
  };
  const assertMappedPortClosed = async (): Promise<void> => {
    if (mappedPort === null) return;
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const socket = createConnection({ host: "127.0.0.1", port: mappedPort! });
      const timer = setTimeout(() => {
        socket.destroy();
        rejectPromise(new Error("DAY149_MAPPED_PORT_CLOSURE_UNCONFIRMED"));
      }, 1_000);
      socket.once("connect", () => {
        clearTimeout(timer);
        socket.destroy();
        rejectPromise(new Error("DAY149_MAPPED_PORT_STILL_OPEN"));
      });
      socket.once("error", () => {
        clearTimeout(timer);
        socket.destroy();
        resolvePromise();
      });
    });
  };
  const cleanup = async (): Promise<void> => {
    let cleanupFailed = false;
    if (runtimeRepository !== null) {
      try {
        await runtimeRepository.close();
      } catch {
        cleanupFailed = true;
      }
      runtimeRepository = null;
    }
    if (admin !== null) {
      try {
        await admin.end();
      } catch {
        cleanupFailed = true;
      }
      admin = null;
    }
    if (containerCreated) {
      try {
        await docker(["container", "rm", "--force", containerName]);
        containerCreated = false;
      } catch {
        cleanupFailed = true;
      }
      if (!containerCreated) {
        let absent = false;
        try {
          await docker(["container", "inspect", containerName]);
        } catch {
          absent = true;
        }
        if (!absent) cleanupFailed = true;
      }
    }
    try {
      await assertMappedPortClosed();
    } catch {
      cleanupFailed = true;
    }
    if (cleanupFailed) {
      throw new Day149IsolatedFixedFailure("CLEANUP_FAILED");
    }
  };

  try {
    stage = "docker_context_validation";
    assert.equal(process.env.DOCKER_HOST, undefined);
    assert.equal(process.env.DOCKER_CONTEXT, undefined);
    const contextName = await docker(["context", "show"]);
    assert.equal(contextName, "orbstack");
    const context = JSON.parse(await docker(["context", "inspect", contextName])) as Array<{
      Name?: unknown;
      Endpoints?: { docker?: { Host?: unknown; SkipTLSVerify?: unknown } };
    }>;
    assert.equal(context.length, 1);
    assert.equal(context[0]?.Name, "orbstack");
    const endpoint = context[0]?.Endpoints?.docker;
    assert.equal(typeof endpoint?.Host, "string");
    assert.ok(String(endpoint?.Host).endsWith("/.orbstack/run/docker.sock"));
    assert.equal(endpoint?.SkipTLSVerify, false);
    stage = "postgres_image_validation";
    const imageInspect = JSON.parse(await docker(["image", "inspect", "postgres:17"])) as
      Array<{ Id?: unknown; RepoTags?: unknown }>;
    assert.equal(imageInspect.length, 1);
    const imageId = String(imageInspect[0]?.Id);
    assert.match(imageId, /^sha256:[a-f0-9]{64}$/);
    assert.ok(Array.isArray(imageInspect[0]?.RepoTags) &&
      imageInspect[0]?.RepoTags.includes("postgres:17"));

    stage = "container_create";
    await docker([
      "container", "create", "--name", containerName, "--pull=never",
      "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=536870912",
      "--publish", "127.0.0.1::5432",
      "--env", `POSTGRES_USER=${adminUser}`,
      "--env", `POSTGRES_PASSWORD=${password}`,
      "--env", `POSTGRES_DB=${database}`,
      "postgres:17",
    ]);
    containerCreated = true;
    stage = "container_start";
    await docker(["container", "start", containerName]);
    stage = "container_inspection";
    const inspect = JSON.parse(await docker(["container", "inspect", containerName])) as
      DockerInspect[];
    assert.equal(inspect.length, 1);
    const bound = inspect[0];
    assert.match(String(bound?.Id), /^[a-f0-9]{64}$/);
    assert.equal(bound?.Image, imageId);
    assert.equal(bound?.Name, `/${containerName}`);
    assert.equal(bound?.Config?.Image, "postgres:17");
    assert.equal(bound?.State?.Running, true);
    assert.deepEqual(bound?.Mounts, []);
    assert.equal(typeof bound?.HostConfig?.Tmpfs, "object");
    stage = "mapped_port_resolution";
    const mapping = bound?.NetworkSettings?.Ports?.["5432/tcp"];
    assert.ok(Array.isArray(mapping) && mapping.length === 1);
    assert.equal(mapping[0]?.HostIp, "127.0.0.1");
    mappedPort = Number(mapping[0]?.HostPort);
    assert.ok(Number.isSafeInteger(mappedPort) && mappedPort >= 1024 && mappedPort <= 65535);

    stage = "postgres_readiness";
    for (let attempt = 1; attempt <= 120; attempt += 1) {
      const readiness = new Client({
        host: "127.0.0.1", port: mappedPort, database,
        user: adminUser, password, ssl: false,
        connectionTimeoutMillis: 2_000,
        application_name: "farmos-day149-readiness",
      });
      try {
        await readiness.connect();
        const probe = await readiness.query<{ ready: number }>("select 1 as ready");
        await readiness.end();
        if (probe.rows.length === 1 && probe.rows[0]?.ready === 1) break;
      } catch {
        await readiness.end().catch(() => undefined);
        if (attempt === 120) {
          throw new Day149IsolatedFixedFailure("POSTGRES_READINESS_FAILED");
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
      }
    }

    stage = "admin_connection";
    admin = new Client({
      host: "127.0.0.1", port: mappedPort, database,
      user: adminUser, password, ssl: false,
      connectionTimeoutMillis: 5_000,
      application_name: "farmos-day149-migration-owner",
    });
    await admin.connect();
    const root = new URL("../../", import.meta.url);
    const sql = (path: string) => readFileSync(new URL(path, root), "utf8");
    stage = "day146_fixture_apply";
    await admin.query(sql("scripts/sql/day146_operational_memory_snapshot_persistence.sql"));
    await admin.query(`
      create schema if not exists core_schema;
      create table if not exists core_schema.migration_history (
        migration_id text primary key,
        sequence bigint not null unique check (sequence > 0),
        checksum text not null check (checksum ~ '^sha256:[0-9a-f]{64}$'),
        description text not null check (length(description) between 1 and 500),
        applied_at timestamptz not null,
        applied_by text not null check (length(applied_by) between 3 and 128),
        execution_id text not null unique check (length(execution_id) between 8 and 128)
      )
    `);
    const recordMigration = async (
      migrationId: string,
      sequence: number,
      checksum: string,
      description: string,
    ) => {
      await admin?.query(
        `insert into core_schema.migration_history (
          migration_id, sequence, checksum, description, applied_at,
          applied_by, execution_id
        ) values ($1,$2,$3,$4,$5,$6,$7)`,
        [migrationId, sequence, `sha256:${checksum}`, description, COMMITTED_AT,
          "day149_isolated_migration_owner", `${nonce}:${sequence}`],
      );
    };
    stage = "day147_prepare_apply";
    await admin.query(sql(
      "db/migrations/202607300001_daily_operational_projection_candidate_foundation.sql",
    ));
    await recordMigration(
      "202607300001_daily_operational_projection_candidate_foundation",
      202607300001,
      "350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf",
      "Prepare Candidate state storage",
    );
    stage = "day147_prepare_verify";
    await admin.query(sql(
      "db/migrations/202607300001_daily_operational_projection_candidate_foundation.verify.sql",
    ));
    stage = "day147_activate_apply";
    await admin.query(sql(
      "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql",
    ));
    await recordMigration(
      "202607310001_daily_operational_projection_candidate_activation",
      202607310001,
      "e55b7b2c33d432b37d9733d599f8ed4dd7de99a82fb64c5f90158dae7addbbc2",
      "Activate Candidate state enforcement",
    );
    stage = "day147_activate_verify";
    await admin.query(sql(
      "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql",
    ));

    assert.match(runtimeUser, /^day149_runtime_[a-f0-9]{12}$/);
    assert.match(password, /^[a-f0-9]{48}$/);
    await admin.query(`create role anon nologin`);
    await admin.query(`create role authenticated nologin`);
    await admin.query(`create role day149_attacker_${nonce} nologin`);
    await admin.query(`create role ${runtimeUser} login password '${password}'`);

    let sequence = 0;
    const seeded: Array<{ row: FarmOsDailyProjection; state_sequence: number }> = [];
    const seed = async (row: FarmOsDailyProjection, state: "candidate" | "active") => {
      const lineage = lineageFor(row.projection_id, row.business_date);
      await admin?.query("begin");
      try {
        await admin?.query(`insert into ai.operational_memory_source_snapshots (
          snapshot_id, contract_version, source_system, source_record_id,
          source_record_version, source_content_hash, operation, business_date,
          recorded_at, source_updated_at, deleted_at, field_reference,
          crop_cycle_reference, work_type_reference, safe_payload, observed_at,
          initial_state, supersedes_snapshot_id, rejection_code
        ) values ($1,$2,'farming_app',$3,1,$4,'upsert',$5,$6,$6,null,
          'field_01','cycle_01','harvest','{}'::jsonb,$6,'active',null,null)
        on conflict (snapshot_id) do nothing`,
          [lineage.snapshot_id, FARM_OS_STABLE_CHANGES_CONTRACT_ID,
            lineage.source_record_id, lineage.source_content_hash, row.business_date,
            "2026-08-03T00:00:00.000Z"],
        );
        await admin?.query(`insert into ai.operational_memory_snapshot_state_events (
          event_id, snapshot_id, state, occurred_at
        ) select $1,$2,'active',$3
        where not exists (
          select 1 from ai.operational_memory_snapshot_state_events
          where snapshot_id = $2
        )`,
          [`snapshot_event_${row.projection_id}`, lineage.snapshot_id,
            "2026-08-03T00:00:00.000Z"],
        );
        await admin?.query(`insert into ai.operational_memory_daily_projections (
          projection_id, projection_type, projection_version, business_date,
          compiler_id, compiler_version, content_hash, projection_content,
          generated_at, supersedes_projection_id
        ) values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,null)`,
          [row.projection_id, row.projection_type, row.projection_version,
            row.business_date, row.compiler_id, row.compiler_version,
            row.content_hash, JSON.stringify(row.content), row.generated_at],
        );
        sequence += 1;
        await admin?.query(`insert into ai.operational_memory_projection_state_events (
          event_id, projection_id, status, event_sequence, occurred_at
        ) overriding system value values ($1,$2,'candidate',$3,$4)`,
          [`candidate_event_${row.projection_id}`, row.projection_id, sequence,
            "2026-08-03T00:00:00.000Z"],
        );
        if (state === "active") {
          sequence += 1;
          await admin?.query(`insert into ai.operational_memory_projection_state_events (
            event_id, projection_id, status, event_sequence, occurred_at
          ) overriding system value values ($1,$2,'active',$3,$4)`,
            [`active_event_${row.projection_id}`, row.projection_id, sequence,
              "2026-08-03T00:00:01.000Z"],
          );
        }
        await admin?.query(`insert into ai.operational_memory_projection_lineage (
          projection_id, snapshot_id, source_record_id, source_content_hash, relation
        ) values ($1,$2,$3,$4,$5)`,
          [lineage.projection_id, lineage.snapshot_id, lineage.source_record_id,
            lineage.source_content_hash, lineage.relation],
        );
        await admin?.query("commit");
      } catch (error) {
        await admin?.query("rollback");
        throw error;
      }
      seeded.push({ row, state_sequence: sequence });
    };
    stage = "seed_candidate_and_active_data";
    await seed(projection("candidate_fixture_001", 1, "2026-08-02"), "candidate");
    await seed(projection("active_fixture_001", 1, "2026-08-03"), "active");
    await seed(projection("candidate_fixture_002", 2, "2026-08-03"), "candidate");
    await seed(projection("candidate_concurrent_1", 1, "2026-08-04"), "candidate");
    await seed(projection("candidate_concurrent_2", 2, "2026-08-04"), "candidate");
    await seed(projection("candidate_reject_001", 1, "2026-08-05"), "candidate");
    await seed(projection("candidate_rebuild_001", 1, "2026-08-06"), "candidate");
    await seed(projection("candidate_binding_a", 1, "2026-08-07"), "candidate");
    await seed(projection("candidate_binding_b", 1, "2026-08-08"), "candidate");
    await seed(projection("candidate_rollback_001", 1, "2026-08-09"), "candidate");

    stage = "day149_migration_apply";
    await admin.query(sql(
      "db/migrations/202608030001_daily_operational_projection_command_ledger.sql",
    ));
    await recordMigration(
      "202608030001_daily_operational_projection_command_ledger",
      202608030001,
      "98504d23be1922d339acf0c7384ad1a5f9b6257e44a07a9073200b21bd79ef0a",
      "Add durable review decisions and atomic Projection command receipts",
    );
    stage = "day149_verify_sql";
    await admin.query(sql(
      "db/migrations/202608030001_daily_operational_projection_command_ledger.verify.sql",
    ));
    await admin.query(
      `grant farmos_core_projection_command_transaction to ${runtimeUser}`,
    );

    stage = "repository_connection";
    const poolConfig = {
      host: "127.0.0.1", port: mappedPort, database,
      user: runtimeUser, password, ssl: false,
      connectionTimeoutMillis: 5_000,
      max: 4,
    } as const;
    runtimeRepository = new FarmOsOperationalMemoryPostgresRepository({
      poolConfig,
      projectionCommandTransactionObserver: transactionObserverState.observer,
      projectionCommandCommitFailureObserver: commitFailureObserverState.observer,
    });
    const expected = (id: string) => {
      const found = seeded.find((item) => item.row.projection_id === id);
      assert.ok(found);
      return {
        projection_id: found.row.projection_id,
        projection_version: found.row.projection_version,
        state_sequence: found.state_sequence,
        content_hash: found.row.content_hash,
      };
    };
    const dynamicReview = (
      id: string,
      decision: "approve" | "reject" | "request_rebuild",
      suffix: string,
    ) => ({
      schema_version: "farmos.projection.review.command.v1",
      command_id: `review-command-${suffix}`,
      command_type: "review_projection_candidate",
      candidate_projection_id: id,
      expected_candidate_version: expected(id),
      decision,
      reason: "Human validated the exact projection command fixture.",
      requested_by: AUTHORITY.authenticated_principal_id,
      requested_at: REQUESTED_AT,
      reviewed_by: AUTHORITY.authenticated_principal_id,
      reviewed_at: REQUESTED_AT,
      expected_review_sequence: 0,
      idempotency_key: `review-idempotency-${suffix}`,
    });
    const run = async (command: unknown) => {
      assert.ok(runtimeRepository);
      commitFailureObserverState.reset();
      deferredProbeObserverState.reset();
      return await executeFarmOsProjectionCommand({
        command, authority: AUTHORITY, repository: runtimeRepository,
        server_clock: { now: () => COMMITTED_AT },
      });
    };

    stage = "review_durability";
    reviewSubstage = "review_fixture_construction";
    const firstReviewCommand = dynamicReview(
      "candidate_fixture_001", "approve", "dynamic-0001",
    );
    reviewSubstage = "review_service_execution";
    const firstReview = await run(firstReviewCommand);
    if (!firstReview.ok) {
      throw new Day149ReviewServiceRejected(firstReview.failure_code);
    }
    reviewSubstage = "review_result_validation";
    if (firstReview.result_payload.review_decision_id === null) {
      throw new Day149ReviewAssertionFailure("REVIEW_DECISION_ID_MISSING");
    }
    const firstReviewId = firstReview.result_payload.review_decision_id;
    reviewSubstage = "review_repository_close";
    await runtimeRepository.close();
    stage = "replay_after_reconnect";
    runtimeRepository = new FarmOsOperationalMemoryPostgresRepository({
      poolConfig,
      projectionCommandTransactionObserver: transactionObserverState.observer,
      projectionCommandCommitFailureObserver: commitFailureObserverState.observer,
    });
    const reviewReplay = await run(firstReviewCommand);
    assert.ok(reviewReplay.ok && reviewReplay.replayed);
    const firstPromoteCommand = {
      schema_version: "farmos.projection.promote.command.v1",
      command_id: "promote-command-dynamic-0001",
      command_type: "promote_projection_candidate",
      candidate_projection_id: "candidate_fixture_001",
      expected_candidate_version: expected("candidate_fixture_001"),
      expected_active: { presence: "absent" },
      review_decision_reference: { review_id: firstReviewId, review_sequence: 1 },
      requested_by: AUTHORITY.authenticated_principal_id,
      approved_by: AUTHORITY.authenticated_principal_id,
      idempotency_key: "promote-idempotency-dynamic-0001",
      requested_at: REQUESTED_AT,
    };
    await runtimeRepository.close();
    runtimeRepository = new FarmOsOperationalMemoryPostgresRepository({
      poolConfig,
      projectionCommandTransactionObserver: transactionObserverState.observer,
      projectionCommandCommitFailureObserver: commitFailureObserverState.observer,
      projectionCommandDeferredProbeOptions: {
        enabled: true,
        observer: deferredProbeObserverState.observer,
      },
    });
    stage = "first_promotion";
    promotionSubstage = "first_service_execution";
    const firstPromote = await run(firstPromoteCommand);
    if (!firstPromote.ok) {
      throw new Day149FirstPromotionServiceRejected(firstPromote.failure_code);
    }
    promotionSubstage = "first_result_validation";
    if (!firstPromote.ok) {
      throw new Day149FirstPromotionAssertionFailure(
        "FIRST_EXECUTION_EXPECTED_SUCCESS",
      );
    }
    promotionSubstage = "replay_service_execution";
    const firstPromoteReplay = await run(firstPromoteCommand);
    if (!firstPromoteReplay.ok) {
      throw new Day149FirstPromotionServiceRejected(firstPromoteReplay.failure_code);
    }
    promotionSubstage = "replay_result_validation";
    if (!firstPromoteReplay.ok) {
      throw new Day149FirstPromotionAssertionFailure(
        "REPLAY_EXECUTION_EXPECTED_SUCCESS",
      );
    }
    if (!firstPromoteReplay.replayed) {
      throw new Day149FirstPromotionAssertionFailure("REPLAY_EXPECTED_TRUE");
    }
    await runtimeRepository.close();
    runtimeRepository = new FarmOsOperationalMemoryPostgresRepository({
      poolConfig,
      projectionCommandTransactionObserver: transactionObserverState.observer,
      projectionCommandCommitFailureObserver: commitFailureObserverState.observer,
    });

    stage = "replacement_promotion";
    const replacementReview = await run(dynamicReview(
      "candidate_fixture_002", "approve", "dynamic-0002",
    ));
    assert.ok(replacementReview.ok && replacementReview.result_payload.review_decision_id);
    const replacement = await run({
      schema_version: "farmos.projection.promote.command.v1",
      command_id: "promote-command-dynamic-0002",
      command_type: "promote_projection_candidate",
      candidate_projection_id: "candidate_fixture_002",
      expected_candidate_version: expected("candidate_fixture_002"),
      expected_active: {
        presence: "present",
        ...expected("active_fixture_001"),
      },
      review_decision_reference: {
        review_id: replacementReview.result_payload.review_decision_id,
        review_sequence: 1,
      },
      requested_by: AUTHORITY.authenticated_principal_id,
      approved_by: AUTHORITY.authenticated_principal_id,
      idempotency_key: "promote-idempotency-dynamic-0002",
      requested_at: REQUESTED_AT,
    });
    assert.ok(replacement.ok);

    stage = "reject_and_replay";
    const rejectReview = await run(dynamicReview(
      "candidate_reject_001", "reject", "dynamic-reject-01",
    ));
    assert.ok(rejectReview.ok && rejectReview.result_payload.review_decision_id);
    const dynamicRejectCommand = {
      schema_version: "farmos.projection.reject.command.v1",
      command_id: "reject-command-dynamic-0001",
      command_type: "reject_projection_candidate",
      candidate_projection_id: "candidate_reject_001",
      expected_candidate_version: expected("candidate_reject_001"),
      review_decision_reference: {
        review_id: rejectReview.result_payload.review_decision_id,
        review_sequence: 1,
      },
      reason: "Human rejected the exact candidate fixture.",
      requested_by: AUTHORITY.authenticated_principal_id,
      idempotency_key: "reject-idempotency-dynamic-0001",
      requested_at: REQUESTED_AT,
    };
    assert.ok((await run(dynamicRejectCommand)).ok);
    const receiptCountBeforeRejectReplay = await admin.query<{ count: string }>(
      "select count(*)::text as count from ai.operational_memory_projection_command_receipts",
    );
    const rejectReplay = await run(dynamicRejectCommand);
    assert.ok(rejectReplay.ok && rejectReplay.replayed);
    const receiptCountAfterRejectReplay = await admin.query<{ count: string }>(
      "select count(*)::text as count from ai.operational_memory_projection_command_receipts",
    );
    assert.equal(receiptCountAfterRejectReplay.rows[0]?.count,
      receiptCountBeforeRejectReplay.rows[0]?.count);

    stage = "rebuild";
    const rebuildReview = await run(dynamicReview(
      "candidate_rebuild_001", "request_rebuild", "dynamic-rebuild-01",
    ));
    assert.ok(rebuildReview.ok && rebuildReview.result_payload.review_decision_id);
    const sourceInput = validSourceInput("2026-08-06");
    const rebuild = await run({
      schema_version: "farmos.projection.rebuild.command.v1",
      command_id: "rebuild-command-dynamic-0001",
      command_type: "rebuild_projection_candidate",
      candidate_projection_id: "candidate_rebuild_001",
      expected_candidate_version: expected("candidate_rebuild_001"),
      review_decision_reference: {
        review_id: rebuildReview.result_payload.review_decision_id,
        review_sequence: 1,
      },
      source_input: sourceInput,
      source_input_hash: sha256Prefixed(canonicalJson(sourceInput)).slice(7),
      requested_by: AUTHORITY.authenticated_principal_id,
      idempotency_key: "rebuild-idempotency-dynamic-0001",
      requested_at: REQUESTED_AT,
    });
    assert.ok(rebuild.ok);

    stage = "concurrent_single_winner";
    const concurrencyReviews = await Promise.all([
      run(dynamicReview("candidate_concurrent_1", "approve", "dynamic-concurrent-01")),
      run(dynamicReview("candidate_concurrent_2", "approve", "dynamic-concurrent-02")),
    ]);
    assert.ok(concurrencyReviews.every((result) => result.ok));
    const concurrencyCommands = concurrencyReviews.map((reviewResult, index) => {
      assert.ok(reviewResult.ok && reviewResult.result_payload.review_decision_id);
      const candidateId = `candidate_concurrent_${index + 1}`;
      return {
        schema_version: "farmos.projection.promote.command.v1",
        command_id: `promote-command-concurrent-0${index + 1}`,
        command_type: "promote_projection_candidate",
        candidate_projection_id: candidateId,
        expected_candidate_version: expected(candidateId),
        expected_active: { presence: "absent" },
        review_decision_reference: {
          review_id: reviewResult.result_payload.review_decision_id,
          review_sequence: 1,
        },
        requested_by: AUTHORITY.authenticated_principal_id,
        approved_by: AUTHORITY.authenticated_principal_id,
        idempotency_key: `promote-idempotency-concurrent-0${index + 1}`,
        requested_at: REQUESTED_AT,
      };
    });
    const concurrent = await Promise.all(concurrencyCommands.map(run));
    assert.equal(concurrent.filter((result) => result.ok).length, 1);
    const activeCount = await admin.query<{ count: string }>(`
      select count(*)::text as count
      from ai.operational_memory_daily_projections as projection
      join lateral (
        select event.status
        from ai.operational_memory_projection_state_events as event
        where event.projection_id = projection.projection_id
        order by event.event_sequence desc limit 1
      ) as latest on true
      where projection.business_date = date '2026-08-04'
        and latest.status = 'active'
    `);
    assert.equal(activeCount.rows[0]?.count, "1");

    stage = "cross_candidate_binding_denial";
    const bindingReview = await run(dynamicReview(
      "candidate_binding_a", "approve", "dynamic-binding-a",
    ));
    assert.ok(bindingReview.ok && bindingReview.result_payload.review_decision_id);
    const ledgerCounts = async () => {
      const counts = await admin?.query<{
        events: string;
        receipts: string;
        reviews: string;
        rollback_status: string;
        active_count: string;
      }>(`select
        (select count(*)::text from ai.operational_memory_projection_state_events)
          as events,
        (select count(*)::text from ai.operational_memory_projection_command_receipts)
          as receipts,
        (select count(*)::text from ai.operational_memory_projection_review_decisions)
          as reviews,
        (select event.status
          from ai.operational_memory_projection_state_events as event
          where event.projection_id = 'candidate_rollback_001'
          order by event.event_sequence desc limit 1) as rollback_status,
        (select count(*)::text from (
          select distinct on (event.projection_id) event.status
          from ai.operational_memory_projection_state_events as event
          order by event.projection_id, event.event_sequence desc
        ) as latest where latest.status = 'active') as active_count`);
      assert.ok(counts?.rows[0]);
      return counts.rows[0];
    };
    const nextDatabaseEventSequence = async () => {
      const result = await admin?.query<{ sequence: string }>(
        `select (coalesce(max(event_sequence), 0) + 1)::text as sequence
        from ai.operational_memory_projection_state_events`,
      );
      assert.ok(result?.rows[0]);
      return Number(result.rows[0].sequence);
    };
    const rawReceipt = (input: Readonly<{
      command_id: string;
      result_status: "succeeded" | "rejected";
      result_code: string;
      review_decision_id: string | null;
      projection_id: string;
      event_id: string;
      sequence: number;
    }>) => {
      const resultPayload = {
        schema_version: "farmos.projection.command-result.v1",
        command_id: input.command_id,
        command_type: "promote_projection_candidate",
        outcome: input.result_status,
        result_code: input.result_code,
        review_decision_id: input.review_decision_id,
        affected_projection_ids: [input.projection_id],
        committed_state_event_sequences: [input.sequence],
      };
      return {
        receipt_schema_version: "farmos.projection.command-receipt.v1",
        command_id: input.command_id,
        idempotency_key_hash: hashFarmOsProjectionIdempotencyKey(
          `${input.command_id}-idempotency`,
        ),
        command_type: "promote_projection_candidate",
        canonical_payload_hash: sha256Prefixed(canonicalJson({
          command_id: input.command_id,
        })),
        result_status: input.result_status,
        result_code: input.result_code,
        result_payload: resultPayload,
        result_payload_hash: sha256Prefixed(canonicalJson(resultPayload)),
        requested_by: AUTHORITY.authenticated_principal_id,
        requested_at: REQUESTED_AT,
        committed_at: COMMITTED_AT,
        review_decision_id: input.review_decision_id,
        affected_projection_id_1: input.projection_id,
        committed_state_event_id_1: input.event_id,
        committed_state_event_sequence_1: input.sequence,
        affected_projection_id_2: null,
        committed_state_event_id_2: null,
        committed_state_event_sequence_2: null,
      };
    };
    const callRawWriter = async (
      receiptRecord: Record<string, unknown>,
      eventRecord: Record<string, unknown>,
    ) => {
      await admin?.query("begin");
      await admin?.query(
        "set local role farmos_core_projection_command_transaction",
      );
      await admin?.query(
        `select ai.persist_operational_memory_projection_command(
          $1::jsonb, null, null, $2::jsonb, '[]'::jsonb
        )`,
        [JSON.stringify(receiptRecord), JSON.stringify([eventRecord])],
      );
    };

    const crossBindingCounts = await ledgerCounts();
    const crossBindingSequence = await nextDatabaseEventSequence();
    const crossBindingEvent = {
      event_id: "projection_command_event_cross_binding_1",
      projection_id: "candidate_binding_b",
      status: "active",
      sequence: crossBindingSequence,
      occurred_at: REQUESTED_AT,
    };
    await callRawWriter(rawReceipt({
      command_id: "promote-command-cross-binding",
      result_status: "succeeded",
      result_code: "projection_promoted",
      review_decision_id: bindingReview.result_payload.review_decision_id,
      projection_id: crossBindingEvent.projection_id,
      event_id: crossBindingEvent.event_id,
      sequence: crossBindingEvent.sequence,
    }), crossBindingEvent);
    await assert.rejects(admin!.query("commit"));
    await admin!.query("rollback").catch(() => undefined);
    assert.deepEqual(await ledgerCounts(), crossBindingCounts);

    stage = "receipt_failure_rollback";
    const receiptFailureCounts = await ledgerCounts();
    const receiptFailureSequence = await nextDatabaseEventSequence();
    const receiptFailureEvent = {
      event_id: "projection_command_event_receipt_failure_1",
      projection_id: "candidate_rollback_001",
      status: "active",
      sequence: receiptFailureSequence,
      occurred_at: REQUESTED_AT,
    };
    await admin!.query("begin");
    await admin!.query(
      "set local role farmos_core_projection_command_transaction",
    );
    await assert.rejects(admin!.query(
      `select ai.persist_operational_memory_projection_command(
        $1::jsonb, null, null, $2::jsonb, '[]'::jsonb
      )`,
      [JSON.stringify(rawReceipt({
        command_id: "promote-command-receipt-failure",
        result_status: "succeeded",
        result_code: "not_a_result_code",
        review_decision_id: null,
        projection_id: receiptFailureEvent.projection_id,
        event_id: receiptFailureEvent.event_id,
        sequence: receiptFailureEvent.sequence,
      })), JSON.stringify([receiptFailureEvent])],
    ));
    await admin!.query("rollback");
    assert.deepEqual(await ledgerCounts(), receiptFailureCounts);

    stage = "event_failure_rollback";
    const eventFailureCounts = await ledgerCounts();
    const eventFailureSequence = await nextDatabaseEventSequence();
    const eventFailureEvent = {
      event_id: "projection_command_event_event_failure_1",
      projection_id: "candidate_rollback_001",
      status: "superseded",
      sequence: eventFailureSequence,
      occurred_at: REQUESTED_AT,
    };
    await verifySynchronousWriterRejection({
      snapshot: ledgerCounts,
      writer: async () => await callRawWriter(rawReceipt({
        command_id: "promote-command-event-failure",
        result_status: "succeeded",
        result_code: "projection_promoted",
        review_decision_id: null,
        projection_id: eventFailureEvent.projection_id,
        event_id: eventFailureEvent.event_id,
        sequence: eventFailureEvent.sequence,
      }), eventFailureEvent),
      rollback: async () => await admin!.query("rollback"),
    });
    assert.deepEqual(await ledgerCounts(), eventFailureCounts);

    stage = "writer_shape_denial";
    const beforeInvalidWriter = await admin.query<{ count: string }>(
      "select count(*)::text as count from ai.operational_memory_daily_projections",
    );
    await assert.rejects(admin.query(
      "select ai.persist_operational_memory_projection_command('{}'::jsonb,null,null,'[]'::jsonb,'[]'::jsonb)",
    ));
    const afterInvalidWriter = await admin.query<{ count: string }>(
      "select count(*)::text as count from ai.operational_memory_daily_projections",
    );
    assert.equal(afterInvalidWriter.rows[0]?.count, beforeInvalidWriter.rows[0]?.count);

    await assert.rejects(admin.query(
      "update ai.operational_memory_projection_command_receipts set result_code = result_code",
    ));
    await admin.query("rollback").catch(() => undefined);

    stage = "direct_insert_denial";
    const denial = await admin.query<{
      direct_insert: boolean;
      any_direct_insert: boolean;
      anon_select: boolean;
      anon_execute: boolean;
      authenticated_select: boolean;
      authenticated_execute: boolean;
      attacker_select: boolean;
    }>(`select
      pg_catalog.has_table_privilege(
        'farmos_core_projection_command_transaction',
        'ai.operational_memory_projection_command_receipts', 'INSERT'
      ) as direct_insert,
      exists (
        select 1 from (values
          ('ai.operational_memory_daily_projections'),
          ('ai.operational_memory_projection_state_events'),
          ('ai.operational_memory_projection_lineage'),
          ('ai.operational_memory_projection_review_decisions'),
          ('ai.operational_memory_projection_command_receipts')
        ) as target(table_name)
        where pg_catalog.has_table_privilege(
          'farmos_core_projection_command_transaction', target.table_name,
          'INSERT'
        )
      ) as any_direct_insert,
      pg_catalog.has_table_privilege(
        'anon', 'ai.operational_memory_projection_command_receipts', 'SELECT'
      ) as anon_select,
      pg_catalog.has_function_privilege(
        'anon',
        'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)',
        'EXECUTE'
      ) as anon_execute,
      pg_catalog.has_table_privilege(
        'authenticated', 'ai.operational_memory_projection_command_receipts', 'SELECT'
      ) as authenticated_select,
      pg_catalog.has_function_privilege(
        'authenticated',
        'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)',
        'EXECUTE'
      ) as authenticated_execute,
      pg_catalog.has_table_privilege(
        'day149_attacker_${nonce}',
        'ai.operational_memory_projection_command_receipts', 'SELECT'
      ) as attacker_select`);
    stage = "acl_denial";
    assert.deepEqual(denial.rows[0], {
      direct_insert: false, any_direct_insert: false,
      anon_select: false, anon_execute: false,
      authenticated_select: false, authenticated_execute: false,
      attacker_select: false,
    });

    stage = "cleanup";
    await cleanup();
    stage = "complete";
    const successExecutionMetadata = createDay149SuccessExecutionMetadata(nonce);
    return {
      status: "PASS",
      execution_nonce: successExecutionMetadata.execution_nonce,
      stage,
      cleanup: "PASS",
      authoritative_run_count: successExecutionMetadata.authoritative_run_count,
      authoritative_run_number: successExecutionMetadata.authoritative_run_number,
      retry_number: successExecutionMetadata.retry_number,
      review_durability: "PASS",
      exact_replay_after_reconnect: "PASS",
      first_promotion_atomicity: "PASS",
      replacement_promotion_atomicity: "PASS",
      rejection_replay: "PASS",
      rebuild_candidate_receipt: "PASS",
      concurrent_single_winner: "PASS",
      one_active_invariant: "PASS",
      event_failure_rollback: "PASS",
      receipt_failure_rollback: "PASS",
      append_only: "PASS",
      direct_insert_denied: "PASS",
      public_anon_authenticated_attacker_denied: "PASS",
      persistent_volume_count: 0,
      docker_commands: dockerCommands,
      production_operations: 0,
    };
  } catch (error) {
    const failedStage = stage;
    try {
      await cleanup();
    } catch {
      return createDay149IsolatedFailurePayload({
        execution_nonce: nonce,
        stage: failedStage,
        failure_class: "CLEANUP_FAILED",
        cleanup: "FAILED",
      });
    }
    if (failedStage === "cleanup") {
      return createDay149IsolatedFailurePayload({
        execution_nonce: nonce,
        stage: "cleanup",
        failure_class: "CLEANUP_FAILED",
        cleanup: "FAILED",
      });
    }
    if (failedStage === "day149_verify_sql") {
      return createDay149VerifyFailurePayload({
        execution_nonce: nonce,
        error,
        cleanup: "PASS",
      });
    }
    if (failedStage === "review_durability") {
      const transactionSubstage = error instanceof Day149ReviewServiceRejected &&
          error.repositoryFailureCode === "transaction_failed"
        ? transactionObserverState.transactionFailureSubstage()
        : transactionObserverState.serviceThrowSubstage();
      return createDay149ReviewDurabilityFailurePayloadV3({
        execution_nonce: nonce,
        review_substage: reviewSubstage,
        error,
        transaction_substage: transactionSubstage,
        cleanup: "PASS",
      });
    }
    if (failedStage === "first_promotion") {
      const transactionSubstage =
        error instanceof Day149FirstPromotionServiceRejected &&
          error.repositoryFailureCode === "transaction_failed"
        ? transactionObserverState.transactionFailureSubstage()
        : transactionObserverState.serviceThrowSubstage();
      const deferredProbeDiagnostic = deferredProbeObserverState.latest();
      if (deferredProbeDiagnostic !== null) {
        return createDay149DeferredProbeFailurePayload({
          execution_nonce: nonce,
          transaction_substage: transactionSubstage,
          diagnostic: deferredProbeDiagnostic,
          cleanup: "PASS",
        });
      }
      return createDay149FirstPromotionFailurePayload({
        execution_nonce: nonce,
        promotion_substage: promotionSubstage,
        error,
        transaction_substage: transactionSubstage,
        commit_failure_diagnostic: commitFailureObserverState.latest(),
        cleanup: "PASS",
      });
    }
    return createDay149IsolatedFailurePayload({
      execution_nonce: nonce,
      stage: failedStage,
      failure_class: classifyDay149IsolatedFailure(error, failedStage),
      cleanup: "PASS",
    });
  }
}

function parseMode(argv: readonly string[]): "static" | "execute-isolated" {
  const mode = argv.find((arg) => arg.startsWith("--mode="))?.slice(7) ?? "static";
  if (mode !== "static" && mode !== "execute-isolated") {
    throw new Error("DAY149_MODE_INVALID");
  }
  if (mode === "execute-isolated") {
    const authorityArguments = argv.filter((arg) => arg.startsWith("--authority="));
    const suppliedAuthority = authorityArguments[0]?.slice("--authority=".length);
    if (authorityArguments.length !== 1 || suppliedAuthority !==
      DAY149_EXECUTION_AUTHORITY.token || DAY149_EXECUTION_AUTHORITY.consumed) {
      throw new Error("DAY149_EXECUTION_AUTHORITY_INVALID");
    }
  }
  return mode;
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  await runStaticTests();
  if (mode === "execute-isolated") {
    const isolatedResult = await runIsolatedPostgres();
    if (isDay149IsolatedFailurePayload(isolatedResult) ||
      isDay149VerifyFailurePayload(isolatedResult) ||
      isDay149ReviewDurabilityFailurePayloadV3(isolatedResult) ||
      isDay149ReviewDurabilityFailurePayload(isolatedResult) ||
      isDay149DeferredProbeFailurePayload(isolatedResult) ||
      isDay149FirstPromotionFailurePayload(isolatedResult)) {
      console.error(JSON.stringify(isolatedResult));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify(isolatedResult));
    return;
  }
  console.log(JSON.stringify({
    status: "PASS",
    pure_contract: "PASS",
    command_service: "PASS",
    idempotency: "PASS",
    latest_review: "PASS",
    promotion: "PASS",
    rebuild: "PASS",
    static_database_connections: 0,
    static_migration_apply_count: 0,
    static_production_operations: 0,
  }));
}

await main();
