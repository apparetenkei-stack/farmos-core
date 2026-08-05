-- FarmOS Core immutable forward-only migration.
-- Never run automatically at process startup.
-- Day149 adds durable review decisions and atomic Projection command receipts.
begin;

do $day149_preflight$
declare
  projections_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_daily_projections');
  events_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_projection_state_events');
  lineage_table oid :=
    pg_catalog.to_regclass('ai.operational_memory_projection_lineage');
  protected_owner oid;
  transition_trigger_count integer;
  candidate_trigger_count integer;
begin
  if projections_table is null or events_table is null or lineage_table is null
    or pg_catalog.to_regprocedure(
      'ai.enforce_operational_memory_projection_state_transition()'
    ) is null
    or pg_catalog.to_regprocedure(
      'ai.require_operational_memory_initial_candidate_event()'
    ) is null
    or pg_catalog.to_regprocedure(
      'ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'
    ) is null
  then
    raise exception using errcode = '23514',
      message = 'operational_memory_projection_command_preflight_failed';
  end if;

  select class_row.relowner into protected_owner
  from pg_catalog.pg_class as class_row
  where class_row.oid = projections_table;
  if protected_owner is distinct from (
      select class_row.relowner from pg_catalog.pg_class as class_row
      where class_row.oid = events_table
    ) or protected_owner is distinct from (
      select class_row.relowner from pg_catalog.pg_class as class_row
      where class_row.oid = lineage_table
    ) or protected_owner is distinct from (
      select role_row.oid from pg_catalog.pg_roles as role_row
      where role_row.rolname = current_user
    )
  then
    raise exception using errcode = '42501',
      message = 'operational_memory_projection_command_owner_invalid';
  end if;

  select pg_catalog.count(*)::integer into transition_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = events_table
    and trigger_row.tgname =
      'operational_memory_projection_state_transition_guard'
    and trigger_row.tgenabled = 'O'
    and not trigger_row.tgisinternal;

  select pg_catalog.count(*)::integer into candidate_trigger_count
  from pg_catalog.pg_trigger as trigger_row
  where trigger_row.tgrelid = projections_table
    and trigger_row.tgname =
      'operational_memory_projection_initial_candidate_guard'
    and trigger_row.tgdeferrable
    and trigger_row.tginitdeferred
    and not trigger_row.tgisinternal;

  if transition_trigger_count <> 1 or candidate_trigger_count <> 1 then
    raise exception using errcode = '23514',
      message = 'operational_memory_projection_command_preflight_failed';
  end if;
end
$day149_preflight$;

do $day149_role$
declare
  transaction_role oid := pg_catalog.to_regrole(
    'farmos_core_projection_command_transaction'
  );
  role_row record;
begin
  if transaction_role is null then
    create role farmos_core_projection_command_transaction
      nologin nosuperuser nocreatedb nocreaterole noinherit noreplication
      nobypassrls;
  else
    select * into role_row from pg_catalog.pg_roles
    where oid = transaction_role;
    if role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
      or role_row.rolcreaterole or role_row.rolinherit
      or role_row.rolreplication or role_row.rolbypassrls
      or exists (
        select 1 from pg_catalog.pg_auth_members as membership
        where membership.roleid = transaction_role
          or membership.member = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_class as class_row
        where class_row.relowner = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_proc as procedure_row
        where procedure_row.proowner = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_namespace as namespace_row
        where namespace_row.nspowner = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_database as database_row
        where database_row.datdba = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_class as class_row
        cross join lateral pg_catalog.aclexplode(class_row.relacl) as acl
        where acl.grantee = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_attribute as attribute_row
        cross join lateral pg_catalog.aclexplode(attribute_row.attacl) as acl
        where acl.grantee = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_proc as procedure_row
        cross join lateral pg_catalog.aclexplode(procedure_row.proacl) as acl
        where acl.grantee = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_namespace as namespace_row
        cross join lateral pg_catalog.aclexplode(namespace_row.nspacl) as acl
        where acl.grantee = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_database as database_row
        cross join lateral pg_catalog.aclexplode(database_row.datacl) as acl
        where acl.grantee = transaction_role
      )
      or exists (
        select 1 from pg_catalog.pg_default_acl as default_acl
        cross join lateral pg_catalog.aclexplode(default_acl.defaclacl) as acl
        where acl.grantee = transaction_role
      )
    then
      raise exception using errcode = '42501',
        message = 'operational_memory_projection_command_role_invalid';
    end if;
  end if;
end
$day149_role$;

create table ai.operational_memory_projection_review_decisions (
  review_id text primary key,
  candidate_projection_id text not null,
  candidate_projection_version integer not null,
  candidate_state_sequence bigint not null,
  candidate_content_hash text not null,
  review_sequence bigint not null,
  decision text not null,
  reason text not null,
  reviewed_by text not null,
  reviewed_at timestamptz not null,
  command_id text not null unique,
  canonical_payload_hash text not null,
  constraint operational_memory_projection_review_decisions_review_id_check
    check (review_id ~ '^projection_review_[0-9a-f]{32}$'),
  constraint operational_memory_projection_review_decisions_version_check
    check (candidate_projection_version > 0),
  constraint om_projection_review_state_sequence_check
    check (candidate_state_sequence > 0),
  constraint om_projection_review_content_hash_check
    check (candidate_content_hash ~ '^[0-9a-f]{64}$'),
  constraint om_projection_review_sequence_check
    check (review_sequence > 0),
  constraint operational_memory_projection_review_decisions_decision_check
    check (decision in ('approve', 'reject', 'request_rebuild')),
  constraint operational_memory_projection_review_decisions_reason_check
    check (reason = pg_catalog.btrim(reason) and pg_catalog.length(reason) between 1 and 2000),
  constraint operational_memory_projection_review_decisions_actor_check
    check (reviewed_by ~ '^[A-Za-z0-9][A-Za-z0-9._:@-]{2,127}$'),
  constraint operational_memory_projection_review_decisions_command_id_check
    check (command_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  constraint om_projection_review_payload_hash_check
    check (canonical_payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint om_projection_review_candidate_seq_uq
    unique (candidate_projection_id, candidate_projection_version, review_sequence),
  constraint operational_memory_projection_review_decisions_projection_fkey
    foreign key (candidate_projection_id)
    references ai.operational_memory_daily_projections(projection_id)
    on update restrict on delete restrict
);

create table ai.operational_memory_projection_command_receipts (
  receipt_schema_version text not null,
  command_id text primary key,
  idempotency_key_hash text not null,
  command_type text not null,
  canonical_payload_hash text not null,
  result_status text not null,
  result_code text not null,
  result_payload jsonb not null,
  result_payload_hash text not null,
  requested_by text not null,
  requested_at timestamptz not null,
  committed_at timestamptz not null,
  review_decision_id text,
  affected_projection_id_1 text,
  committed_state_event_id_1 text,
  committed_state_event_sequence_1 bigint,
  affected_projection_id_2 text,
  committed_state_event_id_2 text,
  committed_state_event_sequence_2 bigint,
  constraint operational_memory_projection_command_receipts_schema_check
    check (receipt_schema_version = 'farmos.projection.command-receipt.v1'),
  constraint operational_memory_projection_command_receipts_command_id_check
    check (command_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$'),
  constraint om_projection_command_idempotency_hash_check
    check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint om_projection_command_idempotency_uq
    unique (idempotency_key_hash),
  constraint om_projection_command_type_check
    check (command_type in (
      'review_projection_candidate', 'promote_projection_candidate',
      'reject_projection_candidate', 'rebuild_projection_candidate'
    )),
  constraint om_projection_command_payload_hash_check
    check (canonical_payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint om_projection_command_result_status_check
    check (result_status in ('succeeded', 'rejected')),
  constraint om_projection_command_result_code_check
    check (result_code in (
      'review_recorded', 'projection_promoted', 'projection_rejected',
      'projection_rebuilt', 'candidate_not_found', 'candidate_not_candidate',
      'review_version_conflict', 'review_decision_missing',
      'review_decision_invalid', 'review_decision_stale', 'approval_missing',
      'approval_invalid', 'candidate_version_conflict', 'active_version_conflict',
      'active_identity_conflict', 'projection_key_mismatch',
      'multiple_active_conflict', 'invalid_state_transition', 'lineage_invalid',
      'content_hash_invalid', 'rebuild_input_unavailable', 'rebuild_input_stale',
      'rebuild_input_ambiguous', 'rebuild_input_invalid'
    )),
  constraint om_projection_command_result_payload_check
    check (
      pg_catalog.jsonb_typeof(result_payload) = 'object'
      and result_payload ?& array[
        'schema_version', 'command_id', 'command_type', 'outcome', 'result_code',
        'review_decision_id', 'affected_projection_ids',
        'committed_state_event_sequences'
      ]
      and result_payload - array[
        'schema_version', 'command_id', 'command_type', 'outcome', 'result_code',
        'review_decision_id', 'affected_projection_ids',
        'committed_state_event_sequences'
      ] = '{}'::jsonb
      and result_payload ->> 'schema_version' =
        'farmos.projection.command-result.v1'
      and result_payload ->> 'command_id' = command_id
      and result_payload ->> 'command_type' = command_type
      and result_payload ->> 'outcome' = result_status
      and result_payload ->> 'result_code' = result_code
      and pg_catalog.jsonb_typeof(result_payload -> 'affected_projection_ids') = 'array'
      and pg_catalog.jsonb_typeof(
        result_payload -> 'committed_state_event_sequences'
      ) = 'array'
      and pg_catalog.jsonb_array_length(
        result_payload -> 'affected_projection_ids'
      ) = pg_catalog.jsonb_array_length(
        result_payload -> 'committed_state_event_sequences'
      )
      and pg_catalog.jsonb_array_length(
        result_payload -> 'affected_projection_ids'
      ) between 0 and 2
    ),
  constraint om_projection_command_result_hash_check
    check (result_payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint operational_memory_projection_command_receipts_actor_check
    check (requested_by ~ '^[A-Za-z0-9][A-Za-z0-9._:@-]{2,127}$'),
  constraint om_projection_command_slot_pairing_check
    check (
      ((affected_projection_id_1 is null) = (committed_state_event_id_1 is null))
      and ((affected_projection_id_1 is null) =
        (committed_state_event_sequence_1 is null))
      and ((affected_projection_id_2 is null) = (committed_state_event_id_2 is null))
      and ((affected_projection_id_2 is null) =
        (committed_state_event_sequence_2 is null))
      and (affected_projection_id_2 is null or affected_projection_id_1 is not null)
    ),
  constraint operational_memory_projection_command_receipts_slot_order_check
    check (
      (committed_state_event_sequence_1 is null or committed_state_event_sequence_1 > 0)
      and (committed_state_event_sequence_2 is null or
        committed_state_event_sequence_2 > committed_state_event_sequence_1)
      and (affected_projection_id_2 is null or
        affected_projection_id_2 <> affected_projection_id_1)
      and (committed_state_event_id_2 is null or
        committed_state_event_id_2 <> committed_state_event_id_1)
    ),
  constraint operational_memory_projection_command_receipts_review_fkey
    foreign key (review_decision_id)
    references ai.operational_memory_projection_review_decisions(review_id)
    deferrable initially deferred,
  constraint om_projection_command_projection_1_fk
    foreign key (affected_projection_id_1)
    references ai.operational_memory_daily_projections(projection_id),
  constraint om_projection_command_projection_2_fk
    foreign key (affected_projection_id_2)
    references ai.operational_memory_daily_projections(projection_id),
  constraint om_projection_command_event_1_fk
    foreign key (committed_state_event_id_1)
    references ai.operational_memory_projection_state_events(event_id),
  constraint om_projection_command_event_2_fk
    foreign key (committed_state_event_id_2)
    references ai.operational_memory_projection_state_events(event_id)
);

alter table ai.operational_memory_projection_review_decisions
  add constraint operational_memory_projection_review_decisions_receipt_fkey
  foreign key (command_id)
  references ai.operational_memory_projection_command_receipts(command_id)
  deferrable initially deferred;

create index idx_operational_memory_projection_receipt_review
on ai.operational_memory_projection_command_receipts(review_decision_id)
where review_decision_id is not null;

create function ai.reject_operational_memory_projection_command_ledger_mutation()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $day149_append_only$
begin
  raise exception using errcode = '55000',
    message = 'operational_memory_projection_command_ledger_append_only';
end
$day149_append_only$;

create function ai.enforce_operational_memory_projection_review_binding()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $day149_review_binding$
declare
  projection_version integer;
  projection_hash text;
  latest_status text;
  latest_state_sequence bigint;
  expected_review_sequence bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('farmos_operational_memory_v1')
  );
  select projection.projection_version, projection.content_hash
  into projection_version, projection_hash
  from ai.operational_memory_daily_projections as projection
  where projection.projection_id = new.candidate_projection_id;
  if not found then
    raise exception using errcode = '23503',
      message = 'operational_memory_projection_review_candidate_missing';
  end if;
  select event.status, event.event_sequence
  into latest_status, latest_state_sequence
  from ai.operational_memory_projection_state_events as event
  where event.projection_id = new.candidate_projection_id
  order by event.event_sequence desc limit 1;
  select coalesce(pg_catalog.max(review.review_sequence), 0) + 1
  into expected_review_sequence
  from ai.operational_memory_projection_review_decisions as review
  where review.candidate_projection_id = new.candidate_projection_id
    and review.candidate_projection_version = new.candidate_projection_version;
  if projection_version <> new.candidate_projection_version
    or projection_hash <> new.candidate_content_hash
    or latest_state_sequence is distinct from new.candidate_state_sequence
    or expected_review_sequence <> new.review_sequence
    or (new.decision in ('approve', 'reject') and latest_status <> 'candidate')
    or (new.decision = 'request_rebuild' and latest_status not in (
      'candidate', 'rejected', 'failed'
    ))
  then
    raise exception using errcode = '23514',
      message = 'operational_memory_projection_review_binding_invalid';
  end if;
  return new;
end
$day149_review_binding$;

create function ai.enforce_operational_memory_projection_command_receipt_binding()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $day149_receipt_binding$
declare
  event_one record;
  event_two record;
  review_row record;
  latest_review_id text;
  event_slot_count integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('farmos_operational_memory_v1')
  );
  if new.affected_projection_id_1 is not null then
    event_slot_count := event_slot_count + 1;
    select event.projection_id, event.status, event.event_sequence
    into event_one
    from ai.operational_memory_projection_state_events as event
    where event.event_id = new.committed_state_event_id_1;
    if not found
      or event_one.projection_id <> new.affected_projection_id_1
      or event_one.event_sequence <> new.committed_state_event_sequence_1
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_event_binding_invalid';
    end if;
  end if;
  if new.affected_projection_id_2 is not null then
    event_slot_count := event_slot_count + 1;
    select event.projection_id, event.status, event.event_sequence
    into event_two
    from ai.operational_memory_projection_state_events as event
    where event.event_id = new.committed_state_event_id_2;
    if not found
      or event_two.projection_id <> new.affected_projection_id_2
      or event_two.event_sequence <> new.committed_state_event_sequence_2
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_event_binding_invalid';
    end if;
  end if;
  if exists (
    select 1 from ai.operational_memory_projection_command_receipts as receipt
    where receipt.command_id <> new.command_id
      and (
        receipt.committed_state_event_id_1 in (
          new.committed_state_event_id_1, new.committed_state_event_id_2
        )
        or receipt.committed_state_event_id_2 in (
          new.committed_state_event_id_1, new.committed_state_event_id_2
        )
      )
  ) then
    raise exception using errcode = '23505',
      message = 'operational_memory_projection_receipt_event_already_claimed';
  end if;

  if new.review_decision_id is not null then
    select review.* into review_row
    from ai.operational_memory_projection_review_decisions as review
    where review.review_id = new.review_decision_id;
    if not found then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_review_missing';
    end if;
    select review.review_id into latest_review_id
    from ai.operational_memory_projection_review_decisions as review
    where review.candidate_projection_id = review_row.candidate_projection_id
      and review.candidate_projection_version = review_row.candidate_projection_version
    order by review.review_sequence desc limit 1;
    if latest_review_id is distinct from new.review_decision_id then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_review_stale';
    end if;
  end if;

  if new.result_status = 'rejected' then
    if event_slot_count <> 0 or new.review_decision_id is not null
      or new.result_code not in (
        'candidate_not_found', 'candidate_not_candidate',
        'review_version_conflict', 'review_decision_missing',
        'review_decision_invalid', 'review_decision_stale',
        'approval_missing', 'approval_invalid', 'candidate_version_conflict',
        'active_version_conflict', 'active_identity_conflict',
        'projection_key_mismatch', 'multiple_active_conflict',
        'invalid_state_transition', 'lineage_invalid', 'content_hash_invalid',
        'rebuild_input_unavailable', 'rebuild_input_stale',
        'rebuild_input_ambiguous', 'rebuild_input_invalid'
      ) or (new.command_type = 'review_projection_candidate'
        and new.result_code not in (
          'candidate_not_found', 'candidate_not_candidate',
          'review_version_conflict', 'content_hash_invalid'
        )) or (new.command_type = 'promote_projection_candidate'
        and new.result_code not in (
          'candidate_not_found', 'candidate_not_candidate',
          'candidate_version_conflict', 'approval_missing', 'approval_invalid',
          'review_decision_stale', 'active_version_conflict',
          'active_identity_conflict', 'multiple_active_conflict',
          'invalid_state_transition', 'lineage_invalid', 'content_hash_invalid'
        )) or (new.command_type = 'reject_projection_candidate'
        and new.result_code not in (
          'candidate_not_found', 'candidate_not_candidate',
          'candidate_version_conflict', 'review_decision_missing',
          'review_decision_invalid', 'review_decision_stale',
          'invalid_state_transition', 'content_hash_invalid'
        )) or (new.command_type = 'rebuild_projection_candidate'
        and new.result_code not in (
          'candidate_not_found', 'candidate_version_conflict',
          'review_decision_missing', 'review_decision_invalid',
          'review_decision_stale', 'projection_key_mismatch',
          'invalid_state_transition', 'content_hash_invalid',
          'rebuild_input_unavailable', 'rebuild_input_stale',
          'rebuild_input_ambiguous', 'rebuild_input_invalid'
        ))
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_rejection_invalid';
    end if;
  elsif new.command_type = 'review_projection_candidate' then
    if new.result_code <> 'review_recorded' or event_slot_count <> 0
      or new.review_decision_id is null
      or review_row.command_id <> new.command_id
      or review_row.canonical_payload_hash <> new.canonical_payload_hash
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_review_invalid';
    end if;
  elsif new.command_type = 'promote_projection_candidate' then
    if new.result_code <> 'projection_promoted' or event_slot_count not in (1, 2)
      or new.review_decision_id is null or review_row.decision <> 'approve'
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_promotion_invalid';
    end if;
    if event_slot_count = 1 then
      if event_one.status <> 'active'
        or event_one.projection_id <> review_row.candidate_projection_id
      then
        raise exception using errcode = '23514',
          message = 'operational_memory_projection_receipt_promotion_invalid';
      end if;
    elsif event_slot_count = 2 then
      if event_one.status <> 'superseded' or event_two.status <> 'active'
        or event_one.projection_id = review_row.candidate_projection_id
        or event_two.projection_id <> review_row.candidate_projection_id
        or not exists (
          select 1
          from ai.operational_memory_daily_projections as old_projection
          join ai.operational_memory_daily_projections as candidate_projection
            on candidate_projection.projection_id =
              review_row.candidate_projection_id
          where old_projection.projection_id = event_one.projection_id
            and old_projection.business_date = candidate_projection.business_date
            and old_projection.projection_type = candidate_projection.projection_type
        )
      then
        raise exception using errcode = '23514',
          message = 'operational_memory_projection_receipt_promotion_invalid';
      end if;
    else
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_promotion_invalid';
    end if;
  elsif new.command_type = 'reject_projection_candidate' then
    if new.result_code <> 'projection_rejected' or event_slot_count <> 1
      or new.review_decision_id is null or review_row.decision <> 'reject'
      or event_one.status <> 'rejected'
      or event_one.projection_id <> review_row.candidate_projection_id
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_rejection_invalid';
    end if;
  elsif new.command_type = 'rebuild_projection_candidate' then
    if new.result_code <> 'projection_rebuilt' or event_slot_count <> 1
      or new.review_decision_id is null
      or review_row.decision <> 'request_rebuild'
      or event_one.status <> 'candidate'
      or event_one.projection_id = review_row.candidate_projection_id
      or not exists (
        select 1
        from ai.operational_memory_daily_projections as reviewed_projection
        join ai.operational_memory_daily_projections as rebuilt_projection
          on rebuilt_projection.projection_id = event_one.projection_id
        where reviewed_projection.projection_id =
            review_row.candidate_projection_id
          and rebuilt_projection.business_date = reviewed_projection.business_date
          and rebuilt_projection.projection_type = reviewed_projection.projection_type
      )
    then
      raise exception using errcode = '23514',
        message = 'operational_memory_projection_receipt_rebuild_invalid';
    end if;
  else
    raise exception using errcode = '23514',
      message = 'operational_memory_projection_receipt_command_invalid';
  end if;

  if (new.result_payload -> 'review_decision_id') is distinct from
    coalesce(pg_catalog.to_jsonb(new.review_decision_id), 'null'::jsonb)
    or new.result_payload -> 'affected_projection_ids' is distinct from
      pg_catalog.to_jsonb(pg_catalog.array_remove(array[
        new.affected_projection_id_1, new.affected_projection_id_2
      ], null))
    or new.result_payload -> 'committed_state_event_sequences' is distinct from
      pg_catalog.to_jsonb(pg_catalog.array_remove(array[
        new.committed_state_event_sequence_1,
        new.committed_state_event_sequence_2
      ], null))
  then
    raise exception using errcode = '23514',
      message = 'operational_memory_projection_receipt_payload_binding_invalid';
  end if;
  return new;
end
$day149_receipt_binding$;

create function ai.require_operational_memory_projection_command_receipt()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $day149_receipt_required$
declare
  receipt_count bigint;
begin
  if new.status = 'candidate'
    and pg_catalog.current_setting(
      'farmos.day149_projection_command_writer', true
    ) is distinct from 'on'
  then
    return new;
  end if;
  if new.status not in ('candidate', 'active', 'rejected', 'superseded') then
    return new;
  end if;
  select pg_catalog.count(*) into receipt_count
  from ai.operational_memory_projection_command_receipts as receipt
  where receipt.result_status = 'succeeded'
    and (
      receipt.committed_state_event_id_1 = new.event_id
      or receipt.committed_state_event_id_2 = new.event_id
    );
  if receipt_count <> 1 then
    raise exception using errcode = '23514',
      message = 'operational_memory_projection_command_receipt_required';
  end if;
  return new;
end
$day149_receipt_required$;

create function ai.persist_operational_memory_projection_command(
  p_receipt jsonb,
  p_review_decision jsonb,
  p_rebuild_projection jsonb,
  p_projection_events jsonb,
  p_rebuild_lineage jsonb
) returns jsonb
language plpgsql
security definer
volatile
set search_path = pg_catalog
as $day149_writer$
declare
  command_type text;
  result_status text;
  event_count integer;
  lineage_count integer;
  review_count integer;
  projection_count integer;
  stored_result jsonb;
begin
  if pg_catalog.jsonb_typeof(p_receipt) <> 'object'
    or not (p_review_decision is null or p_review_decision = 'null'::jsonb
      or pg_catalog.jsonb_typeof(p_review_decision) = 'object')
    or not (p_rebuild_projection is null or p_rebuild_projection = 'null'::jsonb
      or pg_catalog.jsonb_typeof(p_rebuild_projection) = 'object')
    or pg_catalog.jsonb_typeof(p_projection_events) <> 'array'
    or pg_catalog.jsonb_typeof(p_rebuild_lineage) <> 'array'
  then
    raise exception using errcode = '22023',
      message = 'operational_memory_projection_command_plan_invalid';
  end if;
  perform pg_catalog.set_config(
    'farmos.day149_projection_command_writer', 'on', true
  );
  if not (p_receipt ?& array[
      'receipt_schema_version', 'command_id', 'idempotency_key_hash',
      'command_type', 'canonical_payload_hash', 'result_status', 'result_code',
      'result_payload', 'result_payload_hash', 'requested_by', 'requested_at',
      'committed_at', 'review_decision_id', 'affected_projection_id_1',
      'committed_state_event_id_1', 'committed_state_event_sequence_1',
      'affected_projection_id_2', 'committed_state_event_id_2',
      'committed_state_event_sequence_2'
    ]) or p_receipt - array[
      'receipt_schema_version', 'command_id', 'idempotency_key_hash',
      'command_type', 'canonical_payload_hash', 'result_status', 'result_code',
      'result_payload', 'result_payload_hash', 'requested_by', 'requested_at',
      'committed_at', 'review_decision_id', 'affected_projection_id_1',
      'committed_state_event_id_1', 'committed_state_event_sequence_1',
      'affected_projection_id_2', 'committed_state_event_id_2',
      'committed_state_event_sequence_2'
    ] <> '{}'::jsonb
  then
    raise exception using errcode = '22023',
      message = 'operational_memory_projection_command_receipt_shape_invalid';
  end if;
  command_type := p_receipt ->> 'command_type';
  result_status := p_receipt ->> 'result_status';
  event_count := pg_catalog.jsonb_array_length(p_projection_events);
  lineage_count := pg_catalog.jsonb_array_length(p_rebuild_lineage);
  review_count := case when p_review_decision is null
    or p_review_decision = 'null'::jsonb then 0 else 1 end;
  projection_count := case when p_rebuild_projection is null
    or p_rebuild_projection = 'null'::jsonb then 0 else 1 end;
  if (review_count = 1 and (
      not (p_review_decision ?& array[
        'review_id', 'candidate_projection_id', 'candidate_projection_version',
        'candidate_state_sequence', 'candidate_content_hash', 'review_sequence',
        'decision', 'reason', 'reviewed_by', 'reviewed_at', 'command_id',
        'canonical_payload_hash'
      ])
      or p_review_decision - array[
        'review_id', 'candidate_projection_id', 'candidate_projection_version',
        'candidate_state_sequence', 'candidate_content_hash', 'review_sequence',
        'decision', 'reason', 'reviewed_by', 'reviewed_at', 'command_id',
        'canonical_payload_hash'
      ] <> '{}'::jsonb
    ))
    or (projection_count = 1 and (
      not (p_rebuild_projection ?& array[
        'projection_id', 'projection_type', 'projection_version',
        'business_date', 'compiler_id', 'compiler_version', 'content_hash',
        'projection_content', 'generated_at', 'supersedes_projection_id'
      ])
      or p_rebuild_projection - array[
        'projection_id', 'projection_type', 'projection_version',
        'business_date', 'compiler_id', 'compiler_version', 'content_hash',
        'projection_content', 'generated_at', 'supersedes_projection_id'
      ] <> '{}'::jsonb
    ))
    or exists (
      select 1 from pg_catalog.jsonb_array_elements(p_projection_events)
        as element(item)
      where pg_catalog.jsonb_typeof(item) <> 'object'
        or not (item ?& array[
          'event_id', 'projection_id', 'status', 'sequence', 'occurred_at'
        ])
        or item - array[
          'event_id', 'projection_id', 'status', 'sequence', 'occurred_at'
        ] <> '{}'::jsonb
    )
    or exists (
      select 1 from pg_catalog.jsonb_array_elements(p_rebuild_lineage)
        as element(item)
      where pg_catalog.jsonb_typeof(item) <> 'object'
        or not (item ?& array[
          'projection_id', 'snapshot_id', 'source_record_id',
          'source_content_hash', 'relation'
        ])
        or item - array[
          'projection_id', 'snapshot_id', 'source_record_id',
          'source_content_hash', 'relation'
        ] <> '{}'::jsonb
    )
  then
    raise exception using errcode = '22023',
      message = 'operational_memory_projection_command_record_shape_invalid';
  end if;
  if event_count > 2
    or (result_status = 'rejected' and (
      event_count <> 0 or lineage_count <> 0 or review_count <> 0
      or projection_count <> 0
    ))
    or (result_status = 'succeeded' and command_type = 'review_projection_candidate'
      and (review_count <> 1 or projection_count <> 0
        or event_count <> 0 or lineage_count <> 0))
    or (result_status = 'succeeded' and command_type = 'promote_projection_candidate'
      and (review_count <> 0 or projection_count <> 0
        or event_count not in (1, 2) or lineage_count <> 0))
    or (result_status = 'succeeded' and command_type = 'reject_projection_candidate'
      and (review_count <> 0 or projection_count <> 0
        or event_count <> 1 or lineage_count <> 0))
    or (result_status = 'succeeded' and command_type = 'rebuild_projection_candidate'
      and (review_count <> 0 or projection_count <> 1
        or event_count <> 1 or lineage_count < 1))
  then
    raise exception using errcode = '22023',
      message = 'operational_memory_projection_command_plan_invalid';
  end if;

  if review_count = 1 then
    insert into ai.operational_memory_projection_review_decisions (
      review_id, candidate_projection_id, candidate_projection_version,
      candidate_state_sequence, candidate_content_hash, review_sequence,
      decision, reason, reviewed_by, reviewed_at, command_id,
      canonical_payload_hash
    ) select review_id, candidate_projection_id, candidate_projection_version,
      candidate_state_sequence, candidate_content_hash, review_sequence,
      decision, reason, reviewed_by, reviewed_at, command_id,
      canonical_payload_hash
    from pg_catalog.jsonb_to_record(p_review_decision) as review(
      review_id text, candidate_projection_id text,
      candidate_projection_version integer, candidate_state_sequence bigint,
      candidate_content_hash text, review_sequence bigint, decision text,
      reason text, reviewed_by text, reviewed_at timestamptz, command_id text,
      canonical_payload_hash text
    );
  end if;
  if projection_count = 1 then
    insert into ai.operational_memory_daily_projections (
      projection_id, projection_type, projection_version, business_date,
      compiler_id, compiler_version, content_hash, projection_content,
      generated_at, supersedes_projection_id
    ) select projection_id, projection_type, projection_version, business_date,
      compiler_id, compiler_version, content_hash, projection_content,
      generated_at, supersedes_projection_id
    from pg_catalog.jsonb_to_record(p_rebuild_projection) as projection(
      projection_id text, projection_type text, projection_version integer,
      business_date date, compiler_id text, compiler_version integer,
      content_hash text, projection_content jsonb, generated_at timestamptz,
      supersedes_projection_id text
    );
  end if;
  insert into ai.operational_memory_projection_state_events (
    event_id, projection_id, status, event_sequence, occurred_at
  ) overriding system value
  select event_id, projection_id, status, sequence, occurred_at
  from pg_catalog.jsonb_to_recordset(p_projection_events) as event(
    event_id text, projection_id text, status text, sequence bigint,
    occurred_at timestamptz
  ) order by sequence;
  insert into ai.operational_memory_projection_lineage (
    projection_id, snapshot_id, source_record_id, source_content_hash, relation
  ) select projection_id, snapshot_id, source_record_id, source_content_hash,
    relation
  from pg_catalog.jsonb_to_recordset(p_rebuild_lineage) as lineage(
    projection_id text, snapshot_id text, source_record_id text,
    source_content_hash text, relation text
  );
  insert into ai.operational_memory_projection_command_receipts (
    receipt_schema_version, command_id, idempotency_key_hash, command_type,
    canonical_payload_hash, result_status, result_code, result_payload,
    result_payload_hash, requested_by, requested_at, committed_at,
    review_decision_id, affected_projection_id_1, committed_state_event_id_1,
    committed_state_event_sequence_1, affected_projection_id_2,
    committed_state_event_id_2, committed_state_event_sequence_2
  ) select receipt.receipt_schema_version, receipt.command_id,
    receipt.idempotency_key_hash, receipt.command_type,
    receipt.canonical_payload_hash, receipt.result_status, receipt.result_code,
    receipt.result_payload, receipt.result_payload_hash, receipt.requested_by,
    receipt.requested_at, receipt.committed_at, receipt.review_decision_id,
    receipt.affected_projection_id_1, receipt.committed_state_event_id_1,
    receipt.committed_state_event_sequence_1,
    receipt.affected_projection_id_2, receipt.committed_state_event_id_2,
    receipt.committed_state_event_sequence_2
  from pg_catalog.jsonb_to_record(p_receipt) as receipt(
    receipt_schema_version text, command_id text, idempotency_key_hash text,
    command_type text, canonical_payload_hash text, result_status text,
    result_code text, result_payload jsonb, result_payload_hash text,
    requested_by text, requested_at timestamptz, committed_at timestamptz,
    review_decision_id text, affected_projection_id_1 text,
    committed_state_event_id_1 text, committed_state_event_sequence_1 bigint,
    affected_projection_id_2 text, committed_state_event_id_2 text,
    committed_state_event_sequence_2 bigint
  ) returning result_payload into stored_result;
  return stored_result;
end
$day149_writer$;

create trigger operational_memory_projection_review_decisions_append_only
before update or delete on ai.operational_memory_projection_review_decisions
for each row execute function
  ai.reject_operational_memory_projection_command_ledger_mutation();

create trigger operational_memory_projection_command_receipts_append_only
before update or delete on ai.operational_memory_projection_command_receipts
for each row execute function
  ai.reject_operational_memory_projection_command_ledger_mutation();

create trigger operational_memory_projection_review_binding_guard
before insert on ai.operational_memory_projection_review_decisions
for each row execute function
  ai.enforce_operational_memory_projection_review_binding();

create constraint trigger operational_memory_projection_command_receipt_binding_guard
after insert on ai.operational_memory_projection_command_receipts
deferrable initially deferred
for each row execute function
  ai.enforce_operational_memory_projection_command_receipt_binding();

create constraint trigger operational_memory_projection_command_receipt_required
after insert on ai.operational_memory_projection_state_events
deferrable initially deferred
for each row execute function
  ai.require_operational_memory_projection_command_receipt();

revoke all on table ai.operational_memory_projection_review_decisions from public;
revoke all on table ai.operational_memory_projection_command_receipts from public;
revoke all on function
  ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)
  from public;
revoke all on function
  ai.reject_operational_memory_projection_command_ledger_mutation() from public;
revoke all on function
  ai.enforce_operational_memory_projection_review_binding() from public;
revoke all on function
  ai.enforce_operational_memory_projection_command_receipt_binding() from public;
revoke all on function
  ai.require_operational_memory_projection_command_receipt() from public;

do $day149_optional_role_revokes$
declare
  role_name name;
begin
  foreach role_name in array array['anon'::name, 'authenticated'::name]
  loop
    if pg_catalog.to_regrole(role_name) is not null then
      execute pg_catalog.format(
        'revoke all on table '
        || 'ai.operational_memory_projection_review_decisions from %I',
        role_name
      );
      execute pg_catalog.format(
        'revoke all on table '
        || 'ai.operational_memory_projection_command_receipts from %I',
        role_name
      );
      execute pg_catalog.format(
        'revoke all on function '
        || 'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb) '
        || 'from %I', role_name
      );
    end if;
  end loop;
end
$day149_optional_role_revokes$;

grant usage on schema ai to farmos_core_projection_command_transaction;
grant select on table
  ai.operational_memory_source_snapshots,
  ai.operational_memory_snapshot_state_events,
  ai.operational_memory_daily_projections,
  ai.operational_memory_projection_state_events,
  ai.operational_memory_projection_lineage,
  ai.operational_memory_projection_review_decisions,
  ai.operational_memory_projection_command_receipts
to farmos_core_projection_command_transaction;
grant execute on function
  ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)
to farmos_core_projection_command_transaction;
revoke insert, update, delete, truncate, references, trigger on table
  ai.operational_memory_source_snapshots,
  ai.operational_memory_snapshot_state_events,
  ai.operational_memory_daily_projections,
  ai.operational_memory_projection_state_events,
  ai.operational_memory_projection_lineage,
  ai.operational_memory_projection_review_decisions,
  ai.operational_memory_projection_command_receipts
from farmos_core_projection_command_transaction;
revoke all on function
  ai.reject_operational_memory_projection_command_ledger_mutation(),
  ai.enforce_operational_memory_projection_review_binding(),
  ai.enforce_operational_memory_projection_command_receipt_binding(),
  ai.require_operational_memory_projection_command_receipt()
from farmos_core_projection_command_transaction;

do $day149_exact_function_acl$
declare
  writer oid := pg_catalog.to_regprocedure(
    'ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)'
  );
  transaction_role oid := pg_catalog.to_regrole(
    'farmos_core_projection_command_transaction'
  );
  function_owner oid;
  review_table oid := pg_catalog.to_regclass(
    'ai.operational_memory_projection_review_decisions'
  );
  receipt_table oid := pg_catalog.to_regclass(
    'ai.operational_memory_projection_command_receipts'
  );
begin
  select procedure_row.proowner into function_owner
  from pg_catalog.pg_proc as procedure_row
  where procedure_row.oid = writer;
  if writer is null or transaction_role is null or function_owner is null
    or review_table is null or receipt_table is null
    or exists (
      select 1 from pg_catalog.pg_proc as procedure_row
      cross join lateral pg_catalog.aclexplode(procedure_row.proacl) as acl
      where procedure_row.oid in (
        writer,
        pg_catalog.to_regprocedure(
          'ai.reject_operational_memory_projection_command_ledger_mutation()'
        ),
        pg_catalog.to_regprocedure(
          'ai.enforce_operational_memory_projection_review_binding()'
        ),
        pg_catalog.to_regprocedure(
          'ai.enforce_operational_memory_projection_command_receipt_binding()'
        ),
        pg_catalog.to_regprocedure(
          'ai.require_operational_memory_projection_command_receipt()'
        )
      ) and not (
        acl.privilege_type = 'EXECUTE'
        and acl.grantee = procedure_row.proowner
        and not acl.is_grantable
      ) and not (
        procedure_row.oid = writer
        and acl.privilege_type = 'EXECUTE'
        and acl.grantee = transaction_role
        and not acl.is_grantable
      )
    ) or exists (
      select 1 from pg_catalog.pg_class as class_row
      cross join lateral pg_catalog.aclexplode(class_row.relacl) as acl
      where class_row.oid in (review_table, receipt_table)
        and not (
          acl.grantee = class_row.relowner
          and not acl.is_grantable
        )
        and not (
          acl.grantee = transaction_role
          and acl.privilege_type = 'SELECT'
          and not acl.is_grantable
        )
    ) or exists (
      select 1 from pg_catalog.pg_attribute as attribute_row
      cross join lateral pg_catalog.aclexplode(attribute_row.attacl) as acl
      where attribute_row.attrelid in (review_table, receipt_table)
    ) or (
      select pg_catalog.count(*)
      from pg_catalog.pg_proc as procedure_row
      cross join lateral pg_catalog.aclexplode(procedure_row.proacl) as acl
      where procedure_row.oid = writer
        and acl.grantee = transaction_role
        and acl.privilege_type = 'EXECUTE'
        and not acl.is_grantable
    ) <> 1
  then
    raise exception using errcode = '42501',
      message = 'operational_memory_projection_command_function_acl_invalid';
  end if;
end
$day149_exact_function_acl$;

commit;
