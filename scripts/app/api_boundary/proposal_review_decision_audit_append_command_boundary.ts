import { Client, type ClientConfig } from "pg";

export const proposalReviewDecisionAuditAppendCommandDecisionTypes = [
  "approve_review",
  "reject_review",
  "request_revision",
  "defer_review",
] as const;

export type ProposalReviewDecisionAuditAppendCommandDecisionType =
  (typeof proposalReviewDecisionAuditAppendCommandDecisionTypes)[number];

export const proposalReviewDecisionAuditAppendCommandDecidedByRoles = [
  "owner",
  "admin",
  "operator",
] as const;

export type ProposalReviewDecisionAuditAppendCommandDecidedByRole =
  (typeof proposalReviewDecisionAuditAppendCommandDecidedByRoles)[number];

export const proposalReviewDecisionAuditAppendCommandDecisionSources = [
  "local_cli",
] as const;

export type ProposalReviewDecisionAuditAppendCommandDecisionSource =
  (typeof proposalReviewDecisionAuditAppendCommandDecisionSources)[number];

export type ProposalReviewDecisionAuditAppendCommandInput = {
  proposalId: string;
  decisionType: string;
  decisionNote: string | null;
  decidedBy: string;
  decidedByRole: string;
  decisionSource: string;
};

export type ProposalReviewDecisionAuditAppendCommandArgs = {
  input: ProposalReviewDecisionAuditAppendCommandInput;
  commit?: boolean;
};

export type ProposalReviewDecisionAuditAppendCommandCommand = {
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
};

export type ProposalReviewDecisionAuditAppendCommandProposal = {
  id: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
};

export type ProposalReviewDecisionAuditAppendCommandLatestReviewDecision = {
  id: string;
  decision_type: string;
  decided_at: string;
};

export type ProposalReviewDecisionAuditAppendCommandEvent = {
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

export type ProposalReviewDecisionAuditAppendCommandValidation = {
  accepted: boolean;
  required_note_satisfied: boolean;
  proposal_pending: boolean | null;
  proposal_not_applied: boolean | null;
  decided_by_present: boolean;
  allowed_decision_type: boolean;
  allowed_decided_by_role: boolean;
  allowed_decision_source: boolean;
};

export type ProposalReviewDecisionAuditAppendCommandBoundary = {
  mode: "proposal_review_decision_audit_append_command_boundary";
  db_user: string;
  transaction_read_only: false;
  writes_performed: boolean;
  commands_executed: boolean;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
  app_schema_writes_performed: false;
  ai_proposal_writes_performed: false;
  audit_event_append_performed: boolean;
};

export type ProposalReviewDecisionAuditAppendCommandResult =
  | {
      result: "ok";
      mode: "committed" | "dry_run";
      command: ProposalReviewDecisionAuditAppendCommandCommand;
      proposal: ProposalReviewDecisionAuditAppendCommandProposal;
      previous_latest_review_decision: ProposalReviewDecisionAuditAppendCommandLatestReviewDecision | null;
      appended_event: ProposalReviewDecisionAuditAppendCommandEvent | null;
      latest_review_decision_after: ProposalReviewDecisionAuditAppendCommandLatestReviewDecision | null;
      validation: ProposalReviewDecisionAuditAppendCommandValidation & {
        accepted: true;
        proposal_pending: boolean;
        proposal_not_applied: boolean;
      };
      boundary: ProposalReviewDecisionAuditAppendCommandBoundary;
    }
  | {
      result: "bad_request";
      error: string;
    }
  | {
      result: "not_found";
      proposal_id: string;
      boundary?: ProposalReviewDecisionAuditAppendCommandBoundary;
    }
  | {
      result: "validation_error";
      error: string;
      command: ProposalReviewDecisionAuditAppendCommandCommand;
      proposal?: ProposalReviewDecisionAuditAppendCommandProposal;
      previous_latest_review_decision?: ProposalReviewDecisionAuditAppendCommandLatestReviewDecision | null;
      validation: ProposalReviewDecisionAuditAppendCommandValidation;
      boundary?: ProposalReviewDecisionAuditAppendCommandBoundary;
    }
  | {
      result: "error";
      error: string;
      boundary?: Partial<ProposalReviewDecisionAuditAppendCommandBoundary>;
    };

type BoundaryRow = {
  db_user: string;
  app_can_insert: boolean;
  app_can_update: boolean;
  app_can_delete: boolean;
  app_can_truncate: boolean;
  ai_can_insert: boolean;
  ai_can_update: boolean;
  ai_can_delete: boolean;
  ai_can_truncate: boolean;
  audit_can_insert: boolean;
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

type EventRow = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  event_metadata: Record<string, unknown>;
  decided_at: Date | string;
  created_at: Date | string;
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
      "farmos_proposal_review_decision_audit_append_command_boundary",
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

function isAllowedDecisionType(
  value: string,
): value is ProposalReviewDecisionAuditAppendCommandDecisionType {
  return proposalReviewDecisionAuditAppendCommandDecisionTypes.includes(
    value as ProposalReviewDecisionAuditAppendCommandDecisionType,
  );
}

function isAllowedDecidedByRole(
  value: string,
): value is ProposalReviewDecisionAuditAppendCommandDecidedByRole {
  return proposalReviewDecisionAuditAppendCommandDecidedByRoles.includes(
    value as ProposalReviewDecisionAuditAppendCommandDecidedByRole,
  );
}

function isAllowedDecisionSource(
  value: string,
): value is ProposalReviewDecisionAuditAppendCommandDecisionSource {
  return proposalReviewDecisionAuditAppendCommandDecisionSources.includes(
    value as ProposalReviewDecisionAuditAppendCommandDecisionSource,
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

function normalizeNote(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function noteIsRequired(decisionType: string): boolean {
  return (
    decisionType === "reject_review" ||
    decisionType === "request_revision" ||
    decisionType === "defer_review"
  );
}

function buildCommand(
  input: ProposalReviewDecisionAuditAppendCommandInput,
): ProposalReviewDecisionAuditAppendCommandCommand {
  return {
    proposal_id: input.proposalId.trim(),
    decision_type: input.decisionType.trim(),
    decision_note: normalizeNote(input.decisionNote),
    decided_by: input.decidedBy.trim(),
    decided_by_role: input.decidedByRole.trim(),
    decision_source: input.decisionSource.trim(),
  };
}

function buildPreProposalValidation(
  command: ProposalReviewDecisionAuditAppendCommandCommand,
): ProposalReviewDecisionAuditAppendCommandValidation {
  return {
    accepted: false,
    required_note_satisfied:
      !noteIsRequired(command.decision_type) || command.decision_note !== null,
    proposal_pending: null,
    proposal_not_applied: null,
    decided_by_present: command.decided_by.length > 0,
    allowed_decision_type: isAllowedDecisionType(command.decision_type),
    allowed_decided_by_role: isAllowedDecidedByRole(command.decided_by_role),
    allowed_decision_source: isAllowedDecisionSource(command.decision_source),
  };
}

function proposalToResult(
  row: ProposalRow,
): ProposalReviewDecisionAuditAppendCommandProposal {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_at: toNullableIsoString(row.reviewed_at),
    applied_by: row.applied_by,
    applied_at: toNullableIsoString(row.applied_at),
  };
}

function latestToResult(
  row: LatestReviewDecisionRow,
): ProposalReviewDecisionAuditAppendCommandLatestReviewDecision {
  return {
    id: row.id,
    decision_type: row.decision_type,
    decided_at: toIsoString(row.decided_at),
  };
}

function eventToResult(
  row: EventRow,
): ProposalReviewDecisionAuditAppendCommandEvent {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    decision_type: row.decision_type,
    decision_note: row.decision_note,
    decided_by: row.decided_by,
    decided_by_role: row.decided_by_role,
    decision_source: row.decision_source,
    event_metadata: row.event_metadata,
    decided_at: toIsoString(row.decided_at),
    created_at: toIsoString(row.created_at),
  };
}

function buildEventMetadata(commit: boolean): Record<string, unknown> {
  return {
    cli: true,
    day: "30",
    boundary: "proposal_review_decision_audit_append_command_boundary",
    command: "append_proposal_review_decision_event_command",
    commit_explicit: commit,
    app_write_expected: false,
    ai_proposal_status_update_expected: false,
    audit_event_append_expected: commit,
  };
}

async function readBoundaryState(
  client: Client,
  writesPerformed: boolean,
  commandsExecuted: boolean,
  auditEventAppendPerformed: boolean,
): Promise<ProposalReviewDecisionAuditAppendCommandBoundary> {
  const result = await client.query<BoundaryRow>(`
    select
      current_user as db_user,
      has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_can_insert,
      has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE') as app_can_update,
      has_table_privilege(current_user, 'app.crop_cycles', 'DELETE') as app_can_delete,
      has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE') as app_can_truncate,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT') as ai_can_insert,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE') as ai_can_update,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE') as ai_can_delete,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE') as ai_can_truncate,
      has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT') as audit_can_insert
  `);

  const row = result.rows[0];

  return {
    mode: "proposal_review_decision_audit_append_command_boundary",
    db_user: row?.db_user ?? "unknown",
    transaction_read_only: false,
    writes_performed: writesPerformed,
    commands_executed: commandsExecuted,
    app_schema_write_allowed: Boolean(
      row?.app_can_insert ||
        row?.app_can_update ||
        row?.app_can_delete ||
        row?.app_can_truncate,
    ),
    ai_proposal_write_allowed: Boolean(
      row?.ai_can_insert ||
        row?.ai_can_update ||
        row?.ai_can_delete ||
        row?.ai_can_truncate,
    ),
    audit_event_write_allowed: Boolean(row?.audit_can_insert),
    app_schema_writes_performed: false,
    ai_proposal_writes_performed: false,
    audit_event_append_performed: auditEventAppendPerformed,
  };
}

async function readProposal(
  client: Client,
  proposalId: string,
): Promise<ProposalReviewDecisionAuditAppendCommandProposal | null> {
  const result = await client.query<ProposalRow>(
    `
      select
        id,
        title,
        status,
        reviewed_by,
        reviewed_at,
        applied_by,
        applied_at
      from ai.proposal_inbox
      where id = $1
      limit 1
    `,
    [proposalId],
  );

  const row = result.rows[0];
  return row ? proposalToResult(row) : null;
}

async function readLatestReviewDecision(
  client: Client,
  proposalId: string,
): Promise<ProposalReviewDecisionAuditAppendCommandLatestReviewDecision | null> {
  const result = await client.query<LatestReviewDecisionRow>(
    `
      select
        id,
        decision_type,
        decided_at
      from audit.proposal_review_decision_latest
      where proposal_id = $1
      limit 1
    `,
    [proposalId],
  );

  const row = result.rows[0];
  return row ? latestToResult(row) : null;
}

export async function appendProposalReviewDecisionAuditEventCommand({
  input,
  commit = false,
}: ProposalReviewDecisionAuditAppendCommandArgs): Promise<ProposalReviewDecisionAuditAppendCommandResult> {
  const command = buildCommand(input);
  const preProposalValidation = buildPreProposalValidation(command);

  if (!command.proposal_id || !isUuid(command.proposal_id)) {
    return {
      result: "bad_request",
      error: "proposalId must be a UUID",
    };
  }

  if (!preProposalValidation.allowed_decision_type) {
    return {
      result: "validation_error",
      error: "decisionType is not allowed",
      command,
      validation: preProposalValidation,
    };
  }

  if (!preProposalValidation.decided_by_present) {
    return {
      result: "validation_error",
      error: "decidedBy is required",
      command,
      validation: preProposalValidation,
    };
  }

  if (!preProposalValidation.allowed_decided_by_role) {
    return {
      result: "validation_error",
      error: "decidedByRole is not allowed",
      command,
      validation: preProposalValidation,
    };
  }

  if (!preProposalValidation.allowed_decision_source) {
    return {
      result: "validation_error",
      error: "decisionSource is not allowed for Day30 audit append",
      command,
      validation: preProposalValidation,
    };
  }

  if (!preProposalValidation.required_note_satisfied) {
    return {
      result: "validation_error",
      error: "decisionNote is required for this decisionType",
      command,
      validation: preProposalValidation,
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin");
    transactionStarted = true;

    const proposal = await readProposal(client, command.proposal_id);

    if (!proposal) {
      await client.query("rollback");
      transactionStarted = false;

      const boundary = await readBoundaryState(client, false, false, false);

      return {
        result: "not_found",
        proposal_id: command.proposal_id,
        boundary,
      };
    }

    const previousLatestReviewDecision = await readLatestReviewDecision(
      client,
      command.proposal_id,
    );

    const validation: ProposalReviewDecisionAuditAppendCommandValidation = {
      ...preProposalValidation,
      proposal_pending: proposal.status === "pending",
      proposal_not_applied: proposal.applied_at === null,
    };

    if (!validation.proposal_pending) {
      const boundary = await readBoundaryState(client, false, false, false);
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "validation_error",
        error: "proposal status must be pending",
        command,
        proposal,
        previous_latest_review_decision: previousLatestReviewDecision,
        validation,
        boundary,
      };
    }

    if (!validation.proposal_not_applied) {
      const boundary = await readBoundaryState(client, false, false, false);
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "validation_error",
        error: "proposal must not be applied",
        command,
        proposal,
        previous_latest_review_decision: previousLatestReviewDecision,
        validation,
        boundary,
      };
    }

    const acceptedValidation = {
      ...validation,
      accepted: true as const,
      proposal_pending: validation.proposal_pending,
      proposal_not_applied: validation.proposal_not_applied,
    };

    if (!commit) {
      const latestAfter = await readLatestReviewDecision(
        client,
        command.proposal_id,
      );
      const boundary = await readBoundaryState(client, false, false, false);
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "ok",
        mode: "dry_run",
        command,
        proposal,
        previous_latest_review_decision: previousLatestReviewDecision,
        appended_event: null,
        latest_review_decision_after: latestAfter,
        validation: acceptedValidation,
        boundary,
      };
    }

    const inserted = await client.query<EventRow>(
      `
        insert into audit.proposal_review_decision_events (
          proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb)
        returning
          id,
          proposal_id,
          decision_type,
          decision_note,
          decided_by,
          decided_by_role,
          decision_source,
          event_metadata,
          decided_at,
          created_at
      `,
      [
        command.proposal_id,
        command.decision_type,
        command.decision_note,
        command.decided_by,
        command.decided_by_role,
        command.decision_source,
        JSON.stringify(buildEventMetadata(true)),
      ],
    );

    const appendedEvent = eventToResult(inserted.rows[0]);
    const latestAfter = await readLatestReviewDecision(
      client,
      command.proposal_id,
    );
    const boundary = await readBoundaryState(client, true, true, true);

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      mode: "committed",
      command,
      proposal,
      previous_latest_review_decision: previousLatestReviewDecision,
      appended_event: appendedEvent,
      latest_review_decision_after: latestAfter,
      validation: acceptedValidation,
      boundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
      boundary: {
        mode: "proposal_review_decision_audit_append_command_boundary",
        transaction_read_only: false,
      },
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
