# Daily Brief Proposal review decision database contract

## Status

This document and SQL file are static design artifacts.

No database schema, role, grant, revoke, fixture, or production environment has
been changed.

The contract is not a migration and is not approved for execution. The current
isolated database remains `schema_missing` for Day128 review decisions.

## Responsibility

Day128 records an administrator's review decision for a saved Daily Brief
Proposal. It does not Apply a Proposal and does not write to operational app
tables. The only future atomic write is a five-column Proposal review transition
plus one append-only audit event.

## Reused foundations

The audit shape reuses Day24's
`audit.proposal_review_decision_events`, including its Proposal foreign key,
UUID event identity, indexes, and the shared decision enum. `defer_review`
remains in the shared table constraint for compatibility, but the Day128 runtime
never generates it.

The Proposal mutation permission reuses Day31's five-column allow-list:

```text
status
reviewed_by
reviewed_at
review_note
updated_at
```

Day128 strengthens the operation with safe-reference resolution,
`expected_status + expected_updated_at` compare-and-swap, expiry and Apply-state
checks, and atomic audit append.

## Dedicated runtime role

The existing save role is not reused because it has Proposal INSERT permission.
Save and review are different capabilities. The proposed server-owned role is
`farmos_ai_proposal_review_local`, with no login, superuser, role creation,
database creation, inheritance, or RLS bypass.

It receives only:

- schema usage and SELECT for `ai.proposal_inbox`;
- UPDATE on the five review columns;
- schema usage and INSERT for the audit event table.

It receives no Proposal INSERT, DELETE, TRUNCATE, table-level UPDATE, Apply-field
UPDATE, payload UPDATE, schema CREATE, app write, or production CONNECT grant.

## Audit append-only contract

The runtime can INSERT an audit event but cannot UPDATE, DELETE, or TRUNCATE the
audit table. The event references `ai.proposal_inbox.id` with `ON DELETE
RESTRICT`; cascade deletion is forbidden. `gen_random_uuid()` avoids sequence
privileges and must be verified by readiness before an approved fixture is
applied.

Every Day128 event has a note and fixes:

```text
decided_by_role = administrator
decision_source = daily_brief_proposal_review_decision
decision_type = approve_review | reject_review | request_revision
```

Raw Proposal IDs and reviewer principals remain internal and are never public
response fields.

## Safe reference resolution

The browser supplies only `daily_brief_proposal_<24 lowercase hex>`. No public
reference column is added. In the future repository transaction, the Day127
candidate query reads at most 100 rows in deterministic order, the existing
strict parser validates each row, and application code recomputes the safe
reference. Exactly one match is required.

The internal UUID, candidate ID, duplicate signature, idempotency key, payload,
source refs, and principal never leave the repository boundary.

## Atomic transaction and CAS

One connection and one transaction perform:

1. isolated target, local socket, and role checks;
2. safe-reference resolution;
3. protected fixture, pending status, updated time, expiry, and Apply checks;
4. five-column Proposal CAS UPDATE;
5. exact update count of one;
6. audit INSERT;
7. exact insert count of one;
8. commit.

The audit append follows the successful Proposal update. Any mismatch or error
rolls back both operations, releases the connection, performs no retry, and does
not fall back to another target.

`ai.proposal_inbox` has no standalone `expires_at` column. The expiry timestamp
is part of the strict Day126 payload. The repository validates it through the
Day127 parser and repeats the expiry predicate in the CAS statement.

## Readiness

Readiness is fail-closed and returns one of:

```text
ready
schema_missing
role_missing
required_privilege_missing
forbidden_privilege_present
invalid_database_target
unavailable
```

It verifies the isolated local-socket target, safe role attributes, the five
required column privileges, absence of all forbidden Proposal and audit
privileges, absence of app writes, and retry count zero. It also verifies the
audit schema/table, foreign key, constraints, and UUID function.

The current isolated database must be reported as `schema_missing`; it must not
be described as ready.

## Rollback

Rollback is separately human-approved. It first stops callers, then revokes only
the Day128 role's privileges and drops only that role after dependency checks.
The shared Day24 audit table is never dropped when it is shared or contains
events. Audit rows are never deleted or truncated, and the audit schema is not
dropped by Day128 rollback.

## Phase 4 gate

Postgres repository, readiness execution, isolated E2E, API, and UI remain
blocked until an explicitly approved isolated schema and dedicated
least-privilege role are available. Approval must cover the schema/role/privilege
fixture and rollback plan. Production targets and Proposal Apply remain out of
scope.

## Phase 4A implementation preparation

Phase 4A adds an unexecuted isolated fixture, approval-gated fixture runners,
fake-executor readiness, and an atomic repository contract. No runner was
executed during this phase.

The fixture is restricted to `farmos_core_day114_test` over a local socket. It
reuses a compatible Day24 audit table without adding Day128-only constraints to
shared rows. An existing review role is accepted only when its immutable safety
attributes and existing privileges are compatible; an overprivileged role fails
closed instead of being silently repaired.

The repository uses one server-owned connection and transaction. It reads at
most 100 strict Day126 candidates without locks, resolves the Day127 safe
reference in application code, then locks only the matching internal row with
`FOR UPDATE`. It re-parses the locked row, checks expiry without casting unknown
JSON in SQL, applies `expected_status + expected_updated_at` CAS, and appends the
audit event only after exactly one Proposal row was updated. Any count mismatch
or exception rolls back both operations and performs no retry.

Readiness is read-only and verifies the exact isolated target, local socket,
audit contract, role attributes, required five-column UPDATE and audit INSERT,
and the absence of Proposal INSERT, Apply/payload updates, audit mutation, and
app writes.

Rollback is separately approval-gated. It removes only the Day128 role and its
privileges after active-use checks. It never drops the audit table or schema and
never deletes or truncates audit events.

No database connection, schema change, role change, privilege change, fixture
apply, or rollback was performed during Phase 4A.

Phase 4B requires explicit human approval before fixture readiness, fixture
apply, repository readiness, or isolated database E2E is run.
