import type {
  Day87ReadinessResult
} from "./hermes_pilot_readiness_operator_runbook_boundary";

export const DAY88_PILOT_SESSION_BOUNDARY =
  "day88_hermes_limited_readonly_pilot_session_boundary";

export const DAY88_REQUIRED_BASE_COMMIT = "d0c97a1";

export type Day88ProtectedProposalState = {
  id: string;
  status: string;
  applied_at: string | null;
  applied_by: string | null;
};

export type Day88SessionSnapshot = {
  transaction_read_only: boolean;
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  crop_cycle_count: number;
  day85_proposal_count: number;
  day85_decision_count: number;
  day85_apply_count: number;
  day85_proposal_status: string | null;
  day85_reviewed_by: string | null;
  day85_applied_by: string | null;
  day85_applied_at: string | null;
  protected_proposals: Day88ProtectedProposalState[];
  protected_crop_cycle_exists: boolean;
};

export type Day88PilotSessionInput = {
  head: string;
  day87_commit_present: boolean;
  git_clean: boolean;
  readiness: Day87ReadinessResult;
  before: Day88SessionSnapshot;
  after: Day88SessionSnapshot;
  inspected_resources: string[];
  prohibited_action_attempted: boolean;
};

export type Day88PilotSessionResult = {
  result: "completed" | "blocked";
  checked: "hermes_limited_readonly_pilot_session_boundary";
  boundary: typeof DAY88_PILOT_SESSION_BOUNDARY;
  pilot_mode: "limited_read_only_operator_pilot";
  head_valid: boolean;
  git_clean: boolean;
  readiness_valid: boolean;
  transaction_read_only_valid: boolean;
  counts_unchanged: boolean;
  day85_chain_unchanged: boolean;
  protected_proposals_unchanged: boolean;
  protected_crop_cycle_unchanged: boolean;
  inspected_resources_valid: boolean;
  prohibited_action_attempted: boolean;
  database_write_detected: boolean;
  session_invariant_valid: boolean;
  blockers: string[];
  before_counts: {
    proposal_count: number;
    decision_history_count: number;
    apply_history_count: number;
    crop_cycle_count: number;
  };
  after_counts: {
    proposal_count: number;
    decision_history_count: number;
    apply_history_count: number;
    crop_cycle_count: number;
  };
  inspected_resources: string[];
};

function normalizeProtectedProposals(
  proposals: Day88ProtectedProposalState[]
): Day88ProtectedProposalState[] {
  return [...proposals]
    .map((proposal) => ({
      id: proposal.id,
      status: proposal.status,
      applied_at: proposal.applied_at,
      applied_by: proposal.applied_by
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function evaluateDay88PilotSession(
  input: Day88PilotSessionInput
): Day88PilotSessionResult {
  const headValid =
    input.head.trim().length > 0 &&
    input.day87_commit_present === true;

  const readinessValid =
    input.readiness.result === "ready" &&
    input.readiness.pilot_readiness_valid === true &&
    input.readiness.blockers.length === 0;

  const transactionReadOnlyValid =
    input.before.transaction_read_only === true &&
    input.after.transaction_read_only === true;

  const countsUnchanged =
    input.before.proposal_count === input.after.proposal_count &&
    input.before.decision_history_count ===
      input.after.decision_history_count &&
    input.before.apply_history_count ===
      input.after.apply_history_count &&
    input.before.crop_cycle_count === input.after.crop_cycle_count &&
    input.before.proposal_count === 129 &&
    input.before.decision_history_count === 97 &&
    input.before.apply_history_count === 4 &&
    input.before.crop_cycle_count === 8;

  const day85ChainUnchanged =
    input.before.day85_proposal_count === 1 &&
    input.before.day85_decision_count === 1 &&
    input.before.day85_apply_count === 1 &&
    input.after.day85_proposal_count === 1 &&
    input.after.day85_decision_count === 1 &&
    input.after.day85_apply_count === 1 &&
    input.before.day85_proposal_status === "approved" &&
    input.after.day85_proposal_status === "approved" &&
    input.before.day85_reviewed_by === "hayate" &&
    input.after.day85_reviewed_by === "hayate" &&
    input.before.day85_applied_by === "hayate" &&
    input.after.day85_applied_by === "hayate" &&
    input.before.day85_applied_at !== null &&
    input.before.day85_applied_at ===
      input.after.day85_applied_at;

  const normalizedBeforeProtected =
    normalizeProtectedProposals(input.before.protected_proposals);

  const normalizedAfterProtected =
    normalizeProtectedProposals(input.after.protected_proposals);

  const protectedBaselineValid =
    normalizedBeforeProtected.length === 2 &&
    normalizedBeforeProtected.every(
      (proposal) =>
        proposal.status === "pending" &&
        proposal.applied_at === null &&
        proposal.applied_by === null
    );

  const protectedProposalsUnchanged =
    protectedBaselineValid &&
    sameJson(
      normalizedBeforeProtected,
      normalizedAfterProtected
    );

  const protectedCropCycleUnchanged =
    input.before.protected_crop_cycle_exists === true &&
    input.after.protected_crop_cycle_exists === true;

  const requiredResources = [
    "day85_proposal",
    "day85_decision_history",
    "day85_apply_history",
    "protected_proposals",
    "crop_cycle_count",
    "local_restore_consistency"
  ];

  const inspected = new Set(input.inspected_resources);

  const inspectedResourcesValid = requiredResources.every(
    (resource) => inspected.has(resource)
  );

  const databaseWriteDetected =
    !countsUnchanged ||
    !day85ChainUnchanged ||
    !protectedProposalsUnchanged ||
    !protectedCropCycleUnchanged;

  const blockers: string[] = [];

  if (!headValid) blockers.push("unexpected_head");
  if (!input.git_clean) blockers.push("git_working_tree_not_clean");
  if (!readinessValid) blockers.push("pilot_readiness_invalid");

  if (!transactionReadOnlyValid) {
    blockers.push("read_only_transaction_not_confirmed");
  }

  if (!countsUnchanged) blockers.push("database_counts_changed");

  if (!day85ChainUnchanged) {
    blockers.push("day85_audit_chain_changed");
  }

  if (!protectedProposalsUnchanged) {
    blockers.push("protected_proposals_changed");
  }

  if (!protectedCropCycleUnchanged) {
    blockers.push("protected_crop_cycle_changed");
  }

  if (!inspectedResourcesValid) {
    blockers.push("required_resource_not_inspected");
  }

  if (input.prohibited_action_attempted) {
    blockers.push("prohibited_action_attempted");
  }

  if (databaseWriteDetected) {
    blockers.push("database_write_or_state_change_detected");
  }

  const sessionInvariantValid = blockers.length === 0;

  return {
    result: sessionInvariantValid ? "completed" : "blocked",
    checked: "hermes_limited_readonly_pilot_session_boundary",
    boundary: DAY88_PILOT_SESSION_BOUNDARY,
    pilot_mode: "limited_read_only_operator_pilot",
    head_valid: headValid,
    git_clean: input.git_clean,
    readiness_valid: readinessValid,
    transaction_read_only_valid: transactionReadOnlyValid,
    counts_unchanged: countsUnchanged,
    day85_chain_unchanged: day85ChainUnchanged,
    protected_proposals_unchanged:
      protectedProposalsUnchanged,
    protected_crop_cycle_unchanged:
      protectedCropCycleUnchanged,
    inspected_resources_valid: inspectedResourcesValid,
    prohibited_action_attempted:
      input.prohibited_action_attempted,
    database_write_detected: databaseWriteDetected,
    session_invariant_valid: sessionInvariantValid,
    blockers,
    before_counts: {
      proposal_count: input.before.proposal_count,
      decision_history_count:
        input.before.decision_history_count,
      apply_history_count: input.before.apply_history_count,
      crop_cycle_count: input.before.crop_cycle_count
    },
    after_counts: {
      proposal_count: input.after.proposal_count,
      decision_history_count:
        input.after.decision_history_count,
      apply_history_count: input.after.apply_history_count,
      crop_cycle_count: input.after.crop_cycle_count
    },
    inspected_resources: [...input.inspected_resources]
  };
}
