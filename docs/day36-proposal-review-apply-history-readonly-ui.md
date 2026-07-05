# Day36 Proposal Review Apply History Read-only UI Foundation

## Theme

Proposal Review Apply History Read-only UI Foundation.

Day36 adds read-only UI visibility for committed Proposal Review Apply history created by the Day35 observability foundation.

## Scope

Day36 adds only read-only observability.

It does not add:

- apply button
- approve form
- apply form
- Server Actions
- POST route
- PUT route
- PATCH route
- DELETE route
- mutation API handler
- Hermes runtime
- LLM runtime
- router implementation
- automatic apply
- bypass of human approval

## UI routes

Added route:

- `/proposals/apply-history`

Updated route:

- `/proposals/[proposalId]`

## `/proposals/apply-history`

The route lists committed apply history from `audit.proposal_review_apply_events`.

Displayed fields include:

- created_at
- proposal id
- proposal title
- proposal status
- apply_operation
- result
- committed
- dry_run
- app_projection_apply_performed
- ai_proposal_apply_marker_updated
- inserted_crop_cycle_id
- applied_by
- applied_by_role
- apply_source

The page states that dry-run previews are not stored in apply history.

## Proposal detail page

The proposal detail page now includes an Apply History Events section filtered by the current proposal id.

When no committed apply history exists for a proposal, the UI shows:

- `No committed apply history.`

The section exposes no write controls.

## Read boundary

The UI uses the existing Day35 boundary:

- `scripts/app/api_boundary/proposal_review_apply_history_read_api_boundary.ts`

Boundary properties:

- read-only transaction
- no commands executed
- no writes performed

## UI boundary test

Added test:

- `scripts/app/test_proposal_review_apply_history_readonly_ui_boundary.ts`

Added package script:

- `test-proposal-review-apply-history-readonly-ui-boundary`
- `check-proposal-review-apply-history-ui`

The test verifies:

- app role can read apply history
- apply history count does not change
- protected proposal remains pending
- `app.crop_cycles id=2` remains present
- app role has no write privileges on:
  - `app.crop_cycles`
  - `ai.proposal_inbox`
  - `audit.proposal_review_apply_events`

## Safety constraints

Protected proposal:

- `24fc24ee-8efa-436b-8424-9703edeeb297`

must remain:

- `pending`

Crop cycle fixture:

- `app.crop_cycles id=2`

must remain present.

Day34 and Day35 fixture rows are retained.
