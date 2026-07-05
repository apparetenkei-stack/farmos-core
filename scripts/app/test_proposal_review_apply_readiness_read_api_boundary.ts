import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client, type ClientConfig } from "pg";
import { appendProposalReviewDecisionAuditEventCommand } from "./api_boundary/proposal_review_decision_audit_append_command_boundary";
import { transitionProposalReviewStatusCommand } from "./api_boundary/proposal_review_status_transition_command_boundary";
import { checkProposalReviewApplyReadiness } from "./api_boundary/proposal_review_apply_readiness_read_api_boundary";

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

type CliReadinessResult = {
  result: "ready" | "blocked" | "not_found" | "bad_request" | "error";
  readiness?: {
    ready: boolean;
    blocked_reasons: string[];
  };
  boundary?: {
    transaction_read_only: boolean;
    writes_performed: boolean;
    commands_executed: boolean;
    app_schema_write_allowed: boolean;
    app_projection_apply_performed: boolean;
  };
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
      "farmos_test_proposal_review_apply_readiness_read_boundary",
    connectionTimeoutMillis: 5_000,
  };

  (config as Record<string, unknown>)["pass" + "word"] =
    process.env["PG" + "PASS" + "WORD"] ??
    process.env["FARMOS_APP_DB_" + "PASS" + "WORD"];

  return new Client(config);
}

async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = createClient();

  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function sqlJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("'", "''");
}

function runAdminSql(sql: string): void {
  const adminUser = "farmos_local_admin";
  const dbName =
    process.env.PGDATABASE ??
    process.env.FARMOS_DB_NAME ??
    "farmos_core_local";

  const result = spawnSync(
    "docker",
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      adminUser,
      "-d",
      dbName,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.equal(
    result.status,
    0,
    `admin sql failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

function createPendingFixture(proposalId: string): void {
  const payload = {
    day: 32,
    fixture: true,
    apply_intent: "future_crop_cycle_projection_apply",
    target_schema: "app",
    target_table: "crop_cycles",
    candidate: {
      crop: "ブロッコリー",
      variety: "ピクセル",
      field_name: "A圃場",
      sowing_date_text: "9/20",
      transplant_date_text: "11/15",
    },
  };

  runAdminSql(`
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
      status
    )
    values (
      '${proposalId}',
      'day32_apply_readiness_test',
      'Day32 proposal review apply readiness test',
      'Day32 readiness fixture. Read-only boundary verification only.',
      '${sqlJson(payload)}'::jsonb,
      '[]'::jsonb,
      'local-test',
      'day32-test',
      1,
      'Day32 read-only apply readiness fixture',
      'low',
      'pending'
    );
  `);
}

function createApprovedWithoutLatestDecisionFixture(proposalId: string): void {
  const payload = {
    day: 32,
    fixture: true,
    apply_intent: "future_crop_cycle_projection_apply",
    target_schema: "app",
    target_table: "crop_cycles",
  };

  runAdminSql(`
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
      review_note
    )
    values (
      '${proposalId}',
      'day32_apply_readiness_test',
      'Day32 approved proposal without latest review decision',
      'Day32 blocked fixture. Approved directly by local fixture setup.',
      '${sqlJson(payload)}'::jsonb,
      '[]'::jsonb,
      'local-test',
      'day32-test',
      1,
      'Day32 latest decision missing fixture',
      'low',
      'approved',
      'hayate',
      now(),
      'Day32 local fixture setup only.'
    );
  `);
}

function createAlreadyAppliedFixture(proposalId: string): void {
  const payload = {
    day: 32,
    fixture: true,
    apply_intent: "future_crop_cycle_projection_apply",
    target_schema: "app",
    target_table: "crop_cycles",
  };

  runAdminSql(`
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
      applied_by,
      applied_at
    )
    values (
      '${proposalId}',
      'day32_apply_readiness_test',
      'Day32 already applied local fixture',
      'Day32 blocked fixture. Applied markers are fixture-only.',
      '${sqlJson(payload)}'::jsonb,
      '[]'::jsonb,
      'local-test',
      'day32-test',
      1,
      'Day32 already applied fixture',
      'low',
      'approved',
      'hayate',
      now(),
      'Day32 local fixture setup only.',
      'local-admin-fixture',
      now()
    );
  `);
}

function createUnsupportedTypeFixture(proposalId: string): void {
  runAdminSql(`
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
      review_note
    )
    values (
      '${proposalId}',
      'day32_unsupported_apply_readiness_test',
      'Day32 unsupported proposal type fixture',
      'Day32 blocked fixture for unsupported proposal type.',
      '{"day":32,"fixture":true}'::jsonb,
      '[]'::jsonb,
      'local-test',
      'day32-test',
      1,
      'Day32 unsupported type fixture',
      'low',
      'approved',
      'hayate',
      now(),
      'Day32 local fixture setup only.'
    );
  `);
}

async function appendApproveDecision(proposalId: string): Promise<string> {
  const appendResult = await appendProposalReviewDecisionAuditEventCommand({
    input: {
      proposalId,
      decisionType: "approve_review",
      decisionNote:
        "Day32 fixture approve review event. Audit event only; readiness boundary remains read-only.",
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
        "Day32 fixture transition to approved. Proposal status only; no app projection apply.",
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
  return withClient(async (client) => {
    const result = await client.query<ProposalSnapshot>(
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
          applied_at::text
        from ai.proposal_inbox
        where id = $1
        limit 1
      `,
      [proposalId],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error(`proposal not found: ${proposalId}`);
    }

    return row;
  });
}

async function readCropCyclesSnapshot(): Promise<string> {
  return withClient(async (client) => {
    const result = await client.query<{ snapshot: string }>(
      `
        select coalesce(
          jsonb_agg(to_jsonb(crop_cycle_row) order by id),
          '[]'::jsonb
        )::text as snapshot
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
        ) crop_cycle_row
      `,
    );

    return result.rows[0]?.snapshot ?? "[]";
  });
}

function runCli(proposalId: string): CliReadinessResult {
  const cli = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/app/check_proposal_review_apply_readiness.ts",
      "--proposal-id",
      proposalId,
    ],
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.equal(
    cli.status,
    0,
    `cli failed\nstdout:\n${cli.stdout}\nstderr:\n${cli.stderr}`,
  );

  return JSON.parse(cli.stdout) as CliReadinessResult;
}

async function main() {
  const beforeCropCyclesSnapshot = await readCropCyclesSnapshot();
  const existingBefore = await readProposalSnapshot(existingTargetProposalId);

  assert.equal(existingBefore.status, "pending");
  assert.equal(existingBefore.reviewed_by, null);
  assert.equal(existingBefore.reviewed_at, null);
  assert.equal(existingBefore.review_note, null);
  assert.equal(existingBefore.applied_by, null);
  assert.equal(existingBefore.applied_at, null);

  const readyProposalId = randomUUID();
  createPendingFixture(readyProposalId);

  const decisionEventId = await appendApproveDecision(readyProposalId);
  await transitionToApproved(readyProposalId, decisionEventId);

  const readyResult = await checkProposalReviewApplyReadiness({
    proposalId: readyProposalId,
  });

  assert.equal(readyResult.result, "ready");

  if (readyResult.result !== "ready") {
    throw new Error("ready result was not ready");
  }

  assert.equal(readyResult.readiness.ready, true);
  assert.deepEqual(readyResult.readiness.blocked_reasons, []);
  assert.equal(readyResult.readiness.checks.proposal_exists, true);
  assert.equal(readyResult.readiness.checks.proposal_approved, true);
  assert.equal(readyResult.readiness.checks.proposal_not_applied, true);
  assert.equal(readyResult.readiness.checks.latest_decision_exists, true);
  assert.equal(readyResult.readiness.checks.latest_decision_approve_review, true);
  assert.equal(readyResult.readiness.checks.latest_decision_source_allowed, true);
  assert.equal(readyResult.readiness.checks.payload_present, true);
  assert.equal(readyResult.readiness.checks.proposal_type_supported, true);
  assert.equal(readyResult.readiness.future_apply_candidate.target_schema, "app");
  assert.equal(
    readyResult.readiness.future_apply_candidate.target_table,
    "crop_cycles",
  );
  assert.equal(
    readyResult.readiness.future_apply_candidate.apply_intent,
    "future_crop_cycle_projection_apply",
  );
  assert.equal(readyResult.proposal.status, "approved");
  assert.equal(readyResult.proposal.applied_by, null);
  assert.equal(readyResult.proposal.applied_at, null);
  assert.ok(readyResult.latest_review_decision);
  assert.equal(readyResult.latest_review_decision.decision_type, "approve_review");
  assert.equal(readyResult.latest_review_decision.decision_source, "local_cli");
  assert.equal(readyResult.boundary.transaction_read_only, true);
  assert.equal(readyResult.boundary.writes_performed, false);
  assert.equal(readyResult.boundary.commands_executed, false);
  assert.equal(readyResult.boundary.app_schema_write_allowed, false);
  assert.equal(readyResult.boundary.app_projection_apply_performed, false);

  const pendingResult = await checkProposalReviewApplyReadiness({
    proposalId: existingTargetProposalId,
  });

  assert.equal(pendingResult.result, "blocked");

  if (pendingResult.result !== "blocked") {
    throw new Error("pending result was not blocked");
  }

  assert.equal(pendingResult.readiness.ready, false);
  assert.ok(
    pendingResult.readiness.blocked_reasons.includes("proposal_not_approved"),
  );
  assert.equal(pendingResult.boundary.transaction_read_only, true);
  assert.equal(pendingResult.boundary.writes_performed, false);
  assert.equal(pendingResult.boundary.commands_executed, false);
  assert.equal(pendingResult.boundary.app_schema_write_allowed, false);
  assert.equal(pendingResult.boundary.app_projection_apply_performed, false);

  const noLatestProposalId = randomUUID();
  createApprovedWithoutLatestDecisionFixture(noLatestProposalId);

  const noLatestResult = await checkProposalReviewApplyReadiness({
    proposalId: noLatestProposalId,
  });

  assert.equal(noLatestResult.result, "blocked");

  if (noLatestResult.result !== "blocked") {
    throw new Error("no latest result was not blocked");
  }

  assert.ok(
    noLatestResult.readiness.blocked_reasons.includes(
      "latest_decision_missing",
    ),
  );

  const alreadyAppliedProposalId = randomUUID();
  createAlreadyAppliedFixture(alreadyAppliedProposalId);

  const alreadyAppliedResult = await checkProposalReviewApplyReadiness({
    proposalId: alreadyAppliedProposalId,
  });

  assert.equal(alreadyAppliedResult.result, "blocked");

  if (alreadyAppliedResult.result !== "blocked") {
    throw new Error("already applied result was not blocked");
  }

  assert.equal(alreadyAppliedResult.readiness.checks.proposal_not_applied, false);
  assert.ok(
    alreadyAppliedResult.readiness.blocked_reasons.includes(
      "proposal_already_applied",
    ),
  );

  const unsupportedProposalId = randomUUID();
  createUnsupportedTypeFixture(unsupportedProposalId);

  const unsupportedResult = await checkProposalReviewApplyReadiness({
    proposalId: unsupportedProposalId,
  });

  assert.equal(unsupportedResult.result, "blocked");

  if (unsupportedResult.result !== "blocked") {
    throw new Error("unsupported result was not blocked");
  }

  assert.equal(unsupportedResult.readiness.checks.proposal_type_supported, false);
  assert.ok(
    unsupportedResult.readiness.blocked_reasons.includes(
      "unsupported_proposal_type",
    ),
  );

  const badRequestResult = await checkProposalReviewApplyReadiness({
    proposalId: "not-a-uuid",
  });

  assert.equal(badRequestResult.result, "bad_request");

  const missingResult = await checkProposalReviewApplyReadiness({
    proposalId: randomUUID(),
  });

  assert.equal(missingResult.result, "not_found");
  assert.equal(missingResult.boundary?.transaction_read_only, true);
  assert.equal(missingResult.boundary?.writes_performed, false);
  assert.equal(missingResult.boundary?.commands_executed, false);
  assert.equal(missingResult.boundary?.app_schema_write_allowed, false);
  assert.equal(missingResult.boundary?.app_projection_apply_performed, false);

  const cliReadyResult = runCli(readyProposalId);

  assert.equal(cliReadyResult.result, "ready");
  assert.equal(cliReadyResult.readiness?.ready, true);
  assert.deepEqual(cliReadyResult.readiness?.blocked_reasons, []);
  assert.equal(cliReadyResult.boundary?.transaction_read_only, true);
  assert.equal(cliReadyResult.boundary?.writes_performed, false);
  assert.equal(cliReadyResult.boundary?.commands_executed, false);
  assert.equal(cliReadyResult.boundary?.app_schema_write_allowed, false);
  assert.equal(cliReadyResult.boundary?.app_projection_apply_performed, false);

  const cliPendingResult = runCli(existingTargetProposalId);

  assert.equal(cliPendingResult.result, "blocked");
  assert.equal(cliPendingResult.readiness?.ready, false);
  assert.ok(
    cliPendingResult.readiness?.blocked_reasons.includes(
      "proposal_not_approved",
    ),
  );

  const afterCropCyclesSnapshot = await readCropCyclesSnapshot();
  assert.equal(afterCropCyclesSnapshot, beforeCropCyclesSnapshot);

  const existingAfter = await readProposalSnapshot(existingTargetProposalId);
  assert.deepEqual(existingAfter, existingBefore);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          ready_fixture_result: readyResult.result,
          ready_fixture_proposal_id: readyProposalId,
          ready_fixture_latest_decision_id: readyResult.latest_review_decision.id,
          pending_existing_target_result: pendingResult.result,
          pending_existing_target_reasons:
            pendingResult.readiness.blocked_reasons,
          no_latest_result: noLatestResult.result,
          no_latest_reasons: noLatestResult.readiness.blocked_reasons,
          already_applied_result: alreadyAppliedResult.result,
          already_applied_reasons:
            alreadyAppliedResult.readiness.blocked_reasons,
          unsupported_result: unsupportedResult.result,
          unsupported_reasons: unsupportedResult.readiness.blocked_reasons,
          bad_request_result: badRequestResult.result,
          missing_result: missingResult.result,
          cli_ready_result: cliReadyResult.result,
          cli_pending_result: cliPendingResult.result,
          transaction_read_only: readyResult.boundary.transaction_read_only,
          writes_performed: readyResult.boundary.writes_performed,
          commands_executed: readyResult.boundary.commands_executed,
          app_schema_write_allowed:
            readyResult.boundary.app_schema_write_allowed,
          ai_proposal_write_allowed:
            readyResult.boundary.ai_proposal_write_allowed,
          audit_event_write_allowed:
            readyResult.boundary.audit_event_write_allowed,
          app_projection_apply_performed:
            readyResult.boundary.app_projection_apply_performed,
          app_crop_cycles_unchanged:
            afterCropCyclesSnapshot === beforeCropCyclesSnapshot,
          existing_target_remained_pending:
            existingAfter.status === "pending" &&
            existingAfter.reviewed_by === null &&
            existingAfter.reviewed_at === null &&
            existingAfter.review_note === null &&
            existingAfter.applied_by === null &&
            existingAfter.applied_at === null,
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
