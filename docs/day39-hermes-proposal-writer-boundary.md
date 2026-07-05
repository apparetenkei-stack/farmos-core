# Day39 Hermes Proposal Writer Boundary Foundation

## Purpose

Day39 adds a Hermes proposal writer boundary.

The boundary allows Hermes-side deterministic logic to create a reviewer-facing proposal in `ai.proposal_inbox`.

Day39 does not run a Hermes daemon, does not call an LLM, and does not apply any app projection.

## Relationship to Day38

Day38 added the read-only Hermes context boundary.

Day39 builds on that read-only context and creates a second proposal only when the context result is `ok`.

The created proposal is a meta proposal for human review. It is not an app mutation.

## Allowed write target

Allowed:

- `ai.proposal_inbox` insert only

The created proposal must start as:

- `status = pending`
- `applied_at = null`
- `applied_by = null`
- `requires_human_review = true`
- `autonomous_apply_allowed = false`

## Prohibited targets

Prohibited:

- app schema writes
- audit apply event writes
- proposal apply marker updates
- direct app projection apply
- auto approval
- auto rejection
- route handlers for mutation
- UI-originated mutation
- LLM runtime calls
- Hermes runtime daemon execution

## Proposal type

Day39 creates only a safe meta proposal:

- `hermes_apply_blocker_explanation`

This proposal explains blocked review context and points a human reviewer to the next review step.

## Runtime policy

Day39 is deterministic.

- Hermes runtime executed: false
- LLM runtime executed: false
- External model call: none
- OpenClaw integration: none

## Domain exposure policy

Day39 proposal payload and source refs must not contain restricted operational domains.

Restricted domains are not passed to the proposal payload.

The writer boundary is limited to source context scope, source proposal id, blocker summary, and human-review flags.

## Safety acceptance criteria

Day39 is complete when:

- dry-run does not change `ai.proposal_inbox`
- commit inserts exactly one proposal
- created proposal is `pending`
- created proposal has null apply markers
- created proposal requires human review
- created proposal disallows autonomous apply
- app schema write is not allowed
- audit apply write is not allowed
- protected proposal remains `pending`
- `app.crop_cycles id=2` remains
- Day38 context boundary test still passes
- Day39 writer boundary test passes
- build passes
- mutation route scan passes
- sensitive pattern scan passes
- backup and restore pass
- commit is created

## Rollback

Use the Day39 backup once created.

Day38 backup before this work:

- `backups/farmos_core_day38_20260705_221006.dump`

## Next

Day40 can add the read-side chat entry point in the app.

Day40 must still avoid autonomous app mutation.
