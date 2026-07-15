# Hermes Daily Farm Brief authenticated latest read API boundary

## Purpose and endpoint

Day111 exposes the Day110 latest candidate through `GET /api/hermes/daily-farm-brief/latest`. The endpoint is read-only, force-dynamic, and always returns `Cache-Control: no-store`. It accepts no request body, query parameter, client role, scope allow-list, model setting, endpoint, credential, or connection setting. Unsupported methods return 405 with `Allow: GET`; a query-bearing or otherwise invalid GET returns 400 before authentication or candidate access.

## Authentication and role resolution

Authentication runs on the server before role resolution. An unauthenticated, invalid, or failed authentication result returns the same fixed 401 response. Only a strictly parsed authenticated principal proceeds to a separate server-side actor-context resolver. Unknown, forbidden, invalid, unverified, or principal-mismatched contexts return the same fixed 403 response.

`hermes.daily_farm_brief.authenticated_actor_context.v1` owns the `administrator` or `general_staff` role and canonical scope allow-list. Administrator context must have an empty unused allow-list. General staff can receive only a strict, wildcard-free allow-list. Neither value is read from URL, body, cookie payload fields, or caller headers by this boundary.

The repository currently has no shared production session provider and no persisted Brief source reader. The route's server adapter therefore fails closed as unauthenticated instead of trusting a client-supplied identity. Fixture-only tests inject authentication, actor resolution, and a projection-before source behind the same service contract. Connecting a real server authentication provider and read-only source requires a separately reviewed adapter; public anonymous fallback is prohibited.

## Latest candidate and response

`hermes.daily_farm_brief.latest_read_source.v1` is a strict six-key discriminated union and contains no completed candidate or raw execution result. `projectable_brief` requires business date, strict scope index, strict snapshot, and `generation_state=null`. `generation_state` requires both projection inputs to be null and permits only `in_progress`, `failed`, or `unavailable`. Cross-branch combinations, missing/extra keys, and unknown states fail closed. The source reader is called only after successful authentication and authorization, at most once and without arguments or retry. Authentication and role failures call it zero times.

After strict exact-key source parsing, the service handles both branches. For `projectable_brief`, it calls `createHermesDailyFarmBriefRoleAwareLatestCandidate()` with the server-owned actor role/allow-list, applying exact projection before candidate creation. For `generation_state`, it performs no scope projection and uses the Day110 status semantics to create a zero-scope `generation_in_progress`, `generation_failed`, or `unavailable` candidate. Both branches then independently apply `parseHermesDailyFarmBriefLatestCandidate()`. No dependency can inject a completed candidate. General staff with an empty or unmatched allow-list receives zero visible scopes; administrator receives the complete strict scope index. Candidate counts remain display summaries, never authorization proof.

`hermes.daily_farm_brief.latest_api_response.v1` safely distinguishes current, stale, generation-in-progress, generation-failed, and unavailable as 200 responses. Invalid source combinations return 500. Raw source, scope index, snapshot, scope keys, and identifiers remain internal.

Responses contain no principal reference, raw scope key, raw Brief or fact ID, raw record, raw fact, source body, endpoint, exception, stack, Secret, token, credential, or DB connection information. The exact-key safety contract fixes database/app/Core/Brief/Proposal/Audit/notification/Queue/Worker/model/scheduler operations and client overrides to false, while authentication enforcement, server-owned role resolution, latest-candidate parser enforcement, and fail-closed behavior are true.

## HTTP matrix

| Condition | Status | Source reader calls |
| --- | ---: | ---: |
| Valid authenticated and authorized GET | 200 | 1 |
| Invalid query-bearing GET | 400 | 0 |
| Unauthenticated or authentication failure | 401 | 0 |
| Unknown, forbidden, or invalid role context | 403 | 0 |
| Non-GET method | 405 | 0 |
| Invalid, tampered, or failed source/projection | 500 | 1 |

All rows return `Cache-Control: no-store`. There is no retry, persistence, migration, RLS change, scheduler, Queue/Worker, Redis, LLM, notification, UI, Proposal/Audit write, farm-application change, or business database write.

## Verification and rollback

The fixture-only test proves all five display states, allowed-only staff visibility, unmatched and empty staff visibility of zero, complete administrator visibility, zero projection inputs for status-only sources, a no-argument source reader, absence of candidate/execution-result injection, strict union/candidate/safety tamper rejection, method handling, no-store headers, raw source/identifier scans, exact call counts, and deterministic output. The formal regression chain includes Day110 through Day106, Operational Context integration, Runtime contract, Development Review, and the Next.js build.

Rollback removes the Day111 contracts, service, deny-by-default server adapter, GET route, unit/preview scripts, package scripts, documentation entries, and the Day110 helper exports used by the service. There is no stored data to roll back.

## Day112 persisted-source handoff

Day112 supplies a fixture-only persisted-record parser and read-repository selector that can produce this boundary's strict latest source without exposing record IDs, versions, repository metadata, or storage timestamps. The production repository and authentication provider remain unconnected, so production behavior stays fail-closed at 401 with `Cache-Control: no-store`. Day112 does not create a table, migration, RLS policy, persistence write, or new API behavior.
