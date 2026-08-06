import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
} from "./farm_os_operational_memory_contract";
import {
  compileFarmOsDailyProjection,
  type FarmOsSnapshotStateEvent,
  type FarmOsSourceSnapshot,
  type FarmOsSourceSnapshotState,
} from "./farm_os_operational_memory_compiler";
import type {
  FarmOsDailyProjection,
  FarmOsProjectionLineage,
  FarmOsProjectionStateEvent,
} from "./farm_os_operational_memory_persistence";
import type {
  FarmOsProjectionFirstGuardFailureCode,
} from "./farm_os_projection_first_contract";
import {
  isFarmOsProjectionFirstCalendarDate,
  isFarmOsProjectionFirstTimestamp,
} from "./farm_os_projection_first_contract";
import {
  materializeFarmOsProjectionStateHistory,
} from "./farm_os_projection_state_contract";
import { isDeepStrictEqual } from "node:util";

export type FarmOsProjectionFirstScopedBundle = {
  farm_scope: string;
  business_date: string;
  full_history_scan_performed: false;
  projections: FarmOsDailyProjection[];
  projection_state_events: FarmOsProjectionStateEvent[];
  lineage: FarmOsProjectionLineage[];
  snapshots: FarmOsSourceSnapshot[];
  snapshot_state_events: FarmOsSnapshotStateEvent[];
};

export type FarmOsProjectionFirstSelection =
  | {
    result: "selected";
    projection: FarmOsDailyProjection;
    lineage: FarmOsProjectionLineage[];
    snapshots: FarmOsSourceSnapshot[];
    failure_code: null;
  }
  | {
    result: "projection_missing" | "projection_stale" | "projection_unavailable";
    projection: FarmOsDailyProjection | null;
    lineage: [];
    snapshots: [];
    failure_code: FarmOsProjectionFirstGuardFailureCode;
  };

export type FarmOsProjectionFirstActiveProjectionResolution =
  | {
    result: "selected";
    projection_id: string;
  }
  | {
    result: "projection_missing" | "projection_unavailable";
    projection_id: null;
  };

type JsonRecord = Record<string, unknown>;

const PROJECTION_KEYS = [
  "projection_id",
  "projection_type",
  "projection_version",
  "business_date",
  "compiler_id",
  "compiler_version",
  "content_hash",
  "content",
  "generated_at",
  "supersedes_projection_id",
] as const;
const CONTENT_KEYS = [
  "business_date",
  "source_record_count",
  "active_record_count",
  "tombstone_count",
  "field_references",
  "crop_cycle_references",
  "work_type_references",
  "verification_status",
  "missing_data_status",
] as const;
const LINEAGE_KEYS = [
  "projection_id",
  "snapshot_id",
  "source_record_id",
  "source_content_hash",
  "relation",
] as const;
const SNAPSHOT_KEYS = [
  "snapshot_id",
  "contract_version",
  "source_system",
  "source_record_id",
  "source_record_version",
  "source_content_hash",
  "operation",
  "business_date",
  "recorded_at",
  "source_updated_at",
  "deleted_at",
  "field_reference",
  "crop_cycle_reference",
  "work_type_reference",
  "safe_payload",
  "observed_at",
  "ingestion_sequence",
  "initial_state",
  "supersedes_snapshot_id",
  "rejection_code",
] as const;
const SNAPSHOT_EVENT_KEYS = [
  "event_id",
  "snapshot_id",
  "state",
  "sequence",
  "occurred_at",
] as const;
const PROJECTION_EVENT_KEYS = [
  "event_id",
  "projection_id",
  "status",
  "sequence",
  "occurred_at",
] as const;
const SCOPED_BUNDLE_KEYS = [
  "farm_scope",
  "business_date",
  "full_history_scan_performed",
  "projections",
  "projection_state_events",
  "lineage",
  "snapshots",
  "snapshot_state_events",
] as const;
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((entry) => typeof entry === "string" && ID_PATTERN.test(entry)) &&
    new Set(value).size === value.length;
}

function validProjection(value: unknown): value is FarmOsDailyProjection {
  if (!isRecord(value) || !exact(value, PROJECTION_KEYS)) return false;
  const content = value.content;
  return value.projection_type === "daily_work_records" &&
    typeof value.projection_id === "string" &&
    ID_PATTERN.test(value.projection_id) &&
    Number.isSafeInteger(value.projection_version) &&
    Number(value.projection_version) >= 1 &&
    typeof value.business_date === "string" &&
    value.compiler_id === FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID &&
    value.compiler_version === FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION &&
    typeof value.content_hash === "string" &&
    HASH_PATTERN.test(value.content_hash) &&
    typeof value.generated_at === "string" &&
    Number.isFinite(Date.parse(value.generated_at)) &&
    (value.supersedes_projection_id === null ||
      (typeof value.supersedes_projection_id === "string" &&
        ID_PATTERN.test(value.supersedes_projection_id))) &&
    isRecord(content) &&
    exact(content, CONTENT_KEYS) &&
    content.business_date === value.business_date &&
    Number.isSafeInteger(content.source_record_count) &&
    Number(content.source_record_count) >= 0 &&
    Number.isSafeInteger(content.active_record_count) &&
    Number(content.active_record_count) >= 0 &&
    Number.isSafeInteger(content.tombstone_count) &&
    Number(content.tombstone_count) >= 0 &&
    Number(content.source_record_count) ===
      Number(content.active_record_count) + Number(content.tombstone_count) &&
    strings(content.field_references) &&
    strings(content.crop_cycle_references) &&
    strings(content.work_type_references) &&
    content.verification_status === "stable_change_contract_validated" &&
    (content.missing_data_status === "complete_for_v1" ||
      content.missing_data_status === "optional_references_missing");
}

function validLineage(value: unknown): value is FarmOsProjectionLineage {
  return isRecord(value) &&
    exact(value, LINEAGE_KEYS) &&
    typeof value.projection_id === "string" &&
    ID_PATTERN.test(value.projection_id) &&
    typeof value.snapshot_id === "string" &&
    ID_PATTERN.test(value.snapshot_id) &&
    typeof value.source_record_id === "string" &&
    ID_PATTERN.test(value.source_record_id) &&
    (value.source_content_hash === null ||
      (typeof value.source_content_hash === "string" &&
        HASH_PATTERN.test(value.source_content_hash))) &&
    (value.relation === "included" ||
      value.relation === "excluded_by_tombstone" ||
      value.relation === "superseded");
}

function nullableReference(value: unknown): value is string | null {
  return value === null ||
    (typeof value === "string" && ID_PATTERN.test(value));
}

function validSnapshot(value: unknown): value is FarmOsSourceSnapshot {
  return isRecord(value) &&
    exact(value, SNAPSHOT_KEYS) &&
    typeof value.snapshot_id === "string" &&
    ID_PATTERN.test(value.snapshot_id) &&
    value.contract_version === "farming_app.work_records.stable_changes.v1" &&
    value.source_system === "farming_app" &&
    typeof value.source_record_id === "string" &&
    ID_PATTERN.test(value.source_record_id) &&
    (value.source_record_version === null ||
      (Number.isSafeInteger(value.source_record_version) &&
        Number(value.source_record_version) >= 0)) &&
    (value.source_content_hash === null ||
      (typeof value.source_content_hash === "string" &&
        HASH_PATTERN.test(value.source_content_hash))) &&
    (value.operation === "upsert" || value.operation === "tombstone") &&
    isFarmOsProjectionFirstCalendarDate(value.business_date) &&
    (value.recorded_at === null ||
      isFarmOsProjectionFirstTimestamp(value.recorded_at)) &&
    isFarmOsProjectionFirstTimestamp(value.source_updated_at) &&
    (value.deleted_at === null ||
      isFarmOsProjectionFirstTimestamp(value.deleted_at)) &&
    nullableReference(value.field_reference) &&
    nullableReference(value.crop_cycle_reference) &&
    nullableReference(value.work_type_reference) &&
    isRecord(value.safe_payload) &&
    Object.keys(value.safe_payload).length === 0 &&
    isFarmOsProjectionFirstTimestamp(value.observed_at) &&
    Number.isSafeInteger(value.ingestion_sequence) &&
    Number(value.ingestion_sequence) >= 1 &&
    (value.initial_state === "active" || value.initial_state === "tombstoned") &&
    nullableReference(value.supersedes_snapshot_id) &&
    value.rejection_code === null;
}

function validSnapshotEvent(value: unknown): value is FarmOsSnapshotStateEvent {
  return isRecord(value) &&
    exact(value, SNAPSHOT_EVENT_KEYS) &&
    typeof value.event_id === "string" &&
    ID_PATTERN.test(value.event_id) &&
    typeof value.snapshot_id === "string" &&
    ID_PATTERN.test(value.snapshot_id) &&
    (value.state === "active" ||
      value.state === "superseded" ||
      value.state === "tombstoned" ||
      value.state === "rejected") &&
    Number.isSafeInteger(value.sequence) &&
    Number(value.sequence) >= 1 &&
    isFarmOsProjectionFirstTimestamp(value.occurred_at);
}

function validProjectionEvent(
  value: unknown,
): value is FarmOsProjectionStateEvent {
  return isRecord(value) &&
    exact(value, PROJECTION_EVENT_KEYS) &&
    typeof value.event_id === "string" &&
    ID_PATTERN.test(value.event_id) &&
    typeof value.projection_id === "string" &&
    ID_PATTERN.test(value.projection_id) &&
    typeof value.status === "string" &&
    Number.isSafeInteger(value.sequence) &&
    Number(value.sequence) >= 1 &&
    isFarmOsProjectionFirstTimestamp(value.occurred_at);
}

function canonicalLineage(
  values: Array<Pick<
    FarmOsProjectionLineage,
    "snapshot_id" | "source_record_id" | "source_content_hash" | "relation"
  >>,
): string {
  return JSON.stringify(values
    .map((value) => ({
      snapshot_id: value.snapshot_id,
      source_record_id: value.source_record_id,
      source_content_hash: value.source_content_hash,
      relation: value.relation,
    }))
    .sort((left, right) => left.snapshot_id.localeCompare(right.snapshot_id, "en")));
}

function latestSnapshotState(
  snapshotId: string,
  events: FarmOsSnapshotStateEvent[],
): FarmOsSourceSnapshotState | null {
  const matching = events.filter((event) => event.snapshot_id === snapshotId);
  if (new Set(matching.map((event) => event.sequence)).size !== matching.length) {
    return null;
  }
  return matching.sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.state ?? null;
}

function unavailable(
  projection: FarmOsDailyProjection | null,
  failureCode: FarmOsProjectionFirstGuardFailureCode,
): FarmOsProjectionFirstSelection {
  return {
    result: "projection_unavailable",
    projection,
    lineage: [],
    snapshots: [],
    failure_code: failureCode,
  };
}

export function resolveFarmOsProjectionFirstActiveProjection(input: {
  business_date: string;
  projections: readonly Pick<
    FarmOsDailyProjection,
    "projection_id" | "business_date"
  >[];
  projection_state_events: readonly FarmOsProjectionStateEvent[];
}): FarmOsProjectionFirstActiveProjectionResolution {
  const exactDate = input.projections.filter((projection) =>
    projection.business_date === input.business_date
  );
  if (exactDate.length === 0) {
    return { result: "projection_missing", projection_id: null };
  }

  const projectionIds = new Set(
    exactDate.map((projection) => projection.projection_id),
  );
  const relevantEvents = input.projection_state_events.filter((event) =>
    projectionIds.has(event.projection_id)
  );
  if (
    new Set(relevantEvents.map((event) => event.event_id)).size !==
      relevantEvents.length
  ) {
    return { result: "projection_unavailable", projection_id: null };
  }

  const activeProjectionIds: string[] = [];
  for (const projection of exactDate) {
    const materialization = materializeFarmOsProjectionStateHistory(
      relevantEvents
        .filter((event) => event.projection_id === projection.projection_id)
        .map((event) => ({
          event_id: event.event_id,
          status: event.status,
          sequence: event.sequence,
        })),
    );
    if (materialization.result === "invalid_state_history") {
      return { result: "projection_unavailable", projection_id: null };
    }
    if (materialization.persisted_state === "active") {
      activeProjectionIds.push(projection.projection_id);
    }
  }

  return activeProjectionIds.length === 0
    ? { result: "projection_missing", projection_id: null }
    : activeProjectionIds.length === 1
    ? { result: "selected", projection_id: activeProjectionIds[0]! }
    : { result: "projection_unavailable", projection_id: null };
}

export function selectFarmOsProjectionFirstProjection(input: {
  authorized_farm_scope: string;
  business_date: string;
  bundle: FarmOsProjectionFirstScopedBundle;
}): FarmOsProjectionFirstSelection {
  const projectionIds = new Set(
    input.bundle.projections.map((projection) => projection.projection_id),
  );
  const snapshotIds = new Set(
    input.bundle.snapshots.map((snapshot) => snapshot.snapshot_id),
  );
  if (
    input.bundle.farm_scope !== input.authorized_farm_scope ||
    input.bundle.business_date !== input.business_date ||
    input.bundle.full_history_scan_performed !== false ||
    input.bundle.projections.some((projection) => !validProjection(projection)) ||
    input.bundle.projection_state_events.some((event) =>
      !validProjectionEvent(event)
    ) ||
    input.bundle.lineage.some((lineage) => !validLineage(lineage)) ||
    input.bundle.snapshots.some((snapshot) => !validSnapshot(snapshot)) ||
    input.bundle.snapshot_state_events.some((event) =>
      !validSnapshotEvent(event)
    ) ||
    projectionIds.size !== input.bundle.projections.length ||
    snapshotIds.size !== input.bundle.snapshots.length ||
    new Set(input.bundle.projection_state_events.map((event) => event.event_id))
        .size !== input.bundle.projection_state_events.length ||
    input.bundle.projection_state_events.some((event) =>
      !projectionIds.has(event.projection_id)
    ) ||
    new Set(input.bundle.snapshot_state_events.map((event) => event.event_id))
        .size !== input.bundle.snapshot_state_events.length ||
    new Set(input.bundle.snapshot_state_events.map((event) => event.sequence))
        .size !== input.bundle.snapshot_state_events.length ||
    input.bundle.lineage.some((entry) =>
      !projectionIds.has(entry.projection_id)
    )
  ) {
    return unavailable(null, "projection_contract_invalid");
  }
  const exactDate = input.bundle.projections.filter((projection) =>
    projection.business_date === input.business_date
  );
  if (exactDate.length === 0) {
    return {
      result: "projection_missing",
      projection: null,
      lineage: [],
      snapshots: [],
      failure_code: "projection_not_found",
    };
  }
  const resolution = resolveFarmOsProjectionFirstActiveProjection({
    business_date: input.business_date,
    projections: exactDate,
    projection_state_events: input.bundle.projection_state_events,
  });
  if (resolution.result === "projection_unavailable") {
    return unavailable(null, "projection_contract_invalid");
  }
  if (resolution.result === "projection_missing") {
    return {
      result: "projection_missing",
      projection: null,
      lineage: [],
      snapshots: [],
      failure_code: "projection_not_found",
    };
  }
  const projection = exactDate.find((candidate) =>
    candidate.projection_id === resolution.projection_id
  )!;
  if (
    projection.compiler_id !== FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID ||
    projection.compiler_version !== FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION
  ) {
    return unavailable(projection, "projection_contract_invalid");
  }
  const lineage = input.bundle.lineage.filter((entry) =>
    entry.projection_id === projection.projection_id
  );
  if (
    new Set(lineage.map((entry) => entry.snapshot_id)).size !== lineage.length ||
    new Set(lineage.map((entry) =>
      `${entry.source_record_id}:${entry.snapshot_id}:${entry.relation}`
    )).size !== lineage.length
  ) {
    return unavailable(projection, "projection_lineage_invalid");
  }
  if (projection.content.source_record_count > 0 && lineage.length === 0) {
    return {
      result: "projection_stale",
      projection,
      lineage: [],
      snapshots: [],
      failure_code: "projection_stale",
    };
  }
  const snapshotById = new Map(
    input.bundle.snapshots.map((snapshot) => [snapshot.snapshot_id, snapshot]),
  );
  if (snapshotById.size !== input.bundle.snapshots.length) {
    return unavailable(projection, "projection_lineage_invalid");
  }
  const latestBySource = new Map<string, FarmOsSourceSnapshot>();
  for (const snapshot of input.bundle.snapshots) {
    const current = latestBySource.get(snapshot.source_record_id);
    if (
      current?.ingestion_sequence === snapshot.ingestion_sequence &&
      current.snapshot_id !== snapshot.snapshot_id
    ) {
      return unavailable(projection, "projection_lineage_invalid");
    }
    if (
      current === undefined ||
      current.ingestion_sequence < snapshot.ingestion_sequence
    ) {
      latestBySource.set(snapshot.source_record_id, snapshot);
    }
  }
  for (const entry of lineage) {
    const snapshot = snapshotById.get(entry.snapshot_id);
    if (
      snapshot === undefined ||
      snapshot.business_date !== input.business_date ||
      snapshot.source_record_id !== entry.source_record_id ||
      snapshot.source_content_hash !== entry.source_content_hash
    ) {
      return {
        result: "projection_stale",
        projection,
        lineage: [],
        snapshots: [],
        failure_code: "projection_stale",
      };
    }
    const state = latestSnapshotState(
      snapshot.snapshot_id,
      input.bundle.snapshot_state_events,
    );
    const latest = latestBySource.get(snapshot.source_record_id);
    const expectedRelation = latest?.snapshot_id !== snapshot.snapshot_id ||
        state === "superseded"
      ? "superseded"
      : state === "tombstoned"
      ? "excluded_by_tombstone"
      : state === "active"
      ? "included"
      : null;
    if (expectedRelation === null || expectedRelation !== entry.relation) {
      return {
        result: "projection_stale",
        projection,
        lineage: [],
        snapshots: [],
        failure_code: "projection_stale",
      };
    }
  }
  const latestForDate = input.bundle.snapshots.filter((snapshot) =>
    snapshot.business_date === input.business_date &&
    latestBySource.get(snapshot.source_record_id)?.snapshot_id ===
      snapshot.snapshot_id
  );
  if (
    latestForDate.some((snapshot) =>
      !lineage.some((entry) => entry.snapshot_id === snapshot.snapshot_id)
    )
  ) {
    return {
      result: "projection_stale",
      projection,
      lineage: [],
      snapshots: [],
      failure_code: "projection_stale",
    };
  }
  const rebuilt = compileFarmOsDailyProjection({
    business_date: input.business_date,
    snapshots: input.bundle.snapshots,
    snapshot_state_events: input.bundle.snapshot_state_events,
  });
  if (
    rebuilt.content_hash !== projection.content_hash ||
    !isDeepStrictEqual(rebuilt.content, projection.content) ||
    canonicalLineage(rebuilt.lineage) !== canonicalLineage(lineage)
  ) {
    return {
      result: "projection_stale",
      projection,
      lineage: [],
      snapshots: [],
      failure_code: "projection_stale",
    };
  }
  return {
    result: "selected",
    projection,
    lineage,
    snapshots: lineage
      .map((entry) => snapshotById.get(entry.snapshot_id))
      .filter((snapshot): snapshot is FarmOsSourceSnapshot =>
        snapshot !== undefined
      ),
    failure_code: null,
  };
}

export function isFarmOsProjectionFirstExactDateScopedBundle(
  value: unknown,
  expected: { farm_scope: string; business_date: string },
): value is FarmOsProjectionFirstScopedBundle {
  if (!isRecord(value) || !exact(value, SCOPED_BUNDLE_KEYS) ||
    value.farm_scope !== expected.farm_scope ||
    value.business_date !== expected.business_date ||
    value.full_history_scan_performed !== false ||
    !Array.isArray(value.projections) ||
    !Array.isArray(value.projection_state_events) ||
    !Array.isArray(value.lineage) ||
    !Array.isArray(value.snapshots) ||
    !Array.isArray(value.snapshot_state_events) ||
    !isFarmOsProjectionFirstCalendarDate(expected.business_date) ||
    value.projections.some((projection) =>
      !validProjection(projection) ||
      projection.business_date !== expected.business_date
    ) ||
    value.projection_state_events.some((event) => !validProjectionEvent(event)) ||
    value.lineage.some((entry) => !validLineage(entry)) ||
    value.snapshots.some((snapshot) =>
      !validSnapshot(snapshot) || snapshot.business_date !== expected.business_date
    ) ||
    value.snapshot_state_events.some((event) => !validSnapshotEvent(event))) {
    return false;
  }
  const bundle = value as FarmOsProjectionFirstScopedBundle;
  const projectionIds = new Set(
    bundle.projections.map((projection) => projection.projection_id),
  );
  const snapshotIds = new Set(
    bundle.snapshots.map((snapshot) => snapshot.snapshot_id),
  );
  return projectionIds.size === bundle.projections.length &&
    snapshotIds.size === bundle.snapshots.length &&
    bundle.projection_state_events.every((event) =>
      projectionIds.has(event.projection_id)
    ) &&
    bundle.lineage.every((entry) => projectionIds.has(entry.projection_id));
}
