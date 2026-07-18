# Daily Brief Proposal review integrated flow

## Purpose

Day129 verifies the existing Day126 through Day128 application boundaries as
one DB-independent flow without changing their production behavior:

```text
list -> detail -> review -> refetch -> terminal UI
```

The contract test calls the existing list, detail, and review services, strict
API parsers, UI state helpers, and UI projections. A mutable fake implements the
existing read and review repository interfaces; it does not introduce another
repository abstraction.

## Reused boundaries

- Day126 explicit-save Proposal row contract;
- Day127 list/detail read services, strict row projection, safe references, API
  parsers, and UI states;
- Day128 pure review preparation and atomic review repository interface;
- the existing `DailyFarmBriefProposalDetail` review-control visibility;
- the existing Day128 UI contract test for submit locking and stale refresh.

No list, detail, review, authentication, safe-reference, repository, readiness,
executor, or UI production logic is copied into Day129.

## Verified invariants

- authenticated administrator authorization remains server-owned;
- the reviewer and review clock come from server dependencies;
- `expected_status` is `pending` and `expected_updated_at` comes from detail;
- only the safe Proposal reference crosses public boundaries;
- list, detail, and review responses remain `no-store`;
- malformed list, detail, and review responses fail closed;
- terminal statuses hide review controls;
- automatic retry is zero;
- Proposal Apply is zero;
- farming-application database writes are zero;
- production database connections are zero.

The production control does not expose a test-only event helper. Dynamic
submit-lock and stale-refresh behavior therefore remains covered by the
existing Day128 UI source contract: a second submission is ignored while
`submitting`, and a stale response invokes one refresh without automatically
resubmitting the review note. Day129 does not add a test-only production export.

## Why there is no new isolated DB E2E

Day128 already verifies the atomic Proposal update, audit insert, transaction
rollback, protected Proposal isolation, and absence of app writes against the
approved isolated database. Day129 verifies the application orchestration that
was not covered by that persistence E2E. Creating another append-only audit
fixture would leave residue without establishing a new database invariant.

## Non-goals

- Proposal Apply;
- farming-application or inventory mutation;
- a new repository, readiness boundary, fixture, or executor;
- a production PostgreSQL adapter;
- schema, role, or privilege changes.

## Rollback

Remove this document and the Day129 integrated contract test, then remove its
single `package.json` script. No database rollback is required because Day129
does not connect to or write a database.
