import assert from "node:assert/strict";
import { hashFarmOsProductionTargetExecutionContract } from
  "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  executeFarmOsDay150InstallerQualification,
  selectFarmOsDay150NumericIdentity,
  type FarmOsDay150AdoptionRecord,
  type FarmOsDay150InstallJournalEntry,
  type FarmOsDay150InstallJournal,
  type FarmOsDay150InstallObject,
  type FarmOsDay150InstallerSyscallPort,
  type FarmOsDay150PreexistingState,
} from "./lib/farm_os_day150_installer_adoption_executor";

const digest = (value: string) => `sha256:${value.repeat(64)}` as const;
assert.deepEqual(selectFarmOsDay150NumericIdentity({ occupied_uids: [200, 201],
  occupied_gids: [202], reserved_ids: [203] }), { uid: 204, gid: 204 });
assert.equal(selectFarmOsDay150NumericIdentity({ occupied_uids: [], occupied_gids: [],
  reserved_ids: [-1] }), null);
assert.equal(selectFarmOsDay150NumericIdentity({ occupied_uids: Array.from({ length: 300 },
  (_, index) => index + 200), occupied_gids: [], reserved_ids: [] }), null);

const absent: FarmOsDay150PreexistingState = Object.freeze({ principal: "ABSENT", root: "ABSENT",
  artifacts: "ABSENT", adoption_record: "ABSENT", adopted_numeric_identity: null });
class FakeInstallerPort implements FarmOsDay150InstallerSyscallPort {
  readonly port_authority = "farmos.day150-installer-syscall-seam.v1" as const;
  readonly created: FarmOsDay150InstallObject[] = [];
  readonly removed: FarmOsDay150InstallObject[] = [];
  released = false;
  committed = false;
  journal: FarmOsDay150InstallJournal | null;
  constructor(readonly failAt: number | null = null,
    readonly preexisting: FarmOsDay150PreexistingState = absent,
    incomplete: FarmOsDay150InstallJournal | null = null) { this.journal = incomplete; }
  async loadIncompleteJournal() { return this.journal; }
  async persistIncompleteJournal(journal: FarmOsDay150InstallJournal) { this.journal = journal; }
  async clearIncompleteJournal() {
    if (this.failAt === 11 && this.committed) throw new Error("CLEAR_AFTER_COMMIT_FAILED");
    this.journal = null;
  }
  async inspectPreexistingState() { return this.preexisting; }
  async inspectNumericIdentities() { return { occupied_uids: [200], occupied_gids: [201],
    reserved_ids: [202] }; }
  async reserveNumericIdentityCAS() { return true; }
  async createAndVerify(object: FarmOsDay150InstallObject) {
    if (this.failAt === this.created.length) throw new Error(`FAIL_AT_${object}`);
    this.created.push(object); return { identity: `fixture:${object}` };
  }
  async independentlyVerifyInstalledSet() { return {
    installed_set_digest: this.failAt === 9 ? "invalid" as never : digest("a"),
    apfs_device_identity_digest: digest("c"), launch_configuration_digest: digest("d"),
    validator_broker: {
      path: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1/bin/farmos-c2b-validator-broker",
      sha256: digest("e"),
      signing_identifier: "org.farmos.day150.c2b-bootstrap.validator-broker",
      owner_uid: 0 as const, owner_gid: 0 as const, mode: "0555" as const,
    },
    writer_worker: {
      path: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1/bin/farmos-c2b-writer-worker",
      sha256: digest("f"),
      signing_identifier: "org.farmos.day150.c2b-bootstrap.writer-worker",
      owner_uid: 0 as const, owner_gid: 0 as const, mode: "0555" as const,
    },
    signature_policy: "APPLE_CODESIGN_DESIGNATED_REQUIREMENT_TEAM_AND_BUNDLE_EXACT" as const,
    filesystem_policy: "REGULAR_NO_SYMLINK_NLINK1_OWNER_GROUP_MODE_DEVICE_EXACT" as const,
  }; }
  async commitAdoptionRecord(record: FarmOsDay150AdoptionRecord) {
    if (this.failAt === 10) return {
      status: "DURABLE_COMMITTED_AND_READBACK_VERIFIED" as const,
      record_digest: digest("f"),
    };
    this.committed = true;
    return {
    status: "DURABLE_COMMITTED_AND_READBACK_VERIFIED" as const,
    record_digest: hashFarmOsProductionTargetExecutionContract(
      "farmos.day150-c2b-installation-adoption-record.v1", record),
    };
  }
  async removeExactAttemptObject(entry: FarmOsDay150InstallJournalEntry) {
    this.removed.push(entry.object); return "REMOVED" as const;
  }
  async releaseNumericIdentityReservation() { this.released = true; }
}

const successPort = new FakeInstallerPort();
const success = await executeFarmOsDay150InstallerQualification({ attempt_id: "install_0001",
  profile_digest: digest("b"), port: successPort });
assert.equal(success.status, "SOURCE_QUALIFICATION_INSTALLED_AND_ADOPTED");
assert.equal(successPort.created.length, 9);
assert.equal(successPort.removed.length, 0);
for (let failure = 0; failure < 11; failure += 1) {
  const port = new FakeInstallerPort(failure);
  const result = await executeFarmOsDay150InstallerQualification({ attempt_id: "install_0002",
    profile_digest: digest("b"), port });
  assert.equal(result.status, "FAILED_COMPENSATED");
  assert.deepEqual(port.removed, [...port.created].reverse());
  assert.equal(port.released, true);
}
const committedPort = new FakeInstallerPort(11);
const committedFailure = await executeFarmOsDay150InstallerQualification({
  attempt_id: "install_0006", profile_digest: digest("b"), port: committedPort,
});
assert.equal(committedFailure.status, "FAILED_CLOSED");
assert.equal(committedPort.removed.length, 0);
assert.equal(committedPort.committed, true);
for (const preexisting of [
  { ...absent, principal: "UNEXPECTED" as const },
  { ...absent, root: "UNEXPECTED" as const },
  { ...absent, artifacts: "PARTIAL_OR_UNEXPECTED" as const },
  { ...absent, adoption_record: "INVALID_OR_AMBIGUOUS" as const },
]) {
  const result = await executeFarmOsDay150InstallerQualification({ attempt_id: "install_0003",
    profile_digest: digest("b"), port: new FakeInstallerPort(null, preexisting) });
  assert.equal(result.status, "FAILED_CLOSED");
}
const rerun = await executeFarmOsDay150InstallerQualification({ attempt_id: "install_0004",
  profile_digest: digest("b"), port: new FakeInstallerPort(null, {
    principal: "EXACT_ADOPTED", root: "EXACT_ADOPTED", artifacts: "EXACT_ADOPTED",
    adoption_record: "EXACT_VALID", adopted_numeric_identity: { uid: 203, gid: 203 },
  }) });
assert.equal(rerun.status, "EXACT_ADOPTED_RERUN");
const incomplete: FarmOsDay150InstallJournal = Object.freeze({ attempt_id: "install_lost",
  selected_identity: { uid: 204, gid: 204 }, authority_committed: false,
  entries: Object.freeze([
    Object.freeze({ step: 1, object: "GROUP", identity: "fixture:GROUP",
      created_by_attempt: true, verified_after_create: true }),
    Object.freeze({ step: 2, object: "PRINCIPAL", identity: "fixture:PRINCIPAL",
      created_by_attempt: true, verified_after_create: true }),
  ]),
});
const recoveryPort = new FakeInstallerPort(null, absent, incomplete);
const recovered = await executeFarmOsDay150InstallerQualification({ attempt_id: "install_0005",
  profile_digest: digest("b"), port: recoveryPort });
assert.equal(recovered.status, "FAILED_COMPENSATED");
assert.deepEqual(recoveryPort.removed, ["PRINCIPAL", "GROUP"]);
assert.equal(recoveryPort.journal, null);
console.log(JSON.stringify({ status: "PASS", failure_steps: 12, canonical_operations: 0,
  principal_mutations: 0 }));
