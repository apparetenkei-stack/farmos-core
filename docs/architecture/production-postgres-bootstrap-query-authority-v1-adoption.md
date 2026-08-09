# Production PostgreSQL bootstrap query authority v1 adoption

Status: `REPOSITORY_AUTHORITY_ADOPTED / RUNTIME_NOT_BOUND / EXECUTION_NOT_AUTHORIZED`.

## Decision boundary

This amendment adopts
`farmos.production-postgres-version-bootstrap-query.v1` as a formal,
repository-owned query authority. It does not bind that authority to the
runtime, authorize PostgreSQL compatibility qualification, enable the v2
production-identity runtime, resolve credentials, connect to PostgreSQL, or
execute Docker.

The adopted identity is exact:

- version: `v1`
- purpose: `postgres_compatibility_preflight`
- artifact:
  `scripts/sql/farm_os_production_postgres_version_bootstrap_query_v1.sql`
- raw byte count: 77
- encoding/line ending: UTF-8 without BOM, LF only, one trailing LF
- SHA256:
  `sha256:18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a`
- review: `APPROVED`
- adoption: `ADOPTED`
- runtime binding: `NOT_RUNTIME_BOUND`
- execution authorized: false
- automatic latest selection: false

The single formal Repository Authority source of truth is
`src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority.ts`.
The older compatibility requirement in the default-disabled runtime foundation
is an unchanged runtime-foundation snapshot. Its
`REQUIRED_NOT_APPROVED`/null-authority values are not a Repository Authority
registry and must not be used to decide repository adoption.

## Candidate history and adoption lineage

The Phase 1 candidate remains an immutable history record with
`CANDIDATE_FOR_APPROVAL`, `REQUIRED_NOT_APPROVED`, repository-adopted false,
the same candidate SHA, the source-foundation commit
`5713ecfa2cdbcecb2e14fa47946424bca7b353ff`, and its prior Sol review fact.
That prior review is historical evidence and is not treated as self-issued
adoption authority.

The separate adoption lineage records candidate review followed by formal
adoption. It explicitly assigns no runtime-binding or execution effect.
Therefore:

`BOOTSTRAP_AUTHORITY_ADOPTED` does not imply `BOOTSTRAP_RUNTIME_BOUND`.

The approval reference in the adopted entry is effective only with the final
independent Sol review of this actual adoption diff. A declaration inside the
registry cannot bypass that review gate.

## Artifact and result contract

The loader has arity zero and resolves only the fixed tracked artifact. Caller
path, caller SQL, missing bytes, digest mismatch, byte-count drift, BOM, CRLF,
or missing trailing LF fail closed. There is no embedded query fallback.

The exact result is one row with one own key, `server_version_num`. Its value
must be a non-negative safe integer. Missing/unknown keys, arrays at the row
level, strings, coercion, fractional values, non-finite values, and unsafe
integers are rejected. PostgreSQL major is derived as
`floor(server_version_num / 10000)`. The result-set parser accepts exactly one
row.

The SQL artifact is a single `SELECT` with zero parameters, caller inputs,
DDL, DML, dynamic SQL, grants, role mutation, business-table reads, session or
client address inspection, provider metadata, or external calls.

## Versioning and rollback

The registry resolves exact authority IDs only. It has no `current`, latest,
version-sort, or fallback resolver. Changing any query byte cannot overwrite
the v1 digest. It requires a new v2 candidate followed by independent review,
Repository adoption, and a separate runtime-binding gate.

Before commit, rollback is removal of this adoption diff. After formal adoption
is committed, history must not be erased: rollback requires a separately
reviewed revocation or supersession amendment that retains the v1 entry and
digest. No database compensation is involved because this adoption performs no
execution or persistence.

## Compatibility and runtime state

The qualification source can now observe that an approved Repository Authority
exists, but reports:

- bootstrap runtime binding: `NOT_RUNTIME_BOUND`
- technical PostgreSQL qualification: `NOT_RUN`
- Docker runner calls: 0
- production operations: 0
- runtime authority closure: false
- runtime evidence assembly: `BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY`

PostgreSQL 14/15 remain not eligible. PostgreSQL 16/17 remain policy-eligible
pending isolated qualification, not execution-eligible. PG18+ remains
unreviewed. `BLOCKED_POSTGRES_COMPATIBILITY` remains active, the v2 runtime
binding remains default-disabled, and active v1/runtime-foundation behavior is
unchanged.
