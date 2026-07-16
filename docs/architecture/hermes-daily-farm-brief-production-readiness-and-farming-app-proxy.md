# Hermes Daily Farm Brief production readiness and farming-app proxy

## Day115 boundary

Day115 keeps the Day111–114 contracts intact and adds production wiring contracts only. The intended server-owned path is authentication provider → actor directory → production read repository → Day112 selector → Day111 service. Production database and authentication providers are not connected in Day115, so the route remains unauthenticated and the repository remains unavailable by default.

The strict `hermes.daily_farm_brief.production_read_repository_config.v1` envelope contains only safe configuration facts. It never returns a password, connection string, token, host, user, or raw environment object. Only a `production_candidate` database target can create the lazy production reader; the Day114 isolated database and known local/restore targets are rejected. Missing enablement, credentials, or bounded timeout settings selects the deny-by-default repository.

## Read and identity boundaries

The production reader uses the existing `pg` dependency, explicit columns, a 500-row cap, future-`generated_at` exclusion, UTC, a single read-only transaction, bounded connect/statement/lock timeouts, and zero retry. It verifies `current_database`, `current_user`, and `transaction_read_only=on`; raw clients, rows, identities, exceptions, and secrets do not cross the repository boundary. No connection is made by the Day115 fixture suite.

Authentication produces only a server-owned `principal_ref`. Invalid, unavailable, and unconfigured providers become unauthenticated. Actor role and scope come only from the server-owned directory: administrators have an empty scope list; general staff use exact wildcard-free keys; unknown or mismatched principals are forbidden. Browser role, scope, principal, authorization, database configuration, and credentials are never accepted.

## Farming application proxy contract

The Core-side `hermes.daily_farm_brief.farming_app_proxy.v1` contract fixes GET, pathname, no body/query, server credential presence, request ID, and timestamp. Its client boundary uses a server-owned HTTPS base URL and credential, bounded timeout and response size, disabled redirects, no-store, exact Day111 response parsing, and zero retry. It classifies authentication, authorization, timeout, availability, and invalid upstream responses without exposing the raw body, exception, or token.

Day115 changes neither the farming application nor browser UI. Production DB connection/read/write, production migration, RLS/role changes, production authentication, and production actor-directory access are all unperformed. Day116 may connect manual generation → persist → authenticated read E2E only after production readiness and provider approval; Day117 remains the farming-application display step.

## Rollback

Rollback is removal of the Day115 TypeScript/docs/package-script changes. There is no database, schema, credential, remote service, or farming-application state to reverse.

## Day116 handoff completed

Day116 uses only the Day115 fixture authentication provider and actor directory to complete manual generation → isolated persistence → authenticated latest read. Production providers and the production reader remain unconnected and deny by default. Day117 is the farming-application display handoff; Day118 scheduler consideration remains a separate gate.

## Day118 safe display projection

Day118 adds no route and does not modify the latest API. A fixture-only boundary converts a matching server-owned role projection and latest candidate into a browser-safe deterministic DTO. Persisted records contain no Daily Brief fact body, so facts and narrative are neither reconstructed nor generated. Raw snapshots, identifiers, internal codes/counts, credentials, and role/scope overrides remain excluded. HTTP publication is deferred to Day119.
