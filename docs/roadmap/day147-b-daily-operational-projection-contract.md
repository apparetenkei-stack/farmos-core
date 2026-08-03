# Day147-B — Deterministic Daily Operational Projection I/O Contract

## Status and authority

```yaml
document:
  status: Day147-B contract authority
  base_commit: c878b309b092ae29909fffdf3bdceb7869e6698a
  implementation_boundary: pure_input_normalization_and_candidate_bundle_contract
  generator_runtime_implemented: false
  persistence_implemented: false
  production_operations: 0
```

This document fixes the pure contract between a bounded normalized Source
Snapshot set and a Daily Operational Projection Candidate bundle. The current
Product Owner instruction narrows Day147-B to this contract prerequisite. The
generator, persistence, source acquisition, scheduling, Worker, Runtime, API,
UI, model execution, and external operations remain Day148-or-later work and
receive no authority from this document.

The farming application remains the business source of truth. A valid output
is only a Candidate and is neither an active Projection nor a confirmed
business fact.

## Input contract

```yaml
input_contract:
  contract_version: farmos.daily_operational_projection.input.v1
  exact_parser: parseFarmOsDailyProjectionInput
  projection_kind: daily_work_records
  farm_scope: exact_server_owned_authorized_binding
  business_date: required_YYYY_MM_DD
  source_snapshot_schema_version: 1
  compiler_id: farmos.operational_memory.daily_work_records
  compiler_version: 1
  freshness_policy: structural_latest_snapshot_lineage.v1
  source_set_status:
    - current
    - stale
    - not_fetched
    - unavailable
    - invalid
    - ambiguous
  generated_at: explicit_RFC3339_UTC_injection
  snapshots:
    minimum: 1
    maximum: 100
    set_semantics: true
```

The exact parser requires the server-owned authorized farm scope as a separate
argument and rejects an envelope whose `farm_scope` differs. The compiler
identity and version, freshness policy, Projection kind, and schema version
are exact literals. A caller cannot select another compiler,
canonicalization algorithm, Projection state, Projection ID, output hash,
database target, credential, or active status. Unknown and missing keys are
rejected. `undefined`, missing, and explicit `null` are not interchangeable.

Each input entry extends and reuses the existing `FarmOsSourceSnapshot` shape
with only the I/O discriminator `source_type: work_record` and
`schema_version: 1`. Existing formal field names are retained:

```yaml
source_snapshot_contract:
  identity:
    - snapshot_id
    - source_system
    - source_type
    - source_record_id
    - source_record_version
    - source_content_hash
  time:
    - business_date
    - recorded_at
    - source_updated_at
    - observed_at
    - deleted_at
  lifecycle:
    - operation
    - initial_state
    - supersedes_snapshot_id
  allowed_fact_boundary:
    - field_reference
    - crop_cycle_reference
    - work_type_reference
    - safe_payload
  safe_payload: exact_empty_object
  restricted_personal_payload: prohibited
```

The existing `createFarmOsSnapshotId` identity helper binds snapshot identity
to record ID, version/hash, operation, and business date. A mismatch is
`source_hash_mismatch`. Source content hash ownership remains with the farming
application or trusted read adapter under the Day146 Stable Change authority;
Day147-B does not create a second source-payload canonical hash algorithm.

## Business date

```yaml
business_date:
  owner: source_business_fact
  timezone: Asia/Tokyo
  late_entry_supported: true
  recorded_at_does_not_override_business_date: true
  source_updated_at_does_not_override_business_date: true
  observed_at_does_not_override_business_date: true
  missing: fail_closed
  malformed: fail_closed
  request_snapshot_mismatch: business_date_mismatch
  mixed_dates: prohibited
```

A work record entered on 2026-08-03 for work performed on 2026-08-02 belongs
to the 2026-08-02 input. Every machine timestamp in this contract is explicit
RFC3339 UTC (`Z`); no host timezone or current clock is consulted.

## Freshness

Freshness follows the Day146 structural authority, not elapsed-time inference.

```yaml
freshness:
  policy: structural_latest_snapshot_lineage.v1
  accepted_for_candidate_contract: current
  stale: source_stale
  not_fetched: source_not_fetched
  unavailable: source_unavailable
  invalid: source_invalid
  ambiguous: source_ambiguous
  elapsed_time_threshold: none
  candidate_on_unverifiable_input: prohibited
```

Day147-B does not create a stale Candidate. Day146 active-read freshness still
requires exact business date, active state, latest snapshot lineage, and a
supported compiler version. Day147-B stops earlier when the bounded source set
is not structurally current.

## Tombstone

```yaml
tombstone:
  operation: tombstone
  initial_state: tombstoned
  deleted_at_required: true
  business_date_required: true
  operational_fact_contribution: none
  lineage_relation: excluded_by_tombstone
  included_fields: []
  deletion_evidence_retained: true
```

A tombstone contributes to the formal tombstone count and lineage but never
to active references. No Active replacement, supersede command, or delete
operation is implemented.

## Deterministic normalization

```yaml
determinism:
  same_semantic_input_same_output: true
  same_semantic_input_same_content_hash: true
  input_array_order_independent: true
  output_array_order_formally_defined: true
  object_key_order_independent: true
  locale_independent: true
  host_timezone_independent: true
  random_values: prohibited
  current_clock_reads: prohibited
  process_environment_dependency: prohibited
  generated_at: explicit_input
```

Before invoking the existing compiler, snapshots are sorted by this exact
domain order and assigned normalized ingestion sequence values:

1. `business_date`
2. `source_system`
3. `source_type`
4. `source_record_id`
5. `source_record_version`
6. `snapshot_id`

String comparison is binary (`<` / `>`), not locale-sensitive. More than one
versionless snapshot for the same source record is ambiguous and fails closed
rather than using retrieval order to infer which is latest.

## Canonical hash

```yaml
canonical_hash:
  implementation: compileFarmOsDailyProjection(...).content_hash
  algorithm: existing_formal_SHA_256
  canonicalization: existing_formal_canonicalJson
  included:
    - compiler_id
    - compiler_version
    - FarmOsDailyProjectionContent
    - FarmOsProjectionLineageDraft
  excluded:
    - farm_scope
    - generated_at
    - candidate_projection_id
    - candidate_state_event
    - diagnostics
  lineage_included: true
  generated_at_included: false
  caller_supplied_output_hash: prohibited
```

No new serializer or hash helper is introduced. Candidate materialization and
strict output parsing both execute the formal existing compiler. The output
parser compares the exact bundle rebuilt from the corresponding normalized
input, so content, hash, lineage, generated time, Candidate ID, and state
evidence must all match.

## Output contract

```yaml
output_contract:
  contract_version: farmos.daily_operational_projection.candidate.v1
  exact_parser: parseFarmOsDailyProjectionCandidateBundle
  candidate_bundle:
    - projection
    - lineage
    - state_events
    - diagnostics
  projection:
    projection_type: daily_work_records
    projection_schema_version: 1
    compiler_id: farmos.operational_memory.daily_work_records
    compiler_version: 1
    deterministic: true
    llm_used: false
    freshness: current
    verification_state: stable_change_contract_validated
  structured_summary: existing_FarmOsDailyProjectionContent
  output_state: candidate
  state_event_count: 1
  state_event_sequence: 1
```

`FarmOsDailyProjectionContent` is the structured summary. Its existing MVP
boundary is unchanged: business date, source/active/tombstone counts, field,
crop-cycle and work-type references, verification status, and missing optional
reference status. No inventory, sales, accounting, pesticide recommendation,
weather inference, yield prediction, free-form narrative, LLM output, or new
agronomic fact is added.

The exact output parser rejects missing state, `active`, `superseded`, a second
initial event, Candidate-to-Active transitions, failed/review/approval events,
existing-Active mutation markers, and every unknown field.

## Lineage

The output reuses the existing `FarmOsProjectionLineageDraft` identity and
`relation` taxonomy, extended only with Candidate ID, source record version,
and an allowlisted list of included reference fields.

```yaml
lineage:
  every_input_snapshot_present: true
  every_contributing_source_present: true
  unknown_source_rejected: true
  duplicate_entry_rejected: true
  deterministic_order: canonical_snapshot_order
  raw_personal_payload_not_copied: true
  relations:
    - included
    - excluded_by_tombstone
    - superseded
  consistency: rebuilt_bundle_exact_match
```

## Failure taxonomy

Public failures are a strict discriminated union, not exception text:

```yaml
failure_taxonomy:
  - source_missing
  - source_not_fetched
  - source_unavailable
  - source_stale
  - source_invalid
  - source_ambiguous
  - source_hash_mismatch
  - unsupported_source_schema
  - business_date_mismatch
  - duplicate_source_conflict
  - contract_invalid
failure_invariants:
  candidate_bundle: null
  active_write: false
  persistence: false
  retry: false
  production_operation: false
  raw_secret_exposure: false
```

Success alone uses `valid_candidate_bundle`.

## Candidate safety

```yaml
candidate_safety:
  output_state: candidate
  automatic_promotion_count: 0
  active_projection_write_count: 0
  existing_active_mutation_count: 0
  selector_behavior_changed: false
  candidate_visible_to_projection_first_read: false
  persistence: 0
  database_operations: 0
```

The output is an in-memory contract value. It does not invoke the Day147-A
Candidate writer or selector and grants no persistence or promotion authority.

## Out of scope

```yaml
out_of_scope:
  - production Source API access
  - farming application access or write
  - PostgreSQL connection
  - migration or RLS change
  - database persistence
  - Candidate writer execution
  - active promotion or supersede
  - rebuild command
  - scheduler, Queue, or Worker
  - RTX or LLM execution
  - Slack or external publication
  - Runtime integration
  - API or UI
```

## Rollback

```yaml
rollback:
  source_only: true
  database_rollback_required: false
  method_before_commit: remove_only_the_four_Day147_B_files_or_edits
  protected_artifacts_preserved: required
  state_history_change: none
```

## Day148 entry gate

```yaml
day148_entry_gate:
  day147_b_contract_complete: true
  input_exact_parser: PASS
  output_exact_parser: PASS
  deterministic_hash: PASS
  permutation_stability: PASS
  missing_ambiguous_stale_fail_closed: PASS
  lineage_complete: PASS
  candidate_only: PASS
  automatic_promotion_count: 0
  active_write_count: 0
  database_operations: 0
  production_operations: 0
  git_commit_required: true
  push_required: true
```

The gate is documentary until the Day147-B change is reviewed, committed, and
pushed by separately authorized Git operations. This work does not start
Day148.
