begin;

create table if not exists knowledge.projection_candidates (
  id bigserial primary key,

  source_document_id bigint not null
    references knowledge.source_documents(id)
    on update cascade
    on delete restrict,

  document_extraction_id bigint
    references knowledge.document_extractions(id)
    on update cascade
    on delete restrict,

  candidate_type text not null,
  target_schema text not null default 'app',
  target_table text not null,

  candidate_key text not null,
  candidate_payload jsonb not null,
  supporting_extracted_fact_ids bigint[] not null default '{}',

  confidence numeric(5,4) not null default 0,
  status text not null default 'draft',

  generated_by text not null,
  generated_at timestamptz not null default now(),

  reviewed boolean not null default false,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,

  rejected boolean not null default false,
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint projection_candidates_candidate_type_check
    check (candidate_type in (
      'crop_cycle_candidate',
      'work_record_candidate',
      'field_candidate',
      'shipment_candidate',
      'knowledge_summary_candidate',
      'other'
    )),

  constraint projection_candidates_status_check
    check (status in (
      'draft',
      'ready_for_review',
      'reviewed',
      'rejected',
      'superseded'
    )),

  constraint projection_candidates_confidence_check
    check (confidence >= 0 and confidence <= 1),

  constraint projection_candidates_not_reviewed_and_rejected_check
    check (not (reviewed = true and rejected = true)),

  constraint projection_candidates_reviewed_consistency_check
    check (
      reviewed = false
      or (reviewed = true and reviewed_at is not null)
    ),

  constraint projection_candidates_rejected_consistency_check
    check (
      rejected = false
      or (rejected = true and rejection_reason is not null)
    )
);

create index if not exists idx_projection_candidates_source_document_id
  on knowledge.projection_candidates(source_document_id);

create index if not exists idx_projection_candidates_document_extraction_id
  on knowledge.projection_candidates(document_extraction_id);

create index if not exists idx_projection_candidates_candidate_type
  on knowledge.projection_candidates(candidate_type);

create index if not exists idx_projection_candidates_status
  on knowledge.projection_candidates(status);

create index if not exists idx_projection_candidates_payload_gin
  on knowledge.projection_candidates
  using gin (candidate_payload);

create unique index if not exists uq_projection_candidates_worker_v1
  on knowledge.projection_candidates(
    source_document_id,
    document_extraction_id,
    candidate_type,
    candidate_key
  )
  where generated_by = 'verified_facts_projection_candidate_worker_v1';

do $$
begin
  if to_regprocedure('audit.set_updated_at()') is not null then
    execute 'drop trigger if exists trg_projection_candidates_updated_at on knowledge.projection_candidates';
    execute '
      create trigger trg_projection_candidates_updated_at
      before update on knowledge.projection_candidates
      for each row
      execute function audit.set_updated_at()
    ';
  else
    raise notice 'audit.set_updated_at() not found. updated_at trigger skipped.';
  end if;
end $$;

grant usage on schema knowledge to farmos_app_local;
grant select, insert, update on knowledge.projection_candidates to farmos_app_local;
grant usage, select on sequence knowledge.projection_candidates_id_seq to farmos_app_local;

grant usage on schema knowledge to farmos_ai_readonly_local;
grant select on knowledge.projection_candidates to farmos_ai_readonly_local;
revoke insert, update, delete on knowledge.projection_candidates from farmos_ai_readonly_local;

grant usage on schema knowledge to farmos_ai_proposal_local;
grant select on knowledge.projection_candidates to farmos_ai_proposal_local;
revoke insert, update, delete on knowledge.projection_candidates from farmos_ai_proposal_local;

commit;
