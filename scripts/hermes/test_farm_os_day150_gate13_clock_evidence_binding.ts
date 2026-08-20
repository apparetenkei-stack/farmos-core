import assert from "node:assert/strict";

import {
  computeFarmOsProductionTargetExecutionClockEvidenceDigest,
  computeFarmOsProductionTargetExecutionClockEvidenceId,
} from "../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import {
  parseFarmOsDay150Gate13PersistedClockEvidenceReadback,
} from "./lib/farm_os_day150_gate13_persisted_clock_evidence";

const material = Object.freeze({
  schema_version: "farmos.production-target-execution-clock-evidence.v1" as const,
  clock_authority_id: "farmos.production-target-execution-trusted-clock.v1" as const,
  clock_authority_revision: 1,
  provenance_class: "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK" as const,
  observed_at: "2026-08-11T00:04:00.000Z",
  observed_lower_bound: "2026-08-11T00:00:00.000Z",
  recorded_at: "2026-08-11T00:04:00.000Z",
  status: "AVAILABLE" as const,
  server_owned_record: true as const,
});
const evidenceDigest = computeFarmOsProductionTargetExecutionClockEvidenceDigest(material);
const evidence = Object.freeze({ ...material, evidence_digest: evidenceDigest,
  evidence_id: computeFarmOsProductionTargetExecutionClockEvidenceId(evidenceDigest) });
const row = Object.freeze({ evidence, persisted_observed_at: evidence.observed_at,
  persisted_observed_lower_bound: evidence.observed_lower_bound });
const parse = (value: unknown, requiredLowerBound: string = evidence.observed_lower_bound) =>
  parseFarmOsDay150Gate13PersistedClockEvidenceReadback({ value,
    expected_evidence_id: evidence.evidence_id, expected_evidence_digest: evidence.evidence_digest,
    required_lower_bound: requiredLowerBound });

assert.equal(parse(row)?.persisted_observed_lower_bound, evidence.observed_lower_bound);
assert.equal(parse({ ...row, persisted_observed_lower_bound: evidence.observed_at }), null);
assert.equal(parse({ evidence, persisted_observed_at: evidence.observed_at }), null);
assert.equal(parse({ ...row, persisted_observed_lower_bound: "2026-08-11T00:00:00Z" }), null);
assert.equal(parse(row, "2026-08-11T00:00:00.001Z"), null);
assert.equal(parse({ ...row, evidence: { ...evidence,
  observed_lower_bound: "2026-08-11T00:04:01.000Z" } }), null);
assert.equal(parse({ ...row, evidence: { ...evidence,
  clock_authority_id: "farmos.untrusted-clock.v1" } }), null);

process.stdout.write(`${JSON.stringify({ status: "PASS",
  observed_at_not_accepted_as_lower_bound: true, correct_lower_bound: "PASS",
  missing_lower_bound: "REJECTED", malformed_lower_bound: "REJECTED",
  regressed_lower_bound: "REJECTED", persisted_readback_binding: "PASS",
  principal_source_binding: "PASS" })}\n`);
