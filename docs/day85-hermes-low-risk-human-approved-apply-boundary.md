# Day85 Hermes Low-risk Human Approved Apply Boundary

## Theme

Low-risk Human Approved Apply Boundary.

## Purpose

Day85 executes the first controlled committed apply in the Hermes Day81-85 lane.

## Boundary

Day85 is CLI/test-only.

No public API route is added.

## Fixture

- Proposal id: `85f11111-88db-41fd-a048-1c37266fd9e0`
- Decision id: `85d11111-88db-41fd-a048-1c37266fd9e0`
- Boundary test id: `day85_low_risk_apply_boundary_test_v1`
- Proposal status: `approved`
- Risk level: `low`
- Review decision: `approve_review`

## Apply operation

- `apply_operation = no_op_candidate`
- `result = applied`
- `dry_run = false`
- `committed = true`
- `app_projection_apply_performed = false`
- `ai_proposal_apply_marker_updated = true`
- `inserted_crop_cycle_id = null`

## Writes allowed

- Insert one Day85 fixture proposal when missing.
- Insert one Day85 approval decision when missing.
- Update the Day85 fixture proposal apply marker.
- Insert one committed Day85 apply audit event.

## Writes forbidden

- No `app.*` writes.
- No `app.crop_cycles` insert/update/delete.
- No protected proposal changes.
- No Day81 proposal changes.
- No confirmation token creation.
- No API route.

## Idempotency

Repeated runs must not append duplicate committed apply events.

The DB-level unique index on committed apply events per proposal remains the last line of defense.
