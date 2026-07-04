# Day30 Proposal Review Decision Audit Append Command Boundary

## Purpose

Day30 adds the first proposal review decision command boundary that can append an audit event.

This day is intentionally narrow:

- CLI only.
- Explicit --commit only.
- Append only to audit.proposal_review_decision_events.
- No proposal status transition.
- No app projection apply.
- No UI mutation path.

Day30 turns the Day29 dry-run command payload into an append-only audit fact when, and only when, a human explicitly supplies the commit flag.

## Difference from Day29

Day29 validated the concrete review decision command payload and produced a dry-run event candidate.

Day30 keeps the same validation intent, but adds one write path:

    audit.proposal_review_decision_events INSERT

No other table is mutated.

## Boundary rule

The command boundary has two modes:

    commit: false -> dry_run
    commit: true  -> committed

In dry-run mode:

- The proposal is selected.
- The previous latest review decision is selected.
- The command payload is validated.
- No event is inserted.
- No app data is changed.
- No ai proposal row is changed.

In committed mode:

- The proposal is selected.
- The previous latest review decision is selected.
- The command payload is validated.
- Exactly one event is inserted into audit.proposal_review_decision_events.
- The latest review decision view should point to the appended event.
- No app data is changed.
- No ai proposal row is changed.

## Explicit non-goals

Day30 does not:

- change app.crop_cycles;
- change ai.proposal_inbox.status;
- change ai.proposal_inbox.reviewed_by;
- change ai.proposal_inbox.reviewed_at;
- change ai.proposal_inbox.review_note;
- change ai.proposal_inbox.applied_by;
- change ai.proposal_inbox.applied_at;
- apply any app projection;
- add UI execution controls;
- add form elements;
- add button elements;
- add Server Actions;
- add write API routes.

## Review decision versus proposal lifecycle

Day30 deliberately separates two concepts:

1. Review decision audit fact.
2. Proposal lifecycle state.

A review decision event is an immutable audit fact that says a human made a decision.

The proposal lifecycle state is operational state on ai.proposal_inbox.

Day30 only records the audit fact. It does not transition proposal lifecycle state.

This keeps the first write boundary small, inspectable, and append-only.

## Operational truth separation

app schema remains the operational truth used by the app.

audit schema records human decision facts.

Day30 only writes an audit fact. It does not convert that fact into operational truth.

## Latest decision view

After a committed append, audit.proposal_review_decision_latest should return the appended event for the target proposal.

The latest decision view is read-only from this boundary's perspective. It is used only to verify that the append changed the latest audit fact.

## Safety profile

The Day30 boundary reports:

- current DB user;
- whether app schema writes are allowed;
- whether ai proposal writes are allowed;
- whether audit event append is allowed;
- whether writes were performed;
- whether commands were executed;
- whether app writes were performed;
- whether ai proposal writes were performed;
- whether an audit event append was performed.

Expected committed result:

    writes_performed: true
    commands_executed: true
    app_schema_writes_performed: false
    ai_proposal_writes_performed: false
    audit_event_append_performed: true

Expected dry-run result:

    writes_performed: false
    commands_executed: false
    app_schema_writes_performed: false
    ai_proposal_writes_performed: false
    audit_event_append_performed: false

## Day31 prerequisite

A future proposal status transition boundary can be built after Day30.

That future boundary should consume the latest audit decision and then perform a narrowly-scoped transition on ai.proposal_inbox.

It should still avoid app projection apply.
