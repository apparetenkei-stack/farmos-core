# Hermes Daily Farm Brief Proposal candidate preview

## Day125 scope

Day125 adds one pure adapter from the Day124 browser-safe work-log attention detail to a deterministic Proposal candidate preview. It adds no API route, repository, persistence, database connection, migration, RLS change, model call, retry, or farming-application change. The existing Suggestion, Proposal draft persistence, review decision, and Apply dry-run boundaries remain unchanged.

The only taxonomy mapping is `work_log_attention` to `work_log_follow_up`. Both values are server-owned literals. A candidate asks a human to inspect a work log; it never corrects or deletes a work record, invents a timestamp, supplies an operational update value, or exposes a raw work-log, field, crop-cycle, record, or scope identifier.

## Input and target

The input parser accepts the exact `hermes.proposal_candidate.work_log_follow_up_input.v1` envelope: the fixed Proposal and Suggestion types, a Daily Brief business date, generated-at value, positive source version, `current | stale` display state, and one value accepted by the existing `HermesDailyFarmBriefAttentionDetail` parser. Unknown or missing keys fail closed at every nested level. Browser role/scope fields and raw-identifier keys are rejected recursively.

Generated-at is deliberately accepted only as bounded safe text at the input edge so that a malformed persisted source timestamp can produce the required `source_generated_at_invalid` stale classification. It is never copied to the candidate: a valid canonical timestamp is emitted unchanged; an invalid value becomes `null`. Every non-null timestamp in the output is canonical ISO.

The target is derived server-side. Its kind is `work_log_display_scope`; its opaque safe scope is a SHA-256 prefix over fixed-order, browser-safe display fields. The display label is the verified field label when present and otherwise the fixed scope-level label `表示可能な作業記録`. Raw identifiers are neither an input field nor a signature component.

This target is intentionally a scope-level follow-up, not an individual work-log record target. Attention items with the same browser-safe field label and work-type label produce the same safe scope and aggregate there. Day125 never represents an individual record correction Proposal. A future individual-record boundary must introduce a separate server-owned opaque reference without exposing or encoding the raw operational identifier.

## Candidate, expiry, and stale policy

The output schema is `hermes.proposal_candidate.work_log_follow_up.v1`. Basis is the Day124 fixed reason text. Before is a fixed statement that the start timestamp cannot be confirmed or its format cannot be confirmed. After is the fixed human follow-up action. Risk is always `low`, human review is always required, and `save_allowed` / `apply_allowed` remain false even for a fresh candidate.

Expiry is the end of the day after the source business date in `Asia/Tokyo`, represented as a canonical UTC timestamp. The clock and expected source version are server-owned injected dependencies. Stale reasons have this canonical order:

1. `source_display_stale`
2. `source_business_date_old`
3. `source_version_mismatch`
4. `candidate_expired`
5. `source_generated_at_future`
6. `source_generated_at_invalid`

The candidate carries both the actual `source_version` and the server-owned comparison value `expected_source_version`. The strict output parser derives the current business date from `created_at`, recomputes every stale reason from candidate fields, and requires exact canonical equality with both stale reason arrays and all derived booleans. `validation_passed` means the structure is valid and `source_generated_at_invalid` is absent. `future_explicit_save_eligible` is true only when the recomputed reason list is empty.

Stale candidates remain valid previews, but `future_explicit_save_eligible` is false. Fresh candidates may set that preparation flag true, while `proposal_saved` and `proposal_apply_performed` remain false. Day125 implements no save path.

## Duplicate signature and safety

The duplicate signature uses SHA-256 over a length-prefixed, fixed-order serialization of schema version, Proposal type, source business date, source version, attention reason code, safe target scope, basis, before, and after. It does not depend on object property order. `candidate_id` is a deterministic opaque prefix of that signature; no random UUID or raw identifier is used.

The strict output parser validates exact keys, enums, positive version, canonical business date/timestamps, fixed risk and human-review values, fixed templates, canonical stale order, signature recomputation, candidate identity, preview mirroring, and the exact safety object. The boundary is fixture-only and reports zero database writes, Proposal saves, Apply operations, model executions, retries, and migrations.

## Day126 handoff

Day126 may define an explicit authenticated save/review gate for structurally valid, non-stale candidates. It must not reinterpret `future_explicit_save_eligible` as authorization, and it must preserve Proposal First and Human in the Loop.
