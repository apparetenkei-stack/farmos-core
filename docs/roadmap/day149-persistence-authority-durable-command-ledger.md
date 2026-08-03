# Day149 Persistence Authority — Durable Review Decision and Command Receipt Boundary

## 1. Status and authority

```yaml
day149_persistence_authority:
  status: ACTIVE
  formal_decision: DAY149_PERSISTENCE_AUTHORITY_COMPLETE
  product_owner_authorized: true
  canonical_document: docs/roadmap/day149-persistence-authority-durable-command-ledger.md
  authority_base_commit: 514b72f36d8ad017837d1be80a4bfd2f5f9eec88
  authority_establishment_scope: documentation_only
  source_implementation_started: false
  migration_created_or_applied: false
  production_apply_authorized: false
  day150_authorized: false
```

This document is the canonical persistence supplement to
`docs/roadmap/day149-candidate-review-promotion-supersede-rebuild-command.md`.
It resolves only that document's
`BLOCKED_DAY149_PERSISTENCE_AUTHORITY_CONFLICT`. All Review, Promote, Reject,
Rebuild, expected-version, latest-review, authorization, idempotency,
compensation, and state-transition semantics remain unchanged.

After this document is committed and pushed, a later Day149 implementation
turn may implement the exact forward migration, existing-repository extension,
tests, and isolated PostgreSQL validation defined here. This docs-only change
does not itself authorize production apply, source editing in this turn, a
database connection, or Day150.

## 2. Repository baseline and protected worktree

```yaml
repository:
  path: /Users/hayate/projects/farmos-core
  branch: main
  authority_start_head: 514b72f36d8ad017837d1be80a4bfd2f5f9eec88
  authority_start_origin_main: 514b72f36d8ad017837d1be80a4bfd2f5f9eec88
  required_ahead_behind: 0/0
  required_staged_files: 0
protected_untracked:
  path: tsconfig.tsbuildinfo
  sha256: 4ec54d59e72843bbf8f7fdf19c8dbd351738920457ff715979964637f3d35ccb
```

The protected file must remain unmodified, untracked, unstaged, and present.
No `git clean`, restore, reset, stash, rename, regeneration, or deletion is
authorized.

## 3. Repository inspection resolution

```yaml
persistence_inspection:
  migration_directory: db/migrations
  latest_manifest_migration_sequence: 202607310001
  day146_foundation_sql: scripts/sql/day146_operational_memory_snapshot_persistence.sql
  day147_prepare_migration: 202607300001_daily_operational_projection_candidate_foundation
  day147_activate_migration: 202607310001_daily_operational_projection_candidate_activation
  projection_table: ai.operational_memory_daily_projections
  state_event_table: ai.operational_memory_projection_state_events
  lineage_table: ai.operational_memory_projection_lineage
  existing_advisory_lock:
    repository_key: farmos_operational_memory_v1
    repository_sql: select pg_advisory_xact_lock(hashtext($1::text))
    transition_scope_lock: Day147 business-date and projection-type lock
  existing_transaction_function: absent
  existing_bundle_write_function: ai.persist_operational_memory_bundle
  existing_repository_transaction: FarmOsOperationalMemoryPostgresRepository.ingest
  existing_command_ledger: absent
  existing_review_ledger: absent
  existing_idempotency_constraint: absent_for_projection_commands
  existing_append_only_trigger: operational_memory_projection_state_events_append_only
  existing_append_only_function: ai.reject_operational_memory_immutable_mutation
  existing_permission_pattern:
    - NOLOGIN service roles
    - PUBLIC, anon, and authenticated direct access revoked
    - server repository uses parameterized SQL inside an explicit transaction
    - trigger functions are SECURITY INVOKER with direct EXECUTE revoked
  isolated_postgres_harness: scripts/hermes/test_farm_os_day147a5_isolated_postgres.ts
  minimum_forward_change:
    - two append-only ledger tables
    - one fixed-search-path command writer function
    - four fixed-search-path integrity trigger functions
    - five triggers
    - one least-privilege NOLOGIN transaction role
    - one method on the existing PostgreSQL repository
    - one forward migration and one read-only verification script
```

The current repository owns `begin isolation level read committed read write`,
statement and lock timeouts, the global `farmos_operational_memory_v1`
advisory lock, readback, commit, rollback, and client release. Candidate
ingestion uses `ai.persist_operational_memory_bundle`; its public behavior and
Candidate-only readback contract are not widened by Day149.

The Day147 insert trigger remains the only database transition authority for
Projection lifecycle events. It already enforces Candidate-first transitions,
monotonic event sequences, the projection-scope advisory lock, and the
single-Active invariant. Day149 must not create another transition table or
rewrite those rules.

## 4. Persistence model decision

Two tables are the minimum safe model:

1. `ai.operational_memory_projection_review_decisions`
2. `ai.operational_memory_projection_command_receipts`

A single combined table was evaluated and rejected. It would make review
sequence, latest-decision lookup, command outcomes, and affected state events
one nullable polymorphic record, weakening exact constraints and audit
separation. Two tables preserve a dedicated immutable review history while a
single global receipt table owns all four command types and replay uniqueness.

```yaml
model_comparison:
  one_table:
    selected: false
    reason:
      - mixes review facts and command results
      - requires broad nullable cross-field states
      - weakens latest-review indexing and review-to-receipt binding
  two_tables:
    selected: true
    reason:
      - exact append-only review sequence
      - global command and idempotency uniqueness
      - durable receipt replay independent of current Projection state
      - exact relational binding to committed state events
```

Projection state events do not receive a JSON payload or command metadata.
Existing Projection rows and state events remain immutable and unchanged.

## 5. Review decision ledger

The exact table is
`ai.operational_memory_projection_review_decisions`.

```yaml
review_decision_ledger:
  append_only: true
  columns:
    review_id: text primary key, pattern ^projection_review_[0-9a-f]{32}$
    candidate_projection_id: text not null foreign key
    candidate_projection_version: integer not null positive
    candidate_state_sequence: bigint not null positive
    candidate_content_hash: text not null lowercase 64-hex
    review_sequence: bigint not null positive
    decision: approve | reject | request_rebuild
    reason: trimmed non-empty text, maximum 2000 characters
    reviewed_by: server-derived actor text, 3 through 128 characters
    reviewed_at: timestamptz not null
    command_id: text not null unique
    canonical_payload_hash: sha256-prefixed lowercase digest
  keys:
    - primary key review_id
    - unique command_id
    - unique candidate_projection_id, candidate_projection_version, review_sequence
  foreign_keys:
    - candidate_projection_id to ai.operational_memory_daily_projections(projection_id), update and delete restricted
    - command_id to ai.operational_memory_projection_command_receipts(command_id), deferrable initially deferred
```

The review sequence is scoped to the exact Candidate ID and Projection
version. The first sequence is `1`; every subsequent decision is exactly the
previous maximum plus one. The review integrity trigger acquires the existing
global repository advisory lock and verifies Candidate ID, Projection version,
content hash, and latest state-event sequence before the insert succeeds.

Review eligibility is decision-specific:

```yaml
review_state_eligibility:
  approve:
    - candidate
  reject:
    - candidate
  request_rebuild:
    - candidate
    - rejected
    - failed
  active: prohibited
  superseded: prohibited
```

This preserves Candidate-only approval and rejection while allowing the
canonical explicit Rebuild path after a rejected or failed Candidate. Rebuild
always creates a new Candidate; it never returns the reviewed Projection to
Candidate.

The latest decision is resolved by the greatest `review_sequence` for the
exact Candidate ID and version. History is never updated or deleted. A later
decision makes earlier references stale but does not erase them.

`reason` is governance text, not an unrestricted log. The server command
parser must reject control characters, credentials, connection strings,
absolute paths, raw SQL, and other prohibited secret-like content before the
repository boundary.

## 6. Command receipt ledger

The exact table is
`ai.operational_memory_projection_command_receipts`.

```yaml
command_receipt_ledger:
  append_only: true
  columns:
    receipt_schema_version: farmos.projection.command-receipt.v1
    command_id: text primary key, pattern ^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$
    idempotency_key_hash: sha256-prefixed lowercase digest, unique
    command_type: review_projection_candidate | promote_projection_candidate | reject_projection_candidate | rebuild_projection_candidate
    canonical_payload_hash: sha256-prefixed lowercase digest
    result_status: succeeded | rejected
    result_code: exact Day149 committed result code
    result_payload: exact allowlisted farmos.projection.command-result.v1 JSON object
    result_payload_hash: sha256-prefixed lowercase digest
    requested_by: server-derived actor text, 3 through 128 characters
    requested_at: timestamptz not null
    committed_at: server-derived timestamptz not null
    review_decision_id: nullable review foreign key
    affected_projection_id_1: nullable Projection foreign key
    committed_state_event_id_1: nullable state-event foreign key
    committed_state_event_sequence_1: nullable positive bigint
    affected_projection_id_2: nullable Projection foreign key
    committed_state_event_id_2: nullable state-event foreign key
    committed_state_event_sequence_2: nullable positive bigint
  uniqueness:
    global_command_id: primary key
    global_idempotency_key: unique idempotency_key_hash
  raw_idempotency_key_persisted: false
```

The canonical command payload includes the raw idempotency key for command
fingerprinting, but persistence stores only its SHA-256 identity. The receipt
stores no raw command JSON, source input, reason text, Projection content,
credential, endpoint, environment value, or stack.

`result_payload` is not arbitrary JSON. It has the exact keys
`schema_version`, `command_id`, `command_type`, `outcome`, `result_code`,
`review_decision_id`, `affected_projection_ids`, and
`committed_state_event_sequences`. Unknown keys, nested objects, raw input,
free-form messages, and secret-like values are rejected. Its canonical JSON
bytes are bound by `result_payload_hash`, and every value must equal the typed
receipt columns. The shared TypeScript canonicalizer sorts exact keys and
computes the hash before persistence, then recomputes it from database readback
and before replay return; the migration does not assume an uninstalled hashing
extension. Exact replay after restart returns this stored allowlisted payload
only after that verification.

The two affected/event slots are exact because a Day149 command commits at
most two lifecycle events. A replacement promotion stores old Active
`superseded` in slot 1 and Candidate `active` in slot 2. First promotion,
rejection, and rebuild use slot 1 only. Review uses neither slot. Slot 2 is
invalid unless slot 1 is complete; IDs must differ and sequence 2 must be
greater than sequence 1.

Every affected Projection ID references
`ai.operational_memory_daily_projections`. Every event ID references
`ai.operational_memory_projection_state_events`. The receipt integrity trigger
verifies that each stored sequence, event ID, Projection ID, and status refer
to the exact event visible in the current transaction.

Successful committed result codes are exact:

```yaml
successful_result_codes:
  review_projection_candidate: review_recorded
  promote_projection_candidate: projection_promoted
  reject_projection_candidate: projection_rejected
  rebuild_projection_candidate: projection_rebuilt
```

Committed domain rejections may use only the canonical Day149 failure taxonomy
that is valid after authentication and repository entry. Authentication,
authorization, malformed command, repository unavailable, readback failure,
receipt-integrity failure, transaction failure, and duplicate-key payload
conflict do not create a new receipt. A failed transaction writes neither
state events, review decision, nor receipt.

```yaml
persistable_rejected_result_codes:
  - candidate_not_found
  - candidate_not_candidate
  - review_version_conflict
  - review_decision_missing
  - review_decision_invalid
  - review_decision_stale
  - approval_missing
  - approval_invalid
  - candidate_version_conflict
  - active_version_conflict
  - active_identity_conflict
  - projection_key_mismatch
  - multiple_active_conflict
  - invalid_state_transition
  - lineage_invalid
  - content_hash_invalid
  - rebuild_input_unavailable
  - rebuild_input_stale
  - rebuild_input_ambiguous
  - rebuild_input_invalid
non_persistable_failures:
  - command_contract_invalid
  - authentication_required
  - authorization_denied
  - duplicate_command_conflict
  - command_receipt_invalid
  - readback_failed
  - repository_unavailable
  - transaction_failed
```

## 7. Cross-table and result constraints

```yaml
receipt_cross_field_contract:
  review_recorded:
    review_decision_id: required
    affected_event_slots: 0
    same_command_and_payload_as_review: required
  projection_promoted:
    latest_approve_review: required
    affected_event_slots: 1_or_2
    slot_1_when_single: candidate_to_active
    slot_1_when_pair: old_active_to_superseded
    slot_2_when_pair: candidate_to_active
  projection_rejected:
    latest_reject_review: required
    affected_event_slots: 1
    slot_1: candidate_to_rejected
  projection_rebuilt:
    latest_request_rebuild_review: required
    affected_event_slots: 1
    slot_1: missing_to_candidate
  rejected:
    affected_event_slots: 0
    state_write_count: 0
```

The review table's deferred `command_id` foreign key and the receipt table's
deferred `review_decision_id` foreign key make it impossible to commit an
unreceipted review decision. The write function uses one fixed order: insert
the Review decision first, then insert its receipt. The existing repository
invokes the writer exactly once per command transaction.

The receipt binding guard is an `AFTER INSERT` constraint trigger that is
`DEFERRABLE INITIALLY DEFERRED`. At commit it acquires the same global advisory
lock, validates the final cross-field state above, and verifies that a
referenced review is still the latest decision for the exact Candidate
version. It does not replace the server-side capability check or the canonical
TypeScript command parser. It also rejects a receipt when either event ID
already appears in either event slot of another receipt; one committed event
cannot be claimed by two commands.

A deferred constraint trigger on new `active`, `rejected`, and `superseded`
Projection state events requires each such event to be referenced by exactly
one successful Day149 command receipt at commit. The Day149 transaction role
has no table INSERT privilege; its only write capability is the exact command
writer function, which requires a matching receipt for every event it writes,
including Rebuild `candidate`. Initial `candidate` and `failed` events remain
available only to separately authorized existing persistence boundaries and do
not become Day149 command side doors.

## 8. Idempotency and exact replay

```yaml
idempotency:
  command_id_scope: global_across_all_four_command_types
  idempotency_key_scope: global_across_all_four_command_types
  persisted_identity: sha256_of_raw_idempotency_key
  canonical_payload_hash: exact_server_canonical_bytes
  same_command_and_key_and_payload: return_exact_committed_receipt
  same_command_or_key_different_payload: duplicate_command_conflict
  mutable_eligibility_checked_before_replay: false
  extra_review_writes_on_replay: 0
  extra_projection_writes_on_replay: 0
  extra_state_events_on_replay: 0
  extra_receipts_on_replay: 0
  replay_after_process_restart: required
```

The repository transaction order is fixed:

1. receive a server-authorized, exact parsed command;
2. begin READ COMMITTED READ WRITE and set bounded statement/lock timeouts;
3. set the fixed Day149 transaction role;
4. acquire `pg_advisory_xact_lock(hashtext('farmos_operational_memory_v1'))`;
5. query receipt by command ID and idempotency-key hash;
6. return an exact matching committed receipt, or reject a collision;
7. only for a new command, validate review, expected versions, state, lineage,
   content hash, and projection key;
8. append the authorized review, Projection, lineage, and state-event records;
9. append the command receipt;
10. read back the exact receipt, decision, events, and resulting state;
11. commit.

An exact replay does not require the Candidate still to be Candidate. No cache
or process memory can substitute for the committed receipt.

## 9. Atomicity and lock coordination

```yaml
atomicity:
  transaction_owner: FarmOsOperationalMemoryPostgresRepository
  isolation: READ_COMMITTED_READ_WRITE
  global_lock_key: farmos_operational_memory_v1
  day147_projection_scope_lock: retained
  review_and_receipt_same_transaction: true
  events_and_receipt_same_transaction: true
  rebuild_candidate_and_receipt_same_transaction: true
  readback_before_commit: true
  failed_transaction_writes_nothing: true
  partial_transition_possible: false
```

The global repository lock serializes command ID/idempotency decisions with
existing Candidate ingestion and Rebuild persistence. The Day147 trigger then
serializes the narrower business-date and Projection-type Active scope. The
lock order is always global repository lock first, Day147 scope lock second;
reversing it is prohibited.

## 10. Exact forward migration scope

The authorized migration is:

```yaml
migration:
  migration_id: 202608030001_daily_operational_projection_command_ledger
  sequence: 202608030001
  apply_script: db/migrations/202608030001_daily_operational_projection_command_ledger.sql
  verification_script: db/migrations/202608030001_daily_operational_projection_command_ledger.verify.sql
  description: Add durable review decisions and atomic Projection command receipts
  created_at: 2026-08-03T00:00:00.000Z
  startup_auto_apply: false
  production_apply_authority: authenticated_human_operator
```

The apply migration is immutable, forward-only, explicitly transactional, and
must preflight the exact Day146 tables and Day147 lifecycle triggers before any
new object is created.

```yaml
migration_scope:
  new_tables:
    - ai.operational_memory_projection_review_decisions
    - ai.operational_memory_projection_command_receipts
  new_indexes:
    constraint_backed:
      - review_decisions primary key review_id
      - review_decisions unique command_id
      - review_decisions unique candidate_projection_id, candidate_projection_version, review_sequence
      - command_receipts primary key command_id
      - command_receipts unique idempotency_key_hash
    explicit:
      - idx_operational_memory_projection_receipt_review on review_decision_id where review_decision_id is not null
    latest_review_resolution: backward scan of the exact unique candidate_projection_id, candidate_projection_version, review_sequence index
  new_constraints:
    review_decisions:
      - operational_memory_projection_review_decisions_pkey
      - operational_memory_projection_review_decisions_command_id_key
      - operational_memory_projection_review_decisions_candidate_sequence_key
      - operational_memory_projection_review_decisions_review_id_check
      - operational_memory_projection_review_decisions_version_check
      - operational_memory_projection_review_decisions_state_sequence_check
      - operational_memory_projection_review_decisions_content_hash_check
      - operational_memory_projection_review_decisions_review_sequence_check
      - operational_memory_projection_review_decisions_decision_check
      - operational_memory_projection_review_decisions_reason_check
      - operational_memory_projection_review_decisions_actor_check
      - operational_memory_projection_review_decisions_command_id_check
      - operational_memory_projection_review_decisions_payload_hash_check
      - operational_memory_projection_review_decisions_projection_fkey
      - operational_memory_projection_review_decisions_receipt_fkey, deferrable initially deferred
    command_receipts:
      - operational_memory_projection_command_receipts_pkey
      - operational_memory_projection_command_receipts_idempotency_key_hash_key
      - operational_memory_projection_command_receipts_schema_check
      - operational_memory_projection_command_receipts_command_id_check
      - operational_memory_projection_command_receipts_idempotency_hash_check
      - operational_memory_projection_command_receipts_command_type_check
      - operational_memory_projection_command_receipts_payload_hash_check
      - operational_memory_projection_command_receipts_result_status_check
      - operational_memory_projection_command_receipts_result_code_check
      - operational_memory_projection_command_receipts_result_payload_check
      - operational_memory_projection_command_receipts_result_hash_check
      - operational_memory_projection_command_receipts_actor_check
      - operational_memory_projection_command_receipts_slot_pairing_check
      - operational_memory_projection_command_receipts_slot_order_check
      - operational_memory_projection_command_receipts_review_fkey, deferrable initially deferred
      - operational_memory_projection_command_receipts_affected_projection_1_fkey
      - operational_memory_projection_command_receipts_affected_projection_2_fkey
      - operational_memory_projection_command_receipts_state_event_1_fkey
      - operational_memory_projection_command_receipts_state_event_2_fkey
  new_functions:
    - ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb)
    - ai.reject_operational_memory_projection_command_ledger_mutation()
    - ai.enforce_operational_memory_projection_review_binding()
    - ai.enforce_operational_memory_projection_command_receipt_binding()
    - ai.require_operational_memory_projection_command_receipt()
  new_triggers:
    - operational_memory_projection_review_decisions_append_only
    - operational_memory_projection_command_receipts_append_only
    - operational_memory_projection_review_binding_guard
    - operational_memory_projection_command_receipt_binding_guard, constraint trigger, deferrable initially deferred
    - operational_memory_projection_command_receipt_required, constraint trigger on new active, rejected, and superseded events, deferrable initially deferred
  new_roles:
    - farmos_core_projection_command_transaction NOLOGIN
  grants_and_revokes:
    - revoke all new-table and new-function access from PUBLIC
    - revoke all new-table and new-function access from anon when present
    - revoke all new-table and new-function access from authenticated when present
    - grant ai schema usage to farmos_core_projection_command_transaction
    - grant SELECT on Projection, state-event, lineage, review, and receipt tables to the transaction role
    - grant EXECUTE only on ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb) to the transaction role
    - grant no table INSERT or identity-sequence privilege to the transaction role
    - revoke UPDATE and DELETE on all five tables from the transaction role
    - revoke direct EXECUTE on all four new trigger functions from the transaction role
    - grant no transaction-role membership to any LOGIN in this migration
  manifest_changes:
    - append exactly one migration entry to db/provisioning/manifest.json
    - store the exact final apply SHA-256
    - preserve all prior entries, order, paths, descriptions, and checksums
  repository_method_changes:
    - add one typed executeProjectionCommand method to FarmOsOperationalMemoryPostgresRepository
    - reuse existing pool, BEGIN mode, timeouts, global lock, readback, rollback, and release
    - call only the fixed parameterized ai.persist_operational_memory_projection_command(jsonb,jsonb,jsonb,jsonb,jsonb) writer
    - execute exactly one command writer call per transaction
    - keep ingest and readState observable behavior unchanged
    - add no parallel repository
  isolated_test_fixture_changes:
    - extend a Day149-specific harness with Day146 base, Day147 PREPARE and ACTIVATE, then the Day149 migration
    - create only nonce-bound migration-owner, command-runtime-login, verification, and denial roles
    - grant the isolated command-runtime-login membership in the fixed farmos_core_projection_command_transaction NOLOGIN role
    - add no production, Supabase, or shared database connection
  package_scripts:
    - test-farm-os-day149-persistence-authority
    - test-farm-os-day149-projection-command-boundary
    - typecheck-farm-os-day149-projection-command-boundary
```

The transaction role has no LOGIN, CREATE DATABASE, CREATE ROLE, SUPERUSER,
BYPASSRLS, table INSERT, identity-sequence, UPDATE, or DELETE authority. Its
only write capability is EXECUTE on the exact command writer function.
Production login membership is a separate deployment action and is not granted
or applied by this Authority phase.

The writer function inputs are exact persistence records in this order:
`receipt`, nullable `review_decision`, nullable Rebuild `projection`, an array
of zero through two `projection_events`, and a Rebuild `lineage` array. They are
not raw commands. The function rejects unknown keys, invalid combinations,
more than one command, or any write plan not represented by the exact receipt.
It returns the stored allowlisted `result_payload`. It does not commit; the
existing repository owns transaction commit and rollback.

## 11. Writer, trigger, and function security

The command writer function is `SECURITY DEFINER`, `VOLATILE`, has
`SET search_path = pg_catalog`, uses only schema-qualified fixed identifiers,
and contains no dynamic SQL. Its owner is the owner of the protected tables;
PUBLIC, anon, and authenticated EXECUTE are revoked. Only the NOLOGIN command
transaction role receives EXECUTE.

The four trigger functions are `SECURITY INVOKER`, `VOLATILE`, have the same
fixed search path and identifier rules, and contain no dynamic SQL. Their
owners must equal the owner of the protected tables. Direct EXECUTE is revoked
because they run only as triggers.

```yaml
security:
  public_access: revoked
  anon_access: revoked
  authenticated_direct_access: revoked
  service_boundary_only: true
  service_role: farmos_core_projection_command_transaction
  search_path_fixed: true
  dynamic_sql: prohibited
  string_concatenated_sql: prohibited
  actor_server_derived: true
  capability_server_checked_before_repository: true
  command_writer_security_definer: true
  command_writer_execute_role_only: true
  trigger_functions_security_invoker: true
  direct_trigger_function_execute: revoked_for_all_four
  secrets_in_receipt: prohibited
  raw_idempotency_key_in_database: prohibited
  raw_command_payload_in_database: prohibited
  rls_change: prohibited; existing explicit ACL pattern retained
  production_credential_change: prohibited
```

Database constraints and triggers defend durable integrity; they do not infer
human identity or capability. Authentication, actor binding, and exact command
capability checks remain server-owned prerequisites from the canonical Day149
command Authority.

## 12. Verification and manifest authority

The read-only verification script must start with a read-only transaction and
end with rollback. It verifies exactly:

- migration-history ID, sequence, and final apply checksum;
- both table schemas, exact columns, constraints, indexes, and foreign keys;
- all five functions' owner, security mode, volatility, fixed search path, and
  exact definitions;
- all five trigger bindings, deferred timing, and append-only behavior;
- command and idempotency uniqueness;
- latest-review index and monotonic binding trigger;
- receipt-to-review and receipt-to-event binding;
- PUBLIC, anon, and authenticated denial;
- exact transaction-role privileges and absence of direct table INSERT,
  sequence, UPDATE, or DELETE;
- unchanged Day147 transition and initial-Candidate triggers;
- unchanged Candidate ingestion function signature;
- no startup auto-apply.

The future authority test must pin the apply and verify SHA-256 values and
assert the manifest contains exactly one new final entry. Runtime hash
auto-acceptance, wildcard checksum acceptance, or modification of an earlier
migration checksum is prohibited.

## 13. Exact future implementation file scope

This docs-only phase changes no source. A later Day149 implementation may
change only the following exact files unless Product Owner expands scope:

```yaml
future_implementation_scope:
  create:
    - db/migrations/202608030001_daily_operational_projection_command_ledger.sql
    - db/migrations/202608030001_daily_operational_projection_command_ledger.verify.sql
    - scripts/hermes/test_farm_os_day149_persistence_migration_authority.ts
    - scripts/hermes/test_farm_os_day149_projection_command_boundary.ts
  modify:
    - db/provisioning/manifest.json
    - src/lib/hermes/farm_os_operational_memory_postgres_repository.ts
    - package.json
  command_contract_files:
    - only files separately authorized by the canonical Day149 command Authority implementation scope
  prohibited:
    - src/lib/hermes/farm_os_projection_state_contract.ts
    - src/lib/hermes/farm_os_projection_first_selector.ts
    - src/lib/hermes/farm_os_daily_operational_projection_generator.ts
    - scripts/sql/day146_operational_memory_snapshot_persistence.sql
    - existing Day147 migration files
    - production configuration or credentials
```

If the exact model cannot be implemented within this scope, stop with
`BLOCKED_DAY149_PERSISTENCE_MODEL_CONFLICT` or request explicit scope expansion.

## 14. Isolated PostgreSQL validation authority

This Authority permits one authoritative isolated run only in the later
implementation turn and only after pure/static, migration-authority, targeted
typecheck, and related regression gates pass.

The exact later invocation is:

```text
pnpm exec tsx scripts/hermes/test_farm_os_day149_projection_command_boundary.ts --mode=execute-isolated --authority=DAY149_PROJECTION_COMMAND_ISOLATED_EXECUTION
```

```yaml
isolated_postgres:
  authorized_after_static_gate: true
  disposable: true
  nonce_bound: true
  production: false
  shared_database: false
  approved_prior_migrations_only: true
  new_day149_migration_under_test: true
  authoritative_run_count: 1
  retry_without_new_authority: prohibited
  persistent_volume: false
  cleanup_required_on_success_and_failure: true
  validation:
    - review durability after client and pool reconnect
    - exact replay after reconnect and process-state reset
    - same key different payload conflict
    - global command ID collision
    - monotonic latest review decision
    - atomic first promotion and receipt
    - atomic replacement promotion, supersede, and receipt
    - rollback on injected event failure
    - rollback on injected receipt failure
    - concurrent promotion single winner
    - one active invariant
    - rejected command durable replay
    - append-only update and delete denial
    - command transaction role direct INSERT denial on all existing and new tables
    - Rebuild candidate cannot commit without the matching receipt
    - failed event cannot be written through the Day149 command writer
    - PUBLIC, anon, authenticated, and attacker denial
```

The run may apply the exact pinned Day146 fixture SQL, Day147 PREPARE and
ACTIVATE migrations, and the new Day149 migration only to its disposable
database. It may not connect to Supabase, production, the farming application,
or an existing local development database. The harness must clean up every
client, container, port, role, and temporary artifact it owns.

## 15. Existing boundary preservation

```yaml
preservation:
  candidate_ingestion_behavior: unchanged
  persist_operational_memory_bundle_signature: unchanged
  projection_rows_mutable_update: prohibited
  projection_state_event_update_or_delete: prohibited
  day147_transition_contract: unchanged
  day147_single_active_invariant: unchanged
  projection_first_selector: unchanged
  day148_generator: unchanged
  farming_application_write: 0
  automatic_promotion: 0
  production_operation: 0
```

Rebuild persistence inserts only the exact validated Day148 Candidate,
Candidate event, lineage, and command receipt within the new repository
transaction. It does not change the existing ingestion method or bundle
function. Promote and Reject append state events; they never update a
Projection row.

## 16. Rollback and compensation

```yaml
rollback:
  production_apply_in_this_phase: false
  source_only_before_apply: revert_only_the_uncommitted_Day149_source_changes
  isolated_database_disposable: true
  downgrade_strategy:
    destructive_down_migration: prohibited
    first_response: disable_Day149_command_entry_and_revoke_transaction_role_object_privileges_by_forward_migration
    schema_repair: additive_forward_migration
    ledger_rows: retained_immutable
    projection_events: retained_immutable
  retained_projection_history: required
  retained_active_projection: required
  erroneous_success_compensation: new_candidate_then_new_review_then_separate_promotion
```

A production apply requires separate authenticated-human execution authority.
If a defect is discovered after a future apply, rollback does not DROP ledger
tables, delete receipts, rewrite events, or reactivate a superseded Projection.
A forward containment migration disables new command writes while preserving
audit history; an additive repair migration restores the boundary. An
erroneous successful promotion is compensated only by a new Candidate, new
review, and separate Promote Command.

## 17. Static and regression gates for the later implementation

The later implementation must prove at least:

- exact migration and verification checksums and manifest order;
- exact table, constraint, role, trigger, function, and privilege contracts;
- exact review replay and latest-review freshness;
- exact allowlisted result payload and canonical byte-hash replay after process
  restart;
- global command ID and idempotency collision behavior;
- canonical payload and immutable result hash binding;
- transaction rollback after every injected write/readback failure;
- unchanged Candidate ingestion, Day147 state validator, Day147-A3 writer,
  Day147-A4 selector exclusion, Day148 generator, and Day146 projection-first
  behavior;
- new typecheck diagnostics zero;
- `git diff --check` pass;
- protected `tsconfig.tsbuildinfo` path and SHA-256 unchanged;
- static Docker operations, database connections, migration applies, and
  production operations zero.

## 18. Definition of Done

```yaml
day149_persistence_authority_definition_of_done:
  canonical_document_created: true
  persistence_model_exact: true
  migration_scope_exact: true
  security_scope_exact: true
  repository_scope_exact: true
  idempotency_durability_resolved: true
  transaction_atomicity_resolved: true
  isolated_postgres_scope_authorized: true
  production_apply_authorized: false
  no_test_only_persistence_substitution: true
  deployable_atomicity_possible: true
  existing_candidate_ingestion_preserved: true
  existing_state_contract_preserved: true
  existing_selector_preserved: true
  rollback_defined: true
  day149_source_implementation_started: false
  day150_started: false
  unresolved_p1: 0
  unresolved_p2: 0
```

This Authority is complete only after docs validation, independent Sol-class
semantic review with no P1/P2 findings, a docs-only commit, push, repository
resynchronization, and protected-file verification.

## 19. Stop conditions

- `BLOCKED_DAY149_PERSISTENCE_MODEL_CONFLICT`
- `BLOCKED_DAY149_MIGRATION_SEQUENCE_CONFLICT`
- `BLOCKED_DAY149_SECURITY_AUTHORITY_CONFLICT`
- `BLOCKED_DAY149_ROLLBACK_AUTHORITY_MISSING`
- `BLOCKED_DAY149_SCOPE_EXPANSION`
- `FAILED_DAY149_PERSISTENCE_STATIC_VALIDATION`
- `FAILED_DAY149_PERSISTENCE_ISOLATED_POSTGRES_VALIDATION`

No stop condition authorizes speculative schema changes, a parallel
repository, a test-only ledger presented as deployable persistence, production
apply, or Day150.
