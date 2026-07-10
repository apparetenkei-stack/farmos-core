# Day88 Hermes Limited Read-only Pilot Session Boundary

## Theme

Hermes Limited Read-only Pilot Session Boundary

## Purpose

Day88 executes one controlled Hermes operator pilot session.

The session is limited to read-only inspection and audit.

Day88 does not create proposals, decisions, apply events, or app schema writes.

## Pilot Mode

`limited_read_only_operator_pilot`

## Preconditions

- Day87 commit `d0c97a1` is present in Git history
- Day87 readiness result is `ready`
- Git working tree is clean at pilot start
- PostgreSQL, Redis, MinIO, and Qdrant are running
- local and restore audit results are valid
- all database snapshots use read-only transactions

## Inspected Resources

- Day85 proposal
- Day85 decision history
- Day85 apply history
- protected proposals
- crop cycle count
- local and restore consistency

## Protected Counts

- proposal count: 129
- decision history count: 97
- apply history count: 4
- crop cycle count: 8

## Protected State

- Day85 proposal count remains 1
- Day85 decision count remains 1
- Day85 apply event count remains 1
- Day85 proposal status remains approved
- Day85 reviewed_by remains hayate
- Day85 applied_by remains hayate
- protected proposals remain pending and unapplied
- protected crop cycle ID 2 remains present

## Session Execution

1. Run Day87 readiness validation.
2. Capture the before snapshot in a read-only transaction.
3. Inspect the required resources.
4. Capture the after snapshot in a read-only transaction.
5. Compare before and after snapshots.
6. Complete the session only when all invariants remain valid.

## Completion Conditions

- readiness is valid
- both snapshots confirm read-only transactions
- all protected counts are unchanged
- Day85 audit chain is unchanged
- protected proposals are unchanged
- protected crop cycle is unchanged
- all required resources were inspected
- no prohibited action was attempted
- no database write or state change was detected
- blockers are empty

## Block Conditions

The session is blocked when any of the following is detected:

- unexpected Git history
- Git working tree not clean
- readiness invalid
- read-only transaction not confirmed
- database counts changed
- Day85 audit chain changed
- protected proposals changed
- protected crop cycle changed
- required resource not inspected
- prohibited action attempted
- database write or state change detected

## Prohibited Actions

- proposal creation
- review decision creation
- apply execution
- proposal marker update
- app schema write
- migration
- external service exposure
- Git push

## Test Result

- session result: completed
- session invariant valid: true
- database write detected: false
- before counts: 129 / 97 / 4 / 8
- after counts: 129 / 97 / 4 / 8
- blocked changed-state scenario: valid
- blocked prohibited-action scenario: valid

## Created Files

- `src/lib/hermes/hermes_limited_readonly_pilot_session_boundary.ts`
- `scripts/hermes/test_hermes_limited_readonly_pilot_session_boundary.ts`
- `docs/day88-hermes-limited-readonly-pilot-session-boundary.md`

## Package Scripts

- `test-hermes-limited-readonly-pilot-session-boundary`
- `check-hermes-limited-readonly-pilot-session-boundary`

## Day89 Candidate

Hermes Pilot Incident Stop and Recovery Drill Boundary

Day89 should verify that a detected invariant failure stops the pilot and that recovery returns the system to a verified read-only state.
