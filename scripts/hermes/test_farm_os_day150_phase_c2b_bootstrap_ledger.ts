import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_DIGEST_DOMAIN,
  FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION,
  FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS,
  FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
  canonicalizeFarmOsDay150C2bBootstrapLedgerRecordBody,
  computeFarmOsDay150C2bBootstrapLedgerRecordDigest,
  parseFarmOsDay150C2bBootstrapRecordSourceCandidate,
  type FarmOsDay150C2bBootstrapLedgerRecordBody,
  type FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_ledger_contract";
import {
  classifyFarmOsDay150C2bBootstrapSourceCas,
  classifyFarmOsDay150C2bBootstrapSourceObservation,
  createFarmOsDay150C2bBootstrapQuarantineSourceCandidate,
  replayFarmOsDay150C2bBootstrapSourceChainCandidate,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_generation_reducer";
import {
  FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY,
  projectFarmOsDay150C2bBootstrapSourceStatus,
} from "./lib/farm_os_day150_phase_c2b_bootstrap_status";
import { FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE } from
  "./lib/farm_os_day150_phase_c2b_bootstrap_manifest_contract";

const EXPECTED_MANIFEST_DIGEST =
  "sha256:4f40823d671ded21d01d19f88b512e2ba4b75cb20b56d2bd5ae0a723c4bd28b9";

function clone<T>(value: T): any {
  return JSON.parse(JSON.stringify(value));
}

function seal(body: any): FarmOsDay150C2bBootstrapLedgerRecordSourceCandidate {
  return Object.freeze({
    record_body: body as FarmOsDay150C2bBootstrapLedgerRecordBody,
    record_digest: computeFarmOsDay150C2bBootstrapLedgerRecordDigest(body),
  });
}

function expectReplayReason(value: unknown, reason: string): void {
  const replay = replayFarmOsDay150C2bBootstrapSourceChainCandidate(value);
  assert.equal(replay.classification, "INVALID_SOURCE_CHAIN_CANDIDATE");
  if (replay.classification === "INVALID_SOURCE_CHAIN_CANDIDATE") {
    assert.equal(replay.reason, reason);
  }
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).reverse().map(
    ([key, child]) => [key, reverseObjectKeys(child)],
  ));
}

assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_MANIFEST_SOURCE_CANDIDATE.manifest_digest,
  EXPECTED_MANIFEST_DIGEST);
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
  "farmos.day150-c2b-bootstrap-ledger-record.v1");
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_DIGEST_DOMAIN,
  "farmos.day150-c2b-bootstrap-ledger-record.v1:record-body");
assert.deepEqual(FARM_OS_DAY150_C2B_BOOTSTRAP_QUARANTINE_REASONS, [
  "FORK_DETECTED", "CHAIN_CORRUPTION", "OBSERVATION_AMBIGUOUS", "GENESIS_MISMATCH",
  "PREDECESSOR_MISMATCH", "UNSUPPORTED_SCHEMA", "UNKNOWN_EVENT_KIND",
  "PROJECTED_STATE_MISMATCH",
]);

const genesis = FARM_OS_DAY150_C2B_BOOTSTRAP_GENESIS_SOURCE_CONTRACT_CANDIDATE;
const parsedGenesis = parseFarmOsDay150C2bBootstrapRecordSourceCandidate(clone(genesis));
assert.equal(parsedGenesis.accepted, true);
assert.equal(genesis.record_body.generation, 0);
assert.equal(genesis.record_body.previous_generation, null);
assert.equal(genesis.record_body.previous_record_digest, null);
assert.equal(genesis.record_body.event.event_kind, "BOOTSTRAP_GENESIS");
assert.equal(genesis.record_body.projected_state_claim.bootstrap_authority_state, "NOT_ACTIVE");

const genesisReplay = replayFarmOsDay150C2bBootstrapSourceChainCandidate([clone(genesis)]);
assert.equal(genesisReplay.classification, "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE");
if (genesisReplay.classification !== "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE") {
  throw new Error("GENESIS_REPLAY_NOT_STRUCTURALLY_VALID");
}
assert.equal(genesisReplay.source_chain_replay, "SOURCE_CHAIN_REPLAY_CANDIDATE");
assert.equal(genesisReplay.source_projection.discriminator, "SOURCE_PROJECTION_ONLY");
assert.equal(genesisReplay.source_projection.bootstrap_authority_state, "NOT_ACTIVE");

const quarantine = createFarmOsDay150C2bBootstrapQuarantineSourceCandidate(
  genesis, "OBSERVATION_AMBIGUOUS",
);
const quarantineReplay = replayFarmOsDay150C2bBootstrapSourceChainCandidate([
  clone(genesis), clone(quarantine),
]);
assert.equal(quarantineReplay.classification, "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE");
if (quarantineReplay.classification !== "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE") {
  throw new Error("QUARANTINE_REPLAY_NOT_STRUCTURALLY_VALID");
}
assert.equal(quarantineReplay.source_projection.quarantine_state,
  "QUARANTINE_REQUIRED_IF_TRUSTEDLY_OBSERVED");
assert.deepEqual(quarantine.record_body.event.event_kind === "QUARANTINE_ENTERED"
  ? quarantine.record_body.event.payload : null, {
  reason: "OBSERVATION_AMBIGUOUS", terminal: true, repeatable: false, recoverable_in_r2: false,
});

const secondQuarantine = createFarmOsDay150C2bBootstrapQuarantineSourceCandidate(
  quarantine, "CHAIN_CORRUPTION",
);
expectReplayReason([genesis, quarantine, secondQuarantine], "INVALID_TRANSITION");
const postQuarantine = createFarmOsDay150C2bBootstrapQuarantineSourceCandidate(
  quarantine, "PREDECESSOR_MISMATCH",
);
expectReplayReason([genesis, quarantine, postQuarantine], "INVALID_TRANSITION");

const malformedDigest = clone(genesis);
malformedDigest.record_digest = "sha256:bad";
expectReplayReason([malformedDigest], "MALFORMED_RECORD_DIGEST");
const mismatchedDigest = clone(genesis);
mismatchedDigest.record_digest = `sha256:${"f".repeat(64)}`;
expectReplayReason([mismatchedDigest], "RECORD_DIGEST_MISMATCH");

const wrongManifestBody = clone(genesis.record_body);
wrongManifestBody.bootstrap_manifest_digest = `sha256:${"1".repeat(64)}`;
const wrongManifest = { record_body: wrongManifestBody,
  record_digest: `sha256:${"2".repeat(64)}` };
expectReplayReason([wrongManifest], "MANIFEST_MISMATCH");

for (const invalidGeneration of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
  const body = clone(genesis.record_body);
  body.generation = invalidGeneration;
  expectReplayReason([{ record_body: body, record_digest: genesis.record_digest }],
    "INVALID_GENERATION");
}

const generationGapBody = clone(quarantine.record_body);
generationGapBody.generation = 2;
const generationGap = seal(generationGapBody);
expectReplayReason([genesis, generationGap], "GENERATION_GAP");

const wrongPreviousGenerationBody = clone(quarantine.record_body);
wrongPreviousGenerationBody.previous_generation = 9;
const wrongPreviousGeneration = seal(wrongPreviousGenerationBody);
expectReplayReason([genesis, wrongPreviousGeneration], "PREDECESSOR_MISMATCH");

const wrongPreviousDigestBody = clone(quarantine.record_body);
wrongPreviousDigestBody.previous_record_digest = `sha256:${"3".repeat(64)}`;
const wrongPreviousDigest = seal(wrongPreviousDigestBody);
expectReplayReason([genesis, wrongPreviousDigest], "PREDECESSOR_MISMATCH");

expectReplayReason([genesis, clone(genesis)], "DUPLICATE_EXACT_RECORD");
const divergentZeroBody = clone(quarantine.record_body);
divergentZeroBody.generation = 0;
divergentZeroBody.previous_generation = null;
divergentZeroBody.previous_record_digest = null;
const divergentZero = seal(divergentZeroBody);
expectReplayReason([genesis, divergentZero], "DIVERGENT_GENERATION_FORK");

const reversedGenesis = reverseObjectKeys(genesis);
const reversedReplay = replayFarmOsDay150C2bBootstrapSourceChainCandidate([reversedGenesis]);
assert.equal(reversedReplay.classification, "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE");
assert.equal(canonicalizeFarmOsDay150C2bBootstrapLedgerRecordBody(
  (reversedGenesis as any).record_body),
canonicalizeFarmOsDay150C2bBootstrapLedgerRecordBody(genesis.record_body));
expectReplayReason([quarantine, genesis], "GENESIS_NOT_FIRST");
expectReplayReason([quarantine], "MISSING_GENESIS");

const unknownField = clone(genesis);
unknownField.record_body.unknown = true;
expectReplayReason([unknownField], "INVALID_RECORD_BODY_SHAPE");
const missingField = clone(genesis);
delete missingField.record_body.event;
expectReplayReason([missingField], "INVALID_RECORD_BODY_SHAPE");

const exotic = clone(genesis);
Object.setPrototypeOf(exotic.record_body, Object.create(null));
expectReplayReason([exotic], "UNTRUSTED_REPLAY_INPUT");
const accessor = clone(genesis);
Object.defineProperty(accessor.record_body, "accessor", {
  get: () => "raw-error-value", enumerable: true,
});
expectReplayReason([accessor], "UNTRUSTED_REPLAY_INPUT");
const symbolRecord = clone(genesis);
Object.defineProperty(symbolRecord.record_body, Symbol("hidden"), {
  value: "raw-error-value", enumerable: true,
});
expectReplayReason([symbolRecord], "UNTRUSTED_REPLAY_INPUT");
const sparse: unknown[] = [clone(genesis), clone(quarantine)];
delete sparse[0];
expectReplayReason(sparse, "UNTRUSTED_REPLAY_INPUT");
const namedArray = [clone(genesis)];
Object.defineProperty(namedArray, "extra", { value: true, enumerable: true });
expectReplayReason(namedArray, "UNTRUSTED_REPLAY_INPUT");
const reflectiveFailure = new Proxy(clone(genesis), {
  ownKeys: () => { throw new Error("reflection failed"); },
});
expectReplayReason([reflectiveFailure], "UNTRUSTED_REPLAY_INPUT");

const oneReadTarget = clone(genesis);
let oneReadCount = 0;
const oneReadProxy = new Proxy(oneReadTarget, {
  ownKeys: (target) => {
    oneReadCount += 1;
    if (oneReadCount > 1) throw new Error("caller object reread");
    return Reflect.ownKeys(target);
  },
});
assert.equal(replayFarmOsDay150C2bBootstrapSourceChainCandidate([oneReadProxy]).classification,
  "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE");
assert.equal(oneReadCount, 1);

const schemaAndDigest = clone(genesis);
schemaAndDigest.record_body.schema_version = "wrong.v1";
schemaAndDigest.record_digest = "bad";
expectReplayReason([schemaAndDigest], "UNKNOWN_SCHEMA");
const generationAndPredecessor = clone(genesis);
generationAndPredecessor.record_body.generation = -1;
generationAndPredecessor.record_body.previous_record_digest = "bad";
expectReplayReason([generationAndPredecessor], "INVALID_GENERATION");
const laterGapBody = clone(quarantine.record_body);
laterGapBody.generation = 3;
const laterGap = seal(laterGapBody);
expectReplayReason([genesis, quarantine, divergentZero, laterGap],
  "DIVERGENT_GENERATION_FORK");
const unknownEventAndProjection = clone(quarantine);
unknownEventAndProjection.record_body.event.event_kind = "FUTURE_EVENT";
unknownEventAndProjection.record_body.projected_state_claim.quarantine_state = "BAD";
expectReplayReason([genesis, unknownEventAndProjection], "UNKNOWN_EVENT_KIND");
const malformedDuplicate = clone(genesis);
malformedDuplicate.record_digest = "bad";
expectReplayReason([genesis, malformedDuplicate], "MALFORMED_RECORD_DIGEST");

const wrongProjectionBody = clone(quarantine.record_body);
wrongProjectionBody.projected_state_claim.quarantine_state = "NOT_QUARANTINED";
const wrongProjection = seal(wrongProjectionBody);
expectReplayReason([genesis, wrongProjection], "INVALID_PROJECTED_STATE_CLAIM");

const acceptable = classifyFarmOsDay150C2bBootstrapSourceCas({
  current_source_chain_candidate: [genesis],
  candidate_record: quarantine,
  expected_base_generation: genesisReplay.candidate_generation,
  expected_base_digest: genesisReplay.candidate_head_digest,
});
assert.equal(acceptable.decision, "SOURCE_ACCEPTABLE_SUCCESSOR_CANDIDATE");
const exactMatch = classifyFarmOsDay150C2bBootstrapSourceCas({
  current_source_chain_candidate: [genesis, quarantine],
  candidate_record: quarantine,
  expected_base_generation: 0,
  expected_base_digest: genesis.record_digest,
});
assert.equal(exactMatch.decision, "SOURCE_EXACT_MATCH_REQUIRES_TRUSTED_READBACK");
const casConflict = classifyFarmOsDay150C2bBootstrapSourceCas({
  current_source_chain_candidate: [genesis, quarantine],
  candidate_record: secondQuarantine,
  expected_base_generation: 0,
  expected_base_digest: genesis.record_digest,
});
assert.equal(casConflict.decision, "SOURCE_CAS_CONFLICT");
const invalidTransition = classifyFarmOsDay150C2bBootstrapSourceCas({
  current_source_chain_candidate: [genesis, quarantine],
  candidate_record: secondQuarantine,
  expected_base_generation: quarantineReplay.candidate_generation,
  expected_base_digest: quarantineReplay.candidate_head_digest,
});
assert.equal(invalidTransition.decision, "SOURCE_INVALID_TRANSITION");
const conditionalQuarantine = classifyFarmOsDay150C2bBootstrapSourceCas({
  current_source_chain_candidate: [genesis],
  candidate_record: divergentZero,
  expected_base_generation: genesisReplay.candidate_generation,
  expected_base_digest: genesisReplay.candidate_head_digest,
});
assert.equal(conditionalQuarantine.decision, "QUARANTINE_IF_TRUSTEDLY_OBSERVED");

let casRequestReads = 0;
const casRequestProxy = new Proxy({
  current_source_chain_candidate: [genesis],
  candidate_record: quarantine,
  expected_base_generation: 0,
  expected_base_digest: genesis.record_digest,
}, {
  ownKeys: (target) => {
    casRequestReads += 1;
    if (casRequestReads > 1) throw new Error("CAS request reread");
    return Reflect.ownKeys(target);
  },
});
assert.equal(classifyFarmOsDay150C2bBootstrapSourceCas(casRequestProxy).decision,
  "SOURCE_ACCEPTABLE_SUCCESSOR_CANDIDATE");
assert.equal(casRequestReads, 1);
let casAccessorReads = 0;
const casAccessorRequest = {
  current_source_chain_candidate: [genesis],
  candidate_record: quarantine,
  expected_base_generation: 0,
} as Record<string, unknown>;
Object.defineProperty(casAccessorRequest, "expected_base_digest", {
  enumerable: true,
  get: () => {
    casAccessorReads += 1;
    return genesis.record_digest;
  },
});
assert.equal(classifyFarmOsDay150C2bBootstrapSourceCas(casAccessorRequest).decision,
  "SOURCE_INVALID_TRANSITION");
assert.equal(casAccessorReads, 0);

let quarantinePreviousReads = 0;
const quarantinePreviousProxy = new Proxy(clone(genesis), {
  ownKeys: (target) => {
    quarantinePreviousReads += 1;
    if (quarantinePreviousReads > 1) throw new Error("quarantine previous reread");
    return Reflect.ownKeys(target);
  },
});
assert.equal(createFarmOsDay150C2bBootstrapQuarantineSourceCandidate(
  quarantinePreviousProxy, "CHAIN_CORRUPTION",
).record_body.generation, 1);
assert.equal(quarantinePreviousReads, 1);

assert.deepEqual(classifyFarmOsDay150C2bBootstrapSourceObservation({
  intended_record_digest: genesis.record_digest,
  observed_record_digest: genesis.record_digest,
}), { classification: "SOURCE_OBSERVATION_MATCH" });
assert.deepEqual(classifyFarmOsDay150C2bBootstrapSourceObservation({
  intended_record_digest: genesis.record_digest,
  observed_record_digest: "ABSENT",
}), { classification: "SOURCE_OBSERVATION_ABSENT" });
assert.deepEqual(classifyFarmOsDay150C2bBootstrapSourceObservation({
  intended_record_digest: genesis.record_digest,
  observed_record_digest: "UNKNOWN",
}), { classification: "SOURCE_OBSERVATION_UNKNOWN" });

const validStatus = projectFarmOsDay150C2bBootstrapSourceStatus([genesis, quarantine]);
assert.deepEqual(Object.keys(validStatus).sort(), [
  "authority_id", "authority_revision", "bootstrap_manifest_digest", "candidate_generation",
  "candidate_head_digest", "schema_version", "source_projection", "status",
]);
assert.equal(validStatus.authority_id, FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY);
assert.equal(validStatus.status, "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE");
const invalidStatus = projectFarmOsDay150C2bBootstrapSourceStatus([malformedDigest]);
assert.deepEqual(Object.keys(invalidStatus).sort(), [
  "authority_id", "authority_revision", "reason", "schema_version", "status",
]);
assert.equal(invalidStatus.status, "INVALID_SOURCE_CHAIN_CANDIDATE");
for (const prohibitedKey of [
  "bootstrap_manifest_digest", "candidate_generation", "candidate_head_digest",
  "source_projection", "partial_state", "raw_error",
]) assert.equal(prohibitedKey in invalidStatus, false);

const forgedStatusInput = {
  classification: "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE",
  candidate_generation: 9,
  candidate_head_digest: `sha256:${"9".repeat(64)}`,
  source_projection: { discriminator: "SOURCE_PROJECTION_ONLY", raw_error: "credential-value" },
};
const forgedStatus = projectFarmOsDay150C2bBootstrapSourceStatus(forgedStatusInput);
assert.equal(forgedStatus.status, "INVALID_SOURCE_CHAIN_CANDIDATE");
assert.equal(JSON.stringify(forgedStatus).includes("credential-value"), false);
const forgedCas = classifyFarmOsDay150C2bBootstrapSourceCas({
  current_source_chain_candidate: forgedStatusInput,
  candidate_record: quarantine,
  expected_base_generation: 0,
  expected_base_digest: genesis.record_digest,
});
assert.equal(forgedCas.decision, "SOURCE_INVALID_TRANSITION");

const serializedOutputs = JSON.stringify({
  genesisReplay, quarantineReplay, acceptable, exactMatch, casConflict, invalidTransition,
  conditionalQuarantine, validStatus, invalidStatus,
});
for (const prohibitedValue of [
  "raw-generated-uid", "username-value", "credential-value", "token-value", "dsn-value",
  "connection-string-value", "filesystem-path-value", "stderr-value", "stack-value",
  "exception-value", "native-output-value",
]) assert.equal(serializedOutputs.includes(prohibitedValue), false);

const moduleSources = [
  "scripts/hermes/lib/farm_os_day150_phase_c2b_bootstrap_ledger_contract.ts",
  "scripts/hermes/lib/farm_os_day150_phase_c2b_bootstrap_generation_reducer.ts",
  "scripts/hermes/lib/farm_os_day150_phase_c2b_bootstrap_status.ts",
].map((path) => readFileSync(path, "utf8")).join("\n");
for (const forbiddenAuthorityTerm of [
  "AUTHORITATIVE_HEAD", "PUBLISHED_HEAD", "ACTIVE_LEDGER", "GENESIS_PUBLISHED",
  "RUNTIME_AUTHORITY", "TRUSTED_STORAGE", "CURRENT_HEAD", "CANONICAL_ROOT_OBSERVATION",
  "RUNTIME_QUARANTINE_STATE", "IDEMPOTENT_OBSERVATION",
]) assert.equal(moduleSources.includes(forbiddenAuthorityTerm), false);
assert.doesNotMatch(moduleSources, /TrustedProvenance|trusted_provenance/u);
assert.doesNotMatch(moduleSources,
  /from ["'](?:node:fs|node:net|node:http|node:https|node:child_process|docker|pg)["']/u);
assert.doesNotMatch(moduleSources, /Date\.now|Math\.random|process\.env|process\.cwd/u);

assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_REVISION, 1);
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_EVENT_AUTHORITY,
  "farmos.day150-c2b-bootstrap-ledger-event.v1");
assert.equal(FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_PROJECTION_AUTHORITY,
  "farmos.day150-c2b-bootstrap-source-projection.v1");

console.log(JSON.stringify({
  status: "PASS",
  authority: FARM_OS_DAY150_C2B_BOOTSTRAP_LEDGER_RECORD_AUTHORITY,
  manifest_digest: EXPECTED_MANIFEST_DIGEST,
  source_ceiling: "SOURCE_AUTHORITY_CANDIDATE",
  structural_chain: "CANDIDATE_ONLY",
  test_matrix: 34,
  filesystem_write_operations: 0,
  docker_operations: 0,
  network_operations: 0,
  database_operations: 0,
  native_operations: 0,
  runtime_ledger_operations: 0,
  runtime_gen0_operations: 0,
  authorization_operations: 0,
  b2_operations: 0,
}));
