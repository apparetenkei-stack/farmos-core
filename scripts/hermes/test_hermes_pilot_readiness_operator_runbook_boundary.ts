import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  DAY87_REQUIRED_BASE_COMMIT,
  evaluateDay87PilotReadiness,
  type Day87ReadinessInput,
  type Day87ServiceState
} from "../../src/lib/hermes/hermes_pilot_readiness_operator_runbook_boundary";
import {
  compareDay86AuditResults,
  type Day86AuditResult
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

function readDay86Audit(): Day86CommandOutput {
  const output = run("pnpm", [
    "run",
    "--silent",
    "test-hermes-apply-audit-restore-verification-boundary"
  ]);

  const jsonStart = output.indexOf("{");

  if (jsonStart < 0) {
    throw new Error("day86_audit_json_not_found");
  }

  const parsed = JSON.parse(
    output.slice(jsonStart)
  ) as Day86CommandOutput;

  assert.equal(parsed.result, "ok");
  assert.equal(
    compareDay86AuditResults(parsed.local, parsed.restore),
    true
  );

  return parsed;
}

function readHead(): string {
  return run("git", ["rev-parse", "--short", "HEAD"]);
}

function day86CommitPresent(): boolean {
  try {
    execFileSync(
      "git",
      [
        "merge-base",
        "--is-ancestor",
        DAY87_REQUIRED_BASE_COMMIT,
        "HEAD"
      ],
      {
        stdio: "ignore",
        env: process.env
      }
    );
    return true;
  } catch {
    return false;
  }
}

function readServiceStates(): Day87ServiceState[] {
  const output = run("docker", [
    "compose",
    "ps",
    "--services",
    "--status",
    "running"
  ]);

  const running = new Set(
    output.split("\n").map((value) => value.trim()).filter(Boolean)
  );

  return ["postgres", "redis", "minio", "qdrant"].map(
    (service) => ({
      service,
      running: running.has(service)
    })
  );
}

function cloneAudit(value: Day86AuditResult): Day86AuditResult {
  return JSON.parse(JSON.stringify(value)) as Day86AuditResult;
}

function main(): void {
  const audit = readDay86Audit();

  const input: Day87ReadinessInput = {
    head: readHead(),
    day86_commit_present: day86CommitPresent(),
    git_clean: true,
    services: readServiceStates(),
    local_audit: audit.local,
    restore_audit: audit.restore,
    restore_consistency_valid: audit.restore_consistency_valid
  };

  const readyResult = evaluateDay87PilotReadiness(input);

  assert.equal(readyResult.result, "ready");
  assert.equal(readyResult.pilot_readiness_valid, true);
  assert.deepEqual(readyResult.blockers, []);
  assert.equal(readyResult.required_services_running, true);
  assert.equal(readyResult.head_valid, true);
  assert.equal(readyResult.app_schema_write_detected, false);

  const missingRedisResult = evaluateDay87PilotReadiness({
    ...input,
    services: input.services.map((service) => ({
      ...service,
      running:
        service.service === "redis" ? false : service.running
    }))
  });

  assert.equal(missingRedisResult.result, "blocked");
  assert.equal(
    missingRedisResult.blockers.includes(
      "required_service_not_running:redis"
    ),
    true
  );

  const dirtyGitResult = evaluateDay87PilotReadiness({
    ...input,
    git_clean: false
  });

  assert.equal(dirtyGitResult.result, "blocked");
  assert.equal(
    dirtyGitResult.blockers.includes(
      "git_working_tree_not_clean"
    ),
    true
  );

  const writeAudit = cloneAudit(input.local_audit);
  writeAudit.app_schema_write_detected = true;

  const writeDetectedResult = evaluateDay87PilotReadiness({
    ...input,
    local_audit: writeAudit
  });

  assert.equal(writeDetectedResult.result, "blocked");
  assert.equal(
    writeDetectedResult.blockers.includes(
      "unexpected_app_schema_write_detected"
    ),
    true
  );

  console.log(JSON.stringify({
    result: "ok",
    checked: "hermes_pilot_readiness_operator_runbook_boundary",
    ready: readyResult,
    blocked_scenarios: {
      missing_service: missingRedisResult.blockers,
      dirty_git: dirtyGitResult.blockers,
      app_schema_write: writeDetectedResult.blockers
    }
  }, null, 2));
}

main();
