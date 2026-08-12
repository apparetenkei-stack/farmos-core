import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY,
  FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_OPERATIONS,
  computeFarmOsDay150C2bNativeProtocolMessageDigest,
  createFarmOsDay150C2bNativeProtocolMessageSourceCandidate,
  parseFarmOsDay150C2bNativeProtocolMessageSourceCandidate,
  type FarmOsDay150C2bNativeProtocolRequestBody,
} from "./lib/farm_os_day150_phase_c2b_native_protocol_contract";
import {
  FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
  FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_KINDS,
  FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY,
  FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_DIGEST_DOMAIN,
  FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY,
  canonicalizeFarmOsDay150C2bRuntimeProvenanceRecordBody,
  computeFarmOsDay150C2bRuntimeProvenanceRecordDigest,
  computeFarmOsDay150C2bRuntimeGenesisProposalDigest,
  computeFarmOsDay150C2bRuntimeGenesisDecisionDigest,
  computeFarmOsDay150C2bRuntimeGenesisReceiptDigest,
  computeFarmOsDay150C2bRuntimeSourceBindingsDigest,
  FARM_OS_DAY150_C2B_RUNTIME_GENESIS_PROPOSAL_AUTHORITY,
  FARM_OS_DAY150_C2B_RUNTIME_GENESIS_DECISION_AUTHORITY,
  FARM_OS_DAY150_C2B_RUNTIME_GENESIS_RECEIPT_AUTHORITY,
  createFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate,
  parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate,
  type FarmOsDay150C2bRuntimeProvenanceEvent,
  type FarmOsDay150C2bRuntimeProvenanceRecordBody,
  type FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate,
  type FarmOsDay150C2bRuntimeProvenanceSourceProjection,
  type FarmOsDay150C2bRuntimeSourceBindings,
  type FarmOsDay150C2bRuntimeGenesisProposalBody,
  type FarmOsDay150C2bRuntimeGenesisDecisionBody,
  type FarmOsDay150C2bRuntimeGenesisReceiptBody,
} from "./lib/farm_os_day150_phase_c2b_runtime_provenance_contract";
import {
  compareFarmOsDay150C2bRuntimeProvenanceSourceCandidates,
  deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection,
  replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate,
} from "./lib/farm_os_day150_phase_c2b_runtime_provenance_reducer";
import {
  FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY,
  createFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate,
  parseFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate,
  type FarmOsDay150C2bSanitizedRuntimeStatusBody,
} from "./lib/farm_os_day150_phase_c2b_runtime_status_contract";
import {
  computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest,
  parseFarmOsDay150C2bBootstrapActorIntentSourceCandidate,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_actor_source_contract";
import {
  computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest,
  parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_clock_source_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_ledger_contract";
import { replayFarmOsDay150C2bBootstrapSourceChainCandidate } from
  "./lib/farm_os_day150_phase_c2b_bootstrap_generation_reducer";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE,
  parseFarmOsDay150C2bBootstrapManifest,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_manifest_contract";

const D = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;
const T0 = "2026-08-12T01:00:00.000Z";
const T1 = "2026-08-12T01:01:00.000Z";
const clone = <T>(value: T): any => JSON.parse(JSON.stringify(value));
let cases = 0;
function test(name: string, body: () => void): void {
  try { body(); cases += 1; } catch (error) {
    throw new Error(`R4_1_CASE_FAILED:${name}`, { cause: error });
  }
}

const bindings: FarmOsDay150C2bRuntimeSourceBindings = {
  manifest_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_AUTHORITY,
  manifest_digest: FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
  r2_record_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
  r2_genesis_source_candidate_digest:
    FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE.record_digest,
  r3_actor_source_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
  r3_actor_source_candidate_digest: D("a"),
  r3_clock_source_authority: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
  r3_clock_source_candidate_digest: D("b"),
  installation_profile_digest_candidate: D("c"),
  native_profile_digest_candidate: D("d"),
};
const activeFreshness = (prior = T0, proposed = T0) => ({
  freshness_basis: "ACTIVE_TRUSTED_CLOCK_CANDIDATE" as const,
  clock_epoch_reference_digest_candidate: D("e"),
  prior_monotonic_floor_timestamp_candidate: prior,
  proposed_monotonic_floor_timestamp_candidate: proposed,
  os_utc_observation_reference_digest_candidate: D("8"),
  continuous_time_bracket_reference_digest_candidate: D("a"),
  boot_session_reference_digest_candidate: D("b"),
  native_recovery_session_reference_digest_candidate: null,
  clock_comparison_policy_revision: 1 as const,
});
const proposalBody: FarmOsDay150C2bRuntimeGenesisProposalBody = {
  schema_version: FARM_OS_DAY150_C2B_RUNTIME_GENESIS_PROPOSAL_AUTHORITY,
  purpose: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
  target_binding_digest: computeFarmOsDay150C2bRuntimeSourceBindingsDigest(bindings),
  actor_reference_digest_candidate: D("4"), challenge_reference_digest_candidate: D("6"),
  native_ceremony_session_reference_digest_candidate: D("5"),
  os_utc_observation_reference_digest_candidate: D("8"),
  human_time_plausibility_confirmation_reference_digest: D("9"),
};
const proposalReference = computeFarmOsDay150C2bRuntimeGenesisProposalDigest(proposalBody);
const decisionBody: FarmOsDay150C2bRuntimeGenesisDecisionBody = {
  schema_version: FARM_OS_DAY150_C2B_RUNTIME_GENESIS_DECISION_AUTHORITY, decision: "APPROVE",
  proposal_reference_digest: proposalReference, actor_reference_digest_candidate: D("4"),
  challenge_reference_digest_candidate: D("6"), authentication_mechanism_revision: 1,
};
const decisionReference = computeFarmOsDay150C2bRuntimeGenesisDecisionDigest(decisionBody);
const receiptBody: FarmOsDay150C2bRuntimeGenesisReceiptBody = {
  schema_version: FARM_OS_DAY150_C2B_RUNTIME_GENESIS_RECEIPT_AUTHORITY,
  proposal_reference_digest: proposalReference,
  approval_decision_reference_digest: decisionReference,
  actor_reference_digest_candidate: D("4"), challenge_reference_digest_candidate: D("6"),
  challenge_terminal_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
  capability_reference_digest_candidate: D("7"), capability_terminal_state: "CONSUMED_CANDIDATE",
};
const receiptReference = computeFarmOsDay150C2bRuntimeGenesisReceiptDigest(receiptBody);
const gen0Event: FarmOsDay150C2bRuntimeProvenanceEvent = {
  schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
  event_kind: "INTEGRATED_RUNTIME_GENESIS_CANDIDATE",
  payload: {
    proposal_reference_digest: proposalReference, proposal_body_candidate: proposalBody,
    proposal_target_binding_digest: computeFarmOsDay150C2bRuntimeSourceBindingsDigest(bindings),
    human_approval_decision_reference_digest: decisionReference,
    human_approval_decision_body_candidate: decisionBody,
    approval_decision_proposal_reference_digest: proposalReference,
    approval_decision_actor_reference_digest_candidate: D("4"),
    approval_decision_challenge_reference_digest_candidate: D("6"),
    approval_receipt_reference_digest: receiptReference, approval_receipt_body_candidate: receiptBody,
    approval_receipt_proposal_reference_digest: proposalReference,
    approval_receipt_decision_reference_digest: decisionReference,
    approval_receipt_actor_reference_digest_candidate: D("4"),
    approval_receipt_challenge_reference_digest_candidate: D("6"),
    approval_receipt_capability_reference_digest_candidate: D("7"),
    actor_reference_digest_candidate: D("4"),
    native_ceremony_session_reference_digest_candidate: D("5"),
    initial_challenge_reference_digest_candidate: D("6"),
    initial_challenge_terminal_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
    bootstrap_capability_reference_digest_candidate: D("7"),
    bootstrap_capability_terminal_state: "CONSUMED_CANDIDATE",
    os_utc_observation_reference_digest_candidate: D("8"),
    continuous_time_bracket_reference_digest_candidate: D("a"),
    boot_session_reference_digest_candidate: D("b"),
    human_time_plausibility_confirmation_reference_digest: D("9"),
    proposed_epoch_reference_digest_candidate: D("e"),
    proposed_genesis_timestamp_candidate: T0,
    proposed_initial_monotonic_floor_timestamp_candidate: T0,
    actor_policy_revision: 1, clock_policy_revision: 1, publication_policy_revision: 1,
  },
};
const gen0Projection: FarmOsDay150C2bRuntimeProvenanceSourceProjection = {
  schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_SOURCE_PROJECTION_AUTHORITY,
  discriminator: "SOURCE_PROJECTION_ONLY", bootstrap_candidate_state: "INITIALIZED_CANDIDATE",
  actor_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT",
  actor_reference_digest_candidate: D("4"),
  challenge_candidate_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
  challenge_reference_digest_candidate: D("6"), capability_candidate_state: "CONSUMED_CANDIDATE",
  challenge_native_session_reference_digest_candidate: D("5"),
  challenge_expires_at_candidate: null,
  challenge_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
  capability_reference_digest_candidate: D("7"),
  capability_generation_candidate: 0, capability_expires_at_candidate: null,
  capability_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
  capability_lineage_head_reference_digest_candidate: D("7"),
  clock_candidate_state: "ESTABLISHMENT_CANDIDATE_PRESENT",
  epoch_reference_digest_candidate: D("e"), monotonic_floor_timestamp_candidate: T0,
  boot_session_reference_digest_candidate: D("b"),
  quarantine_candidate_state: "NOT_QUARANTINED_CANDIDATE",
  publication_outcome_candidate: "KNOWN_SOURCE_CANDIDATE",
};
function seal(body: FarmOsDay150C2bRuntimeProvenanceRecordBody):
FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate {
  return createFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(body);
}
const gen0 = seal({ schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY,
  authority_id: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY, authority_revision: 1,
  generation: 0, previous_generation: null, previous_record_digest: null, source_bindings: bindings,
  event: gen0Event, projected_source_state_claim: gen0Projection });
function next(prior: FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate,
  current: FarmOsDay150C2bRuntimeProvenanceSourceProjection,
  event: FarmOsDay150C2bRuntimeProvenanceEvent): FarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate {
  const projected = deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(current, event);
  if (!projected) throw new Error("FIXTURE_TRANSITION_INVALID");
  return seal({ schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY, authority_revision: 1,
    generation: prior.record_body.generation + 1, previous_generation: prior.record_body.generation,
    previous_record_digest: prior.record_digest, source_bindings: bindings, event,
    projected_source_state_claim: projected });
}
const challengeEvent = (reference = D("f"), prior = T0, proposed = T1):
FarmOsDay150C2bRuntimeProvenanceEvent => ({
  schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
  event_kind: "CHALLENGE_ISSUANCE_CANDIDATE", payload: {
    challenge_reference_digest_candidate: reference, actor_reference_digest_candidate: D("4"),
    native_ceremony_session_reference_digest_candidate: D("5"),
    issued_at_candidate: proposed, expires_at_candidate: "2026-08-12T01:15:00.000Z",
    scope: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
    ...activeFreshness(prior, proposed),
  },
});
const challenge = next(gen0, gen0Projection, challengeEvent());

function replayReason(value: unknown, reason: string): void {
  const result = replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate(value);
  assert.equal(result.classification, "INVALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE");
  if (result.classification === "INVALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE") {
    assert.equal(result.reason, reason);
  }
}
function recordReason(value: unknown, reason: string): void {
  const result = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(value);
  assert.equal(result.classification, "INVALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE");
  if (result.classification === "INVALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE") {
    assert.equal(result.reason, reason);
    assert.deepEqual(Object.keys(result).sort(), ["classification", "reason"]);
  }
}

test("authority and valid integrated Gen0 candidate", () => {
  assert.equal(FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_AUTHORITY,
    "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1");
  assert.equal(FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_RECORD_DIGEST_DOMAIN,
    "farmos.day150-c2b-bootstrap-runtime-provenance-record.v1:record-body");
  const parsed = parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(gen0);
  assert.equal(parsed.classification, "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_RECORD_CANDIDATE");
  const replay = replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate([gen0]);
  assert.equal(replay.classification, "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE");
});
test("Gen0 proposal approval and receipt are distinct and complete", () => {
  const p = gen0.record_body.event.event_kind === "INTEGRATED_RUNTIME_GENESIS_CANDIDATE"
    ? gen0.record_body.event.payload : null;
  assert.ok(p); assert.notEqual(p.proposal_reference_digest, p.human_approval_decision_reference_digest);
  assert.notEqual(p.human_approval_decision_reference_digest, p.approval_receipt_reference_digest);
  assert.equal(computeFarmOsDay150C2bRuntimeGenesisProposalDigest(p.proposal_body_candidate),
    p.proposal_reference_digest);
  assert.equal(computeFarmOsDay150C2bRuntimeGenesisDecisionDigest(
    p.human_approval_decision_body_candidate), p.human_approval_decision_reference_digest);
  assert.equal(computeFarmOsDay150C2bRuntimeGenesisReceiptDigest(p.approval_receipt_body_candidate),
    p.approval_receipt_reference_digest);
  const missing = clone(gen0); delete missing.record_body.event.payload.approval_receipt_reference_digest;
  recordReason(missing, "INVALID_EVENT_PAYLOAD");
  const brokenLink = clone(gen0);
  brokenLink.record_body.event.payload.approval_receipt_decision_reference_digest = D("0");
  recordReason(brokenLink, "INVALID_EVENT_PAYLOAD");
  const wrongTarget = clone(gen0);
  wrongTarget.record_body.event.payload.proposal_target_binding_digest = D("0");
  wrongTarget.record_digest = computeFarmOsDay150C2bRuntimeProvenanceRecordDigest(wrongTarget.record_body);
  recordReason(wrongTarget, "INVALID_EVENT_PAYLOAD");
});
test("actor and clock co-binding stays candidate-only", () => {
  const text = JSON.stringify(parseFarmOsDay150C2bRuntimeProvenanceRecordSourceCandidate(gen0));
  for (const runtimeFact of ["AUTHENTICATED_ACTOR", "TRUSTED_CLOCK_ESTABLISHED", "GEN0_PUBLISHED",
    "CAPABILITY_ACTIVE", "DURABLE_MONOTONIC_FLOOR"]) assert.equal(text.includes(runtimeFact), false);
});
test("one global generation only; no actor or clock heads", () => {
  assert.deepEqual(Object.keys(gen0.record_body).filter((key) => key.includes("generation")),
    ["generation", "previous_generation"]);
  const text = JSON.stringify(gen0); assert.equal(text.includes("actor_head"), false);
  assert.equal(text.includes("clock_head"), false);
});
test("valid single global progression", () => {
  const replay = replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate([gen0, challenge]);
  assert.equal(replay.classification, "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE");
  if (replay.classification === "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE") {
    assert.equal(replay.source_projection.discriminator, "SOURCE_PROJECTION_ONLY");
    assert.equal(replay.source_projection.challenge_candidate_state, "OUTSTANDING_CANDIDATE");
  }
});
test("generation gap", () => {
  const body = clone(challenge.record_body); body.generation = 2;
  replayReason([gen0, seal(body)], "GENERATION_GAP");
});
test("predecessor generation mismatch", () => {
  const body = clone(challenge.record_body); body.previous_generation = 9;
  replayReason([gen0, seal(body)], "PREDECESSOR_MISMATCH");
});
test("predecessor digest mismatch", () => {
  const body = clone(challenge.record_body); body.previous_record_digest = D("0");
  replayReason([gen0, seal(body)], "PREDECESSOR_MISMATCH");
});
test("duplicate and fork deterministic", () => {
  replayReason([gen0, clone(gen0)], "DUPLICATE_EXACT_RECORD_CANDIDATE");
  const other = next(gen0, gen0Projection, challengeEvent(D("0")));
  replayReason([gen0, challenge, other], "DIVERGENT_GENERATION_FORK_CANDIDATE");
});
test("event transition and terminal behavior", () => {
  const challengeProjection = challenge.record_body.projected_source_state_claim;
  const terminalEvent: FarmOsDay150C2bRuntimeProvenanceEvent = {
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "CHALLENGE_TERMINALIZATION_CANDIDATE", payload: {
      challenge_reference_digest_candidate: D("f"),
      terminal_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
      terminal_reference_digest_candidate: D("1"),
      observed_at_candidate: T1, native_ceremony_session_reference_digest_candidate: D("5"),
      ...activeFreshness(T1, T1),
    },
  };
  const terminal = next(challenge, challengeProjection, terminalEvent);
  assert.equal(replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate(
    [gen0, challenge, terminal]).classification,
  "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE");
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    terminal.record_body.projected_source_state_claim, terminalEvent), null);
});
test("challenge and capability lineage is one-shot and monotonic", () => {
  const terminalEvent: FarmOsDay150C2bRuntimeProvenanceEvent = {
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "CHALLENGE_TERMINALIZATION_CANDIDATE", payload: {
      challenge_reference_digest_candidate: D("f"),
      terminal_state: "CONSUMED_APPROVAL_SUCCESS_CANDIDATE",
      terminal_reference_digest_candidate: D("1"), observed_at_candidate: T1,
      native_ceremony_session_reference_digest_candidate: D("5"), ...activeFreshness(T1, T1),
    },
  };
  const terminal = next(challenge, challenge.record_body.projected_source_state_claim, terminalEvent);
  const reissued = next(terminal, terminal.record_body.projected_source_state_claim,
    challengeEvent(D("f"), T1, "2026-08-12T01:02:00.000Z"));
  replayReason([gen0, challenge, terminal, reissued], "REFERENCE_REPLAY_CANDIDATE");
  const capabilityEvent: FarmOsDay150C2bRuntimeProvenanceEvent = {
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "CAPABILITY_ISSUANCE_CANDIDATE", payload: {
      capability_reference_digest_candidate: D("0"), actor_reference_digest_candidate: D("4"),
      challenge_reference_digest_candidate: D("f"),
      native_ceremony_session_reference_digest_candidate: D("5"), capability_generation: 1,
      previous_capability_or_revocation_reference_digest_candidate: D("7"),
      issued_at_candidate: "2026-08-12T01:02:00.000Z",
      expires_at_candidate: "2026-08-12T01:15:00.000Z",
      scope: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION", one_shot: true,
      ...activeFreshness(T1, "2026-08-12T01:02:00.000Z"),
    },
  };
  const capability = next(terminal, terminal.record_body.projected_source_state_claim, capabilityEvent);
  assert.equal(capability.record_body.projected_source_state_claim.capability_generation_candidate, 1);
  const capabilityTerminal = (state: "EXPIRED_CANDIDATE" | "CONSUMED_CANDIDATE",
    observed: string): FarmOsDay150C2bRuntimeProvenanceEvent => ({
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "CAPABILITY_TERMINALIZATION_CANDIDATE", payload: {
      capability_reference_digest_candidate: D("0"), terminal_state: state,
      terminal_reference_digest_candidate: D("2"), observed_at_candidate: observed,
      native_ceremony_session_reference_digest_candidate: D("5"),
      ...activeFreshness("2026-08-12T01:02:00.000Z", observed),
    },
  });
  assert.notEqual(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    capability.record_body.projected_source_state_claim,
    capabilityTerminal("EXPIRED_CANDIDATE", "2026-08-12T01:15:00.000Z")), null);
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    capability.record_body.projected_source_state_claim,
    capabilityTerminal("EXPIRED_CANDIDATE", "2026-08-12T01:14:59.999Z")), null);
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    capability.record_body.projected_source_state_claim,
    capabilityTerminal("CONSUMED_CANDIDATE", "2026-08-12T01:15:00.001Z")), null);
  const wrongGeneration = clone(capabilityEvent);
  if (wrongGeneration.event_kind === "CAPABILITY_ISSUANCE_CANDIDATE") {
    wrongGeneration.payload.capability_generation = 3;
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    terminal.record_body.projected_source_state_claim, wrongGeneration), null);
  const wrongActor = clone(capabilityEvent);
  if (wrongActor.event_kind === "CAPABILITY_ISSUANCE_CANDIDATE") {
    wrongActor.payload.actor_reference_digest_candidate = D("9");
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    terminal.record_body.projected_source_state_claim, wrongActor), null);
  const crossSession = clone(capabilityEvent);
  if (crossSession.event_kind === "CAPABILITY_ISSUANCE_CANDIDATE") {
    crossSession.payload.native_ceremony_session_reference_digest_candidate = D("9");
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    terminal.record_body.projected_source_state_claim, crossSession), null);
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    gen0Projection, challengeEvent(D("0"), T0, T0)), null);
  const expiredTerminal = clone(terminalEvent);
  if (expiredTerminal.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE") {
    expiredTerminal.payload.observed_at_candidate = "2026-08-12T01:16:00.000Z";
    Object.assign(expiredTerminal.payload,
      activeFreshness(T1, "2026-08-12T01:16:00.000Z"));
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    challenge.record_body.projected_source_state_claim, expiredTerminal), null);
  const validExpiry = clone(terminalEvent);
  if (validExpiry.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE") {
    validExpiry.payload.terminal_state = "EXPIRED_CANDIDATE";
    validExpiry.payload.observed_at_candidate = "2026-08-12T01:15:00.000Z";
    Object.assign(validExpiry.payload, activeFreshness(T1, "2026-08-12T01:15:00.000Z"));
  }
  assert.notEqual(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    challenge.record_body.projected_source_state_claim, validExpiry), null);
  const prematureExpiry = clone(validExpiry);
  if (prematureExpiry.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE") {
    prematureExpiry.payload.observed_at_candidate = "2026-08-12T01:14:59.999Z";
    Object.assign(prematureExpiry.payload, activeFreshness(T1, "2026-08-12T01:14:59.999Z"));
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    challenge.record_body.projected_source_state_claim, prematureExpiry), null);
  const wrongSessionTerminal = clone(terminalEvent);
  if (wrongSessionTerminal.event_kind === "CHALLENGE_TERMINALIZATION_CANDIDATE") {
    wrongSessionTerminal.payload.native_ceremony_session_reference_digest_candidate = D("9");
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    challenge.record_body.projected_source_state_claim, wrongSessionTerminal), null);
  const revokedProjection: FarmOsDay150C2bRuntimeProvenanceSourceProjection = {
    ...terminal.record_body.projected_source_state_claim,
    capability_candidate_state: "REVOKED_CANDIDATE", capability_reference_digest_candidate: D("0"),
    capability_generation_candidate: 1,
    capability_lineage_head_reference_digest_candidate: D("9"),
  };
  const stalePredecessor = clone(capabilityEvent);
  if (stalePredecessor.event_kind === "CAPABILITY_ISSUANCE_CANDIDATE") {
    stalePredecessor.payload.capability_generation = 2;
    stalePredecessor.payload.capability_reference_digest_candidate = D("8");
    stalePredecessor.payload.previous_capability_or_revocation_reference_digest_candidate = D("0");
  }
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    revokedProjection, stalePredecessor), null);
});
test("projection mismatch", () => {
  const body = clone(challenge.record_body); body.projected_source_state_claim.challenge_candidate_state = "NONE";
  replayReason([gen0, seal(body)], "INVALID_PROJECTED_SOURCE_STATE_CLAIM");
});
test("digest deterministic and object-key invariant", () => {
  const reversed = Object.fromEntries(Object.entries(gen0.record_body).reverse()) as
    FarmOsDay150C2bRuntimeProvenanceRecordBody;
  assert.equal(computeFarmOsDay150C2bRuntimeProvenanceRecordDigest(reversed), gen0.record_digest);
  assert.equal(canonicalizeFarmOsDay150C2bRuntimeProvenanceRecordBody(reversed),
    canonicalizeFarmOsDay150C2bRuntimeProvenanceRecordBody(gen0.record_body));
});
test("source candidate is not publication or runtime idempotence", () => {
  const comparison = compareFarmOsDay150C2bRuntimeProvenanceSourceCandidates(gen0, clone(gen0));
  assert.deepEqual(comparison, { classification: "SOURCE_CANDIDATE_EQUALITY_ONLY",
    runtime_idempotence_established: false, runtime_publication_established: false });
  const replay = replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate([gen0]);
  assert.equal(replay.classification === "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE"
    ? replay.chain_semantics : null, "SOURCE_CHAIN_CANDIDATE_ONLY_NOT_PUBLICATION_OR_TRUST");
});
test("OUTCOME_UNKNOWN remains unresolved", () => {
  const event: FarmOsDay150C2bRuntimeProvenanceEvent = {
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "RUNTIME_QUARANTINE_ENTERED_CANDIDATE", payload: {
      reason: "PUBLICATION_OUTCOME_UNKNOWN_CANDIDATE", evidence_reference_digest_candidate: D("1"),
      outcome: "OUTCOME_UNKNOWN_CANDIDATE", automatic_retry: false, automatic_cleanup: false,
    },
  };
  const unknown = next(gen0, gen0Projection, event);
  const replay = replayFarmOsDay150C2bRuntimeProvenanceSourceChainCandidate([gen0, unknown]);
  assert.equal(replay.classification === "STRUCTURALLY_VALID_RUNTIME_PROVENANCE_CHAIN_CANDIDATE"
    ? replay.source_projection.publication_outcome_candidate : null, "OUTCOME_UNKNOWN_CANDIDATE");
  assert.equal(JSON.stringify(replay).includes("ALREADY_COMMITTED_AFTER_TRUSTED_READBACK"), false);
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    unknown.record_body.projected_source_state_claim, challengeEvent(D("0"), T0, T0)), null);
});
test("authority mutations bind clock atomically and epoch recovery consumes capability", () => {
  const wrongFloor = challengeEvent(D("0"), "2026-08-12T00:59:00.000Z", T1);
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(gen0Projection, wrongFloor), null);
  const recoveryProjection: FarmOsDay150C2bRuntimeProvenanceSourceProjection = {
    ...gen0Projection, clock_candidate_state: "ROLLBACK_QUARANTINE_CANDIDATE",
    quarantine_candidate_state: "QUARANTINE_REQUIRED_CANDIDATE",
    capability_candidate_state: "AVAILABLE_CANDIDATE", capability_reference_digest_candidate: D("0"),
    capability_generation_candidate: 1,
    capability_freshness_basis: "CLOCK_RECOVERY_NATIVE_SESSION_CANDIDATE",
  };
  const supersession: FarmOsDay150C2bRuntimeProvenanceEvent = {
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "CLOCK_EPOCH_SUPERSESSION_CANDIDATE", payload: {
      previous_epoch_reference_digest_candidate: D("e"),
      proposed_new_epoch_reference_digest_candidate: D("f"),
      recovery_actor_reference_digest_candidate: D("4"),
      recovery_capability_reference_digest_candidate: D("0"),
      proposed_corrected_genesis_timestamp_candidate: T1,
      proposed_new_floor_timestamp_candidate: T1,
      affected_record_policy_reference_digest_candidate: D("1"),
      os_utc_observation_reference_digest_candidate: D("2"),
      continuous_time_bracket_reference_digest_candidate: D("3"),
      boot_session_reference_digest_candidate: D("4"),
    },
  };
  const recovered = deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    recoveryProjection, supersession);
  assert.equal(recovered?.capability_candidate_state, "CONSUMED_CANDIDATE");
  assert.equal(recovered?.quarantine_candidate_state, "NOT_QUARANTINED_CANDIDATE");
  assert.ok(recovered);
  const resumedChallenge: FarmOsDay150C2bRuntimeProvenanceEvent = {
    schema_version: FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_AUTHORITY,
    event_kind: "CHALLENGE_ISSUANCE_CANDIDATE", payload: {
      challenge_reference_digest_candidate: D("9"), actor_reference_digest_candidate: D("4"),
      native_ceremony_session_reference_digest_candidate: D("8"),
      issued_at_candidate: "2026-08-12T01:02:00.000Z",
      expires_at_candidate: "2026-08-12T01:15:00.000Z",
      scope: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
      freshness_basis: "ACTIVE_TRUSTED_CLOCK_CANDIDATE",
      clock_epoch_reference_digest_candidate: D("f"),
      prior_monotonic_floor_timestamp_candidate: T1,
      proposed_monotonic_floor_timestamp_candidate: "2026-08-12T01:02:00.000Z",
      os_utc_observation_reference_digest_candidate: D("2"),
      continuous_time_bracket_reference_digest_candidate: D("3"),
      boot_session_reference_digest_candidate: D("4"),
      native_recovery_session_reference_digest_candidate: null,
      clock_comparison_policy_revision: 1,
    },
  };
  assert.notEqual(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(
    recovered!, resumedChallenge), null);
  const noCapability = { ...recoveryProjection, capability_candidate_state: "CONSUMED_CANDIDATE" as const };
  assert.equal(deriveFarmOsDay150C2bRuntimeProvenanceNextSourceProjection(noCapability, supersession), null);
});
test("caller publication and trusted-readback claims rejected", () => {
  for (const key of ["success", "published", "trusted_readback", "canonical_membership"]) {
    const forged = clone(gen0); forged.record_body[key] = true;
    recordReason(forged, "INVALID_RECORD_BODY_SHAPE");
  }
});
test("forged actor and clock facts rejected", () => {
  for (const key of ["authenticated_actor", "capability_active", "trusted_clock_established",
    "clock_epoch_active", "durable_monotonic_floor"]) {
    const forged = clone(gen0); forged.record_body.projected_source_state_claim[key] = true;
    recordReason(forged, "INVALID_PROJECTION_CLAIM");
  }
});
test("validation precedence is finite and deterministic", () => {
  const sourceFirst = clone(gen0);
  sourceFirst.record_body.source_bindings.manifest_digest = D("0");
  sourceFirst.record_body.event.event_kind = "UNKNOWN";
  sourceFirst.record_digest = "bad";
  recordReason(sourceFirst, "INVALID_SOURCE_BINDINGS");
  const profileFirst = clone(gen0);
  profileFirst.record_body.source_bindings.native_profile_digest_candidate = "bad";
  profileFirst.record_body.event.event_kind = "UNKNOWN";
  profileFirst.record_digest = "bad";
  recordReason(profileFirst, "INVALID_PROFILE_REFERENCE");
  const wrongGen0Projection = clone(gen0);
  wrongGen0Projection.record_body.projected_source_state_claim.actor_candidate_state =
    "NOT_ESTABLISHED_CANDIDATE";
  wrongGen0Projection.record_digest = computeFarmOsDay150C2bRuntimeProvenanceRecordDigest(
    wrongGen0Projection.record_body);
  recordReason(wrongGen0Projection, "GEN0_REQUIREMENTS_MISMATCH");
});
test("privacy forbidden fields rejected", () => {
  for (const key of ["raw_generated_uid", "username", "challenge_secret", "capability_secret",
    "password", "credential", "token", "raw_error", "native_output", "argv", "environment",
    "dsn", "stack_trace"]) {
    const forged = clone(gen0); forged.record_body.event.payload[key] = "secret";
    recordReason(forged, "INVALID_EVENT_PAYLOAD");
  }
});
test("hostile prototype accessor symbol and arrays rejected", () => {
  const exotic = clone(gen0); Object.setPrototypeOf(exotic.record_body, Object.create(null));
  recordReason(exotic, "UNTRUSTED_RUNTIME_PROVENANCE_INPUT");
  const accessor = clone(gen0); Object.defineProperty(accessor.record_body, "generation",
    { enumerable: true, get: () => 0 });
  recordReason(accessor, "UNTRUSTED_RUNTIME_PROVENANCE_INPUT");
  const symbol = clone(gen0); symbol[Symbol("hidden")] = true;
  recordReason(symbol, "UNTRUSTED_RUNTIME_PROVENANCE_INPUT");
  const sparse = [gen0, , challenge];
  replayReason(sparse, "UNTRUSTED_RUNTIME_PROVENANCE_CHAIN_INPUT");
  const named: any[] = [gen0]; (named as any).extra = true;
  replayReason(named, "UNTRUSTED_RUNTIME_PROVENANCE_CHAIN_INPUT");
});
test("inherited discriminator names rejected", () => {
  for (const inherited of ["toString", "constructor", "__proto__"]) {
    const forged = clone(gen0); forged.record_body.event.event_kind = inherited;
    recordReason(forged, "UNKNOWN_EVENT_KIND");
  }
});
test("finite event vocabulary excludes authorization and Docker", () => {
  assert.equal(FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_KINDS.length, 10);
  const text = JSON.stringify(FARM_OS_DAY150_C2B_RUNTIME_PROVENANCE_EVENT_KINDS);
  for (const forbidden of ["AUTHORIZATION_ISSUED", "ATTEMPT_STARTED", "DOCKER", "EXECUTION_FENCE"])
    assert.equal(text.includes(forbidden), false);
});

const protocolRequestBody: FarmOsDay150C2bNativeProtocolRequestBody = {
  schema_version: FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY,
  authority_id: FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY, authority_revision: 1,
  message_kind: "BOUNDED_REQUEST_CANDIDATE",
  operation: "WRITER_PUBLISH_RUNTIME_PROVENANCE_RECORD_CANDIDATE",
  request_reference_digest_candidate: D("1"), installation_profile_digest_candidate: D("2"),
  native_profile_digest_candidate: D("3"), protocol_profile_digest_candidate: D("4"),
  payload_reference_digest_candidate: D("5"), runtime_record_candidate_digest: gen0.record_digest,
};
const protocolRequest = createFarmOsDay150C2bNativeProtocolMessageSourceCandidate(protocolRequestBody);
function protocolReason(value: unknown, reason: string): void {
  const result = parseFarmOsDay150C2bNativeProtocolMessageSourceCandidate(value);
  assert.equal(result.classification, "INVALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE");
  if (result.classification === "INVALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE")
    assert.equal(result.reason, reason);
}
test("native protocol valid bounded message and authority ceiling", () => {
  const result = parseFarmOsDay150C2bNativeProtocolMessageSourceCandidate(protocolRequest);
  assert.equal(result.classification, "STRUCTURALLY_VALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE");
  if (result.classification === "STRUCTURALLY_VALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE") {
    assert.equal(result.native_authenticity_established, false);
    assert.equal(result.peer_authenticity_established, false);
    assert.equal(result.storage_publication_established, false);
  }
});
test("native protocol rejects unknown operation and inherited names", () => {
  for (const operation of ["SHELL", "GENERIC_FILESYSTEM_OPERATION", "GENERIC_AUTHENTICATION_OPERATION",
    "toString", "constructor", "__proto__"]) {
    const value = clone(protocolRequest); value.message_body.operation = operation;
    protocolReason(value, "UNKNOWN_NATIVE_PROTOCOL_OPERATION");
  }
  for (const inherited of ["toString", "constructor", "__proto__"]) {
    const value = clone(protocolRequest); value.message_body.message_kind = inherited;
    protocolReason(value, "UNKNOWN_NATIVE_PROTOCOL_MESSAGE_KIND");
  }
});
test("native protocol rejects path argv environment and broad fields", () => {
  for (const key of ["path", "argv", "environment", "command", "keychain_query", "ledger_root",
    "actor_id", "timestamp_authority"]) {
    const value = clone(protocolRequest); value.message_body[key] = key;
    protocolReason(value, "NATIVE_PROTOCOL_AUTHORITY_MISMATCH");
  }
});
test("native protocol tamper rejected", () => {
  const value = clone(protocolRequest); value.message_body.payload_reference_digest_candidate = D("9");
  protocolReason(value, "NATIVE_PROTOCOL_DIGEST_MISMATCH");
  assert.equal(computeFarmOsDay150C2bNativeProtocolMessageDigest(protocolRequestBody),
    protocolRequest.message_digest);
  assert.equal(FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_OPERATIONS.some((op) => op.includes("DOCKER")), false);
});

const statusBody: FarmOsDay150C2bSanitizedRuntimeStatusBody = {
  schema_version: FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY,
  authority_id: FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY, authority_revision: 1,
  source_semantics: "CALLER_SUPPLIED_STATUS_IS_NOT_AUTHORITY",
  ledger_state: "AVAILABLE_IF_TRUSTEDLY_SUPPLIED", generation_candidate: 0,
  head_digest_candidate: gen0.record_digest, actor_state: "ESTABLISHED_IF_TRUSTEDLY_SUPPLIED",
  challenge_state: "NONE_IF_TRUSTEDLY_SUPPLIED", capability_state: "NOT_AVAILABLE_IF_TRUSTEDLY_SUPPLIED",
  trusted_clock_state: "ESTABLISHED_IF_TRUSTEDLY_SUPPLIED",
  quarantine_state: "NOT_REQUIRED_IF_TRUSTEDLY_SUPPLIED",
  outcome_state: "KNOWN_IF_TRUSTEDLY_SUPPLIED", provenance_reference_digest_candidate: D("1"),
};
const status = createFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate(statusBody);
test("sanitized status allowlist and no manufactured authority", () => {
  const result = parseFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate(status);
  assert.equal(result.classification, "STRUCTURALLY_VALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE");
  if (result.classification === "STRUCTURALLY_VALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE")
    assert.equal(result.runtime_authority_established, false);
  for (const forbidden of ["username", "generated_uid", "challenge_secret", "capability_secret",
    "raw_ledger", "path", "native_output", "credential", "token", "raw_error", "stderr", "stack"])
    assert.equal(JSON.stringify(status).includes(forbidden), false);
});
test("status forged authority rejected without partial state", () => {
  const value = clone(status); value.status_body.actor_authenticated = true;
  const result = parseFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate(value);
  assert.deepEqual(result, { classification: "INVALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE",
    reason: "STATUS_AUTHORITY_MISMATCH" });
});

test("R1 and R2 import-only regression", () => {
  assert.equal(parseFarmOsDay150C2bBootstrapManifest(
    FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE).accepted, true);
  assert.equal(replayFarmOsDay150C2bBootstrapSourceChainCandidate(
    [FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE]).classification,
  "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE");
});
test("R3 actor and clock import-only regression", () => {
  const actorBody = { schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY, authority_revision: 1 as const,
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR,
    candidate_kind: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND,
    bootstrap_manifest_digest: bindings.manifest_digest, expected_r2_source_base_generation: 0,
    expected_r2_source_base_head_digest: bindings.r2_genesis_source_candidate_digest,
    purpose: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION" as const,
    requested_capability_scope: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE,
    actor_reference_digest_candidate: D("4"), challenge_reference_digest_candidate: D("6"),
    authentication_mechanism_revision: 1, proposed_capability_generation: 0,
    previous_capability_or_revocation_digest_candidate: null, proposed_valid_from: T0,
    proposed_expires_at: "2026-08-12T01:15:00.000Z" };
  assert.equal(parseFarmOsDay150C2bBootstrapActorIntentSourceCandidate({ candidate_body: actorBody,
    candidate_digest: computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest(actorBody) })
    .classification, "STRUCTURALLY_VALID_ACTOR_INTENT_SOURCE_CANDIDATE");
  const clockBody = { schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_revision: 1 as const, source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR,
    bootstrap_manifest_digest: bindings.manifest_digest, installation_identity_digest_candidate: D("c"),
    expected_r2_source_base_generation: 0,
    expected_r2_source_base_head_digest: bindings.r2_genesis_source_candidate_digest,
    policy_revision: 1 as const, intent_kind: "CLOCK_GENESIS_INTENT" as const,
    actor_reference_digest_candidate: D("4"), capability_reference_digest_candidate: D("7"),
    proposed_epoch_reference_digest_candidate: D("e"), proposed_genesis_timestamp: T0 };
  assert.equal(parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate({ candidate_body: clockBody,
    candidate_digest: computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest(clockBody) })
    .classification, "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE");
});
test("external and runtime operation counters remain zero", () => {
  assert.deepEqual({ network: 0, Docker: 0, DB: 0, migration: 0, native: 0,
    authorization_services: 0, open_directory: 0, keychain: 0, ledger_write: 0,
    Gen0: 0, challenge: 0, capability: 0, trusted_clock: 0, authorization: 0, B2: 0,
    production: 0 }, { network: 0, Docker: 0, DB: 0, migration: 0, native: 0,
    authorization_services: 0, open_directory: 0, keychain: 0, ledger_write: 0,
    Gen0: 0, challenge: 0, capability: 0, trusted_clock: 0, authorization: 0, B2: 0,
    production: 0 });
});

console.log(`FarmOS Day150 Phase C2-B2 R4-1 runtime provenance source matrix: PASS (${cases} cases)`);
