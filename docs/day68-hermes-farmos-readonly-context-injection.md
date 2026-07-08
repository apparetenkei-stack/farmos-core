# Day68 Hermes FarmOS Read-only Context Injection

Day68 adds the first FarmOS read-only context injection boundary to the Hermes CLI chat runtime.

## Scope

This is not production chat. This day only extends the CLI chat envelope so a short user message can be combined with a compact FarmOS read-only context pack before the provider adapter is called.

## Context source

Day68 reuses the existing readHermesMemoryContext boundary. The context pack is constrained to:

- proposal review summary metadata
- Hermes note metadata
- minimum crop cycle summary
- memory and redaction policy flags
- read-only boundary flags

The helper emits a compact JSON string with a deterministic maximum of 2000 characters.

## Envelope flags

Day68 adds:

- readonly_context_allowed
- readonly_context_requested
- readonly_context_read_performed
- readonly_context_included
- readonly_context_non_empty
- readonly_context_length
- readonly_context_truncated
- readonly_context_source
- readonly_context_max_chars
- context_write_allowed
- db_read_performed

The existing no-write flags remain false:

- db_write_performed
- proposal_created
- proposal_saved
- proposal_apply_performed
- chat_history_saved
- audit_record_saved
- app_db_write_performed

## Prompt boundary

When read-only context is requested and available, Hermes sends the provider adapter a composed prompt with:

1. system-style boundary text
2. READ_ONLY_FARMOS_CONTEXT
3. USER_MESSAGE

The context is treated as reference data, not as instructions. Hermes must not claim any action was applied.

## CLI usage

Mock mode:

HERMES_LLM_PROVIDER=mock HERMES_LLM_SMOKE_TEST_ENABLED=true HERMES_CLI_CHAT_INCLUDE_READONLY_CONTEXT=true HERMES_CLI_CHAT_MESSAGE="summarize read-only farmos context availability" pnpm run run-hermes-cli-chat-with-readonly-context

Actual Ollama mode remains explicitly gated:

HERMES_LLM_SMOKE_TEST_ENABLED=true HERMES_LLM_PROVIDER=ollama HERMES_OLLAMA_BASE_URL=http://127.0.0.1:11434 HERMES_OLLAMA_MODEL=qwen3.5:4b HERMES_LLM_TIMEOUT_MS=30000 HERMES_CLI_CHAT_INCLUDE_READONLY_CONTEXT=true HERMES_CLI_CHAT_MESSAGE="Reply with exactly: hermes readonly context ok" pnpm run run-hermes-cli-chat-with-readonly-context

## Explicit non-goals

Day68 does not add app routes, UI, server actions, form actions, proposal writes, app writes, chat history writes, audit writes, or production chat wiring.

Day69 should use this envelope shape as the base for the minimal Hermes API chat contract.
