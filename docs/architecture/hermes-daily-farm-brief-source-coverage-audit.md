# Hermes Daily Farm Brief Source Coverage Audit

## 1. Purpose

Day121 fixes the read-only audit evidence for Daily Brief source coverage as a pure contract. It prevents source availability, attention-fact availability, freshness, and provenance from being inferred from one another.

## 2. Scope

This boundary records fixture-only audit evidence for `field`, `crop_cycle`, `inventory`, and `work_log`. It does not connect the evidence DTO to production runtime behavior.

## 3. Safety boundaries

Day121 changes no production adapter, HTTP fetch, snapshot/Brief builder, persistence path, or latest-display response. It performs no database connection or write, migration, RLS/role change, Brief generation or persistence, Proposal operation, retry/timeout change, or credential access.

## 4. Farming app actual counts

The completed farming-application audit found 71 fields, 40 crop cycles with zero field-relation issues, 7 inventory rows in the physical `materials` table, and 541 work records. These tables do not expose `updated_at` for this integration.

## 5. Existing read APIs

`GET /api/farmos-core/inventory-summary` returns 7 records without a filter or zero-stock exclusion. `GET /api/farmos-core/recent-work-logs` returns the fixed maximum of 100 records. Farming-application Core read APIs for fields and crop cycles do not exist at Day121.

## 6. Core call chain

The current Daily Brief path is:

```text
manual execution
→ generation execution adapter
→ operational readonly client plus Hermes memory context
→ Daily Farm Snapshot
→ Daily Brief
→ scope index
→ persistence command
→ persisted latest selector
→ authenticated latest-display projection
```

The independent Operational Context integration is not an intermediate Daily Brief call. Inventory and work records enter through the operational readonly client; crop-cycle memory enters separately through Hermes memory context.

## 7. Source-by-source coverage

| Source | Farming-app actual | Existing API | Core adapter coverage | Current snapshot state | Day122 |
|---|---:|---|---|---|---|
| fields | 71 | none | external reads 0 | unavailable, record count 0 | required |
| crop cycles | 40 | none | Core `app.crop_cycles` memory summary, maximum 10 | memory provenance, freshness unknown | required |
| inventory | 7 | inventory-summary returns 7 | normal response preserves count 7; display record limit 20 | available even when no attention fact is produced | retain and verify |
| work records | 541 | recent-work-logs returns 100 | adapter count 100; snapshot display records maximum 10; scope references up to 100 | available or explicitly limited, never empty solely due to truncation | retain and verify |

## 8. Record count versus fact count

`adapter_record_count` records successful source coverage. `fact_count` records only observations that satisfy deterministic attention rules. Seven valid inventory records with zero attention facts means the source is `available`, not `empty`. Dashboard wording must not translate zero attention into “在庫データなし”.

## 9. Availability semantics

- Successful read with records is `available`, or `limited` when the audited actual count exceeds the bounded adapter result.
- Successful read with zero records is `empty`.
- A missing adapter/API is `unavailable / SOURCE_NOT_CONNECTED`.
- Connection, authentication, timeout, and contract failures remain distinct unavailable reasons and never become empty.
- Source availability and attention-fact availability are independent.

## 10. Freshness semantics

`observed_at` is the API observation/response time. `latest_business_at` is the newest business event timestamp such as `started_at` or `start_date`. `source_updated_at` is a record update timestamp. The current operational API `generated_at` is only observation time. When it is the sole timestamp and both authoritative timestamps are absent, freshness is `unknown / SOURCE_UNKNOWN_FRESHNESS`; it must not be inferred as fresh.

## 11. Provenance semantics

`farming_app_api`, `core_memory`, `fixture`, `none`, and `unknown` are distinct. Farming-app crop-cycle API data is operational truth. Core `app.crop_cycles` memory is Hermes memory context. They must not be merged or represented as the same source; using Core memory as operational crop-cycle evidence is `SOURCE_PROVENANCE_MISMATCH`.

## 12. Day120 Brief origin classification

The saved Day120 Brief origin is:

```text
unknown_unverifiable_from_repository
```

The repository contains no saved receipt, execution origin, source-count metadata, or external-fetch evidence that can prove fixture, partial-real-data, or full-real-data origin. No stronger classification may be inferred.

## 13. Day122 target

The farming application target is `GET /api/farmos-core/fields` and `GET /api/farmos-core/crop-cycles`, using server-to-server Bearer authentication, GET only, explicit columns, no `select *`, fixed limits, existing timeout policy, and no writes, migrations, or RLS changes. Raw identifiers must not reach browser-safe projection.

FarmOS Core review targets are:

- `src/lib/hermes/hermes_operational_readonly_client.ts`
- `scripts/hermes/brief_runtime/hermes_daily_farm_brief_input.ts`
- `scripts/hermes/brief_runtime/hermes_daily_farm_brief_integration.ts`
- `scripts/hermes/brief_runtime/hermes_daily_farm_snapshot_contract.ts`
- `scripts/hermes/brief_runtime/hermes_daily_farm_snapshot_adapter.ts`
- `scripts/hermes/brief_runtime/hermes_daily_farm_brief_policy.ts`
- `scripts/hermes/brief_runtime/hermes_daily_farm_brief_scope_builder.ts`
- related fixture tests

The operational crop-cycle API and Hermes memory context remain separate sources.

## 14. Day123 target

Day123 does not assume an inventory API filter defect. It first separates source `record_count`, attention `fact_count`, attention count, and latest-display wording. Expected inventory state is available with 7 records and zero attention items allowed. After that gate, a new real-data Brief may proceed through explicit manual persistence and dashboard E2E under its own approved boundary.

## 15. Rollback

Rollback is removal of the Day121 pure contract/test, this architecture document, its package script, and the Day121–124 roadmap entry. No runtime data or database rollback is required because Day121 has no runtime connection or write.

## 16. Day130 impact

Day121–123 are coverage correctness gates, not a postponement of the Day130 administrator Proposal milestone. Day124 begins the minimum Proposal vertical slice only after the source coverage gate passes, while Proposal First and Human in the Loop remain unchanged.
