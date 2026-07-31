import assert from "node:assert/strict";

import {
  compileFarmOsDailyProjection,
} from "../../src/lib/hermes/farm_os_operational_memory_compiler";
import type {
  FarmOsDailyProjection,
  FarmOsProjectionLineage,
  FarmOsProjectionStateEvent,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";
import {
  createFarmOsProjectionFirstRequest,
} from "../../src/lib/hermes/farm_os_projection_first_contract";
import {
  FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL,
  FarmOsProjectionFirstPostgresReadAdapter,
  type FarmOsProjectionFirstPostgresPool,
} from "../../src/lib/hermes/farm_os_projection_first_postgres_read_adapter";
import {
  FarmOsProjectionFirstRuntime,
} from "../../src/lib/hermes/farm_os_projection_first_runtime";
import {
  selectFarmOsProjectionFirstProjection,
  type FarmOsProjectionFirstScopedBundle,
} from "../../src/lib/hermes/farm_os_projection_first_selector";

const businessDate = "2026-07-28";
const farmScope = "farm_fixture_01";
const installationId = "installation_fixture_01";
const generated = compileFarmOsDailyProjection({
  business_date: businessDate,
  snapshots: [],
  snapshot_state_events: [],
});

function projection(input: {
  id: string;
  version?: number;
  generated_at?: string;
  private_marker?: string;
}): FarmOsDailyProjection {
  const content = structuredClone(generated.content);
  if (input.private_marker !== undefined) {
    content.work_type_references = [input.private_marker];
  }
  return {
    projection_id: input.id,
    projection_type: "daily_work_records",
    projection_version: input.version ?? 1,
    business_date: businessDate,
    compiler_id: generated.compiler_id,
    compiler_version: generated.compiler_version,
    content_hash: input.private_marker === undefined
      ? generated.content_hash
      : "c".repeat(64),
    content,
    generated_at: input.generated_at ?? "2026-07-28T06:00:00.000Z",
    supersedes_projection_id: null,
  };
}

function stateEvent(input: {
  id: string;
  projection_id: string;
  status: unknown;
  sequence: number;
}): FarmOsProjectionStateEvent {
  return {
    event_id: input.id,
    projection_id: input.projection_id,
    status: input.status as FarmOsProjectionStateEvent["status"],
    sequence: input.sequence,
    occurred_at: "2026-07-28T06:00:00.000Z",
  };
}

function bundle(input: {
  projections: FarmOsDailyProjection[];
  events: FarmOsProjectionStateEvent[];
  lineage?: FarmOsProjectionLineage[];
}): FarmOsProjectionFirstScopedBundle {
  return {
    farm_scope: farmScope,
    business_date: businessDate,
    full_history_scan_performed: false,
    projections: structuredClone(input.projections),
    projection_state_events: structuredClone(input.events),
    lineage: structuredClone(input.lineage ?? []),
    snapshots: [],
    snapshot_state_events: [],
  };
}

function select(input: {
  projections: FarmOsDailyProjection[];
  events: FarmOsProjectionStateEvent[];
  lineage?: FarmOsProjectionLineage[];
}) {
  return selectFarmOsProjectionFirstProjection({
    authorized_farm_scope: farmScope,
    business_date: businessDate,
    bundle: bundle(input),
  });
}

function history(
  projectionId: string,
  statuses: unknown[],
  sequences = statuses.map((_, index) => index + 1),
): FarmOsProjectionStateEvent[] {
  return statuses.map((status, index) =>
    stateEvent({
      id: `${projectionId}_event_${index + 1}`,
      projection_id: projectionId,
      status,
      sequence: sequences[index]!,
    })
  );
}

const active = projection({ id: "projection_active" });
const candidate = projection({
  id: "projection_candidate_private",
  version: 2,
  generated_at: "2026-07-28T06:02:03.000Z",
  private_marker: "candidate_private_content",
});
const candidateTwo = projection({
  id: "projection_candidate_two",
  version: 3,
  private_marker: "candidate_second_private",
});

const activeOnly = select({
  projections: [active],
  events: history(active.projection_id, ["active"]),
});
assert.equal(activeOnly.result, "selected");
assert.equal(activeOnly.projection?.projection_id, active.projection_id);

assert.equal(select({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate"]),
}).result, "projection_missing");

const activeCandidate = select({
  projections: [active, candidate],
  events: [
    ...history(active.projection_id, ["active"]),
    ...history(candidate.projection_id, ["candidate"]),
  ],
});
assert.equal(activeCandidate.result, "selected");
assert.deepEqual(activeCandidate, activeOnly);

const activeMultipleCandidates = select({
  projections: [active, candidate, candidateTwo],
  events: [
    ...history(active.projection_id, ["active"]),
    ...history(candidate.projection_id, ["candidate"]),
    ...history(candidateTwo.projection_id, ["candidate"]),
  ],
});
assert.deepEqual(activeMultipleCandidates, activeOnly);

assert.equal(select({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate", "rejected"]),
}).result, "projection_missing");
assert.equal(select({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate", "failed"]),
}).result, "projection_missing");
assert.equal(select({
  projections: [active],
  events: history(active.projection_id, ["active", "superseded"]),
}).result, "projection_missing");

const legacyActive = select({
  projections: [active],
  events: history(active.projection_id, ["active"]),
});
assert.equal(legacyActive.result, "selected");

assert.equal(select({
  projections: [candidate],
  events: [],
}).result, "projection_unavailable");
assert.equal(select({
  projections: [candidate],
  events: history(candidate.projection_id, ["unknown"]),
}).result, "projection_unavailable");
assert.equal(select({
  projections: [candidate],
  events: [
    stateEvent({
      id: "duplicate_event",
      projection_id: candidate.projection_id,
      status: "candidate",
      sequence: 1,
    }),
    stateEvent({
      id: "duplicate_event",
      projection_id: candidate.projection_id,
      status: "active",
      sequence: 2,
    }),
  ],
}).result, "projection_unavailable");
assert.equal(select({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate", "active"], [1, 1]),
}).result, "projection_unavailable");
assert.equal(select({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate", "active"], [2, 1]),
}).result, "projection_unavailable");

for (const statuses of [
  ["active", "candidate"],
  ["active", "rejected"],
  ["active", "failed"],
  ["candidate", "superseded"],
  ["candidate", "candidate"],
] as const) {
  assert.equal(select({
    projections: [candidate],
    events: history(candidate.projection_id, [...statuses]),
  }).result, "projection_unavailable");
}
for (const initial of ["rejected", "failed", "superseded"] as const) {
  assert.equal(select({
    projections: [candidate],
    events: history(candidate.projection_id, [initial]),
  }).result, "projection_unavailable");
}

assert.equal(select({
  projections: [active, candidate],
  events: [
    ...history(active.projection_id, ["active"]),
    ...history(candidate.projection_id, ["candidate", "superseded"]),
  ],
}).result, "projection_unavailable");

function assertDuplicateActiveUnavailable(
  left: FarmOsDailyProjection,
  right: FarmOsDailyProjection,
): void {
  assert.equal(select({
    projections: [left, right],
    events: [
      ...history(left.projection_id, ["active"]),
      ...history(right.projection_id, ["active"]),
    ],
  }).result, "projection_unavailable");
}

assertDuplicateActiveUnavailable(
  projection({ id: "projection_version_low", version: 1 }),
  projection({ id: "projection_version_high", version: 99 }),
);
assertDuplicateActiveUnavailable(
  projection({
    id: "projection_generated_early",
    generated_at: "2026-07-28T01:00:00.000Z",
  }),
  projection({
    id: "projection_generated_late",
    generated_at: "2026-07-28T23:00:00.000Z",
  }),
);
assertDuplicateActiveUnavailable(
  projection({ id: "projection_a" }),
  projection({ id: "projection_z" }),
);

type QueryRecord = { text: string; values: unknown[] };

function projectionRows(values: FarmOsDailyProjection[]) {
  return values.map(({ content, ...value }) => ({
    ...value,
    projection_content: structuredClone(content),
  }));
}

function fakePool(input: {
  projections: FarmOsDailyProjection[];
  events: FarmOsProjectionStateEvent[];
  lineage?: FarmOsProjectionLineage[];
}): FarmOsProjectionFirstPostgresPool & { queries: QueryRecord[] } {
  const queries: QueryRecord[] = [];
  return {
    queries,
    connect: async () => ({
      query: async (query: unknown, values: unknown[] = []) => {
        const text = String(query);
        queries.push({ text, values: structuredClone(values) });
        if (text.includes("operational_memory_daily_projections")) {
          return { rows: projectionRows(input.projections) };
        }
        if (text.includes("operational_memory_projection_state_events")) {
          return { rows: structuredClone(input.events) };
        }
        if (text.includes("operational_memory_projection_lineage")) {
          return { rows: structuredClone(input.lineage ?? []) };
        }
        return { rows: [] };
      },
      release: () => undefined,
    }) as never,
  };
}

function lineageQueryCount(pool: { queries: QueryRecord[] }): number {
  return pool.queries.filter((query) =>
    query.text.includes("operational_memory_projection_lineage")
  ).length;
}

async function readAdapter(input: {
  projections: FarmOsDailyProjection[];
  events: FarmOsProjectionStateEvent[];
}) {
  const pool = fakePool(input);
  const adapter = new FarmOsProjectionFirstPostgresReadAdapter({
    installation_binding: {
      installation_id: installationId,
      farm_scope: farmScope,
      timezone: "Asia/Tokyo",
    },
    postgres_pool: pool,
  });
  const readBundle = await adapter.readProjectionBundle({
    authorized_scope: {
      installation_id: installationId,
      farm_scope: farmScope,
      authorization_id: "authorization_fixture",
    },
    business_date: businessDate,
  });
  return { pool, adapter, bundle: readBundle };
}

const candidateRead = await readAdapter({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate"]),
});
assert.equal(lineageQueryCount(candidateRead.pool), 0);

const rejectedRead = await readAdapter({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate", "rejected"]),
});
assert.equal(lineageQueryCount(rejectedRead.pool), 0);

for (const candidates of [[candidate], [candidate, candidateTwo]]) {
  const read = await readAdapter({
    projections: [active, ...candidates],
    events: [
      ...history(active.projection_id, ["active"]),
      ...candidates.flatMap((value) =>
        history(value.projection_id, ["candidate"])
      ),
    ],
  });
  assert.equal(lineageQueryCount(read.pool), 1);
  assert.deepEqual(
    read.pool.queries.find((query) =>
      query.text.includes("operational_memory_projection_lineage")
    )?.values,
    [active.projection_id],
  );
}

const duplicateRead = await readAdapter({
  projections: [
    projection({ id: "adapter_active_1" }),
    projection({ id: "adapter_active_2", version: 2 }),
  ],
  events: [
    ...history("adapter_active_1", ["active"]),
    ...history("adapter_active_2", ["active"]),
  ],
});
assert.equal(lineageQueryCount(duplicateRead.pool), 0);
assert.equal(selectFarmOsProjectionFirstProjection({
  authorized_farm_scope: farmScope,
  business_date: businessDate,
  bundle: duplicateRead.bundle,
}).result, "projection_unavailable");

const invalidRead = await readAdapter({
  projections: [active, candidate],
  events: [
    ...history(active.projection_id, ["active"]),
    ...history(candidate.projection_id, ["candidate", "superseded"]),
  ],
});
assert.equal(lineageQueryCount(invalidRead.pool), 0);
assert.equal(selectFarmOsProjectionFirstProjection({
  authorized_farm_scope: farmScope,
  business_date: businessDate,
  bundle: invalidRead.bundle,
}).result, "projection_unavailable");

const promotedCandidate = projection({ id: "adapter_promoted_candidate" });
const orderedEvents = history(promotedCandidate.projection_id, [
  "candidate",
  "active",
]);
const orderedRead = await readAdapter({
  projections: [promotedCandidate],
  events: orderedEvents,
});
assert.deepEqual(orderedRead.bundle.projection_state_events, orderedEvents);
assert.equal(selectFarmOsProjectionFirstProjection({
  authorized_farm_scope: farmScope,
  business_date: businessDate,
  bundle: orderedRead.bundle,
}).result, "selected");

const outOfOrderEvents = history(
  promotedCandidate.projection_id,
  ["candidate", "active"],
  [2, 1],
);
const outOfOrderRead = await readAdapter({
  projections: [promotedCandidate],
  events: outOfOrderEvents,
});
assert.deepEqual(
  outOfOrderRead.bundle.projection_state_events,
  outOfOrderEvents,
);
assert.equal(lineageQueryCount(outOfOrderRead.pool), 0);
assert.equal(selectFarmOsProjectionFirstProjection({
  authorized_farm_scope: farmScope,
  business_date: businessDate,
  bundle: outOfOrderRead.bundle,
}).result, "projection_unavailable");

for (const read of [
  candidateRead,
  rejectedRead,
  duplicateRead,
  invalidRead,
  orderedRead,
  outOfOrderRead,
]) {
  assert.equal(
    read.pool.queries[0]?.text,
    FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.begin,
  );
  assert.equal(read.pool.queries.at(-1)?.text, "commit");
  assert.equal(
    read.pool.queries.some((query) =>
      /\b(?:insert|update|delete|call|persist_operational_memory_bundle)\b/iu
        .test(query.text)
    ),
    false,
  );
}

const authorizationContext = {
  installation_id: installationId,
  bound_farm_scope: farmScope,
  subject_id: "operator_fixture",
  channel: "cli",
  actor_authorized: true,
  authorization_evidence_id: "authorization_fixture",
  authentication_method: "fixture",
} as const;
const request = createFarmOsProjectionFirstRequest({
  query: "作業記録は何件ですか",
  business_date: businessDate,
  farm_scope: farmScope,
  requested_at: "2026-07-28T06:01:00.000Z",
});

async function runtimeResponse(readBundle: FarmOsProjectionFirstScopedBundle) {
  const runtime = new FarmOsProjectionFirstRuntime({
    authorization: {
      authorize: async () => ({
        installation_id: installationId,
        farm_scope: farmScope,
        authorization_id: "authorization_fixture",
      }),
    },
    repository: {
      readProjectionBundle: async () => structuredClone(readBundle),
      readLineageSources: async () => [],
    },
  });
  return runtime.respond({
    request,
    authorization_context: authorizationContext,
  });
}

const candidateLineage: FarmOsProjectionLineage = {
  projection_id: candidate.projection_id,
  snapshot_id: "candidate_private_snapshot",
  source_record_id: "candidate_private_source",
  source_content_hash: null,
  relation: "included",
};
const candidateResponse = await runtimeResponse(bundle({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate"]),
  lineage: [candidateLineage],
}));
assert.deepEqual({
  result: candidateResponse.result,
  answer: candidateResponse.answer,
  projection_id: candidateResponse.projection_id,
  as_of: candidateResponse.as_of,
  grounding_refs: candidateResponse.grounding_refs,
  writes_performed: candidateResponse.writes_performed,
}, {
  result: "projection_missing",
  answer: null,
  projection_id: null,
  as_of: null,
  grounding_refs: [],
  writes_performed: false,
});
assert.equal(candidateResponse.response_guard.status, "rejected");
const candidateResponseJson = JSON.stringify(candidateResponse);
for (const privateValue of [
  candidate.projection_id,
  candidate.generated_at,
  "candidate_private_content",
  candidateLineage.snapshot_id,
  candidateLineage.source_record_id,
]) {
  assert.equal(candidateResponseJson.includes(privateValue), false);
}

const activeCandidateResponse = await runtimeResponse(bundle({
  projections: [active, candidate],
  events: [
    ...history(active.projection_id, ["active"]),
    ...history(candidate.projection_id, ["candidate"]),
  ],
  lineage: [candidateLineage],
}));
assert.equal(activeCandidateResponse.result, "answered");
assert.equal(activeCandidateResponse.projection_id, active.projection_id);
assert.match(activeCandidateResponse.answer ?? "", /0件/u);
assert.equal(
  JSON.stringify(activeCandidateResponse).includes(candidate.projection_id),
  false,
);
assert.equal(activeCandidateResponse.writes_performed, false);
assert.equal(activeCandidateResponse.response_guard.status, "passed");

const invalidResponse = await runtimeResponse(bundle({
  projections: [candidate],
  events: history(candidate.projection_id, ["candidate", "superseded"]),
}));
assert.equal(invalidResponse.result, "projection_unavailable");
assert.equal(invalidResponse.answer, null);
assert.equal(invalidResponse.projection_id, null);
assert.equal(invalidResponse.as_of, null);
assert.deepEqual(invalidResponse.grounding_refs, []);
assert.equal(invalidResponse.writes_performed, false);

const duplicateResponse = await runtimeResponse(duplicateRead.bundle);
assert.equal(duplicateResponse.result, "projection_unavailable");
assert.equal(duplicateResponse.answer, null);
assert.equal(duplicateResponse.projection_id, null);
assert.deepEqual(duplicateResponse.grounding_refs, []);
assert.equal(duplicateResponse.writes_performed, false);

console.log("farm_os_day147a4_candidate_exclusion: PASS");
