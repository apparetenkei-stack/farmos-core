# Day33 Proposal Review Apply Plan Preview Boundary

## Purpose

Day33 adds a read-only, CLI-only preview boundary for proposal review apply planning.

The boundary answers one question:

> If this approved and ready proposal were applied in the future, what would it plan to insert or update in `app.crop_cycles`?

Day33 is not an apply execution day.

## Scope

Day33 creates:

- `scripts/app/api_boundary/proposal_review_apply_plan_preview_read_api_boundary.ts`
- `scripts/app/preview_proposal_review_apply_plan.ts`
- `scripts/app/test_proposal_review_apply_plan_preview_read_api_boundary.ts`

Day33 also adds package scripts:

- `preview-proposal-review-apply-plan`
- `test-proposal-review-apply-plan-preview-read-api-boundary`

Day33 extends the Day32 readiness supported proposal types with:

- `day33_apply_plan_preview_test`

## Safety boundary

The Day33 boundary is read-only.

It does not:

- insert into `app.crop_cycles`
- update `app.crop_cycles`
- delete from `app.crop_cycles`
- truncate `app.crop_cycles`
- update `ai.proposal_inbox.status`
- update `ai.proposal_inbox.reviewed_by`
- update `ai.proposal_inbox.reviewed_at`
- update `ai.proposal_inbox.review_note`
- update `ai.proposal_inbox.applied_by`
- update `ai.proposal_inbox.applied_at`
- execute app projection apply
- create UI apply actions
- create forms
- create buttons
- create POST / PUT / PATCH / DELETE API routes
- create Server Actions

The CLI rejects `--commit`.

## Boundary flow

1. Validate `proposalId`.
2. Call Day32 `checkProposalReviewApplyReadiness`.
3. Continue only when readiness is `ready`.
4. Read `ai.proposal_inbox.payload_json`.
5. Extract `payload_json.candidate`.
6. Confirm target is `app.crop_cycles`.
7. Compare candidate with existing non-archived `app.crop_cycles`.
8. Return preview JSON.
9. Commit the read-only transaction.
10. Perform no writes.

## Matching policy

Day33 uses this exact no-op match:

- `crop`
- `variety`
- `field_name`
- `sowing_date_text`
- `transplant_date_text`
- `archived = false`

When there is an exact match, the operation is:

- `no_op_candidate`

When there is no exact match but there is a crop / variety / field match, the operation is:

- `update_candidate`

When there is no matching row, the operation is:

- `insert_candidate`

Day33 does not execute any of these operations. It only previews them.

## Preview response

The boundary returns:

- proposal metadata
- readiness summary
- preview-only marker
- target schema and table
- operation
- candidate row
- matched existing rows
- diff
- blocked reasons
- SQL preview flags
- safety boundary flags

Important flags:

- `preview_only: true`
- `writes_performed: false`
- `commands_executed: false`
- `app_schema_write_allowed: false`
- `app_projection_apply_performed: false`
- `ai_proposal_apply_marker_updated: false`

## CLI

Example:

    pnpm run preview-proposal-review-apply-plan -- \
      --proposal-id <proposal-id>

Forbidden:

    pnpm run preview-proposal-review-apply-plan -- \
      --proposal-id <proposal-id> \
      --commit

The forbidden command returns `bad_request`.

## Completion notes

Day33 is complete when:

- no-op preview is confirmed
- insert preview is confirmed
- blocked preview is confirmed
- pending existing target proposal remains pending
- `app.crop_cycles` remains unchanged
- proposal applied markers remain unchanged
- regression tests pass
- build passes
- backup / restore test passes
- git status is clean after commit
