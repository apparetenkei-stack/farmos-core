# Hermes Daily Farm Brief persistence storage decision and idempotent write command boundary

## Storage ownership decision

Day113 assigns Daily Farm Brief persistence to FarmOS Core. It is Agricultural Knowledge OS output, not a farming-application business fact and not Sales or Brand data. It must not be stored in the farming application database. AI Workers and LLM adapters do not own storage, and an API route cannot manipulate a raw repository.

The authorized future path is Day109 generation decision → Day110 execution result → server-owned persistence command builder → persistence write service → one repository transaction → Day112 persisted record/read repository → Day111 latest source. HTTP or LLM input cannot provide a complete command or freely choose record ID, version, canonical status, storage timestamp, or transaction policy.

Day113 performs only an in-memory fixture simulation. No database table, migration, RLS change, SQL query, credential, production connection, or production database write was added. The production repository is unavailable by default.

## Command contract

`hermes.daily_farm_brief.persistence_command.v1` is an exact-key contract with command ID, idempotency key, command type, business date, expected current version, execution reference, Day112 record, requested timestamp, server-owned requester, transaction policy, and Safety.

`persist_projectable_brief` can only be built from a strict completed Day110 execution result and a matching strict Day111 projectable source. `persist_generation_state` can only be built from a strict Day109 decision and an explicit safe state. Both builders assign record ID through a server-owned logical-ID factory, version as `expected_current_version + 1` (or 1 when null), canonical status, and created/updated timestamps. The resulting record is always re-parsed by the Day112 persisted-record parser.

The transaction policy is fixed to `atomic_canonical_transition`, serializable isolation, one repository call, and zero retries. The command parser rejects missing or unknown fields, invalid/future records, mismatched dates/kinds/references, client-selected status/version/timestamps, non-exact policy, and Safety tampering.

## Idempotency and optimistic concurrency

The command builder deterministically derives its server-owned idempotency key from command type, business date, and source execution reference. The fixture repository creates a SHA-256 fingerprint from canonical key-sorted command payload JSON. The command ID is envelope metadata and is excluded; Secret and raw database rows are never used. A repeated idempotency key with the same payload returns `reused` without a second record. The same key with another payload returns `idempotency_conflict`.

Idempotency keys are not the only duplicate boundary. The repository independently indexes `(command_type, business_date, source_execution_reference)` inside the atomic transaction. Replaying one execution with another idempotency key and the same semantic payload returns `reused`; changing version, timestamps, record content, or another semantic field for the same execution returns `source_execution_conflict`. A failed transaction stores neither the idempotency entry nor the source-execution entry. Canonical v2 therefore requires a distinct valid Day110 execution or Day109 generation reference.

Within the single repository transaction, all existing records are strictly parsed and all logical version chains are validated before mutation. The current canonical for the same business date and kind must be unique, use the command's logical record ID, and equal `expected_current_version`. A first write creates canonical v1. A later write stages the existing canonical as superseded and appends canonical vN+1; only after the staged chain passes validation does the fixture atomically replace its stored state and save the idempotency fingerprint.

Multiple canonical records, logical-ID races, expected-version mismatch, version gaps/duplicates, invalid existing chains, invalid new records, transaction failure, repository unavailability, and malformed repository results fail closed. Array order, record ID ordering, timestamps, or retries are never used to resolve a conflict. Failure injection proves that neither record state nor idempotency state is partially committed.

## Server clock and execution provenance

The write service requires an injected server clock. It rejects a non-canonical clock, `requested_at` later than that clock, or any record whose generated/created/updated timestamp is later than that clock before repository access. Such invalid/future commands make zero transaction calls.

A completed Day110 execution now contains a server-generated canonical SHA-256 fingerprint of its exact snapshot and scope index. The projectable command builder re-parses both the execution and Day111 source, recomputes the source fingerprint, and requires an exact match. Matching only business date and generated timestamp is insufficient: a substituted snapshot or scope index with the same timestamp is rejected. The fingerprint is internal provenance metadata and is not returned by Day111 or the persistence public result.

## Repository and result boundaries

The write repository exposes only `executeCanonicalTransition(command)`. It does not expose a database client, table name, connection string, query builder, or individual insert/update methods. The write service calls this transaction at most once. A command rejected before repository access produces zero calls; every accepted command produces exactly one call and no retry.

`hermes.daily_farm_brief.persistence_result.v1` exposes only `persisted`, `reused`, `rejected`, or `failed_closed`, safe command type/business date, error code, call counts, and Safety. It never returns record ID, version, raw record, repository response, source body, Secret, or database metadata.

Safety keeps production/database, app/business database, migration, RLS, Proposal, Audit, notification, Queue, Worker, model, scheduler, raw-row, Secret, and retry effects false. Only a successful fixture commit reports `fixture_repository_write_performed`, `brief_persistence_simulated`, and `transaction_committed` true. Replay and all failures report simulated write false; `database_write_performed` is always false.

## Verification and Day114 handoff

Fixture unit and preview cover projectable and generation-state persistence, v1/v2 transition, idempotent replay/conflict, optimistic mismatch, multiple canonical records, version gaps, strict command/record parsing, future timestamps, rollback, call counts, deterministic safe results, production denial, Day112 read-after-write, and Day111 current/stale/status display.

Day114 considers a local isolated DB persistence vertical slice. Before implementing it, FarmOS Core storage schema ownership, table shape, transaction SQL and locking, unique/idempotency constraints, local role permissions/RLS, retention, rollback, and test isolation must be reviewed. Day114 may create a reviewed local migration and adapter only with explicit authorization; Day113 grants no production write authority.
