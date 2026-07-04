# Day28 Proposal Review Command UI Design Preview

## Purpose

Day28 defines the future proposal review command UI and adds a non-mutating preview read model.

The scope is intentionally limited to:

- design documentation
- read-only command preview generation
- read-only rendering on the proposal detail page

Day28 does not execute review commands.

## Current foundation

Previous days established the review decision flow in stages:

- Day24 added append-only review decision events in `audit.proposal_review_decision_events`.
- Day25 rendered review decision events on the proposal detail page.
- Day26 appended one `defer_review` event by local CLI smoke test.
- Day27 polished the detail timeline and added latest review decision summary to the proposal list.

Day28 keeps that read-only posture.

## Responsibility separation

The future review command flow is split into separate layers.

### UI layer

The UI layer is responsible for:

- showing the current proposal
- showing latest review decision state
- showing possible future review decision commands
- showing what event candidate would be produced in a future command flow

The UI layer must not mutate the database in Day28.

### Preview read boundary

The preview read boundary is responsible for:

- selecting the target proposal
- selecting the latest review decision summary
- returning preview items for possible future decisions
- reporting boundary safety metadata

The preview read boundary runs in a read-only transaction.

### Future command boundary

A future command boundary may eventually:

- validate an explicit human command payload
- validate required human notes
- append a review decision audit event
- return a committed command result

That is outside Day28.

## Preview decision types

Day28 renders four future review decision candidates.

### approve_review

Meaning:

- the human reviewer agrees with the proposal as review-worthy
- this is not the same as applying the proposal into app projections
- Day28 only previews the future audit event candidate

### reject_review

Meaning:

- the human reviewer rejects the proposal
- a human note should explain why the proposal is rejected
- Day28 only previews the future audit event candidate

### request_revision

Meaning:

- the human reviewer wants the AI or operator workflow to revise the proposal
- a human note should explain what needs to change
- Day28 only previews the future audit event candidate

### defer_review

Meaning:

- the human reviewer intentionally delays the decision
- a human note is useful for audit context
- Day28 only previews the future audit event candidate

## Review decision vs apply

A review decision is not the same as applying data into the application schema.

Review decision:

- records human judgment about a proposal
- belongs to the audit trail
- should be append-only
- does not change crop cycle truth by itself

Apply:

- changes app-facing projection state
- should be separated from review decision
- needs stronger validation and rollback planning
- should not be mixed into Day28

Day28 previews review decision candidates only.

## Proposal status update separation

Day28 intentionally does not update proposal status.

The safer sequence is:

1. preview future review decision command
2. add dry-run command validation
3. append audit event only
4. later decide whether proposal status should be updated
5. later decide whether app projections should be updated

This prevents a single UI change from mixing audit append, proposal lifecycle mutation, and app projection mutation.

## Human in the Loop safety

The human remains the final authority.

The system may generate suggestions and preview command effects, but Day28 does not allow command execution from the page.

The preview explains:

- which decision type would be used
- whether a future audit event would be appended
- whether proposal status would be updated
- whether app projection would be updated
- whether a human note would be required
- which source value would be used by a future UI command

## Day28 non-mutating guarantee

Day28 preview boundary reports:

- `transaction_read_only: true`
- `writes_performed: false`
- `commands_executed: false`
- `preview_only: true`

The page renders preview candidates as static read-only information.

## Future Day29 candidate

A natural Day29 continuation is a command boundary dry run.

That future day may add:

- command payload validation
- required note validation
- dry-run output
- explicit commit flag handling

Even then, the first committed command should remain limited to audit event append only.
Proposal status updates and app projection updates should remain separate later steps.
