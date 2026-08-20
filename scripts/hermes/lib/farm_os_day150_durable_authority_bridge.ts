import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import type {
  FarmOsProductionTargetExecutionAtomicLifecyclePort,
} from "../../../src/lib/hermes/farm_os_production_target_execution_persistence_ports";

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const NONCE = /^[a-f0-9]{24,64}$/u;
const canonicalTime = (value: string): boolean => {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
};

export const FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY =
  "farmos.day150-canonical-storage-readback.v1" as const;
export const FARM_OS_DAY150_B2_AUTHORIZATION_AUTHORITY =
  "farmos.day150-canonical-b2-authorization.v1" as const;
export const FARM_OS_DAY150_B2_ADAPTER_REVISION =
  "farmos.day150-b2-postgres17-adapter.v1" as const;

export type FarmOsDay150CanonicalGen0Body = Readonly<{
  schema_version: "farmos.day150-canonical-gen0.v1";
  generation: 0;
  previous_generation: null;
  previous_record_digest: null;
  installation_profile_digest: `sha256:${string}`;
  adoption_record_digest: `sha256:${string}`;
  installed_artifact_set_digest: `sha256:${string}`;
  proposal_digest: `sha256:${string}`;
  decision_digest: `sha256:${string}`;
  decision: "APPROVE";
  approval_receipt_digest: `sha256:${string}`;
  actor_reference_digest: `sha256:${string}`;
  authentication_context_digest: `sha256:${string}`;
  boot_session_digest: `sha256:${string}`;
  clock_epoch: 0;
  durable_floor: string;
  os_utc: string;
  continuous_time_before_ns: number;
  continuous_time_after_ns: number;
  provenance: "CANONICAL_NATIVE_CEREMONY";
  rehearsal_reference: null;
}>;

export type FarmOsDay150CanonicalGen0Readback = Readonly<{
  authority_id: typeof FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY;
  record_bytes: Uint8Array;
  record_digest: `sha256:${string}`;
  current_head_digest: `sha256:${string}`;
  durable_publication: "F_FULLFSYNC_RENAME_EXCL_DIRECTORY_FULLFSYNC_READBACK_REPLAY_VERIFIED";
  canonical_root: "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1";
  storage_profile_digest: `sha256:${string}`;
  installation_profile_digest: `sha256:${string}`;
  full_chain_replay_verified: true;
}>;

export type FarmOsDay150CurrentAuthorityReadback = Readonly<{
  authority_id: typeof FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY;
  current_head_digest: `sha256:${string}`;
  canonical_gen0_digest: `sha256:${string}`;
  actor_reference_digest: `sha256:${string}`;
  actor_capability_lineage_digest: `sha256:${string}`;
  actor_capability_status: "ACTIVE";
  revocation_head_digest: `sha256:${string}`;
  revocation_head_version: number;
  clock_epoch: number;
  boot_session_digest: `sha256:${string}`;
  durable_floor: string;
  installation_profile_digest: `sha256:${string}`;
  full_chain_replay_verified: true;
}>;

export type FarmOsDay150B2AuthorizationBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_B2_AUTHORIZATION_AUTHORITY;
  authority_revision: 1;
  canonical_head_digest: `sha256:${string}`;
  canonical_gen0_digest: `sha256:${string}`;
  actor_reference_digest: `sha256:${string}`;
  actor_capability_lineage_digest: `sha256:${string}`;
  revocation_head_digest: `sha256:${string}`;
  revocation_head_version: number;
  trusted_clock_epoch: number;
  boot_session_digest: `sha256:${string}`;
  durable_floor: string;
  installation_profile_digest: `sha256:${string}`;
  target_digest: `sha256:${string}`;
  image_digest: `sha256:${string}`;
  platform: "linux/arm64/v8";
  operation: "QUALIFY_EXACT_OWNED_POSTGRES17_TARGET";
  purpose: "B2_ISOLATED_POSTGRES_QUALIFICATION";
  scope: "ONE_EXACT_OWNED_TARGET_ONE_ATTEMPT";
  operation_nonce: string;
  issued_at: string;
  expires_at: string;
  manifest_digest: `sha256:${string}`;
  case_registry_digest: `sha256:${string}`;
  fault_registry_digest: `sha256:${string}`;
  human_approval_reference_digest: `sha256:${string}`;
  proposal_digest: `sha256:${string}`;
  decision_digest: `sha256:${string}`;
  approval_receipt_digest: `sha256:${string}`;
  command_record_digest: `sha256:${string}`;
  execution_binding_digest: `sha256:${string}`;
  phase_b_authority_bundle_digest: `sha256:${string}`;
  renewable: false;
}>;

export type FarmOsDay150B2AuthorizationReadback = Readonly<{
  authority_id: typeof FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY;
  authorization_body: FarmOsDay150B2AuthorizationBody;
  authorization_digest: `sha256:${string}`;
  record_digest: `sha256:${string}`;
  current_head_digest: `sha256:${string}`;
  durable_publication: "READBACK_REPLAY_VERIFIED";
}>;

export interface FarmOsDay150CanonicalStoragePort {
  readonly port_authority: "farmos.day150-canonical-native-storage-port.v1";
  readCanonicalGen0(): Promise<FarmOsDay150CanonicalGen0Readback>;
  readCurrentAuthority(): Promise<FarmOsDay150CurrentAuthorityReadback>;
  appendAndReadbackB2Authorization(
    body: FarmOsDay150B2AuthorizationBody,
  ): Promise<FarmOsDay150B2AuthorizationReadback>;
}

declare const GEN0_READBACK: unique symbol;
declare const GEN0_AUTHORITY: unique symbol;
declare const B2_AUTHORITY: unique symbol;
declare const ATTEMPT_RESERVATION: unique symbol;
declare const EXECUTION_FENCE: unique symbol;
export type FarmOsDay150TrustedGen0Readback = Readonly<{ [GEN0_READBACK]: true }>;
export type FarmOsDay150CanonicalGen0Authority = Readonly<{ [GEN0_AUTHORITY]: true }>;
export type FarmOsDay150TrustedB2Authorization = Readonly<{ [B2_AUTHORITY]: true }>;
export type FarmOsDay150DurableAttemptReservation = Readonly<{ [ATTEMPT_RESERVATION]: true }>;
export type FarmOsDay150LiveExecutionFence = Readonly<{ [EXECUTION_FENCE]: true }>;

type Gen0State = { boundary: object; body: FarmOsDay150CanonicalGen0Body;
  readback: FarmOsDay150CanonicalGen0Readback; valid: boolean };
type B2State = { boundary: object; body: FarmOsDay150B2AuthorizationBody;
  authorization_digest: `sha256:${string}`; authorization_record_head: `sha256:${string}`;
  valid: boolean; reservationPending: boolean };
type AttemptState = { boundary: object; authorization: B2State; attempt_id: string;
  attempt_digest: `sha256:${string}`; lifecycle_digest: `sha256:${string}`;
  started_at: string; fenceIssued: boolean };
type FenceState = { attempt: AttemptState; consumed: boolean };
const gen0Readbacks = new WeakMap<object, Gen0State>();
const gen0Authorities = new WeakMap<object, Gen0State>();
const b2Authorities = new WeakMap<object, B2State>();
const attemptReservations = new WeakMap<object, AttemptState>();
const fences = new WeakMap<object, FenceState>();

function opaque<T>(): T { return Object.freeze(Object.create(null)) as T; }
function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  const sorted = [...expected].sort();
  return keys.length === sorted.length && keys.every((key, index) => key === sorted[index]);
}
const GEN0_KEYS = ["actor_reference_digest", "adoption_record_digest",
  "approval_receipt_digest", "authentication_context_digest", "boot_session_digest",
  "clock_epoch", "continuous_time_after_ns", "continuous_time_before_ns", "decision",
  "decision_digest", "durable_floor", "generation", "installation_profile_digest",
  "installed_artifact_set_digest", "os_utc", "previous_generation",
  "previous_record_digest", "proposal_digest", "provenance", "rehearsal_reference",
  "schema_version"] as const;

function parseGen0Bytes(bytes: Uint8Array): FarmOsDay150CanonicalGen0Body | null {
  try {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value) ||
      !exactKeys(value as Record<string, unknown>, GEN0_KEYS)) return null;
    const body = value as FarmOsDay150CanonicalGen0Body;
    const digests = [body.installation_profile_digest, body.adoption_record_digest,
      body.installed_artifact_set_digest, body.proposal_digest, body.decision_digest,
      body.approval_receipt_digest, body.actor_reference_digest,
      body.authentication_context_digest, body.boot_session_digest];
    if (body.schema_version !== "farmos.day150-canonical-gen0.v1" || body.generation !== 0 ||
      body.previous_generation !== null || body.previous_record_digest !== null ||
      body.decision !== "APPROVE" || body.clock_epoch !== 0 ||
      body.provenance !== "CANONICAL_NATIVE_CEREMONY" || body.rehearsal_reference !== null ||
      !digests.every((digest) => DIGEST.test(digest)) ||
      new Set(digests).size !== digests.length || !canonicalTime(body.durable_floor) ||
      !canonicalTime(body.os_utc) || !Number.isSafeInteger(body.continuous_time_before_ns) ||
      !Number.isSafeInteger(body.continuous_time_after_ns) ||
      body.continuous_time_before_ns > body.continuous_time_after_ns) return null;
    const canonical = canonicalizeFarmOsProductionTargetExecutionContract(body);
    return canonical === new TextDecoder().decode(bytes) ? Object.freeze(body) : null;
  } catch { return null; }
}

function currentReadbackValid(value: FarmOsDay150CurrentAuthorityReadback): boolean {
  return value.authority_id === FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY &&
    value.actor_capability_status === "ACTIVE" && value.full_chain_replay_verified === true &&
    Number.isSafeInteger(value.revocation_head_version) && value.revocation_head_version >= 0 &&
    Number.isSafeInteger(value.clock_epoch) && value.clock_epoch >= 0 &&
    canonicalTime(value.durable_floor) && [value.current_head_digest, value.canonical_gen0_digest,
      value.actor_reference_digest, value.actor_capability_lineage_digest,
      value.revocation_head_digest, value.boot_session_digest,
      value.installation_profile_digest].every((digest) => DIGEST.test(digest));
}

export class FarmOsDay150DurableAuthorityBoundary {
  readonly authority_id = "farmos.day150-durable-authority-boundary.v1" as const;
  readonly #storage: FarmOsDay150CanonicalStoragePort;
  readonly #lifecycle: FarmOsProductionTargetExecutionAtomicLifecyclePort;

  constructor(input: Readonly<{ storage: FarmOsDay150CanonicalStoragePort;
    lifecycle: FarmOsProductionTargetExecutionAtomicLifecyclePort }>) {
    if (input.storage.port_authority !== "farmos.day150-canonical-native-storage-port.v1" ||
      input.lifecycle.port_version !== "farmos.production-target-execution-persistence-port.v1") {
      throw new Error("EXACT_DURABLE_PORT_AUTHORITY_REQUIRED");
    }
    this.#storage = input.storage;
    this.#lifecycle = input.lifecycle;
  }

  async readCanonicalGen0(): Promise<FarmOsDay150TrustedGen0Readback> {
    const readback = await this.#storage.readCanonicalGen0();
    const body = parseGen0Bytes(readback.record_bytes);
    if (!body || readback.authority_id !== FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY ||
      readback.durable_publication !==
        "F_FULLFSYNC_RENAME_EXCL_DIRECTORY_FULLFSYNC_READBACK_REPLAY_VERIFIED" ||
      readback.canonical_root !== "/Library/Application Support/FarmOS/day150-c2b-bootstrap/v1" ||
      !readback.full_chain_replay_verified ||
      readback.installation_profile_digest !== body.installation_profile_digest ||
      !DIGEST.test(readback.storage_profile_digest)) throw new Error("GEN0_READBACK_REJECTED");
    const recordDigest = hashFarmOsProductionTargetExecutionContract(
      "farmos.day150-canonical-gen0.v1", body);
    if (readback.record_digest !== recordDigest || readback.current_head_digest !== recordDigest) {
      throw new Error("GEN0_DIGEST_OR_HEAD_MISMATCH");
    }
    const capability = opaque<FarmOsDay150TrustedGen0Readback>();
    gen0Readbacks.set(capability, { boundary: this, body, readback, valid: true });
    return capability;
  }

  projectCanonicalGen0(capability: FarmOsDay150TrustedGen0Readback):
    FarmOsDay150CanonicalGen0Authority {
    const state = gen0Readbacks.get(capability);
    if (!state || state.boundary !== this || !state.valid) throw new Error("TRUSTED_GEN0_READBACK_REQUIRED");
    state.valid = false;
    const authority = opaque<FarmOsDay150CanonicalGen0Authority>();
    gen0Authorities.set(authority, { ...state, valid: true });
    return authority;
  }

  async issueAndReadbackB2Authorization(input: Readonly<{
    gen0: FarmOsDay150CanonicalGen0Authority;
    target_digest: `sha256:${string}`; image_digest: `sha256:${string}`;
    operation_nonce: string; issued_at: string; expires_at: string;
    manifest_digest: `sha256:${string}`; case_registry_digest: `sha256:${string}`;
    fault_registry_digest: `sha256:${string}`;
    human_approval_reference_digest: `sha256:${string}`;
    command_record_digest: `sha256:${string}`;
    execution_binding_digest: `sha256:${string}`;
    phase_b_authority_bundle_digest: `sha256:${string}`;
  }>): Promise<FarmOsDay150TrustedB2Authorization> {
    const gen0 = gen0Authorities.get(input.gen0);
    if (!gen0 || gen0.boundary !== this || !gen0.valid) throw new Error("CANONICAL_GEN0_AUTHORITY_REQUIRED");
    const current = await this.#storage.readCurrentAuthority();
    if (!currentReadbackValid(current) || current.canonical_gen0_digest !== gen0.readback.record_digest ||
      current.installation_profile_digest !== gen0.body.installation_profile_digest ||
      current.actor_reference_digest !== gen0.body.actor_reference_digest ||
      Date.parse(current.durable_floor) < Date.parse(gen0.body.durable_floor)) {
      gen0.valid = false;
      throw new Error("CURRENT_AUTHORITY_READBACK_MISMATCH");
    }
    const supplied = [input.target_digest, input.image_digest, input.manifest_digest,
      input.case_registry_digest, input.fault_registry_digest,
      input.human_approval_reference_digest, input.command_record_digest,
      input.execution_binding_digest, input.phase_b_authority_bundle_digest];
    const issued = Date.parse(input.issued_at); const expires = Date.parse(input.expires_at);
    if (!supplied.every((digest) => DIGEST.test(digest)) || !NONCE.test(input.operation_nonce) ||
      !canonicalTime(input.issued_at) || !canonicalTime(input.expires_at) ||
      expires <= issued || expires - issued > 900_000 || issued < Date.parse(current.durable_floor)) {
      throw new Error("B2_AUTHORIZATION_INPUT_INVALID");
    }
    const body: FarmOsDay150B2AuthorizationBody = Object.freeze({
      schema_version: FARM_OS_DAY150_B2_AUTHORIZATION_AUTHORITY, authority_revision: 1,
      canonical_head_digest: current.current_head_digest,
      canonical_gen0_digest: current.canonical_gen0_digest,
      actor_reference_digest: current.actor_reference_digest,
      actor_capability_lineage_digest: current.actor_capability_lineage_digest,
      revocation_head_digest: current.revocation_head_digest,
      revocation_head_version: current.revocation_head_version,
      trusted_clock_epoch: current.clock_epoch, boot_session_digest: current.boot_session_digest,
      durable_floor: current.durable_floor,
      installation_profile_digest: current.installation_profile_digest,
      target_digest: input.target_digest, image_digest: input.image_digest,
      platform: "linux/arm64/v8", operation: "QUALIFY_EXACT_OWNED_POSTGRES17_TARGET",
      purpose: "B2_ISOLATED_POSTGRES_QUALIFICATION",
      scope: "ONE_EXACT_OWNED_TARGET_ONE_ATTEMPT", operation_nonce: input.operation_nonce,
      issued_at: input.issued_at, expires_at: input.expires_at,
      manifest_digest: input.manifest_digest, case_registry_digest: input.case_registry_digest,
      fault_registry_digest: input.fault_registry_digest,
      human_approval_reference_digest: input.human_approval_reference_digest,
      proposal_digest: gen0.body.proposal_digest,
      decision_digest: gen0.body.decision_digest,
      approval_receipt_digest: gen0.body.approval_receipt_digest,
      command_record_digest: input.command_record_digest,
      execution_binding_digest: input.execution_binding_digest,
      phase_b_authority_bundle_digest: input.phase_b_authority_bundle_digest,
      renewable: false,
    });
    const expectedDigest = hashFarmOsProductionTargetExecutionContract(
      FARM_OS_DAY150_B2_AUTHORIZATION_AUTHORITY, body);
    const readback = await this.#storage.appendAndReadbackB2Authorization(body);
    if (readback.authority_id !== FARM_OS_DAY150_CANONICAL_STORAGE_AUTHORITY ||
      readback.durable_publication !== "READBACK_REPLAY_VERIFIED" ||
      readback.authorization_digest !== expectedDigest ||
      canonicalizeFarmOsProductionTargetExecutionContract(readback.authorization_body) !==
        canonicalizeFarmOsProductionTargetExecutionContract(body) ||
      readback.current_head_digest !== readback.record_digest || !DIGEST.test(readback.record_digest)) {
      throw new Error("B2_AUTHORIZATION_DURABLE_READBACK_REJECTED");
    }
    const capability = opaque<FarmOsDay150TrustedB2Authorization>();
    b2Authorities.set(capability, { boundary: this, body,
      authorization_digest: expectedDigest, authorization_record_head: readback.current_head_digest,
      valid: true, reservationPending: false });
    return capability;
  }

  async reserveDurableAttempt(input: Readonly<{
    authorization: FarmOsDay150TrustedB2Authorization;
    attempt: Parameters<FarmOsProductionTargetExecutionAtomicLifecyclePort["tryMarkAttemptStarted"]>[0];
  }>): Promise<FarmOsDay150DurableAttemptReservation> {
    const authorization = b2Authorities.get(input.authorization);
    if (!authorization || authorization.boundary !== this || !authorization.valid ||
      authorization.reservationPending) {
      throw new Error("TRUSTED_B2_AUTHORIZATION_REQUIRED");
    }
    authorization.reservationPending = true;
    const current = await this.#storage.readCurrentAuthority();
    const now = Date.parse(input.attempt.clock_evidence.observed_at);
    if (!currentReadbackValid(current) ||
      current.current_head_digest !== authorization.authorization_record_head ||
      current.actor_reference_digest !== authorization.body.actor_reference_digest ||
      current.actor_capability_lineage_digest !== authorization.body.actor_capability_lineage_digest ||
      current.revocation_head_digest !== authorization.body.revocation_head_digest ||
      current.revocation_head_version !== authorization.body.revocation_head_version ||
      current.clock_epoch !== authorization.body.trusted_clock_epoch ||
      current.boot_session_digest !== authorization.body.boot_session_digest ||
      current.installation_profile_digest !== authorization.body.installation_profile_digest ||
      input.attempt.expected_command_record_digest !== authorization.body.command_record_digest ||
      input.attempt.execution_binding_digest !== authorization.body.execution_binding_digest ||
      input.attempt.expected_phase_b_authority_bundle_digest !==
        authorization.body.phase_b_authority_bundle_digest ||
      input.attempt.expected_approval_digest !== authorization.body.decision_digest ||
      input.attempt.expected_target_binding_digest !== authorization.body.target_digest ||
      !Number.isFinite(now) || now < Date.parse(authorization.body.issued_at) ||
      now > Date.parse(authorization.body.expires_at) ||
      now - Date.parse(authorization.body.issued_at) > 900_000) {
      authorization.valid = false;
      authorization.reservationPending = false;
      throw new Error("B2_AUTHORIZATION_STALE_OR_MISMATCHED");
    }
    let result: Awaited<ReturnType<FarmOsProductionTargetExecutionAtomicLifecyclePort[
      "tryMarkAttemptStarted"]>>;
    try {
      result = await this.#lifecycle.tryMarkAttemptStarted(input.attempt);
    } catch {
      authorization.valid = false;
      authorization.reservationPending = false;
      throw new Error("ATTEMPT_START_OUTCOME_UNKNOWN");
    }
    if (result.status !== "ATTEMPT_STARTED" || result.lifecycle.state !== "ATTEMPT_STARTED" ||
      result.lifecycle.attempt_id !== input.attempt.attempt_id ||
      result.lifecycle.attempt_digest !== input.attempt.attempt_digest ||
      result.revocation_revalidation.provenance !==
        "PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION" ||
      result.revocation_revalidation.transition !== "ATTEMPT_START" ||
      result.revocation_revalidation.persisted_atomically_with_lifecycle_transition !== true ||
      result.revocation_revalidation.lifecycle_record_digest !==
        result.lifecycle.lifecycle_record_digest ||
      result.revocation_revalidation.observed_head_digest !==
        input.attempt.expected_approval_revocation_head_digest ||
      result.revocation_revalidation.observed_head_version !==
        input.attempt.expected_approval_revocation_head_version ||
      result.revocation_revalidation.observed_latest_event_digest !==
        input.attempt.expected_approval_revocation_latest_event_digest ||
      !DIGEST.test(result.revocation_revalidation.observation_digest)) {
      authorization.valid = false;
      authorization.reservationPending = false;
      throw new Error(result.status.includes("OUTCOME_UNKNOWN")
        ? "ATTEMPT_START_OUTCOME_UNKNOWN" : "ATTEMPT_START_REJECTED");
    }
    const reread = await this.#lifecycle.readLifecycle({ command_id: input.attempt.command_id,
      execution_binding_digest: input.attempt.execution_binding_digest });
    if (!reread || reread.state !== "ATTEMPT_STARTED" ||
      reread.lifecycle_record_digest !== result.lifecycle.lifecycle_record_digest ||
      reread.attempt_id !== input.attempt.attempt_id ||
      reread.attempt_digest !== input.attempt.attempt_digest) {
      authorization.valid = false;
      authorization.reservationPending = false;
      throw new Error("ATTEMPT_DURABLE_READBACK_REJECTED");
    }
    authorization.valid = false;
    authorization.reservationPending = false;
    const reservation = opaque<FarmOsDay150DurableAttemptReservation>();
    attemptReservations.set(reservation, { boundary: this, authorization,
      attempt_id: input.attempt.attempt_id, attempt_digest: input.attempt.attempt_digest,
      lifecycle_digest: reread.lifecycle_record_digest,
      started_at: input.attempt.clock_evidence.observed_at, fenceIssued: false });
    return reservation;
  }

  issueExecutionFence(reservation: FarmOsDay150DurableAttemptReservation):
    FarmOsDay150LiveExecutionFence {
    const attempt = attemptReservations.get(reservation);
    if (!attempt || attempt.boundary !== this || attempt.fenceIssued) {
      throw new Error("EXACT_UNUSED_DURABLE_ATTEMPT_REQUIRED");
    }
    attempt.fenceIssued = true;
    const fence = opaque<FarmOsDay150LiveExecutionFence>();
    fences.set(fence, { attempt, consumed: false });
    return fence;
  }
}

export function consumeFarmOsDay150LiveExecutionFence(input: Readonly<{
  fence: FarmOsDay150LiveExecutionFence | unknown;
  attempt_id: string; attempt_digest: `sha256:${string}`; observed_at: string;
}>): Readonly<{ accepted: true; lifecycle_digest: `sha256:${string}` }> |
  Readonly<{ accepted: false; reason: string }> {
  if (typeof input.fence !== "object" || input.fence === null) {
    return Object.freeze({ accepted: false, reason: "FENCE_NOT_RECONSTRUCTABLE" });
  }
  const state = fences.get(input.fence);
  if (!state) return Object.freeze({ accepted: false, reason: "FENCE_NOT_RECONSTRUCTABLE" });
  if (state.consumed) return Object.freeze({ accepted: false, reason: "SECOND_DOCKER_SPAWN_PROHIBITED" });
  state.consumed = true;
  const observed = Date.parse(input.observed_at); const started = Date.parse(state.attempt.started_at);
  if (input.attempt_id !== state.attempt.attempt_id ||
    input.attempt_digest !== state.attempt.attempt_digest || !canonicalTime(input.observed_at) ||
    observed < started || observed - started > 30_000) {
    return Object.freeze({ accepted: false, reason: "ATTEMPT_OR_30_SECOND_DEADLINE_MISMATCH" });
  }
  return Object.freeze({ accepted: true, lifecycle_digest: state.attempt.lifecycle_digest });
}
