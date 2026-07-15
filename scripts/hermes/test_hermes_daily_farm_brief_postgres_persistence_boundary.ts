import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import {
  buildHermesDailyFarmBriefGenerationStatePersistenceCommand,
} from "./brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  HERMES_DAILY_FARM_BRIEF_DAY114_SAFETY,
  HermesDailyFarmBriefIsolatedPostgresReadRepository,
  HermesDailyFarmBriefIsolatedPostgresWriteRepository,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  createHermesDailyFarmBriefDockerPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { persistHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";
import { readHermesDailyFarmBriefPersistedLatestSource } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { parseHermesDailyFarmBriefLatestApiResponse } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { buildProjectable, generationDecision, projectableFixture } from "./test_hermes_daily_farm_brief_persistence_write_command_boundary";

const NOW = "2026-07-15T02:00:00.000Z";
const MIGRATION = "scripts/sql/day114_hermes_daily_farm_brief_postgres_persistence.sql";

function executor() {
  const value = createHermesDailyFarmBriefDockerPostgresExecutor(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  assert(value);
  return value;
}

async function databaseEvidence() {
  const result = await executor().executeSingleConnection("select jsonb_build_object('database',current_database(),'address',coalesce(inet_server_addr()::text,'local_socket'),'port',inet_server_port())::text;");
  assert(result.ok);
  const evidence = JSON.parse(result.output) as { database: string; address: string; port: number | null };
  assert.equal(evidence.database, HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  return evidence;
}

async function objectNames(): Promise<string[]> {
  const result = await executor().executeSingleConnection("select coalesce(jsonb_agg(tablename order by tablename),'[]'::jsonb)::text from pg_tables where schemaname='ai';");
  assert(result.ok);
  return JSON.parse(result.output) as string[];
}

async function ensureMigration() {
  const before = await objectNames();
  const allowed = ["daily_farm_brief_persistence_commands", "daily_farm_brief_records"];
  assert(before.every((name) => allowed.includes(name)), "unexpected Day114 database object");
  const migration = await readFile(MIGRATION, "utf8");
  if (before.length === 0) {
    const dryRun = migration.replace(/commit;\s*$/u, "rollback;");
    assert((await executor().executeSingleConnection(dryRun)).ok);
    assert.deepEqual(await objectNames(), []);
  }
  assert((await executor().executeSingleConnection(migration)).ok);
  assert.deepEqual(await objectNames(), allowed);
  assert((await executor().executeSingleConnection(migration)).ok, "migration rerun must be idempotent");
  return { dry_run_rollback_verified: before.length === 0, migration_applied: true, rerun_verified: true };
}

async function persist(command: unknown, repository: HermesDailyFarmBriefIsolatedPostgresWriteRepository) {
  return persistHermesDailyFarmBrief({ command, repository, clock: () => NOW });
}

async function display(source: unknown, clock = NOW) {
  const response = await serveHermesDailyFarmBriefLatestRead({ request: new Request("http://localhost/api/hermes/daily-farm-brief/latest"), dependencies: {
    authenticate: async () => ({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "day114-actor" }),
    resolveActorContext: async () => ({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day114-actor", role: "administrator", allowed_scope_keys: [], authorization_verified: true }),
    readLatestSource: async () => source,
    clock: () => clock,
  } });
  const body = await response.json();
  return parseHermesDailyFarmBriefLatestApiResponse(body)?.latest?.display_state ?? null;
}

export async function runDay114PostgresScenario() {
  assert.deepEqual(classifyHermesDailyFarmBriefDay114DatabaseTarget(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE), { classification: "isolated_day114_test", allowed: true });
  assert.equal(classifyHermesDailyFarmBriefDay114DatabaseTarget("farmos_core_local").allowed, false);
  const evidence = await databaseEvidence();
  const migration = await ensureMigration();
  const pgExecutor = executor();

  const firstFixture = projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:00:00.000Z", requestAt: "2026-07-15T00:30:00.000Z", executedAt: "2026-07-15T01:10:00.000Z", suffix: "pg-v1" });
  const secondFixture = projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:15:00.000Z", requestAt: "2026-07-15T01:11:00.000Z", executedAt: "2026-07-15T01:20:00.000Z", suffix: "pg-v2" });
  const firstCommand = buildProjectable(firstFixture, { expected: null, requestedAt: "2026-07-15T01:20:00.000Z", commandId: "pg-command-v1" });
  const secondCommand = buildProjectable(secondFixture, { expected: 1, requestedAt: "2026-07-15T01:30:00.000Z", commandId: "pg-command-v2" });
  const firstRepo = new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor);
  const first = await persist(firstCommand, firstRepo);
  assert(["persisted", "reused"].includes(first.status));
  const secondRepo = new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor);
  const second = await persist(secondCommand, secondRepo);
  assert(["persisted", "reused"].includes(second.status));

  const sourceReplay = { ...structuredClone(secondCommand), idempotency_key: "pg-source-replay-different-key" };
  assert.equal((await persist(sourceReplay, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).status, "reused");
  const sourceConflict = structuredClone(sourceReplay); sourceConflict.record.updated_at = "2026-07-15T01:31:00.000Z"; sourceConflict.record.created_at = sourceConflict.record.updated_at; sourceConflict.requested_at = sourceConflict.record.updated_at;
  assert.equal((await persist(sourceConflict, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).error_code, "source_execution_conflict");
  const idempotencyConflict = { ...structuredClone(secondCommand), source_execution_reference: "pg-other-execution", idempotency_key: firstCommand.idempotency_key };
  assert.equal((await persist(idempotencyConflict, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).error_code, "idempotency_conflict");
  const versionMismatchFixture = projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:25:00.000Z", requestAt: "2026-07-15T01:21:00.000Z", executedAt: "2026-07-15T01:28:00.000Z", suffix: "pg-version-mismatch" });
  const versionMismatch = buildProjectable(versionMismatchFixture, { expected: 1, requestedAt: "2026-07-15T01:35:00.000Z", commandId: "pg-command-mismatch" });
  assert.equal((await persist(versionMismatch, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).error_code, "version_conflict");

  const generationOne = buildHermesDailyFarmBriefGenerationStatePersistenceCommand({ generationDecision: generationDecision("2026-07-14", "2026-07-14T00:30:00.000Z", "pg-generation-state-v1"), generationState: "in_progress", retryCount: 0, expectedCurrentVersion: null, requestedAt: "2026-07-14T00:40:00.000Z", commandIdFactory: () => "pg-generation-command-v1", recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` });
  assert(generationOne);
  const genOneResult = await persist(generationOne, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor));
  assert(["persisted", "reused"].includes(genOneResult.status));
  const generationTwo = buildHermesDailyFarmBriefGenerationStatePersistenceCommand({ generationDecision: generationDecision("2026-07-14", "2026-07-14T00:45:00.000Z", "pg-generation-state-v2"), generationState: "failed", retryCount: 1, expectedCurrentVersion: 1, requestedAt: "2026-07-14T00:50:00.000Z", commandIdFactory: () => "pg-generation-command-v2", recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` });
  assert(generationTwo);
  const beforeRollback = JSON.stringify(await new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor).readRecordCandidates());
  const rollbackResult = await persist(generationTwo, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor, true));
  assert.equal(rollbackResult.error_code, "transaction_failed");
  const afterRollback = JSON.stringify(await new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor).readRecordCandidates());
  assert.equal(afterRollback, beforeRollback);

  const concurrentA = buildProjectable(projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:40:00.000Z", requestAt: "2026-07-15T01:31:00.000Z", executedAt: "2026-07-15T01:45:00.000Z", suffix: "pg-concurrent-a" }), { expected: 2, requestedAt: "2026-07-15T01:50:00.000Z", commandId: "pg-concurrent-a" });
  const concurrentB = buildProjectable(projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:41:00.000Z", requestAt: "2026-07-15T01:32:00.000Z", executedAt: "2026-07-15T01:46:00.000Z", suffix: "pg-concurrent-b" }), { expected: 2, requestedAt: "2026-07-15T01:51:00.000Z", commandId: "pg-concurrent-b" });
  const concurrency = await Promise.all([persist(concurrentA, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor)), persist(concurrentB, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))]);
  assert(concurrency.some((item) => item.status === "persisted" || item.status === "reused"));
  assert(concurrency.some((item) => item.error_code === "version_conflict" || item.status === "reused"));

  const readRepo = new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor);
  const selected = await readHermesDailyFarmBriefPersistedLatestSource({ repository: readRepo, requestedBusinessDate: "2026-07-15", now: NOW });
  assert.equal(selected.status, "selected");
  assert.equal(await display(selected.source), "current");
  const stale = await readHermesDailyFarmBriefPersistedLatestSource({ repository: new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor), requestedBusinessDate: "2026-07-16", now: "2026-07-16T03:00:00.000Z" });
  assert.equal(await display(stale.source, "2026-07-16T03:00:00.000Z"), "stale");

  return { database_target_classification: "isolated_day114_test", isolated_database_verified: evidence.database === HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, database_evidence: evidence, ...migration, first_persistence: first.status, second_version_transition: second.status, idempotency_reuse: true, idempotency_conflict: true, source_execution_reuse: true, source_execution_conflict: true, rollback_preserved: true, concurrency: concurrency.map((item) => ({ status: item.status, error_code: item.error_code })), read_after_write: selected.status, day111_display_state: "current", transaction_call_count: firstRepo.transactionCallCount + secondRepo.transactionCallCount, retry_count: 0, safety: HERMES_DAILY_FARM_BRIEF_DAY114_SAFETY };
}

async function main() {
  console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_postgres_persistence", ...(await runDay114PostgresScenario()) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error instanceof Error ? error.message : "day114_postgres_test_failed"); process.exitCode = 1; });
