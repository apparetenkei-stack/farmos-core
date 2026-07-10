import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { Client } from "pg";
import {
  DAY88_REQUIRED_BASE_COMMIT,
  evaluateDay88PilotSession,
  type Day88ProtectedProposalState,
  type Day88SessionSnapshot
} from "../../src/lib/hermes/hermes_limited_readonly_pilot_session_boundary";
import {
  evaluateDay87PilotReadiness,
  type Day87ReadinessInput,
  type Day87ServiceState
} from "../../src/lib/hermes/hermes_pilot_readiness_operator_runbook_boundary";
import type {
  Day86AuditResult
} from "../../src/lib/hermes/hermes_apply_audit_restore_verification_boundary";

type Day86CommandOutput = {
  result: "ok";
  local: Day86AuditResult;
  restore: Day86AuditResult;
  restore_consistency_valid: boolean;
};

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    env: process.env
  }).trim();
}

function parseJsonOutput<T>(output: string): T {
  const start = output.indexOf("{");

  if (start < 0) {
    throw new Error("json_output_not_found");
  }

  return JSON.parse(output.slice(start)) as T;
}

function readDay86Audit(): Day86CommandOutput {
  return parseJsonOutput<Day86CommandOutput>(
    run("pnpm", [
      "run",
      "--silent",
      "test-hermes-apply-audit-restore-verification-boundary"
    ])
  );
}

function commitPresent(commit: string): boolean {
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", commit, "HEAD"],
      { stdio: "ignore", env: process.env }
    );
    return true;
  } catch {
    return false;
  }
}

function readServiceStates(): Day87ServiceState[] {
  const running = new Set(
    run("docker", [
      "compose",
      "ps",
      "--services",
      "--status",
      "running"
    ])
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return ["postgres", "redis", "minio", "qdrant"].map(
    (service) => ({
      service,
      running: running.has(service)
    })
  );
}

function createClient(database: string): Client {
  return new Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? "5432"),
    database,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD
  });
}

async function readSnapshot(
  database: string
): Promise<Day88SessionSnapshot> {
  const client = createClient(database);
  await client.connect();

  try {
    await client.query("begin transaction read only");

    const readOnly = await client.query<{
      transaction_read_only: string;
    }>(
      "select current_setting($1) as transaction_read_only",
      ["transaction_read_only"]
    );

    const counts = await client.query<{
      proposal_count: number;
      decision_history_count: number;
      apply_history_count: number;
      crop_cycle_count: number;
    }>(`
      select
        (select count(*)::int from ai.proposal_inbox)
          as proposal_count,
        (select count(*)::int
         from audit.proposal_review_decision_events)
          as decision_history_count,
        (select count(*)::int
         from audit.proposal_review_apply_events)
          as apply_history_count,
        (select count(*)::int from app.crop_cycles)
          as crop_cycle_count
    `);

    const day85 = await client.query<{
      day85_proposal_count: number;
      day85_decision_count: number;
      day85_apply_count: number;
      day85_proposal_status: string | null;
      day85_reviewed_by: string | null;
      day85_applied_by: string | null;
      day85_applied_at: Date | null;
    }>(`
      select
        (
          select count(*)::int
          from ai.proposal_inbox
          where id =
            $1::uuid
        ) as day85_proposal_count,
        (
          select count(*)::int
          from audit.proposal_review_decision_events
          where event_metadata->>
            $2 = $3
        ) as day85_decision_count,
        (
          select count(*)::int
          from audit.proposal_review_apply_events
          where event_metadata->>
            $2 = $3
        ) as day85_apply_count,
        (
          select status
          from ai.proposal_inbox
          where id = $1::uuid
        ) as day85_proposal_status,
        (
          select reviewed_by
          from ai.proposal_inbox
          where id = $1::uuid
        ) as day85_reviewed_by,
        (
          select applied_by
          from ai.proposal_inbox
          where id = $1::uuid
        ) as day85_applied_by,
        (
          select applied_at
          from ai.proposal_inbox
          where id = $1::uuid
        ) as day85_applied_at
    `, [
      "85f11111-88db-41fd-a048-1c37266fd9e0",
      "day85_low_risk_apply_boundary_test_id",
      "day85_low_risk_apply_boundary_test_v1"
    ]);

    const protectedResult =
      await client.query<Day88ProtectedProposalState>(`
        select
          id::text,
          status,
          applied_at::text,
          applied_by
        from ai.proposal_inbox
        where id in (
          $1::uuid,
          $2::uuid
        )
        order by id
      `, [
        "14711111-88db-41fd-a048-1c37266fd9e0",
        "24fc24ee-8efa-436b-8424-9703edeeb297"
      ]);

    const cropCycle = await client.query<{
      protected_crop_cycle_exists: boolean;
    }>(`
      select exists (
        select 1
        from app.crop_cycles
        where id = 2
      ) as protected_crop_cycle_exists
    `);

    await client.query("rollback");

    const countRow = counts.rows[0];
    const day85Row = day85.rows[0];

    return {
      transaction_read_only:
        readOnly.rows[0]?.transaction_read_only === "on",
      proposal_count: countRow.proposal_count,
      decision_history_count:
        countRow.decision_history_count,
      apply_history_count: countRow.apply_history_count,
      crop_cycle_count: countRow.crop_cycle_count,
      day85_proposal_count: day85Row.day85_proposal_count,
      day85_decision_count: day85Row.day85_decision_count,
      day85_apply_count: day85Row.day85_apply_count,
      day85_proposal_status:
        day85Row.day85_proposal_status,
      day85_reviewed_by: day85Row.day85_reviewed_by,
      day85_applied_by: day85Row.day85_applied_by,
      day85_applied_at:
        day85Row.day85_applied_at?.toISOString() ?? null,
      protected_proposals: protectedResult.rows,
      protected_crop_cycle_exists:
        cropCycle.rows[0].protected_crop_cycle_exists
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const audit = readDay86Audit();

  const readinessInput: Day87ReadinessInput = {
    head: run("git", ["rev-parse", "--short", "HEAD"]),
    day86_commit_present: commitPresent("c2ced70"),
    git_clean: true,
    services: readServiceStates(),
    local_audit: audit.local,
    restore_audit: audit.restore,
    restore_consistency_valid:
      audit.restore_consistency_valid
  };

  const readiness =
    evaluateDay87PilotReadiness(readinessInput);

  const database =
    process.env.FARMOS_DAY88_DATABASE ??
    "farmos_core_local";

  const before = await readSnapshot(database);

  const inspectedResources = [
    "day85_proposal",
    "day85_decision_history",
    "day85_apply_history",
    "protected_proposals",
    "crop_cycle_count",
    "local_restore_consistency"
  ];

  const after = await readSnapshot(database);

  const completed =
    evaluateDay88PilotSession({
      head: readinessInput.head,
      day87_commit_present:
        commitPresent(DAY88_REQUIRED_BASE_COMMIT),
      git_clean: true,
      readiness,
      before,
      after,
      inspected_resources: inspectedResources,
      prohibited_action_attempted: false
    });

  assert.equal(completed.result, "completed");
  assert.equal(completed.session_invariant_valid, true);
  assert.equal(completed.database_write_detected, false);
  assert.deepEqual(completed.blockers, []);

  const changedAfter = {
    ...after,
    proposal_count: after.proposal_count + 1
  };

  const changedState =
    evaluateDay88PilotSession({
      head: readinessInput.head,
      day87_commit_present: true,
      git_clean: true,
      readiness,
      before,
      after: changedAfter,
      inspected_resources: inspectedResources,
      prohibited_action_attempted: false
    });

  assert.equal(changedState.result, "blocked");
  assert.equal(
    changedState.blockers.includes(
      "database_counts_changed"
    ),
    true
  );

  const prohibitedAction =
    evaluateDay88PilotSession({
      head: readinessInput.head,
      day87_commit_present: true,
      git_clean: true,
      readiness,
      before,
      after,
      inspected_resources: inspectedResources,
      prohibited_action_attempted: true
    });

  assert.equal(prohibitedAction.result, "blocked");
  assert.equal(
    prohibitedAction.blockers.includes(
      "prohibited_action_attempted"
    ),
    true
  );

  console.log(JSON.stringify({
    result: "ok",
    checked:
      "hermes_limited_readonly_pilot_session_boundary",
    session: completed,
    blocked_scenarios: {
      changed_state: changedState.blockers,
      prohibited_action: prohibitedAction.blockers
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    result: "error",
    message:
      error instanceof Error
        ? error.message
        : String(error)
  }, null, 2));

  process.exitCode = 1;
});
