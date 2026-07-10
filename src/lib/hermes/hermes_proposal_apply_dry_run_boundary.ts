export const DAY84_APPLY_DRY_RUN_BOUNDARY_TEST_ID = "day84_apply_dry_run_boundary_test_v1" as const;
export const DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID = "14711111-88db-41fd-a048-1c37266fd9e0" as const;
export const DAY84_APPLY_DRY_RUN_BOUNDARY = "day84_apply_dry_run_no_write_boundary" as const;

export type HermesDay84ProposalSnapshot = {
  id: string;
  proposal_type: string;
  risk_level: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_at: string | null;
  applied_by: string | null;
  day81_test_id: string | null;
};

export type HermesDay84DecisionSnapshot = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_source: string;
  review_only: string | null;
  apply_ready: string | null;
  apply_performed: string | null;
  confirmation_token_created: string | null;
  app_db_write_performed: string | null;
};

export type HermesDay84ApplyHistorySummary = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  day83_review_decision_count: number;
  day84_apply_dry_run_count: number;
  protected_crop_cycle_exists: boolean;
};

export type HermesDay84Executor = {
  findProposalById: (proposalId: string) => Promise<HermesDay84ProposalSnapshot | null>;
  findDay83DecisionForProposal: (proposalId: string) => Promise<HermesDay84DecisionSnapshot | null>;
  getApplyHistorySummary: () => Promise<HermesDay84ApplyHistorySummary>;
};

export type HermesDay84DryRunCandidate = {
  proposal_id: string;
  apply_operation: "no_op_candidate";
  result: "dry_run_preview_only";
  dry_run: true;
  committed: false;
  app_projection_apply_performed: false;
  ai_proposal_apply_marker_updated: false;
  inserted_crop_cycle_id: null;
  apply_source: "day84_apply_dry_run_boundary";
  would_insert_audit_apply_event: false;
  would_update_ai_proposal: false;
  would_write_app_schema: false;
  blocked_by_existing_apply_event_schema: true;
  schema_reason: "audit.proposal_review_apply_events stores committed apply events only";
};

export type HermesDay84ApplyDryRunResult = {
  result: "ok";
  boundary: typeof DAY84_APPLY_DRY_RUN_BOUNDARY;
  boundary_test_id: typeof DAY84_APPLY_DRY_RUN_BOUNDARY_TEST_ID;
  proposal_id: string;
  proposal_status: string;
  proposal_type: string;
  day83_decision_type: string;
  day83_review_only: boolean;
  day83_apply_ready: boolean;
  dry_run_candidate: HermesDay84DryRunCandidate;
  dry_run_evaluated: true;
  dry_run_event_persisted: false;
  apply_history_count_before: number;
  apply_history_count_after: number;
  day84_apply_dry_run_count_before: number;
  day84_apply_dry_run_count_after: number;
  proposal_inbox_updated: false;
  ai_proposal_status_updated: false;
  proposal_draft_apply_ready: false;
  proposal_apply_ready: false;
  proposal_apply_performed: false;
  committed_apply_event_created: false;
  confirmation_token_created: false;
  audit_apply_event_created: false;
  app_db_write_performed: false;
  app_schema_write_performed: false;
  protected_crop_cycle_exists: boolean;
};

export async function evaluateHermesProposalApplyDryRunForDay84({
  proposalId = DAY84_APPLY_DRY_RUN_TARGET_PROPOSAL_ID,
  executor
}: {
  proposalId?: string;
  executor: HermesDay84Executor;
}): Promise<HermesDay84ApplyDryRunResult> {
  if (!isUuid(proposalId)) {
    throw new Error("invalid_proposal_id");
  }

  const before = await executor.getApplyHistorySummary();
  const proposal = await executor.findProposalById(proposalId);

  if (!proposal) {
    throw new Error("proposal_not_found");
  }

  if (proposal.proposal_type !== "hermes_chat_draft_preview") {
    throw new Error("proposal_type_not_supported_for_day84");
  }

  if (proposal.status !== "pending") {
    throw new Error("proposal_status_not_pending");
  }

  if (proposal.applied_at !== null || proposal.applied_by !== null) {
    throw new Error("proposal_already_applied");
  }

  const decision = await executor.findDay83DecisionForProposal(proposalId);

  if (!decision) {
    throw new Error("day83_review_decision_not_found");
  }

  if (decision.decision_type !== "request_revision") {
    throw new Error("day84_requires_request_revision_review_decision");
  }

  const after = await executor.getApplyHistorySummary();

  return {
    result: "ok",
    boundary: DAY84_APPLY_DRY_RUN_BOUNDARY,
    boundary_test_id: DAY84_APPLY_DRY_RUN_BOUNDARY_TEST_ID,
    proposal_id: proposal.id,
    proposal_status: proposal.status,
    proposal_type: proposal.proposal_type,
    day83_decision_type: decision.decision_type,
    day83_review_only: decision.review_only === "true",
    day83_apply_ready: decision.apply_ready === "true",
    dry_run_candidate: {
      proposal_id: proposal.id,
      apply_operation: "no_op_candidate",
      result: "dry_run_preview_only",
      dry_run: true,
      committed: false,
      app_projection_apply_performed: false,
      ai_proposal_apply_marker_updated: false,
      inserted_crop_cycle_id: null,
      apply_source: "day84_apply_dry_run_boundary",
      would_insert_audit_apply_event: false,
      would_update_ai_proposal: false,
      would_write_app_schema: false,
      blocked_by_existing_apply_event_schema: true,
      schema_reason: "audit.proposal_review_apply_events stores committed apply events only"
    },
    dry_run_evaluated: true,
    dry_run_event_persisted: false,
    apply_history_count_before: before.apply_history_count,
    apply_history_count_after: after.apply_history_count,
    day84_apply_dry_run_count_before: before.day84_apply_dry_run_count,
    day84_apply_dry_run_count_after: after.day84_apply_dry_run_count,
    proposal_inbox_updated: false,
    ai_proposal_status_updated: false,
    proposal_draft_apply_ready: false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
    committed_apply_event_created: false,
    confirmation_token_created: false,
    audit_apply_event_created: false,
    app_db_write_performed: false,
    app_schema_write_performed: false,
    protected_crop_cycle_exists: after.protected_crop_cycle_exists
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
