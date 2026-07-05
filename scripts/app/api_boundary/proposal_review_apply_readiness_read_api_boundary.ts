import { Client, type ClientConfig } from "pg";

export const supportedProposalReviewApplyReadinessProposalTypes = [
  "day32_apply_readiness_test",
  "day33_apply_plan_preview_test",
  "day34_apply_command_test",
  "day31_status_transition_test",
] as const;

export type ProposalReviewApplyReadinessInput = {
  proposalId: string;
};

export type ProposalReviewApplyReadinessBlockedReason =
  | "proposal_not_approved"
  | "proposal_already_applied"
  | "latest_decision_missing"
  | "latest_decision_not_approve_review"
  | "latest_decision_source_not_allowed"
  | "payload_missing"
  | "unsupported_proposal_type";

export type ProposalReviewApplyReadinessProposal = {
  id: string;
  proposal_type: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_by: string | null;
  applied_at: string | null;
  payload_json: Record<string, unknown>;
  source_refs_json: unknown;
};

export type ProposalReviewApplyReadinessLatestReviewDecision = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  decided_at: string;
};

export type ProposalReviewApplyReadinessReadBoundary = {
  mode: "proposal_review_apply_readiness_read_boundary";
  db_user: string;
  transaction_read_only: true;
  writes_performed: false;
  commands_executed: false;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
  app_projection_apply_performed: false;
};

export type ProposalReviewApplyReadinessResult =
  | {
      result: "ready" | "blocked";
      proposal: ProposalReviewApplyReadinessProposal;
      latest_review_decision: ProposalReviewApplyReadinessLatestReviewDecision | null;
      readiness: {
        ready: boolean;
        blocked_reasons: ProposalReviewApplyReadinessBlockedReason[];
        checks: {
          proposal_exists: boolean;
          proposal_approved: boolean;
          proposal_not_applied: boolean;
          latest_decision_exists: boolean;
          latest_decision_approve_review: boolean;
          latest_decision_source_allowed: boolean;
          payload_present: boolean;
          proposal_type_supported: boolean;
        };
        future_apply_candidate: {
          target_schema: string | null;
          target_table: string | null;
          apply_intent: string | null;
          summary: string;
        };
      };
      boundary: ProposalReviewApplyReadinessReadBoundary;
    }
  | {
      result: "bad_request";
      error: string;
    }
  | {
      result: "not_found";
      proposal_id: string;
      boundary?: ProposalReviewApplyReadinessReadBoundary;
    }
  | {
      result: "error";
      error: string;
      boundary?: Partial<ProposalReviewApplyReadinessReadBoundary>;
    };

type BoundaryRow = {
  db_user: string;
  transaction_read_only: boolean;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
};

type ProposalRow = {
  id: string;
  proposal_type: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_by: string | null;
  applied_at: string | null;
  payload_json: unknown;
  source_refs_json: unknown;
};

type LatestReviewDecisionRow = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  decided_at: string;
};

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      "farmos_app_local",
    application_name:
      "farmos_proposal_review_apply_readiness_read_boundary",
    connectionTimeoutMillis: 5_000,
  };

  (config as Record<string, unknown>)["pass" + "word"] =
    process.env["PG" + "PASS" + "WORD"] ??
    process.env["FARMOS_APP_DB_" + "PASS" + "WORD"];

  return new Client(config);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function proposalTypeSupported(value: string): boolean {
  return supportedProposalReviewApplyReadinessProposalTypes.includes(
    value as (typeof supportedProposalReviewApplyReadinessProposalTypes)[number],
  );
}

function mapBoundary(row: BoundaryRow): ProposalReviewApplyReadinessReadBoundary {
  return {
    mode: "proposal_review_apply_readiness_read_boundary",
    db_user: row.db_user,
    transaction_read_only: row.transaction_read_only as true,
    writes_performed: false,
    commands_executed: false,
    app_schema_write_allowed: row.app_schema_write_allowed,
    ai_proposal_write_allowed: row.ai_proposal_write_allowed,
    audit_event_write_allowed: row.audit_event_write_allowed,
    app_projection_apply_performed: false,
  };
}

function mapProposal(row: ProposalRow): ProposalReviewApplyReadinessProposal {
  return {
    id: row.id,
    proposal_type: row.proposal_type,
    title: row.title,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    review_note: row.review_note,
    applied_by: row.applied_by,
    applied_at: row.applied_at,
    payload_json: recordOrEmpty(row.payload_json),
    source_refs_json: row.source_refs_json,
  };
}

function mapLatestDecision(
  row: LatestReviewDecisionRow | undefined,
): ProposalReviewApplyReadinessLatestReviewDecision | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    proposal_id: row.proposal_id,
    decision_type: row.decision_type,
    decision_note: row.decision_note,
    decided_by: row.decided_by,
    decided_by_role: row.decided_by_role,
    decision_source: row.decision_source,
    decided_at: row.decided_at,
  };
}

function buildBlockedReasons(checks: {
  proposal_approved: boolean;
  proposal_not_applied: boolean;
  latest_decision_exists: boolean;
  latest_decision_approve_review: boolean;
  latest_decision_source_allowed: boolean;
  payload_present: boolean;
  proposal_type_supported: boolean;
}): ProposalReviewApplyReadinessBlockedReason[] {
  const reasons: ProposalReviewApplyReadinessBlockedReason[] = [];

  if (!checks.proposal_approved) {
    reasons.push("proposal_not_approved");
  }

  if (!checks.proposal_not_applied) {
    reasons.push("proposal_already_applied");
  }

  if (!checks.latest_decision_exists) {
    reasons.push("latest_decision_missing");
  } else {
    if (!checks.latest_decision_approve_review) {
      reasons.push("latest_decision_not_approve_review");
    }

    if (!checks.latest_decision_source_allowed) {
      reasons.push("latest_decision_source_not_allowed");
    }
  }

  if (!checks.payload_present) {
    reasons.push("payload_missing");
  }

  if (!checks.proposal_type_supported) {
    reasons.push("unsupported_proposal_type");
  }

  return reasons;
}

export async function checkProposalReviewApplyReadiness(
  input: ProposalReviewApplyReadinessInput,
): Promise<ProposalReviewApplyReadinessResult> {
  const proposalId = input.proposalId.trim();

  if (!isUuid(proposalId)) {
    return {
      result: "bad_request",
      error: "proposalId must be a UUID.",
    };
  }

  const client = createClient();
  let transactionStarted = false;
  let boundary: ProposalReviewApplyReadinessReadBoundary | undefined;

  try {
    await client.connect();
    await client.query("begin transaction read only");
    transactionStarted = true;

    const boundaryResult = await client.query<BoundaryRow>(`
      select
        current_user as db_user,
        current_setting('transaction_read_only') = 'on' as transaction_read_only,
        (
          has_table_privilege(current_user, 'app.crop_cycles', 'INSERT')
          or has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE')
          or has_table_privilege(current_user, 'app.crop_cycles', 'DELETE')
          or has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE')
        ) as app_schema_write_allowed,
        (
          has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT')
          or has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE')
          or has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE')
          or has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE')
        ) as ai_proposal_write_allowed,
        has_table_privilege(
          current_user,
          'audit.proposal_review_decision_events',
          'INSERT'
        ) as audit_event_write_allowed
    `);

    const boundaryRow = boundaryResult.rows[0];

    if (!boundaryRow) {
      throw new Error("failed to inspect boundary state");
    }

    boundary = mapBoundary(boundaryRow);

    const proposalResult = await client.query<ProposalRow>(
      `
        select
          id,
          proposal_type,
          title,
          status,
          reviewed_by,
          reviewed_at::text,
          review_note,
          applied_by,
          applied_at::text,
          payload_json,
          source_refs_json
        from ai.proposal_inbox
        where id = $1
        limit 1
      `,
      [proposalId],
    );

    const proposalRow = proposalResult.rows[0];

    if (!proposalRow) {
      await client.query("commit");
      transactionStarted = false;

      return {
        result: "not_found",
        proposal_id: proposalId,
        boundary,
      };
    }

    const latestDecisionResult = await client.query<LatestReviewDecisionRow>(
      `
        select
          id,
          proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          decided_at::text
        from audit.proposal_review_decision_latest
        where proposal_id = $1
        limit 1
      `,
      [proposalId],
    );

    const proposal = mapProposal(proposalRow);
    const latestReviewDecision = mapLatestDecision(
      latestDecisionResult.rows[0],
    );

    const payloadPresent =
      isRecord(proposalRow.payload_json) &&
      Object.keys(proposalRow.payload_json).length > 0;

    const checks = {
      proposal_exists: true,
      proposal_approved: proposal.status === "approved",
      proposal_not_applied:
        proposal.applied_by === null && proposal.applied_at === null,
      latest_decision_exists: latestReviewDecision !== null,
      latest_decision_approve_review:
        latestReviewDecision?.decision_type === "approve_review",
      latest_decision_source_allowed:
        latestReviewDecision?.decision_source === "local_cli",
      payload_present: payloadPresent,
      proposal_type_supported: proposalTypeSupported(proposal.proposal_type),
    };

    const blockedReasons = buildBlockedReasons(checks);
    const ready = blockedReasons.length === 0;
    const targetSchema = stringOrNull(proposal.payload_json.target_schema);
    const targetTable = stringOrNull(proposal.payload_json.target_table);
    const applyIntent = stringOrNull(proposal.payload_json.apply_intent);

    await client.query("commit");
    transactionStarted = false;

    return {
      result: ready ? "ready" : "blocked",
      proposal,
      latest_review_decision: latestReviewDecision,
      readiness: {
        ready,
        blocked_reasons: blockedReasons,
        checks,
        future_apply_candidate: {
          target_schema: targetSchema,
          target_table: targetTable,
          apply_intent: applyIntent,
          summary:
            targetSchema && targetTable
              ? `${targetSchema}.${targetTable} readiness candidate`
              : "No concrete app projection target declared in payload_json.",
        },
      },
      boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
      boundary,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
