# Day27 Proposal Review Timeline List Summary

## Purpose

Day27 improved the read-only review decision display experience for AI proposals.

Scope:

- Polish the `/proposals/[proposalId]` Review Decision Events section into a timeline-style display.
- Add latest review decision summary to the `/proposals` list view.
- Keep all UI and read boundaries read-only.
- Confirm the Day26 `defer_review` event is visible from both list and detail views.
- Do not append new review events.
- Do not update proposal status or app projection data.

## Baseline

Starting commit:

- `d70bb1d test: add proposal review event append verification`

Existing Day26 event:

- event_id: `6d749f3c-6dbc-4ff9-995e-aefed3b0663b`
- proposal_id: `24fc24ee-8efa-436b-8424-9703edeeb297`
- decision_type: `defer_review`
- decided_by: `hayate`
- decided_by_role: `owner`
- decision_source: `local_cli`
- event_metadata.purpose: `proposal_review_event_append_ui_smoke`

## Files changed

Created:

- `scripts/app/api_boundary/proposal_review_latest_summary_read_api_boundary.ts`
- `scripts/app/test_proposal_review_latest_summary_read_api_boundary.ts`
- `docs/day27-proposal-review-timeline-list-summary.md`

Modified:

- `src/app/proposals/page.tsx`
- `src/app/proposals/[proposalId]/page.tsx`
- `package.json`

## New read boundary

Added:

- `listProposalReviewLatestSummariesReadModel()`

Read source:

- `ai.proposal_inbox`
- `audit.proposal_review_decision_latest`

Boundary behavior:

- Runs inside `begin transaction read only`
- Returns `writes_performed: false`
- Confirms `app_schema_write_allowed: false`
- Confirms `ai_proposal_write_allowed: false`
- Reports `audit_event_write_allowed: true` as an existing Day24 CLI capability, but Day27 boundary itself performs no write

## Proposal list UI

`/proposals` now displays latest review decision summary for each proposal.

Displayed fields include:

- latest decision label
- internal decision_type
- latest_event_id
- decided_at
- decided_by
- decision_source
- shortened decision_note
- event_metadata.purpose

For the existing proposal, the list displays:

- proposal_id: `24fc24ee-8efa-436b-8424-9703edeeb297`
- latest_event_id: `6d749f3c-6dbc-4ff9-995e-aefed3b0663b`
- decision_type: `defer_review`
- decision label: `保留ログ`
- event_metadata.purpose: `proposal_review_event_append_ui_smoke`

## Proposal detail UI

`/proposals/[proposalId]` Review Decision Events section now displays:

- Latest review decision card
- Review decision timeline
- Review decision history
- Review decision read boundary

The internal value `defer_review` remains visible while also showing the human-readable label `保留ログ`.

## Tests

Passed:

- `pnpm run test-proposal-review-decision-read-api-boundary`
- `pnpm run test-proposal-review-latest-summary-read-api-boundary`
- `pnpm run test-proposal-inbox-read-api-boundary`
- `pnpm run build`

Build result:

- `/proposals`: Dynamic SSR
- `/proposals/[proposalId]`: Dynamic SSR

`next-env.d.ts` had no diff after build.

## UI curl verification

`/proposals` displayed:

- `AI Proposal Inbox`
- `Latest review decision`
- `defer_review`
- `Day26 UI smoke test only`
- `proposal_review_event_append_ui_smoke`
- `24fc24ee-8efa-436b-8424-9703edeeb297`
- `Latest review summary read boundary`

`/proposals/24fc24ee-8efa-436b-8424-9703edeeb297` displayed:

- `AI Proposal detail`
- `Review Decision Events`
- `Latest review decision`
- `Review decision timeline`
- `Review decision history`
- `defer_review`
- `Day26 UI smoke test only`
- `proposal_review_event_append_ui_smoke`
- `6d749f3c-6dbc-4ff9-995e-aefed3b0663b`

Rendered HTML mutation grep was empty for:

- `<form`
- `<button`
- `method="post"`
- `method='post'`

## Safety SQL results

Confirmed after Day27 UI/read-boundary work:

`app.crop_cycles` remained unchanged:

- id: `2`
- crop: `ブロッコリー`
- variety: `ピクセル`
- field_name: `A圃場`
- sowing_date_text: `9/20`
- transplant_date_text: `11/15`
- archived: `false`

`ai.proposal_inbox` remained unchanged:

- proposal_id: `24fc24ee-8efa-436b-8424-9703edeeb297`
- proposal_type: `day3_permission_test`
- title: `Day3 AI proposal permission test`
- status: `pending`
- reviewed_by: null
- reviewed_at: null
- review_note: null
- applied_by: null
- applied_at: null

`audit.proposal_review_decision_events` count remained:

- `1`

`farmos_app_local` privileges:

- `app.crop_cycles`: SELECT true, INSERT false, UPDATE false, DELETE false, TRUNCATE false
- `ai.proposal_inbox`: SELECT true, INSERT false, UPDATE false, DELETE false, TRUNCATE false
- `audit.proposal_review_decision_events`: SELECT true, INSERT true, UPDATE false, DELETE false, TRUNCATE false

## Backup and restore test

Backup path:

- `backups/farmos_core_day27_20260704_181111.dump`

Restore test confirmed:

- `audit.proposal_review_decision_events` count = `1`
- `audit.proposal_review_decision_latest` still showed `defer_review` for proposal `24fc24ee-8efa-436b-8424-9703edeeb297`

Restore test database was dropped after verification.

## Read-only policy

Day27 did not:

- modify `app.crop_cycles`
- modify `ai.proposal_inbox.status`
- modify `ai.proposal_inbox.reviewed_by`
- modify `ai.proposal_inbox.reviewed_at`
- modify `ai.proposal_inbox.review_note`
- modify `ai.proposal_inbox.applied_by`
- modify `ai.proposal_inbox.applied_at`
- append a new `audit.proposal_review_decision_events` event
- create UI action controls
- create forms
- create buttons
- create Server Actions
- create POST / PUT / PATCH / DELETE API routes

## Next candidate

Day28 candidate:

- Proposal Review Decision Command UI Design Draft + Non-Mutating Preview

Day28 should still avoid actual mutation unless explicitly selected after review.
