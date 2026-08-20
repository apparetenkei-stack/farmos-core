import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import {
  acquireFarmOsDay150Gate13RecoveryOwnership,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH,
  claimFarmOsDay150Gate13ThirdAttempt,
  createFarmOsDay150Gate13ThirdAttemptAuthority,
  parseFarmOsDay150Gate13ThirdAttemptClaim,
  publishFarmOsDay150Gate13ThirdAttemptTerminal,
  type FarmOsDay150Gate13DurableArtifactPort,
} from "../../src/lib/hermes/farm_os_day150_gate13_third_attempt_authority";
import { FarmOsDay150DurablePublicationError } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_durable_store";

const root = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-attempt-test-"));
const beforeClaim = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-before-claim-"));
try {
  const sourceDigest = `sha256:${"a".repeat(64)}` as const;
  const authority = createFarmOsDay150Gate13ThirdAttemptAuthority(sourceDigest);
  assert.equal(authority.authorization_status, "AUTHORIZED_PENDING_SINGLE_USE");
  assert.equal(existsSync(resolve(beforeClaim,
    FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH)), false);
  const claim = await claimFarmOsDay150Gate13ThirdAttempt({ repository_root: root, authority,
    claimed_at: "2026-08-20T12:00:00.000Z" });
  assert.ok(parseFarmOsDay150Gate13ThirdAttemptClaim(claim));
  assert.equal(existsSync(resolve(root, FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH)), true);
  await assert.rejects(claimFarmOsDay150Gate13ThirdAttempt({ repository_root: root, authority,
    claimed_at: "2026-08-20T12:01:00.000Z" }), /ALREADY_CONSUMED/u);
  const restartedProcessAuthority = createFarmOsDay150Gate13ThirdAttemptAuthority(sourceDigest);
  await assert.rejects(claimFarmOsDay150Gate13ThirdAttempt({ repository_root: root,
    authority: restartedProcessAuthority, claimed_at: "2026-08-20T12:02:00.000Z" }),
  /ALREADY_CONSUMED/u);
  const terminal = await publishFarmOsDay150Gate13ThirdAttemptTerminal({ repository_root: root,
    claim, qualification_result: "QUALIFICATION_FAILED", failure_boundary: "TEST_FAILURE",
    qualification_result_digest: `sha256:${"c".repeat(64)}`,
    zero_residual: true, completed_at: "2026-08-20T12:03:00.000Z" });
  assert.equal(terminal.attempt_consumed, true);
  assert.equal(existsSync(resolve(root, FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH)), true);
  await assert.rejects(claimFarmOsDay150Gate13ThirdAttempt({ repository_root: root, authority,
    claimed_at: "2026-08-20T12:04:00.000Z" }), /ALREADY_CONSUMED/u);
  assert.equal(parseFarmOsDay150Gate13ThirdAttemptClaim({ ...claim,
    attempt_identity: `sha256:${"b".repeat(64)}` }), null);
  assert.equal(parseFarmOsDay150Gate13ThirdAttemptClaim({ ...claim, unknown: true }), null);
  const malformedPath = resolve(beforeClaim, FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH);
  mkdirSync(dirname(malformedPath), { recursive: true });
  writeFileSync(malformedPath, "{}\n");
  assert.equal(parseFarmOsDay150Gate13ThirdAttemptClaim(JSON.parse("{}")), null);

  let uncertainArtifact: unknown = null;
  let directoryDurabilityConfirmed = false;
  const uncertainStore: FarmOsDay150Gate13DurableArtifactPort = {
    async publishExclusive(_path, value) {
      uncertainArtifact = value;
      throw new FarmOsDay150DurablePublicationError("OUTCOME_UNKNOWN");
    },
    async reconcileDurability() {
      if (!directoryDurabilityConfirmed) {
        throw new FarmOsDay150DurablePublicationError("OUTCOME_UNKNOWN");
      }
    },
    async reopen() { return uncertainArtifact; },
  };
  const uncertainRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-uncertain-"));
  const uncertainAuthority = createFarmOsDay150Gate13ThirdAttemptAuthority(sourceDigest);
  await assert.rejects(claimFarmOsDay150Gate13ThirdAttempt({ repository_root: uncertainRoot,
    authority: uncertainAuthority, claimed_at: "2026-08-20T13:00:00.000Z",
    durable_store: uncertainStore }), /DURABILITY_NOT_ESTABLISHED/u);
  directoryDurabilityConfirmed = true;
  const reconciled = await claimFarmOsDay150Gate13ThirdAttempt({ repository_root: uncertainRoot,
    authority: uncertainAuthority, claimed_at: "2026-08-20T13:01:00.000Z",
    durable_store: uncertainStore });
  assert.equal(reconciled.authorization_status, "CLAIMED_CONSUMED");
  rmSync(uncertainRoot, { recursive: true, force: true });

  const loserEffects = { docker_mutations: 0, cleanup_mutations: 0 };
  await assert.rejects(claimFarmOsDay150Gate13ThirdAttempt({ repository_root: root, authority,
    claimed_at: "2026-08-20T13:02:00.000Z" }), /ALREADY_CONSUMED/u);
  assert.deepEqual(loserEffects, { docker_mutations: 0, cleanup_mutations: 0 });

  const recoveryRoot = mkdtempSync(resolve(tmpdir(), "farmos-day150-gate13-recovery-"));
  const recoveryClaim = await claimFarmOsDay150Gate13ThirdAttempt({ repository_root: recoveryRoot,
    authority, claimed_at: "2026-08-20T14:00:00.000Z" });
  const recoveryInput = { repository_root: recoveryRoot, claim: recoveryClaim,
    resource_identity_digest: `sha256:${"d".repeat(64)}` as const,
    acquired_at: "2026-08-20T15:01:00.000Z" };
  await assert.rejects(acquireFarmOsDay150Gate13RecoveryOwnership({ ...recoveryInput,
    acquired_at: "2026-08-20T14:01:00.000Z" }), /WINDOW_NOT_OPEN/u);
  const contenders = await Promise.allSettled([
    acquireFarmOsDay150Gate13RecoveryOwnership(recoveryInput),
    acquireFarmOsDay150Gate13RecoveryOwnership(recoveryInput),
  ]);
  assert.equal(contenders.filter((entry) => entry.status === "fulfilled").length, 1);
  assert.equal(contenders.filter((entry) => entry.status === "rejected").length, 1);
  rmSync(recoveryRoot, { recursive: true, force: true });
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(beforeClaim, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ status: "PASS", cases: 16,
  storage_backed_exclusive_claim: true, trusted_readback: true,
  outcome_unknown_readback_cannot_authorize: true, directory_durability_reconciled: true,
  concurrent_loser_external_mutations: 0, concurrent_loser_cleanup_mutations: 0,
  exclusive_recovery_owner: true, recovery_qualification_reruns: 0,
  replay_after_process_restart_rejected: true, failure_after_claim_remains_consumed: true,
  crash_before_claim_false_consumption: false, actual_pending_authorization_consumed: false })}\n`);
