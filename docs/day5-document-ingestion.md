# Day 5 - Document Ingestion Foundation

## Purpose

Day 5 builds the safe entry point for original farm documents.

The goal is to accept handwritten notes, crop planning sheets, shipment records, cultivar notes, field notes, PDFs, CSVs, photos, and audio files as original source files before OCR, Whisper, RAG, or AI agents are introduced.

## Core Principle

- Raw First
- No Destructive Import
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

## Design Policy

Original files must not be committed to Git.

Original files should be stored in local runtime storage first, and later moved to external SSD or MinIO.

Day 5 does not perform full OCR.
Day 5 does not perform Whisper transcription.
Day 5 does not introduce Paperless.
Day 5 does not introduce n8n.
Day 5 does not introduce OpenClaw.
Day 5 does not introduce Hermes.
Day 5 does not write historical records directly into app.work_records or app.crop_cycles.

## Local Storage Policy

Use data/ingestion/ as the local runtime storage root.

This directory is ignored by Git.

Recommended structure:

- data/ingestion/incoming/
- data/ingestion/documents/image/
- data/ingestion/documents/pdf/
- data/ingestion/documents/csv/
- data/ingestion/documents/audio/
- data/ingestion/documents/text/
- data/ingestion/samples/
- data/ingestion/processed/
- data/ingestion/rejected/

## Source Document Registration

Original files are registered into knowledge.source_documents.

The registration script records:

- file path
- storage backend
- storage path
- file size
- MIME type
- SHA256 hash
- OCR status

The source file itself remains outside Git.

## Security Rules

AI roles must not insert into knowledge.source_documents.

AI roles may read knowledge data where explicitly granted.
AI-generated structured candidates should go to ai.proposal_inbox or knowledge.extracted_facts only through approved application workflows.

No production DB is connected.
No Supabase service role key is stored.
No secrets are committed.

## Day 6 Handoff Candidates

- OCR queue design
- document ingestion status transitions
- extracted_facts registration workflow
- MinIO storage path mapping
- Qdrant embedding pipeline draft
- Paperless/n8n evaluation without deployment
