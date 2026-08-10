# Day150 Phase A Gate 2 External Feasibility Source Policy

Status: `SOURCE_ONLY_POLICY_CANDIDATE`. Actual provider/DB capability probe:
`HOLD_EXTERNAL_CAPABILITY_PROBE`. Gate 2 and production access are
`NOT_AUTHORIZED`; Phase B is `NOT_STARTED`.

This source-only candidate formalizes how a later, separately approved probe
could determine external feasibility. It performs no Supabase API request, DB
connection, environment or credential lookup, network operation, Docker
operation, probe execution, migration, RLS change, runtime binding, evidence
construction, or production execution.

## Supabase single-resource source authority

`farmos.supabase-project-resource-source-authority.v1` owns only the origin and
mapping of the transient raw tuple. Its endpoint class is
`GET_SINGLE_PROJECT`, its semantic source is the Supabase Management API
`GET /v1/projects/{ref}`, and its required provider scope is `projects:read`.
A fine-grained access token instead requires the distinct
`project_admin_read` permission; OAuth scope and fine-grained-token permission
are represented separately and are not treated as interchangeable strings.
A future probe may make at most one pinned GET. List, search, latest,
first-match, organization-wide scan, fallback project, auto-discovery, and all
write/update/delete operations are prohibited.

The official resource mapping for this path is fixed as follows:

- `provider_namespace = supabase.com`
- `resource_type = project`
- `provider_class = managed_postgres`
- `account_scope_id <- organization_id`
- `resource_id <- ref`

Both `organization_id` and `ref` are required and non-null, and returned `ref`
must exactly equal the requested pinned ref. Missing or invalid fields, null
organization scope, and requested/returned ref mismatch fail closed. The
generic fingerprint contract still legally supports
`account_scope_id = null`, but this Supabase source authority neither uses nor
falls back to null.

Only `organization_id` and `ref` may enter the transient compatibility/hash
input. Organization slug, project name, region, host, status, creation time,
database metadata, endpoint, URL, and the response body are excluded. Fixed
policy fields are supplied by the authority. Extra provider fields are
ignored. Raw identifiers must not enter persisted policy results, errors,
logs, receipts, or evidence.

Fingerprint validation, canonicalization, account-scope encoding, domain
separation, digest, and hash output remain exclusively owned by
`farmos.supabase-project-resource-fingerprint.v1`. The source mapper delegates
compatibility validation to that authority's canonicalizer and computes no
fingerprint. A future approved isolated boundary must discard the raw values;
this feasibility policy emits no canonical production fingerprint.

Provider outcomes are bounded to `PROVIDER_SOURCE_FEASIBLE`,
`ACCOUNT_SCOPE_MAPPING_FEASIBLE`, `PROVIDER_SOURCE_FIELD_MISSING`,
`PROVIDER_SOURCE_FIELD_INVALID`, `PROVIDER_RESOURCE_REF_MISMATCH`,
`PROVIDER_ACCOUNT_SCOPE_UNAVAILABLE`, and
`PROVIDER_SOURCE_NOT_ESTABLISHED`. The future transport boundary additionally
distinguishes `PROVIDER_SOURCE_UNAUTHORIZED`, `PROVIDER_SOURCE_UNAVAILABLE`,
`PROVIDER_SOURCE_FETCH_FAILED`, and `PROVIDER_SOURCE_STALE`; it must not fold
permission, connection, retrieval, or freshness failures into zero results.
Failure objects contain no raw IDs.

## PostgreSQL observation and capability policy

The intended cluster identity source remains
`pg_control_system().system_identifier` through the immutable minimal
observation authority
`farmos.production-target-identity-minimal-observation-query.v1`, SHA-256
`sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805`.
This candidate does not change or execute its SQL. Actual function availability
and ACL provenance are uncertain and therefore `NOT_ESTABLISHED`.

A future capability-only probe may inspect only `current_user`, `session_user`,
`current_database()`, server version, transaction read-only state, the exact
`pg_catalog.pg_control_system()` function OID, `has_function_privilege` for
that OID and current principal, the current principal's own `pg_roles` row,
the target function's own `pg_proc` row, effective ACL provenance through
`aclexplode(COALESCE(proacl, acldefault('f', proowner)))`, and `pg_has_role`
checks limited to explicitly prohibited broad roles. It reads zero business or
application rows and performs zero actual `pg_control_system()` calls during
the capability-only probe.

The future DB boundary allows at most one connection and one bounded
`REPEATABLE READ READ ONLY` transaction, with retry zero, commit zero, required
rollback, and required connection close. It creates no canonical cluster
digest from feasibility alone.

## Least privilege and principal attestation

`has_function_privilege = true` establishes only
`FUNCTION_EXECUTE_AVAILABLE`; it is never sufficient for
`DEDICATED_PRINCIPAL_CAPABILITY_ATTESTED`. Acceptable proof additionally
requires the expected dedicated principal, policy-required
`current_user = session_user`, both principals matching the Phase B Connection
Authority reference, `superuser=false`, `createdb=false`, `createrole=false`,
`replication=false`, `bypassrls=false`, no prohibited broad role membership,
and exact EXECUTE provenance from the dedicated principal or an explicitly
approved narrow role with `grantable=false` and no broad inheritance.
ACL evaluation is set-based: a direct or approved narrow grant coexisting with
PUBLIC, an unapproved role grant, or unapproved broad inheritance is rejected.
One acceptable grant cannot mask another unacceptable effective provenance.

Capability depending on superuser, `pg_monitor`, `pg_read_all_data`,
`pg_write_all_data`, or any unapproved broad predefined/custom role is
`DB_CLUSTER_OBSERVATION_PRIVILEGE_TOO_BROAD`. No exception is introduced.
PUBLIC EXECUTE can make the function available, but it does not attest a
dedicated-principal grant and is therefore also unacceptable as Gate 2
least-privilege proof.

Session proof must establish `current_user`, `session_user`, the expected
principal reference, and the Phase B Connection Authority principal match. The
current minimal query lacks those observations and is not silently extended.
Until Connection Authority proves them out of band, or a separately approved
versioned query extension does so, the outcome is
`SESSION_PRINCIPAL_ATTESTATION_UNRESOLVED`, and dedicated-principal capability
attestation remains unestablished even when the narrow function path itself is
otherwise feasible.

TLS `verify-full` is client-side Phase B Connection Authority ownership. The
policy records `TLS_ATTESTATION_REQUIRED` and prohibits inferring TLS
verification from SQL; it implements no connection behavior.

## Probe meaning and HOLD paths

A future provider probe has pinned GET maximum one, list/search/write/retry
zero, exact requested/returned ref comparison, non-null organization/ref
checks, and fingerprint-input compatibility validation. Raw values are
discarded. Its result is noncanonical, non-reusable, and cannot promote
readiness. A canonical fingerprint need not be persisted during feasibility.

The DB capability probe is likewise noncanonical and non-reusable. A synthetic
`EXTERNAL_FEASIBILITY_PASS` is not `PRODUCTION_FORMAL_EVIDENCE`; it creates no
provider fingerprint, cluster digest, manifest revision, Gate 2 durable
receipt, execution approval, or readiness transition. It only indicates that
a later human-authorized Gate 2 attempt may have a safe path.

If the `pg_control_system` path is unavailable or too broad, the result is
HOLD. Future separate review may consider provider-attested immutable
DB/cluster identity, a versioned alternative minimal observation authority, or
an explicitly privileged one-shot bootstrap observation. Hostname/project-ref
substrings, use of the same credential, logical database name alone, region,
and connection endpoint are prohibited identity inferences.

## Readiness and phase ownership

This candidate makes `POLICY_DEFINED` machine-distinct from actual feasibility.
It does not establish `PROVIDER_SOURCE_AUTHORITY_ESTABLISHED`,
`ACCOUNT_SCOPE_SEMANTICS_ESTABLISHED`,
`DB_LEAST_PRIVILEGE_FEASIBILITY_ESTABLISHED`, or
`SESSION_PRINCIPAL_VERIFICATION_ESTABLISHED`. G2-A remains `NOT_READY` and the
actual probe remains HOLD.

Phase A owns provider source policy, minimal observation semantics, and
same-target evidence requirements. Phase B owns credential and Connection
Authorities plus TLS, principal, and grant provenance. Phase C owns Approval
SOT, trusted clock, and the durable execution lifecycle. This candidate creates
no credential/connection implementation and no shadow Phase B or Phase C SOT.
