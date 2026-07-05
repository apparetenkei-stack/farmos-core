import { Client, type ClientConfig } from "pg";
import { previewProposalReviewApplyPlan } from "./proposal_review_apply_plan_preview_read_api_boundary";

export type ProposalReviewApplyCommandInput = {
  proposalId: string;
  commit?: boolean;
  appliedBy?: string;
  appliedByRole?: string;
};

export type ProposalReviewApplyCommandResultStatus =
  | "ok"
  | "blocked"
  | "bad_request"
  | "not_found"
  | "error";

export type ProposalReviewApplyCommandMode = "dry_run" | "committed";

type ApplyOperation = "insert" | "no_op" | "blocked";

type PreviewOperation =
  | "insert_candidate"
  | "update_candidate"
  | "no_op_candidate"
  | "blocked";

type Candidate = {
  crop: string | null;
  variety: string | null;
  field_name: string | null;
  sowing_date_text: string | null;
  transplant_date_text: string | null;
};

type ProposalSnapshot = {
  id: string;
  proposal_type: string;
  title: string;
  status: string;
  payload_json?: Record<string, unknown>;
  applied_by: string | null;
  applied_at: string | null;
};

type ExistingCropCycle = {
  id: number;
  source_extracted_fact_ids: number[];
  crop: string | null;
  variety: string | null;
  field_name: string | null;
  sowing_date_text: string | null;
  transplant_date_text: string | null;
  archived: boolean;
};

type Boundary = {
  mode: "proposal_review_apply_command_boundary";
  db_user: string | null;
  transaction_read_only: boolean;
  dry_run: boolean;
  commit_requested: boolean;
  writes_performed: boolean;
  app_schema_writes_performed: boolean;
  app_crop_cycles_insert_performed: boolean;
  app_crop_cycles_update_performed: false;
  app_crop_cycles_delete_performed: false;
  ai_proposal_apply_marker_updated: boolean;
  ai_proposal_status_updated: false;
  app_projection_apply_performed: boolean;
  commands_executed: boolean;
  ui_invoked: false;
  app_crop_cycles_insert_allowed: boolean;
  ai_proposal_apply_marker_update_allowed: boolean;
};

type ApplySummary = {
  operation: ApplyOperation;
  inserted_crop_cycle_id: number | null;
  app_crop_cycles_rows_inserted: number;
  app_crop_cycles_rows_updated: 0;
  ai_proposal_apply_marker_updated: boolean;
  ai_proposal_rows_updated: number;
};

export type ProposalReviewApplyCommandResult = {
  result: ProposalReviewApplyCommandResultStatus;
  mode: ProposalReviewApplyCommandMode;
  error?: string;
  blocked_reasons: string[];
  proposal: Omit<ProposalSnapshot, "payload_json"> | null;
  preview: unknown;
  apply: ApplySummary;
  boundary: Boundary;
};

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? "farmos_local_admin",
    password: process.env.PGPASSWORD,
    application_name: "farmos_proposal_review_apply_command_boundary",
  };

  return new Client(config);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function positiveIntegerOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return parsed > 0 ? parsed : null;
  }

  return null;
}

function toNullableIsoString(value: Date | string | null): string | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function proposalForResult(row: ProposalSnapshot | null): Omit<ProposalSnapshot, "payload_json"> | null {
  if (!row) return null;

  return {
    id: row.id,
    proposal_type: row.proposal_type,
    title: row.title,
    status: row.status,
    applied_by: row.applied_by,
    applied_at: row.applied_at,
  };
}

function emptyApply(operation: ApplyOperation = "blocked"): ApplySummary {
  return {
    operation,
    inserted_crop_cycle_id: null,
    app_crop_cycles_rows_inserted: 0,
    app_crop_cycles_rows_updated: 0,
    ai_proposal_apply_marker_updated: false,
    ai_proposal_rows_updated: 0,
  };
}

function buildBoundary(args: {
  row: Record<string, unknown> | null;
  dryRun: boolean;
  commitRequested: boolean;
  writesPerformed: boolean;
  appSchemaWritesPerformed: boolean;
  appCropCyclesInsertPerformed: boolean;
  aiProposalApplyMarkerUpdated: boolean;
  appProjectionApplyPerformed: boolean;
  commandsExecuted: boolean;
}): Boundary {
  return {
    mode: "proposal_review_apply_command_boundary",
    db_user: stringOrNull(args.row?.db_user) ?? null,
    transaction_read_only: args.row?.transaction_read_only === "on",
    dry_run: args.dryRun,
    commit_requested: args.commitRequested,
    writes_performed: args.writesPerformed,
    app_schema_writes_performed: args.appSchemaWritesPerformed,
    app_crop_cycles_insert_performed: args.appCropCyclesInsertPerformed,
    app_crop_cycles_update_performed: false,
    app_crop_cycles_delete_performed: false,
    ai_proposal_apply_marker_updated: args.aiProposalApplyMarkerUpdated,
    ai_proposal_status_updated: false,
    app_projection_apply_performed: args.appProjectionApplyPerformed,
    commands_executed: args.commandsExecuted,
    ui_invoked: false,
    app_crop_cycles_insert_allowed: Boolean(args.row?.app_crop_cycles_insert_allowed),
    ai_proposal_apply_marker_update_allowed: Boolean(
      args.row?.ai_proposal_applied_by_update_allowed,
    ) && Boolean(args.row?.ai_proposal_applied_at_update_allowed),
  };
}

async function readBoundaryRow(client: Client): Promise<Record<string, unknown>> {
  const result = await client.query(`
    select
      current_user as db_user,
      current_setting('transaction_read_only') as transaction_read_only,
      has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_crop_cycles_insert_allowed,
      has_column_privilege(current_user, 'ai.proposal_inbox', 'applied_by', 'UPDATE') as ai_proposal_applied_by_update_allowed,
      has_column_privilege(current_user, 'ai.proposal_inbox', 'applied_at', 'UPDATE') as ai_proposal_applied_at_update_allowed
  `);

  return result.rows[0] ?? {};
}

async function readProposal(client: Client, proposalId: string): Promise<ProposalSnapshot | null> {
  const result = await client.query(
    `
      select
        id::text,
        proposal_type,
        title,
        status,
        payload_json,
        applied_by,
        applied_at
      from ai.proposal_inbox
      where id = $1
      limit 1
    `,
    [proposalId],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    proposal_type: row.proposal_type,
    title: row.title,
    status: row.status,
    payload_json: normalizePayload(row.payload_json),
    applied_by: row.applied_by,
    applied_at: toNullableIsoString(row.applied_at),
  };
}

function extractPreviewOperation(preview: unknown): PreviewOperation | null {
  if (!isRecord(preview)) return null;
  const previewBlock = preview.preview;
  if (!isRecord(previewBlock)) return null;
  const operation = previewBlock.operation;
  if (
    operation === "insert_candidate" ||
    operation === "update_candidate" ||
    operation === "no_op_candidate" ||
    operation === "blocked"
  ) {
    return operation;
  }
  return null;
}

function extractPreviewCandidate(preview: unknown): Candidate | null {
  if (!isRecord(preview)) return null;
  const previewBlock = preview.preview;
  if (!isRecord(previewBlock)) return null;
  const candidate = previewBlock.candidate;
  if (!isRecord(candidate)) return null;

  return {
    crop: stringOrNull(candidate.crop),
    variety: stringOrNull(candidate.variety),
    field_name: stringOrNull(candidate.field_name),
    sowing_date_text: stringOrNull(candidate.sowing_date_text),
    transplant_date_text: stringOrNull(candidate.transplant_date_text),
  };
}

function previewResultName(preview: unknown): string | null {
  if (!isRecord(preview)) return null;
  return stringOrNull(preview.result);
}

function candidateRequiredFieldsPresent(candidate: Candidate): boolean {
  return Boolean(candidate.crop);
}

function targetIsAppCropCycles(payload: Record<string, unknown>): boolean {
  return payload.target_schema === "app" && payload.target_table === "crop_cycles";
}

async function readExactMatches(
  client: Client,
  candidate: Candidate,
): Promise<ExistingCropCycle[]> {
  const result = await client.query(
    `
      select
        id,
        source_extracted_fact_ids,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        archived
      from app.crop_cycles
      where crop is not distinct from $1
        and variety is not distinct from $2
        and field_name is not distinct from $3
        and sowing_date_text is not distinct from $4
        and transplant_date_text is not distinct from $5
        and archived = false
      order by id
      limit 10
    `,
    [
      candidate.crop,
      candidate.variety,
      candidate.field_name,
      candidate.sowing_date_text,
      candidate.transplant_date_text,
    ],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    source_extracted_fact_ids: row.source_extracted_fact_ids ?? [],
    crop: row.crop,
    variety: row.variety,
    field_name: row.field_name,
    sowing_date_text: row.sowing_date_text,
    transplant_date_text: row.transplant_date_text,
    archived: Boolean(row.archived),
  }));
}

async function insertCropCycle(args: {
  client: Client;
  candidate: Candidate;
  createdBy: string;
  createdByRole: string;
  sourceApplyPlanId: number;
}): Promise<number> {
  const result = await args.client.query(
    `
      insert into app.crop_cycles (
        season_year,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        source_apply_plan_id,
        source_extracted_fact_ids,
        created_by,
        created_by_role,
        archived
      )
      values (2026, $1, $2, $3, $4, $5, $6, '{}', $7, $8, false)
      returning id
    `,
    [
      args.candidate.crop,
      args.candidate.variety,
      args.candidate.field_name,
      args.candidate.sowing_date_text,
      args.candidate.transplant_date_text,
      args.sourceApplyPlanId,
      args.createdBy,
      args.createdByRole,
    ],
  );

  return Number(result.rows[0].id);
}

async function updateApplyMarker(args: {
  client: Client;
  proposalId: string;
  appliedBy: string;
}): Promise<ProposalSnapshot | null> {
  const result = await args.client.query(
    `
      update ai.proposal_inbox
      set
        applied_by = $2,
        applied_at = now()
      where id = $1
        and applied_by is null
        and applied_at is null
      returning
        id::text,
        proposal_type,
        title,
        status,
        payload_json,
        applied_by,
        applied_at
    `,
    [args.proposalId, args.appliedBy],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    proposal_type: row.proposal_type,
    title: row.title,
    status: row.status,
    payload_json: normalizePayload(row.payload_json),
    applied_by: row.applied_by,
    applied_at: toNullableIsoString(row.applied_at),
  };
}

async function rollbackQuietly(client: Client): Promise<void> {
  try {
    await client.query("rollback");
  } catch {
    // no-op
  }
}


async function previewWithReadOnlyBoundary(
  proposalId: string,
): Promise<unknown> {
  return await previewProposalReviewApplyPlan({
    proposalId,
    allowPrivilegedReadOnlyCaller: true,
  });
}

async function buildNonWritingResult(args: {
  result: ProposalReviewApplyCommandResultStatus;
  mode: ProposalReviewApplyCommandMode;
  preview: unknown;
  proposal: ProposalSnapshot | null;
  blockedReasons: string[];
  error?: string;
  commitRequested: boolean;
}): Promise<ProposalReviewApplyCommandResult> {
  const client = createClient();
  await client.connect();

  try {
    await client.query("begin transaction read only");
    const boundaryRow = await readBoundaryRow(client);
    await client.query("rollback");

    return {
      result: args.result,
      mode: args.mode,
      error: args.error,
      blocked_reasons: args.blockedReasons,
      proposal: proposalForResult(args.proposal),
      preview: args.preview,
      apply: emptyApply(),
      boundary: buildBoundary({
        row: boundaryRow,
        dryRun: args.mode === "dry_run",
        commitRequested: args.commitRequested,
        writesPerformed: false,
        appSchemaWritesPerformed: false,
        appCropCyclesInsertPerformed: false,
        aiProposalApplyMarkerUpdated: false,
        appProjectionApplyPerformed: false,
        commandsExecuted: false,
      }),
    };
  } catch (error) {
    await rollbackQuietly(client);
    throw error;
  } finally {
    await client.end();
  }
}

export async function applyProposalReviewApplyPlanCommand(
  input: ProposalReviewApplyCommandInput,
): Promise<ProposalReviewApplyCommandResult> {
  const proposalId = input.proposalId;
  const commitRequested = input.commit === true;
  const appliedBy = (input.appliedBy ?? "hayate").trim();

  if (!isUuid(proposalId)) {
    return buildNonWritingResult({
      result: "bad_request",
      mode: "dry_run",
      preview: null,
      proposal: null,
      blockedReasons: ["invalid_proposal_id"],
      error: "proposalId must be a UUID",
      commitRequested,
    });
  }

  if (commitRequested && appliedBy.length === 0) {
    return buildNonWritingResult({
      result: "bad_request",
      mode: "dry_run",
      preview: null,
      proposal: null,
      blockedReasons: ["applied_by_required"],
      error: "appliedBy is required when commit is requested",
      commitRequested,
    });
  }

  const preview = await previewWithReadOnlyBoundary(proposalId);
  const previewResult = previewResultName(preview);

  if (previewResult === "bad_request") {
    return buildNonWritingResult({
      result: "bad_request",
      mode: "dry_run",
      preview,
      proposal: null,
      blockedReasons: ["preview_bad_request"],
      error: "Day33 preview rejected the proposal id",
      commitRequested,
    });
  }

  if (previewResult === "not_found") {
    return buildNonWritingResult({
      result: "not_found",
      mode: "dry_run",
      preview,
      proposal: null,
      blockedReasons: ["preview_not_found"],
      error: "proposal was not found by Day33 preview",
      commitRequested,
    });
  }

  if (previewResult !== "preview") {
    return buildNonWritingResult({
      result: "blocked",
      mode: "dry_run",
      preview,
      proposal: null,
      blockedReasons: ["preview_not_preview"],
      error: "Day33 preview did not return a preview result",
      commitRequested,
    });
  }

  const operation = extractPreviewOperation(preview);
  const candidate = extractPreviewCandidate(preview);

  if (operation !== "insert_candidate" && operation !== "no_op_candidate") {
    return buildNonWritingResult({
      result: "blocked",
      mode: "dry_run",
      preview,
      proposal: null,
      blockedReasons: ["unsupported_preview_operation"],
      error: "Day34 only supports insert_candidate and no_op_candidate",
      commitRequested,
    });
  }

  if (!candidate) {
    return buildNonWritingResult({
      result: "blocked",
      mode: "dry_run",
      preview,
      proposal: null,
      blockedReasons: ["candidate_missing"],
      error: "candidate is missing from Day33 preview",
      commitRequested,
    });
  }

  if (!candidateRequiredFieldsPresent(candidate)) {
    return buildNonWritingResult({
      result: "blocked",
      mode: "dry_run",
      preview,
      proposal: null,
      blockedReasons: ["candidate_required_fields_missing"],
      error: "candidate required fields are missing",
      commitRequested,
    });
  }

  const client = createClient();
  await client.connect();

  try {
    await client.query(commitRequested ? "begin" : "begin transaction read only");
    const boundaryRow = await readBoundaryRow(client);
    const proposal = await readProposal(client, proposalId);

    if (!proposal) {
      await client.query("rollback");
      return {
        result: "not_found",
        mode: "dry_run",
        error: "proposal disappeared before apply command recheck",
        blocked_reasons: ["proposal_not_found"],
        proposal: null,
        preview,
        apply: emptyApply(),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: !commitRequested,
          commitRequested,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    if (proposal.applied_by !== null || proposal.applied_at !== null) {
      await client.query("rollback");
      return {
        result: "blocked",
        mode: "dry_run",
        error: "proposal is already marked applied",
        blocked_reasons: ["proposal_already_applied"],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: !commitRequested,
          commitRequested,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    if (!targetIsAppCropCycles(proposal.payload_json ?? {})) {
      await client.query("rollback");
      return {
        result: "blocked",
        mode: "dry_run",
        error: "proposal target is not app.crop_cycles",
        blocked_reasons: ["target_not_app_crop_cycles"],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: !commitRequested,
          commitRequested,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    const sourceApplyPlanId = positiveIntegerOrNull(
      proposal.payload_json?.source_apply_plan_id,
    );

    if (operation === "insert_candidate" && sourceApplyPlanId === null) {
      await client.query("rollback");
      return {
        result: "blocked",
        mode: "dry_run",
        error: "source_apply_plan_id is required for insert_candidate apply",
        blocked_reasons: ["source_apply_plan_id_missing"],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: !commitRequested,
          commitRequested,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    const exactMatches = await readExactMatches(client, candidate);

    if (operation === "insert_candidate" && exactMatches.length > 0) {
      await client.query("rollback");
      return {
        result: "blocked",
        mode: "dry_run",
        error: "insert candidate became an exact app.crop_cycles match before commit",
        blocked_reasons: ["duplicate_insert_target_found"],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: !commitRequested,
          commitRequested,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    if (operation === "no_op_candidate" && exactMatches.length === 0) {
      await client.query("rollback");
      return {
        result: "blocked",
        mode: "dry_run",
        error: "no-op candidate no longer has an exact app.crop_cycles match",
        blocked_reasons: ["no_op_target_not_found"],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: !commitRequested,
          commitRequested,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    if (!commitRequested) {
      await client.query("rollback");
      return {
        result: "ok",
        mode: "dry_run",
        blocked_reasons: [],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(operation === "insert_candidate" ? "insert" : "no_op"),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: true,
          commitRequested: false,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    let insertedCropCycleId: number | null = null;
    let rowsInserted = 0;

    if (operation === "insert_candidate") {
      const insertSourceApplyPlanId = sourceApplyPlanId;

      if (insertSourceApplyPlanId === null) {
        throw new Error("source_apply_plan_id unexpectedly missing after validation");
      }

      insertedCropCycleId = await insertCropCycle({
        client,
        candidate,
        createdBy: appliedBy,
        createdByRole: input.appliedByRole ?? "owner",
        sourceApplyPlanId: insertSourceApplyPlanId,
      });
      rowsInserted = 1;
    }

    const updatedProposal = await updateApplyMarker({
      client,
      proposalId,
      appliedBy,
    });

    if (!updatedProposal) {
      await client.query("rollback");
      return {
        result: "blocked",
        mode: "dry_run",
        error: "proposal apply marker was not updateable",
        blocked_reasons: ["proposal_apply_marker_not_updateable"],
        proposal: proposalForResult(proposal),
        preview,
        apply: emptyApply(operation === "insert_candidate" ? "insert" : "no_op"),
        boundary: buildBoundary({
          row: boundaryRow,
          dryRun: false,
          commitRequested: true,
          writesPerformed: false,
          appSchemaWritesPerformed: false,
          appCropCyclesInsertPerformed: false,
          aiProposalApplyMarkerUpdated: false,
          appProjectionApplyPerformed: false,
          commandsExecuted: false,
        }),
      };
    }

    await client.query("commit");

    return {
      result: "ok",
      mode: "committed",
      blocked_reasons: [],
      proposal: proposalForResult(updatedProposal),
      preview,
      apply: {
        operation: operation === "insert_candidate" ? "insert" : "no_op",
        inserted_crop_cycle_id: insertedCropCycleId,
        app_crop_cycles_rows_inserted: rowsInserted,
        app_crop_cycles_rows_updated: 0,
        ai_proposal_apply_marker_updated: true,
        ai_proposal_rows_updated: 1,
      },
      boundary: buildBoundary({
        row: boundaryRow,
        dryRun: false,
        commitRequested: true,
        writesPerformed: true,
        appSchemaWritesPerformed: rowsInserted > 0,
        appCropCyclesInsertPerformed: rowsInserted > 0,
        aiProposalApplyMarkerUpdated: true,
        appProjectionApplyPerformed: true,
        commandsExecuted: true,
      }),
    };
  } catch (error) {
    await rollbackQuietly(client);
    return {
      result: "error",
      mode: "dry_run",
      error: error instanceof Error ? error.message : String(error),
      blocked_reasons: ["unexpected_error"],
      proposal: null,
      preview,
      apply: emptyApply(),
      boundary: buildBoundary({
        row: null,
        dryRun: !commitRequested,
        commitRequested,
        writesPerformed: false,
        appSchemaWritesPerformed: false,
        appCropCyclesInsertPerformed: false,
        aiProposalApplyMarkerUpdated: false,
        appProjectionApplyPerformed: false,
        commandsExecuted: false,
      }),
    };
  } finally {
    await client.end();
  }
}
