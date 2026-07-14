# Hermes Daily Farm Brief generation orchestration

## Purpose

Day109 defines a deterministic, read-only orchestration boundary for scheduled generation, administrator-initiated manual regeneration, same-day duplicate prevention, and stale display. It makes a decision only; it does not execute Day106/107 generation, persist a Brief, register a scheduler, or expose an API or UI.

## Request ownership and business date

`hermes.daily_farm_brief.generation_request.v1` is normalized by server code. `request_id`, `requested_at`, role authorization, force permission, timezone, and business date are not accepted as client policy. The timezone is fixed to `Asia/Tokyo`; business date is derived from the canonical request timestamp with `Intl.DateTimeFormat` parts rather than a UTC date slice or locale-shaped string. A test ID factory is injectable, but an absent or invalid ID is rejected rather than fabricated.

Scheduled requests are owned by `system` and cannot force regeneration. Manual requests are authorized only for an administrator with a verified server-side authorization result. `general_staff` and unverified administrator attempts are rejected. A force decision is produced only from the server-owned force permission supplied to the request factory.

The orchestrator never accepts a caller-supplied canonical request object. It accepts only the exact server-owned request-creation input and invokes the request factory internally; extra canonical-looking fields and direct `force_regeneration` injection fail closed.

## Schedule configuration boundary

No formal Daily Farm Brief schedule exists in the current roadmap. The production policy therefore records `schedule.status=not_configured`; a scheduled trigger without a configured server schedule fails closed with `schedule_not_configured`. Unit and preview fixtures may inject a server-owned schedule solely to prove the window calculation and decision matrix. No arbitrary client schedule, cron, Vercel Cron, launchd, or systemd registration is implemented.

## Existing state and duplicate prevention

`hermes.daily_farm_brief.existing_state.v1` is a strict injected-state contract; Day109 reads no database. Completed state requires canonical identifiers, generation time, Brief status, and a canonical five-source freshness vector. `none`, `failed`, and `in_progress` have explicitly different nullable-field rules. Unknown keys, inconsistent counts, invalid dates, and future generation timestamps fail closed.

For the same business date:

- completed scheduled generation reuses the existing Brief;
- completed manual generation is rejected as a duplicate unless server-owned force permission was granted;
- in-progress state always waits and prevents a second generation;
- failed scheduled state may retry only below the fixed maximum retry count of one;
- failed, authorized manual state may regenerate.

The retry count belongs to injected server state and has no client override. Re-evaluating the same canonical request and state is deterministic. Different request IDs are still protected by completed and in-progress state.

## Stale semantics

A previous-business-date completed Brief, a non-fresh required source (`inventory` or `work_log`), and a generated age at or above the fixed threshold are reported separately. The decision exposes `should_show_stale`, ordered reason codes, calendar-day age, and ordered stale source types. Stale state is never silent: same-day duplicate decisions expose `existing_brief_stale`, while a previous-day Brief remains only a display candidate and does not block a first generation for the requested business date. Missing or invalid completed timestamps are rejected rather than treated as fresh.

## Safety, non-goals, and rollback

`hermes.daily_farm_brief.generation_decision.v1` fixes all DB/app/Core writes, Brief persistence, Proposal/Audit/Apply, notifications, Queue, Worker claim, model execution, scheduler registration, external fetch, and secret exposure to false. Duplicate prevention and fail-closed behavior are true. There is no Redis, HTTP, LLM, cron, API route, UI, migration, RLS, or farm-application change.

Rollback is removal of the Day109 generation policy/contract/orchestrator, unit and preview scripts, package scripts, and these documentation entries. Day106 through Day108 remain unchanged.

## Day110 handoff

Day110 may define a generation execution adapter, latest-Brief read boundary, and safe UI-display preparation. It must separately authorize persistence and scheduling; Day109 grants neither.
