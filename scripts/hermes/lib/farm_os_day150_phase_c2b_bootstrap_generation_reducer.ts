import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION,
  FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS,
  FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
  createFarmOsDay150C2bBootstrapRecordSourceCandidate,
  farmOsDay150C2bBootstrapRecordsAreExactlyEqual,
  parseFarmOsDay150C2bBootstrapRecordSourceCandidate,
  snapshotFarmOsDay150C2bBootstrapData,
  type FarmOsDay150C2bBootstrapLedgerRecordBody,
  type FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate,
  type FarmOsDay150C2bBootstrapQuarantineReason,
  type FarmOsDay150C2bBootstrapRecordFailureReason,
  type FarmOsDay150C2bBootstrapSourceProjection,
} from "./farm_os_day150_phase_c2b_bootstrap_ledger_contract";
import { FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE } from
  "./farm_os_day150_phase_c2b_bootstrap_manifest_contract";

export type FarmOsDay150C2bBootstrapReplayFailureReason =
  | "UNTRUSTED_REPLAY_INPUT"
  | FarmOsDay150C2bBootstrapRecordFailureReason
  | "DUPLICATE_EXACT_RECORD"
  | "DIVERGENT_GENERATION_FORK"
  | "MISSING_GENESIS"
  | "GENESIS_NOT_FIRST"
  | "GENESIS_INVALID"
  | "GENERATION_GAP"
  | "OUT_OF_ORDER"
  | "PREDECESSOR_MISSING"
  | "PREDECESSOR_MISMATCH"
  | "INVALID_TRANSITION"
  | "INVALID_PROJECTED_STATE_CLAIM";

export type FarmOsDay150C2bBootstrapSourceChainReplayCandidateResult =
  | Readonly<{
    classification: "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE";
    source_chain_replay: "SOURCE_CHAIN_REPLAY_CANDIDATE";
    candidate_generation: number;
    candidate_head_digest: `sha256:${string}`;
    source_projection: FarmOsDay150C2bBootstrapSourceProjection &
      Readonly<{ discriminator: "SOURCE_PROJECTION_ONLY" }>;
    source_chain_candidate: readonly FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate[];
  }>
  | Readonly<{
    classification: "INVALID_SOURCE_CHAIN_CANDIDATE";
    reason: FarmOsDay150C2bBootstrapReplayFailureReason;
  }>;

function invalid(
  reason: FarmOsDay150C2bBootstrapReplayFailureReason,
): FarmOsDay150C2bBootstrapSourceChainReplayCandidateResult {
  return Object.freeze({ classification: "INVALID_SOURCE_CHAIN_CANDIDATE", reason });
}

function projectionsEqual(
  left: FarmOsDay150C2bBootstrapSourceProjection,
  right: FarmOsDay150C2bBootstrapSourceProjection,
): boolean {
  return left.schema_version === right.schema_version &&
    left.bootstrap_manifest_digest === right.bootstrap_manifest_digest &&
    left.bootstrap_authority_state === right.bootstrap_authority_state &&
    left.quarantine_state === right.quarantine_state;
}

function deriveProjection(
  record: FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate,
): FarmOsDay150C2bBootstrapSourceProjection {
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
    bootstrap_manifest_digest:
      FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
    bootstrap_authority_state: "NOT_ACTIVE",
    quarantine_state: record.record_body.event.event_kind === "BOOTSTRAP_GENESIS"
      ? "NOT_QUARANTINED"
      : "QUARANTINE_REQUIRED_IF_TRUSTEDLY_OBSERVED",
  });
}

export function replayFarmOsDay150C2bBootstrapSourceChainCandidate(
  value: unknown,
): FarmOsDay150C2bBootstrapSourceChainReplayCandidateResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(value);
  if (!snapshot.accepted || !Array.isArray(snapshot.snapshot)) {
    return invalid("UNTRUSTED_REPLAY_INPUT");
  }
  const records: FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate[] = [];
  for (const candidate of snapshot.snapshot) {
    const parsed = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(candidate);
    if (!parsed.accepted) return invalid(parsed.reason);
    records.push(parsed.record);
  }

  for (let left = 0; left < records.length; left += 1) {
    for (let right = left + 1; right < records.length; right += 1) {
      if (records[left]?.record_body.generation !== records[right]?.record_body.generation) continue;
      return invalid(farmOsDay150C2bBootstrapRecordsAreExactlyEqual(
        records[left]!, records[right]!,
      ) ? "DUPLICATE_EXACT_RECORD" : "DIVERGENT_GENERATION_FORK");
    }
  }

  const genesisIndex = records.findIndex((record) => record.record_body.generation === 0);
  if (genesisIndex < 0) return invalid("MISSING_GENESIS");
  if (genesisIndex !== 0) return invalid("GENESIS_NOT_FIRST");
  const genesis = records[0]!;
  if (!farmOsDay150C2bBootstrapRecordsAreExactlyEqual(
    genesis, FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE,
  )) return invalid("GENESIS_INVALID");

  for (let index = 1; index < records.length; index += 1) {
    const previous = records[index - 1]!;
    const record = records[index]!;
    const expectedGeneration = previous.record_body.generation + 1;
    if (record.record_body.generation > expectedGeneration) return invalid("GENERATION_GAP");
    if (record.record_body.generation < expectedGeneration) return invalid("OUT_OF_ORDER");
    if (record.record_body.previous_generation === null ||
      record.record_body.previous_record_digest === null) return invalid("PREDECESSOR_MISSING");
    if (record.record_body.previous_generation !== previous.record_body.generation) {
      return invalid("PREDECESSOR_MISMATCH");
    }
    if (record.record_body.previous_record_digest !== previous.record_digest) {
      return invalid("PREDECESSOR_MISMATCH");
    }
    if (previous.record_body.event.event_kind !== "BOOTSTRAP_GENESIS" ||
      record.record_body.event.event_kind !== "QUARANTINE_ENTERED") {
      return invalid("INVALID_TRANSITION");
    }
    if (!projectionsEqual(record.record_body.projected_state_claim, deriveProjection(record))) {
      return invalid("INVALID_PROJECTED_STATE_CLAIM");
    }
  }

  const last = records.at(-1)!;
  const projection = deriveProjection(last);
  if (!projectionsEqual(last.record_body.projected_state_claim, projection)) {
    return invalid("INVALID_PROJECTED_STATE_CLAIM");
  }
  return Object.freeze({
    classification: "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE",
    source_chain_replay: "SOURCE_CHAIN_REPLAY_CANDIDATE",
    candidate_generation: last.record_body.generation,
    candidate_head_digest: last.record_digest,
    source_projection: Object.freeze({ ...projection, discriminator: "SOURCE_PROJECTION_ONLY" }),
    source_chain_candidate: Object.freeze(records),
  });
}

export function createFarmOsDay150C2bBootstrapQuarantineSourceCandidate(
  previous: unknown,
  reason: unknown,
): FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate {
  const parsedPrevious = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(previous);
  if (!parsedPrevious.accepted) throw new TypeError(parsedPrevious.reason);
  if (typeof reason !== "string" ||
    !(FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS as readonly string[]).includes(reason)) {
    throw new TypeError("INVALID_QUARANTINE_REASON");
  }
  const safePrevious = parsedPrevious.record;
  const safeReason = reason as FarmOsDay150C2bBootstrapQuarantineReason;
  const body: FarmOsDay150C2bBootstrapLedgerRecordBody = Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION,
    generation: safePrevious.record_body.generation + 1,
    previous_generation: safePrevious.record_body.generation,
    previous_record_digest: safePrevious.record_digest,
    bootstrap_manifest_digest:
      FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
    event: Object.freeze({
      schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
      event_kind: "QUARANTINE_ENTERED",
      payload: Object.freeze({
        reason: safeReason,
        terminal: true,
        repeatable: false,
        recoverable_in_r2: false,
      }),
    }),
    projected_state_claim: Object.freeze({
      schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
      bootstrap_manifest_digest:
        FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
      bootstrap_authority_state: "NOT_ACTIVE",
      quarantine_state: "QUARANTINE_REQUIRED_IF_TRUSTEDLY_OBSERVED",
    }),
  });
  return createFarmOsDay150C2bBootstrapRecordSourceCandidate(body);
}

export type FarmOsDay150C2bBootstrapSourceCasResult =
  | Readonly<{ decision: "SOURCE_ACCEPTABLE_SUCCESSOR_CANDIDATE" }>
  | Readonly<{ decision: "SOURCE_CAS_CONFLICT" }>
  | Readonly<{ decision: "SOURCE_EXACT_MATCH_REQUIRES_TRUSTED_READBACK" }>
  | Readonly<{ decision: "SOURCE_INVALID_TRANSITION";
      reason: FarmOsDay150C2bBootstrapReplayFailureReason | FarmOsDay150C2bBootstrapRecordFailureReason }>
  | Readonly<{ decision: "QUARANTINE_IF_TRUSTEDLY_OBSERVED";
      reason: FarmOsDay150C2bBootstrapQuarantineReason }>;

export function classifyFarmOsDay150C2bBootstrapSourceCas(
  input: unknown,
): FarmOsDay150C2bBootstrapSourceCasResult {
  const requestSnapshot = snapshotFarmOsDay150C2bBootstrapData(input);
  if (!requestSnapshot.accepted || typeof requestSnapshot.snapshot !== "object" ||
    requestSnapshot.snapshot === null || Array.isArray(requestSnapshot.snapshot)) {
    return Object.freeze({ decision: "SOURCE_INVALID_TRANSITION",
      reason: "UNTRUSTED_REPLAY_INPUT" });
  }
  const request = requestSnapshot.snapshot as Readonly<Record<string, unknown>>;
  const requestKeys = Object.keys(request).sort();
  if (requestKeys.length !== 4 || requestKeys[0] !== "candidate_record" ||
    requestKeys[1] !== "current_source_chain_candidate" ||
    requestKeys[2] !== "expected_base_digest" ||
    requestKeys[3] !== "expected_base_generation") {
    return Object.freeze({ decision: "SOURCE_INVALID_TRANSITION",
      reason: "UNTRUSTED_REPLAY_INPUT" });
  }
  const expectedBaseGeneration = request.expected_base_generation;
  const expectedBaseDigest = request.expected_base_digest;
  if (typeof expectedBaseGeneration !== "number" ||
    !Number.isSafeInteger(expectedBaseGeneration) || expectedBaseGeneration < 0 ||
    typeof expectedBaseDigest !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(expectedBaseDigest)) {
    return Object.freeze({ decision: "SOURCE_INVALID_TRANSITION",
      reason: "UNTRUSTED_REPLAY_INPUT" });
  }
  const current = replayFarmOsDay150C2bBootstrapSourceChainCandidate(
    request.current_source_chain_candidate,
  );
  if (current.classification !== "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE") {
    return Object.freeze({ decision: "SOURCE_INVALID_TRANSITION", reason: current.reason });
  }
  const parsed = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(request.candidate_record);
  if (!parsed.accepted) {
    return Object.freeze({ decision: "SOURCE_INVALID_TRANSITION", reason: parsed.reason });
  }
  const last = current.source_chain_candidate.at(-1)!;
  if (farmOsDay150C2bBootstrapRecordsAreExactlyEqual(last, parsed.record)) {
    return Object.freeze({ decision: "SOURCE_EXACT_MATCH_REQUIRES_TRUSTED_READBACK" });
  }
  if (expectedBaseGeneration !== current.candidate_generation ||
    expectedBaseDigest !== current.candidate_head_digest) {
    return Object.freeze({ decision: "SOURCE_CAS_CONFLICT" });
  }
  if (parsed.record.record_body.generation === current.candidate_generation) {
    return Object.freeze({
      decision: "QUARANTINE_IF_TRUSTEDLY_OBSERVED",
      reason: "FORK_DETECTED",
    });
  }
  const replay = replayFarmOsDay150C2bBootstrapSourceChainCandidate([
    ...current.source_chain_candidate,
    parsed.record,
  ]);
  return replay.classification === "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE"
    ? Object.freeze({ decision: "SOURCE_ACCEPTABLE_SUCCESSOR_CANDIDATE" })
    : Object.freeze({ decision: "SOURCE_INVALID_TRANSITION", reason: replay.reason });
}

export type FarmOsDay150C2bBootstrapSourceObservationResult =
  | Readonly<{ classification: "SOURCE_OBSERVATION_MATCH" }>
  | Readonly<{ classification: "SOURCE_OBSERVATION_ABSENT" }>
  | Readonly<{ classification: "SOURCE_OBSERVATION_UNKNOWN" }>;

export function classifyFarmOsDay150C2bBootstrapSourceObservation(
  input: unknown,
): FarmOsDay150C2bBootstrapSourceObservationResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(input);
  if (!snapshot.accepted || typeof snapshot.snapshot !== "object" ||
    snapshot.snapshot === null || Array.isArray(snapshot.snapshot)) {
    return Object.freeze({ classification: "SOURCE_OBSERVATION_UNKNOWN" });
  }
  const keys = Object.keys(snapshot.snapshot).sort();
  if (keys.length !== 2 || keys[0] !== "intended_record_digest" ||
    keys[1] !== "observed_record_digest") {
    return Object.freeze({ classification: "SOURCE_OBSERVATION_UNKNOWN" });
  }
  const observation = snapshot.snapshot as Readonly<Record<string, unknown>>;
  const intended = observation.intended_record_digest;
  const observed = observation.observed_record_digest;
  if (typeof intended !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(intended)) {
    return Object.freeze({ classification: "SOURCE_OBSERVATION_UNKNOWN" });
  }
  if (observed === "ABSENT") {
    return Object.freeze({ classification: "SOURCE_OBSERVATION_ABSENT" });
  }
  if (observed === "UNKNOWN" || typeof observed !== "string" ||
    !/^sha256:[a-f0-9]{64}$/u.test(observed)) {
    return Object.freeze({ classification: "SOURCE_OBSERVATION_UNKNOWN" });
  }
  return Object.freeze({ classification: observed === intended
    ? "SOURCE_OBSERVATION_MATCH"
    : "SOURCE_OBSERVATION_UNKNOWN" });
}
