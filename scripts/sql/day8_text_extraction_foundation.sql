begin;

create table if not exists knowledge.document_extractions (
  id bigint generated always as identity primary key,

  source_document_id bigint not null
    references knowledge.source_documents(id)
    on update restrict
    on delete restrict,

  job_id bigint null
    references knowledge.document_processing_jobs(id)
    on update restrict
    on delete restrict,

  extraction_type text not null,
  extractor_name text not null,
  extractor_version text null,

  extracted_text text not null,
  extracted_metadata jsonb not null default '{}'::jsonb,

  confidence numeric(5,4) null,

  status text not null default 'draft',
  is_current boolean not null default false,

  created_by text not null default current_user,
  created_at timestamptz not null default now(),

  constraint document_extractions_extracted_text_not_empty
    check (length(btrim(extracted_text)) > 0),

  constraint document_extractions_confidence_range
    check (confidence is null or (confidence >= 0 and confidence <= 1)),

  constraint document_extractions_extraction_type_check
    check (
      extraction_type in (
        'text_plain_dry_run',
        'text_extract',
        'ocr',
        'pdf_text_extract',
        'whisper',
        'manual_transcription',
        'corrected_text'
      )
    ),

  constraint document_extractions_status_check
    check (
      status in (
        'draft',
        'completed',
        'failed',
        'superseded',
        'rejected'
      )
    )
);

comment on table knowledge.document_extractions is
  'Versioned extracted text results derived from source_documents. Does not overwrite raw source document metadata.';

comment on column knowledge.document_extractions.source_document_id is
  'Raw source document this extraction was derived from.';

comment on column knowledge.document_extractions.job_id is
  'Optional processing job that produced this extraction. One extraction per job in Day8 foundation.';

comment on column knowledge.document_extractions.extraction_type is
  'Type of extraction, such as dry-run text, OCR, PDF text extraction, Whisper, or manual correction.';

comment on column knowledge.document_extractions.extracted_text is
  'Extracted text result. Must not be empty.';

comment on column knowledge.document_extractions.extracted_metadata is
  'Extractor metadata, result summary, counters, preview information, or future engine-specific details.';

comment on column knowledge.document_extractions.is_current is
  'Marks whether this extraction is currently preferred for this document and extraction type. Day8 does not enforce uniqueness here.';

create index if not exists document_extractions_source_document_id_idx
  on knowledge.document_extractions(source_document_id);

create index if not exists document_extractions_job_id_idx
  on knowledge.document_extractions(job_id);

create index if not exists document_extractions_type_status_idx
  on knowledge.document_extractions(extraction_type, status);

create index if not exists document_extractions_created_at_idx
  on knowledge.document_extractions(created_at desc);

create unique index if not exists document_extractions_unique_job_id_idx
  on knowledge.document_extractions(job_id)
  where job_id is not null;

revoke all on table knowledge.document_extractions from public;

grant usage on schema knowledge to farmos_app_local;
grant select, insert, update on table knowledge.document_extractions to farmos_app_local;
grant usage, select on sequence knowledge.document_extractions_id_seq to farmos_app_local;

grant usage on schema knowledge to farmos_ai_readonly_local;
grant select on table knowledge.document_extractions to farmos_ai_readonly_local;

revoke all on table knowledge.document_extractions from farmos_ai_proposal_local;
revoke all on sequence knowledge.document_extractions_id_seq from farmos_ai_proposal_local;

commit;
