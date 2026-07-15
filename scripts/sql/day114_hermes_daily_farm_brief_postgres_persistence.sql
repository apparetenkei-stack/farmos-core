begin;

create schema if not exists ai;

create table if not exists ai.daily_farm_brief_records (
  record_id text not null,
  record_kind text not null check (record_kind in ('projectable_brief', 'generation_state')),
  business_date date not null,
  version integer not null check (version > 0),
  record_status text not null check (record_status in ('canonical', 'superseded')),
  generated_at timestamptz,
  snapshot jsonb,
  scope_index jsonb,
  generation_status text,
  generation_state text,
  retry_count integer,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  record_schema_version text not null check (record_schema_version = 'hermes.daily_farm_brief.persisted_record.v1'),
  safety jsonb not null,
  primary key (record_id, version),
  check (updated_at >= created_at),
  check (
    (record_kind = 'projectable_brief' and generated_at is not null and snapshot is not null and scope_index is not null and generation_status = 'completed' and generation_state is null and retry_count is null)
    or
    (record_kind = 'generation_state' and generated_at is null and snapshot is null and scope_index is null and generation_status is null and generation_state in ('in_progress', 'failed', 'unavailable') and retry_count between 0 and 3)
  )
);

create unique index if not exists uq_daily_farm_brief_records_canonical_chain
  on ai.daily_farm_brief_records (record_kind, business_date)
  where record_status = 'canonical';

create table if not exists ai.daily_farm_brief_persistence_commands (
  idempotency_key text primary key,
  command_type text not null check (command_type in ('persist_projectable_brief', 'persist_generation_state')),
  business_date date not null,
  source_execution_reference text not null,
  command_fingerprint text not null check (command_fingerprint ~ '^[0-9a-f]{64}$'),
  semantic_fingerprint text not null check (semantic_fingerprint ~ '^[0-9a-f]{64}$'),
  result_status text not null check (result_status in ('committed')),
  record_id text not null,
  record_version integer not null check (record_version > 0),
  created_at timestamptz not null,
  unique (command_type, business_date, source_execution_reference),
  foreign key (record_id, record_version) references ai.daily_farm_brief_records (record_id, version)
);

create or replace function ai.persist_daily_farm_brief_command(
  p_command jsonb,
  p_command_fingerprint text,
  p_semantic_fingerprint text,
  p_fail_after_supersede boolean default false
) returns jsonb
language plpgsql
as $$
declare
  v_record jsonb := p_command -> 'record';
  v_existing ai.daily_farm_brief_persistence_commands%rowtype;
  v_current ai.daily_farm_brief_records%rowtype;
  v_expected integer := nullif(p_command ->> 'expected_current_version', '')::integer;
  v_chain_count integer;
  v_chain_max integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(concat_ws('|', v_record ->> 'record_kind', p_command ->> 'business_date', v_record ->> 'record_id'), 0));

  select command_fingerprint, semantic_fingerprint into v_existing.command_fingerprint, v_existing.semantic_fingerprint
    from ai.daily_farm_brief_persistence_commands where idempotency_key = p_command ->> 'idempotency_key';
  if found then
    if v_existing.command_fingerprint = p_command_fingerprint then
      return jsonb_build_object('status','reused','error_code',null);
    end if;
    return jsonb_build_object('status','rejected','error_code','idempotency_conflict');
  end if;

  select command_fingerprint, semantic_fingerprint into v_existing.command_fingerprint, v_existing.semantic_fingerprint
    from ai.daily_farm_brief_persistence_commands
    where command_type = p_command ->> 'command_type'
      and business_date = (p_command ->> 'business_date')::date
      and source_execution_reference = p_command ->> 'source_execution_reference';
  if found then
    if v_existing.semantic_fingerprint = p_semantic_fingerprint then
      return jsonb_build_object('status','reused','error_code',null);
    end if;
    return jsonb_build_object('status','rejected','error_code','source_execution_conflict');
  end if;

  select count(*), max(version) into v_chain_count, v_chain_max
    from ai.daily_farm_brief_records where record_id = v_record ->> 'record_id';
  if v_chain_count > 0 and (v_chain_max <> v_chain_count or (select count(*) from ai.daily_farm_brief_records where record_id = v_record ->> 'record_id' and record_status = 'canonical') <> 1) then
    return jsonb_build_object('status','rejected','error_code','invalid_existing_chain');
  end if;

  select record_id, version into v_current.record_id, v_current.version from ai.daily_farm_brief_records
    where record_kind = v_record ->> 'record_kind' and business_date = (p_command ->> 'business_date')::date and record_status = 'canonical'
    for update;
  if found and v_current.record_id <> v_record ->> 'record_id' then
    return jsonb_build_object('status','rejected','error_code','concurrency_conflict');
  end if;
  if (not found and v_expected is not null) or (found and v_current.version is distinct from v_expected) then
    return jsonb_build_object('status','rejected','error_code','version_conflict');
  end if;

  if found then
    update ai.daily_farm_brief_records set record_status = 'superseded', updated_at = (p_command ->> 'requested_at')::timestamptz
      where record_id = v_current.record_id and version = v_current.version;
  end if;
  if p_fail_after_supersede then raise exception 'day114_injected_transaction_failure'; end if;

  insert into ai.daily_farm_brief_records (
    record_id, record_kind, business_date, version, record_status, generated_at, snapshot, scope_index,
    generation_status, generation_state, retry_count, created_at, updated_at, record_schema_version, safety
  ) values (
    v_record ->> 'record_id', v_record ->> 'record_kind', (v_record ->> 'business_date')::date,
    (v_record ->> 'version')::integer, v_record ->> 'record_status', (v_record ->> 'generated_at')::timestamptz,
    v_record -> 'snapshot', v_record -> 'scope_index', v_record ->> 'generation_status', v_record ->> 'generation_state',
    (v_record ->> 'retry_count')::integer, (v_record ->> 'created_at')::timestamptz, (v_record ->> 'updated_at')::timestamptz,
    v_record ->> 'record_schema_version', v_record -> 'safety'
  );
  insert into ai.daily_farm_brief_persistence_commands values (
    p_command ->> 'idempotency_key', p_command ->> 'command_type', (p_command ->> 'business_date')::date,
    p_command ->> 'source_execution_reference', p_command_fingerprint, p_semantic_fingerprint, 'committed',
    v_record ->> 'record_id', (v_record ->> 'version')::integer, (p_command ->> 'requested_at')::timestamptz
  );
  return jsonb_build_object('status','committed','error_code',null);
end;
$$;

commit;
