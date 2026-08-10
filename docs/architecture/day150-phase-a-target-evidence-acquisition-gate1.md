# Day150 Phase A Target Evidence Acquisition Gate 1

Status: `SOURCE_ONLY_PREPARATORY_CANDIDATE`.

This Gate 1 candidate establishes the source contracts required before any
production evidence acquisition. It performs no Supabase API call, database
connection, environment lookup, credential resolution, HTTPS request, network
operation, Docker operation, migration, deployment, runtime binding, or
production execution.

## Approved target and immutable expectations

The exact Product Owner target binding is:

```text
environment_id: apparetenkei-production-primary
environment_class: production
installation_id: apparetenkei-farmos-core-mac-01
farm_scope: apparetenkei-primary-farm
database_logical_name: farmos_core_prod
provider_class: managed_postgres
provider_implementation_family: Supabase Managed PostgreSQL
expected_postgres_major: 17
```

These values are expectations, not values derived from observation. A future
observation mismatch fails closed and cannot rewrite, normalize, correct, or
fall back from the approved target.

The approved target identity reference
`day150-phase-a-production-target-identity-v1-approval` and manifest revision
reference `day150-phase-a-production-target-manifest-r1-approval` do not approve
Phase C execution, a provider call, a database call, or Proposal Apply.

## Supabase project resource fingerprint

The provider-specific authority is
`farmos.supabase-project-resource-fingerprint.v1`. It belongs specifically to
the Supabase Managed PostgreSQL implementation family under provider class
`managed_postgres`; it is not a generic managed PostgreSQL hash.

The four input fields are:

```text
provider_namespace = supabase.com
resource_type = project
account_scope_id = exact Supabase account/organization scope identifier, or null
resource_id = Supabase project resource identifier
```

`account_scope_id` is an exact `string | null` field and is always present.
`null` represents only the absence of a scope supplied by a future provider
evidence authority; Gate 1 does not decide the production value. A string
value and `resource_id` use exact, case-sensitive ASCII grammar
`[A-Za-z0-9](?:[A-Za-z0-9_-]{0,126}[A-Za-z0-9])?`, with a maximum of 128
bytes each. The tuple is unique within provider namespace, resource type,
account scope, and resource ID. Secret-like, URL-like, endpoint-like, Unicode,
or grammatically invalid values fail closed.

Canonical serialization is sorted-key JSON, UTF-8, without whitespace or LF:

```json
{"account_scope_id":null,"authority_id":"farmos.supabase-project-resource-fingerprint.v1","provider_class":"managed_postgres","provider_namespace":"supabase.com","resource_id":"<exact>","resource_type":"project"}
```

For account-scoped input, the same key contains the exact ASCII string instead
of `null`. The key is never omitted. Missing, `undefined`, empty, whitespace,
wrong-type, and Unicode values are rejected; none are coerced or normalized to
`null`. Thus `null`, `""`, a missing key, and the literal string `"null"` are
distinct inputs and cannot share an accepted canonical preimage.

The authority ID is the domain separator. SHA-256 output is
`sha256:<lowercase-hex>`. There is no trim, case folding, Unicode
normalization, or fallback mapping.

Raw provider account and project/resource identifiers may exist only in the
dedicated isolated runner process memory long enough to validate,
canonicalize, and hash them. Endpoint, URL, region, display name, provider API
body, API key, JWT, token, and credential are outside the adapter result
contract. Raw values are forbidden from stdout, stderr, logs, error details,
receipts, evidence, telemetry, and files. Gate 1 uses fake values only and does
not resolve a Supabase project reference.

## PostgreSQL cluster system identifier digest

The new authority is exactly
`farmos.postgres-cluster-system-identifier-digest.v1`. It does not adopt or
reinterpret a legacy cluster hash.

The raw decimal grammar is `[1-9][0-9]{0,19}` with range
`1..18446744073709551615`; zero, leading zero, sign, whitespace, Unicode
digits, and overflow fail closed. Its exact canonical preimage is sorted-key
JSON, UTF-8, no whitespace, and no LF:

```json
{"authority_id":"farmos.postgres-cluster-system-identifier-digest.v1","raw_cluster_system_identifier":"<canonical-decimal>"}
```

SHA-256 output is `sha256:<lowercase-hex>`. Legacy and v1 digests are not
interchangeable.

The allowed raw lifetime is one query row, synchronous parse and validation,
canonicalization, hashing, reference discard, and isolated process
termination. This design does not claim JavaScript string zeroization. A
mutable buffer may be cleared on a best-effort basis, but the security property
is non-persistence plus single-use isolated process termination.

## Minimal observation SQL authority

The new, separate authority is
`farmos.production-target-identity-minimal-observation-query.v1`, artifact
`scripts/sql/farm_os_production_target_identity_minimal_observation_v1.sql`,
SHA-256
`sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805`.

Its exact statement plan contains one `SELECT` and one expected row. The parser
accepts exactly four columns: transaction read-only state, database logical
name, PostgreSQL major, and the internal raw cluster identifier. It requires
`transaction_read_only=on`, `database_logical_name=farmos_core_prod`, and
PostgreSQL major `17`, then immediately converts the cluster identifier to the
v1 sanitized digest. Exact row keys are required.

The SQL reads only server settings, current database identity, and
`pg_catalog.pg_control_system()`. It reads no business table, application row,
migration row, ACL inventory, arbitrary catalog dump, endpoint, or credential.
It performs no DML, DDL, GRANT, role mutation, or transaction commit. This is
not full v5, partial v5, or a production qualification authority.

A future collector must enforce one connection maximum, one transaction,
`REPEATABLE READ READ ONLY`, automatic retry zero, fallback zero, commit zero,
required rollback, and required connection close. Gate 1 contains no database
client and keeps `execution_enabled=false` and `NOT_RUNTIME_BOUND`.

## Formal sanitized evidence

The exact-key contract is
`farmos.production-target-identity-formal-evidence.v1`. It binds all seven
required approved target fields plus the Supabase implementation family and
includes only the provider fingerprint, cluster
digest, their exact authority IDs and sanitized receipt provenance, the exact
minimal-query authority and artifact SHA, the two non-execution approval
references, verified approval-authority/receipt identity, one-shot command
identity, a provider/cluster/target association digest,
`secret_exposed=false`, and `production_writes=0`.

Gate 1 exports only the `NON_PRODUCTION_FIXTURE` constructor. It does not
export a production formal-evidence constructor. The contract reserves
`PRODUCTION_FORMAL_EVIDENCE` for a separately approved implementation, and the
production-lineage validator rejects fixture evidence even when every digest
is syntactically valid. Classification is not authority: changing the class
field, or changing it together with ordinary lineage/status labels, cannot
create authority proof. Production evidence authority is `NOT_ESTABLISHED`.

Unknown, partial, `raw_*`, credential, token, secret, JWT, API-key, URL,
endpoint, and password keys are rejected recursively. Target mismatch is
rejected without correction or fallback. The evidence constructor is
deterministic for the same sanitized inputs.

Evidence validation has three independent layers. Structural validation checks
only the exact schema/keys, field and digest grammar, recursive forbidden keys,
target-binding shape, and sanitized field shape. Fixture-lineage validation
adds the exact Gate 1 target, query authority/SHA, fixed derivation authorities,
boundary, fixture class, and expected receipt/command/association lineage.
Production-lineage validation requires separately established production
authority and therefore fails closed in Gate 1. Structural validity is not
fixture validity, and neither is production validity. Gate 1 provides no
production evidence issuer, constructor, or callable mode.

## Proposal, Approval, Command, and Receipt boundary

The bounded authority is
`farmos.production-target-evidence-acquisition-boundary.v1`, exclusively for
Day150 Phase A evidence acquisition. It is not generic runtime execution
authority.

The required lineage is Proposal, human Approval, atomic one-shot Command
reservation, one execution attempt, and a consumed success or failure Receipt.
Proposal and Approval bind the exact target, operation, nonce, expiry, query
authority, and artifact SHA. The generated Command fixes maximum execution at
one and automatic retry at zero. Approval expiry, replay, wrong target, wrong
operation, wrong nonce, wrong authority, wrong SHA, and artifact-byte mismatch
fail closed before the isolated adapter is called. Once reserved, an adapter
failure consumes the command and produces only a sanitized failure Receipt.

Time comes from an injected clock authority, not a caller-supplied timestamp.
The runner enforces
`proposal.created_at <= approval.approved_at <= trusted_clock.now()` and both
expiries. Approval must also be verified through an approval SOT port, which
returns the approval authority and durable receipt identity used in evidence
and receipt lineage. Gate 1 supplies fixture implementations only; production
requires a separately approved trusted clock and durable approval SOT.

The query artifact is copied into boundary-private bytes before SHA
verification. Only that verified snapshot can cross the later asynchronous
approval and reservation steps into the isolated adapter; caller mutation
cannot replace the approved bytes after verification.

The raw adapter result, provider tuple, target association, and PostgreSQL row
are runtime exact-key contracts. Unknown, recursive, raw, credential, token,
secret, URL, endpoint, and password material fails closed. The adapter must
bind both observations to the exact reserved command, nonce, target, and
artifact. The sanitized association digest binds the provider fingerprint and
cluster digest to that lineage. A real adapter and same-target qualification
remain required before Gate 2.

Gate 1's callable implementation accepts only `ISOLATED_FAKE_TEST`. It has no
production adapter, credential resolver, environment lookup, network client,
or database client. Future raw handling requires a dedicated single-use
isolated process whose only output is the sanitized receipt.

## Durability and separate approval

The reservation port formally requires atomic durable reservation and durable
consumed-receipt finalization for future production use. The supplied in-memory implementation is explicitly
`PROCESS_LOCAL_TEST_ONLY`; it proves single-process semantics only and makes no
production replay, crash recovery, reconnect, or concurrency durability claim.

Fixture receipt validation uses an expected envelope containing exact proposal,
approval, approval-authority receipt, command, nonce, state, reason, and
association digest. It enforces `command_id=command:<approval_id>`, success only
for `EVIDENCE_CREATED` with matching evidence, failure only for a failure reason
with no evidence, and recomputes the association digest from command lineage,
provider fingerprint, cluster digest, and immutable target. Coordinated field
tampering is rejected.

Every Gate 1 receipt carries `NON_PRODUCTION_FIXTURE`. The fixture receipt
validator checks that class and the available boundary, proposal, approval,
command, nonce, query authority/artifact, target association, outcome, and
fixture-evidence lineage bindings. Nonce grammar and sanitized approval
authority/receipt references are enforced for failure receipts as well as
success receipts. The production receipt validator rejects
the same valid fixture receipt, classification-only tampering,
evidence/receipt classification mismatch, and coordinated fixture-field
tampering. Structural or fixture validity is not production lineage validity.
Production receipt authority and issuance are `NOT_ESTABLISHED`; Gate 1 has no
production receipt constructor or production callable mode.

Receipt validation is likewise three-layered. Structural receipt validation
checks only schema/exact keys, identifier/nonce/reference grammar, outcome and
sanitized-field shape, and authority-identifier shape; a structurally valid
production-looking class does not acquire authority. Fixture validation adds
the exact Gate 1 expected lineage and fixture evidence/receipt coherence.
Production validation requires production-specific evidence and receipt
lineage authority and therefore fails closed while that authority remains
`NOT_ESTABLISHED`.

A receipt is returned as consumed only after the store reports finalization.
If finalization throws or cannot prove persistence after an attempt, the runner
returns `COMMAND_OUTCOME_UNKNOWN`, does not return a consumed receipt, and
makes no retry or success claim. This fail-closed uncertainty state is not a
durability guarantee; automatic retry remains zero.

An exception or uncertainty during reservation similarly returns
`COMMAND_RESERVATION_OUTCOME_UNKNOWN` before the adapter is called.

No durable table, migration, schema, RLS, role, permission, or persistence
implementation is added in Gate 1. Durable implementation and its migration or
storage authority require a separate Product Owner scope and human approval
before Gate 2 can execute production evidence acquisition.

## Manifest reservation and unchanged boundaries

The future reservation remains:

```text
manifest_id: production-target-apparetenkei-farmos-core-mac-01-apparetenkei-primary-farm
revision: 1
purpose: production_target_identity_collection
access_mode: READ_ONLY
transaction_read_only_required: true
approved_target_schema_scope: ai,audit,core_schema
```

No concrete manifest revision is claimed. `PRODUCTION_TARGET_MANIFEST_REQUIRED`
remains unresolved until formal provider and cluster evidence exists and the
later manifest gate is separately approved.

The v1-v5 query artifacts, v5 adoption, v5 `CURRENT_REPOSITORY_AUTHORITY`, v5
`NOT_RUNTIME_BOUND`, runtime Foundation, Closure Lock, Day150.5, and Day151 are
unchanged. Gate 1 authorizes no stage, commit, push, production observation,
Gate 2, Phase B, runtime binding, Proposal Apply, or production execution.

## Rollback

Because this candidate adds source-only files and no durable state, rollback is
removal of the Gate 1 candidate files before commit review. It requires no data
compensation, migration rollback, credential action, provider operation, or
database operation.
