# Day51 Hermes Business Prompt Payload Schema Boundary

## Purpose

Day51 adds a dry-run boundary that converts a Day50 policy-gated business prompt candidate into a fixed payload schema for a future local LLM request.

Day51 does not send the payload to a model.
Day51 does not create a real request body.
Day51 does not expose raw prompt text.
Day51 does not expose sanitized prompt text.
Day51 does not save chat history.
Day51 does not generate proposals.
Day51 does not apply proposals.
Day51 does not write to the app, ai, audit, vector, or object storage domains.

## Boundary name

Hermes Business Prompt Payload Schema Boundary

## Scope

Allowed:

- payload schema dry-run
- Day50 policy gate status integration
- redaction decision integration
- safe schema metadata only payload preview
- schema_version declaration
- payload_kind declaration
- source kind metadata
- safety metadata
- runtime target metadata
- transport metadata
- send eligibility metadata
- mock fallback preservation
- selected_provider remains mock
- tokens_used = 0

Forbidden:

- user prompt submission to LLM
- real business prompt submission to LLM
- businessContext submission to LLM
- proposal body submission to LLM
- restricted-domain data submission to LLM
- raw prompt full text exposure
- sanitized prompt text exposure
- request body creation
- request body transmission
- local runtime generate/chat call
- external API call
- OpenAI / Claude / Gemini SDK usage
- chat history write
- ai.proposal_inbox write
- audit apply event write
- proposal apply
- embeddings
- vector search
- Qdrant write
- MinIO write
- POST route
- Server Action
- Form Action
- production chat send from UI

## Schema status

The boundary returns `business_prompt_payload_schema` with:

- mode = hermes_business_prompt_payload_schema_boundary
- runtime = local_llm
- payload_schema_mode = dry_run_payload_schema_only
- configured_provider = business_prompt_payload_schema
- schema_version = hermes.business_prompt_payload.v0
- payload_kind = business_prompt_candidate
- payload_created = true | false
- payload_send_allowed = false
- payload_send_decision = dry_run_only | blocked | not_configured
- payload_preview_exposed = safe_schema_metadata_only
- source_prompt_included = false
- sanitized_prompt_included = false
- business_context_included = false
- proposal_body_included = false
- restricted_domain_data_included = false
- raw_prompt_exposed = false
- request_body_created = false
- request_body_sent = false
- prompt_sent = false
- response_body_exposed = false
- selected_provider = mock
- fallback_provider = mock
- tokens_used = 0

## Payload preview

The payload preview is safe schema metadata only.

It may include:

- schema_version
- payload_kind
- source_kind
- raw_prompt_included = false
- sanitized_prompt_included = false
- policy_gate_checked = true
- prompt_category
- prompt_risk_level
- redaction_decision
- send_decision
- restricted_domain_data_included = false
- business_context_included = false
- proposal_body_included = false
- target_runtime = local_llm
- selected_provider = mock
- fallback_provider = mock
- runtime_call_allowed = false
- request_body_created = false
- request_body_sent = false
- response_body_exposed = false

It must not include:

- raw prompt text
- sanitized prompt text
- business context body
- proposal body
- endpoint value
- model value
- credentials
- response body

## Day52 note

If a future day introduces actual payload body generation or model submission, it must be implemented as a separate boundary. Day51 only fixes the dry-run schema shape.
