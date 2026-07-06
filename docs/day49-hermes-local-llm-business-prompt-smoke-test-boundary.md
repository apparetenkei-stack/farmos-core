# Day49 Hermes Local LLM Business Prompt Smoke Test Boundary

## Purpose

Day49 adds the Hermes Local LLM Business Prompt Smoke Test Boundary.

This boundary advances one step beyond the Day48 business prompt dry-run contract, but it still does not send any real business prompt to a model.

Day49 sends only one fixed business-like dummy prompt to a local LLM runtime, and only when explicit smoke-test opt-in is present.

## Fixed dummy prompt

The only prompt allowed by this boundary is:

```text
You are Hermes in a smoke test. This is dummy farm-planning text with no real farm data. Respond with exactly: hermes_business_prompt_smoke_ok
```

Expected response:

```text
hermes_business_prompt_smoke_ok
```

The fixed dummy prompt does not include real fields, crop cycles, harvest records, customers, orders, shipping details, payments, amounts, payroll, personal evaluation, proposal body text, or restricted-domain data.

## What Day49 allows

```text
fixed business-like dummy prompt local LLM smoke test
explicit opt-in runtime call only
local endpoint allowlist validation
model config presence check
Day48 business prompt contract status compatibility
Day47 fixed non-business prompt smoke status compatibility
Day46 local runtime health probe compatibility
Day45 local runtime health check compatibility
Day44 adapter switch compatibility
safe metadata output
tokens_used metadata only
mock fallback
selected_provider remains mock
DB writes remain disabled
```

## What Day49 forbids

```text
real business prompt execution
user prompt execution
Hermes chat body execution
businessContext execution
proposal body execution
restricted-domain data execution
crop cycle detail execution
customer/order/shipping/payment data execution
counterparty data execution
amount data execution
payroll data execution
personal evaluation data execution
chat history writes
proposal generation
proposal apply
app schema writes
ai.proposal_inbox writes
audit apply event writes
embeddings
vector search
Qdrant writes
MinIO writes
external API calls
OpenAI SDK
Claude SDK
Gemini SDK
POST routes
Server Actions
Form Actions
production chat from UI
arbitrary prompt request body creation
arbitrary prompt LLM sending
businessContext request body creation
businessContext LLM sending
```

## Boundary rules

Day49 is a separate boundary from Day48.

Day48 remains:

```text
business_prompt_dry_run_contract_only
runtime_call_allowed = false
business_prompt_sent_to_model = false
request_body_created = false
request_body_sent = false
```

Day49 adds:

```text
prompt_smoke_mode = fixed_business_dummy_prompt_only
runtime_call_allowed = true_for_fixed_business_dummy_prompt_only
fixed_business_dummy_prompt_allowed = true
real_business_prompt_allowed = false
user_prompt_allowed = false
business_context_allowed = false
restricted_domain_data_allowed = false
```

The Day49 boundary may create and send a request body only when all conditions are true:

```text
provider = local_llm_business_prompt_smoke
smoke = true
endpoint is configured
model is configured
endpoint is local and allowlisted
no user prompt is present
no businessContext is present
no restricted-domain data is present
```

## Local endpoint allowlist

Allowed local endpoints:

```text
http://127.0.0.1:11434/api/generate
http://127.0.0.1:11434/api/chat
http://127.0.0.1:1234/v1/chat/completions
http://localhost:1234/v1/chat/completions
```

External endpoints are blocked.

Examples of blocked external endpoints:

```text
https://api.openai.com/v1/chat/completions
https://api.anthropic.com/v1/messages
https://generativelanguage.googleapis.com/v1beta/models
```

## Secrets and response exposure

The boundary never exposes:

```text
endpoint value
model value
credentials
full response body
restricted-domain data
```

Only safe metadata is returned.

## Runtime and write policy

```text
writes_performed = false
chat_history_write_allowed = false
app_schema_write_allowed = false
ai_proposal_write_allowed = false
audit_apply_event_write_allowed = false
proposal_apply_allowed = false
external_api_called = false
response_body_exposed = false
restricted_domain_data_exposed = false
endpoint_value_exposed = false
model_value_exposed = false
credentials_exposed = false
user_prompt_sent_to_model = false
business_context_sent_to_model = false
real_business_prompt_sent_to_model = false
```

Runtime execution flags may become true only for the explicit fixed dummy smoke execution:

```text
local_model_called = true
local_runtime_generate_http_called = true
prompt_sent_to_model = true
request_body_created = true
request_body_sent = true
fixed_business_dummy_prompt_sent_to_model = true
```

## CLI examples

Dry-run status only:

```bash
pnpm run run-hermes-local-llm-business-prompt-smoke-test -- --provider local_llm_business_prompt_smoke --dry-run
```

Explicit fixed dummy smoke execution:

```bash
pnpm run run-hermes-local-llm-business-prompt-smoke-test -- --provider local_llm_business_prompt_smoke --dry-run --smoke
```

## Day50 note

If production business prompt sending is considered in Day50 or later, it must be implemented as a separate policy gate and redaction boundary.

Day49 must not be reused as a production chat boundary.
