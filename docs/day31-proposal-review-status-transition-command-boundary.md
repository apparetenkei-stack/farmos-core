# Day31 Proposal Review Status Transition Command Boundary

## Purpose

Day31 adds a local CLI-only command boundary for transitioning ai.proposal_inbox.status from the latest human audit decision.

This day does not apply proposals to operational app truth.

## Scope

The command reads:

- audit.proposal_review_decision_latest
- ai.proposal_inbox

The command may update only these columns on ai.proposal_inbox:

- status
- reviewed_by
- reviewed_at
- review_note
- updated_at

The command must not update:

- applied_by
- applied_at
- payload_json
- source_refs_json
- body

## Decision mapping

approve_review -> approved
reject_review -> rejected
request_revision -> needs_revision
defer_review -> no transition; remains pending

## Safety rules

- The command requires an explicit decisionEventId.
- The decisionEventId must match the latest decision for the proposal.
- The proposal must still be pending.
- The proposal must not have applied_by or applied_at.
- The latest decision must come from local_cli.
- The status transition command itself must come from local_cli.
- --commit is required to write.
- Without --commit, the command is dry-run only.
- app.crop_cycles is not changed.
- No app projection apply is performed.
- No UI mutation path is added.
- No Server Action is added.
- No POST, PUT, PATCH, or DELETE API route is added.

## Permission change

Day31 grants column-level update only:

grant update (
  status,
  reviewed_by,
  reviewed_at,
  review_note,
  updated_at
)
on ai.proposal_inbox
to farmos_app_local;

Table-level update remains unavailable.

applied_by and applied_at remain non-updatable by farmos_app_local.

## Fixture policy

Day31 tests use dedicated day31_status_transition_test fixture proposals.

The existing Day3/Day29/Day30 target proposal must remain pending:

24fc24ee-8efa-436b-8424-9703edeeb297

Day31 tests are stateful because they commit status transitions on newly generated fixture UUIDs.

They do not reuse the existing target proposal.
