# Production Identity Query Authority v2 PostgreSQL compatibility qualification Phase 1

Status: `SOURCE_FOUNDATION_COMPLETE_CANDIDATE / EXECUTION_NOT_AUTHORIZED`.
This phase creates source artifacts only. It does not close
`BLOCKED_POSTGRES_COMPATIBILITY`, adopt bootstrap authority, change the runtime
binding, connect to PostgreSQL, or authorize Docker.

Historical-status note: this document preserves the Phase 1 candidate state at
source-foundation commit `5713ecfa2cdbcecb2e14fa47946424bca7b353ff`.
The subsequent formal Repository Authority adoption is recorded separately in
`production-postgres-bootstrap-query-authority-v1-adoption.md`; it does not
rewrite this candidate history or authorize runtime binding/execution.

## Authority separation

The exact bootstrap candidate is
`farmos.production-postgres-version-bootstrap-query.v1`, for
`postgres_compatibility_preflight`. Its tracked artifact is one statement and
has SHA256
`18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a`:

`SELECT current_setting('server_version_num')::integer AS server_version_num;`

It has zero caller inputs, credential-selection operations, mutations, business
reads, parameters, dynamic SQL, DDL, DML, role changes, session inspection, or
provider metadata. Its exact result is one row and one integer column named
`server_version_num`. The parser rejects missing or unknown keys, strings,
coercion, non-integers, unsafe integers, and invalid versions. PostgreSQL major
is derived with `floor(server_version_num / 10000)`.

The candidate status is `CANDIDATE_FOR_APPROVAL`; formal authority remains
`REQUIRED_NOT_APPROVED`. Repository adoption, runtime binding, and execution
are all false. Candidate presence and even valid isolated technical evidence do
not make it self-authorizing.

## Compatibility policy

The closed policy is:

- PostgreSQL 14 and 15: `NOT_ELIGIBLE` because the v2 SQL depends on
  `pg_auth_members.inherit_option` and `pg_auth_members.set_option`; formal
  reasons are `CATALOG_COLUMN_MISSING_INHERIT_OPTION` and
  `CATALOG_COLUMN_MISSING_SET_OPTION`.
- PostgreSQL 16 and 17:
  `POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION`, never execution-eligible
  before qualification.
- PostgreSQL 18 and later: `UNREVIEWED`; latest majors are not auto-accepted.

The Phase 1 PG14/15 plan runs only the bootstrap and catalog-capability probe in
a future authorized isolated execution. Full v2 executor calls remain zero.
PG16/17 use the same two-case matrix and must pass the 11-section orchestrator,
parser, sanitizer, H1/H2 behavior, read-only transaction rollback, and scoped
container cleanup. A technical `QUALIFIED` result still leaves runtime closure
false while bootstrap authority is unapproved.

## Isolated fixture and Docker plan

The single parameterized builder accepts only PostgreSQL major `14 | 15 | 16 |
17` and the migration-history case. Images are fixed internally as
`postgres:<major>`; callers cannot provide registries or arbitrary tags.
Container names use a fixed prefix and validated alphanumeric nonce. Docker
plans are argv arrays, not shell strings, and pin `--pull=never`,
`--restart=no`, loopback random port publication, tmpfs `PGDATA`, zero named
volumes, zero production networks, and zero retries. Cleanup is unavailable
until a successful create result supplies the exact expected name, ownership
label, and 64-hex container ID; cleanup then targets that ID only. The runner is
an interface only and is never called in Phase 1.

The synthetic full fixture defines `ai`, `audit`, and `core_schema`; a
non-superuser qualification login with `pg_monitor`; eight target roles and
representative membership option combinations; table, sequence, function,
column/default, constraint, partial index, trigger, ACL, and RLS catalog
classes. Representative sensitive objects use actual fixed section-G targets
(`ai.proposal_inbox`, `ai.proposal_creation_idempotency`,
`ai.proposal_execution_state`, and
`ai.enforce_proposal_creation_idempotency_transition()`), so they cannot sit
outside the catalog query universe. It carries no business rows. The query universe remains exactly 20
relations, 21 functions, and eight roles: representative objects are present
and all other targets must produce formal absent rows.

RLS includes disabled/zero-policy, enabled/zero-policy, and enabled/with-policy
relations. Representative policies cover `ALL`, `SELECT`, `INSERT`, `UPDATE`,
and `DELETE`; permissive and restrictive; `PUBLIC` and named roles; and
`USING`/`WITH CHECK`. ACL coverage includes table-like `r`, sequence `s`,
function `f`, and schema `n`, with null/default ACLs, explicit grants, grant
options, `PUBLIC`, and membership. Unknown relkind remains a unit-only
fail-closed case.

Case A omits `core_schema.migration_history`; H1 is absent, H2 invocation count
is zero, and the `not_applicable` sentinel is required. Case B creates it with
the five exact migration IDs and sequence/checksum-shaped synthetic rows; H1 is
present and H2 runs once. Both cases are identical for PG16 and PG17.

## Evidence and sanitation

The strict candidate evidence contract is
`farmos.production-identity-postgres-qualification-evidence.v1`. It pins
qualification and Git identity, observation time, PostgreSQL/image metadata,
bootstrap and v2 authority IDs and digests, runtime contract, section and
fixture counts, exact catalog-capability columns, executor-call and
executed-section counts, parser/sanitizer results, sensitive exposure counts,
H1/H2 invocation/row counts and case, classification,
transaction/rollback/cleanup state, `production_operations=0`, and
`secret_exposed=false`. Unknown or missing
fields, coercion, inconsistent major/version, and false success state are
rejected.

PG14/15 evidence requires zero capability columns, zero v2 executor calls,
zero executed sections, and no parser/sanitizer or transaction execution.
PG16/17 `QUALIFIED` evidence requires both capability columns, one v2 executor
call, correct 10-plus-sentinel or 11-section H1/H2 behavior, parser and sanitizer
success, zero sensitive exposure, rollback, and cleanup. Runtime qualification
closure accepts only a two-record absent/present matrix whose fixture digests
exactly match the two generated fixtures and whose Git, server, and image
lineage agree. A single case, zero assertions, or caller-chosen digest cannot
close technical qualification.

Classifications include `QUALIFIED`, `NOT_ELIGIBLE`, `BLOCKED_INCOMPATIBLE`,
`UNREVIEWED`, `QUALIFICATION_INCOMPLETE`, `CLEANUP_FAILED`, and
`BOOTSTRAP_AUTHORITY_UNAPPROVED`. Technical evidence validity and runtime
authority closure are separate. Identity assembly remains
`BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY`; the fixture cannot supply an approved
target manifest or confirm itself.

Synthetic secret markers deliberately cover column defaults, `proconfig`,
function bodies, constraints, partial indexes, trigger `WHEN`, RLS
`USING`/`WITH CHECK`, and raw cluster identity. Final evidence may contain only
major/image metadata, digests, counts, classifications, fixture IDs, and
cleanup status. It must contain zero marker occurrences, raw definitions,
cluster identifiers, fixture password, connection strings, or production-like
target data. There is no evidence writer or filesystem persistence in Phase 1.

## Completion and next approvals

Phase 1 validation is Docker-free and covers candidate bytes/digest, strict
parsers, policy/reason binding, command planning and injection rejection,
fixture generation, H1/H2, RLS/ACL/sensitive matrices, evidence sanitation,
and the four-major expected matrix. Existing runtime foundation, v2 authority,
authority-versioning, and v1 reconciliation regressions must remain green.

Rollback is source removal of the new candidate, contract, fixture, test,
scripts, and this document. No database or external compensation exists
because this phase performs no operation. Separate explicit approvals are
required first for stage/commit review, then bootstrap authority adoption, and
later for Docker-based isolated qualification. None implies another.
