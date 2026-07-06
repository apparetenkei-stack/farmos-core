# Day47 Hermes Local LLM Prompt Smoke Test Boundary

## Purpose

Day47 adds a dedicated boundary for a minimal local LLM prompt smoke test.

This is one step beyond the Day46 local LLM runtime health probe, but it is still not Hermes production chat.

Day47 allows only a fixed, non-business smoke prompt.

Fixed prompt:

Respond with exactly: hermes_local_llm_smoke_ok

Expected response:

hermes_local_llm_smoke_ok

## Day47 allows

- Fixed non-business smoke prompt only.
- Explicit opt-in local loopback smoke test only.
- Minimal local Ollama / LM Studio / OpenAI-compatible local endpoint paths.
- Response match classification only.
- Safe metadata such as tokens_used.
- Timeout / error / fallback metadata.
- Mock fallback.
- Endpoint value non-disclosure.
- Model value non-disclosure.
- Credential non-disclosure.

## Day47 forbids

- Business prompts.
- User input prompts.
- Hermes consultation text.
- Proposal text.
- Restricted-domain data.
- Crop cycle detail payloads.
- Customer / order / shipping / payment information.
- Trading partner information.
- Amount / money information.
- Payroll information.
- Personal evaluation information.
- Chat history writes.
- Proposal generation.
- Proposal apply.
- App DB writes.
- ai.proposal_inbox writes.
- Audit apply event writes.
- Embeddings.
- Vector DB writes.
- Qdrant writes.
- MinIO writes.
- External API calls.
- OpenAI SDK.
- Claude SDK.
- Gemini SDK.
- POST routes.
- Server Actions.
- Form Actions.
- Production chat submission from UI.
- Farming app DB writes.

## Boundary rules

The boundary must not expose:

- Endpoint actual value.
- Model actual value.
- Credentials.
- Full response body.
- Business context.
- Restricted-domain data.

The boundary may expose:

- response_match_result.
- tokens_used as safe metadata.
- Timeout / blocked / error classification.
- Static config key names.

## Endpoint scope

Allowed local smoke endpoint candidates:

- http://127.0.0.1:11434/api/generate
- http://127.0.0.1:11434/api/chat
- http://127.0.0.1:1234/v1/chat/completions
- http://localhost:1234/v1/chat/completions

Forbidden:

- https://api.openai.com
- https://api.anthropic.com
- https://generativelanguage.googleapis.com
- Any external host.
- Any endpoint requiring credential exposure.
- Any arbitrary endpoint not explicitly allowlisted for Day47.

## Runtime policy

The local LLM runtime call is allowed only when all conditions are true:

1. Provider is local_llm_prompt_smoke.
2. Explicit smoke execution is requested.
3. Endpoint is allowlisted local loopback.
4. Model is configured.
5. Prompt is the fixed smoke prompt only.
6. No user prompt is accepted.
7. No business context is accepted.
8. No response body is exposed.
9. No writes are performed.

## Response classification

response_match_result values:

- matched
- unmatched
- not_configured
- blocked
- timeout
- error

## Compatibility

Day47 must preserve:

- Day44 adapter switch boundary.
- Day45 local LLM runtime health check boundary.
- Day46 local LLM runtime health probe boundary.
- Mock provider as the selected provider.
- Farming app Hermes UI as read-only / mock preview.

## Not included in Day47

Day47 does not implement:

- Business prompt smoke test.
- User input prompt handling.
- Hermes production chat.
- Chat history persistence.
- Proposal generation.
- Proposal apply.
- Embeddings.
- Vector search.
- Farming app production send UI.

If business prompt smoke testing is added later, it must be a separate boundary.
