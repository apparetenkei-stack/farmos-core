import { readFile } from "node:fs/promises";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";
import {
  HERMES_DAY128_REVIEW_RUNTIME_ROLE,
  PostgresDailyFarmBriefProposalReviewDecisionRepository,
  type HermesDay128ReviewPostgresTransactionExecutor,
} from "./hermes_daily_farm_brief_proposal_review_decision_postgres_repository";

export const HERMES_DAY128_FIXTURE_APPLY_APPROVED_ENV =
  "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_FIXTURE_APPLY_APPROVED" as const;
export const HERMES_DAY128_FIXTURE_ROLLBACK_APPROVED_ENV =
  "HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DECISION_FIXTURE_ROLLBACK_APPROVED" as const;
export const HERMES_DAY128_FIXTURE_APPLY_SQL_PATH =
  "scripts/sql/day128_daily_farm_brief_proposal_review_decision_fixture_apply.sql" as const;
export const HERMES_DAY128_FIXTURE_ROLLBACK_SQL_PATH =
  "scripts/sql/day128_daily_farm_brief_proposal_review_decision_fixture_rollback.sql" as const;

export type HermesDay128ReviewReadinessState =
  | "ready"
  | "schema_missing"
  | "role_missing"
  | "required_privilege_missing"
  | "forbidden_privilege_present"
  | "invalid_database_target"
  | "unavailable";

type Evidence = {
  database_matches: boolean;
  local_socket: boolean;
  audit_schema_present: boolean;
  audit_table_present: boolean;
  audit_columns_valid: boolean;
  audit_foreign_key_valid: boolean;
  audit_decision_constraint_valid: boolean;
  uuid_function_present: boolean;
  runtime_role_present: boolean;
  runtime_role_safe: boolean;
  runtime_role_nologin: boolean;
  ai_schema_usage: boolean;
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
  audit_schema_usage: boolean;
  audit_insert: boolean;
  audit_update: boolean;
  audit_delete: boolean;
  audit_truncate: boolean;
  app_write: boolean;
};

const EVIDENCE_KEYS = [
  "database_matches", "local_socket", "audit_schema_present",
  "audit_table_present", "audit_columns_valid", "audit_foreign_key_valid",
  "audit_decision_constraint_valid", "uuid_function_present",
  "runtime_role_present", "runtime_role_safe", "runtime_role_nologin",
  "ai_schema_usage", "proposal_select", "update_status",
  "update_reviewed_by", "update_reviewed_at", "update_review_note",
  "update_updated_at", "proposal_insert", "proposal_delete",
  "proposal_truncate", "proposal_table_update", "update_applied_at",
  "update_applied_by", "update_payload_json", "update_source_refs_json",
  "audit_schema_usage", "audit_insert", "audit_update", "audit_delete",
  "audit_truncate", "app_write",
] as const;

export type HermesDay128ReviewReadinessResult = {
  state: HermesDay128ReviewReadinessState;
  denial_reason: Exclude<HermesDay128ReviewReadinessState, "ready"> | null;
  database_target_valid: boolean;
  local_socket: boolean;
  audit_schema_present: boolean;
  audit_table_present: boolean;
  runtime_role_present: boolean;
  required_privileges_present: boolean;
  forbidden_privileges_absent: boolean;
  app_database_write_privilege_present: boolean;
  production_connection_performed: false;
  database_write_performed: false;
  transaction_call_count: 0 | 1;
  retry_count: 0;
  repository: PostgresDailyFarmBriefProposalReviewDecisionRepository | null;
};

type JsonRecord = Record<string, unknown>;
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
function parseEvidence(value: unknown): Evidence | null {
  return isRecord(value) && exact(value, EVIDENCE_KEYS) && Object.values(value).every((item) => typeof item === "boolean")
    ? value as Evidence
    : null;
}

export function hermesDay128ReviewReadinessSql(): string {
  const role = HERMES_DAY128_REVIEW_RUNTIME_ROLE;
  return `begin transaction read only;
set local timezone = 'UTC';
select jsonb_build_object(
  'database_matches',current_database()='${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}',
  'local_socket',inet_server_addr() is null,
  'audit_schema_present',to_regnamespace('audit') is not null,
  'audit_table_present',to_regclass('audit.proposal_review_decision_events') is not null,
  'audit_columns_valid',coalesce((select count(*)=10 and count(*) filter(where column_name=any(array['id','proposal_id','decision_type','decision_note','decided_by','decided_by_role','decision_source','event_metadata','decided_at','created_at']))=10 from information_schema.columns where table_schema='audit' and table_name='proposal_review_decision_events'),false),
  'audit_foreign_key_valid',exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='f' and confrelid=to_regclass('ai.proposal_inbox') and confdeltype='r'),
  'audit_decision_constraint_valid',exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and conname='proposal_review_decision_events_decision_type_check' and pg_get_constraintdef(oid) like '%approve_review%' and pg_get_constraintdef(oid) like '%reject_review%' and pg_get_constraintdef(oid) like '%request_revision%' and pg_get_constraintdef(oid) like '%defer_review%'),
  'uuid_function_present',to_regprocedure('gen_random_uuid()') is not null,
  'runtime_role_present',exists(select 1 from pg_catalog.pg_roles where rolname='${role}'),
  'runtime_role_safe',coalesce((select not rolsuper and not rolbypassrls from pg_catalog.pg_roles where rolname='${role}'),false),
  'runtime_role_nologin',coalesce((select not rolcanlogin from pg_catalog.pg_roles where rolname='${role}'),false),
  'ai_schema_usage',coalesce(has_schema_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regnamespace('ai'),'USAGE'),false),
  'proposal_select',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'SELECT'),false),
  'update_status',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'status','UPDATE'),false),
  'update_reviewed_by',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'reviewed_by','UPDATE'),false),
  'update_reviewed_at',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'reviewed_at','UPDATE'),false),
  'update_review_note',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'review_note','UPDATE'),false),
  'update_updated_at',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'updated_at','UPDATE'),false),
  'proposal_insert',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'INSERT'),false),
  'proposal_delete',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'DELETE'),false),
  'proposal_truncate',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'TRUNCATE'),false),
  'proposal_table_update',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'UPDATE'),false),
  'update_applied_at',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'applied_at','UPDATE'),false),
  'update_applied_by',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'applied_by','UPDATE'),false),
  'update_payload_json',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'payload_json','UPDATE'),false),
  'update_source_refs_json',coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('ai.proposal_inbox'),'source_refs_json','UPDATE'),false),
  'audit_schema_usage',coalesce(has_schema_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regnamespace('audit'),'USAGE'),false),
  'audit_insert',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('audit.proposal_review_decision_events'),'INSERT'),false),
  'audit_update',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('audit.proposal_review_decision_events'),'UPDATE'),false),
  'audit_delete',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('audit.proposal_review_decision_events'),'DELETE'),false),
  'audit_truncate',coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),to_regclass('audit.proposal_review_decision_events'),'TRUNCATE'),false),
  'app_write',exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind in ('r','p') and (has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),c.oid,'INSERT') or has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),c.oid,'UPDATE') or has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),c.oid,'DELETE') or has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${role}'),c.oid,'TRUNCATE')))
)::text;
rollback;`;
}

function requiredPrivileges(e: Evidence): boolean {
  return e.ai_schema_usage && e.proposal_select && e.update_status && e.update_reviewed_by && e.update_reviewed_at && e.update_review_note && e.update_updated_at && e.audit_schema_usage && e.audit_insert;
}
function forbiddenPrivilegesAbsent(e: Evidence): boolean {
  return !e.proposal_insert && !e.proposal_delete && !e.proposal_truncate && !e.proposal_table_update && !e.update_applied_at && !e.update_applied_by && !e.update_payload_json && !e.update_source_refs_json && !e.audit_update && !e.audit_delete && !e.audit_truncate && !e.app_write;
}
function classifyEvidence(e: Evidence): HermesDay128ReviewReadinessState {
  if (!e.database_matches || !e.local_socket) return "invalid_database_target";
  if (!e.audit_schema_present || !e.audit_table_present || !e.audit_columns_valid || !e.audit_foreign_key_valid || !e.audit_decision_constraint_valid || !e.uuid_function_present) return "schema_missing";
  if (!e.runtime_role_present || !e.runtime_role_safe || !e.runtime_role_nologin) return "role_missing";
  if (!requiredPrivileges(e)) return "required_privilege_missing";
  if (!forbiddenPrivilegesAbsent(e)) return "forbidden_privilege_present";
  return "ready";
}

function resultFor(input: {
  state: HermesDay128ReviewReadinessState;
  calls: 0 | 1;
  evidence?: Evidence;
  repository?: PostgresDailyFarmBriefProposalReviewDecisionRepository | null;
}): HermesDay128ReviewReadinessResult {
  const e = input.evidence;
  return {
    state: input.state,
    denial_reason: input.state === "ready" ? null : input.state,
    database_target_valid: e?.database_matches ?? false,
    local_socket: e?.local_socket ?? false,
    audit_schema_present: e?.audit_schema_present ?? false,
    audit_table_present: e?.audit_table_present ?? false,
    runtime_role_present: e?.runtime_role_present ?? false,
    required_privileges_present: e ? requiredPrivileges(e) : false,
    forbidden_privileges_absent: e ? forbiddenPrivilegesAbsent(e) : false,
    app_database_write_privilege_present: e?.app_write ?? false,
    production_connection_performed: false,
    database_write_performed: false,
    transaction_call_count: input.calls,
    retry_count: 0,
    repository: input.repository ?? null,
  };
}

export async function diagnoseHermesDay128ReviewPostgresReadiness(input: {
  databaseTarget: unknown;
  metadataExecutorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
  transactionExecutorFactory?: (databaseTarget: typeof HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE) => HermesDay128ReviewPostgresTransactionExecutor | null;
}): Promise<HermesDay128ReviewReadinessResult> {
  if (typeof input.databaseTarget !== "string" || !classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) return resultFor({ state: "invalid_database_target", calls: 0 });
  const executor = (input.metadataExecutorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(input.databaseTarget);
  if (executor === null) return resultFor({ state: "unavailable", calls: 0 });
  const raw = await executor.executeSingleConnection(hermesDay128ReviewReadinessSql());
  if (!raw.ok) return resultFor({ state: "unavailable", calls: 1 });
  const evidence = parseEvidence(lastJson(raw.output));
  if (evidence === null) return resultFor({ state: "unavailable", calls: 1 });
  const state = classifyEvidence(evidence);
  if (state !== "ready") return resultFor({ state, calls: 1, evidence });
  const transactionExecutor = input.transactionExecutorFactory?.(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE) ?? null;
  if (transactionExecutor === null) return resultFor({ state: "unavailable", calls: 1, evidence });
  return resultFor({ state: "ready", calls: 1, evidence, repository: new PostgresDailyFarmBriefProposalReviewDecisionRepository(transactionExecutor) });
}

type FixtureEvidence = {
  database_matches: boolean;
  local_socket: boolean;
  proposal_relation_present: boolean;
  schema_ddl_authority: boolean;
  role_ddl_authority: boolean;
  audit_table_compatible: boolean;
  runtime_role_safe: boolean;
  fixture_ready: boolean;
};
const FIXTURE_KEYS = ["database_matches", "local_socket", "proposal_relation_present", "schema_ddl_authority", "role_ddl_authority", "audit_table_compatible", "runtime_role_safe", "fixture_ready"] as const;

function fixturePreflightSql(): string {
  return `begin transaction read only;
set local timezone = 'UTC';
select jsonb_build_object(
  'database_matches',current_database()='${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}',
  'local_socket',inet_server_addr() is null,
  'proposal_relation_present',to_regclass('ai.proposal_inbox') is not null,
  'schema_ddl_authority',coalesce((select rolsuper from pg_catalog.pg_roles where rolname=current_user),false) or has_database_privilege(current_user,current_database(),'CREATE'),
  'role_ddl_authority',coalesce((select rolsuper or rolcreaterole from pg_catalog.pg_roles where rolname=current_user),false),
  'audit_table_compatible',to_regclass('audit.proposal_review_decision_events') is null or ((select count(*)=10 and count(*) filter(where column_name=any(array['id','proposal_id','decision_type','decision_note','decided_by','decided_by_role','decision_source','event_metadata','decided_at','created_at']))=10 from information_schema.columns where table_schema='audit' and table_name='proposal_review_decision_events') and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='f' and confrelid=to_regclass('ai.proposal_inbox') and confdeltype='r') and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and conname='proposal_review_decision_events_decision_type_check')),
  'runtime_role_safe',not exists(select 1 from pg_catalog.pg_roles where rolname='${HERMES_DAY128_REVIEW_RUNTIME_ROLE}') or coalesce((select not rolcanlogin and not rolsuper and not rolbypassrls from pg_catalog.pg_roles where rolname='${HERMES_DAY128_REVIEW_RUNTIME_ROLE}'),false),
  'fixture_ready',to_regclass('audit.proposal_review_decision_events') is not null and exists(select 1 from pg_catalog.pg_roles where rolname='${HERMES_DAY128_REVIEW_RUNTIME_ROLE}') and coalesce(has_column_privilege((select oid from pg_catalog.pg_roles where rolname='${HERMES_DAY128_REVIEW_RUNTIME_ROLE}'),to_regclass('ai.proposal_inbox'),'status','UPDATE'),false) and coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${HERMES_DAY128_REVIEW_RUNTIME_ROLE}'),to_regclass('audit.proposal_review_decision_events'),'INSERT'),false) and not coalesce(has_table_privilege((select oid from pg_catalog.pg_roles where rolname='${HERMES_DAY128_REVIEW_RUNTIME_ROLE}'),to_regclass('ai.proposal_inbox'),'INSERT'),false)
)::text;
rollback;`;
}

export type HermesDay128FixtureReadinessResult = {
  state: "ready_to_apply" | "already_ready" | "denied";
  denial_reason: "configuration_missing" | "database_target_invalid" | "connection_unavailable" | "isolation_not_verified" | "ddl_authority_missing" | "proposal_relation_missing" | "fixture_contract_invalid" | null;
  transaction_call_count: 0 | 1;
  database_write_performed: false;
  retry_count: 0;
};

export async function diagnoseHermesDay128FixtureReadiness(input: {
  databaseTarget: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay128FixtureReadinessResult> {
  if (typeof input.databaseTarget !== "string" || input.databaseTarget.length === 0) return { state: "denied", denial_reason: "configuration_missing", transaction_call_count: 0, database_write_performed: false, retry_count: 0 };
  if (!classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) return { state: "denied", denial_reason: "database_target_invalid", transaction_call_count: 0, database_write_performed: false, retry_count: 0 };
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(input.databaseTarget);
  if (executor === null) return { state: "denied", denial_reason: "connection_unavailable", transaction_call_count: 0, database_write_performed: false, retry_count: 0 };
  const executed = await executor.executeSingleConnection(fixturePreflightSql());
  if (!executed.ok) return { state: "denied", denial_reason: "connection_unavailable", transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
  const value = lastJson(executed.output);
  if (!isRecord(value) || !exact(value, FIXTURE_KEYS) || !Object.values(value).every((item) => typeof item === "boolean")) return { state: "denied", denial_reason: "fixture_contract_invalid", transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
  const e = value as FixtureEvidence;
  if (!e.database_matches || !e.local_socket) return { state: "denied", denial_reason: "isolation_not_verified", transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
  if (!e.proposal_relation_present) return { state: "denied", denial_reason: "proposal_relation_missing", transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
  if (!e.schema_ddl_authority || !e.role_ddl_authority) return { state: "denied", denial_reason: "ddl_authority_missing", transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
  if (!e.audit_table_compatible || !e.runtime_role_safe) return { state: "denied", denial_reason: "fixture_contract_invalid", transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
  return { state: e.fixture_ready ? "already_ready" : "ready_to_apply", denial_reason: null, transaction_call_count: 1, database_write_performed: false, retry_count: 0 };
}

export type HermesDay128FixtureMutationResult = {
  state: "applied" | "already_ready" | "rolled_back" | "denied" | "failed";
  denial_reason: "explicit_approval_required" | "database_target_invalid" | "preflight_denied" | "connection_unavailable" | "receipt_invalid" | null;
  target_database: "isolated_test" | "none" | "rejected";
  local_socket: boolean;
  fixture_apply_performed: boolean;
  fixture_rollback_performed: boolean;
  schema_created: boolean;
  table_created: boolean;
  role_created: boolean;
  privileges_configured: boolean;
  production_connection_performed: false;
  app_database_write_performed: false;
  proposal_write_performed: false;
  retry_count: 0;
};

function mutationResult(input: Partial<HermesDay128FixtureMutationResult> & Pick<HermesDay128FixtureMutationResult, "state" | "denial_reason">): HermesDay128FixtureMutationResult {
  return { target_database: "none", local_socket: false, fixture_apply_performed: false, fixture_rollback_performed: false, schema_created: false, table_created: false, role_created: false, privileges_configured: false, production_connection_performed: false, app_database_write_performed: false, proposal_write_performed: false, retry_count: 0, ...input };
}

export async function applyHermesDay128Fixture(input: {
  databaseTarget: unknown;
  approved: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay128FixtureMutationResult> {
  if (input.approved !== true) return mutationResult({ state: "denied", denial_reason: "explicit_approval_required" });
  if (typeof input.databaseTarget !== "string" || !classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) return mutationResult({ state: "denied", denial_reason: "database_target_invalid", target_database: "rejected" });
  const preflight = await diagnoseHermesDay128FixtureReadiness({ databaseTarget: input.databaseTarget, executorFactory: input.executorFactory });
  if (preflight.state === "denied") return mutationResult({ state: "denied", denial_reason: "preflight_denied", target_database: "isolated_test", local_socket: preflight.denial_reason !== "isolation_not_verified" });
  if (preflight.state === "already_ready") return mutationResult({ state: "already_ready", denial_reason: null, target_database: "isolated_test", local_socket: true });
  let sql: string;
  try { sql = await readFile(HERMES_DAY128_FIXTURE_APPLY_SQL_PATH, "utf8"); } catch { return mutationResult({ state: "failed", denial_reason: "receipt_invalid", target_database: "isolated_test", local_socket: true }); }
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  if (executor === null) return mutationResult({ state: "failed", denial_reason: "connection_unavailable", target_database: "isolated_test", local_socket: true });
  const executed = await executor.executeSingleConnection(sql);
  const receipt = lastJson(executed.output);
  if (!executed.ok || !isRecord(receipt) || !exact(receipt, ["fixture_state", "postcondition_verified", "schema_created", "table_created", "role_created", "privileges_configured"]) || receipt.fixture_state !== "applied" || receipt.postcondition_verified !== true || typeof receipt.schema_created !== "boolean" || typeof receipt.table_created !== "boolean" || typeof receipt.role_created !== "boolean" || receipt.privileges_configured !== true) return mutationResult({ state: "failed", denial_reason: "receipt_invalid", target_database: "isolated_test", local_socket: true });
  return mutationResult({ state: "applied", denial_reason: null, target_database: "isolated_test", local_socket: true, fixture_apply_performed: true, schema_created: receipt.schema_created, table_created: receipt.table_created, role_created: receipt.role_created, privileges_configured: true });
}

export async function rollbackHermesDay128Fixture(input: {
  databaseTarget: unknown;
  approved: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay128FixtureMutationResult> {
  if (input.approved !== true) return mutationResult({ state: "denied", denial_reason: "explicit_approval_required" });
  if (typeof input.databaseTarget !== "string" || !classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) return mutationResult({ state: "denied", denial_reason: "database_target_invalid", target_database: "rejected" });
  let sql: string;
  try { sql = await readFile(HERMES_DAY128_FIXTURE_ROLLBACK_SQL_PATH, "utf8"); } catch { return mutationResult({ state: "failed", denial_reason: "receipt_invalid", target_database: "isolated_test", local_socket: true }); }
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  if (executor === null) return mutationResult({ state: "failed", denial_reason: "connection_unavailable", target_database: "isolated_test", local_socket: true });
  const executed = await executor.executeSingleConnection(sql);
  const receipt = lastJson(executed.output);
  if (!executed.ok || !isRecord(receipt) || !exact(receipt, ["fixture_state", "postcondition_verified", "audit_table_preserved"]) || receipt.fixture_state !== "rolled_back" || receipt.postcondition_verified !== true || receipt.audit_table_preserved !== true) return mutationResult({ state: "failed", denial_reason: "receipt_invalid", target_database: "isolated_test", local_socket: true });
  return mutationResult({ state: "rolled_back", denial_reason: null, target_database: "isolated_test", local_socket: true, fixture_rollback_performed: true });
}
