-- FarmOS Core immutable forward-only migration.
-- Never run automatically at process startup.
-- Day147-A1-PREPARE expands storage compatibility without enforcing
-- Candidate-first transitions.
begin;

do $day147_a1_prepare_projection_state_check$
declare
  ai_schema oid := pg_catalog.to_regnamespace('ai');
  projection_events_table oid;
  status_attribute smallint;
  status_not_null boolean;
  status_check_count integer;
  old_constraint_name name;
  old_constraint_definition text;
  old_constraint_validated boolean;
begin
  if ai_schema is null then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_schema_missing';
  end if;

  select class_row.oid
  into projection_events_table
  from pg_catalog.pg_class as class_row
  where class_row.relnamespace = ai_schema
    and class_row.relname = 'operational_memory_projection_state_events'
    and class_row.relkind = 'r';

  if projection_events_table is null then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_state_events_table_missing';
  end if;

  select attribute.attnum, attribute.attnotnull
  into status_attribute, status_not_null
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = projection_events_table
    and attribute.attname = 'status'
    and not attribute.attisdropped;

  if status_attribute is null or status_not_null is not true then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_status_column_unexpected';
  end if;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.min(constraint_row.conname),
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
    old_constraint_name,
    old_constraint_definition,
    old_constraint_validated
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = projection_events_table
    and constraint_row.contype = 'c'
    and constraint_row.conkey =
      pg_catalog.array_append(array[]::smallint[], status_attribute);

  if status_check_count <> 1
    or old_constraint_validated is not true
    or old_constraint_definition <>
      'CHECK((status=ANY(ARRAY[''active''::text,''superseded''::text,''failed''::text])))'
  then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_status_constraint_unexpected';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint as constraint_row
    where constraint_row.conrelid = projection_events_table
      and constraint_row.conname =
        'operational_memory_projection_state_events_status_day147_check'
  ) then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_day147_constraint_name_conflict';
  end if;

  if exists (
    select 1
    from ai.operational_memory_projection_state_events as event
    where event.status not in (
      'candidate',
      'active',
      'rejected',
      'superseded',
      'failed'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_status_value_invalid';
  end if;

  execute '
    alter table ai.operational_memory_projection_state_events
      add constraint
        operational_memory_projection_state_events_status_day147_check
      check (
        status in (
          ''candidate'',
          ''active'',
          ''rejected'',
          ''superseded'',
          ''failed''
        )
      ) not valid
  ';

  execute '
    alter table ai.operational_memory_projection_state_events
      validate constraint
        operational_memory_projection_state_events_status_day147_check
  ';

  execute pg_catalog.format(
    'alter table ai.operational_memory_projection_state_events '
    || 'drop constraint %I',
    old_constraint_name
  );
end
$day147_a1_prepare_projection_state_check$;

commit;
