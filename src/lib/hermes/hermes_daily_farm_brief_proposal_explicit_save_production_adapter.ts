import { Pool, type PoolClient, type PoolConfig } from "pg";

import { parseHermesDailyFarmBriefAuthenticatedActorContext } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_CONFIRMATION,
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION,
  executeHermesDailyFarmBriefProposalExplicitSave,
  prepareHermesDailyFarmBriefProposalExplicitSave,
  type ExplicitSaveRepository,
  type HermesDailyFarmBriefProposalInboxRecord,
  type PersistedProposalSummary,
} from "./hermes_daily_farm_brief_proposal_explicit_save_boundary";
import { parseHermesDailyFarmBriefProposalCandidate } from "./hermes_daily_farm_brief_proposal_candidate_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment,
  proposalReviewDatabaseTarget,
  type HermesDailyFarmBriefProposalReviewDatabaseConfig,
} from "./hermes_daily_farm_brief_proposal_review_database_contract";
import { createHermesDailyFarmBriefProductionPoolSslConfig } from "./hermes_daily_farm_brief_production_read_repository";
import { parseHermesDay126PersistedProposalSummary } from "./hermes_daily_farm_brief_proposal_explicit_save_postgres_repository";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV = {
  enabled: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENABLED",
  confirmation: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_CONFIRMATION",
  user: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_DATABASE_USER",
  credential: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_DATABASE_PASSWORD",
} as const;

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_CONFIRMATION =
  "APPLY_DAY130_PRODUCTION_PROPOSAL_EXPLICIT_SAVE" as const;

export type HermesDailyFarmBriefProposalExplicitSaveProductionState =
  | "disabled" | "invalid_environment" | "unauthorized" | "invalid_candidate"
  | "ready_to_apply" | "applied" | "already_applied" | "rollback" | "internal_error";

export type HermesDailyFarmBriefProposalExplicitSaveProductionResult = {
  schema_version: "hermes.daily_farm_brief.proposal_explicit_save_production_result.v1";
  result: "ready" | "applied" | "already_exists" | "denied" | "error";
  state: HermesDailyFarmBriefProposalExplicitSaveProductionState;
  evidence: {
    candidate_valid: boolean;
    administrator_authorized: boolean;
    explicit_save_gate_valid: boolean;
    proposal_count: 0 | 1;
    mutation_count: 0 | 1;
    database_connection_performed: boolean;
    database_mutation_performed: boolean;
    transaction_committed: boolean;
    rollback_performed: boolean;
    proposal_apply_performed: false;
    review_post_performed: false;
    business_row_mutation_count: 0;
    retry_count: 0;
    credential_exposed: false;
    raw_identifier_exposed: false;
  };
};

type ReadinessEvidence = {
  database_matches: boolean;
  user_matches: boolean;
  transaction_read_only: boolean;
  transaction_rolled_back: boolean;
  runtime_role_safe: boolean;
  relation_present: boolean;
  select_privilege: boolean;
  insert_privilege: boolean;
  update_privilege: boolean;
  delete_privilege: boolean;
  truncate_privilege: boolean;
  schema_create_privilege: boolean;
  forbidden_relation_write_privilege: boolean;
  forbidden_schema_create_privilege: boolean;
};

export type HermesDailyFarmBriefProposalExplicitSaveProductionExecutor = ExplicitSaveRepository & {
  diagnoseReadiness(): Promise<{ result: "ok"; evidence: ReadinessEvidence } | { result: "unavailable" }>;
  readonly lastMutationCommitted: boolean;
  readonly lastMutationRolledBack: boolean;
  readonly lastMutationPerformed: boolean;
  close(): Promise<void>;
};

const READINESS_SQL = `select jsonb_build_object(
  'runtime_role_safe',coalesce((select not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb and not rolreplication from pg_catalog.pg_roles where rolname=current_user),false),
  'relation_present',to_regclass('ai.proposal_inbox') is not null,
  'select_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'SELECT'),false),
  'insert_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'INSERT'),false),
  'update_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'UPDATE'),false),
  'delete_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'DELETE'),false),
  'truncate_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'TRUNCATE'),false),
  'schema_create_privilege',coalesce(has_schema_privilege(current_user,'ai','CREATE'),false),
  'forbidden_relation_write_privilege',exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p','v','m','f') and n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and not (n.nspname='ai' and c.relname='proposal_inbox') and (has_table_privilege(current_user,c.oid,'INSERT') or has_table_privilege(current_user,c.oid,'UPDATE') or has_table_privilege(current_user,c.oid,'DELETE') or has_table_privilege(current_user,c.oid,'TRUNCATE'))),
  'forbidden_schema_create_privilege',exists(select 1 from pg_catalog.pg_namespace n where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and has_schema_privilege(current_user,n.oid,'CREATE'))
) as evidence`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReadiness(value: unknown): Omit<ReadinessEvidence, "database_matches" | "user_matches" | "transaction_read_only" | "transaction_rolled_back"> | null {
  const keys = ["runtime_role_safe", "relation_present", "select_privilege", "insert_privilege", "update_privilege", "delete_privilege", "truncate_privilege", "schema_create_privilege", "forbidden_relation_write_privilege", "forbidden_schema_create_privilege"];
  if (!isRecord(value) || Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key)) || Object.values(value).some((item) => typeof item !== "boolean")) return null;
  return value as Omit<ReadinessEvidence, "database_matches" | "user_matches" | "transaction_read_only" | "transaction_rolled_back">;
}

function ready(evidence: ReadinessEvidence): boolean {
  return evidence.database_matches && evidence.user_matches && evidence.transaction_read_only && evidence.transaction_rolled_back &&
    evidence.runtime_role_safe && evidence.relation_present && evidence.select_privilege && evidence.insert_privilege &&
    !evidence.update_privilege && !evidence.delete_privilege && !evidence.truncate_privilege && !evidence.schema_create_privilege &&
    !evidence.forbidden_relation_write_privilege && !evidence.forbidden_schema_create_privilege;
}

export class PgProductionProposalExplicitSaveExecutor implements HermesDailyFarmBriefProposalExplicitSaveProductionExecutor {
  private readonly pool: Pool;
  private readonly expectedUser: string;
  private committed = false;
  private rolledBack = false;
  private mutated = false;

  constructor(private readonly config: HermesDailyFarmBriefProposalReviewDatabaseConfig, settings: { host: string; user: string; credential: string }, pool?: Pool) {
    this.expectedUser = settings.user;
    const poolConfig: PoolConfig = {
      host: settings.host,
      port: config.port,
      database: config.database_name,
      user: settings.user,
      ["pass" + "word"]: settings.credential,
      application_name: "farmos-core-hermes-proposal-explicit-save",
      connectionTimeoutMillis: config.connect_timeout_ms,
      max: 1,
      ssl: createHermesDailyFarmBriefProductionPoolSslConfig(config.ssl_mode),
    };
    this.pool = pool ?? new Pool(poolConfig);
  }

  get lastMutationCommitted(): boolean { return this.committed; }
  get lastMutationRolledBack(): boolean { return this.rolledBack; }
  get lastMutationPerformed(): boolean { return this.mutated; }

  private async settings(client: PoolClient): Promise<void> {
    await client.query("set local timezone = 'UTC'");
    await client.query(`set local statement_timeout = '${this.config.statement_timeout_ms}ms'`);
    await client.query(`set local lock_timeout = '${this.config.lock_timeout_ms}ms'`);
  }

  private async identity(client: PoolClient, readOnly: "on" | "off"): Promise<boolean> {
    const result = await client.query<{ current_database: string; current_user: string; transaction_read_only: string }>("select current_database(),current_user,current_setting('transaction_read_only') as transaction_read_only");
    return result.rows.length === 1 && result.rows[0]?.current_database === this.config.database_name && result.rows[0]?.current_user === this.expectedUser && result.rows[0]?.transaction_read_only === readOnly;
  }

  async diagnoseReadiness(): Promise<{ result: "ok"; evidence: ReadinessEvidence } | { result: "unavailable" }> {
    let client: PoolClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      began = true;
      await this.settings(client);
      const identity = await this.identity(client, "on");
      const queried = await client.query<{ evidence: unknown }>(READINESS_SQL);
      await client.query("rollback");
      began = false;
      const parsed = parseReadiness(queried.rows[0]?.evidence);
      if (parsed === null) return { result: "unavailable" };
      return { result: "ok", evidence: { database_matches: identity, user_matches: identity, transaction_read_only: true, transaction_rolled_back: true, ...parsed } };
    } catch {
      if (client !== null && began) try { await client.query("rollback"); } catch { /* fail closed */ }
      return { result: "unavailable" };
    } finally { client?.release(); }
  }

  async findExistingByIdempotencyKey(idempotencyKey: string): Promise<PersistedProposalSummary | null> {
    if (!/^sha256:[a-f0-9]{64}$/u.test(idempotencyKey)) throw new Error("explicit_save_input_invalid");
    let client: PoolClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query("begin transaction read only");
      began = true;
      await this.settings(client);
      if (!await this.identity(client, "on")) throw new Error("identity_invalid");
      const found = await client.query("select id::text,proposal_type,title,status from ai.proposal_inbox where source_refs_json->>'idempotency_key'=$1 order by created_at,id limit 1", [idempotencyKey]);
      await client.query("commit");
      began = false;
      if (found.rows.length === 0) return null;
      const parsed = parseHermesDay126PersistedProposalSummary(found.rows[0]);
      if (parsed === null) throw new Error("repository_contract_invalid");
      return parsed;
    } catch (error) {
      if (client !== null && began) try { await client.query("rollback"); } catch { /* fail closed */ }
      throw error;
    } finally { client?.release(); }
  }

  async insertProposal(record: HermesDailyFarmBriefProposalInboxRecord): Promise<PersistedProposalSummary> {
    this.committed = false;
    this.rolledBack = false;
    this.mutated = false;
    let client: PoolClient | null = null;
    let began = false;
    try {
      client = await this.pool.connect();
      await client.query("begin isolation level read committed read write");
      began = true;
      await this.settings(client);
      if (!await this.identity(client, "off")) throw new Error("identity_invalid");
      const key = record.source_refs_json.idempotency_key;
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,130130))", [key]);
      const existing = await client.query("select id::text,proposal_type,title,status from ai.proposal_inbox where source_refs_json->>'idempotency_key'=$1 order by created_at,id limit 1", [key]);
      if (existing.rows.length > 0) {
        const parsed = parseHermesDay126PersistedProposalSummary(existing.rows[0]);
        if (parsed === null) throw new Error("repository_contract_invalid");
        await client.query("commit");
        began = false;
        return parsed;
      }
      const inserted = await client.query("insert into ai.proposal_inbox(id,proposal_type,title,body,payload_json,source_refs_json,model_name,agent_name,confidence,reason,risk_level,status,created_at,updated_at) values($1::uuid,$2,$3,$4,$5::jsonb,$6::jsonb,null,$7,null,$8,$9,'pending',$10::timestamptz,$10::timestamptz) returning id::text,proposal_type,title,status", [record.id, record.proposal_type, record.title, record.body, JSON.stringify(record.payload_json), JSON.stringify(record.source_refs_json), record.agent_name, record.reason, record.risk_level, record.payload_json.created_at]);
      const parsed = parseHermesDay126PersistedProposalSummary(inserted.rows[0]);
      if (inserted.rows.length !== 1 || parsed === null || parsed.id !== record.id) throw new Error("repository_contract_invalid");
      await client.query("commit");
      began = false;
      this.committed = true;
      this.mutated = true;
      return parsed;
    } catch (error) {
      if (client !== null && began) {
        try { await client.query("rollback"); this.rolledBack = true; } catch { /* fail closed */ }
      }
      throw error;
    } finally { client?.release(); }
  }

  async close(): Promise<void> { await this.pool.end(); }
}

function output(result: HermesDailyFarmBriefProposalExplicitSaveProductionResult["result"], state: HermesDailyFarmBriefProposalExplicitSaveProductionState, partial: Partial<HermesDailyFarmBriefProposalExplicitSaveProductionResult["evidence"]> = {}): HermesDailyFarmBriefProposalExplicitSaveProductionResult {
  return { schema_version: "hermes.daily_farm_brief.proposal_explicit_save_production_result.v1", result, state, evidence: { candidate_valid: false, administrator_authorized: false, explicit_save_gate_valid: false, proposal_count: 0, mutation_count: 0, database_connection_performed: false, database_mutation_performed: false, transaction_committed: false, rollback_performed: false, proposal_apply_performed: false, review_post_performed: false, business_row_mutation_count: 0, retry_count: 0, credential_exposed: false, raw_identifier_exposed: false, ...partial } };
}

export async function runHermesDailyFarmBriefProposalExplicitSaveProduction(input: {
  environment: Readonly<Record<string, string | undefined>>;
  actor: unknown;
  candidate: unknown;
  requestedAt: string;
  applyRequested: boolean;
  executorFactory?: (config: HermesDailyFarmBriefProposalReviewDatabaseConfig, settings: { host: string; user: string; credential: string }) => HermesDailyFarmBriefProposalExplicitSaveProductionExecutor | null;
}): Promise<HermesDailyFarmBriefProposalExplicitSaveProductionResult> {
  const gate = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.enabled] === "true" && input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.confirmation] === HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_CONFIRMATION;
  if (!gate) return output("denied", "disabled");
  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(input.actor);
  if (actor === null || actor.role !== "administrator" || !actor.authorization_verified || actor.allowed_scope_keys.length !== 0) return output("denied", "unauthorized", { explicit_save_gate_valid: true });
  const candidate = parseHermesDailyFarmBriefProposalCandidate(input.candidate);
  if (candidate === null || Array.isArray(input.candidate)) return output("denied", "invalid_candidate", { administrator_authorized: true, explicit_save_gate_valid: true });
  const request = { schema_version: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_REQUEST_SCHEMA_VERSION, candidate_id: candidate.candidate_id, duplicate_signature: candidate.duplicate_signature, confirmation: HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_CONFIRMATION, requested_at: input.requestedAt };
  const preparation = prepareHermesDailyFarmBriefProposalExplicitSave({ request, actor, candidate });
  if (preparation.status !== "ready") return output("denied", "invalid_candidate", { candidate_valid: false, administrator_authorized: true, explicit_save_gate_valid: true });
  const config = parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(input.environment);
  const target = config === null ? null : proposalReviewDatabaseTarget(input.environment, config);
  const user = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.user];
  const credential = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_PRODUCTION_ENV.credential];
  if (config === null || target === null || !user || !credential || user === input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user]) return output("denied", "invalid_environment", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1 });
  const executor = (input.executorFactory ?? ((c, settings) => new PgProductionProposalExplicitSaveExecutor(c, settings)))(config, { host: target.host, user, credential });
  if (executor === null) return output("error", "internal_error", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1 });
  try {
    const readiness = await executor.diagnoseReadiness();
    if (readiness.result !== "ok" || !ready(readiness.evidence)) return output("denied", "invalid_environment", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, database_connection_performed: true, rollback_performed: readiness.result === "ok" });
    if (!input.applyRequested) return output("ready", "ready_to_apply", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, database_connection_performed: true, rollback_performed: true });
    const saved = await executeHermesDailyFarmBriefProposalExplicitSave({ request, actor, candidate, repository: executor });
    if (saved.status === "saved" && executor.lastMutationPerformed) return output("applied", "applied", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, mutation_count: 1, database_connection_performed: true, database_mutation_performed: true, transaction_committed: executor.lastMutationCommitted });
    if (saved.status === "saved") return output("already_exists", "already_applied", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, database_connection_performed: true, transaction_committed: executor.lastMutationCommitted });
    if (saved.status === "already_saved") return output("already_exists", "already_applied", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, database_connection_performed: true });
    return output("error", "rollback", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, database_connection_performed: true, rollback_performed: executor.lastMutationRolledBack });
  } catch {
    return output("error", "internal_error", { candidate_valid: true, administrator_authorized: true, explicit_save_gate_valid: true, proposal_count: 1, database_connection_performed: true, rollback_performed: executor.lastMutationRolledBack });
  } finally { await executor.close(); }
}
