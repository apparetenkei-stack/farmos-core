import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  type FarmOsOperationalMemoryState,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  createFarmOsProjectionFirstRequest,
  FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
  parseFarmOsProjectionFirstRequest,
  parseFarmOsProjectionFirstResponse,
  type FarmOsProjectionFirstRequest,
  type FarmOsProjectionFirstResponse,
} from "../../src/lib/hermes/farm_os_projection_first_contract";
import {
  guardFarmOsProjectionFirstResponse,
} from "../../src/lib/hermes/farm_os_projection_first_response_guard";
import {
  FarmOsProjectionFirstContractError,
  FarmOsProjectionFirstRuntime,
  FarmOsProjectionFirstService,
  type FarmOsProjectionFirstAuthorizationPort,
  type FarmOsProjectionFirstEvent,
  type FarmOsProjectionFirstLineageSource,
  type FarmOsProjectionFirstReadPort,
} from "../../src/lib/hermes/farm_os_projection_first_runtime";
import type {
  FarmOsProjectionFirstScopedBundle,
} from "../../src/lib/hermes/farm_os_projection_first_selector";

type Fixture = { fixture_id: string; input_changes: unknown[] };
const fixtures = (JSON.parse(readFileSync(
  new URL("./farm_os_day146_operational_memory_fixture.json", import.meta.url),
  "utf8",
)) as { fixtures: Fixture[] }).fixtures;
const observedAt = "2026-07-28T15:00:00+09:00";
const businessDate = "2026-07-28";
const farmScope = "farm_fixture_01";
const installationId = "installation_fixture_01";
const authorizationContext = {
  installation_id: installationId,
  bound_farm_scope: farmScope,
  subject_id: "fixture_operator",
  channel: "cli",
  actor_authorized: true,
  authorization_evidence_id: "fixture_auth_01",
  authentication_method: "fixture_session",
} as const;

function fixture(id: string): Fixture {
  const found = fixtures.find((value) => value.fixture_id === id);
  assert.ok(found);
  return found;
}

function buildState(): FarmOsOperationalMemoryState {
  const repository = new FarmOsInMemoryOperationalMemoryRepository();
  const result = ingestFarmOsStableChanges({
    page: {
      contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
      result: "ok",
      next_cursor: null,
      has_more: false,
      changes: fixture("valid_idempotent").input_changes,
    },
    observed_at: observedAt,
    repository,
  });
  assert.equal(result.result, "success");
  const state = repository.snapshot();
  const projection = state.projections[0];
  const candidateEvent = state.projection_state_events[0];
  assert.ok(projection);
  assert.ok(candidateEvent);
  state.projection_state_events = [{
    ...candidateEvent,
    event_id: "legacy_day146_active_projection_state_1",
    projection_id: projection.projection_id,
    status: "active",
  }];
  return state;
}

function bundle(
  state = buildState(),
  overrides: Partial<FarmOsProjectionFirstScopedBundle> = {},
): FarmOsProjectionFirstScopedBundle {
  return {
    farm_scope: farmScope,
    business_date: businessDate,
    full_history_scan_performed: false,
    projections: structuredClone(state.projections),
    projection_state_events: structuredClone(state.projection_state_events),
    lineage: structuredClone(state.lineage),
    snapshots: structuredClone(state.snapshots),
    snapshot_state_events: structuredClone(state.snapshot_state_events),
    ...overrides,
  };
}

const allow: FarmOsProjectionFirstAuthorizationPort = {
  authorize: async ({ requested_farm_scope: requestedFarmScope }) =>
    requestedFarmScope === farmScope
      ? {
        installation_id: installationId,
        farm_scope: farmScope,
        authorization_id: "fixture_auth_01",
      }
      : null,
};

type PortEvidence = {
  bundleReads: number;
  lineageReads: number;
  lastLimit: number | null;
  lastSnapshotIds: string[];
};

function port(
  selectedBundle = bundle(),
  overrides: Partial<FarmOsProjectionFirstReadPort> = {},
): FarmOsProjectionFirstReadPort & { evidence: PortEvidence } {
  const evidence: PortEvidence = {
    bundleReads: 0,
    lineageReads: 0,
    lastLimit: null,
    lastSnapshotIds: [],
  };
  return {
    evidence,
    readProjectionBundle: overrides.readProjectionBundle ??
      (async ({ authorized_scope: authorizedScope, business_date: date }) => {
        evidence.bundleReads += 1;
        assert.equal(authorizedScope.farm_scope, farmScope);
        assert.equal(date, businessDate);
        return structuredClone(selectedBundle);
      }),
    readLineageSources: overrides.readLineageSources ??
      (async ({ snapshot_ids: snapshotIds, limit }) => {
        evidence.lineageReads += 1;
        evidence.lastLimit = limit;
        evidence.lastSnapshotIds = [...snapshotIds];
        const allowed = new Set(snapshotIds);
        return selectedBundle.snapshots
          .filter((snapshot) => allowed.has(snapshot.snapshot_id))
          .slice(0, limit)
          .map((snapshot): FarmOsProjectionFirstLineageSource => ({
            snapshot_id: snapshot.snapshot_id,
            source_record_id: snapshot.source_record_id,
            source_content_hash: snapshot.source_content_hash,
            business_date: snapshot.business_date,
            field_reference: snapshot.field_reference,
            crop_cycle_reference: snapshot.crop_cycle_reference,
            work_type_reference: snapshot.work_type_reference,
          }));
      }),
  };
}

function request(
  query = "今日の有効な作業記録は何件ですか",
  responseMode: "fast" | "deep" = "fast",
): FarmOsProjectionFirstRequest {
  return createFarmOsProjectionFirstRequest({
    query,
    business_date: businessDate,
    response_mode: responseMode,
    farm_scope: farmScope,
    requested_at: "2026-07-28T15:01:00+09:00",
  });
}

function runtime(input: {
  readPort?: FarmOsProjectionFirstReadPort;
  authorization?: FarmOsProjectionFirstAuthorizationPort;
  drilldownMaxRecords?: number;
  events?: FarmOsProjectionFirstEvent[];
} = {}): FarmOsProjectionFirstRuntime {
  return new FarmOsProjectionFirstRuntime({
    authorization: input.authorization ?? allow,
    repository: input.readPort ?? port(),
    drilldownMaxRecords: input.drilldownMaxRecords,
    onEvent: input.events === undefined
      ? undefined
      : (event) => input.events?.push(event),
  });
}

async function response(
  selectedRuntime: FarmOsProjectionFirstRuntime,
  selectedRequest: unknown = request(),
): Promise<FarmOsProjectionFirstResponse> {
  return selectedRuntime.respond({
    request: selectedRequest,
    authorization_context: authorizationContext,
  });
}

// Exact request and response contracts.
assert.equal(parseFarmOsProjectionFirstRequest(request()).valid, true);
assert.equal(createFarmOsProjectionFirstRequest({
  query: "作業件数",
  business_date: businessDate,
  farm_scope: farmScope,
  requested_at: "2026-07-28T15:01:00+09:00",
}).response_mode, "fast");
assert.equal(parseFarmOsProjectionFirstRequest({
  ...request(),
  unknown: true,
}).valid, false);
const { requested_at: _missingRequestedAt, ...missingRequestKey } = request();
assert.equal(parseFarmOsProjectionFirstRequest(missingRequestKey).valid, false);
for (const invalidDate of ["2026-02-29", "2026-13-01", "2026-7-28"]) {
  assert.equal(parseFarmOsProjectionFirstRequest({
    ...request(),
    business_date: invalidDate,
  }).valid, false);
}
assert.equal(parseFarmOsProjectionFirstRequest({
  ...request(),
  requested_at: "2026-07-28T15:01:00",
}).valid, false);
assert.equal(parseFarmOsProjectionFirstRequest({
  ...request(),
  response_mode: "automatic",
}).valid, false);
await assert.rejects(
  response(runtime(), { ...request(), query: "" }),
  FarmOsProjectionFirstContractError,
);

const answered = await response(runtime());
assert.equal(answered.result, "answered");
assert.equal(answered.mode_used, "fast");
assert.equal(answered.writes_performed, false);
assert.equal(parseFarmOsProjectionFirstResponse(answered).valid, true);
assert.equal(parseFarmOsProjectionFirstResponse({
  ...answered,
  extra: true,
}).valid, false);
assert.equal(parseFarmOsProjectionFirstResponse({
  ...answered,
  writes_performed: true,
}).valid, false);
assert.equal(parseFarmOsProjectionFirstResponse({
  ...answered,
  response_guard: {
    status: "rejected",
    failure_codes: ["unsupported_fact"],
  },
}).valid, false);

// Authorization is server-side and fail-closed before any repository read.
const unauthorizedPort = port();
const unauthorized = await response(runtime({
  readPort: unauthorizedPort,
  authorization: { authorize: async () => null },
}));
assert.equal(unauthorized.result, "guard_rejected");
assert.deepEqual(
  unauthorized.response_guard.failure_codes,
  ["authorization_failed"],
);
assert.equal(unauthorizedPort.evidence.bundleReads, 0);
assert.equal(unauthorized.writes_performed, false);
const mismatchedAuthorization = await response(runtime({
  readPort: unauthorizedPort,
  authorization: {
    authorize: async () => ({
      installation_id: installationId,
      farm_scope: "farm_other",
      authorization_id: "bad_scope",
    }),
  },
}));
assert.equal(mismatchedAuthorization.result, "guard_rejected");
assert.equal(unauthorizedPort.evidence.bundleReads, 0);

// Projection selection, exact-date selection, structural freshness.
const missingPort = port(bundle(buildState(), {
  business_date: businessDate,
  projections: [],
  projection_state_events: [],
  lineage: [],
  snapshots: [],
  snapshot_state_events: [],
}));
assert.equal((await response(runtime({ readPort: missingPort }))).result,
  "projection_missing");

const priorState = buildState();
const priorPort = port(bundle(priorState, {
  projections: priorState.projections.map((projection) => ({
    ...projection,
    business_date: "2026-07-27",
    content: { ...projection.content, business_date: "2026-07-27" },
  })),
}));
assert.equal((await response(runtime({ readPort: priorPort }))).result,
  "projection_missing");

const duplicateState = buildState();
const duplicateProjection = {
  ...structuredClone(duplicateState.projections[0]!),
  projection_id: "daily_projection_duplicate",
  projection_version: 2,
};
const duplicatePort = port(bundle(duplicateState, {
  projections: [...duplicateState.projections, duplicateProjection],
  projection_state_events: [
    ...duplicateState.projection_state_events,
    {
      event_id: "projection_state_duplicate",
      projection_id: duplicateProjection.projection_id,
      status: "active",
      sequence: 99,
      occurred_at: observedAt,
    },
  ],
}));
const duplicateResponse = await response(runtime({ readPort: duplicatePort }));
assert.equal(duplicateResponse.result, "projection_unavailable");
assert.deepEqual(
  duplicateResponse.response_guard.failure_codes,
  ["projection_contract_invalid"],
);

const unsupportedState = buildState();
const unsupportedPort = port(bundle(unsupportedState, {
  projections: [{
    ...unsupportedState.projections[0]!,
    compiler_version: 2,
  } as unknown as (typeof unsupportedState.projections)[number]],
}));
assert.equal((await response(runtime({ readPort: unsupportedPort }))).result,
  "projection_unavailable");

const staleState = buildState();
const stalePort = port(bundle(staleState, { lineage: [] }));
const stale = await response(runtime({ readPort: stalePort }));
assert.equal(stale.result, "projection_stale");
assert.equal(stale.projection_status, "stale");

const missingSnapshotPort = port(bundle(staleState, { snapshots: [] }));
assert.equal((await response(runtime({ readPort: missingSnapshotPort }))).result,
  "projection_stale");

const originalSnapshot = staleState.snapshots[0]!;
const newerSnapshot = {
  ...structuredClone(originalSnapshot),
  snapshot_id: "snapshot_newer_other_date",
  business_date: "2026-07-29",
  ingestion_sequence: originalSnapshot.ingestion_sequence + 1,
  supersedes_snapshot_id: originalSnapshot.snapshot_id,
};
const latestMismatchPort = port(bundle(staleState, {
  snapshots: [...staleState.snapshots, newerSnapshot],
  snapshot_state_events: [
    ...staleState.snapshot_state_events,
    {
      event_id: "snapshot_state_old_superseded",
      snapshot_id: originalSnapshot.snapshot_id,
      state: "superseded",
      sequence: 98,
      occurred_at: observedAt,
    },
    {
      event_id: "snapshot_state_new_active",
      snapshot_id: newerSnapshot.snapshot_id,
      state: "active",
      sequence: 99,
      occurred_at: observedAt,
    },
  ],
}));
assert.equal((await response(runtime({ readPort: latestMismatchPort }))).result,
  "projection_stale");

const inconsistentLineagePort = port(bundle(staleState, {
  lineage: [
    ...staleState.lineage,
    structuredClone(staleState.lineage[0]!),
  ],
}));
assert.equal(
  (await response(runtime({ readPort: inconsistentLineagePort }))).result,
  "projection_unavailable",
);

const scopeMismatchPort = port(bundle(staleState, {
  farm_scope: "farm_other",
}));
assert.equal((await response(runtime({ readPort: scopeMismatchPort }))).result,
  "projection_unavailable");

const repositoryFailure = await response(runtime({
  readPort: port(undefined, {
    readProjectionBundle: async () => {
      throw new Error("raw repository failure must be redacted");
    },
  }),
}));
assert.equal(repositoryFailure.result, "projection_unavailable");

// Bounded verified-lineage drilldown; no raw-history or unrelated-source port.
const defaultDrilldownPort = port();
const noDrilldownPort = port();
assert.equal((await response(runtime({ readPort: noDrilldownPort }))).result,
  "answered");
assert.equal(noDrilldownPort.evidence.lineageReads, 0);
const drilldown = await response(
  runtime({ readPort: defaultDrilldownPort }),
  request("この回答の根拠sourceを確認"),
);
assert.equal(drilldown.result, "answered");
assert.equal(drilldown.drilldown_used, true);
assert.equal(defaultDrilldownPort.evidence.lineageReads, 1);
assert.equal(defaultDrilldownPort.evidence.lastLimit, 20);
assert.deepEqual(
  defaultDrilldownPort.evidence.lastSnapshotIds,
  defaultDrilldownPort.evidence.lastSnapshotIds.filter((id) =>
    buildState().lineage.some((entry) =>
      entry.snapshot_id === id && entry.relation === "included"
    )
  ),
);
const hardLimitPort = port();
await response(
  runtime({ readPort: hardLimitPort, drilldownMaxRecords: 100 }),
  request("lineage evidence"),
);
assert.equal(hardLimitPort.evidence.lastLimit, 50);
assert.equal(parseFarmOsProjectionFirstRequest({
  ...request("lineage evidence"),
  drilldown_limit: 500,
}).valid, false);

const ungrounded = await response(runtime(), request("明日の天気は"));
assert.equal(ungrounded.result, "clarification_required");
assert.equal(ungrounded.answer, null);
assert.equal(ungrounded.writes_performed, false);

const unrelatedSourcePort = port(bundle(), {
  readLineageSources: async () => [{
    snapshot_id: "snapshot_unrelated",
    source_record_id: "work_unrelated",
    source_content_hash: "a".repeat(64),
    business_date: businessDate,
    field_reference: null,
    crop_cycle_reference: null,
    work_type_reference: null,
  }],
});
const unrelated = await response(
  runtime({ readPort: unrelatedSourcePort }),
  request("根拠source"),
);
assert.equal(unrelated.result, "guard_rejected");
assert.deepEqual(
  unrelated.response_guard.failure_codes,
  ["projection_lineage_invalid"],
);

// Deterministic Response Guard rejects any content not created from evidence.
const guardRef = answered.grounding_refs[0]!;
const guardBase = {
  answer: answered.answer!,
  expected_answer: answered.answer!,
  requested_business_date: businessDate,
  projection_business_date: businessDate,
  projection_fresh: true,
  grounding_refs: [guardRef],
  supported_fact: true,
  hidden_business_action: false,
  write_claim_without_proof: false,
  raw_reasoning_present: false,
};
assert.equal(guardFarmOsProjectionFirstResponse(guardBase).status, "passed");
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  answer: `${guardBase.answer} 未確認の事実`,
}).failure_codes, ["unsupported_fact"]);
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  grounding_refs: [],
}).failure_codes, ["insufficient_grounding"]);
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  projection_business_date: "2026-07-27",
}).failure_codes, ["business_date_mismatch"]);
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  projection_fresh: false,
}).failure_codes, ["projection_stale"]);
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  raw_reasoning_present: true,
}).failure_codes, ["response_contract_invalid"]);
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  hidden_business_action: true,
}).failure_codes, ["unsupported_fact"]);
assert.deepEqual(guardFarmOsProjectionFirstResponse({
  ...guardBase,
  write_claim_without_proof: true,
}).failure_codes, ["unsupported_fact"]);

// Explicit deep only: no read, no silent fast downgrade, no night queue.
const deepPort = port();
const deep = await response(
  runtime({ readPort: deepPort }),
  request("詳細分析", "deep"),
);
assert.equal(deep.result, "deep_analysis_unavailable");
assert.equal(deep.mode_requested, "deep");
assert.equal(deep.mode_used, "none");
assert.equal(deep.writes_performed, false);
assert.equal(deepPort.evidence.bundleReads, 0);
assert.equal(deepPort.evidence.lineageReads, 0);
const fastClarification = await response(runtime(), request("詳しく考えて"));
assert.equal(fastClarification.mode_requested, "fast");
assert.equal(fastClarification.result, "clarification_required");

// Channel-neutral service and fixed, non-fatal observability.
const events: FarmOsProjectionFirstEvent[] = [];
const service = new FarmOsProjectionFirstService(runtime({ events }));
const serviceResponse = await service.respond({
  request: request(),
  authorization_context: authorizationContext,
});
assert.equal(serviceResponse.result, "answered");
assert.deepEqual(events, [
  "FARMOS_PROJECTION_FIRST_REQUEST_ACCEPTED",
  "FARMOS_PROJECTION_SELECTED",
  "FARMOS_PROJECTION_RESPONSE_GUARD_PASSED",
  "FARMOS_PROJECTION_RESPONSE_COMPLETED",
]);
assert.equal(
  events.some((event) =>
    event.includes(request().query) || event.includes(farmScope)
  ),
  false,
);
const listenerFailure = new FarmOsProjectionFirstRuntime({
  authorization: allow,
  repository: port(),
  onEvent: () => {
    throw new Error("observer failure");
  },
});
assert.equal((await response(listenerFailure)).result, "answered");

// No mutable business/Candidate/Proposal port exists in the canonical service.
assert.deepEqual(
  Object.keys(service).sort(),
  ["runtime"],
);
assert.equal(answered.writes_performed, false);
assert.equal(deep.writes_performed, false);
assert.equal(unauthorized.writes_performed, false);

console.log("farm_os_day146_projection_first_runtime: PASS");
