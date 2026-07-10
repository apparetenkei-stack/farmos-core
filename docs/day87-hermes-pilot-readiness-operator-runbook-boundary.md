# Day87 Hermes Pilot Readiness and Operator Runbook Boundary

## Theme

Hermes Pilot Readiness and Operator Runbook Boundary

## Purpose

Day87 fixes the operational boundary before beginning the Hermes pilot phase.

Day87 does not add a new apply operation.

The purpose is to determine whether the system is safe enough to enter a limited read-only operator pilot.

## Pilot Mode

`limited_read_only_operator_pilot`

This pilot permits inspection and audit only.

It does not permit proposal creation, review decision creation, apply execution, proposal marker updates, app schema writes, migrations, external exposure, or Git push.

## Required Starting State

- Day86 commit `c2ced70` is present in the current Git history
- Git working tree is clean at pilot start
- PostgreSQL is running
- Redis is running
- MinIO is running
- Qdrant is running
- Day86 local audit is valid
- Day86 restore audit is valid
- local and restore results are consistent
- all audit database reads run in read-only transactions
- the Day85 proposal, decision, and apply event chain is valid
- the Day85 committed apply remains a no-op apply
- no app schema write is detected
- protected proposals remain unchanged
- protected crop cycle remains present
- `app.crop_cycles` count remains 8

## Expected Protected Counts

- proposal count: 129
- decision history count: 97
- apply history count: 4
- crop cycle count: 8

## Allowed Operator Actions

- run read-only audit
- inspect proposal
- inspect decision history
- inspect apply history
- inspect crop cycle count
- compare local and restore databases
- stop the pilot

## Prohibited Operator Actions

- create proposal
- create review decision
- execute apply
- update proposal marker
- write app schema
- run migration
- expose services externally
- Git push

## Stop Conditions

Stop the pilot immediately when any of the following is detected:

- audit chain invalid
- local and restore mismatch
- unexpected database count change
- protected record changed
- app schema write detected
- required Docker service stopped
- Git working tree not clean
- operator identity uncertain

## Operator Preflight

1. Confirm the Git working tree is clean.
2. Confirm Day86 commit is present in the current Git history.
3. Confirm PostgreSQL, Redis, MinIO, and Qdrant are running.
4. Run the Day87 readiness test.
5. Confirm `pilot_readiness_valid=true`.
6. Confirm `blockers=[]`.
7. Confirm the database password environment variable is unset after the test.

## Failure Response

When readiness is blocked:

- do not execute apply
- do not modify proposal or audit records
- do not attempt an automatic repair
- preserve logs
- identify the blocker
- restore the expected service or repository state
- rerun the read-only audit

## Security Boundary

Day87 performs no database write.

Day87 performs no migration.

Day87 does not expose services over LAN, Tailscale, or the public internet.

Day87 does not grant AI roles any additional permissions.

Day87 does not allow Hermes to write directly to the app schema.

## Created Files

- `src/lib/hermes/hermes_pilot_readiness_operator_runbook_boundary.ts`
- `scripts/hermes/test_hermes_pilot_readiness_operator_runbook_boundary.ts`
- `docs/day87-hermes-pilot-readiness-operator-runbook-boundary.md`

## Package Scripts

- `test-hermes-pilot-readiness-operator-runbook-boundary`
- `check-hermes-pilot-readiness-operator-runbook-boundary`

## Day88 Candidate

Hermes Limited Read-only Pilot Session Boundary

Day88 should execute one controlled operator pilot session using read-only inspection only.

Day88 must not introduce a new apply path.
