# Day 7 - OCR Worker Dry Run Foundation

## Purpose

Day 7 builds the first safe dry-run worker for document processing jobs.

The worker claims one pending job from `knowledge.document_processing_jobs`, marks it as running, reads the linked `knowledge.source_documents` record, safely reads only a local `text/plain` sample file, writes a dry-run summary to `result_summary`, and completes the job.

## Core Principles

- Raw First
- No Destructive Import
- Human in the Loop
- AI Agent Isolation
- Security First
- Proposal First / Human Approval

## What Day 7 Does

- Claims one pending processing job safely.
- Uses priority and created_at ordering.
- Uses `FOR UPDATE SKIP LOCKED` for future multi-worker safety.
- Updates job status from pending to running to completed.
- Increments attempt_count.
- Sets locked_by, started_at, finished_at.
- Reads only `storage_backend=local`.
- Allows only `local://data/ingestion/` paths.
- Prevents path traversal.
- Processes only `mime_type=text/plain`.
- Stores dry-run result in `result_summary`.

## What Day 7 Does Not Do

- No real OCR.
- No image OCR.
- No Whisper.
- No PDF parsing.
- No Paperless.
- No n8n.
- No OpenClaw.
- No Hermes.
- No Qdrant embedding.
- No external API.
- No production DB connection.
- No AI write permission expansion.
- No direct import into app schema.
- No destructive modification of source documents.

## Decision About source_documents.ocr_status

Day 7 does not update `knowledge.source_documents.ocr_status` to completed.

Reason: this is only a dry-run text/plain worker test. OCR itself has not been executed. The job can be completed, but the document-level OCR status should remain pending until actual OCR/text extraction is implemented.

## Day 8 Candidates

- Add real text extraction result storage.
- Add extracted text writing to source_documents.ocr_text or a dedicated extraction table.
- Add controlled extracted_facts generation.
- Add failure test fixtures.
- Add worker role hardening.
- Add observability logs.
