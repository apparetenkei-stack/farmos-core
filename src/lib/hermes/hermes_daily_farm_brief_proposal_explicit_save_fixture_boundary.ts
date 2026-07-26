import { readFile } from "node:fs/promises";

import {
  HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE,
  classifyHermesDailyFarmBriefDay114DatabaseTarget,
  createHermesDailyFarmBriefDockerPostgresExecutor,
  type HermesDailyFarmBriefIsolatedPostgresExecutor,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_postgres_persistence_boundary";

export const HERMES_DAY126_FIXTURE_APPLY_ENABLED_ENV = "HERMES_DAY126_FIXTURE_APPLY_ENABLED" as const;
export const HERMES_DAY126_FIXTURE_SQL_PATH = "scripts/sql/day126_daily_farm_brief_proposal_explicit_save_fixture.sql" as const;

export type HermesDay126FixtureDenialReason =
  | "configuration_missing"
  | "database_target_invalid"
  | "connection_unavailable"
  | "database_identity_invalid"
  | "isolation_not_verified"
  | "ai_schema_owner_missing"
  | "schema_ddl_authority_missing"
  | "runtime_role_missing"
  | "runtime_role_unsafe"
  | "ai_schema_missing"
  | "daily_brief_relation_missing"
  | "explicit_apply_enable_required"
  | "postcondition_failed";

export type HermesDay126FixturePreflightResult = {
  state: "ready" | "denied";
  denial_reason: HermesDay126FixtureDenialReason | null;
  database_target: "isolated_test" | "none" | "rejected";
  transaction_call_count: 0 | 1;
  database_write_performed: false;
  retry_count: 0;
};

export type HermesDay126FixtureApplyResult = {
  fixture_state: "applied" | "already_ready" | "denied" | "failed";
  denial_reason: HermesDay126FixtureDenialReason | null;
  isolated_database_schema_write_performed: boolean;
  production_database_connection_performed: false;
  production_database_write_performed: false;
  migration_applied_to_production: false;
  retry_count: 0;
  secret_exposed: false;
};

type Evidence = {
  database_matches: boolean;
  local_socket: boolean;
  ai_schema_owner_present: boolean;
  connection_is_ai_schema_owner: boolean;
  connection_has_ai_schema_create: boolean;
  runtime_role_present: boolean;
  runtime_role_non_superuser: boolean;
  runtime_role_non_bypassrls: boolean;
  ai_schema_present: boolean;
  records_present: boolean;
  commands_present: boolean;
  fixture_ready: boolean;
};

type JsonRecord = Record<string, unknown>;
function isRecord(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: JsonRecord, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function lastJson(output: string): unknown | null { const line = output.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean).at(-1); if (!line) return null; try { return JSON.parse(line); } catch { return null; } }

const EVIDENCE_KEYS = ["database_matches", "local_socket", "ai_schema_owner_present", "connection_is_ai_schema_owner", "connection_has_ai_schema_create", "runtime_role_present", "runtime_role_non_superuser", "runtime_role_non_bypassrls", "ai_schema_present", "records_present", "commands_present", "fixture_ready"] as const;

function parseEvidence(value: unknown): Evidence | null {
  return isRecord(value) && exact(value, EVIDENCE_KEYS) && Object.values(value).every((item) => typeof item === "boolean") ? value as Evidence : null;
}

function preflightSql(): string {
  return `begin transaction read only;
set local statement_timeout = '5s';
set local lock_timeout = '2s';
select
  current_database()='${HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE}' as database_matches,
  inet_server_addr() is null as local_socket,
  exists(select 1 from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='ai') as ai_schema_owner_present,
  coalesce((select r.oid=n.nspowner from pg_catalog.pg_roles r cross join pg_catalog.pg_namespace n where r.rolname=current_user and n.nspname='ai'),false) as connection_is_ai_schema_owner,
  coalesce((select has_schema_privilege(current_user,n.oid,'CREATE') from pg_catalog.pg_namespace n where n.nspname='ai'),false) as connection_has_ai_schema_create,
  exists(select 1 from pg_catalog.pg_roles where rolname='farmos_ai_proposal_local') as runtime_role_present,
  coalesce((select not rolsuper from pg_catalog.pg_roles where rolname='farmos_ai_proposal_local'),false) as runtime_role_non_superuser,
  coalesce((select not rolbypassrls from pg_catalog.pg_roles where rolname='farmos_ai_proposal_local'),false) as runtime_role_non_bypassrls,
  to_regnamespace('ai') is not null as ai_schema_present,
  to_regclass('ai.daily_farm_brief_records') is not null as records_present,
  to_regclass('ai.daily_farm_brief_persistence_commands') is not null as commands_present,
  to_regclass('ai.proposal_inbox') is not null as fixture_relation_present
\\gset day126_
\\if :day126_fixture_relation_present
select jsonb_build_object(
  'database_matches',:'day126_database_matches'::boolean,
  'local_socket',:'day126_local_socket'::boolean,
  'ai_schema_owner_present',:'day126_ai_schema_owner_present'::boolean,
  'connection_is_ai_schema_owner',:'day126_connection_is_ai_schema_owner'::boolean,
  'connection_has_ai_schema_create',:'day126_connection_has_ai_schema_create'::boolean,
  'runtime_role_present',:'day126_runtime_role_present'::boolean,
  'runtime_role_non_superuser',:'day126_runtime_role_non_superuser'::boolean,
  'runtime_role_non_bypassrls',:'day126_runtime_role_non_bypassrls'::boolean,
  'ai_schema_present',:'day126_ai_schema_present'::boolean,
  'records_present',:'day126_records_present'::boolean,
  'commands_present',:'day126_commands_present'::boolean,
  'fixture_ready',
    (select count(*)>=19 and count(*) filter (where column_name=any(array['id','proposal_type','title','body','payload_json','source_refs_json','model_name','agent_name','confidence','reason','risk_level','status','reviewed_by','reviewed_at','review_note','applied_at','applied_by','created_at','updated_at']))=19 from information_schema.columns where table_schema='ai' and table_name='proposal_inbox')
    and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('ai.proposal_inbox') and contype='p')
    and (select count(*)=3 from pg_catalog.pg_constraint where conrelid=to_regclass('ai.proposal_inbox') and contype='c' and conname in ('proposal_inbox_status_check','proposal_inbox_risk_level_check','proposal_inbox_confidence_check'))
    and coalesce((select c.relowner=n.nspowner from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='ai' and c.relname='proposal_inbox'),false)
    and exists(select 1 from ai.proposal_inbox where id='14711111-88db-41fd-a048-1c37266fd9e0' and source_refs_json->>'day81_persistence_boundary_test_id'='day81_core_internal_test_only_v1' and status='pending' and applied_at is null and applied_by is null)
    and has_schema_privilege('farmos_ai_proposal_local','ai','USAGE')
    and has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','SELECT')
    and has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','INSERT')
    and not has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','UPDATE')
    and not has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','DELETE')
    and not has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','TRUNCATE')
    and not has_schema_privilege('farmos_ai_proposal_local','ai','CREATE')
    and not has_schema_privilege('public','ai','USAGE')
    and not has_schema_privilege('public','ai','CREATE')
    and not has_table_privilege('public','ai.proposal_inbox','SELECT')
    and not has_table_privilege('public','ai.proposal_inbox','INSERT')
    and not has_table_privilege('public','ai.proposal_inbox','UPDATE')
    and not has_table_privilege('public','ai.proposal_inbox','DELETE')
    and not has_table_privilege('public','ai.proposal_inbox','TRUNCATE')
)::text;
\\else
select jsonb_build_object(
  'database_matches',:'day126_database_matches'::boolean,'local_socket',:'day126_local_socket'::boolean,
  'ai_schema_owner_present',:'day126_ai_schema_owner_present'::boolean,
  'connection_is_ai_schema_owner',:'day126_connection_is_ai_schema_owner'::boolean,
  'connection_has_ai_schema_create',:'day126_connection_has_ai_schema_create'::boolean,
  'runtime_role_present',:'day126_runtime_role_present'::boolean,
  'runtime_role_non_superuser',:'day126_runtime_role_non_superuser'::boolean,
  'runtime_role_non_bypassrls',:'day126_runtime_role_non_bypassrls'::boolean,
  'ai_schema_present',:'day126_ai_schema_present'::boolean,
  'records_present',:'day126_records_present'::boolean,'commands_present',:'day126_commands_present'::boolean,'fixture_ready',false
)::text;
\\endif
rollback;`;
}

function classify(evidence: Evidence): HermesDay126FixtureDenialReason | null {
  if (!evidence.database_matches) return "database_identity_invalid";
  if (!evidence.local_socket) return "isolation_not_verified";
  if (!evidence.runtime_role_present) return "runtime_role_missing";
  if (!evidence.runtime_role_non_superuser || !evidence.runtime_role_non_bypassrls) return "runtime_role_unsafe";
  if (!evidence.ai_schema_present) return "ai_schema_missing";
  if (!evidence.ai_schema_owner_present) return "ai_schema_owner_missing";
  if (!evidence.connection_is_ai_schema_owner && !evidence.connection_has_ai_schema_create) return "schema_ddl_authority_missing";
  if (!evidence.records_present || !evidence.commands_present) return "daily_brief_relation_missing";
  return null;
}

function parseApplyReceipt(value: unknown): boolean {
  return isRecord(value) && exact(value, ["fixture_state", "postcondition_verified"]) && value.fixture_state === "applied" && value.postcondition_verified === true;
}

export async function diagnoseHermesDay126FixtureReadiness(input: {
  databaseTarget: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay126FixturePreflightResult & { fixture_ready: boolean }> {
  if (typeof input.databaseTarget !== "string" || input.databaseTarget.length === 0) return { state: "denied", denial_reason: "configuration_missing", database_target: "none", transaction_call_count: 0, database_write_performed: false, retry_count: 0, fixture_ready: false };
  if (!classifyHermesDailyFarmBriefDay114DatabaseTarget(input.databaseTarget).allowed) return { state: "denied", denial_reason: "database_target_invalid", database_target: "rejected", transaction_call_count: 0, database_write_performed: false, retry_count: 0, fixture_ready: false };
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(input.databaseTarget);
  if (executor === null) return { state: "denied", denial_reason: "connection_unavailable", database_target: "isolated_test", transaction_call_count: 0, database_write_performed: false, retry_count: 0, fixture_ready: false };
  const result = await executor.executeSingleConnection(preflightSql());
  if (!result.ok) return { state: "denied", denial_reason: "connection_unavailable", database_target: "isolated_test", transaction_call_count: 1, database_write_performed: false, retry_count: 0, fixture_ready: false };
  const evidence = parseEvidence(lastJson(result.output));
  if (evidence === null) return { state: "denied", denial_reason: "database_identity_invalid", database_target: "isolated_test", transaction_call_count: 1, database_write_performed: false, retry_count: 0, fixture_ready: false };
  const reason = classify(evidence);
  return reason === null
    ? { state: "ready", denial_reason: null, database_target: "isolated_test", transaction_call_count: 1, database_write_performed: false, retry_count: 0, fixture_ready: evidence.fixture_ready }
    : { state: "denied", denial_reason: reason, database_target: "isolated_test", transaction_call_count: 1, database_write_performed: false, retry_count: 0, fixture_ready: false };
}

export async function applyHermesDay126Fixture(input: {
  databaseTarget: unknown;
  applyEnabled: unknown;
  executorFactory?: (databaseTarget: string) => HermesDailyFarmBriefIsolatedPostgresExecutor | null;
}): Promise<HermesDay126FixtureApplyResult> {
  const preflight = await diagnoseHermesDay126FixtureReadiness({ databaseTarget: input.databaseTarget, executorFactory: input.executorFactory });
  if (preflight.state !== "ready") return { fixture_state: "denied", denial_reason: preflight.denial_reason, isolated_database_schema_write_performed: false, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false };
  if (preflight.fixture_ready) return { fixture_state: "already_ready", denial_reason: null, isolated_database_schema_write_performed: false, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false };
  if (input.applyEnabled !== true) return { fixture_state: "denied", denial_reason: "explicit_apply_enable_required", isolated_database_schema_write_performed: false, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false };
  const executor = (input.executorFactory ?? createHermesDailyFarmBriefDockerPostgresExecutor)(HERMES_DAILY_FARM_BRIEF_DAY114_DATABASE);
  if (executor === null) return { fixture_state: "failed", denial_reason: "connection_unavailable", isolated_database_schema_write_performed: false, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false };
  let sql: string;
  try { sql = await readFile(HERMES_DAY126_FIXTURE_SQL_PATH, "utf8"); } catch { return { fixture_state: "failed", denial_reason: "postcondition_failed", isolated_database_schema_write_performed: false, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false }; }
  const applied = await executor.executeSingleConnection(sql);
  return applied.ok && parseApplyReceipt(lastJson(applied.output))
    ? { fixture_state: "applied", denial_reason: null, isolated_database_schema_write_performed: true, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false }
    : { fixture_state: "failed", denial_reason: "postcondition_failed", isolated_database_schema_write_performed: false, production_database_connection_performed: false, production_database_write_performed: false, migration_applied_to_production: false, retry_count: 0, secret_exposed: false };
}
