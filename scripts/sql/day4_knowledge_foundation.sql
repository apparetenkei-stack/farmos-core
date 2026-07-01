BEGIN;

-- ============================================================
-- Day 4 - Knowledge Foundation
-- ============================================================
-- Principles:
-- - Raw First
-- - No Destructive Import
-- - Human in the Loop
-- - AI Agent Isolation
-- - AI proposals are not production truth
-- - No direct AI writes to knowledge schema on Day 4
-- ============================================================

CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS audit;

-- ------------------------------------------------------------
-- updated_at trigger function
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- knowledge.source_documents
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge.source_documents (
  id bigserial PRIMARY KEY,

  document_type text NOT NULL,
  title text NOT NULL,

  original_filename text,
  storage_backend text NOT NULL DEFAULT 'local',
  storage_path text NOT NULL,

  mime_type text,
  file_size_bytes bigint,

  captured_at timestamptz,
  document_date date,
  season_year integer,

  crop_name text,
  field_name text,

  uploaded_by text,

  ocr_status text NOT NULL DEFAULT 'pending',
  ocr_text text,
  ocr_confidence numeric(5,4),

  language text NOT NULL DEFAULT 'ja',
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT source_documents_document_type_check
    CHECK (document_type IN (
      'handwritten_note',
      'planting_plan',
      'shipment_record',
      'cultivar_note',
      'field_note',
      'photo',
      'audio',
      'pdf',
      'csv',
      'other'
    )),

  CONSTRAINT source_documents_storage_backend_check
    CHECK (storage_backend IN (
      'local',
      'minio',
      'external',
      'none'
    )),

  CONSTRAINT source_documents_ocr_status_check
    CHECK (ocr_status IN (
      'pending',
      'processing',
      'completed',
      'failed',
      'not_required'
    )),

  CONSTRAINT source_documents_file_size_check
    CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),

  CONSTRAINT source_documents_ocr_confidence_check
    CHECK (ocr_confidence IS NULL OR (ocr_confidence >= 0 AND ocr_confidence <= 1)),

  CONSTRAINT source_documents_season_year_check
    CHECK (season_year IS NULL OR (season_year >= 1900 AND season_year <= 2200))
);

DROP TRIGGER IF EXISTS trg_source_documents_updated_at
ON knowledge.source_documents;

CREATE TRIGGER trg_source_documents_updated_at
BEFORE UPDATE ON knowledge.source_documents
FOR EACH ROW
EXECUTE FUNCTION audit.set_updated_at();

-- ------------------------------------------------------------
-- knowledge.extracted_facts
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge.extracted_facts (
  id bigserial PRIMARY KEY,

  source_document_id bigint NOT NULL
    REFERENCES knowledge.source_documents(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  fact_type text NOT NULL,
  entity_type text,
  entity_name text,
  entity_id text,

  fact_key text NOT NULL,
  fact_value_text text,
  fact_value_json jsonb,

  value_unit text,

  observed_date date,
  season_year integer,

  confidence numeric(5,4) NOT NULL DEFAULT 0,

  extraction_method text NOT NULL DEFAULT 'manual',
  extracted_by_model text,

  verified boolean NOT NULL DEFAULT false,
  verified_by text,
  verified_at timestamptz,

  rejected boolean NOT NULL DEFAULT false,
  rejection_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT extracted_facts_fact_type_check
    CHECK (fact_type IN (
      'planting',
      'shipment',
      'harvest',
      'cultivar',
      'field_condition',
      'work_note',
      'weather_note',
      'pest_disease',
      'material',
      'yield',
      'price',
      'other'
    )),

  CONSTRAINT extracted_facts_confidence_check
    CHECK (confidence >= 0 AND confidence <= 1),

  CONSTRAINT extracted_facts_extraction_method_check
    CHECK (extraction_method IN (
      'manual',
      'ocr',
      'whisper',
      'csv_import',
      'llm_extraction',
      'system'
    )),

  CONSTRAINT extracted_facts_season_year_check
    CHECK (season_year IS NULL OR (season_year >= 1900 AND season_year <= 2200)),

  CONSTRAINT extracted_facts_verified_consistency_check
    CHECK (
      (verified = false AND verified_at IS NULL)
      OR
      (verified = true AND verified_at IS NOT NULL)
    ),

  CONSTRAINT extracted_facts_rejected_consistency_check
    CHECK (
      (rejected = false)
      OR
      (rejected = true AND rejection_reason IS NOT NULL)
    ),

  CONSTRAINT extracted_facts_not_verified_and_rejected_check
    CHECK (NOT (verified = true AND rejected = true)),

  CONSTRAINT extracted_facts_value_presence_check
    CHECK (fact_value_text IS NOT NULL OR fact_value_json IS NOT NULL)
);

DROP TRIGGER IF EXISTS trg_extracted_facts_updated_at
ON knowledge.extracted_facts;

CREATE TRIGGER trg_extracted_facts_updated_at
BEFORE UPDATE ON knowledge.extracted_facts
FOR EACH ROW
EXECUTE FUNCTION audit.set_updated_at();

-- ------------------------------------------------------------
-- knowledge.document_chunks
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS knowledge.document_chunks (
  id bigserial PRIMARY KEY,

  source_document_id bigint NOT NULL
    REFERENCES knowledge.source_documents(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,

  token_count integer,
  chunk_metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  embedding_status text NOT NULL DEFAULT 'pending',
  qdrant_collection text,
  qdrant_point_id text,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT document_chunks_chunk_index_check
    CHECK (chunk_index >= 0),

  CONSTRAINT document_chunks_token_count_check
    CHECK (token_count IS NULL OR token_count >= 0),

  CONSTRAINT document_chunks_embedding_status_check
    CHECK (embedding_status IN (
      'pending',
      'embedded',
      'failed',
      'skipped'
    )),

  CONSTRAINT document_chunks_qdrant_consistency_check
    CHECK (
      embedding_status <> 'embedded'
      OR
      (qdrant_collection IS NOT NULL AND qdrant_point_id IS NOT NULL)
    ),

  CONSTRAINT document_chunks_unique_source_chunk
    UNIQUE (source_document_id, chunk_index)
);

-- ------------------------------------------------------------
-- audit.knowledge_feedback
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit.knowledge_feedback (
  id bigserial PRIMARY KEY,

  feedback_type text NOT NULL,

  related_source_document_id bigint
    REFERENCES knowledge.source_documents(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  related_extracted_fact_id bigint
    REFERENCES knowledge.extracted_facts(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,

  related_proposal_id text,

  question text,
  ai_answer text,
  user_feedback text,

  rating integer,
  correction_text text,

  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT knowledge_feedback_feedback_type_check
    CHECK (feedback_type IN (
      'ai_answer',
      'extracted_fact',
      'ocr_text',
      'rag_result',
      'proposal',
      'other'
    )),

  CONSTRAINT knowledge_feedback_rating_check
    CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),

  CONSTRAINT knowledge_feedback_related_check
    CHECK (
      related_source_document_id IS NOT NULL
      OR related_extracted_fact_id IS NOT NULL
      OR related_proposal_id IS NOT NULL
      OR question IS NOT NULL
    )
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_source_documents_document_type
  ON knowledge.source_documents(document_type);

CREATE INDEX IF NOT EXISTS idx_source_documents_document_date
  ON knowledge.source_documents(document_date);

CREATE INDEX IF NOT EXISTS idx_source_documents_season_year
  ON knowledge.source_documents(season_year);

CREATE INDEX IF NOT EXISTS idx_source_documents_crop_name
  ON knowledge.source_documents(crop_name);

CREATE INDEX IF NOT EXISTS idx_source_documents_field_name
  ON knowledge.source_documents(field_name);

CREATE INDEX IF NOT EXISTS idx_source_documents_ocr_status
  ON knowledge.source_documents(ocr_status);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_source_document_id
  ON knowledge.extracted_facts(source_document_id);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_fact_type
  ON knowledge.extracted_facts(fact_type);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_entity
  ON knowledge.extracted_facts(entity_type, entity_name);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_observed_date
  ON knowledge.extracted_facts(observed_date);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_season_year
  ON knowledge.extracted_facts(season_year);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_verified
  ON knowledge.extracted_facts(verified);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_rejected
  ON knowledge.extracted_facts(rejected);

CREATE INDEX IF NOT EXISTS idx_document_chunks_source_document_id
  ON knowledge.document_chunks(source_document_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_status
  ON knowledge.document_chunks(embedding_status);

CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_related_source_document_id
  ON audit.knowledge_feedback(related_source_document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_related_extracted_fact_id
  ON audit.knowledge_feedback(related_extracted_fact_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_feedback_type
  ON audit.knowledge_feedback(feedback_type);

-- ------------------------------------------------------------
-- Ownership
-- ------------------------------------------------------------

ALTER FUNCTION audit.set_updated_at() OWNER TO farmos_owner_local;

ALTER TABLE knowledge.source_documents OWNER TO farmos_owner_local;
ALTER TABLE knowledge.extracted_facts OWNER TO farmos_owner_local;
ALTER TABLE knowledge.document_chunks OWNER TO farmos_owner_local;
ALTER TABLE audit.knowledge_feedback OWNER TO farmos_owner_local;

-- ------------------------------------------------------------
-- Privileges
-- ------------------------------------------------------------

REVOKE ALL ON knowledge.source_documents FROM PUBLIC;
REVOKE ALL ON knowledge.extracted_facts FROM PUBLIC;
REVOKE ALL ON knowledge.document_chunks FROM PUBLIC;
REVOKE ALL ON audit.knowledge_feedback FROM PUBLIC;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA knowledge FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA audit FROM PUBLIC;

GRANT USAGE ON SCHEMA knowledge TO farmos_app_local;
GRANT USAGE ON SCHEMA audit TO farmos_app_local;

GRANT USAGE ON SCHEMA knowledge TO farmos_ai_readonly_local;
GRANT USAGE ON SCHEMA audit TO farmos_ai_readonly_local;

-- Do not grant knowledge/audit usage to farmos_ai_proposal_local on Day 4.
-- AI proposal role remains limited to ai.proposal_inbox.

GRANT SELECT, INSERT, UPDATE ON knowledge.source_documents TO farmos_app_local;
GRANT SELECT, INSERT, UPDATE ON knowledge.extracted_facts TO farmos_app_local;
GRANT SELECT, INSERT, UPDATE ON knowledge.document_chunks TO farmos_app_local;
GRANT SELECT, INSERT, UPDATE ON audit.knowledge_feedback TO farmos_app_local;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA knowledge TO farmos_app_local;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA audit TO farmos_app_local;

GRANT SELECT ON knowledge.source_documents TO farmos_ai_readonly_local;
GRANT SELECT ON knowledge.extracted_facts TO farmos_ai_readonly_local;
GRANT SELECT ON knowledge.document_chunks TO farmos_ai_readonly_local;
GRANT SELECT ON audit.knowledge_feedback TO farmos_ai_readonly_local;

REVOKE ALL ON knowledge.source_documents FROM farmos_ai_proposal_local;
REVOKE ALL ON knowledge.extracted_facts FROM farmos_ai_proposal_local;
REVOKE ALL ON knowledge.document_chunks FROM farmos_ai_proposal_local;
REVOKE ALL ON audit.knowledge_feedback FROM farmos_ai_proposal_local;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA knowledge FROM farmos_ai_proposal_local;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA audit FROM farmos_ai_proposal_local;

COMMIT;
