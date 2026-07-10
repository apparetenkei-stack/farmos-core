import { DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID } from "./hermes_proposal_draft_persistence_boundary";

export const DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID = "day83_review_decision_boundary_test_v1" as const;
export const DAY83_REVIEW_DECISION_EVENT_ID = "83d11111-88db-41fd-a048-1c37266fd9e0" as const;
export const DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID = "14711111-88db-41fd-a048-1c37266fd9e0" as const;
export const DAY83_REVIEW_DECISION_SOURCE = "day83_review_decision_boundary_test" as const;
export const DAY83_REVIEW_DECISION_BOUNDARY = "day83_core_review_decision_audit_only" as const;

export type HermesDay83ReviewDecisionType =
  | "request_revision"
  | "reject_review"
  | "approve_review";

export type HermesDay83ProposalSnapshot = {
  id: string;
  proposal_type: string;
  risk_level: string;
  status: string;
  applied_at: string | null;
  applied_by: string | null;
  day81_test_id?: string | null;
};

export type HermesDay83ReviewDecisionInput = {
  proposal_id: string;
  decision_type: HermesDay83ReviewDecisionType;
  decision_note: string;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  boundary_test_id: string;
  event_id: string;
};

export type HermesDay83RecordedDecision = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  event_metadata: Record<string, unknown>;
  decided_at: string;
  created_at: string;
};

export type HermesDay83ReviewDecisionExecutor = {
  findProposalById: (proposalId: string) => Promise<HermesDay83ProposalSnapshot | null>;
  findExistingDecisionByBoundaryTestId: (boundaryTestId: string) => Promise<HermesDay83RecordedDecision | null>;
  insertDecisionEvent: (decision: HermesDay83ReviewDecisionInput) => Promise<HermesDay83RecordedDecision>;
};

export type HermesDay83ReviewDecisionResult = {
  result: "ok";
  review_decision_boundary: typeof DAY83_REVIEW_DECISION_BOUNDARY;
  target_proposal_id: string;
  target_proposal_status: string;
  target_proposal_type: string;
  day81_persistence_boundary_test_id: string | null;
  review_decision_recorded: true;
  review_decision_saved: true;
  review_decision_inserted: boolean;
  review_decision_event_id: string;
  review_decision_type: string;
  review_decision_source: string;
  proposal_inbox_updated: false;
  ai_proposal_status_updated: false;
  proposal_draft_apply_ready: false;
  proposal_apply_ready: false;
  proposal_apply_performed: false;
  confirmation_token_created: false;
  audit_apply_event_created: false;
  app_db_write_performed: false;
  app_schema_write_performed: false;
};

const allowedDecisionTypes: ReadonlySet<string> = new Set([
  "request_revision",
  "reject_review",
  "approve_review"
]);

export function createDay83MockReviewDecisionInput(
  proposalId: string = DAY83_REVIEW_DECISION_TARGET_PROPOSAL_ID
): HermesDay83ReviewDecisionInput {
  return {
    proposal_id: proposalId,
    decision_type: "request_revision",
    decision_note: "Day83 review decision boundary smoke. Recorded for audit only; not apply-ready.",
    decided_by: "day83_boundary_test_human",
    decided_by_role: "admin_review_boundary",
    decision_source: DAY83_REVIEW_DECISION_SOURCE,
    boundary_test_id: DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID,
    event_id: DAY83_REVIEW_DECISION_EVENT_ID
  };
}

export function assertValidDay83ReviewDecisionInput(
  decision: HermesDay83ReviewDecisionInput
): void {
  if (!isUuid(decision.proposal_id)) {
    throw new Error("invalid_proposal_id");
  }

  if (!isUuid(decision.event_id)) {
    throw new Error("invalid_event_id");
  }

  if (!allowedDecisionTypes.has(decision.decision_type)) {
    throw new Error("invalid_decision_type");
  }

  if (!decision.decision_note || decision.decision_note.length > 500) {
    throw new Error("invalid_decision_note");
  }

  if (!decision.decided_by || decision.decided_by.length > 120) {
    throw new Error("invalid_decided_by");
  }

  if (!decision.decided_by_role || decision.decided_by_role.length > 120) {
    throw new Error("invalid_decided_by_role");
  }

  if (decision.decision_source !== DAY83_REVIEW_DECISION_SOURCE) {
    throw new Error("invalid_decision_source");
  }

  if (decision.boundary_test_id !== DAY83_REVIEW_DECISION_BOUNDARY_TEST_ID) {
    throw new Error("invalid_boundary_test_id");
  }
}

export async function recordHermesProposalDraftReviewDecisionForDay83({
  decision,
  executor
}: {
  decision: HermesDay83ReviewDecisionInput;
  executor: HermesDay83ReviewDecisionExecutor;
}): Promise<HermesDay83ReviewDecisionResult> {
  assertValidDay83ReviewDecisionInput(decision);

  const proposal = await executor.findProposalById(decision.proposal_id);

  if (!proposal) {
    throw new Error("proposal_not_found");
  }

  if (proposal.proposal_type !== "hermes_chat_draft_preview") {
    throw new Error("proposal_type_not_reviewable_by_day83");
  }

  if (proposal.status !== "pending") {
    throw new Error("proposal_status_not_pending");
  }

  if (proposal.applied_at !== null || proposal.applied_by !== null) {
    throw new Error("proposal_already_has_apply_marker");
  }

  if (proposal.day81_test_id !== DAY81_PROPOSAL_DRAFT_PERSISTENCE_TEST_ID) {
    throw new Error("proposal_not_day81_persistence_boundary_target");
  }

  const existing = await executor.findExistingDecisionByBoundaryTestId(
    decision.boundary_test_id
  );

  const record = existing ?? (await executor.insertDecisionEvent(decision));

  return {
    result: "ok",
    review_decision_boundary: DAY83_REVIEW_DECISION_BOUNDARY,
    target_proposal_id: proposal.id,
    target_proposal_status: proposal.status,
    target_proposal_type: proposal.proposal_type,
    day81_persistence_boundary_test_id: proposal.day81_test_id ?? null,
    review_decision_recorded: true,
    review_decision_saved: true,
    review_decision_inserted: existing === null,
    review_decision_event_id: record.id,
    review_decision_type: record.decision_type,
    review_decision_source: record.decision_source,
    proposal_inbox_updated: false,
    ai_proposal_status_updated: false,
    proposal_draft_apply_ready: false,
    proposal_apply_ready: false,
    proposal_apply_performed: false,
    confirmation_token_created: false,
    audit_apply_event_created: false,
    app_db_write_performed: false,
    app_schema_write_performed: false
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
