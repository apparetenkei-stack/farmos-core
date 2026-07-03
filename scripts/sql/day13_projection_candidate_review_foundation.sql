begin;

alter table knowledge.projection_candidates
  add column if not exists review_metadata jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by_role text,
  add column if not exists approved_for_app_projection boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approval_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projection_candidates_approval_consistency_check'
      and conrelid = 'knowledge.projection_candidates'::regclass
  ) then
    alter table knowledge.projection_candidates
      add constraint projection_candidates_approval_consistency_check
      check (
        approved_for_app_projection = false
        or (
          approved_for_app_projection = true
          and reviewed = true
          and rejected = false
          and approved_at is not null
          and approved_by is not null
        )
      );
  end if;
end $$;

create index if not exists idx_projection_candidates_review_metadata_gin
  on knowledge.projection_candidates
  using gin (review_metadata);

create index if not exists idx_projection_candidates_approved_for_app_projection
  on knowledge.projection_candidates(approved_for_app_projection);

grant select, insert, update on knowledge.projection_candidates to farmos_app_local;
grant select on knowledge.projection_candidates to farmos_ai_readonly_local;
grant select on knowledge.projection_candidates to farmos_ai_proposal_local;

revoke insert, update, delete on knowledge.projection_candidates from farmos_ai_readonly_local;
revoke insert, update, delete on knowledge.projection_candidates from farmos_ai_proposal_local;

commit;
