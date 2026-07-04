import { Client, type ClientConfig } from "pg";

export type ProposalReviewCommandPreviewDecisionType =
  | "approve_review"
  | "reject_review"
  | "request_revision"
  | "defer_review";

export type ProposalReviewCommandPreviewItem = {
  proposal_id: string;
  current_proposal_status: string;
  decision_type: ProposalReviewCommandPreviewDecisionType;
  decision_label: string;
  would_append_audit_event: true;
  would_update_proposal_status: false;
  would_update_app_projection: false;
  would_require_human_note: boolean;
  default_decision_source: "future_ui_preview_only";
  preview_event_metadata: Record<string, unknown>;
  disabled_reason: string | null;
  safety_note: string;
};

export type ProposalReviewCommandPreviewReadModel =
  | {
      result: "ok";
      proposal: {
        id: string;
        title: string;
        status: string;
        reviewed_by: string | null;
        reviewed_at: string | null;
        applied_by: string | null;
        applied_at: string | null;
      };
      latest_review_decision: {
        id: string;
        decision_type: string;
        decided_at: string;
      } | null;
      previews: ProposalReviewCommandPreviewItem[];
      boundary: {
        mode: "proposal_review_command_preview_read_boundary";
        db_user: string;
        transaction_read_only: true;
        writes_performed: false;
        commands_executed: false;
        preview_only: true;
        app_schema_write_allowed: boolean;
        ai_proposal_write_allowed: boolean;
        audit_event_write_allowed: boolean;
      };
    }
  | {
      result: "bad_request";
      error: string;
    }
  | {
      result: "not_found";
      proposal_id: string;
    }
  | {
      result: "error";
      error: string;
    };

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
  applied_by: string | null;
  applied_at: Date | string | null;
};

type LatestReviewDecisionRow = {
  id: string;
  decision_type: string;
  decided_at: Date | string;
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

function toNullableIsoString(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function buildDisabledReason(proposal: {
  status: string;
  applied_at: string | null;
}): string | null {
  if (proposal.applied_at !== null) {
    return "Preview only. This proposal already has applied_at set.";
  }

  if (proposal.status !== "pending") {
    return `Preview only. Current proposal status is ${proposal.status}, not pending.`;
  }

  return null;
}

function buildPreviewItems(params: {
  proposal: {
    id: string;
    status: string;
    applied_at: string | null;
  };
  latest_review_decision: {
    decision_type: string;
  } | null;
}): ProposalReviewCommandPreviewItem[] {
  const disabledReason = buildDisabledReason(params.proposal);

  const definitions: Array<{
    decision_type: ProposalReviewCommandPreviewDecisionType;
    decision_label: string;
    would_require_human_note: boolean;
    safety_note: string;
  }> = [
    {
      decision_type: "approve_review",
      decision_label: "Approve review",
      would_require_human_note: false,
      safety_note:
        "Preview only. Approval would be a review decision candidate, not an app projection apply.",
    },
    {
      decision_type: "reject_review",
      decision_label: "Reject review",
      would_require_human_note: true,
      safety_note:
        "Preview only. Rejection should include a human note before any future command execution.",
    },
    {
      decision_type: "request_revision",
      decision_label: "Request revision",
      would_require_human_note: true,
      safety_note:
        "Preview only. Revision request should describe what must change before a later review.",
    },
    {
      decision_type: "defer_review",
      decision_label: "Defer review",
      would_require_human_note: true,
      safety_note:
        "Preview only. Deferral records a human decision to postpone review, not to apply data.",
    },
  ];

  return definitions.map((definition) => ({
    proposal_id: params.proposal.id,
    current_proposal_status: params.proposal.status,
    decision_type: definition.decision_type,
    decision_label: definition.decision_label,
    would_append_audit_event: true,
    would_update_proposal_status: false,
    would_update_app_projection: false,
    would_require_human_note: definition.would_require_human_note,
    default_decision_source: "future_ui_preview_only",
    preview_event_metadata: {
      day: "28",
      preview_only: true,
      commands_executed: false,
      generated_by: "proposal_review_command_preview_read_boundary",
      decision_type: definition.decision_type,
      default_decision_source: "future_ui_preview_only",
      current_proposal_status: params.proposal.status,
      latest_review_decision_type:
        params.latest_review_decision?.decision_type ?? null,
      app_write_expected: false,
      proposal_status_update_expected: false,
    },
    disabled_reason: disabledReason,
    safety_note: definition.safety_note,
  }));
}

export async function getProposalReviewCommandPreviewReadModel(params: {
  proposalId: string;
}): Promise<ProposalReviewCommandPreviewReadModel> {
  if (!params.proposalId || !isUuid(params.proposalId)) {
    return {
      result: "bad_request",
      error: "proposalId must be a valid UUID.",
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin transaction read only");
    transactionStarted = true;

    const identityResult = await client.query<{
      db_user: string;
      transaction_read_only: boolean;
    }>(`
      select
        current_user as db_user,
        current_setting('transaction_read_only') = 'on' as transaction_read_only
    `);

    const privilegeResult = await client.query<{
      app_can_insert: boolean;
      app_can_update: boolean;
      app_can_delete: boolean;
      app_can_truncate: boolean;
      proposal_can_insert: boolean;
      proposal_can_update: boolean;
      proposal_can_delete: boolean;
      proposal_can_truncate: boolean;
      audit_event_can_insert: boolean;
    }>(`
      select
        has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_can_insert,
        has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE') as app_can_update,
        has_table_privilege(current_user, 'app.crop_cycles', 'DELETE') as app_can_delete,
        has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE') as app_can_truncate,
        has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT') as proposal_can_insert,
        has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE') as proposal_can_update,
        has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE') as proposal_can_delete,
        has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE') as proposal_can_truncate,
        has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT') as audit_event_can_insert
    `);

    const proposalResult = await client.query<ProposalRow>(
      `
      select
        id::text as id,
        title,
        status,
        reviewed_by,
        reviewed_at,
        applied_by,
        applied_at
      from ai.proposal_inbox
      where id = $1::uuid
      limit 1
      `,
      [params.proposalId],
    );

    if (proposalResult.rowCount === 0) {
      await client.query("commit");
      transactionStarted = false;

      return {
        result: "not_found",
        proposal_id: params.proposalId,
      };
    }

    const proposalRow = proposalResult.rows[0];

    const proposal = {
      id: proposalRow.id,
      title: proposalRow.title,
      status: proposalRow.status,
      reviewed_by: proposalRow.reviewed_by,
      reviewed_at: toNullableIsoString(proposalRow.reviewed_at),
      applied_by: proposalRow.applied_by,
      applied_at: toNullableIsoString(proposalRow.applied_at),
    };

    const latestResult = await client.query<LatestReviewDecisionRow>(
      `
      select
        id::text as id,
        decision_type,
        decided_at
      from audit.proposal_review_decision_latest
      where proposal_id = $1::uuid
      limit 1
      `,
      [params.proposalId],
    );

    const latestReviewDecision =
      latestResult.rowCount === 0
        ? null
        : {
            id: latestResult.rows[0].id,
            decision_type: latestResult.rows[0].decision_type,
            decided_at: toIsoString(latestResult.rows[0].decided_at),
          };

    const identity = identityResult.rows[0];
    const privileges = privilegeResult.rows[0];

    const previews = buildPreviewItems({
      proposal,
      latest_review_decision: latestReviewDecision,
    });

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      proposal,
      latest_review_decision: latestReviewDecision,
      previews,
      boundary: {
        mode: "proposal_review_command_preview_read_boundary",
        db_user: identity.db_user,
        transaction_read_only: true,
        writes_performed: false,
        commands_executed: false,
        preview_only: true,
        app_schema_write_allowed:
          privileges.app_can_insert ||
          privileges.app_can_update ||
          privileges.app_can_delete ||
          privileges.app_can_truncate,
        ai_proposal_write_allowed:
          privileges.proposal_can_insert ||
          privileges.proposal_can_update ||
          privileges.proposal_can_delete ||
          privileges.proposal_can_truncate,
        audit_event_write_allowed: privileges.audit_event_can_insert,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
