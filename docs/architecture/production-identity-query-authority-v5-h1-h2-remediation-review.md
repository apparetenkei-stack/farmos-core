# Production Identity Query Authority v5 H1/H2 Remediation Candidate

## Decision boundary

```yaml
status: CANDIDATE_FOR_APPROVAL
authority_id: farmos.production-target-identity-query.v5
query_sha256: sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52
supersedes_proposal: farmos.production-target-identity-query.v4
adoption_status: NOT_ADOPTED
runtime_binding_status: NOT_RUNTIME_BOUND
execution_enabled: false
automatic_latest_selection: false
technical_qualification: NOT_RUN
docker_execution_count: 0
production_operations: 0
```

This source-only candidate preserves v2, v3, and v4 bytes and semantics. It
does not adopt v5, change runtime binding, establish PostgreSQL compatibility,
resolve production credentials, provision grants, or authorize production
execution.

## H1 catalog existence capability

Actual PG16/PG17 absent and present evidence reached H1 at ordinal 8 after
seven completed sections and failed with SQLSTATE `42501`. H1 v4 used
`pg_catalog.to_regclass('core_schema.migration_history')`; qualified-name
resolution crossed the qualification principal's missing `core_schema` USAGE
boundary.

H1 v5 instead observes exact catalog structure by joining
`pg_catalog.pg_namespace` and `pg_catalog.pg_class` on
`class.relnamespace = namespace.oid`, with fixed predicates
`namespace.nspname = 'core_schema'`, `class.relname = 'migration_history'`, and
`class.relkind IN ('r', 'p')`. It uses no search path, dynamic SQL, or caller
input. Missing schema, missing relation, and wrong relation kind all produce
the existing one-row `absent` result. Views, indexes, materialized views, and
other relation kinds do not count as present.

The H1 result contract is unchanged: section
`H1_MIGRATION_HISTORY_EXISTENCE`, row key
`core_schema.migration_history`, payload keys `collection_status`, `relation`,
and `state`, states `present | absent`, and sanitization class
`SAFE_STRUCTURAL`.

## H2 exact read capability

H1 is catalog structural observation and does not imply relation-read
authority. H2 remains the exact v4 direct relation read, byte-for-byte. The
absent fixture grants neither `USAGE ON SCHEMA core_schema` nor `SELECT ON
core_schema.migration_history`, and H2 is not invoked. The present fixture,
after creating the relation, grants only:

```sql
GRANT USAGE ON SCHEMA core_schema TO farmos_identity_qualification;
GRANT SELECT ON TABLE core_schema.migration_history TO farmos_identity_qualification;
```

No superuser, `pg_read_all_data`, schema CREATE, schema-wide/future-table
SELECT, `ALL PRIVILEGES`, or read/write privilege widening is introduced. H2
is invoked once and retains its five synthetic rows.

For a future production target, these exact privileges are required only when
the history table is present. When it is absent, neither capability is needed.
This is a design requirement only; this phase implements no credential
resolver or GRANT provisioning.

## Preservation, authority, and blockers

Sections A-G, H2, I, and J are executable-byte identical between v4 and v5.
Exact-ID resolution covers v1-v5 and accepts no latest/highest/status fallback.
Executor v4, executor-lineage v4, success evidence v4, failure evidence v5,
and CLI executor-error v4 bind query v5 and its digest. Historical lineages
remain separately parsed and mutually reject current records. The shared fake
and real adapter validator binds authority ID, query digest, section, ordinal,
statement digest, and exact statement bytes; a v4 plan is rejected in the v5
path.

`BLOCKED_POSTGRES_COMPATIBILITY` and
`BLOCKED_POSTGRES_QUALIFICATION_INTEGRITY` remain active. Source/fake tests do
not establish technical qualification; a separately approved commit-fixed
Docker qualification is still required.
