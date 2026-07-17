\set ON_ERROR_STOP on

\if :{?daily_brief_owner_role}
\else
  \echo 'required owner role placeholder is missing'
  \quit 3
\endif

\if :{?daily_brief_runtime_role}
\else
  \echo 'required runtime role placeholder is missing'
  \quit 3
\endif

select
  exists (
    select 1 from pg_roles
    where rolname = :'daily_brief_owner_role' and not rolcanlogin and not rolsuper and not rolbypassrls
  )
  and :'daily_brief_owner_role' ~ '^[a-z][a-z0-9_]{0,62}$'
  and :'daily_brief_owner_role' <> :'daily_brief_runtime_role' as daily_brief_owner_role_valid,
  exists (
    select 1 from pg_roles
    where rolname = :'daily_brief_runtime_role' and not rolsuper and not rolbypassrls
  )
  and :'daily_brief_runtime_role' ~ '^[a-z][a-z0-9_]{0,62}$' as daily_brief_runtime_role_valid,
  to_regclass('ai.daily_farm_brief_records') is not null
  and to_regclass('ai.daily_farm_brief_persistence_commands') is not null
  and to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)') is not null
  and pg_get_function_result(to_regprocedure('ai.persist_daily_farm_brief_command(jsonb,text,text,boolean)')) = 'jsonb' as daily_brief_objects_valid
\gset

\if :daily_brief_owner_role_valid
\else
  \echo 'owner role is not eligible'
  \quit 3
\endif

\if :daily_brief_runtime_role_valid
\else
  \echo 'runtime role is not eligible'
  \quit 3
\endif

\if :daily_brief_objects_valid
\else
  \echo 'required Daily Brief objects are unavailable'
  \quit 3
\endif

begin;

alter function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean)
  owner to :"daily_brief_owner_role";
alter function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean)
  security definer;
alter function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean)
  set search_path = pg_catalog, ai;

revoke all privileges on function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean) from public;
grant execute on function ai.persist_daily_farm_brief_command(jsonb, text, text, boolean) to :"daily_brief_runtime_role";

revoke create on schema ai from public;
revoke create on schema ai from :"daily_brief_runtime_role";
grant usage on schema ai to :"daily_brief_owner_role";
grant usage on schema ai to :"daily_brief_runtime_role";

grant select, insert, update on table ai.daily_farm_brief_records to :"daily_brief_owner_role";
grant select, insert on table ai.daily_farm_brief_persistence_commands to :"daily_brief_owner_role";

grant select on table ai.daily_farm_brief_records to :"daily_brief_runtime_role";
revoke insert, update, delete on table ai.daily_farm_brief_records from :"daily_brief_runtime_role";
revoke select, insert, update, delete on table ai.daily_farm_brief_persistence_commands from :"daily_brief_runtime_role";

commit;
