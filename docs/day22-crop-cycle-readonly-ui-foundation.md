# Day22 Crop Cycle Read-only UI Foundation

## Purpose

Day22 added the first minimal Next.js App Router UI for Crop Cycle read-only access.

The UI uses the Day21 read-only API boundary:

- `scripts/app/api_boundary/crop_cycle_read_api_boundary.ts`

## Created UI routes

- `/`
- `/crop-cycles`
- `/crop-cycles/[cropCycleId]`

## Read-only policy

The UI is read-only.

Not added:

- Server Actions
- client mutation
- form action
- POST / PUT / PATCH / DELETE API routes
- edit UI
- archive UI
- approve / reject UI

UI code does not contain direct SQL.

DB reads are performed through the Day21 read-only boundary module.

## Raw text policy

Day22 does not display `document_extractions.extracted_text`.

Day22 does not use `includeRawText=true`.

Day22 does not add a raw text display button.

Future raw text access should be owner/admin only, role-gated, and audited.

## Verification

`pnpm run test-crop-cycle-read-api-boundary` passed.

`pnpm run build` passed.

Next.js routes:

- `/` static
- `/crop-cycles` dynamic
- `/crop-cycles/[cropCycleId]` dynamic

HTTP verification passed for:

- `/`
- `/crop-cycles`
- `/crop-cycles/2`
- `/crop-cycles/999999`

Confirmed:

- list page showed ブロッコリー / ピクセル / A圃場
- detail page showed provenance
- detail page showed facts id 4..9 only
- rejected fact id 10 was not displayed
- unreviewed fact id 11 was not displayed
- `raw_text_included=false`
- `writes_performed=false`
- `app_schema_write_allowed=false`

## Safety SQL

Confirmed `app.crop_cycles` was unchanged.

Confirmed `knowledge.extracted_facts` was unchanged.

## Backup / restore_test

Backup created:

- `backups/farmos_core_day22_20260704_081940.dump`

Restore test confirmed:

- crop_cycle_id=2
- crop=ブロッコリー
- variety=ピクセル
- field_name=A圃場
- source_extracted_fact_ids={4,5,6,7,8,9}
- apply_plan_status=reviewed
- approved_for_app_apply=true
- archived=false

Restore test database was dropped.

## Result

Day22 successfully added a safe read-only Crop Cycle UI foundation.

Commit message:

- `feat: add crop cycle readonly ui foundation`
