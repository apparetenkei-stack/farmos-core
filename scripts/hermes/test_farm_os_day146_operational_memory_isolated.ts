import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  materializeFarmOsSnapshotStates,
  rebuildFarmOsDailyProjectionShadow,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";

type Fixture = { fixture_id: string; input_changes: unknown[] };
const fixtures = (JSON.parse(readFileSync(
  new URL("./farm_os_day146_operational_memory_fixture.json", import.meta.url),
  "utf8",
)) as { fixtures: Fixture[] }).fixtures;

function changes(id: string): unknown[] {
  const found = fixtures.find((fixture) => fixture.fixture_id === id);
  assert.ok(found);
  return found.input_changes;
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

const observedAt = "2026-07-28T16:00:00+09:00";

for (const failure of ["projection", "lineage"] as const) {
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const before = repository.snapshot();
  repository.injectFailureOnce(failure);
  const result = ingestFarmOsStableChanges({
    page: page([changes("valid_idempotent")[0]]),
    observed_at: observedAt,
    repository,
  });
  assert.equal(result.result, "rejected");
  assert.equal(
    result.outcomes[0]?.failure_code,
    failure === "projection"
      ? "projection_generation_failed"
      : "lineage_write_failed",
  );
  assert.deepEqual(repository.snapshot(), before);
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  ingestFarmOsStableChanges({
    page: page(changes("update_supersede")),
    observed_at: observedAt,
    repository,
  });
  const stateBeforeRebuild = repository.snapshot();
  const originalSnapshot = structuredClone(stateBeforeRebuild.snapshots[0]);
  const shadowOne = rebuildFarmOsDailyProjectionShadow({
    state: stateBeforeRebuild,
    business_date: "2026-07-28",
  });
  const shadowTwo = rebuildFarmOsDailyProjectionShadow({
    state: repository.snapshot(),
    business_date: "2026-07-28",
  });
  assert.deepEqual(shadowOne, shadowTwo);
  assert.deepEqual(repository.snapshot(), stateBeforeRebuild);
  assert.deepEqual(repository.snapshot().snapshots[0], originalSnapshot);
  assert.equal(
    materializeFarmOsSnapshotStates(repository.snapshot())[0]?.state,
    "superseded",
  );
  assert.equal(shadowOne.deterministic, true);
  assert.equal(shadowOne.llm_used, false);
}

{
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  ingestFarmOsStableChanges({
    page: page([
      changes("valid_idempotent")[0],
      changes("late_entry")[0],
      changes("delete_tombstone")[0],
    ]),
    observed_at: observedAt,
    repository,
  });
  const state = repository.snapshot();
  for (const businessDate of ["2026-07-27", "2026-07-28"]) {
    const first = rebuildFarmOsDailyProjectionShadow({
      state,
      business_date: businessDate,
    });
    const second = rebuildFarmOsDailyProjectionShadow({
      state,
      business_date: businessDate,
    });
    assert.equal(first.content_hash, second.content_hash);
    assert.deepEqual(first.content, second.content);
    assert.deepEqual(first.lineage, second.lineage);
  }
}

{
  const sql = readFileSync(
    new URL("../sql/day146_operational_memory_snapshot_persistence.sql",
      import.meta.url),
    "utf8",
  );
  const requiredRelations = [
    "operational_memory_source_snapshots",
    "operational_memory_snapshot_state_events",
    "operational_memory_daily_projections",
    "operational_memory_projection_state_events",
    "operational_memory_projection_lineage",
    "operational_memory_ingestion_rejections",
  ];
  for (const relation of requiredRelations) assert.ok(sql.includes(relation));
  assert.match(sql, /create or replace function ai\.persist_operational_memory_bundle/u);
  assert.match(sql, /operational_memory_append_only/u);
  assert.match(sql, /\bbegin;/u);
  assert.match(sql, /\bcommit;/u);
  assert.doesNotMatch(sql, /farming_app.*(?:insert|update|delete)/iu);
  assert.doesNotMatch(sql, /service_role|authorization|bearer|api[_-]?key/iu);
}

console.log("farm_os_day146_operational_memory_isolated: PASS");
