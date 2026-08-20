import assert from "node:assert/strict";
import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
} from "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import type { FarmOsProductionTargetExecutionAtomicLifecyclePort } from
  "../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";
import {
  FARM_OS_DAY150_B2_AUTHORIZATION_AUTHORITY,
  FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY,
  FarmOsDay150DurableAuthorityBoundary,
  consumeFarmOsDay150LiveExecutionFence,
  type FarmOsDay150B2AuthorizationBody,
  type FarmOsDay150CanonicalGen0Body,
  type FarmOsDay150CanonicalGen0Authority,
  type FarmOsDay150CanonicalStoragePort,
  type FarmOsDay150TrustedGen0Readback,
} from "./lib/farm_os_day150_durable_authority_bridge";
import {
  FarmOsPteC2bExecutionGateway,
  validateFarmOsPteC2bRealExecutionCapability,
} from "./lib/farm_os_production_target_execution_postgres_qualification_docker_adapter";

const digest = (value: string) => `sha256:${value.repeat(64)}` as const;
const postgresImageDigest =
  "sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317" as const;
const gen0Body: FarmOsDay150CanonicalGen0Body = Object.freeze({
  schema_version: "farmos.day150-canonical-gen0.v1", generation: 0,
  previous_generation: null, previous_record_digest: null,
  installation_profile_digest: digest("1"), adoption_record_digest: digest("2"),
  installed_artifact_set_digest: digest("3"), proposal_digest: digest("4"),
  decision_digest: digest("5"), decision: "APPROVE", approval_receipt_digest: digest("6"),
  actor_reference_digest: digest("7"), authentication_context_digest: digest("8"),
  boot_session_digest: digest("9"), clock_epoch: 0,
  durable_floor: "2026-08-13T00:00:00.000Z", os_utc: "2026-08-13T00:00:00.000Z",
  continuous_time_before_ns: 1, continuous_time_after_ns: 2,
  provenance: "CANONICAL_NATIVE_CEREMONY", rehearsal_reference: null,
});
const gen0Bytes = new TextEncoder().encode(
  canonicalizeFarmOsProductionTargetExecutionContract(gen0Body));
const gen0Digest = hashFarmOsProductionTargetExecutionContract(
  "farmos.day150-canonical-gen0.v1", gen0Body);
let currentHead = gen0Digest;
let currentAuthorityValid = true;
const persistedNonces = new Set<string>();
const current = () => Object.freeze({
  authority_id: FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY,
  current_head_digest: currentHead, canonical_gen0_digest: gen0Digest,
  actor_reference_digest: gen0Body.actor_reference_digest,
  actor_capability_lineage_digest: digest("a"),
  actor_capability_status: currentAuthorityValid ? "ACTIVE" as const : "REVOKED" as const,
  revocation_head_digest: digest("b"), revocation_head_version: 0, clock_epoch: 0,
  boot_session_digest: gen0Body.boot_session_digest, durable_floor: gen0Body.durable_floor,
  installation_profile_digest: gen0Body.installation_profile_digest,
  full_chain_replay_verified: true as const,
});
const storage: FarmOsDay150CanonicalStoragePort = {
  port_authority: "farmos.day150-canonical-native-storage-port.v1",
  async readCanonicalGen0() { return Object.freeze({
    authority_id: FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY, record_bytes: gen0Bytes,
    record_digest: gen0Digest, current_head_digest: gen0Digest,
    durable_publication:
      "F_FULLFSYNC_RENAME_EXCL_DIRECTORY_FULLFSYNC_READBACK_REPLAY_VERIFIED",
    canonical_root: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1",
    storage_profile_digest: digest("c"),
    installation_profile_digest: gen0Body.installation_profile_digest,
    full_chain_replay_verified: true,
  }); },
  async readCurrentAuthority() { return current() as never; },
  async appendAndReadbackB2Authorization(body: FarmOsDay150B2AuthorizationBody) {
    if (persistedNonces.has(body.operation_nonce)) throw new Error("DUPLICATE_NONCE");
    persistedNonces.add(body.operation_nonce);
    const authorizationDigest = hashFarmOsProductionTargetExecutionContract(
      FARM_OS_DAY150_B2_AUTHORIZATION_AUTHORITY, body);
    currentHead = hashFarmOsProductionTargetExecutionContract(
      "farmos.day150-b2-authorization-record.v1", { body, authorizationDigest });
    return Object.freeze({ authority_id: FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY,
      authorization_body: body, authorization_digest: authorizationDigest,
      record_digest: currentHead, current_head_digest: currentHead,
      durable_publication: "READBACK_REPLAY_VERIFIED" as const });
  },
};

const lifecycleRecord = {
  state: "ATTEMPT_STARTED", attempt_id: "attempt_exact", attempt_digest: digest("d"),
  lifecycle_record_digest: digest("e"),
};
let starts = 0;
const lifecycle = {
  port_version: "farmos.production-target-execution-persistence-port.v1",
  async tryMarkAttemptStarted() { starts += 1; return { status: "ATTEMPT_STARTED",
    lifecycle: lifecycleRecord, revocation_revalidation: {
      provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION",
      transition: "ATTEMPT_START", persisted_atomically_with_lifecycle_transition: true,
      lifecycle_record_digest: lifecycleRecord.lifecycle_record_digest,
      observed_head_digest: digest("b"), observed_head_version: 0,
      observed_latest_event_digest: null, observation_digest: digest("c"),
    } }; },
  async readLifecycle() { return lifecycleRecord; },
} as unknown as FarmOsProductionTargetExecutionAtomicLifecyclePort;

const boundary = new FarmOsDay150DurableAuthorityBoundary({ storage, lifecycle });
await assert.rejects(async () => boundary.projectCanonicalGen0(
  {} as FarmOsDay150TrustedGen0Readback), /TRUSTED_GEN0_READBACK_REQUIRED/u);
const trustedReadback = await boundary.readCanonicalGen0();
assert.equal(JSON.stringify(trustedReadback), "{}");
const gen0 = boundary.projectCanonicalGen0(trustedReadback);
assert.throws(() => boundary.projectCanonicalGen0(trustedReadback),
  /TRUSTED_GEN0_READBACK_REQUIRED/u);
const issue = (authority: FarmOsDay150CanonicalGen0Authority, nonce: string) =>
  boundary.issueAndReadbackB2Authorization({ gen0: authority,
  target_digest: digest("f"), image_digest: postgresImageDigest,
  operation_nonce: nonce, issued_at: "2026-08-13T00:00:01.000Z",
  expires_at: "2026-08-13T00:15:01.000Z", manifest_digest: digest("1"),
  case_registry_digest: digest("2"), fault_registry_digest: digest("3"),
  human_approval_reference_digest: digest("4"), command_record_digest: digest("8"),
  execution_binding_digest: digest("5"), phase_b_authority_bundle_digest: digest("9") });
const authorization = await issue(gen0, "0123456789abcdef01234567");

const attempt = {
  command_id: "command_exact", execution_binding_digest: digest("5"),
  reservation_id: "reservation_exact", reservation_digest: digest("6"),
  attempt_id: "attempt_exact", attempt_digest: digest("d"),
  expected_lifecycle_state: "RESERVED_NOT_STARTED", expected_lifecycle_version: 1,
  expected_approval_digest: digest("5"), expected_approval_revocation_head_version: 0,
  expected_approval_revocation_head_digest: digest("b"),
  expected_approval_revocation_latest_event_digest: null,
  expected_command_record_digest: digest("8"), expected_phase_b_authority_bundle_digest: digest("9"),
  expected_target_binding_digest: digest("f"), clock_evidence: {
    observed_at: "2026-08-13T00:00:02.000Z",
  }, expected_persisted_clock_lower_bound: gen0Body.durable_floor,
  expected_clock_floor_version: 1,
  advance_persisted_clock_lower_bound_to_evidence_observed_at: true,
  required_revalidation_provenance: "PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION",
} as unknown as Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort[
  "tryMarkAttemptStarted"]>[0];
const concurrent = await Promise.allSettled([
  boundary.reserveDurableAttempt({ authorization, attempt }),
  boundary.reserveDurableAttempt({ authorization, attempt }),
]);
assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
assert.equal(concurrent.filter((result) => result.status === "rejected").length, 1);
const reservationResult = concurrent.find((result) => result.status === "fulfilled");
assert.ok(reservationResult?.status === "fulfilled");
const reservation = reservationResult.value;
assert.equal(starts, 1);
await assert.rejects(async () => boundary.reserveDurableAttempt({ authorization, attempt }),
  /TRUSTED_B2_AUTHORIZATION_REQUIRED/u);
const restartedBoundary = new FarmOsDay150DurableAuthorityBoundary({ storage, lifecycle });
await assert.rejects(async () => restartedBoundary.reserveDurableAttempt({ authorization, attempt }),
  /TRUSTED_B2_AUTHORIZATION_REQUIRED/u);
const fence = boundary.issueExecutionFence(reservation);
assert.throws(() => boundary.issueExecutionFence(reservation), /EXACT_UNUSED_DURABLE_ATTEMPT_REQUIRED/u);
assert.throws(() => new FarmOsPteC2bExecutionGateway({
  adapter_revision: "wrong" as never, target_digest: digest("f"),
  image_digest: postgresImageDigest }), /EXACT_ADAPTER_TARGET_IMAGE_REQUIRED/u);
const gateway = new FarmOsPteC2bExecutionGateway({
  adapter_revision: "farmos.day150-b2-postgres17-adapter.v1",
  target_digest: digest("f"), image_digest: postgresImageDigest });
const gatewayBoundary = gateway.authorizeFirstMutation({ fence, attempt_id: "attempt_exact",
  attempt_digest: digest("d"), observed_at: "2026-08-13T00:00:32.000Z",
  target_digest: digest("f"), image_digest: postgresImageDigest });
assert.equal(validateFarmOsPteC2bRealExecutionCapability(gatewayBoundary.adapter,
  gatewayBoundary.capability), true);
assert.equal(validateFarmOsPteC2bRealExecutionCapability(gatewayBoundary.adapter,
  gatewayBoundary.capability), false);
assert.equal(validateFarmOsPteC2bRealExecutionCapability({
  preflight() {}, prepareFixture() {}, applyExactMigration() {},
  recordAndVerifyMigrationHistory() {}, executeExactReadOnlyVerifier() {},
  executeCase() {}, cleanupExactOwnedResources() {},
}, gatewayBoundary.capability), false);
assert.deepEqual(consumeFarmOsDay150LiveExecutionFence({ fence, attempt_id: "attempt_exact",
  attempt_digest: digest("d"), observed_at: "2026-08-13T00:00:32.000Z" }),
  { accepted: false, reason: "SECOND_DOCKER_SPAWN_PROHIBITED" });
assert.equal(consumeFarmOsDay150LiveExecutionFence({ fence: {}, attempt_id: "attempt_exact",
  attempt_digest: digest("d"), observed_at: "2026-08-13T00:00:03.000Z" }).accepted, false);

const staleAuthorization = await issue(gen0, "1123456789abcdef01234567");
currentHead = digest("0");
await assert.rejects(async () => boundary.reserveDurableAttempt({
  authorization: staleAuthorization, attempt,
}), /B2_AUTHORIZATION_STALE_OR_MISMATCHED/u);
currentHead = gen0Digest;
const revokedAuthorization = await issue(gen0, "2123456789abcdef01234567");
currentAuthorityValid = false;
await assert.rejects(async () => boundary.reserveDurableAttempt({
  authorization: revokedAuthorization, attempt,
}), /B2_AUTHORIZATION_STALE_OR_MISMATCHED/u);
currentAuthorityValid = true;
await assert.rejects(async () => issue(gen0, "2123456789abcdef01234567"), /DUPLICATE_NONCE/u);

// A fresh authorization cannot be issued from a caller-shaped Gen0 object.
await assert.rejects(async () => boundary.issueAndReadbackB2Authorization({
  gen0: {} as typeof gen0, target_digest: digest("f"), image_digest: postgresImageDigest,
  operation_nonce: "0123456789abcdef01234567", issued_at: "2026-08-13T00:00:01.000Z",
  expires_at: "2026-08-13T00:15:01.000Z", manifest_digest: digest("1"),
  case_registry_digest: digest("2"), fault_registry_digest: digest("3"),
  human_approval_reference_digest: digest("4"), command_record_digest: digest("8"),
  execution_binding_digest: digest("5"), phase_b_authority_bundle_digest: digest("9")
}), /CANONICAL_GEN0_AUTHORITY_REQUIRED/u);

console.log(JSON.stringify({ status: "PASS", durable_gen0: true, atomic_attempt_starts: starts,
  canonical_operations: 0, docker_operations: 0, postgres_operations: 0 }));
