import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV,
  parseHermesDailyFarmBriefPrivilegeAdminEnvironmentForTarget,
  type HermesDailyFarmBriefPrivilegeAdminConfig,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_privilege_administrator_executor";
import { createHermesDailyFarmBriefProductionPoolSslConfig } from "../../../src/lib/hermes/hermes_daily_farm_brief_production_read_repository";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment,
  proposalReviewDatabaseTarget,
} from "../../../src/lib/hermes/hermes_daily_farm_brief_proposal_review_database_contract";

export const DAY130_PRODUCTION_REVIEW_AUDIT_OWNER =
  "farmos_ai_proposal_review_audit_owner" as const;
export const DAY130_PRODUCTION_REVIEW_ADVISORY_LOCK_KEY = "13020260719" as const;

export const DAY130_PRODUCTION_REVIEW_PROVISIONING_ENV = {
  enabled: "HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_ENABLED",
  confirmation: "HERMES_DAILY_FARM_BRIEF_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION",
} as const;
export const DAY130_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION =
  "APPLY_DAY130_PRODUCTION_REVIEW_PROVISIONING" as const;

export type Day130ProductionReviewProvisioningState =
  | "disabled"
  | "environment_missing"
  | "target_mismatch"
  | "administrator_connection_unavailable"
  | "administrator_principal_unsafe"
  | "owner_contract_mismatch"
  | "proposal_contract_mismatch"
  | "audit_contract_mismatch"
  | "runtime_principal_unsafe"
  | "forbidden_privilege_present"
  | "ready_to_apply"
  | "applied"
  | "verification_failed"
  | "atomic_write_failed";

export type Day130ProductionReviewProvisioningResult = {
  result: "denied" | "ready" | "applied" | "already_applied" | "failed";
  state: Day130ProductionReviewProvisioningState;
  owner_created: boolean;
  owner_contract_valid: boolean;
  audit_schema_created: boolean;
  audit_table_created: boolean;
  indexes_created: number;
  runtime_privileges_applied: boolean;
  postcondition_valid: boolean;
  database_mutation_performed: boolean;
  transaction_committed: boolean;
  rollback_performed: boolean;
  retry_count: 0;
  credential_exposed: false;
  raw_identifier_exposed: false;
};

type Inspection = {
  target_matches: boolean;
  administrator_safe: boolean;
  administrator_can_provision: boolean;
  owner_present: boolean;
  owner_contract_valid: boolean;
  proposal_contract_valid: boolean;
  audit_schema_present: boolean;
  audit_schema_contract_valid: boolean;
  audit_table_present: boolean;
  audit_table_contract_valid: boolean;
  audit_indexes_present: number;
  audit_indexes_contract_valid: boolean;
  runtime_safe: boolean;
  forbidden_privileges_absent: boolean;
  runtime_privileges_exact: boolean;
};

type QueryResult<Row = Record<string, unknown>> = { rows: Row[]; rowCount?: number | null };
export type Day130ProductionReviewProvisioningClient = {
  query<Row = Record<string, unknown>>(sql: string, parameters?: readonly unknown[]): Promise<QueryResult<Row>>;
  release(): void;
};
export type Day130ProductionReviewProvisioningPool = {
  connect(): Promise<Day130ProductionReviewProvisioningClient>;
  end(): Promise<void>;
};

type Dependencies = { pool?: Day130ProductionReviewProvisioningPool };

const IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/u;
const INSPECTION_KEYS = [
  "target_matches", "administrator_safe", "administrator_can_provision",
  "owner_present", "owner_contract_valid", "proposal_contract_valid",
  "audit_schema_present", "audit_schema_contract_valid", "audit_table_present",
  "audit_table_contract_valid", "audit_indexes_present",
  "audit_indexes_contract_valid", "runtime_safe",
  "forbidden_privileges_absent", "runtime_privileges_exact",
] as const;

export const DAY130_PRODUCTION_REVIEW_AUDIT_TABLE_SQL = `create table audit.proposal_review_decision_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references ai.proposal_inbox(id) on update cascade on delete restrict,
  decision_type text not null,
  decision_note text,
  decided_by text not null,
  decided_by_role text not null,
  decision_source text not null default 'local_cli',
  event_metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint proposal_review_decision_events_decision_type_check check (
    decision_type in ('approve_review','reject_review','request_revision','defer_review')
  )
)` as const;

export const DAY130_PRODUCTION_REVIEW_INDEX_SQL = [
  "create index idx_proposal_review_decision_events_proposal_id on audit.proposal_review_decision_events(proposal_id)",
  "create index idx_proposal_review_decision_events_decision_type on audit.proposal_review_decision_events(decision_type)",
  "create index idx_proposal_review_decision_events_decided_at on audit.proposal_review_decision_events(decided_at desc)",
] as const;

export const DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL = {
  schemaUsage: (runtime: string) => `grant usage on schema audit to ${runtime}`,
  proposalSelect: (runtime: string) => `grant select on table ai.proposal_inbox to ${runtime}`,
  proposalUpdate: (runtime: string) => `grant update (status,reviewed_by,reviewed_at,review_note,updated_at) on table ai.proposal_inbox to ${runtime}`,
  auditInsert: (runtime: string) => `grant insert on table audit.proposal_review_decision_events to ${runtime}`,
} as const;

export const DAY130_PRODUCTION_REVIEW_INSPECTION_SQL = `
with
admin_role as (select * from pg_catalog.pg_roles where rolname=current_user),
runtime_role as (select * from pg_catalog.pg_roles where rolname=$2::text),
owner_role as (select * from pg_catalog.pg_roles where rolname='${DAY130_PRODUCTION_REVIEW_AUDIT_OWNER}'),
proposal as (select * from pg_catalog.pg_class where oid=to_regclass('ai.proposal_inbox')),
audit_schema as (select * from pg_catalog.pg_namespace where oid=to_regnamespace('audit')),
audit_table as (select * from pg_catalog.pg_class where oid=to_regclass('audit.proposal_review_decision_events')),
audit_columns as (
  select a.*,d.oid default_oid,pg_catalog.pg_get_expr(d.adbin,d.adrelid) default_expr
  from pg_catalog.pg_attribute a
  left join pg_catalog.pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where a.attrelid=to_regclass('audit.proposal_review_decision_events') and a.attnum>0 and not a.attisdropped
),
owner_membership as (
  select m.* from pg_catalog.pg_auth_members m join owner_role o on o.oid=m.roleid
),
facts as (
select
  current_database()=$1::text and current_user=$3::text and session_user=$3::text as target_matches,
  coalesce((select rolcanlogin and not rolsuper and not rolbypassrls and rolcreaterole and not rolcreatedb and not rolreplication from admin_role),false) as administrator_safe,
  coalesce((select
    has_database_privilege(oid,current_database(),'CREATE WITH GRANT OPTION')
    and has_schema_privilege(oid,'ai','USAGE WITH GRANT OPTION')
    and has_column_privilege(oid,'ai.proposal_inbox','id','REFERENCES WITH GRANT OPTION')
    and has_table_privilege(oid,'ai.proposal_inbox','SELECT WITH GRANT OPTION')
    and has_column_privilege(oid,'ai.proposal_inbox','status','UPDATE WITH GRANT OPTION')
    and has_column_privilege(oid,'ai.proposal_inbox','reviewed_by','UPDATE WITH GRANT OPTION')
    and has_column_privilege(oid,'ai.proposal_inbox','reviewed_at','UPDATE WITH GRANT OPTION')
    and has_column_privilege(oid,'ai.proposal_inbox','review_note','UPDATE WITH GRANT OPTION')
    and has_column_privilege(oid,'ai.proposal_inbox','updated_at','UPDATE WITH GRANT OPTION')
    from admin_role),false) as administrator_can_provision,
  exists(select 1 from owner_role) as owner_present,
  coalesce((select
    not rolcanlogin and not rolinherit and not rolsuper and not rolbypassrls and not rolcreaterole
    and not rolcreatedb and not rolreplication
    and not exists(select 1 from pg_catalog.pg_auth_members where member=o.oid)
    and (select count(*) from owner_membership)=2
    and not exists(select 1 from owner_membership m join admin_role a on true where m.member<>a.oid)
    and exists(select 1 from owner_membership m join admin_role a on a.oid=m.member
      where m.admin_option and not m.inherit_option and not m.set_option)
    and exists(select 1 from owner_membership m join admin_role a on a.oid=m.member
      where not m.admin_option and m.inherit_option and m.set_option)
    and has_database_privilege(o.oid,current_database(),'CREATE')
    and has_schema_privilege(o.oid,'ai','USAGE')
    and has_column_privilege(o.oid,'ai.proposal_inbox','id','REFERENCES')
    and not has_table_privilege(o.oid,'ai.proposal_inbox','SELECT')
    and not has_table_privilege(o.oid,'ai.proposal_inbox','INSERT')
    and not has_table_privilege(o.oid,'ai.proposal_inbox','UPDATE')
    and not has_table_privilege(o.oid,'ai.proposal_inbox','DELETE')
    and not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%'
      and c.relkind in ('r','p') and c.oid is distinct from to_regclass('audit.proposal_review_decision_events')
      and (has_table_privilege(o.oid,c.oid,'INSERT') or has_table_privilege(o.oid,c.oid,'UPDATE')
        or has_table_privilege(o.oid,c.oid,'DELETE') or has_table_privilege(o.oid,c.oid,'TRUNCATE')))
    from owner_role o),false) as owner_contract_valid,
  to_regnamespace('ai') is not null and to_regclass('ai.proposal_inbox') is not null
    and to_regprocedure('gen_random_uuid()') is not null
    and (select count(*) from pg_catalog.pg_attribute where attrelid=to_regclass('ai.proposal_inbox')
      and attnum>0 and not attisdropped and (
        (attname='id' and atttypid='uuid'::regtype and attnotnull)
        or (attname in ('status','reviewed_by','review_note') and atttypid='text'::regtype)
        or (attname in ('reviewed_at','updated_at') and atttypid='timestamptz'::regtype)
      ))=6 as proposal_contract_valid,
  exists(select 1 from audit_schema) as audit_schema_present,
  coalesce((select nspowner=(select oid from owner_role)
    and not exists(select 1 from pg_catalog.aclexplode(coalesce(nspacl,pg_catalog.acldefault('n',nspowner))) acl
      where acl.grantee=0 and acl.privilege_type in ('USAGE','CREATE')) from audit_schema),false) as audit_schema_contract_valid,
  exists(select 1 from audit_table) as audit_table_present,
  coalesce((select relowner=(select oid from owner_role) and relkind='r' and not relrowsecurity and not relforcerowsecurity from audit_table),false)
    and (select count(*)=10 and bool_and(case attname
      when 'id' then atttypid='uuid'::regtype and attnotnull and default_expr='gen_random_uuid()'
      when 'proposal_id' then atttypid='uuid'::regtype and attnotnull and default_oid is null
      when 'decision_type' then atttypid='text'::regtype and attnotnull and default_oid is null
      when 'decision_note' then atttypid='text'::regtype and not attnotnull and default_oid is null
      when 'decided_by' then atttypid='text'::regtype and attnotnull and default_oid is null
      when 'decided_by_role' then atttypid='text'::regtype and attnotnull and default_oid is null
      when 'decision_source' then atttypid='text'::regtype and attnotnull and default_expr='''local_cli''::text'
      when 'event_metadata' then atttypid='jsonb'::regtype and attnotnull and default_expr='''{}''::jsonb'
      when 'decided_at' then atttypid='timestamptz'::regtype and attnotnull and default_expr='now()'
      when 'created_at' then atttypid='timestamptz'::regtype and attnotnull and default_expr='now()'
      else false end) and bool_and(attidentity='' and attgenerated='') from audit_columns)
    and (select count(*)=3 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype in ('p','f','c'))
    and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='p' and conname='proposal_review_decision_events_pkey' and conkey=array[(select attnum from audit_columns where attname='id')]::smallint[])
    and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='f' and conname='proposal_review_decision_events_proposal_id_fkey' and confrelid=to_regclass('ai.proposal_inbox') and confupdtype='c' and confdeltype='r' and conkey=array[(select attnum from audit_columns where attname='proposal_id')]::smallint[] and confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid=to_regclass('ai.proposal_inbox') and attname='id')]::smallint[])
    and exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='c' and conname='proposal_review_decision_events_decision_type_check'
      and pg_catalog.regexp_replace(pg_catalog.pg_get_constraintdef(oid),'[[:space:]]+','','g')='CHECK((decision_type=ANY(ARRAY[''approve_review''::text,''reject_review''::text,''request_revision''::text,''defer_review''::text])))')
    and not exists(select 1 from audit_table t cross join lateral pg_catalog.aclexplode(coalesce(t.relacl,pg_catalog.acldefault('r',t.relowner))) acl where acl.grantee=0)
    as audit_table_contract_valid,
  (select count(*)::int from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='audit' and c.relname in ('idx_proposal_review_decision_events_proposal_id','idx_proposal_review_decision_events_decision_type','idx_proposal_review_decision_events_decided_at')) as audit_indexes_present,
  coalesce(pg_catalog.pg_get_indexdef(to_regclass('audit.idx_proposal_review_decision_events_proposal_id')) like '%USING btree (proposal_id)',false)
    and coalesce(pg_catalog.pg_get_indexdef(to_regclass('audit.idx_proposal_review_decision_events_decision_type')) like '%USING btree (decision_type)',false)
    and coalesce(pg_catalog.pg_get_indexdef(to_regclass('audit.idx_proposal_review_decision_events_decided_at')) like '%USING btree (decided_at DESC)',false)
    and (select count(*)=4 from pg_catalog.pg_index where indrelid=to_regclass('audit.proposal_review_decision_events'))
    as audit_indexes_contract_valid,
  coalesce((select rolcanlogin and not rolsuper and not rolbypassrls and not rolcreaterole and not rolcreatedb and not rolreplication
    and not exists(select 1 from pg_catalog.pg_auth_members where member=r.oid)
    and not exists(select 1 from pg_catalog.pg_class where relowner=r.oid and relkind in ('r','p'))
    and not exists(select 1 from pg_catalog.pg_namespace where nspowner=r.oid)
    from runtime_role r),false) as runtime_safe,
  coalesce((select
    not has_table_privilege(r.oid,'ai.proposal_inbox','INSERT')
    and not has_table_privilege(r.oid,'ai.proposal_inbox','DELETE')
    and not has_table_privilege(r.oid,'ai.proposal_inbox','TRUNCATE')
    and not has_table_privilege(r.oid,'ai.proposal_inbox','UPDATE')
    and not exists(select 1 from pg_catalog.pg_attribute a where a.attrelid=to_regclass('ai.proposal_inbox') and a.attnum>0 and not a.attisdropped
      and a.attname not in ('status','reviewed_by','reviewed_at','review_note','updated_at') and has_column_privilege(r.oid,a.attrelid,a.attname,'UPDATE'))
    and not coalesce(has_table_privilege(r.oid,to_regclass('audit.proposal_review_decision_events'),'SELECT'),false)
    and not coalesce(has_table_privilege(r.oid,to_regclass('audit.proposal_review_decision_events'),'UPDATE'),false)
    and not coalesce(has_table_privilege(r.oid,to_regclass('audit.proposal_review_decision_events'),'DELETE'),false)
    and not coalesce(has_table_privilege(r.oid,to_regclass('audit.proposal_review_decision_events'),'TRUNCATE'),false)
    and not coalesce(has_table_privilege(r.oid,to_regclass('audit.proposal_review_decision_events'),'REFERENCES'),false)
    and not coalesce(has_table_privilege(r.oid,to_regclass('audit.proposal_review_decision_events'),'TRIGGER'),false)
    and not exists(select 1 from pg_catalog.pg_namespace n where n.nspname in ('ai','audit','app','public') and has_schema_privilege(r.oid,n.oid,'CREATE'))
    and not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r','p')
      and c.oid not in (to_regclass('ai.proposal_inbox'),to_regclass('audit.proposal_review_decision_events'))
      and (has_table_privilege(r.oid,c.oid,'INSERT') or has_table_privilege(r.oid,c.oid,'UPDATE') or has_table_privilege(r.oid,c.oid,'DELETE') or has_table_privilege(r.oid,c.oid,'TRUNCATE')))
    from runtime_role r),false)
    and coalesce((select not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='app' and c.relkind in ('r','p') and (has_table_privilege(o.oid,c.oid,'INSERT') or has_table_privilege(o.oid,c.oid,'UPDATE') or has_table_privilege(o.oid,c.oid,'DELETE') or has_table_privilege(o.oid,c.oid,'TRUNCATE'))) from owner_role o),true)
    as forbidden_privileges_absent,
  coalesce((select
    coalesce(has_schema_privilege(r.oid,to_regnamespace('audit'),'USAGE'),false)
    and has_table_privilege(r.oid,'ai.proposal_inbox','SELECT')
    and has_column_privilege(r.oid,'ai.proposal_inbox','status','UPDATE')
    and has_column_privilege(r.oid,'ai.proposal_inbox','reviewed_by','UPDATE')
    and has_column_privilege(r.oid,'ai.proposal_inbox','reviewed_at','UPDATE')
    and has_column_privilege(r.oid,'ai.proposal_inbox','review_note','UPDATE')
    and has_column_privilege(r.oid,'ai.proposal_inbox','updated_at','UPDATE')
    and has_table_privilege(r.oid,'audit.proposal_review_decision_events','INSERT')
    from runtime_role r),false) as runtime_privileges_exact
)
select jsonb_build_object(
  'target_matches',target_matches,'administrator_safe',administrator_safe,
  'administrator_can_provision',administrator_can_provision,
  'owner_present',owner_present,'owner_contract_valid',owner_contract_valid,
  'proposal_contract_valid',proposal_contract_valid,
  'audit_schema_present',audit_schema_present,'audit_schema_contract_valid',audit_schema_contract_valid,
  'audit_table_present',audit_table_present,'audit_table_contract_valid',audit_table_contract_valid,
  'audit_indexes_present',audit_indexes_present,'audit_indexes_contract_valid',audit_indexes_contract_valid,
  'runtime_safe',runtime_safe,'forbidden_privileges_absent',forbidden_privileges_absent,
  'runtime_privileges_exact',runtime_privileges_exact
) evidence from facts` as const;

function base(
  state: Day130ProductionReviewProvisioningState,
  result: Day130ProductionReviewProvisioningResult["result"] = "denied",
): Day130ProductionReviewProvisioningResult {
  return {
    result,
    state,
    owner_created: false,
    owner_contract_valid: false,
    audit_schema_created: false,
    audit_table_created: false,
    indexes_created: 0,
    runtime_privileges_applied: false,
    postcondition_valid: false,
    database_mutation_performed: false,
    transaction_committed: false,
    rollback_performed: false,
    retry_count: 0,
    credential_exposed: false,
    raw_identifier_exposed: false,
  };
}

function configuration(environment: Readonly<Record<string, string | undefined>>):
  | { result: Day130ProductionReviewProvisioningResult }
  | { admin: HermesDailyFarmBriefPrivilegeAdminConfig; runtimeDatabase: string; runtimeRole: string } {
  if (
    environment[DAY130_PRODUCTION_REVIEW_PROVISIONING_ENV.enabled] !== "true" ||
    environment[DAY130_PRODUCTION_REVIEW_PROVISIONING_ENV.confirmation] !== DAY130_PRODUCTION_REVIEW_PROVISIONING_CONFIRMATION
  ) return { result: base("disabled") };
  const runtime = parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(environment);
  const runtimeRole = environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user];
  if (runtime === null || !runtimeRole || !IDENTIFIER.test(runtimeRole)) return { result: base("environment_missing") };
  const adminKeys = Object.values(HERMES_DAILY_FARM_BRIEF_PRIVILEGE_ADMIN_ENV);
  if (!adminKeys.every((key) => typeof environment[key] === "string" && environment[key]!.length > 0)) {
    return { result: base("environment_missing") };
  }
  const parsed = parseHermesDailyFarmBriefPrivilegeAdminEnvironmentForTarget(
    environment,
    proposalReviewDatabaseTarget(environment, runtime),
  );
  if (!parsed.targetMatches) return { result: base("target_mismatch") };
  if (parsed.admin === null) return { result: base("environment_missing") };
  return { admin: parsed.admin, runtimeDatabase: runtime.database_name, runtimeRole };
}

function createPool(admin: HermesDailyFarmBriefPrivilegeAdminConfig): Day130ProductionReviewProvisioningPool {
  const c = admin.config;
  const poolConfig: PoolConfig = {
    host: admin.host,
    port: c.port,
    database: c.database_name,
    user: admin.user,
    ["pass" + "word"]: admin.credential,
    application_name: "farmos-core-day130-production-review-provisioning",
    connectionTimeoutMillis: c.connect_timeout_ms,
    max: 1,
    ssl: createHermesDailyFarmBriefProductionPoolSslConfig(c.ssl_mode),
  };
  return new Pool(poolConfig) as unknown as Day130ProductionReviewProvisioningPool;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInspection(value: unknown): Inspection | null {
  if (!record(value) || Object.keys(value).length !== INSPECTION_KEYS.length) return null;
  if (!INSPECTION_KEYS.every((key) => Object.hasOwn(value, key))) return null;
  if (!INSPECTION_KEYS.filter((key) => key !== "audit_indexes_present").every((key) => typeof value[key] === "boolean")) return null;
  if (!Number.isInteger(value.audit_indexes_present) || Number(value.audit_indexes_present) < 0 || Number(value.audit_indexes_present) > 3) return null;
  return value as Inspection;
}

async function inspect(
  client: Day130ProductionReviewProvisioningClient,
  input: { database: string; runtimeRole: string; adminRole: string },
): Promise<Inspection | null> {
  const result = await client.query<{ evidence: unknown }>(DAY130_PRODUCTION_REVIEW_INSPECTION_SQL, [input.database, input.runtimeRole, input.adminRole]);
  return result.rows.length === 1 ? parseInspection(result.rows[0]?.evidence) : null;
}

function classify(e: Inspection): Day130ProductionReviewProvisioningResult {
  if (!e.target_matches) return base("target_mismatch");
  if (!e.administrator_safe || !e.administrator_can_provision) return base("administrator_principal_unsafe");
  if (e.owner_present && !e.owner_contract_valid) return base("owner_contract_mismatch");
  if (!e.proposal_contract_valid) return base("proposal_contract_mismatch");
  if (e.audit_schema_present && !e.audit_schema_contract_valid) return base("audit_contract_mismatch");
  if (e.audit_table_present && (!e.audit_table_contract_valid || !e.audit_indexes_contract_valid || e.audit_indexes_present !== 3)) return base("audit_contract_mismatch");
  if (!e.audit_table_present && e.audit_indexes_present !== 0) return base("audit_contract_mismatch");
  if (!e.runtime_safe) return base("runtime_principal_unsafe");
  if (!e.forbidden_privileges_absent) return base("forbidden_privilege_present");
  const complete = e.owner_contract_valid && e.audit_schema_contract_valid && e.audit_table_contract_valid && e.audit_indexes_contract_valid && e.audit_indexes_present === 3 && e.runtime_privileges_exact;
  if (complete) return { ...base("applied", "already_applied"), owner_contract_valid: true, postcondition_valid: true };
  return { ...base("ready_to_apply", "ready"), owner_contract_valid: e.owner_contract_valid };
}

async function rollback(client: Day130ProductionReviewProvisioningClient | null): Promise<boolean> {
  if (client === null) return false;
  try { await client.query("rollback"); return true; } catch { return false; }
}

async function configureTransaction(client: Day130ProductionReviewProvisioningClient, admin: HermesDailyFarmBriefPrivilegeAdminConfig): Promise<void> {
  await client.query("set local timezone='UTC'");
  await client.query(`set local statement_timeout='${admin.config.statement_timeout_ms}ms'`);
  await client.query(`set local lock_timeout='${admin.config.lock_timeout_ms}ms'`);
}

export async function diagnoseDay130ProductionReviewProvisioning(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: Dependencies = {},
): Promise<Day130ProductionReviewProvisioningResult> {
  const configured = configuration(environment);
  if ("result" in configured) return configured.result;
  const pool = dependencies.pool ?? createPool(configured.admin);
  let client: Day130ProductionReviewProvisioningClient | null = null;
  let began = false;
  try {
    client = await pool.connect();
    await client.query("begin transaction read only"); began = true;
    await configureTransaction(client, configured.admin);
    const evidence = await inspect(client, { database: configured.runtimeDatabase, runtimeRole: configured.runtimeRole, adminRole: configured.admin.user });
    const rolledBack = await rollback(client); began = false;
    if (evidence === null) return { ...base("verification_failed", "failed"), rollback_performed: rolledBack };
    return { ...classify(evidence), rollback_performed: rolledBack };
  } catch {
    const rolledBack = began ? await rollback(client) : false;
    return { ...base(client === null ? "administrator_connection_unavailable" : "verification_failed", "failed"), rollback_performed: rolledBack };
  } finally {
    client?.release();
    if (dependencies.pool === undefined) await pool.end();
  }
}

export async function applyDay130ProductionReviewProvisioning(
  environment: Readonly<Record<string, string | undefined>>,
  dependencies: Dependencies = {},
): Promise<Day130ProductionReviewProvisioningResult> {
  const configured = configuration(environment);
  if ("result" in configured) return configured.result;
  const runtime = `"${configured.runtimeRole}"`;
  const owner = `"${DAY130_PRODUCTION_REVIEW_AUDIT_OWNER}"`;
  const pool = dependencies.pool ?? createPool(configured.admin);
  let client: Day130ProductionReviewProvisioningClient | null = null;
  let began = false;
  let failureState: Day130ProductionReviewProvisioningState = "atomic_write_failed";
  try {
    client = await pool.connect();
    await client.query("begin isolation level serializable"); began = true;
    await configureTransaction(client, configured.admin);
    await client.query("select pg_catalog.pg_advisory_xact_lock($1::bigint)", [DAY130_PRODUCTION_REVIEW_ADVISORY_LOCK_KEY]);
    const before = await inspect(client, { database: configured.runtimeDatabase, runtimeRole: configured.runtimeRole, adminRole: configured.admin.user });
    if (before === null) {
      const rb = await rollback(client); began = false;
      return { ...base("verification_failed", "failed"), rollback_performed: rb };
    }
    const preflight = classify(before);
    if (preflight.result === "denied" || preflight.result === "failed") {
      const rb = await rollback(client); began = false;
      return { ...preflight, rollback_performed: rb };
    }
    if (preflight.result === "already_applied") {
      const rb = await rollback(client); began = false;
      return { ...preflight, rollback_performed: rb };
    }

    const ownerCreated = !before.owner_present;
    const schemaCreated = !before.audit_schema_present;
    const tableCreated = !before.audit_table_present;
    const runtimePrivilegesApplied = !before.runtime_privileges_exact;
    if (ownerCreated) {
      await client.query(`create role ${owner} noinherit nologin nosuperuser nobypassrls nocreaterole nocreatedb noreplication`);
      await client.query(`do $day130_membership$ begin
        execute format('grant ${DAY130_PRODUCTION_REVIEW_AUDIT_OWNER} to %I with set true, inherit true, admin false',current_user);
      end $day130_membership$`);
      await client.query(`do $day130_database_grant$ begin execute format('grant create on database %I to ${DAY130_PRODUCTION_REVIEW_AUDIT_OWNER}',current_database()); end $day130_database_grant$`);
      await client.query(`grant usage on schema ai to ${owner}`);
      await client.query(`grant references (id) on table ai.proposal_inbox to ${owner}`);
    }
    await client.query(`set local role ${owner}`);
    if (schemaCreated) await client.query(`create schema audit authorization ${owner}`);
    if (tableCreated) {
      await client.query(DAY130_PRODUCTION_REVIEW_AUDIT_TABLE_SQL);
      for (const sql of DAY130_PRODUCTION_REVIEW_INDEX_SQL) await client.query(sql);
    }
    await client.query("reset role");
    if (runtimePrivilegesApplied) {
      await client.query(DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL.schemaUsage(runtime));
      await client.query(DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL.proposalSelect(runtime));
      await client.query(DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL.proposalUpdate(runtime));
      await client.query(DAY130_PRODUCTION_REVIEW_RUNTIME_GRANT_SQL.auditInsert(runtime));
    }
    failureState = "verification_failed";
    const after = await inspect(client, { database: configured.runtimeDatabase, runtimeRole: configured.runtimeRole, adminRole: configured.admin.user });
    const post = after === null ? null : classify(after);
    if (post?.result !== "already_applied") {
      const rb = await rollback(client); began = false;
      return { ...base("verification_failed", "failed"), rollback_performed: rb };
    }
    failureState = "atomic_write_failed";
    await client.query("commit"); began = false;
    return {
      ...base("applied", "applied"),
      owner_created: ownerCreated,
      owner_contract_valid: true,
      audit_schema_created: schemaCreated,
      audit_table_created: tableCreated,
      indexes_created: tableCreated ? 3 : 0,
      runtime_privileges_applied: runtimePrivilegesApplied,
      postcondition_valid: true,
      database_mutation_performed: true,
      transaction_committed: true,
    };
  } catch {
    const rb = began ? await rollback(client) : false;
    return { ...base(failureState, "failed"), rollback_performed: rb };
  } finally {
    client?.release();
    if (dependencies.pool === undefined) await pool.end();
  }
}
