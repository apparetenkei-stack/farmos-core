# Day82 Hermes Proposal Draft Persistence API UI Smoke Boundary

## Theme

Hermes Proposal Draft Persistence API/UI Smoke Boundary

## Scope

Day82 connects the Day81 Core internal proposal draft persistence boundary to a limited Core API smoke route.

The route is disabled unless HERMES_PROPOSAL_DRAFT_PERSISTENCE_API_SMOKE_ENABLED is true.

## Implemented

- Added src/app/api/hermes/proposal-draft-persistence/route.ts
- Added scripts/hermes/test_hermes_proposal_draft_persistence_api_smoke_boundary.ts
- Added package scripts for Day82 test and check
- Reused the Day81 Core persistence service
- Kept request body limited to message, includeReadonlyContext, and provider
- Kept provider limited to mock
- Kept persistence idempotent through the Day81 boundary identifier

## Safety boundaries

- app schema write is not performed
- proposal apply is not performed
- confirmation token creation is not performed
- audit apply event creation is not performed
- apply-ready state is not created
- Server Action and Form Action are not used
- UI is not connected in this Core commit

## Day82 state

- proposal_draft_persisted can be true
- proposal_draft_saved can be true
- proposal_draft_apply_ready remains false
- proposal_apply_performed remains false
- confirmation_token_created remains false
- audit_apply_event_created remains false
- app_db_write_performed remains false

## Day83 handoff

Day83 should introduce the proposal draft review decision boundary.

Day83 must still keep apply separate from review decision recording.
