# Day66 Hermes Provider Adapter Minimal Unification

Day66 adds the minimal Hermes LLM provider adapter.

## Scope

- Provider names: ollama, mock
- Modes: disabled, mock provider, actual Ollama smoke
- Actual runtime call is limited to the fixed smoke prompt inherited from Day65.
- Runner is CLI-only.

## Non-goals

- No production chat.
- No application route, action, page, layout, or UI change.
- No database write.
- No proposal creation, proposal save, proposal apply, chat history save, or audit record save.
- No credentials required or exposed.

## Added files

- scripts/hermes/llm_runtime/hermes_llm_provider_adapter.ts
- scripts/hermes/run_hermes_llm_provider_adapter_smoke_test.ts
- scripts/hermes/test_hermes_llm_provider_adapter.ts
- docs/day66-hermes-provider-adapter-minimal-unification.md

## Package scripts

- run-hermes-llm-provider-adapter-smoke-test
- test-hermes-llm-provider-adapter
- check-hermes-llm-provider-adapter

## Expected behavior

mock provider:
- provider = mock
- status = mock_fallback
- runtime_call_allowed = false
- llm_runtime_executed = false
- runtime_reachable = false
- prompt_sent = false
- response_text_non_empty = true
- all write flags remain false

ollama disabled mode:
- provider = ollama
- status = disabled_by_env
- runtime_call_allowed = false
- llm_runtime_executed = false
- runtime_reachable = false
- prompt_sent = false
- response_text = null
- all write flags remain false

ollama actual smoke mode:
- HERMES_LLM_SMOKE_TEST_ENABLED must be true
- HERMES_LLM_PROVIDER must be ollama
- HERMES_OLLAMA_BASE_URL should be http://127.0.0.1:11434
- HERMES_OLLAMA_MODEL should be qwen3.5:4b
- HERMES_LLM_TIMEOUT_MS should be 30000
- expected status = ok
- expected response_text_non_empty = true
- all write flags remain false

## Guardrails

- Only loopback HTTP base URLs are allowed for Ollama through the Day65 runtime boundary.
- External API calls remain false.
- Credentials are not required or exposed.
- Unit test uses injected fetch and does not require network access.
- Actual Ollama smoke runner is separate and requires explicit environment activation.
