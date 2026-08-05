begin transaction read only;

do $day149_verify$
declare
  review_table oid := pg_catalog.to_regclass(
    'ai.operational_memory_projection_review_decisions'
  );
  receipt_table oid := pg_catalog.to_regclass(
    'ai.operational_memory_projection_command_receipts'
  );
  projection_table oid := pg_catalog.to_regclass(
    'ai.operational_memory_daily_projections'
  );
  event_table oid := pg_catalog.to_regclass(
    'ai.operational_memory_projection_state_events'
  );
  writer oid := pg_catalog.to_regprocedure(
    'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)'
  );
  append_only oid := pg_catalog.to_regprocedure(
    'ai.reject_operational_memory_projection_command_ledger_mutation()'
  );
  review_guard oid := pg_catalog.to_regprocedure(
    'ai.enforce_operational_memory_projection_review_binding()'
  );
  receipt_guard oid := pg_catalog.to_regprocedure(
    'ai.enforce_operational_memory_projection_command_receipt_binding()'
  );
  receipt_required oid := pg_catalog.to_regprocedure(
    'ai.require_operational_memory_projection_command_receipt()'
  );
  transaction_role oid := pg_catalog.to_regrole(
    'farmos_core_projection_command_transaction'
  );
  review_columns text[];
  receipt_columns text[];
  writer_definition text;
  receipt_guard_definition text;
  promotion_one_event_definition text;
  promotion_two_event_definition text;
  receipt_required_definition text;
  append_only_definition text;
  review_guard_definition text;
  function_oid oid;
  trigger_count integer;
  role_row record;
  protected_owner oid;
begin
  if review_table is null or receipt_table is null or projection_table is null
    or event_table is null or writer is null or append_only is null
    or review_guard is null or receipt_guard is null
    or receipt_required is null or transaction_role is null
    or pg_catalog.to_regprocedure(
      'ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'
    ) is null
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V001';
  end if;

  select class_row.relowner into protected_owner
  from pg_catalog.pg_class as class_row where class_row.oid = projection_table;
  if protected_owner is distinct from (
      select class_row.relowner from pg_catalog.pg_class as class_row
      where class_row.oid = event_table
    ) or protected_owner is distinct from (
      select class_row.relowner from pg_catalog.pg_class as class_row
      where class_row.oid = review_table
    ) or protected_owner is distinct from (
      select class_row.relowner from pg_catalog.pg_class as class_row
      where class_row.oid = receipt_table
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V003';
  end if;
  if exists (
      select 1 from pg_catalog.pg_proc as procedure_row
      where procedure_row.oid in (
        writer, append_only, review_guard, receipt_guard, receipt_required
      ) and procedure_row.proowner <> protected_owner
  )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V004';
  end if;

  if not exists (
    select 1 from core_schema.migration_history as history
    where history.migration_id =
      '202608030001_daily_operational_projection_command_ledger'
      and history.sequence = 202608030001
      and history.checksum =
        'sha256:98504d23be1922d339acf0c7384ad1a5f9b6257e44a07a9073200b21bd79ef0a'
  ) then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V002';
  end if;

  select pg_catalog.array_agg(attribute.attname order by attribute.attnum)
  into review_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = review_table and attribute.attnum > 0
    and not attribute.attisdropped;
  select pg_catalog.array_agg(attribute.attname order by attribute.attnum)
  into receipt_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = receipt_table and attribute.attnum > 0
    and not attribute.attisdropped;
  if review_columns <> array[
      'review_id', 'candidate_projection_id', 'candidate_projection_version',
      'candidate_state_sequence', 'candidate_content_hash', 'review_sequence',
      'decision', 'reason', 'reviewed_by', 'reviewed_at', 'command_id',
      'canonical_payload_hash'
    ]::text[]
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V005';
  end if;
  if receipt_columns <> array[
      'receipt_schema_version', 'command_id', 'idempotency_key_hash',
      'command_type', 'canonical_payload_hash', 'result_status', 'result_code',
      'result_payload', 'result_payload_hash', 'requested_by', 'requested_at',
      'committed_at', 'review_decision_id', 'affected_projection_id_1',
      'committed_state_event_id_1', 'committed_state_event_sequence_1',
      'affected_projection_id_2', 'committed_state_event_id_2',
      'committed_state_event_sequence_2'
    ]::text[]
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V006';
  end if;

  if not exists (
      select 1 from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = review_table
        and constraint_row.conname =
          'om_projection_review_candidate_seq_uq'
        and constraint_row.contype = 'u'
    ) or (select pg_catalog.count(*) from pg_catalog.pg_constraint
      where conrelid = review_table and contype <> 't') <> 15
    or (select pg_catalog.count(*) from pg_catalog.pg_constraint
      where conrelid = review_table and contype = 't') <> 0
    or (select pg_catalog.count(*) from pg_catalog.pg_constraint
      where conrelid = review_table) <> 15
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V007';
  end if;

  if (select pg_catalog.count(*) from pg_catalog.pg_constraint
      where conrelid = receipt_table and contype <> 't') <> 19
    or (select pg_catalog.count(*) from pg_catalog.pg_constraint
      where conrelid = receipt_table and contype = 't') <> 1
    or (select pg_catalog.count(*) from pg_catalog.pg_constraint
      where conrelid = receipt_table) <> 20
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V008';
  end if;

  if not exists (
      select 1 from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = receipt_table
        and constraint_row.conname =
          'operational_memory_projection_command_receipt_binding_guard'
        and constraint_row.contype = 't'
        and constraint_row.condeferrable and constraint_row.condeferred
    )
    or not exists (
      select 1 from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = review_table
        and constraint_row.conname =
          'operational_memory_projection_review_decisions_receipt_fkey'
        and constraint_row.contype = 'f'
        and constraint_row.condeferrable and constraint_row.condeferred
    ) or not exists (
      select 1 from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = receipt_table
        and constraint_row.conname =
          'om_projection_command_idempotency_uq'
        and constraint_row.contype = 'u'
    ) or (
      select pg_catalog.count(*)
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = receipt_table
        and constraint_row.contype = 'f'
        and constraint_row.conname in (
          'om_projection_command_projection_1_fk',
          'om_projection_command_projection_2_fk',
          'om_projection_command_event_1_fk',
          'om_projection_command_event_2_fk'
        )
    ) <> 4
    or not exists (
      select 1 from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = receipt_table
        and constraint_row.conname =
          'operational_memory_projection_command_receipts_review_fkey'
        and constraint_row.contype = 'f'
        and constraint_row.condeferrable and constraint_row.condeferred
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V009';
  end if;

  if not exists (
      select 1 from pg_catalog.pg_indexes as index_row
      where index_row.schemaname = 'ai'
        and index_row.indexname =
          'idx_operational_memory_projection_receipt_review'
        and index_row.indexdef like '%WHERE (review_decision_id IS NOT NULL)%'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V010';
  end if;

  foreach function_oid in array array[
    writer, append_only, review_guard, receipt_guard, receipt_required
  ] loop
    if not exists (
      select 1 from pg_catalog.pg_proc as procedure_row
      where procedure_row.oid = function_oid
        and procedure_row.provolatile = 'v'
        and procedure_row.proconfig = array['search_path=pg_catalog']::text[]
        and procedure_row.prosecdef = (function_oid = writer)
    ) then
      raise exception using errcode = 'P0001',
        message = 'day149_verify_failed:V011';
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_proc as procedure_row
    where procedure_row.oid in (
      writer, append_only, review_guard, receipt_guard, receipt_required
    ) and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
      procedure_row.prosrc, 'UTF8'
    )), 'hex') <> case procedure_row.oid
      when append_only then
        '3b5aa7875761f036e96fb6a7c43a8cf13f28d3d889cbb9ccba5c853e122bb764'
      when review_guard then
        '5c43ab335aacec0de6721102e9e62dc71789d7ace8c82877514c33d043825d80'
      when receipt_guard then
        '6713f913b5ea6959bfe3765262521b4b4bafa7de5e8cddd3aa5b1f61cddff7ab'
      when receipt_required then
        '6dcfcf6705ff8928845fe7fe911111b17c14d58593e12f56cb09ca3b50d7bb92'
      when writer then
        '4c3ff78befab8b718ab15dd0d8c7847894f029b8cb6ade783fa2ea49d7a20b52'
      else null
    end
  ) then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V012';
  end if;
  select pg_catalog.pg_get_functiondef(writer) into writer_definition;
  select pg_catalog.pg_get_functiondef(receipt_guard)
  into receipt_guard_definition;
  select pg_catalog.pg_get_functiondef(receipt_required)
  into receipt_required_definition;
  select pg_catalog.pg_get_functiondef(append_only)
  into append_only_definition;
  select pg_catalog.pg_get_functiondef(review_guard)
  into review_guard_definition;
  promotion_one_event_definition := pg_catalog.split_part(
    pg_catalog.split_part(
      receipt_guard_definition, 'if event_slot_count = 1 then', 2
    ), 'elsif event_slot_count = 2 then', 1
  );
  promotion_two_event_definition := pg_catalog.split_part(
    pg_catalog.split_part(
      receipt_guard_definition, 'elsif event_slot_count = 2 then', 2
    ), E'\n    else\n', 1
  );
  if pg_catalog.strpos(writer_definition,
      'insert into ai.operational_memory_projection_review_decisions') = 0
    or pg_catalog.strpos(writer_definition,
      'insert into ai.operational_memory_daily_projections') = 0
    or pg_catalog.strpos(writer_definition,
      'insert into ai.operational_memory_projection_state_events') = 0
    or pg_catalog.strpos(writer_definition,
      'insert into ai.operational_memory_projection_lineage') = 0
    or pg_catalog.strpos(writer_definition,
      'insert into ai.operational_memory_projection_command_receipts') = 0
    or pg_catalog.regexp_count(
      pg_catalog.lower(writer_definition), 'insert into'
    ) <> 5
    or pg_catalog.strpos(pg_catalog.lower(writer_definition), 'update ') > 0
    or pg_catalog.strpos(pg_catalog.lower(writer_definition), 'delete ') > 0
    or pg_catalog.strpos(pg_catalog.lower(writer_definition), 'execute ') > 0
    or pg_catalog.strpos(writer_definition, 'order by sequence') = 0
    or pg_catalog.strpos(receipt_guard_definition,
      'event_two.projection_id <> review_row.candidate_projection_id') = 0
    or pg_catalog.strpos(receipt_guard_definition,
      'event_one.projection_id <> review_row.candidate_projection_id') = 0
    or pg_catalog.strpos(receipt_guard_definition,
      'rebuilt_projection.business_date = reviewed_projection.business_date') = 0
    or pg_catalog.strpos(receipt_guard_definition,
      'new.result_code not in') = 0
    or pg_catalog.strpos(receipt_guard_definition,
      $$new.result_code <> 'projection_promoted'$$) = 0
    or pg_catalog.strpos(receipt_guard_definition,
      'if event_slot_count = 1 then') = 0
    or pg_catalog.strpos(receipt_guard_definition,
      'elsif event_slot_count = 2 then') = 0
    or pg_catalog.strpos(promotion_one_event_definition,
      'event_one.status') = 0
    or pg_catalog.strpos(promotion_one_event_definition, 'event_two') > 0
    or pg_catalog.strpos(promotion_two_event_definition,
      'event_two.status') = 0
    or pg_catalog.strpos(promotion_two_event_definition,
      'event_two.projection_id') = 0
    or pg_catalog.regexp_count(
      receipt_guard_definition,
      'operational_memory_projection_receipt_promotion_invalid'
    ) <> 4
    or pg_catalog.strpos(writer_definition,
      'farmos.day149_projection_command_writer') = 0
    or pg_catalog.strpos(receipt_required_definition,
      'farmos.day149_projection_command_writer') = 0
    or pg_catalog.strpos(append_only_definition,
      'operational_memory_projection_command_ledger_append_only') = 0
    or pg_catalog.strpos(review_guard_definition,
      'expected_review_sequence') = 0
    or pg_catalog.strpos(review_guard_definition,
      $$new.decision in ('approve', 'reject')$$) = 0
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V013';
  end if;

  select pg_catalog.count(*)::integer into trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where not trigger_row.tgisinternal and (
    (trigger_row.tgrelid = review_table and trigger_row.tgname in (
      'operational_memory_projection_review_decisions_append_only',
      'operational_memory_projection_review_binding_guard'
    )) or
    (trigger_row.tgrelid = receipt_table and trigger_row.tgname in (
      'operational_memory_projection_command_receipts_append_only',
      'operational_memory_projection_command_receipt_binding_guard'
    )) or
    (trigger_row.tgrelid = event_table and trigger_row.tgname =
      'operational_memory_projection_command_receipt_required')
  );
  if trigger_count <> 5
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V014';
  end if;
  if not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = review_table
        and trigger_row.tgname =
          'operational_memory_projection_review_decisions_append_only'
        and trigger_row.tgfoid = append_only
        and trigger_row.tgenabled = 'O'
        and trigger_row.tgtype = 27
    ) or not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = receipt_table
        and trigger_row.tgname =
          'operational_memory_projection_command_receipts_append_only'
        and trigger_row.tgfoid = append_only
        and trigger_row.tgenabled = 'O'
        and trigger_row.tgtype = 27
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V015';
  end if;
  if not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = review_table
        and trigger_row.tgname =
          'operational_memory_projection_review_binding_guard'
        and trigger_row.tgfoid = review_guard
        and trigger_row.tgenabled = 'O'
        and trigger_row.tgtype = 7
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V016';
  end if;
  if not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = receipt_table
        and trigger_row.tgname =
          'operational_memory_projection_command_receipt_binding_guard'
        and trigger_row.tgdeferrable and trigger_row.tginitdeferred
        and trigger_row.tgfoid = receipt_guard
        and trigger_row.tgenabled = 'O'
        and trigger_row.tgtype = 5
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V017';
  end if;
  if not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = event_table
        and trigger_row.tgname =
          'operational_memory_projection_command_receipt_required'
        and trigger_row.tgdeferrable and trigger_row.tginitdeferred
        and trigger_row.tgfoid = receipt_required
        and trigger_row.tgenabled = 'O'
        and trigger_row.tgtype = 5
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V018';
  end if;
  if not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = event_table
        and trigger_row.tgname =
          'operational_memory_projection_state_transition_guard'
    ) or not exists (
      select 1 from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = projection_table
        and trigger_row.tgname =
          'operational_memory_projection_initial_candidate_guard'
        and trigger_row.tgdeferrable and trigger_row.tginitdeferred
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V019';
  end if;

  select * into role_row from pg_catalog.pg_roles
  where oid = transaction_role;
  if role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
    or role_row.rolcreaterole or role_row.rolinherit or role_row.rolreplication
    or role_row.rolbypassrls
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V020';
  end if;
  if exists (
      select 1 from pg_catalog.pg_auth_members as membership
      where membership.roleid = transaction_role
        or membership.member = transaction_role
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V021';
  end if;
  if not pg_catalog.has_schema_privilege(
      'farmos_core_projection_command_transaction', 'ai', 'USAGE'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V022';
  end if;
  if not pg_catalog.has_table_privilege(
      'farmos_core_projection_command_transaction',
      'ai.operational_memory_projection_command_receipts', 'SELECT'
    )
    or exists (
      select 1 from pg_catalog.unnest(array[
        pg_catalog.to_regclass('ai.operational_memory_source_snapshots'),
        pg_catalog.to_regclass('ai.operational_memory_snapshot_state_events'),
        projection_table,
        event_table,
        pg_catalog.to_regclass('ai.operational_memory_projection_lineage'),
        review_table,
        receipt_table
      ]::oid[]) as protected_table(table_oid)
      where not pg_catalog.has_table_privilege(
          'farmos_core_projection_command_transaction', table_oid, 'SELECT'
        )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V023';
  end if;
  if exists (
      select 1 from pg_catalog.unnest(array[
        pg_catalog.to_regclass('ai.operational_memory_source_snapshots'),
        pg_catalog.to_regclass('ai.operational_memory_snapshot_state_events'),
        projection_table,
        event_table,
        pg_catalog.to_regclass('ai.operational_memory_projection_lineage'),
        review_table,
        receipt_table
      ]::oid[]) as protected_table(table_oid)
      where pg_catalog.has_table_privilege(
          'farmos_core_projection_command_transaction', table_oid,
          'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
        )
    )
    or pg_catalog.has_table_privilege(
      'farmos_core_projection_command_transaction',
      'ai.operational_memory_projection_command_receipts', 'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'farmos_core_projection_command_transaction',
      'ai.operational_memory_projection_state_events', 'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'farmos_core_projection_command_transaction',
      'ai.operational_memory_daily_projections',
      'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V024';
  end if;
  if exists (
      select 1 from pg_catalog.unnest(array[
        pg_catalog.to_regclass('ai.operational_memory_source_snapshots'),
        pg_catalog.to_regclass('ai.operational_memory_snapshot_state_events'),
        projection_table,
        event_table,
        pg_catalog.to_regclass('ai.operational_memory_projection_lineage'),
        review_table,
        receipt_table
      ]::oid[]) as protected_table(table_oid)
      where pg_catalog.has_any_column_privilege(
        'farmos_core_projection_command_transaction', table_oid,
        'INSERT,UPDATE,REFERENCES'
      )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V025';
  end if;
  if not pg_catalog.has_function_privilege(
      'farmos_core_projection_command_transaction',
      'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)',
      'EXECUTE'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V027';
  end if;
  if pg_catalog.has_function_privilege(
      'farmos_core_projection_command_transaction',
      'ai.enforce_operational_memory_projection_command_receipt_binding()',
      'EXECUTE'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V028';
  end if;

  if exists (
      select 1 from pg_catalog.pg_class as class_row
      where class_row.relnamespace = pg_catalog.to_regnamespace('ai')
        and case
          when class_row.relkind = 'S' then
            pg_catalog.has_sequence_privilege(
              'farmos_core_projection_command_transaction', class_row.oid,
              'USAGE,SELECT,UPDATE'
            )
          else false
        end
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V026';
  end if;
  if exists (
      select 1 from pg_catalog.pg_roles as denied_role
      where denied_role.rolname in ('anon', 'authenticated')
        and (
          pg_catalog.has_function_privilege(
            denied_role.rolname,
            'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)',
            'EXECUTE'
          ) or pg_catalog.has_table_privilege(
            denied_role.rolname,
            'ai.operational_memory_projection_review_decisions',
            'SELECT,INSERT,UPDATE,DELETE'
          ) or pg_catalog.has_table_privilege(
            denied_role.rolname,
            'ai.operational_memory_projection_command_receipts',
            'SELECT,INSERT,UPDATE,DELETE'
          )
        )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V029';
  end if;
  if exists (
      select 1 from pg_catalog.pg_class as class_row
      cross join lateral pg_catalog.aclexplode(class_row.relacl) as acl
      where acl.grantee = transaction_role
        and not (
          class_row.oid in (
            pg_catalog.to_regclass('ai.operational_memory_source_snapshots'),
            pg_catalog.to_regclass('ai.operational_memory_snapshot_state_events'),
            projection_table, event_table,
            pg_catalog.to_regclass('ai.operational_memory_projection_lineage'),
            review_table, receipt_table
          ) and acl.privilege_type = 'SELECT'
            and not acl.is_grantable
        )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V030';
  end if;
  if exists (
      select 1 from pg_catalog.pg_attribute as attribute_row
      cross join lateral pg_catalog.aclexplode(attribute_row.attacl) as acl
      where acl.grantee = transaction_role
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V031';
  end if;
  if exists (
      select 1 from pg_catalog.pg_proc as procedure_row
      cross join lateral pg_catalog.aclexplode(procedure_row.proacl) as acl
      where acl.grantee = transaction_role
        and not (
          procedure_row.oid = writer
          and acl.privilege_type = 'EXECUTE'
          and not acl.is_grantable
        )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V032';
  end if;
  if exists (
      select 1 from pg_catalog.pg_namespace as namespace_row
      cross join lateral pg_catalog.aclexplode(namespace_row.nspacl) as acl
      where acl.grantee = transaction_role
        and not (
          namespace_row.oid = pg_catalog.to_regnamespace('ai')
          and acl.privilege_type = 'USAGE'
          and not acl.is_grantable
        )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V033';
  end if;
  if exists (
      select 1 from pg_catalog.pg_database as database_row
      cross join lateral pg_catalog.aclexplode(database_row.datacl) as acl
      where acl.grantee = transaction_role
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V034';
  end if;
  if exists (
      select 1 from pg_catalog.pg_default_acl as default_acl
      cross join lateral pg_catalog.aclexplode(default_acl.defaclacl) as acl
      where acl.grantee = transaction_role
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V035';
  end if;
  if exists (
      select 1 from pg_catalog.pg_class as class_row
      cross join lateral pg_catalog.aclexplode(class_row.relacl) as acl
      where class_row.oid in (review_table, receipt_table)
        and acl.grantee <> class_row.relowner
        and not (
          acl.grantee = transaction_role
          and acl.privilege_type = 'SELECT'
          and not acl.is_grantable
        )
    )
    or exists (
      select 1 from pg_catalog.pg_attribute as attribute_row
      cross join lateral pg_catalog.aclexplode(attribute_row.attacl) as acl
      where attribute_row.attrelid in (review_table, receipt_table)
    )
    or exists (
      select 1 from pg_catalog.pg_proc as procedure_row
      cross join lateral pg_catalog.aclexplode(procedure_row.proacl) as acl
      where procedure_row.oid in (
        writer, append_only, review_guard, receipt_guard, receipt_required
      ) and acl.grantee <> procedure_row.proowner
        and not (
          procedure_row.oid = writer
          and acl.grantee = transaction_role
          and acl.privilege_type = 'EXECUTE'
          and not acl.is_grantable
        )
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V036';
  end if;

  if exists (
      select 1
      from pg_catalog.pg_class as class_row
      cross join lateral pg_catalog.aclexplode(coalesce(
        class_row.relacl,
        pg_catalog.acldefault('r', class_row.relowner)
      )) as acl
      where class_row.oid in (
        projection_table, event_table,
        pg_catalog.to_regclass('ai.operational_memory_projection_lineage'),
        review_table, receipt_table
      )
        and acl.grantee = 0
        and acl.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V037';
  end if;
  if exists (
      select 1
      from pg_catalog.pg_proc as procedure_row
      cross join lateral pg_catalog.aclexplode(coalesce(
        procedure_row.proacl,
        pg_catalog.acldefault('f', procedure_row.proowner)
      )) as acl
      where procedure_row.oid = writer
        and acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    )
  then
    raise exception using errcode = 'P0001',
      message = 'day149_verify_failed:V038';
  end if;
end
$day149_verify$;

rollback;
