-- DAY128 ISOLATED FIXTURE
-- EXPLICIT HUMAN APPROVAL REQUIRED
-- DATABASE MUST EQUAL farmos_core_day114_test
-- LOCAL SOCKET ONLY
-- NO PRODUCTION TARGET

begin isolation level serializable read write;
set local timezone = 'UTC';
set local lock_timeout = '3s';
set local statement_timeout = '20s';

do $day128_guard$ begin
  perform set_config('day128.audit_schema_existed',(to_regnamespace('audit') is not null)::text,true);
  perform set_config('day128.audit_table_existed',(to_regclass('audit.proposal_review_decision_events') is not null)::text,true);
  perform set_config('day128.review_role_existed',exists(select 1 from pg_catalog.pg_roles where rolname='farmos_ai_proposal_review_local')::text,true);
  if current_database() <> 'farmos_core_day114_test' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if to_regclass('ai.proposal_inbox') is null then raise exception 'proposal_relation_missing'; end if;
  if not coalesce((select rolsuper or rolcreaterole from pg_catalog.pg_roles where rolname=current_user),false) then raise exception 'role_ddl_authority_missing'; end if;
end $day128_guard$;

create schema if not exists audit;

create table if not exists audit.proposal_review_decision_events (
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
  constraint proposal_review_decision_events_decision_type_check
    check (decision_type in ('approve_review','reject_review','request_revision','defer_review'))
);

create index if not exists idx_proposal_review_decision_events_proposal_id
  on audit.proposal_review_decision_events(proposal_id);
create index if not exists idx_proposal_review_decision_events_decision_type
  on audit.proposal_review_decision_events(decision_type);
create index if not exists idx_proposal_review_decision_events_decided_at
  on audit.proposal_review_decision_events(decided_at desc);

do $day128_role$ begin
  if not exists(select 1 from pg_catalog.pg_roles where rolname='farmos_ai_proposal_review_local') then
    create role farmos_ai_proposal_review_local nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  elsif not coalesce((
    select not rolcanlogin and not rolsuper and not rolcreatedb and not rolcreaterole and not rolinherit and not rolbypassrls
    from pg_catalog.pg_roles where rolname='farmos_ai_proposal_review_local'
  ),false) then
    raise exception 'runtime_role_unsafe';
  end if;

  if has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','INSERT')
    or has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','DELETE')
    or has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','TRUNCATE')
    or has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','UPDATE')
    or has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','applied_at','UPDATE')
    or has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','applied_by','UPDATE')
    or has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','payload_json','UPDATE')
    or has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','source_refs_json','UPDATE')
    or has_schema_privilege('farmos_ai_proposal_review_local','ai','CREATE')
    or has_schema_privilege('farmos_ai_proposal_review_local','audit','CREATE')
    or has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','UPDATE')
    or has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','DELETE')
    or has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','TRUNCATE')
    or exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind in ('r','p') and (has_table_privilege('farmos_ai_proposal_review_local',c.oid,'INSERT') or has_table_privilege('farmos_ai_proposal_review_local',c.oid,'UPDATE') or has_table_privilege('farmos_ai_proposal_review_local',c.oid,'DELETE') or has_table_privilege('farmos_ai_proposal_review_local',c.oid,'TRUNCATE')))
  then raise exception 'existing_runtime_role_overprivileged'; end if;
end $day128_role$;

revoke all on schema ai from farmos_ai_proposal_review_local;
revoke all on schema audit from farmos_ai_proposal_review_local;
revoke all on ai.proposal_inbox from farmos_ai_proposal_review_local;
revoke all on audit.proposal_review_decision_events from farmos_ai_proposal_review_local;
grant usage on schema ai to farmos_ai_proposal_review_local;
grant select on ai.proposal_inbox to farmos_ai_proposal_review_local;
grant update(status,reviewed_by,reviewed_at,review_note,updated_at)
  on ai.proposal_inbox to farmos_ai_proposal_review_local;
grant usage on schema audit to farmos_ai_proposal_review_local;
grant insert on audit.proposal_review_decision_events to farmos_ai_proposal_review_local;
revoke create on schema ai from farmos_ai_proposal_review_local;
revoke create on schema audit from farmos_ai_proposal_review_local;

do $day128_postcondition$ begin
  if not (select count(*)=10 and count(*) filter(where column_name||':'||data_type=any(array['id:uuid','proposal_id:uuid','decision_type:text','decision_note:text','decided_by:text','decided_by_role:text','decision_source:text','event_metadata:jsonb','decided_at:timestamp with time zone','created_at:timestamp with time zone']))=10 from information_schema.columns where table_schema='audit' and table_name='proposal_review_decision_events') then raise exception 'audit_table_columns_invalid'; end if;
  if not exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and contype='f' and confrelid=to_regclass('ai.proposal_inbox') and confdeltype='r') then raise exception 'audit_foreign_key_invalid'; end if;
  if not exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('audit.proposal_review_decision_events') and conname='proposal_review_decision_events_decision_type_check') then raise exception 'audit_decision_constraint_missing'; end if;
  if not coalesce((select not rolcanlogin and not rolsuper and not rolbypassrls from pg_catalog.pg_roles where rolname='farmos_ai_proposal_review_local'),false) then raise exception 'runtime_role_unsafe'; end if;
  if not has_schema_privilege('farmos_ai_proposal_review_local','ai','USAGE') or not has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','SELECT') then raise exception 'proposal_read_privilege_missing'; end if;
  if not has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','status','UPDATE') or not has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','reviewed_by','UPDATE') or not has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','reviewed_at','UPDATE') or not has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','review_note','UPDATE') or not has_column_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','updated_at','UPDATE') then raise exception 'review_update_privilege_missing'; end if;
  if has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','INSERT') or has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','DELETE') or has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','TRUNCATE') or has_table_privilege('farmos_ai_proposal_review_local','ai.proposal_inbox','UPDATE') then raise exception 'proposal_forbidden_privilege_present'; end if;
  if not has_schema_privilege('farmos_ai_proposal_review_local','audit','USAGE') or not has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','INSERT') then raise exception 'audit_insert_privilege_missing'; end if;
  if has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','UPDATE') or has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','DELETE') or has_table_privilege('farmos_ai_proposal_review_local','audit.proposal_review_decision_events','TRUNCATE') then raise exception 'audit_forbidden_privilege_present'; end if;
  if exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind in ('r','p') and (has_table_privilege('farmos_ai_proposal_review_local',c.oid,'INSERT') or has_table_privilege('farmos_ai_proposal_review_local',c.oid,'UPDATE') or has_table_privilege('farmos_ai_proposal_review_local',c.oid,'DELETE') or has_table_privilege('farmos_ai_proposal_review_local',c.oid,'TRUNCATE'))) then raise exception 'app_write_privilege_present'; end if;
end $day128_postcondition$;

select jsonb_build_object(
  'fixture_state','applied',
  'postcondition_verified',true,
  'schema_created',not current_setting('day128.audit_schema_existed')::boolean,
  'table_created',not current_setting('day128.audit_table_existed')::boolean,
  'role_created',not current_setting('day128.review_role_existed')::boolean,
  'privileges_configured',true
)::text;
commit;
