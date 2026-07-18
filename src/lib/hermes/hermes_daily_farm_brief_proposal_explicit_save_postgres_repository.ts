import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE,
} from "./hermes_daily_farm_brief_proposal_candidate_boundary";
import type {
  ExplicitSaveRepository,
  HermesDailyFarmBriefProposalInboxRecord,
  PersistedProposalSummary,
} from "./hermes_daily_farm_brief_proposal_explicit_save_boundary";

export const HERMES_DAY126_ISOLATED_TEST_DATABASE_ENV = "HERMES_DAY126_ISOLATED_TEST_DATABASE" as const;
export const HERMES_DAY126_POSTGRES_BOUNDARY = "day126_daily_farm_brief_explicit_save_postgres" as const;
export const HERMES_DAY126_POSTGRES_RUNTIME_ROLE = "farmos_ai_proposal_local" as const;
const ADVISORY_LOCK_SEED = 126126;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f<>]{1,200}$/u;

type JsonRecord = Record<string, unknown>;

export type HermesDay126PostgresReadinessDenialReason =
  | "configuration_missing"
  | "database_target_invalid"
  | "isolation_not_verified"
  | "connection_unavailable"
  | "relation_missing"
  | "transaction_read_only"
  | "insert_privilege_missing"
  | "update_privilege_present"
  | "delete_privilege_present"
  | "app_write_privilege_present"
  | "audit_write_privilege_present"
  | "identity_invalid";

export type HermesDay126PostgresReadinessResult =
  | {
      state: "ready";
      denial_reason: null;
      database_target: "isolated_test";
      transaction_call_count: 1;
      repository: HermesDailyFarmBriefProposalExplicitSavePostgresRepository;
    }
  | {
      state: "denied";
      denial_reason: HermesDay126PostgresReadinessDenialReason;
      database_target: "none" | "rejected" | "isolated_test";
      transaction_call_count: 0 | 1;
      repository: null;
    };

type ReadinessEvidence = {
  database_matches: boolean;
  local_socket: boolean;
  transaction_read_only: boolean;
  relation_present: boolean;
  identity_valid: boolean;
  insert_privilege: boolean;
  update_privilege: boolean;
  delete_privilege: boolean;
  app_insert_privilege: boolean;
  audit_insert_privilege: boolean;
};

type AtomicInsertResult = { summary: PersistedProposalSummary; inserted: boolean };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function lastJson(output: string): unknown | null {
  const line = output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).at(-1);
  if (!line) return null;
  try { return JSON.parse(line); } catch { return null; }
}

function encoded(value: unknown): string {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value), "utf8").toString("base64");
}

export function parseHermesDay126PersistedProposalSummary(value: unknown): PersistedProposalSummary | null {
  if (!isRecord(value) || !exact(value, ["id", "proposal_type", "title", "status"])) return null;
  if (typeof value.id !== "string" || !UUID_PATTERN.test(value.id) || value.proposal_type !== HERMES_DAILY_FARM_BRIEF_PROPOSAL_TYPE || typeof value.title !== "string" || !SAFE_TEXT.test(value.title) || typeof value.status !== "string" || !SAFE_TEXT.test(value.status)) return null;
  return value as PersistedProposalSummary;
}

function parseReadiness(value: unknown): ReadinessEvidence | null {
  if (!isRecord(value) || !exact(value, ["database_matches", "local_socket", "transaction_read_only", "relation_present", "identity_valid", "insert_privilege", "update_privilege", "delete_privilege", "app_insert_privilege", "audit_insert_privilege"])) return null;
  if (!Object.values(value).every((item) => typeof item === "boolean")) return null;
  return value as ReadinessEvidence;
}

function readinessSql(): string {
  return `begin isolation level read committed read write;
set local timezone = 'UTC';
set local role ${HERMES_DAY126_POSTGRES_RUNTIME_ROLE};
select jsonb_build_object(
  'database_matches',current_database()='${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}',
  'local_socket',inet_server_addr() is null,
  'transaction_read_only',current_setting('transaction_read_only')='on',
  'relation_present',to_regclass('ai.proposal_inbox') is not null,
  'identity_valid',current_user='${HERMES_DAY126_POSTGRES_RUNTIME_ROLE}',
  'insert_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'INSERT'),false),
  'update_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'UPDATE'),false),
  'delete_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'DELETE'),false),
  'app_insert_privilege',coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relname='crop_cycles' and c.relkind in ('r','p')),'INSERT'),false),
  'audit_insert_privilege',coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='audit' and c.relname='proposal_review_apply_events' and c.relkind in ('r','p')),'INSERT'),false)
)::text;
rollback;`;
}

function targetGuard(write: boolean): string {
  return `do $day126$ begin
  if current_database() <> '${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if current_user <> '${HERMES_DAY126_POSTGRES_RUNTIME_ROLE}' then raise exception 'identity_invalid'; end if;
  if to_regclass('ai.proposal_inbox') is null then raise exception 'relation_missing'; end if;
  ${write ? `if current_setting('transaction_read_only') <> 'off' then raise exception 'transaction_read_only'; end if;
  if not has_table_privilege(current_user,'ai.proposal_inbox','INSERT') then raise exception 'insert_privilege_missing'; end if;
  if has_table_privilege(current_user,'ai.proposal_inbox','UPDATE') then raise exception 'update_privilege_present'; end if;
  if has_table_privilege(current_user,'ai.proposal_inbox','DELETE') then raise exception 'delete_privilege_present'; end if;
  if coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relname='crop_cycles' and c.relkind in ('r','p')),'INSERT'),false) then raise exception 'app_write_privilege_present'; end if;
  if coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='audit' and c.relname='proposal_review_apply_events' and c.relkind in ('r','p')),'INSERT'),false) then raise exception 'audit_write_privilege_present'; end if;` : ""}
end $day126$;`;
}

function findSql(idempotencyKey: string): string {
  return `begin transaction read only;
set local timezone = 'UTC';
set local role ${HERMES_DAY126_POSTGRES_RUNTIME_ROLE};
${targetGuard(false)}
prepare day126_find(text) as
select coalesce((select jsonb_build_object('id',id::text,'proposal_type',proposal_type,'title',title,'status',status)
from ai.proposal_inbox where source_refs_json->>'idempotency_key'=$1 order by created_at asc,id asc limit 1),'null'::jsonb)::text;
execute day126_find(convert_from(decode('${encoded(idempotencyKey)}','base64'),'utf8'));
deallocate day126_find;
commit;`;
}

function insertSql(record: HermesDailyFarmBriefProposalInboxRecord): string {
  const idempotencyKey = record.source_refs_json.idempotency_key;
  return `begin isolation level read committed read write;
set local timezone = 'UTC';
set local role ${HERMES_DAY126_POSTGRES_RUNTIME_ROLE};
${targetGuard(true)}
select pg_advisory_xact_lock(hashtextextended(convert_from(decode('${encoded(idempotencyKey)}','base64'),'utf8'),${ADVISORY_LOCK_SEED}));
prepare day126_insert(text,jsonb) as
with existing as (
  select id,proposal_type,title,status from ai.proposal_inbox
  where source_refs_json->>'idempotency_key'=$1 order by created_at asc,id asc limit 1
), inserted as (
  insert into ai.proposal_inbox(id,proposal_type,title,body,payload_json,source_refs_json,model_name,agent_name,confidence,reason,risk_level,status,created_at,updated_at)
  select ($2->>'id')::uuid,$2->>'proposal_type',$2->>'title',$2->>'body',$2->'payload_json',$2->'source_refs_json',null,$2->>'agent_name',null,$2->>'reason',$2->>'risk_level','pending',($2->'payload_json'->>'created_at')::timestamptz,($2->'payload_json'->>'created_at')::timestamptz
  where not exists(select 1 from existing)
  returning id,proposal_type,title,status
), selected as (
  select id,proposal_type,title,status,true as inserted from inserted
  union all
  select id,proposal_type,title,status,false from existing where not exists(select 1 from inserted)
)
select jsonb_build_object('summary',jsonb_build_object('id',id::text,'proposal_type',proposal_type,'title',title,'status',status),'inserted',inserted)::text from selected limit 1;
execute day126_insert(convert_from(decode('${encoded(idempotencyKey)}','base64'),'utf8'),convert_from(decode('${encoded(record)}','base64'),'utf8')::jsonb);
deallocate day126_insert;
commit;`;
}

export class HermesDailyFarmBriefProposalExplicitSavePostgresRepository implements ExplicitSaveRepository {
  constructor(private readonly executor: HermesDailyFarmBriefIsolatedPostgresExecutor) {}

  async findExistingByIdempotencyKey(idempotencyKey: string): Promise<PersistedProposalSummary | null> {
    if (!/^sha256:[a-f0-9]{64}$/u.test(idempotencyKey)) throw new Error("day126_repository_input_invalid");
    const result = await this.executor.executeSingleConnection(findSql(idempotencyKey));
    if (!result.ok) throw new Error("day126_repository_unavailable");
    const value = lastJson(result.output);
    if (value === null) return null;
    const summary = parseHermesDay126PersistedProposalSummary(value);
    if (summary === null) throw new Error("day126_repository_contract_invalid");
    return summary;
  }

  async insertProposal(record: HermesDailyFarmBriefProposalInboxRecord): Promise<PersistedProposalSummary> {
    const result = await this.executor.executeSingleConnection(insertSql(record));
    if (!result.ok) throw new Error("day126_repository_unavailable");
    const value = lastJson(result.output);
    if (!isRecord(value) || !exact(value, ["summary", "inserted"]) || typeof value.inserted !== "boolean") throw new Error("day126_repository_contract_invalid");
    const summary = parseHermesDay126PersistedProposalSummary(value.summary);
    if (summary === null || (value.inserted && summary.id !== record.id)) throw new Error("day126_repository_contract_invalid");
    return summary;
  }
}

function denial(evidence: ReadinessEvidence): HermesDay126PostgresReadinessDenialReason | null {
  if (!evidence.database_matches) return "database_target_invalid";
  if (!evidence.local_socket) return "isolation_not_verified";
  if (evidence.transaction_read_only) return "transaction_read_only";
  if (!evidence.relation_present) return "relation_missing";
  if (!evidence.identity_valid) return "identity_invalid";
  if (!evidence.insert_privilege) return "insert_privilege_missing";
  if (evidence.update_privilege) return "update_privilege_present";
  if (evidence.delete_privilege) return "delete_privilege_present";
  if (evidence.app_insert_privilege) return "app_write_privilege_present";
  if (evidence.audit_insert_privilege) return "audit_write_privilege_present";
  return null;
}

export async function diagnoseHermesDay126ProposalExplicitSavePostgresReadiness(input: {
  databaseTarget: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay126PostgresReadinessResult> {
  if (typeof input.databaseTarget !== "string" || input.databaseTarget.length === 0) return { state: "denied", denial_reason: "configuration_missing", database_target: "none", transaction_call_count: 0, repository: null };
  if (!classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) return { state: "denied", denial_reason: "database_target_invalid", database_target: "rejected", transaction_call_count: 0, repository: null };
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(input.databaseTarget);
  if (executor === null) return { state: "denied", denial_reason: "isolation_not_verified", database_target: "isolated_test", transaction_call_count: 0, repository: null };
  const result = await executor.executeSingleConnection(readinessSql());
  if (!result.ok) return { state: "denied", denial_reason: "connection_unavailable", database_target: "isolated_test", transaction_call_count: 1, repository: null };
  const evidence = parseReadiness(lastJson(result.output));
  if (evidence === null) return { state: "denied", denial_reason: "identity_invalid", database_target: "isolated_test", transaction_call_count: 1, repository: null };
  const reason = denial(evidence);
  return reason === null
    ? { state: "ready", denial_reason: null, database_target: "isolated_test", transaction_call_count: 1, repository: new HermesDailyFarmBriefProposalExplicitSavePostgresRepository(executor) }
    : { state: "denied", denial_reason: reason, database_target: "isolated_test", transaction_call_count: 1, repository: null };
}
