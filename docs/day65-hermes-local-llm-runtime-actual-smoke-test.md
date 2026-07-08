# Day65 Hermes Local LLM Runtime Actual Smoke Test

Day65 starts the actual local LLM runtime phase.

The scope is intentionally narrow: FarmOS Core can call a local Ollama runtime from a CLI smoke test, send one fixed non-business prompt, and print the model response.

## Allowed scope

- CLI-only local runtime call.
- Provider: Ollama for Day65.
- Fixed prompt only.
- Response text may be printed to the CLI.
- Endpoint and model may be printed for diagnosis.
- No credential is required.
- Runtime failure must return a safe structured result.

## Disabled mode

Environment:

```bash
HERMES_LLM_SMOKE_TEST_ENABLED=false

Expected result:

runtime_call_allowed=false
llm_runtime_executed=false
status=disabled_by_env
exit_code=0
Actual smoke mode

Environment:

HERMES_LLM_SMOKE_TEST_ENABLED=true
HERMES_LLM_PROVIDER=ollama
HERMES_OLLAMA_BASE_URL=http://127.0.0.1:11434
HERMES_OLLAMA_MODEL=qwen3.5:4b
HERMES_LLM_TIMEOUT_MS=30000

Expected result:

provider=ollama
runtime_call_allowed=true
llm_runtime_executed=true
runtime_reachable=true
response_text=non_empty
Guardrails

Day65 does not change the application UI or application route surface.

Day65 does not persist any Hermes chat, proposal, review, confirmation, or audit state.

Day65 does not mutate FarmOS Core database state.

Day65 does not add a production chat path. That remains reserved for later Days.
