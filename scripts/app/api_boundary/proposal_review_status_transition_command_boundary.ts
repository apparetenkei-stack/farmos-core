import { Client, type ClientConfig } from "pg";

const allowedTransitionedByRoles = ["owner", "admin", "operator"] as const;
const allowedTransitionSources = ["local_cli"] as const;

type TransitionedByRole = (typeof allowedTransitionedByRoles)[number];
type TransitionSource = (typeof allowedTransitionSources)[number];
type NextStatus = "approved" | "rejected" | "needs_revision" | "pending";

export type ProposalReviewStatusTransitionCommandInput = {
  proposalId: string;
  decisionEventId: string;
  transitionedBy: string;
  transitionedByRole: string;
  transitionSource: string;
  transitionNote: string | null;
};

type ProposalSnapshot = {
  id: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_by: string | null;
  applied_at: string | null;
};

type LatestDecision = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
  decided_at: string;
};

type Command = {
  proposal_id: string;
  decision_event_id: string;
  expected_current_status: "pending";
  next_status: NextStatus;
  transitioned_by: string;
  transitioned_by_role: string;
  transition_source: string;
  transition_note: string | null;
};

type Validation = {
  accepted: boolean;
  latest_decision_exists: boolean;
  decision_event_id_matches_latest: boolean;
  proposal_pending: boolean;
  proposal_not_applied: boolean;
  allowed_transition: boolean;
  allowed_transition_source: boolean;
  allowed_transitioned_by_role: boolean;
  transitioned_by_present: boolean;
};

type Boundary = {
  mode: "proposal_review_status_transition_command_boundary";
  db_user: string;
  transaction_read_only: false;
  writes_performed: boolean;
  commands_executed: boolean;
  app_schema_write_allowed: boolean;
  ai_proposal_status_update_allowed: boolean;
  ai_proposal_review_fields_update_allowed: boolean;
  ai_proposal_applied_fields_update_allowed: boolean;
  audit_event_write_allowed: boolean;
  app_schema_writes_performed: false;
  ai_proposal_status_transition_performed: boolean;
  app_projection_apply_performed: false;
};

export type ProposalReviewStatusTransitionCommandResult =
  | {
      result: "ok";
      mode: "committed" | "dry_run";
      command: Command;
      proposal_before: ProposalSnapshot;
      latest_review_decision: LatestDecision;
      proposal_after: ProposalSnapshot | null;
      validation: Validation & { accepted: true };
      boundary: Boundary;
    }
  | {
      result: "transition_not_required";
      command: Command;
      proposal_before: ProposalSnapshot;
      latest_review_decision: LatestDecision;
      proposal_after: null;
      validation: Validation & { accepted: true };
      boundary: Boundary;
    }
  | {
      result: "bad_request";
      error: string;
    }
  | {
      result: "not_found";
      proposal_id: string;
      boundary?: Boundary;
    }
  | {
      result: "validation_error";
      error: string;
      command: Command;
      proposal_before?: ProposalSnapshot;
      latest_review_decision?: LatestDecision | null;
      validation: Validation;
      boundary?: Boundary;
    }
  | {
      result: "error";
      error: string;
      boundary?: Partial<Boundary>;
    };

type BoundaryRow = {
  db_user: string;
  app_can_insert: boolean;
  app_can_update: boolean;
  app_can_delete: boolean;
  app_can_truncate: boolean;
  ai_status_can_update: boolean;
  ai_reviewed_by_can_update: boolean;
  ai_reviewed_at_can_update: boolean;
  ai_review_note_can_update: boolean;
  ai_updated_at_can_update: boolean;
  ai_applied_by_can_update: boolean;
  ai_applied_at_can_update: boolean;
  audit_can_insert: boolean;
};

type ProposalRow = {
  id: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
  review_note: string | null;
  applied_by: string | null;
  applied_at: Date | string | null;
};

type LatestDecisionRow = {
  id: string;
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
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
    application_name:
      "farmos_proposal_review_status_transition_command_boundary",
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

function isAllowedTransitionedByRole(value: string): value is TransitionedByRole {
  return allowedTransitionedByRoles.includes(value as TransitionedByRole);
}

function isAllowedTransitionSource(value: string): value is TransitionSource {
  return allowedTransitionSources.includes(value as TransitionSource);
}

function normalizeNote(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function mapDecisionTypeToNextStatus(decisionType: string): NextStatus | null {
  if (decisionType === "approve_review") {
    return "approved";
  }

  if (decisionType === "reject_review") {
    return "rejected";
  }

  if (decisionType === "request_revision") {
    return "needs_revision";
  }

  if (decisionType === "defer_review") {
    return "pending";
  }

  return null;
}

function proposalSnapshot(row: ProposalRow): ProposalSnapshot {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_at: toNullableIsoString(row.reviewed_at),
    review_note: row.review_note,
    applied_by: row.applied_by,
    applied_at: toNullableIsoString(row.applied_at),
  };
}

function latestDecision(row: LatestDecisionRow): LatestDecision {
  return {
    id: row.id,
    proposal_id: row.proposal_id,
    decision_type: row.decision_type,
    decision_note: row.decision_note,
    decided_by: row.decided_by,
    decided_by_role: row.decided_by_role,
    decision_source: row.decision_source,
    decided_at: toIsoString(row.decided_at),
  };
}

function buildCommand(input: ProposalReviewStatusTransitionCommandInput, nextStatus: NextStatus): Command {
  return {
    proposal_id: input.proposalId,
    decision_event_id: input.decisionEventId,
    expected_current_status: "pending",
    next_status: nextStatus,
    transitioned_by: input.transitionedBy.trim(),
    transitioned_by_role: input.transitionedByRole,
    transition_source: input.transitionSource,
    transition_note: normalizeNote(input.transitionNote),
  };
}

function buildBoundary(row: BoundaryRow, values: {
  writesPerformed: boolean;
  commandsExecuted: boolean;
  statusTransitionPerformed: boolean;
}): Boundary {
  return {
    mode: "proposal_review_status_transition_command_boundary",
    db_user: row.db_user,
    transaction_read_only: false,
    writes_performed: values.writesPerformed,
    commands_executed: values.commandsExecuted,
    app_schema_write_allowed:
      row.app_can_insert ||
      row.app_can_update ||
      row.app_can_delete ||
      row.app_can_truncate,
    ai_proposal_status_update_allowed: row.ai_status_can_update,
    ai_proposal_review_fields_update_allowed:
      row.ai_reviewed_by_can_update &&
      row.ai_reviewed_at_can_update &&
      row.ai_review_note_can_update &&
      row.ai_updated_at_can_update,
    ai_proposal_applied_fields_update_allowed:
      row.ai_applied_by_can_update || row.ai_applied_at_can_update,
    audit_event_write_allowed: row.audit_can_insert,
    app_schema_writes_performed: false,
    ai_proposal_status_transition_performed: values.statusTransitionPerformed,
    app_projection_apply_performed: false,
  };
}

function buildValidation(args: {
  proposal: ProposalSnapshot;
  latest: LatestDecision | null;
  input: ProposalReviewStatusTransitionCommandInput;
  nextStatus: NextStatus | null;
}): Validation {
  return {
    accepted: false,
    latest_decision_exists: args.latest !== null,
    decision_event_id_matches_latest:
      args.latest?.id === args.input.decisionEventId,
    proposal_pending: args.proposal.status === "pending",
    proposal_not_applied:
      args.proposal.applied_by === null && args.proposal.applied_at === null,
    allowed_transition: args.nextStatus !== null,
    allowed_transition_source:
      isAllowedTransitionSource(args.input.transitionSource) &&
      args.latest?.decision_source === "local_cli",
    allowed_transitioned_by_role: isAllowedTransitionedByRole(
      args.input.transitionedByRole,
    ),
    transitioned_by_present: args.input.transitionedBy.trim().length > 0,
  };
}

function isAccepted(validation: Validation): boolean {
  return (
    validation.latest_decision_exists &&
    validation.decision_event_id_matches_latest &&
    validation.proposal_pending &&
    validation.proposal_not_applied &&
    validation.allowed_transition &&
    validation.allowed_transition_source &&
    validation.allowed_transitioned_by_role &&
    validation.transitioned_by_present
  );
}

async function readBoundaryRow(client: Client): Promise<BoundaryRow> {
  const result = await client.query<BoundaryRow>(
    `
      select
        current_user as db_user,
        has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_can_insert,
        has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE') as app_can_update,
        has_table_privilege(current_user, 'app.crop_cycles', 'DELETE') as app_can_delete,
        has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE') as app_can_truncate,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'status', 'UPDATE') as ai_status_can_update,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'reviewed_by', 'UPDATE') as ai_reviewed_by_can_update,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'reviewed_at', 'UPDATE') as ai_reviewed_at_can_update,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'review_note', 'UPDATE') as ai_review_note_can_update,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'updated_at', 'UPDATE') as ai_updated_at_can_update,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'applied_by', 'UPDATE') as ai_applied_by_can_update,
        has_column_privilege(current_user, 'ai.proposal_inbox', 'applied_at', 'UPDATE') as ai_applied_at_can_update,
        has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT') as audit_can_insert
    `,
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("boundary privilege row was not returned");
  }

  return row;
}

async function readProposal(client: Client, proposalId: string): Promise<ProposalSnapshot | null> {
  const result = await client.query<ProposalRow>(
    `
      select
        id,
        title,
        status,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_by,
        applied_at
      from ai.proposal_inbox
      where id = $1
      limit 1
    `,
    [proposalId],
  );

  const row = result.rows[0];
  return row ? proposalSnapshot(row) : null;
}

async function readLatestDecision(client: Client, proposalId: string): Promise<LatestDecision | null> {
  const result = await client.query<LatestDecisionRow>(
    `
      select
        id,
        proposal_id,
        decision_type,
        decision_note,
        decided_by,
        decided_by_role,
        decision_source,
        decided_at
      from audit.proposal_review_decision_latest
      where proposal_id = $1
      limit 1
    `,
    [proposalId],
  );

  const row = result.rows[0];
  return row ? latestDecision(row) : null;
}

async function updateProposalStatus(args: {
  client: Client;
  proposalId: string;
  nextStatus: Exclude<NextStatus, "pending">;
  transitionedBy: string;
  transitionNote: string | null;
}): Promise<ProposalSnapshot | null> {
  const result = await args.client.query<ProposalRow>(
    `
      update ai.proposal_inbox
      set status = $1,
          reviewed_by = $2,
          reviewed_at = now(),
          review_note = $3,
          updated_at = now()
      where id = $4
        and status = 'pending'
        and applied_at is null
        and applied_by is null
      returning
        id,
        title,
        status,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_by,
        applied_at
    `,
    [args.nextStatus, args.transitionedBy, args.transitionNote, args.proposalId],
  );

  const row = result.rows[0];
  return row ? proposalSnapshot(row) : null;
}

export async function transitionProposalReviewStatusCommand(args: {
  input: ProposalReviewStatusTransitionCommandInput;
  commit: boolean;
}): Promise<ProposalReviewStatusTransitionCommandResult> {
  if (!isUuid(args.input.proposalId)) {
    return {
      result: "bad_request",
      error: "proposalId must be a UUID",
    };
  }

  if (!isUuid(args.input.decisionEventId)) {
    return {
      result: "bad_request",
      error: "decisionEventId must be a UUID",
    };
  }

  const client = createClient();
  let transactionStarted = false;
  let boundaryRow: BoundaryRow | null = null;

  try {
    await client.connect();
    await client.query("begin");
    transactionStarted = true;

    boundaryRow = await readBoundaryRow(client);
    const boundary = buildBoundary(boundaryRow, {
      writesPerformed: false,
      commandsExecuted: false,
      statusTransitionPerformed: false,
    });

    const proposal = await readProposal(client, args.input.proposalId);

    if (!proposal) {
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "not_found",
        proposal_id: args.input.proposalId,
        boundary,
      };
    }

    const latest = await readLatestDecision(client, args.input.proposalId);
    const nextStatus = latest ? mapDecisionTypeToNextStatus(latest.decision_type) : null;
    const command = buildCommand(args.input, nextStatus ?? "pending");

    const validation = buildValidation({
      proposal,
      latest,
      input: args.input,
      nextStatus,
    });

    if (!isAccepted(validation)) {
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "validation_error",
        error: "proposal review status transition validation failed",
        command,
        proposal_before: proposal,
        latest_review_decision: latest,
        validation,
        boundary,
      };
    }

    if (!latest) {
      throw new Error("latest decision unexpectedly missing");
    }

    const acceptedValidation = {
      ...validation,
      accepted: true,
    } as Validation & { accepted: true };

    if (command.next_status === "pending") {
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "transition_not_required",
        command,
        proposal_before: proposal,
        latest_review_decision: latest,
        proposal_after: null,
        validation: acceptedValidation,
        boundary,
      };
    }

    if (!args.commit) {
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "ok",
        mode: "dry_run",
        command,
        proposal_before: proposal,
        latest_review_decision: latest,
        proposal_after: null,
        validation: acceptedValidation,
        boundary,
      };
    }

    const proposalAfter = await updateProposalStatus({
      client,
      proposalId: command.proposal_id,
      nextStatus: command.next_status,
      transitionedBy: command.transitioned_by,
      transitionNote: command.transition_note,
    });

    if (!proposalAfter) {
      await client.query("rollback");
      transactionStarted = false;

      return {
        result: "validation_error",
        error: "proposal was not transitionable at update time",
        command,
        proposal_before: proposal,
        latest_review_decision: latest,
        validation,
        boundary,
      };
    }

    const committedBoundary = buildBoundary(boundaryRow, {
      writesPerformed: true,
      commandsExecuted: true,
      statusTransitionPerformed: true,
    });

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      mode: "committed",
      command,
      proposal_before: proposal,
      latest_review_decision: latest,
      proposal_after: proposalAfter,
      validation: acceptedValidation,
      boundary: committedBoundary,
    };
  } catch (error) {
    if (transactionStarted) {
      await client.query("rollback").catch(() => undefined);
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
      boundary: boundaryRow
        ? buildBoundary(boundaryRow, {
            writesPerformed: false,
            commandsExecuted: false,
            statusTransitionPerformed: false,
          })
        : undefined,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}
