# Day146 Process 3/4 — Projection-first Hermes Read-only Runtime Integration

## Status and authority

```yaml
status: APPROVED_FOR_IMPLEMENTATION_PLANNING
authority: user-approved
implementation_started: false
canonical_contract_id: farmos.hermes.projection_first_response.v1
```

This document is the canonical authority for Day146 Process 3/4. It authorizes
implementation planning only. It does not authorize runtime implementation,
database operations, migrations, production access, Candidate mutation,
Proposal creation, approval, Apply, Worker changes, or deployment.

## Formal name and roadmap mapping

The formal Process 3/4 name is:

```text
Projection-first Hermes Read-only Runtime Integration
```

Process 3 combines the following previously separated Day146 boundaries:

```yaml
roadmap_mapping:
  Day146_E:
    scope:
      - active Daily Projection retrieval
      - projection selection
      - freshness classification
      - bounded lineage drilldown

  Day146_F:
    scope:
      - Hermes read-only runtime integration
      - Response Guard
      - channel-neutral response contract
      - explicit deep-analysis activation boundary
```

Process 4/4 is `Final Integrated Gate`. It integrates evidence from Processes
1–3 and does not implement a new major feature.

## Purpose

FarmOS Core on Mac answers daytime Hermes questions from the exact requested
business date's active Daily Projection before considering any bounded
lineage drilldown. It never scans raw full history, silently substitutes
another date, infers freshness from elapsed minutes, or performs a business
write.

```yaml
daytime_policy:
  projection_first: true
  raw_full_history_scan: false
  thinking_default: false
  response_guard_required: true
  business_write: false
  proposal_creation: false
  candidate_creation: false
  candidate_promotion: false
  automatic_deep_analysis: false
```

The integration must:

1. answer quickly from the requested date's active Projection;
2. reduce unnecessary LLM context;
3. restrict evidence to the selected Projection and its lineage;
4. never present stale information as current;
5. reject unsupported facts through Response Guard; and
6. remain isolated from every business-write path.

## Systems and execution host

```yaml
systems:
  farmos_core_mac:
    involved: true
    authority: true
    responsibilities:
      - Operational Memory ownership
      - active Projection selection
      - freshness evaluation
      - bounded drilldown
      - Response Guard
      - Hermes read-only response generation

  windows_rtx_worker:
    involved: false
    reasons:
      - night Worker and Bridge completed in Process 2
      - no daytime deep-analysis executor is authorized

  farming_app_windows_repo:
    involved: false
    responsibilities:
      - remain the business source of truth
      - receive no Repository change
      - receive no write

  supabase_production:
    involved: false
    write: prohibited

  slack_hermes:
    involved: adapter_only
    authority: false
    responsibility:
      - consume the channel-neutral Hermes service through an existing adapter
```

Slack-specific behavior cannot define or override the runtime contract.

## Deployment tenancy and authorization authority

Production integration is governed by the user-approved
[FarmOS Single-Installation Operational Memory Tenancy](../architecture/farm-os-single-installation-tenancy.md)
Architecture Decision.

The current deployment binds one FarmOS Core runtime to one farm scope and one
dedicated Operational Memory database through server-owned configuration.
Actor authorization remains separate from that binding. Request `farm_scope`
is never authority: it must exactly match the bound scope after the actor is
authorized.

Projection-first production reads use an exact-date, bounded, SELECT-only
adapter after binding verification. They must not use full-history
`readState()` as a fallback. Missing or inconsistent binding, authorization,
lineage, or scoped-read state fails closed without a business write.

## Request contract

The exact request object has these keys and no others:

```yaml
request:
  contract_version:
    const: farmos.hermes.projection_first_response.v1
  query:
    type: non_empty_string
  business_date:
    type: YYYY-MM-DD
    default_timezone: Asia/Tokyo
  response_mode:
    enum:
      - fast
      - deep
  farm_scope:
    type: authorized_farm_scope
  requested_at:
    type: ISO-8601
```

`farm_scope` is input to server-side authorization, not proof of authorization.
Unknown keys, missing keys, invalid dates, invalid timestamps, invalid modes,
and unauthorized farm scopes fail closed.

## Response contract

The exact response object has these keys and no others:

```yaml
response:
  contract_version:
    const: farmos.hermes.projection_first_response.v1
  result:
    enum:
      - answered
      - projection_missing
      - projection_stale
      - projection_unavailable
      - clarification_required
      - deep_analysis_unavailable
      - guard_rejected
  mode_requested:
    enum:
      - fast
      - deep
  mode_used:
    enum:
      - fast
      - none
  answer:
    type: string_or_null
  business_date:
    type: YYYY-MM-DD
  projection_id:
    type: string_or_null
  projection_status:
    enum:
      - active
      - missing
      - stale
      - unavailable
  as_of:
    type: ISO-8601_or_null
  grounding_refs:
    type: bounded_reference_array
  drilldown_used:
    type: boolean
  response_guard:
    type: fixed_guard_result
  writes_performed:
    const: false
```

The implementation must use exact request and response parsers, reject unknown
keys, and preserve the versioned meanings above.

## Projection selection

Selection is deterministic and server-owned:

1. Select only a Projection matching the authorized farm scope, exact requested
   `business_date`, `active` state, and supported compiler version.
2. Return `projection_missing` when no Projection exists for the exact date.
3. Return `projection_stale` when an active Projection exists but its lineage
   does not match the latest persisted snapshots for that date.
4. Return `projection_unavailable` for repository read failure, contract parse
   failure, duplicate active Projections, or lineage inconsistency.

A prior date's Projection must never substitute for the requested date.
Historical questions use only the exact requested business date.

## Freshness authority

Freshness is structural, not inferred from a fixed elapsed-time threshold:

```yaml
freshness_authority:
  business_date_match: required
  active_state: required
  latest_snapshot_lineage_match: required
  supported_compiler_version: required
```

Any unverifiable condition fails closed as stale or unavailable according to
the selection rules.

## Bounded lineage drilldown

When the Projection cannot ground an answer, the runtime may inspect only
sources linked by its verified lineage.

```yaml
bounded_drilldown:
  automatic_full_history_scan: prohibited
  unrelated_source_scan: prohibited
  lineage_required: true
  maximum_records_default: 20
  maximum_records_hard_limit: 50
  source_text_logging: prohibited
  business_write: prohibited
```

The server owns both limits. Client input cannot increase them. If the selected
Projection and its bounded lineage remain insufficient, the response is
`clarification_required` or `guard_rejected`, never a guessed answer.

## Response Guard

Every `answered` response must pass Response Guard:

```yaml
response_guard:
  every_factual_claim_grounded: required
  projection_or_lineage_reference: required
  unsupported_fact_rejection: required
  requested_business_date_match: required
  stale_as_current_prohibited: true
  write_claim_without_write_proof_prohibited: true
  hidden_business_action_prohibited: true
  raw_reasoning_persistence: prohibited
  raw_reasoning_output: prohibited
```

Guard status is exactly `passed` or `rejected`. Failure codes remain distinct:

```yaml
guard_failure_codes:
  - projection_not_found
  - projection_stale
  - projection_contract_invalid
  - projection_lineage_invalid
  - unsupported_fact
  - insufficient_grounding
  - business_date_mismatch
  - authorization_failed
  - response_contract_invalid
```

A rejected response contains no unguarded answer.

## Explicit deep-analysis boundary

```yaml
deep_analysis:
  default_mode: fast
  explicit_request_required: true
  automatic_activation: prohibited
  inferred_activation: prohibited
```

Process 3 does not invent a daytime deep-analysis executor. Until separately
authorized, an explicit `deep` request returns:

```yaml
result: deep_analysis_unavailable
mode_requested: deep
mode_used: none
writes_performed: false
```

The runtime must not silently downgrade to fast mode or reuse the night
Candidate queue for a daytime response.

## Write boundary

```yaml
write_boundary:
  repository_code_changes:
    allowed_after_authority_commit: true
  migration: prohibited
  local_postgres_fixture:
    allowed_only_in_tests_after_separate_implementation_instruction: true
  production_database: prohibited
  candidate_state: no_change
  active_projection: read_only
  farming_app: no_write
  proposal: no_create
  approval: none
  apply: none
  launchd: no_change
  tailscale: no_change
  secrets: no_change
```

## Process 2 exclusions

The following completed Process 2 capabilities are regression boundaries, not
Process 3 implementation scope:

- Windows RTX Worker;
- private Bridge route;
- HMAC, nonce, and timestamp;
- claim, lease, and heartbeat;
- night two-pass inference;
- structured failure classification;
- reasoning side-channel discard;
- Candidate eligibility;
- rejected failure submission;
- deterministic Candidate acceptance;
- append-only Candidate persistence;
- no automatic promotion; and
- one-shot execution.

Process 3 must not call the Candidate queue, Candidate persistence, or Worker
claim paths.

## Observability

Observability uses fixed event names only. Logs must not contain:

- query bodies;
- Projection bodies;
- source bodies;
- reasoning bodies;
- credentials or Secrets; or
- hidden business actions.

## Definition of Done

```yaml
definition_of_done:
  authority:
    - canonical Process 3 contract committed
    - Master Roadmap Day146-E/F mapping committed
    - Process 4 entry gate documented

  implementation:
    - projection-first read-only runtime
    - channel-neutral Hermes service
    - active Projection selector
    - freshness classifier
    - bounded drilldown
    - Response Guard
    - explicit deep-analysis activation gate
    - deep-analysis unavailable fail-closed response

  contract:
    - exact request parser
    - exact response parser
    - versioned error taxonomy
    - unknown key rejection

  security:
    - server-side farm authorization
    - raw full-history scan prohibited
    - business write 0
    - Proposal, Approval, and Apply 0
    - Candidate pipeline unused

  observability:
    - fixed event names only
    - query body absent
    - Projection body absent
    - source body absent
    - reasoning body absent
    - Secret absent

  tests:
    - active Projection answer
    - missing Projection
    - stale Projection
    - duplicate active Projection fail-closed
    - lineage mismatch
    - unsupported fact rejection
    - bounded drilldown limit
    - raw full-history scan prohibition
    - unauthorized farm scope
    - fast mode default
    - automatic deep activation prohibition
    - explicit deep request returns unavailable
    - writes performed 0
    - Proposal, Approval, and Apply 0

  quality:
    - targeted tests PASS
    - strict targeted typecheck PASS
    - Operational Memory regression PASS
    - Process 2 regression PASS
    - git diff check PASS
    - Secret scan PASS

  integration:
    - FarmOS Core Mac local read-only integration PASS
    - existing Slack Hermes adapter regression PASS
    - Windows cross-machine test not required
```

## Process 4 handoff

Process 4/4 is `Final Integrated Gate`. It starts only when:

```yaml
process_4_entry_gate:
  process_1_complete: true
  process_2_complete: true
  process_3_complete: true
  projection_first_runtime: PASS
  response_guard: PASS
  deep_analysis_fail_closed: PASS
  business_write: 0
  candidate_auto_promotion: 0
  process_2_regression: PASS
  repository_clean: true
```

Process 4 integrates Process 1–3 evidence, performs end-to-end read-only and
fail-closed checks, consolidates security evidence and runbooks, and makes the
Day146 completion decision. It does not repair incomplete Process 3 work.

## Stop conditions

Stop implementation and retain Process 3 as incomplete if any of the following
is required:

- production database access or write;
- migration, schema, RLS, role, or permission change;
- Candidate creation, mutation, promotion, or queue reuse;
- active Projection mutation;
- farming-app write or Repository change;
- Proposal, Approval, or Apply;
- automatic or inferred deep-analysis activation;
- raw full-history or unrelated-source scan;
- missing server-side farm authorization;
- response without mandatory Guard;
- Secret, launchd, Tailscale, or Worker configuration change; or
- implementation of an unapproved deep-analysis executor.
