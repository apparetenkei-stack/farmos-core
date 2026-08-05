import { isDeepStrictEqual } from "node:util";

import type {
  FarmOsDailyProjection,
  FarmOsProjectionLineage,
  FarmOsProjectionStateEvent,
} from "./farm_os_operational_memory_persistence";
import {
  compileFarmOsDailyProjection,
  type FarmOsSnapshotStateEvent,
  type FarmOsSourceSnapshot,
} from "./farm_os_operational_memory_compiler";
import {
  materializeFarmOsProjectionStateHistory,
  validateFarmOsProjectionStateTransition,
  type FarmOsProjectionState,
} from "./farm_os_projection_state_contract";
import { createFarmOsProjectionRebuildPlan } from
  "./farm_os_projection_rebuild_command";
import {
  canonicalJson,
  FARM_OS_PROJECTION_COMMAND_PERSISTED_REJECTION_CODES,
  farmOsProjectionCommandEventId,
  farmOsProjectionReviewId,
  hashFarmOsProjectionCommand,
  hashFarmOsProjectionIdempotencyKey,
  parseFarmOsProjectionCommand,
  sha256Prefixed,
  validateFarmOsProjectionCommandAuthority,
  validateFarmOsProjectionCommandResultPayload,
  type FarmOsExpectedActive,
  type FarmOsExpectedProjectionVersion,
  type FarmOsProjectionCommand,
  type FarmOsProjectionCommandAuthority,
  type FarmOsProjectionCommandEventRecord,
  type FarmOsProjectionCommandFailureCode,
  type FarmOsProjectionCommandPersistencePlan,
  type FarmOsProjectionCommandReceiptRecord,
  type FarmOsProjectionCommandResultPayload,
  type FarmOsProjectionCommandType,
  type FarmOsProjectionReviewDecisionRecord,
} from "./farm_os_projection_review_command_contract";

export type FarmOsProjectionCommandRepositoryState = Readonly<{
  snapshots: readonly FarmOsSourceSnapshot[];
  snapshot_state_events: readonly FarmOsSnapshotStateEvent[];
  projections: readonly FarmOsDailyProjection[];
  projection_state_events: readonly FarmOsProjectionStateEvent[];
  lineage: readonly FarmOsProjectionLineage[];
  review_decisions: readonly FarmOsProjectionReviewDecisionRecord[];
}>;

export type FarmOsProjectionCommandRepositoryResult =
  | Readonly<{
    status: "committed";
    result_payload: FarmOsProjectionCommandResultPayload;
    replayed: boolean;
  }>
  | Readonly<{
    status: "rejected";
    failure_code:
      | "duplicate_command_conflict"
      | "command_receipt_invalid"
      | "readback_failed"
      | "repository_unavailable"
      | "transaction_failed";
  }>;

export type FarmOsProjectionCommandRepository = Readonly<{
  executeProjectionCommand(input: Readonly<{
    command_id: string;
    idempotency_key_hash: string;
    command_type: FarmOsProjectionCommandType;
    canonical_payload_hash: string;
    build_plan: (
      state: FarmOsProjectionCommandRepositoryState,
    ) => FarmOsProjectionCommandPersistencePlan;
  }>): Promise<FarmOsProjectionCommandRepositoryResult>;
}>;

export type FarmOsProjectionCommandServiceResult =
  | Readonly<{
    ok: true;
    result_payload: FarmOsProjectionCommandResultPayload;
    replayed: boolean;
    persistence_attempted: true;
  }>
  | Readonly<{
    ok: false;
    result_payload: null;
    failure_code: FarmOsProjectionCommandFailureCode;
    persistence_attempted: boolean;
  }>;

type ProjectionView = Readonly<{
  projection: FarmOsDailyProjection;
  state: FarmOsProjectionState;
  state_sequence: number;
}>;

const PERSISTABLE_REJECTIONS = new Set<FarmOsProjectionCommandFailureCode>(
  FARM_OS_PROJECTION_COMMAND_PERSISTED_REJECTION_CODES,
);

function projectionView(
  state: FarmOsProjectionCommandRepositoryState,
  projectionId: string,
): ProjectionView | null {
  const projection = state.projections.find((row) => row.projection_id === projectionId);
  if (projection === undefined) return null;
  const events = state.projection_state_events
    .filter((event) => event.projection_id === projectionId)
    .sort((left, right) => left.sequence - right.sequence);
  const materialized = materializeFarmOsProjectionStateHistory(events);
  const last = events.at(-1);
  return materialized.result === "materialized" && last !== undefined
    ? { projection, state: materialized.persisted_state, state_sequence: last.sequence }
    : null;
}

function versionMatches(
  view: ProjectionView,
  expected: FarmOsExpectedProjectionVersion,
): boolean {
  return view.projection.projection_id === expected.projection_id &&
    view.projection.projection_version === expected.projection_version &&
    view.state_sequence === expected.state_sequence &&
    view.projection.content_hash === expected.content_hash;
}

function contentHashValid(
  state: FarmOsProjectionCommandRepositoryState,
  view: ProjectionView,
): boolean {
  const persistedLineage = state.lineage
    .filter((row) => row.projection_id === view.projection.projection_id);
  if (persistedLineage.length === 0 ||
    new Set(persistedLineage.map((row) => row.snapshot_id)).size !==
      persistedLineage.length) {
    return false;
  }
  const compiled = compileFarmOsDailyProjection({
    business_date: view.projection.business_date,
    snapshots: [...state.snapshots],
    snapshot_state_events: [...state.snapshot_state_events],
  });
  const expectedLineage = compiled.lineage.map((row) => ({
    projection_id: view.projection.projection_id,
    ...row,
  }));
  const bySnapshot = (rows: readonly FarmOsProjectionLineage[]) =>
    [...rows].sort((left, right) =>
      left.snapshot_id.localeCompare(right.snapshot_id, "en")
    );
  return view.projection.compiler_id === compiled.compiler_id &&
    view.projection.compiler_version === compiled.compiler_version &&
    view.projection.content_hash === compiled.content_hash &&
    isDeepStrictEqual(view.projection.content, compiled.content) &&
    isDeepStrictEqual(bySnapshot(persistedLineage), bySnapshot(expectedLineage));
}

function activeMatches(view: ProjectionView | null, expected: FarmOsExpectedActive):
  "match" | "identity" | "version" {
  if (expected.presence === "absent") return view === null ? "match" : "identity";
  if (view === null || view.projection.projection_id !== expected.projection_id) {
    return "identity";
  }
  return view.projection.projection_version === expected.projection_version &&
      view.state_sequence === expected.state_sequence &&
      view.projection.content_hash === expected.content_hash
    ? "match"
    : "version";
}

function latestReview(
  state: FarmOsProjectionCommandRepositoryState,
  projectionId: string,
  projectionVersion: number,
): FarmOsProjectionReviewDecisionRecord | null {
  return [...state.review_decisions]
    .filter((review) => review.candidate_projection_id === projectionId &&
      review.candidate_projection_version === projectionVersion)
    .sort((left, right) => left.review_sequence - right.review_sequence)
    .at(-1) ?? null;
}

function nextEventSequence(state: FarmOsProjectionCommandRepositoryState): number {
  return Math.max(0, ...state.projection_state_events.map((event) => event.sequence)) + 1;
}

function resultPayload(input: Readonly<{
  command: FarmOsProjectionCommand;
  outcome: "succeeded" | "rejected";
  result_code: string;
  review_decision_id: string | null;
  events: readonly FarmOsProjectionCommandEventRecord[];
}>): FarmOsProjectionCommandResultPayload {
  const payload: FarmOsProjectionCommandResultPayload = {
    schema_version: "farmos.projection.command-result.v1",
    command_id: input.command.command_id,
    command_type: input.command.command_type,
    outcome: input.outcome,
    result_code: input.result_code,
    review_decision_id: input.review_decision_id,
    affected_projection_ids: input.events.map((event) => event.projection_id),
    committed_state_event_sequences: input.events.map((event) => event.sequence),
  };
  if (!validateFarmOsProjectionCommandResultPayload(payload)) {
    throw new Error("projection_command_result_payload_invalid");
  }
  return payload;
}

function receipt(input: Readonly<{
  command: FarmOsProjectionCommand;
  command_hash: string;
  committed_at: string;
  payload: FarmOsProjectionCommandResultPayload;
  review_decision_id: string | null;
  events: readonly FarmOsProjectionCommandEventRecord[];
}>): FarmOsProjectionCommandReceiptRecord {
  const first = input.events[0] ?? null;
  const second = input.events[1] ?? null;
  return {
    receipt_schema_version: "farmos.projection.command-receipt.v1",
    command_id: input.command.command_id,
    idempotency_key_hash: hashFarmOsProjectionIdempotencyKey(input.command.idempotency_key),
    command_type: input.command.command_type,
    canonical_payload_hash: input.command_hash,
    result_status: input.payload.outcome,
    result_code: input.payload.result_code,
    result_payload: input.payload,
    result_payload_hash: sha256Prefixed(canonicalJson(input.payload)),
    requested_by: input.command.requested_by,
    requested_at: input.command.requested_at,
    committed_at: input.committed_at,
    review_decision_id: input.review_decision_id,
    affected_projection_id_1: first?.projection_id ?? null,
    committed_state_event_id_1: first?.event_id ?? null,
    committed_state_event_sequence_1: first?.sequence ?? null,
    affected_projection_id_2: second?.projection_id ?? null,
    committed_state_event_id_2: second?.event_id ?? null,
    committed_state_event_sequence_2: second?.sequence ?? null,
  };
}

function rejectedPlan(input: Readonly<{
  command: FarmOsProjectionCommand;
  command_hash: string;
  committed_at: string;
  failure_code: FarmOsProjectionCommandFailureCode;
}>): FarmOsProjectionCommandPersistencePlan {
  if (!PERSISTABLE_REJECTIONS.has(input.failure_code)) {
    throw new Error("projection_command_non_persistable_failure");
  }
  const payload = resultPayload({
    command: input.command,
    outcome: "rejected",
    result_code: input.failure_code,
    review_decision_id: null,
    events: [],
  });
  return {
    receipt: receipt({
      command: input.command,
      command_hash: input.command_hash,
      committed_at: input.committed_at,
      payload,
      review_decision_id: null,
      events: [],
    }),
    review_decision: null,
    rebuild_projection: null,
    projection_events: [],
    rebuild_lineage: [],
  };
}

function matchingReview(
  state: FarmOsProjectionCommandRepositoryState,
  command: Exclude<FarmOsProjectionCommand, { command_type: "review_projection_candidate" }>,
  decision: "approve" | "reject" | "request_rebuild",
): FarmOsProjectionReviewDecisionRecord | FarmOsProjectionCommandFailureCode {
  const latest = latestReview(
    state,
    command.candidate_projection_id,
    command.expected_candidate_version.projection_version,
  );
  if (latest === null) {
    return decision === "approve" ? "approval_missing" : "review_decision_missing";
  }
  if (latest.review_id !== command.review_decision_reference.review_id ||
    latest.review_sequence !== command.review_decision_reference.review_sequence) {
    return "review_decision_stale";
  }
  if (latest.decision !== decision ||
    latest.candidate_content_hash !== command.expected_candidate_version.content_hash ||
    latest.candidate_state_sequence !== command.expected_candidate_version.state_sequence) {
    return decision === "approve" ? "approval_invalid" : "review_decision_invalid";
  }
  return latest;
}

function buildPlan(input: Readonly<{
  command: FarmOsProjectionCommand;
  authority: FarmOsProjectionCommandAuthority;
  state: FarmOsProjectionCommandRepositoryState;
  command_hash: string;
  committed_at: string;
}>): FarmOsProjectionCommandPersistencePlan {
  const reject = (failureCode: FarmOsProjectionCommandFailureCode) => rejectedPlan({
    command: input.command,
    command_hash: input.command_hash,
    committed_at: input.committed_at,
    failure_code: failureCode,
  });
  const candidate = projectionView(input.state, input.command.candidate_projection_id);
  if (candidate === null) return reject("candidate_not_found");
  const versionFailure = input.command.command_type === "review_projection_candidate"
    ? "review_version_conflict" as const
    : "candidate_version_conflict" as const;
  if (!versionMatches(candidate, input.command.expected_candidate_version)) {
    return reject(versionFailure);
  }
  if (!contentHashValid(input.state, candidate)) {
    return reject("content_hash_invalid");
  }

  if (input.command.command_type === "review_projection_candidate") {
    const eligible = input.command.decision === "request_rebuild"
      ? ["candidate", "rejected", "failed"].includes(candidate.state)
      : candidate.state === "candidate";
    if (!eligible) return reject("candidate_not_candidate");
    const latest = latestReview(
      input.state,
      candidate.projection.projection_id,
      candidate.projection.projection_version,
    );
    const currentSequence = latest?.review_sequence ?? 0;
    if (input.command.expected_review_sequence !== currentSequence) {
      return reject("review_version_conflict");
    }
    const review: FarmOsProjectionReviewDecisionRecord = {
      review_id: farmOsProjectionReviewId(input.command_hash),
      candidate_projection_id: candidate.projection.projection_id,
      candidate_projection_version: candidate.projection.projection_version,
      candidate_state_sequence: candidate.state_sequence,
      candidate_content_hash: candidate.projection.content_hash,
      review_sequence: currentSequence + 1,
      decision: input.command.decision,
      reason: input.command.reason,
      reviewed_by: input.command.reviewed_by,
      reviewed_at: input.command.reviewed_at,
      command_id: input.command.command_id,
      canonical_payload_hash: input.command_hash,
    };
    const payload = resultPayload({
      command: input.command,
      outcome: "succeeded",
      result_code: "review_recorded",
      review_decision_id: review.review_id,
      events: [],
    });
    return {
      receipt: receipt({
        command: input.command,
        command_hash: input.command_hash,
        committed_at: input.committed_at,
        payload,
        review_decision_id: review.review_id,
        events: [],
      }),
      review_decision: review,
      rebuild_projection: null,
      projection_events: [],
      rebuild_lineage: [],
    };
  }

  if (input.command.command_type === "promote_projection_candidate") {
    if (candidate.state !== "candidate") return reject("candidate_not_candidate");
    const review = matchingReview(input.state, input.command, "approve");
    if (typeof review === "string") return reject(review);
    if (input.command.approved_by !== review.reviewed_by) return reject("approval_invalid");
    const candidates = input.state.projections
      .filter((projection) => projection.projection_id !== candidate.projection.projection_id &&
        projection.projection_type === candidate.projection.projection_type &&
        projection.business_date === candidate.projection.business_date)
      .map((projection) => projectionView(input.state, projection.projection_id))
      .filter((view): view is ProjectionView => view !== null && view.state === "active");
    if (candidates.length > 1) return reject("multiple_active_conflict");
    const currentActive = candidates[0] ?? null;
    const activeMatch = activeMatches(currentActive, input.command.expected_active);
    if (activeMatch === "identity") return reject("active_identity_conflict");
    if (activeMatch === "version") return reject("active_version_conflict");
    const lineage = input.state.lineage.filter((row) =>
      row.projection_id === candidate.projection.projection_id
    );
    if (lineage.length === 0) return reject("lineage_invalid");
    const events: FarmOsProjectionCommandEventRecord[] = [];
    let sequence = nextEventSequence(input.state);
    if (currentActive !== null) {
      if (!validateFarmOsProjectionStateTransition({ from: "active", to: "superseded" }).valid) {
        return reject("invalid_state_transition");
      }
      events.push({
        event_id: farmOsProjectionCommandEventId(input.command_hash, 1),
        projection_id: currentActive.projection.projection_id,
        status: "superseded",
        sequence: sequence++,
        occurred_at: input.command.requested_at,
      });
    }
    if (!validateFarmOsProjectionStateTransition({ from: "candidate", to: "active" }).valid) {
      return reject("invalid_state_transition");
    }
    events.push({
      event_id: farmOsProjectionCommandEventId(input.command_hash, currentActive === null ? 1 : 2),
      projection_id: candidate.projection.projection_id,
      status: "active",
      sequence,
      occurred_at: input.command.requested_at,
    });
    const payload = resultPayload({
      command: input.command,
      outcome: "succeeded",
      result_code: "projection_promoted",
      review_decision_id: review.review_id,
      events,
    });
    return {
      receipt: receipt({ command: input.command, command_hash: input.command_hash,
        committed_at: input.committed_at, payload,
        review_decision_id: review.review_id, events }),
      review_decision: null,
      rebuild_projection: null,
      projection_events: events,
      rebuild_lineage: [],
    };
  }

  if (input.command.command_type === "reject_projection_candidate") {
    if (candidate.state !== "candidate") return reject("candidate_not_candidate");
    const review = matchingReview(input.state, input.command, "reject");
    if (typeof review === "string") return reject(review);
    if (!validateFarmOsProjectionStateTransition({ from: "candidate", to: "rejected" }).valid) {
      return reject("invalid_state_transition");
    }
    const events: FarmOsProjectionCommandEventRecord[] = [{
      event_id: farmOsProjectionCommandEventId(input.command_hash, 1),
      projection_id: candidate.projection.projection_id,
      status: "rejected",
      sequence: nextEventSequence(input.state),
      occurred_at: input.command.requested_at,
    }];
    const payload = resultPayload({
      command: input.command, outcome: "succeeded", result_code: "projection_rejected",
      review_decision_id: review.review_id, events,
    });
    return {
      receipt: receipt({ command: input.command, command_hash: input.command_hash,
        committed_at: input.committed_at, payload,
        review_decision_id: review.review_id, events }),
      review_decision: null,
      rebuild_projection: null,
      projection_events: events,
      rebuild_lineage: [],
    };
  }

  const review = matchingReview(input.state, input.command, "request_rebuild");
  if (typeof review === "string") return reject(review);
  const projectionVersion = Math.max(
    0,
    ...input.state.projections
      .filter((projection) => projection.business_date === candidate.projection.business_date)
      .map((projection) => projection.projection_version),
  ) + 1;
  const rebuilt = createFarmOsProjectionRebuildPlan({
    command: input.command,
    authorized_farm_scope: input.authority.authorized_farm_scope,
    reviewed_projection_key: {
      projection_type: candidate.projection.projection_type,
      business_date: candidate.projection.business_date,
    },
    projection_version: projectionVersion,
  });
  if (!rebuilt.ok) return reject(rebuilt.failure_code);
  const duplicate = input.state.projections.find((projection) =>
    projection.projection_id === rebuilt.plan.projection.projection_id
  );
  if (duplicate !== undefined) {
    return reject(isDeepStrictEqual(duplicate.content, rebuilt.plan.projection.projection_content)
      ? "rebuild_input_invalid"
      : "content_hash_invalid");
  }
  if (!validateFarmOsProjectionStateTransition({ from: null, to: "candidate" }).valid) {
    return reject("invalid_state_transition");
  }
  const events: FarmOsProjectionCommandEventRecord[] = [{
    ...rebuilt.plan.initial_event,
    sequence: nextEventSequence(input.state),
  }];
  const payload = resultPayload({
    command: input.command, outcome: "succeeded", result_code: "projection_rebuilt",
    review_decision_id: review.review_id, events,
  });
  return {
    receipt: receipt({ command: input.command, command_hash: input.command_hash,
      committed_at: input.committed_at, payload,
      review_decision_id: review.review_id, events }),
    review_decision: null,
    rebuild_projection: rebuilt.plan.projection,
    projection_events: events,
    rebuild_lineage: rebuilt.plan.lineage,
  };
}

export async function executeFarmOsProjectionCommand(input: Readonly<{
  command: unknown;
  authority: FarmOsProjectionCommandAuthority;
  repository: FarmOsProjectionCommandRepository;
  server_clock: Readonly<{ now(): string }>;
}>): Promise<FarmOsProjectionCommandServiceResult> {
  const parsed = parseFarmOsProjectionCommand(input.command);
  if (!parsed.valid) {
    return { ok: false, result_payload: null,
      failure_code: parsed.failure_code, persistence_attempted: false };
  }
  const authorizationFailure = validateFarmOsProjectionCommandAuthority(
    parsed.value,
    input.authority,
  );
  if (authorizationFailure !== null) {
    return { ok: false, result_payload: null,
      failure_code: authorizationFailure, persistence_attempted: false };
  }
  const committedAt = input.server_clock.now();
  const committedDate = new Date(committedAt);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(committedAt) ||
    !Number.isFinite(committedDate.getTime()) ||
    committedDate.toISOString() !== committedAt) {
    return { ok: false, result_payload: null,
      failure_code: "transaction_failed", persistence_attempted: false };
  }
  const commandHash = hashFarmOsProjectionCommand(parsed.value);
  const result = await input.repository.executeProjectionCommand({
    command_id: parsed.value.command_id,
    idempotency_key_hash: hashFarmOsProjectionIdempotencyKey(parsed.value.idempotency_key),
    command_type: parsed.value.command_type,
    canonical_payload_hash: commandHash,
    build_plan: (state) => buildPlan({
      command: parsed.value,
      authority: input.authority,
      state,
      command_hash: commandHash,
      committed_at: committedAt,
    }),
  });
  if (result.status === "rejected") {
    return { ok: false, result_payload: null,
      failure_code: result.failure_code, persistence_attempted: true };
  }
  if (result.result_payload.outcome === "rejected") {
    return { ok: false, result_payload: null,
      failure_code: result.result_payload.result_code as FarmOsProjectionCommandFailureCode,
      persistence_attempted: true };
  }
  return { ok: true, result_payload: result.result_payload,
    replayed: result.replayed, persistence_attempted: true };
}
