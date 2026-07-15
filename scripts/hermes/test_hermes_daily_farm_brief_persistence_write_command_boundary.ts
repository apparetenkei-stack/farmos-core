import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import type { HermesOperationalReadonlyClientResult } from "../../src/lib/hermes/hermes_operational_readonly_client";
import { createHermesDailyFarmBriefProductionPersistenceRepository } from "../../src/lib/hermes/hermes_daily_farm_brief_persistence_write_repository";
import { buildHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_builder";
import {
  HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY,
  parseHermesDailyFarmBriefExecutionResult,
  type HermesDailyFarmBriefExecutionResult,
} from "./brief_runtime/hermes_daily_farm_brief_execution_contract";
import {
  buildHermesDailyFarmBriefGenerationStatePersistenceCommand,
  buildHermesDailyFarmBriefProjectablePersistenceCommand,
  parseHermesDailyFarmBriefPersistenceCommand,
  type HermesDailyFarmBriefPersistenceCommand,
} from "./brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import {
  HermesDailyFarmBriefFixturePersistenceRepository,
  persistHermesDailyFarmBrief as persistBoundary,
} from "./brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";
import { fingerprintHermesDailyFarmBriefProjectableSource } from "./brief_runtime/hermes_daily_farm_brief_persistence_fingerprint";
import { readHermesDailyFarmBriefPersistedLatestSource } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { parseHermesDailyFarmBriefLatestApiResponse, parseHermesDailyFarmBriefLatestReadSource } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { createHermesDailyFarmBriefRoleAwareLatestCandidate } from "./brief_runtime/hermes_daily_farm_brief_latest_read_boundary";
import { buildHermesDailyFarmBriefScopeIndex } from "./brief_runtime/hermes_daily_farm_brief_scope_builder";
import { createHermesDailyFarmSnapshot } from "./brief_runtime/hermes_daily_farm_snapshot_adapter";
import type { HermesDailyFarmBriefGenerationDecision } from "./brief_runtime/hermes_daily_farm_brief_generation_contract";
import { createHermesDailyFarmBriefGenerationRequest, orchestrateHermesDailyFarmBriefGeneration } from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";

export const CURRENT_DATE = "2026-07-15";
const PREVIOUS_DATE = "2026-07-14";
const NOW = "2026-07-15T03:00:00.000Z";
const URL = "http://localhost/api/hermes/daily-farm-brief/latest";

function operationalSource<T>(type: "inventory" | "work_log", records: T[], generatedAt: string) {
  return { result: "ok" as const, source_type: type, endpoint_path: type === "inventory" ? ("/api/farmos-core/inventory-summary" as const) : ("/api/farmos-core/recent-work-logs" as const), http_method: "GET" as const, fetch_performed: false, available: true, transaction_read_only: true as const, requested_limit: 100, http_status: 200, response_source: type === "inventory" ? ("apparetenkei_inventory_readonly" as const) : ("apparetenkei_work_logs_readonly" as const), generated_at: generatedAt, record_count: records.length, records, has_more: false, error_code: null, write_performed: false as const, restricted_fields_exposed: false as const, credentials_exposed: false as const };
}

export function generationDecision(businessDate: string, requestedAt: string, requestId: string): HermesDailyFarmBriefGenerationDecision {
  const request = createHermesDailyFarmBriefGenerationRequest({ triggerType: "manual", requestedAt, actorRole: "administrator", authorizationVerified: true, serverForceRegenerationAllowed: false, requestIdFactory: () => requestId });
  assert(request);
  assert.equal(request.business_date, businessDate);
  const decision = orchestrateHermesDailyFarmBriefGeneration({ requestCreation: { triggerType: "manual", requestedAt, actorRole: "administrator", authorizationVerified: true, serverForceRegenerationAllowed: false, requestIdFactory: () => requestId }, existingState: null });
  assert(decision);
  return decision;
}

export function projectableFixture(input: { businessDate: string; generatedAt: string; requestAt: string; executedAt: string; suffix: string }) {
  const logs = [{ id: `raw-work-${input.suffix}`, startedAt: input.generatedAt, fieldId: null, workTypeId: null, workTypeName: "private fixture body", durationMinutes: 15, targetCrop: "cabbage", cropCycleId: null, machineId: null, implementId: null, yieldAmount: null, yieldUnit: null, appliedMaterials: null }];
  const operational: HermesOperationalReadonlyClientResult = {
    result: "ok", checked: "hermes_operational_readonly_client", boundary: "day92_hermes_operational_readonly_client", inventory: operationalSource("inventory", [], input.generatedAt), work_log: operationalSource("work_log", logs, input.generatedAt), inventory_source_connected: true, work_log_source_connected: true, external_fetch_performed: false, hermes_context_injection_performed: false, suggestion_generation_performed: false, proposal_created: false, proposal_saved: false, proposal_apply_performed: false, app_db_write_performed: false, core_db_write_performed: false, audit_write_performed: false, database_write_performed: false, credentials_exposed: false, arbitrary_endpoint_allowed: false, arbitrary_method_allowed: false,
  };
  const snapshot = createHermesDailyFarmSnapshot({ operationalSources: operational, memory: { crop_cycles: [], hermes_notes: [], crop_cycle_generated_at: null, hermes_note_generated_at: null }, nowIso: input.generatedAt, snapshotIdFactory: () => `raw-snapshot-${input.suffix}` });
  const brief = buildHermesDailyFarmBrief({ snapshot, generatedAt: input.generatedAt, briefIdFactory: () => `raw-brief-${input.suffix}`, factIdFactory: (index) => `raw-fact-${input.suffix}-${index}` }).brief;
  const scopeIndex = buildHermesDailyFarmBriefScopeIndex({ snapshot, brief, generatedAt: input.generatedAt, timezone: "Asia/Tokyo", workLogs: logs.map((record) => ({ id: record.id, field_id: null, target_crop: record.targetCrop, crop_cycle_id: null })), cropCycles: [] });
  const source = { schema_version: "hermes.daily_farm_brief.latest_read_source.v1" as const, source_kind: "projectable_brief" as const, business_date: input.businessDate, scope_index: scopeIndex, snapshot, generation_state: null };
  const decision = generationDecision(input.businessDate, input.requestAt, `generation-${input.suffix}`);
  const candidate = createHermesDailyFarmBriefRoleAwareLatestCandidate({ businessDate: input.businessDate, requestedBusinessDate: input.businessDate, scopeIndex, snapshot, role: "administrator", allowedScopeKeys: [] });
  assert(candidate);
  const execution: HermesDailyFarmBriefExecutionResult | null = parseHermesDailyFarmBriefExecutionResult({
    schema_version: "hermes.daily_farm_brief.execution_result.v1", execution_id: `execution-${input.suffix}`, generation_request_id: decision.request.request_id, business_date: input.businessDate, execution_requested_at: input.requestAt, executed_at: input.executedAt, status: "completed", generation_decision: decision, brief_status: candidate.brief_status, snapshot_generated: true, brief_generated: true, scope_index_generated: true, role_projection_generated: true, role: "administrator", visible_scope_count: candidate.visible_scope_count, source_status: candidate.source_status, limitations: candidate.limitations, failure_code: null, latest_candidate: candidate, persistence_source_fingerprint: fingerprintHermesDailyFarmBriefProjectableSource({ snapshot, scopeIndex }), safety: HERMES_DAILY_FARM_BRIEF_EXECUTION_SAFETY,
  });
  assert(execution);
  return { source, execution, decision };
}

export function buildProjectable(fixture: ReturnType<typeof projectableFixture>, input: { expected: number | null; requestedAt: string; commandId: string }) {
  const command = buildHermesDailyFarmBriefProjectablePersistenceCommand({ executionResult: fixture.execution, latestSource: fixture.source, expectedCurrentVersion: input.expected, requestedAt: input.requestedAt, commandIdFactory: () => input.commandId, recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` });
  assert(command);
  return command;
}

async function persist(command: unknown, repository: Parameters<typeof persistBoundary>[0]["repository"], now = NOW) {
  return persistBoundary({ command, repository, clock: () => now });
}

async function apiDisplay(source: unknown): Promise<{ status: number; display: string | null; serialized: string }> {
  const response = await serveHermesDailyFarmBriefLatestRead({ request: new Request(URL), dependencies: {
    authenticate: async () => ({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "day113-actor" }),
    resolveActorContext: async () => ({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day113-actor", role: "administrator", allowed_scope_keys: [], authorization_verified: true }),
    readLatestSource: async () => source,
    clock: () => NOW,
  } });
  const body = await response.json();
  return { status: response.status, display: parseHermesDailyFarmBriefLatestApiResponse(body)?.latest?.display_state ?? null, serialized: JSON.stringify(body) };
}

async function main(): Promise<void> {
  const currentFixture = projectableFixture({ businessDate: CURRENT_DATE, generatedAt: "2026-07-15T01:00:00.000Z", requestAt: "2026-07-15T00:30:00.000Z", executedAt: "2026-07-15T01:10:00.000Z", suffix: "current" });
  const first = buildProjectable(currentFixture, { expected: null, requestedAt: "2026-07-15T01:20:00.000Z", commandId: "command-current-v1" });
  assert(parseHermesDailyFarmBriefPersistenceCommand(first));
  const repository = new HermesDailyFarmBriefFixturePersistenceRepository();
  const firstResult = await persist(first, repository);
  assert.equal(firstResult.status, "persisted");
  assert.equal(firstResult.repository_transaction_call_count, 1);
  assert.equal(firstResult.retry_count, 0);
  assert.equal(repository.transactionCallCount, 1);
  assert.equal((repository.inspectRecords()[0] as { version: number }).version, 1);
  assert.equal((repository.inspectRecords()[0] as { record_status: string }).record_status, "canonical");

  const replay = await persist(structuredClone(first), repository);
  assert.equal(replay.status, "reused");
  assert.equal(repository.inspectRecords().length, 1);

  const sameExecutionDifferentKey = { ...structuredClone(first), command_id: "command-current-replay-alias", idempotency_key: "different-server-key-same-payload" };
  assert.equal((await persist(sameExecutionDifferentKey, repository)).status, "reused");
  const sameExecutionDifferentPayload = buildProjectable(currentFixture, { expected: 1, requestedAt: "2026-07-15T01:25:00.000Z", commandId: "command-current-same-execution-v2" });
  sameExecutionDifferentPayload.idempotency_key = "different-server-key-conflicting-payload";
  assert.equal((await persist(sameExecutionDifferentPayload, repository)).error_code, "source_execution_conflict");

  const nextExecutionFixture = projectableFixture({ businessDate: CURRENT_DATE, generatedAt: "2026-07-15T01:15:00.000Z", requestAt: "2026-07-15T01:11:00.000Z", executedAt: "2026-07-15T01:20:00.000Z", suffix: "current-v2" });
  const second = buildProjectable(nextExecutionFixture, { expected: 1, requestedAt: "2026-07-15T01:30:00.000Z", commandId: "command-current-v2" });
  const conflictCommand = { ...second, idempotency_key: first.idempotency_key };
  const idempotencyConflict = await persist(conflictCommand, repository);
  assert.equal(idempotencyConflict.error_code, "idempotency_conflict");
  const secondResult = await persist(second, repository);
  assert.equal(secondResult.status, "persisted");
  const recordsAfterSecond = repository.inspectRecords() as Array<{ version: number; record_status: string }>;
  assert.deepEqual(recordsAfterSecond.map(({ version, record_status }) => ({ version, record_status })), [{ version: 1, record_status: "superseded" }, { version: 2, record_status: "canonical" }]);

  const generationRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
  const generationCommand = buildHermesDailyFarmBriefGenerationStatePersistenceCommand({ generationDecision: currentFixture.decision, generationState: "in_progress", retryCount: 0, expectedCurrentVersion: null, requestedAt: "2026-07-15T00:40:00.000Z", commandIdFactory: () => "command-generation-v1", recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` });
  assert(generationCommand);
  assert.equal((await persist(generationCommand, generationRepository)).status, "persisted");

  const mismatchRepository = new HermesDailyFarmBriefFixturePersistenceRepository([first.record]);
  const mismatch = await persist({ ...first, idempotency_key: "expected-mismatch" }, mismatchRepository);
  assert.equal(mismatch.error_code, "version_conflict");
  const alternate = structuredClone(first.record); alternate.record_id = "alternate-canonical";
  const multiple = new HermesDailyFarmBriefFixturePersistenceRepository([first.record, alternate]);
  assert.equal((await persist(second, multiple)).error_code, "concurrency_conflict");
  const gapV1 = structuredClone(first.record); gapV1.record_status = "superseded"; const gapV3 = structuredClone(second.record); gapV3.version = 3;
  const gap = new HermesDailyFarmBriefFixturePersistenceRepository([gapV1, gapV3]);
  assert.equal((await persist(second, gap)).error_code, "version_conflict");

  const unknown = { ...first, unknown: true };
  assert.equal(parseHermesDailyFarmBriefPersistenceCommand(unknown), null);
  const missing = structuredClone(first) as unknown as Record<string, unknown>; delete missing.requested_by;
  assert.equal(parseHermesDailyFarmBriefPersistenceCommand(missing), null);
  const invalidRecord = structuredClone(first); invalidRecord.record.version = 0;
  assert.equal((await persist(invalidRecord, new HermesDailyFarmBriefFixturePersistenceRepository())).error_code, "invalid_command");
  const dateMismatch = structuredClone(first); dateMismatch.business_date = PREVIOUS_DATE;
  assert.equal(parseHermesDailyFarmBriefPersistenceCommand(dateMismatch), null);
  const future = structuredClone(first); future.requested_at = "2026-07-15T00:00:00.000Z"; future.record.created_at = future.requested_at; future.record.updated_at = future.requested_at;
  assert.equal(parseHermesDailyFarmBriefPersistenceCommand(future), null);

  const rollbackRepository = new HermesDailyFarmBriefFixturePersistenceRepository([first.record]);
  const beforeRollback = rollbackRepository.inspectRecords();
  rollbackRepository.failNextTransaction();
  const rolledBack = await persist(second, rollbackRepository);
  assert.equal(rolledBack.error_code, "transaction_failed");
  assert.deepEqual(rollbackRepository.inspectRecords(), beforeRollback);
  assert.equal(rollbackRepository.transactionCallCount, 1);
  const afterFailedTransaction = await persist(second, rollbackRepository);
  assert.equal(afterFailedTransaction.status, "persisted", "failed transaction must not retain source execution reference");

  const invalidBeforeRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
  const invalidBefore = await persist(unknown, invalidBeforeRepository);
  assert.equal(invalidBefore.repository_transaction_call_count, 0);
  assert.equal(invalidBeforeRepository.transactionCallCount, 0);
  const actualFutureRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
  const actualFuture = buildProjectable(currentFixture, { expected: null, requestedAt: "2026-07-15T03:10:00.000Z", commandId: "command-actual-future" });
  const futureResult = await persist(actualFuture, actualFutureRepository, NOW);
  assert.equal(futureResult.error_code, "future_timestamp");
  assert.equal(actualFutureRepository.transactionCallCount, 0);

  const tamperedSnapshotSource = structuredClone(currentFixture.source);
  tamperedSnapshotSource.snapshot.snapshot_id = "tampered-snapshot-same-timestamp";
  assert(parseHermesDailyFarmBriefLatestReadSource(tamperedSnapshotSource), "tampered snapshot fixture must remain independently valid");
  assert.equal(buildHermesDailyFarmBriefProjectablePersistenceCommand({ executionResult: currentFixture.execution, latestSource: tamperedSnapshotSource, expectedCurrentVersion: null, requestedAt: "2026-07-15T01:20:00.000Z", commandIdFactory: () => "command-tampered-snapshot", recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` }), null);
  const tamperedScopeSource = structuredClone(currentFixture.source);
  tamperedScopeSource.scope_index.summary.unscoped_work_log_count += 1;
  assert(parseHermesDailyFarmBriefLatestReadSource(tamperedScopeSource), "tampered scope fixture must remain independently valid");
  assert.equal(buildHermesDailyFarmBriefProjectablePersistenceCommand({ executionResult: currentFixture.execution, latestSource: tamperedScopeSource, expectedCurrentVersion: null, requestedAt: "2026-07-15T01:20:00.000Z", commandIdFactory: () => "command-tampered-scope", recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` }), null);

  const selection = await readHermesDailyFarmBriefPersistedLatestSource({ repository, requestedBusinessDate: CURRENT_DATE, now: NOW });
  assert.equal(selection.status, "selected");
  assert.equal(selection.source?.source_kind, "projectable_brief");
  const api = await apiDisplay(selection.source);
  assert.equal(api.status, 200);
  assert.equal(api.display, "current");
  assert.doesNotMatch(api.serialized, /daily-brief-|command-current|raw-snapshot|raw-work|"version"|"record_id"/iu);

  const previousFixture = projectableFixture({ businessDate: PREVIOUS_DATE, generatedAt: "2026-07-14T01:00:00.000Z", requestAt: "2026-07-14T00:30:00.000Z", executedAt: "2026-07-14T01:10:00.000Z", suffix: "previous" });
  const previousCommand = buildProjectable(previousFixture, { expected: null, requestedAt: "2026-07-14T01:20:00.000Z", commandId: "command-previous-v1" });
  const previousRepository = new HermesDailyFarmBriefFixturePersistenceRepository();
  assert.equal((await persist(previousCommand, previousRepository)).status, "persisted");
  const previousSelection = await readHermesDailyFarmBriefPersistedLatestSource({ repository: previousRepository, requestedBusinessDate: CURRENT_DATE, now: NOW });
  assert.equal((await apiDisplay(previousSelection.source)).display, "stale");

  const denied = await persist(first, createHermesDailyFarmBriefProductionPersistenceRepository());
  assert.equal(denied.error_code, "repository_unavailable");
  assert.equal(denied.safety.database_write_performed, false);
  assert.equal(firstResult.safety.fixture_repository_write_performed, true);
  assert.equal(firstResult.safety.brief_persistence_simulated, true);
  assert.equal(firstResult.safety.transaction_committed, true);
  assert.equal(replay.safety.fixture_repository_write_performed, false);
  assert.equal(rolledBack.safety.transaction_committed, false);
  assert.doesNotMatch(JSON.stringify(firstResult), /daily-brief-|command-current|"record_id"|"version"|raw-/iu);

  const deterministicA = await persist(structuredClone(first), new HermesDailyFarmBriefFixturePersistenceRepository());
  const deterministicB = await persist(structuredClone(first), new HermesDailyFarmBriefFixturePersistenceRepository());
  assert.deepEqual(deterministicA, deterministicB);

  console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_persistence_write_command", states: ["persisted", "reused", "rejected", "failed_closed"], version_transition: "distinct_execution_v1_superseded_v2_canonical", idempotency_reuse: true, idempotency_conflict: true, source_execution_uniqueness: true, server_clock_enforced: true, execution_payload_binding: true, transaction_rollback: true, repository_transaction_max_calls: 1, retry_count: 0, read_after_write: { day112: "selected", day111: "current", previous: "stale" }, production_repository: "deny_by_default", database_write_performed: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : "day113_test_failed");
    process.exitCode = 1;
  });
}
