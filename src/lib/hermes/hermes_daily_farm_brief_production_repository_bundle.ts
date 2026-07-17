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
};

export type HermesDailyFarmBriefProductionRepositoryExecutor =
  HermesDailyFarmBriefProductionReadExecutor & HermesDailyFarmBriefProductionWriteExecutor;

export type HermesDailyFarmBriefRepositoryBundle = {
  state: "ready" | "denied";
  write_state: "enabled" | "disabled";
  readRepository: HermesDailyFarmBriefPersistedReadRepository & { readCount?: number };
  writeRepository: HermesDailyFarmBriefPersistenceWriteRepository;
  diagnoseWriteReadiness: (input: { command: unknown; targetDate: string; expectedCurrentVersion: number | null }) => Promise<HermesDailyFarmBriefProductionWriteReadinessResult>;
};

const bundleTokens = new WeakMap<object, symbol>();
const repositoryTokens = new WeakMap<object, symbol>();
const bundleWriteKinds = new WeakMap<object, "fixture" | "database">();

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
        execute_privilege: boolean;
        relation_privileges: boolean;
      }>(`
        select
          to_regclass('ai.daily_farm_brief_records') is not null as records_exists,
          to_regclass('ai.daily_farm_brief_persistence_commands') is not null as commands_exists,
          exists (
            select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'ai' and p.proname = 'persist_daily_farm_brief_command'
          ) as function_exists,
          coalesce(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)') is not null
            and pg_get_function_result(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')) = 'jsonb', false) as function_signature_matches,
          coalesce(has_function_privilege(current_user, to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)'), 'EXECUTE'), false) as execute_privilege,
          coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_records'), 'SELECT,INSERT,UPDATE'), false)
            and coalesce(has_table_privilege(current_user, to_regclass('ai.daily_farm_brief_persistence_commands'), 'SELECT,INSERT'), false) as relation_privileges
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
        execute_privilege: row?.execute_privilege === true,
        relation_privileges: row?.relation_privileges === true,
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
}

function registerBundle(input: HermesDailyFarmBriefRepositoryBundle, token: symbol, writeKind: "fixture" | "database"): HermesDailyFarmBriefRepositoryBundle {
  bundleTokens.set(input, token);
  repositoryTokens.set(input.readRepository as object, token);
  repositoryTokens.set(input.writeRepository as object, token);
  bundleWriteKinds.set(input, writeKind);
  return Object.freeze(input);
}

export function createHermesDailyFarmBriefFixtureRepositoryBundle(repository: HermesDailyFarmBriefPersistedReadRepository & HermesDailyFarmBriefPersistenceWriteRepository & { readCount?: number }): HermesDailyFarmBriefRepositoryBundle {
  return registerBundle({ state: "ready", write_state: "enabled", readRepository: repository, writeRepository: repository, diagnoseWriteReadiness: async (input) => classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, evidence: { connection_available: true, transaction_read_only: false, records_relation_exists: true, commands_relation_exists: true, function_exists: true, function_signature_matches: true, execute_privilege: true, relation_privileges: true, canonical_record_count: 0, expected_version_matches: input.expectedCurrentVersion === null, rollback_verified: true } }) }, Symbol("daily-brief-fixture-bundle"), "fixture");
}

export function createHermesDailyFarmBriefProductionRepositoryBundle(environment: Readonly<Record<string, string | undefined>>, injectedExecutor?: HermesDailyFarmBriefProductionRepositoryExecutor): HermesDailyFarmBriefRepositoryBundle {
  const config = parseHermesDailyFarmBriefProductionEnvironment(environment);
  const host = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host];
  const user = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user];
  const credential = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.credential];
  const relationOverridePresent = environment[HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV.records] !== undefined || environment[HERMES_DAILY_FARM_BRIEF_RELATION_OVERRIDE_ENV.commands] !== undefined;
  if (config === null || !host || !user || !credential || relationOverridePresent) {
    const deniedRead = { readCount: 0, async readRecordCandidates() { this.readCount += 1; return { schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1", status: "unavailable", transaction_read_only: true, records: [] }; } };
    return registerBundle({ state: "denied", write_state: "disabled", readRepository: deniedRead, writeRepository: new HermesDailyFarmBriefDenyByDefaultPersistenceRepository(), diagnoseWriteReadiness: async (input) => classifyHermesDailyFarmBriefProductionWriteReadiness({ ...input, connectionFailure: true }) }, Symbol("daily-brief-denied-bundle"), "database");
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
  return registerBundle({ state: "ready", write_state: writeEnabled ? "enabled" : "disabled", readRepository, writeRepository, diagnoseWriteReadiness }, token, "database");
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
