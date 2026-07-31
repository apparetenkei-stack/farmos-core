-- FarmOS Core immutable forward-only migration.
-- Never run automatically at process startup.
-- Day147-A1-ACTIVATE enforces Candidate-first Projection state persistence.
begin;

do $day147_a1_activate_preflight$
declare
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
  append_only_trigger_count integer;
begin
  if projection_events_table is null
    or projections_table is null
    or append_only_function is null
  then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_activation_schema_unexpected';
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

  select pg_catalog.count(*)::integer
  into append_only_trigger_count
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
    and not trigger_row.tgisinternal;

  if status_attribute is null
    or status_not_null is not true
    or status_check_count <> 1
    or status_check_validated is not true
    or status_check_definition <>
      'CHECK((status=ANY(ARRAY[''candidate''::text,''active''::text,''rejected''::text,''superseded''::text,''failed''::text])))'
    or append_only_trigger_count <> 1
  then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_activation_schema_unexpected';
  end if;
end
$day147_a1_activate_preflight$;

create unique index
  uq_operational_memory_projection_initial_candidate
on ai.operational_memory_projection_state_events (projection_id)
where status = 'candidate';

create unique index
  uq_operational_memory_projection_candidate_resolution
on ai.operational_memory_projection_state_events (projection_id)
where status in ('active', 'rejected', 'failed');

create unique index
  uq_operational_memory_projection_superseded
on ai.operational_memory_projection_state_events (projection_id)
where status = 'superseded';

create function ai.enforce_operational_memory_projection_state_transition()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $day147_a1_activate_transition$
declare
  projection_business_date date;
  projection_type text;
  previous_status text;
  previous_sequence bigint;
  allowed_transition boolean := false;
begin
  select projection.business_date, projection.projection_type
  into projection_business_date, projection_type
  from ai.operational_memory_daily_projections as projection
  where projection.projection_id = new.projection_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'operational_memory_projection_binding_missing';
  end if;

  -- The two-key transaction lock is database-local. The date key prevents
  -- cross-date concentration; hashtext can only cause safe false contention
  -- if two Projection types collide in its 32-bit output.
  perform pg_catalog.pg_advisory_xact_lock(
    (projection_business_date - date '2000-01-01')::integer,
    pg_catalog.hashtext(
      'farmos:a1:projection-scope:' || projection_type
    )
  );

  -- VOLATILE SQL functions obtain a fresh snapshot for each contained query.
  -- Under READ COMMITTED this query therefore observes a conflicting event
  -- committed while the transaction waited for the scope lock.
  select event.status, event.event_sequence
  into previous_status, previous_sequence
  from ai.operational_memory_projection_state_events as event
  where event.projection_id = new.projection_id
  order by event.event_sequence desc
  limit 1;

  if new.event_sequence is null
    or new.event_sequence < 1
    or (
      previous_sequence is not null
      and new.event_sequence <= previous_sequence
    )
  then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_event_sequence_invalid';
  end if;

  allowed_transition := case
    when previous_status is null then
      new.status = 'candidate'
    when previous_status = 'candidate' then
      new.status = any(array['active', 'rejected', 'failed']::text[])
    when previous_status = 'active' then
      new.status = 'superseded'
    else false
  end;

  if allowed_transition is not true then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_state_transition_invalid';
  end if;

  if new.status = 'active'
    and exists (
      select 1
      from ai.operational_memory_daily_projections as other_projection
      join lateral (
        select other_event.status
        from ai.operational_memory_projection_state_events as other_event
        where other_event.projection_id = other_projection.projection_id
        order by other_event.event_sequence desc
        limit 1
      ) as latest_state on true
      where other_projection.business_date = projection_business_date
        and other_projection.projection_type = projection_type
        and other_projection.projection_id <> new.projection_id
        and latest_state.status = 'active'
    )
  then
    raise exception using
      errcode = '23505',
      message = 'operational_memory_projection_active_scope_conflict';
  end if;

  return new;
end
$day147_a1_activate_transition$;

create trigger operational_memory_projection_state_transition_guard
before insert on ai.operational_memory_projection_state_events
for each row
execute function ai.enforce_operational_memory_projection_state_transition();

create function ai.require_operational_memory_initial_candidate_event()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $day147_a1_activate_initial_candidate$
declare
  event_count bigint;
  initial_status text;
begin
  select pg_catalog.count(*)
  into event_count
  from ai.operational_memory_projection_state_events as event
  where event.projection_id = new.projection_id;

  select event.status
  into initial_status
  from ai.operational_memory_projection_state_events as event
  where event.projection_id = new.projection_id
  order by event.event_sequence
  limit 1;

  if event_count < 1 or initial_status is distinct from 'candidate' then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_initial_candidate_required';
  end if;

  return new;
end
$day147_a1_activate_initial_candidate$;

create constraint trigger operational_memory_projection_initial_candidate_guard
after insert on ai.operational_memory_daily_projections
deferrable initially deferred
for each row
execute function ai.require_operational_memory_initial_candidate_event();

do $day147_a1_activate_function_owners$
declare
  projection_events_owner name;
  projections_owner name;
begin
  select pg_catalog.pg_get_userbyid(class_row.relowner)
  into projection_events_owner
  from pg_catalog.pg_class as class_row
  where class_row.oid =
    pg_catalog.to_regclass('ai.operational_memory_projection_state_events');

  select pg_catalog.pg_get_userbyid(class_row.relowner)
  into projections_owner
  from pg_catalog.pg_class as class_row
  where class_row.oid =
    pg_catalog.to_regclass('ai.operational_memory_daily_projections');

  if projection_events_owner is null or projections_owner is null then
    raise exception using
      errcode = '23514',
      message = 'operational_memory_projection_function_owner_missing';
  end if;

  execute pg_catalog.format(
    'alter function '
    || 'ai.enforce_operational_memory_projection_state_transition() '
    || 'owner to %I',
    projection_events_owner
  );
  execute pg_catalog.format(
    'alter function '
    || 'ai.require_operational_memory_initial_candidate_event() '
    || 'owner to %I',
    projections_owner
  );
end
$day147_a1_activate_function_owners$;

revoke all on function
  ai.enforce_operational_memory_projection_state_transition()
from public;
revoke all on function
  ai.require_operational_memory_initial_candidate_event()
from public;

do $day147_a1_activate_role_privileges$
begin
  if pg_catalog.to_regrole('anon') is not null then
    execute
      'revoke all on function '
      || 'ai.enforce_operational_memory_projection_state_transition() '
      || 'from anon';
    execute
      'revoke all on function '
      || 'ai.require_operational_memory_initial_candidate_event() '
      || 'from anon';
  end if;

  if pg_catalog.to_regrole('authenticated') is not null then
    execute
      'revoke all on function '
      || 'ai.enforce_operational_memory_projection_state_transition() '
      || 'from authenticated';
    execute
      'revoke all on function '
      || 'ai.require_operational_memory_initial_candidate_event() '
      || 'from authenticated';
  end if;
end
$day147_a1_activate_role_privileges$;

commit;
