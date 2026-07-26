-- FarmOS Core immutable forward-only migration.
-- Never run automatically at process startup.
begin;

create schema if not exists core_schema;
create schema if not exists audit;

create table if not exists core_schema.migration_history (
  migration_id text primary key,
  sequence bigint not null unique check (sequence > 0),
  checksum text not null check (checksum ~ '^sha256:[0-9a-f]{64}$'),
  description text not null check (length(description) between 1 and 500),
  applied_at timestamptz not null,
  applied_by text not null check (length(applied_by) between 3 and 128),
  execution_id text not null unique check (length(execution_id) between 8 and 128)
);

alter table ai.proposal_inbox
  add column if not exists core_proposal_id text null,
  add column if not exists proposal_schema_version text null,
  add column if not exists source_system text null,
  add column if not exists source_reference text null,
  add column if not exists source_version text null,
  add column if not exists candidate_id text null,
  add column if not exists parent_proposal_id text null,
  add column if not exists payload_hash text null,
  add column if not exists correlation_id text null,
  add column if not exists causation_id text null,
  add column if not exists created_by_kind text null,
  add column if not exists created_by_reference text null,
  add column if not exists expires_at timestamptz null,
  add column if not exists creation_idempotency_key_hash text null,
  add column if not exists request_fingerprint text null;

create unique index if not exists proposal_inbox_core_proposal_id_unique
  on ai.proposal_inbox(core_proposal_id) where core_proposal_id is not null;
create unique index if not exists proposal_inbox_creation_idempotency_unique
  on ai.proposal_inbox(creation_idempotency_key_hash)
  where creation_idempotency_key_hash is not null;
create unique index if not exists proposal_inbox_candidate_id_unique
  on ai.proposal_inbox(candidate_id) where core_proposal_id is not null;

do $migration$ begin
  if not exists (select 1 from pg_constraint where conname='proposal_inbox_core_envelope_check' and conrelid='ai.proposal_inbox'::regclass) then
    alter table ai.proposal_inbox add constraint proposal_inbox_core_envelope_check check (
      core_proposal_id is null or (
        core_proposal_id ~ '^proposal_[0-9a-f]{32}$'
        and proposal_schema_version in (
          'farmos.confirmation-task-proposal.v1',
          'farmos.work-plan-draft-proposal.v1',
          'farmos.assignment-candidate-proposal.v1'
        )
        and source_system is not null and source_reference is not null
        and source_version is not null and candidate_id is not null
        and (parent_proposal_id is null or parent_proposal_id <> core_proposal_id)
        and payload_hash ~ '^sha256:[0-9a-f]{64}$'
        and correlation_id is not null and causation_id is not null
        and created_by_kind in ('hermes_advisory','native_runtime','human_core_author')
        and created_by_reference is not null
        and expires_at > created_at
        and creation_idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'
        and request_fingerprint ~ '^sha256:[0-9a-f]{64}$'
      )
    ) not valid;
  end if;
end $migration$;

create table if not exists ai.proposal_creation_idempotency (
  idempotency_key_hash text primary key check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  request_fingerprint text not null check (request_fingerprint ~ '^sha256:[0-9a-f]{64}$'),
  proposal_id text null,
  status text not null check (status in ('reserved','succeeded','rejected','outcome_unknown')),
  result_json jsonb null,
  rejection_code text null,
  reserved_at timestamptz not null,
  completed_at timestamptz null,
  check ((status='reserved' and completed_at is null) or status<>'reserved'),
  check (proposal_id is null or proposal_id ~ '^proposal_[0-9a-f]{32}$')
);

create table if not exists ai.proposal_execution_state (
  inbox_record_id uuid primary key references ai.proposal_inbox(id) on update restrict on delete restrict,
  proposal_id text not null unique check (proposal_id ~ '^proposal_[0-9a-f]{32}$'),
  proposal_type text not null check (proposal_type in ('confirmation_task','work_plan_draft','assignment_candidate')),
  schema_version text not null check (schema_version='farmos.proposal-execution-state.v1'),
  proposal_version bigint not null check (proposal_version >= 1),
  execution_state_version bigint not null check (execution_state_version >= 1),
  execution_status text not null check (execution_status in ('draft','review_ready','execution_eligible','rejected','expired','superseded','withdrawn')),
  proposal_snapshot_hash text not null check (proposal_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  snapshot_schema_version text not null check (snapshot_schema_version='farmos.proposal-execution-snapshot.v1'),
  operation_type text not null,
  target_system text not null,
  target_reference text not null,
  required_capability text not null,
  scope_constraints jsonb not null check (jsonb_typeof(scope_constraints)='object'),
  correlation_id text not null,
  causation_id text not null,
  proposal_created_at timestamptz not null,
  proposal_updated_at timestamptz not null,
  execution_eligible_at timestamptz null,
  expires_at timestamptz not null,
  superseded_at timestamptz null,
  superseded_by_proposal_id text null,
  state_changed_at timestamptz not null,
  state_changed_reason text not null,
  policy_version text not null,
  contract_version text not null check (contract_version='farmos.proposal-execution-verification.v1'),
  check (expires_at > proposal_created_at),
  check (superseded_by_proposal_id is null or superseded_by_proposal_id <> proposal_id),
  check (
    (proposal_type='confirmation_task' and operation_type='confirmation_task_persist'
      and target_system='farming_app_server_boundary' and required_capability='persist_confirmation_task')
    or (proposal_type='work_plan_draft' and operation_type='create_work_plan_draft'
      and target_system='farming_app_server_boundary' and required_capability='edit_work_plan')
    or (proposal_type='assignment_candidate' and operation_type='assignment_candidate'
      and target_system='farming_app_server_boundary' and required_capability='assign_staff')
  )
);

create or replace function ai.protect_projected_proposal_inbox_binding()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if old.core_proposal_id is not null
     and (
       new.status not in ('pending','needs_revision','rejected')
       or (to_jsonb(new) - array['status','reviewed_by','reviewed_at','review_note','updated_at'])
         <> (to_jsonb(old) - array['status','reviewed_by','reviewed_at','review_note','updated_at'])
     ) then
    raise exception 'projected_proposal_review_or_binding_invalid';
  end if;
  return new;
end $$;
drop trigger if exists proposal_inbox_projected_binding_guard on ai.proposal_inbox;
create trigger proposal_inbox_projected_binding_guard before update
  on ai.proposal_inbox for each row
  execute function ai.protect_projected_proposal_inbox_binding();

create or replace function ai.enforce_proposal_creation_idempotency_transition()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if old.idempotency_key_hash <> new.idempotency_key_hash
     or old.request_fingerprint <> new.request_fingerprint
     or old.reserved_at <> new.reserved_at
     or old.status <> 'reserved'
     or new.status not in ('succeeded','rejected','outcome_unknown') then
    raise exception 'proposal_creation_idempotency_transition_invalid';
  end if;
  return new;
end $$;
drop trigger if exists proposal_creation_idempotency_transition_guard
  on ai.proposal_creation_idempotency;
create trigger proposal_creation_idempotency_transition_guard before update
  on ai.proposal_creation_idempotency for each row
  execute function ai.enforce_proposal_creation_idempotency_transition();

create or replace function ai.enforce_proposal_execution_state_transition()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin
  if new.proposal_id <> old.proposal_id
     or new.inbox_record_id <> old.inbox_record_id
     or new.proposal_type <> old.proposal_type
     or new.schema_version <> old.schema_version
     or new.proposal_version <> old.proposal_version
     or new.operation_type <> old.operation_type
     or new.target_system <> old.target_system
     or new.target_reference <> old.target_reference
     or new.required_capability <> old.required_capability
     or new.scope_constraints <> old.scope_constraints
     or new.correlation_id <> old.correlation_id
     or new.causation_id <> old.causation_id
     or new.expires_at <> old.expires_at
     or new.execution_state_version <> old.execution_state_version + 1
     or new.proposal_snapshot_hash = old.proposal_snapshot_hash
     or not (
       (old.execution_status='draft' and new.execution_status='review_ready')
       or (old.execution_status='review_ready' and new.execution_status in ('execution_eligible','rejected'))
       or (old.execution_status='execution_eligible' and new.execution_status in ('expired','superseded','withdrawn'))
     ) then
    raise exception 'proposal_execution_state_transition_invalid';
  end if;
  return new;
end $$;
drop trigger if exists proposal_execution_state_transition_guard
  on ai.proposal_execution_state;
create trigger proposal_execution_state_transition_guard before update
  on ai.proposal_execution_state for each row
  execute function ai.enforce_proposal_execution_state_transition();

create table if not exists audit.proposal_creation_events (
  event_id uuid primary key,
  proposal_id text not null,
  proposal_type text not null,
  source_reference text not null,
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_by_kind text not null,
  created_by_reference text not null,
  correlation_id text not null,
  causation_id text not null,
  created_at timestamptz not null
);

create table if not exists audit.proposal_execution_state_events (
  event_id uuid primary key,
  proposal_id text not null,
  previous_proposal_version bigint null,
  new_proposal_version bigint not null,
  previous_execution_state_version bigint null,
  new_execution_state_version bigint not null,
  previous_status text null,
  new_status text not null,
  previous_snapshot_hash text null,
  new_snapshot_hash text not null check (new_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  change_reason text not null,
  correlation_id text not null,
  causation_id text not null,
  changed_at timestamptz not null
);

create or replace function audit.reject_proposal_audit_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'proposal_audit_is_append_only'; end $$;

drop trigger if exists proposal_creation_events_append_only on audit.proposal_creation_events;
create trigger proposal_creation_events_append_only before update or delete
  on audit.proposal_creation_events for each statement execute function audit.reject_proposal_audit_mutation();
drop trigger if exists proposal_execution_state_events_append_only on audit.proposal_execution_state_events;
create trigger proposal_execution_state_events_append_only before update or delete
  on audit.proposal_execution_state_events for each statement execute function audit.reject_proposal_audit_mutation();

do $roles$ begin
  if not exists(select 1 from pg_roles where rolname='farmos_core_proposal_writer') then create role farmos_core_proposal_writer nologin; end if;
  if not exists(select 1 from pg_roles where rolname='farmos_core_proposal_reviewer') then create role farmos_core_proposal_reviewer nologin; end if;
  if not exists(select 1 from pg_roles where rolname='farmos_core_projection_reader') then create role farmos_core_projection_reader nologin; end if;
  if not exists(select 1 from pg_roles where rolname='farmos_core_projection_writer') then create role farmos_core_projection_writer nologin; end if;
  if not exists(select 1 from pg_roles where rolname='farmos_core_proposal_audit_writer') then create role farmos_core_proposal_audit_writer nologin; end if;
  if not exists(select 1 from pg_roles where rolname='farmos_core_proposal_transaction') then create role farmos_core_proposal_transaction nologin; end if;
end $roles$;

revoke all on ai.proposal_creation_idempotency, ai.proposal_execution_state,
  audit.proposal_creation_events, audit.proposal_execution_state_events,
  core_schema.migration_history from public;
revoke create on schema ai, audit, core_schema from public;
grant usage on schema ai to farmos_core_proposal_writer, farmos_core_projection_reader, farmos_core_projection_writer;
grant usage on schema audit to farmos_core_proposal_audit_writer;
grant insert,select,update(status,result_json,rejection_code,completed_at,proposal_id)
  on ai.proposal_creation_idempotency to farmos_core_proposal_writer;
grant insert on ai.proposal_inbox to farmos_core_proposal_writer;
grant select on ai.proposal_execution_state to farmos_core_projection_reader;
grant insert,select on ai.proposal_execution_state to farmos_core_projection_writer;
grant update(execution_state_version,execution_status,proposal_snapshot_hash,
  proposal_updated_at,execution_eligible_at,superseded_at,superseded_by_proposal_id,
  state_changed_at,state_changed_reason)
  on ai.proposal_execution_state to farmos_core_projection_writer;
grant insert on audit.proposal_creation_events, audit.proposal_execution_state_events
  to farmos_core_proposal_audit_writer;
grant farmos_core_proposal_writer, farmos_core_projection_writer,
  farmos_core_proposal_audit_writer to farmos_core_proposal_transaction;

commit;
