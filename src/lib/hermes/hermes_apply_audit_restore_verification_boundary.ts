import {
  DAY85_LOW_RISK_APPLY_BOUNDARY,
  DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID,
  DAY85_LOW_RISK_APPLY_DECISION_ID,
  DAY85_LOW_RISK_APPLY_PROPOSAL_ID
} from "./hermes_low_risk_human_approved_apply_boundary";

export const DAY86_APPLY_AUDIT_BOUNDARY =
  "day86_apply_audit_restore_verification_boundary" as const;

export const DAY86_DAY81_PROPOSAL_ID =
  "14711111-88db-41fd-a048-1c37266fd9e0" as const;

export const DAY86_PROTECTED_PROPOSAL_ID =
  "24fc24ee-8efa-436b-8424-9703edeeb297" as const;

export const DAY86_PROTECTED_CROP_CYCLE_ID = 2 as const;

export type Day86ProposalRecord = {
  id: string;
  risk_level: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
  source_refs_json: Record<string, unknown>;
};

export type Day86DecisionRecord = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_source: string;
  decided_by: string;
  decided_by_role: string;
  decided_at: string;
  created_at: string;
  event_metadata: Record<string, unknown>;
};

export type Day86ApplyEventRecord = {
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
  created_at: string;
  event_metadata: Record<string, unknown>;
};

export type Day86ProtectedProposalRecord = {
  id: string;
  status: string;
  applied_by: string | null;
  applied_at: string | null;
};

export type Day86AuditSnapshot = {
  source_database: string;
  transaction_read_only: boolean;
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  app_crop_cycles_count: number;
  protected_crop_cycle_exists: boolean;
  proposals: Day86ProposalRecord[];
  decisions: Day86DecisionRecord[];
  apply_events: Day86ApplyEventRecord[];
  day81_proposal: Day86ProtectedProposalRecord | null;
  protected_proposal: Day86ProtectedProposalRecord | null;
};

export type Day86AuditResult = {
  result: "ok" | "invalid";
  checked: "hermes_apply_audit_restore_verification_boundary";
  boundary: typeof DAY86_APPLY_AUDIT_BOUNDARY;
  source_database: string;
  transaction_read_only: boolean;
  proposal_found: boolean;
  decision_found: boolean;
  apply_event_found: boolean;
  proposal_decision_link_valid: boolean;
  proposal_apply_link_valid: boolean;
  human_approval_valid: boolean;
  committed_apply_valid: boolean;
  no_op_apply_valid: boolean;
  single_apply_event_valid: boolean;
  proposal_marker_valid: boolean;
  actor_consistency_valid: boolean;
  timestamp_order_valid: boolean;
  apply_timestamp_gap_ms: number | null;
  app_projection_apply_performed: boolean;
  app_schema_write_detected: boolean;
  app_crop_cycles_count: number;
  protected_crop_cycle_exists: boolean;
  day81_proposal_changed: boolean;
  protected_proposal_changed: boolean;
  business_data_invariant_valid: boolean;
  protected_records_invariant_valid: boolean;
  audit_chain_valid: boolean;
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
};

function metadataBoolean(
  metadata: Record<string, unknown>,
  key: string
): boolean | null {
  const value = metadata[key];
  return typeof value === "boolean" ? value : null;
}

function metadataString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
}

function timestampMs(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPendingAndUnapplied(
  record: Day86ProtectedProposalRecord | null
): boolean {
  return (
    record !== null &&
    record.status === "pending" &&
    record.applied_by === null &&
    record.applied_at === null
  );
}

export function evaluateDay86AuditSnapshot(
  snapshot: Day86AuditSnapshot
): Day86AuditResult {
  const proposalFound = snapshot.proposals.length === 1;
  const decisionFound = snapshot.decisions.length === 1;
  const applyEventFound = snapshot.apply_events.length === 1;

  const proposal = proposalFound ? snapshot.proposals[0] : null;
  const decision = decisionFound ? snapshot.decisions[0] : null;
  const applyEvent = applyEventFound ? snapshot.apply_events[0] : null;

  const proposalDecisionLinkValid =
    proposal !== null &&
    decision !== null &&
    decision.proposal_id === proposal.id &&
    proposal.id === DAY85_LOW_RISK_APPLY_PROPOSAL_ID &&
    decision.id === DAY85_LOW_RISK_APPLY_DECISION_ID;

  const proposalApplyLinkValid =
    proposal !== null &&
    applyEvent !== null &&
    applyEvent.proposal_id === proposal.id;

  const humanApprovalValid =
    proposal !== null &&
    decision !== null &&
    proposal.risk_level === "low" &&
    proposal.status === "approved" &&
    proposal.reviewed_by === "hayate" &&
    proposal.reviewed_at !== null &&
    decision.decision_type === "approve_review" &&
    decision.decision_source === "local_cli" &&
    decision.decided_by === "hayate" &&
    decision.decided_by_role === "owner" &&
    metadataBoolean(decision.event_metadata, "human_approved") === true &&
    metadataString(decision.event_metadata, "boundary") ===
      DAY85_LOW_RISK_APPLY_BOUNDARY &&
    metadataString(
      decision.event_metadata,
      "day85_low_risk_apply_boundary_test_id"
    ) === DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID;

  const committedApplyValid =
    applyEvent !== null &&
    applyEvent.result === "applied" &&
    applyEvent.dry_run === false &&
    applyEvent.committed === true &&
    applyEvent.ai_proposal_apply_marker_updated === true &&
    applyEvent.applied_by === "hayate" &&
    applyEvent.applied_by_role === "owner" &&
    applyEvent.apply_source ===
      "day85_low_risk_human_approved_apply_boundary" &&
    metadataBoolean(applyEvent.event_metadata, "human_approved") === true &&
    metadataString(applyEvent.event_metadata, "boundary") ===
      DAY85_LOW_RISK_APPLY_BOUNDARY &&
    metadataString(
      applyEvent.event_metadata,
      "day85_low_risk_apply_boundary_test_id"
    ) === DAY85_LOW_RISK_APPLY_BOUNDARY_TEST_ID;

  const noOpApplyValid =
    applyEvent !== null &&
    applyEvent.apply_operation === "no_op_candidate" &&
    applyEvent.app_projection_apply_performed === false &&
    applyEvent.inserted_crop_cycle_id === null &&
    metadataBoolean(applyEvent.event_metadata, "no_op_apply") === true &&
    metadataBoolean(
      applyEvent.event_metadata,
      "app_schema_write_performed"
    ) === false &&
    metadataBoolean(
      applyEvent.event_metadata,
      "app_projection_apply_performed"
    ) === false &&
    metadataBoolean(
      applyEvent.event_metadata,
      "app_crop_cycles_insert_performed"
    ) === false;

  const singleApplyEventValid = snapshot.apply_events.length === 1;

  const proposalMarkerValid =
    proposal !== null &&
    proposal.applied_by === "hayate" &&
    proposal.applied_at !== null;

  const actorConsistencyValid =
    proposal !== null &&
    decision !== null &&
    applyEvent !== null &&
    proposal.reviewed_by === decision.decided_by &&
    proposal.applied_by === applyEvent.applied_by &&
    decision.decided_by === applyEvent.applied_by;

  const reviewedAt = timestampMs(proposal?.reviewed_at ?? null);
  const appliedAt = timestampMs(proposal?.applied_at ?? null);
  const decidedAt = timestampMs(decision?.decided_at ?? null);
  const decisionCreatedAt = timestampMs(decision?.created_at ?? null);
  const applyCreatedAt = timestampMs(applyEvent?.created_at ?? null);

  const applyTimestampGapMs =
    appliedAt !== null && applyCreatedAt !== null
      ? Math.abs(applyCreatedAt - appliedAt)
      : null;

  const timestampOrderValid =
    reviewedAt !== null &&
    appliedAt !== null &&
    decidedAt !== null &&
    decisionCreatedAt !== null &&
    applyCreatedAt !== null &&
    reviewedAt <= appliedAt &&
    decidedAt <= appliedAt &&
    decisionCreatedAt <= appliedAt &&
    applyCreatedAt >= decidedAt &&
    applyTimestampGapMs !== null &&
    applyTimestampGapMs <= 1000;

  const appSchemaWriteDetected =
    applyEvent === null ||
    applyEvent.app_projection_apply_performed !== false ||
    applyEvent.inserted_crop_cycle_id !== null ||
    metadataBoolean(
      applyEvent.event_metadata,
      "app_schema_write_performed"
    ) !== false ||
    metadataBoolean(
      applyEvent.event_metadata,
      "app_crop_cycles_insert_performed"
    ) !== false;

  const businessDataInvariantValid =
    snapshot.app_crop_cycles_count === 8 &&
    snapshot.protected_crop_cycle_exists === true &&
    appSchemaWriteDetected === false &&
    noOpApplyValid;

  const day81ProposalChanged =
    !isPendingAndUnapplied(snapshot.day81_proposal);

  const protectedProposalChanged =
    !isPendingAndUnapplied(snapshot.protected_proposal);

  const protectedRecordsInvariantValid =
    day81ProposalChanged === false &&
    protectedProposalChanged === false &&
    snapshot.protected_crop_cycle_exists === true;

  const auditChainValid =
    snapshot.transaction_read_only === true &&
    proposalFound &&
    decisionFound &&
    applyEventFound &&
    proposalDecisionLinkValid &&
    proposalApplyLinkValid &&
    humanApprovalValid &&
    committedApplyValid &&
    noOpApplyValid &&
    singleApplyEventValid &&
    proposalMarkerValid &&
    actorConsistencyValid &&
    timestampOrderValid &&
    businessDataInvariantValid &&
    protectedRecordsInvariantValid;

  return {
    result: auditChainValid ? "ok" : "invalid",
    checked: "hermes_apply_audit_restore_verification_boundary",
    boundary: DAY86_APPLY_AUDIT_BOUNDARY,
    source_database: snapshot.source_database,
    transaction_read_only: snapshot.transaction_read_only,
    proposal_found: proposalFound,
    decision_found: decisionFound,
    apply_event_found: applyEventFound,
    proposal_decision_link_valid: proposalDecisionLinkValid,
    proposal_apply_link_valid: proposalApplyLinkValid,
    human_approval_valid: humanApprovalValid,
    committed_apply_valid: committedApplyValid,
    no_op_apply_valid: noOpApplyValid,
    single_apply_event_valid: singleApplyEventValid,
    proposal_marker_valid: proposalMarkerValid,
    actor_consistency_valid: actorConsistencyValid,
    timestamp_order_valid: timestampOrderValid,
    apply_timestamp_gap_ms: applyTimestampGapMs,
    app_projection_apply_performed:
      applyEvent?.app_projection_apply_performed ?? false,
    app_schema_write_detected: appSchemaWriteDetected,
    app_crop_cycles_count: snapshot.app_crop_cycles_count,
    protected_crop_cycle_exists:
      snapshot.protected_crop_cycle_exists,
    day81_proposal_changed: day81ProposalChanged,
    protected_proposal_changed: protectedProposalChanged,
    business_data_invariant_valid: businessDataInvariantValid,
    protected_records_invariant_valid:
      protectedRecordsInvariantValid,
    audit_chain_valid: auditChainValid,
    proposal_count: snapshot.proposal_count,
    decision_history_count: snapshot.decision_history_count,
    apply_history_count: snapshot.apply_history_count
  };
}

export function normalizeDay86AuditResultForComparison(
  result: Day86AuditResult
): Omit<Day86AuditResult, "source_database"> {
  const { source_database: _sourceDatabase, ...normalized } = result;
  return normalized;
}

export function compareDay86AuditResults(
  localResult: Day86AuditResult,
  restoreResult: Day86AuditResult
): boolean {
  return (
    JSON.stringify(normalizeDay86AuditResultForComparison(localResult)) ===
    JSON.stringify(normalizeDay86AuditResultForComparison(restoreResult))
  );
}
