begin transaction read only;

do $day147_a1_activate_verify$
declare
  migration_history_table oid :=
    pg_catalog.to_regclass('core_schema.migration_history');
  projection_events_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_projection_state_events');
  projections_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_daily_projections');
  append_only_function oid := pg_catalog.to_regprocedure(
    'ai.reject_operational_memory_immutable_mutation()'
  );
  transition_function oid := pg_catalog.to_regprocedure(
    'ai.enforce_operational_memory_projection_state_transition()'
  );
  initial_candidate_function oid := pg_catalog.to_regprocedure(
    'ai.require_operational_memory_initial_candidate_event()'
  );
  anon_role oid := pg_catalog.to_regrole('anon');
  authenticated_role oid := pg_catalog.to_regrole('authenticated');
  status_attribute smallint;
  status_not_null boolean;
  projection_id_attribute smallint;
  status_check_count integer;
  status_check_definition text;
  status_check_validated boolean;
  transition_definition text;
  compact_transition_definition text;
  transition_binding_position integer;
  transition_lock_position integer;
  transition_previous_state_position integer;
  transition_decision_position integer;
  transition_invalid_raise_position integer;
  transition_active_branch_position integer;
  transition_active_conflict_position integer;
  transition_return_position integer;
  initial_candidate_definition text;
  compact_initial_candidate_definition text;
  transition_trigger_count integer;
  initial_candidate_trigger_count integer;
  append_only_trigger_count integer;
  expected_lifecycle_index_count integer;
  partial_unique_index_count integer;
begin
  if migration_history_table is null
    or projection_events_table is null
    or projections_table is null
    or append_only_function is null
    or transition_function is null
    or initial_candidate_function is null
  then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;

  if not exists (
    select 1
    from core_schema.migration_history as history
    where history.migration_id =
      '202607310001_daily_operational_projection_candidate_activation'
      and history.sequence = 202607310001
      and history.checksum =
        'sha256:ab88f3c33d4befc340e75a105f5c76ee0ba590aa8c65043e863dded6c352774a'
  ) then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;

  select attribute.attnum, attribute.attnotnull
  into status_attribute, status_not_null
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = projection_events_table
    and attribute.attname = 'status'
    and not attribute.attisdropped;

  select attribute.attnum
  into projection_id_attribute
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = projection_events_table
    and attribute.attname = 'projection_id'
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
    or projection_id_attribute is null
    or status_check_count <> 1
    or status_check_validated is not true
    or status_check_definition <>
      'CHECK((status=ANY(ARRAY[''candidate''::text,''active''::text,''rejected''::text,''superseded''::text,''failed''::text])))'
  then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;

  select pg_catalog.pg_get_functiondef(procedure_row.oid)
  into transition_definition
  from pg_catalog.pg_proc as procedure_row
  where procedure_row.oid = transition_function
    and procedure_row.prokind = 'f'
    and procedure_row.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    and procedure_row.pronargs = 0
    and not procedure_row.prosecdef
    and procedure_row.provolatile = 'v'
    and procedure_row.proconfig =
      array['search_path=pg_catalog']::text[];

  select pg_catalog.pg_get_functiondef(procedure_row.oid)
  into initial_candidate_definition
  from pg_catalog.pg_proc as procedure_row
  where procedure_row.oid = initial_candidate_function
    and procedure_row.prokind = 'f'
    and procedure_row.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    and procedure_row.pronargs = 0
    and not procedure_row.prosecdef
    and procedure_row.provolatile = 'v'
    and procedure_row.proconfig =
      array['search_path=pg_catalog']::text[];

  compact_transition_definition := pg_catalog.lower(
    pg_catalog.regexp_replace(
      transition_definition,
      '[[:space:]]+',
      '',
      'g'
    )
  );
  compact_initial_candidate_definition := pg_catalog.lower(
    pg_catalog.regexp_replace(
      initial_candidate_definition,
      '[[:space:]]+',
      '',
      'g'
    )
  );

  transition_binding_position := pg_catalog.strpos(
    compact_transition_definition,
    'selectprojection.business_date,projection.projection_type'
  );
  transition_lock_position := pg_catalog.strpos(
    compact_transition_definition,
    'performpg_catalog.pg_advisory_xact_lock('
  );
  transition_previous_state_position := pg_catalog.strpos(
    compact_transition_definition,
    'selectevent.status,event.event_sequenceintoprevious_status,previous_sequence'
  );
  transition_decision_position := pg_catalog.strpos(
    compact_transition_definition,
    'allowed_transition:=case'
  );
  transition_invalid_raise_position := pg_catalog.strpos(
    compact_transition_definition,
    'ifallowed_transitionisnottruethenraiseexceptionusing'
    || 'errcode=''23514'','
    || 'message=''operational_memory_projection_state_transition_invalid'';'
  );
  transition_active_branch_position := pg_catalog.strpos(
    compact_transition_definition,
    'ifnew.status=''active''andexists('
  );
  transition_active_conflict_position := pg_catalog.strpos(
    compact_transition_definition,
    'select1fromai.operational_memory_daily_projectionsasother_projection'
  );
  transition_return_position := pg_catalog.strpos(
    compact_transition_definition,
    'returnnew;'
  );

  if transition_definition is null
    or initial_candidate_definition is null
    or pg_catalog.strpos(
      compact_transition_definition,
      'fromai.operational_memory_daily_projectionsasprojection'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'fromai.operational_memory_projection_state_eventsasevent'
    ) = 0
    or transition_binding_position = 0
    or transition_lock_position = 0
    or transition_previous_state_position = 0
    or transition_decision_position = 0
    or transition_invalid_raise_position = 0
    or transition_active_branch_position = 0
    or transition_active_conflict_position = 0
    or transition_return_position = 0
    or transition_binding_position >= transition_lock_position
    or transition_lock_position >= transition_previous_state_position
    or transition_previous_state_position >= transition_decision_position
    or transition_decision_position >= transition_active_conflict_position
    or transition_decision_position >= transition_invalid_raise_position
    or transition_invalid_raise_position >= transition_active_conflict_position
    or transition_active_branch_position >= transition_active_conflict_position
    or transition_lock_position >= transition_active_conflict_position
    or transition_active_conflict_position >= transition_return_position
    or pg_catalog.strpos(
      compact_transition_definition,
      'projection_business_date-date''2000-01-01'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'pg_catalog.hashtext'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'whenprevious_statusisnullthennew.status=''candidate'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'whenprevious_status=''candidate''thennew.status=any(array['
      || '''active'',''rejected'',''failed'']::text[])'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'whenprevious_status=''active''thennew.status=''superseded'''
    ) = 0
    or (
      pg_catalog.length(compact_transition_definition)
      - pg_catalog.length(
        pg_catalog.replace(
          compact_transition_definition,
          'whenprevious_status',
          ''
        )
      )
    ) / pg_catalog.length('whenprevious_status') <> 3
    or pg_catalog.strpos(
      compact_transition_definition,
      'previous_status=''rejected'''
    ) > 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'previous_status=''failed'''
    ) > 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'previous_status=''superseded'''
    ) > 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'new.event_sequence<1'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'new.event_sequence<=previous_sequence'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'orderbyevent.event_sequencedesclimit1'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'other_projection.business_date=projection_business_date'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'other_projection.projection_type=projection_type'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'latest_state.status=''active'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'orderbyother_event.event_sequencedesclimit1'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'joinlateral(selectother_event.statusfromai.operational_memory_projection_state_eventsasother_event'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'other_projection.projection_id<>new.projection_id'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'errcode=''23505'',message=''operational_memory_projection_active_scope_conflict'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'errcode=''23503'',message=''operational_memory_projection_binding_missing'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'errcode=''23514'',message=''operational_memory_projection_event_sequence_invalid'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'errcode=''23514'',message=''operational_memory_projection_state_transition_invalid'''
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'ifallowed_transitionisnottruethenraiseexceptionusingerrcode=''23514'',message=''operational_memory_projection_state_transition_invalid'';endif;'
    ) = 0
    or (
      pg_catalog.length(compact_transition_definition)
      - pg_catalog.length(
        pg_catalog.replace(compact_transition_definition, 'returnnew;', '')
      )
    ) / pg_catalog.length('returnnew;') <> 1
    or pg_catalog.strpos(compact_transition_definition, 'returnnull;') > 0
    or pg_catalog.strpos(compact_transition_definition, 'returnold;') > 0
    or (
      pg_catalog.length(compact_transition_definition)
      - pg_catalog.length(
        pg_catalog.replace(compact_transition_definition, 'allowed_transition:=', '')
      )
    ) / pg_catalog.length('allowed_transition:=') <> 1
    or pg_catalog.strpos(
      compact_transition_definition,
      'allowed_transition='
    ) > 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'allowed_transition:=case'
    ) = 0
    or pg_catalog.strpos(
      compact_transition_definition,
      'allowed_transitionboolean:=false;'
    ) = 0
    or pg_catalog.strpos(
      compact_initial_candidate_definition,
      'fromai.operational_memory_projection_state_eventsasevent'
    ) = 0
    or pg_catalog.strpos(
      compact_initial_candidate_definition,
      'event.projection_id=new.projection_id'
    ) = 0
    or pg_catalog.strpos(
      compact_initial_candidate_definition,
      'event_count<1'
    ) = 0
    or pg_catalog.strpos(
      compact_initial_candidate_definition,
      'initial_statusisdistinctfrom''candidate'''
    ) = 0
    or pg_catalog.strpos(
      compact_initial_candidate_definition,
      'operational_memory_projection_initial_candidate_required'
    ) = 0
  then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;

  select pg_catalog.count(*)::integer
  into transition_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = projection_events_table
    and trigger_row.tgname =
      'operational_memory_projection_state_transition_guard'
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 7
    and trigger_row.tgfoid = transition_function
    and trigger_row.tgconstraint = 0
    and not trigger_row.tgdeferrable
    and not trigger_row.tginitdeferred
    and not trigger_row.tgisinternal;

  select pg_catalog.count(*)::integer
  into initial_candidate_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  join pg_catalog.pg_constraint as trigger_constraint
    on trigger_constraint.oid = trigger_row.tgconstraint
  where trigger_row.tgrelid = projections_table
    and trigger_row.tgname =
      'operational_memory_projection_initial_candidate_guard'
    and trigger_row.tgenabled = 'O'
    and trigger_row.tgtype = 5
    and trigger_row.tgfoid = initial_candidate_function
    and trigger_row.tgconstraint <> 0
    and trigger_row.tgdeferrable
    and trigger_row.tginitdeferred
    and trigger_constraint.contype = 't'
    and trigger_constraint.condeferrable
    and trigger_constraint.condeferred
    and not trigger_row.tgisinternal;

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

  if transition_trigger_count <> 1
    or initial_candidate_trigger_count <> 1
    or append_only_trigger_count <> 1
    or (
      select pg_catalog.count(*)
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = projection_events_table
        and not trigger_row.tgisinternal
        and (trigger_row.tgtype & 4) = 4
        and (trigger_row.tgtype & 1) = 1
        and (trigger_row.tgtype & 2) = 2
    ) <> 1
    or (
      select pg_catalog.count(*)
      from pg_catalog.pg_trigger as trigger_row
      where trigger_row.tgrelid = projection_events_table
        and not trigger_row.tgisinternal
        and (trigger_row.tgtype & 8) = 8
        and (trigger_row.tgtype & 16) = 16
        and (trigger_row.tgtype & 1) = 1
        and (trigger_row.tgtype & 2) = 2
    ) <> 1
  then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;

  with expected(index_name, predicate_definition) as (
    values
      (
        'uq_operational_memory_projection_initial_candidate'::name,
        '(status = ''candidate''::text)'::text
      ),
      (
        'uq_operational_memory_projection_candidate_resolution'::name,
        '(status = ANY (ARRAY[''active''::text, ''rejected''::text, ''failed''::text]))'::text
      ),
      (
        'uq_operational_memory_projection_superseded'::name,
        '(status = ''superseded''::text)'::text
      )
  )
  select pg_catalog.count(*)::integer
  into expected_lifecycle_index_count
  from expected
  join pg_catalog.pg_class as index_class
    on index_class.relname = expected.index_name
  join pg_catalog.pg_index as index_row
    on index_row.indexrelid = index_class.oid
  where index_class.relnamespace = pg_catalog.to_regnamespace('ai')
    and index_row.indrelid = projection_events_table
    and index_row.indisunique
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 1
    and index_row.indnatts = 1
    and index_row.indkey[0] = projection_id_attribute
    and index_row.indpred is not null
    and pg_catalog.pg_get_expr(
      index_row.indpred,
      index_row.indrelid,
      false
    ) = expected.predicate_definition;

  select pg_catalog.count(*)::integer
  into partial_unique_index_count
  from pg_catalog.pg_index as index_row
  where index_row.indrelid = projection_events_table
    and index_row.indisunique
    and index_row.indpred is not null;

  if expected_lifecycle_index_count <> 3
    or partial_unique_index_count <> 3
    or exists (
      select 1
      from pg_catalog.pg_index as index_row
      join pg_catalog.pg_class as index_class
        on index_class.oid = index_row.indexrelid
      where index_class.relnamespace = pg_catalog.to_regnamespace('ai')
        and index_row.indisunique
        and pg_catalog.pg_get_indexdef(index_row.indexrelid) ~*
          'business_date.*candidate|candidate.*business_date'
    )
  then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;

  if pg_catalog.has_function_privilege(
    'public',
    transition_function,
    'EXECUTE'
  )
    or pg_catalog.has_function_privilege(
      'public',
      initial_candidate_function,
      'EXECUTE'
    )
    or (
      anon_role is not null
      and (
        pg_catalog.has_function_privilege(
          anon_role,
          transition_function,
          'EXECUTE'
        )
        or pg_catalog.has_function_privilege(
          anon_role,
          initial_candidate_function,
          'EXECUTE'
        )
      )
    )
    or (
      authenticated_role is not null
      and (
        pg_catalog.has_function_privilege(
          authenticated_role,
          transition_function,
          'EXECUTE'
        )
        or pg_catalog.has_function_privilege(
          authenticated_role,
          initial_candidate_function,
          'EXECUTE'
        )
      )
    )
    or (
      select procedure_row.proowner
      from pg_catalog.pg_proc as procedure_row
      where procedure_row.oid = transition_function
    ) is distinct from (
      select class_row.relowner
      from pg_catalog.pg_class as class_row
      where class_row.oid = projection_events_table
    )
    or (
      select procedure_row.proowner
      from pg_catalog.pg_proc as procedure_row
      where procedure_row.oid = initial_candidate_function
    ) is distinct from (
      select class_row.relowner
      from pg_catalog.pg_class as class_row
      where class_row.oid = projections_table
    )
    or pg_catalog.has_table_privilege(
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
    or (
      anon_role is not null
      and (
        pg_catalog.has_table_privilege(
          anon_role,
          projection_events_table,
          'INSERT'
        )
        or pg_catalog.has_table_privilege(
          anon_role,
          projection_events_table,
          'UPDATE'
        )
        or pg_catalog.has_table_privilege(
          anon_role,
          projection_events_table,
          'DELETE'
        )
      )
    )
    or (
      authenticated_role is not null
      and (
        pg_catalog.has_table_privilege(
          authenticated_role,
          projection_events_table,
          'INSERT'
        )
        or pg_catalog.has_table_privilege(
          authenticated_role,
          projection_events_table,
          'UPDATE'
        )
        or pg_catalog.has_table_privilege(
          authenticated_role,
          projection_events_table,
          'DELETE'
        )
      )
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
    or (
      anon_role is not null
      and (
        pg_catalog.has_table_privilege(
          anon_role,
          projections_table,
          'INSERT'
        )
        or pg_catalog.has_table_privilege(
          anon_role,
          projections_table,
          'UPDATE'
        )
        or pg_catalog.has_table_privilege(
          anon_role,
          projections_table,
          'DELETE'
        )
      )
    )
    or (
      authenticated_role is not null
      and (
        pg_catalog.has_table_privilege(
          authenticated_role,
          projections_table,
          'INSERT'
        )
        or pg_catalog.has_table_privilege(
          authenticated_role,
          projections_table,
          'UPDATE'
        )
        or pg_catalog.has_table_privilege(
          authenticated_role,
          projections_table,
          'DELETE'
        )
      )
    )
  then
    raise exception
      'daily_operational_projection_candidate_activation_verification_failed';
  end if;
end
$day147_a1_activate_verify$;

select
  'candidate_first_activation'::text as deployment_mode,
  true as exact_five_state_check,
  true as transition_trigger_exact,
  true as initial_candidate_enforced,
  true as sequence_monotonic_enforced,
  true as lifecycle_uniqueness_enforced,
  true as same_date_multiple_candidates_allowed,
  true as active_scope_lock_enforced,
  true as duplicate_active_rejected,
  true as deferred_initial_candidate_enforced,
  true as append_only_preserved,
  true as public_anon_authenticated_execute_denied,
  true as public_anon_authenticated_table_dml_denied,
  true as no_legacy_rewrite;

rollback;
