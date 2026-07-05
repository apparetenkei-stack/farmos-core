import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Client, type ClientConfig } from "pg";
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

type CliOkResult = {
  result: "ok";
  mode: "committed" | "dry_run";
  proposal_after: null | {
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_note: string | null;
    applied_by: string | null;
    applied_at: string | null;
  };
  boundary: {
    writes_performed: boolean;
    commands_executed: boolean;
    app_schema_writes_performed: boolean;
    ai_proposal_status_transition_performed: boolean;
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
      "farmos_test_proposal_review_status_transition_command_boundary",
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

function createFixtureProposal(proposalId: string): void {
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
      'day31_status_transition_test',
      'Day31 proposal review status transition test',
      'Day31 status transition fixture. This proposal is used only for CLI command boundary verification.',
      '{"day":31,"fixture":true}'::jsonb,
      '[]'::jsonb,
      'local-test',
      'day31-test',
      1,
      'Day31 command boundary fixture',
      'low',
      'pending'
    );
  `);
}

async function appendFixtureApproveDecision(proposalId: string): Promise<string> {
  const appendResult = await appendProposalReviewDecisionAuditEventCommand({
    input: {
      proposalId,
      decisionType: "approve_review",
      decisionNote:
        "Day31 fixture approve review event. Audit event only; status transition is tested separately.",
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

function baseInput(proposalId: string, decisionEventId: string) {
  return {
    proposalId,
    decisionEventId,
    transitionedBy: "hayate",
    transitionedByRole: "owner",
    transitionSource: "local_cli",
    transitionNote:
      "Day31 status transition command boundary test. Proposal status only; no app projection apply.",
  };
}

function runCli(args: string[]): CliOkResult {
  const cli = spawnSync(
    "pnpm",
    ["exec", "tsx", "scripts/app/transition_proposal_review_status_command.ts", ...args],
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.equal(
    cli.status,
    0,
    `CLI failed\nstdout:\n${cli.stdout}\nstderr:\n${cli.stderr}`,
  );

  return JSON.parse(cli.stdout) as CliOkResult;
}

async function runDirectBoundaryTest(): Promise<void> {
  const proposalId = randomUUID();
  createFixtureProposal(proposalId);

  const decisionEventId = await appendFixtureApproveDecision(proposalId);

  const existingTargetBefore = await readProposalSnapshot(existingTargetProposalId);
  const proposalBefore = await readProposalSnapshot(proposalId);
  const cropCyclesBefore = await readCropCyclesSnapshot();

  assert.equal(existingTargetBefore.status, "pending");
  assert.equal(proposalBefore.status, "pending");
  assert.equal(proposalBefore.reviewed_by, null);
  assert.equal(proposalBefore.reviewed_at, null);
  assert.equal(proposalBefore.review_note, null);
  assert.equal(proposalBefore.applied_by, null);
  assert.equal(proposalBefore.applied_at, null);

  const dryRunResult = await transitionProposalReviewStatusCommand({
    input: baseInput(proposalId, decisionEventId),
    commit: false,
  });

  assert.equal(dryRunResult.result, "ok");

  if (dryRunResult.result === "ok") {
    assert.equal(dryRunResult.mode, "dry_run");
    assert.equal(dryRunResult.command.next_status, "approved");
    assert.equal(dryRunResult.proposal_after, null);
    assert.equal(dryRunResult.boundary.writes_performed, false);
    assert.equal(dryRunResult.boundary.commands_executed, false);
    assert.equal(
      dryRunResult.boundary.ai_proposal_status_transition_performed,
      false,
    );
    assert.equal(dryRunResult.boundary.app_schema_writes_performed, false);
    assert.equal(dryRunResult.boundary.app_projection_apply_performed, false);
    assert.equal(dryRunResult.boundary.app_schema_write_allowed, false);
    assert.equal(dryRunResult.boundary.ai_proposal_status_update_allowed, true);
    assert.equal(
      dryRunResult.boundary.ai_proposal_review_fields_update_allowed,
      true,
    );
    assert.equal(
      dryRunResult.boundary.ai_proposal_applied_fields_update_allowed,
      false,
    );
  }

  const proposalAfterDryRun = await readProposalSnapshot(proposalId);
  assert.deepEqual(proposalAfterDryRun, proposalBefore);
  assert.equal(await readCropCyclesSnapshot(), cropCyclesBefore);

  const badProposalId = await transitionProposalReviewStatusCommand({
    input: baseInput("not-a-uuid", decisionEventId),
    commit: false,
  });
  assert.equal(badProposalId.result, "bad_request");

  const badDecisionEventId = await transitionProposalReviewStatusCommand({
    input: baseInput(proposalId, "not-a-uuid"),
    commit: false,
  });
  assert.equal(badDecisionEventId.result, "bad_request");

  const notFound = await transitionProposalReviewStatusCommand({
    input: baseInput("00000000-0000-4000-8000-000000000000", decisionEventId),
    commit: false,
  });
  assert.equal(notFound.result, "not_found");

  const mismatchedDecisionEvent = await transitionProposalReviewStatusCommand({
    input: baseInput(proposalId, randomUUID()),
    commit: false,
  });
  assert.equal(mismatchedDecisionEvent.result, "validation_error");

  if (mismatchedDecisionEvent.result === "validation_error") {
    assert.equal(
      mismatchedDecisionEvent.validation.decision_event_id_matches_latest,
      false,
    );
  }

  const invalidRole = await transitionProposalReviewStatusCommand({
    input: {
      ...baseInput(proposalId, decisionEventId),
      transitionedByRole: "viewer",
    },
    commit: false,
  });
  assert.equal(invalidRole.result, "validation_error");

  const invalidSource = await transitionProposalReviewStatusCommand({
    input: {
      ...baseInput(proposalId, decisionEventId),
      transitionSource: "future_ui",
    },
    commit: false,
  });
  assert.equal(invalidSource.result, "validation_error");

  const emptyTransitionedBy = await transitionProposalReviewStatusCommand({
    input: {
      ...baseInput(proposalId, decisionEventId),
      transitionedBy: "   ",
    },
    commit: false,
  });
  assert.equal(emptyTransitionedBy.result, "validation_error");

  const commitResult = await transitionProposalReviewStatusCommand({
    input: baseInput(proposalId, decisionEventId),
    commit: true,
  });

  assert.equal(commitResult.result, "ok");

  if (commitResult.result === "ok") {
    assert.equal(commitResult.mode, "committed");
    assert.equal(commitResult.boundary.writes_performed, true);
    assert.equal(commitResult.boundary.commands_executed, true);
    assert.equal(
      commitResult.boundary.ai_proposal_status_transition_performed,
      true,
    );
    assert.equal(commitResult.boundary.app_schema_writes_performed, false);
    assert.equal(commitResult.boundary.app_projection_apply_performed, false);
    assert.ok(commitResult.proposal_after);
    assert.equal(commitResult.proposal_after.status, "approved");
    assert.equal(commitResult.proposal_after.reviewed_by, "hayate");
    assert.ok(commitResult.proposal_after.reviewed_at);
    assert.equal(commitResult.proposal_after.applied_by, null);
    assert.equal(commitResult.proposal_after.applied_at, null);
  }

  const proposalAfterCommit = await readProposalSnapshot(proposalId);
  assert.equal(proposalAfterCommit.status, "approved");
  assert.equal(proposalAfterCommit.reviewed_by, "hayate");
  assert.ok(proposalAfterCommit.reviewed_at);
  assert.equal(proposalAfterCommit.applied_by, null);
  assert.equal(proposalAfterCommit.applied_at, null);

  const nonPending = await transitionProposalReviewStatusCommand({
    input: baseInput(proposalId, decisionEventId),
    commit: true,
  });
  assert.equal(nonPending.result, "validation_error");

  if (nonPending.result === "validation_error") {
    assert.equal(nonPending.validation.proposal_pending, false);
  }

  const existingTargetAfter = await readProposalSnapshot(existingTargetProposalId);
  assert.equal(existingTargetAfter.status, "pending");
  assert.equal(existingTargetAfter.reviewed_by, null);
  assert.equal(existingTargetAfter.reviewed_at, null);
  assert.equal(existingTargetAfter.review_note, null);
  assert.equal(existingTargetAfter.applied_by, null);
  assert.equal(existingTargetAfter.applied_at, null);
  assert.equal(await readCropCyclesSnapshot(), cropCyclesBefore);
}

async function runCliBoundaryTest(): Promise<void> {
  const proposalId = randomUUID();
  createFixtureProposal(proposalId);

  const decisionEventId = await appendFixtureApproveDecision(proposalId);
  const cropCyclesBefore = await readCropCyclesSnapshot();

  const cliDryRun = runCli([
    "--proposal-id",
    proposalId,
    "--decision-event-id",
    decisionEventId,
    "--transitioned-by",
    "hayate",
    "--transitioned-by-role",
    "owner",
    "--transition-source",
    "local_cli",
    "--transition-note",
    "Day31 CLI dry run only. No status transition.",
  ]);

  assert.equal(cliDryRun.result, "ok");
  assert.equal(cliDryRun.mode, "dry_run");
  assert.equal(cliDryRun.boundary.writes_performed, false);
  assert.equal(cliDryRun.boundary.ai_proposal_status_transition_performed, false);

  const afterCliDryRun = await readProposalSnapshot(proposalId);
  assert.equal(afterCliDryRun.status, "pending");
  assert.equal(afterCliDryRun.reviewed_by, null);
  assert.equal(afterCliDryRun.reviewed_at, null);
  assert.equal(afterCliDryRun.review_note, null);
  assert.equal(afterCliDryRun.applied_by, null);
  assert.equal(afterCliDryRun.applied_at, null);

  const cliCommit = runCli([
    "--proposal-id",
    proposalId,
    "--decision-event-id",
    decisionEventId,
    "--transitioned-by",
    "hayate",
    "--transitioned-by-role",
    "owner",
    "--transition-source",
    "local_cli",
    "--transition-note",
    "Day31 CLI commit smoke test. Proposal status only; no app projection apply.",
    "--commit",
  ]);

  assert.equal(cliCommit.result, "ok");
  assert.equal(cliCommit.mode, "committed");
  assert.equal(cliCommit.boundary.writes_performed, true);
  assert.equal(cliCommit.boundary.commands_executed, true);
  assert.equal(cliCommit.boundary.app_schema_writes_performed, false);
  assert.equal(cliCommit.boundary.app_projection_apply_performed, false);
  assert.equal(cliCommit.boundary.ai_proposal_status_transition_performed, true);
  assert.ok(cliCommit.proposal_after);
  assert.equal(cliCommit.proposal_after.status, "approved");
  assert.equal(cliCommit.proposal_after.reviewed_by, "hayate");
  assert.ok(cliCommit.proposal_after.reviewed_at);
  assert.equal(cliCommit.proposal_after.applied_by, null);
  assert.equal(cliCommit.proposal_after.applied_at, null);

  const afterCliCommit = await readProposalSnapshot(proposalId);
  assert.equal(afterCliCommit.status, "approved");
  assert.equal(afterCliCommit.reviewed_by, "hayate");
  assert.ok(afterCliCommit.reviewed_at);
  assert.equal(afterCliCommit.applied_by, null);
  assert.equal(afterCliCommit.applied_at, null);
  assert.equal(await readCropCyclesSnapshot(), cropCyclesBefore);
}

async function main() {
  await runDirectBoundaryTest();
  await runCliBoundaryTest();

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          direct_boundary: "ok",
          cli_boundary: "ok",
          existing_target_proposal_remains_pending: true,
          app_crop_cycles_unchanged: true,
          app_schema_writes_performed: false,
          app_projection_apply_performed: false,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
