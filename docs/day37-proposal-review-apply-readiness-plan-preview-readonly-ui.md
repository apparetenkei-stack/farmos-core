# Day37 Proposal Review Apply Readiness and Plan Preview Read-only UI Foundation

Day37 adds read-only visibility for proposal apply readiness and apply plan preview on the proposal detail page.

## Purpose

The proposal detail page now separates three concepts:

1. Review Decision Events
   - Append-only review decision logs.
   - They do not apply proposal changes to app data.

2. Apply Readiness
   - Current read-only judgment of whether the proposal can be applied by a separate command path.
   - No apply command is executed.
   - No dry-run command is executed.
   - No mutation control is exposed.

3. Apply Plan Preview
   - Preview-only view of what a separate apply command would attempt.
   - It is future-looking and separate from committed Apply History Events.
   - No app, ai, or audit table is mutated.

Apply History Events remain committed historical observability from `audit.proposal_review_apply_events`.

## Files

- `src/app/proposals/[proposalId]/page.tsx`
- `scripts/app/test_proposal_review_apply_readiness_plan_preview_readonly_ui_boundary.ts`
- `package.json`

## Boundaries used

- `checkProposalReviewApplyReadiness`
- `previewProposalReviewApplyPlan`

Both are read boundaries used from the server-rendered proposal detail page.

## Safety invariants

Day37 does not add:

- apply button
- approve form
- reject form
- Server Actions
- mutation route handlers
- apply command execution from UI
- dry-run command execution from UI
- Hermes runtime
- LLM runtime
- automatic apply path
- order, shipping, labor, money, or customer apply path

## Protected local fixture

The protected proposal remains:

- id: `24fc24ee-8efa-436b-8424-9703edeeb297`
- expected status: `pending`

The Day36 local apply history fixture remains:

- `insert_candidate`: 2 committed events
- `no_op_candidate`: 1 committed event
- total apply history count: 3

`app.crop_cycles id=2` must remain present.

## Verification

Run:

```bash
pnpm run test-proposal-review-apply-readiness-plan-preview-readonly-ui-boundary
pnpm run build

The Day37 UI boundary test verifies:

app caller can read apply readiness
app caller can read apply plan preview
UI boundary reads do not change audit.proposal_review_apply_events
protected proposal remains pending
protected proposal is not marked applied
app.crop_cycles id=2 remains present
app caller cannot write app.crop_cycles
app caller cannot write ai.proposal_inbox
app caller cannot write audit.proposal_review_apply_events
preview boundary reports preview_only=true
preview boundary reports writes_performed=false
preview boundary reports commands_executed=false
