# Day9 Text Extraction Worker v1

## Purpose

Day9 adds Text Extraction Worker v1 for FarmOS Core.

The goal is to read a registered text/plain source document from knowledge.source_documents.storage_path and save the full extracted text into knowledge.document_extractions.

Day9 is intentionally scoped to about 2 hours.

## Core principles

- Event Sourcing
- Human in the Loop
- Zero Input UX foundation
- AI Agent Isolation
- Security First
- Raw First
- No Destructive Import
- Proposal First / Human Approval

## What Day9 does

Day9 creates a worker that:

- claims one pending text_extract job
- uses FOR UPDATE SKIP LOCKED
- supports only storage_backend = local
- supports only storage_path beginning with local://
- reads only files under data/ingestion
- supports only mime_type = text/plain
- reads the original file as UTF-8
- stores the full text in knowledge.document_extractions
- uses extraction_type = text_extract
- uses extractor_name = text_extraction_worker_v1
- stores metadata such as bytes, characters, lines, non-empty lines, preview, worker_id, and source info
- marks the job as completed
- keeps knowledge.source_documents.ocr_status unchanged

## What Day9 does not do

Day9 does not:

- run OCR
- parse PDFs
- run Whisper
- call any LLM
- create embeddings
- write to Qdrant
- install OpenClaw
- install Hermes
- write to the app schema
- mark source_documents.ocr_status as completed
- expose any service to LAN, Tailscale, or the internet

## Security design

The worker is an app-side ingestion worker.

AI agents must not directly insert into knowledge.document_extractions.

AI agents may read, search, summarize, and propose, but production reflection must go through Human in the Loop approval.

The worker does not call external APIs and does not read secrets beyond the database connection environment variables required for local execution.

## Storage safety

Only local source documents are supported.

The worker accepts only paths like:

- local://data/ingestion/...

The resolved file path must stay inside:

- data/ingestion

This prevents accidental reads from other project files, .env files, backups, SSH keys, or system paths.

## Day10 handoff candidates

Day10 should start Extracted Facts Candidate Foundation.

Recommended Day10 flow:

knowledge.document_extractions.extracted_text
  -> rule-based extractor or LLM stub
  -> knowledge.extracted_facts
  -> verified = false
  -> human confirmation later

Day10 should still avoid OpenClaw / Hermes installation unless the agent isolation boundary is explicitly designed first.
