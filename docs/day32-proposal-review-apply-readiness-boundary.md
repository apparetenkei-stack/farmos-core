# Day32 Proposal Review Apply Readiness Boundary

## Purpose

Day32 adds a read-only boundary for checking whether an approved proposal can move toward a future app projection apply command.

Day32 is not an apply execution day.

## Created files

- scripts/app/api_boundary/proposal_review_apply_readiness_read_api_boundary.ts
- scripts/app/check_proposal_review_apply_readiness.ts
- scripts/app/test_proposal_review_apply_readiness_read_api_boundary.ts

## Package scripts

- check-proposal-review-apply-readiness
- test-proposal-review-apply-readiness-read-api-boundary

## Boundary scope

The boundary reads:

- ai.proposal_inbox
- audit.proposal_review_decision_latest

The boundary does not write:

- app.crop_cycles
- app schema
- ai.proposal_inbox
- audit.proposal_review_decision_events

The boundary does not execute app projection apply.

## Read-only transaction

The boundary starts a read-only transaction.

Expected boundary fields:

- transaction_read_only: true
- writes_performed: false
- commands_executed: false
- app_schema_write_allowed: false
- app_projection_apply_performed: false

## Result classification

The boundary returns one of:

- ready
- blocked
- not_found
- bad_request
- error

A proposal is ready only when all of the following are true:

- proposal exists
- proposal status is approved
- proposal has no applied_by marker
- proposal has no applied_at marker
- latest review decision exists
- latest review decision is approve_review
- latest review decision source is local_cli
- payload_json is present
- proposal_type is supported by the Day32 boundary

## Blocked reasons

Possible blocked reasons:

- proposal_not_approved
- proposal_already_applied
- latest_decision_missing
- latest_decision_not_approve_review
- latest_decision_source_not_allowed
- payload_missing
- unsupported_proposal_type

## Supported proposal types

Day32 supports a minimal test-oriented list:

- day32_apply_readiness_test
- day31_status_transition_test

Future production apply planning should replace this with explicit production proposal types that have stable app projection semantics.

## CLI

Example:

pnpm run check-proposal-review-apply-readiness -- --proposal-id <proposal-id>

The CLI intentionally has no commit mode.

If --commit is passed, the CLI returns bad_request.

## Test fixture policy

The Day32 test creates local fixtures using the local admin role.

Fixture creation is outside the Day32 boundary itself. The Day32 boundary remains read-only.

The test verifies:

- ready result for a Day32 approved fixture
- blocked result for the existing pending target proposal
- blocked result when latest review decision is missing
- blocked result for an already applied local fixture
- blocked result for unsupported proposal type
- bad_request result for invalid proposal ID
- not_found result for missing proposal
- CLI ready check
- CLI blocked check
- app.crop_cycles unchanged
- existing target proposal remains pending

## Day32 test result

The Day32 boundary test confirmed:

- ready_fixture_result: ready
- pending_existing_target_result: blocked
- transaction_read_only: true
- writes_performed: false
- commands_executed: false
- app_schema_write_allowed: false
- app_projection_apply_performed: false
- app_crop_cycles_unchanged: true
- existing_target_remained_pending: true

## Explicit non-goals

Day32 does not:

- apply app projections
- update app.crop_cycles
- update ai.proposal_inbox.status
- update ai.proposal_inbox.applied_by
- update ai.proposal_inbox.applied_at
- create UI apply actions
- create forms
- create buttons
- create Server Actions
- create POST, PUT, PATCH, or DELETE API Routes
