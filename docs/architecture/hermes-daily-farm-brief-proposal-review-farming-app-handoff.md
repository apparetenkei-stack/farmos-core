# Daily Brief Proposal review farming-app handoff

## Purpose

This document is the consumer contract for a farming-application server that
uses the existing FarmOS Core Daily Brief Proposal administrator APIs. It
describes only the contracts implemented and verified through Day129. It does
not approve a production database connection or add a production adapter.

The supported administrator flow is:

```text
list -> detail -> explicit review decision -> detail refetch
```

## Core-owned responsibilities

FarmOS Core owns:

- Proposal persistence and Proposal status;
- safe Proposal reference generation and internal UUID resolution;
- strict list, detail, request, and response validation;
- authenticated administrator authorization;
- the server-owned reviewer identity and UTC review clock;
- pending-only transition and optimistic concurrency validation;
- the atomic five-column Proposal review update and audit append;
- protected, expired, stale, and invalid-transition rejection.

## Farming-app-owned responsibilities

The farming application owns:

- a server-side proxy to FarmOS Core;
- authentication of the current farming-application user;
- an administrator capability check before presenting review controls;
- strict validation of every Core response using an equivalent contract;
- review presentation, note entry, confirmation, and submit locking;
- an explicit detail refetch after a stale response;
- safe user-facing error messages without raw Core or database errors.

The browser must not choose a Core database target, submit a reviewer identity,
or receive Core credentials. A browser-to-Core direct connection is outside
this contract.

## Endpoints

```text
GET  /api/hermes/daily-farm-brief/proposals
GET  /api/hermes/daily-farm-brief/proposals/{proposal_ref}
POST /api/hermes/daily-farm-brief/proposals/{proposal_ref}/review
```

`proposal_ref` is the only public Proposal identifier and has the form
`daily_brief_proposal_<24 lowercase hex>`. Raw Proposal UUIDs are not accepted
as public references.

## Authentication boundary

Every endpoint requires an authenticated Core actor whose resolved actor
context matches the authenticated principal and has:

```text
role = administrator
authorization_verified = true
allowed_scope_keys = []
```

Role, principal, scope, reviewer identity, and authorization flags are not
accepted from the review request body. The farming-app proxy must preserve the
approved server authentication mechanism without exposing credentials to the
browser.

## List contract

The success envelope uses schema version:

```text
hermes.daily_farm_brief.proposal_review_list_api_response.v1
```

Its exact top-level keys are:

```text
schema_version
result = ok
error = null
proposals
safety
```

Each list item exposes exactly:

```text
proposal_ref
proposal_type
proposal_type_label
status
status_label
risk_level
risk_label
title
summary
created_at
expires_at
expiry_state
source_kind
source_kind_label
requires_human_review
proposal_apply_performed
```

The list does not expose `updated_at`. A consumer must fetch detail immediately
before review to obtain the concurrency timestamp.

The exact safety object records:

```text
authentication_enforced = true
administrator_required = true
role_resolution_server_owned = true
database_target_server_owned = true
database_write_performed = false
proposal_insert_performed = false
proposal_update_performed = false
proposal_delete_performed = false
proposal_apply_performed = false
app_database_write_performed = false
audit_database_write_performed = false
raw_identifier_exposed = false
raw_record_exposed = false
principal_ref_exposed = false
credential_exposed = false
public_anonymous_access_allowed = false
retry_performed = false
fail_closed = true
```

An error list response has the same envelope, an empty `proposals` array, and a
fixed error code.

## Detail contract

The success envelope uses schema version:

```text
hermes.daily_farm_brief.proposal_review_detail_api_response.v1
```

Its exact top-level keys are `schema_version`, `result`, `error`, `proposal`,
and `safety`. The safe Proposal exposes:

```text
proposal_ref
proposal_type
proposal_type_label
status
status_label
risk_level
risk_label
title
body
reason
target_display
work_type_label
basis
before
after
created_at
updated_at
expires_at
expiry_state
source_business_date
source_version
source_kind
source_kind_label
requires_human_review
proposal_apply_ready
proposal_apply_performed
```

The review controls may be presented only when `status = pending` and
`expiry_state = active`. `updated_at` supplies the required optimistic
concurrency value. Raw UUID, candidate ID, duplicate signature, idempotency
key, reviewed identity, raw payload/source references, database role, and
connection information are not public fields.

## Review request

The path supplies `proposal_ref`. The request body is an exact-key object:

```json
{
  "decision": "approve | reject | request_revision",
  "review_note": "non-empty review reason",
  "expected_status": "pending",
  "expected_updated_at": "canonical UTC timestamp from detail.updated_at"
}
```

Unknown keys are rejected. The note is normalized and must pass the Core note
policy. The client does not send reviewer, reviewed time, next status, actor,
role, scope, database target, or Apply data.

The decisions map only from pending:

```text
approve          -> approved
reject           -> rejected
request_revision -> needs_revision
```

## Review response

A successful review response has the exact shape:

```json
{
  "ok": true,
  "proposal_ref": "daily_brief_proposal_<24 lowercase hex>",
  "previous_status": "pending",
  "status": "approved | rejected | needs_revision",
  "updated_at": "canonical UTC timestamp"
}
```

The farming application must refetch detail and confirm that its status and
`updated_at` match the successful review response. An error response is exactly
`{"ok": false, "error": "<fixed code>"}`.

## Error handling

List and detail errors:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | Path, query, method contract, or request invalid |
| 400 | `invalid_proposal_reference` | Detail reference is not a safe reference |
| 401 | `authentication_required` | Core authentication is absent or invalid |
| 403 | `access_forbidden` | Actor is not the authorized administrator |
| 404 | `proposal_not_found` | Safe Proposal reference was not found |
| 405 | `method_not_allowed` | Unsupported list/detail service method |
| 503 | `proposal_read_unavailable` | Readiness, repository, row, or projection unavailable |

Review errors:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_request` | Path or exact request contract invalid |
| 401 | `unauthenticated` | Core authentication failed |
| 403 | `forbidden` | Administrator authorization failed |
| 404 | `not_found` | Proposal was not found |
| 409 | `stale` | Expected status or timestamp no longer matches |
| 409 | `invalid_transition` | Proposal is not pending or transition is denied |
| 409 | `expired` | Proposal is expired at the server clock |
| 409 | `protected` | Proposal is a protected fixture |
| 500 | `unavailable` | Read or review repository unavailable |
| 500 | `atomic_write_failed` | Atomic update/audit contract failed |

The review route exports POST only. Unsupported route methods are handled by
the framework route surface; the review service itself normalizes a wrong
method to `invalid_request` rather than defining another review error code.
Consumers must reject unknown status codes, error codes, fields, and response
shapes.

## Caching

List, detail, and review responses set:

```text
Cache-Control: no-store
Content-Type: application/json; charset=utf-8
```

The farming-app proxy must not introduce shared or persistent caching for these
administrator responses.

## Stale handling

On `409 stale`, the farming application must:

1. keep the review decision uncommitted on the client;
2. refetch detail explicitly;
3. show the latest status and timestamp;
4. require another explicit human confirmation before a new submission.

It must not automatically retry or resubmit the note.

## Security invariants

- safe reference only;
- administrator only;
- server-owned reviewer and clock;
- `expected_status = pending` plus `expected_updated_at` compare-and-swap;
- malformed input and output fail closed;
- terminal statuses have no review controls;
- automatic retry is zero;
- Proposal Apply is zero;
- farming-application database writes are zero;
- production database connections are not established by this handoff.

## Non-goals

- Proposal Apply or automatic approval;
- farming-application business database mutation;
- browser-to-Core direct access;
- exposing Core credentials to client code;
- automatic review retry;
- a new repository, readiness boundary, fixture, executor, endpoint, or response
  shape;
- a production PostgreSQL adapter or production deployment approval.

## Integration acceptance criteria

The farming-app integration is acceptable when its server proxy and UI prove:

- strict parsing of list, detail, and review responses;
- authenticated administrator-only access;
- safe references in URLs and JSON;
- pending-and-active-only controls;
- non-empty review note and submit locking;
- exact `expected_updated_at` forwarding from the latest detail;
- stale refetch without automatic resubmission;
- terminal control removal after successful detail refetch;
- no raw identifier, reviewer identity, credential, Apply control, or business
  database write.

This is a contract handoff. Production connectivity remains a separate,
explicitly approved gate.
