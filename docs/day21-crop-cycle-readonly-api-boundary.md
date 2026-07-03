# Day21 Crop Cycle Read-only API Boundary Foundation

## Purpose

Day21 adds a read-only API boundary foundation for Crop Cycle data.

Day19 created the Crop Cycle read-only list view / CLI.

Day20 created the Crop Cycle provenance detail CLI.

Day21 extracts those read behaviors into a reusable API boundary module for a future Next.js UI or API route.

## Scope

Implemented:

- Crop Cycle list read model
- Crop Cycle provenance detail read model
- Default-hidden raw extracted text
- Explicit includeRawText support
- Function-level test CLI
- Read-only transaction boundary
- API-like response shape aligned with Day19 / Day20 CLI output

Not implemented:

- Next.js UI
- Next.js Route Handler
- POST / PUT / PATCH / DELETE API
- Edit API
- Archive API
- AI proposal inbox integration
- Hermes / OpenClaw / n8n / Paperless integration
- Order intake DB
- Shipment allocation DB
- Role-based access control tables
- External exposure
- Port forwarding

## Created Files

- scripts/app/api_boundary/crop_cycle_read_api_boundary.ts
- scripts/app/test_crop_cycle_read_api_boundary.ts
- docs/day21-crop-cycle-readonly-api-boundary.md

Modified:

- package.json

## Repository Structure Decision

The repository does not yet contain a Next.js src/ or app/ structure.

Therefore, Day21 does not create route handlers.

Day21 remains at the read model / API boundary module layer.

This keeps the boundary reusable for a future Next.js route without prematurely creating UI framework structure.

## API Boundary Module

Main module:

- scripts/app/api_boundary/crop_cycle_read_api_boundary.ts

Exported functions:

- listCropCycleReadModel()
- showCropCycleProvenanceReadModel({ cropCycleId, includeRawText })

All reads are wrapped in a read-only PostgreSQL transaction:

- begin read only

The boundary confirms transaction_read_only and returns it in read_boundary.

## List Response Shape

The list read model returns:

- result
- count
- crop_cycles
- read_boundary

The list reads from:

- app.crop_cycles_with_provenance

The read_boundary confirms:

- mode = read_only_api_boundary
- writes_performed = false
- app_schema_write_allowed = false

## Detail Response Shape

The detail read model returns:

- result
- crop_cycle
- source_document
- document_extraction
- facts
- projection_candidate
- apply_plan
- trace
- read_boundary

The detail read model reads:

- app.crop_cycles
- knowledge.source_documents
- knowledge.document_extractions
- knowledge.extracted_facts
- knowledge.projection_candidates
- knowledge.app_projection_apply_plans

Only verified and non-rejected facts are returned.

## Raw Extracted Text Policy

Default behavior:

- document_extractions.extracted_text is not returned
- extracted_text_length is returned

Explicit behavior:

- includeRawText=true returns document_extractions.extracted_text
- read_boundary.raw_text_included=true is returned

Future policy:

- Raw extracted text access should be restricted to owner/admin-equivalent roles
- Day21 does not implement full role enforcement yet

## Error Response

Invalid cropCycleId returns:

- result = error
- message = crop_cycle_id must be a positive integer

Missing crop cycle returns:

- result = not_found
- crop_cycle_id = requested id

## Test CLI

Package script:

- test-crop-cycle-read-api-boundary

Execution:

- pnpm run test-crop-cycle-read-api-boundary

Confirmed checks:

- list result is ok
- list count is 1
- detail result is ok
- detail crop cycle id is 2
- detail facts are 4,5,6,7,8,9
- default raw text is hidden
- includeRawText=true includes raw text
- not_found response works
- bad_request response works
- writes_performed is false
- app_schema_write_allowed is false

## Safety Notes

Day21 does not create write paths.

No API handlers were created for:

- POST
- PUT
- PATCH
- DELETE

No business values were changed in:

- app.crop_cycles
- knowledge.extracted_facts
- knowledge.document_extractions
- knowledge.source_documents
- knowledge.projection_candidates
- knowledge.app_projection_apply_plans

No broad grants were added.

No app schema write access was added.

## Backup / Restore Test

Day21 performs a backup and restore test to confirm the read model still works against a restored database.

Backup path format:

- backups/farmos_core_day21_YYYYMMDD_HHMMSS.dump

Restore test database:

- farmos_core_restore_test

## Commit

Commit message:

- feat: add crop cycle readonly api boundary

The exact final commit hash is verified by the final git log.
