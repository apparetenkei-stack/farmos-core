import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT,
  FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
  FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
  FARM_OS_DAILY_PROJECTION_KIND,
  parseFarmOsDailyProjectionCandidateBundle,
  type FarmOsDailyProjectionInput,
  type FarmOsDailyProjectionSourceSnapshot,
} from "../../src/lib/hermes/farm_os_daily_operational_projection_contract";
import {
  generateFarmOsDailyOperationalProjection,
} from "../../src/lib/hermes/farm_os_daily_operational_projection_generator";
import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  createFarmOsSnapshotId,
} from "../../src/lib/hermes/farm_os_operational_memory_compiler";

const AUTHORIZED_FARM_SCOPE = "farm_fixture_01";
const BUSINESS_DATE = "2026-08-02";
const GENERATED_AT = "2026-08-03T01:00:00Z";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_C = "c".repeat(64);

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
  const businessDate = input.business_date ?? BUSINESS_DATE;
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

function projectionInput(
  snapshots: FarmOsDailyProjectionSourceSnapshot[],
): FarmOsDailyProjectionInput {
  return {
    contract_version: FARM_OS_DAILY_PROJECTION_INPUT_CONTRACT,
    projection_kind: FARM_OS_DAILY_PROJECTION_KIND,
    farm_scope: AUTHORIZED_FARM_SCOPE,
    business_date: BUSINESS_DATE,
    source_snapshot_schema_version: 1,
    compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
    compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
    freshness_policy: FARM_OS_DAILY_PROJECTION_FRESHNESS_POLICY,
    source_set_status: "current",
    generated_at: GENERATED_AT,
    snapshots,
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

const singleSourceInput = projectionInput([snapshot({
  source_record_id: "work_001",
  source_record_version: 1,
  source_content_hash: HASH_A,
  field_reference: "field_01",
  crop_cycle_reference: "cycle_01",
  work_type_reference: "harvest",
})]);

const multipleSourceInput = projectionInput([
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
    field_reference: "field_deleted",
    crop_cycle_reference: "cycle_deleted",
    work_type_reference: "deleted_work",
    ingestion_sequence: 2,
  }),
  singleSourceInput.snapshots[0]!,
]);

function valid(input: unknown = multipleSourceInput) {
  const result = generateFarmOsDailyOperationalProjection(
    input,
    AUTHORIZED_FARM_SCOPE,
  );
  assert.equal(result.ok, true);
  assert.equal(result.failure, null);
  assert.equal(result.persistence, false);
  assert.equal(result.active_write, false);
  assert.equal(result.automatic_promotion, false);
  assert.equal(result.production_operation, false);
  return result.candidate_bundle;
}

function invalid(name: string, expected: string, input: unknown): void {
  const result = generateFarmOsDailyOperationalProjection(
    input,
    AUTHORIZED_FARM_SCOPE,
  );
  assert.equal(result.ok, false, name);
  if (result.ok) throw new Error(`${name}: unexpectedly valid`);
  assert.equal(result.candidate_bundle, null, name);
  assert.equal(result.failure.result, expected, name);
  assert.equal(result.failure.candidate_bundle, null, name);
  assert.equal(result.failure.failure.active_write, false, name);
  assert.equal(result.failure.failure.persistence, false, name);
  assert.equal(result.failure.failure.production_operation, false, name);
  assert.equal(result.persistence, false, name);
  assert.equal(result.active_write, false, name);
  assert.equal(result.automatic_promotion, false, name);
  assert.equal(result.production_operation, false, name);
}

function environmentChild(): void {
  process.stdout.write(JSON.stringify(valid(multipleSourceInput)));
}

if (process.argv.includes("--environment-child")) {
  environmentChild();
} else {
  const validFixtures: string[] = [];
  const invalidFixtures: string[] = [];
  const passValid = (name: string, assertion: () => void): void => {
    assertion();
    validFixtures.push(name);
  };
  const passInvalid = (name: string, expected: string, input: unknown): void => {
    invalid(name, expected, input);
    invalidFixtures.push(name);
  };

  passValid("single_source", () => {
    const bundle = valid(singleSourceInput);
    assert.equal(bundle.contract_version, FARM_OS_DAILY_PROJECTION_CANDIDATE_CONTRACT);
    assert.equal(bundle.projection.content.source_record_count, 1);
  });
  passValid("multiple_sources", () => {
    const bundle = valid();
    assert.equal(bundle.projection.content.active_record_count, 2);
    assert.equal(bundle.projection.content.tombstone_count, 1);
  });
  passValid("source_input_permutation", () => {
    const permuted = {
      ...multipleSourceInput,
      snapshots: multipleSourceInput.snapshots.toReversed(),
    };
    assert.deepEqual(valid(permuted), valid(multipleSourceInput));
  });
  passValid("object_key_permutation", () => {
    const reverseKeys = (value: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(value).reverse());
    const permuted = reverseKeys(
      multipleSourceInput as unknown as Record<string, unknown>,
    );
    permuted.snapshots = multipleSourceInput.snapshots.map((entry) =>
      reverseKeys(entry as unknown as Record<string, unknown>)
    );
    assert.deepEqual(valid(permuted), valid(multipleSourceInput));
  });
  passValid("late_entry_record", () => {
    const bundle = valid(singleSourceInput);
    assert.equal(bundle.projection.business_date, BUSINESS_DATE);
    assert.equal(bundle.projection.generated_at, GENERATED_AT);
    assert.equal(singleSourceInput.snapshots[0]?.recorded_at, "2026-08-03T00:10:00Z");
  });
  passValid("tombstone_plus_active_source", () => {
    const bundle = valid();
    const tombstone = bundle.lineage.find((entry) =>
      entry.source_record_id === "work_003"
    );
    assert.equal(tombstone?.relation, "excluded_by_tombstone");
    assert.deepEqual(tombstone?.included_fields, []);
    assert.equal(bundle.projection.content.tombstone_count, 1);
    assert.equal(
      bundle.projection.content.field_references.includes("field_deleted"),
      false,
    );
    assert.equal(
      bundle.projection.content.crop_cycle_references.includes("cycle_deleted"),
      false,
    );
    assert.equal(
      bundle.projection.content.work_type_references.includes("deleted_work"),
      false,
    );
  });
  passValid("current_freshness", () => {
    assert.equal(valid().projection.freshness, "current");
  });
  passValid("explicit_timestamp", () => {
    const changed = {
      ...multipleSourceInput,
      generated_at: "2026-08-03T02:00:00Z",
    };
    assert.equal(
      valid(changed).projection.content_hash,
      valid(multipleSourceInput).projection.content_hash,
    );
    assert.notDeepEqual(valid(changed), valid(multipleSourceInput));
  });
  passValid("complete_lineage", () => {
    const bundle = valid();
    assert.equal(bundle.lineage.length, multipleSourceInput.snapshots.length);
    assert.equal(
      new Set(bundle.lineage.map((entry) => entry.snapshot_id)).size,
      multipleSourceInput.snapshots.length,
    );
  });
  passValid("repeated_invocation", () => {
    const outputs = Array.from({ length: 5 }, () => valid());
    for (const output of outputs.slice(1)) assert.deepEqual(output, outputs[0]);
  });
  passValid("clock_independent", () => {
    assert.deepEqual(valid(clone(multipleSourceInput)), valid(multipleSourceInput));
  });
  passValid("host_timezone_and_locale_variation", () => {
    const environments = [
      { TZ: "UTC", LANG: "C" },
      { TZ: "Asia/Tokyo", LANG: "ja_JP.UTF-8" },
      { TZ: "America/Los_Angeles", LANG: "en_US.UTF-8" },
    ];
    const outputs = environments.map((environment) => {
      const child = spawnSync(
        process.execPath,
        ["--import", "tsx", import.meta.filename, "--environment-child"],
        {
          encoding: "utf8",
          env: { ...process.env, ...environment },
        },
      );
      assert.equal(child.status, 0, child.stderr);
      return child.stdout;
    });
    assert.equal(new Set(outputs).size, 1);
  });

  passInvalid("wrong_contract_version", "contract_invalid", {
    ...singleSourceInput,
    contract_version: "farmos.daily_operational_projection.input.v0",
  });
  passInvalid("zero_source", "source_missing", projectionInput([]));
  passInvalid("business_date_mismatch", "business_date_mismatch", {
    ...singleSourceInput,
    business_date: "2026-08-03",
  });
  passInvalid("cross_date_source", "business_date_mismatch", {
    ...singleSourceInput,
    snapshots: [snapshot({
      source_record_id: "cross_date",
      source_record_version: 1,
      source_content_hash: HASH_A,
      business_date: "2026-08-01",
    })],
  });
  for (const [status, expected] of [
    ["stale", "source_stale"],
    ["unavailable", "source_unavailable"],
    ["not_fetched", "source_not_fetched"],
    ["invalid", "source_invalid"],
  ] as const) {
    passInvalid(`freshness_${status}`, expected, {
      ...singleSourceInput,
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
  passInvalid("ambiguous_input", "source_ambiguous", projectionInput([
    ambiguousOne,
    ambiguousTwo,
  ]));
  passInvalid("duplicate_snapshot", "duplicate_source_conflict", {
    ...singleSourceInput,
    snapshots: [
      singleSourceInput.snapshots[0],
      clone(singleSourceInput.snapshots[0]),
    ],
  });
  passInvalid("duplicate_record_version", "duplicate_source_conflict", projectionInput([
    snapshot({
      source_record_id: "work_duplicate_version",
      source_record_version: 7,
      source_content_hash: HASH_A,
    }),
    snapshot({
      source_record_id: "work_duplicate_version",
      source_record_version: 7,
      source_content_hash: HASH_B,
    }),
  ]));
  passInvalid("conflicting_hash", "source_hash_mismatch", {
    ...singleSourceInput,
    snapshots: [{
      ...singleSourceInput.snapshots[0],
      source_content_hash: HASH_B,
    }],
  });
  const tombstone = multipleSourceInput.snapshots[1]!;
  passInvalid("invalid_tombstone", "source_invalid", projectionInput([{
    ...tombstone,
    deleted_at: null,
  }]));
  passInvalid("non_finite_number", "source_invalid", {
    ...singleSourceInput,
    snapshots: [{
      ...singleSourceInput.snapshots[0],
      source_record_version: Number.POSITIVE_INFINITY,
    }],
  });
  const missing = clone(singleSourceInput) as unknown as Record<string, unknown>;
  delete missing.business_date;
  passInvalid("missing_required_value", "contract_invalid", missing);
  passInvalid("null_required_value", "contract_invalid", {
    ...singleSourceInput,
    business_date: null,
  });
  const throwingInput = new Proxy({}, {
    ownKeys: () => {
      throw new Error("unexpected boundary exception");
    },
  });
  passInvalid("unexpected_exception_normalized", "contract_invalid", throwingInput);

  const validOutput = valid();
  const rejectedOutput = (name: string, mutate: (value: any) => void): void => {
    const output = clone(validOutput);
    mutate(output);
    assert.equal(
      parseFarmOsDailyProjectionCandidateBundle(
        output,
        multipleSourceInput,
        AUTHORIZED_FARM_SCOPE,
      ).result,
      "contract_invalid",
      name,
    );
    invalidFixtures.push(name);
  };
  rejectedOutput("tampered_output", (value) => {
    value.projection.content_hash = HASH_C;
  });
  rejectedOutput("active_output", (value) => {
    value.state_events[0].status = "active";
  });
  rejectedOutput("superseded_output", (value) => {
    value.state_events[0].status = "superseded";
  });
  rejectedOutput("multiple_state_events", (value) => {
    value.state_events.push(clone(value.state_events[0]));
  });
  rejectedOutput("promotion_event_output", (value) => {
    value.state_events.push({
      ...clone(value.state_events[0]),
      event_id: `${value.projection.projection_id}:active:2`,
      status: "active",
      sequence: 2,
    });
  });
  rejectedOutput("unknown_output_field", (value) => {
    value.projection.active = false;
  });
  rejectedOutput("output_non_finite_number", (value) => {
    value.projection.content.source_record_count = Number.NaN;
  });
  rejectedOutput("output_null_required_value", (value) => {
    value.projection.business_date = null;
  });
  rejectedOutput("output_missing_required_value", (value) => {
    delete value.lineage[0].source_content_hash;
  });

  passValid("candidate_only_boundary", () => {
    const bundle = valid();
    assert.equal(bundle.state_events.length, 1);
    assert.equal(bundle.state_events[0].status, "candidate");
    assert.equal(bundle.state_events[0].sequence, 1);
    assert.equal(bundle.state_events[0].projection_id, bundle.projection.projection_id);
  });

  passValid("thin_delegation_static_boundary", () => {
    const source = readFileSync(
      new URL(
        "../../src/lib/hermes/farm_os_daily_operational_projection_generator.ts",
        import.meta.url,
      ),
      "utf8",
    );
    assert.equal(
      (source.match(/\bcreateFarmOsDailyProjectionCandidateBundle\s*\(/gu) ?? [])
        .length,
      1,
    );
    assert.equal(
      (source.match(/\bparseFarmOsDailyProjectionCandidateBundle\s*\(/gu) ?? [])
        .length,
      1,
    );
    assert.doesNotMatch(source, /compileFarmOsDailyProjection/u);
    assert.doesNotMatch(source, /createFarmOsSnapshotId/u);
    assert.doesNotMatch(source, /canonicalJson|createHash|sha256/iu);
    assert.doesNotMatch(source, /Date\.now|new Date|Math\.random|randomUUID/u);
    assert.doesNotMatch(source, /localeCompare|\bIntl\b/u);
    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*(?:postgres|repository|persistence|selector|migration|runtime|slack)[^"']*["']/iu,
    );
  });

  const canonical = valid();
  const repeated = valid(clone(multipleSourceInput));
  assert.deepEqual(canonical, repeated);
  assert.equal(canonical.projection.content_hash, repeated.projection.content_hash);
  assert.equal(canonical.lineage.length, multipleSourceInput.snapshots.length);

  console.log(JSON.stringify({
    farm_os_day148_daily_projection_generator: "PASS",
    valid_fixtures: validFixtures.length,
    invalid_fixtures: invalidFixtures.length,
    canonical_engine_direct_call_count: 1,
    compiler_direct_call_count: 0,
    automatic_promotion_count: 0,
    active_write_count: 0,
    persistence_operations: 0,
    database_operations: 0,
    api_calls: 0,
    model_calls: 0,
    production_operations: 0,
  }));
}
