begin;

alter table knowledge.extracted_facts
  add column if not exists review_metadata jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_by_role text,
  add column if not exists review_note text;

create index if not exists idx_extracted_facts_review_metadata_gin
  on knowledge.extracted_facts
  using gin (review_metadata);

comment on column knowledge.extracted_facts.review_metadata is
  'Human review metadata for extracted fact verification or rejection.';

comment on column knowledge.extracted_facts.reviewed_by_role is
  'Role of the human or app-side reviewer. AI agents must not write this field.';

comment on column knowledge.extracted_facts.review_note is
  'Optional human review note. Does not overwrite original fact value.';

commit;
