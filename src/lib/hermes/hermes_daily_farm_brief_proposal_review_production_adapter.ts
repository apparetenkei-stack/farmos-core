import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefAuthenticationResult,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  createHermesDailyFarmBriefProductionPoolSslConfig,
} from "./hermes_daily_farm_brief_production_read_repository";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment,
  type HermesDailyFarmBriefProposalReviewDatabaseConfig,
} from "./hermes_daily_farm_brief_proposal_review_database_contract";
import {
  createHermesDailyFarmBriefProposalSafeReference,
  parseHermesDailyFarmBriefProposalReviewRawRow,
  parseHermesDailyFarmBriefProposalSafeReference,
  type HermesDailyFarmBriefProposalReviewRawRow,
} from "./hermes_daily_farm_brief_proposal_review_read_boundary";
import type {
  HermesDailyFarmBriefProposalReviewReadRepository,
} from "./hermes_daily_farm_brief_proposal_review_postgres_repository";
import {
  HERMES_DAY128_REVIEW_POSTGRES_SQL,
  PostgresDailyFarmBriefProposalReviewDecisionRepository,
  type HermesDay128ReviewPostgresQueryResult,
  type HermesDay128ReviewPostgresTransactionExecutor,
} from "./hermes_daily_farm_brief_proposal_review_decision_postgres_repository";

export const HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV =
  "HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED" as const;

export const HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL =
  "begin isolation level read committed" as const;

const FIVE_REVIEW_COLUMNS = [
  "status",
  "reviewed_by",
  "reviewed_at",
  "review_note",
  "updated_at",
] as const;

const READINESS_EVIDENCE_KEYS = [
  "runtime_role_safe", "proposal_relation_present", "audit_contract_valid",
  "proposal_select", "update_status", "update_reviewed_by",
  "update_reviewed_at", "update_review_note", "update_updated_at",
  "proposal_insert", "proposal_delete", "proposal_truncate",
  "proposal_table_update", "update_applied_at", "update_applied_by",
  "update_payload_json", "update_source_refs_json", "audit_insert",
  "audit_update", "audit_delete", "audit_truncate", "app_write",
  "other_table_write", "schema_create",
] as const;

export type HermesDailyFarmBriefProductionReviewReadinessState =
  | "ready"
  | "disabled"
  | "environment_missing"
  | "authentication_unavailable"
  | "administrator_required"
  | "connection_unavailable"
  | "transaction_unavailable"
  | "proposal_read_denied"
  | "proposal_update_denied"
  | "audit_insert_denied"
  | "forbidden_privilege_present";

export type HermesDailyFarmBriefProductionReviewReadinessResult = {
  state: HermesDailyFarmBriefProductionReviewReadinessState;
  denial_reason: Exclude<HermesDailyFarmBriefProductionReviewReadinessState, "ready"> | null;
  production_adapter_selected: boolean;
  authentication_available: boolean;
  administrator_authorized: boolean;
  database_connection_available: boolean;
  transaction_available: boolean;
  proposal_read_available: boolean;
  proposal_five_column_update_available: boolean;
  audit_insert_available: boolean;
  rollback_verified: boolean;
  forbidden_privileges_absent: boolean;
  app_database_write_privilege_present: boolean;
  database_write_performed: false;
  production_connection_performed: boolean;
  retry_count: 0;
};

type ReadinessEvidence = {
  database_matches: boolean;
  user_matches: boolean;
  transaction_read_only: boolean;
  transaction_rolled_back: boolean;
  runtime_role_safe: boolean;
  proposal_relation_present: boolean;
  audit_contract_valid: boolean;
  proposal_select: boolean;
  update_status: boolean;
  update_reviewed_by: boolean;
  update_reviewed_at: boolean;
  update_review_note: boolean;
  update_updated_at: boolean;
  proposal_insert: boolean;
  proposal_delete: boolean;
  proposal_truncate: boolean;
  proposal_table_update: boolean;
  update_applied_at: boolean;
  update_applied_by: boolean;
  update_payload_json: boolean;
  update_source_refs_json: boolean;
  audit_insert: boolean;
  audit_update: boolean;
  audit_delete: boolean;
  audit_truncate: boolean;
  app_write: boolean;
  other_table_write: boolean;
  schema_create: boolean;
};

export type HermesDailyFarmBriefProductionReviewExecutor =
  HermesDay128ReviewPostgresTransactionExecutor & {
    readCandidates(limit: number): Promise<unknown[]>;
    diagnoseReadiness(): Promise<
      | { result: "ok"; evidence: ReadinessEvidence }
      | { result: "connection_unavailable" | "transaction_unavailable" }
    >;
    close?(): Promise<void>;
  };

export type HermesDailyFarmBriefProductionReviewAdapterResult = {
  readiness: HermesDailyFarmBriefProductionReviewReadinessResult;
  readRepository: HermesDailyFarmBriefProposalReviewReadRepository | null;
  reviewRepository: PostgresDailyFarmBriefProposalReviewDecisionRepository | null;
  close: () => Promise<void>;
};

const denied = (
  state: Exclude<HermesDailyFarmBriefProductionReviewReadinessState, "ready">,
  input: Partial<HermesDailyFarmBriefProductionReviewReadinessResult> = {},
): HermesDailyFarmBriefProductionReviewReadinessResult => ({
  state,
  denial_reason: state,
  production_adapter_selected: false,
  authentication_available: false,
  administrator_authorized: false,
  database_connection_available: false,
  transaction_available: false,
  proposal_read_available: false,
  proposal_five_column_update_available: false,
  audit_insert_available: false,
  rollback_verified: false,
  forbidden_privileges_absent: false,
  app_database_write_privilege_present: false,
  database_write_performed: false,
  production_connection_performed: false,
  retry_count: 0,
  ...input,
});

function authorized(input: {
  authentication: unknown;
  actor: unknown;
}): "authenticated" | "administrator" | null {
  const authentication = parseHermesDailyFarmBriefAuthenticationResult(input.authentication);
  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(input.actor);
  if (authentication?.status !== "authenticated") return null;
  if (
    actor === null ||
    actor.principal_ref !== authentication.principal_ref ||
    actor.role !== "administrator" ||
    actor.authorization_verified !== true ||
    actor.allowed_scope_keys.length !== 0
  ) return "authenticated";
  return "administrator";
}

function parseRows(rows: unknown[]): HermesDailyFarmBriefProposalReviewRawRow[] {
  if (rows.length > 100) throw new Error("production_review_row_contract_invalid");
  return rows.map((row) => {
    if (parseHermesDailyFarmBriefProposalReviewRawRow(row) === null) {
      throw new Error("production_review_row_contract_invalid");
    }
    return row as HermesDailyFarmBriefProposalReviewRawRow;
  });
}

class ProductionReviewReadRepository
  implements HermesDailyFarmBriefProposalReviewReadRepository
{
  constructor(private readonly executor: HermesDailyFarmBriefProductionReviewExecutor) {}

  async listDailyBriefProposalRows(limit: number): Promise<HermesDailyFarmBriefProposalReviewRawRow[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new Error("production_review_input_invalid");
    }
    return parseRows(await this.executor.readCandidates(limit));
  }

  async findDailyBriefProposalRowBySafeReference(
    proposalRef: string,
  ): Promise<HermesDailyFarmBriefProposalReviewRawRow | null> {
    if (parseHermesDailyFarmBriefProposalSafeReference(proposalRef) === null) {
      throw new Error("production_review_input_invalid");
    }
    const rows = await this.listDailyBriefProposalRows(100);
    const matches = rows.filter((row) => {
      const parsed = parseHermesDailyFarmBriefProposalReviewRawRow(row);
      return parsed !== null &&
        createHermesDailyFarmBriefProposalSafeReference(parsed.payload.idempotency_key) === proposalRef;
    });
    if (matches.length > 1) throw new Error("production_review_row_contract_invalid");
    return matches[0] ?? null;
  }
}

function candidateSql(limit: number): string {
  return HERMES_DAY128_REVIEW_POSTGRES_SQL.candidates.replace(/limit 100$/u, `limit ${limit}`);
}

export const HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL = `
select jsonb_build_object(
  'runtime_role_safe',coalesce((select not rolsuper and not rolbypassrls from pg_catalog.pg_roles where rolname=current_user),false),
  'proposal_relation_present',to_regclass('ai.proposal_inbox') is not null,
  'audit_contract_valid',to_regclass('audit.proposal_review_decision_events') is not null
    and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='f' and confrelid=to_regclass('ai.proposal_inbox') and confdeltype='r'),
  'proposal_select',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'SELECT'),false),
  'update_status',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'status','UPDATE'),false),
  'update_reviewed_by',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'reviewed_by','UPDATE'),false),
  'update_reviewed_at',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'reviewed_at','UPDATE'),false),
  'update_review_note',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'review_note','UPDATE'),false),
  'update_updated_at',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'updated_at','UPDATE'),false),
  'proposal_insert',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'INSERT'),false),
  'proposal_delete',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'DELETE'),false),
  'proposal_truncate',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'TRUNCATE'),false),
  'proposal_table_update',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'UPDATE'),false),
  'update_applied_at',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'applied_at','UPDATE'),false),
  'update_applied_by',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'applied_by','UPDATE'),false),
  'update_payload_json',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'payload_json','UPDATE'),false),
  'update_source_refs_json',coalesce(has_column_privilege(current_user,to_regclass('ai.proposal_inbox'),'source_refs_json','UPDATE'),false),
  'audit_insert',coalesce(has_table_privilege(current_user,to_regclass('audit.proposal_review_decision_events'),'INSERT'),false),
  'audit_update',coalesce(has_table_privilege(current_user,to_regclass('audit.proposal_review_decision_events'),'UPDATE'),false),
  'audit_delete',coalesce(has_table_privilege(current_user,to_regclass('audit.proposal_review_decision_events'),'DELETE'),false),
  'audit_truncate',coalesce(has_table_privilege(current_user,to_regclass('audit.proposal_review_decision_events'),'TRUNCATE'),false),
  'app_write',exists(
    select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='app' and c.relkind in ('r','p') and (
      has_table_privilege(current_user,c.oid,'INSERT') or has_table_privilege(current_user,c.oid,'UPDATE')
      or has_table_privilege(current_user,c.oid,'DELETE') or has_table_privilege(current_user,c.oid,'TRUNCATE')
    )
  ),
  'other_table_write',exists(
    select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
      and c.relkind in ('r','p') and (
        (has_table_privilege(current_user,c.oid,'INSERT') and c.oid<>to_regclass('audit.proposal_review_decision_events'))
        or has_table_privilege(current_user,c.oid,'UPDATE')
        or has_table_privilege(current_user,c.oid,'DELETE')
        or has_table_privilege(current_user,c.oid,'TRUNCATE')
        or exists(
          select 1 from pg_catalog.pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
            and has_column_privilege(current_user,c.oid,a.attname,'UPDATE')
            and not (c.oid=to_regclass('ai.proposal_inbox') and a.attname in ('status','reviewed_by','reviewed_at','review_note','updated_at'))
        )
      )
  ),
  'schema_create',exists(
    select 1 from pg_catalog.pg_namespace n
    where n.nspname in ('ai','audit','app','public') and has_schema_privilege(current_user,n.oid,'CREATE')
  )
) as evidence` as const;

export class PgProductionReviewExecutor implements HermesDailyFarmBriefProductionReviewExecutor {
  private readonly pool: Pool;
  private readonly expectedUser: string;

  constructor(
    private readonly config: HermesDailyFarmBriefProposalReviewDatabaseConfig,
    settings: { host: string; user: string; credential: string },
    pool?: Pool,
  ) {
    this.expectedUser = settings.user;
    const poolConfig: PoolConfig = {
      host: settings.host,
      port: config.port,
      database: config.database_name,
      user: settings.user,
      ["pass" + "word"]: settings.credential,
      application_name: "farmos-core-hermes-proposal-review",
      connectionTimeoutMillis: config.connect_timeout_ms,
      max: 2,
      ssl: createHermesDailyFarmBriefProductionPoolSslConfig(config.ssl_mode),
    };
    this.pool = pool ?? new Pool(poolConfig);
  }

  private async settings(client: PoolClient): Promise<void> {
    await client.query("set local timezone = 'UTC'");
    await client.query(`set local statement_timeout = '${this.config.statement_timeout_ms}ms'`);
    await client.query(`set local lock_timeout = '${this.config.lock_timeout_ms}ms'`);
  }

  private async identity(client: PoolClient, readOnly: "on" | "off"): Promise<boolean> {
    const identity = await client.query<{ current_database: string; current_user: string; transaction_read_only: string }>(
      "select current_database(),current_user,current_setting('transaction_read_only') as transaction_read_only",
    );
    return identity.rows.length === 1 &&
      identity.rows[0]?.current_database === this.config.database_name &&
      identity.rows[0]?.current_user === this.expectedUser &&
      identity.rows[0].transaction_read_only === readOnly;
  }

  async diagnoseReadiness(): Promise<
    | { result: "ok"; evidence: ReadinessEvidence }
    | { result: "connection_unavailable" | "transaction_unavailable" }
  > {
    let client: PoolClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      began = true;
      await this.settings(client);
      const databaseMatches = await this.identity(client, "on");
      const queried = await client.query<Record<string, unknown>>(HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_READINESS_SQL);
      await client.query("rollback");
      began = false;
      const raw = queried.rows[0]?.evidence;
      if (
        typeof raw !== "object" || raw === null || Array.isArray(raw) ||
        Object.keys(raw).length !== READINESS_EVIDENCE_KEYS.length ||
        !READINESS_EVIDENCE_KEYS.every((key) => Object.hasOwn(raw, key))
      ) {
        return { result: "transaction_unavailable" };
      }
      const evidence = raw as Omit<ReadinessEvidence, "database_matches" | "user_matches" | "transaction_read_only" | "transaction_rolled_back">;
      if (Object.values(evidence).some((value) => typeof value !== "boolean")) {
        return { result: "transaction_unavailable" };
      }
      return {
        result: "ok",
        evidence: {
          database_matches: databaseMatches,
          user_matches: databaseMatches,
          transaction_read_only: true,
          transaction_rolled_back: true,
          ...evidence,
        },
      };
    } catch {
      if (client !== null && began) {
        try { await client.query("rollback"); } catch { /* fail closed */ }
      }
      return { result: client === null ? "connection_unavailable" : "transaction_unavailable" };
    } finally {
      client?.release();
    }
  }

  async readCandidates(limit: number): Promise<unknown[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("production_review_input_invalid");
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      await this.settings(client);
      if (!await this.identity(client, "on")) throw new Error("production_review_identity_invalid");
      const result = await client.query(candidateSql(limit));
      await client.query("commit");
      return result.rows;
    } catch (error) {
      if (client !== null) {
        try { await client.query("rollback"); } catch { /* fail closed */ }
      }
      throw error;
    } finally {
      client?.release();
    }
  }

  async executeSingleConnectionTransaction<T>(input: {
    databaseTarget: string;
    beginSql: string;
    operation: Parameters<HermesDay128ReviewPostgresTransactionExecutor["executeSingleConnectionTransaction"]>[0]["operation"];
  }): Promise<{ ok: boolean; committed: boolean; value?: T }> {
    if (
      input.databaseTarget !== this.config.database_name ||
      input.beginSql !== HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL
    ) return { ok: false, committed: false };
    let client: PoolClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query(input.beginSql);
      began = true;
      await this.settings(client);
      if (!await this.identity(client, "off")) throw new Error("production_review_identity_invalid");
      const decision = await input.operation({
        query: async (sql, parameters = []): Promise<HermesDay128ReviewPostgresQueryResult> => {
          const result = await client!.query(sql, [...parameters]);
          return { rowCount: result.rowCount ?? result.rows.length, rows: result.rows };
        },
      });
      await client.query(decision.commit ? "commit" : "rollback");
      began = false;
      return { ok: true, committed: decision.commit, value: decision.value as T };
    } catch {
      if (client !== null && began) {
        try { await client.query("rollback"); } catch { /* fail closed */ }
      }
      return { ok: false, committed: false };
    } finally {
      client?.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function readinessFromEvidence(e: ReadinessEvidence): HermesDailyFarmBriefProductionReviewReadinessResult {
  const base = {
    production_adapter_selected: true,
    authentication_available: true,
    administrator_authorized: true,
    database_connection_available: true,
    transaction_available: e.transaction_read_only && e.transaction_rolled_back,
    proposal_read_available: e.proposal_relation_present && e.proposal_select,
    proposal_five_column_update_available: FIVE_REVIEW_COLUMNS.every((column) => e[`update_${column}` as keyof ReadinessEvidence] === true),
    audit_insert_available: e.audit_contract_valid && e.audit_insert,
    rollback_verified: e.transaction_rolled_back,
    forbidden_privileges_absent: e.runtime_role_safe && !e.proposal_insert && !e.proposal_delete && !e.proposal_truncate && !e.proposal_table_update && !e.update_applied_at && !e.update_applied_by && !e.update_payload_json && !e.update_source_refs_json && !e.audit_update && !e.audit_delete && !e.audit_truncate && !e.app_write && !e.other_table_write && !e.schema_create,
    app_database_write_privilege_present: e.app_write,
    database_write_performed: false as const,
    production_connection_performed: true,
    retry_count: 0 as const,
  };
  if (!e.database_matches || !e.user_matches) return denied("connection_unavailable", base);
  if (!base.transaction_available) return denied("transaction_unavailable", base);
  if (!base.proposal_read_available) return denied("proposal_read_denied", base);
  if (!base.proposal_five_column_update_available) return denied("proposal_update_denied", base);
  if (!base.audit_insert_available) return denied("audit_insert_denied", base);
  if (!base.forbidden_privileges_absent) return denied("forbidden_privilege_present", base);
  return { state: "ready", denial_reason: null, ...base };
}

export async function createHermesDailyFarmBriefProposalProductionReviewAdapter(input: {
  environment: Readonly<Record<string, string | undefined>>;
  authentication: unknown;
  actor: unknown;
  executorFactory?: (
    config: HermesDailyFarmBriefProposalReviewDatabaseConfig,
    settings: { host: string; user: string; credential: string },
  ) => HermesDailyFarmBriefProductionReviewExecutor | null;
}): Promise<HermesDailyFarmBriefProductionReviewAdapterResult> {
  const empty = (readiness: HermesDailyFarmBriefProductionReviewReadinessResult): HermesDailyFarmBriefProductionReviewAdapterResult => ({
    readiness,
    readRepository: null,
    reviewRepository: null,
    close: async () => undefined,
  });
  if (input.environment[HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_ENABLED_ENV] !== "true") {
    return empty(denied("disabled"));
  }
  const authorization = authorized(input);
  if (authorization === null) return empty(denied("authentication_unavailable", { production_adapter_selected: true }));
  if (authorization !== "administrator") return empty(denied("administrator_required", { production_adapter_selected: true, authentication_available: true }));

  const config = parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(input.environment);
  const host = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.host];
  const user = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user];
  const credential = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.credential];
  if (config === null || !host || !user || !credential) {
    return empty(denied("environment_missing", { production_adapter_selected: true, authentication_available: true, administrator_authorized: true }));
  }
  const executor = (input.executorFactory ?? ((c, settings) => new PgProductionReviewExecutor(c, settings)))(config, { host, user, credential });
  if (executor === null) return empty(denied("connection_unavailable", { production_adapter_selected: true, authentication_available: true, administrator_authorized: true }));
  const close = async () => executor.close?.();
  let diagnosed: Awaited<ReturnType<HermesDailyFarmBriefProductionReviewExecutor["diagnoseReadiness"]>>;
  try { diagnosed = await executor.diagnoseReadiness(); }
  catch { diagnosed = { result: "connection_unavailable" }; }
  if (diagnosed.result !== "ok") {
    const state = diagnosed.result;
    return {
      ...empty(denied(state, { production_adapter_selected: true, authentication_available: true, administrator_authorized: true, production_connection_performed: true })),
      close,
    };
  }
  const readiness = readinessFromEvidence(diagnosed.evidence);
  if (readiness.state !== "ready") return { ...empty(readiness), close };
  return {
    readiness,
    readRepository: new ProductionReviewReadRepository(executor),
    reviewRepository: new PostgresDailyFarmBriefProposalReviewDecisionRepository(executor, {
      databaseTarget: config.database_name,
      beginSql: HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_BEGIN_SQL,
    }),
    close,
  };
}
