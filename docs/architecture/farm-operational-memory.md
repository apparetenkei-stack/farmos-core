# Farm Operational Memory ADR

Status: Product Owner conditionally approved — Day146-B
Block: Day146-B
Scope: Operational Memory contract only. This ADR does not authorize an API,
migration, RLS change, persistence implementation, or production operation.

## Decision

### Source of truth and ownership

| Concern | Decision |
| --- | --- |
| Business source of truth | Farming app |
| Operational Memory owner | FarmOS Core |
| Projection is business SOT | No |
| Embedding is business SOT | No |
| Hermes owns business data | No |
| Core write to farming-app business data | Prohibited |

FarmOS Core stores derived snapshots and projections for read-only reasoning.
They remain reproducible derivatives. A Proposal, embedding, projection, or
Hermes response cannot establish or modify a farming fact.

### Time semantics

The following fields are independent and must not be substituted for one
another:

| Field | Contract |
| --- | --- |
| `business_date` | Required `YYYY-MM-DD` for an upsert. The date on which the work actually occurred. |
| `recorded_at` | Required ISO-8601 timestamp with an explicit UTC offset for an upsert. The time the farming app recorded the fact. |
| `source_updated_at` | Required ISO-8601 timestamp with an explicit UTC offset. The last source-record change time. |
| `observed_at` | FarmOS Core timestamp recording when Core retrieved the change. |
| `projection_generated_at` | FarmOS Core timestamp recording when a projection version was generated. |

The current nullable `started_at` has unknown timezone semantics. Core must not
derive `business_date` by assuming UTC, Asia/Tokyo, or the host timezone.
Day146-C must make `business_date` explicit in the Stable Read / Change
Contract. Missing or invalid required time is a fail-closed source gap, not an
invitation for AI inference.

### Stable identity

`work_records.id` is carried as an opaque `source_record_id`.
Uniqueness is required by the logical contract, but the database primary-key
status is not asserted here. Day146-C owns verification and must fail the
implementation gate if a stable unique source identity cannot be established.

### Change identity

Every upsert must provide at least one of:

- a source-owned monotonic `source_record_version`; or
- a lowercase SHA-256 `source_content_hash`.

When a version is absent, the hash is required. The hash is calculated by the
farming app or a trusted read adapter over versioned canonical JSON containing
only allowed source fields. Canonicalization fixes key order, null handling,
number representation, and array ordering where order is meaningful.

The hash input excludes retrieval time, `observed_at`, Core metadata,
credentials, Secrets, and unstable display ordering. Equal source ID plus equal
version/hash is idempotent and does not create another snapshot.

When both values exist, the farming app owns the version and the hash protects
canonical content integrity and idempotency. Equal source ID, version, and hash
is a duplicate. Equal source ID and version with a different hash is a
`source_version_hash_conflict`; Core fails closed and updates neither Snapshot
nor Projection. A newer source-owned version is an accepted revision and
supersedes the previous Snapshot.

### Snapshot and projection lifecycle

An accepted change creates an immutable Source Snapshot or reuses the existing
snapshot when its change identity is identical. Daily and scoped projections
refer to snapshot lineage. They do not overwrite the business source.

For an update with the same source ID and a different version/hash:

1. create a new snapshot;
2. retain the previous snapshot;
3. mark affected active projections `superseded`;
4. generate replacement projections as `active`; and
5. update lineage to the new snapshot.

An update must not overwrite the former projection and erase its evidence.

### Late entry

If a record is entered on 2026-07-28 for work performed on 2026-07-27, the
contract carries:

```yaml
business_date: 2026-07-27
recorded_at: 2026-07-28T09:30:00+09:00
source_updated_at: 2026-07-28T09:30:00+09:00
```

Core updates the Source Snapshot, regenerates the 2026-07-27 Daily Projection,
and registers affected Field/Crop Cycle projections for regeneration. It must
not count the work as 2026-07-28 merely because that was the input date.

### Delete and tombstone

A normal source deletion is represented by a tombstone containing
`source_record_id`, explicit `business_date`, `source_updated_at`, and
`deleted_at`, plus a version or hash. Core must not infer the tombstone business
date. The explicit date allows regeneration even when a previous Snapshot is
unavailable. A tombstone removes the record from active retrieval, triggers
that date's projection regeneration, retains deletion lineage, and enters
reconciliation evidence.

Legal or privacy-mandated physical erasure belongs to a separate Retention
Policy. It is not equivalent to an ordinary tombstone and is not authorized by
this ADR.

### Full rebuild

Fact, Projection, and Index stores are disposable derivatives. They must be
rebuildable from retained Source Snapshots or the Stable Read / Change Contract
without changing farming-app data.

A rebuild must:

- support shadow generation while the current active version remains served;
- compare results by projection version before activation;
- preserve lineage and superseded history;
- preserve human-confirmed corrections as an explicit overlay or adjudicated
  source, rather than silently overwriting them; and
- support structured retrieval without a vector index.

## Data and authority boundary

Only explicitly allowed fields enter a Source Snapshot. Free text remains
untrusted data and never becomes an instruction. Worker identity, coordinates,
address, cost, price, customer/supplier data, internal notes, and credentials
are excluded from the MVP contract.

The v1 `safe_payload` is an exact empty object: it has no allowed keys and
rejects additional properties. Adding a verified business field requires a new
contract version.

The read request cannot contain a table, column, SQL, URL, RPC name, credential,
or arbitrary sort expression. Tool chaining and business writes remain
prohibited.

## Consequences

- The current work-record endpoint is insufficient for Operational Memory
  ingestion because it lacks explicit business date, change identity, cursor,
  and tombstones.
- Unknown source semantics stay unknown until Day146-C verifies the farming-app
  implementation.
- Projection persistence and retrieval are deferred to Day146-D and Day146-E.
- Hermes runtime integration and production blocked-error reproduction are
  deferred to Day146-F.

## Day146-C implementation handoff

Day146-C must propose and verify a farming-app-owned Stable Read / Change API
with:

- explicit `business_date`, `recorded_at`, and `source_updated_at`;
- verified stable uniqueness for `work_records.id`;
- source version or canonical-hash input;
- opaque cursor;
- inclusive business-date range of at most 31 calendar days, with
  `from_business_date <= to_business_date`, and bounded limit;
- deterministic total order with a farming-app-owned stable tie-breaker;
- cursor continuation with no duplicated or skipped changes, bound to contract
  version and the same date range;
- `upsert` and `tombstone`;
- exact allowlisted output columns and restricted-data exclusion; and
- explicit RLS and caller contract.

Day146-C must also resolve, from actual farming-app code and schema evidence:

- whether `work_records.id` is primary/unique;
- the actual type and existing meaning of `started_at`;
- RLS for `work_records` and `crop_cycles`;
- how source deletions can be observed; and
- compatibility with existing farming-app writes and UI.

Product Owner approval of this ADR authorizes contract refinement only. It does
not authorize implementation or deployment.
