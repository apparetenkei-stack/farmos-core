begin;

create table if not exists audit.proposal_review_apply_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null
    references ai.proposal_inbox(id)
    on update cascade
    on delete restrict,
  apply_operation text not null,
  result text not null,
  dry_run boolean not null default false,
  committed boolean not null default false,
  app_projection_apply_performed boolean not null default false,
  ai_proposal_apply_marker_updated boolean not null default false,
  inserted_crop_cycle_id bigint null
    references app.crop_cycles(id)
    on update cascade
    on delete restrict,
  applied_by text not null,
  applied_by_role text not null,
  apply_source text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint chk_proposal_review_apply_events_apply_operation
    check (apply_operation in ('insert_candidate', 'no_op_candidate')),
  constraint chk_proposal_review_apply_events_result
    check (result in ('applied')),
  constraint chk_proposal_review_apply_events_no_dry_run_events
    check (dry_run = false),
  constraint chk_proposal_review_apply_events_committed_only
    check (committed = true),
  constraint chk_proposal_review_apply_events_insert_requires_crop_cycle
    check (
      (apply_operation = 'insert_candidate' and inserted_crop_cycle_id is not null and app_projection_apply_performed = true)
      or
      (apply_operation = 'no_op_candidate' and inserted_crop_cycle_id is null and app_projection_apply_performed = false)
    ),
  constraint chk_proposal_review_apply_events_marker_updated
    check (ai_proposal_apply_marker_updated = true)
);

create unique index if not exists uq_proposal_review_apply_events_committed_proposal
  on audit.proposal_review_apply_events(proposal_id)
  where committed = true;

create index if not exists idx_proposal_review_apply_events_created_at
  on audit.proposal_review_apply_events(created_at desc);

create index if not exists idx_proposal_review_apply_events_inserted_crop_cycle_id
  on audit.proposal_review_apply_events(inserted_crop_cycle_id);

comment on table audit.proposal_review_apply_events is
  'Append-only audit history for committed proposal review apply operations. Dry-run events are intentionally not stored.';

comment on column audit.proposal_review_apply_events.proposal_id is
  'Proposal applied by the CLI-only proposal review apply command boundary. One committed apply event per proposal is enforced.';

comment on column audit.proposal_review_apply_events.inserted_crop_cycle_id is
  'app.crop_cycles id inserted by insert_candidate apply. Null for no_op_candidate.';

revoke all on audit.proposal_review_apply_events from public;
revoke all on audit.proposal_review_apply_events from farmos_app_local;

grant usage on schema audit to farmos_app_local;
grant select on audit.proposal_review_apply_events to farmos_app_local;

grant select, insert on audit.proposal_review_apply_events to farmos_local_admin;

commit;
