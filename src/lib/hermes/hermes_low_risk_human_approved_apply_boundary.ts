export const DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID = "day85_low_risk_apply_boundary_test_v1" as const;
export const DAY85_LOW_RISK_APPLY_PROPOSAL_ID = "85f11111-88db-41fd-a048-1c37266fd9e0" as const;
export const DAY85_LOW_RISK_APPLY_DECISION_ID = "85d11111-88db-41fd-a048-1c37266fd9e0" as const;
export const DAY85_LOW_RISK_APPLY_BOUNDARY = "day85_low_risk_human_approved_no_op_apply_boundary" as const;

export type Day85Counts = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  day85_proposal_count: number;
  day85_decision_count: number;
  day85_apply_count: number;
  app_crop_cycles_count: number;
  protected_crop_cycle_exists: boolean;
  day81_status: string | null;
  day81_applied_by: string | null;
  day81_applied_at: string | null;
  protected_status: string | null;
  protected_applied_by: string | null;
  protected_applied_at: string | null;
};

export type Day85ApplyEvent = {
  id: string;
  proposal_id: string;
  apply_operation: string;
  result: string;
  dry_run: boolean;
  committed: boolean;
  app_projection_apply_performed: boolean;
  ai_proposal_apply_marker_updated: boolean;
  inserted_crop_cycle_id: number | null;
  applied_by: string;
  applied_by_role: string;
  apply_source: string;
};

export type Day85ProposalMarker = {
  id: string;
  proposal_type: string;
  title: string;
  risk_level: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
};

export type Day85Executor = {
  getCounts: () => Promise<Day85Counts>;
  ensureFixture: () => Promise<{ proposalCreated: boolean; decisionCreated: boolean }>;
  previewNoOpCandidate: () => Promise<{ operation: string; result: string }>;
  commitNoOpApply: () => Promise<{ applyInserted: boolean; markerUpdated: boolean }>;
  readDay85Proposal: () => Promise<Day85ProposalMarker | null>;
  readDay85ApplyEvent: () => Promise<Day85ApplyEvent | null>;
};

export type Day85Result = {
  result: "ok";
  boundary: typeof DAY85_LOW_RISK_APPLY_BOUNDARY;
  boundary_test_id: typeof DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID;
  proposal_id: typeof DAY85_LOW_RISK_APPLY_PROPOSAL_ID;
  proposal_created: boolean;
  decision_created: boolean;
  preview_result: string;
  preview_operation: string;
  apply_inserted: boolean;
  marker_updated: boolean;
  committed_apply_event_created: boolean;
  no_op_apply_committed: boolean;
  app_projection_apply_performed: false;
  app_schema_write_performed: false;
  app_crop_cycles_insert_performed: false;
  app_crop_cycles_update_performed: false;
  app_crop_cycles_delete_performed: false;
  ai_proposal_apply_marker_updated: true;
  proposal_status_updated: false;
  confirmation_token_created: false;
  day81_proposal_changed: false;
  protected_proposal_changed: false;
  protected_crop_cycle_exists: boolean;
  counts_before: Day85Counts;
  counts_after: Day85Counts;
  proposal: Day85ProposalMarker;
  apply_event: Day85ApplyEvent;
};

export async function runDay85LowRiskHumanApprovedApplyBoundary(
  executor: Day85Executor
): Promise<Day85Result> {
  const before = await executor.getCounts();
  const fixture = await executor.ensureFixture();
  const existingApplyEvent = await executor.readDay85ApplyEvent();

  let previewResult: "preview" = "preview";
  let previewOperation: "no_op_candidate" = "no_op_candidate";
  let commit = {
    applyInserted: false,
    markerUpdated: false
  };

  if (!existingApplyEvent) {
    const preview = await executor.previewNoOpCandidate();

    if (preview.result !== "preview") {
      throw new Error("day85_preview_not_available");
    }

    if (preview.operation !== "no_op_candidate") {
      throw new Error(
        `day85_expected_no_op_candidate:${preview.operation}`
      );
    }

    previewResult = preview.result;
    previewOperation = preview.operation;
    commit = await executor.commitNoOpApply();
  }

  const after = await executor.getCounts();
  const proposal = await executor.readDay85Proposal();
  const applyEvent = await executor.readDay85ApplyEvent();

  if (!proposal) {
    throw new Error("day85_proposal_not_found_after_apply");
  }

  if (!applyEvent) {
    throw new Error("day85_apply_event_not_found_after_apply");
  }

  if (proposal.status !== "approved") {
    throw new Error("day85_proposal_status_changed_unexpectedly");
  }

  if (proposal.applied_by !== "hayate" || proposal.applied_at === null) {
    throw new Error("day85_apply_marker_not_set");
  }

  if (applyEvent.apply_operation !== "no_op_candidate") {
    throw new Error("day85_apply_event_operation_not_no_op");
  }

  if (applyEvent.result !== "applied") {
    throw new Error("day85_apply_event_result_not_applied");
  }

  if (applyEvent.dry_run !== false || applyEvent.committed !== true) {
    throw new Error("day85_apply_event_not_committed");
  }

  if (applyEvent.app_projection_apply_performed !== false) {
    throw new Error("day85_no_op_must_not_perform_app_projection_apply");
  }

  if (applyEvent.ai_proposal_apply_marker_updated !== true) {
    throw new Error("day85_apply_marker_flag_not_recorded");
  }

  if (applyEvent.inserted_crop_cycle_id !== null) {
    throw new Error("day85_no_op_must_not_reference_inserted_crop_cycle");
  }

  if (before.app_crop_cycles_count !== after.app_crop_cycles_count) {
    throw new Error("day85_app_crop_cycles_count_changed");
  }

  if (after.day85_apply_count !== 1 || after.day85_decision_count !== 1 || after.day85_proposal_count !== 1) {
    throw new Error("day85_idempotency_counts_invalid");
  }

  if (before.day81_status !== after.day81_status || before.day81_applied_by !== after.day81_applied_by || before.day81_applied_at !== after.day81_applied_at) {
    throw new Error("day85_day81_proposal_changed");
  }

  if (before.protected_status !== after.protected_status || before.protected_applied_by !== after.protected_applied_by || before.protected_applied_at !== after.protected_applied_at) {
    throw new Error("day85_protected_proposal_changed");
  }

  return {
    result: "ok",
    boundary: DAY85_LOW_RISK_APPLY_BOUNDARY,
    boundary_test_id: DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
    proposal_id: DAY85_LOW_RISK_APPLY_PROPOSAL_ID,
    proposal_created: fixture.proposalCreated,
    decision_created: fixture.decisionCreated,
    preview_result: previewResult,
    preview_operation: previewOperation,
    apply_inserted: commit.applyInserted,
    marker_updated: commit.markerUpdated,
    committed_apply_event_created: true,
    no_op_apply_committed: true,
    app_projection_apply_performed: false,
    app_schema_write_performed: false,
    app_crop_cycles_insert_performed: false,
    app_crop_cycles_update_performed: false,
    app_crop_cycles_delete_performed: false,
    ai_proposal_apply_marker_updated: true,
    proposal_status_updated: false,
    confirmation_token_created: false,
    day81_proposal_changed: false,
    protected_proposal_changed: false,
    protected_crop_cycle_exists: after.protected_crop_cycle_exists,
    counts_before: before,
    counts_after: after,
    proposal,
    apply_event: applyEvent
  };
}
