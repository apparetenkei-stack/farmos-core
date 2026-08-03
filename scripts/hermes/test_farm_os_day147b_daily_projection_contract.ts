import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import {
  FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT,
  FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
  FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
  FARM_OS_DAILY_PROJECTION_KIND,
  createFarmOsDailyProjectionCandidateBundle,
  parseFarmOsDailyProjectionCandidateBundle,
  parseFarmOsDailyProjectionInput,
  type FarmOsDailyProjectionInput,
  type FarmOsDailyProjectionSourceSnapshot,
} from "../../src/lib/hermes/farm_os_daily_operational_projection_contract";
import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  createFarmOsSnapshotId,
} from "../../src/lib/hermes/farm_os_operational_memory_compiler";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);
const AUTHORIZED_FARM_SCOPE = "farm_fixture_01";

function snapshot(input: {
  source_record_id: string;
  source_record_version: number | null;
  source_content_hash: string | null;
  operation?: "upsert" | "tombstone";
  business_date?: string;
  recorded_at?: string | null;
  source_updated_at?: string;
  observed_at?: string;
  deleted_at?: string | null;
  field_reference?: string | null;
  crop_cycle_reference?: string | null;
  work_type_reference?: string | null;
  ingestion_sequence?: number;
}): FarmOsDailyProjectionSourceSnapshot {
  const operation = input.operation ?? "upsert";
  const businessDate = input.business_date ?? "2026-08-02";
  const sourceUpdatedAt = input.source_updated_at ?? "2026-08-03T00:15:00Z";
  return {
    snapshot_id: createFarmOsSnapshotId({
      source_record_id: input.source_record_id,
      source_record_version: input.source_record_version,
      source_content_hash: input.source_content_hash,
      operation,
      business_date: businessDate,
    }),
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    source_system: "farming_app",
    source_type: "work_record",
    source_record_id: input.source_record_id,
    source_record_version: input.source_record_version,
    source_content_hash: input.source_content_hash,
    operation,
    business_date: businessDate,
    recorded_at: input.recorded_at === undefined
      ? operation === "upsert" ? "2026-08-03T00:10:00Z" : null
      : input.recorded_at,
    source_updated_at: sourceUpdatedAt,
    deleted_at: input.deleted_at === undefined
      ? operation === "tombstone" ? sourceUpdatedAt : null
      : input.deleted_at,
    field_reference: input.field_reference ?? null,
    crop_cycle_reference: input.crop_cycle_reference ?? null,
    work_type_reference: input.work_type_reference ?? null,
    safe_payload: {},
    observed_at: input.observed_at ?? "2026-08-03T00:20:00Z",
    ingestion_sequence: input.ingestion_sequence ?? 1,
    initial_state: operation === "tombstone" ? "tombstoned" : "active",
    supersedes_snapshot_id: null,
    rejection_code: null,
    schema_version: 1,
  };
}

function input(
  snapshots: FarmOsDailyProjectionSourceSnapshot[],
): FarmOsDailyProjectionInput {
  return {
    contract_version: FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
    projection_kind: FARM_OS_DAILY_PROJECTION_KIND,
    farm_scope: "farm_fixture_01",
    business_date: "2026-08-02",
    source_snapshot_schema_version: 1,
    compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
    compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
    freshness_policy: FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
    source_set_status: "current",
    generated_at: "2026-08-03T01:00:00Z",
    snapshots,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function resultCode(value: unknown): string {
  return createFarmOsDailyProjectionCandidateBundle(
    value,
    AUTHORIZED_FARM_SCOPE,
  ).result;
}

function validBundle(value: unknown) {
  const result = createFarmOsDailyProjectionCandidateBundle(
    value,
    AUTHORIZED_FARM_SCOPE,
  );
  assert.equal(result.result, "valid_candidate_bundle");
  return result.candidate_bundle;
}

const minimalInput = input([
  snapshot({
    source_record_id: "work_001",
    source_record_version: 1,
    source_content_hash: HASH_A,
    field_reference: "field_01",
    crop_cycle_reference: "cycle_01",
    work_type_reference: "harvest",
  }),
]);

function timezoneChild(): void {
  process.stdout.write(JSON.stringify(validBundle(minimalInput)));
}

if (process.argv.includes("--timezone-child")) {
  timezoneChild();
} else {
  const validCases: string[] = [];
  const invalidCases: string[] = [];
  const passValid = (name: string, fn: () => void) => {
    fn();
    validCases.push(name);
  };
  const passInvalid = (
    name: string,
    expected: string,
    candidate: unknown,
  ) => {
    assert.equal(resultCode(candidate), expected, name);
    invalidCases.push(name);
  };

  passValid("minimal_one_source", () => {
    const bundle = validBundle(minimalInput);
    assert.equal(bundle.projection.content.source_record_count, 1);
    assert.equal(bundle.state_events[0].status, "candidate");
    assert.equal(bundle.contract_version, FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT);
    assert.equal(
      parseFarmOsDailyProjectionCandidateBundle(
        bundle,
        minimalInput,
        AUTHORIZED_FARM_SCOPE,
      ).result,
      "valid_candidate_bundle",
    );
  });

  const multiInput = input([
    snapshot({
      source_record_id: "work_002",
      source_record_version: 2,
      source_content_hash: HASH_B,
      field_reference: "field_02",
      crop_cycle_reference: "cycle_02",
      work_type_reference: "planting",
      ingestion_sequence: 99,
    }),
    snapshot({
      source_record_id: "work_003",
      source_record_version: 1,
      source_content_hash: HASH_C,
      operation: "tombstone",
      ingestion_sequence: 2,
    }),
    minimalInput.snapshots[0]!,
  ]);
  passValid("multiple_sources", () => {
    const bundle = validBundle(multiInput);
    assert.equal(bundle.projection.content.active_record_count, 2);
    assert.equal(bundle.projection.content.tombstone_count, 1);
  });
  passValid("late_entry_business_date_owned_by_source", () => {
    const bundle = validBundle(minimalInput);
    assert.equal(bundle.projection.business_date, "2026-08-02");
    assert.equal(bundle.projection.generated_at, "2026-08-03T01:00:00Z");
  });
  passValid("tombstone_lineage_retained", () => {
    const bundle = validBundle(multiInput);
    const tombstone = bundle.lineage.find((entry) =>
      entry.source_record_id === "work_003"
    );
    assert.equal(tombstone?.relation, "excluded_by_tombstone");
    assert.deepEqual(tombstone?.included_fields, []);
  });
  passValid("same_input_same_output", () => {
    assert.deepEqual(validBundle(multiInput), validBundle(clone(multiInput)));
  });
  passValid("input_permutation_stable", () => {
    const reversed = { ...multiInput, snapshots: multiInput.snapshots.toReversed() };
    assert.equal(
      validBundle(multiInput).projection.content_hash,
      validBundle(reversed).projection.content_hash,
    );
    assert.deepEqual(validBundle(multiInput), validBundle(reversed));
  });
  passValid("object_key_order_stable", () => {
    const reverseKeys = (value: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(value).reverse());
    const reordered = reverseKeys(multiInput as unknown as Record<string, unknown>);
    reordered.snapshots = multiInput.snapshots.map((value) =>
      reverseKeys(value as unknown as Record<string, unknown>)
    );
    assert.deepEqual(validBundle(reordered), validBundle(multiInput));
  });
  passValid("host_timezone_independent", () => {
    const outputs = ["UTC", "Asia/Tokyo", "America/Los_Angeles"].map((timezone) => {
      const child = spawnSync(
        process.execPath,
        ["--import", "tsx", import.meta.filename, "--timezone-child"],
        { encoding: "utf8", env: { ...process.env, TZ: timezone } },
      );
      assert.equal(child.status, 0, child.stderr);
      return child.stdout;
    });
    assert.equal(new Set(outputs).size, 1);
  });
  passValid("explicit_timestamp_deterministic", () => {
    const changed = { ...multiInput, generated_at: "2026-08-03T02:00:00Z" };
    assert.equal(
      validBundle(changed).projection.content_hash,
      validBundle(multiInput).projection.content_hash,
    );
    assert.notDeepEqual(validBundle(changed), validBundle(multiInput));
  });
  passValid("lineage_complete", () => {
    const bundle = validBundle(multiInput);
    assert.equal(bundle.lineage.length, multiInput.snapshots.length);
    assert.equal(new Set(bundle.lineage.map((entry) => entry.snapshot_id)).size, 3);
  });

  passInvalid("source_zero", "source_missing", input([]));
  passInvalid("unauthorized_scope_not_representable", "contract_invalid", {
    ...minimalInput,
    farm_scope: "farm_unbound",
  });
  const missingDate = clone(minimalInput) as unknown as Record<string, unknown>;
  delete missingDate.business_date;
  passInvalid("business_date_missing", "contract_invalid", missingDate);
  passInvalid("business_date_mismatch", "business_date_mismatch", {
    ...minimalInput,
    business_date: "2026-08-03",
  });
  passInvalid("malformed_timestamp", "source_invalid", {
    ...minimalInput,
    snapshots: [{ ...minimalInput.snapshots[0], observed_at: "2026-08-03 00:20" }],
  });
  passInvalid("duplicate_snapshot_id", "duplicate_source_conflict", {
    ...minimalInput,
    snapshots: [minimalInput.snapshots[0], clone(minimalInput.snapshots[0])],
  });
  const versionConflictOne = snapshot({
    source_record_id: "work_conflict",
    source_record_version: 7,
    source_content_hash: HASH_A,
  });
  const versionConflictTwo = snapshot({
    source_record_id: "work_conflict",
    source_record_version: 7,
    source_content_hash: HASH_B,
  });
  passInvalid("record_version_hash_conflict", "duplicate_source_conflict", input([
    versionConflictOne,
    versionConflictTwo,
  ]));
  passInvalid("source_content_hash_mismatch", "source_hash_mismatch", {
    ...minimalInput,
    snapshots: [{ ...minimalInput.snapshots[0], source_content_hash: HASH_B }],
  });
  passInvalid("unknown_source_type", "source_invalid", {
    ...minimalInput,
    snapshots: [{ ...minimalInput.snapshots[0], source_type: "inventory" }],
  });
  passInvalid("unsupported_envelope_schema", "unsupported_source_schema", {
    ...minimalInput,
    source_snapshot_schema_version: 2,
  });
  for (const [status, expected] of [
    ["stale", "source_stale"],
    ["not_fetched", "source_not_fetched"],
    ["unavailable", "source_unavailable"],
  ] as const) {
    passInvalid(`freshness_${status}`, expected, {
      ...minimalInput,
      source_set_status: status,
    });
  }
  const ambiguousOne = snapshot({
    source_record_id: "work_ambiguous",
    source_record_version: null,
    source_content_hash: HASH_A,
  });
  const ambiguousTwo = snapshot({
    source_record_id: "work_ambiguous",
    source_record_version: null,
    source_content_hash: HASH_B,
  });
  passInvalid("ambiguous_source", "source_ambiguous", input([
    ambiguousOne,
    ambiguousTwo,
  ]));
  passInvalid("tombstone_without_deleted_at", "source_invalid", input([
    { ...multiInput.snapshots[1]!, deleted_at: null },
  ]));
  passInvalid("non_finite_number", "source_invalid", {
    ...minimalInput,
    snapshots: [{ ...minimalInput.snapshots[0], source_record_version: Infinity }],
  });
  passInvalid("undefined_is_not_null", "source_invalid", {
    ...minimalInput,
    snapshots: [{ ...minimalInput.snapshots[0], deleted_at: undefined }],
  });

  const validOutput = validBundle(multiInput);
  const outputFailure = (name: string, mutate: (value: any) => void) => {
    const candidate = clone(validOutput);
    mutate(candidate);
    assert.equal(
      parseFarmOsDailyProjectionCandidateBundle(
        candidate,
        multiInput,
        AUTHORIZED_FARM_SCOPE,
      ).result,
      "contract_invalid",
      name,
    );
    invalidCases.push(name);
  };
  outputFailure("candidate_state_missing", (value) => {
    value.state_events = [];
  });
  outputFailure("active_state_rejected", (value) => {
    value.state_events[0].status = "active";
  });
  outputFailure("multiple_initial_state_events", (value) => {
    value.state_events.push(clone(value.state_events[0]));
  });
  outputFailure("candidate_to_active_transition", (value) => {
    value.state_events.push({
      ...value.state_events[0],
      event_id: `${value.projection.projection_id}:active:2`,
      status: "active",
      sequence: 2,
    });
  });
  outputFailure("supersede_event", (value) => {
    value.state_events[0].status = "superseded";
  });
  outputFailure("existing_active_mutation_marker", (value) => {
    value.existing_active_mutated = true;
  });
  outputFailure("unknown_output_field", (value) => {
    value.projection.active = false;
  });
  outputFailure("lineage_missing", (value) => {
    value.lineage.pop();
  });
  outputFailure("duplicate_lineage", (value) => {
    value.lineage.push(clone(value.lineage[0]));
  });
  outputFailure("hash_tampering", (value) => {
    value.projection.content_hash = HASH_C;
  });
  outputFailure("output_non_finite_number", (value) => {
    value.projection.content.source_record_count = Number.NaN;
  });
  outputFailure("output_missing_not_null", (value) => {
    delete value.lineage[0].source_content_hash;
  });

  assert.equal(
    parseFarmOsDailyProjectionInput(minimalInput, AUTHORIZED_FARM_SCOPE).valid,
    true,
  );
  assert.equal(validOutput.projection.freshness, "current");
  assert.equal(validOutput.projection.llm_used, false);
  assert.equal(validOutput.state_events.length, 1);
  assert.equal(validOutput.state_events[0].sequence, 1);

  console.log(JSON.stringify({
    farm_os_day147b_daily_projection_contract: "PASS",
    valid_fixtures: validCases.length,
    invalid_fixtures: invalidCases.length,
    automatic_promotion_count: 0,
    active_write_count: 0,
    database_operations: 0,
    production_operations: 0,
    api_calls: 0,
    model_calls: 0,
  }));
}
