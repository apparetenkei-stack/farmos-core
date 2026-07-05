# Day40 Hermes Chat Read UI Foundation

## Purpose

Day40 adds the first in-app Hermes entry point for FarmOS Core.

This is not a live chat implementation yet. It is a read-only UI foundation that lets the app display Hermes-related context safely.

Day40 connects the app UI to:

- Day38 Hermes context read boundary
- Day39 Hermes proposal writer output, read-only
- latest Hermes proposal notes
- proposal-specific Hermes context viewer

## Added files

- scripts/app/api_boundary/hermes_chat_readonly_ui_boundary.ts
- scripts/app/test_hermes_chat_readonly_ui_boundary.ts
- src/app/hermes/page.tsx
- src/app/hermes/[proposalId]/page.tsx
- docs/day40-hermes-chat-read-ui.md

## Scope

Day40 creates:

- /hermes
- /hermes/[proposalId]
- a read-only UI aggregate boundary
- a safety test for the UI aggregate boundary

The /hermes page displays:

- Hermes status summary
- read-only warning
- runtime execution flags
- human review requirement
- latest Hermes proposal notes
- protected fixture link

The /hermes/[proposalId] page displays:

- proposal id
- proposal context scope
- proposal status
- readiness result
- preview result
- apply history summary
- related Hermes proposal notes
- safety policy
- redaction policy
- boundary flags

## Explicit non-goals

Day40 does not add:

- Hermes runtime daemon
- LLM runtime
- OpenAI / Claude / Gemini / local LLM calls
- OpenClaw integration
- chat message sending
- chat history storage
- chat input persistence
- POST route
- PUT route
- PATCH route
- DELETE route
- Server Actions
- proposal creation from UI
- proposal approval
- proposal rejection
- proposal apply
- app schema write
- audit apply event write
- ai.proposal_inbox insert/update/delete from UI
- autonomous action

## Safety boundary

The Day40 boundary reports:

- mode = hermes_chat_readonly_ui_boundary
- transaction_read_only = true
- writes_performed = false
- commands_executed = false
- hermes_runtime_executed = false
- llm_runtime_executed = false
- app_schema_write_allowed = false
- ai_proposal_write_allowed = false
- audit_apply_event_write_allowed = false

## Restricted domain handling

Day40 UI must not expose administrator-only or restricted operational domains.

The UI intentionally avoids:

- commercial transaction domain
- logistics and allocation domain
- external party domain
- finance domain
- workforce-sensitive domain
- personal assessment domain
- private runtime configuration domain
- credential material domain

Day40 displays only sanitized Hermes context and proposal notes.

## Day39 role grant note

Day39 role grants are currently local bootstrap state and should be formalized later.

Day40 does not convert those grants into migration SQL. Day40 only uses a read-only app boundary.

## Protected fixture constraints

The Day40 safety test must preserve:

- proposal 24fc24ee-8efa-436b-8424-9703edeeb297 remains pending
- proposal count does not change during Day40 UI boundary read
- audit.proposal_review_apply_events count does not change
- app.crop_cycles id=2 remains present
- latest Hermes proposal notes are readable
- restricted-domain data exposure remains false

## Validation

Run these checks:

- pnpm run test-hermes-chat-readonly-ui-boundary
- pnpm run test-hermes-context-read-api-boundary
- pnpm run test-hermes-proposal-writer-boundary
- pnpm run build

## Next

Day41 can add Hermes memory / context retrieval minimum implementation.

Day41 should still keep chat input and LLM response behind explicit safety boundaries unless the boundary is designed and tested first.
