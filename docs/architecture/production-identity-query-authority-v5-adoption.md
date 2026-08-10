# Production Identity Query Authority v5 repository adoption

Status: `APPROVED / ADOPTED / CURRENT_REPOSITORY_AUTHORITY / NOT_RUNTIME_BOUND`.

## Decision and source of truth

This source-only governance change adopts
`farmos.production-target-identity-query.v5` as the current Repository
Authority. Its exact artifact SHA256 is
`sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52`.
The canonical owner of the adopted state, qualification baseline, blocker
closure, and requalification policy is
`src/lib/hermes/farm_os_production_identity_query_v5_adoption.ts`. The v5
artifact module remains the immutable candidate and artifact-history owner.
The registry references the adoption source instead of independently owning
the qualification details.

The source change records human approval as received because it was performed
under explicit authorization. It records no actor identity, approval time,
qualification record ID, or external receipt ID because none is established
by repository-supported evidence.

## Exact technical qualification baseline

The adopted evidence is bound to source commit
`4cfaa0455808b4197095cf2dc93f3940a8eb57c8`, executor authority
`farmos.production-identity-postgres-isolated-qualification-executor.v4`,
executor lineage
`farmos.production-identity-postgres-qualification-executor-lineage.v4`, and
executor source SHA256
`sha256:749888c7d82c587d274e270b43b0e82521064cadae3600798e8bf8b1aad96b74`.
It uses success evidence v4, bootstrap authority
`farmos.production-postgres-version-bootstrap-query.v1`, query v5, and the
exact query digest above.

The six-record result is 6 success records, 0 failure records, and 6 successful
cleanups. Targeted regressions are 10/10 PASS, typechecks are 9/9 PASS, and the
Sol technical qualification decision is GO. No unknown evidence identifier,
actor, or timestamp is asserted.

| PostgreSQL | server_version_num | result | exact image identity | cases |
| --- | ---: | --- | --- | --- |
| 14 | 140023 | `NOT_ELIGIBLE` | `postgres:14`; `sha256:2f439458ab6a57a925825ae14f9d06910e4fe4a41c8d4a0ae06397e65b707e1b`; `postgres@sha256:2f439458ab6a57a925825ae14f9d06910e4fe4a41c8d4a0ae06397e65b707e1b` | one negative record |
| 15 | 150018 | `NOT_ELIGIBLE` | `postgres:15`; `sha256:6eb0add3b77c081df18aa518ce43df58fdcc40f2e6d868a6fd08038dc7acd425`; `postgres@sha256:6eb0add3b77c081df18aa518ce43df58fdcc40f2e6d868a6fd08038dc7acd425` | one negative record |
| 16 | 160014 | `QUALIFIED_BASELINE` | `postgres:16`; `sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b`; `postgres@sha256:95206741a5b214807675e14165369d05b93a9cf692223b616d07cca227e74b0b` | absent, present |
| 17 | 170010 | `QUALIFIED_BASELINE` | `postgres:17`; `sha256:5c855ad7b85e68e48a62f34662853f38b57c1c1d80f3a927ab58034fd6d31c5e`; `postgres@sha256:5c855ad7b85e68e48a62f34662853f38b57c1c1d80f3a927ab58034fd6d31c5e` | absent, present |

PostgreSQL 18 and later are `UNREVIEWED`.

## Qualification scope and requalification

Qualification applies only to the exact observed server builds, image IDs,
RepoDigests, source commit, query SHA, and executor source SHA above. It does
not qualify all future PG16 or PG17 patches, future image bytes, or a Docker tag
name by itself.

Any query byte or SHA change requires a new authority and full
requalification. Executor, parser, or lineage semantic drift makes the
baseline stale and requires the full six-record matrix. Fixture, GRANT, or
principal semantic drift and any digest-bound source change also require the
full six records. A new PostgreSQL major remains unreviewed until qualified.
Material catalog-capability or patch-behavior drift requires requalification.
A security-critical dependency change requires impact review and full
qualification when relevant. An image ID or RepoDigest change is outside this
baseline and requires review; that change alone does not automatically revoke
the current Repository adoption.

## Two separate supersession lineages

Repository Authority lineage and candidate/artifact lineage are distinct:

- Repository Authority: v1 is a historical adopted authority, v2 is the
  historical superseded Repository Authority, and v2 is superseded by v5.
  v5 is `CURRENT_REPOSITORY_AUTHORITY`.
- Candidate/artifact: v3 → v4 → v5. v3 and v4 are
  `HISTORICAL_SUPERSEDED_CANDIDATE`; neither is rewritten as an adopted
  Repository Authority. Their artifacts, digests, qualification failures, and
  contemporary candidate documents remain history.

The exact-ID resolver continues to resolve v1–v5 only. It has no latest,
highest-version, status-based, current-for-execution, fallback, or automatic
selection behavior.

## Runtime and production boundary

Repository adoption is not runtime binding. v5 remains
`NOT_RUNTIME_BOUND`, `execution_enabled=false`, and
`automatic_latest_selection=false`. The historical v1 active runtime authority
metadata is unchanged. The v2 runtime foundation remains default-disabled and
continues to bind its exact v2 artifact only. No credential resolver,
connection, collector, evidence writer, production database, HTTP, migration,
or deployment operation is introduced or invoked.

Executor v4 remains an isolated technical-qualification executor. Adoption
does not make it a production collector, runtime executor, or production read
client. In the absent-history case, qualification needs neither `USAGE` on
`core_schema` nor `SELECT` on `core_schema.migration_history`. In the present
case, qualification requires those exact two capabilities. Fixture GRANTs do
not provision production privileges. A future Production Credential Authority
owns the actual production requirement.

## Blockers and approval boundary

The exact six-record baseline resolves only:

- `BLOCKED_POSTGRES_COMPATIBILITY`
- `BLOCKED_POSTGRES_QUALIFICATION_INTEGRITY`

These remain open and are not implicitly closed:

- `BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY`
- `PRODUCTION_TARGET_MANIFEST_REQUIRED`
- `BLOCKED_CONNECTION_AUTHORITY`
- `EXECUTION_APPROVAL_LINEAGE_REQUIRED`
- `PRODUCTION_IDENTITY_COLLECTOR_ENTRYPOINT_REQUIRED`
- `BLOCKED_PROVIDER_CAPACITY_DESIGN`
- `PREFIX_CATALOG_FINGERPRINT_AUTHORITY_REQUIRED`
- `PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED`

Commit, push, runtime binding, credential authorization, connection,
collection, and production execution each remain outside this change. Human
approval is required before any later commit action and again before any
runtime or execution transition authorized by its own governance boundary.

## Rollback and future supersession

Before commit, rollback is removal of this five-file adoption diff. After a
formal commit, a query-byte defect requires a new v6 authority. Qualification
baseline drift marks the baseline stale or out of scope without rewriting v5
history. A governance defect requires an explicit revocation or supersession
record. Historical v5 bytes and history are never mutated as rollback.
