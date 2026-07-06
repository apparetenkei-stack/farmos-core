# Day45: Hermes Local LLM Runtime Health Check Boundary

## Purpose

Day45 adds the Hermes Local LLM Runtime Health Check Boundary.

This is not the day Hermes sends business prompts to a model.
This is not the day Hermes starts production chat.
This is not the day Hermes generates proposals.

Day45 only defines a safe dry-run contract for local LLM runtime health status, configuration key names, timeout policy, and fallback policy.

## Boundary mode

health_check_mode = dry_run_contract_only

## Allowed in Day45

- Define local runtime provider status.
- Return safe configuration key names.
- Return timeout policy.
- Return fallback policy.
- Return dry-run health status.
- Confirm runtime calls are not allowed.
- Prepare a safe status object that the Day44 adapter switch boundary can reference.

## Forbidden in Day45

- Sending business prompts.
- Sending Hermes chat text to a model.
- Sending proposal review text to a model.
- Exposing restricted-domain data.
- Calling a local model runtime.
- Calling external model APIs.
- Calling model inference endpoints.
- Reading or exposing runtime private config values.
- Reading or exposing credential values.
- Exposing endpoint values.
- Exposing model values.
- Creating embeddings.
- Writing to a vector database.
- Writing to MinIO.
- Saving chat history.
- Creating proposals.
- Applying proposals.
- Writing to app schema.
- Writing to ai.proposal_inbox.
- Writing to audit.proposal_review_apply_events.
- Adding POST routes.
- Adding PUT routes.
- Adding PATCH routes.
- Adding DELETE routes.
- Adding Server Actions.
- Adding Form Actions.

## Safe config contract

endpoint_config_key = HERMES_LOCAL_LLM_ENDPOINT
model_config_key = HERMES_LOCAL_LLM_MODEL
endpoint_value_exposed = false
model_value_exposed = false
credentials_required = false
credentials_exposed = false

## Runtime status contract

runtime = local_llm
runtime_reachable = not_checked_by_day45
runtime_call_allowed = false
local_runtime_health_http_called = false
prompt_sent = false
prompt_sent_to_model = false
llm_runtime_executed = false
local_model_called = false
external_api_called = false
tokens_used = 0

## Timeout policy

connect_timeout_ms = 1000
total_timeout_ms = 3000
on_timeout = fallback_to_mock

## Fallback policy

fallback_provider = mock
fallback_reason = local_llm_runtime_not_enabled_by_day45

## Day44 integration

Day45 allows the Day44 Hermes LLM adapter switch boundary to include a safe local health status when local_llm or local_llm_disabled is requested.

The selected provider remains mock.
The local provider remains non-executable.
No adapter result is produced for blocked local provider requests.
No runtime call is made.

## Day46 note

Day46 may consider a minimal runtime health probe, but it must remain separated from prompt sending.

Even if a runtime health endpoint check is added later, business prompts, Hermes chat text, proposal review text, restricted-domain data, embeddings, chat history writes, proposal generation, and proposal apply must remain blocked until separate boundaries explicitly allow them.
