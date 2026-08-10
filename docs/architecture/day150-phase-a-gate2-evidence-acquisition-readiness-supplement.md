# Day150 Phase A Gate 2 Evidence Acquisition Readiness G2-A

Status: `SOURCE_ONLY_READINESS_CANDIDATE`; Gate 2 execution:
`BLOCKED_GATE2_EXTERNAL_FEASIBILITY`; production access, runtime binding, and
Gate 2 execution: `NOT_AUTHORIZED`.

Gate 1 is `DAY150_PHASE_A_GATE1_COMMITTED_AND_PUSHED`. G2-A adds authority and
readiness contracts only. It does not complete a manifest, start Phase B,
construct production evidence or receipts, connect to production, or create a
runtime execution path.

## Bounded command identity and Sol L1 remediation

`farmos.production-target-evidence-command-id.v1` replaces the legacy
production design form `command:<approval_id>`. The legacy form remains a Gate
1 process-local fixture convention and is rejected as a production Gate 2
command identity. Gate 1 historical fixture semantics are unchanged.

The exact sorted-key canonical JSON preimage fields are `approval_id`,
`approval_receipt_id`, `authority_id`, `nonce_digest`, `operation`,
`proposal_id`, `query_artifact_sha256`, and `target_binding_digest`.
Serialization is exact UTF-8 JSON with no whitespace or LF. Unknown or missing
keys, wrong types, coercion, trim, Unicode input, Unicode normalization, and
case normalization are rejected. `authority_id` is the v1 authority ID and
`operation` is the bounded production target identity evidence acquisition
operation.

The output is `g2cmd_` plus the full lowercase SHA-256 hex digest. Its grammar
is `^g2cmd_[a-f0-9]{64}$` and its length is always 70 ASCII bytes. There is no
truncation. In particular, a Gate 1 maximum-length 128-byte approval ID still
produces a 70-byte command ID. This closes the known Sol L1 variable-length
legacy grammar edge.

SHA-256 gives generic collision security of approximately 128 bits and
preimage/second-preimage security of approximately 256 bits. Derivation alone
does not provide production exact-once semantics. Production still requires a
persistent unique constraint, full lineage comparison, atomic reservation,
and the durable finalization rules below.

## Readiness authority and exact prerequisites

`farmos.production-target-evidence-gate2-readiness.v1` is a pure candidate
evaluator. It accepts an exact-key prerequisite evidence object, returns a
deterministic sorted and duplicate-free bounded blocker list, and performs no
filesystem, network, database, environment, credential, clock, Docker, runner,
IPC, persistence, or production operation. Even synthetic `READY` has
`execution_authorized=false`; it cannot transition a phase, bind runtime,
finalize a manifest, enable network, construct credentials, or execute Gate 2.

The exact prerequisite classes are:

- `SOL_L1_COMMAND_ID_REMEDIATED`
- `PROVIDER_SOURCE_AUTHORITY_ESTABLISHED`
- `ACCOUNT_SCOPE_SEMANTICS_ESTABLISHED`
- `DB_LEAST_PRIVILEGE_FEASIBILITY_ESTABLISHED`
- `SESSION_PRINCIPAL_VERIFICATION_ESTABLISHED`
- `PROVIDER_CREDENTIAL_AUTHORITY_ESTABLISHED`
- `DB_CREDENTIAL_AUTHORITY_ESTABLISHED`
- `CONNECTION_AUTHORITY_ESTABLISHED`
- `DURABLE_APPROVAL_SOT_ESTABLISHED`
- `TRUSTED_CLOCK_ESTABLISHED`
- `DURABLE_RESERVATION_FINALIZATION_ESTABLISHED`
- `STORAGE_BACKED_CONCURRENCY_TESTED`
- `STORAGE_BACKED_RESTART_TESTED`
- `STORAGE_BACKED_CRASH_SEMANTICS_TESTED`
- `ISOLATED_RUNNER_ESTABLISHED`
- `SANITIZED_IPC_ESTABLISHED`
- `ROLLBACK_CLOSE_INTEGRATION_ESTABLISHED`
- `TARGET_ASSOCIATION_AUTHORITY_ESTABLISHED`
- `PRODUCTION_EVIDENCE_AUTHORITY_ESTABLISHED`
- `PRODUCTION_RECEIPT_AUTHORITY_ESTABLISHED`
- `MINIMAL_OBSERVATION_QUERY_AUTHORITY_MATCH`
- `MINIMAL_OBSERVATION_QUERY_SHA_MATCH`
- `MINIMAL_OBSERVATION_QUERY_COMMITTED_AND_TRACKED`
- `MINIMAL_OBSERVATION_QUERY_SEMANTICS_STABLE`
- `SOURCE_COMMITTED_AND_PUSHED`
- `SOL_FINAL_GO`

Every class must have its class-specific `ESTABLISHED` or `PASS` state.
Anything else is `NOT_READY`. Gate 1 completion, v5 adoption, manifest
reservation, technical PostgreSQL qualification, human approval alone,
credential existence alone, and connection capability alone do not establish
readiness.

The existing minimal observation authority is referenced, not copied:
`farmos.production-target-identity-minimal-observation-query.v1`, artifact SHA
`sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805`.
Authority mismatch, SHA mismatch, untracked/uncommitted status, or semantic
drift blocks readiness. Its SQL is immutable in G2-A.

## External feasibility HOLD

The current correct answer is `NOT_READY`. External verification remains
required for all of the following and G2-A does not guess the answer:

- Supabase provider source authority is `NOT_ESTABLISHED`.
- Actual `account_scope_id` semantics are `NOT_ESTABLISHED`.
- Safe least-privilege execution of
  `pg_control_system().system_identifier` is `NOT_ESTABLISHED`.
- Independent attestation of the actual current session principal is
  `NOT_ESTABLISHED`.

The classification is `EXTERNAL_FEASIBILITY_REQUIRED`. Later verification
must determine whether a production verify-reader can call
`pg_control_system()`, whether exact `EXECUTE`/capability can be granted without
overly broad privilege, and whether the current principal can be independently
attested. If infeasible, a versioned minimal-observation extension or a
provider-attested cluster mapping requires separate design and review. Gate 1
SQL is not changed.

The Supabase fingerprint authority remains
`farmos.supabase-project-resource-fingerprint.v1`. G2-A neither duplicates its
normalization/digest semantics nor determines an actual account scope,
Supabase resource ID, project fingerprint, provider transport, or credential.

## Phase ownership and approval source of truth

Phase A owns the bounded Gate 2 operation profile, provider evidence
semantics, minimal-observation binding, Target Association Authority
requirement, isolated runner/IPC requirement, production evidence authority
requirement, and manifest handoff.

Phase B owns provider credential authority, database credential authority,
Connection Authority, and TLS/target/principal/capability metadata. Phase C
owns Approval SOT, trusted governance clock, Proposal/Approval/Command/Receipt,
durable reservation/finalization, and replay/concurrency/crash semantics. G2-A
does not create shadow canonical Phase B or Phase C state.

A dedicated parallel Gate 2 approval ledger is `PROHIBITED`. Gate 2 must later
consume canonical Phase C durable primitives. Gate 1
`PROCESS_LOCAL_TEST_ONLY`, Day134 in-memory reservation, and the projection
command ledger are not production Gate 2 authority.

## Credential and Connection Authority boundaries

Future credential classes are identifiers only:
`SUPABASE_PROJECT_METADATA_READER` and
`POSTGRES_PRODUCTION_TARGET_VERIFY_READER`. G2-A implements no credential
lookup, resolver, secret broker, environment lookup, token handling, or
connection-string handling.

Future Connection Authority must bind the exact target/resource,
`database_logical_name=farmos_core_prod`, PostgreSQL major 17, TLS
`verify-full`, expected principal/capability attestation, maximum one
connection, retry zero, a bounded timeout, `REPEATABLE READ READ ONLY`, and
revocation/expiry/revision semantics. Generic `DATABASE_URL` fallback is zero.
There is no Connection Authority implementation in G2-A.

## Same-target, evidence, receipt, and durability requirements

Future Phase A Target Association Authority must bind the approved target
binding digest, provider fingerprint and provenance, provider-origin
connection-resource assertion digest, Phase B Connection Authority
ID/revision/target, database logical name, observed cluster digest,
approval/command/nonce, and qualification authority/version. G2-A records the
requirement only and invents no same-target proof.

Production evidence authority and production receipt authority remain
`NOT_ESTABLISHED`. The Gate 1 production validator remains fail closed;
classification labels are not authority. G2-A creates no issuer or
constructor.

Production storage evidence must later prove persistent uniqueness, atomic
CAS, restart survival, concurrency rejection, crash-window semantics, and
atomic final evidence + receipt + terminal transition. Ambiguous reservation
or execution uses `OUTCOME_UNKNOWN`; retry is zero. G2-A adds no migration,
storage adapter, schema, RLS, or persistence.

The future execution boundary requires a dedicated single-use isolated child
process and bounded anonymous-pipe IPC with exact-key framed sanitized payload,
a frame-size limit, no temporary file, and no raw provider, cluster,
credential, or error data. It must prove rollback plus connection close,
provider reads at most one, queries at most one, and retry zero. G2-A implements
no runner, child process, IPC, provider client, database client, constructor,
or runtime binding.

## G2-A boundary

G2-A is source, tests, package scripts, and architecture documentation only.
Production API calls, DB access, environment access, credentials, network,
Docker, migration, RLS, durable persistence, Gate 2 execution, Phase B,
deployment, production access, and runtime binding are all zero. This document
makes no claim of manifest completion. A commit review may follow only after
the source candidate passes its tests, regressions, strict typecheck, static
checks, protected-file check, and independent Sol review. Commit, push, Phase
B, Gate 2 execution, production access, and runtime binding each remain
separate human-authorized steps.
