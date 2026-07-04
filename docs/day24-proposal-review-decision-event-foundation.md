# Day24 Proposal Review Decision Event Foundation

## Purpose

Day24 added a Human in the Loop proposal review decision event foundation.

The purpose is to record human review decisions for AI proposals as append-only audit events.

Day24 review decisions do not apply business changes.

## Start state

Day24 started from:

- `9d23ca8 feat: add proposal inbox readonly ui foundation`
- `ai.proposal_inbox` had 1 pending proposal.
- `app.crop_cycles` had 1 crop cycle.
- `farmos_app_local` app schema write permissions were expected to remain disabled.

Existing audit schema contained:

- `audit.knowledge_feedback`

Day24 created a dedicated table instead of reusing existing audit tables because proposal review decisions need a proposal-specific append-only event log with a direct foreign key to `ai.proposal_inbox`.

## Non-goals

Day24 does not:

- update `app.crop_cycles`
- update any app schema business values
- update `ai.proposal_inbox.status`
- update `ai.proposal_inbox.reviewed_by`
- update `ai.proposal_inbox.reviewed_at`
- update `ai.proposal_inbox.review_note`
- update `ai.proposal_inbox.applied_by`
- update `ai.proposal_inbox.applied_at`
- apply proposals
- delete proposals
- add approve / reject / apply UI
- add POST / PUT / PATCH / DELETE API routes
- add Server Actions
- introduce Hermes / OpenClaw / n8n / Paperless

## Created files

- `scripts/sql/day24_proposal_review_decision_event_foundation.sql`
- `scripts/app/api_boundary/proposal_review_decision_event_api_boundary.ts`
- `scripts/app/test_proposal_review_decision_event_api_boundary.ts`
- `scripts/app/record_proposal_review_decision_event.ts`
- `docs/day24-proposal-review-decision-event-foundation.md`

## Modified files

- `package.json`

## Database foundation

Day24 created:

- `audit.proposal_review_decision_events`
- `audit.proposal_review_decision_latest`

## Event table

`audit.proposal_review_decision_events` records human review decisions for `ai.proposal_inbox`.

Allowed `decision_type` values:

- `approve_review`
- `reject_review`
- `request_revision`
- `defer_review`

Important semantics:

- `approve_review` does not mean app schema application.
- `reject_review` does not delete the proposal.
- `request_revision` does not update proposal status.
- Day24 only records an audit event.

## Latest view

`audit.proposal_review_decision_latest` returns the latest review decision per proposal using `distinct on (proposal_id)`.

## Permissions

`farmos_app_local` was granted:

- `SELECT` on `ai.proposal_inbox`
- `SELECT, INSERT` on `audit.proposal_review_decision_events`
- `SELECT` on `audit.proposal_review_decision_latest`

`farmos_app_local` was explicitly denied:

- app schema INSERT / UPDATE / DELETE / TRUNCATE
- ai schema INSERT / UPDATE / DELETE / TRUNCATE
- ai schema sequence usage/update

Final verified permission state:

```text
app.crop_cycles                       | SELECT true | INSERT false | UPDATE false | DELETE false | TRUNCATE false
ai.proposal_inbox                     | SELECT true | INSERT false | UPDATE false | DELETE false | TRUNCATE false
audit.proposal_review_decision_events | SELECT true | INSERT true  | UPDATE false | DELETE false | TRUNCATE false
```

## Boundary behavior

Created boundary:

- `recordProposalReviewDecisionEvent(input)`
- `listProposalReviewDecisionEventsReadModel({ proposalId })`

`recordProposalReviewDecisionEvent`:

- validates UUID input
- validates `decision_type`
- validates required human decision fields
- checks proposal existence
- inserts into audit event table
- rolls back by default unless `commit: true`
- never updates app schema
- never updates `ai.proposal_inbox`

## CLI behavior

Created CLI:

```bash
pnpm run record-proposal-review-decision-event -- \
  --proposal-id 24fc24ee-8efa-436b-8424-9703edeeb297 \
  --decision-type approve_review \
  --decided-by hayate \
  --decided-by-role owner \
  --decision-note "Reviewed as Day24 dry-run. This is not committed." \
  --decision-source local_cli
```

Default behavior is dry-run.

Only `--commit` persists an audit event.

Day24 validation used dry-run only.

## Test result

Command:

```bash
pnpm run test-proposal-review-decision-event-boundary
```

Result:

```json
{
  "result": "ok",
  "checks": {
    "valid_dry_run_result": "ok",
    "committed": false,
    "writes_attempted": true,
    "writes_committed": false,
    "app_schema_write_allowed": false,
    "ai_proposal_write_allowed": false,
    "invalid_uuid_result": "bad_request",
    "invalid_decision_type_result": "bad_request",
    "missing_proposal_result": "proposal_not_found",
    "proposal_count_before": "1",
    "proposal_count_after": "1",
    "event_count_before": "0",
    "event_count_after": "0",
    "crop_cycles_unchanged": true,
    "proposal_status_unchanged": true,
    "proposal_review_fields_unchanged": true,
    "proposal_apply_fields_unchanged": true
  }
}
```

## CLI dry-run result

Command:

```bash
pnpm run record-proposal-review-decision-event -- \
  --proposal-id 24fc24ee-8efa-436b-8424-9703edeeb297 \
  --decision-type approve_review \
  --decided-by hayate \
  --decided-by-role owner \
  --decision-note "Reviewed as Day24 dry-run. This is not committed." \
  --decision-source local_cli
```

Result:

- `result=ok`
- `committed=false`
- `writes_attempted=true`
- `writes_committed=false`
- `app_schema_write_allowed=false`
- `ai_proposal_write_allowed=false`

The returned event id was produced inside the rolled-back transaction and was not persisted.

## Build result

Command:

```bash
pnpm run build
```

Result:

```text
Build succeeded.

Next.js 16.2.10 with Turbopack:
- Compiled successfully
- TypeScript finished successfully
- Static routes:
  - /
  - /_not-found
- Dynamic SSR routes:
  - /crop-cycles
  - /crop-cycles/[cropCycleId]
  - /proposals
  - /proposals/[proposalId]
```

## Safety results

Day24 must verify:

- `app.crop_cycles` business values were not changed
- `ai.proposal_inbox` status / review / apply fields were not changed
- dry-run did not increase audit event count
- app schema write permissions were not added
- ai proposal write permissions were removed and not re-added

Current verified safety status:

```text
Verified OK.

app.crop_cycles:
- id=2
- source_extracted_fact_ids={4,5,6,7,8,9}
- crop=ブロッコリー
- variety=ピクセル
- field_name=A圃場
- sowing_date_text=9/20
- transplant_date_text=11/15
- archived=false

ai.proposal_inbox:
- id=24fc24ee-8efa-436b-8424-9703edeeb297
- proposal_type=day3_permission_test
- title=Day3 AI proposal permission test
- status=pending
- reviewed_by empty
- reviewed_at empty
- review_note empty
- applied_by empty
- applied_at empty

audit.proposal_review_decision_events:
- count=0

No app schema business value was changed.
No ai.proposal_inbox review/apply/status field was changed.
Dry-run did not persist audit events.
```

## Backup / restore_test

Day24 backup path:

```text
backups/farmos_core_day24_20260704_123918.dump
```

Backup size:

```text
99K
```

Restore test must verify:

- `audit.proposal_review_decision_events` exists
- `ai.proposal_inbox` restores
- `app.crop_cycles_with_provenance` restores
- restore test database was removed after verification

Restore test result:

```text
Verified OK.

restore_test verified:
- audit.proposal_review_decision_events exists
- proposal_review_decision_event_count=0
- ai.proposal_inbox proposal_count=1
- app.crop_cycles_with_provenance restored crop_cycle_id=2
- crop=ブロッコリー
- variety=ピクセル
- field_name=A圃場
- source_extracted_fact_ids={4,5,6,7,8,9}
- apply_plan_status=reviewed
- approved_for_app_apply=true
- archived=false

restore_test database was dropped successfully.
```

## Commit

Target commit message:

```text
feat: add proposal review decision event foundation
```
