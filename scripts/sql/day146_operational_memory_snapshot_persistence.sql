begin;

create schema if not exists ai;

create table if not exists ai.operational_memory_source_snapshots (
  snapshot_id text primary key,
  contract_version text not null
    check (contract_version = 'farming_app.work_records.stable_changes.v1'),
  source_system text not null check (source_system = 'farming_app'),
  source_record_id text not null,
  source_record_version bigint,
  source_content_hash text
    check (source_content_hash is null or source_content_hash ~ '^[0-9a-f]{64}$'),
  operation text not null check (operation in ('upsert', 'tombstone')),
  business_date date not null,
  recorded_at timestamptz,
  source_updated_at timestamptz not null,
  deleted_at timestamptz,
  field_reference text,
  crop_cycle_reference text,
  work_type_reference text,
  safe_payload jsonb not null check (safe_payload = '{}'::jsonb),
  observed_at timestamptz not null,
  ingestion_sequence bigint generated always as identity unique,
  initial_state text not null check (initial_state in ('active', 'tombstoned')),
  supersedes_snapshot_id text references ai.operational_memory_source_snapshots,
  rejection_code text,
  check (source_record_version is not null or source_content_hash is not null),
  check (
    (operation = 'upsert' and recorded_at is not null and deleted_at is null)
    or
    (operation = 'tombstone' and deleted_at is not null)
  )
);

create unique index if not exists
  uq_operational_memory_snapshot_source_version
  on ai.operational_memory_source_snapshots
    (source_record_id, source_record_version)
  where source_record_version is not null;

create unique index if not exists
  uq_operational_memory_snapshot_source_hash_without_version
  on ai.operational_memory_source_snapshots
    (source_record_id, source_content_hash)
  where source_record_version is null;

create table if not exists ai.operational_memory_snapshot_state_events (
  event_id text primary key,
  snapshot_id text not null
    references ai.operational_memory_source_snapshots,
  state text not null
    check (state in ('active', 'superseded', 'tombstoned', 'rejected')),
  event_sequence bigint generated always as identity unique,
  occurred_at timestamptz not null
);

create table if not exists ai.operational_memory_daily_projections (
  projection_id text primary key,
  projection_type text not null check (projection_type = 'daily_work_records'),
  projection_version integer not null check (projection_version > 0),
  business_date date not null,
  compiler_id text not null
    check (compiler_id = 'farmos.operational_memory.daily_work_records'),
  compiler_version integer not null check (compiler_version = 1),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  projection_content jsonb not null,
  generated_at timestamptz not null,
  supersedes_projection_id text
    references ai.operational_memory_daily_projections,
  unique (business_date, projection_version)
);

create table if not exists ai.operational_memory_projection_state_events (
  event_id text primary key,
  projection_id text not null
    references ai.operational_memory_daily_projections,
  status text not null check (status in ('active', 'superseded', 'failed')),
  event_sequence bigint generated always as identity unique,
  occurred_at timestamptz not null
);

create table if not exists ai.operational_memory_projection_lineage (
  projection_id text not null
    references ai.operational_memory_daily_projections,
  snapshot_id text not null
    references ai.operational_memory_source_snapshots,
  source_record_id text not null,
  source_content_hash text,
  relation text not null
    check (relation in ('included', 'excluded_by_tombstone', 'superseded')),
  primary key (projection_id, snapshot_id)
);

create table if not exists ai.operational_memory_ingestion_rejections (
  rejection_id text primary key,
  source_record_id text,
  failure_code text not null check (failure_code in (
    'invalid_contract',
    'invalid_change',
    'missing_business_date',
    'invalid_timestamp',
    'invalid_hash',
    'source_version_hash_conflict',
    'restricted_data_detected',
    'projection_generation_failed',
    'lineage_write_failed',
    'unexpected_error'
  )),
  observed_at timestamptz not null
);

create or replace function ai.reject_operational_memory_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'operational_memory_append_only';
end;
$$;

do $day146$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'operational_memory_source_snapshots',
    'operational_memory_snapshot_state_events',
    'operational_memory_daily_projections',
    'operational_memory_projection_state_events',
    'operational_memory_projection_lineage',
    'operational_memory_ingestion_rejections'
  ]
  loop
    trigger_name := table_name || '_append_only';
    if not exists (
      select 1
      from pg_trigger
      where tgname = trigger_name
        and tgrelid = format('ai.%I', table_name)::regclass
    ) then
      execute format(
        'create trigger %I before update or delete on ai.%I '
        || 'for each row execute function '
        || 'ai.reject_operational_memory_immutable_mutation()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end;
$day146$;

create or replace function ai.persist_operational_memory_bundle(
  p_snapshots jsonb,
  p_snapshot_events jsonb,
  p_projections jsonb,
  p_projection_events jsonb,
  p_lineage jsonb,
  p_rejections jsonb
) returns jsonb
language plpgsql
as $$
declare
  snapshot_count integer := jsonb_array_length(p_snapshots);
  projection_count integer := jsonb_array_length(p_projections);
  lineage_count integer := jsonb_array_length(p_lineage);
begin
  if jsonb_typeof(p_snapshots) <> 'array'
    or jsonb_typeof(p_snapshot_events) <> 'array'
    or jsonb_typeof(p_projections) <> 'array'
    or jsonb_typeof(p_projection_events) <> 'array'
    or jsonb_typeof(p_lineage) <> 'array'
    or jsonb_typeof(p_rejections) <> 'array'
  then
    raise exception 'operational_memory_bundle_invalid';
  end if;

  insert into ai.operational_memory_source_snapshots (
    snapshot_id, contract_version, source_system, source_record_id,
    source_record_version, source_content_hash, operation, business_date,
    recorded_at, source_updated_at, deleted_at, field_reference,
    crop_cycle_reference, work_type_reference, safe_payload, observed_at,
    initial_state, supersedes_snapshot_id, rejection_code
  )
  select snapshot_id, contract_version, source_system, source_record_id,
    source_record_version, source_content_hash, operation, business_date,
    recorded_at, source_updated_at, deleted_at, field_reference,
    crop_cycle_reference, work_type_reference, safe_payload, observed_at,
    initial_state, supersedes_snapshot_id, rejection_code
  from jsonb_to_recordset(p_snapshots) as row(
    snapshot_id text, contract_version text, source_system text,
    source_record_id text, source_record_version bigint,
    source_content_hash text, operation text, business_date date,
    recorded_at timestamptz, source_updated_at timestamptz,
    deleted_at timestamptz, field_reference text,
    crop_cycle_reference text, work_type_reference text, safe_payload jsonb,
    observed_at timestamptz, initial_state text,
    supersedes_snapshot_id text, rejection_code text
  );

  insert into ai.operational_memory_snapshot_state_events (
    event_id, snapshot_id, state, occurred_at
  )
  select event_id, snapshot_id, state, occurred_at
  from jsonb_to_recordset(p_snapshot_events) as row(
    event_id text, snapshot_id text, state text, occurred_at timestamptz
  );

  insert into ai.operational_memory_daily_projections (
    projection_id, projection_type, projection_version, business_date,
    compiler_id, compiler_version, content_hash, projection_content,
    generated_at, supersedes_projection_id
  )
  select projection_id, projection_type, projection_version, business_date,
    compiler_id, compiler_version, content_hash, projection_content,
    generated_at, supersedes_projection_id
  from jsonb_to_recordset(p_projections) as row(
    projection_id text, projection_type text, projection_version integer,
    business_date date, compiler_id text, compiler_version integer,
    content_hash text, projection_content jsonb, generated_at timestamptz,
    supersedes_projection_id text
  );

  insert into ai.operational_memory_projection_state_events (
    event_id, projection_id, status, occurred_at
  )
  select event_id, projection_id, status, occurred_at
  from jsonb_to_recordset(p_projection_events) as row(
    event_id text, projection_id text, status text, occurred_at timestamptz
  );

  insert into ai.operational_memory_projection_lineage (
    projection_id, snapshot_id, source_record_id, source_content_hash, relation
  )
  select projection_id, snapshot_id, source_record_id,
    source_content_hash, relation
  from jsonb_to_recordset(p_lineage) as row(
    projection_id text, snapshot_id text, source_record_id text,
    source_content_hash text, relation text
  );

  insert into ai.operational_memory_ingestion_rejections (
    rejection_id, source_record_id, failure_code, observed_at
  )
  select rejection_id, source_record_id, failure_code, observed_at
  from jsonb_to_recordset(p_rejections) as row(
    rejection_id text, source_record_id text,
    failure_code text, observed_at timestamptz
  );

  return jsonb_build_object(
    'status', 'committed',
    'snapshot_count', snapshot_count,
    'projection_count', projection_count,
    'lineage_count', lineage_count
  );
end;
$$;

commit;
