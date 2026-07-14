# Hermes Daily Farm Brief Real Data Integration Boundary

## Business value and data path

Day107 connects the existing Operational Read-only Client and Hermes Memory Context reader to the Day106 snapshot adapter and deterministic brief builder. It reuses both readers and does not duplicate their HTTP or database read logic. The resulting path is Operational Read-only result plus Memory Context result, Day107 input normalization, Day106 canonical snapshot, Day106 brief, and a count-only safe preview.

## Required and optional sources

Inventory and Work Log remain required. Field, Crop Cycle, and Hermes Note remain optional. A connected Inventory source with zero records is `empty`, not failed. One usable required source plus a stale or unavailable required source produces `partial`; no usable required source produces `unavailable`. Optional source failure does not prevent `ready`. Invalid source safety metadata remains fail-closed.

## Time and timezone

The integration owns `generated_at` and requires a valid server-owned IANA timezone. Unit and preview fixtures use `Asia/Tokyo`; the implementation does not silently assume UTC. Memory Context exposes no canonical Crop Cycle or Hermes Note source timestamp, so the integration preserves `generated_at=null` and `freshness=unknown`. It never substitutes brief generation time. There is no explicit planned-work source, so the limitation `today_work_candidate_source_unavailable` is always disclosed. Day107 does not infer today's work from recent logs and does not classify yesterday without an explicit timezone-aware contract.

## Failure semantics

Reader rejection and timeout are normalized without exposing exception text. Operational reader failure becomes canonical unavailable required sources. Memory reader failure becomes unavailable optional sources. Returned records with modified safety flags become invalid and fail closed. Connected empty sources, stale sources, unavailable sources, invalid timestamps, and invalid safety states remain distinct.

## Safe preview

The preview contains only source type, status, freshness, record count, aggregate fact counts, limitations, provenance contract names, timezone, and fixed safety flags. It excludes record IDs, work text, note text, crop text, endpoints, URLs, credentials, tokens, and internal exceptions.

## Real smoke opt-in

`run-hermes-daily-farm-brief-real-data-smoke-test` performs real reads only when `HERMES_DAILY_FARM_BRIEF_REAL_DATA_SMOKE_ENABLED=true`. Without that explicit opt-in it exits as skipped before invoking either reader. When enabled, it calls each existing reader once under the fixed integration timeout and prints only the safe preview. It does not print configuration values.

## Non-goals and rollback

This boundary does not persist a brief, notify, call a model, enqueue work, claim a Worker, expose an API, modify UI, or write to any database. Rollback removes the Day107 input/integration modules, unit/preview/smoke runners, package scripts, and this document; the Day106 production contract remains usable with fixtures.
