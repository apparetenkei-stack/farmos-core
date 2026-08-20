import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS,
  createFarmOsDay150Gate13FiniteExecutedCaseResult,
  deriveFarmOsDay150Gate13FiniteMatrix,
} from "./lib/farm_os_day150_gate13_finite_acceptance_qualification";

const observed = FARM_OS_DAY150_GATE13_FINITE_REQUIRED_CASE_IDS.map((case_id, index) =>
  createFarmOsDay150Gate13FiniteExecutedCaseResult({ case_id,
    storage_identity_digest: `sha256:${(index + 1).toString(16).padStart(64, "0")}` }));
const complete = deriveFarmOsDay150Gate13FiniteMatrix(observed);
assert.deepEqual(complete.matrix, { D1: "PASS", D2: "PASS", D3: "PASS", D4: "PASS",
  D5: "PASS" });
assert.equal(complete.required_case_count, 18);
assert.equal(complete.executed_case_result_count, 18);
assert.equal(complete.validated_case_result_count, 18);

const missingD5 = deriveFarmOsDay150Gate13FiniteMatrix(observed.slice(0, -1));
assert.deepEqual(missingD5.matrix, { D1: "PASS", D2: "PASS", D3: "PASS", D4: "PASS",
  D5: "FAIL" });
const duplicate = deriveFarmOsDay150Gate13FiniteMatrix([...observed, observed[0]!]);
assert.equal(Object.values(duplicate.matrix).every((result) => result === "FAIL"), true);
const synthetic = deriveFarmOsDay150Gate13FiniteMatrix([...observed.slice(0, -1), {
  case_id: "D5_HISTORY_PRESERVING_AUTHORITATIVE_READBACK", accepted_result: "PASS",
}]);
assert.equal(synthetic.matrix.D5, "FAIL");
assert.equal(synthetic.validated_case_result_count, 17);
const tampered = deriveFarmOsDay150Gate13FiniteMatrix(observed.map((entry, index) => index === 0
  ? { ...entry, result_digest: `sha256:${"f".repeat(64)}` } : entry));
assert.equal(tampered.matrix.D1, "FAIL");

process.stdout.write(`${JSON.stringify({ status: "PASS", required: 18, executed: 18,
  validated: 18, missing_required_fails: true, duplicate_fails: true,
  synthetic_unexecuted_pass_fails: true, tampered_digest_fails: true })}\n`);
