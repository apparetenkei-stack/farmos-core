# Production Identity PostgreSQL Isolated Qualification Executor v4

```yaml
authority_id: farmos.production-identity-postgres-isolated-qualification-executor.v4
lineage: farmos.production-identity-postgres-qualification-executor-lineage.v4
query_target: farmos.production-target-identity-query.v5
query_sha256: sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52
query_target_status: CANDIDATE_FOR_APPROVAL
runtime_binding: NONE
production_target: FORBIDDEN
evidence_persistence: STDOUT_ONLY
```

Executor v4 is the source-only successor to executor v3. It binds the changed
query v5 artifact and the present-only exact H2 fixture capabilities without
reinterpreting executor v1-v3 evidence.

The executor derives eleven immutable statement agreements from the verified
v5 artifact. Each binds query authority ID and digest, section ID and ordinal,
statement digest, and exact statement bytes. The executor, fake session, and
real adapter share the same validator. A v4 plan, wrong authority or digest,
mutated SQL, and arbitrary SQL are rejected; no independent current SQL
hardcode, latest resolution, or fallback exists.

Current formal output is success evidence v4, failure evidence v5, CLI
executor-error v4, executor v4, executor-lineage v4, query v5, unchanged
bootstrap v1, and result/runtime contract v2. Historical success v2/v3,
failure v2/v3/v4, and CLI error v1/v2/v3 records remain bound to their original
lineages and mutually reject current records.

PG14/15 remain negative capability cases. PG16/17 retain absent and present
migration-history cases. H1 is catalog-only; absent has no core schema USAGE or
history SELECT grant and skips H2. Present grants exact schema USAGE and exact
table SELECT after relation creation, then invokes the byte-preserved H2 once.
Transactions remain `REPEATABLE READ READ ONLY`, successful cases roll back,
sessions close, and exact-owned containers clean up. Evidence exposes no
credentials, raw errors, raw catalog payloads, or cluster identifiers.

Source-only completion is not technical qualification. Docker qualification,
production access, v5 adoption, and runtime binding require separate human
approval.
