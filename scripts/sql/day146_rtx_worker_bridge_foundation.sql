begin;

create schema if not exists ai;

create table if not exists ai.rtx_worker_bridge_nonces (
  worker_id text not null,
  nonce text not null,
  request_id text not null,
  received_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (worker_id, nonce)
);

create table if not exists ai.rtx_worker_bridge_lease_events (
  event_id text primary key,
  job_id text not null references ai.rtx_structuring_jobs,
  worker_id text not null,
  receipt_hash text not null check (receipt_hash ~ '^[0-9a-f]{64}$'),
  lease_expires_at timestamptz not null,
  extension_count integer not null check (extension_count between 0 and 2),
  event_type text not null check (event_type in (
    'claimed', 'extended', 'candidate_accepted', 'candidate_rejected',
    'failure_recorded'
  )),
  result_kind text check (result_kind in ('candidate', 'failure')),
  result_hash text check (result_hash is null or result_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null,
  event_sequence bigint generated always as identity unique,
  check (
    (event_type in ('claimed', 'extended')
      and result_kind is null and result_hash is null)
    or
    (event_type in (
      'candidate_accepted', 'candidate_rejected', 'failure_recorded'
    ) and result_kind is not null and result_hash is not null)
  )
);

create table if not exists ai.rtx_worker_bridge_audit_events (
  audit_id text primary key,
  worker_id text not null,
  operation text not null check (operation in (
    'claim', 'submit_candidate', 'submit_failure', 'heartbeat'
  )),
  request_id text not null,
  accepted boolean not null,
  failure_code text,
  received_at timestamptz not null,
  body_size integer not null check (body_size between 0 and 32768),
  raw_signature_stored boolean not null check (raw_signature_stored = false),
  request_body_stored boolean not null check (request_body_stored = false)
);

create or replace function ai.reject_rtx_worker_bridge_immutable_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rtx_worker_bridge_append_only';
end;
$$;

create or replace function ai.guard_rtx_worker_bridge_nonce_mutation()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'DELETE' and old.expires_at <= statement_timestamp() then
    return old;
  end if;
  raise exception 'rtx_worker_bridge_append_only';
end;
$$;

do $day146_d2_bridge$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'rtx_worker_bridge_lease_events',
    'rtx_worker_bridge_audit_events'
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
        || 'ai.reject_rtx_worker_bridge_immutable_mutation()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end;
$day146_d2_bridge$;

drop trigger if exists rtx_worker_bridge_nonces_append_only
  on ai.rtx_worker_bridge_nonces;
create trigger rtx_worker_bridge_nonces_append_only
before update or delete on ai.rtx_worker_bridge_nonces
for each row execute function ai.guard_rtx_worker_bridge_nonce_mutation();

commit;
