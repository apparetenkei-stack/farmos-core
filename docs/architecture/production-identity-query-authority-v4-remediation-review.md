# Production Identity Query Authority v4 Ordering Remediation Candidate

## Decision boundary

```yaml
status: CANDIDATE_FOR_APPROVAL
authority_id: farmos.production-target-identity-query.v4
adoption_status: NOT_ADOPTED
runtime_binding_status: NOT_RUNTIME_BOUND
execution_enabled: false
automatic_latest_selection: false
production_connection: 0
credential_resolution: 0
database_read: 0
database_write: 0
```

This source-only candidate preserves the immutable v2 and v3 artifacts. It
does not adopt v4, change the production runtime binding, establish PostgreSQL
compatibility, or authorize production execution.

## Actual evidence and root cause

The fixed v3 qualification matrix reached Section B on PostgreSQL 16 and 17
for both migration-history fixture cases. All four eligible cases completed
Section A and then failed `B_CLUSTER_IDENTITY_SOURCE`, ordinal 2, with SQLSTATE
`42703`. The adapter authority agreement and the v3 Section A remediation both
passed actual execution. SQLSTATE `42501` was not observed, so no principal,
`pg_monitor`, or `GRANT` remediation is indicated.

Section B defines `row_key` only as a SELECT output alias and then embeds it in
`ORDER BY row_key COLLATE "C"`. The collation makes `row_key` an expression
operand, so PostgreSQL resolves it against the input namespace. The only input
is `pg_catalog.pg_control_system() AS control`, which does not expose a
`row_key` column. This is the same alias-resolution mechanism previously
confirmed for Section A.

## Exact ordering remediation

Read-only analysis proved the same invalid outer-input lookup in C, D, E, H1,
I, and J. These are structural findings, not claims of actual execution
failures. F, G, and H2 already select from an `output` relation that exposes
`row_key`, so their existing terminal ordering is valid.

The v4 artifact makes only these reviewed changes:

- B removes redundant terminal ordering; its contract requires one row.
- C orders by `expected.schema_name COLLATE "C"`.
- D removes redundant terminal ordering; current-user lookup is at most one row.
- E orders by `expected.binding_name COLLATE "C"`.
- H1 removes redundant terminal ordering; it returns one status row.
- I removes redundant terminal ordering; operator lookup is at most one row.
- J removes redundant terminal ordering; it returns one aggregate row.

Section A and Sections F, G, and H2 are executable-byte identical between v3
and v4. C and E preserve bytewise deterministic ordering by the exact input
expressions from which their output `row_key` values are derived. Output
columns, payload keys, parser semantics, sanitation, H1/H2 orchestration, and
transaction behavior are unchanged.

## Authority and lineage

The v4 artifact SHA-256 is
`e83987c840cc941cf5e6dcff93d46345464db0019ea5beb5143b0222316e05ca`.
It is an exact-ID-only candidate supersession proposal for v3. Resolution does
not accept `latest`, highest-version, status-based selection, or fallback.

Qualification uses a new formal lineage rather than mutating the v3-bound
lineage in place:

- isolated qualification executor v3;
- executor lineage v3;
- success evidence v3;
- failure evidence v4;
- CLI executor-error v3;
- query authority v4;
- unchanged bootstrap v1 and result/runtime contract v2.

Historical evidence and error parsers remain fixed to their original executor
and query identities and mutually reject current records. The adapter accepts
only the immutable v4 agreement plan with exact authority, query digest,
section, ordinal, statement digest, and statement bytes. It does not maintain
an independent current-statement SQL allowlist.

## Qualification boundary

Source and fake-adapter tests do not establish PostgreSQL compatibility. The
compatibility and qualification-integrity blockers remain active until a
separately approved, commit-fixed six-record Docker matrix, regressions, and
final review all pass.
