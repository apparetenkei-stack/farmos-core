# Day29 Proposal Review Decision Command Boundary Dry Run

## Purpose

Day29 adds a dry-run boundary for proposal review decision commands.

This is not command execution.

The boundary validates a concrete review decision payload and returns the audit event candidate that a later append command could write.

Day29 does not write to the database.

## Scope

Day29 covers:

- concrete command payload validation
- allowed review decision type checks
- required human note checks
- actor and source checks
- proposal state checks
- dry-run audit event candidate construction
- no mutation verification

Day29 does not cover:

- audit event append
- proposal status change
- app projection apply
- UI command execution
- Server Actions
- route handlers for mutation
- Hermes, OpenClaw, n8n, or Paperless integration
- order, shipment allocation, or role-policy database design

## Day28 preview vs Day29 dry-run

Day28 preview is a read model for displaying possible future choices.

Day29 dry-run is a validation boundary for a specific command payload.

Preview answers:

- which review actions could exist
- what each action would mean
- whether a future human note would be needed

Dry-run answers:

- whether this exact payload is valid
- whether the target proposal is still pending
- whether the proposal has not already been applied
- whether actor role and source are allowed
- what audit event candidate would be constructed later

## Non-mutating policy

Day29 runs inside a read-only transaction.

The dry-run boundary may select from:

- ai.proposal_inbox
- audit.proposal_review_decision_latest
- audit.proposal_review_decision_events for count checks in tests

The dry-run boundary does not modify:

- app.crop_cycles
- ai.proposal_inbox
- audit.proposal_review_decision_events

The boundary reports whether the app role has future audit append privilege, but Day29 does not use that privilege.

## Decision types

Allowed decision types are:

- approve_review
- reject_review
- request_revision
- defer_review

## Required note policy

Day29 policy:

- approve_review: note optional
- reject_review: note required
- request_revision: note required
- defer_review: note required

The stricter defer note rule is intentional for Day29. Deferral should preserve human context because it explains why a pending proposal was not reviewed yet.

## Actor policy

Allowed decided_by_role values are:

- owner
- admin
- operator

decided_by must be non-empty after trimming.

## Source policy

Allowed decision_source values are:

- local_cli_dry_run
- future_ui_dry_run

Day29 CLI uses local_cli_dry_run.

future_ui_dry_run is reserved for a later UI-only dry-run surface.

## Proposal state policy

A command dry-run is accepted only when:

- the proposal exists
- proposal.status is pending
- proposal.applied_at is null

If a proposal is already applied, Day29 rejects the payload as a validation error.

## Review decision vs apply

A review decision records human judgment about a proposal.

An app projection apply changes operational truth.

Those are separate boundaries.

Day29 only constructs the future review decision event candidate. It does not apply operational data.

## Why Day29 does not append the audit event

Append-only audit events are durable facts.

Day29 intentionally stops before creating a new fact. This lets the project validate command payload shape, actor policy, source policy, and proposal state policy before introducing mutation.

## Day30 prerequisite if chosen

A future append boundary should start only after Day29 proves:

- dry-run validation is deterministic
- invalid inputs are rejected
- database snapshots remain unchanged
- audit event count remains unchanged during dry-run
- the CLI rejects commit mode on Day29
- build and boundary tests pass

A future append boundary should append only the audit event first. Proposal status change and app projection apply should remain separate later steps.
