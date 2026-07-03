# Day16 - Apply Plan Review Foundation

## Purpose

Day16 adds the human review and approval foundation for app projection apply plans.

Day15 refreshed `knowledge.app_projection_apply_plans.id=1` from `blocked` to `ready` by completing missing fields through human-reviewed facts.

Day16 allows a human owner/operator to approve a ready apply plan for future app schema application.

## Scope

Day16 does not write to app schema.

Day16 does not insert into:

- app.crop_cycles
- app.work_records
- app.shipments
- app.fields
- app.members

Day16 only updates review and approval metadata on:

- knowledge.app_projection_apply_plans

## Starting Point

Expected apply plan id=1 state:

- readiness_status=ready
- missing_fields={}
- status=draft
- reviewed=false
- rejected=false

## Created

Day16 creates:

- `scripts/sql/day16_apply_plan_review_foundation.sql`
- `scripts/ingest/review_app_projection_apply_plan.ts`
- package script: `review-app-projection-apply-plan`

## Approval Meaning

`approved_for_app_apply=true` means:

- the apply plan is complete
- the apply plan was reviewed by a human
- the apply plan may be used by a future human-executed app apply CLI

It does not mean the app schema has already been written.

## Safety Boundaries

Day16 does not:

- write to app schema
- call external APIs
- call LLMs
- run OCR
- run Whisper
- insert Qdrant embeddings
- introduce OpenClaw
- introduce Hermes
- mutate source documents
- mutate document extractions
- overwrite extracted fact values
- overwrite projection candidate payloads

Day16 follows:

- Human in the Loop
- Raw First / No Destructive Import
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

## Expected Result

After Day16 approval, apply plan id=1 should be:

- readiness_status=ready
- status=reviewed
- reviewed=true
- rejected=false
- approved_for_app_apply=true
- approved_by=hayate

## Day17 Candidate

Day17 should create the minimal `app.crop_cycles` schema.

Day17 should not insert crop cycle data yet.
