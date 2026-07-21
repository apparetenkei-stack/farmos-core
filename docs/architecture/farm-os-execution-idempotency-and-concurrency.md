# FarmOS execution idempotency and concurrency

Day134 adds a reservation boundary in front of the Day133 fake-only Execution Gateway. The order is strict: validate the Day133 request and Approved Command, look up and atomically reserve the complete command identity, compare-and-set claim and start, invoke the allow-listed Fake Adapter, then compare-and-set finalize. A reservation or claim failure cannot reach the adapter.

## Contract and Port

`FarmOsExecutionReservation` binds command, proposal, approval, idempotency, target, class, correlation, trace and version data. Owner tokens, state, reservation version, completion and result are server-owned. The `FarmOsExecutionReservationPort` exposes lookup, reserve, claim, start, finalize, expire and release as strict unions without DB-specific types. Day134 provides only a deterministic in-memory contract repository; no PostgreSQL, Supabase, Redis or filesystem adapter exists.

The command identity consists of command ID/hash, proposal ID/hash, approval ID, idempotency key, target, class and version. Reusing one index with different identity material is a conflict, not a benign duplicate. An exact completed retry returns the stored technical Execution Result without another Fake Adapter call. In-progress work returns `EXECUTION_IN_PROGRESS`; failed or expired work is never automatically retried.

## State and compare-and-set

The declarative reservation table covers reserved, claimed, executing, completed, failed, expired and released. Every mutation requires the current reservation version; claim, start, finalize and release also require the server-owned owner token where specified. Leases use the Core clock, have a fixed upper bound, and an expired owner cannot finalize. Every transition has `business_write_allowed=false` and `external_execution_allowed=false`.

The in-memory repository is a deterministic fixture for atomic contract tests. JavaScript scheduling is not the contract: uniqueness indexes and reservation-version compare-and-set are explicit. Persistent atomic reservation is represented by the Port only; no persistent adapter or migration is part of Day134.

## Retry, replay and findings

Browser double-submit and concurrent reserve fixtures prove exactly one winner. Timeout retry after completion reuses the stored result; valid in-progress work is reported without re-execution. Command/hash/idempotency collisions, approval reuse, stale expected/reservation versions, stale owner finalization, malformed repository results, unknown fields and raw duplicate fields fail closed.

Duplicate and concurrency observations use a review-required Finding fixture. It cannot automatically adopt Policy or Skill and is not persisted.

## Safety and next boundary

Recursive import/AST checks restrict the implementation to the Reservation Port, its in-memory fixture repository, Day133 contracts and the Fake Adapter. Business Write, external execution, Proposal Apply, DB, network, filesystem write and real-adapter paths are absent. A Fake Adapter `succeeded` result is still not a Business Fact.

Day135 owns runtime reauthorization, approval/capability re-checks, Proposal expiry, expected business version, current target state and session/member status. Day134 does not infer or implement those checks.
