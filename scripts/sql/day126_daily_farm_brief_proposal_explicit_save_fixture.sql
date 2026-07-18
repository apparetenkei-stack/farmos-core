begin isolation level read committed read write;
set local lock_timeout = '3s';
set local statement_timeout = '15s';
set local timezone = 'UTC';

do $day126_guard$ begin
  if current_database() <> 'farmos_core_day114_test' then raise exception 'database_target_invalid'; end if;
  if inet_server_addr() is not null then raise exception 'isolation_not_verified'; end if;
  if not coalesce((select not rolsuper and not rolbypassrls from pg_catalog.pg_roles where rolname='farmos_ai_proposal_local'),false) then raise exception 'runtime_role_unsafe'; end if;
  if to_regnamespace('ai') is null then raise exception 'ai_schema_missing'; end if;
  if not exists(select 1 from pg_catalog.pg_namespace n join pg_catalog.pg_roles r on r.oid=n.nspowner where n.nspname='ai') then raise exception 'ai_schema_owner_missing'; end if;
  if not coalesce((
    select r.oid=n.nspowner or has_schema_privilege(current_user,n.oid,'CREATE')
    from pg_catalog.pg_roles r cross join pg_catalog.pg_namespace n
    where r.rolname=current_user and n.nspname='ai'
  ),false) then raise exception 'schema_ddl_authority_missing'; end if;
  if to_regclass('ai.daily_farm_brief_records') is null or to_regclass('ai.daily_farm_brief_persistence_commands') is null then raise exception 'daily_brief_relation_missing'; end if;
end $day126_guard$;

create table if not exists ai.proposal_inbox (
  id uuid primary key default gen_random_uuid(),
  proposal_type text not null,
  title text not null,
  body text not null,
  payload_json jsonb not null default '{}'::jsonb,
  source_refs_json jsonb not null default '[]'::jsonb,
  model_name text,
  agent_name text,
  confidence numeric(4,3),
  reason text,
  risk_level text not null default 'low',
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  applied_at timestamptz,
  applied_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposal_inbox_status_check check (status in ('pending','approved','rejected','needs_revision','applied','expired')),
  constraint proposal_inbox_risk_level_check check (risk_level in ('low','medium','high','critical')),
  constraint proposal_inbox_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1))
);

revoke all on schema ai from public;
revoke all on ai.proposal_inbox from public;
grant usage on schema ai to farmos_ai_proposal_local;
grant select,insert on ai.proposal_inbox to farmos_ai_proposal_local;
revoke update,delete,truncate on ai.proposal_inbox from farmos_ai_proposal_local;
revoke create on schema ai from farmos_ai_proposal_local;

insert into ai.proposal_inbox(id,proposal_type,title,body,payload_json,source_refs_json,model_name,agent_name,confidence,reason,risk_level,status,created_at,updated_at)
values ('14711111-88db-41fd-a048-1c37266fd9e0','fixture_protected','Day81 protected proposal','Fixture state protected by Day126 E2E','{}'::jsonb,'{"day81_persistence_boundary_test_id":"day81_core_internal_test_only_v1"}'::jsonb,null,'hermes',null,'Fixture protection baseline','low','pending','2026-07-18T00:00:00.000Z','2026-07-18T00:00:00.000Z')
on conflict (id) do nothing;

do $day126_postcondition$ begin
  if not (select count(*)=19 and count(*) filter (where column_name=any(array['id','proposal_type','title','body','payload_json','source_refs_json','model_name','agent_name','confidence','reason','risk_level','status','reviewed_by','reviewed_at','review_note','applied_at','applied_by','created_at','updated_at']))=19 from information_schema.columns where table_schema='ai' and table_name='proposal_inbox') then raise exception 'proposal_inbox_contract_invalid'; end if;
  if not exists(select 1 from pg_catalog.pg_constraint where conrelid=to_regclass('ai.proposal_inbox') and contype='p') then raise exception 'proposal_inbox_primary_key_invalid'; end if;
  if (select count(*) from pg_catalog.pg_constraint where conrelid=to_regclass('ai.proposal_inbox') and contype='c' and conname in ('proposal_inbox_status_check','proposal_inbox_risk_level_check','proposal_inbox_confidence_check')) <> 3 then raise exception 'proposal_inbox_constraints_invalid'; end if;
  if not coalesce((select c.relowner=n.nspowner from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='ai' and c.relname='proposal_inbox'),false) then raise exception 'proposal_inbox_owner_invalid'; end if;
  if not has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','SELECT') or not has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','INSERT') then raise exception 'runtime_read_insert_missing'; end if;
  if has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','UPDATE') or has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','DELETE') or has_table_privilege('farmos_ai_proposal_local','ai.proposal_inbox','TRUNCATE') then raise exception 'runtime_excess_privilege'; end if;
  if not has_schema_privilege('farmos_ai_proposal_local','ai','USAGE') or has_schema_privilege('farmos_ai_proposal_local','ai','CREATE') then raise exception 'runtime_schema_privilege_invalid'; end if;
  if has_schema_privilege('public','ai','USAGE') or has_schema_privilege('public','ai','CREATE') then raise exception 'public_schema_privilege_present'; end if;
  if has_table_privilege('public','ai.proposal_inbox','SELECT') or has_table_privilege('public','ai.proposal_inbox','INSERT') or has_table_privilege('public','ai.proposal_inbox','UPDATE') or has_table_privilege('public','ai.proposal_inbox','DELETE') or has_table_privilege('public','ai.proposal_inbox','TRUNCATE') then raise exception 'public_table_privilege_present'; end if;
  if not exists(select 1 from ai.proposal_inbox where id='14711111-88db-41fd-a048-1c37266fd9e0' and status='pending' and applied_at is null and applied_by is null and source_refs_json->>'day81_persistence_boundary_test_id'='day81_core_internal_test_only_v1') then raise exception 'protected_fixture_missing'; end if;
end $day126_postcondition$;

select jsonb_build_object('fixture_state','applied','postcondition_verified',true)::text;
commit;
