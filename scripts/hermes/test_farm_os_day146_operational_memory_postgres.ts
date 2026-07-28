import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Pool, type PoolClient } from "pg";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  materializeFarmOsProjectionStates,
  materializeFarmOsSnapshotStates,
  rebuildFarmOsDailyProjectionShadow,
  type FarmOsOperationalMemoryState,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  FarmOsOperationalMemoryPostgresRepository,
} from "../../src/lib/hermes/farm_os_operational_memory_postgres_repository";

type Fixture = { fixture_id: string; input_changes: unknown[] };
const fixtures = (JSON.parse(readFileSync(
  new URL("./farm_os_day146_operational_memory_fixture.json", import.meta.url),
  "utf8",
)) as { fixtures: Fixture[] }).fixtures;
const schemaSql = readFileSync(
  new URL("../sql/day146_operational_memory_snapshot_persistence.sql",
    import.meta.url),
  "utf8",
);
const observedAt = "2026-07-28T17:00:00+09:00";

function changes(id: string): unknown[] {
  const found = fixtures.find((fixture) => fixture.fixture_id === id);
  assert.ok(found);
  return structuredClone(found.input_changes);
}

function page(inputChanges: unknown[]): unknown {
  return {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    result: "ok",
    next_cursor: null,
    has_more: false,
    changes: inputChanges,
  };
}

function counts(state: FarmOsOperationalMemoryState): number[] {
  return [
    state.snapshots.length,
    state.snapshot_state_events.length,
    state.projections.length,
    state.projection_state_events.length,
    state.lineage.length,
    state.rejections.length,
  ];
}

async function expectAppendOnly(
  client: PoolClient,
  sql: string,
  values: unknown[],
): Promise<void> {
  await client.query("savepoint append_only_check");
  try {
    await client.query(sql, values);
    assert.fail("append-only mutation unexpectedly succeeded");
  } catch (error) {
    assert.match(String(error), /operational_memory_append_only/u);
  } finally {
    await client.query("rollback to savepoint append_only_check");
  }
}

async function expectBundleRollback(input: {
  pool: Pool;
  repository: FarmOsOperationalMemoryPostgresRepository;
  arrays: unknown[][];
}): Promise<void> {
  const before = counts(await input.repository.readState());
  const client = await input.pool.connect();
  try {
    await client.query("begin");
    await assert.rejects(client.query(
      "select ai.persist_operational_memory_bundle($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb)",
      input.arrays.map((value) => JSON.stringify(value)),
    ));
    await client.query("rollback");
  } finally {
    client.release();
  }
  assert.deepEqual(counts(await input.repository.readState()), before);
}

assert.equal(process.env.FARMOS_DAY146_POSTGRES_ISOLATED, "true");
const pool = new Pool({
  host: "127.0.0.1",
  port: 55432,
  database: "farmos_day146",
  user: "postgres",
  password: "day146-fixture-only",
  ssl: false,
  max: 6,
  connectionTimeoutMillis: 2000,
});
const repository = new FarmOsOperationalMemoryPostgresRepository({ pool });

try {
  const version = await pool.query<{ server_version: string }>(
    "show server_version",
  );
  assert.match(version.rows[0]?.server_version ?? "", /^16\./u);
  await pool.query(schemaSql);
  await pool.query(schemaSql);

  const schemaEvidence = await pool.query<{
    relation_count: string;
    trigger_count: string;
    function_count: string;
    identity_count: string;
  }>(`
    select
      (select count(*)::text from pg_class c join pg_namespace n
        on n.oid = c.relnamespace
        where n.nspname = 'ai'
          and c.relname like 'operational_memory_%'
          and c.relkind = 'r') as relation_count,
      (select count(*)::text from pg_trigger t join pg_class c
        on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'ai' and not t.tgisinternal
          and t.tgname like 'operational_memory_%_append_only') as trigger_count,
      (select count(*)::text from pg_proc p join pg_namespace n
        on n.oid = p.pronamespace where n.nspname = 'ai'
          and p.proname = 'persist_operational_memory_bundle') as function_count,
      (select count(*)::text from information_schema.columns
        where table_schema = 'ai'
          and column_name in ('ingestion_sequence', 'event_sequence')
          and is_identity = 'YES') as identity_count
  `);
  assert.deepEqual(schemaEvidence.rows[0], {
    relation_count: "6",
    trigger_count: "6",
    function_count: "1",
    identity_count: "3",
  });

  const valid = await repository.ingest({
    page: page(changes("valid_idempotent")),
    observed_at: observedAt,
  });
  assert.deepEqual(valid.outcomes.map((value) => value.status), [
    "accepted_change",
    "duplicate_change_ignored",
  ]);

  const concurrentChange = {
    ...(changes("valid_idempotent")[0] as Record<string, unknown>),
    source_record_id: "work_fixture_concurrent",
    source_content_hash:
      "7777777777777777777777777777777777777777777777777777777777777777",
  };
  const concurrent = await Promise.all([
    repository.ingest({
      page: page([concurrentChange]),
      observed_at: observedAt,
    }),
    repository.ingest({
      page: page([concurrentChange]),
      observed_at: observedAt,
    }),
  ]);
  assert.equal(
    concurrent.flatMap((result) => result.outcomes)
      .filter((outcome) => outcome.status === "accepted_change").length,
    1,
  );
  assert.equal(
    concurrent.flatMap((result) => result.outcomes)
      .filter((outcome) => outcome.status === "duplicate_change_ignored").length,
    1,
  );

  const late = await repository.ingest({
    page: page(changes("late_entry")),
    observed_at: observedAt,
  });
  assert.deepEqual(late.outcomes[0]?.affected_business_dates, ["2026-07-27"]);

  const update = await repository.ingest({
    page: page(changes("update_supersede")),
    observed_at: observedAt,
  });
  assert.equal(update.result, "success");

  const deleted = await repository.ingest({
    page: page(changes("delete_tombstone")),
    observed_at: observedAt,
  });
  assert.equal(deleted.result, "success");

  const conflictInput = changes("version_hash_conflict")[0] as Record<
    string,
    unknown
  >;
  const seed = {
    ...conflictInput,
    source_content_hash:
      "5555555555555555555555555555555555555555555555555555555555555555",
  };
  await repository.ingest({ page: page([seed]), observed_at: observedAt });
  const beforeConflict = await repository.readState();
  const conflict = await repository.ingest({
    page: page([conflictInput]),
    observed_at: "2026-07-28T17:01:00+09:00",
  });
  const afterConflict = await repository.readState();
  assert.equal(conflict.result, "rejected");
  assert.equal(conflict.outcomes[0]?.status, "source_version_hash_conflict");
  assert.equal(afterConflict.snapshots.length, beforeConflict.snapshots.length);
  assert.equal(afterConflict.projections.length, beforeConflict.projections.length);
  assert.equal(afterConflict.lineage.length, beforeConflict.lineage.length);
  assert.equal(afterConflict.rejections.length, beforeConflict.rejections.length + 1);

  const state = await repository.readState();
  assert.ok(state.snapshots.length > 0);
  assert.ok(state.snapshot_state_events.length > 0);
  assert.ok(state.projections.length > 0);
  assert.ok(state.projection_state_events.length > 0);
  assert.ok(state.lineage.length > 0);
  assert.ok(state.rejections.length > 0);
  assert.ok(materializeFarmOsSnapshotStates(state).some((row) =>
    row.state === "superseded"
  ));
  assert.ok(materializeFarmOsSnapshotStates(state).some((row) =>
    row.state === "tombstoned"
  ));
  const activeProjection = materializeFarmOsProjectionStates(state).find(
    (projection) =>
      projection.business_date === "2026-07-28" &&
      projection.status === "active",
  );
  assert.ok(activeProjection);
  const rebuilt = rebuildFarmOsDailyProjectionShadow({
    state,
    business_date: "2026-07-28",
  });
  assert.equal(rebuilt.content_hash, activeProjection.content_hash);
  assert.equal(rebuilt.llm_used, false);

  const atomicSnapshot = {
    snapshot_id: "snapshot_atomic_projection_failure",
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    source_system: "farming_app",
    source_record_id: "work_atomic_projection_failure",
    source_record_version: 1,
    source_content_hash:
      "8888888888888888888888888888888888888888888888888888888888888888",
    operation: "upsert",
    business_date: "2026-07-28",
    recorded_at: observedAt,
    source_updated_at: observedAt,
    deleted_at: null,
    field_reference: null,
    crop_cycle_reference: null,
    work_type_reference: null,
    safe_payload: {},
    observed_at: observedAt,
    initial_state: "active",
    supersedes_snapshot_id: null,
    rejection_code: null,
    ingestion_sequence: 10000,
  };
  await expectBundleRollback({
    pool,
    repository,
    arrays: [
      [atomicSnapshot],
      [],
      [{
        projection_id: "projection_atomic_invalid",
        projection_type: "daily_work_records",
        projection_version: 99,
        business_date: "2026-07-28",
        compiler_id: "invalid_compiler",
        compiler_version: 1,
        content_hash:
          "9999999999999999999999999999999999999999999999999999999999999999",
        projection_content: {},
        generated_at: observedAt,
        supersedes_projection_id: null,
      }],
      [],
      [],
      [],
    ],
  });

  const lineageSnapshot = {
    ...atomicSnapshot,
    snapshot_id: "snapshot_atomic_lineage_failure",
    source_record_id: "work_atomic_lineage_failure",
    source_content_hash:
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };
  const lineageProjection = {
    projection_id: "projection_atomic_lineage_failure",
    projection_type: "daily_work_records",
    projection_version: 100,
    business_date: "2026-07-28",
    compiler_id: "farmos.operational_memory.daily_work_records",
    compiler_version: 1,
    content_hash:
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    projection_content: {},
    generated_at: observedAt,
    supersedes_projection_id: null,
  };
  await expectBundleRollback({
    pool,
    repository,
    arrays: [
      [lineageSnapshot],
      [{
        event_id: "snapshot_state_atomic_lineage",
        snapshot_id: lineageSnapshot.snapshot_id,
        state: "active",
        sequence: 10001,
        occurred_at: observedAt,
      }],
      [lineageProjection],
      [{
        event_id: "projection_state_atomic_lineage",
        projection_id: lineageProjection.projection_id,
        status: "active",
        sequence: 10002,
        occurred_at: observedAt,
      }],
      [{
        projection_id: lineageProjection.projection_id,
        snapshot_id: "snapshot_missing",
        source_record_id: lineageSnapshot.source_record_id,
        source_content_hash: lineageSnapshot.source_content_hash,
        relation: "included",
      }],
      [],
    ],
  });

  await expectBundleRollback({
    pool,
    repository,
    arrays: [[state.snapshots[0]], [], [], [], [], []],
  });

  const appendClient = await pool.connect();
  try {
    await appendClient.query("begin");
    const snapshotId = state.snapshots[0]?.snapshot_id;
    const projectionId = state.projections[0]?.projection_id;
    const lineage = state.lineage[0];
    assert.ok(snapshotId && projectionId && lineage);
    await expectAppendOnly(
      appendClient,
      "update ai.operational_memory_source_snapshots set observed_at = observed_at where snapshot_id = $1",
      [snapshotId],
    );
    await expectAppendOnly(
      appendClient,
      "delete from ai.operational_memory_source_snapshots where snapshot_id = $1",
      [snapshotId],
    );
    await expectAppendOnly(
      appendClient,
      "update ai.operational_memory_daily_projections set generated_at = generated_at where projection_id = $1",
      [projectionId],
    );
    await expectAppendOnly(
      appendClient,
      "delete from ai.operational_memory_daily_projections where projection_id = $1",
      [projectionId],
    );
    await expectAppendOnly(
      appendClient,
      "update ai.operational_memory_projection_lineage set relation = relation where projection_id = $1 and snapshot_id = $2",
      [lineage.projection_id, lineage.snapshot_id],
    );
    await expectAppendOnly(
      appendClient,
      "delete from ai.operational_memory_projection_lineage where projection_id = $1 and snapshot_id = $2",
      [lineage.projection_id, lineage.snapshot_id],
    );
    await appendClient.query("rollback");
  } finally {
    appendClient.release();
  }

  console.log("farm_os_day146_operational_memory_postgres: PASS");
} finally {
  await pool.end();
}
