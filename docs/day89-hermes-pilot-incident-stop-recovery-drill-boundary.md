# Day89 Hermes Pilot Incident Stop and Recovery Drill Boundary

## Theme

Hermes Pilot Incident Stop and Recovery Drill Boundary

## Purpose

Day89 verifies that a detected pilot incident stops Hermes immediately and that restart remains blocked until read-only recovery verification succeeds.

All incidents are simulated in memory.

Day89 performs no intentional database write.

## Required Base

- Day88 commit `544089c` is present in Git history
- Day88 limited read-only pilot session is valid
- Git working tree is clean at drill start
- PostgreSQL, Redis, MinIO, and Qdrant are running
- local and restore audit results are consistent

## Simulated Incident Types

- database count change
- protected proposal change
- required service stopped
- app schema write detected
- operator identity uncertain

## Stop Boundary

When any incident is detected:

- pilot result becomes stopped
- apply is blocked
- proposal write is blocked
- app schema write is blocked
- automatic recovery is blocked
- pilot restart is not allowed

## Stop Preconditions

- current Git history contains the Day88 base commit
- Git working tree is clean
- the active Day88 session was valid
- at least one incident signal is present

## Recovery Procedure

1. Keep the pilot stopped.
2. Do not execute apply or database repair automatically.
3. Confirm operator identity.
4. Confirm all required services are running.
5. Re-run Day87 readiness verification.
6. Re-run the Day88 read-only pilot session verification.
7. Confirm local and restore consistency.
8. Confirm protected database counts.
9. Confirm protected records remain unchanged.
10. Permit restart only when every recovery invariant is valid.

## Recovery Conditions

- incident stop result is valid
- Day87 readiness result is ready
- Day88 session result is completed
- local and restore consistency is valid
- protected database counts are valid
- protected records are valid
- required services are running
- operator identity is confirmed
- no database write or state change is detected
- blockers are empty

## Protected Counts

- proposal count: 129
- decision history count: 97
- apply history count: 4
- crop cycle count: 8

## Drill Results

- database count change: stopped
- protected proposal change: stopped
- required service stopped: stopped
- app schema write detected: stopped
- operator identity uncertain: stopped
- no incident: no_incident
- successful recovery: recovered
- invalid database count recovery: blocked

## Security Boundary

- no proposal creation
- no review decision creation
- no apply execution
- no proposal marker update
- no app schema write
- no migration
- no external service exposure
- no automatic repair
- no Git push

## Created Files

- `src/lib/hermes/hermes_pilot_incident_stop_recovery_drill_boundary.ts`
- `scripts/hermes/test_hermes_pilot_incident_stop_recovery_drill_boundary.ts`
- `docs/day89-hermes-pilot-incident-stop-recovery-drill-boundary.md`

## Package Scripts

- `test-hermes-pilot-incident-stop-recovery-drill-boundary`
- `check-hermes-pilot-incident-stop-recovery-drill-boundary`

## Day90 Candidate

Hermes Pilot Go or No-Go Final Verification Boundary

Day90 should aggregate Day86 through Day89 evidence and produce the final limited-pilot Go or No-Go decision.
