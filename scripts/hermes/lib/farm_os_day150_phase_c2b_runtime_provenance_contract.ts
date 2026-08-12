import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
  isCanonicalFarmOsProductionTargetExecutionTimestamp,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
} from "./farm_os_day150_phase_c2b_bootstrap_actor_source_contract";
import { FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY as CLOCK_AUTHORITY } from
  "./farm_os_day150_phase_c2b_bootstrap_clock_source_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
  snapshotFarmOsDay150C2bBootstrapData,
  type FarmOsDay150C2bBootstrapDataSnapshot,
} from "./farm_os_day150_phase_c2b_bootstrap_ledger_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE,
} from "./farm_os_day150_phase_c2b_bootstrap_manifest_contract";

export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY =
  "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:record-body" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_SOURCE_BINDINGS_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:source-bindings" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_GENESIS_PROPOSAL_AUTHORITY =
  "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_GENESIS_DECISION_AUTHORITY =
  "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_GENESIS_RECEIPT_AUTHORITY =
  "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1" as const;
const GENESIS_PROPOSAL_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-runtime-genesis-proposal.v1:body" as const;
const GENESIS_DECISION_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-runtime-genesis-approval-decision.v1:body" as const;
const GENESIS_RECEIPT_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-runtime-genesis-approval-receipt.v1:body" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY =
  "farmos.day150-c2b-bootstrap-runtime-provenance-event.v1" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY =
  "farmos.day150-c2b-bootstrap-runtime-provenance-source-projection.v1" as const;
export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE =
  "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" as const;

export const FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_KINDS = Object.freeze([
  "INTEGRATED_RUNTIME_GENESIS_CANDIDATE",
  "CHALLENGE_ISSUANCE_CANDIDATE",
  "CHALLENGE_TERMINALIZATION_CANDIDATE",
  "CAPABILITY_ISSUANCE_CANDIDATE",
  "CAPABILITY_TERMINALIZATION_CANDIDATE",
  "CLOCK_FLOOR_ADVANCEMENT_CANDIDATE",
  "CLOCK_ROLLBACK_QUARANTINE_CANDIDATE",
  "CLOCK_EPOCH_SUPERSESSION_CANDIDATE",
  "RUNTIME_QUARANTINE_ENTERED_CANDIDATE",
  "RUNTIME_RECOVERY_RECORDED_CANDIDATE",
] as const);
export type FarmOsDay150C2bRuntimeProvenanceEventKind =
  typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_KINDS[number];

export const FARM_OS_DAY150_C2B_CHALLENGE_TERMINAL_STATES = Object.freeze([
  "CONSUMED_APPROVAL_SUCCESS_CANDIDATE", "CONSUMED_APPROVAL_FAILURE_CANDIDATE",
  "ABANDONED_CANDIDATE", "EXPIRED_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE",
] as const);
export const FARM_OS_DAY150_C2B_CAPABILITY_TERMINAL_STATES = Object.freeze([
  "CONSUMED_CANDIDATE", "EXPIRED_CANDIDATE", "REVOKED_CANDIDATE",
  "REPLACED_CANDIDATE", "OUTCOME_UNKNOWN_CANDIDATE",
] as const);
export const FARM_OS_DAY150_C2B_RUNTIME_QUARANTINE_REASONS = Object.freeze([
  "CLOCK_ROLLBACK_CONDITION_CANDIDATE", "FORWARD_POISON_CONDITION_CANDIDATE",
  "CHAIN_CORRUPTION_CANDIDATE", "PUBLICATION_OUTCOME_UNKNOWN_CANDIDATE",
  "ORPHAN_OBSERVATION_UNKNOWN_CANDIDATE",
] as const);

type Digest = `sha256:${string}`;
export type FarmOsDay150C2bRuntimeGenesisProposalBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_RUNTIME_GENESIS_PROPOSAL_AUTHORITY;
  purpose: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE;
  target_binding_digest: Digest;
  actor_reference_digest_candidate: Digest;
  challenge_reference_digest_candidate: Digest;
  native_ceremony_session_reference_digest_candidate: Digest;
  os_utc_observation_reference_digest_candidate: Digest;
  human_time_plausibility_confirmation_reference_digest: Digest;
}>;
export type FarmOsDay150C2bRuntimeGenesisDecisionBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_RUNTIME_GENESIS_DECISION_AUTHORITY;
  decision: "APPROVE";
  proposal_reference_digest: Digest;
  actor_reference_digest_candidate: Digest;
  challenge_reference_digest_candidate: Digest;
  authentication_mechanism_revision: 1;
}>;
export type FarmOsDay150C2bRuntimeGenesisReceiptBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_RUNTIME_GENESIS_RECEIPT_AUTHORITY;
  proposal_reference_digest: Digest;
  approval_decision_reference_digest: Digest;
  actor_reference_digest_candidate: Digest;
  challenge_reference_digest_candidate: Digest;
  challenge_terminal_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE";
  capability_reference_digest_candidate: Digest;
  capability_terminal_state: "CONSUMED_CANDIDATE";
}>;
export type FarmOsDay150C2bRuntimeMutationFreshnessBinding = Readonly<{
  freshness_basis: "ACTIVE_TRUSTED_CLOCK_CANDIDATE" | "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE";
  clock_epoch_reference_digest_candidate: Digest | null;
  prior_monotonic_floor_timestamp_candidate: string | null;
  proposed_monotonic_floor_timestamp_candidate: string | null;
  os_utc_observation_reference_digest_candidate: Digest | null;
  continuous_time_bracket_reference_digest_candidate: Digest | null;
  boot_session_reference_digest_candidate: Digest | null;
  native_recovery_session_reference_digest_candidate: Digest | null;
  clock_comparison_policy_revision: 1;
}>;
type Event<K extends FarmOsDay150C2bRuntimeProvenanceEventKind, P> = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY;
  event_kind: K;
  payload: Readonly<P>;
}>;

export type FarmOsDay150C2bRuntimeGenesisCandidateEvent = Event<
  "INTEGRATED_RUNTIME_GENESIS_CANDIDATE", {
    proposal_reference_digest: Digest;
    proposal_body_candidate: FarmOsDay150C2bRuntimeGenesisProposalBody;
    proposal_target_binding_digest: Digest;
    human_approval_decision_reference_digest: Digest;
    human_approval_decision_body_candidate: FarmOsDay150C2bRuntimeGenesisDecisionBody;
    approval_decision_proposal_reference_digest: Digest;
    approval_decision_actor_reference_digest_candidate: Digest;
    approval_decision_challenge_reference_digest_candidate: Digest;
    approval_receipt_reference_digest: Digest;
    approval_receipt_body_candidate: FarmOsDay150C2bRuntimeGenesisReceiptBody;
    approval_receipt_proposal_reference_digest: Digest;
    approval_receipt_decision_reference_digest: Digest;
    approval_receipt_actor_reference_digest_candidate: Digest;
    approval_receipt_challenge_reference_digest_candidate: Digest;
    approval_receipt_capability_reference_digest_candidate: Digest;
    actor_reference_digest_candidate: Digest;
    native_ceremony_session_reference_digest_candidate: Digest;
    initial_challenge_reference_digest_candidate: Digest;
    initial_challenge_terminal_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE";
    bootstrap_capability_reference_digest_candidate: Digest;
    bootstrap_capability_terminal_state: "CONSUMED_CANDIDATE";
    os_utc_observation_reference_digest_candidate: Digest;
    continuous_time_bracket_reference_digest_candidate: Digest;
    boot_session_reference_digest_candidate: Digest;
    human_time_plausibility_confirmation_reference_digest: Digest;
    proposed_epoch_reference_digest_candidate: Digest;
    proposed_genesis_timestamp_candidate: string;
    proposed_initial_monotonic_floor_timestamp_candidate: string;
    actor_policy_revision: 1;
    clock_policy_revision: 1;
    publication_policy_revision: 1;
  }
>;
export type FarmOsDay150C2bChallengeIssuanceCandidateEvent = Event<
  "CHALLENGE_ISSUANCE_CANDIDATE", {
    challenge_reference_digest_candidate: Digest;
    actor_reference_digest_candidate: Digest;
    native_ceremony_session_reference_digest_candidate: Digest;
    expires_at_candidate: string | null;
    issued_at_candidate: string | null;
    scope: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE;
  } & FarmOsDay150C2bRuntimeMutationFreshnessBinding
>;
export type FarmOsDay150C2bChallengeTerminalizationCandidateEvent = Event<
  "CHALLENGE_TERMINALIZATION_CANDIDATE", {
    challenge_reference_digest_candidate: Digest;
    terminal_state: typeof FARM_OS_DAY150_C2B_CHALLENGE_TERMINAL_STATES[number];
    terminal_reference_digest_candidate: Digest;
    observed_at_candidate: string | null;
    native_ceremony_session_reference_digest_candidate: Digest;
  } & FarmOsDay150C2bRuntimeMutationFreshnessBinding
>;
export type FarmOsDay150C2bCapabilityIssuanceCandidateEvent = Event<
  "CAPABILITY_ISSUANCE_CANDIDATE", {
    capability_reference_digest_candidate: Digest;
    actor_reference_digest_candidate: Digest;
    challenge_reference_digest_candidate: Digest;
    native_ceremony_session_reference_digest_candidate: Digest;
    capability_generation: number;
    previous_capability_or_revocation_reference_digest_candidate: Digest | null;
    expires_at_candidate: string | null;
    issued_at_candidate: string | null;
    scope: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE;
    one_shot: true;
  } & FarmOsDay150C2bRuntimeMutationFreshnessBinding
>;
export type FarmOsDay150C2bCapabilityTerminalizationCandidateEvent = Event<
  "CAPABILITY_TERMINALIZATION_CANDIDATE", {
    capability_reference_digest_candidate: Digest;
    terminal_state: typeof FARM_OS_DAY150_C2B_CAPABILITY_TERMINAL_STATES[number];
    terminal_reference_digest_candidate: Digest;
    observed_at_candidate: string | null;
    native_ceremony_session_reference_digest_candidate: Digest;
  } & FarmOsDay150C2bRuntimeMutationFreshnessBinding
>;
export type FarmOsDay150C2bClockFloorAdvancementCandidateEvent = Event<
  "CLOCK_FLOOR_ADVANCEMENT_CANDIDATE", {
    epoch_reference_digest_candidate: Digest;
    prior_floor_timestamp_candidate: string;
    proposed_floor_timestamp_candidate: string;
    os_utc_observation_reference_digest_candidate: Digest;
    continuous_time_bracket_reference_digest_candidate: Digest;
    boot_session_reference_digest_candidate: Digest;
    comparison_policy_revision: 1;
  }
>;
export type FarmOsDay150C2bClockRollbackQuarantineCandidateEvent = Event<
  "CLOCK_ROLLBACK_QUARANTINE_CANDIDATE", {
    epoch_reference_digest_candidate: Digest;
    durable_prior_floor_timestamp_candidate: string;
    proposed_os_observation_timestamp_candidate: string;
    os_utc_observation_reference_digest_candidate: Digest;
    continuous_time_bracket_reference_digest_candidate: Digest;
    boot_session_reference_digest_candidate: Digest;
    quarantine_reference_digest_candidate: Digest;
    comparison_policy_revision: 1;
  }
>;
export type FarmOsDay150C2bClockEpochSupersessionCandidateEvent = Event<
  "CLOCK_EPOCH_SUPERSESSION_CANDIDATE", {
    previous_epoch_reference_digest_candidate: Digest;
    proposed_new_epoch_reference_digest_candidate: Digest;
    recovery_actor_reference_digest_candidate: Digest;
    recovery_capability_reference_digest_candidate: Digest;
    proposed_corrected_genesis_timestamp_candidate: string;
    proposed_new_floor_timestamp_candidate: string;
    affected_record_policy_reference_digest_candidate: Digest;
    os_utc_observation_reference_digest_candidate: Digest;
    continuous_time_bracket_reference_digest_candidate: Digest;
    boot_session_reference_digest_candidate: Digest;
  }
>;
export type FarmOsDay150C2bRuntimeQuarantineEnteredCandidateEvent = Event<
  "RUNTIME_QUARANTINE_ENTERED_CANDIDATE", {
    reason: typeof FARM_OS_DAY150_C2B_RUNTIME_QUARANTINE_REASONS[number];
    evidence_reference_digest_candidate: Digest;
    outcome: "OUTCOME_UNKNOWN_CANDIDATE";
    automatic_retry: false;
    automatic_cleanup: false;
  }
>;
export type FarmOsDay150C2bRuntimeRecoveryRecordedCandidateEvent = Event<
  "RUNTIME_RECOVERY_RECORDED_CANDIDATE", {
    quarantine_reference_digest_candidate: Digest;
    recovery_reference_digest_candidate: Digest;
    recovery_state: "RECOVERY_RECORDED_QUARANTINE_REMAINS_CANDIDATE";
  }
>;

export type FarmOsDay150C2bRuntimeProvenanceEvent =
  | FarmOsDay150C2bRuntimeGenesisCandidateEvent
  | FarmOsDay150C2bChallengeIssuanceCandidateEvent
  | FarmOsDay150C2bChallengeTerminalizationCandidateEvent
  | FarmOsDay150C2bCapabilityIssuanceCandidateEvent
  | FarmOsDay150C2bCapabilityTerminalizationCandidateEvent
  | FarmOsDay150C2bClockFloorAdvancementCandidateEvent
  | FarmOsDay150C2bClockRollbackQuarantineCandidateEvent
  | FarmOsDay150C2bClockEpochSupersessionCandidateEvent
  | FarmOsDay150C2bRuntimeQuarantineEnteredCandidateEvent
  | FarmOsDay150C2bRuntimeRecoveryRecordedCandidateEvent;

export type FarmOsDay150C2bRuntimeSourceBindings = Readonly<{
  manifest_authority: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY;
  manifest_digest: Digest;
  r2_record_authority: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY;
  r2_genesis_source_candidate_digest: Digest;
  r3_actor_source_authority: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY;
  r3_actor_source_candidate_digest: Digest;
  r3_clock_source_authority: typeof CLOCK_AUTHORITY;
  r3_clock_source_candidate_digest: Digest;
  installation_profile_digest_candidate: Digest;
  native_profile_digest_candidate: Digest;
}>;

export type FarmOsDay150C2bRuntimeProvenanceSourceProjection = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY;
  discriminator: "SOURCE_PROJECTION_ONLY";
  bootstrap_candidate_state: "NOT_INITIALIZED_CANDIDATE" | "INITIALIZED_CANDIDATE";
  actor_candidate_state: "NOT_ESTABLISHED_CANDIDATE" | "ESTABLISHMENT_CANDIDATE_PRESENT";
  actor_reference_digest_candidate: Digest | null;
  challenge_candidate_state: "NONE" | "OUTSTANDING_CANDIDATE" |
    typeof FARM_OS_DAY150_C2B_CHALLENGE_TERMINAL_STATES[number];
  challenge_reference_digest_candidate: Digest | null;
  challenge_native_session_reference_digest_candidate: Digest | null;
  challenge_expires_at_candidate: string | null;
  challenge_freshness_basis: FarmOsDay150C2bRuntimeMutationFreshnessBinding["freshness_basis"] | null;
  capability_candidate_state: "NONE" | "AVAILABLE_CANDIDATE" |
    typeof FARM_OS_DAY150_C2B_CAPABILITY_TERMINAL_STATES[number];
  capability_reference_digest_candidate: Digest | null;
  capability_generation_candidate: number | null;
  capability_expires_at_candidate: string | null;
  capability_freshness_basis: FarmOsDay150C2bRuntimeMutationFreshnessBinding["freshness_basis"] | null;
  capability_lineage_head_reference_digest_candidate: Digest | null;
  clock_candidate_state: "NOT_ESTABLISHED_CANDIDATE" | "ESTABLISHMENT_CANDIDATE_PRESENT" |
    "ROLLBACK_QUARANTINE_CANDIDATE";
  epoch_reference_digest_candidate: Digest | null;
  monotonic_floor_timestamp_candidate: string | null;
  boot_session_reference_digest_candidate: Digest | null;
  quarantine_candidate_state: "NOT_QUARANTINED_CANDIDATE" |
    "QUARANTINE_REQUIRED_CANDIDATE" | "RECOVERY_RECORDED_QUARANTINE_REMAINS_CANDIDATE";
  publication_outcome_candidate: "KNOWN_SOURCE_CANDIDATE" | "OUTCOME_UNKNOWN_CANDIDATE";
}>;

export type FarmOsDay150C2bRuntimeProvenanceRecordBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY;
  authority_id: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY;
  authority_revision: typeof FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_REVISION;
  generation: number;
  previous_generation: number | null;
  previous_record_digest: Digest | null;
  source_bindings: FarmOsDay150C2bRuntimeSourceBindings;
  event: FarmOsDay150C2bRuntimeProvenanceEvent;
  projected_source_state_claim: FarmOsDay150C2bRuntimeProvenanceSourceProjection;
}>;
export type FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate = Readonly<{
  record_body: FarmOsDay150C2bRuntimeProvenanceRecordBody;
  record_digest: Digest;
}>;

export type FarmOsDay150C2bRuntimeProvenanceRecordFailureReason =
  | "UNTRUSTED_RUNTIME_PROVENANCE_INPUT" | "INVALID_RECORD_ENVELOPE"
  | "INVALID_RECORD_BODY_SHAPE" | "RUNTIME_PROVENANCE_AUTHORITY_MISMATCH"
  | "INVALID_SOURCE_BINDINGS" | "INVALID_PROFILE_REFERENCE"
  | "INVALID_GENERATION" | "INVALID_PREDECESSOR_SHAPE" | "UNKNOWN_EVENT_KIND"
  | "INVALID_EVENT_PAYLOAD" | "INVALID_PROJECTION_CLAIM" | "MALFORMED_RECORD_DIGEST"
  | "RECORD_DIGEST_MISMATCH" | "GEN0_REQUIREMENTS_MISMATCH";
export type FarmOsDay150C2bRuntimeProvenanceRecordParseResult =
  | Readonly<{ classification: "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE";
    record: FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate }>
  | Readonly<{ classification: "INVALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE";
    reason: FarmOsDay150C2bRuntimeProvenanceRecordFailureReason }>;

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const MUTATION_FRESHNESS_KEYS = Object.freeze(["freshness_basis",
  "clock_epoch_reference_digest_candidate", "prior_monotonic_floor_timestamp_candidate",
  "proposed_monotonic_floor_timestamp_candidate", "os_utc_observation_reference_digest_candidate",
  "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate",
  "native_recovery_session_reference_digest_candidate", "clock_comparison_policy_revision"] as const);
const EVENT_KEYS: Readonly<Record<FarmOsDay150C2bRuntimeProvenanceEventKind,
readonly string[]>> = Object.freeze({
  INTEGRATED_RUNTIME_GENESIS_CANDIDATE: ["proposal_reference_digest", "proposal_body_candidate",
    "proposal_target_binding_digest", "human_approval_decision_reference_digest",
    "human_approval_decision_body_candidate", "approval_decision_proposal_reference_digest",
    "approval_decision_actor_reference_digest_candidate",
    "approval_decision_challenge_reference_digest_candidate", "approval_receipt_reference_digest",
    "approval_receipt_body_candidate",
    "approval_receipt_proposal_reference_digest", "approval_receipt_decision_reference_digest",
    "approval_receipt_actor_reference_digest_candidate",
    "approval_receipt_challenge_reference_digest_candidate",
    "approval_receipt_capability_reference_digest_candidate",
    "actor_reference_digest_candidate", "native_ceremony_session_reference_digest_candidate",
    "initial_challenge_reference_digest_candidate", "initial_challenge_terminal_state",
    "bootstrap_capability_reference_digest_candidate", "bootstrap_capability_terminal_state",
    "os_utc_observation_reference_digest_candidate", "continuous_time_bracket_reference_digest_candidate",
    "boot_session_reference_digest_candidate",
    "human_time_plausibility_confirmation_reference_digest",
    "proposed_epoch_reference_digest_candidate", "proposed_genesis_timestamp_candidate",
    "proposed_initial_monotonic_floor_timestamp_candidate", "actor_policy_revision",
    "clock_policy_revision", "publication_policy_revision"],
  CHALLENGE_ISSUANCE_CANDIDATE: ["challenge_reference_digest_candidate",
    "actor_reference_digest_candidate", "native_ceremony_session_reference_digest_candidate",
    "expires_at_candidate", "issued_at_candidate", "scope", ...MUTATION_FRESHNESS_KEYS],
  CHALLENGE_TERMINALIZATION_CANDIDATE: ["challenge_reference_digest_candidate",
    "terminal_state", "terminal_reference_digest_candidate", "observed_at_candidate",
    "native_ceremony_session_reference_digest_candidate", ...MUTATION_FRESHNESS_KEYS],
  CAPABILITY_ISSUANCE_CANDIDATE: ["capability_reference_digest_candidate",
    "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
    "native_ceremony_session_reference_digest_candidate",
    "capability_generation", "previous_capability_or_revocation_reference_digest_candidate",
    "expires_at_candidate", "issued_at_candidate", "scope", "one_shot", ...MUTATION_FRESHNESS_KEYS],
  CAPABILITY_TERMINALIZATION_CANDIDATE: ["capability_reference_digest_candidate",
    "terminal_state", "terminal_reference_digest_candidate", "observed_at_candidate",
    "native_ceremony_session_reference_digest_candidate", ...MUTATION_FRESHNESS_KEYS],
  CLOCK_FLOOR_ADVANCEMENT_CANDIDATE: ["epoch_reference_digest_candidate",
    "prior_floor_timestamp_candidate", "proposed_floor_timestamp_candidate",
    "os_utc_observation_reference_digest_candidate",
    "continuous_time_bracket_reference_digest_candidate",
    "boot_session_reference_digest_candidate", "comparison_policy_revision"],
  CLOCK_ROLLBACK_QUARANTINE_CANDIDATE: ["epoch_reference_digest_candidate",
    "durable_prior_floor_timestamp_candidate", "proposed_os_observation_timestamp_candidate",
    "os_utc_observation_reference_digest_candidate", "continuous_time_bracket_reference_digest_candidate",
    "boot_session_reference_digest_candidate", "quarantine_reference_digest_candidate",
    "comparison_policy_revision"],
  CLOCK_EPOCH_SUPERSESSION_CANDIDATE: ["previous_epoch_reference_digest_candidate",
    "proposed_new_epoch_reference_digest_candidate", "recovery_actor_reference_digest_candidate",
    "recovery_capability_reference_digest_candidate",
    "proposed_corrected_genesis_timestamp_candidate", "proposed_new_floor_timestamp_candidate",
    "affected_record_policy_reference_digest_candidate", "os_utc_observation_reference_digest_candidate",
    "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate"],
  RUNTIME_QUARANTINE_ENTERED_CANDIDATE: ["reason", "evidence_reference_digest_candidate",
    "outcome", "automatic_retry", "automatic_cleanup"],
  RUNTIME_RECOVERY_RECORDED_CANDIDATE: ["quarantine_reference_digest_candidate",
    "recovery_reference_digest_candidate", "recovery_state"],
});

function record(value: FarmOsDay150C2bBootstrapDataSnapshot):
Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>> : null;
}
function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
function digest(value: unknown): value is Digest {
  return typeof value === "string" && SHA256.test(value);
}
function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
function timestamp(value: unknown): value is string {
  return isCanonicalFarmOsProductionTargetExecutionTimestamp(value);
}
function allDigests(payload: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return keys.every((key) => digest(payload[key]));
}
function validMutationFreshness(payload: Readonly<Record<string, unknown>>): boolean {
  if (payload.clock_comparison_policy_revision !== 1) return false;
  if (payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE") {
    return allDigests(payload, ["clock_epoch_reference_digest_candidate",
      "os_utc_observation_reference_digest_candidate",
      "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate"]) &&
      timestamp(payload.prior_monotonic_floor_timestamp_candidate) &&
      timestamp(payload.proposed_monotonic_floor_timestamp_candidate) &&
      Date.parse(payload.proposed_monotonic_floor_timestamp_candidate as string) >=
        Date.parse(payload.prior_monotonic_floor_timestamp_candidate as string) &&
      payload.native_recovery_session_reference_digest_candidate === null;
  }
  return payload.freshness_basis === "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" &&
    digest(payload.native_recovery_session_reference_digest_candidate) &&
    payload.clock_epoch_reference_digest_candidate === null &&
    payload.prior_monotonic_floor_timestamp_candidate === null &&
    payload.proposed_monotonic_floor_timestamp_candidate === null &&
    payload.os_utc_observation_reference_digest_candidate === null &&
    payload.continuous_time_bracket_reference_digest_candidate === null &&
    payload.boot_session_reference_digest_candidate === null;
}
function validIssuanceTime(payload: Readonly<Record<string, unknown>>): boolean {
  return payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    ? timestamp(payload.issued_at_candidate) && timestamp(payload.expires_at_candidate) &&
      payload.issued_at_candidate === payload.proposed_monotonic_floor_timestamp_candidate &&
      Date.parse(payload.expires_at_candidate as string) > Date.parse(payload.issued_at_candidate as string)
    : payload.issued_at_candidate === null && payload.expires_at_candidate === null;
}
function validObservationTime(payload: Readonly<Record<string, unknown>>): boolean {
  return payload.freshness_basis === "ACTIVE_TRUSTED_CLOCK_CANDIDATE"
    ? timestamp(payload.observed_at_candidate) &&
      payload.observed_at_candidate === payload.proposed_monotonic_floor_timestamp_candidate
    : payload.observed_at_candidate === null;
}
function validGenesisLineage(payload: Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>>):
boolean {
  const proposal = record(payload.proposal_body_candidate);
  const decision = record(payload.human_approval_decision_body_candidate);
  const receipt = record(payload.approval_receipt_body_candidate);
  if (!proposal || !decision || !receipt ||
    !exactKeys(proposal, ["schema_version", "purpose", "target_binding_digest",
      "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
      "native_ceremony_session_reference_digest_candidate",
      "os_utc_observation_reference_digest_candidate",
      "human_time_plausibility_confirmation_reference_digest"]) ||
    !exactKeys(decision, ["schema_version", "decision", "proposal_reference_digest",
      "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
      "authentication_mechanism_revision"]) ||
    !exactKeys(receipt, ["schema_version", "proposal_reference_digest",
      "approval_decision_reference_digest", "actor_reference_digest_candidate",
      "challenge_reference_digest_candidate", "challenge_terminal_state",
      "capability_reference_digest_candidate", "capability_terminal_state"])) return false;
  if (proposal.schema_version !== FARM_OS_DAY150_C2B_RUNTIME_GENESIS_PROPOSAL_AUTHORITY ||
    proposal.purpose !== FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE ||
    decision.schema_version !== FARM_OS_DAY150_C2B_RUNTIME_GENESIS_DECISION_AUTHORITY ||
    decision.decision !== "APPROVE" || decision.authentication_mechanism_revision !== 1 ||
    receipt.schema_version !== FARM_OS_DAY150_C2B_RUNTIME_GENESIS_RECEIPT_AUTHORITY ||
    receipt.challenge_terminal_state !== "CONSUMED_APPROVAL_SUCCESS_CANDIDATE" ||
    receipt.capability_terminal_state !== "CONSUMED_CANDIDATE" ||
    !allDigests(proposal, Object.keys(proposal).filter((key) => key.endsWith("digest") ||
      key.endsWith("digest_candidate"))) ||
    !allDigests(decision, ["proposal_reference_digest", "actor_reference_digest_candidate",
      "challenge_reference_digest_candidate"]) ||
    !allDigests(receipt, ["proposal_reference_digest", "approval_decision_reference_digest",
      "actor_reference_digest_candidate", "challenge_reference_digest_candidate",
      "capability_reference_digest_candidate"])) return false;
  const proposalBody = proposal as unknown as FarmOsDay150C2bRuntimeGenesisProposalBody;
  const decisionBody = decision as unknown as FarmOsDay150C2bRuntimeGenesisDecisionBody;
  const receiptBody = receipt as unknown as FarmOsDay150C2bRuntimeGenesisReceiptBody;
  return computeFarmOsDay150C2bRuntimeGenesisProposalDigest(proposalBody) ===
      payload.proposal_reference_digest &&
    computeFarmOsDay150C2bRuntimeGenesisDecisionDigest(decisionBody) ===
      payload.human_approval_decision_reference_digest &&
    computeFarmOsDay150C2bRuntimeGenesisReceiptDigest(receiptBody) ===
      payload.approval_receipt_reference_digest &&
    proposal.target_binding_digest === payload.proposal_target_binding_digest &&
    proposal.actor_reference_digest_candidate === payload.actor_reference_digest_candidate &&
    proposal.challenge_reference_digest_candidate ===
      payload.initial_challenge_reference_digest_candidate &&
    proposal.native_ceremony_session_reference_digest_candidate ===
      payload.native_ceremony_session_reference_digest_candidate &&
    proposal.os_utc_observation_reference_digest_candidate ===
      payload.os_utc_observation_reference_digest_candidate &&
    proposal.human_time_plausibility_confirmation_reference_digest ===
      payload.human_time_plausibility_confirmation_reference_digest &&
    decision.proposal_reference_digest === payload.proposal_reference_digest &&
    decision.actor_reference_digest_candidate === payload.actor_reference_digest_candidate &&
    decision.challenge_reference_digest_candidate ===
      payload.initial_challenge_reference_digest_candidate &&
    receipt.proposal_reference_digest === payload.proposal_reference_digest &&
    receipt.approval_decision_reference_digest === payload.human_approval_decision_reference_digest &&
    receipt.actor_reference_digest_candidate === payload.actor_reference_digest_candidate &&
    receipt.challenge_reference_digest_candidate ===
      payload.initial_challenge_reference_digest_candidate &&
    receipt.capability_reference_digest_candidate ===
      payload.bootstrap_capability_reference_digest_candidate;
}
function invalid(reason: FarmOsDay150C2bRuntimeProvenanceRecordFailureReason):
FarmOsDay150C2bRuntimeProvenanceRecordParseResult {
  return Object.freeze({ classification: "INVALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE", reason });
}

function parseBindings(value: FarmOsDay150C2bBootstrapDataSnapshot):
Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>> | null {
  const body = record(value);
  if (!body || !exactKeys(body, ["manifest_authority", "manifest_digest", "r2_record_authority",
    "r2_genesis_source_candidate_digest", "r3_actor_source_authority",
    "r3_actor_source_candidate_digest", "r3_clock_source_authority",
    "r3_clock_source_candidate_digest", "installation_profile_digest_candidate",
    "native_profile_digest_candidate"])) return null;
  if (body.manifest_authority !== FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY ||
    body.manifest_digest !== FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest ||
    body.r2_record_authority !== FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY ||
    body.r2_genesis_source_candidate_digest !==
      FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE.record_digest ||
    body.r3_actor_source_authority !== FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY ||
    body.r3_clock_source_authority !== CLOCK_AUTHORITY ||
    !allDigests(body, ["r3_actor_source_candidate_digest", "r3_clock_source_candidate_digest"])) {
    return null;
  }
  return body;
}

function parseEvent(value: FarmOsDay150C2bBootstrapDataSnapshot):
FarmOsDay150C2bRuntimeProvenanceEvent | null {
  const envelope = record(value);
  if (!envelope || !exactKeys(envelope, ["schema_version", "event_kind", "payload"]) ||
    envelope.schema_version !== FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY ||
    typeof envelope.event_kind !== "string" || !Object.hasOwn(EVENT_KEYS, envelope.event_kind)) {
    return null;
  }
  const kind = envelope.event_kind as FarmOsDay150C2bRuntimeProvenanceEventKind;
  const payload = record(envelope.payload);
  if (!payload || !exactKeys(payload, EVENT_KEYS[kind])) return null;
  const d = (keys: readonly string[]) => allDigests(payload, keys);
  let valid = false;
  switch (kind) {
    case "INTEGRATED_RUNTIME_GENESIS_CANDIDATE":
      valid = d(["proposal_reference_digest", "proposal_target_binding_digest",
        "human_approval_decision_reference_digest", "approval_decision_proposal_reference_digest",
        "approval_decision_actor_reference_digest_candidate",
        "approval_decision_challenge_reference_digest_candidate", "approval_receipt_reference_digest",
        "approval_receipt_proposal_reference_digest", "approval_receipt_decision_reference_digest",
        "approval_receipt_actor_reference_digest_candidate",
        "approval_receipt_challenge_reference_digest_candidate",
        "approval_receipt_capability_reference_digest_candidate", "actor_reference_digest_candidate",
        "native_ceremony_session_reference_digest_candidate",
        "initial_challenge_reference_digest_candidate",
        "bootstrap_capability_reference_digest_candidate",
        "os_utc_observation_reference_digest_candidate",
        "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate",
        "human_time_plausibility_confirmation_reference_digest",
        "proposed_epoch_reference_digest_candidate"]) &&
        payload.initial_challenge_terminal_state === "CONSUMED_APPROVAL_SUCCESS_CANDIDATE" &&
        payload.bootstrap_capability_terminal_state === "CONSUMED_CANDIDATE" &&
        timestamp(payload.proposed_genesis_timestamp_candidate) &&
        timestamp(payload.proposed_initial_monotonic_floor_timestamp_candidate) &&
        payload.proposed_genesis_timestamp_candidate ===
          payload.proposed_initial_monotonic_floor_timestamp_candidate &&
        new Set([payload.proposal_reference_digest,
          payload.human_approval_decision_reference_digest,
          payload.approval_receipt_reference_digest]).size === 3 &&
        payload.approval_decision_proposal_reference_digest === payload.proposal_reference_digest &&
        payload.approval_decision_actor_reference_digest_candidate ===
          payload.actor_reference_digest_candidate &&
        payload.approval_decision_challenge_reference_digest_candidate ===
          payload.initial_challenge_reference_digest_candidate &&
        payload.approval_receipt_proposal_reference_digest === payload.proposal_reference_digest &&
        payload.approval_receipt_decision_reference_digest ===
          payload.human_approval_decision_reference_digest &&
        payload.approval_receipt_actor_reference_digest_candidate ===
          payload.actor_reference_digest_candidate &&
        payload.approval_receipt_challenge_reference_digest_candidate ===
          payload.initial_challenge_reference_digest_candidate &&
        payload.approval_receipt_capability_reference_digest_candidate ===
          payload.bootstrap_capability_reference_digest_candidate &&
        validGenesisLineage(payload) &&
        payload.actor_policy_revision === 1 && payload.clock_policy_revision === 1 &&
        payload.publication_policy_revision === 1;
      break;
    case "CHALLENGE_ISSUANCE_CANDIDATE":
      valid = d(EVENT_KEYS[kind].slice(0, 3)) && validIssuanceTime(payload) &&
        payload.scope === FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE &&
        validMutationFreshness(payload);
      break;
    case "CHALLENGE_TERMINALIZATION_CANDIDATE":
      valid = d(["challenge_reference_digest_candidate", "terminal_reference_digest_candidate"]) &&
        digest(payload.native_ceremony_session_reference_digest_candidate) &&
        validObservationTime(payload) &&
        (FARM_OS_DAY150_C2B_CHALLENGE_TERMINAL_STATES as readonly unknown[])
          .includes(payload.terminal_state) && validMutationFreshness(payload);
      break;
    case "CAPABILITY_ISSUANCE_CANDIDATE":
      valid = d(["capability_reference_digest_candidate", "actor_reference_digest_candidate",
        "challenge_reference_digest_candidate", "native_ceremony_session_reference_digest_candidate"]) &&
        integer(payload.capability_generation) &&
        (payload.previous_capability_or_revocation_reference_digest_candidate === null ||
          digest(payload.previous_capability_or_revocation_reference_digest_candidate)) &&
        validIssuanceTime(payload) &&
        payload.scope === FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_PURPOSE && payload.one_shot === true &&
        validMutationFreshness(payload);
      break;
    case "CAPABILITY_TERMINALIZATION_CANDIDATE":
      valid = d(["capability_reference_digest_candidate", "terminal_reference_digest_candidate"]) &&
        digest(payload.native_ceremony_session_reference_digest_candidate) &&
        validObservationTime(payload) &&
        (FARM_OS_DAY150_C2B_CAPABILITY_TERMINAL_STATES as readonly unknown[])
          .includes(payload.terminal_state) && validMutationFreshness(payload);
      break;
    case "CLOCK_FLOOR_ADVANCEMENT_CANDIDATE":
      valid = d(["epoch_reference_digest_candidate", "os_utc_observation_reference_digest_candidate",
        "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate"]) &&
        timestamp(payload.prior_floor_timestamp_candidate) &&
        timestamp(payload.proposed_floor_timestamp_candidate) &&
        Date.parse(payload.proposed_floor_timestamp_candidate as string) >=
          Date.parse(payload.prior_floor_timestamp_candidate as string) &&
        payload.comparison_policy_revision === 1;
      break;
    case "CLOCK_ROLLBACK_QUARANTINE_CANDIDATE":
      valid = d(["epoch_reference_digest_candidate", "os_utc_observation_reference_digest_candidate",
        "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate",
        "quarantine_reference_digest_candidate"]) &&
        timestamp(payload.durable_prior_floor_timestamp_candidate) &&
        timestamp(payload.proposed_os_observation_timestamp_candidate) &&
        Date.parse(payload.proposed_os_observation_timestamp_candidate as string) <
          Date.parse(payload.durable_prior_floor_timestamp_candidate as string) &&
        payload.comparison_policy_revision === 1;
      break;
    case "CLOCK_EPOCH_SUPERSESSION_CANDIDATE":
      valid = d(["previous_epoch_reference_digest_candidate", "proposed_new_epoch_reference_digest_candidate",
        "recovery_actor_reference_digest_candidate", "recovery_capability_reference_digest_candidate",
        "affected_record_policy_reference_digest_candidate", "os_utc_observation_reference_digest_candidate",
        "continuous_time_bracket_reference_digest_candidate", "boot_session_reference_digest_candidate"]) &&
        payload.previous_epoch_reference_digest_candidate !==
          payload.proposed_new_epoch_reference_digest_candidate &&
        timestamp(payload.proposed_corrected_genesis_timestamp_candidate) &&
        timestamp(payload.proposed_new_floor_timestamp_candidate);
      break;
    case "RUNTIME_QUARANTINE_ENTERED_CANDIDATE":
      valid = (FARM_OS_DAY150_C2B_RUNTIME_QUARANTINE_REASONS as readonly unknown[])
        .includes(payload.reason) && digest(payload.evidence_reference_digest_candidate) &&
        payload.outcome === "OUTCOME_UNKNOWN_CANDIDATE" && payload.automatic_retry === false &&
        payload.automatic_cleanup === false;
      break;
    case "RUNTIME_RECOVERY_RECORDED_CANDIDATE":
      valid = d(["quarantine_reference_digest_candidate", "recovery_reference_digest_candidate"]) &&
        payload.recovery_state === "RECOVERY_RECORDED_QUARANTINE_REMAINS_CANDIDATE";
      break;
  }
  return valid ? Object.freeze({ schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: kind, payload: Object.freeze({ ...payload }) }) as FarmOsDay150C2bRuntimeProvenanceEvent
    : null;
}

function parseProjection(value: FarmOsDay150C2bBootstrapDataSnapshot):
FarmOsDay150C2bRuntimeProvenanceSourceProjection | null {
  const body = record(value);
  const keys = ["schema_version", "discriminator", "bootstrap_candidate_state",
    "actor_candidate_state", "actor_reference_digest_candidate", "challenge_candidate_state",
    "challenge_reference_digest_candidate", "challenge_native_session_reference_digest_candidate",
    "challenge_expires_at_candidate", "challenge_freshness_basis", "capability_candidate_state",
    "capability_reference_digest_candidate", "capability_generation_candidate",
    "capability_expires_at_candidate", "capability_freshness_basis",
    "capability_lineage_head_reference_digest_candidate", "clock_candidate_state",
    "epoch_reference_digest_candidate", "monotonic_floor_timestamp_candidate",
    "boot_session_reference_digest_candidate", "quarantine_candidate_state",
    "publication_outcome_candidate"];
  if (!body || !exactKeys(body, keys) ||
    body.schema_version !== FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY ||
    body.discriminator !== "SOURCE_PROJECTION_ONLY" ||
    !(body.bootstrap_candidate_state === "NOT_INITIALIZED_CANDIDATE" ||
      body.bootstrap_candidate_state === "INITIALIZED_CANDIDATE") ||
    !(body.actor_candidate_state === "NOT_ESTABLISHED_CANDIDATE" ||
      body.actor_candidate_state === "ESTABLISHMENT_CANDIDATE_PRESENT") ||
    !(body.challenge_candidate_state === "NONE" || body.challenge_candidate_state ===
      "OUTSTANDING_CANDIDATE" || (FARM_OS_DAY150_C2B_CHALLENGE_TERMINAL_STATES as readonly unknown[])
        .includes(body.challenge_candidate_state)) ||
    !(body.capability_candidate_state === "NONE" || body.capability_candidate_state ===
      "AVAILABLE_CANDIDATE" || (FARM_OS_DAY150_C2B_CAPABILITY_TERMINAL_STATES as readonly unknown[])
        .includes(body.capability_candidate_state)) ||
    !(body.clock_candidate_state === "NOT_ESTABLISHED_CANDIDATE" ||
      body.clock_candidate_state === "ESTABLISHMENT_CANDIDATE_PRESENT" ||
      body.clock_candidate_state === "ROLLBACK_QUARANTINE_CANDIDATE") ||
    !(body.quarantine_candidate_state === "NOT_QUARANTINED_CANDIDATE" ||
      body.quarantine_candidate_state === "QUARANTINE_REQUIRED_CANDIDATE" ||
      body.quarantine_candidate_state === "RECOVERY_RECORDED_QUARANTINE_REMAINS_CANDIDATE") ||
    !(body.publication_outcome_candidate === "KNOWN_SOURCE_CANDIDATE" ||
      body.publication_outcome_candidate === "OUTCOME_UNKNOWN_CANDIDATE") ||
    !(body.challenge_reference_digest_candidate === null ||
      digest(body.challenge_reference_digest_candidate)) ||
    !(body.challenge_native_session_reference_digest_candidate === null ||
      digest(body.challenge_native_session_reference_digest_candidate)) ||
    !(body.challenge_expires_at_candidate === null || timestamp(body.challenge_expires_at_candidate)) ||
    !(body.challenge_freshness_basis === null || body.challenge_freshness_basis ===
      "ACTIVE_TRUSTED_CLOCK_CANDIDATE" || body.challenge_freshness_basis ===
      "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE") ||
    !(body.capability_reference_digest_candidate === null ||
      digest(body.capability_reference_digest_candidate)) ||
    !(body.capability_generation_candidate === null || integer(body.capability_generation_candidate)) ||
    !(body.capability_expires_at_candidate === null || timestamp(body.capability_expires_at_candidate)) ||
    !(body.capability_freshness_basis === null || body.capability_freshness_basis ===
      "ACTIVE_TRUSTED_CLOCK_CANDIDATE" || body.capability_freshness_basis ===
      "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE") ||
    !(body.capability_lineage_head_reference_digest_candidate === null ||
      digest(body.capability_lineage_head_reference_digest_candidate)) ||
    !(body.actor_reference_digest_candidate === null || digest(body.actor_reference_digest_candidate)) ||
    !(body.epoch_reference_digest_candidate === null || digest(body.epoch_reference_digest_candidate)) ||
    !(body.monotonic_floor_timestamp_candidate === null ||
      timestamp(body.monotonic_floor_timestamp_candidate)) ||
    !(body.boot_session_reference_digest_candidate === null ||
      digest(body.boot_session_reference_digest_candidate))) return null;
  return Object.freeze({ ...body }) as unknown as FarmOsDay150C2bRuntimeProvenanceSourceProjection;
}

function snapshotBody(body: FarmOsDay150C2bRuntimeProvenanceRecordBody):
FarmOsDay150C2bRuntimeProvenanceRecordBody {
  const result = snapshotFarmOsDay150C2bBootstrapData(body);
  if (!result.accepted || !record(result.snapshot)) {
    throw new TypeError("R4_1_RUNTIME_PROVENANCE_RECORD_BODY_NOT_ORDINARY_DATA");
  }
  return result.snapshot as unknown as FarmOsDay150C2bRuntimeProvenanceRecordBody;
}
export function canonicalizeFarmOsDay150C2bRuntimeProvenanceRecordBody(
  body: FarmOsDay150C2bRuntimeProvenanceRecordBody,
): string { return canonicalizeFarmOsProductionTargetExecutionContract(snapshotBody(body)); }
export function computeFarmOsDay150C2bRuntimeSourceBindingsDigest(
  bindings: FarmOsDay150C2bRuntimeSourceBindings,
): Digest {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_RUNTIME_SOURCE_BINDINGS_DIGEST_DOMAIN, bindings);
}
export function computeFarmOsDay150C2bRuntimeGenesisProposalDigest(
  body: FarmOsDay150C2bRuntimeGenesisProposalBody,
): Digest { return hashFarmOsProductionTargetExecutionContract(GENESIS_PROPOSAL_DIGEST_DOMAIN, body); }
export function computeFarmOsDay150C2bRuntimeGenesisDecisionDigest(
  body: FarmOsDay150C2bRuntimeGenesisDecisionBody,
): Digest { return hashFarmOsProductionTargetExecutionContract(GENESIS_DECISION_DIGEST_DOMAIN, body); }
export function computeFarmOsDay150C2bRuntimeGenesisReceiptDigest(
  body: FarmOsDay150C2bRuntimeGenesisReceiptBody,
): Digest { return hashFarmOsProductionTargetExecutionContract(GENESIS_RECEIPT_DIGEST_DOMAIN, body); }
export function computeFarmOsDay150C2bRuntimeProvenanceRecordDigest(
  body: FarmOsDay150C2bRuntimeProvenanceRecordBody,
): Digest {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_DIGEST_DOMAIN, snapshotBody(body));
}

export function parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(
  value: unknown,
): FarmOsDay150C2bRuntimeProvenanceRecordParseResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(value);
  if (!snapshot.accepted) return invalid("UNTRUSTED_RUNTIME_PROVENANCE_INPUT");
  const envelope = record(snapshot.snapshot);
  if (!envelope || !exactKeys(envelope, ["record_body", "record_digest"])) {
    return invalid("INVALID_RECORD_ENVELOPE");
  }
  const body = record(envelope.record_body);
  if (!body || !exactKeys(body, ["schema_version", "authority_id", "authority_revision",
    "generation", "previous_generation", "previous_record_digest", "source_bindings", "event",
    "projected_source_state_claim"])) return invalid("INVALID_RECORD_BODY_SHAPE");
  if (body.schema_version !== FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY ||
    body.authority_id !== FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY ||
    body.authority_revision !== FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_REVISION) {
    return invalid("RUNTIME_PROVENANCE_AUTHORITY_MISMATCH");
  }
  const bindings = parseBindings(body.source_bindings);
  if (!bindings) return invalid("INVALID_SOURCE_BINDINGS");
  if (!digest(bindings.installation_profile_digest_candidate) ||
    !digest(bindings.native_profile_digest_candidate)) return invalid("INVALID_PROFILE_REFERENCE");
  const safeBindings: FarmOsDay150C2bRuntimeSourceBindings = Object.freeze({
    manifest_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
    manifest_digest: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
    r2_record_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    r2_genesis_source_candidate_digest:
      FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE.record_digest,
    r3_actor_source_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    r3_actor_source_candidate_digest: bindings.r3_actor_source_candidate_digest as Digest,
    r3_clock_source_authority: CLOCK_AUTHORITY,
    r3_clock_source_candidate_digest: bindings.r3_clock_source_candidate_digest as Digest,
    installation_profile_digest_candidate: bindings.installation_profile_digest_candidate as Digest,
    native_profile_digest_candidate: bindings.native_profile_digest_candidate as Digest,
  });
  if (!integer(body.generation)) return invalid("INVALID_GENERATION");
  if (!(body.previous_generation === null || integer(body.previous_generation)) ||
    !(body.previous_record_digest === null || digest(body.previous_record_digest))) {
    return invalid("INVALID_PREDECESSOR_SHAPE");
  }
  const eventEnvelope = record(body.event);
  if (!eventEnvelope || typeof eventEnvelope.event_kind !== "string" ||
    !Object.hasOwn(EVENT_KEYS, eventEnvelope.event_kind)) return invalid("UNKNOWN_EVENT_KIND");
  const event = parseEvent(body.event);
  if (!event) return invalid("INVALID_EVENT_PAYLOAD");
  const projection = parseProjection(body.projected_source_state_claim);
  if (!projection) return invalid("INVALID_PROJECTION_CLAIM");
  if (!digest(envelope.record_digest)) return invalid("MALFORMED_RECORD_DIGEST");
  const safeBody = Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_REVISION,
    generation: body.generation as number, previous_generation: body.previous_generation as number | null,
    previous_record_digest: body.previous_record_digest as Digest | null,
    source_bindings: safeBindings, event, projected_source_state_claim: projection,
  }) as FarmOsDay150C2bRuntimeProvenanceRecordBody;
  const expected = computeFarmOsDay150C2bRuntimeProvenanceRecordDigest(safeBody);
  if (envelope.record_digest !== expected) return invalid("RECORD_DIGEST_MISMATCH");
  const exactGenesisProjection = event.event_kind === "INTEGRATED_RUNTIME_GENESIS_CANDIDATE"
    ? Object.freeze({
      schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY,
      discriminator: "SOURCE_PROJECTION_ONLY" as const,
      bootstrap_candidate_state: "INITIALIZED_CANDIDATE" as const,
      actor_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT" as const,
      actor_reference_digest_candidate: event.payload.actor_reference_digest_candidate,
      challenge_candidate_state: event.payload.initial_challenge_terminal_state,
      challenge_reference_digest_candidate: event.payload.initial_challenge_reference_digest_candidate,
      challenge_native_session_reference_digest_candidate:
        event.payload.native_ceremony_session_reference_digest_candidate,
      challenge_expires_at_candidate: null,
      challenge_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" as const,
      capability_candidate_state: event.payload.bootstrap_capability_terminal_state,
      capability_reference_digest_candidate: event.payload.bootstrap_capability_reference_digest_candidate,
      capability_generation_candidate: 0,
      capability_expires_at_candidate: null,
      capability_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE" as const,
      capability_lineage_head_reference_digest_candidate:
        event.payload.bootstrap_capability_reference_digest_candidate,
      clock_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT" as const,
      epoch_reference_digest_candidate: event.payload.proposed_epoch_reference_digest_candidate,
      monotonic_floor_timestamp_candidate:
        event.payload.proposed_initial_monotonic_floor_timestamp_candidate,
      boot_session_reference_digest_candidate: event.payload.boot_session_reference_digest_candidate,
      quarantine_candidate_state: "NOT_QUARANTINED_CANDIDATE" as const,
      publication_outcome_candidate: "KNOWN_SOURCE_CANDIDATE" as const,
    }) : null;
  if ((safeBody.generation === 0) !==
      (safeBody.event.event_kind === "INTEGRATED_RUNTIME_GENESIS_CANDIDATE") ||
    (safeBody.generation === 0 && (safeBody.previous_generation !== null ||
      safeBody.previous_record_digest !== null)) ||
    (safeBody.generation > 0 && (safeBody.previous_generation === null ||
      safeBody.previous_record_digest === null)) ||
    (event.event_kind === "INTEGRATED_RUNTIME_GENESIS_CANDIDATE" &&
      event.payload.proposal_target_binding_digest !==
        computeFarmOsDay150C2bRuntimeSourceBindingsDigest(safeBindings)) ||
    (exactGenesisProjection !== null &&
      canonicalizeFarmOsProductionTargetExecutionContract(exactGenesisProjection) !==
        canonicalizeFarmOsProductionTargetExecutionContract(projection))) {
    return invalid("GEN0_REQUIREMENTS_MISMATCH");
  }
  return Object.freeze({
    classification: "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE",
    record: Object.freeze({ record_body: safeBody, record_digest: expected }),
  });
}

export function createFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(
  body: FarmOsDay150C2bRuntimeProvenanceRecordBody,
): FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate {
  const safeBody = snapshotBody(body);
  const envelope = Object.freeze({ record_body: safeBody,
    record_digest: computeFarmOsDay150C2bRuntimeProvenanceRecordDigest(safeBody) });
  const parsed = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(envelope);
  if (parsed.classification !== "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE") {
    throw new TypeError(parsed.reason);
  }
  return parsed.record;
}

export function farmOsDay150C2bRuntimeProvenanceRecordsAreSourceEqual(
  left: unknown, right: unknown,
): boolean {
  const a = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(left);
  const b = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(right);
  return a.classification === "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE" &&
    b.classification === "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE" &&
    a.record.record_digest === b.record.record_digest &&
    canonicalizeFarmOsDay150C2bRuntimeProvenanceRecordBody(a.record.record_body) ===
      canonicalizeFarmOsDay150C2bRuntimeProvenanceRecordBody(b.record.record_body);
}
