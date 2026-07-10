import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  DAY89_REQUIRED_BASE_COMMIT,
  evaluateDay89IncidentStop,
  evaluateDay89Recovery,
  type Day89IncidentSignal
} from "../../src/lib/hermes/hermes_pilot_incident_stop_recovery_drill_boundary";
import type {
  Day87ReadinessResult
} from "../../src/lib/hermes/hermes_pilot_readiness_operator_runbook_boundary";
import type {
  Day88PilotSessionResult
} from "../../src/lib/hermes/hermes_limited_readonly_pilot_session_boundary";

type Day87CommandOutput = {
  result: "ok";
  ready: Day87ReadinessResult;
};

type Day88CommandOutput = {
  result: "ok";
  session: Day88PilotSessionResult;
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

function commitPresent(commit: string): boolean {
  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", commit, "HEAD"],
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

function readDay87Readiness(): Day87ReadinessResult {
  const output = run("pnpm", [
    "run",
    "--silent",
    "test-hermes-pilot-readiness-operator-runbook-boundary"
  ]);

  return parseJsonOutput<Day87CommandOutput>(output).ready;
}

function readDay88Session(): Day88PilotSessionResult {
  const output = run("pnpm", [
    "run",
    "--silent",
    "test-hermes-limited-readonly-pilot-session-boundary"
  ]);

  return parseJsonOutput<Day88CommandOutput>(output).session;
}

function allRequiredServicesRunning(): boolean {
  const output = run("docker", [
    "compose",
    "ps",
    "--services",
    "--status",
    "running"
  ]);

  const running = new Set(
    output
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean)
  );

  return ["postgres", "redis", "minio", "qdrant"].every(
    (service) => running.has(service)
  );
}

function incident(
  type: Day89IncidentSignal["type"],
  detail: string
): Day89IncidentSignal {
  return {
    type,
    detected: true,
    detail
  };
}

function main(): void {
  const head = run("git", ["rev-parse", "--short", "HEAD"]);

  const activeSession = readDay88Session();

  const databaseCountIncident =
    evaluateDay89IncidentStop({
      head,
      day88_commit_present:
        commitPresent(DAY89_REQUIRED_BASE_COMMIT),
      git_clean: true,
      active_session: activeSession,
      incident_signals: [
        incident(
          "database_count_change",
          "simulated proposal count changed from 129 to 130"
        )
      ],
      operator_identity_confirmed: true
    });

  assert.equal(databaseCountIncident.result, "stopped");
  assert.equal(
    databaseCountIncident.incident_detected,
    true
  );
  assert.equal(
    databaseCountIncident.apply_blocked,
    true
  );
  assert.equal(
    databaseCountIncident.proposal_write_blocked,
    true
  );
  assert.equal(
    databaseCountIncident.app_schema_write_blocked,
    true
  );
  assert.equal(
    databaseCountIncident.automatic_recovery_blocked,
    true
  );
  assert.equal(
    databaseCountIncident.pilot_restart_allowed,
    false
  );
  assert.equal(
    databaseCountIncident.stop_invariant_valid,
    true
  );

  const protectedProposalIncident =
    evaluateDay89IncidentStop({
      head,
      day88_commit_present: true,
      git_clean: true,
      active_session: activeSession,
      incident_signals: [
        incident(
          "protected_proposal_change",
          "simulated protected proposal status changed"
        )
      ],
      operator_identity_confirmed: true
    });

  assert.equal(protectedProposalIncident.result, "stopped");

  const serviceIncident =
    evaluateDay89IncidentStop({
      head,
      day88_commit_present: true,
      git_clean: true,
      active_session: activeSession,
      incident_signals: [
        incident(
          "required_service_stopped",
          "simulated redis service stopped"
        )
      ],
      operator_identity_confirmed: true
    });

  assert.equal(serviceIncident.result, "stopped");

  const appWriteIncident =
    evaluateDay89IncidentStop({
      head,
      day88_commit_present: true,
      git_clean: true,
      active_session: activeSession,
      incident_signals: [
        incident(
          "app_schema_write_detected",
          "simulated app schema write detected"
        )
      ],
      operator_identity_confirmed: true
    });

  assert.equal(appWriteIncident.result, "stopped");

  const identityIncident =
    evaluateDay89IncidentStop({
      head,
      day88_commit_present: true,
      git_clean: true,
      active_session: activeSession,
      incident_signals: [],
      operator_identity_confirmed: false
    });

  assert.equal(identityIncident.result, "stopped");
  assert.equal(
    identityIncident.detected_incidents.includes(
      "operator_identity_uncertain"
    ),
    true
  );
  assert.equal(
    identityIncident.pilot_restart_allowed,
    false
  );

  const noIncident =
    evaluateDay89IncidentStop({
      head,
      day88_commit_present: true,
      git_clean: true,
      active_session: activeSession,
      incident_signals: [],
      operator_identity_confirmed: true
    });

  assert.equal(noIncident.result, "no_incident");
  assert.equal(noIncident.incident_detected, false);
  assert.equal(
    noIncident.blockers.includes("incident_not_detected"),
    true
  );

  const readinessAfterRecovery = readDay87Readiness();
  const sessionAfterRecovery = readDay88Session();

  const recovered =
    evaluateDay89Recovery({
      stop_result: databaseCountIncident,
      readiness_after_recovery: readinessAfterRecovery,
      session_after_recovery: sessionAfterRecovery,
      local_restore_consistency_valid:
        readinessAfterRecovery.restore_consistency_valid,
      database_counts_valid:
        sessionAfterRecovery.counts_unchanged,
      protected_records_valid:
        sessionAfterRecovery.protected_proposals_unchanged &&
        sessionAfterRecovery.protected_crop_cycle_unchanged,
      required_services_running:
        allRequiredServicesRunning(),
      operator_identity_confirmed: true
    });

  assert.equal(recovered.result, "recovered");
  assert.equal(
    recovered.recovery_invariant_valid,
    true
  );
  assert.equal(
    recovered.database_write_detected,
    false
  );
  assert.equal(
    recovered.pilot_restart_allowed,
    true
  );
  assert.deepEqual(recovered.blockers, []);

  const blockedRecovery =
    evaluateDay89Recovery({
      stop_result: databaseCountIncident,
      readiness_after_recovery: readinessAfterRecovery,
      session_after_recovery: sessionAfterRecovery,
      local_restore_consistency_valid: true,
      database_counts_valid: false,
      protected_records_valid: true,
      required_services_running: true,
      operator_identity_confirmed: true
    });

  assert.equal(blockedRecovery.result, "blocked");
  assert.equal(
    blockedRecovery.pilot_restart_allowed,
    false
  );
  assert.equal(
    blockedRecovery.blockers.includes(
      "database_counts_invalid"
    ),
    true
  );
  assert.equal(
    blockedRecovery.blockers.includes(
      "database_write_or_state_change_detected"
    ),
    true
  );

  console.log(JSON.stringify({
    result: "ok",
    checked:
      "hermes_pilot_incident_stop_recovery_drill_boundary",
    stop_drills: {
      database_count_change: databaseCountIncident,
      protected_proposal_change: {
        result: protectedProposalIncident.result,
        detected_incidents:
          protectedProposalIncident.detected_incidents
      },
      required_service_stopped: {
        result: serviceIncident.result,
        detected_incidents:
          serviceIncident.detected_incidents
      },
      app_schema_write_detected: {
        result: appWriteIncident.result,
        detected_incidents:
          appWriteIncident.detected_incidents
      },
      operator_identity_uncertain: {
        result: identityIncident.result,
        detected_incidents:
          identityIncident.detected_incidents
      }
    },
    no_incident: {
      result: noIncident.result,
      blockers: noIncident.blockers
    },
    recovery: recovered,
    blocked_recovery: {
      result: blockedRecovery.result,
      blockers: blockedRecovery.blockers
    }
  }, null, 2));
}

main();
