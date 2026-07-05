# Day42 Hermes Proposal Review Loop Minimum Foundation

## Purpose

Day42 adds the minimum review loop contract for Hermes proposal notes.

Day41 allowed Hermes to retrieve a safe read-only memory context.
Day42 turns existing Hermes proposal notes into a human-review queue with allowed and disallowed actions.

This is not autonomous AI execution.
This is not proposal apply.
This is not app data mutation.

## Scope

Day42 creates:

- Hermes proposal review loop read boundary
- Hermes proposal review loop dry-run command boundary
- CLI for displaying the review loop
- CLI for running a dry-run review action
- Safety tests for read boundary and command boundary
- package scripts

## Explicitly not included

Day42 does not include:

- chat input
- chat message send
- chat history persistence
- LLM runtime execution
- Hermes runtime daemon
- OpenClaw execution
- embeddings generation
- vector database write
- Qdrant write
- MinIO write
- proposal apply
- app schema write
- audit proposal review apply event write
- crop cycle update
- work record update
- inventory update
- POST / PUT / PATCH / DELETE route
- Server Action
- form action
- restricted domain exposure

## Protected data policy

The review loop may expose only redacted, minimum proposal review information.

Allowed:

- `ai.proposal_inbox` rows with `proposal_type = 'hermes_apply_blocker_explanation'`
- Hermes note id
- proposal type
- status
- title
- reason
- created_at
- updated_at
- allowed and disallowed review actions
- read-only aggregate safety counts

Forbidden:

- order data
- shipping allocation
- customer data
- payment data
- amount / price data
- sensitive labor information
- personal evaluation
- salary
- credentials
- runtime private config
- service role
- DB secret values
- admin-permission-undesigned information

## Review states

Day42 maps Hermes notes into the following review states:

- `pending_human_review`
- `already_reviewed`
- `not_reviewable`

## Allowed human actions

Dry-run actions allowed by Day42:

- `keep_pending`
- `request_more_context`
- `mark_reviewed`
- `dismiss_without_apply`

These actions do not write to the database in Day42.

## Disallowed actions

Day42 blocks:

- `approve`
- `apply`
- `auto_apply`
- `create_proposal`
- `run_llm`
- `run_hermes`
- `run_openclaw`
- `read_restricted_domain`
- `write_app_schema`

## Boundary guarantees

Read boundary:

- read-only transaction
- no writes
- no command execution
- no app schema write
- no audit apply event write
- no proposal apply
- no Hermes runtime execution
- no LLM runtime execution
- no embeddings execution
- no vector search execution
- restricted domain data exposed = false

Command boundary:

- dry-run by default
- no persistent write
- target limited to `hermes_apply_blocker_explanation`
- protected proposal is blocked
- no app schema write
- no audit apply event write
- no proposal apply
- no Hermes runtime execution
- no LLM runtime execution

## Protected proposal

The protected proposal must never be modified by Day42:

`24fc24ee-8efa-436b-8424-9703edeeb297`

Expected protected state:

- status remains `pending`
- `applied_at` remains unchanged
- `applied_by` remains unchanged

## Day43 direction

Day43 may connect this review loop to a chat input or LLM adapter.
The first adapter should still be dry-run, mock, or local-only.
It must not connect to app schema writes or proposal apply.
