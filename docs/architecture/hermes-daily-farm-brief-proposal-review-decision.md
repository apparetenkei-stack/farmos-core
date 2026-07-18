# Daily Brief Proposal review decision boundary

Day128 records an administrator's explicit review decision for a Day126 Daily Brief Proposal. It does not Apply the Proposal and does not write to farming-application business data.

## Phase 2 scope

Phase 2 is a pure/static boundary with a fake atomic repository. It accepts only `proposal_ref`, `decision`, `review_note`, `expected_status`, and `expected_updated_at`. The browser cannot supply a principal, role, scope, reviewed timestamp, next status, database target, payload, or Apply instruction. `requested_at` is intentionally absent; one injected server-owned UTC instant supplies reviewed, updated, audit-decision, and audit-created timestamps.

The three decisions are `approve`, `reject`, and `request_revision`. They map deterministically from `pending` to `approved`, `rejected`, and `needs_revision`. Every non-pending status is rejected. A Proposal ending in `needs_revision` is not edited or reviewed again: revised content must produce a new candidate and new Proposal so the original and replacement remain independently auditable.

## Review note

Every decision requires a note. The boundary applies Unicode NFC and trims only surrounding whitespace. The normalized note must contain 1–1000 Unicode code points. Japanese text, ordinary punctuation, and LF-separated lines are allowed. C0/C1 controls other than LF, Unicode bidi controls, U+FFFD, and HTML tags or markup are rejected. Valid text is not interpreted as HTML or converted from Markdown, and invalid text is rejected rather than silently sanitized.

## Authorization and time

Existing strict authentication and actor parsers are reused. Authentication must be `authenticated`; the actor principal must match it; and the actor must be a verified `administrator` with no allowed scope keys. Raw principal values remain internal to the repository command and audit candidate and never enter the safe result.

The clock is a server dependency and must return one canonical UTC ISO timestamp. Client time is not accepted. Repository implementations may later use the database server clock, but must preserve the one-instant contract.

## Current state and concurrency

The repository-owned current-state context mirrors the safe Proposal reference and supplies status, updated timestamp, expiry, Apply fields, and a protected-fixture marker. Preparation requires a pending, unapplied, unprotected Proposal whose current updated timestamp exactly matches the required `expected_updated_at`, and whose expiry is strictly later than the server instant.

Optimistic concurrency uses `expected_status = pending` plus `expected_updated_at`. A future PostgreSQL repository must perform a compare-and-swap update and require exactly one Proposal update. Status-only checking is insufficient because a still-pending row could otherwise be changed from a stale screen.

## Atomic repository contract

The repository exposes one method: `recordProposalReviewDecision`. Its command contains the safe reference, expected state, next status, normalized note, internal reviewer principal, server timestamp, and audit candidate. It contains no connection, target, credential, Apply command, Proposal INSERT, app command, or retry policy.

The fake repository verifies the future atomic contract: exactly one Proposal update and exactly one audit append commit together. Zero or multiple affected rows, stale state, or an audit failure roll back the simulated transaction. Exceptions and malformed repository results become a fixed safe unavailable error with retry zero.

## Audit compatibility

The internal decision mapping remains compatible with the Day24 design:

- `approve` to `approve_review`
- `reject` to `reject_review`
- `request_revision` to `request_revision`

The candidate uses source `daily_brief_proposal_review_decision` and carries strict metadata for schema version, boundary, previous/next/expected status, expected timestamp, and zero Apply/app-write/retry. The PostgreSQL repository will resolve the safe reference to the internal Proposal UUID; neither the pure request nor the public result contains that UUID or an audit event UUID.

## Safe result

A successful safe result contains only the safe Proposal reference, public decision, resulting status, reviewed timestamp, and fixed no-Apply/no-app-write values. It excludes reviewer principal, DB role and target, audit identity, candidate/idempotency/duplicate identifiers, raw payload/source references, SQL, credentials, and raw errors.

## Phase 3 blocker

Pure/static boundary implemented.

Postgres repository, readiness, E2E, API and UI remain blocked until an explicitly approved isolated schema and least-privilege runtime role are available. The isolated database currently has no Day24 audit schema/table, lacks the five review-column UPDATE privileges and audit INSERT privilege, and the current Proposal runtime role retains Proposal INSERT. Phase 2 does not create a migration, fixture, role, GRANT, or REVOKE.
