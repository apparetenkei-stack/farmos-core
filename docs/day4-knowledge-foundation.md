# Day 4 - Knowledge Foundation

## Purpose

Day 4 builds the first Knowledge foundation for FarmOS Core.

The goal is to safely store handwritten notes, planting plans, shipment records, cultivar notes, field notes, photos, audio, PDFs, and CSV files without forcing them directly into app.work_records or app.crop_cycles.

## Core Principles

- Raw First
- No Destructive Import
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- No direct AI writes to app schema
- No direct AI writes to knowledge schema on Day 4

## Layer Design

### Raw Layer

`knowledge.source_documents`

Stores original document metadata and OCR text.

Examples:

- handwritten notes
- planting plans
- shipment records
- cultivar notes
- field notes
- photos
- audio
- PDFs
- CSV files

The original source must remain traceable.

### Extraction Layer

`knowledge.extracted_facts`

Stores extracted fact candidates from OCR, Whisper, CSV parsing, or human entry.

These records are not production truth until verified by a human.

### Knowledge / RAG Layer

`knowledge.document_chunks`

Stores text chunks derived from OCR or extracted text.

Embedding and Qdrant insertion are intentionally deferred to later days.

### Feedback Layer

`audit.knowledge_feedback`

Stores user feedback, corrections, ratings, and review comments for AI answers or extracted facts.

## Security Policy

AI agents are allowed to:

- read
- search
- OCR
- transcribe
- summarize
- create proposals

AI agents are not allowed to:

- directly write to app schema
- directly write to knowledge schema on Day 4
- run migrations
- push to Git main
- read secrets
- delete data

## Day 5 Candidates

- OCR pipeline design
- local file storage layout
- MinIO bucket policy
- source document upload flow
- Paperless-style ingestion design
- document chunking strategy
- Qdrant collection design
- RAG read-only query prototype
