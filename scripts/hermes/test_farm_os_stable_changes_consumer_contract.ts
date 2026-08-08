import assert from "node:assert/strict";

import {
  compareFarmOsStableChangeOrdering,
  farmOsStableChangesTimestampMicros,
  parseFarmOsStableChange,
  parseFarmOsStableChangesPage,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  classifyFarmOsStableChangesSemanticDedupe,
  createFarmOsStableChangesScopeId,
  parseFarmOsStableChangesScope,
  validateFarmOsStableChangesPageForScope,
} from "../../src/lib/hermes/farm_os_stable_changes_persistence";
import {
  STABLE_CHANGES_SCOPE,
  stableChange,
  stablePage,
  stableTombstone,
} from "./lib/farm_os_stable_changes_consumer_fixture";

const first = stableChange({ change_sequence: "1" });
const second = stableChange({
  change_sequence: "2",
  source_record_id: "work_fixture_02",
  source_content_hash: "b".repeat(64),
  source_updated_at: "2026-08-01T09:00:00.000002+09:00",
});

assert.equal(parseFarmOsStableChange(first).valid, true);
assert.equal(parseFarmOsStableChangesPage(stablePage({
  changes: [first, second],
})).valid, true);
assert.equal(parseFarmOsStableChangesPage({
  ...stablePage({ changes: [first], has_more: true }),
  next_cursor: 123,
}).valid, false);
assert.equal(parseFarmOsStableChangesPage({
  ...stablePage({ changes: [first] }),
  contract_version: 123,
}).valid, false);
assert.equal(parseFarmOsStableChangesPage({
  ...stablePage({ changes: [first] }),
  result: 123,
}).valid, false);
assert.equal(parseFarmOsStableChange({ ...first, unexpected: true }).valid, false);
const missingSequence = { ...first } as Record<string, unknown>;
delete missingSequence.change_sequence;
assert.equal(parseFarmOsStableChange(missingSequence).valid, false);
for (const sequence of ["0", "01", "-1", "1.0", "9223372036854775808", 1]) {
  assert.equal(parseFarmOsStableChange({
    ...first,
    change_sequence: sequence,
  }).valid, false);
}
for (const [key, value] of [
  ["source_record_id", 123],
  ["source_content_hash", 123],
  ["field_reference", 123],
  ["work_type_reference", 123],
  ["recorded_at", 123],
  ["source_updated_at", 123],
  ["operation", 123],
  ["safe_payload", []],
  ["safe_payload", "x"],
] as const) {
  assert.equal(parseFarmOsStableChange({
    ...first,
    [key]: value,
  }).valid, false);
}
assert.equal(parseFarmOsStableChange({
  ...first,
  source_content_hash: "A".repeat(64),
}).valid, false);
assert.equal(parseFarmOsStableChange({
  ...first,
  source_content_hash: null,
}).valid, false);
assert.equal(parseFarmOsStableChange({
  ...first,
  crop_cycle_reference: "crop_cycle_forbidden",
}).valid, false);
assert.equal(parseFarmOsStableChange({
  ...first,
  safe_payload: { forbidden: true },
}).valid, false);
assert.equal(parseFarmOsStableChange({
  ...first,
  source_updated_at: "2026-08-01T09:00:00.1234567+09:00",
}).valid, false);
assert.equal(parseFarmOsStableChange({
  ...stableTombstone({ change_sequence: "3" }),
  deleted_at: null,
}).valid, false);
assert.equal(parseFarmOsStableChangesPage(stablePage({
  changes: [second, first],
})).failure_code, "ordering_regression");

const sameTimestampNext = stableChange({
  ...first,
  change_sequence: "2",
});
assert.equal(compareFarmOsStableChangeOrdering(first, sameTimestampNext), -1);
assert.equal(
  farmOsStableChangesTimestampMicros("2026-08-01T00:00:00.000001Z"),
  farmOsStableChangesTimestampMicros("2026-08-01T09:00:00.000001+09:00"),
);
assert.notEqual(
  farmOsStableChangesTimestampMicros("2026-08-01T00:00:00.000001Z"),
  farmOsStableChangesTimestampMicros("2026-08-01T00:00:00.000002Z"),
);

const scopeId = createFarmOsStableChangesScopeId(STABLE_CHANGES_SCOPE);
assert.match(scopeId, /^scs1_[0-9a-f]{64}$/u);
assert.equal(parseFarmOsStableChangesScope({
  ...STABLE_CHANGES_SCOPE,
  to_business_date: "2026-09-01",
}), null);
assert.equal(parseFarmOsStableChangesScope({
  ...STABLE_CHANGES_SCOPE,
  page_size: 101,
}), null);
assert.equal(validateFarmOsStableChangesPageForScope({
  scope: STABLE_CHANGES_SCOPE,
  page: stablePage({ changes: [first, second] }),
  lower_bound: null,
}).changes.length, 2);

const current = stableChange({ change_sequence: "10" });
const immediateDuplicate = stableChange({
  ...current,
  change_sequence: "11",
  source_updated_at: "2026-08-01T09:01:00.000001+09:00",
});
assert.deepEqual(classifyFarmOsStableChangesSemanticDedupe({
  change: immediateDuplicate,
  history: [{ change: current, disposition: "accepted" }],
}), { result: "semantic_duplicate", duplicate_target_sequence: "10" });

const changed = stableChange({
  ...current,
  change_sequence: "11",
  source_record_version: 2,
  source_content_hash: "b".repeat(64),
  source_updated_at: "2026-08-01T09:01:00.000001+09:00",
});
const returned = stableChange({
  ...current,
  change_sequence: "12",
  source_record_version: 3,
  source_updated_at: "2026-08-01T09:02:00.000001+09:00",
});
assert.equal(classifyFarmOsStableChangesSemanticDedupe({
  change: returned,
  history: [
    { change: current, disposition: "accepted" },
    { change: changed, disposition: "accepted" },
  ],
}).result, "accepted");
const nonMonotonicX = stableChange({ change_sequence: "100" });
const nonMonotonicY = stableChange({
  ...nonMonotonicX,
  change_sequence: "50",
  source_record_version: 2,
  source_content_hash: "b".repeat(64),
  source_updated_at: "2026-08-01T09:01:00.000001+09:00",
});
const nonMonotonicReturn = stableChange({
  ...nonMonotonicX,
  change_sequence: "51",
  source_updated_at: "2026-08-01T09:02:00.000001+09:00",
});
assert.equal(classifyFarmOsStableChangesSemanticDedupe({
  change: nonMonotonicReturn,
  history: [
    { change: nonMonotonicX, disposition: "accepted" },
    { change: nonMonotonicY, disposition: "accepted" },
  ],
}).result, "accepted");
const nonMonotonicDuplicate = stableChange({
  ...nonMonotonicX,
  change_sequence: "50",
  source_updated_at: "2026-08-01T09:01:00.000001+09:00",
});
assert.deepEqual(classifyFarmOsStableChangesSemanticDedupe({
  change: nonMonotonicDuplicate,
  history: [{ change: nonMonotonicX, disposition: "accepted" }],
}), { result: "semantic_duplicate", duplicate_target_sequence: "100" });
assert.equal(classifyFarmOsStableChangesSemanticDedupe({
  change: stableChange({
    ...current,
    change_sequence: "13",
    source_content_hash: "c".repeat(64),
  }),
  history: [{ change: current, disposition: "accepted" }],
}).result, "conflict");
assert.equal(classifyFarmOsStableChangesSemanticDedupe({
  change: stableTombstone({
    ...current,
    change_sequence: "14",
    source_record_version: 2,
    source_updated_at: "2026-08-01T10:00:00.000001+09:00",
  }),
  history: [{ change: current, disposition: "accepted" }],
}).result, "accepted");

console.log("farm_os_stable_changes_consumer_contract: PASS");
