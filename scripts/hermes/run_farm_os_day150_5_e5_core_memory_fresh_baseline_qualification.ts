import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH,
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH,
  parseFarmOsCoreMemoryInitialCatalogBaselineAuthority,
} from "../../src/lib/hermes/farm_os_core_memory_initial_catalog_baseline";

const IMAGE = "postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317";
const DATABASE = "farmos_core_memory_fresh_qualification";
const CONTAINERS = [
  "farmos-core-memory-e5-fresh-replay-1",
  "farmos-core-memory-e5-fresh-replay-2",
] as const;

const parsedAuthority = parseFarmOsCoreMemoryInitialCatalogBaselineAuthority(JSON.parse(
  readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH, "utf8")));
if (parsedAuthority === null) throw new Error("CORE_MEMORY_BASELINE_AUTHORITY_INVALID");
const authority = parsedAuthority;
const baseline = readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH, "utf8");

function docker(args: readonly string[], input?: string, allowFailure = false): string {
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (!allowFailure && result.status !== 0) {
    const safe = `${result.stderr ?? ""}`.replace(/[^\x20-\x7e\n]/gu, "").slice(0, 2_000);
    throw new Error(`CORE_MEMORY_FRESH_BASELINE_DOCKER_FAILURE:${args[0]}:${safe}`);
  }
  return `${result.stdout ?? ""}`.trim();
}

function psql(container: string, sql: string, tuplesOnly = false): string {
  return docker([
    "exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1",
    "-U", "postgres", "-d", DATABASE, ...(tuplesOnly ? ["-A", "-t", "-q"] : ["-q"]),
  ], sql);
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const baselineValidationSql = `
select case when
  pg_catalog.to_regnamespace('ai') is not null
  and pg_catalog.to_regclass('ai.proposal_inbox') is not null
  and pg_catalog.to_regclass('ai.operational_memory_source_snapshots') is not null
  and pg_catalog.to_regclass('ai.operational_memory_snapshot_state_events') is not null
  and pg_catalog.to_regclass('ai.operational_memory_daily_projections') is not null
  and pg_catalog.to_regclass('ai.operational_memory_projection_state_events') is not null
  and pg_catalog.to_regclass('ai.operational_memory_projection_lineage') is not null
  and pg_catalog.to_regclass('ai.operational_memory_ingestion_rejections') is not null
  and pg_catalog.to_regprocedure('ai.reject_operational_memory_immutable_mutation()') is not null
  and pg_catalog.to_regprocedure(
    'ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)') is not null
  and pg_catalog.to_regclass('core_schema.migration_history') is null
  and (select count(*) from ai.proposal_inbox) = 0
  and (select count(*) from ai.operational_memory_source_snapshots) = 0
  and (select count(*) from ai.operational_memory_snapshot_state_events) = 0
  and (select count(*) from ai.operational_memory_daily_projections) = 0
  and (select count(*) from ai.operational_memory_projection_state_events) = 0
  and (select count(*) from ai.operational_memory_projection_lineage) = 0
  and (select count(*) from ai.operational_memory_ingestion_rejections) = 0
then 'PASS' else 'FAIL' end;
`;

export const FARM_OS_CORE_MEMORY_CATALOG_FINGERPRINT_SQL = `
with relations as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema', namespace_row.nspname, 'name', class_row.relname,
    'kind', class_row.relkind, 'owner', owner_row.rolname,
    'rls', class_row.relrowsecurity, 'force_rls', class_row.relforcerowsecurity
  ) order by namespace_row.nspname, class_row.relname) value
  from pg_catalog.pg_class class_row
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  join pg_catalog.pg_roles owner_row on owner_row.oid = class_row.relowner
  where namespace_row.nspname in ('ai','audit','core_schema')
    and class_row.relkind in ('r','p','v','m','S')
), columns as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema', namespace_row.nspname, 'relation', class_row.relname,
    'position', attribute_row.attnum, 'name', attribute_row.attname,
    'type', pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod),
    'not_null', attribute_row.attnotnull, 'identity', attribute_row.attidentity,
    'generated', attribute_row.attgenerated,
    'default', pg_catalog.pg_get_expr(default_row.adbin, default_row.adrelid)
  ) order by namespace_row.nspname, class_row.relname, attribute_row.attnum) value
  from pg_catalog.pg_attribute attribute_row
  join pg_catalog.pg_class class_row on class_row.oid = attribute_row.attrelid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  left join pg_catalog.pg_attrdef default_row on default_row.adrelid = attribute_row.attrelid
    and default_row.adnum = attribute_row.attnum
  where namespace_row.nspname in ('ai','audit','core_schema')
    and attribute_row.attnum > 0 and not attribute_row.attisdropped
), constraints as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema', namespace_row.nspname, 'relation', class_row.relname,
    'name', constraint_row.conname, 'type', constraint_row.contype,
    'definition', pg_catalog.pg_get_constraintdef(constraint_row.oid, true)
  ) order by namespace_row.nspname, class_row.relname, constraint_row.conname) value
  from pg_catalog.pg_constraint constraint_row
  join pg_catalog.pg_class class_row on class_row.oid = constraint_row.conrelid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  where namespace_row.nspname in ('ai','audit','core_schema')
), indexes as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema', namespace_row.nspname, 'name', index_row.relname,
    'definition', pg_catalog.pg_get_indexdef(index_row.oid)
  ) order by namespace_row.nspname, index_row.relname) value
  from pg_catalog.pg_index index_metadata
  join pg_catalog.pg_class index_row on index_row.oid = index_metadata.indexrelid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = index_row.relnamespace
  where namespace_row.nspname in ('ai','audit','core_schema')
), functions as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'identity', procedure_row.oid::pg_catalog.regprocedure::text,
    'owner', owner_row.rolname, 'definition', pg_catalog.pg_get_functiondef(procedure_row.oid)
  ) order by procedure_row.oid::pg_catalog.regprocedure::text) value
  from pg_catalog.pg_proc procedure_row
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = procedure_row.pronamespace
  join pg_catalog.pg_roles owner_row on owner_row.oid = procedure_row.proowner
  where namespace_row.nspname in ('ai','audit','core_schema')
), triggers as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'schema', namespace_row.nspname, 'relation', class_row.relname,
    'name', trigger_row.tgname, 'definition', pg_catalog.pg_get_triggerdef(trigger_row.oid, true)
  ) order by namespace_row.nspname, class_row.relname, trigger_row.tgname) value
  from pg_catalog.pg_trigger trigger_row
  join pg_catalog.pg_class class_row on class_row.oid = trigger_row.tgrelid
  join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
  where namespace_row.nspname in ('ai','audit','core_schema') and not trigger_row.tgisinternal
), roles as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'name', role_row.rolname, 'login', role_row.rolcanlogin,
    'superuser', role_row.rolsuper, 'createdb', role_row.rolcreatedb,
    'createrole', role_row.rolcreaterole, 'inherit', role_row.rolinherit,
    'replication', role_row.rolreplication, 'bypassrls', role_row.rolbypassrls,
    'settings', coalesce((select pg_catalog.jsonb_agg(setting order by setting)
      from pg_catalog.unnest(coalesce((select role_setting.setconfig
        from pg_catalog.pg_db_role_setting role_setting
        where role_setting.setrole = role_row.oid
          and role_setting.setdatabase = (select oid from pg_catalog.pg_database
            where datname = current_database())), array[]::text[])) setting), '[]'::jsonb)
  ) order by role_row.rolname) value
  from pg_catalog.pg_roles role_row where role_row.rolname like 'farmos_core_%'
), memberships as (
  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'role', role_row.rolname, 'member', member_row.rolname,
    'grantor', grantor_row.rolname, 'admin', membership.admin_option
  ) order by role_row.rolname, member_row.rolname) value
  from pg_catalog.pg_auth_members membership
  join pg_catalog.pg_roles role_row on role_row.oid = membership.roleid
  join pg_catalog.pg_roles member_row on member_row.oid = membership.member
  join pg_catalog.pg_roles grantor_row on grantor_row.oid = membership.grantor
  where role_row.rolname like 'farmos_core_%' or member_row.rolname like 'farmos_core_%'
)
select pg_catalog.jsonb_build_object(
  'relations', relations.value, 'columns', columns.value,
  'constraints', constraints.value, 'indexes', indexes.value,
  'functions', functions.value, 'triggers', triggers.value,
  'roles', roles.value, 'memberships', memberships.value
)::text
from relations, columns, constraints, indexes, functions, triggers, roles, memberships;
`;

function qualify(container: string): { fingerprint: string; head: string; historyCount: number } {
  const existing = spawnSync("docker", ["container", "inspect", container], {
    encoding: "utf8",
  });
  if (existing.status === 0) {
    throw new Error(`CORE_MEMORY_FRESH_BASELINE_CONTAINER_COLLISION:${container}`);
  }
  docker(["run", "--detach", "--name", container, "--network", "none",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=512m",
    "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--env", `POSTGRES_DB=${DATABASE}`,
    IMAGE]);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const probe = spawnSync("docker", ["exec", container, "pg_isready", "-U", "postgres", "-d", DATABASE],
        { encoding: "utf8" });
      if (probe.status === 0) { ready = true; break; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
    if (!ready) throw new Error("CORE_MEMORY_FRESH_BASELINE_POSTGRES_NOT_READY");
    psql(container, baseline);
    if (psql(container, baselineValidationSql, true) !== "PASS") {
      throw new Error("CORE_MEMORY_FRESH_BASELINE_PREREQUISITE_VALIDATION_FAILED");
    }
    for (const migration of authority.migrations) {
      psql(container, readFileSync(migration.apply_script, "utf8"));
      psql(container, `insert into core_schema.migration_history (
        migration_id, sequence, checksum, description, applied_at, applied_by, execution_id
      ) values (
        ${sqlLiteral(migration.migration_id)}, ${migration.sequence},
        ${sqlLiteral(migration.checksum)}, 'E5 canonical manifest migration',
        '2026-08-26T00:00:00.000Z', 'core_memory_fresh_baseline_v1',
        ${sqlLiteral(`e5-fresh-${migration.sequence}`)}
      );`);
      psql(container, readFileSync(migration.verification_script, "utf8"));
    }
    psql(container, `create role farmos_core_memory_staging_readonly
      login nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
      alter role farmos_core_memory_staging_readonly in database ${DATABASE}
        set default_transaction_read_only = on;
      grant connect on database ${DATABASE} to farmos_core_memory_staging_readonly;
      grant usage on schema ai, audit, core_schema to farmos_core_memory_staging_readonly;
      grant select on all tables in schema ai, audit, core_schema
        to farmos_core_memory_staging_readonly;`);
    const readonlyBounded = psql(container, `select case when
      not exists (select 1 from pg_catalog.pg_auth_members membership
        where membership.member = pg_catalog.to_regrole('farmos_core_memory_staging_readonly')
          or membership.roleid = pg_catalog.to_regrole('farmos_core_memory_staging_readonly'))
      and not exists (select 1 from pg_catalog.pg_class class_row
        join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
        where namespace_row.nspname in ('ai','audit','core_schema')
          and class_row.relkind in ('r','p') and (
            pg_catalog.has_table_privilege('farmos_core_memory_staging_readonly', class_row.oid, 'INSERT')
            or pg_catalog.has_table_privilege('farmos_core_memory_staging_readonly', class_row.oid, 'UPDATE')
            or pg_catalog.has_table_privilege('farmos_core_memory_staging_readonly', class_row.oid, 'DELETE')
            or pg_catalog.has_table_privilege('farmos_core_memory_staging_readonly', class_row.oid, 'TRUNCATE')))
      and (select setting = 'on' from pg_catalog.pg_settings where name = 'default_transaction_read_only') is false
      and exists (select 1 from pg_catalog.pg_db_role_setting role_setting
        where role_setting.setrole = pg_catalog.to_regrole('farmos_core_memory_staging_readonly')
          and role_setting.setdatabase = (select oid from pg_catalog.pg_database
            where datname = current_database())
          and 'default_transaction_read_only=on' = any(role_setting.setconfig))
      then 'PASS' else 'FAIL' end;`, true);
    if (readonlyBounded !== "PASS") {
      throw new Error("CORE_MEMORY_FRESH_BASELINE_READONLY_ROLE_INVALID");
    }
    const history = psql(container, `select pg_catalog.jsonb_build_object(
      'count', count(*), 'head', max(migration_id),
      'ids', jsonb_agg(migration_id order by sequence)
    )::text from core_schema.migration_history;`, true);
    const parsed = JSON.parse(history) as { count: number; head: string; ids: string[] };
    const expectedIds = authority.migrations.map((migration) => migration.migration_id);
    if (parsed.count !== expectedIds.length || parsed.head !== authority.final_migration_head ||
      JSON.stringify(parsed.ids) !== JSON.stringify(expectedIds)) {
      throw new Error("CORE_MEMORY_FRESH_BASELINE_MIGRATION_HISTORY_MISMATCH");
    }
    const catalog = psql(container, FARM_OS_CORE_MEMORY_CATALOG_FINGERPRINT_SQL, true);
    if (catalog.length === 0) throw new Error("CORE_MEMORY_FRESH_BASELINE_CATALOG_EMPTY");
    return {
      fingerprint: `sha256:${createHash("sha256").update(catalog, "utf8").digest("hex")}`,
      head: parsed.head,
      historyCount: parsed.count,
    };
  } finally {
    docker(["rm", "--force", container], undefined, true);
  }
}

export function runFarmOsCoreMemoryFreshBaselineQualification(): void {
  docker(["image", "inspect", IMAGE]);
  const first = qualify(CONTAINERS[0]);
  console.log(JSON.stringify({ replay: 1, status: "PASS", ...first }));
  const second = qualify(CONTAINERS[1]);
  console.log(JSON.stringify({ replay: 2, status: "PASS", ...second }));
  if (first.fingerprint !== second.fingerprint || first.head !== second.head ||
    first.historyCount !== second.historyCount) {
    throw new Error("CORE_MEMORY_FRESH_BASELINE_REPLAY_DRIFT");
  }
  console.log(JSON.stringify({
    result: "CORE_MEMORY_FRESH_BASELINE_QUALIFICATION_PASS",
    baseline_sha256: authority.baseline_sha256,
    migration_head: first.head,
    history_count: first.historyCount,
    catalog_fingerprint: first.fingerprint,
    fingerprint_equality: true,
  }));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFarmOsCoreMemoryFreshBaselineQualification();
}
