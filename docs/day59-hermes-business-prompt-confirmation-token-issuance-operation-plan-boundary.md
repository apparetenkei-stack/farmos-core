# Day59 Hermes Business Prompt Confirmation Token Issuance Operation Plan Boundary

## Purpose

Day59 adds a dry-run only boundary for Hermes business prompt confirmation token issuance operation planning.

This boundary sits after the Day58 confirmation token issuance request boundary.

It exposes only safe operation-plan metadata for future token issuance:

- operation plan status
- execution gate metadata
- persistence gate metadata
- upstream request/readiness/preview/action/review schema lineage
- fixed safety flags proving that no token, confirmation record, audit record, request body, runtime call, or payload send has occurred

## Scope

Added files:

- `scripts/hermes/api_boundary/hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary.ts`
- `scripts/hermes/run_hermes_business_prompt_confirmation_token_issuance_operation_plan_dry_run.ts`
- `scripts/hermes/test_hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary.ts`
- `scripts/hermes/test_hermes_llm_adapter_switch_business_prompt_confirmation_token_issuance_operation_plan_integration.ts`

Updated files:

- `scripts/hermes/api_boundary/hermes_llm_adapter_switch_boundary.ts`
- `package.json`

## Provider aliases

- `business_prompt_confirmation_token_issuance_operation_plan`
- `local_llm_business_prompt_confirmation_token_issuance_operation_plan`

## Contract

Expected fixed values:

- `mode = hermes_business_prompt_confirmation_token_issuance_operation_plan_boundary`
- `runtime = local_llm`
- `confirmation_token_issuance_operation_plan_mode = dry_run_confirmation_token_issuance_operation_plan_only`
- `configured_provider = business_prompt_confirmation_token_issuance_operation_plan`
- `schema_version = hermes.business_prompt_confirmation_token_issuance_operation_plan.v0`
- `source_schema_version = hermes.business_prompt_confirmation_token_issuance_request.v0`
- `source_token_issuance_readiness_schema_version = hermes.business_prompt_confirmation_token_issuance_readiness.v0`
- `source_token_preview_schema_version = hermes.business_prompt_confirmation_token_preview.v0`
- `source_action_readiness_schema_version = hermes.business_prompt_confirmation_action_readiness.v0`
- `source_ui_metadata_schema_version = hermes.business_prompt_confirmation_review_ui_metadata.v0`
- `source_review_schema_version = hermes.business_prompt_confirmation_review.v0`

## Mapping

### Day58 request pending implementation

When Day58 returns:

- `confirmation_token_issuance_request_status = request_pending_implementation`

Day59 returns:

- `confirmation_token_issuance_operation_plan_status = operation_plan_pending_implementation`
- `confirmation_token_issuance_operation_plan_available = false`
- `confirmation_token_issuance_operation_plan_allowed = false`
- `confirmation_token_issuance_operation_plan_label = none`
- `confirmation_token_issuance_operation_plan_disabled_reason = token_issuance_operation_plan_not_enabled_by_day59`
- `confirmation_token_issuance_operation_plan_precondition_met = true`
- `confirmation_token_issuance_operation_created = false`
- `confirmation_token_issuance_operation_queued = false`
- `confirmation_token_issuance_operation_executed = false`
- `confirmation_token_issuance_operation_result_saved = false`

### Day58 blocked by policy

When Day58 returns:

- `confirmation_token_issuance_request_status = blocked_by_policy`

Day59 returns:

- `confirmation_token_issuance_operation_plan_status = blocked_by_policy`
- `confirmation_token_issuance_operation_plan_disabled_reason = blocked_by_policy`
- `confirmation_token_issuance_operation_plan_precondition_met = false`

### Day58 payload not ready

When Day58 returns:

- `confirmation_token_issuance_request_status = payload_not_ready`

Day59 returns:

- `confirmation_token_issuance_operation_plan_status = payload_not_ready`
- `confirmation_token_issuance_operation_plan_disabled_reason = payload_not_ready`
- `confirmation_token_issuance_operation_plan_precondition_met = true`

## Fixed safety flags

The following must remain false:

- `confirmation_token_created`
- `confirmation_token_exposed`
- `confirmation_token_saved`
- `confirmation_token_plaintext_created`
- `confirmation_token_plaintext_exposed`
- `confirmation_token_hash_created`
- `confirmation_token_hash_saved`
- `confirmation_token_signature_created`
- `confirmation_token_verified`
- `confirmation_token_expiry_created`
- `confirmation_token_expiry_saved`
- `confirmation_record_created`
- `confirmation_record_saved`
- `confirmation_status_saved`
- `audit_write_allowed`
- `payload_send_allowed`
- `runtime_call_allowed`
- `request_body_created`
- `request_body_sent`
- `prompt_sent`
- `response_body_exposed`
- `confirmation_token_issuance_request_operation_created`
- `confirmation_token_issuance_request_body_created`
- `confirmation_token_issuance_request_body_sent`
- `confirmation_token_issuance_operation_created`
- `confirmation_token_issuance_operation_queued`
- `confirmation_token_issuance_operation_executed`
- `confirmation_token_issuance_operation_result_saved`

The following must remain fixed:

- `safe_token_issuance_operation_plan_exposed = true`
- `safe_token_issuance_request_exposed = true`
- `safe_token_issuance_readiness_exposed = true`
- `safe_token_preview_exposed = true`
- `safe_action_readiness_exposed = true`
- `safe_ui_metadata_exposed = true`
- `safe_review_summary_exposed = true`
- `raw_prompt_exposed = false`
- `sanitized_prompt_included = false`
- `business_context_included = false`
- `proposal_body_included = false`
- `restricted_domain_data_included = false`
- `endpoint_value_exposed = false`
- `model_value_exposed = false`
- `credentials_exposed = false`
- `selected_provider = mock`
- `fallback_provider = mock`
- `tokens_used = 0`

## Explicit non-goals

Day59 does not add:

- token issuance
- plaintext token creation
- token digest creation
- token signature creation
- token expiry creation
- confirmation record creation
- audit persistence
- database mutation
- request body creation
- request body send
- prompt send
- runtime execution
- POST route
- Server Action
- Form Action
- confirmation button
- token issuance UI
- production chat send path

## App / Antigravity note

The farming app must remain read-only / mock preview only.

Do not add POST routes, Server Actions, Form Actions, confirmation token issuance UI, confirmation buttons, production chat submission, or database write paths in `/dashboard/hermes`.
