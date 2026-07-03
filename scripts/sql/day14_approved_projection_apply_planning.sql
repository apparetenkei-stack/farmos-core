begin;

create table if not exists knowledge.app_projection_apply_plans (
  id bigserial primary key,
  projection_candidate_id bigint not null
    references knowledge.projection_candidates(id)
    on update cascade
    on delete restrict,
  source_document_id bigint not null
    references knowledge.source_documents(id)
    on update cascade
    on delete restrict,
  document_extraction_id bigint
    references knowledge.document_extractions(id)
    on update cascade
    on delete restrict,
  target_schema text not null default 'app',
  target_table text not null,
  apply_plan_type text not null,
  apply_plan_key text not null,
  plan_payload jsonb not null,
  required_fields text[] not null default '{}'::text[],
  missing_fields text[] not null default '{}'::text[],
  readiness_status text not null default 'blocked',
  status text not null default 'draft',
  generated_by text not null,
  generated_at timestamptz not null default now(),
  reviewed boolean not null default false,
  reviewed_by text,
  reviewed_by_role text,
  reviewed_at timestamptz,
  review_note text,
  rejected boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint app_projection_apply_plans_apply_plan_type_check
    check (
      apply_plan_type in (
        'crop_cycle_apply_plan',
        'work_record_apply_plan',
        'field_apply_plan',
        'shipment_apply_plan',
        'other'
      )
    ),

  constraint app_projection_apply_plans_readiness_status_check
    check (
      readiness_status in (
        'ready',
        'blocked',
        'needs_more_review'
      )
    ),

  constraint app_projection_apply_plans_status_check
    check (
      status in (
        'draft',
        'ready_for_review',
        'reviewed',
        'rejected',
        'superseded'
      )
    ),

  constraint app_projection_apply_plans_review_reject_check
    check (not (reviewed and rejected)),

  constraint app_projection_apply_plans_reviewed_at_check
    check (
      reviewed = false
      or reviewed_at is not null
    ),

  constraint app_projection_apply_plans_rejection_reason_check
    check (
      rejected = false
      or rejection_reason is not null
    ),

  constraint uq_app_projection_apply_plans_worker_v1
    unique (projection_candidate_id, apply_plan_type, apply_plan_key)
);

create index if not exists idx_app_projection_apply_plans_projection_candidate_id
  on knowledge.app_projection_apply_plans(projection_candidate_id);

create index if not exists idx_app_projection_apply_plans_source_document_id
  on knowledge.app_projection_apply_plans(source_document_id);

create index if not exists idx_app_projection_apply_plans_target_table
  on knowledge.app_projection_apply_plans(target_table);

create index if not exists idx_app_projection_apply_plans_readiness_status
  on knowledge.app_projection_apply_plans(readiness_status);

create index if not exists idx_app_projection_apply_plans_status
  on knowledge.app_projection_apply_plans(status);

create index if not exists idx_app_projection_apply_plans_plan_payload_gin
  on knowledge.app_projection_apply_plans using gin(plan_payload);

create index if not exists idx_app_projection_apply_plans_missing_fields_gin
  on knowledge.app_projection_apply_plans using gin(missing_fields);

drop trigger if exists trg_app_projection_apply_plans_updated_at
  on knowledge.app_projection_apply_plans;

create trigger trg_app_projection_apply_plans_updated_at
before update on knowledge.app_projection_apply_plans
for each row
execute function audit.set_updated_at();

grant usage on schema knowledge to farmos_app_local;
grant select, insert, update on knowledge.app_projection_apply_plans to farmos_app_local;
grant usage, select on sequence knowledge.app_projection_apply_plans_id_seq to farmos_app_local;
revoke delete on knowledge.app_projection_apply_plans from farmos_app_local;

grant usage on schema knowledge to farmos_ai_readonly_local;
grant select on knowledge.app_projection_apply_plans to farmos_ai_readonly_local;
revoke insert, update, delete on knowledge.app_projection_apply_plans from farmos_ai_readonly_local;

grant usage on schema knowledge to farmos_ai_proposal_local;
grant select on knowledge.app_projection_apply_plans to farmos_ai_proposal_local;
revoke insert, update, delete on knowledge.app_projection_apply_plans from farmos_ai_proposal_local;

commit;
