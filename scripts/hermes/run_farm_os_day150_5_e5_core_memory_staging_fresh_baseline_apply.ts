import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH,
  FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH,
  parseFarmOsCoreMemoryInitialCatalogBaselineAuthority,
} from "../../src/lib/hermes/farm_os_core_memory_initial_catalog_baseline";
import { FARM_OS_CORE_MEMORY_CATALOG_FINGERPRINT_SQL } from
  "./run_farm_os_day150_5_e5_core_memory_fresh_baseline_qualification";

const CONTAINER = "farmos-core-memory-staging-postgres";
const DATABASE = "farmos_core_memory_staging";
const QUALIFICATION_PATH =
  "artifacts/day150-5/e5/core-memory-fresh-baseline-qualification.json";
const parsedAuthority = parseFarmOsCoreMemoryInitialCatalogBaselineAuthority(JSON.parse(
  readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH, "utf8")));
if (parsedAuthority === null) throw new Error("CORE_MEMORY_BASELINE_AUTHORITY_INVALID");
const authority = parsedAuthority;
const qualification = JSON.parse(readFileSync(QUALIFICATION_PATH, "utf8")) as {
  baseline_sha256: string;
  migration_count: number;
  migration_head: string;
  fingerprint_equality: boolean;
  fresh_replay_1: { status: string; catalog_fingerprint: string };
  fresh_replay_2: { status: string; catalog_fingerprint: string };
};
if (qualification.baseline_sha256 !== authority.baseline_sha256 ||
  qualification.migration_count !== authority.migrations.length ||
  qualification.migration_head !== authority.final_migration_head ||
  qualification.fingerprint_equality !== true || qualification.fresh_replay_1.status !== "PASS" ||
  qualification.fresh_replay_2.status !== "PASS" ||
  qualification.fresh_replay_1.catalog_fingerprint !==
    qualification.fresh_replay_2.catalog_fingerprint) {
  throw new Error("CORE_MEMORY_FRESH_BASELINE_QUALIFICATION_EVIDENCE_INVALID");
}

function psql(sql: string, tuplesOnly = false): string {
  const result = spawnSync("docker", [
    "exec", "-i", CONTAINER, "psql", "-X", "-v", "ON_ERROR_STOP=1",
    "-U", "postgres", "-d", DATABASE, ...(tuplesOnly ? ["-A", "-t", "-q"] : ["-q"]),
  ], { input: sql, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    const safe = `${result.stderr ?? ""}`.replace(/[^\x20-\x7e\n]/gu, "").slice(0, 2_000);
    throw new Error(`CORE_MEMORY_STAGING_FRESH_BASELINE_APPLY_FAILED:${safe}`);
  }
  return `${result.stdout ?? ""}`.trim();
}
const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const freshness = psql(`select pg_catalog.jsonb_build_object(
  'ai_schema', pg_catalog.to_regnamespace('ai') is not null,
  'core_schema', pg_catalog.to_regnamespace('core_schema') is not null,
  'audit_schema', pg_catalog.to_regnamespace('audit') is not null,
  'migration_history', pg_catalog.to_regclass('core_schema.migration_history') is not null,
  'application_relations', (select count(*) from pg_catalog.pg_class class_row
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
    where namespace_row.nspname in ('ai','core_schema','audit')
      and class_row.relkind in ('r','p'))
)::text;`, true);
const freshnessValue = JSON.parse(freshness) as Record<string, boolean | number>;
if (freshnessValue.ai_schema !== false || freshnessValue.core_schema !== false ||
  freshnessValue.audit_schema !== false || freshnessValue.migration_history !== false ||
  freshnessValue.application_relations !== 0) {
  throw new Error("CORE_MEMORY_STAGING_NOT_FRESH");
}

psql(readFileSync(FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH, "utf8"));
for (const migration of authority.migrations) {
  psql(readFileSync(migration.apply_script, "utf8"));
  psql(`insert into core_schema.migration_history (
    migration_id, sequence, checksum, description, applied_at, applied_by, execution_id
  ) values (
    ${literal(migration.migration_id)}, ${migration.sequence}, ${literal(migration.checksum)},
    'E5 canonical manifest migration', '2026-08-26T00:00:00.000Z',
    'core_memory_fresh_baseline_v1', ${literal(`e5-staging-${migration.sequence}`)}
  );`);
  psql(readFileSync(migration.verification_script, "utf8"));
}

psql(`alter role farmos_core_memory_staging_readonly in database ${DATABASE}
    set default_transaction_read_only = on;
  grant connect on database ${DATABASE} to farmos_core_memory_staging_readonly;
  grant usage on schema ai, audit, core_schema to farmos_core_memory_staging_readonly;
  grant select on all tables in schema ai, audit, core_schema
    to farmos_core_memory_staging_readonly;`);

const readonlyBounded = psql(`select case when
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
  and exists (select 1 from pg_catalog.pg_db_role_setting role_setting
    where role_setting.setrole = pg_catalog.to_regrole('farmos_core_memory_staging_readonly')
      and role_setting.setdatabase = (select oid from pg_catalog.pg_database
        where datname = current_database())
      and 'default_transaction_read_only=on' = any(role_setting.setconfig))
then 'PASS' else 'FAIL' end;`, true);
if (readonlyBounded !== "PASS") throw new Error("CORE_MEMORY_STAGING_READONLY_ROLE_INVALID");

const history = JSON.parse(psql(`select pg_catalog.jsonb_build_object(
  'count', count(*), 'head', max(migration_id),
  'ids', jsonb_agg(migration_id order by sequence)
)::text from core_schema.migration_history;`, true)) as {
  count: number; head: string; ids: string[];
};
const expectedIds = authority.migrations.map((migration) => migration.migration_id);
if (history.count !== expectedIds.length || history.head !== authority.final_migration_head ||
  JSON.stringify(history.ids) !== JSON.stringify(expectedIds)) {
  throw new Error("CORE_MEMORY_STAGING_MIGRATION_HISTORY_MISMATCH");
}
const catalog = psql(FARM_OS_CORE_MEMORY_CATALOG_FINGERPRINT_SQL, true);
const catalogFingerprint =
  `sha256:${createHash("sha256").update(catalog, "utf8").digest("hex")}`;
if (catalogFingerprint !== qualification.fresh_replay_1.catalog_fingerprint) {
  throw new Error("CORE_MEMORY_STAGING_CATALOG_FINGERPRINT_MISMATCH");
}
console.log(JSON.stringify({
  result: "CORE_MEMORY_STAGING_FRESH_BASELINE_APPLY_PASS",
  baseline_id: authority.baseline_id,
  baseline_sha256: authority.baseline_sha256,
  migration_count: history.count,
  migration_head: history.head,
  catalog_fingerprint: catalogFingerprint,
  runtime_readonly_role_bounded: true,
  production_connection_query_write: "0/0/0",
}));
