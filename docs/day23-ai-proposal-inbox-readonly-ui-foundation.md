# Day23 AI Proposal Inbox Read-only UI Foundation

## Theme

AI Proposal Inbox Read-only UI Foundation.

Day23 added a read-only UI foundation for ai.proposal_inbox in the existing Next.js App Router UI.

No approve, reject, apply, archive, edit, mutation, POST, PUT, PATCH, DELETE, or Server Action path was added.

## Starting point

Day22 HEAD:

8f2f351 feat: add crop cycle readonly ui foundation

Initial state:

- git status --short was clean.
- Docker services were running:
  - PostgreSQL 17
  - Redis 8
  - MinIO
  - Qdrant
- Existing Next.js App Router files were present.
- src/app/crop-cycles/... existed.

## ai.proposal_inbox schema observed

ai.proposal_inbox uses UUID primary keys.

Observed columns:

| column | type | nullable | default |
|---|---:|---:|---|
| id | uuid | no | gen_random_uuid() |
| proposal_type | text | no | |
| title | text | no | |
| body | text | no | |
| payload_json | jsonb | no | '{}'::jsonb |
| source_refs_json | jsonb | no | '[]'::jsonb |
| model_name | text | yes | |
| agent_name | text | yes | |
| confidence | numeric(4,3) | yes | |
| reason | text | yes | |
| risk_level | text | no | 'low'::text |
| status | text | no | 'pending'::text |
| reviewed_by | text | yes | |
| reviewed_at | timestamptz | yes | |
| review_note | text | yes | |
| applied_at | timestamptz | yes | |
| applied_by | text | yes | |
| created_at | timestamptz | no | now() |
| updated_at | timestamptz | no | now() |

Observed constraints:

- confidence must be null or between 0 and 1.
- risk_level must be one of low, medium, high, critical.
- status must be one of pending, approved, rejected, needs_revision, applied, expired.

## Initial proposal data

Initial ai.proposal_inbox count:

proposal_count_before = 1

Observed proposal:

- id = 24fc24ee-8efa-436b-8424-9703edeeb297
- proposal_type = day3_permission_test
- title = Day3 AI proposal permission test
- status = pending
- risk_level = low
- model_name = manual-test
- agent_name = psql
- confidence = 0.900

## App role permission hardening

Before Day23 hardening, farmos_app_local had write privileges on app.crop_cycles:

- can_select = true
- can_insert = true
- can_update = true
- can_delete = false
- can_truncate = false

Day23 hardened the UI app role to be read-only against the app schema.

Applied SQL file:

scripts/sql/day23_app_role_readonly_hardening.sql

Applied permission changes:

- revoke insert, update, delete, truncate on all tables in schema app from farmos_app_local
- revoke usage, update on all sequences in schema app from farmos_app_local
- grant usage on schema app to farmos_app_local
- grant select on all tables in schema app to farmos_app_local
- grant usage on schema ai to farmos_app_local
- grant select on ai.proposal_inbox to farmos_app_local

Final farmos_app_local app table privileges:

app.crop_cycles:

- can_select = true
- can_insert = false
- can_update = false
- can_delete = false
- can_truncate = false

This is a Day23 safety hardening. It does not grant app schema write access.

## Created files

- scripts/app/api_boundary/proposal_inbox_read_api_boundary.ts
- scripts/app/test_proposal_inbox_read_api_boundary.ts
- scripts/sql/day23_app_role_readonly_hardening.sql
- src/app/proposals/page.tsx
- src/app/proposals/[proposalId]/page.tsx
- docs/day23-ai-proposal-inbox-readonly-ui-foundation.md

## Modified files

- src/app/layout.tsx
- src/app/page.tsx
- package.json

## Package scripts added

- test-proposal-inbox-read-api-boundary = tsx scripts/app/test_proposal_inbox_read_api_boundary.ts
- check-proposal-inbox-read-ui = next build

Existing scripts were not overwritten.

## Read-only API boundary

Boundary module:

scripts/app/api_boundary/proposal_inbox_read_api_boundary.ts

Exports:

- listProposalInboxReadModel()
- showProposalInboxReadModel({ proposalId })

Boundary behavior:

- Uses pg.
- Uses begin read only.
- Commits on success.
- Rolls back on error.
- Does not issue INSERT, UPDATE, DELETE, UPSERT, TRUNCATE, or DDL.
- Returns safe error results instead of mutating state.
- Treats non-UUID proposalId as bad_request, because ai.proposal_inbox.id is uuid.
- Treats missing valid UUID as not_found.

Read boundary result:

- mode = proposal_inbox_read_only_api_boundary
- db_user = farmos_app_local
- transaction_read_only = true
- writes_performed = false
- app_schema_write_allowed = false

## Boundary test result

Command:

pnpm run test-proposal-inbox-read-api-boundary

Result:

proposal inbox read-only boundary tests passed

Confirmed:

- list result = ok
- proposal count = 1
- existing proposal detail = ok
- missing valid UUID = not_found
- invalid id 999999 = bad_request
- transaction_read_only = true
- writes_performed = false
- app_schema_write_allowed = false

## UI routes

Added routes:

- /proposals
- /proposals/[proposalId]

Both route files declare:

- dynamic = force-dynamic
- runtime = nodejs

Build result confirms:

- /proposals is Dynamic SSR
- /proposals/[proposalId] is Dynamic SSR

## /proposals UI

The list page shows:

- AI Proposal Inbox
- read-only notice
- proposal count
- list table
- detail links
- read boundary

It does not include:

- approve button
- reject button
- apply button
- archive button
- edit button
- form
- client mutation
- Server Action
- POST, PUT, PATCH, or DELETE route

## /proposals/[proposalId] UI

The detail page shows:

- proposal id
- proposal_type
- title
- body
- reason
- status
- risk_level
- confidence
- model_name
- agent_name
- review fields
- applied fields
- payload_json
- source_refs_json
- read boundary

JSON fields are displayed in pre blocks and are not editable.

It does not include:

- approve button
- reject button
- apply button
- archive button
- edit button
- form
- client mutation
- Server Action
- POST, PUT, PATCH, or DELETE route

## Not found and bad request behavior

Because ai.proposal_inbox.id is uuid:

- /proposals/00000000-0000-0000-0000-000000000000 returns a read-only not_found screen.
- /proposals/999999 returns a read-only bad_request screen.

## Build result

Command:

pnpm run build

Result:

Compiled successfully.

Routes:

- / static
- /_not-found static
- /crop-cycles dynamic
- /crop-cycles/[cropCycleId] dynamic
- /proposals dynamic
- /proposals/[proposalId] dynamic

## HTTP check result

Dev server was bound to:

http://127.0.0.1:3000

Confirmed:

- / returned 200.
- /proposals returned 200.
- /proposals/24fc24ee-8efa-436b-8424-9703edeeb297 returned 200.
- /proposals/00000000-0000-0000-0000-000000000000 returned 200.
- /proposals/999999 returned 200.

Confirmed UI text includes:

- FarmOS Core
- AI Proposal Inbox
- read-only
- proposal_count
- writes_performed
- app_schema_write_allowed
- payload_json
- source_refs_json

## Safety SQL result

app.crop_cycles remained unchanged:

- id = 2
- source_extracted_fact_ids = {4,5,6,7,8,9}
- crop = ブロッコリー
- variety = ピクセル
- field_name = A圃場
- sowing_date_text = 9/20
- transplant_date_text = 11/15
- archived = false

ai.proposal_inbox count after:

proposal_count_after = 1

This matches the start count, so Day23 did not create or update proposals.

Final app role privilege check:

app.crop_cycles:

- can_select = true
- can_insert = false
- can_update = false
- can_delete = false
- can_truncate = false

## Backup / restore test

Backup was created:

backups/farmos_core_day23_20260704_083611.dump

Restore test result:

- farmos_core_restore_test was recreated.
- pg_restore completed successfully.
- ai.proposal_inbox restored with proposal_count = 1.
- app.crop_cycles_with_provenance restored successfully.
- Restored crop cycle remained:
  - crop_cycle_id = 2
  - crop = ブロッコリー
  - variety = ピクセル
  - field_name = A圃場
  - source_extracted_fact_ids = {4,5,6,7,8,9}
  - apply_plan_status = reviewed
  - approved_for_app_apply = true
  - archived = false
- farmos_core_restore_test was dropped after verification.

## Explicitly not done

Day23 did not add:

- POST API
- PUT API
- PATCH API
- DELETE API
- Server Actions
- client mutation
- approve UI
- reject UI
- apply UI
- archive UI
- edit UI
- seed INSERT
- app schema write path
- Hermes
- OpenClaw
- n8n
- Paperless
- order intake DB
- shipment allocation DB
- role policy DB
- external publish
- Tailscale publish
- port forwarding

## Commit

Commit message:

feat: add proposal inbox readonly ui foundation

Final commit hash is recorded by git log --oneline -8 after commit.
