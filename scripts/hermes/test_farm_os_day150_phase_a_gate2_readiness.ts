import assert from "node:assert/strict";

import {
  evaluateFarmOsProductionTargetEvidenceGate2Readiness,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CONNECTION_REQUIREMENTS,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_EXTERNAL_FEASIBILITY,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PHASE_OWNERSHIP,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES,
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY,
  type FarmOsProductionTargetEvidenceGate2PrerequisiteEvidence,
} from "../../src/lib/hermes/farm_os_production_target_evidence_gate2_readiness";

const current = evaluateFarmOsProductionTargetEvidenceGate2Readiness(
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE,
);
assert.equal(current.accepted, true);
assert.ok(current.accepted);
assert.equal(current.readiness, "NOT_READY");
assert.equal(current.external_call_count, 0);
assert.equal(current.execution_authorized, false);
assert.equal(new Set(current.blockers).size, current.blockers.length);
assert.deepEqual([...current.blockers], [...current.blockers].sort());
for (const blocker of [
  "BLOCKED_PROVIDER_SOURCE_AUTHORITY_ESTABLISHED",
  "BLOCKED_ACCOUNT_SCOPE_SEMANTICS_ESTABLISHED",
  "BLOCKED_DB_LEAST_PRIVILEGE_FEASIBILITY_ESTABLISHED",
  "BLOCKED_SESSION_PRINCIPAL_VERIFICATION_ESTABLISHED",
] as const) assert.ok(current.blockers.includes(blocker));

const positive = Object.fromEntries(
  FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES.map((prerequisite) => [
    prerequisite,
    prerequisite.endsWith("ESTABLISHED") ? "ESTABLISHED" : "PASS",
  ]),
) as FarmOsProductionTargetEvidenceGate2PrerequisiteEvidence;
const ready = evaluateFarmOsProductionTargetEvidenceGate2Readiness(positive);
assert.deepEqual(ready, {
  accepted: true,
  readiness: "READY",
  blockers: [],
  external_call_count: 0,
  execution_authorized: false,
});

for (const prerequisite of FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PREREQUISITES) {
  const oneMissing = {
    ...positive,
    [prerequisite]: prerequisite.endsWith("ESTABLISHED") ? "NOT_ESTABLISHED" : "FAIL",
  };
  const result = evaluateFarmOsProductionTargetEvidenceGate2Readiness(oneMissing);
  assert.ok(result.accepted, prerequisite);
  assert.equal(result.readiness, "NOT_READY", prerequisite);
  assert.deepEqual(result.blockers, [`BLOCKED_${prerequisite}`], prerequisite);
}

const [firstCurrentBlocker] = current.blockers;
assert.notEqual(firstCurrentBlocker, undefined);
const oneCurrentBlockerRemoved = {
  ...FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE,
  [firstCurrentBlocker!.slice("BLOCKED_".length)]: "ESTABLISHED",
};
const stillNotReady = evaluateFarmOsProductionTargetEvidenceGate2Readiness(
  oneCurrentBlockerRemoved,
);
assert.ok(stillNotReady.accepted);
assert.equal(stillNotReady.readiness, "NOT_READY");

const { SOL_FINAL_GO: _solFinalGo, ...missingKey } = positive;
assert.deepEqual(evaluateFarmOsProductionTargetEvidenceGate2Readiness(missingKey), {
  accepted: false,
  reason: "PREREQUISITE_SCHEMA_INVALID",
  external_call_count: 0,
  execution_authorized: false,
});
assert.deepEqual(evaluateFarmOsProductionTargetEvidenceGate2Readiness({
  ...positive, UNKNOWN_PREREQUISITE: "PASS",
}), {
  accepted: false,
  reason: "PREREQUISITE_SCHEMA_INVALID",
  external_call_count: 0,
  execution_authorized: false,
});
assert.deepEqual(evaluateFarmOsProductionTargetEvidenceGate2Readiness({
  ...positive, SOL_FINAL_GO: "YES",
}), {
  accepted: false,
  reason: "PREREQUISITE_STATUS_INVALID",
  external_call_count: 0,
  execution_authorized: false,
});

for (const nonAuthoritySignal of [
  "GATE_1_COMPLETE",
  "V5_ADOPTED",
  "MANIFEST_RESERVED",
] as const) {
  const result = evaluateFarmOsProductionTargetEvidenceGate2Readiness({
    ...FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE,
  });
  assert.ok(result.accepted, nonAuthoritySignal);
  assert.equal(result.readiness, "NOT_READY", nonAuthoritySignal);
}
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY.execution_authorized,
  false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY.automatic_phase_transition,
  false);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_READINESS_AUTHORITY
  .gate_2_parallel_approval_ledger, "PROHIBITED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_EXTERNAL_FEASIBILITY.classification,
  "EXTERNAL_FEASIBILITY_REQUIRED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CONNECTION_REQUIREMENTS
  .generic_database_url_fallback, 0);
assert.deepEqual(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PHASE_OWNERSHIP.PHASE_B, [
  "PROVIDER_CREDENTIAL_AUTHORITY",
  "DB_CREDENTIAL_AUTHORITY",
  "CONNECTION_AUTHORITY",
  "TLS_TARGET_PRINCIPAL_CAPABILITY_METADATA",
]);
assert.deepEqual(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_PHASE_OWNERSHIP.PHASE_C, [
  "APPROVAL_SOT",
  "TRUSTED_GOVERNANCE_CLOCK",
  "PROPOSAL_APPROVAL_COMMAND_RECEIPT",
  "DURABLE_RESERVATION_FINALIZATION",
  "REPLAY_CONCURRENCY_CRASH_SEMANTICS",
]);
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE
  .PROVIDER_CREDENTIAL_AUTHORITY_ESTABLISHED, "NOT_ESTABLISHED");
assert.equal(FARM_OS_PRODUCTION_TARGET_EVIDENCE_GATE2_CURRENT_EVIDENCE
  .DURABLE_APPROVAL_SOT_ESTABLISHED, "NOT_ESTABLISHED");

console.log("farm_os_day150_phase_a_gate2_readiness: PASS");
