# Day20 Crop Cycle Provenance Detail CLI

## Purpose

Day20 adds a read-only detail CLI for explaining where a single app.crop_cycles business truth came from.

The CLI answers:

This crop cycle exists in app.crop_cycles. Which source document, extraction, facts, projection candidate, and apply plan produced it?

## Scope

Implemented in Day20:

- crop_cycle_id based detail CLI
- source fact expansion from source_extracted_fact_ids
- source document lookup
- document extraction lookup
- projection candidate lookup
- apply plan lookup
- trace object for provenance explanation
- explicit read-only boundary metadata
- raw extracted text hidden by default
- raw extracted text shown only with --include-raw-text

Not implemented in Day20:

- Next.js UI
- API Route
- editing workflow
- archive workflow
- AI proposal inbox integration
- Hermes / OpenClaw / n8n / Paperless
- order intake / shipment allocation schema

## Created files

- scripts/app/show_crop_cycle_provenance.ts
- docs/day20-crop-cycle-provenance-detail-cli.md

## Modified files

- package.json

Added package script:

- show-crop-cycle-provenance: tsx scripts/app/show_crop_cycle_provenance.ts

## CLI usage

Normal detail output:

- pnpm run show-crop-cycle-provenance -- --crop-cycle-id 2

Include raw extracted text explicitly:

- pnpm run show-crop-cycle-provenance -- --crop-cycle-id 2 --include-raw-text

Not found behavior:

- pnpm run show-crop-cycle-provenance -- --crop-cycle-id 999999

Argument validation:

- pnpm run show-crop-cycle-provenance
- pnpm run show-crop-cycle-provenance -- --crop-cycle-id abc

## Result summary

Confirmed normal execution:

- result=ok
- crop_cycle.crop_cycle_id=2
- crop_cycle.crop=ブロッコリー
- crop_cycle.variety=ピクセル
- crop_cycle.field_name=A圃場
- crop_cycle.source_extracted_fact_ids=[4,5,6,7,8,9]
- source_document.id=3
- source_document.title=2024 ブロッコリー ピクセル メモ
- source_document.ocr_status=pending
- document_extraction.id=3
- document_extraction.status=completed
- document_extraction.is_current=true
- document_extraction.extracted_text_length=51
- projection_candidate.id=1
- projection_candidate.approved_for_app_projection=true
- apply_plan.id=1
- apply_plan.approved_for_app_apply=true
- read_boundary.writes_performed=false
- read_boundary.transaction_read_only=true

## Source fact expansion

Confirmed expanded facts:

| id | fact_value_text | verified | rejected |
|---:|---|---|---|
| 4 | 2024 | true | false |
| 5 | ブロッコリー | true | false |
| 6 | ピクセル | true | false |
| 7 | 9/20 | true | false |
| 8 | 11/15 | true | false |
| 9 | A圃場 | true | false |

Rejected / unreviewed facts were not included in the crop cycle provenance fact list:

- fact id=10 was not included
- fact id=11 was not included

## Raw text behavior

Normal execution does not include document_extraction.extracted_text.

Confirmed command:

- pnpm run show-crop-cycle-provenance -- --crop-cycle-id 2 | grep '"extracted_text"'

No extracted_text field was emitted.

With explicit raw text option:

- pnpm run show-crop-cycle-provenance -- --crop-cycle-id 2 --include-raw-text

document_extraction.extracted_text was emitted.

## Read-only boundary

The CLI uses a read-only transaction:

- begin read only

The output includes:

- read_boundary.mode=read_only_cli
- read_boundary.transaction_read_only=true
- read_boundary.writes_performed=false
- read_boundary.app_schema_write_allowed=false

Day20 did not add write permissions to AI roles.

Day20 did not perform:

- app.crop_cycles INSERT / UPDATE / DELETE
- knowledge.extracted_facts UPDATE
- knowledge.document_extractions UPDATE
- knowledge.source_documents UPDATE
- knowledge.projection_candidates UPDATE
- knowledge.app_projection_apply_plans UPDATE
- grant all
- grant insert/update/delete

## Business data safety

Day20 did not change the business value in app.crop_cycles.

Expected preserved values:

- id: 2
- season_year: 2024
- crop: ブロッコリー
- variety: ピクセル
- field_name: A圃場
- sowing_date_text: 9/20
- transplant_date_text: 11/15
- source_apply_plan_id: 1
- source_projection_candidate_id: 1
- source_document_id: 3
- document_extraction_id: 3
- source_extracted_fact_ids: {4,5,6,7,8,9}
- archived: false

## Backup / restore test

Backup and restore test are performed after implementation confirmation.

Backup file pattern:

- backups/farmos_core_day20_YYYYMMDD_HHMMSS.dump

Restore test target database:

- farmos_core_restore_test

Restore test must confirm that app.crop_cycles_with_provenance still returns crop cycle id 2 with expected provenance values.

## Commit

Commit message:

- git commit -m "feat: add crop cycle provenance detail cli"
