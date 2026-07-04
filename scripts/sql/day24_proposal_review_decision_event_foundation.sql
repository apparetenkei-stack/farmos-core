begin;

create table if not exists audit.proposal_review_decision_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null
    references ai.proposal_inbox(id)
    on update cascade
    on delete restrict,
  decision_type text not null,
  decision_note text,
  decided_by text not null,
  decided_by_role text not null,
  decision_source text not null default 'local_cli',
  event_metadata jsonb not null default '{}'::jsonb,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint proposal_review_decision_events_decision_type_check
    check (decision_type in (
      'approve_review',
      'reject_review',
      'request_revision',
      'defer_review'
    ))
);

create index if not exists idx_proposal_review_decision_events_proposal_id
  on audit.proposal_review_decision_events(proposal_id);

create index if not exists idx_proposal_review_decision_events_decision_type
  on audit.proposal_review_decision_events(decision_type);

create index if not exists idx_proposal_review_decision_events_decided_at
  on audit.proposal_review_decision_events(decided_at desc);

create or replace view audit.proposal_review_decision_latest as
select distinct on (proposal_id)
  id,
  proposal_id,
  decision_type,
  decision_note,
  decided_by,
  decided_by_role,
  decision_source,
  event_metadata,
  decided_at,
  created_at
from audit.proposal_review_decision_events
order by proposal_id, decided_at desc, created_at desc, id desc;

grant usage on schema audit to farmos_app_local;
grant select, insert on audit.proposal_review_decision_events to farmos_app_local;
grant select on audit.proposal_review_decision_latest to farmos_app_local;

grant usage on schema ai to farmos_app_local;
revoke insert, update, delete, truncate on ai.proposal_inbox from farmos_app_local;
revoke insert, update, delete, truncate on all tables in schema ai from farmos_app_local;
revoke usage, update on all sequences in schema ai from farmos_app_local;
grant select on ai.proposal_inbox to farmos_app_local;

-- Keep app schema read-only for farmos_app_local.
revoke insert, update, delete, truncate on all tables in schema app from farmos_app_local;
revoke usage, update on all sequences in schema app from farmos_app_local;
grant usage on schema app to farmos_app_local;
grant select on all tables in schema app to farmos_app_local;

commit;
