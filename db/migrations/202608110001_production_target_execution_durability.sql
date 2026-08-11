-- FarmOS Core immutable forward-only migration artifact.
-- Source artifact only. Never apply automatically or without authenticated-human authority.
begin;

do $pte_preflight$
declare
  ai_schema oid := pg_catalog.to_regnamespace('ai');
  relation_name text;
begin
  if current_user = 'farmos_core_production_target_execution_transaction' then
    raise exception using errcode = '42501',
      message = 'production_target_execution_owner_role_invalid';
  end if;
  if ai_schema is null or not pg_catalog.pg_has_role(
    current_user,
    (select namespace_row.nspowner from pg_catalog.pg_namespace namespace_row
      where namespace_row.oid = ai_schema),
    'USAGE'
  ) then
    raise exception using errcode = '42501',
      message = 'production_target_execution_schema_owner_invalid';
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
    if pg_catalog.to_regclass('ai.' || relation_name) is not null then
      raise exception using errcode = '55000',
        message = 'production_target_execution_object_already_exists';
    end if;
  end loop;
end
$pte_preflight$;

do $pte_role$
declare
  runtime_role oid := pg_catalog.to_regrole(
    'farmos_core_production_target_execution_transaction'
  );
  role_row record;
begin
  if runtime_role is null then
    create role farmos_core_production_target_execution_transaction
      nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
    runtime_role := pg_catalog.to_regrole(
      'farmos_core_production_target_execution_transaction');
  else
    select * into role_row from pg_catalog.pg_roles where oid = runtime_role;
    if role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
      or role_row.rolcreaterole or role_row.rolinherit
      or role_row.rolreplication or role_row.rolbypassrls
    then
      raise exception using errcode = '42501',
        message = 'production_target_execution_role_invalid';
    end if;
  end if;
  if exists (select 1 from pg_catalog.pg_auth_members membership
    where membership.roleid = runtime_role or membership.member = runtime_role)
  then
    raise exception using errcode = '42501',
      message = 'production_target_execution_role_membership_invalid';
  end if;
end
$pte_role$;

create table ai.production_target_execution_schema_metadata (
  singleton boolean primary key default true check (singleton),
  migration_id text not null unique,
  schema_version text not null,
  persistence_port_version text not null,
  apply_checksum_authority text not null,
  relation_registry_digest text not null,
  function_registry_digest text not null,
  trigger_registry_digest text not null,
  authority_registry_digest text not null,
  source_state text not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_metadata_migration_check check (
    migration_id = '202608110001_production_target_execution_durability'
  ),
  constraint pte_metadata_schema_check check (
    schema_version = 'farmos.production-target-execution-postgres-schema.v1'
    and persistence_port_version =
      'farmos.production-target-execution-persistence-port.v1'
    and apply_checksum_authority = 'core_schema.migration_history'
    and source_state = 'SOURCE_ARTIFACT_CREATED'
  ),
  constraint pte_metadata_digests_check check (
    relation_registry_digest ~ '^sha256:[a-f0-9]{64}$'
    and function_registry_digest ~ '^sha256:[a-f0-9]{64}$'
    and trigger_registry_digest ~ '^sha256:[a-f0-9]{64}$'
    and authority_registry_digest ~ '^sha256:[a-f0-9]{64}$'
  )
);

create table ai.production_target_execution_proposals (
  proposal_id text primary key,
  proposal_digest text not null,
  authority_id text not null,
  authority_revision integer not null,
  target_binding_digest text not null,
  operation_scope text not null,
  expires_at timestamptz(3) not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_proposal_id_digest_uq unique (proposal_id, proposal_digest),
  constraint pte_proposal_digest_check check (proposal_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint pte_proposal_record_check check (
    record_json ->> 'proposal_id' = proposal_id
    and record_json ->> 'proposal_digest' = proposal_digest
  )
);

create table ai.production_target_execution_approvals (
  approval_id text primary key,
  approval_digest text not null,
  proposal_id text not null,
  proposal_digest text not null,
  authority_id text not null,
  authority_revision integer not null,
  target_binding_digest text not null,
  operation_scope text not null,
  expires_at timestamptz(3) not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_approval_id_digest_uq unique (approval_id, approval_digest),
  constraint pte_approval_proposal_fk foreign key (proposal_id, proposal_digest)
    references ai.production_target_execution_proposals(proposal_id, proposal_digest)
    on update restrict on delete restrict,
  constraint pte_approval_digest_check check (approval_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint pte_approval_record_check check (
    record_json ->> 'approval_id' = approval_id
    and record_json ->> 'approval_digest' = approval_digest
    and record_json ->> 'proposal_id' = proposal_id
    and record_json ->> 'proposal_digest' = proposal_digest
  )
);

create table ai.production_target_execution_approval_receipts (
  approval_receipt_id text primary key,
  approval_receipt_digest text not null,
  approval_id text not null,
  approval_digest text not null,
  proposal_id text not null,
  proposal_digest text not null,
  target_binding_digest text not null,
  operation_scope text not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_approval_receipt_id_digest_uq unique (
    approval_receipt_id, approval_receipt_digest
  ),
  constraint pte_approval_receipt_approval_uq unique (approval_id),
  constraint pte_approval_receipt_approval_fk foreign key (approval_id, approval_digest)
    references ai.production_target_execution_approvals(approval_id, approval_digest)
    on update restrict on delete restrict,
  constraint pte_approval_receipt_proposal_fk foreign key (proposal_id, proposal_digest)
    references ai.production_target_execution_proposals(proposal_id, proposal_digest)
    on update restrict on delete restrict,
  constraint pte_approval_receipt_digest_check check (
    approval_receipt_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  constraint pte_approval_receipt_record_check check (
    record_json ->> 'approval_receipt_id' = approval_receipt_id
    and record_json ->> 'approval_receipt_digest' = approval_receipt_digest
    and record_json ->> 'approval_id' = approval_id
    and record_json ->> 'approval_digest' = approval_digest
  )
);

create table ai.production_target_execution_approval_revocation_events (
  revocation_event_id text primary key,
  revocation_event_digest text not null,
  approval_id text not null,
  approval_digest text not null,
  approval_receipt_id text not null,
  approval_receipt_digest text not null,
  event_sequence bigint not null check (event_sequence > 0),
  previous_event_digest text,
  effective_at timestamptz(3) not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_revocation_event_id_digest_uq unique (
    revocation_event_id, revocation_event_digest
  ),
  constraint pte_revocation_event_sequence_uq unique (approval_id, event_sequence),
  constraint pte_revocation_event_approval_fk foreign key (approval_id, approval_digest)
    references ai.production_target_execution_approvals(approval_id, approval_digest)
    on update restrict on delete restrict,
  constraint pte_revocation_event_receipt_fk foreign key (
    approval_receipt_id, approval_receipt_digest
  ) references ai.production_target_execution_approval_receipts(
    approval_receipt_id, approval_receipt_digest
  ) on update restrict on delete restrict,
  constraint pte_revocation_event_digest_check check (
    revocation_event_digest ~ '^sha256:[a-f0-9]{64}$'
    and (previous_event_digest is null
      or previous_event_digest ~ '^sha256:[a-f0-9]{64}$')
  ),
  constraint pte_revocation_event_record_check check (
    record_json ->> 'revocation_event_id' = revocation_event_id
    and record_json ->> 'revocation_event_digest' = revocation_event_digest
    and (record_json ->> 'event_sequence')::bigint = event_sequence
  )
);

create table ai.production_target_execution_approval_revocation_heads (
  approval_id text primary key,
  approval_digest text not null,
  approval_receipt_id text not null unique,
  approval_receipt_digest text not null,
  head_version bigint not null check (head_version >= 0),
  head_digest text not null,
  latest_event_id text,
  latest_event_digest text,
  status text not null check (status in ('ACTIVE', 'REVOKED')),
  effective_revoked_at timestamptz(3),
  record_json jsonb not null,
  updated_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_revocation_head_approval_fk foreign key (approval_id, approval_digest)
    references ai.production_target_execution_approvals(approval_id, approval_digest)
    on update restrict on delete restrict,
  constraint pte_revocation_head_receipt_fk foreign key (
    approval_receipt_id, approval_receipt_digest
  ) references ai.production_target_execution_approval_receipts(
    approval_receipt_id, approval_receipt_digest
  ) on update restrict on delete restrict,
  constraint pte_revocation_head_event_fk foreign key (
    latest_event_id, latest_event_digest
  ) references ai.production_target_execution_approval_revocation_events(
    revocation_event_id, revocation_event_digest
  ) deferrable initially deferred,
  constraint pte_revocation_head_digest_check check (head_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint pte_revocation_head_shape_check check (
    (status = 'ACTIVE' and head_version = 0 and latest_event_id is null
      and latest_event_digest is null and effective_revoked_at is null)
    or (status = 'REVOKED' and head_version > 0 and latest_event_id is not null
      and latest_event_digest is not null and effective_revoked_at is not null)
  )
);

create table ai.production_target_execution_approval_uses (
  approval_id text primary key,
  approval_digest text not null,
  approval_receipt_id text not null unique,
  approval_receipt_digest text not null,
  binding_state text not null check (
    binding_state in ('UNBOUND', 'BOUND', 'QUARANTINED', 'CONSUMED')
  ),
  binding_version bigint not null check (binding_version >= 0),
  binding_digest text not null,
  command_id text,
  reservation_id text,
  execution_binding_digest text,
  updated_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_approval_use_approval_fk foreign key (approval_id, approval_digest)
    references ai.production_target_execution_approvals(approval_id, approval_digest)
    on update restrict on delete restrict,
  constraint pte_approval_use_receipt_fk foreign key (
    approval_receipt_id, approval_receipt_digest
  ) references ai.production_target_execution_approval_receipts(
    approval_receipt_id, approval_receipt_digest
  ) on update restrict on delete restrict,
  constraint pte_approval_use_digest_check check (binding_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint pte_approval_use_shape_check check (
    (binding_state = 'UNBOUND' and binding_version = 0 and command_id is null
      and reservation_id is null and execution_binding_digest is null)
    or (binding_state <> 'UNBOUND' and binding_version > 0 and command_id is not null
      and execution_binding_digest is not null)
  )
);

create table ai.production_target_execution_commands (
  command_id text primary key,
  command_record_digest text not null,
  execution_binding_digest text not null unique,
  nonce_digest text not null unique,
  proposal_id text not null,
  proposal_digest text not null,
  approval_id text not null,
  approval_digest text not null,
  approval_receipt_id text not null,
  approval_receipt_digest text not null,
  phase_b_authority_bundle_digest text not null,
  target_binding_digest text not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_command_id_digest_uq unique (command_id, command_record_digest),
  constraint pte_command_approval_fk foreign key (approval_id, approval_digest)
    references ai.production_target_execution_approvals(approval_id, approval_digest)
    on update restrict on delete restrict,
  constraint pte_command_receipt_fk foreign key (
    approval_receipt_id, approval_receipt_digest
  ) references ai.production_target_execution_approval_receipts(
    approval_receipt_id, approval_receipt_digest
  ) on update restrict on delete restrict,
  constraint pte_command_record_check check (
    record_json ->> 'command_id' = command_id
    and record_json ->> 'command_record_digest' = command_record_digest
    and record_json ->> 'execution_binding_digest' = execution_binding_digest
  )
);

create table ai.production_target_execution_lifecycles (
  command_id text primary key,
  command_record_digest text not null,
  execution_binding_digest text not null,
  approval_id text not null,
  approval_digest text not null,
  approval_receipt_id text not null,
  approval_receipt_digest text not null,
  state text not null,
  state_version bigint not null check (state_version >= 0),
  lifecycle_record_digest text not null,
  approval_use_state text not null,
  reservation_id text,
  reservation_digest text,
  attempt_id text,
  attempt_digest text,
  terminal_receipt_id text,
  terminal_receipt_digest text,
  record_json jsonb not null,
  updated_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_lifecycle_command_fk foreign key (command_id, command_record_digest)
    references ai.production_target_execution_commands(command_id, command_record_digest)
    on update restrict on delete restrict,
  constraint pte_lifecycle_state_check check (state in (
    'UNRESERVED', 'RESERVATION_OUTCOME_UNKNOWN', 'RESERVED_NOT_STARTED',
    'ATTEMPT_STARTED', 'CONSUMED_SUCCESS', 'CONSUMED_FAILURE', 'OUTCOME_UNKNOWN',
    'CANCELLED_PRE_START', 'EXPIRED_PRE_START'
  )),
  constraint pte_lifecycle_digest_check check (
    lifecycle_record_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  constraint pte_lifecycle_identity_pair_check check (
    (reservation_id is null) = (reservation_digest is null)
    and (attempt_id is null) = (attempt_digest is null)
    and (terminal_receipt_id is null) = (terminal_receipt_digest is null)
  ),
  constraint pte_lifecycle_terminal_shape_check check (
    (state in ('UNRESERVED', 'RESERVED_NOT_STARTED', 'ATTEMPT_STARTED')
      and terminal_receipt_id is null)
    or (state not in ('UNRESERVED', 'RESERVED_NOT_STARTED', 'ATTEMPT_STARTED')
      and terminal_receipt_id is not null)
  )
);

create table ai.production_target_execution_reservations (
  reservation_id text primary key,
  reservation_digest text not null,
  command_id text not null,
  command_record_digest text not null,
  approval_id text not null,
  approval_digest text not null,
  approval_receipt_id text not null,
  approval_receipt_digest text not null,
  execution_binding_digest text not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_reservation_id_digest_uq unique (reservation_id, reservation_digest),
  constraint pte_reservation_command_uq unique (command_id),
  constraint pte_reservation_approval_uq unique (approval_id),
  constraint pte_reservation_approval_receipt_uq unique (approval_receipt_id),
  constraint pte_reservation_command_fk foreign key (command_id, command_record_digest)
    references ai.production_target_execution_commands(command_id, command_record_digest)
    on update restrict on delete restrict,
  constraint pte_reservation_approval_fk foreign key (approval_id, approval_digest)
    references ai.production_target_execution_approvals(approval_id, approval_digest)
    on update restrict on delete restrict,
  constraint pte_reservation_receipt_fk foreign key (
    approval_receipt_id, approval_receipt_digest
  ) references ai.production_target_execution_approval_receipts(
    approval_receipt_id, approval_receipt_digest
  ) on update restrict on delete restrict
);

create table ai.production_target_execution_attempts (
  attempt_id text primary key,
  attempt_digest text not null,
  reservation_id text not null,
  reservation_digest text not null,
  command_id text not null,
  execution_binding_digest text not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_attempt_id_digest_uq unique (attempt_id, attempt_digest),
  constraint pte_attempt_reservation_uq unique (reservation_id),
  constraint pte_attempt_command_uq unique (command_id),
  constraint pte_attempt_reservation_fk foreign key (reservation_id, reservation_digest)
    references ai.production_target_execution_reservations(reservation_id, reservation_digest)
    on update restrict on delete restrict
);

create table ai.production_target_execution_execution_receipts (
  receipt_id text primary key,
  receipt_digest text not null,
  command_id text not null,
  command_record_digest text not null,
  execution_binding_digest text not null,
  approval_id text not null,
  approval_digest text not null,
  approval_receipt_id text not null,
  approval_receipt_digest text not null,
  reservation_id text,
  reservation_digest text,
  attempt_id text,
  attempt_digest text,
  terminal_state text not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_execution_receipt_id_digest_uq unique (receipt_id, receipt_digest),
  constraint pte_execution_receipt_command_uq unique (command_id),
  constraint pte_execution_receipt_command_fk foreign key (command_id, command_record_digest)
    references ai.production_target_execution_commands(command_id, command_record_digest)
    on update restrict on delete restrict,
  constraint pte_execution_receipt_state_check check (terminal_state in (
    'RESERVATION_OUTCOME_UNKNOWN', 'CONSUMED_SUCCESS', 'CONSUMED_FAILURE',
    'OUTCOME_UNKNOWN', 'CANCELLED_PRE_START', 'EXPIRED_PRE_START'
  )),
  constraint pte_execution_receipt_record_check check (
    record_json ->> 'receipt_id' = receipt_id
    and record_json ->> 'receipt_digest' = receipt_digest
    and record_json ->> 'terminal_state' = terminal_state
  )
);

create table ai.production_target_execution_clock_evidence (
  evidence_id text primary key,
  evidence_digest text not null unique,
  clock_authority_id text not null,
  clock_authority_revision integer not null,
  observed_at timestamptz(3) not null,
  observed_lower_bound timestamptz(3) not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_clock_evidence_record_check check (
    record_json ->> 'evidence_id' = evidence_id
    and record_json ->> 'evidence_digest' = evidence_digest
    and record_json ->> 'status' = 'AVAILABLE'
  )
);

create table ai.production_target_execution_clock_floors (
  clock_authority_id text not null,
  clock_authority_revision integer not null,
  floor_version bigint not null check (floor_version > 0),
  observed_lower_bound timestamptz(3) not null,
  floor_digest text not null,
  updated_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  primary key (clock_authority_id, clock_authority_revision),
  constraint pte_clock_floor_digest_check check (floor_digest ~ '^sha256:[a-f0-9]{64}$')
);

create table ai.production_target_execution_reconciliation_records (
  reconciliation_id text primary key,
  reconciliation_digest text not null unique,
  record_kind text not null check (record_kind in (
    'REVOCATION_REVALIDATION', 'RESERVATION_RECONCILIATION',
    'ATTEMPT_RECONCILIATION', 'FINALIZATION_RECONCILIATION'
  )),
  command_id text not null,
  execution_binding_digest text not null,
  lifecycle_state_version bigint not null,
  record_json jsonb not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint pte_reconciliation_id_digest_uq unique (
    reconciliation_id, reconciliation_digest
  ),
  constraint pte_reconciliation_identity_uq unique (
    record_kind, command_id, lifecycle_state_version
  )
);

create index pte_revocation_event_chain_idx
  on ai.production_target_execution_approval_revocation_events(
    approval_id, event_sequence, previous_event_digest
  );
create index pte_lifecycle_state_idx
  on ai.production_target_execution_lifecycles(state, state_version);
create index pte_receipt_terminal_idx
  on ai.production_target_execution_execution_receipts(terminal_state, command_id);

create function ai.reject_production_target_execution_append_only_mutation()
returns trigger language plpgsql security invoker volatile set search_path = pg_catalog
as $pte_append_only$
begin
  raise exception using errcode = '55000',
    message = 'production_target_execution_append_only';
end
$pte_append_only$;

create function ai.enforce_production_target_execution_cas_progression()
returns trigger language plpgsql security invoker volatile set search_path = pg_catalog
as $pte_cas_guard$
declare
  version_key text;
  digest_key text;
begin
  version_key := case tg_table_name
    when 'production_target_execution_approval_revocation_heads' then 'head_version'
    when 'production_target_execution_approval_uses' then 'binding_version'
    when 'production_target_execution_lifecycles' then 'state_version'
    when 'production_target_execution_clock_floors' then 'floor_version'
    else null end;
  digest_key := case tg_table_name
    when 'production_target_execution_approval_revocation_heads' then 'head_digest'
    when 'production_target_execution_approval_uses' then 'binding_digest'
    when 'production_target_execution_lifecycles' then 'lifecycle_record_digest'
    when 'production_target_execution_clock_floors' then 'floor_digest'
    else null end;
  if version_key is null
    or (pg_catalog.to_jsonb(new) ->> version_key)::bigint <>
      (pg_catalog.to_jsonb(old) ->> version_key)::bigint + 1
    or pg_catalog.to_jsonb(new) ->> digest_key is null
    or pg_catalog.to_jsonb(new) ->> digest_key = pg_catalog.to_jsonb(old) ->> digest_key
  then
    raise exception using errcode = 'PTE05',
      message = 'STALE_EXPECTED_VERSION';
  end if;
  if tg_table_name = 'production_target_execution_approval_revocation_heads' and (
      new.approval_id <> old.approval_id
      or new.approval_digest <> old.approval_digest
      or new.approval_receipt_id <> old.approval_receipt_id
      or new.approval_receipt_digest <> old.approval_receipt_digest
      or old.status <> 'ACTIVE' or new.status <> 'REVOKED'
      or old.latest_event_id is not null or old.latest_event_digest is not null
      or new.latest_event_id is null or new.latest_event_digest is null
      or new.effective_revoked_at is null)
  then
    raise exception using errcode = 'PTE06', message = 'REVOCATION_CONFLICT';
  elsif tg_table_name = 'production_target_execution_approval_uses' and (
      new.approval_id <> old.approval_id
      or new.approval_digest <> old.approval_digest
      or new.approval_receipt_id <> old.approval_receipt_id
      or new.approval_receipt_digest <> old.approval_receipt_digest
      or (old.binding_state = 'UNBOUND' and new.binding_state not in ('BOUND','QUARANTINED'))
      or (old.binding_state = 'BOUND' and new.binding_state not in ('QUARANTINED','CONSUMED'))
      or old.binding_state in ('QUARANTINED','CONSUMED')
      or (old.binding_state <> 'UNBOUND' and (
        new.command_id is distinct from old.command_id
        or new.reservation_id is distinct from old.reservation_id
        or new.execution_binding_digest is distinct from old.execution_binding_digest)))
  then
    raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND';
  elsif tg_table_name = 'production_target_execution_lifecycles' and (
      new.command_id <> old.command_id
      or new.command_record_digest <> old.command_record_digest
      or new.execution_binding_digest <> old.execution_binding_digest
      or new.approval_id <> old.approval_id
      or new.approval_digest <> old.approval_digest
      or new.approval_receipt_id <> old.approval_receipt_id
      or new.approval_receipt_digest <> old.approval_receipt_digest
      or old.state in ('RESERVATION_OUTCOME_UNKNOWN','CONSUMED_SUCCESS','CONSUMED_FAILURE',
        'OUTCOME_UNKNOWN','CANCELLED_PRE_START','EXPIRED_PRE_START')
      or not ((old.state = 'UNRESERVED' and new.state in (
          'RESERVED_NOT_STARTED','RESERVATION_OUTCOME_UNKNOWN'))
        or (old.state = 'RESERVED_NOT_STARTED' and new.state in (
          'ATTEMPT_STARTED','CANCELLED_PRE_START','EXPIRED_PRE_START'))
        or (old.state = 'ATTEMPT_STARTED' and new.state in (
          'CONSUMED_SUCCESS','CONSUMED_FAILURE','OUTCOME_UNKNOWN'))))
  then
    raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT';
  elsif tg_table_name = 'production_target_execution_clock_floors' and (
      new.clock_authority_id <> old.clock_authority_id
      or new.clock_authority_revision <> old.clock_authority_revision
      or new.observed_lower_bound < old.observed_lower_bound)
  then
    raise exception using errcode = 'PTE04', message = 'CLOCK_REGRESSION';
  end if;
  return new;
end
$pte_cas_guard$;

create function ai.production_target_execution_canonical_jsonb(p_value jsonb)
returns text language plpgsql security invoker immutable strict set search_path = pg_catalog
as $pte_canonical$
declare canonical text;
begin
  if pg_catalog.jsonb_typeof(p_value) = 'object' then
    select '{' || coalesce(pg_catalog.string_agg(
      pg_catalog.to_jsonb(entry.key)::text || ':' ||
        ai.production_target_execution_canonical_jsonb(entry.value),
      ',' order by entry.key collate pg_catalog."C"), '') || '}' into canonical
    from pg_catalog.jsonb_each(p_value) entry;
    return canonical;
  elsif pg_catalog.jsonb_typeof(p_value) = 'array' then
    select '[' || coalesce(pg_catalog.string_agg(
      ai.production_target_execution_canonical_jsonb(entry.value),
      ',' order by entry.position), '') || ']' into canonical
    from pg_catalog.jsonb_array_elements(p_value) with ordinality entry(value, position);
    return canonical;
  end if;
  return p_value::text;
end
$pte_canonical$;

create function ai.production_target_execution_digest(p_domain text, p_value jsonb)
returns text language sql security invoker immutable strict set search_path = pg_catalog
as $pte_digest$
  select 'sha256:' || pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    p_domain || E'\n' || ai.production_target_execution_canonical_jsonb(p_value), 'UTF8'
  )), 'hex')
$pte_digest$;

create function ai.assert_production_target_execution_exact_record(
  p_record jsonb,
  p_expected_keys text[],
  p_digest_key text,
  p_domain text,
  p_excluded_digest_keys text[]
)
returns void language plpgsql security invoker immutable strict set search_path = pg_catalog
as $pte_exact_record$
declare actual_keys text[]; expected_keys text[]; expected_digest text;
begin
  if pg_catalog.jsonb_typeof(p_record) <> 'object' then
    raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID';
  end if;
  select pg_catalog.array_agg(key order by key collate pg_catalog."C")
    into actual_keys from pg_catalog.jsonb_object_keys(p_record) key;
  select pg_catalog.array_agg(key order by key collate pg_catalog."C")
    into expected_keys from pg_catalog.unnest(p_expected_keys) key;
  if actual_keys is distinct from expected_keys
    or p_record ->> p_digest_key !~ '^sha256:[a-f0-9]{64}$'
    or exists (select 1 from pg_catalog.jsonb_each(p_record) entry
      where entry.key like '%\_at' escape '\'
        and entry.value <> 'null'::jsonb
        and (pg_catalog.jsonb_typeof(entry.value) <> 'string'
          or entry.value #>> '{}' !~
            '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'))
  then
    raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID';
  end if;
  expected_digest := ai.production_target_execution_digest(
    p_domain, p_record - p_excluded_digest_keys);
  if p_record ->> p_digest_key <> expected_digest then
    raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH';
  end if;
end
$pte_exact_record$;

create function ai.assert_production_target_execution_receipt_binding(
  p_receipt jsonb,
  p_lifecycle jsonb,
  p_clock_evidence jsonb,
  p_allowed_terminal_states text[]
)
returns void language plpgsql security invoker immutable strict set search_path = pg_catalog
as $pte_receipt_binding$
declare terminal_state text := p_receipt ->> 'terminal_state';
begin
  perform ai.assert_production_target_execution_exact_record(
    p_receipt,
    array['append_only','approval_digest','approval_id','approval_receipt_digest',
      'approval_receipt_id','attempt_digest','attempt_id','automatic_retry_prohibited',
      'command_id','command_record_digest','execution_binding_digest','manual_review_required',
      'production_evidence_receipt','proposal_digest','proposal_id','receipt_authority_id',
      'receipt_authority_revision','receipt_digest','receipt_id','recorded_at',
      'reservation_digest','reservation_id','result_classification',
      'result_evidence_reference_digest','schema_version','supersedes_receipt_digest',
      'supersedes_receipt_id','terminal_state','trusted_clock_evidence_digest',
      'trusted_clock_evidence_id','unknown_stage'],
    'receipt_digest', 'farmos.production-target-execution-receipt.v1',
    array['receipt_digest']);
  if not terminal_state = any(p_allowed_terminal_states)
    or p_receipt ->> 'schema_version' <>
      'farmos.production-target-execution-receipt.v1'
    or p_receipt ->> 'receipt_authority_id' <>
      'farmos.production-target-execution-receipt-authority.v1'
    or (p_receipt ->> 'receipt_authority_revision')::integer <> 1
    or (p_receipt ->> 'append_only')::boolean is not true
    or (p_receipt ->> 'automatic_retry_prohibited')::boolean is not true
    or (p_receipt ->> 'production_evidence_receipt')::boolean is not false
    or p_receipt -> 'supersedes_receipt_id' <> 'null'::jsonb
    or p_receipt -> 'supersedes_receipt_digest' <> 'null'::jsonb
    or p_receipt ->> 'command_id' <> p_lifecycle ->> 'command_id'
    or p_receipt ->> 'command_record_digest' <> p_lifecycle ->> 'command_record_digest'
    or p_receipt ->> 'execution_binding_digest' <> p_lifecycle ->> 'execution_binding_digest'
    or p_receipt ->> 'proposal_id' <> p_lifecycle ->> 'proposal_id'
    or p_receipt ->> 'proposal_digest' <> p_lifecycle ->> 'proposal_digest'
    or p_receipt ->> 'approval_id' <> p_lifecycle ->> 'approval_id'
    or p_receipt ->> 'approval_digest' <> p_lifecycle ->> 'approval_digest'
    or p_receipt ->> 'approval_receipt_id' <> p_lifecycle ->> 'approval_receipt_id'
    or p_receipt ->> 'approval_receipt_digest' <>
      p_lifecycle ->> 'approval_receipt_digest'
    or p_receipt -> 'reservation_id' is distinct from p_lifecycle -> 'reservation_id'
    or p_receipt -> 'reservation_digest' is distinct from p_lifecycle -> 'reservation_digest'
    or p_receipt -> 'attempt_id' is distinct from p_lifecycle -> 'attempt_id'
    or p_receipt -> 'attempt_digest' is distinct from p_lifecycle -> 'attempt_digest'
    or p_receipt ->> 'trusted_clock_evidence_id' <> p_clock_evidence ->> 'evidence_id'
    or p_receipt ->> 'trusted_clock_evidence_digest' <>
      p_clock_evidence ->> 'evidence_digest'
    or (p_receipt ->> 'recorded_at')::timestamptz <>
      (p_clock_evidence ->> 'observed_at')::timestamptz
  then raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT'; end if;
  if terminal_state = 'CONSUMED_SUCCESS' and not (
      p_receipt ->> 'result_classification' = 'SUCCEEDED'
      and p_receipt ->> 'unknown_stage' = 'NONE'
      and p_receipt -> 'result_evidence_reference_digest' <> 'null'::jsonb
      and (p_receipt ->> 'manual_review_required')::boolean is false)
    or terminal_state = 'CONSUMED_FAILURE' and not (
      p_receipt ->> 'result_classification' = 'FAILED'
      and p_receipt ->> 'unknown_stage' = 'NONE'
      and p_receipt -> 'result_evidence_reference_digest' <> 'null'::jsonb
      and (p_receipt ->> 'manual_review_required')::boolean is true)
    or terminal_state in ('CANCELLED_PRE_START','EXPIRED_PRE_START') and not (
      p_receipt ->> 'result_classification' = 'NOT_EXECUTED'
      and p_receipt ->> 'unknown_stage' = 'NONE'
      and p_receipt -> 'attempt_id' = 'null'::jsonb
      and p_receipt -> 'result_evidence_reference_digest' = 'null'::jsonb
      and (p_receipt ->> 'manual_review_required')::boolean is true)
    or terminal_state = 'RESERVATION_OUTCOME_UNKNOWN' and not (
      p_receipt ->> 'result_classification' = 'UNKNOWN'
      and p_receipt ->> 'unknown_stage' = 'RESERVATION_WRITE'
      and p_receipt -> 'attempt_id' = 'null'::jsonb
      and p_receipt -> 'result_evidence_reference_digest' = 'null'::jsonb
      and (p_receipt ->> 'manual_review_required')::boolean is true)
    or terminal_state = 'OUTCOME_UNKNOWN' and not (
      p_receipt ->> 'result_classification' = 'UNKNOWN'
      and p_receipt ->> 'unknown_stage' in (
        'ATTEMPT_START_WRITE','POST_START','FINALIZATION_WRITE')
      and p_receipt -> 'result_evidence_reference_digest' = 'null'::jsonb
      and (p_receipt ->> 'manual_review_required')::boolean is true)
  then raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT'; end if;
end
$pte_receipt_binding$;

insert into ai.production_target_execution_schema_metadata (
  singleton, migration_id, schema_version, persistence_port_version,
  apply_checksum_authority, relation_registry_digest, function_registry_digest,
  trigger_registry_digest, authority_registry_digest, source_state
) values (
  true, '202608110001_production_target_execution_durability',
  'farmos.production-target-execution-postgres-schema.v1',
  'farmos.production-target-execution-persistence-port.v1',
  'core_schema.migration_history',
  'sha256:475d9e8cbcf71b8d30054df659344890364de455a57d8efbd73032b909c8a4b6',
  'sha256:368916efa13413f1d960385e8861bb2d74f34b3eb9a6f256fc6ca86c9b7fe8b9',
  'sha256:76eccb4aeb997a887dbb1b8bc13dee258c3677343bdb60ebb5f6744a11695187',
  'sha256:002038b6763d0c90ee7d848650ca310d556c94efca51cb9fd00c94c46f49c7fb',
  'SOURCE_ARTIFACT_CREATED'
);

create function ai.assert_production_target_execution_schema_identity()
returns void language plpgsql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_assert_schema$
begin
  if not exists (
    select 1 from ai.production_target_execution_schema_metadata metadata
    join core_schema.migration_history history
      on history.migration_id = metadata.migration_id
    where metadata.singleton
      and metadata.migration_id = '202608110001_production_target_execution_durability'
      and metadata.schema_version = 'farmos.production-target-execution-postgres-schema.v1'
      and metadata.persistence_port_version =
        'farmos.production-target-execution-persistence-port.v1'
      and history.sequence = 202608110001
      and history.checksum ~ '^sha256:[a-f0-9]{64}$'
  ) then
    raise exception using errcode = 'PTE01', message = 'SCHEMA_MISMATCH';
  end if;
end
$pte_assert_schema$;

create function ai.read_production_target_execution_schema_identity()
returns jsonb language sql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_schema$
  select pg_catalog.jsonb_build_object(
    'migration_id', metadata.migration_id,
    'apply_checksum', history.checksum,
    'schema_version', metadata.schema_version,
    'persistence_port_version', metadata.persistence_port_version,
    'relation_registry_digest', metadata.relation_registry_digest,
    'function_registry_digest', metadata.function_registry_digest,
    'trigger_registry_digest', metadata.trigger_registry_digest,
    'authority_registry_digest', metadata.authority_registry_digest
  ) from ai.production_target_execution_schema_metadata metadata
  join core_schema.migration_history history on history.migration_id = metadata.migration_id
  where metadata.singleton and history.sequence = 202608110001
    and (select pg_catalog.count(*) from pg_catalog.pg_class class_row
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'ai' and class_row.relkind = 'r'
        and class_row.relname like 'production\_target\_execution\_%' escape '\') = 15
    and (select pg_catalog.count(*) from pg_catalog.pg_proc procedure_row
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = procedure_row.pronamespace
      where namespace_row.nspname = 'ai'
        and procedure_row.proname like '%production\_target\_execution%' escape '\') = 27
    and (select pg_catalog.count(*) from pg_catalog.pg_trigger trigger_row
      join pg_catalog.pg_class class_row on class_row.oid = trigger_row.tgrelid
      join pg_catalog.pg_namespace namespace_row
        on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'ai'
        and class_row.relname like 'production\_target\_execution\_%' escape '\'
        and not trigger_row.tgisinternal) = 34
    and (select pg_catalog.array_agg(class_row.relname order by class_row.relname)
      from pg_catalog.pg_class class_row
      join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'ai' and class_row.relkind = 'r'
        and class_row.relname like 'production\_target\_execution\_%' escape '\') =
      (select pg_catalog.array_agg(name order by name) from pg_catalog.unnest(array[
        'production_target_execution_schema_metadata','production_target_execution_proposals',
        'production_target_execution_approvals','production_target_execution_approval_receipts',
        'production_target_execution_approval_revocation_events',
        'production_target_execution_approval_revocation_heads',
        'production_target_execution_approval_uses','production_target_execution_commands',
        'production_target_execution_lifecycles','production_target_execution_reservations',
        'production_target_execution_attempts','production_target_execution_execution_receipts',
        'production_target_execution_clock_evidence','production_target_execution_clock_floors',
        'production_target_execution_reconciliation_records']::text[]) name)
    and (select pg_catalog.array_agg(procedure_row.proname || '(' ||
        pg_catalog.oidvectortypes(procedure_row.proargtypes) || ')'
        order by procedure_row.proname || '(' ||
          pg_catalog.oidvectortypes(procedure_row.proargtypes) || ')')
      from pg_catalog.pg_proc procedure_row
      join pg_catalog.pg_namespace namespace_row on namespace_row.oid = procedure_row.pronamespace
      where namespace_row.nspname = 'ai'
        and procedure_row.proname like '%production\_target\_execution%' escape '\') =
      (select pg_catalog.array_agg(name order by name) from pg_catalog.unnest(array[
        'reject_production_target_execution_append_only_mutation()',
        'enforce_production_target_execution_cas_progression()',
        'production_target_execution_canonical_jsonb(jsonb)',
        'production_target_execution_digest(text, jsonb)',
        'assert_production_target_execution_exact_record(jsonb, text[], text, text, text[])',
        'assert_production_target_execution_receipt_binding(jsonb, jsonb, jsonb, text[])',
        'assert_production_target_execution_schema_identity()',
        'advance_production_target_execution_clock_floor(jsonb)',
        'read_production_target_execution_schema_identity()',
        'append_production_target_execution_proposal(jsonb)',
        'append_production_target_execution_approval_and_receipt(jsonb)',
        'read_production_target_execution_approval_lineage(jsonb)',
        'append_production_target_execution_revocation_and_advance_head(jsonb)',
        'read_production_target_execution_revocation_state(jsonb)',
        'append_production_target_execution_command(jsonb)',
        'read_production_target_execution_command(jsonb)',
        'reserve_production_target_execution(jsonb)',
        'start_production_target_execution_attempt(jsonb)',
        'terminate_production_target_execution_pre_start(jsonb)',
        'finalize_production_target_execution(jsonb)',
        'read_production_target_execution_reservation_reconciliation(jsonb)',
        'resolve_production_target_execution_reservation_absent(jsonb)',
        'resolve_production_target_execution_reservation_present(jsonb)',
        'read_production_target_execution_post_reservation_ambiguity(jsonb)',
        'resolve_production_target_execution_post_reservation_ambiguity(jsonb)',
        'read_production_target_execution_lifecycle(jsonb)',
        'read_production_target_execution_receipt(jsonb)']::text[]) name)
    and (select pg_catalog.array_agg(trigger_row.tgname order by trigger_row.tgname)
      from pg_catalog.pg_trigger trigger_row
      join pg_catalog.pg_class class_row on class_row.oid = trigger_row.tgrelid
      join pg_catalog.pg_namespace namespace_row on namespace_row.oid = class_row.relnamespace
      where namespace_row.nspname = 'ai'
        and class_row.relname like 'production\_target\_execution\_%' escape '\'
        and not trigger_row.tgisinternal) =
      (select pg_catalog.array_agg(name order by name) from pg_catalog.unnest(array[
        'pte_metadata_ao','pte_metadata_truncate','pte_proposals_ao','pte_proposals_truncate',
        'pte_approvals_ao','pte_approvals_truncate','pte_approval_receipts_ao',
        'pte_approval_receipts_truncate','pte_revocation_events_ao',
        'pte_revocation_events_truncate','pte_commands_ao','pte_commands_truncate',
        'pte_reservations_ao','pte_reservations_truncate','pte_attempts_ao',
        'pte_attempts_truncate','pte_execution_receipts_ao','pte_execution_receipts_truncate',
        'pte_clock_evidence_ao','pte_clock_evidence_truncate','pte_reconciliation_ao',
        'pte_reconciliation_truncate','pte_revocation_heads_cas','pte_approval_uses_cas',
        'pte_lifecycles_cas','pte_clock_floors_cas','pte_revocation_heads_delete',
        'pte_revocation_heads_truncate','pte_approval_uses_delete',
        'pte_approval_uses_truncate','pte_lifecycles_delete','pte_lifecycles_truncate',
        'pte_clock_floors_delete','pte_clock_floors_truncate']::text[]) name)
    and not exists (select 1 from pg_catalog.pg_auth_members membership
      where membership.member = pg_catalog.to_regrole(
          'farmos_core_production_target_execution_transaction'))
$pte_read_schema$;

create function ai.advance_production_target_execution_clock_floor(p_input jsonb)
returns void language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_clock_floor$
declare
  evidence jsonb := p_input -> 'clock_evidence';
  current_floor record;
  next_version bigint;
  next_digest text;
begin
  perform ai.assert_production_target_execution_exact_record(
    evidence,
    array['clock_authority_id','clock_authority_revision','evidence_digest','evidence_id',
      'observed_at','observed_lower_bound','provenance_class','recorded_at','schema_version',
      'server_owned_record','status'],
    'evidence_digest', 'farmos.production-target-execution-clock-evidence.v1',
    array['evidence_digest','evidence_id']);
  if evidence is null or evidence ->> 'status' <> 'AVAILABLE'
    or evidence ->> 'schema_version' <>
      'farmos.production-target-execution-clock-evidence.v1'
    or evidence ->> 'clock_authority_id' <>
      'farmos.production-target-execution-trusted-clock.v1'
    or (evidence ->> 'clock_authority_revision')::integer <> 1
    or evidence ->> 'provenance_class' <>
      'SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK'
    or (evidence ->> 'server_owned_record')::boolean is not true
    or evidence ->> 'evidence_id' <>
      'clockev_' || pg_catalog.substr(evidence ->> 'evidence_digest', 8, 64)
    or evidence ->> 'observed_lower_bound' !~
      '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$'
    or (evidence ->> 'observed_lower_bound')::timestamptz >
      (evidence ->> 'observed_at')::timestamptz
    or (evidence ->> 'observed_at')::timestamptz >
      (evidence ->> 'recorded_at')::timestamptz
  then
    raise exception using errcode = 'PTE04', message = 'CLOCK_REGRESSION';
  end if;
  insert into ai.production_target_execution_clock_evidence (
    evidence_id, evidence_digest, clock_authority_id, clock_authority_revision,
    observed_at, observed_lower_bound, record_json
  ) values (
    evidence ->> 'evidence_id', evidence ->> 'evidence_digest',
    evidence ->> 'clock_authority_id', (evidence ->> 'clock_authority_revision')::integer,
    (evidence ->> 'observed_at')::timestamptz,
    (evidence ->> 'observed_lower_bound')::timestamptz, evidence
  ) on conflict (evidence_id) do nothing;
  if exists (select 1 from ai.production_target_execution_clock_evidence stored
    where stored.evidence_id = evidence ->> 'evidence_id'
      and stored.evidence_digest <> evidence ->> 'evidence_digest')
  then
    raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH';
  end if;
  select * into current_floor from ai.production_target_execution_clock_floors floor_row
    where floor_row.clock_authority_id = evidence ->> 'clock_authority_id'
      and floor_row.clock_authority_revision =
        (evidence ->> 'clock_authority_revision')::integer
    for update;
  if found then
    if current_floor.floor_version <>
        (p_input ->> 'expected_clock_floor_version')::bigint
      or (p_input ->> 'expected_persisted_clock_lower_bound')::timestamptz
        is distinct from current_floor.observed_lower_bound
      or (evidence ->> 'observed_at')::timestamptz <
        current_floor.observed_lower_bound
    then
      raise exception using errcode = 'PTE04', message = 'CLOCK_REGRESSION';
    end if;
    next_version := current_floor.floor_version + 1;
    next_digest := ai.production_target_execution_digest(
      'farmos.production-target-execution-clock-floor.v1',
      pg_catalog.jsonb_build_object(
        'clock_authority_id', evidence ->> 'clock_authority_id',
        'clock_authority_revision', (evidence ->> 'clock_authority_revision')::integer,
        'floor_version', next_version,
        'observed_lower_bound', evidence ->> 'observed_at'
      )
    );
    update ai.production_target_execution_clock_floors set
      floor_version = next_version,
      observed_lower_bound = (evidence ->> 'observed_at')::timestamptz,
      floor_digest = next_digest,
      updated_at = pg_catalog.clock_timestamp()
    where clock_authority_id = evidence ->> 'clock_authority_id'
      and clock_authority_revision = (evidence ->> 'clock_authority_revision')::integer
      and floor_version = current_floor.floor_version
      and floor_digest = current_floor.floor_digest;
    if not found then
      raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION';
    end if;
  else
    if (p_input ->> 'expected_clock_floor_version')::bigint <> 0
      or p_input ->> 'expected_persisted_clock_lower_bound' is not null
    then
      raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION';
    end if;
    next_digest := ai.production_target_execution_digest(
      'farmos.production-target-execution-clock-floor.v1',
      pg_catalog.jsonb_build_object(
        'clock_authority_id', evidence ->> 'clock_authority_id',
        'clock_authority_revision', (evidence ->> 'clock_authority_revision')::integer,
        'floor_version', 1,
        'observed_lower_bound', evidence ->> 'observed_at'
      )
    );
    insert into ai.production_target_execution_clock_floors (
      clock_authority_id, clock_authority_revision, floor_version,
      observed_lower_bound, floor_digest
    ) values (
      evidence ->> 'clock_authority_id',
      (evidence ->> 'clock_authority_revision')::integer, 1,
      (evidence ->> 'observed_at')::timestamptz, next_digest
    );
  end if;
end
$pte_clock_floor$;

create function ai.append_production_target_execution_proposal(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_append_proposal$
declare proposal jsonb := p_input -> 'proposal'; existing record;
begin
  perform ai.assert_production_target_execution_schema_identity();
  perform ai.assert_production_target_execution_exact_record(
    proposal,
    array['authority_id','authority_revision','expires_at','operation_scope','proposal_digest',
      'proposal_id','proposed_at','purpose','requested_by_actor_reference_digest','revoked',
      'target_binding_digest'],
    'proposal_digest', 'farmos.production-target-execution-proposal.v1',
    array['proposal_digest']);
  if proposal ->> 'authority_id' <> 'farmos.production-target-execution-proposal.v1'
    or (proposal ->> 'authority_revision')::integer <> 1
    or proposal ->> 'purpose' <> 'PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION'
    or proposal ->> 'operation_scope' not in (
      'ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE',
      'PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL')
    or (proposal ->> 'revoked')::boolean is not false
    or (proposal ->> 'expires_at')::timestamptz <= (proposal ->> 'proposed_at')::timestamptz
    or p_input ->> 'expected_absent_proposal_id' <> proposal ->> 'proposal_id'
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  if (p_input #>> '{clock_evidence,observed_at}')::timestamptz <
      (proposal ->> 'proposed_at')::timestamptz
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >=
      (proposal ->> 'expires_at')::timestamptz
  then raise exception using errcode = 'PTE04', message = 'CLOCK_REGRESSION'; end if;
  select * into existing from ai.production_target_execution_proposals row_value
    where row_value.proposal_id = proposal ->> 'proposal_id' for key share;
  if found then
    if existing.proposal_digest = proposal ->> 'proposal_digest' then
      return pg_catalog.jsonb_build_object('status', 'EXISTING_IDENTICAL',
        'value', existing.record_json);
    end if;
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'PROPOSAL_ID_CONFLICT');
  end if;
  insert into ai.production_target_execution_proposals (
    proposal_id, proposal_digest, authority_id, authority_revision,
    target_binding_digest, operation_scope, expires_at, record_json
  ) values (
    proposal ->> 'proposal_id', proposal ->> 'proposal_digest',
    proposal ->> 'authority_id', (proposal ->> 'authority_revision')::integer,
    proposal ->> 'target_binding_digest', proposal ->> 'operation_scope',
    (proposal ->> 'expires_at')::timestamptz, proposal
  );
  return pg_catalog.jsonb_build_object('status', 'STORED', 'value', proposal);
end
$pte_append_proposal$;

create function ai.append_production_target_execution_approval_and_receipt(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_append_approval$
declare
  approval jsonb := p_input -> 'approval';
  receipt jsonb := p_input -> 'approval_receipt';
  head jsonb := p_input -> 'initial_revocation_head';
  proposal_row record;
  binding_material jsonb;
  binding_digest text;
begin
  perform ai.assert_production_target_execution_schema_identity();
  perform ai.assert_production_target_execution_exact_record(
    approval,
    array['actor_provenance','approval_digest','approval_id','approved_at','authority_id',
      'authority_revision','decision','expires_at','operation_scope','proposal_authority_id',
      'proposal_authority_revision','proposal_digest','proposal_id','revoked',
      'target_binding_digest'],
    'approval_digest', 'farmos.production-target-execution-approval.v1',
    array['approval_digest']);
  perform ai.assert_production_target_execution_exact_record(
    receipt,
    array['approval_digest','approval_id','approval_receipt_digest','approval_receipt_id',
      'authority_id','authority_revision','expires_at','issued_at','operation_scope',
      'proposal_digest','proposal_id','server_owned_record','status','target_binding_digest'],
    'approval_receipt_digest', 'farmos.production-target-execution-approval-receipt.v1',
    array['approval_receipt_digest']);
  perform ai.assert_production_target_execution_exact_record(
    head,
    array['approval_digest','approval_id','approval_receipt_digest','approval_receipt_id',
      'effective_revoked_at','head_digest','head_version','latest_event_digest',
      'latest_event_id','operation_scope','revocation_authority_id',
      'revocation_authority_revision','schema_version','status','target_binding_digest'],
    'head_digest', 'farmos.production-target-execution-approval-revocation-head.v1',
    array['head_digest']);
  if approval ->> 'authority_id' <> 'farmos.production-target-execution-approval.v1'
    or approval ->> 'proposal_authority_id' <>
      'farmos.production-target-execution-proposal.v1'
    or (approval ->> 'authority_revision')::integer <> 1
    or (approval ->> 'proposal_authority_revision')::integer <> 1
    or approval ->> 'decision' <> 'APPROVED'
    or (approval ->> 'revoked')::boolean is not false
    or pg_catalog.jsonb_typeof(approval -> 'actor_provenance') <> 'object'
    or (select pg_catalog.array_agg(key order by key collate pg_catalog."C")
      from pg_catalog.jsonb_object_keys(approval -> 'actor_provenance') key)
      is distinct from array['actor_authority_id','actor_authority_revision',
        'actor_reference_digest','authentication_context_digest','provenance_class',
        'server_owned_record']::text[]
    or approval #>> '{actor_provenance,actor_authority_id}' <>
      'farmos.human-approval-actor-authority.v1'
    or (approval #>> '{actor_provenance,actor_authority_revision}')::integer <> 1
    or approval #>> '{actor_provenance,provenance_class}' <>
      'SERVER_OWNED_AUTHENTICATED_HUMAN_REVIEW'
    or (approval #>> '{actor_provenance,server_owned_record}')::boolean is not true
    or approval #>> '{actor_provenance,actor_reference_digest}' !~ '^sha256:[a-f0-9]{64}$'
    or approval #>> '{actor_provenance,authentication_context_digest}' !~
      '^sha256:[a-f0-9]{64}$'
    or receipt ->> 'authority_id' <>
      'farmos.production-target-execution-approval-receipt.v1'
    or (receipt ->> 'authority_revision')::integer <> 1
    or receipt ->> 'status' <> 'ISSUED'
    or (receipt ->> 'server_owned_record')::boolean is not true
    or head ->> 'schema_version' <>
      'farmos.production-target-execution-approval-revocation-head.v1'
    or head ->> 'revocation_authority_id' <>
      'farmos.production-target-execution-approval-revocation.v1'
    or (head ->> 'revocation_authority_revision')::integer <> 1
    or head ->> 'status' <> 'ACTIVE' or (head ->> 'head_version')::bigint <> 0
    or head -> 'latest_event_id' <> 'null'::jsonb
    or head -> 'latest_event_digest' <> 'null'::jsonb
    or head -> 'effective_revoked_at' <> 'null'::jsonb
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  select * into proposal_row from ai.production_target_execution_proposals proposal
    where proposal.proposal_id = p_input ->> 'proposal_id' for key share;
  if not found or proposal_row.proposal_digest <> p_input ->> 'expected_proposal_digest' then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'PROPOSAL_ID_CONFLICT');
  end if;
  if approval ->> 'proposal_id' <> proposal_row.proposal_id
    or approval ->> 'proposal_digest' <> proposal_row.proposal_digest
    or approval ->> 'target_binding_digest' <> proposal_row.target_binding_digest
    or approval ->> 'operation_scope' <> proposal_row.operation_scope
    or receipt ->> 'proposal_id' <> proposal_row.proposal_id
    or receipt ->> 'proposal_digest' <> proposal_row.proposal_digest
    or receipt ->> 'approval_id' <> approval ->> 'approval_id'
    or receipt ->> 'approval_digest' <> approval ->> 'approval_digest'
    or receipt ->> 'target_binding_digest' <> proposal_row.target_binding_digest
    or receipt ->> 'operation_scope' <> proposal_row.operation_scope
    or head ->> 'approval_id' <> approval ->> 'approval_id'
    or head ->> 'approval_digest' <> approval ->> 'approval_digest'
    or head ->> 'approval_receipt_id' <> receipt ->> 'approval_receipt_id'
    or head ->> 'approval_receipt_digest' <> receipt ->> 'approval_receipt_digest'
    or head ->> 'target_binding_digest' <> proposal_row.target_binding_digest
    or head ->> 'operation_scope' <> proposal_row.operation_scope
    or (approval ->> 'approved_at')::timestamptz <
      (proposal_row.record_json ->> 'proposed_at')::timestamptz
    or (receipt ->> 'issued_at')::timestamptz < (approval ->> 'approved_at')::timestamptz
    or (approval ->> 'expires_at')::timestamptz > proposal_row.expires_at
    or (approval ->> 'expires_at')::timestamptz <=
      (approval ->> 'approved_at')::timestamptz
    or (receipt ->> 'expires_at')::timestamptz > (approval ->> 'expires_at')::timestamptz
    or (receipt ->> 'expires_at')::timestamptz <= (receipt ->> 'issued_at')::timestamptz
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >=
      (receipt ->> 'expires_at')::timestamptz
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz <
      (approval ->> 'approved_at')::timestamptz
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz <
      (receipt ->> 'issued_at')::timestamptz
  then raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH'; end if;
  if exists (select 1 from ai.production_target_execution_approvals stored
    where stored.approval_id = approval ->> 'approval_id')
  then
    if exists (select 1 from ai.production_target_execution_approvals stored
      where stored.approval_id = approval ->> 'approval_id'
        and stored.approval_digest = approval ->> 'approval_digest')
      and exists (select 1 from ai.production_target_execution_approval_receipts stored
        where stored.approval_id = approval ->> 'approval_id'
          and stored.approval_receipt_id = receipt ->> 'approval_receipt_id'
          and stored.approval_receipt_digest = receipt ->> 'approval_receipt_digest'
          and stored.record_json = receipt)
      and exists (select 1 from ai.production_target_execution_approval_revocation_heads stored
        where stored.approval_id = approval ->> 'approval_id'
          and stored.head_version = 0 and stored.head_digest = head ->> 'head_digest'
          and stored.record_json = head)
      and exists (select 1 from ai.production_target_execution_approval_uses stored
        where stored.approval_id = approval ->> 'approval_id'
          and stored.binding_state = 'UNBOUND' and stored.binding_version = 0)
    then
      return pg_catalog.jsonb_build_object('status', 'EXISTING_IDENTICAL', 'value',
        pg_catalog.jsonb_build_object('proposal', proposal_row.record_json,
          'approval', approval, 'approval_receipt', receipt));
    end if;
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_ID_CONFLICT');
  end if;
  insert into ai.production_target_execution_approvals (
    approval_id, approval_digest, proposal_id, proposal_digest, authority_id,
    authority_revision, target_binding_digest, operation_scope, expires_at, record_json
  ) values (
    approval ->> 'approval_id', approval ->> 'approval_digest',
    approval ->> 'proposal_id', approval ->> 'proposal_digest',
    approval ->> 'authority_id', (approval ->> 'authority_revision')::integer,
    approval ->> 'target_binding_digest', approval ->> 'operation_scope',
    (approval ->> 'expires_at')::timestamptz, approval
  );
  insert into ai.production_target_execution_approval_receipts (
    approval_receipt_id, approval_receipt_digest, approval_id, approval_digest,
    proposal_id, proposal_digest, target_binding_digest, operation_scope, record_json
  ) values (
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    receipt ->> 'approval_id', receipt ->> 'approval_digest',
    receipt ->> 'proposal_id', receipt ->> 'proposal_digest',
    receipt ->> 'target_binding_digest', receipt ->> 'operation_scope', receipt
  );
  insert into ai.production_target_execution_approval_revocation_heads (
    approval_id, approval_digest, approval_receipt_id, approval_receipt_digest,
    head_version, head_digest, latest_event_id, latest_event_digest, status,
    effective_revoked_at, record_json
  ) values (
    head ->> 'approval_id', head ->> 'approval_digest',
    head ->> 'approval_receipt_id', head ->> 'approval_receipt_digest',
    (head ->> 'head_version')::bigint, head ->> 'head_digest',
    head ->> 'latest_event_id', head ->> 'latest_event_digest', head ->> 'status',
    (head ->> 'effective_revoked_at')::timestamptz, head
  );
  binding_material := pg_catalog.jsonb_build_object(
    'approval_id', approval ->> 'approval_id',
    'approval_digest', approval ->> 'approval_digest',
    'approval_receipt_id', receipt ->> 'approval_receipt_id',
    'approval_receipt_digest', receipt ->> 'approval_receipt_digest',
    'binding_state', 'UNBOUND', 'binding_version', 0,
    'command_id', null, 'reservation_id', null, 'execution_binding_digest', null
  );
  binding_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-approval-use.v1', binding_material);
  insert into ai.production_target_execution_approval_uses (
    approval_id, approval_digest, approval_receipt_id, approval_receipt_digest,
    binding_state, binding_version, binding_digest
  ) values (
    approval ->> 'approval_id', approval ->> 'approval_digest',
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    'UNBOUND', 0, binding_digest
  );
  return pg_catalog.jsonb_build_object('status', 'STORED', 'value',
    pg_catalog.jsonb_build_object('proposal', proposal_row.record_json,
      'approval', approval, 'approval_receipt', receipt));
end
$pte_append_approval$;

create function ai.read_production_target_execution_approval_lineage(p_input jsonb)
returns jsonb language sql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_approval$
  select pg_catalog.jsonb_build_object(
    'proposal', proposal.record_json,
    'approval', approval.record_json,
    'approval_receipt', receipt.record_json
  ) from ai.production_target_execution_approvals approval
  join ai.production_target_execution_proposals proposal
    on proposal.proposal_id = approval.proposal_id
      and proposal.proposal_digest = approval.proposal_digest
  join ai.production_target_execution_approval_receipts receipt
    on receipt.approval_id = approval.approval_id
      and receipt.approval_digest = approval.approval_digest
  where approval.approval_id = p_input ->> 'approval_id'
    and receipt.approval_receipt_id = p_input ->> 'approval_receipt_id'
$pte_read_approval$;

create function ai.append_production_target_execution_revocation_and_advance_head(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_revoke$
declare event_value jsonb := p_input -> 'event'; head_row record; next_head jsonb;
  approval_row record; receipt_row record;
begin
  perform ai.assert_production_target_execution_schema_identity();
  perform ai.assert_production_target_execution_exact_record(
    event_value,
    array['append_only','approval_digest','approval_id','approval_receipt_digest',
      'approval_receipt_id','effective_at','event_sequence','operation_scope',
      'previous_event_digest','reason','revocation_authority_id',
      'revocation_authority_revision','revocation_event_digest','revocation_event_id',
      'schema_version','server_owned_record','target_binding_digest',
      'trusted_clock_evidence_digest','trusted_clock_evidence_id'],
    'revocation_event_digest',
    'farmos.production-target-execution-approval-revocation-event.v1',
    array['revocation_event_digest','revocation_event_id']);
  if event_value ->> 'schema_version' <>
      'farmos.production-target-execution-approval-revocation-event.v1'
    or event_value ->> 'revocation_authority_id' <>
      'farmos.production-target-execution-approval-revocation.v1'
    or (event_value ->> 'revocation_authority_revision')::integer <> 1
    or event_value ->> 'revocation_event_id' <>
      'approvalrev_' || pg_catalog.substr(event_value ->> 'revocation_event_digest', 8, 64)
    or event_value ->> 'reason' not in (
      'HUMAN_REVIEW_REVOKED','GOVERNANCE_POLICY_REVOKED','SECURITY_AUTHORITY_REVOKED')
    or (event_value ->> 'server_owned_record')::boolean is not true
    or (event_value ->> 'append_only')::boolean is not true
    or event_value ->> 'trusted_clock_evidence_id' <>
      p_input #>> '{clock_evidence,evidence_id}'
    or event_value ->> 'trusted_clock_evidence_digest' <>
      p_input #>> '{clock_evidence,evidence_digest}'
    or (event_value ->> 'effective_at')::timestamptz <>
      (p_input #>> '{clock_evidence,observed_at}')::timestamptz
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  select * into approval_row from ai.production_target_execution_approvals approval
    where approval.approval_id = p_input ->> 'expected_approval_id'
      and approval.approval_digest = p_input ->> 'expected_approval_digest' for key share;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_ID_CONFLICT');
  end if;
  select * into receipt_row from ai.production_target_execution_approval_receipts receipt
    where receipt.approval_receipt_id = p_input ->> 'expected_approval_receipt_id'
      and receipt.approval_receipt_digest = p_input ->> 'expected_approval_receipt_digest'
    for key share;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_RECEIPT_ID_CONFLICT');
  end if;
  if event_value ->> 'approval_id' <> approval_row.approval_id
    or event_value ->> 'approval_digest' <> approval_row.approval_digest
    or event_value ->> 'approval_receipt_id' <> receipt_row.approval_receipt_id
    or event_value ->> 'approval_receipt_digest' <> receipt_row.approval_receipt_digest
    or event_value ->> 'target_binding_digest' <> approval_row.target_binding_digest
    or event_value ->> 'target_binding_digest' <> receipt_row.target_binding_digest
    or event_value ->> 'operation_scope' <> approval_row.operation_scope
    or event_value ->> 'operation_scope' <> receipt_row.operation_scope
    or event_value ->> 'target_binding_digest' <> p_input ->> 'expected_target_binding_digest'
    or event_value ->> 'operation_scope' <> p_input ->> 'expected_operation_scope'
  then raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH'; end if;
  select * into head_row from ai.production_target_execution_approval_revocation_heads head
    where head.approval_id = p_input ->> 'expected_approval_id' for update;
  if not found or head_row.head_version <> (p_input ->> 'expected_head_version')::bigint
    or head_row.head_digest <> p_input ->> 'expected_head_digest'
    or head_row.latest_event_id is distinct from p_input ->> 'expected_latest_event_id'
    or head_row.latest_event_digest is distinct from p_input ->> 'expected_latest_event_digest'
    or head_row.status <> 'ACTIVE'
  then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_REVOCATION_HEAD_VERSION_CONFLICT');
  end if;
  if (event_value ->> 'event_sequence')::bigint <> head_row.head_version + 1
    or event_value ->> 'previous_event_digest' is distinct from head_row.latest_event_digest
  then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_REVOCATION_EVENT_CONFLICT');
  end if;
  insert into ai.production_target_execution_approval_revocation_events (
    revocation_event_id, revocation_event_digest, approval_id, approval_digest,
    approval_receipt_id, approval_receipt_digest, event_sequence,
    previous_event_digest, effective_at, record_json
  ) values (
    event_value ->> 'revocation_event_id', event_value ->> 'revocation_event_digest',
    event_value ->> 'approval_id', event_value ->> 'approval_digest',
    event_value ->> 'approval_receipt_id', event_value ->> 'approval_receipt_digest',
    (event_value ->> 'event_sequence')::bigint,
    event_value ->> 'previous_event_digest',
    (event_value ->> 'effective_at')::timestamptz, event_value
  );
  next_head := head_row.record_json || pg_catalog.jsonb_build_object(
    'status', 'REVOKED', 'head_version', head_row.head_version + 1,
    'latest_event_id', event_value ->> 'revocation_event_id',
    'latest_event_digest', event_value ->> 'revocation_event_digest',
    'effective_revoked_at', event_value ->> 'effective_at'
  );
  next_head := next_head || pg_catalog.jsonb_build_object(
    'head_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-approval-revocation-head.v1',
      next_head - 'head_digest'));
  update ai.production_target_execution_approval_revocation_heads set
    head_version = head_row.head_version + 1,
    head_digest = next_head ->> 'head_digest',
    latest_event_id = event_value ->> 'revocation_event_id',
    latest_event_digest = event_value ->> 'revocation_event_digest',
    status = 'REVOKED',
    effective_revoked_at = (event_value ->> 'effective_at')::timestamptz,
    record_json = next_head,
    updated_at = pg_catalog.clock_timestamp()
  where approval_id = head_row.approval_id
    and head_version = (p_input ->> 'expected_head_version')::bigint
    and head_digest = p_input ->> 'expected_head_digest';
  if not found then
    raise exception using errcode = 'PTE06', message = 'REVOCATION_CONFLICT';
  end if;
  return pg_catalog.jsonb_build_object('status', 'STORED', 'value',
    pg_catalog.jsonb_build_object('head', next_head, 'latest_event', event_value));
end
$pte_revoke$;

create function ai.read_production_target_execution_revocation_state(p_input jsonb)
returns jsonb language plpgsql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_revocation$
declare head_row record; event_json jsonb;
begin
  perform ai.assert_production_target_execution_schema_identity();
  select * into head_row from ai.production_target_execution_approval_revocation_heads head
    where head.approval_id = p_input ->> 'approval_id';
  if not found then
    return pg_catalog.jsonb_build_object('status', 'EXACT_STATE_ABSENT');
  end if;
  if head_row.approval_digest <> p_input ->> 'approval_digest'
    or head_row.approval_receipt_id <> p_input ->> 'approval_receipt_id'
    or head_row.approval_receipt_digest <> p_input ->> 'approval_receipt_digest'
    or head_row.head_version <> (p_input ->> 'expected_head_version')::bigint
    or head_row.head_digest <> p_input ->> 'expected_head_digest'
    or head_row.latest_event_id is distinct from p_input ->> 'exact_latest_event_id'
    or head_row.latest_event_digest is distinct from p_input ->> 'exact_latest_event_digest'
  then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_REVOCATION_HEAD_VERSION_CONFLICT');
  end if;
  select event.record_json into event_json
    from ai.production_target_execution_approval_revocation_events event
    where event.revocation_event_id = head_row.latest_event_id
      and event.revocation_event_digest = head_row.latest_event_digest;
  if head_row.latest_event_id is not null and not found then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_REVOCATION_EVENT_CONFLICT');
  end if;
  return pg_catalog.jsonb_build_object('status', 'EXACT_STATE_FOUND', 'state',
    pg_catalog.jsonb_build_object('head', head_row.record_json,
      'latest_event', event_json));
end
$pte_read_revocation$;

create function ai.append_production_target_execution_command(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_append_command$
declare command_value jsonb := p_input -> 'command'; initial_lifecycle jsonb;
  proposal_row record; approval_row record; receipt_row record; clock_row record;
begin
  perform ai.assert_production_target_execution_schema_identity();
  perform ai.assert_production_target_execution_exact_record(
    command_value,
    array['approval_digest','approval_id','approval_receipt_digest','approval_receipt_id',
      'command_authority_id','command_authority_revision','command_id','command_record_digest',
      'execution_binding_digest','expires_at','formal_evidence_eligible','human_approval_required',
      'identity_authority_id','issued_at','limits','manifest_effect','noncanonical',
      'nonce_digest','operation','operation_artifact_authority_id','operation_artifact_sha256',
      'phase_b_authority_bundle','phase_b_authority_bundle_digest',
      'production_evidence_receipt_created_by_phase_c','proposal_digest','proposal_id','purpose',
      'readiness_auto_promotion','result_reusable','runtime_effect','schema_version','scope_digest',
      'source_build_identity_digest','target_binding_digest','target_manifest_id',
      'trusted_clock_evidence_digest','trusted_clock_evidence_id','v5_artifact_sha256',
      'v5_authority_id'],
    'command_record_digest', 'farmos.production-target-execution-command-envelope.v1',
    array['command_record_digest']);
  if command_value ->> 'execution_binding_digest' <>
      ai.production_target_execution_digest(
        'farmos.production-target-execution-binding.v1',
        command_value - array['execution_binding_digest','command_record_digest'])
    or command_value ->> 'phase_b_authority_bundle_digest' <>
      ai.production_target_execution_digest(
        'farmos.production-target-phase-b-authority-bundle.v1',
        command_value -> 'phase_b_authority_bundle')
    or command_value -> 'phase_b_authority_bundle' <> $phase_b${
      "provider_credential_authority_id":"farmos.production-target-provider-credential-authority.v1",
      "provider_credential_authority_revision":1,
      "provider_credential_and_broker_policy_digest":"sha256:d79621815f7993a468d2ddd6766d239a93547fccb7e80e6886860383c930544f",
      "provider_broker_authority_id":"farmos.production-target-provider-credential-broker.v1",
      "provider_broker_authority_revision":1,
      "database_credential_authority_id":"farmos.production-target-database-credential-authority.v1",
      "database_credential_authority_revision":1,
      "database_credential_and_broker_policy_digest":"sha256:8eb7a4f79f354ab4dea252e72c2add8df3b348d565bdb4ca62aeb3f555ce73f1",
      "database_broker_authority_id":"farmos.production-target-database-credential-broker.v1",
      "database_broker_authority_revision":1,
      "connection_authority_id":"farmos.production-target-connection-authority.v1",
      "connection_authority_revision":1,
      "connection_policy_digest":"sha256:886e34a358c2b292f3e8d5212a4eaef69166d7bebbeaeca507cb0fe42e8505ae",
      "collector_authority_id":"farmos.production-target-collector-authority.v1",
      "collector_authority_revision":1,
      "collector_policy_digest":"sha256:f90a18058be3e18f61f6b367f14e4af130a754a5e4175f467b650f9bb6414c95",
      "principal_authority_id":"farmos.production-target-principal-capability-authority.v1",
      "principal_authority_revision":1,
      "principal_policy_digest":"sha256:20edd4729924bc941266d7f8536875d20581f641d5d6ebff1ed160675d1fa254",
      "provider_tls_authority_id":"farmos.production-target-provider-tls-attestation-authority.v1",
      "provider_tls_authority_revision":1,
      "provider_tls_policy_digest":"sha256:e510ce7d9c73175cfcb916fc3c6cbdb258b3b3b479bce208c52831ee6a8c3564",
      "postgres_tls_authority_id":"farmos.production-target-postgres-tls-attestation-authority.v1",
      "postgres_tls_authority_revision":1,
      "postgres_tls_policy_digest":"sha256:9c18a4c1016fd6a80a05a7559aca73fe1772a9449d8de5200418a15713e7e0de"
    }$phase_b$::jsonb
    or command_value ->> 'schema_version' <>
      'farmos.production-target-execution-command-envelope.v1'
    or command_value ->> 'command_authority_id' <>
      'farmos.production-target-execution-command-authority.v1'
    or (command_value ->> 'command_authority_revision')::integer <> 1
    or command_value ->> 'purpose' <>
      'PRODUCTION_TARGET_IDENTITY_AUTHORITY_QUALIFICATION'
    or (command_value #>> '{limits,automatic_retry}')::integer <> 0
    or command_value -> 'limits' <> $limits${"maximum_provider_calls":1,
      "maximum_database_connections":1,"automatic_retry":0}$limits$::jsonb
    or (command_value ->> 'human_approval_required')::boolean is not true
    or (command_value ->> 'result_reusable')::boolean is not false
    or (command_value ->> 'runtime_effect')::boolean is not false
    or (command_value ->> 'manifest_effect')::boolean is not false
    or (command_value ->> 'readiness_auto_promotion')::boolean is not false
    or (command_value ->> 'production_evidence_receipt_created_by_phase_c')::boolean
      is not false
    or (command_value ->> 'expires_at')::timestamptz <=
      (command_value ->> 'issued_at')::timestamptz
    or command_value ->> 'nonce_digest' <> p_input ->> 'expected_nonce_absent'
    or (command_value ->> 'operation' =
        'ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE' and (
      command_value ->> 'identity_authority_id' <>
        'farmos.production-target-evidence-command-id.v1'
      or (command_value ->> 'noncanonical')::boolean is not false
      or (command_value ->> 'formal_evidence_eligible')::boolean is not true
      or command_value ->> 'operation_artifact_authority_id' <>
        'farmos.production-target-identity-minimal-observation-query.v1'
      or command_value ->> 'operation_artifact_sha256' <>
        'sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805'
      or command_value ->> 'v5_authority_id' <> 'farmos.production-target-identity-query.v5'
      or command_value ->> 'v5_artifact_sha256' <>
        'sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52'
      or command_value ->> 'command_id' <> 'g2cmd_' || pg_catalog.encode(
        pg_catalog.sha256(pg_catalog.convert_to(
          ai.production_target_execution_canonical_jsonb(pg_catalog.jsonb_build_object(
            'approval_id', command_value ->> 'approval_id',
            'approval_receipt_id', command_value ->> 'approval_receipt_id',
            'authority_id', command_value ->> 'identity_authority_id',
            'nonce_digest', command_value ->> 'nonce_digest',
            'operation', command_value ->> 'operation',
            'proposal_id', command_value ->> 'proposal_id',
            'query_artifact_sha256', command_value ->> 'operation_artifact_sha256',
            'target_binding_digest', command_value ->> 'target_binding_digest')), 'UTF8')),
        'hex'))
    or (command_value ->> 'operation' =
        'PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL' and (
      command_value ->> 'identity_authority_id' <>
        'farmos.production-target-noncanonical-capability-probe-command-id.v1'
      or (command_value ->> 'noncanonical')::boolean is not true
      or (command_value ->> 'formal_evidence_eligible')::boolean is not false
      or command_value ->> 'operation_artifact_authority_id' <>
        'farmos.production-target-external-feasibility-policy.v1'
      or command_value ->> 'command_id' <> 'probecmd_' || pg_catalog.substr(
        ai.production_target_execution_digest(
          'farmos.production-target-noncanonical-capability-probe-command-id.v1',
          pg_catalog.jsonb_build_object(
            'approval_id', command_value ->> 'approval_id',
            'approval_receipt_id', command_value ->> 'approval_receipt_id',
            'authority_id', command_value ->> 'identity_authority_id',
            'nonce_digest', command_value ->> 'nonce_digest',
            'operation', command_value ->> 'operation',
            'operation_artifact_authority_id',
              command_value ->> 'operation_artifact_authority_id',
            'operation_artifact_sha256', command_value ->> 'operation_artifact_sha256',
            'proposal_id', command_value ->> 'proposal_id',
            'target_binding_digest', command_value ->> 'target_binding_digest')), 8, 64))
    or command_value ->> 'operation' not in (
      'ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE',
      'PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL')
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  select * into clock_row from ai.production_target_execution_clock_evidence evidence
    where evidence.evidence_id = command_value ->> 'trusted_clock_evidence_id'
      and evidence.evidence_digest = command_value ->> 'trusted_clock_evidence_digest'
    for key share;
  if not found or clock_row.observed_at <> (command_value ->> 'issued_at')::timestamptz
    or clock_row.observed_at >= (command_value ->> 'expires_at')::timestamptz
  then raise exception using errcode = 'PTE04', message = 'CLOCK_REGRESSION'; end if;
  select * into proposal_row from ai.production_target_execution_proposals proposal
    where proposal.proposal_id = command_value ->> 'proposal_id'
      and proposal.proposal_digest = command_value ->> 'proposal_digest' for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED'); end if;
  select * into approval_row from ai.production_target_execution_approvals approval
    where approval.approval_id = p_input ->> 'expected_approval_id'
      and approval.approval_digest = p_input ->> 'expected_approval_digest' for key share;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_ID_CONFLICT');
  end if;
  select * into receipt_row from ai.production_target_execution_approval_receipts receipt
    where receipt.approval_receipt_id = p_input ->> 'expected_approval_receipt_id'
      and receipt.approval_receipt_digest = p_input ->> 'expected_approval_receipt_digest'
    for key share;
  if not found then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_RECEIPT_ID_CONFLICT');
  end if;
  if command_value ->> 'approval_id' <> approval_row.approval_id
    or command_value ->> 'approval_digest' <> approval_row.approval_digest
    or command_value ->> 'approval_receipt_id' <> receipt_row.approval_receipt_id
    or command_value ->> 'approval_receipt_digest' <> receipt_row.approval_receipt_digest
    or command_value ->> 'proposal_id' <> proposal_row.proposal_id
    or command_value ->> 'proposal_digest' <> proposal_row.proposal_digest
    or command_value ->> 'target_binding_digest' <> proposal_row.target_binding_digest
    or command_value ->> 'target_binding_digest' <> approval_row.target_binding_digest
    or command_value ->> 'target_binding_digest' <> receipt_row.target_binding_digest
    or command_value ->> 'operation' <> approval_row.operation_scope
    or (command_value ->> 'issued_at')::timestamptz <>
      clock_row.observed_at
    or (command_value ->> 'issued_at')::timestamptz <
      (receipt_row.record_json ->> 'issued_at')::timestamptz
    or (command_value ->> 'expires_at')::timestamptz > proposal_row.expires_at
    or (command_value ->> 'expires_at')::timestamptz > approval_row.expires_at
    or (command_value ->> 'expires_at')::timestamptz >
      (receipt_row.record_json ->> 'expires_at')::timestamptz
    or command_value ->> 'operation' <> receipt_row.operation_scope
  then raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH'; end if;
  if exists (select 1 from ai.production_target_execution_commands stored
    where stored.command_id = command_value ->> 'command_id')
  then
    if exists (select 1 from ai.production_target_execution_commands stored
      where stored.command_id = command_value ->> 'command_id'
        and stored.command_record_digest = command_value ->> 'command_record_digest'
        and stored.execution_binding_digest = command_value ->> 'execution_binding_digest')
    then
      return pg_catalog.jsonb_build_object('status', 'EXISTING_IDENTICAL',
        'value', command_value);
    end if;
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'COMMAND_BINDING_CONFLICT');
  end if;
  insert into ai.production_target_execution_commands (
    command_id, command_record_digest, execution_binding_digest, nonce_digest,
    proposal_id, proposal_digest, approval_id, approval_digest,
    approval_receipt_id, approval_receipt_digest, phase_b_authority_bundle_digest,
    target_binding_digest, record_json
  ) values (
    command_value ->> 'command_id', command_value ->> 'command_record_digest',
    command_value ->> 'execution_binding_digest', command_value ->> 'nonce_digest',
    command_value ->> 'proposal_id', command_value ->> 'proposal_digest',
    command_value ->> 'approval_id', command_value ->> 'approval_digest',
    command_value ->> 'approval_receipt_id', command_value ->> 'approval_receipt_digest',
    command_value ->> 'phase_b_authority_bundle_digest',
    command_value ->> 'target_binding_digest', command_value
  );
  initial_lifecycle := pg_catalog.jsonb_build_object(
    'schema_version', 'farmos.production-target-execution-lifecycle-record.v1',
    'lifecycle_authority_id', 'farmos.production-target-execution-lifecycle.v1',
    'lifecycle_authority_revision', 1,
    'command_id', command_value ->> 'command_id',
    'command_record_digest', command_value ->> 'command_record_digest',
    'execution_binding_digest', command_value ->> 'execution_binding_digest',
    'proposal_id', command_value ->> 'proposal_id',
    'proposal_digest', command_value ->> 'proposal_digest',
    'approval_id', command_value ->> 'approval_id',
    'approval_digest', command_value ->> 'approval_digest',
    'approval_receipt_id', command_value ->> 'approval_receipt_id',
    'approval_receipt_digest', command_value ->> 'approval_receipt_digest',
    'state', 'UNRESERVED', 'state_version', 0,
    'approval_use_state', 'NEVER_RESERVED',
    'reservation_id', null, 'reservation_digest', null,
    'attempt_id', null, 'attempt_digest', null,
    'terminal_receipt_id', null, 'terminal_receipt_digest', null,
    'updated_clock_evidence_id', command_value ->> 'trusted_clock_evidence_id',
    'updated_clock_evidence_digest', command_value ->> 'trusted_clock_evidence_digest',
    'automatic_retry', 0, 'external_execution_authorized', false
  );
  initial_lifecycle := initial_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1', initial_lifecycle));
  insert into ai.production_target_execution_lifecycles (
    command_id, command_record_digest, execution_binding_digest,
    approval_id, approval_digest, approval_receipt_id, approval_receipt_digest,
    state, state_version, lifecycle_record_digest, approval_use_state, record_json
  ) values (
    command_value ->> 'command_id', command_value ->> 'command_record_digest',
    command_value ->> 'execution_binding_digest', command_value ->> 'approval_id',
    command_value ->> 'approval_digest', command_value ->> 'approval_receipt_id',
    command_value ->> 'approval_receipt_digest', 'UNRESERVED', 0,
    initial_lifecycle ->> 'lifecycle_record_digest', 'NEVER_RESERVED', initial_lifecycle
  );
  return pg_catalog.jsonb_build_object('status', 'STORED', 'value', command_value);
end
$pte_append_command$;

create function ai.read_production_target_execution_command(p_input jsonb)
returns jsonb language sql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_command$
  select command_row.record_json from ai.production_target_execution_commands command_row
  where command_row.command_id = p_input ->> 'command_id'
    and command_row.execution_binding_digest = p_input ->> 'execution_binding_digest'
$pte_read_command$;

create function ai.reserve_production_target_execution(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_reserve$
declare
  command_value jsonb := p_input -> 'command'; head_row record; use_row record;
  proposal_row record; approval_row record; receipt_row record; command_row record;
  lifecycle_row record; generated_reservation_id text; generated_reservation_digest text;
  next_lifecycle jsonb; next_use_material jsonb; next_use_digest text;
  reconciliation jsonb; reconciliation_id text; reconciliation_digest text;
begin
  perform ai.assert_production_target_execution_schema_identity();
  if p_input ->> 'expected_lifecycle_state' is distinct from 'UNRESERVED'
    or p_input -> 'expected_approval_unbound_to_any_command' is distinct from 'true'::jsonb
    or p_input -> 'advance_persisted_clock_lower_bound_to_evidence_observed_at'
      is distinct from 'true'::jsonb
    or p_input ->> 'required_revalidation_provenance' is distinct from
      'PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION'
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  select * into proposal_row from ai.production_target_execution_proposals proposal
    where proposal.proposal_id = command_value ->> 'proposal_id'
      and proposal.proposal_digest = command_value ->> 'proposal_digest' for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into approval_row from ai.production_target_execution_approvals approval
    where approval.approval_id = p_input ->> 'expected_approval_id'
      and approval.approval_digest = p_input ->> 'expected_approval_digest' for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into receipt_row from ai.production_target_execution_approval_receipts receipt
    where receipt.approval_receipt_id = p_input ->> 'expected_approval_receipt_id'
      and receipt.approval_receipt_digest = p_input ->> 'expected_approval_receipt_digest'
    for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into head_row from ai.production_target_execution_approval_revocation_heads head
    where head.approval_id = p_input ->> 'expected_approval_id' for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = p_input ->> 'expected_approval_id' for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into command_row from ai.production_target_execution_commands stored_command
    where stored_command.command_id = command_value ->> 'command_id'
      and stored_command.command_record_digest = p_input ->> 'expected_command_record_digest'
      and stored_command.execution_binding_digest = p_input ->> 'expected_execution_binding_digest'
      and stored_command.phase_b_authority_bundle_digest =
        p_input ->> 'expected_phase_b_authority_bundle_digest'
      and stored_command.target_binding_digest = p_input ->> 'expected_target_binding_digest'
    for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = command_value ->> 'command_id' for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  if head_row.status <> 'ACTIVE'
    or head_row.head_version <>
      (p_input ->> 'expected_approval_revocation_head_version')::bigint
    or head_row.head_digest <> p_input ->> 'expected_approval_revocation_head_digest'
    or head_row.latest_event_digest is distinct from
      p_input ->> 'expected_approval_revocation_latest_event_digest'
  then
    return pg_catalog.jsonb_build_object('status', 'REJECTED',
      'reason', 'APPROVAL_REVOKED', 'execution_allowed', false);
  end if;
  if use_row.binding_state <> 'UNBOUND' or use_row.binding_version <> 0 then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'APPROVAL_REUSE_CONFLICT', 'execution_allowed', false);
  end if;
  if command_row.record_json <> command_value
    or approval_row.proposal_id <> proposal_row.proposal_id
    or receipt_row.approval_id <> approval_row.approval_id
    or approval_row.target_binding_digest <> p_input ->> 'expected_target_binding_digest'
    or receipt_row.target_binding_digest <> p_input ->> 'expected_target_binding_digest'
    or proposal_row.target_binding_digest <> p_input ->> 'expected_target_binding_digest'
    or approval_row.operation_scope <> command_row.record_json ->> 'operation'
    or receipt_row.operation_scope <> command_row.record_json ->> 'operation'
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >= approval_row.expires_at
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >=
      (receipt_row.record_json ->> 'expires_at')::timestamptz
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >=
      (command_row.record_json ->> 'expires_at')::timestamptz
  then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  if lifecycle_row.state <> 'UNRESERVED'
    or lifecycle_row.state_version <> (p_input ->> 'expected_lifecycle_version')::bigint
  then
    return pg_catalog.jsonb_build_object('status', 'CONFLICT',
      'conflict', 'RESERVATION_VERSION_CONFLICT', 'execution_allowed', false);
  end if;
  generated_reservation_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-postgres-reservation.v1',
    pg_catalog.jsonb_build_object(
      'command_id', command_value ->> 'command_id',
      'execution_binding_digest', command_value ->> 'execution_binding_digest',
      'approval_id', command_value ->> 'approval_id',
      'approval_receipt_id', command_value ->> 'approval_receipt_id',
      'clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
      'lifecycle_version', lifecycle_row.state_version + 1
    ));
  generated_reservation_id :=
    'reservation.' || pg_catalog.substr(generated_reservation_digest, 8, 64);
  if p_input ->> 'intended_reservation_id' <> generated_reservation_id
    or p_input ->> 'intended_reservation_digest' <> generated_reservation_digest
  then raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH'; end if;
  insert into ai.production_target_execution_reservations (
    reservation_id, reservation_digest, command_id, command_record_digest,
    approval_id, approval_digest, approval_receipt_id, approval_receipt_digest,
    execution_binding_digest, record_json
  ) values (
    generated_reservation_id, generated_reservation_digest, command_value ->> 'command_id',
    command_value ->> 'command_record_digest', command_value ->> 'approval_id',
    command_value ->> 'approval_digest', command_value ->> 'approval_receipt_id',
    command_value ->> 'approval_receipt_digest',
    command_value ->> 'execution_binding_digest',
    pg_catalog.jsonb_build_object('reservation_id', generated_reservation_id,
      'reservation_digest', generated_reservation_digest,
      'command_id', command_value ->> 'command_id',
      'command_record_digest', command_value ->> 'command_record_digest',
      'approval_id', command_value ->> 'approval_id',
      'approval_digest', command_value ->> 'approval_digest',
      'approval_receipt_id', command_value ->> 'approval_receipt_id',
      'approval_receipt_digest', command_value ->> 'approval_receipt_digest',
      'execution_binding_digest', command_value ->> 'execution_binding_digest')
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', 'RESERVED_NOT_STARTED', 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', 'RESERVED', 'reservation_id', generated_reservation_id,
    'reservation_digest', generated_reservation_digest,
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}'
  );
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = 'RESERVED_NOT_STARTED', state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = 'RESERVED', reservation_id = generated_reservation_id,
    reservation_digest = generated_reservation_digest, record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id
    and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  next_use_material := pg_catalog.jsonb_build_object(
    'approval_id', use_row.approval_id, 'approval_digest', use_row.approval_digest,
    'approval_receipt_id', use_row.approval_receipt_id,
    'approval_receipt_digest', use_row.approval_receipt_digest,
    'binding_state', 'BOUND', 'binding_version', use_row.binding_version + 1,
    'command_id', command_value ->> 'command_id',
    'reservation_id', generated_reservation_id,
    'execution_binding_digest', command_value ->> 'execution_binding_digest');
  next_use_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-approval-use.v1', next_use_material);
  update ai.production_target_execution_approval_uses set
    binding_state = 'BOUND', binding_version = use_row.binding_version + 1,
    binding_digest = next_use_digest, command_id = command_value ->> 'command_id',
    reservation_id = generated_reservation_id,
    execution_binding_digest = command_value ->> 'execution_binding_digest',
    updated_at = pg_catalog.clock_timestamp()
  where approval_id = use_row.approval_id and binding_version = use_row.binding_version
    and binding_digest = use_row.binding_digest;
  if not found then raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND'; end if;
  reconciliation := pg_catalog.jsonb_build_object(
    'schema_version', 'farmos.production-target-execution-revocation-revalidation-evidence.v1',
    'provenance', 'PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION',
    'transition', 'RESERVATION', 'command_id', command_value ->> 'command_id',
    'execution_binding_digest', command_value ->> 'execution_binding_digest',
    'approval_id', command_value ->> 'approval_id',
    'approval_digest', command_value ->> 'approval_digest',
    'observed_head_version', head_row.head_version,
    'observed_head_digest', head_row.head_digest,
    'observed_latest_event_digest', head_row.latest_event_digest,
    'observed_head', head_row.record_json, 'observed_status', 'ACTIVE',
    'lifecycle_state', 'RESERVED_NOT_STARTED',
    'lifecycle_version', lifecycle_row.state_version + 1,
    'lifecycle_record_digest', next_lifecycle ->> 'lifecycle_record_digest',
    'persisted_atomically_with_lifecycle_transition', true);
  reconciliation_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-revocation-revalidation-evidence.v1', reconciliation);
  reconciliation := reconciliation || pg_catalog.jsonb_build_object(
    'observation_digest', reconciliation_digest);
  reconciliation_id := 'reconciliation.' || pg_catalog.substr(reconciliation_digest, 8, 64);
  insert into ai.production_target_execution_reconciliation_records (
    reconciliation_id, reconciliation_digest, record_kind, command_id,
    execution_binding_digest, lifecycle_state_version, record_json
  ) values (
    reconciliation_id, reconciliation_digest, 'REVOCATION_REVALIDATION',
    command_value ->> 'command_id', command_value ->> 'execution_binding_digest',
    lifecycle_row.state_version + 1, reconciliation
  );
  return pg_catalog.jsonb_build_object('status', 'RESERVED', 'lifecycle', next_lifecycle,
    'revocation_revalidation', reconciliation);
end
$pte_reserve$;

create function ai.start_production_target_execution_attempt(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_attempt$
declare approval_row record; receipt_row record; head_row record; use_row record;
  command_row record; lifecycle_row record;
  reservation_row record; next_lifecycle jsonb; evidence jsonb; evidence_digest text;
  evidence_id text;
begin
  perform ai.assert_production_target_execution_schema_identity();
  if p_input ->> 'expected_lifecycle_state' is distinct from 'RESERVED_NOT_STARTED'
    or p_input -> 'advance_persisted_clock_lower_bound_to_evidence_observed_at'
      is distinct from 'true'::jsonb
    or p_input ->> 'required_revalidation_provenance' is distinct from
      'PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION'
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  select * into approval_row from ai.production_target_execution_approvals approval
    where approval.approval_id = (
      select lifecycle.approval_id from ai.production_target_execution_lifecycles lifecycle
      where lifecycle.command_id = p_input ->> 'command_id') for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into receipt_row from ai.production_target_execution_approval_receipts receipt
    where receipt.approval_receipt_id = (
      select lifecycle.approval_receipt_id
      from ai.production_target_execution_lifecycles lifecycle
      where lifecycle.command_id = p_input ->> 'command_id') for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into head_row from ai.production_target_execution_approval_revocation_heads head
    where head.approval_id = (
      select lifecycle.approval_id from ai.production_target_execution_lifecycles lifecycle
      where lifecycle.command_id = p_input ->> 'command_id') for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = head_row.approval_id for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into command_row from ai.production_target_execution_commands command_value
    where command_value.command_id = p_input ->> 'command_id' for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id' for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into reservation_row from ai.production_target_execution_reservations reservation
    where reservation.reservation_id = p_input ->> 'reservation_id' for key share;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  if head_row.status <> 'ACTIVE'
    or head_row.head_version <>
      (p_input ->> 'expected_approval_revocation_head_version')::bigint
    or head_row.head_digest <> p_input ->> 'expected_approval_revocation_head_digest'
    or head_row.latest_event_digest is distinct from
      p_input ->> 'expected_approval_revocation_latest_event_digest'
  then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'APPROVAL_REVOKED', 'execution_allowed', false); end if;
  if use_row.binding_state <> 'BOUND' or use_row.command_id <> p_input ->> 'command_id'
    or use_row.reservation_id <> p_input ->> 'reservation_id'
    or command_row.command_record_digest <> p_input ->> 'expected_command_record_digest'
    or command_row.execution_binding_digest <> p_input ->> 'execution_binding_digest'
    or command_row.phase_b_authority_bundle_digest <>
      p_input ->> 'expected_phase_b_authority_bundle_digest'
    or command_row.target_binding_digest <> p_input ->> 'expected_target_binding_digest'
    or lifecycle_row.state <> 'RESERVED_NOT_STARTED'
    or lifecycle_row.state_version <> (p_input ->> 'expected_lifecycle_version')::bigint
    or reservation_row.reservation_digest <> p_input ->> 'reservation_digest'
    or reservation_row.command_id <> p_input ->> 'command_id'
    or reservation_row.execution_binding_digest <> p_input ->> 'execution_binding_digest'
    or approval_row.approval_digest <> lifecycle_row.approval_digest
    or receipt_row.approval_receipt_digest <> lifecycle_row.approval_receipt_digest
    or receipt_row.approval_id <> approval_row.approval_id
    or p_input ->> 'expected_approval_digest' <> approval_row.approval_digest
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >= approval_row.expires_at
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >=
      (receipt_row.record_json ->> 'expires_at')::timestamptz
    or (p_input #>> '{clock_evidence,observed_at}')::timestamptz >=
      (command_row.record_json ->> 'expires_at')::timestamptz
  then return pg_catalog.jsonb_build_object('status', 'CONFLICT',
    'conflict', 'ATTEMPT_VERSION_CONFLICT', 'execution_allowed', false); end if;
  if p_input ->> 'attempt_digest' <> ai.production_target_execution_digest(
    'farmos.production-target-execution-postgres-attempt.v1',
    pg_catalog.jsonb_build_object(
      'attempt_id', p_input ->> 'attempt_id',
      'reservation_id', p_input ->> 'reservation_id',
      'reservation_digest', p_input ->> 'reservation_digest',
      'command_id', p_input ->> 'command_id',
      'execution_binding_digest', p_input ->> 'execution_binding_digest'))
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  insert into ai.production_target_execution_attempts (
    attempt_id, attempt_digest, reservation_id, reservation_digest,
    command_id, execution_binding_digest, record_json
  ) values (
    p_input ->> 'attempt_id', p_input ->> 'attempt_digest',
    p_input ->> 'reservation_id', p_input ->> 'reservation_digest',
    p_input ->> 'command_id', p_input ->> 'execution_binding_digest',
    pg_catalog.jsonb_build_object('attempt_id', p_input ->> 'attempt_id',
      'attempt_digest', p_input ->> 'attempt_digest',
      'reservation_id', p_input ->> 'reservation_id',
      'reservation_digest', p_input ->> 'reservation_digest',
      'command_id', p_input ->> 'command_id',
      'execution_binding_digest', p_input ->> 'execution_binding_digest')
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', 'ATTEMPT_STARTED', 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', 'QUARANTINED', 'attempt_id', p_input ->> 'attempt_id',
    'attempt_digest', p_input ->> 'attempt_digest',
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}');
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = 'ATTEMPT_STARTED', state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = 'QUARANTINED', attempt_id = p_input ->> 'attempt_id',
    attempt_digest = p_input ->> 'attempt_digest', record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id
    and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  update ai.production_target_execution_approval_uses set
    binding_state = 'CONSUMED', binding_version = use_row.binding_version + 1,
    binding_digest = ai.production_target_execution_digest(
      'farmos.production-target-execution-approval-use.v1',
      pg_catalog.jsonb_build_object(
        'approval_id', use_row.approval_id, 'approval_digest', use_row.approval_digest,
        'approval_receipt_id', use_row.approval_receipt_id,
        'approval_receipt_digest', use_row.approval_receipt_digest,
        'binding_state', 'CONSUMED', 'binding_version', use_row.binding_version + 1,
        'command_id', use_row.command_id, 'reservation_id', use_row.reservation_id,
        'execution_binding_digest', use_row.execution_binding_digest)),
    updated_at = pg_catalog.clock_timestamp()
  where approval_id = use_row.approval_id and binding_version = use_row.binding_version
    and binding_digest = use_row.binding_digest;
  if not found then raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND'; end if;
  evidence := pg_catalog.jsonb_build_object(
    'schema_version', 'farmos.production-target-execution-revocation-revalidation-evidence.v1',
    'provenance', 'PERSISTENCE_TRANSACTION_AUTHORITATIVE_REVOCATION_REVALIDATION',
    'transition', 'ATTEMPT_START', 'command_id', p_input ->> 'command_id',
    'execution_binding_digest', p_input ->> 'execution_binding_digest',
    'approval_id', lifecycle_row.approval_id, 'approval_digest', lifecycle_row.approval_digest,
    'observed_head_version', head_row.head_version,
    'observed_head_digest', head_row.head_digest,
    'observed_latest_event_digest', head_row.latest_event_digest,
    'observed_head', head_row.record_json, 'observed_status', 'ACTIVE',
    'lifecycle_state', 'ATTEMPT_STARTED',
    'lifecycle_version', lifecycle_row.state_version + 1,
    'lifecycle_record_digest', next_lifecycle ->> 'lifecycle_record_digest',
    'persisted_atomically_with_lifecycle_transition', true);
  evidence_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-revocation-revalidation-evidence.v1', evidence);
  evidence := evidence || pg_catalog.jsonb_build_object('observation_digest', evidence_digest);
  evidence_id := 'reconciliation.' || pg_catalog.substr(evidence_digest, 8, 64);
  insert into ai.production_target_execution_reconciliation_records (
    reconciliation_id, reconciliation_digest, record_kind, command_id,
    execution_binding_digest, lifecycle_state_version, record_json
  ) values (evidence_id, evidence_digest, 'REVOCATION_REVALIDATION',
    p_input ->> 'command_id', p_input ->> 'execution_binding_digest',
    lifecycle_row.state_version + 1, evidence);
  return pg_catalog.jsonb_build_object('status', 'ATTEMPT_STARTED',
    'lifecycle', next_lifecycle,
    'revocation_revalidation', evidence);
end
$pte_attempt$;

create function ai.terminate_production_target_execution_pre_start(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_terminate$
declare lifecycle_row record; use_row record; receipt jsonb := p_input -> 'receipt';
  next_lifecycle jsonb; terminal_state text; lifecycle_use_state text;
begin
  perform ai.assert_production_target_execution_schema_identity();
  if p_input ->> 'expected_lifecycle_state' is distinct from 'RESERVED_NOT_STARTED'
    or p_input -> 'advance_persisted_clock_lower_bound_to_evidence_observed_at'
      is distinct from 'true'::jsonb
    or p_input ->> 'required_revalidation_provenance' is distinct from
      'PERSISTENCE_TRANSACTION_AUTHORITATIVE_RESOLUTION'
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = (
      select lifecycle.approval_id from ai.production_target_execution_lifecycles lifecycle
      where lifecycle.command_id = p_input ->> 'command_id') for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id' for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  if lifecycle_row.state <> 'RESERVED_NOT_STARTED'
    or lifecycle_row.state_version <> (p_input ->> 'expected_lifecycle_version')::bigint
    or lifecycle_row.reservation_id <> p_input ->> 'reservation_id'
    or lifecycle_row.reservation_digest <> p_input ->> 'reservation_digest'
  then return pg_catalog.jsonb_build_object('status', 'CONFLICT',
    'conflict', 'TERMINAL_STATE_CONFLICT', 'execution_allowed', false); end if;
  terminal_state := case p_input ->> 'terminal_event'
    when 'CANCEL_BEFORE_START' then 'CANCELLED_PRE_START'
    when 'RESTART_RESERVED_CANCEL' then 'CANCELLED_PRE_START'
    when 'EXPIRE_BEFORE_START' then 'EXPIRED_PRE_START'
    else null end;
  lifecycle_use_state := case terminal_state
    when 'EXPIRED_PRE_START' then 'EXPIRED_OR_REVOKED' else 'QUARANTINED' end;
  if terminal_state is null or receipt ->> 'terminal_state' <> terminal_state
    or receipt ->> 'receipt_id' <> p_input ->> 'expected_receipt_absent'
    or exists (select 1 from ai.production_target_execution_execution_receipts stored
      where stored.receipt_id = p_input ->> 'expected_receipt_absent')
  then raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT'; end if;
  perform ai.assert_production_target_execution_receipt_binding(
    receipt, lifecycle_row.record_json, p_input -> 'clock_evidence', array[terminal_state]);
  insert into ai.production_target_execution_execution_receipts (
    receipt_id, receipt_digest, command_id, command_record_digest,
    execution_binding_digest, approval_id, approval_digest, approval_receipt_id,
    approval_receipt_digest, reservation_id, reservation_digest, attempt_id,
    attempt_digest, terminal_state, record_json
  ) values (
    receipt ->> 'receipt_id', receipt ->> 'receipt_digest', receipt ->> 'command_id',
    receipt ->> 'command_record_digest', receipt ->> 'execution_binding_digest',
    receipt ->> 'approval_id', receipt ->> 'approval_digest',
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    receipt ->> 'reservation_id', receipt ->> 'reservation_digest',
    receipt ->> 'attempt_id', receipt ->> 'attempt_digest',
    receipt ->> 'terminal_state', receipt
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', terminal_state, 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', lifecycle_use_state,
    'terminal_receipt_id', receipt ->> 'receipt_id',
    'terminal_receipt_digest', receipt ->> 'receipt_digest',
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}');
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = terminal_state, state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = lifecycle_use_state,
    terminal_receipt_id = receipt ->> 'receipt_id',
    terminal_receipt_digest = receipt ->> 'receipt_digest', record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id
    and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  update ai.production_target_execution_approval_uses set
    binding_state = 'CONSUMED', binding_version = use_row.binding_version + 1,
    binding_digest = ai.production_target_execution_digest(
      'farmos.production-target-execution-approval-use.v1',
      pg_catalog.jsonb_build_object(
        'approval_id', use_row.approval_id, 'approval_digest', use_row.approval_digest,
        'approval_receipt_id', use_row.approval_receipt_id,
        'approval_receipt_digest', use_row.approval_receipt_digest,
        'binding_state', 'CONSUMED', 'binding_version', use_row.binding_version + 1,
        'command_id', use_row.command_id, 'reservation_id', use_row.reservation_id,
        'execution_binding_digest', use_row.execution_binding_digest)),
    updated_at = pg_catalog.clock_timestamp()
  where approval_id = use_row.approval_id and binding_state = 'BOUND'
    and binding_version = use_row.binding_version and binding_digest = use_row.binding_digest;
  if not found then raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND'; end if;
  return pg_catalog.jsonb_build_object('status', 'FINALIZED',
    'lifecycle', next_lifecycle, 'receipt', receipt);
end
$pte_terminate$;

create function ai.finalize_production_target_execution(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_finalize$
declare lifecycle_row record; receipt jsonb := p_input -> 'receipt'; next_lifecycle jsonb;
  lifecycle_use_state text;
begin
  perform ai.assert_production_target_execution_schema_identity();
  if p_input ->> 'expected_lifecycle_state' is distinct from 'ATTEMPT_STARTED'
    or p_input -> 'advance_persisted_clock_lower_bound_to_evidence_observed_at'
      is distinct from 'true'::jsonb
  then raise exception using errcode = 'PTE09', message = 'INGRESS_CONTRACT_INVALID'; end if;
  perform ai.advance_production_target_execution_clock_floor(p_input);
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id' for update;
  if not found then return pg_catalog.jsonb_build_object('status', 'REJECTED',
    'reason', 'DEPENDENCY_REVALIDATION_FAILED', 'execution_allowed', false); end if;
  if lifecycle_row.state <> 'ATTEMPT_STARTED'
    or lifecycle_row.state_version <> (p_input ->> 'expected_lifecycle_version')::bigint
    or lifecycle_row.reservation_id <> p_input ->> 'reservation_id'
    or lifecycle_row.reservation_digest <> p_input ->> 'reservation_digest'
    or lifecycle_row.attempt_id <> p_input ->> 'attempt_id'
    or lifecycle_row.attempt_digest <> p_input ->> 'attempt_digest'
  then return pg_catalog.jsonb_build_object('status', 'CONFLICT',
    'conflict', 'TERMINAL_STATE_CONFLICT', 'execution_allowed', false); end if;
  if receipt ->> 'terminal_state' not in (
      'CONSUMED_SUCCESS','CONSUMED_FAILURE','OUTCOME_UNKNOWN')
    or receipt ->> 'receipt_id' <> p_input ->> 'expected_receipt_absent'
    or exists (select 1 from ai.production_target_execution_execution_receipts stored
      where stored.receipt_id = p_input ->> 'expected_receipt_absent')
  then raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT'; end if;
  perform ai.assert_production_target_execution_receipt_binding(
    receipt, lifecycle_row.record_json, p_input -> 'clock_evidence',
    array['CONSUMED_SUCCESS','CONSUMED_FAILURE','OUTCOME_UNKNOWN']);
  lifecycle_use_state := case receipt ->> 'terminal_state'
    when 'OUTCOME_UNKNOWN' then 'QUARANTINED' else 'CONSUMED' end;
  insert into ai.production_target_execution_execution_receipts (
    receipt_id, receipt_digest, command_id, command_record_digest,
    execution_binding_digest, approval_id, approval_digest, approval_receipt_id,
    approval_receipt_digest, reservation_id, reservation_digest, attempt_id,
    attempt_digest, terminal_state, record_json
  ) values (
    receipt ->> 'receipt_id', receipt ->> 'receipt_digest', receipt ->> 'command_id',
    receipt ->> 'command_record_digest', receipt ->> 'execution_binding_digest',
    receipt ->> 'approval_id', receipt ->> 'approval_digest',
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    receipt ->> 'reservation_id', receipt ->> 'reservation_digest',
    receipt ->> 'attempt_id', receipt ->> 'attempt_digest',
    receipt ->> 'terminal_state', receipt
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', receipt ->> 'terminal_state', 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', lifecycle_use_state,
    'terminal_receipt_id', receipt ->> 'receipt_id',
    'terminal_receipt_digest', receipt ->> 'receipt_digest',
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}');
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = receipt ->> 'terminal_state', state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = lifecycle_use_state,
    terminal_receipt_id = receipt ->> 'receipt_id',
    terminal_receipt_digest = receipt ->> 'receipt_digest', record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id
    and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  return pg_catalog.jsonb_build_object('status', 'FINALIZED',
    'lifecycle', next_lifecycle, 'receipt', receipt);
end
$pte_finalize$;

create function ai.read_production_target_execution_reservation_reconciliation(p_input jsonb)
returns jsonb language plpgsql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_reservation_reconciliation$
declare lifecycle_row record; reservation_row record; use_row record; observation jsonb;
  observation_digest text;
begin
  perform ai.assert_production_target_execution_schema_identity();
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id';
  if not found then raise exception using errcode = 'PTE03',
    message = 'OBSERVATION_UNKNOWN'; end if;
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = p_input ->> 'approval_id';
  if not found then raise exception using errcode = 'PTE03',
    message = 'OBSERVATION_UNKNOWN'; end if;
  select * into reservation_row from ai.production_target_execution_reservations reservation
    where reservation.command_id = p_input ->> 'command_id';
  if not found and lifecycle_row.state <> 'UNRESERVED' then
    raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN';
  end if;
  if lifecycle_row.command_record_digest <> p_input ->> 'command_record_digest'
    or lifecycle_row.execution_binding_digest <> p_input ->> 'execution_binding_digest'
    or lifecycle_row.approval_id <> p_input ->> 'approval_id'
    or lifecycle_row.approval_digest <> p_input ->> 'approval_digest'
    or lifecycle_row.approval_receipt_id <> p_input ->> 'approval_receipt_id'
    or lifecycle_row.approval_receipt_digest <> p_input ->> 'approval_receipt_digest'
  then raise exception using errcode = 'PTE02', message = 'DIGEST_MISMATCH'; end if;
  if reservation_row.reservation_id is null and lifecycle_row.state = 'UNRESERVED'
    and lifecycle_row.state_version =
      (p_input ->> 'expected_unreserved_lifecycle_version')::bigint
    and lifecycle_row.lifecycle_record_digest =
      p_input ->> 'expected_unreserved_lifecycle_record_digest'
    and use_row.approval_digest = p_input ->> 'approval_digest'
    and use_row.approval_receipt_id = p_input ->> 'approval_receipt_id'
    and use_row.approval_receipt_digest = p_input ->> 'approval_receipt_digest'
    and use_row.binding_state = 'UNBOUND' and use_row.binding_version = 0
  then
    observation := pg_catalog.jsonb_build_object(
      'result', 'RESERVATION_CONFIRMED_ABSENT',
      'provenance', 'PERSISTENCE_AUTHORITATIVE_EXACT_READBACK',
      'command_id', p_input ->> 'command_id',
      'command_record_digest', p_input ->> 'command_record_digest',
      'execution_binding_digest', p_input ->> 'execution_binding_digest',
      'approval_id', p_input ->> 'approval_id', 'approval_digest', p_input ->> 'approval_digest',
      'approval_receipt_id', p_input ->> 'approval_receipt_id',
      'approval_receipt_digest', p_input ->> 'approval_receipt_digest',
      'lifecycle_state', 'UNRESERVED', 'lifecycle_version', lifecycle_row.state_version,
      'lifecycle_record_digest', lifecycle_row.lifecycle_record_digest,
      'observed_reservation_id', null, 'observed_reservation_digest', null,
      'approval_bound_or_reserved', false);
  elsif reservation_row.reservation_id = p_input ->> 'intended_reservation_id'
    and reservation_row.reservation_digest = p_input ->> 'intended_reservation_digest'
    and reservation_row.command_record_digest = p_input ->> 'command_record_digest'
    and reservation_row.execution_binding_digest = p_input ->> 'execution_binding_digest'
    and reservation_row.approval_id = p_input ->> 'approval_id'
    and reservation_row.approval_digest = p_input ->> 'approval_digest'
    and reservation_row.approval_receipt_id = p_input ->> 'approval_receipt_id'
    and reservation_row.approval_receipt_digest = p_input ->> 'approval_receipt_digest'
    and lifecycle_row.state = 'RESERVED_NOT_STARTED'
    and lifecycle_row.state_version =
      (p_input ->> 'expected_reserved_lifecycle_version')::bigint
    and lifecycle_row.lifecycle_record_digest =
      p_input ->> 'expected_reserved_lifecycle_record_digest'
    and use_row.binding_state = 'BOUND'
    and use_row.command_id = p_input ->> 'command_id'
    and use_row.reservation_id = p_input ->> 'intended_reservation_id'
    and use_row.execution_binding_digest = p_input ->> 'execution_binding_digest'
  then
    observation := pg_catalog.jsonb_build_object(
      'result', 'RESERVATION_CONFIRMED_PRESENT',
      'provenance', 'PERSISTENCE_AUTHORITATIVE_EXACT_READBACK',
      'command_id', p_input ->> 'command_id',
      'command_record_digest', p_input ->> 'command_record_digest',
      'execution_binding_digest', p_input ->> 'execution_binding_digest',
      'approval_id', p_input ->> 'approval_id', 'approval_digest', p_input ->> 'approval_digest',
      'approval_receipt_id', p_input ->> 'approval_receipt_id',
      'approval_receipt_digest', p_input ->> 'approval_receipt_digest',
      'lifecycle_state', 'RESERVED_NOT_STARTED', 'lifecycle_version', lifecycle_row.state_version,
      'lifecycle_record_digest', lifecycle_row.lifecycle_record_digest,
      'observed_reservation_id', reservation_row.reservation_id,
      'observed_reservation_digest', reservation_row.reservation_digest,
      'approval_bound_or_reserved', true);
  else
    raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN';
  end if;
  observation_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-reservation-authoritative-readback.v1', observation);
  return observation || pg_catalog.jsonb_build_object('observation_digest', observation_digest);
end
$pte_read_reservation_reconciliation$;

create function ai.resolve_production_target_execution_reservation_absent(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_resolve_absent$
declare lifecycle_row record; use_row record;
  receipt jsonb := p_input -> 'confirmed_absent_receipt_candidate'; next_lifecycle jsonb;
  observation jsonb; reconciliation jsonb; reconciliation_digest text; reconciliation_id text;
  floor_row record; recovery_input jsonb;
begin
  perform ai.assert_production_target_execution_schema_identity();
  observation := ai.read_production_target_execution_reservation_reconciliation(p_input);
  if observation ->> 'result' <> 'RESERVATION_CONFIRMED_ABSENT' then
    raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN';
  end if;
  select * into floor_row from ai.production_target_execution_clock_floors floor_value
    where floor_value.clock_authority_id = p_input #>> '{clock_evidence,clock_authority_id}'
      and floor_value.clock_authority_revision =
        (p_input #>> '{clock_evidence,clock_authority_revision}')::integer for update;
  recovery_input := p_input || pg_catalog.jsonb_build_object(
    'expected_clock_floor_version', case when found then floor_row.floor_version else 0 end,
    'expected_persisted_clock_lower_bound',
      case when found then floor_row.observed_lower_bound else null end);
  perform ai.advance_production_target_execution_clock_floor(recovery_input);
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = p_input ->> 'approval_id' for update;
  if not found then raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id' for update;
  if not found or lifecycle_row.state <> 'UNRESERVED'
    or lifecycle_row.state_version <>
      (p_input ->> 'expected_unreserved_lifecycle_version')::bigint
    or lifecycle_row.lifecycle_record_digest <>
      p_input ->> 'expected_unreserved_lifecycle_record_digest'
    or use_row.binding_state <> 'UNBOUND' or use_row.binding_version <> 0
    or exists (select 1 from ai.production_target_execution_reservations reservation
      where reservation.command_id = p_input ->> 'command_id')
    or exists (select 1 from ai.production_target_execution_execution_receipts stored_receipt
      where stored_receipt.receipt_id =
        p_input ->> 'expected_confirmed_absent_receipt_id_absent')
  then raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  if receipt ->> 'receipt_id' <> p_input ->> 'expected_confirmed_absent_receipt_id_absent'
  then raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT'; end if;
  perform ai.assert_production_target_execution_receipt_binding(
    receipt, lifecycle_row.record_json, p_input -> 'clock_evidence',
    array['RESERVATION_OUTCOME_UNKNOWN']);
  insert into ai.production_target_execution_execution_receipts (
    receipt_id, receipt_digest, command_id, command_record_digest,
    execution_binding_digest, approval_id, approval_digest, approval_receipt_id,
    approval_receipt_digest, reservation_id, reservation_digest, attempt_id,
    attempt_digest, terminal_state, record_json
  ) values (
    receipt ->> 'receipt_id', receipt ->> 'receipt_digest', receipt ->> 'command_id',
    receipt ->> 'command_record_digest', receipt ->> 'execution_binding_digest',
    receipt ->> 'approval_id', receipt ->> 'approval_digest',
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    null, null, null, null, 'RESERVATION_OUTCOME_UNKNOWN', receipt
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', 'RESERVATION_OUTCOME_UNKNOWN', 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', 'POSSIBLY_RESERVED',
    'terminal_receipt_id', receipt ->> 'receipt_id',
    'terminal_receipt_digest', receipt ->> 'receipt_digest',
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}');
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = 'RESERVATION_OUTCOME_UNKNOWN', state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = 'POSSIBLY_RESERVED',
    terminal_receipt_id = receipt ->> 'receipt_id',
    terminal_receipt_digest = receipt ->> 'receipt_digest', record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  update ai.production_target_execution_approval_uses set
    binding_state = 'QUARANTINED', binding_version = use_row.binding_version + 1,
    binding_digest = ai.production_target_execution_digest(
      'farmos.production-target-execution-approval-use.v1',
      pg_catalog.jsonb_build_object('approval_id', use_row.approval_id,
        'approval_digest', use_row.approval_digest,
        'approval_receipt_id', use_row.approval_receipt_id,
        'approval_receipt_digest', use_row.approval_receipt_digest,
        'binding_state', 'QUARANTINED', 'binding_version', use_row.binding_version + 1,
        'command_id', p_input ->> 'command_id', 'reservation_id', null,
        'execution_binding_digest', p_input ->> 'execution_binding_digest')),
    command_id = p_input ->> 'command_id', reservation_id = null,
    execution_binding_digest = p_input ->> 'execution_binding_digest',
    updated_at = pg_catalog.clock_timestamp()
  where approval_id = use_row.approval_id and binding_version = use_row.binding_version
    and binding_digest = use_row.binding_digest;
  if not found then raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND'; end if;
  reconciliation := pg_catalog.jsonb_build_object('branch', 'CONFIRMED_ABSENT',
    'command_id', p_input ->> 'command_id',
    'execution_binding_digest', p_input ->> 'execution_binding_digest',
    'lifecycle_state_version', lifecycle_row.state_version + 1,
    'receipt_id', receipt ->> 'receipt_id', 'receipt_digest', receipt ->> 'receipt_digest');
  reconciliation_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-reservation-reconciliation.v1', reconciliation);
  reconciliation_id := 'reconciliation.' || pg_catalog.substr(reconciliation_digest, 8, 64);
  insert into ai.production_target_execution_reconciliation_records (
    reconciliation_id, reconciliation_digest, record_kind, command_id,
    execution_binding_digest, lifecycle_state_version, record_json
  ) values (reconciliation_id, reconciliation_digest, 'RESERVATION_RECONCILIATION',
    p_input ->> 'command_id', p_input ->> 'execution_binding_digest',
    lifecycle_row.state_version + 1, reconciliation);
  return pg_catalog.jsonb_build_object('status',
    'CONFIRMED_ABSENT_FINALIZED_OUTCOME_UNKNOWN', 'observation', observation,
    'lifecycle', next_lifecycle, 'receipt', receipt, 'execution_allowed', false);
end
$pte_resolve_absent$;

create function ai.resolve_production_target_execution_reservation_present(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_resolve_present$
declare lifecycle_row record; use_row record;
  receipt jsonb := p_input -> 'confirmed_present_cancellation_receipt_candidate';
  observation jsonb; next_lifecycle jsonb; reconciliation jsonb; reconciliation_digest text;
  floor_row record; recovery_input jsonb;
begin
  perform ai.assert_production_target_execution_schema_identity();
  observation := ai.read_production_target_execution_reservation_reconciliation(p_input);
  if observation ->> 'result' <> 'RESERVATION_CONFIRMED_PRESENT' then
    raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN';
  end if;
  select * into floor_row from ai.production_target_execution_clock_floors floor_value
    where floor_value.clock_authority_id = p_input #>> '{clock_evidence,clock_authority_id}'
      and floor_value.clock_authority_revision =
        (p_input #>> '{clock_evidence,clock_authority_revision}')::integer for update;
  recovery_input := p_input || pg_catalog.jsonb_build_object(
    'expected_clock_floor_version', case when found then floor_row.floor_version else 0 end,
    'expected_persisted_clock_lower_bound',
      case when found then floor_row.observed_lower_bound else null end);
  perform ai.advance_production_target_execution_clock_floor(recovery_input);
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = receipt ->> 'approval_id' for update;
  if not found then raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id' for update;
  if not found or lifecycle_row.state <> 'RESERVED_NOT_STARTED'
    or lifecycle_row.state_version <>
      (p_input ->> 'expected_reserved_lifecycle_version')::bigint
    or lifecycle_row.lifecycle_record_digest <>
      p_input ->> 'expected_reserved_lifecycle_record_digest'
    or lifecycle_row.reservation_id <> p_input ->> 'intended_reservation_id'
    or lifecycle_row.reservation_digest <> p_input ->> 'intended_reservation_digest'
    or use_row.binding_state <> 'BOUND'
    or use_row.command_id <> p_input ->> 'command_id'
    or use_row.reservation_id <> p_input ->> 'intended_reservation_id'
    or use_row.execution_binding_digest <> p_input ->> 'execution_binding_digest'
    or exists (select 1 from ai.production_target_execution_execution_receipts stored_receipt
      where stored_receipt.receipt_id =
        p_input ->> 'expected_confirmed_present_receipt_id_absent')
  then raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  if receipt ->> 'receipt_id' <>
      p_input ->> 'expected_confirmed_present_receipt_id_absent'
  then raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT'; end if;
  perform ai.assert_production_target_execution_receipt_binding(
    receipt, lifecycle_row.record_json, p_input -> 'clock_evidence',
    array['CANCELLED_PRE_START']);
  insert into ai.production_target_execution_execution_receipts (
    receipt_id, receipt_digest, command_id, command_record_digest,
    execution_binding_digest, approval_id, approval_digest, approval_receipt_id,
    approval_receipt_digest, reservation_id, reservation_digest, attempt_id,
    attempt_digest, terminal_state, record_json
  ) values (
    receipt ->> 'receipt_id', receipt ->> 'receipt_digest', receipt ->> 'command_id',
    receipt ->> 'command_record_digest', receipt ->> 'execution_binding_digest',
    receipt ->> 'approval_id', receipt ->> 'approval_digest',
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    receipt ->> 'reservation_id', receipt ->> 'reservation_digest', null, null,
    'CANCELLED_PRE_START', receipt
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', 'CANCELLED_PRE_START', 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', 'QUARANTINED',
    'terminal_receipt_id', receipt ->> 'receipt_id',
    'terminal_receipt_digest', receipt ->> 'receipt_digest',
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}');
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = 'CANCELLED_PRE_START', state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = 'QUARANTINED', terminal_receipt_id = receipt ->> 'receipt_id',
    terminal_receipt_digest = receipt ->> 'receipt_digest', record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  update ai.production_target_execution_approval_uses set
    binding_state = 'CONSUMED', binding_version = use_row.binding_version + 1,
    binding_digest = ai.production_target_execution_digest(
      'farmos.production-target-execution-approval-use.v1',
      pg_catalog.jsonb_build_object(
        'approval_id', use_row.approval_id, 'approval_digest', use_row.approval_digest,
        'approval_receipt_id', use_row.approval_receipt_id,
        'approval_receipt_digest', use_row.approval_receipt_digest,
        'binding_state', 'CONSUMED', 'binding_version', use_row.binding_version + 1,
        'command_id', use_row.command_id, 'reservation_id', use_row.reservation_id,
        'execution_binding_digest', use_row.execution_binding_digest)),
    updated_at = pg_catalog.clock_timestamp()
  where approval_id = use_row.approval_id and binding_version = use_row.binding_version
    and binding_digest = use_row.binding_digest;
  if not found then raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND'; end if;
  reconciliation := pg_catalog.jsonb_build_object('branch', 'CONFIRMED_PRESENT',
    'command_id', p_input ->> 'command_id',
    'execution_binding_digest', p_input ->> 'execution_binding_digest',
    'lifecycle_state_version', lifecycle_row.state_version + 1,
    'receipt_id', receipt ->> 'receipt_id', 'receipt_digest', receipt ->> 'receipt_digest');
  reconciliation_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-reservation-reconciliation.v1', reconciliation);
  insert into ai.production_target_execution_reconciliation_records (
    reconciliation_id, reconciliation_digest, record_kind, command_id,
    execution_binding_digest, lifecycle_state_version, record_json
  ) values ('reconciliation.' || pg_catalog.substr(reconciliation_digest, 8, 64),
    reconciliation_digest, 'RESERVATION_RECONCILIATION', p_input ->> 'command_id',
    p_input ->> 'execution_binding_digest', lifecycle_row.state_version + 1, reconciliation);
  return pg_catalog.jsonb_build_object('status',
    'CONFIRMED_PRESENT_CANCELLED_PRE_START', 'observation', observation,
    'lifecycle', next_lifecycle, 'receipt', receipt, 'execution_allowed', false);
end
$pte_resolve_present$;

create function ai.read_production_target_execution_post_reservation_ambiguity(p_input jsonb)
returns jsonb language plpgsql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_post_reservation$
declare lifecycle_row record; receipt_json jsonb;
begin
  perform ai.assert_production_target_execution_schema_identity();
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id'
      and lifecycle.execution_binding_digest = p_input ->> 'execution_binding_digest';
  if not found then return pg_catalog.jsonb_build_object('status', 'OBSERVATION_UNKNOWN'); end if;
  if lifecycle_row.state in ('CONSUMED_SUCCESS', 'CONSUMED_FAILURE', 'OUTCOME_UNKNOWN',
      'CANCELLED_PRE_START', 'EXPIRED_PRE_START', 'RESERVATION_OUTCOME_UNKNOWN')
  then
    if p_input ->> 'ambiguity_stage' <> 'FINALIZATION_WRITE'
      or lifecycle_row.state_version <> (p_input ->> 'expected_state_version')::bigint + 1
      or lifecycle_row.reservation_id is distinct from p_input ->> 'intended_reservation_id'
      or lifecycle_row.reservation_digest is distinct from
        p_input ->> 'intended_reservation_digest'
      or lifecycle_row.attempt_id is distinct from p_input ->> 'intended_attempt_id'
      or lifecycle_row.attempt_digest is distinct from p_input ->> 'intended_attempt_digest'
    then return pg_catalog.jsonb_build_object('status', 'OBSERVATION_UNKNOWN'); end if;
    select receipt.record_json into receipt_json
      from ai.production_target_execution_execution_receipts receipt
      where receipt.receipt_id = lifecycle_row.terminal_receipt_id
        and receipt.receipt_digest = lifecycle_row.terminal_receipt_digest;
    if receipt_json is null then
      return pg_catalog.jsonb_build_object('status', 'OBSERVATION_UNKNOWN');
    end if;
    return pg_catalog.jsonb_build_object('status', 'TERMINAL_RECEIPT_EXACT',
      'lifecycle', lifecycle_row.record_json, 'receipt', receipt_json);
  elsif lifecycle_row.state = 'ATTEMPT_STARTED'
    and p_input ->> 'ambiguity_stage' in ('ATTEMPT_START_WRITE','FINALIZATION_WRITE')
    and lifecycle_row.reservation_id is not distinct from p_input ->> 'intended_reservation_id'
    and lifecycle_row.reservation_digest is not distinct from
      p_input ->> 'intended_reservation_digest'
    and lifecycle_row.attempt_id is not distinct from p_input ->> 'intended_attempt_id'
    and lifecycle_row.attempt_digest is not distinct from p_input ->> 'intended_attempt_digest'
    and lifecycle_row.state_version = (p_input ->> 'expected_state_version')::bigint +
      case when p_input ->> 'ambiguity_stage' = 'ATTEMPT_START_WRITE' then 1 else 0 end
  then
    return pg_catalog.jsonb_build_object('status', 'ATTEMPT_STARTED_EXACT');
  elsif lifecycle_row.state = 'RESERVED_NOT_STARTED'
    and p_input ->> 'ambiguity_stage' = 'ATTEMPT_START_WRITE'
    and lifecycle_row.state_version = (p_input ->> 'expected_state_version')::bigint
    and lifecycle_row.reservation_id is not distinct from p_input ->> 'intended_reservation_id'
    and lifecycle_row.reservation_digest is not distinct from
      p_input ->> 'intended_reservation_digest'
  then
    return pg_catalog.jsonb_build_object('status', 'RESERVED_NOT_STARTED_EXACT');
  end if;
  return pg_catalog.jsonb_build_object('status', 'OBSERVATION_UNKNOWN');
end
$pte_read_post_reservation$;

create function ai.resolve_production_target_execution_post_reservation_ambiguity(p_input jsonb)
returns jsonb language plpgsql security definer volatile set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_resolve_post_reservation$
declare lifecycle_row record; use_row record; receipt jsonb := p_input -> 'outcome_unknown_receipt';
  next_lifecycle jsonb; next_state text; reconciliation jsonb; reconciliation_digest text;
  floor_row record; recovery_input jsonb;
begin
  perform ai.assert_production_target_execution_schema_identity();
  select * into floor_row from ai.production_target_execution_clock_floors floor_value
    where floor_value.clock_authority_id = p_input #>> '{clock_evidence,clock_authority_id}'
      and floor_value.clock_authority_revision =
        (p_input #>> '{clock_evidence,clock_authority_revision}')::integer for update;
  recovery_input := p_input || pg_catalog.jsonb_build_object(
    'expected_clock_floor_version', case when found then floor_row.floor_version else 0 end,
    'expected_persisted_clock_lower_bound',
      case when found then floor_row.observed_lower_bound else null end);
  perform ai.advance_production_target_execution_clock_floor(recovery_input);
  select * into use_row from ai.production_target_execution_approval_uses approval_use
    where approval_use.approval_id = (
      select lifecycle.approval_id from ai.production_target_execution_lifecycles lifecycle
      where lifecycle.command_id = p_input ->> 'command_id') for update;
  if not found then raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  select * into lifecycle_row from ai.production_target_execution_lifecycles lifecycle
    where lifecycle.command_id = p_input ->> 'command_id' for update;
  if not found
    or lifecycle_row.execution_binding_digest <> p_input ->> 'execution_binding_digest'
    or lifecycle_row.reservation_id is distinct from p_input ->> 'intended_reservation_id'
    or lifecycle_row.reservation_digest is distinct from p_input ->> 'intended_reservation_digest'
    or lifecycle_row.attempt_id is distinct from p_input ->> 'intended_attempt_id'
    or lifecycle_row.attempt_digest is distinct from p_input ->> 'intended_attempt_digest'
  then raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  if lifecycle_row.state = 'ATTEMPT_STARTED'
    and lifecycle_row.state_version = (p_input ->> 'expected_state_version')::bigint +
      case when p_input ->> 'ambiguity_stage' = 'ATTEMPT_START_WRITE' then 1 else 0 end
  then next_state := 'OUTCOME_UNKNOWN';
  elsif lifecycle_row.state = 'RESERVED_NOT_STARTED'
    and p_input ->> 'ambiguity_stage' = 'ATTEMPT_START_WRITE'
    and lifecycle_row.state_version = (p_input ->> 'expected_state_version')::bigint
  then next_state := 'CANCELLED_PRE_START';
  else raise exception using errcode = 'PTE03', message = 'OBSERVATION_UNKNOWN'; end if;
  if receipt ->> 'terminal_state' <> next_state
    or receipt ->> 'receipt_id' <> p_input ->> 'expected_receipt_absent'
    or exists (select 1 from ai.production_target_execution_execution_receipts stored
      where stored.receipt_id = p_input ->> 'expected_receipt_absent')
  then
    raise exception using errcode = 'PTE08', message = 'RECEIPT_CONFLICT';
  end if;
  perform ai.assert_production_target_execution_receipt_binding(
    receipt, lifecycle_row.record_json, p_input -> 'clock_evidence', array[next_state]);
  insert into ai.production_target_execution_execution_receipts (
    receipt_id, receipt_digest, command_id, command_record_digest,
    execution_binding_digest, approval_id, approval_digest, approval_receipt_id,
    approval_receipt_digest, reservation_id, reservation_digest, attempt_id,
    attempt_digest, terminal_state, record_json
  ) values (
    receipt ->> 'receipt_id', receipt ->> 'receipt_digest', receipt ->> 'command_id',
    receipt ->> 'command_record_digest', receipt ->> 'execution_binding_digest',
    receipt ->> 'approval_id', receipt ->> 'approval_digest',
    receipt ->> 'approval_receipt_id', receipt ->> 'approval_receipt_digest',
    receipt ->> 'reservation_id', receipt ->> 'reservation_digest',
    receipt ->> 'attempt_id', receipt ->> 'attempt_digest', next_state, receipt
  );
  next_lifecycle := lifecycle_row.record_json || pg_catalog.jsonb_build_object(
    'state', next_state, 'state_version', lifecycle_row.state_version + 1,
    'approval_use_state', 'QUARANTINED', 'terminal_receipt_id', receipt ->> 'receipt_id',
    'terminal_receipt_digest', receipt ->> 'receipt_digest',
    'updated_clock_evidence_id', p_input #>> '{clock_evidence,evidence_id}',
    'updated_clock_evidence_digest', p_input #>> '{clock_evidence,evidence_digest}');
  next_lifecycle := next_lifecycle || pg_catalog.jsonb_build_object(
    'lifecycle_record_digest', ai.production_target_execution_digest(
      'farmos.production-target-execution-lifecycle-record.v1',
      next_lifecycle - 'lifecycle_record_digest'));
  update ai.production_target_execution_lifecycles set
    state = next_state, state_version = lifecycle_row.state_version + 1,
    lifecycle_record_digest = next_lifecycle ->> 'lifecycle_record_digest',
    approval_use_state = 'QUARANTINED', terminal_receipt_id = receipt ->> 'receipt_id',
    terminal_receipt_digest = receipt ->> 'receipt_digest', record_json = next_lifecycle,
    updated_at = pg_catalog.clock_timestamp()
  where command_id = lifecycle_row.command_id and state_version = lifecycle_row.state_version
    and lifecycle_record_digest = lifecycle_row.lifecycle_record_digest;
  if not found then raise exception using errcode = 'PTE05', message = 'STALE_EXPECTED_VERSION'; end if;
  if use_row.binding_state = 'BOUND' then
    update ai.production_target_execution_approval_uses set
      binding_state = 'CONSUMED', binding_version = use_row.binding_version + 1,
      binding_digest = ai.production_target_execution_digest(
        'farmos.production-target-execution-approval-use.v1',
        pg_catalog.jsonb_build_object(
          'approval_id', use_row.approval_id, 'approval_digest', use_row.approval_digest,
          'approval_receipt_id', use_row.approval_receipt_id,
          'approval_receipt_digest', use_row.approval_receipt_digest,
          'binding_state', 'CONSUMED', 'binding_version', use_row.binding_version + 1,
          'command_id', use_row.command_id, 'reservation_id', use_row.reservation_id,
          'execution_binding_digest', use_row.execution_binding_digest)),
      updated_at = pg_catalog.clock_timestamp()
    where approval_id = use_row.approval_id and binding_version = use_row.binding_version
      and binding_digest = use_row.binding_digest;
    if not found then raise exception using errcode = 'PTE07', message = 'APPROVAL_BOUND'; end if;
  end if;
  reconciliation := pg_catalog.jsonb_build_object(
    'ambiguity_stage', p_input ->> 'ambiguity_stage',
    'command_id', p_input ->> 'command_id',
    'execution_binding_digest', p_input ->> 'execution_binding_digest',
    'lifecycle_state_version', lifecycle_row.state_version + 1,
    'receipt_id', receipt ->> 'receipt_id', 'receipt_digest', receipt ->> 'receipt_digest');
  reconciliation_digest := ai.production_target_execution_digest(
    'farmos.production-target-execution-post-reservation-reconciliation.v1', reconciliation);
  insert into ai.production_target_execution_reconciliation_records (
    reconciliation_id, reconciliation_digest, record_kind, command_id,
    execution_binding_digest, lifecycle_state_version, record_json
  ) values ('reconciliation.' || pg_catalog.substr(reconciliation_digest, 8, 64),
    reconciliation_digest, case when p_input ->> 'ambiguity_stage' = 'ATTEMPT_START_WRITE'
      then 'ATTEMPT_RECONCILIATION' else 'FINALIZATION_RECONCILIATION' end,
    p_input ->> 'command_id', p_input ->> 'execution_binding_digest',
    lifecycle_row.state_version + 1, reconciliation);
  return pg_catalog.jsonb_build_object('status', 'FINALIZED',
    'lifecycle', next_lifecycle, 'receipt', receipt);
end
$pte_resolve_post_reservation$;

create function ai.read_production_target_execution_lifecycle(p_input jsonb)
returns jsonb language sql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_lifecycle$
  select lifecycle.record_json from ai.production_target_execution_lifecycles lifecycle
  where lifecycle.command_id = p_input ->> 'command_id'
    and lifecycle.execution_binding_digest = p_input ->> 'execution_binding_digest'
$pte_read_lifecycle$;

create function ai.read_production_target_execution_receipt(p_input jsonb)
returns jsonb language sql security definer stable set search_path = pg_catalog
set statement_timeout = '10s' set lock_timeout = '5s'
as $pte_read_receipt$
  select receipt.record_json from ai.production_target_execution_execution_receipts receipt
  where receipt.receipt_id = p_input ->> 'receipt_id'
    and receipt.receipt_digest = p_input ->> 'receipt_digest'
$pte_read_receipt$;

do $pte_triggers$
declare relation_name text; trigger_name text; relation_names text[]; trigger_names text[];
  index_value integer;
begin
  relation_names := array[
    'production_target_execution_schema_metadata',
    'production_target_execution_proposals',
    'production_target_execution_approvals',
    'production_target_execution_approval_receipts',
    'production_target_execution_approval_revocation_events',
    'production_target_execution_commands',
    'production_target_execution_reservations',
    'production_target_execution_attempts',
    'production_target_execution_execution_receipts',
    'production_target_execution_clock_evidence',
    'production_target_execution_reconciliation_records'];
  trigger_names := array[
    'pte_metadata', 'pte_proposals', 'pte_approvals', 'pte_approval_receipts',
    'pte_revocation_events', 'pte_commands', 'pte_reservations', 'pte_attempts',
    'pte_execution_receipts', 'pte_clock_evidence', 'pte_reconciliation'];
  for index_value in 1..pg_catalog.array_length(relation_names, 1) loop
    relation_name := relation_names[index_value];
    trigger_name := trigger_names[index_value];
    execute pg_catalog.format(
      'create trigger %I before update or delete on ai.%I for each row execute function ai.reject_production_target_execution_append_only_mutation()',
      trigger_name || '_ao', relation_name);
    execute pg_catalog.format(
      'create trigger %I before truncate on ai.%I for each statement execute function ai.reject_production_target_execution_append_only_mutation()',
      trigger_name || '_truncate', relation_name);
  end loop;
  relation_names := array[
    'production_target_execution_approval_revocation_heads',
    'production_target_execution_approval_uses',
    'production_target_execution_lifecycles',
    'production_target_execution_clock_floors'];
  trigger_names := array[
    'pte_revocation_heads', 'pte_approval_uses', 'pte_lifecycles', 'pte_clock_floors'];
  for index_value in 1..pg_catalog.array_length(relation_names, 1) loop
    relation_name := relation_names[index_value];
    trigger_name := trigger_names[index_value];
    execute pg_catalog.format(
      'create trigger %I before update on ai.%I for each row execute function ai.enforce_production_target_execution_cas_progression()',
      trigger_name || '_cas', relation_name);
    execute pg_catalog.format(
      'create trigger %I before delete on ai.%I for each row execute function ai.reject_production_target_execution_append_only_mutation()',
      trigger_name || '_delete', relation_name);
    execute pg_catalog.format(
      'create trigger %I before truncate on ai.%I for each statement execute function ai.reject_production_target_execution_append_only_mutation()',
      trigger_name || '_truncate', relation_name);
  end loop;
end
$pte_triggers$;

revoke create on schema ai from public;
revoke create on schema ai from farmos_core_production_target_execution_transaction;
grant usage on schema ai to farmos_core_production_target_execution_transaction;

do $pte_acl$
declare relation_name text; function_name text;
begin
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
    execute pg_catalog.format('revoke all privileges on table ai.%I from public', relation_name);
    execute pg_catalog.format(
      'revoke all privileges on table ai.%I from farmos_core_production_target_execution_transaction',
      relation_name);
  end loop;
  foreach function_name in array array[
    'ai.reject_production_target_execution_append_only_mutation()',
    'ai.enforce_production_target_execution_cas_progression()',
    'ai.production_target_execution_canonical_jsonb(jsonb)',
    'ai.production_target_execution_digest(text,jsonb)',
    'ai.assert_production_target_execution_exact_record(jsonb,text[],text,text,text[])',
    'ai.assert_production_target_execution_receipt_binding(jsonb,jsonb,jsonb,text[])',
    'ai.assert_production_target_execution_schema_identity()',
    'ai.advance_production_target_execution_clock_floor(jsonb)',
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
    execute pg_catalog.format('revoke all on function %s from public', function_name);
  end loop;
end
$pte_acl$;

grant execute on function ai.read_production_target_execution_schema_identity()
  to farmos_core_production_target_execution_transaction;
grant execute on function ai.append_production_target_execution_proposal(jsonb),
  ai.append_production_target_execution_approval_and_receipt(jsonb),
  ai.read_production_target_execution_approval_lineage(jsonb),
  ai.append_production_target_execution_revocation_and_advance_head(jsonb),
  ai.read_production_target_execution_revocation_state(jsonb),
  ai.append_production_target_execution_command(jsonb),
  ai.read_production_target_execution_command(jsonb),
  ai.reserve_production_target_execution(jsonb),
  ai.start_production_target_execution_attempt(jsonb),
  ai.terminate_production_target_execution_pre_start(jsonb),
  ai.finalize_production_target_execution(jsonb),
  ai.read_production_target_execution_reservation_reconciliation(jsonb),
  ai.resolve_production_target_execution_reservation_absent(jsonb),
  ai.resolve_production_target_execution_reservation_present(jsonb),
  ai.read_production_target_execution_post_reservation_ambiguity(jsonb),
  ai.resolve_production_target_execution_post_reservation_ambiguity(jsonb),
  ai.read_production_target_execution_lifecycle(jsonb),
  ai.read_production_target_execution_receipt(jsonb)
  to farmos_core_production_target_execution_transaction;

commit;
