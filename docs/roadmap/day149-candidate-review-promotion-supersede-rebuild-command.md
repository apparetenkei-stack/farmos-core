# Day149 — Candidate Review, Promote, Supersede and Rebuild Command Boundary

## 1. Status and authority

```yaml
day149_authority:
  status: ACTIVE
  implementation: BLOCKED_PERSISTENCE_AUTHORITY_CONFLICT
  product_owner_authorized: true
  roadmap_version: v4.0
  canonical_document: docs/roadmap/day149-candidate-review-promotion-supersede-rebuild-command.md
  authority_establishment_scope: documentation_only
  implementation_authorized_after_authority_commit_and_push: false
  implementation_blocker: BLOCKED_DAY149_PERSISTENCE_AUTHORITY_CONFLICT
target_systems:
  - FarmOS Core
execution_host:
  - Mac mini
  - /Users/hayate/projects/farmos-core
```

This document is the formal canonical Day149 Authority. It establishes the
bounded command contracts, implementation gates, safety rules, tests, and
completion criteria for Day149. This authority-establishment change is
documentation only. It does not start the Day149 implementation, connect to a
database, apply a migration, promote a Projection, or authorize Day150.

The command contracts in this document are canonical, but implementation is
not yet authorized. The existing Operational Memory schema and repository have
no transactionally durable review/command receipt collection. Current scope
prohibits the forward persistence evolution required to add one. A separate
Product Owner Authority revision must resolve that persistence boundary before
any Day149 source or test implementation starts.

```yaml
authority_precedence:
  current_product_owner_handoff_date: 2026-08-03
  day148_status: COMPLETE
  day148_completion_commit: d70df17f5b25f715a239ec83f340fb2ba60981ac
  older_master_or_day148_status_fields: historical_point_in_time
  retained_contract_authority:
    - master roadmap v4.0 safety and sequencing
    - Day147 Candidate lifecycle and append-only rules
    - Day148 deterministic Candidate-only generator boundary
```

The Product Owner handoff recorded by this Authority resolves the older
point-in-time `Day148: NEXT` and `implementation: NOT_STARTED` status fields.
Those fields do not compete with the verified Day148 completion commit. Their
contract and safety boundaries remain active.

The farming application remains the business source of truth. Projection
promotion changes only which reproducible FarmOS Core derivative is active. It
does not confirm or modify a farming-application business fact.

## 2. Formal name

**Candidate Review, Promote, Supersede and Rebuild Command Boundary**

## 3. Repository base

```yaml
repository_base:
  repository: /Users/hayate/projects/farmos-core
  branch: main
  authority_base_commit: d70df17f5b25f715a239ec83f340fb2ba60981ac
  day148_completion_commit: d70df17f5b25f715a239ec83f340fb2ba60981ac
  required_origin_main: d70df17f5b25f715a239ec83f340fb2ba60981ac
  required_ahead_behind: 0/0
  required_staged_files: 0
protected_untracked:
  path: tsconfig.tsbuildinfo
  sha256: 4ec54d59e72843bbf8f7fdf19c8dbd351738920457ff715979964637f3d35ccb
```

Day149 implementation must begin from a separately verified repository state
after this Authority document has been committed and pushed. A stale,
diverged, dirty, or unverified base does not expand authority and fails closed.

## 4. Predecessor and successor

```yaml
predecessor:
  day: Day148
  status: COMPLETE
  formal_name: Deterministic Daily Operational Projection Generator
  canonical_entrypoint: generateFarmOsDailyOperationalProjection
  canonical_engine: createFarmOsDailyProjectionCandidateBundle
  completion_commit: d70df17f5b25f715a239ec83f340fb2ba60981ac
successor:
  day: Day150
  formal_authority_required: true
  authorized_by_this_document: false
```

Day149 reuses the completed Day147 Candidate foundation and Day148 generator.
It must not change either contract to make promotion easier. Day150 may begin
only after every Day149 completion and entry gate in this document is proven,
the Day149 implementation is committed and pushed under separate authority,
and a formal Day150 Authority is active.

## 5. Objective and rationale

Day149 creates a server-owned boundary for explicit human review, rejection,
promotion, and rebuild commands over persisted Daily Operational Projection
Candidates.

An approval review is evidence that a human approved a specific Candidate
version. It is not itself activation. Promotion is a separate command that
validates the current approve review reference, Candidate version, current Active identity,
idempotency, lineage, and content hash before atomically appending lifecycle
events. When an Active Projection exists for the same projection key, the same
transaction supersedes it and activates the Candidate. Any failure preserves
both prior states.

Rebuild is an explicit command over already-authorized exact Day147-B source
input. It reuses the unchanged Day148 generator to produce a new Candidate and
never changes an Active Projection or promotes automatically.

```yaml
objective:
  human_review_boundary: true
  approval_separate_from_promotion: true
  atomic_replacement_promotion: true
  explicit_rebuild_to_candidate: true
  automatic_promotion: false
rationale:
  - connect Candidate-only generation to active-only reads without bypassing Human in the Loop
  - prevent stale or conflicting commands with exact expected versions
  - make replay safe through one command fingerprint and idempotency contract
  - preserve append-only lifecycle evidence and the prior Active on failure
```

## 6. Existing canonical boundary resolution

```yaml
existing_contracts:
  state_validator:
    symbol: validateFarmOsProjectionStateTransition
    location: src/lib/hermes/farm_os_projection_state_contract.ts
    reuse_required: true
    modification_prohibited: true
  state_materializer:
    symbol: materializeFarmOsProjectionStateHistory
    location: src/lib/hermes/farm_os_projection_state_contract.ts
    reuse_required: true
  in_memory_transaction:
    symbol: FarmOsInMemoryOperationalMemoryRepository.transact
    location: src/lib/hermes/farm_os_operational_memory_persistence.ts
    reuse_required: true
  postgres_repository:
    symbol: FarmOsOperationalMemoryPostgresRepository
    location: src/lib/hermes/farm_os_operational_memory_postgres_repository.ts
    existing_transaction_and_lock_reuse_required: true
    existing_promotion_method: false
  active_selector:
    symbol: resolveFarmOsProjectionFirstActiveProjection
    location: src/lib/hermes/farm_os_projection_first_selector.ts
    modification_prohibited: true
  day148_generator:
    symbol: generateFarmOsDailyOperationalProjection
    location: src/lib/hermes/farm_os_daily_operational_projection_generator.ts
    modification_prohibited: true
  candidate_engine:
    symbol: createFarmOsDailyProjectionCandidateBundle
    location: src/lib/hermes/farm_os_daily_operational_projection_contract.ts
    modification_prohibited: true
projection_specific_existing_commands:
  review: absent
  promote: absent
  reject: absent
  rebuild: absent
projection_specific_existing_idempotency_helper: absent
projection_specific_existing_approval_ledger: absent
```

No competing review, promotion, rejection, or rebuild implementation may be
created. Day149 may add command behavior only through the canonical boundaries
defined here.

The existing PostgreSQL repository exposes Candidate ingestion and read
operations, not durable review receipts, command receipts, or promotion. This
is the confirmed `BLOCKED_DAY149_PERSISTENCE_AUTHORITY_CONFLICT` described in
Sections 19 and 20. A parallel repository, raw-SQL side door, replacement
transaction owner, or test-only ledger presented as deployable persistence is
prohibited.

## 7. Command separation

Day149 has four distinct explicit commands:

1. Review Command
2. Promote Command
3. Reject Command
4. Rebuild Command

`supersede` is not a free-standing user command. It is the existing Active
Projection side of a successful replacement Promote Command. A caller cannot
supersede an Active Projection without activating its reviewed replacement in
the same transaction.

```yaml
command_separation:
  review_changes_projection_state: false
  approve_implies_promotion: false
  reject_review_implies_rejection_write: false
  request_rebuild_implies_rebuild_execution: false
  promote_is_separate_command: true
  reject_is_separate_command: true
  rebuild_is_separate_command: true
  standalone_supersede_command: prohibited
```

## 8. Shared command envelope

Every Day149 command must use an exact, server-validated envelope. Unknown
keys, missing values, normalization, coercion, implicit clocks, client-owned
authorization, and arbitrary strings fail closed.

```yaml
shared_command_envelope:
  schema_version: farmos.projection.command.v1
  required:
    - command_id
    - command_type
    - idempotency_key
    - requested_by
    - requested_at
  command_type:
    - review_projection_candidate
    - promote_projection_candidate
    - reject_projection_candidate
    - rebuild_projection_candidate
  actor_type: authenticated_human
  authenticated_principal_id: server_derived
  requested_by_must_equal_authenticated_principal_id: true
  server_authorization_required: true
  client_supplied_capability: prohibited
  current_clock_default: prohibited
  exact_key_validation: required
required_server_capability:
  review_projection_candidate: farmos_projection_review
  promote_projection_candidate: farmos_projection_promote
  reject_projection_candidate: farmos_projection_reject
  rebuild_projection_candidate: farmos_projection_rebuild
authorization_failure:
  missing_authentication: authentication_required
  missing_capability: authorization_denied
  actor_principal_mismatch: authorization_denied
```

One Day149-owned canonical command fingerprint function must bind the exact
semantic payload, including the command type, command ID, idempotency key,
actor, expected versions, review decision reference, and requested time. Day149 must
not reuse an unrelated Proposal, Execution Gateway, or Daily Brief command
ledger as if it owned Projection lifecycle authority.

Authentication and authorization are server-owned inputs to the command
service. A browser or caller cannot assert a role, capability, or actor ID.
Each command's actor field must equal the authenticated principal ID and that
principal must hold the exact capability listed above. Day149 permits the same
human to submit a Review and a later Promote Command only when both independent
capability checks pass; it does not treat one request as self-approval or
collapse the two commands.

## 9. Review Command

```yaml
review_command:
  schema_version: farmos.projection.review.command.v1
  required:
    - command_id
    - candidate_projection_id
    - expected_candidate_version
    - decision
    - reason
    - requested_by
    - requested_at
    - reviewed_by
    - reviewed_at
    - expected_review_sequence
    - idempotency_key
  decision:
    - approve
    - reject
    - request_rebuild
  actor_required: authenticated_human
  requested_by_equals_reviewed_by: true
  requested_at_equals_reviewed_at: true
  reviewed_by_equals_authenticated_principal_id: true
  reason_required: true
  projection_state_write: 0
  active_write: 0
```

The result is an immutable review decision artifact bound to the exact
Candidate version and command fingerprint. It includes a server-assigned
`review_id`, a monotonic `review_sequence`, the exact Candidate version,
decision, reason, reviewer, review time, and command fingerprint. It is
append-only in the command ledger. Review does not append a Projection state
event. The first review requires `expected_review_sequence: 0`; subsequent
reviews require the exact current sequence and append the next sequence.

Only the latest committed review decision for the exact Candidate version is
authoritative. A later `reject` or `request_rebuild` decision makes every older
`approve` reference stale. A later `approve` similarly supersedes an older
negative decision. A command that references a non-latest review fails with
`review_decision_stale`; review history is never overwritten.

An `approve` decision may later be referenced only by a matching Promote
Command. A `reject` decision may later be referenced only by a matching Reject
Command. A `request_rebuild` decision may later be referenced only by a matching
Rebuild Command. Cross-use, stale sequence, or mismatched Candidate identity or
version is `review_decision_invalid` or `review_decision_stale`. The
promotion-specific aliases `approval_missing` and `approval_invalid` remain
reserved for a missing or invalid approve decision.

## 10. Expected Projection version

The formal expected version is not a timestamp. It binds immutable Projection
identity, persisted Projection version, latest state-event sequence, and
content hash.

```yaml
expected_projection_version:
  required:
    - projection_id
    - projection_version
    - state_sequence
    - content_hash
  projection_version:
    type: positive_safe_integer
  state_sequence:
    type: positive_safe_integer
    meaning: exact latest persisted Projection state-event sequence
  content_hash:
    type: lowercase_sha256
  timestamp_only_version: prohibited
expected_active:
  union:
    - presence: absent
    - presence: present
      required:
        - projection_id
        - projection_version
        - state_sequence
        - content_hash
```

The Candidate expected version must match the persisted Candidate exactly.
The Active expectation must match either exact absence or the one current
Active for the server-owned projection key. A stale identity, state sequence,
Projection version, or content hash rejects before any write.

## 11. Projection key and authority binding

Day149 remains within the completed single-installation, single-farm-scope
boundary. The server owns the farm-scope binding. The command cannot select a
farm, database, table, SQL function, compiler, or Projection kind.

```yaml
projection_key:
  farm_scope: server_owned_installation_binding
  projection_type: daily_work_records
  business_date: exact_candidate_business_date
candidate_and_active_must_match:
  - server_owned_farm_scope
  - projection_type
  - business_date
cross_key_promotion: prohibited
```

## 12. Promote Command

```yaml
promote_command:
  schema_version: farmos.projection.promote.command.v1
  required:
    - command_id
    - candidate_projection_id
    - expected_candidate_version
    - expected_active
    - review_decision_reference
    - requested_by
    - approved_by
    - idempotency_key
    - requested_at
  review_decision_required: approve
  requested_by: authenticated_human
  approved_by: authenticated_human
  approved_by_must_equal_referenced_reviewed_by: true
  requested_by_must_equal_authenticated_principal_id: true
  requested_by_may_equal_approved_by: true
  separate_commands_required_even_when_actor_is_same: true
```

Day149 requires an explicit authenticated-human review and a later explicit
Promote Command, but it does not introduce a new two-person approval policy.
Any future separation-of-duties requirement needs separate Product Owner and
authorization-policy authority.

`review_decision_reference` is the neutral immutable review identifier and
sequence. For Promote only, a referenced current `approve` decision is the
approval. Promotion eligibility for a new command requires all of the
following before the transaction can commit:

- the Candidate exists and materializes exactly as `candidate`;
- the review decision reference is the latest exact valid `approve` review for the same
  Candidate version;
- the expected Candidate version matches current persistence;
- the expected Active union matches the exact current Active state;
- the Candidate and Active belong to the same server-owned projection key;
- Candidate content passes exact hash/readback validation;
- Candidate lineage is complete and valid;
- the idempotency key is unused or is an exact replay;
- every required lifecycle transition passes
  `validateFarmOsProjectionStateTransition` (one transition for a first
  promotion, two for replacement promotion);
- the resulting state has exactly one Active Projection for the key.

## 13. Atomic promotion and supersede semantics

Promotion owns one transaction and one idempotency record. It may not expose
or commit an intermediate state.

When one existing Active is present, the canonical event order is inherited
from Day147:

1. append `active → superseded` for the expected existing Active;
2. append `candidate → active` for the reviewed Candidate;
3. persist the command result and replay identity in the same transaction;
4. read back and prove the resulting exact states and single-Active invariant;
5. commit.

When no Active exists, only `candidate → active` is appended before the same
result/readback checks.

```yaml
atomic_promotion:
  transaction_required: true
  transaction_owner: existing_operational_memory_repository
  advisory_lock_scope: existing_global_farmos_operational_memory_v1
  ingestion_rebuild_and_command_lock_coordinated: true
  command_id_and_idempotency_uniqueness: global_command_ledger
  append_only_events: true
  projection_row_update: prohibited
  lineage_update: prohibited
  existing_active_to_superseded: conditional_required
  candidate_to_active: required
  one_active_per_projection_key: required
  partial_transition: prohibited
  command_receipt_atomic_with_events: required_but_not_currently_expressible
  event_sequence_monotonic: required
```

Because Projection rows are immutable, Day149 does not update
`supersedes_projection_id`. The atomic command audit binds the old and new
Projection IDs while lifecycle truth remains in the paired append-only events.

## 14. Reject Command

```yaml
reject_command:
  schema_version: farmos.projection.reject.command.v1
  required:
    - command_id
    - candidate_projection_id
    - expected_candidate_version
    - review_decision_reference
    - reason
    - requested_by
    - idempotency_key
    - requested_at
  review_decision_required: reject
  requested_by_must_equal_authenticated_principal_id: true
  allowed_transition: candidate_to_rejected
  active_mutation: false
  automatic_rebuild: false
```

A rejected Candidate cannot be promoted or returned to Candidate. A later
attempt must use an explicit Rebuild Command to produce a new valid Candidate.

## 15. Rebuild Command

```yaml
rebuild_command:
  schema_version: farmos.projection.rebuild.command.v1
  required:
    - command_id
    - candidate_projection_id
    - expected_candidate_version
    - source_input
    - source_input_hash
    - review_decision_reference
    - requested_by
    - idempotency_key
    - requested_at
  source_input_contract: farmos.daily_operational_projection.input.v1
  review_decision_required: request_rebuild
  review_candidate_version_must_match: true
  source_projection_key_must_match_reviewed_candidate: true
  generated_projection_key_must_match_reviewed_candidate: true
  requested_by_must_equal_authenticated_principal_id: true
  exact_input_parser: parseFarmOsDailyProjectionInput
  generator: generateFarmOsDailyOperationalProjection
  generated_state: candidate
  candidate_writer_reuse: required_when_persisting
  active_mutation: false
  automatic_promotion: false
```

The source input must already have crossed a separately authorized acquisition
boundary. Day149 does not fetch a Source API, read the farming application,
infer missing facts, or schedule a rebuild. `stale`, `not_fetched`,
`unavailable`, `invalid`, and `ambiguous` retain the Day147-B failure meanings
and produce no Candidate.

The same exact source input and server-owned farm binding must produce the same
Day148 Candidate identity and content. Exact command replay returns the same
result without another Candidate, event, or lineage write. Rebuild never
invokes Promote Command implicitly.

## 16. Idempotency and replay

```yaml
idempotency:
  identity:
    - command_id
    - idempotency_key
    - command_type
    - canonical_payload_hash
  exact_replay:
    same_command_id: required
    same_idempotency_key: required
    same_payload_hash: required
    result: reuse_stored_result
    additional_state_events: 0
    additional_supersede_events: 0
    additional_candidate_writes: 0
  conflict:
    same_idempotency_key_different_payload: duplicate_command_conflict
    same_command_id_different_payload: duplicate_command_conflict
    write_count: 0
```

The idempotency check and command result must share the transaction with any
Projection state events. An in-memory result cache that is not transactionally
bound to the Projection state is insufficient for the isolated PostgreSQL
gate and cannot be represented as production-ready persistence.

The transaction order is exact:

1. parse the exact command and authenticate and authorize its actor;
2. acquire the existing `farmos_operational_memory_v1` advisory lock;
3. look up `command_id` and `idempotency_key` in the durable command ledger;
4. reject a conflicting payload, or return an exact committed replay result;
5. only for a new command, validate the latest review, Candidate, Active,
   expected versions, lineage, and content hash;
6. append the authorized state events and durable command result atomically;
7. read back the exact receipt and states, then commit.

Replay lookup deliberately precedes mutable eligibility checks. A successful
Promote replay therefore returns its stored result even though the Candidate
is now Active, and never appends another state event. A timed-out or otherwise
unresolved operation may not be replayed as success without the exact durable
committed receipt.

## 17. Failure taxonomy and semantics

Day149 uses this exact command failure taxonomy:

```yaml
failure_taxonomy:
  - command_contract_invalid
  - authentication_required
  - authorization_denied
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
  - duplicate_command_conflict
  - invalid_state_transition
  - lineage_invalid
  - content_hash_invalid
  - command_receipt_invalid
  - readback_failed
  - repository_unavailable
  - transaction_failed
  - rebuild_input_unavailable
  - rebuild_input_stale
  - rebuild_input_ambiguous
  - rebuild_input_invalid
```

Day147-B source failures map only at the Rebuild boundary:

```yaml
rebuild_failure_mapping:
  source_not_fetched: rebuild_input_unavailable
  source_unavailable: rebuild_input_unavailable
  source_stale: rebuild_input_stale
  source_ambiguous: rebuild_input_ambiguous
  source_missing: rebuild_input_invalid
  source_invalid: rebuild_input_invalid
  source_hash_mismatch: rebuild_input_invalid
  unsupported_source_schema: rebuild_input_invalid
  business_date_mismatch: rebuild_input_invalid
  duplicate_source_conflict: rebuild_input_invalid
  contract_invalid: rebuild_input_invalid
  exact_day147_b_source_failure_code_preserved: true
```

An implementation must not add ad hoc public failure strings. If this taxonomy
cannot represent an exact observed condition safely, implementation stops for
Authority revision instead of reusing a misleading failure.

`approval_missing` and `approval_invalid` are Promote-specific results for the
required current `approve` review. Reject and Rebuild use the neutral
`review_decision_*` results. Because this Authority permits the same
authenticated human to execute the two separate commands after independent
capability checks, it does not define a self-approval-denied result.

```yaml
failure_semantics:
  candidate_state_unchanged: true
  existing_active_state_unchanged: true
  partial_projection_events: 0
  command_result_claimed_success: false
  retry_safe: true
  production_operation: false
  failure_audit:
    allowed_only_outside_failed_projection_transaction: true
    must_not_claim_projection_transition_committed: true
```

## 18. Candidate-first read safety

The existing selector remains unchanged.

```yaml
selector_safety:
  before_promotion:
    candidate_selectable: false
    current_active_unchanged: true
  after_successful_promotion:
    new_active_selectable: true
    old_superseded_selectable: false
    exact_active_count: 1
  after_failed_promotion:
    candidate_selectable: false
    prior_active_selection_unchanged: true
  rejected_selectable: false
  rebuild_candidate_selectable: false
```

Candidate-first selection must be proven through existing Day147-A4
regressions. Day149 cannot add fallback or modify selector interpretation.

## 19. Implementation scope

This document resolves the command semantics but does not authorize source or
test implementation. The existing PostgreSQL persistence does not have the
durable review-decision and command-receipt collection required to bind replay
identity atomically with Projection events. Adding that persistence is a
forward schema and repository authority decision, not a mechanical extension
of Candidate ingestion.

```yaml
implementation_scope:
  current_authorized_change:
    - this canonical authority document
  current_source_implementation: prohibited
  required_next_authority:
    - durable review decision persistence
    - durable command receipt and uniqueness persistence
    - atomic event and receipt transaction method in the existing repository
    - forward migration, manifest, role, and rollback scope if required
  future_candidate_files_after_separate_authority:
    - src/lib/hermes/farm_os_projection_review_command_contract.ts
    - src/lib/hermes/farm_os_projection_promotion_service.ts
    - src/lib/hermes/farm_os_projection_rebuild_command.ts
    - src/lib/hermes/farm_os_operational_memory_persistence.ts
    - src/lib/hermes/farm_os_operational_memory_postgres_repository.ts
    - scripts/hermes/test_farm_os_day149_projection_command_boundary.ts
    - package.json
scope_rule: separate Product Owner Authority must report exact file scope before implementation edits
```

The future candidate list is informative, not edit authority. A test-only or
in-memory receipt fixture cannot satisfy durable idempotency, promotion
atomicity, the isolated PostgreSQL gate, or the Day149 Definition of Done. The
next Product Owner Authority must decide the smallest safe forward persistence
change and its rollback before any listed source is edited.

## 20. Persistence and database boundary

```yaml
persistence_boundary:
  existing_repository_reused: required
  existing_transaction_reused: required
  existing_advisory_lock_pattern_reused: required
  parallel_repository: prohibited
  raw_sql_outside_repository: prohibited
  string_concatenated_sql: prohibited
  candidate_writer_semantics_change: prohibited
  existing_bundle_function_change: prohibited
  database_schema_change_under_current_authority: prohibited
  migration_change_or_creation_under_current_authority: prohibited
  rls_role_or_permission_change: prohibited
  production_connection: prohibited
```

The existing Candidate-ingestion readback rules must remain Candidate-only.
Day149 may not weaken them to accept promotion deltas. A future authorized
promotion-specific method must use the same repository and prove only the
authorized state-event delta and durable command receipt.

Repository inspection has established that the current public persistence
boundary cannot atomically persist the required durable review and command
receipt with lifecycle events. Therefore the present decision is
`BLOCKED_DAY149_PERSISTENCE_AUTHORITY_CONFLICT`; it is not a conditional future
possibility. Source implementation remains prohibited until separate
Product Owner Authority resolves schema, migration, permission, repository,
and rollback scope.

## 21. Security boundary

```yaml
security_boundary:
  proposal_first: true
  human_in_the_loop: true
  human_command_only: true
  server_side_authorization: required
  ai_direct_promotion: prohibited
  hermes_self_approval: prohibited
  llm_review_decision: prohibited
  scheduler_promotion: prohibited
  automatic_rebuild: prohibited
  automatic_promotion: prohibited
  farming_application_write: 0
  production_database_operation: 0
  secret_access_or_output: prohibited
```

Review, approval, and promotion are internal FarmOS Core governance over a
derived Projection. The persisted Projection Candidate is the
proposal-equivalent governance artifact for this specific lifecycle; it is not
`ai.proposal_inbox` and it does not broaden that table's authority. Review and
promotion do not grant AI permission to write a Proposal, farming-application
business table, Sales table, or external service.

## 22. Excluded scope

```yaml
excluded_scope:
  - Day148 generator or canonical engine changes
  - Day147 state transition contract changes
  - candidate writer semantic changes
  - Projection-first selector changes
  - SQL migration creation or modification
  - provisioning manifest changes
  - production migration apply
  - production or shared development database access
  - Supabase access
  - farming application integration or write
  - Source API acquisition
  - UI or HTTP API
  - Runtime command
  - Slack command
  - scheduler or automatic rebuild
  - automatic promotion
  - LLM review or decision
  - Worker, Queue, Bridge, or LaunchAgent
  - external notification or publication
  - Day150 implementation
```

## 23. Required pure and fixture tests

The Day149 targeted suite must prove at least:

### Review contract

- valid `approve`, `reject`, and `request_rebuild` reviews;
- unknown decision rejection;
- missing or non-human reviewer rejection;
- empty reason rejection;
- invalid expected Candidate version rejection;
- review produces no Projection state event;
- exact review replay returns the same artifact;
- same idempotency key with a different payload is rejected.
- actor/principal mismatch and missing exact command capability are rejected;
- latest review sequence wins and every older decision reference is stale;
- a later reject or request-rebuild invalidates an older approve reference.

### Promote and reject commands

- first Candidate promotion with no existing Active;
- replacement promotion with exactly one existing Active;
- old Active becomes `superseded` and new Candidate becomes `active`;
- exact event order and monotonic sequences;
- exactly one Active per projection key;
- exact replay creates no additional event;
- exact replay is resolved under the lock before current-state eligibility;
- Candidate and Active version conflicts;
- Candidate not found, rejected, failed, superseded, or already Active;
- approval missing, mismatched, wrong decision, stale, or wrong Candidate;
- cross-key promotion rejection;
- tampered lineage and content hash rejection;
- Reject Command allows only `candidate → rejected`;
- transaction failure preserves both Candidate and prior Active;
- no standalone supersede command exists.
- a legacy Day146 Active can be replaced without an Active-first rewrite;
- command receipt absence, mismatch, readback failure, repository
  unavailability, and multiple-Active state fail closed.

### Rebuild

- exact fixture input delegates to the Day148 generator;
- generated and persisted state remains Candidate;
- same exact input produces the same Candidate;
- Active state and selector result remain unchanged;
- stale, unavailable, not-fetched, invalid, and ambiguous input fail closed;
- no implicit review or promotion occurs.
- source and generated projection keys exactly match the Candidate referenced
  by the current `request_rebuild` review.

### Safety

- automatic promotion count is zero;
- scheduler and generator promotion counts are zero;
- agent direct promotion count is zero;
- selector mutation count is zero;
- farming-application write count is zero;
- production operation count is zero.

## 24. Static and regression gate

Before isolated PostgreSQL validation, all of the following must pass:

```yaml
static_gate:
  day149_targeted_test: PASS
  day149_targeted_typecheck: PASS
  day148_generator_regression: PASS
  day147_b_contract_regression: PASS
  day147_a2_state_contract_regression: PASS
  day147_a3_candidate_writer_regression: PASS
  day147_a4_candidate_exclusion_regression: PASS
  day146_operational_memory_compiler_regression: PASS
  day146_projection_first_regression: PASS
  git_diff_check: PASS
  new_typecheck_diagnostics: 0
  production_operations: 0
```

The implementation must select exact existing package scripts and report them
before execution. `pnpm test` is not a valid substitute.

## 25. Isolated PostgreSQL gate

The isolated PostgreSQL gate is required for Day149 completion but is not
authorized or executable under this persistence-blocked Authority. A later
Product Owner Authority must first establish durable receipt persistence and
the exact disposable validation harness scope. Only after that Authority and
its static gate pass may Day149 use one disposable, nonce-bound,
non-production PostgreSQL environment.

```yaml
isolated_postgres:
  current_status: NOT_AUTHORIZED_UNTIL_PERSISTENCE_AUTHORITY_RESOLVED
  risk_level: Level_2
  explicit_execution_authority_required: true
  production_database: prohibited
  shared_local_database: prohibited
  existing_day146_and_day147_schema_fixture_reuse: required
  new_migration_apply: prohibited
  validation:
    - transaction_atomicity
    - concurrent_promotion_single_winner
    - expected_candidate_version_conflict
    - expected_active_version_conflict
    - exact_idempotent_replay
    - one_active_invariant
    - rollback_preserves_candidate_and_active
    - failed_command_has_no_partial_event
  authoritative_run_count: 1
  retry_without_new_authority: prohibited
```

Test-only setup may eventually apply the already approved Day146 and Day147
migrations to the disposable database exactly as fixed by their existing
checksums. It may not modify those migrations, auto-apply anything to another
database, or leave durable local resources. An isolated schema or receipt
fixture exists only for the test process and is not a production schema
decision and cannot prove deployable idempotency readiness.

## 26. Definition of Done

```yaml
day149_definition_of_done:
  formal_authority_active: true
  review_command_contract_complete: true
  promote_command_contract_complete: true
  reject_command_contract_complete: true
  rebuild_command_contract_complete: true
  human_command_only: true
  exact_server_capability_per_command: true
  actor_bound_to_authenticated_principal: true
  latest_review_decision_only: true
  durable_review_and_command_receipts: true
  review_decision_reference_required: true
  approval_separate_from_promotion: true
  expected_candidate_version_required: true
  expected_active_version_required: true
  idempotency_valid: true
  atomic_promotion_valid: true
  old_active_superseded_on_success: true
  old_active_preserved_on_failure: true
  candidate_preserved_on_failure: true
  one_active_per_projection_key: true
  state_validator_reused: true
  existing_persistence_reused: true
  existing_selector_unchanged: true
  day148_generator_unchanged_and_reused: true
  candidate_selector_safety_preserved: true
  rebuild_creates_candidate_only: true
  automatic_promotion_count: 0
  agent_direct_promotion_count: 0
  scheduler_promotion_count: 0
  active_partial_write_count: 0
  farming_application_write_count: 0
  production_database_operations: 0
  protected_files_preserved: true
  static_gate_pass: true
  isolated_postgres_gate_pass: true
  unresolved_p1: 0
  unresolved_p2: 0
  day150_not_started: true
```

Only a later implementation that proves every item may report
`READY_FOR_DAY149_COMMIT`. This Authority-establishment change does not satisfy
the Day149 Definition of Done. While the persistence conflict remains,
`READY_FOR_DAY149_COMMIT` and Day150 entry are technically and procedurally
prohibited.

## 27. Day150 entry gate

```yaml
day150_entry_gate:
  persistence_authority_conflict_resolved: true
  day149_status: COMPLETE
  day149_commit_created: true
  day149_commit_pushed: true
  head_matches_origin_main: true
  ahead_behind: 0/0
  review_contract: PASS
  promotion_atomicity: PASS
  idempotency_and_expected_version: PASS
  selector_safety: PASS
  rebuild_candidate_only: PASS
  isolated_postgres: PASS
  automatic_promotion_count: 0
  production_operations: 0
  unresolved_p1: 0
  unresolved_p2: 0
  formal_day150_authority_required: true
  day150_implementation_authorized_by_this_document: false
```

## 28. Stop conditions

Day149 implementation must stop without speculative repair when any of the
following applies:

- `BLOCKED_DAY149_REPOSITORY_GATE`
- `BLOCKED_DAY149_AUTHORITY_CONFLICT`
- `BLOCKED_DAY149_SCOPE_EXPANSION`
- `BLOCKED_DAY149_EXISTING_CONTRACT_CHANGE_REQUIRED`
- `BLOCKED_DAY149_PERSISTENCE_AUTHORITY_CONFLICT`
- `BLOCKED_DAY149_IDEMPOTENCY_AUTHORITY_MISSING`
- `BLOCKED_DAY149_EXPECTED_VERSION_AUTHORITY_MISSING`
- `BLOCKED_DAY149_ATOMICITY_CONFLICT`
- `FAILED_DAY149_STATIC_VALIDATION`
- `FAILED_DAY149_ISOLATED_POSTGRES_VALIDATION`

These conditions include, but are not limited to, any requirement for a new
transition table, state-contract change, selector change, Day148 generator
change, parallel persistence repository, SQL/migration/RLS/permission change,
non-atomic event append, automatic promotion, production connection, or
farming-application write.

## 29. Rollback

```yaml
rollback:
  authority_establishment_change:
    scope: documentation_only
    database_rollback_required: false
    production_rollback_required: false
    before_commit: remove_only_this_new_Day149_authority_document
    after_commit_or_push: revert_the_Day149_authority_commit_with_explicit_authorization
  later_implementation:
    source_only_before_isolated_execution: true
    isolated_database_disposable: true
    production_database_rollback_required: false
    state_history_delete_or_rewrite: prohibited
    superseded_to_active_recovery: prohibited
    erroneous_success_compensation: new_candidate_then_new_review_then_separate_promotion
```

Rollback must preserve `tsconfig.tsbuildinfo`, Day147 state evidence, Day148
generator behavior, append-only history, and the current Active Projection.
An erroneous but successfully committed promotion is not repaired by deleting
events or reactivating the superseded Projection. Recovery requires a new
Candidate, a new current review decision, and a separate atomic Promote
Command.
