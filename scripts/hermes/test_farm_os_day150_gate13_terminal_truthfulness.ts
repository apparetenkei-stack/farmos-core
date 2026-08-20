import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  acquireFarmOsDay150Gate13RecoveryOwnership,
  claimFarmOsDay150Gate13ThirdAttempt,
  createFarmOsDay150Gate13ThirdAttemptAuthority,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_PATH,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH,
  parseFarmOsDay150Gate13ThirdAttemptTerminal,
  publishFarmOsDay150Gate13ThirdAttemptTerminal,
} from "../../src/lib/hermes/farm_os_day150_gate13_third_attempt_authority";
import { reopenCanonicalFarmOsDay150Artifact } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store";
import {
  decideFarmOsDay150Gate13Terminal,
  isFarmOsDay150Gate13ResidualRecoveryPermitted,
  reconcileFarmOsDay150Gate13ResidualFailure,
} from "./lib/farm_os_day150_gate13_terminal_truthfulness";

const sourceDigest = `sha256:${"a".repeat(64)}` as const;
const authority = createFarmOsDay150Gate13ThirdAttemptAuthority(sourceDigest);
const residualRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-residual-fault-"));
const successRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-success-regression-"));
const falseSuccessRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-false-success-"));
try {
  const claim = await claimFarmOsDay150Gate13ThirdAttempt({ repository_root: residualRoot,
    authority, claimed_at: "2026-08-20T12:00:00.000Z" });
  let cleanupCalls = 0;
  const cleanupReturnedNormally = () => { cleanupCalls += 1; return { zero_residual: false }; };
  const cleanup = cleanupReturnedNormally();
  const decision = decideFarmOsDay150Gate13Terminal({ semantic_qualification_passed: true,
    semantic_failure_boundary: null, cleanup_observation: cleanup.zero_residual
      ? "ZERO_RESIDUAL_CONFIRMED" : "RESIDUAL_PRESENT_CONFIRMED",
    result_publication: "RESULT_NOT_REQUIRED" });
  assert.deepEqual(decision, { qualification_result: "QUALIFICATION_FAILED",
    failure_boundary: "QUALIFICATION_ZERO_RESIDUAL_FALSE", zero_residual: false,
    recovery_permitted: true, qualification_rerun_count: 0, history_rewrite_count: 0 });
  const terminal = await publishFarmOsDay150Gate13ThirdAttemptTerminal({
    repository_root: residualRoot, claim, qualification_result: decision.qualification_result,
    qualification_result_digest: `sha256:${"b".repeat(64)}`,
    failure_boundary: decision.failure_boundary, zero_residual: decision.zero_residual,
    completed_at: "2026-08-20T12:01:00.000Z" });
  const readback = parseFarmOsDay150Gate13ThirdAttemptTerminal(
    await reopenCanonicalFarmOsDay150Artifact(resolve(residualRoot,
      FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH)));
  assert.deepEqual(readback, terminal);
  assert.equal(isFarmOsDay150Gate13ResidualRecoveryPermitted(terminal), true);
  const recovered = await reconcileFarmOsDay150Gate13ResidualFailure({ terminal,
    acquire_recovery_ownership: async () => {
      await acquireFarmOsDay150Gate13RecoveryOwnership({ repository_root: residualRoot, claim,
        resource_identity_digest: `sha256:${"c".repeat(64)}`,
        acquired_at: "2026-08-20T13:01:00.000Z" });
    },
    reconcile_owned_resources: async () => ({ zero_residual: true }),
  });
  assert.equal(recovered.recovery_zero_residual, true);
  assert.equal(recovered.qualification_rerun_count, 0);
  assert.equal(recovered.history_rewrite_count, 0);
  assert.equal(existsSync(resolve(residualRoot,
    FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_PATH)), true);
  assert.deepEqual(parseFarmOsDay150Gate13ThirdAttemptTerminal(
    await reopenCanonicalFarmOsDay150Artifact(resolve(residualRoot,
      FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH))), terminal);
  assert.equal(cleanupCalls, 1);

  const successClaim = await claimFarmOsDay150Gate13ThirdAttempt({ repository_root: successRoot,
    authority, claimed_at: "2026-08-20T14:00:00.000Z" });
  const success = decideFarmOsDay150Gate13Terminal({ semantic_qualification_passed: true,
    semantic_failure_boundary: null, cleanup_observation: "ZERO_RESIDUAL_CONFIRMED",
    result_publication: "DURABLE_RESULT_PUBLISHED" });
  assert.equal(success.qualification_result, "QUALIFICATION_SUCCESS");
  assert.equal(success.zero_residual, true);
  assert.ok(await publishFarmOsDay150Gate13ThirdAttemptTerminal({ repository_root: successRoot,
    claim: successClaim, qualification_result: success.qualification_result,
    qualification_result_digest: `sha256:${"d".repeat(64)}`,
    failure_boundary: success.failure_boundary, zero_residual: success.zero_residual,
    completed_at: "2026-08-20T14:01:00.000Z" }));
  await assert.rejects(publishFarmOsDay150Gate13ThirdAttemptTerminal({
    repository_root: falseSuccessRoot,
    claim: successClaim, qualification_result: "QUALIFICATION_SUCCESS",
    qualification_result_digest: `sha256:${"e".repeat(64)}`, failure_boundary: null,
    zero_residual: false, completed_at: "2026-08-20T14:02:00.000Z",
  }), /TERMINAL_CANDIDATE_INVALID/u);
  const unknown = decideFarmOsDay150Gate13Terminal({ semantic_qualification_passed: true,
    semantic_failure_boundary: null, cleanup_observation: "CLEANUP_OUTCOME_UNKNOWN",
    result_publication: "RESULT_NOT_REQUIRED" });
  assert.equal(unknown.qualification_result, "QUALIFICATION_OUTCOME_UNKNOWN");
  assert.equal(unknown.recovery_permitted, true);
} finally {
  rmSync(residualRoot, { recursive: true, force: true });
  rmSync(successRoot, { recursive: true, force: true });
  rmSync(falseSuccessRoot, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ status: "PASS", false_success_published: false,
  residual_failure_terminal: "QUALIFICATION_FAILED", recovery_available: true,
  qualification_reruns: 0, history_rewrites: 0, success_regression: "PASS",
  cleanup_ambiguity: "QUALIFICATION_OUTCOME_UNKNOWN" })}\n`);
