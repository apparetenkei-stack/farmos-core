import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_DIGEST_UTILITY_CEILING,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_DIGEST_DOMAIN,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_REFERENCE_DIGEST_DOMAIN,
  FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR,
  canonicalizeFarmOsDay150C2bBootstrapActorIntentSourceCandidateBody,
  computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest,
  parseFarmOsDay150C2bBootstrapActorIntentSourceCandidate,
  type FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_actor_source_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_AFFECTED_RECORD_POLICIES,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_DIGEST_DOMAIN,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_DIGEST_UTILITY_CEILING,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POISON_REASONS,
  FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR,
  canonicalizeFarmOsDay150C2bBootstrapClockIntentSourceCandidateBody,
  computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest,
  parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate,
  type FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_clock_source_contract";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_ledger_contract";
import { FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE } from
  "./lib/farm_os_day150_phase_c2b_bootstrap_manifest_contract";

const D = (digit: string): `sha256:${string}` => `sha256:${digit.repeat(64)}`;
const clone = <T>(value: T): any => JSON.parse(JSON.stringify(value));
const MANIFEST = "sha256:a332368cbdca6461e11f538085a8bea3bfbd63f20cc0066302412d309e9e11be";

function actorBody(): FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody {
  return {
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_AUTHORITY,
    authority_revision: 1,
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_SOURCE_DISCRIMINATOR,
    candidate_kind: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_KIND,
    bootstrap_manifest_digest: MANIFEST,
    expected_r2_source_base_generation: 0,
    expected_r2_source_base_head_digest: D("1"),
    purpose: "DAY150_PHASE_C2B_ISOLATED_DURABILITY_QUALIFICATION",
    requested_capability_scope: FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_CAPABILITY_SCOPE,
    actor_reference_digest_candidate: D("2"),
    challenge_reference_digest_candidate: D("3"),
    authentication_mechanism_revision: 1,
    proposed_capability_generation: 0,
    previous_capability_or_revocation_digest_candidate: null,
    proposed_valid_from: "2026-08-12T01:00:00.000Z",
    proposed_expires_at: "2026-08-12T01:15:00.000Z",
  };
}
function actorEnvelope(body: FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody = actorBody()) {
  return { candidate_body: body,
    candidate_digest: computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest(body) };
}
function expectActorReason(value: unknown, reason: string): void {
  const result = parseFarmOsDay150C2bBootstrapActorIntentSourceCandidate(value);
  assert.equal(result.classification, "INVALID_ACTOR_INTENT_SOURCE_CANDIDATE");
  if (result.classification === "INVALID_ACTOR_INTENT_SOURCE_CANDIDATE") {
    assert.equal(result.reason, reason);
    assert.deepEqual(Object.keys(result).sort(),
      ["authority_id", "authority_revision", "classification", "reason", "schema_version"]);
  }
}

assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest, MANIFEST);
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_INTENT_SOURCE_DIGEST_DOMAIN,
  "farmos.day150-c2b-bootstrap-actor-intent-source.v1:candidate-body");
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_REFERENCE_DIGEST_DOMAIN,
  "farmos.day150-c2b-bootstrap-actor-reference.v1:generateduid-install-binding");
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_ACTOR_DIGEST_UTILITY_CEILING,
  "SOURCE_CONSTRUCTION_ONLY_NOT_VALIDATION_OR_AUTHORITY");
const actorValid = parseFarmOsDay150C2bBootstrapActorIntentSourceCandidate(actorEnvelope());
assert.equal(actorValid.classification, "STRUCTURALLY_VALID_ACTOR_INTENT_SOURCE_CANDIDATE");
assert.deepEqual(Object.keys(actorValid).sort(), ["authority_id", "authority_revision",
  "candidate_digest", "candidate_kind", "classification", "schema_version",
  "source_discriminator"]);
assert.equal(JSON.stringify(actorValid).includes("CAPABILITY_ACTIVE"), false);
assert.equal(JSON.stringify(actorValid).includes("AUTHENTICATED"), false);

const reversedActorBody = Object.fromEntries(Object.entries(actorBody()).reverse()) as
  FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody;
assert.equal(computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest(reversedActorBody),
  actorEnvelope().candidate_digest);
assert.equal(canonicalizeFarmOsDay150C2bBootstrapActorIntentSourceCandidateBody(reversedActorBody),
  canonicalizeFarmOsDay150C2bBootstrapActorIntentSourceCandidateBody(actorBody()));

for (const forbidden of ["raw_generated_uid", "username", "display_name", "actor_id", "role",
  "admin", "authority", "authentication_blob", "challenge_response", "biometric_data",
  "native_output", "challenge_issued", "challenge_consumed", "capability_active",
  "runtime_evidence", "storage_evidence"]) {
  const value = clone(actorEnvelope());
  value.candidate_body[forbidden] = forbidden === "admin" ? true : "secret";
  expectActorReason(value, "INVALID_ACTOR_INTENT_ENVELOPE");
}
const wrongManifestActor = clone(actorEnvelope());
wrongManifestActor.candidate_body.bootstrap_manifest_digest = D("9");
expectActorReason(wrongManifestActor, "ACTOR_INTENT_MANIFEST_MISMATCH");
const wrongSourceActor = clone(actorEnvelope());
wrongSourceActor.candidate_body.expected_r2_source_base_generation = -1;
expectActorReason(wrongSourceActor, "INVALID_ACTOR_INTENT_SOURCE_BASE");
const wrongPurposeActor = clone(actorEnvelope());
wrongPurposeActor.candidate_body.purpose = "OTHER";
expectActorReason(wrongPurposeActor, "INVALID_ACTOR_INTENT_PURPOSE_OR_SCOPE");
const wrongReferenceActor = clone(actorEnvelope());
wrongReferenceActor.candidate_body.challenge_reference_digest_candidate = "bad";
expectActorReason(wrongReferenceActor, "INVALID_ACTOR_OR_CHALLENGE_REFERENCE");
const wrongMechanismActor = clone(actorEnvelope());
wrongMechanismActor.candidate_body.authentication_mechanism_revision = 2;
expectActorReason(wrongMechanismActor, "INVALID_AUTHENTICATION_MECHANISM_REVISION");
const wrongLineageActor = clone(actorEnvelope());
wrongLineageActor.candidate_body.proposed_capability_generation = 1;
expectActorReason(wrongLineageActor, "ACTOR_INTENT_CROSS_FIELD_INCONSISTENCY");
const wrongTimeActor = clone(actorEnvelope());
wrongTimeActor.candidate_body.proposed_valid_from = "08/12/2026";
expectActorReason(wrongTimeActor, "INVALID_PROPOSED_VALIDITY_WINDOW");
const tooLongActor = clone(actorEnvelope());
tooLongActor.candidate_body.proposed_expires_at = "2026-08-12T01:15:00.001Z";
expectActorReason(tooLongActor, "INVALID_PROPOSED_VALIDITY_WINDOW");
const sameReferencesActor = clone(actorEnvelope());
sameReferencesActor.candidate_body.challenge_reference_digest_candidate = D("2");
expectActorReason(sameReferencesActor, "ACTOR_INTENT_CROSS_FIELD_INCONSISTENCY");
const malformedActorDigest = clone(actorEnvelope());
malformedActorDigest.candidate_digest = "bad";
expectActorReason(malformedActorDigest, "MALFORMED_ACTOR_INTENT_DIGEST");
const mismatchedActorDigest = clone(actorEnvelope());
mismatchedActorDigest.candidate_digest = D("f");
expectActorReason(mismatchedActorDigest, "ACTOR_INTENT_DIGEST_MISMATCH");
const selfDigestedInvalidActor = clone(actorEnvelope());
selfDigestedInvalidActor.candidate_body.role = "admin";
selfDigestedInvalidActor.candidate_digest =
  computeFarmOsDay150C2bBootstrapActorIntentSourceCandidateDigest(
    selfDigestedInvalidActor.candidate_body as FarmOsDay150C2bBootstrapActorIntentSourceCandidateBody,
  );
expectActorReason(selfDigestedInvalidActor, "INVALID_ACTOR_INTENT_ENVELOPE");
const actorPrecedence = clone(actorEnvelope());
actorPrecedence.candidate_body.bootstrap_manifest_digest = D("9");
actorPrecedence.candidate_body.proposed_valid_from = "bad";
actorPrecedence.candidate_digest = "bad";
expectActorReason(actorPrecedence, "ACTOR_INTENT_MANIFEST_MISMATCH");

const accessorActor = clone(actorEnvelope());
Object.defineProperty(accessorActor.candidate_body, "actor_reference_digest_candidate",
  { enumerable: true, get: () => D("2") });
expectActorReason(accessorActor, "UNTRUSTED_ACTOR_INTENT_INPUT");
const symbolActor = clone(actorEnvelope());
symbolActor[Symbol("hidden")] = "secret";
expectActorReason(symbolActor, "UNTRUSTED_ACTOR_INTENT_INPUT");
expectActorReason(Object.create({ candidate_body: actorBody() }), "UNTRUSTED_ACTOR_INTENT_INPUT");

function commonClock() {
  return {
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_AUTHORITY,
    authority_revision: 1 as const,
    source_discriminator: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_SOURCE_DISCRIMINATOR,
    bootstrap_manifest_digest: MANIFEST as `sha256:${string}`,
    installation_identity_digest_candidate: D("4"),
    expected_r2_source_base_generation: 0,
    expected_r2_source_base_head_digest: D("1"),
    policy_revision: 1 as const,
  };
}
function genesisBody(): FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody {
  return { ...commonClock(), intent_kind: "CLOCK_GENESIS_INTENT",
    actor_reference_digest_candidate: D("2"), capability_reference_digest_candidate: D("5"),
    proposed_epoch_reference_digest_candidate: D("6"),
    proposed_genesis_timestamp: "2026-08-12T01:00:00.000Z" };
}
function comparisonBody(observation = "2026-08-12T01:01:00.000Z"):
FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody {
  return { ...commonClock(), intent_kind: "CLOCK_COMPARISON_INTENT",
    epoch_reference_digest_candidate: D("6"),
    previous_floor_timestamp_candidate: "2026-08-12T01:00:00.000Z",
    proposed_observation_timestamp_candidate: observation,
    forward_poison_upper_bound_timestamp_candidate: "2026-08-13T01:00:00.000Z" };
}
function supersessionBody(): FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody {
  return { ...commonClock(), intent_kind: "CLOCK_EPOCH_SUPERSESSION_INTENT",
    previous_epoch_reference_digest_candidate: D("6"),
    poison_reason: FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_POISON_REASONS[0],
    last_trusted_pre_suspect_reference_digest_candidate: D("7"),
    suspect_interval_start_candidate: "2026-08-12T01:00:00.000Z",
    suspect_interval_end_candidate: "2026-08-13T01:00:00.000Z",
    proposed_corrected_genesis_timestamp: "2026-08-12T02:00:00.000Z",
    recovery_actor_reference_digest_candidate: D("2"), capability_reference_digest_candidate: D("5"),
    affected_record_policy: FARM_OS_DAY150_C2B_BOOTSTRAP_AFFECTED_RECORD_POLICIES[0],
    proposed_new_epoch_reference_digest_candidate: D("8") };
}
function clockEnvelope(body: FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody) {
  return { candidate_body: body,
    candidate_digest: computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest(body) };
}
function expectClockReason(value: unknown, reason: string): void {
  const result = parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate(value);
  assert.equal(result.classification, "INVALID_CLOCK_INTENT_SOURCE_CANDIDATE");
  if (result.classification === "INVALID_CLOCK_INTENT_SOURCE_CANDIDATE") {
    assert.equal(result.reason, reason);
    assert.deepEqual(Object.keys(result).sort(),
      ["authority_id", "authority_revision", "classification", "reason", "schema_version"]);
  }
}

assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_INTENT_SOURCE_DIGEST_DOMAIN,
  "farmos.day150-c2b-bootstrap-clock-intent-source.v1:candidate-body");
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_CLOCK_DIGEST_UTILITY_CEILING,
  "SOURCE_CONSTRUCTION_ONLY_NOT_VALIDATION_OR_AUTHORITY");
for (const body of [genesisBody(), comparisonBody(), supersessionBody()]) {
  const parsed = parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate(clockEnvelope(body));
  assert.equal(parsed.classification, "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE");
  assert.equal(JSON.stringify(parsed).includes("TRUSTED_CLOCK_ESTABLISHED"), false);
  assert.equal(JSON.stringify(parsed).includes("CLOCK_ROLLBACK_DETECTED"), false);
}
const nonRegressing = parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate(
  clockEnvelope(comparisonBody()));
assert.equal(nonRegressing.classification === "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE"
  ? nonRegressing.conditional_source_comparison?.result : null,
"NON_REGRESSING_IF_TRUSTEDLY_OBSERVED");
assert.equal(nonRegressing.classification === "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE"
  ? nonRegressing.conditional_source_comparison?.basis : null,
"SOURCE_RELATIVE_CANDIDATE_COMPARISON_ONLY");
assert.equal(nonRegressing.classification === "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE"
  ? nonRegressing.conditional_source_comparison?.future_trusted_bindings_required : null,
"EPOCH_DURABLE_FLOOR_POLICY_OS_OBSERVATION_AND_STORAGE_READBACK");
const rollback = parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate(
  clockEnvelope(comparisonBody("2026-08-12T00:59:59.999Z")));
assert.equal(rollback.classification === "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE"
  ? rollback.conditional_source_comparison?.result : null,
"ROLLBACK_CONDITION_IF_TRUSTEDLY_OBSERVED");
const forwardPoison = parseFarmOsDay150C2bBootstrapClockIntentSourceCandidate(
  clockEnvelope(comparisonBody("2026-08-13T01:00:00.001Z")));
assert.equal(forwardPoison.classification === "STRUCTURALLY_VALID_CLOCK_INTENT_SOURCE_CANDIDATE"
  ? forwardPoison.conditional_source_comparison?.result : null,
"FORWARD_POISON_CONDITION_IF_TRUSTEDLY_OBSERVED");

const reversedClock = Object.fromEntries(Object.entries(comparisonBody()).reverse()) as
  FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody;
assert.equal(computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest(reversedClock),
  clockEnvelope(comparisonBody()).candidate_digest);
assert.equal(canonicalizeFarmOsDay150C2bBootstrapClockIntentSourceCandidateBody(reversedClock),
  canonicalizeFarmOsDay150C2bBootstrapClockIntentSourceCandidateBody(comparisonBody()));
for (const forbidden of ["os_utc_verified", "human_confirmed", "active_epoch", "durable_floor",
  "clock_rollback_detected", "runtime_evidence", "storage_evidence", "raw_native_output",
  "username", "generated_uid", "role", "admin", "authority"]) {
  const value = clone(clockEnvelope(genesisBody()));
  value.candidate_body[forbidden] = true;
  expectClockReason(value, "INVALID_CLOCK_INTENT_ENVELOPE");
}
const wrongClockManifest = clone(clockEnvelope(genesisBody()));
wrongClockManifest.candidate_body.bootstrap_manifest_digest = D("9");
expectClockReason(wrongClockManifest, "CLOCK_INTENT_MANIFEST_OR_INSTALLATION_MISMATCH");
for (const inheritedKind of ["toString", "constructor", "__proto__"]) {
  const unknownKind = clone(clockEnvelope(genesisBody()));
  unknownKind.candidate_body.intent_kind = inheritedKind;
  expectClockReason(unknownKind, "UNKNOWN_CLOCK_INTENT_KIND");
}
const wrongClockSource = clone(clockEnvelope(genesisBody()));
wrongClockSource.candidate_body.expected_r2_source_base_head_digest = "bad";
expectClockReason(wrongClockSource, "INVALID_CLOCK_INTENT_SOURCE_BASE");
const wrongEpoch = clone(clockEnvelope(genesisBody()));
wrongEpoch.candidate_body.proposed_epoch_reference_digest_candidate = "bad";
expectClockReason(wrongEpoch, "INVALID_CLOCK_EPOCH_OR_REFERENCE");
const wrongClockTime = clone(clockEnvelope(genesisBody()));
wrongClockTime.candidate_body.proposed_genesis_timestamp = "2026-08-12 01:00:00";
expectClockReason(wrongClockTime, "INVALID_CLOCK_TIMESTAMP");
const wrongClockActor = clone(clockEnvelope(genesisBody()));
wrongClockActor.candidate_body.actor_reference_digest_candidate = "bad";
expectClockReason(wrongClockActor, "INVALID_CLOCK_ACTOR_OR_CAPABILITY_REFERENCE");
const wrongClockPolicy = clone(clockEnvelope(supersessionBody()));
wrongClockPolicy.candidate_body.poison_reason = "OTHER";
expectClockReason(wrongClockPolicy, "INVALID_CLOCK_POLICY_OR_ENUM");
const reversedInterval = clone(clockEnvelope(supersessionBody()));
reversedInterval.candidate_body.suspect_interval_start_candidate = "2026-08-14T01:00:00.000Z";
expectClockReason(reversedInterval, "CLOCK_INTENT_CROSS_FIELD_INCONSISTENCY");
const malformedClockDigest = clone(clockEnvelope(genesisBody()));
malformedClockDigest.candidate_digest = "bad";
expectClockReason(malformedClockDigest, "MALFORMED_CLOCK_INTENT_DIGEST");
const clockDigestMismatch = clone(clockEnvelope(genesisBody()));
clockDigestMismatch.candidate_digest = D("f");
expectClockReason(clockDigestMismatch, "CLOCK_INTENT_DIGEST_MISMATCH");
const selfDigestedInvalidClock = clone(clockEnvelope(genesisBody()));
selfDigestedInvalidClock.candidate_body.active_epoch = true;
selfDigestedInvalidClock.candidate_digest =
  computeFarmOsDay150C2bBootstrapClockIntentSourceCandidateDigest(
    selfDigestedInvalidClock.candidate_body as FarmOsDay150C2bBootstrapClockIntentSourceCandidateBody,
  );
expectClockReason(selfDigestedInvalidClock, "INVALID_CLOCK_INTENT_ENVELOPE");
const clockPrecedence = clone(clockEnvelope(genesisBody()));
clockPrecedence.candidate_body.proposed_epoch_reference_digest_candidate = "bad";
clockPrecedence.candidate_body.proposed_genesis_timestamp = "bad";
clockPrecedence.candidate_digest = "bad";
expectClockReason(clockPrecedence, "INVALID_CLOCK_EPOCH_OR_REFERENCE");
const accessorClock = clone(clockEnvelope(genesisBody()));
Object.defineProperty(accessorClock.candidate_body, "proposed_genesis_timestamp",
  { enumerable: true, get: () => "2026-08-12T01:00:00.000Z" });
expectClockReason(accessorClock, "UNTRUSTED_CLOCK_INTENT_INPUT");
const symbolClock = clone(clockEnvelope(genesisBody()));
symbolClock.candidate_body[Symbol("hidden")] = "secret";
expectClockReason(symbolClock, "UNTRUSTED_CLOCK_INTENT_INPUT");

assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
  "farmos.day150-c2b-bootstrap-ledger-event.v1");
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS.includes("UNKNOWN_EVENT_KIND"), true);
assert.equal(JSON.stringify([genesisBody(), comparisonBody(), supersessionBody()])
  .includes("BOOTSTRAP_GENESIS"), false);
assert.equal(JSON.stringify([genesisBody(), comparisonBody(), supersessionBody()])
  .includes("QUARANTINE_ENTERED"), false);

console.log("FarmOS Day150 Phase C2-B2 R3 actor/clock source candidate matrix: PASS");
