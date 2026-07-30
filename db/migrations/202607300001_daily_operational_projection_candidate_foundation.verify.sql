begin transaction read only;

do $day147_a1_prepare_verify$
declare
  ai_schema oid := pg_catalog.to_regnamespace('ai');
  migration_history_table oid :=
    pg_catalog.to_regclass('core_schema.migration_history');
  projection_events_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_projection_state_events');
  projections_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_daily_projections');
  append_only_function oid := pg_catalog.to_regprocedure(
    'ai.reject_operational_memory_immutable_mutation()'
  );
  status_attribute smallint;
  status_not_null boolean;
  status_check_count integer;
  status_check_definition text;
  status_check_validated boolean;
  noninternal_trigger_count integer;
  unexpected_trigger_count integer;
  constraint_trigger_count integer;
  partial_unique_index_count integer;
  valid_partial_unique_index_count integer;
begin
  if ai_schema is null
    or migration_history_table is null
    or projection_events_table is null
    or projections_table is null
    or append_only_function is null
  then
    raise exception
      'daily_operational_projection_candidate_prepare_verification_failed';
  end if;

  if not exists (
    select 1
    from core_schema.migration_history as history
    where history.migration_id =
      '202607300001_daily_operational_projection_candidate_foundation'
      and history.sequence = 202607300001
      and history.checksum =
        'sha256:350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf'
  ) then
    raise exception
      'daily_operational_projection_candidate_prepare_verification_failed';
  end if;

  select attribute.attnum, attribute.attnotnull
  into status_attribute, status_not_null
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = projection_events_table
    and attribute.attname = 'status'
    and not attribute.attisdropped;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.min(
      pg_catalog.regexp_replace(
        pg_catalog.pg_get_constraintdef(constraint_row.oid, false),
        '[[:space:]]+',
        '',
        'g'
      )
    ),
    pg_catalog.bool_and(constraint_row.convalidated)
  into
    status_check_count,
    status_check_definition,
    status_check_validated
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = projection_events_table
    and constraint_row.contype = 'c'
    and constraint_row.conkey =
      pg_catalog.array_append(array[]::smallint[], status_attribute);

  if status_attribute is null
    or status_not_null is not true
    or status_check_count <> 1
    or status_check_validated is not true
    or status_check_definition <>
      'CHECK((status=ANY(ARRAY[''candidate''::text,''active''::text,''rejected''::text,''superseded''::text,''failed''::text])))'
    or exists (
      select 1
      from pg_catalog.pg_constraint as constraint_row
      where constraint_row.conrelid = projection_events_table
        and constraint_row.contype = 'c'
        and pg_catalog.regexp_replace(
          pg_catalog.pg_get_constraintdef(constraint_row.oid, false),
          '[[:space:]]+',
          '',
          'g'
        ) =
          'CHECK((status=ANY(ARRAY[''active''::text,''superseded''::text,''failed''::text])))'
    )
    or exists (
      select 1
      from ai.operational_memory_projection_state_events as event
      where event.status not in (
        'candidate',
        'active',
        'rejected',
        'superseded',
        'failed'
      )
    )
  then
    raise exception
      'daily_operational_projection_candidate_prepare_verification_failed';
  end if;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(*) filter (
      where trigger_row.tgname <>
          'operational_memory_projection_state_events_append_only'
        or trigger_row.tgenabled <> 'O'
        or trigger_row.tgtype <> 27
        or trigger_row.tgfoid <> append_only_function
        or trigger_row.tgconstraint <> 0
        or trigger_row.tgdeferrable
        or trigger_row.tginitdeferred
    )::integer
  into noninternal_trigger_count, unexpected_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = projection_events_table
    and not trigger_row.tgisinternal;

  select pg_catalog.count(*)::integer
  into constraint_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  left join pg_catalog.pg_constraint as trigger_constraint
    on trigger_constraint.oid = trigger_row.tgconstraint
  where trigger_row.tgrelid = projection_events_table
    and not trigger_row.tgisinternal
    and (
      trigger_row.tgconstraint <> 0
      or trigger_constraint.oid is not null
      or trigger_row.tgdeferrable
      or trigger_row.tginitdeferred
    );

  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(*) filter (
      where index_row.indisvalid
    )::integer
  into partial_unique_index_count, valid_partial_unique_index_count
  from pg_catalog.pg_index as index_row
  where index_row.indrelid = projection_events_table
    and index_row.indisunique
    and index_row.indpred is not null;

  if noninternal_trigger_count <> 1
    or unexpected_trigger_count <> 0
    or constraint_trigger_count <> 0
    or partial_unique_index_count <> 0
    or valid_partial_unique_index_count <> 0
    or not exists (
      select 1
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = projection_events_table
        and trigger_row.tgname =
          'operational_memory_projection_state_events_append_only'
        and trigger_row.tgenabled = 'O'
        and trigger_row.tgtype = 27
        and trigger_row.tgfoid = append_only_function
        and trigger_row.tgconstraint = 0
        and not trigger_row.tgdeferrable
        and not trigger_row.tginitdeferred
        and not trigger_row.tgisinternal
    )
  then
    raise exception
      'daily_operational_projection_candidate_prepare_verification_failed';
  end if;

  if pg_catalog.to_regprocedure(
    'ai.enforce_operational_memory_projection_state_transition()'
  ) is not null
    or pg_catalog.to_regprocedure(
      'ai.require_operational_memory_initial_candidate_event()'
    ) is not null
    or exists (
      select 1
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = projection_events_table
        and trigger_row.tgname =
          'operational_memory_projection_state_transition_guard'
        and not trigger_row.tgisinternal
    )
    or exists (
      select 1
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = projections_table
        and trigger_row.tgname =
          'operational_memory_projection_initial_candidate_guard'
        and not trigger_row.tgisinternal
    )
  then
    raise exception
      'daily_operational_projection_candidate_prepare_verification_failed';
  end if;

  if pg_catalog.has_table_privilege(
    'public',
    'ai.operational_memory_projection_state_events',
    'INSERT'
  )
    or pg_catalog.has_table_privilege(
      'public',
      'ai.operational_memory_projection_state_events',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'public',
      'ai.operational_memory_projection_state_events',
      'DELETE'
    )
    or pg_catalog.has_table_privilege(
      'public',
      'ai.operational_memory_daily_projections',
      'INSERT'
    )
    or pg_catalog.has_table_privilege(
      'public',
      'ai.operational_memory_daily_projections',
      'UPDATE'
    )
    or pg_catalog.has_table_privilege(
      'public',
      'ai.operational_memory_daily_projections',
      'DELETE'
    )
  then
    raise exception
      'daily_operational_projection_candidate_prepare_verification_failed';
  end if;
end
$day147_a1_prepare_verify$;

select
  'compatibility_prepare'::text as deployment_mode,
  true as exact_five_state_check,
  false as candidate_first_enforced,
  true as day146_writer_compatible,
  false as transition_trigger_created,
  false as initial_candidate_constraint_created,
  0::integer as partial_unique_indexes_created,
  true as append_only_preserved,
  true as public_mutation_denied,
  true as no_state_backfill;

rollback;
