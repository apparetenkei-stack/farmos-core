# Day43 Hermes Chat Input and LLM Adapter Dry-run Foundation

## Purpose

Day43 adds the minimum dry-run contract for Hermes chat input and the mock LLM adapter boundary.

This is not a real AI chat runtime yet. It accepts a user message, normalizes the request, classifies the intent, reads only safe aggregate context, and returns a deterministic mock response.

## Scope

Day43 implements:

- Hermes chat input dry-run boundary
- deterministic mock LLM adapter boundary
- read-only aggregate safety context
- request validation
- blocked request detection
- redaction policy snapshot
- safety tests that prove no protected state changes

Day43 does not implement:

- real LLM runtime
- external API call
- local model call
- Hermes daemon
- OpenClaw connection
- embeddings
- vector DB write
- chat history persistence
- ai.proposal_inbox write
- proposal apply
- app schema write
- audit apply event write
- POST route
- Server Action
- form action

## Safety policy

The boundary must not expose restricted-domain data.

Restricted domains include:

- orders and order allocation
- shipping allocation
- customer and partner data
- prices and money-sensitive data
- labor-sensitive data
- personal evaluation
- payroll
- private runtime configuration
- credentials or actual environment values
- administrator-only domains whose permission model is not finalized

## Runtime policy

The mock adapter is deterministic.

Required runtime flags:

- provider = mock
- model = deterministic_day43_mock
- llm_runtime_executed = false
- external_api_called = false
- local_model_called = false
- tokens_used = 0
- writes_performed = false
- chat_history_write_allowed = false
- ai_proposal_write_allowed = false
- proposal_apply_allowed = false
- restricted_domain_data_exposed = false

## Read-only context

Day43 reads only safe aggregate state:

- proposal_count
- hermes_note_count
- pending_hermes_note_count
- apply_history_count
- protected proposal status
- crop_cycle_2 existence

The protected proposal is:

- 24fc24ee-8efa-436b-8424-9703edeeb297

It must remain pending.

## Day44 direction

Day44 may add a local LLM adapter or runtime adapter switch boundary.

Even then, app schema write, proposal apply, chat persistence, and OpenClaw connection must remain separated until their own safety boundary exists.
