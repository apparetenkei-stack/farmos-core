# Day83 Hermes Proposal Draft Review Decision Boundary

## Theme

Hermes Proposal Draft Review Decision Boundary.

## Purpose

Day83 records a human review decision for the Day81 persisted Hermes draft proposal.

This day does not apply a proposal.

## Scope

- Add an audit-only review decision boundary.
- Add a disabled-by-default API smoke route.
- Keep proposal apply separated from review decision recording.
- Keep app schema writes blocked.

## Target proposal

- proposal id: 14711111-88db-41fd-a048-1c37266fd9e0
- source boundary: day81_core_internal_test_only
- expected status: pending

## Allowed write

- INSERT into audit.proposal_review_decision_events only.

## Explicit non-goals

- No app schema write.
- No proposal apply.
- No apply-ready transition.
- No confirmation token.
- No apply audit event.
- No production chat enablement.
- No actual LLM proposal generation.
- No proposal inbox status update.

## API boundary

- Route: POST /api/hermes/proposal-draft-review-decision
- Default state: disabled.
- Enable flag: HERMES_PROPOSAL_DRAFT_REVIEW_DECISION_API_BOUNDARY_ENABLED=true
- Allowed body keys: proposalId, decisionType, decisionNote, decidedBy, decidedByRole.
- The route rejects prompt/body override fields and runtime configuration fields.

## Safety flags

- review_decision_recorded may become true.
- review_decision_saved may become true.
- proposal_inbox_updated remains false.
- ai_proposal_status_updated remains false.
- proposal_draft_apply_ready remains false.
- proposal_apply_ready remains false.
- proposal_apply_performed remains false.
- confirmation_token_created remains false.
- audit_apply_event_created remains false.
- app_db_write_performed remains false.
- app_schema_write_performed remains false.

## Verification

- Existing Day82 persistence API smoke passes.
- Existing Day81 persistence boundary passes.
- Existing proposal draft API boundary passes.
- Existing minimal chat API boundary passes.
- Next build passes.
- Proposal count remains stable.
- Apply history count remains stable.
- Day83 decision event count becomes exactly one for the Day83 boundary id.
- Protected proposal remains pending.
- app.crop_cycles id 2 remains present.
