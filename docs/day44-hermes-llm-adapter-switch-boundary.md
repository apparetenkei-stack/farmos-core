# Day44 Hermes LLM Adapter Switch Boundary Foundation

## Purpose

Day44 adds a Hermes LLM adapter switch boundary.

The goal is to move Hermes from directly calling the Day43 mock adapter to selecting an adapter through a safe switch boundary.

Day44 does not execute a real LLM.

## Provider contract

Day44 recognizes these provider states.

- mock
- local_llm_disabled
- external_llm_disabled

## Allowed in Day44

- mock provider
- deterministic mock response
- provider capability summary
- disabled provider status
- safe setting key names only
- dry-run execution mode only
- read-only aggregate context only

## Not allowed in Day44

- real LLM runtime execution
- external API calls
- local model calls
- local endpoint calls
- SDK integration for external LLM services
- Hermes daemon
- persistent Hermes runtime
- OpenClaw connection
- embeddings generation
- vector DB write
- Qdrant write
- MinIO write
- chat history write
- ai.proposal_inbox write
- proposal apply
- app schema write
- audit apply event write
- crop_cycles update
- work_records update
- inventory update
- POST route
- PUT route
- PATCH route
- DELETE route
- Server Actions
- Form Actions
- restricted-domain data exposure
- credential value exposure
- runtime private config value exposure
- administrator-only unfinalized domain exposure

## Boundary behavior

The switch boundary always runs in dry_run_only mode.

mock is the only executable provider in Day44.

local_llm_disabled and external_llm_disabled are represented as disabled provider states.

Provider aliases such as local_llm or external_llm are normalized into disabled states and blocked by the Day44 boundary.

## Safety guarantees

The boundary must return false for all write, runtime, model, external API, vector, restricted data, and credential exposure flags.

Required false flags:

- writes_performed
- chat_history_write_allowed
- app_schema_write_allowed
- ai_proposal_write_allowed
- audit_apply_event_write_allowed
- proposal_apply_allowed
- hermes_runtime_executed
- llm_runtime_executed
- external_api_called
- local_model_called
- embeddings_executed
- vector_search_executed
- restricted_domain_data_exposed
- credentials_exposed

## Compatibility

Day43 chat input dry-run boundary must keep its existing output shape.

The existing mock_response shape remains compatible.

Internally, Day43 chat input dry-run now calls the Day44 switch boundary.

## Next step

Day45 may add a local LLM runtime health-check boundary.

That future boundary should check reachability and timeout behavior without sending business prompts or restricted data.
