# Hermes Daily Farm Brief Production Contract

## Business value

Day106 turns normalized read-only farm context into a deterministic daily snapshot and a human-review brief. It does not fetch, write, notify, call a model, or infer operational thresholds.

## Contracts and ownership

The server-owned `hermes.daily_farm_brief.policy.v1` fixes freshness thresholds, per-source array limits, the ten-fact publication limit, severity order, and safety flags. Inventory and Work Log are required sources. Field, Crop Cycle, and Hermes Note are optional sources. Client policy and limit overrides are forbidden. The adapter creates `hermes.daily_farm_snapshot.v1`; the builder creates `hermes.daily_farm_brief.fact.v1` and `hermes.daily_farm_brief.v1`. IDs and generation time are server owned; factories and timestamps are injectable only at the internal test boundary.

## Sources and state

Inventory and Work Log consume the existing Day92 normalized contracts without changing their API fields. Source status is limited to `available`, `empty`, `unavailable`, or `invalid`; freshness is independently `fresh`, `stale`, or `unknown`. A connected source with zero records is `empty`, not invalid. Inventory and Work Log use 24-hour freshness, while Field, Crop Cycle, and Hermes Note use seven days. Freshness uses `age < threshold`; equality is stale. A future or malformed timestamp makes the source `invalid` and the snapshot fails closed. Crop Cycle and Hermes Note retain `generated_at=null` and `freshness=unknown` when no canonical source timestamp exists. Because they are optional, that unknown timestamp is disclosed as a limitation but does not by itself prevent `ready`. The absent independent Field source is explicitly optional and `unavailable`; no fictional adapter is created.

## Facts and limitations

Inventory facts report only explicit zero, null quantity, and null unit observations. They do not claim shortage or purchase necessity because no threshold exists. Work Logs with missing or invalid `startedAt` create warning facts. Facts use fixed severity ordering and carry snapshot/source/record provenance. Missing source IDs remain `null`; the adapter never fabricates an ID. Per-source record limits are Inventory 20, Work Log 10, Field 20, Crop Cycle 20, and Hermes Note 10. At most ten facts are published, with deterministic ordering and truncation.

## Status

`ready` requires both required sources to be safely `available` or `empty` and fresh. Optional-source unavailability or unknown freshness remains visible in limitations without forcing `partial`. `partial` means at least one required source is stale, unknown, or unavailable while another required source remains usable. `unavailable` means no required source is usable or any source makes the snapshot unsafe, including invalid future metadata.

## Safety and rollback

Strict runtime parsers reject unknown structures, oversized arrays, invalid timestamps, modified safety flags, fact contract mismatches, duplicate fact IDs, non-deterministic fact order, and inconsistent brief status. No DB, Redis, HTTP, LLM, Proposal, Audit, Queue, Worker, API, or UI integration exists. Rollback removes `scripts/hermes/brief_runtime/`, the preview runner, the Day106 documentation and package scripts, then restores the previous Day90-only boundary test.
