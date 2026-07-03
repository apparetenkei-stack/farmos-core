begin;

alter table knowledge.app_projection_apply_plans
  add column if not exists approved_for_app_apply boolean not null default false,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approval_note text,
  add column if not exists review_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_app_projection_apply_plans_app_apply_approval'
  ) then
    alter table knowledge.app_projection_apply_plans
      add constraint chk_app_projection_apply_plans_app_apply_approval
      check (
        approved_for_app_apply = false
        or (
          reviewed = true
          and coalesce(rejected, false) = false
          and approved_at is not null
          and nullif(trim(approved_by), '') is not null
          and readiness_status = 'ready'
        )
      );
  end if;
end
$$;

create index if not exists idx_app_projection_apply_plans_approved_for_app_apply
  on knowledge.app_projection_apply_plans(approved_for_app_apply);

create index if not exists idx_app_projection_apply_plans_review_metadata_gin
  on knowledge.app_projection_apply_plans
  using gin (review_metadata);

grant select, insert, update on knowledge.app_projection_apply_plans to farmos_app_local;

grant select on knowledge.app_projection_apply_plans to farmos_ai_readonly_local;
grant select on knowledge.app_projection_apply_plans to farmos_ai_proposal_local;

revoke insert, update, delete on knowledge.app_projection_apply_plans from farmos_ai_readonly_local;
revoke insert, update, delete on knowledge.app_projection_apply_plans from farmos_ai_proposal_local;

commit;
