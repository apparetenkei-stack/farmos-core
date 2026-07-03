# Day18 - Apply Plan to App Crop Cycles Projection

## Purpose

Day18 applies a human-reviewed and approved app projection apply plan into `app.crop_cycles`.

This is the first controlled write from the knowledge workflow into the app schema.

## Starting Point

Expected starting state:

- `knowledge.app_projection_apply_plans.id=1`
- `readiness_status=ready`
- `status=reviewed`
- `reviewed=true`
- `rejected=false`
- `approved_for_app_apply=true`
- `missing_fields={}`
- `app.crop_cycles` exists
- `app.crop_cycles` has zero rows

## Scope

Day18 creates:

- `scripts/ingest/apply_crop_cycle_apply_plan.ts`
- package script: `apply-crop-cycle-apply-plan`

Day18 does not require a SQL migration because the Day17 schema is sufficient.

## Human Execution Rule

The Day18 apply CLI is intended to be executed by a human operator.

AI agents must not execute app schema writes.

## Safety Conditions

The CLI only applies a plan when all of the following are true:

- apply plan exists
- `target_schema=app`
- `target_table=crop_cycles`
- `apply_plan_type=crop_cycle_apply_plan`
- `readiness_status=ready`
- `status=reviewed`
- `reviewed=true`
- `rejected=false`
- `approved_for_app_apply=true`
- `missing_fields` is empty
- `plan_payload.completed_fields` exists
- `app.crop_cycles.source_apply_plan_id` is not already present

## Write Behavior

The CLI inserts one row into:

- `app.crop_cycles`

The CLI does not update or delete existing crop cycles.

Duplicate application is prevented by:

- application check in CLI
- unique index on `app.crop_cycles.source_apply_plan_id`

## Non-Destructive Boundaries

Day18 does not mutate:

- source_documents
- document_extractions
- extracted_facts
- projection_candidates
- app_projection_apply_plans

Day18 follows:

- Human in the Loop
- Raw First / No Destructive Import
- Proposal First / Human Approval
- AI Agent Isolation
- Security First

## Expected Result

After Day18, `app.crop_cycles` should contain one row:

- season_year=2024
- crop=ブロッコリー
- variety=ピクセル
- field_name=A圃場
- sowing_date_text=9/20
- transplant_date_text=11/15
- source_apply_plan_id=1
- source_projection_candidate_id=1
- source_document_id=3
- document_extraction_id=3
- source_extracted_fact_ids includes 4,5,6,7,8,9

## Day19 Candidate

Day19 should build a read-only API or UI foundation for viewing `app.crop_cycles` and its provenance.
