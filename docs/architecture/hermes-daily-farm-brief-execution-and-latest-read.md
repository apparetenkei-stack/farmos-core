# Hermes Daily Farm Brief execution and latest read boundary

## Purpose and authorization

Day110 makes the strictly parsed Day109 generation decision the only execution authority. The adapter reuses `parseHermesDailyFarmBriefGenerationDecision()` through the strict execution-request parser and executes only when the decision is `generate`, execution is true, reuse is false, duplicate prevention is enforced, and fail-closed is true. Reuse, duplicate rejection, unauthorized, invalid-state, in-progress, and fail-closed decisions are skipped without calling integration or downstream builders. A tampered decision cannot authorize execution.

`hermes.daily_farm_brief.execution_request.v1` binds the server-owned execution ID and clock, fixed timezone and business date from Day109, role target, and canonical server-owned scope allow-list. Missing IDs are rejected rather than fabricated. Administrator execution accepts no unused scope allow-list; general staff receives exact allow-list filtering and an empty list yields zero visible scopes.

## Dependency sequence and call guarantees

For an authorized decision the adapter performs exactly one ordered pass:

1. Day107 real-data integration;
2. strict canonical snapshot and Brief validation;
3. Day108 scope-index generation;
4. Day108 role projection;
5. strict execution-result and latest-candidate validation.

Day107 extracts an internal strict scope-reference input from the already returned Operational and Memory Context envelopes before discarding them. It preserves only explicit Work Log `id`/`fieldId`/`targetCrop`/`cropCycleId` and Crop Cycle `id`/crop/`field_id` relationships, reusing Day108 ID and crop normalizers. Day110 passes those references unchanged to the existing Day108 scope builder. Missing relationships remain `null`; no fallback fact or synthetic identifier is created. The reference input is never copied into execution results, latest candidates, or previews.

Each dependency is called at most once. Reader results are consumed by the single Day107 integration call; they are never fetched again for scope projection. A throw or invalid result stops later dependencies, returns a fixed failure code, and is never retried. Day107 remains the only permitted external read path; Day110 adds no fetch implementation.

## Timestamp ownership

The execution-request timestamp and completion timestamp come from injected server clocks. Snapshot and Brief timestamps retain Day107 ownership and are neither rounded nor rewritten. The request timestamp must not exceed completion, generated content must not precede execution request, and candidate generation must not be in the future. Violations fail closed with `timestamp_invalid` or `latest_candidate_invalid`.

## Execution result

`hermes.daily_farm_brief.execution_result.v1` distinguishes `completed`, `skipped`, and `failed_closed`. Generated flags are monotonic and reflect only parser-confirmed stages. Completed output contains a safe role projection summary and `hermes.daily_farm_brief.latest_candidate.v1`; skipped and failed output contain no fabricated Brief. Errors expose fixed codes only, never exception text, endpoints, credentials, or stacks.

## Latest read precedence

The read-only boundary accepts one injected execution result and one injected Day109 existing state. It performs no database read or persistence. Precedence is:

1. completed current execution;
2. same-day completed existing summary;
3. previous-day completed summary as stale;
4. in-progress;
5. failed;
6. unavailable.

Existing-state candidates expose only summary freshness and mark source status as unknown because record status and scoped visibility are not present in that contract. Previous-day, required-source stale/unknown, and generated-age threshold reasons are explicit. Raw Brief facts, Work Logs, field/Crop Cycle IDs, request/execution IDs, endpoints, and credentials are excluded.

## Safety, non-goals, and rollback

The boundary fixes DB/app/Core writes, Brief persistence, Proposal/Audit/Apply, notification, Queue, Worker claim, model execution, scheduler registration, and newly added fetch to false. It adds no API, UI, Redis, cron, migration, RLS, LLM, or farm-application change.

Rollback removes the Day110 contract, adapter, latest read boundary, unit/preview scripts, package scripts, and documentation entries. Day106 through Day109 remain unchanged and no stored data requires rollback.

## Day111 handoff

Day111 may define an authenticated latest-Brief server read API, server-side role resolution, and a safe UI data contract. Day110 grants no persistence, endpoint, UI, or scheduler authority.

## Day113 persistence provenance handoff

Completed Day110 results include an internal canonical fingerprint of the exact generated snapshot and scope index. Day113 compares that fingerprint with the projectable persistence source before building a command, preventing another valid snapshot or scope index with the same generated timestamp from being substituted. Skipped and failed-closed executions carry no persistence fingerprint. This metadata grants no write authority and is not exposed by the Day111 API.
