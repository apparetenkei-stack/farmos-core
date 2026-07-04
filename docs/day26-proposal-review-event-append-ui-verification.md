# Day26 Proposal Review Event Append UI Verification

## Purpose

Day26 verified that a human review decision can be appended as an audit-only event and then displayed from the read-only proposal detail UI.

This day intentionally did not apply proposal changes to app data.

## Scope

Day26 performed exactly one committed write:

- append one row to audit.proposal_review_decision_events

Day26 did not perform these actions:

- no write to app.crop_cycles
- no write to ai.proposal_inbox
- no proposal status update
- no review/apply field update
- no UI mutation action
- no Server Action
- no POST / PUT / PATCH / DELETE API Route
- no approve/reject/apply/request_revision/defer button
- no Hermes / OpenClaw / n8n / Paperless integration
- no public exposure or Tailscale exposure

## Appended event

event_id: 6d749f3c-6dbc-4ff9-995e-aefed3b0663b
proposal_id: 24fc24ee-8efa-436b-8424-9703edeeb297
decision_type: defer_review
decision_note: Day26 UI smoke test only. This audit event does not apply proposal changes to app data.
decided_by: hayate
decided_by_role: owner
decision_source: local_cli
decided_at: 2026-07-04T08:34:40.701Z
created_at: 2026-07-04T08:34:40.701Z

Event metadata:

{
  "cli": true,
  "day": "26",
  "purpose": "proposal_review_event_append_ui_smoke",
  "app_write_expected": false,
  "proposal_status_update_expected": false
}

## CLI update

Updated:

- scripts/app/record_proposal_review_decision_event.ts

Change:

- added --event-metadata-json
- kept --commit as the explicit commit gate
- dry-run remains the default when --commit is omitted

This keeps the Day24 append boundary intact while allowing Day26-specific audit metadata to be recorded.

## Dry-run result

A dry-run was executed before the committed append.

Result:

result: ok
committed: false
decision_type: defer_review
db_user: farmos_app_local
writes_attempted: true
writes_committed: false
app_schema_write_allowed: false
ai_proposal_write_allowed: false

After dry-run:

audit.proposal_review_decision_events count = 0

## Committed append result

The committed append was executed once.

Result:

result: ok
committed: true
event_id: 6d749f3c-6dbc-4ff9-995e-aefed3b0663b
decision_type: defer_review
db_user: farmos_app_local
writes_attempted: true
writes_committed: true
app_schema_write_allowed: false
ai_proposal_write_allowed: false

After commit:

audit.proposal_review_decision_events count = 1

audit.proposal_review_decision_latest returned the same event for proposal:

24fc24ee-8efa-436b-8424-9703edeeb297

## Read boundary test update

Updated:

- scripts/app/test_proposal_review_decision_read_api_boundary.ts

Change:

- removed the Day25 fixed assumption that event count must be 0
- removed the Day25 fixed assumption that latest must be null
- allowed both zero-event and one-or-more-event states
- asserted latest exists when events exist
- asserted latest event belongs to the requested proposal
- asserted latest decision type is allowed
- asserted latest and first history event match
- asserted invalid UUID still returns bad_request
- asserted safety snapshots do not change

## Read boundary test result

Command:

pnpm run test-proposal-review-decision-read-api-boundary

Result:

proposal review decision read-only boundary tests passed

Key checks:

event_count: 1
latest.decision_type: defer_review
transaction_read_only: true
writes_performed: false
app_schema_write_allowed: false
ai_proposal_write_allowed: false
audit_event_write_allowed: true
audit_event_count_before: 1
audit_event_count_after: 1
proposal_inbox_unchanged: true
crop_cycles_unchanged: true

## Build result

Command:

pnpm run build

Result:

Compiled successfully
Finished TypeScript

Routes:

/                            Static
/crop-cycles                 Dynamic SSR
/crop-cycles/[cropCycleId]   Dynamic SSR
/proposals                   Dynamic SSR
/proposals/[proposalId]      Dynamic SSR

next-env.d.ts had no diff.

## UI verification

Checked URL:

http://127.0.0.1:3000/proposals/24fc24ee-8efa-436b-8424-9703edeeb297

Result:

GET /proposals/24fc24ee-8efa-436b-8424-9703edeeb297 200

Confirmed UI display:

- AI Proposal detail
- Review Decision Events
- Latest review decision
- Review decision history
- defer_review
- Day26 UI smoke test only. This audit event does not apply proposal changes to app data.
- proposal_review_event_append_ui_smoke

Mutation construct grep result:

- no form
- no button
- no POST form method

## Safety SQL result

app.crop_cycles remained unchanged:

id: 2
source_extracted_fact_ids: {4,5,6,7,8,9}
crop: ブロッコリー
variety: ピクセル
field_name: A圃場
sowing_date_text: 9/20
transplant_date_text: 11/15
archived: false

ai.proposal_inbox remained unchanged:

id: 24fc24ee-8efa-436b-8424-9703edeeb297
proposal_type: day3_permission_test
title: Day3 AI proposal permission test
status: pending
reviewed_by: null
reviewed_at: null
review_note: null
applied_by: null
applied_at: null

Audit event count:

audit.proposal_review_decision_events count = 1

App role privileges:

app.crop_cycles:
  SELECT true
  INSERT false
  UPDATE false
  DELETE false
  TRUNCATE false

ai.proposal_inbox:
  SELECT true
  INSERT false
  UPDATE false
  DELETE false
  TRUNCATE false

audit.proposal_review_decision_events:
  SELECT true
  INSERT true
  UPDATE false
  DELETE false
  TRUNCATE false

## Day26 conclusion

Day26 successfully proved that a human review decision event can be appended as audit-only history and then read from the proposal detail UI.

The appended event is not an app projection, not a proposal status update, and not a business action.

The system remains aligned with:

- Event Sourcing
- Human in the Loop
- Proposal First / Human Approval
- AI Agent Isolation
- Security First
- read-only UI boundaries

## Backup and restore test

Backup file:

backups/farmos_core_day26_20260704_175317.dump

Backup size:

99K

Restore test result:

proposal_review_decision_event_count: 1

Latest view after restore:

proposal_id: 24fc24ee-8efa-436b-8424-9703edeeb297
decision_type: defer_review
decision_note: Day26 UI smoke test only. This audit event does not apply proposal changes to app data.
decided_by: hayate
decided_by_role: owner
decision_source: local_cli

Restore test database was dropped after verification.

