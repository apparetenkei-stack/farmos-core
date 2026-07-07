# Day54 Hermes Business Prompt Confirmation Review UI Metadata Boundary

## Purpose

Day54 adds a read-only dry-run UI metadata boundary for Hermes business prompt confirmation review.

This boundary converts the Day53 confirmation review read summary into UI-safe display metadata for future `/dashboard/hermes` rendering.

It does not create confirmation tokens, save confirmation records, send prompts, call any LLM runtime, create proposals, apply proposals, or write to the database.

## Boundary

- mode: `hermes_business_prompt_confirmation_review_ui_metadata_boundary`
- runtime: `local_llm`
- ui_metadata_mode: `dry_run_confirmation_review_ui_metadata_only`
- configured_provider: `business_prompt_confirmation_review_ui_metadata`
- source_schema_version: `hermes.business_prompt_confirmation_review.v0`
- schema_version: `hermes.business_prompt_confirmation_review_ui_metadata.v0`

## Status mapping

| review_status | ui_status | ui_severity | ui_badge_label | ui_disabled_reason |
| --- | --- | --- | --- | --- |
| `needs_human_review` | `review_required` | `warning` | `確認が必要` | `confirmation_not_enabled_by_day54` |
| `blocked_by_policy` | `blocked` | `danger` | `送信不可` | `blocked_by_policy` |
| `not_ready` | `not_ready` | `neutral` | `未準備` | `payload_not_ready` |

## Explicitly allowed

- read-only dry-run
- safe UI metadata only
- Day53 review summary reference by safe status fields
- display label / badge / severity / disabled reason generation
- adapter switch dry-run provider alias
- tests
- docs
- package scripts

## Explicitly prohibited

- POST route
- Server Action
- Form Action
- confirmation token creation
- confirmation token persistence
- confirmation record creation
- confirmation record persistence
- confirmation status persistence
- chat history persistence
- request body creation
- LLM runtime generate/chat call
- user prompt sending
- business context sending
- raw prompt display
- sanitized prompt display
- proposal body display
- restricted domain data display
- endpoint value display
- model value display
- credentials display
- proposal creation
- proposal apply
- DB write
- production send UI
- send button
- confirmation button
- confirmation save path

## Acceptance

The boundary is accepted when:

- UI metadata is derived from `review_status`
- UI action is unavailable
- UI action label is `none`
- safe UI metadata is exposed
- raw prompt and business context are not exposed
- request body is not created
- prompt is not sent
- runtime call is not allowed
- tokens used is `0`
- adapter switch exposes the dry-run provider aliases
- build passes
