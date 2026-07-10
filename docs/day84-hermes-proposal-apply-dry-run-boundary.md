# Day84 Hermes Proposal Apply Dry-run Boundary

## Theme

Hermes Proposal Apply Dry-run Boundary.

## Critical schema finding

`audit.proposal_review_apply_events` stores committed apply events only.

The existing DB constraints require:

- `dry_run = false`
- `committed = true`
- `result = applied`
- `ai_proposal_apply_marker_updated = true`

Therefore Day84 must not insert a dry-run row into `audit.proposal_review_apply_events`.

## Day84 behavior

- Evaluate apply feasibility as a dry-run.
- Return a dry-run event candidate in the response.
- Persist no dry-run apply event.
- Keep `audit.proposal_review_apply_events` unchanged.
- Keep `ai.proposal_inbox` unchanged.
- Keep `app.*` unchanged.

## Safety flags

- `dry_run_evaluated = true`
- `dry_run_event_persisted = false`
- `proposal_inbox_updated = false`
- `proposal_apply_ready = false`
- `proposal_apply_performed = false`
- `committed_apply_event_created = false`
- `confirmation_token_created = false`
- `audit_apply_event_created = false`
- `app_db_write_performed = false`
- `app_schema_write_performed = false`

## API boundary

- Route: `POST /api/hermes/proposal-apply-dry-run`
- Default state: disabled.
- Enable flag: `HERMES_PROPOSAL_APPLY_DRY_RUN_API_BOUNDARY_ENABLED=true`
- Allowed body key: `proposalId` only.

## Verification

- Day83 review decision idempotency remains OK.
- Day84 dry-run service returns OK.
- Day84 dry-run API returns OK.
- Build passes.
- Apply history count remains unchanged.
- Day84 persisted dry-run count remains zero.
