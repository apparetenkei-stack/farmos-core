# Production Identity PostgreSQL Isolated Qualification Executor v3

```yaml
authority_id: farmos.production-identity-postgres-isolated-qualification-executor.v3
lineage: farmos.production-identity-postgres-qualification-executor-lineage.v3
query_target: farmos.production-target-identity-query.v4
query_target_status: CANDIDATE_FOR_APPROVAL
runtime_binding: NONE
production_target: FORBIDDEN
evidence_persistence: STDOUT_ONLY
```

Executor v3 is the source-only successor to executor v2. It changes the fixed
qualification query and formal evidence lineage from query v3 to query v4. It
does not adopt v4, select a production runtime authority, or authorize any
production connection.

The executor loads the verified v4 artifact and derives one immutable
statement-authority agreement for each of its eleven sections. Every agreement
binds the query authority ID and digest, section ID and ordinal, statement
digest, and exact statement bytes. The real PostgreSQL adapter validates the
complete plan against the same formal v4 artifact before session use and then
executes only an exact agreement. Bootstrap, capability, and principal
operations retain their separate exact auxiliary allowlist.

The shared pure validator is used by the executor boundary, fake session, and
real adapter validation layer. A v3 agreement, a wrong authority or digest, a
mutated statement, and arbitrary SQL are rejected in the v4 path. No latest or
fallback authority resolution exists.

The current formal output lineage is success evidence v3, failure evidence v4,
CLI executor-error v3, executor v3, executor-lineage v3, query v4, bootstrap
v1, and result/runtime contract v2. Historical v1/v2 executors, v2 success
evidence, v2/v3 failures, and v1/v2 CLI errors remain independently parsed and
cannot be rebound to v4.

The PostgreSQL matrix remains fixed to PG14 and PG15 negative capability cases
and PG16 and PG17 absent/present migration-history cases. H2 remains conditional
on H1. Transactions remain `REPEATABLE READ READ ONLY`, successful cases end in
rollback, failure after begin attempts rollback, every session is closed, and
every exact-owned container is cleaned. Credentials, raw database errors, raw
catalog payloads, and cluster identifiers are excluded from stdout evidence.

Source-only success is not technical qualification. Docker qualification,
production execution, v4 adoption, and runtime binding require separate human
approval.
