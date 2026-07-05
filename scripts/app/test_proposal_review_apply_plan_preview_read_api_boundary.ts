import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { Client } from "pg";

import { previewProposalReviewApplyPlan } from "./api_boundary/proposal_review_apply_plan_preview_read_api_boundary";
import { checkProposalReviewApplyReadiness } from "./api_boundary/proposal_review_apply_readiness_read_api_boundary";
import { appendProposalReviewDecisionAuditEventCommand } from "./api_boundary/proposal_review_decision_audit_append_command_boundary";
import { transitionProposalReviewStatusCommand } from "./api_boundary/proposal_review_status_transition_command_boundary";

const existingTargetProposalId = "24fc24ee-8efa-436b-8424-9703edeeb297";

type ProposalSnapshot = {
  id: string;
  proposal_type: string;
  title: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  applied_by: string | null;
  applied_at: string | null;
};

type CliPreviewResult = {
  result: "preview" | "blocked" | "not_found" | "bad_request" | "error";
  readiness?: {
    ready: boolean;
    blocked_reasons: string[];
  };
  preview?: {
    preview_only: boolean;
    operation: string;
    blocked_reasons: string[];
    sql_preview: {
      would_insert: boolean;
      would_update: boolean;
      would_touch_app_schema: boolean;
      would_touch_ai_proposal_apply_marker: boolean;
    };
  };
  boundary?: {
    transaction_read_only: boolean;
    writes_performed: boolean;
    commands_executed: boolean;
    preview_only: boolean;
    app_schema_write_allowed: boolean;
    app_projection_apply_performed: boolean;
    ai_proposal_apply_marker_updated: boolean;
  };
  error?: string;
};

function createClient(): Client {
  return new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      process.env.FARMOS_DB_USER,
    password: process.env.PGPASSWORD ?? process.env.FARMOS_APP_DB_PASSWORD,
  });
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = createClient();
  await client.connect();

  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function runAdminSql(sql: string): void {
  execFileSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      process.env.FARMOS_DB_USER ?? "farmos_local_admin",
      "-d",
      process.env.FARMOS_DB_NAME ?? "farmos_core_local",
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function createProposalFixture(args: {
  proposalId: string;
  title: string;
  status: "pending" | "approved";
  payload: Record<string, unknown>;
  reviewNote: string;
  appliedBy?: string | null;
  appliedAtNow?: boolean;
}): void {
  const payloadJson = JSON.stringify(args.payload);
  const appliedBy = args.appliedBy ?? null;
  const appliedAtNow = args.appliedAtNow === true;

  runAdminSql(`
    do $$
    declare
      target_id uuid := ${sqlLiteral(args.proposalId)}::uuid;
      base_id uuid := ${sqlLiteral(existingTargetProposalId)}::uuid;
      target_proposal_type text := 'day33_apply_plan_preview_test';
      target_title text := ${sqlLiteral(args.title)};
      target_status text := ${sqlLiteral(args.status)};
      target_payload jsonb := ${sqlLiteral(payloadJson)}::jsonb;
      target_reviewed_by text := ${
        args.status === "approved" ? "'hayate'" : "null"
      };
      target_review_note text := ${sqlLiteral(args.reviewNote)};
      target_applied_by text := ${
        appliedBy ? sqlLiteral(appliedBy) : "null"
      };
      target_applied_at timestamptz := ${
        appliedAtNow ? "now()" : "null"
      };
    begin
      if exists (
        select 1
        from ai.proposal_inbox
        where id = target_id
      ) then
        raise exception 'fixture proposal already exists: %', target_id;
      end if;

      insert into ai.proposal_inbox (
        id,
        proposal_type,
        title,
        body,
        payload_json,
        source_refs_json,
        model_name,
        agent_name,
        confidence,
        reason,
        risk_level,
        status,
        reviewed_by,
        reviewed_at,
        review_note,
        applied_at,
        applied_by,
        created_at,
        updated_at
      )
      select
        target_id,
        target_proposal_type,
        target_title,
        base.body,
        target_payload,
        base.source_refs_json,
        base.model_name,
        base.agent_name,
        base.confidence,
        base.reason,
        base.risk_level,
        target_status,
        target_reviewed_by,
        case when target_status = 'approved' then now() else null end,
        case when target_status = 'approved' then target_review_note else null end,
        target_applied_at,
        target_applied_by,
        now(),
        now()
      from ai.proposal_inbox base
      where base.id = base_id;

      if not found then
        raise exception 'base proposal not found: %', base_id;
      end if;
    end $$;
  `);
}

async function appendApproveDecision(proposalId: string): Promise<string> {
  const appendResult = await appendProposalReviewDecisionAuditEventCommand({
    input: {
      proposalId,
      decisionType: "approve_review",
      decisionNote:
        "Day33 fixture approve review event. Audit event only; apply plan preview remains read-only.",
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli",
    },
    commit: true,
  });

  assert.equal(appendResult.result, "ok");

  if (appendResult.result !== "ok") {
    throw new Error("append result was not ok");
  }

  assert.equal(appendResult.mode, "committed");
  assert.ok(appendResult.appended_event);
  assert.equal(appendResult.appended_event.proposal_id, proposalId);
  assert.equal(appendResult.appended_event.decision_type, "approve_review");

  return appendResult.appended_event.id;
}

async function transitionToApproved(
  proposalId: string,
  decisionEventId: string,
): Promise<void> {
  const transitionResult = await transitionProposalReviewStatusCommand({
    input: {
      proposalId,
      decisionEventId,
      transitionedBy: "hayate",
      transitionedByRole: "owner",
      transitionSource: "local_cli",
      transitionNote:
        "Day33 fixture transition to approved. Proposal status only; no app projection apply.",
    },
    commit: true,
  });

  assert.equal(transitionResult.result, "ok");

  if (transitionResult.result !== "ok") {
    throw new Error("transition result was not ok");
  }

  assert.equal(transitionResult.mode, "committed");
  assert.equal(transitionResult.proposal_after?.status, "approved");
  assert.equal(transitionResult.boundary.app_schema_writes_performed, false);
  assert.equal(transitionResult.boundary.app_projection_apply_performed, false);
}

async function readProposalSnapshot(
  proposalId: string,
): Promise<ProposalSnapshot> {
  return await withClient(async (client) => {
    const result = await client.query<ProposalSnapshot>(
      `
        select
          id,
          proposal_type,
          title,
          status,
          reviewed_by,
          reviewed_at::text as reviewed_at,
          review_note,
          applied_by,
          applied_at::text as applied_at
        from ai.proposal_inbox
        where id = $1
      `,
      [proposalId],
    );

    assert.equal(result.rowCount, 1);

    return result.rows[0];
  });
}

async function readCropCyclesSnapshot(): Promise<string> {
  return await withClient(async (client) => {
    const result = await client.query<{ snapshot: string }>(`
      select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb)::text as snapshot
      from (
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
        order by id
      ) as t
    `);

    return result.rows[0].snapshot;
  });
}

function parseJsonFromCliOutput(output: string): CliPreviewResult {
  const jsonStart = output.indexOf("{");

  if (jsonStart === -1) {
    throw new Error(`CLI output did not contain JSON: ${output}`);
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = jsonStart; index < output.length; index += 1) {
    const char = output[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return JSON.parse(output.slice(jsonStart, index + 1)) as CliPreviewResult;
      }
    }
  }

  throw new Error(`CLI output did not contain a complete JSON object: ${output}`);
}

function runCli(proposalId: string): CliPreviewResult {
  const output = execFileSync(
    "pnpm",
    [
      "run",
      "preview-proposal-review-apply-plan",
      "--",
      "--proposal-id",
      proposalId,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return parseJsonFromCliOutput(output);
}

function runCliCommitRejected(proposalId: string): CliPreviewResult {
  try {
    execFileSync(
      "pnpm",
      [
        "run",
        "preview-proposal-review-apply-plan",
        "--",
        "--proposal-id",
        proposalId,
        "--commit",
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const stdout =
      typeof error === "object" &&
      error !== null &&
      "stdout" in error &&
      typeof error.stdout === "string"
        ? error.stdout
        : "";

    return parseJsonFromCliOutput(stdout);
  }

  throw new Error("CLI --commit unexpectedly succeeded.");
}

function basePayload(candidate: Record<string, unknown>): Record<string, unknown> {
  return {
    day: 33,
    fixture: true,
    apply_intent: "future_crop_cycle_projection_apply",
    target_schema: "app",
    target_table: "crop_cycles",
    candidate,
  };
}

async function main() {
  const existingBefore = await readProposalSnapshot(existingTargetProposalId);
  const beforeCropCyclesSnapshot = await readCropCyclesSnapshot();

  assert.equal(existingBefore.status, "pending");
  assert.equal(existingBefore.reviewed_by, null);
  assert.equal(existingBefore.reviewed_at, null);
  assert.equal(existingBefore.review_note, null);
  assert.equal(existingBefore.applied_by, null);
  assert.equal(existingBefore.applied_at, null);

  const noOpProposalId = randomUUID();
  createProposalFixture({
    proposalId: noOpProposalId,
    title: "Day33 no-op apply plan preview fixture",
    status: "pending",
    reviewNote:
      "Day33 no-op fixture setup. Proposal status only; no app projection apply.",
    payload: basePayload({
      crop: "ブロッコリー",
      variety: "ピクセル",
      field_name: "A圃場",
      sowing_date_text: "9/20",
      transplant_date_text: "11/15",
    }),
  });

  const noOpDecisionEventId = await appendApproveDecision(noOpProposalId);
  await transitionToApproved(noOpProposalId, noOpDecisionEventId);

  const noOpReadiness = await checkProposalReviewApplyReadiness({
    proposalId: noOpProposalId,
  });

  assert.equal(noOpReadiness.result, "ready");

  const noOpPreview = await previewProposalReviewApplyPlan({
    proposalId: noOpProposalId,
  });

  assert.equal(noOpPreview.result, "preview");

  if (noOpPreview.result !== "preview") {
    throw new Error("no-op preview was not preview");
  }

  assert.equal(noOpPreview.readiness.ready, true);
  assert.deepEqual(noOpPreview.readiness.blocked_reasons, []);
  assert.equal(noOpPreview.preview.preview_only, true);
  assert.equal(noOpPreview.preview.operation, "no_op_candidate");
  assert.equal(noOpPreview.preview.sql_preview.would_insert, false);
  assert.equal(noOpPreview.preview.sql_preview.would_update, false);
  assert.equal(noOpPreview.preview.sql_preview.would_touch_app_schema, false);
  assert.equal(
    noOpPreview.preview.sql_preview.would_touch_ai_proposal_apply_marker,
    false,
  );
  assert.equal(noOpPreview.preview.matched_existing_rows.length, 1);
  assert.equal(noOpPreview.preview.matched_existing_rows[0].id, 2);
  assert.deepEqual(noOpPreview.preview.diff.changed_fields, []);
  assert.equal(noOpPreview.boundary.transaction_read_only, true);
  assert.equal(noOpPreview.boundary.writes_performed, false);
  assert.equal(noOpPreview.boundary.commands_executed, false);
  assert.equal(noOpPreview.boundary.preview_only, true);
  assert.equal(noOpPreview.boundary.app_schema_write_allowed, false);
  assert.equal(noOpPreview.boundary.app_projection_apply_performed, false);
  assert.equal(noOpPreview.boundary.ai_proposal_apply_marker_updated, false);

  const insertProposalId = randomUUID();
  createProposalFixture({
    proposalId: insertProposalId,
    title: "Day33 insert apply plan preview fixture",
    status: "pending",
    reviewNote:
      "Day33 insert fixture setup. Proposal status only; no app projection apply.",
    payload: basePayload({
      crop: "ブロッコリー",
      variety: "ピクセル",
      field_name: `Day33 Preview Test 圃場 ${insertProposalId.slice(0, 8)}`,
      sowing_date_text: "9/21",
      transplant_date_text: "11/16",
    }),
  });

  const insertDecisionEventId = await appendApproveDecision(insertProposalId);
  await transitionToApproved(insertProposalId, insertDecisionEventId);

  const insertReadiness = await checkProposalReviewApplyReadiness({
    proposalId: insertProposalId,
  });

  assert.equal(insertReadiness.result, "ready");

  const insertPreview = await previewProposalReviewApplyPlan({
    proposalId: insertProposalId,
  });

  assert.equal(insertPreview.result, "preview");

  if (insertPreview.result !== "preview") {
    throw new Error("insert preview was not preview");
  }

  assert.equal(insertPreview.preview.preview_only, true);
  assert.equal(insertPreview.preview.operation, "insert_candidate");
  assert.equal(insertPreview.preview.matched_existing_rows.length, 0);
  assert.ok(insertPreview.preview.diff.changed_fields.length > 0);
  assert.equal(insertPreview.preview.sql_preview.would_insert, true);
  assert.equal(insertPreview.preview.sql_preview.would_update, false);
  assert.equal(insertPreview.preview.sql_preview.would_touch_app_schema, false);
  assert.equal(
    insertPreview.preview.sql_preview.would_touch_ai_proposal_apply_marker,
    false,
  );
  assert.equal(insertPreview.boundary.transaction_read_only, true);
  assert.equal(insertPreview.boundary.writes_performed, false);
  assert.equal(insertPreview.boundary.commands_executed, false);
  assert.equal(insertPreview.boundary.preview_only, true);
  assert.equal(insertPreview.boundary.app_schema_write_allowed, false);
  assert.equal(insertPreview.boundary.app_projection_apply_performed, false);
  assert.equal(insertPreview.boundary.ai_proposal_apply_marker_updated, false);

  const pendingPreview = await previewProposalReviewApplyPlan({
    proposalId: existingTargetProposalId,
  });

  assert.equal(pendingPreview.result, "blocked");

  if (pendingPreview.result !== "blocked") {
    throw new Error("pending preview was not blocked");
  }

  assert.equal(pendingPreview.readiness.ready, false);
  assert.ok(
    pendingPreview.readiness.blocked_reasons.includes("proposal_not_approved"),
  );
  assert.ok(
    pendingPreview.preview.blocked_reasons.includes("readiness_not_ready"),
  );
  assert.equal(pendingPreview.preview.operation, "blocked");
  assert.equal(pendingPreview.boundary.transaction_read_only, true);
  assert.equal(pendingPreview.boundary.writes_performed, false);
  assert.equal(pendingPreview.boundary.commands_executed, false);
  assert.equal(pendingPreview.boundary.preview_only, true);
  assert.equal(pendingPreview.boundary.app_schema_write_allowed, false);
  assert.equal(pendingPreview.boundary.app_projection_apply_performed, false);
  assert.equal(
    pendingPreview.boundary.ai_proposal_apply_marker_updated,
    false,
  );

  const noLatestProposalId = randomUUID();
  createProposalFixture({
    proposalId: noLatestProposalId,
    title: "Day33 approved proposal without latest review decision fixture",
    status: "approved",
    reviewNote:
      "Day33 no-latest fixture setup only. Approved directly without audit event.",
    payload: basePayload({
      crop: "ブロッコリー",
      variety: "ピクセル",
      field_name: "A圃場",
      sowing_date_text: "9/20",
      transplant_date_text: "11/15",
    }),
  });

  const noLatestPreview = await previewProposalReviewApplyPlan({
    proposalId: noLatestProposalId,
  });

  assert.equal(noLatestPreview.result, "blocked");

  if (noLatestPreview.result !== "blocked") {
    throw new Error("no-latest preview was not blocked");
  }

  assert.ok(
    noLatestPreview.preview.blocked_reasons.includes("readiness_not_ready"),
  );
  assert.equal(noLatestPreview.boundary.transaction_read_only, true);
  assert.equal(noLatestPreview.boundary.writes_performed, false);
  assert.equal(noLatestPreview.boundary.commands_executed, false);

  const alreadyAppliedProposalId = randomUUID();
  createProposalFixture({
    proposalId: alreadyAppliedProposalId,
    title: "Day33 already applied proposal fixture",
    status: "approved",
    reviewNote:
      "Day33 already-applied fixture setup only. Applied markers are fixture-only.",
    appliedBy: "local-admin-fixture",
    appliedAtNow: true,
    payload: basePayload({
      crop: "ブロッコリー",
      variety: "ピクセル",
      field_name: "A圃場",
      sowing_date_text: "9/20",
      transplant_date_text: "11/15",
    }),
  });

  const alreadyAppliedPreview = await previewProposalReviewApplyPlan({
    proposalId: alreadyAppliedProposalId,
  });

  assert.equal(alreadyAppliedPreview.result, "blocked");

  if (alreadyAppliedPreview.result !== "blocked") {
    throw new Error("already-applied preview was not blocked");
  }

  assert.ok(
    alreadyAppliedPreview.preview.blocked_reasons.includes(
      "readiness_not_ready",
    ),
  );
  assert.equal(alreadyAppliedPreview.boundary.transaction_read_only, true);
  assert.equal(alreadyAppliedPreview.boundary.writes_performed, false);
  assert.equal(alreadyAppliedPreview.boundary.commands_executed, false);

  const badRequestResult = await previewProposalReviewApplyPlan({
    proposalId: "not-a-uuid",
  });

  assert.equal(badRequestResult.result, "bad_request");

  const missingResult = await previewProposalReviewApplyPlan({
    proposalId: randomUUID(),
  });

  assert.equal(missingResult.result, "not_found");

  if (missingResult.result !== "not_found") {
    throw new Error("missing result was not not_found");
  }

  assert.equal(missingResult.boundary.transaction_read_only, true);
  assert.equal(missingResult.boundary.writes_performed, false);
  assert.equal(missingResult.boundary.commands_executed, false);
  assert.equal(missingResult.boundary.preview_only, true);
  assert.equal(missingResult.boundary.app_schema_write_allowed, false);
  assert.equal(missingResult.boundary.app_projection_apply_performed, false);
  assert.equal(
    missingResult.boundary.ai_proposal_apply_marker_updated,
    false,
  );

  const cliNoOpPreview = runCli(noOpProposalId);

  assert.equal(cliNoOpPreview.result, "preview");
  assert.equal(cliNoOpPreview.readiness?.ready, true);
  assert.equal(cliNoOpPreview.preview?.preview_only, true);
  assert.equal(cliNoOpPreview.preview?.operation, "no_op_candidate");
  assert.equal(cliNoOpPreview.preview?.sql_preview.would_insert, false);
  assert.equal(cliNoOpPreview.preview?.sql_preview.would_update, false);
  assert.equal(cliNoOpPreview.boundary?.transaction_read_only, true);
  assert.equal(cliNoOpPreview.boundary?.writes_performed, false);
  assert.equal(cliNoOpPreview.boundary?.commands_executed, false);
  assert.equal(cliNoOpPreview.boundary?.preview_only, true);
  assert.equal(cliNoOpPreview.boundary?.app_schema_write_allowed, false);
  assert.equal(cliNoOpPreview.boundary?.app_projection_apply_performed, false);
  assert.equal(
    cliNoOpPreview.boundary?.ai_proposal_apply_marker_updated,
    false,
  );

  const cliPendingPreview = runCli(existingTargetProposalId);

  assert.equal(cliPendingPreview.result, "blocked");
  assert.equal(cliPendingPreview.readiness?.ready, false);
  assert.ok(
    cliPendingPreview.preview?.blocked_reasons.includes(
      "readiness_not_ready",
    ),
  );
  assert.equal(cliPendingPreview.boundary?.transaction_read_only, true);
  assert.equal(cliPendingPreview.boundary?.writes_performed, false);
  assert.equal(cliPendingPreview.boundary?.commands_executed, false);
  assert.equal(cliPendingPreview.boundary?.preview_only, true);
  assert.equal(cliPendingPreview.boundary?.app_schema_write_allowed, false);

  const cliCommitRejected = runCliCommitRejected(noOpProposalId);

  assert.equal(cliCommitRejected.result, "bad_request");
  assert.ok(
    cliCommitRejected.error?.includes("--commit is not supported"),
  );

  const afterCropCyclesSnapshot = await readCropCyclesSnapshot();
  const existingAfter = await readProposalSnapshot(existingTargetProposalId);

  assert.equal(afterCropCyclesSnapshot, beforeCropCyclesSnapshot);
  assert.deepEqual(existingAfter, existingBefore);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          no_op_fixture_result: noOpPreview.result,
          no_op_fixture_proposal_id: noOpProposalId,
          no_op_operation: noOpPreview.preview.operation,
          insert_fixture_result: insertPreview.result,
          insert_fixture_proposal_id: insertProposalId,
          insert_operation: insertPreview.preview.operation,
          pending_result: pendingPreview.result,
          no_latest_result: noLatestPreview.result,
          already_applied_result: alreadyAppliedPreview.result,
          bad_request_result: badRequestResult.result,
          missing_result: missingResult.result,
          cli_no_op_result: cliNoOpPreview.result,
          cli_pending_result: cliPendingPreview.result,
          cli_commit_rejected_result: cliCommitRejected.result,
          transaction_read_only: noOpPreview.boundary.transaction_read_only,
          writes_performed: noOpPreview.boundary.writes_performed,
          commands_executed: noOpPreview.boundary.commands_executed,
          preview_only: noOpPreview.boundary.preview_only,
          app_schema_write_allowed:
            noOpPreview.boundary.app_schema_write_allowed,
          app_projection_apply_performed:
            noOpPreview.boundary.app_projection_apply_performed,
          ai_proposal_apply_marker_updated:
            noOpPreview.boundary.ai_proposal_apply_marker_updated,
          crop_cycles_unchanged:
            afterCropCyclesSnapshot === beforeCropCyclesSnapshot,
          existing_target_proposal_unchanged:
            JSON.stringify(existingAfter) === JSON.stringify(existingBefore),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
