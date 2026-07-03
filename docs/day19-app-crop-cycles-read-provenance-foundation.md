# Day19: App Crop Cycles Read / Provenance Foundation

## Theme

App Crop Cycles Read / Provenance Foundation

## Goals

- Normalize duplicate provenance ids in app.crop_cycles.source_extracted_fact_ids.
- Prevent future mixed string/number provenance id duplication in scripts/ingest/apply_crop_cycle_apply_plan.ts.
- Create a read-only provenance view for app.crop_cycles.
- Add a read-only CLI for listing crop cycles with provenance.
- Keep AI roles read-only for app business truth.

## Completed Changes

### 1. Normalized existing crop cycle provenance

app.crop_cycles.source_extracted_fact_ids for source_apply_plan_id = 1 was normalized.

Before: {4,5,5,6,7,8,9}

After: {4,5,6,7,8,9}

This did not change business values such as crop, variety, field, sowing date, or transplant date.

### 2. Added provenance read view

Created view:

- app.crop_cycles_with_provenance

The view joins:

- app.crop_cycles
- knowledge.source_documents
- knowledge.document_extractions
- knowledge.app_projection_apply_plans
- knowledge.projection_candidates

The view allows operators and read-only AI roles to inspect where each app crop cycle came from.

Granted SELECT on the view to:

- farmos_app_local
- farmos_ai_readonly_local
- farmos_ai_proposal_local

No app write permission was added to AI roles.

### 3. Hardened apply CLI provenance id normalization

Updated:

- scripts/ingest/apply_crop_cycle_apply_plan.ts

The apply CLI now normalizes source fact ids by:

- accepting number or numeric string values
- converting them to integers
- dropping null, empty, non-integer, or invalid values
- deduplicating after number conversion
- sorting ascending before insertion

This prevents mixed string and number values from becoming duplicate provenance ids.

### 4. Added read-only list CLI

Created:

- scripts/app/list_crop_cycles.ts

Added package script:

- pnpm run list-crop-cycles

Supported options:

- --include-archived
- --crop <crop>
- --field-name <field_name>

The CLI only SELECTs from app.crop_cycles_with_provenance.

## Safety Notes

- No DELETE was used.
- No source document was modified.
- No document extraction was modified.
- No extracted fact was modified.
- No projection candidate payload was modified.
- No apply plan payload was modified.
- No AI role was granted app write access.
- No secrets should be committed.

## Expected Current Crop Cycle

- crop_cycle_id: 2
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
