# Day52 Hermes Business Prompt Human Confirmation Boundary

## Purpose

Day52 adds a dry-run only human confirmation boundary for Hermes business prompt payload candidates.

This boundary does not send prompts to a local LLM. It does not create a request body. It does not persist confirmation tokens or confirmation records. It only fixes the rule that any future business prompt payload must require human confirmation before send.

## Scope

Day52 is downstream of Day51 payload schema boundary and Day50 policy gate boundary.

Allowed:

- safe confirmation metadata only
- confirmation_required = true
- human_confirmed = false
- confirmation_state = required / blocked / not_configured
- confirmation_result = not_confirmed / blocked / not_configured
- confirmation_token_created = false
- confirmation_token_exposed = false
- confirmation_record_created = false
- confirmation_record_saved = false
- payload_send_allowed = false
- selected_provider = mock
- fallback_provider = mock
- tokens_used = 0

Forbidden:

- raw prompt exposure
- sanitized prompt exposure
- businessContext exposure
- proposal body exposure
- restricted-domain data exposure
- endpoint/model/credential exposure
- request body creation
- request body send
- local runtime generate/chat call
- external API call
- confirmation token persistence
- confirmation record persistence
- chat history write
- proposal generation
- proposal apply
- DB write
- POST route
- Server Action
- Form Action
- production chat send from UI

## Status contract

The boundary emits:

- mode = hermes_business_prompt_human_confirmation_boundary
- runtime = local_llm
- confirmation_mode = dry_run_human_confirmation_only
- schema_version = hermes.business_prompt_confirmation.v0
- payload_schema_version = hermes.business_prompt_payload.v0
- payload_kind = business_prompt_candidate
- payload_send_allowed = false
- confirmation_required = true
- human_confirmed = false
- confirmation_token_created = false
- confirmation_token_exposed = false
- confirmation_record_created = false
- confirmation_record_saved = false
- runtime_call_allowed = false
- request_body_created = false
- request_body_sent = false
- prompt_sent = false
- response_body_exposed = false
- selected_provider = mock
- fallback_provider = mock
- tokens_used = 0

## Confirmation state mapping

- no payload candidate: not_configured / not_configured
- allowed dry-run payload candidate: required / not_confirmed
- blocked upstream payload candidate: blocked / blocked

## Safety invariant

Day52 keeps Hermes in mock / read-only / dry-run mode. It does not enable real business chat, user prompt send, runtime calls, proposal generation, proposal apply, or database writes.
