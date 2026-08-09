# Production Identity Query Authority v3 Remediation Candidate

## Decision boundary

```yaml
status: CANDIDATE_FOR_APPROVAL
authority_id: farmos.production-target-identity-query.v3
adoption_status: NOT_ADOPTED
runtime_binding_status: NOT_RUNTIME_BOUND
execution_enabled: false
automatic_latest_selection: false
production_connection: 0
credential_resolution: 0
database_read: 0
database_write: 0
```

This candidate remediates one confirmed PostgreSQL name-resolution failure in
`A_TRANSACTION_SERVER_GATE`. It does not adopt v3, change the active runtime
binding, approve PostgreSQL compatibility, or authorize execution.

## Root cause and exact remediation

The v2 Section A statement defines the output alias `row_key` in a SELECT with
no input relation and then uses `ORDER BY row_key COLLATE "C"`. Because the
alias is used inside a collation expression, PostgreSQL resolves `row_key`
against the input namespace. No input column exists, so PostgreSQL 16 and 17
both reported SQLSTATE `42703` at section ordinal 1 with zero completed
sections.

The v3 artifact is
`scripts/sql/farm_os_production_identity_readonly_v3.sql`, SHA-256
`59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81`.
It removes only Section A's redundant `ORDER BY` clause. Section A is a single
SELECT with no `FROM`, CTE, or union and always produces exactly one row, so
ordering has no semantic effect. Its four output aliases and exact payload keys
remain unchanged. The executable statements for Sections B through J are
byte-equivalent to v2.

## Versioning and runtime separation

The v2 artifact remains immutable at SHA-256
`202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95`.
The v3 candidate records a proposed supersession of v2 with both runtime and
authority-transition effects set to `NONE`. Exact-ID resolution supports v1,
v2, and the v3 candidate; there is no latest-version selection or fallback.

The v3 verifier applies a version-specific rule: Section A must have no
`ORDER BY`, while Sections B through J must retain the reviewed
`ORDER BY row_key COLLATE "C"` suffix. The existing v2 verifier and the shared
result parser are unchanged.

## Qualification boundary

The isolated qualification executor v2 is fixed to the exact v3 candidate ID,
digest, and section plan. Its evidence and failure lineage cannot emit the v2
query identity. Bootstrap authority, PostgreSQL majors, fixture, principal,
transaction, rollback, cleanup, sanitation, and zero-production-operation
rules are unchanged.

Source tests and fake-adapter tests do not establish PostgreSQL compatibility.
Technical qualification remains blocked until a separately approved Docker run
produces the full PG14/15 negative and PG16/17 absent/present six-record matrix.
