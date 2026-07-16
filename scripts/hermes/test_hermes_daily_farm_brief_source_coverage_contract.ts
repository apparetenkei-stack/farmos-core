import assert from "node:assert/strict";
import {
  classifyHermesDailyFarmBriefSourceCoverage,
  createHermesDailyFarmBriefSourceSelectionCoverage,
  isHermesDailyFarmBriefFullRealDataOrigin,
  parseHermesDailyFarmBriefSourceCoverageEvidence,
  parseHermesDailyFarmBriefSourceSelectionCoverage,
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

const connectedFields = classify({ source: "field", provenance: "farming_app_api", expected_provenance: "farming_app_api", actual_record_count: 71, adapter_record_count: 71, fact_count: 0 });
assert.equal(connectedFields.availability, "available");
assert.equal(connectedFields.reason_code, "SOURCE_AVAILABLE");
assert.equal(connectedFields.provenance, "farming_app_api");

const connectedCropCycles = classify({ source: "crop_cycle", provenance: "farming_app_api", expected_provenance: "farming_app_api", actual_record_count: 40, adapter_record_count: 40, fact_count: 0 });
assert.equal(connectedCropCycles.availability, "available");
assert.equal(connectedCropCycles.reason_code, "SOURCE_AVAILABLE");
assert.notEqual(connectedCropCycles.reason_code, "SOURCE_PROVENANCE_MISMATCH");

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

const inventorySelection = createHermesDailyFarmBriefSourceSelectionCoverage({
  sourceType: "inventory",
  status: "available",
  freshness: "fresh",
  sourceRecordCount: 7,
  inputRecordCount: 7,
  selectedFactCount: 0,
  attentionCount: 0,
});
assert.ok(inventorySelection);
assert.equal(inventorySelection.source_record_count, 7);
assert.equal(inventorySelection.input_record_count, 7);
assert.equal(inventorySelection.selected_fact_count, 0);
assert.equal(inventorySelection.attention_count, 0);
assert.equal(inventorySelection.available_but_no_selected_facts, true);
assert.equal(inventorySelection.available_but_no_attention, true);
assert.notEqual(inventorySelection.status, "empty");

const truncatedSelection = createHermesDailyFarmBriefSourceSelectionCoverage({
  sourceType: "work_log",
  status: "available",
  freshness: "fresh",
  sourceRecordCount: 100,
  inputRecordCount: 10,
  selectedFactCount: 0,
  attentionCount: 0,
});
assert.equal(truncatedSelection?.source_record_count, 100);
assert.equal(truncatedSelection?.input_record_count, 10);
assert.equal(parseHermesDailyFarmBriefSourceSelectionCoverage({ ...inventorySelection, status: "empty" }), null);
assert.equal(parseHermesDailyFarmBriefSourceSelectionCoverage({ ...inventorySelection, input_record_count: 8 }), null);
assert.equal(parseHermesDailyFarmBriefSourceSelectionCoverage({ ...inventorySelection, input_record_count: 0, selected_fact_count: 1, available_but_no_selected_facts: false }), null);
assert.equal(parseHermesDailyFarmBriefSourceSelectionCoverage({ ...inventorySelection, selected_fact_count: 8, available_but_no_selected_facts: false }), null);
assert.equal(parseHermesDailyFarmBriefSourceSelectionCoverage({ ...inventorySelection, attention_count: 1 }), null);
assert.equal(parseHermesDailyFarmBriefSourceSelectionCoverage({ ...inventorySelection, available_but_no_attention: false }), null);

for (const status of ["empty", "unavailable", "invalid"] as const) {
  const zeroCountSelection = createHermesDailyFarmBriefSourceSelectionCoverage({
    sourceType: "hermes_note",
    status,
    freshness: "unknown",
    sourceRecordCount: 0,
    inputRecordCount: 0,
    selectedFactCount: 0,
    attentionCount: 0,
  });
  assert.ok(zeroCountSelection);
  assert.equal(zeroCountSelection.source_record_count, 0);
  assert.equal(zeroCountSelection.input_record_count, 0);
  assert.equal(zeroCountSelection.selected_fact_count, 0);
  assert.equal(zeroCountSelection.attention_count, 0);
}

console.log("Hermes Daily Farm Brief source coverage contract tests passed.");
