# Day92 Hermes Operational Read-only Client Completion

## Theme

Hermes External Operational Read-only Client Completion

## Purpose

Day92 connects FarmOS Core to the farming application operational read-only APIs.

This day does not inject the operational records into Hermes prompts.
Hermes context integration remains a Day93 task.

## External Read-only Sources

- GET /api/farmos-core/inventory-summary
- GET /api/farmos-core/recent-work-logs

The endpoint paths and HTTP GET method are fixed in the client.
Arbitrary endpoints and arbitrary HTTP methods are not accepted.

## Server-only Configuration

- APPARETENKEI_READONLY_API_BASE_URL
- FARMOS_CORE_READONLY_TOKEN
- APPARETENKEI_READONLY_API_TIMEOUT_MS

The Bearer token is stored only in the ignored .env.local file.
No NEXT_PUBLIC secret variable is used.

## Client Safety

- Uses GET only.
- Uses a fixed inventory endpoint.
- Uses a fixed recent-work-log endpoint.
- Applies an AbortController timeout.
- Fails closed when configuration is missing or invalid.
- Rejects invalid response envelopes.
- Rejects restricted fields.
- Rejects raw details objects.
- Preserves numeric zero values.
- Does not expose remote error bodies.
- Does not expose credentials.

## Real Connection Evidence

- Inventory HTTP status: 200
- Inventory source: apparetenkei_inventory_readonly
- Inventory record count: 0
- Work-log HTTP status: 200
- Work-log source: apparetenkei_work_logs_readonly
- Work-log record count: 100
- Work-log has more records: true
- Inventory source connected: true
- Work-log source connected: true

All returned work-log records passed the fixed safe schema validation.

## Protected State Verification

Before and after the real external API fetch:

- proposal_count: 129
- decision_history_count: 97
- apply_history_count: 4
- crop_cycle_count: 8

The protected state was unchanged.

## Write Boundaries

- app database write performed: false
- FarmOS Core database write performed: false
- audit write performed: false
- proposal created: false
- proposal saved: false
- proposal apply performed: false
- suggestion generation performed: false
- Hermes context injection performed: false

## Day91 Compatibility Correction

The farming application Work Log API was corrected so every applied-material DTO always includes materialId.
When a safe material ID cannot be resolved, materialId is returned as null instead of being omitted.
No material ID is fabricated.

## Validation

- deterministic unit test: passed
- production build: passed
- real authenticated API smoke test: passed
- restricted-field validation: passed
- credential exposure check: passed
- protected-state comparison: passed

## Result

complete

The two remaining Day90 operational read-only data-source conditions are now connected.

Day93 may integrate these validated records into the Hermes read-only context and perform the final full-go assessment.
