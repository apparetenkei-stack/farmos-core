import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  HERMES_DAY127_POSTGRES_RUNTIME_ROLE,
  HermesDailyFarmBriefProposalReviewPostgresRepository,
} from "./hermes_daily_farm_brief_proposal_review_postgres_repository";

export type HermesDay127ProposalReviewPostgresReadinessDenialReason =
  | "configuration_missing"
  | "database_target_invalid"
  | "isolation_not_verified"
  | "connection_unavailable"
  | "identity_invalid"
  | "transaction_not_read_only"
  | "relation_missing"
  | "schema_contract_invalid"
  | "select_privilege_missing"
  | "update_privilege_present"
  | "delete_privilege_present"
  | "truncate_privilege_present"
  | "app_write_privilege_present"
  | "audit_write_privilege_present"
  | "runtime_role_unsafe"
  | "public_access_present";

export type HermesDay127ProposalReviewPostgresReadinessResult =
  | {
      state: "ready";
      denial_reason: null;
      transaction_call_count: 1;
      database_write_performed: false;
      retry_count: 0;
      repository: HermesDailyFarmBriefProposalReviewPostgresRepository;
    }
  | {
      state: "denied";
      denial_reason: HermesDay127ProposalReviewPostgresReadinessDenialReason;
      transaction_call_count: 0 | 1;
      database_write_performed: false;
      retry_count: 0;
      repository: null;
    };

type Evidence = {
  database_matches: boolean;
  local_socket: boolean;
  identity_valid: boolean;
  transaction_read_only: boolean;
  relation_present: boolean;
  schema_contract_valid: boolean;
  select_privilege: boolean;
  update_privilege: boolean;
  delete_privilege: boolean;
  truncate_privilege: boolean;
  app_insert_privilege: boolean;
  audit_insert_privilege: boolean;
  runtime_role_safe: boolean;
  public_access_present: boolean;
};

const EVIDENCE_KEYS = [
  "database_matches", "local_socket", "identity_valid",
  "transaction_read_only", "relation_present", "schema_contract_valid",
  "select_privilege", "update_privilege", "delete_privilege",
  "truncate_privilege", "app_insert_privilege", "audit_insert_privilege",
  "runtime_role_safe", "public_access_present",
] as const;

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function lastJson(output: string): unknown | null {
  const line = output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).at(-1);
  if (!line) return null;
  try { return JSON.parse(line); } catch { return null; }
}
function parseEvidence(value: unknown): Evidence | null {
  if (!isRecord(value) || Object.keys(value).length !== EVIDENCE_KEYS.length || !EVIDENCE_KEYS.every((key) => Object.hasOwn(value, key))) return null;
  if (!Object.values(value).every((item) => typeof item === "boolean")) return null;
  return value as Evidence;
}

function readinessSql(): string {
  return `begin transaction read only;
set local timezone = 'UTC';
set local role ${HERMES_DAY127_POSTGRES_RUNTIME_ROLE};
select jsonb_build_object(
  'database_matches',current_database()='${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}',
  'local_socket',inet_server_addr() is null,
  'identity_valid',current_user='${HERMES_DAY127_POSTGRES_RUNTIME_ROLE}',
  'transaction_read_only',current_setting('transaction_read_only')='on',
  'relation_present',to_regclass('ai.proposal_inbox') is not null,
  'schema_contract_valid',coalesce((select count(*)=19 and count(*) filter (where column_name=any(array['id','proposal_type','title','body','payload_json','source_refs_json','model_name','agent_name','confidence','reason','risk_level','status','reviewed_by','reviewed_at','review_note','applied_at','applied_by','created_at','updated_at']))=19 from information_schema.columns where table_schema='ai' and table_name='proposal_inbox'),false),
  'select_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'SELECT'),false),
  'update_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'UPDATE'),false),
  'delete_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'DELETE'),false),
  'truncate_privilege',coalesce(has_table_privilege(current_user,to_regclass('ai.proposal_inbox'),'TRUNCATE'),false),
  'app_insert_privilege',coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relname='crop_cycles' and c.relkind in ('r','p')),'INSERT'),false),
  'audit_insert_privilege',coalesce(has_table_privilege(current_user,(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='audit' and c.relname='proposal_review_apply_events' and c.relkind in ('r','p')),'INSERT'),false),
  'runtime_role_safe',coalesce((select not rolsuper and not rolbypassrls from pg_catalog.pg_roles where rolname='${HERMES_DAY127_POSTGRES_RUNTIME_ROLE}'),false),
  'public_access_present',has_schema_privilege('public','ai','USAGE') or has_schema_privilege('public','ai','CREATE') or coalesce(has_table_privilege('public',to_regclass('ai.proposal_inbox'),'SELECT'),false) or coalesce(has_table_privilege('public',to_regclass('ai.proposal_inbox'),'INSERT'),false) or coalesce(has_table_privilege('public',to_regclass('ai.proposal_inbox'),'UPDATE'),false) or coalesce(has_table_privilege('public',to_regclass('ai.proposal_inbox'),'DELETE'),false) or coalesce(has_table_privilege('public',to_regclass('ai.proposal_inbox'),'TRUNCATE'),false)
)::text;
rollback;`;
}

function denial(evidence: Evidence): HermesDay127ProposalReviewPostgresReadinessDenialReason | null {
  if (!evidence.database_matches) return "database_target_invalid";
  if (!evidence.local_socket) return "isolation_not_verified";
  if (!evidence.identity_valid) return "identity_invalid";
  if (!evidence.transaction_read_only) return "transaction_not_read_only";
  if (!evidence.relation_present) return "relation_missing";
  if (!evidence.schema_contract_valid) return "schema_contract_invalid";
  if (!evidence.select_privilege) return "select_privilege_missing";
  if (evidence.update_privilege) return "update_privilege_present";
  if (evidence.delete_privilege) return "delete_privilege_present";
  if (evidence.truncate_privilege) return "truncate_privilege_present";
  if (evidence.app_insert_privilege) return "app_write_privilege_present";
  if (evidence.audit_insert_privilege) return "audit_write_privilege_present";
  if (!evidence.runtime_role_safe) return "runtime_role_unsafe";
  if (evidence.public_access_present) return "public_access_present";
  return null;
}

export async function diagnoseHermesDay127ProposalReviewPostgresReadiness(input: {
  databaseTarget: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay127ProposalReviewPostgresReadinessResult> {
  if (typeof input.databaseTarget !== "string" || input.databaseTarget.length === 0) {
    return { state: "denied", denial_reason: "configuration_missing", transaction_call_count: 0, database_write_performed: false, retry_count: 0, repository: null };
  }
  if (!classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) {
    return { state: "denied", denial_reason: "database_target_invalid", transaction_call_count: 0, database_write_performed: false, retry_count: 0, repository: null };
  }
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(input.databaseTarget);
  if (executor === null) {
    return { state: "denied", denial_reason: "connection_unavailable", transaction_call_count: 0, database_write_performed: false, retry_count: 0, repository: null };
  }
  const executed = await executor.executeSingleConnection(readinessSql());
  if (!executed.ok) {
    return { state: "denied", denial_reason: "connection_unavailable", transaction_call_count: 1, database_write_performed: false, retry_count: 0, repository: null };
  }
  const evidence = parseEvidence(lastJson(executed.output));
  if (evidence === null) {
    return { state: "denied", denial_reason: "identity_invalid", transaction_call_count: 1, database_write_performed: false, retry_count: 0, repository: null };
  }
  const reason = denial(evidence);
  if (reason !== null) {
    return { state: "denied", denial_reason: reason, transaction_call_count: 1, database_write_performed: false, retry_count: 0, repository: null };
  }
  return { state: "ready", denial_reason: null, transaction_call_count: 1, database_write_performed: false, retry_count: 0, repository: new HermesDailyFarmBriefProposalReviewPostgresRepository(executor) };
}
