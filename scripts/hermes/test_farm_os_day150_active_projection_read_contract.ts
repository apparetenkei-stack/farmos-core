import assert from "node:assert/strict";

import {
  createFarmOsActiveProjectionReadResponse,
  FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION,
  FARM_OS_ACTIVE_PROJECTION_READ_STATUSES,
  parseFarmOsActiveProjectionReadResponse,
} from "../../src/lib/hermes/farm_os_active_projection_read_contract";
import type {
  FarmOsDailyProjectionContent,
} from "../../src/lib/hermes/farm_os_operational_memory_compiler";

const content: FarmOsDailyProjectionContent = {
  business_date: "2026-08-06",
  source_record_count: 2,
  active_record_count: 1,
  tombstone_count: 1,
  field_references: ["field_1"],
  crop_cycle_references: ["cycle:1"],
  work_type_references: ["work.type-1"],
  verification_status: "stable_change_contract_validated",
  missing_data_status: "complete_for_v1",
};
const generatedAt = "2026-08-06T12:34:56.789+09:00";

assert.equal(
  FARM_OS_ACTIVE_PROJECTION_READ_SCHEMA_VERSION,
  "farmos.daily_operational_projection.active_read_response.v1",
);
assert.deepEqual(FARM_OS_ACTIVE_PROJECTION_READ_STATUSES, [
  "current", "stale", "missing", "failed",
]);

const valid = [
  createFarmOsActiveProjectionReadResponse({
    status: "current", payload: content, generated_at: generatedAt,
  }),
  createFarmOsActiveProjectionReadResponse({
    status: "stale", payload: content, generated_at: generatedAt,
  }),
  createFarmOsActiveProjectionReadResponse({
    status: "missing", payload: null, generated_at: null,
  }),
  createFarmOsActiveProjectionReadResponse({
    status: "failed", payload: null, generated_at: null,
  }),
];
for (const response of valid) {
  assert.deepEqual(parseFarmOsActiveProjectionReadResponse(response), response);
  assert.deepEqual(Object.keys(response), [
    "schema_version", "status", "payload", "generated_at",
  ]);
}

const current = valid[0]!;
function rejected(mutator: (value: Record<string, unknown>) => void): void {
  const value = structuredClone(current) as unknown as Record<string, unknown>;
  mutator(value);
  assert.equal(parseFarmOsActiveProjectionReadResponse(value), null);
}
function payloadMutation(mutator: (value: Record<string, unknown>) => void): void {
  rejected((value) => mutator(value.payload as Record<string, unknown>));
}

rejected((value) => value.schema_version = "unknown.v1");
rejected((value) => value.extra = true);
payloadMutation((value) => value.extra = true);
rejected((value) => value.payload = null);
rejected((value) => value.generated_at = null);
rejected((value) => {
  value.status = "stale";
  value.payload = null;
});
assert.equal(parseFarmOsActiveProjectionReadResponse({
  ...valid[2], payload: content,
}), null);
assert.equal(parseFarmOsActiveProjectionReadResponse({
  ...valid[3], generated_at: generatedAt,
}), null);
rejected((value) => value.generated_at = "2026-08-06 12:34:56Z");
payloadMutation((value) => value.business_date = "2026-02-30");
payloadMutation((value) => value.source_record_count = -1);
payloadMutation((value) => value.source_record_count = 101);
payloadMutation((value) => value.source_record_count = 1.5);
payloadMutation((value) => value.source_record_count = 3);
payloadMutation((value) => value.field_references = ["field_1", "field_1"]);
payloadMutation((value) => value.field_references = Array.from(
  { length: 101 }, (_, index) => `field_${index}`,
));
payloadMutation((value) => value.field_references = ["invalid reference"]);
payloadMutation((value) => value.verification_status = "unverified");
payloadMutation((value) => value.missing_data_status = "unknown");

console.log("farm_os_day150_active_projection_read_contract: PASS");
