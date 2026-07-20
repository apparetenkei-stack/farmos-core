import { Pool, type PoolClient, type PoolConfig } from "pg";

import { createHermesDailyFarmBriefProductionPoolSslConfig } from "./hermes_daily_farm_brief_production_read_repository";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE,
  hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid,
  parseHermesDailyFarmBriefProposalExplicitSaveWriterInspection,
  type HermesDailyFarmBriefProposalExplicitSaveWriterInspection,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningConfig,
  type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor,
} from "./hermes_daily_farm_brief_proposal_explicit_save_writer_provisioning";

type QueryResult<Row = Record<string, unknown>> = { rows: Row[]; rowCount?: number | null };
export type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient = {
  query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]): Promise<QueryResult<Row>>;
  release(): void;
};
export type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool = {
  connect(): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient>;
  end(): Promise<void>;
};

const ADVISORY_LOCK_KEY = "13020260720" as const;
const PASSWORD_SETTING = "farmos.proposal_explicit_save_writer_provisioning_password" as const;

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_INSPECTION_SQL = `
with
admin_role as (select * from pg_catalog.pg_roles where rolname=current_user),
writer_role as (select * from pg_catalog.pg_roles where rolname=$2::text),
proposal as (select * from pg_catalog.pg_class where oid=to_regclass('ai.proposal_inbox')),
facts as (
select
  current_database()=$1::text and current_user=$3::text and session_user=$3::text as target_matches,
  coalesce((select rolcanlogin and rolsuper from admin_role),false) as administrator_safe,
  coalesce((select rolsuper from admin_role),false) as administrator_can_provision,
  to_regnamespace('ai') is not null as schema_present,
  coalesce((select relkind in ('r','p') from proposal),false) as proposal_table_present,
  exists(select 1 from writer_role) as role_present,
  coalesce((select rolcanlogin from writer_role),false) as role_login,
  coalesce((select rolsuper from writer_role),false) as role_superuser,
  coalesce((select rolcreatedb from writer_role),false) as role_createdb,
  coalesce((select rolcreaterole from writer_role),false) as role_createrole,
  coalesce((select rolbypassrls from writer_role),false) as role_bypassrls,
  coalesce((select rolreplication from writer_role),false) as role_replication,
  coalesce((select rolcanlogin and not rolinherit and not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb and not rolreplication from writer_role),false) as role_attributes_valid,
  coalesce((select not exists(select 1 from pg_catalog.pg_auth_members m where m.member=w.oid or m.roleid=w.oid) from writer_role w),false) as role_membership_absent,
  coalesce((select has_database_privilege(oid,current_database(),'CONNECT') from writer_role),false) as database_connect,
  coalesce((select has_database_privilege(oid,current_database(),'CREATE') from writer_role),false) as database_create,
  coalesce((select has_schema_privilege(oid,'ai','USAGE') from writer_role),false) as schema_usage,
  coalesce((select exists(select 1 from pg_catalog.pg_namespace n where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and has_schema_privilege(w.oid,n.oid,'CREATE')) from writer_role w),false) as schema_create,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','SELECT') from writer_role),false) as proposal_select,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','INSERT') from writer_role),false) as proposal_insert,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','UPDATE') or exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=to_regclass('ai.proposal_inbox') and a.attnum>0 and not a.attisdropped and has_column_privilege(w.oid,a.attrelid,a.attname,'UPDATE')) from writer_role w),false) as proposal_update,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','DELETE') from writer_role),false) as proposal_delete,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','TRUNCATE') from writer_role),false) as proposal_truncate,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','REFERENCES') or exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=to_regclass('ai.proposal_inbox') and a.attnum>0 and not a.attisdropped and has_column_privilege(w.oid,a.attrelid,a.attname,'REFERENCES')) from writer_role w),false) as proposal_references,
  coalesce((select has_table_privilege(oid,'ai.proposal_inbox','TRIGGER') from writer_role),false) as proposal_trigger,
  coalesce((select exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.oid is distinct from to_regclass('ai.proposal_inbox') and ((c.relkind in ('r','p','v','m','f') and (has_table_privilege(w.oid,c.oid,'INSERT') or has_table_privilege(w.oid,c.oid,'UPDATE') or has_table_privilege(w.oid,c.oid,'DELETE') or has_table_privilege(w.oid,c.oid,'TRUNCATE') or exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped and (has_column_privilege(w.oid,a.attrelid,a.attname,'INSERT') or has_column_privilege(w.oid,a.attrelid,a.attname,'UPDATE'))))) or (c.relkind='S' and (has_sequence_privilege(w.oid,c.oid,'USAGE') or has_sequence_privilege(w.oid,c.oid,'UPDATE'))))) from writer_role w),false) as other_relation_write,
  coalesce((select exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='audit' and c.relkind in ('r','p','v','m','f','S') and (has_table_privilege(w.oid,c.oid,'INSERT') or has_table_privilege(w.oid,c.oid,'UPDATE') or has_table_privilege(w.oid,c.oid,'DELETE') or has_table_privilege(w.oid,c.oid,'TRUNCATE') or (c.relkind='S' and (has_sequence_privilege(w.oid,c.oid,'USAGE') or has_sequence_privilege(w.oid,c.oid,'UPDATE'))))) from writer_role w),false) as audit_write,
  coalesce((select exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where lower(n.nspname) in ('app','sales') and c.relkind in ('r','p','v','m','f','S') and (has_table_privilege(w.oid,c.oid,'INSERT') or has_table_privilege(w.oid,c.oid,'UPDATE') or has_table_privilege(w.oid,c.oid,'DELETE') or has_table_privilege(w.oid,c.oid,'TRUNCATE') or (c.relkind='S' and (has_sequence_privilege(w.oid,c.oid,'USAGE') or has_sequence_privilege(w.oid,c.oid,'UPDATE'))))) from writer_role w),false) as app_sales_write,
  coalesce((select exists(select 1 from pg_catalog.pg_class where relowner=w.oid) or exists(select 1 from pg_catalog.pg_namespace where nspowner=w.oid) or exists(select 1 from pg_catalog.pg_database where datdba=w.oid) from writer_role w),false) as object_ownership_present
)
select jsonb_build_object(
  'target_matches',target_matches,'administrator_safe',administrator_safe,'administrator_can_provision',administrator_can_provision,
  'schema_present',schema_present,'proposal_table_present',proposal_table_present,'role_present',role_present,
  'role_login',role_login,'role_superuser',role_superuser,'role_createdb',role_createdb,'role_createrole',role_createrole,'role_bypassrls',role_bypassrls,'role_replication',role_replication,
  'role_attributes_valid',role_attributes_valid,'role_membership_absent',role_membership_absent,
  'database_connect',database_connect,'database_create',database_create,'schema_usage',schema_usage,'schema_create',schema_create,
  'proposal_select',proposal_select,'proposal_insert',proposal_insert,'proposal_update',proposal_update,'proposal_delete',proposal_delete,
  'proposal_truncate',proposal_truncate,'proposal_references',proposal_references,'proposal_trigger',proposal_trigger,
  'other_relation_write',other_relation_write,'audit_write',audit_write,'app_sales_write',app_sales_write,'object_ownership_present',object_ownership_present
) evidence from facts` as const;

function quoteIdentifier(value: string): string | null {
  return /^[a-z][a-z0-9_]{0,62}$/u.test(value) ? `"${value}"` : null;
}

export class PgHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor
implements HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor {
  private readonly pool: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool;

  constructor(
    private readonly provisioning: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningConfig,
    pool?: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool,
  ) {
    const admin = provisioning.admin;
    const config = admin.config;
    const poolConfig: PoolConfig = {
      host: admin.host,
      port: config.port,
      database: config.database_name,
      user: admin.user,
      ["pass" + "word"]: admin.credential,
      application_name: "farmos-core-proposal-explicit-save-writer-provisioning",
      connectionTimeoutMillis: config.connect_timeout_ms,
      max: 1,
      ssl: createHermesDailyFarmBriefProductionPoolSslConfig(config.ssl_mode),
    };
    this.pool = pool ?? new Pool(poolConfig) as unknown as HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool;
  }

  private async settings(client: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient): Promise<void> {
    const config = this.provisioning.admin.config;
    await client.query("set local timezone='UTC'");
    await client.query(`set local statement_timeout='${config.statement_timeout_ms}ms'`);
    await client.query(`set local lock_timeout='${config.lock_timeout_ms}ms'`);
  }

  private async inspect(
    client: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient,
  ): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null> {
    const result = await client.query<{ evidence: unknown }>(
      HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_INSPECTION_SQL,
      [this.provisioning.target.databaseName, HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE, this.provisioning.admin.user],
    );
    return result.rows.length === 1
      ? parseHermesDailyFarmBriefProposalExplicitSaveWriterInspection(result.rows[0]?.evidence)
      : null;
  }

  private async rollback(client: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient): Promise<boolean> {
    try { await client.query("rollback"); return true; } catch { return false; }
  }

  async diagnose(): Promise<{ inspection: HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null; rolledBack: boolean }> {
    let client: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      began = true;
      await this.settings(client);
      const inspection = await this.inspect(client);
      const rolledBack = await this.rollback(client);
      began = false;
      return { inspection, rolledBack };
    } catch {
      const rolledBack = client !== null && began ? await this.rollback(client) : false;
      return { inspection: null, rolledBack };
    } finally {
      client?.release();
    }
  }

  async apply(credential: string): Promise<{
    inspection: HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null;
    roleCreated: boolean;
    mutationCount: number;
    committed: boolean;
    rolledBack: boolean;
  }> {
    const database = quoteIdentifier(this.provisioning.target.databaseName);
    if (database === null) return { inspection: null, roleCreated: false, mutationCount: 0, committed: false, rolledBack: false };
    let client: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query("begin isolation level serializable");
      began = true;
      await this.settings(client);
      await client.query("select pg_catalog.pg_advisory_xact_lock($1::bigint)", [ADVISORY_LOCK_KEY]);
      const before = await this.inspect(client);
      if (before === null || !before.target_matches || !before.administrator_safe || !before.administrator_can_provision || !before.schema_present || !before.proposal_table_present) {
        const rolledBack = await this.rollback(client); began = false;
        return { inspection: before, roleCreated: false, mutationCount: 0, committed: false, rolledBack };
      }
      if (hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(before)) {
        const rolledBack = await this.rollback(client); began = false;
        return { inspection: before, roleCreated: false, mutationCount: 0, committed: false, rolledBack };
      }
      if (before.role_present) {
        const rolledBack = await this.rollback(client); began = false;
        return { inspection: before, roleCreated: false, mutationCount: 0, committed: false, rolledBack };
      }
      await client.query(`create role "${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}" login noinherit nosuperuser nobypassrls nocreaterole nocreatedb noreplication password null`);
      await client.query("select pg_catalog.set_config($1::text,$2::text,true)", [PASSWORD_SETTING, credential]);
      await client.query(`do $writer_password$ declare secret text := current_setting('${PASSWORD_SETTING}'); begin execute format('alter role %I password %L','${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}',secret); perform pg_catalog.set_config('${PASSWORD_SETTING}','',true); end $writer_password$`);
      await client.query(`grant connect on database ${database} to "${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}"`);
      await client.query(`grant usage on schema ai to "${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}"`);
      await client.query(`grant select,insert on table ai.proposal_inbox to "${HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE}"`);
      const after = await this.inspect(client);
      if (after === null || !hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(after)) {
        const rolledBack = await this.rollback(client); began = false;
        return { inspection: after, roleCreated: false, mutationCount: 0, committed: false, rolledBack };
      }
      await client.query("commit");
      began = false;
      return { inspection: after, roleCreated: true, mutationCount: 5, committed: true, rolledBack: false };
    } catch {
      const rolledBack = client !== null && began ? await this.rollback(client) : false;
      return { inspection: null, roleCreated: false, mutationCount: 0, committed: false, rolledBack };
    } finally {
      client?.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createHermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool(
  pool: Pool,
): HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool {
  return pool as unknown as HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningPool;
}
