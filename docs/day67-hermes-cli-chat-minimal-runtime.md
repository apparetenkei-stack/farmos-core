# Day67 Hermes CLI Chat Minimal Runtime

## Theme

Hermes CLI Chat Minimal Runtime.

## Purpose

Day67 adds a minimal CLI chat runtime on top of the Day66 provider adapter.
This is not production chat.

## Implemented

- Added `scripts/hermes/llm_runtime/hermes_cli_chat_runtime.ts`.
- Added `scripts/hermes/run_hermes_cli_chat_runtime.ts`.
- Added `scripts/hermes/test_hermes_cli_chat_runtime.ts`.
- Extended `hermes_local_llm_runtime_smoke_test.ts` with optional prompt input while keeping the original fixed smoke prompt default.
- Extended `hermes_llm_provider_adapter.ts` so callers can pass a prompt through the same adapter entry point.
- Added package scripts for run, test, and check.

## CLI input

- `--message "hello"`
- `HERMES_CLI_CHAT_MESSAGE="hello"`

The argv message wins over the environment message.

## Input constraints

- `max_input_message_chars = 500`
- `multi_line_message_allowed = false`
- `empty_message_allowed = false`
- `business_context_included = false`
- `farm_context_included = false`
- `db_context_included = false`
- `proposal_context_included = false`

Invalid input returns a normalized `bad_request` envelope and does not call the runtime.

## Provider modes

- disabled mode: `HERMES_LLM_SMOKE_TEST_ENABLED=false`
- mock provider mode: `HERMES_LLM_PROVIDER=mock`
- Ollama provider mode: `HERMES_LLM_PROVIDER=ollama` with explicit local loopback base URL and model

## Normalized output

The runtime emits a JSON envelope containing provider status, runtime flags, input validation flags, response text, token usage, and no-side-effect flags.

## Boundary

Day67 intentionally does not add routes, actions, UI changes, database writes, proposal writes, proposal apply, chat history persistence, audit persistence, FarmOS DB context, farm context, business context, or production chat wiring.

## Day68 preparation

The request and response envelope names are intentionally structured so Day68 can add read-only FarmOS context without changing the provider adapter boundary.
