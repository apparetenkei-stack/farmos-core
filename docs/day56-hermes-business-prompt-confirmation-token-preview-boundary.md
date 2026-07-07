# Day56 Hermes Business Prompt Confirmation Token Preview Boundary

## Scope

Day56 adds a dry-run only boundary for Hermes business prompt confirmation token preview metadata.

This boundary depends on the Day55 `business_prompt_confirmation_action_readiness` contract and converts safe action-readiness metadata into safe token-preview metadata.

Day56 does not create, expose, save, hash, sign, verify, or persist any confirmation token.

## Boundary

- `mode = hermes_business_prompt_confirmation_token_preview_boundary`
- `runtime = local_llm`
- `confirmation_token_preview_mode = dry_run_confirmation_token_preview_only`
- `configured_provider = business_prompt_confirmation_token_preview`
- `schema_version = hermes.business_prompt_confirmation_token_preview.v0`
- `source_schema_version = hermes.business_prompt_confirmation_action_readiness.v0`

## Allowed

- read-only dry-run
- safe token preview metadata only
- reference Day55 action readiness metadata
- map `confirmation_action_status` to token preview metadata
- expose safe disabled reasons
- expose safe issuance precondition metadata
- add dry-run only provider aliases
- add tests and package scripts

## Forbidden

- POST route
- Server Action
- Form Action
- confirmation token creation
- confirmation token exposure
- confirmation token persistence
- confirmation token hash creation
- confirmation token hash persistence
- confirmation token signature creation
- confirmation token verification
- confirmation token expiry persistence
- confirmation record creation
- confirmation record persistence
- confirmation status persistence
- audit writes
- chat history writes
- request body creation
- request body sending
- LLM runtime generate/chat calls
- user prompt sending
- business context sending
- raw prompt exposure
- sanitized prompt exposure
- proposal body exposure
- restricted domain data exposure
- endpoint/model/credential exposure
- proposal generation
- proposal apply
- DB writes
- production send UI
- confirmation button
- token preview operation route

## Mapping

### `confirmation_action_status = disabled_pending_implementation`

- `confirmation_token_preview_status = preview_only_pending_implementation`
- `confirmation_token_preview_available = false`
- `confirmation_token_preview_disabled_reason = token_preview_not_enabled_by_day56`
- `confirmation_token_issuance_status = disabled_pending_preview`
- `confirmation_token_issuance_allowed = false`
- `confirmation_token_issuance_disabled_reason = token_issuance_not_enabled_by_day56`
- `confirmation_token_required_precondition_met = true`
- `confirmation_action_precondition_met = false`

### `confirmation_action_status = blocked_by_policy`

- `confirmation_token_preview_status = blocked_by_policy`
- `confirmation_token_preview_available = false`
- `confirmation_token_preview_disabled_reason = blocked_by_policy`
- `confirmation_token_issuance_status = blocked_by_policy`
- `confirmation_token_issuance_allowed = false`
- `confirmation_token_issuance_disabled_reason = blocked_by_policy`
- `confirmation_token_required_precondition_met = false`
- `confirmation_action_precondition_met = false`

### `confirmation_action_status = payload_not_ready`

- `confirmation_token_preview_status = payload_not_ready`
- `confirmation_token_preview_available = false`
- `confirmation_token_preview_disabled_reason = payload_not_ready`
- `confirmation_token_issuance_status = payload_not_ready`
- `confirmation_token_issuance_allowed = false`
- `confirmation_token_issuance_disabled_reason = payload_not_ready`
- `confirmation_token_required_precondition_met = true`
- `confirmation_action_precondition_met = false`

## Fixed safe values

- `confirmation_token_preview_available = false`
- `confirmation_token_issuance_allowed = false`
- `confirmation_token_created = false`
- `confirmation_token_exposed = false`
- `confirmation_token_saved = false`
- `confirmation_token_hash_created = false`
- `confirmation_token_hash_saved = false`
- `confirmation_token_signature_created = false`
- `confirmation_token_verified = false`
- `confirmation_token_expiry_saved = false`
- `confirmation_record_created = false`
- `confirmation_record_saved = false`
- `confirmation_status_saved = false`
- `audit_write_allowed = false`
- `payload_send_allowed = false`
- `runtime_call_allowed = false`
- `request_body_created = false`
- `request_body_sent = false`
- `prompt_sent = false`
- `tokens_used = 0`

## Antigravity note

The farming app `/dashboard/hermes` must remain read-only / mock preview.

Do not add:

- POST route
- Server Action
- Form Action
- send button
- confirmation button
- confirmation save flow
- token preview operation flow
- token generation
- token persistence
- token display
- token hash generation
- confirmation record persistence
- confirmation status persistence
- LLM send
- chat history persistence
- proposal generation
- proposal apply
- DB writes
