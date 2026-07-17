import assert from "node:assert/strict";
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

const NOW = "2026-07-15T03:00:00.000Z";

function versionedTime(baseIso: string, version: number, offsetMilliseconds = 0): string {
  return new Date(Date.parse(baseIso) + version * 1000 + offsetMilliseconds).toISOString();
}

function isolatedTargetGuard(): string {
  return `do $day123_test$ begin if current_database() <> '${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'day114_database_target_rejected'; end if; end $day123_test$;`;
}

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

async function canonicalState(input: {
  executor: ReturnType<typeof executor>;
  businessDate: string;
  recordKind: "projectable_brief" | "generation_state";
}): Promise<{ count: 0 | 1; currentVersion: number | null }> {
  const result = await input.executor.executeSingleConnection(`begin transaction read only;
${isolatedTargetGuard()}
select jsonb_build_object(
  'canonical_count', count(*),
  'current_version', case when count(*) = 1 then min(version) else null end
)::text
from ai.daily_farm_brief_records
where record_kind = '${input.recordKind}' and business_date = '${input.businessDate}'::date and record_status = 'canonical';
commit;`);
  assert(result.ok, "canonical version read failed");
  const parsed = JSON.parse(result.output.split(/\r?\n/u).filter(Boolean).at(-1) ?? "null") as { canonical_count?: unknown; current_version?: unknown } | null;
  assert(parsed && (parsed.canonical_count === 0 || parsed.canonical_count === 1), "invalid canonical count");
  if (parsed.canonical_count === 0) {
    assert.equal(parsed.current_version, null);
    return { count: 0, currentVersion: null };
  }
  assert(Number.isSafeInteger(parsed.current_version) && Number(parsed.current_version) > 0, "invalid canonical version");
  return { count: 1, currentVersion: parsed.current_version as number };
}

async function verifyExistingSchema() {
  const before = await objectNames();
  const allowed = ["daily_farm_brief_persistence_commands", "daily_farm_brief_records"];
  assert(before.every((name) => allowed.includes(name)), "unexpected Day114 database object");
  assert.deepEqual(await objectNames(), allowed);
  return { existing_schema_verified: true, migration_executed: false };
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
  const schema = await verifyExistingSchema();
  const pgExecutor = executor();
  const beforeProjectable = await canonicalState({ executor: pgExecutor, businessDate: "2026-07-15", recordKind: "projectable_brief" });
  const firstVersion = (beforeProjectable.currentVersion ?? 0) + 1;
  const secondVersion = firstVersion + 1;
  const firstRequestedAt = versionedTime("2026-07-15T02:00:00.000Z", firstVersion);
  const secondRequestedAt = versionedTime("2026-07-15T02:00:00.000Z", secondVersion);

  const firstFixture = projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:00:00.000Z", requestAt: "2026-07-15T00:30:00.000Z", executedAt: "2026-07-15T01:10:00.000Z", suffix: `pg-rerun-v${firstVersion}` });
  const secondFixture = projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:15:00.000Z", requestAt: "2026-07-15T01:11:00.000Z", executedAt: "2026-07-15T01:20:00.000Z", suffix: `pg-rerun-v${secondVersion}` });
  const firstCommand = buildProjectable(firstFixture, { expected: beforeProjectable.currentVersion, requestedAt: firstRequestedAt, commandId: `pg-rerun-command-v${firstVersion}` });
  const secondCommand = buildProjectable(secondFixture, { expected: firstVersion, requestedAt: secondRequestedAt, commandId: `pg-rerun-command-v${secondVersion}` });
  const firstRepo = new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor);
  const first = await persist(firstCommand, firstRepo);
  assert.equal(first.status, "persisted", `first persistence failed: status=${first.status}, error_code=${first.error_code ?? "none"}`);
  const firstReplay = await persist(structuredClone(firstCommand), new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor));
  assert.equal(firstReplay.status, "reused");
  const secondRepo = new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor);
  const second = await persist(secondCommand, secondRepo);
  assert.equal(second.status, "persisted", `second persistence failed: status=${second.status}, error_code=${second.error_code ?? "none"}`);

  const sourceReplay = { ...structuredClone(secondCommand), idempotency_key: `pg-source-replay-v${secondVersion}-different-key` };
  assert.equal((await persist(sourceReplay, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).status, "reused");
  const sourceConflict = structuredClone(sourceReplay); sourceConflict.record.updated_at = "2026-07-15T01:31:00.000Z"; sourceConflict.record.created_at = sourceConflict.record.updated_at; sourceConflict.requested_at = sourceConflict.record.updated_at;
  assert.equal((await persist(sourceConflict, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).error_code, "source_execution_conflict");
  const idempotencyConflict = { ...structuredClone(secondCommand), source_execution_reference: "pg-other-execution", idempotency_key: firstCommand.idempotency_key };
  assert.equal((await persist(idempotencyConflict, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).error_code, "idempotency_conflict");
  const versionMismatchFixture = projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:25:00.000Z", requestAt: "2026-07-15T01:21:00.000Z", executedAt: "2026-07-15T01:28:00.000Z", suffix: `pg-version-mismatch-after-v${secondVersion}` });
  const versionMismatch = buildProjectable(versionMismatchFixture, { expected: firstVersion, requestedAt: versionedTime("2026-07-15T02:00:00.000Z", secondVersion, 100), commandId: `pg-command-mismatch-after-v${secondVersion}` });
  assert.equal((await persist(versionMismatch, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))).error_code, "version_conflict");

  const beforeGeneration = await canonicalState({ executor: pgExecutor, businessDate: "2026-07-14", recordKind: "generation_state" });
  const generationVersion = (beforeGeneration.currentVersion ?? 0) + 1;
  const generationOne = buildHermesDailyFarmBriefGenerationStatePersistenceCommand({ generationDecision: generationDecision("2026-07-14", "2026-07-14T00:30:00.000Z", `pg-generation-state-v${generationVersion}`), generationState: "in_progress", retryCount: 0, expectedCurrentVersion: beforeGeneration.currentVersion, requestedAt: versionedTime("2026-07-14T02:00:00.000Z", generationVersion), commandIdFactory: () => `pg-generation-command-v${generationVersion}`, recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` });
  assert(generationOne);
  const genOneResult = await persist(generationOne, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor));
  assert(["persisted", "reused"].includes(genOneResult.status));
  const generationTwo = buildHermesDailyFarmBriefGenerationStatePersistenceCommand({ generationDecision: generationDecision("2026-07-14", "2026-07-14T00:45:00.000Z", `pg-generation-state-v${generationVersion + 1}`), generationState: "failed", retryCount: 1, expectedCurrentVersion: generationVersion, requestedAt: versionedTime("2026-07-14T02:00:00.000Z", generationVersion + 1), commandIdFactory: () => `pg-generation-command-v${generationVersion + 1}`, recordIdFactory: (date, kind) => `daily-brief-${date}-${kind}` });
  assert(generationTwo);
  const beforeRollback = JSON.stringify(await new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor).readRecordCandidates());
  const rollbackResult = await persist(generationTwo, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor, true));
  assert.equal(rollbackResult.error_code, "transaction_failed");
  const afterRollback = JSON.stringify(await new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor).readRecordCandidates());
  assert.equal(afterRollback, beforeRollback);

  const concurrentA = buildProjectable(projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:40:00.000Z", requestAt: "2026-07-15T01:31:00.000Z", executedAt: "2026-07-15T01:45:00.000Z", suffix: `pg-concurrent-v${secondVersion + 1}-a` }), { expected: secondVersion, requestedAt: versionedTime("2026-07-15T02:00:00.000Z", secondVersion + 1), commandId: `pg-concurrent-v${secondVersion + 1}-a` });
  const concurrentB = buildProjectable(projectableFixture({ businessDate: "2026-07-15", generatedAt: "2026-07-15T01:41:00.000Z", requestAt: "2026-07-15T01:32:00.000Z", executedAt: "2026-07-15T01:46:00.000Z", suffix: `pg-concurrent-v${secondVersion + 1}-b` }), { expected: secondVersion, requestedAt: versionedTime("2026-07-15T02:00:00.000Z", secondVersion + 1, 100), commandId: `pg-concurrent-v${secondVersion + 1}-b` });
  const concurrency = await Promise.all([persist(concurrentA, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor)), persist(concurrentB, new HermesDailyFarmBriefIsolatedPostgresWriteRepository(pgExecutor))]);
  assert(concurrency.some((item) => item.status === "persisted" || item.status === "reused"));
  assert(concurrency.some((item) => item.error_code === "version_conflict" || item.status === "reused"));
  const afterProjectable = await canonicalState({ executor: pgExecutor, businessDate: "2026-07-15", recordKind: "projectable_brief" });
  assert.equal(afterProjectable.count, 1);
  assert.equal(afterProjectable.currentVersion, secondVersion + 1);

  const readRepo = new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor);
  const selected = await readHermesDailyFarmBriefPersistedLatestSource({ repository: readRepo, requestedBusinessDate: "2026-07-15", now: NOW });
  assert.equal(selected.status, "selected");
  assert.equal(await display(selected.source), "current");
  const stale = await readHermesDailyFarmBriefPersistedLatestSource({ repository: new HermesDailyFarmBriefIsolatedPostgresReadRepository(pgExecutor), requestedBusinessDate: "2026-07-16", now: "2026-07-16T03:00:00.000Z" });
  assert.equal(await display(stale.source, "2026-07-16T03:00:00.000Z"), "stale");

  return { database_target_classification: "isolated_day114_test", isolated_database_verified: evidence.database === HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE, database_evidence: evidence, ...schema, canonical_before: beforeProjectable, canonical_after: afterProjectable, first_persistence: first.status, exact_payload_reuse: firstReplay.status, second_version_transition: second.status, idempotency_reuse: true, idempotency_conflict: true, source_execution_reuse: true, source_execution_conflict: true, rollback_preserved: true, concurrency: concurrency.map((item) => ({ status: item.status, error_code: item.error_code })), read_after_write: selected.status, day111_display_state: "current", transaction_call_count: firstRepo.transactionCallCount + secondRepo.transactionCallCount, retry_count: 0, safety: HERMES_DAILY_FARM_BRIEF_DAY114_SAFETY };
}

async function main() {
  console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_postgres_persistence", ...(await runDay114PostgresScenario()) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => { console.error(error instanceof Error ? error.message : "day114_postgres_test_failed"); process.exitCode = 1; });
