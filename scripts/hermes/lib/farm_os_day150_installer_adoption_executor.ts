import { hashFarmOsProductionTargetExecutionContract } from
  "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";

export const FARM_OS_DAY150_INSTALLER_AUTHORITY =
  "farmos.day150-c2b-installer-adoption-executor.v1" as const;
export const FARM_OS_DAY150_PRINCIPAL_NAME = "farmos_c2b_bootstrap" as const;
export const FARM_OS_DAY150_NUMERIC_ID_DOMAIN = Object.freeze({ minimum: 200, maximum: 499 });

export type FarmOsDay150NumericIdentity = Readonly<{ uid: number; gid: number }>;
export type FarmOsDay150InstalledArtifactIdentity = Readonly<{
  path: string; sha256: `sha256:${string}`; signing_identifier: string;
  owner_uid: 0; owner_gid: 0; mode: "0555";
}>;
export function selectFarmOsDay150NumericIdentity(input: Readonly<{
  occupied_uids: readonly number[]; occupied_gids: readonly number[];
  reserved_ids: readonly number[];
}>): FarmOsDay150NumericIdentity | null {
  const lists = [input.occupied_uids, input.occupied_gids, input.reserved_ids];
  if (lists.some((list) => !Array.isArray(list) || list.some((value) =>
    !Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647))) return null;
  const occupied = new Set([...input.occupied_uids, ...input.occupied_gids, ...input.reserved_ids]);
  for (let identity = FARM_OS_DAY150_NUMERIC_ID_DOMAIN.minimum;
    identity <= FARM_OS_DAY150_NUMERIC_ID_DOMAIN.maximum; identity += 1) {
    if (!occupied.has(identity)) return Object.freeze({ uid: identity, gid: identity });
  }
  return null;
}

export type FarmOsDay150InstallObject = "GROUP" | "PRINCIPAL" | "CANONICAL_ROOT" |
  "CEREMONY_CLIENT" | "VALIDATOR_BROKER" | "WRITER_WORKER" | "FRESH_AUTH_COMPANION" |
  "CONFIGURATION" | "LAUNCH_CONFIGURATION";
export type FarmOsDay150InstallJournalEntry = Readonly<{
  step: number; object: FarmOsDay150InstallObject; identity: string;
  created_by_attempt: true; verified_after_create: true;
}>;
export type FarmOsDay150InstallJournal = Readonly<{
  attempt_id: string; selected_identity: FarmOsDay150NumericIdentity;
  entries: readonly FarmOsDay150InstallJournalEntry[];
  authority_committed: false;
}>;

export type FarmOsDay150PreexistingState = Readonly<{
  principal: "ABSENT" | "EXACT_ADOPTED" | "UNEXPECTED";
  root: "ABSENT" | "EXACT_ADOPTED" | "UNEXPECTED";
  artifacts: "ABSENT" | "EXACT_ADOPTED" | "PARTIAL_OR_UNEXPECTED";
  adoption_record: "ABSENT" | "EXACT_VALID" | "INVALID_OR_AMBIGUOUS";
  adopted_numeric_identity: FarmOsDay150NumericIdentity | null;
}>;

export interface FarmOsDay150InstallerSyscallPort {
  readonly port_authority: "farmos.day150-installer-syscall-seam.v1";
  loadIncompleteJournal(): Promise<FarmOsDay150InstallJournal | null>;
  persistIncompleteJournal(journal: FarmOsDay150InstallJournal): Promise<void>;
  clearIncompleteJournal(attempt_id: string): Promise<void>;
  inspectPreexistingState(): Promise<FarmOsDay150PreexistingState>;
  inspectNumericIdentities(): Promise<Readonly<{
    occupied_uids: readonly number[]; occupied_gids: readonly number[];
    reserved_ids: readonly number[];
  }>>;
  reserveNumericIdentityCAS(identity: FarmOsDay150NumericIdentity): Promise<boolean>;
  createAndVerify(object: FarmOsDay150InstallObject,
    identity: FarmOsDay150NumericIdentity): Promise<Readonly<{ identity: string }>>;
  independentlyVerifyInstalledSet(input: Readonly<{
    numeric_identity: FarmOsDay150NumericIdentity;
    journal: readonly FarmOsDay150InstallJournalEntry[];
  }>): Promise<Readonly<{ installed_set_digest: `sha256:${string}`;
    apfs_device_identity_digest: `sha256:${string}`;
    launch_configuration_digest: `sha256:${string}`;
    validator_broker: FarmOsDay150InstalledArtifactIdentity;
    writer_worker: FarmOsDay150InstalledArtifactIdentity;
    signature_policy: "APPLE_CODESIGN_DESIGNATED_REQUIREMENT_TEAM_AND_BUNDLE_EXACT";
    filesystem_policy: "REGULAR_NO_SYMLINK_NLINK1_OWNER_GROUP_MODE_DEVICE_EXACT" }>>;
  commitAdoptionRecord(record: FarmOsDay150AdoptionRecord): Promise<Readonly<{
    status: "DURABLE_COMMITTED_AND_READBACK_VERIFIED";
    record_digest: `sha256:${string}`;
  }>>;
  removeExactAttemptObject(entry: FarmOsDay150InstallJournalEntry): Promise<"REMOVED">;
  releaseNumericIdentityReservation(identity: FarmOsDay150NumericIdentity): Promise<void>;
}

export type FarmOsDay150AdoptionRecord = Readonly<{
  schema_version: "farmos.day150-c2b-installation-adoption-record.v1";
  attempt_id: string; principal_name: typeof FARM_OS_DAY150_PRINCIPAL_NAME;
  account_api: "OPENDIRECTORY_ODSESSION_LOCAL_NODE_ODRECORD_USER_AND_GROUP";
  numeric_identity: FarmOsDay150NumericIdentity;
  installed_set_digest: `sha256:${string}`;
  apfs_device_identity_digest: `sha256:${string}`;
  launch_configuration_digest: `sha256:${string}`;
  validator_broker: FarmOsDay150InstalledArtifactIdentity;
  writer_worker: FarmOsDay150InstalledArtifactIdentity;
  profile_digest: `sha256:${string}`;
  journal_digest: `sha256:${string}`;
  canonical_root: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1";
  authority_committed: true;
}>;

const OBJECTS: readonly FarmOsDay150InstallObject[] = Object.freeze([
  "GROUP", "PRINCIPAL", "CANONICAL_ROOT", "CEREMONY_CLIENT", "VALIDATOR_BROKER",
  "WRITER_WORKER", "FRESH_AUTH_COMPANION", "CONFIGURATION", "LAUNCH_CONFIGURATION",
]);
const ATTEMPT = /^[a-z0-9][a-z0-9_-]{7,63}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;

export type FarmOsDay150InstallerResult = Readonly<{
  status: "SOURCE_QUALIFICATION_INSTALLED_AND_ADOPTED";
  adoption_record: FarmOsDay150AdoptionRecord; canonical_operations: 0;
}> | Readonly<{ status: "EXACT_ADOPTED_RERUN"; canonical_operations: 0 }> |
  Readonly<{ status: "FAILED_COMPENSATED"; reason: string; removed: number;
    canonical_operations: 0 }> |
  Readonly<{ status: "FAILED_CLOSED"; reason: string; removed: 0;
    canonical_operations: 0 }>;

export async function executeFarmOsDay150InstallerQualification(input: Readonly<{
  attempt_id: string; profile_digest: `sha256:${string}`;
  port: FarmOsDay150InstallerSyscallPort;
}>): Promise<FarmOsDay150InstallerResult> {
  if (!ATTEMPT.test(input.attempt_id) || !DIGEST.test(input.profile_digest) ||
    input.port.port_authority !== "farmos.day150-installer-syscall-seam.v1") {
    return Object.freeze({ status: "FAILED_CLOSED", reason: "INSTALL_INPUT_INVALID",
      removed: 0, canonical_operations: 0 });
  }
  const preexisting = await input.port.inspectPreexistingState();
  const states = [preexisting.principal, preexisting.root, preexisting.artifacts,
    preexisting.adoption_record];
  if (states.includes("UNEXPECTED") || states.includes("PARTIAL_OR_UNEXPECTED") ||
    states.includes("INVALID_OR_AMBIGUOUS")) {
    return Object.freeze({ status: "FAILED_CLOSED", reason: "UNEXPECTED_PREEXISTING_STATE",
      removed: 0, canonical_operations: 0 });
  }
  const incomplete = await input.port.loadIncompleteJournal();
  if (preexisting.adoption_record === "EXACT_VALID") {
    if (preexisting.principal !== "EXACT_ADOPTED" || preexisting.root !== "EXACT_ADOPTED" ||
      preexisting.artifacts !== "EXACT_ADOPTED" || !preexisting.adopted_numeric_identity) {
      return Object.freeze({ status: "FAILED_CLOSED", reason: "ADOPTED_STATE_INCOHERENT",
        removed: 0, canonical_operations: 0 });
    }
    if (incomplete) {
      try { await input.port.clearIncompleteJournal(incomplete.attempt_id); }
      catch { return Object.freeze({ status: "FAILED_CLOSED",
        reason: "COMMITTED_AUTHORITY_JOURNAL_CLEAR_FAILED", removed: 0,
        canonical_operations: 0 }); }
    }
    return Object.freeze({ status: "EXACT_ADOPTED_RERUN", canonical_operations: 0 });
  }
  if (incomplete) {
    if (incomplete.authority_committed !== false ||
      !ATTEMPT.test(incomplete.attempt_id) ||
      incomplete.entries.some((entry, index) => entry.step !== index + 1 ||
        entry.created_by_attempt !== true || entry.verified_after_create !== true)) {
      return Object.freeze({ status: "FAILED_CLOSED", reason: "INCOMPLETE_JOURNAL_INVALID",
        removed: 0, canonical_operations: 0 });
    }
    let removed = 0;
    try {
      for (const entry of [...incomplete.entries].reverse()) {
        if (await input.port.removeExactAttemptObject(entry) !== "REMOVED") {
          throw new Error("RECOVERY_REMOVE_REJECTED");
        }
        removed += 1;
      }
      await input.port.releaseNumericIdentityReservation(incomplete.selected_identity);
      await input.port.clearIncompleteJournal(incomplete.attempt_id);
    } catch {
      return Object.freeze({ status: "FAILED_CLOSED",
        reason: "PROCESS_LOSS_COMPENSATION_INCOMPLETE", removed: 0, canonical_operations: 0 });
    }
    return Object.freeze({ status: "FAILED_COMPENSATED",
      reason: "PROCESS_LOSS_RECOVERED", removed, canonical_operations: 0 });
  }
  if (states.some((state) => state !== "ABSENT")) {
    return Object.freeze({ status: "FAILED_CLOSED", reason: "PARTIAL_PREEXISTING_STATE",
      removed: 0, canonical_operations: 0 });
  }
  const observed = await input.port.inspectNumericIdentities();
  const identity = selectFarmOsDay150NumericIdentity(observed);
  if (!identity || !await input.port.reserveNumericIdentityCAS(identity)) {
    return Object.freeze({ status: "FAILED_CLOSED", reason: "NUMERIC_IDENTITY_UNAVAILABLE_OR_RACED",
      removed: 0, canonical_operations: 0 });
  }
  const journal: FarmOsDay150InstallJournalEntry[] = [];
  let authorityCommitted = false;
  try {
    await input.port.persistIncompleteJournal(Object.freeze({ attempt_id: input.attempt_id,
      selected_identity: identity, entries: Object.freeze([]), authority_committed: false }));
    for (const [index, object] of OBJECTS.entries()) {
      const created = await input.port.createAndVerify(object, identity);
      if (typeof created.identity !== "string" || created.identity.length === 0) {
        throw new Error("CREATED_OBJECT_IDENTITY_INVALID");
      }
      journal.push(Object.freeze({ step: index + 1, object, identity: created.identity,
        created_by_attempt: true, verified_after_create: true }));
      await input.port.persistIncompleteJournal(Object.freeze({ attempt_id: input.attempt_id,
        selected_identity: identity, entries: Object.freeze([...journal]),
        authority_committed: false }));
    }
    const verification = await input.port.independentlyVerifyInstalledSet({
      numeric_identity: identity, journal });
    const artifactValid = (artifact: FarmOsDay150InstalledArtifactIdentity,
      expectedPath: string, expectedSigningIdentifier: string): boolean =>
      artifact.path === expectedPath && DIGEST.test(artifact.sha256) &&
      artifact.signing_identifier === expectedSigningIdentifier && artifact.owner_uid === 0 &&
      artifact.owner_gid === 0 && artifact.mode === "0555";
    if (!DIGEST.test(verification.installed_set_digest) ||
      !DIGEST.test(verification.apfs_device_identity_digest) ||
      !DIGEST.test(verification.launch_configuration_digest) ||
      !artifactValid(verification.validator_broker,
        "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1/bin/farmos-c2b-validator-broker",
        "org.farmos.day150.c2b-bootstrap.validator-broker") ||
      !artifactValid(verification.writer_worker,
        "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1/bin/farmos-c2b-writer-worker",
        "org.farmos.day150.c2b-bootstrap.writer-worker") ||
      verification.signature_policy !==
      "APPLE_CODESIGN_DESIGNATED_REQUIREMENT_TEAM_AND_BUNDLE_EXACT" ||
      verification.filesystem_policy !==
      "REGULAR_NO_SYMLINK_NLINK1_OWNER_GROUP_MODE_DEVICE_EXACT") {
      throw new Error("INDEPENDENT_INSTALLED_IDENTITY_VERIFICATION_FAILED");
    }
    const journalDigest = hashFarmOsProductionTargetExecutionContract(
      "farmos.day150-install-journal.v1", { attempt_id: input.attempt_id, identity, journal });
    const record: FarmOsDay150AdoptionRecord = Object.freeze({
      schema_version: "farmos.day150-c2b-installation-adoption-record.v1",
      attempt_id: input.attempt_id, principal_name: FARM_OS_DAY150_PRINCIPAL_NAME,
      account_api: "OPENDIRECTORY_ODSESSION_LOCAL_NODE_ODRECORD_USER_AND_GROUP",
      numeric_identity: identity,
      installed_set_digest: verification.installed_set_digest,
      apfs_device_identity_digest: verification.apfs_device_identity_digest,
      launch_configuration_digest: verification.launch_configuration_digest,
      validator_broker: verification.validator_broker,
      writer_worker: verification.writer_worker,
      profile_digest: input.profile_digest, journal_digest: journalDigest,
      canonical_root: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1",
      authority_committed: true,
    });
    const committed = await input.port.commitAdoptionRecord(record);
    const expected = hashFarmOsProductionTargetExecutionContract(
      "farmos.day150-c2b-installation-adoption-record.v1", record);
    if (committed.status !== "DURABLE_COMMITTED_AND_READBACK_VERIFIED" ||
      committed.record_digest !== expected) throw new Error("ADOPTION_RECORD_COMMIT_UNVERIFIED");
    authorityCommitted = true;
    await input.port.clearIncompleteJournal(input.attempt_id);
    return Object.freeze({ status: "SOURCE_QUALIFICATION_INSTALLED_AND_ADOPTED",
      adoption_record: record, canonical_operations: 0 });
  } catch (error) {
    if (authorityCommitted) return Object.freeze({ status: "FAILED_CLOSED",
      reason: "COMMITTED_AUTHORITY_HISTORY_IMMUTABLE", removed: 0, canonical_operations: 0 });
    let removed = 0;
    for (const entry of [...journal].reverse()) {
      try { if (await input.port.removeExactAttemptObject(entry) === "REMOVED") removed += 1; }
      catch { return Object.freeze({ status: "FAILED_CLOSED",
        reason: "PRE_AUTHORITY_COMPENSATION_INCOMPLETE", removed: 0, canonical_operations: 0 }); }
    }
    try {
      await input.port.releaseNumericIdentityReservation(identity);
      await input.port.clearIncompleteJournal(input.attempt_id);
    } catch { return Object.freeze({ status: "FAILED_CLOSED",
      reason: "PRE_AUTHORITY_COMPENSATION_INCOMPLETE", removed: 0,
      canonical_operations: 0 }); }
    return Object.freeze({ status: "FAILED_COMPENSATED",
      reason: error instanceof Error ? error.message : "INSTALL_STEP_FAILED",
      removed, canonical_operations: 0 });
  }
}
