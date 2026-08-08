-- FarmOS Core immutable forward-only migration artifact.
-- Never run automatically at process startup or against production without
-- explicit authenticated-human authority.
begin;

do $stable_changes_preflight$
declare
  ai_schema oid := pg_catalog.to_regnamespace('ai');
begin
  if ai_schema is null or not pg_catalog.pg_has_role(
    current_user,
    (select namespace_row.nspowner from pg_catalog.pg_namespace namespace_row
      where namespace_row.oid = ai_schema),
    'USAGE'
  ) then
    raise exception using errcode = '42501',
      message = 'stable_changes_persistence_owner_invalid';
  end if;
  if pg_catalog.to_regclass('ai.stable_changes_consumer_scopes') is not null
    or pg_catalog.to_regclass('ai.stable_changes_consumer_checkpoints') is not null
    or pg_catalog.to_regclass('ai.stable_changes_page_commit_receipts') is not null
    or pg_catalog.to_regclass('ai.stable_changes_validated_ingress') is not null
  then
    raise exception using errcode = '55000',
      message = 'stable_changes_persistence_objects_already_exist';
  end if;
end
$stable_changes_preflight$;

do $stable_changes_role$
declare
  runtime_role oid := pg_catalog.to_regrole(
    'farmos_core_stable_changes_runtime'
  );
  role_row record;
begin
  if runtime_role is null then
    create role farmos_core_stable_changes_runtime
      nologin nosuperuser nocreatedb nocreaterole noinherit noreplication
      nobypassrls;
  else
    select * into role_row from pg_catalog.pg_roles where oid = runtime_role;
    if role_row.rolcanlogin or role_row.rolsuper or role_row.rolcreatedb
      or role_row.rolcreaterole or role_row.rolinherit
      or role_row.rolreplication or role_row.rolbypassrls
      or exists (
        select 1 from pg_catalog.pg_auth_members membership
        where membership.roleid = runtime_role
          or membership.member = runtime_role
      )
      or exists (
        select 1 from pg_catalog.pg_class class_row
        where class_row.relowner = runtime_role
      )
      or exists (
        select 1 from pg_catalog.pg_proc procedure_row
        where procedure_row.proowner = runtime_role
      )
      or exists (
        select 1 from pg_catalog.pg_namespace namespace_row
        where namespace_row.nspowner = runtime_role
      )
    then
      raise exception using errcode = '42501',
        message = 'stable_changes_runtime_role_invalid';
    end if;
  end if;
end
$stable_changes_role$;

create table ai.stable_changes_consumer_scopes (
  stable_changes_scope_id text primary key,
  contract_version text not null,
  installation_id text not null,
  farm_id text not null,
  from_business_date date not null,
  to_business_date date not null,
  page_size smallint not null,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint stable_changes_scope_id_check
    check (stable_changes_scope_id ~ '^scs1_[0-9a-f]{64}$'),
  constraint stable_changes_scope_contract_check check (
    contract_version = 'farming_app.work_records.stable_changes.v1'
  ),
  constraint stable_changes_scope_installation_check check (
    installation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  constraint stable_changes_scope_farm_check check (
    farm_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  constraint stable_changes_scope_range_check check (
    to_business_date >= from_business_date
    and to_business_date - from_business_date between 0 and 30
  ),
  constraint stable_changes_scope_page_size_check check (page_size between 1 and 100),
  constraint stable_changes_scope_tuple_unique unique (
    contract_version, installation_id, farm_id, from_business_date,
    to_business_date, page_size
  )
);

create table ai.stable_changes_consumer_checkpoints (
  stable_changes_scope_id text primary key,
  cursor text,
  generation bigint not null default 0,
  last_source_updated_at timestamptz(6),
  last_change_sequence bigint,
  last_successful_page_at timestamptz(6),
  last_returned_count integer,
  last_accepted_count integer,
  last_duplicate_count integer,
  last_has_more boolean,
  last_page_fingerprint text,
  created_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  updated_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  constraint stable_changes_checkpoint_scope_fk foreign key (
    stable_changes_scope_id
  ) references ai.stable_changes_consumer_scopes(stable_changes_scope_id)
    on update restrict on delete restrict,
  constraint stable_changes_checkpoint_generation_check check (generation >= 0),
  constraint stable_changes_checkpoint_cursor_check check (
    cursor is null or pg_catalog.length(cursor) between 1 and 512
  ),
  constraint stable_changes_checkpoint_order_pair_check check (
    (last_source_updated_at is null) = (last_change_sequence is null)
    and (last_change_sequence is null or last_change_sequence > 0)
  ),
  constraint stable_changes_checkpoint_counts_check check (
    (last_returned_count is null and last_accepted_count is null
      and last_duplicate_count is null)
    or (last_returned_count >= 0 and last_accepted_count >= 0
      and last_duplicate_count >= 0
      and last_returned_count = last_accepted_count + last_duplicate_count)
  ),
  constraint stable_changes_checkpoint_page_metadata_check check (
    (generation = 0 and last_successful_page_at is null
      and last_returned_count is null and last_has_more is null
      and last_page_fingerprint is null)
    or (generation > 0 and last_successful_page_at is not null
      and last_returned_count is not null and last_has_more is not null
      and last_page_fingerprint ~ '^[0-9a-f]{64}$')
  )
);

create table ai.stable_changes_page_commit_receipts (
  stable_changes_scope_id text not null,
  committed_generation bigint not null,
  expected_generation bigint not null,
  request_cursor_digest text not null,
  next_cursor_digest text not null,
  page_fingerprint text not null,
  first_source_updated_at timestamptz(6),
  first_change_sequence bigint,
  last_source_updated_at timestamptz(6),
  last_change_sequence bigint,
  returned_count integer not null,
  accepted_count integer not null,
  duplicate_count integer not null,
  has_more boolean not null,
  committed_at timestamptz(6) not null default pg_catalog.clock_timestamp(),
  primary key (stable_changes_scope_id, committed_generation),
  constraint stable_changes_receipt_scope_fk foreign key (
    stable_changes_scope_id
  ) references ai.stable_changes_consumer_scopes(stable_changes_scope_id)
    on update restrict on delete restrict,
  constraint stable_changes_receipt_generation_check check (
    expected_generation >= 0 and committed_generation = expected_generation + 1
  ),
  constraint stable_changes_receipt_hashes_check check (
    request_cursor_digest ~ '^[0-9a-f]{64}$'
    and next_cursor_digest ~ '^[0-9a-f]{64}$'
    and page_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  constraint stable_changes_receipt_first_order_pair_check check (
    (first_source_updated_at is null) = (first_change_sequence is null)
    and (first_change_sequence is null or first_change_sequence > 0)
  ),
  constraint stable_changes_receipt_last_order_pair_check check (
    (last_source_updated_at is null) = (last_change_sequence is null)
    and (last_change_sequence is null or last_change_sequence > 0)
  ),
  constraint stable_changes_receipt_counts_check check (
    returned_count >= 0 and accepted_count >= 0 and duplicate_count >= 0
    and returned_count = accepted_count + duplicate_count
  )
);

create index stable_changes_receipt_reconciliation_idx
on ai.stable_changes_page_commit_receipts (
  stable_changes_scope_id, expected_generation, committed_generation,
  page_fingerprint
);

create table ai.stable_changes_validated_ingress (
  stable_changes_scope_id text not null,
  change_sequence bigint not null,
  committed_generation bigint not null,
  page_position integer not null,
  operation text not null,
  source_record_id text not null,
  source_record_version bigint,
  source_content_hash text not null,
  business_date date not null,
  recorded_at timestamptz(6),
  source_updated_at timestamptz(6) not null,
  deleted_at timestamptz(6),
  field_reference text,
  crop_cycle_reference text,
  work_type_reference text,
  disposition text not null,
  duplicate_target_sequence bigint,
  dto_identity_hash text not null,
  consumed_at timestamptz(6) not null,
  primary key (stable_changes_scope_id, change_sequence),
  constraint stable_changes_ingress_scope_fk foreign key (
    stable_changes_scope_id
  ) references ai.stable_changes_consumer_scopes(stable_changes_scope_id)
    on update restrict on delete restrict,
  constraint stable_changes_ingress_receipt_fk foreign key (
    stable_changes_scope_id, committed_generation
  ) references ai.stable_changes_page_commit_receipts(
    stable_changes_scope_id, committed_generation
  ) deferrable initially deferred,
  constraint stable_changes_ingress_duplicate_fk foreign key (
    stable_changes_scope_id, duplicate_target_sequence
  ) references ai.stable_changes_validated_ingress(
    stable_changes_scope_id, change_sequence
  ) deferrable initially deferred,
  constraint stable_changes_ingress_sequence_check check (change_sequence > 0),
  constraint stable_changes_ingress_page_position_check check (page_position >= 0),
  constraint stable_changes_ingress_operation_check check (
    operation in ('upsert', 'tombstone')
  ),
  constraint stable_changes_ingress_source_id_check check (
    source_record_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
  ),
  constraint stable_changes_ingress_version_check check (
    source_record_version is null or source_record_version >= 0
  ),
  constraint stable_changes_ingress_hash_check check (
    source_content_hash ~ '^[0-9a-f]{64}$'
    and dto_identity_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint stable_changes_ingress_reference_check check (
    (field_reference is null or
      field_reference ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')
    and crop_cycle_reference is null
    and (work_type_reference is null or
      work_type_reference ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$')
  ),
  constraint stable_changes_ingress_operation_time_check check (
    (operation = 'upsert' and recorded_at is not null and deleted_at is null)
    or (operation = 'tombstone' and deleted_at is not null)
  ),
  constraint stable_changes_ingress_disposition_check check (
    (disposition = 'accepted' and duplicate_target_sequence is null)
    or (disposition = 'semantic_duplicate'
      and duplicate_target_sequence is not null
      and duplicate_target_sequence <> change_sequence)
  )
);

create index stable_changes_ingress_semantic_idx
on ai.stable_changes_validated_ingress (
  stable_changes_scope_id, source_record_id, source_content_hash,
  change_sequence desc
);
create index stable_changes_ingress_source_version_idx
on ai.stable_changes_validated_ingress (
  stable_changes_scope_id, source_record_id, source_record_version
) where source_record_version is not null;
create index stable_changes_ingress_ordering_idx
on ai.stable_changes_validated_ingress (
  stable_changes_scope_id, source_updated_at, change_sequence
);
create index stable_changes_ingress_generation_idx
on ai.stable_changes_validated_ingress (
  stable_changes_scope_id, committed_generation
);

create function ai.reject_stable_changes_immutable_mutation()
returns trigger
language plpgsql
security invoker
volatile
set search_path = pg_catalog
as $stable_changes_append_only$
begin
  raise exception using errcode = '55000',
    message = 'stable_changes_append_only';
end
$stable_changes_append_only$;

create trigger stable_changes_consumer_scopes_append_only
before update or delete on ai.stable_changes_consumer_scopes
for each row execute function ai.reject_stable_changes_immutable_mutation();
create trigger stable_changes_consumer_scopes_truncate_guard
before truncate on ai.stable_changes_consumer_scopes
for each statement execute function ai.reject_stable_changes_immutable_mutation();

create trigger stable_changes_page_commit_receipts_append_only
before update or delete on ai.stable_changes_page_commit_receipts
for each row execute function ai.reject_stable_changes_immutable_mutation();
create trigger stable_changes_page_commit_receipts_truncate_guard
before truncate on ai.stable_changes_page_commit_receipts
for each statement execute function ai.reject_stable_changes_immutable_mutation();

create trigger stable_changes_validated_ingress_append_only
before update or delete on ai.stable_changes_validated_ingress
for each row execute function ai.reject_stable_changes_immutable_mutation();
create trigger stable_changes_validated_ingress_truncate_guard
before truncate on ai.stable_changes_validated_ingress
for each statement execute function ai.reject_stable_changes_immutable_mutation();

create function ai.stable_changes_checkpoint_json(p_scope_id text)
returns jsonb
language sql
security invoker
stable
set search_path = pg_catalog
as $stable_changes_checkpoint_json$
  select pg_catalog.jsonb_build_object(
    'stable_changes_scope_id', checkpoint.stable_changes_scope_id,
    'cursor', checkpoint.cursor,
    'generation', checkpoint.generation::text,
    'last_source_updated_at', checkpoint.last_source_updated_at,
    'last_change_sequence', checkpoint.last_change_sequence::text,
    'last_successful_page_at', checkpoint.last_successful_page_at,
    'last_returned_count', checkpoint.last_returned_count,
    'last_accepted_count', checkpoint.last_accepted_count,
    'last_duplicate_count', checkpoint.last_duplicate_count,
    'last_has_more', checkpoint.last_has_more,
    'last_page_fingerprint', checkpoint.last_page_fingerprint,
    'created_at', checkpoint.created_at,
    'updated_at', checkpoint.updated_at
  )
  from ai.stable_changes_consumer_checkpoints checkpoint
  where checkpoint.stable_changes_scope_id = p_scope_id
$stable_changes_checkpoint_json$;

create function ai.stable_changes_canonical_jsonb(p_value jsonb)
returns text
language plpgsql
security invoker
immutable
strict
set search_path = pg_catalog
as $stable_changes_canonical_jsonb$
declare
  canonical text;
begin
  if pg_catalog.jsonb_typeof(p_value) = 'object' then
    select '{' || coalesce(pg_catalog.string_agg(
      pg_catalog.to_jsonb(entry.key)::text || ':' ||
        ai.stable_changes_canonical_jsonb(entry.value),
      ',' order by entry.key collate pg_catalog."C"
    ), '') || '}' into canonical
    from pg_catalog.jsonb_each(p_value) entry;
    return canonical;
  end if;
  if pg_catalog.jsonb_typeof(p_value) = 'array' then
    select '[' || coalesce(pg_catalog.string_agg(
      ai.stable_changes_canonical_jsonb(entry.value),
      ',' order by entry.position
    ), '') || ']' into canonical
    from pg_catalog.jsonb_array_elements(p_value) with ordinality
      entry(value, position);
    return canonical;
  end if;
  return p_value::text;
end
$stable_changes_canonical_jsonb$;

create function ai.initialize_stable_changes_consumer_scope(
  p_installation_id text,
  p_farm_id text,
  p_from_business_date date,
  p_to_business_date date,
  p_page_size smallint
) returns jsonb
language plpgsql
security definer
volatile
set search_path = pg_catalog
set statement_timeout = '10s'
set lock_timeout = '5s'
as $stable_changes_initialize$
declare
  canonical_scope text;
  scope_id text;
begin
  if p_installation_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
    or p_farm_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
    or p_to_business_date < p_from_business_date
    or p_to_business_date - p_from_business_date not between 0 and 30
    or p_page_size not between 1 and 100
  then
    raise exception using errcode = '22023',
      message = 'INGRESS_CONTRACT_INVALID';
  end if;
  canonical_scope := pg_catalog.format(
    '{"contract_version":"farming_app.work_records.stable_changes.v1",'
    || '"farm_id":"%s","from_business_date":"%s",'
    || '"installation_id":"%s","page_size":%s,'
    || '"to_business_date":"%s"}',
    p_farm_id, p_from_business_date::text, p_installation_id,
    p_page_size::text, p_to_business_date::text
  );
  scope_id := 'scs1_' || pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(canonical_scope, 'UTF8')), 'hex'
  );
  insert into ai.stable_changes_consumer_scopes (
    stable_changes_scope_id, contract_version, installation_id, farm_id,
    from_business_date, to_business_date, page_size
  ) values (
    scope_id, 'farming_app.work_records.stable_changes.v1',
    p_installation_id, p_farm_id, p_from_business_date, p_to_business_date,
    p_page_size
  );
  insert into ai.stable_changes_consumer_checkpoints(stable_changes_scope_id)
  values (scope_id);
  return pg_catalog.jsonb_build_object(
    'stable_changes_scope_id', scope_id,
    'checkpoint', ai.stable_changes_checkpoint_json(scope_id)
  );
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'CHECKPOINT_CONFLICT';
end
$stable_changes_initialize$;

create function ai.load_stable_changes_checkpoint(p_scope_id text)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog
set statement_timeout = '10s'
set lock_timeout = '5s'
as $stable_changes_load$
declare
  checkpoint jsonb;
begin
  select ai.stable_changes_checkpoint_json(p_scope_id) into checkpoint;
  if checkpoint is null then
    raise exception using errcode = 'P0002', message = 'CHECKPOINT_NOT_FOUND';
  end if;
  return checkpoint;
end
$stable_changes_load$;

create function ai.commit_stable_changes_page(
  p_scope_id text,
  p_expected_generation bigint,
  p_request_cursor text,
  p_page jsonb,
  p_observed_at timestamptz
) returns jsonb
language plpgsql
security definer
volatile
set search_path = pg_catalog
set statement_timeout = '10s'
set lock_timeout = '5s'
as $stable_changes_commit$
declare
  checkpoint ai.stable_changes_consumer_checkpoints%rowtype;
  scope ai.stable_changes_consumer_scopes%rowtype;
  change jsonb;
  existing ai.stable_changes_validated_ingress%rowtype;
  latest ai.stable_changes_validated_ingress%rowtype;
  change_count integer;
  page_index integer := 0;
  sequence_value bigint;
  version_value bigint;
  updated_value timestamptz(6);
  recorded_value timestamptz(6);
  deleted_value timestamptz(6);
  previous_updated timestamptz(6);
  previous_sequence bigint;
  first_updated timestamptz(6);
  first_sequence bigint;
  page_last_updated timestamptz(6);
  page_last_sequence bigint;
  committed_last_updated timestamptz(6);
  committed_last_sequence bigint;
  dto_hash text;
  request_digest text;
  next_digest text;
  fingerprint text;
  disposition_value text;
  duplicate_target bigint;
  accepted_count integer := 0;
  duplicate_count integer := 0;
  updated_count integer;
  next_cursor text;
  has_more_value boolean;
  committed_at_value timestamptz(6) := pg_catalog.clock_timestamp();
begin
  if p_expected_generation < 0 or p_page is null
    or pg_catalog.jsonb_typeof(p_page) <> 'object'
    or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_page)) <> 5
    or not p_page ?& array[
      'contract_version', 'result', 'next_cursor', 'has_more', 'changes'
    ]
    or pg_catalog.jsonb_typeof(p_page -> 'contract_version') <> 'string'
    or p_page ->> 'contract_version' <>
      'farming_app.work_records.stable_changes.v1'
    or pg_catalog.jsonb_typeof(p_page -> 'result') <> 'string'
    or p_page ->> 'result' <> 'ok'
    or pg_catalog.jsonb_typeof(p_page -> 'next_cursor')
      not in ('string', 'null')
    or pg_catalog.jsonb_typeof(p_page -> 'has_more') <> 'boolean'
    or pg_catalog.jsonb_typeof(p_page -> 'changes') <> 'array'
  then
    raise exception using errcode = '22023', message = 'INGRESS_CONTRACT_INVALID';
  end if;
  change_count := pg_catalog.jsonb_array_length(p_page -> 'changes');
  has_more_value := (p_page ->> 'has_more')::boolean;
  next_cursor := p_page ->> 'next_cursor';
  if change_count > 100
    or (has_more_value and (next_cursor is null or
      pg_catalog.length(next_cursor) not between 1 and 512))
    or (not has_more_value and next_cursor is not null)
    or (change_count = 0 and has_more_value)
  then
    raise exception using errcode = '22023', message = 'INGRESS_CONTRACT_INVALID';
  end if;
  select * into scope from ai.stable_changes_consumer_scopes
  where stable_changes_scope_id = p_scope_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'CHECKPOINT_NOT_FOUND';
  end if;
  if change_count > scope.page_size then
    raise exception using errcode = '22023', message = 'INGRESS_CONTRACT_INVALID';
  end if;
  select * into checkpoint from ai.stable_changes_consumer_checkpoints
  where stable_changes_scope_id = p_scope_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'CHECKPOINT_NOT_FOUND';
  end if;
  request_digest := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    'farmos.stable_changes.cursor.v1' || chr(10) ||
    coalesce(p_request_cursor, '<null>'), 'UTF8'
  )), 'hex');
  next_digest := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    'farmos.stable_changes.cursor.v1' || chr(10) ||
    coalesce(next_cursor, '<null>'), 'UTF8'
  )), 'hex');
  fingerprint := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    ai.stable_changes_canonical_jsonb(pg_catalog.jsonb_build_object(
      'scope_id', p_scope_id,
      'request_cursor', p_request_cursor,
      'page', p_page
    )), 'UTF8'
  )), 'hex');
  if checkpoint.generation >= p_expected_generation + 1 and exists (
    select 1 from ai.stable_changes_page_commit_receipts receipt
    where receipt.stable_changes_scope_id = p_scope_id
      and receipt.expected_generation = p_expected_generation
      and receipt.committed_generation = p_expected_generation + 1
      and receipt.page_fingerprint = fingerprint
  ) then
    return pg_catalog.jsonb_build_object(
      'result', 'already_committed',
      'checkpoint', ai.stable_changes_checkpoint_json(p_scope_id)
    );
  end if;
  if checkpoint.generation <> p_expected_generation
    or checkpoint.cursor is distinct from p_request_cursor
  then
    raise exception using errcode = '40001', message = 'CHECKPOINT_CONFLICT';
  end if;
  committed_last_updated := checkpoint.last_source_updated_at;
  committed_last_sequence := checkpoint.last_change_sequence;
  for change in select value from pg_catalog.jsonb_array_elements(
    p_page -> 'changes'
  ) loop
    if pg_catalog.jsonb_typeof(change) <> 'object'
      or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(change)) <> 13
      or not change ?& array[
        'change_sequence', 'operation', 'source_record_id',
        'source_record_version', 'source_content_hash', 'business_date',
        'recorded_at', 'source_updated_at', 'deleted_at', 'field_reference',
        'crop_cycle_reference', 'work_type_reference', 'safe_payload'
      ]
      or pg_catalog.jsonb_typeof(change -> 'change_sequence') <> 'string'
      or change ->> 'change_sequence' !~ '^[1-9][0-9]{0,18}$'
      or (change ->> 'change_sequence')::numeric > 9223372036854775807
      or pg_catalog.jsonb_typeof(change -> 'operation') <> 'string'
      or change ->> 'operation' not in ('upsert', 'tombstone')
      or pg_catalog.jsonb_typeof(change -> 'source_record_id') <> 'string'
      or change ->> 'source_record_id' !~
        '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      or pg_catalog.jsonb_typeof(change -> 'source_content_hash') <> 'string'
      or change ->> 'source_content_hash' !~ '^[0-9a-f]{64}$'
      or pg_catalog.jsonb_typeof(change -> 'business_date') <> 'string'
      or change ->> 'business_date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      or pg_catalog.jsonb_typeof(change -> 'source_updated_at') <> 'string'
      or change ->> 'source_updated_at' !~
        '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
      or pg_catalog.jsonb_typeof(change -> 'recorded_at')
        not in ('string', 'null')
      or not (
        change -> 'recorded_at' = 'null'::jsonb
        or change ->> 'recorded_at' ~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
      )
      or pg_catalog.jsonb_typeof(change -> 'deleted_at')
        not in ('string', 'null')
      or not (
        change -> 'deleted_at' = 'null'::jsonb
        or change ->> 'deleted_at' ~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$'
      )
      or pg_catalog.jsonb_typeof(change -> 'crop_cycle_reference') <> 'null'
      or change -> 'crop_cycle_reference' <> 'null'::jsonb
      or pg_catalog.jsonb_typeof(change -> 'safe_payload') <> 'object'
      or change -> 'safe_payload' <> '{}'::jsonb
      or not (
        change -> 'source_record_version' = 'null'::jsonb
        or (pg_catalog.jsonb_typeof(change -> 'source_record_version') = 'number'
          and change ->> 'source_record_version' ~ '^[0-9]+$'
          and (change ->> 'source_record_version')::numeric <= 9007199254740991)
      )
      or pg_catalog.jsonb_typeof(change -> 'field_reference')
        not in ('string', 'null')
      or not (
        change -> 'field_reference' = 'null'::jsonb
        or change ->> 'field_reference' ~
          '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      )
      or pg_catalog.jsonb_typeof(change -> 'work_type_reference')
        not in ('string', 'null')
      or not (
        change -> 'work_type_reference' = 'null'::jsonb
        or change ->> 'work_type_reference' ~
          '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'
      )
    then
      raise exception using errcode = '22023', message = 'INGRESS_CONTRACT_INVALID';
    end if;
    begin
      sequence_value := (change ->> 'change_sequence')::bigint;
      updated_value := (change ->> 'source_updated_at')::timestamptz(6);
      version_value := case when change -> 'source_record_version' = 'null'::jsonb
        then null else (change ->> 'source_record_version')::bigint end;
      recorded_value := case when change -> 'recorded_at' = 'null'::jsonb
        then null else (change ->> 'recorded_at')::timestamptz(6) end;
      deleted_value := case when change -> 'deleted_at' = 'null'::jsonb
        then null else (change ->> 'deleted_at')::timestamptz(6) end;
    exception when others then
      raise exception using errcode = '22023', message = 'INGRESS_CONTRACT_INVALID';
    end;
    if (change ->> 'business_date')::date < scope.from_business_date
      or (change ->> 'business_date')::date > scope.to_business_date
      or (change ->> 'operation' = 'upsert'
        and (recorded_value is null or deleted_value is not null))
      or (change ->> 'operation' = 'tombstone' and deleted_value is null)
    then
      raise exception using errcode = '22023', message = 'INGRESS_CONTRACT_INVALID';
    end if;
    if previous_updated is not null and (
      updated_value < previous_updated or
      (updated_value = previous_updated and sequence_value <= previous_sequence)
    ) then
      raise exception using errcode = '22023', message = 'ORDERING_REGRESSION';
    end if;
    if page_index = 0 then
      first_updated := updated_value;
      first_sequence := sequence_value;
    end if;
    previous_updated := updated_value;
    previous_sequence := sequence_value;
    page_last_updated := updated_value;
    page_last_sequence := sequence_value;
    dto_hash := pg_catalog.encode(pg_catalog.sha256(
      pg_catalog.convert_to(ai.stable_changes_canonical_jsonb(change), 'UTF8')
    ), 'hex');
    select * into existing from ai.stable_changes_validated_ingress ingress
    where ingress.stable_changes_scope_id = p_scope_id
      and ingress.change_sequence = sequence_value;
    if found then
      if existing.dto_identity_hash <> dto_hash then
        raise exception using errcode = '23505', message = 'DEDUPE_CONFLICT';
      end if;
      duplicate_count := duplicate_count + 1;
      page_index := page_index + 1;
      continue;
    end if;
    if committed_last_updated is not null and (
      updated_value < committed_last_updated or
      (updated_value = committed_last_updated
        and sequence_value <= committed_last_sequence)
    ) then
      raise exception using errcode = '22023', message = 'ORDERING_REGRESSION';
    end if;
    if version_value is not null and exists (
      select 1 from ai.stable_changes_validated_ingress ingress
      where ingress.stable_changes_scope_id = p_scope_id
        and ingress.source_record_id = change ->> 'source_record_id'
        and ingress.source_record_version = version_value
        and ingress.disposition = 'accepted'
        and ingress.source_content_hash <> change ->> 'source_content_hash'
    ) then
      raise exception using errcode = '23505', message = 'DEDUPE_CONFLICT';
    end if;
    select * into latest from ai.stable_changes_validated_ingress ingress
    where ingress.stable_changes_scope_id = p_scope_id
      and ingress.source_record_id = change ->> 'source_record_id'
      and ingress.disposition = 'accepted'
    order by ingress.source_updated_at desc, ingress.change_sequence desc limit 1;
    disposition_value := 'accepted';
    duplicate_target := null;
    if found
      and latest.operation = change ->> 'operation'
      and latest.source_record_version is not distinct from version_value
      and latest.source_content_hash = change ->> 'source_content_hash'
      and latest.business_date = (change ->> 'business_date')::date
      and latest.recorded_at is not distinct from recorded_value
      and latest.deleted_at is not distinct from deleted_value
      and latest.field_reference is not distinct from change ->> 'field_reference'
      and latest.work_type_reference is not distinct from
        change ->> 'work_type_reference'
    then
      disposition_value := 'semantic_duplicate';
      duplicate_target := latest.change_sequence;
      duplicate_count := duplicate_count + 1;
    else
      accepted_count := accepted_count + 1;
    end if;
    insert into ai.stable_changes_validated_ingress (
      stable_changes_scope_id, change_sequence, committed_generation,
      page_position, operation, source_record_id, source_record_version,
      source_content_hash, business_date, recorded_at, source_updated_at,
      deleted_at, field_reference, crop_cycle_reference, work_type_reference,
      disposition, duplicate_target_sequence, dto_identity_hash, consumed_at
    ) values (
      p_scope_id, sequence_value, p_expected_generation + 1, page_index,
      change ->> 'operation', change ->> 'source_record_id', version_value,
      change ->> 'source_content_hash', (change ->> 'business_date')::date,
      recorded_value, updated_value, deleted_value,
      change ->> 'field_reference', null, change ->> 'work_type_reference',
      disposition_value, duplicate_target, dto_hash, p_observed_at
    );
    committed_last_updated := updated_value;
    committed_last_sequence := sequence_value;
    page_index := page_index + 1;
  end loop;
  insert into ai.stable_changes_page_commit_receipts (
    stable_changes_scope_id, committed_generation, expected_generation,
    request_cursor_digest, next_cursor_digest, page_fingerprint,
    first_source_updated_at, first_change_sequence, last_source_updated_at,
    last_change_sequence, returned_count, accepted_count, duplicate_count,
    has_more, committed_at
  ) values (
    p_scope_id, p_expected_generation + 1, p_expected_generation,
    request_digest, next_digest, fingerprint, first_updated, first_sequence,
    page_last_updated, page_last_sequence, change_count, accepted_count,
    duplicate_count, has_more_value, committed_at_value
  );
  update ai.stable_changes_consumer_checkpoints checkpoint_row set
    cursor = next_cursor,
    generation = p_expected_generation + 1,
    last_source_updated_at = committed_last_updated,
    last_change_sequence = committed_last_sequence,
    last_successful_page_at = p_observed_at,
    last_returned_count = change_count,
    last_accepted_count = accepted_count,
    last_duplicate_count = duplicate_count,
    last_has_more = has_more_value,
    last_page_fingerprint = fingerprint,
    updated_at = committed_at_value
  where checkpoint_row.stable_changes_scope_id = p_scope_id
    and checkpoint_row.generation = p_expected_generation;
  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception using errcode = '40001', message = 'CHECKPOINT_CONFLICT';
  end if;
  return pg_catalog.jsonb_build_object(
    'result', 'committed',
    'checkpoint', ai.stable_changes_checkpoint_json(p_scope_id)
  );
end
$stable_changes_commit$;

revoke create on schema ai from public;
revoke create on schema ai from farmos_core_stable_changes_runtime;
grant usage on schema ai to farmos_core_stable_changes_runtime;

revoke all privileges on table ai.stable_changes_consumer_scopes from public;
revoke all privileges on table ai.stable_changes_consumer_checkpoints from public;
revoke all privileges on table ai.stable_changes_page_commit_receipts from public;
revoke all privileges on table ai.stable_changes_validated_ingress from public;
revoke all privileges on table ai.stable_changes_consumer_scopes
  from farmos_core_stable_changes_runtime;
revoke all privileges on table ai.stable_changes_consumer_checkpoints
  from farmos_core_stable_changes_runtime;
revoke all privileges on table ai.stable_changes_page_commit_receipts
  from farmos_core_stable_changes_runtime;
revoke all privileges on table ai.stable_changes_validated_ingress
  from farmos_core_stable_changes_runtime;

revoke all on function ai.reject_stable_changes_immutable_mutation() from public;
revoke all on function ai.stable_changes_checkpoint_json(text) from public;
revoke all on function ai.stable_changes_canonical_jsonb(jsonb) from public;
revoke all on function ai.initialize_stable_changes_consumer_scope(
  text,text,date,date,smallint
) from public;
revoke all on function ai.load_stable_changes_checkpoint(text) from public;
revoke all on function ai.commit_stable_changes_page(
  text,bigint,text,jsonb,timestamptz
) from public;

grant execute on function ai.load_stable_changes_checkpoint(text)
  to farmos_core_stable_changes_runtime;
grant execute on function ai.commit_stable_changes_page(
  text,bigint,text,jsonb,timestamptz
) to farmos_core_stable_changes_runtime;

do $stable_changes_exact_acl$
declare
  runtime_role oid := pg_catalog.to_regrole(
    'farmos_core_stable_changes_runtime'
  );
begin
  if exists (
      select 1 from pg_catalog.pg_class class_row
      cross join lateral pg_catalog.aclexplode(class_row.relacl) acl
      where class_row.oid in (
        pg_catalog.to_regclass('ai.stable_changes_consumer_scopes'),
        pg_catalog.to_regclass('ai.stable_changes_consumer_checkpoints'),
        pg_catalog.to_regclass('ai.stable_changes_page_commit_receipts'),
        pg_catalog.to_regclass('ai.stable_changes_validated_ingress')
      ) and acl.grantee <> class_row.relowner
    )
    or exists (
      select 1 from pg_catalog.pg_proc procedure_row
      cross join lateral pg_catalog.aclexplode(procedure_row.proacl) acl
      where procedure_row.oid in (
        pg_catalog.to_regprocedure(
          'ai.reject_stable_changes_immutable_mutation()'
        ),
        pg_catalog.to_regprocedure('ai.stable_changes_checkpoint_json(text)'),
        pg_catalog.to_regprocedure('ai.stable_changes_canonical_jsonb(jsonb)'),
        pg_catalog.to_regprocedure(
          'ai.initialize_stable_changes_consumer_scope(text,text,date,date,smallint)'
        ),
        pg_catalog.to_regprocedure('ai.load_stable_changes_checkpoint(text)'),
        pg_catalog.to_regprocedure(
          'ai.commit_stable_changes_page(text,bigint,text,jsonb,timestamptz)'
        )
      ) and acl.grantee <> procedure_row.proowner
        and not (
          acl.grantee = runtime_role
          and acl.privilege_type = 'EXECUTE'
          and not acl.is_grantable
          and procedure_row.oid in (
            pg_catalog.to_regprocedure(
              'ai.load_stable_changes_checkpoint(text)'
            ),
            pg_catalog.to_regprocedure(
              'ai.commit_stable_changes_page(text,bigint,text,jsonb,timestamptz)'
            )
          )
        )
    )
  then
    raise exception using errcode = '42501',
      message = 'stable_changes_exact_acl_invalid';
  end if;
end
$stable_changes_exact_acl$;

commit;
