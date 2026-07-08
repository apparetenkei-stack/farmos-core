# Day69 Hermes API Chat Minimal Boundary

Day69 adds the minimal Hermes API chat boundary.

Route:
- POST /api/hermes/chat
- implementation: src/app/api/hermes/chat/route.ts

Scope:
- API contract only
- no UI connection
- no Server Action
- no Form Action
- no production chat

Enable flag:
- HERMES_API_CHAT_MINIMAL_BOUNDARY_ENABLED=false by default

When the flag is false:
- request JSON may be parsed
- request body may be validated
- runtime is not called
- DB read is not performed
- status is blocked

Allowed request fields:
- message
- includeReadonlyContext
- provider

Request rules:
- message must be string, non-empty, single-line, and max 500 chars
- includeReadonlyContext must be boolean
- provider must be mock or ollama

Forbidden request fields:
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

Response envelope additions:
- api_boundary=hermes_api_chat_minimal_boundary
- api_boundary_enabled
- api_route_added=true
- ui_connected=false
- server_action_used=false
- form_action_used=false
- request_body_received
- request_body_valid
- request_json_parse_error
- response_envelope_normalized=true
- production_chat_enabled=false

No-write guarantees:
- db_write_performed=false
- proposal_created=false
- proposal_saved=false
- proposal_apply_performed=false
- chat_history_saved=false
- audit_record_saved=false
- app_db_write_performed=false

Validated modes:
- route disabled
- runtime disabled
- mock provider
- actual Ollama API smoke
- includeReadonlyContext=false
- invalid JSON
- invalid message
- forbidden body fields
- unsupported provider
- Day68 to Day65 regression units
- Next.js build

Day70 handoff:
- UI connection is still forbidden at the end of Day69.
- Day70 may evaluate connecting the UI to this API boundary.
