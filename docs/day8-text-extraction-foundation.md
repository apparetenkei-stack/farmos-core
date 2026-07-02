# Day8 Text Extraction Result Foundation

## Purpose

Day8 creates the foundation for storing extracted text results separately from raw source document metadata.

This Day is intentionally scoped as approximately 2 hours of work.

## Core Principles

- Event Sourcing
- Human in the Loop
- Zero Input UX
- AI Agent Isolation
- Security First
- Raw First / No Destructive Import
- Proposal First / Human Approval

## Why document_extractions exists

Day7 confirmed that a worker can safely claim a processing job and read a registered source document.

Day8 adds a separate extraction history layer:

- OCR results
- text_extract results
- pdf_text_extract results
- Whisper transcriptions
- manual transcriptions
- corrected text
- reprocessed results from different extractors or versions

These should not overwrite knowledge.source_documents directly.

The source document record represents the raw registered asset and its metadata.
Extraction results are derived artifacts and must be versionable.

## Important Day8 Boundaries

Day8 does not run real OCR.
Day8 does not call an LLM.
Day8 does not insert embeddings into Qdrant.
Day8 does not install OpenClaw or Hermes.
Day8 does not touch app schema.
Day8 does not connect to production DB.
Day8 does not expose ports to LAN, WAN, or Tailscale.
Day8 does not mark source_documents.ocr_status as completed.

## Security Model

AI agents must not write to app schema.
AI agents must not directly write to knowledge.document_extractions.
AI agents can create proposals only through ai.proposal_inbox in future workflows.

document_extractions is written by app-side workers only.

## Day8 Outputs

- knowledge.document_extractions table
- scripts/sql/day8_text_extraction_foundation.sql
- scripts/ingest/store_document_extraction_from_job.ts
- package.json script: store-extraction-from-job
- Backup and restore verification
- Git commit

## Day9 Candidates

Day9 may implement a real text extraction worker for text/plain documents.

Possible Day9 scope:

- Process pending jobs
- Read source file
- Store full extracted text in document_extractions
- Mark relevant job completed
- Carefully decide whether source_documents.ocr_status should remain pending or become extracted/completed depending on extraction_type
- Still avoid OCR, LLM, Qdrant, OpenClaw, Hermes unless explicitly scoped
