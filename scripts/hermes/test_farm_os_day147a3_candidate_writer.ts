import assert from "node:assert/strict";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  type FarmOsStableChange,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  createEmptyFarmOsOperationalMemoryState,
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  type FarmOsOperationalMemoryState,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  FarmOsOperationalMemoryPostgresRepository,
} from "../../src/lib/hermes/farm_os_operational_memory_postgres_repository";

const BUSINESS_DATE = "2026-07-31";
const OBSERVED_AT = "2026-07-31T15:00:00+09:00";
const STRING_HASH = "a".repeat(64);

function change(input: {
  source_record_id: string;
  source_record_version: number;
  source_content_hash: string | null;
}): FarmOsStableChange {
  return {
    operation: "upsert",
    source_record_id: input.source_record_id,
    source_record_version: input.source_record_version,
    source_content_hash: input.source_content_hash,
    business_date: BUSINESS_DATE,
    recorded_at: "2026-07-31T08:00:00+09:00",
    source_updated_at: "2026-07-31T08:00:00+09:00",
    deleted_at: null,
    field_reference: "field_fixture_01",
    crop_cycle_reference: "crop_cycle_fixture_01",
    work_type_reference: "work_type_fixture_01",
    safe_payload: {},
  };
}

function page(changes: readonly FarmOsStableChange[]): unknown {
  return {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    result: "ok",
    next_cursor: null,
    has_more: false,
    changes,
  };
}

function legacyActiveState(): FarmOsOperationalMemoryState {
  const state = createEmptyFarmOsOperationalMemoryState();
  state.projections.push({
    projection_id: "legacy_active_projection_v1",
    projection_type: "daily_work_records",
    projection_version: 1,
    business_date: BUSINESS_DATE,
    compiler_id: "farmos.operational_memory.daily_work_records",
    compiler_version: 1,
    content_hash: "f".repeat(64),
    content: {
      business_date: BUSINESS_DATE,
      source_record_count: 0,
      active_record_count: 0,
      tombstone_count: 0,
      field_references: [],
      crop_cycle_references: [],
      work_type_references: [],
      verification_status: "stable_change_contract_validated",
      missing_data_status: "complete_for_v1",
    },
    generated_at: "2026-07-31T05:00:00.000Z",
    supersedes_projection_id: null,
  });
  state.projection_state_events.push({
    event_id: "legacy_projection_state_1",
    projection_id: "legacy_active_projection_v1",
    status: "active",
    sequence: 1,
    occurred_at: "2026-07-31T05:00:00.000Z",
  });
  state.next_event_sequence = 2;
  return state;
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: page([change({
      source_record_id: "fresh_record",
      source_record_version: 1,
      source_content_hash: STRING_HASH,
    })]),
    observed_at: OBSERVED_AT,
    repository,
  });
  const state = repository.snapshot();
  assert.equal(result.result, "success");
  assert.equal(state.projections.length, 1);
  assert.equal(state.projections[0]?.projection_version, 1);
  assert.equal(state.projections[0]?.supersedes_projection_id, null);
  assert.deepEqual(
    state.projection_state_events.map((event) => event.status),
    ["candidate"],
  );
  assert.equal(
    state.projection_state_events.filter((event) => event.status === "active")
      .length,
    0,
  );
  assert.equal(state.lineage.length, 1);
  assert.equal(state.lineage[0]?.source_content_hash, STRING_HASH);
}

{
  const initial = legacyActiveState();
  const activeProjectionBefore = structuredClone(initial.projections[0]);
  const activeEventBefore = structuredClone(initial.projection_state_events[0]);
  const repository = new FarmOsInMemoryOperationalMemoryRepository(initial);
  const firstChange = change({
    source_record_id: "candidate_record_1",
    source_record_version: 1,
    source_content_hash: "b".repeat(64),
  });
  ingestFarmOsStableChanges({
    page: page([firstChange]),
    observed_at: OBSERVED_AT,
    repository,
  });
  const afterFirst = repository.snapshot();
  assert.deepEqual(afterFirst.projections[0], activeProjectionBefore);
  assert.deepEqual(afterFirst.projection_state_events[0], activeEventBefore);
  assert.equal(
    afterFirst.projection_state_events.filter((event) =>
      event.projection_id === activeProjectionBefore?.projection_id &&
      event.status === "superseded"
    ).length,
    0,
  );
  assert.deepEqual(
    afterFirst.projections.map((projection) => projection.projection_version),
    [1, 2],
  );
  assert.equal(afterFirst.projections[1]?.supersedes_projection_id, null);
  assert.equal(
    afterFirst.projection_state_events.at(-1)?.status,
    "candidate",
  );

  const secondChange = change({
    source_record_id: "candidate_record_2",
    source_record_version: 1,
    source_content_hash: "c".repeat(64),
  });
  ingestFarmOsStableChanges({
    page: page([secondChange]),
    observed_at: "2026-07-31T15:01:00+09:00",
    repository,
  });
  const afterSecond = repository.snapshot();
  assert.deepEqual(
    afterSecond.projections.map((projection) => projection.projection_version),
    [1, 2, 3],
  );
  assert.deepEqual(
    afterSecond.projection_state_events.map((event) => event.status),
    ["active", "candidate", "candidate"],
  );
  assert.deepEqual(afterSecond.projections[0], activeProjectionBefore);
  assert.deepEqual(afterSecond.projection_state_events[0], activeEventBefore);

  const countsBeforeReplay = {
    snapshots: afterSecond.snapshots.length,
    projections: afterSecond.projections.length,
    events: afterSecond.projection_state_events.length,
    lineage: afterSecond.lineage.length,
  };
  const replay = ingestFarmOsStableChanges({
    page: page([secondChange]),
    observed_at: "2026-07-31T15:02:00+09:00",
    repository,
  });
  const afterReplay = repository.snapshot();
  assert.equal(replay.outcomes[0]?.status, "duplicate_change_ignored");
  assert.deepEqual({
    snapshots: afterReplay.snapshots.length,
    projections: afterReplay.projections.length,
    events: afterReplay.projection_state_events.length,
    lineage: afterReplay.lineage.length,
  }, countsBeforeReplay);
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  repository.injectFailureOnce("lineage");
  const before = repository.snapshot();
  const result = ingestFarmOsStableChanges({
    page: page([change({
      source_record_id: "rollback_record",
      source_record_version: 1,
      source_content_hash: "d".repeat(64),
    })]),
    observed_at: OBSERVED_AT,
    repository,
  });
  assert.equal(result.result, "rejected");
  assert.equal(result.outcomes[0]?.failure_code, "lineage_write_failed");
  assert.deepEqual(repository.snapshot(), before);
  assert.equal(
    repository.snapshot().projection_state_events.filter((event) =>
      event.status === "failed"
    ).length,
    0,
  );
}

type DatabaseRow = Record<string, unknown>;
type DatabaseRows = {
  snapshots: DatabaseRow[];
  snapshotEvents: DatabaseRow[];
  projections: DatabaseRow[];
  projectionEvents: DatabaseRow[];
  lineage: DatabaseRow[];
  rejections: DatabaseRow[];
};
type QueryEvidence = {
  text: string;
  values: unknown[];
};
type ReadbackMutation = (rows: DatabaseRows) => void;

function emptyDatabaseRows(): DatabaseRows {
  return {
    snapshots: [],
    snapshotEvents: [],
    projections: [],
    projectionEvents: [],
    lineage: [],
    rejections: [],
  };
}

function parseBundleRows(value: unknown): DatabaseRow[] {
  if (typeof value !== "string") {
    throw new Error("candidate_writer_bundle_fixture_invalid");
  }
  const parsed: unknown = JSON.parse(value);
  assert.ok(Array.isArray(parsed));
  return parsed as DatabaseRow[];
}

function dateOrNull(value: unknown): Date | null {
  return value === null ? null : new Date(String(value));
}

function rowsForRead(
  rows: readonly DatabaseRow[],
  dateFields: readonly string[],
): DatabaseRow[] {
  return rows.map((row) => {
    const result = structuredClone(row);
    for (const field of dateFields) {
      result[field] = dateOrNull(row[field]);
    }
    return result;
  });
}

function fakePostgres(input: {
  mutateReadback?: ReadbackMutation;
  bundleError?: boolean;
} = {}) {
  let committed = emptyDatabaseRows();
  let transaction: DatabaseRows | null = null;
  let capturedBundleValues: unknown[] | null = null;
  let readbackMutated = false;
  const queries: QueryEvidence[] = [];

  const currentRows = (): DatabaseRows => transaction ?? committed;
  const pool = {
    connect: async () => ({
      query: async (query: unknown, values: unknown[] = []) => {
        const text = String(query);
        const normalized = text.trim().toLowerCase();
        queries.push({ text, values: structuredClone(values) });
        if (normalized.startsWith("begin")) {
          transaction = structuredClone(committed);
          return { rows: [] };
        }
        if (normalized === "commit") {
          assert.ok(transaction);
          committed = structuredClone(transaction);
          transaction = null;
          return { rows: [] };
        }
        if (normalized === "rollback") {
          transaction = null;
          return { rows: [] };
        }
        if (text.includes("persist_operational_memory_bundle")) {
          if (input.bundleError) throw new Error("fake_bundle_error");
          assert.ok(transaction);
          capturedBundleValues = structuredClone(values);
          transaction.snapshots.push(...parseBundleRows(values[0]));
          transaction.snapshotEvents.push(...parseBundleRows(values[1]));
          transaction.projections.push(...parseBundleRows(values[2]));
          transaction.projectionEvents.push(...parseBundleRows(values[3]));
          transaction.lineage.push(...parseBundleRows(values[4]));
          transaction.rejections.push(...parseBundleRows(values[5]));
          if (!readbackMutated && input.mutateReadback !== undefined) {
            input.mutateReadback(transaction);
            readbackMutated = true;
          }
          return { rows: [{ result: { status: "committed" } }] };
        }
        const rows = currentRows();
        if (text.includes("from ai.operational_memory_source_snapshots")) {
          return {
            rows: rowsForRead(rows.snapshots, [
              "recorded_at",
              "source_updated_at",
              "deleted_at",
              "observed_at",
            ]),
          };
        }
        if (
          text.includes("from ai.operational_memory_snapshot_state_events")
        ) {
          return {
            rows: rowsForRead(rows.snapshotEvents, ["occurred_at"]),
          };
        }
        if (text.includes("from ai.operational_memory_daily_projections")) {
          return {
            rows: rowsForRead(rows.projections, ["generated_at"]),
          };
        }
        if (
          text.includes("from ai.operational_memory_projection_state_events")
        ) {
          return {
            rows: rowsForRead(rows.projectionEvents, ["occurred_at"]),
          };
        }
        if (text.includes("from ai.operational_memory_projection_lineage")) {
          return { rows: structuredClone(rows.lineage) };
        }
        if (
          text.includes("from ai.operational_memory_ingestion_rejections")
        ) {
          return {
            rows: rowsForRead(rows.rejections, ["observed_at"]),
          };
        }
        return { rows: [] };
      },
      release: () => undefined,
    } as never),
    end: async () => undefined,
  };
  return {
    pool,
    queries,
    get bundleValues(): unknown[] | null {
      return capturedBundleValues === null
        ? null
        : structuredClone(capturedBundleValues);
    },
    get committedRows(): DatabaseRows {
      return structuredClone(committed);
    },
  };
}

async function postgresCase(input: {
  source_content_hash?: string | null;
  mutateReadback?: ReadbackMutation;
  bundleError?: boolean;
} = {}) {
  const fake = fakePostgres({
    mutateReadback: input.mutateReadback,
    bundleError: input.bundleError,
  });
  const repository = new FarmOsOperationalMemoryPostgresRepository({
    pool: fake.pool,
  });
  const result = await repository.ingest({
    page: page([change({
      source_record_id: "postgres_record",
      source_record_version: 1,
      source_content_hash: input.source_content_hash === undefined
        ? STRING_HASH
        : input.source_content_hash,
    })]),
    observed_at: OBSERVED_AT,
  });
  return { fake, result };
}

function assertRollback(input: Awaited<ReturnType<typeof postgresCase>>): void {
  assert.equal(input.result.result, "rejected");
  assert.equal(input.result.postgres_persistence.transaction_committed, false);
  assert.equal(
    input.fake.queries.some((query) => query.text.trim().toLowerCase() ===
      "commit"),
    false,
  );
  assert.equal(
    input.fake.queries.at(-1)?.text.trim().toLowerCase(),
    "rollback",
  );
  assert.deepEqual(input.fake.committedRows, emptyDatabaseRows());
}

const exact = await postgresCase();
assert.equal(exact.result.result, "success");
assert.equal(exact.result.postgres_persistence.transaction_committed, true);
assert.equal(
  exact.fake.queries.some((query) =>
    query.text.includes("pg_advisory_xact_lock")
  ),
  true,
);
const bundleValues = exact.fake.bundleValues;
assert.ok(bundleValues);
const bundledProjections = parseBundleRows(bundleValues[2]);
const bundledEvents = parseBundleRows(bundleValues[3]);
const bundledLineage = parseBundleRows(bundleValues[4]);
assert.equal(bundledProjections.length, 1);
assert.equal(bundledProjections[0]?.supersedes_projection_id, null);
assert.equal(bundledEvents.length, 1);
assert.equal(bundledEvents[0]?.status, "candidate");
assert.equal(
  bundledEvents[0]?.projection_id,
  bundledProjections[0]?.projection_id,
);
assert.equal(bundledLineage.length, 1);
assert.equal(
  bundledLineage[0]?.projection_id,
  bundledProjections[0]?.projection_id,
);
assert.equal(bundledLineage[0]?.source_content_hash, STRING_HASH);
const lockIndex = exact.fake.queries.findIndex((query) =>
  query.text.includes("pg_advisory_xact_lock")
);
const bundleIndex = exact.fake.queries.findIndex((query) =>
  query.text.includes("persist_operational_memory_bundle")
);
assert.ok(lockIndex >= 0 && bundleIndex > lockIndex);

const nullExact = await postgresCase({ source_content_hash: null });
assert.equal(nullExact.result.result, "success");
assert.equal(
  parseBundleRows(nullExact.fake.bundleValues?.[4])[0]?.source_content_hash,
  null,
);

async function expectReadbackMismatch(
  mutateReadback: ReadbackMutation,
  sourceContentHash: string | null = STRING_HASH,
): Promise<void> {
  assertRollback(await postgresCase({
    source_content_hash: sourceContentHash,
    mutateReadback,
  }));
}

await expectReadbackMismatch((rows) => {
  rows.projections[0]!.projection_version = 99;
});
await expectReadbackMismatch((rows) => {
  rows.projections[0]!.supersedes_projection_id = "unexpected_projection";
});
await expectReadbackMismatch((rows) => {
  rows.projectionEvents[0]!.status = "active";
});
await expectReadbackMismatch((rows) => {
  rows.projectionEvents[0]!.sequence = 99;
});
await expectReadbackMismatch((rows) => {
  rows.projectionEvents[0]!.projection_id = "unexpected_projection";
});
await expectReadbackMismatch((rows) => {
  rows.lineage[0]!.source_record_id = "unexpected_record";
});
await expectReadbackMismatch((rows) => {
  rows.lineage[0]!.relation = "superseded";
});
await expectReadbackMismatch((rows) => {
  rows.lineage[0]!.source_content_hash = "b".repeat(64);
});
await expectReadbackMismatch((rows) => {
  rows.lineage[0]!.source_content_hash = null;
});
await expectReadbackMismatch((rows) => {
  rows.lineage[0]!.source_content_hash = STRING_HASH;
}, null);

for (const collection of [
  "projections",
  "projectionEvents",
  "lineage",
] as const) {
  await expectReadbackMismatch((rows) => {
    rows[collection].splice(0, 1);
  });
  await expectReadbackMismatch((rows) => {
    const extra = structuredClone(rows[collection][0]!);
    if (collection === "projections") {
      extra.projection_id = "extra_projection";
    } else if (collection === "projectionEvents") {
      extra.event_id = "extra_event";
    } else {
      extra.snapshot_id = "extra_snapshot";
    }
    rows[collection].push(extra);
  });
  await expectReadbackMismatch((rows) => {
    rows[collection].push(structuredClone(rows[collection][0]!));
  });
}

assertRollback(await postgresCase({ bundleError: true }));
assertRollback(await postgresCase({
  mutateReadback: (rows) => {
    rows.lineage[0]!.relation = "superseded";
  },
}));

console.log("farm_os_day147a3_candidate_writer: PASS");
