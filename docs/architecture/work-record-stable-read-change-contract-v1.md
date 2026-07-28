# Work Record Stable Read / Change Contract v1

Status: Product Owner conditionally approved — Day146-B
Contract ID: `farming_app.work_records.stable_changes.v1`

This contract is a Day146-C implementation candidate. It defines a fixed,
read-only change feed; it is not a currently available farming-app API.

## Request

The allowed exact keys are:

```yaml
allowed_exact_keys:
  - contract_version
  - from_business_date
  - to_business_date
  - cursor
  - limit
required_keys:
  - contract_version
  - from_business_date
  - to_business_date
optional_keys:
  - cursor
  - limit
```

`allowed_exact_keys` is the complete key allowlist; unknown keys are rejected.
`cursor` and `limit` are not required request keys.

`from_business_date` and `to_business_date` are required and inclusive,
`from_business_date` must be less than or equal to `to_business_date`, and the
range may span at most 31 calendar days. An invalid or longer range is rejected
without clamping.
`limit` defaults to 100 and is restricted to 1–100 without clamping.
The cursor is source-issued, opaque, scoped to the same date range and contract
version, and cannot encode caller-controlled SQL or relation selection.

Unknown keys are rejected. Table, column, relation, SQL, URL, path, RPC,
headers, token, arbitrary filter, arbitrary sort, and credentials are not
accepted.

## Response

```yaml
contract_version: farming_app.work_records.stable_changes.v1
result: ok | error
next_cursor: opaque string or null
has_more: boolean
changes:
  - operation: upsert | tombstone
    source_record_id: opaque string
    source_record_version: non-negative integer or null
    source_content_hash: lowercase SHA-256 or null
    business_date: YYYY-MM-DD or null
    recorded_at: ISO-8601 timestamp with offset or null
    source_updated_at: ISO-8601 timestamp with offset
    deleted_at: ISO-8601 timestamp with offset or null
    field_reference: opaque string or null
    crop_cycle_reference: opaque string or null
    work_type_reference: opaque string or null
    safe_payload: object
```

The response returns at most the requested limit. Ordering is deterministic:
`source_updated_at ASC`, then `source_record_id ASC`. If multiple revisions for
one ID can share those values, Day146-C must implement and verify a
farming-app-owned stable revision tie-breaker from the real schema. The complete
order must be a deterministic total order; this contract does not infer an
unverified database key.

## Exact change invariants

For every change:

- `source_record_id` is non-empty and opaque;
- `source_updated_at` has an explicit offset;
- either `source_record_version` or `source_content_hash` is present;
- a hash, when present, is a 64-character lowercase hexadecimal SHA-256;
- unknown control or authority fields are rejected; and
- source strings are untrusted data.

For `upsert`:

- `business_date` and `recorded_at` are required;
- `deleted_at` is null;
- Core never derives a missing business date from a timestamp;
- `field_reference`, `crop_cycle_reference`, and `work_type_reference` remain
  optional until Day146-C verifies their source availability; and
- `safe_payload` is required and equals `{}`.

The v1 MVP `safe_payload` is an exact empty object:

```yaml
type: object
exact_keys: []
additional_properties: false
```

Free text, worker identity, machine identity, materials, quantity, unit, yield,
coordinates, cost, price, supplier, customer, internal notes, and credentials
are excluded. Adding a verified business field requires a contract-version
change.

For `tombstone`:

- `source_record_id`, `business_date`, `source_updated_at`, and `deleted_at`
  are required, together with a version or hash;
- Core never derives the tombstone business date;
- `recorded_at` may be null;
- `safe_payload` is `{}`;
- field, crop-cycle, and work-type references are optional only when the source
  can retain them safely;
- the tombstone is retained for lineage and reconciliation; and
- normal tombstone processing does not authorize physical erasure.

## Version and hash

`source_record_version` is optional. When absent,
`source_content_hash` is mandatory. Hash input is versioned canonical JSON of
the exact allowed source fields, including their semantic values and operation.
It excludes:

- `observed_at` and retrieval time;
- projection or Core-generated metadata;
- credentials and Secrets; and
- non-semantic or unstable display ordering.

The idempotency key is:

```text
source_record_id + source_record_version
```

when a version exists, otherwise:

```text
source_record_id + source_content_hash
```

Re-reading the same key creates no duplicate snapshot.

When both version and hash exist:

| Condition | Result |
| --- | --- |
| Same source ID, same version, same hash | `duplicate_change_ignored` |
| Same source ID, same version, different hash | `source_version_hash_conflict`; fail closed |
| Same source ID, newer version | `accepted_revision`; previous Snapshot is superseded |
| Version absent | Hash is required |

The farming app owns `source_record_version`; the hash protects canonical
content integrity and idempotency. A `source_version_hash_conflict` writes no
Snapshot and generates or updates no Projection.

## Cursor and change detection

The cursor is an opaque continuation token owned by the farming app. It must
represent a stable position in the deterministic ordered change stream and
must remain bound to the request range and contract version. Core does not
construct or inspect it.

For the same contract version and inclusive date range, continuation must be
stable and guarantee a deterministic total order with no duplicated or skipped
changes across pages. Day146-C implements and verifies the stable tie-breaker
against the actual farming-app schema.

An expired, malformed, cross-range, or cross-version cursor fails closed.
`has_more: true` requires a non-null `next_cursor`; `has_more: false` requires
`next_cursor: null`.

## Error behavior

Errors return no partial changes. Safe categories are:

- `authentication_required`
- `permission_denied`
- `invalid_request`
- `cursor_invalid`
- `source_unavailable`
- `source_contract_invalid`
- `unexpected_error`

User-facing errors contain no stack, URL, relation name, credential name, or
source response body.

## Consumer actions

| Input | Snapshot action | Projection action |
| --- | --- | --- |
| Equal ID and equal version/hash | Reuse; no duplicate | None |
| New ID | Create active snapshot | Generate affected projections |
| Changed version/hash | Create new; retain old | Supersede old, generate active replacement |
| Late entry | Create/update snapshot | Regenerate the declared past business date |
| Tombstone | Retain deletion snapshot | Exclude from active results and regenerate |
| Same version, different hash | Reject; no write | None |
| Missing required business time | Reject | No projection and no AI inference |

All actions are internal read-model maintenance. None writes farming-app
business data or creates, approves, or applies a Proposal.
