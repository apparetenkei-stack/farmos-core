# Production Identity PostgreSQL Isolated Qualification Executor v2

## Status

```yaml
authority_id: farmos.production-identity-postgres-isolated-qualification-executor.v2
purpose: isolated_postgres_compatibility_qualification
query_target: farmos.production-target-identity-query.v3
query_target_status: CANDIDATE_FOR_APPROVAL
runtime_binding_required: false
production_target: FORBIDDEN
production_credential: FORBIDDEN
execution_in_this_phase: 0
```

Executor v2 is a source-only successor to executor v1. It changes only the
fixed query candidate and its lineage contract. It does not modify or select
the production runtime authority.

The executor derives an immutable statement-authority agreement plan from the
verified v3 artifact. Every agreement binds the query authority ID and digest,
section ID and ordinal, statement digest, and exact statement bytes. The real
PostgreSQL adapter validates the complete supplied plan against the same formal
v3 artifact before opening a session, then accepts section execution only when
the individual immutable agreement exactly matches that plan. Auxiliary
bootstrap, capability, and principal queries retain their separate exact-string
allowlist. The adapter does not load v2 statements as current execution
authority and does not accept caller SQL, prefix matches, or wildcard matches.

The shared pure agreement validator is also used by the fake executor session.
Source-only tests instantiate the real adapter validation layer without Docker
and prove that all v3 statements are accepted while historical v2 Section A,
wrong authority/digest/section values, mutated statements, and arbitrary SQL are
rejected. Historical executor v1 and query v2 evidence parsers remain separate
and immutable; no historical execution path is silently rebound to v3.

## Fixed authority lineage

The executor accepts no caller-supplied query ID, path, digest, SQL, host,
database URL, image tag, or credential. Its query target is exactly:

- authority `farmos.production-target-identity-query.v3`;
- artifact `scripts/sql/farm_os_production_identity_readonly_v3.sql`;
- SHA-256 `59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81`.

Success evidence v2 uses generic `query_authority_id` and `query_sha256`
fields. Failure diagnostic v3 retains the v2 key set and SQLSTATE, ordinal,
rollback, cleanup, and secret boundaries, while binding those generic query
fields to v3. The historical failure.v2 parser remains fixed to executor v1,
query v2, and the immutable v2 digest; it does not accept v3 records. Executor
lineage is versioned as
`farmos.production-identity-postgres-qualification-executor-lineage.v2`.

CLI failures that occur before repository lineage is available use a separate
exact-key executor-error contract. Historical
`farmos.production-identity-postgres-qualification-executor-error.v1` remains
immutable with its original executor v1 envelope and historical query v2
authority metadata. The current CLI emits only
`farmos.production-identity-postgres-qualification-executor-error.v2`, fixed to
executor v2, executor-lineage v2, query v3 and its reviewed digest, and the
unchanged bootstrap authority. The v1 and v2 parsers reject each other's
records and reject unknown keys. Neither envelope admits exception text, SQL,
credentials, connection data, host data, Docker logs, or catalog payloads.

## Preserved execution boundary

PostgreSQL 14 and 15 remain negative-capability-only. PostgreSQL 16 and 17
retain the absent/present fixture cases and exact section-by-section execution.
The qualification principal, fixture SQL, grants, bootstrap authority,
read-only transaction, zero retry, sanitation, stdout-only persistence, and
exact cleanup rules are unchanged.

No Docker, container, image, PostgreSQL, credential, or production operation is
performed by adopting this source candidate. A full six-record isolated run
requires separate human approval.
