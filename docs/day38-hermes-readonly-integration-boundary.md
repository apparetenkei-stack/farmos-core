# Day38 Hermes Read-only Integration Boundary Foundation

## Purpose

Day38 starts the Hermes integration from the FarmOS Core side.

This day does not start a persistent Hermes process. It does not call an LLM. It does not generate proposals. It does not apply proposals.

The goal is to define a read-only context handoff shape that Hermes can later consume safely.

## Added files

- scripts/hermes/api_boundary/hermes_context_read_api_boundary.ts
- scripts/hermes/show_hermes_context.ts
- scripts/hermes/test_hermes_context_read_api_boundary.ts
- docs/day38-hermes-readonly-integration-boundary.md

## Package scripts

- show-hermes-context
- test-hermes-context-read-api-boundary
- check-hermes-context-read-boundary

## Context scope

Day38 context scope:

- proposal_review_apply_context

The context includes:

- proposal identity and review state
- proposal body and reason
- proposal payload after restricted-domain filtering
- proposal source refs after restricted-domain filtering
- review decision events
- latest review decision through the existing read model
- apply readiness
- apply plan preview
- committed apply history summary
- read boundary metadata
- safety policy
- redaction policy

## Restricted data handling

Day38 removes restricted-domain keys from payload and source refs before handing context to Hermes.

Restricted-domain areas are represented as broad categories:

- commercial transaction domain
- logistics and allocation domain
- external party domain
- finance domain
- workforce-sensitive domain
- personal assessment domain
- private runtime configuration domain
- credential material domain

Day38 intentionally avoids exposing those areas until role-aware disclosure and administrator-only policy are designed.

## Boundary guarantees

The Hermes context boundary must report:

- mode = hermes_context_read_boundary
- transaction_read_only = true
- writes_performed = false
- commands_executed = false
- hermes_runtime_executed = false
- llm_runtime_executed = false
- app_schema_write_allowed = false
- ai_proposal_write_allowed = false
- audit_apply_event_write_allowed = false

## No runtime execution

Day38 does not start Hermes runtime.

Day38 does not start LLM runtime.

Day38 only creates a JSON context snapshot.

## No write path

Day38 does not add any write path.

Day38 does not add UI mutation.

Day38 does not add proposal generation.

Day38 does not add proposal apply.

Day38 does not add autonomous action.

## Protected fixture constraints

Protected local fixture:

- proposal 24fc24ee-8efa-436b-8424-9703edeeb297 remains pending
- app.crop_cycles id=2 remains present
- audit.proposal_review_apply_events count remains unchanged

## Validation commands

Use:

    pnpm run test-hermes-context-read-api-boundary
    pnpm run show-hermes-context -- --proposal-id 24fc24ee-8efa-436b-8424-9703edeeb297
    pnpm run build

## Day38 validation result

Confirmed:

- Hermes context boundary test passed.
- Hermes context snapshot command returned result = ok.
- Build passed.
- Mutation route scan passed.
- Sensitive staged scan passed.
- Day38 backup was created.
- Restore test passed.
- audit.proposal_review_apply_events count remained 3.
- Protected proposal remained pending.
- app.crop_cycles id=2 remained present.

Day38 backup:

- backups/farmos_core_day38_20260705_221006.dump

Day38 commit before documentation amend:

- 0fd4204 feat: add hermes readonly integration boundary

## Day39 direction

Day39 can add a Hermes proposal writer boundary.

Day39 should still be human-review-first.

Day39 should only write proposal records into the proposal inbox through a controlled boundary.

Day39 should not apply app data automatically.
