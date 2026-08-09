# Stable Changes Production Migration Reconciliation

## Status and boundary

```yaml
status: OFFLINE_IMPLEMENTATION
strategy: Option A+
production_connection: 0
production_write: 0
migration_apply: 0
history_write: 0
role_or_grant_change: 0
consumer_activation: PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED
```

This contract prepares machine-readable evidence for a future authenticated
human migration decision. It does not identify a database as production,
bootstrap migration history, grant authority, collect credentials, or execute
SQL. The implementation authority is
`src/lib/hermes/farm_os_stable_changes_migration_reconciliation.ts`.

## Production target identity policy

A database name is not production authority. A target is `MATCH` only when an
approved non-secret target manifest and sanitized read-only evidence agree on:

- environment ID and environment class;
- provider resource fingerprint;
- PostgreSQL cluster-system-identifier digest;
- logical database name and PostgreSQL major version;
- installation ID and farm scope;
- operator class and migration manifest version.

The target manifest contains no hostname, port, credential source, password,
connection string, key, or token. A missing digest or binding returns
`INSUFFICIENT_EVIDENCE`; any difference returns `MISMATCH`.
The observation must also be fresh relative to an explicit evaluation time and
maximum age. Exact JSON scalar types are required; string coercion is not an
identity authority.
The repository-owned identity-query authority fixes the collector ID/version,
identity-collection purpose, live-evidence contract version, query-authority
ID, active status, and exact query SHA-256. Digest syntax alone is not
authority. Evidence cannot supply its own expected digest, and an unknown,
deprecated, wrong-purpose, or differently hashed query is insufficient.
This production reconciliation contract rejects staging and development
manifests even when every other identity field agrees.

The Repository authority registry now records v2 as the reviewed, adopted
authority for `production_target_identity_collection`, with exact artifact
digest
`sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95`.
It preserves v1, its original digest, and its
`LEGACY_UNMATERIALIZED_AUTHORITY` history, and records an auditable v1-to-v2
supersession relationship. Formal adoption and runtime binding are orthogonal:
the live-evidence parser remains bound to v1 and its original digest. v2 does
not authorize a connection, credential resolution, collector execution,
production access, or migration execution. Runtime adoption requires a
separate future approval.

Before the next live preflight, an authenticated human must approve the target
manifest. The live collector is deliberately outside this implementation. It
must use one repeatable-read/read-only transaction, output only the sanitized
evidence schema, and compare an approved provider/cluster digest without
printing its source identifier.

## Migration registry and source of truth

`db/provisioning/manifest.json` remains the migration ordering, apply checksum,
and path source of truth. The reconciliation registry adds only:

- verification checksum;
- Git authority;
- object-fingerprint schema version;
- prefix/target classification; and
- the explicit `unproven` production-history state.

Registry derivation fails unless the manifest contains exactly the four
prefixes followed by the Stable Changes target with matching IDs and paths.

## History-independent object fingerprint

The catalog snapshot is read-only evidence and does not include migration
history. Its canonical JSON covers:

- schemas, tables, columns, types, nullability, defaults and constraints;
- indexes;
- function signature, owner, SECURITY DEFINER, `proconfig`, and body digest;
- triggers and trigger definitions;
- role flags and membership;
- schema/table/function ACL;
- RLS flags.

Object and ACL arrays are normalized before SHA-256 hashing. The validator
returns `EXACT`, `ABSENT`, `PARTIAL`, `CONFLICT`, or `UNKNOWN`. A fingerprint
proves only observed state equivalence; it never proves that a migration ran.
The expected snapshot is accepted only when its computed digest, migration ID,
fingerprint version, Git authority, and approval reference match a separately
approved expected-catalog-fingerprint authority. Caller-supplied catalog JSON
alone cannot become adoption authority.

Existing verify artifacts that require a migration-history row cannot be used
as adoption evidence before history reconciliation. An approved expected
catalog snapshot must be generated and qualified independently for each
prefix.

Every observed snapshot is an evidence envelope bound to the approved target
identity digest, observation time, read-only transaction assertion, collector
authority, catalog-query digest, and complete object-universe digest. The
expected authority additionally binds the apply artifact SHA, required object
count, and migration-specific universe. An empty result is `ABSENT` only when
the collector declares the complete reviewed universe queried; an incomplete
empty result is `UNKNOWN` and cannot authorize replay.

## Option A+ history policy

The future design uses two distinct authorities:

1. `core_schema.migration_history` for known migration application; and
2. a separate append-only reconciliation/adoption ledger for observed existing
   state and its approval provenance.

The provenance ledger records the target digest, artifact checksum, object
fingerprint, evidence references, observed/adopted times, and approval. Unknown
historical apply time or actor remains `null`. It must not be copied into
ordinary `applied_at` or `applied_by` fields.
Known historical application additionally requires a commit-receipt digest,
a repository-trusted issuer, exact target/migration/artifact bindings, a
`committed` outcome, deterministic recomputation of the canonical receipt
payload digest, verification of the issuer's detached Ed25519 signature with
the repository-owned public authority key, and valid
commit/receipt/catalog/evaluation time ordering.
A digest-shaped string alone is never proof. Unknown, deprecated, or
wrong-purpose issuers and stale, future, cross-target, cross-migration, or
cross-artifact receipts are invalid. A verified existing state with no valid
trusted receipt must use unknown provenance.

History CAS is insert-only:

```text
absent row                     -> INSERT_REQUIRED
exact ID/sequence/checksum     -> IDEMPOTENT
any difference                -> INCONSISTENT
UPDATE / DELETE / repair       -> prohibited
```

Git presence, partial objects, or a history-only row never authorize adoption.
History absence is accepted only from a fresh, complete, target-bound,
read-only history evidence envelope using the reviewed exact-row query digest.
`UNAVAILABLE` is distinct from an available result containing no row.

## Apply and unknown-outcome state machines

The dry-run planner can reach only `MAINTENANCE_CONFIRMED`. It cannot enter
`APPLY_AUTHORIZED`; that transition requires a future trusted approval adapter.
The planner does not accept caller-computed gate enums. It evaluates the
target manifest/live evidence, registry-bound reconciliation evidence,
raw catalog/history reconciliation evidence, target-bound read-only operator
catalog evidence, repository ACL policy, capacity evidence,
and maintenance evidence. Success produces an immutable, expiring precheck
receipt containing the target, artifact, plan, evidence-bundle, execution, and
change-window digests. This offline implementation has no trusted issuer,
signature, or server-side approval record, so even a self-consistent approval
shape is rejected. The generic state transition function cannot cross the
approval gate from a caller-asserted current state.
The authorization check re-evaluates the raw dry-run evidence and requires the
presented receipt to equal the derived receipt; a caller-created receipt cannot
substitute for the validated evidence bundle.
Migration history must form one contiguous exact applied prefix. The selected
target must be the first `NOT_APPLIED` migration and every later registry entry
must also be `NOT_APPLIED`; all-absent chains, gaps, and already-applied targets
are blocked. Evidence ages and receipt TTL are repository policy values, and a
receipt expires at the earliest underlying evidence expiry.

```text
PRECHECK
→ IDENTITY_CONFIRMED
→ HISTORY_RECONCILED
→ AUTHORITY_CONFIRMED
→ ACL_CONFIRMED
→ CAPACITY_CONFIRMED
→ MAINTENANCE_CONFIRMED
→ [separate human gate]
→ APPLY_AUTHORIZED
→ APPLY_RUNNING
→ APPLY_COMMITTED
→ VERIFY_COMPLETE
→ HISTORY_RECORDED
→ POSTCONDITION_COMPLETE
```

Disconnect or timeout may enter `OUTCOME_UNKNOWN`. Reconciliation uses target
identity, artifact SHA, object fingerprint, verify result, and history state:

```text
no objects + no history                 NOT_APPLIED
exact objects + verified + no history   APPLIED_HISTORY_MISSING
exact objects + exact history           APPLIED_AND_RECORDED
partial/conflict/history-only           INCONSISTENT
insufficient evidence                   UNKNOWN
```

`APPLIED_HISTORY_MISSING` is reachable only when the exact-object result is
paired with a valid repository-trusted commit receipt. An absent or invalid
receipt leaves the state at `VERIFIED_EXISTING_STATE`; caller booleans and bare
receipt digests are not reconciliation authority.
A valid committed receipt paired with absent catalog objects is contradictory
and therefore `INCONSISTENT`; it can never become replay-eligible
`NOT_APPLIED`. The same trusted-receipt rule applies when reconciling an
unknown execution outcome.

History evidence is one discriminated state (`ABSENT`, `EXACT`, `CONFLICT`, or
`UNKNOWN`), not independent booleans. Blind replay is prohibited for every
result except confirmed `NOT_APPLIED` backed by complete, target-bound catalog
evidence.

## Transaction and timeout policy

Current apply artifacts own `BEGIN/COMMIT`; verify artifacts own
`BEGIN READ ONLY/ROLLBACK`. Therefore an executor must not:

- add an outer transaction;
- use `--single-transaction`;
- strip artifact transaction statements; or
- claim apply and a later history insert are atomic.

Initial planning limits are statement timeout 30 seconds, lock timeout 2
seconds, client watchdog 60 seconds, and automatic retries zero. They require
reconfirmation in the approved maintenance window. A watchdog timeout is an
unknown outcome until catalog reconciliation completes.

Future migrations should standardize on either runner-owned transactions or an
artifact-owned transaction containing its own history record.

## Least-privilege authority composition

Capabilities remain separate and require separate target-bound collector
receipts with repository-defined principal classes:

- `ROLE_ADMIN`: prepare the exact NOLOGIN runtime role;
- `SCHEMA_OWNER_APPLY`: bounded approved `SET ROLE` to the schema owner;
- `HISTORY_WRITER`: insert-only history CAS;
- `VERIFY_READER`: read-only verification;
- `POSTCONDITION_READER`: final read-only fingerprint.

The required two-step future flow prepares and verifies the runtime role
before the migration, then uses a separately approved schema-owner executor.
It does not make the owner role `LOGIN` or `CREATEROLE`, does not make the
operator superuser, and does not grant broad inherited membership. Role
creation, membership, and `SET ROLE` remain future human-approved operations.
An absent runtime role does not pass schema-owner apply readiness; ROLE_ADMIN
must first prove the exact NOLOGIN/non-superuser flags.

## ACL allowlist policy

Each expected schema grant records principal, privilege, grant option,
authority source, and status (`expected`, `legacy`, `unknown`, or `forbidden`).
Comparison returns `MATCH`, `UNKNOWN_GRANT`, `FORBIDDEN_GRANT`, or
`MISSING_REQUIRED_GRANT`. Unknown grants are never automatically revoked.
The allowlist is repository-owned rather than caller-supplied. Only `expected`
entries can match; a matching `legacy` or `unknown` candidate remains
`UNKNOWN_GRANT` and requires human reconciliation.
Observed grants are accepted only inside a fresh, read-only evidence envelope
bound to the target digest, repository ACL-policy digest, and the approved ACL
collector authority. The envelope must assert a complete all-principals grant
inventory and match the reviewed catalog-query and grant-universe digests;
omitting a forbidden or unknown grant cannot yield `MATCH`.

The current sanitized counts—one unattributed CREATE, six unattributed USAGE,
and one grantable USAGE—must remain `UNKNOWN_GRANT` until a future read-only
preflight supplies principal and grantor identity for explicit approval.

## Capacity and maintenance policy

Capacity evidence is provider-supplied, read-only, and non-secret. It includes
target/environment/provider-resource binding, quota, available bytes, database
bytes, WAL headroom, authority, and observation time. Thresholds come from the
repository-owned policy, never from evidence supplied by a collector. A migration-size estimate
cannot substitute for evidence. No provider-specific collector is included.
The validator rejects a different environment ID, stale observation, impossible
quota arithmetic, missing provider authority, or insufficient storage/WAL
headroom.

The Stable Changes migration creates empty relations and catalog objects and
does not rewrite business tables. Its initial growth is expected to be small,
but ongoing append-only ingress requires a separate rate, row/index size,
retention, WAL, and backup-amplification model.

Maintenance evidence is bound to the target identity and approved change
window, and requires backup and monitoring receipt digests, zero waiting locks,
zero long transactions, zero idle-in-transaction sessions, a bounded active
connection count, monitoring and backup readiness, and disabled poller/feature
state. Stale or cross-window observations fail closed.

## Track separation and containment

Track A completes identity, history, authority/ACL, capacity, executor, and
migration approval. Track B separately implements and qualifies the
default-disabled consumer entrypoint. Their merge point is:

```text
migration applied and verified
AND consumer entrypoint deployed disabled
```

Scope initialization, credentials, bounded probes, ingest, and scheduling are
later independent gates. After a future migration apply, the poller remains
disabled, feature remains off, no runtime LOGIN membership exists, and no HTTP
credential is provisioned. Destructive DROP is not the normal rollback path.
