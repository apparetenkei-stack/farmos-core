import assert from "node:assert/strict";
import {
  classifyHermesDailyFarmBriefSourceCoverage,
  isHermesDailyFarmBriefFullRealDataOrigin,
  parseHermesDailyFarmBriefSourceCoverageEvidence,
  type HermesDailyFarmBriefSourceCoverageInput,
} from "./brief_runtime/hermes_daily_farm_brief_source_coverage_contract";

const OBSERVED_AT = "2026-07-16T00:00:00.000Z";

function classify(overrides: Partial<HermesDailyFarmBriefSourceCoverageInput>) {
  const result = classifyHermesDailyFarmBriefSourceCoverage({
    source: "inventory",
    read_state: "success",
    provenance: "farming_app_api",
    expected_provenance: "farming_app_api",
    actual_record_count: 7,
    adapter_record_count: 7,
    fact_count: 0,
    observed_at: OBSERVED_AT,
    latest_business_at: null,
    source_updated_at: null,
    authoritative_freshness: null,
    notes: ["Day121 fixture-only audit evidence."],
    ...overrides,
  });
  assert.ok(result);
  return result;
}

const fields = classify({
  source: "field",
  read_state: "not_connected",
  provenance: "none",
  expected_provenance: "none",
  actual_record_count: 71,
  adapter_record_count: 0,
});
assert.equal(fields.availability, "unavailable");
assert.equal(fields.reason_code, "SOURCE_NOT_CONNECTED");

const cropCycles = classify({
  source: "crop_cycle",
  provenance: "core_memory",
  expected_provenance: "farming_app_api",
  actual_record_count: 40,
  adapter_record_count: 0,
});
assert.equal(cropCycles.availability, "unavailable");
assert.equal(cropCycles.reason_code, "SOURCE_PROVENANCE_MISMATCH");
assert.equal(cropCycles.provenance, "core_memory");

const inventory = classify({});
assert.equal(inventory.actual_record_count, 7);
assert.equal(inventory.adapter_record_count, 7);
assert.equal(inventory.fact_count, 0);
assert.equal(inventory.availability, "available");
assert.notEqual(inventory.availability, "empty");

const workRecords = classify({
  source: "work_log",
  actual_record_count: 541,
  adapter_record_count: 100,
  fact_count: 0,
});
assert.equal(workRecords.availability, "limited");
assert.equal(workRecords.reason_code, "SOURCE_LIMITED");
assert.notEqual(workRecords.availability, "empty");

const empty = classify({ actual_record_count: 0, adapter_record_count: 0 });
assert.equal(empty.availability, "empty");
assert.equal(empty.reason_code, "SOURCE_EMPTY");

const invalidContract = classify({ read_state: "contract_failed", adapter_record_count: 0 });
assert.equal(invalidContract.availability, "unavailable");
assert.equal(invalidContract.reason_code, "SOURCE_UNAVAILABLE_CONTRACT");
assert.notEqual(invalidContract.availability, "empty");

assert.equal(inventory.freshness, "unknown");
assert.equal(inventory.freshness_reason_code, "SOURCE_UNKNOWN_FRESHNESS");
assert.equal(isHermesDailyFarmBriefFullRealDataOrigin("unknown_unverifiable_from_repository"), false);
assert.equal(isHermesDailyFarmBriefFullRealDataOrigin("full_real_data"), true);

assert.ok(parseHermesDailyFarmBriefSourceCoverageEvidence(JSON.stringify(inventory)));
assert.equal(parseHermesDailyFarmBriefSourceCoverageEvidence({ ...inventory, unexpected: true }), null);
assert.equal(parseHermesDailyFarmBriefSourceCoverageEvidence({ ...inventory, fact_count: -1 }), null);
assert.equal(parseHermesDailyFarmBriefSourceCoverageEvidence({ ...inventory, availability: "empty" }), null);
assert.equal(parseHermesDailyFarmBriefSourceCoverageEvidence({ ...inventory, freshness: "fresh", freshness_reason_code: null }), null);

console.log("Hermes Daily Farm Brief source coverage contract tests passed.");
