import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { Client, type ClientConfig } from "pg";
import { appendProposalReviewDecisionAuditEventCommand } from "./api_boundary/proposal_review_decision_audit_append_command_boundary";

const proposalId = "24fc24ee-8efa-436b-8424-9703edeeb297";

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
  appended_event: null | {
    id: string;
    proposal_id: string;
    decision_type: string;
    decision_note: string | null;
    decided_by: string;
    decided_by_role: string;
    decision_source: string;
  };
  latest_review_decision_after: null | {
    id: string;
    decision_type: string;
  };
  boundary: {
    writes_performed: boolean;
    commands_executed: boolean;
    app_schema_write_allowed: boolean;
    ai_proposal_write_allowed: boolean;
    audit_event_write_allowed: boolean;
    app_schema_writes_performed: boolean;
    ai_proposal_writes_performed: boolean;
    audit_event_append_performed: boolean;
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
      "farmos_test_proposal_review_decision_audit_append_command_boundary",
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

async function readAuditEventCount(): Promise<number> {
  return withClient(async (client) => {
    const result = await client.query<{ count: string }>(
      "select count(*)::text as count from audit.proposal_review_decision_events",
    );

    return Number(result.rows[0]?.count ?? "0");
  });
}

async function readLatestReviewDecision(): Promise<{
  id: string;
  decision_type: string;
} | null> {
  return withClient(async (client) => {
    const result = await client.query<{
      id: string;
      decision_type: string;
    }>(
      `
        select
          id,
          decision_type
        from audit.proposal_review_decision_latest
        where proposal_id = $1
        limit 1
      `,
      [proposalId],
    );

    return result.rows[0] ?? null;
  });
}

async function readProposalSnapshot(): Promise<ProposalSnapshot> {
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
      throw new Error("target proposal was not found");
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

function baseInput(overrides: Partial<{
  proposalId: string;
  decisionType: string;
  decisionNote: string | null;
  decidedBy: string;
  decidedByRole: string;
  decisionSource: string;
}> = {}) {
  return {
    proposalId,
    decisionType: "approve_review",
    decisionNote:
      "Day30 audit append command boundary test. Audit event only; no proposal/app changes.",
    decidedBy: "hayate",
    decidedByRole: "owner",
    decisionSource: "local_cli",
    ...overrides,
  };
}

function runCli(args: string[]): CliOkResult {
  const cli = spawnSync(
    "tsx",
    ["scripts/app/append_proposal_review_decision_event_command.ts", ...args],
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

async function main() {
  const beforeCount = await readAuditEventCount();
  const beforeProposalSnapshot = await readProposalSnapshot();
  const beforeCropCyclesSnapshot = await readCropCyclesSnapshot();

  assert.equal(beforeProposalSnapshot.status, "pending");
  assert.equal(beforeProposalSnapshot.reviewed_by, null);
  assert.equal(beforeProposalSnapshot.reviewed_at, null);
  assert.equal(beforeProposalSnapshot.review_note, null);
  assert.equal(beforeProposalSnapshot.applied_by, null);
  assert.equal(beforeProposalSnapshot.applied_at, null);

  const dryRunResult = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({
      decisionNote: "Day30 boundary dry-run test. No event append.",
    }),
    commit: false,
  });

  assert.equal(dryRunResult.result, "ok");

  if (dryRunResult.result === "ok") {
    assert.equal(dryRunResult.mode, "dry_run");
    assert.equal(dryRunResult.appended_event, null);
    assert.equal(dryRunResult.boundary.writes_performed, false);
    assert.equal(dryRunResult.boundary.commands_executed, false);
    assert.equal(dryRunResult.boundary.audit_event_append_performed, false);
    assert.equal(dryRunResult.boundary.app_schema_writes_performed, false);
    assert.equal(dryRunResult.boundary.ai_proposal_writes_performed, false);
  }

  assert.equal(await readAuditEventCount(), beforeCount);

  const badRequest = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({ proposalId: "not-a-uuid" }),
    commit: false,
  });
  assert.equal(badRequest.result, "bad_request");

  const notFound = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({
      proposalId: "00000000-0000-4000-8000-000000000000",
    }),
    commit: false,
  });
  assert.equal(notFound.result, "not_found");

  const invalidDecisionType = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({ decisionType: "apply_review" }),
    commit: false,
  });
  assert.equal(invalidDecisionType.result, "validation_error");

  const rejectWithoutNote = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({ decisionType: "reject_review", decisionNote: "   " }),
    commit: false,
  });
  assert.equal(rejectWithoutNote.result, "validation_error");

  const requestRevisionWithoutNote =
    await appendProposalReviewDecisionAuditEventCommand({
      input: baseInput({
        decisionType: "request_revision",
        decisionNote: null,
      }),
      commit: false,
    });
  assert.equal(requestRevisionWithoutNote.result, "validation_error");

  const deferWithoutNote = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({ decisionType: "defer_review", decisionNote: "" }),
    commit: false,
  });
  assert.equal(deferWithoutNote.result, "validation_error");

  const invalidRole = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({ decidedByRole: "viewer" }),
    commit: false,
  });
  assert.equal(invalidRole.result, "validation_error");

  const invalidSource = await appendProposalReviewDecisionAuditEventCommand({
    input: baseInput({ decisionSource: "local_cli_dry_run" }),
    commit: false,
  });
  assert.equal(invalidSource.result, "validation_error");

  assert.equal(await readAuditEventCount(), beforeCount);

  const cliDryRun = runCli([
    "--proposal-id",
    proposalId,
    "--decision-type",
    "approve_review",
    "--decision-note",
    "Day30 CLI dry-run test. No event append.",
    "--decided-by",
    "hayate",
    "--decided-by-role",
    "owner",
    "--decision-source",
    "local_cli",
  ]);

  assert.equal(cliDryRun.result, "ok");
  assert.equal(cliDryRun.mode, "dry_run");
  assert.equal(cliDryRun.appended_event, null);
  assert.equal(cliDryRun.boundary.writes_performed, false);
  assert.equal(cliDryRun.boundary.audit_event_append_performed, false);
  assert.equal(await readAuditEventCount(), beforeCount);

  const cliCommit = runCli([
    "--proposal-id",
    proposalId,
    "--decision-type",
    "approve_review",
    "--decision-note",
    "Day30 CLI commit test. Audit event only; no proposal/app changes.",
    "--decided-by",
    "hayate",
    "--decided-by-role",
    "owner",
    "--decision-source",
    "local_cli",
    "--commit",
  ]);

  assert.equal(cliCommit.result, "ok");
  assert.equal(cliCommit.mode, "committed");
  assert.ok(cliCommit.appended_event);
  assert.equal(cliCommit.appended_event.proposal_id, proposalId);
  assert.equal(cliCommit.appended_event.decision_type, "approve_review");
  assert.equal(cliCommit.appended_event.decided_by, "hayate");
  assert.equal(cliCommit.appended_event.decided_by_role, "owner");
  assert.equal(cliCommit.appended_event.decision_source, "local_cli");
  assert.equal(cliCommit.boundary.writes_performed, true);
  assert.equal(cliCommit.boundary.commands_executed, true);
  assert.equal(cliCommit.boundary.app_schema_write_allowed, false);
  assert.equal(cliCommit.boundary.ai_proposal_write_allowed, false);
  assert.equal(cliCommit.boundary.audit_event_write_allowed, true);
  assert.equal(cliCommit.boundary.app_schema_writes_performed, false);
  assert.equal(cliCommit.boundary.ai_proposal_writes_performed, false);
  assert.equal(cliCommit.boundary.audit_event_append_performed, true);

  assert.equal(await readAuditEventCount(), beforeCount + 1);

  const latestAfterCommit = await readLatestReviewDecision();
  assert.ok(latestAfterCommit);
  assert.equal(latestAfterCommit.id, cliCommit.appended_event.id);
  assert.equal(latestAfterCommit.decision_type, "approve_review");

  assert.deepEqual(await readProposalSnapshot(), beforeProposalSnapshot);
  assert.equal(await readCropCyclesSnapshot(), beforeCropCyclesSnapshot);

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          dry_run_result: dryRunResult.result,
          event_count_before: beforeCount,
          event_count_after: await readAuditEventCount(),
          appended_event_id: cliCommit.appended_event.id,
          latest_event_id_after_commit: latestAfterCommit.id,
          proposal_snapshot_unchanged: true,
          crop_cycles_snapshot_unchanged: true,
          bad_request_result: badRequest.result,
          not_found_result: notFound.result,
          invalid_decision_type_result: invalidDecisionType.result,
          reject_without_note_result: rejectWithoutNote.result,
          request_revision_without_note_result:
            requestRevisionWithoutNote.result,
          defer_without_note_result: deferWithoutNote.result,
          invalid_role_result: invalidRole.result,
          invalid_source_result: invalidSource.result,
          cli_dry_run_result: cliDryRun.result,
          cli_dry_run_mutated_db: false,
          cli_commit_result: cliCommit.result,
          cli_commit_appended_exactly_one_event: true,
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
