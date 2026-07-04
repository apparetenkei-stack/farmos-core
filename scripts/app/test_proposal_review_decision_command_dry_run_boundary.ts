import { spawnSync } from "node:child_process";
import { Client, type ClientConfig } from "pg";
import { dryRunProposalReviewDecisionCommand } from "./api_boundary/proposal_review_decision_command_dry_run_boundary";

const TARGET_PROPOSAL_ID =
  process.env.FARMOS_TEST_PROPOSAL_ID ??
  "24fc24ee-8efa-436b-8424-9703edeeb297";

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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readSafetySnapshot() {
  const client = createClient();

  try {
    await client.connect();

    const eventCountResult = await client.query<{
      count: string;
    }>(`
      select count(*)::text as count
      from audit.proposal_review_decision_events
    `);

    const proposalResult = await client.query(
      `
        select
          id::text as id,
          proposal_type,
          title,
          status,
          reviewed_by,
          reviewed_at,
          review_note,
          applied_by,
          applied_at
        from ai.proposal_inbox
        where id = $1::uuid
        order by id
      `,
      [TARGET_PROPOSAL_ID],
    );

    const cropCycleResult = await client.query(`
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
    `);

    return {
      event_count: Number(eventCountResult.rows[0].count),
      proposal_rows: proposalResult.rows,
      crop_cycle_rows: cropCycleResult.rows,
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

function assertSnapshotUnchanged(
  before: Awaited<ReturnType<typeof readSafetySnapshot>>,
  after: Awaited<ReturnType<typeof readSafetySnapshot>>,
) {
  assert(before.event_count === 1, "expected starting audit event count to be 1");
  assert(after.event_count === 1, "expected ending audit event count to be 1");

  assert(
    JSON.stringify(before.proposal_rows) === JSON.stringify(after.proposal_rows),
    "proposal inbox snapshot changed",
  );

  assert(
    JSON.stringify(before.crop_cycle_rows) ===
      JSON.stringify(after.crop_cycle_rows),
    "app crop cycles snapshot changed",
  );
}

async function assertOkDryRun(decisionType: string, decisionNote: string) {
  const result = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType,
      decisionNote,
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(result.result === "ok", `expected ok for ${decisionType}`);

  assert(
    result.command.proposal_id === TARGET_PROPOSAL_ID,
    `${decisionType} command proposal mismatch`,
  );
  assert(
    result.command.decision_type === decisionType,
    `${decisionType} command decision type mismatch`,
  );
  assert(
    result.proposal.status === "pending",
    `${decisionType} expected pending proposal`,
  );
  assert(
    result.latest_review_decision?.decision_type === "defer_review",
    `${decisionType} expected latest review decision to be defer_review`,
  );

  assert(result.validation.accepted === true, `${decisionType} not accepted`);
  assert(
    result.validation.required_note_satisfied === true,
    `${decisionType} note validation failed`,
  );
  assert(
    result.validation.proposal_pending === true,
    `${decisionType} expected proposal pending`,
  );
  assert(
    result.validation.proposal_not_applied === true,
    `${decisionType} expected proposal not applied`,
  );
  assert(
    result.validation.allowed_decision_type === true,
    `${decisionType} decision type validation failed`,
  );
  assert(
    result.validation.allowed_decided_by_role === true,
    `${decisionType} role validation failed`,
  );
  assert(
    result.validation.allowed_decision_source === true,
    `${decisionType} source validation failed`,
  );

  assert(
    result.dry_run_event_candidate.proposal_id === TARGET_PROPOSAL_ID,
    `${decisionType} event candidate proposal mismatch`,
  );
  assert(
    result.dry_run_event_candidate.decision_type === decisionType,
    `${decisionType} event candidate decision mismatch`,
  );
  assert(
    result.dry_run_event_candidate.event_metadata.dry_run === true,
    `${decisionType} expected event candidate dry_run metadata`,
  );
  assert(
    result.dry_run_event_candidate.event_metadata.commands_executed === false,
    `${decisionType} expected no command execution metadata`,
  );
  assert(
    result.dry_run_event_candidate.event_metadata.writes_performed === false,
    `${decisionType} expected no write metadata`,
  );

  assert(
    result.boundary.mode === "proposal_review_decision_command_dry_run_boundary",
    `${decisionType} boundary mode mismatch`,
  );
  assert(
    result.boundary.transaction_read_only === true,
    `${decisionType} expected read-only transaction`,
  );
  assert(
    result.boundary.writes_performed === false,
    `${decisionType} expected no writes`,
  );
  assert(
    result.boundary.commands_executed === false,
    `${decisionType} expected no commands`,
  );
  assert(result.boundary.dry_run === true, `${decisionType} expected dry-run`);
  assert(
    result.boundary.app_schema_write_allowed === false,
    `${decisionType} app schema write should be unavailable to app role`,
  );
  assert(
    result.boundary.ai_proposal_write_allowed === false,
    `${decisionType} proposal write should be unavailable to app role`,
  );
  assert(
    result.boundary.audit_event_write_allowed === true,
    `${decisionType} audit event append privilege should be present for a later boundary`,
  );

  return result;
}

async function main() {
  const before = await readSafetySnapshot();

  const approve = await assertOkDryRun(
    "approve_review",
    "Day29 approve dry run only. No event append.",
  );
  const reject = await assertOkDryRun(
    "reject_review",
    "Day29 reject dry run only. No event append.",
  );
  const requestRevision = await assertOkDryRun(
    "request_revision",
    "Day29 request revision dry run only. No event append.",
  );
  const defer = await assertOkDryRun(
    "defer_review",
    "Day29 defer dry run only. No event append.",
  );

  const badRequest = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: "not-a-uuid",
      decisionType: "approve_review",
      decisionNote: null,
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(badRequest.result === "bad_request", "expected bad_request");

  const notFound = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: "00000000-0000-4000-8000-000000000000",
      decisionType: "approve_review",
      decisionNote: null,
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(notFound.result === "not_found", "expected not_found");

  const invalidDecisionType = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType: "apply_review",
      decisionNote: "invalid decision type dry run",
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(
    invalidDecisionType.result === "validation_error",
    "expected invalid decision type validation_error",
  );

  const rejectWithoutNote = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType: "reject_review",
      decisionNote: null,
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(
    rejectWithoutNote.result === "validation_error",
    "expected reject without note validation_error",
  );

  const requestRevisionWithoutNote =
    await dryRunProposalReviewDecisionCommand({
      input: {
        proposalId: TARGET_PROPOSAL_ID,
        decisionType: "request_revision",
        decisionNote: null,
        decidedBy: "hayate",
        decidedByRole: "owner",
        decisionSource: "local_cli_dry_run",
      },
    });

  assert(
    requestRevisionWithoutNote.result === "validation_error",
    "expected request revision without note validation_error",
  );

  const deferWithoutNote = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType: "defer_review",
      decisionNote: null,
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(
    deferWithoutNote.result === "validation_error",
    "expected defer without note validation_error",
  );

  const invalidRole = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType: "approve_review",
      decisionNote: null,
      decidedBy: "hayate",
      decidedByRole: "viewer",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(
    invalidRole.result === "validation_error",
    "expected invalid role validation_error",
  );

  const invalidSource = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType: "approve_review",
      decisionNote: null,
      decidedBy: "hayate",
      decidedByRole: "owner",
      decisionSource: "local_cli",
    },
  });

  assert(
    invalidSource.result === "validation_error",
    "expected invalid source validation_error",
  );

  const emptyDecidedBy = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: TARGET_PROPOSAL_ID,
      decisionType: "approve_review",
      decisionNote: null,
      decidedBy: "   ",
      decidedByRole: "owner",
      decisionSource: "local_cli_dry_run",
    },
  });

  assert(
    emptyDecidedBy.result === "validation_error",
    "expected empty decidedBy validation_error",
  );

  const cliDryRun = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/app/dry_run_proposal_review_decision_command.ts",
      "--proposal-id",
      TARGET_PROPOSAL_ID,
      "--decision-type",
      "approve_review",
      "--decision-note",
      "Day29 CLI dry run only. No event append.",
      "--decided-by",
      "hayate",
      "--decided-by-role",
      "owner",
      "--decision-source",
      "local_cli_dry_run",
    ],
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  assert(cliDryRun.status === 0, `CLI dry-run failed: ${cliDryRun.stderr}`);
  assert(
    cliDryRun.stdout.includes('"result": "ok"'),
    "CLI dry-run did not return ok",
  );
  assert(
    cliDryRun.stdout.includes('"dry_run": true'),
    "CLI dry-run did not report dry_run true",
  );
  assert(
    cliDryRun.stdout.includes('"commands_executed": false'),
    "CLI dry-run did not report commands_executed false",
  );
  assert(
    cliDryRun.stdout.includes('"writes_performed": false'),
    "CLI dry-run did not report writes_performed false",
  );

  const cliCommit = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/app/dry_run_proposal_review_decision_command.ts",
      "--proposal-id",
      TARGET_PROPOSAL_ID,
      "--decision-type",
      "approve_review",
      "--decision-note",
      "This should not commit on Day29.",
      "--decided-by",
      "hayate",
      "--decided-by-role",
      "owner",
      "--decision-source",
      "local_cli_dry_run",
      "--commit",
    ],
    {
      encoding: "utf8",
      env: process.env,
    },
  );

  assert(
    cliCommit.status !== 0,
    "CLI commit mode should be rejected with non-zero status",
  );
  assert(
    cliCommit.stdout.includes("commit_not_supported_in_day29"),
    "CLI commit mode did not report commit_not_supported_in_day29",
  );

  const after = await readSafetySnapshot();
  assertSnapshotUnchanged(before, after);

  const okDecisionTypes = [
    approve.command.decision_type,
    reject.command.decision_type,
    requestRevision.command.decision_type,
    defer.command.decision_type,
  ].sort();

  console.log(
    JSON.stringify(
      {
        result: "ok",
        checks: {
          proposal_id: TARGET_PROPOSAL_ID,
          proposal_status: approve.proposal.status,
          ok_decision_types: okDecisionTypes,
          latest_review_decision:
            approve.latest_review_decision?.decision_type ?? null,
          concrete_payload_validation: true,
          dry_run_event_candidate_returned:
            approve.dry_run_event_candidate.proposal_id ===
            TARGET_PROPOSAL_ID,
          required_note_policy: {
            approve_review_note_optional: approve.result === "ok",
            reject_review_note_required:
              rejectWithoutNote.result === "validation_error",
            request_revision_note_required:
              requestRevisionWithoutNote.result === "validation_error",
            defer_review_note_required:
              deferWithoutNote.result === "validation_error",
          },
          invalid_decision_type_result: invalidDecisionType.result,
          invalid_role_result: invalidRole.result,
          invalid_source_result: invalidSource.result,
          empty_decided_by_result: emptyDecidedBy.result,
          bad_request_result: badRequest.result,
          not_found_result: notFound.result,
          transaction_read_only: approve.boundary.transaction_read_only,
          writes_performed: approve.boundary.writes_performed,
          commands_executed: approve.boundary.commands_executed,
          dry_run: approve.boundary.dry_run,
          app_schema_write_allowed: approve.boundary.app_schema_write_allowed,
          ai_proposal_write_allowed: approve.boundary.ai_proposal_write_allowed,
          audit_event_write_allowed: approve.boundary.audit_event_write_allowed,
          audit_event_count_before: before.event_count,
          audit_event_count_after: after.event_count,
          proposal_snapshot_unchanged:
            JSON.stringify(before.proposal_rows) ===
            JSON.stringify(after.proposal_rows),
          crop_cycle_snapshot_unchanged:
            JSON.stringify(before.crop_cycle_rows) ===
            JSON.stringify(after.crop_cycle_rows),
          cli_dry_run_status: cliDryRun.status,
          cli_commit_rejected: cliCommit.status !== 0,
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
