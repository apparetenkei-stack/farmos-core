# Day41 Hermes Memory / Context Retrieval Minimum Foundation

## Purpose

Day41 adds the minimum read-only context retrieval foundation for Hermes.

This is called "memory" only in the sense of a safe context pack.
Day41 does not save long-term memory and does not write chat history.

## Scope

Day41 creates a read-only context pack that Hermes can use later for:

- proposal review context
- latest Hermes notes
- safe crop cycle summaries
- memory policy
- redaction policy
- boundary safety flags

Day41 fixes the contract for safe context retrieval before chat input, LLM runtime, embeddings, vector search, or proposal automation are added.

## Explicit non-goals

Day41 does not implement:

- chat input
- chat message persistence
- LLM response generation
- Hermes daemon/runtime execution
- OpenClaw integration
- embeddings
- vector DB writes
- proposal auto creation
- proposal apply
- app schema writes
- audit apply event writes
- Server Actions
- form actions
- POST / PUT / PATCH / DELETE routes

## Restricted domains

The Day41 context pack must not expose restricted operational domains.

Excluded domains:

- order and ordering data
- shipping allocation
- customer or buyer details
- money and price details
- labor-sensitive information
- personal evaluation
- payroll
- runtime private configuration
- .env values
- service role material
- DB authentication values
- administrator-only information whose access rules are not designed yet

## Allowed context

Allowed context is limited to low-risk read-only information:

- Day38 proposal review context summary
- proposal status
- readiness / preview summary
- apply history summary count
- latest Hermes blocker explanation notes after redaction
- app.crop_cycles minimum summary
- crop names, cycle labels, field IDs, status-like fields already suitable for ordinary app display
- visible domain scope
- boundary flags

## Boundary requirements

The Day41 boundary must guarantee:

- database transaction is read-only
- writes_performed = false
- commands_executed = false
- hermes_runtime_executed = false
- llm_runtime_executed = false
- embeddings_executed = false
- vector_search_executed = false
- app_schema_write_allowed = false
- ai_proposal_write_allowed = false
- audit_apply_event_write_allowed = false
- restricted_domain_data_exposed = false

## Current meaning of memory

Day41 memory means:

> a read-only, redacted, policy-bound context pack for Hermes.

It does not mean durable memory storage.
It does not mean vector retrieval.
It does not mean chat history.

## Path to next days

Day42 can connect this read-only context pack to the Hermes proposal review loop.

Day43 or later can add app-side chat input and an LLM runtime adapter after the safety boundary is fixed.
