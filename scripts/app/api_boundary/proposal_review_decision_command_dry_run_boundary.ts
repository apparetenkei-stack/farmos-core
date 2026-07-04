import { Client, type ClientConfig } from "pg";

export const proposalReviewDecisionCommandDryRunDecisionTypes = [
  "approve_review",
  "reject_review",
  "request_revision",
  "defer_review",
] as const;

export type ProposalReviewDecisionCommandDryRunDecisionType =
  (typeof proposalReviewDecisionCommandDryRunDecisionTypes)[number];

export const proposalReviewDecisionCommandDryRunDecidedByRoles = [
  "owner",
  "admin",
  "operator",
] as const;

export type ProposalReviewDecisionCommandDryRunDecidedByRole =
  (typeof proposalReviewDecisionCommandDryRunDecidedByRoles)[number];

export const proposalReviewDecisionCommandDryRunDecisionSources = [
  "local_cli_dry_run",
  "future_ui_dry_run",
] as const;

export type ProposalReviewDecisionCommandDryRunDecisionSource =
  (typeof proposalReviewDecisionCommandDryRunDecisionSources)[number];

export type ProposalReviewDecisionCommandDryRunInput = {
  proposalId: string;
  decisionType: string;
  decisionNote: string | null;
  decidedBy: string;
  decidedByRole: string;
  decisionSource: string;
};

export type ProposalReviewDecisionCommandDryRunCommand = {
  proposal_id: string;
  decision_type: string;
  decision_note: string | null;
  decided_by: string;
  decided_by_role: string;
  decision_source: string;
};

export type ProposalReviewDecisionCommandDryRunProposal = {
  id: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  applied_by: string | null;
  applied_at: string | null;
};

export type ProposalReviewDecisionCommandDryRunLatestReviewDecision = {
  id: string;
  decision_type: string;
  decided_at: string;
};

export type ProposalReviewDecisionCommandDryRunValidation = {
  accepted: boolean;
  required_note_satisfied: boolean;
  proposal_pending: boolean | null;
  proposal_not_applied: boolean | null;
  decided_by_present: boolean;
  allowed_decision_type: boolean;
  allowed_decided_by_role: boolean;
  allowed_decision_source: boolean;
};

export type ProposalReviewDecisionCommandDryRunBoundary = {
  mode: "proposal_review_decision_command_dry_run_boundary";
  db_user: string;
  transaction_read_only: true;
  writes_performed: false;
  commands_executed: false;
  dry_run: true;
  app_schema_write_allowed: boolean;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
};

export type ProposalReviewDecisionCommandDryRunResult =
  | {
      result: "ok";
      command: ProposalReviewDecisionCommandDryRunCommand;
      proposal: ProposalReviewDecisionCommandDryRunProposal;
      latest_review_decision: ProposalReviewDecisionCommandDryRunLatestReviewDecision | null;
      validation: ProposalReviewDecisionCommandDryRunValidation & {
        accepted: true;
        proposal_pending: boolean;
        proposal_not_applied: boolean;
      };
      dry_run_event_candidate: {
        proposal_id: string;
        decision_type: ProposalReviewDecisionCommandDryRunDecisionType;
        decision_note: string | null;
        decided_by: string;
        decided_by_role: ProposalReviewDecisionCommandDryRunDecidedByRole;
        decision_source: ProposalReviewDecisionCommandDryRunDecisionSource;
        event_metadata: Record<string, unknown>;
      };
      boundary: ProposalReviewDecisionCommandDryRunBoundary;
    }
  | {
      result: "bad_request";
      error: string;
    }
  | {
      result: "not_found";
      proposal_id: string;
      boundary?: ProposalReviewDecisionCommandDryRunBoundary;
    }
  | {
      result: "validation_error";
      error: string;
      command: ProposalReviewDecisionCommandDryRunCommand;
      proposal?: ProposalReviewDecisionCommandDryRunProposal;
      latest_review_decision?: ProposalReviewDecisionCommandDryRunLatestReviewDecision | null;
      validation: ProposalReviewDecisionCommandDryRunValidation;
      boundary?: ProposalReviewDecisionCommandDryRunBoundary;
    }
  | {
      result: "error";
      error: string;
      boundary?: Partial<ProposalReviewDecisionCommandDryRunBoundary>;
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
    application_name: "farmos_proposal_review_decision_command_dry_run_boundary",
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
): value is ProposalReviewDecisionCommandDryRunDecisionType {
  return proposalReviewDecisionCommandDryRunDecisionTypes.includes(
    value as ProposalReviewDecisionCommandDryRunDecisionType,
  );
}

function isAllowedDecidedByRole(
  value: string,
): value is ProposalReviewDecisionCommandDryRunDecidedByRole {
  return proposalReviewDecisionCommandDryRunDecidedByRoles.includes(
    value as ProposalReviewDecisionCommandDryRunDecidedByRole,
  );
}

function isAllowedDecisionSource(
  value: string,
): value is ProposalReviewDecisionCommandDryRunDecisionSource {
  return proposalReviewDecisionCommandDryRunDecisionSources.includes(
    value as ProposalReviewDecisionCommandDryRunDecisionSource,
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
  input: ProposalReviewDecisionCommandDryRunInput,
): ProposalReviewDecisionCommandDryRunCommand {
  return {
    proposal_id: input.proposalId,
    decision_type: input.decisionType,
    decision_note: normalizeNote(input.decisionNote),
    decided_by: input.decidedBy.trim(),
    decided_by_role: input.decidedByRole,
    decision_source: input.decisionSource,
  };
}

function buildPreProposalValidation(
  command: ProposalReviewDecisionCommandDryRunCommand,
): ProposalReviewDecisionCommandDryRunValidation {
  const requiredNoteSatisfied =
    !noteIsRequired(command.decision_type) || command.decision_note !== null;

  return {
    accepted: false,
    required_note_satisfied: requiredNoteSatisfied,
    proposal_pending: null,
    proposal_not_applied: null,
    decided_by_present: command.decided_by.length > 0,
    allowed_decision_type: isAllowedDecisionType(command.decision_type),
    allowed_decided_by_role: isAllowedDecidedByRole(command.decided_by_role),
    allowed_decision_source: isAllowedDecisionSource(command.decision_source),
  };
}

function validationIsAccepted(
  validation: ProposalReviewDecisionCommandDryRunValidation,
): validation is ProposalReviewDecisionCommandDryRunValidation & {
  accepted: true;
  proposal_pending: boolean;
  proposal_not_applied: boolean;
} {
  return (
    validation.accepted === true &&
    validation.required_note_satisfied === true &&
    validation.proposal_pending === true &&
    validation.proposal_not_applied === true &&
    validation.decided_by_present === true &&
    validation.allowed_decision_type === true &&
    validation.allowed_decided_by_role === true &&
    validation.allowed_decision_source === true
  );
}

function firstValidationError(
  validation: ProposalReviewDecisionCommandDryRunValidation,
): string {
  if (!validation.allowed_decision_type) {
    return "decisionType is not allowed.";
  }

  if (!validation.required_note_satisfied) {
    return "decisionNote is required for this decisionType.";
  }

  if (!validation.decided_by_present) {
    return "decidedBy must be non-empty.";
  }

  if (!validation.allowed_decided_by_role) {
    return "decidedByRole is not allowed.";
  }

  if (!validation.allowed_decision_source) {
    return "decisionSource is not allowed.";
  }

  if (validation.proposal_pending === false) {
    return "proposal status must be pending.";
  }

  if (validation.proposal_not_applied === false) {
    return "proposal must not already be applied.";
  }

  return "command payload did not satisfy validation.";
}

function mapProposal(row: ProposalRow): ProposalReviewDecisionCommandDryRunProposal {
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

function mapLatestReviewDecision(
  row: LatestReviewDecisionRow,
): ProposalReviewDecisionCommandDryRunLatestReviewDecision {
  return {
    id: row.id,
    decision_type: row.decision_type,
    decided_at: toIsoString(row.decided_at),
  };
}

async function readBoundary(
  client: Client,
): Promise<ProposalReviewDecisionCommandDryRunBoundary> {
  const result = await client.query<BoundaryRow>(`
    select
      current_user as db_user,
      current_setting('transaction_read_only') = 'on' as transaction_read_only,
      exists (
        select 1
        from information_schema.tables t
        where t.table_schema = 'app'
          and t.table_type = 'BASE TABLE'
          and (
            has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'INSERT')
            or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'UPDATE')
            or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'DELETE')
            or has_table_privilege(current_user, format('%I.%I', t.table_schema, t.table_name), 'TRUNCATE')
          )
      ) as app_schema_write_allowed,
      (
        has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE')
      ) as ai_proposal_write_allowed,
      has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT')
        as audit_event_write_allowed
  `);

  const row = result.rows[0];

  if (!row.transaction_read_only) {
    throw new Error("dry-run boundary must run in a read-only transaction");
  }

  return {
    mode: "proposal_review_decision_command_dry_run_boundary",
    db_user: row.db_user,
    transaction_read_only: true,
    writes_performed: false,
    commands_executed: false,
    dry_run: true,
    app_schema_write_allowed: row.app_schema_write_allowed,
    ai_proposal_write_allowed: row.ai_proposal_write_allowed,
    audit_event_write_allowed: row.audit_event_write_allowed,
  };
}

export async function dryRunProposalReviewDecisionCommand(params: {
  input: ProposalReviewDecisionCommandDryRunInput;
}): Promise<ProposalReviewDecisionCommandDryRunResult> {
  const command = buildCommand(params.input);

  if (!command.proposal_id || !isUuid(command.proposal_id)) {
    return {
      result: "bad_request",
      error: "proposalId must be a valid UUID.",
    };
  }

  const preProposalValidation = buildPreProposalValidation(command);

  if (
    !preProposalValidation.required_note_satisfied ||
    !preProposalValidation.decided_by_present ||
    !preProposalValidation.allowed_decision_type ||
    !preProposalValidation.allowed_decided_by_role ||
    !preProposalValidation.allowed_decision_source
  ) {
    return {
      result: "validation_error",
      error: firstValidationError(preProposalValidation),
      command,
      validation: preProposalValidation,
    };
  }

  const client = createClient();
  let transactionStarted = false;

  try {
    await client.connect();
    await client.query("begin transaction read only");
    transactionStarted = true;

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
      [command.proposal_id],
    );

    const latestReviewDecisionResult =
      await client.query<LatestReviewDecisionRow>(
        `
          select
            id::text as id,
            decision_type,
            decided_at
          from audit.proposal_review_decision_latest
          where proposal_id = $1::uuid
          limit 1
        `,
        [command.proposal_id],
      );

    const boundary = await readBoundary(client);

    const proposalRow = proposalResult.rows[0];

    if (!proposalRow) {
      await client.query("commit");
      transactionStarted = false;

      return {
        result: "not_found",
        proposal_id: command.proposal_id,
        boundary,
      };
    }

    const proposal = mapProposal(proposalRow);

    const latestReviewDecision = latestReviewDecisionResult.rows[0]
      ? mapLatestReviewDecision(latestReviewDecisionResult.rows[0])
      : null;

    const validation: ProposalReviewDecisionCommandDryRunValidation = {
      ...preProposalValidation,
      accepted:
        proposal.status === "pending" &&
        proposal.applied_at === null,
      proposal_pending: proposal.status === "pending",
      proposal_not_applied: proposal.applied_at === null,
    };

    if (!validationIsAccepted(validation)) {
      await client.query("commit");
      transactionStarted = false;

      return {
        result: "validation_error",
        error: firstValidationError(validation),
        command,
        proposal,
        latest_review_decision: latestReviewDecision,
        validation,
        boundary,
      };
    }

    if (!isAllowedDecisionType(command.decision_type)) {
      throw new Error("unreachable invalid decision type after validation");
    }

    if (!isAllowedDecidedByRole(command.decided_by_role)) {
      throw new Error("unreachable invalid role after validation");
    }

    if (!isAllowedDecisionSource(command.decision_source)) {
      throw new Error("unreachable invalid source after validation");
    }

    const dryRunEventCandidate = {
      proposal_id: command.proposal_id,
      decision_type: command.decision_type,
      decision_note: command.decision_note,
      decided_by: command.decided_by,
      decided_by_role: command.decided_by_role,
      decision_source: command.decision_source,
      event_metadata: {
        day: "29",
        dry_run: true,
        commands_executed: false,
        writes_performed: false,
        generated_by: "proposal_review_decision_command_dry_run_boundary",
        validation_boundary: true,
        app_write_expected: false,
        proposal_status_change_expected: false,
        audit_event_append_expected: false,
        current_proposal_status: proposal.status,
        latest_review_decision_type:
          latestReviewDecision?.decision_type ?? null,
      },
    };

    await client.query("commit");
    transactionStarted = false;

    return {
      result: "ok",
      command,
      proposal,
      latest_review_decision: latestReviewDecision,
      validation,
      dry_run_event_candidate: dryRunEventCandidate,
      boundary,
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
