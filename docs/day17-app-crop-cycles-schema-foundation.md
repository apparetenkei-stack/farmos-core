# Day17 - App Crop Cycles Schema Foundation

## Purpose

Day17 creates the minimal `app.crop_cycles` table required for future app schema projection.

Day16 approved `knowledge.app_projection_apply_plans.id=1` for app apply, but no app schema table existed yet.

Day17 creates the table and verifies permissions, while intentionally inserting no production crop cycle data.

## Scope

Day17 creates:

- `app.crop_cycles`

Day17 does not insert crop cycle records.

Day17 does not execute any apply plan.

Day17 does not mutate:

- source_documents
- document_extractions
- extracted_facts
- projection_candidates
- app_projection_apply_plans

## Safety Boundaries

Day17 follows:

- Human in the Loop
- Raw First / No Destructive Import
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

Day17 does not:

- call external APIs
- call LLMs
- run OCR
- run Whisper
- insert Qdrant embeddings
- introduce OpenClaw
- introduce Hermes
- grant app schema write permissions to AI roles

## app.crop_cycles Design

The table stores the app-level crop cycle truth created from reviewed and approved knowledge apply plans.

The first minimal version keeps date-like values as text:

- sowing_date_text
- transplant_date_text

Date normalization is intentionally deferred.

## Expected Result

After Day17:

- `app.crop_cycles` exists
- `app.crop_cycles` has zero rows
- `farmos_app_local` can SELECT / INSERT / UPDATE
- `farmos_app_local` cannot DELETE
- `farmos_ai_readonly_local` can SELECT only
- `farmos_ai_proposal_local` can SELECT only

## Day18 Candidate

Day18 should create a human-executed CLI to apply reviewed crop cycle apply plans into `app.crop_cycles`.
