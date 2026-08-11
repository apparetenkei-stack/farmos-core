# Day150 Phase C2-A: storage-backed durability source foundation

## Classification and ceiling

Phase C2-A supplies PostgreSQL source artifacts for the existing Phase C1 persistence ports. Its maximum state is `SOURCE_ARTIFACT_CREATED`. It does not establish an applied schema, durable authority, storage-backed concurrency, crash, ACK-loss, or restart evidence. It does not establish a trusted-clock producer.

Phase C1 remains the canonical owner of Proposal, Approval, Approval Receipt, revocation, Command, lifecycle, and Execution Receipt semantics. The PostgreSQL contract and adapter implement those ports; they do not create an alternate durability domain or change historical Approval, Receipt, Command, or `execution_binding_digest` identities.

## Migration and schema identity

The forward-only artifact is `202608110001_production_target_execution_durability` in the existing `ai` schema. Startup auto-apply remains disabled and production application remains an authenticated-human operation. There is no rollback artifact and the repository never applies or discovers migrations.

The immutable metadata singleton binds the migration ID, applied checksum returned by migration history, schema version, C1 persistence-port version, and exact relation, function, trigger, and authority registry digests. Every adapter transaction performs an exact schema-identity gate. Mismatch is `SCHEMA_MISMATCH`; latest, highest, fallback, and best-effort compatibility are prohibited. Only the narrowly prefixed `production_target_execution_*` object set is owned by this contract, not the whole `ai` namespace.

Manifest evolution is append-only. Stable Changes and Day149 retain exact authority over their immutable historical prefix; a valid later C2-A suffix neither becomes a Stable Changes migration nor rewrites an earlier owner. Missing, reordered, duplicated, or checksum-mismatched historical entries remain rejected.

## Persistent model

Append-only records are Proposal, Approval, Approval Receipt, Approval Revocation Event, Command, Reservation, Attempt, Execution Receipt, Clock Evidence, Reconciliation Record, and the schema metadata singleton. Row triggers reject `UPDATE` and `DELETE`; statement triggers reject `TRUNCATE`. Runtime receives no direct table privileges.

Mutable state is restricted to four CAS projections:

- Approval Revocation Head: one head per Approval, monotonic version and digest.
- Approval Use: `UNBOUND` at version 0, then one exact binding; it never becomes unbound again.
- Lifecycle: the C1 lifecycle state, version, digest, and exact reservation/attempt/receipt references.
- Clock Floor: one monotonic floor per exact clock authority and revision.

Every CAS update requires the locked current version and digest and advances exactly one version with a new digest. Uniqueness constraints enforce one Approval Receipt per Approval in v1, one revocation sequence per Approval, one reservation per Command/Approval/Approval Receipt, one attempt per Reservation/Command, and one terminal receipt per Command. Same ID with a different digest is a conflict.

C1/domain code remains the canonical generator of record identities and digests. PostgreSQL canonicalization is version-pinned and used to reject altered ingress, derive storage-owned CAS projection digests, and exact-compare persisted lineage; it does not invent alternate Proposal, Approval, Command, lifecycle, receipt, or revocation semantics. The adapter revalidates C1 lifecycle and revocation-revalidation evidence before returning a successful reservation or attempt-start result.

## Transaction policy and lock order

All mutations execute as `SERIALIZABLE READ WRITE`, with statement timeout 10 seconds, lock timeout 5 seconds, and automatic retry count zero. Driver serialization or deadlock errors are returned as bounded failures and are not retried.

The fixed logical lock order is Clock Floor → Proposal → Approval → Approval Receipt → Revocation Head → Approval Use → Command → Lifecycle → Reservation → Attempt → Execution Receipt or Reconciliation. Each SECURITY DEFINER operation uses `search_path=pg_catalog`, accepts only a bounded JSON contract, contains no arbitrary table selector, and executes no caller SQL.

Reservation atomically checks clock evidence/floor, immutable Approval lineage, exact active revocation head, Approval Receipt, Command and execution binding, Phase B dependency and target digests, `UNRESERVED` lifecycle, and `UNBOUND` Approval Use. It then appends the Reservation and revocation revalidation evidence, CASes Lifecycle and Approval Use, advances the Clock Floor, and commits. Locks and digest predicates close the revocation and approval-reuse TOCTOU windows.

Attempt start atomically repeats exact revocation-head, Phase B, target, Command, Reservation, Approval Use, lifecycle, and clock checks; appends the Attempt and revalidation evidence; advances Lifecycle to `ATTEMPT_STARTED`; consumes Approval Use; and advances the Clock Floor. Only a known commit ACK could later permit an external operation. C2-A itself performs no external operation.

Terminalization places the valid Lifecycle terminal CAS, immutable Execution Receipt append, receipt identity/digest binding, and Clock Floor CAS in one transaction. There is no receipt overwrite and no separate adapter write for terminal state and receipt.

## Ambiguous outcomes

An ambiguous reservation commit is never retried. A separate read-only authoritative storage observation returns exactly:

- `CONFIRMED_ABSENT`: exact absence plus `UNRESERVED` and unbound Approval Use permits a separate transaction to enter `RESERVATION_OUTCOME_UNKNOWN`, append its matching receipt and reconciliation record, and quarantine Approval Use. It does not insert a Reservation.
- `CONFIRMED_PRESENT`: the exact intended Reservation and `RESERVED_NOT_STARTED` binding permits `RESTART_RESERVED_CANCEL` to `CANCELLED_PRE_START` with its matching cancellation receipt and reconciliation record.
- `OBSERVATION_UNKNOWN`: no mutation, receipt, retry, or new writer transaction; manual review/quarantine is required.

The caller cannot provide the observation. Branch receipts are not interchangeable.

Unknown attempt-start ACK is also read back exactly. An exact `ATTEMPT_STARTED` state can only proceed through explicit `OUTCOME_UNKNOWN` recovery; an exact `RESERVED_NOT_STARTED` state follows fail-closed pre-start recovery; unknown observation performs no mutation. Unknown finalization ACK is resolved only as an exact terminal state plus exact receipt, an exact `ATTEMPT_STARTED` state requiring explicit `OUTCOME_UNKNOWN`, or unknown observation. Success and failure are never inferred, and writers are never blindly repeated.

## Role and authority boundary

The migration source defines `farmos_core_production_target_execution_transaction` as `NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`. The migration owner owns tables and functions. The capability role receives only exact function execution and schema usage; PUBLIC, `anon`, and `authenticated` receive no broad table or function authority. The capability role may never be a member of another role. C2-A creates no login membership, credential, environment lookup, or production provisioning; a narrowly approved login-to-capability membership is a later provisioning authority required for a non-superuser adapter to use `SET LOCAL ROLE` and is not treated as schema authority.

The verifier checks the exact C2 relation and column registry, PostgreSQL types and nullability, constraints/indexes, function signatures/security-definer configuration/owner, triggers and enabled event shape, relation ownership, ACLs, role attributes, schema CREATE denial, and absence of membership paths involving the capability role. These are source artifacts for later isolated qualification; C2-A does not claim that any production catalog or login membership has been inspected.

The adapter accepts an injected pool/client only. It exposes bounded storage categories and discards raw SQL, query, connection, and driver messages at the domain boundary.

## Trusted clock and phase boundaries

C2-A stores exact Clock Evidence, validates authority and revision, maintains a monotonic Clock Floor through CAS, and rejects stale or regressing evidence. The trusted-clock producer remains outside C2-A and C2-B. `TRUSTED_CLOCK_ESTABLISHED` remains false without a separately approved producer qualification.

C2-B is separately authorized work for PostgreSQL 17 isolated apply/verify, real transaction and concurrency races, append-only and ACL enforcement, ACK-loss/fault/crash/restart behavior, cleanup, and machine-verifiable evidence. C2-A neither starts PostgreSQL nor creates that evidence.

Production migration states remain separate: `SOURCE_ARTIFACT_CREATED` → `ISOLATED_MIGRATION_QUALIFIED` → `PRODUCTION_MIGRATION_APPROVED` → `PRODUCTION_MIGRATION_APPLIED`. This phase reaches only the first state. G2-A adoption is deferred until C2-B evidence review and a separate approval. External capability probe is `HOLD_EXTERNAL_CAPABILITY_PROBE`; Gate 2, runtime binding, production access, production execution, and deployment remain unauthorized.
