# Day53 Hermes Business Prompt Confirmation Review Read Boundary

Day53 adds a read-only confirmation review summary boundary for Hermes business prompt candidates.

This boundary depends on the Day52 `business_prompt_human_confirmation_status` and reshapes it into safe review metadata that can later be displayed in UI.

## Scope

Allowed:

- read-only dry-run
- safe review metadata only
- confirmation_required / human_confirmed / confirmation_state / confirmation_result summary
- upstream payload schema / policy gate / human confirmation status reference
- adapter switch dry-run only provider alias
- tests
- docs
- package scripts

Forbidden:

- POST route
- Server Action
- Form Action
- confirmation token generation
- confirmation token persistence
- confirmation record persistence
- chat history persistence
- request body creation
- LLM runtime generate/chat call
- user prompt send
- business context send
- proposal generation
- proposal apply
- DB writes
- production send UI in the farm app

## Boundary contract

The review read boundary exposes only safe metadata:

- `mode = hermes_business_prompt_confirmation_review_read_boundary`
- `runtime = local_llm`
- `review_mode = dry_run_confirmation_review_read_only`
- `configured_provider = business_prompt_confirmation_review_read | local_llm_business_prompt_confirmation_review_read`
- `upstream_confirmation_mode = dry_run_human_confirmation_only`
- `upstream_payload_schema_mode = dry_run_payload_schema_only`
- `upstream_policy_gate_mode = dry_run_policy_gate_only`
- `schema_version = hermes.business_prompt_confirmation_review.v0`
- `confirmation_required = true`
- `human_confirmed = false`
- `confirmation_state = required | blocked | not_configured`
- `confirmation_result = not_confirmed | blocked | not_configured`
- `review_status = needs_human_review | blocked_by_policy | not_ready`
- `review_action_available = false`
- `review_action_label = none`
- `safe_review_summary_exposed = true`

The boundary must not expose:

- raw prompt
- sanitized prompt
- business context
- proposal body
- restricted domain data
- endpoint value
- model value
- credentials
- confirmation token
- response body

## Status mapping

| Upstream confirmation_state | Upstream confirmation_result | Day53 review_status |
|---|---|---|
| `required` | `not_confirmed` | `needs_human_review` |
| `blocked` | `blocked` | `blocked_by_policy` |
| `not_configured` | `not_configured` | `not_ready` |

## Provider aliases

Day53 adds dry-run only provider aliases:

- `business_prompt_confirmation_review_read`
- `local_llm_business_prompt_confirmation_review_read`

These aliases remain blocked by the adapter switch and must resolve to mock only.

## Antigravity note

`/dashboard/hermes` must remain read-only / mock preview.

The farm app must not add POST routes, Server Actions, Form Actions, send buttons, confirmation persistence, confirmation token persistence, LLM calls, chat history writes, proposal generation, proposal apply, or DB writes.
