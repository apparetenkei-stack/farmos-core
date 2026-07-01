begin;

create table if not exists knowledge.document_processing_jobs (
  id bigserial primary key,

  source_document_id bigint not null
    references knowledge.source_documents(id)
    on update cascade
    on delete restrict,

  job_type text not null,
  status text not null default 'pending',

  priority integer not null default 100,

  attempt_count integer not null default 0,
  max_attempts integer not null default 3,

  requested_by text not null default current_user,
  locked_by text null,

  error_message text null,
  result_summary text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,

  constraint document_processing_jobs_job_type_check
    check (job_type in (
      'ocr',
      'whisper',
      'csv_parse',
      'image_metadata',
      'text_extract',
      'pdf_text_extract'
    )),

  constraint document_processing_jobs_status_check
    check (status in (
      'pending',
      'running',
      'completed',
      'failed',
      'skipped',
      'cancelled'
    )),

  constraint document_processing_jobs_priority_check
    check (priority >= 0),

  constraint document_processing_jobs_attempt_count_check
    check (attempt_count >= 0),

  constraint document_processing_jobs_max_attempts_check
    check (max_attempts >= 1),

  constraint document_processing_jobs_attempt_count_max_check
    check (attempt_count <= max_attempts),

  constraint document_processing_jobs_started_at_check
    check (
      (status <> 'running')
      or started_at is not null
    ),

  constraint document_processing_jobs_finished_at_check
    check (
      (status not in ('completed', 'failed', 'skipped', 'cancelled'))
      or finished_at is not null
    )
);

comment on table knowledge.document_processing_jobs is
  'Processing queue for OCR, Whisper, CSV parsing, text extraction, and image metadata extraction.';

comment on column knowledge.document_processing_jobs.source_document_id is
  'References the raw source document to be processed.';

comment on column knowledge.document_processing_jobs.priority is
  'Lower number means higher priority.';

comment on column knowledge.document_processing_jobs.locked_by is
  'Worker identifier that claimed the job. Used for future safe processing.';

create index if not exists idx_document_processing_jobs_status_priority
  on knowledge.document_processing_jobs (status, priority, created_at);

create index if not exists idx_document_processing_jobs_source_document_id
  on knowledge.document_processing_jobs (source_document_id);

create index if not exists idx_document_processing_jobs_job_type
  on knowledge.document_processing_jobs (job_type);

create unique index if not exists uq_document_processing_jobs_active_per_document_type
  on knowledge.document_processing_jobs (source_document_id, job_type)
  where status in ('pending', 'running');

create or replace function knowledge.set_document_processing_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_document_processing_jobs_updated_at
  on knowledge.document_processing_jobs;

create trigger trg_document_processing_jobs_updated_at
before update on knowledge.document_processing_jobs
for each row
execute function knowledge.set_document_processing_jobs_updated_at();

alter table knowledge.document_processing_jobs owner to farmos_owner_local;
alter function knowledge.set_document_processing_jobs_updated_at() owner to farmos_owner_local;

revoke all on table knowledge.document_processing_jobs from public;
revoke all on sequence knowledge.document_processing_jobs_id_seq from public;

grant select, insert, update on table knowledge.document_processing_jobs to farmos_app_local;
grant usage, select on sequence knowledge.document_processing_jobs_id_seq to farmos_app_local;

grant select on table knowledge.document_processing_jobs to farmos_ai_readonly_local;

revoke insert, update, delete on table knowledge.document_processing_jobs from farmos_ai_readonly_local;
revoke insert, update, delete on table knowledge.document_processing_jobs from farmos_ai_proposal_local;
revoke usage, select on sequence knowledge.document_processing_jobs_id_seq from farmos_ai_proposal_local;

commit;
