# Production Identity Query Authority v2 runtime foundation

Status: `RUNTIME_AVAILABLE / DEFAULT_DISABLED`. This foundation does not make
v2 the active runtime binding and does not enable production execution. The
existing `farmos.production-target-identity-query.v1` parser, digest, and live
evidence contract remain the active runtime path.

## Track separation

Track A is repository authority adoption. Query authority v2 and the tracked
SQL artifact are adopted and approved there. Track B is runtime execution.
This change only makes the reviewed parser, sanitizer, artifact verifier, and
pure gate planner available to Track B. `RUNTIME_BOUND`,
`ACTIVE_RUNTIME_BINDING`, and `EXECUTION_ENABLED` are not reached.

## Runtime-owned result and evidence contracts

The single A–J / H1–H2 parser and sanitizer now lives in
`src/lib/hermes/farm_os_production_identity_query_v2_contract.ts`. The old
candidate module is a compatibility re-export; it is not a second parser.
Validation preserves exact schemas, row order, bounds, finite-number checks,
ACL and RLS/`pg_policy` semantics, H1/H2 completeness, digest-only handling,
and discard of raw cluster and catalog-sensitive text.

The runtime envelope is
`farmos.production-identity-runtime-evidence.v1`. It keeps query-observed,
manifest-expected, comparison, digest-derived, collector metadata, and
unavailable values separate. Provenance is emitted for every leaf. In
particular, environment, provider fingerprint, installation, and farm scope
manifest values cannot be copied into observed fields. Binding availability is
only availability; it is not an observed identity match. Consequently a fully
collected v2 result can still carry `IDENTITY_INCOMPLETE`.

The envelope cannot be cast to
`farmos.production-target-live-evidence.v1` without semantic loss: v1 cannot
preserve A–J evidence, expected/observed separation, comparisons, approval
lineage, or field provenance. The v1 parser is unchanged. A future live-evidence v2 contract is
required before consumer adoption.

## Pinned, default-disabled binding

The repository-owned foundation binding pins:

- authority `farmos.production-target-identity-query.v2`
- artifact `scripts/sql/farm_os_production_identity_readonly_v2.sql`
- SHA256 `sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95`
- the formal sanitized-result contract
- minimum PostgreSQL major 16
- `enabled=false`, no automatic latest selection, and zero retry

The binding parser accepts only that disabled object. Status-based or
latest-version selection is absent.

## Artifact and deployment policy

The loader has no caller path or SQL-string input. It resolves exactly the
tracked repository-relative artifact, reads raw bytes, verifies the pinned
digest, then verifies the exact ordered 11-section plan. Missing artifacts,
digest mismatch, unknown/reordered sections, or malformed statements block
before credentials. There is no embedded fallback.

Deployable packaging must explicitly include the tracked SQL at the same
repository-relative location. Artifact presence and SHA verification are
runtime preconditions; source-tree presence alone is not deployment evidence.

The planner never submits the file as one batch. Sections execute in reviewed
order. H2 is conditional on H1 `present`; H1 `absent` produces only the
reviewed runtime `not_applicable` sentinel.

## PostgreSQL compatibility and bootstrap requirement

The current SQL references `pg_auth_members.inherit_option` and `set_option`.
Those catalog columns exist in PostgreSQL 16 and are absent in PostgreSQL
14/15, so the policy blocks 14 and 15 and permits 16/17 only at the policy
layer. Full isolated PG16/17 qualification is still required before execution
readiness.

PG18 and later are not implicitly accepted; every new major requires explicit
review and qualification. Version must not be inferred from connection configuration. A bootstrap query
is required before parsing/executing the full v2 artifact:

`SELECT current_setting('server_version_num')::integer AS server_version_num;`

Its proposed bytes and digest are pinned in the requirement model, but no new
authority ID is invented. Bootstrap authority remains
`REQUIRED_NOT_APPROVED`, so compatibility remains a runtime blocker.

## Preconnection gate and ports

The pure planner evaluates, in order: binding enabled; exact binding authority;
artifact presence; artifact SHA; section plan; PostgreSQL bootstrap authority;
approved target manifest; approved collector authority; dedicated approved
`VERIFY_READER` connection authority; and valid reserved one-shot approval.
Only a future separately approved activation contract may make the final result
`ELIGIBLE_TO_RESOLVE_CREDENTIAL`. Phase 1 defines no such contract: the
planner exact-validates the only shipped binding, which is disabled, and is
structurally unable to reach credential eligibility. The ordered list records
the required future gates without granting activation authority.

Target manifest, PostgreSQL compatibility, collector, connection, approval, credential, connection, and
evidence-writer ports are interfaces only, with production implementations set
to `NONE`. Credential lookup inputs must be bound to target digest, purpose,
connection authority, and approval execution ID. Query authority cannot choose
a credential source. Provider lookups require caller-pinned IDs, digests, and
revisions; returned authority evidence carries approval/expiry and
`revoked=false` rather than implicit current/latest selection.

The future connection contract permits one connection, zero retries, and only
`REPEATABLE READ READ ONLY`; it exposes rollback and no commit operation. The
one-shot approval contract binds target, collector, query, connection,
principal, execution ID, nonce digest, timestamps, max execution count one,
and reservation state. The provider contract includes atomic reserve/consume
and failure-release operations. Replay or non-reserved approval is invalid.

The envelope recomputes the canonical approved-manifest digest, embeds its
approval reference, and binds collector, dedicated connection authority,
principal, execution ID, nonce digest, and approval times. Validation
recomputes database, cluster, and PostgreSQL comparisons. Comparison
provenance is derived from both query-observed and manifest-expected sources.

The future writer may accept only a validated, complete, sanitized envelope
bound to target and approval. Partial, raw-sensitive, unbound, or invalid
provenance input is rejected. Any later implementation must use canonical JSON,
SHA256, mode 0600, a fixed external directory, atomic write, and cleanup. No
production filesystem writer exists in this phase.

## Dependencies and rollback limits

Runtime evidence assembly remains blocked until an approved production target
manifest, collector authority, dedicated connection authority, one-shot
approval lineage, bootstrap compatibility authority, and PG16/17 isolated
qualification exist. Provider capacity and prefix-catalog fingerprint
authority also remain outside this foundation.

Rollback of this foundation is source removal only; the active v1 runtime does
not switch. v1 itself remains a historical unmaterialized SQL authority, so
this work does not improve v1 artifact rollback or reconstruct its preimage.
No production connection, credential resolution, collector execution,
evidence persistence, migration, history write, role/grant, HTTP call, deploy,
or consumer activation is introduced.
