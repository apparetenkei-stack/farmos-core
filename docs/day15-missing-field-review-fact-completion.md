# Day15 - Missing Field Review / Fact Completion Foundation

## Purpose

Day15 completes missing fields for a blocked app projection apply plan.

Day14 created `knowledge.app_projection_apply_plans.id=1`, but it remained blocked because the following fields were missing:

- variety
- field_name
- sowing_date_text
- transplant_date_text

Day15 uses human-reviewed extracted facts to complete these missing fields and refresh the apply plan readiness.

## Scope

This sprint temporarily runs Day15 through Day18 in sequence, but each Day remains a separate unit with its own:

- purpose
- files
- checks
- backup / restore_test
- secret scan
- git commit

Day15 does not write to the app schema.

## Review Targets

Day15 reviews the following extracted facts:

- id=6 `variety=ピクセル`
- id=7 `sowing_date_text=9/20`
- id=8 `transplant_date_text=11/15`
- id=9 `field_name=A圃場`

Fact id=11 is an observation memo and is not used by the Day15 apply plan readiness refresh.

## Safety Boundaries

Day15 does not insert into:

- app.crop_cycles
- app.work_records
- app.shipments
- app.fields
- app.members

Day15 does not overwrite:

- source_documents
- document_extractions
- extracted_facts.fact_value_text
- extracted_facts.fact_value_json
- projection_candidates.candidate_payload
- projection_candidates.supporting_extracted_fact_ids

Day15 follows:

- Raw First / No Destructive Import
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

Day15 does not call:

- external APIs
- LLMs
- Qdrant embedding
- OCR production execution
- Whisper production transcription
- OpenClaw
- Hermes

## Created

- `scripts/ingest/refresh_app_projection_apply_plan_readiness.ts`
- package script: `refresh-app-projection-apply-plan-readiness`

## Expected Result

If facts id=6,7,8,9 are verified, apply plan id=1 should become:

- `readiness_status=ready`
- `missing_fields={}`
- `plan_payload.completed_fields` includes:
  - season_year
  - crop
  - variety
  - field_name
  - sowing_date_text
  - transplant_date_text

The apply plan `status` may remain `draft`.

## Day16 Candidate

Day16 should build Apply Plan Review Foundation.

Day16 should allow a human to approve a ready apply plan for app apply, but still avoid writing to `app.crop_cycles`.
