import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  FarmOsOperationalMemoryPostgresRepository,
} from "../../src/lib/hermes/farm_os_operational_memory_postgres_repository";
import {
  createFarmOsProjectionFirstRequest,
} from "../../src/lib/hermes/farm_os_projection_first_contract";
import {
  FarmOsProjectionFirstService,
  FarmOsProjectionFirstRuntime,
  type FarmOsProjectionFirstReadPort,
} from "../../src/lib/hermes/farm_os_projection_first_runtime";

type Fixture = { fixture_id: string; input_changes: unknown[] };
const fixtures = (JSON.parse(readFileSync(
  new URL("./farm_os_day146_operational_memory_fixture.json", import.meta.url),
  "utf8",
)) as { fixtures: Fixture[] }).fixtures;
const fixture = fixtures.find((value) => value.fixture_id === "valid_idempotent");
assert.ok(fixture);

const operationalMemory = new FarmOsInMemoryOperationalMemoryRepository();
const ingest = ingestFarmOsStableChanges({
  page: {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    result: "ok",
    next_cursor: null,
    has_more: false,
    changes: fixture.input_changes,
  },
  observed_at: "2026-07-28T15:00:00+09:00",
  repository: operationalMemory,
});
assert.equal(ingest.result, "success");
const before = operationalMemory.snapshot();
let exactDateReadCount = 0;
let lineageReadCount = 0;

const readPort: FarmOsProjectionFirstReadPort = {
  readProjectionBundle: async ({ authorized_scope: scope, business_date }) => {
    exactDateReadCount += 1;
    assert.equal(scope.farm_scope, "farm_fixture_01");
    assert.equal(business_date, "2026-07-28");
    const state = operationalMemory.snapshot();
    return {
      farm_scope: scope.farm_scope,
      business_date,
      full_history_scan_performed: false,
      projections: state.projections.filter((projection) =>
        projection.business_date === business_date
      ),
      projection_state_events: state.projection_state_events,
      lineage: state.lineage,
      snapshots: state.snapshots,
      snapshot_state_events: state.snapshot_state_events,
    };
  },
  readLineageSources: async () => {
    lineageReadCount += 1;
    return [];
  },
};
const service = new FarmOsProjectionFirstService(
  new FarmOsProjectionFirstRuntime({
    authorization: {
      authorize: async ({ requested_farm_scope: farmScope }) =>
        farmScope === "farm_fixture_01"
          ? {
            installation_id: "installation_fixture_01",
            farm_scope: farmScope,
            authorization_id: "local_fixture_authorization",
          }
          : null,
    },
    repository: readPort,
  }),
);
const result = await service.respond({
  request: createFarmOsProjectionFirstRequest({
    query: "作業記録は何件ですか",
    business_date: "2026-07-28",
    farm_scope: "farm_fixture_01",
    requested_at: "2026-07-28T15:01:00+09:00",
  }),
  authorization_context: {
    installation_id: "installation_fixture_01",
    bound_farm_scope: "farm_fixture_01",
    subject_id: "local_fixture_operator",
    channel: "cli",
    actor_authorized: true,
    authorization_evidence_id: "local_fixture_authorization",
    authentication_method: "local_fixture",
  },
});

assert.equal(result.result, "answered");
assert.equal(result.response_guard.status, "passed");
assert.equal(result.writes_performed, false);
assert.equal(exactDateReadCount, 1);
assert.equal(lineageReadCount, 0);
assert.deepEqual(operationalMemory.snapshot(), before);
assert.equal(ingest.safety.farming_app_write_performed, false);
assert.equal(ingest.safety.production_db_operation_performed, false);
assert.equal(ingest.safety.linked_db_operation_performed, false);

// The existing PostgreSQL integration remains a read-only transaction.
const queries: string[] = [];
const fakePool = {
  connect: async () => ({
    query: async (query: unknown) => {
      queries.push(String(query));
      return { rows: [] };
    },
    release: () => undefined,
  }),
  end: async () => undefined,
};
const postgresReadRepository = new FarmOsOperationalMemoryPostgresRepository({
  pool: fakePool as never,
});
const emptyReadback = await postgresReadRepository.readState();
assert.equal(emptyReadback.projections.length, 0);
assert.equal(queries[0], "begin isolation level repeatable read read only");
assert.equal(queries.at(-1), "commit");
assert.equal(
  queries.some((query) =>
    /\b(?:insert|update|delete|persist_operational_memory_bundle)\b/iu.test(query)
  ),
  false,
);

console.log("farm_os_day146_projection_first_integration: PASS");
