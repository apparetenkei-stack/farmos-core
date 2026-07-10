# Day86 Hermes Apply Audit and Restore Verification Boundary

## Theme

Hermes Apply Audit and Restore Verification Boundary

## Purpose

Day86 verifies the committed Day85 low-risk no-op apply as a read-only audit chain.

It does not create proposals, decisions, apply events, confirmation tokens, or app schema writes.

## Verified records

- Day85 proposal
- Day85 human approval decision
- Day85 committed apply event
- app.crop_cycles business invariant
- Day81 protected proposal
- existing protected proposal
- protected crop cycle id 2

## Read-only boundary

The audit runs inside BEGIN TRANSACTION READ ONLY.

The runtime verifies current_setting(transaction_read_only) is on.

Every connection ends with ROLLBACK.

## Databases

The same audit runs against:

- farmos_core_local
- farmos_core_restore_test

The database names can be overridden with:

- FARMOS_DAY86_LOCAL_DATABASE
- FARMOS_DAY86_RESTORE_DATABASE

## Audit requirements

- exactly one Day85 proposal
- exactly one Day85 decision
- exactly one Day85 apply event
- proposal, decision, and apply references match
- human approval actor is hayate with owner role
- committed apply is non-dry-run
- apply operation is no_op_candidate
- app projection apply was not performed
- no inserted crop cycle exists
- proposal marker and apply actor match
- timestamps are ordered
- proposal applied_at and apply event created_at differ by at most one second
- app.crop_cycles count remains 8
- protected records remain unchanged

## App schema write interpretation

Day86 verifies the Day85 audit evidence and restored snapshot.

It does not claim to provide a general physical database write audit for all historical activity.

app_schema_write_detected is false only when the Day85 no-op event flags, inserted id, crop-cycle count, and restored state are consistent.

## Commands

- pnpm run test-hermes-apply-audit-restore-verification-boundary
- pnpm run check-hermes-apply-audit-restore-verification-boundary

## Prohibited operations

- proposal creation
- decision creation
- apply event creation
- proposal marker update
- app schema write
- migration
- API apply route
- UI apply control
- delete
- secret output
- git push
