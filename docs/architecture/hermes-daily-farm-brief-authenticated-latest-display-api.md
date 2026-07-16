# Hermes Daily Farm Brief authenticated latest display API

## Day119 endpoint

Day119 publishes the Day118 deterministic safe display DTO at `GET /api/hermes/daily-farm-brief/latest-display`. The existing `/api/hermes/daily-farm-brief/latest` route and response schema remain unchanged.

The new service reuses the existing authentication, actor resolver, persisted-source reader, strict source union, and server dependency object. Method and query validation precede authentication; authentication and authorization failures stop before source access. A valid request reads the persisted latest source at most once and performs zero retries.

For a projectable source, one shared role-aware artifact build parses source data, applies the server-owned role/scope projection once, and returns the matching latest candidate and role projection together. The service passes those exact artifacts to the Day118 builder. It never independently regenerates either side. Candidate/projection role, generated time, Brief status, visible scope count, and source status must match.

Current and stale states return the strict `display_projection.v1`. In-progress, failed, and unavailable sources return HTTP 200 with `display: null`; the display builder is not called. Invalid requests/sources/projections fail with fixed public error codes and no internal error text.

All responses use no-store, JSON UTF-8, and nosniff headers. The response excludes the raw latest candidate, role projection, snapshot, scope index, identifiers, internal codes, credentials, and record counts. The production authentication provider remains unconnected, so the production route denies by default with 401. Farming-application body rendering remains deferred.
