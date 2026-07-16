# Hermes Daily Farm Brief safe display projection

## Day118 scope

Day118 defines a fixture-only browser-safe display DTO. It does not change the authenticated latest API and adds no HTTP route, repository, authentication provider, database operation, or farming-application code.

Persisted Daily Brief records contain the projectable snapshot and scope index, but do not contain `HermesDailyFarmBrief.facts`, fact summaries, `brief_id`, or `snapshot_id`. Day118 therefore does not reconstruct, infer, or generate a narrative or missing facts. It transforms an already server-owned role projection plus its matching latest candidate into deterministic fixed Japanese templates.

## Boundary

The display builder accepts only strict `latest_candidate.v1` and `role_projection.v1` values. It has no role, allow-list, snapshot, persisted record, DB row, principal, or browser override input. Candidate role, generated time, Brief status, visible scope count, display state, and source statuses must match the role projection. In-progress, failed, unavailable, unknown roles, and any mismatch fail closed.

Administrator projections may expose display items for every projected scope. General staff can expose only scopes already present after server-side allow-list projection; an empty projection creates zero priorities. Scope keys, source refs, operational counts, diagnostic counts, raw limitation/data-gap codes, record counts, identifiers, facts, and snapshots are not copied.

Title and summaries are fixed strings. Priority details contain only fixed count templates and the already validated display label. Source availability/freshness and stale reasons map through fixed labels and messages. Internal limitation codes map to an allow-listed public sentence; unknown codes collapse to one generic sentence. Ordering, deduplication, and truncation are deterministic.

The exact parser enforces schema keys, nested keys, canonical timestamps/business dates, current/stale only, text and array limits, control/HTML/raw-JSON rejection, duplicate rejection, source order, severity, fixed templates, and the exact Safety object. The serialized DTO exposes only business date, generation time, display state, fixed title/summary, safe priorities/attention/source disclosure/limitations, and Safety.

Day118 is not a generated narrative. It performs no model execution, persistence, Proposal, notification, production read/write, or repository read. HTTP publication is deferred to Day119.

## Day119 publication

Day119 publishes this unchanged DTO through a separate authenticated GET endpoint. Candidate and role projection now come from one shared server-owned artifact build, and the persisted source is read at most once. Status-only states return `display: null`. The original latest endpoint remains unchanged.
