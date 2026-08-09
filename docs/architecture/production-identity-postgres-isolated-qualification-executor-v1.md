# Production Identity PostgreSQL isolated qualification executor v1

## Status and purpose

This supplemental phase defines
`farmos.production-identity-postgres-isolated-qualification-executor.v1` as
the repository-owned executor for isolated PostgreSQL compatibility
qualification. It does not change the source-only Phase 1 planner, bind the
production runtime, approve a production target, or close PostgreSQL
compatibility by itself.

The fixed matrix is PostgreSQL 14, 15, 16, and 17. PostgreSQL 14 and 15 run the
bootstrap and catalog capability negative path only. PostgreSQL 16 and 17 run
both `MIGRATION_HISTORY_ABSENT` and `MIGRATION_HISTORY_PRESENT` using the exact
11-section v2 plan. PostgreSQL 18 and later remain unreviewed.

## Entry point and caller boundary

The only entry point is
`scripts/hermes/run_farm_os_production_identity_postgres_qualification.ts`.
With no arguments it reuses local images only. The sole optional argument is
`--allow-image-pull`; it permits pulls of the four exact tags after separate
human execution approval. The caller cannot supply a registry, image, major,
SQL path, query digest, container name, password, host, network, database URL,
or output path.

The package entry point is:

```text
pnpm run run-farm-os-production-identity-postgres-qualification-isolated
```

Do not run it as part of source validation. Docker execution and image pulls
require the separate qualification approval. This supplemental implementation
phase performs neither.

## Artifact and version gates

The executor loads only these fixed repository artifacts:

- bootstrap authority
  `farmos.production-postgres-version-bootstrap-query.v1`, SHA-256
  `18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a`
- v2 query authority `farmos.production-target-identity-query.v2`, SHA-256
  `202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95`

Raw-byte verification precedes execution. The v2 artifact must produce the
reviewed 11-section plan. No full-file blind execution or caller SQL is
available. H2 is invoked only when H1 reports the migration history relation as
present; otherwise the reviewed not-applicable sentinel is inserted in memory.

## Docker and image boundary

Allowed images are exactly `postgres:14`, `postgres:15`, `postgres:16`, and
`postgres:17`. The adapter pins every command to the local
`unix:///var/run/docker.sock` endpoint, uses a minimal fixed child environment,
uses argv arrays and no shell, and enforces the Docker argv grammar in the
command runner itself. Its operation set is
limited to exact image inspection, optional exact pull, fixed isolated run,
exact container inspection, and removal of an exact owned container ID. There
is no prune, wildcard removal, named volume, link, custom registry, arbitrary
container target, or production-network discovery.

Each container has a generated fixed-prefix name, a qualification ownership
label, the returned 64-hex container ID, and the inspected image ID. Its only
published port is a Docker-assigned random port bound to `127.0.0.1`. PGDATA is
tmpfs and restart is disabled. Cleanup re-inspects the exact ID and requires
the name, label, image ID, and port binding to match before `docker rm --force`
is issued for that ID. An ownership mismatch holds the container instead of
expanding deletion authority.

Image metadata records the exact tag, image ID, and official `postgres@sha256`
RepoDigest. A missing image returns `IMAGE_MISSING` unless the explicit pull
phase was selected.

## Fixture and credential boundary

The fixture password is generated from process-local cryptographic randomness
for each container. It exists only in memory, the isolated container
environment, the admin client configuration, and the isolated qualification
client configuration. It is never accepted from the caller or written to a
file, command argument, stdout, stderr, documentation, or evidence. Docker
receives only the fixed `POSTGRES_PASSWORD` environment-variable name in argv;
the value is supplied in the child environment. The formal fixture SQL uses a
non-credential placeholder that is replaced in memory immediately before the
admin setup connection executes the fixed statement list.

The setup administrator is used only for the synthetic fixture database. It
creates the fixed schemas, roles, memberships, relations, sequence, function,
trigger, RLS policies, ACLs, and optional five-row migration history fixture.
There is no arbitrary SQL input or production credential resolver.

Readiness is limited to 30 admin connection probes at 250 ms intervals. This is
the only retry loop. Qualification queries have retry count zero.

## Qualification principal and transaction

Bootstrap, capability, and v2 queries use
`farmos_identity_qualification`, never the setup administrator. The executor
requires that role to be non-superuser, without create-database, create-role,
replication, or bypass-RLS authority, and a member of `pg_monitor`.

The positive path starts exactly:

```text
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY
```

It then applies transaction-local statement, lock, and idle-in-transaction
timeouts and verifies `transaction_read_only=on`. The session interface has no
commit method. Success rolls back; failure rolls back if the transaction began.
Evidence is not returned unless rollback and exact container cleanup succeed.

## Parser, sanitation, and catalog semantics

The executor passes raw section rows directly to the repository v2 candidate
parser and sanitizer in process memory. Raw rows, Docker logs, SQL definitions,
connection data, and cluster identifiers are never logged or persisted.

Positive qualification additionally requires actual fixture observations for:

- ACL default classes `r`, `s`, `f`, and `n`, PUBLIC, explicit grants, grant
  option, and PG16+ membership options;
- RLS-disabled relation, RLS-enabled relation with zero policies, and
  RLS-enabled relation with five policies;
- ALL, SELECT, INSERT, UPDATE, and DELETE policies, permissive and restrictive
  modes, PUBLIC and named roles, and USING/WITH CHECK expressions;
- the synthetic default, proconfig, function, constraint, index, trigger, and
  RLS markers in raw in-memory catalog results.

The final sanitized candidate must contain digests, contain none of those
markers, exclude the raw cluster identifier, and exclude the fixture password
and all forbidden raw keys. Only the compact qualification evidence contract is
serialized to stdout.

Before Docker access, the CLI requires every fixed executor, adapter, contract,
parser, authority, package-script, and SQL source file to be tracked at HEAD and
clean relative to HEAD. It computes a canonical SHA-256 across those bytes,
prints a lineage envelope, and binds the complete 64-hex digest into each
qualification ID. The executor-bound evidence parser requires an exact lineage
commit and digest match, and the executor closure accepts only the complete
six-record matrix through that parser. An evidence record without its matching
lineage envelope is not admissible executor qualification evidence. Unrelated
working-tree files do not expand or replace this fixed source set.

## Evidence and failures

Successful and expected-negative records use
`farmos.production-identity-postgres-qualification-evidence.v1` and are parsed
again before output. Evidence persistence is zero; stdout is the only sink.
Qualification failures use the exact-key, lineage-bound diagnostic contract
`farmos.production-identity-postgres-qualification-failure.v2`. It records only
the allowlisted failure phase, formal section ID and ordinal, completed SQL
section count, canonical five-character SQLSTATE or `null`, transaction,
rollback and session-close state, exact-owned cleanup state, primary and terminal failure codes,
and the fixed executor/query/bootstrap authority lineage. It never includes an
exception message, detail, hint, context, position, SQL text, object identifier
from an error payload, driver object, credential, connection data, catalog row,
or Docker log. CLI failures that occur before repository lineage is available
remain the separate pre-lineage executor error v1 and are not qualification
diagnostic evidence.

The completed-section count is parser-bound to the exact failed ordinal and
fixture case, and includes only successfully executed SQL sections.
The in-memory H2 not-applicable sentinel does not increment it. Adapter
allowlist rejection, database query rejection, and result materialization are
distinct phases. SQLSTATE is copied only from an authentic PostgreSQL
`DatabaseError` and only when it matches `^[0-9A-Z]{5}$`; otherwise it is
`null`. Parser and sanitizer handoffs are also distinct phases. Rollback and
session close are tracked separately. Rollback, session-close, or cleanup
failure becomes the terminal failure without replacing the
primary failure code, phase, section, ordinal, completed count, or SQLSTATE.
Only actual successful owned-container cleanup sets
`container_cleanup_performed=true`.

This diagnostic contract does not amend the v2 SQL authority, fixture
privileges, qualification principal, PostgreSQL compatibility policy, runtime
binding, or success evidence. In particular it does not grant access to
`pg_control_system()` and does not establish the cause of a section failure.

The error taxonomy includes Docker/image/container/readiness/setup/bootstrap/
capability/artifact/transaction/section/parser/sanitizer/rollback/session-close/
cleanup and evidence failures. `CLEANUP_FAILED` invalidates a case. A successful source
review is not an actual PostgreSQL qualification and must not be represented as
`QUALIFIED`.

## Production isolation and current phase

The executor has no production host input, DB URL input, environment-file
loader, HTTP client, production credential resolver, production evidence
writer, migration runner, runtime binding, or enablement switch. It does not
write confirmed business data.

This source supplement runs only fake-adapter tests and static validation:

```text
pnpm run test-farm-os-production-identity-postgres-qualification-executor
pnpm run typecheck-farm-os-production-identity-postgres-qualification-executor
```

Actual Docker matrix execution remains a separately approved phase. Source
review completion therefore leaves `BLOCKED_POSTGRES_COMPATIBILITY` in place
until the isolated evidence matrix and final semantic review pass.
