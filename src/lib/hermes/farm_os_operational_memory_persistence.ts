import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  parseFarmOsStableChangesPage,
  type FarmOsOperationalMemoryFailureCode,
  type FarmOsStableChange,
} from "./farm_os_operational_memory_contract";
import {
  compileFarmOsDailyProjection,
  createFarmOsSnapshotId,
  type FarmOsDailyProjectionContent,
  type FarmOsProjectionLineageDraft,
  type FarmOsSnapshotStateEvent,
  type FarmOsSourceSnapshot,
  type FarmOsSourceSnapshotState,
} from "./farm_os_operational_memory_compiler";

export type FarmOsDailyProjection = {
  projection_id: string;
  projection_type: "daily_work_records";
  projection_version: number;
  business_date: string;
  compiler_id: "farmos.operational_memory.daily_work_records";
  compiler_version: 1;
  content_hash: string;
  content: FarmOsDailyProjectionContent;
  generated_at: string;
  supersedes_projection_id: string | null;
};

export type FarmOsProjectionStateEvent = {
  event_id: string;
  projection_id: string;
  status: "active" | "superseded" | "failed";
  sequence: number;
  occurred_at: string;
};

export type FarmOsProjectionLineage = FarmOsProjectionLineageDraft & {
  projection_id: string;
};

export type FarmOsOperationalMemoryRejection = {
  rejection_id: string;
  source_record_id: string | null;
  failure_code: FarmOsOperationalMemoryFailureCode;
  observed_at: string;
};

export type FarmOsOperationalMemoryState = {
  snapshots: FarmOsSourceSnapshot[];
  snapshot_state_events: FarmOsSnapshotStateEvent[];
  projections: FarmOsDailyProjection[];
  projection_state_events: FarmOsProjectionStateEvent[];
  lineage: FarmOsProjectionLineage[];
  rejections: FarmOsOperationalMemoryRejection[];
  next_ingestion_sequence: number;
  next_event_sequence: number;
};

export type FarmOsOperationalMemoryOutcome = {
  source_record_id: string | null;
  status:
    | "accepted_change"
    | "duplicate_change_ignored"
    | "source_version_hash_conflict"
    | "rejected";
  failure_code: FarmOsOperationalMemoryFailureCode | null;
  snapshot_write_count: number;
  projection_write_count: number;
  lineage_write_count: number;
  affected_business_dates: string[];
};

export type FarmOsOperationalMemoryIngestionResult = {
  result: "success" | "rejected";
  outcomes: FarmOsOperationalMemoryOutcome[];
  safety: {
    business_sot: "farming_app";
    source_snapshot_is_business_sot: false;
    daily_projection_is_business_sot: false;
    farming_app_write_performed: false;
    production_db_operation_performed: false;
    linked_db_operation_performed: false;
    llm_used: false;
    human_correction_overlay_write_performed: false;
  };
};

type FailureInjection = "projection" | "lineage" | null;

const clone = <T>(value: T): T => structuredClone(value);
const OFFSET_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function createEmptyFarmOsOperationalMemoryState():
FarmOsOperationalMemoryState {
  return {
    snapshots: [],
    snapshot_state_events: [],
    projections: [],
    projection_state_events: [],
    lineage: [],
    rejections: [],
    next_ingestion_sequence: 1,
    next_event_sequence: 1,
  };
}

function snapshotState(
  state: FarmOsOperationalMemoryState,
  snapshotId: string,
): FarmOsSourceSnapshotState | null {
  return state.snapshot_state_events
    .filter((event) => event.snapshot_id === snapshotId)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.state ?? null;
}

function projectionState(
  state: FarmOsOperationalMemoryState,
  projectionId: string,
): FarmOsProjectionStateEvent["status"] | null {
  return state.projection_state_events
    .filter((event) => event.projection_id === projectionId)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.status ?? null;
}

function appendSnapshotState(
  state: FarmOsOperationalMemoryState,
  snapshotId: string,
  nextState: FarmOsSourceSnapshotState,
  occurredAt: string,
): void {
  const sequence = state.next_event_sequence++;
  state.snapshot_state_events.push({
    event_id: `snapshot_state_${sequence}`,
    snapshot_id: snapshotId,
    state: nextState,
    sequence,
    occurred_at: occurredAt,
  });
}

function appendProjectionState(
  state: FarmOsOperationalMemoryState,
  projectionId: string,
  status: FarmOsProjectionStateEvent["status"],
  occurredAt: string,
): void {
  const sequence = state.next_event_sequence++;
  state.projection_state_events.push({
    event_id: `projection_state_${sequence}`,
    projection_id: projectionId,
    status,
    sequence,
    occurred_at: occurredAt,
  });
}

function latestSnapshotForSource(
  state: FarmOsOperationalMemoryState,
  sourceRecordId: string,
): FarmOsSourceSnapshot | null {
  return state.snapshots
    .filter((snapshot) => snapshot.source_record_id === sourceRecordId)
    .sort((left, right) => left.ingestion_sequence - right.ingestion_sequence)
    .at(-1) ?? null;
}

function activeProjectionForDate(
  state: FarmOsOperationalMemoryState,
  businessDate: string,
): FarmOsDailyProjection | null {
  return state.projections
    .filter((projection) =>
      projection.business_date === businessDate &&
      projectionState(state, projection.projection_id) === "active"
    )
    .sort((left, right) => left.projection_version - right.projection_version)
    .at(-1) ?? null;
}

function rejection(
  state: FarmOsOperationalMemoryState,
  input: {
    source_record_id: string | null;
    failure_code: FarmOsOperationalMemoryFailureCode;
    observed_at: string;
  },
): void {
  state.rejections.push({
    rejection_id: `rejection_${state.rejections.length + 1}`,
    ...input,
  });
}

export class FarmOsInMemoryOperationalMemoryRepository {
  private state: FarmOsOperationalMemoryState;
  private failOnce: FailureInjection = null;

  constructor(initialState: FarmOsOperationalMemoryState =
    createEmptyFarmOsOperationalMemoryState()) {
    this.state = clone(initialState);
  }

  injectFailureOnce(stage: Exclude<FailureInjection, null>): void {
    this.failOnce = stage;
  }

  consumeFailure(stage: Exclude<FailureInjection, null>): boolean {
    if (this.failOnce !== stage) return false;
    this.failOnce = null;
    return true;
  }

  transact<T>(callback: (draft: FarmOsOperationalMemoryState) => T): T {
    const draft = clone(this.state);
    const result = callback(draft);
    this.state = draft;
    return result;
  }

  snapshot(): FarmOsOperationalMemoryState {
    return clone(this.state);
  }
}

function duplicateOrConflict(
  state: FarmOsOperationalMemoryState,
  change: FarmOsStableChange,
): "duplicate" | "conflict" | null {
  const candidates = state.snapshots.filter((snapshot) =>
    snapshot.source_record_id === change.source_record_id
  );
  if (change.source_record_version !== null) {
    const sameVersion = candidates.find((snapshot) =>
      snapshot.source_record_version === change.source_record_version
    );
    if (sameVersion === undefined) return null;
    return sameVersion.source_content_hash === change.source_content_hash
      ? "duplicate"
      : "conflict";
  }
  return candidates.some((snapshot) =>
    snapshot.source_record_version === null &&
    snapshot.source_content_hash === change.source_content_hash
  )
    ? "duplicate"
    : null;
}

function persistProjection(input: {
  state: FarmOsOperationalMemoryState;
  repository: FarmOsInMemoryOperationalMemoryRepository;
  business_date: string;
  generated_at: string;
}): { projectionWrites: number; lineageWrites: number } {
  if (input.repository.consumeFailure("projection")) {
    throw new Error("projection_generation_failed");
  }
  const compiled = compileFarmOsDailyProjection({
    business_date: input.business_date,
    snapshots: input.state.snapshots,
    snapshot_state_events: input.state.snapshot_state_events,
  });
  const previous = activeProjectionForDate(input.state, input.business_date);
  const projectionVersion =
    Math.max(
      0,
      ...input.state.projections
        .filter((projection) => projection.business_date === input.business_date)
        .map((projection) => projection.projection_version),
    ) + 1;
  if (previous !== null) {
    appendProjectionState(
      input.state,
      previous.projection_id,
      "superseded",
      input.generated_at,
    );
  }
  const projectionId =
    `daily_projection_${input.business_date}_${projectionVersion}_${compiled.content_hash.slice(0, 12)}`;
  input.state.projections.push({
    projection_id: projectionId,
    projection_type: "daily_work_records",
    projection_version: projectionVersion,
    business_date: input.business_date,
    compiler_id: compiled.compiler_id,
    compiler_version: compiled.compiler_version,
    content_hash: compiled.content_hash,
    content: compiled.content,
    generated_at: input.generated_at,
    supersedes_projection_id: previous?.projection_id ?? null,
  });
  appendProjectionState(input.state, projectionId, "active", input.generated_at);
  if (input.repository.consumeFailure("lineage")) {
    throw new Error("lineage_write_failed");
  }
  for (const lineage of compiled.lineage) {
    input.state.lineage.push({ projection_id: projectionId, ...lineage });
  }
  return {
    projectionWrites: 1,
    lineageWrites: compiled.lineage.length,
  };
}

function safeResult(
  result: "success" | "rejected",
  outcomes: FarmOsOperationalMemoryOutcome[],
): FarmOsOperationalMemoryIngestionResult {
  return {
    result,
    outcomes,
    safety: {
      business_sot: "farming_app",
      source_snapshot_is_business_sot: false,
      daily_projection_is_business_sot: false,
      farming_app_write_performed: false,
      production_db_operation_performed: false,
      linked_db_operation_performed: false,
      llm_used: false,
      human_correction_overlay_write_performed: false,
    },
  };
}

export function ingestFarmOsStableChanges(input: {
  page: unknown;
  observed_at: string;
  repository: FarmOsInMemoryOperationalMemoryRepository;
}): FarmOsOperationalMemoryIngestionResult {
  const parsed = parseFarmOsStableChangesPage(input.page);
  if (!parsed.valid) {
    return safeResult("rejected", [{
      source_record_id: null,
      status: "rejected",
      failure_code: parsed.failure_code,
      snapshot_write_count: 0,
      projection_write_count: 0,
      lineage_write_count: 0,
      affected_business_dates: [],
    }]);
  }
  if (
    !OFFSET_TIMESTAMP_PATTERN.test(input.observed_at) ||
    !Number.isFinite(Date.parse(input.observed_at))
  ) {
    return safeResult("rejected", [{
      source_record_id: null,
      status: "rejected",
      failure_code: "invalid_timestamp",
      snapshot_write_count: 0,
      projection_write_count: 0,
      lineage_write_count: 0,
      affected_business_dates: [],
    }]);
  }

  const outcomes: FarmOsOperationalMemoryOutcome[] = [];
  for (const change of parsed.value.changes) {
    const before = input.repository.snapshot();
    const decision = duplicateOrConflict(before, change);
    if (decision === "duplicate") {
      outcomes.push({
        source_record_id: change.source_record_id,
        status: "duplicate_change_ignored",
        failure_code: null,
        snapshot_write_count: 0,
        projection_write_count: 0,
        lineage_write_count: 0,
        affected_business_dates: [],
      });
      continue;
    }
    if (decision === "conflict") {
      input.repository.transact((draft) => {
        rejection(draft, {
          source_record_id: change.source_record_id,
          failure_code: "source_version_hash_conflict",
          observed_at: input.observed_at,
        });
      });
      outcomes.push({
        source_record_id: change.source_record_id,
        status: "source_version_hash_conflict",
        failure_code: "source_version_hash_conflict",
        snapshot_write_count: 0,
        projection_write_count: 0,
        lineage_write_count: 0,
        affected_business_dates: [],
      });
      continue;
    }

    try {
      const outcome = input.repository.transact((draft) => {
        const previous = latestSnapshotForSource(draft, change.source_record_id);
        if (
          previous?.source_record_version !== null &&
          previous?.source_record_version !== undefined &&
          change.source_record_version !== null &&
          change.source_record_version < previous.source_record_version
        ) {
          throw new Error("invalid_change");
        }
        const ingestionSequence = draft.next_ingestion_sequence++;
        const snapshotId = createFarmOsSnapshotId(change);
        const snapshot: FarmOsSourceSnapshot = {
          snapshot_id: snapshotId,
          contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
          source_system: "farming_app",
          ...change,
          safe_payload: {},
          observed_at: input.observed_at,
          ingestion_sequence: ingestionSequence,
          initial_state: change.operation === "tombstone"
            ? "tombstoned"
            : "active",
          supersedes_snapshot_id: previous?.snapshot_id ?? null,
          rejection_code: null,
        };
        draft.snapshots.push(snapshot);
        if (previous !== null) {
          appendSnapshotState(
            draft,
            previous.snapshot_id,
            "superseded",
            input.observed_at,
          );
        }
        appendSnapshotState(
          draft,
          snapshot.snapshot_id,
          snapshot.initial_state,
          input.observed_at,
        );
        const affectedDates = [...new Set([
          previous?.business_date,
          snapshot.business_date,
        ].filter((date): date is string => date !== undefined))].sort();
        let projectionWrites = 0;
        let lineageWrites = 0;
        for (const businessDate of affectedDates) {
          const persisted = persistProjection({
            state: draft,
            repository: input.repository,
            business_date: businessDate,
            generated_at: input.observed_at,
          });
          projectionWrites += persisted.projectionWrites;
          lineageWrites += persisted.lineageWrites;
        }
        return {
          source_record_id: change.source_record_id,
          status: "accepted_change" as const,
          failure_code: null,
          snapshot_write_count: 1,
          projection_write_count: projectionWrites,
          lineage_write_count: lineageWrites,
          affected_business_dates: affectedDates,
        };
      });
      outcomes.push(outcome);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const failureCode: FarmOsOperationalMemoryFailureCode =
        message === "projection_generation_failed"
          ? "projection_generation_failed"
          : message === "lineage_write_failed"
          ? "lineage_write_failed"
          : message === "invalid_change"
          ? "invalid_change"
          : "unexpected_error";
      outcomes.push({
        source_record_id: change.source_record_id,
        status: "rejected",
        failure_code: failureCode,
        snapshot_write_count: 0,
        projection_write_count: 0,
        lineage_write_count: 0,
        affected_business_dates: [],
      });
    }
  }
  return safeResult(
    outcomes.some(
      (outcome) =>
        outcome.status === "rejected" ||
        outcome.status === "source_version_hash_conflict",
    )
      ? "rejected"
      : "success",
    outcomes,
  );
}

export function materializeFarmOsSnapshotStates(
  state: FarmOsOperationalMemoryState,
): Array<FarmOsSourceSnapshot & { state: FarmOsSourceSnapshotState }> {
  return state.snapshots.map((snapshot) => ({
    ...clone(snapshot),
    state: snapshotState(state, snapshot.snapshot_id) ??
      snapshot.initial_state,
  }));
}

export function materializeFarmOsProjectionStates(
  state: FarmOsOperationalMemoryState,
): Array<FarmOsDailyProjection & {
  status: FarmOsProjectionStateEvent["status"];
}> {
  return state.projections.map((projection) => ({
    ...clone(projection),
    status: projectionState(state, projection.projection_id) ?? "failed",
  }));
}

export function rebuildFarmOsDailyProjectionShadow(input: {
  state: FarmOsOperationalMemoryState;
  business_date: string;
}): ReturnType<typeof compileFarmOsDailyProjection> {
  return compileFarmOsDailyProjection({
    business_date: input.business_date,
    snapshots: input.state.snapshots,
    snapshot_state_events: input.state.snapshot_state_events,
  });
}
