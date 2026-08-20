import assert from "node:assert/strict";

import {
  createFarmOsDay150PrefixReferenceQualificationExecutionCapability,
  executeFarmOsDay150PrefixReferenceCatalogOnce,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const successCapability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
  mode: "SUCCESS",
});
assert.ok(successCapability);
const success = await executeFarmOsDay150PrefixReferenceCatalogOnce({
  qualification_capability: successCapability,
});
assert.equal(success.status, "QUALIFICATION_PASS");
const actualRealAdapterEffects = success.adapter_observed_effect_trace.map((entry) => entry.step);
assert.ok(actualRealAdapterEffects.length > 30);

const occurrenceByBoundary = new Map<string, number>();
let settlementCases = 0;
const uncertainProcessMutations = new Set([
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION",
  "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP", "CONTAINER_CLEANUP",
  "VOLUME_CLEANUP", "NETWORK_CLEANUP",
  ...Array.from({ length: 5 }, (_, index) => `MIGRATION_${index + 1}_EXECUTION`),
]);
const uncertainDurableReadbacks = new Set([
  "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK", "FINAL_RECEIPT_REOPEN_READBACK",
  ...Array.from({ length: 5 }, (_, index) => `CANDIDATE_${index + 1}_REOPEN_READBACK`),
]);
for (const boundary of actualRealAdapterEffects) {
  const primitiveOrdinalWithinBoundary = (occurrenceByBoundary.get(boundary) ?? 0) + 1;
  occurrenceByBoundary.set(boundary, primitiveOrdinalWithinBoundary);
  const capability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
    mode: "HANG", boundary, primitive_ordinal_within_boundary: primitiveOrdinalWithinBoundary,
  });
  assert.ok(capability, boundary);
  const started = Date.now();
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: capability,
  });
  assert.equal(result.status, "OUTCOME_UNKNOWN", boundary);
  assert.equal(result.failed_boundary, boundary, boundary);
  assert.equal(result.automatic_retry_count, 0, boundary);
  assert.equal(result.close_state, boundary === "TERMINAL_CLOSE"
    ? "AMBIGUOUS_OUTCOME" : "SUCCESS", boundary);
  assert.ok(Date.now() - started < 2_000, `${boundary}: bounded deadline`);
  settlementCases += 1;
  for (const mode of ["FAILURE", "THROW", "AMBIGUOUS", "OUTPUT_LIMIT_EXCEEDED",
    "DEADLINE_EXCEEDED"] as const) {
    const settlementCapability = createFarmOsDay150PrefixReferenceQualificationExecutionCapability({
      mode, boundary, primitive_ordinal_within_boundary: primitiveOrdinalWithinBoundary,
    });
    assert.ok(settlementCapability, `${boundary}:${primitiveOrdinalWithinBoundary}:${mode}`);
    const settlement = await executeFarmOsDay150PrefixReferenceCatalogOnce({
      qualification_capability: settlementCapability,
    });
    const successTerminalSettlementUnknown = boundary === "FINAL_RECEIPT_REOPEN_READBACK" ||
      boundary === "TERMINAL_CLOSE";
    assert.equal(settlement.status, mode === "AMBIGUOUS" || mode === "DEADLINE_EXCEEDED" ||
      successTerminalSettlementUnknown ||
      (mode === "OUTPUT_LIMIT_EXCEEDED" && (uncertainProcessMutations.has(boundary) ||
        uncertainDurableReadbacks.has(boundary)))
      ? "OUTCOME_UNKNOWN" : "REJECTED",
      `${boundary}:${primitiveOrdinalWithinBoundary}:${mode}:${settlement.failure_code}`);
    assert.equal(settlement.failed_boundary, boundary);
    assert.equal(settlement.automatic_retry_count, 0);
    settlementCases += 1;
  }
}

console.log(JSON.stringify({ status: "PASS", real_adapter_never_settling_cases:
  actualRealAdapterEffects.length, bounded_terminal_results: actualRealAdapterEffects.length,
  primitive_settlement_cases: settlementCases, automatic_retries: 0, external_operations: 0 }));
