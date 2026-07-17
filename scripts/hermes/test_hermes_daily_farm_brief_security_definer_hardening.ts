import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  HermesDailyFarmBriefIsolatedPostgresReadRepository,
  HermesDailyFarmBriefIsolatedPostgresWriteRepository,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "./brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import { persistHermesDailyFarmBrief } from "./brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";
import { readHermesDailyFarmBriefPersistedLatestSource } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { HermesDailyFarmBriefBusinessDateBoundedReadRepository } from "./brief_runtime/hermes_daily_farm_brief_manual_persist_read_e2e";
import { buildProjectable, projectableFixture } from "./test_hermes_daily_farm_brief_persistence_write_command_boundary";

const OWNER_ROLE = "day123_daily_brief_owner_test";
const RUNTIME_ROLE = "day123_daily_brief_runtime_test";
const HARDENING_SQL = "scripts/sql/day123_hermes_daily_farm_brief_security_definer_hardening.sql";
const NOW = "2026-07-17T12:00:00.000Z";

function executor(): HermesDailyFarmBriefIsolatedPostgresExecutor {
  const result = createHermesDailyFarmBriefDockerPostgresExecutor(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  assert(result);
  return result;
}

async function ensureTestRoles(): Promise<void> {
  const checked = await executor().executeSingleConnection(`select jsonb_build_object('owner',exists(select 1 from pg_roles where rolname='${OWNER_ROLE}'),'runtime',exists(select 1 from pg_roles where rolname='${RUNTIME_ROLE}'))::text;`);
  assert(checked.ok);
  const existing = JSON.parse(checked.output) as { owner: boolean; runtime: boolean };
  if (!existing.owner) assert((await executor().executeSingleConnection(`create role ${OWNER_ROLE} nologin nosuperuser nobypassrls;`)).ok);
  if (!existing.runtime) assert((await executor().executeSingleConnection(`create role ${RUNTIME_ROLE} nologin nosuperuser nobypassrls;`)).ok);
}

async function applyHardening(): Promise<void> {
  const sql = await readFile(HARDENING_SQL, "utf8");
  const result = await executor().executeSingleConnection(`\\set daily_brief_owner_role ${OWNER_ROLE}\n\\set daily_brief_runtime_role ${RUNTIME_ROLE}\n${sql}`);
  assert(result.ok);
}

function runtimeExecutor(): HermesDailyFarmBriefIsolatedPostgresExecutor {
  const base = executor();
  return {
    executeSingleConnection(sql) {
      const scoped = sql.replace("begin isolation level read committed;", `begin isolation level read committed;\nset local role ${RUNTIME_ROLE};`);
      return base.executeSingleConnection(scoped);
    },
  };
}

async function catalogEvidence() {
  const result = await executor().executeSingleConnection(`
with target as (
  select p.oid,p.proowner,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='ai' and p.oid=to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')
)
select jsonb_build_object(
  'security_definer',(select prosecdef from target),
  'search_path_fixed',(select proconfig=array['search_path=pg_catalog, ai']::text[] from target),
  'schema_public_create',has_schema_privilege('public','ai','CREATE'),
  'public_execute',has_function_privilege('public',to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE'),
  'runtime_execute',has_function_privilege('${RUNTIME_ROLE}',to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE'),
  'runtime_records_insert',has_table_privilege('${RUNTIME_ROLE}','ai.daily_farm_brief_records','INSERT'),
  'runtime_records_update',has_table_privilege('${RUNTIME_ROLE}','ai.daily_farm_brief_records','UPDATE'),
  'runtime_records_delete',has_table_privilege('${RUNTIME_ROLE}','ai.daily_farm_brief_records','DELETE'),
  'runtime_commands_insert',has_table_privilege('${RUNTIME_ROLE}','ai.daily_farm_brief_persistence_commands','INSERT'),
  'owner_safe',(select not r.rolsuper and not r.rolcanlogin and not r.rolbypassrls from target t join pg_roles r on r.oid=t.proowner),
  'owner_records',has_table_privilege('${OWNER_ROLE}','ai.daily_farm_brief_records','SELECT,INSERT,UPDATE'),
  'owner_commands',has_table_privilege('${OWNER_ROLE}','ai.daily_farm_brief_persistence_commands','SELECT,INSERT')
)::text;
`);
  assert(result.ok);
  return JSON.parse(result.output) as Record<string, boolean>;
}

async function freeBusinessDates(): Promise<string[]> {
  const result = await executor().executeSingleConnection(`
select coalesce(jsonb_agg(day order by day),'[]'::jsonb)::text from (
  select d::date::text as day from generate_series(date '2024-01-01',date '2025-12-31',interval '1 day') d
  where not exists (
    select 1 from ai.daily_farm_brief_records r where r.business_date=d::date and r.record_kind='projectable_brief'
  ) order by d limit 2
) available;
`);
  assert(result.ok);
  const dates = JSON.parse(result.output) as string[];
  assert.equal(dates.length, 2);
  return dates;
}

async function scenario(businessDate: string, suffix: string) {
  const generatedAt = `${businessDate}T01:00:00.000Z`;
  const fixture = projectableFixture({ businessDate, generatedAt, requestAt: `${businessDate}T00:30:00.000Z`, executedAt: `${businessDate}T01:10:00.000Z`, suffix });
  const command = buildProjectable(fixture, { expected: null, requestedAt: `${businessDate}T01:20:00.000Z`, commandId: `${suffix}-command` });
  const writeRepository = new HermesDailyFarmBriefIsolatedPostgresWriteRepository(runtimeExecutor());
  const first = await persistHermesDailyFarmBrief({ command, repository: writeRepository, clock: () => NOW });
  assert.equal(first.status, "persisted");
  const replay = await persistHermesDailyFarmBrief({ command, repository: new HermesDailyFarmBriefIsolatedPostgresWriteRepository(runtimeExecutor()), clock: () => NOW });
  assert.equal(replay.status, "reused");
  const conflictCommand = structuredClone(command);
  conflictCommand.record.updated_at = `${businessDate}T01:21:00.000Z`;
  conflictCommand.record.created_at = conflictCommand.record.updated_at;
  conflictCommand.requested_at = conflictCommand.record.updated_at;
  const conflict = await persistHermesDailyFarmBrief({ command: conflictCommand, repository: new HermesDailyFarmBriefIsolatedPostgresWriteRepository(runtimeExecutor()), clock: () => NOW });
  assert.equal(conflict.status, "rejected");

  const rollbackFixture = projectableFixture({ businessDate, generatedAt: `${businessDate}T01:30:00.000Z`, requestAt: `${businessDate}T01:22:00.000Z`, executedAt: `${businessDate}T01:35:00.000Z`, suffix: `${suffix}-rollback` });
  const rollbackCommand = buildProjectable(rollbackFixture, { expected: 1, requestedAt: `${businessDate}T01:40:00.000Z`, commandId: `${suffix}-rollback-command` });
  const rollback = await persistHermesDailyFarmBrief({ command: rollbackCommand, repository: new HermesDailyFarmBriefIsolatedPostgresWriteRepository(runtimeExecutor(), true), clock: () => NOW });
  assert.equal(rollback.status, "failed_closed");

  const readRepository = new HermesDailyFarmBriefBusinessDateBoundedReadRepository(new HermesDailyFarmBriefIsolatedPostgresReadRepository(executor()), businessDate);
  const selected = await readHermesDailyFarmBriefPersistedLatestSource({ repository: readRepository, requestedBusinessDate: businessDate, now: `${businessDate}T12:00:00.000Z` });
  assert.equal(selected.status, "selected");
  const response = await serveHermesDailyFarmBriefLatestRead({ request: new Request("http://localhost/api/hermes/daily-farm-brief/latest"), dependencies: {
    authenticate: async () => ({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "day123-security-test-actor" }),
    resolveActorContext: async () => ({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "day123-security-test-actor", role: "administrator", allowed_scope_keys: [], authorization_verified: true }),
    readLatestSource: async () => selected.source,
    clock: () => `${businessDate}T12:00:00.000Z`,
  } });
  assert.equal(response.status, 200);
  return { inserted: true, reused: true, conflict_rejected: true, rollback_verified: true, authenticated_latest_read: "current" };
}

await ensureTestRoles();
await applyHardening();
const catalog = await catalogEvidence();
assert.deepEqual(catalog, { security_definer: true, search_path_fixed: true, schema_public_create: false, public_execute: false, runtime_execute: true, runtime_records_insert: false, runtime_records_update: false, runtime_records_delete: false, runtime_commands_insert: false, owner_safe: true, owner_records: true, owner_commands: true });

const directInsert = await executor().executeSingleConnection(`begin; set local role ${RUNTIME_ROLE}; insert into ai.daily_farm_brief_records(record_id) values ('day123-direct-insert-must-fail'); rollback;`);
assert.equal(directInsert.ok, false);
const directUpdate = await executor().executeSingleConnection(`begin; set local role ${RUNTIME_ROLE}; update ai.daily_farm_brief_records set record_status='superseded' where false; rollback;`);
assert.equal(directUpdate.ok, false);

const dates = await freeBusinessDates();
const first = await scenario(dates[0], "day123-security-a");
await applyHardening();
const second = await scenario(dates[1], "day123-security-b");

console.log(JSON.stringify({ result: "pass", boundary: "hermes_daily_farm_brief_security_definer_hardening", catalog_validation: "pass", direct_insert_rejected: true, direct_update_rejected: true, direct_delete_privilege: false, first, second, retry_count: 0, production_change_performed: false, secret_exposed: false }));
