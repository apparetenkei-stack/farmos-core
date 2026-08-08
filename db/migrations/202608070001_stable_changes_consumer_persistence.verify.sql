-- Verification artifact. Read-only catalog checks only.
begin transaction read only;

do $stable_changes_verify$
declare
  relation_name text;
  function_name text;
  runtime_role oid := pg_catalog.to_regrole('farmos_core_stable_changes_runtime');
  role_row record;
begin
  if runtime_role is null then
    raise exception using errcode = 'P0001', message = 'stable_changes_verify:V001';
  end if;
  select * into role_row from pg_catalog.pg_roles where oid = runtime_role;
  if role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
    or role_row.rolcreaterole or role_row.rolinherit or role_row.rolreplication
    or role_row.rolbypassrls
  then
    raise exception using errcode = 'P0001', message = 'stable_changes_verify:V002';
  end if;
  foreach relation_name in array array[
    'stable_changes_consumer_scopes',
    'stable_changes_consumer_checkpoints',
    'stable_changes_page_commit_receipts',
    'stable_changes_validated_ingress'
  ] loop
    if pg_catalog.to_regclass('ai.' || relation_name) is null
      or pg_catalog.has_table_privilege(
        'farmos_core_stable_changes_runtime', 'ai.' || relation_name, 'SELECT'
      )
      or pg_catalog.has_table_privilege(
        'farmos_core_stable_changes_runtime', 'ai.' || relation_name, 'INSERT'
      )
      or pg_catalog.has_table_privilege(
        'farmos_core_stable_changes_runtime', 'ai.' || relation_name, 'UPDATE'
      )
      or pg_catalog.has_table_privilege(
        'farmos_core_stable_changes_runtime', 'ai.' || relation_name, 'DELETE'
      )
    then
      raise exception using errcode = 'P0001', message = 'stable_changes_verify:V003';
    end if;
  end loop;
  foreach function_name in array array[
    'ai.load_stable_changes_checkpoint(text)',
    'ai.commit_stable_changes_page(text,bigint,text,jsonb,timestamptz)'
  ] loop
    if pg_catalog.to_regprocedure(function_name) is null
      or not pg_catalog.has_function_privilege(
        'farmos_core_stable_changes_runtime', function_name, 'EXECUTE'
      )
      or pg_catalog.has_function_privilege('public', function_name, 'EXECUTE')
    then
      raise exception using errcode = 'P0001', message = 'stable_changes_verify:V004';
    end if;
  end loop;
  if pg_catalog.has_function_privilege(
      'farmos_core_stable_changes_runtime',
      'ai.initialize_stable_changes_consumer_scope(text,text,date,date,smallint)',
      'EXECUTE'
    )
    or exists (
      select 1 from pg_catalog.pg_proc procedure_row
      where procedure_row.oid in (
        pg_catalog.to_regprocedure(
          'ai.initialize_stable_changes_consumer_scope(text,text,date,date,smallint)'
        ),
        pg_catalog.to_regprocedure('ai.load_stable_changes_checkpoint(text)'),
        pg_catalog.to_regprocedure(
          'ai.commit_stable_changes_page(text,bigint,text,jsonb,timestamptz)'
        )
      ) and (
        not procedure_row.prosecdef
        or procedure_row.proconfig is distinct from array[
          'search_path=pg_catalog',
          'statement_timeout=10s',
          'lock_timeout=5s'
        ]::text[]
      )
    )
    or (select pg_catalog.count(*) from pg_catalog.pg_trigger trigger_row
      join pg_catalog.pg_class class_row on class_row.oid = trigger_row.tgrelid
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'ai'
        and class_row.relname in (
          'stable_changes_consumer_scopes',
          'stable_changes_page_commit_receipts',
          'stable_changes_validated_ingress'
        ) and not trigger_row.tgisinternal) <> 6
  then
    raise exception using errcode = 'P0001', message = 'stable_changes_verify:V005';
  end if;
  if not exists (
      select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid = pg_catalog.to_regclass(
        'ai.stable_changes_consumer_checkpoints'
      ) and attribute_row.attname = 'last_accepted_count'
        and not attribute_row.attisdropped
    )
    or not exists (
      select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid = pg_catalog.to_regclass(
        'ai.stable_changes_page_commit_receipts'
      ) and attribute_row.attname = 'accepted_count'
        and not attribute_row.attisdropped
    )
    or exists (
      select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid in (
        pg_catalog.to_regclass('ai.stable_changes_consumer_checkpoints'),
        pg_catalog.to_regclass('ai.stable_changes_page_commit_receipts')
      ) and attribute_row.attname in (
        'last_materialized_count', 'materialized_count'
      ) and not attribute_row.attisdropped
    )
  then
    raise exception using errcode = 'P0001', message = 'stable_changes_verify:V006';
  end if;
  if exists (
      select 1 from pg_catalog.pg_roles denied_role
      where denied_role.rolname in ('anon', 'authenticated') and (
        pg_catalog.has_function_privilege(
          denied_role.rolname,
          'ai.load_stable_changes_checkpoint(text)', 'EXECUTE'
        )
        or pg_catalog.has_function_privilege(
          denied_role.rolname,
          'ai.commit_stable_changes_page(text,bigint,text,jsonb,timestamptz)',
          'EXECUTE'
        )
        or exists (
          select 1 from pg_catalog.pg_class class_row
          where class_row.oid in (
            pg_catalog.to_regclass('ai.stable_changes_consumer_scopes'),
            pg_catalog.to_regclass('ai.stable_changes_consumer_checkpoints'),
            pg_catalog.to_regclass('ai.stable_changes_page_commit_receipts'),
            pg_catalog.to_regclass('ai.stable_changes_validated_ingress')
          ) and pg_catalog.has_table_privilege(
            denied_role.rolname, class_row.oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'
          )
        )
      )
    )
  then
    raise exception using errcode = 'P0001', message = 'stable_changes_verify:V007';
  end if;
end
$stable_changes_verify$;

rollback;
