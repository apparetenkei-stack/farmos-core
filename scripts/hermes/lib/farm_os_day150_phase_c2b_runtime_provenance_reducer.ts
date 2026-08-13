import { canonicalizeFarmOsProductionTargetExecutionContract } from
  "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  FARM_OS_DAY150_C2B_BOOT_SESSION_RECOVERY_CAPABILITY_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOT_SESSION_RECOVERY_CAPABILITY_DIGEST,
  FARM_OS_DAY150_C2B_CROSS_EPOCH_CHALLENGE_RECOVERY_AUTHORITY,
  FARM_OS_DAY150_C2B_CROSS_EPOCH_CHALLENGE_RECOVERY_DIGEST,
  FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY,
  farmOsDay150C2bRuntimeProvenanceRecordsAreSourceEqual,
  parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate,
  type FarmOsDay150C2bRuntimeProvenanceEvent,
  type FarmOsDay150C2bBootSessionRecoveryBinding,
  type FarmOsDay150C2bRuntimeMutationFreshnessBinding,
  type FarmOsDay150C2bRuntimeProvenanceRecordFailureReason,
  type FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate,
  type FarmOsDay150C2bRuntimeProvenanceSourceProjection,
} from "./farm_os_day150_phase_c2b_runtime_provenance_contract";
import { snapshotFarmOsDay150C2bBootstrapData } from
  "./farm_os_day150_phase_c2b_bootstrap_ledger_contract";

type Digest = `sha256:${string}`;
type HeadContext = Readonly<{
  generation: number;
  digest: string;
  event?: FarmOsDay150C2bRuntimeProvenanceEvent;
}>;

function bootRecoveryBinding(event: FarmOsDay150C2bRuntimeProvenanceEvent | undefined):
FarmOsDay150C2bBootSessionRecoveryBinding | null {
  if (!event || (event.event_kind !== "CHALLENGE_ISSUANCE_CANDIDATE" &&
    event.event_kind !== "CHALLENGE_TERMINALIZATION_CANDIDATE" &&
    event.event_kind !== "CAPABILITY_ISSUANCE_CANDIDATE")) return null;
  return event.payload.boot_session_recovery_binding_candidate ?? null;
}

function recoveryLineageMatches(
  current: FarmOsDay150C2bBootSessionRecoveryBinding,
  prior: FarmOsDay150C2bBootSessionRecoveryBinding,
): boolean {
  return current.amendment_authority === prior.amendment_authority &&
    current.amendment_revision === prior.amendment_revision &&
    current.amendment_digest === prior.amendment_digest &&
    current.gen2_record_digest_candidate === prior.gen2_record_digest_candidate &&
    current.gen2_terminal_reference_digest_candidate ===
      prior.gen2_terminal_reference_digest_candidate &&
    current.historical_challenge_reference_digest_candidate ===
      prior.historical_challenge_reference_digest_candidate &&
    current.historical_session_reference_digest_candidate ===
      prior.historical_session_reference_digest_candidate &&
    current.old_epoch_reference_digest_candidate === prior.old_epoch_reference_digest_candidate &&
    current.old_boot_session_reference_digest_candidate ===
      prior.old_boot_session_reference_digest_candidate &&
    current.current_boot_session_reference_digest_candidate ===
      prior.current_boot_session_reference_digest_candidate &&
    current.recovery_purpose === prior.recovery_purpose &&
    current.recovery_policy_revision === prior.recovery_policy_revision &&
    current.recovery_challenge_reference_digest_candidate ===
      prior.recovery_challenge_reference_digest_candidate &&
    current.recovery_session_reference_digest_candidate ===
      prior.recovery_session_reference_digest_candidate &&
    current.recovery_freshness_reference_digest_candidate ===
      prior.recovery_freshness_reference_digest_candidate;
}
export type FarmOsDay150C2bRuntimeProvenanceReplayFailureReason =
  | FarmOsDay150C2bRuntimeProvenanceRecordFailureReason
  | "UNTRUSTED_RUNTIME_PROVENANCE_CHAIN_INPUT" | "MISSING_INTEGRATED_GENESIS"
  | "GENESIS_NOT_FIRST" | "DUPLICATE_EXACT_RECORD_CANDIDATE"
  | "DIVERGENT_GENERATION_FORK_CANDIDATE" | "GENERATION_GAP" | "OUT_OF_ORDER"
  | "PREDECESSOR_MISMATCH" | "SOURCE_BINDING_MISMATCH" | "INVALID_EVENT_TRANSITION"
  | "INVALID_PROJECTED_SOURCE_STATE_CLAIM" | "REFERENCE_REPLAY_CANDIDATE";
export type FarmOsDay150C2bRuntimeProvenanceReplayResult =
  | Readonly<{
    classification: "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE";
    chain_semantics: "SOURCE_CHAIN_CANDIDATE_ONLY_NOT_PUBLICATION_OR_TRUST";
    candidate_generation: number;
    candidate_head_digest: Digest;
    source_projection: FarmOsDay150C2bRuntimeProvenanceSourceProjection;
    source_chain_candidate: readonly FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate[];
  }>
  | Readonly<{ classification: "INVALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE";
    reason: FarmOsDay150C2bRuntimeProvenanceReplayFailureReason }>;

function invalid(reason: FarmOsDay150C2bRuntimeProvenanceReplayFailureReason):
FarmOsDay150C2bRuntimeProvenanceReplayResult {
  return Object.freeze({ classification: "INVALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE", reason });
}
function canonicalEqual(left: unknown, right: unknown): boolean {
  return canonicalizeFarmOsProductionTargetExecutionContract(left) ===
    canonicalizeFarmOsProductionTargetExecutionContract(right);
}
function projection(base: Omit<FarmOsDay150C2bRuntimeProvenanceSourceProjection,
"schema_version" | "discriminator">): FarmOsDay150C2bRuntimeProvenanceSourceProjection {
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY,
    discriminator: "SOURCE_PROJECTION_ONLY",
    ...base,
  });
}

function genesisProjection(event: FarmOsDay150C2bRuntimeProvenanceEvent):
FarmOsDay150C2bRuntimeProvenanceSourceProjection | null {
  if (event.event_kind !== "INTEGRATED_RUNTIME_GENESIS_CANDIDATE") return null;
  return projection({
    bootstrap_candidate_state: "INITIALIZED_CANDIDATE",
    actor_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT",
    actor_reference_digest_candidate: event.payload.actor_reference_digest_candidate,
    challenge_candidate_state: event.payload.initial_challenge_terminal_state,
    challenge_reference_digest_candidate: event.payload.initial_challenge_reference_digest_candidate,
    challenge_native_session_reference_digest_candidate:
      event.payload.native_ceremony_session_reference_digest_candidate,
    challenge_expires_at_candidate: null,
    challenge_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
    capability_candidate_state: event.payload.bootstrap_capability_terminal_state,
    capability_reference_digest_candidate: event.payload.bootstrap_capability_reference_digest_candidate,
    capability_generation_candidate: 0,
    capability_expires_at_candidate: null,
    capability_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
    capability_lineage_head_reference_digest_candidate:
      event.payload.bootstrap_capability_reference_digest_candidate,
    clock_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT",
    epoch_reference_digest_candidate: event.payload.proposed_epoch_reference_digest_candidate,
    monotonic_floor_timestamp_candidate:
      event.payload.proposed_initial_monotonic_floor_timestamp_candidate,
    boot_session_reference_digest_candidate: event.payload.boot_session_reference_digest_candidate,
    quarantine_candidate_state: "NOT_QUARANTINED_CANDIDATE",
    publication_outcome_candidate: "KNOWN_SOURCE_CANDIDATE",
  });
}

function applyMutationFreshness(
  current: FarmOsDay150C2bRuntimeProvenanceSourceProjection,
  binding: FarmOsDay150C2bRuntimeMutationFreshnessBinding,
): Pick<FarmOsDay150C2bRuntimeProvenanceSourceProjection,
"monotonic_floor_timestamp_candidate" | "boot_session_reference_digest_candidate"> | null {
  if (binding.freshness_basis === "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE") {
    return current.quarantine_candidate_state === "NOT_QUARANTINED_CANDIDATE" ||
      current.clock_candidate_state !== "ROLLBACK_QUARANTINE_CANDIDATE" ? null : {
      monotonic_floor_timestamp_candidate: current.monotonic_floor_timestamp_candidate,
      boot_session_reference_digest_candidate: current.boot_session_reference_digest_candidate,
    };
  }
  if (current.quarantine_candidate_state !== "NOT_QUARANTINED_CANDIDATE" ||
    binding.clock_epoch_reference_digest_candidate !== current.epoch_reference_digest_candidate ||
    binding.prior_monotonic_floor_timestamp_candidate !== current.monotonic_floor_timestamp_candidate ||
    binding.boot_session_reference_digest_candidate !== current.boot_session_reference_digest_candidate) {
    return null;
  }
  return {
    monotonic_floor_timestamp_candidate: binding.proposed_monotonic_floor_timestamp_candidate,
    boot_session_reference_digest_candidate: binding.boot_session_reference_digest_candidate,
  };
}

function transition(
  current: FarmOsDay150C2bRuntimeProvenanceSourceProjection,
  event: FarmOsDay150C2bRuntimeProvenanceEvent,
  currentHead?: HeadContext,
): FarmOsDay150C2bRuntimeProvenanceSourceProjection | null {
  if (event.event_kind === "INTEGRATED_RUNTIME_GENESIS_CANDIDATE") return null;
  const quarantined = current.quarantine_candidate_state !== "NOT_QUARANTINED_CANDIDATE";
  if (current.publication_outcome_candidate === "OUTCOME_UNKNOWN_CANDIDATE") return null;
  switch (event.event_kind) {
    case "CHALLENGE_ISSUANCE_CANDIDATE":
      { const recovery = event.payload.boot_session_recovery_binding_candidate;
      if (recovery) {
        const predecessor = currentHead?.event;
        if (!currentHead || predecessor?.event_kind !== "CHALLENGE_TERMINALIZATION_CANDIDATE") {
          return null;
        }
        const condition = predecessor.payload.cross_epoch_recovery_binding_candidate;
        if (!condition ||
          current.challenge_candidate_state !== "BOOT_SESSION_INVALIDATED_CANDIDATE" ||
          current.capability_candidate_state === "AVAILABLE_CANDIDATE" ||
          current.quarantine_candidate_state !== "NOT_QUARANTINED_CANDIDATE" ||
          recovery.amendment_authority !==
            FARM_OS_DAY150_C2B_BOOT_SESSION_RECOVERY_CAPABILITY_AUTHORITY ||
          recovery.amendment_revision !== 1 ||
          recovery.amendment_digest !==
            FARM_OS_DAY150_C2B_BOOT_SESSION_RECOVERY_CAPABILITY_DIGEST ||
          recovery.recovery_stage !== "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE" ||
          recovery.expected_head_generation !== currentHead.generation ||
          recovery.expected_head_digest !== currentHead.digest ||
          recovery.gen2_record_digest_candidate !== currentHead.digest ||
          recovery.gen2_terminal_reference_digest_candidate !==
            predecessor.payload.terminal_reference_digest_candidate ||
          recovery.historical_challenge_reference_digest_candidate !==
            predecessor.payload.challenge_reference_digest_candidate ||
          recovery.historical_session_reference_digest_candidate !==
            predecessor.payload.native_ceremony_session_reference_digest_candidate ||
          predecessor.payload.terminal_state !== "BOOT_SESSION_INVALIDATED_CANDIDATE" ||
          condition.amendment_authority !==
            FARM_OS_DAY150_C2B_CROSS_EPOCH_CHALLENGE_RECOVERY_AUTHORITY ||
          condition.amendment_revision !== 1 ||
          condition.amendment_digest !==
            FARM_OS_DAY150_C2B_CROSS_EPOCH_CHALLENGE_RECOVERY_DIGEST ||
          condition.terminal_reason !== "BOOT_SESSION_CHANGE" ||
          condition.old_epoch_reference_digest_candidate !==
            recovery.old_epoch_reference_digest_candidate ||
          condition.old_boot_session_reference_digest_candidate !==
            recovery.old_boot_session_reference_digest_candidate ||
          recovery.old_epoch_reference_digest_candidate !== current.epoch_reference_digest_candidate ||
          recovery.old_boot_session_reference_digest_candidate !==
            current.boot_session_reference_digest_candidate ||
          recovery.current_boot_session_reference_digest_candidate !==
            condition.current_boot_session_reference_digest_candidate ||
          recovery.recovery_session_reference_digest_candidate ===
            condition.recovery_session_reference_digest_candidate ||
          recovery.recovery_purpose !== "CLOCK_EPOCH_SUPERSESSION_CANDIDATE" ||
          recovery.recovery_policy_revision !== 1 ||
          event.payload.challenge_reference_digest_candidate !==
            recovery.recovery_challenge_reference_digest_candidate ||
          event.payload.native_ceremony_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.native_recovery_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.freshness_basis !== "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE") return null;
        return projection({ ...current,
          challenge_candidate_state: "OUTSTANDING_CANDIDATE",
          challenge_reference_digest_candidate: event.payload.challenge_reference_digest_candidate,
          challenge_native_session_reference_digest_candidate:
            event.payload.native_ceremony_session_reference_digest_candidate,
          challenge_expires_at_candidate: null,
          challenge_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
        });
      }
      const freshness = applyMutationFreshness(current, event.payload);
      if (current.bootstrap_candidate_state !== "INITIALIZED_CANDIDATE" ||
        current.challenge_candidate_state === "OUTSTANDING_CANDIDATE" ||
        current.challenge_candidate_state === "BOOT_SESSION_INVALIDATED_CANDIDATE" ||
        current.capability_candidate_state === "AVAILABLE_CANDIDATE" || !freshness ||
        current.actor_reference_digest_candidate !== event.payload.actor_reference_digest_candidate ||
        (event.payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE" &&
          (event.payload.issued_at_candidate === null ||
            current.monotonic_floor_timestamp_candidate === null ||
            Date.parse(event.payload.issued_at_candidate) <=
              Date.parse(current.monotonic_floor_timestamp_candidate))) ||
        (event.payload.freshness_basis === "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" &&
          event.payload.native_ceremony_session_reference_digest_candidate !==
            event.payload.native_recovery_session_reference_digest_candidate)) return null;
      return projection({ ...current,
        challenge_candidate_state: "OUTSTANDING_CANDIDATE",
        challenge_reference_digest_candidate: event.payload.challenge_reference_digest_candidate,
        challenge_native_session_reference_digest_candidate:
          event.payload.native_ceremony_session_reference_digest_candidate,
        challenge_expires_at_candidate: event.payload.expires_at_candidate,
        challenge_freshness_basis: event.payload.freshness_basis, ...freshness,
      }); }
    case "CHALLENGE_TERMINALIZATION_CANDIDATE":
      { const crossEpoch = event.payload.cross_epoch_recovery_binding_candidate;
      const recovery = event.payload.boot_session_recovery_binding_candidate;
      if (recovery) {
        const priorBinding = bootRecoveryBinding(currentHead?.event);
        if (!currentHead || !priorBinding ||
          priorBinding.recovery_stage !== "RECOVERY_CHALLENGE_ISSUANCE_CANDIDATE" ||
          recovery.recovery_stage !== "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE" ||
          recovery.expected_head_generation !== currentHead.generation ||
          recovery.expected_head_digest !== currentHead.digest ||
          !recoveryLineageMatches(recovery, priorBinding) ||
          current.challenge_candidate_state !== "OUTSTANDING_CANDIDATE" ||
          current.challenge_reference_digest_candidate !==
            recovery.recovery_challenge_reference_digest_candidate ||
          current.challenge_native_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.challenge_reference_digest_candidate !==
            recovery.recovery_challenge_reference_digest_candidate ||
          event.payload.native_ceremony_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.native_recovery_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.terminal_state !== "CONSUMED_APPROVAL_SUCCESS_CANDIDATE" ||
          event.payload.freshness_basis !== "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE") return null;
        return projection({ ...current,
          challenge_candidate_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE" });
      }
      if (event.payload.terminal_state === "BOOT_SESSION_INVALIDATED_CANDIDATE") {
        if (!currentHead || !crossEpoch ||
          current.challenge_candidate_state !== "OUTSTANDING_CANDIDATE" ||
          current.challenge_freshness_basis !== "ACTIVE_TRUSTED_CLOCK_CANDIDATE" ||
          current.challenge_reference_digest_candidate !==
            event.payload.challenge_reference_digest_candidate ||
          current.challenge_native_session_reference_digest_candidate !==
            event.payload.native_ceremony_session_reference_digest_candidate ||
          current.quarantine_candidate_state !== "NOT_QUARANTINED_CANDIDATE" ||
          current.publication_outcome_candidate !== "KNOWN_SOURCE_CANDIDATE" ||
          event.payload.freshness_basis !== "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" ||
          event.payload.observed_at_candidate !== null ||
          crossEpoch.amendment_authority !==
            FARM_OS_DAY150_C2B_CROSS_EPOCH_CHALLENGE_RECOVERY_AUTHORITY ||
          crossEpoch.amendment_digest !==
            FARM_OS_DAY150_C2B_CROSS_EPOCH_CHALLENGE_RECOVERY_DIGEST ||
          crossEpoch.expected_head_generation !== currentHead.generation ||
          crossEpoch.expected_head_digest !== currentHead.digest ||
          crossEpoch.old_epoch_reference_digest_candidate !==
            current.epoch_reference_digest_candidate ||
          crossEpoch.old_boot_session_reference_digest_candidate !==
            current.boot_session_reference_digest_candidate ||
          crossEpoch.old_boot_session_reference_digest_candidate ===
            crossEpoch.current_boot_session_reference_digest_candidate ||
          crossEpoch.recovery_session_reference_digest_candidate !==
            event.payload.native_recovery_session_reference_digest_candidate) return null;
        return projection({ ...current,
          challenge_candidate_state: "BOOT_SESSION_INVALIDATED_CANDIDATE" });
      }
      if (crossEpoch) return null;
      const freshness = applyMutationFreshness(current, event.payload);
      if (current.challenge_candidate_state !== "OUTSTANDING_CANDIDATE" ||
        current.challenge_reference_digest_candidate !==
          event.payload.challenge_reference_digest_candidate || !freshness ||
        current.challenge_freshness_basis !== event.payload.freshness_basis ||
        current.challenge_native_session_reference_digest_candidate !==
          event.payload.native_ceremony_session_reference_digest_candidate ||
        (event.payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE" &&
          (event.payload.observed_at_candidate === null || current.challenge_expires_at_candidate === null ||
            (event.payload.terminal_state === "EXPIRED_CANDIDATE"
              ? Date.parse(event.payload.observed_at_candidate) <
                Date.parse(current.challenge_expires_at_candidate)
              : Date.parse(event.payload.observed_at_candidate) >
                Date.parse(current.challenge_expires_at_candidate)))) ||
        (event.payload.freshness_basis === "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" &&
          current.challenge_native_session_reference_digest_candidate !==
            event.payload.native_recovery_session_reference_digest_candidate)) return null;
      return projection({ ...current, challenge_candidate_state: event.payload.terminal_state,
        publication_outcome_candidate: event.payload.terminal_state === "OUTCOME_UNKNOWN_CANDIDATE"
          ? "OUTCOME_UNKNOWN_CANDIDATE" : current.publication_outcome_candidate, ...freshness }); }
    case "CAPABILITY_ISSUANCE_CANDIDATE":
      { const recovery = event.payload.boot_session_recovery_binding_candidate;
      if (recovery) {
        const priorBinding = bootRecoveryBinding(currentHead?.event);
        if (!currentHead || !priorBinding ||
          priorBinding.recovery_stage !== "RECOVERY_CHALLENGE_TERMINALIZATION_CANDIDATE" ||
          recovery.recovery_stage !== "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE" ||
          recovery.expected_head_generation !== currentHead.generation ||
          recovery.expected_head_digest !== currentHead.digest ||
          !recoveryLineageMatches(recovery, priorBinding) ||
          recovery.recovery_challenge_terminal_reference_digest_candidate !==
            priorBinding.recovery_challenge_terminal_reference_digest_candidate ||
          current.challenge_candidate_state !== "CONSUMED_APPROVAL_SUCCESS_CANDIDATE" ||
          current.challenge_reference_digest_candidate !==
            recovery.recovery_challenge_reference_digest_candidate ||
          current.challenge_native_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          current.capability_candidate_state === "AVAILABLE_CANDIDATE" ||
          event.payload.capability_reference_digest_candidate !==
            recovery.recovery_capability_reference_digest_candidate ||
          event.payload.native_ceremony_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.native_recovery_session_reference_digest_candidate !==
            recovery.recovery_session_reference_digest_candidate ||
          event.payload.capability_generation !==
            (current.capability_generation_candidate ?? -1) + 1 ||
          event.payload.previous_capability_or_revocation_reference_digest_candidate !==
            current.capability_lineage_head_reference_digest_candidate ||
          event.payload.freshness_basis !== "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE") return null;
        return projection({ ...current,
          capability_candidate_state: "AVAILABLE_CANDIDATE",
          capability_reference_digest_candidate: event.payload.capability_reference_digest_candidate,
          capability_generation_candidate: event.payload.capability_generation,
          capability_expires_at_candidate: null,
          capability_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
          capability_lineage_head_reference_digest_candidate:
            event.payload.capability_reference_digest_candidate,
        });
      }
      const freshness = applyMutationFreshness(current, event.payload);
      if (currentHead?.event?.event_kind !== "CHALLENGE_TERMINALIZATION_CANDIDATE" ||
        current.challenge_candidate_state !== "CONSUMED_AUTHENTICATION_SUCCESS_CANDIDATE" ||
        current.challenge_reference_digest_candidate !==
          event.payload.challenge_reference_digest_candidate ||
        current.capability_candidate_state === "AVAILABLE_CANDIDATE" || !freshness ||
        current.actor_reference_digest_candidate !== event.payload.actor_reference_digest_candidate ||
        current.challenge_freshness_basis !== event.payload.freshness_basis ||
        current.challenge_native_session_reference_digest_candidate !==
          event.payload.native_ceremony_session_reference_digest_candidate ||
        (event.payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE" &&
          (event.payload.issued_at_candidate === null ||
            current.monotonic_floor_timestamp_candidate === null ||
            Date.parse(event.payload.issued_at_candidate) <=
              Date.parse(current.monotonic_floor_timestamp_candidate))) ||
        (event.payload.freshness_basis === "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" &&
          current.challenge_native_session_reference_digest_candidate !==
            event.payload.native_recovery_session_reference_digest_candidate) ||
        event.payload.capability_generation !== (current.capability_generation_candidate ?? -1) + 1 ||
        event.payload.previous_capability_or_revocation_reference_digest_candidate !==
          current.capability_lineage_head_reference_digest_candidate) return null;
      return projection({ ...current, capability_candidate_state: "AVAILABLE_CANDIDATE",
        capability_reference_digest_candidate: event.payload.capability_reference_digest_candidate,
        capability_generation_candidate: event.payload.capability_generation,
        capability_expires_at_candidate: event.payload.expires_at_candidate,
        capability_freshness_basis: event.payload.freshness_basis,
        capability_lineage_head_reference_digest_candidate:
          event.payload.capability_reference_digest_candidate, ...freshness }); }
    case "CAPABILITY_TERMINALIZATION_CANDIDATE":
      { const freshness = applyMutationFreshness(current, event.payload);
      if (current.capability_candidate_state !== "AVAILABLE_CANDIDATE" ||
        current.capability_reference_digest_candidate !==
          event.payload.capability_reference_digest_candidate || !freshness ||
        current.capability_freshness_basis !== event.payload.freshness_basis ||
        event.payload.native_ceremony_session_reference_digest_candidate !==
          current.challenge_native_session_reference_digest_candidate ||
        (event.payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE" &&
          (event.payload.observed_at_candidate === null || current.capability_expires_at_candidate === null ||
            (event.payload.terminal_state === "EXPIRED_CANDIDATE"
              ? Date.parse(event.payload.observed_at_candidate) <=
                Date.parse(current.capability_expires_at_candidate)
              : Date.parse(event.payload.observed_at_candidate) >
                Date.parse(current.capability_expires_at_candidate)))) ||
        (event.payload.freshness_basis === "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" &&
          current.challenge_native_session_reference_digest_candidate !==
            event.payload.native_recovery_session_reference_digest_candidate)) return null;
      return projection({ ...current, capability_candidate_state: event.payload.terminal_state,
        capability_lineage_head_reference_digest_candidate:
          event.payload.terminal_state === "REVOKED_CANDIDATE" ||
            event.payload.terminal_state === "REPLACED_CANDIDATE"
            ? event.payload.terminal_reference_digest_candidate
            : current.capability_reference_digest_candidate,
        publication_outcome_candidate: event.payload.terminal_state === "OUTCOME_UNKNOWN_CANDIDATE"
          ? "OUTCOME_UNKNOWN_CANDIDATE" : current.publication_outcome_candidate, ...freshness }); }
    case "CLOCK_FLOOR_ADVANCEMENT_CANDIDATE":
      if (current.clock_candidate_state !== "ESTABLISHMENT_CANDIDATE_PRESENT" ||
        current.challenge_candidate_state === "BOOT_SESSION_INVALIDATED_CANDIDATE" ||
        current.epoch_reference_digest_candidate !== event.payload.epoch_reference_digest_candidate ||
        current.monotonic_floor_timestamp_candidate !== event.payload.prior_floor_timestamp_candidate ||
        current.boot_session_reference_digest_candidate !==
          event.payload.boot_session_reference_digest_candidate) {
        return null;
      }
      return projection({ ...current,
        monotonic_floor_timestamp_candidate: event.payload.proposed_floor_timestamp_candidate });
    case "CLOCK_ROLLBACK_QUARANTINE_CANDIDATE":
      if (current.clock_candidate_state !== "ESTABLISHMENT_CANDIDATE_PRESENT" ||
        current.epoch_reference_digest_candidate !== event.payload.epoch_reference_digest_candidate ||
        current.monotonic_floor_timestamp_candidate !==
          event.payload.durable_prior_floor_timestamp_candidate ||
        current.boot_session_reference_digest_candidate !==
          event.payload.boot_session_reference_digest_candidate) return null;
      return projection({ ...current, clock_candidate_state: "ROLLBACK_QUARANTINE_CANDIDATE",
        quarantine_candidate_state: "QUARANTINE_REQUIRED_CANDIDATE" });
    case "CLOCK_EPOCH_SUPERSESSION_CANDIDATE":
      { const recovery = bootRecoveryBinding(currentHead?.event);
      const bootSessionEligible = recovery?.recovery_stage ===
          "RECOVERY_CAPABILITY_ISSUANCE_CANDIDATE" &&
        recovery.amendment_authority ===
          FARM_OS_DAY150_C2B_BOOT_SESSION_RECOVERY_CAPABILITY_AUTHORITY &&
        recovery.amendment_revision === 1 &&
        recovery.amendment_digest ===
          FARM_OS_DAY150_C2B_BOOT_SESSION_RECOVERY_CAPABILITY_DIGEST &&
        recovery.recovery_purpose === "CLOCK_EPOCH_SUPERSESSION_CANDIDATE" &&
        recovery.recovery_capability_reference_digest_candidate ===
          event.payload.recovery_capability_reference_digest_candidate &&
        recovery.old_epoch_reference_digest_candidate ===
          event.payload.previous_epoch_reference_digest_candidate &&
        recovery.current_boot_session_reference_digest_candidate ===
          event.payload.boot_session_reference_digest_candidate;
      if ((!quarantined && !bootSessionEligible) || current.epoch_reference_digest_candidate !==
        event.payload.previous_epoch_reference_digest_candidate ||
        current.capability_candidate_state !== "AVAILABLE_CANDIDATE" ||
        current.capability_freshness_basis !== "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" ||
        current.capability_reference_digest_candidate !==
          event.payload.recovery_capability_reference_digest_candidate ||
        current.actor_reference_digest_candidate !==
          event.payload.recovery_actor_reference_digest_candidate) return null;
      return projection({ ...current, clock_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT",
        epoch_reference_digest_candidate: event.payload.proposed_new_epoch_reference_digest_candidate,
        monotonic_floor_timestamp_candidate: event.payload.proposed_new_floor_timestamp_candidate,
        boot_session_reference_digest_candidate: event.payload.boot_session_reference_digest_candidate,
        capability_candidate_state: "CONSUMED_CANDIDATE",
        quarantine_candidate_state: "NOT_QUARANTINED_CANDIDATE",
        publication_outcome_candidate: "KNOWN_SOURCE_CANDIDATE" }); }
    case "RUNTIME_QUARANTINE_ENTERED_CANDIDATE":
      return projection({ ...current, quarantine_candidate_state: "QUARANTINE_REQUIRED_CANDIDATE",
        publication_outcome_candidate: "OUTCOME_UNKNOWN_CANDIDATE" });
    case "RUNTIME_RECOVERY_RECORDED_CANDIDATE":
      if (!quarantined) return null;
      return projection({ ...current,
        quarantine_candidate_state: "RECOVERY_RECORDED_QUARANTINE_REMAINS_CANDIDATE",
        publication_outcome_candidate: "OUTCOME_UNKNOWN_CANDIDATE" });
  }
}

function reusesIssuedReference(
  priorRecords: readonly FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate[],
  event: FarmOsDay150C2bRuntimeProvenanceEvent,
): boolean {
  if (event.event_kind === "CHALLENGE_ISSUANCE_CANDIDATE" &&
    event.payload.boot_session_recovery_binding_candidate) {
    const recovery = event.payload.boot_session_recovery_binding_candidate
      .recovery_session_reference_digest_candidate;
    return priorRecords.some((record) => {
      const prior = record.record_body.event;
      if (prior.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE") {
        return prior.payload.cross_epoch_recovery_binding_candidate
          ?.recovery_session_reference_digest_candidate === recovery;
      }
      return prior.event_kind === "CHALLENGE_ISSUANCE_CANDIDATE" &&
        prior.payload.boot_session_recovery_binding_candidate
          ?.recovery_session_reference_digest_candidate === recovery;
    });
  }
  if (event.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE" &&
    event.payload.cross_epoch_recovery_binding_candidate) {
    const recovery = event.payload.cross_epoch_recovery_binding_candidate
      .recovery_session_reference_digest_candidate;
    return priorRecords.some((record) => {
      const prior = record.record_body.event;
      return prior.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE" &&
        prior.payload.cross_epoch_recovery_binding_candidate
          ?.recovery_session_reference_digest_candidate === recovery;
    });
  }
  if (event.event_kind !== "CHALLENGE_ISSUANCE_CANDIDATE" &&
    event.event_kind !== "CAPABILITY_ISSUANCE_CANDIDATE") return false;
  const challenge = event.event_kind === "CHALLENGE_ISSUANCE_CANDIDATE"
    ? event.payload.challenge_reference_digest_candidate : null;
  const capability = event.event_kind === "CAPABILITY_ISSUANCE_CANDIDATE"
    ? event.payload.capability_reference_digest_candidate : null;
  return priorRecords.some((record) => {
    const prior = record.record_body.event;
    if (prior.event_kind === "INTEGRATED_RUNTIME_GENESIS_CANDIDATE") {
      return prior.payload.initial_challenge_reference_digest_candidate === challenge ||
        prior.payload.bootstrap_capability_reference_digest_candidate === capability;
    }
    return prior.event_kind === "CHALLENGE_ISSUANCE_CANDIDATE"
      ? prior.payload.challenge_reference_digest_candidate === challenge
      : prior.event_kind === "CAPABILITY_ISSUANCE_CANDIDATE" &&
        prior.payload.capability_reference_digest_candidate === capability;
  });
}

export function replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate(
  value: unknown,
): FarmOsDay150C2bRuntimeProvenanceReplayResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(value);
  if (!snapshot.accepted || !Array.isArray(snapshot.snapshot)) {
    return invalid("UNTRUSTED_RUNTIME_PROVENANCE_CHAIN_INPUT");
  }
  const records: FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate[] = [];
  for (const item of snapshot.snapshot) {
    const parsed = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(item);
    if (parsed.classification !== "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE") {
      return invalid(parsed.reason);
    }
    records.push(parsed.record);
  }
  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      if (records[left]!.record_body.generation !== records[right]!.record_body.generation) continue;
      return invalid(farmOsDay150C2bRuntimeProvenanceRecordsAreSourceEqual(records[left], records[right])
        ? "DUPLICATE_EXACT_RECORD_CANDIDATE" : "DIVERGENT_GENERATION_FORK_CANDIDATE");
    }
  }
  if (records.length === 0 || records[0]!.record_body.generation !== 0) {
    return invalid("MISSING_INTEGRATED_GENESIS");
  }
  if (records.some((item, index) => index > 0 && item.record_body.generation === 0)) {
    return invalid("GENESIS_NOT_FIRST");
  }
  let projected = genesisProjection(records[0]!.record_body.event);
  if (!projected) return invalid("MISSING_INTEGRATED_GENESIS");
  if (!canonicalEqual(projected, records[0]!.record_body.projected_source_state_claim)) {
    return invalid("INVALID_PROJECTED_SOURCE_STATE_CLAIM");
  }
  for (let index = 1; index < records.length; index += 1) {
    const prior = records[index - 1]!;
    const next = records[index]!;
    const expected = prior.record_body.generation + 1;
    if (next.record_body.generation > expected) return invalid("GENERATION_GAP");
    if (next.record_body.generation < expected) return invalid("OUT_OF_ORDER");
    if (next.record_body.previous_generation !== prior.record_body.generation ||
      next.record_body.previous_record_digest !== prior.record_digest) {
      return invalid("PREDECESSOR_MISMATCH");
    }
    if (!canonicalEqual(next.record_body.source_bindings, prior.record_body.source_bindings)) {
      return invalid("SOURCE_BINDING_MISMATCH");
    }
    if (reusesIssuedReference(records.slice(0, index), next.record_body.event)) {
      return invalid("REFERENCE_REPLAY_CANDIDATE");
    }
    const nextProjection = transition(projected, next.record_body.event, {
      generation: prior.record_body.generation, digest: prior.record_digest,
      event: prior.record_body.event,
    });
    if (!nextProjection) return invalid("INVALID_EVENT_TRANSITION");
    if (!canonicalEqual(nextProjection, next.record_body.projected_source_state_claim)) {
      return invalid("INVALID_PROJECTED_SOURCE_STATE_CLAIM");
    }
    projected = nextProjection;
  }
  return Object.freeze({
    classification: "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE",
    chain_semantics: "SOURCE_CHAIN_CANDIDATE_ONLY_NOT_PUBLICATION_OR_TRUST",
    candidate_generation: records.at(-1)!.record_body.generation,
    candidate_head_digest: records.at(-1)!.record_digest,
    source_projection: projected,
    source_chain_candidate: Object.freeze(records),
  });
}

export function deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
  current: FarmOsDay150C2bRuntimeProvenanceSourceProjection,
  event: FarmOsDay150C2bRuntimeProvenanceEvent,
  currentHead?: HeadContext,
): FarmOsDay150C2bRuntimeProvenanceSourceProjection | null {
  return transition(current, event, currentHead);
}

export type FarmOsDay150C2bRuntimeProvenanceCandidateComparison = Readonly<{
  classification: "SOURCE_CANDIDATE_EQUALITY_ONLY" | "SOURCE_CANDIDATE_DIFFERENCE" |
    "SOURCE_CANDIDATE_COMPARISON_INVALID";
  runtime_idempotence_established: false;
  runtime_publication_established: false;
}>;
export function compareFarmOsDay150C2bRuntimeProvenanceSourceCandidates(
  left: unknown, right: unknown,
): FarmOsDay150C2bRuntimeProvenanceCandidateComparison {
  const a = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(left);
  const b = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(right);
  const classification = a.classification !== "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE" ||
    b.classification !== "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE"
    ? "SOURCE_CANDIDATE_COMPARISON_INVALID" as const
    : farmOsDay150C2bRuntimeProvenanceRecordsAreSourceEqual(left, right)
      ? "SOURCE_CANDIDATE_EQUALITY_ONLY" as const : "SOURCE_CANDIDATE_DIFFERENCE" as const;
  return Object.freeze({ classification, runtime_idempotence_established: false,
    runtime_publication_established: false });
}
