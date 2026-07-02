# Day10 Extracted Facts Candidate Foundation

## Purpose

Day10 creates the Extracted Facts Candidate Foundation.

Day9 stored full text from a text/plain source document into `knowledge.document_extractions`.
Day10 reads that extracted text and creates structured fact candidates in `knowledge.extracted_facts`.

This is a 1 Day = approximately 2 hour scope.

## Core principles

- Event Sourcing
- Human in the Loop
- Zero Input UX
- AI Agent Isolation
- Security First
- Raw First / No Destructive Import
- Proposal First / Human Approval

## Day10 scope

Day10 only creates fact candidates.

It does not write to:

- `app.crop_cycles`
- `app.work_records`
- `app.shipments`
- any app schema tables

It does not use:

- external APIs
- LLM extraction
- Qdrant embeddings
- OpenClaw
- Hermes
- n8n
- Paperless
- Whisper
- production DB
- Supabase Service Role Key

## Current schema note

`knowledge.extracted_facts` already exists from Day4.

The actual schema includes:

- `source_document_id`
- `fact_type`
- `entity_type`
- `entity_name`
- `entity_id`
- `fact_key`
- `fact_value_text`
- `fact_value_json`
- `observed_date`
- `season_year`
- `confidence`
- `extraction_method`
- `extracted_by_model`
- `verified`
- `rejected`

Day10 adds only minimal missing fields needed to connect facts back to a specific extraction.

## Day10 minimal schema addition

Day10 may add:

- `document_extraction_id`
- `candidate_metadata`

This keeps the existing Day4 design intact.

## Design

The Day10 worker reads completed/current `text_extract` records from `knowledge.document_extractions`.

It then performs rule-based extraction and stores candidates in `knowledge.extracted_facts` with:

- `verified=false`
- `rejected=false`
- `extraction_method=system`
- `extracted_by_model=extracted_facts_candidate_worker_v1`
- source document reference
- document extraction reference
- raw value in `fact_value_text`
- structured value in `fact_value_json`
- rule metadata in `candidate_metadata`

The extracted facts are candidates only.
They must be reviewed by a human before any app schema reflection.

## Target sample

Source document id: 3

Document extraction id: 3

Text:

- 2024年 ブロッコリー ピクセル 9/20播種 11/15定植 A圃場 秀品率高い 雨が多いと徒長

Expected candidates:

- year = 2024
- crop = ブロッコリー
- variety = ピクセル
- sowing_date_text = 9/20
- transplant_date_text = 11/15
- field_name = A圃場
- observation = 秀品率高い
- observation = 雨が多いと徒長

## Security

AI agents are not given direct INSERT privileges to `knowledge.extracted_facts`.

The app worker role may create candidates.
AI roles may read only where appropriate.
All production reflection requires human approval.

## Day10 non-goals

Day10 does not:

- write to app schema
- normalize into crop_cycles
- normalize into work_records
- normalize into shipments
- call external APIs
- call LLMs
- create embeddings
- insert into Qdrant
- install OpenClaw
- install Hermes

## Day11 candidates

Recommended Day11:

- Extracted Facts Review / Verification Foundation

Other candidates:

- document_chunks foundation
- Qdrant embedding dry run
- weather_snapshots foundation
- recommendations foundation
- OCR real worker preparation

OpenClaw / Hermes should still wait until the safe data intake and verification flow is stronger.
