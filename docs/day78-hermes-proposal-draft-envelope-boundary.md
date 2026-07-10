# Day78 Hermes Proposal Draft Envelope Boundary

## Theme

Hermes Proposal Draft Envelope Boundary

## Purpose

Day78 defines a proposal draft candidate envelope before any proposal persistence.

This day does not save proposals, does not write to app schema, does not write audit records, does not apply proposals, and does not enable production AI chat.

## Scope

- Target route: /api/hermes/chat
- Existing request body remains limited to message, includeReadonlyContext, provider
- provider mock can produce a draft preview candidate when API boundary is enabled
- provider ollama does not produce a proposal draft candidate in this boundary
- proposalBody remains forbidden in request body
- systemPrompt remains forbidden in request body
- No new API route was added
- No DB write path was added
- No audit write path was added
- No proposal apply path was added

## Design decision

Day78 keeps proposal_created=false.

Reason:

- The draft candidate is not inserted into ai.proposal_inbox
- The draft candidate is not a persisted business proposal
- Human review has not started
- app schema is not modified
- audit schema is not modified

A separate non-persistent preview flag was introduced instead.

## Added envelope fields

- proposal_draft_candidate_enabled
- proposal_draft_created
- proposal_draft_saved
- proposal_draft_persisted
- proposal_draft_apply_ready
- proposal_draft_candidate

## Draft candidate contract

The draft candidate is a preview-only mock object.

Expected fields:

- id: dry_run_day78_proposal_draft_candidate
- status: draft_preview_only
- proposal_type: hermes_chat_draft_preview
- source: mock
- title: Hermes draft proposal preview
- summary: generated from the validated message
- persistence: not_saved
- requires_human_review: true
- created_from_message: true

## Disabled boundary behavior

When HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED=false:

- status: blocked
- proposal_draft_candidate_enabled: false
- proposal_draft_created: false
- proposal_draft_saved: false
- proposal_draft_persisted: false
- proposal_draft_apply_ready: false
- proposal_draft_candidate: null
- proposal_created: false
- proposal_saved: false
- proposal_apply_performed: false

## Enabled mock behavior

When HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED=true and provider=mock:

- proposal_draft_candidate_enabled: true
- proposal_draft_created: true
- proposal_draft_saved: false
- proposal_draft_persisted: false
- proposal_draft_apply_ready: false
- proposal_draft_candidate is returned
- proposal_created: false
- proposal_saved: false
- proposal_apply_performed: false

## Ollama behavior

provider=ollama does not create a proposal draft candidate in Day78.

This keeps actual Ollama proposal generation out of scope.

## Request body guard

Allowed request body fields remain:

- message
- includeReadonlyContext
- provider

Forbidden fields remain:

- baseUrl
- model
- timeoutMs
- credentials
- apiKey
- token
- dbConnection
- connectionString
- systemPrompt
- proposalBody

## Tests

Added script:

- test-hermes-api-chat-proposal-draft-boundary

Added check script:

- check-hermes-api-chat-proposal-draft-boundary

The Day78 check intentionally uses test-hermes-api-chat-minimal-boundary instead of check-hermes-api-chat-minimal-boundary.

Reason:

- check-hermes-api-chat-minimal-boundary includes environment-dependent smoke runs
- those smoke runs can attempt readonly DB context reads
- Day78 proposal draft envelope should be validated as a deterministic unit boundary

Confirmed test result:

- disabled boundary has no draft
- mock enabled mode creates draft candidate
- ollama mode does not create draft candidate
- proposalBody is rejected
- systemPrompt is rejected
- no-write flags remain false

## Prohibited actions confirmed

- production chat: not enabled
- actual Ollama proposal generation: not enabled
- proposal insert: not performed
- proposal save: not performed
- proposal apply: not performed
- app DB write: not performed
- audit write: not performed
- chat history save: not performed
- confirmation token: not created
- new API route: not added
- Server Action: not added
- Form Action: not added

## Day79 next theme

Day79 should expose the Day78 proposal draft candidate through the Hermes UI as a read-only preview.

Day79 must still avoid proposal persistence, app DB writes, audit writes, proposal apply, confirmation token issuance, and actual Ollama proposal generation.
