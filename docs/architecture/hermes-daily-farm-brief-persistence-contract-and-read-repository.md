# Hermes Daily Farm Brief persistence contract and read repository boundary

## Purpose and scope

Day112 defines the record shape that a future Daily Farm Brief store would have to preserve and the read-only boundary that can reconstruct Day111 `hermes.daily_farm_brief.latest_read_source.v1`. This is a contract and fixture exercise only. No database table exists, no migration or RLS change was created or run, Brief persistence was not performed, and the production repository is not connected.

The repository exposes only `readRecordCandidates(): Promise<unknown>`. It has no raw database client, query builder, transaction handle, or write method. A valid repository result must use `hermes.daily_farm_brief.persisted_repository_result.v1`, declare `transaction_read_only: true`, and contain at most 500 record candidates. One selection performs at most one repository read and zero retries. The in-memory repository exists only for fixtures; the production factory returns an unavailable deny-by-default repository.

## Persisted record contract

`hermes.daily_farm_brief.persisted_record.v1` is a strict discriminated union. Both variants contain a bounded opaque `record_id`, valid `business_date`, positive integer `version`, `canonical` or `superseded` status, canonical ISO `created_at` and `updated_at`, and the exact Day112 Safety object.

`projectable_brief` additionally requires `generated_at`, strict Day106 snapshot, strict Day108 scope index, and `generation_status: completed`. Snapshot and scope timestamps must equal `generated_at`, scope status must agree with snapshot status, and generated time cannot follow creation time.

`generation_state` instead requires only `generation_state` (`in_progress`, `failed`, or `unavailable`) and a bounded non-negative `retry_count`. Projectable fields are forbidden from this variant, and generation-state fields are forbidden from the projectable variant.

The parser rejects unknown and missing fields, unknown discriminants, schema mismatches, invalid dates, non-canonical timestamps, invalid retry counts or versions, and non-exact Safety objects. `generated_at`, `created_at`, and `updated_at` later than the injected selection clock are rejected; `updated_at < created_at` is rejected. Invalid records are never skipped in favor of another candidate.

## Version and canonical semantics

Versions are positive consecutive integers scoped to one `record_id`. Every chain starts at version 1, retains the same business date and record kind, has exactly one canonical record at its highest version, and marks every lower version superseded. Duplicate `record_id` plus version is `duplicate_canonical_record`; a gap, inconsistent logical identity, multiple/no canonical versions, or a canonical non-latest version is `version_conflict`.

After version validation, multiple canonical records at the same selection priority are `ambiguous_latest_record`. The boundary never chooses by array position, `record_id`, or creation time, and never ignores a version conflict. Internal record ID, version, repository metadata, and storage timestamps are not copied to the Day111 source.

## Latest selection policy

For the requested business date, selection is deterministic and ordered as follows:

1. one valid canonical completed `projectable_brief` for that date;
2. one valid canonical `in_progress` state for that date;
3. one valid canonical `failed` state for that date;
4. one valid canonical completed projectable record on the latest earlier business date;
5. one valid stored `unavailable` state, or a synthesized safe unavailable Day111 source when no record exists.

The earlier projectable source keeps its original business date. Day111 compares it with the requested business date and produces `stale` with `previous_business_date`; current projectable data produces `current`. Status-only sources produce `generation_in_progress`, `generation_failed`, or `unavailable` without scope projection.

The transformation path is repository result → repository-result parser → every persisted-record parser → version/canonical validation → priority selection → Day111 source parser. A completed Day110 candidate, raw execution result, raw database row, or unparsed record cannot enter the Day111 service. Invalid repository envelopes, invalid records, future timestamps or future business dates, duplicate canonical records, version conflicts, ambiguity, and invalid Day111 conversion all fail closed.

## Safety and production posture

The exact Safety object fixes database, app/Core database, Brief persistence, migration, RLS, Proposal, Audit, notification, Queue, Worker, model, scheduler, raw row/identifier, Secret, and retry effects to false. It fixes read-only transaction, persisted parser enforcement, selection-policy enforcement, and fail-closed behavior to true.

Day112 adds no API or UI behavior, production authentication, scheduler, Redis, Queue/Worker, LLM, notification, Proposal/Audit write, or farm-application change. Day111 remains unauthenticated and no-store in production because its auth/source provider is still unconnected. Fixture tests and preview are connection-free and perform no writes.

## Verification, rollback, and handoff

The unit boundary covers all five display semantics, strict union parsing, invalid/future records, version and ambiguity failures, no-record unavailable, exact call counts, no retry, deterministic output, production denial, and absence of raw record metadata in the Day111 source and API. The formal chain includes Day112 through Day106, Operational Context, Runtime Contract, Development Review, and Next.js build.

Rollback removes the Day112 contract, selection boundary, fixture repository, deny-by-default production factory, unit/preview scripts, package scripts, and Day112 documentation. Because no table, migration, RLS policy, or stored data was created, no database rollback is needed. The small Day111 stale-date handoff can be reverted with the Day112 adapter if Day112 is removed.

## Day113 write-command handoff

Day113 assigns Daily Brief storage ownership to FarmOS Core and adds strict server-owned command builders, idempotency and optimistic-concurrency contracts, one-call atomic transaction semantics, and a fixture-only write repository. The fixture transitions canonical v1 to superseded v1 plus canonical v2 and feeds the unchanged Day112 selector. No table, migration, RLS change, SQL, production repository connection, or production database write is added.

Day114 considers a local isolated DB persistence vertical slice. Storage schema ownership, transaction/locking, idempotency constraints, RLS and local role permissions, retention, rollback, and production readiness remain separate approval gates.

Day114 now supplies an isolated PostgreSQL implementation of this unchanged read interface. It uses a read-only transaction, explicit columns, a 500-row limit, future-record exclusion, and strict DTO reconstruction before this parser/selector. Only `farmos_core_day114_test` is connected; production remains unavailable by default.
