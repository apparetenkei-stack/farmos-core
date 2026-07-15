import assert from "node:assert/strict";

import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { createHermesDailyFarmBriefProductionReadRepository } from "../../src/lib/hermes/hermes_daily_farm_brief_persisted_read_repository";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import {
  HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  parseHermesDailyFarmBriefPersistedRecord,
  type HermesDailyFarmBriefPersistedGenerationStateRecord,
  type HermesDailyFarmBriefPersistedProjectableRecord,
} from "./brief_runtime/hermes_daily_farm_brief_persisted_record_contract";
import {
  HermesDailyFarmBriefFixtureReadRepository,
  readHermesDailyFarmBriefPersistedLatestSource,
} from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { parseHermesDailyFarmBriefLatestApiResponse, parseHermesDailyFarmBriefLatestReadSource } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";

const NOW = "2026-07-15T02:00:00.000Z";
const CURRENT_DATE = "2026-07-15";
const PREVIOUS_DATE = "2026-07-14";
const URL = "http://localhost/api/hermes/daily-farm-brief/latest";

function clone<T>(value: T): T { return structuredClone(value); }

function operationalSource<T>(type: "inventory" | "work_log", records: T[], generatedAt: string) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: generatedAt, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

function projectableFixture(businessDate: string, generatedAt: string) {
  const logs = [{ id: `raw-work-${businessDate}`, startedAt: generatedAt, fieldId: null, workTypeId: null, workTypeName: "raw-work-body-day112", durationMinutes: 15, targetCrop: "cabbage", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null }];
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: operationalSource("inventory", [], generatedAt), work_log: operationalSource("work_log", logs, generatedAt), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: generatedAt, snapshotIdFactory: () => `raw-snapshot-${businessDate}` });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt, briefIdFactory: () => `brief-${businessDate}`, factIdFactory: (index) => `fact-${businessDate}-${index}` }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt, timezone: "Asia/Tokyo", workLogs: logs.map((record) => ({ id: record.id, field_id: null, target_crop: record.targetCrop, crop_cycle_id: null })), cropCycles: [] });
  return { snapshot, scopeIndex };
}

const currentFixture = projectableFixture(CURRENT_DATE, "2026-07-15T01:00:00.000Z");
const previousFixture = projectableFixture(PREVIOUS_DATE, "2026-07-14T01:00:00.000Z");

function projectableRecord(input: {
  id?: string;
  businessDate?: string;
  version?: number;
  status?: "canonical" | "superseded";
  fixture?: typeof currentFixture;
  generatedAt?: string;
} = {}): HermesDailyFarmBriefPersistedProjectableRecord {
  const fixture = input.fixture ?? currentFixture;
  const generatedAt = input.generatedAt ?? fixture.snapshot.generated_at;
  return {
    record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
    record_id: input.id ?? "persisted-projectable-current",
    record_kind: "projectable_brief",
    business_date: input.businessDate ?? CURRENT_DATE,
    generated_at: generatedAt,
    snapshot: clone(fixture.snapshot),
    scope_index: clone(fixture.scopeIndex),
    generation_status: "completed",
    record_status: input.status ?? "canonical",
    version: input.version ?? 1,
    created_at: "2026-07-15T01:10:00.000Z",
    updated_at: "2026-07-15T01:10:00.000Z",
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  };
}

function previousRecord(id = "persisted-projectable-previous"): HermesDailyFarmBriefPersistedProjectableRecord {
  const record = projectableRecord({ id, businessDate: PREVIOUS_DATE, fixture: previousFixture });
  record.created_at = "2026-07-14T01:10:00.000Z";
  record.updated_at = "2026-07-14T01:10:00.000Z";
  return record;
}

function generationRecord(state: "in_progress" | "failed" | "unavailable", id = `persisted-${state}`): HermesDailyFarmBriefPersistedGenerationStateRecord {
  return {
    record_schema_version: "hermes.daily_farm_brief.persisted_record.v1",
    record_id: id,
    record_kind: "generation_state",
    business_date: CURRENT_DATE,
    generation_state: state,
    retry_count: state === "failed" ? 1 : 0,
    record_status: "canonical",
    version: 1,
    created_at: "2026-07-15T00:30:00.000Z",
    updated_at: "2026-07-15T00:30:00.000Z",
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  };
}

function repositoryResult(records: unknown[]) {
  return { schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1", status: "ok", transaction_read_only: true, records };
}

async function select(records: unknown[]) {
  const repository = new HermesDailyFarmBriefFixtureReadRepository(repositoryResult(records));
  const selection = await readHermesDailyFarmBriefPersistedLatestSource({ repository, requestedBusinessDate: CURRENT_DATE, now: NOW });
  assert.equal(repository.readCount, 1);
  assert.equal(selection.repository_read_count, 1);
  assert.equal(selection.retry_count, 0);
  return selection;
}

async function display(source: unknown): Promise<{ status: number; displayState: string | null; serialized: string }> {
  const response = await serveHermesDailyFarmBriefLatestRead({
    request: new Request(URL),
    dependencies: {
      authenticate: async () => ({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "day112-actor" }),
      resolveActorContext: async () => ({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day112-actor", role: "administrator", allowed_scope_keys: [], authorization_verified: true }),
      readLatestSource: async () => source,
      clock: () => NOW,
    },
  });
  const body = await response.json();
  return { status: response.status, displayState: parseHermesDailyFarmBriefLatestApiResponse(body)?.latest?.display_state ?? null, serialized: JSON.stringify(body) };
}

async function main(): Promise<void> {
  const current = await select([projectableRecord()]);
  assert.equal(current.status, "selected");
  assert.equal(current.source?.source_kind, "projectable_brief");
  assert.equal((await display(current.source)).displayState, "current");

  const stale = await select([previousRecord()]);
  assert.equal(stale.source?.business_date, PREVIOUS_DATE);
  assert.equal((await display(stale.source)).displayState, "stale");

  const inProgress = await select([generationRecord("in_progress")]);
  assert.equal(inProgress.source?.source_kind, "generation_state");
  assert.equal((await display(inProgress.source)).displayState, "generation_in_progress");
  const failed = await select([generationRecord("failed")]);
  assert.equal((await display(failed.source)).displayState, "generation_failed");
  const unavailable = await select([]);
  assert.equal((await display(unavailable.source)).displayState, "unavailable");

  const priority = await select([previousRecord(), generationRecord("failed"), generationRecord("in_progress"), projectableRecord()]);
  assert.equal(priority.source?.source_kind, "projectable_brief");

  const unknownField = { ...projectableRecord(), unknown: true };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: unknownField, now: NOW }), null);
  const missingField = clone(projectableRecord()) as unknown as Record<string, unknown>;
  delete missingField.updated_at;
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: missingField, now: NOW }), null);
  const invalidSchema = { ...projectableRecord(), record_schema_version: "hermes.daily_farm_brief.persisted_record.v0" };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: invalidSchema, now: NOW }), null);
  const invalidDate = { ...projectableRecord(), business_date: "2026-02-30" };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: invalidDate, now: NOW }), null);
  const backwards = { ...projectableRecord(), updated_at: "2026-07-15T01:09:59.000Z" };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: backwards, now: NOW }), null);
  const invalidRetry = { ...generationRecord("failed"), retry_count: -1 };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: invalidRetry, now: NOW }), null);
  const mixedUnion = { ...generationRecord("failed"), snapshot: clone(currentFixture.snapshot) };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: mixedUnion, now: NOW }), null);
  const invalidVersion = { ...projectableRecord(), version: 0 };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: invalidVersion, now: NOW }), null);
  const invalidSafety = { ...projectableRecord(), safety: { ...HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY, database_write_performed: true } };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: invalidSafety, now: NOW }), null);

  const invalidMixed = await select([projectableRecord(), unknownField]);
  assert.equal(invalidMixed.error_code, "invalid_persisted_record", "invalid records must not be skipped");
  const future = projectableRecord();
  future.generated_at = "2026-07-15T03:00:00.000Z";
  future.snapshot.generated_at = future.generated_at;
  future.scope_index.generated_at = future.generated_at;
  future.created_at = "2026-07-15T03:10:00.000Z";
  future.updated_at = future.created_at;
  assert.equal((await select([future])).error_code, "future_timestamp");
  const futureUpdatedAt = { ...projectableRecord(), updated_at: "2026-07-15T03:00:00.000Z" };
  assert.equal(parseHermesDailyFarmBriefPersistedRecord({ value: futureUpdatedAt, now: NOW }), null);

  const gapV1 = projectableRecord({ id: "version-chain", version: 1, status: "superseded" });
  const gapV3 = projectableRecord({ id: "version-chain", version: 3 });
  assert.equal((await select([gapV1, gapV3])).error_code, "version_conflict");
  const duplicateVersion = await select([projectableRecord({ id: "duplicate-version" }), projectableRecord({ id: "duplicate-version" })]);
  assert.equal(duplicateVersion.error_code, "duplicate_canonical_record");
  const ambiguous = await select([projectableRecord({ id: "canonical-a" }), projectableRecord({ id: "canonical-b" })]);
  assert.equal(ambiguous.error_code, "ambiguous_latest_record");

  const validV1 = projectableRecord({ id: "valid-version-chain", version: 1, status: "superseded" });
  const validV2 = projectableRecord({ id: "valid-version-chain", version: 2 });
  validV2.updated_at = "2026-07-15T01:11:00.000Z";
  assert.equal((await select([validV1, validV2])).status, "selected");

  const invalidRepository = new HermesDailyFarmBriefFixtureReadRepository({ schema_version: "wrong", status: "ok", transaction_read_only: true, records: [projectableRecord()] });
  const invalidRepositorySelection = await readHermesDailyFarmBriefPersistedLatestSource({ repository: invalidRepository, requestedBusinessDate: CURRENT_DATE, now: NOW });
  assert.equal(invalidRepositorySelection.error_code, "invalid_repository_result");
  assert.equal(invalidRepositorySelection.persisted_record_parse_count, 0);
  assert.equal(invalidRepository.readCount, 1);

  const denyRepository = createHermesDailyFarmBriefProductionReadRepository();
  assert.equal("write" in denyRepository, false);
  assert.equal("insert" in denyRepository, false);
  assert.equal("update" in denyRepository, false);
  assert.equal("delete" in denyRepository, false);
  const denied = await readHermesDailyFarmBriefPersistedLatestSource({ repository: denyRepository, requestedBusinessDate: CURRENT_DATE, now: NOW });
  assert.equal(denied.error_code, "repository_unavailable");
  assert.equal(denied.persisted_record_parse_count, 0);

  assert(current.source);
  assert(parseHermesDailyFarmBriefLatestReadSource(current.source));
  assert.equal(Object.hasOwn(current.source, "record_id"), false);
  assert.equal(Object.hasOwn(current.source, "version"), false);
  assert.equal(Object.hasOwn(current.source, "created_at"), false);
  const api = await display(current.source);
  assert.equal(api.status, 200);
  assert.doesNotMatch(api.serialized, /persisted-projectable|raw-snapshot|raw-work|raw-work-body|"record_id"|"version"|"repository"/iu);

  const repeated = await select([projectableRecord()]);
  assert.deepEqual(repeated, current);
  assert.deepEqual(current.safety, HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY);
  assert.equal(current.safety.transaction_read_only, true);
  assert.equal(current.safety.retry_performed, false);

  console.log(JSON.stringify({
    result: "pass",
    boundary: "hermes_daily_farm_brief_persisted_latest_source",
    states: ["current", "stale", "generation_in_progress", "generation_failed", "unavailable"],
    ambiguity_fail_closed: true,
    version_conflict_fail_closed: true,
    repository_read_max: 1,
    retry_count: 0,
    invalid_repository_downstream_parse_count: 0,
    deterministic: true,
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "day112_test_failed");
  process.exitCode = 1;
});
