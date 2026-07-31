import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
  parseFarmOsStableChange,
  parseFarmOsStableChangesPage,
  type FarmOsStableChange,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  materializeFarmOsProjectionStates,
  materializeFarmOsSnapshotStates,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";

type Fixture = {
  fixture_id: string;
  input_changes: unknown[];
};

const fixtureDocument = JSON.parse(
  readFileSync(
    new URL("./farm_os_day146_operational_memory_fixture.json", import.meta.url),
    "utf8",
  ),
) as { fixtures: Fixture[] };

const fixtureIds = fixtureDocument.fixtures.map((fixture) => fixture.fixture_id);
assert.equal(new Set(fixtureIds).size, fixtureIds.length);

function fixture(id: string): Fixture {
  const value = fixtureDocument.fixtures.find((candidate) =>
    candidate.fixture_id === id
  );
  assert.ok(value, `fixture ${id} must exist`);
  return value;
}

function page(changes: unknown[]): unknown {
  return {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    result: "ok",
    next_cursor: null,
    has_more: false,
    changes,
  };
}

const observedAt = "2026-07-28T15:00:00+09:00";

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: page(fixture("valid_idempotent").input_changes),
    observed_at: observedAt,
    repository,
  });
  const state = repository.snapshot();
  assert.equal(result.result, "success");
  assert.deepEqual(
    result.outcomes.map((outcome) => outcome.status),
    ["accepted_change", "duplicate_change_ignored"],
  );
  assert.equal(state.snapshots.length, 1);
  assert.equal(state.projections.length, 1);
  assert.equal(result.outcomes[1]?.snapshot_write_count, 0);
  assert.equal(result.outcomes[1]?.projection_write_count, 0);
  assert.equal(result.safety.business_sot, "farming_app");
  assert.equal(result.safety.farming_app_write_performed, false);
  assert.equal(result.safety.llm_used, false);
  assert.equal(result.safety.human_correction_overlay_write_performed, false);
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: page(fixture("late_entry").input_changes),
    observed_at: observedAt,
    repository,
  });
  assert.deepEqual(result.outcomes[0]?.affected_business_dates, ["2026-07-27"]);
  assert.deepEqual(
    repository.snapshot().projections.map((projection) => projection.business_date),
    ["2026-07-27"],
  );
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  ingestFarmOsStableChanges({
    page: page(fixture("update_supersede").input_changes),
    observed_at: observedAt,
    repository,
  });
  const state = repository.snapshot();
  assert.deepEqual(
    materializeFarmOsSnapshotStates(state).map((snapshot) => snapshot.state),
    ["superseded", "active"],
  );
  assert.deepEqual(
    materializeFarmOsProjectionStates(state).map((projection) => projection.status),
    ["candidate", "candidate"],
  );
  assert.equal(state.snapshots.length, 2);
  assert.equal(state.projections.length, 2);
  assert.ok(state.lineage.some((entry) => entry.relation === "superseded"));
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  ingestFarmOsStableChanges({
    page: page(fixture("delete_tombstone").input_changes),
    observed_at: observedAt,
    repository,
  });
  const state = repository.snapshot();
  const projection = materializeFarmOsProjectionStates(state).at(-1);
  assert.equal(materializeFarmOsSnapshotStates(state)[0]?.state, "tombstoned");
  assert.equal(projection?.content.active_record_count, 0);
  assert.equal(projection?.content.tombstone_count, 1);
  assert.ok(state.lineage.some((entry) =>
    entry.relation === "excluded_by_tombstone"
  ));
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: page(fixture("stale_or_missing_required_time").input_changes),
    observed_at: observedAt,
    repository,
  });
  assert.equal(result.result, "rejected");
  assert.equal(result.outcomes[0]?.failure_code, "missing_business_date");
  assert.equal(repository.snapshot().snapshots.length, 0);
  assert.equal(repository.snapshot().projections.length, 0);
}

{
  const conflictChange = fixture("version_hash_conflict")
    .input_changes[0] as Record<string, unknown>;
  const seedChange = {
    ...conflictChange,
    source_content_hash:
      "5555555555555555555555555555555555555555555555555555555555555555",
  };
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  ingestFarmOsStableChanges({
    page: page([seedChange]),
    observed_at: observedAt,
    repository,
  });
  const before = repository.snapshot();
  const result = ingestFarmOsStableChanges({
    page: page([conflictChange]),
    observed_at: "2026-07-28T15:01:00+09:00",
    repository,
  });
  const after = repository.snapshot();
  assert.equal(result.result, "rejected");
  assert.equal(result.outcomes[0]?.status, "source_version_hash_conflict");
  assert.equal(after.snapshots.length, before.snapshots.length);
  assert.equal(after.projections.length, before.projections.length);
  assert.equal(after.lineage.length, before.lineage.length);
  assert.equal(after.rejections.length, before.rejections.length + 1);
}

{
  const first = fixture("update_supersede").input_changes[0] as Record<
    string,
    unknown
  >;
  const moved = {
    ...fixture("update_supersede").input_changes[1] as Record<string, unknown>,
    business_date: "2026-07-29",
  };
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: page([first, moved]),
    observed_at: observedAt,
    repository,
  });
  assert.deepEqual(
    result.outcomes[1]?.affected_business_dates,
    ["2026-07-28", "2026-07-29"],
  );
  const candidateDates = materializeFarmOsProjectionStates(repository.snapshot())
    .filter((projection) => projection.status === "candidate")
    .map((projection) => projection.business_date)
    .sort();
  assert.deepEqual(candidateDates, [
    "2026-07-28",
    "2026-07-28",
    "2026-07-29",
  ]);
}

{
  const valid = fixture("valid_idempotent").input_changes[0] as Record<
    string,
    unknown
  >;
  assert.equal(parseFarmOsStableChangesPage({
    ...page([valid]) as Record<string, unknown>,
    unexpected: true,
  }).valid, false);
  assert.equal(parseFarmOsStableChange({ ...valid, details: "free text" }).valid, false);
  assert.equal(parseFarmOsStableChange({
    ...valid,
    safe_payload: { worker_name: "fixture-person" },
  }).valid, false);
  assert.equal(parseFarmOsStableChange({
    ...valid,
    source_updated_at: "2026-07-28T08:15:00",
  }).valid, false);
  assert.equal(parseFarmOsStableChange({
    ...valid,
    source_content_hash: "not-a-sha256",
  }).valid, false);
  const invalidObservedAtRepository =
    new FarmOsInMemoryOperationalMemoryRepository();
  assert.equal(ingestFarmOsStableChanges({
    page: page([valid]),
    observed_at: "2026-07-28T15:00:00",
    repository: invalidObservedAtRepository,
  }).result, "rejected");
  assert.equal(invalidObservedAtRepository.snapshot().snapshots.length, 0);
}

{
  const parsed = parseFarmOsStableChange(
    fixture("valid_idempotent").input_changes[0],
  );
  assert.equal(parsed.valid, true);
  if (parsed.valid) {
    const allowedKeys = Object.keys(parsed.value).sort();
    const forbiddenKeys = [
      "worker",
      "worker_name",
      "machine",
      "materials",
      "quantity",
      "unit",
      "yield",
      "cost",
      "price",
      "coordinates",
      "free_text",
      "llm_metadata",
    ];
    assert.ok(forbiddenKeys.every((key) => !allowedKeys.includes(key)));
    assert.deepEqual(parsed.value.safe_payload, {});
  }
  assert.equal(FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
    "farmos.operational_memory.daily_work_records");
  assert.equal(FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION, 1);
}

console.log("farm_os_day146_operational_memory_persistence: PASS");
