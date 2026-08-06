import assert from "node:assert/strict";

import {
  FarmOsActiveProjectionReadRepositoryError,
  FarmOsActiveProjectionReadService,
  FarmOsActiveProjectionReadValidationError,
  type FarmOsActiveProjectionReadRepository,
} from "../../src/lib/hermes/farm_os_active_projection_read_service";
import {
  compileFarmOsDailyProjection,
} from "../../src/lib/hermes/farm_os_operational_memory_compiler";
import type {
  FarmOsDailyProjection,
  FarmOsProjectionStateEvent,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import type {
  FarmOsProjectionFirstScopedBundle,
} from "../../src/lib/hermes/farm_os_projection_first_selector";

const businessDate = "2026-08-07";
const requestedAt = "2026-08-06T15:00:00.000Z";
const scope = {
  installation_id: "installation_fixture_1",
  farm_scope: "farm_fixture_1",
};
const compiled = compileFarmOsDailyProjection({
  business_date: businessDate,
  snapshots: [],
  snapshot_state_events: [],
});

function projection(id: string, hash = compiled.content_hash): FarmOsDailyProjection {
  return {
    projection_id: id,
    projection_type: "daily_work_records",
    projection_version: 1,
    business_date: businessDate,
    compiler_id: compiled.compiler_id,
    compiler_version: compiled.compiler_version,
    content_hash: hash,
    content: structuredClone(compiled.content),
    generated_at: "2026-08-06T15:01:02.003Z",
    supersedes_projection_id: null,
  };
}

function events(id: string, statuses: unknown[]): FarmOsProjectionStateEvent[] {
  return statuses.map((status, index) => ({
    event_id: `${id}_event_${index + 1}`,
    projection_id: id,
    status: status as FarmOsProjectionStateEvent["status"],
    sequence: index + 1,
    occurred_at: "2026-08-06T15:01:02.003Z",
  }));
}

function bundle(input: {
  projections?: FarmOsDailyProjection[];
  projection_state_events?: FarmOsProjectionStateEvent[];
} = {}): FarmOsProjectionFirstScopedBundle {
  return {
    farm_scope: scope.farm_scope,
    business_date: businessDate,
    full_history_scan_performed: false,
    projections: structuredClone(input.projections ?? []),
    projection_state_events: structuredClone(input.projection_state_events ?? []),
    lineage: [],
    snapshots: [],
    snapshot_state_events: [],
  };
}

function service(repository: FarmOsActiveProjectionReadRepository) {
  return new FarmOsActiveProjectionReadService({ repository });
}

async function read(value: FarmOsProjectionFirstScopedBundle) {
  return service({ readProjectionBundle: async () => structuredClone(value) }).read({
    installation_scope: scope,
    requested_at: requestedAt,
  });
}

const active = projection("projection_active");
const current = await read(bundle({
  projections: [active],
  projection_state_events: events(active.projection_id, ["active"]),
}));
assert.equal(current.status, "current");
assert.deepEqual(current.payload, active.content);
assert.equal(current.generated_at, active.generated_at);

const staleProjection = projection("projection_stale", "b".repeat(64));
const stale = await read(bundle({
  projections: [staleProjection],
  projection_state_events: events(staleProjection.projection_id, ["active"]),
}));
assert.equal(stale.status, "stale");
assert.deepEqual(stale.payload, staleProjection.content);
assert.equal(stale.generated_at, staleProjection.generated_at);

assert.equal((await read(bundle())).status, "missing");
for (const [name, statuses] of [
  ["candidate", ["candidate"]],
  ["rejected", ["candidate", "rejected"]],
  ["superseded", ["active", "superseded"]],
  ["failed", ["candidate", "failed"]],
] as const) {
  const item = projection(`projection_${name}_private`);
  const response = await read(bundle({
    projections: [item],
    projection_state_events: events(item.projection_id, [...statuses]),
  }));
  assert.deepEqual(response, {
    schema_version: "farmos.daily_operational_projection.active_read_response.v1",
    status: "missing",
    payload: null,
    generated_at: null,
  });
  assert.equal(JSON.stringify(response).includes(item.projection_id), false);
}

const invalid = projection("projection_invalid_history");
assert.equal((await read(bundle({
  projections: [invalid],
  projection_state_events: events(invalid.projection_id, ["candidate", "superseded"]),
}))).status, "failed");

const activeTwo = projection("projection_active_2");
assert.equal((await read(bundle({
  projections: [active, activeTwo],
  projection_state_events: [
    ...events(active.projection_id, ["active"]),
    ...events(activeTwo.projection_id, ["active"]),
  ],
}))).status, "failed");

assert.equal((await service({
  readProjectionBundle: async () => {
    throw new FarmOsActiveProjectionReadRepositoryError();
  },
}).read({ installation_scope: scope, requested_at: requestedAt })).status, "failed");

let observedBusinessDate: string | null = null;
const exactDateResponse = await service({
  readProjectionBundle: async (input) => {
    observedBusinessDate = input.business_date;
    assert.deepEqual(input.installation_scope, scope);
    return bundle();
  },
}).read({ installation_scope: scope, requested_at: requestedAt });
assert.equal(exactDateResponse.status, "missing");
assert.equal(observedBusinessDate, businessDate);

let invalidRequestRepositoryCalls = 0;
await assert.rejects(
  service({
    readProjectionBundle: async () => {
      invalidRequestRepositoryCalls += 1;
      return bundle();
    },
  }).read({ installation_scope: scope, requested_at: "not-a-date" }),
  (error: unknown) => error instanceof FarmOsActiveProjectionReadValidationError &&
    error.code === "invalid_requested_at",
);
assert.equal(invalidRequestRepositoryCalls, 0);

const unexpected = new Error("unexpected_programming_error");
await assert.rejects(service({
  readProjectionBundle: async () => {
    throw unexpected;
  },
}).read({ installation_scope: scope, requested_at: requestedAt }), unexpected);

for (const forbidden of [
  "projection_id", "candidate_id", "content_hash", "state_history",
  "snapshot_ids", "compiler_evidence", "raw_error", "freshness_basis",
]) {
  assert.equal(JSON.stringify(current).includes(forbidden), false);
}

console.log("farm_os_day150_active_projection_read_service: PASS");
