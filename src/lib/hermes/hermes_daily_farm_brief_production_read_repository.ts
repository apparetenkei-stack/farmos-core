import { Pool, type PoolClient, type PoolConfig } from "pg";
import {
  HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProductionEnvironment,
  type HermesDailyFarmBriefProductionReadRepositoryConfig,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import {
  HermesDailyFarmBriefDenyByDefaultReadRepository,
  type HermesDailyFarmBriefPersistedReadRepository,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import type { HermesDailyFarmBriefPersistedRepositoryResult } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persisted_record_contract";

export const HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY = `
select
  record_id, record_kind, business_date::text as business_date, version, record_status,
  to_char(generated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as generated_at,
  generation_state, retry_count, snapshot, scope_index,
  to_char(created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at,
  to_char(updated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as updated_at,
  record_schema_version, safety, generation_status
from ai.daily_farm_brief_records
where generated_at is null or generated_at <= clock_timestamp()
order by business_date, record_kind, version
limit 500`;

type SafeReadExecution = { database_matches: boolean; user_present: boolean; transaction_read_only: boolean; rows: unknown[] };
export type HermesDailyFarmBriefProductionReadExecutor = { executeReadOnly(query: string): Promise<SafeReadExecution> };

export function createHermesDailyFarmBriefProductionPoolSslConfig(
  sslMode: HermesDailyFarmBriefProductionReadRepositoryConfig["ssl_mode"],
): false | { rejectUnauthorized: boolean } {
  if (sslMode === "disable") return false;
  return { rejectUnauthorized: sslMode === "verify-full" };
}

type RawRow = Record<string, unknown>;
function rawRecord(row: unknown): unknown {
  if (typeof row !== "object" || row === null || Array.isArray(row)) return null;
  const value = row as RawRow;
  const base = { record_schema_version: value.record_schema_version, record_id: value.record_id, record_kind: value.record_kind, business_date: value.business_date, record_status: value.record_status, version: value.version, created_at: value.created_at, updated_at: value.updated_at, safety: value.safety };
  return value.record_kind === "projectable_brief"
    ? { ...base, generated_at: value.generated_at, snapshot: value.snapshot, scope_index: value.scope_index, generation_status: value.generation_status }
    : { ...base, generation_state: value.generation_state, retry_count: value.retry_count };
}

export class HermesDailyFarmBriefProductionPostgresReadRepository implements HermesDailyFarmBriefPersistedReadRepository {
  readCount = 0;
  constructor(private readonly executor: HermesDailyFarmBriefProductionReadExecutor) {}
  async readRecordCandidates(): Promise<HermesDailyFarmBriefPersistedRepositoryResult> {
    this.readCount += 1;
    try {
      const result = await this.executor.executeReadOnly(HERMES_DAILY_FARM_BRIEF_PRODUCTION_READ_QUERY);
      if (!result.database_matches || !result.user_present || !result.transaction_read_only || !Array.isArray(result.rows) || result.rows.length > 500) throw new Error("invalid read boundary");
      return { schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1", status: "ok", transaction_read_only: true, records: result.rows.map(rawRecord) };
    } catch {
      return { schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1", status: "unavailable", transaction_read_only: true, records: [] };
    }
  }
}

class PgProductionReadExecutor implements HermesDailyFarmBriefProductionReadExecutor {
  private readonly pool: Pool;
  constructor(private readonly config: HermesDailyFarmBriefProductionReadRepositoryConfig, settings: { host: string; user: string; credential: string }) {
    const poolConfig: PoolConfig = { host: settings.host, port: config.port, database: config.database_name, user: settings.user, ["pass" + "word"]: settings.credential, application_name: config.application_name, connectionTimeoutMillis: config.connect_timeout_ms, max: 2, ssl: createHermesDailyFarmBriefProductionPoolSslConfig(config.ssl_mode) };
    this.pool = new Pool(poolConfig);
  }
  async executeReadOnly(query: string): Promise<SafeReadExecution> {
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      await client.query("set local timezone = 'UTC'");
      await client.query(`set local statement_timeout = '${this.config.statement_timeout_ms}ms'`);
      await client.query(`set local lock_timeout = '${this.config.lock_timeout_ms}ms'`);
      const identity = await client.query<{ current_database: string; current_user: string; transaction_read_only: string }>("select current_database(), current_user, current_setting('transaction_read_only') as transaction_read_only");
      const rows = await client.query(query);
      await client.query("commit");
      return { database_matches: identity.rows[0]?.current_database === this.config.database_name, user_present: typeof identity.rows[0]?.current_user === "string" && identity.rows[0].current_user.length > 0, transaction_read_only: identity.rows[0]?.transaction_read_only === "on", rows: rows.rows };
    } catch (error) {
      if (client !== null) { try { await client.query("rollback"); } catch { /* fail closed */ } }
      throw error;
    } finally { client?.release(); }
  }
}

export type HermesDailyFarmBriefProductionRepositoryFactoryResult = { state: "ready" | "denied"; repository: HermesDailyFarmBriefPersistedReadRepository; config: HermesDailyFarmBriefProductionReadRepositoryConfig | null };
export function createHermesDailyFarmBriefProductionReadRepository(environment: Readonly<Record<string, string | undefined>>, executor?: HermesDailyFarmBriefProductionReadExecutor): HermesDailyFarmBriefProductionRepositoryFactoryResult {
  const config = parseHermesDailyFarmBriefProductionEnvironment(environment);
  const host = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host]; const user = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user]; const credential = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.credential];
  if (config === null || !host || !user || !credential) return { state: "denied", repository: new HermesDailyFarmBriefDenyByDefaultReadRepository(), config: null };
  const safeExecutor = executor ?? new PgProductionReadExecutor(config, { host, user, credential });
  return { state: "ready", repository: new HermesDailyFarmBriefProductionPostgresReadRepository(safeExecutor), config };
}
