begin;

create schema if not exists ai;

create table if not exists ai.rtx_structuring_jobs (
  job_id text primary key,
  contract_version text not null
    check (contract_version = 'farmos.operational_memory.rtx_structuring_job.v1'),
  source_snapshot_id text not null,
  source_record_id text not null,
  source_content_hash text not null
    check (source_content_hash ~ '^[0-9a-f]{64}$'),
  business_date date not null,
  semantic_source_status text not null check (semantic_source_status = 'fixture_only'),
  production_job_creation boolean not null check (production_job_creation = false),
  job_json jsonb not null,
  created_at timestamptz not null,
  not_before timestamptz not null,
  maximum_attempts integer not null check (maximum_attempts = 3),
  unique (source_snapshot_id, contract_version)
);

create table if not exists ai.rtx_structuring_job_state_events (
  event_id text primary key,
  job_id text not null references ai.rtx_structuring_jobs,
  status text not null check (status in (
    'queued', 'leased', 'completed', 'retry_pending',
    'review_required', 'failed', 'cancelled'
  )),
  attempt integer not null check (attempt between 0 and 3),
  available_at timestamptz not null,
  lease_owner text,
  lease_expires_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  completed_at timestamptz,
  failure_code text,
  event_sequence bigint generated always as identity unique,
  check (
    (status = 'leased' and lease_owner is not null and lease_expires_at is not null)
    or
    (status <> 'leased' and lease_owner is null and lease_expires_at is null)
  )
);

create table if not exists ai.rtx_structuring_candidates (
  candidate_id text primary key,
  job_id text not null references ai.rtx_structuring_jobs,
  source_snapshot_id text not null,
  source_content_hash text not null
    check (source_content_hash ~ '^[0-9a-f]{64}$'),
  model_provenance jsonb not null,
  candidate_json jsonb,
  validation_result text not null
    check (validation_result in ('accepted_candidate', 'rejected')),
  validation_errors jsonb not null,
  created_at timestamptz not null,
  state text not null
    check (state in ('candidate', 'review_required', 'rejected', 'superseded')),
  business_sot boolean not null check (business_sot = false),
  projection_active_version boolean not null
    check (projection_active_version = false),
  automatically_promoted boolean not null check (automatically_promoted = false),
  worker_output_untrusted boolean not null check (worker_output_untrusted = true)
);

create or replace function ai.reject_rtx_structuring_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rtx_structuring_append_only';
end;
$$;

do $day146_d2$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'rtx_structuring_jobs',
    'rtx_structuring_job_state_events',
    'rtx_structuring_candidates'
  ]
  loop
    trigger_name := table_name || '_append_only';
    if not exists (
      select 1 from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('ai.%I', table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update or delete on ai.%I '
        || 'for each row execute function '
        || 'ai.reject_rtx_structuring_immutable_mutation()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end;
$day146_d2$;

create or replace function ai.persist_rtx_structuring_bundle(
  p_jobs jsonb,
  p_events jsonb,
  p_candidates jsonb
) returns jsonb
language plpgsql
as $$
declare
  job_count integer;
  event_count integer;
  candidate_count integer;
begin
  if jsonb_typeof(p_jobs) <> 'array'
    or jsonb_typeof(p_events) <> 'array'
    or jsonb_typeof(p_candidates) <> 'array'
  then
    raise exception 'rtx_structuring_bundle_invalid';
  end if;
  job_count := jsonb_array_length(p_jobs);
  event_count := jsonb_array_length(p_events);
  candidate_count := jsonb_array_length(p_candidates);

  insert into ai.rtx_structuring_jobs (
    job_id, contract_version, source_snapshot_id, source_record_id,
    source_content_hash, business_date, semantic_source_status,
    production_job_creation, job_json, created_at, not_before, maximum_attempts
  )
  select job_id, contract_version, source_snapshot_id, source_record_id,
    source_content_hash, business_date, semantic_source_status,
    production_job_creation, job_json, created_at, not_before, maximum_attempts
  from jsonb_to_recordset(p_jobs) as row(
    job_id text, contract_version text, source_snapshot_id text,
    source_record_id text, source_content_hash text, business_date date,
    semantic_source_status text, production_job_creation boolean,
    job_json jsonb, created_at timestamptz, not_before timestamptz,
    maximum_attempts integer
  );

  insert into ai.rtx_structuring_job_state_events (
    event_id, job_id, status, attempt, available_at, lease_owner,
    lease_expires_at, created_at, updated_at, completed_at, failure_code,
    event_sequence
  )
  overriding system value
  select event_id, job_id, status, attempt, available_at, lease_owner,
    lease_expires_at, created_at, updated_at, completed_at, failure_code,
    sequence
  from jsonb_to_recordset(p_events) as row(
    event_id text, job_id text, status text, attempt integer,
    available_at timestamptz, lease_owner text, lease_expires_at timestamptz,
    created_at timestamptz, updated_at timestamptz,
    completed_at timestamptz, failure_code text, sequence bigint
  );

  insert into ai.rtx_structuring_candidates (
    candidate_id, job_id, source_snapshot_id, source_content_hash,
    model_provenance, candidate_json, validation_result, validation_errors,
    created_at, state, business_sot, projection_active_version,
    automatically_promoted, worker_output_untrusted
  )
  select candidate_id, job_id, source_snapshot_id, source_content_hash,
    model_provenance, candidate_json, validation_result, validation_errors,
    created_at, state, business_sot, projection_active_version,
    automatically_promoted, worker_output_untrusted
  from jsonb_to_recordset(p_candidates) as row(
    candidate_id text, job_id text, source_snapshot_id text,
    source_content_hash text, model_provenance jsonb, candidate_json jsonb,
    validation_result text, validation_errors jsonb, created_at timestamptz,
    state text, business_sot boolean, projection_active_version boolean,
    automatically_promoted boolean, worker_output_untrusted boolean
  );

  return jsonb_build_object(
    'status', 'committed',
    'job_count', job_count,
    'event_count', event_count,
    'candidate_count', candidate_count
  );
end;
$$;

commit;
