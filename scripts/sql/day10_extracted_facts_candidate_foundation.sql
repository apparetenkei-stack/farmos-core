begin;

alter table knowledge.extracted_facts
  add column if not exists document_extraction_id bigint
    references knowledge.document_extractions(id)
    on update cascade
    on delete restrict,
  add column if not exists candidate_metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_extracted_facts_document_extraction_id
  on knowledge.extracted_facts(document_extraction_id);

create index if not exists idx_extracted_facts_candidate_metadata_gin
  on knowledge.extracted_facts using gin(candidate_metadata);

create unique index if not exists uq_extracted_facts_candidate_worker_v1
  on knowledge.extracted_facts(document_extraction_id, fact_key, fact_value_text)
  where document_extraction_id is not null
    and extracted_by_model = 'extracted_facts_candidate_worker_v1'
    and fact_value_text is not null;

grant usage on schema knowledge to farmos_app_local;
grant select, insert, update on knowledge.extracted_facts to farmos_app_local;

grant usage on schema knowledge to farmos_ai_readonly_local;
grant select on knowledge.extracted_facts to farmos_ai_readonly_local;
revoke insert, update, delete on knowledge.extracted_facts from farmos_ai_readonly_local;

grant usage on schema knowledge to farmos_ai_proposal_local;
grant select on knowledge.extracted_facts to farmos_ai_proposal_local;
revoke insert, update, delete on knowledge.extracted_facts from farmos_ai_proposal_local;

commit;
