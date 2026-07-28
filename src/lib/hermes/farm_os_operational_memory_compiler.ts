import { createHash } from "node:crypto";

import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
} from "./farm_os_operational_memory_contract";

export type FarmOsSourceSnapshotState =
  | "active"
  | "superseded"
  | "tombstoned"
  | "rejected";

export type FarmOsSourceSnapshot = {
  snapshot_id: string;
  contract_version: "farming_app.work_records.stable_changes.v1";
  source_system: "farming_app";
  source_record_id: string;
  source_record_version: number | null;
  source_content_hash: string | null;
  operation: "upsert" | "tombstone";
  business_date: string;
  recorded_at: string | null;
  source_updated_at: string;
  deleted_at: string | null;
  field_reference: string | null;
  crop_cycle_reference: string | null;
  work_type_reference: string | null;
  safe_payload: Record<string, never>;
  observed_at: string;
  ingestion_sequence: number;
  initial_state: "active" | "tombstoned";
  supersedes_snapshot_id: string | null;
  rejection_code: null;
};

export type FarmOsSnapshotStateEvent = {
  event_id: string;
  snapshot_id: string;
  state: FarmOsSourceSnapshotState;
  sequence: number;
  occurred_at: string;
};

export type FarmOsDailyProjectionContent = {
  business_date: string;
  source_record_count: number;
  active_record_count: number;
  tombstone_count: number;
  field_references: string[];
  crop_cycle_references: string[];
  work_type_references: string[];
  verification_status: "stable_change_contract_validated";
  missing_data_status: "complete_for_v1" | "optional_references_missing";
};

export type FarmOsProjectionLineageDraft = {
  snapshot_id: string;
  source_record_id: string;
  source_content_hash: string | null;
  relation: "included" | "excluded_by_tombstone" | "superseded";
};

export type FarmOsCompiledDailyProjection = {
  compiler_id: typeof FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID;
  compiler_version: typeof FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION;
  deterministic: true;
  llm_used: false;
  content: FarmOsDailyProjectionContent;
  content_hash: string;
  lineage: FarmOsProjectionLineageDraft[];
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(record[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function uniqueSorted(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function currentState(
  snapshotId: string,
  events: FarmOsSnapshotStateEvent[],
): FarmOsSourceSnapshotState | null {
  return events
    .filter((event) => event.snapshot_id === snapshotId)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.state ?? null;
}

export function compileFarmOsDailyProjection(input: {
  business_date: string;
  snapshots: FarmOsSourceSnapshot[];
  snapshot_state_events: FarmOsSnapshotStateEvent[];
}): FarmOsCompiledDailyProjection {
  const snapshotsForDate = input.snapshots
    .filter((snapshot) => snapshot.business_date === input.business_date)
    .sort((left, right) =>
      left.ingestion_sequence - right.ingestion_sequence ||
      left.snapshot_id.localeCompare(right.snapshot_id, "en")
    );
  const latestBySource = new Map<string, FarmOsSourceSnapshot>();
  for (const snapshot of input.snapshots
    .slice()
    .sort((left, right) => left.ingestion_sequence - right.ingestion_sequence)) {
    latestBySource.set(snapshot.source_record_id, snapshot);
  }
  const active = snapshotsForDate.filter((snapshot) =>
    latestBySource.get(snapshot.source_record_id)?.snapshot_id ===
      snapshot.snapshot_id &&
    currentState(snapshot.snapshot_id, input.snapshot_state_events) === "active"
  );
  const tombstones = snapshotsForDate.filter((snapshot) =>
    latestBySource.get(snapshot.source_record_id)?.snapshot_id ===
      snapshot.snapshot_id &&
    currentState(snapshot.snapshot_id, input.snapshot_state_events) ===
      "tombstoned"
  );
  const content: FarmOsDailyProjectionContent = {
    business_date: input.business_date,
    source_record_count: active.length + tombstones.length,
    active_record_count: active.length,
    tombstone_count: tombstones.length,
    field_references: uniqueSorted(active.map((snapshot) => snapshot.field_reference)),
    crop_cycle_references: uniqueSorted(
      active.map((snapshot) => snapshot.crop_cycle_reference),
    ),
    work_type_references: uniqueSorted(
      active.map((snapshot) => snapshot.work_type_reference),
    ),
    verification_status: "stable_change_contract_validated",
    missing_data_status: active.some((snapshot) =>
      snapshot.field_reference === null ||
      snapshot.crop_cycle_reference === null ||
      snapshot.work_type_reference === null
    )
      ? "optional_references_missing"
      : "complete_for_v1",
  };
  const lineage: FarmOsProjectionLineageDraft[] = snapshotsForDate.map(
    (snapshot) => {
      const isLatest =
        latestBySource.get(snapshot.source_record_id)?.snapshot_id ===
        snapshot.snapshot_id;
      const state = currentState(snapshot.snapshot_id, input.snapshot_state_events);
      return {
        snapshot_id: snapshot.snapshot_id,
        source_record_id: snapshot.source_record_id,
        source_content_hash: snapshot.source_content_hash,
        relation: !isLatest || state === "superseded"
          ? "superseded"
          : state === "tombstoned"
          ? "excluded_by_tombstone"
          : "included",
      };
    },
  );
  return {
    compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
    compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
    deterministic: true,
    llm_used: false,
    content,
    content_hash: sha256({
      compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
      compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
      content,
      lineage,
    }),
    lineage,
  };
}

export function createFarmOsSnapshotId(input: {
  source_record_id: string;
  source_record_version: number | null;
  source_content_hash: string | null;
  operation: string;
  business_date: string;
}): string {
  return `snapshot_${sha256(input).slice(0, 32)}`;
}
