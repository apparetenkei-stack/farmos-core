# Day147 — Daily Operational Projection Candidate Foundation

## Status and authority

```yaml
day147_a_authority_documentation:
  status: READY_FOR_FINAL_RE_REVIEW
  authority_resolution: accepted_by_product_owner
  implementation_started: false
  repository_change_scope:
    - canonical authority documentation
    - minimal Master Roadmap reference
  code_changed: false
  sql_changed: false
  migration_created: false
  test_changed: false
  database_operation_performed: false
  runtime_operation_performed: false
  worker_operation_performed: false
```

This document is the canonical authority for Day147. It records the approved
state model and the gates for future implementation. It does not start
Day147-A implementation and does not authorize code, SQL, migration, test,
database, Runtime, Worker, farming-application, or deployment changes.

## 1. Formal name

```yaml
day147:
  formal_name: Daily Operational Projection Candidate Foundation
  processes:
    day147_a: Projection Candidate State Authority and Persistence Evolution
    day147_b: Deterministic Daily Operational Projection Generation
```

## 2. Purpose

Day147 introduces a governed Candidate boundary between deterministic Daily
Operational Projection generation and the active Projection read by the
Projection-first Runtime.

A successfully generated and persisted Projection is a `candidate` first. It
does not become an operational fact, a business source of truth, or an active
Projection merely because generation succeeded. Activation remains a separate,
explicitly authorized operation with Human in the Loop.

```yaml
purpose:
  projection_first: true
  active_only_read: true
  candidate_first_persistence: true
  automatic_promotion: false
  proposal_first: true
  human_in_the_loop: true
  business_source_of_truth: farming_application
  production_write: 0
  farming_application_write: 0
```

## 3. Day146 boundary

Day147 preserves the following Day146 authorities:

- Operational Memory records, lineage, and state history remain append-only.
- Projection-first Runtime selects only an `active` Projection for the exact
  authorized farm scope and business date.
- Candidate generation cannot automatically promote a Projection.
- Missing, stale, invalid, or unavailable Projection state never falls back to
  a legacy or raw-history path.
- Proposal First, Human in the Loop, fail-closed behavior, and Secret
  non-exposure remain mandatory.
- The current deployment remains one FarmOS Core installation bound to one farm
  scope and one dedicated Operational Memory database.
- FarmOS Core projections remain reproducible derivatives and never become the
  farming application's business source of truth.

Day147 refines the Projection lifecycle described by the
[Farm Operational Memory ADR](../architecture/farm-operational-memory.md).
Creating a replacement Projection must now stop at `candidate`; it must not
supersede the existing `active` Projection or create a new `active` state
without a separately authorized explicit promotion path.

The completed Day146 Runtime and persistence implementation are unchanged by
this document. Existing behavior that does not yet implement this refined
lifecycle is a future Day147-A implementation concern, not authority to bypass
the Candidate boundary.

## 4. Day147-A／Day147-B split

```yaml
day147_a:
  name: Projection Candidate State Authority and Persistence Evolution
  responsibilities:
    - establish the canonical five-state Projection lifecycle
    - define append-only transition validation
    - define a forward-only persistence evolution
    - preserve active-only selection and fail-closed materialization
  excludes:
    - deterministic production Candidate generation
    - Candidate promotion implementation
    - Production DB access or write
    - Runtime or Worker operation

day147_b:
  name: Deterministic Daily Operational Projection Generation
  responsibilities:
    - deterministically generate a Daily Operational Projection
    - persist the generated Projection initially as candidate
    - preserve lineage, idempotency, and existing active state
  excludes:
    - automatic promotion
    - Candidate promotion implementation
    - Production DB write without separate authority
```

Day147-B cannot begin until the Day147-B entry gate below is satisfied.

## 5. Canonical Projection states

The Projection lifecycle has exactly five persisted states:

```yaml
projection_states:
  - candidate
  - active
  - rejected
  - superseded
  - failed
```

| State | Canonical meaning |
| --- | --- |
| `candidate` | Successfully generated and persisted, but not promoted to the formal active Projection. |
| `active` | The only state that Projection-first Runtime may select as a confirmed farm Projection. |
| `rejected` | Explicitly excluded from activation because of content, evidence, quality, or eligibility review. |
| `superseded` | Previously active, then replaced by another active Projection through an explicit promotion. |
| `failed` | After a durable `candidate` state was successfully established, validation, eligibility determination, downstream processing, or an explicitly started processing stage for that Candidate terminated unsuccessfully. |

`candidate`, `rejected`, `superseded`, and `failed` are never selectable as
active.

`failed` is reachable only after a durable `candidate` state exists:

```yaml
failed:
  meaning: >
    A terminal failure of validation, eligibility determination, downstream
    processing, or an explicitly started processing stage for a Candidate,
    after its durable candidate state was successfully established.

initial_generation_or_persistence_failure:
  candidate_created: false
  projection_state_event_created: false
  handling:
    - transaction rollback
    - ingestion rejection
    - persistence error
    - materialization error
  failed_state_event: prohibited

candidate_to_failed_examples:
  - post_persistence_eligibility_validation_failed
  - post_persistence_grounding_validation_failed
  - post_persistence_contract_validation_failed
  - explicitly_started_candidate_processing_terminated
```

A failure before Candidate generation or during atomic Candidate persistence
creates no Candidate and no `failed` state event. A terminal failure in a
later, explicitly started processing stage after durable Candidate
establishment is represented by `candidate_to_failed`.

A successfully completed review that explicitly determines that a Candidate is
ineligible is `rejected`; `failed` means that the processing stage itself
terminated without producing that completed rejection decision. This preserves
the distinct meanings of `rejected` and `failed`.

A missing state event or structurally invalid state history is
`invalid_state_history`, not a persisted Projection state. It fails closed and
must not be repaired or represented by a synthesized `failed` event.

These examples establish state-contract meaning only. They do not authorize
Day147-A to implement any new validation, eligibility, grounding, contract
validation, or downstream Candidate-processing capability.

## 6. Allowed and forbidden transitions

The absence of a state event is not a persisted lifecycle state. `missing` is
used below only to describe the initial pre-persistence condition.

```yaml
initial_transition:
  - missing_to_candidate

allowed_transitions:
  - candidate_to_active
  - candidate_to_rejected
  - candidate_to_failed
  - active_to_superseded

forbidden_transitions:
  - missing_to_active
  - missing_to_failed
  - rejected_to_active
  - failed_to_active
  - superseded_to_active
  - automatic_candidate_to_active
  - same_state_duplicate
  - every_unlisted_transition
```

Creating a new Candidate has no effect on the existing active Projection:

```yaml
candidate_generation:
  new_candidate_event: required
  existing_active_superseded: false
  automatic_promotion: false
```

A future explicit promotion must atomically append both state changes:

```yaml
future_explicit_promotion:
  implementation_in_day147_a: false
  required_atomic_transition:
    - existing_active_to_superseded
    - candidate_to_active
  partial_commit: prohibited
  human_authority: required
```

Promotion is not implemented or authorized by this document.

## 7. Append-only contract

Projection rows, lineage, and state events are immutable evidence. Lifecycle
changes are represented only by new state events.

```yaml
append_only_contract:
  projection_update_for_state_change: prohibited
  projection_delete: prohibited
  state_event_update: prohibited
  state_event_delete: prohibited
  lineage_rewrite: prohibited
  transition_representation: append_new_state_event
  monotonic_event_order: required
  duplicate_event_id: invalid_state_history
  duplicate_event_sequence: invalid_state_history
  same_state_duplicate: invalid_state_history
  unlisted_transition: invalid_state_history
```

Candidate persistence must atomically establish the immutable Projection,
required lineage, and initial `candidate` event. Partial materialization fails
closed. No repair process may infer or fabricate a missing event from row
contents, timestamps, version order, or an existing active Projection.

## 8. Forward-only migration policy

Any future Day147-A persistence change must be a new, forward-only migration.
The Day146 migration file and its recorded history remain unchanged.

```yaml
forward_only_migration:
  day146_migration_rewrite: prohibited
  new_migration_required: true
  schema_intent:
    projection_state_values:
      - candidate
      - active
      - rejected
      - superseded
      - failed
  existing_history_rewrite: prohibited
  synthetic_backfill_event: prohibited
  missing_event_backfilled_as_failed: prohibited
  production_apply: prohibited
  creation_or_apply_by_this_document: false
```

Migration creation, isolated-database application, schema/RLS/role changes, and
Production DB application each remain separately gated. This document does not
authorize any of them.

## 9. Active selector boundary

The server-owned selector must materialize each Projection's latest valid state
from append-only state events before selection.

```yaml
active_selector:
  installation_binding: server_owned
  tenancy:
    installations_per_runtime: 1
    farm_scopes_per_installation: 1
  filters:
    - authorized_bound_farm_scope
    - exact_business_date
    - supported_projection_type
    - supported_compiler_version
    - latest_valid_state_equals_active
  selectable_states:
    - active
  candidate_fallback: prohibited
  rejected_fallback: prohibited
  failed_fallback: prohibited
  superseded_fallback: prohibited
  prior_date_fallback: prohibited
  legacy_fallback: prohibited
  raw_history_fallback: prohibited
```

No qualifying active Projection is `projection_missing` only when all examined
Projection histories are structurally valid. Duplicate active Projections,
missing state events, duplicate or out-of-order state evidence, forbidden
transitions, unsupported states, parse failures, and repository failures return
a fail-closed unavailable result and select nothing.

## 10. Missing state event fail-closed handling

A Projection row with no state event is invalid history. It is distinct from
the legitimate absence of any Projection for the exact business date.

```yaml
missing_state_event:
  database_state: none
  materialization_result: materialization_error
  runtime_result: invalid_state_history
  selected_as_active: false
  synthesized_failed_event: false
  write_performed_by_runtime: false
  legacy_fallback: false
```

The Runtime must not label this condition `failed`, infer an `active` state, or
repair persistence while serving a read.

## 11. Production DB prohibition

```yaml
production_database:
  access_by_this_document: prohibited
  read_by_this_document: 0
  write_by_this_document: 0
  migration_apply_by_this_document: 0
  fixture_insert_by_this_document: 0
```

Future Production DB reads, writes, migrations, permissions, RLS changes, or
deployment operations require separate explicit authority. Day147 authority
documentation alone grants none.

## 12. Farming application boundary

The farming application remains the business source of truth and is outside
the Day147 repository change boundary.

```yaml
farming_application:
  repository_change: 0
  schema_change: 0
  runtime_change: 0
  write: 0
  responsibility_change: false
```

## 13. Windows Worker boundary

```yaml
windows_rtx_worker:
  code_change: 0
  configuration_change: 0
  runtime_operation: 0
  bridge_change: 0
  candidate_promotion_authority: false
```

Day147 does not reuse or modify the Day146 night Worker/Bridge pipeline without
separate authority.

## 14. Day147-A Definition of Done

This documentation change does not satisfy the Day147-A implementation
Definition of Done. Day147-A is complete only when all of the following have
later been explicitly authorized, implemented, and evidenced:

```yaml
day147_a_definition_of_done:
  authority_and_scope:
    - canonical Authority approved
    - Candidate promotion implementation count is zero

  state_contract:
    - candidate state SQL contract implemented
    - candidate state TypeScript contract implemented
    - five projection states exact parser implemented
    - unknown projection state rejected
    - missing state event is not interpreted as candidate
    - missing state is not used as candidate
    - missing state event fails closed as invalid_state_history

  persistence:
    - new Projection persists explicit candidate state event
    - candidate persisted explicitly
    - initial generation or atomic persistence failure creates no Candidate
    - automatic active promotion count is zero
    - automatic active promotion zero
    - existing active Projection is not changed by Candidate generation

  transition_safety:
    - all allowed transitions accepted
    - all forbidden transitions rejected
    - all forbidden transitions REJECTED
    - same-state duplicate rejected
    - append-only UPDATE rejection verified
    - append-only DELETE rejection verified
    - append-only protection PASS

  selector_safety:
    - active selector candidate exclusion PROVEN
    - candidate-only dataset is not selected
    - candidate plus one active dataset selects only active
    - multiple candidates plus one active dataset selects only active
    - candidate is never returned as confirmed Projection fact
    - PostgreSQL-backed selector exclusion evidence exists
    - candidate-only PostgreSQL-backed evidence PASS
    - candidate plus active PostgreSQL-backed evidence PASS
    - multiple candidates plus active PostgreSQL-backed evidence PASS

  isolated_postgres_integration:
    - isolated PostgreSQL integration PASS
    - forward-only migration applied in isolated non-production PostgreSQL
    - candidate state persistence verified
    - allowed transitions verified
    - forbidden transitions verified
    - append-only protection verified
    - selector exclusion verified

  regression_and_quality:
    - targeted Day147-A tests PASS
    - Day146 Operational Memory regression PASS
    - Day146 Projection-first regression PASS
    - strict typecheck PASS
    - git diff --check PASS
    - git clean and synchronized

  rollback_and_operations:
    - rollback procedure documented
    - forward-only migration recovery procedure documented
    - Production database operation count is zero
    - Production Runtime operation count is zero
    - Production Worker operation count is zero
    - Production LaunchAgent operation count is zero
    - farming application write count is zero
    - automatic promotion count is zero
    - Secret exposure count is zero
    - Production operations zero as defined below
    - Production operations zero
```

The following aggregate expressions are not substitutes for the individual
evidence above:

- `five_state_contract_implemented` alone does not prove both the SQL contract
  and the TypeScript contract.
- `related_regression_tests: PASS` alone does not prove
  `Day146 Projection-first regression PASS`.
- `typecheck_or_build: PASS` alone does not prove `strict typecheck PASS`.
- `rollback_verified` alone does not prove that the rollback procedure is
  documented.
- `production_database_operation_count: 0` alone does not prove that all
  Production operations are zero.

`Production operations zero` has this exact meaning:

```yaml
production_operations_zero:
  production_database_write: 0
  production_schema_apply: 0
  production_runtime_restart: 0
  production_worker_operation: 0
  production_launchagent_change: 0
  production_secret_change: 0
  farming_application_write: 0
  candidate_auto_promotion: 0
```

The future migration and implementation work require a separate instruction.
Promotion implementation is not part of Day147-A.

## 15. Day147-B entry gate

```yaml
day147_b_entry_gate:
  required_evidence:
    - Day147-A status COMPLETE
    - candidate state SQL contract implemented
    - candidate state TypeScript contract implemented
    - candidate persisted explicitly
    - missing state is not used as candidate
    - automatic active promotion zero
    - active selector candidate exclusion PROVEN
    - candidate-only PostgreSQL-backed evidence PASS
    - candidate plus active PostgreSQL-backed evidence PASS
    - multiple candidates plus active PostgreSQL-backed evidence PASS
    - isolated PostgreSQL integration PASS
    - append-only protection PASS
    - all forbidden transitions REJECTED
    - targeted Day147-A tests PASS
    - Day146 Operational Memory regression PASS
    - Day146 Projection-first regression PASS
    - strict typecheck PASS
    - rollback procedure documented
    - Production operations zero
    - git clean and synchronized
  day147_a_definition_of_done: PASS
  day147_a_completion_evidence: required
  product_owner_authority_to_start: required
  candidate_initial_state: candidate
  existing_active_preserved: required
  automatic_promotion: prohibited
  production_write_authority: not_implied
  gate_failure_result: DO_NOT_START_DAY147_B
```

Active selector Candidate exclusion is not satisfied by a design declaration
alone. PostgreSQL-backed integration evidence is required for Candidate-only,
Candidate-plus-active, and multiple-Candidate-plus-active datasets. Those
checks must prove that no Candidate is returned as a confirmed Projection and
that only the active Projection is selected when one exists.

Isolated migration verification alone does not satisfy the Day147-B entry
gate. Migration, Candidate persistence, state transitions, append-only
protection, and selector exclusion must be verified together against an actual
isolated non-production PostgreSQL instance.

Day147-B must not begin unless the Day147-A Definition of Done passes. The
Day147-B entry gate must not introduce a technical evidence requirement that
is absent from the Day147-A Definition of Done. `Day147-A status COMPLETE`
therefore means that every technical evidence requirement in the Day147-B
entry gate has already been satisfied.

Authority documentation marked `READY_FOR_FINAL_RE_REVIEW` is not sufficient
to open Day147-B.

## 16. Day147 completion and Day148 entry gate

```yaml
day147_completion_gate:
  day147_a:
    status: COMPLETE
    required: true

  day147_b:
    status: COMPLETE
    required: true

  required_evidence:
    - candidate state contract implemented
    - deterministic Daily Projection Candidate generation implemented
    - automatic active promotion zero
    - active selector candidate exclusion proven
    - append_only persistence proven
    - invalid transitions rejected
    - isolated PostgreSQL integration PASS
    - targeted tests PASS
    - regression PASS
    - strict typecheck PASS
    - safety boundary PASS
    - rollback documented
    - no unresolved P1
    - no unresolved P2

  repository_gate:
    git_clean: true
    head_matches_origin_main: true
    ahead_behind: 0/0

  day148_authority:
    formal_definition_required: true
```

Completion of only Day147-A or only Day147-B must not be treated as completion
of Day147. Day147 becomes `COMPLETE` only when both processes and every
required evidence and repository gate above pass.

Until the Day147 Completion Gate passes, no Day148 implementation may begin;
only Day148 Authority Resolution is permitted. If a formal canonical Day148
Authority does not exist, Day148 implementation must not begin.

## 17. Rollback policy

Rollback must preserve append-only evidence and the forward-only schema
history.

```yaml
rollback:
  stop_new_candidate_writer: first
  keep_existing_active_readable: required
  application_artifact_rollback: allowed_only_when_schema_compatible
  schema_down_migration: prohibited
  delete_projection: prohibited
  delete_state_event: prohibited
  rewrite_state_history: prohibited
  return_superseded_to_active: prohibited
  corrective_schema_change: separately_approved_forward_migration
  corrective_lifecycle_action:
    candidate:
      - rejected
      - failed
    active:
      - separately_authorized_replacement_promotion
```

If a Candidate path fails, disable that path and preserve the current active
Projection. A superseded Projection cannot be reactivated; recovery requires a
new valid Candidate and a separately authorized atomic promotion.

## 18. Stop Conditions

Stop Day147 work and retain fail-closed behavior if any of the following is
required or observed:

- automatic or inferred `candidate` to `active` promotion;
- Candidate generation superseding or otherwise changing the existing active
  Projection;
- a missing state event being synthesized as `failed` or inferred as `active`;
- any same-state duplicate or unlisted transition being accepted;
- `UPDATE`, `DELETE`, history rewrite, or lineage rewrite to represent a state
  transition;
- non-atomic future promotion of existing active and Candidate states;
- selection of any state other than `active`;
- duplicate active Projections or invalid state history being treated as
  `projection_missing`;
- fallback to a Candidate, prior date, legacy path, raw full history, or
  unrelated source;
- Production DB access/write, migration apply, RLS/role/permission change, or
  production deployment without separate explicit authority;
- farming-application repository change or write;
- Windows Worker, Bridge, Runtime, Slack, LaunchAgent, or Secret change;
- expansion beyond the approved single-installation／single-farm boundary;
- Proposal First or Human in the Loop bypass;
- Secret, credential, token, or private data exposure; or
- a conflict with Day146 append-only, active-only read, or fail-closed
  authority that cannot be resolved without new Product Owner direction.
