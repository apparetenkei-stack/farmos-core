# Hermes Daily Farm Brief scoped and role-aware projection

## Business purpose

Day108 adds a deterministic read-only navigation index over the unchanged Day106 canonical snapshot and brief. It lets an administrator inspect all crop, field, and Crop Cycle aggregates while a general staff member receives only server-authorized scopes. This is a projection boundary, not a second operational database or a new brief generator.

## Contracts and derivation

`hermes.daily_farm_brief.scope_index.v1` contains ordered scope entries and explicit unresolved/unscoped counters. `hermes.daily_farm_brief.role_projection.v1` contains the server-owned role, visible scopes, aggregate summary, limitations, and invariant false safety flags. Both parsers require exact keys, canonical ISO time, a supported IANA timezone, canonical ordering, count consistency, fixed limits, unique keys, and untampered safety values.

The builder accepts the canonical snapshot and matching canonical brief plus a minimal server-extracted reference input. Scope time is owned by the canonical brief: any supplied `generatedAt` must exactly equal `brief.generated_at`, and the index stores `brief.generated_at` without correction, rounding, or inference. It does not accept a reader response envelope or raw source body. Crop keys use only trimmed non-empty `targetCrop` or an explicit canonical crop field. Field scopes use only explicit `field_id` references. Crop Cycle scopes use only explicit Crop Cycle IDs; Work Log association requires exact `cropCycleId === CropCycle.id`. IDs become deterministic SHA-256-derived scope keys and redacted labels, so projections do not disclose raw Work Log, field, or Crop Cycle identifiers.

No missing identifier is generated. Crop spellings are not semantically merged. A field name is never inferred from an ID, a Crop Cycle is never inferred from a crop, and an assignee is never inferred from a Crop Cycle. Missing scope dimensions increment unscoped counters. A Work Log reference to a nonexistent Crop Cycle increments `unresolved_crop_cycle_reference_count` and creates no synthetic cycle scope.

The independent Field source remains unavailable in the Day106 snapshot. Explicit Work Log or Crop Cycle field IDs may still create redacted ID-based scopes, but every such scope and the index retain `independent_field_source_unavailable`. The unresolved field counter records explicit field references that cannot be resolved against an independent Field source.

Fixed server policy allows at most 50 crop scopes, 100 field scopes, 100 Crop Cycle scopes, 10 brief facts per scope, 20 limitations and data gaps per scope, and 200 allowed scope keys. Limits are not request-configurable; overflow fails closed.

## Role disclosure matrix

| Data | administrator | general_staff |
| --- | --- | --- |
| Scopes | All canonical scopes | Exact intersection with server-owned `allowed_scope_keys` |
| Empty allow-list | All scopes | Zero scopes |
| Source state | Status, freshness, record count | Status/freshness with failures collapsed to `limited`; no record count |
| Unscoped/unresolved diagnostics | Visible | Omitted as `null` |
| Scope aggregates | Visible | Visible only for allowed scopes |
| Internal failure detail, Proposal, Audit, approval/apply | Not present | Not present |

The caller contract says both `role` and `allowed_scope_keys` were established by the server authentication/authorization layer. There is no request-body or client override parser. The allow-list parser validates type, length, duplicate normalization, key format, and rejects `*` or any wildcard. Unknown allow-list keys grant nothing.

## Safe preview and safety

The fixture-only preview reads no environment, database, network, or real source. It prints only result, role, aggregate scope/count metadata, limitations count, unresolved/unscoped counts, and safety flags. It never prints raw record bodies, inventory names, raw IDs, URLs, endpoints, tokens, credentials, or database users.

The boundary performs no database or business-schema write, brief persistence, Proposal creation/save/apply, Audit write, notification, Queue/Worker operation, model execution, API handling, UI rendering, migration, or RLS change. All safety claims are parser-enforced literal values and `fail_closed` is always true.

## Rollback and Day109 handoff

Rollback removes the three Day108 runtime modules, unit and preview runners, package scripts, this document, and the Day108 roadmap notes. Day106 and Day107 contracts remain unchanged and no data rollback is required.

Day109 may add scheduled generation, manual regeneration, same-day duplicate prevention, fail-closed orchestration, and stale-brief display. None of those behaviors exist in Day108.
