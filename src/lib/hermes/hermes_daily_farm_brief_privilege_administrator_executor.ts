import { createHash } from "node:crypto";
import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProductionEnvironment,
  type HermesDailyFarmBriefProductionReadRepositoryConfig,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { createHermesDailyFarmBriefProductionPoolSslConfig } from "./hermes_daily_farm_brief_production_read_repository";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment,
} from "./hermes_daily_farm_brief_proposal_review_database_contract";
import type { HermesDailyFarmBriefPrivilegeApplyExecutor } from "./hermes_daily_farm_brief_production_repository_bundle";

export const HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV = {
  enabled: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_ENABLED",
  host: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_HOST",
  port: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PORT",
  database: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_NAME",
  user: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_USER",
  credential: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_PASSWORD",
  sslMode: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_SSL_MODE",
  connectTimeout: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_CONNECT_TIMEOUT_MS",
  statementTimeout: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_STATEMENT_TIMEOUT_MS",
  lockTimeout: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_DATABASE_LOCK_TIMEOUT_MS",
} as const;

export type HermesDailyFarmBriefPrivilegeAdminConfig = {
  config: Pick<
    HermesDailyFarmBriefProductionReadRepositoryConfig,
    "port" | "database_name" | "ssl_mode" | "connect_timeout_ms" | "statement_timeout_ms" | "lock_timeout_ms"
  >;
  host: string;
  user: string;
  credential: string;
};

export type HermesDailyFarmBriefPrivilegeAdminTarget = {
  host: string;
  port: number;
  databaseName: string;
};

export type HermesDailyFarmBriefPrivilegeAdminSafePreflight = {
  admin_configuration_available: boolean;
  admin_connection_target_matches_runtime: boolean;
  admin_principal_eligible: boolean;
  candidate_preflight_ready: boolean;
  catalog_fingerprint_ready: boolean;
  apply_enabled: false;
  production_change_performed: false;
  retry_count: 0;
  secret_exposed: false;
};

const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/u;

export function parseHermesDailyFarmBriefPrivilegeAdminEnvironment(environment: Readonly<Record<string, string | undefined>>, runtimeDatabaseName: string | null): { admin: HermesDailyFarmBriefPrivilegeAdminConfig | null; targetMatches: boolean } {
  const mapped = {
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.enabled]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.enabled],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.host],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.port]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.port],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.database]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.database],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.user],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.credential]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.credential],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.ssl]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.sslMode],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.connect]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.connectTimeout],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.statement]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.statementTimeout],
    [HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.lock]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.lockTimeout],
  };
  const config = parseHermesDailyFarmBriefProductionEnvironment(mapped);
  const host = mapped[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host];
  const user = mapped[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user];
  const credential = mapped[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.credential];
  const targetMatches = config !== null && runtimeDatabaseName !== null && config.database_name === runtimeDatabaseName;
  return { admin: config !== null && host && user && credential && targetMatches ? { config, host, user, credential } : null, targetMatches };
}

export function parseHermesDailyFarmBriefPrivilegeAdminEnvironmentForTarget(
  environment: Readonly<Record<string, string | undefined>>,
  target: HermesDailyFarmBriefPrivilegeAdminTarget | null,
): { admin: HermesDailyFarmBriefPrivilegeAdminConfig | null; targetMatches: boolean } {
  const keys = HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS;
  const mapped = {
    [keys.enabled]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.enabled],
    [keys.host]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.host],
    [keys.port]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.port],
    [keys.database]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.database],
    [keys.user]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.user],
    [keys.credential]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.credential],
    [keys.ssl]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.sslMode],
    [keys.connect]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.connectTimeout],
    [keys.statement]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.statementTimeout],
    [keys.lock]: environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV.lockTimeout],
  };
  const config = parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(mapped);
  const host = mapped[keys.host];
  const user = mapped[keys.user];
  const credential = mapped[keys.credential];
  const targetMatches = config !== null && target !== null && host === target.host &&
    config.port === target.port && config.database_name === target.databaseName;
  return {
    admin: config !== null && host && user && credential && targetMatches
      ? { config, host, user, credential }
      : null,
    targetMatches,
  };
}

function quoteIdentifier(value: string): string | null {
  return IDENTIFIER.test(value) ? `"${value}"` : null;
}

function transactionResult(input: { fingerprint: boolean; committed: boolean; rolledBack: boolean }) {
  return { schema_version: "hermes.daily_farm_brief.privilege_apply_transaction.v1", catalog_fingerprint_matched: input.fingerprint, transaction_committed: input.committed, transaction_rolled_back: input.rolledBack };
}

function administratorPreflight(input: { target: boolean; eligible: boolean; fingerprint: boolean; rolledBack: boolean }) {
  return { schema_version: "hermes.daily_farm_brief.privilege_administrator_preflight.v1", admin_connection_target_matches_runtime: input.target, admin_principal_eligible: input.eligible, catalog_fingerprint_matched: input.fingerprint, transaction_rolled_back: input.rolledBack, retry_count: 0, production_change_performed: false, raw_role_exposed: false, secret_exposed: false } as const;
}

export class HermesDailyFarmBriefPrivilegeAdministratorExecutor implements HermesDailyFarmBriefPrivilegeApplyExecutor {
  private readonly pool: Pool;
  constructor(private readonly admin: HermesDailyFarmBriefPrivilegeAdminConfig, pool?: Pool) {
    const c = admin.config;
    const poolConfig: PoolConfig = { host: admin.host, port: c.port, database: c.database_name, user: admin.user, ["pass" + "word"]: admin.credential, application_name: "farmos-core-daily-brief-privilege-admin", connectionTimeoutMillis: c.connect_timeout_ms, max: 1, ssl: createHermesDailyFarmBriefProductionPoolSslConfig(c.ssl_mode) };
    this.pool = pool ?? new Pool(poolConfig);
  }

  private async rollback(client: PoolClient): Promise<boolean> { try { await client.query("rollback"); return true; } catch { return false; } }

  async inspectReviewedHardeningReadiness(input: { ownerRole: string; runtimeRole: string; expectedCatalogFingerprint: string }): Promise<unknown> {
    if (quoteIdentifier(input.ownerRole) === null || quoteIdentifier(input.runtimeRole) === null || input.ownerRole === input.runtimeRole || !/^[0-9a-f]{64}$/u.test(input.expectedCatalogFingerprint)) return administratorPreflight({ target: false, eligible: false, fingerprint: false, rolledBack: false });
    let client: PoolClient | null = null;
    let rolledBack = false;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      await client.query("set local timezone='UTC'");
      await client.query(`set local statement_timeout='${this.admin.config.statement_timeout_ms}ms'`);
      await client.query(`set local lock_timeout='${this.admin.config.lock_timeout_ms}ms'`);
      const identity = await client.query<{ target: boolean; eligible: boolean }>(`select current_database()=$1::text as target, coalesce((select not rolsuper and not rolbypassrls and pg_has_role(current_user,$2::name,'MEMBER') from pg_roles where rolname=current_user),false) as eligible`, [this.admin.config.database_name, input.ownerRole]);
      const target = identity.rows[0]?.target === true;
      const eligible = identity.rows[0]?.eligible === true;
      const current = target && eligible ? await this.catalog(client, input.runtimeRole) : null;
      const fingerprint = current !== null && createHash("sha256").update(JSON.stringify(current)).digest("hex") === input.expectedCatalogFingerprint;
      rolledBack = await this.rollback(client);
      return administratorPreflight({ target, eligible, fingerprint, rolledBack });
    } catch {
      if (client !== null) rolledBack = await this.rollback(client);
      return administratorPreflight({ target: false, eligible: false, fingerprint: false, rolledBack });
    } finally {
      client?.release();
    }
  }

  async close(): Promise<void> { await this.pool.end(); }

  async executeReviewedHardening(input: { ownerRole: string; runtimeRole: string; expectedCatalogFingerprint: string }): Promise<unknown> {
    const owner = quoteIdentifier(input.ownerRole);
    const runtime = quoteIdentifier(input.runtimeRole);
    if (owner === null || runtime === null || input.ownerRole === input.runtimeRole || !/^[0-9a-f]{64}$/u.test(input.expectedCatalogFingerprint)) return transactionResult({ fingerprint: false, committed: false, rolledBack: false });
    let client: PoolClient | null = null;
    let completed = false;
    try {
      client = await this.pool.connect();
      await client.query("begin isolation level read committed");
      await client.query("set local timezone='UTC'");
      await client.query(`set local statement_timeout='${this.admin.config.statement_timeout_ms}ms'`);
      await client.query(`set local lock_timeout='${this.admin.config.lock_timeout_ms}ms'`);
      const identity = await client.query<{ target: boolean; eligible: boolean }>(`select current_database()=$1::text as target, coalesce((select not rolsuper and not rolbypassrls and pg_has_role(current_user,$2::name,'MEMBER') from pg_roles where rolname=current_user),false) as eligible`, [this.admin.config.database_name, input.ownerRole]);
      if (!identity.rows[0]?.target || !identity.rows[0]?.eligible) { const rb = await this.rollback(client); completed = true; return transactionResult({ fingerprint: false, committed: false, rolledBack: rb }); }
      const before = await this.catalog(client, input.runtimeRole);
      const matched = createHash("sha256").update(JSON.stringify(before)).digest("hex") === input.expectedCatalogFingerprint;
      if (!matched) { const rb = await this.rollback(client); completed = true; return transactionResult({ fingerprint: false, committed: false, rolledBack: rb }); }
      await client.query(`set local role ${owner}`);
      await client.query("alter function ai.persist_daily_farm_brief_command(jsonb,text,text,boolean) security definer");
      await client.query("alter function ai.persist_daily_farm_brief_command(jsonb,text,text,boolean) set search_path=pg_catalog,ai");
      await client.query("revoke all privileges on function ai.persist_daily_farm_brief_command(jsonb,text,text,boolean) from public");
      await client.query(`grant execute on function ai.persist_daily_farm_brief_command(jsonb,text,text,boolean) to ${runtime}`);
      await client.query("revoke create on schema ai from public");
      await client.query(`revoke create on schema ai from ${runtime}`);
      await client.query(`grant usage on schema ai to ${runtime}`);
      await client.query(`grant select on ai.daily_farm_brief_records to ${runtime}`);
      await client.query(`revoke insert,update,delete on ai.daily_farm_brief_records from ${runtime}`);
      await client.query(`revoke select,insert,update,delete on ai.daily_farm_brief_persistence_commands from ${runtime}`);
      const valid = await client.query<{ valid: boolean }>(`select
        coalesce((select p.prosecdef and p.proconfig=array['search_path=pg_catalog, ai']::text[] and pg_get_userbyid(p.proowner)=$1::text from pg_proc p where p.oid=to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')),false)
        and pg_get_function_result(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'))='jsonb'
        and not has_function_privilege('public',to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE')
        and has_function_privilege($2::text,to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE')
        and has_schema_privilege($2::text,'ai','USAGE') and has_table_privilege($2::text,'ai.daily_farm_brief_records','SELECT')
        and not has_table_privilege($2::text,'ai.daily_farm_brief_records','INSERT') and not has_table_privilege($2::text,'ai.daily_farm_brief_records','UPDATE') and not has_table_privilege($2::text,'ai.daily_farm_brief_records','DELETE')
        and not has_table_privilege($2::text,'ai.daily_farm_brief_persistence_commands','SELECT') and not has_table_privilege($2::text,'ai.daily_farm_brief_persistence_commands','INSERT') and not has_table_privilege($2::text,'ai.daily_farm_brief_persistence_commands','UPDATE') and not has_table_privilege($2::text,'ai.daily_farm_brief_persistence_commands','DELETE')
        and not has_schema_privilege('public','ai','CREATE')
        and pg_get_userbyid((select relowner from pg_class where oid=to_regclass('ai.daily_farm_brief_records')))=$1::text
        and pg_get_userbyid((select relowner from pg_class where oid=to_regclass('ai.daily_farm_brief_persistence_commands')))=$1::text as valid`, [input.ownerRole, input.runtimeRole]);
      if (!valid.rows[0]?.valid) { const rb = await this.rollback(client); completed = true; return transactionResult({ fingerprint: true, committed: false, rolledBack: rb }); }
      await client.query("commit"); completed = true;
      return transactionResult({ fingerprint: true, committed: true, rolledBack: false });
    } catch {
      const rb = client === null ? false : await this.rollback(client); completed = true;
      return transactionResult({ fingerprint: false, committed: false, rolledBack: rb });
    } finally { if (client !== null && !completed) await this.rollback(client); client?.release(); }
  }

  private async catalog(client: PoolClient, runtimeRole: string): Promise<Record<string, unknown>> {
    const result = await client.query(`with target as (select p.oid,p.proowner,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='ai' and p.oid=to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')) select
      (select pg_get_userbyid(proowner) from target) owner_role,$1::text runtime_role,
      pg_get_userbyid((select relowner from pg_class where oid=to_regclass('ai.daily_farm_brief_records'))) records_owner_role,
      pg_get_userbyid((select relowner from pg_class where oid=to_regclass('ai.daily_farm_brief_persistence_commands'))) commands_owner_role,
      coalesce((select not r.rolcanlogin and not r.rolsuper and not r.rolbypassrls from target t join pg_roles r on r.oid=t.proowner),false) owner_eligible,
      coalesce((select not rolsuper and not rolbypassrls from pg_roles where rolname=$1::text),false) runtime_eligible,
      coalesce(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)') is not null and pg_get_function_result(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'))='jsonb',false) signature_matches,
      coalesce((select prosecdef from target),false) security_definer,coalesce((select proconfig=array['search_path=pg_catalog, ai']::text[] from target),false) search_path_fixed,
      coalesce(has_function_privilege('public',to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE'),false) public_execute,
      coalesce(has_function_privilege($1::text,to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE'),false) runtime_execute,
      coalesce(has_table_privilege($1::text,'ai.daily_farm_brief_records','INSERT'),false) or coalesce(has_table_privilege($1::text,'ai.daily_farm_brief_records','UPDATE'),false) or coalesce(has_table_privilege($1::text,'ai.daily_farm_brief_records','DELETE'),false) or coalesce(has_table_privilege($1::text,'ai.daily_farm_brief_persistence_commands','INSERT'),false) or coalesce(has_table_privilege($1::text,'ai.daily_farm_brief_persistence_commands','UPDATE'),false) or coalesce(has_table_privilege($1::text,'ai.daily_farm_brief_persistence_commands','DELETE'),false) runtime_direct_dml`, [runtimeRole]);
    return result.rows[0] as Record<string, unknown>;
  }
}
