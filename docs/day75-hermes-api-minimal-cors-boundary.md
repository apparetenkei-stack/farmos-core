# Day75 Hermes API Minimal CORS Boundary

## Theme

Hermes API Minimal CORS Boundary

## Purpose

Day75 adds a minimal CORS boundary to the existing FarmOS Core `/api/hermes/chat` route so the main PC farming app browser UI can fetch the blocked envelope directly.

This day does not start production AI chat.

## Background

Day74 fixed the Node.js external inbound response path by allowing the Homebrew Node binary in macOS Application Firewall.

After that, Windows curl could receive the Core Hermes blocked envelope over both Tailscale and LAN.

However, the browser UI still failed with `Failed to fetch` because the API response did not include CORS headers.

OPTIONS preflight returned `204 No Content` with `allow: OPTIONS, POST`, but without `Access-Control-Allow-*` headers.

## Scope

- Modified only the existing `/api/hermes/chat` route.
- Added no new API route.
- Added no proxy route.
- Added no Server Action.
- Added no Form Action.
- Added no tunnel.
- Kept request body limited to `message`, `includeReadonlyContext`, and `provider`.

## CORS Boundary

The route now returns minimal development CORS headers:

- `Access-Control-Allow-Origin: http://localhost:3000`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: content-type`
- `Vary: Origin`

The route now also exports an `OPTIONS` handler that returns `204 No Content` with the same CORS headers.

POST responses use the same CORS headers while preserving the existing blocked envelope behavior.

## Verified Results

CORS preflight from the main PC to the Mac mini Core API returned:

- `HTTP/1.1 204 No Content`
- `access-control-allow-origin: http://localhost:3000`
- `access-control-allow-methods: POST, OPTIONS`
- `access-control-allow-headers: content-type`

POST with browser Origin returned:

- `HTTP/1.1 200 OK`
- `status: blocked`
- `provider: mock`
- `api_boundary_enabled: false`
- `production_chat_enabled: false`
- `prompt_sent: false`
- `db_read_performed: false`
- `db_write_performed: false`
- `proposal_created: false`
- `proposal_saved: false`
- `proposal_apply_performed: false`
- `chat_history_saved: false`
- `audit_record_saved: false`
- `app_db_write_performed: false`
- `response_envelope_normalized: true`

The farming app `/dashboard/hermes` browser UI successfully displayed the real Core blocked envelope.

The previous local fallback debug message was not displayed.

## Safety Confirmation

- actual Ollama UI chat was not started.
- provider remained `mock`.
- includeReadonlyContext remained `false`.
- No DB write was performed.
- No proposal was created.
- No proposal was saved.
- No proposal apply was performed.
- No audit record was saved.
- No chat history was saved.
- No credentials were exposed.
- No baseUrl/model/timeoutMs/credential fields were accepted in the request body.

## Result

Day75 result: completed.

The browser fetch boundary from the main PC farming app to Mac mini FarmOS Core is now open only for the minimal blocked-state Hermes API path.
