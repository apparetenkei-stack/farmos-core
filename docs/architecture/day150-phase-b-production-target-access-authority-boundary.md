# Day150 Phase B — Production Target Access Authority Boundary

## Status and ownership

This document defines the canonical source-only Phase B contracts. The review state is
`CANDIDATE_FOR_APPROVAL`; probe use is `NOT_AUTHORIZED`; capability qualification is
`NOT_ESTABLISHED`; adoption is `NOT_ADOPTED`; runtime is `UNCHANGED` and
`NOT_RUNTIME_BOUND`. Contract existence does not imply qualification, adoption, Gate 2
authorization, production access, or execution.

Phase B owns only provider credential metadata authority, database credential metadata
authority, Connection Authority, principal/capability authority, TLS attestation authority,
Collector Authority metadata, the shared lifecycle contract, and opaque credential broker
ports. Collector Authority is a distinct canonical metadata owner, not a collector
implementation or entrypoint. Phase B does not own Phase A provider-source semantics,
target association, or production evidence. It does not own Phase C Approval SOT, trusted
clock, durable reservation/finalization, or receipt storage. It also does not own Gate 2
command identity, manifest finalization, runtime binding, a probe runner, or production
execution. No Phase B object is a shadow canonical authority.

## Shared authority lifecycle

Every Phase B credential, connection, broker, handle, and Collector lifecycle check uses the
canonical UTC grammar `YYYY-MM-DDTHH:mm:ss.SSSZ`. The shared validator checks ASCII syntax,
Gregorian calendar validity, time-field bounds, and exact UTC round-trip before comparison.
`Date.parse` normalization is not validity proof; invalid dates such as non-leap February 29,
February 30/31, and April 31 fail closed. Evaluation uses an explicit caller-supplied time and
returns invalid, not-yet-active, active, expired, or revoked. Phase B owns no trusted clock.

## Collector Authority metadata

`farmos.production-target-collector-authority.v1` is the canonical Phase B metadata owner for
the future bounded production-target identity observation role. Exact revision 1 binds the
approved target digest, `farmos.production-target-identity-query.v5`, its exact artifact SHA,
the minimal-observation authority/artifact, and exact Connection, Principal Capability, and
PostgreSQL TLS authority revisions. Business-data reads, arbitrary SQL, DML, DDL, migration,
role mutation, runtime activation, Gate 2 execution, and production access are excluded.
Duplicate, unknown, expired, revoked, fallback, or inferred latest revisions fail closed.
Implementation is `NONE`; execution and production calling are false; probe use is
`NOT_AUTHORIZED`; qualification is `NOT_ESTABLISHED`; runtime is `NOT_BOUND`.

## Exact production target binding

Every authority is resolved only for an exact approved target/resource digest and exact
positive bounded revision. The digest is the reference boundary for the approved Phase A
target prerequisites: environment `apparetenkei-production-primary`, installation
`apparetenkei-farmos-core-mac-01`, farm scope `apparetenkei-primary-farm`, logical database
`farmos_core_prod`, provider class `managed_postgres`, provider family
`Supabase Managed PostgreSQL`, and PostgreSQL major 17. Connection metadata additionally
binds an exact endpoint/host digest. There is no fallback target and no automatic selection
of latest, highest, current, or any other inferred revision.

The provider credential authority references
`farmos.supabase-project-resource-source-authority.v1` and
`farmos.supabase-project-resource-fingerprint.v1`. The minimal observation remains owned by
`farmos.production-target-identity-minimal-observation-query.v1` with the existing artifact
digest `sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805`.
Phase B references these authorities and does not independently copy, hash, fetch, or
reinterpret their source evidence.

## Provider Credential Authority

The canonical class is `SUPABASE_PROJECT_METADATA_READER`. Its metadata binds the exact
target/resource digest, provider class/family, `GET_SINGLE_PROJECT`, method `GET`, provider
scope `projects:read`, maximum one call, expiry, rotation, revocation, and an exact broker
authority ID/revision. Fallback is prohibited. Rotation creates a new opaque handle and a
new authority revision; it never silently mutates historical metadata. Revoked revisions
remain historical and cannot be resolved as active.

## Database Credential Authority

The canonical class is `POSTGRES_PRODUCTION_TARGET_VERIFY_READER`. It binds the exact
target/resource digest, `farmos_core_prod`, the expected principal authority, the bounded
capability/identity read-only operation class, maximum one connection, expiry, rotation,
revocation, and an exact broker authority ID/revision. DML writes, DDL, migration, GRANT,
REVOKE, role mutation, arbitrary SQL, and generic `DATABASE_URL` capability are explicitly
outside the authority. Fallback is prohibited.

Credential authorities store metadata only. Tokens, API keys, JWTs, passwords, credential
values, secret-bearing URLs, DSNs, connection strings, environment-variable values, and
credential examples are excluded from domain objects and evidence.

## Connection Authority

Connection Authority is separate from both credential authorities. It binds the exact
target/resource and endpoint/host digests, logical database, PostgreSQL major 17, exact DB
credential authority revision, exact principal authority revision, and exact PostgreSQL TLS
attestation authority revision. It also requires the exact database broker and Collector
Authority IDs/revisions; provider broker metadata or another dependency revision cannot
validate. It permits
one connection, zero retry, bounded connect and
query timeouts, and exactly `REPEATABLE READ` with read-only required. Expired or revoked
authority, generic fallback, wrong dependency revisions, or any target mismatch fails
closed. Connection Authority owns no password, token, credential value, DSN, or connection
implementation.

## Principal Capability Authority and EXECUTE provenance

The expected principal class is `POSTGRES_PRODUCTION_TARGET_VERIFY_READER`. Required role
attributes are `superuser=false`, `createdb=false`, `createrole=false`,
`replication=false`, and `bypassrls=false`. Membership in `pg_monitor`,
`pg_read_all_data`, or `pg_write_all_data` is rejected. Only an explicitly approved exact
narrow role can supplement the dedicated principal. This revision binds that role exactly
as `farmos_production_target_verify_execute`; similarly shaped or self-asserted role names
are rejected, and the binding does not create or grant the role in a database.

Function EXECUTE provenance is classified as `DIRECT_DEDICATED_PRINCIPAL`,
`APPROVED_NARROW_ROLE`, `PUBLIC`, `UNAPPROVED_BROAD_ROLE`, `MIXED_OR_AMBIGUOUS`, or
`NOT_AVAILABLE`. Only the first two can be accepted, and the narrow-role case requires exact
role proof. `PUBLIC`, broad-role, mixed/ambiguous, unavailable, or grantable EXECUTE is
rejected. A positive `has_function_privilege` result alone is never capability proof.
`current_user` and `session_user` must both attest to the expected dedicated principal. The
attestation also binds the approved target and exact active Collector Authority; wrong,
expired, or revoked Collector metadata fails closed. Actual principal feasibility remains
`NOT_ESTABLISHED`; Phase B implements no DB inspection.

## TLS attestation authorities

Provider TLS and PostgreSQL TLS use non-interchangeable schemas and authority IDs:
`SUPABASE_PROVIDER_TRANSPORT` binds the provider family, provider endpoint authority, exact
host/resource binding, HTTPS/TLS requirement, and no downgrade;
`POSTGRES_DATABASE_TRANSPORT` binds `verify-full`, hostname/SNI authority, trust-source
policy authority, the exact Connection Authority revision, and the exact active Collector
Authority revision, with insecure fallback prohibited. Provider transport has no PostgreSQL
Collector field and rejects such field contamination.

A configuration field containing `verify-full` is not a successful TLS attestation. A
future handshake attestation must prove that the actual connection used the approved
endpoint, approved hostname/SNI policy, approved trust source, no downgrade/fallback, and
the exact Connection Authority revision. SQL cannot self-attest TLS. Actual handshake count
is zero and actual TLS state is `NOT_ESTABLISHED`.

## Opaque credential broker ports

The provider and database broker ports accept separate exact broker and credential authority
IDs/revisions, exact target digest, exact bounded operation class, and a required opaque
context digest. Provider metadata binds `GET_SINGLE_PROJECT`, `projects:read`, and read-only
provider metadata access. Database metadata binds bounded production-target identity and
capability read-only access, `farmos_core_prod`, and the exact principal authority.

Provider and database handles are distinct discriminated types. Each handle binds its handle
digest, broker ID/revision, credential ID/revision/class, target, operation, and expiry/state;
database handles additionally bind the database and principal. Pure exact metadata validators
and resolvers reject unknown, zero, negative, over-limit, expired, revoked, duplicate, and
unsupported revisions or operations. They never select `latest`, `highest`, `current`,
`active`, `default`, or a fallback revision. Crossed provider/database broker, credential,
operation, or handle combinations fail closed.

Each request has a provider- or database-domain-separated deterministic binding digest over
its exact broker and credential IDs/revisions, class, target, operation, opaque context, and
domain-specific scope or database/principal fields. Handles carry that digest, and validators
require exact request-to-handle agreement. A handle for request A fails for request B even if
the remaining high-level metadata matches.

Correlation is stateless structural validation, not redemption. The same unchanged handle and
request may structurally validate twice. Durable single use, atomic redemption, restart-safe
replay prevention, and cross-process consumption are `NOT_ESTABLISHED`. Phase B adds no Set,
Map, filesystem or database ledger; those responsibilities belong to the future trusted broker
execution boundary and Phase C lifecycle.

The domain return type remains a branded opaque non-secret handle or `null`; it cannot expose
plaintext credential material. A future trusted adapter may consume material internally, but
material must not cross into the authority or evidence layer. Missing broker or authority
fails closed. The pure resolvers resolve metadata only: no broker implementation, credential
resolution, environment/file/default lookup chain, or secret access exists in Phase B.

## Probe lifecycle and Phase C dependency

These contracts contain enough metadata for a future bounded probe to verify provider and
DB credential scope, connection target, principal identity and attributes, TLS handshake
attestation, function capability provenance, and operation maximums. They do not grant
`APPROVED_FOR_NONCANONICAL_CAPABILITY_PROBE`. Current states remain: contracts `DEFINED`,
credentials `UNRESOLVED`, connection `UNRESOLVED`, TLS `UNATTESTED`, principal
`UNATTESTED`, Collector implementation `NONE`, durable handle use `NOT_ESTABLISHED`, external
probe `HOLD_EXTERNAL_CAPABILITY_PROBE`, Gate 2 `NOT_AUTHORIZED`, and
production access `NOT_AUTHORIZED`.

A later Phase C must canonically own the scoped, one-shot, human-approved probe command and
its Approval SOT, trusted clock, durable reservation/finalization ledger, and receipt store.
None is created here. Contracts may be reviewed as candidates before an external probe;
there is no circular requirement that a capability be externally qualified before its
governing contract can be defined. Review, probe-use authorization, qualification, adoption,
and runtime binding remain independent state dimensions.

## Fail-closed and operational boundary

Validation rejects the wrong target digest, provider class/family, credential class,
database, PostgreSQL major, principal authority, TLS authority, Collector Authority,
non-canonical or invalid-calendar lifecycle timestamp, revoked/expired authority,
unknown revision, fallback, more than one call/connection, retry above zero, unbounded
timeouts, write or migration capability, broad roles, grantable EXECUTE, and ambiguous
provenance. The same revision cannot have multiple accepted metadata instances; policy
changes and rotations require a new revision. Exact revision resolution never means
“latest.”

This source-only phase performs zero network calls, provider API calls, DB connections,
credential resolutions, TLS handshakes, external probes, IPC operations, migrations, RLS
changes, Gate 2 executions, runtime bindings, production operations, deploys, stages,
commits, or pushes.
