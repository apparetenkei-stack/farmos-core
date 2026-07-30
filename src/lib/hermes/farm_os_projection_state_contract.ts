export const FARM_OS_PROJECTION_STATES = [
  "candidate",
  "active",
  "rejected",
  "superseded",
  "failed",
] as const;

export type FarmOsProjectionState =
  typeof FARM_OS_PROJECTION_STATES[number];

export type FarmOsProjectionStateParseResult =
  | {
    valid: true;
    value: FarmOsProjectionState;
    failure_code: null;
  }
  | {
    valid: false;
    value: null;
    failure_code: "invalid_projection_state";
  };

export type FarmOsProjectionStateTransition = {
  from: FarmOsProjectionState | null;
  to: FarmOsProjectionState;
};

export const FARM_OS_ALLOWED_PROJECTION_STATE_TRANSITIONS = [
  { from: null, to: "candidate" },
  { from: "candidate", to: "active" },
  { from: "candidate", to: "rejected" },
  { from: "candidate", to: "failed" },
  { from: "active", to: "superseded" },
] as const satisfies readonly FarmOsProjectionStateTransition[];

export type FarmOsProjectionStateTransitionValidation =
  | {
    valid: true;
    failure_code: null;
  }
  | {
    valid: false;
    failure_code:
      | "duplicate_projection_state"
      | "forbidden_projection_state_transition";
  };

export type FarmOsProjectionStateHistoryContract =
  | "day146_legacy_active_first"
  | "day147_candidate_first";

export type FarmOsProjectionStateHistoryEvent = {
  event_id: string;
  status: unknown;
  sequence: number;
};

export type FarmOsProjectionStateMaterialization =
  | {
    result: "materialized";
    persisted_state: FarmOsProjectionState;
    history_contract: FarmOsProjectionStateHistoryContract;
  }
  | {
    result: "invalid_state_history";
    persisted_state: null;
    history_contract: null;
  };

function invalidStateHistory(): FarmOsProjectionStateMaterialization {
  return {
    result: "invalid_state_history",
    persisted_state: null,
    history_contract: null,
  };
}

export function parseFarmOsProjectionState(
  value: unknown,
): FarmOsProjectionStateParseResult {
  if (
    typeof value !== "string" ||
    !FARM_OS_PROJECTION_STATES.some((state) => state === value)
  ) {
    return {
      valid: false,
      value: null,
      failure_code: "invalid_projection_state",
    };
  }
  return {
    valid: true,
    value: value as FarmOsProjectionState,
    failure_code: null,
  };
}

export function validateFarmOsProjectionStateTransition(
  transition: FarmOsProjectionStateTransition,
): FarmOsProjectionStateTransitionValidation {
  if (transition.from === transition.to) {
    return {
      valid: false,
      failure_code: "duplicate_projection_state",
    };
  }
  const valid = FARM_OS_ALLOWED_PROJECTION_STATE_TRANSITIONS.some((allowed) =>
    allowed.from === transition.from && allowed.to === transition.to
  );
  return valid
    ? { valid: true, failure_code: null }
    : {
      valid: false,
      failure_code: "forbidden_projection_state_transition",
    };
}

export function materializeFarmOsProjectionStateHistory(
  events: readonly FarmOsProjectionStateHistoryEvent[],
): FarmOsProjectionStateMaterialization {
  if (events.length === 0) return invalidStateHistory();

  const eventIds = new Set<string>();
  const sequences = new Set<number>();
  const states: FarmOsProjectionState[] = [];
  let previousSequence: number | null = null;

  for (const event of events) {
    if (
      typeof event.event_id !== "string" ||
      event.event_id.length === 0 ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence < 1 ||
      eventIds.has(event.event_id) ||
      sequences.has(event.sequence) ||
      (previousSequence !== null && event.sequence <= previousSequence)
    ) {
      return invalidStateHistory();
    }
    const parsed = parseFarmOsProjectionState(event.status);
    if (!parsed.valid) return invalidStateHistory();
    eventIds.add(event.event_id);
    sequences.add(event.sequence);
    states.push(parsed.value);
    previousSequence = event.sequence;
  }

  const first = states[0];
  if (first !== "active" && first !== "candidate") {
    return invalidStateHistory();
  }
  const historyContract: FarmOsProjectionStateHistoryContract =
    first === "active"
      ? "day146_legacy_active_first"
      : "day147_candidate_first";
  if (
    first === "candidate" &&
    !validateFarmOsProjectionStateTransition({
      from: null,
      to: first,
    }).valid
  ) {
    return invalidStateHistory();
  }
  for (let index = 1; index < states.length; index += 1) {
    const from = states[index - 1];
    const to = states[index];
    if (
      from === undefined ||
      to === undefined ||
      !validateFarmOsProjectionStateTransition({ from, to }).valid
    ) {
      return invalidStateHistory();
    }
  }

  const persistedState = states.at(-1);
  return persistedState === undefined
    ? invalidStateHistory()
    : {
      result: "materialized",
      persisted_state: persistedState,
      history_contract: historyContract,
    };
}
