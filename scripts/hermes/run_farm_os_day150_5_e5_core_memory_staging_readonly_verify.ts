import { execFileSync } from "node:child_process";
import { Client } from "pg";

const KEYCHAIN_SERVICE =
  "jp.apparetenkei.farmos-core-staging.core-memory-readonly";
const KEYCHAIN_ACCOUNT = "core-memory-staging-readonly";
const MIGRATION_HEAD =
  "202608110001_production_target_execution_durability";

function readPassword(): string {
  const value = execFileSync("/usr/bin/security", [
    "find-generic-password", "-s", KEYCHAIN_SERVICE,
    "-a", KEYCHAIN_ACCOUNT, "-w",
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  }).replace(/\r?\n$/u, "");
  if (value.length < 32 || /^(?:postgres(?:ql)?:\/\/|[a-z]+:\/\/)/iu.test(value)) {
    throw new Error("CORE_MEMORY_STAGING_KEYCHAIN_CREDENTIAL_SHAPE_INVALID");
  }
  return value;
}

async function verify(): Promise<void> {
  let phase = "KEYCHAIN_READ";
  let client: Client | null = null;
  try {
    const password = readPassword();
    phase = "CONNECT";
    client = new Client({
      host: "127.0.0.1",
      port: 55432,
      database: "farmos_core_memory_staging",
      user: "farmos_core_memory_staging_readonly",
      password,
      ssl: false,
      connectionTimeoutMillis: 5_000,
      application_name: "farmos-core-staging-e5-core-memory-readonly-smoke",
    });
    await client.connect();
    phase = "READ_ONLY_TRANSACTION";
    await client.query("BEGIN TRANSACTION READ ONLY");
    const state = await client.query<{
      transaction_read_only: string;
      database_name: string;
      role_name: string;
      server_version_num: string;
      migration_count: number;
      migration_head: string | null;
      application_relation_count: number;
      schema_metadata_count: number;
      required_projection_relation_count: number;
      write_privilege_count: number;
    }>(`select
      current_setting('transaction_read_only') as transaction_read_only,
      current_database() as database_name,
      current_user as role_name,
      current_setting('server_version_num') as server_version_num,
      (select count(*)::int from core_schema.migration_history) as migration_count,
      (select max(migration_id) from core_schema.migration_history) as migration_head,
      (select count(*)::int from pg_catalog.pg_class class_row
        join pg_catalog.pg_namespace namespace_row
          on namespace_row.oid = class_row.relnamespace
        where namespace_row.nspname in ('ai','audit','core_schema')
          and class_row.relkind in ('r','p')) as application_relation_count,
      (select count(*)::int
        from ai.production_target_execution_schema_metadata) as schema_metadata_count,
      (select count(*)::int from unnest(array[
          'ai.operational_memory_daily_projections',
          'ai.operational_memory_projection_state_events',
          'ai.operational_memory_projection_lineage',
          'ai.operational_memory_source_snapshots',
          'ai.operational_memory_snapshot_state_events'
        ]) relation_name
        where to_regclass(relation_name) is not null)
        as required_projection_relation_count,
      (select count(*)::int from unnest(array[
          'ai.operational_memory_daily_projections',
          'ai.operational_memory_projection_state_events',
          'ai.operational_memory_projection_lineage',
          'ai.operational_memory_source_snapshots',
          'ai.operational_memory_snapshot_state_events'
        ]) relation_name
        where has_table_privilege(current_user, relation_name,
          'INSERT,UPDATE,DELETE,TRUNCATE')) as write_privilege_count`);
    await client.query("ROLLBACK");
    const row = state.rows[0];
    if (row?.transaction_read_only !== "on" ||
      row.database_name !== "farmos_core_memory_staging" ||
      row.role_name !== "farmos_core_memory_staging_readonly" ||
      !row.server_version_num.startsWith("17") || row.migration_count !== 6 ||
      row.migration_head !== MIGRATION_HEAD || row.application_relation_count < 1 ||
      row.schema_metadata_count !== 1 ||
      row.required_projection_relation_count !== 5 ||
      row.write_privilege_count !== 0) {
      throw new Error("CORE_MEMORY_STAGING_READONLY_STATE_MISMATCH");
    }
    console.log(JSON.stringify({
      status: "CORE_MEMORY_STAGING_READONLY_VERIFIED",
      resource_fingerprint:
        "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767",
      migration_count: row.migration_count,
      migration_head: row.migration_head,
      transaction_read_only: true,
      database_name: row.database_name,
      role_name: row.role_name,
      postgres_major: 17,
      runtime_credential_class: "core-memory-staging-readonly",
      application_relation_count: row.application_relation_count,
      required_projection_relation_count:
        row.required_projection_relation_count,
      write_privilege_count: row.write_privilege_count,
      writes: 0,
      production_connections: 0,
    }));
  } catch {
    console.error(JSON.stringify({
      status: "CORE_MEMORY_STAGING_READONLY_VERIFICATION_FAILED",
      failed_phase: phase,
      secret_exposure: 0,
      production_connections: 0,
    }));
    process.exitCode = 1;
  } finally {
    if (client !== null) await client.end().catch(() => undefined);
  }
}

void verify();
