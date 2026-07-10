# Day81 Hermes Proposal Draft Persistence Boundary

## Theme

Hermes Proposal Draft Persistence Boundary

## Scope

Day81 adds a Core internal persistence boundary for a mock Hermes proposal draft candidate.

This is not an apply boundary.

## Implemented

- Added src/lib/hermes/hermes_proposal_draft_persistence_boundary.ts
- Added scripts/hermes/test_hermes_proposal_draft_persistence_boundary.ts
- Added package scripts for test and check
- Persists one mock draft candidate into ai.proposal_inbox
- Uses status pending
- Keeps the proposal not apply-ready
- Keeps UI disconnected
- Adds no API route
- Uses no Server Action or Form Action

## Persistence target

- schema: ai
- table: proposal_inbox
- proposal_type: hermes_chat_draft_preview
- source marker: day81_persistence_boundary_test
- boundary: day81_core_internal_test_only

## Safety assertions

- app schema write is not performed
- proposal apply is not performed
- confirmation token creation is not performed
- audit apply event creation is not performed
- existing protected proposal remains pending
- app.crop_cycles id 2 remains present
- apply history count remains unchanged

## Duplicate execution behavior

The test uses day81_core_internal_test_only_v1 as a deterministic boundary identifier.

If the Day81 record already exists, the test returns the existing record instead of inserting another one.

No UPDATE is used for duplicate handling.

## Day82 handoff

Day82 should connect this persistence boundary to a limited API/UI smoke boundary.

Day82 must still avoid apply, confirmation token creation, and apply-ready state.
