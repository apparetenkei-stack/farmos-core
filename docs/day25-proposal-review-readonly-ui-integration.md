# Day25 Proposal Review Read-only UI Integration

## Theme

Proposal Review Read-only UI Integration

Day25 integrates the Day24 proposal review decision event foundation into the Next.js App Router UI as a read-only proposal detail view.

Day25 is intentionally read-only. It does not add review actions, mutation routes, Server Actions, mutation forms, or app data application flows.

## Context

Day24 added append-only audit event storage for human proposal review decisions.

Primary objects:

- audit.proposal_review_decision_events
- audit.proposal_review_decision_latest

Decision event types:

- approve_review
- reject_review
- request_revision
- defer_review

Important semantics:

- approve_review is not an app schema apply operation.
- reject_review is not proposal deletion.
- request_revision does not update ai.proposal_inbox.status.
- defer_review is only an audit decision event.
- Day25 only displays these audit events.

## Files added

- scripts/app/api_boundary/proposal_review_decision_read_api_boundary.ts
- scripts/app/test_proposal_review_decision_read_api_boundary.ts
- docs/day25-proposal-review-readonly-ui-integration.md

## Files changed

- src/app/proposals/[proposalId]/page.tsx
- package.json

## Package scripts added

- test-proposal-review-decision-read-api-boundary
- check-proposal-review-read-ui

## Read boundary

The Day25 read boundary is implemented in:

- scripts/app/api_boundary/proposal_review_decision_read_api_boundary.ts

Exports:

- listProposalReviewDecisionEventsReadModel({ proposalId })
- getLatestProposalReviewDecisionReadModel({ proposalId })

Boundary behavior:

- Uses pg Client.
- Uses begin transaction read only.
- Reads from audit.proposal_review_decision_events.
- Reads from audit.proposal_review_decision_latest.
- Does not write to app.
- Does not write to ai.proposal_inbox.
- Does not insert into audit.proposal_review_decision_events.
- Returns writes_performed: false.
- Returns transaction_read_only: true.
- Validates proposalId as UUID.
- Invalid UUID returns bad_request.

Observed boundary output:

- mode: proposal_review_decision_read_boundary
- db_user: farmos_app_local
- transaction_read_only: true
- writes_performed: false
- app_schema_write_allowed: false
- ai_proposal_write_allowed: false
- audit_event_write_allowed: true

audit_event_write_allowed: true is expected because Day24 intentionally allowed the CLI event boundary to insert audit review events. Day25 still performs no write because it runs in a read-only transaction and has no mutation SQL.

## UI integration

The proposal detail page now displays:

- Review Decision Events
- Latest review decision
- Review decision history
- Review decision read boundary

The UI also displays this explanatory text:

Review decisions are audit events only. They do not apply proposal changes to app data.

When there are no review decision events, the UI displays:

No review decision events recorded yet.

Current Day25 data state has zero review decision events, so this empty state is expected.

## Explicit non-goals

Day25 did not add:

- approve button
- reject button
- apply button
- request revision button
- defer button
- mutation form
- Server Action
- client mutation
- POST API Route
- PUT API Route
- PATCH API Route
- DELETE API Route
- ai.proposal_inbox.status update
- audit.proposal_review_decision_events insert from UI
- app.crop_cycles update
- Hermes
- OpenClaw
- n8n
- Paperless
- order management
- shipment allocation
- permission DB expansion
- external exposure
- Tailscale exposure
- port forwarding

## Verification

### Start state

- HEAD before Day25: bf7fbc4 feat: add proposal review decision event foundation
- Docker services running:
  - PostgreSQL 17
  - Redis 8
  - MinIO
  - Qdrant
- All services remained bound to 127.0.0.1.
- audit.proposal_review_decision_events existed.
- audit.proposal_review_decision_latest existed.
- audit.proposal_review_decision_events count before Day25: 0.
- ai.proposal_inbox had one pending proposal:
  - 24fc24ee-8efa-436b-8424-9703edeeb297

### Boundary test

Command:

pnpm run test-proposal-review-decision-read-api-boundary

Result:

- listProposalReviewDecisionEventsReadModel returned ok.
- events.length = 0.
- latest = null.
- transaction_read_only = true.
- writes_performed = false.
- app_schema_write_allowed = false.
- ai_proposal_write_allowed = false.
- audit_event_write_allowed = true.
- Invalid UUID returned bad_request.
- audit.proposal_review_decision_events count stayed 0.
- ai.proposal_inbox snapshot unchanged.
- app.crop_cycles snapshot unchanged.

### Build

Command:

pnpm run build

Result:

- Next.js build succeeded.
- /proposals is Dynamic SSR.
- /proposals/[proposalId] is Dynamic SSR.

### UI check

Target:

http://127.0.0.1:3000/proposals/24fc24ee-8efa-436b-8424-9703edeeb297

Result:

- HTTP 200.
- Proposal detail displayed.
- Review Decision Events displayed.
- Latest review decision displayed.
- Review decision history displayed.
- Empty state displayed:
  - No review decision events recorded yet.
- No form element was added.
- No button element was added.
- No POST method form was added.

### Safety SQL

Final safety checks confirmed:

app.crop_cycles:

- unchanged

ai.proposal_inbox:

- status = pending
- reviewed_by = null
- reviewed_at = null
- review_note = null
- applied_by = null
- applied_at = null

audit.proposal_review_decision_events:

- count remained 0

farmos_app_local privileges:

app.crop_cycles:

- SELECT: true
- INSERT: false
- UPDATE: false
- DELETE: false
- TRUNCATE: false

ai.proposal_inbox:

- SELECT: true
- INSERT: false
- UPDATE: false
- DELETE: false
- TRUNCATE: false

audit.proposal_review_decision_events:

- SELECT: true
- INSERT: true
- UPDATE: false
- DELETE: false
- TRUNCATE: false

## Day25 conclusion

Day25 successfully connected the Day24 proposal review decision audit event foundation to the Next.js App Router proposal detail UI as a read-only view.

The UI now shows latest review decision state and review decision history, while preserving the core safety boundary:

- no app schema write
- no proposal inbox write
- no audit insert from UI
- no mutation route
- no Server Action
- no mutation form
- no approval/apply controls
