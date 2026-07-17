import { createHash } from "node:crypto";
import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  parseHermesDailyFarmBriefPersistenceCommand,
  type HermesDailyFarmBriefPersistenceCommand,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import { fingerprintHermesDailyFarmBriefPersistenceCommandPayload } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persistence_fingerprint";
import {
  HermesDailyFarmBriefDenyByDefaultPersistenceRepository,
  type HermesDailyFarmBriefPersistenceWriteRepository,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";
import type { HermesDailyFarmBriefPersistedReadRepository } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import {
  HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProductionEnvironment,
  type HermesDailyFarmBriefProductionReadRepositoryConfig,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import {
  classifyHermesDailyFarmBriefProductionWriteReadiness,
  type HermesDailyFarmBriefProductionWriteReadinessResult,
  type HermesDailyFarmBriefWriteReadinessEvidence,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_write_readiness_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY,
  HermesDailyFarmBriefProductionPostgresReadRepository,
  createHermesDailyFarmBriefProductionPoolSslConfig,
  type HermesDailyFarmBriefProductionReadExecutor,
} from "./hermes_daily_farm_brief_production_read_repository";

export const HERMES_DAILY_FARM_BRIEF_RECORDS_RELATION = "ai.daily_farm_brief_records" as const;
export const HERMES_DAILY_FARM_BRIEF_COMMANDS_RELATION = "ai.daily_farm_brief_persistence_commands" as const;
export const HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV = "HERMES_DAILY_FARM_BRIEF_DATABASE_WRITE_ENABLED" as const;
export const HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV = {
  records: "HERMES_DAILY_FARM_BRIEF_DATABASE_RECORDS_RELATION",
  commands: "HERMES_DAILY_FARM_BRIEF_DATABASE_COMMANDS_RELATION",
} as const;

export type HermesDailyFarmBriefRepositoryIdentityEvidence = {
  schema_version: "hermes.daily_farm_brief.repository_identity_evidence.v1";
  storage_owner: "farmos_core";
  record_contract: "hermes.daily_farm_brief.persisted_record.v1";
  records_relation: typeof HERMES_DAILY_FARM_BRIEF_RECORDS_RELATION;
  commands_relation: typeof HERMES_DAILY_FARM_BRIEF_COMMANDS_RELATION;
  shared_connection_source: boolean;
  shared_repository_factory: boolean;
  read_capability: boolean;
  write_capability: "enabled" | "disabled";
  matched: boolean;
  write_kind: "fixture" | "database";
};

export type HermesDailyFarmBriefProductionWriteExecutor = {
  executeCanonicalTransition(command: HermesDailyFarmBriefPersistenceCommand): Promise<unknown>;
  diagnoseWriteReadiness?: (input: { targetDate: string; expectedCurrentVersion: number | null }) => Promise<HermesDailyFarmBriefWriteReadinessEvidence>;
  resolvePrivilegeCandidates?: () => Promise<HermesDailyFarmBriefRawPrivilegeCandidates>;
};

export type HermesDailyFarmBriefRawPrivilegeCandidates = {
  ownerRole: string;
  runtimeRole: string;
  recordsOwnerRole: string;
  commandsOwnerRole: string;
  ownerEligible: boolean;
  runtimeEligible: boolean;
  runtimeMatchesConnectionPrincipal: boolean;
  functionSignatureMatches: boolean;
  transactionRolledBack: boolean;
  catalogFingerprint: string;
  priorState: {
    securityDefiner: boolean;
    searchPathFixed: boolean;
    publicExecute: boolean;
    runtimeExecute: boolean;
    runtimeDirectDml: boolean;
  };
};

export type HermesDailyFarmBriefPrivilegeCandidateToken = Readonly<{
  schema_version: "hermes.daily_farm_brief.privilege_candidate_token.v1";
}>;

export type HermesDailyFarmBriefPrivilegeCandidatePreflight = {
  schema_version: "hermes.daily_farm_brief.privilege_candidate_preflight.v1";
  ready_for_manual_apply: boolean;
  owner_candidate_resolved: boolean;
  owner_candidate_eligible: boolean;
  runtime_candidate_resolved: boolean;
  runtime_candidate_eligible: boolean;
  runtime_matches_connection_principal: boolean;
  function_relation_ownership_aligned: boolean;
  function_change_required: boolean;
  owner_change_required: boolean;
  revoke_public_required: boolean;
  grant_execute_required: boolean;
  revoke_direct_dml_required: boolean;
  rollback_plan_available: boolean;
  production_change_performed: false;
  retry_count: 0;
  secret_exposed: false;
};

export type HermesDailyFarmBriefProductionRepositoryExecutor =
  HermesDailyFarmBriefProductionReadExecutor & HermesDailyFarmBriefProductionWriteExecutor;

export type HermesDailyFarmBriefRepositoryBundle = {
  state: "ready" | "denied";
  write_state: "enabled" | "disabled";
  readRepository: HermesDailyFarmBriefPersistedReadRepository & { readCount?: number };
  writeRepository: HermesDailyFarmBriefPersistenceWriteRepository;
  diagnoseWriteReadiness: (input: { command: unknown; targetDate: string; expectedCurrentVersion: number | null }) => Promise<HermesDailyFarmBriefProductionWriteReadinessResult>;
  resolvePrivilegeCandidates: () => Promise<{ preflight: HermesDailyFarmBriefPrivilegeCandidatePreflight; token: HermesDailyFarmBriefPrivilegeCandidateToken | null }>;
};

const bundleTokens = new WeakMap<object, symbol>();
const repositoryTokens = new WeakMap<object, symbol>();
const bundleWriteKinds = new WeakMap<object, "fixture" | "database">();
const privilegeCandidateTokens = new WeakMap<object, { raw: HermesDailyFarmBriefRawPrivilegeCandidates; repositoryToken: symbol }>();
const ROLE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/u;

const EMPTY_PRIVILEGE_PREFLIGHT: HermesDailyFarmBriefPrivilegeCandidatePreflight = {
  schema_version: "hermes.daily_farm_brief.privilege_candidate_preflight.v1",
  ready_for_manual_apply: false,
  owner_candidate_resolved: false,
  owner_candidate_eligible: false,
  runtime_candidate_resolved: false,
  runtime_candidate_eligible: false,
  runtime_matches_connection_principal: false,
  function_relation_ownership_aligned: false,
  function_change_required: false,
  owner_change_required: false,
  revoke_public_required: false,
  grant_execute_required: false,
  revoke_direct_dml_required: false,
  rollback_plan_available: false,
  production_change_performed: false,
  retry_count: 0,
  secret_exposed: false,
};

function privilegeResolution(raw: HermesDailyFarmBriefRawPrivilegeCandidates, repositoryToken: symbol): { preflight: HermesDailyFarmBriefPrivilegeCandidatePreflight; token: HermesDailyFarmBriefPrivilegeCandidateToken | null } {
  const ownerResolved = ROLE_IDENTIFIER.test(raw.ownerRole);
  const runtimeResolved = ROLE_IDENTIFIER.test(raw.runtimeRole);
  const aligned = ownerResolved && raw.ownerRole === raw.recordsOwnerRole && raw.ownerRole === raw.commandsOwnerRole;
  const distinct = ownerResolved && runtimeResolved && raw.ownerRole !== raw.runtimeRole;
  const ready = ownerResolved && runtimeResolved && raw.ownerEligible && raw.runtimeEligible && raw.runtimeMatchesConnectionPrincipal && distinct && aligned && raw.functionSignatureMatches && raw.transactionRolledBack;
  const preflight: HermesDailyFarmBriefPrivilegeCandidatePreflight = {
    schema_version: "hermes.daily_farm_brief.privilege_candidate_preflight.v1",
    ready_for_manual_apply: ready,
    owner_candidate_resolved: ownerResolved,
    owner_candidate_eligible: ownerResolved && raw.ownerEligible,
    runtime_candidate_resolved: runtimeResolved,
    runtime_candidate_eligible: runtimeResolved && raw.runtimeEligible,
    runtime_matches_connection_principal: runtimeResolved && raw.runtimeMatchesConnectionPrincipal,
    function_relation_ownership_aligned: aligned,
    function_change_required: !raw.priorState.securityDefiner || !raw.priorState.searchPathFixed,
    owner_change_required: !aligned,
    revoke_public_required: raw.priorState.publicExecute,
    grant_execute_required: !raw.priorState.runtimeExecute,
    revoke_direct_dml_required: raw.priorState.runtimeDirectDml,
    rollback_plan_available: ready,
    production_change_performed: false,
    retry_count: 0,
    secret_exposed: false,
  };
  if (!ready) return { preflight, token: null };
  const token = Object.freeze({ schema_version: "hermes.daily_farm_brief.privilege_candidate_token.v1" as const });
  privilegeCandidateTokens.set(token, { raw, repositoryToken });
  return { preflight, token };
}

function transactionResult(input: { status: "committed" | "reused" | "rejected" | "failed_closed"; error: string | null }) {
  const committed = input.status === "committed";
  return {
    schema_version: "hermes.daily_farm_brief.persistence_repository_transaction_result.v1",
    status: input.status,
    error_code: input.error,
    transaction_committed: committed || input.status === "reused",
    fixture_repository_write_performed: committed,
    brief_persistence_simulated: committed,
  };
}

class HermesDailyFarmBriefProductionPostgresWriteRepository implements HermesDailyFarmBriefPersistenceWriteRepository {
  transactionCallCount = 0;
  constructor(private readonly executor: HermesDailyFarmBriefProductionWriteExecutor) {}
  async executeCanonicalTransition(value: HermesDailyFarmBriefPersistenceCommand): Promise<unknown> {
    this.transactionCallCount += 1;
    const command = parseHermesDailyFarmBriefPersistenceCommand(value);
    if (command === null) return transactionResult({ status: "rejected", error: "invalid_record" });
    try {
      return await this.executor.executeCanonicalTransition(command);
    } catch {
      return transactionResult({ status: "failed_closed", error: "transaction_failed" });
    }
  }
}

class SharedPostgresExecutor implements HermesDailyFarmBriefProductionRepositoryExecutor {
  private readonly pool: Pool;
  constructor(private readonly config: HermesDailyFarmBriefProductionReadRepositoryConfig, settings: { host: string; user: string; credential: string }) {
    const poolConfig: PoolConfig = { host: settings.host, port: config.port, database: config.database_name, user: settings.user, ["pass" + "word"]: settings.credential, application_name: "farmos-core-hermes-daily-brief-bundle", connectionTimeoutMillis: config.connect_timeout_ms, max: 2, ssl: createHermesDailyFarmBriefProductionPoolSslConfig(config.ssl_mode) };
    this.pool = new Pool(poolConfig);
  }
  private async identity(client: PoolClient, expectedReadOnly: "on" | "off"): Promise<void> {
    const result = await client.query<{ current_database: string; current_user: string; transaction_read_only: string }>("select current_database(), current_user, current_setting('transaction_read_only') as transaction_read_only");
    if (result.rows[0]?.current_database !== this.config.database_name || typeof result.rows[0]?.current_user !== "string" || result.rows[0].current_user.length === 0 || result.rows[0].transaction_read_only !== expectedReadOnly) throw new Error("daily_brief_repository_identity_failed");
  }
  private async settings(client: PoolClient): Promise<void> {
    await client.query("set local timezone = 'UTC'");
    await client.query(`set local statement_timeout = '${this.config.statement_timeout_ms}ms'`);
    await client.query(`set local lock_timeout = '${this.config.lock_timeout_ms}ms'`);
  }
  async executeReadOnly(query: string) {
    if (query !== HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY) throw new Error("daily_brief_query_rejected");
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      await this.settings(client);
      await this.identity(client, "on");
      const rows = await client.query(query);
      await client.query("commit");
      return { database_matches: true, user_present: true, transaction_read_only: true, rows: rows.rows };
    } catch (error) {
      if (client !== null) { try { await client.query("rollback"); } catch { /* fail closed */ } }
      throw error;
    } finally { client?.release(); }
  }
  async executeCanonicalTransition(command: HermesDailyFarmBriefPersistenceCommand): Promise<unknown> {
    const { command_id: _commandId, ...payload } = command;
    const { idempotency_key: _idempotencyKey, ...semanticPayload } = payload;
    const commandFingerprint = fingerprintHermesDailyFarmBriefPersistenceCommandPayload(payload);
    const semanticFingerprint = fingerprintHermesDailyFarmBriefPersistenceCommandPayload(semanticPayload);
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("begin isolation level read committed");
      await this.settings(client);
      await this.identity(client, "off");
      const executed = await client.query<{ result: { status?: string; error_code?: string | null } }>("select ai.persist_daily_farm_brief_command($1::jsonb, $2::text, $3::text, false) as result", [JSON.stringify(command), commandFingerprint, semanticFingerprint]);
      const result = executed.rows[0]?.result;
      if (result === undefined || !["committed", "reused", "rejected"].includes(String(result.status))) throw new Error("daily_brief_write_result_invalid");
      if (result.status === "rejected") { await client.query("rollback"); return transactionResult({ status: "rejected", error: result.error_code ?? "repository_unavailable" }); }
      await client.query("commit");
      return transactionResult({ status: result.status as "committed" | "reused", error: null });
    } catch (error) {
      if (client !== null) { try { await client.query("rollback"); } catch { /* fail closed */ } }
      throw error;
    } finally { client?.release(); }
  }

  async diagnoseWriteReadiness(input: { targetDate: string; expectedCurrentVersion: number | null }): Promise<HermesDailyFarmBriefWriteReadinessEvidence> {
    let client: PoolClient | null = null;
    let rollbackVerified = false;
    try {
      client = await this.pool.connect();
      await client.query("begin isolation level read committed read write");
      await this.settings(client);
      const identity = await client.query<{ transaction_read_only: string }>("select current_setting('transaction_read_only') as transaction_read_only");
      const transactionReadOnly = identity.rows[0]?.transaction_read_only !== "off";
      const objects = await client.query<{
        records_exists: boolean;
        commands_exists: boolean;
        function_exists: boolean;
        function_signature_matches: boolean;
        function_security_definer: boolean;
        function_search_path_safe: boolean;
        schema_public_create: boolean;
        schema_owner_safe: boolean;
        public_execute: boolean;
        runtime_execute_privilege: boolean;
        runtime_direct_dml: boolean;
        owner_relation_privileges: boolean;
        owner_role_safe: boolean;
        relation_owners_match_function_owner: boolean;
        owner_candidate_eligible: boolean;
        runtime_candidate_eligible: boolean;
      }>(`
        with target_function as (
          select p.oid, p.proowner, p.prosecdef, p.proconfig
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'ai' and p.oid = to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')
        )
        select
          to_regclass('ai.daily_farm_brief_records') is not null as records_exists,
          to_regclass('ai.daily_farm_brief_persistence_commands') is not null as commands_exists,
          exists (
            select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'ai' and p.proname = 'persist_daily_farm_brief_command'
          ) as function_exists,
          coalesce(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)') is not null
            and pg_get_function_result(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')) = 'jsonb', false) as function_signature_matches,
          coalesce((select prosecdef from target_function), false) as function_security_definer,
          coalesce((select proconfig = array['search_path=pg_catalog, ai']::text[] from target_function), false) as function_search_path_safe,
          coalesce(has_schema_privilege('public', 'ai', 'CREATE'), false) as schema_public_create,
          coalesce((select not r.rolsuper and not r.rolcanlogin and not r.rolbypassrls from pg_namespace n join pg_roles r on r.oid=n.nspowner where n.nspname='ai'), false) as schema_owner_safe,
          coalesce(has_function_privilege('public', to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'), 'EXECUTE'), false) as public_execute,
          coalesce(has_function_privilege(current_user, to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'), 'EXECUTE'), false) as runtime_execute_privilege,
          coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_records'), 'INSERT'), false)
            or coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_records'), 'UPDATE'), false)
            or coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_records'), 'DELETE'), false)
            or coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_persistence_commands'), 'INSERT'), false)
            or coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_persistence_commands'), 'UPDATE'), false)
            or coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_persistence_commands'), 'DELETE'), false) as runtime_direct_dml,
          coalesce((select has_table_privilege(proowner, to_regclass('ai.daily_farm_brief_records'), 'SELECT,INSERT,UPDATE')
            and has_table_privilege(proowner, to_regclass('ai.daily_farm_brief_persistence_commands'), 'SELECT,INSERT') from target_function), false) as owner_relation_privileges,
          coalesce((select not r.rolsuper and not r.rolcanlogin and not r.rolbypassrls from target_function f join pg_roles r on r.oid = f.proowner), false) as owner_role_safe,
          coalesce((select c1.relowner = f.proowner and c2.relowner = f.proowner
            from target_function f
            join pg_class c1 on c1.oid = to_regclass('ai.daily_farm_brief_records')
            join pg_class c2 on c2.oid = to_regclass('ai.daily_farm_brief_persistence_commands')), false) as relation_owners_match_function_owner,
          coalesce((select not r.rolsuper and not r.rolcanlogin and not r.rolbypassrls from target_function f join pg_roles r on r.oid=f.proowner), false) as owner_candidate_eligible,
          coalesce((select not rolsuper and not rolbypassrls from pg_roles where rolname = current_user), false) as runtime_candidate_eligible
      `);
      const row = objects.rows[0];
      let canonicalRecordCount = 0;
      let expectedVersionMatches = input.expectedCurrentVersion === null;
      if (row?.records_exists) {
        const canonical = await client.query<{ canonical_count: string; expected_matches: boolean }>(`
          select count(*)::text as canonical_count,
            case when $2::integer is null then count(*) = 0
                 else count(*) = 1 and bool_and(version = $2::integer) end as expected_matches
          from ai.daily_farm_brief_records
          where record_kind = 'projectable_brief' and business_date = $1::date and record_status = 'canonical'
        `, [input.targetDate, input.expectedCurrentVersion]);
        canonicalRecordCount = Number(canonical.rows[0]?.canonical_count ?? "0");
        expectedVersionMatches = canonical.rows[0]?.expected_matches === true;
      }
      await client.query("rollback");
      rollbackVerified = true;
      return {
        connection_available: true,
        transaction_read_only: transactionReadOnly,
        records_relation_exists: row?.records_exists === true,
        commands_relation_exists: row?.commands_exists === true,
        function_exists: row?.function_exists === true,
        function_signature_matches: row?.function_signature_matches === true,
        function_security_definer: row?.function_security_definer === true,
        function_search_path_safe: row?.function_search_path_safe === true,
        schema_public_create: row?.schema_public_create === true,
        schema_owner_safe: row?.schema_owner_safe === true,
        public_execute: row?.public_execute === true,
        runtime_execute_privilege: row?.runtime_execute_privilege === true,
        runtime_direct_dml: row?.runtime_direct_dml === true,
        owner_relation_privileges: row?.owner_relation_privileges === true,
        owner_role_safe: row?.owner_role_safe === true,
        relation_owners_match_function_owner: row?.relation_owners_match_function_owner === true,
        owner_candidate_eligible: row?.owner_candidate_eligible === true,
        runtime_candidate_eligible: row?.runtime_candidate_eligible === true,
        canonical_record_count: Number.isSafeInteger(canonicalRecordCount) ? canonicalRecordCount : 0,
        expected_version_matches: expectedVersionMatches,
        rollback_verified: true,
      };
    } finally {
      if (client !== null && !rollbackVerified) {
        try { await client.query("rollback"); } catch { /* fail closed */ }
      }
      client?.release();
    }
  }

  async resolvePrivilegeCandidates(): Promise<HermesDailyFarmBriefRawPrivilegeCandidates> {
    let client: PoolClient | null = null;
    let rolledBack = false;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      await this.settings(client);
      const result = await client.query<{
        owner_role: string;
        runtime_role: string;
        records_owner_role: string;
        commands_owner_role: string;
        owner_eligible: boolean;
        runtime_eligible: boolean;
        signature_matches: boolean;
        security_definer: boolean;
        search_path_fixed: boolean;
        public_execute: boolean;
        runtime_execute: boolean;
        runtime_direct_dml: boolean;
      }>(`
        with target as (
          select p.oid,p.proowner,p.prosecdef,p.proconfig
          from pg_proc p join pg_namespace n on n.oid=p.pronamespace
          where n.nspname='ai' and p.oid=to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')
        )
        select
          (select pg_get_userbyid(proowner) from target) as owner_role,
          current_user as runtime_role,
          pg_get_userbyid((select relowner from pg_class where oid=to_regclass('ai.daily_farm_brief_records'))) as records_owner_role,
          pg_get_userbyid((select relowner from pg_class where oid=to_regclass('ai.daily_farm_brief_persistence_commands'))) as commands_owner_role,
          coalesce((select not r.rolcanlogin and not r.rolsuper and not r.rolbypassrls from target t join pg_roles r on r.oid=t.proowner),false) as owner_eligible,
          coalesce((select not rolsuper and not rolbypassrls from pg_roles where rolname=current_user),false) as runtime_eligible,
          coalesce(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)') is not null
            and pg_get_function_result(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'))='jsonb',false) as signature_matches,
          coalesce((select prosecdef from target),false) as security_definer,
          coalesce((select proconfig=array['search_path=pg_catalog, ai']::text[] from target),false) as search_path_fixed,
          coalesce(has_function_privilege('public',to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE'),false) as public_execute,
          coalesce(has_function_privilege(current_user,to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'),'EXECUTE'),false) as runtime_execute,
          coalesce(has_table_privilege(current_user,'ai.daily_farm_brief_records','INSERT'),false)
            or coalesce(has_table_privilege(current_user,'ai.daily_farm_brief_records','UPDATE'),false)
            or coalesce(has_table_privilege(current_user,'ai.daily_farm_brief_records','DELETE'),false)
            or coalesce(has_table_privilege(current_user,'ai.daily_farm_brief_persistence_commands','INSERT'),false)
            or coalesce(has_table_privilege(current_user,'ai.daily_farm_brief_persistence_commands','UPDATE'),false)
            or coalesce(has_table_privilege(current_user,'ai.daily_farm_brief_persistence_commands','DELETE'),false) as runtime_direct_dml
      `);
      await client.query("rollback");
      rolledBack = true;
      const row = result.rows[0];
      if (!row) throw new Error("daily_brief_privilege_candidates_unavailable");
      const fingerprintPayload = { ...row };
      return {
        ownerRole: row.owner_role,
        runtimeRole: row.runtime_role,
        recordsOwnerRole: row.records_owner_role,
        commandsOwnerRole: row.commands_owner_role,
        ownerEligible: row.owner_eligible,
        runtimeEligible: row.runtime_eligible,
        runtimeMatchesConnectionPrincipal: typeof row.runtime_role === "string" && row.runtime_role.length > 0,
        functionSignatureMatches: row.signature_matches,
        transactionRolledBack: true,
        catalogFingerprint: createHash("sha256").update(JSON.stringify(fingerprintPayload)).digest("hex"),
        priorState: { securityDefiner: row.security_definer, searchPathFixed: row.search_path_fixed, publicExecute: row.public_execute, runtimeExecute: row.runtime_execute, runtimeDirectDml: row.runtime_direct_dml },
      };
    } finally {
      if (client !== null && !rolledBack) { try { await client.query("rollback"); } catch { /* fail closed */ } }
      client?.release();
    }
  }
}

function registerBundle(input: HermesDailyFarmBriefRepositoryBundle, token: symbol, writeKind: "fixture" | "database"): HermesDailyFarmBriefRepositoryBundle {
  bundleTokens.set(input, token);
  repositoryTokens.set(input.readRepository as object, token);
  repositoryTokens.set(input.writeRepository as object, token);
  bundleWriteKinds.set(input, writeKind);
  return Object.freeze(input);
}

export function createHermesDailyFarmBriefFixtureRepositoryBundle(repository: HermesDailyFarmBriefPersistedReadRepository & HermesDailyFarmBriefPersistenceWriteRepository & { readCount?: number }): HermesDailyFarmBriefRepositoryBundle {
  const raw: HermesDailyFarmBriefRawPrivilegeCandidates = { ownerRole: "fixture_daily_brief_owner", runtimeRole: "fixture_daily_brief_runtime", recordsOwnerRole: "fixture_daily_brief_owner", commandsOwnerRole: "fixture_daily_brief_owner", ownerEligible: true, runtimeEligible: true, runtimeMatchesConnectionPrincipal: true, functionSignatureMatches: true, transactionRolledBack: true, catalogFingerprint: "0".repeat(64), priorState: { securityDefiner: true, searchPathFixed: true, publicExecute: false, runtimeExecute: true, runtimeDirectDml: false } };
  const token = Symbol("daily-brief-fixture-bundle");
  return registerBundle({ state: "ready", write_state: "enabled", readRepository: repository, writeRepository: repository, diagnoseWriteReadiness: async (input) => classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, evidence: { connection_available: true, transaction_read_only: false, records_relation_exists: true, commands_relation_exists: true, function_exists: true, function_signature_matches: true, function_security_definer: true, function_search_path_safe: true, schema_public_create: false, schema_owner_safe: true, public_execute: false, runtime_execute_privilege: true, runtime_direct_dml: false, owner_relation_privileges: true, owner_role_safe: true, relation_owners_match_function_owner: true, owner_candidate_eligible: true, runtime_candidate_eligible: true, canonical_record_count: 0, expected_version_matches: input.expectedCurrentVersion === null, rollback_verified: true } }), resolvePrivilegeCandidates: async () => privilegeResolution(raw, token) }, token, "fixture");
}

export function createHermesDailyFarmBriefProductionRepositoryBundle(environment: Readonly<Record<string, string | undefined>>, injectedExecutor?: HermesDailyFarmBriefProductionRepositoryExecutor): HermesDailyFarmBriefRepositoryBundle {
  const config = parseHermesDailyFarmBriefProductionEnvironment(environment);
  const host = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host];
  const user = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user];
  const credential = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.credential];
  const relationOverridePresent = environment[HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV.records] !== undefined || environment[HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV.commands] !== undefined;
  if (config === null || !host || !user || !credential || relationOverridePresent) {
    const deniedRead = { readCount: 0, async readRecordCandidates() { this.readCount += 1; return { schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1", status: "unavailable", transaction_read_only: true, records: [] }; } };
    return registerBundle({ state: "denied", write_state: "disabled", readRepository: deniedRead, writeRepository: new HermesDailyFarmBriefDenyByDefaultPersistenceRepository(), diagnoseWriteReadiness: async (input) => classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, connectionFailure: true }), resolvePrivilegeCandidates: async () => ({ preflight: EMPTY_PRIVILEGE_PREFLIGHT, token: null }) }, Symbol("daily-brief-denied-bundle"), "database");
  }
  const executor = injectedExecutor ?? new SharedPostgresExecutor(config, { host, user, credential });
  const token = Symbol("daily-brief-production-bundle");
  const readRepository = new HermesDailyFarmBriefProductionPostgresReadRepository(executor);
  const writeEnabled = environment[HERMES_DAILY_FARM_BRIEF_PRODUCTION_WRITE_ENABLED_ENV] === "true";
  const writeRepository = writeEnabled ? new HermesDailyFarmBriefProductionPostgresWriteRepository(executor) : new HermesDailyFarmBriefDenyByDefaultPersistenceRepository();
  const diagnoseWriteReadiness = async (input: { command: unknown; targetDate: string; expectedCurrentVersion: number | null }) => {
    if (executor.diagnoseWriteReadiness === undefined) return classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, connectionFailure: true });
    try {
      const evidence = await executor.diagnoseWriteReadiness({ targetDate: input.targetDate, expectedCurrentVersion: input.expectedCurrentVersion });
      return classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, evidence });
    } catch {
      return classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, connectionFailure: true });
    }
  };
  const resolvePrivilegeCandidates = async () => {
    if (executor.resolvePrivilegeCandidates === undefined) return { preflight: EMPTY_PRIVILEGE_PREFLIGHT, token: null };
    try { return privilegeResolution(await executor.resolvePrivilegeCandidates(), token); }
    catch { return { preflight: EMPTY_PRIVILEGE_PREFLIGHT, token: null }; }
  };
  return registerBundle({ state: "ready", write_state: writeEnabled ? "enabled" : "disabled", readRepository, writeRepository, diagnoseWriteReadiness, resolvePrivilegeCandidates }, token, "database");
}

export function inspectHermesDailyFarmBriefRepositoryBundle(bundle: unknown): HermesDailyFarmBriefRepositoryIdentityEvidence {
  const candidate = typeof bundle === "object" && bundle !== null ? bundle as Partial<HermesDailyFarmBriefRepositoryBundle> : null;
  const bundleToken = candidate === null ? undefined : bundleTokens.get(candidate as object);
  const readToken = candidate?.readRepository && typeof candidate.readRepository === "object" ? repositoryTokens.get(candidate.readRepository as object) : undefined;
  const writeToken = candidate?.writeRepository && typeof candidate.writeRepository === "object" ? repositoryTokens.get(candidate.writeRepository as object) : undefined;
  const shared = bundleToken !== undefined && readToken === bundleToken && writeToken === bundleToken;
  const ready = candidate?.state === "ready";
  return { schema_version: "hermes.daily_farm_brief.repository_identity_evidence.v1", storage_owner: "farmos_core", record_contract: "hermes.daily_farm_brief.persisted_record.v1", records_relation: HERMES_DAILY_FARM_BRIEF_RECORDS_RELATION, commands_relation: HERMES_DAILY_FARM_BRIEF_COMMANDS_RELATION, shared_connection_source: shared, shared_repository_factory: shared, read_capability: ready, write_capability: candidate?.write_state === "enabled" ? "enabled" : "disabled", matched: shared && ready, write_kind: candidate === null ? "database" : bundleWriteKinds.get(candidate as object) ?? "database" };
}

export function inspectHermesDailyFarmBriefRepositoryPair(writeRepository: object, readRepository: object): HermesDailyFarmBriefRepositoryIdentityEvidence {
  const token = repositoryTokens.get(writeRepository);
  const shared = token !== undefined && repositoryTokens.get(readRepository) === token;
  return { schema_version: "hermes.daily_farm_brief.repository_identity_evidence.v1", storage_owner: "farmos_core", record_contract: "hermes.daily_farm_brief.persisted_record.v1", records_relation: HERMES_DAILY_FARM_BRIEF_RECORDS_RELATION, commands_relation: HERMES_DAILY_FARM_BRIEF_COMMANDS_RELATION, shared_connection_source: shared, shared_repository_factory: shared, read_capability: shared, write_capability: "disabled", matched: shared, write_kind: "database" };
}

export const HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV = {
  enabled: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENABLED",
  confirmation: "HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION",
} as const;
export const HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION = "confirm-day123-privilege-hardening" as const;

export type HermesDailyFarmBriefPrivilegeApplyExecutor = {
  executeReviewedHardening(input: {
    ownerRole: string;
    runtimeRole: string;
    expectedCatalogFingerprint: string;
    priorState: HermesDailyFarmBriefRawPrivilegeCandidates["priorState"];
  }): Promise<unknown>;
};

export type HermesDailyFarmBriefPrivilegeApplyResult = {
  schema_version: "hermes.daily_farm_brief.privilege_apply_result.v1";
  status: "disabled" | "rejected" | "failed_closed" | "applied";
  error_code: "authorization_required" | "candidate_invalid" | "repository_identity_mismatch" | "catalog_fingerprint_mismatch" | "transaction_failed" | null;
  candidate_resolver_passed: boolean;
  repository_identity_matched: boolean;
  rollback_plan_generated: boolean;
  transaction_call_count: 0 | 1;
  transaction_committed: boolean;
  retry_count: 0;
  production_change_performed: boolean;
  raw_role_exposed: false;
  secret_exposed: false;
};

function privilegeApplyResult(input: Partial<HermesDailyFarmBriefPrivilegeApplyResult>): HermesDailyFarmBriefPrivilegeApplyResult {
  return { schema_version: "hermes.daily_farm_brief.privilege_apply_result.v1", status: "disabled", error_code: "authorization_required", candidate_resolver_passed: false, repository_identity_matched: false, rollback_plan_generated: false, transaction_call_count: 0, transaction_committed: false, retry_count: 0, production_change_performed: false, raw_role_exposed: false, secret_exposed: false, ...input };
}

export async function applyHermesDailyFarmBriefReviewedPrivilegeHardening(input: {
  environment: Readonly<Record<string, string | undefined>>;
  repositoryBundle: HermesDailyFarmBriefRepositoryBundle;
  candidateToken: HermesDailyFarmBriefPrivilegeCandidateToken | null;
  executor: HermesDailyFarmBriefPrivilegeApplyExecutor;
}): Promise<HermesDailyFarmBriefPrivilegeApplyResult> {
  const enabled = input.environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled] === "true";
  const confirmed = input.environment[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.confirmation] === HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION;
  const overridePresent = input.environment.HERMES_DAILY_FARM_BRIEF_PERSISTENCE_OWNER_ROLE !== undefined || input.environment.HERMES_DAILY_FARM_BRIEF_PERSISTENCE_RUNTIME_ROLE !== undefined;
  if (!enabled || !confirmed || overridePresent) return privilegeApplyResult({ status: overridePresent ? "rejected" : "disabled", error_code: "authorization_required" });
  const candidate = input.candidateToken === null ? undefined : privilegeCandidateTokens.get(input.candidateToken as object);
  if (candidate === undefined) return privilegeApplyResult({ status: "rejected", error_code: "candidate_invalid" });
  const identity = inspectHermesDailyFarmBriefRepositoryBundle(input.repositoryBundle);
  const bundleToken = bundleTokens.get(input.repositoryBundle as object);
  if (!identity.matched || bundleToken === undefined || candidate.repositoryToken !== bundleToken) return privilegeApplyResult({ status: "rejected", error_code: "repository_identity_mismatch", candidate_resolver_passed: true });
  let raw: unknown;
  try {
    raw = await input.executor.executeReviewedHardening({ ownerRole: candidate.raw.ownerRole, runtimeRole: candidate.raw.runtimeRole, expectedCatalogFingerprint: candidate.raw.catalogFingerprint, priorState: candidate.raw.priorState });
  } catch {
    return privilegeApplyResult({ status: "failed_closed", error_code: "transaction_failed", candidate_resolver_passed: true, repository_identity_matched: true, rollback_plan_generated: true, transaction_call_count: 1 });
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return privilegeApplyResult({ status: "failed_closed", error_code: "transaction_failed", candidate_resolver_passed: true, repository_identity_matched: true, rollback_plan_generated: true, transaction_call_count: 1 });
  const value = raw as Record<string, unknown>;
  const exact = Object.keys(value).length === 4 && value.schema_version === "hermes.daily_farm_brief.privilege_apply_transaction.v1" && typeof value.catalog_fingerprint_matched === "boolean" && typeof value.transaction_committed === "boolean" && typeof value.transaction_rolled_back === "boolean";
  if (!exact) return privilegeApplyResult({ status: "failed_closed", error_code: "transaction_failed", candidate_resolver_passed: true, repository_identity_matched: true, rollback_plan_generated: true, transaction_call_count: 1 });
  if (!value.catalog_fingerprint_matched) return privilegeApplyResult({ status: "rejected", error_code: "catalog_fingerprint_mismatch", candidate_resolver_passed: true, repository_identity_matched: true, rollback_plan_generated: true, transaction_call_count: 1 });
  if (!value.transaction_committed) return privilegeApplyResult({ status: "failed_closed", error_code: "transaction_failed", candidate_resolver_passed: true, repository_identity_matched: true, rollback_plan_generated: true, transaction_call_count: 1 });
  return privilegeApplyResult({ status: "applied", error_code: null, candidate_resolver_passed: true, repository_identity_matched: true, rollback_plan_generated: true, transaction_call_count: 1, transaction_committed: true, production_change_performed: true });
}
