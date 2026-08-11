# Day150 Phase C1 Durable Approval / Command / Receipt Contracts

Status: `SOURCE_ONLY_CONTRACT_CANDIDATE`. Durable storage, a trusted-clock
implementation, external capability probe authorization, Gate 2 execution,
runtime binding, and production access are `NOT_ESTABLISHED` or
`NOT_AUTHORIZED`.

## Ownership and dependency direction

Phase C owns the canonical source contracts for Proposal, Human Approval,
Approval Receipt, trusted-clock evidence, execution commands, reservation and
attempt lifecycle, final execution receipts, persistence ports, replay
conflicts, crash windows, and `OUTCOME_UNKNOWN`.

The dependency direction is one way:

```text
Phase B authorities
-> trusted-clock contract
-> approval authority
-> command authority
-> receipt authority
-> lifecycle
-> persistence ports
```

Phase B does not import Phase C. Phase C references exact Phase B authority IDs,
revisions, plus domain-separated canonical digests of the exported Phase B policy records,
without owning credential, connection, collector,
principal, TLS, or broker semantics. Phase A continues to own provider-source,
minimal-observation, external-feasibility, formal production-evidence, and
formal production-evidence receipt semantics.

## C1 is not durability

C1 defines exact schemas, deterministic digests, pure validators, a state
machine, and interfaces that require atomic storage operations. It provides no
repository, schema, migration, database, filesystem ledger, process-local
consumption map, trusted clock implementation, runner, IPC, credential
resolver, provider client, DB client, or production entrypoint.

Consequently all of these remain false or not established after C1:

- `DURABLE_APPROVAL_SOT_ESTABLISHED`
- `TRUSTED_CLOCK_ESTABLISHED`
- `DURABLE_RESERVATION_FINALIZATION_ESTABLISHED`
- `STORAGE_BACKED_CONCURRENCY_TESTED`
- `STORAGE_BACKED_CRASH_SEMANTICS_TESTED`
- `STORAGE_BACKED_RESTART_TESTED`

G2-A readiness source and evidence are unchanged.

## Proposal, Approval, and Approval Receipt

The approval authority requires exact Proposal -> Human Approval -> Approval
Receipt lineage. Each record binds its upstream authority, revision, ID,
digest, target, operation, and expiry. Human identity is represented by a
server-owned authenticated actor-provenance record. A client role, boolean, or
request-body assertion is never approval authority.

Chronology is strict: approval cannot precede proposal, an Approval Receipt
cannot precede approval, and neither approval nor receipt may extend its
upstream expiry. A command cannot precede its Approval Receipt or outlive any
Proposal/Approval/Approval Receipt expiry.

Approval resolution is exact-ID and exact-revision only. Unknown, duplicate,
revoked, expired, malformed, latest, default, fallback, and digest-mismatched
records fail closed. One approval may authorize at most one command. A reusable
approval would require a future versioned authority.

Proposal, Human Approval, and Approval Receipt records are immutable historical
lineage. Post-issuance revocation never updates `approval.revoked`, any
digest-bearing Approval field, the Approval Receipt, the Command,
`command_record_digest`, or `execution_binding_digest`. Instead C1 owns the
versioned `farmos.production-target-execution-approval-revocation.v1`
append-only event authority and its CAS-controlled head projection. Each event
binds the exact Approval and Approval Receipt IDs/digests, target, operation,
bounded reason, effective trusted-clock evidence and timestamp, monotonic
sequence, previous event digest, and its own derived ID/digest.

The revocation head starts as the exact version-zero `ACTIVE` projection created
with the Approval lineage. A revocation transaction must compare the expected
head version/digest and latest event digest, append the event, and advance the
head atomically. Missing heads, automatic latest-event selection, sequence
regression, conflicting event identity, client authority assertions, and CAS
mismatch fail closed. Approval usability is derived from the immutable Approval
and Receipt, the exact authoritative revocation head/event state, and qualified
trusted-clock evidence. It is explicitly `ACTIVE`, `REVOKED`, `EXPIRED`, or
`INVALID`; the immutable Approval record alone is not current revocation
authority. Evaluation recomputes the immutable Approval and Approval Receipt
digests and verifies their complete lineage; retained-digest mutation of expiry
or another authority field is invalid. `ACTIVE` requires a zero-version head
and no event. `REVOKED` requires an exact digest-valid event agreeing with the
head sequence, identity, digest, and effective timestamp. Reservation and
attempt-start both bind the expected revocation head version/digest so a
post-issuance revocation race rejects before operation. Their successful
storage result must persist the exact observed head version/digest/event digest
as versioned, domain-separated, digest-verifiable transaction-authoritative
revalidation evidence with the lifecycle CAS. The evidence binds the command,
execution binding, Approval, exact digest-valid head, transition kind, and
successor lifecycle identity/version/digest. Evidence validation also binds the
head's Approval Receipt lineage and requires `RESERVATION` to terminate at
`RESERVED_NOT_STARTED` and `ATTEMPT_START` at `ATTEMPT_STARTED`.

A command may be stored as a candidate that references an approval, but storage
alone does not authorize it. The one-approval/one-command consumption boundary
is the atomic reservation operation, which requires the Approval SOT still to
be unbound and permits one durable winner.

## Trusted-clock contract

The clock contract reuses the Phase B canonical timestamp parser and therefore
uses exact `YYYY-MM-DDTHH:mm:ss.SSSZ`, UTC, fixed milliseconds, and Gregorian
calendar validation. It defines `AVAILABLE`, `UNAVAILABLE`, `STALE`,
`REGRESSED`, and `INVALID` evidence states, exact authority provenance, an
evidence digest, and a persisted lower bound. Persistence ports require the
store-owned clock floor to be compared and advanced in the same atomic
operation that appends Proposal/Approval records or resolves lifecycle state;
a caller-supplied floor is not
clock authority.

Domain validation consumes qualified clock evidence. A bare caller timestamp,
`Date.now()`, system clock read, DB clock query, or network time response is not
trusted-clock authority. The actual trusted-clock implementation remains C2 or
later work.

## Formal Gate 2 and noncanonical probe identity

The formal operation is exactly:

`ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE`

It delegates command identity derivation to the existing canonical
`farmos.production-target-evidence-command-id.v1`. Its eight-field preimage,
algorithm, and `g2cmd_<64 lowercase hex>` grammar are neither copied nor
reinterpreted.

The noncanonical operation is exactly:

`PROBE_PRODUCTION_TARGET_EXTERNAL_CAPABILITY_NONCANONICAL`

It uses the separate versioned identity authority
`farmos.production-target-noncanonical-capability-probe-command-id.v1`, a
separate domain separator, and `probecmd_<64 lowercase hex>`. Formal and probe
IDs cannot cross-validate.

Both operations use the same Approval SOT, lifecycle, and future persistence
framework. The probe remains noncanonical, non-reusable, ineligible for formal
evidence, unable to promote readiness, and without manifest or runtime effect.
It permits at most one provider call, one DB connection, and zero automatic
retries. C1 contains no probe implementation or authorization.

## Full execution binding

A `g2cmd_*` ID alone is not execution authority. Every command envelope binds a
deterministic full `execution_binding_digest` covering the command identity,
target manifest and digest, v5 authority and SHA, operation artifact authority
and SHA, exact Phase B authority bundle, Proposal/Approval/Approval Receipt,
purpose, scope, nonce, limits, expiry, trusted-clock evidence, and source build
identity. The command record has its own digest.

The Phase B bundle includes Provider and DB Credential Authorities and Brokers,
Connection, Collector, Principal Capability, Provider TLS, and PostgreSQL TLS.
For each exported policy owner it also binds a domain-separated canonical
policy-record digest, so an unchanged ID/revision with changed policy bytes is
not accepted. Resolution is exact revision only. The same command ID with a different full
binding is a conflict, never an idempotent success.

## Lifecycle, retry, and crash windows

The lifecycle states are:

- `UNRESERVED`
- `RESERVATION_OUTCOME_UNKNOWN`
- `RESERVED_NOT_STARTED`
- `ATTEMPT_STARTED`
- `CONSUMED_SUCCESS`
- `CONSUMED_FAILURE`
- `OUTCOME_UNKNOWN`
- `CANCELLED_PRE_START`
- `EXPIRED_PRE_START`

Reservation and attempt start require exact Approval, Approval Receipt,
Command, execution binding, Phase B dependency, target, clock, expiry, and
revocation revalidation. Authoritative revalidation provenance is owned by the
future persistence transaction: lifecycle validators bind that record to the
exact qualified clock evidence, evaluation timestamp, persisted clock floor,
command, target, and Phase B bundle. Persistence port callers do not supply
precomputed ACTIVE assertions. Persistence ports require approval revalidation and
reservation to be one atomic operation, attempt start to be a durable CAS, and
terminal state plus append-only receipt to be one atomic finalization.

Reservation and attempt identifiers/digests are write-once lineage. A later
transition cannot clear or replace them. Pre-start cancellation/expiry and all
ambiguous write stages require atomic terminal lifecycle plus receipt handling;
ambiguous storage responses require store reconciliation and never authorize
execution.

The future external operation may start only after `ATTEMPT_STARTED` is durable.
After an actual or possibly-started attempt, the command and approval are
consumed or quarantined. Automatic retry is zero. A new attempt after failure,
ambiguity, cancellation, or expiry requires a new explicit Human Approval and
new command identity.

Ambiguous reservation, attempt-start, operation-result, or finalization writes
never imply failure or success. They produce `RESERVATION_OUTCOME_UNKNOWN` or
`OUTCOME_UNKNOWN`, prohibit retry, and require human review or read-only
reconciliation even if approval or dependencies expired while reconciliation
was delayed. Restart with an actively valid reserved-but-not-started command
uses an explicit fail-closed cancellation transition and append-only receipt;
restart with a started command uses an explicit `OUTCOME_UNKNOWN` transition.

Reservation commit ambiguity uses three authoritative readback outcomes rather
than a generic receipt append. `RESERVATION_CONFIRMED_ABSENT` requires an exact
readback of the Command, Approval, Approval Receipt, execution binding,
`UNRESERVED` lifecycle/version, and confirmed absence of both reservation and
approval binding. Only that branch may apply
`UNRESERVED -> RESERVATION_OUTCOME_UNKNOWN` with a matching receipt whose
reservation and attempt references are null. Confirmed absence does not make the
old Approval or Command reusable.

`RESERVATION_CONFIRMED_PRESENT` requires the exact intended reservation ID and
digest plus the same lineage/binding and a `RESERVED_NOT_STARTED` lifecycle.
Only that branch may apply the existing `RESTART_RESERVED_CANCEL` transition to
`CANCELLED_PRE_START` and atomically append its cancellation receipt. A
`RESERVATION_OUTCOME_UNKNOWN` receipt is invalid for this branch.

`RESERVATION_STORAGE_OBSERVATION_UNKNOWN` covers unavailable storage, schema
mismatch, read timeout/outcome ambiguity, unexpected duplicates, and digest
mismatch. It permits no lifecycle mutation, receipt append, retry, fallback
store, latest lookup, or new reservation write; the command and Approval remain
quarantined for manual review. Thus the original driver error is never treated
as authoritative storage state, and no single blindly supplied receipt can
serve both the absent and present branches.

The branch observation is not caller input. The persistence port performs the
exact authoritative readback internally, derives its observation digest, and
returns that evidence with the result. The same port operation applies only the
matching lifecycle transition and receipt in an atomic boundary. A
caller-constructed provenance literal or observation has no authority. Audit
verification requires the returned terminal lifecycle to be the exact
`observed lifecycle version + 1` successor; a digest-valid but non-successor
terminal record is rejected.

## Execution Receipt boundary

The Phase C Execution Receipt is append-only and binds command and execution
digests, complete approval lineage, reservation, attempt, terminal state,
result classification, and clock evidence. Receipt supersession is prohibited
in v1 rather than accepted without authoritative resolution.
An `OUTCOME_UNKNOWN` receipt is mandatory where final outcome is ambiguous; it
records quarantine, possible execution, retry prohibition, and manual review
without fabricating success or failure.

The Phase C Execution Receipt is not the Gate 2 formal production-evidence
receipt authority and does not establish
`PRODUCTION_RECEIPT_AUTHORITY_ESTABLISHED`. A later explicit Gate 2 integration
authority must bind formal evidence content to the Phase C receipt.

## C2 and production boundary

C2 requires a separately approved storage-backed implementation and any exact
schema or migration artifacts. It must prove persistent uniqueness, atomic CAS,
concurrent one-winner behavior, crash semantics, restart survival, trusted
clock failure/regression handling, and atomic terminal receipt append using an
isolated environment. An in-memory fixture cannot establish durability.

Even after C2 source qualification, an external probe still requires a pinned
probe plan, broker and credential implementations, a connection adapter,
isolated runner/IPC boundary, exact one-shot approval, and separate explicit
human authorization. Formal Gate 2 additionally requires every G2-A
prerequisite. Production access, runtime binding, deployment, and automatic
phase transition remain prohibited.
