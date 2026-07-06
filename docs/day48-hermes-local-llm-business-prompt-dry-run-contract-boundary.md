# Day48 Hermes Local LLM Business Prompt Dry-run Contract Boundary

## Purpose

Day48 adds the Hermes Local LLM Business Prompt Dry-run Contract Boundary.

This is one step after the Day47 fixed non-business prompt smoke test boundary, but Day48 still does not send business prompts to a local LLM.

Day48 only defines the contract, classification, blocking decision, and audit-safe metadata that will be required before any future business prompt execution is enabled.

## Non-goals

Day48 is not a production chat day.

Day48 does not:

- send business prompts to a local LLM
- send user prompts to a local LLM
- send Hermes consultation text to a local LLM
- send proposal text to a local LLM
- send restricted-domain data to a local LLM
- send crop cycle details to a local LLM
- send customer, order, shipping, payment, partner, amount, payroll, personal evaluation, or similar restricted data to a local LLM
- save chat history
- create proposals
- apply proposals
- write to app schema
- write to ai.proposal_inbox
- write to audit proposal apply events
- create request bodies
- send request bodies
- expose response bodies
- expose endpoint values
- expose model values
- expose credentials
- call external APIs
- call local runtime generate or chat endpoints
- execute embeddings
- execute vector search
- write to Qdrant
- write to MinIO
- add POST routes
- add Server Actions
- add Form Actions
- enable production chat submission from the farm app UI

## Boundary

The Day48 boundary returns safe metadata only:

- prompt_contract_mode
- business_prompt_allowed
- user_prompt_allowed
- business_context_allowed
- restricted_domain_data_allowed
- prompt_category
- prompt_risk_level
- prompt_send_decision
- blocked_reason
- matched_policy
- prompt_sent
- request_body_created
- request_body_sent
- business_context_sent_to_model
- restricted_domain_data_exposed
- response_body_exposed
- writes_performed
- fallback_policy

## Classification

Day48 classifies prompt-like input into:

- operational_question
- planning_question
- proposal_related
- restricted_domain
- unknown

Classification does not authorize execution.

Even when classification returns a low or medium risk category, Day48 remains dry-run only and does not send any prompt to a model.

## Restricted-domain policy

Restricted-domain data is blocked.

Restricted terms include, but are not limited to:

- customer
- order
- shipping
- payment
- 取引先
- 顧客
- 注文
- 出荷先
- 支払い
- 金額
- 給与
- 評価
- 個人

When restricted-domain data is detected:

- prompt_send_decision = blocked
- restricted_domain_data_allowed = false
- restricted_domain_data_exposed = false
- business_context_sent_to_model = false
- business_prompt_sent_to_model = false
- request_body_created = false
- request_body_sent = false

## Runtime policy

Day48 does not call a local LLM runtime.

Runtime-related flags remain false:

- runtime_call_allowed = false
- prompt_sent = false
- request_body_created = false
- request_body_sent = false
- local_model_called = false
- local_runtime_generate_http_called = false
- prompt_sent_to_model = false
- user_prompt_sent_to_model = false
- business_context_sent_to_model = false
- business_prompt_sent_to_model = false
- response_body_exposed = false
- tokens_used = 0

## Adapter switch integration

The adapter switch may expose `business_prompt_contract_status` for local provider requests.

However:

- selected_provider remains mock
- fallback_provider remains mock
- provider_execution_mode remains dry_run_only
- adapter_result is not returned for disabled local provider paths
- Day44, Day45, Day46, and Day47 behavior remains compatible

## Relationship to Day47

Day47 fixed non-business prompt smoke remains a separate boundary.

Day48 does not modify Day47 into a business prompt execution path.

Any future business-prompt smoke test must be implemented as a separate boundary after Day48.
