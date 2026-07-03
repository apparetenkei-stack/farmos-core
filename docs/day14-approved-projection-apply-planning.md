# Day14 Approved Projection Apply Planning

## Purpose

Day14 creates the approved projection apply planning foundation.

The goal is to read human-approved `knowledge.projection_candidates` and create app apply plan candidates in `knowledge.app_projection_apply_plans`.

Day14 does not write to the app schema.

## Scope

One Day is designed as approximately a 2-hour work unit.

Day14 scope:

- Confirm Day13 approved projection candidate state
- Create apply planning table in knowledge schema
- Create worker CLI to generate apply plans
- Preserve Raw First / No Destructive Import
- Preserve Human in the Loop
- Preserve Proposal First / Human Approval
- Preserve AI Agent Isolation
- Confirm no app schema writes
- Confirm permissions
- Backup and restore test
- Commit changes

## Day13 Input

Projection Candidate id=1 was approved on Day13.

Important:

- `approved_for_app_projection=true` means approved for planning/app projection workflow
- It does not mean app schema has already been updated
- Day14 only creates an apply plan
- Day14 does not insert into `app.crop_cycles`

## Day14 Output

Day14 creates:

- `knowledge.app_projection_apply_plans`
- `scripts/ingest/create_app_projection_apply_plan.ts`
- package script: `create-app-projection-apply-plan`

Expected apply plan:

- projection_candidate_id=1
- target_table=crop_cycles
- apply_plan_type=crop_cycle_apply_plan
- readiness_status=blocked
- missing_fields:
  - variety
  - field_name
  - sowing_date_text
  - transplant_date_text

## Non-goals

Day14 does not:

- Write to app schema
- Insert into app.crop_cycles
- Insert into app.work_records
- Insert into app.shipments
- Call external APIs
- Call LLMs
- Insert Qdrant embeddings
- Install OpenClaw
- Install Hermes
- Install n8n
- Install Paperless
- Run production OCR
- Run Whisper

## Security Notes

AI roles must not be allowed to insert or update apply plans.

Allowed:

- farmos_app_local: SELECT / INSERT / UPDATE on apply plans
- farmos_ai_readonly_local: SELECT only
- farmos_ai_proposal_local: SELECT only

AI must not write to app schema or directly create app apply plans.

## Day15 Candidate

Recommended Day15:

Missing Field Review / Fact Completion Foundation

Goal:

- Review remaining facts id=6,7,8,9
- Fill missing fields for blocked apply plan
- Re-evaluate apply plan readiness
- Still do not write to app schema
