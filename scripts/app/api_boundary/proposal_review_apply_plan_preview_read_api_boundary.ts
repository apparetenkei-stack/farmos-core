import { Client } from "pg";

import { checkProposalReviewApplyReadiness } from "./proposal_review_apply_readiness_read_api_boundary";

export type ProposalReviewApplyPlanPreviewInput = {
  proposalId: string;
};

export type ProposalReviewApplyPlanPreviewBlockedReason =
  | "readiness_not_ready"
  | "target_not_app_crop_cycles"
  | "candidate_missing"
  | "candidate_required_fields_missing"
  | "unsupported_operation";

export type ProposalReviewApplyPlanPreviewOperation =
  | "insert_candidate"
  | "update_candidate"
  | "no_op_candidate"
  | "blocked";

export type ProposalReviewApplyPlanPreviewCandidate = {
  crop: string | null;
  variety: string | null;
  field_name: string | null;
  sowing_date_text: string | null;
  transplant_date_text: string | null;
};

export type ProposalReviewApplyPlanPreviewExistingCropCycle = {
  id: number;
  crop: string;
  variety: string | null;
  field_name: string | null;
  sowing_date_text: string | null;
  transplant_date_text: string | null;
  archived: boolean;
};

export type ProposalReviewApplyPlanPreviewProposal = {
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
};

export type ProposalReviewApplyPlanPreviewBoundary = {
  mode: "proposal_review_apply_plan_preview_read_boundary";
  db_user: string;
  transaction_read_only: true;
  writes_performed: false;
  commands_executed: false;
  preview_only: true;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: boolean;
  audit_event_write_allowed: boolean;
  app_projection_apply_performed: false;
  ai_proposal_apply_marker_updated: false;
};

export type ProposalReviewApplyPlanPreviewResult =
  | {
      result: "preview";
      proposal: ProposalReviewApplyPlanPreviewProposal;
      readiness: {
        result: "ready";
        ready: true;
        blocked_reasons: string[];
      };
      preview: {
        preview_only: true;
        target_schema: string;
        target_table: string;
        operation: ProposalReviewApplyPlanPreviewOperation;
        candidate: ProposalReviewApplyPlanPreviewCandidate;
        matched_existing_rows: ProposalReviewApplyPlanPreviewExistingCropCycle[];
        diff: {
          fields_compared: string[];
          changed_fields: Array<{
            field: keyof ProposalReviewApplyPlanPreviewCandidate;
            before: string | null;
            after: string | null;
          }>;
        };
        blocked_reasons: ProposalReviewApplyPlanPreviewBlockedReason[];
        sql_preview: {
          would_insert: boolean;
          would_update: boolean;
          would_touch_app_schema: false;
          would_touch_ai_proposal_apply_marker: false;
        };
      };
      boundary: ProposalReviewApplyPlanPreviewBoundary;
    }
  | {
      result: "blocked";
      proposal: ProposalReviewApplyPlanPreviewProposal | null;
      readiness: {
        result: "blocked" | "not_found" | "bad_request" | "error";
        ready: false;
        blocked_reasons: string[];
      };
      preview: {
        preview_only: true;
        target_schema: string | null;
        target_table: string | null;
        operation: "blocked";
        candidate: ProposalReviewApplyPlanPreviewCandidate | null;
        matched_existing_rows: ProposalReviewApplyPlanPreviewExistingCropCycle[];
        diff: {
          fields_compared: string[];
          changed_fields: Array<{
            field: keyof ProposalReviewApplyPlanPreviewCandidate;
            before: string | null;
            after: string | null;
          }>;
        };
        blocked_reasons: ProposalReviewApplyPlanPreviewBlockedReason[];
        sql_preview: {
          would_insert: false;
          would_update: false;
          would_touch_app_schema: false;
          would_touch_ai_proposal_apply_marker: false;
        };
      };
      boundary: ProposalReviewApplyPlanPreviewBoundary;
    }
  | {
      result: "bad_request";
      error: string;
    }
  | {
      result: "not_found";
      boundary: ProposalReviewApplyPlanPreviewBoundary;
    }
  | {
      result: "error";
      error: string;
    };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fieldsCompared: Array<keyof ProposalReviewApplyPlanPreviewCandidate> = [
  "crop",
  "variety",
  "field_name",
  "sowing_date_text",
  "transplant_date_text",
];

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      process.env.FARMOS_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function extractCandidate(
  payload: Record<string, unknown>,
): ProposalReviewApplyPlanPreviewCandidate | null {
  if (!isRecord(payload.candidate)) {
    return null;
  }

  return {
    crop: textOrNull(payload.candidate.crop),
    variety: textOrNull(payload.candidate.variety),
    field_name: textOrNull(payload.candidate.field_name),
    sowing_date_text: textOrNull(payload.candidate.sowing_date_text),
    transplant_date_text: textOrNull(payload.candidate.transplant_date_text),
  };
}

function candidateRequiredFieldsPresent(
  candidate: ProposalReviewApplyPlanPreviewCandidate,
): boolean {
  return Boolean(candidate.crop);
}

function normalizePayload(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function mapProposal(row: Record<string, unknown>): ProposalReviewApplyPlanPreviewProposal {
  return {
    id: String(row.id),
    proposal_type: String(row.proposal_type),
    title: String(row.title),
    status: String(row.status),
    reviewed_by: row.reviewed_by === null ? null : String(row.reviewed_by),
    reviewed_at: row.reviewed_at === null ? null : String(row.reviewed_at),
    review_note: row.review_note === null ? null : String(row.review_note),
    applied_by: row.applied_by === null ? null : String(row.applied_by),
    applied_at: row.applied_at === null ? null : String(row.applied_at),
    payload_json: normalizePayload(row.payload_json),
  };
}

function mapCropCycle(
  row: Record<string, unknown>,
): ProposalReviewApplyPlanPreviewExistingCropCycle {
  return {
    id: Number(row.id),
    crop: String(row.crop),
    variety: row.variety === null ? null : String(row.variety),
    field_name: row.field_name === null ? null : String(row.field_name),
    sowing_date_text:
      row.sowing_date_text === null ? null : String(row.sowing_date_text),
    transplant_date_text:
      row.transplant_date_text === null
        ? null
        : String(row.transplant_date_text),
    archived: Boolean(row.archived),
  };
}

function buildDiff(
  before: ProposalReviewApplyPlanPreviewExistingCropCycle | null,
  after: ProposalReviewApplyPlanPreviewCandidate,
): Array<{
  field: keyof ProposalReviewApplyPlanPreviewCandidate;
  before: string | null;
  after: string | null;
}> {
  return fieldsCompared
    .map((field) => ({
      field,
      before: before ? before[field] : null,
      after: after[field],
    }))
    .filter((item) => item.before !== item.after);
}

function buildBoundary(row: Record<string, unknown>): ProposalReviewApplyPlanPreviewBoundary {
  return {
    mode: "proposal_review_apply_plan_preview_read_boundary",
    db_user: String(row.db_user),
    transaction_read_only: true,
    writes_performed: false,
    commands_executed: false,
    preview_only: true,
    app_schema_write_allowed: false,
    ai_proposal_write_allowed: Boolean(row.ai_proposal_write_allowed),
    audit_event_write_allowed: Boolean(row.audit_event_write_allowed),
    app_projection_apply_performed: false,
    ai_proposal_apply_marker_updated: false,
  };
}

async function readBoundary(client: Client): Promise<ProposalReviewApplyPlanPreviewBoundary> {
  const result = await client.query<Record<string, unknown>>(`
    select
      current_user as db_user,
      current_setting('transaction_read_only') = 'on' as transaction_read_only,
      has_table_privilege(current_user, 'app.crop_cycles', 'INSERT')
        or has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE')
        or has_table_privilege(current_user, 'app.crop_cycles', 'DELETE')
        or has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE')
        as app_schema_write_allowed,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE')
        or has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE')
        as ai_proposal_write_allowed,
      has_table_privilege(current_user, 'audit.proposal_review_decision_events', 'INSERT')
        as audit_event_write_allowed
  `);

  const boundary = buildBoundary(result.rows[0]);

  if (result.rows[0].transaction_read_only !== true) {
    throw new Error("Day33 preview boundary must run in a read-only transaction.");
  }

  if (result.rows[0].app_schema_write_allowed === true) {
    throw new Error("Day33 preview boundary must not allow app schema writes.");
  }

  return boundary;
}

async function readProposal(
  client: Client,
  proposalId: string,
): Promise<ProposalReviewApplyPlanPreviewProposal | null> {
  const result = await client.query<Record<string, unknown>>(
    `
      select
        id,
        proposal_type,
        title,
        status,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_by,
        applied_at,
        payload_json
      from ai.proposal_inbox
      where id = $1
    `,
    [proposalId],
  );

  return result.rows[0] ? mapProposal(result.rows[0]) : null;
}

async function readExactMatches(
  client: Client,
  candidate: ProposalReviewApplyPlanPreviewCandidate,
): Promise<ProposalReviewApplyPlanPreviewExistingCropCycle[]> {
  const result = await client.query<Record<string, unknown>>(
    `
      select
        id,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        archived
      from app.crop_cycles
      where archived = false
        and crop is not distinct from $1
        and variety is not distinct from $2
        and field_name is not distinct from $3
        and sowing_date_text is not distinct from $4
        and transplant_date_text is not distinct from $5
      order by id
    `,
    [
      candidate.crop,
      candidate.variety,
      candidate.field_name,
      candidate.sowing_date_text,
      candidate.transplant_date_text,
    ],
  );

  return result.rows.map(mapCropCycle);
}

async function readUpdateCandidates(
  client: Client,
  candidate: ProposalReviewApplyPlanPreviewCandidate,
): Promise<ProposalReviewApplyPlanPreviewExistingCropCycle[]> {
  const result = await client.query<Record<string, unknown>>(
    `
      select
        id,
        crop,
        variety,
        field_name,
        sowing_date_text,
        transplant_date_text,
        archived
      from app.crop_cycles
      where archived = false
        and crop is not distinct from $1
        and variety is not distinct from $2
        and field_name is not distinct from $3
      order by id
    `,
    [candidate.crop, candidate.variety, candidate.field_name],
  );

  return result.rows.map(mapCropCycle);
}

function blockedPreview(args: {
  proposal: ProposalReviewApplyPlanPreviewProposal | null;
  readinessResult: "blocked" | "not_found" | "bad_request" | "error";
  readinessBlockedReasons: string[];
  targetSchema: string | null;
  targetTable: string | null;
  candidate: ProposalReviewApplyPlanPreviewCandidate | null;
  boundary: ProposalReviewApplyPlanPreviewBoundary;
  blockedReasons: ProposalReviewApplyPlanPreviewBlockedReason[];
}): Extract<ProposalReviewApplyPlanPreviewResult, { result: "blocked" }> {
  return {
    result: "blocked",
    proposal: args.proposal,
    readiness: {
      result: args.readinessResult,
      ready: false,
      blocked_reasons: args.readinessBlockedReasons,
    },
    preview: {
      preview_only: true,
      target_schema: args.targetSchema,
      target_table: args.targetTable,
      operation: "blocked",
      candidate: args.candidate,
      matched_existing_rows: [],
      diff: {
        fields_compared: fieldsCompared,
        changed_fields: [],
      },
      blocked_reasons: args.blockedReasons,
      sql_preview: {
        would_insert: false,
        would_update: false,
        would_touch_app_schema: false,
        would_touch_ai_proposal_apply_marker: false,
      },
    },
    boundary: args.boundary,
  };
}

export async function previewProposalReviewApplyPlan(
  input: ProposalReviewApplyPlanPreviewInput,
): Promise<ProposalReviewApplyPlanPreviewResult> {
  if (!input.proposalId || !uuidPattern.test(input.proposalId)) {
    return {
      result: "bad_request",
      error: "proposalId must be a valid UUID.",
    };
  }

  const readiness = await checkProposalReviewApplyReadiness({
    proposalId: input.proposalId,
  });

  const client = createClient();

  try {
    await client.connect();
    await client.query("begin transaction read only");

    const boundary = await readBoundary(client);
    const proposal = await readProposal(client, input.proposalId);

    if (readiness.result === "not_found") {
      await client.query("commit");

      return {
        result: "not_found",
        boundary,
      };
    }

    if (!proposal) {
      await client.query("commit");

      return {
        result: "not_found",
        boundary,
      };
    }

    const targetSchema = textOrNull(proposal.payload_json.target_schema);
    const targetTable = textOrNull(proposal.payload_json.target_table);
    const candidate = extractCandidate(proposal.payload_json);

    if (readiness.result !== "ready") {
      const readinessBlockedReasons =
        readiness.result === "blocked"
          ? readiness.readiness.blocked_reasons
          : [readiness.result];

      await client.query("commit");

      return blockedPreview({
        proposal,
        readinessResult:
          readiness.result === "blocked" ? "blocked" : readiness.result,
        readinessBlockedReasons,
        targetSchema,
        targetTable,
        candidate,
        boundary,
        blockedReasons: ["readiness_not_ready"],
      });
    }

    const blockedReasons: ProposalReviewApplyPlanPreviewBlockedReason[] = [];

    if (targetSchema !== "app" || targetTable !== "crop_cycles") {
      blockedReasons.push("target_not_app_crop_cycles");
    }

    if (!candidate) {
      blockedReasons.push("candidate_missing");
    } else if (!candidateRequiredFieldsPresent(candidate)) {
      blockedReasons.push("candidate_required_fields_missing");
    }

    if (blockedReasons.length > 0 || !candidate) {
      await client.query("commit");

      return blockedPreview({
        proposal,
        readinessResult: "blocked",
        readinessBlockedReasons: [],
        targetSchema,
        targetTable,
        candidate,
        boundary,
        blockedReasons,
      });
    }

    const exactMatches = await readExactMatches(client, candidate);
    const updateCandidates =
      exactMatches.length > 0 ? [] : await readUpdateCandidates(client, candidate);

    const operation: ProposalReviewApplyPlanPreviewOperation =
      exactMatches.length > 0
        ? "no_op_candidate"
        : updateCandidates.length > 0
          ? "update_candidate"
          : "insert_candidate";

    const matchedExistingRows =
      exactMatches.length > 0 ? exactMatches : updateCandidates.slice(0, 1);

    const diff =
      operation === "no_op_candidate"
        ? []
        : buildDiff(matchedExistingRows[0] ?? null, candidate);

    await client.query("commit");

    return {
      result: "preview",
      proposal,
      readiness: {
        result: "ready",
        ready: true,
        blocked_reasons: [],
      },
      preview: {
        preview_only: true,
        target_schema: targetSchema ?? "",
        target_table: targetTable ?? "",
        operation,
        candidate,
        matched_existing_rows: matchedExistingRows,
        diff: {
          fields_compared: fieldsCompared,
          changed_fields: diff,
        },
        blocked_reasons: [],
        sql_preview: {
          would_insert: operation === "insert_candidate",
          would_update: operation === "update_candidate",
          would_touch_app_schema: false,
          would_touch_ai_proposal_apply_marker: false,
        },
      },
      boundary,
    };
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // ignore rollback errors
    }

    return {
      result: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end();
  }
}
