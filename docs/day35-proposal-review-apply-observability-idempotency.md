# Day35 Proposal Review Apply Observability / Idempotency Foundation

## Purpose

Day35 added the first committed apply observability and idempotency foundation for Proposal Review Apply.

Day34 opened the CLI-only apply command path. Day35 makes that path safer before Hermes, LLM runtime, router, or UI apply surfaces are introduced.

## Scope

Day35 added:

- `audit.proposal_review_apply_events`
- one committed apply audit event per proposal
- same-transaction audit append for committed apply operations
- read-only apply history boundary
- read-only apply history CLI
- read-only apply history boundary test
- app role read-only history visibility
- app role write denial checks for:
  - `app.crop_cycles`
  - `ai.proposal_inbox`
  - `audit.proposal_review_apply_events`

## Non-goals

Day35 does not add:

- UI apply button
- forms
- Server Actions
- POST / PUT / PATCH / DELETE route handlers
- Hermes runtime
- LLM runtime
- router implementation
- money / order / shipping / labor / customer apply paths

## Audit table

Day35 introduced:

- `audit.proposal_review_apply_events`

This table stores committed apply results only.

Dry-runs are intentionally not stored.

## Idempotency

The table has a partial unique index:

    create unique index if not exists uq_proposal_review_apply_events_committed_proposal
      on audit.proposal_review_apply_events(proposal_id)
      where committed = true;

This guarantees one committed apply event per proposal at the database layer.

The command boundary also blocks already-applied proposals through `ai.proposal_inbox.applied_by / applied_at` and through the Day33 readiness/preview boundary.

## Transaction boundary

For `insert_candidate` commit mode, the following are executed in the same transaction:

- `app.crop_cycles` insert
- `ai.proposal_inbox.applied_by / applied_at` marker update
- `audit.proposal_review_apply_events` insert

For `no_op_candidate` commit mode, the following are executed in the same transaction:

- `ai.proposal_inbox.applied_by / applied_at` marker update
- `audit.proposal_review_apply_events` insert

## Role policy

`farmos_app_local` can read apply history.

`farmos_app_local` must not write to:

- `app.crop_cycles`
- `ai.proposal_inbox`
- `audit.proposal_review_apply_events`

`farmos_local_admin` is allowed to execute the CLI-only apply command boundary.

## Safety anchors

The protected proposal must remain pending:

- `24fc24ee-8efa-436b-8424-9703edeeb297`

Existing `app.crop_cycles id=2` must remain present.

Day34 local fixture rows such as `id=6,7,8` are allowed and must not be deleted.

Additional Day35 local fixture rows created during failed or repeated local tests are also allowed and must not be manually deleted during Day35.

## Verified checks

Day35 verified:

- `insert_candidate` commit creates one apply audit event.
- `no_op_candidate` commit creates one apply audit event and does not insert an app crop cycle.
- dry-run does not create an apply audit event.
- second commit for the same proposal is blocked.
- apply audit event, app projection write, and proposal marker update are transactionally consistent.
- `farmos_app_local` can SELECT apply history.
- `farmos_app_local` cannot write to apply targets or apply audit history.
- protected proposal remains pending.
- `app.crop_cycles id=2` remains present.
- `pnpm run build` succeeds.

## Current local audit event summary

At Day35 verification time, local audit history contained:

- `insert_candidate`: 2 committed events
- `no_op_candidate`: 1 committed event

The extra `insert_candidate` event came from an earlier failed assertion after the committed operation had already succeeded. It is valid local fixture state and should not be deleted.
