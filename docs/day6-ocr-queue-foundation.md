# Day 6: OCR Queue Foundation

## Purpose

Day 6 builds the OCR Queue Foundation for FarmOS Core.

The goal is not to execute OCR yet.
The goal is to create a safe processing queue that connects registered raw source documents to future OCR, Whisper transcription, CSV parsing, PDF text extraction, and image metadata extraction.

## Core Principles

- Raw First
- No Destructive Import
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- Security First
- No direct AI write access to app schema
- No destructive processing of source documents

## What Day 6 Adds

Day 6 introduces:

- `knowledge.document_processing_jobs`

This table manages processing jobs for documents stored in:

- `knowledge.source_documents`

Supported future job types include:

- OCR
- Whisper transcription
- CSV parsing
- Image metadata extraction
- Text extraction
- PDF text extraction

## What Day 6 Does Not Do

Day 6 does not:

- Run OCR
- Run Whisper
- Install Paperless
- Install n8n
- Install OpenClaw
- Install Hermes
- Insert embeddings into Qdrant
- Connect to production DB
- Expose ports externally
- Give AI agents write access
- Insert historical paper data directly into app schema
- Destroy or overwrite source documents

## Source Document Status vs Job Status

`knowledge.source_documents.ocr_status` represents the current OCR state of the source document as a whole.

`knowledge.document_processing_jobs.status` represents the state of each processing job.

Example:

- source_documents.ocr_status = pending
- document_processing_jobs.job_type = ocr
- document_processing_jobs.status = pending

When OCR is actually executed in the future, the job may become completed, failed, skipped, or cancelled.

## Security Model

AI roles must not be able to insert, update, or delete processing jobs.

Expected role behavior:

- `farmos_app_local`
  - SELECT / INSERT / UPDATE on processing jobs
- `farmos_ai_readonly_local`
  - SELECT only
- `farmos_ai_proposal_local`
  - no INSERT / UPDATE / DELETE on processing jobs

All actual production changes remain human-approved.

## Day 7 Candidates

Possible Day 7 tasks:

- Implement a dry-run OCR worker
- Add a safe job claiming mechanism
- Add OCR result tables
- Add text extraction for plain text files
- Add job retry logic
- Add admin review flow for extracted facts
- Keep AI write access blocked

## Queue Enqueue Command

Day 6 added:

- scripts/ingest/enqueue_processing_job.ts
- pnpm run enqueue-job

Recommended command:

    pnpm run enqueue-job --source-document-id 3 --job-type ocr

The script also tolerates an optional standalone --:

    pnpm run enqueue-job -- --source-document-id 3 --job-type ocr

Expected first result:

- created

Expected duplicate result:

- already_queued

This command only creates a pending processing job.
It does not execute OCR.
