BEGIN;

-- Day 5: Document Ingestion Foundation
-- Purpose:
-- Add metadata columns for safe source document registration.
-- This does not allow AI roles to write to knowledge tables.

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS content_sha256 text;

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS mime_type text;

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS storage_backend text DEFAULT 'local';

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS ocr_status text DEFAULT 'pending';

ALTER TABLE knowledge.source_documents
  ADD COLUMN IF NOT EXISTS registered_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'source_documents_content_sha256_format_chk'
      AND conrelid = 'knowledge.source_documents'::regclass
  ) THEN
    ALTER TABLE knowledge.source_documents
      ADD CONSTRAINT source_documents_content_sha256_format_chk
      CHECK (
        content_sha256 IS NULL
        OR content_sha256 ~ '^[a-f0-9]{64}$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'source_documents_file_size_nonnegative_chk'
      AND conrelid = 'knowledge.source_documents'::regclass
  ) THEN
    ALTER TABLE knowledge.source_documents
      ADD CONSTRAINT source_documents_file_size_nonnegative_chk
      CHECK (
        file_size_bytes IS NULL
        OR file_size_bytes >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'source_documents_storage_backend_chk'
      AND conrelid = 'knowledge.source_documents'::regclass
  ) THEN
    ALTER TABLE knowledge.source_documents
      ADD CONSTRAINT source_documents_storage_backend_chk
      CHECK (
        storage_backend IS NULL
        OR storage_backend IN ('local', 'minio', 'external')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'source_documents_ocr_status_chk'
      AND conrelid = 'knowledge.source_documents'::regclass
  ) THEN
    ALTER TABLE knowledge.source_documents
      ADD CONSTRAINT source_documents_ocr_status_chk
      CHECK (
        ocr_status IS NULL
        OR ocr_status IN ('pending', 'not_required', 'completed', 'failed', 'skipped')
      );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS source_documents_content_sha256_uidx
  ON knowledge.source_documents (content_sha256)
  WHERE content_sha256 IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS source_documents_storage_path_uidx
  ON knowledge.source_documents (storage_backend, storage_path)
  WHERE storage_backend IS NOT NULL
    AND storage_path IS NOT NULL;

-- Permission policy:
-- App role may register source documents.
-- AI roles must not write to knowledge tables.

GRANT USAGE ON SCHEMA knowledge TO farmos_app_local;
GRANT SELECT, INSERT, UPDATE ON knowledge.source_documents TO farmos_app_local;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA knowledge TO farmos_app_local;

GRANT USAGE ON SCHEMA knowledge TO farmos_ai_readonly_local;
GRANT SELECT ON ALL TABLES IN SCHEMA knowledge TO farmos_ai_readonly_local;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA knowledge
  FROM farmos_ai_readonly_local;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA knowledge
  FROM farmos_ai_proposal_local;

COMMIT;
