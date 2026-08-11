-- Day150 Phase C2-A verification artifact. Catalog and schema-metadata reads only.
begin transaction read only;

do $pte_verify$
declare
  relation_name text;
  function_name text;
  trigger_name text;
  runtime_role oid := pg_catalog.to_regrole(
    'farmos_core_production_target_execution_transaction');
  role_row record;
  metadata_owner oid;
  expected_columns jsonb := $columns${
    "production_target_execution_schema_metadata":["singleton","migration_id","schema_version","persistence_port_version","apply_checksum_authority","relation_registry_digest","function_registry_digest","trigger_registry_digest","authority_registry_digest","source_state","created_at"],
    "production_target_execution_proposals":["proposal_id","proposal_digest","authority_id","authority_revision","target_binding_digest","operation_scope","expires_at","record_json","created_at"],
    "production_target_execution_approvals":["approval_id","approval_digest","proposal_id","proposal_digest","authority_id","authority_revision","target_binding_digest","operation_scope","expires_at","record_json","created_at"],
    "production_target_execution_approval_receipts":["approval_receipt_id","approval_receipt_digest","approval_id","approval_digest","proposal_id","proposal_digest","target_binding_digest","operation_scope","record_json","created_at"],
    "production_target_execution_approval_revocation_events":["revocation_event_id","revocation_event_digest","approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","event_sequence","previous_event_digest","effective_at","record_json","created_at"],
    "production_target_execution_approval_revocation_heads":["approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","head_version","head_digest","latest_event_id","latest_event_digest","status","effective_revoked_at","record_json","updated_at"],
    "production_target_execution_approval_uses":["approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","binding_state","binding_version","binding_digest","command_id","reservation_id","execution_binding_digest","updated_at"],
    "production_target_execution_commands":["command_id","command_record_digest","execution_binding_digest","nonce_digest","proposal_id","proposal_digest","approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","phase_b_authority_bundle_digest","target_binding_digest","record_json","created_at"],
    "production_target_execution_lifecycles":["command_id","command_record_digest","execution_binding_digest","approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","state","state_version","lifecycle_record_digest","approval_use_state","reservation_id","reservation_digest","attempt_id","attempt_digest","terminal_receipt_id","terminal_receipt_digest","record_json","updated_at"],
    "production_target_execution_reservations":["reservation_id","reservation_digest","command_id","command_record_digest","approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","execution_binding_digest","record_json","created_at"],
    "production_target_execution_attempts":["attempt_id","attempt_digest","reservation_id","reservation_digest","command_id","execution_binding_digest","record_json","created_at"],
    "production_target_execution_execution_receipts":["receipt_id","receipt_digest","command_id","command_record_digest","execution_binding_digest","approval_id","approval_digest","approval_receipt_id","approval_receipt_digest","reservation_id","reservation_digest","attempt_id","attempt_digest","terminal_state","record_json","created_at"],
    "production_target_execution_clock_evidence":["evidence_id","evidence_digest","clock_authority_id","clock_authority_revision","observed_at","observed_lower_bound","record_json","created_at"],
    "production_target_execution_clock_floors":["clock_authority_id","clock_authority_revision","floor_version","observed_lower_bound","floor_digest","updated_at"],
    "production_target_execution_reconciliation_records":["reconciliation_id","reconciliation_digest","record_kind","command_id","execution_binding_digest","lifecycle_state_version","record_json","created_at"]
  }$columns$::jsonb;
begin
  if runtime_role is null then
    raise exception using errcode = 'P0001', message = 'pte_verify:V001';
  end if;
  select * into role_row from pg_catalog.pg_roles where oid = runtime_role;
  if role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
    or role_row.rolcreaterole or role_row.rolinherit or role_row.rolreplication
    or role_row.rolbypassrls
  then
    raise exception using errcode = 'P0001', message = 'pte_verify:V002';
  end if;
  if exists (select 1 from pg_catalog.pg_auth_members membership
      where membership.member = runtime_role)
    or pg_catalog.has_schema_privilege(
      'farmos_core_production_target_execution_transaction', 'ai', 'CREATE')
    or (select namespace_row.nspowner from pg_catalog.pg_namespace namespace_row
      where namespace_row.nspname = 'ai') = runtime_role
  then
    raise exception using errcode = 'P0001', message = 'pte_verify:V002A';
  end if;

  select class_row.relowner into metadata_owner
  from pg_catalog.pg_class class_row
  join pg_catalog.pg_namespace namespace_row
    on namespace_row.oid = class_row.relnamespace
  where namespace_row.nspname = 'ai'
    and class_row.relname = 'production_target_execution_schema_metadata';
  if metadata_owner is null then
    raise exception using errcode = 'P0001', message = 'pte_verify:V003';
  end if;

  foreach relation_name in array array[
    'production_target_execution_schema_metadata',
    'production_target_execution_proposals',
    'production_target_execution_approvals',
    'production_target_execution_approval_receipts',
    'production_target_execution_approval_revocation_events',
    'production_target_execution_approval_revocation_heads',
    'production_target_execution_approval_uses',
    'production_target_execution_commands',
    'production_target_execution_lifecycles',
    'production_target_execution_reservations',
    'production_target_execution_attempts',
    'production_target_execution_execution_receipts',
    'production_target_execution_clock_evidence',
    'production_target_execution_clock_floors',
    'production_target_execution_reconciliation_records'
  ] loop
    if pg_catalog.to_regclass('ai.' || relation_name) is null
      or (select class_row.relkind from pg_catalog.pg_class class_row
        where class_row.oid = pg_catalog.to_regclass('ai.' || relation_name)) <> 'r'
      or (select pg_catalog.jsonb_agg(attribute_row.attname order by attribute_row.attnum)
        from pg_catalog.pg_attribute attribute_row
        where attribute_row.attrelid = pg_catalog.to_regclass('ai.' || relation_name)
          and attribute_row.attnum > 0 and not attribute_row.attisdropped)
        is distinct from expected_columns -> relation_name
      or exists (select 1 from pg_catalog.pg_attribute attribute_row
        where attribute_row.attrelid = pg_catalog.to_regclass('ai.' || relation_name)
          and attribute_row.attnum > 0 and not attribute_row.attisdropped
          and (pg_catalog.format_type(attribute_row.atttypid, attribute_row.atttypmod) <>
            case
              when attribute_row.attname = 'singleton' then 'boolean'
              when attribute_row.attname in ('authority_revision',
                'clock_authority_revision') then 'integer'
              when attribute_row.attname in ('head_version','binding_version','state_version',
                'floor_version','event_sequence','lifecycle_state_version') then 'bigint'
              when attribute_row.attname in ('expires_at','effective_at','effective_revoked_at',
                'observed_at','observed_lower_bound') then 'timestamp(3) with time zone'
              when attribute_row.attname in ('created_at','updated_at') then
                'timestamp(6) with time zone'
              when attribute_row.attname = 'record_json' then 'jsonb'
              else 'text' end
            or attribute_row.attnotnull is distinct from not (
              (relation_name = 'production_target_execution_approval_revocation_events'
                and attribute_row.attname = 'previous_event_digest')
              or (relation_name = 'production_target_execution_approval_revocation_heads'
                and attribute_row.attname in (
                  'latest_event_id','latest_event_digest','effective_revoked_at'))
              or (relation_name = 'production_target_execution_approval_uses'
                and attribute_row.attname in (
                  'command_id','reservation_id','execution_binding_digest'))
              or (relation_name = 'production_target_execution_lifecycles'
                and attribute_row.attname in ('reservation_id','reservation_digest','attempt_id',
                  'attempt_digest','terminal_receipt_id','terminal_receipt_digest'))
              or (relation_name = 'production_target_execution_execution_receipts'
                and attribute_row.attname in (
                  'reservation_id','reservation_digest','attempt_id','attempt_digest')))))
      or (select class_row.relowner from pg_catalog.pg_class class_row
        where class_row.oid = pg_catalog.to_regclass('ai.' || relation_name))
        <> metadata_owner
      or (select class_row.relowner from pg_catalog.pg_class class_row
        where class_row.oid = pg_catalog.to_regclass('ai.' || relation_name))
        = runtime_role
      or pg_catalog.has_table_privilege(
        'farmos_core_production_target_execution_transaction',
        'ai.' || relation_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
      or pg_catalog.has_table_privilege(
        'public', 'ai.' || relation_name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
    then
      raise exception using errcode = 'P0001', message = 'pte_verify:V004';
    end if;
  end loop;
  if (select pg_catalog.count(*) from pg_catalog.pg_class class_row
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
    where namespace_row.nspname = 'ai'
      and class_row.relkind in ('r', 'p')
      and class_row.relname like 'production\_target\_execution\_%' escape '\') <> 15
  then raise exception using errcode = 'P0001', message = 'pte_verify:V005'; end if;

  if exists (
    select 1 from pg_catalog.pg_roles denied_role
    where denied_role.rolname in ('anon', 'authenticated')
      and exists (
        select 1 from pg_catalog.pg_class class_row
        join pg_catalog.pg_namespace namespace_row
          on namespace_row.oid = class_row.relnamespace
        where namespace_row.nspname = 'ai'
          and class_row.relname like 'production\_target\_execution\_%' escape '\'
          and pg_catalog.has_table_privilege(
            denied_role.rolname, class_row.oid,
            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')))
  then raise exception using errcode = 'P0001', message = 'pte_verify:V006'; end if;
  if exists (select 1 from information_schema.column_privileges privilege_row
      where privilege_row.table_schema = 'ai'
        and privilege_row.table_name like 'production\_target\_execution\_%' escape '\'
        and privilege_row.grantee in (
          'PUBLIC','farmos_core_production_target_execution_transaction','anon','authenticated'))
  then raise exception using errcode = 'P0001', message = 'pte_verify:V006A'; end if;
  if exists (select 1 from pg_catalog.pg_default_acl default_acl
      cross join lateral pg_catalog.aclexplode(pg_catalog.coalesce(
        default_acl.defaclacl,
        pg_catalog.acldefault(default_acl.defaclobjtype, default_acl.defaclrole))) grant_row
      where default_acl.defaclnamespace in (0, pg_catalog.to_regnamespace('ai'))
        and grant_row.grantee in (0, runtime_role)
        and grant_row.privilege_type in (
          'INSERT','UPDATE','DELETE','TRUNCATE','EXECUTE','CREATE'))
  then raise exception using errcode = 'P0001', message = 'pte_verify:V006B'; end if;

  foreach function_name in array array[
    'ai.read_production_target_execution_schema_identity()',
    'ai.append_production_target_execution_proposal(jsonb)',
    'ai.append_production_target_execution_approval_and_receipt(jsonb)',
    'ai.read_production_target_execution_approval_lineage(jsonb)',
    'ai.append_production_target_execution_revocation_and_advance_head(jsonb)',
    'ai.read_production_target_execution_revocation_state(jsonb)',
    'ai.append_production_target_execution_command(jsonb)',
    'ai.read_production_target_execution_command(jsonb)',
    'ai.reserve_production_target_execution(jsonb)',
    'ai.start_production_target_execution_attempt(jsonb)',
    'ai.terminate_production_target_execution_pre_start(jsonb)',
    'ai.finalize_production_target_execution(jsonb)',
    'ai.read_production_target_execution_reservation_reconciliation(jsonb)',
    'ai.resolve_production_target_execution_reservation_absent(jsonb)',
    'ai.resolve_production_target_execution_reservation_present(jsonb)',
    'ai.read_production_target_execution_post_reservation_ambiguity(jsonb)',
    'ai.resolve_production_target_execution_post_reservation_ambiguity(jsonb)',
    'ai.read_production_target_execution_lifecycle(jsonb)',
    'ai.read_production_target_execution_receipt(jsonb)'
  ] loop
    if pg_catalog.to_regprocedure(function_name) is null
      or not pg_catalog.has_function_privilege(
        'farmos_core_production_target_execution_transaction', function_name, 'EXECUTE')
      or pg_catalog.has_function_privilege('public', function_name, 'EXECUTE')
      or exists (select 1 from pg_catalog.pg_roles denied_role
        where denied_role.rolname in ('anon', 'authenticated')
          and pg_catalog.has_function_privilege(denied_role.rolname, function_name, 'EXECUTE'))
      or exists (select 1 from pg_catalog.pg_proc procedure_row
        where procedure_row.oid = pg_catalog.to_regprocedure(function_name)
          and (not procedure_row.prosecdef
            or procedure_row.proowner <> metadata_owner
            or procedure_row.proconfig is distinct from array[
              'search_path=pg_catalog', 'statement_timeout=10s', 'lock_timeout=5s'
            ]::text[]))
    then
      raise exception using errcode = 'P0001', message = 'pte_verify:V007';
    end if;
  end loop;
  if (select pg_catalog.count(*) from pg_catalog.pg_proc procedure_row
    join pg_catalog.pg_namespace namespace_row
      on namespace_row.oid = procedure_row.pronamespace
    where namespace_row.nspname = 'ai'
      and procedure_row.proname like '%production\_target\_execution%' escape '\') <> 27
  then raise exception using errcode = 'P0001', message = 'pte_verify:V007B'; end if;

  foreach function_name in array array[
    'ai.reject_production_target_execution_append_only_mutation()',
    'ai.enforce_production_target_execution_cas_progression()',
    'ai.production_target_execution_canonical_jsonb(jsonb)',
    'ai.production_target_execution_digest(text,jsonb)',
    'ai.assert_production_target_execution_exact_record(jsonb,text[],text,text,text[])',
    'ai.assert_production_target_execution_receipt_binding(jsonb,jsonb,jsonb,text[])',
    'ai.assert_production_target_execution_schema_identity()',
    'ai.advance_production_target_execution_clock_floor(jsonb)'
  ] loop
    if pg_catalog.to_regprocedure(function_name) is null
      or pg_catalog.has_function_privilege(
        'farmos_core_production_target_execution_transaction', function_name, 'EXECUTE')
      or pg_catalog.has_function_privilege('public', function_name, 'EXECUTE')
      or exists (select 1 from pg_catalog.pg_proc procedure_row
        where procedure_row.oid = pg_catalog.to_regprocedure(function_name)
          and (procedure_row.proowner <> metadata_owner
            or not pg_catalog.coalesce(
              'search_path=pg_catalog' = any(procedure_row.proconfig), false)))
    then
      raise exception using errcode = 'P0001', message = 'pte_verify:V007A';
    end if;
  end loop;

  foreach trigger_name in array array[
    'pte_metadata_ao', 'pte_metadata_truncate',
    'pte_proposals_ao', 'pte_proposals_truncate',
    'pte_approvals_ao', 'pte_approvals_truncate',
    'pte_approval_receipts_ao', 'pte_approval_receipts_truncate',
    'pte_revocation_events_ao', 'pte_revocation_events_truncate',
    'pte_commands_ao', 'pte_commands_truncate',
    'pte_reservations_ao', 'pte_reservations_truncate',
    'pte_attempts_ao', 'pte_attempts_truncate',
    'pte_execution_receipts_ao', 'pte_execution_receipts_truncate',
    'pte_clock_evidence_ao', 'pte_clock_evidence_truncate',
    'pte_reconciliation_ao', 'pte_reconciliation_truncate',
    'pte_revocation_heads_cas', 'pte_approval_uses_cas',
    'pte_lifecycles_cas', 'pte_clock_floors_cas',
    'pte_revocation_heads_delete', 'pte_revocation_heads_truncate',
    'pte_approval_uses_delete', 'pte_approval_uses_truncate',
    'pte_lifecycles_delete', 'pte_lifecycles_truncate',
    'pte_clock_floors_delete', 'pte_clock_floors_truncate'
  ] loop
    if not exists (select 1 from pg_catalog.pg_trigger trigger_row
      join pg_catalog.pg_class class_row on class_row.oid = trigger_row.tgrelid
      join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'ai' and trigger_row.tgname = trigger_name
        and not trigger_row.tgisinternal
        and trigger_row.tgenabled = 'O'
        and case
          when trigger_name like '%_truncate' then
            pg_catalog.pg_get_triggerdef(trigger_row.oid) like '%BEFORE TRUNCATE%'
          when trigger_name like '%_delete' then
            pg_catalog.pg_get_triggerdef(trigger_row.oid) like '%BEFORE DELETE%'
          when trigger_name like '%_cas' then
            pg_catalog.pg_get_triggerdef(trigger_row.oid) like '%BEFORE UPDATE%'
          else pg_catalog.pg_get_triggerdef(trigger_row.oid) like '%BEFORE UPDATE OR DELETE%'
        end)
    then raise exception using errcode = 'P0001', message = 'pte_verify:V008'; end if;
  end loop;
  if (select pg_catalog.count(*) from pg_catalog.pg_trigger trigger_row
    join pg_catalog.pg_class class_row on class_row.oid = trigger_row.tgrelid
    join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
    where namespace_row.nspname = 'ai'
      and class_row.relname like 'production\_target\_execution\_%' escape '\'
      and not trigger_row.tgisinternal) <> 34
  then raise exception using errcode = 'P0001', message = 'pte_verify:V009'; end if;

  if not exists (select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.conname = 'pte_revocation_event_sequence_uq')
    or not exists (select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.conname = 'pte_reservation_command_uq')
    or not exists (select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.conname = 'pte_reservation_approval_uq')
    or not exists (select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.conname = 'pte_reservation_approval_receipt_uq')
    or not exists (select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.conname = 'pte_attempt_reservation_uq')
    or not exists (select 1 from pg_catalog.pg_constraint constraint_row
      where constraint_row.conname = 'pte_execution_receipt_command_uq')
    or pg_catalog.to_regclass('ai.pte_revocation_event_chain_idx') is null
    or pg_catalog.to_regclass('ai.pte_lifecycle_state_idx') is null
    or pg_catalog.to_regclass('ai.pte_receipt_terminal_idx') is null
  then raise exception using errcode = 'P0001', message = 'pte_verify:V010'; end if;

  if not exists (select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid = pg_catalog.to_regclass(
        'ai.production_target_execution_approval_revocation_heads')
        and attribute_row.attname = 'head_version' and not attribute_row.attisdropped)
    or not exists (select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid = pg_catalog.to_regclass(
        'ai.production_target_execution_approval_uses')
        and attribute_row.attname = 'binding_version' and not attribute_row.attisdropped)
    or not exists (select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid = pg_catalog.to_regclass(
        'ai.production_target_execution_lifecycles')
        and attribute_row.attname = 'state_version' and not attribute_row.attisdropped)
    or not exists (select 1 from pg_catalog.pg_attribute attribute_row
      where attribute_row.attrelid = pg_catalog.to_regclass(
        'ai.production_target_execution_clock_floors')
        and attribute_row.attname = 'floor_version' and not attribute_row.attisdropped)
  then raise exception using errcode = 'P0001', message = 'pte_verify:V011'; end if;

  if not exists (
      select 1 from ai.production_target_execution_schema_metadata metadata
      join core_schema.migration_history history on history.migration_id = metadata.migration_id
      where metadata.singleton
        and metadata.migration_id = '202608110001_production_target_execution_durability'
        and metadata.schema_version =
          'farmos.production-target-execution-postgres-schema.v1'
        and metadata.persistence_port_version =
          'farmos.production-target-execution-persistence-port.v1'
        and metadata.source_state = 'SOURCE_ARTIFACT_CREATED'
        and history.sequence = 202608110001
        and history.checksum ~ '^sha256:[a-f0-9]{64}$')
  then raise exception using errcode = 'P0001', message = 'pte_verify:V012'; end if;
end
$pte_verify$;

rollback;
