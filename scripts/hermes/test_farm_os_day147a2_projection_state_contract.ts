import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  FARM_OS_ALLOWED_PROJECTION_STATE_TRANSITIONS,
  FARM_OS_PROJECTION_STATES,
  materializeFarmOsProjectionStateHistory,
  parseFarmOsProjectionState,
  validateFarmOsProjectionStateTransition,
  type FarmOsProjectionState,
  type FarmOsProjectionStateHistoryEvent,
} from "../../src/lib/hermes/farm_os_projection_state_contract";
import {
  createEmptyFarmOsOperationalMemoryState,
  materializeFarmOsProjectionStates,
  type FarmOsDailyProjection,
} from "../../src/lib/hermes/farm_os_operational_memory_persistence";

const EXPECTED_STATES = [
  "candidate",
  "active",
  "rejected",
  "superseded",
  "failed",
] as const;
const EXPECTED_TRANSITIONS = new Set([
  "missing->candidate",
  "candidate->active",
  "candidate->rejected",
  "candidate->failed",
  "active->superseded",
]);

function transitionKey(
  from: FarmOsProjectionState | null,
  to: FarmOsProjectionState,
): string {
  return `${from ?? "missing"}->${to}`;
}

function history(
  states: readonly unknown[],
): FarmOsProjectionStateHistoryEvent[] {
  return states.map((status, index) => ({
    event_id: `event_${index + 1}`,
    status,
    sequence: index + 1,
  }));
}

function expectedMaterialization(
  persistedState: FarmOsProjectionState,
  historyContract:
    | "day146_legacy_active_first"
    | "day147_candidate_first",
) {
  return {
    result: "materialized",
    persisted_state: persistedState,
    history_contract: historyContract,
  };
}

function fixtureProjection(): FarmOsDailyProjection {
  return {
    projection_id: "projection_fixture",
    projection_type: "daily_work_records",
    projection_version: 1,
    business_date: "2026-07-31",
    compiler_id: "farmos.operational_memory.daily_work_records",
    compiler_version: 1,
    content_hash: "a".repeat(64),
    content: {} as FarmOsDailyProjection["content"],
    generated_at: "2026-07-31T00:00:00Z",
    supersedes_projection_id: null,
  };
}

function runTargetedTypecheck(): void {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "--ignoreConfig",
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ES2022",
      "--lib",
      "ES2022,DOM",
      "--types",
      "node",
      "--module",
      "ESNext",
      "--moduleResolution",
      "Bundler",
      "--esModuleInterop",
      "--pretty",
      "false",
      "src/lib/hermes/farm_os_projection_state_contract.ts",
      "src/lib/hermes/farm_os_operational_memory_persistence.ts",
      "scripts/hermes/test_farm_os_day147a2_projection_state_contract.ts",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  const output = `${result.stdout}${result.stderr}`;
  const diagnostics = output
    .split("\n")
    .filter((line) => /\berror TS\d+:/.test(line));
  if (result.status !== 0 || diagnostics.length !== 0) {
    process.stderr.write(output);
    throw new Error("day147a2_targeted_typecheck_failed");
  }
  console.log("farm_os_day147a2_projection_state_contract_typecheck: PASS");
}

function runTests(): void {
  assert.deepEqual(FARM_OS_PROJECTION_STATES, EXPECTED_STATES);
  for (const state of EXPECTED_STATES) {
    assert.deepEqual(parseFarmOsProjectionState(state), {
      valid: true,
      value: state,
      failure_code: null,
    });
  }
  for (
    const invalid of [
      "unknown",
      "CANDIDATE",
      "Active",
      " candidate",
      "candidate ",
      "",
      null,
      undefined,
      1,
      {},
    ]
  ) {
    assert.deepEqual(parseFarmOsProjectionState(invalid), {
      valid: false,
      value: null,
      failure_code: "invalid_projection_state",
    });
  }

  const actualTransitions = new Set(
    FARM_OS_ALLOWED_PROJECTION_STATE_TRANSITIONS.map(({ from, to }) =>
      transitionKey(from, to)
    ),
  );
  assert.deepEqual(actualTransitions, EXPECTED_TRANSITIONS);
  assert.equal(
    FARM_OS_ALLOWED_PROJECTION_STATE_TRANSITIONS.length,
    EXPECTED_TRANSITIONS.size,
  );

  const transitionInputs = Object.freeze(
    ([null, ...EXPECTED_STATES] as const).flatMap((from) =>
      EXPECTED_STATES.map((to) => Object.freeze({ from, to }))
    ),
  );
  const transitionInputsBefore = structuredClone(transitionInputs);
  for (const transition of transitionInputs) {
    const expected = EXPECTED_TRANSITIONS.has(
      transitionKey(transition.from, transition.to),
    );
    assert.equal(
      validateFarmOsProjectionStateTransition(transition).valid,
      expected,
      transitionKey(transition.from, transition.to),
    );
  }
  assert.deepEqual(transitionInputs, transitionInputsBefore);
  for (const state of EXPECTED_STATES) {
    assert.deepEqual(
      validateFarmOsProjectionStateTransition({ from: state, to: state }),
      {
        valid: false,
        failure_code: "duplicate_projection_state",
      },
    );
  }
  for (const terminal of ["rejected", "superseded", "failed"] as const) {
    for (const next of EXPECTED_STATES) {
      assert.equal(
        validateFarmOsProjectionStateTransition({
          from: terminal,
          to: next,
        }).valid,
        false,
      );
    }
  }

  const invalidMaterialization = {
    result: "invalid_state_history",
    persisted_state: null,
    history_contract: null,
  };
  assert.deepEqual(
    materializeFarmOsProjectionStateHistory([]),
    invalidMaterialization,
  );
  assert.notEqual(
    materializeFarmOsProjectionStateHistory([]).persisted_state,
    "failed",
  );

  assert.deepEqual(
    materializeFarmOsProjectionStateHistory(history(["active"])),
    expectedMaterialization("active", "day146_legacy_active_first"),
  );
  assert.deepEqual(
    materializeFarmOsProjectionStateHistory(
      history(["active", "superseded"]),
    ),
    expectedMaterialization("superseded", "day146_legacy_active_first"),
  );

  const candidateHistories = [
    ["candidate"],
    ["candidate", "active"],
    ["candidate", "rejected"],
    ["candidate", "failed"],
    ["candidate", "active", "superseded"],
  ] as const;
  for (const states of candidateHistories) {
    assert.deepEqual(
      materializeFarmOsProjectionStateHistory(history(states)),
      expectedMaterialization(
        states.at(-1) as FarmOsProjectionState,
        "day147_candidate_first",
      ),
    );
  }

  const legacyInvalidHistories = [
    ["active", "rejected"],
    ["active", "failed"],
    ["active", "candidate"],
  ] as const;
  const invalidHistories = [
    ["failed"],
    ["rejected"],
    ["superseded"],
    ["active", "active"],
    ...legacyInvalidHistories,
    ["candidate", "candidate"],
    ["candidate", "superseded"],
    ["rejected", "active"],
    ["failed", "active"],
    ["superseded", "active"],
    ["candidate", "unknown"],
  ] as const;
  for (const states of invalidHistories) {
    assert.deepEqual(
      materializeFarmOsProjectionStateHistory(history(states)),
      invalidMaterialization,
      states.join(" -> "),
    );
  }
  for (const states of legacyInvalidHistories) {
    assert.deepEqual(
      materializeFarmOsProjectionStateHistory(history(states)),
      invalidMaterialization,
      `legacy active-first must reject ${states.join(" -> ")}`,
    );
  }

  assert.deepEqual(
    materializeFarmOsProjectionStateHistory([
      { event_id: "duplicate", status: "candidate", sequence: 1 },
      { event_id: "duplicate", status: "active", sequence: 2 },
    ]),
    invalidMaterialization,
  );
  assert.deepEqual(
    materializeFarmOsProjectionStateHistory([
      { event_id: "event_1", status: "candidate", sequence: 1 },
      { event_id: "event_2", status: "active", sequence: 1 },
    ]),
    invalidMaterialization,
  );
  assert.deepEqual(
    materializeFarmOsProjectionStateHistory([
      { event_id: "event_1", status: "candidate", sequence: 2 },
      { event_id: "event_2", status: "active", sequence: 1 },
    ]),
    invalidMaterialization,
  );
  const invalidIdentityAndSequenceCases = [
    { label: "empty event ID", event_id: "", sequence: 1 },
    { label: "zero sequence", event_id: "event_zero", sequence: 0 },
    { label: "negative sequence", event_id: "event_negative", sequence: -1 },
    {
      label: "fractional sequence",
      event_id: "event_fractional",
      sequence: 1.5,
    },
    { label: "NaN sequence", event_id: "event_nan", sequence: Number.NaN },
    {
      label: "positive Infinity sequence",
      event_id: "event_positive_infinity",
      sequence: Number.POSITIVE_INFINITY,
    },
    {
      label: "negative Infinity sequence",
      event_id: "event_negative_infinity",
      sequence: Number.NEGATIVE_INFINITY,
    },
  ] as const;
  for (const invalidEvent of invalidIdentityAndSequenceCases) {
    assert.deepEqual(
      materializeFarmOsProjectionStateHistory([{
        event_id: invalidEvent.event_id,
        status: "candidate",
        sequence: invalidEvent.sequence,
      }]),
      invalidMaterialization,
      invalidEvent.label,
    );
  }
  assert.deepEqual(
    materializeFarmOsProjectionStateHistory([{
      event_id: " ",
      status: "candidate",
      sequence: 1,
    }]),
    expectedMaterialization("candidate", "day147_candidate_first"),
    "event ID contract requires a non-empty string and does not trim",
  );

  const immutableHistory = Object.freeze([
    Object.freeze({ event_id: "event_1", status: "candidate", sequence: 1 }),
    Object.freeze({ event_id: "event_2", status: "active", sequence: 2 }),
  ]);
  const immutableHistoryBefore = structuredClone(immutableHistory);
  materializeFarmOsProjectionStateHistory(immutableHistory);
  assert.deepEqual(immutableHistory, immutableHistoryBefore);

  const emptyState = createEmptyFarmOsOperationalMemoryState();
  emptyState.projections.push(fixtureProjection());
  assert.deepEqual(materializeFarmOsProjectionStates(emptyState)[0], {
    ...fixtureProjection(),
    status: null,
    state_materialization: invalidMaterialization,
  });
  emptyState.projection_state_events.push({
    event_id: "legacy_active",
    projection_id: "projection_fixture",
    status: "active",
    sequence: 1,
    occurred_at: "2026-07-31T00:00:00Z",
  });
  assert.deepEqual(
    materializeFarmOsProjectionStates(emptyState)[0]?.state_materialization,
    expectedMaterialization("active", "day146_legacy_active_first"),
  );
  const candidateState = createEmptyFarmOsOperationalMemoryState();
  candidateState.projections.push(fixtureProjection());
  candidateState.projection_state_events.push({
    event_id: "candidate_initial",
    projection_id: "projection_fixture",
    status: "candidate",
    sequence: 1,
    occurred_at: "2026-07-31T00:00:00Z",
  });
  assert.deepEqual(materializeFarmOsProjectionStates(candidateState)[0], {
    ...fixtureProjection(),
    status: "candidate",
    state_materialization: expectedMaterialization(
      "candidate",
      "day147_candidate_first",
    ),
  });

  const contractSource = readFileSync(
    new URL(
      "../../src/lib/hermes/farm_os_projection_state_contract.ts",
      import.meta.url,
    ),
    "utf8",
  );
  for (
    const forbiddenDependency of [
      "node:fs",
      "node:child_process",
      "process.env",
      "console.",
      "fetch(",
      "postgres",
      "repository",
    ]
  ) {
    assert.equal(contractSource.includes(forbiddenDependency), false);
  }

  console.log("farm_os_day147a2_projection_state_contract: PASS");
}

if (process.argv.includes("--typecheck")) {
  runTargetedTypecheck();
} else {
  runTests();
}
