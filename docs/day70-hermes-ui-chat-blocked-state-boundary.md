# Day70 Hermes UI Chat Blocked-State Connection Boundary

## Summary

Day70 adds a minimal UI connection boundary from the existing Hermes page to POST /api/hermes/chat.

The goal is not production chat. The goal is to display the blocked response envelope while HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED=false.

## Added UI Boundary

- Existing page: src/app/hermes/page.tsx
- New client component: src/components/hermes/hermes_api_blocked_state_preview.tsx
- API endpoint: POST /api/hermes/chat
- Initial provider: mock
- Initial includeReadonlyContext: false
- Message validation: required, single-line, 500 chars max

## Request Body Contract

The UI sends only these fields:

- message
- includeReadonlyContext
- provider

The UI does not send baseUrl, model, timeoutMs, credentials, apiKey, token, dbConnection, connectionString, systemPrompt, or proposalBody.

## Displayed Envelope Fields

- status
- api_boundary_enabled
- production_chat_enabled
- prompt_sent
- db_read_performed
- db_write_performed
- proposal_created
- proposal_saved
- proposal_apply_performed
- chat_history_saved
- audit_record_saved
- app_db_write_performed
- ui_connected
- server_action_used
- form_action_used
- response_envelope_normalized

## Safety Assertions

- No production chat is enabled.
- No Server Action is used.
- No Form Action is used.
- No chat history is saved.
- No proposal is created, saved, or applied.
- No audit record is saved.
- No app DB write is performed.
- No credentials or connection strings are exposed.

## Verification

- pnpm run test-hermes-ui-chat-blocked-state-boundary
- pnpm run check-hermes-ui-chat-blocked-state-boundary
- pnpm run check-hermes-api-chat-minimal-boundary
- pnpm run build
- refined forbidden implementation scan
- sensitive scan
- token-only scan
- git diff --check
- protected state check

## Day71 Handoff

Day71 should keep this blocked-state UI boundary in place and verify mock response display when the API boundary is enabled.

Day71 should still avoid actual Ollama UI chat, chat history persistence, proposal generation, proposal persistence, proposal apply, and DB writes.

