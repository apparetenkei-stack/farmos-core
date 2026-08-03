# Day148 — Deterministic Daily Operational Projection Generator

## 1. Status and Authority

```yaml
status:
  authority: ACTIVE
  implementation: NOT_STARTED
  product_owner_authorized: true
roadmap_version: v4.0
authority_scope: Day148
target_systems:
  - FarmOS Core
execution_host:
  - Mac mini
  - /Users/hayate/projects/farmos-core
```

This document is the formal canonical Day148 Authority. It authorizes the
bounded Day148 implementation described below, but it does not itself start
that implementation or authorize Day149. The farming application remains the
business source of truth. Proposal First, Human in the Loop, fail-closed
behavior, and Candidate-only operation remain mandatory.

## 2. Formal Name

**Deterministic Daily Operational Projection Generator**

## 3. Repository Base

```yaml
repository_base:
  repository: /Users/hayate/projects/farmos-core
  branch: main
  authority_base_commit: 9fe1059b54adf329a8b77669abf21afe73777c75
  day147_b_contract_commit: 1887ce42dc5ae6c74e5e753a0bdc36c0cfab206e
```

Day148 implementation must begin from an explicitly verified repository state.
A missing, stale, mismatched, or unavailable authority base does not expand
authority and must fail closed.

## 4. Predecessor and Successor

```yaml
predecessor:
  status: Day147 COMPLETE
  components:
    - Day147-A candidate state and database enforcement
    - Day147-B Daily Operational Projection input/output contract
successor:
  day: Day149
  formal_name: Candidate Review, Promote, Supersede and Rebuild Command Boundary
  authorized_by_this_document: false
```

Day148 must preserve the completed Day147-A and Day147-B authorities. Day149
cannot start until every Day149 entry gate in this document is proven.

## 5. Objective and Rationale

The objective is to generate a deterministic, pure Candidate projection bundle
through one canonical generator path from the validated input contract fixed by
Day147-B, and to prove that semantically identical input produces identical
identity, content, `content_hash`, lineage, and Candidate state event.

This authority exists so that source normalization, business date, freshness,
tombstone handling, lineage, canonical hashing, and the Candidate-only boundary
are fixed as pure-function behavior before any Daily Operational Projection can
be activated or persisted.

## 6. Existing Canonical Engine Resolution

```yaml
canonical_existing_engine:
  symbol: createFarmOsDailyProjectionCandidateBundle
  location: src/lib/hermes/farm_os_daily_operational_projection_contract.ts
  status: formally_adopted_as_Day148_canonical_generator_engine
  competing_or_temporary_helper: false
  duplication: prohibited
dedicated_entrypoint:
  preferred_symbol: generateFarmOsDailyOperationalProjection
  preferred_path: src/lib/hermes/farm_os_daily_operational_projection_generator.ts
  form: thin_delegating_entrypoint_only
```

`createFarmOsDailyProjectionCandidateBundle` is not a competing or temporary
Day147-B helper. It is formally adopted as the canonical Day148 generator
engine.

Day148 MUST NOT create a second implementation of normalization, compiler
invocation, identity generation, canonical hashing, lineage construction, or
Candidate bundle materialization. If a dedicated Day148 module is created in a
later implementation step, it must be limited to a thin entrypoint that
delegates to the existing engine.

## 7. Input Contract

Day148 must accept and reuse the exact validated Day147-B input contract. The
formal parser, field names, required values, exact-key behavior, source snapshot
schema, compiler identity, freshness policy, and server-owned authorized farm
scope binding remain unchanged.

```yaml
input_contract:
  authority: Day147-B
  contract_version: farmos.daily_operational_projection.input.v1
  exact_parser: parseFarmOsDailyProjectionInput
  reuse_required: true
  changes_prohibited: true
  caller_authorization_resolution: outside_generator
  unknown_stale_ambiguous_or_invalid: fail_closed
```

The generator receives validated input; it does not fetch Source APIs, read a
database, infer missing business facts, or resolve caller authorization.

## 8. Output Contract

Day148 must return the exact Day147-B Candidate bundle contract on success and
must invoke the Day147-B exact output validation. It may not add, omit, rename,
or reinterpret fields.

```yaml
output_contract:
  authority: Day147-B
  contract_version: farmos.daily_operational_projection.candidate.v1
  exact_parser: parseFarmOsDailyProjectionCandidateBundle
  reuse_required: true
  exact_output_validation: required
  changes_prohibited: true
  output_state: candidate
  initial_candidate_state_event_count: 1
```

Tampered content, identity, hash, lineage, diagnostics, time evidence, state, or
state events must be rejected rather than repaired.

## 9. Deterministic Normalization

The existing canonical engine owns normalization. Day148 proves, but does not
duplicate or replace, the Day147-B canonical snapshot ordering and normalization
rules.

```yaml
deterministic_normalization:
  same_semantic_input_same_output: required
  same_semantic_input_same_content_hash: required
  source_permutation_stable: required
  object_key_permutation_stable: required
  repeated_execution_stable: required
  locale_independent: required
  host_timezone_independent: required
  clock_independent: required
  duplicate_normalization: prohibited
  random_or_environment_dependency: prohibited
```

All ordering and normalization must come from
`createFarmOsDailyProjectionCandidateBundle` and its already adopted contract
dependencies. Retrieval order, locale collation, host settings, implicit clocks,
and random values cannot influence the result.

## 10. Business Date and Freshness

Exactly one explicit business date is allowed per generator input. Business
date remains a source business fact and cannot be derived from `recorded_at`,
`source_updated_at`, `observed_at`, the host timezone, or the current clock.

```yaml
business_date_and_freshness:
  one_business_date_only: true
  mixed_or_mismatched_dates: fail_closed
  accepted_freshness: current
  stale: rejected
  unavailable: rejected
  not_fetched: rejected
  invalid: rejected
  ambiguous: rejected
  elapsed_time_inference: prohibited
```

Unknown, stale, unavailable, not-fetched, ambiguous, or otherwise invalid input
must return a structured failure with no Candidate bundle.

## 11. Tombstone Contribution Rules

```yaml
tombstone_contribution:
  operational_content: excluded
  operational_references: excluded
  lineage: retained
  lineage_relation: excluded_by_tombstone
  deletion_evidence: retained
  active_delete_or_supersede_operation: prohibited
```

A tombstone contributes no operational content, but its complete permitted
source evidence remains in deterministic lineage. It does not authorize a
database delete, Active mutation, supersede command, or replacement.

## 12. Compiler and Hash Reuse

Day148 must reuse the existing compiler path and the existing canonical hash
behavior without modification.

```yaml
compiler_and_hash:
  compiler_symbol: compileFarmOsDailyProjection
  invocation_owner: createFarmOsDailyProjectionCandidateBundle
  compiler_reuse: required
  compiler_changes: prohibited
  compiler_result_modification: prohibited
  canonical_hash_reuse: required
  canonical_hash_changes: prohibited
  duplicate_compiler_logic: prohibited
  duplicate_hashing: prohibited
```

The dedicated entrypoint may delegate and validate only. It may not post-process
the compiler result or introduce another serializer, canonicalizer, digest, or
hash ownership path.

## 13. Identity Rules

Projection identity must be generated only by the existing canonical engine
from the formally validated and normalized input. The dedicated entrypoint and
caller cannot supply, generate, repair, replace, or reinterpret identity.

```yaml
identity:
  existing_engine_owned: true
  same_semantic_input_same_identity: true
  independent_generation: prohibited
  caller_supplied_identity: prohibited
  generated_at_or_clock_derived_identity: prohibited
```

## 14. Lineage Completeness

Lineage must deterministically and completely account for every accepted input
snapshot, including sources excluded from operational content by tombstones.

```yaml
lineage:
  every_input_snapshot_accounted_for: true
  every_contributing_source_present: true
  tombstone_evidence_present: true
  deterministic_order: required
  duplicate_snapshot: rejected
  duplicate_record_version: rejected
  unknown_or_unaccounted_source: rejected
  raw_restricted_payload_copy: prohibited
```

Lineage construction remains owned by the existing canonical engine. A thin
entrypoint cannot construct, enrich, filter, reorder, or otherwise modify it.

## 15. Candidate-only Boundary

```yaml
candidate_only_boundary:
  output_state: candidate
  initial_candidate_state_event_count: 1
  automatic_promotion_count: 0
  active_write_count: 0
  persistence_operation_count: 0
  database_operation_count: 0
  production_operation_count: 0
  candidate_writer_execution: prohibited
  selector_call: prohibited
```

Day148 produces only an in-memory Candidate contract value. It cannot promote,
activate, persist, supersede, rebuild, schedule, enqueue, publish, or mutate an
existing Active projection. Caller authorization resolution remains outside the
generator. Human approval is not bypassed or implied. The enforced boundary is
`active write 0` and `persistence operation 0`.

## 16. Structured Failure Behavior

The preferred `generateFarmOsDailyOperationalProjection` entrypoint must return
a structured success or failure result. Expected contract failures must not be
exposed as unstructured exception text.

```yaml
structured_failure:
  discriminated_result: required
  Day147_B_failure_taxonomy_reused: true
  candidate_bundle_on_failure: null
  partial_candidate: prohibited
  active_write: false
  persistence_operation: false
  database_operation: false
  production_operation: false
  fail_closed: true
```

Failure must neither repair ambiguous facts nor downgrade freshness rules. It
must preserve the distinction among not fetched, unavailable, stale, invalid,
ambiguous, and other formal contract failures.

## 17. Implementation Scope

```yaml
implementation_scope:
  - existing createFarmOsDailyProjectionCandidateBundle canonical generator engine adoption
  - Day148 dedicated generator entrypoint
  - thin delegation to the existing engine
  - deterministic normalization proof
  - compiler reuse proof
  - exact output validation
  - structured failure result
  - dedicated pure fixture tests
  - determinism and permutation tests
  - safety regression tests
  - Day148 Authority documentation
write_boundary:
  repository_source_and_tests_only: true
  database_write: 0
  persistence_operation: 0
  production_operation: 0
```

This authority document establishes that future bounded scope. This Authority
establishment change itself creates documentation only and does not start the
Day148 implementation.

## 18. Excluded Scope

```yaml
excluded_scope:
  - new parallel generator algorithm
  - Source API fetch
  - database read
  - persistence
  - migration
  - candidate writer execution
  - active promotion
  - supersede execution
  - rebuild execution
  - scheduler
  - queue
  - worker
  - Runtime integration
  - LLM inference
  - Slack integration
  - farming application integration
  - production operation
  - Day149 implementation
contract_change_policy:
  Day147_B_input_contract_changes: prohibited
  Day147_B_output_contract_changes: prohibited
  existing_compiler_changes: prohibited
  existing_canonical_hash_behavior_changes: prohibited
  existing_selector_changes: prohibited
  existing_persistence_changes: prohibited
```

## 19. Required Tests

The later Day148 implementation cannot be declared complete until it proves all
of the following:

- Same input produces the same output.
- Same input produces the same `content_hash`.
- Source permutation produces the same output.
- Object key permutation produces the same output.
- Repeated execution produces the same output.
- Output is independent of locale, host timezone, and current clock.
- Exactly one business date is accepted.
- Stale, unavailable, and not-fetched freshness are rejected distinctly.
- Ambiguous input is rejected.
- Duplicate snapshots and duplicate record versions are rejected.
- Tombstones are excluded from operational content and retained in lineage.
- Lineage is complete and deterministic.
- Tampered output is rejected by exact output validation.
- Output state is Candidate only, with one initial Candidate state event.
- Active write is 0 and persistence operation is 0.
- Day147-B regressions pass.
- Day147-A regressions pass.
- Day146 compiler and projection-first regressions pass.
- Targeted typecheck passes.
- `git diff --check` passes.

## 20. Definition of Done

```yaml
definition_of_done:
  formal_input_contract_reused: true
  formal_output_contract_reused: true
  existing_canonical_engine_reused: true
  parallel_generator_count: 0
  dedicated_entrypoint_complete: true
  deterministic_generator_complete: true
  same_input_same_output: true
  same_input_same_hash: true
  input_permutation_stable: true
  object_key_order_stable: true
  compiler_reused: true
  canonical_hash_reused: true
  lineage_complete: true
  tombstone_contract_preserved: true
  candidate_only: true
  automatic_promotion_count: 0
  active_write_count: 0
  persistence_operations: 0
  database_operations: 0
  production_operations: 0
  static_gate_pass: true
  protected_files_preserved: true
  day149_not_started: true
```

These values define the later implementation completion gate; their inclusion
here does not assert that implementation is already complete.

## 21. Rollback

```yaml
rollback:
  authority_establishment_change: documentation_only
  database_rollback_required: false
  production_rollback_required: false
  before_commit: remove_only_this_new_Day148_authority_document
  after_commit_or_push: revert_the_Day148_authority_commit_with_explicit_authorization
  protected_files_preserved: required
  source_or_test_reversion: none
```

Rollback must not modify Day147 authority, source, tests, database state,
`tsconfig.tsbuildinfo`, or the pinned Coordination reference.

## 22. Day149 Entry Gate

```yaml
day149_entry_gate:
  day148_status: COMPLETE
  canonical_generator_entrypoint: proven
  deterministic_output: proven
  content_hash_stability: proven
  lineage_completeness: proven
  candidate_only_boundary: proven
  automatic_promotion_count: 0
  active_write_count: 0
  persistence_operations: 0
  database_operations: 0
  protected_files_preserved: true
  repository_clean_and_synchronized: true
```

Until every gate is evidenced, Day149 remains unauthorized and not started.
This document grants no authority to review, promote, supersede, rebuild, or
otherwise execute Day149 behavior.
